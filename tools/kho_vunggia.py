# -*- coding: utf-8 -*-
"""VÙNG GIÁ KHỚP LỆNH TỪ VNDIRECT — thay `kho_giaodich.py --vg` trong lượt EOD.

VÌ SAO ĐỔI NGUỒN (22/08/2026)
-----------------------------
User chốt: *"cái nào có thể thay bằng VNDirect được thì thay hết"*, và mục tiêu là lượt EOD
xong trong ~15 phút. Vùng giá là bước Vietstock tốn nhiều lượt nhất còn lại:

    Vietstock  2 lượt/mã (nến 1 phút + phân bổ dòng tiền) · trần 4 lượt/giây  -> 8,1 phút
    VNDirect   1 lượt/mã (nến 1 phút)                     · trần 12 lượt/giây -> ~1 phút

`dchart-api.vndirect.com.vn/dchart/history?resolution=1` trả đúng nến 1 phút (HPG phiên
21/08: 226 nến, y hệt số nến Vietstock cho).

ĐỐI CHIẾU TRƯỚC KHI ĐỔI — 3 mã, phiên 21/08:

    mã    mức giá Vietstock  mức giá VNDirect  mức TRÙNG   lệch khối lượng
    HPG          13                 13             13          +4,51%
    VNM           8                  8              8          +0,06%
    SSI          19                 19             19          −0,01%

**Trùng TOÀN BỘ mức giá ở cả ba mã** — đây mới là thứ vùng giá dùng để trả lời ("khối
lượng khớp ở giá nào"). HPG lệch 4,5% khối lượng vì nến 14:45 (phiên ATC) 2,43 triệu cp
được hai nguồn tính khác nhau; nó dịch chiều cao cột chứ không đổi mức giá nào.

MẤT GÌ KHI ĐỔI: khối **phân bổ dòng tiền** (`cf` — giá trị khớp tách theo hướng giá của
từng lệnh). Nó đi kèm miễn phí ở endpoint TỪNG LỆNH của Vietstock; VNDirect không có dữ
liệu từng lệnh nên **không dựng lại được**. Đừng thử suy từ nến 1 phút: trong một phút có
nhiều lệnh khớp ở nhiều giá, so hai nến liền nhau ra một đại lượng KHÁC HẲN mà lại trông
giống — đúng loại số sai không ai phát hiện được. Thà bỏ hẳn.

BA CÁI BẪY
----------
1. **ĐƠN VỊ.** dchart trả NGHÌN ĐỒNG (21.1 = 21.100đ) — nhưng đừng nhân cứng 1000: dò bằng
   chính biên độ `l`..`h` của phiên đó trong kho. Mã nào không dò được thì BỎ, đừng ghi bừa
   (VNZ 555k và HLB 505k rơi đúng biên nếu đoán theo ngưỡng — bài học cũ của dự án).
2. **FILE PHIÊN CÓ NHIỀU CHỦ.** `bang`/`la`/`dt` do bước khác ghi. Phải đọc TRỌN file rồi
   chỉ thay khối `ma` — ghi đè cả file là xoá sạch mấy khối kia, đúng lỗi đã trả giá
   21/08/2026 (`phien_ghi`).
3. **CỬA SỔ THỜI GIAN THEO GIỜ VN.** `from`/`to` là mốc UNIX; lấy nguyên ngày theo UTC+7,
   đừng dùng giờ máy — máy chủ chạy múi giờ khác là lệch cả phiên.

    python3 tools/kho_vunggia.py                   # phiên mới nhất trong kho
    python3 tools/kho_vunggia.py --ngay 2026-08-21
    python3 tools/kho_vunggia.py --sanmin 0        # lấy mọi mã có khớp lệnh
"""
import datetime
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
PHIEN = os.path.join(BASE, "data", "phien")
API = "https://dchart-api.vndirect.com.vn/dchart/history"
TZ = datetime.timezone(datetime.timedelta(hours=7))

# NGƯỠNG THANH KHOẢN. Phiên 21/08 có 966 mã khớp lệnh nhưng chỉ 525 mã khớp trên 100 triệu.
# Vùng giá của một mã khớp vài chục triệu là hai ba cái cột — không nói được gì, mà vẫn tốn
# đúng một lượt gọi. Hạ về 0 nếu muốn lấy hết.
SAN_MIN = 100_000_000
LUONG = 6


def _so(av, ten, md):
    if ten in av:
        i = av.index(ten)
        if i + 1 < len(av):
            try:
                return int(float(av[i + 1]))
            except ValueError:
                pass
    return md


AV = sys.argv[1:]
SAN_MIN = _so(AV, "--sanmin", SAN_MIN)
NGAY = None
if "--ngay" in AV:
    i = AV.index("--ngay")
    if i + 1 < len(AV):
        NGAY = AV[i + 1]


