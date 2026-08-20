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
| `index.html` | 925 | **Trang chủ** — bảng giá 13 cột, 100 mã/trang, cột ngành trái, bộ lọc nhanh |
| `cophieu.html` | 1169 | Trang một mã: hero giá · thống kê · nến · PTKT toàn màn hình · 5 thẻ nội dung |
| `bubbles.html` | 2185 | Bong bóng (canvas vật lý) + bản đồ nhiệt (treemap DOM). **Tự chứa bản sao lõi giá** |
| `congcu.html` + `assets/congcu.js` | 1450+3900 | **5 module**: Radar phiên · Danh mục tập đoàn (kèm tab quỹ) · **Phân tích dữ liệu** · Đường đua vốn hoá · Thông tin niêm yết |
| `assets/core.js` | 522 | **Lõi dữ liệu `CP`** — chỉ index + cophieu dùng. Phần lớn là cơ chế giá |
| `assets/chart.js` | 798 | **`CPChart`** — bộ vẽ nến canvas tự viết + lớp vẽ PTKT. Không phụ thuộc core.js |
| `assets/screener.js` | 93 | `CPScreen` — bộ lọc, nạp lười `screen.json`+`fund.json` khi mở panel |
| `assets/mobi.css` + `assets/mobi.js` | 103+101 | **Khung mobile dùng chung cả 4 trang** — thanh tab đáy + bốn lối rẽ của Radar. Chỉ sống trong `@media(max-width:760px)` |
| `demo-mobi*.html`, `demo-nen.html` | — | Bản demo để CHỌN, không nằm trong luồng chính. `demo-mobi.html` so hai mẫu bằng 2 iframe + postMessage |
| `refresh_daily.py` | 715 | Toàn bộ "backend": 11 bước cào → ghi kho |
| `tools/build_screen.py` | 624 | Sinh `screen.json`/`fund.json`/`market.json`. refresh_daily gọi ở bước 10 |
| `tools/build_nganh.py` | 250 | Sinh `data/nganh/{MÃ}.json` — chỉ số đặc thù ngành, KHÔNG gọi mạng. Bước 6d |
| `tools/cao_cocau.py` | 200 | Cào `data/cocau/{MÃ}.json` — cơ cấu lợi nhuận theo mảng + dư nợ cho vay ký quỹ (Simplize). Bước 6c2 |
| `tools/soi_nguon.py` | 150 | Soi nguồn vẽ chart: đối chiếu VNDirect · VPS · kho · bảng giá cho từng mã. Chạy tay khi nghi nguồn sai |
| `tools/kho_giaodich.py` | 1050 | Cào `data/giaodich` + `data/chiso.json` + vùng giá. `--sau` (hằng ngày) · `--trang N` (sâu hơn) · `--vg` · `--chiso` |
| `tools/kho_dactrung.py` | 380 | Dựng `data/dactrung`. KHÔNG gọi mạng |
| `tools/quet_la.py` | 300 | Quét bất thường + lát cắt ngang, ghi vào file phiên. KHÔNG gọi mạng |
| `tools/va_dau_fin.py` | 120 | Vá dấu lưu chuyển tiền tệ trong `data/fin`, lấy dấu từ `data/finq`. KHÔNG gọi mạng, **chạy mỗi ngày** |
| `tools/kho_chungquyen.py` | 110 | Cào `data/chungquyen.json`. ĐÚNG 1 lượt gọi |
| `tools/kho_rolichsu.py` | 90 | Cào `data/rolichsu.json` (gồm mã đã rời sàn). 2 lượt gọi |
| `tools/kho_noibo.py` | 150 | Bóc giao dịch người nội bộ từ `data/news`. KHÔNG gọi mạng, **gom dồn** |

## Kho dữ liệu `data/` (~130MB)

| Đường dẫn | Nội dung |
|---|---|
| `universe.json` | 1522 mã: tên, sàn, ngành, SLCP, mcap, PE/PB, eps, cash, np, mốc %, vn30/hnx30 |
| `data/eod/latest.json` | **File client luôn tải** (~100KB): giá đóng cửa phiên gần nhất + 4 chỉ số |
| `data/hist/{MÃ}.json` | Nến ngày **từ 2013** (bồi 17/08/2026, xem `tools/boi_nen.py`): 8 mảng `t,o,h,l,c,v,fb,fs` cùng độ dài, cũ→mới. **LÀ NGUỒN VẼ CHART CHÍNH từ 19/08/2026** (xem mục Nến), đồng thời nuôi MA/RSI/đỉnh 52T/dòng tiền NN/độ rộng/đường đua và bộ đo `tools/ta.py`. `fb`/`fs` (khối ngoại) đã vá đủ lịch sử 11/08/2026 — xem mục Khối ngoại |
| `data/fin/{MÃ}.json` | KQKD/CĐKT/LCTT theo năm+quý, cổ tức. **`Y`/`Q` gom dồn đủ lịch sử; `bsQ`/`cfQ`/`bsY`/`cfY` chỉ 8 KỲ CUỐN CHIẾU** — muốn dài hơn đọc `data/finq` |
| `data/finq/{MÃ}.json` | **Kho sâu**: cân đối kế toán + lưu chuyển tiền tệ ~79 quý / 22 năm, cùng sơ đồ khối `bsQ/cfQ/bsY/cfY`. Trang web KHÔNG đọc file này (để `data/fin` nhẹ) — nó dành cho nghiên cứu/bộ lọc. `tools/kho_sau.py` dựng |
| `data/nganh/{MÃ}.json` | **Chỉ số đặc thù ngành tính sẵn** (1.330 mã, ~6MB): chuỗi QUÝ đủ lịch sử theo 5 mẫu nh/ck/bh/bds/sx. Trang cổ phiếu đọc để hiện ô màu; `tools/build_nganh.py` dựng từ fin+finq |
| `data/cocau/{MÃ}.json` | **CHỈ CÒN dư nợ cho vay ký quỹ của công ty chứng khoán** (42 mã, 61KB) — khối lợi nhuận theo mảng đã thôi lấy 16/08/2026, xem mục *Cơ cấu lợi nhuận*. Nguồn chỉ sâu **15 quý / 10 năm** |
| `data/news/{MÃ}.json` | Tin theo mã — **BA CỔNG: trong 30 ngày · có url thật · không trỏ Simplize** (16/08/2026). 4.894 tin / 1.435 mã, nguồn hnx.vn + hsx.vn + báo có link |
| `data/profile/` | Hồ sơ DN, cổ đông, công ty con. **`freeFloat` ở đây là nguồn free float duy nhất** — 1.429/1.525 mã, xem mục *Phân tích dữ liệu* |
| `data/giaodich/{MÃ}.json` | Số chốt phiên theo mã: OHLC, VWAP, **khớp lệnh tách khỏi thoả thuận** (KL và GT), sổ lệnh lúc đóng cửa, SLCP, khối ngoại (kèm sở hữu + room), tự doanh. `kho_giaodich.py --sau` |
| `data/dactrung/{MÃ}.json` | **Kho đặc trưng** (~41MB): vòng quay free float, Amihud, biên độ, cộng dồn khối ngoại, đỉnh 52 tuần, và chỉ tiêu cơ bản **gắn theo NGÀY CÔNG BỐ BCTC**. `kho_dactrung.py` |
| `data/phien/{NGÀY}.json` | Một file mỗi phiên (~510KB): `bang` bảng mã · `ma` vùng giá khớp lệnh · `la` quét bất thường · `dt` lát cắt ngang cho bộ lọc. **BỐN lượt ghi khác nhau — phải TRỘN, đừng ghi đè** |
| `data/phantich.json` | Chuỗi toàn thị trường theo phiên + khối `chiso`. Nhẹ, trang tải ngay |
| `data/chungquyen.json` | **328 chứng quyền đang lưu hành** trên 20 cổ phiếu cơ sở, kèm tổ chức phát hành. MỘT lượt gọi. Dùng để đọc con số tự doanh cho đúng — xem mục *Phân tích dữ liệu* |
| `data/rolichsu.json` | **Rổ mã lịch sử: 1.968 mã, trong đó 443 ĐÃ RỜI SÀN** kèm ngày niêm yết / huỷ niêm yết. Chống sống sót sai lệch |
| `data/noibo.json` | **Giao dịch của người nội bộ** đọc từ tiêu đề CBTT trong `data/news`. KHO GOM DỒN — `data/news` chỉ giữ 30 ngày |
| `data/screen.json` `fund.json` | Dạng CỘT: `f`=tên trường, `d[MÃ]`=mảng giá trị cùng thứ tự |
| `data/market.json` | `breadth` 250 phiên · `global` (CNN F&G) · `race` (đường đua) |
| `data/tapdoan.json` | Bản đồ tập đoàn: nhóm → mã con + % mẹ nắm. `tools/build_tapdoan.py` dựng |
| `data/quy.json` | Danh mục các quỹ: quỹ → mã đang nắm + giá trị + **kỳ công bố**. Cùng script |
| `data/cotuc.json` | Lịch chốt quyền: cổ tức tiền/CP, CP thưởng, phát hành thêm + ngày GDKHQ. `tools/build_cotuc.py` |
| `data/health.json` | `date` = **ngày phiên** — khoá điều phối giữa VPS và Actions |

## Nến vẽ chart — KHO TRƯỚC, nguồn ngoài chỉ khi kho không dùng được

> **LẬT THẬT SỰ 19/08/2026.** Bản ghi cũ nói "đã lật 17/08" là SAI — hôm đó lật rồi bị bác
> ngay trong ngày và chuỗi trả về như cũ, nhưng tài liệu không được sửa lại. Suốt từ đó tới
> 19/08, cả bản trên máy lẫn **bản đang chạy trên cpvn.io** đều vẫn gọi VNDirect trước, và
> `CP.khoLoiThoi` mà mục này mô tả thì **không tồn tại trong code**. Bài học chung: **sửa tài
> liệu trong CÙNG commit với code**, bằng không nó thành một lời khai chắc nịch về một thứ
> không có thật — thứ tốn công đi kiểm mới phát hiện ra.
>
> `CP.loadDaily` và bản sao trong `bubbles.html` nay đi **kho → (VNDirect → VPS) chỉ khi kho
> không dùng được**. Ba điều kiện để dùng kho, thiếu một là mượn nguồn: ① từ 2 nến trở lên ·
> ② `khoLoiThoi` trả false · ③ nến cuối trong vòng 5 ngày lịch (pipeline chết cả tuần thì
> chart phải đi lấy chỗ khác chứ không đứng ở phiên tuần trước).
>
> **Vì sao lật:** số liệu là **dữ kiện, không được bảo hộ quyền tác giả**, và VN **không có
> quyền sui generis cho CSDL** (Điều 22 Luật SHTT chỉ bảo hộ cách chọn lọc/sắp xếp) — lưu nến
> gần như không có rủi ro bản quyền. Đổi lại, cách cũ bắn MỘT lượt sang VNDirect cho **mỗi
> lần mở mỗi trang mã**, nhân 1.527 mã và mọi lượt crawler quét. Khách còn được lợi: đo HPG
> thì kho cho **13 năm trong 62 KB đã nén** (từ edge Cloudflare trong nước) trong khi VNDirect
> trả **5 năm trong 65 KB không nén**.
>
> **CÂU "CPVN KHÔNG CÓ CƠ CHẾ TỰ HẠ NỀN" ĐÃ HẾT ĐÚNG — đừng trích lại nó để bác việc đọc kho.**
> `refresh_daily.work_hist` so giá tại NGÀY TRÙNG NHAU giữa nguồn và file cũ, lệch quá 0,5%
> là tải lại cả chuỗi; chạy **mỗi phiên**, không riêng `--full`. Kiểm chứng độc lập 19/08/2026:
> 14 mã chốt quyền trong 20 ngày trước đó, đối chiếu kho với **DNSE** (nguồn KHÁC hẳn nguồn
> kho dùng) — **14/14 đã hạ nền đúng**, gồm VHM, MBB, PVI, CLM, PGV.
>
> **Cái kho KHÔNG tự chữa được là KHOẢNG TRỐNG TRONG NGÀY.** Kho chốt 15:15, nên từ lúc mở
> cửa NGÀY GDKHQ tới lượt cào kế tiếp nó vẫn ở nền CŨ trong khi giá sống đã sang nền MỚI.
> Ca đo được: **SSI 17/08/2026** chốt cùng lúc cổ tức tiền 1.000đ + thưởng 100:20 → nền mới
> `(24.500 − 1.000) ÷ 1,2 = 19.583đ`, đúng bằng số `dchart` trả, còn kho vẫn ghi 24.500.
> **Nguồn KHÔNG sai — nó hạ nền đúng lịch; kho mới là bản cũ.** (Đừng lặp lại nhầm lẫn này:
> đọc số 19.583 rất dễ kết luận ngược, phải mở `data/cotuc.json` soi ngày `d` trước khi phán.)
>
> **`CP.khoLoiThoi(sym, f)` bịt đúng khoảng đó, bằng HAI LƯỚI ĐỘC LẬP — đừng bỏ lưới nào.**
> ① **Lưới số** (không tốn lượt gọi): tham chiếu hôm nay và giá đóng cửa phiên trước trong kho
> phải BẰNG NHAU nếu nền không đổi. Đo 1.522 mã phiên 18/08/2026:
> **HOSE 403 mã và HNX 299 mã lệch 0,00% ở cả p99 lẫn max** — hai sàn này lấy tham chiếu đúng
> bằng giá đóng cửa phiên trước, nên ngưỡng **0,5%** không báo nhầm mã nào. **UPCOM 819 mã thì
> p95 1,67% · p99 7,00% · max 17,24%** vì tham chiếu là BÌNH QUÂN phiên trước — sàn này dùng
> ngưỡng **5%**, đừng hạ. Chỉ xét MỘT CHIỀU (kho cao hơn tham chiếu): hạ nền bao giờ cũng làm
> giá quá khứ thấp đi, còn nhiễu bình quân thì đối xứng, nên xét một chiều cắt nửa số báo nhầm
> mà không bỏ sót ca thật nào.
> ② **Lịch `data/cotuc.json`**: có sự kiện nào rơi vào `(nến cuối của kho, hôm nay]`. Đây là
> lưới DUY NHẤT dùng được cho UPCOM.
>
> **VÌ SAO PHẢI CÓ CẢ HAI.** Bản vá 17/08 chỉ có lịch, và lời bác khi đó ĐÚNG: *"lịch sót một
> sự kiện là chart sai mà không có dấu hiệu gì"*. Lịch sót thật — bản `cotuc.json` ngày 17/08
> **chưa có HCC và TVS**, tới bản 18/08 mới có (GDKHQ 19/08). Lưới số bịt lỗ đó cho HOSE/HNX;
> ngược lại lịch bịt lỗ của lưới số ở UPCOM. Lịch tải hỏng thì HOSE/HNX vẫn tin lưới số, còn
> UPCOM mất lưới duy nhất nên ngả về mượn nguồn.
>
> **BÁO NHẦM VÔ HẠI, BỎ SÓT MỚI CHẾT.** Báo nhầm = mã đó mượn nguồn ngoài, đúng bằng hành vi
> của cả trang trước 19/08. Bỏ sót = chart bung cú sập giả bằng đúng tỉ lệ cổ tức. Nên mọi chỗ
> nghi ngờ đều ngả về "coi như lỗi thời". Giá phải trả đo trên phiên 18/08: **15/1.522 mã =
> 1,0%** phải mượn nguồn (toàn UPCOM báo nhầm), 99% còn lại đọc kho.
>
> **`ymd(vnNow())` CHỨ KHÔNG PHẢI `CP.lastSessionDate()`** — bẫy đã dính, `test_khonen.js` bắt
> được 7/17 phép. Hàm kia trả về phiên đã ĐÓNG: trước 15:00 nó còn trả HÔM QUA, đúng bằng ngày
> nến cuối của kho, nên dòng thoát sớm `cuoi>=nay` nuốt luôn cả hai lưới → hàm trả `false` với
> MỌI mã, suốt phiên. Tức lớp bảo vệ chết đúng khoảng thời gian duy nhất nó sinh ra để canh.
>
> **KIỂM: `node tools/test_khonen.js`** (17 phép, chạy trên chính `core.js`). Bắt buộc chạy
> cùng `test_gia.js` trước mỗi lần đẩy nếu có đụng vào nguồn nến. **Bản sao trong `bubbles.html`
> phải sửa cùng lúc.**
>
> **Hệ quả phải chấp nhận:** trong phiên, chart THIẾU đúng cây nến hôm nay (kho chốt 15:15).
> Giá sống vẫn hiện to ở đầu trang, và nến chưa đóng cửa thì cũng chưa phải nến thật —
> **tuyệt đối đừng bịa nến hôm nay từ giá sống**, xem luật "ĐỪNG dựng nến mới cho phiên nguồn
> chưa có". Luật "chọn nguồn theo phiên mới nhất nó có" (dưới đây) vì thế chỉ còn áp cho nhánh
> mượn nguồn. Nhãn `src` phân biệt ba trạng thái: `kho CPVN` · tên nguồn ngoài ·
> **`kho CPVN (nền cũ)`** khi cả hai nguồn tắt mà kho thì đang lỗi thời — phải NÓI RA, đừng để
> nó trông như số sạch.
> Đây cũng là bằng chứng rằng **mọi lượt bồi kho phải quy về cùng nền trước khi ghép**
> (xem ba luật ở mục kho `data/hist`).

**XIN ÍT LẠI: mặc định 5 NĂM, 15 năm chỉ khi bấm Tháng/Năm** (17/08/2026). Bản cũ xin 15
năm ở MỌI lượt mở trang mã dù chart mặc định là khung NGÀY — đo trên VIC cùng endpoint chỉ
đổi `from`: 15 năm 3.395 nến 166 KB · 5 năm 1.245 nến 58 KB · 3 năm 745 nến 35 KB. Nhân 1.527
trang mã × mọi lượt crawler quét thì đó là ~70% dung lượng đổ sang VNDirect cho thứ chưa ai
nhìn. **ĐỆM THEO KHOÁ `sym|năm`, không theo mã** — dùng chung khoá thì lượt xin 15 năm sau khi
đã xin 5 năm nhận lại đúng chuỗi cũ, bấm "Năm" xong chart vẫn cụt mà không hiểu vì sao;
`dailyNam` bên `cophieu.html` nhớ đang giữ mấy năm để bấm lần hai khỏi gọi mạng.

Bảng dưới là ĐỘ SÂU và CHẤT LƯỢNG của từng nguồn, vẫn đúng — nay dùng để chọn nguồn cho
nhánh cứu hộ và cho pipeline, không còn là thứ tự client gọi:

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

> **CHỌN NGUỒN THEO PHIÊN MỚI NHẤT NÓ CÓ, đừng nhận bừa nguồn đầu tiên trả về dữ liệu.**
> Bản cũ `return` ngay khi nguồn 1 cho một mảng hợp lệ — KỂ CẢ khi mảng đó thiếu phiên gần
> nhất. Một mã bị nguồn 1 cập nhật trễ là chart đứng lại ở phiên cũ vĩnh viễn trong khi
> nguồn 2 hoặc kho có đủ, và vì chỉ rơi vào đúng mã đó nên đọc ra như "chỉ mỗi mã này sai"
> — rất khó nghi ngờ đúng chỗ. Nay đo NGÀY của nến cuối: nguồn nào đã có phiên gần nhất
> thì dùng luôn và dừng, chưa có thì giữ làm dự phòng rồi hỏi tiếp, cuối cùng lấy nguồn có
> nến mới nhất (hoà thì giữ thứ tự ưu tiên cũ vì VNDirect hồi tố quyền đầy đủ nhất).

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
node tools/test_gia.js      # 55 phép — cơ chế giá
node tools/test_khonen.js   # 17 phép — kho có đang ở nền cũ không
```

55 phép kiểm nạp thẳng `assets/core.js` vào đồng hồ giả + localStorage giả: lịch phiên ở mọi
mốc chuyển, luật chốt cứng, luật đệm thắng/thua kho, F5 giữa phiên không được chờ mạng, hợp
đồng 10 phần tử của `cpvn_live`, chế độ `?offline`. Hỏng một phép là có người dùng sẽ thấy
giá sai hoặc giá nhảy — đừng đẩy.

### Luật bất di bất dịch

- **TAB ẨN THÌ KHÔNG GỌI MẠNG — CHẶN TRONG `pollBoard`, ĐỪNG CHỈ CHẶN Ở VÒNG LẶP.**
  Vòng `setInterval` kiểm `document.hidden` từ lâu, nhưng LƯỢT QUÉT MỞ MÀN thì không — mà
  nó mới là lượt nặng nhất: chia 1.500 mã thành 11 lô bắn SONG SONG sang VPS (~1,48 MB).
  Trước 17/08/2026 nó chạy vô điều kiện, nên **mỗi lượt mở trang** đều đẩy chừng ấy sang VPS
  mang sẵn `Origin: https://cpvn.io` — kể cả tab mở ngầm, trang trình duyệt tự dựng sẵn
  (prerender), hay máy cào chạy headless. Ai muốn nện VPS chỉ việc mở cpvn.io thật nhiều
  lần: **CPVN thành cái loa khuếch đại, mà log bên kia thì trỏ về CPVN.** Đây là lớp phòng
  thủ cho Điều 287 BLHS, cùng họ với `tools/nhipmang.py` ở phía pipeline.
  Chặn trong `pollBoard` vì mọi đường ra mạng của giá đều đi qua đó (`warmPrices`,
  `startPolling`, index, cophieu). **Hai bản sao (core.js, bubbles.html) phải sửa cùng lúc**;
  congcu.js `startLive` vốn đã đúng sẵn. Cờ thoát `?forcelive` (`CP.FORCELIVE`) bắt buộc
  phải có — khung xem tự động luôn báo `hidden=true` nên không có nó thì không đo được gì.
  > **HOÃN, KHÔNG PHẢI BỎ.** `visibilitychange` trả nợ ngay khi tab được xem, và phải trả
  > bằng lượt quét ĐỦ chứ không phải lượt nhanh chỉ lấy mã đang hiện — bằng không thống kê
  > và xếp hạng đứng nguyên ở số kho mà không có dấu hiệu gì. Cần cờ `daMoMan` RIÊNG, đừng
  > suy từ `lastPollAt`: tab ẩn thì `pollBoard` trả về ngay mà KHÔNG đặt `lastPollAt`, nên
  > không phân biệt được "chưa quét bao giờ" với "vừa quét xong".
  > **GIỚI HẠN:** chỉ chặn được tab nền / prerender / máy cào báo hidden. Puppeteer và
  > Playwright mặc định báo **visible** — kẻ cố tình không bị chặn ở đây. Lớp chặn cho
  > trường hợp đó nằm ở Cloudflare (rate limit + Bot Fight Mode), không nằm trong code.
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
- **GIÁ SỐNG CHỈ ĐƯỢC GỘP VÀO NẾN CỦA CHÍNH PHIÊN NÓ — KIỂM NGÀY TRƯỚC KHI GHI.** Vòng
  poll của trang cổ phiếu và bảng bong bóng đều "làm mới nến cuối" bằng `l.c=c.price`, mà
  bản cũ ghi thẳng vào phần tử CUỐI CÙNG **bất kể nến đó thuộc phiên nào**. Ba đường dẫn
  tới cảnh nến cuối không phải phiên đang chạy: nguồn vẽ chart chưa ra nến ngày hôm nay ·
  hai nguồn tắt nên rơi về kho `data/hist` (kho chốt 15:15 nên TRONG PHIÊN luôn là phiên
  TRƯỚC) · mở trang buổi tối khi kho chưa kịp cập nhật phiên vừa đóng. Cả ba cho cùng một
  hậu quả: **giá phiên mới bị dán đè lên nến của phiên cũ**, rê vào nến cuối thấy một giá
  đóng cửa không phải giá đóng cửa của ngày đó. Đo 14/08/2026 trên VIC: nến 13/08 đóng
  207.900 bị ghi thành giá phiên 14/08. Nặng hơn ở khung NGÀY vì `CPChart.aggregate('D')`
  trả về CHÍNH mảng gốc → số bịa ăn thẳng vào đệm `dailyRows`, đổi sang tuần/tháng vẫn mang
  theo. Luật: `ngayVN(nến cuối) === CP.lastSessionDate()` **và** `!c.nt` mới được ghi.
  > **NAY CÓ DỰNG NẾN HÔM NAY — vì bảng giá CÓ trả giá mở cửa (19/08/2026).** Câu cũ ở đây
  > *"bảng giá VPS không trả GIÁ MỞ CỬA … bịa `o` ra là tự tay tạo một cây nến không có
  > thật"* có **TIỀN ĐỀ SAI**: `openPrice` nằm sẵn trong mỗi dòng `board.json` — 872/1.522 mã
  > phiên 18/08 (số còn lại là mã KHÔNG có giao dịch nên vốn không có nến nào để dựng). Nó
  > chỉ chưa được đọc tới, nằm trong nhóm 34 trường đo được là "không dòng code nào đụng".
  > Đối chiếu 12 mã lớn với DNSE phiên 18/08: **mở/cao/thấp/đóng và khối lượng khớp tuyệt đối
  > 12/12**. Nên đây là nến THẬT, không phải nến bịa.
  > **Vì sao phải dựng:** không có nó thì trong phiên chart đứng ở phiên hôm qua trong khi
  > trang khác có đủ — người xem không có lý do ở lại. Đường thay thế duy nhất là quay lại
  > mượn nguồn ngoài suốt 9h–15h15, tức dồn TOÀN BỘ lưu lượng giờ cao điểm sang VNDirect,
  > ngược hẳn mục tiêu.
  > **`CP.nenHomNay` + `CP.gopNenHomNay` (core.js), bản sao trong `bubbles.html`.** Ba cổng,
  > thiếu cổng nào là đẻ ra nến sai: ① bảng giá phải đang ở phiên HÔM NAY (`CP.liveSess`) ·
  > ② mã phải ĐÃ khớp lệnh phiên này (`!c.nt`) · ③ phải có CẢ `o` lẫn `price`, thiếu `o` thì
  > thà không có nến còn hơn đoán. Mốc `t` theo quy ước kho: **00:00 UTC của ngày phiên**.
  > **NỐI CÂY MỚI, TUYỆT ĐỐI KHÔNG GHI ĐÈ NẾN PHIÊN CŨ — bẫy đã dính 19/08.** Bản cũ ghi
  > thẳng vào phần tử CUỐI với điều kiện `ngayVN(nến cuối)===CP.lastSessionDate()`. Điều kiện
  > đó chặn được **NHỜ ĂN MAY** khi chart lấy từ nguồn ngoài (nguồn đã có nến hôm nay nên ngày
  > không khớp). Từ lúc chart đọc KHO thì nến cuối của kho LÀ phiên hôm qua, mà
  > `lastSessionDate()` trước 15:00 CŨNG trả hôm qua → điều kiện khớp → **giá phiên mới bị dán
  > đè lên nến hôm qua, suốt 9:00–15:00**. Đúng con bệnh "VIC nến 13/08 đóng 207.900 bị ghi
  > thành giá phiên 14/08" ghi ngay phía trên.
  > **GHÉP VÀO CHUỖI NẾN NGÀY (`dailyRows`/`detDaily`) RỒI MỚI GỘP KHUNG.** Khung NGÀY thì
  > `aggregate('D')` trả chính mảng gốc nên hai đường như nhau, nhưng khung TUẦN/THÁNG thì
  > mảng đã gộp là mảng KHÁC — nối một cây nến ngày vào đó là đẻ ra một cột tuần giả.
  > Kiểm: `node tools/test_khonen.js` mục 5 và 6. Hai bản sao (`cophieu.html`
  > `gopGiaSongVaoNen`, `bubbles.html` vòng 300ms) phải sửa cùng lúc.
