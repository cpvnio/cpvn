"""KHO GIAO DỊCH — số chốt phiên + các lệnh ĐÃ KHỚP THẬT, lấy từ Vietstock.

VÌ SAO CÓ FILE NÀY (20/08/2026)
------------------------------
Kho đang có `data/hist` (giá đã hạ nền + khối lượng) và `data/eod` (ảnh chụp cuối phiên,
mới lập 31/07). Ba lỗ hổng chỉ lộ ra khi đối chiếu bốn nguồn với nhau:

1. **KHỐI LƯỢNG TRONG `data/hist` ĐỔI ĐỊNH NGHĨA GIỮA CHỪNG.** Vietstock và Entrade (nền
   tảng của DNSE) luôn trả khối lượng là **bội số của 100** — khớp lệnh lô chẵn. VNDirect
   thì **không bao giờ** là bội số của 100 vì nó cộng cả **lô lẻ**. Kho mình lấy cả hai:
   ba phiên gần nhất theo ảnh EOD (lô chẵn, đúng), còn ngày cũ hơn thì lượt làm mới hằng
   ngày kéo 260 phiên từ VNDirect và GHI ĐÈ lên con số đúng ấy. Đo 20/08 trên 6 mã × 14
   phiên: **47/84 ô bị viết đè**. VGI 10/08: chụp đúng 441.000, giờ trong kho là 443.552.
   VNZ 14/08: Vietstock và Entrade báo 0, kho báo 47 cổ phiếu — đúng một lệnh lô lẻ.
   Cái độc không nằm ở sai số 0,5%, mà ở chỗ ranh giới giữa hai định nghĩa **trượt dần
   theo thời gian**: mỗi ngày cái mốc lùi thêm một phiên, tạo bước nhảy giả ngay tại vùng
   dữ liệu mới nhất — đúng vùng mọi tín hiệu giao dịch nhìn vào.

2. **KHÔNG CÓ SỐ CỔ PHIẾU THEO NGÀY.** Muốn biết một mã đã tăng bao nhiêu lần thì phải so
   vốn hoá, mà kho chỉ có vốn hoá HÔM NAY. Dựng lại từ chuỗi sự kiện thì vướng phát hành
   riêng lẻ / ESOP / chuyển đổi trái phiếu — `data/sukien` chỉ ghi được 33 mục trên 1.529
   mã, nên số cổ phiếu quá khứ bị thổi phồng và sai số cộng dồn.
   Vietstock trả `MarketCap` từng phiên, và nó CÓ ghi các bậc số cổ phiếu trong quá khứ
   (VCB 14 bậc trên 4.279 phiên) — nhưng **KHÔNG DÙNG THẲNG ĐƯỢC, phải vá hai lớp**: bậc mới
   nhất cập nhật có độ trễ (xem `sua_slcp`), và nguồn có ô rác ở phiên đầu tiên (xem
   `bac_la`). Dùng thẳng thì VHM hiện vốn hoá tụt một nửa qua đêm ngày chia 1:1, còn VGI ra
   "×3.637 lần kể từ ngày lên sàn".

3. **KHÔNG TÁCH ĐƯỢC THOẢ THUẬN KHỎI KHỚP LỆNH.** Một lệnh thoả thuận vài trăm tỷ giữa hai
   bên đã bắt tay xong không nói gì về cung cầu trên sàn, nhưng nó nằm chung trong tổng
   khối lượng và làm hỏng mọi thước đo thanh khoản.

HAI TẦNG DỮ LIỆU
----------------
· `data/giaodich/{MÃ}.json` — MỖI PHIÊN MỘT DÒNG. Giá THÔ (chưa hạ nền), giá TB thật
  (VWAP của sàn, không phải (H+L+C)/3), khớp lệnh và thoả thuận tách riêng cả khối lượng
  lẫn giá trị, và **số cổ phiếu lưu hành** của chính phiên đó (`sh`) — nhân với `c` ra vốn
  hoá. Lưu `sh` chứ không lưu `mcap`: gọn hơn (10 chữ số thay vì 15) và là thứ vá được.
· `data/phien/{NGÀY}.json` — NẾN 1 PHÚT của cả thị trường trong ngày đó, kèm cờ bên chủ
  động. Đây là "các giao dịch đã thực sự khớp lệnh": mỗi điểm là tổng các lệnh đã khớp
  trong phút ấy, `b=1` nghĩa là bên mua chủ động nâng giá lên để khớp.

VÌ SAO GIỮ GIÁ THÔ CHỨ KHÔNG HẠ NỀN
-----------------------------------
Giá hạ nền đã có sẵn ở `data/hist`. Thứ kho đang THIẾU là một chuỗi mà giá và khối lượng
**cùng một gốc**. `data/hist` hạ nền giá nhưng không nhân ngược khối lượng, nên `giá × KL`
sai ở 31% số ô (799/1.529 mã; HPG lệch tới ×17,2 vì hệ số dồn từ 2013). File này giữ
nguyên số thô của sàn, nên `c × v` luôn ra đúng giá trị giao dịch thật.

VÌ SAO MỖI NGÀY MỘT FILE CHO NẾN 1 PHÚT
---------------------------------------
Nếu để mỗi mã một file thì ngày nào cũng sửa 1.529 file, git phải lưu 1.529 blob mới mỗi
ngày. Gộp theo NGÀY thì mỗi ngày chỉ sinh đúng MỘT file mới, file cũ không bao giờ đụng
lại — kho phình tuyến tính và có thể xoá bớt ngày cũ mà không ảnh hưởng gì.
Đo thật 19/08: phần lớn mã gần như không giao dịch (VIC 225 điểm ~4KB, còn BQB/XHC 0 điểm),
nên cả thị trường một ngày chỉ khoảng 1 MB thô, git nén còn ~250 KB.

CHI PHÍ
-------
· Hằng ngày: 1 lượt EOD + 1 lượt nến 1 phút cho mỗi mã = ~3.060 lượt ≈ 13 phút ở 4 lượt/giây.
· Cào bù EOD: Vietstock chặn cứng 20 dòng/lượt, không nới được (thử pageSize tới 2000 vẫn
  trả 20). VCB có 4.279 phiên = 214 trang. Cả thị trường ~327.000 lượt ≈ 22 giờ.
· Cào bù nến 1 phút: kho trong phiên của Vietstock chỉ đầy đủ **từ khoảng 09/2025** (đo
  bằng mẫu 42 ngày giao dịch thật: trước 08/2025 trống hẳn), tức ~250 phiên ≈ 382.000 lượt.
Cả hai lượt cào bù đều CHẠY LẠI ĐƯỢC: đã có file thì bỏ qua, nên cứ chạy nhiều đêm.

ĐỪNG nới trần nhịp mạng để chạy nhanh hơn — xem đầu `nhipmang.py`.
"""

