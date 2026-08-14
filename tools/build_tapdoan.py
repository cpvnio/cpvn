#!/usr/bin/env python3
"""
DỰNG BẢN ĐỒ TẬP ĐOÀN -> data/tapdoan.json  (mục "Danh mục tập đoàn")
DỰNG DANH MỤC CÁC QUỸ  -> data/quy.json      (tab "Soi quỹ đầu tư")
Cả hai cùng đọc data/profile nên gộp chung một lượt quét.

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
OUT_Q = os.path.join(BASE, "data", "quy.json")
NGUONG = 20.0          # cổ đông LẠ nắm từ bấy nhiêu % mới coi là chi phối
NGUONG_TAY = 10.0      # nhóm đã khai trong TU_KHOA thì hạ ngưỡng: đã biết chắc là một nhà,
                       # giữ 20% là mất VRE (Vingroup nắm 18,8%) và FTS (FPT nắm 17,6%)
NGUONG_HIEU = 10.0     # SÀN cho tỉ lệ HIỆU DỤNG sau khi nhân dồn qua chuỗi. Từng khâu đạt
                       # ngưỡng không có nghĩa là cả chuỗi còn ý nghĩa: 22,5% × 20% = 4,5%,
                       # nắm 4,5% thì gọi là cùng một nhà với ai. Không có sàn này thì đẻ
                       # ra cả loạt "tập đoàn" hai mã mà mã thứ hai chỉ là cháu hờ.
NGUONG_CHI_PHOI = 50.0 # nhà nước nắm QUÁ BÁN mẹ thì cả nhóm là nhà nước. Quá bán mới là
                       # chi phối thật: SCIC nắm 36% Vinamilk và 36% Sabeco — cổ đông lớn
                       # nhất nhưng không cầm quyền, gọi hai nhà đó là doanh nghiệp nhà
                       # nước thì sai hẳn (Sabeco do ThaiBev nắm 53,6%).
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
# TẬP ĐOÀN NHÀ NƯỚC PHẢI KHAI TAY — và CHỈ những nhóm mà kho KHÔNG THỂ tự biết.
# `NHA_NUOC` bên dưới chỉ nhận ra CƠ QUAN (Bộ, UBND, Ngân hàng Nhà nước, SCIC, Uỷ ban Quản
# lý vốn). Còn PVN, EVN, TKV, Viettel, Vinachem là DOANH NGHIỆP nhà nước 100% vốn: tên chúng
# không mang chữ nào của cơ quan, mà bản thân chúng lại CHƯA NIÊM YẾT nên không có
# `data/profile/{MÃ}.json` để đọc xem ai nắm — không có đường nào suy ra từ dữ liệu. VIMC
# thì niêm yết (MVN) nhưng nguồn không trả về nổi một dòng cổ đông nào.
# Hệ quả trước khi vá: 64 mã dầu khí của PVN đứng cạnh Vingroup và Masan không một dấu
# hiệu nào cho biết đó là nhà nước, trong khi SCIC nắm 10% một mã lẻ thì lại có nhãn.
# ĐỪNG KHAI THÊM VÀO ĐÂY nhóm nào mà mẹ CÓ niêm yết: GVR (Uỷ ban 96,8%), VGT (SCIC 53,5%),
# SNZ (UBND Đồng Nai 99,5%), BID/CTG (Ngân hàng Nhà nước), ACV/HVN (Uỷ ban), GAS (PVN 95,8%)
# đều tự suy ra được từ danh sách cổ đông của chính mẹ — khai tay là thêm một chỗ phải nhớ
# cập nhật mà chẳng được gì.
NN_TAY = {"pvn", "evn", "tkv", "viettel", "vinachem", "vimc"}
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


def la_nha_nuoc(ten):
    """Cổ đông này có phải NHÀ NƯỚC không? Hai lối nhận, thiếu lối nào cũng hụt:
      · CƠ QUAN — Bộ, UBND, Ngân hàng Nhà nước, SCIC, Uỷ ban Quản lý vốn (bảng NHA_NUOC);
      · TẬP ĐOÀN nhà nước — PVN, EVN, TKV, Viettel, Vinachem, VIMC (bảng NN_TAY, nhận qua
        chính từ khoá của nhóm đó trong TU_KHOA nên chỉ phải khai tên ở MỘT chỗ).
    Khớp TRỌN TỪ cho từ khoá TU_KHOA, cùng lý do với vòng gom nhóm: khớp chuỗi con thì
    "Geleximco" chui vào GELEX."""
    t = khong_dau(ten)
    if any(k in t for k in NHA_NUOC): return True
    for gid, _, _, tks in TU_KHOA:
        if gid not in NN_TAY: continue
        if any(re.search(r"\b" + re.escape(k.strip()) + r"\b", t) for k in tks): return True
    return False


def chuan(s):
    """Bỏ mọi từ chỉ loại hình doanh nghiệp để 'Công ty CP X' và 'CTCP X' về cùng một chuỗi."""
    s = khong_dau(s)
    s = re.sub(r"\b(cong ty|co phan|ctcp|tnhh|tap doan|tong cong ty|mtv|mot thanh vien|jsc|"
               r"joint stock company|corporation|corp|holding|holdings|group|limited|ltd|pte|"
               r"inc|co|cp|va)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _ngay(d):
    """'30/06/2026' -> '2026-06-30' để so sánh và xếp thứ tự được."""
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})$", str(d or "").strip())
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else ""


def canh_so_huu(P, U):
    """BẢN ĐỒ SỞ HỮU: cha -> {con: [%, có phải chỉ là liên kết không]}.

    HAI chiều khai báo, thiếu chiều nào cũng hụt con:
      · `sh`   — X nằm trong danh sách CỔ ĐÔNG của Y   => X nắm Y
      · `subs` — Y nằm trong danh sách CÔNG TY CON của X => X nắm Y

    Chiều thứ hai mới bắt được con GIÁN TIẾP, và FOC là ca điển hình: danh sách cổ đông
    của FOC trong nguồn chỉ còn hai cá nhân nắm 0,28% — mẹ thật (FPT Telecom) biến mất
    sạch, nối kiểu nào cũng không ra. Nhưng FPT tự khai FOC trong `subs` ở 23,79%, đúng
    tỉ lệ HỢP NHẤT đã xuyên qua FOX. Nguồn nói thẳng cái mà cổ đông học không thấy.
    """
    canh = {}
    def ghi(cha, con, pc, lk):
        if not pc or cha == con or con not in U: return
        d = canh.setdefault(cha, {})
        cu = d.get(con)
        if not cu: d[con] = [pc, lk]
        elif pc > cu[0]: d[con] = [pc, lk and cu[1]]
        elif not lk: cu[1] = False
    for sym, d in P.items():
        for x in d.get("sh") or []:
            t = (x.get("t") or "").strip().upper()
            if not t or any(k in khong_dau(x.get("n")) for k in LOAI_TRU): continue
            ghi(t, sym, x.get("p") or 0, False)
        for x in d.get("subs") or []:
            t = (x.get("t") or "").strip().upper()
            if not t: continue
            # `a` = LIÊN KẾT chứ không phải con. Masan khai Techcombank 14,9% trong subs;
            # nhận vào là cả vốn hoá TCB nhảy vào nhóm Masan. Liên kết đòi ngưỡng cao hơn.
            ghi(sym, t, x.get("p") or 0, bool(x.get("a")))
    return canh


def dung_quy(P):
    """Lật danh mục: mỗi mã liệt kê quỹ đang nắm -> đảo thành mỗi quỹ nắm những mã nào.

    KỲ DỮ LIỆU LỆCH NHAU RẤT XA và đó là điều phải nói thẳng: quỹ nội công bố đều đặn nên
    có số tới 30/06/2026, còn Dragon Capital hay PYN thì nguồn chỉ có tới 31/12/2023 —
    hơn hai năm. Gộp chung rồi gọi là "đang nắm giữ" là dựng nên một danh mục không còn
    tồn tại. Nên mỗi quỹ mang theo `ky` của chính nó để giao diện ghi rõ ngày.
    """
    from collections import defaultdict
    q = defaultdict(list)
    ten = {}
    for sym, d in P.items():
        for x in d.get("funds") or []:
            ma = (x.get("n") or "").strip()
            if not ma or not (x.get("v") or 0) > 0: continue
            q[ma].append({"s": sym, "v": round(x["v"] / 1e9, 2),
                          "cp": int(x.get("s") or 0), "ky": _ngay(x.get("d"))})
            ten.setdefault(ma, (x.get("fn") or ma).strip())
    ra = []
    for ma, ds in q.items():
        if len(ds) < 2: continue
        ds.sort(key=lambda r: -r["v"])
        ra.append({"ma": ma, "ten": ten[ma], "ky": max(r["ky"] for r in ds),
                   "tong": round(sum(r["v"] for r in ds), 1),
                   "syms": [{"s": r["s"], "v": r["v"], "cp": r["cp"]} for r in ds]})
    ra.sort(key=lambda g: (-(g["ky"] >= "2025-01-01"), -g["tong"]))   # kỳ mới đứng trước
    json.dump({"generated": datetime.date.today().isoformat(), "quy": ra},
              open(OUT_Q, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    moi = sum(1 for g in ra if g["ky"] >= "2025-01-01")
    print(f"✓ data/quy.json: {len(ra)} quỹ ({moi} quỹ có số liệu từ 2025 trở lại) · "
          f"{sum(len(g['syms']) for g in ra)} lượt nắm")
    return ra


def main():
    uni = json.load(open(os.path.join(BASE, "universe.json"), encoding="utf-8"))
    U = {s["sym"]: s for s in uni["stocks"]}
    mcap = lambda s: (U.get(s) or {}).get("mcap") or 0
    P = {}
    for p in glob.glob(os.path.join(PROF, "*.json")):
        sym = os.path.basename(p)[:-5]
        if sym not in U: continue
        try: P[sym] = json.load(open(p, encoding="utf-8"))
        except Exception: pass
    dung_quy(P)

    # gom: khoá nhóm -> {mã con: % sở hữu}
    nhom, ten_goc, la_nn, la_dn = {}, {}, {}, {}
    ten_map = {g: (ten, me) for g, ten, me, _ in TU_KHOA}
    me_map = {me: g for g, _, me, _ in TU_KHOA if me}      # mã mẹ -> nhóm đã khai tay
    for sym, d in P.items():
        for x in d.get("sh") or []:
            pc = x.get("p") or 0
            if pc < NGUONG_TAY: continue
            thoTen = khong_dau(x.get("n"))
            if any(t in thoTen for t in LOAI_TRU): continue
            tk = (x.get("t") or "").strip().upper()
            khoa = None
            for gid, _, _, tks in TU_KHOA:
                # KHỚP TRỌN TỪ, không khớp chuỗi con: "gelex" mà khớp kiểu chuỗi con thì
                # "Geleximco" (một tập đoàn hoàn toàn khác) cũng bị hút vào nhóm GELEX.
                if any(re.search(r"\b" + re.escape(tk2.strip()) + r"\b", thoTen) for tk2 in tks):
                    khoa = gid; break
            # CỔ ĐÔNG CÓ MÃ NIÊM YẾT THÌ GOM THEO MÃ, ĐỪNG GOM THEO TÊN. Nguồn đã dò sẵn
            # mã vào trường `t` mà bản cũ bỏ qua, chỉ băm tên ra làm khoá — nên một công ty
            # viết hai kiểu tên là đẻ ra hai nhóm rời. Sonadezi dính đúng vậy: TU_KHOA bắt
            # chữ "sonadezi", còn 8 công ty con lại ghi cổ đông là "Tổng Công ty Cổ phần
            # Phát triển Khu công nghiệp" (tên pháp lý, không có chữ nào là "sonadezi") →
            # nhóm "Sonadezi" 4 mã đứng cạnh một nhóm vô danh 11 mã, cùng một nhà.
            # Gom theo mã còn được thêm hai thứ: biết ngay mẹ có niêm yết (để trừ chồng lấn
            # vốn hoá) và lấy đúng tên công ty làm tên nhóm.
            if not khoa and tk in me_map: khoa = me_map[tk]      # mã mẹ của nhóm khai tay
            if not khoa and tk and tk in U and tk != sym and pc >= NGUONG: khoa = "ma:" + tk
            if not khoa:
                if pc < NGUONG: continue          # cổ đông lạ thì đòi ngưỡng cao hơn
                c = chuan(x.get("n"))
                if len(c) < 4: continue
                khoa = "auto:" + c
            nhom.setdefault(khoa, {})
            nhom[khoa][sym] = max(nhom[khoa].get(sym, 0), pc)
            ten_goc.setdefault(khoa, x.get("n") or "")
            if la_nha_nuoc(x.get("n")): la_nn[khoa] = True
            # gắn cờ PHÁP NHÂN nếu BẤT KỲ biến thể tên nào của nhóm có dấu hiệu doanh nghiệp.
            # Chấm theo từng tên rồi gán "cá nhân" ngay là hỏng: PVN vào nhóm qua cả "Tập đoàn
            # Dầu khí Việt Nam" lẫn "PVN" trơ trọi, chỉ cần một biến thể trống là cả tập đoàn
            # bị dán nhãn cá nhân.
            if khoa in ten_map or khoa.startswith("ma:") or any(t in thoTen for t in DAU_DN):
                la_dn[khoa] = True

    # MẸ NIÊM YẾT LUÔN LÀ HẠT GIỐNG của nhóm mình — gắn TRƯỚC vòng lan bên dưới, vì chính
    # danh sách công ty con CỦA MẸ mới là nguồn tìm ra cháu chắt. Không đợi có mã nào khai
    # tên mẹ trong danh sách cổ đông rồi mới mở nhóm: HPA không có nổi một dòng cổ đông
    # trong nguồn, nên nhóm Hoà Phát chẳng bao giờ mở, còn HPG thì rơi vào nhóm mang tên
    # "Tran Dinh Long" — đúng người nhưng chẳng ai gọi cái nhà đó bằng tên ấy.
    for gid, (ten, me) in ten_map.items():
        if me and me in U:
            nhom.setdefault(gid, {}).setdefault(me, None)
            la_dn[gid] = True
    for gid in [k for k in nhom if k.startswith("ma:")]:      # nhóm gom theo mã: mẹ là chính mã đó
        if gid[3:] in U: nhom[gid].setdefault(gid[3:], None)

    # CON CỦA CON: mã do một THÀNH VIÊN của nhóm nắm chi phối thì cũng thuộc nhóm đó. Lan
    # theo từng LỚP (mẹ -> con -> cháu -> chắt) chứ không quét lại cả kho mỗi vòng.
    #
    # % GHI RA LÀ % HIỆU DỤNG, nhân dồn dọc chuỗi. FPT nắm 45,7% FOX, FOX nắm 56,4% FOC —
    # ghi 56,4% cho FOC là nói dối: đó là phần của FOX chứ không phải của FPT. Nhân dồn ra
    # ~23-26%, khớp với con số 23,79% mà chính FPT khai. Mẹ tính là 100% của chính nó.
    thanh = {s: k for k, ds in nhom.items() for s in ds}    # đã có nhà thì không bị nhóm khác giành
    hieu = {(k, s): (p if p else 100.0) for k, ds in nhom.items() for s, p in ds.items()}
    gian_tiep = {}; canh_pc = {}
    canh = canh_so_huu(P, U)
    lop = list(hieu)
    for _ in range(3):
        sau = []
        # Nhóm KHAI TAY đi trước, rồi mới tới tỉ lệ hiệu dụng cao. Chỉ xếp theo tỉ lệ là
        # PRE rơi vào tay "HDI Global SE" (cổ đông ngoại nắm 38,9% PVI) thay vì về PVN —
        # đúng số nhưng sai nhà, vì HDI là cổ đông chiến lược chứ không phải chủ sở hữu.
        for k, cha in sorted(lop, key=lambda ks: (ks[0] not in ten_map, -hieu[ks])):
            tay = k in ten_map or k.startswith("ma:")   # có mã mẹ hẳn hoi -> tin như khai tay
            for con, (pc, lk) in sorted((canh.get(cha) or {}).items(), key=lambda kv: -kv[1][0]):
                # Nhóm KHAI TAY vẫn nhận được mã đã nằm trong một nhóm gom-theo-mã. PVI là
                # con của PVN mà bản thân cũng là mẹ của PRE — chặn cứng thì PRE ở lại nhóm
                # PVI còn PVN mất con, trong khi nó là con của cả hai theo đúng nghĩa đen.
                # Nhóm gom-theo-mã thì KHÔNG được giành ngược lại của nhóm khai tay.
                if con in thanh and not (tay and k in ten_map and thanh[con] not in ten_map):
                    continue
                if pc < (NGUONG_TAY if (tay and not lk) else NGUONG): continue
                hd = round(hieu[(k, cha)] * pc / 100, 1)
                if hd < NGUONG_HIEU: continue
                nhom[k][con] = hd
                hieu[(k, con)] = hd
                gian_tiep[(k, con)] = cha
                canh_pc[(k, con)] = pc            # % CHA nắm con (khác % hiệu dụng của cả nhóm)
                thanh[con] = k
                sau.append((k, con))
        if not sau: break
        lop = sau

    # NHÓM CÓ MẸ NIÊM YẾT THÌ ĐỌC THẲNG CỔ ĐÔNG CỦA CHÍNH MẸ, ĐỪNG KHAI TAY.
    # Vòng gom ở trên chỉ nhìn được cái tên đã DỰNG RA nhóm: nhóm "GAS" sinh ra từ cổ đông
    # "Tổng Công ty Khí Việt Nam" — cái tên đó không mang dấu hiệu nhà nước nào, nên nhóm
    # đứng trơ là "tập đoàn" dù GAS do PVN nắm 95,76%. Mẹ là mã niêm yết thì kho CÓ hồ sơ
    # của nó, mở ra là thấy ngay ai đứng trên. Nhờ lớp này mà GAS, BID, CTG, ACV, HVN, KSV,
    # BVH, GVR, VGT, SNZ tự có nhãn, không phải nhớ khai từng cái.
    # Đòi QUÁ BÁN: SCIC nắm 36% Vinamilk và 36% Sabeco, gọi hai nhà đó là doanh nghiệp nhà
    # nước là sai (Sabeco do ThaiBev nắm 53,6%).
    for khoa in nhom:
        if la_nn.get(khoa): continue
        me2 = ten_map.get(khoa, (None, None))[1] or (khoa[3:] if khoa.startswith("ma:") else None)
        if not me2: continue
        for x in (P.get(me2) or {}).get("sh") or []:
            if (x.get("p") or 0) >= NGUONG_CHI_PHOI and la_nha_nuoc(x.get("n")):
                la_nn[khoa] = True
                break

    ra = []
    for khoa, ds in nhom.items():
        if len(ds) < TOI_THIEU: continue
        ten, me = ten_map.get(khoa, (None, None))
        if not ten and khoa.startswith("ma:"):
            # nhóm gom theo MÃ: mẹ chính là mã đó, tên lấy từ universe cho gọn và chuẩn
            # Tên pháp lý dài lê thê ("Ngân hàng Thương mại Cổ phần Đầu tư và Phát triển
            # Việt Nam") mà cột tên lại hẹp -> cắt còn mẩu đầu thì nhóm nào cũng giống nhóm
            # nào. Dán MÃ lên trước: đó mới là thứ đọc một cái là biết nhà ai.
            me = khoa[3:]
            ten = me + " · " + re.sub(r"\s+", " ", ((U.get(me) or {}).get("name") or me).strip())
        if not ten:
            ten = re.sub(r"\s+", " ", (ten_goc.get(khoa) or "").strip())
        if len(ten) > 46: ten = ten[:45].rstrip() + "…"
        syms = sorted(ds.items(), key=lambda kv: -mcap(kv[0]))
        # VỐN HOÁ CẢ NHÓM. Cộng thô là đếm hai lần KHI MẸ CŨNG NIÊM YẾT: vốn hoá VIC đã
        # bao gồm 69% VHM mà VHM lại được cộng nguyên cục -> Vingroup phình lên 2,23 triệu
        # tỷ trong khi VIC chỉ có 1,70 triệu tỷ. Lúc đó mã con chỉ tính PHẦN NGOÀI NHÓM.
        # NHƯNG mẹ KHÔNG niêm yết (PVN, Viettel, EVN, TKV) thì chẳng có gì bị đếm hai lần —
        # trừ đi là tự tay xoá phần lớn nhóm: PVN từ 474 nghìn tỷ tụt còn 90.
        # Mã tới được QUA MỘT THÀNH VIÊN KHÁC thì phần cha nắm đã nằm sẵn trong vốn hoá của
        # cha (cha luôn là mã niêm yết) -> chỉ tính PHẦN NGOÀI. Trước chỉ xử được tầng mẹ,
        # nay có cả cháu chắt nên không xử là đếm hai lần: vốn hoá GAS đã gồm 35% PGS.
        co_me = (me in U) if me else False
        def ngoai(s, p):
            cha = gian_tiep.get((khoa, s))
            if cha: return max(0.0, 1 - min(canh_pc.get((khoa, s), 0), 100) / 100)
            return max(0.0, 1 - min(p, 100) / 100) if (co_me and p) else 1.0
        von = sum(mcap(s) * ngoai(s, p) for s, p in syms)
        sy = []
        for s, p in syms:
            o = {"s": s, "p": (round(p, 1) if p else None)}
            cha = gian_tiep.get((khoa, s))
            if cha:
                o["gt"] = 1                       # nắm gián tiếp, không đứng tên trực tiếp
                if cha != me: o["qua"] = cha      # "qua chính mẹ" thì khỏi ghi, thừa
            sy.append(o)
        ra.append({
            "id": khoa.replace("auto:", "a-").replace("ma:", "m-").replace(" ", "-")[:40],
            "ten": ten, "me": me if me in U else None,
            "kieu": "nn" if la_nn.get(khoa) else ("tt" if la_dn.get(khoa) else "cn"),
            "mcap": round(von / 1e9),
            "mcapTho": round(sum(mcap(s) for s, _ in syms) / 1e9),
            "syms": sy,
        })
    ra.sort(key=lambda g: -g["mcap"])
    json.dump({"generated": datetime.date.today().isoformat(), "nhom": ra},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    dem = {k: sum(1 for g in ra if g["kieu"] == k) for k in ("tt", "nn", "cn")}
    # ĐẾM RIÊNG BA LOẠI. Dòng cũ ghi "{tt} tập đoàn, {còn lại} nhà nước/cơ quan" nên gộp
    # luôn nhóm do CÁ NHÂN chi phối vào cột nhà nước — đọc log là tưởng nhà nước nhiều gấp
    # đôi thực tế.
    print(f"✓ data/tapdoan.json: {len(ra)} nhóm ({dem['tt']} tập đoàn tư nhân, "
          f"{dem['nn']} nhà nước, {dem['cn']} cá nhân chi phối)"
          f" · {sum(len(g['syms']) for g in ra)} lượt mã")
    for g in ra[:16]:
        print(f"  {g['mcap']/1e3:8,.0f} nt · {len(g['syms']):2d} mã · [{g['kieu']}] {g['ten'][:34]:34s} "
              + ", ".join(x["s"] for x in g["syms"][:8]))


if __name__ == "__main__":
    main()
