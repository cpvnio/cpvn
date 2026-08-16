#!/usr/bin/env python3
"""
KHO SÂU — dựng data/finq/{MÃ}.json: CÂN ĐỐI KẾ TOÁN + LƯU CHUYỂN TIỀN TỆ đủ lịch sử
(tới ~79 quý / 22 năm), thay vì 8 kỳ cuốn chiếu như data/fin.

VÌ SAO CẦN: nguồn chính (24hMoney) chỉ trả 8 KỲ GẦN NHẤT cho `bsQ`/`cfQ`/`bsY`/`cfY`.
`Y` và `Q` (kết quả kinh doanh) đã được gom dồn theo nhãn nên không mất gì, nhưng bốn
khối kia thì mỗi lượt cào lại ĐẨY KỲ CŨ NHẤT RA KHỎI KHO — số đã từng có rồi biến mất
vĩnh viễn. Hệ quả đo được: nghiên cứu chu kỳ 11/08/2026 chỉ chạy được cân đối kế toán
trên 9-15 tháng, trong khi chính nhóm chỉ tiêu đó (phải thu/doanh thu, tiền từ kinh
doanh/lợi nhuận, ROE) lại là nhóm cơ bản DỰ BÁO TỐT NHẤT tìm được.

NGUỒN: `api-finfo.vndirect.com.vn/v4/financial_statements` — cùng nguồn `tools/va_quy.py`
đã dùng để vá 53.837 quý kết quả kinh doanh. Đo trên HPG: 79 quý (2001→nay), 22 năm.

CÁCH TỰ KIỂM CHỨNG (bắt buộc, đừng bỏ): mỗi mã đã có sẵn 8 kỳ của 24hMoney làm ĐÁP ÁN.
Chấm điểm từng mã dòng ứng viên của VNDirect trên đúng 8 kỳ đó rồi mới chọn. Không có
ứng viên nào khớp thì BỎ TRỐNG dòng ấy — thà trống còn hơn ghi số của một khái niệm khác.
Cùng một khái niệm nằm ở mã dòng khác nhau tuỳ mẫu báo cáo: ngân hàng có `bsb103` (tiền
cho vay) mà doanh nghiệp thường không có, "tổng tài sản" khi thì 12700 khi thì 14400.
Bảng ứng viên dưới đây dò ra bằng cách chấm điểm trên 31 mã đủ bốn loại hình (thường /
ngân hàng / chứng khoán / bảo hiểm).

DẤU CỦA LƯU CHUYỂN TIỀN TỆ: LẤY CỦA VNDIRECT, ĐỪNG LẤY CỦA KHO.
Đo 11/08/2026 trên toàn kho: đẳng thức kế toán "CFO + CFI + CFF = lưu chuyển tiền
thuần" **SAI Ở 60% SỐ Ô** (10.134/16.761) — và 10.132/10.134 ô sai đó khớp lại ngay
nếu đổi dấu một thành phần. Gốc nằm ở chính nguồn 24hMoney chứ không phải parser:
gọi thẳng API cho SZL thì dòng `cfa34` trả về [52.75, 27.83, 18.42, ...] toàn số
dương trong khi `cfa26` vẫn có dấu âm đàng hoàng. Cùng phép kiểm đó chạy trên
VNDirect: **1.098/1.098 ô đúng, không lệch ô nào**. Vậy nên với khối lưu chuyển tiền
tệ, script khớp ứng viên theo GIÁ TRỊ TUYỆT ĐỐI rồi ghi số CÓ DẤU của VNDirect cho
mọi kỳ — kể cả 8 kỳ kho đang có. Với cân đối kế toán thì không có chuyện này (số toàn
dương) nên vẫn ưu tiên số kho.

  python3 tools/kho_sau.py --thu           # chạy thử, không ghi
  python3 tools/kho_sau.py                 # dựng thật
  python3 tools/kho_sau.py --ma HPG,VCB    # chỉ mấy mã này
  python3 tools/kho_sau.py --va-fin        # dựng, ĐỒNG THỜI sửa dấu cfQ/cfY trong data/fin
"""
import json, os, re, sys, time, urllib.request, concurrent.futures, threading, collections
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang   # trần tốc độ theo host + lùi dần khi nguồn kêu (16/08/2026)

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIN  = os.path.join(BASE, "data", "fin")
OUT  = os.path.join(BASE, "data", "finq")
UA   = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120"}
SRC  = "https://api-finfo.vndirect.com.vn/v4/financial_statements"

