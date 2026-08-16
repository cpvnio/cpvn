#!/usr/bin/env python3
"""
BỒI KHO NẾN LÙI VỀ 2013 — chạy MỘT LẦN.

Kho `data/hist` bắt đầu từ 2020-01-07 (mốc chọn hồi dựng pipeline), trong khi VNDirect
dchart có từ 2013-01-02. Bảy năm đó không dùng để vẽ chart (chart lấy thẳng VNDirect), mà
để nuôi ĐƯỜNG ĐUA, ĐẦU TƯ BỀN VỮNG, MA/RSI, đỉnh 52T, độ rộng, bộ lọc — tất cả đều đọc kho.

LUẬT SỐNG CÒN: ĐO TỈ LỆ TRƯỚC KHI GHÉP
--------------------------------------
Không được ghép thô. Kho và nguồn có thể đang ở HAI NỀN GIÁ KHÁC NHAU khi mã vừa chốt
quyền mà kho chưa kịp cào lại — đo 17/08/2026: SSI lệch 1,2511 lần (cổ tức tiền 1.000đ +
cổ phiếu thưởng 100:20 cùng ngày). Ghép thô lên một mã như vậy là tự tay tạo một cú sập
giả 20% giữa chuỗi giá, rồi đường đua và DCA đọc vào ra kết quả bịa.

Nên: đo tỉ lệ kho/nguồn trên CÁC PHIÊN TRÙNG NHAU trước.
  · lệch < 0,5%  -> cùng nền, ghép phần cũ vào
  · lệch >= 0,5% -> BỎ QUA mã đó, in ra để soi. Không tự ý quy đổi: mã đó đang chờ lượt
    cào EOD kế tiếp tự phát hiện hạ nền và tải lại toàn bộ (luật đã có trong refresh_daily),
    để nó làm đúng việc của nó còn hơn mình đoán.

GIỮ NGUYÊN fb/fs: khối ngoại chỉ có trong kho, nguồn dchart không trả. Phần cũ bồi vào
không có số khối ngoại -> điền 0, đúng như các phiên chưa từng được vá.

    python3 tools/boi_nen.py --thu        # chỉ đo, không ghi (nên chạy trước)
    python3 tools/boi_nen.py              # bồi thật
    python3 tools/boi_nen.py --ma VIC,HPG # chỉ vài mã, để thử
"""
import json, os, sys, time, datetime, concurrent.futures, threading

for _s in ("stdout", "stderr"):
    try: getattr(sys, _s).reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HIST = os.path.join(BASE, "data", "hist")
SRC = "https://dchart-api.vndirect.com.vn/dchart/history"
TU = int(datetime.datetime(2005, 1, 1).timestamp())
DEN = int(time.time())
NGUONG = 0.005                      # 0,5% — cùng ngưỡng "tự phát hiện hạ nền" của pipeline
THU = "--thu" in sys.argv
CHON = None
for i, a in enumerate(sys.argv):
    if a == "--ma" and i + 1 < len(sys.argv):
        CHON = [x.strip().upper() for x in sys.argv[i + 1].split(",")]

lock = threading.Lock()
dem = {"boi": 0, "du": 0, "lech": 0, "hong": 0, "them": 0}
lech_ds, hong_ds = [], []


def mot(sym):
    p = os.path.join(HIST, sym + ".json")
    try:
        k = json.load(open(p, encoding="utf-8"))
    except Exception:
        return "hong", 0
    kt = k.get("t") or []
    if len(kt) < 50:
        return "hong", 0
    try:
        j = json.loads(nhipmang.get(f"{SRC}?symbol={sym}&resolution=D&from={TU}&to={DEN}"))
    except Exception:
        return "hong", 0
    st = j.get("t") or []
    if j.get("s") != "ok" or len(st) < 50:
        return "hong", 0

    # nguồn trả NGHÌN ĐỒNG, kho để ĐỒNG
    sc = {t: c for t, c in zip(st, j.get("c") or [])}
    ty = [c / (sc[t] * 1000) for t, c in zip(kt, k.get("c") or [])
          if t in sc and sc[t] and c]
    if len(ty) < 30:
        return "hong", 0
    ty.sort()
    tb = ty[len(ty) // 2]
    if abs(tb - 1) >= NGUONG:
        return ("lech", round(tb, 4))

    cu = kt[0]
    moi = [i for i, t in enumerate(st) if t < cu]
    if not moi:
        return "du", 0                      # kho đã sâu bằng nguồn
    if THU:
        return "boi", len(moi)

    o, h, l, c, v = (j.get(x) or [] for x in "ohlcv")
    k2 = {
        "t": [st[i] for i in moi] + kt,
        "o": [round((o[i] if i < len(o) and o[i] is not None else j["c"][i]) * 1000) for i in moi] + (k.get("o") or []),
        "h": [round((h[i] if i < len(h) and h[i] is not None else j["c"][i]) * 1000) for i in moi] + (k.get("h") or []),
        "l": [round((l[i] if i < len(l) and l[i] is not None else j["c"][i]) * 1000) for i in moi] + (k.get("l") or []),
        "c": [round(j["c"][i] * 1000) for i in moi] + (k.get("c") or []),
        "v": [int(v[i]) if i < len(v) and v[i] else 0 for i in moi] + (k.get("v") or []),
        # khối ngoại: nguồn dchart KHÔNG có -> phần bồi vào để 0, y như phiên chưa được vá
        "fb": [0] * len(moi) + (k.get("fb") or [0] * len(kt)),
        "fs": [0] * len(moi) + (k.get("fs") or [0] * len(kt)),
    }
    n = len(k2["t"])
    if any(len(k2[x]) != n for x in "ohlcv") or len(k2["fb"]) != n or len(k2["fs"]) != n:
        return "hong", 0                    # 8 mảng phải cùng độ dài, sai là bỏ
    for x in k:                             # giữ lại mọi trường khác của file cũ
        if x not in k2: k2[x] = k[x]
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(k2, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)
    return "boi", len(moi)


def chay(sym):
    kq, n = mot(sym)
    with lock:
        dem[kq] = dem.get(kq, 0) + 1
        if kq == "boi": dem["them"] += n
        elif kq == "lech": lech_ds.append((sym, n))
        elif kq == "hong": hong_ds.append(sym)
        t = sum(dem[x] for x in ("boi", "du", "lech", "hong"))
        if t % 100 == 0:
            print(f"  {t} mã · bồi {dem['boi']} · đủ {dem['du']} · lệch nền {dem['lech']} · hỏng {dem['hong']}", flush=True)


if __name__ == "__main__":
    ds = CHON or sorted(f[:-5] for f in os.listdir(HIST) if f.endswith(".json"))
    print(f"{'THỬ — không ghi' if THU else 'BỒI THẬT'} · {len(ds)} mã", flush=True)
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(chay, ds))
    print(f"\nxong {time.time()-t0:.0f}s · bồi {dem['boi']} mã (+{dem['them']:,} nến) · "
          f"đã đủ {dem['du']} · LỆCH NỀN {dem['lech']} · hỏng {dem['hong']}", flush=True)
    if lech_ds:
        print("\nLỆCH NỀN — bỏ qua, chờ lượt EOD tự phát hiện hạ nền và tải lại:", flush=True)
        for s, r in sorted(lech_ds, key=lambda x: -abs(x[1] - 1))[:25]:
            print(f"   {s}: kho/nguồn = {r}", flush=True)
    if hong_ds:
        print(f"\nhỏng ({len(hong_ds)}): {', '.join(hong_ds[:25])}", flush=True)
