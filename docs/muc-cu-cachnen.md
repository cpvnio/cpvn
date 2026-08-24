### DẢI "CÁCH NỀN" — ĐỌC SỚM HƠN CÚ CẮT, `vốn hoá ÷ chỉ số` (25/08/2026)

User: *"nhiều mã có vốn hoá cắt xuống dưới đường VN-Index đi một khoảng khá xa rồi đột ngột
quay đầu cắt lên lại, ví dụ VHM–VIC … đợi đường vốn hoá cắt đường VN-Index thì cổ phiếu đã đi
được một đoạn xa rồi và trạng thái tâm lý của tôi khi đó sẽ dè chừng hơn"*.

**LỜI PHÀN NÀN ĐÚNG, VÀ ĐO ĐƯỢC — ĐÂY LÀ SỐ QUAN TRỌNG NHẤT CỦA CẢ MỤC.** Quét 395 mã HOSE có
kho vốn hoá (1.138.549 phiên), lấy mọi đoạn tụt xuống dưới nền ≥0,40 (log) rồi cắt lên lại —
**340 đoạn**:

| đo tại thời điểm cắt lên | trung vị |
|---|---|
| vốn hoá đã tăng từ đáy | **+86%** |
| lợi suất TƯƠNG ĐỐI 60 phiên SAU cú cắt | **−1,1%** |
| lợi suất tương đối 120 phiên sau cú cắt | +4,5% (trung bình) · trung vị +0,5% |

Nói thẳng: **cú cắt là mốc MÔ TẢ, không phải mốc SỚM.** Gần hết đoạn tăng nằm TRƯỚC nó, và
sau nó thì kỳ vọng tương đối bằng không. Càng quay đầu gấp càng tệ — 25 ca hồi nhanh nhất
(vốn hoá đáy ≥1.000 tỷ) có 16/25 âm trong 250 phiên sau cắt (BFC −61% · QCG −68% · LDG −65%).
**VIC và VHM là NGOẠI LỆ, không phải luật**: VIC +436% và VHM +112% sau cắt, nằm ở đuôi phải.

