# -*- coding: utf-8 -*-
"""ĐÈ TẦNG GIÁ BẰNG VNDIRECT — GỌI THEO LÔ NHIỀU MÃ MỘT LƯỢT.

VÌ SAO CÓ FILE NÀY, TRONG KHI ĐÃ CÓ `kho_vnd.py --de` (22/08/2026)
------------------------------------------------------------------
`kho_vnd.py` gọi **ba endpoint cho MỖI mã** → 1.529 mã là ~4.600 lượt. Chạy thật: 20 phút
đầu được 29 mã/phút, rồi VNDirect trả 429 và `nhipmang` tự giãn tới trần 5s/lượt (đúng
luật, KHÔNG được gỡ) — còn 2,6 mã/phút, tức ~9 tiếng cho cả kho.

Dò lại API thì ra hai thứ bản cũ không dùng:

    q=code:HPG,VNM,FPT,SSI,VCB   -> trả đủ 5 mã, mỗi dòng có trường `code`
    size=20000                   -> 17.000 dòng trong MỘT lượt (5 mã × 3.400 phiên)

Nên cả kho gói được trong **~128 lượt** thay vì 4.600. Đây KHÔNG phải gọi dày hơn — nhịp
`nhipmang` giữ nguyên, số lượt giảm 36 lần, tổng số dòng tải về cũng ÍT HƠN (bản cũ xin
`size=4000` mỗi mã tức tới 3.399 phiên, trong khi kho chỉ giữ 1.000).

CHỈ ĐỘNG TẦNG GIÁ. Khối ngoại và tự doanh đã nằm sẵn trong kho từ lượt `kho_vnd.py` đầu
tiên, mà `--de` vốn cũng **không** đè hai tầng đó (`de_cot = ... and k in GIA.values()`).
Bỏ hai endpoint kia đi là bớt 2/3 số lượt mà không mất gì.

GIỮ NGUYÊN BA CÁI BẪY của `kho_vnd.py` — chép sang chứ không nghĩ lại:
1. Hệ số đơn vị dò bằng chính phần phiên chồng nhau của TỪNG mã (VNZ 555k, HLB 505k rơi
   đúng biên nếu đoán theo ngưỡng). Không dò được thì BỎ mã đó, đừng ghi bừa.
2. Chỉ ghi các trường trong `GIA`. Trường khối ngoại/tự doanh của VNDirect là ĐỊNH NGHĨA
   KHÁC (tổng vs khớp lệnh) và đã có chỗ riêng — ở đây không đụng tới.
3. Cổng an toàn: chỉ đè khi trung vị lệch trên phần chồng nhau ≤ 5%. Lệch hơn nghĩa là dò
   sai hệ số hoặc nguồn trả nhầm mã.

BẪY RIÊNG CỦA GỌI THEO LÔ: nguồn thỉnh thoảng trả JSON **đứt giữa chừng** (đã gặp thật ở
`size=4000`). Một lượt hỏng là mất cả lô chứ không phải một mã — nên hỏng thì CHIA ĐÔI LÔ
rồi thử lại, tới tận từng mã một; không im lặng bỏ qua.

    python3 tools/kho_vnd_gia.py --thu        # chạy thử, không ghi
    python3 tools/kho_vnd_gia.py              # đè cả kho
    python3 tools/kho_vnd_gia.py --ma HPG VNM
"""
import json
import os
import statistics
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
API = "https://api-finfo.vndirect.com.vn/v4/stock_prices"

