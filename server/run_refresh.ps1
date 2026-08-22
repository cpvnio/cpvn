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

# ══ PHẦN PHÂN TÍCH CHẠY TRƯỚC — đẩy xong ở ~8 phút, không đợi cả dây cào ═════════════
# Thứ tự cũ: refresh_daily -> kho_giaodich --sau -> kho_vnd -> --vg -> build_phantich, tức
# bảng phiên nằm sau ~2 tiếng cào mà nó KHÔNG cần. Đo ngày 21/08: user mở /phantich lúc
# 15:25 không thấy phiên hôm nay, và mãi 17:49 lượt chạy mới xong.
#
# BỎ HẲN BA BƯỚC CŨ:
#   `kho_giaodich.py --sau`  -> tầng giá nay lấy VNDirect (trùng hoàn toàn, và đã chốt đè
#                               bằng VNDirect từ 22/08), còn SỔ LỆNH thì user chốt BỎ:
#                               *"giá khớp lệnh trung bình và tổng khối lượng khớp lệnh của
#                               từng mã là quá đủ rồi"*. Sổ lệnh CŨ vẫn nằm nguyên trong
#                               kho, chỉ thôi cào mới — bật lại là chạy `--sau` như xưa.
#   `kho_vnd.py`             -> thay bằng `kho_vnd_lo.py`, gọi theo LÔ nhiều mã một lượt:
#                               156 lượt thay vì 4.587, đo thật 2,6 phút thay vì ~45.
#   `kho_giaodich.py --vg`   -> thay bằng `kho_vunggia.py`, nến 1 phút của VNDirect (host
#                               trần 12 lượt/giây thay vì 4, và 1 lượt/mã thay vì 2).

# [1] VNDIRECT, BỐN TẦNG, GỌI THEO LÔ — giá + khối ngoại + tự doanh + số cổ phiếu.
# `--sau 30`: mỗi ngày chỉ cần thêm MỘT phiên, 30 phiên là thừa đệm cho cả kỳ nghỉ Tết.
& $py tools\kho_vnd_lo.py --sau 30 2>&1
if ($LASTEXITCODE -ne 0) { "kho_vnd_lo EXIT $LASTEXITCODE - bo qua, chay tiep" }

# [1b] ĐẨY BƯỚC NHẢY SỐ CỔ PHIẾU VỀ ĐÚNG NGÀY GDKHQ. PHẢI ĐỨNG NGAY SAU kho_vnd_lo:
# `ratios` ghi số cổ phiếu mới dưới `reportDate` CUỐI QUÝ, trong khi giá bị hạ nền NGAY
# ngày GDKHQ — nên cửa sổ giữa hai mốc mang giá đã chia nhân số cổ phiếu chưa chia.
# Đo 22/08/2026: 399 mã, 20.863 ô phiên sai; riêng phiên hôm đó 92 mã hụt 423.082 ty
# = 4,1% von hoa thi truong (VHM chia 1:1 ngay 06/08 chiem 294.501 ty).
# Doc data/sukien (luot 7:30 dung) + 13 luot goi ratios/latest.
& $py tools\va_slcp_gdkhq.py 2>&1
if ($LASTEXITCODE -ne 0) { "va_slcp_gdkhq EXIT $LASTEXITCODE - bo qua, chay tiep" }

# [2] THOẢ THUẬN — riêng `pv`/`pval` vẫn phải hỏi Vietstock. Đối chiếu phiên 21/08: khớp
# lệnh hai nguồn khớp tuyệt đối (16.939 vs 16.940 tỷ) nhưng thoả thuận thì VNDirect BỎ SÓT
# 394/3.001 tỷ, dồn vào 7 mã (VHM 298,9 tỷ ghi thành 0). Không phải trễ mà là sót — VHM
# phiên 20/08 đã chốt hẳn, VNDirect vẫn ghi 0. `--tuloc` chỉ hỏi 348 mã từng có thoả thuận
# trong 30 phiên gần nhất (top 50 mã chiếm 99,8% giá trị), tức 1,4 phút thay vì 6,4.
# ĐỨNG TRƯỚC build_phantich để bảng lên web đã đúng số ngay từ lượt đầu.
& $py tools\kho_giaodich.py --tt --tuloc --trang 1 2>&1
if ($LASTEXITCODE -ne 0) { "kho_giaodich --tt EXIT $LASTEXITCODE - bo qua, chay tiep" }

# [3] CHỈ SỐ THEO PHIÊN (VNINDEX/VN30/HNX/HNX30/UPCOM). Đúng 5 lượt gọi, vài giây.
& $py tools\kho_giaodich.py --chiso 2>&1
if ($LASTEXITCODE -ne 0) { "kho_giaodich --chiso EXIT $LASTEXITCODE - bo qua, chay tiep" }

# [4] DỰNG BẢNG PHIÊN LẦN ĐẦU — vài giây. Tới đây trang /phantich đã có đủ giá, khối lượng,
# giá trị, thoả thuận, khối ngoại, tự doanh, vốn hoá.
& $py tools\build_phantich.py 2>&1
if ($LASTEXITCODE -ne 0) { "build_phantich (luot 1) EXIT $LASTEXITCODE - bo qua, chay tiep" }

