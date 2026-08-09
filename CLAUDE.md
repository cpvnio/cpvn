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
| `assets/screener.js` | 93 | `CPScreen` — bộ lọc, nạp lười `screen.json`+`fund.json` khi mở panel |
| `refresh_daily.py` | 715 | Toàn bộ "backend": 11 bước cào → ghi kho |
| `tools/build_screen.py` | 624 | Sinh `screen.json`/`fund.json`/`market.json`. refresh_daily gọi ở bước 10 |

## Kho dữ liệu `data/` (~130MB)

| Đường dẫn | Nội dung |
|---|---|
| `universe.json` | 1522 mã: tên, sàn, ngành, SLCP, mcap, PE/PB, eps, cash, np, mốc %, vn30/hnx30 |
| `data/eod/latest.json` | **File client luôn tải** (~100KB): giá đóng cửa phiên gần nhất + 4 chỉ số |
| `data/hist/{MÃ}.json` | Nến ngày từ 2020: 8 mảng `t,o,h,l,c,v,fb,fs` cùng độ dài, cũ→mới. **KHÔNG còn là nguồn vẽ chart** (xem mục Nến), nay chỉ nuôi MA/RSI/đỉnh 52T/dòng tiền NN/độ rộng/đường đua |
| `data/fin/{MÃ}.json` | KQKD/CĐKT/LCTT theo năm+quý, cổ tức |
| `data/news/` `data/profile/` | Tin + báo cáo CTCK · hồ sơ DN, cổ đông, công ty con |
| `data/screen.json` `fund.json` | Dạng CỘT: `f`=tên trường, `d[MÃ]`=mảng giá trị cùng thứ tự |
| `data/market.json` | `breadth` 250 phiên · `global` (CNN F&G) · `race` (đường đua) |
| `data/tapdoan.json` | Bản đồ tập đoàn: nhóm → mã con + % mẹ nắm. `tools/build_tapdoan.py` dựng |
| `data/quy.json` | Danh mục các quỹ: quỹ → mã đang nắm + giá trị + **kỳ công bố**. Cùng script |
| `data/health.json` | `date` = **ngày phiên** — khoá điều phối giữa VPS và Actions |

## Nến vẽ chart — MƯỢN THẲNG CỦA NGUỒN, đừng lấy trong kho

Luật user chốt 05/08/2026: **trang không tự lưu nến để vẽ và không tự tính điều chỉnh
cổ tức/chia tách.** `CP.loadDaily(sym)` (core.js) và bản sao `loadDaily` trong
bubbles.html đi theo chuỗi:

| | Nguồn | Sâu | Hồi tố quyền |
|---|---|---|---|
| 1 | `dchart-api.vndirect.com.vn` ACAO `*` | **13,5 năm** (02/01/2013) | **đủ** — đo 206/213 sự kiện |
| 2 | `histdatafeed.vps.com.vn` ACAO `*` | 15 năm (2011) | chỉ từ giữa 2021 trở lại |
| 3 | kho `data/hist` | 2020 | **đủ** — từ 07/08/2026 kho cũng cào VNDirect |

7 sự kiện còn "chưa hồi tố" ở nguồn 1 đều là **cổ tức TIỀN 2–4%** — đúng thông lệ thế
giới (chart giá không trừ cổ tức tiền, chỉ chart tổng lợi nhuận mới trừ). Toàn bộ sự kiện
gây gãy chart thật (thưởng CP, chia CP, tách) đều đã hồi tố.

> **Nguồn VN hồi tố CẢ cổ tức tiền (khác thông lệ thế giới)** — đo 05/08/2026 trên kho
> (VPS): BMP 9/12 đợt, 12 mã hay trả cổ tức 74/92 đợt ≥1,5% "giá không rơi ngày GDKHQ"
> = đã trừ vào nền quá khứ. Hệ quả: chuỗi giá kho/VNDirect gần với **tổng lợi nhuận**
> (cổ tức như thể tái đầu tư) chứ không phải giá thuần — %1D/1Y, đường đua, DCA đều
> mang tính chất này. Đừng cộng thêm cổ tức tiền vào bất kỳ phép tính lợi nhuận nào
> kẻo ĐẾM HAI LẦN.

