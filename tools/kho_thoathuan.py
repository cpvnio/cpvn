# -*- coding: utf-8 -*-
"""VÁ THOẢ THUẬN CHO TOÀN KHO — nguồn Vietstock, chỉ đụng vào `pv`/`pval`.

VÌ SAO CÓ FILE NÀY (22/08/2026)
-------------------------------
User đối chiếu phiên 05/08/2025: báo chí ghi thanh khoản toàn thị trường **85,8 nghìn tỷ**
trong khi trang mình hiện **84.371 tỷ**. Đo lại bằng chính bảng chỉ số của VNDirect
(`v4/vnmarket_prices`, có tách `nmValue` khớp lệnh và `ptValue` thoả thuận cho từng sàn):

    khớp lệnh   ta 80.522,7  ·  thật 80.573,8  ->  lệch  −51 tỷ  (0,06%)   ĐẠT
    thoả thuận  ta  3.848,3  ·  thật  5.485,7  ->  lệch −1.637 tỷ (30%)    HỎNG

Tức **khớp lệnh không sai chỗ nào; toàn bộ chỗ hụt nằm ở thoả thuận**. Đo cả kho: 1.317
trên 1.336 phiên hụt thoả thuận hơn 100 tỷ, 835 phiên hụt hơn 1.000 tỷ, trung bình hụt
~50% suốt từ 2022 đến giữa 2026.

GỐC: `ptValue` TỪNG MÃ của VNDirect THƯA Ở PHIÊN CŨ
---------------------------------------------------
Phiên 05/08/2025 VNDirect chỉ ghi nhận thoả thuận cho **28 mã** trên cả ba sàn, trong khi
Vietstock có thêm hàng chục mã nữa mà VNDirect để 0:

    MWG   VND      0  ·  VS  147,0 tỷ        TCB   VND      0  ·  VS  215,9 tỷ
    VHM   VND      0  ·  VS   26,3 tỷ        SHB   VND      0  ·  VS   54,3 tỷ

Chỗ nào CẢ HAI nguồn cùng có thì hai con số **trùng nhau tới từng đồng** (đối chiếu 17 mã
phiên 05/08/2025 và 20 mã phiên 18/12/2024: khớp lệnh lệch đúng 0,0 đồng). Nên đây không
phải hai định nghĩa khác nhau — Vietstock đơn giản là **tập cha**. Luật gộp vì thế là
`max`, không phải "nguồn nào thắng".

Phiên gần đây thì VNDirect lại đủ (19–20/08/2026 khớp chỉ số tới 0,0 tỷ), nên lượt vá này
là **vá lịch sử một lần**, không phải bước chạy hằng ngày.

BỐN CÁI BẪY
-----------
1. **`fromDate`/`toDate` CỦA VIETSTOCK LÀ ĐỒ TRANG TRÍ.** Endpoint
   `GetStockDeal_ListPriceByTimeFrame` **bỏ qua hoàn toàn** hai tham số này và luôn trả về
   20 phiên MỚI NHẤT. Xin `fromDate=toDate=2025-08-05` vẫn nhận về 21/08/2026 — mà số nào
   cũng hợp lý nên không nhìn ra. Đường duy nhất về quá khứ là **lật trang**, và phải
   **đối chiếu `TradingDate` của từng dòng** chứ không tin thứ tự trang.
   (Cùng họ với cái bẫy đã ghi ở `tt_trang`: nguồn không báo lỗi khi ngày ngoài cửa sổ.)
2. **`pageSize` KẸT Ở 20.** Xin 50/100/200/500/1000/2000 đều trả đúng 20 dòng. Nên 1.000
   phiên = 50 lượt gọi/mã, không có cách rút ngắn. ĐỪNG nới trần `nhipmang` để bù —
   xem luật ở đầu `tools/nhipmang.py`.
3. **CHỈ GHI `pv`/`pval`.** Mọi cột khác trong file là của nguồn khác (tầng giá VNDirect,
   khối ngoại/tự doanh Vietstock) — đọc trọn file, sửa đúng hai mảng, ghi lại. Đây là bài
   học `eod_ghi` 22/08/2026: dựng lại file từ danh sách cột cố định là xoá âm thầm mọi cột
   không có tên trong danh sách.
4. **CHỈ VÁ NGÀY ĐÃ CÓ TRONG `d`.** Thêm ngày mới là phải nới MỌI cột của file cho khớp độ
   dài — việc của `eod_ghi`, không phải của lượt vá này.

    python3 tools/kho_thoathuan.py                  # cả kho, sâu 1.000 phiên (~5 giờ)
    python3 tools/kho_thoathuan.py --sau 300        # nông hơn cho nhanh
    python3 tools/kho_thoathuan.py --ma HPG SSI     # vài mã
    python3 tools/kho_thoathuan.py --thu            # chạy thử, không ghi
    python3 tools/kho_thoathuan.py --tiep           # chạy tiếp lượt bị ngắt
"""
import argparse
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kho_giaodich as KG

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
TRANGTHAI = os.path.join(BASE, ".tt_xong.json")

