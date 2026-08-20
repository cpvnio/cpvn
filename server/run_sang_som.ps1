# LƯỢT CHẠY TRƯỚC PHIÊN — 7:30 mỗi ngày giao dịch.
# File nằm TRONG kho nên bước đồng bộ dưới đây tự mang bản mới về; sửa ở repo là lượt sau
# máy chủ tự dùng bản mới, không phải chép tay lên máy chủ.
#
# VÌ SAO CÓ LƯỢT NÀY, TRONG KHI ĐÃ CÓ LƯỢT 15:15:
# Có thứ đổi qua đêm mà sai thì khách thấy NGAY TỪ PHÚT ĐẦU của phiên, còn lượt EOD phải
# tới chiều mới chữa được. Cụ thể là SỐ CỔ PHIẾU LƯU HÀNH: ngày GDKHQ nguồn hạ nền giá ngay
# nhưng số cổ phiếu vài ngày sau mới cập nhật, mà trang tính vốn hoá = SLCP × giá sống —
# nên vốn hoá tụt đúng bằng tỉ lệ chia, im lặng. Đo 19/08/2026: SSI −15,4%, CTI −7,8%,
# BID −6,7%. User phát hiện, không phải phép kiểm nào.
# Lượt này chỉ sửa `universe.json`. KHÔNG đụng giá (gia_phien.py lo) và KHÔNG đụng kho nến
# (refresh_daily.py lo) — ba đường tách nhau để hỏng một cái không kéo theo hai cái kia.

$ErrorActionPreference = 'Continue'
Set-Location 'C:\cpvn'
$git = 'C:\Program Files\Git\cmd\git.exe'
$log = 'C:\cpvn\server\sang_som.log'
# BẮT BUỘC — console Windows mặc định là cp1252, không in được tiếng Việt có dấu. Thiếu dòng
# này thì MỌI công cụ ở đây chết ngay dòng `print` đầu tiên với UnicodeEncodeError, tác vụ
# trả LastResult=1 và cả lượt chạy không làm gì cả. Đã dính đúng vậy ở lượt chạy thử đầu
# tiên 20/08/2026 (sang_som.py, ký tự 'ớ'). `run_refresh.ps1` có dòng này từ lâu; file này
# viết sau nên bị sót — sao y, đừng bỏ.
$env:PYTHONIOENCODING = 'utf-8'

# BẮT BUỘC — sao y run_refresh/run_gia_phien. Tác vụ chạy dưới SYSTEM, mà SYSTEM không có
# ~/.ssh/config, không có known_hosts của github.com, và khoá deploy mang tên KHÔNG mặc
# định nên ssh không tự nhặt. Thiếu dòng này là mọi lượt git chết ở "Host key verification
# failed" — đã dính đúng vậy ở lượt chạy thử đầu tiên của gia_phien.
$env:GIT_SSH_COMMAND = 'ssh -i C:/Users/Administrator/.ssh/github_deploy -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=C:/cpvn/.known_hosts'

if ((Test-Path $log) -and ((Get-Item $log).Length -gt 2MB)) {
  Get-Content $log -Tail 500 | Set-Content "$log.tmp"; Move-Item "$log.tmp" $log -Force
}
"--- $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ---" | Add-Content $log

# BỎ QUA CUỐI TUẦN VÀ NGÀY NGHỈ. `data/health.json` giữ phiên gần nhất đã chốt sổ; nếu hôm
# nay không phải ngày giao dịch thì chạy cũng chẳng có gì đổi, mà vẫn tốn 1.500 lượt gọi
# sang Simplize. Ngày nghỉ lễ thì lượt này vẫn chạy (không có lịch nghỉ ở đây) — chấp nhận,
# vì nó chỉ làm mới SLCP chứ không ghi gì sai.
$thu = (Get-Date).DayOfWeek
if ($thu -eq 'Saturday' -or $thu -eq 'Sunday') {
  "Cuoi tuan - bo qua." | Add-Content $log; exit 0
}

# TỰ GỠ KẸT trước khi làm gì — cùng bài học với run_refresh: một cuộc rebase dở dang từ
# lượt trước làm máy KẸT VĨNH VIỄN. Máy chủ chỉ là bản sao, cứ bám thẳng theo remote.
if ((Test-Path '.git\rebase-merge') -or (Test-Path '.git\rebase-apply')) {
  'Rebase do dang tu luot truoc - huy va bam lai theo remote.' | Add-Content $log
  & $git rebase --abort 2>&1 | Add-Content $log
}
& $git fetch origin main 2>&1 | Add-Content $log
& $git reset --hard origin/main 2>&1 | Add-Content $log

