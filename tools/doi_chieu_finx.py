#!/usr/bin/env python3
"""
ĐỐI CHIẾU data/finx VỚI DNSE — kiểm CHÍNH FILE ĐÃ GHI, không kiểm lại công thức.

Khác `thu_ma_dong.py` ở chỗ quan trọng: file kia cào tươi rồi so, còn file này đọc
**đúng cái đang nằm trong kho**. Giữa hai bước đó còn cả `kho_dong.py` — dò mẫu báo cáo,
chọn bảng, loại dòng toàn 0, làm tròn, ghi file. Sai ở bất kỳ khâu nào trong đó thì công
thức vẫn đúng mà kho vẫn hỏng.

Phép này đã bắt được một lỗi thật: bảo hiểm bị cho dùng chung bảng mẫu sản xuất, BVH khớp
73% và BMI 80% trong khi mọi mã khác 99–100%. Không có bước này thì kho lên thẳng với hai
mẫu sai mà không ai biết.

  python3 tools/doi_chieu_finx.py              # 16 mã mặc định, đủ 4 mẫu
  python3 tools/doi_chieu_finx.py HPG VCB      # chỉ định mã
  python3 tools/doi_chieu_finx.py --n 40       # lấy ngẫu nhiên 40 mã (hạt cố định)
"""
import json, os, sys, time, random, urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FINX = os.path.join(BASE, "data", "finx")
UA = {"User-Agent": "CPVN.IO/1.0 (+https://cpvn.io)"}
DNSE = "https://api-bo.dnse.com.vn/senses-api"
EPS = 2e-3
# DUNG SAI = MAX(tương đối, TUYỆT ĐỐI), không phải EPS*max(|v|, SÀN).
# Kho ghi bằng TỶ làm tròn 2 chữ số -> độ hạt 0,01 tỷ = 10 triệu, tức mọi ô có thể lệch tới
# 5 triệu CHỈ VÌ LÀM TRÒN LÚC GHI. Viết `EPS*max(|v|,SAN)` thì với ô 0,7 tỷ dung sai vẫn ra
# 1,4 triệu < 5 triệu -> phép so báo lệch ở 10/17 ô của MBS trong khi dữ liệu không sai gì.
# Đây là lần thứ hai tao sửa hụt chỗ này; sai lầm là để sàn NẰM TRONG max của giá trị chứ
# không phải max của DUNG SAI.
SAN = 5e6

MAC_DINH = ["HPG", "VNM", "FPT", "VIC", "MWG", "GVR",        # sản xuất / BĐS
            "SSI", "VCI", "MBS", "VND",                       # chứng khoán
            "VCB", "CTG", "TCB", "MBB",                       # ngân hàng
            "BVH", "BMI"]                                     # bảo hiểm


def get(u, thu=3):
    for i in range(thu):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=45) as r:
                return json.loads(r.read())
        except Exception:
            if i == thu - 1: raise
            time.sleep(1.5 * (i + 1))


def main():
    av = [a for a in sys.argv[1:] if not a.startswith("--")]
    syms = [a.upper() for a in av] or MAC_DINH
    if "--n" in sys.argv:
        n = int(sys.argv[sys.argv.index("--n") + 1])
        random.seed(7)
        tat = sorted(f[:-5] for f in os.listdir(FINX) if f.endswith(".json"))
        syms = sorted(random.sample(tat, min(n, len(tat))))

    print(f"\n  Đối chiếu {len(syms)} file data/finx với DNSE (10 quý gần nhất)\n")
    print(f"  {'mã':<6}{'mẫu':<14}{'dòng':>6}{'ô so':>8}{'khớp':>8}{'%':>8}")
    T = K = 0
    xau = []
    for sym in syms:
        p = os.path.join(FINX, f"{sym}.json")
        if not os.path.exists(p):
            print(f"  {sym:<6}(chưa có file)"); continue
        d = json.load(open(p, encoding="utf-8"))
        Q = d.get("Q") or {}
        # khoá theo (nhóm, nhãn): nhãn TRÙNG NHAU giữa các nhóm là chuyện thường
        # ("LNST công ty mẹ" nằm ở hai nhóm của mẫu CTCK) — khoá theo nhãn là đè mất một cái
        kho = {(r["g"], r["n"]): dict(zip(Q.get("labels", []), r["v"])) for r in Q.get("rows", [])}
        try:
            ov = get(f"{DNSE}/financial-report/overall?symbol={sym}")
        except Exception as e:
            print(f"  {sym:<6}lỗi DNSE: {e}"); continue
        o = k = 0
        for grp in [x["type"] for x in ov.get("indexes", [])]:
            dd = get(f"{DNSE}/financial-report/details?symbol={sym}&code={grp}&cycleType=quy&cycleNumber=10")
            # DNSE ghi 'Q1/2024', kho ghi 'Q1/24'
            x = [l.replace("/20", "/") for l in dd.get("x", [])]
            for s0 in dd.get("data", []):
                ser = kho.get((grp, s0["label"]))
                if not ser: continue
                for lb, v in zip(x, s0["y"]):
                    if not v or lb not in ser or ser[lb] is None: continue
                    o += 1
                    # kho ghi TỶ, DNSE trả ĐỒNG
                    if abs(ser[lb] * 1e9 - v) <= max(EPS * abs(v), SAN): k += 1
                    else: xau.append((sym, grp, s0["label"], lb, v / 1e9, ser[lb]))
            time.sleep(0.05)
        T += o; K += k
        pc = 100 * k / o if o else 0
        print(f"  {sym:<6}{str(d.get('mau'))[:13]:<14}{len(Q.get('rows', [])):>6}{o:>8}{k:>8}{pc:>7.1f}%")
    print(f"\n  TỔNG {K:,}/{T:,} = {100*K/max(T,1):.2f}%")
    for s, g, l, ky, a, b in xau[:15]:
        print(f"    {s:<5} {g[:20]:<22}{l[:26]:<28}{ky:<9} DNSE {a:>12,.1f}  kho {b:>12,.1f}")
    if len(xau) > 15: print(f"    … còn {len(xau)-15} ô")
    # 99% là ngưỡng ĐÃ ĐO: phần lệch còn lại là số công bố lại (mỗi nguồn tự nhất quán
    # nội bộ nhưng khác vintage), dồn vào vài quý chứ không rải đều.
    return 0 if T and K / T >= 0.99 else 2


if __name__ == "__main__":
    sys.exit(main())
