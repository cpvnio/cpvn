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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ma", help="chỉ chạy mấy mã này, cách nhau bằng dấu phẩy")
    ap.add_argument("--thu", action="store_true", help="chỉ đếm, không ghi file")
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


if __name__ == "__main__":
    main()