# ĐỘ SÂU CHỈ 300 PHIÊN, KHÔNG PHẢI 1.000 — và đây là chỗ cắt lớn nhất.
# Lượt `kho_vnd.py` ĐẦU TIÊN (chế độ điền chỗ trống) đã đổ VNDirect vào mọi ô còn trống của
# cả 1.000 phiên. Việc còn lại của lượt ĐÈ chỉ là thay phần Vietstock đã ghi đè lên trước —
# mà đo trên 250 mã chưa đè: Vietstock sâu **đúng 120 phiên** ở mọi mã (trung vị = p99 = max),
# vì các lượt cào đều chạy `--phien 120`. Xin 1.000 phiên là kéo về gấp 8 lần số dòng thật sự
# cần thay. Lấy 300 cho dư gấp 2,5 lần, và vẫn thừa phần chồng nhau để dò hệ số đơn vị.
# Ô cũ hơn 300 phiên KHÔNG bị đụng tới: hàm trộn giữ nguyên từng ô ngoài phần mới về.
SAU_TRAN = 300
# TRẦN CỦA KHO — HOÀN TOÀN KHÁC `SAU_TRAN`. Đã trả giá 22/08/2026: dòng trộn viết
# `sorted(...)[-SAU_TRAN:]` nên khi hạ độ sâu XIN VỀ từ 1.000 xuống 300 thì nó cắt luôn KHO
# xuống 300 — **351 file mất 700 phiên** mà không lỗi nào báo, file vẫn hợp lệ vẫn đọc được.
# Hai con số này không bao giờ được dùng chung một hằng số: một cái nói "xin nguồn bao nhiêu
# phiên", cái kia nói "kho giữ bao nhiêu phiên".
KHO_TRAN = 1000
LO = 20
# SIZE phải RỘNG GẤP ĐÔI `LO × SAU_TRAN`. Nguồn xếp mọi mã chung một danh sách theo ngày
# giảm dần rồi CẮT ở `size`, nên mã nào ngừng giao dịch (dòng của nó nằm sâu dưới quá khứ)
# sẽ không lọt vào phần được cắt và trả về RỖNG. Chừa gấp đôi thì mấy mã đó vẫn có chỗ;
# mã nào vẫn rỗng thì lượt vét cuối gọi riêng.
SIZE = LO * SAU_TRAN * 2
LECH_TOI = 0.05
# BA LUỒNG, và nhịp tối thiểu 1 giây giữa hai lượt BẮT ĐẦU. Đo được mỗi lượt chờ mạng ~25s
# mà CPU gần như không làm gì (1,9s CPU trên 181s chạy) — nối đuôi là ngồi không.
# Ba luồng với nhịp này ra ~0,12 lượt/giây, trong khi trần của host là 12 lượt/giây: vẫn
# thấp hơn TRĂM LẦN. Đây là bù độ trễ, KHÔNG phải nới trần — xem luật ở đầu `nhipmang.py`.
# ĐỘ TRỄ CỦA NGUỒN CHẬP CHỜN DỮ DỘI, KHÔNG PHỤ THUỘC KÍCH THƯỚC. Đo 5 lượt giống hệt nhau
# lúc 14:35 (sát giờ đóng cửa): 147,2s · 17,6s · 0,6s · 13,2s · 0,6s — cùng 460 KB. Một lượt
# 2,8 MB thì lại chỉ 0,9s. Nên KHÔNG cắt nhỏ lô để nhanh hơn (vô ích), mà làm hai việc:
#   ① CẮT LƯỢT TREO SAU 40 GIÂY rồi gọi lại — `nhipmang` coi timeout là đáng thử lại và lượt
#     sau thường về trong dưới một giây. Đợi trọn 147s là ngồi không.
#   ② SÁU LUỒNG để độ trễ của lượt này chồng lên lượt khác. Cả kho chỉ còn 77 lượt gọi, sáu
#     luồng ra ~0,2 lượt/giây — trần của host là 12 lượt/giây, vẫn thấp hơn 60 LẦN. Đây là
#     bù độ trễ chứ không phải nới trần; số lượt gọi không tăng thêm một cái nào.
LUONG = 6
CHO_TOI_DA = 40
NHIP = 1.0
_lan_cuoi = [0.0]
_khoa = threading.Lock()

GIA = {"basicPrice": "tc", "open": "o", "high": "h", "low": "l", "close": "c",
       "average": "vwap", "nmVolume": "mv", "nmValue": "mval",
       "ptVolume": "pv", "ptValue": "pval"}
GIA_NHAN = ("tc", "o", "h", "l", "c", "vwap")

THU = "--thu" in sys.argv


def xin_lo(ma):
    """Trả {mã: [dòng]}. JSON đứt thì CHIA ĐÔI LÔ thử lại, tới tận từng mã."""
    url = "%s?q=code:%s&sort=date:desc&size=%d" % (API, ",".join(ma), SIZE)
    while True:
        with _khoa:
            cho = _lan_cuoi[0] + NHIP - time.monotonic()
            if cho <= 0:
                _lan_cuoi[0] = time.monotonic()
                break
        time.sleep(cho)
    hong = False
    try:
        j = json.loads(nhipmang.get(url, timeout=CHO_TOI_DA))
        rows = j.get("data") or []
    except Exception:
        hong = True
        rows = []
    if hong:
        if len(ma) == 1:
            print("    ! %s: nguồn trả hỏng, bỏ qua" % ma[0], flush=True)
            return {}
        g = len(ma) // 2
        print("    ! lô %d mã trả hỏng -> chia đôi" % len(ma), flush=True)
        ra = xin_lo(ma[:g])
        ra.update(xin_lo(ma[g:]))
        return ra
    theo = {}
    for r in rows:
        c = r.get("code")
        if c:
            theo.setdefault(c, []).append(r)
    return theo


def he_so(rows, cu, d_cu):
    """Hệ số đơn vị giá cho MỘT mã, dò bằng chính phần phiên chồng nhau (bẫy 1)."""
    ti = []
    c_cu = cu.get("c") or []
    for r in rows:
        i = d_cu.get(r.get("date"))
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


