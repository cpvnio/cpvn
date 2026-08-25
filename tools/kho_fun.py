#!/usr/bin/env python3
"""
kho_fun.py — CHỈ SỐ GIẢ ĐỊNH: VN-Index nếu vốn hoá VIC và VHM CỐ ĐỊNH ở 200.000 tỷ.

Sinh `data/fun.json` cho trang ẩn `/fun`. Không có đường dẫn nào trên web trỏ tới nó.

╔══════════════════════════════════════════════════════════════════════════════════════╗
║ CÁCH TÍNH — BÓC KHỎI CHỈ SỐ THẬT, KHÔNG DỰNG LẠI CHỈ SỐ TỪ ĐẦU                       ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
VN-Index là chỉ số bình quân gia quyền vốn hoá, nên lợi suất một phiên của nó tách được:

    r_chiso = Σ w_i · r_i          (w = tỉ trọng vốn hoá phiên trước, r = lợi suất giá ĐC)

Từ đó bóc riêng phần "cả sàn trừ VIC và VHM":

    r_conlai = (r_chiso − w_VIC·r_VIC − w_VHM·r_VHM) / (1 − w_VIC − w_VHM)

rồi ghép lại với hai mã ấy ở trạng thái GIẢ ĐỊNH — vốn hoá đóng đinh 200.000 tỷ mỗi mã.
Vốn hoá cố định thì theo định nghĩa lợi suất của chúng bằng 0, nên:

    r_gia_dinh = r_conlai · vh_conlai / (vh_conlai + 400.000)

VÌ SAO BÓC CHỨ KHÔNG DỰNG LẠI. Dựng lại cả chỉ số từ 405 mã HOSE thì mọi sai số của kho
(35 mã đã huỷ niêm yết không còn trong kho, phiên thiếu giá, vốn hoá suy ngược) đi thẳng
vào KẾT QUẢ. Bóc thì phần "cả sàn trừ hai mã" neo vào chính chỉ số HOSE công bố, sai số
của kho chỉ còn ảnh hưởng tới TRỌNG SỐ — bậc hai, nhỏ hơn hẳn.

ĐÃ ĐỐI CHIẾU HAI ĐƯỜNG ĐỘC LẬP (25/08/2026, 3.400 phiên 2013→2026):
  · dựng lại cả chỉ số từ 405 mã  vs  chỉ số HOSE thật:
        trung bình |lệch| ngày = 0,070% · p99 0,375% · max 0,805% · tương quan 0,9960
  · "phần còn lại" tính theo hai đường (dựng lại từ mã ↔ bóc khỏi chỉ số):
        trung bình |lệch| ngày = 0,079% · tương quan 0,9951
Hai đường không dùng chung một phép tính nào ngoài kho vốn hoá, nên khớp tới mức đó là
đủ để tin cả hai. Bản này dùng đường BÓC.

CHUỖI GHI RA LÀ CHUỖI LỢI SUẤT GHÉP, NEO Ở PHIÊN ĐẦU. Trang xem tự neo lại ở mốc nào cũng
được bằng `g[i]/g[T]·c[T]` — đúng bằng việc ghép r_gia_dinh từ phiên T với mức xuất phát
c[T], không phải xấp xỉ. Nên KHÔNG ghi nhiều bản neo sẵn.

VHM CHỈ TÍNH TỪ NGÀY LÊN SÀN (17/05/2018). Trước đó nó không tồn tại, đóng đinh vốn hoá
cho một mã chưa niêm yết là bịa ra một cấu phần không có thật.

> LƯU Ý ĐỌC SỐ: trước 20/11/2017 vốn hoá VIC còn DƯỚI 200.000 tỷ (2013 chỉ 56.000 tỷ), nên
> ở quãng đó giả định "cố định 200.000 tỷ" làm VIC TO HƠN thực tế và kéo chỉ số giả định
> xuống. Đó là hệ quả đúng của giả định, không phải lỗi — nhưng vì thế trang xem neo mặc
> định ở 17/05/2018, mốc đầu tiên mà cả hai mã đều đã vượt 200.000 tỷ.

Chạy:  python3 tools/kho_fun.py
Phụ thuộc (phải chạy TRƯỚC): tools/kho_vonhoa.py --san HOSE · tools/kho_giaodich.py --chiso
"""
import json, os, glob, time, datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VONHOA = os.path.join(BASE, 'data', 'vonhoa')
HIST   = os.path.join(BASE, 'data', 'hist')
CHISO  = os.path.join(BASE, 'data', 'chiso', 'VNINDEX.json')
RA     = os.path.join(BASE, 'data', 'fun.json')

