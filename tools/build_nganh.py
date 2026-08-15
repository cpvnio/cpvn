#!/usr/bin/env python3
"""
CHỈ SỐ ĐẶC THÙ NGÀNH — dựng data/nganh/{MÃ}.json từ kho có sẵn, KHÔNG gọi mạng.

VÌ SAO CẦN: cùng một bảng cân đối nhưng mỗi loại hình doanh nghiệp có "con số sống còn"
khác nhau — ngân hàng là cho vay/tiền gửi, bất động sản là tồn kho dở dang và tiền người
mua trả trước, sản xuất là ngày tồn kho/ngày phải thu. Trang cổ phiếu in nguyên bảng
CĐKT thì mấy con số đó chìm giữa 20 dòng. File này TÍNH SẴN chuỗi chỉ số theo mẫu ngành
để trang hiện thành ô riêng có màu, và giữ TRỌN lịch sử (kho `data/fin` chỉ còn 8 kỳ
cân đối, kho sâu `data/finq` mới đủ ~79 quý — trang web cố ý không đọc finq, nên phải
bồi kết quả tính ra đây).

NGUỒN SỐ — ba luật, phá là số sai âm thầm:
  · Cân đối kế toán: trục kỳ = HỢP của finq (dài) và fin (mới nhất); kỳ trùng lấy số FIN
    (24hMoney) vì kho sâu cũng ưu tiên số kho cho khối bs (xem đầu tools/kho_sau.py).
    fin cập nhật hằng ngày còn finq chờ kho_sau --moi, nên quý mới nhất thường chỉ fin có.
  · Lưu chuyển tiền tệ: CHỈ LẤY finq, TUYỆT ĐỐI không rơi về fin — dấu cfa* trong data/fin
    sai 60% số ô (đo 11/08/2026, gốc ở chính nguồn 24hMoney). Mã chưa có finq thì để
    trống CFO, thà thiếu còn hơn cộng 4 quý bằng dấu bịa.
  · Kết quả kinh doanh (doanh thu, giá vốn, LNST, biên gộp): lấy `Q` của fin — khối này
    đã gom dồn theo nhãn nên đủ lịch sử; finq không có KQKD.

MẪU (`mau`) chọn theo sector của universe + dữ liệu thực có:
  nh  Tài chính ngân hàng CÓ bsb103+bsb113 (F88 mang sector ngân hàng nhưng báo cáo mẫu
      thường -> rơi về sx, đừng ép)         · cho vay, tiền gửi, LDR, đầu tư CK, đòn bẩy, ROE
  ck  Chứng khoán và Ngân hàng đầu tư       · vốn vay, vay/VCSH, đòn bẩy, biên ròng, ROE
      (nguồn KHÔNG có dòng "cho vay ký quỹ" — cả fin lẫn finq chỉ giữ 20 dòng tóm tắt
      mẫu thường; muốn có phải mở thêm mã dòng ở kho_sau, cần mạng để dò và kiểm)
  bh  Bảo hiểm                              · đòn bẩy, phải thu, CFO 4 quý, biên ròng, ROE
  bds Quản lý và phát triển bất động sản    · tồn kho (+%TTS), người mua trả trước, vay/VCSH,
                                              phải thu, CFO 4 quý, ROE
  sx  còn lại (sản xuất/bán lẻ/xây dựng/tiện ích) · tồn kho + ngày tồn, phải thu + ngày thu,
                                              vay/VCSH, biên gộp, CFO 4 quý vs LNST 4 quý, ROE

NGƯỠNG MÀU nằm ở CLIENT (cophieu.html) — file này chỉ chứa SỐ. Ngưỡng nào đo từ phân bố
thật thì ghi chú ngay tại client: LDR 100/120 = tam phân vị 29 ngân hàng, đòn bẩy ngân
hàng 10/13, chứng khoán 1,5/2,5 (đo 14/08/2026 trên kho fin).

Đơn vị: TỶ ĐỒNG (giữ nguyên của data/fin). ROE/biên/ldr: %, đòn bẩy: lần, ngày: ngày.

  python3 tools/build_nganh.py             # dựng toàn bộ
  python3 tools/build_nganh.py --ma HPG,SSI
  python3 tools/build_nganh.py --moi       # chỉ mã có fin/finq mới hơn file nganh (pipeline)
"""
import json, os, re, sys, collections

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIN  = os.path.join(BASE, "data", "fin")
FINQ = os.path.join(BASE, "data", "finq")
COCAU = os.path.join(BASE, "data", "cocau")
OUT  = os.path.join(BASE, "data", "nganh")

