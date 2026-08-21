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
# ĐÃ BỎ 22/08/2026 (xem `tools/gon_kho.py`): `bMua` `bMuaKL` `bBan` `bBanKL` (giá tốt
# nhất lúc đóng cửa — không ai đọc, không nằm trong tín hiệu nào, và là ảnh chụp MỘT thời
# điểm nên không dựng được chuỗi) và `fnMuaPc` `fnBanPc` (suy ra được: `GT ÷ mval × 100`,
# lệch trung vị 0,0000 trên 10.623 mẫu). Tổng 42,8 MB.
# ĐỪNG THÊM LẠI — nếu cần thì tính tại chỗ, đừng lưu.
COT = ("d", "tc", "o", "h", "l", "c", "vwap", "mv", "mval", "pv", "pval", "shR",
       # SỔ LỆNH (`nMua` `nBan` `qMua` `qBan`) ĐÃ BỎ 22/08/2026 — user chốt không cần nữa,
       # và `tools/gon_kho.py` đã xoá khỏi kho (−30 MB). PHẢI bỏ khỏi `COT` chứ không chỉ
       # thôi cào: `eod_ghi` ghi lại MỌI cột trong `COT`, nên để tên ở đây là mỗi lượt chạy
       # dựng lại bốn mảng 1.000 chữ `null` cho cả 1.529 mã — hồi sinh đúng 30 MB vừa xoá.
       "fnMuaKL", "fnMuaGT", "fnBanKL", "fnBanGT",
       "fnMuaTTKL", "fnMuaTTGT", "fnBanTTKL", "fnBanTTGT",
       "fnSoHuu", "fnRoom",
       "tdMuaKL", "tdMuaGT", "tdBanKL", "tdBanGT",
       "tdMuaTTKL", "tdMuaTTGT", "tdBanTTKL", "tdBanTTGT")

# DẤU PHIÊN BẢN CỦA CÁCH TÍNH. File nào mang số nhỏ hơn là dựng bằng logic CŨ và
# phải cào lại — `run_boi_giaodich.ps1` lấy đúng danh sách đó. Có dấu này thì mỗi
# lần sửa cách tính, kho TỰ LÀNH dần thay vì phải nhớ chạy tay một script vá.
# v2 (20/08/2026): `sh` đổi từ "chia ngược quãng trước" sang "neo đuôi vào SLCP thật".
PBAN = 2


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


# Thống kê giá trả 20 dòng/trang, thống kê ĐẶT LỆNH trả 30. Lấy 1 trang giá là hụt 10
# phiên so với sổ lệnh, và chỗ hụt đó lặng lẽ thành "phiên không có giá". Lấy 2 trang giá
# (40 phiên) là phủ trọn, và vẫn chỉ tốn thêm 1 lượt/mã.
TRANG_NGAY = 2
# SỐ TRANG CHO TẦNG DÒNG TIỀN (sổ lệnh · khối ngoại · tự doanh). Ba endpoint này trả
# 30 DÒNG/TRANG, khác 20 của thống kê giá — nên cùng một số trang lại ra độ sâu khác nhau.
#
# VÌ SAO CÓ HẰNG SỐ NÀY (21/08/2026): kho mang tiếng "100 phiên" nhưng đo ra thì
# **giá/khối lượng/thoả thuận/SLCP đủ 100, khối ngoại chỉ 60, sổ lệnh chỉ 30**. Gốc là
# `dl_nap` (đã gỡ) thoát sau trang 1 và `_kqgd_nap` thoát sau trang 2 — hai con số viết cứng,
# không ai chỉnh được từ ngoài. Tức đúng cái tầng HIẾM NHẤT (không nguồn nào cho lại được
# sau này, phải cào đúng lúc nó còn) lại là tầng mỏng nhất.
#
# ĐÂY KHÔNG PHẢI NỚI TRẦN NHỊP MẠNG. Trần vẫn là trần của `nhipmang` (4 lượt/giây với
# finance.vietstock.vn); xin thêm trang chỉ làm lượt chạy DÀI HƠN chứ không nhanh hơn.
# Xem luật ở đầu `tools/nhipmang.py` — đừng bao giờ đụng vào `TRAN` để chạy nhanh.
TRANG_LUONG = 2                    # 2 trang × 30 dòng = 60 phiên, đủ đệm cho lượt EOD hằng ngày
# TRẦN TRANG khi xin theo SỐ PHIÊN ĐÍCH — chặn vòng lặp chạy hoài nếu nguồn cứ trả dòng.
TRANG_TRAN = 40


