#!/usr/bin/env python3
# Cắt một lát dữ liệu THẬT đủ nhỏ để hai bản demo mobile chạy offline được.
import json, os, math
R = '/Users/nguyenthienhuy/Documents/vn-bubbles'
J = lambda p: json.load(open(os.path.join(R, p), encoding='utf-8'))

uni   = J('universe.json')
eod   = J('data/eod/latest.json')
scr   = J('data/screen.json')
spark = J('data/spark.json')['d']
mkt   = J('data/market.json')
td    = J('data/tapdoan.json')
ct    = J('data/cotuc.json')
cd    = J('data/chudiem.json')

SECTOR_EXPLICIT = {
 'Bán lẻ chuyên dụng':'Bán lẻ','Bán lẻ thực phẩm và thuốc':'Bán lẻ','Bán lẻ tổng hợp':'Bán lẻ',
 'Dược phẩm':'Dược phẩm & Y tế','Dịch vụ chăm sóc sức khỏe':'Dược phẩm & Y tế','Thiết bị vật tư Y tế':'Dược phẩm & Y tế',
 'Phần mềm và dịch vụ CNTT':'Công nghệ & Viễn thông','Chất bán dẫn & Thiết bị bán dẫn':'Công nghệ & Viễn thông',
 'Thiết bị & Phụ tùng điện tử':'Công nghệ & Viễn thông','Máy tính, điện thoại & điện tử gia dụng':'Công nghệ & Viễn thông',
 'Thiết bị văn phòng':'Công nghệ & Viễn thông','Dịch vụ Viễn thông':'Công nghệ & Viễn thông',
 'Truyền thông & Mạng':'Công nghệ & Viễn thông','Truyền thông và Xuất bản':'Công nghệ & Viễn thông',
 'Dầu và Khí đốt':'Dầu khí','Dịch vụ và Thiết bị Dầu khí':'Dầu khí',
 'Xây dựng và vật liệu xây dựng dân dụng':'Xây dựng',
 'Kim loại và Khai khoáng':'Khai khoáng & Kim loại','Than':'Khai khoáng & Kim loại',
 'Hộp đựng và Bao bì':'Giấy & Bao bì','Giấy và Lâm sản':'Giấy & Bao bì',
 'Khách sạn và Giải trí':'Du lịch & Giải trí','Vận chuyển hành khách':'Du lịch & Giải trí',
 'Dịch vụ công nghiệp và Thương mại':'Đa ngành & Thương mại',
 'Bán buôn hàng công nghiệp tổng hợp':'Đa ngành & Thương mại',
 'Tập đoàn đa ngành (hàng tiêu dùng)':'Đa ngành & Thương mại',
 'Hóa chất':'Hoá chất & Hàng gia dụng','Hàng gia dụng':'Hoá chất & Hàng gia dụng',
 'Sản phẩm Dịch vụ cá nhân, gia dụng':'Hoá chất & Hàng gia dụng',
}

U = {}
for s in uni['stocks']:
    sec = SECTOR_EXPLICIT.get(s.get('sector') or '', s.get('sector') or 'Khác')
    U[s['sym']] = dict(ex=s.get('ex'), name=s.get('name') or '', sec=sec,
                       mcap=(s.get('mcap') or 0)/1e9, shares=s.get('shares') or 0)
cnt = {}
for v in U.values(): cnt[v['sec']] = cnt.get(v['sec'], 0) + 1
for v in U.values():
    if cnt[v['sec']] < 4: v['sec'] = 'Khác'

E = {d['sym']: d for d in eod['data']}
F = scr['f']; D = scr['d']
gi = lambda sym, k: (D.get(sym) or [None]*len(F))[F.index(k)] if sym in D and k in F else None


def ngan(n):
    """Tên gọn: bỏ mọi tiền tố pháp lý, giữ phần người ta thật sự đọc."""
    for x in ['Công ty Cổ phần', 'Công ty cổ phần', 'Tổng Công ty', 'Tổng công ty',
              'Ngân hàng Thương mại Cổ phần', 'Ngân hàng TMCP', 'Tập đoàn',
              'Công ty TNHH', 'Công ty']:
        n = n.replace(x, ' ')
    n = n.split(' - ')[0]
    return ' '.join(n.split()).strip(' -')


