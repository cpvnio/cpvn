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
| `fun.html` | 330 | **TRANG ẨN `/fun`** — chỉ số VN-Index giả định. Không mục nào trên web trỏ tới, `noindex`. Tự chứa, chỉ đọc `data/fun.json` |
| `tools/kho_fun.py` | 190 | Dựng `data/fun.json` cho trang trên. KHÔNG gọi mạng, ~2 giây. Bước `[3a]` của lượt EOD |
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
| `tools/kho_thanhkhoan.py` | 60 | Thanh khoản CHÍNH THỨC từng sàn từng phiên → `data/thanhkhoan.json`. 3 lượt gọi |
| `tools/soi_thanhkhoan.py` | 130 | Cộng kho rồi đặt cạnh số của sàn — **phép đo phải chạy sau mọi lượt đụng vào kho giao dịch**. KHÔNG gọi mạng |
| `tools/kho_thoathuan.py` | 260 | Vá `pv`/`pval` từ Vietstock cho cả kho. **Lượt một lần**, không nằm trong pipeline |
| `tools/lap_slcp_cu.py` | 190 | Lấp `sh` cho phần ĐẦU khung bằng cách đi ngược `data/sukien`. KHÔNG gọi mạng, bước `[1c]` của lượt EOD |
| `tools/kho_luuthong.py` | 130 | Tỉ lệ **lưu thông** tính từ sổ cổ đông (`100% − Σ cổ đông ≥5%`) -> ghi đè `freeFloat` trong `data/profile`. KHÔNG gọi mạng, bước `[3b]` của lượt EOD |

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
| `data/phien/{NGÀY}.json` | Một file mỗi phiên (~510KB): `bang`+`f` bảng mã · `ma` vùng giá khớp lệnh · `la` quét bất thường · `dt`+`dtf` lát cắt ngang cho bộ lọc. **FILE NHIỀU CHỦ — MỌI LƯỢT GHI PHẢI TRỘN.** Đã trả giá 21/08/2026, xem mục *Phân tích dữ liệu* |
| `data/phantich.json` | Chuỗi toàn thị trường theo phiên + khối `chiso`. Nhẹ, trang tải ngay |
| `data/chiso.json` | 5 chỉ số theo phiên (`d,c,v,pc`) — **VNINDEX từ 28/07/2000**, phiên đầu tiên của chỉ số. Kho CHÍNH, `build_phantich.py` đọc. `kho_giaodich.py --chiso` |
| `data/chiso/{CHỈ SỐ}.json` | **Bản GẦY của file trên** — chỉ `d`+`c`, cho chart nến trang mã (VNINDEX 34 KB đã nén thay vì 254 KB). Cùng một hàm ghi ra, không thể trôi khỏi nhau |
| `data/vonhoa/{MÃ}.json` | **Vốn hoá theo phiên, lùi tới 02/01/2013** — 405 mã HOSE, `d`+`v` (đơn vị TỶ). Ba tầng ghép: kho đã soi -> MARKETCAP -> giá thô × vốn góp. 21 KB đã nén/mã, thay cho lượt tải `data/giaodich` 81 KB. `tools/kho_vonhoa.py` |
| `data/chungquyen.json` | **328 chứng quyền đang lưu hành** trên 20 cổ phiếu cơ sở, kèm tổ chức phát hành. MỘT lượt gọi. Dùng để đọc con số tự doanh cho đúng — xem mục *Phân tích dữ liệu* |
| `data/rolichsu.json` | **Rổ mã lịch sử: 1.968 mã, trong đó 443 ĐÃ RỜI SÀN** kèm ngày niêm yết / huỷ niêm yết. Chống sống sót sai lệch |
| `data/noibo.json` | **Giao dịch của người nội bộ** đọc từ tiêu đề CBTT trong `data/news`. KHO GOM DỒN — `data/news` chỉ giữ 30 ngày |
| `data/screen.json` `fund.json` | Dạng CỘT: `f`=tên trường, `d[MÃ]`=mảng giá trị cùng thứ tự |
| `data/market.json` | `breadth` 250 phiên · `global` (CNN F&G) · `race` (đường đua) |
| `data/tapdoan.json` | Bản đồ tập đoàn: nhóm → mã con + % mẹ nắm. `tools/build_tapdoan.py` dựng |
| `data/quy.json` | Danh mục các quỹ: quỹ → mã đang nắm + giá trị + **kỳ công bố**. Cùng script |
| `data/cotuc.json` | Lịch chốt quyền: cổ tức tiền/CP, CP thưởng, phát hành thêm + ngày GDKHQ. `tools/build_cotuc.py` |
| `data/fun.json` | **Chỉ số VN-Index GIẢ ĐỊNH** (VIC và VHM cố định 200.000 tỷ) cho trang ẩn `/fun`: `d` ngày · `c` chỉ số thật · `g` chuỗi giả định đã ghép (neo phiên đầu) · `w` tỉ trọng VIC+VHM. 113 KB. `tools/kho_fun.py` |
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

> **`api-finfo.vndirect.com.vn/v4/stock_prices` CÓ CẢ GIÁ THÔ LẪN GIÁ ĐÃ HẠ NỀN — 3.400
> phiên từ 02/01/2013.** `close` là giá THÔ như đã khớp, `adClose` là giá đã hạ nền và
> **khớp `data/hist` tới từng đồng**. Đây là nguồn giá thô lịch sử DUY NHẤT trong các nguồn
> đang dùng (dchart chỉ trả giá đã hạ nền), và là thứ làm được kho vốn hoá sâu — vốn hoá
> phải nhân giá THÔ với số cổ phiếu của chính phiên đó. Xem mục *KHO VỐN HOÁ SÂU*.

> **CHỈ SỐ THÌ NGƯỢC LẠI — VPS SÂU HƠN HẲN, VÀ ĐƯỢC PHÉP DÙNG.** Bảng trên nói về nến CỔ
> PHIẾU. Với VNINDEX/HNX/UPCOM/VN30/HNX30 thì `dchart` chặn ở 24/08/2017 còn VPS có VNINDEX
> **từ 28/07/2000**; chỉ số không chia tách nên chỗ VPS yếu (hồi tố quyền) không đụng tới.
> Xem mục *CHỈ SỐ ĐÃ SÂU TỚI 2000* — `kho_chiso()` trong `tools/kho_giaodich.py`.

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

### VỐN HOÁ VIẾT HẲN SỐ THEO ĐƠN VỊ TỶ — ĐỪNG ĐỔI BẬC SANG "NGHÌN TỶ"

```
10.167.115 tỷ        <- đúng
10.167 nghìn tỷ      <- SAI, và đã dùng nhầm suốt 21/08/2026
```

User chốt 22/08/2026: *"nhiều người đọc không hiểu 10.000 nghìn tỷ là 10 triệu tỷ"*.
Mắt bắt lấy con số `10.167` rồi dừng ở đó, chữ "nghìn" phía sau thành ra chỉ là một cái
đuôi — không ai nhân nhẩm khi đang lướt. Viết hẳn thì độ lớn nằm ngay trong chính con số.

> Đây vốn đã là **luật sẵn có của dự án** ở mục *Quy ước toàn site* — *"hiển thị một đơn
> vị `tỷ` duy nhất qua `CP.fmtVnd`, viết hẳn số (`1,100 tỷ`) không đổi bậc"* và *"bỏ hậu
> tố tự chế N/Tr … chỉ CÂU CHỮ mới viết nghìn tỷ"*. Đoạn dựng ô vốn hoá đã phá luật đó.
> Nhắc lại ở đây vì nó tái phạm được: mỗi lần thấy một con số 8 chữ số là rất muốn rút gọn.

### FREE FLOAT — có sẵn trong kho từ lâu mà không chỗ nào đọc (21/08/2026)

> ⚠️ **CON SỐ TRONG MỤC NÀY ĐÃ LỖI THỜI TỪ 24/08/2026** — hồi đó `freeFloat` còn lấy thẳng
> `freeFloatRate` của Simplize, thứ hoá ra là **ước lượng theo dải** chứ không phải tỉ lệ
> tính ra. Mọi số ở đoạn dưới (20,1% vốn hoá lưu thông, 1.429 mã có tỉ lệ, thứ hạng BID/VGI)
> vì thế **đừng trích lại**. Cách tính nay ở mục *LƯU THÔNG TỰ TÍNH TỪ SỔ CỔ ĐÔNG*; phần
> vẫn đúng của mục này là LÝ DO free float đáng đọc và phép kiểm chéo bằng vòng quay.

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

### GIÁ VÀ TIỀN TRÊN CÙNG MỘT ĐỒ THỊ — `ptVe1` CÓ TRỤC PHẢI