def eod_nap(sym, day_du=False, tu="2000-01-01", den=None, trang_toi=None, sau_toi=None):
    """Trả về dict {ngày: bản ghi}. day_du=True thì lật hết trang; `trang_toi` để lấy sâu
    có kiểm soát (20 dòng/trang, nên 5 trang ≈ 100 phiên ≈ hơn 4 tháng)."""
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
                sid[0] = r.get("StockID")     # cần cho fn_nap/td_nap, nguồn chỉ nhận số
            ra[_ngay(r["TradingDate"])] = {
                "tc": r.get("BasicPrice"), "o": r.get("OpenPrice"), "h": r.get("HighestPrice"),
                "l": r.get("LowestPrice"), "c": r.get("ClosePrice"), "vwap": r.get("AvrPrice"),
                "mv": r.get("M_TotalVol"), "mval": r.get("M_TotalVal"),
                "pv": r.get("PT_TotalVol"), "pval": r.get("PT_TotalVal"),
                # KHÔNG lưu MarketCap của nguồn — nó chỉ là `giá × SLCP`, không mang thêm
                # thông tin nào ngoài SLCP. Lưu SLCP vừa gọn hơn nhiều (10 chữ số thay vì
                # 15) vừa là thứ VÁ ĐƯỢC khi nguồn sai, còn vốn hoá thì không.
                # LƯU SỐ THÔ CỦA NGUỒN (`shR`), `sh` là số đã vá và được TÍNH LẠI mỗi lần
                # ghi. Bản trước lưu thẳng số đã vá nên khi phát hiện vá sai chiều thì
                # không còn đường nào quay lại ngoài cào lại cả kho — đúng cái giá đang
                # phải trả. Số thô thì mọi cách tính về sau đều dựng lại được tại chỗ.
                "shR": (round(r["MarketCap"] / r["ClosePrice"])
                        if r.get("MarketCap") and r.get("ClosePrice") else None),
            }
        # XIN THEO SỐ PHIÊN ĐÍCH, ĐỪNG ĐẾM TRANG. Bốn endpoint trả số dòng/trang KHÁC
        # NHAU (thống kê giá 20, thống kê đặt lệnh ~63, khối ngoại và tự doanh 30) nên
        # cùng một `--trang N` ra bốn độ sâu khác nhau — đúng cái đã đẻ ra kho lệch tầng
        # phải đi vá 21/08/2026. Đếm phiên đã có trong tay thì mỗi tầng tự dừng đúng chỗ.
        if sau_toi and len(ra) >= sau_toi:
            break
        if sau_toi and trang >= TRANG_TRAN:
            break
        if not sau_toi and trang >= (400 if day_du else (trang_toi or TRANG_NGAY)):
            break
        if day_du and len(ra) >= (tong or 0):
            break
        trang += 1
    return ra, sid[0]


def neo_slcp(d, shv, ev, sh_that):
    """NEO ĐUÔI CHUỖI SLCP VÀO SỐ THẬT HÔM NAY.

    CHẨN SAI LẦN ĐẦU, ghi lại để đừng ai đi lại đường cũ. Bản trước (`sua_slcp`) cho rằng
    nguồn "áp SLCP hôm nay ngược về quá khứ" nên CHIA quãng trước sự kiện. Sai chiều:
    nguồn không áp gì ngược cả, nó chỉ đơn giản là **CŨ** — chưa cập nhật đợt phát hành
    gần nhất. Đo 20/08/2026 trên 1.529 mã, so với `universe.json` (Simplize, làm mới mỗi
    7:30): **1.427 mã khớp trong ±1%**, ~100 mã lệch và lệch đúng bằng tỉ lệ một sự kiện
    quyền — VHM ×2,000 (chia 1:1 ngày 06/08), MBB ×1,250, SSI ×1,200, BID ×1,068.
    Tức quãng TRƯỚC sự kiện của nguồn vốn đã ĐÚNG, và bản vá cũ đã bẻ gãy nó: vốn hoá VHM
    ra 285.465 tỷ trong khi thật là ~567.644 tỷ.

    Cách đúng: giữ nguyên chuỗi của nguồn (nó có cả những đợt phát hành riêng lẻ mà
    `data/sukien` không ghi), rồi NHÂN TỚI TRƯỚC từ ngày sự kiện mà nguồn chưa kịp ghi.
    Số thật hôm nay lấy từ `universe.json` vì lượt 7:30 làm mới nó mỗi ngày giao dịch.
    """
    if not shv or not sh_that or not shv[-1]:
        return shv, 0
    r = sh_that / shv[-1]
    if abs(r - 1) <= 0.01:
        return shv, 0
    # Bậc cuối của nguồn: lùi tới chỗ giá trị đổi lần cuối.
    j = len(shv) - 1
    while j > 0 and shv[j - 1] == shv[j]:
        j -= 1
    moc = d[j]
    su = sorted((e for e in ev
                 if e.get("k") in ("cp", "thuong", "quyenmua") and e.get("tl")
                 and e["d"] > moc), key=lambda e: e["d"])
    sh = [float(x) if x else None for x in shv]
    va = 0
    for e in su:
        f = 1 + e["tl"] / 100.0
        i = bisect.bisect_left(d, e["d"])
        for k in range(i, len(sh)):
            if sh[k]:
                sh[k] *= f
        va += 1
    # CÒN LỆCH SAU KHI ÁP HẾT SỰ KIỆN = có đợt phát hành `data/sukien` không ghi (riêng lẻ,
    # ESOP, chuyển đổi trái phiếu). Neo thẳng đuôi vào số thật, và ĐẾM là một lần vá — số
    # thật hôm nay đáng tin hơn hẳn một chuỗi tự nó mâu thuẫn với chính hôm nay.
    if sh[-1] and abs(sh_that / sh[-1] - 1) > 0.01:
        f = sh_that / sh[-1]
        i = bisect.bisect_left(d, moc)
        for k in range(i, len(sh)):
            if sh[k]:
                sh[k] *= f
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


_UNI = {}


def _slcp_that(sym):
    """SLCP THẬT hôm nay, lấy từ `universe.json` — lượt 7:30 làm mới nó mỗi ngày giao dịch
    từ Simplize, nên nó mới hơn hẳn chuỗi của Vietstock."""
    if not _UNI:
        try:
            for s in json.load(open(UNI, encoding="utf-8"))["stocks"]:
                if s.get("shares"):
                    _UNI[s["sym"]] = s["shares"]
        except Exception:
            _UNI["_"] = 0
    return _UNI.get(sym)


def _sukien(sym):
    p = os.path.join(BASE, "data", "sukien", f"{sym}.json")
    try:
        return json.load(open(p, encoding="utf-8")).get("ev") or []
    except Exception:
        return []


