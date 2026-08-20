# CÀO BÙ KHO GIAO DỊCH — chạy MỘT LẦN, nhiều giờ, ngoài luồng của mọi tác vụ khác.
#
# VÌ SAO CÓ BẢN SAO RIÊNG `C:\cpvn_bf` THAY VÌ CHẠY THẲNG Ở `C:\cpvn`
# ------------------------------------------------------------------
# `C:\cpvn` là CÂY LÀM VIỆC DÙNG CHUNG: `CPVN gia phien` nổ 5 phút một lần từ 09:00 tới
# 15:00 và mở đầu bằng `git reset --hard origin/main`, `CPVN EOD refresh` cũng vậy lúc
# 15:15. Lượt cào bù này chạy ~12 giờ và ghi dần vào `data/giaodich/` — để chung thì mỗi
# 5 phút toàn bộ phần chưa commit bị xoá, IM LẶNG, và sau nửa ngày vẫn trắng tay.
# Đây đúng con bệnh đã dính ở lượt chạy thử `truoc phien` 20/08/2026, chỉ khác là ở đây
# cửa sổ hở không phải 9 phút mà là cả lượt chạy.
#
# CÁCH CHỐNG: cây riêng, không ai reset, và ĐẨY THEO TỪNG LÔ chứ không đợi tới cuối.
# Hỏng giữa chừng thì phần đã đẩy vẫn còn, chạy lại chỉ làm nốt phần thiếu.
#
# CHẠY LẠI ĐƯỢC: mã nào đã có file trong `data/giaodich` thì bỏ qua. Cứ chạy nhiều đêm.
#
# GỌI:  powershell -ExecutionPolicy Bypass -File C:\cpvn\server\run_boi_giaodich.ps1

$ErrorActionPreference = 'Continue'
$git = 'C:\Program Files\Git\cmd\git.exe'
$py  = 'C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe'
$kho = 'C:\cpvn_bf'
$log = 'C:\cpvn\server\boi_giaodich.log'

# BẮT BUỘC — console Windows là cp1252, thiếu dòng này thì công cụ chết ở dòng print
# tiếng Việt đầu tiên. Bài học 20/08/2026 (xem đầu run_sang_som.ps1).
$env:PYTHONIOENCODING = 'utf-8'
# BẮT BUỘC — SYSTEM không có ssh config, không có known_hosts, khoá deploy tên không mặc định.
$env:GIT_SSH_COMMAND = 'ssh -i C:/Users/Administrator/.ssh/github_deploy -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=C:/cpvn/.known_hosts'

function Ghi($m) {
  $d = Get-Date -Format 'HH:mm:ss'
  "$d  $m" | Add-Content $log
  Write-Host "$d  $m"
}

"=== BẮT ĐẦU $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Add-Content $log

if (-not (Test-Path $py))  { Ghi "KHONG THAY PYTHON: $py"; exit 9 }
if (-not (Test-Path $kho)) {
  Ghi "Chua co ban sao - dang clone sang $kho"
  & $git clone git@github.com:cpvnio/cpvn.git $kho 2>&1 | Add-Content $log
  if (-not (Test-Path $kho)) { Ghi 'CLONE THAT BAI'; exit 1 }
}
Set-Location $kho

# Bám thẳng theo remote trước khi bắt đầu — bản sao chỉ là bản sao.
if ((Test-Path '.git\rebase-merge') -or (Test-Path '.git\rebase-apply')) {
  & $git rebase --abort 2>&1 | Add-Content $log
}
& $git fetch origin main 2>&1 | Add-Content $log
& $git reset --hard origin/main 2>&1 | Add-Content $log