# mã dòng ứng viên cho từng chỉ tiêu (thứ tự = độ ưu tiên khi hoà điểm)
UNG_VIEN = {
 "bsa1":[11000], "bsa15":[11400,11410], "bsa163":[12440,12460], "bsa170":[13311],
 "bsa2":[11100,11110,700151], "bsa23":[12000], "bsa24":[12100,12180,12189],
 "bsa29":[12200,12210], "bsa43":[412400,412440], "bsa53":[12700,14400],
 "bsa54":[13000], "bsa55":[13100], "bsa56":[13110,700023,13111],
 "bsa57":[13120,13121], "bsa58":[13130], "bsa67":[13300,13330,13350],
 "bsa68":[13310], "bsa71":[13340], "bsa78":[14000,14100], "bsa8":[11300],
 "bsa96":[14400,12700], "bsb103":[412000], "bsb106":[412300], "bsb113":[413300],
 "cfa18":[32000], "cfa26":[33000], "cfa34":[34000], "cfa35":[35000],
 "cfa36":[36000,700148], "cfa38":[37000,11100,11110,700151],
 "cfb64":[431275,32000],
}
KHOP_TOI_THIEU = 3        # phải khớp ít nhất bấy nhiêu kỳ chồng nhau mới dám dùng
LECH_CHO_PHEP  = 0.005    # 0,5%
LO_TOI_DA      = 0.25     # lệch quá 1/4 số kỳ thì coi như không phải mã dòng đó
CHUNK          = 15       # nguồn cắt cứng ở 2000 dòng/lượt -> 15 mã dòng x ~90 kỳ vẫn an toàn

THU    = "--thu" in sys.argv
VA_FIN = "--va-fin" in sys.argv     # sửa luôn dấu cfQ/cfY trong data/fin (trang đang đọc)
CHI = None
for a in sys.argv:
    if a.startswith("--ma"):
        CHI = {x.strip().upper() for x in a.split("=",1)[-1].replace("--ma","").split(",") if x.strip()}

def get(url, timeout=45):
    # đi qua nhipmang (trần theo host + lùi dần) — xem tools/nhipmang.py
    return json.loads(nhipmang.get(url, timeout=timeout))
def _get_cu(url, timeout=45):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return json.loads(r.read().decode())

def jdump(obj, path):
    tmp = path + ".tmp"
    json.dump(obj, open(tmp,"w",encoding="utf-8"), ensure_ascii=False, separators=(",",":"))
    os.replace(tmp, path)

