# CPVN.IO — Luồng dữ liệu giá (bản 17/08/2026)

> Bản trước tài liệu này mô tả kiến trúc **client tự gọi VPS**. Kiến trúc đó đã bỏ ngày
> 17/08/2026. Mọi con số dưới đây đo trên bản đang chạy.

---

## A. Ai gọi ai

```
ASTERBOX ──> VPS           bảng giá: 2 lô/5 phút · 11 lô/15 phút · EOD 15:15
         └─> ghi data/board*.json ──git──> Cloudflare ──> trình duyệt

trình duyệt ──> cpvn.io      giá, chỉ số, tin, kho nến, hồ sơ
            ──> VNDirect     CHỈ nến vẽ chart
            ──> CNBC         CHỈ bản đồ thế giới
            ──> VPS          0 lượt
```

**Vì sao đổi.** Trang tĩnh nên trước đây mỗi trình duyệt tự quét bảng giá VPS: 11 lượt,
1,48 MB một lượt quét đủ, lặp mỗi 5 phút cho **mỗi tab**. Đo được:

| | lượt gọi VPS | dung lượng |
|---|---|---|
| 1 tab mở 1 giờ trong phiên | 180 | 24 MB |
| 100 người xem cùng lúc, 6h | 108.000 | 14,5 GB |
| 1000 người xem cùng lúc, 6h | 1,08 triệu | 145 GB |
| **nay — mọi quy mô** | **~360/phiên** | **hằng số** |

Tải lên VPS từng **tỉ lệ thuận với lượng truy cập** — tự lớn theo thành công của trang,
không cần ai tấn công. Và mọi lượt gọi mang sẵn `Origin: https://cpvn.io`, nên log bên kia
trỏ thẳng về CPVN.

---

## B. Máy cào — hai tầng theo thanh khoản

| tầng | mã | lô | nhịp | file |
|---|---|---|---|---|
| thanh khoản | 282 (GTGD ≥ 1 tỷ) | 2 | **5 phút** | `data/board_nong.json` |
| cả thị trường | 1.527 | 11 | **15 phút** | `data/board.json` |
| chốt sổ | 1.527 + hồ sơ + BCTC | — | **15:15** | pipeline EOD |

282 mã đó chiếm **99,5% thanh khoản toàn thị trường** — nên làm mới nhanh nhóm ấy là gần
như làm mới nhanh mọi thứ người ta thật sự nhìn, với 2 lượt gọi thay vì 11.

Client đọc **cả hai** rồi nối bản nhanh vào **sau**: `doPoll` duyệt rows theo thứ tự và gán
đè, nên bản nhanh tự thắng, không phải trộn tay.

**File ghi NGUYÊN VĂN mảng VPS trả về.** Client vẫn chạy đúng `doPoll` sẵn có — quy đổi
×1000/×10, cờ `nt`, lưới chặn biên độ, nhận diện bảng đêm rỗng. Phân tích lại ở phía máy
cào là đẻ ra bản sao thứ tư của chỗ khó nhất dự án.

### Ngày nghỉ lễ

Hỏi tới **9:30**; vẫn chưa mã nào khớp lệnh thì đóng dấu `server/.nghi_le` và **im tới hết
ngày** — các lượt sau thoát *trước khi gọi mạng*. Trước đây ngày lễ vẫn chạy đủ 73 lượt,
tốn ~410 lượt gọi cho đúng 0 thông tin.

> Chỉ đóng dấu khi **nhận được bảng hợp lệ mà bảng trống**. Lượt gọi hỏng (rows rỗng) không
> bao giờ tới nhánh đó — nhầm sự cố mạng thành ngày nghỉ là tắt giá suốt một phiên thật.

### Bỏ commit khi không có gì đổi

Ghi file chỉ khi **ruột** đổi, không tính trường `at`. Nghỉ trưa 11:30–13:00 bảng đứng yên
→ không commit → không tốn build Cloudflare.

---

## C. Giá sống trong trình duyệt

Lúc mở trang: nạp kho → đè đệm `localStorage['cpvn_live']` (nếu cùng phiên) → **đọc
`data/board.json` + `data/board_nong.json`** → vẽ. F5 giữa phiên mà đệm dưới 2 phút thì vẽ
ngay từ đệm, không chờ mạng.

Sau đó một đồng hồ chạy mỗi 5 giây:

| khung giờ | hành vi |
|---|---|
| 9:00–15:00 T2–T6 | đọc lại file mỗi **5 phút**; giữa hai lượt đó mỗi **1 phút** |
| 15:00–15:05 | mỗi **60 giây** — cố ý chưa coi là xong vì còn ATC/thoả thuận |
| sau 15:05 · tối · T7/CN | **0 lượt**. `pricesFinal()` bật khi đã chốt cứng |
| ngày nghỉ lễ | `boardIdle` → giãn ra 5 phút |
| **tab ẩn** | **0 lượt, kể cả lượt quét mở màn** — chặn ngay trong `pollBoard` |

> Chặn tab ẩn là chặn ở `pollBoard`, không phải chỉ ở vòng lặp. Lượt quét **mở màn** mới là
> lượt nặng nhất, mà trước đây nó chạy vô điều kiện — nên mỗi lượt mở trang ngầm, prerender,
> hay máy cào headless đều đẩy một lượt sang nguồn. Mở ở tab nền thì **hoãn**, không bỏ:
> `visibilitychange` trả nợ bằng một lượt quét **đủ** ngay khi tab được xem.

