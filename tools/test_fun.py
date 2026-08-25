#!/usr/bin/env python3
"""
KIỂM CHỈ SỐ GIẢ ĐỊNH của tools/kho_fun.py — chạy trước mỗi lần đẩy nếu có đụng vào đó.

    python3 tools/test_fun.py

VÌ SAO PHẢI CÓ: đây là một con số KHÔNG CÓ NGUỒN NÀO ĐỂ ĐỐI CHIẾU. Chỉ số thật thì sai một
cái là thấy ngay vì HOSE công bố; chỉ số giả định thì sai kiểu gì cũng vẫn vẽ ra một đường
mượt mà, dốc lên dốc xuống rất thuyết phục. Ba lớp khoá dưới đây:

  ① ĐẲNG THỨC — bơm số giả mà biết trước đáp án, ép công thức phải trả đúng đáp án đó.
  ② NHÂN QUẢ — thêm phiên mới không được làm đổi một giá trị đã tính.
  ③ ĐỐI CHIẾU HAI ĐƯỜNG ĐỘC LẬP — "phần còn lại của sàn" tính bằng cách BÓC khỏi chỉ số
     thật phải khớp với cách DỰNG LẠI từ 405 mã HOSE. Hai đường chỉ dùng chung kho vốn hoá,
     nên khớp là bằng chứng thật, không phải tự khen.
"""
import sys, os, json, glob, math

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kho_fun as F

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dat = hong = 0


def kiem(ten, thuc, mong):
    global dat, hong
    ok = thuc == mong
    dat += ok; hong += not ok
    print('  %s %s%s' % ('✓' if ok else '✗', ten,
                         '' if ok else '\n      mong: %r\n      thực: %r' % (mong, thuc)))


def gan(ten, thuc, mong, eps):
    global dat, hong
    ok = abs(thuc - mong) <= eps
    dat += ok; hong += not ok
    print('  %s %s%s' % ('✓' if ok else '✗', ten,
                         '' if ok else '\n      mong: %r ±%g\n      thực: %r' % (mong, eps, thuc)))


NG = ['2020-01-%02d' % i for i in range(1, 21)]


def dung(rV, rH=None, capV=100000.0, capH=None, capR=900000.0, rR=0.01, tuH=None):
    """Dựng một thị trường giả: 'phần còn lại' vốn hoá capR lợi suất rR mỗi phiên, VIC vốn
       hoá capV lợi suất rV, VHM (nếu có) capH lợi suất rH và chỉ xuất hiện từ ngày `tuH`.
       Chỉ số thật được tính ĐÚNG theo định nghĩa bình quân gia quyền, nên đáp án biết trước."""
    IX, tong, rieng, gia = {}, {}, {'VIC': {}, 'VHM': {}}, {'VIC': {}, 'VHM': {}}
    ix, pV, pH, cR, cV, cH = 1000.0, 100.0, 100.0, capR, capV, (capH or 0.0)
    for d in NG:
        coH = tuH is not None and d >= tuH
        tong[d] = cR + cV + (cH if coH else 0.0)
        rieng['VIC'][d] = cV; gia['VIC'][d] = pV
        if coH:
            rieng['VHM'][d] = cH; gia['VHM'][d] = pH
        IX[d] = ix
        # bước sang phiên sau: chỉ số = bình quân gia quyền của đúng ba cấu phần trên
        w = tong[d]
        gop = cR * rR + cV * rV + ((cH * rH) if (coH and rH is not None) else 0.0)
        ix *= 1 + gop / w
        cR *= 1 + rR; cV *= 1 + rV; pV *= 1 + rV
        if coH and rH is not None:
            cH *= 1 + rH; pH *= 1 + rH
    return IX, tong, rieng, gia


print('\n── ① ĐẲNG THỨC: bơm số biết trước đáp án ─────────────────────────────')
# Ghim ĐÚNG BẰNG vốn hoá thật, mà mã cũng đứng yên -> giả định trùng khít chỉ số thật.
IX, tong, rieng, gia = dung(rV=0.0)
ds, cs, gs, ws, bq = F.tinh(NG, IX, tong, rieng, gia, ghim=100000.0, ma=('VIC',))
kiem('ghim = vốn hoá thật, mã đứng yên -> trùng khít chỉ số thật',
     [round(v, 2) for v in gs], cs)