> **Vì sao phải có nguồn 2**: nguồn 1 tắt là mất sạch chart. **Vì sao kho vẫn ở lại**:
> nó là CƠ SỞ DỮ LIỆU cho bộ lọc/radar/đường đua, chỉ thôi đóng vai nguồn vẽ.
> **Đơn vị**: cả hai nguồn trả nghìn đồng — phải đối chiếu `ref` bảng giá chọn hệ số,
> tuyệt đối không đoán theo ngưỡng (VNZ 555k, HLB 505k rơi đúng biên).

### Kho `data/hist` cũng đã chuyển sang VNDirect (07/08/2026)

Kho cào bằng VPS nên thiếu hồi tố mọi quyền TRƯỚC giữa 2021 → **371/1525 mã sai nền giá**,
mọi thứ đọc kho (đường đua, đầu tư bền vững, bộ lọc MA/RSI, độ rộng) đều tính HỤT lãi:
HPG 3/2020→nay ×3,10 thay vì ×4,21; VHM và VCI ×0,5; VIB ×0,71; SCI thậm chí có cây nến
**−100%** trong chuỗi VPS. Đã vá bằng `tools/va_nen_gia.py` (chạy một lần, giữ nguyên
`fb`/`fs` theo ngày) và `refresh_daily.fetch_hist` nay đi VNDirect trước, VPS dự phòng.

Ba luật kèm theo, phá là dữ liệu sai âm thầm:

1. **Tự phát hiện hạ nền**: ngày thường chỉ nối phiên mới, nhưng phải so giá tại NGÀY
   TRÙNG NHAU giữa nguồn và file cũ — lệch >0,5% nghĩa là mã vừa chốt quyền và nguồn đã
   hạ cả chuỗi → tải lại toàn bộ mã đó ngay, đừng nối nền mới vào nền cũ.
2. **Ghép quá khứ phải quy về cùng nền**: khi nguồn trả thiếu phần cũ, nhân đoạn cũ với
   tỉ lệ đo ở phiên chung xa nhất rồi mới ghép. Ghép thẳng là tự tay tạo cú sập giả.
3. **Đo tỉ lệ TRƯỚC khi ghép**: đo sau thì phiên đầu chuỗi chính là số cũ, tỉ lệ ra 1,0
   và tưởng không có gì đổi — lượt chạy thử đầu tiên báo 14 mã lệch, sự thật là 371.

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
- **Cổ tức xếp theo NGÀY CHỐT QUYỀN — `div` gộp theo NĂM, `divQ` gộp theo QUÝ.** Cổ tức TIỀN lấy từ Simplize
  `dividend/histories` mang năm CHI TRẢ; nếu để cổ tức CỔ PHIẾU theo năm TÀI CHÍNH
  ghi trong mô tả sự kiện là trộn hai quy ước trong cùng một bảng — VCB 27,6% chốt
  quyền 22/12/2021 nằm ở dòng 2019, sai **21/21** sự kiện trên 5 mã lớn. Độ lệch KHÔNG
  cố định (VCB lệch 2 năm, HPG lệch 1) nên không suy ngược được, phải cào lại lịch sự kiện
  — pipeline tự làm việc đó cho mã nào thiếu `divQ` (xem `FIN_KEYS` bên dưới);
  `tools/va_cotuc.py` chỉ còn là bản vá tay của lần đầu, không cần chạy nữa.
  **Cột QUÝ phải đọc `divQ`, không được lấy số cả năm rải ra 4 quý** — VCB từng hiện
  450đ ở cả Q1..Q4/25 như thể trả bốn lần, thực tế chỉ trả tháng 10 (Q4). Tháng chi
  trả có sẵn trong `dividend/histories.divMonths`, cổ tức CP lấy tháng của ngày chốt quyền.
