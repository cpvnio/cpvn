#!/usr/bin/env python3
"""
CƠ CẤU LỢI NHUẬN / TÀI SẢN / NGUỒN VỐN — cào Simplize về data/cocau/{MÃ}.json.

VÌ SAO CẦN, VÀ VÌ SAO KHÔNG LÀM ĐƯỢC BẰNG KHO SẴN CÓ:
kho `data/fin` và `data/finq` đều lấy bản CĐKT **mẫu THƯỜNG** — 20 dòng tóm tắt dùng
chung cho mọi loại hình. Với doanh nghiệp sản xuất thì tạm đủ, nhưng với công ty chứng
khoán thì nó vô nghĩa: SSI Q2/26 trong kho có "Hàng tồn kho = None", "Tài sản cố định
176 tỷ", còn **40.473 tỷ đang cho khách vay thì không có dòng nào chứa**. Đó đúng là chỗ
`build_nganh` phải in ra "Dư nợ cho vay ký quỹ — nguồn chưa mở, sẽ bổ sung".

Simplize `company/fi/structure/overview` trả bảng phân rã theo ĐÚNG loại hình, cộng thêm
thứ cả hai kho đều không có: **lợi nhuận tách theo mảng kinh doanh** (với CTCK là môi
giới / cho vay ký quỹ / tự doanh / ngân hàng đầu tư; với ngân hàng là lãi thuần / dịch vụ
/ ngoại hối / chứng khoán). Đây là câu trả lời cho "doanh nghiệp này kiếm tiền từ đâu",
mà trang chưa có gì tương đương.

ĐỘ TIN — đã đối chiếu ĐỘC LẬP trước khi viết file này: cộng toàn bộ dòng tài sản của
Simplize so với `bsa53 TỔNG TÀI SẢN` của kho (nguồn 24hMoney, đường lấy số hoàn toàn
khác) trên 12 mã phủ cả bốn nhóm — **12/12 khớp 0,00%** (SSI, VND, HCM, VCI, MBS, SHS,
VCB, CTG, ACB, HPG, VHM, BVH). Đơn vị nguồn trả là ĐỒNG, file này ghi TỶ.

GIỚI HẠN PHẢI NÓI RA, ĐỪNG QUÊN KHI ĐỌC SỐ:
  · **Nguồn chỉ trả 15 quý (từ Q4/2022) và 10 năm (từ 2016). Không có cách xin thêm** —
    đã thử `size`/`limit`/`page`/`periodDate`/`fromDate`/`numberOfPeriod`, mọi tham số
    đều bị bỏ qua, luôn đúng 15 kỳ. Nên chuỗi ở đây NGẮN HƠN HẲN `data/nganh` (79 quý).
    Ghép hai thứ vào cùng một bảng thì phải chấp nhận mấy dòng mới bắt đầu từ Q4/22.
  · Nhóm của Simplize CHỈ CÓ BỐN (`BANK` `INVESTMENT` `INSURANCE` `MANUFACTURING`), thô
    hơn 5 mẫu của `build_nganh`: **bất động sản nằm chung MANUFACTURING** (VHM, NLG, DXG
    đều ra MANUFACTURING). Đừng dùng trường `nhom` này thay cho `mau` của data/nganh.
  · Độ phủ đo trên 45 mã ngẫu nhiên: **39/45 có dữ liệu**, phần còn lại nguồn trả rỗng
    (mã ngừng công bố / mới lên sàn). Vài mã chỉ có 3-12 kỳ — ghi đúng số kỳ có thật.

NHÃN LƯU MỘT LẦN, KHÔNG LẶP THEO MÃ: tiêu đề dòng do NHÓM quyết định chứ không do mã —
đã kiểm 15 mã trên cả bốn nhóm, mỗi nhóm ra đúng MỘT bộ nhãn. Nhét nhãn vào từng file là
1.500 bản sao của cùng một chuỗi tiếng Việt (~40KB/mã, tổng 65MB). Nhãn nằm ở
`data/cocau/_nhan.json`, file mã chỉ còn số nên ~3KB.

  python3 tools/cao_cocau.py                # cào tất cả mã trong universe
  python3 tools/cao_cocau.py --ma SSI,VCB
  python3 tools/cao_cocau.py --moi          # chỉ mã chưa có file hoặc file cũ hơn N ngày
"""
import argparse
import concurrent.futures as cf
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "data", "cocau")
NHAN = os.path.join(OUT, "_nhan.json")
API = "https://api2.simplize.vn/api/company/fi/structure/overview/{sym}?period={p}"