**DẢI THAY CHO "SỨC MẠNH" CŨ.** Bản 23/08 vẽ `giá ÷ điểm chỉ số`, thang khít KHUNG NHÌN. Hai
chỗ hỏng: ① **giá** thì hạ nền được (user đã chỉ ra: *"vốn hoá của cổ phiếu chứ không phải
giá vì giá có thể bị hạ nền"*) — phát hành thêm làm vốn hoá tăng mà giá đứng im; ② thang theo
khung nhìn thì kéo ngang một cái là đường đổi hình, đúng lỗi đã bắt ở đường VN-Index.

```
g(i) = log( vốn hoá(i) ÷ chỉ số(i) ) − TB TRƯỢT 1.250 nến của chính tỉ số đó
```

**NỀN LÀ TRUNG BÌNH TRƯỢT, KHÔNG PHẢI TRUNG BÌNH ĐOẠN ĐANG NẠP — đã đổi 25/08 và đừng đổi
ngược.** Bản đầu dùng đúng `k` của `P2` (trung bình cả đoạn nạp) nên vạch 0 của dải trùng khít
chỗ hai đường cắt nhau, nghe thì gọn. Hai chỗ hỏng khiến phải bỏ:

① **Có nhìn trước.** Mọi phiên quá khứ được neo bằng một con số chứa cả tương lai của chính
   nó → không dùng để đọc sớm được, mà đọc sớm mới là lý do dựng dải.
② **Số nến nạp thay đổi theo mã và theo khung** (GAS về 3.400 nến, VHM về 1.246), nên CÙNG MỘT
   MÃ ra hai con số khác nhau ở chart và ở bảng giá. Đo được trước khi sửa: GAS **−33,0%** trên
   chart nhưng **−18,3%** ở bảng giá, cùng phiên 21/08/2026. Sau khi sửa: **−18,3% cả hai chỗ.**

Đổi lại **vạch 0 KHÔNG còn trùng điểm cắt của hai đường** — chấp nhận có chủ ý, vì hai thứ trả
lời hai câu khác nhau: hai đường nói *"đắt hay rẻ so với trung bình đoạn đang xem"*, dải nói
*"mạnh hay yếu so với chính mình 1.250 phiên qua"*. Nhãn dải in thẳng số nến (`Cách nền 1.250
phiên — …`) để không ai đọc nhầm thành cùng một câu hỏi.

Cửa sổ co lại khi chuỗi ngắn: `Wma = min(1250, max(120, n/2))`, và cần ít nhất `min(Wma,60)`
điểm mới cho ra giá trị. Thang lấy min/max trên `rows`, **không** trên `vis` — kéo ngang thì
`mn/mx` giữ nguyên.

**VÌ SAO PHẢI LÀ DẢI RIÊNG, KHÔNG NEO THẲNG TRÊN TRỤC GIÁ — ĐÃ ĐO 23/08, ĐỪNG ĐO LẠI.** Trục
giá của `chart.js` **tự khít theo nến đang hiện**, nên mọi đường neo cứng đều phải trôi khỏi
khung. Đo 216 mã HOSE × 30.073 cửa sổ 120 phiên, neo một lần cho cả chuỗi:

- **47,5%** số cửa sổ đường nằm **hẳn ngoài** khung nến — kéo chart hai lần thì một lần mất hút;
- nới trục để ôm nó: khung phình **trung vị ×1,50 · p90 ×4,15 · max ×62** → nến bẹp còn
  **67% / 24% / 1,6%** chiều cao.

Không có cách thứ ba. Muốn cố định thì phải **rời trục giá xuống dải riêng**, đúng chỗ RSI và
MACD đang đứng. `subH = rsiH + macH + rsH`, và **MACD phải lùi lên** (`h−22−macH−rsH+4`) —
quên dòng đó là MACD vẽ đè lên dải.

**BA DẤU SỰ KIỆN — VÀ VÌ SAO CHÚNG NHÂN QUẢ CÒN VẠCH NỀN THÌ KHÔNG.** `k` lấy trung bình CẢ
chuỗi đang nạp, tức mọi phiên quá khứ đều được neo bằng một con số có chứa tương lai của
chính nó. Vạch nền vì thế chỉ dùng để **mô tả**. Hai dấu thì so `g` với chính `g` trong quá
khứ, mà đổi `k` chỉ dịch toàn bộ `g` đi một hằng số — argmin/argmax trong mọi cửa sổ đứng
nguyên. **Nhân `k` kiểu gì dấu cũng không nhúc nhích** (`test_nen.js` kiểm thẳng ca này —
nhân thang chỉ số ×7,3, số dấu và vị trí dấu y hệt).

| dấu | định nghĩa | bắt được | nổ sớm hơn cú cắt | lúc nổ, vốn hoá so với đáy | còn lại tới lúc cắt |
|---|---|---|---|---|---|
| **△ phân kỳ** | vốn hoá thủng đáy W1 phiên mà `g` thì không | 40% số đoạn | **262 phiên** | **−2%** | **+65%** |
| **○ `g` đỉnh W1** | `g` cao nhất W1 phiên, khi CÒN dưới nền | 90% | 115 phiên | +32% | +36% |
| **● `g` đỉnh W2** | `g` cao nhất W2 phiên, khi CÒN dưới nền | 65% | 92 phiên | +41% | +28% |

`W2 ⊂ W1` nên **tầng nhỏ phải TRỪ tầng lớn ra** (`if(out.dinh[i]) out.dinhN[i]=false`), không
thì đúng những phiên đáng chú ý nhất lại bị vẽ hai dấu chồng lên nhau.

**W1/W2 = 100/200, PHẢI TRÙNG `opts` CỦA CHIP `nengan`** trong `assets/screener.js`. Bản đầu
để 120/250 và hậu quả im lặng: GAS hiện `nd100 = 2 phiên` ở bảng giá trong khi dấu gần nhất
trên chart lùi tận **144 phiên** — người dùng bấm từ bảng giá sang chart rồi không thấy gì.
`test_nen.js` khoá con số này. Nghỉ giữa hai dấu là `W/20`; bảng giá KHÔNG có nghỉ (nó đếm
phiên gần nhất) nên trong một chuỗi đỉnh liên tiếp chart vẽ ở phiên ĐẦU còn bảng giá đếm phiên
CUỐI — lệch tối đa `W/20` phiên, có chủ ý, không phải hai định nghĩa khác nhau.

**KIỂM TÍNH ĐỘC LẬP — MỤC QUAN TRỌNG NHẤT CỦA CẢ TÀI LIỆU NÀY, ĐỌC TRƯỚC KHI TIN BẤT KỲ CON
SỐ NÀO Ở TRÊN.** Bản đo đầu tiên đếm từng phiên-mã là một quan sát và cho ra kết quả rất đẹp
cho △ (n=484, trung vị +1,8% so với nền −2,8%, đuôi trái co từ 16,9% xuống 11,1%). **Sai.**
Số lần nổ mỗi tháng trên toàn sàn:

| tháng | 2025-04 | 2025-05→2026-02 | 2026-03 | 2026-07 |
|---|---|---|---|---|
| **△** | **101** | 0–13/tháng, phần lớn **0** | **65** | **92** |
| **●** | 19 | 1–8 đều đặn | 8 | 3 |

△ im lặng hàng tháng trời rồi nổ hàng loạt đúng lúc chỉ số sập (VN-Index 07/2026: 1.867 →
1.668, −10,7%). 484 quan sát ấy thực chất là **~10 sự kiện thị trường**; 5 tháng đông nhất
chiếm 31%. Gộp mỗi tháng thành MỘT quan sát:

| gộp theo tháng, vùng sâu `g ≤ −0,40` | số tháng | tv 120 phiên | tv 250 phiên | % tháng dương | P(cắt lên ≤500 phiên) |
|---|---|---|---|---|---|
| nền | 148 | −2,5% | −4,4% | 41% | 34% |
| **△ phân kỳ** | 54 | −1,8% | **−5,4%** | 43% | **27%** |
| **○ `g` đỉnh 120** | 106 | **+1,2%** | +1,2% | **54%** | — |
| **● `g` đỉnh 250** | 74 | **+1,2%** | **+5,1%** | **51%** | **50%** |

**KẾT LUẬN ĐÃ ĐỔI SO VỚI BẢN ĐO ĐẦU:**

- **△ KHÔNG PHẢI TÍN HIỆU CHỌN MÃ.** Sau khi bỏ tương quan, nó **tệ hơn nền** ở cả lợi suất
  250 phiên (−5,4% so với −4,4%) lẫn xác suất cắt lên (**27% so với 34%**). Nó là **dấu hoảng
  loạn diện rộng**: khi thấy nó sáng cùng lúc ở vài chục mã thì nó đang nói về THỊ TRƯỜNG chứ
  không nói gì về từng mã. Vẫn vẽ vì mốc đáy hoảng loạn là thông tin thật, **nhưng đừng bao
  giờ trình bày nó như một tín hiệu sớm.**
- **○ và ● MỚI LÀ TÍN HIỆU CỔ PHIẾU**, và chúng sống sót qua phép kiểm: 74–106 tháng khác
  nhau, 5 tháng đông nhất chỉ chiếm 19%, và ưu thế còn nguyên sau khi gộp (**+1,2% / +5,1%**
  so với nền **−2,5% / −4,4%**; xác suất cắt lên **50% so với 34%**). Đây là thứ trả lời đúng
  câu user hỏi.

> **BÀI HỌC PHƯƠNG PHÁP, ĐỪNG LẶP LẠI:** mọi chỉ báo dựa trên "so với mặt bằng chung" đều nổ
> theo CỤM, vì mẫu số là chung cho cả sàn. Đếm phiên-mã là tự nhân số quan sát lên hàng chục
> lần rồi tưởng mình có ý nghĩa thống kê. **Luôn gộp theo tháng (hoặc theo đợt) trước khi kết
> luận.** Con số 484 → 54 đã lật hẳn dấu của kết luận.

> **CẢNH BÁO CÒN NGUYÊN GIÁ TRỊ.** Ngay cả với ○/●, ưu thế đo trên 2013–2022 rồi mới nghiệm
> ra 2020–2025; riêng **2023–2025 cả vùng dưới nền đều âm** bất kể tín hiệu nào — đó là giai
> đoạn chỉ số tự nó chạy mạnh nên mọi mã tụt hậu đều tụt tiếp. Bộ điểm gộp 4 điều kiện (trên
> MA200 của chính nó · `g` đã hồi >0,10 từ đáy · độ sâu ≤−0,65 · biến động 60 phiên ≥ trung
> vị) đơn điệu đẹp ngoài mẫu ở đuôi phải (>+50% trong 250 phiên: 10,1% → 13,0% → 16,7% →
> 19,9% → **28,2%** cho điểm 0→4, giai đoạn 2020–2025) nhưng **lật hẳn dấu trong 2023–2025**
> (điểm 4 ra trung vị −27,4%, 47,2% số ca thủng −30%). Đã đo, đã biết, **chưa đưa lên giao
> diện vì đúng lý do đó**.

**CỬA SỔ TÍNH THEO SỐ NẾN, không theo số ngày** — giống hệt MA/RSI trên chart này: khung Tuần
thì W1 = 120 *tuần*. Chuỗi ngắn thì co lại (`W1 = min(120, max(20, n/6))`, `W2` tương tự với
250/40/`n`/3) để khung Tháng không mất trắng dải. Đo được: ngày `120/250` · tuần `43/86` ·
tháng `27/54`.

**HAI ĐƯỜNG PHỦ NAY NEO TRÊN ĐÚNG CỬA SỔ NỀN, KHÔNG PHẢI TRÊN CẢ CHUỖI NẠP** (sửa 25/08 sau
khi user báo *"DHC rõ ràng đã cắt và trên nền rồi tại sao vẫn báo dưới nền ở bộ lọc?"*). Đúng,
và lỗi nằm ở `k` của `P2`: nó lấy trung bình TOÀN BỘ số nến đang nạp, mà số đó đổi theo mã —
DHC về **3.400** nến, VHM về **1.246**. Đo DHC phiên 21/08/2026:

| nền tính trên | cách nền | hai đường trên chart |
|---|---|---|
| cả 3.400 nến đang nạp | **+46,7%** | vốn hoá nằm **TRÊN** đường chỉ số |
| 1.250 phiên (dải + bộ lọc dùng) | **−17,8%** | vốn hoá nằm **DƯỚI** |

Hai câu trả lời ngược nhau trên cùng một màn hình. Nay `k` chỉ lấy `NEN_MA_KHUNG[iv]` nến cuối
nên **dấu của "đang trên hay dưới" ở MÉP PHẢI luôn khớp bộ lọc** — kiểm lại DHC: vốn hoá 3.873
tỷ so với đường chỉ số 4.712 tỷ, đúng **−17,8%**.

> Các lần cắt trong QUÁ KHỨ vẫn đọc theo `k` cố định này chứ không theo nền trượt. Hai đường
> chỉ mang được MỘT hằng số nên không thể khớp nền trượt ở mọi thời điểm — đó là giới hạn của
> việc vẽ nền bằng một đường thẳng quy đổi, không phải lỗi.

**CHỈ CÒN MỘT MỐC: NỀN TRƯỢT 1.250 PHIÊN. ĐƯỜNG "VN-INDEX QUY ĐỔI" BẰNG HẰNG SỐ ĐÃ BỎ.**
User chốt 25/08/2026: *"chỉ có thể dùng 1.250 phiên chứ không thể áp ngược 13 năm được"*.

Đường cũ lấy MỘT hằng số `k` (trung bình tương quan 1.250 phiên gần nhất) rồi áp ngược cho cả
13 năm nến — tức năm 2013 bị đo bằng thước của năm 2026, thước lúc ấy chưa tồn tại. User bắt
được qua VNM:

| phiên | vốn hoá | đường nền | cách nền |
|---|---|---|---|
| 14/03/2022 | 161.345 tỷ | **312.201 tỷ** | −48,3% |
| 02/07/2026 | 115.993 tỷ | **207.239 tỷ** | −44,0% |
| 21/08/2026 | 133.339 tỷ | 192.555 tỷ | −30,8% |

Nền tụt từ 312 xuống 193 nghìn tỷ vì VNM yếu dần nhiều năm. Đo bằng thước TỪNG THỜI ĐIỂM thì
2022 tệ hơn 2026; đo cả hai bằng thước HÔM NAY thì ngược lại — và mắt nhìn chart thấy cái thứ
hai. Hai câu trả lời khác nhau trên cùng màn hình.

**KHÔNG GIỮ ĐƯỢC CẢ HAI — ĐÃ ĐO.** 278 mã đủ 2.500 phiên, chênh lệch lớn nhất giữa hai mốc
**ngay trong 1.250 nến cuối**: trung vị **37,8%** · p75 58,7% · p90 **84,2%** · VNM **117,8%** ·
max 171,3% (NNC). Không phải sai số làm tròn.

```
nền(i) = vốn hoá(i) ÷ exp(g(i)) = chỉ số(i) × exp(TB trượt 1.250 phiên của log(vốn hoá÷chỉ số))
```

Vẫn mang HÌNH của chỉ số, chỉ khác là quy đổi lại ở TỪNG phiên thay vì bằng một hằng số.
Được ba thứ:
- **nhân quả ở mọi điểm** — phiên nào cũng chỉ dùng dữ liệu trước nó;
- **vốn hoá cắt lên đường này ⟺ dải cắt vạch 0 ⟺ `nen ≥ 0` của bộ lọc** — ba chỗ khớp nhau
  đúng từng phiên, không chỉ khớp ở mép phải;
- ở phiên cuối nó **trùng khít** đường quy đổi cũ (đo VNM/DHC/GAS: lệch **0,000000%**, đúng về
  toán vì `k` chính là trung bình 1.250 phiên gần nhất), nên câu *"vốn hoá cắt lên VN-Index"*
  hôm nay vẫn đọc y như trước.

> **BẬT MÌNH `VN-Index` thì vẫn vẽ CHỈ SỐ THÔ theo điểm.** Không có vốn hoá thì không có tử số,
> nền vô nghĩa; chỉ số thô tự nó vẫn đọc được. Chú giải đổi theo: bật cùng vốn hoá ghi
> `— nền 1.250 phiên · VN-Index`, bật một mình ghi `— VN-Index`.

> **THANG TRỤC PHẢI PHẢI KHÍT THEO NỀN, KHÔNG THEO `k×chỉ số`** — hai thứ lệch tới p90 84%, lấy
> nhầm là đường nền chạy ra ngoài khung.

> **ĐỪNG DÙNG `rows.indexOf` TRONG VÒNG VẼ.** `veP` nay truyền sẵn chỉ số toàn cục `gi`; tra
> ngược bằng `indexOf` biến vòng vẽ thành O(n²) mà chart vẽ lại mỗi lần rê chuột.

**MÃ MỚI NIÊM YẾT: KHÔNG CÓ NỀN, VÀ KHÔNG BỊA RA MỘT CÁI.** User 25/08: *"ở VCK đường
VN-Index bị mất một khoảng hơn 10 phiên trong khi vốn hoá thể hiện đúng"*. VCK niêm yết
16/12/2025, cả kho **169 phiên**. Bản trước cho trung bình **nở dần** rồi in ra từ nến thứ 60 —
ba cái sai cùng lúc: hụt đầu chuỗi (chỗ user thấy mất), nhãn vẫn ghi "1.250 phiên" trong khi
thực chất là trung bình 8 tháng, và lệch hẳn `build_screen` (bên đó đòi đủ `1250+400` phiên nên
VCK **không có** `nen` trong bảng giá — chart lại hiện thứ bảng giá bảo là không có).

Nay:
- `g` chỉ có **từ nến thứ `Wma` trở đi** — cửa sổ ĐẦY, đúng cách `nen_tuoi()` tính;
- dưới `nenToiThieu(iv)` nến (Ngày 250 · Tuần 50 · Tháng 12 · Năm 5) thì **bỏ hẳn nền**: không
  dải, không đường nền, và đường thứ hai lui về `VN-Index quy đổi` **dài đúng bằng chart** —
  đó là thứ user cần thấy ở VCK;
- dải in thẳng lý do: *"mã mới — cần ít nhất 250 phiên, hiện có 169"*, chứ không phải "chưa đủ
  dữ liệu" trơn (mã mới thì phải chờ hàng năm, không phải chờ tải xong).

```
Wma = (n >= đích) ? đích : min(n, max(nenToiThieu, ⌊n×0,6⌋))
```

**ĐỪNG GỘP THÀNH MỘT `min` BA VẾ** — bản đầu viết `min(đích, n, max(...))` và `n×0,6` biến
thành cái TRẦN: chuỗi 1.500 nến ra cửa sổ 900 thay vì 1.250. `test_nen.js` khoá cả bốn ca
(169 → không nền · 1.500 → đúng 1.250 · 1.000 → 600 · `g` bắt đầu đúng nến thứ `Wma`).

> **`canNam` ĐỔI 5 → 6 NĂM** (`cophieu.html`). 5 năm ra ~1.246 nến — **hụt đúng 4 nến** so với
> cửa sổ 1.250, nên mã nào rơi vào nhánh nguồn ngoài (nhánh tôn trọng `from`) là chart phải hạ
> cửa sổ xuống 60% chuỗi và ra số khác bảng giá. Sáu năm ~1.500 nến, luôn đủ.

> **ĐƯỜNG NỀN NGẮN HƠN ĐƯỜNG VỐN HOÁ ĐÚNG `Wma` NẾN ĐẦU LÀ ĐÚNG, ĐỪNG "SỬA".** Không thể tính
> trung bình 1.250 phiên khi chưa có 1.250 phiên. VNM: 3.400 nến thì 2.151 nến có nền. Nối tạm
> bằng `k×chỉ số` cho đủ dài là ghép hai định nghĩa vào một đường — tệ hơn hẳn việc để trống.

**CỬA SỔ NỀN QUY THEO KHUNG** (`NEN_MA_KHUNG`): Ngày 1.250 · Tuần 250 · Tháng 60 · Năm 5 — đều
là ~5 năm. Nhãn dải in kèm đơn vị đúng khung (`NEN_DV`), vì user bắt được ảnh PVP ghi *"Cách
nền 128 phiên"* trong khi đang ở khung Tuần. **Đừng cắt cửa sổ còn `n/2`**: chuỗi ngày nạp mặc
định chỉ ~1.246 nến nên `n/2` hạ xuống 623, tức chart đo 2,5 năm còn bảng giá đo 5 năm.

**HỘP ĐỌC SỐ TỰ TRÁNH DỮ LIỆU.** User: *"bấm vào 1 vị trí khiến bảng thông báo hiện ra che mất
một phần phía sau"*. Bản cũ luôn dán vào phải-trên. Nay chấm bốn góc bằng `demDe()` — đếm số
nến và số điểm của hai đường phủ rơi vào ô chữ nhật — rồi lấy góc ít đè nhất; hoà thì giữ thứ
tự cũ để hộp không nhảy chỗ giữa các lần bấm. **Đếm trên DỮ LIỆU chứ đừng dò pixel**: lúc chọn
chỗ thì hộp chưa vẽ, mà hai đường phủ lại nằm trên TRỤC RIÊNG nên nhìn vị trí nến không đoán ra.

**BẬT/TẮT ĐƯỜNG PHỦ KHÔNG ĐƯỢC RESET KHUNG NHÌN.** User 25/08: *"khi bấm vào vốn hoá /
VN-Index / cách nền, chart không bị reset — hiện tại cứ chọn là bị reset, mất công kéo lại để
nhìn xa hơn"*. Thủ phạm là điều kiện trong `setRows`: nó bắt vào `i1 > rows.length` rồi gọi
`resetView`. Nhưng `clampView` **cho phép** chừa tới `span*OFFMAX` nến trống bên phải (vùng
trống tương lai, để vẽ dự phóng) nên `i1 > rows.length` là trạng thái **hợp lệ** — ai thu nhỏ
đủ xa hoặc kéo sang phải là rơi vào đó, và mọi lần bật/tắt đường phủ đều đi qua `setRows` để
gắn dữ liệu vào nến. Nay chỉ reset khi mép TRÁI thật sự ra ngoài dữ liệu (`i0 >= rows.length`);
đổi khung Ngày→Tháng vẫn reset như cũ vì số nến co hàng chục lần nên `i0` cũ chắc chắn vượt.
Kiểm: khung `[579, 3979]` trên chuỗi 3.400 nến (đúng trạng thái ảnh user gửi, trục kéo tới
Q3/30) giữ nguyên qua cả ba lần bật Vốn hoá · VN-Index · Cách nền.

**THANH DỌC GHIM CHỈ HIỆN KHI BẬT VỐN HOÁ HOẶC VN-INDEX** (`choGhim()`). Có lúc `rs` cũng mở
khoá vì hộp ghim in được dòng "Cách nền" — bỏ rồi: dải nằm ở khung riêng phía dưới, ghim một
thanh dọc xuyên qua vùng giá để đọc nó thì thanh ấy che nến mà không phục vụ thứ đang xem.
Gác ở CẢ `bamGhim` lẫn chỗ vẽ, để tắt đường phủ thì mốc ghim cũ cũng thôi hiện.

**BẬT/TẮT Ô CÔNG TẮC TRÊN ĐIỆN THOẠI — CHẶN BẰNG `preventDefault`, ĐỪNG CHẶN BẰNG THỜI GIAN.**
Trình duyệt di động phát thêm một cặp `mousedown`/`mouseup` giả sau mỗi cú chạm; cả `touchstart`
lẫn `mousedown` đều gọi `bamMoc` nên ô bật rồi TẮT ngay lại — nhìn ra y như nút hỏng.
Bản vá đầu chặn theo mốc thời gian (bỏ qua chuột trong 700ms sau khi chạm) và **sai ở đúng chỗ
dễ bỏ sót**: cú chạm kích hoạt vẽ lại (`nenArr` chạy O(n·W) trên 3.400 nến), máy chậm thì lượt
vẽ nuốt trọn cửa sổ 700ms rồi chuột giả mới tới — **đo được 1.124ms** ngay trên máy đang thử.
Hàng rào dựa vào "đủ nhanh" thì hỏng đúng lúc máy chậm. Nay `touchstart` đăng ký
`{passive:false}` và gọi `preventDefault()` **chỉ khi cú chạm trúng ô công tắc**, nên cuộn ở
mọi chỗ khác không đổi; canvas này vốn đã `{passive:false}` ở `touchmove`. Mốc thời gian giữ
lại làm lớp hai.

**Ô CÔNG TẮC NẰM TRONG KHUNG ĐỒ THỊ**, hàng thứ ba góc trái trên, cạnh `Cổ tức` và `BCTC` —
đúng quy ước user chốt 24/08 (*"cần gọn hơn"*): hàng nút dưới chart giữ nguyên **sáu nút 3×2**
ở khổ hẹp. Danh sách ô phải dựng ĐỘNG (`cvNut`) vì `Cách nền` có điều kiện hiện riêng.

- **Ô hiện TRƯỚC khi có dữ liệu.** Kho vốn hoá + chỉ số chỉ nạp khi có người hỏi tới; gác ô
  theo *"đã có dữ liệu chưa"* thì nó vĩnh viễn không hiện — không ai bật được cái mà chính nó
  phải bật mới có. Trang nào truyền `opt.onInd` là trang biết đi nạp (`napPhuCho`), và dải cần
  **CẢ HAI** kho: vốn hoá làm tử, chỉ số làm mẫu.
- **Khung "Trong ngày" bỏ hẳn dải** (`rsH = 0` khi `iv==='i'`), không vẽ dải rỗng: nến 5 phút
  mà hai kho kia chỉ có số theo PHIÊN. Cờ vẫn bật, quay lại khung ngày là dải trở lại.
- **`ind.rs` mở khoá cú ghim** cùng với `vh`/`idx` — hộp ghim nay in thêm dòng `Cách nền`.

> **BẪY ĐÃ TRẢ GIÁ — ĐỆM `nenArr` PHẢI XOÁ TRONG `setRows`, ĐỪNG DỰA VÀO KHOÁ ĐỆM.**
> `veLaiPhu` gắn vốn hoá/chỉ số vào rồi gọi lại `setRows` với mảng **cùng độ dài, cùng mốc
> đầu, cùng mốc cuối**. Mọi khoá đệm dựng từ hình dạng chuỗi đều thấy y hệt lần trước và trả
> về kết quả tính lúc CHƯA có phủ → dải rỗng vĩnh viễn dù dữ liệu đã về. Đã xảy ra thật; nay
> `setRows` xoá thẳng `nenCache.k`, và `test_nen.js` giữ ca này.

**KIỂM: `node tools/test_nen.js`** — 20 ca, nạp thẳng `assets/chart.js` vào VM canvas rỗng rồi
gọi chính `chart.nenSo()`. Ba nhóm đáng giá nhất: `k` đặt cho TB(g)=0; hai dấu bất biến khi
nhân thang chỉ số ×7,3; và ca đệm ở trên. Ngoài ra đã đối chiếu **cả dải với một bản dựng lại
độc lập bằng Python**: VHM 5 năm ra cùng `+64,0%`, cùng 3 dấu △ (30/06/2022 · 28/07/2022 ·
19/09/2022) và cùng 1 dấu ● (04/04/2025).

> **ĐƯỜNG VN-INDEX TRÊN CHART GIÁ GIỮ NGUYÊN.** Nó trả lời câu khác và là thứ duy nhất so
> trực tiếp được với nến trên cùng một trục. Dải là **cộng vào**, không phải thay thế.

> **BA CÔNG THỨC RS ĐÃ ĐO RỒI BỎ hồi 23/08** (Mansfield 250 · Alpha 60 phiên · tỉ số thô
> `giá ÷ điểm`) nay nằm ở `docs/muc-cu-sucmanh.md` — đừng đo lại.

### BỐN CHIP "CÁCH NỀN" Ở BẢNG GIÁ — `screen.json` + `screener.js` (25/08/2026)

User: *"bộ lọc tổng kết để đưa vào mục bảng giá"*. Bốn chip THƯỜNG, không phải một nút cho
ra sẵn danh sách — xem mục *Ranh giới pháp lý* luật 2: thứ bị cấm là **danh mục do chủ trang
chọn**, thứ được phép là **một con số đo được của riêng một mã, ngưỡng do người dùng đặt**.

| chip | trường kho | tham số người dùng |
|---|---|---|
| Vốn hoá ≥ {n} tỷ | `mcapLive`/`mcap` (bảng giá) | 1.000 · 3.000 · 10.000 · 30.000 |
| GTGD 60 phiên ≥ {n} tỷ | `avgval60` | 1 · 2 · 5 · 10 |
| Vốn hoá dưới nền dài hạn | `nen` | — |
| Khoảng cách tới nền hẹp nhất {n} phiên | `nd100/200/300/400` | 100 · 200 · 300 · 400 |

**`nen` = `log(vốn hoá ÷ chỉ số)` trừ trung bình trượt 1.250 phiên CỦA CHÍNH MÃ, in ra %.**
**ĐÚNG BẰNG con số dải *Cách nền* của chart in ra** — hai chỗ dùng chung một định nghĩa, và
phải giữ như vậy. Kiểm: GAS phiên 21/08/2026 ra `−18,3%` ở cả hai nơi.

> Trước 25/08 chart neo theo ĐOẠN ĐANG NẠP nên GAS ra `−33,0%` trên chart mà `−18,3%` ở bảng
> giá. Cùng một cái tên, hai con số — đã sửa bằng cách cho chart dùng trung bình trượt; xem
> mục *DẢI "CÁCH NỀN"*. **Đổi định nghĩa ở một bên thì phải đổi cả bên kia**, kèm `NEN_W1/W2`
> của chart và `opts` của chip `nengan`.

**`ndN` = SỐ PHIÊN kể từ lần gần nhất `nen` đạt đỉnh N phiên TRONG LÚC CÒN DƯỚI NỀN.** `0` là
chính hôm nay, `null` là chưa từng / chuỗi chưa đủ dài. Ghi **số phiên** chứ không ghi cờ
đúng-sai để đổi ngưỡng *"trong bao lâu"* mà không phải dựng lại kho; client chốt `NEN_TRE=5`,
đủ để người mở bảng chiều thứ Sáu vẫn thấy tín hiệu nổ hôm thứ Ba.

**CHỈ HOSE.** Cửa sổ nền cần 1.250 phiên vốn hoá liên tục, mà chỉ `data/vonhoa` có;
`data/giaodich` sâu 1.000 phiên nên HNX/UPCOM để `null`. **Mã thiếu dữ liệu phải TRƯỢT, không
được lọt** — `test_loc.js` giữ đúng ca này, vì một phép so sánh viết ẩu kiểu `!(t.nen>=0)` cho
`undefined` đi qua và người dùng nhận về một bảng trộn hai định nghĩa mà không có dấu hiệu gì.

**HÀNG ĐỢI ĐƠN ĐIỆU, KHÔNG CẮT LÁT RỒI `max()`.** Bản đầu của `nen_tuoi()` quét lùi và gọi
`max()` trên lát W phần tử mỗi bước: 500 bước × 400 phần tử × 4 cửa sổ × 405 mã ≈ **324 triệu**
phép so sánh, một mình nó dài hơn cả phần còn lại của `build_screen`. Hàng đợi cho cùng kết quả
trong O(n); tổng thời gian build giữ nguyên **7,3 giây**.

**DÒNG TRẠNG THÁI VN-INDEX (`#scrIx`) LÀ MÔ TẢ, KHÔNG PHẢI CỔNG.** Nó in EMA20/EMA50 và hai
dấu ✓/✗, chỉ hiện khi có chip "Cách nền" đang bật. **Đừng biến nó thành bộ lọc cứng chặn kết
quả** — làm vậy là bộ lọc tự trả lời *"hôm nay nên hay không nên"*, tức một lời khuyên. Người
xem tự quyết định có tính tới bối cảnh chỉ số hay không.

**THỨ TỰ PIPELINE ĐÃ ĐÚNG SẴN, không phải thêm bước**: `kho_vonhoa.py` ở `[1d]` và
`kho_chiso` ở `[3]` đều chạy TRƯỚC `refresh_daily.py` (nơi gọi `build_screen`). Đổi thứ tự là
`nen` rỗng toàn bảng mà không báo gì.

**KIỂM**: `node tools/test_loc.js` — 27 ca. Ngoài ra `nen`/`ndN` đã đối chiếu với bản dựng lại
độc lập: AAA `−43,0% / nd100=8`, AAM `−41,8% / nd100=6 / nd200=6`, ACB `−0,7% / null`,
DHA·HAS·HTN `nd100=0` — khớp từng con số.

> **`avgval60` THÊM MỚI, đừng dùng `avgval20` thay.** Cổng thanh khoản của bộ lọc này đo trên
> 60 phiên; lấy 20 phiên là đổi định nghĩa cổng. Hai trường cùng tồn tại trong `screen.json`.

### THỐNG KÊ ĐÃ ĐO VỀ BỘ TIÊU CHÍ NÀY — VÀ VÌ SAO KHÔNG ĐƯA LÊN GIAO DIỆN

Mô phỏng 357 mã HOSE, 2018→2026, hoàn toàn nhân quả, vào lệnh ở **giá mở phiên kế tiếp**, đo
bằng **giá điều chỉnh** (không phải vốn hoá — vốn hoá tăng cả khi phát hành thêm). Luật: cắt lỗ
−10%, bán 1/3 tại +20%, 1/3 tại +40%, chốt đầu thì dời stop về hoà vốn, giữ tối đa 200 phiên.

| | lệnh | thắng | TB/lệnh | PF |
|---|---|---|---|---|
| mua bất kỳ mã, bất kỳ lúc nào | 43.138 | 39,6% | +3,0% | 1,48 |
| chỉ thêm cổng chỉ số (EMA20<EMA50 và VNI>EMA20) | 5.560 | 45,2% | +6,0% | 2,05 |
| + đang dưới nền | 1.722 | 49,8% | +8,8% | 2,69 |
| chỉ tín hiệu `nd100≤5`, bỏ cổng chỉ số | 500 | 41,2% | +5,5% | 1,91 |
| **đủ bộ** | **72** | **66,7%** | **+16,9%** | **5,94** |

Cổng chỉ số một mình chỉ đưa PF 1,48 → 2,05; tín hiệu một mình 1,91. **Ghép lại 5,94** — nhiều
hơn hẳn tích của hai cái (1,79), tức chúng cần nhau chứ không cái nào thừa.

Kiểm mù: chốt quy tắc trên **2018–2022** rồi thử trên **2023–2026** — thắng **67,3% → 65,0%**,
PF 6,50 → 4,59. Không năm nào âm trong 8 năm (2022 hoà, +0,3%).

**ĐÃ THỬ VÀ BỎ** (ghi lại để khỏi đo lại): dòng tiền ngoại ròng 60 phiên dương **làm xấu đi**
(PF 1,91 → 1,14) · `VN-Index > MA200` làm xấu đi (→1,51) · `giá > MA200 của mã` làm xấu nhẹ
(→1,80) · `VN-Index < EMA20` làm xấu đi (→1,62) · quý trước lỗ làm xấu đi (→1,40) · quý trước
lãi giúp nhẹ nhưng **thừa** khi đã có cổng chỉ số. Ba giả thuyết ban đầu đều NGƯỢC: thứ sống
sót là mua khi **thị trường vừa bật lên từ một nhịp giảm trung hạn**.

> **VÌ SAO CỔNG CHỈ SỐ CHỈ LÀ MỘT DÒNG CHỮ, KHÔNG PHẢI MỘT CHIP.** Nó không phải đại lượng của
> riêng một mã — bật lên là **hoặc cả bảng lọt hoặc cả bảng trượt**. Một cái công tắc như thế
> chính là trang tự phát biểu *"hôm nay là lúc mua"*. Số liệu thì cứ in ra cho người đọc; kết
> luận để họ tự rút.
>
> **VÀ ĐỪNG GỘP BỐN CHIP THÀNH MỘT NÚT "BỘ LỌC 1".** Cùng một kết quả nhưng thứ người dùng
> nhận về đổi hẳn bản chất: bốn chip là bốn tiêu chí họ nhìn thấy và chỉnh được, một nút là
> **danh sách mã do chủ trang chọn** — đúng chỗ Điều 211 BLHS nhắm tới, và là lý do bộ lọc Pro
> cũ đã bị gỡ hồi 16/08.
