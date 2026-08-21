# -*- coding: utf-8 -*-
"""CÀO VNDIRECT THEO LÔ — BỐN TẦNG, NHIỀU MÃ MỘT LƯỢT. Thay `kho_vnd.py` trong lượt EOD.

VÌ SAO CÓ FILE NÀY (22/08/2026)
------------------------------
User: *"tao không muốn chốt phiên 15h15 mà tận 17h20 mới có đủ data"*. Đo lượt EOD ngày
21/08 thì đúng vậy thật, và gốc nằm ở SỐ LƯỢT GỌI chứ không ở nguồn:

    kho_giaodich --sau   8 lượt/mã × 1.529 = 12.232 lượt  (Vietstock, trần 4/s) ≈ 51 phút
    kho_vnd              3 lượt/mã × 1.529 =  4.587 lượt  (VNDirect)            ≈ 45 phút
    kho_giaodich --vg    2 lượt/mã × 1.529 =  3.058 lượt                        ≈ 13 phút

Dò lại API VNDirect thì **cả bốn endpoint đều nhận nhiều mã một lượt** — thứ bản cũ không
dùng tới, nên nó gọi từng mã một:

    q=code:HPG,VNM,FPT   ->  mỗi dòng trả về có trường `code` để tách lại
    size                 ->  tới 20.000 dòng một lượt

Nên cả bốn tầng của 1.529 mã gói trong **vài chục lượt** thay vì 4.587.
**KHÔNG phải gọi dày hơn:** nhịp `nhipmang` giữ nguyên, số lượt giảm ~60 lần, và tổng số
dòng tải về cũng ít hơn (bản cũ xin `size=4000` mỗi mã, tức tới 3.399 phiên cho một kho
chỉ giữ 1.000).

BỐN TẦNG:

| tầng | endpoint | ghi vào |
|---|---|---|
| `gia` | `stock_prices` | `tc o h l c vwap mv mval pv pval` — **ĐÈ**, VNDirect là nguồn chính |
| `fn`  | `foreigns` | `fnMuaTG fnBanTG fnMuaTKL fnBanTKL fnRoomV fnRoomTong` — trường RIÊNG |
| `td`  | `proprietary_trading` | `tdMuaTG tdBanTG tdMuaTKL tdBanTKL` — trường RIÊNG |
| `sh`  | `ratios` (`OUTSTANDING_SHARES`) | `sh` — **chỉ điền chỗ trống** |

VNDIRECT KHÔNG THAY ĐƯỢC VIETSTOCK Ở BA THỨ — đã dò thật 22/08/2026, đừng dò lại:
`order_book` `bid_ask` `stock_orders` `orders` `intraday` `ticks` `stock_intraday`
`matched_orders` `stock_deals` `deals` → **404 cả mười**; và liệt kê đủ trường thì
`stock_prices` có 25 trường, `foreigns` có 12 trường, không trường nào là sổ lệnh.

    ① sổ lệnh lúc đóng cửa (`qMua qBan nMua nBan`) — tín hiệu MẠNH NHẤT kho đo được,
      rank IC +0,082, **t = +12,24**. Mất là mất hẳn.
    ② tách khớp lệnh / thoả thuận của khối ngoại — VNDirect chỉ cho TỔNG.
    ③ vùng giá khớp lệnh (gộp từ nến 1 phút).

Nên lượt EOD vẫn giữ Vietstock, chỉ ĐỔI THỨ TỰ: chạy file này TRƯỚC rồi dựng bảng ngay,
Vietstock chạy sau để lấp thêm ba thứ trên. Bảng lên web ~15:25 thay vì ~17:20.

BỐN CÁI BẪY, đều đã đo chứ không đoán
-------------------------------------
1. **ĐƠN VỊ GIÁ.** VNDirect trả NGHÌN ĐỒNG cho một số mã. Không đoán theo ngưỡng — VNZ 555k
   và HLB 505k rơi đúng biên. Dò bằng chính phần phiên chồng nhau CỦA TỪNG MÃ; không dò
   được thì BỎ tầng giá của mã đó, đừng ghi bừa.
2. **HAI NGUỒN HAI ĐỊNH NGHĨA.** `fnMuaGT` của Vietstock là KHỚP LỆNH THÔI (thoả thuận nằm
   riêng ở `*TTGT`); `buyVal` của VNDirect là TỔNG. Ghi vào TRƯỜNG RIÊNG, tuyệt đối không
   đổ chung — một đại lượng hai định nghĩa trong cùng một mảng là con bệnh đã phải gỡ ở
   `data/hist`.
3. **`SAU_TRAN` ≠ `KHO_TRAN`.** Đã trả giá 22/08: dòng trộn viết `sorted(...)[-SAU_TRAN:]`
   nên khi hạ độ sâu XIN VỀ từ 1.000 xuống 300 thì nó cắt luôn KHO xuống 300 — **351 file
   mất 700 phiên**, không lỗi nào báo, file vẫn hợp lệ vẫn đọc được.
4. **`reportDate` CỦA `ratios` CÓ NGÀY TƯƠNG LAI** (FPT trả 2026-09-30). Lấy bừa bản ghi
   mới nhất là gán số cổ phiếu của quý CHƯA TỚI cho phiên hôm nay. Phải lọc `<= ngày phiên`.

BẪY RIÊNG CỦA GỌI THEO LÔ
-------------------------
* **JSON đứt giữa chừng** (đã gặp thật). Một lượt hỏng là mất cả lô chứ không phải một mã —
  nên hỏng thì CHIA ĐÔI LÔ thử lại, tới tận từng mã; không im lặng bỏ qua.
* **Nguồn cắt ở `size` theo NGÀY GIẢM DẦN chung cho cả lô**, nên mã ngừng giao dịch (dòng
  của nó nằm sâu dưới quá khứ) sẽ trả về RỖNG. Chừa `size` gấp đôi, và mã nào vẫn rỗng thì
  lượt vét cuối gọi riêng.
* **Độ trễ chập chờn dữ dội, không phụ thuộc kích thước.** Đo 5 lượt giống hệt nhau lúc
  14:35: 147,2s · 17,6s · 0,6s · 13,2s · 0,6s — cùng 460 KB; một lượt 2,8 MB lại chỉ 0,9s.
  Nên KHÔNG cắt nhỏ lô để nhanh hơn (vô ích), mà **cắt lượt treo sau 40 giây rồi gọi lại**
  (lượt sau thường về dưới một giây) và chạy **6 luồng** để độ trễ chồng lên nhau. Cả kho
  vài chục lượt, sáu luồng ra ~0,2 lượt/giây — trần của host là 12 lượt/giây, thấp hơn 60
  lần. Đây là bù độ trễ, KHÔNG phải nới trần.

    python3 tools/kho_vnd_lo.py --thu             # chạy thử, không ghi
    python3 tools/kho_vnd_lo.py --sau 30          # lượt EOD hằng ngày (nhanh nhất)
    python3 tools/kho_vnd_lo.py --sau 300         # bồi lại phần Vietstock đã ghi đè
    python3 tools/kho_vnd_lo.py --tang gia --ma HPG VNM
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
API = "https://api-finfo.vndirect.com.vn/v4/"

KHO_TRAN = 1000     # kho giữ bao nhiêu phiên — KHÔNG BAO GIỜ dùng chung với SAU_TRAN
SIZE_TRAN = 20000   # trần `size` của nguồn, đo được
LO_TRAN = 40        # trần số mã một lô; URL dài quá thì nguồn từ chối
LUONG = 6
CHO_TOI_DA = 40     # giây; treo lâu hơn thì cắt và gọi lại
NHIP = 1.0          # giây tối thiểu giữa hai lượt BẮT ĐẦU
LECH_TOI = 0.05     # trung vị lệch tối đa được phép đè tầng giá

_lan_cuoi = [0.0]
_khoa = threading.Lock()

# stock_prices -> tên trường trong kho. CÙNG NGHĨA với Vietstock.
GIA = {"basicPrice": "tc", "open": "o", "high": "h", "low": "l", "close": "c",
       "average": "vwap", "nmVolume": "mv", "nmValue": "mval",
       "ptVolume": "pv", "ptValue": "pval"}
GIA_NHAN = ("tc", "o", "h", "l", "c", "vwap")     # trường phải nhân hệ số đơn vị

FN = (("buyVal", "fnMuaTG"), ("sellVal", "fnBanTG"),
      ("buyVol", "fnMuaTKL"), ("sellVol", "fnBanTKL"),
      ("currentRoom", "fnRoomV"), ("totalRoom", "fnRoomTong"))
TD = (("buyingVal", "tdMuaTG"), ("sellingVal", "tdBanTG"),
      ("buyingVol", "tdMuaTKL"), ("sellingVol", "tdBanTKL"))

TANG = {
    "gia": {"ep": "stock_prices", "ngay": "date"},
    "fn":  {"ep": "foreigns", "ngay": "tradingDate"},
    "td":  {"ep": "proprietary_trading", "ngay": "date"},
    "sh":  {"ep": "ratios", "ngay": "reportDate"},
}


def _doc_so(av, ten, mac_dinh):
    if ten in av:
        i = av.index(ten)
        if i + 1 < len(av):
            try:
                return int(av[i + 1])
            except ValueError:
                pass
    return mac_dinh


AV = sys.argv[1:]
THU = "--thu" in AV
SAU_TRAN = _doc_so(AV, "--sau", 300)


def _nhip():
    """Chặn tới khi đủ khoảng cách với lượt gọi trước — dùng chung cho mọi luồng."""
    while True:
        with _khoa:
            cho = _lan_cuoi[0] + NHIP - time.monotonic()
            if cho <= 0:
                _lan_cuoi[0] = time.monotonic()
                return
        time.sleep(cho)


def xin_lo(tang, ma, size):
    """Trả {mã: [dòng]}. Lượt hỏng thì CHIA ĐÔI LÔ thử lại, tới tận từng mã."""
    t = TANG[tang]
    q = "code:%s" % ",".join(ma)
    if tang == "sh":
        q += "~ratioCode:OUTSTANDING_SHARES"
    url = "%s%s?q=%s&sort=%s:desc&size=%d" % (API, t["ep"], q, t["ngay"], size)
    _nhip()
    try:
        rows = (json.loads(nhipmang.get(url, timeout=CHO_TOI_DA)).get("data") or [])
    except Exception:
        if len(ma) == 1:
            print("    ! %s/%s: nguồn trả hỏng, bỏ qua" % (tang, ma[0]), flush=True)
            return {}
        g = len(ma) // 2
        print("    ! lô %d mã (%s) trả hỏng -> chia đôi" % (len(ma), tang), flush=True)
        ra = xin_lo(tang, ma[:g], size // 2 or 1)
        ra.update(xin_lo(tang, ma[g:], size // 2 or 1))
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


def gop_gia(rows, cu, d_cu, bao):
    """{ngày: {trường: giá trị}} cho tầng giá, kèm cổng an toàn. Trả None nếu không đè."""
    hs = he_so(rows, cu, d_cu)
    if hs is None:
        bao["gia"] = "khong_do_duoc_don_vi"
        return None
    bang = {}
    for r in rows:
        d = r.get("date")
        if not d:
            continue
        o = {}
        for k, v in GIA.items():
            x = r.get(k)
            if x is not None:
                o[v] = round(x * hs) if v in GIA_NHAN else round(x)
        if o:
            bang[d] = o
    if not bang:
        return None
    # CỔNG AN TOÀN: đo lệch trên phần chồng nhau TRƯỚC khi thay số.
    lech = []
    for k in ("c", "mval"):
        cv = cu.get(k) or []
        for d0, o0 in bang.items():
            i = d_cu.get(d0)
            if i is not None and i < len(cv) and cv[i] and o0.get(k):
                lech.append(abs(o0[k] / cv[i] - 1))
    tv = _tv(lech)
    if tv is not None and tv > LECH_TOI:
        bao["gia"] = "bo_de"
        return None
    return bang


def gop_dong(rows, khoa, ngay_khoa):
    """{ngày: {trường: giá trị}} cho tầng khối ngoại / tự doanh."""
    bang = {}
    for r in rows:
        d = r.get(ngay_khoa)
        if not d:
            continue
        o = {}
        for k, v in khoa:
            x = r.get(k)
            if x is not None:
                o[v] = round(x)
        if o:
            bang.setdefault(d, {}).update(o)
    return bang


def gop_sh(rows, ngay):
    """Số cổ phiếu lưu hành áp cho từng phiên.

    `ratios` trả theo KỲ BÁO CÁO và **có cả kỳ TƯƠNG LAI** (FPT trả 2026-09-30) — lấy bừa
    bản ghi mới nhất là gán số của quý chưa tới cho phiên hôm nay. Lấy kỳ mới nhất mà
    `reportDate <= ngày phiên`.
    """
    ky = sorted((r.get("reportDate"), r.get("value")) for r in rows
                if r.get("reportDate") and r.get("value"))
    # ── BỎ GAI NHỌN. Đã trả giá 22/08/2026: `ratios` trả OUTSTANDING_SHARES =
    #    34.168.189.983 cho BKG ở một kỳ 2024, trong khi số thật là 71.609.020 (khớp
    #    `universe.json`) — SAI GẤP 477 LẦN, và tool nhận bừa nên vốn hoá của mã đó ở quãng
    #    ấy nhảy lên hàng chục nghìn tỷ. 9 mã dính.
    #    Lọc theo HÌNH DẠNG chứ không theo ngưỡng tuyệt đối: pha loãng thật thì tăng rồi Ở
    #    LẠI (HPG 2,1 → 8,4 tỷ cp), còn gai nhọn thì vọt lên một kỳ rồi tụt về. Nên chỉ bỏ
    #    điểm nào lớn hơn 5 lần CẢ HAI hàng xóm (hoặc nhỏ hơn 1/5 cả hai).
    if len(ky) >= 3:
        sach = [ky[0]]
        for i in range(1, len(ky) - 1):
            v, a, b = ky[i][1], ky[i - 1][1], ky[i + 1][1]
            if v > 5 * max(a, b) or v < min(a, b) / 5:
                continue
            sach.append(ky[i])
        sach.append(ky[-1])
        ky = sach
    # ── LUẬT THỨ HAI: BỎ Ô LỚN HƠN 5 LẦN GIÁ TRỊ MỚI NHẤT ──
    # Luật gai-nhọn ở trên chỉ bắt được ô rác đứng MỘT MÌNH. DPC và HOT có ô rác kéo dài
    # HAI KỲ liền nên lọt lưới: DPC 2.237.280 -> 22.372.800 -> về lại 2.237.280 (đúng ×10),
    # HOT 7.999.937 -> 80.000.000 -> về lại. Đối chiếu độc lập với `universe.json` (nguồn
    # Simplize) thì con số NHỎ mới đúng ở cả hai.
    # Số cổ phiếu chỉ đi LÊN theo thời gian (pha loãng); một kỳ quá khứ lớn gấp 5 lần kỳ
    # mới nhất là chuyện gần như không xảy ra ở thị trường Việt Nam — gộp ngược cổ phiếu
    # cực hiếm. Nên đây là dấu hiệu rác chứ không phải sự kiện.
    # KIỂM CHÉO trước khi đặt luật: HKT 6,1 -> 33,3 triệu và F88 8,5 -> 220 triệu đều là
    # tăng vốn THẬT (khớp `universe.json`) và cả hai đều KHÔNG bị luật này đụng tới.
    if ky:
        moi_nhat = ky[-1][1]
        ky = [x for x in ky if x[1] <= 5 * moi_nhat]
    if not ky:
        return {}
    ra = {}
    for d in ngay:
        v = None
        for rd, x in ky:
            if rd <= d:
                v = x
            else:
                break
        if v:
            ra[d] = {"sh": round(v)}
    return ra


def mot(sym, theo, tangs):
    """Trộn dữ liệu của một mã vào kho. Trả dict trạng thái từng tầng."""
    p = os.path.join(GD, sym + ".json")
    bao = {}
    if not os.path.exists(p):
        return {"file": "khong_co"}
    try:
        cu = json.load(open(p, encoding="utf-8"))
    except Exception:
        return {"file": "doc_hong"}
    d_cu = {d: i for i, d in enumerate(cu.get("d") or [])}

    bang = {}
    de_gia = set()
    for t in tangs:
        rows = (theo.get(t) or {}).get(sym) or []
        if t != "sh":
            rows = rows[:SAU_TRAN]          # nguồn trả mới->cũ
        if not rows:
            bao[t] = "rong"
            continue
        if t == "gia":
            g = gop_gia(rows, cu, d_cu, bao)
            if g:
                de_gia = set(GIA.values())
                for d, o in g.items():
                    bang.setdefault(d, {}).update(o)
                bao[t] = "ok"
        elif t in ("fn", "td"):
            for d, o in gop_dong(rows, FN if t == "fn" else TD,
                                 TANG[t]["ngay"]).items():
                bang.setdefault(d, {}).update(o)
            bao[t] = "ok"
        else:
            ngay = sorted(set(list(d_cu) + list(bang)))[-SAU_TRAN:]
            for d, o in gop_sh(rows, ngay).items():
                bang.setdefault(d, {}).update(o)
            bao[t] = "ok"

    if not bang or THU:
        return bao

    # ── TRỘN. Tầng giá ĐÈ (VNDirect là nguồn chính); mọi tầng khác chỉ ghi trường RIÊNG
    #    của VNDirect, nên đè hay không cũng là số của chính nó. Ô ngoài phần mới về giữ
    #    nguyên từng ô — `KHO_TRAN` chứ không phải `SAU_TRAN` (bẫy 3).
    d_moi = sorted(set(list(d_cu) + list(bang)))[-KHO_TRAN:]
    ra = {"sym": sym, "d": d_moi, "n": len(d_moi)}
    for k in ("v", "sid", "day"):
        if k in cu:
            ra[k] = cu[k]
    # CHỈ COI LÀ CỘT KHI ĐỘ DÀI BẰNG ĐÚNG `d`. Kho có field kiểu list mà KHÔNG PHẢI cột
    # theo phiên — `shLa` là danh sách ≤20 bậc nhảy lạ của số cổ phiếu (`[[ngày, tỉ lệ], …]`).
    # Không chặn thì vòng trộn bên dưới đọc `cv[i]` theo chỉ số PHIÊN và đắp `None` cho phần
    # còn lại, biến nó thành một cột 1.000 ô rác trông y như thật. Cùng cái guard đã đặt ở
    # `eod_ghi` — nơi nào gom "mọi field list" thành cột đều phải có nó.
    cot = {x for x in cu
           if isinstance(cu[x], list) and x != "d" and len(cu[x]) == len(cu.get("d") or [])}
    cot |= {k for o in bang.values() for k in o}
    for k in sorted(cot):
        cv = cu.get(k) or []
        # `sh` PHẢI ĐÈ, KHÔNG ĐƯỢC CHỈ LẤP TRỐNG. Đã trả giá 22/08/2026: một ô rác ghi
        # vào rồi thì lượt sau không sửa được nữa — BKG giữ nguyên 34.168.189.983 (sai gấp
        # 477 lần) dù nguồn đã lọc sạch, vì ô đó "đã có số" nên bị bỏ qua. Kho phải sửa
        # được bằng cách chạy lại công cụ, bằng không mọi bộ lọc thêm vào sau đều vô dụng.
        vnd = (k in de_gia) or k.endswith("TG") or k.endswith("TKL") \
            or k in ("fnRoomV", "fnRoomTong", "sh")
        arr = []
        for d in d_moi:
            i = d_cu.get(d)
            v = cv[i] if (i is not None and i < len(cv)) else None
            m = (bang.get(d) or {}).get(k)
            if m is not None and (vnd or v is None):
                v = m                       # tầng VNDirect thì đè, còn lại chỉ lấp trống
            arr.append(v)
        # BỎ CỘT RỖNG HOÀN TOÀN — client đọc `o.get(k) || []` nên cột vắng và cột toàn
        # null là một, mà mảng 1.000 chữ "null" tốn ~5 KB mỗi cột.
        if any(x is not None for x in arr):
            ra[k] = arr
    # ── QUÉT CUỐI TRÊN CỘT `sh` ĐÃ GHI ──────────────────────────────────────────────
    # `gop_sh` chỉ lọc được phần NÓ sinh ra. Ô nào nằm trước kỳ báo cáo cũ nhất của `ratios`
    # thì không có gì đè lên, nên giá trị rác cũ (do `neo_slcp` suy từ `shR` của Vietstock)
    # ở lại nguyên. PEG dính đúng vậy: đầu chuỗi 2.318.989.190 trong khi cuối chuỗi
    # 233.172.983 và `universe.json` ghi 248.877.472 — sai gấp 10, và nó ngồi ngay đầu đồ
    # thị vốn hoá. Cùng một luật: số cổ phiếu chỉ đi lên, ô quá khứ lớn gấp 5 lần ô mới
    # nhất là rác. Xoá chứ không sửa — thà để trống còn hơn đoán.
    if "sh" in ra:
        v = ra["sh"]
        cuoi = next((x for x in reversed(v) if x), None)
        if cuoi:
            ra["sh"] = [None if (x and x > 5 * cuoi) else x for x in v]
            if not any(x is not None for x in ra["sh"]):
                del ra["sh"]
    ra["updated"] = time.strftime("%Y-%m-%d")
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(ra, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)
    return bao


def main():
    if "--tang" in AV:
        i = AV.index("--tang")
        tangs = [x for x in AV[i + 1].split(",") if x in TANG] if i + 1 < len(AV) else []
    else:
        tangs = ["gia", "fn", "td", "sh"]
    if "--ma" in AV:
        ma = [x.upper() for x in AV[AV.index("--ma") + 1:] if not x.startswith("--")]
    else:
        ma = sorted(f[:-5] for f in os.listdir(GD) if f.endswith(".json"))

    # SIZE gấp đôi nhu cầu để mã ngừng giao dịch vẫn có chỗ; LO suy ngược từ đó.
    sau = 8 if "sh" in tangs and len(tangs) == 1 else SAU_TRAN
    lo_n = max(1, min(LO_TRAN, SIZE_TRAN // (2 * max(sau, 1))))
    size = min(SIZE_TRAN, lo_n * sau * 2)
    los = [ma[i:i + lo_n] for i in range(0, len(ma), lo_n)]

    print("  %d mã · %d tầng %s · sâu %d phiên · lô %d mã · %d lượt gọi"
          % (len(ma), len(tangs), "+".join(tangs), SAU_TRAN, lo_n, len(los) * len(tangs)),
          flush=True)

    t0 = time.time()
    dem = {}
    trong = []
    xong = [0]
    kd = threading.Lock()

    def chay(lo):
        theo = {t: xin_lo(t, lo, size if t != "sh" else min(SIZE_TRAN, len(lo) * 200))
                for t in tangs}
        ket = [(s, mot(s, theo, tangs)) for s in lo]
        with kd:
            for s, bao in ket:
                for t, v in bao.items():
                    dem["%s:%s" % (t, v)] = dem.get("%s:%s" % (t, v), 0) + 1
                if bao.get("gia") == "rong":
                    trong.append(s)
            xong[0] += 1
            if xong[0] % 5 == 0 or xong[0] == len(los):
                r = time.time() - t0
                print("    lô %d/%d · %.0fs · ước còn %.1f phút"
                      % (xong[0], len(los), r, (len(los) - xong[0]) * r / xong[0] / 60),
                      flush=True)

    with ThreadPoolExecutor(max_workers=LUONG) as ex:
        list(ex.map(chay, los))

    # LƯỢT VÉT — mã trả rỗng thường là mã ngừng giao dịch, dòng của nó nằm quá sâu nên bị
    # cắt khỏi lô chung. Gọi riêng thì không còn ai tranh chỗ.
    if trong and not THU:
        print("  vét riêng %d mã trả rỗng…" % len(trong), flush=True)

        def vet(s):
            theo = {t: xin_lo(t, [s], size) for t in tangs}
            bao = mot(s, theo, tangs)
            with kd:
                for t, v in bao.items():
                    dem["vét %s:%s" % (t, v)] = dem.get("vét %s:%s" % (t, v), 0) + 1
        with ThreadPoolExecutor(max_workers=LUONG) as ex:
            list(ex.map(vet, trong))

    print("\n  xong %.1f phút%s" % ((time.time() - t0) / 60, "  (CHẠY THỬ)" if THU else ""))
    for k in sorted(dem):
        print("    %-26s %d" % (k, dem[k]))


if __name__ == "__main__":
    main()
