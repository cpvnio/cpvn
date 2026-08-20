# -*- coding: utf-8 -*-
"""BỒI KHO GIAO DỊCH TỪ VNDIRECT -> `data/giaodich/{MÃ}.json`. Ba endpoint, sâu hàng nghìn phiên.

VÌ SAO CÓ FILE NÀY (22/08/2026)
------------------------------
Vietstock chặn cứng **1 năm** ở tầng dòng tiền (sổ lệnh, khối ngoại, tự doanh) — đã thử
lách bằng cửa sổ ngày, nguồn BỎ QUA cửa sổ và vẫn trả đúng phiên cũ nhất nó có. VNDirect
thì không chặn, lại trả **1.000+ dòng trong MỘT lượt gọi** thay vì 30:

    /v4/stock_prices          3.399 phiên  (HPG, lùi 2013)
    /v4/foreigns              1.991 phiên  (lùi 30/08/2018)
    /v4/proprietary_trading   1.052 phiên

Đo thật: cả kho 1.529 mã hết **~24 phút**, so với ~57 phút của Vietstock cho 1/8 độ sâu.

BA CÁI BẪY, đều đã đo chứ không đoán
------------------------------------
1. **ĐƠN VỊ GIÁ.** VNDirect trả NGHÌN ĐỒNG cho một số mã (KSB `close` = 14.5 trong khi
   kho ghi 14.500). Không đoán theo ngưỡng — VNZ 555k và HLB 505k rơi đúng biên, đoán là
   sai (bài học đã ghi trong CLAUDE.md). Cách chắc: **đối chiếu chính mã đó** trên phần
   phiên chồng nhau với kho, lấy trung vị tỉ lệ rồi mới chọn hệ số 1 hay 1000. Mã nào
   không dò được hệ số thì **BỎ QUA TẦNG GIÁ**, đừng ghi bừa.
2. **KHỐI NGOẠI/TỰ DOANH: HAI NGUỒN HAI ĐỊNH NGHĨA.** Vietstock `fnMuaGT`/`tdMuaGT` là
   **KHỚP LỆNH THÔI** (thoả thuận nằm riêng ở `*TTGT`); VNDirect `buyVal`/`buyingVal` là
   **TỔNG**. Chứng minh 22/08/2026: FPT 14/08 kho ghi 90,8 tỷ + 155,4 tỷ thoả thuận =
   246,2 tỷ, đúng bằng `sellingVal` của VNDirect; ACB 22/08/2025 có `fnMuaGT` 464 triệu
   trong khi `fnMuaTTGT` 57,3 TỶ — bất khả nếu cái đầu là tổng.
   Nên VNDirect ghi vào **TRƯỜNG RIÊNG** (`fnMuaTG` `fnBanTG` `tdMuaTG` `tdBanTG` …),
   TUYỆT ĐỐI không đổ vào trường của Vietstock. Một đại lượng hai định nghĩa trong cùng
   một mảng là con bệnh đã phải gỡ ở `data/hist`.
3. **CHỈ ĐIỀN CHỖ TRỐNG Ở TẦNG GIÁ.** Phiên nào kho đã có số của Vietstock thì giữ
   nguyên, chỉ ghi phiên đang trống — để còn đối chiếu được hai nguồn trên phần chồng
   nhau. Muốn ghi đè thì phải chứng minh trước đã.

  python3 tools/kho_vnd.py --thu            # chạy thử 30 mã, không ghi
  python3 tools/kho_vnd.py                  # bồi cả kho
  python3 tools/kho_vnd.py --ma HPG VCB
"""
import json
import os
import statistics
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
UNI = os.path.join(BASE, "universe.json")
API = "https://api-finfo.vndirect.com.vn/v4/"
SIZE = 4000                 # một lượt lấy trọn lịch sử; nguồn tự cắt ở phần nó có
# TRẦN ĐỘ SÂU — user chốt 22/08/2026: *"3 năm trở lại đây (khoảng 1000 phiên), vậy là đủ"*.
#
# ĐÂY LÀ CHẶN VỀ DUNG LƯỢNG, KHÔNG PHẢI VỀ NGUỒN. Nguồn cho tới 3.399 phiên, nhưng đo
# giữa lượt chạy đầu: file đã bồi trọn lịch sử nặng TRUNG BÌNH 712 KB, nhân 1.529 mã ra
# **1,1 GB** cho một thư mục vốn 41 MB — mà `data/giaodich` được commit MỖI PHIÊN.
# 1.000 phiên là chỗ dừng user chọn, và nó vẫn dài gấp 10 lần kho cũ.
SAU_TRAN = 1000

