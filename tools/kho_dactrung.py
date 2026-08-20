# -*- coding: utf-8 -*-
"""KHO ĐẶC TRƯNG — `data/dactrung/{MÃ}.json`. Tính MỘT LẦN, mọi phân tích sau đọc lại.

VÌ SAO CÓ KHO NÀY (21/08/2026)
------------------------------
Kho thô đã đủ (`data/giaodich` giá + dòng tiền theo phiên · `data/hist` nến 11 năm ·
`data/nganh` chỉ tiêu cơ bản theo quý · `data/sukien` ngày công bố BCTC · `data/profile`
free float), nhưng chưa phép phân tích nào dùng được ngay: mỗi lần hỏi một câu là phải
mở lại 1.529 file rồi tự tính vòng quay, biên độ, cộng dồn khối ngoại… Kho này làm sẵn
phần đó, và quan trọng hơn — làm ĐÚNG MỘT KIỂU, để hai phép đo khác nhau không ra hai
định nghĩa khác nhau của cùng một đại lượng.

BỐN LUẬT, phá cái nào cũng ra số trông hợp lý mà sai
----------------------------------------------------
1. **CƠ BẢN PHẢI THEO NGÀY CÔNG BỐ, KHÔNG THEO NGÀY CHỐT KỲ.** Đây là cái bẫy giết nhiều
   nghiên cứu nhân tố nhất và nó im lặng tuyệt đối. Lãi quý 2 chốt sổ 30/06 nhưng mãi
   cuối tháng 7 hoặc tháng 8 mới ra thị trường; gán nó cho phiên 01/07 là cho mô hình biết
   trước tương lai 30-60 ngày, và kết quả backtest đẹp lên một cách rất thuyết phục.
   `data/sukien` có sẵn ngày công bố thật (1.199 mã, trung vị 26 quý, từ 2020) — dùng nó.
   Mã không có ngày công bố thì **để trống phần cơ bản**, đừng lùi đại 45 ngày cho có.
2. **VÒNG QUAY TÍNH TRÊN FREE FLOAT.** Cổ phiếu nhà nước nắm không bao giờ ra sàn nên đếm
   chúng vào mẫu số là chia cho một con số không liên quan: BID free float 2,6%, tính
   trên toàn bộ cổ phiếu thì vòng quay nhỏ đi gần 40 lần. Đo trên 99 phiên, vòng quay
   free float dự báo lợi suất phiên sau mạnh hơn (rank IC −0,043 t=−3,29 so với −0,036
   t=−3,18). Vẫn giữ cả `vq` (toàn bộ) để so được với số của nơi khác.
3. **LỢI SUẤT DỒN TỪ `c/tc−1` CỦA TỪNG PHIÊN, ĐỪNG LẤY `c[i]/c[i−k]`.** `tc` là giá tham
   chiếu ĐÃ HẠ NỀN của chính phiên đó, nên tích các `(1+pc)` tự động sạch mọi sự kiện
   quyền. Lấy giá chia giá là mỗi lần chia cổ tức đẻ ra một cú sập giả trong chuỗi lợi
   suất — và mã trả cổ tức đều thì cú sập ấy lặp lại hằng năm.
4. **CỬA SỔ TRƯỢT PHẢI ĐỦ Ô MỚI TÍNH.** Thiếu ô thì để `None`. Trung bình 20 phiên tính
   trên 6 phiên vẫn ra một con số, và con số đó trông y hệt số thật.

  python3 tools/kho_dactrung.py            # dựng tất cả
  python3 tools/kho_dactrung.py --ma HPG VCB
  python3 tools/kho_dactrung.py --thu      # chạy thử 40 mã, không ghi
"""
import json
import math
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
HIST = os.path.join(BASE, "data", "hist")
NGANH = os.path.join(BASE, "data", "nganh")
SUKIEN = os.path.join(BASE, "data", "sukien")
PROFILE = os.path.join(BASE, "data", "profile")
UNI = os.path.join(BASE, "universe.json")
RA = os.path.join(BASE, "data", "dactrung")