# Danh sách mã CÒN THIẾU.
#
# ĐỪNG CHỈ HỎI "FILE CÓ TỒN TẠI KHÔNG" — đã trả giá 20/08/2026. Lượt EOD 15:15 chạy
# `--sau` (KHÔNG có `--tatca`) nên nó tạo đủ 1.529 file nhưng mỗi file chỉ có ~30 phiên
# của trang 1. Lượt cào bù sau đó thấy "file có rồi" nên bỏ qua sạch — kho đứng ở 30
# phiên vĩnh viễn, mà không có gì báo. User phát hiện, không phải phép kiểm nào.
#
# Nên hỏi BA điều, thiếu điều nào cũng để lọt một loại file dở:
#   · chưa có file
#   · có nhưng `day` khác 1  -> mới cào trang 1, chưa cào hết lịch sử
#   · có nhưng `v` < PBAN    -> dựng bằng cách tính CŨ, phải làm lại (kho tự lành dần)
$conthieu = & $py -c @"
import json, os, sys
sys.path.insert(0, 'tools')
from kho_giaodich import PBAN
u = json.load(open('universe.json', encoding='utf-8'))['stocks']
d = os.path.join('data', 'giaodich')
def thieu(sym):
    p = os.path.join(d, sym + '.json')
    if not os.path.exists(p):
        return True
    try:
        o = json.load(open(p, encoding='utf-8'))
    except Exception:
        return True
    return (o.get('day') != 1) or ((o.get('v') or 0) < PBAN)
print(' '.join(s['sym'] for s in u if thieu(s['sym'])))
"@
$ma = ($conthieu -split '\s+') | Where-Object { $_ }
Ghi "Con thieu $($ma.Count) ma"
if ($ma.Count -eq 0) { Ghi 'Khong con gi de cao - thoat.'; exit 0 }

# LÔ 50 MÃ. Nhỏ hơn thì tốn quá nhiều lượt commit/push; lớn hơn thì hỏng một cái mất
# nhiều công hơn. 50 mã ≈ 20-25 phút, tức mất nhiều nhất chừng ấy nếu đứt giữa chừng.
$lo = 50
for ($i = 0; $i -lt $ma.Count; $i += $lo) {
  $nhom = $ma[$i..([Math]::Min($i + $lo - 1, $ma.Count - 1))]
  Ghi "--- lo $([int]($i/$lo)+1)/$([Math]::Ceiling($ma.Count/$lo)): $($nhom.Count) ma, bat dau $($nhom[0]) ---"
  & $py 'tools\kho_giaodich.py' --sau --tatca --ma @nhom 2>&1 | Add-Content $log

  & $git add data/giaodich 2>&1 | Add-Content $log
  & $git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) { Ghi 'lo nay khong co gi moi'; continue }

  & $git -c user.name='cpvn-server' -c user.email='bot@users.noreply.github.com' `
    commit -m "Boi kho giao dich ($($nhom[0])..$($nhom[-1]))" 2>&1 | Add-Content $log

  # ĐẨY CÓ THỬ LẠI — remote nhích lên liên tục vì gia_phien đẩy mỗi 5 phút.
  # `-X theirs` để rebase không dừng giữa chừng làm kẹt cả lượt.
  $day = $false
  for ($k = 1; $k -le 5; $k++) {
    & $git pull --rebase -X theirs origin main 2>&1 | Add-Content $log
    & $git push origin main 2>&1 | Add-Content $log
    if ($LASTEXITCODE -eq 0) { $day = $true; break }
    Start-Sleep -Seconds (5 * $k)
  }
  if ($day) { Ghi "day xong lo, tong $($i + $nhom.Count)/$($ma.Count)" }
  else      { Ghi 'DAY THAT BAI sau 5 lan - giu commit tai cho, lo sau day tiep' }
}
# Gộp lại cho trang /phantich ngay khi cào xong, đừng đợi tới lượt EOD 15:15 hôm sau —
# cào cả đêm mà trang vẫn hiện "2 mã" thì công cào coi như chưa tới tay ai.
Ghi 'Dang gop data/phantich.json'
& $py 'tools\build_phantich.py' 2>&1 | Add-Content $log
& $git add data/phantich.json 2>&1 | Add-Content $log
& $git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  & $git -c user.name='cpvn-server' -c user.email='bot@users.noreply.github.com' `
    commit -m 'Gop data/phantich.json sau khi boi kho' 2>&1 | Add-Content $log
  for ($k = 1; $k -le 5; $k++) {
    & $git pull --rebase -X theirs origin main 2>&1 | Add-Content $log
    & $git push origin main 2>&1 | Add-Content $log
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds (5 * $k)
  }
}
Ghi "=== XONG $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="