def row(sym):
    e = E.get(sym) or {}
    u = U.get(sym) or {}
    ref = e.get('ref') or 0
    c = e.get('close') or 0
    chg = ((c - ref) / ref * 100) if ref and c else 0
    mc = (u.get('shares') or 0) * c / 1e9
    return dict(s=sym, ex=u.get('ex'), n=ngan(u.get('name') or sym), sec=u.get('sec') or 'Khác',
                c=c, chg=round(chg, 2), gt=round((e.get('gtgd') or 0) / 1e9),
                mc=round(mc), vol=e.get('vol') or 0,
                ceil=e.get('ceil'), fl=e.get('floor'), ref=ref,
                hi=e.get('h'), lo=e.get('l'),
                fb=round((e.get('fBuy') or 0) * c / 1e9, 1), fs=round((e.get('fSell') or 0) * c / 1e9, 1),
                r5=gi(sym, 'r5'), r250=gi(sym, 'r250'), rsi=gi(sym, 'rsi'),
                dath=gi(sym, 'dath'), athP=gi(sym, 'athP'))


live = [s for s in E if s in U]
board = sorted((row(s) for s in live), key=lambda r: -r['gt'])[:64]
tang = sorted((r for r in board if r['gt'] > 20), key=lambda r: -r['chg'])[:6]
giam = sorted((r for r in board if r['gt'] > 20), key=lambda r: r['chg'])[:6]

# vốn hoá lớn nhất — cho bong bóng, cần phủ nhiều ngành
bigs = sorted((row(s) for s in live if (U[s]['shares'] or 0) * (E[s].get('close') or 0) / 1e9 > 8000),
              key=lambda r: -r['mc'])[:70]

want = {r['s'] for r in board} | {r['s'] for r in bigs}
sk = {}
for s in want:
    a = spark.get(s)
    if a: sk[s] = [round(x) for x in a[-24:]]

# về bờ
vb = []
for s in live:
    d = gi(s, 'dath')
    mc = (U[s]['shares'] or 0) * (E[s].get('close') or 0) / 1e9
    if d is not None and d <= -30 and mc >= 300:
        r = row(s); vb.append(r)
vb = sorted(vb, key=lambda r: r['dath'])[:24]

# tập đoàn
tds = []
for g in td['nhom'][:16]:
    syms = []
    for x in g['syms'][:9]:
        e = E.get(x['s']) or {}
        u = U.get(x['s']) or {}
        ref = e.get('ref') or 0; c = e.get('close') or 0
        syms.append(dict(s=x['s'], p=x.get('p'), gt=bool(x.get('gt')), c=c,
                         chg=round(((c - ref) / ref * 100) if ref and c else 0, 2),
                         mc=round((u.get('shares') or 0) * c / 1e9)))
    tds.append(dict(id=g['id'], ten=g['ten'], me=g.get('me'), kieu=g.get('kieu'),
                    mcap=round(g['mcap']), n=len(g['syms']), syms=syms))

# cổ tức — lấy các sự kiện SẮP tới
sk_ct = [x for x in ct['sk'] if x['d'] >= '2026-08-10'][:26]

# chủ điểm
cdx = dict(nguon=cd['nguon'], ten=cd['ten'], truc=cd['truc'],
           ma=[dict(s=m['s'], truc=m['truc'],
                    ssi=(dict(kn=m['ssi'].get('kn'), tp=m['ssi'].get('tp'),
                              td=m['ssi'].get('td'), d=m['ssi'].get('d')) if m.get('ssi') else None))
               for m in cd['ma']])

# đường đua ngành: gộp vốn hoá theo ngành, chuẩn hoá 100 ở mốc đầu
lab = mkt['race']['labels'][-37:]
ser = mkt['race']['series']
n_all = len(mkt['race']['labels'])
agg = {}
for s, arr in ser.items():
    sec = (U.get(s) or {}).get('sec')
    if not sec or sec == 'Khác': continue
    a = arr[-37:]
    if len(a) < 37: continue
    v = agg.setdefault(sec, [0.0] * 37)
    for i, x in enumerate(a):
        if x: v[i] += x