- **Cộng dòng tiền NN phải theo NGÀY PHIÊN, không theo ngày lịch.** Từng cộng trùng
  phiên mới nhất: VIC 30 phiên hiện 688 tỷ thay vì 3.267 tỷ, im lặng hoàn toàn.
- **Hợp đồng `cpvn_live`**: `{at, sess, final, idx, d}`, `d[MÃ]` là mảng **12 phần tử đúng
  thứ tự** `[price, ref, vol, gtgd, fbuy, fsell, high, low, ceil, flr, nt, o]` (`o` = giá mở
  cửa, NỐI ĐUÔI từ 19/08/2026 để dựng nến phiên đang chạy; bản đệm cũ 11 phần tử vẫn đọc
  được, `o` ra undefined và chỉ mất cây nến hôm nay tới lượt quét kế tiếp). Ba nơi đọc/ghi:
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
- **`close` CỦA SNAPSHOT LẤY TỪ KHO NẾN, KHÔNG PHẢI TỪ BẢNG GIÁ — nên đừng bao giờ "kiểm
  chứng" kho nến bằng `data/eod/latest.json`.** Bước 5 dựng `snap` từ `prices[sym]` mà
  `prices` sinh ra từ `data/hist` (VNDirect); bảng giá VPS chỉ góp tham chiếu/trần/sàn/khối
  ngoại/GTGD. Hai vế CÙNG MỘT GỐC nên so nhau bao nhiêu cũng khớp — 14/08/2026 đã dính
  đúng bẫy này: user báo chart BID sai, đo "latest.json khớp data/hist 1526/1527 mã" rồi
  kết luận "kho sạch, lỗi ở nơi khác". Phép đo đó **vòng tròn, không chứng minh được gì**.
  Đường lấy số ĐỘC LẬP duy nhất là `lastPrice` của bảng giá VPS — trước đây pipeline ném
  luôn đi. Nay giữ lại (`board[sym]['last']`) và **bước 5c** so nó với `close` của snapshot,
  ghi `health.json['chart']`. Nguồn vẽ chart trả sai cho một mã thì con số sai chảy vào
  snapshot → bảng giá → mọi trang, mà không có gì phát hiện được nếu thiếu phép so này.
  Công cụ soi tay: `python3 tools/soi_nguon.py BID` (đối chiếu VNDirect · VPS · kho · EOD).
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
- **CHỈ SỐ ĐẶC THÙ NGÀNH (`data/nganh`, bước 6d, 14/08/2026): mỗi loại hình một bộ số.**
  **TRÌNH BÀY: dòng nối vào CUỐI bảng Cân đối kế toán** (user chốt 14/08/2026 — bản đầu
  dựng ô nổi bật trên đầu thẻ, user bác: *"đưa vào vị trí cân đối kế toán… trình bày giống
  bảng, không quá nổi bật, chỉ cần đánh màu sắc là đủ"*). `veNganhRows()` chèn nhóm dòng
  `tr.ngr` sau `VỐN CHỦ SỞ HỮU`, dùng CHUNG lưới cột với bảng, **màu tô theo TỪNG CỘT**
  nên đọc ngang một dòng là thấy chỉ số chuyển vàng/đỏ từ kỳ nào; luật màu ghi ở tooltip
  tên dòng. Vẽ lại mỗi lần `renderFin` chạy (đổi Theo quý/Theo năm là bảng dựng lại).
  **Chế độ THEO NĂM: nhãn năm -> Q4 của năm đó** (chỉ số thời điểm và chỉ số trượt 4 quý
  tại Q4 chính là số cả năm), còn dòng THUẦN QUÝ (ngày tồn, ngày thu, biên quý) phải ẨN —
  đặt biên gộp của riêng quý 4 dưới cột NĂM là nói sai kỳ. Năm mẫu: `nh` LDR/tăng trưởng
  cho vay/đòn bẩy/đầu tư CK/ROE · `ck` vay÷VCSH/đòn bẩy/biên ròng/ROE + dòng "Dư nợ cho
  vay ký quỹ — nguồn chưa mở" toàn `—` (xem luật 4) · `bh` · `bds` tồn kho%TTS/NGƯỜI MUA
  TRẢ TRƯỚC so cùng kỳ/vay÷VCSH/phải thu%TTS/CFO4/ROE · `sx` ngày tồn/ngày thu/vay÷VCSH/
  biên gộp/CFO4 so LNST4/ROE. Bốn luật, phá là số sai âm thầm:
  1. **LCTT chỉ lấy `finq`** (dấu `fin` sai 60% — xem ngay trên). Mã chưa có finq thì ô CFO
     TRỐNG, tuyệt đối không rơi về `fin` cho "đủ ô".
  2. **Trục kỳ = HỢP fin+finq, kỳ trùng số fin thắng** (fin cập nhật hằng ngày, finq chờ
     `kho_sau --moi` ≤500 mã/lượt nên có thể trễ). Ô nào lấy kỳ CŨ hơn kỳ chung thì client
     in nhãn kỳ vàng cạnh con số — nói ra chứ không im lặng trộn hai kỳ.
  3. **Mẫu chọn theo sector NHƯNG phải có dữ liệu thật**: F88 mang sector ngân hàng mà báo
     cáo mẫu thường → rơi về `sx`; EVF/TIN có đủ dòng ngân hàng nhưng LDR ~770% vì là CÔNG
     TY TÀI CHÍNH (vốn từ vay/trái phiếu, tiền gửi không đáng kể) → client thấy LDR>300%
     là dán nhãn đúng bản chất và để XÁM, đừng tô đỏ như thể ngân hàng vỡ trận.
  4. **CTCK: dòng "cho vay ký quỹ" NAY ĐÃ CÓ, lấy từ `data/cocau` (15/08/2026).** Cả
     24hMoney lẫn finq chỉ giữ 20 dòng tóm tắt mẫu THƯỜNG cho CTCK nên không dòng nào chứa
     nó — bảng từng phải in "nguồn chưa mở, sẽ bổ sung" toàn `—`. Đường ra KHÔNG phải mở
     thêm mã dòng ở `kho_sau` như dự tính, mà là một nguồn khác hẳn: Simplize có sẵn bảng
     phân rã theo đúng loại hình (xem mục CƠ CẤU LỢI NHUẬN). `build_nganh.margin_ck()` đọc
     `ts.bs5` của kho đó, khớp theo NHÃN kỳ. Hai dòng in ra: **Dư nợ cho vay ký quỹ (tỷ)**
     không tô màu (to hay nhỏ không tự nó là tốt xấu) và **Cho vay ký quỹ / vốn chủ (%)**
     tô theo trần pháp lý 200% — xanh ≤100 · vàng 100–160 · đỏ >160.
     User nhấn 14/08/2026: với CTCK thì **số tiền ĐANG CHO VAY (bên tài sản) mới là con số
     quan trọng**, không phải vốn vay ở bên nguồn vốn — hai dòng này vì thế đứng TRÊN dòng
     "Vay / vốn chủ". Nguồn chỉ sâu 15 quý nên phần trục trước Q4/22 để `—`; **tuyệt đối
     đừng kéo giá trị gần nhất lấp vào**, dư nợ đổi từng quý.
  **Ngưỡng màu nằm ở CLIENT, tooltip ghi nguồn gốc từng ngưỡng**: cái đo từ phân bố thật
  ghi rõ mẫu đo (LDR 100/120 và đòn bẩy 10/13 = tam phân vị 29 ngân hàng · CTCK vay/VCSH
  0,7/1,3 trên 35 mã, đòn bẩy 1,5/2,5 trên 42 · bảo hiểm 3/5 trên 13 — đều đo 14/08/2026);
  cái là mốc quy ước thì nói là quy ước (ROE 8/15 · D/E 0,5/1,5 · BĐS 0,5/1). Tồn kho và
  phải thu so với CHÍNH MÃ ĐÓ 12 quý (xếp hạng ngày tồn/ngày thu), không so chéo ngành.
  Xám = tham khảo, không áp ngưỡng. Mọi câu chữ là mô tả quá khứ, không phải khuyến nghị.
- **`data/cocau` (bước 6c2) — NAY CHỈ CÒN MỘT VIỆC: DƯ NỢ CHO VAY KÝ QUỸ CỦA CTCK.**
  Khối lợi nhuận theo mảng (`pvalue`) **đã thôi lấy 16/08/2026** — user chốt nguyên tắc
  *"tốt nhất là không lấy data thế mạnh của họ, chỉ nên lấy những thứ được báo cáo và không
  xâm phạm quyền"*, mà khối đó là phần Simplize **tự tính**, không phải trích từ báo cáo:
  đối chiếu HPG Q2/26 với mã dòng KQKD của VNDirect thì lợi nhuận gộp = `23100`, liên doanh
  liên kết = `23300`, khác = `23900` đều CÓ in trong báo cáo, nhưng **"Lợi nhuận hoạt động
  tài chính" không có mã dòng nào** — Simplize lấy `21500 − 22500`. Với CTCK còn nặng hơn:
  mẫu B02-CTCK in doanh thu và chi phí theo từng nghiệp vụ nhưng KHÔNG in lợi nhuận theo
  nghiệp vụ, nên "lợi nhuận từ môi giới" là **phân bổ**. Kho co từ 1.526 file / 1,14MB
  xuống **42 file / 61KB** (chỉ nhóm `INVESTMENT`), `_nhan.json` chỉ còn nhãn khối `ts`.
  > **ĐỪNG mở lại `pvalue`,** và cũng đừng thử "chỉ giữ dòng nào truy được về mã BCTC":
  > chỉ đối chứng được nhóm sản xuất — VNDirect trả **0 dòng KQKD** cho VCB và SSI nên ngân
  > hàng/CTCK không có nguồn để soi, giữ hay bỏ dòng nào cũng là đoán. (Phép đo rỗng đó suýt
  > làm kết luận ngược: 0/6 "không tìm ra" trông như bằng chứng Simplize bịa cả.)
  **Thứ CÒN GIỮ** là dòng `ts.bs5` "Các khoản cho vay" — khoản mục **CÓ in trên bảng cân đối
  mẫu CTCK**, đúng vế "những thứ được báo cáo", mà cả `data/fin` lẫn `data/finq` đều không
  có (hai kho đó lấy bản CĐKT mẫu THƯỜNG: với CTCK thì bảng hiện "Hàng tồn kho = None, TSCĐ
  176 tỷ" trong khi **40.473 tỷ đang cho khách vay không nằm ở dòng nào**).
  `build_nganh.margin_ck()` là nơi DUY NHẤT đọc kho này. Nguồn:
  `api2.simplize.vn/api/company/fi/structure/overview/{MÃ}?period=Q|Y`, ACAO `*`.
  **Độ tin đã đối chiếu độc lập**: luật cấm CTCK cho vay quá 200% vốn chủ — đo 42/42 CTCK
  thì 0 mã vượt trần, HCM 198,3% sát trần, SSI 99,4%. Nguồn trả ĐỒNG, kho ghi TỶ.
  Hai thứ vẫn phải nhớ: **nguồn chỉ trả 15 quý (từ Q4/2022), không có cách xin thêm** (đã
  thử `size` `limit` `page` `periodDate` `numberOfPeriod` — luôn đúng 15 kỳ) nên kỳ cũ hơn
  để `—`, **tuyệt đối đừng kéo giá trị gần nhất lấp vào**; và **đây KHÔNG phải kho vĩnh
  viễn** — mất là cào lại được, không cần guard "giữ số cũ" như `data/fin`.

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
  9. **NHÃN NHÀ NƯỚC: nhận CƠ QUAN thôi là hụt gần hết, phải nhận cả TẬP ĐOÀN nhà nước.**
     Bảng `NHA_NUOC` chỉ bắt tên cơ quan (Bộ, UBND, Ngân hàng Nhà nước, SCIC, Uỷ ban Quản lý
     vốn) nên **64 mã dầu khí của PVN đứng cạnh Vingroup và Masan không một dấu hiệu nào**,
     trong khi SCIC nắm 10% một mã lẻ thì lại có nhãn. Đo 13/08/2026: 30/164 nhóm bị dán
     nhầm là tập đoàn tư nhân — PVN, EVN, TKV, Viettel, Vinachem, VIMC, GVR, Vinatex,
     Sonadezi, BID, CTG, GAS, ACV, HVN, BVH, KSV, DCM, DPM, OIL, PVT, BHN, TVN, LLM…
     BA lối nhận, thiếu lối nào cũng hụt cả mảng lớn (đo 14/08/2026: **74/164 nhóm** là nhà
     nước, trước khi vá chỉ nhận ra 12):
     · **Cơ quan (`NHA_NUOC`)** — Bộ, UBND, Tỉnh uỷ, Ngân hàng Nhà nước, SCIC, Uỷ ban Quản lý
       vốn. **Phải khai đủ BIẾN THỂ CHÍNH TẢ của nguồn**: có mã ghi "People's Committee of X",
       mã khác ghi "People Committee of X" (thiếu dấu sở hữu), lại có mã ghi thẳng "Province
       of Ha Tinh" hay "…State-owned Company". Khai một kiểu là mất sạch mấy kiểu kia.
     · **Khai tay `NN_TAY`** — CHỈ cho nhóm mà mẹ **chưa niêm yết** (PVN, EVN, TKV, Viettel,
       Vinachem) hoặc nguồn không trả nổi một dòng cổ đông nào (VIMC): kho không có
       `data/profile/{MÃ}.json` của chính mẹ thì không có đường nào suy ra. Tên nhận diện
       dùng lại luôn từ khoá của nhóm đó trong `TU_KHOA`, khỏi khai hai chỗ.
     · **Bảng `NN_TEN`** — tổng công ty nhà nước CHƯA NIÊM YẾT mà không tự thành nhóm lớn:
       Petrolimex, VICEM, Vinataba, Sông Đà, HUD, Agribank, VNPT, Becamex, SAWACO, Tân Cảng
       Sài Gòn, EVNCPC/EVNSPC, NXB Giáo dục, Saigontourist, SAMCO, SAGRI, Bến Thành, IPC…
       Ghi kèm CHỦ SỞ HỮU ngay cạnh mỗi dòng để soát lại được. **KHÔNG khai tổng công ty ĐÃ
       THOÁI VỐN** — Vinaconex (nay Pacific Holdings 50,6%), Viglacera (GELEX), IDICO, DIC
       Corp, Viconship, VNE đều đã về tay tư nhân, dán nhãn nhà nước là sai hẳn.
       **CẮT ĐUÔI LOẠI HÌNH khi khai từ khoá**: nguồn ghi Becamex IDC là "Investment and
       Industrial Development **Joint Stock Company**" chứ không phải "…Corporation" — khai
       trọn tên pháp lý là trượt, mà trượt thì im lặng.
     · **Suy từ dữ liệu** — nhóm nào có mẹ NIÊM YẾT thì đọc thẳng cổ đông của chính mẹ và
       **CỘNG DỒN mọi cổ đông nhà nước**, quá bán là cả nhóm mang nhãn. Cộng dồn chứ đừng đòi
       một ông nắm quá bán một mình: nhà nước hay chia phần qua nhiều cửa (HVN = Uỷ ban 55,2%
       + SCIC 31,1%). Nhờ vậy GAS (PVN 95,8%), BID/CTG (NHNN), ACV/HVN (Uỷ ban), GVR 96,8%,
       VGT 53,5%, SNZ 99,5%, KSV 98%, BVH (Bộ Tài chính 65%) tự có nhãn — **ĐỪNG khai tay mấy
       nhóm này**, thêm một chỗ phải nhớ cập nhật mà chẳng được gì.
     **Ngưỡng phải là QUÁ BÁN, đừng hạ** — đó cũng đúng định nghĩa "doanh nghiệp nhà nước"
     của Luật Doanh nghiệp. SCIC nắm 36% Vinamilk và 36% Sabeco, cổ đông lớn nhất nhưng không
     cầm quyền; gọi hai nhà đó là doanh nghiệp nhà nước là sai hẳn, Sabeco do ThaiBev nắm
     53,6%. Hai ca sát ngưỡng cố ý để NGOÀI: Tín Nghĩa (UBND Đồng Nai 48,1%) và CLX (HFIC
     49,0%). Dòng log phải đếm RIÊNG ba loại: bản cũ ghi "{tt} tập đoàn, {còn lại} nhà
     nước/cơ quan" nên gộp luôn nhóm cá nhân chi phối vào cột nhà nước.
     > **`khong_dau` PHẢI ĐỔI đ/Đ THÀNH d TRƯỚC KHI BỎ DẤU.** Chữ Đ (U+0110) và đ (U+0111)
     > KHÔNG tách được bằng NFD, nên `encode(ascii,"ignore")` **nuốt luôn** chứ không để lại
     > chữ d: "Điện lực" ra `ien luc`, "Đô Thị" ra `o thi`, "Đầu tư" ra `au tu`. Hệ quả im
     > lặng: mọi từ khoá viết bằng "d" — `dien luc viet nam` (EVN), `det may viet nam`
     > (Vinatex) — **không bao giờ khớp**; hai nhóm đó chỉ sống sót nhờ tình cờ có thêm từ
     > khoá viết tắt "evn"/"vinatex" trong tên. Cùng bài học với hai dạng Unicode của
     > `data/fin`: so tên tiếng Việt mà không chuẩn hoá là trượt lặng lẽ, không có lỗi nào.
  10. **BỐN HẠNG + QUAN HỆ CHA–CON, vì danh sách phẳng trộn BA TẦNG của cùng một cây sở hữu.**
     User bắt đúng chỗ này 14/08/2026: "Ngân hàng Nhà nước đã nắm CTG ở nhóm trên rồi, sao
     xuống dưới CTG lại có nhãn nhà nước nữa — hơi mâu thuẫn". Đo ra thì không phải lỗi nhãn
     mà là lỗi CẤU TRÚC: **42/164 nhóm thật ra là NHÁNH CON của một nhóm khác** (CTG/BID ⊂
     Ngân hàng Nhà nước, GAS ⊂ PVN, TCB ⊂ Masan, MBB ⊂ Viettel, VNM/SAB/Vinatex ⊂ SCIC), và
     **144/678 mã nằm trong hơn một nhóm** — nhưng tất cả bày phẳng như nhau nên không đọc
     ra cái nào chứa cái nào.
     · `kieu` nay có **BỐN** giá trị: `tt` tập đoàn tư nhân · `nn` doanh nghiệp nhà nước ·
       **`cq` cơ quan nắm vốn** · `cn` cá nhân chi phối. Tách `cq` khỏi `nn` là mấu chốt:
       PVN/EVN/Viettel là MỘT NHÀ (hợp nhất báo cáo, chung ban điều hành), còn Ngân hàng Nhà
       nước / SCIC / Bộ / UBND chỉ là **danh mục cổ phần** — VCB, BID, CTG cùng một chủ
       nhưng là ĐỐI THỦ của nhau. Cơ quan xét TRƯỚC `nn`, bằng không SCIC (vừa là cơ quan
       vừa được `la_nha_nuoc` gật đầu) lại thành "tập đoàn".
     · `cha`/`chaTen` = nhóm chứa CÔNG TY MẸ của nhóm này. Mẹ nằm trong nhiều nhóm thì chọn
       nhà nắm NHIỀU NHẤT (HVN thuộc cả Uỷ ban 55,2% lẫn SCIC 31,1%; PPC thuộc cả EVN lẫn REE).
     · **KHÔNG gộp hay xoá nhánh con**: 26/49 cặp có mã mà nhóm cha KHÔNG có — SCIC chỉ nắm
       VGT, còn 19 mã dệt may kia là con của chính Vinatex. Bỏ đi là mất thật.
     Giao diện: bảng chia **bốn khối có tiêu đề** (`.tdhang`) kèm một câu giải thích ngay
     dưới tiêu đề khối (`.tdghi`) — chỗ user thắc mắc thì lời giải phải nằm ngay đó, đừng
     đẩy xuống ghi chú cuối bảng. **Mỗi hàng chỉ MỘT nhãn và nhãn phải nói thêm được điều
     gì**: nhánh con mang `thuộc <nhà mẹ>` (xám, chữ thường) THAY CHO việc lặp lại "nhà
     nước" — đó chính là câu trả lời cho thắc mắc trên; nhóm gốc mới giữ nhãn hạng.
     > **Tên cơ quan phải VIỆT HOÁ trước khi cắt** (`ten_viet` + bảng `DOI_TEN`): nguồn trả
     > "Commission for the Management of State Capital at Enterprises", "People's Committee
     > of Binh Duong province" — để nguyên thì bảng của một trang tiếng Việt vừa dài vừa bị
     > cắt cụt vừa lạc quẻ. Cắt trước rồi mới đổi là không khớp bảng nào nữa.
     > Nhãn `thuộc …` bỏ đuôi "Việt Nam" **chỉ khi tên quá 30 ký tự** — bỏ vô điều kiện thì
     > "Cao su Việt Nam" teo thành "Cao su", đọc chẳng ra nhà nào.
     > **TÊN TỈNH nằm trong chuỗi tiếng Anh nên KHÔNG DẤU** — cắt phần tiếng Anh xong còn
     > "UBND Binh Duong", "Tỉnh uỷ Ba Ria-Vung Tau" đứng giữa một bảng toàn tiếng Việt có
     > dấu, trông như dữ liệu hỏng. Bảng `TINH` khai đủ 63 tỉnh cũ + tên sau sáp nhập 2025,
     > **khoá bằng chính `khong_dau()`** nên gạch nối và khoảng trắng thừa đều khớp; nguồn
     > viết cả `…province` lẫn `…city` nên regex phải nuốt cả hai đuôi. 9 nhóm được đổi.
  Nhóm do nhà nước hay cá nhân chi phối vẫn giữ nhưng gắn `kieu` để giao diện dán nhãn —
  Ngân hàng Nhà nước nắm cả BID+VCB+CTG nhưng ba ngân hàng đó không cùng một nhà.
  Bảng mặc định xếp VỐN HOÁ cao→thấp (`tdSort`), bấm lại nút đang bật là lật chiều; thứ tự
  áp cho cả hàng nhóm lẫn công ty con. Hàng nhãn cột phải mang **đúng class của từng cột**
  (`tdp`/`tdv`/`tdg`) — thiếu class thì nhãn canh trái còn số canh phải.
  **MÁY BÀN LÀ LƯỚI 6 CỘT, MÀN HẸP LÀ THẺ HAI TẦNG — hai bố cục khác hẳn nhau (17/08/2026).**
  Cột **thanh xanh đỏ đã gỡ** khỏi cả hai (nó chỉ vẽ lại dấu của cột % ngay cạnh, mà ăn 92px
  trong khi tên nhà đang bị cắt); `.secrow` bên bảng NGÀNH thì GIỮ — ở đó ~25 dòng đọc một
  lượt nên thanh có việc thật là xếp hạng bằng mắt. Lớp `#tdPanel.xcap`/`.xgtgd` cũng **xoá
  hẳn**: nó sinh ra chỉ để màn hẹp chọn hiện MỘT cột tiền, nay hẹp không còn chạy lưới cột.
  Màn hẹp:
  ```
  [▸][logo] TCB · Kỹ Thương Việt Nam  [thuộc Masan Group] ········· −0,05%
  vốn hoá 248.701 tỷ · GTGD 556 tỷ · NN ròng +79,7 tỷ
  ```
  Bốn luật, phá cái nào cũng hỏng theo một kiểu ĐÃ ĐO ĐƯỢC:
  1. **Hai tầng tách bằng TOÁN BỀ NGANG, không thêm thẻ bọc**: ô tên `calc(100% - 72px)` + ô %
     `66px` + `column-gap:6px` = tròn 100%, nên mấy mẩu số hết chỗ và buộc rơi xuống tầng 2.
     Đổi bề ngang ô % hay `column-gap` thì **phải đổi số 72 theo** (72 = 66 + 6).
  2. **Ô tên phải có `max-width:calc(100% - 38px)`.** Flex xét xuống dòng theo bề ngang TỰ
     NHIÊN của ô, mà tên ngân hàng tự nhiên dài hơn cả dòng → NGUYÊN Ô bị hất xuống, bỏ logo
     đứng một mình gần hết một dòng trống. Chặn trần đúng phần còn lại sau `[▸]`+logo thì ô
     luôn vừa dòng một, rồi CHỮ bên trong mới xuống dòng — đó mới là chỗ cần xuống dòng.
  3. **Nhãn nằm NGANG trước số, chữ thường, mờ — đừng bao giờ xếp nhãn LÊN TRÊN số.** Bản
     16/08 xếp chồng nhãn-in-hoa thành 4 ô: nhãn nằm trên số nghĩa là bốn nhãn ấy **lặp lại ở
     mọi hàng — 656 mẩu chữ in hoa giãn cách** phủ kín bảng, mắt bị chúng kéo đi trước cả khi
     đọc tới con số, và hàng cao **90,8px** (một màn 812px chỉ thấy 8,9/164 nhóm). Nhãn cột
     chỉ đáng in hoa khi đứng MỘT LẦN trên đầu bảng. Bản một-dòng: **68,3px**, 11,9 nhóm/màn.
  4. **Ô đếm ▲▼ ẨN ở màn hẹp — CHỈ ở bảng tập đoàn.** Bốn mẩu số cần 387px mà hàng chỉ rộng
     313px nên phải cắt một; ▲▼ là mẩu ĐÚNG để cắt vì nó là thứ duy nhất người xem tự lấy lại
     được (bấm mở nhóm ra là thấy % từng công ty con, chi tiết hơn hẳn), còn hướng cả nhóm đã
     nằm ở ô % cỡ lớn. **Bảng quỹ giữ `.sb`** — cùng ô ấy bên đó lại là "15 mã", một trong ba
     mẩu duy nhất của hàng quỹ.
  > **Ô CÙNG TÊN, HAI BẢNG, NGHĨA KHÁC HẲN — mọi luật `order`/`::before`/`::after` phải khai
  > RIÊNG `#tdPanel` và `#quyPanel`.** `.sb` = đếm ▲▼ / "15 mã"; `.sc` = GTGD / giá trị danh
  > mục; `.sv` = vốn hoá / KỲ CÔNG BỐ; `.tdp` = vốn hoá / phần quỹ đang nắm. Dấu `·` ngăn mẩu
  > cũng vậy: đặt sau mọi mẩu TRỪ MẨU CUỐI, mà mẩu cuối hai bảng khác nhau (tập đoàn kết ở
  > `.sn2`, quỹ kết ở `.sv`) — dùng chung là lòi ra một dấu `·` lơ lửng, đọc như câu bỏ dở.
  **CHIP LỌC THEO HẠNG** (`tdLoc`, 17/08/2026): `[Tất cả 164][Tư nhân 81][Nhà nước 57]
  [Cơ quan 17][Cá nhân 9]` — chỉ GIẤU BỚT KHỐI, không đổi cách gom nhóm hay thứ tự bên trong.
  Ba luật dùng chung với chip mức rơi của Về bờ:
  · **Đếm trên rổ ĐẦY ĐỦ, không đếm theo phần đang hiện** — đếm sau khi lọc thì mọi chip khác
    tụt về 0, không còn đường đọc trước xem bấm sang được bao nhiêu, mà cũng không còn đường
    quay ra.
  · **Tiêu đề khối / ô tìm / hàng chip PHẢI Ở LẠI kể cả nhánh RỖNG.** Chọn phải rổ 0 mã mà
    hàng chip biến mất thì hết đường bấm về, phải tải lại trang (đúng lỗi đã vá cho `#vbQ`).
    Và câu giải thích dưới tiêu đề khối mới là thứ nói "cơ quan" khác "nhà nước" ở chỗ nào —
    đúng lúc người ta vừa chủ động bấm vào khối ấy nên đang cần đọc nhất.
  · **Chip nằm RIÊNG một hàng, đừng nhét vào `.ph` cùng nút xếp** — hàng đó ở màn hẹp đã phải
    bẻ tiêu đề xuống ba dòng để chứa hai nút xếp; và hai thứ khác việc nhau (xếp đổi THỨ TỰ,
    lọc đổi CÁI GÌ ĐƯỢC HIỆN).
  > **KÉO MÀN VỀ HÀNG CHIP: THỨ TỰ HAI PHÉP ĐỌC QUYẾT ĐỊNH ĐÚNG SAI.** Lọc 164 → 17 nhóm làm
  > tài liệu ngắn đi hàng nghìn pixel nên trình duyệt tự KẸP `scrollY` xuống đáy mới. Phải
  > đọc `getBoundingClientRect()` TRƯỚC (chính nó ép tính lại bố cục, việc kẹp xảy ra trong
  > lượt tính đó) rồi mới đọc `scrollY`. Đảo lại là cộng toạ độ MỚI với `scrollY` CŨ, ra một
  > điểm không có thật — đo được nhảy tới 1734 trong khi hàng chip nằm ở 366, lệch 1368px,
  > bấm lọc xong nhìn như trang trắng.
  > **ĐỪNG bọc trong `requestAnimationFrame` và đừng dùng `behavior:'smooth'`** — tab ở nền
  > thì rAF không bao giờ fire và smooth bị bỏ qua (đo tại chỗ: smooth giữ nguyên scrollY=4000
  > trong khi 'auto' nhảy đúng 311). Đọc rect là đã có số đúng, không cần đợi khung hình nào.
  **TÊN NHÓM BỎ ĐUÔI PHÁP LÝ LÚC HIỆN, KHÔNG CẮT TRONG KHO** (`tenGon` → `shortName`, cùng
  hàm mà hàng công ty con đang dùng nên mở nhóm ra là một lối viết). Đuôi ấy giống hệt nhau ở
  mọi mã cùng loại — mười mấy nhóm ngân hàng đều mở đầu "Ngân hàng Thương mại Cổ phần …",
  34 ký tự không phân biệt được nhóm nào với nhóm nào. Tên đầy đủ về `title` (57 nhóm).
  Đo 164 nhóm: 31,3 → 25,6 ký tự, số tên phải xuống dòng ở màn hẹp **77 → 0**.
  > Đi kèm: trần tên nhóm trong `build_tapdoan.py` **nới 46 → 72 ký tự**. Mốc 46 đặt hồi cột
  > tên còn hẹp, khiến 30/164 nhóm cụt ngay giữa tên riêng — mà cắt ở kho thì `shortName`
  > không cứu lại được ("TCB · Ngân hàng Thương mại Cổ phần Kỹ Thương…" rút gọn vẫn cụt).
  > Dựng lại xác nhận: 164 nhóm y nguyên, **0 trường nào ngoài `ten` đổi**, 0 tên còn cụt.
- **VỀ BỜ — HÀNG NHÃN CỘT CŨNG PHẢI MANG CLASS CỦA CỘT, cùng bài học với bảng tập đoàn.**
  Bản cũ để tám thẻ `<span>` TRẦN, trong khi khổ hẹp ẩn ba cột dữ liệu bằng chính class
  (`.vbb`/`.vbp`/`.vbv`) — nhãn không ẩn theo, tám nhãn dồn vào lưới năm cột rồi tràn xuống
  dòng: user chụp ảnh báo 15/08/2026 thấy "GIÁ · ĐỈNH CŨ VỐN HOÁ" dính liền ở dòng hai, còn
  con số vốn hoá nằm ngay dưới chữ "ĐỂ VỀ BỜ" nên đọc ra thành *"vốn hoá để về bờ"* — vô
  nghĩa. Có class thì nhãn ẩn/hiện và canh lề tự đi theo cột, **bỏ hẳn được luật
  `nth-child`**; đổi lại phải tắt phần TRANG TRÍ mà class mang theo (`.vbb` trong hàng nhãn
  sẽ hiện thành một vạch xám nếu không `height:auto;background:none`).
  Kèm hai thứ: **padding NGANG của hàng nhãn phải bằng hàng dữ liệu** (đo được lệch đúng 4px
  khi hàng nhãn giữ 6px còn hàng dữ liệu 2px), và nhãn ở khổ hẹp phải **được xuống dòng** —
  "vốn hoá hiện tại" mà ép `nowrap` là tràn khỏi cột đè sang cột bên.
  **Chữ trên nhãn phải BỔ SUNG cho ô, đừng lặp lại**: cột `×1.4` trong ô đã có phụ đề "để
  về bờ" rồi nên nhãn ghi **"cần tăng"** — đọc dọc thành "cần tăng ×1,4 để về bờ". Cột tiền
  ghi đủ **"vốn hoá hiện tại"** chứ không phải "vốn hoá" cụt: đứng cạnh cột "để về bờ" thì
  một chữ "vốn hoá" trần bị đọc dính vào cột bên trái.
- **VỀ BỜ — BA CHẾ ĐỘ MỨC RƠI, CỘNG DỒN VỚI NGÀNH (`vbChe`, 17/08/2026).**
  ```
  [Rơi sâu 1075]  dath ≤ −30   ·  [Gần đỉnh 138]  dath > −10  ·  [Tất cả 1521]
  ```
  Trước chỉ có MỘT rổ "đã rơi quá 30%"; rổ ngược lại — mã đang SÁT ĐỈNH — không có đường nào
  xem, trong khi nó trả lời câu hỏi khác hẳn và cũng chính đáng: giữa lúc thị trường đỏ thì
  mã nào vẫn chưa rời đỉnh. `dath` luôn ≤ 0 nên "giảm dưới 10%" là `dath > -10`.
  **Chế độ và ngành nay CỘNG DỒN, không loại trừ nhau** — hỏi được "trong ngành ngân hàng,
  mã nào còn sát đỉnh?" (đo: 30 mã ngành → 15 rơi sâu / 4 gần đỉnh).
  > **Luật user chốt 15/08/2026 VẪN GIỮ, chỉ đổi cách cài: chọn ngành thì hiện ĐỦ mã của
  > ngành.** Nay đó là GIÁ TRỊ MẶC ĐỊNH (`vbBind` đặt `vbChe='het'` khi ngành đổi) chứ không
  > phải luật cứng trong `vbLoc`, nên trong ngành vẫn lọc tiếp được. Về lại `all` thì tự quay
  > về `'sau'` — `'het'` ở toàn thị trường là 1.521 dòng vô nghĩa. **Chỉ đặt khi ngành THẬT
  > SỰ đổi**: bấm lại đúng ngành đang xem mà cũng nhảy về mặc định thì xoá mất bộ lọc người
  > ta vừa chọn.
  **HƯỚNG XẾP ĐI THEO CHẾ ĐỘ** (`vbSort.d = vbChe==='gan' ? -1 : 1`, chỉ khi đang xếp theo
  mức rơi): rổ "Gần đỉnh" mà vẫn xếp rơi-nhiều-nhất-trước thì mở ra thấy ngay mã −9,9% còn mã
  đang ở đúng đỉnh nằm tận cuối — ngược hẳn thứ vừa bấm vào để tìm.
  **MÃ ĐANG Ở ĐÚNG ĐỈNH THÔI TÔ ĐỎ** (`.vbd.dinh`/`.vbl.dinh`, ngưỡng `dath > -0.5` xét theo
  GIÁ TRỊ chứ không xét chuỗi đã in — 0% là số làm tròn). Cột "rơi khỏi đỉnh" luôn đỏ, đúng
  khi rổ toàn mã rơi sâu; nhưng rổ "Gần đỉnh" có 54/100 dòng đầu là 0%, một màn đỏ rực báo
  hiệu điều ngược hẳn sự thật. Phụ đề cột `×` cũng đổi "để về bờ" → "đang ở đỉnh".
  > **Ghi chú cuối bảng PHẢI nói thẳng cái bẫy của rổ mới**: sát đỉnh KHÔNG có nghĩa là khoẻ
  > hay sắp tăng tiếp — mã thanh khoản mỏng đứng im hàng tháng cũng nằm ở đây, vì giá không
  > đi đâu thì cũng không rời đỉnh. Đây là phép đo vị trí giá, không hơn. (Cùng lối với câu
  > "rơi sâu không có nghĩa là sắp hồi" của rổ kia — xem mục Ranh giới pháp lý.)
  Cột chọn ngành đếm **`đã rơi quá 30% / tổng mã`** để trước khi bấm đã biết chọn vào sẽ thấy
  gì. Bốn thứ phải giữ:
  1. **`#vbSecBar` và `#vbSecBd` phải được CHUYỂN RA THẲNG `<body>`** (`vbBind`). Tổ tiên
     có `backdrop-filter` (header và mấy thẻ của trang này đều có) trở thành khối chứa của
     `position:fixed` — để nguyên chỗ dựng thì cột không bám mép màn (đo được lệch 28px máy
     bàn, 14px màn hẹp) và chiều cao bị cắt theo tổ tiên đó. Cùng họ với luật "`#tgPops`
     phải đứng SAU `<svg>`" của bản đồ thế giới.
  2. **Chuyển ra body thì phải TỰ DỌN bản cũ**: `renderRadar` dựng lại panel mỗi lượt bơm
     giá sống (~1 phút), không gỡ bản trước là mỗi phút chồng thêm một cột chết trong body.
     Giữ tham chiếu ở `vbBarEl`/`vbBdEl`, và nhớ trạng thái đang mở (`vbSecMo`) để lượt vẽ
     lại không đóng sập cột người dùng vừa mở.
  3. **Nút "☰ Ngành" phải `flex:none`** — hàng `.ph` là flex, để nút co thì khổ hẹp nó teo
     còn "☰…" (đo 43px trong khi chữ cần 73px). Thứ được phép bị bóp là TIÊU ĐỀ.
  4. **Khổ hẹp cho `.ph` xuống dòng** (`.panel.vbpan>.ph{flex-wrap:wrap}`, tiêu đề
     `flex:1 1 100%`): nhồi tiêu đề + ba nút vào một hàng 390px thì tên ngành bị cắt còn
     "T…" — mất đúng thứ cho biết đang xem ngành nào. Thà cao thêm một dòng.
  Nút giữ nhãn NGẮN CỐ ĐỊNH ("☰ Ngành"), tên ngành để tiêu đề nói — nhét tên ngành vào nút
  là vừa lặp vừa làm nút phình theo độ dài tên.
- **VỀ BỜ — Ô TÌM MÃ (`#vbQ`), gõ được NHIỀU mã một lúc.** Dùng chung `tachMa` với hai ô gõ
  mã của Đường đua nên "vic, hpg  FPT" hay "HPG FPT" đều ra cùng kết quả. **Gõ mã thì THAY
  THẾ mọi bộ lọc khác** (cả ngưỡng −30% lẫn ngành đang chọn) — gõ tên một mã cụ thể là muốn
  thấy ĐÚNG mã đó, không phải "mã đó nếu nó tình cờ thoả điều kiện đang bật"; nút ngành làm
  mờ đi cho khỏi tưởng vẫn đang lọc theo ngành. Bốn thứ phải giữ:
  1. **Ô TÌM PHẢI CÒN ĐÓ KỂ CẢ KHI KHÔNG RA MÃ NÀO.** Nhánh "rỗng" cũ `return` một `.empty`
     trần, nên gõ sai một chữ là ô biến mất — không còn đường sửa, phải tải lại trang.
  2. **Giữ TIÊU ĐIỂM và VỊ TRÍ CON TRỎ qua mỗi lượt vẽ lại** (`vbCaret`). Panel dựng lại từ
     chuỗi HTML nên ô bị thay bằng ô mới: không tự trả lại con trỏ thì gõ tới chữ thứ hai là
     mất tiêu điểm, bàn phím điện thoại đóng sập. Nhớ cả VỊ TRÍ chứ không chỉ `focus()` —
     nhảy về cuối chuỗi thì sửa một mã ở giữa là không sửa nổi. Hoãn 200ms cho mỗi phím gõ
     khỏi kéo theo một lượt lọc 1.500 mã.
  3. **Vòng giá sống phải BỎ QUA lượt dựng lại khi đang gõ** (`document.activeElement.id
     ==='vbQ'` trong `startLive`) — bằng không cứ ~1 phút là ô đang gõ dở bị thay mới.
  4. **Mã gõ vào mà không hiện được thì NÓI RA MÃ NÀO** (`.vbmiss`), cùng luật với `#raThieu`
     của Đường đua: im lặng bỏ qua là người ta ngồi gõ lại mấy lần, tưởng mình gõ sai chính tả.
  `.pickbtn` vốn là nút cả-chiều-ngang ("Xem thêm 100 mã") nên trong hàng tìm phải ép
  `width:auto`, bằng không nút xoá chiếm trọn một dòng ở khổ hẹp.
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
- **CHỦ ĐIỂM ĐẦU TƯ ĐÃ BỎ HẲN 16/08/2026 — ĐỪNG DỰNG LẠI.** `data/chudiem.json`,
  `tools/build_chudiem.py`, `chuDiemPanel()`, `cdBadge()`, sơ đồ Venn, tab `?t=cd`, mục trong
  menu thả xuống của cả 4 trang và lối rẽ "Chủ điểm" trong dải Radar mobile đều xoá.
  Đường dẫn cũ `?t=cd` **rơi về Nhịp phiên** chứ không trắng trang.
  Lý do: cả mục là quan điểm của SSI Research dẫn lại — danh sách 16 mã do họ chọn, cách chia
  ba trục do họ đặt. Sau khi gỡ khuyến nghị + giá mục tiêu (cùng ngày) thì phần còn lại chỉ là
  "SSI xếp mấy mã này vào ba nhóm": vừa mất gần hết giá trị, vừa vẫn là ý kiến của một đơn vị
  CÓ giấy phép tư vấn đầu tư mà CPVN dẫn lại. User chốt bỏ.
  > **Sơ đồ ba trục vốn NHẬP TAY nên cũng không có gì để tự động hoá lại.** Đã dò hết cửa và
  > đều đóng: `iboard-api.ssi.com.vn/research/*` → **401**, `api.ssi.com.vn/research/*` →
  > **404**, `ssi.com.vn/.../bao-cao-phan-tich` chặn máy, API báo cáo Simplize **bắt buộc có
  > `ticker=`** nên không lấy được báo cáo chiến lược toàn thị trường. Ghi lại để lần sau
  > không ai mất công dò lại.
  > **Hệ quả dây chuyền:** build_chudiem là hộ tiêu thụ CUỐI CÙNG của mảng `reports` trong
  > `data/news`. Bỏ nó xong thì pipeline **thôi gọi `analysis-report/list`** luôn — bớt
  > ~1.500 lượt tới Simplize mỗi lượt `--full` — và mảng `reports` đã gỡ khỏi 1.527 file kho.

- **ĐIỀU HƯỚNG: MENU THẢ XUỐNG KHI RÊ CHUỘT (10/08/2026) — nay CHỈ CÒN CHO MÁY BÀN.**
  Từ 11/08/2026 khổ ≤760px ẩn hẳn dải này (`header .tabs{display:none!important}` trong
  `mobi.css`) và dùng thanh tab đáy — xem mục **Giao diện mobile** bên dưới. Mọi luật rê
  chuột/chạm dưới đây vẫn đúng, nhưng chỉ còn chạy ở khổ rộng (kể cả tablet cảm ứng >760px).
  Bảng giá · Radar · Đường đua, mỗi mục có menu con hiện khi rê chuột (`.tw:hover>.dd`).
  Bảng giá → 3 trang (`index.html` · `bubbles.html` · `congcu.html?m=tapdoan`);
  Radar → Nhịp phiên · Khi nào về bờ; Đường đua → Đường đua vốn hoá · Đầu tư bền vững.
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
  Radar nay chỉ còn **Nhịp phiên · Khi nào về bờ**; tập đoàn và quỹ đã dọn sang module
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
  **CHỈ SỐ SỨC MẠNH THỊ TRƯỜNG nằm trong GÓC DƯỚI-TRÁI bản đồ** (từ 16/08/2026 chỉ còn MỘT ô — ô "Sức mạnh TOÀN CẦU" lấy CNN Fear & Greed đã bỏ, xem mục *Gọi mạng*) (Nam Thái Bình Dương — trống ở
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
  **NHỊP 30 PHÚT (17/08/2026, trước là 2 phút), một hằng số `TG_HAN` cho cả ba chỗ.** Đây là
lượt gọi DUY NHẤT còn tỉ lệ thuận với người xem theo THỜI GIAN MỞ TAB chứ không theo số trang
mở — đo ở quy mô 1.000 người, nhịp 2 phút mà mỗi người mở radar 2 tiếng là 60.000 lượt · 2 GB
sang CNBC, VƯỢT cả VNDirect. Ba chỗ từng viết cứng 120000 (hạn đệm mỗi nước · hạn hỏi lại ·
hạn coi số là cũ khi vẽ) mà lệch nhau là có lượt gọi mạng xong vứt đi.
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
  **Nguồn KHÔNG có ngành "Nông nghiệp"** — nông nghiệp/thuỷ sản/mía đường nằm chung rổ với
  thực phẩm (nên rổ đó nay gọi là **"Thực phẩm & Nông sản"**). Tách ra được nhưng phải viết
  tay danh sách mã, `SECTOR_EXPLICIT` chỉ ánh xạ ngành→ngành nên không tách nổi một ngành
  làm đôi.
  > **TÊN NGÀNH LÀ TÊN HIỂN THỊ — `sector` thô trong `universe.json` KHÔNG ĐỔI.** Nguồn dịch
  > máy nên đẻ ra "Chứng khoán và Ngân hàng đầu tư", "Tiện ích điện và sản xuất điện",
  > "Quản lý và phát triển bất động sản", "Máy móc, thiết bị nặng và đóng tàu" — dài, lặp,
  > và không ai gọi thế. Lượt đổi tên 15/08/2026 (user chốt) đưa về cách gọi của thị trường:
  > Chứng khoán · Ngân hàng · Bất động sản · Điện · Hạ tầng giao thông · Vận tải & Logistics
  > · Ô tô & Phụ tùng · Nước & Môi trường · Thực phẩm & Nông sản · Cơ khí & Thiết bị điện ·
  > **Thép & Khoáng sản** (HPG/HSG/NKG/GDA chiếm gần hết vốn hoá rổ, tên phải nói ra).
  > Kèm hai mã lẻ về đúng nhà: "Năng lượng tái tạo" (3 mã thuỷ điện) → Điện, "Tiện ích khí
  > tự nhiên" (CNG) → Dầu khí, nên "Khác" từ 15 xuống 11 mã.
  > **`tools/build_nganh.py` chọn mẫu chỉ số theo TÊN THÔ** (`SEC_NH`/`SEC_CK`/`SEC_BDS`) —
  > sửa mấy hằng số đó "cho khớp giao diện" là không mã nào nhận được mẫu nữa. Đã kiểm:
  > dựng lại `data/nganh` sau khi đổi tên ra **0 file thay đổi**.
  > `tools/build_demo_mobi.py` giữ một bản sao thứ tư của bảng này (chỉ để dựng demo).
- ****TRẦN THÁNG CỦA ĐƯỜNG ĐUA nằm ở `build_screen.py` (`sorted(allm)[-168:]`), KHÔNG suy ra từ
kho.** Bồi kho về 2013 xong mà quên nâng số này thì đường đua VẪN chỉ chạy 6,5 năm — công bồi
đổ sông. Nâng 78 -> 168 cho ra 164 tháng (1/2013 -> 8/2026), 1.520 mã; đánh đổi có thật:
`market.json` 612 -> 1.247 KB thô, **132 -> 216 KB nén** (client tải ở trang công cụ). Muốn
gọn lại thì hạ số này, KHÔNG phải cắt kho — kho còn nuôi MA/RSI, đỉnh 52T, độ rộng, bộ lọc.

Đường đua lấy MỌI mã có SLCP**, không cắt bớt. Bản cũ chỉ lấy top 40 toàn thị trường +
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
**Radar là cửa vào ba góc soi thị trường**: Bong bóng · Tập đoàn · Về bờ. Dải hiện
ở cả ba trang của nhóm và thanh đáy sáng ở Radar trên cả ba, bằng không vào Bong bóng là mất
đường quay lại.

> **CẢ BỐN MỤC ĐỀU LÀ `<a href>` THẬT, kể cả hai mục nằm cùng trang radar** (`congcu.html?m=radar&t=cd|vb`).
> Bản trước để chúng là `<button>` không href, chỉ chạy nhờ bấm hộ vào menu máy bàn
> (`.dd a[data-md][data-t]`, đã ẩn ở khổ hẹp) — mà menu đó **CHỈ CÓ trên `congcu.html`**.
> Đứng ở `/bubbles` bấm "Chủ điểm" là NÚT CHẾT: `dd` trả null, trang đứng im, mà nút vẫn
> sáng lên. Có href thì trang nào cũng đi được; `congcu.html` mới `preventDefault` để đổi tab
> TẠI CHỖ (nhanh hơn tải lại), trang khác cứ để link chạy bình thường. **Đừng nuốt cú bấm
> khi không chắc trang này tự đổi tab được.**

Bảy cái bẫy, phá cái nào cũng hỏng (đánh số từ 0 vì bẫy đầu là bẫy mới nhất, user tự bắt):

0. **XOÁ `.on` TRÊN CẢ DẢI, đừng chỉ quét mấy mục đổi-tại-chỗ.** User chụp ảnh báo
   14/08/2026: vào `/tapdoan` (mục "Tập đoàn" đang sáng) rồi bấm "Về bờ" thì **SÁNG HAI MỤC
   CÙNG LÚC** — trang đã sang Radar phiên mà dải vẫn bảo đang ở Tập đoàn. Gốc: vòng dọn cũ
   viết `s.querySelectorAll('button')`, mà "Tập đoàn"/"Bong bóng" là thẻ `<a>` nên không bao
   giờ bị dọn. Quét `'a'` (nay cả bốn mục đều là `<a>`) là hết. Luật chung: **hàm dọn trạng
   thái phải quét ĐÚNG TẬP mà hàm dựng đã sinh ra** — dựng hai loại thẻ mà dọn một loại thì
   loại kia đóng băng ở trạng thái cũ.

1. **`mobi.js` phải đọc CẢ URL SẠCH, đừng chỉ dò chuỗi `"congcu"`.** `_redirects` viết lại
   `/radar`, `/tapdoan`, `/duongdua` bằng **rewrite 200** nên thanh địa chỉ giữ nguyên tên
   sạch và **không hề có `?m=`**. Dò mỗi "congcu" là vào `cpvn.io/radar` mất sạch bốn nút,
   thanh đáy sáng nhầm ở Bảng giá. Loại lỗi chỉ lộ ra ở đúng đường người dùng thật đi — ở
   localhost toàn gõ `congcu.html?m=...` nên nhánh đó không bao giờ chạy tới. `congcu.js`
   đọc theo path (`byPath`) cũng vì lý do y hệt.
   **HAI ĐƯỜNG VÀO CÙNG MỘT TRANG PHẢI RA CÙNG MỘT KẾT QUẢ**: `/radar?t=vb` và
   `congcu.html?m=radar&t=vb` là y hệt nhau. Bản trước chặn `/radar` ở một dòng riêng trả
   cứng `'phien'` rồi mới đọc `?t=` ở nhánh `/congcu` phía dưới — nên mở `cpvn.io/radar?t=vb`
   (đúng thứ chính dải này sinh ra) thì nội dung là Về bờ mà dải không sáng mục nào. Nay hai
   nhánh nhập một, chỉ khác chỗ lấy `m`.
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
6. **GỘP HAI GIÁ TRỊ LÀM MỘT THÌ PHẢI ĐI TÌM HẾT CHỖ ĐỌC GIÁ TRỊ CŨ.** Bản đồ toàn cầu gộp
   vào Nhịp phiên 13/08/2026 (`radarTab` thôi mang giá trị `'tg'`), nhưng `tgNhip` còn sót
   `if(cur==='radar'&&radarTab==='tg') tgVeLai()` — điều kiện **không bao giờ đúng nữa**.
   Hậu quả im lặng và đúng thứ nhịp riêng ấy sinh ra để chữa: mỗi 2 phút vẫn gọi mạng, tải
   số mới về đàng hoàng, rồi **VỨT ĐI** — mở lúc 9 giờ tối xem Mỹ thì số đứng im. Đo bằng
   nguồn giả trả % đổi theo từng lượt: bản cũ sau 150s vẫn hiện `+1,70%`, bản vá hiện
   `+3,40%`. Cùng họ với bẫy số 0: **một nhánh chết không báo lỗi, chỉ lặng lẽ không chạy.**

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

## Tin tức — BA CỔNG LỌC, giống hệt ở CẢ BA NƠI

User chốt 16/08/2026: *"tin chỉ nên đăng trong 30 ngày gần nhất … chỉ đưa tin có link dẫn
qua bên các trang báo chính thống, nếu dẫn tới simplize thì bỏ luôn"*. Ba cổng:

1. **Trong 30 ngày** — mục tin của trang mã là "gần đây có gì", không phải kho lưu trữ.
2. **Phải có `url` thật** — không mở được bài tại nguồn thì lý do duy nhất để dẫn tin của
   người khác cũng mất.
3. **Không trỏ Simplize.**

> **NGUỒN `api2.simplize.vn/news-event/list` ĐÃ BỎ HẲN — ĐỪNG GỌI LẠI.** Nó KHÔNG trả url
> thật của bài, chỉ có `slug` nội bộ; muốn mở bài phải gọi THÊM một lượt tới Simplize hỏi
> `sourceUrl`, lượt đó hỏng thì người dùng bị đẩy thẳng sang simplize.vn. Đo 16/08:
> **8.966/9.847** tin báo chí trong kho ở đúng tình trạng đó — tức "dẫn nguồn rõ ràng, bấm
> là sang trang họ" chỉ đúng với **9%** số tin. Nay chỉ còn VNDirect finfo (có url thật).
> `openNews(slug)` của bubbles và nhánh `slug` trong `CP.openNewsItem` đã xoá theo.

**BA NƠI PHẢI GIỐNG NHAU**: `refresh_daily.work_news` · `CP.loadNews` (core.js) ·
`SRC.news` (bubbles.html). Lệch một chỗ là nguồn sống trả một rổ còn kho trả rổ khác, mà
người dùng không có cách nào biết mình đang xem rổ nào.

Kết quả lượt dọn: **27.633 → 4.894 tin**, 1.527 → 1.435 file, kho 5,6MB. Nguồn còn lại:
hnx.vn 3.287 · hsx.vn 1.324 · tapchicongthuong.vn 193 · vndirect.com.vn 90.
> Tin cũ **vẫn nằm trong lịch sử git** nếu sau này cần lấy lại.

## Cổ đông — LỌC CÁ NHÂN DƯỚI 5%, TỔ CHỨC GIỮ HẾT

`tools/codong.py` là bản gốc; `cophieu.html` giữ **bản sao JS** cho nhánh `liveOwnership`
(mã kho chưa có) — **sửa một chỗ phải sửa cả hai**, bằng không mã mới hiện một rổ cổ đông
khác hẳn mọi mã khác mà người xem không có cách nào biết.

Tên người thật + tỉ lệ sở hữu là **dữ liệu cá nhân** theo Luật 91/2025 (hiệu lực
01/01/2026) — nhóm có trần phạt cao nhất trong hồ sơ. Lập luận bảo vệ là *"đã công khai
theo nghĩa vụ pháp luật"*, mà nghĩa vụ ấy chỉ áp cho **cổ đông lớn ≥5%**. Kết quả:
**15.318 → 5.435 bản ghi**.

> **TỔ CHỨC KHÔNG CÓ SÀN %** — cắt là vỡ ÂM THẦM `build_tapdoan.py`: nhãn doanh nghiệp
> nhà nước tính bằng cách **cộng dồn mọi cổ đông nhà nước, không có sàn**. Một Bộ nắm 3%
> cộng SCIC 48% = 51% → nhà nước; bỏ ô 3% là còn 48%, cả nhóm mất nhãn, không lỗi nào báo.
> Phép thử hồi quy sau khi lọc: **164 nhóm → 164, 0 nhãn hạng đổi, 0 mã con đổi.**

**BA KIỂU KHỚP, mỗi kiểu chữa một lỗi ĐO ĐƯỢC — đừng gộp làm một:**
- `CHUA` — từ khoá dài, khớp chuỗi con bất kỳ đâu.
- `DAU` — từ tiếng Việt chỉ cơ quan (`quy`,`bo`,`so`,`cuc`,`vien`…), **CHỈ khi đứng đầu**.
  Khớp ở cuối là bắt nhầm TÊN NGƯỜI: "Nguyen Van Quy", "La Thi Quy", "Le Thanh Vien",
  "Lim Young So" — riêng `quy` dính **48 bản ghi**.
- `DUOI` — hậu tố pháp lý Latin (`ltd`,`jsc`,`llc`,`ab`,`sa`…), **CHỈ trong hai từ cuối**.
  Cho lùi một nấc vì có tên đính đuôi trong ngoặc: "T. Rowe Price International Ltd.
  (Australia)". Bản đầu để `ab` vào nhóm chuỗi con còn bản JS quên khai → "Tundra Fonder
  AB" ra hai kết quả khác nhau ở hai bên.

> **GIỚI HẠN ĐÃ BIẾT: KHÔNG NHẬN RA NGƯỜI NỘI BỘ.** Người nội bộ (HĐQT, BKS, TGĐ, Kế toán
> trưởng…) phải công bố sở hữu **bất kể tỉ lệ** (Điều 127 Luật CK 2019, Thông tư 96/2020)
> nên họ VẪN thuộc diện "đã công khai" — nhưng nguồn Simplize
> `ownership/shareholder-fund-details` **không trả trường chức vụ** (chỉ tên, %, số CP,
> giá trị, quốc tịch) và **không có endpoint ban lãnh đạo** (đã dò 5 dạng, 404 cả 5).
> Nên sếp nắm dưới 5% bị cắt cùng nhà đầu tư nhỏ lẻ. Muốn giữ họ thì phải lấy nguồn có
> NHÃN CHỨC VỤ — báo cáo quản trị công ty của HOSE/HNX — chứ đừng hạ ngưỡng xuống 1%:
> ngưỡng đó không có căn cứ pháp lý nào, chỉ là đoán.
> Tỉ trọng sở hữu tổng thể vẫn còn ở trường `own` (cổ đông chiến lược / thông thường / quỹ).

## Phân tích dữ liệu (`/phantich`) — kho giao dịch, đặc trưng và bộ đo

Module thứ 5 của `congcu.js`, dựng 20-21/08/2026. Bốn tầng dữ liệu, mỗi tầng một công cụ:

```
kho_giaodich.py --sau   -> data/giaodich/{MÃ}.json   giá + sổ lệnh + khối ngoại + tự doanh theo phiên
kho_giaodich.py --vg    -> data/phien/{NGÀY}.json    vùng giá khớp lệnh + phân bổ dòng tiền
build_phantich.py       -> data/phantich.json        chuỗi toàn thị trường (nhẹ, tải ngay)
                        -> data/phien/{NGÀY}.json    bảng mã của phiên (trộn vào, không đè)
kho_dactrung.py         -> data/dactrung/{MÃ}.json   đại lượng dẫn xuất + cơ bản theo NGÀY CÔNG BỐ
quet_la.py --phien 100  -> data/phien/{NGÀY}.json    khối `la` (quét bất thường) + `dt` (lát cắt ngang)
```

### ĐỘ SÂU KHÔNG ĐỀU — bẫy đã trả giá 21/08/2026

Kho mang tiếng "100 phiên" (user chốt 21/08: *"tao chỉ cần 100 phiên thôi"*), nhưng đo ra:

| tầng | trước khi vá | sau |
|---|---|---|
| giá / khối lượng / thoả thuận / SLCP | 100 phiên | 100 |
| khối ngoại (GT, sở hữu, room) | **60** | 120 |
| sổ lệnh lúc đóng cửa | **30** | 250 |
| tự doanh | phần lớn 0 — **là thật**, mã không có tự doanh | — |

Gốc: `dl_nap` thoát sau trang 1 và `_kqgd_nap` thoát sau trang 2, hai con số viết cứng
không chỉnh được từ ngoài. Tức đúng tầng HIẾM NHẤT — thứ không nguồn nào cho lại được
sau này, phải cào đúng lúc nó còn — lại là tầng mỏng nhất. Nay có `TRANG_LUONG` và
`--trang N` truyền xuống cả ba tầng.

> **ĐÂY KHÔNG PHẢI NỚI TRẦN NHỊP MẠNG.** Trần vẫn 4 lượt/giây với `finance.vietstock.vn`;
> xin thêm trang chỉ làm lượt chạy DÀI HƠN. Đừng bao giờ đụng `TRAN` trong `nhipmang.py`
> để chạy nhanh hơn — xem luật ở đầu file đó.

### FREE FLOAT — có sẵn trong kho từ lâu mà không chỗ nào đọc (21/08/2026)

`data/profile/{MÃ}.json` có trường `freeFloat` cho **1.429/1.525 mã**. Đo phiên 20/08:

```
Vốn hoá toàn bộ    : 10.167 nghìn tỷ
Vốn hoá free float :  2.050 nghìn tỷ   ← 20,1%
```

Và thứ hạng lật hẳn: **BID** 279 nghìn tỷ → 7 (free float 2,6%) · **VGI** 266 → 4 (1,3%) ·
**GAS** 201 → 8 (4,0%) · **VCB** 483 → 30 (6,2%) · **STB** 140 → **133** (95,0%).
Đây là lời giải cho chuyện ai cũng thấy mà không giải thích được: **BID vốn hoá gấp đôi
STB nhưng STB mới là mã chạy**. Xếp hạng hay cộng tổng theo vốn hoá danh nghĩa là đo một
thứ không giao dịch được.

Kiểm chứng bằng số chứ không chỉ bằng khái niệm: vòng quay tính trên free float dự báo
lợi suất phiên sau **mạnh hơn** vòng quay tính trên toàn bộ cổ phiếu (rank IC −0,043
t=−3,29 so với −0,036 t=−3,18, đo trên 99 phiên).

> **THIẾU THÌ ĐỂ TRỐNG, ĐỪNG LẤY 100 LẤP VÀO.** 96 mã nguồn không có số; coi chúng là
> 100% free float thì đúng nhóm không biết gì lại nhảy lên đầu bảng thanh khoản.

### KHO ĐẶC TRƯNG `data/dactrung` — CƠ BẢN GẮN THEO NGÀY CÔNG BỐ

Bốn luật, phá cái nào cũng ra số trông hợp lý mà sai:

1. **CƠ BẢN THEO NGÀY CÔNG BỐ, KHÔNG THEO NGÀY CHỐT KỲ.** Cái bẫy giết nhiều nghiên cứu
   nhân tố nhất và nó im lặng tuyệt đối: lãi quý 2 chốt sổ 30/06 nhưng mãi cuối tháng 7
   hoặc tháng 8 mới ra thị trường, gán nó cho phiên 01/07 là cho mô hình biết trước
   tương lai 30-60 ngày. `data/sukien` có sẵn ngày công bố thật (**1.199 mã, trung vị 26
   quý, từ 2020** — trường `k:'bctc'`). Mã không có ngày công bố thì **để trống phần cơ
   bản**, đừng lùi đại 45 ngày cho có.
2. **VÒNG QUAY TÍNH TRÊN FREE FLOAT** (xem trên). Vẫn giữ cả `vq` toàn bộ để so được với
   số của nơi khác.
3. **LỢI SUẤT DỒN TỪ `c/tc−1` TỪNG PHIÊN, ĐỪNG LẤY `c[i]/c[i−k]`.** `tc` là tham chiếu đã
   hạ nền của chính phiên đó nên tích các `(1+pc)` tự sạch mọi sự kiện quyền. Lấy giá
   chia giá là mỗi lần chia cổ tức đẻ ra một cú sập giả — mã trả cổ tức đều thì cú sập ấy
   lặp lại hằng năm.
4. **CỬA SỔ TRƯỢT PHẢI ĐỦ Ô MỚI TÍNH.** Trung bình 20 phiên tính trên 6 phiên vẫn ra một
   con số, và con số đó trông y hệt số thật.

> **ROOM ÂM = NGUỒN KHÔNG BIẾT TRẦN SỞ HỮU, KHÔNG PHẢI "ĐÃ VƯỢT TRẦN".** 386/1.529 mã có
> `fnRoom` âm ở phiên cuối, và room bằng ĐÚNG trừ tỉ lệ sở hữu tới từng chữ số thập phân
> (SZL −16,25 / 16,25 · PTS −7,67 / 7,67 · BTU −0,03 / 0,03) — nguồn tính `trần − sở hữu`
> với trần = 0 vì không có số. Để nguyên thì bảng "room gần cạn" toàn mã −0,03% trông như
> sắp hết room, trong khi sự thật là KHÔNG BIẾT. Chặn ở `kho_dactrung` để mọi chỗ đọc sau
> đều sạch. Cùng họ với luật `fRoom` âm của `data/eod`.

> **`lnst4` CHỈ CÓ Ở MẪU `sx`.** `data/nganh` chia năm mẫu và chỉ mẫu sản xuất (1.133 mã)
> có `lnst4`; ngân hàng 29, chứng khoán 42, bảo hiểm 13, bất động sản 114 thì không — nên
> lợi suất trên giá hụt đúng nhóm chiếm phần lớn vốn hoá. `lnst4_fin()` cộng bốn quý
> `np` LIỀN MẠCH từ `data/fin` để bù. **Phải kiểm bốn kỳ liền nhau**: nguồn có lỗ hổng
> giữa chuỗi, cộng bừa bốn nhãn có sẵn là gộp Q1/24 với Q4/22 rồi gọi đó là bốn quý gần
> nhất. Phủ 1.181 mã.

### TRANG MỘT MÃ — GHIM PHIÊN, VÀ BẢNG ĐỌC SỐ CÓ THỨ BẬC

**GHIM (22/08/2026).** `ptVe1` gọi `cfg.chon(i, true)` ở `click` và `cfg.chon(i)` ở
`mousemove`. Bản cũ khai `const chon=(i)=>{ if(i===PT.maI) return; … }` — **nhận tham số
`bam` rồi không dùng tới**, mà lượt `mousemove` đã dời mốc tới đúng cột đó trước rồi, nên
tới lúc `click` chạy thì `i===PT.maI` và hàm thoát ngay dòng đầu. Nút bấm có tồn tại
nhưng **không bao giờ làm gì**, và mốc thì luôn chạy theo chuột: nhấc tay ra là mất phiên
vừa xem. User bắt đúng chỗ này.

Nay `PT.ghim` giữ chỉ số đang ghim: bấm = ghim/bỏ ghim, đã ghim thì `mousemove` thoát
ngay. Mốc vẽ **nét đứt khi đang rê, nét liền + tam giác khi đã ghim** — không phân biệt
được hai trạng thái thì bấm xong không biết mình đã ghim hay chưa, mà đó đúng là câu hỏi
duy nhất lúc đó. Đổi mã thì `ghim=null`.

> Ghim còn giúp phần hiệu năng: mỗi lần `chon` đổi cột là `ptVeMa()` dựng lại toàn bộ
> HTML và vẽ lại 11 canvas. Chưa ghim thì việc đó chạy mỗi lần chuột qua một cột; ghim
> rồi thì thôi hẳn.

**HÀNG Ô TỔNG HỢP ĐÃ XOÁ 22/08/2026 — ĐỪNG DỰNG LẠI.** Bảy ô đầu trang mã (So 1 tháng ·
So 63 phiên · GT khớp lệnh TB · Khối ngoại ròng cả khung…) in số của **CẢ KHUNG**, trong
khi cả trang xoay quanh MỘT PHIÊN đang chọn/đang ghim. Hai loại kỳ chồng lên nhau ở đầu
trang là đọc nhầm rất dễ: thấy "−461 tỷ" tưởng của phiên đang xem. User chốt: *"xoá cái
này, tao cần giá theo phiên"*. Thứ duy nhất trong đó là số THEO PHIÊN — tỉ lệ sở hữu
nước ngoài — đã chuyển vào ô Khối ngoại của thanh đọc số. Sáu biến chỉ phục vụ mấy ô đó
(`doi` `tbGT` `tongTT` `tongKL` `fnRongTong` `tdRongTong`) và `box` xoá theo.

**BẢNG ĐỌC SỐ = SÁU KHỐI, KHÔNG PHẢI 12 MẨU NGANG VAI.** Bản cũ in 12 `<span>` cùng cỡ
cùng màu xếp một hàng dài, nên mắt phải đọc HẾT nhãn mới tìm ra thứ cần — mà nhãn lại bé
hơn số, đúng ngược. Nay mỗi khối trả lời MỘT câu (giá · tiền · khối ngoại · tự doanh ·
thoả thuận · vốn hoá), trong khối có một con số lớn là câu trả lời và một dòng chú thích
cho chính nó. Lưới 2 cột ở khổ hẹp → 3 → 6.

> **DÒNG PHỤ PHẢI LÀ SỐ CỦA CHÍNH PHIÊN ĐÓ, ĐỪNG NHÉT CÂU GIẢI THÍCH TĨNH.** Ô tự doanh
> từng in "tiền của chính công ty chứng khoán" — chữ đó không đổi theo phiên nên chiếm
> chỗ mà không nói gì. Nay in mua/bán của chính phiên, kèm **số chứng quyền đang lưu
> hành** của mã (đọc `PT.cq`): 12/12 mã đầu bảng tự doanh mua ròng đều có chứng quyền,
> tức phần lớn là phòng hộ bắt buộc — không nói ra thì con số đọc sai bản chất.
> Thoả thuận lấy **GIÁ TRỊ BẰNG TIỀN** làm số chính, không lấy khối lượng: "200.000 cp"
> không nói được gì nếu chưa nhân với giá, mà đây đúng là chỗ hay có lô sang tay lớn.

> **LƯỚI Ô ĐẦU TRANG PHẢI CHIA CỨNG, ĐỪNG `auto-fit`.** Hàng ô toàn thị trường có 6 đơn
> vị (ô chỉ số span 2), hàng ô một mã có 7. `repeat(auto-fit,minmax(180px,1fr))` ở bề
> ngang 1.364px tính ra 186px/cột nên nó chọn 6 — đơn vị thứ 7 rơi xuống hàng dưới đứng
> một mình, trông như một khối riêng chứ không phải phần đuôi của hàng. Hai lớp `.ptg7`
> và `.ptg7m` chia cứng theo ba mốc bề ngang.

### QUÉT BẤT THƯỜNG + BỘ LỌC TỰ CHỌN

`quet_la.py` ghi **thẳng vào file phiên** (`la` = kết quả quét, `dt`/`dtf` = lát cắt
ngang 22 đại lượng). Trang đã tải file phiên rồi nên đổi phiên là quét đổi theo, không
tốn lượt tải nào và không đẻ ra nguồn thứ hai lệch pha với bảng ngay bên cạnh.

Bảy phép quét, ngưỡng nào cũng kèm **cổng thanh khoản 1 tỷ** — không lọc thì đầu bảng
toàn mã đổi chủ vài lô, nhảy trần đều đặn, đẩy hết thứ đáng đọc xuống dưới.

> **`n` của khối quét là số mã CÓ KHỚP LỆNH, không phải số mã có mặt trong kho.** Phần lớn
> UPCOM không khớp lệnh nào trong một phiên bất kỳ — phiên 20/08 là **849/1.525**. Đếm cả
> mã đứng im là nói quá độ rộng thị trường lên gần gấp đôi.

> ### BỘ LỌC ĐẶC TRƯNG LÀ BỘ ĐO, KHÔNG PHẢI DANH MỤC GỢI Ý — ĐỪNG THÊM CHẤM ĐIỂM TỔNG HỢP
> Người dùng chọn lọc theo đại lượng nào, ngưỡng bao nhiêu, xếp theo cái gì. **Không có
> điểm tổng hợp, không có trọng số, không có bộ tiêu chí dựng sẵn, không có top N.**
> Đây là ràng buộc pháp lý chứ không phải sở thích thiết kế: bộ lọc Pro cũ bị gỡ hẳn
> 16/08/2026 vì nó chấm điểm bằng trọng số CỦA CHỦ TRANG rồi cắt lấy 30 mã — dù từng yếu
> tố đều đo được, thứ người dùng nhận về vẫn là *"đây là 30 mã"*, tức khuyến nghị đầu tư
> theo khoản 32 Điều 4 Luật CK 2019. Xem mục **Ranh giới pháp lý**. Khi người dùng tự đặt
> tiêu chí thì kết quả là của họ.

### DẤU LƯU CHUYỂN TIỀN TỆ — `tools/va_dau_fin.py`, CHẠY MỖI NGÀY

`data/fin` mang dấu của 24hMoney (trả một số khoản mục thành dương hết, kể cả dòng chi).
Đo bằng đẳng thức "kinh doanh + đầu tư + tài chính = lưu chuyển thuần":

```
data/finq  cfY : 97,9% đúng      (lấy số CÓ DẤU của VNDirect)
data/fin   cfY : 88,8% -> 96,7%  sau khi vá
```

Vá bằng cách **chỉ đổi DẤU, tuyệt đối không đổi độ lớn**: |fin| và |finq| bằng nhau
(sai số 0,5%) mà khác dấu thì lấy dấu của finq. Độ lớn lệch nhau là chuyện KHÁC HẲN (hai
nguồn chốt số ở hai thời điểm, hoặc doanh nghiệp đính chính) — đếm riêng, không tự sửa.

> **PHẢI CHẠY MỖI NGÀY, KHÔNG PHẢI MỘT LẦN.** Bước 5 của pipeline cào lại `data/fin` từ
> chính cái nguồn trả dấu sai, nên mã nào được cào lại hôm nay là dấu hỏng lại hôm đó.
> Vá một lần rồi quên là kho tự hỏng lại mà không có gì báo. `kho_sau.py --va-fin` làm
> cùng việc nhưng phải chạy trọn một lượt dựng `finq` (~1.525 mã sang VNDirect) — công
> thừa khi `finq` đã dựng rồi, và là một lượt cào không cần thiết.

### SỨC DỰ BÁO ĐO ĐƯỢC — để đừng ai phải đo lại

Rank IC cắt ngang từng phiên, tín hiệu ngày t → lợi suất phiên t+1, lọc mã khớp ≥1 tỷ:

| tín hiệu | rank IC | t | phiên |
|---|---|---|---|
| Biên độ ngày (H−L)/C | −0,066 | **−5,66** | 99 |
| Vòng quay trên free float | −0,043 | −3,29 | 99 |
| Vòng quay trên toàn bộ CP | −0,036 | −3,18 | 99 |
| Khối ngoại ròng CHỈ khớp lệnh / GT | +0,031 | +2,50 | 59 |
| Khối ngoại ròng (gồm thoả thuận) | +0,030 | +2,44 | 59 |
| Tỉ trọng thoả thuận | +0,018 | +2,51 | 99 |
| Tự doanh ròng / GT | −0,019 | −1,37 | 60 |
| Đóng cửa so VWAP | −0,003 | −0,24 | 99 |

Ba điều đọc ra: **biên độ ngày là tín hiệu mạnh nhất kho này có**, trùng khớp với nghiên
cứu chu kỳ 08/2026 độc lập ("biến động thấp" đứng đầu bảng chỉ báo hiệu quả); **tách
thoả thuận ra làm khối ngoại mạnh lên**, đúng lý vì thoả thuận là giao dịch dàn xếp
trước; **tự doanh ra dấu ÂM** — chưa đủ tin về thống kê nhưng có lời giải, phần lớn tự
doanh mua trụ lớn là **phòng hộ chứng quyền và chênh lệch ETF**, hành động bắt buộc chứ
không mang thông tin.

> **99 PHIÊN LÀ QUÁ NGẮN ĐỂ KẾT LUẬN.** Bảng này chứng minh bộ máy đo chạy được, chưa
> chứng minh nhân tố nào tồn tại. Đừng trích nó ra như bằng chứng về thị trường.

### TỰ DOANH PHẦN LỚN LÀ PHÒNG HỘ CHỨNG QUYỀN — ĐỪNG ĐỌC NHƯ MỘT QUYẾT ĐỊNH

"Tự doanh mua ròng HPG 66 tỷ" đọc tự nhiên ra thành *công ty chứng khoán đặt cược HPG
lên*. Phần lớn thì không phải: bán chứng quyền mua ra là buộc phải ôm cổ phiếu cơ sở để
phòng hộ — mua vì nghĩa vụ, không mang thông tin. Chênh lệch ETF cũng vậy.

Đo phiên 20/08/2026, **12/12 mã đầu bảng tự doanh mua ròng đều đang có chứng quyền lưu
hành**: HPG 33 cái · FPT 30 · STB 28 · MBB 23 · MWG 23 · VPB 22 · ACB 21 · MSN 19 · TCB
19 · VHM 15 · VNM 15 · VIC 10. Không sót mã nào. Cạnh đó VCB, CTG, SSI **không** có
chứng quyền nào và cũng không nằm trong nhóm mua ròng.

Khớp với số đo: rank IC của "tự doanh ròng ÷ giá trị khớp lệnh" với lợi suất phiên sau
là **−0,019 (t = −1,37)** — chưa đủ tin về thống kê nhưng SAI CHIỀU so với trực giác, và
đây là lời giải hợp lý nhất.

Giao diện gắn nhãn **CQ** cạnh mã có chứng quyền, CHỈ ở cột tự doanh (khối ngoại không
phát hành chứng quyền nên nhãn đó vô nghĩa ở đó). **Nguồn không công bố vị thế phòng
hộ** nên không tách được bao nhiêu phần là phòng hộ — nói được đúng một điều: mã có nhãn
CQ thì đọc dè dặt, mã không có thì gần với một quyết định thật hơn.

### GIAO DỊCH NGƯỜI NỘI BỘ — GHÉP VỚI QUÉT THOẢ THUẬN MỚI RA BỨC TRANH ĐỦ

Kho quét được *"TID sang tay ba lô ~230 tỷ trong hai tuần, đều ở −26% so giá sàn"* nhưng
không biết **ai** bán. Tiêu đề CBTT của HOSE/HNX đã nằm sẵn trong `data/news` và có dạng
rất chuẩn — mã · người · **CHỨC VỤ** · chiều · số lượng:

```
DKG: Đặng Đức Minh - Chủ tịch HĐQT - đã bán 1.375.000 CP
BHK: Vũ Văn Tiến - người có liên quan đến Phó Giám đốc; Ủy viên HĐQT - đã mua 85.105 CP
```

Ghép hai phép quét lại là ra ngay: **CLI** có hai lô thoả thuận −14,9% và −14,6% cuối
tháng 6, rồi Chủ tịch HĐQT bán 4.000.000 CP ngày 14/08. **XMC** thoả thuận −15,0% và
−22,1%, người liên quan Phó Chủ tịch bán. **TNW** một người liên quan Chủ tịch bán đúng
330.000 CP còn người khác mua đúng 330.000 CP cùng ngày.

> **VÌ SAO GIỮ ĐƯỢC TÊN Ở ĐÂY, TRONG KHI `data/profile` PHẢI LỌC CỔ ĐÔNG DƯỚI 5%.**
> Lập luận bảo vệ *"đã công khai theo nghĩa vụ pháp luật"* chỉ áp cho cổ đông lớn ≥5% —
> nên cổ đông cá nhân nhỏ bị lọc khỏi hồ sơ. Mục này KHÁC: **người nội bộ và người có
> liên quan phải công bố giao dịch BẤT KỂ TỈ LỆ** (Điều 127 Luật CK 2019, Thông tư
> 96/2020). Và **chính chức vụ trong tiêu đề là thứ chứng minh nghĩa vụ đó** — đúng cái
> mà mục *Cổ đông* ghi là "giới hạn đã biết: nguồn Simplize không trả trường chức vụ".
> **Bản ghi nào không đọc ra chức vụ thì BỎ**, đừng giữ "cho đủ": không có chức vụ thì
> không chứng minh được nghĩa vụ công bố, và đó đúng là ranh giới.

> **KHO PHẢI GOM DỒN, KHÔNG ĐƯỢC GHI ĐÈ.** `data/news` chỉ giữ tin trong 30 ngày (ba
> cổng lọc). Ghi đè là mỗi lượt xoá sạch phần cũ và kho vĩnh viễn đứng ở 30 ngày; bỏ một
> tuần không chạy là mất hẳn tuần đó, không lấy lại được. Khoá gom:
> `(mã, ngày, chiều, số lượng, tên)`.

### SỐNG SÓT SAI LỆCH — `data/rolichsu.json` mới chỉ làm nó ĐẾM ĐƯỢC

`universe.json` là rổ **HÔM NAY**, nên mọi phép đo chạy trên nó đều bỏ sót mã huỷ niêm
yết vì thua lỗ / đình chỉ / phá sản — đúng nhóm có lợi suất tệ nhất. Lệch **có hệ thống
và luôn theo hướng lạc quan**, và càng nghiêng về mã nhỏ thì càng đẹp giả nhiều.

`data/rolichsu.json` có **443 mã đã rời sàn** kèm ngày niêm yết/huỷ (2021: 62 mã · 2022:
71 · 2025: 45 · **2026: 68**), nên trả lời được *"tại phiên X thì rổ gồm những mã nào"*.

> **ĐỪNG NÓI KHO NÀY ĐÃ CHỮA XONG SỐNG SÓT SAI LỆCH.** Nó chưa có GIÁ của mã đã rời sàn,
> nên mới chỉ làm cho chỗ thiếu đếm được, chưa đo được lợi suất thật của nhóm đó. Muốn
> đo thì phải cào nến của chúng, mà **nguồn nến có giữ lại hay không thì chưa dò**.

## Quy ước toàn site

- **Đơn vị**: kho để **ĐỒNG**. VPS trả nghìn đồng (**×1000**) và lô 10 cp (**×10**).
  `universe.json` có `cash`/`np` tính bằng **tỷ** → phải `×1e9`. Hiển thị một đơn vị
  **"tỷ"** duy nhất qua `CP.fmtVnd`, viết hẳn số (`1,100 tỷ`) không đổi bậc.
- **Cache-bust**: mọi thẻ `<script src="assets/*.js">` ở cả 4 trang dùng **cùng một token
  `?v=YYYYMMDDx`**. `_headers` không có rule cho `assets/*.js` nên đổi token là cách DUY
  NHẤT ép tải bản mới. Sửa 1 file JS → đổi token ở TẤT CẢ các trang.
  > **HTML thì KHÔNG có `?v=` nào cả — nên `_headers` phải bắt nó `must-revalidate`.**
  > Gần hết mạch JS của site nằm INLINE trong bốn trang (riêng `cophieu.html` hơn 1.500
  > dòng: nến, bảng tài chính, vòng giá sống). Trình duyệt giữ bản HTML cũ là người dùng
  > chạy code cũ mà **không có cách nào biết** — vá xong, đẩy xong, mở lên vẫn thấy đúng
  > lỗi ấy, rồi mình đi tìm bug ở chỗ đã sửa rồi. Luật liệt kê đủ cả URL sạch
  > (`/radar`, `/tapdoan`, `/duongdua`, `/cophieu/*`) chứ không chỉ file `.html`.
- **`<base href="/">`** bắt buộc ở `cophieu.html` (URL 2 tầng `/cophieu/VIC`).
  `congcu.html` **không có** → chỉ an toàn với URL một đoạn.
- **`_redirects`**: `200` = rewrite giữ URL đẹp, `301` = chuyển hướng thật.
  **Đừng thêm rule cho đường dẫn đã có file .html cùng tên** → vòng lặp 307.
- **Giao diện mặc định SÁNG**, lưu `localStorage['cpvn_theme']`. Màu được nướng vào lúc vẽ
  canvas → đổi theme phải vẽ lại.
- **Gộp ngành** (`SECTOR_EXPLICIT` + ngành <4 mã dồn về "Khác") phải **y hệt** giữa
  `core.js` và `bubbles.html`, nếu không cùng tên ngành ra số mã khác nhau.
- Mọi `innerHTML` từ nguồn ngoài phải qua `CP.esc`; HTML thô của Simplize qua `sanHTML()`.
- Nội dung là **thống kê mô tả quá khứ, không khuyến nghị mua bán** — xem mục dưới.

## Ranh giới pháp lý — ĐỌC TRƯỚC KHI THÊM BẤT KỲ TÍNH NĂNG NÀO

Rà soát 16/08/2026. Luật nền: **khoản 32 Điều 4 Luật CK 2019** định nghĩa *tư vấn đầu tư
chứng khoán* = "cung cấp cho khách hàng kết quả phân tích, báo cáo phân tích **và đưa ra
khuyến nghị** liên quan đến việc mua, bán, nắm giữ chứng khoán"; **khoản 4 Điều 12** cấm làm
việc đó khi chưa được UBCKNN cấp phép. CPVN không phải công ty chứng khoán.

> **ĐIỀU LUẬT KHÔNG ĐÒI PHÂN TÍCH PHẢI DO MÌNH VIẾT RA.** Dẫn lại khuyến nghị của một đơn vị
> CÓ giấy phép vẫn là "cung cấp cho khách hàng … khuyến nghị". Ghi nguồn không miễn trách.
> Án lệ sát nhất: **CTCP Đầu tư ITP, QĐ 197/QĐ-XPHC ngày 17/4/2026** — đăng báo cáo phân tích
> và khuyến nghị mua/bán/nắm giữ lên website riêng, **phạt 225 triệu + đình chỉ 4 nhóm hoạt
> động chứng khoán trong 2 năm**. Không thu phí, không hợp đồng, chỉ đăng lên web là đủ.

**BỐN THỨ ĐÃ GỠ, ĐỪNG DỰNG LẠI DÙ CÓ VẺ "THIẾU THÔNG TIN":**

| Đã gỡ | Ở đâu | Vì sao |
|---|---|---|
| `rec` / `target` / `title` / `pdf` của báo cáo CTCK | `refresh_daily.work_news` · `core.js loadNews` · `bubbles.SRC.reports` · 282 file `data/news` (7.696 trường) | khuyến nghị + giá mục tiêu + PDF có bản quyền |
| **CẢ MỤC Chủ điểm đầu tư** (trước đó đã gỡ `kn`/`tp`/`ch`/`pdf`/`knSSI`) | `build_chudiem.py` và `data/chudiem.json` **đã xoá** · `congcu.js` · menu 4 trang · dải Radar mobile | quan điểm của SSI dẫn lại; `ch` là lời khuyên mua viết bằng % |
| `riskLevel` | `refresh_daily.work_prof` · `backfill_profiles.py` · 1.458 file `data/profile` | xếp hạng rủi ro của bên thứ ba về một mã cụ thể; chưa từng hiển thị |
| `recStyle` / `CP.recStyle` / `cdBadge` + CSS `.rec .mt .rt .dl .cdkn .cdtp .cdch` | 4 trang | hàm tô xanh chữ "MUA", đỏ chữ "BÁN" |
| **CẢ MỤC báo cáo phân tích CTCK** — `#reps`/`#repN` (cophieu), `#detReports`/`repSrc` + `renderReports` + `repCache` (bubbles), `SRC.reports`, `CP.reportRow`, `CP.CTCK_WEB`, `CP.ctckLink`, lượt gọi `analysis-report/list` trong `loadNews` | cophieu.html · bubbles.html · core.js | **không dẫn được tới bài báo cáo** — xem ngay dưới |

**VÌ SAO BỎ HẲN MỤC BÁO CÁO CTCK (16/08/2026) — ĐỪNG DỰNG LẠI DÙ CHỈ "HIỆN TÊN CHO ĐỦ":**
đi qua ba bản rồi mới bỏ, đừng lặp lại vòng đó. ① Bản đầu: badge MUA/BÁN + giá mục tiêu +
nút ⬇ Tải PDF → gỡ vì khoản 32 Điều 4 Luật CK và vì phát tán PDF của CTCK là xâm phạm quyền
tác giả. ② Bản hai: rút còn *"Báo cáo của **MAS** — **12/08/2026**"* link về **trang chủ**
hãng → user bác: *"nên dẫn nguồn đến thẳng link bài báo cáo, không phải chỉ đưa mỗi website
trang chủ của họ; nếu không làm đc thì nên bỏ luôn"*. ③ Dò đường dẫn tới bài báo cáo: API
`api2.simplize.vn/api/company/analysis-report/list` trả về **đúng một** đường dẫn —
`attachedLink` = file PDF trên `cdn.simplize.vn` — cùng một `id` nội bộ; đã thử
`simplize.vn/co-phieu/{MÃ}/bao-cao-phan-tich`, `/bao-cao-phan-tich/{id}` và biến thể:
**404 cả ba**. Không có URL nào tới bài báo cáo trên trang của chính CTCK. Thêm nữa `title`
mang sẵn khuyến nghị trong tên (*"CTCP Tập đoàn Hòa Phát (HPG/Mua/GMT:30,000)"*) nên cũng
không hiện được. Hiện tên + ngày mà không mở ra đọc được thì vô dụng → bỏ.
> **Mảng `reports` trong `data/news` cũng đã xoá hẳn** (1.527 file) và pipeline THÔI gọi
> `analysis-report/list`: hộ tiêu thụ cuối cùng là `build_chudiem.py`, mà Chủ điểm đầu tư
> nay bỏ nốt. Bớt ~1.500 lượt tới Simplize mỗi lượt `--full`.

**BỐN LUẬT KHÔNG ĐƯỢC PHÁ:**
1. **Không có chữ mua / bán / giá mục tiêu / khuyến nghị** ở bất kỳ đâu — của mình hay dẫn
   lại đều như nhau. Cũng đừng dùng "tiềm năng", "hấp dẫn", "mã tốt", "đáng mua", "hưởng lợi".
   Thay bằng: *đạt tiêu chí*, *thống kê mô tả*, *xếp theo chỉ số*.
2. **Bộ lọc là CÔNG CỤ ĐO, không phải danh mục gợi ý.** Pro hiện là danh sách 30 mã chốt sẵn
   theo tiêu chí của chủ trang — **việc còn nợ**: đưa `PRO_N`/`PRO_LIQ`/`PRO_FLAT` và bốn
   trọng số lên giao diện cho người dùng tự chỉnh, hiện điểm thành phần từng mã. Khi người
   dùng tự chọn tiêu chí thì kết quả là của họ.
3. **Không lưu văn bản hay file của người khác.** Con số là dữ kiện, không được bảo hộ quyền
   tác giả; câu chữ và tài liệu thì có. Bồi thường dân sự do toà ấn định tới **1 tỷ**
   (Điều 205 Luật SHTT sửa đổi, hiệu lực 01/04/2026) — cao hơn hẳn phạt hành chính 10–35tr.
   **Việc còn nợ**: `data/profile` còn 1.526 hồ sơ chứa văn bản biên tập của nguồn
   (`overview`/`services`/`strategy`/`risk`, markup còn nguyên `FONT-FAMILY: Arial`).
4. **Thu ít dữ liệu người dùng nhất có thể.** Hiện site **không có form, không cookie, không
   analytics, không tài nguyên ngoài** — chỉ localStorage nằm trên máy người dùng. Giữ
   nguyên trạng thái đó: Luật BVDLCN 91/2025 có trần **3 tỷ / 5% doanh thu**, cao nhất trong
   cả hồ sơ, và hiện đang bằng 0.

**MIỄN TRỪ (`.mientru`) ở chân CẢ BỐN TRANG** — ba câu, thiếu câu nào cũng mất tác dụng:
mô tả quá khứ · không phải CTCK · **người vận hành có thể nắm giữ cổ phiếu xuất hiện trên
trang**. Câu ba là **công bố vị thế**, không phải câu khách sáo: chủ trang là nhà đầu tư cá
nhân có nắm giữ thật, nên **tuyệt đối không được viết "không nắm giữ"**. Nó cũng là lá chắn
cho luật thao túng — khoản thao túng của Luật CK sửa đổi 2024 bắt vào hành vi *"đưa ra ý
kiến … sau khi đã nắm giữ vị thế"*, mà yếu tố cấu thành là **lợi thế ẩn**; công khai thì
không còn ẩn. Hệ quả trực tiếp: **đừng bao giờ thêm một danh sách mã do chủ trang chọn** —
đó là chỗ biến vi phạm hành chính thành trách nhiệm hình sự (Điều 211 BLHS).

**CÒN NỢ, chưa làm trong đợt này** (xếp theo mức rủi ro giảm dần): mở khoá bộ lọc Pro · viết
lại 1.526 hồ sơ doanh nghiệp từ nguồn gốc · lọc ~5.800 tin nguồn **báo chí** khỏi `data/news`
và nhánh live `core.js:626` (giữ 17.786 tin CBTT của HOSE/HNX — NĐ 147/2024 coi việc **đăng
đường dẫn** tới tin báo chí là dấu hiệu của trang TTĐT tổng hợp phải xin phép) · chỉ hiện cổ
đông ≥5% · User-Agent tự định danh + rate limit cho crawler · xin thoả thuận dữ liệu với
VNDirect · pháp nhân + Điều khoản + Chính sách bảo mật trước khi thu phí.

## Ghi chú từng trang

**`index.html`** — Bảng **cố định 13 cột** (`#` · ☆ · Cổ phiếu · Giá · Vốn hoá · 1D% · GTGD ·
Tiền mặt · LNST · NN mua · NN bán · P/E · EPS); thêm/bớt cột phải sửa đồng bộ 5 chỗ
(`colspan="13"`, `MCOLS/PCOLS/NCOLS`, CSS ghim cột mobile, `<th>`, hàm dựng `<td>`).
Mọi ô số **phải** bọc `<span class="n">`, ô tiền kèm `<i class="u">` — `fitNumCols()` đo
theo đúng `.n` để khoá bề rộng cột (dùng `Range.getBoundingClientRect`, **không** dùng
canvas `measureText` — nó trả sai font). Đổi bề ngang là phải gọi lại `fitNumCols`.
Mã thiếu dữ liệu luôn nằm **cuối** dù sort tăng hay giảm.

**BỘ LỌC PRO ĐÃ BỎ HẲN 16/08/2026 — ĐỪNG DỰNG LẠI.** `PRO_N`/`PRO_LIQ`/`PRO_FLAT`,
`_pro`, `proReset()`, `proBuild()`, `CPScreen.pro`, nhánh `case 'pro'`, hàng chip riêng
trong `index.html` và CSS `.chippro`/`#scrPro`/`.scrPromo` đều xoá. Panel lọc nay chỉ còn
một hàng "Lọc nhanh" với 22 chip thường.

Vì sao bỏ: nó là chip DUY NHẤT không phải một điều kiện đo được của riêng một mã (P/E<10,
RSI<30…) mà là **một danh sách 30 mã do chủ trang chọn ra** — bốn yếu tố, ba cổng loại, rồi
cắt top 30. Dù từng yếu tố đều đo được và nhãn ghi rõ "thống kê mô tả quá khứ", thứ người
dùng nhận về vẫn là *"đây là 30 mã"*, tức một danh mục gợi ý. Cộng thêm việc chủ trang **có
nắm giữ cổ phiếu Việt Nam**, đó đúng là hình dạng mà khoản 32 Điều 4 Luật CK và điều khoản
thao túng (Luật CK sửa đổi 2024 — *đưa ra ý kiến sau khi đã nắm giữ vị thế*) cùng nhắm tới.
> **`vol60` / `flat60` / `recRevL` trong `screen.json` và `fund.json` VẪN GIỮ** dù nay không
> chip nào đọc: chúng là con số ĐO ĐƯỢC từ dữ liệu công khai (độ lệch chuẩn lợi suất 60
> phiên, tỉ lệ phiên đứng giá, phải thu trên doanh thu 4 quý), không phải ý kiến — và là
> nguyên liệu sẵn nếu sau này làm chip THƯỜNG cho từng chỉ số, loại chip mà **người dùng tự
> đặt ngưỡng**. Nội dung nghiên cứu đứng sau: memory `nghien-cuu-chu-ky-2026-08`.

**`cophieu.html`** — Biểu đồ nhỏ và PTKT toàn màn hình dùng **chung** `CPChart`, chung
`dailyRows`, chung kho hình vẽ; chỉ khác palette (`'gon'` 10 nút vs `'full'` 14 nút).
Bốn bảng KQKD/CĐKT/LCTT/cổ tức dùng **chung một lưới cột** — đổi số cột là lệch cả bốn.
Kỳ mới nhất luôn bên **trái**. Chiều cao canvas không đặt cứng, do cột trái quyết định.
**BIỂU ĐỒ KQKD CHỈ ĐƯỢC VẼ LẠI BẰNG `veLaiFinChart()`, đừng tự dựng danh sách cột.**
Canvas không tự biết cột nào đang nằm dưới nó — nó ĐO `<th>` của bảng KQKD rồi vẽ theo.
Truyền danh sách khác bảng là ra một hình vô nghĩa **mà không báo lỗi**. Đã dính: `resize`
và nút đổi sáng/tối cùng gọi `drawFinChart(finData[finPeriod])` — **MẢNG THÔ đủ 70 quý,
thứ tự cũ→mới** — trong khi bảng hiện 8 quý mới→cũ. Trên VIX: 70 cột nhồi vào bề ngang
của 8 cột nên bar chồng nhau thành vệt bết ở đáy, quý 2009-2015 doanh thu bé tí nên tàng
hình, đường biên ròng chạy suốt bề ngang với một chữ V cắm xuống ở quý lỗ nặng năm xưa.
> **VÌ SAO CHỈ ĐIỆN THOẠI THẤY, LỌT LƯỚI RẤT LÂU**: Safari iOS bắn `resize` NGAY LÚC MỚI
> VÀO TRANG — thanh địa chỉ co lại theo cú cuộn đầu tiên. Người dùng chưa bấm gì đã hỏng,
> bấm "Theo quý"/"Theo năm" thì `renderFin` chạy lại và tự lành nên rất khó nghi. Máy bàn
> chỉ hỏng khi kéo đổi cỡ cửa sổ hoặc đổi giao diện. Cùng lý do phải **hoãn 60ms** cú
> `resize`: iOS bắn liên tục suốt lúc vuốt.
Cách chặn: `kqkdTable` ghi lại danh sách cột vừa vẽ vào `finColsVe`, mọi lượt vẽ lại đi
qua `veLaiFinChart()`. Bất biến nằm ở CẤU TRÚC chứ không phải ở việc nhớ truyền đúng.

**"LỢI NHUẬN ĐẾN TỪ ĐÂU" — ĐÃ BỎ HẲN 16/08/2026, ĐỪNG DỰNG LẠI.** Đi qua ba bản trong hai
ngày rồi mới bỏ, đừng lặp lại vòng đó: ① biểu đồ cột chồng riêng `#segBox`/`#segCv` đứng
trên bảng KQKD (15/08) → ② dòng cuối bảng KQKD có đánh màu `veCoCauRows` (16/08, user chốt
*"bỏ biểu đồ đi, đưa xuống dữ liệu báo cáo tài chính và đánh màu"*) → ③ **bỏ hẳn** khi hoá
ra phần lõi của nó là số Simplize tự tính chứ không phải khoản mục có in trong báo cáo
(xem mục `data/cocau` ở trên để biết phép đối chiếu). Đã xoá: `#segBox`, `#segCv`, `#segTip`,
`SEG_MAU`, `segHover`, `drawSegChart`, listener rê chuột, `veCoCauRows`, `loadCoCau`,
`segNgan`, CSS `tr.ccr`.

Bảng Cân đối kế toán kết thúc bằng nhóm dòng **Chỉ số đặc thù ngành** (`veNganhRows`,
đọc `data/nganh/{MÃ}.json`, thiếu file thì không chèn gì) — trình bày y hệt dòng bảng,
chỉ đánh màu con số theo từng cột; luật màu, ánh xạ năm→Q4 và bốn cái bẫy nguồn xem
mục CHỈ SỐ ĐẶC THÙ NGÀNH phía trên. `veNganhRows` phải chạy SAU `genericTable` trong
`renderFin` (nó chèn vào tbody của chính bảng đó) và tự vẽ lại khi đổi Theo quý/Theo năm.

> **ĐANG TẮT TỪ 19/08/2026 — cờ `HIEN_MORONG=false` trong `cophieu.html`.** Một cờ tắt cả
> `loadNganh` (chỉ số đặc thù ngành) lẫn `loadFinx` (khối "CHI TIẾT THEO MẪU BÁO CÁO" ở cuối
> ba bảng), mọi ngành. Kho `data/nganh` + `data/finx` và hai hàm vẽ giữ nguyên, chỉ hai
> `loadX()` thoát sớm.
>
> **Lý do — `data/finx` tự mâu thuẫn về DẤU trong cùng một bảng.** Đo trên NTP:
> `GROSS_PROFIT/"Giá vốn hàng bán" = −123` nhưng `OPERATING_EXPENSES/"Chi phí giá vốn" = +123`
> — cùng một con số, ngược dấu. Cạnh đó "Chi phí bán hàng +8", "Chi phí lãi vay +1" cũng
> dương: cùng là khoản chi mà chỗ trừ chỗ cộng, người đọc không biết dòng nào đã trừ vào
> lợi nhuận. Và luật bỏ dòng trùng (so theo DÃY SỐ) **giữ nhầm bản sai** — bảng gốc có "Giá
> vốn hàng bán +1.349" nên bản dương của finx bị coi là trùng và bỏ, bản ÂM lọt lên màn hình.
>
> **Vì sao `doi_chieu_finx.py` 99,13% không bắt được:** nó so từng ô với DNSE, mà DNSE chính
> là nơi quy ước dấu này đến — hai bên sai giống nhau thì vẫn "khớp". Phép còn thiếu là **so
> chéo NỘI BỘ**: cùng một khoản mục xuất hiện ở hai nhóm thì dấu phải nhất quán.
>
> **Bật lại thế nào:** thống nhất dấu ở khâu DỰNG KHO (`tools/kho_dong.py`) rồi mới đổi cờ
> thành `true`. Đừng chữa bằng cách đảo dấu lúc vẽ — lúc đó không còn phân biệt được dòng
> nào nguồn đã âm sẵn. **Cái giá của việc tắt** (biết trước, user chấp nhận): ngân hàng mất
> Thu nhập lãi thuần / Chi phí dự phòng, và VCB lại hiện "Lợi nhuận gộp — — —" như cũ.

**KHỐI NGOẠI `fb`/`fs` TRONG `data/hist` — CÓ LƯU HẰNG NGÀY, VÀ ĐÃ TỪNG BỊ NHIỄM ×10.**
User hỏi xác nhận có chắc đang lưu hằng ngày không (để làm nền cho cộng dồn 45/60/90/120
phiên). Câu trả lời: **có**, và cơ chế giữ được cả qua lượt hạ nền — `fbfs` dựng từ FILE CŨ
trước, khoá theo ngày, nên tải lại cả chuỗi vẫn không mất. Đo bằng nguồn độc lập
(`api-finfo.vndirect.com.vn/v4/foreigns`) trên VCB/HPG/SSI: **2020 khớp 249/249 phiên, 2022
249/249, 2024 247/247**.

> **NHƯNG 20 PHIÊN 17/07–13/08/2026 ĐÃ BỊ NHỎ ĐI ĐÚNG 10 LẦN.** Truy bằng ba nguồn: VNDirect
> và bảng giá VPS (`data/eod`) khớp nhau TỪNG SỐ ở mọi phiên; **24hMoney**
> (`foreign-trading-history`, thứ `fetch_foreign30` đang gọi) trả nhỏ hơn 10 lần cho MỌI phiên
> tới 13/08 rồi tự đúng lại từ 14/08 — đổi đơn vị giữa chừng bên nguồn.
> **Vì sao lọt vào kho:** `fbfs.update(f6)` ĐÈ luôn cả những phiên đang đúng lấy từ bảng giá;
> chỉ cần MỘT phiên hụt là kích lượt bù và ghi đè ~30 phiên.
> **Đã vá hai lớp:** (a) `hop_nhat_nn()` trong `refresh_daily.py` — chỉ ĐIỀN CHỖ TRỐNG, và
> đối chiếu trung vị tỷ lệ trên phần chồng nhau, lệch quá 20% thì **bỏ cả lượt trả về**;
> (b) `tools/va_ngoai.py --sua TU DEN` — chế độ ghi đè CÓ GIỚI HẠN NGÀY, dùng VNDirect làm
> chuẩn. Chạy 19/08: 1.086 mã được vá (+93.421 phiên có số), sau đó đối chiếu lại với
> `data/eod`: **5.295 ô khớp tuyệt đối, còn đúng 1 ô lệch**.
> **Bẫy khi vá:** cổng "lệch quá 5% thì bỏ mã" của `va_ngoai` chặn đúng những mã cần vá nhất
> (20 phiên lệch trên ~311 = 6,4%). Chế độ `--sua` phải **loại khoảng đang vá ra khỏi cổng**.
> Cũng sửa `--ma HPG,VIC` (dạng cách trắng) — bản cũ chỉ đọc `--ma=...` trong khi chính dòng
> hướng dẫn viết dạng cách trắng, gõ theo hướng dẫn là lặng lẽ chạy toàn bộ 1.529 mã.
> **Bài học chung:** một nguồn phụ có thể đổi đơn vị bất cứ lúc nào mà không báo. Mọi chỗ
> trộn hai nguồn cho CÙNG một đại lượng đều phải đối chiếu tỷ lệ ở phần chồng nhau trước khi
> tin, và không bao giờ để nguồn phụ đè lên nguồn chính.

**`fRoom` ÂM = KHÔNG CÓ SỐ, ĐỪNG HIỆN (19/08/2026).** `data/eod/latest.json` trả `fRoom` âm
cho **402/1.529 mã**; VNDirect không có `currentRoom` cho một mã nào trong số đó → giá trị rác,
không phải "room đã vượt trần". Đường nạp giá SỐNG (`applyLive`) đã chặn `fr>=0` từ lâu, đường
nạp KHO (`loadBase`, đọc `latest.json`) thì quên — nên trang hiện **"Room còn −13,9%"** (HCC,
đúng mã user chụp), tệ nhất −30,0% (DAD); **130 mã âm rõ rệt**. Hai đường cùng đọc một đại
lượng thì phải cùng một luật.
> Đơn vị thì latest.json đã chuẩn: đo 100 mã, `fRoom` khớp `currentRoom` của VNDirect **×1,00**.
> Nhưng `data/board.json` (bảng giá THÔ của VPS) thì `fRoom` nhỏ hơn **đúng 10 lần** — 120/120
> mã — nên chỗ nào đọc thẳng board thô vẫn phải nhân 10 (`applyLive` đang làm đúng).

**Ô CHỌN SỐ PHIÊN TUỲ Ý cho "NN mua – bán ròng"** (`#nnTuy`, 19/08/2026): ô nhập số nằm sau
1D/7D/30D, đơn vị là **PHIÊN** giống hệt 7D/30D. Cửa sổ đọc kho nới 45 → `NN_MAX`=365 phiên —
để 45 thì mọi mốc dài hơn lặng lẽ trả về đúng 45 phiên mà không có gì báo. Chú giải nói thêm
**khối lượng ròng chính xác** (kho lưu số cổ phiếu, không qua giá) vì con số hiện ra chỉ là
xấp xỉ: khối lượng ròng × giá đóng cửa từng phiên, đo trên HPG lệch **7–18%** so với giá trị
khớp thật của VNDirect (họ cộng giá khớp từng lệnh, kể cả thoả thuận ở giá thương lượng).

**THÔNG TIN NIÊM YẾT `data/niemyet.json` (20/08/2026) — `tools/kho_niemyet.py`, mục
`/niemyet` trong nhóm Bảng giá.** MỘT file chung chứ không mỗi mã một file: đây là bảng liệt
kê TOÀN SÀN nên lần nào mở cũng cần cả 1.529 mã (169 KB, gzip ~45 KB).

| thứ | nguồn | phủ |
|---|---|---|
| ngày lên sàn | `finfo/v4/stocks` trường `listedDate` (hỏi gộp 150 mã/lượt) | **1.529/1.529** |
| giá phiên đầu | `data/hist`, thiếu thì bù `api.vietstock.vn/tvnew/history` | **1.488** |
| vốn hoá lên sàn | giá thô × vốn góp/10.000 lúc đó (`data/finx`) | 859 |
| hồ sơ chờ lên sàn | `api.hsx.vn/l/api/v1/1/securities?newListingStatusId=N` | chỉ HOSE |
| GD bổ sung sắp tới | `finfo/v4/events` type `LISTED` ngày tương lai | 100 đợt |

> **GIÁ CHÀO SÀN — CÓ THẬT, LẤY ĐƯỢC, PHỦ 100% (`tools/kho_chaosan.py`).** Hai lượt trước
> tao kết luận "không lấy được giá thị trường ngày lên sàn" — **SAI**, và user chỉ ra chỗ đúng:
> trang hồ sơ doanh nghiệp Vietstock `finance.vietstock.vn/{MÃ}/ho-so-doanh-nghiep.htm` có sẵn
> **Ngày giao dịch đầu tiên · Giá chào sàn · Khối lượng niêm yết lần đầu · Khối lượng niêm yết**,
> **server-rendered thẳng trong HTML**, không cần API cũng không cần khoá phiên.
> Cào 1.529 mã hết 484 giây, **phủ 1.529/1.529**. Đo: VCB 60.000đ · HPG 127.000đ · FPT
> 400.000đ · VIC 125.000đ · REE 16.300đ · BID 18.800đ — giá THẬT của phiên chào sàn.
> Bài học: trước khi tuyên bố "không nguồn nào có", phải dò cả trang HTML thường chứ không
> chỉ endpoint JSON.

> **HAI NGUỒN HIỂU "NGÀY LÊN SÀN" KHÁC NHAU — 52 mã.** VNDirect `listedDate` = ngày niêm yết
> trên **sàn hiện tại**; Vietstock = **ngày giao dịch đầu tiên**. Mã chuyển sàn lệch hẳn (MHL
> 2024-09-20 vs 2009-11-26 · CVN 2025-06-11 vs 2010-08-06).
> **Phát hiện bằng BẤT BIẾN, không phải bằng mắt:** giá chào sàn phải **≥** giá đã hạ nền (hạ
> nền chỉ kéo giá quá khứ XUỐNG). 53 mã vi phạm, và đúng là nhóm chuyển sàn — vì hai con số đo
> ở hai thời điểm khác nhau. Kho nay giữ `d` = ngày giao dịch đầu tiên (khớp cặp với `gc`) và
> `dS` = ngày lên sàn hiện tại; giao diện đánh dấu ↷.

**MÃ CHƯA KHỚP LỆNH PHẢI HIỆN THAM CHIẾU, KHÔNG PHẢI GIÁ PHIÊN TRƯỚC (20/08/2026).**
`core.js` dòng 391, bản cũ `if(last>0) c.price=last; else if(!c.price) c.price=c.ref;` —
`else if(!c.price)` chỉ điền khi đang TRỐNG, nên mã chưa khớp lệnh vẫn giữ giá khớp cuối của
phiên trước. Ngày thường vô hại (tham chiếu = giá đóng cửa phiên trước), nhưng **đúng ngày
chốt quyền thì hai số đó khác hẳn nhau**. User báo: THN hiện **5.300đ** trong khi sàn đang
**4.000đ**.
> Đo lúc 11:50 ngày 20/08: **11 mã** chưa khớp lệnh mà giá đang giữ lệch quá 2% so với tham
> chiếu — THN **+32,5%** · UDL +22,1% · TID +9,7% · VUA −5,3% · HBH +5,1%.
> Cờ `nt` ngay dưới đã chặn được **phần trăm** bịa (bài học 12/08), nhưng KHÔNG sửa **giá** —
> mà giá sai còn kéo theo vốn hoá sống (`mcapLive = shares × price`). Hai lớp khác nhau,
> đừng tưởng có `nt` là xong.
> Ba đường ghi `c.price`, chỉ đường này hổng: dòng 150 là ảnh chụp kho EOD (nhất quán trong
> chính nó), dòng 515 `applyLive` đã có `if(!(last>0)) continue`. Nhánh `boardEmpty` đã
> `continue` phía trên nên ca ban đêm (bảng đã nhảy sang biên độ phiên sau) không đi qua đây.

**HỆ SỐ HẠ NỀN CỔ TỨC TIỀN PHẢI LÀM TRÒN THEO BƯỚC GIÁ (20/08/2026).** Công thức `P/(P−d)`
THIẾU một bước: sở lấy giá tham chiếu mới = `P−d` rồi **làm tròn về bước giá** trước khi dùng
làm nền. Đo trên đúng 4 mã chốt quyền ngày 20/08, so nguồn sống với `data/eod`:

| mã | sàn | P (19/08) | sự kiện | P−d | tròn | hệ số tính | hệ số ĐO |
|---|---|---|---|---|---|---|---|
| BTW | HNX | 85.000 | tiền 900 | 84.100 | 84.100 | 1,0107 | **1,0107** |
| HBH | UPCOM | 6.200 | tiền 260 | 5.940 | **5.900** | 1,0508 | **1,0508** |
| THN | UPCOM | 5.300 | tiền 1.335 | 3.965 | **4.000** | 1,3250 | **1,3250** |
| VIX | HOSE | 13.100 | cp 5% | — | — | 1,0500 | **1,0500** |

Cả bốn về **0,00%**. Không làm tròn thì THN lệch **0,88% chỉ trong MỘT sự kiện**, sai số dồn
qua từng lần chia — mã giá thấp chia nhiều lần là lệch hẳn. Mã giá cao gần như không ảnh hưởng.
> **CỔ TỨC CỔ PHIẾU thì KHÔNG làm tròn** — nguồn dùng thẳng tỉ lệ (VIX 5% → đúng 1,0500 chứ
> không phải 13.100/12.500). Đừng "sửa" cho hai loại giống nhau.
> Bước giá: HOSE <10k = 10đ · 10–50k = 50đ · ≥50k = 100đ; HNX và UPCOM luôn 100đ.
> Hàm `lamTron` trong `bangSLCP` (`cophieu.html`).

**KIỂM CƠ CHẾ HẠ NỀN — HCC/TVS ngày 19/08/2026, ĐÃ XONG.** Dự đoán trước: HCC → 22.599,
TVS → 13.505. Kho ghi đúng cả hai ở **phiên 18/08** (phiên cuối trước ngày chốt quyền — tao
từng nói nhầm là phiên 19/08). Hệ số đo được **giữ nguyên suốt 13 phiên**: HCC 1,2346 (lý
thuyết 1,10 × 27.900/24.900 = 1,2325, lệch 0,17%), TVS 1,0700 (lý thuyết 1,07, khớp tuyệt
đối). Phiên 19/08 tỷ lệ thô/kho = **1,0000** ở cả hai → không bị trừ hai lần.
Ghi chú cũ *"HCC thiếu một sự kiện quyền trong cotuc.json"* nay đã bịt: `data/sukien` có đủ
cả `tiền 3.000đ` lẫn `cp 10%` cùng ngày 19/08, và hai cái đó giải thích đúng hệ số đo được.

**TỔNG LỢI SUẤT = GIÁ NAY ÷ GIÁ NỀN QUY ĐỔI (user chốt 20/08/2026).**
```
x = giá hôm nay / g          g = giá phiên đầu tiên trên NỀN HÔM NAY
```
Giá nền đã trừ hết chia tách · cổ tức tiền · cổ tức cổ phiếu · **quyền mua**, nên tỉ lệ này
bao gồm tất cả: cổ tức tái đầu tư VÀ có tham gia đủ mọi đợt chào bán thêm. Đây là quy ước
của các chỉ số tổng lợi suất, và user chốt đúng nó: *"vẫn phải tính là tao có tham gia ở tất
cả những lần chào bán thêm chứ"*.
> **Đã thử cách kia rồi bỏ:** tính trên một cổ phiếu từ giá chào sàn thật —
> `(giá nay × số cp nhân lên + cổ tức đã nhận) / giá chào sàn`, KHÔNG tính quyền mua. Ra thấp
> hơn hẳn vì bỏ mất giá trị quyền mua: VIC 30,46 vs 78,66 · REE 17,05 vs 65,48 · VCB 4,06 vs
> 6,32. Hai cách đều đúng theo quy ước riêng; user chọn cách gồm quyền mua.

**BA PHÉP LỌC DỮ LIỆU, mỗi phép bắt một loại lỗi khác nhau — đừng gỡ phép nào:**
1. **`gc` phải khớp BIÊN ĐỘ PHIÊN ĐẦU** so với giá đóng cửa hôm đó (HOSE ±20% · HNX ±30% ·
   UPCOM ±40%, nới thêm 5đv). Bắt được **30 mã**.
2. **`gc` không được vượt xa mức chia tách giải thích được** (`gc/g > max(3, tích(1+tỷ lệ)×3)`).
   Bắt thêm **313 mã**.
   > Cả hai đều cùng một gốc: **Vietstock ghép NGÀY của lần niêm yết mới với GIÁ của lần niêm
   > yết gốc** ở mã chuyển sàn. ITA hiện "13/02/2025 · 54.000đ" trong khi giá thật hôm đó là
   > 2.300đ; NTC "28/10/2025 · 20.000đ" trong khi thật là 164.500đ. Lỗi hệ thống bên nguồn.
3. **`g` lấy từ chuỗi sâu của Vietstock phải NỐI LIỀN được với kho nến CPVN** tại phiên giao
   nhau (lệch ≤3%). 466 mã cần kiểm → **344 khớp, 122 lệch nền bị loại**. Không có phép này
   thì VTA ra giá nền 38đ trong khi kho ghi 1.500đ ở phiên kế tiếp mà không sự kiện nào giải
   thích được.

Kết quả: ngày lên sàn **1.529** · giá tham chiếu phiên đầu **1.186** · giá nền + tổng lợi suất
**1.361**. Ô trống là CỐ Ý — thà để trống còn hơn hiện số không kiểm được.

**HAI CỘT GIÁ, ĐỪNG TRỘN.** `g` = giá phiên đầu **quy về nền hôm nay** — chính xác tuyệt
đối, và là số đúng để so ra `x` = "×N lần kể từ ngày lên sàn" (hai đầu cùng một nền).
`gt` = giá thị trường thật ngày đó, **ƯỚC TÍNH** bằng cách gỡ ngược chuỗi hạ nền của
`data/sukien`. Vốn hoá lên sàn phải dùng `gt`, không dùng `g` — `g` nằm trên nền hôm nay,
nhân với số cổ phiếu lúc đó là trộn hai thời điểm.

> **`gt` KHÔNG ĐÁNG TIN BẰNG `g` — đã đo.** Phép tự kiểm: giá thô phải rơi đúng BƯỚC GIÁ của
> sàn (HOSE 10/50/100đ theo dải, HNX/UPCOM 100đ). Trên 1.051 mã: giá kho đúng bước **29,2%**,
> giá đã gỡ nền **28,5%** — gỡ nền KHÔNG cải thiện, vì mã pha loãng nhiều thì sai số dồn
> (VPB tích chia cổ phiếu ×4,91 · HDB ×4,74 · VHM ×3,25) và không nguồn nào công bố giá niêm
> yết gốc để đối chiếu. Cơ chế thì đúng — DMX (mới lên sàn, đúng một sự kiện) gỡ ra 82.184đ
> so với 78.294đ của kho, sát bước giá 82.200đ. Nên chỉ `q=1` (rơi trong 1% của một bước giá)
> mới coi là chắc; giao diện đánh dấu `~` cho phần còn lại. **Đừng bỏ `g` mà chỉ giữ `gt`.**
> 478 mã lên sàn trước **02/01/2013** vượt mốc nguồn nến VNDirect, nay **bù bằng Vietstock**
> (`api.vietstock.vn/tvnew/history` — cùng datafeed UDF đã dùng cho `data/sukien`): nguồn này
> lùi tới ĐÚNG ngày lên sàn (VCB 30/06/2009 · FPT 13/12/2006 · REE 31/07/2000). Lấp được 438,
> phủ lên **1.488/1.529 = 97,3%**.
> **Hỏi bằng CỬA SỔ HẸP** quanh ngày lên sàn (−7 → +53 ngày), đừng xin cả chuỗi: nguồn cắt ở
> 5.000 nến và cắt ở ĐẦU MỚI (REE xin cả chuỗi trả 2000→2021, mất hẳn 5 năm gần đây).
> **Hai nguồn CÙNG MỘT NỀN — đã đo trước khi ghép**: 8 mã lớn, phần chồng nhau 1.651–3.400
> phiên, trung vị tỷ lệ Vietstock/kho 0,9998–1,0049. Nên lấy giá phiên đầu của Vietstock chia
> giá hôm nay của kho ra "×N lần" là hợp lệ, sai số ~0,5%.
> **CHẶN GIÁ < 10đ**: nguồn trả 0 cho VNX, mà `x` chia cho nó ra **×1818** đứng đầu bảng "tăng
> mạnh nhất" — sai mà lại ở chỗ dễ thấy nhất. Dưới bước giá nhỏ nhất của mọi sàn thì chắc chắn
> không phải giá thật, bỏ cả cụm.

> **KHÔNG DÙNG ĐƯỢC GIÁ IPO — đã dò.** `api.hsx.vn/a/api/v1/1/auctions` có thật (821 bản ghi)
> nhưng **không kèm mã chứng khoán** (`symbolId`/`stockCode` đều null, chỉ có tên công ty),
> `startingPrice` lẫn lộn giữa giá/cổ phiếu (28.000) với TỔNG giá trị (287 tỷ), chỉ có HOSE,
> và phần lớn là đấu giá **thoái vốn nhà nước** chứ không phải IPO gốc. Ghép theo tên công ty
> là đoán. `finfo/v4/ipos` và `/v4/auctions` 404, `hnx.vn/api/auction/list` 404.

> **KHÔNG CÓ NGUỒN NÀO CHO "MÃ MỚI + NGÀY GIAO DỊCH ĐẦU TIÊN" — đã dò, đừng dò lại.**
> `/v4/stocks?status:pending` rỗng · `/v4/events?group:listing` rỗng · `api.hsx.vn/.../news`
> 404 · `api.hnx.vn` không phân giải · `finance.vietstock.vn/data/newlisting` 404 · 24hMoney
> `upcoming-listing` 404 · Simplize `new-listing` 404. HOSE **có** đường ống hồ sơ (tìm ra
> bằng cách tải bundle `www.hsx.vn/static/js/main.*.js` rồi lần theo `/securities/new-listing-status`)
> nhưng `ftdate` luôn rỗng và chỉ có HOSE. Vì thế mục "sắp lên sàn" trả lời được "sắp có ai
> lên sàn", chưa trả lời được "ngày nào".
> **API của HOSE chập chờn thật** (đo 20/08: đầu phiên lấy được 9 hồ sơ, cuối phiên nghẽn
> liên tục 5 phút). Nên builder thử lại 3 lần, và khi vẫn hỏng thì **giữ danh sách của lượt
> trước** + bật cờ `sapLoi` để giao diện nói "chưa lấy được" chứ không nói "không có hồ sơ
> nào" — hai câu đó khác hẳn nhau với người đang tìm mã sắp lên sàn.

**KHO SỰ KIỆN DOANH NGHIỆP `data/sukien/{MÃ}.json` (19/08/2026) — `tools/kho_sukien.py`.**
1.482 mã · 47.510 mốc · lùi tới **2005** · 7 MB. Dựng từ HAI nguồn, cả hai đều tự dò ra:

| loại | nguồn | độ sâu |
|---|---|---|
| cổ tức tiền · cổ phiếu · thưởng · **quyền mua** · phát hành riêng lẻ/ESOP | `api.vietstock.vn/tvnew/marks` | 2005–2007 |
| ngày công bố **BCTC** | `api-finfo.vndirect.com.vn/v4/financial_statements`, trường `createdDate` | chỉ tin **từ 2020** |

**Tìm ra nguồn Vietstock bằng cách nào:** tải mã nguồn `stockchart.vietstock.vn` rồi lần theo
`new Datafeeds.UDFCompatibleDatafeed('https://api.vietstock.vn/tvnew')` — datafeed UDF chuẩn
TradingView, không cần khoá, chỉ cần `Referer`. Các cửa khác **đã dò và đóng**, đừng dò lại:
TCBS `apipubaws` 404 · CafeF `Events_RelatedStock` 404 · Fireant 401 · 24hMoney events 404 ·
Simplize `document/list` và `filing/list` 404 · `finance.vietstock.vn/data/getdocument` trả về
nguyên trang HTML. Simplize `events/list` và VNDirect `/v4/events` **đều chỉ sâu ~5 năm**.

**BỐN CHỖ PHẢI CẨN THẬN, đều đo được:**
1. **MÚI GIỜ.** `time` của Vietstock phải đọc ở **UTC+7** mới ra đúng ngày GDKHQ. Đối chiếu
   với `effectiveDate` của VNDirect trên 8 mã: **khớp 72/72 khi đọc UTC+7, 0/72 khi đọc UTC**.
2. **THỨ TỰ ĐỌC MÔ TẢ.** "Thực hiện quyền mua cổ phiếu phát hành thêm, tỷ lệ 50%, giá 10,000
   đồng/CP" chứa CẢ "cổ phiếu" LẪN "đồng/CP" — bắt "cổ phiếu" trước thì một đợt **chào bán lấy
   tiền** bị đọc thành cổ tức cổ phiếu 50%; bắt "tiền" trước thì giá phát hành 10.000đ thành
   cổ tức tiền mặt. Phải xét `quyền mua` → `phát hành thêm cho` → `thưởng` → `cổ tức cổ phiếu`
   → `tiền`. Sai kiểu này không lộ ra ở đâu, chỉ âm thầm làm lệch mọi phép tính dựa trên kho.
3. **HAI QUY ƯỚC DẤU PHẨY TRONG CÙNG MỘT NGUỒN.** `tỷ lệ 62,162%` → phẩy là **thập phân**
   (62,162%); `1,200 đồng/CP` → phẩy là **hàng nghìn** (1200đ). Đọc chung một hàm là sai một
   loại. Đo trên 120 mã: 1.266 mốc, **100% đọc được**, không mốc nào rơi vào `khac`.
4. **`createdDate` CHỈ ĐÚNG TỪ 2020.** Đo khoảng cách từ ngày chốt kỳ tới ngày nạp: 2020-2026
   là 24-30 ngày và **khác nhau theo từng công ty** (NTP đều 22, HPG 18-34, VCB 24-31) = ngày
   công bố thật; 2019 nhảy lên 108 ngày, 2018 là 473, 2016 là 1.203 = **dấu vết nạp hàng loạt**.
   Lọc cứng `0 < cách kỳ <= 60`; kỳ nào không đạt thì BỎ, đừng vẽ mốc sai lên chart.

**KHO RIÊNG, KHÔNG NHÉT VÀO `data/hist`:** file hist bị ghi đè TOÀN BỘ mỗi lần nguồn hạ nền
(`refresh_daily.work_hist`), nhét vào đó là mất sạch vào một phiên GDKHQ nào đó mà không ai biết.
**Chỉ ghi file khi danh sách sự kiện thực sự đổi** — ghi vô điều kiện thì trường `updated` đổi
mỗi ngày và mỗi lượt chạy sinh 1.482 file "thay đổi" nội dung y hệt. Chạy trong lượt **7:30
trước phiên** (`run_sang_som.ps1`), ~3,5 phút, hỏng thì bỏ qua chứ không chặn lượt chạy.

**MỐC TRÊN CHART GIÁ.** `chart.setSuKien()` trong `assets/chart.js`; chấm tròn **neo NGAY TRÊN
ĐỈNH NẾN**, cách 14px. Bản đầu đặt tất cả ở một hàng cố định sát đáy vùng giá; user báo *"nó
đang ở dưới chart nên hơi không quen"* — đúng, mốc rời khỏi cây nến thì mắt phải tự dóng xuống
mới biết ngày nào, còn các trang PTKT đều neo vào chính cây nến.

> **BA CHẶN CỦA VIỆC NEO THEO GIÁ — đừng gỡ.** Trục giá kéo/phóng được (`yPan`/`yZoom`) nên
> đỉnh nến chạy ra ngoài khung được: ① **ghì** mốc vào trong vùng giá `[padT+9, padT+plotH-9]`
> — không ghì thì mốc biến mất hoặc vẽ đè lên dải khối lượng; ② nến sát đỉnh khung thì trên
> hết chỗ → **lật xuống dưới đáy nến**, chỉ ghì mà không lật là mốc dán đè lên chính cây nến
> đang muốn xem; ③ sự kiện ở **vùng trống tương lai** (đã công bố ngày chốt quyền nhưng chưa
> tới phiên) không có nến để neo → rơi về hàng đáy như cũ.
> Đo sau khi vá, VCB khung Tháng: bình thường mốc nằm y 38..182 (6 độ cao khác nhau = đã bám
> nến); kéo giá lên 260px → y 23..38, kéo xuống 520px → y 38..332, **không mốc nào lọt ra
> ngoài vùng giá và không mốc nào mất**. Bơm thử một sự kiện 45 ngày tới: không lỗi JS, mốc
> rơi đúng hàng đáy. Rê chuột vẫn ra hộp chú giải (`skHit` dựng lại trong mỗi lượt vẽ).

Gom theo NẾN chứ không vẽ rời: cùng ngày có thể có hai sự kiện, và ở khung Tháng cả chục sự
kiện rơi vào một nến. Màu: vàng `C` = cổ phiếu/thưởng · tím `P` = quyền mua/phát hành · xanh
`D` = tiền · xám `B` = BCTC. **Hai cờ riêng `ind.sk` và `ind.bctc`, BCTC mặc định TẮT** — đo
trên VCB: 27 mốc BCTC chen với 19 mốc cổ tức ở khung Tháng thành một dải chấm liền không đọc
được gì. Hộp chú giải vẽ THẲNG LÊN CANVAS (khác bảng KQKD dùng thẻ `data-tip`) vì chart này
kéo/phóng được nên toạ độ đổi liên tục, mà nó đã tự bắt chuột sẵn cho thanh ngắm.

**VỐN HOÁ TỪNG KỲ = GIÁ THÔ × SỐ CỔ PHIẾU CỦA CHÍNH KỲ ĐÓ (19/08/2026).** Bản cũ nhân mọi
kỳ với SLCP hôm nay. User báo sai — đúng là sai, nhưng **không phải vì lý do dễ nghĩ nhất**,
nên chép lại phép đo ở đây để đừng ai "sửa" ngược.

| đo | kết quả |
|---|---|
| ① chuỗi giá kho đã hạ nền chưa? | **Rồi.** 557 sự kiện chia ≥15%: cú rơi một phiên sâu nhất trong quý có trung vị **6,84%**, trong khi chưa hạ nền thì phải **20%** |
| ② hạ nền cả theo cổ tức TIỀN? | **Có.** `data/eod` (giá thô) vs `data/hist` (đã hạ nền), 13 phiên: HRB chia 3.000đ → thô/kho **1,0925** = đúng 35.400/32.400 |
| ③ nguồn sai lớn nhất? | **Phát hành thêm vốn**, không phải cổ tức. VPX 5,6 triệu cp (2016) → 1,875 tỷ cp hôm nay |

Hệ quả ①: với cổ tức **cổ phiếu**, phần hạ nền giá và phần tăng SLCP **triệt tiêu nhau** —
`giá đã hạ nền × SLCP hôm nay` vốn đã đúng. Chia SLCP ra theo tỷ lệ chia là **trừ hai lần**.
Hệ quả ②: cổ tức tiền hạ nền giá mà không đụng SLCP → kỳ càng xa càng bị kéo thấp.

```
vốn hoá(t) = giá_kho(t) × G(t) × U(t) × SLCP(t)
   G(t) = tích (1+tỷ lệ) sự kiện CỔ PHIẾU sau t     U(t) = tích P/(P−d) sự kiện TIỀN sau t
   SLCP(t) = vốn góp(t)/10.000đ  (data/finx OWNERS_EQUITY, KHÔNG suy từ tỷ lệ chia:
             suy kiểu đó chỉ khớp 51,5% số ô khi soi lại bằng vốn góp)
```
`giá_kho × G × U` chính là **giá thô**, nên câu trên đọc là "giá thô × số cổ phiếu thật".
Đối chiếu giá thô suy ra với giá đóng cửa THẬT của HPG: 2022 → 18.015đ (thật 18.000),
2023 → 27.973đ (27.950), 2024 → 26.773đ (26.750), 2021 → 45.760đ (46.400).

**BỐN CÁI BẪY ĐÃ VÁ** — đều tìm ra bằng phép đo, không phải đoán:

1. **Vốn góp đăng ký TRỄ hơn ngày chốt quyền.** HPG chia 20% chốt quyền Q2/25 nhưng vốn góp
   mãi Q3/25 mới nhảy 63.962 → 76.755 tỷ. Để nguyên thì đúng quý chia lại hiện vốn hoá
   **tụt 15%** (×0,85) trong khi thực tế không tụt. Vá xong về ×1,02.
2. **Hệ số tiền nổ khi d/P lớn.** `1/(1−d/P)` → vô cực nếu tiền xấp xỉ giá (MLC ra ×389).
   Chặn ở **d/P > 30%** — đó là dấu hiệu dữ liệu hỏng, không phải sự kiện thật.
3. **Vốn góp không phải lúc nào cũng dùng được.** 206/1.502 mã có vốn góp kỳ mới nhất lệch
   quá 20% so với SLCP hôm nay (kho BCTC cũ hơn đợt phát hành gần nhất) → **cả mã đó quay về
   đường cũ**. Sau cổng này kỳ mới nhất khớp ±3% ở 1.443/1.489 mã, chỉ 1 mã lệch quá 20%.
4. **~~`divQ` TRỘN HAI NGUỒN CÓ ĐỘ SÂU KHÁC NHAU~~ — ĐÃ GIẢI QUYẾT 19/08/2026 bằng
   `data/sukien`.** Chuỗi sự kiện nay lấy từ kho mới (đủ tới 2007) chứ không từ `divQ`, nên
   **ranh giới 5 năm đã gỡ hẳn** và có thêm hệ số riêng cho **quyền mua**:
   `nghịch đảo = (1+r)·P/(P+r·X)` — chào bán dưới giá thị trường nên nguồn CÓ hạ nền nhưng hạ
   ÍT HƠN chia tách; gán nhầm nó thành cổ tức cổ phiếu là gỡ quá tay. Phát hành riêng lẻ/ESOP
   thì nghịch đảo = 1 (bán quanh giá thị trường, không hạ nền) và phần tăng cổ phiếu lấy từ
   vốn góp. Đo lại trên HPG, giá thô suy ra vs giá đóng cửa THẬT: 2018 30.977đ (thật ~31.000,
   **trước khi vá là 19.864đ**) · 2022 18.004 (18.000) · 2023 27.957 (27.950) · 2024 26.757
   (26.750) · 2021 45.723 (46.400). Số cổ phiếu từng năm 2,124 → 2,761 → 3,313 → 4,473 → 5,815
   → 6,396 → 7,675 tỷ, khớp đúng lịch sử tăng vốn thật.
   > **BẤT BIẾN ĐỂ BẮT LỖI VỀ SAU: vốn hoá HÔM NAY phải bằng giá × SLCP hôm nay.** Chính nó
   > bắt được hai lỗi mà mắt không thấy: ① cổng chất lượng so thẳng `vốn góp` với SLCP hôm nay
   > mà quên nhân G — VHM chia 1:1 ngày 06/08/2026 rơi vào Q3/26 trong khi vốn góp mới tới
   > Q2/26, lệch đúng 100% và mã bị loại oan; ② mốc SAU quý vốn góp cuối không được nhân tiếp
   > sự kiện đã xảy ra từ đó tới nay, vốn hoá hôm nay của VHM ra đúng một nửa. Sau khi vá:
   > 1.430/1.522 mã khớp trong ±1%, còn 5 mã lệch quá 10%.
   > **Ngưỡng cổng là 10%, không phải 20%:** nới 20% thì cận trên là 1/0,8 = ×1,25, đo được
   > DQC ×1,247 và ABT ×1,222 — cột mới nhất của bảng vênh 25% với ô "Vốn hoá" đầu trang, đọc
   > ra như một trong hai chỗ hỏng. Siết 10% chỉ mất thêm 22 mã.

   Nội dung cũ giữ lại để hiểu vì sao có `data/sukien`:  — bẫy nguy hiểm nhất, tìm ra muộn nhất.
   Cổ tức TIỀN lấy từ `dividend/histories` (sâu tới 2016), sự kiện CỔ PHIẾU lấy từ
   `events/list` — nguồn này **chỉ trả ~5 năm** (dò: NTP 22 sự kiện, cũ nhất 03/2021, không
   có trang 2). HPG: `divQ` biết **7 quý** trong khi vốn góp cho thấy **19 lần** SLCP nhảy.
   Ngoài khoảng phủ, G(t) hụt → vốn hoá 2018 ra 42.190 tỷ thay vì ~66.000 tỷ.
   → Chỉ dùng vốn góp **trong khoảng kho sự kiện phủ được** (`min(quý có sự kiện cổ phiếu cũ
   nhất, quý mới nhất − 20)`); ngoài đó quay về SLCP hôm nay. Phần gỡ cổ tức TIỀN vẫn chạy
   ở mọi kỳ. Sau khi vá, HPG 2018 ra **65.816 tỷ** so với thực tế ~65.844 tỷ.

> **ĐÃ THỬ RỒI BỎ — đừng dựng lại:** tách "chia cổ phiếu" khỏi "phát hành lấy tiền" bằng
> báo cáo (chia cổ phiếu thì lợi nhuận giữ lại giảm, phát hành thì không). Nghe xuôi nhưng
> **lãi từng quý át mất tín hiệu**: HPG Q2/21 chia 35% bị đọc thành phát hành, Q2/24 thưởng
> 10% cũng vậy (thưởng lấy từ thặng dư, không từ lợi nhuận giữ lại). `data/fin` bsQ cũng
> không dùng được: dòng VỐN CHỦ SỞ HỮU chỉ có số ở vài quý gần nhất.

Tác động đo trên 51.871 ô: trung vị ×1,024, và **tăng dần theo tuổi của kỳ** — 2025-26 ×1,000
· 2024 ×1,023 · 2022 ×1,052 · 2019 ×1,092 · 2017 ×1,112 (đúng hình dạng một hệ số cổ tức tích
luỹ). 41% số ô lệch quá 25%, 12% lệch quá 100%.

**MỐC CHIA CỔ TỨC TRÊN BIỂU ĐỒ KQKD.** Chấm tròn dưới chân cột nào có chốt quyền (`veMocCoTuc`,
đọc `finData.divQ`; cột NĂM gộp cả bốn quý), rê vào hiện chia gì bao nhiêu. Xanh = tiền,
vàng = cổ phiếu/thưởng, có chú thích trong `.finlegend`. **Là thẻ HTML chứ không vẽ lên
canvas**: canvas không có phần tử để rê vào nên phải tự bắt `mousemove` và dò toạ độ, trong
khi trang đã có sẵn `CP.tips` chạy bằng uỷ quyền `data-tip` — thẻ thật thì được luôn chú
giải lẫn chạm trên điện thoại. Thẻ cắm vào `.finwrap` (`position:relative`) nên dùng chung
hệ toạ độ với `centers` của canvas và trôi theo cột khi cuộn ngang. `padB` của biểu đồ nâng
6 → **15** để chừa chỗ; để 6 thì cột của kỳ nhỏ nhất đè lên chấm.

**THANH NÚT BÁO CÁO TÀI CHÍNH — NGƯỠNG 720px LÀ ĐO ĐƯỢC (19/08/2026).** User báo màn hẹp
"quá nhiều nút dồn 1 chỗ và không thẳng hàng". Đo ở 375px trước khi sửa: `#secTabs` rớt 2
hàng (hàng 2 hụt 40px bên phải), `#finP` hết 208/342px rồi bỏ trống 134px, `#finB` rớt
"Lưu chuyển tiền tệ" xuống đứng một mình — 5 hàng nút so le, 166px chiều cao trước khi
thấy con số nào.

| | cần bao nhiêu để xếp MỘT hàng | tức viewport |
|---|---|---|
| `.finbar` (finP + vạch + finB) | 616px nội dung | ~682px |
| `#secTabs` (5 thẻ, cỡ đầy đủ) | 649px nội dung | ~681px |

Hai thanh gãy ở gần đúng cùng một chỗ nên **một ngưỡng 720px phục vụ cả hai** (682 + chỗ dư
cho khác biệt phông chữ). **Đừng mượn ngưỡng 760px của phần còn lại trang** — dải 720–760
hai thanh vẫn xếp một hàng thoải mái, ép xuống lưới ở đó là kéo giãn nút vô cớ. (Tao đã
viết nhầm thành hai ngưỡng 720/620 rồi phải sửa lại: con số 578px dùng để tính ngưỡng
`#secTabs` là bề rộng ở cỡ chữ ĐÃ THU NHỎ 13,5px, không phải cỡ đầy đủ 14,5px.)

Dưới 720px: `#finP` lưới 2 cột, `#finB` lưới 3 cột, cả hai đủ bề rộng → **mép trái VÀ mép
phải của hai hàng thẳng nhau**. Nút bảng 2 dòng chữ là CỐ Ý (1/3 của 343px = 110px, một
dòng phải hạ cỡ chữ xuống ~9,7px mới vừa); chỗ ngắt ghim bằng `&nbsp;` trong HTML
("Kết quả" / "kinh doanh") vì thả cho trình duyệt tự ngắt thì ra "Kết quả kinh" / "doanh".
`#secTabs` chuyển sang **cuộn ngang một hàng** — 5 thẻ không xếp lưới nổi ở bề rộng này
(3 cột thì mỗi thẻ 110px trong khi "Hồ sơ doanh nghiệp" cần 177px; 2 cột thì thành 3 hàng,
cao hơn cả lúc chưa sửa). Đã thử rồi bỏ lớp mờ `mask-image` ở mép phải: cuộn hết sang phải
rồi bấm "Tài liệu" thì chính thẻ ĐANG CHỌN bị mờ nửa bên phải, đọc ra như lỗi hiển thị.
Tay bấm `#secTabs` gọi `scrollIntoView({block:'nearest',inline:'nearest'})` để thẻ vừa bấm
không nằm nửa trong nửa ngoài — `block:'nearest'` là bắt buộc, để mặc định `'start'` là nó
cuộn dọc cả trang.

Đo lại sau khi sửa (320 / 375 / 414 / 600 / 700 / 721 / 760 / 1280px): hai hàng luôn thẳng
mép, không mã nào tràn chữ ra ngoài nút, trang không tràn ngang.

**BA BẢNG BCTC = BA THẺ CHỌN (19/08/2026).** `#finB` đặt ngay dưới `#finP` (quý/năm); ba
bảng bọc trong `.finblk#fb-kq|fb-cd|fb-lc`, chỉ thẻ `.on` có `display:block`. Ba dòng
`<h3 class="t">` cũ đã bỏ — tên bảng nằm trên nút. User chốt: xem lưu chuyển tiền tệ mà
phải cuộn qua trọn hai bảng kia là quá xa.

> **BẪY — `drawFinChart` đo `offsetWidth` của `<th>` bảng KQKD** để đặt cột biểu đồ thẳng
> tâm với cột bảng. Thẻ đang `display:none` thì mọi số đo bằng 0 và nó rơi về bề rộng mặc
> định **800px**. Đo thật trên NTP: đứng ở thẻ "Cân đối" rồi bấm "Theo năm" → canvas 800px
> trong khi bảng 1.212px. Vì thế tay bấm `#finB` **phải gọi `veLaiFinChart()` mỗi khi quay
> về `kq`** — lúc hiện lại là lúc duy nhất đo được số thật. Thêm bất kỳ canvas nào vào thẻ
> ẩn về sau cũng dính đúng bẫy này.
>
> **Bẫy anh em: `resize` xong 60ms bố cục vẫn có thể chưa ngã ngũ.** Đo được canvas dừng ở
> 1.020px trong khi bảng đã là 1.212px, và không còn `resize` nào nữa để tự chữa. Nên
> `resize` và nút đổi sáng/tối gọi **`veLaiFinChartChac()`**: vẽ xong thì SO LẠI bề rộng
> canvas với bề rộng bảng, lệch mới vẽ thêm đúng một lượt. Đừng "chờ lâu hơn" — dài bao
> nhiêu cũng vẫn là đoán. Có thêm một `ResizeObserver` trên `.finwrap` làm đường phụ (bắt
> trường hợp thẻ cha đổi bề rộng mà cửa sổ KHÔNG resize), nhưng đừng coi nó là chỗ dựa duy
> nhất — **trang ở trạng thái nền (`document.hidden`) thì ResizeObserver không bắn**, nên
> thử trong tab ẩn mà thấy im là chuyện bình thường, không phải nó hỏng.

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

> ⚠️ **"VPS" TRONG TÀI LIỆU NÀY LUÔN LÀ CÔNG TY CỔ PHẦN CHỨNG KHOÁN VPS** (`vps.com.vn`) —
> nguồn bảng giá trực tiếp, chỉ số và nến dự phòng. **Máy chủ tự thuê để chạy pipeline gọi
> là `ASTERBOX`** (cũng là một VPS theo nghĩa máy ảo, nhưng đừng gọi tắt như vậy nữa —
> đã có lần đọc nhầm thành một). Xem `server/README.md`.

## Giá trong phiên — KHÁCH ĐỌC KHO, KHÔNG GỌI THẲNG VPS (17/08/2026)

`tools/gia_phien.py` chạy trên ASTERBOX **mỗi 30 phút trong phiên** (tác vụ `CPVN gia
phien`, xem `server/setup_gia_phien.ps1`), lấy bảng giá VPS đúng 11 lượt cho cả thị trường,
ghi **nguyên văn** mảng VPS trả về vào `data/board.json` rồi commit + push. Client đọc file
đó thay vì tự gọi VPS. Số chốt sổ vẫn do tác vụ EOD 15:15 lo.

**Vì sao đổi** (đo thật trước khi sửa):

| | lượt gọi VPS | dung lượng |
|---|---|---|
| 1 tab mở 1 giờ trong phiên | 180 | 24 MB |
| 100 người xem cùng lúc, 6h | 108.000 | 14,5 GB (gấp 28× cả pipeline) |
| 1000 người xem cùng lúc, 6h | 1,08 triệu | 145 GB (gấp 277×) |
| **nay, mọi quy mô** | **143/phiên** | **hằng số** |

Tải lên VPS TỈ LỆ THUẬN với lượng truy cập — tự lớn theo thành công của trang, không cần ai
tấn công; mà mọi lượt gọi lại mang sẵn `Origin: https://cpvn.io`. Khách cũng nhẹ hơn 10 lần:
1 lượt · 150 KB (Cloudflare nén) thay vì 11 lượt · 1,48 MB.

- **GHI NGUYÊN VĂN, ĐỪNG PHÂN TÍCH Ở PHÍA MÁY CÀO.** Client đã có `doPoll` với toàn bộ luật
  đã trả giá đắt (quy đổi ×1000/×10, cờ `nt`, lưới chặn biên độ, bảng đêm rỗng). Đẻ thêm bản
  sao thứ tư ở máy cào là hai bên trôi khỏi nhau ngay lần sửa sau.
- **CHỈ rơi về VPS khi kho KHÔNG CÓ file**, không rơi về vì file CŨ: file cũ nghĩa là máy cào
  đang trục trặc, mà đó đúng là lúc cả nghìn khách cùng đổ về VPS một lượt.
- **Ba bản sao** (`core.js`, `bubbles.html`, `congcu.js`) phải sửa cùng lúc.
- `_headers` cho `board.json` cache **60s** (ngắn hơn `/data/*`) để độ trễ không cộng dồn.
- **NHÃN "giá lúc HH:MM"** (`CP.nhanGia`) là thứ DUY NHẤT lộ ra khi cả hai máy cào chết —
  không có nó thì trang vẫn hiện giá bình thường, chỉ là số của mấy tiếng trước. Quá 45 phút
  trong phiên thì tô đỏ. Ngoài phiên không bao giờ báo cũ.

> **ĐỔI NHỊP THÌ PHẢI ĐỔI NGƯỠNG "MÁY CHÍNH ĐÃ CHẾT" THEO.** Lưới dự phòng
> `.github/workflows/gia_phien.yml` coi `board.json` cũ quá **75 phút** (hơn 2 nhịp) là máy
> chính chết rồi tự cào thay. Giữ ngưỡng cũ khi đổi nhịp là chỉ cần lỡ MỘT lượt đã bị kết
> luận nhầm, rồi hai máy cùng ghi đè nhau.
> **Lịch Actions KHÔNG phải "giờ hẹn" mà là "sớm nhất có thể"** — đo 27 lượt trên chính kho
> này: trễ ít nhất 7 phút, **trung vị 150**, nhiều nhất 287, không lượt nào đúng giờ. Nên
> workflow rải **11 mốc** từ 22:00 UTC hôm trước tới 8:00 UTC; mô phỏng với mọi độ trễ đã đo
> thì luôn còn 6-7 mốc rơi trong phiên. Đặt vài mốc "quanh giờ cần" là lưới thành hình thức.
> **Actions CHƯA TỪNG đẩy commit nào** — nó luôn thoát sớm vì ASTERBOX đã làm xong. Đúng
> nghĩa lưới an toàn chưa phải dùng tới.

> **BẪY MÁY CHỦ — cả ba chỉ lộ ra khi chạy THẬT trên ASTERBOX dưới tài khoản SYSTEM:**
> ① thiếu `GIT_SSH_COMMAND` -> `Host key verification failed` (SYSTEM không có ssh config,
> không có known_hosts, khoá deploy tên không mặc định); ② gọi trống `python` -> SYSTEM không
> có nó trong PATH, PowerShell ném CommandNotFound mà `$LASTEXITCODE` GIỮ NGUYÊN 0 nên tác vụ
> **báo thành công giả**; ③ console cp1252 -> `UnicodeEncodeError` ở dòng print tiếng Việt đầu
> tiên. Phải dùng đường dẫn đầy đủ tới python, `Test-Path` trước, và ép stdout sang UTF-8.
> **`-StartWhenAvailable` là BẮT BUỘC**: trigger Weekly-09:00 kèm Repetition, máy tắt đúng
> 09:00 là trigger trượt và **repetition không bao giờ bắt đầu** -> mất giá cả ngày, im lặng.

## Gọi mạng — trần theo host + lùi dần (`tools/nhipmang.py`, 16/08/2026)

Mọi lượt gọi của pipeline đi qua `nhipmang.get()`. **Đừng gọi thẳng `urllib` nữa.**

| Cơ chế | Làm gì |
|---|---|
| **Trần theo host** | khoảng cách tối thiểu giữa hai lượt tới CÙNG một host, đo bằng đồng hồ chung có khoá nên đúng cả khi nhiều luồng |
| **Lùi dần** | 429/5xx/timeout → chờ 1s, 2s, 4s rồi thử lại; tôn trọng `Retry-After` nếu nguồn gửi. 400/403/404 thì ném ra ngay, thử lại vô ích |
| **Tự chậm lại vĩnh viễn** | bị 429 → **nhân đôi trần của host đó cho hết lượt chạy** (trần tối đa 5s). Đây mới là phần quan trọng: chờ rồi thử lại với tốc độ cũ là vẫn nện |

Trần đang khai: Simplize 8 lượt/giây · VNDirect 12 · 24hMoney 8 · VPS 5 · SSI 2 · mặc định 5.
> **ĐỪNG nới trần để pipeline nhanh hơn.** Nó chạy 15h15 không ai ngồi đợi; chậm thêm vài
> phút không mất gì, bị chặn IP là mất cả nguồn. Trước khi có lớp này, bước kho nến chạy 12
> luồng × ~200ms = đỉnh **~60 lượt/giây** dội vào VNDirect — con số của một cuộc tấn công
> nhẹ chứ không phải của một trang tử tế. Đây là lớp phòng thủ cho **Điều 287 BLHS**.

**USER-AGENT: `CPVN.IO/1.0 (+https://cpvn.io)` — ĐỪNG QUAY LẠI CHUỖI GIẢ TRÌNH DUYỆT.**
Bản cũ gửi `Mozilla/5.0 … Chrome/120`. Giả UA không cấu thành Điều 289 (không vượt cảnh báo
hay mã truy cập nào) nhưng là chi tiết DUY NHẤT trong cả hệ thống mang hình dạng lảng tránh.
Mà giấu cũng vô nghĩa: mọi lượt gọi **từ trình duyệt người xem** đều mang sẵn
`Origin: https://cpvn.io` (CORS bắt buộc, không tắt được) — và đó mới là gần hết khối lượng.
Đã đo 16/08: **9/9 nguồn trả 200** với UA thật thà.
> **Chưa đưa email vào UA** — chờ có pháp nhân rồi mới thêm địa chỉ của công ty. Đừng phơi
> liên hệ cá nhân vào log của bên thứ ba khi chưa có lớp bảo vệ nào.

**GHI NGUỒN đặt NGAY DƯỚI BẢNG GIÁ** (`.nguon` trong index.html), không nhét xuống chân
trang: *"Giá trực tiếp & chỉ số: Chứng khoán VPS · Nến lịch sử, khối ngoại & tin: VNDIRECT"*.
Vừa là phép lịch sự tối thiểu, vừa là **cách xin phép ngầm** — tên họ hiện công khai, họ
nhìn thấy, không phản đối; đó là đồng thuận trên thực tế mà không cần ai ký gì.
> ⚠️ **Chưa gửi email xin phép VPS, và cân nhắc kỹ trước khi gửi.** Endpoint của họ công
> khai, CORS mở sẵn `Access-Control-Allow-Origin: *` (cấu hình có chủ ý). Hỏi xin phép có
> thể biến vùng xám ĐANG CÓ LỢI thành một chữ "không" bằng văn bản — mà "tiếp tục sau khi
> bị yêu cầu dừng" thì xấu hơn hẳn mọi luận điểm hiện có. Nếu hỏi thì hỏi câu THƯƠNG MẠI
> ("quý công ty có chương trình dữ liệu cho trang thông tin không?") chứ đừng hỏi câu xin
> phán quyết.

> **CNN FEAR & GREED ĐÃ BỎ HẲN 16/08/2026 — ĐỪNG DỰNG LẠI, KỂ CẢ BẰNG VIX.**
> Bước 10b của pipeline, khối `_cnn`/`_vix` trong `build_screen.py`, ô "Sức mạnh TOÀN CẦU"
> trong `tgSucManh()` và hai trường `global`/`usfg` của `market.json` đều gỡ.
> Lý do **không phải chuyện cào** (1 lượt/ngày, chẳng ai bận tâm) mà là: trang **trưng tên
> thương hiệu "CNN Fear & Greed"** kèm con số ở panel Radar. Con số là dữ kiện; **cái tên
> và cách tính là sản phẩm có thương hiệu của CNN**. Giấu User-Agent không che được thứ
> hiện trên mặt tiền — ai ở CNN mở `cpvn.io/radar` là thấy trong năm giây.
> Nhánh dự phòng VIX cùng vấn đề (chỉ số thương hiệu của CBOE) và Yahoo đã trả 429 từ lâu.
> **Ô "Sức mạnh thị trường" trong nước giữ nguyên** — CPVN tự tính từ dữ liệu của mình.

## Pipeline

11 bước, thứ tự bắt buộc: **bảng giá (bước 2) phải chạy TRƯỚC kho nến (bước 3)** vì
`fetch_hist` dò hệ số đơn vị bằng cách đối chiếu với `ref` của bảng giá. **Bước 6d
(`build_nganh`) phải đứng SAU 6c (`kho_sau`)** vì nó chỉ tin dấu lưu chuyển tiền tệ
của `finq`, **và SAU 6c2 (`cao_cocau`)** vì dòng ký quỹ của mẫu CTCK đọc thẳng
`data/cocau`; chạy bằng `--moi` (so mtime) nên ngày thường xong trong vài giây.
**6c2 dùng `--moi --ngay 20`**, không phải hằng ngày: báo cáo quý ra mỗi 3 tháng, hỏi lại
mỗi phiên là phí ~3.000 lượt gọi cho một con số cả quý mới nhúc nhích một lần.
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

> **KHO LOGO (bước 9): ĐẾM THEO FILE THIẾU, ĐỪNG ĐẾM THEO MÃ CÓ URL.** Bản cũ lọc
> `stocks[s].get("img")` ngay dòng đầu nên mã KHÔNG CÓ url biến mất khỏi cả vòng tải lẫn báo
> cáo — phiên 13/08/2026 thiếu **16** logo mà `health.json` ghi 10; sáu mã còn lại (DTH, TAN,
> ANI, TAH, ULG, PCB) không ai biết là có tồn tại. Nay tách hai rổ: `missing` = thiếu file mà
> CÓ url (lượt sau thử lại được) · `khong_url` = nguồn Simplize không có ảnh, **phải tìm nguồn
> khác chứ thử lại vô ích** · `ma` = danh sách mã để soi thẳng.
> **`fetched:0` nhiều phiên liền TRONG KHI `missing` không giảm nghĩa là mấy url đó đang 404 ở
> nguồn** — đừng đọc thành "chưa chạy tới". 10 mã nhóm A hiện đúng trạng thái ấy.

**Lịch chạy**: máy cào `ASTERBOX` (VPS Windows — *máy thuê của mình*, KHÔNG liên quan
Chứng khoán VPS) chạy Scheduled Task 15:15 gọi `server/run_refresh.ps1` (commit
`EOD <phiên> (server)`) — **đường chính**. GitHub Actions dự phòng 16:05 / 19:05 / 23:05 giờ VN,
so `data/health.json['date']` với **phiên gần nhất đã đóng sổ**, bằng nhau thì tự thoát.
Toàn bộ cấu hình máy chủ nằm trong **`server/`** (script chạy + script dựng tác vụ + cách
dựng lại từ số 0). Tác vụ trỏ thẳng vào file TRONG kho nên sửa ở repo là lượt sau tự lấy.

> **`Last Result: 0` của Scheduled Task trên `ASTERBOX` KHÔNG có nghĩa là đã đẩy được lên GitHub** — nó chỉ
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
