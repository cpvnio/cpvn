#!/usr/bin/env python3
"""
VÁ NỀN GIÁ MỘT LƯỢT — tải lại toàn bộ data/hist/{SYM}.json từ VNDirect.

Vì sao cần: kho nến trước đây cào từ VPS, mà VPS chỉ hồi tố quyền từ khoảng giữa 2021.
Mọi đợt cổ tức/thưởng TRƯỚC mốc đó không được hạ nền -> giá quá khứ bị ĐỘI LÊN, nên mọi
thứ đọc kho này (đường đua, đầu tư bền vững, bộ lọc MA/RSI, độ rộng thị trường) đều tính
HỤT lãi. Đo 3/2020 -> nay: HPG nhân 3,10 lần theo VPS trong khi thật là 4,21 lần; VIB
3,66 vs 5,14; ACB 4,00 vs 5,00; FPT 4,16 vs 4,83; NVL 0,38 vs 0,51.

Chạy một lần là xong; từ đó refresh_daily.py đã lấy VNDirect làm nguồn chính nên không
tái diễn. KHỐI NGOẠI (fb/fs) trong file cũ được giữ nguyên theo ngày, không mất.
  python3 tools/va_nen_gia.py            # vá thật
  python3 tools/va_nen_gia.py --thu      # chạy thử, chỉ in ra mã nào lệch bao nhiêu
"""
import json, os, sys, time, datetime, urllib.request, concurrent.futures, threading

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HIST = os.path.join(BASE, "data", "hist")
LATEST = os.path.join(BASE, "data", "eod", "latest.json")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120"}
NOW = int(time.time()); DAYS = 2400
THU = "--thu" in sys.argv
VNTZ = datetime.timezone(datetime.timedelta(hours=7))
SRC = "https://dchart-api.vndirect.com.vn/dchart/history"


def get(url, timeout=25):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return json.loads(r.read().decode())


def jdump(obj, path):
    tmp = path + ".tmp"
    json.dump(obj, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


def vn_day(ts):
    return datetime.datetime.fromtimestamp(ts, VNTZ).strftime("%Y-%m-%d")


# tham chiếu bảng giá để suy ĐƠN VỊ giá (nghìn hay đồng) — không đoán theo ngưỡng
ref = {}
try:
    for r in json.load(open(LATEST, encoding="utf-8"))["data"]:
        if r.get("ref"): ref[r["sym"]] = float(r["ref"])
except Exception as e:
    print("không đọc được latest.json:", e)

syms = sorted(f[:-5] for f in os.listdir(HIST) if f.endswith(".json"))
print(f"{len(syms)} mã trong kho · {'CHẠY THỬ' if THU else 'VÁ THẬT'}", flush=True)

lock = threading.Lock()
kq = {"ok": 0, "loi": 0, "doi": 0, "giu": 0}
lech = []


def mot(sym):
    path = os.path.join(HIST, f"{sym}.json")
    try:
        old = json.load(open(path, encoding="utf-8"))
    except Exception:
        with lock: kq["loi"] += 1
        return
    j = None
    for att in range(3):
        try:
            j = get(f"{SRC}?symbol={sym}&resolution=D&from={NOW-DAYS*86400}&to={NOW}")
            break
        except Exception:
            time.sleep(0.7 * (att + 1))
    if not j or j.get("s") != "ok" or not j.get("c"):
        with lock: kq["loi"] += 1          # nguồn không có mã -> GIỮ NGUYÊN file cũ
        return
    last = j["c"][-1]; rf = ref.get(sym) or 0
    k = (1000 if abs(last * 1000 - rf) < abs(last - rf) else 1) if (rf > 0 and last > 0) \
        else (1000 if last < 500 else 1)
    n = len(j["t"])
    gi = lambda a, i: (a[i] if a and i < len(a) and a[i] is not None else j["c"][i])
    new = {"t": j["t"],
           "o": [round(gi(j.get("o"), i) * k) for i in range(n)],
           "h": [round(gi(j.get("h"), i) * k) for i in range(n)],
           "l": [round(gi(j.get("l"), i) * k) for i in range(n)],
           "c": [round(x * k) for x in j["c"]],
           "v": [int(j["v"][i] or 0) if j.get("v") and i < len(j["v"]) else 0 for i in range(n)]}

    # AN TOÀN: nguồn trả ÍT phiên hơn hẳn file cũ thì đừng thay, kẻo mất lịch sử
    ot = old.get("t") or []
    if len(new["t"]) < len(ot) * 0.9:
        with lock: kq["giu"] += 1
        return

    # ĐO MỨC HẠ NỀN tại phiên chung XA NHẤT — phải đo TRƯỚC khi ghép, vì ghép xong thì
    # phiên đầu chuỗi lại chính là số của file cũ, tỉ lệ ra 1 và tưởng không có gì đổi.
    cu = {vn_day(t): c for t, c in zip(ot, old.get("c") or [])}
    tile = None
    for t, c in zip(new["t"], new["c"]):
        d = vn_day(t)
        if d in cu and cu[d] > 0:
            tile = c / cu[d]; break
    if tile is not None and abs(tile - 1) > 0.01:
        with lock: lech.append((sym, round(tile, 3)))

    # Nguồn thiếu phần quá khứ mà file cũ có -> ghép phần cũ vào đầu, NHƯNG phải QUY VỀ
    # CÙNG NỀN trước (nhân tỉ lệ đo được). Ghép thẳng nền cũ vào nền mới là tự tay tạo
    # một cú sập giả ngay tại chỗ nối, đúng bằng tỉ lệ cổ tức — chính thứ đang đi sửa.
    if ot and ot[0] < new["t"][0] and tile is not None:
        cut = 0
        while cut < len(ot) and ot[cut] < new["t"][0]: cut += 1
        for key in ("o", "h", "l", "c"):
            new[key] = [round(x * tile) for x in (old.get(key) or [])[:cut]] + new[key]
        for key in ("t", "v"):
            new[key] = (old.get(key) or [])[:cut] + new[key]

    # GIỮ KHỐI NGOẠI đã lưu, khớp theo NGÀY
    fbfs = {}
    for i, t in enumerate(ot):
        fb = (old.get("fb") or [0] * len(ot))[i] if i < len(old.get("fb") or []) else 0
        fs = (old.get("fs") or [0] * len(ot))[i] if i < len(old.get("fs") or []) else 0
        if fb or fs: fbfs[vn_day(t)] = (fb, fs)
    new["fb"] = []; new["fs"] = []
    for t in new["t"]:
        fb, fs = fbfs.get(vn_day(t), (0, 0))
        new["fb"].append(fb); new["fs"].append(fs)
    new["sym"] = sym

    if not THU: jdump(new, path)
    with lock:
        kq["ok"] += 1
        if tile is not None and abs(tile - 1) > 0.01: kq["doi"] += 1
        if (kq["ok"] + kq["loi"] + kq["giu"]) % 200 == 0:
            print(f"  {kq['ok']+kq['loi']+kq['giu']}/{len(syms)}…", flush=True)


with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
    list(pool.map(mot, syms))

print(f"\nxong: {kq['ok']} mã tải lại · {kq['doi']} mã đổi nền · {kq['giu']} mã giữ nguyên "
      f"(nguồn trả thiếu) · {kq['loi']} mã lỗi", flush=True)
lech.sort(key=lambda x: -abs(x[1] - 1))
print("Lệch mạnh nhất (nền mới / nền cũ tại phiên xa nhất):")
for s, t in lech[:25]:
    print(f"  {s:6s} ×{t}")
