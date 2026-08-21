# -*- coding: utf-8 -*-
"""SOI THANH KHOẢN: kho tự cộng lên có bằng số chính thức của sàn không? KHÔNG gọi mạng.

Cộng `mval`/`pval` của cả 1.529 mã trong `data/giaodich` rồi đặt cạnh `data/thanhkhoan.json`
(số của cả sàn, lấy từ bảng chỉ số VNDirect — xem `tools/kho_thanhkhoan.py`).

VÌ SAO CẦN: cộng từ dưới lên thì thiếu bao nhiêu cũng không lộ ra. Phiên 05/08/2025 hụt
1.688 tỷ mà nhìn con số 84.371 tỷ không ai thấy gì bất thường — phải có số của sàn đặt
bên cạnh mới biết.

ĐỌC KẾT QUẢ:
· **khớp lệnh** nên ở 99–100%. Dưới đó là kho thiếu mã hoặc thiếu ô.
· **thoả thuận** nên ở 97–100%. Nguồn từng mã của VNDirect BỎ SÓT thoả thuận ở phiên cũ;
  `tools/kho_thoathuan.py` vá bằng Vietstock.
· Vài phiên lệch cao mà cả HAI nguồn từng mã (VNDirect và Vietstock) đều đồng ý với nhau
  thì lỗi nằm ở **hàng chỉ số**, không phải ở kho — 18/12/2024 là ca mẫu: chỉ số ghi HOSE
  khớp 12.751 tỷ trong khi cộng từng mã cả hai nguồn đều ra 8.783 tỷ.
· Phiên có ít mã (cột `mã`) là phiên kho chưa phủ tới, không phải phiên sai.

    python3 tools/soi_thanhkhoan.py                 # tóm tắt theo tháng + phiên đáng ngờ
    python3 tools/soi_thanhkhoan.py --phien 60      # in chi tiết 60 phiên gần nhất
    python3 tools/soi_thanhkhoan.py --tu 2025-01-01
"""
import argparse
import collections
import glob
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
TK = os.path.join(BASE, "data", "thanhkhoan.json")
SAN = ("VNINDEX", "HNX", "UPCOM")
# Dưới ngưỡng này coi như kho chưa phủ phiên đó, không đem ra so.
MA_TOI_THIEU = 1000


def cong_kho():
    """{ngày: [mval, pval, số mã]} — cộng thẳng từ kho, không qua data/phantich.json."""
    ra = collections.defaultdict(lambda: [0.0, 0.0, 0])
    for f in glob.glob(os.path.join(GD, "*.json")):
        try:
            g = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        d = g.get("d") or []
        n = len(d)
        if not n:
            continue
        mv = g.get("mval") or []
        pv = g.get("pval") or []
        mv = mv if len(mv) == n else [None] * n
        pv = pv if len(pv) == n else [None] * n
        for i, x in enumerate(d):
            a = ra[x]
            a[0] += mv[i] or 0
            a[1] += pv[i] or 0
            a[2] += 1
    return ra


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--phien", type=int, default=0, help="in chi tiết N phiên gần nhất")
    ap.add_argument("--tu", default="", help="chỉ soi từ ngày này")
    ap.add_argument("--nguong-kl", type=float, default=2.0, help="%% hụt khớp lệnh đáng ngờ")
    ap.add_argument("--nguong-tt", type=float, default=5.0, help="%% hụt thoả thuận đáng ngờ")
    a = ap.parse_args()

    try:
        tk = json.load(open(TK, encoding="utf-8"))
    except Exception:
        print("  chưa có data/thanhkhoan.json — chạy `python3 tools/kho_thanhkhoan.py` trước")
        return
    that = collections.defaultdict(lambda: [0.0, 0.0])
    for m in SAN:
        o = tk.get(m) or {}
        for i, x in enumerate(o.get("d") or []):
            that[x][0] += o["kl"][i]
            that[x][1] += o["tt"][i]

    kho = cong_kho()
    ngay = sorted(x for x in kho if x in that and x >= a.tu)
    ngay = [x for x in ngay if kho[x][2] >= MA_TOI_THIEU]
    if not ngay:
        print("  không có phiên nào đủ điều kiện so sánh")
        return

    def dong(x):
        km, kp, n = kho[x]
        tm, tp = that[x]
        return (n, km / 1e9, tm / 1e9, kp / 1e9, tp / 1e9,
                (km / tm * 100) if tm else 0, (kp / tp * 100) if tp else 0)

    if a.phien:
        print(f"{'phiên':12s} {'mã':>5s} | {'khớp ta':>10s} {'khớp sàn':>10s} {'%':>7s}"
              f" | {'TT ta':>9s} {'TT sàn':>9s} {'%':>7s}")
        for x in ngay[-a.phien:]:
            n, km, tm, kp, tp, pm, pp = dong(x)
            print(f"{x:12s} {n:5d} | {km:10,.0f} {tm:10,.0f} {pm:6.1f}%"
                  f" | {kp:9,.0f} {tp:9,.0f} {pp:6.1f}%")
        print()

    thang = collections.defaultdict(lambda: [0, 0.0, 0.0, 0.0, 0.0])
    for x in ngay:
        n, km, tm, kp, tp, pm, pp = dong(x)
        t = thang[x[:7]]
        t[0] += 1; t[1] += km; t[2] += tm; t[3] += kp; t[4] += tp
    print(f"{'tháng':8s} {'ph':>3s} | {'khớp ta':>11s} {'khớp sàn':>11s} {'%':>7s}"
          f" | {'TT ta':>10s} {'TT sàn':>10s} {'%':>7s}")
    for k in sorted(thang):
        t = thang[k]
        pm = t[1] / t[2] * 100 if t[2] else 0
        pp = t[3] / t[4] * 100 if t[4] else 0
        print(f"{k:8s} {t[0]:3d} | {t[1]:11,.0f} {t[2]:11,.0f} {pm:6.1f}%"
              f" | {t[3]:10,.0f} {t[4]:10,.0f} {pp:6.1f}%")

    xau_kl = [x for x in ngay if dong(x)[5] < 100 - a.nguong_kl]
    xau_tt = [x for x in ngay if dong(x)[6] < 100 - a.nguong_tt]
    tkm = sum(kho[x][0] for x in ngay) / 1e12
    ttm = sum(that[x][0] for x in ngay) / 1e12
    tkp = sum(kho[x][1] for x in ngay) / 1e12
    ttp = sum(that[x][1] for x in ngay) / 1e12
    print()
    print(f"  {len(ngay):,} phiên so sánh được ({ngay[0]} → {ngay[-1]})")
    print(f"  KHỚP LỆNH  : {tkm:9,.0f} / {ttm:9,.0f} nghìn tỷ = {tkm/ttm*100:5.2f}%"
          f"   · {len(xau_kl):4d} phiên hụt quá {a.nguong_kl:.0f}%")
    print(f"  THOẢ THUẬN : {tkp:9,.0f} / {ttp:9,.0f} nghìn tỷ = {tkp/ttp*100:5.2f}%"
          f"   · {len(xau_tt):4d} phiên hụt quá {a.nguong_tt:.0f}%")
    for ten, ds in (("khớp lệnh", xau_kl), ("thoả thuận", xau_tt)):
        if not ds:
            continue
        te = sorted(ds, key=lambda x: dong(x)[5 if ten == "khớp lệnh" else 6])[:12]
        print(f"  hụt {ten} nặng nhất: "
              + " · ".join(f"{x} {dong(x)[5 if ten=='khớp lệnh' else 6]:.0f}%" for x in te))


if __name__ == "__main__":
    main()
