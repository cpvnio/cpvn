"""BỘ TỔNG HỢP CHO TRANG PHÂN TÍCH DỮ LIỆU — `data/giaodich/*` -> `data/phantich.json`.

VÌ SAO PHẢI CÓ FILE GỘP
-----------------------
`data/giaodich` là 1.529 file, tổng vài trăm MB. Trang web không thể tải từng file, cũng
không nên tải cả kho. File này rút ra đúng phần một người phân tích cần nhìn TRƯỚC, rồi
mới quyết định đào sâu vào mã nào — cùng lối với `screen.json`/`market.json`.

HAI KHỐI
--------
· `tt` — CHUỖI TOÀN THỊ TRƯỜNG theo phiên: giá trị khớp lệnh, giá trị thoả thuận, khối
  lượng đặt mua/đặt bán, số lệnh mua/bán, và vốn hoá toàn thị trường.
  ĐƠN VỊ: tiền = TỶ đồng, khối lượng = NGHÌN cổ phiếu. Bảng theo mã thì giữ ĐỒNG và
  CỔ PHIẾU như trong kho — hai khối hai đơn vị, đừng trộn.
· `ma` — MỖI MÃ MỘT DÒNG cho phiên gần nhất, kèm mấy tỉ lệ tính sẵn. Dạng CỘT
  (`f` = tên trường, `d[MÃ]` = mảng giá trị cùng thứ tự) y như `screen.json`, cho gọn.

BA LUẬT ĐẾM, phá cái nào cũng ra số sai mà trông vẫn hợp lý
-----------------------------------------------------------
1. **CHỈ CỘNG MÃ CÓ SỐ CỦA ĐÚNG PHIÊN ĐÓ.** Kho đang được bồi dần nên mỗi mã có độ sâu
   khác nhau; cộng bừa là tổng toàn thị trường của phiên cũ tự nhiên nhỏ đi chỉ vì lúc ấy
   ít mã đã cào xong. Mỗi phiên vì thế ghi kèm `n` = số mã thực sự góp vào — **giao diện
   PHẢI hiện con số đó**, bằng không người đọc tưởng đang nhìn cả thị trường.
2. **VỐN HOÁ TOÀN THỊ TRƯỜNG CHỈ TÍNH KHI CÓ `sh`.** `sh` (số cổ phiếu) có thể trống ở
   quãng đầu chuỗi vì bị `bac_la` loại bỏ. Coi trống là 0 thì vốn hoá thị trường tụt một
   bậc mà không ai biết vì sao.
3. **SỔ LỆNH CHỈ CÓ TỪ ~09/2025.** Phiên nào không mã nào có `qMua` thì để `null` chứ
   đừng ghi 0 — 0 đọc ra là "không ai đặt lệnh", trong khi sự thật là "nguồn không có".
"""

import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
UNI = os.path.join(BASE, "universe.json")
RA = os.path.join(BASE, "data", "phantich.json")

# Cột của bảng theo mã. Tên ngắn vì lặp lại 1.529 lần trong file.
COT_MA = ["ex", "c", "vwap", "mv", "mval", "pv", "pval", "sh",
          "qMua", "qBan", "nMua", "nBan", "bMuaKL", "bBanKL"]


