#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_screen.py — SINH DỮ LIỆU PHÂN TÍCH cho 4 công cụ (Radar · Bản đồ nhiệt ·
So găng · Đường đua). Được refresh_daily.py GỌI TỰ ĐỘNG cuối mỗi lượt EOD nên
mọi chỉ báo (RSI/MA/RS Rating/điểm cơ bản/nhịp thị trường) tự tươi mỗi ngày.

Đọc kho data/hist/*.json + data/fin/*.json, ghi:
  data/screen.json  — chỉ báo kỹ thuật + điểm cơ bản ~1.520 mã
  data/market.json  — nhịp thị trường 250 phiên + đường đua vốn hoá 78 tháng

Toàn bộ là thống kê mô tả quá khứ — không sinh khuyến nghị.
Chạy tay khi cần: python3 tools/build_screen.py
"""
import json, math, os, time
from collections import deque, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT  = os.path.join(ROOT, 'data')
HIST = os.path.join(ROOT, 'data', 'hist')
FIN  = os.path.join(ROOT, 'data', 'fin')

FIELDS = [
    'c','ma20','ma50','ma200',
    'rsi','atrp','avgv20','volr','avgval20','ud',
    'hi52','lo52','dhi','dlo','tight',
    'r5','r20','r60','r120','r250','rs',
    'nn20','streak','cross','ath','nsess',
    'fs','fg1','fg2','fg3','fg4','fg5',   # điểm cơ bản tổng + 5 thành phần
]


# ------------------------------------------------------------ hàm cửa sổ trượt
def roll_mean(a, w):
    out = [None] * len(a); s = 0.0
    for i, v in enumerate(a):
        s += v
        if i >= w: s -= a[i - w]
        if i >= w - 1: out[i] = s / w
    return out

def roll_sum(a, w):
    out = [None] * len(a); s = 0.0
    for i, v in enumerate(a):
        s += v
        if i >= w: s -= a[i - w]
        if i >= w - 1: out[i] = s
    return out

def roll_max(a, w):
    dq = deque(); out = [None] * len(a)
    for i, v in enumerate(a):
        while dq and a[dq[-1]] <= v: dq.pop()
        dq.append(i)
        if dq[0] <= i - w: dq.popleft()
        if i >= w - 1: out[i] = a[dq[0]]
    return out

def roll_min(a, w):
    dq = deque(); out = [None] * len(a)
    for i, v in enumerate(a):
        while dq and a[dq[-1]] >= v: dq.pop()
        dq.append(i)
        if dq[0] <= i - w: dq.popleft()
        if i >= w - 1: out[i] = a[dq[0]]
    return out

def rsi_series(c, n=14):
    out = [None] * len(c)
    if len(c) < n + 1: return out
    g = l = 0.0
    for i in range(1, n + 1):
        d = c[i] - c[i - 1]; g += max(d, 0.0); l += max(-d, 0.0)
    g /= n; l /= n
    out[n] = 100.0 if l == 0 else 100 - 100 / (1 + g / l)
    for i in range(n + 1, len(c)):
        d = c[i] - c[i - 1]
        g = (g * (n - 1) + max(d, 0.0)) / n
        l = (l * (n - 1) + max(-d, 0.0)) / n
        out[i] = 100.0 if l == 0 else 100 - 100 / (1 + g / l)
    return out

def atr_series(h, l, c, n=14):
    out = [None] * len(c)
    if len(c) < n + 1: return out
    tr = [0.0]
    for i in range(1, len(c)):
        tr.append(max(h[i] - l[i], abs(h[i] - c[i - 1]), abs(l[i] - c[i - 1])))
    a = sum(tr[1:n + 1]) / n; out[n] = a
    for i in range(n + 1, len(c)):
        a = (a * (n - 1) + tr[i]) / n; out[i] = a
    return out


# ------------------------------------------------------------------ phân tích 1 mã
def analyse(d, acc):
    c = d.get('c') or []; h = d.get('h') or []; l = d.get('l') or []; v = d.get('v') or []
    t = d.get('t') or []
    n = len(c)
    if n < 60 or not c[-1]: return None, None
    fb, fs = d.get('fb') or [], d.get('fs') or []

    S = {}
    for w in (20, 50, 200):
        S['ma%d' % w] = roll_mean(c, w) if n >= w else [None] * n
    S['v20'] = roll_mean(v, 20) if n >= 20 else [None] * n
    S['rsi'] = rsi_series(c)
    S['atr'] = atr_series(h, l, c)
    hi20, lo20 = roll_max(h, 20), roll_min(l, 20)
    S['tight'] = [None if (hi20[i] is None or not lo20[i]) else (hi20[i] / lo20[i] - 1) * 100 for i in range(n)]
    w52 = min(250, n)
    S['hi52'] = roll_max(h, w52); S['lo52'] = roll_min(l, w52)

    # dòng tiền phiên tăng/giảm (cho thành phần "tiền vào phiên tăng" của nhịp thị trường)
    upv = [0.0] * n; dnv = [0.0] * n
    for i in range(1, n):
        if c[i] > c[i - 1]: upv[i] = v[i] or 0
        elif c[i] < c[i - 1]: dnv[i] = v[i] or 0
    su, sd = roll_sum(upv, 20), roll_sum(dnv, 20)
    S['ud'] = [None if su[i] is None else (su[i] / sd[i] if sd[i] else 3.0) for i in range(n)]

    # ---- nhịp thị trường: gom số liệu độ rộng theo NGÀY (mọi mã có giá)
    BR = acc['br']
    for i in range(max(1, n - 280), n):
        ti = t[i]
        b3 = BR.get(ti)
        if b3 is None: b3 = BR[ti] = [0, 0, 0, 0, 0, 0, 0.0, 0.0, 0.0]
        if S['ma50'][i] is not None:
            b3[1] += 1
            if c[i] > S['ma50'][i]: b3[0] += 1
        if S['ma200'][i] is not None:
            b3[3] += 1
            if c[i] > S['ma200'][i]: b3[2] += 1
        if S['hi52'][i] is not None and c[i] >= S['hi52'][i] * 0.999: b3[4] += 1
        if S['lo52'][i] is not None and c[i] <= S['lo52'][i] * 1.001: b3[5] += 1
        val3 = (v[i] or 0) * c[i]
        if c[i] > c[i - 1]: b3[6] += val3
        elif c[i] < c[i - 1]: b3[7] += val3
        if i < len(fb) and i < len(fs): b3[8] += ((fb[i] or 0) - (fs[i] or 0)) * c[i]

    # ---- chỉ số tại phiên cuối
    i = n - 1
    ret = lambda k: (c[i] / c[i - k] - 1) * 100 if (i >= k and c[i - k]) else None
    nn20 = 0.0
    for j in range(max(0, n - 30), n):
        if j < len(fb) and j < len(fs): nn20 += ((fb[j] or 0) - (fs[j] or 0)) * (c[j] or 0)
    streak = 0
    for j in range(n - 1, 0, -1):
        s = 1 if c[j] > c[j - 1] else (-1 if c[j] < c[j - 1] else 0)
        if s == 0: break
        if streak == 0 or (streak > 0) == (s > 0): streak += s
        else: break
    cross = 0
    if n >= 62 and S['ma20'][i] and S['ma50'][i]:
        for k in range(1, 11):
            a, b2 = S['ma20'][i - k], S['ma50'][i - k]
            if a and b2:
                if S['ma20'][i] > S['ma50'][i] and a <= b2: cross = 1; break
                if S['ma20'][i] < S['ma50'][i] and a >= b2: cross = -1; break
    v20 = S['v20'][i]
    avgval20 = sum(c[j] * (v[j] or 0) for j in range(n - 20, n)) / 20 if n >= 20 else None

    r = {
        'c': c[i], 'ma20': S['ma20'][i], 'ma50': S['ma50'][i], 'ma200': S['ma200'][i],
        'rsi': S['rsi'][i], 'atrp': (S['atr'][i] / c[i] * 100) if S['atr'][i] else None,
        'avgv20': v20, 'volr': (v[i] / v20) if (v20 and v[i]) else None, 'avgval20': avgval20,
        'ud': S['ud'][i],
        'hi52': S['hi52'][i], 'lo52': S['lo52'][i],
        'dhi': (c[i] / S['hi52'][i] - 1) * 100 if S['hi52'][i] else None,
        'dlo': (c[i] / S['lo52'][i] - 1) * 100 if S['lo52'][i] else None,
        'tight': S['tight'][i],
        'r5': ret(5), 'r20': ret(20), 'r60': ret(60), 'r120': ret(120), 'r250': ret(250),
        'rs': None, 'nn20': nn20, 'streak': streak, 'cross': cross,
        'ath': 1 if c[i] >= max(c) * 0.999 else 0, 'nsess': n,
        'fs': None, 'fg1': None, 'fg2': None, 'fg3': None, 'fg4': None, 'fg5': None,
    }
    # chuỗi lợi nhuận ngày — để dựng chỉ số thị trường (thành phần quán tính của mood)
    rets = [(t[j], c[j] / c[j - 1] - 1) for j in range(max(1, n - 520), n) if c[j - 1]]
    return r, rets


# ---------------------------------------------------------------- điểm cơ bản
def fundamental(sym, is_bank):
    """5 thành phần minh bạch, tổng 100 — dùng cho thẻ 'Điểm cơ bản' trong So găng."""
    p = os.path.join(FIN, sym + '.json')
    if not os.path.exists(p): return None
    try:
        d = json.load(open(p, encoding='utf-8'))
    except Exception:
        return None
    Q = d.get('Q') or []
    if len(Q) < 8: return None
    last4, prev4 = Q[-4:], Q[-8:-4]
    def s(rows, k):
        vs = [r.get(k) for r in rows if r.get(k) is not None]
        return sum(vs) if len(vs) == len(rows) else None
    rev1, rev0 = s(last4, 'rev'), s(prev4, 'rev')
    np1, np0   = s(last4, 'np'),  s(prev4, 'np')
    g = lambda a, b: ((a / b - 1) * 100) if (a is not None and b and b > 0) else None
    revG, npG = g(rev1, rev0), g(np1, np0)
    nm1 = (np1 / rev1 * 100) if (np1 is not None and rev1) else None
    nm0 = (np0 / rev0 * 100) if (np0 is not None and rev0) else None
    de = None
    rows = {r['k']: r['v'] for r in ((d.get('bsQ') or {}).get('rows') or [])}
    if not is_bank and 'bsa54' in rows and 'bsa78' in rows:
        li, eq = rows['bsa54'][-1], rows['bsa78'][-1]
        if eq and eq > 0 and li is not None: de = li / eq
    cfo_pos = None
    crows = {r['k']: r['v'] for r in ((d.get('cfQ') or {}).get('rows') or [])}
    if 'cfa18' in crows:
        vals = [x for x in crows['cfa18'][-4:] if x is not None]
        if vals: cfo_pos = sum(1 for x in vals if x > 0) / len(vals)
    def band(v, cuts, pts):
        if v is None: return None
        for cut, pt in zip(cuts, pts):
            if v >= cut: return pt
        return 0
    g1 = band(revG, [20, 10, 0], [25, 18, 10])
    g2 = band(npG,  [20, 10, 0], [25, 18, 10])
    g3 = None if (nm1 is None or nm0 is None) else (15 if nm1 > nm0 + .3 else (8 if nm1 > nm0 - .3 else 0))
    g4 = None if de is None else (20 if de < .5 else (14 if de < 1 else (8 if de < 2 else 3)))
    g5 = None if cfo_pos is None else round(15 * cfo_pos)
    parts = [g1, g2, g3, g4, g5]
    maxes = [25, 25, 15, 20, 15]
    got = [x for x in parts if x is not None]
    if not got: return None
    tot_max = sum(m for m, x in zip(maxes, parts) if x is not None)
    return dict(fs=(sum(got) / tot_max * 100 if tot_max else None),
                fg1=g1, fg2=g2, fg3=g3, fg4=g4, fg5=g5)


# ---------------------------------------------------------------------- chính
def main():
    t0 = time.time()
    uni = json.load(open(os.path.join(ROOT, 'universe.json'), encoding='utf-8'))
    meta = {s['sym']: s for s in uni['stocks']}
    # đường đua vốn hoá: giá theo THÁNG cho top 40 toàn thị trường + TOP 10 MỖI NGÀNH
    # (để web đua riêng từng nhóm ngành — danh sách ngành chung với trang bong bóng)
    race_set = {s['sym'] for s in sorted(uni['stocks'], key=lambda x: -(x.get('mcap') or 0))[:40]
                if s.get('shares')}
    by_sec = defaultdict(list)
    for s2 in uni['stocks']:
        if s2.get('shares') and (s2.get('mcap') or 0) > 0:
            by_sec[s2.get('sector') or 'Khác'].append(s2)
    for arr in by_sec.values():
        arr.sort(key=lambda x: -(x.get('mcap') or 0))
        race_set.update(x['sym'] for x in arr[:10])
    races = {}
    files = sorted(f for f in os.listdir(HIST) if f.endswith('.json'))
    print(f'Đọc {len(files)} file kho hist…')

    res = {}
    day_all = defaultdict(lambda: [0.0, 0])
    acc = dict(br={})

    for idx, f in enumerate(files):
        sym = f[:-5]
        try:
            d = json.load(open(os.path.join(HIST, f), encoding='utf-8'))
        except Exception:
            continue
        r, rets = analyse(d, acc)
        if not r: continue
        res[sym] = r
        if sym in race_set:
            mm = {}
            tt_arr = d.get('t') or []; cc_arr = d.get('c') or []
            for i2 in range(len(tt_arr)):
                g2 = time.gmtime(tt_arr[i2] + 25200)
                if cc_arr[i2]: mm[g2.tm_year * 12 + (g2.tm_mon - 1)] = cc_arr[i2]
            races[sym] = mm
        if (r['avgval20'] or 0) >= 1e9:
            for tt, rr in rets:
                if abs(rr) > .35: continue          # bỏ nhiễu chia tách/thưởng
                a = day_all[tt]; a[0] += rr; a[1] += 1
        if idx % 300 == 0: print(f'  {idx}/{len(files)}…', flush=True)

    # ---- chỉ số thị trường tự dựng (bình quân đều mã đủ thanh khoản)
    days = sorted(day_all)
    mkt_t, mkt_v, val = [], [], 100.0
    for tt in days:
        s, cnt = day_all[tt]
        val *= (1 + (s / cnt if cnt else 0))
        mkt_t.append(tt); mkt_v.append(round(val, 3))

    # ---- RS Rating 1..99
    score = {}
    for s, r in res.items():
        parts = [(r['r60'], .4), (r['r120'], .2), (r['r250'], .2), (r['r20'], .2)]
        tot = sum(w for v3, w in parts if v3 is not None)
        if tot > 0: score[s] = sum(v3 * w for v3, w in parts if v3 is not None) / tot
    order = sorted(score, key=lambda s: score[s])
    for i, s in enumerate(order):
        res[s]['rs'] = round(1 + 98 * i / max(1, len(order) - 1))

    # ---- điểm cơ bản
    print('Chấm điểm cơ bản từ kho báo cáo tài chính…')
    for s in res:
        m = meta.get(s) or {}
        is_bank = ('ngân hàng' in (m.get('sector') or '').lower()) or (m.get('parent') == 'Tài chính')
        fd = fundamental(s, is_bank)
        if fd: res[s].update(fd)

    # ---- ghi demo-screen.json
    intish = {'c','ma20','ma50','ma200','avgv20','avgval20','hi52','lo52',
              'nn20','streak','cross','rs','ath','nsess','fs','fg1','fg2','fg3','fg4','fg5'}
    def rd(x, k):
        if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))): return None
        return round(x, 0 if k in intish else 2)
    date = None
    try: date = json.load(open(os.path.join(ROOT, 'data', 'eod', 'latest.json'), encoding='utf-8'))['date']
    except Exception: pass
    out1 = dict(date=date, generated=time.strftime('%Y-%m-%dT%H:%M:%S'), f=FIELDS,
                d={s: [rd(r[k], k) for k in FIELDS] for s, r in res.items()})
    json.dump(out1, open(os.path.join(OUT, 'screen.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))

    # ---- demo-market.json: NHỊP THỊ TRƯỜNG 250 phiên + ĐƯỜNG ĐUA vốn hoá
    keep = 520
    out2 = dict(date=date, t=mkt_t[-keep:], mkt=mkt_v[-keep:])
    mkt_of = dict(zip(mkt_t, mkt_v))
    ma20m = {}
    for i3 in range(19, len(mkt_t)):
        ma20m[mkt_t[i3]] = sum(mkt_v[i3 - 19:i3 + 1]) / 20
    br_days = [tt for tt in days if tt in acc['br']][-250:]
    B = dict(t=[], mood=[], c50=[], c200=[], hl=[], ud=[], mom=[], nh=[], nl=[], nn=[])
    for tt in br_days:
        a50, n50, a200, n200, nh, nl, upv2, dnv2, nn2 = acc['br'][tt]
        c50 = a50 / n50 * 100 if n50 else 50
        c200 = a200 / n200 * 100 if n200 else 50
        hl = 50 + 50 * (nh - nl) / max(1, nh + nl)
        ud2 = upv2 / (upv2 + dnv2) * 100 if (upv2 + dnv2) > 0 else 50
        mom = 50.0
        if tt in mkt_of and ma20m.get(tt):
            mom = 50 + max(-50, min(50, (mkt_of[tt] / ma20m[tt] - 1) * 1000))
        mood = .25 * c50 + .15 * c200 + .20 * hl + .15 * ud2 + .25 * mom
        B['t'].append(tt); B['mood'].append(round(mood, 1))
        B['c50'].append(round(c50, 1)); B['c200'].append(round(c200, 1))
        B['hl'].append(round(hl, 1)); B['ud'].append(round(ud2, 1)); B['mom'].append(round(mom, 1))
        B['nh'].append(nh); B['nl'].append(nl); B['nn'].append(round(nn2 / 1e9, 1))
    out2['breadth'] = B
    # ---- nhịp sợ hãi THỊ TRƯỜNG TOÀN CẦU: CNN Fear&Greed (TT Mỹ); hỏng thì quy đổi VIX Yahoo
    import urllib.request as _ur
    def _cnn():
        req=_ur.Request('https://production.dataviz.cnn.io/index/fearandgreed/graphdata',
            headers={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15',
                     'Accept':'application/json','Accept-Language':'en-US,en;q=0.9',
                     'Referer':'https://edition.cnn.com/markets/fear-and-greed','Origin':'https://edition.cnn.com'})
        with _ur.urlopen(req,timeout=12) as r:
            fg=json.loads(r.read().decode())['fear_and_greed']
        return dict(v=int(round(float(fg['score']))), src='CNN Fear & Greed — thị trường Mỹ')
    def _vix():
        req=_ur.Request('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?range=2d&interval=1d',
            headers={'User-Agent':'Mozilla/5.0'})
        with _ur.urlopen(req,timeout=12) as r:
            m=json.loads(r.read().decode())['chart']['result'][0]['meta']
        vix=float(m['regularMarketPrice'])
        return dict(v=max(0,min(100,int(round(100-(vix-10)*4)))), src='quy đổi từ VIX %.1f'%vix)
    for fn in (_cnn,_vix):
        try:
            out2['global']=fn(); break
        except Exception: pass
    if races:
        allm = set()
        for mm in races.values(): allm.update(mm.keys())
        months = sorted(allm)[-78:]
        lab = ['%d/%s' % (m % 12 + 1, str(m // 12)[2:]) for m in months]
        ser = {}
        for sym2, mm in races.items():
            sh = (meta.get(sym2) or {}).get('shares') or 0
            if not sh: continue
            ser[sym2] = [round(mm[m] * sh / 1e12, 2) if mm.get(m) else None for m in months]
        out2['race'] = dict(labels=lab, series=ser,
                            note='Quy ước: số cổ phiếu đang lưu hành HIỆN TẠI × giá quá khứ — chưa tính pha loãng.')
    json.dump(out2, open(os.path.join(OUT, 'market.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))

    kb = lambda p: os.path.getsize(os.path.join(OUT, p)) / 1024
    print(f'✓ screen: {len(res)} mã · {time.time()-t0:.1f}s')
    for p in ('screen.json', 'market.json'):
        print(f'   data/{p}: {kb(p):.0f} KB')
    if B['mood']:
        print(f"   · Nhịp thị trường hiện tại: {B['mood'][-1]:.0f}/100")
    if races:
        print(f"   · Đường đua: {len(out2['race']['labels'])} tháng × {len(out2['race']['series'])} mã")


if __name__ == '__main__':
    main()