DONG_TRANG = 20        # trần cứng của nguồn, đã đo — xem bẫy 2
TRANG_TRAN = 80        # chặn vòng lặp chạy hoài nếu nguồn cứ trả dòng


def vs_thoathuan(sym, sau, cu_nhat, bo_som=0):
    """Lật trang lấy {ngày: (PT_TotalVol, PT_TotalVal)} cho tới khi đủ sâu.

    Dừng khi: đủ `sau` phiên · chạm ngày cũ hơn `cu_nhat` (kho không có chỗ để ghi) ·
    nguồn hết dòng · chạm trần trang. Trả về (dict, số lượt gọi, có lỗi hay không).

    `bo_som` — BỎ SỚM SAU N TRANG LIÊN TIẾP KHÔNG CÓ ĐỒNG THOẢ THUẬN NÀO. Đây là cách duy
    nhất rút ngắn lượt chạy mà KHÔNG đụng vào trần nhịp mạng: phần lớn trong 1.229 mã đuôi
    bảng không có thoả thuận phiên nào suốt cả bốn năm, mà vẫn tốn đủ 50 lượt lật trang như
    VIC. Đặt 0 để lật hết.
    ĐỔI LẠI: mã nào chỉ có thoả thuận ở quãng RẤT CŨ sẽ bị cắt. Chấp nhận được vì
    `tools/soi_thanhkhoan.py` đo được ngay phần hụt còn lại so với số của sàn — bỏ sót
    bao nhiêu là thấy bấy nhiêu, không phải đoán.
    """
    ra, trang, goi_n, hong = {}, 1, 0, False
    rong = 0
    while True:
        j = KG.goi("/data/GetStockDeal_ListPriceByTimeFrame", {
            "stockCode": sym, "timeFrame": "D", "fromDate": "2000-01-01",
            "toDate": "2100-01-01", "page": trang, "pageSize": DONG_TRANG,
            "languageID": 1}, sym)
        goi_n += 1
        if not isinstance(j, dict):
            hong = True
            break
        rows = (j.get("data") or {}).get("ListPrice_Results") or []
        if not rows:
            break
        het = False
        co = False
        for r in rows:
            d = KG._ngay(r.get("TradingDate") or "")
            if not d:
                continue
            if d < cu_nhat:
                het = True
                continue
            ra[d] = (r.get("PT_TotalVol"), r.get("PT_TotalVal"))
            if r.get("PT_TotalVal"):
                co = True
        rong = 0 if co else rong + 1
        if het or len(ra) >= sau or trang >= TRANG_TRAN:
            break
        if bo_som and rong >= bo_som:
            break
        trang += 1
    return ra, goi_n, hong


