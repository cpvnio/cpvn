# CPVN.IO — bản đồ kiến trúc

Web chứng khoán Việt Nam. **Tĩnh hoàn toàn**: HTML + JS thuần chạy trong trình duyệt, Cloudflare
Workers phục vụ nguyên repo như static assets, **không có backend, không framework, không build**.
Sửa file là xong, `git push` là lên.

**Repo CHÍNH LÀ cơ sở dữ liệu.** `refresh_daily.py` chạy sau 15h mỗi phiên, cào API rồi ghi
JSON thẳng vào `data/` và commit. Client ưu tiên API sống, hỏng thì rơi về kho này —
thêm `?offline` vào URL để ép chạy 100% từ kho.

```
refresh_daily.py (VPS 15:15 · Actions dự phòng)
        └── ghi ──> universe.json + data/**  ──commit──> GitHub ──> Cloudflare
                                                                        │
   trình duyệt ──fetch kho──┬── index.html    (bảng giá — TRANG CHỦ)   ─┘
                            ├── cophieu.html  (/cophieu/MÃ)
                            ├── bubbles.html  (/bubbles — ĐỘC LẬP, tự chứa lõi giá)
                            └── congcu.html   (/radar, /duongdua)
                    └──API sống──> VPS bgapidatafeed (giá) · Simplize · 24hMoney · VNDirect
```

## Bản đồ tệp

| Tệp | Dòng | Vai trò |
|---|---|---|
| `index.html` | 925 | **Trang chủ** — bảng giá 13 cột, 100 mã/trang, cột ngành trái, bộ lọc pro |
| `cophieu.html` | 1169 | Trang một mã: hero giá · thống kê · nến · PTKT toàn màn hình · 5 thẻ nội dung |
| `bubbles.html` | 2185 | Bong bóng (canvas vật lý) + bản đồ nhiệt (treemap DOM). **Tự chứa bản sao lõi giá** |
| `congcu.html` + `assets/congcu.js` | 384+676 | 2 module: Radar phiên (18 thẻ) · Đường đua vốn hoá (78 tháng) |
| `assets/core.js` | 522 | **Lõi dữ liệu `CP`** — chỉ index + cophieu dùng. Phần lớn là cơ chế giá |
| `assets/chart.js` | 798 | **`CPChart`** — bộ vẽ nến canvas tự viết + lớp vẽ PTKT. Không phụ thuộc core.js |
| `assets/screener.js` | 189 | `CPScreen` — bộ lọc, nạp lười `screen.json`+`fund.json` khi mở panel |
| `refresh_daily.py` | 715 | Toàn bộ "backend": 11 bước cào → ghi kho |
| `tools/build_screen.py` | 624 | Sinh `screen.json`/`fund.json`/`market.json`. refresh_daily gọi ở bước 10 |

## Kho dữ liệu `data/` (~130MB)

| Đường dẫn | Nội dung |
|---|---|
| `universe.json` | 1522 mã: tên, sàn, ngành, SLCP, mcap, PE/PB, eps, cash, np, mốc %, vn30/hnx30 |
| `data/eod/latest.json` | **File client luôn tải** (~100KB): giá đóng cửa phiên gần nhất + 4 chỉ số |
| `data/hist/{MÃ}.json` | Nến ngày từ 2020: 8 mảng `t,o,h,l,c,v,fb,fs` cùng độ dài, cũ→mới |
| `data/fin/{MÃ}.json` | KQKD/CĐKT/LCTT theo năm+quý, cổ tức |
| `data/news/` `data/profile/` | Tin + báo cáo CTCK · hồ sơ DN, cổ đông, công ty con |
| `data/screen.json` `fund.json` | Dạng CỘT: `f`=tên trường, `d[MÃ]`=mảng giá trị cùng thứ tự |
| `data/market.json` | `breadth` 250 phiên · `global` (CNN F&G) · `race` (đường đua) |
| `data/health.json` | `date` = **ngày phiên** — khoá điều phối giữa VPS và Actions |