def moc(ngay):
    """(from, to) UNIX cho trọn ngày phiên theo GIỜ VN (bẫy 3)."""
    d = datetime.datetime.strptime(ngay, "%Y-%m-%d").replace(tzinfo=TZ)
    return int(d.timestamp()), int((d + datetime.timedelta(days=1)).timestamp())


def vung_gia(sym, t1, t2, lo, hi):
    """Gộp khối lượng theo mức giá. `lo`/`hi` là biên độ phiên đó trong kho, để dò đơn vị."""
    u = "%s?symbol=%s&resolution=1&from=%d&to=%d" % (API, sym, t1, t2)
    try:
        j = json.loads(nhipmang.get(u, timeout=40))
    except Exception:
        return None
    if (j.get("s") or "") != "ok":
        return {}
    cs, vs = j.get("c") or [], j.get("v") or []
    if not cs:
        return {}
    # ── DÒ ĐƠN VỊ BẰNG CHÍNH BIÊN ĐỘ PHIÊN (bẫy 1) ──
    tb = sorted(cs)[len(cs) // 2]
    hs = None
    for x in (1.0, 1000.0):
        if lo * 0.97 <= tb * x <= hi * 1.03:
            hs = x
            break
    if hs is None:
        return None
    gom = {}
    for c, v in zip(cs, vs):
        g = round((c or 0) * hs)
        v = int(v or 0)
        if g > 0 and v > 0:
            gom[g] = gom.get(g, 0) + v
    if not gom:
        return {}
    gia = sorted(gom)
    return {"p": gia, "v": [gom[g] for g in gia]}


def main():
    ten = sorted(f for f in os.listdir(GD) if f.endswith(".json"))
    ngay = NGAY
    if not ngay:
        for f in ten[:40]:
            d = (json.load(open(os.path.join(GD, f), encoding="utf-8")).get("d") or [])
            if d:
                ngay = max(ngay or "", d[-1])
    if not ngay:
        print("  không xác định được phiên"); return
    t1, t2 = moc(ngay)

    # ── CHỌN MÃ: có khớp lệnh phiên đó và đạt ngưỡng thanh khoản ──
    viec = []
    for f in ten:
        try:
            g = json.load(open(os.path.join(GD, f), encoding="utf-8"))
        except Exception:
            continue
        d = g.get("d") or []
        if not d or d[-1] != ngay:
            continue
        i = len(d) - 1
        lay = lambda k: (g.get(k) or [None] * len(d))[i] if len(g.get(k) or []) == len(d) else None
        mval, lo, hi = lay("mval"), lay("l"), lay("h")
        if not mval or mval < SAN_MIN or not lo or not hi:
            continue
        viec.append((f[:-5], lo, hi))

    print("  phiên %s · %d mã khớp ≥ %s đ · %d lượt gọi"
          % (ngay, len(viec), format(SAN_MIN, ","), len(viec)), flush=True)

    ra = {}
    dem = {"ok": 0, "rong": 0, "hong": 0, "don_vi": 0}
    kd = threading.Lock()
    t0 = time.time()

    def chay(x):
        sym, lo, hi = x
        vg = vung_gia(sym, t1, t2, lo, hi)
        with kd:
            if vg is None:
                dem["don_vi" if lo else "hong"] += 1
            elif not vg:
                dem["rong"] += 1
            else:
                ra[sym] = vg
                dem["ok"] += 1
            n = sum(dem.values())
            if n % 100 == 0:
                print("    …%d/%d  %.0fs" % (n, len(viec), time.time() - t0), flush=True)

    with ThreadPoolExecutor(max_workers=LUONG) as ex:
        list(ex.map(chay, viec))

    # ── GHI: ĐỌC TRỌN FILE RỒI CHỈ THAY KHỐI `ma` (bẫy 2) ──
    p = os.path.join(PHIEN, ngay + ".json")
    doc = {}
    if os.path.exists(p):
        try:
            doc = json.load(open(p, encoding="utf-8"))
        except Exception:
            doc = {}
    cu = doc.get("ma") or {}
    cu.update(ra)
    doc["date"] = ngay
    doc["ma"] = cu
    doc["nVG"] = len(cu)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)

    muc = sum(len(v["p"]) for v in ra.values())
    print("  xong %.1f phút · ok %d · rỗng %d · không dò được đơn vị %d · hỏng %d"
          % ((time.time() - t0) / 60, dem["ok"], dem["rong"], dem["don_vi"], dem["hong"]))
    print("  file %s: %d mã có vùng giá · %d mức giá · %d KB"
          % (ngay, len(cu), muc, os.path.getsize(p) // 1024))


if __name__ == "__main__":
    main()
