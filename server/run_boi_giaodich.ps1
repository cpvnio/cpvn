# VÁ KHO GIAO DỊCH — LƯỚI AN TOÀN, chạy TAY khi nghi kho thiếu. KHÔNG đăng ký tác vụ.
#
# CHÍNH SÁCH ĐỘ SÂU: 100 PHIÊN, và từ đó bồi tới bằng lượt EOD 15:15 hằng ngày
# (user chốt 21/08/2026: *"tao chỉ cần 100 phiên thôi... và lưu từ đây về sau là được rồi"*).
# Bản đầu của file này cào TOÀN BỘ lịch sử mỗi mã (`--tatca`) — 20+ giờ, và phần lớn công
# đó không ai dùng tới. Đã gỡ tác vụ `CPVN boi giaodich` khỏi máy chủ 21/08/2026 khi nó
# đang ở 637/1.529 mã.
#
# ĐỪNG ĐỔI LẠI THÀNH `--tatca`. Lượt EOD hằng ngày chỉ xin 2 trang (40 phiên) rồi TRỘN vào
# file cũ, nên kho giữ nguyên 100 phiên đã có và dày thêm mỗi ngày — không có lý do gì phải
# cào ngược cả nghìn phiên nữa.
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

# Danh sách mã CÒN THIẾU — đo theo ĐỘ SÂU chứ không theo "file có tồn tại không".
#
# Hỏi "có file chưa" là sai, đã trả giá 20/08/2026: lượt EOD tạo đủ 1.529 file nhưng mỗi
# file chỉ có ~30 phiên, lượt vá sau đó thấy "file có rồi" nên bỏ qua sạch — kho đứng ở 30
# phiên vĩnh viễn mà không có gì báo.
#
# Hỏi `day != 1` cũng sai theo hướng ngược lại: mọi file dựng bằng `--sau` đều không mang
# cờ đó, nên lượt nào cũng coi cả 1.529 mã là thiếu và cào lại từ đầu 20 giờ.
#
# Đúng là hỏi HAI điều:
#   · dưới NGUONG phiên (trừ mã mới lên sàn — chúng KHÔNG THỂ có đủ, đừng hỏi lại mãi)
#   · `v` < PBAN  -> dựng bằng cách tính CŨ, phải làm lại (kho tự lành dần)
$conthieu = & $py -c @"
import json, os, sys
sys.path.insert(0, 'tools')
from kho_giaodich import PBAN
NGUONG = 100
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
    if (o.get('v') or 0) < PBAN:
        return True
    n = o.get('n') or 0
    if n >= NGUONG:
        return False
    # MÃ MỚI LÊN SÀN KHÔNG THỂ CÓ ĐỦ 100 PHIÊN — hỏi lại mãi là quay vòng vô ích. Đo
    # 21/08/2026: 12 mã ở tình trạng này (LPS 3 phiên, PCB 7, DMX 11...), và phiên đầu
    # trong kho TRÙNG KHÍT ngày lên sàn ở cả 12. Kho của chúng đã đủ.
    try:
        ny = json.load(open(os.path.join('data', 'niemyet.json'), encoding='utf-8'))
        ngay = {z['s']: z.get('d') for z in ny['ma']}.get(sym)
    except Exception:
        ngay = None
    return not (ngay and (o.get('d') or [''])[0] <= ngay)
print(' '.join(s['sym'] for s in u if thieu(s['sym'])))
"@
$ma = ($conthieu -split '\s+') | Where-Object { $_ }
Ghi "Con thieu $($ma.Count) ma"
if ($ma.Count -eq 0) { Ghi 'Khong con gi de cao - thoat.'; exit 0 }

# LÔ 50 MÃ. Nhỏ hơn thì tốn quá nhiều lượt commit/push; lớn hơn thì hỏng một cái mất
# nhiều công hơn. Với `--trang 5` thì 50 mã ≈ 2 phút, cả 1.529 mã ≈ 40 phút.
$lo = 50
for ($i = 0; $i -lt $ma.Count; $i += $lo) {
  $nhom = $ma[$i..([Math]::Min($i + $lo - 1, $ma.Count - 1))]
  Ghi "--- lo $([int]($i/$lo)+1)/$([Math]::Ceiling($ma.Count/$lo)): $($nhom.Count) ma, bat dau $($nhom[0]) ---"
  & $py 'tools\kho_giaodich.py' --sau --trang 5 --ma @nhom 2>&1 | Add-Content $log

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