## Cơ chế giá — phần tinh vi nhất, đọc kỹ trước khi sửa

Ba tầng, ưu tiên tăng dần: **kho EOD** → **đệm `localStorage['cpvn_live']`** → **poll VPS**.

Trình tự mở trang: nạp kho → `applyLive()` (đệm đè nếu `sess > eodDate`) →
`warmPrices()` (chỉ mã sắp vẽ, ~30ms) → **vẽ** → 300ms sau quét đủ 1522 mã (11 lô **song song**).

### Khung thời gian (giờ VN, T2–T6)

| Khung | Nhịp gọi mạng | Đệm |
|---|---|---|
| 9:00–15:00 trong phiên | 1 phút mã đang xem · 5 phút quét đủ | ghi mọi lượt, `final=false` |
| 15:00–15:05 đang chốt | 60s/lần — **cố ý chưa coi là xong** (ATC/thoả thuận) | chưa đóng dấu cứng |
| sau 15:05 · tối · T7/CN | **0 lượt** khi đã chốt cứng | `final=true`, lấy thẳng ra dùng |

### Kiểm thử — chạy TRƯỚC MỖI LẦN đẩy nếu có đụng vào giá

```
node tools/test_gia.js
```

38 phép kiểm nạp thẳng `assets/core.js` vào đồng hồ giả + localStorage giả: lịch phiên ở mọi
mốc chuyển, luật chốt cứng, luật đệm thắng/thua kho, F5 giữa phiên không được chờ mạng, hợp
đồng 10 phần tử của `cpvn_live`, chế độ `?offline`. Hỏng một phép là có người dùng sẽ thấy
giá sai hoặc giá nhảy — đừng đẩy.

### Luật bất di bất dịch

- **`CP.liveSess` chỉ được đóng dấu sau lượt quét ĐỦ** (`only` rỗng). Lượt nhỏ đóng dấu →
  hệ tưởng xong, bỏ luôn lượt quét đủ → thống kê thiếu 1470 mã.
- **`applyLive` đếm đủ ≥100 mã TRƯỚC khi ghi đè.** Đếm sau vòng lặp thì đệm thiếu mã
  để lại `CP.coins` nửa sống nửa kho.
- **Mốc 15:00 trong `lastSessionDate` phải khớp mốc tắt của `sessionOpen`.** Từng để lệch
  (900 vs 905) → khe 15:00–15:05 tắt sạch mạng, ai mở lúc 15:02 thấy nguyên số hôm qua.
- **11 lô phải `Promise.all`.** Nối đuôi = 2.768ms, đúng khoảng "loé số cũ".
- **`pollBoard` đang bận phải trả về CHÍNH promise đang chạy**, không trả `false` —
  ai gọi trúng lúc bận sẽ không bao giờ được báo kết quả.
- **F5 giữa phiên, đệm dưới 2 phút → vẽ ngay từ đệm, KHÔNG chờ mạng.** Màn hình sau F5
  giống hệt trước F5 rồi mới đổi tại chỗ. Chờ mạng rồi vẽ số mới = cảm giác giá nhảy.
- **Lần cập nhật đầu sau khi mở trang không nháy màu.** Nháy để báo giá vừa động,
  không phải báo trang vừa tải.
- `CP.boardIdle` — quét đủ mà không mã nào khớp lệnh (nghỉ lễ / bảng reset đêm) →
  nguồn hết cái để cho, ngừng hỏi. Không có cờ này thì quét vô tận 60s/lần.
- **Cộng dòng tiền NN phải theo NGÀY PHIÊN, không theo ngày lịch.** Từng cộng trùng
  phiên mới nhất: VIC 30 phiên hiện 688 tỷ thay vì 3.267 tỷ, im lặng hoàn toàn.