def main():
    u = json.load(open(UNI, encoding="utf-8"))["stocks"]
    san = {s["sym"]: s.get("ex") or "" for s in u}

    tt = {}          # ngày -> tổng
    dong = {}        # mã -> dòng của phiên gần nhất
    ngay_max = ""
    doc = sau = 0

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
        sau = max(sau, n)
        col = {k: (o.get(k) or [None] * n) for k in COT_MA if k != "ex"}

        for i, ng in enumerate(d):
            c, mval, pval = col["c"][i], col["mval"][i], col["pval"][i]
            t = tt.setdefault(ng, {"n": 0, "mval": 0.0, "pval": 0.0, "mv": 0, "pv": 0,
                                   "qMua": None, "qBan": None, "nMua": None, "nBan": None,
                                   "mcap": 0.0, "nMcap": 0})
            t["n"] += 1
            t["mval"] += mval or 0
            t["pval"] += pval or 0
            t["mv"] += col["mv"][i] or 0
            t["pv"] += col["pv"][i] or 0
            # LUẬT 2 — không có `sh` thì mã đó ĐỨNG NGOÀI phép cộng vốn hoá, đừng coi là 0.
            sh = col["sh"][i]
            if sh and c:
                t["mcap"] += c * sh
                t["nMcap"] += 1
            # LUẬT 3 — sổ lệnh chỉ có từ ~09/2025; None nghĩa là nguồn không có.
            for k in ("qMua", "qBan", "nMua", "nBan"):
                v = col[k][i]
                if v is not None:
                    t[k] = (t[k] or 0) + v

        ng = d[-1]
        if ng > ngay_max:
            ngay_max = ng
        i = n - 1
        dong[m] = [san.get(m, "")] + [col[k][i] for k in COT_MA if k != "ex"]

    # CHỈ giữ mã có số của ĐÚNG phiên gần nhất — mã cào dở dang mà để lẫn vào bảng thì
    # người đọc so một mã của hôm nay với một mã của tuần trước.
    ma = {m: v for m, v in dong.items()
          if json_ngay_cuoi(m) == ngay_max} if ngay_max else {}

    # ĐƠN VỊ CỦA CHUỖI TOÀN THỊ TRƯỜNG: tiền quy về TỶ ĐỒNG (1 số lẻ), khối lượng quy về
    # NGHÌN CỔ PHIẾU. Giữ nguyên đồng thì mỗi con số 13-15 chữ số × 4.675 phiên × 6 cột,
    # file phình gấp đôi cho một trang chỉ vẽ đồ thị tổng quan. Trang phải biết đơn vị này.
    ngays = sorted(tt)
    for d in ngays:
        t = tt[d]
        for k in ("mval", "pval", "mcap"):
            t[k] = round(t[k] / 1e9, 1)
        for k in ("mv", "pv", "qMua", "qBan"):
            if t[k] is not None:
                t[k] = round(t[k] / 1e3)
    out = {
        "date": ngay_max,
        "phu": {"ma": len(ma), "docFile": doc, "sauNhat": sau, "phien": len(ngays)},
        "tt": {"d": ngays,
               **{k: [tt[d][k] for d in ngays]
                  for k in ("n", "mval", "pval", "mv", "pv",
                            "qMua", "qBan", "nMua", "nBan", "mcap", "nMcap")}},
        "ma": {"f": COT_MA, "d": ma},
    }
    tmp = RA + ".tmp"
    json.dump(out, open(tmp, "w", encoding="utf-8"), ensure_ascii=False,
              separators=(",", ":"))
    os.replace(tmp, RA)
    kb = os.path.getsize(RA) / 1024
    print(f"  đọc {doc:,} file · {len(ngays):,} phiên · bảng {len(ma):,} mã"
          f" · phiên gần nhất {ngay_max} · {kb:,.0f} KB", flush=True)
    if ngays:
        c = out["tt"]["n"][-1]
        print(f"  phiên {ngay_max}: {c:,} mã góp số"
              f" · khớp lệnh {out['tt']['mval'][-1]:,.0f} tỷ"
              f" · thoả thuận {out['tt']['pval'][-1]:,.0f} tỷ", flush=True)
    return 0


_cache = {}


def json_ngay_cuoi(m):
    if m in _cache:
        return _cache[m]
    try:
        o = json.load(open(os.path.join(GD, m + ".json"), encoding="utf-8"))
        v = (o.get("d") or [""])[-1]
    except Exception:
        v = ""
    _cache[m] = v
    return v


if __name__ == "__main__":
    sys.exit(main())