def eod_ghi(sym, moi, sid=None, day_du=False):
    """Trộn vào file cũ. GIỮ ngày cũ, chỉ thêm/cập nhật ngày có trong `moi`."""
    p = os.path.join(GD_DIR, f"{sym}.json")
    cu, cu_sid = {}, sid
    # ĐỌC MỌI CỘT ĐANG CÓ, KHÔNG CHỈ CỘT TRONG `COT` — bẫy đã trả giá 22/08/2026.
    # Bản cũ đọc và ghi lại đúng danh sách `COT`, nên **mọi cột ngoài danh sách đó bị XOÁ
    # HẲN** mỗi lần hàm này chạy: `fnMuaTG` `fnBanTG` `tdMuaTG` `tdBanTG` `fnRoomV`
    # `fnRoomTong` `*TKL` — toàn bộ tầng VNDirect.
    # KHÔNG LỘ RA SUỐT NHIỀU THÁNG vì thứ tự cũ chạy Vietstock TRƯỚC rồi `kho_vnd` ghi lại
    # NGAY SAU, nên cột vừa bị xoá lại được đắp vào. Đảo thứ tự (VNDirect chạy trước để
    # bảng lên web sớm) là nó phơi ra ngay: khối ngoại toàn thị trường từ 2.268 tỷ về 0.
    # Không lỗi nào báo — file vẫn hợp lệ, chỉ thiếu cột.
    # Luật chung: hàm ghi phải GIỮ NGUYÊN thứ nó không hiểu, đừng dựng lại file từ một
    # danh sách cứng. Ai thêm cột mới cũng khỏi phải nhớ khai vào đây.
    cot_cu = []
    if os.path.exists(p):
        try:
            o = json.load(open(p, encoding="utf-8"))
            cu_sid = cu_sid or o.get("sid")
            nd = len(o.get("d") or [])
            cot_cu = [k for k, v in o.items()
                      if k != "d" and isinstance(v, list) and len(v) == nd]
            for i, d in enumerate(o.get("d") or []):
                cu[d] = {k: o[k][i] for k in cot_cu}
        except Exception:
            cu, cot_cu = {}, []
    # TRỘN THEO TỪNG TRƯỜNG, đừng `cu.update(moi)`.
    # `update` thay CẢ bản ghi của ngày đó — nên lượt ghi dòng tiền (chỉ có cfU/cfF/cfD)
    # xoá sạch giá, khối lượng, SLCP của chính ngày ấy. Đã dính đúng vậy 20/08/2026: sau
    # khi chạy tầng nến 1 phút thì `mv` của cả 6 mã về 0, mà không lỗi nào báo.
    for d, r in moi.items():
        cu.setdefault(d, {}).update(r)
    ngay = sorted(cu)
    doc = {"sym": sym, "updated": datetime.datetime.now(TZ).strftime("%Y-%m-%d"),
           "n": len(ngay), "d": ngay}
    for k in list(COT) + [x for x in cot_cu if x not in COT]:
        if k == "d":
            continue
        arr = [cu[d].get(k) for d in ngay]
        # Cột của `COT` giữ nguyên kể cả khi rỗng (hợp đồng cũ); cột LẠ chỉ giữ khi còn số,
        # để không hồi sinh mấy cột đã cố ý xoá bằng `tools/gon_kho.py`.
        if k in COT or any(x is not None for x in arr):
            doc[k] = arr
    if cu_sid:
        doc["sid"] = cu_sid
    ev = _sukien(sym)
    doc["v"] = PBAN
    if day_du:
        doc["day"] = 1                    # đã cào ĐẦY ĐỦ, không phải chỉ trang 1
    elif os.path.exists(p):
        try:
            doc["day"] = json.load(open(p, encoding="utf-8")).get("day") or 0
        except Exception:
            pass
    sh_cu = {d: cu[d].get("sh") for d in ngay}
    doc["sh"], doc["shVa"] = neo_slcp(ngay, doc["shR"], ev, _slcp_that(sym))
    # SỐ CỔ PHIẾU: `neo_slcp` suy từ `shR` của Vietstock, mà từ 22/08 lượt EOD KHÔNG còn cào
    # tầng giá Vietstock nữa nên `shR` không có số mới. `kho_vnd_lo.py` đã ghi `sh` từ
    # `ratios` của VNDirect — giữ lại ở mọi ô mà `neo_slcp` không suy ra được, bằng không
    # ô vốn hoá của phiên mới trống trơn.
    for i2, d2 in enumerate(ngay):
        if doc["sh"][i2] is None and sh_cu.get(d2) is not None:
            doc["sh"][i2] = sh_cu[d2]
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
        # SỔ LỆNH ĐÃ BỎ HẲN 22/08/2026 (user chốt ba lần) — chỉ còn thống kê giá.
        for ep, lay in (("KQGDThongKeGiaPaging", "gia"),):
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
                            "shR": (round(r["MarketCap"] / r["ClosePrice"])
                                    if r.get("MarketCap") and r.get("ClosePrice") else None),
                        })
                if trang >= tong:
                    break
                trang += 1
    return ra

def vung_gia(sym, ngay):
    """KHỐI LƯỢNG KHỚP LỆNH GỘP THEO TỪNG MỨC GIÁ trong một phiên — "vùng giá khớp lệnh".

    Nguồn không có sẵn bảng này; nó nằm trong chuỗi nến 1 PHÚT (`interval=1`, mỗi điểm có
    `Price` và `Vol`). Gộp `Vol` theo `Price` là ra đúng biểu đồ Vietstock vẽ. Một lượt gọi
    cho cả phiên, và kết quả gọn hơn nến 1 phút nhiều: VCB 226 nến rút còn ~25 mức giá.

    KHÔNG lưu chuỗi 1 phút thô — user không cần lịch sử trong phiên, chỉ cần vùng giá.
    """
    j = goi("/Data/GetStockDealDetailChartByDate",
            {"code": sym, "interval": 1, "tradingDate": ngay}, sym)
    if not isinstance(j, dict):
        return None
    r = j.get("Deal_DetailChart_Results") or []
    if not r:
        return {}
    gom = {}
    for x in r:
        p = int(x.get("Price") or 0)
        v = int(x.get("Vol") or 0)
        if p > 0 and v > 0:
            gom[p] = gom.get(p, 0) + v
    if not gom:
        return {}
    gia = sorted(gom)
    return {"p": gia, "v": [gom[g] for g in gia]}