# stock_prices -> tên trường trong kho. CÙNG NGHĨA với Vietstock:
# nmValue/nmVolume = khớp lệnh, ptValue/ptVolume = thoả thuận, average = giá bình quân.
GIA = {"basicPrice": "tc", "open": "o", "high": "h", "low": "l", "close": "c",
       "average": "vwap", "nmVolume": "mv", "nmValue": "mval",
       "ptVolume": "pv", "ptValue": "pval"}
GIA_NHAN = ("tc", "o", "h", "l", "c", "vwap")     # mấy trường phải nhân hệ số đơn vị


def xin(ep, sym, khoa_ngay):
    try:
        j = json.loads(nhipmang.get(
            "%s%s?q=code:%s&sort=%s:desc&size=%d" % (API, ep, sym, khoa_ngay, SIZE),
            timeout=90))
    except Exception:
        return None
    return j.get("data") or []


def he_so(rows, cu, d_cu):
    """Hệ số đơn vị giá cho MỘT mã, dò bằng chính phần phiên chồng nhau (bẫy 1)."""
    ti = []
    c_cu = cu.get("c") or []
    for r in rows:
        d = r.get("date")
        i = d_cu.get(d)
        if i is None or i >= len(c_cu):
            continue
        a, b = c_cu[i], r.get("close")
        if a and b:
            ti.append(a / b)
    if len(ti) < 5:
        return None
    m = statistics.median(ti)
    for hs in (1.0, 1000.0):
        if abs(m / hs - 1) <= 0.02:
            return hs
    return None


