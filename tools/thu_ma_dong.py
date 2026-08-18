#!/usr/bin/env python3
"""
CHẠY THỬ BẢNG MÃ TRÊN N MÃ, RỒI ĐỐI CHIẾU TỪNG SỐ VỚI DNSE.

Đây là cổng kiểm CUỐI cùng trước khi cho `kho_sau.py` ghi đè 1.524 file `data/finq`.
`giai_ma_dong.py` đã kiểm chéo công thức trên 3-4 mã mỗi mẫu; file này làm việc khác:
lấy bảng mã ĐÃ CHỐT (`tools/ma_dong.json`) đem cào THẬT từ VNDirect theo đúng cách
`kho_sau.py` sẽ cào — đủ lịch sử, cắt lô, gộp theo nhãn kỳ — rồi so từng ô với DNSE
trên 10 quý chồng nhau.

VÌ SAO PHẢI CÓ BƯỚC NÀY dù đã kiểm chéo: hai lượt cào khác nhau ở chỗ dễ sai nhất —
`giai_ma_dong` xin TỪNG KỲ một (`fiscalDate:...`), còn `kho_sau` xin THEO MÃ DÒNG cho mọi
kỳ (`itemCode:...&size=2000`). Nguồn cắt bớt kết quả khi lô quá lớn, và nhãn kỳ phải tự
dựng từ `fiscalDate` chứ không được nguồn trả sẵn. Cả hai chỗ đó sai thì công thức vẫn
đúng mà số ghi vào kho vẫn lệch.

  python3 tools/thu_ma_dong.py                 # 20 mã mặc định, đủ 4 mẫu
  python3 tools/thu_ma_dong.py HPG SSI VCB     # chỉ định mã
"""
import json, os, sys, time, collections, re, urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {"User-Agent": "CPVN.IO/1.0 (+https://cpvn.io)"}
DNSE = "https://api-bo.dnse.com.vn/senses-api"
VND = "https://api-finfo.vndirect.com.vn/v4/financial_statements"
CHUNK = 12                 # số mã dòng mỗi lô — kho_sau cũng cắt lô vì nguồn trần 2000 dòng
EPS = 2e-3
SAN = 1e6

MAC_DINH = ["HPG", "VNM", "FPT", "MWG", "GVR", "VIC", "HSG",     # sản xuất / BĐS
            "SSI", "VCI", "HCM", "VND", "MBS",                    # chứng khoán
            "VCB", "BID", "CTG", "MBB", "TCB",                    # ngân hàng
            "BVH", "BMI", "PTI"]                                  # bảo hiểm


def get(u, thu=3):
    for i in range(thu):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=45) as r:
                return json.loads(r.read())
        except Exception:
            if i == thu - 1: raise
            time.sleep(1.5 * (i + 1))


def nhanQ(fd):
    return f"Q{(int(fd[5:7]) + 2) // 3}/{fd[:4]}"


def ma_trong(bt):
    return sorted({int(m) for _, m in re.findall(r"([+-]?)\s*(\d+)", " + " + bt)})


def cao_vnd(sym, codes):
    """Cào ĐÚNG CÁCH kho_sau sẽ cào: theo MÃ DÒNG, mọi kỳ, cắt lô.
    -> {nhãn kỳ: {mã: giá trị}}"""
    ra = collections.defaultdict(dict)
    for i in range(0, len(codes), CHUNK):
        lo = codes[i:i + CHUNK]
        u = (f"{VND}?q=code:{sym}~reportType:QUARTER~itemCode:"
             + ",".join(str(c) for c in lo) + "&sort=fiscalDate:desc&size=2000")
        d = get(u)
        data = d.get("data") or []
        # NGUỒN CẮT BỚT THÌ PHẢI NÉM RA, đừng ghi một phần: thiếu vài kỳ giữa chuỗi thì
        # kho trông vẫn đầy đủ, chỉ là có lỗ — không có gì báo.
        if d.get("totalElements", 0) > len(data):
            raise RuntimeError(f"{sym}: nguồn trả {len(data)}/{d['totalElements']} dòng, lô quá lớn")
        for r in data:
            if r.get("numericValue") is None: continue
            fd = r.get("fiscalDate") or ""
            if fd[5:] not in ("03-31", "06-30", "09-30", "12-31"): continue
            ra[nhanQ(fd)][int(float(r["itemCode"]))] = r["numericValue"]
        time.sleep(0.06)
    return ra


def tinh(bt, o):
    s = 0.0
    for dau, m in re.findall(r"([+-]?)\s*(\d+)", " + " + bt):
        v = o.get(int(m))
        if v is None: return None
        s += (-1 if dau == "-" else 1) * v
    return s


def main():
    syms = [a.upper() for a in sys.argv[1:]] or MAC_DINH
    BANG = json.load(open(os.path.join(BASE, "tools", "ma_dong.json"), encoding="utf-8"))

    print(f"\n  Chạy thử {len(syms)} mã · cào VNDirect theo bảng mã, đối chiếu DNSE 10 quý\n")
    print(f"  {'mã':<6}{'mẫu':<10}{'dòng':>6}{'quý cào được':>14}{'ô so':>8}{'khớp':>8}{'lệch':>7}  ghi chú")
    tong_o = tong_kh = 0
    xau = []
    for sym in syms:
        try:
            ov = get(f"{DNSE}/financial-report/overall?symbol={sym}")
            mau = ov.get("groupType")
            bang = BANG.get(mau)
            if not bang:
                print(f"  {sym:<6}{str(mau):<10}{'—':>6}  không có bảng mã cho mẫu này"); continue
            ct = bang["ct"]
            codes = sorted({c for bt in ct.values() for c in ma_trong(bt)})
            V = cao_vnd(sym, codes)
            sauNhat = min(V) if V else "—"
            # số của DNSE
            dn = {}
            for grp in {k.split("|")[0] for k in ct}:
                d = get(f"{DNSE}/financial-report/details?symbol={sym}&code={grp}&cycleType=quy&cycleNumber=10")
                x = d.get("x") or []
                for s in d.get("data", []):
                    dn[f"{grp}|{s['label']}"] = dict(zip(x, s["y"]))
                time.sleep(0.08)
            o = kh = 0
            for k, bt in ct.items():
                ser = dn.get(k) or {}
                for ky, v in ser.items():
                    if not v or ky not in V: continue
                    t = tinh(bt, V[ky])
                    if t is None: continue
                    o += 1
                    if abs(t - v) <= EPS * max(abs(v), SAN): kh += 1
                    else: xau.append((sym, k, ky, v, t))
            tong_o += o; tong_kh += kh
            ghi = "" if kh == o else f"  ← {o-kh} ô lệch"
            print(f"  {sym:<6}{mau[:9]:<10}{len(ct):>6}{str(len(V))+' ('+str(sauNhat)+')':>14}{o:>8}{kh:>8}{o-kh:>7}{ghi}")
        except Exception as e:
            print(f"  {sym:<6}{'LỖI':<10} {e}")
    print(f"\n  TỔNG: {tong_kh:,}/{tong_o:,} ô khớp "
          f"({100*tong_kh/max(tong_o,1):.2f}%) · {tong_o-tong_kh} ô lệch")
    for s, k, ky, v, t in xau[:20]:
        print(f"    {s:<5} {k:<48} {ky}  DNSE {v/1e9:>12,.1f}  tính {t/1e9:>12,.1f}")
    if len(xau) > 20: print(f"    … còn {len(xau)-20} ô nữa")
    return 0 if not xau else 2


if __name__ == "__main__":
    sys.exit(main())
