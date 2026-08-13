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
| `congcu.html` + `assets/congcu.js` | 384+676 | 3 module: Radar phiên · **Danh mục tập đoàn** (kèm tab quỹ) · Đường đua vốn hoá |
| `assets/core.js` | 522 | **Lõi dữ liệu `CP`** — chỉ index + cophieu dùng. Phần lớn là cơ chế giá |
| `assets/chart.js` | 798 | **`CPChart`** — bộ vẽ nến canvas tự viết + lớp vẽ PTKT. Không phụ thuộc core.js |
| `assets/screener.js` | 93 | `CPScreen` — bộ lọc, nạp lười `screen.json`+`fund.json` khi mở panel |
| `assets/mobi.css` + `assets/mobi.js` | 103+101 | **Khung mobile dùng chung cả 4 trang** — thanh tab đáy + bốn lối rẽ của Radar. Chỉ sống trong `@media(max-width:760px)` |
| `demo-mobi*.html`, `demo-nen.html` | — | Bản demo để CHỌN, không nằm trong luồng chính. `demo-mobi.html` so hai mẫu bằng 2 iframe + postMessage |
| `refresh_daily.py` | 715 | Toàn bộ "backend": 11 bước cào → ghi kho |
| `tools/build_screen.py` | 624 | Sinh `screen.json`/`fund.json`/`market.json`. refresh_daily gọi ở bước 10 |

## Kho dữ liệu `data/` (~130MB)

| Đường dẫn | Nội dung |
|---|---|
| `universe.json` | 1522 mã: tên, sàn, ngành, SLCP, mcap, PE/PB, eps, cash, np, mốc %, vn30/hnx30 |
| `data/eod/latest.json` | **File client luôn tải** (~100KB): giá đóng cửa phiên gần nhất + 4 chỉ số |
| `data/hist/{MÃ}.json` | Nến ngày từ 2020: 8 mảng `t,o,h,l,c,v,fb,fs` cùng độ dài, cũ→mới. **KHÔNG còn là nguồn vẽ chart** (xem mục Nến), nay chỉ nuôi MA/RSI/đỉnh 52T/dòng tiền NN/độ rộng/đường đua. `fb`/`fs` (khối ngoại) đã vá đủ lịch sử 11/08/2026 — xem mục Khối ngoại |
| `data/fin/{MÃ}.json` | KQKD/CĐKT/LCTT theo năm+quý, cổ tức. **`Y`/`Q` gom dồn đủ lịch sử; `bsQ`/`cfQ`/`bsY`/`cfY` chỉ 8 KỲ CUỐN CHIẾU** — muốn dài hơn đọc `data/finq` |
| `data/finq/{MÃ}.json` | **Kho sâu**: cân đối kế toán + lưu chuyển tiền tệ ~79 quý / 22 năm, cùng sơ đồ khối `bsQ/cfQ/bsY/cfY`. Trang web KHÔNG đọc file này (để `data/fin` nhẹ) — nó dành cho nghiên cứu/bộ lọc. `tools/kho_sau.py` dựng |
| `data/news/` `data/profile/` | Tin + báo cáo CTCK · hồ sơ DN, cổ đông, công ty con |
| `data/screen.json` `fund.json` | Dạng CỘT: `f`=tên trường, `d[MÃ]`=mảng giá trị cùng thứ tự |
| `data/market.json` | `breadth` 250 phiên · `global` (CNN F&G) · `race` (đường đua) |
| `data/tapdoan.json` | Bản đồ tập đoàn: nhóm → mã con + % mẹ nắm. `tools/build_tapdoan.py` dựng |
| `data/quy.json` | Danh mục các quỹ: quỹ → mã đang nắm + giá trị + **kỳ công bố**. Cùng script |
| `data/cotuc.json` | Lịch chốt quyền: cổ tức tiền/CP, CP thưởng, phát hành thêm + ngày GDKHQ. `tools/build_cotuc.py` |
| `data/chudiem.json` | Chủ điểm đầu tư **dẫn nguồn SSI** — sơ đồ 3 trục nhập tay + khuyến nghị/giá mục tiêu SSI tự cào. `tools/build_chudiem.py` |
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
- **Hợp đồng `cpvn_live`**: `{at, sess, final, idx, d}`, `d[MÃ]` là mảng **11 phần tử đúng
  thứ tự** `[price, ref, vol, gtgd, fbuy, fsell, high, low, ceil, flr, nt]`. Ba nơi đọc/ghi:
  `core.js`, `bubbles.html`, `congcu.js`. Đổi thứ tự là hỏng giá cả 4 trang. Bản đệm cũ 10
  phần tử vẫn đọc được (thiếu `nt` -> coi như đã khớp lệnh). **`nt` phải nằm trong đệm**,
  bằng không F5 giữa phiên là đệm ghép giá phiên CŨ với tham chiếu HÔM NAY rồi tự chia ra
  phần trăm bịa — xem luật ngay dưới.
- **Mã CHƯA KHỚP LỆNH phiên này mang cờ `nt`** — giá của nó là giá khớp cuối cùng của một
  phiên CŨ (mã thanh khoản kém đứng im hàng tháng). Tuyệt đối không lấy giá cũ đó trừ tham
  chiếu HÔM NAY ra phần trăm, không tô nhãn trần/sàn, không đếm vào độ rộng. Từng để lọt:
  639/1522 mã lệch phiên → 88 mã hiện 1D% giả (NDC −18,65% dù khớp lệnh cuối 23/06), 19 mã
  bị tô trần/sàn giả, hàng Độ rộng đếm 1.422 mã "có giao dịch" trong khi thật sự 883.
  Cờ này do `refresh_daily.py` bước 5 sinh ra và được `core.js`, `bubbles.html`, `congcu.js`,
  `index.html` cùng tôn trọng.
  **VÒNG POLL SỐNG PHẢI TỰ ĐẶT `nt`, ĐỪNG CHỈ XOÁ NÓ.** Cờ mang từ kho EOD chỉ nói về phiên
  HÔM QUA; phiên mới vừa mở là mọi mã chưa khớp lệnh đều mang giá phiên cũ bên cạnh tham
  chiếu hôm nay. Bản cũ chỉ có `if(last>0) c.nt=false` nên sáng 12/08/2026 đo được **22 mã
  hiện phần trăm bịa**, trong đó TUG **+27,04%** và MGR **+22,45%** trên UPCOM biên độ ±15%
  — và vì user hay xếp bảng theo 1D% nên chúng nằm đúng ĐẦU BẢNG, chỗ dễ thấy nhất. Luật:
  `c.nt = last<=0` ở cả ba bản sao (tới được dòng đó thì `boardEmpty` đã false, bảng đang
  sống). Radar cũng cần: nhãn trần/sàn, đếm độ rộng và danh sách "kịch trần" đều đọc `c.nt`
  mà vòng poll của `congcu.js` trước giờ không hề đặt nó.
  > **Vượt biên độ KHÔNG phải lúc nào cũng là lỗi**: UPCOM có mã biên độ **±40%** (ngày giao
  > dịch đầu tiên, hoặc mở lại sau đình chỉ dài) — 12/08/2026 có BEL +38,66% và NWT −39,68%,
  > cả hai đều thật. Kiểm bằng `ceil/ref` của chính mã đó, đừng suy từ tên sàn.
- **LƯỚI CHẶN BIÊN ĐỘ — lớp thứ hai, ĐỘC LẬP với cờ `nt`, đừng gỡ vì "thừa".** Trần và sàn
  nằm CÙNG bản ghi với giá và tham chiếu, cùng nguồn cùng phiên; nên giá lọt ra ngoài
  `[sàn, trần]` là **bằng chứng máy móc** rằng nó không phải giá của phiên này — cấm tính %
  luôn, không cần biết lỗi từ đâu. Cả họ lỗi "lệch phiên" của trang này đều có chung hình
  dạng *giá phiên A ÷ tham chiếu phiên B*, và lớp này chặn được cả họ chứ không riêng một ca.
  Đặt ở **doPoll và applyLive của cả ba bản sao**. Nới 0,1% cho sai số bước giá.
  **KHÔNG áp cho nhánh `boardEmpty`**: buổi tối bảng đã nhảy sang biên độ phiên sau, giá đóng
  cửa phiên này nằm ngoài là đúng bản chất, chặn ở đó là xoá sạch % của cả phiên vừa đóng.
  Ngày đo 12/08/2026 lưới bắt **0 mã** — đúng như mong đợi, vì lớp `nt` đã dọn trước; nó nằm
  đó cho lần luật `nt` thủng theo một kiểu chưa ai nghĩ tới.
