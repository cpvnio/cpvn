"""KHO VỐN HOÁ SÂU — `data/vonhoa/{MÃ}.json`, một con số mỗi phiên, lùi tới 2013.

VÌ SAO CÓ FILE NÀY (23/08/2026)
-------------------------------
User: *"các mã trên sàn HOSE tôi cần lấy data vốn hoá xa hơn … hiện tại chỉ tới được
8/2022 là hết rồi"*. Đúng: đường vốn hoá trên chart nến đọc `data/giaodich/{MÃ}.json`
(`mcap = c × sh`) mà kho đó **cố định 1.000 phiên**, tức lùi tới ~18/08/2022. Nến thì có
từ 02/01/2013 và chỉ số có từ 28/07/2000 — nên vốn hoá là đường cụt nhất trên đồ thị.

BA TẦNG GHÉP LẠI, quyền giảm dần. Mỗi tầng một nguồn, và **tầng trên luôn thắng** ở phần
chồng nhau — nhờ vậy phần kho đã soi kỹ không bao giờ bị số cào mới đè lên:

  ① 18/08/2022 -> nay : `c × sh` của `data/giaodich`  — KHO ĐÃ SOI, đã qua
     `va_slcp_gdkhq.py` (dời bậc về ngày GDKHQ) và `lap_slcp_cu.py` (lấp đầu khung + `--soi`).
     KHÔNG gọi mạng. Đây là lý do file này không đẻ ra "con số vốn hoá thứ hai": vùng mà
     trang /phantich đang đọc thì hai bên lấy CÙNG một phép tính từ CÙNG một kho.
  ② ~03/2018 -> 18/08/2022 : `ratioCode:MARKETCAP` của VNDirect, lấy NGUYÊN.
     Đo trên vùng chồng nhau với tầng ①, 22 mã HOSE: **trung vị 0,000% ở 21/22 mã**.
  ③ 02/01/2013 -> 03/2018 : `close THÔ × vốn góp ÷ 10.000`.
     `v4/stock_prices` trả CẢ `close` (giá THÔ, đúng thứ vốn hoá cần) lẫn `adClose` (đã hạ
     nền, khớp `data/hist` tới từng đồng) — 3.400 phiên từ 02/01/2013.
     Vốn góp là dòng `x_von_gop` của `data/finx`, có từ Q1/07. Mệnh giá 10.000đ theo luật
     nên `vốn góp ÷ 10.000` = số cổ phiếu NIÊM YẾT.

VÌ SAO KHÔNG DÙNG MARKETCAP CHO CẢ 2013 — NGUỒN CHẶN CỨNG 2.171 BẢN GHI, không phải mình
chọn. Xin từ năm 2000 vẫn trả đúng 2.171 phiên, cũ nhất 14/03/2018. Trần này TRÔI DẦN theo
thời gian (mỗi phiên mới đẩy một phiên cũ ra), nên mốc tầng ② tự lùi theo — đừng viết cứng.

BA CÁI BẪY CỦA TẦNG ③
---------------------
1. **VỐN GÓP ĐĂNG KÝ TRỄ HƠN NGÀY GDKHQ, và trễ tới hơn một quý.** HPG chia thưởng trong
   Q2 nhưng vốn góp mãi Q3 mới nhảy. Lấy thẳng "vốn góp quý liền trước" thì bậc thang đặt
   sai chỗ hàng tháng trời — đo được p90 lệch 16,67% ở HPG, 33,33% ở PLP.
   Cách chữa: **vốn góp cho MỨC, `data/sukien` cho NGÀY.** Mỗi lần vốn góp đổi mức thì đi
   tìm trong cửa sổ [đầu quý trước, cuối quý này] một ngày GDKHQ mà tỉ lệ cộng dồn khớp
   với `mức mới ÷ mức cũ` (sai số 3%); khớp thì dời bậc về đúng ngày đó.
2. **VỐN GÓP LÀ CỔ PHIẾU NIÊM YẾT, MARKETCAP DÙNG CỔ PHIẾU LƯU HÀNH** — lệch nhau đúng
   phần cổ phiếu quỹ. Nên tầng ③ không dùng mức tuyệt đối của vốn góp: nó **quy về nền của
   tầng ②** bằng tỉ lệ đo tại phiên chung xa nhất (luật "ghép quá khứ phải quy về cùng
   nền" đã ghi ở mục `data/hist`). Đo tỉ lệ TRƯỚC khi ghép, đừng đo sau.
3. **PHÁT HÀNH RIÊNG LẺ / ESOP KHÔNG CÓ TRONG `data/sukien`** — bậc đó vốn góp vẫn bắt
   được (nên MỨC vẫn đúng) nhưng NGÀY thì rơi về đầu quý. Chấp nhận: sai vài tuần ở chỗ
   bậc, không sai mức.

TRỘN CHỨ KHÔNG GHI ĐÈ — cùng bài học với `kho_chiso`: tầng ② và ③ chỉ gọi mạng khi file
chưa có phần sâu (`--sau`), còn lượt EOD hằng ngày chỉ làm mới tầng ① từ kho, KHÔNG tốn
lượt mạng nào.

    python3 tools/kho_vonhoa.py --san HOSE --sau     # lượt đầu: cào phần sâu
    python3 tools/kho_vonhoa.py --san HOSE           # lượt EOD: chỉ làm mới tầng ①
    python3 tools/kho_vonhoa.py --ma HPG VNM --sau --thu
"""
import argparse
import collections
import datetime
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE, "tools"))
import nhipmang