import argparse
import bisect
import datetime
import json
import os
import re
import sys
import time
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNI = os.path.join(BASE, "universe.json")
GD_DIR = os.path.join(BASE, "data", "giaodich")
PHIEN_DIR = os.path.join(BASE, "data", "phien")
VS = "https://finance.vietstock.vn"
TZ = datetime.timezone(datetime.timedelta(hours=7))

# Vietstock trả mốc thời gian dạng /Date(ms)/. PHẢI đọc ở UTC+7 — đọc ở UTC thì mọi phiên
# lùi một ngày, và cái sai đó im lặng vì ngày nào cũng có dữ liệu trông hợp lý.
_MS = re.compile(r"-?\d+")


def _ngay(s):
    ms = int(_MS.search(s).group())
    return datetime.datetime.fromtimestamp(ms / 1000, TZ).strftime("%Y-%m-%d")


def _phut(s):
    ms = int(_MS.search(s).group())
    t = datetime.datetime.fromtimestamp(ms / 1000, TZ)
    return t.hour * 60 + t.minute


# ── phiên làm việc với Vietstock ──────────────────────────────────────────────
# Các endpoint dữ liệu đòi `__RequestVerificationToken` cào từ chính trang HTML, và token
# đó chỉ có giá trị cùng với cookie phiên. Không cần tài khoản.
_tok = {"v": None, "ck": None, "luc": 0}


