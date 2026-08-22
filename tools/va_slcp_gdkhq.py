# -*- coding: utf-8 -*-
"""ĐẨY BƯỚC NHẢY SỐ CỔ PHIẾU VỀ ĐÚNG NGÀY GDKHQ — không phải cuối quý.

VÌ SAO CÓ FILE NÀY (22/08/2026)
-------------------------------
User soi VIC phiên 10/12/2025 và thấy vốn hoá sai. Đúng, và sai đúng MỘT NỬA:

    05/12/2025  VIC thưởng cổ phiếu 1:1 (ngày GDKHQ)  ->  nguồn HẠ NỀN GIÁ NGAY
    31/12/2025  `ratios` mới ghi số cổ phiếu 3,853 tỷ -> 7,706 tỷ cp

Giữa hai mốc đó là **18 phiên** mang giá ĐÃ chia đôi nhân với số cổ phiếu CHƯA nhân đôi.
Phiên 10/12/2025: kho ghi 573.329 tỷ trong khi thật là ~1.147.000 tỷ.

`gop_sh` của `kho_vnd_lo.py` lấy kỳ mới nhất có `reportDate <= ngày phiên` — luật đó ĐÚNG
để khỏi gán số của quý chưa tới cho hôm nay, nhưng doanh nghiệp phát hành GIỮA QUÝ thì
VNDirect ghi số mới dưới `reportDate` của cuối quý ấy. Nên cửa sổ sai kéo dài từ ngày
GDKHQ tới hết quý — có thể gần ba tháng.

ĐO TOÀN KHO TRƯỚC KHI VÁ: **399 mã · 20.863 ô phiên** có vốn hoá sai kiểu này.
Và ở phiên HÔM NAY thì 92 mã đang hụt, tổng **423.082 tỷ = 4,1% vốn hoá thị trường**
(VHM một mình 294.501 tỷ vì chia 1:1 ngày 06/08/2026).

CÁCH VÁ: **CHỈ DỜI NGÀY, KHÔNG TỰ CHẾ CON SỐ.** Hai giá trị trước/sau đã có sẵn trong kho
(nguồn cho), thứ duy nhất sai là chỗ đặt bậc thang. `data/sukien` có ngày GDKHQ chính xác
của từng đợt — dùng nó làm mốc. Tuyệt đối đừng suy số cổ phiếu mới từ tỉ lệ chia: tỉ lệ chỉ
dùng để ĐỐI CHIẾU xem có đúng đợt đó không.

BA CÁI BẪY
----------
1. **QUYỀN MUA KHÔNG PHẢI AI CŨNG NỘP TIỀN.** `cp`/`thuong` thì số cổ phiếu tăng đúng tỉ
   lệ, còn `quyenmua`/`phathanh` thì tỉ lệ chỉ là mức TỐI ĐA. Nên nhóm sau chỉ dùng để lấy
   NGÀY, không dùng để kiểm tỉ lệ.
2. **MỘT QUÝ CÓ THỂ CÓ NHIỀU ĐỢT.** Khi đó chia bậc thang theo thứ tự ngày, dùng tỉ lệ của
   từng đợt rồi ÉP giá trị cuối bằng đúng số nguồn cho — chứ không nhân dồn ra một số khác.
   Không dò được tỉ lệ thì dồn cả bậc vào đợt SỚM NHẤT: giá đã hạ nền từ đợt đó rồi.
3. **ĐỪNG ĐỤNG BẬC NHẢY KHÔNG CÓ SỰ KIỆN NÀO GIẢI THÍCH.** Phát hành riêng lẻ không có
   ngày GDKHQ, và `ratios` cũng có ô rác (xem `gop_sh`). Không tìm thấy sự kiện trong cửa
   sổ thì để nguyên.

    python3 tools/va_slcp_gdkhq.py --thu     # đếm, không ghi
    python3 tools/va_slcp_gdkhq.py
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
SK = os.path.join(BASE, "data", "sukien")

THU = "--thu" in sys.argv
# Loại sự kiện làm TĂNG số cổ phiếu. `tl` chỉ tin được ở hai loại đầu (xem bẫy 1).
CO_TL = ("cp", "thuong")
KHONG_TL = ("quyenmua", "phathanh")
LOAI = CO_TL + KHONG_TL
# Cửa sổ lùi tối đa từ bậc nhảy về ngày GDKHQ — một quý ≈ 65 phiên, nới thành 70.
LUI_TOI_DA = 70


def doc_sk(sym):
    try:
        ev = json.load(open(os.path.join(SK, sym + ".json"), encoding="utf-8")).get("ev") or []
    except Exception:
        return []
    return sorted([x for x in ev if x.get("k") in LOAI and x.get("d")], key=lambda x: x["d"])


def va_mot(sym):
    """Trả về (số ô đã sửa, số bậc đã dời)."""
    p = os.path.join(GD, sym + ".json")
    try:
        g = json.load(open(p, encoding="utf-8"))
    except Exception:
        return 0, 0
    d = g.get("d") or []
    n = len(d)
    sh = g.get("sh")
    if not sh or len(sh) != n or n < 50:
        return 0, 0
    ev = doc_sk(sym)
    if not ev:
        return 0, 0
    sh = list(sh)
    vi = {x: i for i, x in enumerate(d)}
    # BẬC NHẢY: chỉ xét bậc TĂNG rõ rệt. Bậc giảm là mua lại cổ phiếu quỹ hoặc ô rác —
    # cả hai đều không có ngày GDKHQ để dời về.
    buoc = [i for i in range(1, n)
            if sh[i] and sh[i - 1] and sh[i] > sh[i - 1] * 1.005]
    o = 0
    doi = 0
    truoc = 0
    for i in buoc:
        a, b = sh[i - 1], sh[i]
        cua_tu = d[max(truoc, i - LUI_TOI_DA)]
        truoc = i
        trong = [x for x in ev if cua_tu <= x["d"] < d[i] and x["d"] in vi]
        if not trong:
            continue
        # ── thử chia theo tỉ lệ của từng đợt ──
        moc = None
        if all(x.get("tl") for x in trong if x["k"] in CO_TL):
            f = 1.0
            for x in trong:
                if x["k"] in CO_TL:
                    f *= 1 + (x["tl"] or 0) / 100.0
            if len(trong) > 1 and f > 1 and abs(f / (b / a) - 1) <= 0.03:
                moc = []
                cum = 1.0
                for x in trong:
                    if x["k"] in CO_TL:
                        cum *= 1 + (x["tl"] or 0) / 100.0
                    moc.append((vi[x["d"]], round(a * cum)))
                moc[-1] = (moc[-1][0], b)     # ép giá trị cuối bằng đúng số nguồn cho
        if moc is None:
            moc = [(vi[trong[0]["d"]], b)]    # dồn cả bậc vào đợt sớm nhất
        for j, v in moc:
            for z in range(j, i):
                if sh[z] != v:
                    sh[z] = v
                    o += 1
        doi += 1
    if o and not THU:
        g["sh"] = sh
        tmp = p + ".tmp"
        json.dump(g, open(tmp, "w", encoding="utf-8"), ensure_ascii=False,
                  separators=(",", ":"))
        os.replace(tmp, p)
    return o, doi


# ── PHẦN HAI: ĐỢT PHÁT HÀNH VỪA XONG, KHO CHƯA CÓ BẬC NÀO ĐỂ DỜI ──────────────────
# Phần trên chỉ dời được bậc ĐÃ CÓ trong kho. Nhưng đợt phát hành mới nhất thì VNDirect
# ghi dưới `reportDate` của CUỐI QUÝ TỚI (VHM: 2026-09-30) — mà `gop_sh` lọc bỏ mọi kỳ
# tương lai, nên trong kho KHÔNG có bậc nào cả. Đo phiên 21/08/2026: **92 mã** hụt tổng
# **423.082 tỷ = 4,1% vốn hoá thị trường**, riêng VHM 294.501 tỷ (chia 1:1 ngày 06/08).
#
# `ratios/latest` trả đúng số mới nhất KHÔNG kẹp theo ngày phiên — lấy nó, rồi áp từ ngày
# GDKHQ của đợt gần nhất. KHÔNG áp từ hôm nay: làm vậy là để lại đúng cái cửa sổ sai mà cả
# file này sinh ra để xoá.
# CHỈ ÁP KHI CÓ SỰ KIỆN GIẢI THÍCH. Số lớn hơn mà không có đợt nào thì hoặc là phát hành
# riêng lẻ (không có ngày GDKHQ để neo) hoặc là ô rác — cả hai đều không được đoán.
RATIOS = ("https://api-finfo.vndirect.com.vn/v4/ratios/latest"
          "?filter=ratioCode:OUTSTANDING_SHARES&where=code:%s&order=reportDate&size=4000")


def moi_nhat(ten):
    """{mã: số cổ phiếu lưu hành mới nhất} — 13 lượt gọi cho cả rổ."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import nhipmang
    ra = {}
    for i in range(0, len(ten), 120):
        lo = ten[i:i + 120]
        try:
            j = json.loads(nhipmang.get(RATIOS % ",".join(lo), timeout=60))
        except Exception:
            continue
        for r in j.get("data") or []:
            if r.get("ratioCode") == "OUTSTANDING_SHARES" and r.get("value"):
                ra[r["code"]] = r["value"]
    return ra