- **KQKD phải GOM DỒN, đừng ghi đè.** Nguồn 24hMoney chỉ trả **8 kỳ gần nhất** và không có
  cách xin thêm (đã thử `page`/`size`/`offset`/`fromYear`/`year` — luôn đúng 8). Ghi đè là
  mỗi lượt cào lại đẩy quý cũ ra khỏi kho; trang cổ phiếu bung năm 2023 ra thì không còn quý
  nào. Bước 5 nay gộp `Y`/`Q` theo NHÃN, số mới thắng số cũ (nguồn có đính chính số đã công bố).
  Quý CŨ đã vá một lượt bằng `tools/va_quy.py` từ `api-finfo.vndirect.com.vn/v4/financial_statements`
  (81 quý, lùi tới 2005): **1.261 mã nhận thêm 53.837 quý**, 21 mã bị guard chặn, 241 mã nguồn
  không có. **CÙNG MỘT KHÁI NIỆM NẰM Ở MÃ DÒNG KHÁC NHAU tuỳ mẫu báo cáo** — nên script chấm
  điểm từng ứng viên trên 8 quý kho ĐÃ CÓ rồi mới chọn, thay vì đoán theo ngành:
  `21001` doanh thu THUẦN (không phải `21000` = doanh thu GỘP; lấy nhầm thì HPG Q4/25 thành
  47.302 thay vì 46.177 tỷ, DGW lệch đều 2-4% ở MỌI quý) · `22100`/`622100` giá vốn ·
  `23800` LN trước thuế · `23003` LNST cổ đông mẹ ở doanh nghiệp thường nhưng **`23000` ở
  ngân hàng** (lấy nhầm thì BID Q3/25 thành 6.087 thay vì 5.953 tỷ).
  Ngân hàng KHÔNG dò được mã doanh thu (ứng viên gần nhất lệch 0,8-2,5% và khác nhau giữa
  VCB với BID) nên quý cũ của bank để trống doanh thu/giá vốn — thà trống còn hơn đoán.
  Kiểm chứng độc lập: tổng 4 quý so cột năm lệch 0-0,3% ở mã ngoài ngành ngân hàng.