Gộp 22/08/2026 (user chốt: *"đưa giá đóng cửa và giá trung bình vào ô giá trị giao dịch,
gộp 2 ô lại thành 1 sẽ hay hơn"*). Hai đồ thị rời thì phải tự dóng bằng mắt qua trục
ngày để hỏi đúng câu người ta hỏi ở đây: **phiên tiền vào nhiều là phiên giá đi đâu**.
Chồng lên nhau thì đọc thẳng — cột cao mà giá tụt là phân phối, cột cao mà giá bật là gom.

`cfg.phai = {series:[…], nhan}` vẽ trên **thang riêng, trục bên phải**, và **không kéo về
0** (giá dao động quanh một mức cao, kéo về 0 là đường thẳng đơ). Cùng cách `ptVeChart`
đã làm với VN-Index. `padR` đo bằng chính chuỗi sắp in, và mọi thứ chạm mép phải
(vạch lưới, nhãn ngày cuối) phải trừ `padR` — quên là chúng chui xuống dưới nhãn trục.

> **ĐƯỜNG ĐÓNG CỬA PHẢI TƯƠNG PHẢN VỚI CỘT, VÀ PHẢI ĐỔI THEO CHỦ ĐỀ.** Nó nay chạy ĐÈ LÊN
> cột chứ không đứng ở đồ thị riêng, nên để màu cùng họ xanh với cột là nó chìm vào chính
> cái nền nó đang chồng lên. Dùng `--pkA`: gần-đen ở nền sáng, gần-trắng ở nền tối. Viết
> cứng một màu là một trong hai chế độ mất hẳn đường đó lẫn ô chú thích của nó.

### GIÁ TRUNG BÌNH (VWAP) — MÔ TẢ PHIÊN, KHÔNG DỰ BÁO PHIÊN SAU

`vwap` = trường `AvrPrice` của nguồn = tổng giá trị khớp lệnh ÷ tổng khối lượng khớp lệnh.
Bốn điều nó nói được mà giá đóng cửa không nói: ① đóng cửa chỉ là giá của MỘT lệnh cuối
(hoặc ATC), một lệnh nhỏ phút chót đẩy đi được, còn VWAP có trọng số theo tiền · ② so hai
mức là đo **ai thắng trong phiên** — đóng cửa trên VWAP là bên mua đẩy lên về cuối, dưới
là bên bán ép · ③ đây là mốc tổ chức chấm chất lượng thực thi lệnh · ④ với mã mỏng, VWAP
lộ ra giá đóng cửa bịa (khớp vài lô, lệnh cuối kê trần).

> **NHƯNG NÓ KHÔNG DỰ BÁO ĐƯỢC GÌ — đã đo, đừng dùng nhầm.** "Đóng cửa so VWAP" làm tín
> hiệu cho lợi suất phiên sau: **rank IC −0,0031, t = −0,24** trên 99 phiên. Bằng không.
> Nó mô tả cấu trúc phiên vừa rồi, không nói gì về phiên tới.

### `neo_slcp` XOÁ SỐ CỔ PHIẾU MỖI LẦN `eod_ghi` CHẠY — đã vá 22/08/2026

Bệnh anh em với chuyện `eod_ghi` xoá cột lạ, nhưng lặng hơn nhiều vì cột vẫn còn, chỉ RỖNG
BỚT. `doc["sh"]` được **tính lại từ `shR`** (số cổ phiếu suy từ vốn hoá của Vietstock) ở
MỌI lượt `eod_ghi`. Mà `shR` chỉ sâu bằng đúng tầng giá Vietstock (~120–300 phiên), nên nó
ném đi phần `sh` sâu 1.000 phiên mà `kho_slcp.py`/`kho_vnd_lo.py` đã lấp từ VNDirect.

Đo ngay sau lượt EOD 21/08 (lượt đó còn chạy `kho_giaodich --sau` cho cả 1.529 mã):
**chỉ 21/1.529 mã còn `sh` gần đủ**; TCB còn 301/1.000 ô, và ô đầu tiên nằm đúng
2025-06-11 — đúng chỗ `shR` bắt đầu. Tức đồ thị vốn hoá lại cụt như trước, đúng lỗi user
đã báo một lần rồi.

Vá hai lớp: `eod_ghi` **giữ `sh` cũ ở mọi ô `neo_slcp` không suy ra được**, và lượt EOD
thôi chạy `--sau` nên `shR` không còn bị làm mới nông. Lấp lại bằng
`python3 tools/kho_vnd_lo.py --tang sh --sau 1000` (39 lượt gọi, 36 giây) →
**1.422/1.529 mã** có `sh` gần đủ, HPG/TCB/VNM đều vẽ được 905/1.000 phiên từ 2023-01-03.

> **Bài học chung, lần thứ hai trong một ngày:** hàm ghi TÍNH LẠI một trường từ nguồn nông
> hơn nguồn đang có là một dạng xoá dữ liệu — và nó không để lại dấu vết nào, vì cột vẫn
> tồn tại và những ô còn lại vẫn đúng.

### SỔ LỆNH ĐÃ XOÁ KHỎI KHO (22/08/2026) — `qMua` `qBan` `nMua` `nBan`

User chốt: *"tao không cần data sổ lệnh hàng ngày nữa"*. Lượt EOD thôi cào, và
`tools/gon_kho.py` xoá luôn khỏi kho: **290 → 261 MB (−30 MB)**.

**Xoá được mà không mất vĩnh viễn** — đo độ sâu TRƯỚC khi xoá: trung vị **121 phiên**,
p90 121, max 251. Vietstock chặn cứng 1 năm nên chạy lại `kho_giaodich.py --sau` lúc nào
cũng lấy về đúng chừng ấy. Khác hẳn `*TTGT` (tách thoả thuận) — thứ mất là mất thật.

`tools/kho_dactrung.py` đọc bốn trường này qua `g()` (trả `[None]*n` khi thiếu) nên không
vỡ, đặc trưng suy từ sổ lệnh chỉ thành rỗng và bị bỏ cột.

> Cái giá, biết trước: đây là tín hiệu **mạnh nhất** kho từng đo (rank IC +0,082,
> **t = +12,24** trên 248 phiên). Chuỗi đứng lại ở phiên 21/08/2026.

### LƯỢT EOD DỰNG LẠI 22/08/2026 — 2h34 XUỐNG ~8 PHÚT, VÀ BỎ CÀO SỔ LỆNH

User: *"tao không muốn chốt phiên 15h15 mà tận 17h20 mới có đủ data"*, và *"giá khớp lệnh
trung bình và tổng khối lượng khớp lệnh của từng mã là quá đủ rồi"* → bỏ cào sổ lệnh.

**Lượt 21/08 chạy 2 giờ 34 phút** (15:15 → 17:49). Gốc là SỐ LƯỢT GỌI và THỨ TỰ, không phải
nguồn chậm. Ba thứ đã đổi:

| | trước | sau | vì sao |
|---|---|---|---|
| `kho_vnd.py` | 4.587 lượt · ~45 ph | **`kho_vnd_lo.py` 156 lượt · 2,6 ph** | cả 4 endpoint VNDirect nhận `q=code:A,B,C` |
| `kho_giaodich --sau` | 12.232 lượt · ~51 ph | **BỎ HẲN** | tầng giá trùng VNDirect; sổ lệnh user chốt bỏ |
| `kho_giaodich --vg` | 3.058 lượt · ~13 ph | **`kho_vunggia.py` 525 lượt · 0,8 ph** | nến 1 phút của VNDirect, host trần 12/s thay vì 4/s |
| khối ngoại / tự doanh tách | 3.058 lượt | **530 lượt · 2,4 ph** | `--tuloc` bỏ mã chắc chắn không có số |
| thoả thuận | (đi kèm `--sau`) | **348 lượt · 1,4 ph** | `--tt --tuloc`, xem bẫy ngay dưới |

**~19.900 → ~1.900 lượt gọi.** Và `refresh_daily.py` (~29 phút) nay chạy **SAU** lượt đẩy
thứ nhất, vì trang /phantich không cần nó. `PushKho` gọi hai lần: `(phan tich)` ở ~8 phút,
`(server)` ở cuối.

> **VÌ SAO TỐC ĐỘ LÀ CHUYỆN ĐÚNG/SAI CHỨ KHÔNG CHỈ LÀ TIỆN:** lưới dự phòng GitHub Actions
> hẹn 16:05, *"sau giờ server chính 50 phút"*. Ngày 21/08 server chạy 2h34 nên Actions kết
> luận server chết và **cào lại toàn bộ pipeline** — commit `fc69c0233`, 1.927 file, **lần
> đầu tiên trong lịch sử repo** nó thật sự đẩy. Tức mọi nguồn bị nện gấp đôi. Xuống 8 phút
> là ngòi đó tự tắt; **đừng nới mốc 50 phút của workflow, hãy giữ lượt chạy dưới nó.**

**BỐN PHÉP ĐO ĐỨNG SAU MẤY CON SỐ TRÊN** (đừng đo lại, và đừng "tối ưu" ngược lại):

① **Vietstock ĐÃ chạy sát trần, thêm luồng vô ích.** Đo 6 lượt: trễ trung vị **0,24s**, trần
  `nhipmang` là 0,25s → vòng lặp nối đuôi đã đạt 4,0 lượt/giây. Khác hẳn VNDirect (trễ chập
  chờn 0,6–147s, CPU rảnh 99%) — ở đó luồng mới có tác dụng.
② **Cổng `--tuloc` không bỏ sót gì.** Khối ngoại 1.529 → 335 mã (chỉ mã có khối ngoại giao
  dịch HOẶC có thoả thuận hôm đó — mã còn lại thì bản tách BẰNG ĐÚNG tổng của VNDirect và
  tỉ lệ sở hữu KHÔNG ĐỔI, nên giữ số phiên trước là chính xác chứ không phải xấp xỉ). Tự
  doanh 1.529 → 195 mã (có tự doanh trong 30 phiên gần nhất). Chạy thật: **0 mã báo "không
  có giao dịch loại này", 0 lỗi** ở cả hai — cổng chọn đúng tập.
  **Lượt thứ Hai chạy KHÔNG `--tuloc`** để quét lại trọn rổ, bắt mã lần đầu có số.
③ **Vùng giá VNDirect trùng Vietstock.** Phiên 21/08: HPG 13/13 mức giá, VNM 8/8, SSI 19/19
  — **trùng toàn bộ mức**. Lệch khối lượng +4,51% / +0,06% / −0,01%; phần lệch của HPG là
  nến ATC 14:45, nó dịch chiều cao cột chứ không đổi mức giá nào.
  **MẤT:** khối `cf` (phân bổ dòng tiền theo hướng giá của từng lệnh) — đi kèm miễn phí ở
  endpoint TỪNG LỆNH của Vietstock, VNDirect không có dữ liệu từng lệnh. **Đừng suy từ nến
  1 phút**: trong một phút nhiều lệnh khớp ở nhiều giá, so hai nến liền nhau ra một đại
  lượng KHÁC HẲN mà trông giống — loại số sai không ai phát hiện được.
④ **THOẢ THUẬN THÌ VNDIRECT BỎ SÓT — vẫn phải hỏi Vietstock.** Khớp lệnh hai nguồn khớp
  tuyệt đối (16.939 vs 16.940 tỷ, lệch 0,006%) nhưng thoả thuận lệch **394/3.001 tỷ**, dồn
  vào 7 mã: **VHM 298,9 tỷ ghi thành 0**, HUT 33,2 → 0, HHC 27,1 → 0. **Không phải trễ mà
  là sót** — VHM phiên 20/08 đã chốt hẳn, `ptValue` vẫn 0. Nên có bước `--tt --tuloc` riêng:
  348 mã từng có thoả thuận trong 30 phiên (top 50 mã chiếm **99,8%** giá trị thoả thuận
  toàn thị trường), và nó **CHỈ trộn `pv`/`pval`**, vứt mọi trường khác của lượt trả về —
  bằng không tầng giá Vietstock ghi đè tầng giá VNDirect, mất luật "một cột một nguồn".

### THOẢ THUẬN HỤT 57% SUỐT BỐN NĂM — VÀ CÁCH ĐO ĐỂ BIẾT MÌNH ĐANG HỤT (22/08/2026)

User đối chiếu phiên 05/08/2025: báo chí ghi thanh khoản toàn thị trường **85,8 nghìn tỷ**
còn trang mình ghi **84.371 tỷ**. Soi ra:

```
                khớp lệnh      thoả thuận      tổng
sàn công bố      80.573,8        5.485,7     86.059,4 tỷ
kho (lúc đó)     80.522,7        3.848,3     84.371,0 tỷ
lệch                −51,1       −1.637,4                (0,06%  ·  30%)
```

**Khớp lệnh không sai chỗ nào; toàn bộ chỗ hụt nằm ở thoả thuận** — và không phải một
phiên: 1.317/1.336 phiên hụt quá 100 tỷ, tổng kho chỉ có **43%** thoả thuận thật.

GỐC: `ptValue` TỪNG MÃ của VNDirect **thưa ở phiên cũ**. Phiên 05/08/2025 họ chỉ ghi nhận
thoả thuận cho **28 mã** trên cả ba sàn, trong khi Vietstock có thêm hàng chục mã nữa mà
họ để 0 (MWG 147,0 tỷ · TCB 215,9 · SHB 54,3 · VHM 26,3). Chỗ nào CẢ HAI cùng có thì hai
số **trùng tới từng đồng** — nên đây không phải hai định nghĩa, Vietstock là **tập cha**,
luật gộp là `max`. Phiên gần đây thì VNDirect lại đủ (19–20/08/2026 khớp chỉ số tới 0,0
tỷ), nên bước `--tt` hằng ngày của lượt EOD vẫn đủ; đây là **vá lịch sử một lần**.

**BA CÔNG CỤ MỚI:**

| | |
|---|---|
| `tools/kho_thanhkhoan.py` | thanh khoản CHÍNH THỨC từng sàn từng phiên (2017→nay) -> `data/thanhkhoan.json`. Nguồn `api-finfo.vndirect.com.vn/v4/vnmarket_prices`, tách sẵn `nmValue`/`ptValue`. **Đơn vị ĐỒNG**, chỉ ba chỉ số TỔNG (VN30/HNX30 là tập con, để chung là có ngày ai đó cộng cả năm cái) |
| `tools/soi_thanhkhoan.py` | cộng `mval`/`pval` cả kho rồi đặt cạnh số của sàn. **KHÔNG gọi mạng.** Đây là phép đo đáng chạy sau mọi lượt đụng vào kho giao dịch |
| `tools/kho_thoathuan.py` | vá `pv`/`pval` từ Vietstock, chỉ đụng đúng hai cột đó |

**BỐN CÁI BẪY của `kho_thoathuan.py`:**

1. **`fromDate`/`toDate` CỦA VIETSTOCK LÀ ĐỒ TRANG TRÍ.** `GetStockDeal_ListPriceByTimeFrame`
   **bỏ qua hoàn toàn** hai tham số này và luôn trả về 20 phiên MỚI NHẤT — xin
   `fromDate=toDate=2025-08-05` vẫn nhận về 21/08/2026, mà số nào cũng hợp lý nên nhìn
   không ra. **Tao đã suýt kết luận sai vì cái này**: bảng đối chiếu đầu tiên cho thấy
   "Vietstock có thoả thuận ở 20 mã mà VNDirect để 0" — thật ra là so số của hai NGÀY khác
   nhau. Đường duy nhất về quá khứ là **lật trang và đối chiếu `TradingDate` từng dòng**.
2. **`pageSize` KẸT Ở 20.** Xin 50/100/200/500/1000/2000 đều trả đúng 20. Nên 1.000 phiên
   = 50 lượt/mã, không có cách rút ngắn.
3. **CHỈ GHI `pv`/`pval`** — đọc trọn file, sửa đúng hai mảng, ghi lại (bài học `eod_ghi`).
4. **CHỈ VÁ NGÀY ĐÃ CÓ TRONG `d`** — thêm ngày mới là phải nới MỌI cột cho khớp độ dài.

**HIỆU CHUẨN TRƯỚC KHI CÀO, ĐỪNG CÀO RỒI MỚI KIỂM.** Lấy trang 1 của cả 1.529 mã (20 phiên
gần nhất, 6,5 phút) rồi cộng lại so với chỉ số: Vietstock ra **97,8–100,0%**, **không phiên
nào vượt** -> không có chuyện đếm hai lần. Phép này rẻ và nó là thứ cho phép chạy lượt vá
5 tiếng mà không lo ghi bậy vào cả kho.

**HAI NGUỒN ĐÃ THỬ VÀ LOẠI — đừng dò lại:**
· **CafeF** (`cafef.vn/du-lieu/Ajax/PageNew/DataHistory/PriceHistory.ashx`, `Type=EXPORT`
  trả 66 phiên/lượt trong một file xlsx — đáng lẽ nhanh gấp 5) **THIẾU 71% thoả thuận**:
  phiên 05/08/2025, VIC 11,11 tỷ trong khi thật là 2.833,72 tỷ (106.400 cp vs 25.963.812).
  15 mã mẫu: CafeF 1.242,6 tỷ / Vietstock 4.299,6 tỷ. `StartDate` cũng bị bỏ qua, chỉ
  `EndDate` chạy, và luôn kẹp ~66 phiên.
· **VNDirect** chính là chỗ hỏng.

**KẾT QUẢ** — ba lượt, tổng ~3,2 giờ, 0 lỗi. Mọi mã cuối cùng đều đã lật trọn 1.000 phiên:

| lượt | phạm vi | thêm |
|---|---|---|
| 1 | 1.529 mã, `--bo-som 8` | 43% -> **96,5%** |
| 2 | 541 mã bị bỏ sớm, `--bo-som 0` | -> **97,5%** |
| 3 | 988 mã còn lại, `--bo-som 0` | -> **97,8%** |

```
phiên 05/08/2025:  85.929,6 tỷ  (sàn công bố 86.059,4 · báo chí ghi 85,8 nghìn tỷ)
2024-06 tới nay: 95,5-99,9% mỗi tháng · khớp lệnh giữ nguyên 99,53%
```

> **2,2% CÒN HỤT KHÔNG PHẢI LỖI CÀO — ĐỪNG CHẠY LẠI, KHO ĐÃ CẠN.** Đo 12 mã khớp lệnh lớn
> nhất phiên 2022-12-05 (lùi 925 phiên): kho **khớp Vietstock tới từng đồng, 12/12**. Phần
> hụt nằm ở **mã KHÔNG CÓ trong `data/giaodich`** — 443 mã đã rời sàn (`data/rolichsu.json`)
> cộng ETF. Chữ ký của nó rất rõ ở mấy phiên cũ: khớp lệnh đủ **98–99,5%** trong khi thoả
> thuận chỉ **62–68%** — tức nhóm thiếu góp ~1,5% khớp lệnh nhưng ~35% thoả thuận, đúng hình
> dạng của **lô sang tay khối lượng lớn ở mã sắp huỷ niêm yết** (thoả thuận khổng lồ, khớp
> lệnh gần bằng 0). Muốn đóng nốt thì phải đưa mã đã rời sàn vào kho — việc KHÁC HẲN, và
> kho này vốn là "mã đang niêm yết".

> **`--bo-som N` LÀ THỨ ĐÁNH ĐỔI, PHẢI BIẾT MÌNH ĐANG ĐÁNH ĐỔI GÌ.** Nó bỏ mã sau N trang
> liên tiếp không có đồng thoả thuận nào — phần lớn 825 mã UPCOM không có thoả thuận phiên
> nào suốt bốn năm mà vẫn tốn đủ 50 lượt như VIC. Đổi lại, mã chỉ có thoả thuận ở quãng
> RẤT CŨ thì bị cắt, và đó đúng là 3,5% còn hụt (dồn vào 2022-2023). Chấp nhận được vì
> `soi_thanhkhoan.py` **đo được ngay** phần bỏ sót — bỏ sót bao nhiêu là thấy bấy nhiêu,
> không phải đoán. Muốn đủ 100% thì chạy lại `--bo-som 0`.

> **`--nhip N` NỚI NHỊP CHO ĐÚNG LƯỢT CHẠY ĐÓ, KHÔNG SỬA BẢNG `TRAN`.** Nó ghi vào
> `nhipmang._tran_hien` (chỗ nhịp mạng vẫn dùng để TỰ HẠ tốc khi gặp 429), nên tắt tiến
> trình là hết; pipeline 15:15 vẫn 4 lượt/giây như cũ. Lượt vá này chạy `--nhip 20
> --luong 12` ngoài giờ giao dịch và gọi endpoint JSON ~8 KB, khác hẳn trang hồ sơ ~300 KB
> mà mốc 4 lượt/giây sinh ra để bảo vệ. **Tốc độ THẬT đo được chỉ 8,5 lượt/giây** — nghẽn
> ở độ trễ vòng gọi chứ không ở trần, và 0 lượt 429.
> **ĐỪNG mang con số đó đặt vào `TRAN`, và đừng nới tiếp bằng cách tăng LUỒNG** — user hỏi
> "gấp 30 lần" (=120 lượt/giây); cái giá không phải là chậm mà là **mất nguồn**: Vietstock
> chặn IP là ba bước EOD chết hẳn (thoả thuận · khối ngoại bản tách · tự doanh bản tách),
> VNDirect không có cái nào trong ba cái đó.

### TRANG MỘT MÃ CÓ URL RIÊNG — VÀ BẤM LÙI VỀ ĐÚNG BẢNG PHIÊN (22/08/2026)

User: *"bấm vào 1 mã để phân tích tao muốn có trang riêng, bấm lùi lại là tự ra trang phân
tích data tổng"* — trước đây `PT.ma` chỉ là biến trong module còn `showMod` thì luôn
`replaceState`, nên nút Lùi nhảy thẳng RA KHỎI trang công cụ.

`ptMoMa` nay `pushState`, `ptDongMa` (nút ⟵ trong trang) `history.back()`, và có
`popstate` đọc lại trạng thái **từ URL**. Bốn điểm phải giữ:

1. **MÃ ĐI BẰNG THAM SỐ `?sym=`, TUYỆT ĐỐI KHÔNG PHẢI ĐOẠN ĐƯỜNG DẪN.** `congcu.html`
   KHÔNG có `<base href="/">` (khác `cophieu.html`), nên `/phantich/HPG` biến mọi đường
   dẫn tương đối thành `/phantich/assets/congcu.js` — **cả trang chết**. Đây đúng là cái
   bẫy đã ghi ở mục *Quy ước toàn site*: congcu chỉ an toàn với URL MỘT đoạn.
2. **`showMod` phải GIỮ `?sym=` khi `replaceState`.** Bản cũ ghi đè bằng `PATHOF[id]` trần
   nên vào thẳng `/phantich?sym=HPG` là URL bị gột sạch ngay lúc dựng trang — tải lại hoặc
   gửi link cho người khác là mất mã. Lỗi này có sẵn từ trước, không phải do lượt này.
3. **`tuUrl=true` khi URL do TRÌNH DUYỆT đổi** (popstate, hoặc lượt mở trang đầu tiên).
   Đẩy thêm mục lịch sử ở đó là mỗi cú bấm Lùi lại đẻ một mục mới, người dùng mắc kẹt.
4. **Nút ⟵ trong trang chỉ `history.back()` KHI mục hiện tại do chính mình đẩy vào**
   (`history.state.pt`). Vào thẳng bằng `?sym=` thì không có mục nào để lùi — lùi là rời
   khỏi site — nên khi đó mới `pushState` một mục mới cho bảng phiên.

Đo sau khi sửa: mở mã -> `history.length` 3, Lùi -> bảng phiên, Tới -> lại đúng mã,
`history.length` **vẫn 3** (không phình); nút ⟵ cho cùng kết quả với nút Lùi; vào thẳng
`?sym=VCB` thì URL giữ nguyên và `state=null`.

### VN-INDEX CHỒNG LÊN ĐỒ THỊ GIÁ CỦA TRANG MÃ (22/08/2026)

User: *"bật tắt biểu đồ vnindex trên mã đó để xem hiệu suất của mã đó với vnindex là ntn"*.
Công tắc `VN-Index` cạnh `Vốn hoá`, nhớ ở `localStorage['cpvn_ptvni']`.

**KHÔNG vẽ VN-Index ở thang điểm của chính nó trên một trục thứ ba.** Hai đường tự co giãn
đầy khung thì cả hai đều lấp đầy đồ thị và **nhìn không ra ai hơn ai** — mà "ai hơn ai" là
câu hỏi duy nhất người ta hỏi khi bật nó lên. Cách vẽ:

```
L(i) = giá(i) × (VN-Index tăng bao nhiêu từ đầu khung) ÷ (mã tăng bao nhiêu từ đầu khung)
```

Phiên đầu khung hai đường TRÙNG NHAU, sau đó khoảng cách giữa chúng đúng bằng chênh lệch
hiệu suất — **VN-Index nằm DƯỚI đường giá = mã chạy hơn thị trường**. Vì có nhân với
`giá(i)` nên nó đi qua mọi cú hạ nền của chính mã, hai đường luôn so được bằng mắt.

> **CÁCH NEO ĐÃ ĐỔI 23/08/2026** — nay neo theo TRUNG BÌNH CẢ KHUNG (`neoTrungBinh`), không
> neo một phiên nữa; xem mục *Neo theo trung bình cả khung* bên dưới. Phần "neo vào vốn hoá
> chứ không neo vào giá" thì giữ nguyên. Đoạn dưới đây ghi lại vì sao KHÔNG được lấy
> `c[cuối]/c[đầu]` — luật đó vẫn còn hiệu lực cho `vniTom`.

> **LỢI SUẤT CỦA MÃ PHẢI DỒN TỪ `c/tc−1` TỪNG PHIÊN, ĐỪNG LẤY `c[cuối]/c[đầu]`.**
> `c` trong `data/giaodich` là giá **THÔ, chưa hạ nền** — đo thật: VCB 12/03/2025 rơi
> 96.800 -> 64.700 (chia cổ phiếu), HPG 26/06/2025 rơi 27.200 -> 22.650, VNM 16/10/2025
> rơi 63.650 -> 60.800. Đo trên VCB khung 1.000 phiên: cách đúng ra **+29,9%**, lấy giá
> chia giá ra **−27,5%** — lệch **57 điểm phần trăm**, và cái sai đó trông y hệt một kết
> luận đầu tư. `tc` là tham chiếu ĐÃ hạ nền của chính phiên đó nên tích các `(1+pc)` tự
> sạch mọi sự kiện quyền (đúng luật đã ghi ở `kho_dactrung`). VN-Index không chia tách nên
> lấy điểm chia điểm là đủ.

Hai chi tiết nhỏ mà bỏ là hỏng: **nối vào CUỐI `phai.series`** (ptVe1 lấy `P2[0]` làm
đường NEO cho mốc cổ tức/BCTC — đẩy nó xuống thứ hai là mấy cái chấm bám vào đường
VN-Index), và **màu hồng sen đặc** vì bốn màu kia của đồ thị đã bị chiếm (xanh trời cột
khớp lệnh · tím cột thoả thuận · hổ phách giá TB · xanh lá vốn hoá). *(Kiểu nét đã đổi
23/08/2026 — xem mục **Ba kiểu nét…** bên dưới: vốn hoá nay LIỀN NÉT DÀY, giá TB nét đứt.)*

> **ĐỘ SÂU ĐÃ LÙI VỀ 01/12/2015 (23/08/2026).** Trước đó cột chỉ số của `phantich.json` trống
> 433 phiên đầu vì kho chỉ có từ 24/08/2017; nay `data/chiso.json` sâu tới 2000 nên trục 1.769
> phiên đã đầy (trừ 23–24/01/2018, nguồn nào cũng thiếu). Xem mục *CHỈ SỐ ĐÃ SÂU TỚI 2000*.

Con số đi kèm nằm ở dòng chú thích dưới đồ thị (`từ phiên X: MÃ +a% · VN-Index +b% · chênh
c điểm %`) — nhìn hai đường chỉ biết ai hơn, không biết hơn bao nhiêu. Nó tính trên CẢ
KHUNG nên **đứng yên khi rê chuột**, không đụng luật "thanh đọc số phải cao cố định".

**Ô THỊ TRƯỜNG TRONG THANH ĐỌC SỐ — bật theo cùng công tắc.** User báo tiếp: *"khi bật
vnindex vào tao không thể xem giá vnindex và vol tổng ngày đó khi rà trong đồ thị"* — đúng,
đường vẽ ra rồi mà không có chỗ nào đọc được số của nó. Ô thứ chín hiện `điểm VN-Index ·
% thay đổi · thanh khoản cả thị trường`, chỉ khi `PT.vni` bật (không bật thì nó là số của
THỊ TRƯỜNG đứng lạc giữa tám ô số của MỘT MÃ).
Hai cái bẫy: **dò theo NGÀY chứ đừng dùng chung chỉ số** — trục ngày của `data/phantich.json`
dài hơn và bắt đầu sớm hơn trục của một mã, lệch một ô là hiện số của phiên khác mà nhìn
không ra; và **`PT.tt.tt.mval/pval` tính bằng TỶ** (khác `mval` của kho mã tính bằng ĐỒNG),
đưa qua `ptTien` là sai một tỉ lệ tỷ lần.
Ô thứ chín làm lưới 4 cột thành 3 hàng, thanh dính cao thêm 61px (236 so với 175) — nên
`.ptdw` chuyển sang **5 cột từ 1.080px** (mỗi ô 223px). Nay thanh có **9 ô** thường và
**10 ô** khi bật VN-Index, 5 cột chia đẹp cả hai (5+4 và 5+5) và **bật/tắt VN-Index không
làm đổi chiều cao thanh nữa** — cùng 174,5px.
> Đuôi `cả thị trường` bọc `.ptdq` để khổ hẹp bỏ đi: ở 375px ô chỉ còn ~155px và chuỗi đầy
> đủ bị cắt đuôi đúng vào CON SỐ. Đúng luật đã ghi — *cắt một chữ định tính còn hơn cắt
> một con số*. Đo lại ở 375px: 0 ô bị cắt.

### "FREE FLOAT" ĐỔI TÊN THÀNH "LƯU THÔNG", VÀ CÓ Ô RIÊNG Ở TRANG MÃ (22/08/2026)

User: *"tao chưa biết được là cổ phiếu này đang lưu thông bao nhiêu %, cần thêm mục lưu
thông nữa. đổi free float thành lưu thông"*. Đổi ở **mọi nhãn hiển thị** — ô toàn thị
trường, bảng mã (`Lưu thông` · `Vốn hoá LT`), và bộ mô tả đại lượng (`Vốn hoá lưu thông`,
`Vòng quay lưu thông`). **Tên TRƯỜNG trong kho giữ nguyên** (`ff`, `mcapFF`, `vqf`,
`freeFloat` trong `data/profile`) — đổi tên trường là phải dựng lại kho và sửa mọi chỗ đọc,
mà nó không phải thứ người dùng nhìn thấy.

Ô mới ở thanh đọc số: `Lưu thông 32,2% · 2.281.769.413 cp · 72.218 tỷ` (TCB). Nó **KHÔNG
nằm trong `data/giaodich`** mà nằm ở cột `ff` của FILE PHIÊN (dựng từ `data/profile`) —
đây là tỉ lệ của CẢ MÃ, không đổi theo phiên, nên lấy ở file phiên nào cũng được: ưu tiên
phiên đang ghim (file đó đã phải tải cho đồ thị vùng giá nên **không tốn thêm lượt mạng
nào**), rồi tới phiên của thanh chọn đầu trang, cuối cùng là bất kỳ file nào trong bộ đệm.

> **ĐỨNG THÀNH Ô RIÊNG, đừng nhét vào dòng phụ của ô Vốn hoá.** Dòng đó đã có "số cổ phiếu
> · nước ngoài x%" và bị khoá MỘT DÒNG (`nowrap` + `ellipsis`) — nhét mẩu thứ ba là cắt
> đuôi ngay giữa một con số. Mà nó cũng đáng một ô: TCB vốn hoá 224.280 tỷ nhìn như một mã
> khổng lồ, nhưng phần THỰC SỰ mua bán được mới là thứ quyết định giá chạy hay không.

> **94/1.526 mã nguồn không có số -> ĐỂ TRỐNG**, in "nguồn chưa có tỉ lệ lưu thông". Coi
> chúng là 100% lưu thông thì đúng nhóm KHÔNG BIẾT GÌ lại nhảy lên đầu mọi bảng xếp theo
> tỉ lệ lưu thông.

### HAI MÀN HÌNH TÁCH HẲN NHAU, VÀ NỐI VỚI TRANG CỔ PHIẾU BẰNG LINK (22/08/2026)

User chốt: *"mục data bây giờ chỉ có biểu đồ chính và bảng mã theo phiên … khi nhấn chọn 1
mã sẽ lập tức đưa vào trang phân tích data cổ phiếu … trong trang phân tích data cổ phiếu
sẽ không còn đồ thị toàn thị trường theo phiên nữa"*.

| | mục data (`/phantich`) | trang mã (`/phantich?sym=MÃ`) |
|---|---|---|
| thanh chọn phiên + ô chọn khung | ✓ | — |
| khối *Toàn thị trường* + đồ thị thị trường | ✓ | — |
| bảng mã của phiên | ✓ | — |
| đồ thị + thanh đọc số của mã | — | ✓ |

`ptVe()` nay thoát sớm ở nhánh `PT.ma`: dựng đúng `#ptTab` rồi gọi `ptVeMa()`. Bản cũ dựng
`.ptbar` + `#ptTop` cho cả hai nên mở một mã ra là phải cuộn qua trọn một màn số của thị
trường — mà người vừa bấm vào một mã thì đang hỏi về MÃ ĐÓ.

> **KHÔNG chuyển sang `cophieu.html`** — user chốt sau khi cân ba đường: hai trang không
> dùng chung mạch nào (`cophieu.html` có lõi giá riêng `core.js`, không nạp
> `data/phantich.json`), gộp là chuyển ~900 dòng và phải kiểm lại từ đầu. Nối bằng LINK:
> trang cổ phiếu có `#goData` (`Phân tích dữ liệu →`, thẻ `<a>` viền đứt dạt phải trong
> `#secTabs`), trang mã đã sẵn có `mở trang cổ phiếu →`.
> **Phải là `<a>` chứ không phải `<button>`**: mạch đổi thẻ của `cophieu.html` quét
> `#secTabs button` rồi mở `.sect` theo `data-t` — thêm một nút nữa là nó đi tìm một khối
> nội dung không tồn tại. Khổ hẹp thì bỏ `margin-left:auto` (hàng thẻ lúc đó CUỘN NGANG
> nên không có chỗ trống nào để dạt phải).

### MỖI Ô CHÚ THÍCH LÀ MỘT CÔNG TẮC ẨN/HIỆN (22/08/2026)

User: *"có thể nhấn vào đây để ẩn hoặc hiện các mục tương ứng trong đồ thị"*. Đây đúng chỗ
cần nhất: *"còn lại"* chiếm **81,5%** chiều cao cột nên khối ngoại và tự doanh chỉ là hai
vệt vài pixel. Đo trên SHB — tắt *còn lại* và *thoả thuận* thì trục dọc co theo:

```
khối ngoại   5.817 px  ->  118.729 px
tự doanh     4.029 px  ->   82.100 px
```

Trạng thái lưu ở `localStorage['cpvn_ptan']`, **theo khoá ẨN chứ không theo khoá HIỆN** —
thêm một mảng mới về sau thì nó mặc định hiện, khỏi phải đi sửa bản đệm của người dùng cũ.

> **`ptVe1` PHẢI CHỊU ĐƯỢC VIỆC ẨN HẾT MẢNG CỘT.** Bản cũ `if(!S.length) return;` ngay đầu
> hàm — từ khi có công tắc thì người dùng tắt được cả bốn mảng để chỉ xem mấy đường giá, và
> cả khung trắng trơn, đọc ra như trang hỏng. Nay: còn trục phải thì vẫn vẽ (đo được 68.824
> pixel), và **bỏ số trên trục trái** vì lúc đó nó không đo cái gì — in "0 đ … 1 đ" ở đó là
> bịa ra một thang không tồn tại.

> **`vni2`/`vh2` CỐ Ý KHÁC KHOÁ với `vni`/`vh` của hai nút trên thanh tiêu đề.** Nút kia
> quyết định *có TÍNH đường này không* (vốn hoá cần thêm một trục, VN-Index cần dò
> `data/phantich.json`), ô chú thích chỉ quyết định *có VẼ ra không*. Dùng chung khoá thì
> bấm ở chú thích làm nút cách đó nửa màn hình đổi theo — loại tương tác khó đoán nhất.

### GIÁ QUÁ KHỨ TRÊN TRANG MÃ NAY ĐƯỢC HẠ NỀN (22/08/2026)

User: *"mặc dù giá quá khứ nhưng tôi muốn nó cũng phải hạ nền giống giá hiện tại … hạ nền
chứ không phải 1 nến dump ở chart, điều đó làm sai khá nhiều khi đánh giá data theo chiều
sâu"*, và chốt tiêu chuẩn: *"miễn chính xác với chart hiện tại đang sử dụng trên thị
trường"*. `c` trong `data/giaodich` là giá **THÔ như đã khớp**, nên mỗi đợt chia tách để lại
một VÁCH DỰNG: VIC 04/12/2025 rơi 267.000 -> 142.800, nhìn y như sập 47% trong khi phiên đó
mã **TĂNG 6,97%**.

**HỆ SỐ LẤY THẲNG TỪ `data/hist`:  k(i) = giá đã hạ nền(i) ÷ giá thô(i)**

`data/hist` là chuỗi đã hạ nền của VNDirect — đúng chuỗi mọi trang chart trên thị trường
đang vẽ. Lấy hệ số từ đó thì trang này khớp chart ngoài kia **theo định nghĩa**. `ptNapMa`
nạp nó trong cùng `Promise.all` với `data/giaodich` và `data/sukien`, không nối đuôi.
Đo trên 390 mã: **390/390 khớp ≥99% số phiên, trung vị 100% — cả HOSE, HNX lẫn UPCOM.**

> **ĐÃ THỬ TỰ SUY TỪ `tc` VÀ HỎNG — ĐỪNG LÀM LẠI.** Công thức `k(i) = k(i+1) × tc(i+1)/c(i)`
> đúng về mặt toán và chạy hoàn hảo trên HOSE/HNX (ở đó `tc` đúng bằng giá đóng cửa phiên
> trước — đo được lệch trung vị **0,0000%**, p90 0,000%). Nhưng **`tc` của UPCOM là BÌNH
> QUÂN phiên trước**, lệch mỗi ngày (p90 **0,417%/phiên**) — nhân dồn 1.000 phiên là nổ:
> HHG lệch tới **2.199.570%**. Đo trên 390 mã, cách này chỉ khớp chart ở **176 mã**; chặn
> thêm bằng lịch `data/sukien` + ngưỡng 5% cũng chỉ lên **188**. Đây đúng cái bẫy UPCOM đã
> ghi ở mục *Nến vẽ chart* — chỉ khác là ở đó nó chỉ làm báo nhầm, còn ở đây nó phá cả chuỗi.

> **BA CHỖ TUYỆT ĐỐI KHÔNG ĐƯỢC HẠ NỀN:**
> ① **VỐN HOÁ** — `mcap = giá THÔ × số cổ phiếu CỦA CHÍNH PHIÊN ĐÓ`. Hạ nền giá mà giữ số
>    cổ phiếu là chia đôi vốn hoá, đúng con bệnh mục dưới vừa chữa. Vì thế khối hạ nền đặt
>    **SAU** `mcap` và `pcs` trong `ptVeMa` — **đừng dời lên trên**. Kiểm VIC 04/12/2025:
>    bật/tắt hạ nền thì đóng cửa đổi 133.500 ↔ 267.000 mà vốn hoá **giữ nguyên 1.028.755 tỷ**.
> ② **`pcs`** — miễn nhiễm (tử và mẫu cùng nhân một hệ số) nhưng vẫn tính trước cho khỏi
>    phải nghĩ lại. Đo được −0,89% ở cả hai chế độ.
> ③ **VÙNG GIÁ** (`data/phien`) là giá thô của đúng một phiên; bật lại đồ thị đó thì phải
>    nhân cùng hệ số, bằng không hai đồ thị cạnh nhau ở hai nền khác nhau.

> **CHUẨN HOÁ VỀ PHIÊN CUỐI = 1.** Kho nến có thể chưa kịp phiên hôm nay (lượt EOD ghi hai
> kho ở hai bước khác nhau); chuẩn hoá thì giá hôm nay LUÔN đúng bằng giá đã khớp, còn mọi
> tỉ lệ quá khứ giữ nguyên.

> **KHO VẪN LƯU GIÁ THÔ, hạ nền tính tại chỗ lúc vẽ** (user chốt: *"lưu giá thô thì kết hợp
> với dữ kiện để hạ nền thôi"*). Giá thô là dữ kiện gốc không dựng lại được, còn hệ số thì
> lúc nào cũng suy ra được. Ghi đè giá đã hạ nền vào kho thì đợt chia tách kế tiếp là phải
> cào lại toàn bộ, và vốn hoá mất luôn cơ sở tính.

**CÔNG TẮC `Giá điều chỉnh` ĐÃ BỎ 23/08/2026 — hạ nền nay LUÔN BẬT.** User chốt: *"biểu đồ
giá mặc định là biểu đồ giá đã điều chỉnh nền, ô chọn giá đã điều chỉnh cũng nên biến mất
đi"*. Cờ `PT.dc` và khoá `localStorage['cpvn_ptdc']` **gỡ luôn chứ đừng để lại**: gỡ nút mà
giữ cờ thì ai từng TẮT nó sẽ mắc kẹt vĩnh viễn ở giá thô và không còn chỗ nào bật lại.
Kiểm sau khi gỡ — VIC 04/12/2025 hiện **133.500** trong khi kho ghi giá thô 267.000.

### VỐN HOÁ SAI 4% VÌ SỐ CỔ PHIẾU NHẢY BẬC MUỘN HƠN NGÀY GDKHQ (22/08/2026)

User: *"tổng vốn hoá toàn thị trường đang có vẻ sai"* — đúng. Đối chiếu với chính VNDirect
(`ratios/latest`, vốn hoá của cả 1.528 mã): họ **10.311.473 tỷ**, kho **9.895.019 tỷ**,
hụt **416.454 tỷ = 4,0%**.

**GỐC — và đây là luật CHÍNH TAO viết sáng cùng ngày, đúng ở mọi chỗ trừ chỗ này.**
`gop_sh` lấy kỳ mới nhất có `reportDate <= ngày phiên`, để khỏi gán số của quý chưa tới cho
hôm nay. Nhưng doanh nghiệp phát hành **giữa quý**, mà VNDirect ghi số mới dưới `reportDate`
**cuối quý ấy** — trong khi nguồn **hạ nền giá NGAY** ngày GDKHQ. Kết quả: mọi phiên từ ngày
GDKHQ tới hết quý mang **giá đã chia** nhân **số cổ phiếu chưa chia**.

Ca user chỉ ra, VIC — sạch tới mức dùng làm ví dụ mẫu:

```
05/12/2025  thưởng cổ phiếu 1:1, ngày GDKHQ  ->  giá hạ nền ngay
31/12/2025  `ratios` mới ghi 3,853 tỷ -> 7,706 tỷ cp
10/12/2025  kho ghi 573.329 tỷ · sự thật ~1.147.000 tỷ   (sai đúng MỘT NỬA)
```

Đo toàn kho: **399 mã · 20.863 ô phiên** sai kiểu này.

**`tools/va_slcp_gdkhq.py` — CHỈ DỜI NGÀY, KHÔNG TỰ CHẾ CON SỐ.** Hai giá trị trước/sau đã
có sẵn (nguồn cho); thứ duy nhất sai là chỗ đặt bậc thang, và `data/sukien` có ngày GDKHQ
chính xác. Tỉ lệ chia **chỉ dùng để đối chiếu** xem có đúng đợt đó không.
Ba cái bẫy đã xử: ① `quyenmua`/`phathanh` thì tỉ lệ chỉ là mức TỐI ĐA (không phải ai cũng
nộp tiền) nên chỉ lấy NGÀY · ② một quý có nhiều đợt thì chia bậc theo thứ tự rồi **ép giá
trị cuối bằng đúng số nguồn cho** · ③ bậc nhảy không có sự kiện nào giải thích thì **để
nguyên** (phát hành riêng lẻ không có ngày GDKHQ, và `ratios` cũng có ô rác).

**PHẦN HAI — ĐỢT VỪA PHÁT HÀNH, KHO KHÔNG CÓ BẬC NÀO ĐỂ DỜI.** Số mới nhất nằm ở kỳ TƯƠNG
LAI (VHM: `reportDate 2026-09-30`) nên `gop_sh` lọc bỏ, kho không có bậc. Phải hỏi
`ratios/latest` (không kẹp theo ngày phiên) rồi áp **từ ngày GDKHQ của đợt gần nhất** —
đừng áp từ hôm nay, làm vậy là để lại đúng cái cửa sổ sai mà cả file này sinh ra để xoá.

Kết quả: **9.892.264 -> 10.299.132 tỷ**, lệch VNDirect còn **−0,12%** (trước −4,0%).
Bước `[1b]` của lượt EOD, ngay sau `kho_vnd_lo`.

> **PHIÊN THIẾU SỐ CỔ PHIẾU THÌ ĐỂ TRỐNG VỐN HOÁ.** `ratios` chỉ sâu 16 quý (kỳ cũ nhất
> 2022-12-31) nên **108 phiên trước 03/01/2023 chỉ có 1-2 mã** có SLCP. Cộng lên vẫn ra một
> con số trông bình thường — 2022-09-05 ra **265.616 tỷ** trong khi sự thật ~5,9 triệu tỷ —
> và đồ thị vẽ liền mạch qua đó thành "thị trường tăng 37 lần trong 4 năm". Đây đúng loại
> sai nguy hiểm nhất của dự án: không ô nào trống, không số nào vô lý, chỉ là sai.
> `build_phantich` nay để `mcap = null` khi dưới **80%** số mã có SLCP (phiên lành luôn
> trên 99% nên ngưỡng này cách xa mọi phiên thật), và ô "Vốn hoá thị trường" in `—` kèm câu
> *"kho chưa có số cổ phiếu cho phiên này — chỉ 2/1.452 mã có số"*. Cùng luật với cột xám
> "phiên kho chưa cào đủ mã".

### ĐƯỜNG "VN-INDEX" TRÊN ĐỒ THỊ MÃ ĐÃ ĐỔI TÊN THÀNH "VN-INDEX QUY ĐỔI" (22/08/2026)

User: *"sao vnindex 1732 lại có đồ thị hiển thị thấp hơn 1636, lại sai rành rành"*. **Không
có lỗi tính — lỗi ĐẶT TÊN, và là lỗi của tao.** Đường đó là
`giá(i) × (VN-Index tăng) ÷ (mã tăng)` = **giá của mã SẼ Ở ĐÂU nếu chạy đúng bằng thị
trường**, nên nó tụt theo mọi cú hạ nền của chính mã, y như đường giá:

```
MBB   10/08/2026  giá thô 24.250  đường 16.731
      11/08/2026  giá thô 20.350  đường 13.911   <- MBB chia cổ phiếu
```

Nhờ đi cùng nhau như vậy thì **khoảng cách** giữa hai đường mới luôn đúng bằng chênh lệch
hiệu suất — đó là lý do duy nhất đường này có mặt. Nhưng gọi nó là "VN-Index" trong khi ô
đọc số ngay trên ghi "VN-Index 1.732,02" thì đọc ra là mâu thuẫn.

**RỒI USER CHỈ RA CÁI SÂU HƠN, VÀ NÓ GỠ ĐƯỢC CẢ CÁI KHÓ:** *"giá có thể tụt do nền tụt
nhưng VỐN HOÁ thì không hề tụt — VN-Index phụ thuộc vào vốn hoá chứ đâu phụ thuộc vào những
lúc sụt nền"*. Đúng. Neo đường vào **vốn hoá** thay vì giá thì thành phần
`mcap(i)/mcapTỉLệ(i)` triệt tiêu, còn lại đúng:

```
L(i) = vốn hoá(z0) × VN-Index(i) / VN-Index(z0)
```

Một đường **chỉ đi theo VN-Index**, không còn dính cú hạ nền nào — đúng thứ trực giác đòi.
Và vốn hoá của mã cũng liền mạch qua ngày GDKHQ (giá chia đôi thì số cổ phiếu nhân đôi),
nên hai đường so được trực tiếp. Đường nay đứng CHUNG TRỤC với vốn hoá (cùng đơn vị tiền),
trục phải chỉ còn giá.

> **PHÉP SO NÀY CHỈ ĐÚNG KHI `sh` NHẢY BẬC ĐÚNG NGÀY GDKHQ** — tức phụ thuộc thẳng vào
> `tools/va_slcp_gdkhq.py` ở mục trên. Không có nó thì chính đường vốn hoá mới là đường bị
> sụt ở ngày GDKHQ, và cả phép so hỏng. Hai việc này là một.

> **HAI PHÉP SO KHÁC NHAU, PHẢI TÁCH RA TRONG CHÚ THÍCH.** Đường trên đồ thị so **vốn hoá**
> với VN-Index. Nhưng vốn hoá còn đổi theo **phát hành thêm** nên nó KHÔNG phải cái người
> cầm cổ phiếu lãi được — số đó là lợi suất dồn từ `c/tc−1`. Đo VIC từ 03/01/2023: vốn hoá
> +629,2% · lợi suất +621,8% (gần nhau vì VIC ít pha loãng). MBB 100 phiên thì ngược:
> vốn hoá −9,5% mà lợi suất −1,8%, vì giá đã bị cắt cho cả cổ tức 15% LẪN quyền mua 10%
> trong khi cổ phiếu của đợt quyền mua chưa về — vốn hoá tụt tạm rồi sẽ hồi. Gộp hai con số
> làm một là nói sai một trong hai.

### RÒNG LUỸ KẾ THEO KHỐI — VÀ HAI THỨ TƯỞNG THIẾU DỮ LIỆU NHƯNG KHÔNG (22/08/2026)

User: *"tôi có thể tính sum từ vol buy sell ròng … vấn đề nằm ở chỗ chúng ta chưa phân
tích được thoả thuận ở đây thực chất là buy hay sell, khối lượng của còn lại cũng chưa có
phân tách rõ là buy hay sell ròng"*. Cả hai đều **không phải dữ liệu phải đi cào**:

1. **Thoả thuận đã nằm sẵn trong số.** `fnMuaTKL`/`fnBanTKL` là TỔNG (khớp lệnh + thoả
   thuận) nên một lô sang tay của khối ngoại đã được tính. Thứ không tách được sâu quá
   ~250 phiên chỉ là *bao nhiêu phần của số ròng đi qua thoả thuận*, không phải số ròng.
2. **"Còn lại" là ĐẲNG THỨC KẾ TOÁN.** Mỗi cổ phiếu có người mua thì phải có người bán:
   `khối ngoại + tự doanh + còn lại = 0` ở MỌI phiên -> `còn lại = −(hai cái trên)`, không
   sai số. Kiểm trên SHB: tổng ba vế ra đúng 0.
3. **KHÔNG CÓ "THOẢ THUẬN RÒNG".** Thoả thuận là **cái chợ, không phải một bên** — mỗi lô
   cũng có người mua và người bán, ròng luôn bằng 0. Câu hỏi được phép là *"trong số ròng
   của KHỐI NGOẠI, bao nhiêu đi qua thoả thuận"* = `fnMuaTTKL − fnBanTTKL`, chỉ sâu ~250
   phiên nên đoạn chưa có phải để `null` (vẽ 0 là bịa ra một quãng "không sang tay gì").

**ĐỘ PHỦ ĐÃ ĐO, ĐỦ ĐỂ LÀM CHO CẢ RỔ.** Top 500 thanh khoản: khối ngoại **500/500 mã phủ
≥95%** (trung vị 100%), 480/500 đủ 1.000 phiên. Tự doanh trung vị chỉ 3,8% — **nhưng đó
không phải thiếu dữ liệu**: soi 185.676 ô thì ô nào nguồn có trả cũng >0 (22.845 ô) và chỉ
199 ô bằng 0, tức nguồn KHÔNG trả dòng nghĩa là mã đó phiên đó **không có tự doanh**. Coi
trống = 0 khi cộng ròng là ĐÚNG.

> **ĐỐI CHIẾU BẰNG NGUỒN ĐỘC LẬP TRƯỚC KHI TIN.** `data/hist` có `fb`/`fs` cào qua
> `v4/foreigns` — đường khác hẳn `stock_prices`. Cộng dồn 1.000 phiên:
> SHB −85.477.163 vs −85.477.183 · VHM −817.527.517 vs −817.527.507 · FPT · HPG · VRE —
> **lệch 0,00%** cả năm mã. Đơn vị cũng kiểm: 983/984 phiên có `giá trị ÷ khối lượng` rơi
> trong 0,5×–2× giá đóng cửa.

**TÍNH BẰNG CỔ PHIẾU, KHÔNG BẰNG TIỀN.** Luỹ kế theo tiền là cộng số của bốn năm giá khác
nhau — ra một đại lượng không có nghĩa. Cổ phiếu thì cộng được, và chia cho SLCP ra ngay
"đã sang tay bao nhiêu phần trăm công ty". Đơn vị **triệu cp khai ở TIÊU ĐỀ** đồ thị, cùng
lối `ptVeChart` khai "tỷ đồng" một lần ở góc — không dán hậu tố vào từng con số.

**TỔNG CẢ KHUNG ĐỨNG TRƯỚC GIÁ TRỊ TẠI PHIÊN.** Bản đầu chỉ in "tại phiên X" và user hỏi
ngay *"tao muốn xem tổng 100 phiên ròng của các khối thì làm ntn"* — đường cộng dồn bắt đầu
từ 0 ở phiên đầu khung nên **giá trị ở phiên cuối CHÍNH LÀ tổng cả khung**, chỉ là không ai
đọc ra điều đó từ một dòng ghi "tại phiên". Đổi khung 100/300/600/1.000 là đổi luôn kỳ cộng.
SHB: 100 phiên −29,6 triệu cp (−0,61% SLCP) · 1.000 phiên −85,5 (−1,75%).

Kèm hai thứ nhỏ trong `ptVe1`: nhánh `kieu:'line'` nay nhận **nét đứt riêng từng chuỗi**
(ba đường chỉ khác màu thì người mù màu và ảnh đen trắng không tách được) và vẽ **đường 0**
khi có giá trị âm — với "ròng luỹ kế" thì trên hay dưới mốc 0 đúng là câu hỏi duy nhất.

### THỨ TỰ MƯỜI Ô CỦA THANH ĐỌC SỐ — NHÓM PHẢI GIỮ Ở CẢ 5 CỘT LẪN 3 CỘT (22/08/2026)

User: *"khối ngoại · tự doanh · thoả thuận chung 1 hàng, nhìn 1 cái thấy ngay"*. Ba ô đó
phải nằm ở **vị trí 7-8-9** — chỗ DUY NHẤT chúng ở chung hàng ở cả hai khổ lưới:

```
5 cột (≥1080px)   hàng 1  đóng cửa · giá TB · biên độ · giá trị khớp lệnh · vốn hoá
                  hàng 2  lưu thông · KHỐI NGOẠI · TỰ DOANH · THOẢ THUẬN · VN-Index
3 cột (≥700px)    hàng 1 GIÁ · hàng 2 QUY MÔ · hàng 3 DÒNG TIỀN · hàng 4 thị trường
```

Đặt ở 6-7-8 thì khổ 3 cột **cắt đôi nhóm** (ô 6 kết hàng 2, ô 7-8 mở hàng 3). Khổ 2 cột
(điện thoại) không nhóm nào giữ nguyên được — chấp nhận.

> Mười ô nay khai thành **một danh sách thứ tự** ở đầu khối thay vì nối chuỗi thẳng: mỗi ô
> mang theo mấy chục dòng chú thích, xê dịch bằng cắt dán là kiểu sửa dễ làm rơi mất một ô
> mà không ai thấy. Đổi thứ tự trong danh sách là đổi luôn trên màn hình — `.ptdw` xếp
> theo thứ tự DOM.

### CỘT KHỚP LỆNH CỦA TRANG MÃ TÁCH MÀU THEO KHỐI (22/08/2026)

User: *"trên đồ thị của mã vẫn chưa đánh dấu màu sắc cho tự doanh và khối ngoại"*. Đồ thị
toàn thị trường tô như vậy từ lâu, đồ thị của mã thì vẫn một khối xanh trơn — cùng một câu
hỏi mà hai trang trả lời hai kiểu.

Công thức **sao y `ptVeChart`**: phần tô = `(mua + bán) ÷ 2 ÷ TỔNG giao dịch × chiều cao
cột`. Chia đôi vì mỗi lệnh khớp có đúng một người mua và một người bán. Mẫu là TỔNG vì
`fnMuaTG`/`tdMuaTG` GỒM thoả thuận. Thứ tự chồng và bảng màu cũng dùng chung
(`--pkN` khối ngoại · `--pkT` tự doanh · `--pkR` còn lại) — sửa một chỗ phải sửa cả ba
(`congcu.html`, `ptVeChart`, `ptVeMa`).

> **KHÁC MỘT ĐIỂM SO VỚI BẢN THỊ TRƯỜNG, VÀ PHẢI KHÁC.** Ở đây nếu `fn + td > mval` thì
> **co CẢ HAI theo tỉ lệ**, chứ không chỉ kẹp phần "còn lại" về 0 như bản thị trường. Bản
> kia là số gộp cả nghìn mã nên chuyện đó gần như không xảy ra; ở một mã lẻ thì có thật
> (mã khối ngoại chiếm gần hết phiên, cộng nhiễu nguồn) — mà chỉ kẹp "còn lại" thì **cột
> cao hơn `mval`**, tức chiều cao cột thôi bằng giá trị khớp lệnh và mọi nhãn trục đọc ra
> sai. Co lại thì ba mảng luôn cộng đúng bằng `mval`.

Kiểm bằng cách đếm PIXEL trên canvas rồi so với số tính lại bằng Python — SHB 100 phiên:
khối ngoại 2,3% · tự doanh 1,6% · còn lại 81,5% · thoả thuận 14,6%, khớp tỉ lệ diện tích
đo được trên canvas. **Đọc `getImageData` thì nhớ mảng "còn lại" có alpha 0,30** nên lọc
`alpha > 200` sẽ bỏ sót đúng cái mảng lớn nhất — suýt kết luận nhầm là nó không được vẽ.

### CÔNG TẮC CỦA MỘT ĐỒ THỊ ĐỨNG Ở THANH TIÊU ĐỀ CỦA CHÍNH NÓ (22/08/2026)

User: *"các mục chọn bật tắt để vị trí khác thoáng và dễ nhìn hơn, để ở góc này khá rối
mắt vì nhiều chữ"*. Bốn cái nút đứng lọt giữa một khối chữ dày (chú thích màu + chú thích
mốc + dòng hiệu suất) thì mắt không tách được đâu là thứ **bấm được**, đâu là thứ chỉ để
đọc. `ptO` nay nhận tham số thứ năm `nut`, render vào `.ph` với `margin-left:auto`.

> **KHÔNG mâu thuẫn với luật cũ** *"công tắc đặt ngay dưới đồ thị nó điều khiển, đừng nhét
> lên thanh đầu trang"*: thanh bị cấm là `.ptmahead` của CẢ TRANG (đã có nút quay lại, tên
> mã, ô chọn khung, link sang trang cổ phiếu). Thanh tiêu đề của chính cái đồ thị vẫn là
> "ngay tại đồ thị nó điều khiển", mà lại đang trống hơn nửa bề ngang.

