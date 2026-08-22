"""LẤP SỐ CỔ PHIẾU CHO PHẦN ĐẦU KHUNG — đi NGƯỢC bằng `data/sukien`. KHÔNG GỌI MẠNG.

VÌ SAO CÓ CÁI LỖ NÀY (user hỏi 23/08/2026: *"vì sao mất 1 góc trước 2023"*)
--------------------------------------------------------------------------
`sh` trong `data/giaodich` suy từ `ratios` của VNDirect, mà endpoint đó **chặn cứng 16 QUÝ**
— đã dò tận nơi: `v4/ratios?q=code:HPG~ratioCode:OUTSTANDING_SHARES` trả `totalElements=16`,
kỳ cũ nhất **2022-12-31**. Kho giao dịch thì sâu 1.000 phiên (lùi tới ~2022-08-18). Chênh
lệch đó chính là cái góc trống: **1.449/1.529 mã có `sh` bắt đầu ĐÚNG ngày 2023-01-03**, và
95 phiên trước đó không có số cổ phiếu -> không có vốn hoá -> ba đường của trục ngoài cùng
(vốn hoá mã, vốn hoá thị trường, VN-Index quy đổi) đều cụt ở đó.

**KHÔNG PHẢI LỖI MỘT LẦN — nó tự sinh lại.** 16 quý ≈ 4 năm ≈ 1.000 phiên, hai mốc trôi
song song, nên cái lỗ giữ nguyên độ rộng mãi mãi. Vì thế công cụ này nằm TRONG lượt EOD chứ
không phải một bản vá chạy tay.

CÁCH LẤP — ĐI NGƯỢC TỪ Ô ĐẦU TIÊN ĐÃ BIẾT
------------------------------------------
        sh(t) = sh(neo) ÷ Π (1 + tỉ lệ)     mọi sự kiện GDKHQ trong (t, neo]

`neo` = phiên đầu tiên CÓ `sh` (do `ratios` cho, đã được `va_slcp_gdkhq.py` dời về đúng ngày
GDKHQ). Ngược hẳn chiều với `va_slcp_gdkhq` nhưng cùng một cơ chế, và cùng một bảng sự kiện.

**KHÔNG BỊA CON SỐ NÀO** — hai đầu bậc thang đều là số nguồn cho (`sh` của neo, tỉ lệ chia
của sở), việc duy nhất là đặt bậc đúng chỗ.

BỐN THỨ ĐÃ ĐO, ĐỪNG LÀM NGƯỢC LẠI
----------------------------------
Hồi kiểm: giấu `sh` của 105 phiên NGAY SAU ô đầu tiên rồi dựng lại từ neo đặt sau đó, so
từng Ô PHIÊN với đáp án thật. 117 mã ngẫu nhiên, ~12.000 ô:

    cách dựng lại                     ô đúng <0,5%      p99 lệch
    đi ngược sự kiện (cách này)          99,06%          0,01%
    giữ nguyên số của neo                98,80%          4,55%
    median MARKETCAP ÷ giá               96,23%         54,42%
    MARKETCAP ÷ giá từng phiên           90,21%         54,42%
    hiệu vốn góp (data/finx)             98,33%         16,00%

① **CHỈ `cp` VÀ `thuong`, ĐỪNG THÊM `quyenmua`/`phathanh`.** Tỉ lệ của quyền mua chỉ là mức
   TỐI ĐA — không phải cổ đông nào cũng nộp tiền. Thêm vào: 99,06% -> **98,76%** và p99 lệch
   vọt từ 0,01% lên **4,55%**. Đúng luật `CO_TL`/`KHONG_TL` của `va_slcp_gdkhq.py`.
② **ĐÃ THỬ `MARKETCAP` THEO TỪNG PHIÊN CỦA VNDIRECT VÀ BỎ.** Nó CÓ thật và sâu tới 2017
   (`v4/ratios?q=code:HPG~ratioCode:MARKETCAP` trả 2.171 phiên), chia cho giá thì ở vùng
   chồng nhau khớp `sh` tới **0,0000%** trên 899 phiên của HPG — nghe như lời giải hoàn hảo.
   Nhưng với mã thanh khoản mỏng thì vốn hoá họ ghi KHÔNG tính bằng giá đóng cửa của chính
   phiên đó, nên thương số dao động: BCA ±8,5%, SNZ ±18%, DSP ±37%, cao nhất **±51%**. Lấy
   median chữa được phần lớn nhưng vẫn thua hẳn cách đi ngược, mà lại tốn ~26 lượt gọi mạng.
③ **ĐÃ THỬ VỐN GÓP (`data/finx` dòng `x_von_gop`, sâu tới Q1/07) VÀ BỎ.** Nó bắt được đợt
   phát hành riêng lẻ mà bảng sự kiện không có (VTR: vốn góp nhảy 172,95 -> 292,95 tỷ = đúng
   12.000.000 cp còn thiếu). Nhưng vốn góp **đăng ký TRỄ hơn ngày GDKHQ** và chỉ có độ phân
   giải QUÝ, nên nó đẻ ra lỗi ở mọi mốc quý nhiều hơn số ca nó cứu: 99,06% -> **98,33%**.
④ **0,94% ô còn sai là đợt phát hành KHÔNG NGUỒN NÀO GHI LẠI.** Đo được đúng 2/117 mã, cả
   hai đều là phát hành riêng lẻ/ESOP: `data/sukien` không có mốc, mà `MARKETCAP` của
   VNDirect cũng chở luôn số MỚI về quá khứ (họ cũng không dựng lại lịch sử). Không có tín
   hiệu nào để bắt -> chấp nhận, và ghi ra đây để đừng ai đi tìm lần nữa.

CHỈ ĐIỀN Ô ĐANG TRỐNG, TUYỆT ĐỐI KHÔNG GHI ĐÈ. Ô đã có là số nguồn cho; ô này là số suy ra.
"""