### Nhãn "giá lúc HH:MM"

`CP.nhanGia()` in thẳng mốc `at` của file. Quá **45 phút** trong phiên thì tô đỏ kèm "đã N
phút". Ngoài phiên không bao giờ báo cũ.

Đây là chỗ **duy nhất** lộ ra khi cả hai máy cào cùng chết — không có nó thì trang vẫn hiện
giá bình thường, chỉ là số của mấy tiếng trước.

---

## D. Ba nhịp chạy riêng, không ăn theo phiên VN

| mục | nhịp | nguồn |
|---|---|---|
| **Bản đồ thế giới** (Radar) | hỏi mỗi 20 giây, **chỉ gọi mạng khi số cũ quá 30 phút** | CNBC |
| **Chỉ số** VN-Index/VN30/HNX/UPCOM | 60 giây (bảng giá) · 30 giây (bong bóng) | **trường `idx` trong file kho** |
| **Tin tức** trang cổ phiếu | 5 phút, chỉ khi thẻ Tin đang mở | **kho trước**, VNDirect chỉ khi kho thiếu mã |

Bản đồ phải tách nhịp vì Mỹ mở lúc 20:30 giờ VN, châu Âu chạy tới nửa đêm — ăn theo nhịp
trong nước thì mở lúc 9 giờ tối xem Mỹ là số đứng im.

> Nhịp bản đồ đổi **2 → 30 phút** (17/08). Đây là lượt gọi duy nhất còn tỉ lệ thuận với
> **thời gian mở tab** chứ không theo số trang mở. Đo ở quy mô 1.000 người mở radar 2 tiếng:
> nhịp 2 phút cho 60.000 lượt · 2 GB sang CNBC — vượt cả VNDirect.

---

## E. Nến vẽ chart — mượn thẳng của nguồn

**VNDirect → VPS → kho** (kho chỉ là cứu hộ cuối).

Không lấy kho làm nguồn chính vì **CPVN không có cơ chế tự hạ nền**: trang ăn theo nền mà
nguồn đã hạ sẵn, còn kho chỉ mang nền của lúc nó được cào. Từ mở cửa ngày GDKHQ tới lượt cào
kế tiếp, kho ở nền **cũ** trong khi giá sống đã sang nền **mới**.

> Đo 17/08: SSI chốt quyền cổ tức tiền 1.000đ + cổ phiếu thưởng 100:20 → nền mới
> `(24.500 − 1.000) ÷ 1,2 = 19.583đ`, đúng bằng số VNDirect trả, kho vẫn ghi 24.500.

**Xin 5 năm mặc định, 15 năm chỉ khi bấm Tháng/Năm.** Cùng endpoint, chỉ đổi `from`:

| xin | nến | dung lượng |
|---|---|---|
| 15 năm | 3.395 | 166 KB |
| 5 năm | 1.245 | **58 KB** |

Đệm theo khoá `sym|năm`, không theo mã — dùng chung khoá thì lượt xin 15 năm sau khi đã xin
5 năm nhận lại chuỗi cũ, bấm "Năm" xong chart vẫn cụt.

---

## F. Lưới an toàn

**Máy chính** ASTERBOX (Task Scheduler, đáng tin) — **dự phòng** GitHub Actions.

Actions đọc `at` trong `board.json`: máy chính vừa ghi trong **40 phút** thì thoát ngay,
không cào, không push.

> **Lịch Actions không phải "giờ hẹn" mà là "sớm nhất có thể".** Đo 27 lượt trên chính kho
> này: trễ ít nhất 7 phút, **trung vị 150**, nhiều nhất 287 — không lượt nào đúng giờ. Nên
> rải **11 mốc** từ 22:00 UTC hôm trước tới 8:00 UTC; mô phỏng với mọi độ trễ đã đo thì luôn
> còn 6–7 mốc rơi trong phiên.

Actions **chưa từng đẩy commit nào** — luôn thoát sớm vì ASTERBOX đã làm xong.

---

## G. Chi phí

| | |
|---|---|
| Cloudflare | gói **Free** · 205/3.000 phút build (1–17/08) |
| dự phóng nhịp 5 phút | ~1.584 build/tháng ≈ **31–63%** hạn mức |
| git | +~1,9 GB/năm từ commit giá |
| kho hiện tại | 363 MB `.git` · 607 MB tổng · 10.502 file |

> **Kho nặng làm mọi lượt deploy chậm.** `wrangler deploy` với `assets.directory="."` phải
> băm **từng file** mỗi lượt build để biết cái nào đổi — chi phí tỉ lệ với **tổng số file**,
> không phải với số file vừa sửa. Sửa một dòng `core.js` vẫn phải băm đủ 10.502 file.
>
> **ĐỪNG chữa bằng `.assetsignore`.** Đã thử 17/08 và nó làm **`_redirects` biến mất** →
> `/cophieu/VIC`, `/radar`, `/tapdoan`, `/duongdua` đều 404, dù không mẫu loại trừ nào khớp
> `_redirects`. Đã gỡ, khôi phục sau ~4 phút. Muốn thử lại thì phải bật
> `Builds for non-production branches` để test trên nhánh trước.