def dong_tien(sym, ngay):
    """PHÂN BỔ DÒNG TIỀN — giá trị khớp lệnh tách theo hướng giá của lệnh (`StateChange`
    +1 tăng / 0 không đổi / −1 giảm). Đi kèm miễn phí ở trang 1 của endpoint từng lệnh,
    nên 1 lượt/mã/ngày. Tổng ba phần bằng đúng `mval` của phiên đó (đã kiểm 5 cặp).
    Trả về [tăng, không đổi, giảm] tính bằng TRIỆU đồng cho gọn."""
    j = goi("/data/GetStockDealDetailPagingByDate_v2",
            {"code": sym, "page": 1, "pageSize": 20, "tradingDate": ngay}, sym)
    if not isinstance(j, dict):
        return None
    cf = {x.get("StateChange"): x.get("CashFlow")
          for x in ((j.get("result") or {}).get("Deal_CashFlow_Results") or [])}
    if not cf:
        return None
    return [round((cf.get(k) or 0) / 1e6) for k in (1, 0, -1)]


def phien_ghi(ngay, goi_ma):
    """Ghi khối `ma` (vùng giá) vào file phiên — **TRỘN VÀO FILE CŨ, KHÔNG GHI ĐÈ NÓ.**

    FILE PHIÊN CÓ BỐN KHỐI DO BỐN LƯỢT KHÁC NHAU GHI:
      · `ma`        vùng giá khớp lệnh        <- chính hàm này (`--vg`)
      · `bang`+`f`  bảng mã của phiên         <- build_phantich.py
      · `la`        quét bất thường           <- quet_la.py --phien
      · `dt`+`dtf`  lát cắt ngang cho bộ lọc  <- quet_la.py --phien

    Bản cũ đọc lại đúng `.get("ma")` rồi ghi ra `{date, n, ma}` — **vứt sạch ba khối
    kia**. Trước giờ không lộ ra vì trong lượt EOD, `--vg` chạy TRƯỚC `build_phantich`
    nên bảng được dựng lại ngay sau đó. Chạy TAY sau lượt EOD thì không có gì dựng lại:
    21/08/2026 một lượt `--vg --ma PNJ --tu … --den …` xoá `bang`/`la`/`dt` của **63 file
    phiên**, và trang phân tích trắng bảng — *"sao mất hết data rồi"*. Không lỗi nào báo,
    vì file vẫn hợp lệ và vẫn có khối `ma`.

    Luật chung của cả thư mục này (đã ghi trong CLAUDE.md): **file phiên nhiều chủ, mọi
    lượt ghi phải TRỘN.** Ai thêm khối thứ năm cũng không phải đụng lại hàm này.
    """
    os.makedirs(PHIEN_DIR, exist_ok=True)
    p = os.path.join(PHIEN_DIR, f"{ngay}.json")
    doc = {}
    if os.path.exists(p):
        try:
            doc = json.load(open(p, encoding="utf-8")) or {}
        except Exception:
            doc = {}
    cu = doc.get("ma") or {}
    cu.update(goi_ma)
    doc["date"] = ngay
    doc["ma"] = cu
    # `nVG` chứ KHÔNG phải `n`: `build_phantich` cũng ghi `n` nhưng nghĩa là SỐ MÃ TRONG
    # BẢNG, còn ở đây là số mã có vùng giá. Dùng chung một khoá thì lượt nào chạy sau
    # thắng, và con số hiện trên trang đổi nghĩa tuỳ thứ tự chạy.
    doc["nVG"] = len(cu)
    tmp = p + ".tmp"
    json.dump(doc, open(tmp, "w", encoding="utf-8"), ensure_ascii=False,
              separators=(",", ":"))
    os.replace(tmp, p)
    return os.path.getsize(p)


# ── tầng 3b: KHỐI NGOẠI THEO PHIÊN ───────────────────────────────────────────
# `KQGDGiaoDichNDTNNStockPaging` — 30 dòng/lượt, cùng họ với thống kê đặt lệnh nên cũng
# cần `stockID` dạng số. Nguồn tính sẵn PHẦN TRĂM khối lượng và giá trị là của khối ngoại,
# khỏi phải tự chia — và tự chia thì mẫu số phải chọn giữa khớp lệnh với tổng giao dịch,
# hai cách ra hai con số khác nhau.
# ĐƠN VỊ: `BuyVal`/`SellVal` của nguồn là TRIỆU ĐỒNG (đo trên HPG 20/08: 535.600 cp ×
# ~21.250đ = 11,38 tỷ, nguồn ghi 11.396,825). Kho quy về ĐỒNG cho đồng bộ với `mval`.
# TÁCH THOẢ THUẬN RA KHỎI KHỚP LỆNH, ĐỪNG GỘP. Đối chiếu 19/08 với `data/eod` (bảng giá
# VPS, nguồn độc lập hẳn): **1.477/1.526 mã khớp tuyệt đối**, 49 mã lệch — và cả 49 giải
# thích được đến từng cổ phiếu. HPG: khớp lệnh mua 1.395.500, thoả thuận mua 762.822,
# tổng 2.158.322, trong khi eod ghi 2.158.340 (chênh 18 = lô lẻ). Tức bảng giá VPS gộp cả
# ba thứ làm một. Gộp như vậy là lặp lại đúng con bệnh của `data/hist` đã phải gỡ ở đầu
# phiên: một đại lượng, hai định nghĩa, không ai biết mình đang cầm cái nào.
# `PerBuyVol`/`PerSellVol` ĐÃ THÔI LẤY 22/08/2026 — chúng chỉ là `fnMuaGT ÷ mval × 100`,
# đo 10.623 mẫu thì lệch trung vị 0,0000. Nguồn tính sẵn cho tiện chứ không mang thêm
# thông tin nào, mà nằm trong kho thì tốn 14,9 MB. Xem `tools/gon_kho.py`.
FN = {"BuyVol": "fnMuaKL", "SellVol": "fnBanKL",
      "BuyPutVol": "fnMuaTTKL", "SellPutVol": "fnBanTTKL",
      "OwnedRatio": "fnSoHuu", "RemainRoom": "fnRoom"}