def token(ep=False):
    """Lấy (token, cookie). ep=True để ép làm mới khi nguồn bắt đầu trả về trang HTML."""
    if _tok["v"] and not ep and time.time() - _tok["luc"] < 1800:
        return _tok["v"], _tok["ck"]
    import urllib.request
    rq = urllib.request.Request(
        VS + "/VCB/thong-ke-giao-dich.htm", headers={"User-Agent": nhipmang.UA})
    with urllib.request.urlopen(rq, timeout=30) as r:
        html = r.read().decode("utf-8", "replace")
        ck = "; ".join(v.split(";")[0] for k, v in r.getheaders()
                       if k.lower() == "set-cookie")
    m = re.search(r"id=__CHART_AjaxAntiForgeryForm[^>]*><input name=__RequestVerificationToken"
                  r" type=hidden value=([A-Za-z0-9_-]+)", html)
    if not m:
        raise RuntimeError("không tìm thấy __RequestVerificationToken trên trang Vietstock")
    _tok.update(v=m.group(1), ck=ck, luc=time.time())
    return _tok["v"], _tok["ck"]


def goi(path, data, sym):
    """POST tới endpoint dữ liệu. Trả về dict/list đã parse, hoặc None nếu nguồn từ chối.

    Nguồn KHÔNG trả lỗi HTTP khi token hỏng — nó trả về nguyên trang HTML 220KB. Nếu chỉ
    bắt HTTPError thì mình sẽ tưởng "mã này không có dữ liệu" và ghi rỗng đè lên số đúng.
    Nên: thấy không phải JSON thì làm mới token và thử lại đúng một lần.
    """
    for lan in (0, 1):
        tk, ck = token(ep=(lan == 1))
        d = dict(data)
        d["__RequestVerificationToken"] = tk
        try:
            b = nhipmang.post(VS + path, d, headers={
                "X-Requested-With": "XMLHttpRequest",
                "Referer": f"{VS}/{sym}/thong-ke-giao-dich.htm",
                "Cookie": ck or "",
            })
        except Exception:
            return None
        s = b.lstrip("﻿").lstrip()
        if s[:1] in "{[":
            try:
                return json.loads(s)
            except Exception:
                return None
    return None


# ── tầng 1: số chốt phiên ─────────────────────────────────────────────────────
COT = ("d", "tc", "o", "h", "l", "c", "vwap", "mv", "mval", "pv", "pval", "sh",
       "cfU", "cfF", "cfD")


def eod_trang(sym, trang, tu, den):
    j = goi("/data/GetStockDeal_ListPriceByTimeFrame", {
        "stockCode": sym, "timeFrame": "D", "fromDate": tu, "toDate": den,
        "page": trang, "pageSize": 20, "languageID": 1}, sym)
    if not isinstance(j, dict):
        return [], 0
    dat = j.get("data") or {}
    tong = 0
    tt = dat.get("ListPrice_Summary_Results") or []
    if tt:
        tong = tt[0].get("TotalRow") or 0
    return dat.get("ListPrice_Results") or [], tong


def eod_nap(sym, day_du=False, tu="2000-01-01", den=None):
    """Trả về dict {ngày: bản ghi}. day_du=True thì lật hết trang."""
    den = den or datetime.datetime.now(TZ).strftime("%Y-%m-%d")
    ra, trang, tong = {}, 1, None
    while True:
        rows, t = eod_trang(sym, trang, tu, den)
        if tong is None:
            tong = t
        if not rows:
            break
        for r in rows:
            ra[_ngay(r["TradingDate"])] = {
                "tc": r.get("BasicPrice"), "o": r.get("OpenPrice"), "h": r.get("HighestPrice"),
                "l": r.get("LowestPrice"), "c": r.get("ClosePrice"), "vwap": r.get("AvrPrice"),
                "mv": r.get("M_TotalVol"), "mval": r.get("M_TotalVal"),
                "pv": r.get("PT_TotalVol"), "pval": r.get("PT_TotalVal"),
                # KHÔNG lưu MarketCap của nguồn — nó chỉ là `giá × SLCP`, không mang thêm
                # thông tin nào ngoài SLCP. Lưu SLCP vừa gọn hơn nhiều (10 chữ số thay vì
                # 15) vừa là thứ VÁ ĐƯỢC khi nguồn sai, còn vốn hoá thì không.
                "sh": (round(r["MarketCap"] / r["ClosePrice"])
                       if r.get("MarketCap") and r.get("ClosePrice") else None),
            }
        if not day_du or len(ra) >= (tong or 0) or trang > 400:
            break
        trang += 1
    return ra