Chú thích cũng chia lại theo LOẠI KÝ HIỆU, mỗi loại một dòng có nhãn `cột` / `đường` /
`mốc` (`.ptlgn`, bề rộng cố định để ba dòng thẳng cột). Ba loại ký hiệu khác hẳn nhau — ô
vuông đặc là mảng cột, vạch ngang là đường, chấm tròn có chữ là mốc — đổ chung một dòng
chảy tràn thì không có chỗ nào cho mắt bám.

Đo lại sau cả ba thay đổi, ~600 vị trí rê × 4 khung: `#ptDoc` **một giá trị duy nhất
174,5px**, thanh tiêu đề 50px, chú thích 54px, 0 dòng phụ bị cắt. Màn 375px: không tràn
ngang, cả 4 nút vẫn hiện (tiêu đề xuống 2 hàng, 90px).

### ĐỒ THỊ GIÁ + GIÁ TRỊ GIAO DỊCH CAO THEO BỀ NGANG (22/08/2026)

User: *"đưa Giá và giá trị giao dịch mỗi phiên rộng hơn, bảng hiện tại đang khá nhỏ"*.
Nó đã chiếm trọn bề ngang lưới rồi (`ptbig` = `grid-column:1/-1`, 1.197px ở cửa sổ 1.280),
nên chỗ duy nhất còn nới được là **chiều cao**: `max(300, min(560, W×0,40))` — 300 cứng cho
một khung 1.197px là tỉ lệ 4:1, dẹt tới mức ở khung 1.000 phiên thì cột tiền còn vài pixel
và bốn đường (đóng cửa · giá TB · vốn hoá · VN-Index) chồng thành một dải. Desktop 300 ->
**479px**; màn hẹp giữ nguyên 300 vì ở đó bề ngang chỉ 329px, nhân theo tỉ lệ là ra một ô
gần vuông cao hơn cả bảng đọc số ngay dưới.
Đo bằng `clientWidth` của chính canvas chứ đừng đọc `innerWidth`: khung vẽ nằm trong lưới
có padding và `main` bị kẹp `max-width:1420px`, hai số lệch nhau ~80px.

### DƯ CHẤN CỦA LỖI `eod_ghi`: 360 MÃ MẤT 970 PHIÊN — VÀ VÌ SAO KHÔI PHỤC 30 PHIÊN LÀ CHƯA ĐỦ

User báo: *"khối lượng khối ngoại, tự doanh, thoả thuận đang sai từ tháng 7 về trước"*.
Đúng, và gốc là chuỗi ba bước của chính lượt sửa hôm nay:

1. lượt `--nn`/`--td` đầu tiên chạy khi `eod_ghi` CÒN LỖI → xoá sạch cột VNDirect của 530 mã
2. tao vá `eod_ghi`, rồi chạy `kho_vnd_lo --sau 30` để khôi phục
3. nhưng `--sau 30` chỉ đắp lại **30 phiên cuối** — 970 phiên còn lại vẫn trống

Đo: **360 mã** còn ≤40 phiên có `fnMuaTG`; HPG từ **1.000 → 30 ô**. Trên đồ thị trang mã,
mọi cột khối ngoại/tự doanh trước tháng 7 biến mất — đúng thứ user nhìn thấy.

Khôi phục bằng `kho_vnd_lo.py --sau 1000` (153 lô × 4 tầng, **10,2 phút**) rồi `--tt --tuloc`
đắp lại thoả thuận của Vietstock. Sau đó: **1.504 mã ≥200 phiên**, HPG đủ 1.000/1.000.

> **LUẬT: SAU MỘT LỖI XOÁ DỮ LIỆU, PHẢI KHÔI PHỤC ĐÚNG ĐỘ SÂU CŨ RỒI ĐO LẠI — không phải
> chạy công cụ một lượt là xong.** Lượt khôi phục 30 phiên trông "thành công" ở mọi log
> (`fn:ok 1529`) trong khi 97% dữ liệu vẫn mất. Phép đo đúng là **so độ sâu với bản trước
> khi hỏng** (`git show <commit>:file`), không phải đếm số mã chạy trót lọt.

### `% GIAO DỊCH LÀ CỦA KHỐI NGOẠI` — QUÁ 100% THÌ ĐỂ TRỐNG

Khối ngoại là một PHẦN của giao dịch phiên nên tỉ lệ không thể vượt 100 theo định nghĩa.
Nhưng `fnMuaTG` của VNDirect **gồm** thoả thuận trong khi `pval` của chính họ **bỏ sót**
thoả thuận ở phiên cũ (Vietstock chỉ với tới ~250 phiên) — mẫu hụt thì tỉ lệ vọt.

Đo toàn kho: **874/978.749 ô (0,09%)** vượt 100%, cao nhất **29.942.630%** —
PHS 18/09/2025 khớp đúng **5 cổ phiếu = 55.000đ** trong khi khối ngoại bán **32,9 tỷ** qua
thoả thuận. Một cột như thế trên đồ thị đọc ra như cả trang hỏng.

Chặn ở **hai nơi cùng tính đại lượng này**, thiếu một chỗ là hai bề mặt lệch nhau:
`fnPc` trong `assets/congcu.js` (đồ thị `mc5` + thanh đọc số) và `fnp` trong
`tools/kho_dactrung.py` (bộ lọc). Kho đặc trưng đồng thời được sửa **mẫu số**: trước chia
riêng `mval`, nay chia `mval + pval`.

### `shVa` / `shLa` THÔI GHI RA FILE (22/08/2026)

`tools/gon_kho.py` xoá hai trường này từ lâu, mà `eod_ghi` vẫn dựng lại mỗi lượt — xoá rồi
ghi rồi xoá, một vòng lặp vô nghĩa. Đo sau lượt khôi phục sâu: **347 mã** có `shVa` sống lại,
**188 mã** có `shLa`. Grep cả kho: **không dòng nào đọc chúng**.

`shLa` còn là một quả mìn: nó là danh sách ≤20 bậc lạ (`[[ngày, tỉ lệ], …]`) chứ **KHÔNG
phải cột theo phiên**, nên mọi hàm gom "field kiểu list" thành cột đều phải đặc cách cho nó
— đã phải thêm guard ở cả `eod_ghi` lẫn `kho_vnd_lo`. Không ghi ra là hết chuyện.

### SỐ CỔ PHIẾU CỦA `universe.json` NAY LẤY VNDIRECT, KHÔNG LẤY SIMPLIZE (22/08/2026)

`shares`/`mcap` trước lấy của Simplize ở bước 1, mà bước đó **chỉ hỏi lại mã nào THIẾU**
`sector` hoặc `shares` — nên mã đã có số thì **đóng băng vĩnh viễn**. Hậu quả: **298/1.518
mã** có vốn hoá trên bảng giá lệch quá 5% so với `sh × giá` của trang phân tích.
**HAC hiện 266 tỷ ở bảng giá trong khi thật là 1.176 tỷ** — cùng một mã, hai con số.

**PHÂN XỬ BẰNG NGUỒN THỨ BA TRƯỚC KHI ĐỔI.** `shR` của Vietstock (= vốn hoá ÷ giá) trên 99
mã có đủ ba nguồn: **VNDirect đúng 78, Simplize đúng 21**. Soi tiếp 21 ca ngược thì
**19/21 là VNDirect NHỎ HƠN 5-10%** — đó là chênh lệch **cổ phiếu quỹ** (lưu hành vs niêm
yết) chứ không phải sai, và với vốn hoá thì "đang lưu hành" mới đúng. Còn 78 ca kia lệch
×3-×4,4: tăng vốn thật mà Simplize chưa cập nhật.

Bước 4 của `refresh_daily` nay đọc `sh` từ `data/giaodich` (do `kho_vnd_lo` dựng ngay trước
đó trong lượt EOD) và ghi đè `shares` + `mcap`. Mã nào kho không có thì giữ số Simplize.
Đã áp một lượt lên `universe.json` hiện tại: **160 mã đổi**, và phép đối chiếu
`universe.mcap` vs `sh × c` đi từ **298 mã lệch xuống 0**.

> Blast radius đã dựng lại theo: `data/screen.json`, `data/market.json`, `data/fund.json`
> (đường đua + bộ lọc) và `data/tapdoan.json`. Cả hai công cụ đó **không gọi mạng**.

### SOI TOÀN KHO SAU KHI TRỘN NGUỒN — HAI LỖI TỰ GÂY, BỐN LỖI CÓ SẴN (22/08/2026)

User lo đúng chỗ: *"hành vi trộn data xong lại xoá hết data của Vietstock dễ tạo ra nhiều
lỗi không mong muốn"*. Soi 1.529 mã bằng 13 phép kiểm bất biến, rồi **so từng ca với bản
kho lúc 10:55** (trước mọi thay đổi trong ngày) để tách lỗi MỚI khỏi lỗi CÓ SẴN.

**HAI LỖI TỰ GÂY RA HÔM NAY — đã vá:**

① **`va_donvi` bị xếp SAI CHỖ trong lượt EOD mới.** Bản đầu đặt nó ở [3], ngay sau
  `kho_vnd_lo`; nhưng ba bước Vietstock (`--tt` `--nn` `--td`) nằm SAU và **ghi đè lại số
  thô** — mà số thô mới là thứ mang lỗi đơn vị ×1000. Thứ tự CŨ vốn đúng (Vietstock →
  kho_vnd → va_donvi). Đo được: BVB 2025-09-09 `tdMuaGT` từ 302 TRIỆU (đúng) thành 302 TỶ;
  kiểm chứng độc lập 20.000 cp × 15.300đ = 306 triệu. 13 ô dính, nay 0.
  > **BẪY LÀM NÓ KHÓ THẤY:** trang 1 của `--td`/`--nn` là **30 DÒNG chứ không phải 30
  > PHIÊN**. Mã giao dịch thưa thì 30 dòng đó trải từ 2025-09-09 tới 2026-07-31 — tức lượt
  > "chỉ lấy phiên gần nhất" vẫn với tay về gần một năm trước và ghi đè lên đó.
  **LUẬT: mọi bước VÁ phải đứng sau MỌI bước CÀO của nguồn nó vá.**

② **`kho_vnd_lo` nhận bừa gai nhọn của `ratios`.** VNDirect trả OUTSTANDING_SHARES =
  34.168.189.983 cho BKG ở kỳ 2024-06-30, trong khi số thật 71.609.020 — **sai gấp 477
  lần**, và nó ngồi thẳng trong đồ thị vốn hoá. 9 mã dính. Ba lớp lọc, mỗi lớp bắt một
  hình dạng khác nhau (một lớp thôi là không đủ, đã thử):
  · **gai nhọn một kỳ** — lớn hơn 5 lần CẢ HAI hàng xóm (BKG).
  · **gai nhọn NHIỀU KỲ** — lớn hơn 5 lần giá trị MỚI NHẤT. DPC (2,2 → 22,4 → về 2,2 triệu)
    và HOT (8,0 → 80 → về 8,0 triệu) kéo dài hai kỳ nên lọt lớp trên. Số cổ phiếu chỉ đi
    LÊN; một kỳ quá khứ gấp 5 lần kỳ mới nhất là rác chứ không phải sự kiện.
  · **quét cuối trên CỘT ĐÃ GHI** — ô nằm trước kỳ báo cáo cũ nhất của `ratios` thì không
    có gì đè lên nên rác cũ ở lại. PEG dính: đầu chuỗi 2,32 TỶ cp so với 233 triệu ở cuối.
  **Và `sh` phải ĐÈ chứ không chỉ lấp trống** — bằng không một ô rác ghi vào rồi thì mọi bộ
  lọc thêm sau đều vô dụng, chạy lại công cụ cũng không sửa được.
  **Kèm đảo thứ tự ưu tiên trong `eod_ghi`:** `sh` đang có trong kho THẮNG, `neo_slcp` chỉ
  còn lấp chỗ trống (trước là ngược lại — xem mục `neo_slcp` phía trên).
  Sau ba lớp: 9 → **4 mã**, và cả bốn (F88, HKT, VES, VUA) đã đối chiếu `universe.json` xác
  nhận là **tăng vốn THẬT** — tăng rồi ở lại, khác hẳn hình dạng gai nhọn.

**BỐN LOẠI CÓ SẴN TỪ TRƯỚC — không phải do trộn nguồn, đã so với bản 10:55:**

| phép kiểm | số ô | ví dụ | bản chất |
|---|---|---|---|
| `o` ngoài `[l,h]` | 223 | ABR 2022-09-13 `o=12800` trong `[12000,12000]` | nguồn ghi giá mở cửa của phiên khác |
| giá nhảy bậc giữa chuỗi | 5+7 | SVC 107.000 → 57.200 · DNN 200 → 300 | sự kiện quyền nguồn không hạ nền |
| khối ngoại mua > tổng giao dịch | 76 | dồn gần hết vào **một ngày 2024-03-04** | nguồn hỏng đúng ngày đó |
| sở hữu nước ngoài > 100% | 2 | F88 115,53% | nguồn sai |

Chưa vá vì đều là lỗi NGUỒN chứ không phải lỗi trộn, số lượng nhỏ, và mỗi loại cần một
phép đối chiếu riêng. Ghi ra đây để đừng ai tưởng kho sạch tuyệt đối.

> **Bộ soi để ở đâu:** phép kiểm nằm trong lịch sử phiên làm việc, không commit thành công
> cụ — nhưng 13 bất biến thì đáng dựng lại khi cần: độ dài cột == `len(d)` · ngày tăng dần
> không trùng · `o`/`c` trong `[l,h]` · `|c/tc−1| < 45%` · `mval/mv` trong tầm giá ·
> Vietstock(khớp) ≤ VNDirect(tổng) · Vietstock(khớp+TT) ≈ VNDirect(tổng) · khối ngoại ≤
> tổng giao dịch · sở hữu trong `[0,100]` · SLCP trong tầm và không nhảy quá 5 lần.

### `eod_ghi` TỪNG XOÁ SẠCH CỘT NÓ KHÔNG BIẾT — đã vá 22/08/2026

Hàm này đọc file cũ và ghi lại **đúng danh sách `COT`**, nên mọi cột ngoài danh sách bị
**XOÁ HẲN** mỗi lần chạy: `fnMuaTG` `fnBanTG` `tdMuaTG` `tdBanTG` `fnRoomV` `fnRoomTong`
`*TKL` — toàn bộ tầng VNDirect.

**KHÔNG LỘ RA SUỐT NHIỀU THÁNG** vì thứ tự cũ chạy Vietstock TRƯỚC rồi `kho_vnd` ghi lại
NGAY SAU, nên cột vừa bị xoá lại được đắp vào. Đảo thứ tự (VNDirect chạy trước để bảng lên
web sớm) là nó phơi ra ngay: **khối ngoại toàn thị trường từ 2.268 tỷ về 0**, tự doanh về 0.
Không lỗi nào báo — file vẫn hợp lệ, chỉ thiếu cột.

Nay hàm đọc **mọi cột có độ dài bằng `d`** và ghi lại hợp của `COT` với chúng; cột lạ chỉ
giữ khi còn số, để không hồi sinh mấy cột đã cố ý xoá bằng `tools/gon_kho.py`. Kèm theo:
`neo_slcp` suy `sh` từ `shR` của Vietstock, mà nay không còn cào tầng giá Vietstock nữa —
nên ô nào `neo_slcp` không suy ra được thì **giữ `sh` cũ** (do `kho_vnd_lo` ghi từ `ratios`
của VNDirect), bằng không ô vốn hoá của phiên mới trống trơn.

> **Luật chung: hàm ghi phải GIỮ NGUYÊN thứ nó không hiểu.** Dựng lại file từ một danh sách
> cứng là đặt bom hẹn giờ cho người thêm cột sau này — mà quả bom đó im lặng tuyệt đối.

### SỔ LỆNH: THÔI CÀO MỚI, DỮ LIỆU CŨ GIỮ NGUYÊN (22/08/2026)

`qMua` `qBan` `nMua` `nBan` vẫn nằm đủ trong kho (1.529/1.529 mã) và mọi phép đo cũ vẫn
chạy được trên đó — chỉ **thôi cào phiên mới**. Bật lại là chạy `kho_giaodich.py --sau`
như xưa, không phải dựng lại gì.

> Cái giá, biết trước và user chấp nhận: đây là tín hiệu **mạnh nhất** kho từng đo được
> (rank IC +0,082, **t = +12,24** trên 248 phiên). Chuỗi sẽ đứng lại ở phiên 21/08/2026.

### THANH ĐỌC SỐ PHẢI CAO CỐ ĐỊNH — MỖI DÒNG PHỤ ĐÚNG MỘT DÒNG (22/08/2026)

User: *"đưa chuột rà trên chart cứ bị giật lên giật xuống rất khó chịu, là do những dòng
này lúc thì 1 dòng lúc thì 2 dòng"*. Chẩn đúng: `.ptdcp` dài ngắn theo từng phiên, mà
`.ptdoc` là thanh **dính** (`position:sticky`) ngay trên lưới đồ thị — nó cao thêm một
dòng là cả trang nhảy theo từng bước chuột.

Phải chữa **cả ba** chỗ, thiếu chỗ nào là lần sau gặp chuỗi dài hơn lại giật:

① **CSS khoá cứng**: `.ptdcp{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`.
  Đây là cái chốt — rút gọn chữ thôi không đủ, vì mã khác số khác thì dài khác.
② **Hàng tiêu đề `.ptdh`**: `flex-wrap:nowrap` + `min-height`, và **nút "đã ghim" phải cao
  bằng dòng gợi ý** (21px cả hai). Đo được: chữ trơn 13px, nút có padding nên 21px — mỗi
  lần ghim/bỏ ghim thanh nhích 4px.
③ **Mô tả sự kiện nằm TRONG `.ptdh`**, không thành dải riêng bên dưới: chỉ ~2% số phiên có
  sự kiện nên dải riêng sẽ hiện lên rồi biến mất khi rê ngang qua mốc.

Đã đo lại sau khi sửa: quét ~150 vị trí khắp đồ thị (gồm cả mốc sự kiện) cộng ghim/bỏ ghim
→ chiều cao `#ptDoc` **chỉ có đúng một giá trị** (174,5px).

Chữ đã rút, và chỗ những mẩu bị cắt đi đã chuyển tới:
- `14 chứng quyền đang lưu hành` → **chú thích đồ thị "Tự doanh ròng"**. Nó là số của cả
  mã, không đổi theo phiên — nằm trong ô đọc số theo phiên vốn đã sai chỗ.
- `sở hữu 21,8%` → **ô Vốn hoá**. Sở hữu nước ngoài là chuyện của sổ cổ đông, không phải
  của dòng tiền phiên này: "có bao nhiêu cổ phiếu, nước ngoài giữ bao nhiêu phần trăm".
- `thoả thuận …` và `chiếm …%` bỏ hẳn — đã có ô Thoả thuận và đồ thị `mc5` nói.
- **GIỮ đúng một từ định nghĩa** (`khớp lệnh` / `tổng`). Bỏ nốt từ đó thì cùng một ô lúc là
  khớp lệnh lúc là tổng-gồm-thoả-thuận mà không dấu hiệu nào — đúng cái bẫy hai-nguồn-hai-
  định-nghĩa đã trả giá. Bảy ký tự đó đáng giữ.

### KHỔ HẸP CỦA THANH ĐỌC SỐ — BỐN THỨ ĐÃ PHẢI SỬA RIÊNG

Đo thật ở 375px, không đoán:

① **`@media` KHÔNG cộng độ ưu tiên.** Đặt `@media(max-width:700px){.ptdg{display:none}}`
  TRƯỚC khai báo `.ptdg` gốc thì nó bị chính khai báo gốc đè lại — im lặng hoàn toàn, chỉ
  hỏng ở khổ hẹp. Mọi khối `@media` ghi đè phải đứng SAU khai báo nó ghi đè.
② **`height` chứ không `min-height` cho `.ptdh`.** Khổ hẹp ẩn dòng gợi ý nên trạng thái
  chưa-ghim chỉ còn con số ngày (16,5px → rơi về sàn 26px) trong khi đã-ghim có nút 21px
  (→ 30px). Mức sàn chỉ chặn được một phía. Cao cứng 30px thì mọi trạng thái đều bằng nhau.
③ **Cắt một chữ định tính còn hơn cắt một con số.** Ở 2 cột × ~155px, "khớp lệnh mua 550
  tỷ · bán 68 tỷ" vẫn tràn dù đã hạ cỡ chữ — mà `ellipsis` ăn vào ĐUÔI, tức ăn vào chính
  con số "bán": đọc ra "bán 2…" là một số sai. Nên bọc từ định nghĩa vào `.ptdq` và đuôi
  sở hữu vào `.ptdq2`, khổ hẹp ẩn cả hai. Đo lại: **0 chuỗi bị cắt**.
④ **Khổ hẹp không vẽ nhãn trục vốn hoá.** Máng trái 45px + nhãn giá 40px + nhãn vốn hoá
  60px = 145px trên 319px — vùng vẽ còn 55%. Bỏ NHÃN chứ không bỏ ĐƯỜNG (`hep = W<520`):
  hình dạng và chỗ tách khỏi đường giá mới là thứ cần nhìn, còn con số chính xác thì ô
  "Vốn hoá" ở thanh đọc số luôn in sẵn cho đúng phiên đang chọn.

Kiểm cuối ở 375px: quét 2 chiều khắp đồ thị + ghim/bỏ ghim → chiều cao `#ptDoc` **một giá
trị duy nhất (290,5px)**, **0 chuỗi bị cắt**.

### MỐC PHIÊN LÀ TAM GIÁC — CẢ HAI ĐỒ THỊ (22/08/2026)

Lần đầu chỉ sửa đồ thị của MÃ; đồ thị TOÀN THỊ TRƯỜNG (`ptVeChart`) vẫn còn dải đỏ cao suốt
vùng vẽ và user báo lại: *"vẫn còn 1 cột màu đỏ dài làm khá khó nhìn"*. Nay hai chỗ dùng
cùng một hình — cùng một ý nghĩa thì phải cùng một ký hiệu.
> Ở `ptVeChart` phải **vẽ SAU vòng lặp cột**, không vẽ làm nền như bản cũ: làm nền thì cột
> và đường VN-Index đè lên mất, mà cho nổi lên trên thì lại che chính dữ liệu. Tam giác nằm
> ngoài rìa vùng vẽ nên không đè lên gì. Ở khung 1.000 phiên bề ngang một cột chỉ ~1,1px —
> dải đỏ cũ rộng hơn cả cái cột nó đánh dấu.
> Đo lại bằng cách đếm pixel đỏ theo dải y: chỉ còn ở **y 0–40 và y 400–440** trên canvas
> cao 480, giữa sạch trơn; bấm vào cột khác thì tam giác nhảy theo (x 684 -> 243).

### MỐC PHIÊN LÀ TAM GIÁC, KHÔNG PHẢI CỘT ĐỎ (22/08/2026)

User: *"lúc chọn không phải là 1 cột màu đỏ mà nên là 1 dấu tam giác chỉ vị trí"*. Cột đỏ
cao suốt vùng vẽ **cắt ngang chính dữ liệu đang xem** — chặt đôi đường giá, đứng đè lên
cột tiền. Nay hai tam giác nhỏ kẹp trên/dưới, chỉ vào đúng cột đó. Vẫn phân biệt hai trạng
thái: chưa ghim thì mờ 55% và nhỏ, đã ghim thì đặc và to hơn.

### VỐN HOÁ LỒNG VÀO ĐỒ THỊ GIÁ — `cfg.phai2`, TRỤC PHẢI THỨ HAI (22/08/2026)

User: *"nên lồng vốn hoá vào chart giá và giá trị giao dịch luôn, có thể bật tắt được"*.

**PHẢI LÀ TRỤC RIÊNG.** Vốn hoá VNM 132.000 tỷ so với giá trị giao dịch 318 tỷ là gấp
**415 lần** — đổ chung trục trái thì cột tiền cao 0,24% khung hình, coi như biến mất; ép
chung trục phải với giá thì một bên là đồng/cp một bên là tỷ đồng, một trong hai bẹp dí.
Nên `ptVe1` nay có `cfg.phai2`: thang riêng, **nhãn ở cột ngoài cùng và tô đúng màu đường**
(hai cột số cùng màu xám cạnh nhau thì không biết cột nào của đường nào — tệ hơn không nhãn).

Vốn hoá = giá × số cổ phiếu, mà số cổ phiếu gần như đứng yên, nên đường này trùng khít
đường giá ở hầu hết mã, và **chỗ nó tách ra là chỗ doanh nghiệp phát hành thêm**. HPG khung
1.000 phiên là ví dụ đọc được ngay: 5,81 tỷ → 8,44 tỷ cp.

> Bản đầu vẽ NÉT ĐỨT MẢNH cho đúng vai "bản sao của đường giá". **Đã đổi 23/08/2026** —
> user chốt nó là đường quan trọng nhất khung; xem mục *Ba kiểu nét…* ngay dưới.

Công tắc `PT.vh` lưu ở `localStorage['cpvn_ptvh']`.

### ĐỒ THỊ CHÍNH CÒN BA ĐƯỜNG + NEO THEO TRUNG BÌNH CẢ KHUNG (23/08/2026)

User chốt ba việc cùng lúc: *"đường vốn hoá thực chất là đường quan trọng nhất, quan trọng
hơn cả đường giá cho nên đường vốn hoá phải là đường in đậm có màu sắc riêng"* · *"đường giá
TB nên chuyển thành nét đứt"* · *"thêm 1 đường mới là đường vốn hoá thị trường"*.

**ĐỒ THỊ CHÍNH CÒN ĐÚNG BA ĐƯỜNG (user chốt 23/08/2026):**

| đường | dày | màu |
|---|---|---|
| **vốn hoá của mã** | **3px** | xanh lá `#34d399`/`#16a34a` |
| đóng cửa | 1,8px | gần trắng / gần đen |
| VN-Index quy đổi | 1,6px | hồng sen `#f472b6`/`#db2777` |

**KHÔNG ĐƯỜNG NÀO NÉT ĐỨT NỮA** — phân biệt hoàn toàn bằng màu và bề dày. Ô chú thích
`.ptleg i.pkV` giữ `height:4px` (dày hơn 3px của đường khác) để thứ bậc đọc được ngay ở
dòng chú thích, không chỉ trên canvas.

> **HAI ĐƯỜNG ĐÃ GỠ CÙNG NGÀY — ĐỪNG DỰNG LẠI.**
> · **giá TB (VWAP)** — user chốt *"đường giá trung bình cũng không cần nữa, nên ẩn đường
>   giá trung bình luôn"*. **Ô đọc số `Giá khớp lệnh TB` thì GIỮ**: nó trả lời câu khác
>   (giá của ĐÚNG phiên đang ghim), và là thứ duy nhất lộ ra phiên mà giá đóng cửa nói dối
>   — PNJ 08/07/2026 đóng cửa 52.000 (+2,36%) trong khi giá TB 48.579, cả phiên là một cú
>   kéo từ giá sàn lên. `vw` vẫn tính, vẫn được hạ nền cùng `c`.
> · **vốn hoá toàn thị trường quy đổi** — user chốt *"vnindex cũng đại diện cho vốn hoá TT
>   rồi"*. Đúng: VN-Index LÀ chỉ số gia quyền theo vốn hoá, hai đường nói gần như cùng một
>   chuyện mà chen nhau trên cùng một trục. Lý do thứ hai user nêu: mã UPCOM/HNX đem so với
>   VN-Index vốn đã không chuẩn, thêm một thước đo nữa cũng không chữa được chỗ đó.
>   `neoTrungBinh` GIỮ NGUYÊN vì VN-Index quy đổi vẫn dùng; dựng lại chỉ cần gọi nó với
>   `PT.tt.tt.mcap` (nhớ ×1e9 — kho đó tính bằng TỶ còn `mcap` của mã bằng ĐỒNG).
>
> Đo cũ vẫn đáng giữ vì nó nói về thứ tự VẼ: bật cả đóng cửa lẫn giá TB thì đường đóng cửa
> chỉ còn **11,0%** số cột có màu (81 đoạn rời) vì giá TB vẽ SAU nên phủ lên; tắt giá TB đi
> thì lên **83,9%** (8 đoạn). Thêm đường nào chạy sát đường giá thì nhớ chuyện này.

**`neoTrungBinh` — LUẬT CHUNG cho MỌI đường quy đổi đứng cạnh vốn hoá của mã.** User chốt
qua ba lượt: *"để 2 đường thực sự giao nhau"* (vốn hoá thị trường) → *"tương tự hãy tính với
vnindex"* → *"vốn hoá trung bình nó không thể cộng đầu cuối rồi chia 2 được … 1000 phiên thì
lấy trung bình 1000 phiên luôn"*. Một hàm, hai chỗ gọi — đừng viết lại phép neo ở chỗ khác.

```
tỉ số    = trung bình CẢ KHUNG của chuỗi ÷ trung bình CẢ KHUNG của vốn hoá mã
đường vẽ = chuỗi(i) ÷ tỉ số
```

Vấn đề nó giải: vốn hoá thị trường 10,3 TRIỆU tỷ so với một mã 30 nghìn tỷ là gấp 343 lần,
VN-Index thì tính bằng ĐIỂM — vẽ chung trục thì đường mã bẹp sát đáy, cho mỗi đường một
trục riêng thì cả hai tự co giãn đầy khung và **không bao giờ cắt nhau**, mà chỗ cắt nhau
mới là thứ cần nhìn.

