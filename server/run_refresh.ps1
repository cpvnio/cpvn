# CPVN — cào EOD rồi đẩy kho lên GitHub.
# Scheduled Task gọi lúc 15:15 T2–T6, chạy dưới quyền SYSTEM.
#
# BÀI HỌC 04/08/2026 — vì sao bản cũ hỏng:
#   Bản cũ `git pull --rebase` ở ĐẦU rồi `git push` ở CUỐI, mà pipeline chạy mất ~8 phút.
#   Ai đó đẩy commit lên trong 8 phút đó là push bị từ chối "fetch first", cả phiên vừa cào
#   nằm lại trong máy, KHÔNG có gì báo — tác vụ vẫn báo Last Result = 0 vì PowerShell thoát 0.
#   Nay: kéo lại NGAY TRƯỚC khi đẩy, thử lại vài lần, và thất bại thì kêu to.

$ErrorActionPreference = 'Continue'
$log = 'C:\cpvn\refresh_log.txt'
if ((Test-Path $log) -and ((Get-Item $log).Length -gt 2MB)) { Remove-Item $log -Force }
Start-Transcript -Path $log -Append | Out-Null
Set-Location 'C:\cpvn'

$env:PYTHONIOENCODING = 'utf-8'   # console Windows mặc định không in được tiếng Việt
$env:GIT_SSH_COMMAND  = 'ssh -i C:/Users/Administrator/.ssh/github_deploy -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=C:/cpvn/.known_hosts'
$git = 'C:\Program Files\Git\cmd\git.exe'
$py  = 'C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe'

& $git pull --rebase origin main 2>&1

if ((Get-Date).DayOfWeek -eq 'Monday') { & $py refresh_daily.py --full 2>&1 }
else                                   { & $py refresh_daily.py 2>&1 }

# Tên commit theo NGÀY PHIÊN trong kho vừa dựng, không theo ngày chạy máy: lượt nào
# vắt qua nửa đêm mà lấy ngày máy sẽ đặt tên phiên hôm sau cho dữ liệu hôm trước.
$sess = & $py -c "import json;print(json.load(open('data/health.json'))['date'])" 2>$null
if (-not $sess) { $sess = Get-Date -Format 'yyyy-MM-dd' }

& $git add universe.json data/ assets/logo/ 2>&1
& $git commit -m ("EOD $sess (server)") 2>&1

# ĐẨY CÓ THỬ LẠI: mỗi vòng kéo lại rồi mới đẩy, vì remote có thể vừa nhích lên.
$pushed = $false
for ($i = 1; $i -le 5; $i++) {
  & $git pull --rebase origin main 2>&1
  & $git push origin main 2>&1
  if ($LASTEXITCODE -eq 0) { $pushed = $true; Write-Output "ĐẨY XONG (vòng $i)"; break }
  Write-Output "Đẩy hỏng ở vòng $i, chờ 20 giây rồi thử lại..."
  Start-Sleep -Seconds 20
}

if (-not $pushed) {
  # Kêu to: ghi cờ ra file riêng để lượt sau và người kiểm biết ngay là kho đang kẹt lại
  $msg = "ĐẨY THẤT BẠI sau 5 lần — phiên $sess đã cào xong nhưng CÒN KẸT trong máy này. " +
         "Chạy tay: cd C:\cpvn; git pull --rebase origin main; git push origin main"
  Write-Output $msg
  Set-Content -Path 'C:\cpvn\PUSH_FAILED.txt' -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm')  $msg"
} elseif (Test-Path 'C:\cpvn\PUSH_FAILED.txt') {
  Remove-Item 'C:\cpvn\PUSH_FAILED.txt' -Force    # đã thông, xoá cờ cũ
}

Stop-Transcript | Out-Null
