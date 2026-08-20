# CPVN — cào EOD rồi đẩy kho lên GitHub.
# Scheduled Task gọi lúc 15:15 T2–T6, chạy dưới quyền SYSTEM.
#
# BÀI HỌC 04/08/2026 — vì sao bản cũ hỏng:
#   Bản cũ `git pull --rebase` ở ĐẦU rồi `git push` ở CUỐI, mà pipeline chạy mất ~8 phút.
#   Ai đó đẩy commit lên trong 8 phút đó là push bị từ chối "fetch first", cả phiên vừa cào
#   nằm lại trong máy, KHÔNG có gì báo — tác vụ vẫn báo Last Result = 0 vì PowerShell thoát 0.
#   Nay: kéo lại NGAY TRƯỚC khi đẩy, thử lại vài lần, và thất bại thì kêu to.
#
# BÀI HỌC 06/08/2026 — bản trên lại hỏng theo kiểu khác:
#   `git pull --rebase` trong vòng đẩy VẤP XUNG ĐỘT (phiên vừa cào ghi đè đúng những file
#   data/ mà commit trên remote cũng vừa sửa). Rebase dừng giữa chừng, 5 lần đẩy đều hỏng,
#   và từ hôm đó máy KẸT VĨNH VIỄN: lượt sau `git pull --rebase` gặp repo đang dở rebase là
#   hỏng ngay từ dòng đầu. Web đứng im mà không ai biết.
#   Nay: máy chủ coi như BẢN SAO — mỗi lượt huỷ rebase dở dang rồi reset thẳng về
#   origin/main trước khi cào (dữ liệu vốn dựng lại được), và khi rebase để đẩy thì lấy
#   BẢN VỪA CÀO làm chuẩn nếu đụng nhau (`-X theirs`).
#
# LƯU Ý ENCODING: file này PHẢI lưu UTF-8 CÓ BOM và MỌI CHUỖI CHẠY ĐƯỢC chỉ dùng ASCII.
#   Windows PowerShell 5.1 đọc .ps1 không BOM theo bảng mã ANSI. Hôm 06/08 nó văng
#   "'elseif' is not recognized" ở dòng 50 và ghi ra PUSH_FAILED.txt RỖNG TUẾCH — câu báo
#   lỗi chứa dấu gạch dài biến mất sạch, đúng lúc cần đọc nhất. Tiếng Việt để trong CHÚ
#   THÍCH thì vô hại (chú thích chạy tới hết dòng), trong chuỗi thì đừng.

$ErrorActionPreference = 'Continue'
$log = 'C:\cpvn\refresh_log.txt'
if ((Test-Path $log) -and ((Get-Item $log).Length -gt 2MB)) { Remove-Item $log -Force }
Start-Transcript -Path $log -Append | Out-Null
Set-Location 'C:\cpvn'

$env:PYTHONIOENCODING = 'utf-8'   # console Windows mặc định không in được tiếng Việt
$env:GIT_SSH_COMMAND  = 'ssh -i C:/Users/Administrator/.ssh/github_deploy -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=C:/cpvn/.known_hosts'
$git = 'C:\Program Files\Git\cmd\git.exe'
$py  = 'C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe'

# TỰ GỠ KẸT: lượt trước có thể để lại một cuộc rebase dở dang. Máy chủ chỉ là bản sao —
# mọi thứ trong data/ đều dựng lại được — nên cứ huỷ rồi bám thẳng theo remote.
if ((Test-Path '.git\rebase-merge') -or (Test-Path '.git\rebase-apply')) {
  Write-Output 'Phat hien rebase do dang tu luot truoc - huy va bam lai theo remote.'
  & $git rebase --abort 2>&1
}
& $git fetch origin main 2>&1
& $git reset --hard origin/main 2>&1

if ((Get-Date).DayOfWeek -eq 'Monday') { & $py refresh_daily.py --full 2>&1 }
else                                   { & $py refresh_daily.py 2>&1 }