GD = os.path.join(BASE, "data", "giaodich")
FINX = os.path.join(BASE, "data", "finx")
SK = os.path.join(BASE, "data", "sukien")
RA = os.path.join(BASE, "data", "vonhoa")

CO_TL = ("cp", "thuong")          # chỉ sự kiện có tỉ lệ CHẮC CHẮN làm tăng số cổ phiếu
KHOP = 0.03                       # sai số cho phép khi khớp tỉ lệ sự kiện với bậc vốn góp
TU = "2013-01-01"

MC = ("https://api-finfo.vndirect.com.vn/v4/ratios?q=code:%s~ratioCode:MARKETCAP"
      "~reportDate:gte:2000-01-01&order=reportDate&size=9990")
PR = ("https://api-finfo.vndirect.com.vn/v4/stock_prices?q=code:%s~date:gte:" + TU +
      "&sort=date&size=9990")


def jload(f):
    try:
        return json.load(open(f, encoding="utf-8"))
    except Exception:
        return None


def quy(d):
    y, m, _ = d.split("-")
    return (int(y), (int(m) - 1) // 3 + 1)


def quy_nhan(lab):                # 'Q3/22' -> (2022, 3)
    q, y = lab[1:].split("/")
    y = int(y)
    return (2000 + y if y < 80 else 1900 + y, int(q))


def dau_quy(t):
    return "%04d-%02d-01" % (t[0], (t[1] - 1) * 3 + 1)


def von_gop(sym):
    """[(quý, vốn góp tỷ)] xếp theo thời gian, bỏ ô trống."""
    j = jload(os.path.join(FINX, sym + ".json"))
    Q = (j or {}).get("Q") or {}
    lb = Q.get("labels") or []
    for r in Q.get("rows") or []:
        if r.get("k") == "x_von_gop":
            v = r.get("v") or []
            ra = [(quy_nhan(lb[i]), v[i]) for i in range(min(len(lb), len(v))) if v[i]]
            ra.sort()
            return ra
    return []


def su_kien(sym):
    """{ngày GDKHQ: tổng tỉ lệ %}. CỘNG tỉ lệ cùng ngày, đừng nhân — hai đợt cùng ngày
    đều tính trên số cổ phiếu TRƯỚC sự kiện (luật đã ghi ở `lap_slcp_cu.py`)."""
    j = jload(os.path.join(SK, sym + ".json"))
    g = collections.defaultdict(float)
    for e in (j or {}).get("ev") or []:
        if e.get("k") in CO_TL and e.get("tl"):
            g[e["d"]] += float(e["tl"])
    return dict(g)


def tang1(sym):
    """KHO ĐÃ SOI: {ngày: vốn hoá đồng} từ `data/giaodich`. Không gọi mạng."""
    j = jload(os.path.join(GD, sym + ".json"))
    if not j:
        return {}
    d, c, sh = j.get("d") or [], j.get("c") or [], j.get("sh") or []
    return {d[i]: c[i] * sh[i] for i in range(len(d))
            if i < len(c) and i < len(sh) and c[i] and sh[i]}


def tang23(sym, thu=False):
    """Hai tầng phải gọi mạng. Trả về (marketcap, giá thô) — cả hai {ngày: số}."""
    m, p = {}, {}
    try:
        for x in json.loads(nhipmang.get(MC % sym)).get("data") or []:
            if x.get("value"):
                m[x["reportDate"]] = float(x["value"])
    except Exception as e:
        if thu:
            print("    MARKETCAP lỗi: %s" % str(e)[:60])
    try:
        for x in json.loads(nhipmang.get(PR % sym)).get("data") or []:
            if x.get("close"):
                p[x["date"]] = float(x["close"]) * 1000.0
    except Exception as e:
        if thu:
            print("    stock_prices lỗi: %s" % str(e)[:60])
    return m, p


def bo_quy_lac(vg):
    """Bỏ quý mà vốn góp vọt lên rồi TRẢ VỀ MỨC CŨ ngay quý sau — ô rác của nguồn.

    Vốn điều lệ gần như chỉ đi lên, và có giảm (huỷ cổ phiếu quỹ) thì cũng giảm rồi ở lại.
    Một quý lệch cả hai hàng xóm trong khi hai hàng xóm khớp nhau thì đó là ô hỏng, không
    phải sự kiện. Đo được: CTI Q4/13 và PVP Q3/17 — mỗi mã đẻ ra một vách dựng rồi tụt lại
    trên đồ thị, đúng thứ đọc ra như doanh nghiệp phình gấp đôi trong một quý rồi teo về.
    """
    if len(vg) < 3:
        return vg
    ra = [vg[0]]
    bo = 0
    for i in range(1, len(vg) - 1):
        a, b, c = vg[i - 1][1], vg[i][1], vg[i + 1][1]
        if a and c and abs(c / a - 1) <= 0.03 and abs(b / a - 1) > 0.03:
            bo += 1
            continue
        ra.append(vg[i])
    ra.append(vg[-1])
    return ra


def bac_slcp(sym, vg, sk):
    """[(ngày bắt đầu hiệu lực, số cổ phiếu niêm yết)] — vốn góp cho MỨC, sự kiện cho NGÀY."""
    vg = bo_quy_lac(vg)
    if not vg:
        return []
    ra = [(dau_quy(vg[0][0]), vg[0][1] * 1e9 / 10000.0)]
    for i in range(1, len(vg)):
        q0, v0 = vg[i - 1]
        q1, v1 = vg[i]
        if v1 == v0:
            continue
        ngay = dau_quy(q1)
        if v0 > 0 and v1 > v0:
            ti = v1 / v0
            # cửa sổ [đầu quý TRƯỚC, hết quý này] — vốn góp trễ tới hơn một quý
            t0, t1 = dau_quy(q0), dau_quy((q1[0] + (q1[1] == 4), q1[1] % 4 + 1))
            ung = sorted(x for x in sk if t0 <= x < t1)
            # gom dần theo thời gian, dừng khi tỉ lệ cộng dồn khớp bậc vốn góp
            don = 1.0
            for x in ung:
                don *= 1 + sk[x] / 100.0
                if abs(don / ti - 1) <= KHOP:
                    ngay = ung[0]      # bậc bắt đầu từ ngày GDKHQ ĐẦU TIÊN của đợt
                    break
        ra.append((ngay, v1 * 1e9 / 10000.0))
    return ra


def slcp_tai(bac, d):
    v = None
    for ng, s in bac:
        if ng <= d:
            v = s
        else:
            break
    return v


def loc_gai(gop, gia, den):
    """SỐ CỔ PHIẾU LÀ BẬC THANG — lọc trung vị cửa sổ 5 trên `vốn hoá ÷ giá thô`.

    Bẫy bắt được: nguồn cập nhật số cổ phiếu LỆCH MỘT PHIÊN so với lúc hạ nền giá, nên
    đúng ngày GDKHQ vốn hoá tụt bằng đúng tỉ lệ chia rồi hôm sau bật lại. Chữ ký rất rõ —
    DBC 05/04/2022 ×0,521 rồi ×1,972; PDR ×0,740 rồi ×1,361; VND 30/09/2019 ×0,047 rồi
    ×20,64. Đo trên 405 mã HOSE: **8 mã** dính, và một cái gai như thế đọc trên đồ thị y
    như doanh nghiệp bốc hơi một nửa trong một phiên.

    VÌ SAO LỌC TRÊN SỐ CỔ PHIẾU CHỨ KHÔNG LỌC TRÊN VỐN HOÁ: vốn hoá đổi mỗi phiên theo giá
    nên lọc thẳng là bào mất chính biến động thật. Số cổ phiếu thì chỉ nhảy ở ngày sự kiện
    — trung vị cửa sổ 5 **giữ nguyên bậc thang** (tính chất kinh điển của bộ lọc trung vị)
    mà xoá sạch gai 1-2 phiên.

    CHỈ ÁP CHO PHẦN CÀO MỚI (`den` = phiên đầu của kho đã soi). Tầng kho đã qua
    `va_slcp_gdkhq` + `lap_slcp_cu --soi` rồi, đụng vào là phá số đã kiểm.

    **NGƯỠNG 8%, KHÔNG PHẢI 2%.** Để 2% thì nó "sửa" cả nhiễu làm tròn của nguồn: CTR bị
    đụng 113 ô và lệch hẳn 1,23% so với chính MARKETCAP ở vùng MARKETCAP là nguồn có thẩm
    quyền — tức bộ lọc làm SAI ĐI chứ không làm đúng thêm. Gai thật thì to hẳn (VND ×0,047).
    """
    ng = sorted(d for d in gop if d < den and gia.get(d))
    if len(ng) < 5:
        return 0
    sh = [gop[d] / gia[d] for d in ng]
    sua = 0
    moi = list(sh)
    for i in range(2, len(sh) - 2):
        m = sorted(sh[i - 2:i + 3])[2]
        if m > 0 and abs(sh[i] / m - 1) > 0.08:
            moi[i] = m
            sua += 1
    for i, d in enumerate(ng):
        if moi[i] != sh[i]:
            gop[d] = moi[i] * gia[d]
    return sua


def dinh_bac(gop, gia, sk, den):
    """DỜI BẬC SỐ CỔ PHIẾU VỀ ĐÚNG NGÀY GDKHQ — nguồn cập nhật trễ 1-2 phiên so với lúc
    hạ nền giá, và cái trễ đó đẻ ra một hố ngay giữa đồ thị.

    Chữ ký đo được trên 405 mã HOSE: DBC 05/04/2022 vốn hoá 8.620 -> **4.494** -> 8.862 tỷ
    trong ba phiên liền, đúng ngày GDKHQ thưởng 100%. Giá đã chia đôi từ phiên GDKHQ còn số
    cổ phiếu thì hôm sau mới nhân đôi, nên đúng một phiên vốn hoá bị chia đôi. Cùng họ:
    CSM (80%, trễ 2 phiên), KHG, PDR, PTB.

    KHÔNG lọc trung vị được ca này — chuỗi số cổ phiếu suy ra là một BẬC THANG SẠCH (cũ,
    cũ, mới), gai nằm ở chỗ bậc lệch NGÀY chứ không phải ở một ô lạc. Phải hỏi `data/sukien`
    xem ngày GDKHQ thật là ngày nào rồi kéo bậc về đó. Cửa sổ ±6 phiên, và tỉ lệ cộng dồn
    của sự kiện phải khớp bậc (sai số 5%) — không khớp thì để nguyên, thà lệch ngày còn hơn
    dời một bậc mình không hiểu.
    """
    ng = sorted(d for d in gop if d < den and gia.get(d))
    if len(ng) < 10 or not sk:
        return 0
    sh = [gop[d] / gia[d] for d in ng]
    doi = 0
    for i in range(1, len(sh)):
        if not sh[i - 1] or abs(sh[i] / sh[i - 1] - 1) <= 0.02:
            continue
        ti = sh[i] / sh[i - 1]
        lo, hi = max(0, i - 6), min(len(ng) - 1, i + 6)
        ung = sorted(x for x in sk if ng[lo] <= x <= ng[hi])
        for x in ung:
            don = 1.0
            for y in ung:
                if x <= y <= ng[i]:
                    don *= 1 + sk[y] / 100.0
            if abs(don / ti - 1) > 0.05:
                continue
            j = next((z for z in range(lo, hi + 1) if ng[z] >= x), None)
            if j is None or j == i:
                break
            for z in range(min(i, j), max(i, j)):
                sh[z] = sh[i]
                gop[ng[z]] = sh[i] * gia[ng[z]]
            doi += 1
            break
    return doi


def bo_dao(gop, gia, den, toi_da=90):
    """LƯỚI CUỐI: một MỨC số cổ phiếu chỉ tồn tại dưới 90 phiên rồi TRẢ VỀ ĐÚNG MỨC CŨ thì
    đó là ghi sổ lệch, không phải sự kiện doanh nghiệp.

    Doanh nghiệp có giảm vốn (huỷ cổ phiếu quỹ) nhưng giảm rồi Ở LẠI; không ai tăng gấp
    rưỡi rồi ba tuần sau về đúng số cũ. Đây là lưới bắt phần đuôi mà hai luật trên không
    với tới — chỗ nguồn và vốn góp lệch pha nhau vài tuần quanh một đợt phát hành.
    Đo trên 405 mã HOSE sau khi đã chạy `loc_gai` và `dinh_bac`: còn **6 mã** dính, mỗi mã
    một cặp (CSM · CTI · PVP · TCI · VND · ABR).

    **CÓ GHI LOG (`moc.dao`)**, đừng sửa im lặng: nếu một ngày nào đó con số này vọt lên
    thì nghĩa là nguồn đổi hành vi chứ không phải kho tự lành.
    """
    ng = sorted(d for d in gop if d < den and gia.get(d))
    if len(ng) < 20:
        return 0
    sh = [gop[d] / gia[d] for d in ng]
    bac = [i for i in range(1, len(sh))
           if sh[i - 1] and abs(sh[i] / sh[i - 1] - 1) > 0.02]
    sua = 0
    for a in range(len(bac)):
        i = bac[a]
        for b in range(a + 1, len(bac)):
            j = bac[b]
            if j - i > toi_da:
                break
            if not sh[i - 1] or abs(sh[j] / sh[i - 1] - 1) > 0.06:
                continue
            for z in range(i, j):
                sh[z] = sh[i - 1]
                gop[ng[z]] = sh[i - 1] * gia[ng[z]]
            sua += 1
            break
    return sua


def mot_ma(sym, sau, thu=False):
    t1 = tang1(sym)
    if not t1:
        return None, "không có data/giaodich"
    cu = jload(os.path.join(RA, sym + ".json")) or {}
    gop = {}
    for i, d in enumerate(cu.get("d") or []):
        v = (cu.get("v") or [None] * 0)[i] if i < len(cu.get("v") or []) else None
        if v:
            gop[d] = v * 1e9
    moc = dict(cu.get("moc") or {})
    gia_tho = {}
    if sau or not gop:
        m, p = tang23(sym, thu)
        gia_tho = p
        if m:
            moc["mc"] = min(m)
            for d, v in m.items():
                gop[d] = v
        # ---- tầng ③: giá thô × số cổ phiếu, rồi QUY VỀ NỀN của tầng ②
        bac = bac_slcp(sym, von_gop(sym), su_kien(sym))
        if bac and p and m:
            tho = {}
            for d, c in p.items():
                s = slcp_tai(bac, d)
                if s:
                    tho[d] = c * s
            chung = sorted(set(tho) & set(m))
            if len(chung) >= 60:
                # đo tỉ lệ ở 20 phiên chung XA NHẤT (mép ghép), lấy trung vị
                mep = chung[:20]
                ti = sorted(m[d] / tho[d] for d in mep)[len(mep) // 2]
                moc["tho"] = min(tho)
                moc["ti"] = round(ti, 6)
                for d, v in tho.items():
                    if d not in gop:
                        gop[d] = v * ti
    # ---- tầng ①: kho đã soi LUÔN THẮNG
    gop.update(t1)
    moc["kho"] = min(t1)
    if sau and gop:
        n = loc_gai(gop, gia_tho, moc["kho"])
        if n:
            moc["gai"] = n
        n = dinh_bac(gop, gia_tho, su_kien(sym), moc["kho"])
        if n:
            moc["doi"] = n
        # CHỈ tầng ③: từ mốc MARKETCAP trở đi thì nguồn ĐÓ mới là bên có thẩm quyền, sửa
        # ở đó là tự đặt phán đoán của mình lên trên số của nguồn. Đo được cái giá của
        # việc lấn sang: CTR lệch 1,23% và MIG 0,19% so với chính MARKETCAP.
        n = bo_dao(gop, gia_tho, moc.get("mc") or moc["kho"])
        if n:
            moc["dao"] = n
    if not gop:
        return None, "rỗng"
    d = sorted(x for x in gop if x >= TU)
    return {"sym": sym, "n": len(d), "moc": moc, "d": d,
            "v": [round(gop[x] / 1e9, 3) for x in d]}, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ma", nargs="*")
    ap.add_argument("--san", nargs="*", default=["HOSE"])
    ap.add_argument("--sau", action="store_true", help="cào phần sâu (gọi mạng 2 lượt/mã)")
    ap.add_argument("--thu", action="store_true", help="chạy thử, không ghi")
    a = ap.parse_args()

    uni = json.load(open(os.path.join(BASE, "universe.json"), encoding="utf-8"))["stocks"]
    if a.ma:
        syms = [s.upper() for s in a.ma]
    else:
        syms = [x["sym"] for x in uni if x.get("ex") in set(a.san)]
    syms.sort()
    print("KHO VỐN HOÁ SÂU — %d mã%s" % (len(syms), " (chạy thử)" if a.thu else ""), flush=True)
    if not a.thu:
        os.makedirs(RA, exist_ok=True)
    ok = loi = 0
    som = collections.Counter()
    for i, s in enumerate(syms, 1):
        o, e = mot_ma(s, a.sau, a.thu)
        if not o:
            loi += 1
            if a.thu:
                print("  %-5s %s" % (s, e))
            continue
        ok += 1
        som[o["d"][0][:4]] += 1
        if a.thu or i % 50 == 0 or i == len(syms):
            print("  [%4d/%d] %-5s %5d phiên · %s -> %s%s"
                  % (i, len(syms), s, o["n"], o["d"][0], o["d"][-1],
                     "" if not a.thu else ""), flush=True)
        if not a.thu:
            f = os.path.join(RA, s + ".json")
            json.dump(o, open(f + ".tmp", "w", encoding="utf-8"),
                      ensure_ascii=False, separators=(",", ":"))
            os.replace(f + ".tmp", f)
    print("\nxong: %d mã · %d lỗi" % (ok, loi))
    print("phiên đầu tiên theo năm:", dict(sorted(som.items())))


if __name__ == "__main__":
    main()