- **CHUÔNG BÁO trong pipeline (`refresh_daily` bước 5b) -> `health.json['bien']`.** Cùng phép
  kiểm ấy chạy trên snapshot EOD vừa dựng, đếm số mã có giá ngoài biên độ của chính nó.
  `bien.ngoai > 0` nghĩa là kho đang trộn hai phiên — **đừng đọc thành "vẫn ổn"**. Có nó thì
  lần sau hệ thống tự tố lúc 15:15 thay vì đợi người dùng nhìn thấy rồi báo.
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
- **CÂN ĐỐI KẾ TOÁN / LƯU CHUYỂN TIỀN TỆ: `data/fin` CHỈ GIỮ 8 KỲ, KHO DÀI NẰM Ở `data/finq`.**
  Bốn khối `bsQ`/`cfQ`/`bsY`/`cfY` **ghi đè** mỗi lượt cào (khác `Y`/`Q` đã gom dồn theo nhãn),
  mà nguồn 24hMoney chỉ trả 8 kỳ gần nhất → kỳ cũ nhất rơi khỏi kho vĩnh viễn sau mỗi quý.
  Phát hiện 11/08/2026 khi làm nghiên cứu chu kỳ: chỉ chạy được cân đối kế toán trên 9-15
  tháng, trong khi đúng nhóm chỉ tiêu đó (phải thu/doanh thu IC −14%, tiền từ KD/tổng tài
  sản +13,7%, ROE +13,4%) lại là nhóm cơ bản dự báo TỐT NHẤT đo được. `tools/kho_sau.py`
  bồi từ `api-finfo.vndirect.com.vn/v4/financial_statements` (~79 quý, 22 năm) sang
  `data/finq`; bước 6c của pipeline gọi nó với `--moi` nên chỉ chạy khi có kỳ mới.
  > **DẤU CỦA LƯU CHUYỂN TIỀN TỆ TRONG `data/fin` ĐANG SAI — lấy dấu của VNDirect.**
  > Đẳng thức "CFO + CFI + CFF = lưu chuyển tiền thuần" **sai 10.134/16.761 ô (60%)** trong
  > kho, và 10.132 ô sai đó khớp lại ngay nếu đổi dấu một thành phần. Gốc ở chính nguồn:
  > gọi thẳng 24hMoney cho SZL thì `cfa34` trả về toàn số dương trong khi `cfa26` vẫn có dấu
  > âm đàng hoàng — không phải lỗi `parse_generic`. Cùng phép kiểm trên VNDirect: **1.098/1.098
  > ô đúng**. `data/finq` vì thế lấy số CÓ DẤU của VNDirect cho mọi kỳ của khối `cf*`, còn khối
  > `bs*` (toàn số dương) vẫn ưu tiên số kho. **`data/fin` thì chưa sửa** — chạy
  > `python3 tools/kho_sau.py --va-fin` mới đổi, vì nó đổi thứ trang cổ phiếu đang hiện.
- **KHỐI NGOẠI `fb`/`fs`: lịch sử lấy ở VNDirect, đừng tin mỗi nguồn hằng ngày.** Pipeline chỉ
  biết khối ngoại của PHIÊN HÔM ĐÓ (bảng giá VPS) + bù 30 phiên (24hMoney), nên trước 6/2026
  hai trường này **toàn số 0** — 290/500 mã mẫu không có lấy một số khác 0, mọi phép đo dòng
  tiền ngoại theo lịch sử đều vô nghĩa. `api-finfo.vndirect.com.vn/v4/foreigns` có
  `buyVol`/`sellVol` từng phiên **từ 30/08/2018**, đúng đơn vị CỔ PHIẾU (đối chiếu 37/37 phiên
  chồng nhau của HPG, khớp tuyệt đối). `tools/va_ngoai.py` đã vá **+562.856 phiên trên 1.291 mã**
  (11/08/2026), chỉ 1 mã bị loại vì lệch. Script chỉ điền vào phiên ĐANG TRỐNG và tự đối chiếu
  phần chồng nhau trước khi ghi — chạy lại lúc nào cũng an toàn.
- **BẢN ĐỒ TẬP ĐOÀN dựng TỪ DANH SÁCH CỔ ĐÔNG**, không nhập tay: `data/profile/{MÃ}.json`
  → `sh` có tỉ lệ sở hữu; ai nắm ≥20% của từ 2 mã trở lên là một nhóm. 163 nhóm, 831 lượt mã.
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
  6. **CỔ ĐÔNG CÓ MÃ NIÊM YẾT THÌ GOM THEO MÃ (`ma:XXX`), ĐỪNG GOM THEO TÊN.** Nguồn đã dò
     sẵn mã vào trường `t` của `sh`; bản cũ bỏ qua nó và băm tên ra làm khoá, nên một công
     ty viết hai kiểu tên là đẻ ra hai nhóm rời. Sonadezi dính đúng vậy: `TU_KHOA` bắt chữ
     "sonadezi" còn 8 công ty con lại khai cổ đông là "Tổng Công ty Cổ phần Phát triển Khu
     công nghiệp" (tên pháp lý, không có chữ nào là "sonadezi") → nhóm "Sonadezi" 4 mã đứng
     cạnh một nhóm vô danh 11 mã, **cùng một nhà**. Gom theo mã còn được thêm: biết ngay mẹ
     có niêm yết (để trừ chồng lấn vốn hoá) và lấy đúng tên công ty làm tên nhóm. Nếu mã đó
     là `me` của một nhóm khai tay thì về thẳng nhóm ấy. Sonadezi 4 → 15 mã, phủ 596 → 676.
  7. **Nhóm khai tay được ưu tiên khi giành mã, và mẹ niêm yết LUÔN là hạt giống.** Chỉ xếp
     theo tỉ lệ thì PRE về tay "HDI Global SE" (ngoại nắm 38,9% PVI) thay vì PVN — đúng số
     sai nhà. Còn đợi có mã khai tên mẹ mới mở nhóm thì HPA (không có nổi một dòng cổ đông)
     kéo HPG vào nhóm mang tên "Tran Dinh Long", chẳng ai gọi nhà đó bằng tên ấy.
     Nhóm khai tay còn được **giành lại mã đã nằm trong nhóm gom-theo-mã** (chiều ngược lại
     thì không): PVI là con của PVN mà bản thân cũng là mẹ của PRE — chặn cứng thì PRE ở
     lại nhóm PVI còn PVN mất con, trong khi PRE là con của cả hai theo đúng nghĩa đen.
  8. **Vốn hoá nhóm: mã tới QUA MỘT THÀNH VIÊN KHÁC chỉ tính PHẦN NGOÀI.** Thành viên trung
     gian luôn là mã niêm yết nên vốn hoá của nó đã gồm phần nó nắm — vốn hoá GAS đã gồm
     35% PGS. Trước chỉ trừ được ở tầng mẹ (`co_me`), có cháu chắt rồi mà không trừ là đếm
     hai lần. Dùng **% CẠNH** (cha nắm con) chứ không phải % hiệu dụng của cả nhóm.
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
- **LỊCH CHỐT QUYỀN lấy VNDirect finfo, KHÔNG lấy Simplize.** `api-finfo.vndirect.com.vn/v4/events`
  nhóm `investorRight` là nguồn DUY NHẤT trong các nguồn đang dùng có **sự kiện SẮP TỚI** —
  đã đo: kho sự kiện Simplize (thứ `fetch_div` đang đọc) trả 894 sự kiện trên 60 mã lớn mà
  **không một sự kiện nào có ngày chốt quyền sau hôm nay**. Lịch chỉ có quá khứ là lịch sử,
  không phải lịch. Đối chiếu chéo 170 sự kiện cổ tức tiền đã qua giữa hai nguồn: **khớp
  170/170 ngày**. Ngày hiện ra phải là `effectiveDate` = **ngày giao dịch không hưởng
  quyền**, không phải `actualDate` (ngày tiền về, thường sau cả tháng). Nguồn trả CẢ bản EN
  lẫn VN nên phải lọc `locale=='VN'`, bằng không mọi sự kiện nhân đôi.
- **CHỦ ĐIỂM ĐẦU TƯ: KHÔNG có nguồn SSI nào lấy được tự động cho phần SƠ ĐỒ.** Đã dò hết:
  `iboard-api.ssi.com.vn/research/*` → **401** (đòi đăng nhập), `api.ssi.com.vn/research/*` →
  **404**, `ssi.com.vn/.../bao-cao-phan-tich` chặn máy, và API báo cáo của Simplize **bắt buộc
  có `ticker=`** (để rỗng trả 0 bản ghi) nên không có cửa lấy báo cáo chiến lược toàn thị
  trường. Sơ đồ ba trục nằm trong slide báo cáo chiến lược → **nhập tay** ở bảng `SO_DO` của
  `tools/build_chudiem.py`, SSI ra kỳ mới thì sửa đúng bảng đó và cập nhật trường `ky`.
  **Phần TỰ CẬP NHẬT được** là khuyến nghị + giá mục tiêu từng mã của SSI: đã nằm sẵn trong
  `data/news/{MÃ}.json` (bước 7 cào từ Simplize, 97 báo cáo SSI trên 61 mã) — build_chudiem
  rút bản mới nhất mỗi mã nên chạy SAU bước 7.
  > **GHI NGUỒN LÀ RÀNG BUỘC, KHÔNG PHẢI TRANG TRÍ** — đây là khuyến nghị đầu tư của một đơn
  > vị có giấy phép, chủ trang thì không. Tên nguồn phải nằm ở đầu mục, lời miễn trừ nằm ngay
  > dưới, và ngày ra báo cáo phải đi kèm từng mã (báo cáo cũ thì giá mục tiêu hết giá trị
  > tham chiếu). Đừng rút gọn mấy thứ đó cho gọn mắt.
  > **Giá mục tiêu tính bằng ĐỒNG/cổ phiếu** — nhét vào `ty()` (đơn vị tỷ) thì 105.900 đ hiện
  > thành "0 tỷ", đọc như đang khuyên mua một mã vô giá trị.