- **Hợp đồng `cpvn_live`**: `{at, sess, final, idx, d}`, `d[MÃ]` là mảng **10 phần tử đúng
  thứ tự** `[price, ref, vol, gtgd, fbuy, fsell, high, low, ceil, flr]`. Ba nơi đọc/ghi:
  `core.js`, `bubbles.html`, `congcu.js`. Đổi thứ tự là hỏng giá cả 4 trang.
- **Mã CHƯA KHỚP LỆNH phiên này mang cờ `nt`** — giá của nó là giá khớp cuối cùng của một
  phiên CŨ (mã thanh khoản kém đứng im hàng tháng). Tuyệt đối không lấy giá cũ đó trừ tham
  chiếu HÔM NAY ra phần trăm, không tô nhãn trần/sàn, không đếm vào độ rộng. Từng để lọt:
  639/1522 mã lệch phiên → 88 mã hiện 1D% giả (NDC −18,65% dù khớp lệnh cuối 23/06), 19 mã
  bị tô trần/sàn giả, hàng Độ rộng đếm 1.422 mã "có giao dịch" trong khi thật sự 883.
  Cờ này do `refresh_daily.py` bước 5 sinh ra và được `core.js`, `bubbles.html`, `congcu.js`,
  `index.html` cùng tôn trọng.
- So sánh ngày là **so chuỗi `'YYYY-MM-DD'`**.

## Quy ước toàn site

- **Đơn vị**: kho để **ĐỒNG**. VPS trả nghìn đồng (**×1000**) và lô 10 cp (**×10**).
  `universe.json` có `cash`/`np` tính bằng **tỷ** → phải `×1e9`. Hiển thị một đơn vị
  **"tỷ"** duy nhất qua `CP.fmtVnd`, viết hẳn số (`1,100 tỷ`) không đổi bậc.
- **Cache-bust**: mọi thẻ `<script src="assets/*.js">` ở cả 4 trang dùng **cùng một token
  `?v=YYYYMMDDx`**. `_headers` không có rule cho `assets/*.js` nên đổi token là cách DUY
  NHẤT ép tải bản mới. Sửa 1 file JS → đổi token ở TẤT CẢ các trang.
- **`<base href="/">`** bắt buộc ở `cophieu.html` (URL 2 tầng `/cophieu/VIC`).
  `congcu.html` **không có** → chỉ an toàn với URL một đoạn.
- **`_redirects`**: `200` = rewrite giữ URL đẹp, `301` = chuyển hướng thật.
  **Đừng thêm rule cho đường dẫn đã có file .html cùng tên** → vòng lặp 307.
- **Giao diện mặc định SÁNG**, lưu `localStorage['cpvn_theme']`. Màu được nướng vào lúc vẽ
  canvas → đổi theme phải vẽ lại.
- **Gộp ngành** (`SECTOR_EXPLICIT` + ngành <4 mã dồn về "Khác") phải **y hệt** giữa
  `core.js` và `bubbles.html`, nếu không cùng tên ngành ra số mã khác nhau.
- Mọi `innerHTML` từ nguồn ngoài phải qua `CP.esc`; HTML thô của Simplize qua `sanHTML()`.
- Nội dung là **thống kê mô tả quá khứ, không khuyến nghị mua bán**.

## Ghi chú từng trang

**`index.html`** — Bảng **cố định 13 cột** (`#` · ☆ · Cổ phiếu · Giá · Vốn hoá · 1D% · GTGD ·
Tiền mặt · LNST · NN mua · NN bán · P/E · EPS); thêm/bớt cột phải sửa đồng bộ 5 chỗ
(`colspan="13"`, `MCOLS/PCOLS/NCOLS`, CSS ghim cột mobile, `<th>`, hàm dựng `<td>`).
Mọi ô số **phải** bọc `<span class="n">`, ô tiền kèm `<i class="u">` — `fitNumCols()` đo
theo đúng `.n` để khoá bề rộng cột (dùng `Range.getBoundingClientRect`, **không** dùng
canvas `measureText` — nó trả sai font). Đổi bề ngang là phải gọi lại `fitNumCols`.
Mã thiếu dữ liệu luôn nằm **cuối** dù sort tăng hay giảm.

