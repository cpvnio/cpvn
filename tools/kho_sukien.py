#!/usr/bin/env python3
"""
KHO SỰ KIỆN DOANH NGHIỆP -> data/sukien/{MÃ}.json

VÌ SAO CÓ FILE NÀY: user chỉ vào chart Vietstock có mốc chia cổ tức từ 2010 và hỏi vì sao
chart CPVN không có. Đo lại thì kho sự kiện đang dùng nông hơn hẳn:

    HPG   Simplize events/list -> 5 năm      | Vietstock marks -> 34 mốc từ 2007
          `divQ` trong data/fin biết  7 quý  | vốn góp cho thấy 19 lần SLCP nhảy
    NTP   Simplize 22 sự kiện từ 03/2021     | Vietstock 50 mốc từ 05/2007
    VCB   VNDirect /v4/events từ 12/2021     | Vietstock 19 mốc từ 03/2010

HAI NGUỒN, DÒ RA BẰNG CÁCH NÀO:

① CHIA CỔ TỨC — `api.vietstock.vn/tvnew/marks`. Đây là datafeed UDF (chuẩn TradingView) của
  chính trang stockchart.vietstock.vn; tìm ra bằng cách tải mã nguồn trang đó rồi lần theo
  `new Datafeeds.UDFCompatibleDatafeed('https://api.vietstock.vn/tvnew')`. Không cần khoá,
  không cần cookie, chỉ cần `Referer`. Trả THẲNG mảng mốc kèm mô tả đầy đủ.
  MÚI GIỜ: `time` là mốc UNIX đọc ở **UTC+7** mới ra đúng ngày GDKHQ. Đọc theo UTC là lệch
  một ngày — đã đối chiếu: NTP chia 20% Vietstock ghi mốc 2026-06-09 (UTC), cộng 7 giờ ra
  10/06/2026, khớp đúng `exDividendDate` của Simplize.

② BÁO CÁO TÀI CHÍNH — `api-finfo.vndirect.com.vn/v4/financial_statements`, trường
  `createdDate`. Không có nguồn nào công bố thẳng "ngày ra BCTC", nhưng ngày VNDirect NẠP
  một kỳ báo cáo là thứ thay thế rất sát: đo trên 8 mã lớn, khoảng cách từ ngày chốt kỳ tới
  ngày nạp là 24-30 ngày và **khác nhau theo từng công ty** (NTP đều đặn 22 ngày, HPG 18-34,
  VCB 24-31) — tức là ngày thật chứ không phải một mốc nạp chung.
  > **CHỈ TIN TỪ 2020.** Cùng phép đo đó: kỳ 2019 trung vị cách 108 ngày, 2018 là 473 ngày,
  > 2016 là 1.203 ngày — đó là dấu vết NẠP HÀNG LOẠT khi VNDirect dựng kho, không phải ngày
  > công bố. Nên lọc cứng `cách kỳ <= NGUONG_BCTC`; kỳ nào không đạt thì BỎ, đừng vẽ mốc sai
  > lên chart rồi để người ta đọc phản ứng giá theo một ngày bịa.
  Hỏi GỘP được: `code:A,B,C,...` — 120 mã một lượt xong trong 1,2 giây, nên cả sàn chỉ tốn
  ~13 lượt gọi thay vì 1.529.

VÌ SAO KHO RIÊNG chứ không nhét vào data/hist: file hist bị GHI ĐÈ TOÀN BỘ mỗi lần nguồn hạ
nền (xem `refresh_daily.work_hist`), nhét vào đó là mất sạch vào một phiên GDKHQ nào đó mà
không ai biết. Kho riêng thì dựng lại lúc nào cũng được.

    python3 tools/kho_sukien.py             # cào toàn sàn
    python3 tools/kho_sukien.py VCB HPG     # vài mã
    python3 tools/kho_sukien.py --thu       # chỉ in, không ghi
"""
import json, os, re, sys, time, datetime, collections, threading
import concurrent.futures as cf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNI  = os.path.join(BASE, "universe.json")
KHO  = os.path.join(BASE, "data", "sukien")
VS   = "https://api.vietstock.vn/tvnew/marks"
VND  = "https://api-finfo.vndirect.com.vn/v4/financial_statements"
TU   = int(datetime.datetime(2000, 1, 1, tzinfo=datetime.UTC).timestamp())
DEN  = int(datetime.datetime(2030, 1, 1, tzinfo=datetime.UTC).timestamp())
LO   = 120            # số mã hỏi gộp một lượt sang VNDirect
NGUONG_BCTC = 60      # ngày — quá mức này là dấu vết nạp hàng loạt, xem chú thích đầu file
THU  = "--thu" in sys.argv

