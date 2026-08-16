# Dựng tác vụ GIÁ TRONG PHIÊN — chạy MỘT LẦN, dưới quyền Administrator, trên ASTERBOX.
# Chạy SAU khi `setup_task.ps1` đã dựng xong (file này dùng lại git config + deploy key
# mà script kia đã đặt; chạy riêng nó trên máy trắng sẽ không push được).
#
# VIỆC NÓ LÀM: mỗi 15 phút trong phiên, lấy bảng giá VPS đúng 11 lượt cho CẢ thị trường,
# ghi data/board.json rồi đẩy lên. Khách đọc file đó thay vì tự gọi VPS.
#   -> tải lên VPS thành HẰNG SỐ (~275 lượt/phiên) thay vì tỉ lệ thuận với người xem
#      (100 người xem cùng lúc = 108.000 lượt/phiên trước khi đổi)
#
# NHỊP 15 PHÚT LÀ CỐ Ý, đừng hạ xuống 5:
#   · mỗi lượt đẩy kích MỘT lượt build của Cloudflare. 15 phút -> ~25 build/phiên,
#     ~500/tháng. Hạ xuống 5 phút là ~75/phiên, ~1.500/tháng — có thể chạm hạn mức, mà
#     hết hạn mức thì CẢ TRANG ngừng cập nhật chứ không hỏng riêng mục giá.
#   · độ trễ thấy được tối đa = 15 phút nhịp + 60 giây cache = 16 phút.

Set-Location 'C:\cpvn'

$a = New-ScheduledTaskAction -Execute 'powershell.exe' `
     -Argument '-NoProfile -ExecutionPolicy Bypass -File C:\cpvn\server\run_gia_phien.ps1'

# Lặp 15 phút suốt 6 tiếng kể từ 9:00 -> lượt cuối 15:00, khớp giờ đóng cửa.
# Script Python còn tự kiểm giờ lần nữa (mốc 15:05, đúng mốc sessionOpen của client) nên
# lượt chạy bù sau giờ sẽ tự thoát, không ghi đè bậy.
$t = New-ScheduledTaskTrigger -Weekly `
     -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At '09:00'
$t.Repetition = (New-ScheduledTaskTrigger -Once -At '09:00' `
     -RepetitionInterval (New-TimeSpan -Minutes 15) `
     -RepetitionDuration (New-TimeSpan -Hours 6)).Repetition

# KHÔNG StartWhenAvailable: khác hẳn tác vụ EOD. Giá trong phiên mà chạy bù lúc 20h là ghi
# một file mang nhãn giờ sai lên kho — thà bỏ hẳn lượt đó.
$s = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
     -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'CPVN gia phien' -Action $a -Trigger $t `
     -Settings $s -User 'SYSTEM' -RunLevel Highest -Force

Write-Output 'TASK_REGISTERED'
(Get-ScheduledTask -TaskName 'CPVN gia phien').State

# ---- KIỂM TRA NHANH ---------------------------------------------------------------
#   Start-ScheduledTask -TaskName 'CPVN gia phien'      # chạy thử ngay
#   Get-Content C:\cpvn\server\gia_phien.log -Tail 20
#   git -C C:\cpvn log --oneline -3                     # phải thấy commit "Giá phiên ..."
#
# `Last Result: 0` KHÔNG có nghĩa là đã đẩy được lên GitHub — cùng bẫy đã ghi trong
# README: nó chỉ nói PowerShell thoát sạch. Khi nghi ngờ hãy xem C:\cpvn\PUSH_FAILED.txt
# và mốc `at` trong https://cpvn.io/data/board.json
