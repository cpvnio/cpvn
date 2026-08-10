#!/usr/bin/env python3
"""
LỊCH CHIA CỔ TỨC / QUYỀN -> data/cotuc.json  (nút "Lịch cổ tức" ở trang bảng giá)

NGUỒN: api-finfo.vndirect.com.vn/v4/events, nhóm `investorRight`. Đây là chỗ DUY NHẤT
trong các nguồn đang dùng có SỰ KIỆN SẮP TỚI — đã đo: kho sự kiện của Simplize (thứ
`refresh_daily.fetch_div` đang đọc) trả về 894 sự kiện trên 60 mã lớn mà KHÔNG MỘT
sự kiện nào có ngày chốt quyền sau hôm nay. Lịch mà chỉ có quá khứ thì gọi là lịch sử,
không phải lịch.

Bốn loại quyền được lấy, đều là thứ ảnh hưởng thẳng tới người cầm cổ phiếu:
  DIVIDEND  cổ tức TIỀN   (`dividend` = đồng/cp)
  STOCKDIV  cổ tức CỔ PHIẾU (`ratio` = số cp thưởng trên 100 cp)
  KINDDIV   cổ phiếu THƯỞNG (`ratio` như trên)
  ISSUE     phát hành thêm cho cổ đông hiện hữu (`price` = giá phát hành)

NGÀY NÀO MỚI LÀ NGÀY ĐÁNG XEM: `effectiveDate` = ngày GIAO DỊCH KHÔNG HƯỞNG QUYỀN —
mua từ ngày này là KHÔNG còn quyền. Đó là ngày phải canh, không phải ngày chi trả
(`actualDate`, thường sau đó cả tháng). Kho giữ cả hai, giao diện hiện ngày GDKHQ.

  python3 tools/build_cotuc.py
"""
import json, os, re, urllib.request, datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "data", "cotuc.json")
API = "https://api-finfo.vndirect.com.vn/v4/events"
UA = {"User-Agent": "Mozilla/5.0"}
LOAI = {"DIVIDEND": "tien", "STOCKDIV": "cp", "KINDDIV": "thuong", "ISSUE": "phathanh"}
TRUOC, SAU = 45, 200          # ngày lùi lại / ngày nhìn tới


def get(url, thu=3):
    loi = None
    for i in range(thu):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
                return json.loads(r.read().decode())
        except Exception as e:
            loi = e
    raise loi


def main():
    uni = json.load(open(os.path.join(BASE, "universe.json"), encoding="utf-8"))
    U = {s["sym"] for s in uni["stocks"]}
    hom = datetime.date.today()
    tu = (hom - datetime.timedelta(days=TRUOC)).isoformat()
    den = (hom + datetime.timedelta(days=SAU)).isoformat()

    tho = []
    for t in LOAI:
        # phân trang: nguồn trả cả bản EN lẫn VN nên số bản ghi gấp đôi số sự kiện thật
        trang, tong = 0, None
        while True:
            q = (f"{API}?q=group:investorRight~type:{t}~effectiveDate:gte:{tu}"
                 f"~effectiveDate:lte:{den}&sort=effectiveDate:asc&size=200&page={trang}")
            d = get(q)
            ds = d.get("data") or []
            tho += [e for e in ds if e.get("locale") == "VN"]
            tong = d.get("totalElements") or 0
            trang += 1
            if len(ds) < 200 or trang * 200 >= tong or trang > 20: break

    ra = {}
    for e in tho:
        ma = (e.get("code") or "").strip().upper()
        ngay = e.get("effectiveDate")
        # CHỈ GIỮ MÃ TRONG KHO: nguồn có cả mã đã huỷ niêm yết lẫn mã sàn khác, hiện lên
        # thì bấm vào ra trang trống. Không có ngày GDKHQ thì cũng vô nghĩa với người xem.
        if not ma or ma not in U or not ngay: continue
        o = {"s": ma, "d": ngay, "k": LOAI[e["type"]]}
        if e.get("dividend"): o["tien"] = round(float(e["dividend"]))
        if e.get("ratio") and e["type"] in ("STOCKDIV", "KINDDIV"): o["tl"] = round(float(e["ratio"]), 2)
        if e.get("price") and e["type"] == "ISSUE": o["gia"] = round(float(e["price"]))
        if e.get("actualDate"): o["tt"] = e["actualDate"]          # ngày thanh toán
        if e.get("divYear"): o["nam"] = int(e["divYear"])
        gc = re.sub(r"\s+", " ", (e.get("note") or "").strip())
        if gc: o["gc"] = gc[:90]
        ra[e.get("id") or (ma + ngay + o["k"])] = o                # id nguồn = chống trùng

    ds = sorted(ra.values(), key=lambda x: (x["d"], x["s"]))
    json.dump({"generated": hom.isoformat(), "tu": tu, "den": den, "sk": ds},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    sap = [x for x in ds if x["d"] >= hom.isoformat()]
    import collections
    dem = collections.Counter(x["k"] for x in ds)
    print(f"✓ data/cotuc.json: {len(ds)} sự kiện ({len(sap)} sắp tới) · {dict(dem)} · "
          f"{tu} → {den}")
    for x in sap[:8]:
        print(f"   {x['d']}  {x['s']:5s} {x['k']:9s} {x.get('gc','')[:52]}")


if __name__ == "__main__":
    main()