FN_TIEN = {"BuyVal": "fnMuaGT", "SellVal": "fnBanGT",
           "BuyPutVal": "fnMuaTTGT", "SellPutVal": "fnBanTTGT"}


def loc_dang_goi(ma, tang):
    """Bỏ những mã CHẮC CHẮN không có số ở tầng này, đọc từ chính kho — không gọi mạng.

    VÌ SAO (22/08/2026): lượt EOD gọi Vietstock cho cả 1.529 mã ở mọi tầng, trong khi phần
    lớn lượt gọi trả về RỖNG. Đo phiên 21/08 và 30 phiên gần nhất:

        khối ngoại  chỉ   338/1.525 mã có khối ngoại giao dịch HOẶC có thoả thuận
        tự doanh    chỉ   195/1.529 mã có tự doanh trong 30 phiên gần nhất

    Tức ~78% và ~87% số lượt gọi là gọi để nhận về con số 0. Bỏ chúng đi tiết kiệm ~10 phút
    mỗi phiên mà KHÔNG mất một con số nào — xem lập luận từng tầng ngay dưới.

    ĐÂY LÀ CỔNG THEO LỊCH SỬ, NÊN PHẢI CÓ ĐƯỜNG BẮT MÃ MỚI: lượt thứ Hai chạy KHÔNG có
    `--tuloc` để quét lại trọn rổ, bắt mã lần đầu có khối ngoại/tự doanh.
    """
    ra = []
    for m in ma:
        p = os.path.join(GD_DIR, m + ".json")
        if not os.path.exists(p):
            continue
        try:
            g = json.load(open(p, encoding="utf-8"))
        except Exception:
            ra.append(m)                      # đọc hỏng thì cứ gọi, đừng đoán
            continue
        d = g.get("d") or []
        if not d:
            continue
        n = len(d)
        lay = lambda k: (g.get(k) or []) if len(g.get(k) or []) == n else []
        if tang == "nn":
            # KHỐI NGOẠI: chỉ cần bản TÁCH của Vietstock khi phiên đó THẬT SỰ có gì để tách.
            # Không có khối ngoại giao dịch và không có thoả thuận thì bản tách bằng đúng
            # TỔNG của VNDirect (cả hai đều 0), và tỉ lệ sở hữu KHÔNG ĐỔI nên số phiên
            # trước vẫn đúng nguyên — đây là chỗ giữ nguyên CHÍNH XÁC, không phải xấp xỉ.
            i = n - 1
            co = False
            for k in ("fnMuaTG", "fnBanTG", "pval"):
                v = lay(k)
                if v and i < len(v) and v[i]:
                    co = True
                    break
            if co:
                ra.append(m)
        elif tang == "tt":
            # THOẢ THUẬN: mã chưa từng có thoả thuận trong 30 phiên gần nhất thì phiên này
            # gần như chắc chắn cũng không — và top 50 mã chiếm 99,8% giá trị thoả thuận
            # toàn thị trường, nên cổng này không bỏ sót phần đáng kể nào.
            v = lay("pval")
            if v and any(v[i] for i in range(max(0, n - 30), n)):
                ra.append(m)
        else:
            # TỰ DOANH: mã chưa từng có tự doanh trong 30 phiên gần nhất thì phiên này gần
            # như chắc chắn cũng không. Cửa sổ 30 (không phải 1) để mã giao dịch thưa vẫn lọt.
            co = False
            for k in ("tdMuaGT", "tdMuaTG", "tdBanGT", "tdBanTG"):
                v = lay(k)
                if v and any(v[i] is not None for i in range(max(0, n - 30), n)):
                    co = True
                    break
            if co:
                ra.append(m)
    return ra


def fn_nap(sym, sid, day_du=False, trang_toi=None, sau_toi=None):
    """Khối ngoại từng phiên: khối lượng và giá trị mua/bán (khớp lệnh và thoả thuận tách
    riêng), % của phiên, tỉ lệ sở hữu và room còn lại."""
    return _kqgd_nap("KQGDGiaoDichNDTNNStockPaging", sym, sid, FN, FN_TIEN, day_du, trang_toi, sau_toi)


# ── tầng 3c: TỰ DOANH CÔNG TY CHỨNG KHOÁN THEO PHIÊN ─────────────────────────
# `KQGDThongKeTuDoanhStockPaging` — cùng hình dạng với khối ngoại: 30 dòng/lượt, cần
# `stockID` dạng số, `*Val` là TRIỆU ĐỒNG.
# Vì sao đáng lấy: tự doanh là tiền của chính công ty chứng khoán, và nó KHÔNG nằm trong
# bất kỳ con số nào kho đang có — khối ngoại là một nhóm khác hẳn, còn tổng khớp lệnh thì
# gộp tất cả làm một. Đo HPG 19/08: tự doanh mua ròng 66,5 tỷ trong khi khối ngoại bán
# ròng 52,7 tỷ — hai dòng tiền ngược chiều nhau trong cùng một phiên, mà nhìn tổng khớp
# lệnh thì không thấy gì cả.
# TÁCH THOẢ THUẬN RA, cùng lý do với khối ngoại: `KLBuy_Total` của nguồn = khớp lệnh +
# thoả thuận, gộp sẵn. Lưu gộp là mất khả năng phân biệt về sau.
TD = {"BuyVol": "tdMuaKL", "SellVol": "tdBanKL",
      "BuyPutVol": "tdMuaTTKL", "SellPutVol": "tdBanTTKL"}