top6 = sorted(agg.items(), key=lambda kv: -(kv[1][-1] or 0))[:7]
race = dict(lab=[lab[i] for i in range(0, 37, 6)], labAll=lab, sec=[])
for sec, v in top6:
    b = v[0] or 1
    race['sec'].append(dict(ten=sec, d=[round(x / b * 100, 1) for x in v]))

# trang cổ phiếu — vài mã có đủ số thật để dựng màn chi tiết
CPS = {}
for sym in ('FPT', 'TCB', 'HPG'):
    try:
        fin = J(f'data/fin/{sym}.json'); his = J(f'data/hist/{sym}.json')
    except Exception:
        continue
    Yr = fin['Y'][-6:]
    eq = None
    for r in (fin.get('bsY') or {}).get('rows') or []:
        if 'VỐN CHỦ SỞ HỮU' in (r['n'] or '').upper(): eq = r['v'][-1]; break
    ttm = sum((q.get('np') or 0) for q in fin['Q'][-4:])
    u = U.get(sym) or {}; e = E.get(sym) or {}
    mc = (u.get('shares') or 0) * (e.get('close') or 0) / 1e9
    CPS[sym] = dict(
        row=row(sym),
        px=[round(x) for x in his['c'][-180:]],
        vol=[round(x) for x in his['v'][-180:]],
        Y=[dict(l=y['label'], rev=round(y['rev'] or 0), np=round(y['np'] or 0), nm=y.get('nm')) for y in Yr],
        Q=[dict(l=q['label'], rev=round(q['rev'] or 0), np=round(q['np'] or 0)) for q in fin['Q'][-8:]],
        div=[dict(y=d['year'], cash=d.get('cash') or 0, cp=d.get('div') or 0, th=d.get('bonus') or 0)
             for d in (fin.get('div') or [])[:6]],
        pe=round(mc / ttm, 1) if ttm else None,
        pb=round(mc / eq, 2) if eq else None,
        eps=round(ttm * 1e9 / (u.get('shares') or 1)) if ttm else None,
        eq=round(eq) if eq else None, ttm=round(ttm),
    )

# quỹ — chỉ lấy quỹ từ 500 tỷ trở lên, đúng luật đã chốt trên trang thật
quy = [dict(ma=q['ma'], ten=q['ten'], ky=q.get('ky'), tong=q.get('tong'), n=len(q['syms']),
            syms=[dict(s=x['s'], v=x['v']) for x in q['syms'][:5]])
       for q in J('data/quy.json')['quy'] if (q.get('tong') or 0) >= 500]
# kỳ công bố lệch nhau hơn hai năm — quỹ có số cũ phải xuống dưới, đúng luật trang thật
for q in quy:
    q['cu'] = (q.get('ky') or '') < '2025-01-01'
quy.sort(key=lambda q: (q['cu'], -(q['tong'] or 0)))

br = mkt['breadth']
last = lambda k: (br.get(k) or [None])[-1]
out = dict(
    date=eod['date'], gen=eod['generated'],
    idx=[dict(n=d['name'], v=d['value'], chg=d['chg'], gt=round(d['gtgd'] / 1e9)) for d in eod['indices']],
    board=board, bigs=bigs, spark=sk, tang=tang, giam=giam,
    td=tds, ct=sk_ct, cd=cdx, vb=vb, race=race, cp=CPS, quy=quy,
    fg=mkt['global'], mood=last('mood'), ud=last('ud'), c50=last('c50'), c200=last('c200'),
    nh=last('nh'), nl=last('nl'), nn=last('nn'),
    secs=sorted({v['sec'] for v in U.values()}),
    nSyms=len(U), nTd=len(td['nhom']), nCt=len(ct['sk']),
    nVb=sum(1 for s in live if (gi(s, 'dath') or 0) <= -30),
)
p = os.path.join(R, 'assets/demo-mobi.json')
json.dump(out, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('ghi', p, round(os.path.getsize(p) / 1024), 'KB')
print('board', len(board), '| bigs', len(bigs), '| vb', len(vb), '/', out['nVb'],
      '| td', len(tds), '/', out['nTd'], '| ct', len(sk_ct), '/', out['nCt'],
      '| race', [s['ten'] for s in race['sec']])
