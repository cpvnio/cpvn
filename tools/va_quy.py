#!/usr/bin/env python3
"""
VÁ QUÝ CŨ vào data/fin/{MÃ}.json — lấy từ VNDirect financial_statements.

Vì sao cần: nguồn KQKD chính (24hMoney) chỉ trả 8 KỲ GẦN NHẤT và không có cách xin thêm
(đã thử page/size/offset/fromYear/year — luôn đúng 8). Nên trang cổ phiếu bấm vào năm 2023
trở về trước không bung được quý nào. VNDirect có tới 81 quý, lùi tận 2005.

CÁCH TỰ KIỂM CHỨNG — phần quan trọng nhất của script này:
mỗi mã đều có sẵn 8 quý do 24hMoney cung cấp. Trước khi tin VNDirect, đối chiếu nguyên
8 quý đó. Khớp thì mới lấy phần CŨ HƠN; không khớp thì bỏ qua mã đó và ghi vào báo cáo.
Nhờ vậy sai sơ đồ mã dòng ở một nhóm ngành nào đó sẽ lộ ra ngay chứ không âm thầm ghi
số bậy vào bảng tài chính mà người xem tưởng là thật.

MỖI TRƯỜNG CÓ NHIỀU MÃ ỨNG VIÊN và script TỰ CHỌN mã khớp nhất cho từng doanh nghiệp,
thay vì đoán theo ngành. Vì cùng một khái niệm lại nằm ở mã khác nhau tuỳ mẫu báo cáo:
  · doanh thu — 21001 là doanh thu THUẦN (đúng thứ kho đang dùng), 21000 là doanh thu GỘP
    chưa trừ các khoản giảm trừ. Lấy nhầm 21000 thì HPG quý 4/25 thành 47.302 thay vì
    46.177 tỷ, DGW lệch đều 2-4% ở MỌI quý — sai âm thầm, nhìn bảng không ai biết.
  · LNST cổ đông công ty mẹ — doanh nghiệp thường (modelType 2) nằm ở 23003, ngân hàng
    (102) lại nằm ở 23000. Lấy nhầm thì BID quý 3/25 thành 6.087 thay vì 5.953 tỷ.
  · giá vốn — 22100 ở doanh nghiệp thường, 622100 ở công ty chứng khoán, ngân hàng không có.
Cách chọn: chấm điểm từng ứng viên trên 8 quý mà kho ĐÃ CÓ, mã nào khớp nhiều nhất thì dùng.

  python3 tools/va_quy.py --thu      # chạy thử: chỉ đo tỉ lệ khớp, KHÔNG ghi gì
  python3 tools/va_quy.py            # vá thật
  python3 tools/va_quy.py --ma FPT,VCB,SSI      # chỉ mấy mã này
"""
import json, os, re, sys, time, urllib.request, concurrent.futures, threading

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIN = os.path.join(BASE, "data", "fin")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120"}
SRC = "https://api-finfo.vndirect.com.vn/v4/financial_statements"
THU = "--thu" in sys.argv
CHI = None
for a in sys.argv:
    if a.startswith("--ma"):
        CHI = {x.strip().upper() for x in a.split("=", 1)[-1].replace("--ma", "").split(",") if x.strip()}
UNG_VIEN = {"rev": [21001, 21000], "cogs": [22100, 622100],
            "pretax": [23800], "np": [23003, 23000]}
MOI_MA = sorted({c for v in UNG_VIEN.values() for c in v})
KHOP_TOI_THIEU = 4        # phải khớp ít nhất bấy nhiêu quý chồng nhau mới dám tin
LECH_CHO_PHEP = 0.01      # 1%


def get(url, timeout=30):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return json.loads(r.read().decode())