import argparse
import json
import os
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
SK = os.path.join(BASE, "data", "sukien")

# Chỉ hai loại này có tỉ lệ THỰC HIỆN ĐỦ 100%: cổ tức bằng cổ phiếu và cổ phiếu thưởng.
CO_TL = ("cp", "thuong")

# ── TRẦN ĐỘ XA: chỉ đi ngược tối đa từng này phiên ───────────────────────────────────
# Sai số DỒN theo quãng đường: mỗi đợt phát hành mà `data/sukien` không ghi lại (phát hành
# riêng lẻ, ESOP) là hệ số lệch vĩnh viễn từ đó về trước. Đo bằng cách neo ở phiên CUỐI rồi
# đi ngược suốt 900 phiên có đáp án thật, 1.529 mã:
#
#       lùi     0-39    40-79   80-119  120-159  160-199  240-279  320-359
#       đúng   99,68%  97,18%   95,95%   94,76%   92,67%   90,74%   89,18%
#       p95     0,00%   0,00%    0,02%    1,41%    9,09%   19,86%   25,00%
#
# Cái lỗ CÓ THẬT chỉ rộng ~95-113 phiên (xem đầu file) nên 150 phủ trọn nó với dư địa, mà
# vẫn chặn được hai ca đi hoang: PTM phải lùi 776 phiên, PEG 593 — ở tầm đó thì cứ 5 ô có
# 1 ô sai. Mã như vậy chỉ được lấp 150 phiên rồi dừng; phần còn lại VẪN TRỐNG, và trống là
# câu trả lời đúng ("kho chưa có số") chứ không phải một con số bịa.
LUI_TOI_DA = 150