def gop(sym, vs, thu=False):
    """Trộn vào kho theo luật `max`. Trả về (số ô sửa, số tiền thêm tính bằng đồng)."""
    p = os.path.join(GD, sym + ".json")
    try:
        g = json.load(open(p, encoding="utf-8"))
    except Exception:
        return 0, 0
    d = g.get("d") or []
    n = len(d)
    if not n:
        return 0, 0

    def cot(k):
        v = g.get(k)
        return list(v) if isinstance(v, list) and len(v) == n else [None] * n

    pv, pval = cot("pv"), cot("pval")
    vi = {x: i for i, x in enumerate(d)}
    sua = 0
    them = 0
    for ng, (v, val) in vs.items():
        i = vi.get(ng)
        if i is None or val is None:
            continue
        cu = pval[i] or 0
        # NGƯỠNG 1.000đ: hai nguồn làm tròn khác nhau ở hàng đơn vị, chênh vài đồng không
        # phải là dữ liệu mới mà chỉ làm file đổi vô ích (mỗi ô đổi là một dòng diff).
        if val > cu + 1000:
            them += val - cu
            pval[i] = val
            pv[i] = v
            sua += 1
    if sua and not thu:
        g["pv"] = pv
        g["pval"] = pval
        tmp = p + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(g, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, p)
    return sua, them


def _san():
    """{mã: sàn} từ universe.json. `stocks` là MỘT DANH SÁCH, không phải dict — đã vấp."""
    try:
        u = json.load(open(os.path.join(BASE, "universe.json"), encoding="utf-8"))
    except Exception:
        return {}
    ds = u if isinstance(u, list) else (u.get("stocks") or [])
    ra = {}
    for x in ds:
        m = x.get("sym") or x.get("s")
        if m:
            ra[m] = x.get("ex") or x.get("exchange") or "?"
    return ra


