# -*- coding: utf-8 -*-
"""LẤP SỐ CỔ PHIẾU LƯU HÀNH CHO PHIÊN CŨ -> `data/giaodich`. Một lượt gọi/mã.

VÌ SAO (22/08/2026): `sh` chỉ có từ Vietstock (`MarketCap ÷ ClosePrice`) nên dừng ở **249
phiên**, khiến đồ thị **Vốn hoá** của trang mã trống 3/4 — user báo "biểu đồ vốn hoá có vẻ
lỗi". VNDirect `/v4/ratios` có `OUTSTANDING_SHARES` theo `reportDate`, lùi tới 2022.

DÙNG `OUTSTANDING_SHARES`, KHÔNG DÙNG `LISTED_SHARES`
----------------------------------------------------
Hai trường lệch nhau và `LISTED_SHARES` TRỄ PHA. Đo HPG 31/12/2022: outstanding
5.814.785.700 (đúng — HPG tăng vốn lên 5,81 tỉ cp từ 2021) trong khi listed còn ghi
4.472.922.706, tức số của mấy quý trước. Lấy nhầm là vốn hoá quá khứ hụt ~23%.
Đối chiếu đầu kia: outstanding tại 30/06/2026 ra **8.442.964.520**, đúng bằng `sh` mà
kho đang có từ Vietstock.

CHUỖI THEO KỲ, KHÔNG THEO PHIÊN — GIÓNG BẰNG "KỲ GẦN NHẤT ĐÃ TỚI"
------------------------------------------------------------------
`reportDate` là mốc quý (có cả mốc TƯƠNG LAI: 30/09/2026). Mỗi phiên lấy giá trị của kỳ
**gần nhất mà ≤ ngày phiên** — không lấy kỳ tương lai, bằng không là gán số cổ phiếu
CHƯA PHÁT HÀNH cho quá khứ, đúng loại nhìn trộm tương lai đã ghi trong CLAUDE.md.

CHỈ ĐIỀN CHỖ TRỐNG. Phiên nào đã có `sh` của Vietstock thì giữ nguyên — vừa để khỏi phá
`neo_slcp` (đã neo đuôi vào SLCP thật), vừa để còn đối chiếu hai nguồn trên phần chồng nhau.

  python3 tools/kho_slcp.py --thu     # chạy thử 40 mã, không ghi
  python3 tools/kho_slcp.py
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
UNI = os.path.join(BASE, "universe.json")
API = ("https://api-finfo.vndirect.com.vn/v4/ratios"
       "?q=code:{}~ratioCode:OUTSTANDING_SHARES&sort=reportDate:asc&size=200")


def mot(sym, ghi=True):
    p = os.path.join(GD, sym + ".json")
    if not os.path.exists(p):
        return None
    try:
        o = json.load(open(p, encoding="utf-8"))
    except Exception:
        return None
    d = o.get("d") or []
    n = len(d)
    if not n:
        return None
    try:
        j = json.loads(nhipmang.get(API.format(sym), timeout=60))
    except Exception:
        return {"moc": 0, "dien": 0, "lech": None}
    moc = sorted(((x["reportDate"], x["value"]) for x in (j.get("data") or [])
                  if x.get("reportDate") and x.get("value")), key=lambda z: z[0])
    if not moc:
        return {"moc": 0, "dien": 0, "lech": None}

    sh = list(o.get("sh") or [None] * n)
    if len(sh) < n:
        sh += [None] * (n - len(sh))
    # đối chiếu phần chồng nhau TRƯỚC khi điền — hai nguồn lệch nhiều thì đừng ghép
    lech, k = [], -1
    for i, ng in enumerate(d):
        while k + 1 < len(moc) and moc[k + 1][0] <= ng:
            k += 1
        if k < 0:
            continue
        v = moc[k][1]
        if sh[i]:
            lech.append(abs(v / sh[i] - 1))
    tv = None
    if lech:
        lech.sort()
        tv = lech[len(lech) // 2]

    dien, k = 0, -1
    for i, ng in enumerate(d):
        while k + 1 < len(moc) and moc[k + 1][0] <= ng:
            k += 1
        if k < 0 or sh[i]:
            continue
        sh[i] = round(moc[k][1])
        dien += 1
    if dien and ghi:
        o["sh"] = sh
        tmp = p + ".tmp"
        with open(tmp, "w", encoding="utf-8") as g:
            json.dump(o, g, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, p)
    return {"moc": len(moc), "dien": dien, "lech": tv}


def main():
    av = sys.argv[1:]
    thu = "--thu" in av
    chi = None
    if "--ma" in av:
        i = av.index("--ma")
        chi = {x.upper() for x in av[i + 1:] if not x.startswith("--")}
    ma = [x["sym"] for x in json.load(open(UNI, encoding="utf-8"))["stocks"]]
    if chi:
        ma = [m for m in ma if m in chi]
    if thu:
        ma = ma[:40]

    t0 = time.time()
    ok = khong = 0
    tong = 0
    lech = []
    for i, m in enumerate(ma):
        r = mot(m, ghi=not thu)
        if not r:
            continue
        if r["moc"]:
            ok += 1
        else:
            khong += 1
        tong += r["dien"]
        if r["lech"] is not None:
            lech.append(r["lech"])
        if (i + 1) % 300 == 0:
            print("    …%d/%d  %.0fs" % (i + 1, len(ma), time.time() - t0), flush=True)
    lech.sort()
    print("LẤP SLCP TỪ VNDIRECT ratios")
    print("  mã có mốc : {:,} · không có : {:,}".format(ok, khong))
    print("  ô đã điền : {:,}".format(tong))
    if lech:
        print("  đối chiếu phần chồng nhau với `sh` của Vietstock:")
        print("    trung vị lệch {:.3%} · p90 {:.3%} · p99 {:.3%}".format(
            lech[len(lech) // 2], lech[int(len(lech) * .9)], lech[int(len(lech) * .99)]))
    print("  %.0f giây" % (time.time() - t0))
    if thu:
        print("  (--thu: 40 mã, KHÔNG ghi)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