def mot(sym, ghi=True):
    p = os.path.join(GD, sym + ".json")
    if not os.path.exists(p):
        return None
    try:
        cu = json.load(open(p, encoding="utf-8"))
    except Exception:
        return None
    d_cu = {d: i for i, d in enumerate(cu.get("d") or [])}
    bang = {}          # ngày -> {trường: giá trị}
    kq = {"gia": 0, "fn": 0, "td": 0, "hs": None, "bo_gia": False}

    # ── tầng giá ──
    rows = xin("stock_prices", sym, "date")
    if rows:
        rows = rows[:SAU_TRAN]          # nguồn trả mới->cũ, cắt phần cũ hơn trần
        hs = he_so(rows, cu, d_cu)
        kq["hs"] = hs
        if hs is None:
            kq["bo_gia"] = True          # không dò được đơn vị -> KHÔNG ghi tầng giá
        else:
            for r in rows:
                d = r.get("date")
                if not d:
                    continue
                o = {}
                for k, v in GIA.items():
                    x = r.get(k)
                    if x is None:
                        continue
                    o[v] = round(x * hs) if v in GIA_NHAN else round(x)
                if o:
                    bang.setdefault(d, {}).update(o)
                    kq["gia"] += 1

    # ── khối ngoại (TỔNG, trường riêng — bẫy 2) ──
    rows = (xin("foreigns", sym, "tradingDate") or [])[:SAU_TRAN]
    for r in rows:
        d = r.get("tradingDate")
        if not d:
            continue
        o = {}
        for k, v in (("buyVal", "fnMuaTG"), ("sellVal", "fnBanTG"),
                     ("buyVol", "fnMuaTKL"), ("sellVol", "fnBanTKL"),
                     ("currentRoom", "fnRoomV"), ("totalRoom", "fnRoomTong")):
            x = r.get(k)
            if x is not None:
                o[v] = round(x)
        if o:
            bang.setdefault(d, {}).update(o)
            kq["fn"] += 1

    # ── tự doanh (TỔNG, trường riêng) ──
    rows = (xin("proprietary_trading", sym, "date") or [])[:SAU_TRAN]
    for r in rows:
        d = r.get("date")
        if not d:
            continue
        o = {}
        for k, v in (("buyingVal", "tdMuaTG"), ("sellingVal", "tdBanTG"),
                     ("buyingVol", "tdMuaTKL"), ("sellingVol", "tdBanTKL")):
            x = r.get(k)
            if x is not None:
                o[v] = round(x)
        if o:
            bang.setdefault(d, {}).update(o)
            kq["td"] += 1

    if not bang:
        return kq
    if not ghi:
        return kq

    # ── trộn vào file, GIỮ NGUYÊN số của Vietstock ở tầng giá (bẫy 3) ──
    d_moi = sorted(set(list(d_cu) + list(bang)))[-SAU_TRAN:]
    n = len(d_moi)
    ra = {"sym": sym, "d": d_moi, "n": n}
    for k in ("v", "sid", "updated", "day"):
        if k in cu:
            ra[k] = cu[k]
    cot = set()
    for x in cu:
        if isinstance(cu[x], list) and x != "d":
            cot.add(x)
    cot |= {v for v in GIA.values()}
    cot |= {"fnMuaTG", "fnBanTG", "fnMuaTKL", "fnBanTKL", "fnRoomV", "fnRoomTong",
            "tdMuaTG", "tdBanTG", "tdMuaTKL", "tdBanTKL"}
    for k in sorted(cot):
        cv = cu.get(k) or []
        arr = []
        for d in d_moi:
            i = d_cu.get(d)
            v = cv[i] if (i is not None and i < len(cv)) else None
            if v is None:
                v = (bang.get(d) or {}).get(k)      # chỉ điền chỗ trống
            arr.append(v)
        # BỎ CỘT RỖNG HOÀN TOÀN. Mảng 1.000 chữ "null" tốn ~5 KB, mà kho có tới ~30 cột
        # thưa (sổ lệnh chỉ 249 phiên, tự doanh phần lớn mã KHÔNG CÓ) — để nguyên là mỗi
        # file gánh cả trăm KB số không. Client vốn đã đọc bằng `o.get(k) || []` nên cột
        # vắng mặt và cột toàn null là một.
        if any(x is not None for x in arr):
            ra[k] = arr
    ra["updated"] = time.strftime("%Y-%m-%d")
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(ra, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)
    return kq


def main():
    av = sys.argv[1:]
    thu = "--thu" in av
    chi = None
    if "--ma" in av:
        k = av.index("--ma")
        chi = {x.upper() for x in av[k + 1:] if not x.startswith("--")}

    ma = [x["sym"] for x in json.load(open(UNI, encoding="utf-8"))["stocks"]]
    if chi:
        ma = [m for m in ma if m in chi]
    if thu:
        ma = ma[:30]

    t0 = time.time()
    ok = bo = 0
    bo_gia = []
    tong = {"gia": 0, "fn": 0, "td": 0}
    for i, m in enumerate(ma):
        r = mot(m, ghi=not thu)
        if not r:
            bo += 1
            continue
        ok += 1
        for k in tong:
            tong[k] += r[k]
        if r["bo_gia"]:
            bo_gia.append(m)
        if (i + 1) % 200 == 0:
            print("    …%d/%d  %.0fs" % (i + 1, len(ma), time.time() - t0), flush=True)

    print("BỒI TỪ VNDIRECT: %d mã · bỏ %d" % (ok, bo))
    print("  dòng giá     : {:,}".format(tong["gia"]))
    print("  dòng khối ngoại: {:,}".format(tong["fn"]))
    print("  dòng tự doanh  : {:,}".format(tong["td"]))
    print("  không dò được đơn vị giá (BỎ tầng giá): %d %s"
          % (len(bo_gia), bo_gia[:8]))
    print("  %.0f giây" % (time.time() - t0))
    if thu:
        print("  (--thu: 30 mã, KHÔNG ghi)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
