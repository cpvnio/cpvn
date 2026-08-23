### DẢI "SỨC MẠNH" — CHỈ BÁO CỐ ĐỊNH THẬT SỰ, `giá ÷ điểm chỉ số` (23/08/2026)

User: *"chỉ báo vnindex trong đồ thị đang không cố định theo chart, khi tôi kéo về phía sau
thì nó cũng di chuyển … tôi muốn biến nó thành 1 chỉ báo thực sự và cố định"*. Nút thứ ba
`Sức mạnh` ở cả `#cvInd` lẫn `#ptInd`, cờ `ind.rs`, dải riêng dưới cùng.

**LỜI PHÀN NÀN ĐÚNG, VÀ ĐO ĐƯỢC.** Đường VN-Index trên chart giá neo theo TRUNG BÌNH KHUNG
NHÌN, nên cùng một phiên đọc ra mấy giá trị khác nhau. REE phiên 03/06/2024 (giá 46.246):

| khung nhìn | đường VN-Index quy đổi |
|---|---|
| 120 phiên | 45.797 — **dưới** giá |
| 500 phiên | 46.252 — **trên** giá |
| cả chuỗi | 42.128 |

Không chỉ xê dịch 9,8%: **phép đọc LẬT** — cùng ngày đó, chỗ này bảo mã hơn thị trường, chỗ
kia bảo kém. Đó mới là cái hỏng, chứ không phải chuyện đường nhúc nhích.

**VÌ SAO KHÔNG NEO CỨNG NGAY TRÊN TRỤC GIÁ — ĐÃ THỬ TRÊN GIẤY VÀ BỎ.** Trục giá của
`chart.js` **tự khít theo nến đang hiện**, nên mọi đường neo cứng đều phải trôi khỏi khung.
Đo 216 mã HOSE × 30.073 cửa sổ 120 phiên, neo một lần cho cả chuỗi:

- **47,5%** số cửa sổ đường nằm **hẳn ngoài** khung nến — kéo chart hai lần thì một lần mất hút;
- nới trục để ôm nó: khung phình **trung vị ×1,50 · p90 ×4,15 · max ×62** → nến bẹp còn
  **67% / 24% / 1,6%** chiều cao.

Không có cách thứ ba. Muốn cố định thì phải **rời trục giá xuống dải riêng**, đúng chỗ RSI và
MACD đang đứng.

**CÔNG THỨC — TỈ SỐ THÔ, KHÔNG CHUẨN HOÁ (user chọn):**

```
RS(i) = giá đóng cửa(i) ÷ điểm chỉ số(i)
```

Mỗi phiên một giá trị, phụ thuộc đúng hai con số của chính phiên đó — **không cửa sổ, không
trung bình trượt, không phiên neo**. Kéo/phóng bao nhiêu cũng không đổi được nó. RS đi lên =
mã chạy hơn thị trường, ở mọi khung, mọi mức phóng. Kiểm: REE 03/06/2024 ra **36,1297** trước
khi kéo, sau khi phóng 6 nấc, và sau khi về khung mặc định — ba lần y hệt.

> **BA CÔNG THỨC ĐÃ ĐO RỒI BỎ** (212 mã HOSE, chuỗi ngày từ 2013) — ghi lại để khỏi đo lại:
>
> | công thức | cắt mốc 0 / năm | \|giá trị\| p90 |
> |---|---|---|
> | Mansfield 250 `(RS ÷ TB250(RS) − 1)×100` | 7,8 | 33,4 điểm % |
> | Alpha 60 phiên (chênh lệch lợi suất luỹ kế) | **15,3 — quá nhiễu** | 29,0 |
> | Alpha 250 phiên | 6,8 | **70,5 — thang nhảy mạnh khi đổi mã** |
>
> Mansfield là bản chuẩn hoá tốt nhất trong ba cái (mốc 0 đọc được thành một câu, ~8 lần đảo
> một năm) — nếu sau này cần một biến thể dao động quanh 0 thì lấy nó, đừng lấy Alpha.

**THANG DẢI KHÍT THEO KHUNG NHÌN, KHÔNG KHÍT CẢ CHUỖI — chỗ dễ hiểu ngược nhất.** "Cố định"
đã nằm ở GIÁ TRỊ rồi, không cần nằm thêm ở thang. Khít cả chuỗi thì đường đứng im tuyệt đối,
nhưng đo được: một cửa sổ 120 phiên chỉ chiếm **trung vị 16% chiều cao dải** (p25 10% · p10
6%; thang loga cũng chỉ 17%/12%/9%) — trên dải ~60px là một vệt 10px, tức phóng to để rồi
không đọc được gì. Bù lại **phải luôn in số thật**: hai nhãn mép phải + thẻ giá trị + ô trong
dòng đọc số. Có số thì mức phóng đổi bao nhiêu cũng không gây hiểu nhầm.

**VẠCH ĐỨT = MỨC CỦA PHIÊN MỚI NHẤT TOÀN CHUỖI**, không phải phiên cuối khung nhìn. Nó trả
lời "đoạn đang xem mạnh hay yếu hơn HÔM NAY", và vì neo vào phiên cuối chuỗi nên kéo đi đâu
nó vẫn nói đúng một điều.

**DẢI NẰM DƯỚI CÙNG, và MACD phải lùi lên.** `subH = rsiH + macH + rsH`; `geo.rsiTop` giữ
nguyên công thức (vẫn là dải trên cùng) nhưng **MACD đổi từ `h−22−macH+4` sang
`h−22−macH−rsH+4`** — quên dòng này là MACD vẽ đè lên dải mới. Bật cả ba dải trên chart toàn
màn hình 875px: vùng giá còn 216px, vẫn đọc được; chart nhỏ 436px chỉ có RSI + Sức mạnh nên
còn 170px.

**KHÔNG CẦN TRƯỜNG MỚI TRONG `aggregate`** — RS tính tại chỗ lúc vẽ từ `r.c` và `r.ix` đã có
sẵn, nên khung Tuần/Tháng/Năm tự đúng: RS của nến tuần = giá đóng cửa tuần ÷ điểm chỉ số cuối
tuần. Kiểm W/M/Y đều ra cùng một số ở phiên cuối.

**ĂN CHUNG KHO VỚI NÚT `VN-Index`** (`taiChiSo` gói trong một lời hứa) nên bật cả hai cũng chỉ
một lượt mạng. Màu xanh mòng két `#0d9488`/`#2dd4bf` — **đừng mượn hồng sen của đường chỉ số**:
hai thứ khác hẳn nhau (một đường quy đổi neo theo khung · một tỉ số cố định), cùng màu là
trông như một.

> **ĐƯỜNG VN-INDEX TRÊN CHART GIÁ GIỮ NGUYÊN** (user chốt cùng lượt). Nó trả lời câu khác —
> *"trong khung đang nhìn, phiên nào mã đắt/rẻ so với mức trung bình của chính khung"* — và
> là thứ duy nhất so trực tiếp được với nến trên cùng một trục. Dải Sức mạnh là **cộng vào**,
> không phải thay thế.