def sua_slcp(d, shv, ev):
    """VÁ SLCP suy từ nguồn. Vietstock CÓ ghi các bậc SLCP trong quá khứ (VCB 14 bậc trên
    4.279 phiên), nhưng cập nhật bậc mới có ĐỘ TRỄ — nên với mã vừa có sự kiện quyền, SLCP
    hôm nay bị áp ngược cho cả quãng TRƯỚC sự kiện.

    Đo được 20/08/2026 trên VHM (chia cổ phiếu 1:1 ngày 06/08): nguồn giữ nguyên
    4.107.412.004 cổ phiếu suốt từ 27/11/2024 tới nay, nên vốn hoá 04/08 hiện ra 628 nghìn
    tỷ rồi tụt còn 300 nghìn tỷ ngay hôm sau — trong khi thực tế chỉ là chia đôi mệnh giá,
    vốn hoá gần như không đổi. SLCP đúng của ngày 04/08 phải là 2.053.706.002.

    Cách vá: với mỗi sự kiện làm đổi số cổ phiếu, xem chuỗi SLCP của nguồn CÓ bậc ở đúng
    ngày GDKHQ không. Có rồi thì để yên. Không có thì chia ngược toàn bộ quãng trước đó.
    Đi từ sự kiện MỚI NHẤT về trước để các hệ số nhân dồn đúng thứ tự.
    """
    sh = [float(x) if x else None for x in shv]
    if not sh:
        return shv, 0
    su = sorted((e for e in ev
                 if e.get("k") in ("cp", "thuong", "quyenmua") and e.get("tl")),
                key=lambda e: e["d"], reverse=True)
    va = 0
    for e in su:
        i = bisect.bisect_left(d, e["d"])          # phiên đầu tiên KỂ TỪ ngày GDKHQ
        if i <= 0 or i >= len(sh):
            continue
        truoc, sau = shv[i - 1], shv[i]
        if not truoc or not sau:
            continue
        f = 1 + e["tl"] / 100.0
        if abs((sau / truoc) / f - 1) <= 0.02:
            continue                              # nguồn đã ghi nhận bậc này rồi
        for j in range(i):
            if sh[j]:
                sh[j] /= f
        va += 1
    return [round(x) if x else x for x in sh], va


def bac_la(d, sh, ev):
    """Tìm BẬC SLCP KHÔNG GIẢI THÍCH ĐƯỢC — nguồn có ô rác, và ô rác ở phiên ĐẦU TIÊN thì
    đẻ ra con số to nhất bảng.

    VGI: nguồn ghi 6.481.323 cổ phiếu cho đúng MỘT phiên 14/09/2018, rồi 2.243.811.200 từ
    25/09/2018 — nhảy 346 lần trong 11 ngày mà không sự kiện nào giải thích (phiên lẻ ấy
    nhiều khả năng là ngày đấu giá/tham chiếu trước niêm yết). Để yên thì "tổng lợi suất kể
    từ ngày lên sàn" của VGI ra **×3.637**, đứng đầu mọi bảng xếp hạng — sai mà lại ở đúng
    chỗ dễ thấy nhất, y hệt ca VNX ×1818 của `kho_chaosan`.

    KHÔNG tự sửa: không có cách nào biết vế nào đúng. Chỉ GHI RA để nơi dùng tự quyết —
    thà để trống còn hơn hiện số không kiểm được.
    """
    if not sh:
        return []
    ngay_sk = {}
    for e in ev:
        if e.get("k") in ("cp", "thuong", "quyenmua") and e.get("tl"):
            ngay_sk[e["d"]] = 1 + e["tl"] / 100.0
    la = []
    for i in range(1, len(sh)):
        a, b = sh[i - 1], sh[i]
        if not a or not b or abs(b / a - 1) <= 0.02:
            continue
        # sự kiện rơi trong khoảng 5 phiên quanh đây thì coi như giải thích được
        gan = False
        for j in range(max(0, i - 5), min(len(d), i + 6)):
            f = ngay_sk.get(d[j])
            if f and abs((b / a) / f - 1) <= 0.05:
                gan = True
                break
        if not gan:
            la.append([d[i], round(b / a, 4)])
    return la


