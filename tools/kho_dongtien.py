#!/usr/bin/env python3
"""kho_dongtien.py — DÒNG TIỀN TỰ DOANH & THOẢ THUẬN cho các thẻ Radar (`data/dongtien.json`).

Radar hiện đã có ba thẻ KHỐI NGOẠI (mua/bán ròng phiên · gom 30 phiên). User muốn thêm bộ
tương tự cho TỰ DOANH, và một thẻ THOẢ THUẬN chỉ liệt kê khối lượng (thoả thuận không tách
được mua/bán nên chỉ nêu vol).

╔══════════════════════════════════════════════════════════════════════════════════════╗
║ NGUỒN: data/giaodich/{MÃ}.json  (kho VNDirect, ~1.000 phiên, bồi mỗi phiên)           ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
· TỰ DOANH ròng = `tdMuaTG − tdBanTG` (VNDirect, đơn vị ĐỒNG, đã gồm cả thoả thuận — đúng
  chuẩn "tự doanh ròng" mà trang Phân tích đang hiện). KHÔNG dùng `tdMuaGT/tdBanGT` (Vietstock):
  bản đó chỉ sâu ~251 phiên và tách khớp lệnh riêng.
· THOẢ THUẬN: `pv` (khối lượng, cp) · `pval` (giá trị, đồng).

> TỰ DOANH TRỄ MỘT PHIÊN. Nguồn proprietary_trading công bố T+1, nên phiên tự doanh mới nhất
> thường LÙI một phiên so với giá/thoả thuận. Ghi rõ `tdDate` ≠ `date` để radar gắn nhãn ngày
> trên các thẻ tự doanh, đừng để người xem tưởng là cùng phiên với ba thẻ khối ngoại.

> CHẠY SAU `va_donvi.py`. Kho tự doanh có ô sai đơn vị ×1000 (xem va_donvi.py); phải để bước
> vá chạy trước thì số ở đây mới sạch.

Ghi số ĐỒNG (radar tự quy ra tỷ bằng `ty()`), thoả thuận ghi [KL_cp, GT_đồng].

╔══════════════════════════════════════════════════════════════════════════════════════╗
║ KHO THEO PHIÊN: data/dongtien/{NGÀY}.json  (06/10/2026)                              ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
User: *"mục dòng tiền ở Phân tích không đi theo ngày … cho theo ngày khi tôi chọn trên cột
nến toàn thị trường, và có ô Hôm nay"*. Mỗi phiên một file nhỏ (~4 KB) mang SẴN top 5 của
cả 9 thẻ — client chỉ việc vẽ, không phải tải 1.529 file mã. Ô "Hôm nay" vẫn là giá SỐNG
(ST.list) như cũ; file theo phiên chỉ dùng khi người xem chọn một phiên.

ĐỊNH NGHĨA BÁM SÁT BẢN SỐNG, chỉ đổi NGUỒN sang số chốt của chính phiên đó:
· Vua thanh khoản = `mval` (khớp lệnh) — bản sống là `avePrice × lot` của VPS, cũng khớp lệnh.
· Khối ngoại ròng = `fnMuaTG − fnBanTG` (VNDirect, GIÁ TRỊ thật, gồm thoả thuận). Bản sống lấy
  khối lượng × giá đóng cửa vì bảng giá không trả giá trị; ở đây có số thật thì dùng số thật.
· Gom 30 phiên = cộng ròng 30 PHIÊN THỊ TRƯỜNG kết thúc ở phiên đó. 29 phiên đầu kho không đủ
  cửa sổ -> để `null`, client nói "chưa đủ 30 phiên" chứ không in một tổng hụt.
· Đỉnh lịch sử = giá ĐÃ HẠ NỀN (`data/hist`) ≥ 99,9% đỉnh của chính chuỗi tính tới phiên đó —
  đúng luật `ath` của build_screen, nhưng KHÔNG nhìn trước tương lai. Cổng thanh khoản 500
  triệu đo bằng `mval` trung bình 20 phiên tới phiên đó.
· Giá + % in trên thẻ là giá THÔ của phiên đó (đúng thứ bảng điện hiện hôm ấy), sparkline
  lấy giá ĐÃ HẠ NỀN 30 phiên (chia tách giữa cửa sổ không tạo vách), CHUẨN HOÁ 0..100 theo
  min-max của chính cửa sổ — `drawSpark` vốn tự co giãn min-max nên hình không đổi, mà file
  thì KHÔNG đổi theo mỗi lần nguồn hạ nền lại cả chuỗi (mọi giá trước sự kiện nhân cùng một
  hệ số, min-max triệt tiêu nó). Nhờ vậy phiên cũ không bị ghi lại vô cớ.

> GHI LẠI TOÀN BỘ MỖI LƯỢT, NHƯNG CHỈ ĐỤNG FILE NÀO ĐỔI NỘI DUNG. Tự doanh trễ T+1 nên phiên
> hôm qua ĐƯỢC LẤP vào lượt hôm nay; va_donvi sửa số cũ thì phiên cũ tự đúng lại. Ghi vô điều
> kiện là mỗi ngày 1.000 file "thay đổi" y hệt, rác cả lịch sử git.

> CHẠY HAI LẦN TRONG LƯỢT EOD: [8b] (trước lượt đẩy 1) và sau refresh_daily (trước lượt đẩy
> 2). Lần đầu `data/hist` CHƯA có nến hôm nay (refresh_daily ghi nó sau) nên sparkline/đỉnh
> của phiên mới nhất dùng đường tạm; lần hai lấp đúng, và chỉ file hôm nay đổi.

Chạy:  python3 tools/kho_dongtien.py
"""
import json, os, glob, time, datetime, heapq

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD   = os.path.join(BASE, 'data', 'giaodich')
HIST = os.path.join(BASE, 'data', 'hist')
RA   = os.path.join(BASE, 'data', 'dongtien.json')
NGAY = os.path.join(BASE, 'data', 'dongtien')
VNTZ = datetime.timezone(datetime.timedelta(hours=7))

