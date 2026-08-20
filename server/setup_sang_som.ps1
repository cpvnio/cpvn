# Dựng tác vụ TRƯỚC PHIÊN — chạy MỘT LẦN, dưới quyền Administrator, trên ASTERBOX.
# Chạy SAU khi `setup_task.ps1` đã dựng xong (file này dùng lại git config + deploy key mà
# script kia đã đặt; chạy riêng nó trên máy trắng sẽ không push được).
#
# VIỆC NÓ LÀM: 7:30 mỗi ngày trong tuần, làm mới SỐ CỔ PHIẾU LƯU HÀNH + vốn hoá từ Simplize
# rồi commit `universe.json`. Một lượt ~5 phút, ~1.500 lượt gọi tới Simplize.
#
# VÌ SAO CẦN, TRONG KHI ĐÃ CÓ LƯỢT EOD 15:15:
# Ngày GDKHQ, nguồn hạ nền GIÁ ngay từ lúc mở cửa nhưng SỐ CỔ PHIẾU thì vài ngày sau mới
# cập nhật. Trang tính vốn hoá = SLCP × giá sống, nên trong khoảng đó vốn hoá tụt đúng bằng
# tỉ lệ chia — và tụt IM LẶNG, không có gì báo. Đo 19/08/2026: SSI −15,4%, CTI −7,8%,
# BID −6,7%; user phát hiện chứ không phải phép kiểm nào. Lượt EOD sửa được nhưng phải tới
# CHIỀU, tức cả phiên sáng người xem đọc số sai. Vốn hoá ăn vào bảng giá, bong bóng, bản đồ
# nhiệt và đường đua — nên đây là sai lan rộng chứ không phải một ô.
#
# 7:30 chọn có lý do: sớm hơn giờ mở cửa 90 phút, đủ cho lượt chạy (~5 phút) + git push +
# build Cloudflare (~1 phút) và vẫn còn dư nếu nguồn chậm. Đừng đẩy sát 8:45.
#
# LƯỢT NÀY LÀM BỐN VIỆC (20/08/2026): sang_som.py (SLCP + vốn hoá) · kho_sukien.py (cổ tức,
# thưởng, quyền mua, ngày ra BCTC) · kho_niemyet.py (ngày lên sàn + lịch mã sắp lên sàn) ·
# kho_chaosan.py (giá chào sàn, CHẠY TĂNG DẦN — ngày thường 0 mã).
# Tổng ~12 phút, xong lúc ~7:42, còn dư hơn một giờ trước giờ mở cửa. Ba việc sau đều
# KHÔNG chặn lượt chạy nếu hỏng — universe.json mới là thứ bắt buộc phải lên.
# Vì thế -ExecutionTimeLimit nâng 30 -> 45 phút.
#
# CHI PHÍ: tối đa 1 commit/ngày -> ~22 build/tháng. Script tự BỎ QUA commit khi
# `universe.json` không đổi, mà ngày thường thì SLCP gần như không đổi — nên số thật thấp
# hơn nhiều. Đo 19/08: 7/1.529 mã đổi, và đó là ngày ngay sau một loạt chốt quyền.

Set-Location 'C:\cpvn'

$a = New-ScheduledTaskAction -Execute 'powershell.exe' `
     -Argument '-NoProfile -ExecutionPolicy Bypass -File C:\cpvn\server\run_sang_som.ps1'

$t = New-ScheduledTaskTrigger -Weekly `
     -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At '07:30'

# -StartWhenAvailable BẮT BUỘC — cùng bài học với setup_gia_phien: máy tắt/khởi động lại
# đúng 7:30 thì trigger trượt hẳn và cả ngày không chạy, im lặng. Chạy bù muộn cũng vô hại
# ở đây: script chỉ làm mới SLCP, chạy lúc nào cũng cho cùng kết quả.
$s = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
     -DontStopIfGoingOnBatteries -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 5) `
     -ExecutionTimeLimit (New-TimeSpan -Minutes 45)

Register-ScheduledTask -TaskName 'CPVN truoc phien' -Action $a -Trigger $t -Settings $s `
  -User 'SYSTEM' -RunLevel Highest -Force

Write-Host ''
Write-Host 'Da dung tac vu "CPVN truoc phien" - 7:30 thu Hai den thu Sau.'
Write-Host 'Kiem: Get-ScheduledTask -TaskName "CPVN truoc phien" | Get-ScheduledTaskInfo'
Write-Host 'Chay thu ngay: Start-ScheduledTask -TaskName "CPVN truoc phien"'
Write-Host 'Log: C:\cpvn\server\sang_som.log'
Write-Host ''
Write-Host 'LUU Y: "Last Result: 0" KHONG co nghia la da day len GitHub duoc.'
Write-Host '       Khi nghi ngo, xem C:\cpvn\PUSH_FAILED.txt va log o tren.'