def _sukien(sym):
    p = os.path.join(BASE, "data", "sukien", f"{sym}.json")
    try:
        return json.load(open(p, encoding="utf-8")).get("ev") or []
    except Exception:
        return []


def eod_ghi(sym, moi):
    """Trộn vào file cũ. GIỮ ngày cũ, chỉ thêm/cập nhật ngày có trong `moi`."""
    p = os.path.join(GD_DIR, f"{sym}.json")
    cu = {}
    if os.path.exists(p):
        try:
            o = json.load(open(p, encoding="utf-8"))
            for i, d in enumerate(o.get("d") or []):
                cu[d] = {k: (o.get(k) or [None] * len(o["d"]))[i] for k in COT if k != "d"}
        except Exception:
            cu = {}
    # TRỘN THEO TỪNG TRƯỜNG, đừng `cu.update(moi)`.
    # `update` thay CẢ bản ghi của ngày đó — nên lượt ghi dòng tiền (chỉ có cfU/cfF/cfD)
    # xoá sạch giá, khối lượng, SLCP của chính ngày ấy. Đã dính đúng vậy 20/08/2026: sau
    # khi chạy tầng nến 1 phút thì `mv` của cả 6 mã về 0, mà không lỗi nào báo.
    for d, r in moi.items():
        cu.setdefault(d, {}).update(r)
    ngay = sorted(cu)
    doc = {"sym": sym, "updated": datetime.datetime.now(TZ).strftime("%Y-%m-%d"),
           "n": len(ngay), "d": ngay}
    for k in COT:
        if k == "d":
            continue
        doc[k] = [cu[d].get(k) for d in ngay]
    ev = _sukien(sym)
    doc["sh"], doc["shVa"] = sua_slcp(ngay, doc["sh"], ev)
    la = bac_la(ngay, doc["sh"], ev)
    if la:
        doc["shLa"] = la[:20]
    # BẬC RÁC Ở ĐẦU CHUỖI -> BỎ HẲN `sh` của quãng đó, đừng để ai tính ra "×3.637 lần".
    # Hẹp có chủ ý: chỉ khi bậc lạ ĐẦU TIÊN nhảy quá 10 lần VÀ nằm trong 5 phiên đầu — đúng
    # hình dạng của ô rác (VGI: một phiên lẻ 14/09/2018 trước ngày niêm yết thật 25/09).
    # Phát hành thật thì không bao giờ có hình dạng đó, nên luật này không đụng vào số đúng.
    if la and la[0][1] > 10:
        i = ngay.index(la[0][0])
        if i <= 5:
            for j in range(i):
                doc["sh"][j] = None
    os.makedirs(GD_DIR, exist_ok=True)
    tmp = p + ".tmp"
    json.dump(doc, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)
    return len(ngay)