# VIC tăng 2%/phiên, phần còn lại 1%/phiên. Ghim VIC -> chỉ số giả định phải chạy đúng
# r_conlai · capR/(capR+ghim) mỗi phiên. TỈ TRỌNG ĐỔI TỪNG PHIÊN vì phần còn lại vẫn lớn lên
# trong khi 200.000 tỷ đứng yên — nên đáp án phải tính bằng vòng lặp, đừng luỹ thừa một
# hằng số (bẫy đã dính: ra 1.167,45 trong khi đúng là 1.170,27).
IX, tong, rieng, gia = dung(rV=0.02, rR=0.01)
ds, cs, gs, ws, bq = F.tinh(NG, IX, tong, rieng, gia, ghim=200000.0, ma=('VIC',))
mong, cR = 1000.0, 900000.0
for _ in range(len(NG) - 1):
    mong *= 1 + 0.01 * cR / (cR + 200000.0)
    cR *= 1.01
gan('bóc VIC ra rồi ghim 200k -> đúng lợi suất pha loãng', gs[-1], round(mong, 2), 0.02)
kiem('chỉ số thật vẫn được chép nguyên', cs[0], 1000.0)
kiem('không phiên nào bị bỏ qua', bq, 0)

# Phần còn lại ĐI XUỐNG trong khi VIC đi lên. Muốn chỉ số THẬT vẫn tăng thì phần VIC kéo lên
# phải lớn hơn phần kia kéo xuống: 400.000×3% = 12.000 so với 600.000×0,5% = 3.000.
# (Bộ số cũ 100.000/900.000 cho chỉ số thật GIẢM — ca kiểm khi đó tự mâu thuẫn.)
IX, tong, rieng, gia = dung(rV=0.03, rR=-0.005, capV=400000.0, capR=600000.0)
ds, cs, gs, ws, bq = F.tinh(NG, IX, tong, rieng, gia, ghim=200000.0, ma=('VIC',))
kiem('phần còn lại giảm -> bản ghim phải giảm', gs[-1] < gs[0], True)
kiem('… trong khi chỉ số thật vẫn tăng', cs[-1] > cs[0], True)

print('\n── ② MÃ THỨ HAI CHỈ TÍNH TỪ NGÀY LÊN SÀN ─────────────────────────────')
IX, tong, rieng, gia = dung(rV=0.02, rH=0.02, capH=300000.0, tuH='2020-01-11')
ds, cs, gs, ws, bq = F.tinh(NG, IX, tong, rieng, gia, ghim=200000.0)
kiem('trước ngày lên sàn: tỉ trọng chỉ của một mã',
     ws[0], round(100 * 100000.0 / 1000000.0, 3))
kiem('từ ngày lên sàn: tỉ trọng gộp cả hai mã', ws[NG.index('2020-01-11')] > ws[NG.index('2020-01-10')], True)
# Tỉ trọng phải là của CHÍNH ngày đó, không phải phiên trước (bẫy lệch một phiên).
i = NG.index('2020-01-05')
kiem('tỉ trọng ghi theo ĐÚNG ngày đó, không lệch một phiên',
     ws[i], round(100 * sum(rieng[m].get(NG[i], 0.0) for m in ('VIC', 'VHM')) / tong[NG[i]], 3))

print('\n── ③ NHÂN QUẢ: thêm phiên mới không sửa quá khứ ──────────────────────')
IX, tong, rieng, gia = dung(rV=0.02, rH=-0.01, capH=300000.0, tuH='2020-01-06')
a = F.tinh(NG[:12], IX, tong, rieng, gia)
b = F.tinh(NG, IX, tong, rieng, gia)
kiem('12 phiên đầu giữ nguyên khi nối thêm 8 phiên', a[2], b[2][:12])
kiem('… tỉ trọng cũng giữ nguyên', a[3], b[3][:12])

print('\n── ④ NEO LẠI Ở MỐC KHÁC LÀ PHÉP ĐÚNG, KHÔNG PHẢI XẤP XỈ ──────────────')
# Trang xem neo lại bằng g[i]/g[T]·c[T]. Phải bằng đúng việc chạy lại từ phiên T.
T = 7
lai = F.tinh(NG[T:], IX, tong, rieng, gia)
for k in (0, 5, len(NG) - T - 1):
    gan('neo lại ở phiên %d: khớp bản chạy lại (phần tử %d)' % (T, k),
        b[2][T + k] / b[2][T] * b[1][T], lai[2][k], 0.02)

print('\n── ⑤ CHẶN SỐ VÔ LÝ ───────────────────────────────────────────────────')
IX, tong, rieng, gia = dung(rV=0.02, capV=100000.0, capR=100.0)   # VIC chiếm 99,9% sàn
ds, cs, gs, ws, bq = F.tinh(NG, IX, tong, rieng, gia, ghim=200000.0, ma=('VIC',))
kiem('tỉ trọng ≥99% -> giữ nguyên mức, đếm vào "bỏ qua"', bq, len(NG) - 1)
kiem('… và mức không nhảy lung tung', gs[-1], gs[0])