- **BẢN ĐỒ TẬP ĐOÀN dựng TỪ DANH SÁCH CỔ ĐÔNG**, không nhập tay: `data/profile/{MÃ}.json`
  → `sh` có tỉ lệ sở hữu; ai nắm ≥20% của từ 2 mã trở lên là một nhóm. 123 nhóm, 646 lượt mã.
  Sáu cái bẫy đã trả giá, sửa là phải giữ:
  1. **Mẹ thường KHÔNG niêm yết** (Viettel, PVN, EVN, TKV, Vinachem) — nối theo trường `t`
     (mã cổ đông) là mất sạch nhóm lớn nhất, phải gom theo TÊN đã chuẩn hoá.
  2. **Một tập đoàn rải ở nhiều pháp nhân trung gian** — Masan nằm ở "Masan Consumer
     Holdings" (MCH), "Masan Horizon" (MSR), "Masan Agri" (MML), "Tập đoàn Masan" (MSN):
     bốn cụm rời. Bảng `TU_KHOA` gộp biến thể và gắn mã mẹ; đây là phần DUY NHẤT viết tay.
  3. **Khớp phải TRỌN TỪ và bỏ quỹ đầu tư.** Khớp chuỗi con thì "Geleximco" chui vào nhóm
     GELEX (hai tập đoàn khác hẳn nhau); không loại quỹ thì "FPT Fund Management" nắm 11,7%
     TN1 biến TN1 thành con của FPT.
  4. **Phải đọc CẢ trường `subs` (công ty con), không chỉ `sh`.** Danh sách cổ đông của FOC
     trong nguồn chỉ còn hai cá nhân nắm 0,28% — mẹ thật (FPT Telecom) biến mất, nối kiểu
     nào cũng không ra. Nhưng FPT tự khai FOC trong `subs` ở 23,79%. Hai chiều cạnh: `sh`
     cho "X nắm Y", `subs` cho "X khai Y là con". `a:1` trong `subs` là LIÊN KẾT chứ không
     phải con — nhận bừa thì Techcombank (Masan khai 14,9%) nhảy vào nhóm Masan, nên liên
     kết đòi ngưỡng 20% chứ không hạ xuống 10% như con ruột.
  5. **% ghi ra phải là % HIỆU DỤNG, nhân dồn dọc chuỗi.** FPT nắm 45,7% FOX, FOX nắm 56,4%
     FOC → FOC ghi ≈23,8% (khớp con số 23,79% FPT tự khai), ghi 56,4% là nói phần của FOX
     thành phần của FPT. Kèm **sàn `NGUONG_HIEU=10%`**: từng khâu đạt ngưỡng không có nghĩa
     cả chuỗi còn ý nghĩa (22,5% × 20% = 4,5%), thiếu sàn thì đẻ ra cả loạt "tập đoàn" hai
     mã mà mã thứ hai chỉ là cháu hờ. Mã tìm được gián tiếp mang `gt:1` (+ `qua` = mã trung
     gian), giao diện hiện dấu `≈`.
  6. **Nhóm khai tay được ưu tiên khi giành mã, và mẹ niêm yết LUÔN là hạt giống.** Chỉ xếp
     theo tỉ lệ thì PRE về tay "HDI Global SE" (ngoại nắm 38,9% PVI) thay vì PVN — đúng số
     sai nhà. Còn đợi có mã khai tên mẹ mới mở nhóm thì HPA (không có nổi một dòng cổ đông)
     kéo HPG vào nhóm mang tên "Tran Dinh Long", chẳng ai gọi nhà đó bằng tên ấy.
  Nhóm do nhà nước hay cá nhân chi phối vẫn giữ nhưng gắn `kieu` (`nn`/`cn`) để giao diện
  dán nhãn — Ngân hàng Nhà nước nắm cả BID+VCB+CTG nhưng ba ngân hàng đó không cùng một nhà.
  Bảng mặc định xếp VỐN HOÁ cao→thấp (`tdSort`), bấm lại nút đang bật là lật chiều; thứ tự
  áp cho cả hàng nhóm lẫn công ty con. **Màn hẹp chỉ đủ một cột tiền nên nó phải là cột
  ĐANG XẾP THEO** (`#tdPanel.xcap` đổi `.sc`↔`.sv`), bằng không xếp theo vốn hoá mà cột hiện
  ra là GTGD thì bảng trông như không xếp gì. Hàng nhãn cột phải mang **đúng class của từng
  cột** (`tdp`/`tdv`/`tdg`) — thiếu class thì nhãn canh trái còn số canh phải.
- **HÀNG CON DÙNG CHUNG LƯỚI CỘT VỚI HÀNG NHÓM** — biến `--tdc` khai một chỗ cho cả `.tdrow`
  lẫn `.tdcon .rw` (`#quyPanel` có `--tdc` riêng vì hàng quỹ chỉ 5 ô). Hai lưới riêng là mọi
  con số của hàng con lệch khỏi cột của hàng nhóm ngay phía trên, bấm mở ra đọc rất khó chịu.
  Hai điều kiện đi kèm, thiếu một là lệch lại:
  1. **Khung con không được thụt lề bằng box** — `padding/border/margin` bên trái của `.tdcon`
     đẩy cả lưới bên trong đi chừng ấy pixel. Vạch dọc vẽ bằng `::before` tuyệt đối, phần
     thụt đầu dòng dồn hết vào ô tên (`.c1{padding-left}`), logo nằm TRONG ô tên.
  2. **`gap` và padding NGANG của hai hàng phải bằng nhau** (12px/`0 4px`; màn hẹp 8px/`0 2px`).
  Giữ chỗ bằng ô rỗng `.sp0` chứ ĐỪNG ghim `grid-column` cứng: màn hẹp giấu bớt cột thì ô
  rỗng tự co lại và mọi thứ dồn đúng như hàng nhóm, còn ghim cứng sẽ lòi ra cột trống.