# ── tầng 2: nến 1 phút của các lệnh đã khớp ───────────────────────────────────
def phien_mot(sym, ngay):
    """Nến 1 phút cho một mã một ngày. interval=1 là BẮT BUỘC — thiếu nó nguồn trả về
    nguyên trang HTML chứ không báo lỗi.

    KHÔNG LƯU `IsBuy` — nó KHÔNG phải cờ bên chủ động, dù tên gọi đúng như vậy. Đo
    20/08/2026: endpoint nến 1 phút trả `true` cho **226/226** điểm của VCB, HPG và VHM;
    endpoint từng lệnh khớp trả `false` cho **108/108** lệnh lấy rải rác 6 trang (1, 50,
    120, 200, 300, 371) — và cùng lúc `Change` cũng là hằng số −600 = chênh so với THAM
    CHIẾU cả phiên. Tức đây là cờ tô màu dòng theo giá so với tham chiếu, không phải bên
    nào chủ động khớp. Lưu nó vào kho là mọi phép đo lực mua/bán về sau đọc ra "100% mua
    chủ động". Lực mua bán thật lấy ở `dongtien()`.
    """
    j = goi("/Data/GetStockDealDetailChartByDate",
            {"code": sym, "interval": 1, "tradingDate": ngay}, sym)
    if not isinstance(j, dict):
        return None
    r = j.get("Deal_DetailChart_Results") or []
    if not r:
        return {}                      # mã không khớp lệnh nào hôm đó — khác với LỖI
    t, p, v = [], [], []
    for x in r:
        t.append(_phut(x["TradingDate"]))
        p.append(int(x.get("Price") or 0))
        v.append(int(x.get("Vol") or 0))
    return {"t": t, "p": p, "v": v}


def dongtien(sym, ngay):
    """LỰC MUA / BÁN THẬT — giá trị khớp lệnh tách theo HƯỚNG GIÁ của lệnh.

    `Deal_CashFlow_Results` chia giá trị cả phiên làm ba theo `StateChange`: +1 khớp ở giá
    CAO HƠN lệnh trước (bên mua chủ động nâng giá) · 0 đứng giá · −1 khớp ở giá THẤP HƠN
    (bên bán chủ động hạ giá).

    Nó đi KÈM MIỄN PHÍ ở trang 1 của endpoint từng lệnh khớp, nên tốn đúng 1 lượt/mã/ngày
    thay vì 372 trang. Đã kiểm 20/08/2026 trên 5 cặp (mã, ngày): tổng ba phần bằng ĐÚNG
    `M_TotalVal` của phiên đó — tỉ lệ 1,000× cả 5 — và biến thiên có nghĩa (VCB 19/08 bán
    xuống 210 tỷ, 18/08 mua lên 89 tỷ). Nó tính trên KHỚP LỆNH, KHÔNG gồm thoả thuận —
    HPG 19/08: dòng tiền 322,00 tỷ = `mval` 322,00 tỷ, trong khi `pval` 31,75 tỷ đứng ngoài.

    NGHI VẤN CHƯA GIẢI THÍCH ĐƯỢC — `kiem()` phép ④ canh chỗ này. HCC ngày 19/08 ra
    **1,231×** thay vì 1,000×, và 19/08 đúng là ngày HCC chốt quyền (tiền 3.000đ + cp 10%),
    hệ số hạ nền đo được của nó là 1,2346. Hai số gần nhau nhưng KHÔNG trùng (lệch 0,3%),
    và mới có MỘT mẫu — nên đừng chép lại thành "nguyên nhân là hạ nền". Nếu phép ④ cho
    thấy chỗ lệch luôn rơi vào ngày GDKHQ thì mới kết luận được.
    """
    j = goi("/data/GetStockDealDetailPagingByDate_v2",
            {"code": sym, "page": 1, "pageSize": 20, "tradingDate": ngay}, sym)
    if not isinstance(j, dict):
        return None
    cf = {x.get("StateChange"): x.get("CashFlow")
          for x in ((j.get("result") or {}).get("Deal_CashFlow_Results") or [])}
    if not cf:
        return None
    return {"cfU": cf.get(1) or 0, "cfF": cf.get(0) or 0, "cfD": cf.get(-1) or 0}


def phien_ghi(ngay, goi_ma):
    os.makedirs(PHIEN_DIR, exist_ok=True)
    p = os.path.join(PHIEN_DIR, f"{ngay}.json")
    doc = {"date": ngay, "n": len(goi_ma), "ma": goi_ma}
    tmp = p + ".tmp"
    json.dump(doc, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)
    return os.path.getsize(p)