GHIM  = 200000.0                 # tỷ đồng, mỗi mã
MA    = ('VIC', 'VHM')
NGAY0 = '2013-01-02'             # đáy kho vốn hoá
VNTZ  = datetime.timezone(datetime.timedelta(hours=7))


def ngay_cua(t):
    """Unix -> 'YYYY-MM-DD' giờ VN. Sao y build_screen.py để hai bên không lệch một phiên."""
    return time.strftime('%Y-%m-%d', time.gmtime(t + 25200))


def doc_vonhoa():
    """{ngày: tổng vốn hoá HOSE} + {mã: {ngày: vốn hoá}} cho riêng hai mã bị ghim."""
    tong, rieng = {}, {m: {} for m in MA}
    n = 0
    for f in glob.glob(os.path.join(VONHOA, '*.json')):
        d = json.load(open(f, encoding='utf-8'))
        sym = d.get('sym') or os.path.basename(f)[:-5]
        n += 1
        goc = rieng.get(sym)
        for dd, vv in zip(d.get('d') or [], d.get('v') or []):
            if not vv or vv <= 0:
                continue
            tong[dd] = tong.get(dd, 0.0) + vv
            if goc is not None:
                goc[dd] = vv
    return tong, rieng, n


def doc_gia(sym):
    """{ngày: giá ĐÃ ĐIỀU CHỈNH}. Phải là giá điều chỉnh: chỉ số hấp thụ mọi sự kiện quyền
       vào ước số, nên phần đóng góp của một mã là lợi suất ĐÃ hạ nền, không phải giá thô."""
    p = os.path.join(HIST, '%s.json' % sym)
    if not os.path.exists(p):
        return {}
    d = json.load(open(p, encoding='utf-8'))
    return {ngay_cua(t): c for t, c in zip(d.get('t') or [], d.get('c') or []) if c and c > 0}


def tinh(phien, IX, tong, rieng, gia, ghim=GHIM, ma=MA):
    """Lõi tính, KHÔNG đụng đĩa — để bộ kiểm thử bơm số giả vào được.

    phien: danh sách ngày đã sắp xếp · IX: {ngày: điểm chỉ số}
    tong:  {ngày: tổng vốn hoá sàn} · rieng: {mã: {ngày: vốn hoá}} · gia: {mã: {ngày: giá ĐC}}
    Trả (ds, cs, gs, ws, bo_qua). `gs` neo ở phiên đầu; `ws` là tỉ trọng TẠI ngày đó (%).

    NHÂN QUẢ: mỗi phiên chỉ đọc chính nó và phiên liền trước. Thêm phiên mới vào cuối chuỗi
    không được làm đổi một giá trị nào đã tính — `test_fun.py` khoá tính chất này.
    """
    ds, cs, gs, ws = [], [], [], []
    if len(phien) < 2:
        return ds, cs, gs, ws, 0

    def tit(d):                              # tỉ trọng hai mã bị ghim TẠI ngày d, đơn vị %
        t = tong.get(d) or 0.0
        if t <= 0: return 0.0
        return round(100.0 * sum(rieng[m].get(d, 0.0) for m in ma) / t, 3)

    muc = IX[phien[0]]                       # neo ở phiên đầu; trang xem tự neo lại
    ds.append(phien[0]); cs.append(round(IX[phien[0]], 2))
    gs.append(round(muc, 2)); ws.append(tit(phien[0]))

    a, bo_qua = phien[0], 0
    for b in phien[1:]:
        r_ix = IX[b] / IX[a] - 1.0
        vh_tong = tong.get(a) or 0.0
        gop_v, vh_v, dang = 0.0, 0.0, 0      # đóng góp · vốn hoá · số mã đang niêm yết
        for m in ma:
            ca = rieng[m].get(a)
            if not ca:
                continue                     # chưa lên sàn (VHM trước 17/05/2018)
            vh_v += ca; dang += 1
            pa, pb = gia[m].get(a), gia[m].get(b)
            if pa and pb:
                gop_v += ca * (pb / pa - 1.0)
        w = (vh_v / vh_tong) if vh_tong > 0 else 0.0
        if not (0.0 <= w < 0.99):            # số vô lý -> giữ nguyên mức, đừng bịa
            bo_qua += 1
            r_gd = 0.0
        else:
            r_conlai = (r_ix - gop_v / vh_tong) / (1.0 - w) if vh_tong > 0 else 0.0
            vh_conlai = vh_tong - vh_v
            r_gd = (r_conlai * vh_conlai / (vh_conlai + ghim * dang)) if dang else r_conlai
        muc *= (1.0 + r_gd)
        ds.append(b); cs.append(round(IX[b], 2)); gs.append(round(muc, 2)); ws.append(tit(b))
        a = b
    return ds, cs, gs, ws, bo_qua


