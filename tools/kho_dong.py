#!/usr/bin/env python3
"""
KHO DÒNG BÁO CÁO MỞ RỘNG -> data/finx/{MÃ}.json

Cào những khoản mục mà `data/fin` và `data/finq` KHÔNG có, theo bảng mã đã giải và kiểm
chéo ở `tools/ma_dong.json`. Nguồn: VNDirect financial_statements — cùng nguồn `kho_sau.py`
đang dùng, không thêm bên thứ ba nào.

VÌ SAO LÀ KHO RIÊNG, KHÔNG NHÉT VÀO data/finq
---------------------------------------------
`kho_sau.py` dựng `rows` TỪ danh sách dòng có sẵn trong `data/fin` (24hMoney) rồi chấm điểm
mã dòng dựa trên các kỳ kho ĐÃ CÓ. Dòng mới thì không có gì để chấm, nên phải đi đường khác.
Nhét chung vào `data/finq` là trộn hai cơ chế khác hẳn nhau vào một file mà trang cổ phiếu
và `build_nganh` đang đọc — sai một chỗ là hỏng thứ đang chạy. Tách kho riêng thì hỏng cũng
chỉ hỏng phần mới, xoá một thư mục là xong. Cùng lối `data/nganh` đã làm.

DÒ MẪU BÁO CÁO BẰNG DỮ LIỆU, KHÔNG BẰNG `sector` — VÀ CHỈ ÁP BẢNG CỦA MẪU ĐÓ
---------------------------------------------------------------------------
Đoán mẫu theo `sector` là sai được: `build_nganh` đã dính — F88 mang sector ngân hàng mà
nộp báo cáo mẫu THƯỜNG. Nên dò bằng MÃ ĐẶC TRƯNG: mã nào chỉ tồn tại ở một mẫu thì sự có
mặt của số ở đó chính là bằng chứng.

  ngân hàng   421900 thu nhập lãi thuần · 412000 cho vay khách hàng
  chứng khoán 700001 các khoản cho vay  · 700002 AFS
  còn lại     mẫu thường (sản xuất/BĐS/bảo hiểm dùng chung bộ mã cơ sở)

**CHỈ ÁP BẢNG CỦA MẪU ĐÃ DÒ RA.** Lượt chạy đầu tao xin hợp cả bốn bảng rồi giữ dòng nào có
số — nghe thì gọn, nhưng nó đưa dòng của mẫu SẢN XUẤT vào file của VCB (Tiền/TSCĐ/BĐS đầu
tư). Mấy dòng đó **chưa từng được kiểm chéo trên ngân hàng**: `giai_ma_dong` kiểm theo TỪNG
mẫu, công thức của mẫu này đúng ở mã của mẫu kia là chuyện không ai chứng minh. Có số không
có nghĩa là số đúng — đó đúng loại sai im lặng mà cả đợt này đang tránh.

  python3 tools/kho_dong.py                  # toàn bộ mã có data/fin
  python3 tools/kho_dong.py --ma=HPG,VCB     # vài mã
  python3 tools/kho_dong.py --moi            # chỉ mã chưa có finx hoặc fin mới hơn
  python3 tools/kho_dong.py --thu            # chạy thử, KHÔNG ghi file
"""
import json, os, re, sys, time, unicodedata, collections, threading, concurrent.futures

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIN = os.path.join(BASE, "data", "fin")
OUT = os.path.join(BASE, "data", "finx")
SRC = "https://api-finfo.vndirect.com.vn/v4/financial_statements"
BANG_P = os.path.join(BASE, "tools", "ma_dong.json")

CHUNK = 15          # nguồn cắt cứng 2000 dòng/lượt — 15 mã × ~90 kỳ vẫn an toàn
LUONG = 5           # song song; nhipmang đã có trần riêng cho host VNDirect

THU = "--thu" in sys.argv
MOI = "--moi" in sys.argv
CHI = None
for a in sys.argv:
    if a.startswith("--ma"):
        CHI = {x.strip().upper() for x in a.split("=", 1)[-1].replace("--ma", "").split(",") if x.strip()}


def get(u, timeout=45):
    return json.loads(nhipmang.get(u, timeout=timeout))


def jdump(o, p):
    tmp = p + ".tmp"
    json.dump(o, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)