> **VÌ SAO VẪN CHẮC CHẮN CÓ ĐIỂM CẮT.** Sau khi chia, TRUNG BÌNH của đường quy đổi đúng bằng
> TRUNG BÌNH của đường vốn hoá. Nếu nó nằm TRÊN ở mọi phiên thì trung bình phải lớn hơn —
> mâu thuẫn; nằm dưới ở mọi phiên cũng vậy. Nên bắt buộc có phiên trên và có phiên dưới, mà
> hai đường là nét liền nên giữa chúng có điểm cắt.
> Hệ quả kèm theo: hai đường quy đổi cũng cùng trung bình VỚI NHAU, nên cả ba đường trên
> trục ngoài cùng cắt nhau từng đôi một. Quét cả kho, cả ba khung:
>
> | cặp đường | vẽ được | không cắt lần nào | số lần cắt (trung vị, khung 1.000) |
> |---|---|---|---|
> | vốn hoá ↔ VN-Index quy đổi | 1.529/1.529 | **0** | 13 → **19** |
> | vốn hoá ↔ vốn hoá thị trường | 1.529/1.529 | **0** | 11 → **18** |
> | VN-Index ↔ vốn hoá thị trường | 1.529/1.529 | **0** | — |
>
> Đẳng thức trung bình đo lại trên toàn kho: lệch tối đa **1,4 × 10⁻¹⁵** — đúng tới giới hạn
> số thực dấu phẩy động.

> **VÌ SAO BỎ CÁCH CŨ (trung bình hai đầu) — ĐO ĐƯỢC, KHÔNG PHẢI CẢM TÍNH.** Nó chỉ nhìn
> ĐÚNG 2 phiên trong 1.000; 998 phiên còn lại không có tiếng nói nào, nên một phiên mép khung
> rơi vào đáy hay đỉnh là kéo lệch cả đường. Phép đo độ vững: **xê dịch mép khung 300 phiên
> đi ±4 phiên** (khung là một lát cắt tuỳ ý, dời vài phiên vẫn phải là cùng một câu trả lời),
> đo trên 400 mã:
>
> | | trung vị | p90 | lớn nhất |
> |---|---|---|---|
> | neo HAI ĐẦU | 2,22% | 8,80% | 22,78% |
> | neo TRUNG BÌNH | **0,61%** | **1,29%** | 23,63% |
>
> Vững hơn **3,6 lần** ở trung vị, **6,8 lần** ở p90. Cột "lớn nhất" gần bằng nhau vì đó là
> mã có đợt phát hành thêm bước vào/ra khỏi khung — chuyện đó làm lệch cả hai cách như nhau.

> **ĐỔI PHÉP ĐỌC, KHÔNG PHẢI CHỈ ĐỔI THANG.** Neo MỘT phiên (bản đầu của VN-Index) đọc ra
> *"kể từ phiên neo, ai hơn ai"* — nhưng hai đường tách hẳn sau đó và **không bao giờ cắt
> lại**, nên không đọc ra đảo chiều. Neo trung bình đọc ra *"phiên nào mã đắt/rẻ so với mức
> trung bình của chính khung, và đảo vai ở đâu"*. Con số hơn kém tuyệt đối vẫn còn nguyên ở
> `vniTom` (`tu`/`vh`/`vni`/`ma`) — nó vẫn neo MỘT phiên vì câu nó trả lời cần một mốc cụ thể.

> **TRUNG BÌNH PHẢI LẤY TRÊN CÙNG MỘT TẬP PHIÊN** — chỉ phiên có ĐỦ CẢ HAI số. Vốn hoá thị
> trường chỉ có từ 03/01/2023, mã mới niêm yết thì `sh` cụt ở đầu khung; ở VNM khung 1.000
> phiên thì trung bình thật ra tính trên **905 phiên**. Lấy mỗi đường trung bình trên tập
> phiên của riêng nó là hai con số đo hai quãng thời gian khác nhau — đẳng thức gãy, mất
> luôn bảo đảm cắt nhau. Đường vẫn VẼ ra ngoài tập đó, chỉ là không tham gia tính trung bình.

> **TRỤC KHÔNG HẸP THÊM, VÀ ĐỪNG HỨA LÀ CÓ.** Đo 16 cặp mã × khung: trung vị **1,00 lần**,
> dải 0,88–1,16. Phần thu hẹp trục là công của lượt trước (bỏ neo-một-phiên); lượt này đổi
> ĐỘ VỮNG của phép neo và số điểm cắt, không đổi bề rộng trục.

> **CHIA CHO HẰNG SỐ, ĐỪNG CHUẨN HOÁ TỪNG PHIÊN.** Chia hằng số thì hình dạng đường thị
> trường giữ nguyên tuyệt đối — nó vẫn là đúng đường vốn hoá thị trường, chỉ đổi đơn vị đọc.
> Chuẩn hoá theo từng phiên ra một đường phẳng lì bằng 1, chẳng nói gì.

Kiểm end-to-end trên VNM khung 1.000 phiên (đọc pixel canvas rồi đối chiếu với số tính lại
bằng Python): **17 điểm của CẢ BA đường khớp MỘT phép ánh xạ tuyến tính chung**
`y = 1490,8 − 6,895 × giá trị`, lệch **trung vị 2,9px** trên vùng vẽ ~900px — tức chúng thật
sự đứng chung một trục và đúng bằng số Python tính ra. Điểm lệch nhất 16,9px nằm ở đầu chuỗi,
do cách dò pixel phải quét tối đa 18 cột mới bắt được một vạch của nét đứt; đó là sai số của
phép ĐO chứ không phải của thang.
Tỉ số đối chiếu từng khung trên VNM — web và Python khớp cả bốn: 100 phiên **83,0** · 300
**75,1** · 600 **63,1** · 1.000 **54,1**. Tỉ số ĐỔI THEO KHUNG là đúng thiết kế: mỗi khung có
trung bình của riêng nó.

- **`PT.tt.tt.mcap` tính bằng TỶ, `mcap` của mã tính bằng ĐỒNG** — quên `×1e9` là lệch đúng
  10⁹ mà tỉ số vẫn ra một con số trông bình thường, chỉ có đồ thị là sai.
- **Chỉ IN TỈ SỐ cho đường vốn hoá thị trường, đừng in cho VN-Index.** Bên kia hai vế cùng
  là TIỀN nên "÷ 52,6" đọc được ngay là *thị trường lớn gấp 52,6 lần mã*. Tỉ số của
  VN-Index là điểm-trên-đồng (`9,46e−12`), một phép đổi đơn vị chứ không phải một lần gấp —
  in ra chỉ làm loãng đúng như user đã chốt.
- **Neo vào phiên đầu CÓ ĐỦ CẢ HAI SỐ, không phải phiên đầu KHUNG.** Vốn hoá thị trường chỉ
  có từ 03/01/2023 nên ở khung 1.000 phiên đường này bắt đầu muộn hơn đường mã.
- **Tỉ số in thẳng vào nhãn chú thích** (`vốn hoá thị trường ÷ 52,6`). Người xem phải biết
  đường đó bị chia bao nhiêu thì con số trên trục mới có nghĩa. Trung vị cả kho 28.780; mã
  bé nhất (X77) lên tới 19,4 triệu.
- **`PT.vhtt`** ở `localStorage['cpvn_ptvhtt']`, **mặc định TẮT** — bật sẵn cả bốn đường
  trục ngoài là lần đầu mở trang thấy một mớ chồng nhau.
- **Vốn hoá đứng ĐẦU mảng `phai2.series`** vì `ptVe1` tô nhãn trục ngoài cùng bằng `P3[0].mau`.

