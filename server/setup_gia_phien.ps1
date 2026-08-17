# Dựng tác vụ GIÁ TRONG PHIÊN — chạy MỘT LẦN, dưới quyền Administrator, trên ASTERBOX.
# Chạy SAU khi `setup_task.ps1` đã dựng xong (file này dùng lại git config + deploy key
# mà script kia đã đặt; chạy riêng nó trên máy trắng sẽ không push được).
#
# VIỆC NÓ LÀM: chạy mỗi 5 PHÚT, nhưng cào HAI TẦNG THEO THANH KHOẢN (user chốt 17/08):
#     nhóm GTGD >= 1 tỷ (282 mã, 2 lô)  ->  mỗi  5 phút  -> data/board_nong.json (38 KB nén)
#     cả thị trường     (1.527 mã, 11 lô) -> mỗi 15 phút  -> data/board.json
# 282 mã đó chiếm 99,5% thanh khoản TOÀN thị trường, nên làm mới nhanh nhóm ấy là gần như
# làm mới nhanh mọi thứ người ta thật sự nhìn — với 2 lượt gọi thay vì 11.
# Client đọc CẢ HAI và ghép, bản nhanh đè lên bản chậm.
#   -> tải lên VPS ~360 lượt/phiên = 0,017 lượt/giây, HẰNG SỐ dù 1 hay 1 triệu người xem
#
# CHI PHÍ PHẢI THEO DÕI: mỗi lượt đẩy kích MỘT lượt build Cloudflare và để lại vài chục KB
# vĩnh viễn trong lịch sử git. Tối đa 72 commit/ngày -> ~1.580 build/tháng, git ~1,9 GB/năm.
# `gia_phien.py` BỎ QUA commit khi ruột không đổi (nghỉ trưa, phiên lặng) nên số thật thấp
# hơn. NẾU CHẠM HẠN MỨC BUILD thì hạ nhịp ở đây trước, đừng bỏ tầng nhanh.
#   · độ trễ thấy được: nhóm thanh khoản tối đa 6 phút · phần còn lại tối đa 16 phút.

Set-Location 'C:\cpvn'

$a = New-ScheduledTaskAction -Execute 'powershell.exe' `
     -Argument '-NoProfile -ExecutionPolicy Bypass -File C:\cpvn\server\run_gia_phien.ps1'

# Lặp 5 phút suốt 6 tiếng kể từ 9:00 -> 73 lượt, lượt cuối 15:00 khớp giờ đóng cửa.
# Số chốt sổ thì tác vụ EOD riêng (15:15) lo, không phải việc của nhịp này.
# Script Python còn tự kiểm giờ lần nữa (mốc 15:05, đúng mốc sessionOpen của client) nên
# lượt chạy bù sau giờ sẽ tự thoát, không ghi đè bậy.
$t = New-ScheduledTaskTrigger -Weekly `
     -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At '09:00'
$t.Repetition = (New-ScheduledTaskTrigger -Once -At '09:00' `
     -RepetitionInterval (New-TimeSpan -Minutes 5) `
     -RepetitionDuration (New-TimeSpan -Hours 6)).Repetition

# -StartWhenAvailable LÀ BẮT BUỘC, đừng bỏ vì sợ "chạy bù sai giờ".
#   Bản đầu tao cố ý bỏ nó, và đó là một lỗ hổng cả ngày: trigger là Weekly-lúc-09:00 kèm
#   Repetition, nên máy mà tắt/khởi động lại ĐÚNG lúc 09:00 thì trigger trượt hẳn, và
#   REPETITION KHÔNG BAO GIỜ BẮT ĐẦU -> mất giá trong phiên NGUYÊN NGÀY, im lặng.
#   Nỗi lo "chạy bù lúc 20h ghi file sai giờ" đã được chặn ở chỗ khác rồi: gia_phien.py tự
#   kiểm `trong_phien()` (9:00-15:05) và thoát. Chặn hai lần cùng một chuyện là thừa, mà
#   cái giá phải trả lại là mất cả ngày.
# -RestartCount: lượt hỏng vì mạng chớp thì thử lại sau 3 phút, khỏi đợi hết nhịp 5 phút.
# -AllowStartIfOnBatteries + -DontStopIfGoingOnBatteries: máy ảo không có pin, nhưng mặc
#   định của Task Scheduler là TỪ CHỐI chạy khi hệ báo dùng pin — một trong những kiểu
#   không-chạy-mà-không-báo-lỗi hay gặp nhất trên máy ảo.
$s = New-ScheduledTaskSettingsSet -StartWhenAvailable `
     -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
     -MultipleInstances IgnoreNew `
     -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 3) `
     -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
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