- **ĐIỀU HƯỚNG: MENU THẢ XUỐNG KHI RÊ CHUỘT (10/08/2026) — nay CHỈ CÒN CHO MÁY BÀN.**
  Từ 11/08/2026 khổ ≤760px ẩn hẳn dải này (`header .tabs{display:none!important}` trong
  `mobi.css`) và dùng thanh tab đáy — xem mục **Giao diện mobile** bên dưới. Mọi luật rê
  chuột/chạm dưới đây vẫn đúng, nhưng chỉ còn chạy ở khổ rộng (kể cả tablet cảm ứng >760px).
  Bảng giá · Radar · Đường đua, mỗi mục có menu con hiện khi rê chuột (`.tw:hover>.dd`).
  Bảng giá → 3 trang (`index.html` · `bubbles.html` · `congcu.html?m=tapdoan`);
  Radar → Nhịp phiên · Chủ điểm đầu tư; Đường đua → Đường đua vốn hoá · Đầu tư bền vững.
  Bản trước để mục con thành dải LUÔN HIỆN dưới header + dải tab riêng trong Radar — ăn
  một hàng cố định trên mọi trang chỉ để chờ người ta bấm. Cả hai dải đã gỡ.
  Năm thứ phải giữ, thiếu cái nào là menu hỏng:
  1. **`.tabs` phải `overflow:visible` ở MỌI khổ màn, kể cả trong media query.** Khung tab
     vốn `overflow-x:auto`, để nguyên là menu bị cắt cụt. Bẫy 11/08/2026: rule gốc đã sửa
     thành `visible` nhưng khối `@media(max-width:760px)` NẰM SAU lại đặt lại
     `overflow-x:auto` cho dải tab — và **đặt một trục khác `visible` là trình duyệt tính
     luôn trục kia thành `auto`**, nên trên điện thoại menu bị xén gọn trong dải tab cao
     32px, bấm vào tưởng như không có gì hiện ra. Đừng cho dải tab cuộn ngang: ba mục ngắn,
     màn 320px vẫn thừa chỗ (đã đo cả bốn trang). Kèm `.tw:last-child>.dd{left:auto;right:0}`
     ở khổ hẹp để mục cuối không tràn mép màn.
  2. **Cầu nối vô hình `.dd::before`** bắc qua khe 6px giữa tab và menu, không có nó thì rê
     chuột xuống là rời vùng hover, menu tắt giữa đường.
  3. **MÀN CẢM ỨNG PHẢI MỞ BẰNG `pointerdown`, TUYỆT ĐỐI ĐỪNG ĐỢI `click`.** Đã đo trên máy
     ảo Android: một cú chạm vào mục cha chỉ đẻ ra `pointerdown → touchstart → mouseover`,
     **KHÔNG có `click`** — vì cú chạm làm hiện nội dung đang ẩn thì trình duyệt nuốt luôn
     nó. Bản cũ treo toàn bộ mạch mở menu lên `click` nên `.mo` không bao giờ được gắn; menu
     chỉ thỉnh thoảng loé lên nhờ `:hover` GIẢ LẬP còn dính lại, đúng triệu chứng user báo
     là "bấm rất nhiều lần mới hiện". Hai vế đi kèm:
     · **`.tw:hover>.dd` phải nằm trong `@media(hover:hover)`** — để hover giả lập chạm được
       vào là lại sinh ra đúng cái cảnh nuốt cú chạm.
     · **Phân biệt chuột/chạm THEO TỪNG SỰ KIỆN (`e.pointerType`), đừng hỏi `matchMedia` một
       lần lúc nạp trang** — iPad và laptop cảm ứng khai `hover:hover` mà vẫn chạm bằng tay.
     Chạm vào mục cha là MỞ/ĐÓNG, không đi đâu cả (mục con đầu tiên của mỗi nhóm chính là
     trang của mục cha). Cú `click` sinh ra sau cú chạm phải bị chặn bằng `preventDefault` +
     **`stopImmediatePropagation`** — congcu.js gắn `onclick` đổi module lên đúng thẻ đó, không
     chặn thì chạm một cái vừa mở menu vừa nhảy module.
  4. **Đổi chế độ Đường đua phải BẤM THẲNG nút `#raMode`**, đừng dựng lại module: nút đó mới
     là chỗ chạy `syncMode` (dừng animation, về vạch xuất phát, đổi khung đồ thị). Dựng lại
     module tưởng gọn mà chế độ không đổi — đã dính đúng vậy.
  `?t=` trên URL chọn sẵn tab bên trong (`t=cd`, `t=dca`…) để trang khác trỏ thẳng vào.
  "Danh mục tập đoàn" chạy trên congcu.html nhưng THUỘC nhóm Bảng giá — `renderNav` phải tự
  tay bật `.on` cho mục cha đầu tiên khi `cur==='tapdoan'`.
  Radar nay chỉ còn **Nhịp phiên · Chủ điểm đầu tư**; tập đoàn và quỹ đã dọn sang module
  riêng vì khác nhịp hẳn: radar soi TRONG PHIÊN, còn cấu trúc sở hữu cả tháng mới nhúc nhích.
