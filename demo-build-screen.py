#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
demo-build-screen.py — DEMO, chạy tay, KHÔNG đụng vào refresh_daily.py.

Đọc kho data/hist/*.json rồi tính sẵn bộ chỉ báo kỹ thuật cho TOÀN BỘ mã, ghi ra
MỘT file demo-screen.json (~300KB). Trang demo-pro.html chỉ tải 1 file này là đủ
để lọc/quét tín hiệu cho cả 1522 mã — không cần tải 1522 file hist (95MB).

Nếu thấy hiệu quả thì bê nguyên hàm calc() này thành BƯỚC 10 của refresh_daily.py
(ghi thẳng data/screen.json) là xong, chi phí gần như bằng 0 vì hist đã có sẵn.

Chạy:  python3 demo-build-screen.py
"""
import json, math, os, sys, time
from collections import defaultdict

ROOT = os.path.dirname(os.path.abspath(__file__))
HIST = os.path.join(ROOT, 'data', 'hist')
OUT  = os.path.join(ROOT, 'demo-screen.json')

# thứ tự cột trong mảng số của mỗi mã (giữ file nhỏ, web tự map lại bằng "f")
FIELDS = [
    'c',       # giá đóng cửa phiên cuối trong kho
    'ma20', 'ma50', 'ma200',
    'rsi',     # RSI 14 (Wilder)
    'macdh',   # histogram MACD 12/26/9
    'atrp',    # ATR14 tính theo % giá  -> biên độ dao động thường ngày
    'avgv20',  # KLGD trung bình 20 phiên
    'volr',    # KL phiên cuối / avgv20  -> đột biến khối lượng
    'avgval20',# GTGD trung bình 20 phiên (đồng)
    'hi52', 'lo52',
    'dhi',     # % cách đỉnh 52 tuần (âm = còn dưới đỉnh)
    'dlo',     # % trên đáy 52 tuần
    'r5', 'r20', 'r60', 'r120', 'r250',   # lợi nhuận 1 tuần/1 tháng/3 tháng/6 tháng/1 năm (%)
    'rs',      # RS Rating 1-99 (xếp hạng sức mạnh giá so với toàn thị trường, kiểu IBD)
    'nn20',    # khối ngoại mua ròng luỹ kế (đồng) trong tối đa 30 phiên kho có
    'streak',  # số phiên tăng/giảm liên tiếp (âm = giảm)
    'cross',   # 1 = MA20 vừa cắt LÊN MA50 trong 10 phiên; -1 = vừa cắt XUỐNG; 0 = không
    'ath',     # 1 nếu đang ở đỉnh lịch sử của kho
    'nsess',   # số phiên có trong kho (để biết mã mới)
]


def ema(vals, n):
    k = 2 / (n + 1)
    out, e = [], None
    for v in vals:
        e = v if e is None else v * k + e * (1 - k)
        out.append(e)
    return out


def rsi_wilder(c, n=14):
    if len(c) < n + 1:
        return None
    g = l = 0.0
    for i in range(1, n + 1):
        d = c[i] - c[i - 1]
        g += max(d, 0.0); l += max(-d, 0.0)
    g /= n; l /= n
    for i in range(n + 1, len(c)):
        d = c[i] - c[i - 1]
        g = (g * (n - 1) + max(d, 0.0)) / n
        l = (l * (n - 1) + max(-d, 0.0)) / n
    if l == 0:
        return 100.0
    return 100 - 100 / (1 + g / l)


def atr_pct(h, l, c, n=14):
    if len(c) < n + 1:
        return None
    trs = []
    for i in range(1, len(c)):
        trs.append(max(h[i] - l[i], abs(h[i] - c[i - 1]), abs(l[i] - c[i - 1])))
    a = sum(trs[:n]) / n
    for t in trs[n:]:
        a = (a * (n - 1) + t) / n
    return a / c[-1] * 100 if c[-1] else None


def sma(v, n):
    return sum(v[-n:]) / n if len(v) >= n else None


def ret(c, n):
    if len(c) <= n or not c[-1 - n]:
        return None
    return (c[-1] / c[-1 - n] - 1) * 100


def calc(d):
    """d = nội dung data/hist/{SYM}.json -> dict chỉ báo (hoặc None nếu không đủ dữ liệu)"""
    c, h, l, v = d.get('c') or [], d.get('h') or [], d.get('l') or [], d.get('v') or []
    n = len(c)
    if n < 25 or not c[-1]:
        return None
    fb, fs = d.get('fb') or [], d.get('fs') or []

    macd_line = None
    if n >= 26:
        e12, e26 = ema(c, 12), ema(c, 26)
        line = [a - b for a, b in zip(e12, e26)]
        sig = ema(line, 9)
        macd_line = line[-1] - sig[-1]

    w52 = min(250, n)
    hi52, lo52 = max(h[-w52:] or c[-w52:]), min(l[-w52:] or c[-w52:])

    # phiên tăng/giảm liên tiếp
    streak = 0
    for i in range(n - 1, 0, -1):
        s = 1 if c[i] > c[i - 1] else (-1 if c[i] < c[i - 1] else 0)
        if s == 0:
            break
        if streak == 0 or (streak > 0) == (s > 0):
            streak += s
        else:
            break

    # MA20 cắt MA50 trong 10 phiên gần nhất
    cross = 0
    if n >= 62:
        def ma_at(k, w):   # MA w tại vị trí lùi k phiên
            seg = c[n - k - w: n - k] if k else c[-w:]
            return sum(seg) / w if len(seg) == w else None
        cur20, cur50 = ma_at(0, 20), ma_at(0, 50)
        if cur20 and cur50:
            for k in range(1, 11):
                a, b = ma_at(k, 20), ma_at(k, 50)
                if a and b:
                    if cur20 > cur50 and a <= b:
                        cross = 1; break
                    if cur20 < cur50 and a >= b:
                        cross = -1; break

    nn20 = 0.0
    for i in range(max(0, n - 30), n):
        if i < len(fb) and i < len(fs):
            nn20 += ((fb[i] or 0) - (fs[i] or 0)) * (c[i] or 0)

    avgv20 = sma(v, 20) if len(v) >= 20 else None
    avgval20 = None
    if len(v) >= 20:
        avgval20 = sum(c[i] * (v[i] or 0) for i in range(n - 20, n)) / 20

    r = {
        'c': c[-1],
        'ma20': sma(c, 20), 'ma50': sma(c, 50), 'ma200': sma(c, 200),
        'rsi': rsi_wilder(c), 'macdh': macd_line, 'atrp': atr_pct(h, l, c),
        'avgv20': avgv20, 'volr': (v[-1] / avgv20) if (avgv20 and v and v[-1]) else None,
        'avgval20': avgval20,
        'hi52': hi52, 'lo52': lo52,
        'dhi': (c[-1] / hi52 - 1) * 100 if hi52 else None,
        'dlo': (c[-1] / lo52 - 1) * 100 if lo52 else None,
        'r5': ret(c, 5), 'r20': ret(c, 20), 'r60': ret(c, 60),
        'r120': ret(c, 120), 'r250': ret(c, 250),
        'rs': None,
        'nn20': nn20, 'streak': streak, 'cross': cross,
        'ath': 1 if c[-1] >= max(c) * 0.999 else 0,
        'nsess': n,
    }
    return r


def main():
    t0 = time.time()
    files = [f for f in os.listdir(HIST) if f.endswith('.json')]
    print(f'Đọc {len(files)} file kho hist…')
    res = {}
    for i, f in enumerate(files):
        sym = f[:-5]
        try:
            with open(os.path.join(HIST, f), 'r', encoding='utf-8') as fh:
                d = json.load(fh)
        except Exception:
            continue
        r = calc(d)
        if r:
            res[sym] = r
        if i % 300 == 0:
            print(f'  {i}/{len(files)}…', flush=True)

    # RS Rating 1-99: xếp hạng phần trăm của lợi nhuận có trọng số (3T 40%, 6T 20%, 1N 20%, 1Th 20%)
    score = {}
    for s, r in res.items():
        parts = [(r['r60'], .4), (r['r120'], .2), (r['r250'], .2), (r['r20'], .2)]
        tot = sum(w for v, w in parts if v is not None)
        if tot > 0:
            score[s] = sum(v * w for v, w in parts if v is not None) / tot
    order = sorted(score, key=lambda s: score[s])
    for i, s in enumerate(order):
        res[s]['rs'] = round(1 + 98 * i / max(1, len(order) - 1))

    def rd(x, nd=2):
        if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
            return None
        return round(x, nd)

    out = {
        'date': None, 'generated': time.strftime('%Y-%m-%dT%H:%M:%S'),
        'f': FIELDS,
        'd': {s: [rd(r[k], 0 if k in ('c', 'ma20', 'ma50', 'ma200', 'avgv20', 'avgval20',
                                      'hi52', 'lo52', 'nn20', 'streak', 'cross', 'rs', 'ath', 'nsess')
                   else 2) for k in FIELDS] for s, r in res.items()},
    }
    try:
        out['date'] = json.load(open(os.path.join(ROOT, 'data', 'eod', 'latest.json')))['date']
    except Exception:
        pass

    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    kb = os.path.getsize(OUT) / 1024
    print(f'✓ {len(res)} mã -> {OUT} ({kb:.0f} KB) trong {time.time()-t0:.1f}s')


if __name__ == '__main__':
    main()
