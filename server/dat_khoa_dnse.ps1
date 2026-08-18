# Nạp khoá DNSE LightSpeed API vào biến môi trường cấp máy trên ASTERBOX.
#
# VÌ SAO CÓ FILE NÀY: khoá không được đi qua chat, không được nằm trong repo, và không
# được gõ thành tham số dòng lệnh. Cách gõ tay `setx /M DNSE_API_SECRET <chuoi>` để lộ
# chuỗi trong argv của tiến trình — bất kỳ thứ gì đang liệt kê tiến trình lúc đó đều đọc
# được, và nó còn nằm lại trong lịch sử lệnh PowerShell. File này hỏi kín rồi ghi thẳng
# qua .NET nên không sinh tiến trình con nào mang chuỗi thật.
#
# CÁCH DÙNG — mở PowerShell BẰNG QUYỀN ADMIN rồi chạy:
#     powershell -ExecutionPolicy Bypass -File C:\cpvn\server\dat_khoa_dnse.ps1
# Dán khi được hỏi. Màn hình không hiện gì khi dán là đúng, không phải treo.

$ErrorActionPreference = 'Stop'

# Phạm vi 'Machine' bắt buộc quyền quản trị. Kiểm trước cho tường minh, vì nếu không thì
# lệnh ghi ở dưới ném UnauthorizedAccessException khá tối nghĩa.
$toi = [Security.Principal.WindowsIdentity]::GetCurrent()
$vaiTro = New-Object Security.Principal.WindowsPrincipal($toi)
$dangLaAdmin = $vaiTro.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $dangLaAdmin) {
  Write-Host 'CAN QUYEN ADMIN. Mo lai PowerShell bang "Run as administrator" roi chay lai.' -ForegroundColor Red
  exit 1
}

function Doc-Kin([string]$nhan) {
  $ss = Read-Host $nhan -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
  try   { return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

Write-Host ''
Write-Host 'Dan API key va API secret cua DNSE LightSpeed API.' -ForegroundColor Cyan
Write-Host 'Man hinh KHONG hien ky tu nao khi dan - do la co y.' -ForegroundColor DarkGray
Write-Host ''

$key    = Doc-Kin 'API key   '
$secret = Doc-Kin 'API secret'

if ([string]::IsNullOrWhiteSpace($key) -or [string]::IsNullOrWhiteSpace($secret)) {
  Write-Host 'Bo trong - khong ghi gi ca.' -ForegroundColor Red
  exit 2
}

# Ghi thang qua .NET thay vi goi setx.exe: setx nhan gia tri qua dong lenh (lo trong argv)
# va con cat cut o 1024 ky tu. SetEnvironmentVariable khong dinh ca hai.
[Environment]::SetEnvironmentVariable('DNSE_API_KEY',    $key,    'Machine')
[Environment]::SetEnvironmentVariable('DNSE_API_SECRET', $secret, 'Machine')

$key = $null; $secret = $null
[GC]::Collect()

# Doc lai de xac nhan da vao that. CHI in do dai va 4 ky tu dau - du de biet dung bo khoa,
# khong du de lo. Tuyet doi khong in chuoi day ra man hinh hay ra log.
$k = [Environment]::GetEnvironmentVariable('DNSE_API_KEY',    'Machine')
$s = [Environment]::GetEnvironmentVariable('DNSE_API_SECRET', 'Machine')

Write-Host ''
Write-Host ('DNSE_API_KEY    : {0} ky tu, bat dau "{1}..."' -f $k.Length, $k.Substring(0,[Math]::Min(4,$k.Length))) -ForegroundColor Green
Write-Host ('DNSE_API_SECRET : {0} ky tu, bat dau "{1}..."' -f $s.Length, $s.Substring(0,[Math]::Min(4,$s.Length))) -ForegroundColor Green
Write-Host ''
Write-Host 'Xong. Tien trinh dang chay se KHONG thay bien moi - phai khoi dong lai.' -ForegroundColor Yellow
Write-Host 'Tac vu Task Scheduler thi khong can lam gi: moi luot no sinh tien trinh moi.' -ForegroundColor DarkGray