def va_duoi(sym, moi):
    """Nối số mới vào ĐUÔI chuỗi, tính từ ngày GDKHQ của đợt gần nhất."""
    p = os.path.join(GD, sym + ".json")
    try:
        g = json.load(open(p, encoding="utf-8"))
    except Exception:
        return 0
    d = g.get("d") or []
    n = len(d)
    sh = g.get("sh")
    if not sh or len(sh) != n or n < 50:
        return 0
    cuoi = next((sh[i] for i in range(n - 1, -1, -1) if sh[i]), None)
    if not cuoi or moi <= cuoi * 1.005:
        return 0
    # bậc gần nhất đang có trong kho -> chỉ nhận sự kiện SAU nó
    j = 0
    for i in range(n - 1, 0, -1):
        if sh[i] and sh[i - 1] and sh[i] != sh[i - 1]:
            j = i
            break
    # NEO VÀO ĐỢT GẦN NHẤT, KHÔNG PHẢI ĐỢT SỚM NHẤT — và chỉ nhận đợt SAU bậc đã có.
    # Đã trả giá ngay trong lượt vá đầu: MBB có đợt 13/08/2025 (đã nằm trong một bậc cũ) và
    # đợt 11/08/2026 (chưa có bậc nào). Neo vào đợt sớm nhất là áp số cổ phiếu CUỐI CÙNG
    # cho suốt một năm trước đó — vốn hoá vọt lên rồi ô ngày GDKHQ thật lại tụt, đúng cái
    # bệnh file này sinh ra để chữa, chỉ khác chiều.
    # Con số đang có là số CUỐI CÙNG nên nó chỉ đúng từ đợt CUỐI CÙNG trở đi.
    ev = [x for x in doc_sk(sym) if d[j] < x["d"] <= d[-1]]
    if not ev:
        return 0
    vi = {x: i for i, x in enumerate(d)}
    z0 = vi.get(ev[-1]["d"])
    if z0 is None:
        return 0
    sh = list(sh)
    o = 0
    for z in range(z0, n):
        if sh[z] != moi:
            sh[z] = moi
            o += 1
    if o and not THU:
        g["sh"] = sh
        tmp = p + ".tmp"
        json.dump(g, open(tmp, "w", encoding="utf-8"), ensure_ascii=False,
                  separators=(",", ":"))
        os.replace(tmp, p)
    return o


def main():
    ten = sorted(f[:-5] for f in os.listdir(GD) if f.endswith(".json"))
    tO = tD = tM = 0
    for s in ten:
        o, doi = va_mot(s)
        if o:
            tO += o
            tD += doi
            tM += 1
    print(f"  vá SLCP theo ngày GDKHQ{' (CHẠY THỬ)' if THU else ''}: "
          f"{tM:,} mã · {tD:,} bậc dời · {tO:,} ô phiên sửa", flush=True)
    if "--khongmang" in sys.argv:
        return
    mn = moi_nhat(ten)
    dO = dM = 0
    for s, v in mn.items():
        o = va_duoi(s, v)
        if o:
            dO += o
            dM += 1
    print(f"  đợt vừa phát hành (nguồn ghi ở kỳ tương lai): {dM:,} mã · {dO:,} ô phiên")


if __name__ == "__main__":
    main()