# KHO GIAO DỊCH (data/giaodich) — số chốt phiên + SỔ LỆNH KHI CHỐT PHIÊN, từ Vietstock.
# Chạy Ở ĐÂY chứ không ở lượt 7:30: đây là số CHỐT SỔ, phải sau 15:00 mới có.
# Hằng ngày chỉ xin trang 1 của mỗi mã (đã có sẵn 20 phiên giá + 30 phiên sổ lệnh) nên
# Một lượt lấy TẤT CẢ cho mỗi mã: 2 trang giá (40 phiên) + 2 trang sổ lệnh + 2 trang
# khối ngoại + 1-2 trang tự doanh ≈ 8 lượt/mã ≈ 12.000 lượt ≈ 50 phút ở 4 lượt/giây.
# Số trang của ba tầng dòng tiền nằm ở `TRANG_LUONG` trong kho_giaodich.py — nâng
# 21/08/2026 vì sổ lệnh trước đó chỉ xin 1 trang (30 phiên) còn khối ngoại 2 trang
# (60 phiên), trong khi giá đã có 100. Kho mang tiếng "100 phiên" mà tầng hiếm nhất
# lại mỏng nhất. ĐÂY KHÔNG PHẢI nới trần nhịp mạng — trần vẫn 4 lượt/giây, chỉ là lượt
# chạy dài hơn. Muốn kéo sâu hơn nữa thì chạy TAY `--sau --trang N`, đừng đổi mặc định.
# Gộp bốn thứ vào MỘT bước chứ không tách bốn bước: cả ba tầng sau đều cần `stockID`, mà
# số đó chỉ có sau khi gọi thống kê giá — tách ra là phải gọi lại thống kê giá ba lần nữa.
# Hỏng ở bước này KHÔNG được chặn lượt chạy — universe.json và kho nến mới là thứ bắt buộc.
& $py tools\kho_giaodich.py --sau 2>&1
if ($LASTEXITCODE -ne 0) { "kho_giaodich EXIT $LASTEXITCODE - bo qua, chay tiep" }

# CHỈ SỐ THEO PHIÊN (data/chiso.json) — VNINDEX/VN30/HNX/HNX30/UPCOM, điểm đóng cửa và
# % thay đổi, sâu tới 2017. Đúng 5 lượt gọi, vài giây. `data/idx.json` của pipeline chỉ
# giữ ~15 phiên và không có % thay đổi nên không thay được cái này.
& $py tools\kho_giaodich.py --chiso 2>&1
if ($LASTEXITCODE -ne 0) { "kho_giaodich --chiso EXIT $LASTEXITCODE - bo qua, chay tiep" }

# VÙNG GIÁ KHỚP LỆNH của phiên vừa chốt — khối lượng gộp theo từng mức giá, kèm phân bổ
# dòng tiền. 2 lượt/mã = ~3.060 lượt ≈ 13 phút. Chỉ làm PHIÊN HÔM NAY; muốn bồi lịch sử
# thì chạy tay `--vg --tu ... --den ...` (kho vùng giá của nguồn chỉ có từ ~09/2025).
& $py tools\kho_giaodich.py --vg 2>&1
if ($LASTEXITCODE -ne 0) { "kho_giaodich --vg EXIT $LASTEXITCODE - bo qua, chay tiep" }

# Gộp kho giao dịch thành MỘT file cho trang /phantich. Không gọi mạng, vài giây.
# Phải chạy SAU kho_giaodich, và mỗi ngày — kho đổi mà file gộp không đổi thì trang
# hiện số của hôm qua mà không có dấu hiệu gì.
& $py tools\build_phantich.py 2>&1
if ($LASTEXITCODE -ne 0) { "build_phantich EXIT $LASTEXITCODE - bo qua, chay tiep" }

# CHỨNG QUYỀN ĐANG LƯU HÀNH — ĐÚNG MỘT lượt gọi. Không có kho này thì con số tự doanh
# trên trang phân tích đọc ra sai bản chất: đo phiên 20/08, **12/12 mã đầu bảng tự doanh
# mua ròng đều đang có chứng quyền lưu hành** (HPG 33 cái, FPT 30, STB 28) — tức phần lớn
# là phòng hộ bắt buộc chứ không phải đặt cược.
& $py tools\kho_chungquyen.py 2>&1
if ($LASTEXITCODE -ne 0) { "kho_chungquyen EXIT $LASTEXITCODE - bo qua, chay tiep" }

# RỔ MÃ LỊCH SỬ gồm cả 443 mã ĐÃ RỜI SÀN — hai lượt gọi. `universe.json` là rổ HÔM NAY
# nên mọi phép đo trên nó đều sống sót sai lệch theo hướng lạc quan (68 mã huỷ niêm yết
# riêng năm 2026). Kho này chưa chữa được sai lệch, nhưng làm cho chỗ thiếu ĐẾM ĐƯỢC.
& $py tools\kho_rolichsu.py 2>&1
if ($LASTEXITCODE -ne 0) { "kho_rolichsu EXIT $LASTEXITCODE - bo qua, chay tiep" }

# VÁ DẤU LƯU CHUYỂN TIỀN TỆ trong data/fin, lấy dấu từ data/finq. KHÔNG gọi mạng, vài
# giây. Phải chạy MỖI NGÀY chứ không phải một lần: bước 5 của pipeline cào lại data/fin
# từ 24hMoney — chính cái nguồn trả dấu sai — nên mã nào được cào lại hôm nay là dấu
# hỏng lại hôm đó. Vá một lần rồi quên là kho tự hỏng lại mà không có gì báo.
& $py tools\va_dau_fin.py 2>&1
if ($LASTEXITCODE -ne 0) { "va_dau_fin EXIT $LASTEXITCODE - bo qua, chay tiep" }