CUA_GOM = 30                     # "gom 30 phiên" — cộng dồn tự doanh ròng bấy nhiêu phiên
TOP     = 5                      # mỗi thẻ hiện 5 mã — khớp `top(…,5)` của nhipCardsHTML
MIN_MA  = 100                    # phiên có >= 100 mã trong bảng mới dựng — khớp `ptCoFile`
SO_PHIEN = 1000                  # khớp `.slice(-1000)` của `ptCoFile`
ATH_LIQ = 5e8                    # cổng thanh khoản thẻ đỉnh lịch sử — khớp `liq(c)>=5e8`
CUA_TB  = 20                     # trung bình thanh khoản 20 phiên (avgval20)
CUA_SP  = 30                     # sparkline 30 phiên — khớp spark.json
BIEN    = {'HOSE': 0.07, 'HNX': 0.10, 'UPCOM': 0.15}


def doc():
    """Đọc cả kho giao dịch một lượt. Trả (danh sách bản ghi mã, ngày giá mới nhất)."""
    ma = []
    ngay_max = ''
    for f in glob.glob(os.path.join(GD, '*.json')):
        try:
            d = json.load(open(f, encoding='utf-8'))
        except Exception:
            continue
        ds = d.get('d') or []
        if not ds:
            continue
        sym = d.get('sym') or os.path.basename(f)[:-5]
        if ds[-1] > ngay_max:
            ngay_max = ds[-1]
        ma.append((sym, d, ds))
    return ma, ngay_max


def phien_tudoanh_moinhat(ma):
    """Ngày GẦN NHẤT có ít nhất một mã mang số tự doanh ≠ 0 (nguồn trễ T+1)."""
    tot = ''
    for sym, d, ds in ma:
        tm, tb = d.get('tdMuaTG') or [], d.get('tdBanTG') or []
        for i in range(len(ds) - 1, -1, -1):
            m = tm[i] if i < len(tm) else 0
            b = tb[i] if i < len(tb) else 0
            if (m or 0) or (b or 0):
                if ds[i] > tot:
                    tot = ds[i]
                break                       # chỉ cần phiên mới nhất của mã này
    return tot


# ═══════════════════════════ KHO THEO PHIÊN (data/dongtien/{NGÀY}.json) ═══════════════════