def thu_tu(ma):
    """Xếp mã to lên trước — ngắt giữa chừng vẫn cứu được phần lớn con số — NHƯNG XEN KẼ
    BA SÀN.

    Xếp thuần theo tổng giao dịch là dồn hết UPCOM xuống cuối, mà đo ra thì UPCOM mới là
    chỗ hụt nặng nhất: thoả thuận của nó bằng **24% giá trị khớp lệnh** (HOSE chỉ 13%),
    nên tính theo tiền thì UPCOM giữ 160/2.615 nghìn tỷ thoả thuận của cả thị trường trong
    khi chỉ chiếm 3% khớp lệnh. Xếp theo tiền là ba tiếng sau mới đụng tới nó.
    Cách xếp: hạng TƯƠNG ĐỐI trong sàn của mình (hạng ÷ số mã của sàn) — ba sàn cùng chạy
    tới đích, dừng lúc nào cũng phủ đều cả ba.
    """
    diem = {}
    for s in ma:
        try:
            g = json.load(open(os.path.join(GD, s + ".json"), encoding="utf-8"))
        except Exception:
            diem[s] = 0
            continue
        t = 0
        for k in ("mval", "pval"):
            v = g.get(k) or []
            t += sum(x for x in v if x)
        diem[s] = t
    san = _san()
    nhom = {}
    for s in ma:
        nhom.setdefault(san.get(s, "?"), []).append(s)
    vt = {}
    for e, ds in nhom.items():
        ds.sort(key=lambda s: -diem[s])
        n = len(ds)
        for i, s in enumerate(ds):
            vt[s] = (i + 0.5) / n
    return sorted(ma, key=lambda s: (vt[s], -diem[s]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ma", nargs="*")
    ap.add_argument("--sau", type=int, default=1000)
    ap.add_argument("--luong", type=int, default=4)
    ap.add_argument("--thu", action="store_true")
    ap.add_argument("--tiep", action="store_true", help="bỏ qua mã đã xong ở lượt trước")
    ap.add_argument("--bo-som", type=int, default=0,
                    help="bỏ mã sau N trang liên tiếp không có thoả thuận (0 = lật hết)")
    ap.add_argument("--nhip", type=float, default=0,
                    help="lượt/giây tới finance.vietstock.vn, CHỈ cho lượt chạy này")
    a = ap.parse_args()

    # ── NỚI NHỊP CHO ĐÚNG LƯỢT CHẠY NÀY, KHÔNG SỬA BẢNG `TRAN` ────────────────────────
    # `TRAN` trong `tools/nhipmang.py` là bảng CHUNG cho cả pipeline hằng ngày và là lớp
    # phòng thân cho Điều 287 — ĐỪNG sửa nó. `_tran_hien` là chỗ nhịp mạng tự HẠ tốc khi
    # nguồn trả 429; ghi vào đó chỉ đổi cho tiến trình đang chạy, tắt là hết.
    # Đây là lượt VÁ LỊCH SỬ MỘT LẦN, chạy ngoài giờ giao dịch, không phải nhịp hằng ngày —
    # và nó gọi endpoint JSON nhỏ (~8 KB), khác hẳn trang hồ sơ ~300KB mà mốc 4 lượt/giây
    # được đặt ra để bảo vệ.
    # BỘ HÃM VẪN NGUYÊN: gặp 429 thì `_cham_lai` nhân đôi khoảng cách cho hết lượt chạy,
    # nên nới quá tay là nó tự kéo về chứ không nện tiếp.
    # ĐỪNG mang con số ở đây đặt vào `TRAN`.
    if a.nhip > 0:
        import nhipmang
        nhipmang._tran_hien["finance.vietstock.vn"] = 1.0 / a.nhip
        print(f"  [nhịp] finance.vietstock.vn: {a.nhip:g} lượt/giây cho RIÊNG lượt này "
              f"(bảng TRAN không đổi)", flush=True)

    ma = a.ma or [f[:-5] for f in os.listdir(GD) if f.endswith(".json")]
    xong = set()
    if a.tiep and os.path.exists(TRANGTHAI):
        try:
            xong = set(json.load(open(TRANGTHAI, encoding="utf-8")))
        except Exception:
            xong = set()
    ma = [s for s in ma if s not in xong]
    ma = thu_tu(ma)

    # NGÀY CŨ NHẤT CÓ CHỖ GHI của từng mã — lật sâu hơn thế là tốn lượt gọi cho dữ liệu
    # không có ô nào để đổ vào.
    cu_nhat = {}
    for s in ma:
        try:
            d = json.load(open(os.path.join(GD, s + ".json"), encoding="utf-8")).get("d") or []
        except Exception:
            d = []
        cu_nhat[s] = d[max(0, len(d) - a.sau)] if d else "2999-01-01"

    t0 = time.time()
    kd = threading.Lock()
    dem = {"ma": 0, "sua": 0, "goi": 0, "hong": 0, "tien": 0}
    da = list(xong)
    print(f"  vá thoả thuận · {len(ma):,} mã · sâu {a.sau} phiên"
          f"{f' · bỏ sớm sau {a.bo_som} trang rỗng' if a.bo_som else ''}"
          f"{' · CHẠY THỬ' if a.thu else ''}", flush=True)

    def chay(s):
        vs, goi_n, hong = vs_thoathuan(s, a.sau, cu_nhat[s], a.bo_som)
        sua, them = gop(s, vs, a.thu) if vs else (0, 0)
        with kd:
            dem["ma"] += 1
            dem["sua"] += sua
            dem["goi"] += goi_n
            dem["tien"] += them
            if hong:
                dem["hong"] += 1
            else:
                da.append(s)
            if dem["ma"] % 25 == 0 or dem["ma"] == len(ma):
                dt = time.time() - t0
                con = (len(ma) - dem["ma"]) * dt / max(1, dem["ma"])
                print(f"    {dem['ma']:5d}/{len(ma)}  ô sửa {dem['sua']:7,d}  "
                      f"+{dem['tien']/1e12:8,.1f} nghìn tỷ  lượt {dem['goi']:7,d}  "
                      f"{dt/60:5.1f}p · còn ~{con/60:5.1f}p", flush=True)
            if dem["ma"] % 100 == 0 and not a.thu:
                json.dump(da, open(TRANGTHAI, "w"), separators=(",", ":"))

    with ThreadPoolExecutor(max_workers=a.luong) as ex:
        list(ex.map(chay, ma))

    if not a.thu:
        json.dump(da, open(TRANGTHAI, "w"), separators=(",", ":"))
    print(f"  xong {(time.time()-t0)/60:.1f} phút · {dem['ma']:,} mã · "
          f"{dem['sua']:,} ô sửa · +{dem['tien']/1e12:,.1f} nghìn tỷ · "
          f"{dem['goi']:,} lượt gọi · lỗi {dem['hong']}")


if __name__ == "__main__":
    main()