SEC_NH  = "Tài chính ngân hàng"
SEC_CK  = "Chứng khoán và Ngân hàng đầu tư"
SEC_BH  = "Bảo hiểm"
SEC_BDS = "Quản lý và phát triển bất động sản"


def jdump(obj, path):
    tmp = path + ".tmp"
    json.dump(obj, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


def thu_tuQ(lb):
    m = re.match(r"Q(\d)/(\d{2})$", str(lb))
    return 2000 + int(m.group(2)) + int(m.group(1)) / 10 if m else -1


def _rows(khoi):
    """{mã dòng: {nhãn kỳ: giá trị}} của một khối bs/cf."""
    ra = {}
    if not khoi or not khoi.get("labels"):
        return ra
    lbs = khoi["labels"]
    for r in khoi.get("rows") or []:
        ra[r["k"]] = {lb: v for lb, v in zip(lbs, r.get("v") or []) if v is not None}
    return ra


def hop_nhat(fin, finq):
    """-> (trục kỳ tăng dần, bs {k:{kỳ:v}}, cf {k:{kỳ:v}} — cf CHỈ từ finq)."""
    bs_q = _rows((finq or {}).get("bsQ"))
    bs_f = _rows((fin or {}).get("bsQ"))
    bs = {}
    for k in set(bs_q) | set(bs_f):
        d = dict(bs_q.get(k) or {})
        d.update(bs_f.get(k) or {})          # kỳ trùng: số fin thắng
        bs[k] = d
    cf = _rows((finq or {}).get("cfQ"))      # tuyệt đối không lấy cf của fin (sai dấu)
    ky = set()
    for m in bs.values(): ky |= set(m)
    for m in cf.values(): ky |= set(m)
    for r in (fin or {}).get("Q") or []:
        if r.get("label"): ky.add(r["label"])
    ky = sorted((k for k in ky if thu_tuQ(k) > 0), key=thu_tuQ)
    return ky, bs, cf


def _lam(v, so=1):
    return None if v is None else round(v, so)


def day(ky, m, so=1):
    return [_lam(m.get(lb), so) for lb in ky] if m else [None] * len(ky)


def cong(a, b):
    """cộng hai chuỗi, None ở một vế coi như 0 nhưng cả hai None thì vẫn None."""
    return [None if (x is None and y is None) else round((x or 0) + (y or 0), 1)
            for x, y in zip(a, b)]


def chia(a, b, he=1, so=2):
    return [None if (x is None or not y) else round(x / y * he, so) for x, y in zip(a, b)]


def lan4(vals, so=1):
    """tổng trượt 4 kỳ — thiếu kỳ nào trong cửa sổ thì kỳ đó ra None."""
    ra = [None] * len(vals)
    for i in range(3, len(vals)):
        w = vals[i - 3:i + 1]
        if all(v is not None for v in w):
            ra[i] = round(sum(w), so)
    return ra


def margin_ck(sym, ky):
    """Dư nợ cho vay ký quỹ của công ty chứng khoán, khớp lên trục kỳ của data/nganh.

    Lấy `ts.bs5` ("Các khoản cho vay") trong `data/cocau` — kho DUY NHẤT có dòng này, vì
    `data/fin` và `data/finq` đều dùng bản CĐKT mẫu THƯỜNG không có khoản mục cho vay
    (xem tools/cao_cocau.py). Đọc file có sẵn, KHÔNG gọi mạng, nên `build_nganh` vẫn giữ
    đúng tính chất "chạy offline" của nó — chỉ cần pipeline gọi cào trước bước này.

    CHUỖI NGẮN HƠN HẲN TRỤC KỲ và đó là chuyện bình thường: nguồn chỉ trả 15 quý (từ
    Q4/2022) trong khi trục của data/nganh dài tới 79 quý. Kỳ nào không có thì để None —
    client in `—`, đúng như mọi ô thiếu số khác. ĐỪNG kéo giá trị gần nhất lấp vào chỗ
    trống: dư nợ ký quỹ đổi từng quý, bịa một số cho ô 2015 là nói sai một cách rất khó
    phát hiện.
    """
    p = os.path.join(COCAU, f"{sym}.json")
    if not os.path.exists(p):
        return None
    try:
        d = json.load(open(p, encoding="utf-8"))
    except Exception:
        return None
    if d.get("nhom") != "INVESTMENT":
        return None
    day_q = ((d.get("Q") or {}).get("ts") or {}).get("bs5")
    lb_q = (d.get("ky") or {}).get("Q") or []
    if not day_q or len(day_q) != len(lb_q):
        return None
    m = {lb: v for lb, v in zip(lb_q, day_q) if v is not None}
    ra = [m.get(lb) for lb in ky]
    return ra if any(v is not None for v in ra) else None


def ngay_vong(ts, dong, ky):
    """số ngày một vòng (tồn kho theo giá vốn, phải thu theo doanh thu):
    bình quân đầu-cuối kỳ / dòng chảy quý × 90. Thiếu vế nào ra None vế đó."""
    ra = [None] * len(ky)
    for i in range(len(ky)):
        d = dong[i]
        if d is None or d <= 0 or ts[i] is None:
            continue
        bq = ts[i] if (i == 0 or ts[i - 1] is None) else (ts[i] + ts[i - 1]) / 2
        ra[i] = round(bq / d * 90)
    return ra


def roe4(np4, vcsh, ky):
    """LNST 4 quý / VCSH bình quân của đúng 4 kỳ đó (%)."""
    ra = [None] * len(ky)
    for i in range(3, len(ky)):
        if np4[i] is None:
            continue
        vc = [v for v in vcsh[i - 3:i + 1] if v is not None]
        if vc and sum(vc) > 0:
            ra[i] = round(np4[i] / (sum(vc) / len(vc)) * 100, 1)
    return ra


def dung_mot_ma(fin, finq, sector):
    ky, bs, cf = hop_nhat(fin, finq)
    if not ky:
        return None
    Q = {r["label"]: r for r in (fin or {}).get("Q") or [] if r.get("label")}
    b = lambda k, so=1: day(ky, bs.get(k), so)
    np_ = [_lam((Q.get(lb) or {}).get("np")) for lb in ky]
    rev = [_lam((Q.get(lb) or {}).get("rev")) for lb in ky]
    vcsh, tts = b("bsa78"), b("bsa53")
    np4 = lan4(np_)
    d = {}

    mau = "sx"
    if sector == SEC_NH and bs.get("bsb103") and bs.get("bsb113"):
        mau = "nh"
        d["chovay"]  = b("bsb103")
        d["tiengui"] = b("bsb113")
        d["ldr"]     = chia(d["chovay"], d["tiengui"], 100, 1)
        d["dautuck"] = chia(b("bsb106"), tts, 100, 1)
        d["donbay"]  = chia(tts, vcsh, 1, 2)
        d["roe"]     = roe4(np4, vcsh, ky)
    elif sector == SEC_CK:
        mau = "ck"
        mg = margin_ck(fin.get("sym"), ky)
        if mg:
            d["margin"]   = mg
            d["marginvc"] = chia(mg, vcsh, 100, 1)   # % vốn chủ — cách ngành tự nói về nó
        d["vay"]    = cong(b("bsa56"), b("bsa71"))
        d["vayvc"]  = chia(d["vay"], vcsh, 1, 2)
        d["donbay"] = chia(tts, vcsh, 1, 2)
        d["bienrong"] = [_lam((Q.get(lb) or {}).get("nm")) for lb in ky]
        d["roe"]    = roe4(np4, vcsh, ky)
    elif sector == SEC_BH:
        mau = "bh"
        d["donbay"]  = chia(tts, vcsh, 1, 2)
        d["phaithu"] = b("bsa8")
        d["cfo4"]    = lan4(day(ky, cf.get("cfa18")))
        d["bienrong"] = [_lam((Q.get(lb) or {}).get("nm")) for lb in ky]
        d["roe"]     = roe4(np4, vcsh, ky)
    elif sector == SEC_BDS:
        mau = "bds"
        d["tonkho"]   = b("bsa15")
        d["tonkhotts"] = chia(d["tonkho"], tts, 100, 1)
        d["tratruoc"] = cong(b("bsa58"), b("bsa170"))
        d["novay"]    = cong(b("bsa56"), b("bsa71"))
        d["novayvc"]  = chia(d["novay"], vcsh, 1, 2)
        d["phaithu"]  = cong(b("bsa8"), b("bsa24"))
        d["phaithutts"] = chia(d["phaithu"], tts, 100, 1)
        d["cfo4"]     = lan4(day(ky, cf.get("cfa18")))
        d["roe"]      = roe4(np4, vcsh, ky)
    else:
        cogs = [_lam((Q.get(lb) or {}).get("cogs")) for lb in ky]
        gm = []
        for lb, r, c in zip(ky, rev, cogs):
            g = (Q.get(lb) or {}).get("gm")
            if g is None and r and c is not None:
                g = (r - c) / r * 100
            gm.append(_lam(g))
        d["tonkho"]  = b("bsa15")
        d["ngaytk"]  = ngay_vong(d["tonkho"], cogs, ky)
        d["phaithu"] = b("bsa8")
        d["ngaypt"]  = ngay_vong(d["phaithu"], rev, ky)
        d["novay"]   = cong(b("bsa56"), b("bsa71"))
        d["novayvc"] = chia(d["novay"], vcsh, 1, 2)
        d["biengop"] = gm
        d["cfo4"]    = lan4(day(ky, cf.get("cfa18")))
        d["lnst4"]   = np4
        d["roe"]     = roe4(np4, vcsh, ky)

    # cắt đuôi kỳ đầu toàn None cho gọn file; giữ nguyên phần còn lại (LƯU TOÀN BỘ)
    co = [i for i in range(len(ky)) if any(v[i] is not None for v in d.values())]
    if not co:
        return None
    i0, i1 = co[0], co[-1] + 1
    return {"sym": fin.get("sym"), "mau": mau, "ky": ky[i0:i1],
            "d": {k: v[i0:i1] for k, v in d.items()}}


def main(chi=None, moi=False):
    u = json.load(open(os.path.join(BASE, "universe.json"), encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    dem = collections.Counter(); loi = []
    for s in u["stocks"]:
        sym, sector = s["sym"], s.get("sector") or ""
        if chi and sym not in chi:
            continue
        pf, pq = os.path.join(FIN, sym + ".json"), os.path.join(FINQ, sym + ".json")
        po = os.path.join(OUT, sym + ".json")
        if not os.path.exists(pf):
            dem["khong_fin"] += 1; continue
        if moi and os.path.exists(po):
            mt = max(os.path.getmtime(pf),
                     os.path.getmtime(pq) if os.path.exists(pq) else 0)
            if os.path.getmtime(po) >= mt:
                dem["nguyen"] += 1; continue
        try:
            fin = json.load(open(pf, encoding="utf-8"))
            finq = json.load(open(pq, encoding="utf-8")) if os.path.exists(pq) else None
            ra = dung_mot_ma(fin, finq, sector)
            if not ra:
                dem["trong"] += 1; continue
            jdump(ra, po)
            dem["ok"] += 1; dem["mau_" + ra["mau"]] += 1
        except Exception as e:
            loi.append(sym)
            if len(loi) <= 5: print(f"  {sym} LỖI: {e}", flush=True)
    ra = dict(dem)
    if loi: ra["loi"] = len(loi)
    print("✓ data/nganh:", ra, flush=True)
    return ra


if __name__ == "__main__":
    chi = None; moi = False
    for a in sys.argv[1:]:
        if a == "--moi": moi = True
        if a.startswith("--ma"):
            chi = {x.strip().upper() for x in a.split("=", 1)[-1].replace("--ma", "").split(",") if x.strip()}
    main(chi=chi, moi=moi)
