#!/usr/bin/env python3
"""
GIẢI MÃ DÒNG BÁO CÁO TÀI CHÍNH — dùng DNSE làm THƯỚC ĐO, không làm nguồn.

VẤN ĐỀ NÓ GIẢI
--------------
`api-finfo.vndirect.com.vn/v4/financial_statements` trả **hàng trăm mã dòng** mỗi kỳ
(HPG 209, SSI 406, VCB 178) nhưng **KHÔNG kèm tên** — `itemName` rỗng. Nên không có cách
nào biết `700001` là khoản mục gì nếu chỉ nhìn nguồn đó.

`kho_sau.py` hiện chỉ xin 20 dòng cân đối + 6 dòng lưu chuyển, và cả 20 dòng ấy là mẫu
THƯỜNG — với công ty chứng khoán thì bảng hiện "Hàng tồn kho = None" trong khi 40.473 tỷ
đang cho khách vay không nằm ở dòng nào.

DNSE (`api-bo.dnse.com.vn/senses-api`) trả **chuỗi CÓ TÊN** theo 4 mẫu báo cáo
(REAL_ESTATE_AND_MANUFACTURING · STOCK · BANK · INSURANCE), nhưng chỉ sâu 5 hoặc 10 kỳ.
Ghép hai bên lại: dùng tên+số của DNSE để TRUY RA mã dòng của VNDirect, rồi từ đó cào
79 quý từ VNDirect. DNSE thành thước đo một lần, không thành phụ thuộc thường trực.

VÌ SAO PHẢI KIỂM CHÉO — ĐỪNG BỎ BƯỚC NÀY
----------------------------------------
Khớp một biểu thức 3 số hạng trên 10 điểm dữ liệu, chọn từ 400 mã, là **rất dễ trùng hợp
ngẫu nhiên**. Đo thật trên 5 công ty chứng khoán: 14 công thức rút từ riêng SSI thì chỉ
10 đứng vững, 4 cái sập khi đem sang mã khác — trong đó "DT tự doanh và nguồn vốn" khớp
10/10 ở SSI rồi 0/10 ở cả bốn mã còn lại. Nếu tin ngay lượt giải đầu thì kho sẽ có 4 chuỗi
số **sai mà trông rất đúng**.
Nên: GIẢI trên mã mẫu, rồi BẮT BUỘC kiểm trên các mã khác cùng mẫu báo cáo. Chỉ giữ công
thức khớp trên MỌI mã có dữ liệu.

DÙNG
----
  python3 tools/giai_ma_dong.py STOCK SSI VCI HCM VND MBS
  python3 tools/giai_ma_dong.py BANK  VCB BID CTG MBB TCB
  python3 tools/giai_ma_dong.py --json ...     # xuất bảng mã cho kho_sau.py

Mã đầu tiên là mã GIẢI, các mã sau là mã KIỂM.
"""
import json, sys, time, collections, itertools, re, urllib.request

UA = {"User-Agent": "CPVN.IO/1.0 (+https://cpvn.io)"}
DNSE = "https://api-bo.dnse.com.vn/senses-api"
VND = "https://api-finfo.vndirect.com.vn/v4/financial_statements"
# 10 quý gần nhất — đúng trần DNSE cho (cycleNumber chỉ nhận 5 hoặc 10, 20 trả rỗng)
KY = ["2024-03-31", "2024-06-30", "2024-09-30", "2024-12-31", "2025-03-31",
      "2025-06-30", "2025-09-30", "2025-12-31", "2026-03-31", "2026-06-30"]
NHAN = {k: f"Q{(int(k[5:7]) + 2) // 3}/{k[:4]}" for k in KY}
EPS = 2e-3          # sai số tương đối cho phép
# NGƯỠNG CHẤP NHẬN khi kiểm chéo. KHÔNG đòi 100%: doanh nghiệp CÔNG BỐ LẠI số của một quý
# là chuyện thường, và khi đó DNSE với VNDirect cập nhật lệch nhau vài ngày -> đúng một kỳ
# lệch. Đo thật trên mẫu bảo hiểm: đòi 100% thì đạt 6/14, trong đó bốn cái bị loại chỉ vì
# 9/10 ở BMI. Nhưng cũng đừng nới quá tay — công thức TRÙNG HỢP NGẪU NHIÊN cho 0/10 chứ
# không cho 8/10, nên 0,8 tách được hai loại rất sạch.
NGUONG = 0.8
SAN = 1e6           # đáy tuyệt đối (1 triệu đồng) — số bé thì sai số tương đối vô nghĩa


def get(u, thu=3):
    for i in range(thu):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=45) as r:
                return json.loads(r.read())
        except Exception:
            if i == thu - 1: raise
            time.sleep(1.5 * (i + 1))


def nap_dnse(sym):
    """-> (groupType, {(nhóm, nhãn): [10 giá trị]})"""
    ov = get(f"{DNSE}/financial-report/overall?symbol={sym}")
    ra = {}
    for c in [x["type"] for x in ov.get("indexes", [])]:
        d = get(f"{DNSE}/financial-report/details?symbol={sym}&code={c}&cycleType=quy&cycleNumber=10")
        x = d.get("x") or []
        if x != [NHAN[k] for k in KY]:      # nguồn đổi trục kỳ -> đừng ghép mù
            continue
        for s in d.get("data", []):
            ra[(c, s["label"])] = list(s["y"])
        time.sleep(0.08)
    return ov.get("groupType"), ra


