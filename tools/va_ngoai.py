#!/usr/bin/env python3
"""
VÁ KHỐI NGOẠI vào data/hist/{MÃ}.json — lấy lịch sử mua/bán của nhà đầu tư nước ngoài
từ VNDirect finfo, lùi tới 2018.

VÌ SAO CẦN: hai trường `fb`/`fs` trong kho nến chỉ bắt đầu có số từ 6/2026 — trước đó
toàn số 0 vì pipeline chỉ biết lấy khối ngoại của PHIÊN HÔM ĐÓ (bảng giá VPS) và bù
30 phiên gần nhất (24hMoney). Không có cửa nào lấy phần cũ hơn, nên mọi phép đo dòng
tiền ngoại theo lịch sử đều vô nghĩa: 290/500 mã mẫu không có lấy một số khác 0.
`api-finfo.vndirect.com.vn/v4/foreigns` trả ĐỦ buyVol/sellVol theo từng phiên từ
30/08/2018 — phủ trọn kho nến (bắt đầu 07/01/2020).

TỰ KIỂM CHỨNG TRƯỚC KHI GHI: kho đã có sẵn khối ngoại của mấy tháng gần đây, nên đối
chiếu nguyên phần chồng nhau. Khớp mới lấy phần cũ; lệch quá 5% số phiên thì BỎ QUA mã
đó và ghi vào báo cáo. Đo trên HPG: 37/37 phiên khớp tuyệt đối, `buyVol`/`sellVol` đúng
là số CỔ PHIẾU giống hệt đơn vị kho đang dùng — không phải đoán.

  python3 tools/va_ngoai.py --thu          # chạy thử, không ghi gì
  python3 tools/va_ngoai.py                # vá thật (chỉ ĐIỀN CHỖ TRỐNG)
  python3 tools/va_ngoai.py --ma HPG,VIC   # chỉ mấy mã này
  python3 tools/va_ngoai.py --sua 2026-07-17 2026-08-13   # GHI ĐÈ trong khoảng ngày

CHẾ ĐỘ `--sua` (thêm 19/08/2026): ghi đè cả phiên ĐÃ CÓ SỐ, chỉ trong khoảng ngày chỉ định.
Cần vì 24hMoney đổi đơn vị giữa chừng — mọi phiên tới 13/08/2026 nguồn đó trả nhỏ hơn 10
lần — và bước bù trong `refresh_daily` đã bê nguyên vào kho. Đối chiếu ba nguồn trên
VCB/HPG: VNDirect và bảng giá VPS khớp nhau TỪNG SỐ ở mọi phiên, 24hMoney lệch đúng ×10 ở
20 phiên 17/07-13/08. Ngoài khoảng đó kho sạch: đo VCB/HPG/SSI theo năm, 2020 khớp 249/249
phiên, 2022 249/249, 2024 247/247.
Phải CHỈ ĐỊNH KHOẢNG chứ không cho ghi đè toàn kho: bước đối chiếu ở dưới chỉ chặn được mã
lệch trên diện rộng, còn mở toang cửa ghi đè thì một lượt chạy nhầm là mất sạch phần kho
đang đúng mà không có bản nào để đối chiếu lại.
"""
import json, os, sys, time, datetime, urllib.request, concurrent.futures, threading

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HIST = os.path.join(BASE, "data", "hist")
UA   = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120"}
SRC  = "https://api-finfo.vndirect.com.vn/v4/foreigns"
# --sua TU DEN -> ghi đè cả phiên đã có số, GIỚI HẠN trong khoảng ngày này
SUA  = None
if "--sua" in sys.argv:
    _i = sys.argv.index("--sua")
    SUA = (sys.argv[_i + 1], sys.argv[_i + 2])
TU   = "2018-01-01"          # nguồn bắt đầu 30/08/2018, xin sớm hơn cũng không sao

THU = "--thu" in sys.argv
CHI = None
for _j, a in enumerate(sys.argv):
    if a.startswith("--ma"):
        # nhận CẢ HAI dạng: `--ma=HPG,VIC` và `--ma HPG,VIC`. Bản cũ chỉ đọc dạng có dấu `=`
        # trong khi chính dòng hướng dẫn ở đầu file viết dạng cách trắng -> gõ theo hướng dẫn
        # là bộ lọc rỗng và công cụ lặng lẽ chạy TOÀN BỘ 1.500 mã.
        v = a.split("=", 1)[1] if "=" in a else (sys.argv[_j + 1] if _j + 1 < len(sys.argv) else "")
        CHI = {x.strip().upper() for x in v.split(",") if x.strip()}

def get(url, timeout=45):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return json.loads(r.read().decode())

