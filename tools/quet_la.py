# -*- coding: utf-8 -*-
"""QUÉT BẤT THƯỜNG — "hôm nay có gì lạ". `data/dactrung/*` -> `data/quetla.json`.

VÌ SAO CÓ FILE NÀY (21/08/2026)
------------------------------
Trang phân tích trả lời tốt câu "mã nào to nhất, tiền chảy vào đâu". Nó KHÔNG trả lời
được câu "có chuyện gì bất thường tôi chưa thấy" — mà đó mới là câu người ngồi soi dữ
liệu thật sự hỏi. Một bảng 1.525 dòng xếp theo giá trị thì mọi thứ bất thường đều nằm
lẫn trong đó, và không ai đọc hết 1.525 dòng mỗi ngày.

Quét thử 100 phiên trước khi viết, để chắc là mỗi phép có bắt được gì thật:
· thoả thuận lệch ≥15% giá sàn, ≥20 tỷ  -> **45 lượt**. TID sang tay BA lô ~230 tỷ trong
  hai tuần, đều ở **−26%** so với giá sàn. Ba lần cùng một mức chiết khấu không phải ngẫu
  nhiên — đó là chuyển nhượng nội bộ hoặc xử lý tài sản bảo đảm, và không trang nào ở
  Việt Nam hiện nó ra.
· số cổ phiếu nhảy >5% trong một phiên -> **143 lượt** (TET +991%, TRA +100%, F88 +100%).
  Phát hành thêm là một trong những chỉ báo âm bền nhất đo được trên mọi thị trường.

MÔ TẢ, KHÔNG KHUYẾN NGHỊ. Mỗi mục nói một sự kiện ĐO ĐƯỢC đã xảy ra ("thoả thuận khớp
thấp hơn giá sàn 26%"), tuyệt đối không kèm suy diễn nên làm gì. Xem mục *Ranh giới pháp
lý* trong CLAUDE.md — khoản 32 Điều 4 Luật CK 2019.

NGƯỠNG ĐỀU ĐI KÈM CỔNG THANH KHOẢN. Không có cổng thì mọi bảng đều bị mã khớp vài trăm
nghìn đồng chiếm chỗ: chúng nhảy trần đều đặn, đổi chủ vài lô là "đột biến khối lượng
20 lần", và đẩy hết thứ đáng đọc xuống dưới.

  python3 tools/quet_la.py               # quét phiên gần nhất
  python3 tools/quet_la.py --ngay 2026-08-19
  python3 tools/quet_la.py --sau 100     # quét ngược 100 phiên, in ra để soi
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DT = os.path.join(BASE, "data", "dactrung")
UNI = os.path.join(BASE, "universe.json")
RA = os.path.join(BASE, "data", "quetla.json")

TOP = 12                 # mỗi mục giữ ngần này dòng — bảng dài hơn thì không ai đọc hết
MIN_GT = 1e9             # cổng thanh khoản chung: 1 tỷ khớp lệnh trong phiên
MIN_TT = 20e9            # thoả thuận phải từ 20 tỷ mới đáng gọi là một cú sang tay


def doc(p):
    try:
        return json.load(open(p, encoding="utf-8"))
    except Exception:
        return None


def ghi_neu_doi(p, o):
    """GHI CHỈ KHI NỘI DUNG THỰC SỰ ĐỔI. Trả về True nếu có ghi.

    Mọi đặc trưng của một phiên đều tính TẠI phiên đó (đỉnh 52 tuần, cửa sổ 20 phiên
    trước, kỳ BCTC đang hiệu lực) nên phiên CŨ ra kết quả y hệt ở mọi lượt chạy. Ghi vô
    điều kiện thì lượt EOD mỗi ngày đụng vào cả 100 file × ~510 KB = **~51 MB blob mới
    mỗi phiên** trong git, cho nội dung không đổi một byte.

    Cùng luật với `kho_sukien.py` ("chỉ ghi file khi danh sách sự kiện thực sự đổi").
    So bằng CHUỖI ĐÃ TUẦN TỰ HOÁ chứ đừng so dict: thứ tự khoá khác nhau thì hai dict
    bằng nhau nhưng file khác nhau, mà git nhìn file."""
    moi = json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    try:
        with open(p, encoding="utf-8") as f:
            if f.read() == moi:
                return False
    except Exception:
        pass
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(moi)
    os.replace(tmp, p)
    return True


_KHO = {}


def nap_kho():
    """NẠP CẢ KHO ĐẶC TRƯNG MỘT LẦN rồi giữ lại. Quét 100 phiên mà mỗi phiên đọc lại
    1.529 file là 152.900 lượt mở file cho một việc chỉ cần 1.529."""
    if _KHO:
        return _KHO
    u = json.load(open(UNI, encoding="utf-8"))["stocks"]
    _KHO["ten"] = {s["sym"]: s.get("name") or "" for s in u}
    _KHO["sec"] = {s["sym"]: s.get("sector") or "" for s in u}
    hang, gd = [], {}
    for s in u:
        m = s["sym"]
        o = doc(os.path.join(DT, m + ".json"))
        if o and o.get("d"):
            hang.append((m, o))
        g = doc(os.path.join(BASE, "data", "giaodich", m + ".json"))
        if g and g.get("d"):
            gd[m] = g
    _KHO["hang"] = hang
    _KHO["gd"] = gd
    # GIAO DỊCH NGƯỜI NỘI BỘ, gom theo NGÀY. Kho này bồi dần (data/news chỉ giữ 30 ngày)
    # nên phiên cũ hơn khoảng bồi sẽ không có gì — đó là thiếu THẬT, không phải lỗi.
    nb = {}
    try:
        for r in (doc(os.path.join(BASE, "data", "noibo.json")) or {}).get("gd", []):
            if r.get("d") and r.get("xong"):
                nb.setdefault(r["d"], []).append(r)
    except Exception:
        nb = {}
    _KHO["nb"] = nb
    return _KHO


def quet(ngay=None):
    K = nap_kho()
    ten, nganh, hang = K["ten"], K["sec"], K["hang"]
    if not hang:
        return None
    if not ngay:
        # PHIÊN GẦN NHẤT MÀ NHIỀU MÃ CÙNG CÓ, không phải phiên xa nhất mà một mã nào đó có.
        dem = {}
        for m, o in hang:
            for x in o["d"][-3:]:
                dem[x] = dem.get(x, 0) + 1
        ngay = max((x for x in dem if dem[x] >= 100), default=max(dem))

    r = []
    for m, o in hang:
        try:
            i = o["d"].index(ngay)
        except ValueError:
            continue
        g = lambda k: (o.get(k) or [None] * o["n"])[i]
        r.append({
            "sym": m, "ten": ten.get(m, ""), "sec": nganh.get(m, ""),
            "c": g("c"), "pc": g("pc"), "mval": g("mval") if o.get("mval") else None,
            "ttl": g("ttl"), "dsh": g("dsh"), "gtx": g("gtx"), "d52": g("d52"),
            "fnr": g("fnr"), "tdr": g("tdr"), "clm": g("clm"), "room": g("room"),
            "vqf": g("vqf"), "ep": g("ep"), "roe": g("roe"), "kyCB": g("kyCB"),
        })
    # `mval` không nằm trong kho đặc trưng (nó là số thô) — lấy lại từ kho giao dịch
    for x in r:
        o = K["gd"].get(x["sym"])
        if not o:
            continue
        try:
            i = o["d"].index(ngay)
        except (ValueError, KeyError):
            continue
        x["mval"] = (o.get("mval") or [None] * len(o["d"]))[i]
        x["pval"] = (o.get("pval") or [None] * len(o["d"]))[i]
        x["pv"] = (o.get("pv") or [None] * len(o["d"]))[i]

    co = [x for x in r if x.get("mval")]
    thanh = [x for x in co if x["mval"] >= MIN_GT]

    def lay(rows, key, nguoc=False, n=TOP):
        z = [x for x in rows if x.get(key) is not None]
        z.sort(key=lambda x: x[key], reverse=not nguoc)
        return [{k: x.get(k) for k in
                 ("sym", "ten", "sec", "c", "pc", "mval", "pval", "ttl", "dsh",
                  "gtx", "d52", "fnr", "tdr", "clm", "room")} for x in z[:n]]

    muc = {}

    # ① THOẢ THUẬN LỆCH XA GIÁ SÀN — cú sang tay lô lớn ở giá thương lượng.
    tt = [x for x in r if x.get("ttl") is not None and x.get("pval")
          and x["pval"] >= MIN_TT and abs(x["ttl"]) >= 10]
    tt.sort(key=lambda x: -abs(x["ttl"]))
    muc["thoathuan"] = [{k: x.get(k) for k in
                         ("sym", "ten", "sec", "c", "pc", "pval", "pv", "ttl")} for x in tt[:TOP]]

    # ② SỐ CỔ PHIẾU NHẢY BẬC — phát hành thêm, chia thưởng, chuyển đổi.
    ds = [x for x in r if x.get("dsh") is not None and abs(x["dsh"]) >= 5]
    ds.sort(key=lambda x: -abs(x["dsh"]))
    muc["slcp"] = [{k: x.get(k) for k in ("sym", "ten", "sec", "c", "pc", "dsh")} for x in ds[:TOP]]

    # ③ ĐỘT BIẾN THANH KHOẢN — khớp lệnh gấp nhiều lần trung bình 20 phiên TRƯỚC ĐÓ.
    db = [x for x in thanh if x.get("gtx") and x["gtx"] >= 3]
    muc["dotbien"] = lay(db, "gtx")

    # ④ KHỐI NGOẠI VÀ TỰ DOANH ĐỐI ĐẦU — hai nhóm lớn đi ngược chiều trên cùng một mã.
    # Đây là thứ không đọc ra được từ bất kỳ con số tổng nào.
    dd = []
    for x in thanh:
        f, t = x.get("fnr"), x.get("tdr")
        if f is None or t is None:
            continue
        if (f > 0) == (t > 0):
            continue
        if min(abs(f), abs(t)) < 5e9:
            continue
        y = dict(x)
        y["doi"] = min(abs(f), abs(t))
        dd.append(y)
    dd.sort(key=lambda x: -x["doi"])
    muc["doidau"] = [{k: x.get(k) for k in
                      ("sym", "ten", "sec", "c", "pc", "mval", "fnr", "tdr")} for x in dd[:TOP]]

    # ⑤ ROOM NGOẠI CÒN RẤT ÍT — mã khối ngoại gần như không mua thêm được nữa.
    #  âm đã bị  chuyển thành None (nguồn không biết trần sở hữu),
    # nên tới đây chỉ còn số thật. Vẫn chặn lại một lần cho chắc.
    rm = [x for x in thanh if x.get("room") is not None and 0 <= x["room"] <= 1.0]
    rm.sort(key=lambda x: (x["room"], -(x["mval"] or 0)))
    muc["room"] = [{k: x.get(k) for k in
                    ("sym", "ten", "sec", "c", "pc", "mval", "room", "fnr")} for x in rm[:TOP]]

    # ⑥ ĐANG Ở ĐỈNH 52 TUẦN kèm tiền vào — vị trí giá, KHÔNG phải nhận định.
    dh = [x for x in thanh if x.get("d52") is not None and x["d52"] >= -1
          and x.get("gtx") and x["gtx"] >= 1.5]
    dh.sort(key=lambda x: -(x.get("gtx") or 0))
    muc["dinh"] = [{k: x.get(k) for k in
                    ("sym", "ten", "sec", "c", "pc", "mval", "d52", "gtx")} for x in dh[:TOP]]

    # ⑦ NGƯỜI NỘI BỘ VỪA CÔNG BỐ ĐÃ MUA / ĐÃ BÁN. Ghép với ① là ra bức tranh đủ: mã vừa
    # có lô thoả thuận sang tay dưới giá sàn *và* có người nội bộ bán ra thì hai dấu vết
    # đó nói cùng một chuyện. Đo được ngay lượt đầu: CLI có hai lô thoả thuận −14,9% và
    # −14,6% cuối tháng 6, rồi Chủ tịch HĐQT bán 4.000.000 CP ngày 14/08.
    gia = {x["sym"]: x for x in r}
    nb = []
    for z in (K.get("nb") or {}).get(ngay, []):
        y = dict(z)
        g = gia.get(z["sym"]) or {}
        y["c"] = g.get("c")
        y["pc"] = g.get("pc")
        y["mval"] = g.get("mval")
        y["gt"] = (g.get("c") or 0) * z["sl"] or None
        nb.append(y)
    nb.sort(key=lambda x: -(x.get("gt") or 0))
    muc["noibo"] = [{k: x.get(k) for k in
                     ("sym", "ten", "chuc", "chieu", "sl", "gt", "c", "pc", "lq")}
                    for x in nb[:TOP]]

    # ⑧ CỠ LỆNH BÊN BÁN LỚN HƠN HẲN BÊN MUA (và ngược lại). Lệnh to là tổ chức.
    cl = [x for x in thanh if x.get("clm") is not None and abs(x["clm"]) >= 0.7]
    cl.sort(key=lambda x: -abs(x["clm"]))
    muc["colenh"] = [{k: x.get(k) for k in
                      ("sym", "ten", "sec", "c", "pc", "mval", "clm")} for x in cl[:TOP]]

    return {
        "ngay": ngay,
        # `n` là số mã CÓ KHỚP LỆNH trong phiên, không phải số mã có mặt trong kho. Phần
        # lớn sàn UPCOM không khớp lệnh nào trong một phiên bất kỳ — đếm chúng vào đây là
        # nói quá độ rộng thị trường lên gần gấp đôi (1.525 so với 849 ở phiên 20/08).
        "n": len(co),
        "nThanh": len(thanh),
        "muc": muc,
    }


# Đặc trưng bày ra cho BỘ LỌC TỰ CHỌN của người dùng. Thứ tự cố định, client đọc theo
# chỉ số nên **thêm thì nối vào CUỐI, đừng chèn giữa** — chèn giữa là mọi cột lệch một ô
# mà không có gì báo.
COT_DT = ["vqf", "ami", "bd20", "vol20", "gtx", "d52", "clm", "cl",
          "ep", "roe", "ngaypt", "ngaytk", "novayvc", "biengop",
          "fnr20", "fnp", "room", "shu", "mcapFF", "r20", "r60", "ttp"]


def lat_cat(ngay):
    """LÁT CẮT NGANG toàn thị trường tại một phiên — nguyên liệu cho bộ lọc tự chọn.

    ĐÂY LÀ BỘ ĐO, KHÔNG PHẢI DANH MỤC GỢI Ý. Kho bày ra các đại lượng đã tính sẵn và để
    NGƯỜI DÙNG tự chọn lọc theo cái nào, ngưỡng bao nhiêu, xếp theo cái nào. Tuyệt đối
    không chấm điểm tổng hợp bằng trọng số của chủ trang rồi cắt lấy top N — đó đúng là
    thứ `PRO_N`/`PRO_LIQ`/`PRO_FLAT` đã làm và đã bị gỡ hẳn 16/08/2026 (xem mục *Ranh
    giới pháp lý* trong CLAUDE.md): dù từng yếu tố đều đo được, thứ người dùng nhận về
    vẫn là "đây là N mã", tức một danh mục khuyến nghị. Khi người dùng tự đặt tiêu chí
    thì kết quả là của họ.
    """
    K = nap_kho()
    ra = {}
    for m, o in K["hang"]:
        try:
            i = o["d"].index(ngay)
        except ValueError:
            continue
        v = []
        for k in COT_DT:
            a = o.get(k)
            v.append(a[i] if a and i < len(a) else None)
        if any(x is not None for x in v):
            ra[m] = v
    return ra


def main():
    av = sys.argv[1:]
    ngay = None
    if "--ngay" in av:
        ngay = av[av.index("--ngay") + 1]
    if "--sau" in av:
        # quét ngược nhiều phiên, chỉ IN RA để soi — không ghi file
        k = int(av[av.index("--sau") + 1])
        o = doc(os.path.join(DT, "VCB.json")) or doc(os.path.join(DT, "HPG.json"))
        ds = (o or {}).get("d", [])[-k:]
        for ng in ds:
            q = quet(ng)
            if not q:
                continue
            s = " · ".join("{} {}".format(len(v), kk) for kk, v in q["muc"].items() if v)
            if s:
                print("  {}  {}".format(ng, s))
        return 0

    # GHI THẲNG VÀO FILE PHIÊN, không để riêng một file cho phiên gần nhất. Trang phân
    # tích xoay quanh MỘT phiên đang chọn và đã tải sẵn `data/phien/{NGÀY}.json`; nhét
    # kết quả quét vào đó thì đổi phiên là quét đổi theo, không tốn thêm lượt tải nào và
    # không đẻ ra một nguồn thứ hai có thể lệch pha với bảng ngay bên cạnh.
    if "--phien" in av:
        k = int(av[av.index("--phien") + 1])
        PH = os.path.join(BASE, "data", "phien")
        fs = sorted(f for f in os.listdir(PH) if f.endswith(".json"))[-k:]
        ghi = 0
        for f in fs:
            ng = f[:-5]
            q = quet(ng)
            if not q or not any(q["muc"].values()):
                continue
            p = os.path.join(PH, f)
            cu = doc(p) or {}
            cu["la"] = q
            cu["dtf"] = COT_DT
            cu["dt"] = lat_cat(ng)
            if ghi_neu_doi(p, cu):
                ghi += 1
        print("  quét {} phiên · GHI {} file (số còn lại nội dung y hệt, không đụng vào)"
              .format(len(fs), ghi))
        return 0

    q = quet(ngay)
    if not q:
        print("  chưa có data/dactrung — chạy tools/kho_dactrung.py trước")
        return 1
    tmp = RA + ".tmp"
    json.dump(q, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, RA)
    print("QUÉT BẤT THƯỜNG phiên {} — {:,} mã có khớp lệnh, {:,} qua cổng thanh khoản".format(
        q["ngay"], q["n"], q["nThanh"]))
    ten = {"thoathuan": "thoả thuận lệch giá sàn", "slcp": "số cổ phiếu nhảy bậc",
           "dotbien": "đột biến thanh khoản", "doidau": "ngoại/tự doanh đối đầu",
           "room": "room ngoại gần cạn", "dinh": "đang ở đỉnh 52 tuần",
           "noibo": "người nội bộ mua/bán", "colenh": "cỡ lệnh lệch mạnh"}
    for k, v in q["muc"].items():
        print("  {:<26s} {:>3d}  {}".format(
            ten.get(k, k), len(v), " ".join(x["sym"] for x in v[:8])))
    print("  ghi {} ({:,.0f} KB)".format(RA, os.path.getsize(RA) / 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())