# Simplize chặn IP khá sớm — cùng mức đang dùng ở refresh_daily cho nguồn này
LUONG = 4
NGHI = 0.15
_khoa = threading.Lock()

# (khoá trong data trả về, khoá ghi ra file)
#
# CHỈ GIỮ HAI KHỐI, dù nguồn trả bốn. `data/cocau` nằm trong repo mà repo CHÍNH LÀ thứ
# Cloudflare đem đi phục vụ — mỗi MB thừa là mỗi MB đi kèm mọi lượt dựng lại. Khối nguồn
# vốn (`bsCapitalValue`) và dòng tiền (`cfValue`) không có chỗ nào đọc: dòng tiền đã có
# trong `data/finq` với dấu đúng của VNDirect, còn nguồn vốn thì `data/nganh` đã rút sẵn
# mấy dòng cần (vay, vay/VCSH, đòn bẩy). Bỏ hai khối đó tiết kiệm ~2,5MB.
KHOI = [("pvalue", "p"), ("bsAssetValue", "ts")]
KHOI_TEN = [("ptitle", "p"), ("bsAssetTitle", "ts")]

# Khối tài sản CHỈ giữ cho công ty chứng khoán, và chỉ vì một dòng: `bs5` "Các khoản cho
# vay" — con số dư nợ ký quỹ mà cả `data/fin` lẫn `data/finq` đều không có (hai kho đó
# lấy bản CĐKT mẫu THƯỜNG). Nhóm khác thì phần tài sản đã nằm đủ trong data/nganh, giữ
# lại chỉ tổ phình kho.
TS_GIU = {"INVESTMENT"}


def jdump(obj, path):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


def nhan_ky(ten, ky_loai):
    """'Q2/2026' -> 'Q2/26' (đúng nhãn của data/fin và data/nganh); năm giữ nguyên '2025'."""
    ten = str(ten or "")
    if ky_loai == "Y":
        m = re.search(r"(\d{4})", ten)
        return m.group(1) if m else ten
    m = re.match(r"(Q\d)/(\d{2})(\d{2})$", ten)
    return f"{m.group(1)}/{m.group(3)}" if m else ten


def goi(url, thu=3):
    for i in range(thu):
        try:
            r = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0", "Referer": "https://simplize.vn/"})
            with urllib.request.urlopen(r, timeout=30) as f:
                return json.load(f)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
            if i == thu - 1:
                return None
            time.sleep(0.6 * (i + 1))
    return None


def thu_tu(lb, ky_loai):
    """khoá xếp thời gian cho nhãn đã chuẩn hoá: 'Q2/26' -> 2026.2 ; '2025' -> 2025."""
    if ky_loai == "Y":
        return float(lb) if str(lb).isdigit() else -1
    m = re.match(r"Q(\d)/(\d{2})$", str(lb))
    return 2000 + int(m.group(2)) + int(m.group(1)) / 10 if m else -1


def mot_ky(sym, ky_loai):
    """Trả (nhóm, [nhãn kỳ], {khối: {mã dòng: [giá trị theo kỳ]}}, {khối: {mã dòng: tiêu đề}}).

    HAI KHỐI CÓ THỂ CÓ DANH SÁCH KỲ KHÁC HẲN NHAU — phải khớp theo NHÃN, tuyệt đối đừng
    zip theo vị trí. Bản đầu lấy trục kỳ của khối dài hơn rồi ghép thẳng mảng của khối kia
    vào, và đó là lỗi dán số sang nhãn kỳ của người khác: ACE trả `pvalue` có
    [Q3/08, Q3/09, Q3/14, Q3/15] còn `bsAssetValue` có [Q3/09, Q3/15, Q2/17] — chẳng những
    lệch độ dài mà còn lệch cả MỐC. Đo trên toàn kho: **423 chuỗi bị lệch**. Không có gì
    báo lỗi cả, biểu đồ vẫn vẽ ra một hình trông hợp lý.
    Kỳ nguồn còn KHÔNG LIÊN TỤC ở mã ngừng công bố (ACE nhảy Q3/08 -> Q3/09 -> Q3/14),
    nên cũng đừng giả định trục là chuỗi quý đều nhau.
    """
    j = goi(API.format(sym=sym, p=ky_loai))
    time.sleep(NGHI)
    d = (j or {}).get("data") or {}
    nhom = d.get("industryGroup")
    if not nhom:
        return None, [], {}, {}

    ten = {}
    for khoa, ra in KHOI_TEN:
        ten[ra] = {k: v.get("title") for k, v in (d.get(khoa) or {}).items() if v.get("title")}

    # bước 1: mỗi khối tự giữ bản đồ {nhãn kỳ -> giá trị}
    ban_do, nhan_co = {}, set()
    for khoa, ra in KHOI:
        muc = d.get(khoa) or []
        cot = {}
        for k in ten.get(ra, {}):
            m = {}
            for x in muc:
                lb = nhan_ky(x.get("periodDateName"), ky_loai)
                v = ((x.get("values") or {}).get(k) or {}).get("value")
                if v is not None:
                    m[lb] = round(v / 1e9, 1)
            if m:
                cot[k] = m
                nhan_co.update(m)
        ban_do[ra] = cot

    # bước 2: một trục kỳ chung cho cả file, xếp theo thời gian
    ky = sorted(nhan_co, key=lambda lb: thu_tu(lb, ky_loai))
    so = {ra: {k: [m.get(lb) for lb in ky] for k, m in cot.items()}
          for ra, cot in ban_do.items()}
    return nhom, ky, so, ten