# GIAO DỊCH NGƯỜI NỘI BỘ — đọc tiêu đề CBTT của HOSE/HNX đã có trong data/news, KHÔNG
# gọi mạng. PHẢI CHẠY MỖI NGÀY và kho PHẢI GOM DỒN: data/news chỉ giữ tin trong 30 ngày,
# bỏ một tuần là mất hẳn tuần đó, không lấy lại được.
& $py tools\kho_noibo.py 2>&1
if ($LASTEXITCODE -ne 0) { "kho_noibo EXIT $LASTEXITCODE - bo qua, chay tiep" }

# KHO ĐẶC TRƯNG — vòng quay free float, Amihud, biên độ, cộng dồn khối ngoại, và chỉ
# tiêu cơ bản GẮN THEO NGÀY CÔNG BỐ BCTC. Không gọi mạng, ~40 giây.
# Phải chạy SAU build_phantich (không phụ thuộc, nhưng để thứ tự đọc xuôi) và TRƯỚC
# quet_la — quet_la đọc thẳng kho này.
& $py tools\kho_dactrung.py 2>&1
if ($LASTEXITCODE -ne 0) { "kho_dactrung EXIT $LASTEXITCODE - bo qua, chay tiep" }

# QUÉT BẤT THƯỜNG + LÁT CẮT NGANG cho bộ lọc tự chọn, ghi thẳng vào file phiên.
# Phải chạy SAU build_phantich (nó là bên dựng ra file phiên) và SAU kho_dactrung.
# Ghi lại 100 phiên gần nhất chứ không riêng phiên hôm nay: kho đặc trưng đổi thì mọi
# phiên đổi theo (đỉnh 52 tuần, cộng dồn 20 phiên, kỳ BCTC đang hiệu lực).
& $py tools\quet_la.py --phien 100 2>&1
if ($LASTEXITCODE -ne 0) { "quet_la EXIT $LASTEXITCODE - bo qua, chay tiep" }
& $py tools\quet_la.py 2>&1
if ($LASTEXITCODE -ne 0) { "quet_la (phien moi nhat) EXIT $LASTEXITCODE - bo qua, chay tiep" }

# Tên commit theo NGÀY PHIÊN trong kho vừa dựng, không theo ngày chạy máy: lượt nào
# vắt qua nửa đêm mà lấy ngày máy sẽ đặt tên phiên hôm sau cho dữ liệu hôm trước.
$sess = & $py -c "import json;print(json.load(open('data/health.json'))['date'])" 2>$null
if (-not $sess) { $sess = Get-Date -Format 'yyyy-MM-dd' }

& $git add universe.json data/ assets/logo/ 2>&1
& $git commit -m ("EOD $sess (server)") 2>&1

# ĐẨY CÓ THỬ LẠI: mỗi vòng kéo lại rồi mới đẩy, vì remote có thể vừa nhích lên.
# `-X theirs` = khi đụng nhau thì lấy BẢN VỪA CÀO (commit đang được replay), vì nó là số
# liệu mới nhất và dựng lại từ nguồn; không có nó là rebase dừng giữa chừng, kẹt máy.
$pushed = $false
for ($i = 1; $i -le 5; $i++) {
  & $git pull --rebase -X theirs origin main 2>&1
  if ((Test-Path '.git\rebase-merge') -or (Test-Path '.git\rebase-apply')) {
    Write-Output "Rebase vong $i van ket - huy de lan sau con chay duoc."
    & $git rebase --abort 2>&1
    Start-Sleep -Seconds 20
    continue
  }
  & $git push origin main 2>&1
  if ($LASTEXITCODE -eq 0) { $pushed = $true; Write-Output "DAY XONG (vong $i)"; break }
  Write-Output "Day hong o vong $i, cho 20 giay roi thu lai..."
  Start-Sleep -Seconds 20
}

if (-not $pushed) {
  # Kêu to: ghi cờ ra file riêng để lượt sau và người kiểm biết ngay là kho đang kẹt lại
  $msg = "DAY THAT BAI sau 5 lan - phien $sess da cao xong nhung CON KET trong may nay. " +
         "Chay tay: cd C:\cpvn; git fetch origin main; git reset --hard origin/main"
  Write-Output $msg
  Set-Content -Path 'C:\cpvn\PUSH_FAILED.txt' -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm')  $msg"
} elseif (Test-Path 'C:\cpvn\PUSH_FAILED.txt') {
  Remove-Item 'C:\cpvn\PUSH_FAILED.txt' -Force    # đã thông, xoá cờ cũ
}

Stop-Transcript | Out-Null
