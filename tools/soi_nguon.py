#!/usr/bin/env python3
"""
SOI NGUỒN VẼ CHART — nguồn nào đang sai, sai từ phiên nào, lệch bao nhiêu.

VÌ SAO CÓ FILE NÀY: 14/08/2026 user báo "chart BID hiện giá không đúng giá đóng phiên",
và đúng MỘT MÌNH BID. Kho thì sạch (data/hist khớp bảng giá VPS từng số), nên nghi nguồn
vẽ chart trả sai cho riêng mã đó. Nhưng nghi thì phải ĐO ĐƯỢC: trước giờ không có cách
nào đối chiếu ba nguồn với nhau ngoài mở trình duyệt nhìn bằng mắt.

Đối chiếu 4 nơi cho cùng một mã:
  · VNDirect dchart   — nguồn 1, thứ trang đang vẽ
  · VPS histdatafeed  — nguồn 2, dự phòng
  · data/hist/{MÃ}    — kho repo (dựng từ VNDirect lúc 15:15 mỗi phiên)
  · data/eod/latest   — GIÁ ĐÓNG CỬA CHÍNH THỨC của phiên gần nhất, lấy từ bảng giá VPS
                        -> đây là TRỌNG TÀI: nó và kho nến là hai đường lấy số độc lập nhau.

  python3 tools/soi_nguon.py BID
  python3 tools/soi_nguon.py BID CTG VCB --phien 10
  python3 tools/soi_nguon.py --all          # quét toàn bộ mã, chỉ in mã lệch

ĐỌC KẾT QUẢ:
  · Nguồn lệch với EOD ở PHIÊN GẦN NHẤT  -> nguồn đó đang sai, chart vẽ ra số sai.
  · Lệch ở phiên CŨ nhưng khớp phiên mới -> gần như chắc là HỒI TỐ QUYỀN (cổ tức/thưởng),
    đúng thông lệ chứ không phải lỗi; đối chiếu data/cotuc.json để xác nhận.
  · Cả hai nguồn cùng lệch một hướng     -> nghi kho sai, không phải nguồn.
"""
import json, os, sys, datetime, urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA   = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120"}
VND  = "https://dchart-api.vndirect.com.vn/dchart/history"
VPS  = "https://histdatafeed.vps.com.vn/tradingview/history"
NGUONG = 0.5          # % — cùng ngưỡng "hạ nền" mà refresh_daily.fetch_hist đang dùng


def ngay(t):
    return datetime.datetime.utcfromtimestamp(int(t) + 7 * 3600).strftime("%Y-%m-%d")


def tai(url, sym, res):
    """-> {ngày: close} theo ĐỒNG, hoặc None nếu nguồn không trả được."""
    to = int(datetime.datetime.now().timestamp())
    fr = to - 400 * 86400
    try:
        q = f"{url}?symbol={sym}&resolution={res}&from={fr}&to={to}"
        with urllib.request.urlopen(urllib.request.Request(q, headers=UA), timeout=30) as r:
            j = json.loads(r.read().decode())
    except Exception as e:
        print(f"    (không gọi được {url.split('/')[2]}: {str(e)[:80]})")
        return None
    if not j or j.get("s") != "ok" or not j.get("t"):
        return None
    c = j["c"]
    # hai nguồn đều trả NGHÌN đồng nhưng có mã trả sẵn VND -> dò hệ số bằng chính giá cuối,
    # KHÔNG đoán theo ngưỡng (VNZ/HLB giá ~500 nghìn rơi đúng biên) — xem CLAUDE.md.
    k = 1000 if c[-1] and c[-1] < 5000 else 1
    return {ngay(t): round(v * k) for t, v in zip(j["t"], c) if v}


def kho_hist(sym):
    p = os.path.join(BASE, "data", "hist", f"{sym}.json")
    if not os.path.exists(p):
        return None
    f = json.load(open(p, encoding="utf-8"))
    return {ngay(t): v for t, v in zip(f["t"], f["c"]) if v}


def lech(a, b):
    return None if not (a and b) else abs(a - b) / b * 100


def soi(sym, eod, so_phien, im=False):
    """-> (có lệch ở phiên gần nhất không, dòng tóm tắt)."""
    e = eod.get(sym)
    if not e:
        return False, f"{sym}: không có trong kho EOD"
    kho = kho_hist(sym) or {}
    v1 = tai(VND, sym, "D") or {}
    v2 = tai(VPS, sym, "1D") or {}
    ngay_eod = eod["_date"]
    chuan = e["close"]
    hang = []
    for ten, d in (("VNDirect", v1), ("VPS", v2), ("kho hist", kho)):
        g = d.get(ngay_eod)
        l = lech(g, chuan)
        hang.append((ten, g, l))
    sai = [h for h in hang if h[1] is not None and h[2] is not None and h[2] > NGUONG]

    if not im:
        print(f"\n=== {sym} · phiên {ngay_eod} · giá đóng cửa CHÍNH THỨC (bảng giá VPS): {chuan:,} đ")
        for ten, g, l in hang:
            if g is None:
                print(f"    {ten:<10} —  (nguồn không có phiên này)")
            else:
                co = "  <== LỆCH" if l and l > NGUONG else ""
                print(f"    {ten:<10} {g:>10,} đ   lệch {l:6.2f}%{co}")
        # vài phiên gần nhất để nhìn ra lệch bắt đầu từ đâu
        ngs = sorted(set(list(v1) + list(v2) + list(kho)), reverse=True)[:so_phien]
        if ngs:
            print(f"    {'ngày':<12}{'VNDirect':>12}{'VPS':>12}{'kho hist':>12}")
            for n in ngs:
                f = lambda d: f"{d[n]:,}" if n in d else "—"
                print(f"    {n:<12}{f(v1):>12}{f(v2):>12}{f(kho):>12}")
    return bool(sai), sym + (" LỆCH: " + ", ".join(f"{t} {l:.2f}%" for t, _, l in sai) if sai else " ok")


def main():
    ap = [a for a in sys.argv[1:] if not a.startswith("-")]
    so_phien = 8
    if "--phien" in sys.argv:
        i = sys.argv.index("--phien")
        if i + 1 < len(sys.argv):
            so_phien = int(sys.argv[i + 1]); ap = [a for a in ap if a != sys.argv[i + 1]]
    ej = json.load(open(os.path.join(BASE, "data", "eod", "latest.json"), encoding="utf-8"))
    eod = {r["sym"]: r for r in ej["data"]}
    eod["_date"] = ej["date"]
    if "--all" in sys.argv:
        xau = []
        syms = [s for s in eod if s != "_date"]
        for i, s in enumerate(syms):
            co, d = soi(s, eod, so_phien, im=True)
            if co:
                xau.append(d); print("  " + d, flush=True)
            if (i + 1) % 100 == 0:
                print(f"  … {i+1}/{len(syms)}", flush=True)
        print(f"\nXONG: {len(xau)}/{len(syms)} mã có nguồn lệch >{NGUONG}% ở phiên gần nhất")
        return
    for s in (ap or ["BID"]):
        soi(s.upper(), eod, so_phien)


if __name__ == "__main__":
    main()
