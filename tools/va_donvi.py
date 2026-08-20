# -*- coding: utf-8 -*-
"""VÁ Ô SAI ĐƠN VỊ ×1000 TRONG `data/giaodich` — lấy VNDirect làm trọng tài. KHÔNG gọi mạng.

VÌ SAO CÓ FILE NÀY (22/08/2026)
------------------------------
User mở khung 300 phiên và thấy **"Tự doanh ròng −363.594 tỷ · chiếm 746,1%"** ở phiên
16/12/2025 — trong khi cả thị trường phiên đó chỉ khớp 27.803 tỷ. Truy ra một ô duy nhất:

    MCH 2025-12-16   tdBanGT (Vietstock)  364.000.000.000.000   <- 364 NGHÌN tỷ
                     tdBanTG (VNDirect)       364.000.000.000   <- 364 tỷ
                     tdBanKL / tdBanTKL      2.000.000 cp  (HAI NGUỒN KHỚP NHAU)

2 triệu cổ phiếu × 213.800đ = 427 tỷ, nên 364 tỷ là số thật và 364 nghìn tỷ là rác.
**Chỉ trường GIÁ TRỊ sai, khối lượng của cả hai nguồn khớp nhau** — nên vá đúng trường
giá trị, đừng đụng khối lượng.

Đo toàn kho: **98 ô** kiểu này (47 ô Vietstock gấp 1000 lần, 51 ô nhỏ đi 1000 lần) trên
~215.000 ô có cả hai nguồn. Tỉ lệ nhỏ, nhưng MỘT ô đủ làm hỏng cả một phiên trong kho gộp
vì nó cộng thẳng vào tổng toàn thị trường — đúng cái user nhìn thấy.

VÌ SAO SỬA ĐƯỢC MÀ KHÔNG PHẢI ĐOÁN: hai nguồn độc lập, và đẳng thức
`Vietstock(khớp lệnh + thoả thuận) == VNDirect(tổng)` đúng ở **98,8%** ô khối ngoại và
**99,5%** ô tự doanh. Tỉ lệ rơi đúng 1000,0 (sai số dưới 1%) thì không còn cách giải
thích nào khác ngoài đơn vị.

CHỈ ĐỘNG VÀO Ô CÓ TỈ LỆ TRÒN 1000. Ô lệch vì lô lẻ hay vì nguồn làm tròn thì ĐỂ NGUYÊN —
xem `--thu` để biết chính xác sẽ đụng vào những ô nào trước khi cho ghi.

  python3 tools/va_donvi.py --thu     # liệt kê, không ghi
  python3 tools/va_donvi.py           # vá thật
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
THU = "--thu" in sys.argv

# (tiền tố, trường tổng của VNDirect) — hai vế mua/bán xử lý giống nhau
NHOM = (("fn", "fnMuaTG", "fnBanTG"), ("td", "tdMuaTG", "tdBanTG"))


def main():
    doi = ma_doi = 0
    vd = []
    for f in sorted(os.listdir(GD)):
        if not f.endswith(".json"):
            continue
        p = os.path.join(GD, f)
        try:
            o = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        n = len(o.get("d") or [])
        sua = 0
        for pre, kMT, kBT in NHOM:
            for ve, kTG in (("Mua", kMT), ("Ban", kBT)):
                kG = pre + ve + "GT"          # khớp lệnh
                kT = pre + ve + "TTGT"        # thoả thuận
                a, at, tg = o.get(kG), o.get(kT), o.get(kTG)
                if not a or not tg:
                    continue
                for i in range(min(n, len(a), len(tg))):
                    x = a[i]
                    y = tg[i]
                    if x is None or y in (None, 0):
                        continue
                    t2 = (at[i] if at and i < len(at) and at[i] else 0)
                    tong = x + t2
                    if tong == 0:
                        continue
                    r = tong / y
                    hs = None
                    if abs(r - 1000) < 10:            # ta gấp 1000 lần -> chia
                        hs = 1 / 1000.0
                    elif abs(r - 0.001) < 1e-5:       # ta nhỏ 1000 lần -> nhân
                        hs = 1000.0
                    if hs is None:
                        continue
                    if len(vd) < 8:
                        vd.append((o.get("sym"), o["d"][i], kG,
                                   int(x), int(y), "chia 1000" if hs < 1 else "nhân 1000"))
                    a[i] = round(x * hs)
                    if at and i < len(at) and at[i]:
                        at[i] = round(at[i] * hs)
                    sua += 1
        if sua:
            ma_doi += 1
            doi += sua
            if not THU:
                tmp = p + ".tmp"
                with open(tmp, "w", encoding="utf-8") as g:
                    json.dump(o, g, ensure_ascii=False, separators=(",", ":"))
                os.replace(tmp, p)

    print("VÁ ĐƠN VỊ ×1000 (trọng tài: VNDirect)")
    print("  ô đã sửa : {:,}".format(doi))
    print("  mã bị đụng: {:,}".format(ma_doi))
    for s, d, k, x, y, cach in vd:
        print("    {:<5s} {} {:<10s} {:>22,} -> theo VND {:>18,}  ({})".format(s, d, k, x, y, cach))
    if THU:
        print("  (--thu: KHÔNG ghi file nào)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
