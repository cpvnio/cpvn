#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dựng assets/worldmap.json — hình dạng các nước cho mục "Bức tranh toàn cầu".

CHẠY MỘT LẦN, KHÔNG nằm trong pipeline hằng ngày: biên giới quốc gia không đổi theo
phiên giao dịch. Chỉ chạy lại khi muốn đổi phép chiếu, đổi độ mượt, hay thêm nước.

    python3 tools/build_worldmap.py [đường-dẫn-ne_110m_admin_0_countries.geojson]

Không truyền đường dẫn thì tự tải từ kho Natural Earth (dữ liệu PHẠM VI CÔNG CỘNG —
public domain, không đòi ghi nguồn, nhưng vẫn ghi trong này cho minh bạch:
https://github.com/nvkelso/natural-earth-vector). File thô ~840KB KHÔNG được đưa vào
kho — chỉ đưa bản đã xử lý, nhỏ hơn cả chục lần.

PHÉP CHIẾU: EQUAL EARTH (Šavrič–Patterson–Jenny 2018), công thức đóng nên không cần
thư viện nào. Chọn nó vì đây là bản đồ TÔ MÀU: Mercator phóng Greenland to hơn châu Phi
và kéo Nga chiếm nửa bản đồ, mắt đọc thành "cả thế giới đang đỏ" trong khi mấy khối đó
không có sàn nào đáng kể. Equal Earth giữ đúng tỉ lệ diện tích mà nhìn vẫn thuận mắt.
"""
import json, math, os, sys, urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NGUON = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
         "master/geojson/ne_110m_admin_0_countries.geojson")
RA = os.path.join(BASE, "assets", "worldmap.json")

W = 1000.0          # bề rộng quy ước; client tự co giãn theo viewBox
DUNG = 0.55         # ngưỡng làm mượt (px ở bề rộng 1000) — dưới nữa thì file phình vô ích
NHO = 1.2           # bỏ đảo nhỏ hơn ngần này (px²); nước nào cũng giữ lại ít nhất mảnh to nhất
BO = {"AQ"}         # bỏ Nam Cực: ăn 1/4 chiều cao mà không có sàn giao dịch nào

# Nước quá nhỏ để 110m vẽ ra được -> client chấm một chấm tròn tại đây.
# Toạ độ đặt tay ở trung tâm tài chính, không phải trọng tâm lãnh thổ.
CHAM = {"HK": (114.17, 22.32), "SG": (103.82, 1.35)}

A1, A2, A3, A4 = 1.340264, -0.081106, 0.000893, 0.003796
M = math.sqrt(3) / 2


def chieu(lon, lat):
    """Equal Earth: (kinh độ, vĩ độ) độ -> (x, y) trong hệ toạ độ phép chiếu."""
    lam = math.radians(lon)
    th = math.asin(M * math.sin(math.radians(lat)))
    t2 = th * th
    t6 = t2 * t2 * t2
    x = lam * math.cos(th) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)))
    y = th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2))
    return x, y


def _dp(pts):
    """Douglas–Peucker cho một đường HỞ. Vòng lặp thay cho đệ quy: một số nước có vài
    nghìn điểm liền mạch, đệ quy sâu là tràn ngăn xếp ngay."""
    if len(pts) < 3:
        return pts
    giu = [False] * len(pts)
    giu[0] = giu[-1] = True
    ngan = [(0, len(pts) - 1)]
    while ngan:
        i, j = ngan.pop()
        if j <= i + 1:
            continue
        ax, ay = pts[i]
        bx, by = pts[j]
        dx, dy = bx - ax, by - ay
        do = math.hypot(dx, dy) or 1e-12
        xa, k = -1.0, -1
        for t in range(i + 1, j):
            px, py = pts[t]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / do
            if d > xa:
                xa, k = d, t
        if xa > DUNG and k > 0:
            giu[k] = True
            ngan.append((i, k))
            ngan.append((k, j))
    return [p for p, g in zip(pts, giu) if g]


def mot_vong(pts):
    """Làm mượt một VÒNG KHÉP KÍN.

    Không gọi thẳng _dp được: vòng của GeoJSON có điểm cuối TRÙNG điểm đầu, nên đoạn
    thẳng gốc mà Douglas–Peucker lấy làm mốc dài đúng 0 — mọi khoảng cách tính ra 0,
    không điểm nào vượt ngưỡng, và cả nước bị rút còn 2 điểm. Đã dính đúng vậy: lượt
    chạy đầu ra "0 nước".
    Cách chữa chuẩn: bỏ điểm khép trùng, lấy điểm XA điểm đầu nhất cắt vòng thành hai
    đường hở, làm mượt từng đường rồi nối lại — hai mốc nằm hai đầu đường kính nên
    không đoạn nào suy biến nữa.
    """
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    n = len(pts)
    if n < 4:
        return pts
    ax, ay = pts[0]
    m = max(range(1, n), key=lambda i: (pts[i][0] - ax) ** 2 + (pts[i][1] - ay) ** 2)
    a = _dp(pts[:m + 1])
    b = _dp(pts[m:] + [pts[0]])
    return a[:-1] + b[:-1]          # bỏ điểm nối trùng ở mỗi nửa; path dùng "Z" tự khép


def dien_tich(pts):
    s = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else None
    if src:
        gj = json.load(open(src, encoding="utf-8"))
    else:
        print("tải Natural Earth 110m…", flush=True)
        with urllib.request.urlopen(NGUON, timeout=180) as r:
            gj = json.loads(r.read().decode("utf-8"))

    # ---- gom vòng của từng nước, đã chiếu ----
    nuoc = {}
    for f in gj["features"]:
        p = f["properties"]
        a2 = p.get("ISO_A2_EH") or p.get("ISO_A2") or ""
        if a2 in ("-99", "", None) or a2 in BO:
            continue
        g = f.get("geometry") or {}
        tho = ([g["coordinates"]] if g.get("type") == "Polygon"
               else g.get("coordinates") or [])
        vong = []
        for poly in tho:
            if not poly:
                continue
            vong.append([chieu(x, y) for x, y in poly[0]])   # chỉ viền ngoài, bỏ lỗ
        if vong:
            nuoc.setdefault(a2, {"nm": p.get("NAME"), "v": []})["v"] += vong

    # ---- khung bao chung rồi mới quy về pixel, để mọi nước dùng CHUNG một thước ----
    xs = [x for d in nuoc.values() for v in d["v"] for x, _ in v]
    ys = [y for d in nuoc.values() for v in d["v"] for _, y in v]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    k = W / (x1 - x0)
    H = (y1 - y0) * k
    px = lambda x, y: ((x - x0) * k, H - (y - y0) * k)     # lật trục y cho đúng chiều màn hình

    out = {}
    for a2, d in nuoc.items():
        manh = []
        for v in d["v"]:
            q = mot_vong([px(x, y) for x, y in v])
            if len(q) >= 3:
                manh.append((dien_tich(q), q))
        if not manh:
            continue
        manh.sort(key=lambda t: -t[0])
        giu = [manh[0]] + [m for m in manh[1:] if m[0] >= NHO]   # luôn giữ mảnh to nhất
        dd = "".join("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in q) + "Z" for _, q in giu)
        # tâm để đặt nhãn/chấm: trọng tâm MẢNH TO NHẤT, không phải trung bình mọi mảnh —
        # lấy trung bình thì tâm nước Mỹ rơi ra giữa Thái Bình Dương vì có Hawaii/Alaska.
        to = giu[0][1]
        out[a2] = {"d": dd, "nm": d["nm"],
                   "cx": round(sum(p[0] for p in to) / len(to), 1),
                   "cy": round(sum(p[1] for p in to) / len(to), 1)}

    cham = {}
    for a2, (lon, lat) in CHAM.items():
        x, y = px(*chieu(lon, lat))
        cham[a2] = {"cx": round(x, 1), "cy": round(y, 1)}

    doc = {"w": round(W), "h": round(H), "cham": cham, "c": out,
           "nguon": "Natural Earth (public domain) · phép chiếu Equal Earth"}
    os.makedirs(os.path.dirname(RA), exist_ok=True)
    tmp = RA + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, RA)
    kb = os.path.getsize(RA) / 1024
    print(f"ĐÃ GHI {RA} — {len(out)} nước + {len(cham)} chấm, "
          f"khung {doc['w']}×{doc['h']}, {kb:.0f} KB")


if __name__ == "__main__":
    main()
