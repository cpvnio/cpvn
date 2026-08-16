# Một lượt lấy giá trong phiên. Tác vụ 'CPVN gia phien' gọi file này mỗi 15 phút.
# File nằm TRONG kho nên bước đồng bộ dưới đây tự mang bản mới về — sửa ở repo là lượt
# sau máy chủ tự dùng bản mới, không phải chép tay lên máy chủ.

$ErrorActionPreference = 'Continue'
Set-Location 'C:\cpvn'
$git = 'C:\Program Files\Git\cmd\git.exe'
$log = 'C:\cpvn\server\gia_phien.log'

# BẮT BUỘC — sao y run_refresh.ps1. Tác vụ chạy dưới SYSTEM, mà SYSTEM không có
# ~/.ssh/config, không có known_hosts của github.com, và khoá deploy lại mang tên KHÔNG
# mặc định nên ssh không tự nhặt. Thiếu dòng này là mọi lượt git chết ở
# "Host key verification failed" — đã dính đúng vậy lượt chạy thử đầu tiên.
$env:GIT_SSH_COMMAND = 'ssh -i C:/Users/Administrator/.ssh/github_deploy -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=C:/cpvn/.known_hosts'

# Giữ log gọn: quá 2 MB thì cắt còn 500 dòng cuối. 25 lượt/ngày × nhiều tháng thì file
# log tự phình ra hàng trăm MB nếu không dọn.
if ((Test-Path $log) -and ((Get-Item $log).Length -gt 2MB)) {
  Get-Content $log -Tail 500 | Set-Content "$log.tmp"; Move-Item "$log.tmp" $log -Force
}
"--- $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ---" | Add-Content $log

# TỰ GỠ KẸT trước khi làm gì — cùng bài học với run_refresh: một cuộc rebase dở dang từ
# lượt trước làm máy KẸT VĨNH VIỄN, mà ở nhịp 15 phút thì nó kẹt cả phiên chứ không phải
# một ngày. Máy chủ chỉ là bản sao, data/ dựng lại được, nên cứ bám thẳng theo remote.
if ((Test-Path '.git\rebase-merge') -or (Test-Path '.git\rebase-apply')) {
  'Rebase do dang tu luot truoc - huy va bam lai theo remote.' | Add-Content $log
  & $git rebase --abort 2>&1 | Add-Content $log
}
& $git fetch origin main 2>&1 | Add-Content $log
& $git reset --hard origin/main 2>&1 | Add-Content $log

python 'C:\cpvn\tools\gia_phien.py' 2>&1 | Add-Content $log
$ma = $LASTEXITCODE
if ($ma -ne 0) { "EXIT $ma" | Add-Content $log }
exit $ma
