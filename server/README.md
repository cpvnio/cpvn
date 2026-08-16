# Máy chủ cào dữ liệu — `ASTERBOX`

> ⚠️ **Máy này là VPS theo nghĩa MÁY ẢO THUÊ, không liên quan gì tới Công ty Chứng khoán
> VPS (`vps.com.vn`)** — bên đó là NGUỒN dữ liệu bảng giá mà máy này gọi tới. Trùng chữ
> viết tắt thôi. Trong tài liệu dự án, "VPS" trần luôn có nghĩa là công ty chứng khoán;
> máy cào thì gọi tên riêng `ASTERBOX`.

**Đường chính** dựng kho EOD cho CPVN.IO. GitHub Actions (`.github/workflows/daily.yml`)
chỉ là lưới an toàn: nó tự thoát khi thấy `data/health.json` đã có phiên gần nhất.

| | |
|---|---|
| Máy | máy ảo Windows `ASTERBOX` · `103.165.144.161` · **hạn dùng ~12/2026** |
| Thư mục | `C:\cpvn` (clone của kho này) |
| Lịch | Scheduled Task `CPVN EOD refresh` — 15:15 T2–T6, chạy dưới SYSTEM |
| Chạy gì | `run_refresh.ps1` → `refresh_daily.py` (thứ Hai thêm `--full`) → commit → push |
| Log | `C:\cpvn\refresh_log.txt` (tự xoá khi quá 2MB) |
| Cờ báo hỏng | `C:\cpvn\PUSH_FAILED.txt` — có file này = kho đã cào xong nhưng **kẹt lại trong máy** |

Tác vụ chạy thẳng `C:\cpvn\server\run_refresh.ps1` — tức **chính file trong kho này**.
Sửa ở đây, `git push`, lượt chạy kế tiếp tự lấy bản mới về (script `git pull` ở đầu).
Không phải chép tay lên máy chủ. Đừng sửa thẳng trên `ASTERBOX` — trước đây cấu hình chỉ nằm
trên máy đó nên không ai xem lại được, và đó là lý do sự cố dưới đây âm thầm cả buổi.

## Hết hạn máy `ASTERBOX` thì làm gì

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

## Sự cố 06/08/2026 — bản vá trên lại hỏng theo kiểu khác

`git pull --rebase` ngay trước khi đẩy **vấp xung đột**: phiên vừa cào ghi đè đúng những file
`data/fin/*.json` mà commit trên remote cũng vừa sửa. Rebase **dừng giữa chừng**, cả 5 vòng đẩy
đều hỏng. Từ đó máy **kẹt vĩnh viễn**: lượt hôm sau `git pull --rebase` gặp repo đang dở rebase
là hỏng ngay dòng đầu, chưa kịp cào gì. Web đứng im ở phiên 05/08 mà không ai biết — Actions dự
phòng hôm đó cũng huỷ ở phút thứ 15 nên không ai gánh.

Đã sửa, hai lớp:

1. **Máy chủ nay là BẢN SAO thuần**: mỗi lượt huỷ rebase dở dang (nếu có) rồi `git fetch` +
   `git reset --hard origin/main` TRƯỚC khi cào. Dữ liệu trong `data/` vốn dựng lại được nên
   reset không mất gì, đổi lại là không thể kẹt qua đêm.
2. **Rebase để đẩy dùng `-X theirs`** — đụng nhau thì lấy bản vừa cào; vòng nào vẫn kẹt thì
   `rebase --abort` ngay để lượt sau còn chạy được.

> **Encoding**: `run_refresh.ps1` phải là **UTF-8 CÓ BOM**, và mọi chuỗi chạy được chỉ dùng
> ASCII. Windows PowerShell 5.1 đọc `.ps1` không BOM theo bảng mã ANSI — hôm 06/08 nó văng
> `'elseif' is not recognized` và ghi ra `PUSH_FAILED.txt` **rỗng tuếch**, mất luôn câu báo lỗi.
> Tiếng Việt trong **chú thích** thì vô hại.

### Gỡ kẹt bằng tay (khi `PUSH_FAILED.txt` đã có sẵn từ trước bản vá)

```powershell
cd C:\cpvn
& "C:\Program Files\Git\cmd\git.exe" rebase --abort
& "C:\Program Files\Git\cmd\git.exe" fetch origin main
& "C:\Program Files\Git\cmd\git.exe" reset --hard origin/main
```