def main():
    tong, rieng, so_ma = doc_vonhoa()
    gia = {m: doc_gia(m) for m in MA}
    for m in MA:
        if not rieng[m] or not gia[m]:
            raise SystemExit('THIẾU DỮ LIỆU cho %s — chạy kho_vonhoa.py và refresh_daily.py trước' % m)

    ix = json.load(open(CHISO, encoding='utf-8'))
    IX = dict(zip(ix['d'], ix['c']))
    phien = [d for d in ix['d'] if d >= NGAY0 and d in tong]
    ds, cs, gs, ws, bo_qua = tinh(phien, IX, tong, rieng, gia)
    if len(ds) < 2:
        raise SystemExit('KHÔNG ĐỦ PHIÊN — kho chỉ số hoặc kho vốn hoá chưa sẵn sàng')

    cuoi = ds[-1]
    nay = {m: round(rieng[m].get(cuoi, 0.0)) for m in MA}
    ra = {
        'generated': datetime.datetime.now(VNTZ).strftime('%Y-%m-%d %H:%M'),
        'ghim': GHIM, 'ma': list(MA), 'neoMac': '2018-05-17',
        'soMa': so_ma, 'vhSan': round(tong[cuoi]),
        'nay': nay,
        'd': ds, 'c': cs, 'g': gs, 'w': ws,
    }
    tmp = RA + '.tmp'
    json.dump(ra, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, RA)

    T = ds.index('2018-05-17') if '2018-05-17' in ds else 0
    q = lambda i: cs[T] * gs[i] / gs[T]
    print('kho_fun: %d phiên %s -> %s (%d mã HOSE có vốn hoá, bỏ qua %d phiên)'
          % (len(ds), ds[0], ds[-1], so_ma, bo_qua))
    print('  neo %s: VN-Index %.2f -> %.2f (%+.1f%%) | giả định %.2f -> %.2f (%+.1f%%)'
          % (ds[T], cs[T], cs[-1], 100 * (cs[-1] / cs[T] - 1),
             q(T), q(len(ds) - 1), 100 * (q(len(ds) - 1) / q(T) - 1)))
    print('  chênh hôm nay: %+.2f điểm (%+.1f%%) · VIC+VHM đang chiếm %.1f%% vốn hoá sàn'
          % (q(len(ds) - 1) - cs[-1], 100 * (q(len(ds) - 1) / cs[-1] - 1), ws[-1]))
    print('  ghi %s (%.0f KB)' % (RA, os.path.getsize(RA) / 1024))


if __name__ == '__main__':
    main()
