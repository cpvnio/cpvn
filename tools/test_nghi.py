#!/usr/bin/env python3
"""
KIỂM LOGIC NGÀY NGHỈ của tools/gia_phien.py — chạy trước mỗi lần đẩy nếu có đụng vào đó.

    python3 tools/test_nghi.py

VÌ SAO PHẢI CÓ: nhánh này quyết định TẮT hẳn việc cào giá cho cả ngày. Sai theo hướng
"kết luận nghỉ nhầm" là mất giá suốt một phiên THẬT, mà im lặng — không có lỗi nào báo,
không có gì trên trang cho biết, chỉ là số đứng im.

Bản đầu đã sai đúng kiểu đó: lập luận "dang_song đòi >= 50 dòng nên lượt hỏng không tới
được nhánh đóng dấu". Nhưng nhận 30 dòng (9/11 lô hỏng) thì dang_song CŨNG trả False, nên
vẫn rơi vào nhánh ấy. Một cú chớp mạng lúc 9:30 là tắt giá cả ngày.
"""
import sys, os, io, datetime, contextlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gia_phien as G

VNTZ = G.VNTZ
dat = lambda h, m, d=18: datetime.datetime(2026, 8, d, h, m, tzinfo=VNTZ)
don = lambda: os.path.exists(G.NGHI) and os.remove(G.NGHI)
TRONG = lambda n: [{"sym": f"M{i}", "lastPrice": 0, "lot": 0} for i in range(n)]
SONG = lambda n: [{"sym": f"M{i}", "lastPrice": 10, "lot": 5} for i in range(n)]

CA = [
    # tên,                                        rows,        lô hỏng, giờ,      mong đợi
    ("9:05 trống, quét đủ sạch  -> chưa kết luận", TRONG(1500), 0, (9, 5),   False),
    ("9:35 trống, quét đủ sạch  -> KẾT LUẬN NGHỈ", TRONG(1500), 0, (9, 35),  True),
    ("30 dòng, 9 lô hỏng        -> KHÔNG kết luận", TRONG(30),  9, (10, 30), False),
    ("900 dòng, 2 lô hỏng       -> KHÔNG kết luận", TRONG(900), 2, (10, 30), False),
    ("1500 dòng, 1 lô hỏng      -> KHÔNG kết luận", TRONG(1500),1, (10, 30), False),
    ("bảng SỐNG                 -> KHÔNG kết luận", SONG(1500), 0, (11, 0),  False),
]

if __name__ == "__main__":
    G.KHONG_DAY = True                       # không commit, không push
    dat_g, hong_g = 0, 0
    # giữ hai file dữ liệu thật, vì main() có thể ghi đè khi bảng "sống"
    giu = {p: open(p, "rb").read() if os.path.exists(p) else None for p in (G.RA, G.RA_NONG)}
    for ten, rows, hong, gio, mong in CA:
        don()
        G.cao = lambda syms=None, r=rows, h=hong: (r, [], h)
        G.gio_vn = lambda g=gio: dat(*g)
        with contextlib.redirect_stdout(io.StringIO()):
            G.main()
        thuc = G.da_biet_nghi(dat(*gio))
        ok = thuc == mong
        dat_g += ok; hong_g += not ok
        print(f"  {'✓' if ok else '✗'} {ten}" + ("" if ok else f"   mong {mong}, thực {thuc}"))
    don()
    for p, b in giu.items():                 # trả lại nguyên trạng
        if b is not None: open(p, "wb").write(b)
    print(f"\n  ĐẠT {dat_g} · HỎNG {hong_g}\n")
    sys.exit(1 if hong_g else 0)
