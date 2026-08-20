"""BỘ TỔNG HỢP CHO TRANG PHÂN TÍCH — `data/giaodich/*` -> `data/phantich.json` + `data/phien/*`.

CHIA THEO NGÀY, KHÔNG GỘP MỘT CỤC (user chốt 20/08/2026: *"nên phân ra theo ngày rõ ràng
cho tao dễ nhìn dễ đối chiếu dễ phân tích"*).

· `data/phantich.json` — NHẸ, trang tải ngay: chỉ CHUỖI TOÀN THỊ TRƯỜNG theo phiên. Đơn vị
  tiền là TỶ đồng, khối lượng là NGHÌN cổ phiếu.
· `data/phien/{NGÀY}.json` — MỘT FILE MỖI PHIÊN, tải khi người dùng chọn phiên đó. Chứa
  `bang` (bảng mã của phiên: giá, giá TB, giá trị khớp lệnh, giá trị thoả thuận, khối
  lượng) và `ma` (vùng giá khớp lệnh + phân bổ dòng tiền, do `kho_giaodich.py --vg` ghi).
  Hai khối ghi bởi hai lượt khác nhau nên phải TRỘN chứ đừng ghi đè.

TIỀN CHỨ KHÔNG PHẢI CỔ PHIẾU (user chốt 20/08/2026: *"nhiều cổ phiếu khớp nhiều nhưng thực
tế chỉ vài trăm triệu nếu quy ra tiền"*). Bảng mã vì thế xếp mặc định theo GIÁ TRỊ khớp
lệnh, và khối lượng chỉ còn là cột phụ.

KHÔNG ĐƯA KHỐI LƯỢNG ĐẶT MUA / ĐẶT BÁN VÀO BẢNG (user chốt: *"chỉ làm nhiễu"*). Kho
`data/giaodich` vẫn lưu đủ `qMua`/`qBan`/`nMua`/`nBan` — chỉ là trang không hiện. Muốn bật
lại thì thêm vào `COT_BANG`, khỏi phải cào lại.

BA LUẬT ĐẾM, phá cái nào cũng ra số sai mà trông vẫn hợp lý
-----------------------------------------------------------
1. **CHỈ CỘNG MÃ CÓ SỐ CỦA ĐÚNG PHIÊN ĐÓ**, và ghi kèm `n` = số mã góp vào. Kho bồi dần nên
   mỗi phiên phủ khác nhau; không nói ra thì đường giá trị giao dịch dốc lên chỉ vì kho dày
   lên, mà đọc thành "thị trường sôi động dần".
2. **VỐN HOÁ CHỈ TÍNH KHI CÓ `sh`.** Coi trống là 0 thì vốn hoá thị trường tụt một bậc.
3. **PHIÊN QUÁ THƯA THÌ ĐỪNG GHI FILE NGÀY.** Dưới `MIN_MA` mã thì bảng của phiên đó không
   đại diện cho gì cả — thà không có còn hơn có một bảng 30 mã trông như cả thị trường.
"""

import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
PHIEN = os.path.join(BASE, "data", "phien")
UNI = os.path.join(BASE, "universe.json")
RA = os.path.join(BASE, "data", "phantich.json")

# Cột của bảng theo mã — TIỀN đứng trước, khối lượng là phụ.
COT_BANG = ["ex", "c", "tc", "vwap", "mval", "pval", "mv", "pv", "sh"]
SO_PHIEN_FILE = 120      # dựng file ngày cho ngần này phiên gần nhất
MIN_MA = 100             # phiên ít mã hơn thì không dựng file ngày


def main():
    u = json.load(open(UNI, encoding="utf-8"))["stocks"]
    san = {s["sym"]: s.get("ex") or "" for s in u}

    tt = {}                 # ngày -> tổng toàn thị trường
    bang = {}               # ngày -> {mã: [cột…]}
    doc = 0

    for s in u:
        m = s["sym"]
        p = os.path.join(GD, m + ".json")
        if not os.path.exists(p):
            continue
        try:
            o = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        doc += 1
        n = o.get("n") or 0
        d = o.get("d") or []
        if not d:
            continue
        col = {k: (o.get(k) or [None] * n) for k in COT_BANG if k != "ex"}

        for i, ng in enumerate(d):
            c, mval, pval = col["c"][i], col["mval"][i], col["pval"][i]
            t = tt.setdefault(ng, {"n": 0, "mval": 0.0, "pval": 0.0, "mv": 0, "pv": 0,
                                   "mcap": 0.0, "nMcap": 0})
            t["n"] += 1
            t["mval"] += mval or 0
            t["pval"] += pval or 0
            t["mv"] += col["mv"][i] or 0
            t["pv"] += col["pv"][i] or 0
            sh = col["sh"][i]
            if sh and c:
                t["mcap"] += c * sh
                t["nMcap"] += 1
            bang.setdefault(ng, {})[m] = [san.get(m, "")] + \
                [col[k][i] for k in COT_BANG if k != "ex"]

    ngays = sorted(tt)
    if not ngays:
        print("  chưa có dữ liệu trong data/giaodich", flush=True)
        return 0

    # ── file ngày ──
    os.makedirs(PHIEN, exist_ok=True)
    ghi = bo = 0
    for ng in ngays[-SO_PHIEN_FILE:]:
        r = bang.get(ng) or {}
        if len(r) < MIN_MA:
            bo += 1
            continue
        p = os.path.join(PHIEN, ng + ".json")
        cu = {}
        if os.path.exists(p):
            try:
                cu = json.load(open(p, encoding="utf-8"))
            except Exception:
                cu = {}
        # TRỘN: khối `ma` (vùng giá) do `kho_giaodich --vg` ghi, đừng xoá mất.
        cu["date"] = ng
        cu["f"] = COT_BANG
        cu["bang"] = r
        cu["n"] = len(r)
        tmp = p + ".tmp"
        json.dump(cu, open(tmp, "w", encoding="utf-8"), ensure_ascii=False,
                  separators=(",", ":"))
        os.replace(tmp, p)
        ghi += 1

    # ── chuỗi toàn thị trường ──
    for d in ngays:
        t = tt[d]
        for k in ("mval", "pval", "mcap"):
            t[k] = round(t[k] / 1e9, 1)
        for k in ("mv", "pv"):
            t[k] = round(t[k] / 1e3)
    out = {
        "date": ngays[-1],
        "phu": {"docFile": doc, "phien": len(ngays), "fileNgay": ghi},
        "tt": {"d": ngays,
               **{k: [tt[d][k] for d in ngays]
                  for k in ("n", "mval", "pval", "mv", "pv", "mcap", "nMcap")}},
    }
    tmp = RA + ".tmp"
    json.dump(out, open(tmp, "w", encoding="utf-8"), ensure_ascii=False,
              separators=(",", ":"))
    os.replace(tmp, RA)

    i = len(ngays) - 1
    print(f"  đọc {doc:,} file · {len(ngays):,} phiên · file ngày: ghi {ghi}, bỏ {bo} (dưới {MIN_MA} mã)"
          f" · phantich.json {os.path.getsize(RA)/1024:,.0f} KB", flush=True)
    print(f"  phiên {ngays[i]}: {out['tt']['n'][i]:,} mã · khớp lệnh {out['tt']['mval'][i]:,.0f} tỷ"
          f" · thoả thuận {out['tt']['pval'][i]:,.0f} tỷ"
          f" · vốn hoá {out['tt']['mcap'][i]/1000:,.0f} nghìn tỷ", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