- **BỨC TRANH TOÀN CẦU (radar `?t=tg`) — bản đồ thế giới tô theo chỉ số từng nước.**
  Màu theo luật CK Việt Nam: **xanh = tăng, đỏ = giảm**, đậm dần tới ±3%. Cố ý khác
  Trung/Nhật/Hàn (bên đó đỏ là tăng) vì người đọc là nhà đầu tư Việt.
  **NGUỒN: CNBC** `quote.cnbc.com/quote-html-webservice/...` — nguồn DUY NHẤT dò được vừa
  miễn phí vừa **mở CORS** nên trình duyệt gọi thẳng, khỏi qua kho. Đã dò và loại:
  **Yahoo Finance trả 429** (chặn theo IP — *bản dự phòng VIX trong `build_screen.py` cũng
  đang chết vì lý do này, chưa sửa*), **Stooq** chặn bằng thử-thách JavaScript, **TradingView**
  thì dự án đã chốt không phụ thuộc. 26 nước lấy được; **Indonesia · Ả Rập Xê Út · Nga ·
  Nam Phi nguồn không có** — phải ghi ra chứ đừng để bản đồ xám rồi người xem tự đoán.
  **Việt Nam lấy VN-Index của chính trang**, không lấy lại của CNBC (số họ trễ pha).
  **44 nước** sau đợt mở rộng 13/08/2026 (dò 90 mã trên 63 nước). **`UNCH` CÓ HAI NGHĨA,
  phải tách ra — đây là bản sao của con bệnh cờ `nt`, chỉ khác nguồn:**
  · `last` ≠ `previous_day_closing` → phiên đóng đúng bằng tham chiếu, **0% là thật**;
  · `last` = `previous_day_closing` **tới từng chữ số** → nguồn đã lật sang PHIÊN MỚI và
    chưa có lệnh khớp nào, **0% ở đây là bịa**. Đo lúc 03:00 giờ VN: **8 nước trong rổ cũ**
    (Đức, Pháp, Thuỵ Sĩ, Tây Ban Nha, Hà Lan, Thuỵ Điển, Thổ, Israel) đang ở trạng thái này
    — bản trước tô vàng "tham chiếu" cho gần hết châu Âu trong khi họ vừa đóng cửa với mức
    tăng giảm thật. Không biết thì để TRỐNG (`p=null`, cờ `moi`, hiện "chưa khớp phiên mới"),
    đừng vẽ 0.
  **Loại `.IDX`** — nguồn trả "S&P 400 MidCap" của MỸ chứ không phải Indonesia; tên và
  `countryCode` phải khớp nước trước khi nhận, đừng tin mỗi cái mã.
  Bốn cái bẫy:
  1. **`curmktstatus` của CNBC LÀ HẰNG SỐ, đừng tin.** Nó trả `REG_MKT` cho MỌI mã — kể cả
     Nikkei lúc 15:45 JST (Tokyo đóng 15:00) và Thái Lan với con số của hôm trước. Bản đầu
     dán nhãn "đang mở / đã đóng" theo nó là **nói sai một cách trông rất chắc chắn**. Nay
     tự tính TUỔI của số từ `last_time` (ISO có sẵn lệch múi giờ) và hiện "9 giờ trước" /
     "phiên trước". Trên bản đồ trải 24 múi giờ thì tuổi mới là thứ người xem cần.
  2. **KHÔNG được nói đây là ảnh chụp cùng một thời điểm.** Lúc VN giao dịch thì châu Âu
     chưa mở, Mỹ đã đóng từ đêm qua. Gộp thành "thế giới hôm nay" là nói dối.
  3. **`change_pct` là CHUỖI** kiểu `"+0.83%"`, và **`"UNCH"` khi đứng giá** — `parseFloat`
     ra `NaN` nên phải bắt riêng, bằng không New Zealand thành "không có dữ liệu".
     `last_time` của Thái Lan có khi chỉ là `"2026-08-11"` (không giờ) — vẫn ra "phiên trước".
  4. **Cột hẹp KHÔNG làm bảng gọn.** Bản đầu để danh sách 4 cột 258px: tên nước bị cắt thành
     "New Zeal…", cột giờ `nowrap` tràn đè sang thẻ bên cạnh. Nay tối thiểu **430px/cột**
     (màn 1280 ra 2 cột), dưới 900px về 1 cột.
  **Hình bản đồ**: `assets/worldmap.json` (74KB, 174 nước) do `tools/build_worldmap.py` dựng
  từ Natural Earth 110m — **chạy MỘT LẦN, không nằm trong pipeline** (biên giới không đổi
  theo phiên). Phép chiếu **Equal Earth**, chọn vì đây là bản đồ TÔ MÀU: Mercator phóng
  Greenland to hơn châu Phi và Nga chiếm nửa bản đồ, mắt đọc thành "cả thế giới đang đỏ"
  trong khi mấy khối đó không có sàn nào đáng kể.
  > **Douglas–Peucker trên VÒNG KHÉP KÍN phải cắt vòng trước.** Vòng GeoJSON có điểm cuối
  > trùng điểm đầu nên đoạn mốc dài 0, mọi khoảng cách ra 0, và **cả 174 nước bị rút còn 2
  > điểm** — lượt chạy đầu ra đúng "0 nước". Cách chữa: bỏ điểm khép, lấy điểm xa nhất cắt
  > thành hai đường hở rồi mới làm mượt.
  > **Singapore và Hồng Kông không có hình ở độ phân giải 110m** — vẽ bằng CHẤM TRÒN đặt tay
  > tại toạ độ trung tâm tài chính (bảng `CHAM` trong script).
  **THANG MÀU: nội suy MÀU THẬT theo từng giao diện, KHÔNG tô bằng alpha đè lên nền.**
  Bản đầu dùng `rgba(...,a)`: trên nền TỐI thì rực, nhưng cùng alpha ấy đè lên nền SÁNG ra
  pastel — cả bản đồ nhợt, chỉ nước gần kịch thang mới nhìn thấy, và nền biển trắng gần
  bằng nền trang nên lục địa trôi lơ lửng (user báo "loá mắt và không rõ"). Ba thứ chữa cùng
  lúc, gỡ cái nào cũng nhợt lại:
  ① **Bảng `TG_THANG`** khai hai đầu màu riêng cho `light`/`dark` rồi nội suy RGB — vẫn cấm
  `color-mix()` (html2canvas không hiểu). ② **Nền biển phải KHÁC HẲN nền trang** và đất
  không-có-số phải là xám ĐẶC, bằng không không phân biệt được biển với lục địa.
  ③ **Mốc đậm nhất ±2%, không phải ±3%, và gamma 0,6 chứ không tuyến tính** — đây là chỉ số
  cả sàn chứ không phải một cổ phiếu: phần lớn phiên các nước chỉ chạy ±0,3–1%, để thang
  rộng và tuyến tính thì ngày thường cả bản đồ nằm ở một phần ba dưới của thang.
  Dải màu ở chú thích **dựng từ chính `tgMau()`**, đừng viết cứng lần nữa trong CSS — hai
  chỗ sẽ trôi khỏi nhau ngay lần chỉnh thang tiếp theo.
  Nút đổi đèn của congcu.js dựng lại module (`showMod`) nên màu tự tính lại, không cần
  listener riêng — nhưng ĐỪNG bỏ bước dựng lại đó, bằng không đổi đèn là bản đồ giữ nguyên
  màu của giao diện cũ.
  **GỘP VÀO RADAR PHIÊN (13/08/2026), KHÔNG còn tab riêng.** Bản đồ đứng ngay đầu Radar
  phiên, thay cho cụm ba thẻ cũ (nhịp sợ hãi trong nước / toàn cầu / tóm tắt chỉ số) — cụm
  đó lặp lại thứ đã có ở thanh đầu trang và ăn nguyên một màn trước khi thấy nội dung thật.
  `?t=tg` vẫn mở được (rơi về `phien`) cho link cũ.
  > **`startLive` phải gọi `veLaiTrongNuoc()` chứ không `render()` cả module.** Radar phiên
  > nay CHỨA bản đồ, mà bản đồ tự cập nhật tại chỗ theo nhịp riêng — dựng lại cả module là
  > giết mọi thẻ nước đang mở, cứ ~1 phút một lần. `veLaiTrongNuoc` NHẤC node `#rdTg` ra rồi
  > cắm lại (không clone — clone là mất sạch listener kéo thẻ).
  **NHÃN IN THẲNG LÊN BẢN ĐỒ**, không còn bảng dài ở máy bàn. 44 nhãn không nhét hết vào
  1000×439 nên xếp THAM LAM: ưu tiên nước biến động mạnh nhất, thử 9 chỗ quanh nước, hết
  chỗ thì bỏ nhãn (nước vẫn còn màu và vẫn rê/bấm được). Ba thứ phải giữ:
  ① **VIỆT NAM ưu tiên tuyệt đối** (`uu=1e9`), không xếp theo biên độ như nước khác — đây là
  trang chứng khoán Việt, để nó tranh chỗ bằng biên độ thì một phiên đi ngang (+0,13%) là
  mất nhãn, nhường chỗ cho Thái Lan. Đã dính đúng vậy ở lượt đầu.
  ② **Phép đo chỗ trống phải theo ĐÚNG cỡ chữ của từng khổ màn.** Cỡ chữ khai bằng đơn vị
  viewBox nên co theo bản đồ: màn 327px thì 1 đơn vị chỉ còn 0,33px, chữ 7,4 đơn vị ra
  **2,9px** — không đọc nổi. Màn hẹp phải khai 25 đơn vị (≈8px thật), và thuật toán phải
  biết mà đo bằng hằng số của khổ đó, bằng không nó tưởng nhãn vẫn bé tí và xếp đủ 38 cái
  chồng lên nhau. Đo bằng hộp bao thật: máy bàn 38 nhãn / màn hẹp 18 nhãn, **chồng lấn 0 px²**.
  ⓪ **KHÔNG có thanh chú giải xanh–đỏ** (user chốt 13/08/2026): xanh tăng đỏ giảm là quy
  ước người chơi chứng khoán nào cũng biết, giải thích lại chỉ tốn một hàng.
  ③ **KHÔNG còn bảng "Chỉ số từng nước" ở bất kỳ khổ nào** — user chốt 13/08/2026, kể cả
  màn hẹp: nó ăn hơn 400px chiều cao chỉ để lặp lại thứ bản đồ đã nói. Hệ quả phải chấp
  nhận: màn hẹp chỉ đặt nổi ~18 nhãn nên phần còn lại chỉ có MÀU; muốn biết tên và số thì
  **chạm vào nước đó** để bung thẻ. Đừng đề xuất dựng lại bảng.
  **HAI CHỈ SỐ SỨC MẠNH nằm trong GÓC DƯỚI-TRÁI bản đồ** (Nam Thái Bình Dương — trống ở
  mọi phép chiếu, không nước nào có sàn). Trước ở cụm ba thẻ đầu trang, cụm đó đã bỏ.
  Dựng bằng **HTML phủ lên**, không phải `<text>` trong SVG: chữ trong SVG co theo viewBox
  nên màn hẹp teo còn 3px. Ba thứ đi kèm:
  ① **Giữ chỗ tay cho hộp trong `tgNhan`** (`oc` khởi tạo sẵn một ô ở góc đó) — thuật toán
  xếp nhãn không nhìn thấy hộp HTML, không khai thì có ngày một nước Nam Mỹ được đặt nhãn
  ngay dưới hộp rồi biến mất.
  ② **Hộp phải đứng SAU `<svg>` trong DOM** — cùng bài học với `#tgPops`: màn hẹp nó thôi
  neo và chảy theo dòng, đứng trước thì nhảy lên TRÊN bản đồ.
  ③ **Màn hẹp phải XẾP DỌC trong từng ô.** Giữ lưới hai cột như máy bàn thì ô chỉ rộng
  ~160px, con số bị đẩy tràn ra ngoài và cụt mất.
  **Đã BỎ cụm chú thích dài dưới bản đồ** (múi giờ, dữ liệu chậm, danh sách nước thiếu,
  ghi nguồn) — user thấy rườm. Phần ghi nguồn CNBC và Natural Earth vì thế **chỉ còn trong
  tài liệu này**; nếu sau có ai hỏi nguồn thì trả lời từ đây.
  **BẤM VÀO MỘT NƯỚC -> bung bảng CỔ PHIẾU TRỤ CỘT** (rê chuột vẫn chỉ ra thẻ nhỏ — hai mức
  thông tin, liếc thì rê, soi kỹ thì bấm). Bảng nổi ĐÈ LÊN bản đồ, không chen vào giữa trang.
  > **KHÔNG được gọi đây là "10 mã vốn hoá lớn nhất" cho nước ngoài.** CNBC trả giá và % nhưng
  > **không trả vốn hoá** (đã dò hết 36 trường), và không có API danh sách thành phần chỉ số
  > nào mở CORS — nên `TG_RO` là rổ TRỤ CỘT **chọn tay**, nhãn phải nói đúng như vậy.
  > **Riêng Việt Nam xếp ĐÚNG theo vốn hoá** vì kho của chính trang có SLCP và giá sống.
  **Dạng mã của CNBC mỗi sàn một kiểu — đã dò 250 mã mới ra quy luật, đừng đoán:** Mỹ dùng mã
  trần (`AAPL`); phần lớn còn lại `MÃ-CC` (`SAP-DE`); Nhật `SỐ.T-JP`; **Hồng Kông `SỐ-HK`
  nhưng phải BỎ SỐ 0 ĐẦU** (`700-HK` chạy, `0700-HK` trả rỗng); Thuỵ Điển `MÃ.HẠNG-SE`
  (`VOLV.B-SE`); Anh có mã kết thúc bằng dấu chấm (`BP.-GB`).
  **Nguồn KHÔNG có cổ phiếu đơn lẻ của Hàn Quốc, Mexico, Thổ Nhĩ Kỳ** — bấm vào ba nước đó
  thì nói thẳng ra, đừng để bảng trống. **Đã kiểm chứng HAI đường** (user hỏi lại "cái này là
  thật ư", và đó là câu hỏi đúng — Hàn Quốc có Samsung, SK Hynix, không lý gì thiếu):
  ① API báo giá trả rỗng cho **cả 44 dạng mã** của 005930/000660/005380 (mọi tổ hợp hậu tố
  `-KR -KS -KQ -KP -SK -KO -KRX .KS .KQ` và biến thể); ② **trang quote của chính cnbc.com trả
  404** cho `005930.KS-KR` và `005930-KR`, trong khi cùng lúc trả 200 cho `.KS11` (KOSPI),
  `AAPL`, `7203.T-JP`. Thứ duy nhất dò ra là `SMSN-GB` — chứng chỉ lưu ký Samsung niêm yết ở
  **London**, `countryCode=GB`, khác sàn khác tiền tệ khác phiên; **đừng gán nó vào thẻ Hàn
  Quốc** cho đủ mặt, đó là nói sai sàn.
  **NHIỀU THẺ CÙNG LÚC, MỖI THẺ NEO CẠNH CHÍNH NƯỚC ĐÓ, RUỘT LÀ LƯỚI Ô NHIỆT.** Ba luật:
  1. **Không có lớp nền mờ phía sau.** Bản đầu là một bảng chắn giữa bản đồ có backdrop —
     mở xong thẻ đầu là không bấm được nước thứ hai, mà so hai thị trường với nhau mới đúng
     là việc người ta làm ở đây. Bấm lại vào nước đang mở thì đóng thẻ ấy; bấm vào thẻ thì
     nó nhảy lên trên (mấy nước sát nhau thì thẻ chồng nhau).
  2. **Lớp thẻ `#tgPops` phải đứng SAU thẻ `<svg>` trong DOM.** Ở màn hẹp lớp này thôi neo
     và chảy theo dòng; đứng trước thì cột thẻ mọc NGAY TRÊN ĐẦU bản đồ — đã dính đúng vậy,
     thẻ dựng ra rồi mà cuộn tới bản đồ thì không thấy đâu.
  3. **Màn hẹp: thẻ NỔI ĐÈ LÊN bản đồ, đặt GIỮA, MỖI LẦN MỘT NƯỚC** (user chốt 13/08/2026).
     Bản đồ ở khổ đó chỉ 329×146 nên không neo cạnh nước được — thẻ gần to bằng cả bản đồ,
     và hai thẻ là chồng kín nhau, không so được gì. Mở nước mới thì thẻ cũ tự đóng.
     **Thẻ phải VỪA chiều cao bản đồ**: khung ngoài xén, cao hơn là mất hai dòng cuối của
     lưới ô nhiệt — bỏ dòng chú thích trong thẻ và bóp ô lại là vừa (127px trong 146px).
  4. **Hộp chỉ số sức mạnh ở màn hẹp cũng NẰM TRONG bản đồ, và phải HẸP HƠN ARGENTINA.**
     Ở khổ 329×146, Argentina nằm quanh x=104..117px — hộp một dòng rộng 128px trùm kín nó.
     Nên NHÃN XUỐNG DÒNG (2–3 dòng) + hạ cỡ chữ để hộp chỉ còn **62px**, và bỏ chữ
     "Trung tính"/"Lạc quan" (con số đã tự mang màu). Đo bằng hộp bao thật: hộp kết thúc ở
     x=66, không chạm Argentina. Ô giữ chỗ trong `tgNhan` phải khai theo cỡ hộp này.
  5. **`#tgMap` bọc riêng thẻ `<svg>`** để hộp chỉ số neo vào đúng khung BẢN ĐỒ. Neo vào
     `#tgWrap` thì màn hẹp sai chỗ: lúc đó lớp thẻ nước chảy theo dòng làm `#tgWrap` cao hơn
     bản đồ, `bottom:6px` rơi xuống dưới bản đồ.
  **PHÓNG TO / KÉO BẢN ĐỒ — CHỈ KHỔ HẸP (user chốt 13/08/2026).** Hai ngón xoè ra = phóng
  TẠI ĐIỂM ĐANG THAO TÁC · một ngón = kéo bốn hướng · nút góc 1 giờ = về khung ban đầu.
  Làm bằng **`viewBox` của thẻ `<svg>`**, không phải `transform`: cả hình nước, chấm tròn
  lẫn nhãn cùng đi theo một khung toạ độ, và `vector-effect:non-scaling-stroke` của `.tgc`
  giữ nét biên giới đúng một bề dày ở mọi mức phóng. Khung nhìn nằm ở **`TG.view`** chứ
  không đọc ngược từ DOM — panel bị dựng lại mỗi lần đổi đèn, đọc từ DOM là mất mức phóng
  người dùng vừa đặt. Máy bàn KHÔNG có mục này (đã đo: chuỗi nhãn sinh ra khớp từng ký tự
  với bản trước, cỡ chữ inline bằng đúng cỡ CSS cũ 7,4/7,2).
  Năm thứ phải giữ, thiếu cái nào là hỏng theo một kiểu riêng:
  1. **`touch-action` ĐỔI THEO MỨC PHÓNG.** Chưa phóng → `pan-y`: bản đồ vừa khít khung,
     không có gì để kéo dọc, nên nhường trục dọc cho TRANG cuộn — trói cứng ở đây thì vuốt
     trúng dải bản đồ cao 146px là trang đứng im. Đã phóng (`#tgMap.tgz`) → `none`: lúc đó
     kéo dọc mới là để xem phần đang khuất, phải giành trọn cử chỉ (cùng bài học với canvas
     của `chart.js` — nhường một trục là `preventDefault` bị bỏ qua). Hai ngón thì cả hai
     mức đều về tay JS vì `pan-y` đã cấm trình duyệt tự phóng trang.
  2. **NHÃN PHẢI CHIA THEO MỨC PHÓNG.** Cỡ chữ khai trong CSS là cố định, phóng 4 lần là
     chữ cũng to gấp 4 trên màn, trùm kín chính mấy nước vừa phóng vào để xem. `tgNhan` nhận
     thêm tham số `view`, chia `CH`/`RC`/cỡ chữ/bề dày quầng cho mức phóng rồi ghi **inline**
     vào từng thẻ (inline thắng class, khỏi `!important`). Kèm theo: chỉ xếp nhãn cho nước
     ĐANG NHÌN THẤY — nhờ vậy phóng vào Đông Á là mấy nhãn bị bỏ ở mức 1× hiện đủ (đo: 20
     nhãn ở 1× → 18 nhãn cho riêng vùng đang xem, chồng lấn 0 px²).
  3. **Chấm tròn Singapore/Hồng Kông cũng chia theo mức phóng** (`r=7,5/z`). Không chia thì
     phóng 4 lần là hai cái chấm trùm kín Đông Nam Á.
  4. **GIỮ CHỖ cho cả hộp chỉ số LẪN nút về khung gốc.** Cả hai dựng bằng HTML phủ lên nên
     thuật toán xếp nhãn không nhìn thấy. Hộp chỉ số neo GÓC MÀN nên trong hệ viewBox nó
     trôi theo khung nhìn và co theo mức phóng — khai `{l:V.x, t:V.y+V.h-bh}` chứ không phải
     góc bản đồ. Nút thì chỉ mọc khi đã phóng nên cũng chỉ giữ chỗ lúc đó (116 đơn vị
     viewBox ở mức 1× ≈ 38px thật).
  5. **Chặn cú `click` sinh ra sau khi kéo** (`TG.keoLuc`, cửa 400ms). Không chặn thì kéo
     bản đồ một cái là bung luôn thẻ của nước nằm dưới ngón tay.
  Nút về khung gốc **chỉ hiện khi đã phóng hoặc đã kéo** — một cái nút không làm gì ở trạng
  thái mặc định chỉ tổ chiếm chỗ trên tấm 329×146. Cạnh 32px, **cố ý dưới ngưỡng chạm 44px**
  của khung mobile: trên bản đồ cao 146px thì nút 44px ăn gần một phần ba chiều cao, che mất
  chính thứ nó phục vụ.
  **Ô nhiệt phải là ô MỘT DÒNG** (mã trái, % phải). Xếp chồng hai dòng thì thẻ cao 280px,
  cao hơn cả bản danh sách nó thay thế — mất luôn lý do đổi sang ô nhiệt; một dòng còn 179px.
  **Ô ĐỀU NHAU, không chia theo vốn hoá** — nguồn không trả vốn hoá cho cổ phiếu nước ngoài
  nên vẽ ô to nhỏ khác nhau là bịa ra một trọng số. **Chữ trên ô tự chọn đen/trắng** theo độ
  sáng của chính ô (`tgChu`, ngưỡng 0,62): thang chạy từ nhạt tới đậm nên để cứng một màu chữ
  là nửa số ô không đọc nổi. Mã quá dài (sàn Ấn) rút gọn qua bảng `TG_TEN`, tên đầy đủ vẫn ở
  `title` — không rút thì ô hẹp cắt thành "BHARTIA…".
  **BỐN SÀN ĐÁNH MÃ BẰNG SỐ — phải hiện TÊN, không hiện mã.** Thượng Hải (600519), Tokyo
  (7203), Hồng Kông (700), Đài Bắc (2330) đều dùng mã số; đó là mã thật của sàn, không phải
  lỗi, nhưng một thẻ toàn số thì không ai đoán ra công ty nào — user hỏi ngay "mã chứng
  khoán Trung Quốc lạ vậy". Bảng `TG_TEN` rút tên từ CHÍNH tên nguồn trả về (Moutai, ICBC,
  PetroChina, Toyota, Tencent, TSMC…), mã số gốc và tên đầy đủ vẫn nằm ở `title`. Sàn dùng
  mã CHỮ gợi nhớ (AAPL, SAP, BMW, NESN) thì giữ nguyên mã: ngắn và là thứ đem đi tra cứu.
  **CHỖ ĐẶT THẺ: chấm điểm tám vị trí quanh nước, đừng chỉ có một.** Bản đầu luôn đặt chéo
  xuống phải nên hai nước gần nhau là thẻ chồng gần kín nhau — mở cụm châu Á ra là không đọc
  được gì. Nay phạt NẶNG diện tích chồng lên thẻ đang mở, phạt NHẸ khoảng cách tới nước, nên
  nó tự tìm chỗ trống GẦN NHẤT. Kèm **kéo thẻ bằng thanh tiêu đề** để tinh chỉnh; vị trí đã
  kéo nhớ theo **tỉ lệ khung** chứ không phải px, để đổi cỡ cửa sổ thẻ không trôi ra ngoài.
  Thanh tiêu đề phải `user-select:none` + `touch-action:none`, bằng không kéo một cái là bôi
  đen chữ. Màn hẹp không kéo (thẻ xếp cột).
  **NHỊP LÀM MỚI RIÊNG, KHÔNG ĂN THEO PHIÊN VIỆT NAM.** `startLive()` của trang khoá theo
  `sessionOpenVN()` (9:00–15:00 T2–T6) vì nó sinh ra để bơm giá cổ phiếu trong nước — nhưng
  thế giới giao dịch đúng lúc VN đã nghỉ: **Mỹ mở 20:30 giờ VN, châu Âu chạy tới nửa đêm**.
  Ăn theo nhịp đó thì mở bản đồ lúc 9 giờ tối để xem Mỹ là số đứng im. Nên mục này có
  `tgNhip()` riêng: hỏi mỗi 20s, chỉ GỌI MẠNG khi số cũ quá 2 phút (cùng ngưỡng với lượt vẽ
  đầu nên hai đường không giẫm chân nhau), tự tắt khi rời tab.
  Hai thứ bắt buộc đi kèm:
  1. **Cập nhật TẠI CHỖ (`tgVeLai`), không dựng lại panel.** Dựng lại là mọi thẻ nước đang
     mở bay sạch mỗi 2 phút. Cùng lý do, `startLive` phải **bỏ qua việc vẽ lại module radar
     khi đang ở tab toàn cầu** — bằng không mỗi lượt bơm giá trong nước lại giết thẻ.
     `tgVeLai` cập nhật: màu từng nước, ô đếm tăng/giảm, danh sách chỉ số, và **cả ruột từng
     thẻ đang mở** (xoá đệm `TGC[iso]` rồi lấy lại) — thẻ để mở cả tiếng mà giá vẫn là lúc
     mới bấm thì tệ hơn là không cập nhật gì.
  2. **Tôn trọng cờ `?forcelive`** y như `startLive`: khung xem tự động luôn báo
     `document.hidden=true` nên không có cờ này thì không thể kiểm thử được nhịp — đã dính,
     chờ đủ 2 phút 41 giây mà số không đổi, tưởng hỏng.
