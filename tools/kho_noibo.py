# -*- coding: utf-8 -*-
"""GIAO DỊCH CỦA NGƯỜI NỘI BỘ -> `data/noibo.json`. Đọc `data/news`, KHÔNG gọi mạng.

VÌ SAO CÓ FILE NÀY (21/08/2026)
------------------------------
Ghép với phép quét thoả thuận thì đây là mảnh còn thiếu: kho đã thấy được *"TID sang tay
ba lô ~230 tỷ trong hai tuần, đều ở −26% so với giá sàn"* nhưng không biết **ai** bán.
Công bố của người nội bộ trả lời đúng câu đó.

NGUỒN LÀ TIÊU ĐỀ CBTT CỦA HOSE/HNX đã nằm sẵn trong `data/news` — dạng rất chuẩn:

    DKG: Đặng Đức Minh - Chủ tịch HĐQT - đã bán 1.375.000 CP
    SDK: Ngô Thế Hiển - Thành viên BKS - đăng ký bán 78.480 CP
    BHK: Vũ Văn Tiến - người có liên quan đến Phó Giám đốc; Ủy viên HĐQT - đã mua 85.105 CP

Mã · người · CHỨC VỤ · chiều · số lượng, đủ cả. Không gọi mạng lượt nào.

VỀ DỮ LIỆU CÁ NHÂN — VÌ SAO GIỮ ĐƯỢC TÊN Ở ĐÂY
----------------------------------------------
CLAUDE.md đặt luật lọc cổ đông cá nhân dưới 5% khỏi `data/profile`, vì lập luận bảo vệ
*"đã công khai theo nghĩa vụ pháp luật"* chỉ áp cho cổ đông lớn ≥5%. Mục này KHÁC:
**người nội bộ và người có liên quan phải công bố giao dịch BẤT KỂ TỈ LỆ** (Điều 127
Luật CK 2019, Thông tư 96/2020), nên họ luôn nằm trong diện đã công khai.

Và CHÍNH CHỨC VỤ trong tiêu đề là thứ chứng minh nghĩa vụ đó — đúng cái mà CLAUDE.md ghi
là *"giới hạn đã biết: nguồn Simplize không trả trường chức vụ"*. Nguồn này có.
**Bản ghi nào không đọc ra chức vụ thì BỎ**, đừng giữ lại "cho đủ": không có chức vụ thì
không chứng minh được nghĩa vụ công bố, và đó đúng là ranh giới.

PHẢI GOM DỒN, KHÔNG ĐƯỢC GHI ĐÈ
-------------------------------
`data/news` chỉ giữ tin **trong 30 ngày** (ba cổng lọc, xem CLAUDE.md). Ghi đè là mỗi
lượt chạy xoá sạch phần cũ và kho vĩnh viễn đứng ở 30 ngày. Khoá gom là
`(mã, ngày, chiều, số lượng, tên)` — cùng một công bố xuất hiện lại ở lượt sau thì trùng
khoá, không đẻ bản ghi mới.

  python3 tools/kho_noibo.py
  python3 tools/kho_noibo.py --thu     # in ra, không ghi
"""
import json
import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEWS = os.path.join(BASE, "data", "news")
RA = os.path.join(BASE, "data", "noibo.json")
THU = "--thu" in sys.argv

# "MÃ: <Tên> - <Chức vụ> - đã bán 1.375.000 CP"
RE_GD = re.compile(
    r"^([A-Z0-9]{3}):\s*(.+?)\s*-\s*(.+?)\s*-\s*"
    r"(đã|đăng ký)\s+(mua|bán)\s+([\d.,]+)\s*CP",
    re.I)


def so(t):
    """'1.375.000' -> 1375000. Nguồn dùng DẤU CHẤM ngăn hàng nghìn, kiểu Việt Nam."""
    t = t.strip().replace(".", "").replace(",", "")
    return int(t) if t.isdigit() else None


def main():
    cu = {}
    if os.path.exists(RA):
        try:
            cu = {r["k"]: r for r in json.load(open(RA, encoding="utf-8")).get("gd", [])}
        except Exception:
            cu = {}
    truoc = len(cu)

    moi = 0
    for f in sorted(os.listdir(NEWS)):
        if not f.endswith(".json"):
            continue
        try:
            o = json.load(open(os.path.join(NEWS, f), encoding="utf-8"))
        except Exception:
            continue
        for t in o.get("news") or []:
            ti = (t.get("title") or "").strip()
            m = RE_GD.match(ti)
            if not m:
                continue
            sym, ten, chuc, trang_thai, chieu, sl = m.groups()
            n = so(sl)
            if not n:
                continue
            # KHÔNG CÓ CHỨC VỤ THÌ BỎ — xem phần dữ liệu cá nhân ở đầu file.
            chuc = chuc.strip()
            if len(chuc) < 3 or len(chuc) > 160:
                continue
            ts = t.get("ts")
            ngay = None
            if ts:
                import datetime
                ngay = datetime.datetime.fromtimestamp(
                    ts / 1000, datetime.timezone(datetime.timedelta(hours=7))
                ).strftime("%Y-%m-%d")
            k = "|".join([sym, ngay or "?", chieu.lower(),
                          str(n), ten.strip()[:40]])
            if k in cu:
                continue
            cu[k] = {"k": k, "sym": sym, "d": ngay, "ten": ten.strip(),
                     "chuc": chuc, "xong": trang_thai.lower() == "đã",
                     "chieu": chieu.lower(), "sl": n,
                     "lq": bool(re.search(r"người có liên quan", chuc, re.I)),
                     "url": t.get("url")}
            moi += 1

    gd = sorted(cu.values(), key=lambda r: (r["d"] or "", r["sym"]))
    out = {"n": len(gd), "gd": gd}
    if not THU:
        tmp = RA + ".tmp"
        json.dump(out, open(tmp, "w", encoding="utf-8"), ensure_ascii=False,
                  separators=(",", ":"))
        os.replace(tmp, RA)

    xong = [r for r in gd if r["xong"]]
    ban = [r for r in xong if r["chieu"] == "bán"]
    mua = [r for r in xong if r["chieu"] == "mua"]
    print("GIAO DỊCH NGƯỜI NỘI BỘ: {:,} bản ghi (+{:,} mới lượt này, kho trước {:,})".format(
        len(gd), moi, truoc))
    print("  đã thực hiện: {:,}  (mua {:,} · bán {:,})  · đăng ký: {:,}".format(
        len(xong), len(mua), len(ban), len(gd) - len(xong)))
    if gd:
        print("  khoảng ngày: {} -> {}".format(gd[0]["d"], gd[-1]["d"]))
    for r in sorted(xong, key=lambda r: -r["sl"])[:6]:
        print("    {:<5s} {} {:<22s} {:<34s} {} {:,} CP".format(
            r["sym"], r["d"] or "?", r["ten"][:22], r["chuc"][:34], r["chieu"], r["sl"]))
    if THU:
        print("  (--thu: KHÔNG ghi file)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