- **DANH MỤC QUỸ: kỳ công bố LỆCH NHAU HƠN HAI NĂM, phải hiện ngày.** Lật từ trường `funds`
  của data/profile: 13 quỹ, 238 lượt nắm. Quỹ nội báo cáo đều nên có số tới 30/06/2026, còn
  Dragon Capital và PYN thì nguồn chỉ tới 31/12/2023. Gộp chung rồi gọi "đang nắm giữ" là
  dựng nên một danh mục không còn tồn tại — mỗi quỹ mang `ky` riêng, quỹ cũ hơn 2025 bị dán
  nhãn "số cũ" và xếp xuống dưới. Giao diện chỉ hiện quỹ có danh mục **≥ `QUY_MIN`=500 tỷ**
  (`congcu.js`) → còn 6/13. Lọc ở GIAO DIỆN chứ không ở script: `quy.json` giữ đủ để đổi
  ngưỡng là xong, khỏi phải cào lại. Lưu ý `tong` là tổng phần GHI NHẬN ĐƯỢC (nguồn chỉ
  công bố top-N quỹ mỗi mã) nên luôn nhỏ hơn NAV thật — đừng đọc như quy mô quỹ.
- So sánh ngày là **so chuỗi `'YYYY-MM-DD'`**.
- **NHÓM THEO DÕI — `universe.json` → `"nhom"`.** Rổ mã chọn tay (`{id, ten, mau, syms}`).
  Nó là **một CHIP trong Bộ Lọc PRO của bảng giá** (khoá `'nhom:<id>'`, `CPScreen.chip` bắt
  tiền tố này), **KHÔNG phải một ngành** — xếp thành ngành thì cột ngành có hai loại mục
  khác bản chất, một mã đếm ở hai chỗ, và ô chọn ngành của đường đua cũng phải gánh theo.
  Mã trong nhóm giữ nguyên ngành gốc. `syms` rỗng thì chip tự ẩn.
  Pipeline giữ nguyên khoá này vì `refresh_daily` sửa `u` tại chỗ rồi ghi đè.
- **GỘP NGÀNH phải GIỐNG NHAU ở BA nơi**: `assets/core.js` (bảng giá + trang mã),
  `bubbles.html`, `assets/congcu.js` (radar + đường đua). Sửa một chỗ thì phải sửa cả ba.
  congcu.js từng thiếu bước này nên ô chọn ngành của đường đua hiện "Bán lẻ chuyên dụng",
  "Bán lẻ thực phẩm và thuốc", "Bán lẻ tổng hợp" thành ba ngành riêng (38 ngành) trong khi
  bảng giá đã gộp làm một từ lâu (35 ngành) — cùng một tên ngành, hai trang ra hai rổ mã.
- **Đường đua lấy MỌI mã có SLCP**, không cắt bớt. Bản cũ chỉ lấy top 40 toàn thị trường +
  top 10 mỗi ngành (401 mã) nên chọn ngành ngân hàng ra đua chỉ thấy 14/30 mã, gõ TPB/ABB
  vào ô mã thì báo "không có trong dữ liệu đua" — người dùng không có cách nào biết rổ bị
  cắt. `data/market.json` vì thế nặng 612KB (nén còn 132KB), chấp nhận được.
  Mã CHƯA có giá ở tháng bắt đầu (niêm yết sau) vẫn bị loại — nhưng phải LIỆT KÊ RA
  (`chuaCo`), không được im lặng.

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
Hình có **KHUNG** (`pane`): `main` = vùng giá · `rsi` = dải RSI thang 0–100. Khung do điểm
ĐẦU TIÊN quyết định, các điểm sau bị kẹp trong khung đó. Hình khung RSI **phải sơn SAU**
đoạn vẽ đường RSI (paintDraws có tham số lọc khung) và hình học dải phải tính từ đầu
`draw()` — để nguyên chỗ cũ thì lúc lớp vẽ chạy `geo.rsiTop` còn rỗng, hình lặng lẽ biến mất.
`NEED[k]===0` = số điểm KHÔNG cố định (bút, đa đoạn): chốt bằng thả chuột / bấm đúp / Enter;
bấm đúp phải dùng CHUNG một listener với "xem lại toàn bộ" kẻo chốt xong bị reset khung ngay.

**`bubbles.html`** — **Đừng "dọn rác" bằng cách xoá lõi giá trong file này để gọi `CP.*`.**
Nó giữ `state.coins` riêng. Các cặp hàm trùng lặp phải sửa **đồng thời** cả hai file:
`consolidateSectors`, `loadEOD`↔`loadBase`, `pollBoard`, `saveLiveShared`↔`saveLive`,
`applyLiveShared`↔`applyLive`, `sessionOpen`, `lastSessionDate`, `pricesFinal`.
Màu bảng điện (trần tím · tăng lục · TC vàng · giảm đỏ · sàn lơ) định nghĩa ở **ba nơi**.

