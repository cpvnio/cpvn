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
       "bMua", "bMuaKL", "bBan", "bBanKL", "nMua", "nBan", "qMua", "qBan")


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
    ra, trang, tong, sid = {}, 1, None, [None]
    while True:
        rows, t = eod_trang(sym, trang, tu, den)
        if tong is None:
            tong = t
        if not rows:
            break
        for r in rows:
            if sid[0] is None:
                sid[0] = r.get("StockID")     # cần cho `dl_nap`, nguồn chỉ nhận stockID số
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
    return ra, sid[0]


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


def eod_ghi(sym, moi, sid=None):
    """Trộn vào file cũ. GIỮ ngày cũ, chỉ thêm/cập nhật ngày có trong `moi`."""
    p = os.path.join(GD_DIR, f"{sym}.json")
    cu, cu_sid = {}, sid
    if os.path.exists(p):
        try:
            o = json.load(open(p, encoding="utf-8"))
            cu_sid = cu_sid or o.get("sid")
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
    if cu_sid:
        doc["sid"] = cu_sid
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


# ── tầng 2: TOÀN THỊ TRƯỜNG THEO NGÀY — một lượt gọi cho ~200 mã ──────────────
# Trang `finance.vietstock.vn/ket-qua-giao-dich` dùng bộ endpoint KHÁC hẳn bộ của trang
# từng mã: khi không chỉ định mã, nó hỏi theo SÀN + NGÀY và trả về cả trăm mã một lượt.
# Tìm ra bằng cách tải `/bundles/kqgd/jsx` rồi lần theo `vst.io.post("/data/"+u, ...)`.
#
# CHI PHÍ ĐỔI HẲN BẬC: 3 sàn × ~4 trang × 2 endpoint = ~20 lượt cho CẢ THỊ TRƯỜNG một
# ngày, thay vì 1.529 lượt/ngày của đường hỏi từng mã. Cào bù cả cửa sổ lịch sử (~250
# phiên) chỉ còn ~5.000 lượt ≈ 21 phút.
TT_SAN = {1: "HOSE", 2: "HNX", 3: "UPCOM"}   # catID; 4 = VN30 (tập con, đừng lấy)
TT_TRANG = 200                                # trần cứng, xin 1000 vẫn trả 200

# Cột lấy từ THỐNG KÊ ĐẶT LỆNH — đây là "sổ lệnh khi chốt phiên": giá và khối lượng ở
# bước giá tốt nhất lúc đóng cửa, số lệnh đặt mua/bán, tổng khối lượng đặt mua/bán.
DL = {"BestBuy": "bMua", "BestBidVol": "bMuaKL", "BestSell": "bBan", "BestSellVol": "bBanKL",
      "TotalBuyTrade": "nMua", "TotalSellTrade": "nBan",
      "TotalBuyVol": "qMua", "TotalSellVol": "qBan"}

_tt = {"v": None, "ck": None, "luc": 0}


def tt_token(ep=False):
    """Token của trang kết quả giao dịch — KHÁC token của trang từng mã, đừng dùng lẫn.

    PHẢI LẤY KÈM COOKIE. Token chống giả mạo chỉ có giá trị cùng cookie phiên đã cấp ra nó;
    gửi token trần thì nguồn KHÔNG báo lỗi mà trả về nguyên trang HTML 216 KB — đọc ra
    thành "ngày này không có dữ liệu", đúng thứ khiến cả lượt cào bù im lặng bỏ trắng.
    """
    if _tt["v"] and not ep and time.time() - _tt["luc"] < 1800:
        return _tt["v"], _tt["ck"]
    import urllib.request
    rq = urllib.request.Request("https://finance.vietstock.vn/ket-qua-giao-dich",
                                headers={"User-Agent": nhipmang.UA})
    with urllib.request.urlopen(rq, timeout=30) as r:
        html = r.read().decode("utf-8", "replace")
        ck = "; ".join(v.split(";")[0] for k, v in r.getheaders()
                       if k.lower() == "set-cookie")
    m = re.search(r"name=__RequestVerificationToken type=hidden value=([A-Za-z0-9_-]+)", html)
    if not m:
        raise RuntimeError("không tìm thấy token trên trang ket-qua-giao-dich")
    _tt.update(v=m.group(1), ck=ck, luc=time.time())
    return _tt["v"], _tt["ck"]