def doc(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def ghi(p, o):
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(o, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)


def su_kien(sym):
    """Mốc chia cổ phiếu của một mã, đã lọc và sắp theo ngày."""
    p = os.path.join(SK, sym + ".json")
    if not os.path.exists(p):
        return []
    try:
        o = doc(p)
    except Exception:
        return []
    ev = o if isinstance(o, list) else (o.get("ev") or [])
    ra = []
    for e in ev:
        if e.get("k") not in CO_TL:
            continue
        d, tl = e.get("d"), e.get("tl")
        if not d or not tl:
            continue
        try:
            tl = float(tl)
        except (TypeError, ValueError):
            continue
        # Tỉ lệ vô lý thì bỏ: chia trên 10 lần trong MỘT đợt là dấu hiệu nguồn hỏng,
        # không phải sự kiện thật. Nhân dồn một ô rác là cả đoạn đầu chuỗi lệch hẳn.
        if tl <= 0 or tl > 1000:
            continue
        ra.append((d, tl))
    ra.sort()
    # ── HAI ĐỢT CÙNG MỘT NGÀY GDKHQ thì CỘNG TỈ LỆ, ĐỪNG NHÂN ────────────────────────
    # Cổ đông cầm 100 cp, cùng ngày nhận cổ tức cổ phiếu 20% VÀ thưởng 30%, thì nhận
    # 20 + 30 = 50 cp mới -> hệ số 1,50. Nhân ra 1,20 × 1,30 = 1,56 là **thừa 4%**, vì
    # cả hai tỉ lệ đều tính trên CÙNG một số cổ phiếu trước sự kiện chứ không nối tiếp.
    # Kiểm bằng nguồn khác hẳn — vốn góp của TV2 (`data/finx`) quanh 15/11/2022:
    #     450,18 -> 675,26 tỷ  =  ĐÚNG 1,5000     (nhân ra 1,5600)
    # Không phải ca hiếm: **219 ngày GDKHQ có từ 2 đợt trở lên, trên 153 mã** = 10% kho.
    # Gộp theo NGÀY trước rồi mới trả về, nên chỗ gọi cứ nhân dồn qua các ngày như thường.
    gop = {}
    for d, tl in ra:
        gop[d] = gop.get(d, 0.0) + tl
    return sorted(gop.items())


def lap_mot(sym, thu=False):
    p = os.path.join(GD, sym + ".json")
    o = doc(p)
    d = o.get("d") or []
    sh = o.get("sh") or []
    if len(sh) < len(d):
        sh = sh + [None] * (len(d) - len(sh))
    dau = next((i for i in range(len(d)) if sh[i]), None)
    if dau is None:
        return 0, "không có ô sh nào để neo"
    if dau == 0:
        return 0, ""
    neo, dNeo = sh[dau], d[dau]
    ev = [(x, tl) for x, tl in su_kien(sym) if x <= dNeo]

    # Đi ngược: mỗi lần lùi qua một ngày GDKHQ thì số cổ phiếu nhỏ lại theo đúng tỉ lệ đó.
    # Duyệt từ phiên dau-1 về 0, cộng dồn hệ số nên O(n + số sự kiện).
    het = max(0, dau - LUI_TOI_DA)
    j = len(ev) - 1
    f = 1.0
    dat = 0
    for i in range(dau - 1, het - 1, -1):
        while j >= 0 and ev[j][0] > d[i]:
            f *= 1.0 + ev[j][1] / 100.0
            j -= 1
        v = neo / f
        # Dưới 1.000 cp thì không phải một công ty niêm yết — bỏ, đừng ghi số vô lý.
        if v < 1000:
            continue
        sh[i] = int(round(v))
        dat += 1
    if dat and not thu:
        o["sh"] = sh
        ghi(p, o)
    return dat, ""


# ═══ SOI LẠI BẰNG VỐN HOÁ TỪNG PHIÊN CỦA VNDIRECT (`--soi`) ═════════════════════════
# Bản đi ngược sai ~4,6% số mã (đo 1.387 mã, xem CLAUDE.md) vì `data/sukien` không ghi đợt
# phát hành riêng lẻ / ESOP. Nhưng `ratioCode:MARKETCAP` thì có VỐN HOÁ TỪNG PHIÊN lùi tới
# 2017, và `sh ÷ (MARKETCAP ÷ giá)` của mấy mã hỏng có hình dạng RẤT ĐẶC TRƯNG — một BẬC
# THANG SẠCH: giữ đúng một hằng số rồi rơi thẳng về 1,000 tại ngày phát hành.
#
#   SSB  1,030 1,030 1,030 1,030 1,030 | 1,000 1,000 1,000 1,000 1,000
#   PAP  1,333 1,333 1,333 1,333 1,333 | 1,000 1,000 1,000 1,000 1,000
#   HHV  1,151 1,151 1,151 1,151 | 1,000 1,000 …
#
# Nên chỉ sửa khi thấy ĐÚNG hình đó. Mã nào thương số nhiễu (MARKETCAP của mã thanh khoản
# mỏng KHÔNG tính bằng giá đóng cửa của chính phiên đó — đo được dao động tới ±51%) thì
# phép thử "đoạn đầu phải là hằng số" tự loại, không cần ngưỡng tuỳ tiện.
#
# ĐÂY LÀ BƯỚC CÓ GỌI MẠNG, tách khỏi phần đi ngược. ~13 lượt: 12 lượt hỏi CẢ SÀN ở 12 ngày
# rải đều (mỗi lượt ~1.680 bản ghi) để khoanh vùng nghi, rồi 1 lượt hỏi trọn chuỗi của
# riêng nhóm nghi. Chạy mà hỏng thì bỏ qua — phần đi ngược đã ghi xong từ trước.
API = ("https://api-finfo.vndirect.com.vn/v4/ratios?q=%s~ratioCode:MARKETCAP"
       "~reportDate:gte:%s~reportDate:lte:%s&order=code&size=9990")
DEU = 0.01          # coi là "bằng nhau" — 1%
BAC = 0.02          # bậc phải cao hơn 2% mới đáng sửa
DAY = 20            # đoạn phẳng ở cuối phải có ít nhất từng này điểm
# CHỈ XÉT ĐẦU KHUNG. Đây là bẫy đã dính: soi trọn 994 phiên của SSB thì đoạn "đầu" gộp cả
# bậc 1,030 lẫn hàng trăm ô 1,000 của mấy đợt phát hành SAU này, trung vị ra 1,0000 và phép
# thử "đoạn đầu là hằng số" trượt sạch — 455 mã nghi mà sửa được 0. Vùng CÓ THỂ sai chỉ là
# phần `lap_slcp_cu` vừa ghi (≤ LUI_TOI_DA phiên đầu); từ đó trở đi `sh` là số `ratios` cho,
# không được đụng vào. Lấy thêm XET phiên phía sau làm đoạn đối chứng phẳng.
XET = 400


def _vongop(sym):
    """Vốn góp theo quý (tỷ đồng) từ `data/finx`. Mệnh giá cổ phiếu VN là 10.000đ theo
    luật, nên `vốn góp ÷ 10.000` = số cổ phiếu ĐÃ NIÊM YẾT."""
    p = os.path.join(BASE, "data", "finx", sym + ".json")
    if not os.path.exists(p):
        return None
    try:
        j = doc(p)
    except Exception:
        return None
    q = j.get("Q") or {}
    r = [x for x in q.get("rows", []) if x.get("k") == "x_von_gop"]
    if not r:
        return None
    lab, v = q.get("labels") or [], r[0].get("v") or []
    return {lab[i]: v[i] for i in range(min(len(lab), len(v))) if v[i]}


def _quy_truoc(ngay):
    """Nhãn quý LIỀN TRƯỚC quý chứa `ngay`, dạng 'Qn/yy'."""
    y, m = int(ngay[:4]), int(ngay[5:7])
    q = (m - 1) // 3 + 1
    if q == 1:
        y, q = y - 1, 4
    else:
        q -= 1
    return "Q%d/%02d" % (q, y % 100)


def _ky(ngay):
    """Nhãn quý chứa `ngay`, dạng 'Qn/yy'."""
    return "Q%d/%02d" % ((int(ngay[5:7]) - 1) // 3 + 1, int(ngay[:4]) % 100)


def _hoi(q, t1, t2):
    o = json.loads(nhipmang.get(API % (q, t1, t2), timeout=90))
    ra = {}
    for x in o.get("data") or []:
        ra.setdefault(x["reportDate"], {})[x["code"]] = x["value"]
    return ra


def _moc_ratios():
    """Phiên đầu tiên mà `ratios` có số — tức MÉP THẬT của vùng vừa lấp.

    ĐỪNG DÙNG `LUI_TOI_DA` LÀM TRẦN CHO BƯỚC SỬA: nó là 150 trong khi vùng lấp thật chỉ
    ~95 phiên, nên bậc nằm ở phiên 148 (DPR, GKM — 24/03/2023) vẫn lọt. Chỗ đó `sh` là số
    `ratios` cho, đã đúng; sửa vào là phá số tốt. Hỏi thẳng nguồn cho chắc: `ratios` chặn
    16 quý nên kỳ cũ nhất trôi dần theo thời gian, viết cứng một ngày là vài tháng nữa sai.
    """
    try:
        o = json.loads(nhipmang.get(
            "https://api-finfo.vndirect.com.vn/v4/ratios?q=code:HPG,VNM,VCB"
            "~ratioCode:OUTSTANDING_SHARES&order=reportDate&size=4000", timeout=60))
        rd = sorted({x["reportDate"] for x in (o.get("data") or []) if x.get("reportDate")})
        return rd[0] if rd else None
    except Exception:
        return None


def _bac(r, tran):
    """r = [(chỉ số, thương số)] theo thứ tự thời gian. Trả hằng số K của đoạn đầu nếu
    chuỗi đúng hình BẬC THANG SẠCH (đoạn đầu là hằng K, đoạn cuối phẳng ở 1,000)."""
    r = [x for x in r if x[0] < XET]
    if len(r) < DAY + 5:
        return None
    # ── PHẲNG = 90% SỐ ĐIỂM BÁM TRUNG VỊ, KHÔNG PHẢI BIÊN ĐỘ ────────────────────────
    # Bẫy đã dính: đòi `max - min <= 2%` thì PAP trượt dù trung vị đoạn đầu ra ĐÚNG
    # 1,3333 — vài phiên lẻ MARKETCAP nhiễu là biên độ vọt lên 0,66. Cùng cảnh SP2
    # (1,3637), MNB và SFI (1,0500). Đếm tỉ lệ điểm bám trung vị thì chịu được mấy ô
    # nhiễu lẻ mà vẫn loại được chuỗi nhiễu thật (SIP dao động 0,949-0,997, không mức
    # nào gom nổi 90%).
    def phang(v, moc):
        # 80% chứ không 90%: PAP có đoạn đầu K = 1,3333 chuẩn xác nhưng 9/60 phiên nhiễu
        # (2-11/11/2022, MARKETCAP lấy nền giá khác) nên chỉ bám 85%. Nới được vì chốt
        # chặn thật là phép đối chiếu VỐN GÓP phía dưới — dò lỏng chỉ làm ứng viên nhiều
        # hơn, không làm bản sửa lỏng hơn.
        return sum(1 for x in v if abs(x / moc - 1) <= DEU) >= 0.8 * len(v)

    duoi = [v for _, v in r[-DAY:]]
    if abs(statistics.median(duoi) - 1) > DEU or not phang(duoi, 1.0):
        return None
    # ĐIỂM BẬC: quét XUÔI TỪ ĐẦU, tìm chỗ đầu tiên mà từ đó có ĐỦ `DAY` điểm liền ~1,000.
    # ĐỪNG QUÉT NGƯỢC TỪ CUỐI — bẫy đã dính: SSB và PAP còn có đợt phát hành nữa vào ~2024,
    # quét ngược vấp đúng nó rồi dừng ở chỉ số 343/396, thế là "đoạn đầu" gộp cả hai bậc,
    # trung vị ra 1,0000 và phép thử trượt. Mấy bậc SAU không liên quan: ở đó `sh` là số
    # `ratios` cho, đã đúng, và mình cũng không đụng tới.
    # Dùng CÙNG luật 90% chứ đừng đòi `all`: PAP nhiễu ngay tại chỗ bậc (chỉ số 60-80 có
    # vài ô 1,63 lẫn vào giữa những ô 1,000) nên `all` đẩy điểm bậc trôi từ 60 sang 81 và
    # đoạn đầu gộp luôn phần đã sang nền mới. Lỏng ở ĐÂY thì an toàn, vì chốt chặn thật
    # nằm ở phép đối chiếu vốn góp phía dưới — không nguồn thứ hai gật thì không sửa gì.
    p = None
    for q in range(len(r) - DAY + 1):
        if phang([v for _, v in r[q:q + DAY]], 1.0):
            p = q
            break
    if p is None or p < 5:
        return None
    # BẬC PHẢI NẰM TRONG VÙNG VỪA LẤP. Ngoài đó là số `ratios` cho — sai lệch ở đấy là
    # chuyện của MARKETCAP chứ không phải của mình, sửa vào là phá số đúng.
    if r[p - 1][0] >= tran:
        return None
    dau = [v for _, v in r[:p]]
    K = statistics.median(dau)
    if abs(K - 1) < BAC or not phang(dau, K):
        return None
    # TINH CHỈNH NGÀY BẬC: lấy phiên CUỐI CÙNG mà thương số gần K hơn gần 1. Vòng quét
    # trên chỉ tìm chỗ BẮT ĐẦU phẳng nên nó dừng sớm khi ngay trước bậc có phiên nhiễu —
    # PAP dừng ở 09/11 trong khi hai phiên 10 và 11/11 vẫn thuộc nền cũ.
    cuoi = r[p - 1][0]
    for i, v in r:
        if i >= tran:
            break
        if abs(v - K) < abs(v - 1):
            cuoi = max(cuoi, i)
    return K, cuoi


def _theo_vongop(sym, o, sh, r, tran, thu):
    """ĐƯỜNG THỨ HAI — khi `MARKETCAP` thấy có gì đó sai nhưng NHIỄU quá, không định vị nổi
    ngày bậc. Lúc đó vốn góp đứng ra, nhưng chỉ ở chỗ nó thật sự nói được:

      · CHỈ QUÝ MÀ SỐ CỔ PHIẾU KHÔNG ĐỔI SUỐT QUÝ (`vg[q] == vg[q-1]`). Vốn góp là số ở
        CUỐI kỳ; áp nó cho một phiên giữa quý chỉ đúng khi trong quý không có gì đổi. Quý
        có biến động thì bỏ hẳn — thà để nguyên còn hơn đặt bậc sai ngày.
      · VÀ VỐN GÓP PHẢI KHỚP `MARKETCAP` của chính quý đó. Hai nguồn độc lập cùng chỉ vào
        một số thì mới sửa; một mình vốn góp thì không.

    ĐỪNG BỎ CỔNG THỨ HAI. Chạy luật này KHÔNG có cờ của `MARKETCAP` thì nó "sửa" **79 mã**
    với hệ số loạn xạ (DHT 0,357 · DXP 0,618 · CAP 0,781) — toàn mã mà bản đi ngược vốn đã
    đúng, sai là do vốn góp đăng ký TRỄ hơn ngày GDKHQ. Đúng cái đã đo ở hồi kiểm: dùng vốn
    góp một mình ăn 98,33% so với 99,06% của bản đi ngược.

    Đo trên nhóm sai chắc chắn: SIP 35 phiên · AGG 30 · DDG 37. Cả ba đều có vốn góp và
    `MARKETCAP` khớp nhau tới bốn chữ số (SIP 92.904.149 so với 92.905.514) trong khi `sh`
    lệch hẳn. SCJ thì vốn góp bênh `sh` -> bỏ qua, đúng như phải thế.
    """
    V = _vongop(sym)
    if not V:
        return 0
    d = o["d"]
    ref = min(tran + 60, len(d) - 1)
    kref = _ky(d[ref])
    if kref not in V or ref >= len(sh) or not sh[ref] or not V[kref]:
        return 0
    mc = {}
    for i, v in r:
        if i < tran:
            mc.setdefault(_ky(d[i]), []).append(sh[i] / v if v else None)
    # ── BỎ HẲN QUÝ NÀO CÓ NGÀY GDKHQ ────────────────────────────────────────────────
    # Ở đó vốn góp và `MARKETCAP` **KHÔNG CÒN ĐỘC LẬP**: cả hai cùng lấy số cổ phiếu ở CUỐI
    # QUÝ nên cùng trễ đúng mấy phiên sau ngày GDKHQ, rồi cùng chỉ vào con số CŨ và "xác
    # nhận" lẫn nhau. Đúng con bệnh `va_slcp_gdkhq.py` sinh ra để chữa, chỉ là lần này nó
    # nằm trong chính nguồn đối chiếu.
    # Suýt phá hai mã to: VPB có thưởng 50% ngày 28/09/2022 và HDB cổ tức 25% ngày 27/09 —
    # bản đi ngược đặt bậc ĐÚNG ngày, mà luật này định kéo 3-4 phiên sau đó về nền cũ.
    # Sự kiện đã biết thì bản đi ngược mới là bên đúng; vốn góp chỉ được nói ở chỗ nó im.
    co_sk = {_ky(x) for x, _ in su_kien(sym)}
    dat = 0
    for i in range(min(tran, len(sh))):
        if not sh[i]:
            continue
        k = _ky(d[i])
        if k in co_sk:
            continue
        q, y = int(k[1]), int(k[3:])
        kp = "Q%d/%02d" % ((4, y - 1) if q == 1 else (q - 1, y))
        if k not in V or kp not in V or V[k] != V[kp]:
            continue                       # quý có biến động -> nguồn không nói được gì
        moi = sh[ref] * V[k] / V[kref]
        if not moi or abs(moi / sh[i] - 1) <= 0.01:
            continue                       # vốn góp không phản đối `sh`
        goi = [x for x in (mc.get(k) or []) if x]
        if len(goi) < 5:
            continue
        if abs(moi / statistics.median(goi) - 1) > 0.01:
            continue                       # MARKETCAP không đồng ý với vốn góp -> bỏ
        sh[i] = int(round(moi))
        dat += 1
    if dat:
        print("     %-6s theo vốn góp: %d phiên đầu -> %s (MARKETCAP đồng ý)"
              % (sym, dat, format(sh[0], ",")), flush=True)
        if not thu:
            o["sh"] = sh
            ghi(os.path.join(GD, sym + ".json"), o)
    return dat


def soi(syms, thu=False):
    kho = {s: doc(os.path.join(GD, s + ".json")) for s in syms}
    ngay = None
    for o in kho.values():
        if len(o.get("d") or []) > (len(ngay or []) if ngay else 0):
            ngay = o["d"]
    if not ngay:
        return
    moc = _moc_ratios()
    if not moc:
        print("  soi: không hỏi được độ sâu của ratios - bỏ qua cả bước", flush=True)
        return
    print("  soi: ratios có số từ %s -> chỉ được sửa phiên trước mốc đó" % moc, flush=True)
    # ── vòng 1: 12 ngày rải đều cả khung, hỏi cả sàn ──
    # ── LẤY MẪU ĐÚNG TRONG VÙNG LẤP, ĐỪNG RẢI ĐỀU CẢ KHO ────────────────────────────
    # Bản đầu rải 12 ngày khắp 1.769 phiên nên chỉ trúng ĐÚNG MỘT phiên trong vùng lấp —
    # SIP trượt sát nút (max|v-1| = 0,0191 so với ngưỡng 0,02) chỉ vì cái mẫu duy nhất đó
    # rơi vào một phiên MARKETCAP ít nhiễu. Vùng lấp mới là chỗ có lỗi, phải soi vào đó.
    # Và đo bằng TRUNG VỊ chứ đừng đo bằng max: max thì một phiên nhiễu cũng đủ dựng cờ,
    # còn trung vị nói được "cả vùng lệch" — đúng thứ đang tìm.
    k0 = next((i for i, x in enumerate(ngay) if x >= moc), len(ngay))
    lo = [ngay[i] for i in range(0, k0, max(1, k0 // 8))][:8]
    ref = [ngay[i] for i in range(k0, len(ngay), max(1, (len(ngay) - k0) // 4))][:4]
    mc = {}
    for n in lo + ref:
        try:
            mc.update(_hoi("", n, n))
        except Exception as e:
            print("  soi: lượt %s hỏng (%s) - bỏ qua cả bước" % (n, str(e)[:50]), flush=True)
            return
    nghi = []
    for s, o in kho.items():
        d, c, sh = o["d"], o.get("c") or [], o.get("sh") or []
        vi = {x: i for i, x in enumerate(d)}

        def ty(ds):
            ra = []
            for n in ds:
                i = vi.get(n)
                if i is None or i >= len(sh) or not sh[i] or i >= len(c) or not c[i]:
                    continue
                v = (mc.get(n) or {}).get(s)
                if v:
                    ra.append(sh[i] / (v / c[i]))
            return ra

        a, b = ty(lo), ty(ref)
        if len(a) < 3 or len(b) < 2:
            continue
        if abs(statistics.median(b) - 1) > DEU:
            continue        # MARKETCAP đo khác định nghĩa với mã này (cổ phiếu quỹ) -> bỏ
        if abs(statistics.median(a) - 1) > DEU:
            nghi.append(s)
    print("  soi: %d mã nghi có bậc thiếu" % len(nghi), flush=True)
    if not nghi:
        return
    # ── vòng 2: chuỗi đầy đủ của riêng nhóm nghi, CHỈ ĐOẠN ĐẦU KHUNG ──
    # TRẦN 9.990 BẢN GHI MỖI LƯỢT, và nguồn CẮT CÂM chứ không báo lỗi. Xin 60 mã × 999
    # phiên = 60.000 bản ghi thì nhận về 9.990 mảnh vụn, `_bac` trượt sạch và cả bước báo
    # "sửa 0 mã" trông y như không có gì để sửa — đã dính đúng vậy. Chỉ cần XET phiên đầu,
    # nên 20 mã × ~400 phiên = 8.000, còn chỗ thở.
    het = ngay[min(XET, len(ngay)) - 1]
    day = {}
    for i in range(0, len(nghi), 20):
        lo = nghi[i:i + 20]
        try:
            g = _hoi("code:" + ",".join(lo), ngay[0], het)
            co = {c for m in g.values() for c in m}
            if len(co) < len(lo):
                print("  soi: lô %d chỉ nhận %d/%d mã" % (i, len(co), len(lo)), flush=True)
            for n, m in g.items():
                day.setdefault(n, {}).update(m)
        except Exception as e:
            print("  soi: lô %d hỏng (%s)" % (i, str(e)[:50]), flush=True)
    sua = 0
    for s in nghi:
        o = kho[s]
        d, c, sh = o["d"], o.get("c") or [], list(o.get("sh") or [])
        r = []
        for i, x in enumerate(d):
            if i >= len(sh) or not sh[i] or i >= len(c) or not c[i]:
                continue
            v = (day.get(x) or {}).get(s)
            if v:
                r.append((i, sh[i] / (v / c[i])))
        # MÉP PHẢI TÍNH THEO LỊCH RIÊNG CỦA MÃ. `ngay` là lịch DÀI NHẤT trong kho; mã nào
        # có phiên đầu sớm hơn (SIP bắt đầu 11/08 trong khi phần lớn 18/08) thì chỉ số của
        # nó lệch với chỉ số của lịch chung, lấy nhầm là cắt cụt hoặc lấn sang vùng ratios.
        tran = next((i for i, x in enumerate(d) if x >= moc), len(d))
        if tran <= 0:
            continue
        kq = _bac(r, tran)
        if not kq:
            n = _theo_vongop(s, o, sh, r, tran, thu)
            if n:
                sua += 1
            continue
        K, cuoi = kq
        # ── CHỈ SỬA KHI VỐN GÓP CŨNG GẬT ĐẦU ────────────────────────────────────────
        # Hai nguồn hoàn toàn khác nhau: `MARKETCAP` là vốn hoá VNDirect tính theo phiên,
        # `x_von_gop` là số trên bảng cân đối kế toán. Cùng chỉ vào một con số thì đó là
        # bằng chứng, một mình `MARKETCAP` thì chỉ là nghi ngờ.
        # PHẢI LẤY VỐN GÓP CỦA QUÝ **LIỀN TRƯỚC** ngày bậc — đã dính: bậc 27/10 nằm trong
        # Q4/22, lấy vốn góp cuối Q4 là lấy đúng số SAU đợt phát hành, nên nó "xác nhận"
        # ngược lại con số cũ và cả phép kiểm đảo chiều.
        # Đo trên 12 mã tìm được: 10 mã vốn góp khớp tới từng đồng (SSB 1.980.898.268 so
        # với 1.980.898.000), 1 mã (L10) vốn góp bênh số cũ, 1 mã (S99) cả ba đều khác —
        # hai mã sau BỎ QUA, thà để nguyên còn hơn sửa theo một nguồn.
        moi = sh[cuoi] / K
        V = _vongop(s)
        cp = (V or {}).get(_quy_truoc(d[cuoi]))
        if not cp:
            print("     %-6s BỎ QUA - không có vốn góp để đối chiếu" % s, flush=True)
            continue
        cp = cp * 1e9 / 10000.0
        if abs(cp / moi - 1) > 0.02:
            print("     %-6s BỎ QUA - vốn góp %s không khớp %s"
                  % (s, format(int(cp), ","), format(int(moi), ",")), flush=True)
            continue
        for i in range(cuoi + 1):
            if i < len(sh) and sh[i]:
                sh[i] = int(round(sh[i] / K))
        print("     %-6s chia %.4f cho %d phiên tới %s (vốn góp xác nhận)"
              % (s, K, cuoi + 1, d[cuoi]), flush=True)
        sua += 1
        if not thu:
            o["sh"] = sh
            ghi(os.path.join(GD, s + ".json"), o)
    print("  soi: sửa %d mã%s" % (sua, " (THỬ)" if thu else ""), flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ma", help="chỉ chạy mấy mã này, cách nhau bằng dấu phẩy")
    ap.add_argument("--thu", action="store_true", help="chỉ đếm, không ghi file")
    ap.add_argument("--soi", action="store_true",
                    help="soi lại bằng MARKETCAP của VNDirect (~13 lượt gọi mạng)")
    a = ap.parse_args()

    if a.ma:
        syms = [x.strip().upper() for x in a.ma.replace(",", " ").split() if x.strip()]
    else:
        syms = sorted(f[:-5] for f in os.listdir(GD) if f.endswith(".json"))

    tong = o_dat = 0
    ma_dat = 0
    loi = []
    for s in syms:
        try:
            n, ghi_chu = lap_mot(s, a.thu)
        except Exception as e:
            loi.append((s, str(e)[:60]))
            continue
        tong += 1
        if n:
            o_dat += n
            ma_dat += 1
    print("  lấp %s ô trên %s/%s mã%s" % (
        format(o_dat, ","), format(ma_dat, ","), format(tong, ","),
        " (THỬ, không ghi)" if a.thu else ""), flush=True)
    if loi:
        print("  lỗi %d mã: %s" % (len(loi), loi[:5]), flush=True)
    if a.soi:
        soi(syms, a.thu)


if __name__ == "__main__":
    main()