print('\n── ⑥ FILE ĐÃ SINH: hình dạng và tính nhất quán ───────────────────────')
P = os.path.join(BASE, 'data', 'fun.json')
if not os.path.exists(P):
    print('  ✗ chưa có data/fun.json — chạy `python3 tools/kho_fun.py` trước')
    hong += 1
else:
    R = json.load(open(P, encoding='utf-8'))
    n = len(R['d'])
    kiem('bốn mảng cùng độ dài', (len(R['c']), len(R['g']), len(R['w'])), (n, n, n))
    kiem('ngày tăng dần, không trùng', all(R['d'][i] < R['d'][i + 1] for i in range(n - 1)), True)
    kiem('không có mức nào ≤0 hoặc không phải số',
         all(isinstance(v, (int, float)) and v > 0 and not math.isnan(v) for v in R['g']), True)
    kiem('mã bị ghim đúng như tài liệu', (R['ma'], R['ghim']), (['VIC', 'VHM'], 200000.0))

    ix = json.load(open(os.path.join(BASE, 'data', 'chiso', 'VNINDEX.json'), encoding='utf-8'))
    IXr = dict(zip(ix['d'], ix['c']))
    lech = [d for d, c in zip(R['d'], R['c']) if round(IXr.get(d, -1), 2) != c]
    kiem('cột chỉ số thật chép ĐÚNG data/chiso/VNINDEX.json', lech, [])

    tongR, riengR, _ = F.doc_vonhoa()
    saiW = [d for d, w in zip(R['d'], R['w'])
            if abs(w - round(100 * sum(riengR[m].get(d, 0.0) for m in F.MA) / tongR[d], 3)) > 1e-6]
    kiem('tỉ trọng VIC+VHM dựng lại được từ kho vốn hoá', saiW, [])
    i18 = R['d'].index('2018-05-16')
    kiem('trước 17/05/2018 tỉ trọng chỉ gồm VIC',
         abs(R['w'][i18] - round(100 * riengR['VIC']['2018-05-16'] / tongR['2018-05-16'], 3)) < 1e-6, True)

    print('\n── ⑦ ĐỐI CHIẾU HAI ĐƯỜNG ĐỘC LẬP (chậm ~10 giây) ─────────────────────')
    # A: dựng lại "phần còn lại" TỪ 405 MÃ.  B: bóc ngược ra từ chính chuỗi vừa sinh.
    GIA = {}
    for f in glob.glob(os.path.join(BASE, 'data', 'vonhoa', '*.json')):
        s = os.path.basename(f)[:-5]
        g = F.doc_gia(s)
        if g:
            GIA[s] = g
    CAP = {}
    for f in glob.glob(os.path.join(BASE, 'data', 'vonhoa', '*.json')):
        d = json.load(open(f, encoding='utf-8'))
        s = d.get('sym') or os.path.basename(f)[:-5]
        CAP[s] = {dd: vv for dd, vv in zip(d['d'], d['v']) if vv and vv > 0}
    dsR = R['d']
    lechs = []
    for k in range(1, len(dsR)):
        a_, b_ = dsR[k - 1], dsR[k]
        vhV = sum(riengR[m].get(a_, 0.0) for m in F.MA)
        dang = sum(1 for m in F.MA if riengR[m].get(a_))
        capR_ = tongR[a_] - vhV
        if capR_ <= 0 or not dang:
            continue
        rB = (R['g'][k] / R['g'][k - 1] - 1) * (capR_ + R['ghim'] * dang) / capR_
        num = den = 0.0
        for s, cap in CAP.items():
            if s in F.MA:
                continue
            ca = cap.get(a_)
            g = GIA.get(s)
            if not ca or not g:
                continue
            pa, pb = g.get(a_), g.get(b_)
            den += ca
            if pa and pb:
                num += ca * (pb / pa - 1)
        if den <= 0:
            continue
        lechs.append(abs(num / den - rB))
    tb = sum(lechs) / len(lechs)
    p99 = sorted(lechs)[int(0.99 * len(lechs))]
    print('    %d phiên · trung bình |lệch| = %.4f%% · p99 = %.3f%% · max = %.3f%%'
          % (len(lechs), 100 * tb, 100 * p99, 100 * max(lechs)))
    kiem('hai đường khớp: trung bình lệch < 0,15%/phiên', tb < 0.0015, True)
    kiem('hai đường khớp: p99 < 0,6%/phiên', p99 < 0.006, True)

print('\n' + '─' * 62 + '\n  ĐẠT %d · HỎNG %d\n' % (dat, hong))
sys.exit(1 if hong else 0)