# ── đối chiếu ─────────────────────────────────────────────────────────────────
def entrade(sym, t0, t1):
    """Nguồn ĐỘC LẬP để soi lại: chart API của Entrade (nền tảng của DNSE), mở, không cần
    khoá. Dùng để bắt lỗi chứ không để lấy dữ liệu — số liệu không đối chiếu thì không
    biết mình đang cầm định nghĩa nào."""
    try:
        s = nhipmang.get("https://services.entrade.com.vn/chart-api/v2/ohlcs/stock"
                         f"?from={t0}&to={t1}&symbol={sym}&resolution=1D")
        j = json.loads(s)
    except Exception:
        return {}
    ra = {}
    for i, t in enumerate(j.get("t") or []):
        d = datetime.datetime.fromtimestamp(t, TZ).strftime("%Y-%m-%d")
        ra[d] = {"c": round(j["c"][i] * 1000), "v": j["v"][i]}
    return ra


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ma", nargs="*", help="giới hạn ở vài mã (để chạy thử)")
    ap.add_argument("--eod", action="store_true", help="chỉ làm tầng số chốt phiên")
    ap.add_argument("--phien", action="store_true", help="chỉ làm tầng nến 1 phút")
    ap.add_argument("--tatca", action="store_true",
                    help="cào bù EOD: lật HẾT trang (~22 giờ cho cả thị trường)")
    ap.add_argument("--ngay", help="nến 1 phút cho ngày này (mặc định: phiên gần nhất)")
    ap.add_argument("--tu", help="cào bù nến 1 phút từ ngày này")
    ap.add_argument("--den", help="… tới ngày này")
    ap.add_argument("--kiem", action="store_true", help="đối chiếu chéo với Entrade sau khi chạy")
    a = ap.parse_args()
    lam_eod = a.eod or not a.phien
    lam_phien = a.phien or not a.eod

    u = json.load(open(UNI, encoding="utf-8"))["stocks"]
    ma = [s["sym"] for s in u]
    if a.ma:
        xin = {x.upper() for x in a.ma}
        ma = [m for m in ma if m in xin]
    print(f"  {len(ma)} mã", flush=True)

    if lam_eod:
        t0 = time.time()
        ok = loi = 0
        tong_ngay = 0
        for i, m in enumerate(ma):
            try:
                moi = eod_nap(m, day_du=a.tatca)
            except Exception:
                loi += 1
                continue
            if not moi:
                loi += 1
                continue
            tong_ngay += eod_ghi(m, moi)
            ok += 1
            if (i + 1) % 200 == 0:
                print(f"    …{i+1}/{len(ma)}  {time.time()-t0:.0f}s", flush=True)
        print(f"  số chốt phiên: ok {ok} · lỗi {loi} · tổng {tong_ngay:,} dòng"
              f" · {time.time()-t0:.0f}s", flush=True)

    if lam_phien:
        ngays = []
        if a.tu:
            d0 = datetime.datetime.strptime(a.tu, "%Y-%m-%d").date()
            d1 = datetime.datetime.strptime(a.den or a.tu, "%Y-%m-%d").date()
            while d0 <= d1:
                if d0.weekday() < 5:
                    ngays.append(d0.strftime("%Y-%m-%d"))
                d0 += datetime.timedelta(days=1)
        else:
            ngays = [a.ngay or datetime.datetime.now(TZ).strftime("%Y-%m-%d")]
        for ng in ngays:
            p = os.path.join(PHIEN_DIR, f"{ng}.json")
            if os.path.exists(p) and a.tu:
                continue                     # cào bù chạy lại được: có rồi thì bỏ qua
            t0 = time.time()
            goi_ma, ok, rong, loi, dt = {}, 0, 0, 0, {}
            for m in ma:
                r = phien_mot(m, ng)
                if r is None:
                    loi += 1
                elif r:
                    goi_ma[m] = r
                    ok += 1
                else:
                    rong += 1
                if r:
                    # Dòng tiền theo hướng giá về KHO NGÀY chứ không vào file phiên: nó là
                    # ba con số cho CẢ phiên, cùng nhịp với các cột chốt phiên khác.
                    c = dongtien(m, ng)
                    if c:
                        dt[m] = {ng: c}
            for m, x in dt.items():          # gom rồi ghi một lượt, đừng đọc-ghi lại file
                eod_ghi(m, x)                 # ~200KB cho từng mã trong vòng lặp
            if not ok:
                print(f"  {ng}: không mã nào khớp lệnh — bỏ qua (nghỉ, hoặc hết lịch sử)",
                      flush=True)
                continue
            kb = phien_ghi(ng, goi_ma) / 1024
            diem = sum(len(x["t"]) for x in goi_ma.values())
            print(f"  {ng}: {ok} mã có khớp lệnh · {rong} mã không · lỗi {loi}"
                  f" · {diem:,} nến 1 phút · {kb:,.0f} KB · dòng tiền {len(dt)} mã"
                  f" · {time.time()-t0:.0f}s", flush=True)

    if a.kiem:
        kiem(ma[:40])
    return 0


