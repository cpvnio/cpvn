# Một lượt lấy giá trong phiên. Tác vụ 'CPVN gia phien' gọi file này mỗi 15 phút.
# File nằm TRONG kho nên `git pull` ở dòng dưới tự mang bản mới về — sửa ở repo là lượt
# sau máy chủ tự dùng bản mới, không phải chép tay lên máy chủ.

$ErrorActionPreference = 'Continue'
Set-Location 'C:\cpvn'
$git = 'C:\Program Files\Git\cmd\git.exe'
$log = 'C:\cpvn\server\gia_phien.log'

# Giữ log gọn: quá 2 MB thì cắt còn 500 dòng cuối. Chạy 25 lượt/ngày × nhiều tháng thì
# file log tự phình ra hàng trăm MB nếu không dọn.
if ((Test-Path $log) -and ((Get-Item $log).Length -gt 2MB)) {
  Get-Content $log -Tail 500 | Set-Content "$log.tmp"; Move-Item "$log.tmp" $log -Force
}

"--- $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ---" | Add-Content $log

# Kéo trước rồi mới chạy: tác vụ EOD hoặc mình sửa từ máy khác đều có thể vừa đẩy commit.
& $git pull --rebase -q origin main 2>&1 | Add-Content $log

python 'C:\cpvn\tools\gia_phien.py' 2>&1 | Add-Content $log
$ma = $LASTEXITCODE

if ($ma -ne 0) { "EXIT $ma" | Add-Content $log }
exit $ma