PBAN = 1                       # đổi cách tính -> tăng số này để lượt sau dựng lại

# Chỉ tiêu cơ bản lấy từ `data/nganh` (đã tính sẵn theo quý cho 1.331 mã).
# Không tự tính lại từ BCTC thô: `build_nganh.py` đã xử lý xong chuyện năm mẫu báo cáo
# khác nhau, mã dòng khác nhau giữa ngân hàng / chứng khoán / sản xuất — làm lại là đẻ
# ra bản thứ hai của cùng một logic rồi hai bản trôi khỏi nhau.
CB = ("roe", "lnst4", "cfo4", "ngaypt", "ngaytk", "novayvc", "biengop")


def jdump(o, p):
    t = p + ".tmp"
    with open(t, "w", encoding="utf-8") as f:
        json.dump(o, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(t, p)


def doc(p):
    try:
        return json.load(open(p, encoding="utf-8"))
    except Exception:
        return None


def tb(v, i, k):
    """Trung bình `k` ô kết thúc ở `i`. Thiếu ô -> None (luật 4)."""
    if i + 1 < k:
        return None
    x = [v[j] for j in range(i - k + 1, i + 1)]
    if any(y is None for y in x):
        return None
    return sum(x) / k


def cong(v, i, k):
    if i + 1 < k:
        return None
    x = [v[j] for j in range(i - k + 1, i + 1)]
    if any(y is None for y in x):
        return None
    return sum(x)


def lech(v, i, k):
    if i + 1 < k:
        return None
    x = [v[j] for j in range(i - k + 1, i + 1)]
    if any(y is None for y in x):
        return None
    m = sum(x) / k
    return math.sqrt(sum((y - m) ** 2 for y in x) / (k - 1))


def don(v, i, k):
    """Lợi suất dồn `k` phiên gần nhất, từ chuỗi % TỪNG PHIÊN (luật 3)."""
    if i + 1 < k:
        return None
    r = 1.0
    for j in range(i - k + 1, i + 1):
        if v[j] is None:
            return None
        r *= 1 + v[j] / 100.0
    return (r - 1) * 100


def ky_so(lb):
    """'Q2/26' -> 202602, để so thứ tự kỳ. Nguồn dùng năm 2 chữ số."""
    try:
        q, y = lb.split("/")
        n = int(y)
        return (2000 + n if n < 80 else 1900 + n) * 100 + int(q[1:])
    except Exception:
        return None


def nap_cb(sym):
    """Chỉ tiêu cơ bản THEO NGÀY CÔNG BỐ (luật 1).

    Trả về danh sách [(ngày công bố, {chỉ tiêu})] xếp tăng dần theo ngày, để lúc quét
    chuỗi phiên chỉ cần chạy một con trỏ tiến lên. Kỳ nào không có ngày công bố thì BỎ —
    thà thiếu còn hơn gán một ngày đoán.
    """
    ng = doc(os.path.join(NGANH, sym + ".json"))
    sk = doc(os.path.join(SUKIEN, sym + ".json"))
    if not ng or not sk:
        return []
    cb = {}
    for e in sk.get("ev") or []:
        if e.get("k") == "bctc" and e.get("ky") and e.get("d"):
            # cùng một kỳ có thể công bố lại (đính chính) — giữ lần ĐẦU, vì đó mới là
            # lúc thị trường biết tin
            k = e["ky"]
            if k not in cb or e["d"] < cb[k]:
                cb[k] = e["d"]
    if not cb:
        return []
    kys = ng.get("ky") or []
    d = ng.get("d") or {}
    ra = []
    for i, lb in enumerate(kys):
        ngay = cb.get(lb)
        if not ngay:
            continue
        r = {}
        for k in CB:
            v = d.get(k)
            if v and i < len(v) and v[i] is not None:
                r[k] = v[i]
        if r:
            r["ky"] = lb
            ra.append((ngay, r))
    ra.sort(key=lambda x: x[0])
    return ra


def dinh52(sym):
    """Đỉnh cao nhất 252 phiên, đọc `data/hist` (sâu 11 năm) chứ không đọc kho 100 phiên.

    Khoảng cách tới đỉnh 52 tuần cần đúng 252 phiên lịch sử; kho giao dịch chỉ có 100 nên
    tự nó luôn báo "đang ở đỉnh" cho mã nào tăng suốt bốn tháng qua — sai theo hướng
    nguy hiểm nhất vì nghe rất thuận tai.
    """
    o = doc(os.path.join(HIST, sym + ".json"))
    if not o or not o.get("t") or not o.get("c"):
        return {}
    import datetime
    UTC = datetime.timezone.utc
    t, c = o["t"], o["c"]
    ra, n = {}, len(t)
    for i in range(n):
        if c[i] is None or c[i] <= 0:
            continue
        j0 = max(0, i - 251)
        mx = 0
        for j in range(j0, i + 1):
            if c[j] and c[j] > mx:
                mx = c[j]
        if mx > 0:
            ng = datetime.datetime.fromtimestamp(t[i], UTC).strftime("%Y-%m-%d")
            ra[ng] = round((c[i] / mx - 1) * 100, 2)
    return ra


def lam(sym, ff):
    o = doc(os.path.join(GD, sym + ".json"))
    if not o or not o.get("d"):
        return None
    d = o["d"]
    n = len(d)
    g = lambda k: (o.get(k) or [None] * n)

    c, tc, h, l = g("c"), g("tc"), g("h"), g("l")
    mval, mv, pval, pv, sh = g("mval"), g("mv"), g("pval"), g("pv"), g("sh")
    qM, qB, nM, nB = g("qMua"), g("qBan"), g("nMua"), g("nBan")
    fM, fB = g("fnMuaGT"), g("fnBanGT")
    fMT, fBT = g("fnMuaTTGT"), g("fnBanTTGT")
    tM, tB = g("tdMuaGT"), g("tdBanGT")
    # ROOM ÂM = NGUỒN KHÔNG BIẾT TRẦN SỞ HỮU, KHÔNG PHẢI "ĐÃ VƯỢT TRẦN".
    # Đo 21/08/2026 trên 386/1.529 mã có room âm ở phiên cuối: room bằng ĐÚNG trừ tỉ lệ
    # sở hữu, tới từng chữ số thập phân (SZL room −16,25 / sở hữu 16,25 · PTS −7,67 /
    # 7,67 · BTU −0,03 / 0,03). Tức nguồn tính `trần − sở hữu` với trần = 0 vì không có
    # số. Để nguyên thì mã nào cũng lọt vào bảng "room gần cạn" với con số −0,03% trông
    # như sắp hết room tới nơi, trong khi sự thật là KHÔNG BIẾT.
    # Cùng họ với luật `fRoom` âm của `data/eod` (xem CLAUDE.md) — hai kho khác nhau,
    # cùng một cái bẫy, nên chặn ở tầng đặc trưng để mọi chỗ đọc sau đều sạch.
    room = [None if (x is None or x < 0) else x for x in g("fnRoom")]
    shu = g("fnSoHuu")

    pc = [None] * n
    for i in range(n):
        if c[i] and tc[i]:
            pc[i] = (c[i] / tc[i] - 1) * 100

    # ── theo phiên ──
    vq = [None] * n; vqf = [None] * n; ami = [None] * n; bd = [None] * n
    clm = [None] * n; cl = [None] * n
    fnr = [None] * n; fnrk = [None] * n; fnp = [None] * n; tdr = [None] * n
    ttp = [None] * n; ttl = [None] * n
    mcap = [None] * n; mcapFF = [None] * n; dsh = [None] * n
    for i in range(n):
        if mv[i] is not None and sh[i]:
            vq[i] = round(mv[i] / sh[i] * 100, 4)
            if ff:
                vqf[i] = round(mv[i] / (sh[i] * ff / 100.0) * 100, 4)
        # AMIHUD — |lợi suất %| trên mỗi TỶ đồng khớp lệnh. Cao = giá nhảy nhiều dù khớp
        # ít tiền = mã mỏng. Thước đo kém thanh khoản chuẩn của giới học thuật, và tính
        # được bằng đúng những gì kho đang có.
        if pc[i] is not None and mval[i]:
            ami[i] = round(abs(pc[i]) / (mval[i] / 1e9), 4)
        if h[i] and l[i] and c[i]:
            bd[i] = round((h[i] - l[i]) / c[i] * 100, 3)
        # CỠ LỆNH ĐẶT — lệnh to là tổ chức, lệnh nhỏ là cá nhân. `clm` > 0 nghĩa là bên
        # MUA đang đặt lệnh to hơn bên bán. Đây là thứ user từng bảo bỏ khỏi giao diện vì
        # "khối lượng đặt mua/đặt bán chỉ làm nhiễu" — đúng với số THÔ, nhưng chia cho SỐ
        # LỆNH thì nó thành một đại lượng khác hẳn về chất.
        if qM[i] and qB[i] and nM[i] and nB[i]:
            a, b = qM[i] / nM[i], qB[i] / nB[i]
            cl[i] = round((qM[i] + qB[i]) / (nM[i] + nB[i]), 1)
            if a > 0 and b > 0:
                clm[i] = round(math.log(a / b), 4)
        if fM[i] is not None or fB[i] is not None:
            fnr[i] = (fM[i] or 0) - (fB[i] or 0)
            # RÒNG CHỈ KHỚP LỆNH — bỏ thoả thuận ra. Thoả thuận là giao dịch dàn xếp
            # trước ở giá thương lượng, nó không nói gì về cầu trên sổ lệnh. Đo được
            # nhỉnh hơn bản gộp (rank IC +0,031 t=+2,50 so với +0,030 t=+2,44).
            fnrk[i] = ((fM[i] or 0) - (fMT[i] or 0)) - ((fB[i] or 0) - (fBT[i] or 0))
            if mval[i]:
                fnp[i] = round(((fM[i] or 0) + (fB[i] or 0)) / 2 / mval[i] * 100, 3)
        if tM[i] is not None or tB[i] is not None:
            tdr[i] = (tM[i] or 0) - (tB[i] or 0)
        if mval[i]:
            ttp[i] = round((pval[i] or 0) / mval[i], 4)
        if pval[i] and pv[i] and c[i]:
            ttl[i] = round(((pval[i] / pv[i]) / c[i] - 1) * 100, 2)
        if c[i] and sh[i]:
            mcap[i] = c[i] * sh[i]
            if ff:
                mcapFF[i] = round(c[i] * sh[i] * ff / 100.0)
        if i and sh[i] and sh[i - 1]:
            v = sh[i] / sh[i - 1] - 1
            if abs(v) > 1e-9:
                dsh[i] = round(v * 100, 3)

    # ── cửa sổ trượt ──
    gt20 = [None] * n; bd20 = [None] * n; vol20 = [None] * n
    r5 = [None] * n; r20 = [None] * n; r60 = [None] * n
    fnr20 = [None] * n; vqf20 = [None] * n; gtx = [None] * n
    for i in range(n):
        gt20[i] = tb(mval, i, 20)
        bd20[i] = tb(bd, i, 20)
        vol20[i] = lech(pc, i, 20)
        r5[i] = don(pc, i, 5)
        r20[i] = don(pc, i, 20)
        r60[i] = don(pc, i, 60)
        fnr20[i] = cong(fnr, i, 20)
        vqf20[i] = tb(vqf, i, 20)
        # ĐỘT BIẾN THANH KHOẢN — giá trị hôm nay so với trung bình 20 phiên TRƯỚC ĐÓ.
        # So với cửa sổ CÓ CHỨA chính phiên hôm nay là tự pha loãng cú đột biến bằng
        # chính nó: một phiên gấp 20 lần chỉ hiện ra thành gấp ~2.
        t20 = tb(mval, i - 1, 20) if i else None
        if t20 and mval[i]:
            gtx[i] = round(mval[i] / t20, 2)
    for a in (gt20, bd20, vol20, r5, r20, r60, vqf20):
        for i in range(n):
            if a[i] is not None:
                a[i] = round(a[i], 4)

    # ── đỉnh 52 tuần (kho nến sâu) ──
    d52m = dinh52(sym)
    d52 = [d52m.get(x) for x in d]

    # ── cơ bản theo NGÀY CÔNG BỐ ──
    moc = nap_cb(sym)
    cbs = {k: [None] * n for k in CB}
    cbs["kyCB"] = [None] * n
    if moc:
        j = -1
        for i, ng in enumerate(d):
            while j + 1 < len(moc) and moc[j + 1][0] <= ng:
                j += 1
            if j >= 0:
                r = moc[j][1]
                cbs["kyCB"][i] = r.get("ky")
                for k in CB:
                    cbs[k][i] = r.get(k)
    # LỢI SUẤT TRÊN GIÁ (earnings yield) — nghịch đảo P/E, dùng được cả khi lỗ (P/E thì
    # không: mã lỗ ra P/E âm rồi xếp bảng lẫn với mã rẻ nhất). `lnst4` của nguồn tính
    # bằng TỶ đồng, vốn hoá bằng đồng.
    ep = [None] * n
    for i in range(n):
        if cbs["lnst4"][i] is not None and mcap[i]:
            ep[i] = round(cbs["lnst4"][i] * 1e9 / mcap[i] * 100, 3)

    return {
        "sym": sym, "v": PBAN, "n": n, "ff": ff,
        "d": d, "c": c, "pc": [None if x is None else round(x, 3) for x in pc],
        "vq": vq, "vqf": vqf, "vqf20": vqf20, "ami": ami, "bd": bd, "bd20": bd20,
        "vol20": vol20, "cl": cl, "clm": clm, "gt20": gt20, "gtx": gtx,
        "r5": r5, "r20": r20, "r60": r60, "d52": d52,
        "fnr": fnr, "fnrk": fnrk, "fnp": fnp, "fnr20": fnr20, "tdr": tdr,
        "room": room, "shu": shu, "ttp": ttp, "ttl": ttl,
        "mcap": mcap, "mcapFF": mcapFF, "dsh": dsh, "ep": ep,
        **cbs,
    }


def main():
    av = sys.argv[1:]
    thu = "--thu" in av
    chi = None
    if "--ma" in av:
        k = av.index("--ma")
        chi = {x.upper() for x in av[k + 1:] if not x.startswith("--")}

    u = json.load(open(UNI, encoding="utf-8"))["stocks"]
    ma = [x["sym"] for x in u]
    if chi:
        ma = [m for m in ma if m in chi]
    if thu:
        ma = ma[:40]

    ff = {}
    for f in os.listdir(PROFILE):
        if f.endswith(".json"):
            o = doc(os.path.join(PROFILE, f))
            v = (o or {}).get("freeFloat")
            if isinstance(v, (int, float)) and 0 < v <= 100:
                ff[f[:-5]] = float(v)

    os.makedirs(RA, exist_ok=True)
    ok = bo = 0
    coCB = coFF = co52 = 0
    for m in ma:
        r = lam(m, ff.get(m))
        if not r:
            bo += 1
            continue
        if any(x is not None for x in r["kyCB"]):
            coCB += 1
        if r["ff"]:
            coFF += 1
        if any(x is not None for x in r["d52"]):
            co52 += 1
        if not thu:
            jdump(r, os.path.join(RA, m + ".json"))
        ok += 1

    kb = sum(os.path.getsize(os.path.join(RA, f)) for f in os.listdir(RA)) / 1024 if os.path.isdir(RA) else 0
    print("KHO ĐẶC TRƯNG data/dactrung")
    print("  dựng {:,} mã · bỏ {:,} (không có kho giao dịch)".format(ok, bo))
    print("  có free float          : {:,}".format(coFF))
    print("  có cơ bản THEO NGÀY CB : {:,}".format(coCB))
    print("  có đỉnh 52 tuần        : {:,}".format(co52))
    print("  kho {:,.0f} KB".format(kb))
    if thu:
        print("  (--thu: chạy 40 mã, KHÔNG ghi)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