- So sánh ngày là **so chuỗi `'YYYY-MM-DD'`**.
- **CHIP LỌC "LẦN ĐẦU TRONG THÁNG RSI > n" (n chọn 70/75/80) — kho ghi MỘT CON SỐ, không
  ghi cờ.** `build_screen.analyse()` tính `rsiPM` = **RSI cao nhất các phiên TRƯỚC ĐÓ trong
  cùng tháng dương lịch** (rỗng = hôm nay là phiên đầu tháng), nối vào **cuối** `FIELDS`.
  Client hỏi: `rsi > n && (rsiPM == null || rsiPM <= n)`.
  > **Đừng quay lại kiểu cờ 1/0 cho từng ngưỡng.** Bản đầu ghi `r80m` cho riêng mốc 80; user
  > hỏi thêm 70 và 75 là kho phải đẻ ba trường và mỗi ngưỡng mới lại phải dựng lại toàn bộ
  > `screen.json`. Một con số thì ngưỡng NÀO cũng hỏi được, không chỉ ba mức đang bày ra.
  Client KHÔNG tự tính được phần lịch sử: kho chỉ báo chỉ giữ giá trị của PHIÊN GẦN NHẤT.
  Dò NGƯỢC từ hôm nay và **dừng ngay khi lùi sang tháng trước** — "trong tháng dương lịch",
  không phải "trong 30 phiên". Vì sao phải là "lần đầu" chứ không phải "đang trên ngưỡng":
  đo phiên 12/08/2026 — ngưỡng 80 có **137 mã đang trên** nhưng chỉ **4** là lần đầu; ngưỡng
  75: 155 → 10; ngưỡng 70: 194 → 14. Mã nóng nằm trên ngưỡng cả chục phiên liền, ngày nào
  cũng lọt thì tín hiệu mất hết ý nghĩa.
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
  **Ngưỡng thật của việc gộp là ĐƯỜNG ĐUA, không phải bảng giá**: đường đua chỉ nhận mã vốn
  hoá ≥1.000 tỷ nên một ngành 15 mã trên bảng giá có thể chỉ còn 1-3 mã lúc chạy đua —
  "Than" đúng 1 mã, "Hàng gia dụng" 1, "Bán buôn hàng công nghiệp tổng hợp" 1. Đo bằng
  ngưỡng đó khi cân nhắc gộp, đừng đo bằng tổng số mã. Lượt gộp 10/08/2026 đưa 35 → **25
  ngành, ngành nhỏ nhất còn 6 mã** trong đường đua (chỉ "Khác" còn 2): dầu khí thượng nguồn
  + dịch vụ dầu khí, xây dựng dân dụng về xây dựng, than về khai khoáng, giấy về bao bì,
  hàng không về cùng khách sạn (Du lịch & Giải trí), ba rổ "đa ngành/thương mại" nhập một,
  công nghệ + viễn thông nhập một, hoá chất + hàng gia dụng nhập một.
  **Nguồn KHÔNG có ngành "Nông nghiệp"** — nông nghiệp/thuỷ sản/mía đường nằm trong "Thực
  phẩm và thuốc lá". Tách ra được nhưng phải viết tay danh sách mã, `SECTOR_EXPLICIT` chỉ
  ánh xạ ngành→ngành nên không tách nổi một ngành làm đôi.