# [5] VÙNG GIÁ KHỚP LỆNH từ nến 1 phút của VNDirect. Chỉ mã khớp >= 100 triệu (525/966 mã
# phiên 21/08) — vùng giá của mã khớp vài chục triệu là hai ba cái cột, không nói được gì.
& $py tools\kho_vunggia.py 2>&1
if ($LASTEXITCODE -ne 0) { "kho_vunggia EXIT $LASTEXITCODE - bo qua, chay tiep" }

# [6] KHỐI NGOẠI bản TÁCH khớp lệnh/thoả thuận + tỉ lệ sở hữu + room — VNDirect KHÔNG CÓ,
# chỉ Vietstock mới có. `--tuloc` bỏ mã không có gì để tách: 1.529 -> 338 mã.
& $py tools\kho_giaodich.py --nn --tuloc --trang 1 2>&1
if ($LASTEXITCODE -ne 0) { "kho_giaodich --nn EXIT $LASTEXITCODE - bo qua, chay tiep" }

# [7] TỰ DOANH bản TÁCH. `--tuloc`: chỉ 195/1.529 mã có tự doanh trong 30 phiên gần nhất.
& $py tools\kho_giaodich.py --td --tuloc --trang 1 2>&1
if ($LASTEXITCODE -ne 0) { "kho_giaodich --td EXIT $LASTEXITCODE - bo qua, chay tiep" }

# [8] VÁ Ô SAI ĐƠN VỊ x1000 — PHẢI ĐỨNG SAU MỌI BƯỚC VIETSTOCK, đã trả giá 22/08/2026.
# Bản đầu của lượt dựng lại đặt nó ở vị trí [3], ngay sau `kho_vnd_lo`. Sai: nó vá xong rồi
# ba bước Vietstock bên dưới GHI ĐÈ LẠI số thô — mà số thô mới là thứ có lỗi đơn vị.
# Đo được ngay: BVB 2025-09-09 `tdMuaGT` từ 302 TRIỆU (đúng) thành 302 TỶ. Kiểm chứng độc
# lập: 20.000 cp × 15.300đ = 306 triệu, nên bản 302 triệu của VNDirect mới đúng.
# BẪY LÀM NÓ KHÓ THẤY: trang 1 của `--td`/`--nn` là 30 DÒNG chứ không phải 30 PHIÊN — mã
# giao dịch thưa thì 30 dòng đó trải từ 2025-09-09 tới 2026-07-31, tức lượt "chỉ lấy phiên
# gần nhất" vẫn với tay về gần một năm trước.
& $py tools\va_donvi.py 2>&1
if ($LASTEXITCODE -ne 0) { "va_donvi EXIT $LASTEXITCODE - bo qua, chay tiep" }

# [9] DỰNG BẢNG PHIÊN LẦN HAI — lấp thêm phần tách thoả thuận và tỉ lệ sở hữu.
& $py tools\build_phantich.py 2>&1
if ($LASTEXITCODE -ne 0) { "build_phantich (luot 2) EXIT $LASTEXITCODE - bo qua, chay tiep" }

# [10] KHO ĐẶC TRƯNG — không gọi mạng, ~40 giây. Phải TRƯỚC quet_la (quet_la đọc kho này).
& $py tools\kho_dactrung.py 2>&1
if ($LASTEXITCODE -ne 0) { "kho_dactrung EXIT $LASTEXITCODE - bo qua, chay tiep" }

# [11] QUÉT BẤT THƯỜNG + LÁT CẮT NGANG, ghi thẳng vào file phiên. Ghi lại 100 phiên gần
# nhất chứ không riêng hôm nay: kho đặc trưng đổi thì mọi phiên đổi theo.
& $py tools\quet_la.py --phien 100 2>&1
if ($LASTEXITCODE -ne 0) { "quet_la EXIT $LASTEXITCODE - bo qua, chay tiep" }
& $py tools\quet_la.py 2>&1
if ($LASTEXITCODE -ne 0) { "quet_la (phien moi nhat) EXIT $LASTEXITCODE - bo qua, chay tiep" }

# ── ĐẨY: tách thành HÀM vì nay gọi HAI LẦN (22/08/2026) ──────────────────────────────
# Lượt EOD trước đây đẩy đúng một lần ở cuối, nên trang phân tích phải đợi TRỌN cả dây cào
# — kể cả `refresh_daily.py` (~29 phút) mà nó không hề cần. User chốt: *"tao không muốn
# chốt phiên 15h15 mà tận 17h20 mới có đủ data"*.
# Nay: dựng xong phần PHÂN TÍCH thì đẩy ngay (vòng 1, ~8 phút sau 15:15), rồi mới chạy
# phần còn lại của trang và đẩy tiếp (vòng 2).
# `-X theirs` = khi đụng nhau thì lấy BẢN VỪA CÀO (commit đang được replay); không có nó
# là rebase dừng giữa chừng và kẹt máy cho những lượt sau.
function PushKho($sess, $nhan) {
  & $git add universe.json data/ assets/logo/ 2>&1
  & $git commit -m ("EOD $sess $nhan") 2>&1
  for ($i = 1; $i -le 5; $i++) {
    & $git pull --rebase -X theirs origin main 2>&1
    if ((Test-Path '.git\rebase-merge') -or (Test-Path '.git\rebase-apply')) {
      Write-Output "Rebase vong $i van ket - huy de lan sau con chay duoc."
      & $git rebase --abort 2>&1
      Start-Sleep -Seconds 20
      continue
    }
    & $git push origin main 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Output "DAY XONG $nhan (vong $i)"; return $true }
    Write-Output "Day hong o vong $i, cho 20 giay roi thu lai..."
    Start-Sleep -Seconds 20
  }
  return $false
}

