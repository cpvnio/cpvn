# Dựng máy chủ cào EOD từ số 0 — chạy MỘT LẦN, dưới quyền Administrator.
# Máy hiện tại: VPS Windows "ASTERBOX". Hạn dùng tới khoảng 12/2026 — hết hạn thì chép
# nguyên thư mục server/ này sang máy mới, sửa 3 đường dẫn ở đầu rồi chạy lại file này.
#
# CẦN CÓ TRƯỚC:
#   1. Git for Windows, Python 3.12 (kèm pip install Pillow — thiếu thì bước logo tự bỏ qua)
#   2. Kho đã clone về C:\cpvn (script chạy nằm TRONG kho: C:\cpvn\server\run_refresh.ps1
#      -> mỗi lượt `git pull` tự mang bản mới về, không phải chép tay lên máy chủ nữa)
#   3. Khoá triển khai (deploy key) CÓ QUYỀN GHI, đặt tại
#      C:\Users\Administrator\.ssh\github_deploy — thêm khoá công khai vào
#      GitHub > repo > Settings > Deploy keys, NHỚ TICK "Allow write access"

Set-Location 'C:\cpvn'
$git = 'C:\Program Files\Git\cmd\git.exe'

& $git config user.name  'cpvn-server'
& $git config user.email 'bot@users.noreply.github.com'
# fetch qua HTTPS (kho công khai, không cần khoá) — push qua SSH bằng deploy key
& $git remote set-url --push origin git@github.com:cpvnio/cpvn.git
& $git config pull.rebase true

$a = New-ScheduledTaskAction -Execute 'powershell.exe' `
     -Argument '-NoProfile -ExecutionPolicy Bypass -File C:\cpvn\server\run_refresh.ps1'
$t = New-ScheduledTaskTrigger -Weekly `
     -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At '15:15'
# StartWhenAvailable: máy ngủ/tắt lúc 15:15 thì chạy bù ngay khi bật lại
# NỚI GIỚI HẠN 2 -> 3 GIỜ (21/08/2026). Lượt EOD nay làm thêm kho giao dịch: 5 lượt gọi mỗi
# mã cho giá + sổ lệnh + khối ngoại + tự doanh (~32 phút), vùng giá khớp lệnh (~10 phút),
# chỉ số và bộ gộp (vài giây). Cộng với refresh_daily thì sát trần 2 giờ cũ. Chạm trần là
# Windows GIẾT tiến trình giữa chừng mà tác vụ VẪN báo hoàn tất.
#
# ĐỪNG CHÈN CHÚ THÍCH VÀO GIỮA DẤU NỐI DÒNG ` VÀ THAM SỐ KẾ TIẾP. Đã dính đúng vậy khi
# viết lời giải thích trên: PowerShell cắt câu lệnh ngay tại dòng chú thích, nên
# `New-ScheduledTaskSettingsSet -StartWhenAvailable` chạy trơ trọi và nhận giới hạn MẶC
# ĐỊNH 72 GIỜ, còn dòng `-ExecutionTimeLimit` thành một câu lệnh rác. Tác vụ vẫn đăng ký
# "thành công" — chỉ lộ ra khi đọc lại `Settings.ExecutionTimeLimit` và thấy PT72H.
$s = New-ScheduledTaskSettingsSet -StartWhenAvailable `
     -ExecutionTimeLimit (New-TimeSpan -Hours 3)
Register-ScheduledTask -TaskName 'CPVN EOD refresh' -Action $a -Trigger $t `
     -Settings $s -User 'SYSTEM' -RunLevel Highest -Force

Write-Output 'TASK_REGISTERED'
(Get-ScheduledTask -TaskName 'CPVN EOD refresh').State

# ---- KIỂM TRA NHANH KHI NGHI NGỜ -------------------------------------------------
#   schtasks /query /tn "CPVN EOD refresh" /fo list /v      -> Last Run Time / Last Result
#   Get-Content C:\cpvn\refresh_log.txt -Tail 40            -> log lượt gần nhất
#   Test-Path C:\cpvn\PUSH_FAILED.txt                       -> True = kho đang KẸT lại trong máy
# LƯU Ý: "Last Result: 0" CHỈ có nghĩa PowerShell thoát sạch, KHÔNG có nghĩa đã đẩy
# được lên GitHub. Luôn xem thêm PUSH_FAILED.txt và ngày phiên trong data/health.json.