- **Đường đua lấy MỌI mã có SLCP**, không cắt bớt. Bản cũ chỉ lấy top 40 toàn thị trường +
  top 10 mỗi ngành (401 mã) nên chọn ngành ngân hàng ra đua chỉ thấy 14/30 mã, gõ TPB/ABB
  vào ô mã thì báo "không có trong dữ liệu đua" — người dùng không có cách nào biết rổ bị
  cắt. `data/market.json` vì thế nặng 612KB (nén còn 132KB), chấp nhận được.
  Mã CHƯA có giá ở tháng bắt đầu (niêm yết sau) vẫn bị loại — nhưng phải LIỆT KÊ RA
  (`chuaCo`), không được im lặng.

## Giao diện mobile — mẫu A "Bảng điện" (user chốt 11/08/2026)

Sống trong `@media(max-width:760px)`. **Máy bàn không đổi một pixel** — mọi commit của lượt
này đều đo lại để chứng minh điều đó, giữ nếp ấy.

**Không đẻ ra bản mobile thứ hai.** Bảng giá vẫn nguyên 13 `<td>` như máy bàn, chỉ đổi CSS —
nên toàn bộ mạch sort/lọc/sao theo dõi/phân trang/giá sống dùng chung. Dựng HTML riêng cho
mobile là hai bản trôi dạt khỏi nhau ngay lần sửa sau. Cùng lý do: `mobi.js` **di chuyển**
nút có sẵn chứ không chép ra bản thứ hai (nút gốc đã gắn sự kiện rồi).

### Khung điều hướng (`assets/mobi.css` + `assets/mobi.js`, dùng chung 4 trang)

**Thanh tab đáy 3 mục**: Bảng giá · Radar · Đường đua. Cầm một tay thì ngón cái với thoải mái
vùng dưới, hai góc TRÊN là chỗ khó với nhất — mà menu cũ nằm đúng trên đỉnh và xổ ra khi *rê
chuột*, thao tác không tồn tại trên điện thoại.

**Bảng giá SẠCH HOÀN TOÀN** — không dải mục con nào, mở ra là thấy mã ngay.
**Radar là cửa vào bốn góc soi thị trường**: Bong bóng · Chủ điểm · Tập đoàn · Về bờ. Bong
bóng và Tập đoàn có trang riêng nên đi bằng link thật; Chủ điểm và Về bờ nằm **cùng trang
radar** nên nút bấm thẳng vào mục tương ứng trong menu máy bàn (`.dd a[data-md][data-t]`, đã
ẩn) để `congcu.js` đổi tab tại chỗ — đúng lối đã dùng cho nút đổi chế độ Đường đua. Dải hiện
ở cả ba trang của nhóm và thanh đáy sáng ở Radar trên cả ba, bằng không vào Bong bóng là mất
đường quay lại.

Năm cái bẫy, phá cái nào cũng hỏng:

1. **`mobi.js` phải đọc CẢ URL SẠCH, đừng chỉ dò chuỗi `"congcu"`.** `_redirects` viết lại
   `/radar`, `/tapdoan`, `/duongdua` bằng **rewrite 200** nên thanh địa chỉ giữ nguyên tên
   sạch và **không hề có `?m=`**. Dò mỗi "congcu" là vào `cpvn.io/radar` mất sạch bốn nút,
   thanh đáy sáng nhầm ở Bảng giá. Loại lỗi chỉ lộ ra ở đúng đường người dùng thật đi — ở
   localhost toàn gõ `congcu.html?m=...` nên nhánh đó không bao giờ chạy tới. `congcu.js`
   đọc theo path (`byPath`) cũng vì lý do y hệt.
2. **Thanh tab và dải mục con TỰ MANG BẢNG MÀU**, đừng mượn biến của trang. Bốn trang đặt
   tên biến khác nhau (index `--panel/--muted/--accent`, congcu `--solid/--mut/--rose`) nên
   mượn nhầm là `var()` không phân giải được, nền thành **trong suốt** — đo trên congcu ra
   đúng `rgba(0,0,0,0)`, chữ dưới xuyên lên.
3. **Đo khổ màn bằng `documentElement.clientWidth`, KHÔNG dùng `innerWidth`.** Trang đang
   tràn ngang thì `innerWidth` phình theo phần tràn (đo được 414 trên màn 375) — mà lúc bố
   cục mobile chưa kịp áp thì trang tràn thật, thành ra hàm tự đọc sai khổ rồi không bao giờ
   áp, kẹt luôn ở bố cục máy bàn. Kèm: nghe **cả `resize`** chứ đừng chỉ nghe `matchMedia`,
   sự kiện `change` có lúc không tới.