def _tv(a):
    a = sorted(a)
    return a[len(a) // 2] if a else None


def mot(sym, rows):
    """Đè tầng giá của một mã. Trả mã trạng thái để bên gọi đếm."""
    p = os.path.join(GD, sym + ".json")
    if not os.path.exists(p):
        return "khong_co_file"
    try:
        cu = json.load(open(p, encoding="utf-8"))
    except Exception:
        return "doc_hong"
    d_cu = {d: i for i, d in enumerate(cu.get("d") or [])}
    if not rows:
        return "nguon_trong"

    rows = rows[:SAU_TRAN]                      # nguồn trả mới->cũ
    hs = he_so(rows, cu, d_cu)
    if hs is None:
        return "khong_do_duoc_don_vi"

    bang = {}
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
            bang[d] = o
    if not bang:
        return "nguon_trong"

    # ── CỔNG AN TOÀN: đo lệch trên phần chồng nhau TRƯỚC khi thay số ──
    lech = []
    for k in ("c", "mval"):
        cv = cu.get(k) or []
        for d0, o0 in bang.items():
            i = d_cu.get(d0)
            if i is not None and i < len(cv) and cv[i] and o0.get(k):
                lech.append(abs(o0[k] / cv[i] - 1))
    tv = _tv(lech)
    if tv is not None and tv > LECH_TOI:
        return "bo_de"

    if THU:
        return "thu"

    # ── trộn: CHỈ tầng giá bị đè, mọi cột khác giữ nguyên từng ô ──
    d_moi = sorted(set(list(d_cu) + list(bang)))[-KHO_TRAN:]
    ra = {"sym": sym, "d": d_moi, "n": len(d_moi)}
    for k in ("v", "sid", "day"):
        if k in cu:
            ra[k] = cu[k]
    cot = {x for x in cu if isinstance(cu[x], list) and x != "d"} | set(GIA.values())
    for k in sorted(cot):
        cv = cu.get(k) or []
        de_cot = k in GIA.values()
        arr = []
        for d in d_moi:
            i = d_cu.get(d)
            v = cv[i] if (i is not None and i < len(cv)) else None
            m = (bang.get(d) or {}).get(k) if de_cot else None
            if m is not None:
                v = m
            arr.append(v)
        if any(x is not None for x in arr):
            ra[k] = arr
    ra["updated"] = time.strftime("%Y-%m-%d")
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(ra, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)
    return "xong"


def main():
    av = sys.argv[1:]
    if "--ma" in av:
        ma = [x.upper() for x in av[av.index("--ma") + 1:] if not x.startswith("--")]
    else:
        ma = sorted(f[:-5] for f in os.listdir(GD) if f.endswith(".json"))

    dem = {}
    hong = []
    trong = []
    t0 = time.time()
    xong = [0]
    khoa_dem = threading.Lock()
    los = [ma[i:i + LO] for i in range(0, len(ma), LO)]
    n_lo = len(los)

    def chay(lo):
        theo = xin_lo(lo)
        ra = []
        for sym in lo:
            ra.append((sym, mot(sym, theo.get(sym) or [])))
        with khoa_dem:
            for sym, kq in ra:
                dem[kq] = dem.get(kq, 0) + 1
                if kq == "nguon_trong":
                    trong.append(sym)
                elif kq in ("khong_do_duoc_don_vi", "bo_de"):
                    hong.append("%s:%s" % (sym, kq))
            xong[0] += 1
            if xong[0] % 10 == 0 or xong[0] == n_lo:
                r = time.time() - t0
                print("  lô %d/%d · %.0fs · ước còn %.1f phút"
                      % (xong[0], n_lo, r, (n_lo - xong[0]) * r / xong[0] / 60), flush=True)

    with ThreadPoolExecutor(max_workers=LUONG) as ex:
        list(ex.map(chay, los))
    n_goi = n_lo

    # ── LƯỢT VÉT: mã trả rỗng thường là mã ngừng giao dịch, dòng của nó nằm quá sâu nên bị
    #    cắt khỏi lô chung. Gọi RIÊNG từng mã thì không còn ai tranh chỗ. Không vét thì mấy
    #    mã đó lặng lẽ giữ nguyên số Vietstock, mà đó đúng là nhóm khó soi lại nhất.
    if trong and not THU:
        print("  vét riêng %d mã trả rỗng…" % len(trong), flush=True)
        def vet(sym):
            kq = mot(sym, (xin_lo([sym]) or {}).get(sym) or [])
            with khoa_dem:
                dem["vét_" + kq] = dem.get("vét_" + kq, 0) + 1
                if kq in ("khong_do_duoc_don_vi", "bo_de", "nguon_trong"):
                    hong.append("%s:%s" % (sym, kq))
        with ThreadPoolExecutor(max_workers=LUONG) as ex:
            list(ex.map(vet, trong))
        n_goi += len(trong)

    print("\n%d mã · %d lượt gọi · %.1f phút%s"
          % (len(ma), n_goi, (time.time() - t0) / 60, "  (CHẠY THỬ)" if THU else ""))
    for k in sorted(dem):
        print("  %-22s %d" % (k, dem[k]))
    if hong:
        print("  mã không đè được (%d): %s%s"
              % (len(hong), " ".join(hong[:12]), " …" if len(hong) > 12 else ""))


if __name__ == "__main__":
    main()