# ĐƯỜNG DẪN ĐẦY ĐỦ, đừng gọi trống `python`. SYSTEM không có nó trong PATH — PowerShell ném
# CommandNotFound mà `$LASTEXITCODE` GIỮ NGUYÊN giá trị cũ (0 của git), nên tác vụ báo
# "Last Result: 0" trong khi python chưa hề chạy. Đã dính đúng vậy ở gia_phien.
$py = 'C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe'
if (-not (Test-Path $py)) { "KHONG THAY PYTHON: $py" | Add-Content $log; exit 9 }

& $py 'C:\cpvn\tools\sang_som.py' 2>&1 | Add-Content $log
$ma = $LASTEXITCODE
if ($ma -ne 0) { "EXIT $ma - bo qua buoc day" | Add-Content $log; exit $ma }

# KHO SỰ KIỆN DOANH NGHIỆP (data/sukien) — cổ tức/thưởng/quyền mua + ngày ra BCTC.
# Đặt ở lượt TRƯỚC PHIÊN chứ không phải lượt EOD: nó chỉ đọc, không đụng giá hay kho nến,
# mà chart lại cần nó ngay từ phiên sáng. ~3,5 phút, 1.500 lượt tới Vietstock ở 8 lượt/giây.
# Công cụ tự BỎ QUA file không đổi nên ngày thường gần như không có gì để commit.
# Hỏng ở bước này KHÔNG được chặn lượt chạy: universe.json mới là thứ bắt buộc phải lên.
& $py 'C:\cpvn\tools\kho_sukien.py' 2>&1 | Add-Content $log
if ($LASTEXITCODE -ne 0) { "kho_sukien EXIT $LASTEXITCODE - bo qua, chay tiep" | Add-Content $log }

# THÔNG TIN NIÊM YẾT (data/niemyet.json) — ngày lên sàn, lịch mã sắp lên sàn, đường ống hồ
# sơ HOSE. Phải chạy SAU kho_sukien: nó dùng chuỗi sự kiện để gỡ hạ nền.
# Nặng vừa (~7 phút): phần lớn là hỏi gộp 150 mã/lượt, chỉ mã thiếu giá phiên đầu mới phải
# hỏi lẻ. Hỏng thì bỏ qua, không chặn lượt chạy.
& $py 'C:\cpvn\tools\kho_niemyet.py' 2>&1 | Add-Content $log
if ($LASTEXITCODE -ne 0) { "kho_niemyet EXIT $LASTEXITCODE - bo qua, chay tiep" | Add-Content $log }

# GIÁ CHÀO SÀN — CHẠY TĂNG DẦN, chỉ lấy mã CHƯA có giá chào sàn (mã mới lên sàn).
# KHÔNG được thêm --tatca vào đây: lượt đầy đủ là 1.529 trang HTML ~300KB = 460 MB và 484
# giây, trong khi giá chào sàn của mã cũ KHÔNG BAO GIỜ ĐỔI. Ngày thường nó cào 0 mã và
# thoát ngay. Muốn làm mới toàn bộ thì chạy tay `kho_chaosan.py --tatca`.
& $py 'C:\cpvn\tools\kho_chaosan.py' 2>&1 | Add-Content $log
if ($LASTEXITCODE -ne 0) { "kho_chaosan EXIT $LASTEXITCODE - bo qua, chay tiep" | Add-Content $log }

# Không có gì đổi thì ĐỪNG commit — mỗi commit rỗng vẫn kích một lượt build Cloudflare.
& $git add universe.json data/sukien data/niemyet.json 2>&1 | Add-Content $log
& $git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { 'universe.json + data/sukien + niemyet khong doi - khong commit.' | Add-Content $log; exit 0 }

& $git -c user.name='cpvn-server' -c user.email='bot@users.noreply.github.com' `
  commit -m "Truoc phien $(Get-Date -Format 'yyyy-MM-dd') (server)" 2>&1 | Add-Content $log

# KÉO LẠI NGAY TRƯỚC KHI ĐẨY. Bài học 04/08: push bị từ chối "fetch first" vì có commit
# khác lên trong lúc script chạy, và cả lượt nằm lại trong máy mà không ai biết — Last
# Result vẫn 0. Thử 5 lần rồi mới chịu thua, và có thua thì phải để lại DẤU.
for ($i = 1; $i -le 5; $i++) {
  & $git pull --rebase -X theirs origin main 2>&1 | Add-Content $log
  & $git push origin main 2>&1 | Add-Content $log
  if ($LASTEXITCODE -eq 0) { "Day thanh cong lan $i." | Add-Content $log; exit 0 }
  Start-Sleep -Seconds (5 * $i)
}
"PUSH THAT BAI sau 5 lan - $(Get-Date -Format 'yyyy-MM-dd HH:mm')" | Set-Content 'C:\cpvn\PUSH_FAILED.txt'
'PUSH THAT BAI sau 5 lan.' | Add-Content $log
exit 1