def jdump(obj, path):
    tmp = path + ".tmp"
    json.dump(obj, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)

def ngay(ts):
    """unix -> 'YYYY-MM-DD'. Kho nến để mốc 00:00 UTC nên đọc theo UTC mới ra đúng phiên."""
    return datetime.datetime.fromtimestamp(ts, datetime.UTC).strftime("%Y-%m-%d")

lock = threading.Lock()
kq   = {"ok": 0, "lech": 0, "trong": 0, "loi": 0, "them": 0, "nguyen": 0}
bao  = []

def mot(sym):
    path = os.path.join(HIST, f"{sym}.json")
    try:
        h = json.load(open(path, encoding="utf-8"))
    except Exception:
        with lock: kq["loi"] += 1
        return
    t = h.get("t") or []
    if not t:
        with lock: kq["trong"] += 1
        return
    try:
        d = get(f"{SRC}?q=code:{sym}~tradingDate:gte:{TU}&sort=tradingDate:asc&size=3000")
    except Exception:
        with lock: kq["loi"] += 1
        return
    data = d.get("data") or []
    if not data:
        with lock: kq["trong"] += 1
        return
    src = {r["tradingDate"]: (int(r.get("buyVol") or 0), int(r.get("sellVol") or 0))
           for r in data if r.get("tradingDate")}

    fb = list(h.get("fb") or [0] * len(t))
    fs = list(h.get("fs") or [0] * len(t))
    fb += [0] * (len(t) - len(fb)); fs += [0] * (len(t) - len(fs))

    # --- đối chiếu phần kho ĐÃ CÓ trước khi tin nguồn
    ok = bad = 0
    for i, ts in enumerate(t):
        if not (fb[i] or fs[i]): continue
        d0 = ngay(ts)
        # KHOẢNG ĐANG VÁ KHÔNG ĐƯỢC TÍNH VÀO CỔNG. Cổng này sinh ra để chặn NGUỒN hỏng,
        # nhưng ở ca --sua thì chính KHO mới là bên sai — để nguyên thì 20 phiên lệch trên
        # ~311 phiên = 6,4% > ngưỡng 5%, và công cụ loại đúng những mã cần vá nhất.
        if SUA and SUA[0] <= d0 <= SUA[1]: continue
        g = src.get(d0)
        if not g: continue
        if abs(fb[i] - g[0]) <= max(10, fb[i] * 0.002) and abs(fs[i] - g[1]) <= max(10, fs[i] * 0.002):
            ok += 1
        else:
            bad += 1
    if ok + bad >= 5 and bad > (ok + bad) * 0.05:
        with lock:
            kq["lech"] += 1; bao.append((sym, ok, bad))
        return

    # --- điền vào phiên đang TRỐNG; trong khoảng `--sua` thì ghi đè cả phiên đã có số
    them = 0
    for i, ts in enumerate(t):
        d0 = ngay(ts)
        trong_khoang = SUA and SUA[0] <= d0 <= SUA[1]
        if (fb[i] or fs[i]) and not trong_khoang: continue
        g = src.get(d0)
        if not g or (not g[0] and not g[1]): continue
        if fb[i] == g[0] and fs[i] == g[1]: continue      # đã đúng rồi, đừng đếm là đã sửa
        fb[i], fs[i] = g
        them += 1
    if not them:
        with lock: kq["nguyen"] += 1
        return
    h["fb"], h["fs"] = fb, fs
    if not THU: jdump(h, path)
    with lock:
        kq["ok"] += 1; kq["them"] += them
        n = sum(kq[k] for k in ("ok", "lech", "trong", "loi", "nguyen"))
        if n % 150 == 0: print(f"  {n}/{len(syms)}…", flush=True)

syms = sorted(f[:-5] for f in os.listdir(HIST) if f.endswith(".json"))
if CHI: syms = [s for s in syms if s in CHI]
print(f"{len(syms)} mã · {'CHẠY THỬ (không ghi)' if THU else 'VÁ THẬT'}", flush=True)
t0 = time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    list(pool.map(mot, syms))
print(f"\nxong sau {time.time()-t0:.0f}s: {kq['ok']} mã được vá (+{kq['them']:,} phiên có số khối ngoại)"
      f" · {kq['nguyen']} mã vốn đã đủ · {kq['lech']} mã LỆCH nên bỏ qua"
      f" · {kq['trong']} mã nguồn không có · {kq['loi']} mã lỗi", flush=True)
if bao:
    bao.sort(key=lambda x: -x[2])
    print("Lệch nhiều nhất (mã · phiên khớp · phiên lệch):")
    for s, a, b in bao[:15]: print(f"  {s:6s} khớp {a:4d} · lệch {b:4d}")