**`cophieu.html`** — Biểu đồ nhỏ và PTKT toàn màn hình dùng **chung** `CPChart`, chung
`dailyRows`, chung kho hình vẽ; chỉ khác palette (`'gon'` 10 nút vs `'full'` 14 nút).
Bốn bảng KQKD/CĐKT/LCTT/cổ tức dùng **chung một lưới cột** — đổi số cột là lệch cả bốn.
Kỳ mới nhất luôn bên **trái**. Chiều cao canvas không đặt cứng, do cột trái quyết định.

**`assets/chart.js`** — Toạ độ neo theo **(thời gian, giá)** nên kéo/phóng hình vẫn đứng yên.
Bề rộng nến chia theo `span = i1-i0` **kể cả vùng trống tương lai**, không chia theo số nến
thật. `cx(i)` dùng chỉ số **cục bộ** của `vis`, `xOfT()` dùng chỉ số **toàn cục** trừ `i0` —
đừng lẫn. Mọi hàm đổi toạ độ ngoài `draw()` chỉ đúng **sau khi `draw()` đã chạy ít nhất một
lần**. MA/BB/RSI/MACD tính trên **toàn chuỗi** rồi mới cắt, để mép trái không cụt.
Quy tắc vẽ: **một hình rồi tự về con trỏ**, nhận cả bấm-kéo-thả lẫn bấm-bấm, Esc huỷ.

**`bubbles.html`** — **Đừng "dọn rác" bằng cách xoá lõi giá trong file này để gọi `CP.*`.**
Nó giữ `state.coins` riêng. Các cặp hàm trùng lặp phải sửa **đồng thời** cả hai file:
`consolidateSectors`, `loadEOD`↔`loadBase`, `pollBoard`, `saveLiveShared`↔`saveLive`,
`applyLiveShared`↔`applyLive`, `sessionOpen`, `lastSessionDate`, `pricesFinal`.
Màu bảng điện (trần tím · tăng lục · TC vàng · giảm đỏ · sàn lơ) định nghĩa ở **ba nơi**.

**`congcu.js`** — Thêm module phải sửa **6 chỗ**: `MODULES`, `PATHOF`, `TITLEOF`, `byPath`,
tab trong HTML, rule trong `_redirects`. Poll sống chỉ vẽ lại module radar.

## Pipeline

11 bước, thứ tự bắt buộc: **bảng giá (bước 2) phải chạy TRƯỚC kho nến (bước 3)** vì
`fetch_hist` dò hệ số đơn vị bằng cách đối chiếu với `ref` của bảng giá.
Mọi JSON ghi qua `jdump()` (compact, `ensure_ascii=False`, atomic `.tmp`+`os.replace`).
Chỉ cập nhật universe bằng giá trị **khác None** — đó là cách giữ số cũ khi API lỗi.
Song song đã cân theo giới hạn nguồn (Simplize 4 luồng + sleep 0.15, hist 12, fin 5,
news 6, profile 5) — tăng lên dễ bị chặn IP.

**Lịch chạy**: VPS Windows Scheduled Task 15:15 chạy `server/run_refresh.ps1` (commit
`EOD <phiên> (server)`) — **đường chính**. GitHub Actions dự phòng 16:05 / 19:05 / 23:05 giờ VN,
so `data/health.json['date']` với **phiên gần nhất đã đóng sổ**, bằng nhau thì tự thoát.
Toàn bộ cấu hình máy chủ nằm trong **`server/`** (script chạy + script dựng tác vụ + cách
dựng lại từ số 0). Tác vụ trỏ thẳng vào file TRONG kho nên sửa ở repo là lượt sau tự lấy.

