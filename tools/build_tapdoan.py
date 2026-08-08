#!/usr/bin/env python3
"""
DỰNG BẢN ĐỒ TẬP ĐOÀN -> data/tapdoan.json (radar "Săn tập đoàn" đọc file này).

Nguyên liệu: `sh` (danh sách cổ đông) trong data/profile/{MÃ}.json. Mỗi mã niêm yết có
danh sách cổ đông kèm tỉ lệ; ai nắm >= NGUONG% của từ 2 mã trở lên thì chính là một tập
đoàn. Không phải đoán, không phải nhập tay 1.500 dòng.

BA THỨ PHẢI XỬ LÝ, thiếu cái nào là bản đồ vỡ:

1. MẸ THƯỜNG KHÔNG NIÊM YẾT. Viettel, PVN, EVN, TKV, Vinachem đều là công ty mẹ chưa lên
   sàn — nếu chỉ nối theo MÃ cổ đông (trường `t`) thì mất sạch mấy nhóm lớn nhất. Nên gom
   cụm theo TÊN cổ đông đã chuẩn hoá, mã hay không đều được.

2. MỘT TẬP ĐOÀN NẰM RẢI Ở NHIỀU PHÁP NHÂN TRUNG GIAN. Masan là ca kinh điển: MCH do
   "Masan Consumer Holdings" nắm 93,6%, MSR do "Masan Horizon" 86,4%, MML do "Masan Agri
   Corp" 78,6%, còn MSN do "Tập đoàn Masan" 31% — bốn cái tên khác nhau, bốn cụm rời rạc.
   Vingroup cũng vậy: VPL/VEF/VHM nối được nhưng VRE chỉ 18,8% nên rơi khỏi ngưỡng.
   -> bảng TU_KHOA gộp các biến thể về một nhóm và gắn mã công ty mẹ. Đây là phần DUY NHẤT
   viết tay, cố ý để lộ thiên cho dễ soát chứ không giấu trong thuật toán.

3. NHÀ NƯỚC / QUỸ / CÁ NHÂN KHÔNG PHẢI "TẬP ĐOÀN". Ngân hàng Nhà nước nắm BID+VCB+CTG
   nhưng ba ngân hàng đó không cùng một nhà; các Bộ, Uỷ ban quản lý vốn cũng thế. Mấy
   trường hợp đó vẫn giữ nhưng ĐÁNH DẤU `kieu` để giao diện tách bạch, không trộn lẫn với
   tập đoàn tư nhân thật.

  python3 tools/build_tapdoan.py
"""
import json, os, re, glob, unicodedata, datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROF = os.path.join(BASE, "data", "profile")
OUT = os.path.join(BASE, "data", "tapdoan.json")
NGUONG = 20.0          # cổ đông LẠ nắm từ bấy nhiêu % mới coi là chi phối
NGUONG_TAY = 10.0      # nhóm đã khai trong TU_KHOA thì hạ ngưỡng: đã biết chắc là một nhà,
                       # giữ 20% là mất VRE (Vingroup nắm 18,8%) và FTS (FPT nắm 17,6%)
TOI_THIEU = 2          # nhóm phải có ít nhất bấy nhiêu mã niêm yết

