#!/usr/bin/env python3
"""
CHỦ ĐIỂM ĐẦU TƯ (nguồn SSI Research) -> data/chudiem.json

HAI TẦNG, KHÁC HẲN NHAU VỀ CÁCH SỐNG — đừng nhầm:

  TẦNG 1 · SƠ ĐỒ CHỦ ĐIỂM — VIẾT TAY, bảng `SO_DO` ngay dưới đây.
    Đã dò hết các cửa: `iboard-api.ssi.com.vn/research/*` trả 401 (đòi đăng nhập),
    `api.ssi.com.vn/research/*` trả 404, trang báo cáo phân tích của ssi.com.vn chặn
    truy cập máy, và API báo cáo của Simplize BẮT BUỘC có mã (`ticker=` rỗng trả 0 bản
    ghi) nên không lấy được báo cáo chiến lược toàn thị trường. Sơ đồ này nằm trong một
    slide báo cáo chiến lược, KHÔNG có bản dữ liệu công khai nào. Vì vậy nó phải nhập
    tay và **phải ghi rõ kỳ báo cáo** — SSI ra bản mới thì sửa đúng bảng này.

  TẦNG 2 · KHUYẾN NGHỊ TỪNG MÃ CỦA SSI — TỰ CẬP NHẬT mỗi phiên.
    Rút từ `data/news/{MÃ}.json` (bước 7 của refresh_daily đã cào sẵn): khuyến nghị,
    giá mục tiêu, ngày ra báo cáo, đường dẫn PDF. Đây mới là phần sống theo thời gian,
    và nó cũng do chính SSI phát hành nên đứng chung một mục là hợp lẽ.

GHI NGUỒN LÀ BẮT BUỘC, KHÔNG PHẢI TRANG TRÍ: đây là ý kiến khuyến nghị đầu tư của một
đơn vị có giấy phép. Trang chỉ dẫn lại. Mọi trường `nguon`/`ky` phải đi tới giao diện,
không được rút gọn cho đẹp.

  python3 tools/build_chudiem.py
"""
import json, os, glob, datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "data", "chudiem.json")
NEWS = os.path.join(BASE, "data", "news")

# ---------------------------------------------------------------------------
# SƠ ĐỒ SSI — PHẦN DUY NHẤT VIẾT TAY. Ba trục, mã nằm ở giao điểm nào thì khai đủ
# các trục đó; giao ba trục là "trọng tâm". `ky` = kỳ báo cáo, để trống thì giao diện
# không bịa ra ngày.
# ---------------------------------------------------------------------------
NGUON = {
    "nguon": "SSI Research",
    "ten": "Chủ điểm đầu tư",
    "ky": "",                       # <-- điền kỳ/tên báo cáo khi biết, vd "Chiến lược 8/2026"
}
TRUC = [
    {"id": "tt", "ten": "Tăng trưởng lợi nhuận", "mau": "#16c784"},
    {"id": "nh", "ten": "Hưởng lợi từ nâng hạng", "mau": "#38bdf8"},
    {"id": "dg", "ten": "Định giá hấp dẫn", "mau": "#f5b40a"},
]
SO_DO = {
    "HPG": ["tt", "nh", "dg"],
    "VCB": ["nh", "dg"], "VPB": ["nh", "dg"],
    "DPR": ["tt", "dg"], "PVT": ["tt", "dg"],
    "MSN": ["tt", "nh"],
    "SSI": ["nh"], "FPT": ["nh"], "VHM": ["nh"], "BID": ["nh"], "MCH": ["nh"],
    "MWG": ["tt"], "DGW": ["tt"],
    "PLX": ["dg"], "NT2": ["dg"], "DCM": ["dg"],
}


def _ngay(d):
    """'27/05/2026' -> '2026-05-27' để so sánh và xếp thứ tự được."""
    p = str(d or "").split("/")
    return f"{p[2]}-{p[1]}-{p[0]}" if len(p) == 3 else ""


def khuyen_nghi_ssi():
    """Bản SSI MỚI NHẤT của từng mã, rút từ kho tin/báo cáo."""
    ra = {}
    for p in glob.glob(os.path.join(NEWS, "*.json")):
        try: d = json.load(open(p, encoding="utf-8"))
        except Exception: continue
        tot = None
        for r in d.get("reports") or []:
            if (r.get("source") or "") != "SSI": continue
            n = _ngay(r.get("date"))
            if not n: continue
            if not tot or n > tot["d"]:
                tot = {"d": n, "kn": (r.get("rec") or "").strip(),
                       "tp": r.get("target"), "td": (r.get("title") or "").strip()[:110],
                       "pdf": r.get("pdf") or ""}
        if tot: ra[d.get("sym") or os.path.basename(p)[:-5]] = tot
    return ra


def main():
    uni = json.load(open(os.path.join(BASE, "universe.json"), encoding="utf-8"))
    U = {s["sym"]: s for s in uni["stocks"]}
    kn = khuyen_nghi_ssi()

    thieu = [m for m in SO_DO if m not in U]
    if thieu:
        # mã trong sơ đồ mà kho không có -> giao diện sẽ hiện ô trống, nói ra ngay
        print(f"  ! {len(thieu)} mã trong sơ đồ không có trong kho: {', '.join(thieu)}")

    ma = []
    for m, tr in SO_DO.items():
        o = {"s": m, "truc": tr}
        if m in kn: o["ssi"] = kn[m]
        ma.append(o)
    # trọng tâm (đủ 3 trục) lên trước, rồi giao 2 trục, rồi đơn lẻ
    ma.sort(key=lambda x: (-len(x["truc"]), x["s"]))

    out = dict(NGUON)
    out.update({"generated": datetime.date.today().isoformat(),
                "truc": TRUC, "ma": ma, "knSSI": kn})
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    lo = [x for x in ma if len(x["truc"]) == 3]
    print(f"✓ data/chudiem.json: {len(ma)} mã trong sơ đồ ({len(lo)} trọng tâm đủ 3 trục) · "
          f"khuyến nghị SSI toàn thị trường: {len(kn)} mã")
    for x in ma[:6]:
        k = x.get("ssi") or {}
        print(f"   {x['s']:5s} {'+'.join(x['truc']):12s} {k.get('kn','—'):10s} "
              f"TP={k.get('tp') or '—'} {k.get('d','')}")


if __name__ == "__main__":
    main()
