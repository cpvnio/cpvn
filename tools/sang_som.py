#!/usr/bin/env python3
"""
LƯỢT CHẠY TRƯỚC PHIÊN (~7h30) — làm mới thứ ĐỔI QUA ĐÊM, và tự tố nếu có gì sai.

Vì sao cần một lượt riêng chứ không đợi 15:15: có những thứ đổi ĐÚNG lúc mở cửa và sai thì
khách thấy ngay từ phút đầu, trong khi lượt EOD phải tới chiều mới chữa được.

  ① SỐ CỔ PHIẾU LƯU HÀNH. Ngày GDKHQ, nguồn hạ nền giá NGAY nhưng số cổ phiếu thì vài ngày
     sau mới cập nhật. Trang tính vốn hoá = SLCP × giá sống, nên trong khoảng đó vốn hoá
     tụt đúng bằng tỉ lệ chia — im lặng. Đo 19/08/2026: SSI −15,4%, CTI −7,8%, BID −6,7%.
     Chạy trước phiên thì bắt được ngay ngày nguồn cập nhật, thay vì chờ tới chiều.
  ② TỰ TỐ. Đối chiếu vốn hoá tự tính với vốn hoá Simplize; lệch quá ngưỡng thì IN RA. Đây
     là thứ duy nhất lộ ra khi nguồn đổi sơ đồ hoặc khi một mã chia tách kiểu lạ.

KHÔNG đụng giá, không đụng kho nến — hai thứ đó có đường riêng (gia_phien.py và
refresh_daily.py). File này chỉ sửa `universe.json`.

  python3 tools/sang_som.py            # làm thật
  python3 tools/sang_som.py --thu      # chỉ báo cáo, không ghi
"""
import json, os, sys, time, collections, concurrent.futures, threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNI = os.path.join(BASE, "universe.json")
BOARD = os.path.join(BASE, "data", "board.json")
SZ = "https://api2.simplize.vn/api/company/summary/"
LUONG = 4                 # nhipmang đã kẹp Simplize 8 lượt/giây; 4 luồng là vừa
NGUONG_BAO = 3.0          # lệch quá 3% thì kêu — dưới mức đó là chênh giá chốt hai bên
THU = "--thu" in sys.argv

lock = threading.Lock()
kq = collections.Counter()
doi = []


def jdump(o, p):
    tmp = p + ".tmp"
    json.dump(o, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)


def mot(s):
    try:
        d = json.loads(nhipmang.get(SZ + s["sym"], timeout=25)).get("data") or {}
    except Exception:
        with lock: kq["loi"] += 1
        return
    slcp, mc = d.get("outstandingSharesValue"), d.get("marketCap")
    with lock:
        # CHỈ GHI ĐÈ BẰNG GIÁ TRỊ KHÁC None — cùng luật với refresh_daily: nguồn hụt một
        # lượt thì giữ số cũ, đừng xoá trắng thứ đang đúng.
        if slcp:
            if s.get("shares") and abs(slcp / s["shares"] - 1) > 1e-6:
                doi.append((s["sym"], s["shares"], slcp))
                kq["doi"] += 1
            s["shares"] = slcp
        if mc: s["mcap"] = mc
        kq["ok"] += 1


def main():
    u = json.load(open(UNI, encoding="utf-8"))
    stocks = u["stocks"]
    print(f"  {len(stocks)} mã · làm mới SLCP + vốn hoá từ Simplize"
          + ("  [CHẠY THỬ]" if THU else ""))
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=LUONG) as ex:
        list(ex.map(mot, stocks))
    print(f"  xong {time.time()-t0:.0f}s · ok {kq['ok']} · lỗi {kq['loi']} · SLCP đổi {kq['doi']}")

    for sym, cu, moi in sorted(doi, key=lambda x: -abs(x[2] / max(x[1], 1) - 1))[:20]:
        print(f"    {sym:<6} {cu:>16,.0f} -> {moi:>16,.0f}   ×{moi/max(cu,1):.4f}")

    # ② TỰ TỐ: vốn hoá tự tính (SLCP × giá phiên gần nhất) so với vốn hoá Simplize
    try:
        b = {r["sym"]: r for r in json.load(open(BOARD, encoding="utf-8"))["rows"]}
    except Exception:
        b = {}
    lech = []
    for s in stocks:
        r = b.get(s["sym"])
        if not r or not s.get("shares") or not s.get("mcap"): continue
        try: gia = float(r.get("lastPrice") or 0) * 1000
        except Exception: continue
        if gia <= 0: continue
        tu = s["shares"] * gia
        d = (tu / s["mcap"] - 1) * 100
        if abs(d) > NGUONG_BAO: lech.append((s["sym"], tu, s["mcap"], d))
    print(f"\n  TỰ TỐ — vốn hoá tự tính vs Simplize: {len(lech)} mã lệch quá {NGUONG_BAO}%")
    for sym, tu, mc, d in sorted(lech, key=lambda x: -abs(x[3]))[:15]:
        print(f"    {sym:<6}{tu/1e9:>14,.0f} tỷ{mc/1e9:>14,.0f} tỷ{d:>9.1f}%")
    if len(lech) > 15: print(f"    … còn {len(lech)-15} mã")

    if not THU and kq["ok"]:
        jdump(u, UNI)
        print("\n  đã ghi universe.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