> **`Last Result: 0` của Scheduled Task KHÔNG có nghĩa là đã đẩy được lên GitHub** — nó chỉ
> nói PowerShell thoát sạch. Ngày 04/08/2026 tác vụ chạy đúng giờ, cào đủ 1522 mã, commit tại
> chỗ, rồi `git push` bị từ chối "fetch first" vì có commit khác đẩy lên trong 8 phút pipeline
> chạy — cả phiên nằm lại trong máy suốt buổi tối mà không ai biết. Nay script kéo lại ngay
> trước khi đẩy, thử 5 lần, hỏng thì ghi `C:\cpvn\PUSH_FAILED.txt`. Khi nghi ngờ: xem cờ đó
> và `data/health.json['date']`, đừng tin Last Result.

> **Lịch của GitHub Actions không đáng tin** — đã đo: 1 lượt duy nhất chạy đúng lịch trong
> nhiều ngày, và trễ 8 tiếng 12 phút. Vì thế mới có 3 khung giờ + bước kiểm tra idempotent.
> Từng có lỗi dây chuyền: commit đặt tên theo **ngày chạy** thay vì **ngày phiên**, lượt trễ
> qua nửa đêm đẻ ra tên `EOD <hôm sau>` khiến lượt hôm sau tưởng xong rồi bỏ qua —
> dự phòng tự tắt chính nó đúng ngày cần nó nhất.

## Bẫy đã trả giá

- **Xoá phần tử DOM mà quên chỗ gọi `$('id')`** → TypeError ở top level → init không chạy →
  **trang trắng**. Đã dính với `#sector`. Cách chặn: để lại hàm rỗng thay vì xoá lời gọi.
  Kiểm nhanh: so mọi `$('id')` trong file với các `id="..."` thực có.
- **`canvas` là replaced element** — `inset:0` thôi thì nó lấy kích thước nội tại và vẽ tràn.
  Phải khai báo `width:100%; height:100%`.
- **html2canvas**: không hiểu `color-mix()`; DOM nhân bản chạy lại animation từ `opacity:0`
  → phải có class `shotmode` tắt animation; logo cần `crossOrigin='anonymous'`.
- **Font hệ thống dùng chữ số tỷ lệ** (9 bề rộng khác nhau) → cột số lệch.
  Phải `font-variant-numeric: tabular-nums`.
- **Kho lẫn HAI DẠNG UNICODE cho cùng một chuỗi tiếng Việt** — `data/fin/*.json` có
  2.764 dòng dựng sẵn (NFC) và 82 dòng tách dấu (NFD), chủ yếu công ty chứng khoán
  (VIX, SBS, AGR). Nhìn giống hệt nhau nhưng `===` trả false. Mọi so khớp theo TÊN
  tiếng Việt phải qua `.normalize('NFC')` trước, nếu không nhóm 82 mã đó lặng lẽ
  trượt khỏi luật tô màu / lọc dòng mà không có lỗi nào.
- **Logo cache 1 năm immutable** — thay file cùng tên sẽ không bao giờ tới người đã ghé.
- Nến ngày `'D'` thì `CPChart.aggregate` trả về **chính mảng gốc**, sửa nến cuối tại chỗ là
  sửa luôn bộ nhớ đệm của mã đó.

## Quyết định đã chốt, đừng đề xuất lại

- **Không nhúng chart bên thứ ba.** Widget miễn phí TradingView **từ chối sàn HOSE**
  (đã dựng thử thật: *"Mã giao dịch này chỉ có trên TradingView"*), điều khoản cấm gỡ ghi
  nguồn, kho `charting_library` (bản có công cụ vẽ) là kho riêng trả 404.
  `lightweight-charts` tải được nhưng **không có công cụ vẽ**. → CPVN tự viết `chart.js`.
- **Trong phiên lưu tạm, hết phiên chốt cứng** — luật do user đặt, xem mục Cơ chế giá.