def nhanQ(f):
    return "Q%d/%s" % ((int(f[5:7]) + 2) // 3, f[2:4])


def nhanY(f):
    return f[:4]


def thu_tuQ(lb):
    m = re.match(r"Q(\d)/(\d{2})$", str(lb))
    return 2000 + int(m.group(2)) + int(m.group(1)) / 10 if m else -1


def slug(s):
    s = unicodedata.normalize("NFD", s.replace("đ", "d").replace("Đ", "D"))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


# ---------------------------------------------------------------- bảng mã
# Mã ĐẶC TRƯNG của từng mẫu — có số ở đây là bằng chứng doanh nghiệp nộp theo mẫu đó.
# Thứ tự xét có ý nghĩa: ngân hàng -> chứng khoán -> bảo hiểm -> còn lại là mẫu thường.
# `22160` (các khoản chi hoạt động kinh doanh) chỉ mẫu BẢO HIỂM mới in — đo 5 công ty bảo
# hiểm đều có, 4 doanh nghiệp sản xuất đều không.
DAU_HIEU = {"BANK": (421900, 412000), "STOCK": (700001, 700002), "INSURANCE": (22160,)}
MAU_MAC_DINH = "REAL_ESTATE_AND_MANUFACTURING"


def nap_bang():
    """-> ({mẫu: [(khoá, nhãn, nhóm, biểu thức)]}, [mã dòng cần xin])"""
    B = json.load(open(BANG_P, encoding="utf-8"))
    ct = {}
    codes = set()
    for mau, v in B.items():
        ds = []
        for k, bt in v["ct"].items():
            grp, lab = k.split("|", 1)
            ds.append(("x_" + slug(lab), lab, grp, bt))
            codes |= {int(m) for _, m in re.findall(r"([+-]?)\s*(\d+)", " + " + bt)}
        ct[mau] = ds
    codes |= {c for v in DAU_HIEU.values() for c in v}
    return ct, sorted(codes)


def do_mau(tho, labs):
    """Mẫu báo cáo, suy từ CHÍNH số đã cào — CHỈ XÉT 4 KỲ GẦN NHẤT.

    BẢO HIỂM PHẢI TÁCH RIÊNG, đừng gộp vào mẫu thường. Bản trước tao ghi "bảo hiểm dùng
    chung bộ mã cơ sở với sản xuất nên không cần tách" — SAI, và đối chiếu bắt được: BVH
    khớp DNSE 73%, BMI 80%, trong khi mọi mã khác 99-100%. Bảng INSURANCE có dòng khác
    thật, ví dụ `Tài sản khác = 12000 - 12500` chứ không phải `12600` như mẫu thường.

    Hai cái bẫy đã dính, cả hai đều đẩy công ty BẢO HIỂM thành ngân hàng:
    ① Kiểm `m in o` (có khoá) thay vì có SỐ: BVH/BMI/PTI đều có `412000` và `413300` nằm
       trong bảng với giá trị **0** ở kỳ gần nhất. Khoản mục bằng 0 là bằng chứng doanh
       nghiệp KHÔNG có hoạt động đó — tức bằng chứng NGƯỢC lại.
    ② Xét TOÀN BỘ lịch sử: sửa ① xong BVH/BMI vẫn thành ngân hàng, vì một quý CŨ nào đó có
       số khác 0. Mẫu báo cáo là tính chất của kỳ ĐANG NỘP, không phải của 20 năm trước —
       doanh nghiệp đổi mẫu theo quy định từng thời kỳ. Xét 4 kỳ cuối là đủ và ổn định.
    Đo lại sau khi vá: PTI/BVH/BMI về mẫu thường, VCB/CTG/MBB giữ nguyên ngân hàng."""
    gan = labs[-4:] if labs else []
    co = lambda m: any((tho.get(l) or {}).get(m) for l in gan)
    for mau, dh in DAU_HIEU.items():
        if any(co(m) for m in dh): return mau
    return MAU_MAC_DINH


def tai(sym, loai, codes):
    """-> {nhãn kỳ: {mã: giá trị ĐỒNG}}. Ném lỗi nếu nguồn cắt bớt — thà không có còn hơn
    có một phần mà trông như đủ."""
    ra = collections.defaultdict(dict)
    nhan = nhanQ if loai == "QUARTER" else nhanY
    for i in range(0, len(codes), CHUNK):
        lo = codes[i:i + CHUNK]
        u = (f"{SRC}?q=code:{sym}~reportType:{loai}~itemCode:"
             + ",".join(str(c) for c in lo) + "&sort=fiscalDate:desc&size=2000")
        d = get(u)
        data = d.get("data") or []
        if d.get("totalElements", 0) > len(data):
            raise RuntimeError(f"nguồn cắt {len(data)}/{d['totalElements']} dòng")
        for r in data:
            if r.get("numericValue") is None: continue
            fd = r.get("fiscalDate") or ""
            if loai == "QUARTER" and fd[5:] not in ("03-31", "06-30", "09-30", "12-31"): continue
            ra[nhan(fd)][int(float(r["itemCode"]))] = r["numericValue"] / 1e9   # -> TỶ
    return ra


def tinh(bt, o):
    s = 0.0; co = False
    for dau, m in re.findall(r"([+-]?)\s*(\d+)", " + " + bt):
        v = o.get(int(m))
        if v is None: continue
        co = True
        s += (-1 if dau == "-" else 1) * v
    return s if co else None


lock = threading.Lock()
kq = collections.Counter()
bao = []


def mot(sym, CT, CODES):
    try:
        finp = os.path.join(FIN, f"{sym}.json")
        if not os.path.exists(finp):
            with lock: kq["khong_fin"] += 1
            return
        outp = os.path.join(OUT, f"{sym}.json")
        if MOI and os.path.exists(outp) and os.path.getmtime(outp) >= os.path.getmtime(finp):
            with lock: kq["bo_qua"] += 1
            return
        o = {"sym": sym, "updated": time.strftime("%Y-%m-%d"), "src": "vndirect"}
        tong_dong = 0
        for loai, khoi in (("QUARTER", "Q"), ("ANNUAL", "Y")):
            tho = tai(sym, loai, CODES)
            if not tho: continue
            labs = sorted(tho.keys(), key=(thu_tuQ if loai == "QUARTER"
                                           else (lambda x: int(x) if str(x).isdigit() else -1)))
            # ĐẶT `mau` Ở LƯỢT NÀO CÓ SỐ TRƯỚC, đừng khoá cứng vào lượt QUARTER: 146 mã
            # (đa số UPCOM nhỏ) CHỈ có báo cáo NĂM, nguồn không trả quý nào. Khoá vào
            # QUARTER thì chúng ra mau='?' rồi rơi về bảng mặc định mà không ai biết vì sao.
            if not o.get("mau"): o["mau"] = do_mau(tho, labs)
            rows = []
            for k, lab, grp, bt in CT[o.get("mau") or MAU_MAC_DINH]:
                v = [tinh(bt, tho.get(l) or {}) for l in labs]
                # DÒNG TOÀN 0 KHÔNG PHẢI DÒNG CÓ SỐ — cổ phiếu quỹ của mã chưa mua lại bao
                # giờ cũng là một cột 0 dài; giữ lại chỉ tổ làm bảng dài ra mà không nói gì.
                if not any(x for x in v if x): continue
                rows.append({"k": k, "n": lab, "g": grp, "bt": bt,
                             "v": [round(x, 2) if isinstance(x, (int, float)) else None for x in v]})
            if rows:
                o[khoi] = {"labels": labs, "rows": rows}
                tong_dong = max(tong_dong, len(rows))
        if not tong_dong:
            with lock: kq["rong"] += 1
            return
        if not THU:
            jdump(o, outp)
        with lock:
            kq["ok"] += 1
            kq["dong"] += tong_dong
            kq["ky"] += len((o.get("Q") or {}).get("labels") or [])
    except Exception as e:
        with lock:
            kq["loi"] += 1
            bao.append(f"{sym}: {e}")


def main():
    CT, CODES = nap_bang()
    os.makedirs(OUT, exist_ok=True)
    syms = sorted(f[:-5] for f in os.listdir(FIN) if f.endswith(".json"))
    if CHI: syms = [s for s in syms if s in CHI]
    print(f"  {len(CT)} mẫu · {sum(len(v) for v in CT.values())} khoá dòng · {len(CODES)} mã dòng phải xin · {len(syms)} mã"
          + ("  [CHẠY THỬ, không ghi]" if THU else ""))
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=LUONG) as ex:
        list(ex.map(lambda s: mot(s, CT, CODES), syms))
    dt = time.time() - t0
    print(f"\n  xong {dt/60:.1f} phút · ok {kq['ok']} · rỗng {kq['rong']} · "
          f"bỏ qua {kq['bo_qua']} · không có fin {kq['khong_fin']} · lỗi {kq['loi']}")
    if kq["ok"]:
        print(f"  trung bình {kq['dong']/kq['ok']:.1f} dòng/mã · {kq['ky']/kq['ok']:.0f} quý/mã")
    for b in bao[:15]: print("   ", b)
    if len(bao) > 15: print(f"    … còn {len(bao)-15} lỗi")


if __name__ == "__main__":
    main()