TD_TIEN = {"BuyVal": "tdMuaGT", "SellVal": "tdBanGT",
           "BuyPutVal": "tdMuaTTGT", "SellPutVal": "tdBanTTGT"}


def _kqgd_nap(ep, sym, sid, anh, anh_tien, day_du=False, trang_toi=None, sau_toi=None):
    """Bộ nạp dùng chung cho hai endpoint cùng hình dạng của trang kết quả giao dịch
    (khối ngoại và tự doanh): 30 dòng/lượt, `stockID` số, khối [1] là dữ liệu, [2] là số
    trang, tiền tính bằng TRIỆU ĐỒNG.

    TRẢ VỀ `None` KHI GỌI HỎNG, `{}` KHI NGUỒN TRẢ LỜI NHƯNG KHÔNG CÓ DÒNG NÀO — hai
    chuyện khác hẳn nhau. Rất nhiều mã KHÔNG HỀ CÓ TỰ DOANH: đo VBT (UPCOM) thì khối ngoại
    có đủ 60 phiên còn tự doanh 0 phiên, và đó là sự thật chứ không phải lỗi mạng. Gộp hai
    cái làm một thì lượt cào báo "1.012 mã hỏng" trong khi thực ra chỉ có vài mã hỏng thật,
    và lượt thử lại đi hỏi lại cả nghìn mã vốn không có gì để lấy."""
    if not sid:
        return None
    ra, trang, tong = {}, 1, None
    while True:
        for lan in (0, 1):
            tk, ck = tt_token(lan == 1)
            try:
                b = nhipmang.post("https://finance.vietstock.vn/data/" + ep,
                                  {"page": trang, "pageSize": 200, "catID": 1, "stockID": sid,
                                   "fromDate": "2000-01-01",
                                   "toDate": datetime.datetime.now(TZ).strftime("%Y-%m-%d"),
                                   "__RequestVerificationToken": tk},
                                  headers={"X-Requested-With": "XMLHttpRequest", "Cookie": ck or "",
                                           "Referer": "https://finance.vietstock.vn/ket-qua-giao-dich"})
            except Exception:
                return ra or None
            t = b.lstrip("\ufeff").lstrip()
            if t[:1] == "[":
                break
        else:
            return ra or None
        try:
            j = json.loads(t)
        except Exception:
            return ra or None
        rows = j[1] if len(j) > 1 and isinstance(j[1], list) else []
        if tong is None:
            tong = (j[2][0] if len(j) > 2 and isinstance(j[2], list) and j[2] else 1)
        if not rows:
            break
        for r in rows:
            o = {v: r.get(k) for k, v in anh.items()}
            for k, v in anh_tien.items():
                x = r.get(k)
                o[v] = round(x * 1e6) if x else 0      # triệu đồng -> đồng
            ra[_ngay(r["TradingDate"])] = o
        if trang >= (tong or 1) or trang > 400:
            break
        if sau_toi:
            if len(ra) >= sau_toi or trang >= TRANG_TRAN:
                break
        elif not day_du and trang >= (trang_toi or TRANG_LUONG):
            break
        trang += 1
    return ra


def td_nap(sym, sid, day_du=False, trang_toi=None, sau_toi=None):
    return _kqgd_nap("KQGDThongKeTuDoanhStockPaging", sym, sid, TD, TD_TIEN, day_du, trang_toi, sau_toi)


# ── tầng 4: CHỈ SỐ THEO PHIÊN ────────────────────────────────────────────────
CHISO = os.path.join(BASE, "data", "chiso.json")
IDX = ("VNINDEX", "VN30", "HNX", "HNX30", "UPCOM")