> **MÀU XÁM PHẢI LÀ XÁM TRUNG (#94a3b8), KHÔNG PHẢI XÁM NHẠT.** Đã thử `#cbd5e1` và đo trên
> VIC: đường này chạy đúng dải y 102..834, **trùng dải của đường đóng cửa** (`#f8fafc`,
> y 101..834) — hai màu cách nhau ~50 đơn vị mỗi kênh nên chồng lên nhau là mất hẳn một
> đường. Trùng dải là chuyện ngẫu nhiên của từng mã (hai đường ở hai trục khác nhau), nên
> phải chọn màu chịu được mọi lần trùng chứ đừng chọn theo một mã.

**LỖ THỦNG Ở CỬA VỐN HOÁ THỊ TRƯỜNG — đã vá cùng lượt.** `build_phantich` chỉ xét TỈ LỆ
`nMcap/n < 0,80`, và nó thủng đúng một phiên: **31/12/2022 (thứ Bảy, không phải ngày giao
dịch) có `n = nMcap = 1`** → tỉ lệ 100%, lọt cửa, ghi ra **671,5 tỷ** trong khi thị trường
khi đó ~5,4 TRIỆU tỷ. Một ô lệch 8.000 lần nằm lọt giữa chuỗi thì **mọi phép neo đều hỏng**
— neo hai đầu thì hỏng thảm nếu nó rơi đúng mép; neo trung bình thì nhẹ hơn (một ô trong
905) nhưng vẫn kéo lệch. Mà 31/12/2022 nằm gọn trong khung 1.000 phiên. Nay thêm SÀN TUYỆT
ĐỐI dùng lại `MIN_MA = 100` của file ngày: phiên thưa tới mức không đáng dựng bảng thì cũng
không đáng công bố vốn hoá. Sàn cách xa mọi phiên lành — phiên mỏng nhất trong kho vẫn có
**1.446 mã**. Dựng lại `phantich.json` sau khi vá: **đúng 2 ô đổi** (`mcap`, `mcapFF` của
31/12/2022 → `null`), không ô nào khác nhúc nhích.

### CÁI LỖ TRƯỚC 2023 CỦA VỐN HOÁ — ĐÃ LẤP, `tools/lap_slcp_cu.py` (23/08/2026)

User: *"vì sao mất 1 góc trước 2023, có thể fix triệt để lỗi này không"*.

**GỐC: `ratios` của VNDirect CHẶN CỨNG 16 QUÝ.** Dò tận nơi —
`v4/ratios?q=code:HPG~ratioCode:OUTSTANDING_SHARES` trả `totalElements=16`, kỳ cũ nhất
**2022-12-31**; `LISTED_SHARES`, `TOTAL_SHARES`, `FREEFLOAT` cũng đúng 16. Kho giao dịch thì
sâu 1.000 phiên (lùi tới ~2022-08-18). Chênh lệch đó chính là cái góc: **1.449/1.529 mã có
`sh` bắt đầu ĐÚNG ngày 2023-01-03**, nên 95 phiên đầu khung không có vốn hoá và cả ba đường
của trục ngoài cùng đều cụt.

**LỖ NÀY TỰ SINH LẠI MỖI NGÀY** — 16 quý ≈ 4 năm ≈ 1.000 phiên, hai mốc trôi song song nên
độ rộng của nó không đổi. Vì thế bản vá phải nằm TRONG lượt EOD (bước `[1c]`, ngay sau
`va_slcp_gdkhq`), không phải một script chạy tay.

**CÁCH LẤP — ĐI NGƯỢC TỪ Ô ĐẦU TIÊN ĐÃ BIẾT, KHÔNG GỌI MẠNG LƯỢT NÀO:**

```
sh(t) = sh(neo) ÷ Π (1 + tỉ lệ)      mọi sự kiện GDKHQ trong (t, neo]
```

`neo` = phiên đầu tiên có `sh`; tỉ lệ lấy từ `data/sukien` (đã có sẵn trong kho, lượt 7:30
dựng). Ngược chiều với `va_slcp_gdkhq.py` nhưng cùng cơ chế và cùng bảng sự kiện. **Không
bịa con số nào** — hai đầu bậc thang đều là số nguồn cho, việc duy nhất là đặt bậc đúng chỗ.
Chạy **1,2 giây** cho cả kho, lấp **140.808 ô trên 1.509/1.529 mã**; phiên có vốn hoá thị
trường **905 → 1.000**.

**BỐN CÁCH ĐÃ ĐO, ĐỪNG THỬ LẠI.** Hồi kiểm: giấu `sh` của 105 phiên rồi dựng lại, so từng Ô
PHIÊN với đáp án thật, 117 mã / ~12.000 ô:

| cách dựng lại | ô đúng <0,5% | p99 lệch |
|---|---|---|
| **đi ngược sự kiện** (đang dùng) | **99,06%** | **0,01%** |
| giữ nguyên số của neo | 98,80% | 4,55% |
| hiệu vốn góp (`data/finx`) | 98,33% | 16,00% |
| median `MARKETCAP` ÷ giá | 96,23% | 54,42% |
| `MARKETCAP` ÷ giá từng phiên | 90,21% | 54,42% |

> **CHỈ `cp` VÀ `thuong`.** Thêm `quyenmua`/`phathanh`: 99,06% → **98,76%**, p99 vọt từ
> 0,01% lên **4,55%** — tỉ lệ quyền mua chỉ là mức TỐI ĐA, không phải ai cũng nộp tiền.
> Đúng luật `CO_TL`/`KHONG_TL` của `va_slcp_gdkhq.py`.

> **`MARKETCAP` THEO TỪNG PHIÊN CÓ THẬT VÀ SÂU TỚI 2017** (`ratioCode:MARKETCAP`, 2.171
> phiên cho HPG, lọc ngày bằng `reportDate:gte:X~reportDate:lte:Y`) — nghe như lời giải hoàn
> hảo, và trên HPG thì `MARKETCAP ÷ giá` khớp `sh` tới **0,0000%** suốt 899 phiên. **Nhưng
> mã thanh khoản mỏng thì vốn hoá họ ghi KHÔNG tính bằng giá đóng cửa của chính phiên đó**:
> thương số dao động BCA ±8,5% · SNZ ±18% · DSP ±37% · cao nhất **±51%**. Nó cũng **không
> dùng làm trọng tài được** — đo trên 295 mã, ngưỡng 3% chỉ bắt **2/13** mã hỏng (15%), vì
> VNDirect cũng chở số MỚI về quá khứ y như mình. Bỏ, và bỏ luôn ý định gọi mạng.

> **VỐN GÓP (`data/finx` dòng `x_von_gop`, sâu tới Q1/07) BẮT ĐƯỢC THỨ SỰ KIỆN KHÔNG CÓ** —
> VTR: vốn góp nhảy 172,95 → 292,95 tỷ = đúng 12.000.000 cp phát hành riêng lẻ mà bảng sự
> kiện bỏ trống. Nhưng nó **đăng ký TRỄ hơn ngày GDKHQ** và chỉ có độ phân giải QUÝ, nên đẻ
> ra lỗi ở mọi mốc quý nhiều hơn số ca nó cứu: 99,06% → **98,33%**.

**TRẦN ĐỘ XA 150 PHIÊN — sai số DỒN theo quãng đường.** Neo ở phiên cuối rồi đi ngược suốt
900 phiên có đáp án thật, 1.529 mã:

```
lùi     0-39    40-79   80-119  120-159  160-199  240-279  320-359
đúng   99,68%  97,18%   95,95%   94,76%   92,67%   90,74%   89,18%
p95     0,00%   0,00%    0,02%    1,41%    9,09%   19,86%   25,00%
```

Cái lỗ thật chỉ rộng ~95–113 phiên nên 150 phủ trọn với dư địa, mà vẫn chặn hai ca đi hoang:
**PTM phải lùi 776 phiên, PEG 593** — ở tầm đó cứ 5 ô có 1 ô sai. Hai mã đó chỉ được lấp 150
phiên rồi dừng; phần còn lại **vẫn để trống**, và trống là câu trả lời đúng.

**LỖI THẬT BẮT ĐƯỢC TRONG LÚC LÀM: HAI ĐỢT CÙNG NGÀY GDKHQ PHẢI CỘNG TỈ LỆ, KHÔNG PHẢI
NHÂN.** Cầm 100 cp, cùng ngày nhận cổ tức cổ phiếu 20% VÀ thưởng 30% thì nhận 20 + 30 = 50
cp mới — hệ số **1,50**, không phải 1,20 × 1,30 = 1,56. Cả hai tỉ lệ tính trên CÙNG một số
cổ phiếu trước sự kiện chứ không nối tiếp. Kiểm bằng nguồn khác hẳn — vốn góp của TV2 quanh
15/11/2022: **450,18 → 675,26 tỷ = ĐÚNG 1,5000**; bản nhân ra 43.286.003 cp, lệch **3,8%** so
với 45.018.000 mà cả vốn góp lẫn `MARKETCAP` cùng xác nhận. **Không phải ca hiếm: 219 ngày
GDKHQ có từ 2 đợt trở lên, trên 153 mã = 10% kho.** Đã sửa ở CẢ HAI chỗ — `lap_slcp_cu.py`
(gộp theo ngày trong `su_kien()`) và `va_slcp_gdkhq.py` (ở đó nó vốn không gây hại vì phép
thử 3% trượt thì rơi về nhánh "dồn cả bậc vào đợt sớm nhất", mà đợt sớm nhất chính là ngày
đó — nhưng hai công cụ dùng chung một bảng sự kiện thì phải nhân dồn cùng một kiểu).

**PHÉP KIỂM CHẤP NHẬN — CỘNG `MARKETCAP` CỦA CẢ SÀN RỒI SO VỚI TỔNG CỦA KHO.** Đây là nguồn
ĐỘC LẬP (endpoint khác, không dùng trong thuật toán), hỏi ĐÚNG MỘT NGÀY mỗi lượt và chỉ cộng
trên tập mã CẢ HAI cùng có:

| ngày | kho (tỷ) | VNDirect cộng (tỷ) | lệch | mã |
|---|---|---|---|---|
| **2022-08-19** | 6.594.617 | 6.589.518 | **+0,08%** | 1.448 |
| **2022-10-14** | 5.519.696 | 5.514.255 | **+0,10%** | 1.449 |
| **2022-12-30** | 5.190.948 | 5.191.909 | **−0,02%** | 1.452 |
| 2023-01-03 *(vùng vốn đã đúng)* | 5.352.300 | 5.348.892 | +0,06% | 1.452 |
| 2026-08-21 *(vùng vốn đã đúng)* | 10.294.691 | 10.308.719 | −0,14% | 1.524 |

**Vùng vừa lấp chính xác NGANG vùng vốn đã đúng.** Chỗ nối cũng lành: 2022-12-30 →
2023-01-03 vốn hoá **+3,11%** trong khi VN-Index **+3,66%** — cú nhảy đó là thị trường thật,
không phải vết ghép.

**BƯỚC SOI LẠI (`--soi`) — HAI NGUỒN ĐỘC LẬP MỚI ĐƯỢC SỬA.** Bản đi ngược không biết đợt
phát hành riêng lẻ / ESOP (bảng sự kiện không ghi). Đo trên **1.387 mã**: 64 mã lệch >0,5%
so với `MARKETCAP`, tưởng là 4,6% mã hỏng. **Nhưng phân xử bằng nguồn thứ ba thì lật hẳn** —
`x_von_gop` của `data/finx` bênh `sh` ở CẢ HAI vùng cho **37 mã**, tức ở đó `MARKETCAP` mới
là bên lệch (nó không tính vốn hoá bằng giá đóng cửa của chính phiên đó với mã mỏng).

Mã hỏng THẬT có hình dạng rất đặc trưng — `sh ÷ (MARKETCAP ÷ giá)` là một **BẬC THANG SẠCH**:
giữ đúng một hằng số rồi rơi thẳng về 1,000 tại ngày phát hành.

```
SSB  1,030 1,030 1,030 1,030 1,030 | 1,000 1,000 1,000 …
PAP  1,333 1,333 1,333 1,333 1,333 | 1,000 1,000 1,000 …
HHV  1,151 1,151 1,151 1,151 | 1,000 1,000 …
```

`--soi` tìm đúng hình đó (~35 lượt gọi, 30 giây: 12 lượt hỏi CẢ SÀN ở 12 ngày rải đều để
khoanh vùng nghi, rồi hỏi trọn chuỗi của riêng nhóm nghi) rồi **chỉ sửa khi vốn góp cũng gật
đầu**. Đã sửa **13 mã**, khớp tới từng đồng: SSB `MARKETCAP` 1.980.898.268 · vốn góp
1.980.898.000. Hai mã bị chặn đúng lúc — L10 (vốn góp bênh số cũ) và S99 (cả ba nguồn đều
khác) — thà để nguyên còn hơn sửa theo một nguồn.

> **VỐN GÓP PHẢI LẤY QUÝ LIỀN TRƯỚC NGÀY BẬC.** Bẫy đã dính và nó ĐẢO NGƯỢC KẾT LUẬN: bậc
> 27/10 nằm trong Q4/22, lấy vốn góp cuối Q4 là lấy đúng số SAU đợt phát hành → nó "xác nhận"
> con số CŨ và phép kiểm báo 10/12 mã *không* nên sửa. Lấy Q3/22 thì 10/12 khớp tuyệt đối.

> **BA BẪY CỦA BỘ DÒ, mỗi cái đều làm nó im lặng báo "không có gì để sửa":**
> ① **Trần 9.990 bản ghi mỗi lượt, và nguồn CẮT CÂM chứ không báo lỗi** — xin 60 mã × 999
>    phiên = 60.000 bản ghi thì nhận về mảnh vụn, `_bac` trượt sạch. Chỉ xin `XET` phiên đầu,
>    20 mã một lượt.
> ② **Quét tìm bậc phải đi XUÔI TỪ ĐẦU, đừng quét ngược từ cuối** — SSB và PAP còn đợt phát
>    hành nữa vào ~2024, quét ngược vấp đúng nó rồi dừng ở chỉ số 343/396, "đoạn đầu" gộp cả
>    hai bậc, trung vị ra 1,0000 và trượt.
> ③ **"Phẳng" phải đo bằng TỈ LỆ ĐIỂM BÁM TRUNG VỊ (90%), đừng đo bằng biên độ** — PAP có
>    trung vị đoạn đầu ra ĐÚNG 1,3333 mà vài phiên nhiễu đẩy biên độ lên 0,66.

**ĐƯỜNG THỨ HAI — VỐN GÓP ĐỨNG RA KHI `MARKETCAP` NHIỄU QUÁ (`_theo_vongop`).** PAP và SIP
là hai ca `MARKETCAP` thấy có gì đó sai nhưng không định vị nổi ngày bậc. Vốn góp nói được,
nhưng **chỉ ở chỗ nó thật sự nói**: quý mà số cổ phiếu KHÔNG ĐỔI suốt quý (`vg[q]==vg[q-1]`
— vốn góp là số CUỐI kỳ, áp cho phiên giữa quý chỉ đúng khi trong quý không có gì đổi), VÀ
vốn góp phải khớp `MARKETCAP` của chính quý đó.

```
SIP  cổ phiếu quỹ bị HUỶ trong Q4/22   929,04 -> 909,04 tỷ = −2.000.000 cp
     92.904.149 tới hết Q3/22, rồi 90.904.146   (bản đi ngược chỉ biết CHIA, không biết HUỶ)
PAP  phát hành thêm 50 triệu cp        1.500 -> 2.000 tỷ
     150.000.000 tới 11/11/2022, rồi 200.000.000  (ngày lấy từ MARKETCAP, chuẩn tới phiên)
```

> **BA CỔNG, GỠ CỔNG NÀO CŨNG PHÁ SỐ ĐANG ĐÚNG:**
> ① **Phải có cờ của `MARKETCAP` trước.** Chạy luật vốn góp một mình thì nó "sửa" **79 mã**
>    với hệ số loạn xạ (DHT 0,357 · DXP 0,618 · CAP 0,781) — toàn mã bản đi ngược vốn đã
>    đúng, sai là do vốn góp đăng ký TRỄ hơn ngày GDKHQ. Đúng cái hồi kiểm đã đo: vốn góp
>    một mình 98,33% so với 99,06%.
> ② **BỎ HẲN QUÝ CÓ NGÀY GDKHQ.** Ở đó vốn góp và `MARKETCAP` **KHÔNG CÒN ĐỘC LẬP** — cả
>    hai cùng lấy số cổ phiếu ở CUỐI QUÝ nên cùng trễ mấy phiên sau ngày GDKHQ, rồi cùng
>    chỉ vào số CŨ và "xác nhận" lẫn nhau. Suýt phá hai ngân hàng lớn: VPB (thưởng 50%
>    ngày 28/09/2022) và HDB (cổ tức 25% ngày 27/09) — bản đi ngược đặt bậc ĐÚNG ngày, luật
>    này định kéo 3-4 phiên sau đó về nền cũ.
> ③ **Mép vùng lấp phải hỏi nguồn, và phải tính theo lịch RIÊNG của mã.** Lấy `LUI_TOI_DA`
>    (150) làm trần thì bậc ở phiên 148 vẫn lọt — DPR và GKM có bậc ngày 24/03/2023, chỗ đó
>    `sh` là số `ratios` cho. `_moc_ratios()` hỏi thẳng kỳ cũ nhất của `OUTSTANDING_SHARES`
>    (nó trôi dần vì chặn 16 quý, viết cứng một ngày là vài tháng nữa sai). Và `ngay` trong
>    `soi()` là lịch DÀI NHẤT của kho — mã có phiên đầu sớm hơn (SIP bắt đầu 11/08 trong khi
>    phần lớn 18/08) thì chỉ số lệch, phải dò lại `tran` trên `d` của chính mã.

> **VÒNG 1 PHẢI LẤY MẪU TRONG VÙNG LẤP, VÀ ĐO BẰNG TRUNG VỊ.** Bản đầu rải 12 ngày khắp
> 1.769 phiên nên chỉ trúng ĐÚNG MỘT phiên trong vùng lấp — SIP trượt sát nút (max|v−1| =
> 0,0191 so với ngưỡng 0,02) chỉ vì cái mẫu duy nhất đó rơi vào phiên ít nhiễu. Nay 8 ngày
> trong vùng lấp + 4 ngày đối chứng, và so TRUNG VỊ hai vùng: max thì một phiên nhiễu cũng
> dựng cờ, trung vị mới nói được "cả vùng lệch". Nhóm nghi từ **445 xuống 29 mã**.

**CÒN LẠI, ĐO TRÊN 1.379 MÃ:**

| | số mã | vốn hoá |
|---|---|---|
| `MARKETCAP` mới là bên lệch (vốn góp bênh `sh`) — **không phải lỗi** | 36 | — |
| **`sh` sai thật** — AGG 0,9% · SFI 5,0% | **2** | 2.435 tỷ |
| không có vốn góp để phân xử (đều là mã bé) | 15 | 1.755 tỷ |

**17 mã đáng ngờ = 1,23%, chiếm 0,041% vốn hoá thị trường** (trước đường thứ hai: 22 mã /
0,269%). Tổng vốn hoá thị trường đối chiếu với `MARKETCAP` cộng cả sàn: **−0,07% / +0,04% /
−0,02%** ở ba phiên trong vùng lấp, ngang đúng vùng `ratios` vốn đã đúng (+0,06% / −0,14%).

> **BỐN CỬA ĐÃ DÒ VÀ ĐÓNG — đừng dò lại:** TCBS `apipubaws` (404 cả ba endpoint) · Simplize
> `historical/quote` (chỉ trả ảnh chụp hiện tại, không có vốn hoá theo ngày) · `api.hsx.vn`
> `securities` (trả rỗng) · `shR` còn trong kho nhưng **chỉ 1/1.529 mã chạm tới trước 2023**
> (Vietstock chặn 1 năm, mà lượt EOD đã thôi cào tầng đó từ 22/08). DNSE `entrade` có nến
> nhưng không có số cổ phiếu.

> **HAI CÔNG CỤ CHẠY CHUNG THÌ ỔN ĐỊNH.** `va_slcp_gdkhq` (dời bậc) phải đứng TRƯỚC
> `lap_slcp_cu` (lấp đầu khung) vì bản lấp neo vào ô đầu tiên, mà ô đó chỉ đúng sau khi bậc
> đã về ngày GDKHQ. Chạy lại cả hai lượt thứ hai: `lap_slcp_cu` chỉ còn lấp 300 ô trên 2 mã
> (hai mã có `dau` xê dịch vì bậc vừa dời) — **idempotent**, không giẫm lên nhau.

### THANH ĐỌC SỐ DÍNH PHẢI CÓ NỀN ĐẶC (23/08/2026)

`.ptdoc` trước dùng `background:var(--card)` — màu KÍNH MỜ (rgba .72 nền tối / .86 nền
sáng). Đẹp khi thẻ nằm yên trên nền trang, nhưng thanh này `position:sticky` và có cả lưới
đồ thị chui qua bên dưới, nên mọi thứ trượt qua đều hằn lên: sáu cái nút bo tròn hồng của
thanh tiêu đề đồ thị in đè lên đúng dòng "Vốn hoá" và "VN-Index". Đổi sang `var(--solid)`.
**Thanh dính thì phải đục** — áp cho mọi thanh dính về sau.

### BA ĐỒ THỊ ĐÃ BỎ (22/08/2026) — ĐỪNG THÊM LẠI

Từ 11 đồ thị xuống 7. Đồ thị nào cũng "đúng" nhưng 11 ô đều tăm tắp thì không ô nào là câu
trả lời đầu tiên.

| bỏ | vì đã có chỗ khác nói rõ hơn |
|---|---|
| `mc6` % thay đổi giá mỗi phiên | in ngay dưới giá đóng cửa ở thanh đọc số |
| `mc8` khối lượng khớp lệnh | đồ thị chính vẽ GIÁ TRỊ, số cổ phiếu in dưới ô Giá trị khớp lệnh |
| `mc7` vốn hoá | lồng vào đồ thị chính ở trục ngoài cùng |

### MỐC SỰ KIỆN TRÊN ĐỒ THỊ GIÁ CỦA TRANG MÃ (22/08/2026)

User chốt: *"trên đồ thị giá cũng gắn thêm báo cáo tài chính, cổ tức (có thể bật tắt)"*.

Nguồn là kho **`data/sukien/{MÃ}.json`** đã có sẵn (1.482 mã, 47.531 sự kiện) — `ptNapMa`
gọi nó **song song** với `data/giaodich` bằng `Promise.all`, không nối đuôi. Sáu loại `k`:
`bctc` 28.893 · `tien` 14.802 · `cp` 2.091 · `thuong` 872 · `quyenmua` 840 · `phathanh` 33.

**BẢNG MÀU VÀ CHỮ CÁI PHẢI GIỐNG `assets/chart.js`** (trang cổ phiếu): `D` xanh trời
`#38bdf8` cổ tức tiền · `C` vàng `#eab308` cổ phiếu/thưởng · `P` hồng sen `#c026d3`
quyền mua/phát hành · `B` xám `#8a8a99` báo cáo tài chính. Cùng một mã, cùng một sự kiện,
hai trang vẽ hai màu là bắt người xem học lại bảng màu ở mỗi trang. Sửa một bên thì sửa
cả bên kia — hằng số nằm ở `PTSK` (`congcu.js`) và khối màu trong `veMocSK` (`chart.js`),
cộng bốn chấm chú thích `.ptleg i.pkS1..pkS4` trong `congcu.html`.

Bốn điểm đã cân nhắc, đừng làm ngược lại:

① **NGÀY SỰ KIỆN LÀ NGÀY GIAO DỊCH KHÔNG HƯỞNG QUYỀN, KHÔNG PHẢI NGÀY TRẢ.** Đã kiểm
   chứ không đoán: với `k:'tien'`, so `tc` của phiên đó với `c` phiên trước, phần hụt
   xuống đúng bằng số tiền cổ tức ở **83,0%** trường hợp (837/1.008 mẫu, 400 mã đầu kho).
   Nên gắn lên đồ thị giá là ĐÚNG CHỖ — nó giải thích mấy cú tụt giá không có tin gì.

② **DÍNH SANG PHIÊN ĐẦU TIÊN TỪ NGÀY ĐÓ TRỞ ĐI, và chặn sự kiện trước đầu khung.**
   331/4.380 mốc trong khung (7,6%) rơi vào ngày không có phiên — cuối tuần, nghỉ lễ,
   hoặc mã ngừng giao dịch hôm đó. Bỏ luôn là mất 7,6% số mốc mà không ai biết. Nhưng dò
   nhị phân "phiên đầu tiên ≥ ngày sự kiện" mà KHÔNG chặn `e.d < d[0]` thì mọi sự kiện
   của 16 năm trước dồn hết vào chỉ số 0 — một chồng mốc dựng đứng ở mép trái. Khi mốc bị
   dính sang ngày khác thì dải đọc số **in cả ngày gốc** (`(lịch ghi …)`).

③ **MỐC BÁM ĐƯỜNG GIÁ, KHÔNG NẰM THÀNH DẢI RIÊNG.** Bản đầu chừa `padT=22` rồi xếp mốc
   thành một hàng trên đỉnh; user bác ngay: *"tao muốn nó nằm trên đường chart"*. Dải riêng
   thì phải dóng mắt từ chấm xuống đường giá mới biết hôm đó giá bao nhiêu, mà đó đúng là
   câu hỏi duy nhất người ta hỏi khi thấy mốc cổ tức. Nay neo vào chuỗi của **trục phải**
   (đường giá) nếu đồ thị có trục phải, không thì chuỗi trái — đặt trên điểm giá 13px, hết
   chỗ thì lật xuống dưới, ghì trong `[padT+9, padT+plotH−9]`; cùng luật `assets/chart.js`.
   `padT` chỉ còn 14 để chấm ở vùng đỉnh không bị cắt. Vạch dọc nối chấm với đường giá chỉ
   chạy đúng đoạn giữa hai điểm — chạy suốt vùng vẽ là hai chục sợi kẻ cắt ngang đồ thị.

④ **DÒ TRÚNG MỐC PHẢI THEO CẢ HAI CHIỀU (đĩa 18px quanh tâm), ĐỪNG DÒ MỘT CHIỀU.**
   Bản đầu dò theo trục X trong bán kính 8px — ở khung 1.000 phiên mỗi phiên rộng 1,1px
   nên quanh mỗi mốc có ~14 phiên KHÔNG rê tới được nữa; 20 mốc là mất gần 300/1.000 phiên,
   im lặng hoàn toàn. Dò hai chiều chỉ chiếm đúng cái đĩa, rê ở độ cao khác vẫn đi từng
   phiên một (đã kiểm: −6…+6px cho ra 7 phiên khác nhau liên tiếp).

⑤ **HỘP THÔNG TIN VẼ THẲNG LÊN CANVAS** (`veHopSK`), không dựng thẻ HTML: toạ độ mốc đổi
   theo khung 100/300/600/1.000 và theo bề ngang cửa sổ, gắn thẻ HTML là phải đồng bộ vị
   trí mỗi lần vẽ lại. `PT.skMo` giữ phiên đang mở hộp — TÁCH HẲN khỏi `PT.maI` (phiên
   đang chọn): bật hộp theo "phiên đang chọn có sự kiện không" thì quét chuột ngang đồ thị
   là hộp nhấp nháy hai chục lần. Đang ghim vẫn rê xem hộp của mốc khác được — ghim là để
   giữ SỐ đứng yên, không phải để cấm hỏi "cái chấm kia là gì" — nên **dòng đầu của hộp
   luôn là ngày của chính nó**, không có nó thì số ở thanh trên và chữ trong hộp là hai
   phiên khác nhau mà tưởng một.

Hai công tắc `PT.skH = {sk, bctc}` lưu ở `localStorage['cpvn_ptsk']`, đặt **ngay dưới đồ
thị nó điều khiển** chứ không lên thanh đầu trang (thanh đầu đã có nút quay lại, tên mã,
ô chọn khung, link sang trang cổ phiếu — thêm nữa là bốn nhóm điều khiển cho ba việc khác
nhau đứng chung hàng). Dùng `.ptsw` (nút rời, bo tròn) chứ không `.ptseg` (khối liền):
`.ptseg` là chọn MỘT trong nhiều, đây là hai công tắc độc lập.

Chỉ gắn cho **`#mc1`** — đồ thị giá. Gắn cả 11 đồ thị là nhiễu.

### BỐN KHỐI ĐANG TẮT — `PT_HIEN` ở đầu module (22/08/2026)

```js
const PT_HIEN={quetla:false, dongtien:false, diemsang:false, boloc:false};
```

Tắt "Phiên này có gì lạ" · "Khối ngoại và tự doanh mua bán gì" · "Điểm sáng phiên" ·
"Bộ lọc đặc trưng". Trang phân tích nay chỉ còn **Toàn thị trường** và **Bảng mã**.

> **ĐÂY LÀ ẨN, KHÔNG PHẢI GỠ.** Mọi mạch dựng (`ptQuetLa` `ptDongTien` `ptDiemSang`
> `ptBoLoc` `ptLocVe` `ptLocBind`), CSS, và **cả dữ liệu trong kho vẫn còn nguyên**:
> `data/phien/*.json` vẫn mang `la`/`dt`/`dtf`, và `tools/quet_la.py` vẫn chạy trong lượt
> EOD. Đổi một cờ thành `true` là khối đó hiện lại, không phải dựng lại gì.
> **Đừng "dọn rác" bằng cách xoá mấy hàm đang tắt** — cùng lối với cờ `HIEN_MORONG` của
> `cophieu.html`, và với `nyLichHTML()` của Thông tin niêm yết.

### FILE PHIÊN CÓ BỐN CHỦ — MỌI LƯỢT GHI PHẢI TRỘN (đã trả giá 21/08/2026)

```
ma          vùng giá khớp lệnh        <- kho_giaodich.py --vg  (phien_ghi)
bang + f    bảng mã của phiên         <- build_phantich.py
la          quét bất thường           <- quet_la.py --phien
dt + dtf    lát cắt ngang cho bộ lọc  <- quet_la.py --phien
```

`phien_ghi` từng đọc lại đúng `.get("ma")` rồi ghi ra `{date, n, ma}` — **vứt sạch ba
khối kia**. Không lộ ra suốt nhiều tuần vì trong lượt EOD, `--vg` chạy **trước**
`build_phantich` nên bảng được dựng lại ngay sau đó. Chạy TAY sau lượt EOD thì không có
gì dựng lại: một lượt `--vg --ma PNJ --tu … --den …` xoá `bang`/`la`/`dt` của **63 file
phiên**, cả trang phân tích trắng bảng và user báo *"sao mất hết data rồi"*.

> **KHÔNG LỖI NÀO BÁO** — file vẫn hợp lệ, vẫn có khối `ma`, `json.load` vẫn chạy. Client
> chỉ thấy `p.bang` rỗng rồi in "phiên này chưa có file dữ liệu", tức **báo sai nguyên
> nhân**: nghe như chưa cào bao giờ, trong khi thật ra vừa bị xoá.
> **Chữa:** `phien_ghi` nay đọc TRỌN file rồi chỉ thay khối `ma`. Ai thêm khối thứ năm
> cũng không phải đụng lại hàm này. Dựng lại bằng `build_phantich.py` +
> `quet_la.py --phien 100`, cả hai đều không gọi mạng.
> **Kèm một va chạm khoá đã sửa luôn:** `phien_ghi` ghi `n` = số mã có vùng giá, còn
> `build_phantich` ghi `n` = số mã trong bảng — **cùng một khoá, hai nghĩa**, lượt nào
> chạy sau thì thắng. Nay vùng giá dùng `nVG`.

### TRANG MỘT MÃ PHẢI ĐỌC TRƯỜNG SÂU, KHÔNG ĐỌC TRƯỜNG VIETSTOCK

Kho có HAI bộ trường cho khối ngoại và tự doanh, cùng nói một chuyện nhưng khác định
nghĩa và khác độ sâu:

| | trường | định nghĩa | độ sâu |
|---|---|---|---|
| Vietstock | `fnMuaGT` + `fnMuaTTGT` | khớp lệnh **tách** thoả thuận | **249 phiên** |
| VNDirect | `fnMuaTG` | **tổng** (gồm thoả thuận) | **1.000 phiên** |

`ptVeMa` từng lấy bộ Vietstock, nên mọi đồ thị khối ngoại và tự doanh của trang mã **đứt
ở tháng 8/2025** dù kho có đủ tới 2022 — user báo đúng chỗ này 22/08/2026. Nay lấy bộ
**TỔNG** cho đồ thị.

> **CHỌN MỘT ĐỊNH NGHĨA, ĐỪNG GHÉP HAI BỘ.** Ghép (`fnMuaTG ?? fnMuaGT` theo từng ô) thì
> đường bị **gãy định nghĩa đúng giữa đồ thị** — trước mốc là tổng, sau mốc là khớp lệnh —
> mà nhìn không ra, còn tệ hơn thiếu dữ liệu. Bản tách vẫn còn nguyên trong kho và vẫn
> hiện ở **thanh đọc số** cho phiên nào có, kèm chữ "khớp lệnh" / "tổng" để phân biệt.

> **MẪU SỐ PHẢI KHỚP TỬ SỐ.** Ô "% giao dịch phiên là của khối ngoại" lấy tử là TỔNG thì
> mẫu phải là TỔNG giao dịch (`mval + pval`), không phải riêng `mval` — chia lệch mẫu là
> thổi tỉ lệ lên đúng bằng phần thoả thuận, mà thoả thuận chiếm **15,1%** giá trị khối
> ngoại toàn kho.

> **CÒN THIẾU: VỐN HOÁ Ở PHIÊN CŨ.** `sh` (số cổ phiếu) chỉ có từ Vietstock nên dừng ở 249
> phiên; ô Vốn hoá của phiên cũ hiện `—`. VNDirect **có** nguồn cho việc này —
> `/v4/ratios` trả `LISTED_SHARES` `OUTSTANDING_SHARES` `TOTAL_SHARES` `MARKETCAP` kèm
> `FREEFLOAT` và `FOREIGN_OWNERSHIP` theo `reportDate` — nhưng chưa cào, vì đó là chuỗi
> theo KỲ BÁO CÁO chứ không theo phiên, phải gióng lại trục.

### ĐÃ XOÁ KHỎI `data/giaodich` (22/08/2026) — `tools/gon_kho.py`, ĐỪNG THÊM LẠI

| trường | MB | vì sao xoá |
|---|---|---|
| `fnMuaPc` `fnBanPc` | 14,9 | **suy ra được**: `fnMuaGT ÷ mval × 100`. Đo 10.623 mẫu, lệch trung vị **0,0000**, p99 0,17% |
| `bMua` `bBan` `bMuaKL` `bBanKL` | 27,9 | giá tốt nhất LÚC ĐÓNG CỬA. Không chỗ nào đọc, không nằm trong tín hiệu nào đã đo, và là ảnh chụp MỘT thời điểm nên không dựng được chuỗi |

Kho **335 → 289 MB**. `kho_giaodich.py` cũng thôi lấy chúng (`FN`, `DL`, `COT`) — bằng
không lượt EOD hôm sau ghi về hết.

**GIỮ LẠI, và đây mới là phần đáng nói — đừng xoá tiếp mấy thứ này:**

- `qMua` `qBan` `nMua` `nBan` (sổ lệnh, 27,5 MB) — **VNDirect KHÔNG CÓ**, và tỉ lệ đặt
  mua/đặt bán là tín hiệu mạnh nhất kho đo được (rank IC +0,082, **t = +12,24**).
- `*TTGT` `*TTKL` (tách thoả thuận, 35,6 MB) — VNDirect chỉ cho TỔNG. Không có bộ này thì
  vĩnh viễn không trả lời được *"khối ngoại mua 130 tỷ nhưng bao nhiêu là sang tay"*.
- `fnSoHuu` `fnRoom` (16,1 MB) — thử suy từ `fnRoomV/sh` và `(fnRoomTong−fnRoomV)/sh`:
  trung vị khớp (0,001 và 0,004) **nhưng p95 lệch 8,9 và 17,4**. Suy ra được "gần đúng"
  thì không phải là suy ra được.
- `sh` `shR` — VNDirect `stock_prices` không có SLCP lẫn vốn hoá.

> **LỰC ĐÒN LỚN NHẤT CÒN LẠI CHƯA DÙNG: 39% KHO LÀ CHỮ `null`.** Đo mẫu 200 file: 38,0 MB
> thì 14,7 MB là chữ `null` — vì cột Vietstock chỉ phủ 249 phiên cuối trong mảng 1.000 ô,
> 751 ô còn lại là `null,null,null…`. Cách gỡ là lưu cột thưa theo dạng `{"o":751,"v":[…]}`
> rồi bung ra lúc đọc — **tiết kiệm ~109 MB mà không mất một con số nào**. Chưa làm vì
> phải sửa 5 nơi đọc (`ptVeMa`, `kho_dactrung`, `quet_la`, `build_phantich`, `kho_vnd`)
> và đó là đổi hợp đồng dữ liệu, cần làm cẩn thận chứ không chen ngang.

### FILE PHIÊN LÊN 1.000 — VÀ BỎ CỘT RỖNG THEO TỪNG PHIÊN

`SO_PHIEN_FILE` 120 → 320 → **1000** (22/08/2026), khớp với `ptCoFile` bên client. **Hai
số này phải bằng nhau**: lệch thì hoặc ô chọn bày ra phiên không có file (bấm vào bảng
trống), hoặc giấu mất phiên đã có file.

Giá phải trả, đo trên file phiên 20/08 — **536 KB**:

```
bang  240 KB  bảng mã            <- thứ DUY NHẤT còn hiện
dt    213 KB  lát cắt cho bộ lọc <- ĐANG TẮT
ma     75 KB  vùng giá khớp lệnh
la      8 KB  quét bất thường    <- ĐANG TẮT
```

Hai chỗ cắt: **bỏ cột rỗng theo từng phiên** (phiên cũ hơn 249 không có một cột Vietstock
nào, để nguyên là mỗi mã gánh một chuỗi `null,null,null…` — nhân 1.525 mã × 1.000 phiên
thì riêng chữ `null` nặng hơn dữ liệu thật), và `quet_la` vẫn chỉ ghi `dt` cho **100 phiên
gần nhất**. Kết quả: phiên cũ còn **15 cột / ~152 KB** so với 25 cột / 536 KB của phiên
mới; cả thư mục **195 MB / 999 file**.

> **AN TOÀN VỚI CLIENT, KHÔNG PHẢI SỬA GÌ:** `ptBang` dựng bảng tra từ chính `p.f`
> (`ix[k]=i`) rồi đọc `v[ix[k]]`, nên cột vắng mặt trả `undefined` — đi đúng nhánh "không
> có số" vốn đã có sẵn.

> **BẪY ĐÃ SUÝT TRẢ GIÁ:** `rm -f data/phien/*.json` rồi mới dựng lại là **xoá mất `ma`
> (vùng giá đã cào), `la` và `dt`** — build_phantich chỉ dựng `bang`, ba khối kia do lượt
> khác ghi. Cứu được nhờ `git checkout -- data/phien`. **Đừng bao giờ xoá thư mục này rồi
> dựng lại;** build_phantich vốn đã trộn vào file cũ, chạy thẳng là đủ.

### TẦNG DÒNG TIỀN NAY LẤY VNDIRECT — `NGUON_DONGTIEN` trong `build_phantich.py`

User chốt 22/08/2026: *"tạm ẩn nguồn Vietstock đi, toàn bộ dùng nguồn VNDirect"*. Ba lý do
đo được:

| | Vietstock | VNDirect |
|---|---|---|
| độ sâu | 249 phiên (chặn cứng 1 năm) | **1.000 phiên** |
| lô lẻ | làm tròn về lô chẵn, 116 ô làm tròn xuống 0 | **có đủ** |
| ô sai đơn vị ×1000 | **112 ô** | **0** |

Đổi lại **mất phần tách khớp lệnh / thoả thuận** (VNDirect chỉ cho tổng). Kho vẫn giữ
nguyên trường Vietstock — đổi hằng số về `"vietstock"` là quay lại được.

> **MỘT ĐỊNH NGHĨA CHO CẢ KHUNG.** Từ khi chuyển nguồn, con số khối ngoại/tự duyệt là
> TỔNG ở mọi phiên, nên mẫu số của "mức tham gia" phải là **tổng giao dịch** (`mval +
> pval`) chứ không riêng khớp lệnh. Chia lệch mẫu là thổi tỉ lệ lên đúng bằng phần thoả
> thuận — 15,1% giá trị khối ngoại toàn kho.

> **`nFn`/`nTd` = 0 NGHĨA LÀ CHƯA CÓ SỐ, KHÔNG PHẢI BẰNG 0.** Kho gộp cộng dồn từ 0 nên
> `fnMua` luôn `!= null`; hỏi `!=null` thì ô hiện "0 tỷ · 0 mã" và đọc ra như *khối đó
> không giao dịch gì*, trong khi sự thật là *nguồn không có số*. Phải hỏi **số mã**.
> VNDirect phủ tự doanh 983/999 phiên; 16 phiên trống nay hiện `—` thay vì `0`.

### VIETSTOCK CÓ Ô SAI ĐƠN VỊ ×1000 — `tools/va_donvi.py`, HAI LUẬT

User mở khung 300 phiên và thấy **"Tự doanh ròng −363.594 tỷ · chiếm 746,1%"** ở phiên
16/12/2025, trong khi cả thị trường phiên đó chỉ khớp 27.803 tỷ. Truy ra **một ô**:

```
MCH 2025-12-16   tdBanGT (Vietstock)  364.000.000.000.000   <- 364 NGHÌN tỷ
                 tdBanTG (VNDirect)       364.000.000.000   <- 364 tỷ
                 tdBanKL / tdBanTKL      2.000.000 cp   (HAI NGUỒN KHỚP NHAU)
```

2 triệu cp × 213.800đ = 427 tỷ → 364 tỷ là số thật. **Chỉ trường GIÁ TRỊ sai, khối lượng
của cả hai nguồn khớp nhau** — nên vá đúng trường giá trị, đừng đụng khối lượng.

Toàn kho có **98 ô** như vậy trên 8 mã (BCG, BVB, MCH…): 47 ô gấp 1000 lần, 51 ô nhỏ đi
1000 lần. Tỉ lệ nhỏ, nhưng **một ô đủ làm hỏng cả một phiên trong kho gộp** vì nó cộng
thẳng vào tổng toàn thị trường.

> **VÌ SAO SỬA ĐƯỢC MÀ KHÔNG PHẢI ĐOÁN:** hai nguồn độc lập, và đẳng thức
> `Vietstock(khớp lệnh + thoả thuận) == VNDirect(tổng)` đúng ở **98,8%** ô khối ngoại,
> **99,5%** ô tự doanh. Tỉ lệ rơi đúng 1000,0 thì không còn cách giải thích nào khác.
> Chỉ động vào ô có tỉ lệ TRÒN 1000; ô lệch vì lô lẻ để nguyên.

**LUẬT 2 — TỰ ĐỐI CHIẾU `GIÁ TRỊ ÷ (KHỐI LƯỢNG × GIÁ)`, KHÔNG CẦN NGUỒN NGOÀI.** Luật 1
đòi có cả hai nguồn ở cùng một ô nên bỏ sót phần VNDirect không phủ. Ca lọt lưới:
**MCH 17/12/2025 `tdBanGT` = 220.000 TỶ** trong khi 1.000.000 cp × 212.500đ = 212,5 tỷ —
đúng ô đẻ ra *"tự doanh ròng −220.196 tỷ · chiếm 706,1%"* user nhìn thấy. Giá trị chia
khối lượng phải ra một mức giá trong tầm phiên (biên độ rộng nhất là ±40% ngày chào sàn),
nên ngưỡng **100 lần** cách mọi biến động thật hai bậc độ lớn. Bắt thêm 14 ô.

> **PHÉP KIỂM NÀY CŨNG XÁC NHẬN `mval` SẠCH:** chạy trên **972.653 ô** thì **0 ô** lệch
> quá 3 lần. Nên phiên 05/08/2025 khớp 80.519 tỷ là số THẬT — tổng `KL × giá` của phiên
> đó ra 79.670 tỷ, lệch 1,1%.

> **BÀI HỌC RỘNG HƠN:** kho một nguồn thì loại lỗi này **không thể phát hiện** — số vẫn
> hợp lệ, vẫn parse được, chỉ sai. Có nguồn thứ hai mới thành một phép kiểm chạy được
> trên toàn kho mà không tốn lượt gọi nào. Đây là lý do thật sự đáng giữ hai nguồn, chứ
> không phải để chạy nhanh hơn.

### GIÁ KHỚP LỆNH TB TỰ TÍNH — VÀ VÙNG GIÁ PHẢI THEO PHIÊN ĐANG GHIM

**`vw = mval / mv`, KHÔNG lấy `AvrPrice` của nguồn.** Hai số khớp nhau ở phần lớn kho —
đo 100.536 ô: trung vị lệch **0,000%**, 91,9% nằm trong 0,5%, 99,3% trong 2% — nhưng lệch
hẳn ở phiên biến động mạnh. Lấy GT÷KL vì nó **định nghĩa ra chính nó** và tự nhất quán
với hai con số nằm ngay cạnh trên màn hình (giá trị và khối lượng), người xem cộng trừ
lại được; còn `AvrPrice` thì không truy được cách nguồn tính. Khi hai số lệch quá 0,5%
thì in kèm số của nguồn để không giấu.

**Ca mẫu — PNJ 08/07/2026**, đáng nhớ vì nó cho thấy giá đóng cửa nói dối tới mức nào:

```
tham chiếu 50.800 · mở 47.250 (ĐÚNG GIÁ SÀN) · thấp 47.250 · cao 52.000 · đóng 52.000 (+2,36%)
giá khớp lệnh TB 48.579  ->  lệch −6,6% so giá đóng cửa
vùng giá: 44,1% khối lượng khớp ở ĐÚNG 49.800 · chỉ 3,5% khớp ở 52.000
```

Cả phiên là một cú kéo từ giá sàn lên, mà nhìn mỗi "đóng cửa 52.000 +2,36%" thì không đời
nào thấy. Vì thế thanh đọc số có ô **Giá khớp lệnh TB** và ô **Biên độ phiên** (mở/cao/
thấp, tự dán nhãn *kịch trần*/*kịch sàn* khi |mở/tham chiếu − 1| ≥ 6,95%).

> **VÙNG GIÁ TỪ NẾN 1 PHÚT: KHỐI LƯỢNG CHÍNH XÁC, GIÁ TRỊ THÌ KHÔNG.** Tổng `v` khớp
> tuyệt đối với `mv` của kho (PNJ 08/07: 25.605.600 = 25.605.600), nhưng `Σ p×v` ra
> 1.271,9 tỷ so với `mval` 1.243,9 tỷ (+2,3%) — vì trong một phút, `Price` là giá CHỐT
> phút đó còn `Vol` là khối lượng cả phút, các lệnh bên trong khớp ở nhiều giá khác nhau.
> Nên **dùng vùng giá để trả lời "khớp ở giá nào", đừng dùng nó để tính VWAP.**

> **VÙNG GIÁ PHẢI LÀ CỦA PHIÊN ĐANG GHIM Ở TRANG MÃ (`d[k]`), KHÔNG PHẢI `PT.ngay`.**
> Bẫy đã dính: ghim phiên 08/07 trên đồ thị mã mà đồ thị vùng giá vẫn vẽ phiên 20/08 —
> im lặng hoàn toàn vì cả hai đều là "một phiên nào đó" nên nhìn không ra, mà đây đúng là
> chỗ trả lời "khối lượng khớp ở giá nào". Kèm theo: **trang mã phải TỰ TẢI file phiên
> đó** — `PT.phien` chỉ chứa phiên người dùng đã mở qua thanh chọn đầu trang, nên ghim
> một ngày khác là bộ đệm rỗng và đồ thị báo "chưa cào" trong khi kho có đủ.

> **KHO VÙNG GIÁ CHỈ CÓ PHIÊN GẦN NHẤT** — lượt EOD chỉ chạy `--vg` cho phiên vừa chốt.
> Cào bù cả kho là 2 lượt × mã × phiên = 1.529 × 100 × 2 ≈ **21 giờ**, không đáng. Muốn
> soi kỹ MỘT mã thì cào riêng nó: `--vg --ma PNJ --tu … --den …` = 2 lượt × 63 phiên
> ≈ **2 phút**. Đó là cách dùng đúng của chế độ này.

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

### SỨC DỰ BÁO — ĐO LẠI TRÊN 999 PHIÊN (22/08/2026). BẢNG 99 PHIÊN CŨ ĐÃ SAI, ĐỪNG TRÍCH.

Rank IC cắt ngang từng phiên, tín hiệu ngày t → lợi suất phiên t+1, lọc mã khớp ≥1 tỷ:

| tín hiệu | rank IC | t | phiên |
|---|---|---|---|
| KL đặt mua / đặt bán (log) | +0,082 | **+12,24** | 248 |
| Biên độ ngày (H−L)/C | −0,043 | **−8,66** | 999 |
| % thay đổi hôm nay | +0,024 | **+4,98** | 999 |
| Khối ngoại ròng khớp lệnh / GT | +0,021 | +2,75 | 248 |
| Khối ngoại ròng TỔNG (kèm thoả thuận) | +0,021 | +2,72 | 248 |
| Vòng quay trên free float | −0,015 | −1,29 | 299 |
| Tự doanh ròng / GT | −0,011 | −1,26 | 242 |
| Đóng cửa so VWAP | +0,005 | +1,11 | 999 |
| Tỉ trọng thoả thuận | +0,001 | +0,29 | 999 |

> **HAI TÍN HIỆU TỪNG "CHẮC" ĐÃ BỐC HƠI KHI CÓ THÊM DỮ LIỆU.** Đo trên 99 phiên thì
> *vòng quay free float* ra t = −3,29 và *tỉ trọng thoả thuận* ra t = +2,51; đo lại trên
> 299 và 999 phiên thì còn **−1,29** và **+0,29**. Không phải kho sai — mẫu 99 phiên
> đơn giản là quá ngắn, đúng cảnh báo đã ghi khi công bố bảng cũ. Đây là bài học đắt hơn
> bất kỳ con số nào trong bảng: **đừng chốt nhân tố trên vài tháng dữ liệu.**

> **MỘT LỖI ĐỊNH NGHĨA ĐÃ SỬA.** Bảng cũ có dòng *"khối ngoại ròng CHỈ KHỚP LỆNH t=+2,50,
> nhỉnh hơn bản gộp +2,44"* — tính bằng `(mua − muaTT) − (bán − bánTT)`, tức **trừ thoả
> thuận ra khỏi một số vốn không gồm nó**. `fnMuaGT` của Vietstock LÀ khớp lệnh rồi.
> Nay so đúng: khớp lệnh +2,75 so với tổng +2,72 — **gần như bằng nhau**, tách hay không
> tách không đổi được sức dự báo.

> **`% thay đổi hôm nay` DƯƠNG nghĩa là ĐÀ chứ không phải ĐẢO CHIỀU** — mã tăng hôm nay
> có xu hướng tăng tiếp phiên sau. Bảng 99 phiên cho t = +0,70 (vô nghĩa); 999 phiên cho
> **+4,98**. Đổi hẳn kết luận.

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

**`assets/chart.js`** — hai đường phủ `Vốn hoá`/`chỉ số sàn`: xem mục **HAI ĐƯỜNG PHỦ TRÊN
CHART NẾN CỦA TRANG MÃ** ngay dưới. **EMA khác MA, phải tính DỒN từ đầu chuỗi.** MA cắt cửa sổ `per` kỳ
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

### LƯU THÔNG ĐANG ĐỂ TRỐNG — BA ĐỊNH NGHĨA, KHÔNG CÁI NÀO SẠCH (24/08/2026)

**User chốt: *"để trống cho tới khi có nguồn sạch"*.** Cờ `CONG_BO = False` trong
`tools/kho_luuthong.py`. Số VẪN ĐƯỢC TÍNH mỗi lượt EOD và ghi vào `ffSo`; chỉ không đổ sang
`freeFloat` — trường mà `build_phantich` đọc để nướng `ff` vào file phiên. **Bật lại: đổi cờ
thành `True` rồi chạy lại `build_phantich`.**

**BA CON SỐ, MỖI CON ĐÚNG THEO MỘT ĐỊNH NGHĨA — BID là ca mẫu:**

| | BID | hỏng ở đâu |
|---|---|---|
| thô từ sổ cổ đông | **4,01%** | **MẪU SỐ CŨ** — mọi tỉ lệ trong `data/profile` quy ra tổng **5.700.279.376 cp** trong khi mã đó nay có **7.778.261.912** |
| cuộn tới hôm nay | **9,06%** | phải GIẢ ĐỊNH cổ đông lớn nhận đủ cổ tức cổ phiếu và không tham gia phát hành riêng lẻ — mà sổ cổ đông **không có ngày chụp** nên không kiểm được |
| dải chỉ số (DNSE · 24hMoney) | **6,00%** | không phải số đo — xem ngay dưới |

> **6% CỦA 24hMONEY VÀ DNSE LÀ DẢI LÀM TRÒN, KHÔNG PHẢI SỐ ĐO.** Số cổ phiếu 24hMoney công
> bố (`free_float: 466695714`) đúng bằng `0,06 × 7.778.261.912`, tức **suy TỪ tỉ lệ** chứ
> không phải đo rồi chia. Và tỉ lệ của họ rơi vào dải: **bội số 5%** với mã trên 20% (0,40 ·
> 0,60 · 0,70 · 0,75 · 0,85 · 0,95) và **bội số 1%** với mã nhỏ (0,15 · 0,11 · 0,06 · 0,04).
> Chỉ **VGI 0,972426%** và **ACV 4,60416%** giữ đủ chữ số — đúng nhóm quá nhỏ để rơi vào dải
> nào. Đây là quy ước làm tròn free-float mà HOSE dùng để tính trọng số chỉ số.

> **ĐIỀU KIỆN ĐỂ BẬT LẠI:** sổ cổ đông có **NGÀY CHỤP**, hoặc một nguồn trả thẳng số cổ phiếu
> tự do chuyển nhượng THEO PHIÊN. Có ngày chụp là cuộn tới hôm nay được mà không phải đoán.

> **`build_phantich` PHẢI TRẢ `mcapFF = None` KHI `nFF = 0`, TUYỆT ĐỐI ĐỪNG ĐỂ 0.0.** Số 0 là
> một con số: client in ra *"giao dịch được 0 tỷ · 0,0% lưu thông"*, đọc như cả thị trường
> không có cổ phiếu nào mua bán được. Từ khi tắt công bố thì đây là nhánh CHẠY THẬT, không
> phải trường hợp hiếm. Đo lại sau khi vá: ô toàn thị trường bỏ hẳn dòng lưu thông, bảng mã
> hiện `—` ở cả `Lưu thông` lẫn `Vốn hoá LT`.

**PHẦN TÍNH TOÁN GIỮ NGUYÊN, ĐỪNG XOÁ** — nó là thứ để bật lại, và là thứ đã chứng minh nguồn
cũ sai. Chi tiết ở mục dưới.

### LƯU THÔNG TỰ TÍNH TỪ SỔ CỔ ĐÔNG — `tools/kho_luuthong.py` (24/08/2026)

User: *"lưu thông của nhiều mã cần xác định lại. ví dụ DNSE ghi nhận BIDV có lưu thông 6%
trong khi chúng ta chỉ ghi 2%. cần kiểm tra và lưu lại tỉ lệ lưu thông cho toàn bộ các mã"*.

**`freeFloatRate` CỦA SIMPLIZE LÀ ƯỚC LƯỢNG THEO DẢI, KHÔNG PHẢI TỈ LỆ TÍNH RA** — đo trên
988 mã có cả hai số:

- lệch sổ cổ đông của **chính nó** trung vị **10,17 điểm %**, p75 23,9 · p90 40,4;
- **48% giá trị là số NGUYÊN**, dồn vào bội số của 5: 35 · 40 · 30 · 20 · 10 · 25 · 45 · 50;
- BID ghi **2,6%** trong khi sổ cổ đông ngay trong cùng file nói rõ: Ngân hàng Nhà nước
  **80,99%** + KEB Hana Bank **15,00%** = 95,99% → còn **4,01%**.

**CÁCH TÍNH NAY LÀ MỘT CÂU, AI CŨNG KIỂM LẠI ĐƯỢC BẰNG BẢNG CỔ ĐÔNG NGAY TRÊN TRANG:**

```
lưu thông = 100% − tổng tỉ lệ của các cổ đông nắm từ 5% trở lên
```

> **NGƯỠNG 5% KHÔNG PHẢI SỐ CHỌN BỪA** — đó đúng là mốc "cổ đông lớn" mà Luật Chứng khoán
> bắt công bố, nên cũng là ranh giới của thứ mình NHÌN THẤY. Dưới mốc đó `data/profile` đã
> lọc bỏ cổ đông cá nhân (quyết định về dữ liệu cá nhân, xem mục *Cổ đông*) — có muốn trừ
> cũng không có số.

> **HỆ QUẢ PHẢI BIẾT: đây là CẬN TRÊN của lưu thông.** Mã mà người nội bộ nắm rải rác mỗi
> người dưới 5% thì phần đó không trừ được — FPT ra 87,3%, MWG 89,5%. Với mã có cổ đông chi
> phối lộ diện (nhà nước, tập đoàn mẹ, nhà sáng lập) thì con số là ĐÚNG, không phải cận trên:
> BID 4,01 · VCB 10,20 · VGI 0,97 · ACV 4,59 · GVR 3,23 · CTG 15,81.

> **ĐÃ THỬ MIỄN TRỪ QUỸ ĐẦU TƯ RỒI BỎ.** Lý lẽ nghe xuôi (cổ phiếu quỹ nắm vẫn mua bán hằng
> ngày) nhưng nó đẻ ra số không tin được: **STB ra đúng 100,00%** vì cổ đông ≥5% duy nhất là
> một quỹ nắm 5,21%. Không doanh nghiệp niêm yết nào có 100% cổ phiếu tự do chuyển nhượng, mà
> một con số như thế nhảy thẳng lên đầu mọi bảng xếp theo lưu thông. Thêm nữa nó bắt phải
> NHẬN DẠNG tên quỹ bằng từ khoá — nhận nhầm một công ty mẹ thành quỹ là thổi lưu thông lên
> mà không có gì báo.

> **KHÔNG CÓ AI TỪ 5% TRỞ LÊN = ĐỂ TRỐNG, ĐỪNG TRẢ VỀ 100%.** Nhìn thì giống "công ty đại
> chúng thật sự", soi ra toàn là sổ cổ đông KHUYẾT: **AMV đúng 1 dòng tổng 3,05%**, DDG 1
> dòng 0,94%, DRH 1 dòng 0,29%, HQC 2 dòng 0,36%; **EIB 13 dòng mà tổng chỉ 6,85%** trong
> khi mã đó có cổ đông tổ chức nắm hàng chục phần trăm. Không phân biệt được *"không có cổ
> đông lớn"* với *"nguồn chưa ghi cổ đông lớn"* thì 100% là đẩy đúng nhóm KHÔNG BIẾT GÌ lên
> đầu bảng. Chặn 18 mã.

**BỐN NGUỒN KHÁC ĐÃ ĐO VÀ LOẠI — đừng dò lại:**

| nguồn | vì sao loại |
|---|---|
| VNDirect `ratioCode:FREEFLOAT` | thực chất là `1 − TOTAL_INTERNAL_OWNERSHIP`, **bỏ qua sở hữu nhà nước**: báo **VGI 100%** trong khi Viettel nắm 99,03%; BID 89%, VCB 89,97% |
| `STATE_OWNERSHIP` + `TOTAL_INTERNAL_OWNERSHIP` | hai trường điền KHÔNG NHẤT QUÁN: GVR có NN 0% / nội bộ 96,77%, còn BID có NN 59,35% (thật 80,99%) / nội bộ 0,01% → `1−NN−nb` ra 40,6% cho BID |
| khối `own` của Simplize | tự mâu thuẫn — 32 mã tổng vượt 100%, POB ra **−84,3%**, KTC **−106,1%** |
| HOSE và DNSE | không mở endpoint nào trả tỉ lệ free-float (đã dò `api.hsx.vn` indices · index-constituents · stock-info, và 6 đường của `services.entrade.com.vn`) |

**CÁI GIÁ, BIẾT TRƯỚC: ĐỘ PHỦ 1.432 → 1.009 MÃ.** 467 hồ sơ không có sổ cổ đông và phần lớn
là do NGUỒN không có (hỏi thẳng Simplize: `shareholderDetails` trả mảng rỗng), cộng 32 mã sổ
tổng vượt 100% và 18 mã không ai đạt 5%. Điền số ước lượng vào đó là quay lại đúng thứ vừa
bỏ — trang in *"kho chưa đủ sổ cổ đông để tính"*.

> **VỐN HOÁ LƯU THÔNG TOÀN THỊ TRƯỜNG ĐỔI TỪ 20,1% LÊN 36,9%** (3.798 nghìn tỷ). Hai thứ
> cùng đẩy: số từng mã sát hơn, và mẫu chỉ còn mã tính được. Đừng so con số này với bản ghi
> cũ trong mục *FREE FLOAT* — mục đó đã dán cảnh báo lỗi thời.

**BƯỚC `[3b]` CỦA LƯỢT EOD, ĐỨNG TRƯỚC `build_phantich`** (bước đó nướng `ff` vào file phiên).
KHÔNG gọi mạng, ~1 giây. **Phải chạy MỖI NGÀY**: `refresh_daily.work_prof` dựng lại hồ sơ 3
ngày một lần bằng một dict MỚI, tức nó trả `freeFloatRate` của nguồn về cho `freeFloat` và
xoá luôn `ffNguon` — chạy lại mỗi ngày thì số luôn được tính lại từ sổ cổ đông vừa cào.
`ffNguon` giữ số cũ của nguồn để còn đối chiếu; `ffN` là số cổ đông lớn đã trừ.

> Nhãn ô đọc số phải NÓI RA PHÉP TÍNH — *"100% trừ phần các cổ đông nắm từ 5% trở lên"* —
> chứ đừng để câu cũ *"% cổ phiếu đang thật sự lưu thông"*: câu đó nghe như một con số đo
> được, trong khi nó là một phép trừ mà người đọc cộng lại kiểm được ngay dưới trang.

### HÀNG NÚT CHART NHỎ CÒN SÁU Ô, HAI CÔNG TẮC MỐC VÀO TRONG KHUNG (24/08/2026)

User: *"h đang bị sắp xếp khá nhiều ô chọn, tôi muốn trên giao diện điện thoại cần gọn hơn.
bỏ ô sức mạnh đi. ô hiện hoặc ẩn cổ tức và bctc nằm trong khung đồ thị luôn. EMA cũng bỏ luôn
— chỉ có trong phân tích kỹ thuật thôi, RSI vẫn giữ lại"*.

| | trước | sau |
|---|---|---|
| `#cvInd` (chart nhỏ) | 11 nút | **6**: EMA200 · RSI · Nến · Khối lượng · Vốn hoá · VN-Index |
| `#ptInd` (toàn màn hình) | 15 nút | **9** (bỏ Cổ tức/BCTC · Sức mạnh · cả hàng MA20/50/200) |
| khổ 375px | 3 hàng · ~85px | **2 hàng đều nhau · 56px** |
| khổ máy bàn | 2 hàng | **1 hàng · 27px** |

> **ĐƯỜNG MẶC ĐỊNH LÀ MA200, KHÔNG PHẢI MA20 (user chốt 24/08/2026).** Chart của trang mã
> nay bày tới 13 năm nến cạnh vốn hoá và chỉ số; ở tầm đó một trung bình 20 phiên chỉ là cái
> bóng chạy sát đường giá, không nói được gì. Đổi ở `ind` của `chart.js` (một chỗ) rồi sửa
> `class="on"` cho khớp ở **cả hai** hàng nút — lệch một chỗ là nút bảo MA200 đang bật trong
> khi chart vẽ MA20, và không có gì báo. `bubbles.html` không có nút MA nào nên nó ăn theo
> mặc định mới; panel đó tải 5 năm nến nên MA200 vẫn tính được.
>
> **MA200 ĐỔI SANG XÁM THÉP `rgba(148,163,184,.95)`, bỏ tím tía.** Nó nay LUÔN BẬT, mà tím
> `rgb(192,38,211)` đứng cạnh hồng sen của VN-Index quy đổi `rgb(219,39,119)` thì lệch nhau
> đúng một kênh (ΔG=1, ΔR=27) — nhìn ra hai đường thì được, nhưng cùng đọc là "hồng tím" nên
> mắt phải dừng lại phân biệt, đúng chỗ không nên phải dừng. Xám cũng ĐÚNG VAI: MA200 là cái
> NỀN để so, hai nhân vật của đồ thị là vốn hoá (xanh lá) và chỉ số (hồng sen). **MA20 giữ
> hổ phách, MA50 giữ xanh trời** — hai nút đó chỉ còn ở cửa sổ PTKT, đổi màu chúng là đổi
> thứ người dùng PTKT đã quen.

**HÀNG KHUNG THỜI GIAN: `1D · 1W · 1M · 1Y`, VÀ CHART NHỎ BỎ "TRONG NGÀY"** (25/08/2026,
user: *"mục này cũng hơi rườm rà, nên bỏ trong ngày đi, còn lại thì đổi thành 1D 1W 1M 1Y"*).
Nến 5 phút **vẫn còn nguyên ở cửa sổ PTKT** — đó mới là chỗ người ta soi trong phiên; chart nhỏ
là thứ nhìn đầu tiên khi mở trang.

> **ĐỪNG DỌN NHÁNH `tf==='i'` TRONG JS.** Không còn nút nào trên `#tf` sinh ra giá trị đó, nhưng
> `#ptTf` vẫn có, và `khoaPhuTheoKhung` · `rsH=0` khi `iv==='i'` · nhánh nến 5 phút của
> `loadChart`/`ptLoad` đều còn phải xử đúng. `tf` mặc định `'D'` và KHÔNG lưu localStorage nên
> không có người dùng nào đang kẹt ở khung `i` sau khi bỏ nút.

**HÀNG MA20/50/200 ĐÃ BỎ KHỎI PTKT (25/08/2026)** — user: *"trong PTKT cũng bỏ ô chọn
ma20-50-200 đi"*. Đường xu hướng mặc định của CẢ HAI chart nay là **EMA200**, nên `ind` mặc
định trong `chart.js` đổi từ `ma:[200], ema:[]` sang `ma:[], ema:[200]`.

- **`bubbles.html` ăn theo**: trang đó dùng chung `ind` mặc định và không có nút chỉ báo nào,
  nên chart chi tiết ở đó cũng chuyển sang EMA200. Đổi mặc định là đổi cả hai trang.
- **`EMACOL[200]` đổi sang xám thép** `rgb(148,163,184)` (màu MA200 cũ để lại). Fuchsia
  `rgb(232,121,249)` đứng cạnh đường nền hồng sen `rgb(219,39,119)` là lặp lại đúng cái bẫy đã
  ghi ở `MACOL` — hai màu lệch quá ít, chạy sát nhau thành một vệt.
- **Nhánh `ma` trong `batChiBao` giữ nguyên** dù không còn nút nào gọi tới: nó vẫn đúng nếu sau
  này thêm lại một nút MA, và xoá đi chẳng tiết kiệm được gì.
- **Nút `rs` "Sức mạnh" cũng bỏ khỏi `#ptInd`** cùng lượt. Nó điều khiển đúng cái cờ mà ô công
  tắc "Cách nền" trong khung đồ thị đang điều khiển, mà hai chỗ không đồng bộ được trạng thái
  sáng/tối — bấm trong khung xong thì nút ngoài vẫn sáng, đọc ra là nút hỏng.

**BỐN THỨ ĐÃ DỌN KHỎI HÀNG NÚT CỦA CHART NHỎ — ĐỪNG THÊM LẠI:**
· **EMA50** → chỉ còn ở cửa sổ Phân tích kỹ thuật. Chart nhỏ là thứ NHÌN ĐẦU TIÊN khi mở
  trang mã, không phải bàn làm việc PTKT. **EMA200 thì Ở LẠI** — từ 25/08/2026 nó là đường xu
  hướng mặc định, thay chỗ MA200 (user: *"đổi MA200 thành EMA200"*).
· **Cổ tức/BCTC** → vào TRONG khung đồ thị, vì chúng điều khiển thứ vẽ trên chính khung đó.
· **Sức mạnh** → bỏ khỏi CẢ HAI hàng nút. Từ 25/08/2026 nó thành dải `Cách nền` và bật bằng
  **ô công tắc trong khung**, cùng chỗ với Cổ tức/BCTC — xem mục *SỨC MẠNH SO VỚI CHỈ SỐ*.

**HAI Ô CÔNG TẮC TRONG KHUNG (`mocHit` trong `chart.js`)** — hàng thứ ba của góc trái trên,
dưới tên mã và dòng chú thích. Ô đang bật thì nền đặc chữ nghịch, tắt thì nền mờ chữ xám.

> **VỊ TRÍ CỐ ĐỊNH, ĐỪNG NỐI ĐUÔI DÒNG CHÚ THÍCH.** Dòng chú thích dài ngắn theo số chỉ báo
> đang bật (`— MA20 — Vốn hoá — VN-Index quy đổi`), nối vào đó là hai cái ô **nhảy chỗ mỗi
> lần bật/tắt một đường**. Thứ bấm được thì phải đứng yên một chỗ.

> **HAI CỔNG, THIẾU CỔNG NÀO CŨNG HỎNG MỘT CHỖ KHÁC.** `plotH>=150` (cùng ngưỡng với dấu
> CPVN.IO): panel bong bóng cao 110px, đặt ô ở hàng thứ ba là nó nằm giữa vùng vẽ. Và
> `sukien.length`: `bubbles.html` không bao giờ gọi `setSuKien` nên hai ô đó ở đó là hai cái
> nút không điều khiển gì.

> **THỨ TỰ NHẬN CÚ BẤM: ô công tắc TRƯỚC, rồi mới tới hình vẽ / ghim phiên.** `bamMoc` chạy
> đầu `mousedown` và `touchstart`, trúng thì **nuốt luôn** cú bấm (không đặt `drag`) nên
> `mouseup` không thấy `drag` và không ghim. Chỉ chạy khi KHÔNG có công cụ vẽ nào đang chọn —
> đang cầm bút mà bấm vào góc đó thì vẫn phải là vẽ.

**KHỔ HẸP: `#cvInd` LÀ LƯỚI 3 CỘT** (`repeat(3,1fr)`), cho hai hàng ĐỀU NHAU, mép trái và
mép phải hai hàng thẳng nhau — đúng cách đã dùng cho `#finP`/`#finB`. Sáu nút chảy tự do ở
375px cần **362px** mà chỗ chỉ có **309px**, nên nó rớt thành **5+1**: "VN-Index" đứng lẻ loi
một hàng, trông như lỗi chứ không như thiết kế. Lưới còn làm nút rộng ra **100px**, ngón tay
bấm dễ hơn hẳn.

> **ĐÃ ĐO RỒI BỎ: ép một hàng bằng cách hạ cỡ chữ.** Phải xuống `padding 5px · font 11px ·
> gap 2px` mới vừa (301px/309px) — lúc đó nút "RSI" teo còn 30px, vừa khó đọc vừa khó bấm,
> và ở khổ 360px thì lại rớt hàng. Tiết kiệm được 30px trên màn 812px, không đáng.

> Neo luật vào `#cvInd` chứ đừng để `.ptseg` trần — cùng bài học với `#ptHead .ptseg` ngay
> trên nó: `.ptseg` còn dùng cho thanh nút của cửa sổ toàn màn hình.

### /PHANTICH DÙNG CHUNG LUẬT CHỈ SỐ VỚI TRANG MÃ (23/08/2026)

User: *"bên data phân tích cũng hiện chỉ số vnindex - vốn hoá theo quy tắc này (mã sàn nào
thì chỉ số sàn đó), chỉ khác là show khối lượng của từng nhóm theo từng phiên trong 1.000
phiên thôi"*. Ba thứ đổi, đúng ba thứ:

**① CHỈ SỐ THEO SÀN CỦA MÃ.** `PT_IDX_SAN` — **bảng này phải giống hệt `IDX_SAN` của
`cophieu.html`**. Một tên hiển thị dùng cho CẢ nút, ô chú thích lẫn nhãn ô đọc số, khai một
chỗ để ba chỗ không trôi khỏi nhau. Kiểm trên KSF (HNX): nút `HNX-Index` · chú thích
`HNX-Index quy đổi` · ô đọc số `HNX-Index = 319,44`.
> Ô đọc số PHẢI đổi theo, không chỉ đường vẽ — bằng không nó in điểm VN-Index cho một mã HNX
> trong khi đường trên đồ thị là HNX-Index: hai con số của hai thị trường khác nhau đứng cạnh
> nhau mà không có gì báo.

**② NEO CỨNG THEO TRUNG BÌNH LOGA** (`neoLoga`), thay `neoTrungBinh` (trung bình CỘNG):

```
k        = exp( TB(log vốn hoá) − TB(log chỉ số) )   trên GIAO các phiên có cả hai
đường vẽ = k × chỉ số(i)
```

Vì sao phải đổi: chỗ hai đường cắt nhau **chỉ phụ thuộc `k`**, nên hai trang dùng hai phép
neo khác nhau là *cùng một mã, cùng một câu hỏi, hai chỗ cắt khác nhau*. Trung bình loga còn
hợp với thang loga của trục — nó đặt cho TB của `log(vốn hoá) − log(k×chỉ số)` bằng 0, tức
hai đường cân nhau NGAY TRÊN THANG ĐANG VẼ. Bảo đảm có điểm cắt vẫn còn nguyên.
> `neoTrungBinh` GIỮ LẠI dù không chỗ nào gọi: nó là phép neo của bản cũ và là thứ để đối
> chiếu khi nghi ngờ. Đừng "dọn rác".

**③ TRỤC NGOÀI CÙNG CHUYỂN SANG THANG LOGA** (`cfg.phai2.loga`). `lo3`/`hi3` giữ trong không
gian loga, nhãn `Math.exp` ngược ra nên **không cách đều nhau về giá trị** — đó cũng là dấu
hiệu duy nhất báo cho người đọc biết đây là thang loga.

> **KIỂM THANG LOGA BẰNG TỈ LỆ BA ĐIỂM, đừng đo bằng hồi quy trên toàn đường.** Tỉ lệ
> `(y_đáy − y_cuối) ÷ (y_đáy − y_đỉnh)` tự triệt tiêu `padT`, `plotH` và cả `lo3/hi3`, nên
> chỉ còn phụ thuộc phép biến đổi. GVR 1.000 phiên: đo được **0,7744**, loga dự đoán
> **0,7670**, thang thường dự đoán 0,6182 — loga sai lệch nhỏ hơn **21 lần**.

> **HAI CÁI BẪY ĐÃ ĂN TRỌN MỘT VÒNG ĐO SAI, ghi lại để khỏi mất công lần nữa:**
> ① **Nhãn trục phải thứ hai được TÔ ĐÚNG MÀU ĐƯỜNG** (luật cũ, cố ý) — nên quét pixel tìm
> đường xanh mà không chặn ở mép vùng vẽ là bắt luôn chữ của nhãn trục, ra một "điểm cuối"
> nằm tận x=2620 trong khi vùng vẽ kết thúc ở **x=2410**. Tìm mép bằng khoảng trống ≥30 cột.
> ② **Đổi `assets/*.js` mà KHÔNG đổi `?v=` thì trình duyệt trả bản CŨ** — phép thử A/B
> "bật/tắt loga" cho ra hai kết quả giống hệt nhau và suýt kết luận là cờ không chạy. Đúng
> cái bẫy đã ghi ở mục *Quy ước toàn site*, chỉ khác là lần này nó cắn vào phép ĐO.

**`k` CỦA HAI TRANG KHÔNG BẰNG NHAU, VÀ ĐÓ LÀ ĐÚNG.** Cùng công thức nhưng khác MIỀN: trang
mã neo trên toàn bộ `data/vonhoa` (tới 3.412 phiên), /phantich neo trên đúng khung đang chọn
(100/300/600/1.000 phiên của `data/giaodich`). Phép đọc vì thế cũng khác một nhịp — *"đắt/rẻ
so với mức trung bình của CHÍNH KHUNG đang xem"* — đúng như đã ghi cho `neoTrungBinh`. Muốn
hai trang trùng chỗ cắt thì phải xem cùng một khoảng thời gian.

**CÁI KHÁC BIỆT CỦA /PHANTICH GIỮ NGUYÊN**: cột giá trị giao dịch tách theo KHỐI (khối ngoại
· tự doanh · còn lại · thoả thuận) từng phiên. Đó là thứ trang mã không có và là lý do trang
này tồn tại.

### GHIM MỘT PHIÊN ĐỂ ĐỌC SỐ, VÀ TẮT ĐƯỢC THÂN NẾN (23/08/2026)

User chốt hai việc: *"hiện thêm toạ độ tam giác khi tôi bật chỉ báo vnindex lên, bấm vào sẽ
hiện ra điểm vnindex - vốn hoá - giá cổ phiếu tại vị trí tôi bấm, để đọc nhanh tình hình tại
thời điểm đó"* và *"có thể chọn ẩn biểu đồ giá đi để dễ xem vốn hoá và vnindex hơn"*.

**GHIM: bấm một cái là hai tam giác kẹp lấy cột đó + hộp bốn dòng.**

```
15/05/2026
Giá        37.750 đ
Vốn hoá   151.000 tỷ     (xanh lá)
VN-Index    1.821,60     (hồng sen)
```

> **NEO THEO MỐC THỜI GIAN, KHÔNG NEO THEO CHỈ SỐ NẾN.** Chỉ số đổi mỗi lần kéo khung (`i0`
> chạy) và đổi hẳn khi bấm Tuần/Tháng/Năm (số nến co còn một phần mười). Neo bằng `t` thì
> ghim ở đâu vẫn đứng đúng chỗ đó — đo: ghim 22/06/2026 rồi đi hết D→W→M→Y→D và phóng 5 nấc,
> cả sáu lượt vẫn trả về đúng 22/06/2026. Khung gộp thì mốc rơi vào GIỮA một cây nến tuần —
> lấy cây CHỨA nó, đừng đòi khớp tuyệt đối rồi trả về "không có".

> **PHÂN BIỆT BẤM VỚI KÉO BẰNG QUÃNG ĐƯỜNG (4px).** Chuột ai cũng nhích một chút lúc nhả;
> không có ngưỡng thì mỗi lần kéo chart xong lại ghim nhầm một phiên. Đo: kéo 108px thì mốc
> ghim giữ nguyên. Bấm lại ĐÚNG cột đang ghim = bỏ ghim.

> **CHỈ BẬT KHI CÓ ĐƯỜNG/DẢI SO SÁNH (`ind.vh || ind.idx || ind.rs`).** Chart này có sẵn bộ
> công cụ vẽ PTKT nên đổi hành vi của cú bấm là chuyện phải có lý do; không bật cái nào thì
> hộp chỉ lặp lại đúng thứ dòng chú giải trên đầu đã in khi rê chuột. Đo: tắt cả ba rồi bấm
> trúng nến — không ghim gì. **`rs` được thêm vào 27/08/2026**: trước đây loại nó ra vì hộp
> kéo theo một thanh dọc xuyên vùng giá chỉ để đọc một số nằm ở dải dưới — thanh dọc đã bỏ,
> và user chốt là bấm vào chính dải đó phải hiện hộp, nên lý do cũ hết hiệu lực.

**BẤM TRÚNG DỮ LIỆU MỚI GHIM (27/08/2026).** User: *"tôi muốn khi nhấn vào đường giá hoặc
nhấn vào khoảng trống là sẽ biến mất; nhấn vào đường giá hoặc VN-Index hoặc biểu đồ (so với
VN-Index — neo) mới xuất hiện"*. Bản trước **chỉ xét X** — bấm bất kỳ đâu trong vùng vẽ là
ghim, kể cả khoảng trắng mênh mông trên/dưới nến. Vùng giá phần lớn LÀ chỗ trống, nên xác
suất bung hộp ngoài ý muốn cao hơn hẳn xác suất cố tình bấm, mà hộp thì che đúng chỗ đang đọc.

| bấm vào | kết quả |
|---|---|
| đường giá (bật nến: cả thân lẫn bóng) | ghim phiên đó |
| đường chỉ số · đường vốn hoá | ghim phiên đó |
| **bất kỳ đâu trong khung dải "So với chỉ số"** | ghim phiên đó |
| đúng cột đang ghim | bỏ ghim |
| chỗ trống, đang có hộp | **tắt hộp**, nuốt cú bấm |
| chỗ trống, không có hộp | không làm gì, trả `false` cho việc khác |

> **DÒ THEO ĐOẠN, KHÔNG THEO MỘT ĐIỂM.** Trong bề ngang một cột, đường đi từ giá trị nến
> TRƯỚC sang nến SAU; lấy mỗi giá trị tại cột đó rồi so thì đoạn nào dốc là bấm trúng nét vẫn
> báo trượt. Ngưỡng `NGUONG_GHIM = 8px` — vừa tay cho cả chuột lẫn ngón mà không nuốt chỗ trống.

> **DẢI TÍNH CẢ KHUNG, KHÔNG ĐÒI TRÚNG NÉT.** Dải là một khung riêng: bấm đâu trong đó cũng là
> đang trỏ vào chính nó, mà đòi trúng nét trong một dải cao 18% màn hình là bắt bí. Hình học
> dải (`geo.rsTop` / `geo.rsBh`) và hàm quy vốn hoá ra y (`geo.yVH`) nay **đẩy ra `geo`** —
> lớp bấm nằm ngoài `draw()` nên không thấy biến cục bộ trong đó; đoạn vẽ dải đọc lại đúng hai
> số ấy chứ không tự tính, giữ một nguồn duy nhất.

> **CHỈ TAM GIÁC, KHÔNG CÓ THANH DỌC (sửa 27/08/2026).** User: *"nên bỏ thanh dọc khi nhấn
> chuột trên biểu đồ đi"*. Bản 23/08 vừa viết ra lý do "vạch dọc cắt ngang chính dữ liệu đang
> xem nên dùng tam giác" vừa **vẫn vẽ cả vạch dọc** — hai tam giác kẹp trên/dưới đã chỉ đủ
> đúng cột rồi, cái vạch chỉ thêm một nét chạy suốt vùng giá. Phân biệt với thanh ngắm nay ở
> **CHỖ ĐỨNG**, không ở nét: thanh ngắm là nét đứt chạy theo chuột, tam giác bám mép trên/mép
> dưới và đứng yên. Cùng bài học đã ghi ở mục *GHIM PHIÊN* của /phantich.

> **HỘP IN SỐ ĐẦY ĐỦ, KHÔNG RÚT GỌN.** Dòng chú giải trên đầu phải nhét O/H/L/C/%/KL vào một
> hàng nên `35.3K` là đúng ở đó; hộp này người ta BẤM RA để đọc một con số cụ thể, mà `35.3K`
> thì không biết 35.300 hay 35.349.

> **CẢM ỨNG: chạm một lần = ghim, chạm hai lần vẫn = về khung mặc định.** Nhánh `chamTron` đã
> có sẵn từ lượt làm cử chỉ cảm ứng nên chỉ cắm thêm một dòng.

**ẨN NẾN (`ind.nen`, nút `Nến`, mặc định BẬT).**

> **TẮT NẾN KHÔNG ĐỤNG TỚI THANG GIÁ.** Trục vẫn khít theo đỉnh/đáy của chính mấy cây nến
> đang ẩn, nhờ vậy MA/Bollinger và **mọi hình vẽ PTKT vẫn đứng nguyên chỗ cũ**. Bật/tắt nến
> là đổi thứ NHÌN THẤY, không đổi hệ toạ độ — cho thang co lại theo mấy đường còn hiện thì ẩn
> nến một cái là hình vẽ trôi đi mất, mà hình vẽ neo theo (thời gian, giá) chính là thứ cả
> lớp vẽ dựa vào.

> **VẠCH GIÁ MỚI NHẤT ĐI THEO NẾN**, không đi theo khung chart. Giữ lại khi đã ẩn nến thì còn
> đúng một vạch xanh/đỏ và một thẻ giá lơ lửng giữa khung, đọc ra như đường giá vẫn còn ở đâu
> đó mà không thấy.

> **MA/EMA/Bollinger/khối lượng KHÔNG tắt theo** — mỗi thứ đã có nút riêng. Ẩn nến mà MA20 vẫn
> chạy là đúng ý người bấm: họ tắt THÂN NẾN cho đỡ rối, không tắt mọi thứ liên quan tới giá.

### KHO VỐN HOÁ SÂU — `data/vonhoa`, HOSE lùi tới 02/01/2013 (23/08/2026)

User: *"các mã trên sàn HOSE tôi cần lấy data vốn hoá xa hơn … hiện tại chỉ tới được 8/2022
là hết rồi"*. Đúng: đường vốn hoá đọc `data/giaodich` mà kho đó **cố định 1.000 phiên**, nên
trên đồ thị nó là đường cụt nhất — nến có từ 2013, chỉ số có từ 2000, riêng vốn hoá dừng ở
18/08/2022. `tools/kho_vonhoa.py` -> **405/405 mã HOSE, 241 mã lùi tới 02/01/2013**, số còn
lại bắt đầu từ chính ngày lên sàn. Trung vị **3.412 phiên/mã** (trước: 1.000).

**BA TẦNG, QUYỀN GIẢM DẦN — tầng trên luôn thắng ở phần chồng nhau:**

| tầng | khoảng | nguồn | đo lại |
|---|---|---|---|
| ① | 18/08/2022 → nay | `c × sh` của `data/giaodich` | kho đã soi (`va_slcp_gdkhq` + `lap_slcp_cu --soi`) |
| ② | ~15/12/2017 → 18/08/2022 | `ratioCode:MARKETCAP` của VNDirect | so tầng ①: **trung vị 0,000% ở 21/22 mã** |
| ③ | 02/01/2013 → 12/2017 | `close THÔ × vốn góp ÷ 10.000` | so tầng ②: **trung vị 0,000% · p90 0,02%** |

> **VÌ SAO TẦNG ① PHẢI ĐỨNG TRÊN, dù tầng ② khớp nó tới 0,000%:** đó là cách file này KHÔNG
> đẻ ra "con số vốn hoá thứ hai". Vùng mà /phantich đang đọc thì hai bên lấy CÙNG một phép
> tính từ CÙNG một kho, nên không có ngày nào hai trang nói hai số. Luật *một số, một kho*.

> **MARKETCAP CHẶN CỨNG 2.171 BẢN GHI — không phải mình chọn.** Xin từ năm 2000 vẫn trả đúng
> 2.171 phiên. Trần này **TRÔI DẦN** (mỗi phiên mới đẩy một phiên cũ ra) nên mốc tầng ② tự
> lùi theo — **đừng viết cứng ngày 15/12/2017 vào đâu cả**, code lấy `min()` của thứ trả về.

> **`v4/stock_prices` LÀ CHÌA KHOÁ CỦA TẦNG ③** — nó trả `close` (giá THÔ) bên cạnh `adClose`
> (đã hạ nền, khớp `data/hist` tới từng đồng), 3.400 phiên từ 02/01/2013. Vốn hoá phải nhân
> giá THÔ với số cổ phiếu của chính phiên đó; `dchart` chỉ có giá đã hạ nền nên không làm
> được việc này. Số cổ phiếu lấy từ dòng `x_von_gop` của `data/finx` (vốn điều lệ theo quý,
> có từ Q1/07) — mệnh giá 10.000đ theo luật nên `vốn góp ÷ 10.000` = cổ phiếu NIÊM YẾT.

> **VỐN GÓP CHO MỨC, `data/sukien` CHO NGÀY.** Vốn điều lệ đăng ký TRỄ hơn ngày GDKHQ, và trễ
> tới hơn một quý — lấy thẳng "vốn góp quý liền trước" thì bậc thang đặt sai chỗ hàng tháng
> trời (đo: HPG p90 lệch 16,67%, PLP 33,33%). Mỗi lần vốn góp đổi mức thì đi tìm trong cửa sổ
> [đầu quý trước, hết quý này] một ngày GDKHQ mà tỉ lệ cộng dồn khớp `mức mới ÷ mức cũ` (sai
> số 3%), khớp thì dời bậc về đúng ngày đó.

> **QUY VỀ NỀN CỦA TẦNG ② TRƯỚC KHI GHÉP.** Vốn góp là cổ phiếu NIÊM YẾT còn MARKETCAP dùng
> cổ phiếu LƯU HÀNH — lệch nhau đúng phần cổ phiếu quỹ (SZL lệch 9,1%). Đo tỉ lệ ở **20 phiên
> chung xa nhất** rồi lấy trung vị, đúng luật "ghép quá khứ phải quy về cùng nền" ở mục
> `data/hist`. Đo TRƯỚC khi ghép, đừng đo sau.

**BA BỘ LỌC, MỖI BỘ MỘT HỌ LỖI — và mỗi bộ có phạm vi riêng, đừng cho bộ nào lấn sân:**

| bộ lọc | bắt cái gì | phạm vi | đã sửa |
|---|---|---|---|
| `loc_gai` | ô lạc 1-2 phiên trong chuỗi số cổ phiếu (VND ×0,047 rồi ×20,6) | trước tầng ① | 704 ô |
| `dinh_bac` | nguồn cập nhật số cổ phiếu **trễ 1-2 phiên** so với lúc hạ nền giá | trước tầng ① | 58 bậc |
| `bo_dao` | một MỨC chỉ sống dưới 90 phiên rồi trả về đúng mức cũ | **chỉ tầng ③** | 1.408 đoạn |

> **`dinh_bac` LÀ BỘ QUAN TRỌNG NHẤT, và lọc trung vị KHÔNG thay được nó.** DBC 05/04/2022:
> vốn hoá 8.620 → **4.494** → 8.862 tỷ trong ba phiên liền, đúng ngày GDKHQ thưởng 100%. Giá
> đã chia đôi từ phiên GDKHQ còn số cổ phiếu hôm sau mới nhân đôi. Chuỗi số cổ phiếu suy ra
> là một **bậc thang SẠCH** (cũ, cũ, mới) nên lọc trung vị không thấy gì bất thường — phải
> hỏi `data/sukien` ngày GDKHQ thật rồi kéo bậc về đó. Cùng họ: CSM (80%, trễ 2 phiên), KHG,
> PDR, PTB.

> **`bo_dao` CHỈ ĐƯỢC CHẠY Ở TẦNG ③ — đã trả giá.** Bản đầu cho nó chạy cả vùng MARKETCAP:
> CTR lệch **1,23%** và MIG 0,19% so với chính MARKETCAP, tức bộ lọc làm SAI ĐI ở đúng chỗ
> nguồn kia mới là bên có thẩm quyền. Cùng lượt: ngưỡng `loc_gai` phải là **8% chứ không phải
> 2%** — để 2% thì nó đụng 113 ô của CTR chỉ vì nhiễu làm tròn. Sau khi siết: vùng MARKETCAP
> quay lại **trung vị 0,000%** trên toàn bộ mã đo.

**CÒN 3/405 MÃ (0,74%) có một bậc đảo chiều trong vùng dựng lại: CSM (06/2016) · PVP
(08/2017) · TCI (12/2018).** Ghi tên ra đây chứ đừng nói "kho sạch": mỗi mã một chỗ vốn hoá
nhảy rồi trả về trong vòng vài tuần. Ba mã này nguồn và vốn góp lệch pha nhau theo kiểu ba
luật trên không với tới.

**CLIENT NAY NHẸ HƠN mà lại sâu hơn**: `data/vonhoa/{MÃ}.json` **21 KB đã nén** so với
`data/giaodich` **81 KB** — nó chỉ có ngày + một con số chứ không gánh 43 cột. Cổng
`VH_SAN` trong `cophieu.html` quyết định sàn nào đã có kho sâu; sàn chưa có thì đi thẳng
`data/giaodich`, **đừng thử rồi ăn 404** (1.124 mã HNX/UPCOM × mỗi lượt mở trang).

**LƯỢT EOD KHÔNG TỐN LƯỢT MẠNG NÀO.** Bước `[1d]`, chạy **không** `--sau`: phần sâu đã nằm
trong file, bước này chỉ làm mới tầng ① từ `data/giaodich` vừa cào xong — **1,2 giây cho cả
405 mã**, và **idempotent** (chạy lại không đổi một byte). Mã MỚI lên sàn chưa có file thì tự
cào 2 lượt cho riêng nó. Phải đứng SAU `lap_slcp_cu` vì tầng ① chính là `c × sh` của kho đã soi.

**MỞ RỘNG SANG HNX/UPCOM**: chạy `--san HNX UPCOM --sau` rồi thêm tên sàn vào `VH_SAN`. Cả
hai nguồn (`MARKETCAP`, `stock_prices`, `finx`) đều có sẵn cho hai sàn đó; chưa làm vì user
chỉ hỏi HOSE, và thêm ~1.124 file × 21 KB vào kho là một quyết định riêng.

### SỨC MẠNH SO VỚI CHỈ SỐ — `chart.js` + `screen.json` + `screener.js` (25/08/2026)

Thước duy nhất để trả lời *"mã này mạnh hay yếu hơn xu thế chung"*. Nó là bản thứ **tư** —
ba bản trước đều sai, và cả ba đều sai IM LẶNG (chart vẫn vẽ đẹp, chỉ có số là sai). Ghi lại
đủ số đo của từng lần để đừng ai dựng lại.

```
đường chỉ số(i) = giá ĐC(a) × chỉ số(i) ÷ chỉ số(a)
khoảng hở(i)    = [giá ĐC(i)/giá ĐC(a)] ÷ [chỉ số(i)/chỉ số(a)] − 1
```

`a` = **phiên neo**. Hai đường gặp nhau tại `a`; sau đó mỗi đường đi theo % của chính nó.
Tương đương "nhân dồn % chênh lệch từng phiên" — sai số tích luỹ qua 3.400 phiên đo được
**1,4e-14** nên dùng tỉ số hai đầu là an toàn.

**BA LẦN SAI TRƯỚC ĐÓ:**

**① Đo bằng VỐN HOÁ — sai THƯỚC.** Vốn hoá tăng cả khi phát hành thêm mà cổ đông cũ không
được gì. Giá chỉ hạ nền khi có giá trị **ra khỏi** cổ đông hiện hữu (cổ tức, cổ phiếu thưởng,
quyền mua giá ưu đãi); chào bán riêng lẻ hoặc chào bán bằng giá thị trường thì **không** hạ
nền — không ai mất gì — nhưng vốn hoá tăng đúng tỉ lệ cổ phiếu mới. Đo 367 mã từ 2013, tỉ lệ
(vốn hoá tăng)/(giá ĐC tăng): trung vị 0,88 · **p90 2,83 · max 61,5**.

| mã | giá ĐC | vốn hoá | chỉ số | thước cũ nói | thực tế |
|---|---|---|---|---|---|
| **HHV** | ×1,83 | ×112,5 | ×3,11 | mạnh nhất sàn | **thua chỉ số 41%** |
| ORS | ×11,84 | ×157,6 | ×4,23 | mạnh nhất sàn | thắng 2,8 lần |
| ADP | ×27,84 | ×6,19 | ×4,23 | yếu | thắng đậm |

Ca ORS mổ đủ: vốn điều lệ 240 → 6.239 tỷ (**số cổ phiếu ×26,00**), trong đó phần **được** hạ
nền chỉ **×1,95** — ba đợt 2019–2020 nâng vốn 240 → 1.000 tỷ mà hệ số hạ nền đứng nguyên
0,512, còn đợt quyền mua 1:1 giá 10.000đ ngày 10/06/2021 thì hạ nền **đúng** (0,512 → 0,766 =
×1,496, lý thuyết ×1,502). Kiểm chéo: giá thô ×6,06 × cổ phiếu ×26,00 = ×157,6 = đúng vốn hoá.

**② Neo bằng TRUNG BÌNH TRƯỢT của `log(vốn hoá ÷ chỉ số)` — cõng thêm ước số chỉ số.**
`log(vốn hoá ÷ chỉ số) = log(tỉ trọng) + log(ước số)`, mà ước số bị điều chỉnh mỗi lần có mã
lên/rời sàn hoặc phát hành thêm. Đo: **tổng vốn hoá ÷ VN-Index trôi ×3,01** trong 13 năm →
mọi con số "cách nền" bị cộng thêm một sai số **CHUNG**: trung vị **+17,2%**, max **+68,1%**
(2020), +12,7% ở phiên 21/08/2026.

**③ Neo bằng MỘT HẰNG SỐ rồi áp ngược cả 13 năm.** `k` là trung bình tương quan của 1.250
phiên gần nhất, tức năm 2013 bị đo bằng thước của 2026. VNM: đo bằng thước từng thời điểm thì
2022 lệch −48,3% còn 2026 lệch −44,0%, nhưng đo cả hai bằng thước hôm nay thì 2026 toác rộng
hơn hẳn — user đọc ra là "cách nền bị sai". Và không giữ được cả hai: đo 278 mã đủ 2.500
phiên, chênh lệch giữa hai mốc **ngay trong 1.250 nến cuối** đã là trung vị 37,8% · p90 84,2%
· VNM 117,8% · max 171,3%.

**BẢN NAY ĐƯỢC GÌ:**

| | |
|---|---|
| nhân quả | tuyệt đối — thêm 300 phiên mới không đổi một số nào của 600 phiên cũ (`test_sm.js`) |
| cửa sổ / khởi động | **không có** — mã 12 phiên cũng ra số đúng |
| tổng vốn hoá sàn | **không cần** → chuyện huỷ niêm yết thành vô nghĩa |
| ước số chỉ số | **không dính** — nhân thang chỉ số ×137,9 thì khoảng hở không đổi |
| độ phủ | **1.521/1.521 mã** có `smNeo` (cả ba sàn), so với 362 mã của bản cũ |

> **CÒN LẠI, GHI RÕ CHỨ ĐỪNG IM:** VN-Index là chỉ số **giá**, không tính cổ tức, còn giá điều
> chỉnh thì **có** — nên phép so thiên về cổ phiếu cỡ **2–3%/năm**. Quy ước tiêu chuẩn của mọi
> biểu đồ sức mạnh tương đối, không vá được bằng dữ liệu đang có.

**PHIÊN NEO MẶC ĐỊNH = MỘT NĂM GẦN NHẤT, KHÔNG PHẢI PHIÊN CHÀO SÀN (sửa 26/08/2026).**
User: *"nhiều mã có VN-Index cách cổ phiếu quá xa, xa đến nỗi không bao giờ còn có thể cắt
nhau được nữa"*. Đúng, và đo được trên 1.471 mã ≥600 phiên — đếm số lần đường giá cắt đường
chỉ số trong 250 phiên gần nhất:

| cách neo | số lần cắt (trung vị) | % mã có cắt |
|---|---|---|
| **neo phiên chào sàn** | **0** | **19%** |
| neo 250 phiên trước | **10** | **100%** |
| trượt 120 phiên | 8 | 90% |
| trượt 250 phiên | 3 | 66% |

Neo chào sàn tích luỹ cả chục năm nên khoảng hở hiện tại có trung vị **63%**, p90 **200%**,
max **21.402%** — 17% số mã lệch quá 100%. Ở mức đó hai đường không gặp nhau nữa, mà một đường
không bao giờ cắt thì **không nói được gì về hiện tại**; nó chỉ là một dữ kiện lịch sử đứng yên.

**BỘ MỐC LÀ MỘT Ô MỞ BẢNG CHỌN (sửa 27/08/2026).** User: *"mục chọn 1-3-từ đầu nên để dạng
tuỳ chọn, tôi có thể chọn 1-2-3-4-5-6-7-8-9-10-all"*, *"neo nên là 1 mục riêng, bấm vào nút
neo xong mới bấm vào vị trí cần neo"*, rồi *"nên đặt tuỳ chọn neo giá vào ô Tất cả trong hình,
như vậy sẽ gọn hơn"*.

Hàng ô trong khung giữ **đúng một** ô mốc; bấm vào nó mở bảng chọn xếp **5+5+1**, hàng ba chia
đôi `Tất cả` | `⚓ Neo`:

```
 Cổ tức   BCTC   So với chỉ số   Mốc 7 năm
                                ┌───────────────────┐
                                │  1  2  3  4  5    │
                                │  6  7  8  9  10   │
                                │  Tất cả │ ⚓ Neo   │
                                └───────────────────┘
```

> **NÚT NEO NẰM TRONG BẢNG, KHÔNG PHẢI TRÊN HÀNG Ô.** Bản đầu của lượt này để nó thành ô thứ
> hai trên hàng, và hàng đó là chỗ **chật nhất** của cả khung — ở khổ điện thoại (vùng vẽ
> ~205px) thêm một ô là hàng xuống hẳn hai dòng. Nó vốn cũng chỉ là một cách trả lời câu "so
> từ lúc nào", nên đứng cạnh `Tất cả` là đúng chỗ. Hàng ba **chia đôi** chứ không thêm hàng
> bốn: thêm hàng thì bảng cao lên, mà thứ user đổi ở đây chính là muốn gọn lại.

Nút `Neo` là một vòng ba trạng thái một chiều: `⚓ Neo` → *chờ* → *đang neo tay* → `↺ Bỏ neo`
về mốc số năm. **Bảng đóng ngay khi vào chế độ chờ** — nó phủ đúng vùng người ta sắp phải bấm.
Chọn số năm **đè lên** neo tay: chọn mốc mới là thay mốc cũ, không cộng dồn hai mốc. `Esc`
thoát cả hai trạng thái dở dang.

**NHÃN Ô MỐC MANG LUÔN TRẠNG THÁI**, vì bảng đóng rồi thì nó là thứ duy nhất còn nói được:

| trạng thái | nhãn |
|---|---|
| bình thường | `Mốc 7 năm` |
| đang neo tay | `Mốc 05/06/2026` — in **ngày**, vì số năm lúc này không có hiệu lực |
| đang chờ chọn phiên | `⚓ Bấm chọn phiên`, ô sáng |

Bấm ô Mốc lúc **đang chờ** thì vừa huỷ chờ vừa **mở luôn bảng**: quay lại ô này là đang muốn
đổi mốc, bắt bấm hai lần (một lần huỷ, một lần mở) là thừa.

Ba chỗ bản cũ hỏng, ghi lại để đừng dựng lại:

- **Ba nấc bỏ trống quãng 4..9 năm** — đúng quãng chứa trọn một chu kỳ thị trường.
- **Xoay vòng thì muốn quay lại nấc vừa lướt qua phải bấm hết một vòng.**
- **Neo tay đi kèm việc ghim phiên**: phải ghim một phiên trước thì ô neo mới hiện ra, tức là
  muốn neo tay phải đoán trúng một thao tác không ghi ở đâu cả.

Quy theo khung để mọi khung nói cùng một quãng (1 năm = 250 nến Ngày · 52 Tuần · 12 Tháng ·
1 Năm). `neoSoNam(v)` nhận **thẳng số năm** (`0` = Tất cả) chứ không nhận chỉ số trong một
mảng: chỉ số thì mỗi lần thêm/bớt một nấc là mọi chỗ gọi lệch đi một bậc mà không ai báo. Số
ngoài khoảng bị **kẹp** chứ không xoay vòng — gọi nhầm `11` ra `10` thì nhìn là thấy, xoay
vòng ra `1` thì không.

> **BẢNG CHỌN VẼ THẲNG LÊN CANVAS**, không dựng thẻ DOM: ô mở nó nằm trong khung đồ thị, mà
> một lớp DOM chồng lên canvas phải tự đồng bộ toạ độ với mọi lượt kéo/phóng/đổi khổ và cả chế
> độ toàn màn hình — đúng thứ `veHopGhim`/`veHopSK` đã chọn tránh. Vẽ **sau cùng** trong
> `draw()`: hộp đọc số của phiên đang ghim tự chọn một trong bốn góc, có lúc chọn đúng góc
> trái trên. Bấm **ra ngoài** bảng thì đóng bảng và **nuốt** cú bấm — bằng không một cú bấm
> vừa đóng bảng vừa ghim nhầm một phiên nằm ngay dưới.

> **HÀNG Ô TỰ XUỐNG DÒNG KHI HẾT CHỖ.** Tách ô Neo ra riêng là hàng này có tới năm ô; ở khổ
> điện thoại (vùng vẽ ~310px) ô cuối bị cắt cụt hoặc chạy hẳn ra ngoài canvas — bấm không
> trúng mà cũng không thấy nó đâu. Thà tốn thêm 22px chiều cao.

> **NHỊP HAI KHÔNG ĐƯỢC GHIM PHIÊN.** `bamTrongKhung = bamNeo || bamGhim`: đang chờ neo thì cú
> bấm chỉ đặt mốc neo. Hai việc trên cùng một cú bấm là neo xong tự dưng mọc thêm một hộp đọc
> số. `bamNeo` cũng **không** đi qua `choGhim()`: bật riêng dải *So với chỉ số* (vốn hoá lẫn
> đường chỉ số đều tắt) thì ô Neo vẫn hiện, nên phải neo được.

`test_sm.js` khối ⑬ khoá cả luồng này qua `bamThu(px,py)` — đúng đường định tuyến của cú bấm
thật, vì môi trường giả không phát được sự kiện chuột. Nhãn thì đọc bằng `nhanMoc()` /
`tenNutNeo()`, trả về **đúng chuỗi vừa in lên canvas** chứ không tính lại: nhãn là thứ duy
nhất nói ra trạng thái khi bảng đã đóng, tính lại ở một chỗ thứ hai là hai nơi lệch nhau lúc
nào không ai biết.

> **MỐC MẶC ĐỊNH KHÔNG TRÔI KHI KÉO CHART** — nó đếm lùi từ phiên **CUỐI CHUỖI**, không phải từ
> mép khung nhìn. Kéo/phóng bao nhiêu cũng không dời được; chỉ khi có phiên mới thì nó lùi đúng
> một nến, và đó là bản chất của "một năm gần nhất". Đây là chỗ khác hẳn cái neo trung bình
> trượt đã bỏ: cái đó đổi mốc theo dữ liệu, cái này đổi theo thời gian và **nói rõ ngày ra
> nhãn**. `test_sm.js` khoá cả hai tính chất (vẽ lại không đổi · thêm 1 phiên lùi đúng 1 nến).
>
> **ĐẾM LÙI THEO NẾN HỢP LỆ**, không phải `n-1-lui`: chuỗi có phiên thiếu chỉ số thì đếm theo
> chỉ số mảng ra một mốc ngắn hơn ý định.

Nhãn **luôn in ngày neo thật** (`— neo 21/08/2025`), nên dù ở nấc nào cũng không mơ hồ. Với
`Từ đầu`: 190/405 mã HOSE lên sàn từ 2013 nên đó đúng là phiên chào sàn, còn **215 mã lên sàn
trước 02/01/2013** thì neo ở mốc kho nến bắt đầu — ghi "chào sàn" cho tất là nói sai với hơn
một nửa bảng.

> **`canNam = 20` TRONG `cophieu.html`, MỘT MỨC CHO MỌI KHUNG.** Từ khi mốc là phiên neo thì
> số nến nạp không còn là chuyện hiệu năng mà là ĐÚNG/SAI: nạp 6 năm thì mốc neo của ORS rơi
> vào 25/08/2020 thay vì 02/01/2013, và bấm sang khung Tháng (nạp sâu hơn) là mốc NHẢY. 20 năm
> quá mốc sâu nhất của kho nên thực tế là "lấy hết"; `dayCache` giữ theo `sym|nam` nên cả trang
> chỉ tốn MỘT lượt nạp thay vì hai lượt 5 rồi 15 năm.

**THANG DỌC CỦA DẢI: BẬC THANG THEO KHUNG NHÌN** (26/08/2026). User: *"mỗi lần bấm vào mốc
1 năm - 3 năm - từ đầu là chart bị reset rất khó chịu, cần cố định để dễ quan sát nhất"*.
Khung nhìn NGANG không hề reset (đo: `[2688,3320]` giữ nguyên qua cả ba lần bấm) — thứ nhảy là
thang dọc của dải.

- **Thang cả chuỗi hỏng** ở đây vì `q` chỉ có từ phiên neo trở đi, nên đổi mốc là đổi luôn
  miền giá trị. Chọn `Từ đầu` thì thang phải ôm 13 năm và đoạn 250 phiên đang xem bị nén thành
  một vệt — đúng cảm giác "bị reset".
- **Khít liên tục theo khung nhìn cũng hỏng** (dù MACD của chính chart này làm vậy): kéo ngang
  một chút là thang nhích một chút, đường cứ trườn — lỗi user đã bắt hồi 23/08.
- **Cách dùng**: lấy min/max của ĐOẠN ĐANG XEM rồi **nắn lên bậc thang** `BAC` (5% · 7,5% ·
  10% · 15% · 20% · 30% … 1000%). Thang chỉ đổi khi vượt hẳn một bậc. Đo: kéo ngang năm lượt
  liên tiếp thì bậc **giữ nguyên** `−15%/+15%`; đổi mốc thì nhảy đúng một lần sang bậc hợp lý
  (1 năm `±15%` · 3 năm `−50%..0` · Từ đầu `−40%..0`).
- Bậc dày ở vùng dưới 100% để đỡ phí chỗ: đoạn nằm gọn ở −43,5%..−29,1% mà bậc gần nhất là 60%
  thì đường chỉ chiếm một phần tư dải. **Vạch 0 luôn nằm trong khung** — nó là mốc neo, mất nó
  thì không đọc được đang trên hay dưới.

**TRÊN CHART:**
- Đường chỉ số quy đổi vẽ trên **TRỤC GIÁ** (đơn vị đồng, cùng đơn vị với nến) — **không được
  nới trục giá theo nó**: mã lệch xa như HHV thì nến bị nén bẹp. Nó bị **cắt ở mép**, và số
  thật thì đọc ở dải dưới — dải thang khít theo chính khoảng hở nên không bao giờ tràn.
- Trục phải thứ hai (`padR2`) nay **chỉ còn cho VỐN HOÁ**, và vốn hoá là đường **thông tin**
  đứng riêng, không so với ai, thang khít chính nó. Không còn `k`, không còn "miền neo".
- Dải bật bằng ô công tắc **trong khung** (`So với chỉ số`), và nó chỉ cần **kho chỉ số** — tử
  số là giá, có sẵn trong nến. Đã bỏ `taiVonHoa()` khỏi `napPhuCho`: gọi nó là tải thêm ~21KB
  gz cho một thứ dải không dùng tới.

**Ở BẢNG GIÁ** (`suc_manh()` trong `build_screen.py`) — cửa sổ **CỐ ĐỊNH**, không neo theo mã,
vì bảng giá so ngang: mã neo 2013 và mã neo 2025 không so được với nhau.

```
sm{N} = [giá ĐC(t)/giá ĐC(t−N)] ÷ [chỉ số(t)/chỉ số(t−N)] − 1        N = 20 · 60 · 120 · 250
```

Mỗi mã so với **chỉ số sàn của chính nó** (`CHISO_SAN`: HOSE→VNINDEX · HNX→HNX · UPCOM→UPCOM).
Ghép **theo NGÀY**, không theo vị trí mảng — nến của mã và nến chỉ số lệch nhau ở phiên mã bị
ngừng giao dịch, ghép theo vị trí là lệch cả chuỗi mà không báo gì. Tính **trong vòng lặp
chính** vì `d` đã nằm trong tay; quét lại thư mục lần hai như `nen_tuoi()` cũ là đọc 1.529 file
thêm một lượt cho không. Thêm `smNeo` = so với phiên đầu chuỗi, cùng định nghĩa với chart.

**CHIP Ở BẢNG GIÁ: KHÔNG CÓ, VÀ ĐÓ LÀ CHỦ Ý (26/08/2026).** Năm chip `capmin` · `gtgd60` ·
`smHon` · `smKem` · `smManh` đã dựng rồi **gỡ ngay trong ngày** theo yêu cầu user — bộ đó
dựng trên giả thuyết *"mã tụt hậu rồi bùng nổ"*, mà thống kê chạy lại trên thước đúng đã bác
nó (xem mục dưới). Bỏ chip đi để research lại từ đầu, không để một bộ lọc đã biết là yếu nằm
trên giao diện.

> **DỮ LIỆU THÌ GIỮ NGUYÊN**: `screen.json` vẫn có `smNeo`/`sm20`/`sm60`/`sm120`/`sm250`,
> `avgval60` và khối `ix`. Chúng tính trong CÙNG vòng lặp của `build_screen` nên gần như miễn
> phí (build 7,3 → 9,2 giây), và đợt research bộ lọc mới cần đúng mấy trường đó. Dựng lại chip
> chỉ là thêm vài dòng vào mảng `chips` cộng mấy nhánh `case` — ghi chú trong `screener.js` chỉ
> sẵn chỗ.
>
> **NẾU DỰNG LẠI: `opts` của chip PHẢI trùng `SM_CUA` của `build_screen.py`.** Lệch một bên là
> chip hỏi `sm300` trong khi kho ghi 20/60/120/250 và **mọi mã đều trượt trong im lặng**. Và
> **thiếu dữ liệu phải TRƯỢT chứ không được LỌT** — mã chưa đủ N phiên có `sm{N} = null`, một
> phép so viết ẩu kiểu `!(v<=0)` cho `null` đi qua và bảng trộn mã đủ với mã chưa đủ dữ liệu.

### CHIP "DƯỚI CHỈ SỐ N NĂM LIÊN TỤC, NAY CÁCH ≤10%" — bảng giá (27/08/2026)

User chốt sau **năm vòng đo**: *"1 năm có 250 phiên thì tầm 125 phiên gần nhất dưới VN-Index
nhưng giá chỉ còn cách VN-Index khoảng 10% thì đạt · 2 năm thì tầm 200 phiên · 3–10 năm thì
khoảng 300 phiên"*.

Đo trên ĐÚNG đường chart trang mã vẽ ở mốc "N năm", nên bộ lọc nói đúng thứ người dùng nhìn
thấy. Khoảng hở `q(i) = [giá(i)/giá(a)] ÷ [chỉ số(i)/chỉ số(a)] − 1`; `q < 0` là đang ở DƯỚI,
và `−q` chính là *"thấp hơn đường chỉ số bao nhiêu %"*.

**HAI ĐIỀU KIỆN, HẾT:**

| | |
|---|---|
| ① | `L` phiên gần nhất **đều** có `q < 0` — ở dưới liên tục, không một phiên nào nhô lên |
| ② | khoảng cách hôm nay `−q` ≤ **10%** |

`L` đổi theo mốc: **1 năm → 125 · 2 năm → 200 · 3..10 năm → 300 phiên**.

Kho ghi `ap1..ap10` = **khoảng cách hôm nay (%)**, và CHỈ ghi khi ① đã thoả; client chỉ còn
việc so ngưỡng. **`null` nghĩa là có phiên nhô lên trong `L` phiên** — tức không phải mã đang
hỏi. Mã sàn nào so với chỉ số sàn ấy, y như `sm*`.

> **NEO Ở "NGAY BÂY GIỜ", KHÔNG NEO Ở LÚC CẮT.** Bản trước đòi *"ở dưới suốt 600 phiên NGAY
> TRƯỚC VẾT CẮT"* và chết vì ngay sát vết cắt giá luôn dập dềnh quanh vạch — **0 mã đạt**. Ở
> đây `L` phiên tính ngược từ HÔM NAY, mà hôm nay mã vẫn còn ở dưới, nên không có vùng dập
> dềnh nào để vướng.

**BỐN CA MẪU USER ĐÃ BẮT — `test_smkho.js` khoá riêng, cả bốn phải TRƯỢT ở MỌI mốc:**

| mã | vì sao lọt lưới ở bản cũ | nay bị loại bởi |
|---|---|---|
| **VBB** | phá lên **+25,7%** ngày 22/07/2026 rồi hạ về −3,0%; bản cũ chỉ hỏi "đỉnh trong 50 phiên" nên nhận cả cái đỉnh **đã qua** | ① — có phiên nhô lên trong 125 phiên |
| **NVB** | ở TRÊN chỉ số gần trọn 2 năm (`q` đỉnh **+62%** tháng 7/2025) rồi tụt về chạm **0,00%** ngày 07/08/2026 và nảy — đỉnh đang tụt, không phải đáy đang vượt | ② mốc 1 năm (cách **43,5%**) · ① các mốc còn lại |
| **VIC · VHM** | đang ở TRÊN đường chỉ số | ① |

Đo phiên 25/08/2026 — **ở dưới liên tục / cách ≤10%**: 1 năm 743 → **28 mã** · 2 năm 765 → 7
· 3 năm 561 → 2 · 5 năm 491 → 1 · 10 năm 738 → 4.

> **NGƯỠNG 10% NẰM Ở CLIENT** nên siết hay nới không phải dựng lại kho. Mốc 1 năm: ≤5% → 7 mã
> · ≤10% → 28 · ≤15% → 70 · ≤20% → 172. Mã áp sát nhất toàn thị trường ở mốc 1 năm cách
> **1,83%**; ở mốc 5 năm là **8,92%** — mốc càng dài thì khoảng cách càng khó nhỏ, nên ít mã
> là đúng bản chất chứ không phải bộ lọc hỏng.

> **BỐN BẢN ĐÃ THỬ RỒI BỎ, đừng dựng lại:**
> · *"Mọi vết cắt lên trong 50 phiên"* — một nửa số mã lọt lưới đang nằm LẠI DƯỚI (TCB cắt
>   lên 19/08 rồi rơi xuống 20/08).
> · *"Ở dưới suốt 600 phiên rồi mới cắt"* — đòi từng phiên thì **0 mã**; nới 95% còn 1–3 mã.
> · *"Đỉnh khoảng hở trong 50 phiên + quá nửa cửa sổ ở dưới"* — nhận cả đỉnh **đã qua** (VBB).
> · *"Phân vị khoảng cách ≤10% + đang thu hẹp"* — đúng hướng nhưng phân vị là một đại lượng
>   tương đối, hai mã cùng phân vị có thể cách chỉ số 3% và 40%. User muốn con số TUYỆT ĐỐI.

**ĐỐI CHIẾU ĐẦU–CUỐI VỚI CHÍNH CHART** (VCB, mốc 5 năm, phiên 24/08/2026): phiên neo
`2021-08-18` · `q` trước khi cắt `−0,027%` · tại phiên cắt `+1,081%` · phiên cuối `+3,299%`,
chart và kho khớp **từng con số**.

> **CHART CÓ THỂ CÓ THÊM NẾN HÔM NAY, KHO THÌ KHÔNG** — `q` của nến đó là `null` (chưa có
> điểm chỉ số). Đối chiếu phải bỏ qua ô `null` ở cuối, đừng đọc `q[n-1]` rồi kết luận "đang ở
> dưới". Đã dính đúng vậy khi soi VCB.

> **GHI SỐ, KHÔNG GHI CỜ** — cùng bài học với `rsiPM`. **`null` phải TRƯỢT**, đừng viết kiểu
> `!(v>10)`.

**SỨC DỰ BÁO: KHÔNG PHÂN BIỆT ĐƯỢC VỚI NGẪU NHIÊN — đo rồi, đừng bán nó như tín hiệu.** Hồi
kiểm nhân quả bản "vừa cắt lên" (cổng thanh khoản 2 tỷ/phiên), sau 60 phiên: nền trung vị
−1,17% thắng 46,8% · mốc 1 năm −1,31%/46,7% · mốc 3 năm −0,23%/49,2% · mốc 5 năm −1,47%/46,5%.
Mốc 3 năm trông nhỉnh hơn nhưng **không sống sót phép sửa vón cụm**: gộp mỗi tháng một quan
sát (124 tháng) còn trung vị **−1,02%**, thắng nền **55/124** tháng, **t ≈ 1,59**.
> Vì thế chip này là **thước đo** — người dùng tự chọn số năm, tự đọc — đúng ràng buộc ở mục
> *Ranh giới pháp lý*. Đừng gắn nhãn "tín hiệu", đừng xếp hạng, đừng cắt top N.

**KIỂM:** `node tools/test_sm.js` (29 ca, lõi trong `chart.js`) + `node tools/test_smkho.js`
(11 ca, KHO `screen.json`). File thứ hai **dựng lại toàn bộ `sm*` bằng Node** từ `data/hist` +
`data/chiso` + `universe.json` rồi so với những gì `build_screen.py` đã ghi — **7.577 con số
trên 1.521 mã, không con nào lệch quá 0,01**. Nó cũng khoá hai bất biến dễ hỏng im lặng: mã HNX
phải khớp bản dùng HNX-Index và **không** khớp bản dùng nhầm VNINDEX; mã mới niêm yết có
`smNeo` nhưng `sm250` phải là `null`. Nó thay `test_loc.js` (đã xoá cùng lượt gỡ chip) và mạnh
hơn hẳn: kiểm dữ liệu thật thay vì kiểm mấy nhánh `case` của giao diện.

Đối chiếu tay lúc dựng, khớp tới hai chữ số thập phân:
`smNeo` ORS +180,12 · HHV −41,26 · VCK −9,07 · VNM −21,41 · GAS +18,52 · DHC +902,83; `sm120`
VIC +35,19 · VHM +63,32 · THD +316,05 (HNX) · SHS −20,47 (HNX) · ORS +9,71.

### THỐNG KÊ CHẠY LẠI TRÊN THƯỚC ĐÚNG — VÀ NÓ LẬT PHẦN LỚN BỘ SỐ CŨ

Bộ số cũ (*"tỉ lệ thắng 66,7% · PF 5,94"*) dựng trên `cách nền`, tức trên đại lượng **sai
thước** (vốn hoá) và mang **sai số chung +17,2%**. Đã chạy lại toàn bộ trên `sm{N}`: 1.487 mã
cả ba sàn (HOSE 395 · HNX 298 · UPCOM 794), 3.997.017 phiên, hoàn toàn nhân quả, vào lệnh ở
**giá mở phiên kế tiếp**, cắt lỗ −10%, bán 1/3 tại +20% và +40%, giữ tối đa 200 phiên, lọc vốn
hoá ≥1.000 tỷ + GTGD 60 phiên ≥2 tỷ.

| tín hiệu | lệnh | THẮNG | TB/lệnh | PF |
|---|---|---|---|---|
| nền: mua bất kỳ phiên nào | 87.033 | 39,2% | +2,8% | 1,45 |
| **sm60 > 0** | 44.963 | **41,0%** | **+3,7%** | **1,61** |
| sm60 > +20% | 14.495 | 40,9% | +3,9% | 1,64 |
| sm60 < 0 | 43.349 | 37,3% | +1,9% | **1,29** |
| sm120 > 0 | 46.616 | 40,7% | +3,5% | 1,57 |
| sm250 > 0 | 47.433 | 38,7% | +2,7% | 1,42 |
| sm250 < 0 | 36.782 | 39,4% | +2,9% | 1,46 |

**BA KẾT LUẬN, VÀ CHÚNG NGƯỢC VỚI GIẢ THUYẾT MỞ ĐẦU:**

1. **Quán tính 60–120 phiên có ăn, nhưng mỏng**: PF 1,45 → 1,61. Không phải 5,94.
2. **Mua mã ĐANG TỤT HẬU thì TỆ HƠN nền** (`sm60 < 0`: PF 1,29 so với 1,45). Đây chính là ý
   tưởng khởi đầu cả chuỗi việc này — *"mã tụt sâu dưới VN-Index rồi bùng nổ trở lại"* — và
   trên thước đúng thì nó là một cách làm **kém hơn mua bừa**.
3. **Cửa sổ 250 phiên không có tín hiệu gì**: mọi ô đều 1,42–1,46, tức bằng nền.

**CỔNG CHỈ SỐ VẪN LÀ THÀNH PHẦN MẠNH NHẤT** (EMA20<EMA50 và VN-Index>EMA20 — thị trường vừa
bật lên từ nhịp giảm trung hạn):

| | lệnh | THẮNG | TB | PF |
|---|---|---|---|---|
| không lọc sức mạnh · cổng MỞ | 10.194 | 44,2% | +5,4% | 1,93 |
| **sm60 > 0 · cổng MỞ** | 4.982 | **47,3%** | **+6,9%** | **2,28** |
| sm60 > +20% · cổng MỞ | 1.264 | 48,6% | +7,8% | 2,47 |
| sm60 > 0 · cổng ĐÓNG | 39.981 | 40,2% | +3,3% | 1,54 |

Cổng một mình đưa PF 1,45 → 1,93; thêm `sm60>0` lên 2,28. Vẫn xa 5,94 của bộ số cũ.

**KHÔNG ỔN ĐỊNH THEO NĂM** (`sm60>0` + cổng mở): 2020 thắng 70% (+27,5%) · 2021 75% (+17,5%) ·
2023 67% (+12,7%), nhưng **2022 chỉ 21% (−5,3%)** · 2018 34% (−0,3%) · 2019 37% (−1,3%) · 2024
34% (−0,9%). Bốn năm âm trên mười hai.

> **KHÔNG ĐƯA BỘ NÀY LÊN GIAO DIỆN.** PF 2,28 với 4 năm âm trên 12, và đã tìm ra sau khi dò
> hàng chục tổ hợp — đó là mức không đủ để biến thành một cái nút. Ba chip `smHon`/`smKem`/
> `smManh` là **thước đo** (người dùng tự đặt ngưỡng, tự đọc), không phải khuyến nghị. Bản cũ
> của mục này lưu ở `docs/muc-cu-cachnen.md` để đối chiếu.


### CHỈ SỐ ĐÃ SÂU TỚI 2000, VÀ `kho_chiso` NAY TRỘN THAY VÌ GHI ĐÈ (23/08/2026)

User: *"không thể kéo đường vnindex tới tận 2013 hoặc xa hơn sao?"*. Đúng là không — nhưng
chỗ nghẽn nằm ở **kho chỉ số**, không nằm ở chart. `data/chiso.json` cào từ
`dchart-api.vndirect.com.vn`, mà nguồn đó **chặn cứng ở 24/08/2017** với chỉ số (đo lại
23/08/2026: xin từ năm 2000 vẫn trả đúng 2.242 phiên từ 24/08/2017), trong khi nến của trang
mã có từ **02/01/2013**. Nên đường VN-Index cụt mất 4 năm rưỡi đầu của mọi chart.

**`histdatafeed.vps.com.vn` sâu gấp ba** — và đây là chỗ được phép dùng VPS:

| chỉ số | VNDirect | VPS | tổng sau khi gộp |
|---|---|---|---|
| VNINDEX | 2.242 · từ 24/08/2017 | **6.369 · từ 28/07/2000** | **6.346** |
| HNX | 2.244 | 5.112 · từ 04/01/2006 | 5.108 |
| UPCOM | 2.244 | 4.282 · từ 24/06/2009 | 4.285 |
| VN30 | 2.242 | 3.651 · từ 06/02/2012 | 3.628 |
| HNX30 | 2.244 | 3.543 · từ 09/07/2012 | 3.520 |

28/07/2000 đúng là **phiên giao dịch đầu tiên** của VN-Index (100,00 điểm) — tức đã kịch đáy
lịch sử, không còn gì sâu hơn để lấy.

> **VÌ SAO ĐƯỢC DÙNG VPS Ở ĐÂY, trong khi luật kho nến là "VNDirect trước, VPS dự phòng".**
> Luật đó sinh ra vì **VPS thiếu hồi tố quyền** (371/1.525 mã sai nền giá) — mà **chỉ số thì
> không chia tách, không thưởng, không cổ tức**, nên đúng chỗ VPS yếu lại không đụng tới đây.
> Đo trên 2.242 phiên trùng với VNDirect: lệch **trung vị 0,0000% · p99 0,0000% · đúng 1
> phiên quá 0,1%** (09/06/2020). Bốn chỉ số kia 3–5 phiên quá 0,1% trên hơn 2.240 phiên.
>
> **Entrade đã cân nhắc và LOẠI**: VNINDEX cũng sâu tới 2000, nhưng bốn chỉ số kia chỉ có từ
> 11/05/2020 và lệch lớn hơn hẳn (UPCOM **209/1.335 phiên** quá 0,1%, max 1,50%).

**`kho_chiso()` NAY TRỘN BA TẦNG, KHÔNG DUMP THẲNG NỮA** — quyền giảm dần:
① VNDirect (có phiên mới nhất; VPS thường trễ 2–3 phiên) → ② file cũ `data/chiso.json` →
③ VPS, **chỉ gọi khi kho chưa có phần sâu** (`min(ngày) > CHISO_SAU = 2015-01-01`) và chỉ lấp
phiên còn trống. Sau lượt đầu là không bao giờ gọi lại, nên lượt EOD hằng ngày **không tốn
thêm lượt mạng nào**.

> **PHẢI TRỘN, VÌ BẢN CŨ CÓ HAI CÁI BẪY.** Nó `json.dump` đè cả file bằng đúng thứ VNDirect
> vừa trả, nên ① mọi phần sâu hơn 2017 sẽ bị **xoá sạch ở lượt EOD kế tiếp** — lấp xong hôm
> nay, mai mất; và ② một chỉ số mà nguồn lỗi đúng lượt đó thì `continue` → chỉ số ấy **biến
> mất khỏi kho**, không lỗi, không dấu hiệu gì.

> **`pc` PHẢI TÍNH SAU KHI GỘP.** Tính trước rồi ghép là phiên nối giữa hai nguồn mang % của
> một khoảng hở. Chỉ số không chia tách nên `c[i]/c[i-1] − 1` là định nghĩa duy nhất.

**BẢN GẦY CHO KHÁCH — `data/chiso/{CHỈ SỐ}.json`, chỉ `d` + `c`.** Chart nến của trang mã chỉ
cần ngày và điểm đóng cửa của ĐÚNG MỘT chỉ số; bắt nó tải cả file gộp là **254 KB đã nén** cho
một đường kẻ, trong khi riêng VNINDEX chỉ **34 KB** (mà vẫn sâu gấp ba bản 129 KB trước đây).
**Hai shape, MỘT người viết, cùng một `ra` trong bộ nhớ → không thể trôi khỏi nhau.** Đừng
dựng bản gầy ở một công cụ khác hay một lượt chạy khác — lúc đó nó thành hai kho và sẽ có ngày
hai bên nói hai con số.

**HAI THỨ ĐƯỢC LỢI THEO, không phải chờ làm thêm:**
- **/phantich**: trục phân tích dài 1.769 phiên (từ 01/12/2015) nhưng cột chỉ số **trống 433
  phiên đầu** vì kho chỉ có từ 2017. Nay đầy — đường *VN-Index quy đổi* và ô đọc số thị trường
  lùi từ 24/08/2017 về **01/12/2015**.
- **Trang mã**: đường chỉ số phủ trọn mọi khung của mọi mã, kể cả khung Năm 14 cây từ 2013.

> **CÒN ĐÚNG HAI PHIÊN TRỐNG: 23 và 24/01/2018** — VNINDEX và VN30 không có, HNX/UPCOM thì có.
> **Cả VNDirect lẫn VPS đều thiếu**, tức là lỗ của nguồn chứ không phải của phép gộp. Cứ để
> `None`, đúng luật đã ghi: *chỉ số đứng im ba phiên liền là một câu nói về thị trường, không
> phải một chỗ trống được lấp*.

**CÒN "XA HƠN 2013" THÌ VƯỚNG NẾN, KHÔNG VƯỚNG CHỈ SỐ NỮA.** `dchart` chặn nến cổ phiếu ở
02/01/2013 (đo REE/VNM: xin từ 1996 vẫn đúng 3.397 phiên từ 02/01/2013), còn kho `data/hist`
có 672/1.529 mã bắt đầu đúng ngày đó. VPS thì có REE **từ 28/07/2000**, SAM 2000, GMD 2002 —
và **không thấy vách chia tách nào** trong vùng cũ (0 phiên rơi quá 12% trước 2013 trên
REE/VNM/HPG/SAM/GMD/FPT), tức vùng đó VPS ĐÃ hồi tố. Nhưng **nền của hai nguồn lệch nhau một
hằng số** trên vùng chồng nhau 3.397 phiên: REE/SAM/GMD/VCB lệch ~0,00% nhưng **HPG lệch
35,99%, FPT 16,18%, VNM 1,30%** — trung vị ≈ p95 ≈ max, tức lệch MỨC chứ không phải nhiễu.
Nối được, nhưng phải đo tỉ lệ tại phiên chung rồi quy nền (luật đã ghi ở mục `data/hist`), và
phải soi lại 1.529 mã. **Đó là một việc riêng của kho nến, đừng làm lẫn vào việc chỉ số.**

### HAI ĐƯỜNG PHỦ TRÊN CHART NẾN CỦA TRANG MÃ — VỐN HOÁ VÀ CHỈ SỐ SÀN (23/08/2026)

User: *"ở trang cổ phiếu tôi muốn tìm cách để bật được đường vốn hoá của cổ phiếu và đường
VNindex trên các mã thuộc sàn hose ngay trong chart"*. Hai nút mới `Vốn hoá` · `VN-Index` ở
**cả hai** hàng chỉ báo (`#cvInd` chart nhỏ và `#ptInd` chart toàn màn hình), đi qua đúng
`batChiBao()` như mọi chỉ báo khác. Cờ trong `chart.js`: `ind.vh` · `ind.idx`.

**VÌ SAO ĐƯỜNG VỐN HOÁ KHÔNG PHẢI ĐƯỜNG GIÁ VẼ LẠI** — chỗ dễ tưởng thừa nhất, và là lý do
duy nhất đường này đáng tồn tại. Nến của trang mã **đã hạ nền** (kho `data/hist`/VNDirect hồi
tố quyền), còn vốn hoá lấy **giá THÔ × số cổ phiếu của chính phiên đó**. Thưởng/chia cổ phiếu
thì hai vế triệt tiêu (giá chia đôi ↔ số cổ phiếu nhân đôi) nên hai đường đi song song; chúng
chỉ **tách ra** ở đúng hai chỗ:

- **phát hành thêm · chào bán riêng lẻ · ESOP** — số cổ phiếu tăng mà giá không hạ nền theo,
  nên vốn hoá vọt lên trong khi giá đứng yên. Đó là **pha loãng**, nhìn thấy bằng mắt.
- **cổ tức TIỀN** — nguồn VN hạ nền cả cổ tức tiền (xem mục *Nến vẽ chart*) nên giá quá khứ bị
  kéo xuống, còn vốn hoá rơi đúng bằng số tiền đã trả ra khỏi doanh nghiệp.

Đo tỉ số `vốn hoá ÷ giá đã hạ nền` trên 1.000 phiên — hằng số nghĩa là hai đường trùng hình:

| mã | tỉ số đầu → cuối | biên độ |
|---|---|---|
| KSF | 3,0e8 → 9,0e8 | **gấp 3,00** |
| VIX | 1,09e9 → 2,57e9 | gấp 2,36 |
| VCI | 8,31e8 → 1,15e9 | gấp 1,48 |
| BID | 7,54e9 → 7,78e9 | gấp 1,04 |
| HPG | 8,60e9 → 8,44e9 | gấp 1,02 |

**NGUỒN — MỘT SỐ, MỘT KHO.** Vốn hoá đọc `data/giaodich/{MÃ}.json` và tính `mcap = c × sh`,
**đúng một công thức với đồ thị /phantich** (`assets/congcu.js`). Đừng đổi sang
`data/dactrung/{MÃ}.json` dù ở đó có sẵn cột `mcap` và file nhẹ hơn 15 KB đã nén: kho đặc
trưng dựng ở **bước cuối** lượt EOD (`run_refresh.ps1` bước sau `build_phantich`) nên có lúc
còn là bản hôm trước — đo 23/08/2026: `dactrung` còn 95 phiên đầu `mcap=null` trong khi
`giaodich` đã lấp xong. Hai trang đọc hai kho là hai con số vốn hoá lệch nhau mà không ai ngờ.

**CHỈ SỐ THEO ĐÚNG SÀN CỦA MÃ**, không ép mọi mã về VN-Index: kho có sẵn cả `HNX` lẫn
`UPCOM`, mà đem mã UPCOM so với VN-Index thì phép so hỏng từ đầu — chính lý do user nêu khi
bỏ đường vốn hoá thị trường bên /phantich. `IDX_SAN` ánh xạ HOSE→`VNINDEX`/`VN-Index`,
HNX→`HNX`/`HNX-Index`, UPCOM→`UPCOM`/`UPCOM-Index`; nhãn nút viết sẵn "VN-Index" trong HTML
(đa số mã) và được sửa lại trong `init` cho hai sàn kia.

> **ĐỌC BẢN GẦY `data/chiso/{CHỈ SỐ}.json`, ĐỪNG ĐỌC `data/chiso.json`.** File gộp giữ cả 5
> chỉ số kèm `v` và `pc` — **254 KB đã nén cho một đường kẻ**, trong khi riêng VNINDEX chỉ
> tốn **34 KB**. Hai shape do CÙNG `kho_chiso()` ghi ra từ CÙNG một dict nên không thể trôi
> khỏi nhau; file gộp vẫn là kho chính (`build_phantich.py` đọc nó). Xem mục *CHỈ SỐ ĐÃ SÂU
> TỚI 2000* bên dưới.

**NEO CỨNG MỘT LẦN CHO CẢ CHUỖI, TRÊN TRỤC PHẢI THỨ HAI (sửa 23/08/2026).**

> **BẢN ĐẦU NEO THEO KHUNG NHÌN VÀ ĐÓ LÀ MỘT LỖI THẬT, KHÔNG PHẢI CHUYỆN THẨM MỸ.** User:
> *"khi tôi kéo chart về bên trái hoặc phải thì chart vnindex di chuyển lên xuống … cái cần
> là vnindex phải thực sự cố định"*. Bản đầu neo MỖI ĐƯỜNG RIÊNG vào giá đóng cửa theo trung
> bình khung nhìn — mà chỗ hai đường cắt nhau chỉ phụ thuộc **TỈ SỐ giữa hai phép neo**. Đo
> 251 mã HOSE, so tỉ số đó giữa các khung trên CÙNG một mã: trôi **trung vị ×1,95 · p90
> ×2,88 · max ×10,6**. Tức chỗ cắt biến mất hoặc mọc ra chỗ khác mỗi lần kéo chart — đúng
> thứ người ta nhìn vào để kết luận mạnh/yếu.

Hai việc TÁCH BẠCH, đừng gộp:

**① `k` CỐ ĐỊNH — cái này mới là bản sửa.** Tính MỘT LẦN trên MIỀN NEO, không theo khung nhìn:

```
k        = exp( TB(log vốn hoá) − TB(log chỉ số) )     trên miền neo
hai đường = vốn hoá(i)   và   k × chỉ số(i)
```

Chỗ cắt = chỗ `vốn hoá ÷ chỉ số = k`, mà `k` bất biến nên **chỗ cắt bất biến**. Kéo/phóng bao
nhiêu cũng không dời được một điểm cắt nào.

**② TRỤC RIÊNG (`padR2` = 62px), thang khít MIỀN NEO** chứ không khít khung nhìn — nên cặp này
cũng không nhúc nhích lên xuống so với nến. Nến giữ trục của nến, và **`mn`/`mx` của trục giá
thôi phải nới ra ôm hai đường** như bản cũ, tức nến không còn bị bóp.

> **VÌ SAO KHÔNG NỚI TRỤC GIÁ THEO ĐƯỜNG CHỈ SỐ** — đã đo, xem mục *SỨC MẠNH SO VỚI CHỈ SỐ*:
> 47,5% số cửa sổ đường nằm hẳn ngoài khung nến, nới trục để ôm thì nến bẹp còn 24% chiều cao
> ở p90. Trục riêng là đường duy nhất.

> **THANG LOGA.** Câu hỏi là "mạnh hơn bao nhiêu", tức một TỈ LỆ — trên thang loga khoảng cách
> dọc giữa hai đường đúng bằng `log(vốn hoá ÷ k×chỉ số)`, nên hơn 20% ở 2022 trông đúng bằng
> hơn 20% ở 2026. Độ nén đo ra gần như nhau (cửa sổ 120 phiên chiếm 41% chiều cao trục với
> loga, 40% với thang thường) nên chọn loga là chọn không mất gì.

> **VẪN CHẮC CHẮN CÓ ĐIỂM CẮT:** `k` đặt cho `TB(log vốn hoá − log k×chỉ số) = 0`; nằm trên ở
> mọi phiên thì trung bình phải dương — mâu thuẫn. Đo 251 mã: trung vị **22 lần cắt** trong
> 1.000 phiên (p10 5 · p90 41).
> **NHƯNG MỘT KHUNG NHÌN HẸP CÓ THỂ KHÔNG CÓ LẦN CẮT NÀO — và đó là sự thật, không phải lỗi.**
> Bảo đảm cắt là trên CẢ MIỀN NEO. Bản cũ luôn đẻ ra điểm cắt trong mọi khung chính vì nó neo
> lại theo khung; đó là điểm cắt bịa.

> **MIỀN NEO = GIAO CỦA CÁC ĐƯỜNG ĐANG BẬT — chi tiết dễ bỏ sót nhất.** Bật cả hai thì miền =
> phần có vốn hoá (1.000 phiên gần nhất), và **đuôi chỉ số 2013–2022 không được tính vào thang
> lẫn không vẽ** — ở đó không có gì để so. Cho nó vào thì thang phải ôm cả cú leo 3,7 lần của
> thị trường và cửa sổ 120 phiên tụt từ **39% xuống 13%** chiều cao trục, nén tới mức không đọc
> được đúng cặp đường mình đang muốn đọc. **Tắt vốn hoá đi thì miền = toàn bộ chỉ số** và
> đường chỉ số dài lại như cũ — đã kiểm: 1.246/1.246 nến.

> Chú thích đổi thành **"VN-Index quy đổi"** khi bật cả hai: số trên trục lúc đó là tỷ đồng
> chứ không phải điểm, mà ô đọc số vẫn in điểm thật. Cùng lý do đã đặt tên đường bên /phantich.

**BA THỨ NHỎ MÀ BỎ LÀ HỎNG:**

1. **`aggregate()` phải chép `vh`/`ix` sang rổ tuần/tháng/năm** (theo luật ĐÓNG CỬA — giá trị
   cuối cùng còn số trong rổ, đúng như `cur.c`). Rổ là object dựng tay: quên là bấm
   Tuần/Tháng/Năm thì hai đường lặng lẽ biến mất, **không lỗi, không dấu hiệu gì**.
2. **`gopPhu()` phải chạy lại sau MỌI lượt nạp nến.** Bấm Tháng/Năm là `loadChart` xin thêm
   10 năm và **thay hẳn** `dailyRows` bằng mảng khác — mảng mới không có hai trường đó.
3. **Ngắt nét ở phiên thiếu số** (`st=false`), đừng nối thẳng. Ba nguồn ba độ sâu: vốn hoá
   1.000 phiên (từ 18/08/2022) · chỉ số **từ 28/07/2000** · nến tới 13 năm (02/01/2013).
   Nối thẳng qua chỗ trống là tự tay bịa một đoạn không có dữ liệu. Nay chỉ số **sâu hơn cả
   nến**, nên đường chỉ số phủ trọn mọi khung của mọi mã; cái cụt còn lại là đường vốn hoá.

**Màu và bề dày ĐỒNG BỘ với /phantich**: vốn hoá xanh lá `#34d399`/`#16a34a` dày 2,4px, chỉ số
hồng sen `#f472b6`/`#db2777` dày 1,8px. Xanh lá trùng màu nến TĂNG là biết trước và chấp nhận
— bề dày tách nó khỏi thân nến, và đây là đường người dùng vừa tự tay bật lên nên không bất
ngờ. Người xem đi qua lại hai trang, đổi màu ở một bên là mất luôn phép nhận mặt.

**CHỈ TẢI KHI BẤM**, mỗi thứ một lượt mạng (~80 KB và ~130 KB đã nén) — không đáng bắt 1.527
trang mã × mọi lượt crawler trả giá cho thứ chưa ai bật. Dòng đọc số in **số thật** (vốn hoá
theo đơn vị tỷ, chỉ số theo điểm), không in số đã quy đổi để vẽ: tỉ số neo đổi theo khung nhìn
nên in nó ra là mỗi lần kéo chart một con số khác.

**KHUNG "TRONG NGÀY" KHOÁ MỜ BA NÚT** (`khoaPhuTheoKhung`, danh sách `PHU_K`) — nến 5 phút, mà
hai kho này chỉ có số theo PHIÊN. Bấm mà màn hình không đổi gì là người ta bấm lại mấy lần rồi
kết luận tính năng hỏng.

> `rs` KHÔNG còn là nút DOM từ 25/08/2026 (thành ô công tắc trong khung — xem mục *DẢI "CÁCH
> NỀN"*). `PHU_K` vẫn giữ `'rs'` cho tương thích: vòng khoá theo khung chỉ tra `querySelector`
> nên không tìm thấy nút là bỏ qua lặng, mà dải tự tắt ở khung Trong ngày bằng `rsH=0`.

**`bubbles.html`** — **Đừng "dọn rác" bằng cách xoá lõi giá trong file này để gọi `CP.*`.**
Nó giữ `state.coins` riêng. Các cặp hàm trùng lặp phải sửa **đồng thời** cả hai file:
`consolidateSectors`, `loadEOD`↔`loadBase`, `pollBoard`, `saveLiveShared`↔`saveLive`,
`applyLiveShared`↔`applyLive`, `sessionOpen`, `lastSessionDate`, `pricesFinal`.
Màu bảng điện (trần tím · tăng lục · TC vàng · giảm đỏ · sàn lơ) định nghĩa ở **ba nơi**.

**`congcu.js`** — Thêm module phải sửa **6 chỗ**: `MODULES`, `PATHOF`, `TITLEOF`, `BYPATH`,
tab trong HTML, rule trong `_redirects`. Poll sống chỉ vẽ lại module radar.
(`BYPATH` trước nằm ngay trong `init` nên `popstate` không với tới được — đã nhấc ra ngoài
cùng chỗ với `PATHOF`/`TITLEOF`.)

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

## `/fun` — VN-INDEX GIẢ ĐỊNH, TRANG ẨN (27/08/2026)

User: *"thêm 1 chỉ số là VN-Index khi VIC vốn hoá cố định 200k tỷ và VHM cũng 200k tỷ … chỉ số
này nên đặt ở 1 trang ẩn cpvn.io/fun, không xuất hiện trên web, chỉ ai biết tên miền /fun mới
xem được"*.

```
r_còn lại  = (r_chỉ số − w_VIC·r_VIC − w_VHM·r_VHM) ÷ (1 − w_VIC − w_VHM)
r_giả định = r_còn lại × vốn hoá còn lại ÷ (vốn hoá còn lại + 400.000 tỷ)
```

**BÓC KHỎI CHỈ SỐ THẬT, KHÔNG DỰNG LẠI CHỈ SỐ TỪ ĐẦU.** Dựng lại từ 405 mã HOSE thì mọi sai số
của kho (35 mã đã huỷ niêm yết không còn trong kho, phiên thiếu giá, vốn hoá suy ngược) đi
thẳng vào KẾT QUẢ. Bóc thì phần "cả sàn trừ hai mã" neo vào chính chỉ số HOSE công bố; sai số
của kho chỉ còn ảnh hưởng tới TRỌNG SỐ — bậc hai, nhỏ hơn hẳn.

**ĐÃ ĐỐI CHIẾU HAI ĐƯỜNG ĐỘC LẬP** (3.400 phiên 2013→2026), và đây là thứ duy nhất cho phép
tin một con số **không có nguồn nào để đối chiếu**:

| phép đo | trung bình \|lệch\|/phiên | p99 | max | tương quan |
|---|---|---|---|---|
| dựng lại cả chỉ số từ 405 mã ↔ chỉ số HOSE thật | **0,070%** | 0,375% | 0,805% | **0,9960** |
| "phần còn lại" dựng-lại-từ-mã ↔ bóc-khỏi-chỉ-số | **0,079%** | 0,414% | 0,871% | **0,9951** |

Kết quả neo 17/05/2018: VN-Index **1.030,64 → 1.788,78 (+73,6%)** · bản ghim **→ 1.454,63
(+41,1%)**, chênh **−334 điểm (−18,7%)**. VIC+VHM đang chiếm **26,7%** vốn hoá HOSE; ghim ở
200.000 tỷ thì còn 3,0% mỗi mã.

> **KHÔNG PHẢI LÚC NÀO BẢN GHIM CŨNG THẤP HƠN — đừng đọc nó thành "bỏ Vingroup ra thì chỉ số
> tệ hơn".** Suốt 2024–2025 bản ghim CAO HƠN chỉ số thật (+6,8% đầu 2024, +7,2% đầu 2025) vì
> hai mã đó đang giảm; sang 2026 thì lật hẳn. Nó đo ĐÓNG GÓP của hai mã, không đo tốt xấu.

**CHUỖI GHI RA LÀ CHUỖI LỢI SUẤT GHÉP, NEO Ở PHIÊN ĐẦU.** Trang tự neo lại ở mốc nào cũng được
bằng `g[i]/g[T]·c[T]` — đúng bằng việc ghép lại từ phiên T với mức xuất phát `c[T]`, **không
phải xấp xỉ** (`test_fun.py` khối ④). Nên kho KHÔNG ghi nhiều bản neo sẵn.

**VHM CHỈ TÍNH TỪ NGÀY LÊN SÀN (17/05/2018)** — đóng đinh vốn hoá cho một mã chưa niêm yết là
bịa ra một cấu phần không có thật.

> **TRƯỚC 20/11/2017 VỐN HOÁ VIC CÒN DƯỚI 200.000 TỶ** (2013 chỉ 56.000 tỷ), nên ở quãng đó
> giả định làm VIC **TO HƠN** thực tế và kéo chỉ số giả định xuống. Đó là hệ quả đúng của giả
> định, không phải lỗi — nhưng vì thế mốc mặc định của trang là **17/05/2018**, phiên đầu tiên
> cả hai mã đều đã vượt 200.000 tỷ. Chip "Tất cả" vẫn xem được, và trang nói rõ điều này.

**HỘP ĐỌC SỐ VẼ THẲNG LÊN CANVAS, VÀ GHIM ĐƯỢC (27/08/2026).** User: *"tôi click chuột vào
chart không thấy hiện giá VN-Index, tôi muốn hiện lên dễ nhìn hơn"*. Bản đầu chỉ có **một
dòng chữ xám dưới đồ thị**: mắt đang ở trên chart thì không ai nhìn xuống dưới legend, và
trên điện thoại **không có `mousemove` nào** nên bấm vào chart đúng là không ra gì thật.

- **Bấm = ghim / bỏ ghim**, và đã ghim thì rê chuột không đổi phiên nữa — cùng luật với đồ
  thị /phantich và trang mã. Trên điện thoại ghim là **đường duy nhất** để đọc số nên bắt
  thẳng `touchend` rồi nuốt cú `click` theo sau; `click` giả sau cú chạm có nơi có nơi không.
- **Nét ĐỨT khi đang rê, nét LIỀN + tam giác khi đã ghim.** Không phân biệt hai trạng thái
  thì bấm xong không biết mình đã ghim hay chưa.
- Hộp đặt ở **nửa đối diện** với hai đường tại cột đó (chúng chạy sát nhau nên chỉ cần nhìn
  một điểm), kẹp trong khung để không bị xén ở mép. Đổi mốc thì **bỏ ghim** — mốc cũ có thể
  nằm ngoài khung mới.

> **LƯỢT VẼ ĐẦU TIÊN BỊ PHÓNG 2× — `veChac()`.** `ve()` chạy ngay khi `fetch` xong, lúc bố
> cục CHƯA ngã ngũ: đo được `clientWidth = 507` trong khi bề rộng thật là 1014, nên canvas
> dựng bitmap bằng nửa khổ rồi trình duyệt kéo giãn gấp đôi — **mọi thứ to gấp đôi, nhãn trục
> đè lên nhau**, nhìn ra như lỗi phông chữ chứ không ai nghĩ tới kích thước canvas. Đúng con
> bệnh `veLaiFinChartChac` của `cophieu.html`, và cách chữa cũng vậy: vẽ xong thì **so lại
> bitmap với bề rộng thật**, lệch thì vẽ thêm đúng một lượt. `ResizeObserver` chỉ là đường
> phụ — tab ở nền thì nó không bắn.

> **NHÃN NGÀY RẢI THEO `k/kh`, ĐỪNG CỘNG DỒN `i += buoc`.** Cộng dồn thì phiên CUỐI gần như
> luôn rơi ra ngoài vòng lặp và **mất nhãn ngày mới nhất** — thứ người ta liếc vào trước tiên
> (đã dính: khổ điện thoại chỉ còn `05/2018 · 07/2022`, mất hẳn `08/2026`). Số nhãn chia theo
> bề rộng (`plotW/120`, kẹp 2..5): nhãn `05/2018` rộng ~44px nên sáu nhãn ở vùng vẽ 251px là
> chồng thành một vệt. Đo lại cả 5 mốc × hai khổ: **0 cặp đè nhau, 0 nhãn tràn mép**.

**KIỂM: `python3 tools/test_fun.py`** — 25 phép, chạy trước mỗi lần đẩy nếu có đụng vào
`kho_fun.py`. Ba lớp: ① **đẳng thức** (bơm số giả biết trước đáp án: ghim đúng bằng vốn hoá
thật + mã đứng yên phải trùng khít chỉ số thật) · ② **nhân quả** (thêm phiên mới không đổi giá
trị đã tính) · ③ **đối chiếu hai đường độc lập** trên kho thật.

> **BẪY VIẾT KIỂM THỬ ĐÃ DÍNH, cả hai đều là KỲ VỌNG sai chứ không phải code sai:** ①  tỉ
> trọng ĐỔI TỪNG PHIÊN (phần còn lại lớn lên trong khi 200.000 tỷ đứng yên) nên đáp án phải
> tính bằng vòng lặp, luỹ thừa một hằng số ra 1.167,45 trong khi đúng là 1.170,27; ② muốn chỉ
> số THẬT vẫn tăng trong lúc bản ghim giảm thì phần VIC kéo lên phải lớn hơn phần còn lại kéo
> xuống — bộ số 100.000/900.000 cho chỉ số thật GIẢM, ca kiểm khi đó tự mâu thuẫn.

**ẨN NGHĨA LÀ KHÔNG QUẢNG BÁ, KHÔNG PHẢI BẢO MẬT.** Không mục nào trên web trỏ tới `/fun`,
site không có sitemap, và trang mang `noindex,nofollow,noarchive`. Ai biết đường dẫn thì vẫn
mở được — **đừng đặt gì nhạy cảm ở đây**. **KHÔNG khai `/fun` vào `robots.txt`**: file đó
công khai nên `Disallow: /fun` chính là quảng cáo đường dẫn.

> **KHÔNG cần rule trong `_redirects`** — Cloudflare Pages tự phục vụ `/fun` cho `fun.html`,
> y như `/bubbles`. Thêm rule là vòng lặp 307, đúng cảnh báo ở đầu file đó. Nhưng **PHẢI thêm
> `_headers`** `must-revalidate` cho cả `/fun` lẫn `/fun.html`: toàn bộ mạch JS nằm inline
> trong file mà HTML thì không có `?v=`.

**CÂU CHỮ TRÊN TRANG GIỮ TRUNG TÍNH.** User gọi nó là *"VN-Index khi Vingroup không pump"*;
trang thì gọi đúng phép tính — *"VN-Index giả định: VIC và VHM cố định 200.000 tỷ"*. Đây là
trang CÔNG KHAI (ẩn chỉ là không quảng bá), và một câu ám chỉ doanh nghiệp có tên thao túng
giá là thứ khác hẳn một phép tính giả định. Kèm khối miễn trừ như mọi trang khác.

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