THE = ('liq', 'nnb', 'nns', 'nng', 'tdb', 'tds', 'tdg', 'tt', 'ath')


def _ngay_t(t):
    """Mốc nến của data/hist là 00:00 UTC của ngày phiên (giây)."""
    return time.strftime('%Y-%m-%d', time.gmtime(t))


def _buoc(gia, san):
    if san == 'HOSE':
        return 10 if gia < 10000 else (50 if gia < 50000 else 100)
    return 100


def _tran_san(c, tc, san):
    """1 = kịch trần · −1 = kịch sàn · 0 = không. Trần làm tròn XUỐNG, sàn làm tròn LÊN theo
    bước giá. Phiên biên độ đặc biệt (chào sàn ±20/30/40%, mở lại sau đình chỉ) thì KHÔNG
    đoán — `|%| > biên + 0,5%` là trả 0, thà tô xanh/đỏ thường còn hơn tô tím sai."""
    b = BIEN.get(san)
    if not b or not c or not tc:
        return 0
    pc = c / tc - 1
    if abs(pc) > b + 0.005:
        return 0
    tr, st = tc * (1 + b), tc * (1 - b)
    tr = int(tr // _buoc(tr, san)) * _buoc(tr, san)
    st = -int(-st // _buoc(st, san)) * _buoc(st, san)
    # mã giá thấp: làm tròn có thể kéo trần về đúng tham chiếu -> phiên đứng giá bị tô tím
    if pc > 0 and tr > tc and c >= tr:
        return 1
    if pc < 0 and st < tc and c <= st:
        return -1
    return 0


def _chuan(vals):
    """Sparkline chuẩn hoá 0..100 theo min-max của chính cửa sổ (xem docstring đầu file)."""
    vals = [v for v in vals if v]
    if len(vals) < 2:
        return []
    mn, mx = min(vals), max(vals)
    if mx - mn < 1e-9:
        return [50] * len(vals)
    return [round((v - mn) / (mx - mn) * 100) for v in vals]


def _doc_hist(sym):
    try:
        h = json.load(open(os.path.join(HIST, sym + '.json'), encoding='utf-8'))
    except Exception:
        return [], []
    t, c = h.get('t') or [], h.get('c') or []
    n = min(len(t), len(c))
    return [_ngay_t(t[k]) for k in range(n)], c[:n]


def phien_thi_truong(ma):
    """Danh sách phiên đúng như client chọn được (`ptCoFile`): ngày của data/phantich.json có
    >= 100 mã, lấy 1.000 phiên cuối. Thiếu file đó thì dựng từ kho giao dịch."""
    try:
        t = json.load(open(os.path.join(BASE, 'data', 'phantich.json'), encoding='utf-8'))['tt']
        M = [d for d, n in zip(t['d'], t['n']) if (n or 0) >= MIN_MA]
        if M:
            return M[-SO_PHIEN:]
    except Exception:
        pass
    dem = {}
    for _, _, ds in ma:
        for x in ds:
            dem[x] = dem.get(x, 0) + 1
    return sorted(x for x, k in dem.items() if k >= MIN_MA)[-SO_PHIEN:]


def ghi_theo_phien(ma):
    t0 = time.time()
    M = phien_thi_truong(ma)
    L = len(M)
    if not L:
        print('kho_dongtien/phiên: không có phiên nào')
        return
    pos = {d: p for p, d in enumerate(M)}
    try:
        san = {s['sym']: s.get('ex') for s in
               json.load(open(os.path.join(BASE, 'universe.json'), encoding='utf-8'))['stocks']}
    except Exception:
        san = {}

    heaps = {k: [[] for _ in range(L)] for k in THE}
    dem, tdn = [0] * L, [0] * L

    def push(k, p, key, sym, val, extra=None):
        h = heaps[k][p]
        it = (key, sym, val, extra)
        if len(h) < TOP:
            heapq.heappush(h, it)
        elif it[:2] > h[0][:2]:
            heapq.heapreplace(h, it)

    def cum(x):
        s = [0.0] * (L + 1)
        for p in range(L):
            s[p + 1] = s[p] + (x[p] or 0)
        return s

    # ── LƯỢT 1: xếp hạng — chỉ giữ (giá trị, mã) trong 9 × L đống top 5 ──
    for sym, d, ds in ma:
        A = {k: d.get(k) or [] for k in ('c', 'mval', 'pv', 'pval', 'fnMuaTG', 'fnBanTG',
                                         'tdMuaTG', 'tdBanTG', 'sh', 'shR')}
        g = lambda k, i: A[k][i] if i < len(A[k]) else None
        P = [None] * L
        for i, x in enumerate(ds):
            p = pos.get(x)
            if p is not None:
                P[p] = i
        nn, td, mv = [None] * L, [None] * L, [0.0] * L
        for p in range(L):
            i = P[p]
            if i is None:
                continue
            dem[p] += 1
            a, b = g('fnMuaTG', i), g('fnBanTG', i)
            if a is not None or b is not None:
                nn[p] = (a or 0) - (b or 0)
            a, b = g('tdMuaTG', i), g('tdBanTG', i)
            if a is not None or b is not None:
                td[p] = (a or 0) - (b or 0)
                if td[p]:
                    tdn[p] += 1
            mv[p] = g('mval', i) or 0
        Snn, Std, Smv = cum(nn), cum(td), cum(mv)

        # đỉnh lịch sử: giá ĐÃ HẠ NỀN so với đỉnh của chuỗi TỚI phiên đó (không nhìn trước)
        hd, hc = _doc_hist(sym)
        ath, run, hcuoi = {}, 0, ''
        for k in range(len(hd)):
            v = hc[k]
            if not v:
                continue
            if v > run:
                run = v
            hcuoi = hd[k]
            p = pos.get(hd[k])
            if p is not None:
                ath[p] = v >= run * 0.999
        for p in range(L):            # phiên kho nến CHƯA có (lượt 1 của EOD): đường tạm
            if M[p] > hcuoi and P[p] is not None and run:
                cr = g('c', P[p])
                ath[p] = bool(cr) and cr >= run * 0.999

        for p in range(L):
            i = P[p]
            if i is None:
                continue
            cc = g('c', i)
            if not cc:
                continue
            m = mv[p]
            if m > 0:
                push('liq', p, m, sym, m)
            if nn[p]:
                push('nnb' if nn[p] > 0 else 'nns', p, abs(nn[p]), sym, nn[p])
            if td[p]:
                push('tdb' if td[p] > 0 else 'tds', p, abs(td[p]), sym, td[p])
            if p >= CUA_GOM - 1:
                s = Snn[p + 1] - Snn[p + 1 - CUA_GOM]
                if s > 0:
                    push('nng', p, s, sym, s)
                s = Std[p + 1] - Std[p + 1 - CUA_GOM]
                if s > 0:
                    push('tdg', p, s, sym, s)
            q = g('pv', i)
            if q and q > 0:
                push('tt', p, q, sym, q, g('pval', i) or 0)
            if ath.get(p) and m > 0:
                a20 = (Smv[p + 1] - Smv[max(0, p + 1 - CUA_TB)]) / CUA_TB
                if a20 >= ATH_LIQ:
                    s_ = g('sh', i) or g('shR', i)
                    mc = cc * s_ if s_ else 0
                    push('ath', p, mc, sym, mc)

    # thẻ nào để TRỐNG có lý do (khác "không mã nào thoả") -> null
    tdOK = [k > 0 for k in tdn]
    def rong(k, p):
        if k in ('nng', 'tdg') and p < CUA_GOM - 1:
            return True
        if k in ('tdb', 'tds', 'tdg') and not tdOK[p]:
            return True
        return False

    can = {}                          # mã -> các phiên cần thông tin (giá, %, sparkline)
    for k in THE:
        for p in range(L):
            if not rong(k, p):
                for it in heaps[k][p]:
                    can.setdefault(it[1], set()).add(p)

    # ── LƯỢT 2: thông tin dòng của đúng những mã lọt top ──
    info = [dict() for _ in range(L)]
    for sym, d, ds in ma:
        ps = can.get(sym)
        if not ps:
            continue
        c, tc = d.get('c') or [], d.get('tc') or []
        idx = {x: i for i, x in enumerate(ds)}
        hd, hc = _doc_hist(sym)
        hidx = {x: k for k, x in enumerate(hd)}
        for p in ps:
            i = idx.get(M[p])
            if i is None or i >= len(c) or not c[i]:
                continue
            cc = c[i]
            t_ = tc[i] if i < len(tc) else None
            pc = round((cc / t_ - 1) * 100, 2) if t_ else None
            k = hidx.get(M[p])
            sp = hc[max(0, k - CUA_SP + 1):k + 1] if k is not None else c[max(0, i - CUA_SP + 1):i + 1]
            info[p][sym] = [round(cc), pc, _tran_san(cc, t_, san.get(sym)), _chuan(sp)]

    # ── GHI: chỉ file đổi nội dung; xoá file của phiên đã trôi khỏi cửa sổ 1.000 ──
    os.makedirs(NGAY, exist_ok=True)
    moi = giu = 0
    for p in range(L):
        if not dem[p]:
            continue
        the = {}
        for k in THE:
            if rong(k, p):
                the[k] = None
                continue
            ds_ = sorted(heaps[k][p], key=lambda it: (-it[0], it[1]))
            the[k] = [[it[1], round(it[2])] + ([round(it[3])] if k == 'tt' else []) for it in ds_]
        out = {'d': M[p], 'td': tdOK[p], 'the': the, 'ma': info[p]}
        s = json.dumps(out, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
        f = os.path.join(NGAY, M[p] + '.json')
        try:
            cu = open(f, encoding='utf-8').read()
        except Exception:
            cu = None
        if cu == s:
            giu += 1
            continue
        open(f + '.tmp', 'w', encoding='utf-8').write(s)
        os.replace(f + '.tmp', f)
        moi += 1
    tap = set(M)
    xoa = 0
    for f in glob.glob(os.path.join(NGAY, '????-??-??.json')):
        if os.path.basename(f)[:-5] not in tap:
            os.remove(f)
            xoa += 1
    print('kho_dongtien/phiên: %d phiên %s→%s · ghi %d · giữ nguyên %d · xoá %d · %.1fs'
          % (L, M[0], M[-1], moi, giu, xoa, time.time() - t0))


def main():
    ma, date = doc()
    if not ma or not date:
        raise SystemExit('KHÔNG CÓ data/giaodich — chạy kho_vnd_lo.py / kho_giaodich trước')
    tdDate = phien_tudoanh_moinhat(ma)

    td, td30, tt = {}, {}, {}
    for sym, d, ds in ma:
        # ── THOẢ THUẬN tại phiên giá mới nhất ──
        if ds[-1] == date:
            i = len(ds) - 1
            pv = (d.get('pv') or [None] * len(ds))[i]
            pval = (d.get('pval') or [None] * len(ds))[i]
            if pv:
                tt[sym] = [round(pv), round(pval or 0)]

        # ── TỰ DOANH ròng: phiên mới nhất + cộng dồn 30 phiên (tính tới tdDate) ──
        if not tdDate or tdDate not in ds:
            continue
        j = ds.index(tdDate)
        tm, tb = d.get('tdMuaTG') or [], d.get('tdBanTG') or []
        rong = lambda k: ((tm[k] if k < len(tm) else 0) or 0) - ((tb[k] if k < len(tb) else 0) or 0)
        net = rong(j)
        if net:
            td[sym] = round(net)
        g = sum(rong(k) for k in range(max(0, j - CUA_GOM + 1), j + 1))
        if g:
            td30[sym] = round(g)

    out = {
        'generated': datetime.datetime.now(VNTZ).strftime('%Y-%m-%d %H:%M'),
        'date': date, 'tdDate': tdDate,
        'td': td, 'td30': td30, 'tt': tt,
    }
    tmp = RA + '.tmp'
    json.dump(out, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, RA)
    print('kho_dongtien: giá %s · tự doanh %s | td %d mã · td30 %d mã · thoả thuận %d mã · %.0f KB'
          % (date, tdDate or '—', len(td), len(td30), len(tt), os.path.getsize(RA) / 1024))
    ghi_theo_phien(ma)


if __name__ == '__main__':
    main()