def nhanQ(f):                       # '2024-09-30' -> 'Q3/24'
    y,m = f[2:4], int(f[5:7]);  return "Q%d/%s" % ((m+2)//3, y)
def nhanY(f):                       # '2024-12-31' -> '2024'
    return f[:4]
def thu_tuQ(lb):
    m = re.match(r"Q(\d)/(\d{2})$", str(lb))
    return 2000+int(m.group(2))+int(m.group(1))/10 if m else -1

def tai(sym, loai, codes):
    """-> {nhãn kỳ: {mã dòng: giá trị TỶ}} · cắt lô để không chạm trần 2000 dòng của nguồn."""
    ra = collections.defaultdict(dict)
    nhan = nhanQ if loai=="QUARTER" else nhanY
    for i in range(0, len(codes), CHUNK):
        lo = codes[i:i+CHUNK]
        u = (f"{SRC}?q=code:{sym}~reportType:{loai}~itemCode:"
             + ",".join(str(c) for c in lo) + "&sort=fiscalDate:desc&size=2000")
        d = get(u)
        data = d.get("data") or []
        if d.get("totalElements",0) > len(data):      # nguồn cắt bớt -> lô này không tin được
            raise RuntimeError(f"{sym} {loai}: nguồn trả {len(data)}/{d['totalElements']} dòng")
        for r in data:
            if r.get("numericValue") is None: continue
            fd = r.get("fiscalDate") or ""
            if loai=="QUARTER" and fd[5:] not in ("03-31","06-30","09-30","12-31"): continue
            ra[nhan(fd)][int(r["itemCode"])] = r["numericValue"]/1e9
        time.sleep(0.05)
    return ra

def chon(cu_labels, cu_rows, tho):
    """Chọn mã dòng cho từng chỉ tiêu bằng cách chấm điểm trên các kỳ kho ĐÃ CÓ."""
    ban_do = {}
    for row in cu_rows:
        k = row.get("k")
        if k not in UNG_VIEN: continue
        want = {cu_labels[i]: row["v"][i] for i in range(min(len(cu_labels), len(row["v"])))
                if row["v"][i] is not None and abs(row["v"][i]) >= 1}
        want = {l:v for l,v in want.items() if l in tho}
        if len(want) < KHOP_TOI_THIEU: continue
        tuyet_doi = k.startswith("cf")      # kho mất dấu ở lưu chuyển tiền tệ (xem đầu file)
        diem = []
        for ma in UNG_VIEN[k]:
            d = x = 0
            for l,v in want.items():
                g = tho[l].get(ma)
                if g is None: continue
                a, b = (abs(g), abs(v)) if tuyet_doi else (g, v)
                if abs(a-b) <= abs(b)*LECH_CHO_PHEP: d += 1
                else: x += 1
            diem.append((d, -x, -UNG_VIEN[k].index(ma), ma))
        diem.sort(reverse=True)
        d, nx, _, ma = diem[0]
        if d >= KHOP_TOI_THIEU and (-nx) <= (d+(-nx))*LO_TOI_DA:
            ban_do[k] = ma
    return ban_do

def dung_khoi(cu, tho, ban_do, loai, nguon_thang=False):
    """Dựng khối {labels, rows} đủ lịch sử.
    `nguon_thang=False` (cân đối kế toán): kỳ nào kho ĐÃ CÓ thì giữ số kho — nguồn chính
    của trang vẫn là 24hMoney, để bảng trên web và kho sâu không đá nhau.
    `nguon_thang=True` (lưu chuyển tiền tệ): số VNDirect thắng ở MỌI kỳ, vì kho mất dấu."""
    cu_labels = (cu or {}).get("labels") or []
    cu_rows   = (cu or {}).get("rows") or []
    cu_val = {r["k"]: {cu_labels[i]: r["v"][i] for i in range(min(len(cu_labels), len(r["v"])))}
              for r in cu_rows if r.get("k")}
    labs = sorted(set(list(tho.keys()) + cu_labels),
                  key=(thu_tuQ if loai=="QUARTER" else (lambda x: int(x) if str(x).isdigit() else -1)))
    rows = []
    for r in cu_rows:
        k = r.get("k")
        if not k: continue
        ma = ban_do.get(k)
        v = []
        for l in labs:
            x = None
            if nguon_thang and ma is not None:
                x = (tho.get(l) or {}).get(ma)
            if x is None:
                x = (cu_val.get(k) or {}).get(l)
            if x is None and ma is not None:
                x = (tho.get(l) or {}).get(ma)
            v.append(round(x, 2) if isinstance(x, (int, float)) else None)
        rows.append({"k": k, "n": r.get("n") or "", "v": v})
    return {"labels": labs, "rows": rows}

def kh_row(kh, k):
    for r in kh["rows"]:
        if r["k"] == k: return r["v"]
    return None

lock = threading.Lock()
kq = {"ok":0,"thieu":0,"loi":0,"ky":0,"dong_trong":0}
bao = []
sua = [0]

def mot(sym):
    try:
        fin = json.load(open(os.path.join(FIN, f"{sym}.json"), encoding="utf-8"))
    except Exception:
        with lock: kq["loi"] += 1
        return
    can = set()
    for blk in ("bsQ","cfQ","bsY","cfY"):
        for r in (fin.get(blk) or {}).get("rows") or []:
            if r.get("k") in UNG_VIEN: can |= set(UNG_VIEN[r["k"]])
    if not can:
        with lock: kq["thieu"] += 1
        return
    codes = sorted(can)
    o = {"sym": sym, "updated": time.strftime("%Y-%m-%d"), "src": "vndirect+24hmoney"}
    tong_ky = 0; trong = 0
    try:
        for loai, kq_, ky_ in (("QUARTER","bsQ","cfQ"), ("ANNUAL","bsY","cfY")):
            tho = tai(sym, loai, codes)
            if not tho: continue
            for blk in (kq_, ky_):
                cu = fin.get(blk) or {}
                if not (cu.get("rows")): continue
                bd = chon(cu.get("labels") or [], cu["rows"], tho)
                kh = dung_khoi(cu, tho, bd, loai, nguon_thang=blk.startswith("cf"))
                o[blk] = kh
                tong_ky = max(tong_ky, len(kh["labels"]))
                trong += sum(1 for r in kh["rows"] if r["k"] not in bd)
                # sửa dấu ngay trong data/fin: cắt đúng mấy kỳ trang đang hiện
                if VA_FIN and blk.startswith("cf") and bd:
                    vt = {l:i for i,l in enumerate(kh["labels"])}
                    for r in cu["rows"]:
                        moi = kh_row(kh, r["k"])
                        if moi is None: continue
                        for i,l in enumerate((cu.get("labels") or [])):
                            j = vt.get(l)
                            if j is not None and moi[j] is not None and i < len(r["v"]):
                                r["v"][i] = moi[j]
                    sua[0] += 1
    except Exception as e:
        with lock:
            kq["loi"] += 1; bao.append((sym, str(e)[:70]))
        return
    if not any(k in o for k in ("bsQ","cfQ","bsY","cfY")):
        with lock: kq["thieu"] += 1
        return
    if not THU:
        os.makedirs(OUT, exist_ok=True)
        jdump(o, os.path.join(OUT, f"{sym}.json"))
        if VA_FIN: jdump(fin, os.path.join(FIN, f"{sym}.json"))
    with lock:
        kq["ok"] += 1; kq["ky"] += tong_ky; kq["dong_trong"] += trong
        n = kq["ok"]+kq["thieu"]+kq["loi"]
        if n % 100 == 0: print(f"  {n}/{len(syms)}…", flush=True)

def can_lam(sym):
    """--moi: chỉ mã nào data/fin có kỳ mà kho sâu CHƯA CÓ. Báo cáo tài chính một năm
    chỉ ra 4 lần nên ngày thường gần như không mã nào cần chạy — pipeline gọi mỗi phiên
    vẫn rẻ, mà tới mùa báo cáo thì tự bồi vào không cần ai nhớ."""
    try:
        fin = json.load(open(os.path.join(FIN, f"{sym}.json"), encoding="utf-8"))
    except Exception:
        return False
    try:
        cu = json.load(open(os.path.join(OUT, f"{sym}.json"), encoding="utf-8"))
    except Exception:
        return True                      # chưa có kho sâu -> làm
    for blk in ("bsQ","cfQ","bsY","cfY"):
        a = set((fin.get(blk) or {}).get("labels") or [])
        b = set((cu.get(blk)  or {}).get("labels") or [])
        if a - b: return True
    return False

def main(chi=None, moi=False, gioi_han=0):
    global syms
    syms = sorted(f[:-5] for f in os.listdir(FIN) if f.endswith(".json"))
    if chi: syms = [s for s in syms if s in chi]
    if moi:
        syms = [s for s in syms if can_lam(s)]
        if gioi_han: syms = syms[:gioi_han]
        if not syms:
            print("kho sâu: không mã nào có kỳ mới", flush=True); return {"ok":0}
    print(f"kho sâu: {len(syms)} mã · {'CHẠY THỬ (không ghi)' if THU else 'DỰNG THẬT'}", flush=True)
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(mot, syms))
    print(f"kho sâu xong sau {time.time()-t0:.0f}s: {kq['ok']} mã · trung bình "
          f"{kq['ky']/max(1,kq['ok']):.0f} kỳ/mã · {kq['dong_trong']} dòng không dò được mã"
          f" · {kq['thieu']} mã không có gì · {kq['loi']} mã lỗi", flush=True)
    for s, e in bao[:10]: print(f"  {s}: {e}")
    return dict(kq)

syms = []
if __name__ == "__main__":
    main(chi=CHI, moi="--moi" in sys.argv)
