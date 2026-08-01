#!/usr/bin/env python3
"""
CPVN — cập nhật EOD hằng ngày.
Chạy sau 15h (giờ VN), Thứ 2–6. Làm 2 việc:
  1) Cập nhật lại MỐC GIÁ (anchors w1/m1/m3/m6/y1/y5) trong universe.json  -> % tuần/tháng/năm luôn chuẩn
     + tính lại vốn hoá = SLCP × giá đóng cửa hôm nay.
  2) LƯU SNAPSHOT EOD của ngày vào data/eod/YYYY-MM-DD.json  -> kho lịch sử (giá/KLGD/NN chốt phiên).
Nguồn: VPS histdatafeed (giá lịch sử) + VPS bảng giá (NN, trần/sàn). Không cần token.
Tuỳ chọn: chạy `python refresh_daily.py --full` (nên đặt lịch mỗi Thứ 2) để làm mới thêm
SLCP/ngành/logo/PE/PB từ Simplize.
"""
import json, os, sys, time, datetime, urllib.request, concurrent.futures

BASE = os.path.dirname(os.path.abspath(__file__))
UNIV = os.path.join(BASE, "universe.json")
EOD_DIR = os.path.join(BASE, "data", "eod")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120"}
FULL = "--full" in sys.argv

def get(url, timeout=15):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return json.loads(r.read().decode())

def vn_now():
    return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))

NOW = int(time.time())

# ---- 1) đọc universe hiện có (giữ danh sách mã + SLCP/ngành/logo) ----------
u = json.load(open(UNIV, encoding="utf-8"))
stocks = {s["sym"]: s for s in u["stocks"]}
syms = list(stocks)
print(f"universe: {len(syms)} mã", flush=True)

# ---- 2) giá lịch sử theo mã -> anchors + giá/KLGD đóng cửa hôm nay ---------
def close_at(t, c, days):
    target = NOW - days * 86400
    v = None
    for i in range(len(t)):
        if t[i] <= target: v = c[i]
        else: break
    return v if v is not None else (c[0] if c else None)

def fetch_prices(sym):
    try:
        j = get(f"https://histdatafeed.vps.com.vn/tradingview/history?symbol={sym}"
                f"&resolution=1D&from={NOW-2000*86400}&to={NOW}")
        if j.get("s") != "ok" or not j.get("c"): return sym, None
        t, c = j["t"], j["c"]; v = j.get("v", [])
        k = 1000 if c[-1] < 500 else 1               # nghìn đồng -> đồng (tự thích ứng)
        cc = [x * k for x in c]
        anc = {"w1": close_at(t, cc, 7), "m1": close_at(t, cc, 30), "m3": close_at(t, cc, 90),
               "m6": close_at(t, cc, 180), "y1": close_at(t, cc, 365), "y5": close_at(t, cc, 1825),
               "last": cc[-1]}
        return sym, {"anc": anc, "close": cc[-1], "vol": (v[-1] if v else 0), "date": t[-1]}
    except Exception:
        return sym, None

prices = {}
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    for sym, d in pool.map(fetch_prices, syms):
        if d: prices[sym] = d
print(f"giá lịch sử: lấy được {len(prices)}/{len(syms)}", flush=True)

# ---- 3) bảng giá cuối phiên -> NN mua/bán + trần/sàn/tham chiếu ------------
board = {}
for i in range(0, len(syms), 150):
    ch = ",".join(syms[i:i+150])
    try:
        for x in get(f"https://bgapidatafeed.vps.com.vn/getliststockdata/{ch}"):
            board[x["sym"]] = {
                "ref": (float(x.get("r") or 0)) * 1000,
                "ceil": (float(x.get("c") or 0)) * 1000,
                "floor": (float(x.get("f") or 0)) * 1000,
                "fBuy": (float(x.get("fBVol") or 0)) * 10,
                "fSell": (float(x.get("fSVolume") or 0)) * 10,
                "gtgd": (float(x.get("avePrice") or 0)) * 1000 * (float(x.get("lot") or 0)) * 10,
            }
    except Exception as e:
        print("  board chunk lỗi:", e, flush=True)
print(f"bảng giá EOD: {len(board)} mã", flush=True)

# ---- 4) (tuỳ chọn --full) làm mới SLCP/ngành/logo/PE/PB từ Simplize --------
if FULL:
    def fetch_fund(sym):
        try:
            d = get(f"https://api2.simplize.vn/api/company/summary/{sym}")["data"]
            return sym, {"shares": d.get("outstandingSharesValue"), "sector": d.get("bcEconomicSectorName"),
                         "img": d.get("imageUrl"), "pe": d.get("peRatio"), "pb": d.get("pbRatio")}
        except Exception:
            return sym, None
    n = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for sym, f in pool.map(fetch_fund, syms):
            if f: stocks[sym].update({k: v for k, v in f.items() if v is not None}); n += 1
    print(f"--full: làm mới cơ bản {n} mã", flush=True)

# ---- 5) ghép vào universe: anchors mới + vốn hoá = SLCP × giá đóng cửa -----
for sym, s in stocks.items():
    p = prices.get(sym)
    if p:
        s["anc"] = p["anc"]
        if s.get("shares"): s["mcap"] = s["shares"] * p["close"]

today = vn_now().strftime("%Y-%m-%d")
u["stocks"] = sorted(stocks.values(), key=lambda s: -(s.get("mcap") or 0))
u["generated"] = today
u["ancDate"] = today
json.dump(u, open(UNIV, "w", encoding="utf-8"), ensure_ascii=False)
print(f"ĐÃ CẬP NHẬT universe.json (generated={today})", flush=True)

# ---- 6) lưu snapshot EOD của ngày -> data/eod/YYYY-MM-DD.json --------------
os.makedirs(EOD_DIR, exist_ok=True)
snapshot = []
for sym in syms:
    p, b = prices.get(sym), board.get(sym, {})
    if not p: continue
    snapshot.append({
        "sym": sym, "close": p["close"], "vol": p["vol"],
        "ref": b.get("ref"), "ceil": b.get("ceil"), "floor": b.get("floor"),
        "fBuy": b.get("fBuy"), "fSell": b.get("fSell"), "gtgd": b.get("gtgd"),
    })
out = os.path.join(EOD_DIR, f"{today}.json")
json.dump({"date": today, "count": len(snapshot), "data": snapshot},
          open(out, "w", encoding="utf-8"), ensure_ascii=False)
print(f"ĐÃ LƯU snapshot EOD: {out} ({len(snapshot)} mã)", flush=True)
