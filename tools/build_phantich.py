"""BỘ TỔNG HỢP CHO TRANG PHÂN TÍCH — `data/giaodich/*` -> `data/phantich.json` + `data/phien/*`.

CHIA THEO NGÀY, KHÔNG GỘP MỘT CỤC (user chốt 20/08/2026: *"nên phân ra theo ngày rõ ràng
cho tao dễ nhìn dễ đối chiếu dễ phân tích"*).

· `data/phantich.json` — NHẸ, trang tải ngay: CHUỖI TOÀN THỊ TRƯỜNG theo phiên (đơn vị tiền
  là TỶ đồng, khối lượng là NGHÌN cổ phiếu) và khối `chiso` — điểm đóng cửa cùng % thay đổi
  của VNINDEX/VN30/HNX/HNX30/UPCOM, gióng đúng trục ngày. Nguồn chỉ số do
  `kho_giaodich.py --chiso` cào riêng vào `data/chiso.json`.
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
# `sec` = ngành, để trang dựng được khối "ngành hút tiền" mà khỏi tải universe.json.
COT_BANG = ["ex", "sec", "c", "tc", "vwap", "mval", "pval", "mv", "pv", "sh",
            "fnMuaGT", "fnBanGT", "fnMuaKL", "fnBanKL", "fnSoHuu", "fnRoom",
            "tdMuaGT", "tdBanGT", "tdMuaKL", "tdBanKL"]
SO_PHIEN_FILE = 120      # dựng file ngày cho ngần này phiên gần nhất
MIN_MA = 100             # phiên ít mã hơn thì không dựng file ngày


def main():
    u = json.load(open(UNI, encoding="utf-8"))["stocks"]
    san = {s["sym"]: s.get("ex") or "" for s in u}
    nganh = {s["sym"]: s.get("sector") or "" for s in u}

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
        col = {k: (o.get(k) or [None] * n) for k in COT_BANG if k not in ("ex", "sec")}

        for i, ng in enumerate(d):
            c, mval, pval = col["c"][i], col["mval"][i], col["pval"][i]
            # CHỈ ĐẾM MÃ CÓ SỐ, ĐỪNG ĐẾM MÃ CHỈ "CÓ MẶT" — đã trả giá 20/08/2026.
            # Hai endpoint của nguồn có độ sâu KHÁC NHAU: thống kê giá 20 dòng/trang,
            # thống kê đặt lệnh 30 dòng/trang. Nên 10 phiên ở khoảng 21-30 có bản ghi
            # (vì có sổ lệnh) nhưng `mval`/`mv` đều None. Đếm chúng vào `n` thì đồ thị
            # hiện "1.520 mã" cạnh một cột gần bằng 0 — đọc ra thành thị trường sập,
            # trong khi sự thật là kho chưa có giá của mấy phiên đó. Nhãn số mã mà nói
            # ngược lại cái cột thì còn tệ hơn là không có nhãn.
            if c is None or mval is None:
                continue
            t = tt.setdefault(ng, {"n": 0, "mval": 0.0, "pval": 0.0, "mv": 0, "pv": 0,
                                   "mcap": 0.0, "nMcap": 0,
                                   "fnMua": 0.0, "fnBan": 0.0, "nFn": 0,
                                   "tdMua": 0.0, "tdBan": 0.0, "nTd": 0})
            t["n"] += 1
            t["mval"] += mval or 0
            t["pval"] += pval or 0
            t["mv"] += col["mv"][i] or 0
            t["pv"] += col["pv"][i] or 0
            # KHỐI NGOẠI — cộng riêng và đếm riêng `nFn`. Kho khối ngoại nông hơn kho giá
            # (nguồn trả 30 dòng/trang, lấy 2 trang = 60 phiên), nên phiên cũ có ít mã có
            # số khối ngoại hơn hẳn. Dùng chung `n` là đọc ra "khối ngoại chỉ chiếm 2% giá
            # trị" trong khi sự thật là 2% đó tính trên mẫu số của cả 1.525 mã còn tử số
            # mới có 300 mã.
            fm, fb2 = col["fnMuaGT"][i], col["fnBanGT"][i]
            if fm is not None or fb2 is not None:
                t["fnMua"] += fm or 0
                t["fnBan"] += fb2 or 0
                t["nFn"] += 1
            # TỰ DOANH — đếm riêng `nTd` y như khối ngoại, cùng lý do: hai tầng cào bởi
            # hai lượt khác nhau nên độ phủ khác nhau, dùng chung mẫu số là ra tỉ lệ bịa.
            tm, tb2 = col["tdMuaGT"][i], col["tdBanGT"][i]
            if tm is not None or tb2 is not None:
                t["tdMua"] += tm or 0
                t["tdBan"] += tb2 or 0
                t["nTd"] += 1
            sh = col["sh"][i]
            if sh and c:
                t["mcap"] += c * sh
                t["nMcap"] += 1
            bang.setdefault(ng, {})[m] = [san.get(m, ""), nganh.get(m, "")] + \
                [col[k][i] for k in COT_BANG if k not in ("ex", "sec")]

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
        for k in ("mval", "pval", "mcap", "fnMua", "fnBan", "tdMua", "tdBan"):
            t[k] = round(t[k] / 1e9, 1)
        for k in ("mv", "pv"):
            t[k] = round(t[k] / 1e3)
    # CHỈ SỐ — gióng theo đúng trục ngày của chuỗi giao dịch. Thiếu phiên nào thì để None
    # chứ đừng kéo giá trị gần nhất lấp vào: chỉ số đứng im ba phiên liền là một câu nói
    # về thị trường, không phải một chỗ trống được lấp.
    cs = {}
    try:
        raw = json.load(open(os.path.join(BASE, "data", "chiso.json"), encoding="utf-8"))
        for m, o in raw.items():
            ix = {d: i for i, d in enumerate(o["d"])}
            cs[m] = {"c": [o["c"][ix[d]] if d in ix else None for d in ngays],
                     "pc": [o["pc"][ix[d]] if d in ix else None for d in ngays]}
    except Exception:
        cs = {}

    out = {
        "date": ngays[-1],
        "phu": {"docFile": doc, "phien": len(ngays), "fileNgay": ghi},
        "tt": {"d": ngays,
               **{k: [tt[d][k] for d in ngays]
                  for k in ("n", "mval", "pval", "mv", "pv", "mcap", "nMcap",
                            "fnMua", "fnBan", "nFn", "tdMua", "tdBan", "nTd")}},
        "chiso": cs,
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
    print(f"  khối ngoại: mua {out['tt']['fnMua'][i]:,.0f} tỷ · bán {out['tt']['fnBan'][i]:,.0f} tỷ"
          f" · ròng {out['tt']['fnMua'][i]-out['tt']['fnBan'][i]:+,.0f} tỷ"
          f" · trên {out['tt']['nFn'][i]:,} mã có số", flush=True)
    print(f"  tự doanh  : mua {out['tt']['tdMua'][i]:,.0f} tỷ · bán {out['tt']['tdBan'][i]:,.0f} tỷ"
          f" · ròng {out['tt']['tdMua'][i]-out['tt']['tdBan'][i]:+,.0f} tỷ"
          f" · trên {out['tt']['nTd'][i]:,} mã có số", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