# Tên commit theo NGÀY PHIÊN trong kho vừa dựng, không theo ngày chạy máy: lượt nào vắt
# qua nửa đêm mà lấy ngày máy sẽ đặt tên phiên hôm sau cho dữ liệu hôm trước.
# Vòng 1 lấy từ `data/phantich.json` chứ KHÔNG từ `health.json` — health.json do
# `refresh_daily.py` ghi, mà bước đó nay chạy SAU, nên lúc này nó vẫn là ngày hôm qua.
$sess = & $py -c "import json;print(json.load(open('data/phantich.json'))['tt']['d'][-1])" 2>$null
if (-not $sess) { $sess = Get-Date -Format 'yyyy-MM-dd' }
$ok1 = PushKho $sess '(phan tich)'

# ══ PHẦN CÒN LẠI CỦA TRANG — chạy SAU vì trang /phantich không cần chờ nó ══════════════
# `refresh_daily.py` (~29 phút đo ngày 21/08) lo bảng giá, kho nến, BCTC, tin, hồ sơ, logo,
# bộ lọc, tập đoàn, cổ tức. Nó cũng là bên ghi `data/health.json` — khoá mà lưới dự phòng
# GitHub Actions đọc để biết phiên đã chốt chưa.
if ((Get-Date).DayOfWeek -eq 'Monday') { & $py refresh_daily.py --full 2>&1 }
else                                   { & $py refresh_daily.py 2>&1 }

# CHỨNG QUYỀN ĐANG LƯU HÀNH — ĐÚNG MỘT lượt gọi. Không có kho này thì con số tự doanh trên
# trang phân tích đọc ra sai bản chất: 12/12 mã đầu bảng tự doanh mua ròng đều có chứng
# quyền lưu hành, tức phần lớn là phòng hộ bắt buộc chứ không phải đặt cược.
& $py tools\kho_chungquyen.py 2>&1
if ($LASTEXITCODE -ne 0) { "kho_chungquyen EXIT $LASTEXITCODE - bo qua, chay tiep" }

# RỔ MÃ LỊCH SỬ gồm cả mã ĐÃ RỜI SÀN — hai lượt gọi. Chống sống sót sai lệch.
& $py tools\kho_rolichsu.py 2>&1
if ($LASTEXITCODE -ne 0) { "kho_rolichsu EXIT $LASTEXITCODE - bo qua, chay tiep" }

# VÁ DẤU LƯU CHUYỂN TIỀN TỆ trong data/fin. KHÔNG gọi mạng. PHẢI CHẠY MỖI NGÀY và PHẢI SAU
# refresh_daily: bước 5 của nó cào lại data/fin từ chính nguồn trả dấu sai, nên mã nào được
# cào lại hôm nay là dấu hỏng lại hôm đó.
& $py tools\va_dau_fin.py 2>&1
if ($LASTEXITCODE -ne 0) { "va_dau_fin EXIT $LASTEXITCODE - bo qua, chay tiep" }

# GIAO DỊCH NGƯỜI NỘI BỘ — đọc tiêu đề CBTT trong data/news, KHÔNG gọi mạng. Phải chạy SAU
# refresh_daily (bên cào tin) và kho PHẢI GOM DỒN: data/news chỉ giữ tin trong 30 ngày.
& $py tools\kho_noibo.py 2>&1
if ($LASTEXITCODE -ne 0) { "kho_noibo EXIT $LASTEXITCODE - bo qua, chay tiep" }

$sess2 = & $py -c "import json;print(json.load(open('data/health.json'))['date'])" 2>$null
if (-not $sess2) { $sess2 = $sess }
$ok2 = PushKho $sess2 '(server)'

if (-not ($ok1 -and $ok2)) {
  $msg = "DAY THAT BAI - phien $sess da cao xong nhung CON KET trong may nay. " +
         "Chay tay: cd C:\cpvn; git fetch origin main; git reset --hard origin/main"
  Write-Output $msg
  Set-Content -Path 'C:\cpvn\PUSH_FAILED.txt' -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm')  $msg"
} elseif (Test-Path 'C:\cpvn\PUSH_FAILED.txt') {
  Remove-Item 'C:\cpvn\PUSH_FAILED.txt' -Force
}

Stop-Transcript | Out-Null
