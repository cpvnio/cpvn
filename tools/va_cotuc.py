#!/usr/bin/env python3
"""Vá MỘT LẦN: xếp lại cổ tức CỔ PHIẾU / THƯỞNG theo NĂM CHỐT QUYỀN.

Lỗi gốc (đã sửa trong refresh_daily.py): cổ tức TIỀN lấy từ dividend/histories
mang năm CHI TRẢ, còn cổ tức CỔ PHIẾU lại xếp theo năm TÀI CHÍNH ghi trong mô tả
sự kiện -> hai quy ước năm trộn trong cùng một bảng. Đối chiếu 5 mã lớn: 21/21
sự kiện lệch (VCB 27,6% chốt quyền 22/12/2021 nằm ở dòng 2019).

Kho đã lưu không suy ngược ra ngày chốt quyền được (chỉ còn year+cash+div+bonus)
và độ lệch KHÔNG cố định (VCB lệch 2 năm, HPG lệch 1 năm) nên phải cào lại lịch
sự kiện. Chỉ đụng ba trường cổ tức, mọi thứ khác trong data/fin giữ nguyên.

    python3 tools/va_cotuc.py            # vá thật
    python3 tools/va_cotuc.py --thu      # chỉ in ra, không ghi
"""
import json, os, re, sys, time, glob, threading
import concurrent.futures as cf
import urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIN = os.path.join(BASE, "data", "fin")
THU = "--thu" in sys.argv
RX_RATIO = re.compile(r"tỷ lệ\s*([\d.,]+)\s*:\s*([\d.,]+)")
RX_DIVCP = re.compile(r"cổ tức.*cổ phiếu", re.I)
lock = threading.Lock()
stats = {"sua": 0, "nguyen": 0, "hong": 0, "doi": 0}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode())


def num(x):
    x = x.strip()
    return float(x.replace(",", "")) if "," in x else float(x)


def viec(sym):
    p = os.path.join(FIN, sym + ".json")
    try:
        d = json.load(open(p, encoding="utf-8"))
    except Exception:
        with lock: stats["hong"] += 1
        return
    cu = d.get("div") or []
    if not any((r.get("div") or 0) > 0 or (r.get("bonus") or 0) > 0 for r in cu):
        with lock: stats["nguyen"] += 1          # chỉ có cổ tức tiền -> vốn đã đúng
        return
    try:
        ev = get(f"https://api2.simplize.vn/api/company/events/list"
                 f"?ticker={sym}&type=&page=0&size=200").get("data") or []
    except Exception:
        with lock: stats["hong"] += 1
        return
    time.sleep(0.15)
    # giữ nguyên phần TIỀN (histories, vốn đã theo năm chi trả), dựng lại CP/thưởng
    by = {}
    for r in cu:
        y = int(r.get("year") or 0)
        if y:
            by[y] = {"year": y, "cash": r.get("cash") or 0, "div": 0, "bonus": 0}
    for e in ev:
        t = e.get("eventTypeName") or ""
        desc = e.get("description") or ""
        is_bonus = "thưởng" in t.lower()
        is_div = bool(RX_DIVCP.search(t))
        if not is_bonus and not is_div:
            continue
        m = RX_RATIO.search(desc)
        ex = (e.get("exDividendDate") or "").split("/")
        if not m or len(ex) != 3 or not ex[2].isdigit():
            continue
        y = int(ex[2])                            # NĂM CHỐT QUYỀN cho mọi loại
        pct = num(m.group(2)) / num(m.group(1)) * 100
        r = by.setdefault(y, {"year": y, "cash": 0, "div": 0, "bonus": 0})
        r["bonus" if is_bonus else "div"] += pct
    out = sorted(by.values(), key=lambda r: -r["year"])
    for r in out:
        r["div"] = round(r["div"], 1)
        r["bonus"] = round(r["bonus"], 1)
    if out == cu:
        with lock: stats["nguyen"] += 1
        return
    if not THU:
        d["div"] = out
        tmp = p + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, p)
    with lock:
        stats["sua"] += 1
        if stats["sua"] <= 3:
            print(f"  {sym}: {[(r['year'],r['div'],r['bonus']) for r in cu if r['div'] or r['bonus']]}"
                  f"  ->  {[(r['year'],r['div'],r['bonus']) for r in out if r['div'] or r['bonus']]}")


def main():
    syms = sorted(os.path.basename(p)[:-5] for p in glob.glob(os.path.join(FIN, "*.json")))
    print(f"{'THỬ — không ghi' if THU else 'VÁ THẬT'} · {len(syms)} mã")
    t0 = time.time()
    with cf.ThreadPoolExecutor(max_workers=4) as pool:   # Simplize: 4 luồng là ngưỡng an toàn
        for i, _ in enumerate(pool.map(viec, syms), 1):
            if i % 300 == 0:
                print(f"  {i}/{len(syms)}…")
    print(f"\nsửa {stats['sua']} · giữ nguyên {stats['nguyen']} · lỗi nguồn {stats['hong']}"
          f" · {time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