# "tỷ lệ 100:50" · "tỷ lệ 1000:181" · "tỷ lệ 10:1"
RX_TL   = re.compile(r"tỷ\s*lệ\s*([\d.,]+)\s*:\s*([\d.,]+)")
# "tỷ lệ 12%" · "tỷ lệ 8.6%" · "tỷ lệ 62,162%" — Ở DẠNG NÀY DẤU PHẨY LÀ DẤU THẬP PHÂN
# (62,162% = 62,162 phần trăm), ngược hẳn với dạng tiền bên dưới nơi phẩy là dấu NGHÌN
# ("1,200 đồng/CP" = 1200đ). Cùng một nguồn, hai quy ước — đọc chung một hàm là sai một loại.
RX_PCT  = re.compile(r"tỷ\s*lệ\s*([\d.,]+)\s*%")
# "1,200 đồng/CP" · "500 đồng/CP" · "2000đ/CP" (có mã viết tắt, không có dấu cách)
RX_TIEN = re.compile(r"([\d.,]+)\s*(?:đồng|đ)\s*/\s*CP", re.I)
# "giá 10,000 đồng/CP" — giá phát hành của đợt quyền mua
RX_GIA  = re.compile(r"giá\s*([\d.,]+)\s*(?:đồng|đ)\s*/\s*CP", re.I)
# "Phát hành thêm cho cán bộ công nhân viên 200,000 CP"
RX_SL   = re.compile(r"([\d.,]+)\s*CP\b")

lock = threading.Lock()
dem  = collections.Counter()


def jdump(o, p):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    json.dump(o, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)


def so(x):
    return float(str(x).replace(",", "").replace(" ", ""))


def ngayVN(ts):
    """Mốc UNIX -> ngày theo giờ VN. ĐỌC Ở UTC LÀ LỆCH MỘT NGÀY, xem chú thích đầu file."""
    return datetime.datetime.fromtimestamp(int(ts) + 7 * 3600, datetime.UTC).strftime("%Y-%m-%d")


def ty_le(t):
    """Tỷ lệ chia, chấp nhận cả hai cách nguồn ghi. Trả None nếu không có dạng nào."""
    m = RX_TL.search(t)
    if m: return round(so(m.group(2)) / so(m.group(1)) * 100, 3)
    m = RX_PCT.search(t)
    if m: return round(float(m.group(1).replace(",", ".")), 3)   # phẩy = THẬP PHÂN, xem RX_PCT
    return None


def doc_moc(t):
    """Đọc một dòng mô tả của Vietstock thành loại + số.

    THỨ TỰ KIỂM QUAN TRỌNG. "Thực hiện quyền mua cổ phiếu phát hành thêm, tỷ lệ 50%, giá
    10,000 đồng/CP" chứa CẢ "cổ phiếu" LẪN "đồng/CP", nên nếu bắt "cổ phiếu" trước thì một
    đợt CHÀO BÁN LẤY TIỀN bị đọc thành cổ tức cổ phiếu 50%, còn bắt "tiền" trước thì giá
    phát hành 10.000đ bị đọc thành cổ tức tiền mặt. Sai kiểu này không lộ ra ở đâu cả — nó
    chỉ âm thầm làm lệch mọi phép tính dựa trên kho.

    Phân biệt hai loại tăng vốn là thứ có giá trị riêng: chia cổ phiếu/thưởng thì nguồn HẠ
    NỀN giá theo đúng tỷ lệ, còn chào bán/ESOP thì KHÔNG (hoặc chỉ hạ một phần) — đó chính
    là chỗ phép tính vốn hoá quá khứ trước nay sai.

    Không đọc được thì vẫn GIỮ mốc với loại 'khac': thà hiện một mốc chỉ có chữ còn hơn
    đánh rơi sự kiện."""
    tl = t.lower()
    if "quyền mua" in tl:                       # chào bán cho cổ đông hiện hữu — CÓ THU TIỀN
        r = {"k": "quyenmua"}
        v = ty_le(t)
        if v is not None: r["tl"] = v
        m = RX_GIA.search(t)
        if m: r["gia"] = round(so(m.group(1)))
        return r
    if "phát hành thêm cho" in tl:               # ESOP / cổ đông chiến lược — CÓ THU TIỀN
        r = {"k": "phathanh"}
        m = RX_SL.search(t)
        if m: r["sl"] = round(so(m.group(1)))
        return r
    if "thưởng" in tl:
        r = {"k": "thuong"}; v = ty_le(t)
        if v is not None: r["tl"] = v
        return r
    if "cổ phiếu" in tl and "cổ tức" in tl:
        r = {"k": "cp"}; v = ty_le(t)
        if v is not None: r["tl"] = v
        return r
    if "tiền" in tl:
        m = RX_TIEN.search(t)
        return {"k": "tien", "tien": round(so(m.group(1)))} if m else {"k": "tien"}
    return {"k": "khac"}


def marks(sym):
    u = f"{VS}?symbol={sym}&from={TU}&to={DEN}&resolution=1D"
    try:
        d = json.loads(nhipmang.get(u, timeout=30, headers={"Referer": "https://stockchart.vietstock.vn/"}))
    except Exception:
        with lock: dem["loi_vs"] += 1
        return []
    ra = []
    for x in d or []:
        t = (x.get("text") or "").strip()
        if not t: continue
        r = {"d": ngayVN(x.get("time")), "gc": re.sub(r"\s+", " ", t)}
        r.update(doc_moc(t))
        ra.append(r)
    return ra