def nap_vnd(sym):
    """-> {mã dòng: [10 giá trị]} — CHỈ giữ mã có đủ cả 10 kỳ.

    Bỏ mã thiếu kỳ chứ đừng điền 0: điền 0 là tạo ra một chuỗi không có thật, mà bộ dò
    dưới đây lại đi tìm chuỗi khớp — nó sẽ vớ đúng mấy chuỗi bịa đó."""
    tmp = collections.defaultdict(dict)
    for k in KY:
        d = get(f"{VND}?q=code:{sym}~reportType:QUARTER~fiscalDate:{k}&sort=itemCode&size=2000")
        for r in d.get("data") or []:
            if r.get("numericValue") is not None:
                tmp[int(float(r["itemCode"]))][NHAN[k]] = r["numericValue"]
        time.sleep(0.05)
    lab = [NHAN[k] for k in KY]
    return {m: [v[x] for x in lab] for m, v in tmp.items() if len(v) == len(lab)}


def gan(a, b):
    return all(abs(x - y) <= EPS * max(abs(y), SAN) for x, y in zip(a, b))


def bam(v):
    return tuple(round(x / SAN) for x in v)


def giai(y, V):
    """Tìm biểu thức ±mã (tối đa 3 số hạng) khớp chuỗi `y`. None nếu không ra."""
    for m, v in V.items():
        if gan(v, y): return str(m)
        if gan([-x for x in v], y): return f"-{m}"
    H = {}
    for m, v in V.items(): H.setdefault(bam(v), m)
    for a, va in V.items():
        r = [y[i] - va[i] for i in range(len(y))]
        m = H.get(bam(r))
        if m is not None and gan(V[m], r): return f"{a} + {m}"
        m = H.get(bam([-x for x in r]))
        if m is not None and gan([-x for x in V[m]], r): return f"{a} - {m}"
    for a, va in V.items():
        r1 = [y[i] - va[i] for i in range(len(y))]
        for b, vb in V.items():
            if b == a: continue
            r2 = [r1[i] - vb[i] for i in range(len(r1))]
            m = H.get(bam(r2))
            if m is not None and gan(V[m], r2): return f"{a} - {b} + {m}"
    return None


def tinh(bt, V, i):
    s = 0.0
    for dau, m in re.findall(r"([+-]?)\s*(\d+)", " + " + bt):
        v = V.get(int(m))
        if v is None: return None
        s += (-1 if dau == "-" else 1) * v[i]
    return s


def main():
    av = [a for a in sys.argv[1:] if not a.startswith("--")]
    ra_json = "--json" in sys.argv
    if len(av) < 2:
        print(__doc__); sys.exit(1)
    mau, giai_sym, kiem_syms = av[0], av[1], av[2:]

    gt, dn = nap_dnse(giai_sym)
    V = nap_vnd(giai_sym)
    if not ra_json:
        print(f"\n  GIẢI trên {giai_sym} · mẫu {gt} · {len(V)} mã dòng đủ 10 quý")
        print(f"  KIỂM trên {', '.join(kiem_syms) or '(không có — KHÔNG ĐỦ TIN)'}\n")

    ct = {}
    for k, y in dn.items():
        if all((x or 0) == 0 for x in y): continue
        bt = giai(y, V)
        if bt: ct[k] = bt

    # ---- kiểm chéo: chỉ giữ công thức khớp trên MỌI mã kiểm có dữ liệu
    kq = {k: {giai_sym: "10/10"} for k in ct}
    for s in kiem_syms:
        try:
            _, dn2 = nap_dnse(s); V2 = nap_vnd(s)
        except Exception as e:
            print(f"  (bỏ qua {s}: {e})"); continue
        for k, bt in ct.items():
            y = dn2.get(k)
            if not y or all((x or 0) == 0 for x in y): kq[k][s] = "—"; continue
            n = t = 0
            for i in range(len(y)):
                if not y[i]: continue
                t += 1
                v = tinh(bt, V2, i)
                if v is not None and abs(v - y[i]) <= EPS * max(abs(y[i]), SAN): n += 1
            kq[k][s] = f"{n}/{t}"

    dat = {}
    for k, bt in ct.items():
        def dat_mot(v):
            if v == "—": return True
            a, b = v.split("/")
            return int(b) > 0 and int(a) / int(b) >= NGUONG
        oke = all(dat_mot(v) for s, v in kq[k].items() if s != giai_sym)
        codat = any(v != "—" for s, v in kq[k].items() if s != giai_sym)
        if oke and codat: dat[k] = bt

    if ra_json:
        json.dump({"mau": gt, "ct": {f"{a}|{b}": v for (a, b), v in dat.items()}},
                  sys.stdout, ensure_ascii=False, indent=1)
        return

    cot = [giai_sym] + kiem_syms
    print(f"  {'nhóm / nhãn':<50}{'biểu thức':<26}" + "".join(f"{s:>8}" for s in cot))
    for k in sorted(ct, key=lambda x: (x not in dat, x)):
        (g, l) = k
        o = "".join(f"{kq[k].get(s,'?'):>8}" for s in cot)
        print(f"  {'✓' if k in dat else '✗'} {g[:20]+' / '+l:<48}{ct[k]:<26}{o}")
    print(f"\n  ĐẠT {len(dat)}/{len(ct)} công thức qua được kiểm chéo")
    if len(dat) < len(ct):
        print("  (✗ = khớp ở mã giải nhưng SẬP ở mã khác -> trùng hợp ngẫu nhiên, KHÔNG dùng)")


if __name__ == "__main__":
    main()