def mot_ma(sym):
    ra = {"sym": sym}
    tenchung = {}
    co = False
    for ky_loai in ("Q", "Y"):
        nhom, ky, so, ten = mot_ky(sym, ky_loai)
        if not nhom or not ky:
            continue
        co = True
        ra["nhom"] = nhom
        ra.setdefault("ky", {})[ky_loai] = ky
        if nhom not in TS_GIU:
            so.pop("ts", None)
            ten.pop("ts", None)
        ra[ky_loai] = so
        tenchung = ten
    return (ra, tenchung) if co else (None, None)


def cu(path, ngay):
    if not os.path.exists(path):
        return True
    return (time.time() - os.path.getmtime(path)) > ngay * 86400


def main(chi=None, moi=False, ngay=7, gioi_han=0):
    os.makedirs(OUT, exist_ok=True)
    if chi:
        syms = [x.strip().upper() for x in (chi.split(",") if isinstance(chi, str) else chi) if x.strip()]
    else:
        u = json.load(open(os.path.join(BASE, "universe.json"), encoding="utf-8"))
        st = u.get("stocks") if isinstance(u, dict) else u
        syms = sorted(st.keys() if isinstance(st, dict) else [x["sym"] for x in st])
    if moi:
        syms = [s for s in syms if cu(os.path.join(OUT, f"{s}.json"), ngay)]
    if gioi_han:
        syms = syms[:gioi_han]
    if not syms:
        print("cocau: không có mã nào cần cào", flush=True)
        return {"ok": 0, "rong": 0, "bo_qua": "tất cả còn mới"}

    nhan = {}
    if os.path.exists(NHAN):
        try:
            nhan = json.load(open(NHAN, encoding="utf-8"))
        except Exception:
            nhan = {}

    dat = rong = 0

    def chay(s):
        nonlocal dat, rong
        try:
            d, ten = mot_ma(s)
        except Exception as e:
            print(f"  ! {s}: {str(e)[:60]}", file=sys.stderr)
            return
        if not d:
            # Cào hụt thì GIỮ SỐ CŨ, đừng ghi rỗng đè lên (luật chung của pipeline)
            with _khoa:
                rong += 1
            return
        d["capnhat"] = time.strftime("%Y-%m-%d")
        jdump(d, os.path.join(OUT, f"{s}.json"))
        with _khoa:
            dat += 1
            if ten and d.get("nhom") and d["nhom"] not in nhan:
                nhan[d["nhom"]] = ten

    with cf.ThreadPoolExecutor(LUONG) as ex:
        list(ex.map(chay, syms))

    if nhan:
        jdump(nhan, NHAN)
    print(f"cocau: ghi {dat} mã · nguồn không có {rong} · nhóm nhãn {sorted(nhan)}", flush=True)
    return {"ok": dat, "rong": rong, "hoi": len(syms), "nhom": sorted(nhan)}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--ma", help="danh sách mã, phẩy ngăn cách")
    ap.add_argument("--moi", action="store_true", help="bỏ qua mã đã có file mới hơn --ngay")
    ap.add_argument("--ngay", type=int, default=7, help="ngưỡng coi là cũ cho --moi (mặc định 7)")
    ap.add_argument("--gioihan", type=int, default=0, help="chỉ chạy N mã đầu (dò thử)")
    a = ap.parse_args()
    main(chi=a.ma, moi=a.moi, ngay=a.ngay, gioi_han=a.gioihan)