def tt_trang(ep, cat, ngay, trang):
    """Một trang của một sàn một ngày. Trả về (danh sách dòng, tổng số trang).

    NGUỒN KHÔNG BÁO LỖI KHI NGÀY NGOÀI CỬA SỔ — nó trả về LẶNG LẼ số của HÔM NAY.
    Đo 20/08/2026: xin 2019-06-12, 2024-06-12, 2025-06-16 đều nhận lại dữ liệu mang
    `TradingDate` = 2026-08-20. Cào bù mà không kiểm là điền cả mấy năm lịch sử BỊA mà
    trông y như thật — không ô nào trống, không con số nào vô lý.
    Cửa sổ đo được: 2025-09-16 còn đúng, 2025-08-19 đã rơi ra ngoài.

    PHÂN TRANG BỊ CHẶN — trang 2 trở đi LUÔN trả về `[]`, dù chính nguồn báo "3 trang".
    Đã thử hết: pageSize 20/30/50/100/200, phiên mới cho từng trang, `code=0`, `stockID=0`,
    `pageIndex`, `orderBy`, `from`/`to`, ngày dạng dd/MM/yyyy. Nên một lượt chỉ lấy được
    **200 mã đầu theo bảng chữ cái** của mỗi sàn — HOSE chỉ tới IMP, tức A→I.
    Vì thế đường này KHÔNG đủ để phủ thị trường; nó dùng cho ① TỔNG TOÀN THỊ TRƯỜNG (khối
    [1] là số của cả sàn, không bị trần) và ② đối chiếu chéo miễn phí cho 600 mã nó có.
    Phủ đủ 1.529 mã thì phải đi đường hỏi từng mã.
    """
    for lan in (0, 1):
        tk, ck = tt_token(lan == 1)
        try:
            b = nhipmang.post("https://finance.vietstock.vn/data/" + ep,
                              {"page": trang, "pageSize": TT_TRANG, "catID": cat,
                               "date": ngay, "__RequestVerificationToken": tk},
                              headers={"X-Requested-With": "XMLHttpRequest",
                                       "Cookie": ck or "",
                                       "Referer": "https://finance.vietstock.vn/ket-qua-giao-dich"})
        except Exception:
            return [], 0
        t = b.lstrip("\ufeff").lstrip()
        if t[:1] != "[":
            continue
        try:
            j = json.loads(t)
        except Exception:
            return [], 0
        rows = j[2] if len(j) > 2 and isinstance(j[2], list) else []
        sotrang = (j[3][0] if len(j) > 3 and isinstance(j[3], list) and j[3] else 0)
        # CỔNG NGÀY — bỏ CẢ trang nếu nguồn trả về ngày khác ngày xin.
        rows = [r for r in rows if _ngay(r.get("TradingDate") or "") == ngay]
        return rows, sotrang
    return [], 0


def tt_ngay(ngay):
    """Cả thị trường một ngày: gộp thống kê giá + thống kê đặt lệnh. Trả về {mã: bản ghi}."""
    ra = {}
    for cat in TT_SAN:
        for ep, lay in (("KQGDThongKeGiaPaging", "gia"), ("KQGDThongKeDatLenhPaging", "dl")):
            trang, tong = 1, None
            while True:
                rows, st = tt_trang(ep, cat, ngay, trang)
                if tong is None:
                    tong = st or 1
                if not rows:
                    break
                for r in rows:
                    m = r.get("StockCode")
                    if not m:
                        continue
                    o = ra.setdefault(m, {})
                    if lay == "gia":
                        o.update({
                            "tc": r.get("BasicPrice"), "o": r.get("OpenPrice"),
                            "h": r.get("HighestPrice"), "l": r.get("LowestPrice"),
                            "c": r.get("ClosePrice"), "vwap": r.get("AvrPrice"),
                            "mv": r.get("M_TotalVol"), "mval": r.get("M_TotalVal"),
                            "pv": r.get("PT_TotalVol"), "pval": r.get("PT_TotalVal"),
                            "sh": (round(r["MarketCap"] / r["ClosePrice"])
                                   if r.get("MarketCap") and r.get("ClosePrice") else None),
                        })
                    else:
                        for k, v in DL.items():
                            o[v] = r.get(k)
                if trang >= tong:
                    break
                trang += 1
    return ra