def kho_chiso():
    """Điểm đóng cửa + KHỐI LƯỢNG của từng chỉ số theo phiên -> `data/chiso.json`.

    Nguồn: `dchart-api.vndirect.com.vn` — sâu tới **2017-08** (2.244 phiên cho VNINDEX),
    trong khi `data/idx.json` của pipeline chỉ giữ ~15 phiên và không có % thay đổi.
    Endpoint chỉ số của Entrade cũng chạy nhưng chỉ lùi ~300 phiên, nên để làm nguồn đối
    chiếu chứ không làm nguồn chính. Hai bên khớp nhau ở phiên cuối (1.734,24).

    % THAY ĐỔI TÍNH TẠI CHỖ chứ không lấy của nguồn: chỉ số không chia tách nên
    `c[i]/c[i-1] - 1` là định nghĩa duy nhất, và tự tính thì phiên nào cũng có, kể cả
    phiên đầu chuỗi của một lượt cào bù.
    """
    ra = {}
    for m in IDX:
        try:
            b = nhipmang.get("https://dchart-api.vndirect.com.vn/dchart/history"
                             f"?symbol={m}&resolution=D&from=1400000000&to="
                             f"{int(datetime.datetime.now(TZ).timestamp()) + 86400}")
            j = json.loads(b)
        except Exception:
            continue
        if j.get("s") != "ok" or not j.get("t"):
            continue
        d, c, v = [], [], []
        for i, t in enumerate(j["t"]):
            d.append(datetime.datetime.fromtimestamp(t, TZ).strftime("%Y-%m-%d"))
            c.append(round(j["c"][i], 2))
            v.append(int((j.get("v") or [0] * len(j["t"]))[i] or 0))
        ra[m] = {"d": d, "c": c, "v": v,
                 "pc": [None] + [round((c[i] / c[i - 1] - 1) * 100, 2) if c[i - 1] else None
                                 for i in range(1, len(c))]}
        print(f"    {m}: {len(d):,} phiên · {d[0]} → {d[-1]} · đóng cuối {c[-1]:,}", flush=True)
    if not ra:
        return 0
    tmp = CHISO + ".tmp"
    json.dump(ra, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, CHISO)
    return len(ra)


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
    ap.add_argument("--phien", type=int,
                    help="với --sau: cào tới ĐỦ ngần này phiên ở MỌI tầng "
                         "(tự tính số trang cho từng endpoint — nên dùng cái này "
                         "thay cho --trang)")
    ap.add_argument("--trang", type=int,
                    help="với --sau: lấy bao nhiêu trang giá (20 phiên/trang). Mặc định 2")
    ap.add_argument("--vg", action="store_true",
                    help="VÙNG GIÁ khớp lệnh + phân bổ dòng tiền cho --ngay (1 lượt/mã/ngày ×2)")
    ap.add_argument("--nn", action="store_true",
                    help="CHỈ cào khối ngoại (dùng lại `sid` đã lưu, 2 lượt/mã)")
    ap.add_argument("--td", action="store_true",
                    help="CHỈ cào tự doanh CTCK (dùng lại `sid` đã lưu, 2 lượt/mã)")
    ap.add_argument("--tt", action="store_true",
                    help="CHỈ lấy THOẢ THUẬN (pv/pval) — VNDirect bỏ sót, xem chú thích")
    ap.add_argument("--tuloc", action="store_true",
                    help="với --nn/--td: TỰ BỎ mã chắc chắn không có số, xem `loc_dang_goi`")
    ap.add_argument("--chiso", action="store_true",
                    help="chỉ số theo phiên (VNINDEX/VN30/HNX/HNX30/UPCOM) -> data/chiso.json")
    ap.add_argument("--kiem", action="store_true", help="đối chiếu chéo sau khi chạy")
    a = ap.parse_args()

    if a.tt:
        # ── THOẢ THUẬN LẤY RIÊNG TỪ VIETSTOCK (22/08/2026) ────────────────────────────
        # Từ 22/08 tầng giá lấy VNDirect (nhanh gấp 17 lần, gọi theo lô). Nhưng đối chiếu
        # phiên 21/08 thì **khớp lệnh hai nguồn khớp tuyệt đối** (16.939 vs 16.940 tỷ) còn
        # **thoả thuận thì VNDirect BỎ SÓT**: tổng 2.607 tỷ so với 3.001 tỷ của Vietstock,
        # thiếu 394 tỷ dồn vào 7 mã — VHM 298,9 tỷ ghi thành 0, HUT 33,2 -> 0, HHC 27,1 -> 0.
        # KHÔNG PHẢI TRỄ MÀ LÀ SÓT: VHM phiên 20/08 đã chốt hẳn, VNDirect vẫn ghi ptValue=0.
        # Nên riêng `pv`/`pval` vẫn phải hỏi Vietstock — nhưng chỉ hỏi mã ĐÁNG hỏi: 348 mã
        # từng có thoả thuận trong 30 phiên gần nhất, tức 1,4 phút thay vì 6,4.
        # CHỈ TRỘN `pv`/`pval`, vứt mọi trường khác của lượt trả về — bằng không tầng giá
        # của Vietstock ghi đè lên tầng giá VNDirect và mất luôn luật "một cột một nguồn".
        u = json.load(open(UNI, encoding="utf-8"))["stocks"]
        ma = [x["sym"] for x in u]
        if a.ma:
            xin = {x.upper() for x in a.ma}
            ma = [m for m in ma if m in xin]
        if a.tuloc:
            truoc = len(ma)
            ma = loc_dang_goi(ma, "tt")
            print(f"  [tự lọc] {truoc} -> {len(ma)} mã từng có thoả thuận", flush=True)
        t0 = time.time()
        ok = loi = trong = 0
        for i, m in enumerate(ma):
            try:
                moi, sid = eod_nap(m, trang_toi=a.trang or 1)
            except Exception:
                moi, sid = None, None
            if not moi:
                loi += 1
                continue
            loc = {}
            for d, r in moi.items():
                o = {k: r[k] for k in ("pv", "pval") if r.get(k) is not None}
                if o:
                    loc[d] = o
            if not loc:
                trong += 1
                continue
            eod_ghi(m, loc, sid)
            ok += 1
            if (i + 1) % 100 == 0:
                print(f"    …{i+1}/{len(ma)}  {time.time()-t0:.0f}s", flush=True)
        print(f"  thoả thuận: ok {ok} · không có {trong} · lỗi {loi} · {time.time()-t0:.0f}s",
              flush=True)
        return

    if a.nn or a.td:
        nap = fn_nap if a.nn else td_nap
        ten = "khối ngoại" if a.nn else "tự doanh"
        # CHỈ MỘT TẦNG. `sid` đã nằm sẵn trong file nên khỏi phải gọi lại thống kê giá
        # chỉ để lấy một con số — 2 lượt/mã thay vì 8, tức 13 phút thay vì 51.
        u = json.load(open(UNI, encoding="utf-8"))["stocks"]
        ma = [x["sym"] for x in u]
        if a.ma:
            xin = {x.upper() for x in a.ma}
            ma = [m for m in ma if m in xin]
        if a.tuloc:
            truoc = len(ma)
            ma = loc_dang_goi(ma, "nn" if a.nn else "td")
            print(f"  [tự lọc] {truoc} -> {len(ma)} mã đáng gọi", flush=True)
        t0 = time.time()
        ok = loi = khongsid = khongco = 0
        hong = []
        for i, m in enumerate(ma):
            p = os.path.join(GD_DIR, m + ".json")
            if not os.path.exists(p):
                continue
            try:
                sid = json.load(open(p, encoding="utf-8")).get("sid")
            except Exception:
                sid = None
            if not sid:
                khongsid += 1
                continue
            try:
                r = nap(m, sid, day_du=a.tatca, trang_toi=a.trang)
            except Exception:
                r = None
            if r is None:
                loi += 1
                hong.append((m, sid))
                continue
            if not r:
                khongco += 1          # nguồn trả lời, mã này không có giao dịch loại đó
                continue
            eod_ghi(m, r)
            ok += 1
            if (i + 1) % 200 == 0:
                print(f"    …{i+1}/{len(ma)}  {time.time()-t0:.0f}s", flush=True)
        if hong:
            print(f"    thử lại {len(hong)} mã hỏng sau 30s…", flush=True)
            time.sleep(30)
            tt_token(ep=True)
            lai = 0
            for m, sid in hong:
                try:
                    r = nap(m, sid, day_du=a.tatca, trang_toi=a.trang)
                except Exception:
                    r = None
                if r:
                    eod_ghi(m, r)
                    ok += 1
                    lai += 1
                elif r is not None:
                    khongco += 1
                    lai += 1
            loi -= lai
            print(f"    thử lại cứu được {lai}/{len(hong)} mã", flush=True)
        print(f"  {ten}: ok {ok} · mã KHÔNG có giao dịch loại này {khongco}"
              f" · lỗi {loi} · không có sid {khongsid} · {time.time()-t0:.0f}s", flush=True)
        return 0

    if a.chiso:
        n = kho_chiso()
        print(f"  chỉ số: {n}/{len(IDX)} · {CHISO}", flush=True)
        return 0

    if a.vg:
        u = json.load(open(UNI, encoding="utf-8"))["stocks"]
        ma = [x["sym"] for x in u]
        if a.ma:
            xin = {x.upper() for x in a.ma}
            ma = [m for m in ma if m in xin]
        ngays = a.ngay or [datetime.datetime.now(TZ).strftime("%Y-%m-%d")]
        if a.tu:
            d0 = datetime.datetime.strptime(a.tu, "%Y-%m-%d").date()
            d1 = datetime.datetime.strptime(a.den or a.tu, "%Y-%m-%d").date()
            ngays = []
            while d0 <= d1:
                if d0.weekday() < 5:
                    ngays.append(d0.strftime("%Y-%m-%d"))
                d0 += datetime.timedelta(days=1)
            ngays.reverse()
        for ng in ngays:
            t0 = time.time()
            goi_ma, ok, rong = {}, 0, 0
            for m in ma:
                vg = vung_gia(m, ng)
                if vg is None:
                    continue
                if not vg:
                    rong += 1
                    continue
                dt = dong_tien(m, ng)
                if dt:
                    vg["cf"] = dt
                goi_ma[m] = vg
                ok += 1
            if not ok:
                print(f"  {ng}: không mã nào khớp lệnh (nghỉ, hoặc ngoài cửa sổ ~09/2025)",
                      flush=True)
                continue
            kb = phien_ghi(ng, goi_ma) / 1024
            muc = sum(len(x["p"]) for x in goi_ma.values())
            print(f"  {ng}: {ok:,} mã có vùng giá · {rong:,} mã không khớp lệnh"
                  f" · {muc:,} mức giá · {kb:,.0f} KB · {time.time()-t0:.0f}s", flush=True)
        return 0

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
        hong = []
        for i, m in enumerate(ma):
            try:
                moi, sid = eod_nap(m, day_du=a.tatca, trang_toi=a.trang, sau_toi=a.phien)
            except Exception:
                moi, sid = None, None
            if not moi:
                loi += 1
                hong.append(m)
                continue
            # KHỐI NGOẠI và TỰ DOANH — trộn vào cùng bản ghi ngày, cùng nhịp với giá và
            # sổ lệnh. Để chung một lượt chứ không tách thành hai bước riêng trong runner:
            # cả hai đều cần `sid` mà `sid` chỉ có sau khi gọi thống kê giá, nên tách ra là
            # phải gọi lại thống kê giá lần nữa chỉ để lấy một con số.
            for nap in (fn_nap, td_nap):
                try:
                    for d, r in (nap(m, sid, day_du=a.tatca, trang_toi=a.trang,
                                     sau_toi=a.phien) or {}).items():
                        moi.setdefault(d, {}).update(r)
                except Exception:
                    pass
            if sid:
                sids[m] = sid
            tong += eod_ghi(m, moi, sid, a.tatca)
            ok += 1
            if (i + 1) % 200 == 0:
                print(f"    …{i+1}/{len(ma)}  {time.time()-t0:.0f}s", flush=True)
        # THỬ LẠI MÃ HỎNG MỘT LƯỢT NỮA. Lượt chạy dài bị nguồn từ chối lác đác giữa chừng:
        # đo 20/08/2026 trên 1.529 mã trong 30 phút thì **818 mã lỗi**, mà thử lại ngay sau
        # đó thì mã nào cũng trả về đủ 100 phiên. Tức là hỏng TẠM THỜI (nguồn siết nhịp hoặc
        # phiên hết hạn), không phải mã đó không có dữ liệu.
        # Không có lượt này thì kho đứng ở độ sâu cũ mà log vẫn báo "ok 711" — nhìn qua như
        # đã chạy xong. Nghỉ 30 giây cho nguồn nguôi rồi mới thử lại.
        if hong:
            print(f"    thử lại {len(hong)} mã hỏng sau 30s…", flush=True)
            time.sleep(30)
            token(ep=True)                 # ép làm mới phiên trước khi thử lại
            lai = 0
            for m in hong:
                try:
                    moi, sid = eod_nap(m, day_du=a.tatca, trang_toi=a.trang, sau_toi=a.phien)
                except Exception:
                    continue
                if not moi:
                    continue
                try:
                    for nap2 in (fn_nap, td_nap):
                        for d, r in (nap2(m, sid, day_du=a.tatca, trang_toi=a.trang,
                                          sau_toi=a.phien) or {}).items():
                            moi.setdefault(d, {}).update(r)
                except Exception:
                    pass
                tong += eod_ghi(m, moi, sid, a.tatca)
                ok += 1
                lai += 1
            loi -= lai
            print(f"    thử lại cứu được {lai}/{len(hong)} mã", flush=True)
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
        tong_ma += len(ra)
        print(f"  {ng}: {len(ra):,} mã · {time.time()-t0:.0f}s", flush=True)
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