# (id, tên hiển thị, mã mẹ nếu có niêm yết, các từ khoá nhận diện trong TÊN cổ đông)
TU_KHOA = [
    ("vingroup", "Vingroup",            "VIC", ["vingroup"]),
    ("masan",    "Masan Group",         "MSN", ["masan"]),
    ("viettel",  "Viettel",             None,  ["viettel", "vien thong quan doi"]),
    ("pvn",      "Petrovietnam (PVN)",  None,  ["dau khi viet nam", "petrovietnam", "pvn"]),
    ("evn",      "Điện lực Việt Nam (EVN)", None, ["dien luc viet nam", "evn", "power generation corporation", "power generation joint stock corporation"]),
    ("tkv",      "Than – Khoáng sản (TKV)", None, ["than khoang san", "coal and mineral", "vinacomin"]),
    ("vinachem", "Vinachem",            None,  ["hoa chat viet nam", "vinachem"]),
    ("vimc",     "VIMC (Hàng hải VN)",  "MVN", ["hang hai viet nam", "vimc"]),
    ("vrg",      "Cao su Việt Nam",     "GVR", ["rubber group", "cong nghiep cao su viet nam"]),
    ("gelex",    "GELEX",               "GEX", ["gelex"]),
    ("fpt",      "FPT",                 "FPT", ["fpt"]),
    ("ree",      "REE",                 "REE", ["r e e", "ree"]),
    ("sonadezi", "Sonadezi",            "SNZ", ["sonadezi", "khu cong nghiep bien hoa"]),
    ("vinatex",  "Vinatex",             "VGT", ["det may viet nam", "vinatex"]),
    ("hoaphat",  "Hoà Phát",            "HPG", ["hoa phat"]),
    ("thanhthanhcong", "Thành Thành Công", None, ["thanh thanh cong"]),
    ("sunshine", "Sunshine",            None,  ["sunshine", "do anh tuan"]),
    ("mbbank",   "MB Bank",             "MBB", ["military commercial", "quan doi mb"]),
    ("scic",     "SCIC",                None,  ["kinh doanh von nha nuoc", "scic"]),
]
# QUỸ / CÔNG TY QUẢN LÝ VỐN không phải công ty mẹ — họ mua bán cổ phần chứ không điều hành.
# Bỏ hẳn, bằng không "FPT Fund Management" nắm 11,7% TN1 sẽ biến TN1 thành con của FPT.
LOAI_TRU = ["quan ly quy", "fund management", "fund mangement", "asset management",
            "asset advisors", "investment fund", "capital management", "quy dau tu",
            "securities", "chung khoan", "bao hiem xa hoi", "vinacapital", "dragon capital"]
# Dấu hiệu cổ đông là PHÁP NHÂN. Không có dấu nào -> gần như chắc chắn là CÁ NHÂN
# (ông Nguyễn Văn Đạt nắm PDR, ông Đỗ Anh Tuấn nắm Sunshine). Vẫn là một nhóm đáng theo
# dõi nhưng phải gọi đúng tên là "cá nhân chi phối", đừng dán nhãn tập đoàn.
DAU_DN = ["cong ty", "ctcp", "tap doan", "tong cong ty", "tnhh", "jsc", "corp", "corporation",
          "group", "holding", "ltd", "limited", "pte", "bank", "ngan hang", "ministry",
          "committee", "commission", "uy ban", "bo ", "quy ", "fund", "inc", "sbh", "pjico"]
# cổ đông là NHÀ NƯỚC/CƠ QUAN — giữ nhưng đánh dấu riêng, không phải tập đoàn tư nhân
NHA_NUOC = ["ngan hang nha nuoc", "bo cong thuong", "bo tai chinh", "bo xay dung",
            "bo nong nghiep", "bo giao thong", "ministry", "commission for the management",
            "people s committee", "uy ban nhan dan", "kinh doanh von nha nuoc", "scic",
            "state bank", "state capital"]