def dl_nap(sym, sid, day_du=False):
    """SỔ LỆNH KHI CHỐT PHIÊN theo từng mã — `KQGDThongKeDatLenhStockPaging`.

    Trả về 30 dòng/lượt (nhiều hơn 20 của bảng giá), có lịch sử, phủ đủ mọi mã. Cần
    `stockID` dạng SỐ chứ không phải mã chữ — số đó nằm sẵn trong phản hồi của
    `GetStockDeal_ListPriceByTimeFrame` (trường `StockID`), nên `eod_nap` nhặt luôn.

    Cột lấy về là đúng thứ user hỏi: giá và khối lượng ở bước giá tốt nhất lúc đóng cửa,
    SỐ LỆNH đặt mua/bán, và TỔNG KHỐI LƯỢNG đặt mua/bán. HPG 19/08: đặt mua 36.500.971 cp
    qua 14.196 lệnh, đặt bán 24.483.888 cp qua 5.904 lệnh, trong khi khớp được 15.312.500.
    """
    if not sid:
        return {}
    ra, trang, tong = {}, 1, None
    while True:
        for lan in (0, 1):
            tk, ck = tt_token(lan == 1)
            try:
                b = nhipmang.post("https://finance.vietstock.vn/data/KQGDThongKeDatLenhStockPaging",
                                  {"page": trang, "pageSize": 200, "catID": 1, "stockID": sid,
                                   "fromDate": "2000-01-01",
                                   "toDate": datetime.datetime.now(TZ).strftime("%Y-%m-%d"),
                                   "__RequestVerificationToken": tk},
                                  headers={"X-Requested-With": "XMLHttpRequest", "Cookie": ck or "",
                                           "Referer": "https://finance.vietstock.vn/ket-qua-giao-dich"})
            except Exception:
                return ra
            t = b.lstrip("\ufeff").lstrip()
            if t[:1] == "[":
                break
        else:
            return ra
        try:
            j = json.loads(t)
        except Exception:
            return ra
        rows = j[1] if len(j) > 1 and isinstance(j[1], list) else []
        if tong is None:
            tong = (j[2][0] if len(j) > 2 and isinstance(j[2], list) and j[2] else 1)
        if not rows:
            break
        for r in rows:
            ra[_ngay(r["TradingDate"])] = {v: r.get(k) for k, v in DL.items()}
        if not day_du or trang >= (tong or 1) or trang > 400:
            break
        trang += 1
    return ra


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
    ap.add_argument("--ma", nargs="*", help="giới hạn ở vài mã (chỉ áp cho đường hỏi từng mã)")
    ap.add_argument("--ngay", nargs="*",
                    help="cào TOÀN THỊ TRƯỜNG các ngày này (mặc định: hôm nay)")
    ap.add_argument("--tu", help="cào bù toàn thị trường từ ngày này")
    ap.add_argument("--den", help="… tới ngày này")
    ap.add_argument("--sau", action="store_true",
                    help="đường HỎI TỪNG MÃ — chỉ dùng cho lịch sử SÂU hơn cửa sổ ~09/2025")
    ap.add_argument("--tatca", action="store_true", help="với --sau: lật HẾT trang")
    ap.add_argument("--kiem", action="store_true", help="đối chiếu chéo sau khi chạy")
    a = ap.parse_args()

    if a.sau:
        # ĐƯỜNG CHẬM, chỉ để bồi lịch sử sâu: 20 dòng/lượt, 214 trang cho một mã như VCB.
        u = json.load(open(UNI, encoding="utf-8"))["stocks"]
        ma = [x["sym"] for x in u]
        if a.ma:
            xin = {x.upper() for x in a.ma}
            ma = [m for m in ma if m in xin]
        print(f"  [đường sâu] {len(ma)} mã", flush=True)
        t0 = time.time()
        ok = loi = tong = 0
        sids = {}
        for i, m in enumerate(ma):
            try:
                moi, sid = eod_nap(m, day_du=a.tatca)
            except Exception:
                moi, sid = None, None
            if not moi:
                loi += 1
                continue
            # SỔ LỆNH CHỐT PHIÊN — trộn vào cùng bản ghi ngày, cùng nhịp với giá.
            try:
                for d, r in (dl_nap(m, sid, day_du=a.tatca) or {}).items():
                    if d in moi:
                        moi[d].update(r)
                    else:
                        moi[d] = r
            except Exception:
                pass
            if sid:
                sids[m] = sid
            tong += eod_ghi(m, moi, sid)
            ok += 1
            if (i + 1) % 200 == 0:
                print(f"    …{i+1}/{len(ma)}  {time.time()-t0:.0f}s", flush=True)
        print(f"  ok {ok} · lỗi {loi} · tổng {tong:,} dòng · {time.time()-t0:.0f}s", flush=True)
        if a.kiem:
            kiem(ma[:40])
        return 0

    # ĐƯỜNG CHÍNH: toàn thị trường theo ngày.
    ngays = []
    if a.tu:
        d0 = datetime.datetime.strptime(a.tu, "%Y-%m-%d").date()
        d1 = datetime.datetime.strptime(a.den or a.tu, "%Y-%m-%d").date()
        while d0 <= d1:
            if d0.weekday() < 5:
                ngays.append(d0.strftime("%Y-%m-%d"))
            d0 += datetime.timedelta(days=1)
        ngays.reverse()                  # mới trước — hỏng giữa chừng vẫn có phần gần đây
    else:
        ngays = a.ngay or [datetime.datetime.now(TZ).strftime("%Y-%m-%d")]

    tong_ma = 0
    for ng in ngays:
        t0 = time.time()
        try:
            ra = tt_ngay(ng)
        except Exception as e:
            print(f"  {ng}: LỖI {type(e).__name__} {str(e)[:80]}", flush=True)
            continue
        if not ra:
            print(f"  {ng}: không có dữ liệu (nghỉ, hoặc ngoài cửa sổ ~09/2025)", flush=True)
            continue
        for m, r in ra.items():
            eod_ghi(m, {ng: r})
        co_dl = sum(1 for r in ra.values() if r.get("nMua") is not None)
        tong_ma += len(ra)
        print(f"  {ng}: {len(ra):,} mã · {co_dl:,} mã có sổ lệnh chốt phiên"
              f" · {time.time()-t0:.0f}s", flush=True)
    print(f"  xong {len(ngays)} ngày · {tong_ma:,} lượt (mã × ngày)", flush=True)
    if a.kiem:
        u = json.load(open(UNI, encoding="utf-8"))["stocks"]
        kiem([x["sym"] for x in u][:40])
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