4. **`z-index` của MỌI lớp phủ phải TRÊN thanh tab đáy (200).** Dính hai lần: tấm trượt để
   60 thì mép dưới bảng cổ tức bị che, đọc hụt mấy dòng cuối mà không biết là còn; cửa sổ
   PTKT toàn màn hình `#ptkt` để 90 thì mất đúng 58px đáy — tức cả dải khối lượng lẫn trục
   thời gian. Máy bàn không có thanh này nên cả hai lỗi **chỉ lộ ở khổ hẹp**; đặt số xong
   phải bấm thử điểm cách đáy 20px xem `elementFromPoint` trả về lớp nào.
5. **Đừng viết luật bố cục cho một class TRẦN trong khối `@media` của mobile.** Khối
   `max-width:760px` của `cophieu.html` có `.ptseg{flex:1 0 100%;order:1}` viết cho thanh
   nút của cửa sổ PTKT. Sau này chart nhỏ mọc thêm hàng nút chỉ báo `#cvInd` cũng mang class
   `ptseg` — mà cha nó `#chartCard` xếp theo **CỘT**, nên `flex-basis:100%` hoá ra là CHIỀU
   CAO: hàng nút nuốt trọn thẻ (đo được 550px), `shrink:0` nên không co, `order:1` lại hất
   nó xuống dưới, biểu đồ nát hẳn trên điện thoại. Đã khoá thành `#ptHead .ptseg`. Luật
   chung: trong `@media` mobile, luật **bố cục** phải neo vào id hoặc tổ tiên cụ thể, chỉ
   luật **hình thức** (cỡ chữ, padding) mới được để class trần.

### Bảng giá ở khổ hẹp

**Cuộn ngang ĐỦ 13 cột** — đã thử gập còn ba cột, gọn nhưng mất hẳn vốn hoá, P/E, EPS, tiền
mặt, LNST, khối ngoại, đúng mấy số người ta mở bảng giá ra để soi. Đổi lại là **thu nhỏ cả
chữ lẫn số một bậc** (bảng 13px, giá 13.5px, mã 15.5px, nhãn cột 10.5px), hàng 55px.
**Số phải nhỏ theo chữ**, để số to hơn chữ một bậc thì bảng trông như hai cỡ font đánh nhau.

- **Hai cột ghim** (sao + mã) đứng yên khi vuốt. Nền cột ghim phải **trùng ĐÚNG `--bg`** và
  **không đổ bóng ở mép**: dùng `--sticky` (lệch một sắc) rồi thêm vệt bóng để phân giới thì
  nhìn ra ngay là hai mảng ghép lại, xấu hơn cái nó định chữa. Vẫn phải ĐỤC để phần cuộn
  chui xuống dưới không lộ. Hàng tiêu đề thì cả ba dùng `--thead`.
- **Bỏ cột `#` và bỏ dòng tên công ty** ở khổ hẹp — bề ngang mới là thứ khan hiếm, tên bị
  cắt còn tám chữ ("Đầu tư và P…") thì vừa tốn chỗ vừa không đọc ra nghĩa.
- **Bỏ ô "Sắp theo": bấm thẳng tên cột để xếp**, dùng chung `ST.sort`/`ST.dir` với máy bàn.
  Tam giác báo chiều vẽ bằng **viền CSS**, không dùng ký tự `▲▼` (lấy nét theo font hệ
  thống, máy không có glyph là mất dấu) — từ khi bỏ ô sắp xếp thì đây là dấu hiệu DUY NHẤT
  cho biết đang xếp theo cột nào.
- **`fitNumCols` phải XOÁ `<style id="numw">` ở khổ hẹp, không được chỉ `return` sớm** —
  thoát thôi thì mấy dòng `width` đo hồi ở khổ máy bàn vẫn nằm đó, ô 1D% bị ghim 114px trong
  rãnh 66px và lòi khỏi mép màn 36px khi xoay máy.
- **`const _hep` phải khai TRƯỚC `fitNumCols`** — `const` không được hoisted, để dưới là ném
  lỗi ngay lượt vẽ đầu → **trang trắng**.
- Rule ghim cột **đừng dùng `th:nth-child(n)`** kiểu cũ: hạng đặc hiệu cao hơn `thead th` nên
  nền xám dính lại thành ba cái hộp lệch ở hàng tiêu đề.
- **Chuỗi `min-width:0` phải liền mạch** từ ô xuống tới thẻ chữ, thiếu một mắt là tên công ty
  dài không chịu cắt: tài liệu phình 534px trên màn 375px.

### Những thứ đã THỬ RỒI BỎ — đừng đề xuất lại

| Đã thử | Vì sao bỏ |
|---|---|
| Dồn ô tìm mã + Bộ lọc vào tấm trượt cho đầu trang còn 1 hàng | Hai thứ dùng nhiều nhất mà đắt thêm một cú chạm; lọc xong còn bị tấm che nửa màn che mất kết quả |
| Mục con **bung** từ thanh tab đáy | Tiết kiệm 54px thật, nhưng đổi mục phải chạm HAI lần và phải NHỚ "bấm vào mục đang mở mới ra menu" — không có gì trên màn gợi ý điều đó |
| Dải mục con **thường trực trên đỉnh** | Ăn đứt 54px của mọi màn, cả ngày chỉ để chờ một cú bấm |
| Gập bảng giá còn 3 cột, bỏ cuộn ngang | Mất tám cột số mà người ta mở bảng giá ra chính là để soi |
| Cụm tổng quan (vốn hoá TT, biên độ) nối đuôi dải chỉ số | Phải kéo gần hết một màn mới tới, mà tới nơi thì bốn thẻ chỉ số đã trôi mất |
| Cụm tổng quan tách thành khối riêng | Vẫn ăn 78px; cuối cùng **bỏ hẳn ở khổ hẹp** — thanh khoản từng sàn đã in sẵn trong thẻ chỉ số của sàn đó (`.stgt`) |

Giấu bằng **CSS** chứ không chặn ở `renderStats`: DOM vẫn dựng đủ, chỉ có MỘT chỗ quyết định
ẩn/hiện nên khỏi phải nhớ đồng bộ hai nhánh JS/CSS. Máy bàn cho khối bọc `display:contents`
để con nhảy thẳng lên làm con của `#stats`, hàng ngang giữ y nguyên.

### Ngôn ngữ thị giác (áp cả demo lẫn bản chạy)

**KHÔNG EMOJI** — mỗi hệ điều hành vẽ một kiểu, mang màu riêng chửi nhau với bảng màu, đứng
cạnh chữ thì lệch chân; trong sản phẩm tài chính lộ ra ngay là ghép vội. Thay bằng **icon SVG
một nét** (lưới 24, nét 1.7–1.8, ăn `currentColor`). Kể cả mũi tên `↓↑` và tam giác `▸▾`.
**Thang cách 4px** (`--m1..--m5`) và **thang bo góc 4 bậc** (chip 8 · ô 12 · thẻ 16 · tấm
trượt 20) — mắt không đọc ra con số nhưng đọc ra được sự không đều.
**Hai sắc độ đường kẻ**: `--line` chia KHỐI, `--mrule` chia HÀNG trong cùng khối — dùng chung
một màu thì bảng 60 hàng trông như lưới kẻ ô.
**Cạnh nhỏ nhất của thứ bấm được: 44px** (`--mtap`). Phản hồi khi nhấn dùng chung 120ms.
**Bỏ hậu tố tự chế "N"/"Tr"** — "1.1N tỷ" đứng cạnh "938 tỷ" là hai số cùng cột khác bậc,
mắt không so thẳng được; chỉ câu chữ mới viết "nghìn tỷ".
Mép vùng cuộn ngang phải có **dải mờ** (`.mfade`) — cắt phẳng giữa chữ trông như lỗi tràn.
Nhưng ở `#stats` phải dùng **`mask`, không dùng `::after`**: chính nó là khung cuộn nên
`::after` sẽ trôi theo nội dung thay vì đứng yên ở mép.

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

**BỘ LỌC PRO (hàng riêng trên cùng panel lọc, 12/08/2026)** — khác mọi chip còn lại ở chỗ
nó là điều kiện **so với cả rổ**, không phải điều kiện của riêng một mã: phải xếp hạng
toàn thị trường rồi mới biết mã nào lọt. Vì thế `render()` gọi `CPScreen.proReset()` TRƯỚC
khi lọc, và `proBuild` dựng từ **`CP.coins` đầy đủ** chứ không từ danh sách đang lọc dở —
chọn Pro cùng lúc với một ngành thì thấy phần giao, "Pro" luôn là cùng 30 mã của toàn sàn.
Bốn yếu tố (biến động 60 phiên thấp · vốn hoá lớn · E/P cao · gần đỉnh 52 tuần) chọn theo
IC 12 tháng đo trên 97.794 dòng mã-tháng, chỉ giữ yếu tố **giữ nguyên dấu ở cả hai giai
đoạn** 2020-22 và 2023-26; danh mục thử nghiệm 20,2% trong mẫu / 20,4% ngoài mẫu.
Ba cổng loại trừ, mỗi cổng có lý do đo được:
- **đang lỗ** (IC −5,5%) và **20% phải thu/doanh thu cao nhất** (chỉ số cơ bản mạnh nhất
  tìm được, IC −14,3%; thêm cổng này nâng 20,3% → 21,6%/năm). **Thiếu dữ liệu thì CHO QUA**
  — ngân hàng không có khoản mục này mà lại chiếm phần lớn danh mục, loại vì thiếu số là
  tự tay vứt đi thứ đã đo ra là tốt.