def qlb(ngay):        # '2026-06-30' -> 'Q2/26' — đúng nhãn cột của bảng KQKD
    y, m, _ = ngay.split("-")
    return "Q%d/%s" % ((int(m) - 1) // 3 + 1, y[2:])


def bctc(syms):
    """Ngày công bố BCTC cho MỘT LÔ mã. Hỏi gộp `code:A,B,C` -> 120 mã/lượt."""
    q = (f"{VND}?q=code:{','.join(syms)}~reportType:QUARTER~itemCode:23000"
         f"~fiscalDate:gte:2019-01-01&sort=fiscalDate:desc&size=5000")
    try:
        d = json.loads(nhipmang.get(q, timeout=60))
    except Exception:
        with lock: dem["loi_vnd"] += 1
        return {}
    ra = collections.defaultdict(dict)
    for x in d.get("data") or []:
        ky, cd = x.get("fiscalDate"), x.get("createdDate")
        if not ky or not cd: continue
        cd = cd[:10]
        try:
            cach = (datetime.date.fromisoformat(cd) - datetime.date.fromisoformat(ky)).days
        except Exception:
            continue
        if not (0 < cach <= NGUONG_BCTC):          # nạp hàng loạt -> bỏ, xem chú thích đầu file
            with lock: dem["bo_bctc"] += 1
            continue
        # cùng một kỳ có thể có nhiều dòng; giữ ngày SỚM NHẤT = lần nạp đầu
        cu = ra[x["code"]].get(ky)
        if cu is None or cd < cu: ra[x["code"]][ky] = cd
    return ra


def main():
    av = [a.upper() for a in sys.argv[1:] if not a.startswith("--")]
    uni = json.load(open(UNI, encoding="utf-8"))["stocks"]
    syms = av or [s["sym"] for s in uni]
    print(f"  {len(syms)} mã · Vietstock marks (cổ tức, đủ lịch sử) + VNDirect createdDate (BCTC, từ 2020)"
          + ("  [CHẠY THỬ]" if THU else ""))

    t0 = time.time()
    # ① BCTC hỏi gộp trước — rẻ, vài chục lượt
    bc = {}
    for i in range(0, len(syms), LO):
        bc.update(bctc(syms[i:i + LO]))
    print(f"  BCTC: {sum(len(v) for v in bc.values()):,} kỳ trên {len(bc):,} mã "
          f"(bỏ {dem['bo_bctc']:,} kỳ vì cách kỳ > {NGUONG_BCTC} ngày = nạp hàng loạt) · {time.time()-t0:.0f}s")

    # ② cổ tức — mỗi mã một lượt
    def viec(sym):
        ev = marks(sym)
        for ky, ngay in (bc.get(sym) or {}).items():
            ev.append({"d": ngay, "k": "bctc", "ky": qlb(ky), "gc": f"Công bố BCTC {qlb(ky)}"})
        ev.sort(key=lambda r: r["d"])
        with lock:
            dem["ma"] += 1
            dem["moc"] += len(ev)
            if not ev: dem["rong"] += 1
        p = os.path.join(KHO, sym + ".json")
        if ev and not THU:
            # CHỈ GHI KHI DANH SÁCH SỰ KIỆN THỰC SỰ ĐỔI. Ghi vô điều kiện thì trường
            # `updated` đổi mỗi ngày -> 1.482 file "thay đổi" mỗi lượt chạy, commit nào cũng
            # phình ra mà nội dung y hệt, và mỗi lượt build Cloudflare phải băm lại cả kho.
            try:
                cu = json.load(open(p, encoding="utf-8")).get("ev")
            except Exception:
                cu = None
            if cu == ev:
                with lock: dem["nguyen"] += 1
            else:
                jdump({"sym": sym, "updated": datetime.date.today().isoformat(),
                       "n": len(ev), "ev": ev}, p)
                with lock: dem["ghi"] += 1
        return sym, ev

    t1 = time.time()
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        kq = list(ex.map(viec, syms))
    print(f"  cổ tức: {dem['moc']:,} mốc trên {dem['ma']:,} mã "
          f"(rỗng {dem['rong']} · lỗi Vietstock {dem['loi_vs']} · lỗi VNDirect {dem['loi_vnd']}) "
          f"· {time.time()-t1:.0f}s")
    print(f"  ghi {dem['ghi']:,} file · giữ nguyên {dem['nguyen']:,} file (không đổi)")

    loai = collections.Counter(r["k"] for _, ev in kq for r in ev)
    print(f"  theo loại: {dict(loai)}")
    cu = min((r["d"] for _, ev in kq for r in ev), default="—")
    print(f"  mốc cũ nhất trong kho: {cu}")
    if len(av) <= 3:
        for s, ev in kq[:3]:
            print(f"\n  {s}: {len(ev)} mốc")
            for r in ev[:3] + ev[-3:]:
                print(f"    {r['d']}  [{r['k']}] {r['gc'][:70]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