def kiem(ma):
    """Ba phép kiểm, mỗi phép bắt một loại lỗi khác nhau."""
    print("\n  ĐỐI CHIẾU", flush=True)
    t1 = int(datetime.datetime.now(TZ).timestamp())
    t0 = t1 - 90 * 86400
    a_ok = a_le = b_ok = b_le = c_ok = c_le = d_ok = d_le = 0
    vd = []
    for m in ma:
        p = os.path.join(GD_DIR, f"{m}.json")
        if not os.path.exists(p):
            continue
        o = json.load(open(p, encoding="utf-8"))
        idx = {d: i for i, d in enumerate(o["d"])}
        # ① khối lượng khớp lệnh phải trùng Entrade (nguồn độc lập)
        E = entrade(m, t0, t1)
        for d, e in E.items():
            i = idx.get(d)
            if i is None or not o["mv"][i]:
                continue
            if o["mv"][i] == e["v"]:
                a_ok += 1
            else:
                a_le += 1
                if len(vd) < 6:
                    vd.append(f"{m} {d}: kho {o['mv'][i]:,} vs Entrade {e['v']:,}")
        # ② tổng khối lượng nến 1 phút phải bằng khối lượng khớp lệnh cả phiên
        for f in sorted(os.listdir(PHIEN_DIR) if os.path.isdir(PHIEN_DIR) else [])[-5:]:
            d = f[:-5]
            i = idx.get(d)
            if i is None or not o["mv"][i]:
                continue
            try:
                g = json.load(open(os.path.join(PHIEN_DIR, f), encoding="utf-8"))["ma"].get(m)
            except Exception:
                continue
            if not g:
                continue
            if sum(g["v"]) == o["mv"][i]:
                b_ok += 1
            else:
                b_le += 1
                if len(vd) < 12:
                    vd.append(f"{m} {d}: nến1p Σ{sum(g['v']):,} vs cả phiên {o['mv'][i]:,}")
        # ③ khối lượng phải là bội số của 100 — lô lẻ lọt vào là biết ngay
        for i, v in enumerate(o["mv"]):
            if v:
                if v % 100 == 0:
                    c_ok += 1
                else:
                    c_le += 1
        # ④ tổng dòng tiền ba hướng phải bằng giá trị khớp lệnh cả phiên
        for i, d in enumerate(o["d"]):
            mval = o["mval"][i]
            u = (o.get("cfU") or [None] * o["n"])[i]
            if not mval or u is None:
                continue
            t = u + ((o.get("cfF") or [0] * o["n"])[i] or 0) \
                  + ((o.get("cfD") or [0] * o["n"])[i] or 0)
            if abs(t / mval - 1) <= 0.01:
                d_ok += 1
            else:
                d_le += 1
                if len(vd) < 18:
                    vd.append(f"{m} {d}: Σ dòng tiền/GTGD = {t/mval:.3f}×")
    print(f"    ① KL khớp lệnh = Entrade(DNSE) : {a_ok:,} khớp · {a_le:,} lệch")
    print(f"    ② Σ nến 1 phút = KL cả phiên   : {b_ok:,} khớp · {b_le:,} lệch")
    print(f"    ③ KL là bội số của 100         : {c_ok:,} đúng · {c_le:,} SAI (lô lẻ lọt vào)")
    print(f"    ④ Σ dòng tiền = GTGD khớp lệnh : {d_ok:,} khớp · {d_le:,} lệch")
    for x in vd:
        print("      ·", x)


if __name__ == "__main__":
    sys.exit(main())