- **`flat60` > 30%** — bộ lọc "biến động thấp" không phân biệt được mã ổn định THẬT với mã
  KHÔNG CHẠY: TLD khớp 1,86 tỷ/phiên nhưng đứng giá 21/59 phiên nên độ lệch chuẩn 0,28%,
  thấp nhất bảng, lọt top 30 vì lý do sai. Đo ba ngưỡng: không chặn 20,3% · >40% 20,2% ·
  **>30% 20,6%** · >20% 19,0% (bắt đầu cắt nhầm mã ổn định thật).
Hai trường mới trong kho lọc phục vụ nó: `vol60`+`flat60` (screen.json), `recRevL`
(fund.json — **MỨC** phải thu/doanh thu, khác `recRev` đã có là ĐỘ LỆCH TĂNG TRƯỞNG).
Nút "✕ Xoá hết lọc" phải quét cả `#scrPro`, quên là chip vẫn sáng vàng trong khi bảng đã
hết lọc. Nội dung nghiên cứu đứng sau: xem memory `nghien-cuu-chu-ky-2026-08`.

**`cophieu.html`** — Biểu đồ nhỏ và PTKT toàn màn hình dùng **chung** `CPChart`, chung
`dailyRows`, chung kho hình vẽ; chỉ khác palette (`'gon'` 10 nút vs `'full'` 14 nút).
Bốn bảng KQKD/CĐKT/LCTT/cổ tức dùng **chung một lưới cột** — đổi số cột là lệch cả bốn.
Kỳ mới nhất luôn bên **trái**. Chiều cao canvas không đặt cứng, do cột trái quyết định.

**`assets/chart.js`** — **EMA khác MA, phải tính DỒN từ đầu chuỗi.** MA cắt cửa sổ `per` kỳ
rồi lấy trung bình nên tính thẳng trong vòng vẽ được; EMA thì mỗi giá trị phụ thuộc TOÀN BỘ
quá khứ nên phải chạy một lượt từ đầu chuỗi và **đệm lại** (`emaCache` khoá theo kỳ + độ dài
+ mốc nến cuối) — tính trong vòng vẽ là 200 kỳ × 3.000 nến mỗi khung hình, rê chuột một cái
là giật. Mồi bằng trung bình cộng `per` kỳ đầu (chuẩn chung), sau đó `e = c·k + e·(1−k)`.
**EMA phải có màu RIÊNG** (`EMACOL`), đừng mượn `MACOL`: bật cả MA50 lẫn EMA50 mà cùng màu
thì hai đường chạy sát nhau thành một vệt. Bộ nút chỉ báo có ở CẢ chart nhỏ (`#cvInd`) lẫn
chart toàn màn hình (`#ptInd`) và dùng CHUNG một hàm `batChiBao()` — trước đây chart nhỏ
không có nút nào, muốn xem EMA hay RSI phải mở hẳn cửa sổ toàn màn hình.

**CỬ CHỈ CẢM ỨNG: canvas phải `touch-action:none`.** Ba canvas dùng
CPChart (`#cv`, `#ptCv` ở cophieu, `#detCandle` ở bubbles) từng để `pan-y` = nhường trục dọc
cho TRÌNH DUYỆT, nên vuốt dọc trên biểu đồ là cuộn cả trang, khối đồ thị trôi theo ngón tay
(user báo "rất khó chịu") và `preventDefault` trong `touchmove` bị bỏ qua — phần xử lý trục
dọc viết sẵn gần như không bao giờ chạy. Luật nay giống các app biểu đồ: **một ngón ngang =
thời gian, một ngón dọc = giãn/co VÙNG GIÁ, hai ngón chụm ngang = thời gian / chụm dọc = vùng
giá, chạm hai lần = về khung mặc định**. Bốn thứ đi kèm:
① **Khoá trục ngay từ đầu cú vuốt** (`drag.truc`) và giữ tới lúc nhấc tay — vuốt ngang mà
làm nhảy luôn vùng giá thì đọc biểu đồ không nổi. ② **Đồ thị KHÔNG BAO GIỜ tự trượt lên
xuống** — `yPan` chỉ còn dành cho chuột; cảm ứng chỉ đụng `yZoom`. ③ Độ nhạy chia theo
**chiều cao khung vẽ**, đừng để số cứng: chart lùn 110px của bảng bong bóng sẽ nhạy tới mức
chạm hụt là vùng giá nhảy gấp đôi. ④ **Chạm hai lần phải tự bắt** (`touchend` + mốc thời
gian), `dblclick` trên màn cảm ứng lúc có lúc không — mà từ khi vuốt dọc đổi được vùng giá
thì luôn phải có đường quay về, kéo lố một cái là mắc kẹt ở khung giá lạ.
> **Vùng giá phải kẹp `mn>=0` lúc vẽ** — thu hết cỡ là mép dưới lọt xuống dưới 0, trục hiện
> "-31206", đọc như thị trường trả tiền để người ta cầm cổ phiếu. Kẹp lúc VẼ thôi, `yZoom`
> giữ nguyên để phóng lại là về đúng chỗ cũ.

Toạ độ neo theo **(thời gian, giá)** nên kéo/phóng hình vẫn đứng yên.
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
bằng cách cộng tay từng khoản mua.

**HAI Ô GÕ MÃ, HAI NGHĨA NGƯỢC NHAU — đừng gộp làm một.**
`#dcaMa` (Đầu tư bền vững) **THAY THẾ** rổ: gõ mã thì select ngành bị khoá mờ, chỉ đầu tư
đúng mấy mã đó. `#raMa` (Đường đua) **THÊM VÀO** rổ đang chọn: user muốn kéo một mã vào
đua chung với ngành có sẵn chứ không phải đổi sang đua riêng nó. Hai nghĩa khác nhau vì
hai việc khác nhau, nhãn cũng phải nói rõ ("hoặc gõ mã riêng" vs "thêm mã").
Mã gõ ở `#raMa` có **hai đặc quyền**, thiếu cái nào là gõ xong vẫn không thấy mã đâu:
① **miễn ngưỡng 1.000 tỷ** — lý do chính người ta gõ tay là để kéo một mã nhỏ vào xem;
② **được GHIM, không bị cắt bởi ô "số công ty"** — mã nhỏ luôn xếp chót, cứ `slice(0,N)`
là nó rụng ngay, mà gõ vào rồi màn hình không đổi gì thì không ai đoán ra vì sao.
Gõ mã kho đua không có thì **phải nói ra mã nào** (`#raThieu`): im lặng bỏ qua là người ta
ngồi gõ lại mấy lần, tưởng mình gõ sai chính tả. Ngân hàng 7%/năm ghép lãi THEO THÁNG là đối thủ mặc định:
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

> **CÀO HỤT THÌ GIỮ SỐ CŨ, ĐỪNG GHI RỖNG ĐÈ LÊN.** `work_fin` và `work_prof` đều `jdump`
> NGUYÊN file, mà mấy hàm cào con (`fetch_div`, `fetch_ownership`, khối `bsY/bsQ/cfY/cfQ`)
> nuốt lỗi rồi trả về rỗng — một cú 5xx của nguồn là mất sạch cổ tức, cổ đông, công ty con
> của mã đó. `fin_stale()`/`prof_stale()` KHÔNG bắt được: khoá vẫn còn, chỉ là ruột trống.
> Nay cả hai lấy lại giá trị cũ khi lượt mới trả về rỗng (`Y`/`Q` thì gộp theo nhãn).
> **Ngày phơi nhiễm nặng nhất là THỨ HAI**: `--full` cào lại cả 1.522 mã cùng lúc, và
> `build_tapdoan` chạy ngay sau đó trong CÙNG lượt — hồ sơ bị khoét là bản đồ tập đoàn dựng
> lại từ kho rỗng, im lặng. Guard này che sự cố nguồn nên `health.json` có `giu_cu` đếm số
> mã phải lấy số cũ: **`giu_cu` vọt lên là nguồn đang hỏng**, đừng đọc thành "vẫn ổn".

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
- **KHÔNG đi vòng để lấy cổ phiếu Hàn Quốc / Mexico / Thổ Nhĩ Kỳ** — user chốt 12/08/2026.
  Dữ liệu CÓ tồn tại và tao đã dò ra nguồn: **Naver Finance** (`polling.finance.naver.com`,
  gọi được nhiều mã một lượt, có tên tiếng Hàn + giá) cho Hàn Quốc, **BigPara** cho BIST Thổ
  Nhĩ Kỳ; Mexico chưa ra. Cả hai đều **thiếu CORS** nên trình duyệt không gọi thẳng được.
  Hai đường đi vòng đã cân rồi và user chọn KHÔNG làm:
  · *Máy chủ cào sẵn vào kho* (như CNN Fear&Greed) — an toàn nhưng số chỉ mới mỗi ngày một
    lần lúc 15:15; Hàn Quốc thì may (15:15 giờ VN = 17:15 giờ Hàn, sau giờ đóng cửa nên bắt
    đúng giá chốt cùng ngày), Thổ và Mexico trễ một phiên.
  · *Thêm một Cloudflare Worker làm cầu* (`wrangler.jsonc` hiện chỉ có `assets.directory`,
    thêm `main` là có `/api/...`) — cho số sống mọi nước, nhưng **thêm backend**, trái nguyên
    tắc "không backend" của dự án, và cấu hình sai thì **cả trang sập** chứ không phải hỏng
    riêng mục này.
  Giữ nguyên: ba nước đó hiện chỉ số trên bản đồ, bấm vào thì nói rõ CNBC chỉ có chỉ số.
