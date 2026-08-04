# Máy chủ cào dữ liệu

**Đường chính** dựng kho EOD cho CPVN.IO. GitHub Actions (`.github/workflows/daily.yml`)
chỉ là lưới an toàn: nó tự thoát khi thấy `data/health.json` đã có phiên gần nhất.

| | |
|---|---|
| Máy | VPS Windows `ASTERBOX` · `103.165.144.161` · **hạn dùng ~12/2026** |
| Thư mục | `C:\cpvn` (clone của kho này) |
| Lịch | Scheduled Task `CPVN EOD refresh` — 15:15 T2–T6, chạy dưới SYSTEM |
| Chạy gì | `run_refresh.ps1` → `refresh_daily.py` (thứ Hai thêm `--full`) → commit → push |
| Log | `C:\cpvn\refresh_log.txt` (tự xoá khi quá 2MB) |
| Cờ báo hỏng | `C:\cpvn\PUSH_FAILED.txt` — có file này = kho đã cào xong nhưng **kẹt lại trong máy** |

Tác vụ chạy thẳng `C:\cpvn\server\run_refresh.ps1` — tức **chính file trong kho này**.
Sửa ở đây, `git push`, lượt chạy kế tiếp tự lấy bản mới về (script `git pull` ở đầu).
Không phải chép tay lên máy chủ. Đừng sửa thẳng trên VPS — trước đây cấu hình chỉ nằm
trên máy đó nên không ai xem lại được, và đó là lý do sự cố dưới đây âm thầm cả buổi.

## Hết hạn VPS thì làm gì

Chép thư mục `server/` sang máy mới, cài Git + Python 3.12 + Pillow, clone kho về `C:\cpvn`,
đặt deploy key **có quyền ghi**, rồi chạy `setup_task.ps1` một lần. Không có gì khác cần mang theo —
toàn bộ dữ liệu nằm trong kho.

## Sự cố 04/08/2026 — đọc trước khi sửa script

Tác vụ chạy **đúng giờ**, `Last Result: 0`, cào xong đủ 1522 mã, commit tại chỗ —
**nhưng `git push` bị từ chối** vì trong lúc pipeline chạy (~8 phút) có người đẩy commit khác lên.
Bản cũ chỉ `git pull --rebase` ở **đầu** script, tới lúc đẩy thì remote đã vượt lên trước.
Cả phiên nằm lại trong máy suốt buổi tối mà không ai biết, vì:

- `Last Result: 0` chỉ nói PowerShell thoát sạch, **không** nói đã đẩy được;
- không có cờ báo lỗi nào ở ngoài;
- Actions dự phòng thì lại bỏ qua vì tưởng đã có phiên hôm đó.

Đã sửa: **kéo lại ngay trước khi đẩy**, thử lại 5 lần cách nhau 20 giây, và thất bại thì ghi
`PUSH_FAILED.txt`. Tên commit cũng lấy theo **ngày phiên trong kho** thay vì ngày chạy máy.