def khong_dau(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def chuan(s):
    """Bỏ mọi từ chỉ loại hình doanh nghiệp để 'Công ty CP X' và 'CTCP X' về cùng một chuỗi."""
    s = khong_dau(s)
    s = re.sub(r"\b(cong ty|co phan|ctcp|tnhh|tap doan|tong cong ty|mtv|mot thanh vien|jsc|"
               r"joint stock company|corporation|corp|holding|holdings|group|limited|ltd|pte|"
               r"inc|co|cp|va)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def main():
    uni = json.load(open(os.path.join(BASE, "universe.json"), encoding="utf-8"))
    U = {s["sym"]: s for s in uni["stocks"]}
    mcap = lambda s: (U.get(s) or {}).get("mcap") or 0

    # gom: khoá nhóm -> {mã con: % sở hữu}
    nhom, ten_goc, la_nn, la_dn = {}, {}, {}, {}
    ten_map = {g: (ten, me) for g, ten, me, _ in TU_KHOA}
    for p in glob.glob(os.path.join(PROF, "*.json")):
        sym = os.path.basename(p)[:-5]
        if sym not in U: continue
        try: d = json.load(open(p, encoding="utf-8"))
        except Exception: continue
        for x in d.get("sh") or []:
            pc = x.get("p") or 0
            if pc < NGUONG_TAY: continue
            thoTen = khong_dau(x.get("n"))
            if any(t in thoTen for t in LOAI_TRU): continue
            khoa = None
            for gid, _, _, tks in TU_KHOA:
                # KHỚP TRỌN TỪ, không khớp chuỗi con: "gelex" mà khớp kiểu chuỗi con thì
                # "Geleximco" (một tập đoàn hoàn toàn khác) cũng bị hút vào nhóm GELEX.
                if any(re.search(r"\b" + re.escape(tk.strip()) + r"\b", thoTen) for tk in tks):
                    khoa = gid; break
            if not khoa:
                if pc < NGUONG: continue          # cổ đông lạ thì đòi ngưỡng cao hơn
                c = chuan(x.get("n"))
                if len(c) < 4: continue
                khoa = "auto:" + c
            nhom.setdefault(khoa, {})
            nhom[khoa][sym] = max(nhom[khoa].get(sym, 0), pc)
            ten_goc.setdefault(khoa, x.get("n") or "")
            if any(t in thoTen for t in NHA_NUOC): la_nn[khoa] = True
            # gắn cờ PHÁP NHÂN nếu BẤT KỲ biến thể tên nào của nhóm có dấu hiệu doanh nghiệp.
            # Chấm theo từng tên rồi gán "cá nhân" ngay là hỏng: PVN vào nhóm qua cả "Tập đoàn
            # Dầu khí Việt Nam" lẫn "PVN" trơ trọi, chỉ cần một biến thể trống là cả tập đoàn
            # bị dán nhãn cá nhân.
            if khoa in ten_map or any(t in thoTen for t in DAU_DN): la_dn[khoa] = True

    # CON CỦA CON: mã do một THÀNH VIÊN của nhóm nắm chi phối thì cũng thuộc nhóm đó.
    # Lặp vài vòng vì chuỗi sở hữu có thể dài (mẹ -> con -> cháu).
    for _ in range(3):
        thanh_vien = {}
        for k, ds in nhom.items():
            for s2 in ds: thanh_vien.setdefault(s2, k)
        them = 0
        for p in glob.glob(os.path.join(PROF, "*.json")):
            sym = os.path.basename(p)[:-5]
            if sym not in U or sym in thanh_vien: continue
            try: d = json.load(open(p, encoding="utf-8"))
            except Exception: continue
            for x in d.get("sh") or []:
                t = (x.get("t") or "").strip().upper()
                pc = x.get("p") or 0
                if pc >= NGUONG and t in thanh_vien:
                    nhom[thanh_vien[t]][sym] = max(nhom[thanh_vien[t]].get(sym, 0), pc)
                    them += 1
                    break
        if not them: break

    # mã mẹ (nếu niêm yết) cũng là thành viên của chính nhóm mình
    for gid, (ten, me) in ten_map.items():
        if me and me in U and gid in nhom: nhom[gid].setdefault(me, None)

    ra = []
    for khoa, ds in nhom.items():
        if len(ds) < TOI_THIEU: continue
        ten, me = ten_map.get(khoa, (None, None))
        if not ten:
            ten = re.sub(r"\s+", " ", (ten_goc.get(khoa) or "").strip())
            if len(ten) > 46: ten = ten[:45].rstrip() + "…"
        syms = sorted(ds.items(), key=lambda kv: -mcap(kv[0]))
        ra.append({
            "id": khoa.replace("auto:", "a-").replace(" ", "-")[:40],
            "ten": ten, "me": me if me in U else None,
            "kieu": "nn" if la_nn.get(khoa) else ("tt" if la_dn.get(khoa) else "cn"),
            "mcap": round(sum(mcap(s) for s, _ in syms) / 1e9),
            "syms": [{"s": s, "p": (round(p, 1) if p else None)} for s, p in syms],
        })
    ra.sort(key=lambda g: -g["mcap"])
    json.dump({"generated": datetime.date.today().isoformat(), "nhom": ra},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    tt = [g for g in ra if g["kieu"] == "tt"]
    print(f"✓ data/tapdoan.json: {len(ra)} nhóm ({len(tt)} tập đoàn, {len(ra)-len(tt)} nhà nước/cơ quan)"
          f" · {sum(len(g['syms']) for g in ra)} lượt mã")
    for g in ra[:16]:
        print(f"  {g['mcap']/1e3:8,.0f} nt · {len(g['syms']):2d} mã · [{g['kieu']}] {g['ten'][:34]:34s} "
              + ", ".join(x["s"] for x in g["syms"][:8]))


if __name__ == "__main__":
    main()