**`congcu.js`** — Thêm module phải sửa **6 chỗ**: `MODULES`, `PATHOF`, `TITLEOF`, `byPath`,
tab trong HTML, rule trong `_redirects`. Poll sống chỉ vẽ lại module radar.

**Đường đua có hai chế độ** (`RA.mode`): `race` = xếp hạng vốn hoá; `dca` = **đầu tư**, và
chế độ đầu tư có thêm hai công tắc độc lập nhau, bốn tổ hợp đều dùng chung một mạch tính:

| | từng mã (mỗi mã một đường) | gộp rổ chia đều (một đường danh mục) |
|---|---|---|
| **hàng tháng** `kieu='deu'` | `v_k = X·a_k·Σ(1/a_j)` | trung bình cộng các đường |
| **một lần** `kieu='mot'` | `v_k = X·a_k/a_0` | trung bình cộng các đường |

Rổ chia đều **đúng bằng trung bình cộng** các đường đơn lẻ (mỗi mã `X/N`) — đã kiểm chéo
bằng cách cộng tay từng khoản mua. Ô **gõ mã** có quyền cao hơn ô nhóm ngành (gõ mã thì
select ngành bị khoá mờ). Ngân hàng 7%/năm ghép lãi THEO THÁNG là đối thủ mặc định:
`mot → X·(1+r)^k`, `deu → X·((1+r)^(k+1)−1)/r`, hai công thức đều cho `k=0` ra đúng `X`
để tháng đầu hai bên hoà nhau — so nhau mới công bằng. Hai kiểu giữ **số tiền riêng**
(`amtD` 5 triệu/tháng, `amtM` 100 triệu một lần), đổi qua lại không nhảy số.
Nhãn đầu đường (kể cả "vốn đã bỏ") phải nằm chung mảng `tips` rồi mới dồn chống đè —
tách ra vẽ riêng là chồng chữ; vòng đẩy ngược lên khi tràn đáy phải **cascade**, bản cũ
chỉ nhích được đúng một nhãn nên 5 nhãn dồn đáy là dính thành một mớ.

## Pipeline

11 bước, thứ tự bắt buộc: **bảng giá (bước 2) phải chạy TRƯỚC kho nến (bước 3)** vì
`fetch_hist` dò hệ số đơn vị bằng cách đối chiếu với `ref` của bảng giá.
Mọi JSON ghi qua `jdump()` (compact, `ensure_ascii=False`, atomic `.tmp`+`os.replace`).
Chỉ cập nhật universe bằng giá trị **khác None** — đó là cách giữ số cũ khi API lỗi.
Song song đã cân theo giới hạn nguồn (Simplize 4 luồng + sleep 0.15, hist 12, fin 5,
news 6, profile 5) — tăng lên dễ bị chặn IP.

> **ĐỔI SƠ ĐỒ FILE `data/fin` LÀ PHẢI SỬA `FIN_KEYS`.** Bước 5 chỉ cào lại mã nào `fin_stale()`
> gật đầu, mà hàm đó dò theo danh sách tên trường của sơ đồ HIỆN HÀNH. Thêm trường mới
> mà quên khai vào `FIN_KEYS` thì mã cũ giữ file thiếu trường đó **im lặng** cho tới lượt
> `--full` thứ Hai — và nếu chính `--full` là thứ sinh ra trường đó thì kẹt luôn, phải chạy
> tay một script vá riêng. `divQ` đã dính đúng vậy: bảng kiểm chỉ dò mỗi `bsQ` của lần đổi
> sơ đồ trước, nên 234 mã đứng ngoài mà không có dấu hiệu gì.
> **Nguyên tắc chung: mọi bản vá một lần phải chuyển thành một phép kiểm trong pipeline** —
> việc gì cần người ngồi chạy tay là việc sẽ bị quên.

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