def jdump(obj, path):
    tmp = path + ".tmp"
    json.dump(obj, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


def nhan(fiscal_date):                      # '2024-09-30' -> 'Q3/24'
    y, m = fiscal_date[2:4], int(fiscal_date[5:7])
    return "Q%d/%s" % ((m + 2) // 3, y)


def thu_tu(lb):                             # để xếp Q1/20 < Q2/20 < ... theo thời gian
    m = re.match(r"Q(\d)/(\d{2})$", str(lb))
    if m: return 2000 + int(m.group(2)) + int(m.group(1)) / 10
    m = re.match(r"(\d{4})$", str(lb))
    return int(m.group(1)) if m else -1


def tai_nguon(sym):
    """-> {'Q3/24': {21001: .., 23000: .., ...}, ...} tính bằng TỶ đồng, theo MÃ DÒNG thô."""
    u = (f"{SRC}?q=code:{sym}~reportType:QUARTER~itemCode:"
         + ",".join(str(v) for v in MOI_MA) + "&sort=fiscalDate:desc&size=2000")
    ra = {}
    for r in get(u).get("data") or []:
        if r.get("numericValue") is None: continue
        ra.setdefault(nhan(r["fiscalDate"]), {})[int(r["itemCode"])] = r["numericValue"] / 1e9
    return ra


def chon_ma(cu, tho):
    """Chọn mã dòng cho từng trường bằng cách chấm điểm trên các quý kho ĐÃ CÓ.

    -> ({'rev': 21001, ...}, số ô khớp, số ô lệch). Trường nào không ứng viên nào khớp
    thì bỏ hẳn khỏi bản đồ — thà để trống còn hơn ghi số của một khái niệm khác.
    """
    chon, dung, sai = {}, 0, 0
    for ten, ds in UNG_VIEN.items():
        diem = []
        for ma in ds:
            d = x = 0
            for lb, r in cu.items():
                a, b = r.get(ten), (tho.get(lb) or {}).get(ma)
                if a is None or b is None or abs(a) < 1: continue
                if abs(a - b) <= abs(a) * LECH_CHO_PHEP: d += 1
                else: x += 1
            diem.append((d, -x, ma))
        diem.sort(reverse=True)
        d, nx, ma = diem[0]
        if d == 0: continue                 # không ứng viên nào khớp -> để trống trường này
        chon[ten] = ma; dung += d; sai += -nx
    return chon, dung, sai


lock = threading.Lock()
kq = {"ok": 0, "lech": 0, "thieu": 0, "loi": 0, "them": 0}
bao = []


def mot(sym):
    path = os.path.join(FIN, f"{sym}.json")
    try:
        o = json.load(open(path, encoding="utf-8"))
    except Exception:
        with lock: kq["loi"] += 1
        return
    cu = {r.get("label"): r for r in (o.get("Q") or []) if r.get("label")}
    if not cu:
        with lock: kq["thieu"] += 1
        return
    try:
        tho = tai_nguon(sym)
    except Exception:
        with lock: kq["loi"] += 1
        return
    if not tho:
        with lock: kq["thieu"] += 1
        return

    chon, dung, sai = chon_ma(cu, tho)
    if not chon or dung < KHOP_TOI_THIEU or sai > dung * 0.25:
        with lock:
            kq["lech"] += 1
            bao.append((sym, dung, sai))
        return

    # chỉ THÊM quý CŨ HƠN, không đụng vào quý 24hMoney đã có (nguồn chính vẫn thắng)
    them = 0
    for lb, n in tho.items():
        if lb in cu: continue
        lay = lambda t: n.get(chon[t]) if t in chon else None
        rev, np_ = lay("rev"), lay("np")
        r = {"label": lb, "rev": rev, "cogs": lay("cogs"), "gross": None,
             "pretax": lay("pretax"), "np": np_,
             "nm": (np_ / rev * 100) if (rev and np_ is not None and abs(rev) > 1) else None,
             "src": "vnd"}
        if r["rev"] is None and r["np"] is None and r["pretax"] is None: continue
        cu[lb] = r; them += 1
    if not them:
        with lock: kq["ok"] += 1
        return
    o["Q"] = sorted(cu.values(), key=lambda r: thu_tu(r.get("label")))
    if not THU: jdump(o, path)
    with lock:
        kq["ok"] += 1; kq["them"] += them
        if (kq["ok"] + kq["lech"] + kq["thieu"] + kq["loi"]) % 100 == 0:
            print(f"  {sum(kq[k] for k in ('ok','lech','thieu','loi'))}/{len(syms)}…", flush=True)


syms = sorted(f[:-5] for f in os.listdir(FIN) if f.endswith(".json"))
if CHI: syms = [s for s in syms if s in CHI]
print(f"{len(syms)} mã · {'CHẠY THỬ (không ghi gì)' if THU else 'VÁ THẬT'}", flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    list(pool.map(mot, syms))

print(f"\nxong: {kq['ok']} mã nhận nguồn mới (+{kq['them']} quý) · {kq['lech']} mã LỆCH nên bỏ qua"
      f" · {kq['thieu']} mã nguồn không có · {kq['loi']} mã lỗi", flush=True)
if bao:
    bao.sort(key=lambda x: -x[2])
    print("Lệch nhiều nhất (mã · số ô khớp · số ô lệch):")
    for s, d, x in bao[:20]:
        print(f"  {s:6s} khớp {d:3d} · lệch {x:3d}")
