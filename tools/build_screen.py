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
import datetime, json, math, os, time
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
    'nn20','streak','cross','ath','dath','athP','nsess',
    'fs','fg1','fg2','fg3','fg4','fg5',   # điểm cơ bản tổng + 5 thành phần
    # CHỈ THÊM VÀO CUỐI (client đọc theo f.indexOf nên nối đuôi là an toàn):
    'ma150','m200s',                      # MA150 + độ dốc MA200 21 phiên (%) — Trend Template
    'nn60','nnr20','nnr60',               # NN ròng 60 phiên (đồng) + chuẩn hoá theo GTGD (%)
    'vol60','flat60',                     # ĐỘ LỆCH CHUẨN lợi suất ngày 60 phiên (%/phiên)
                                          # + tỉ lệ phiên ĐỨNG GIÁ trong 60 phiên (%)
    'rsiPM',                              # RSI cao nhất các phiên TRƯỚC ĐÓ trong tháng
                                          # (để client hỏi "lần đầu vượt N" với N bất kỳ)
    'smNeo','sm20','sm60','sm120','sm250',  # SỨC MẠNH SO VỚI CHỈ SỐ SÀN — xem suc_manh()
    'avgval60',                           # GTGD bình quân 60 phiên (đồng) — cổng thanh khoản
    # PHÂN VỊ (%) CỦA KHOẢNG CÁCH TỚI CHỈ SỐ trong cửa sổ N năm, N = 1..10 — xem cat_len()
    'ap1','ap2','ap3','ap4','ap5','ap6','ap7','ap8','ap9','ap10',
]
# `flat60` sinh ra để vá đúng một lỗ hổng của bộ lọc "biến động thấp": nó không phân biệt
# được mã ổn định THẬT với mã KHÔNG CHẠY. TLD khớp 1,86 tỷ/phiên (qua cổng thanh khoản)
# nhưng đứng giá 21/59 phiên nên độ lệch chuẩn chỉ 0,28% — thấp nhất bảng, và lọt vào
# top 30 vì lý do sai. Đo thử ba ngưỡng chặn trên danh mục thử nghiệm:
#   không chặn 20,3%/năm · chặn >40% phiên 20,2% · chặn >30% phiên 20,6% · chặn >20% 19,0%
# Chọn 30%: lợi nhuận ngang bằng (chênh lệch nằm trong nhiễu) mà loại được bệnh; xuống 20%
# là bắt đầu cắt nhầm mã ổn định thật.
# Vì sao thêm `vol60` trong khi đã có `atrp`: nghiên cứu chu kỳ 11/08/2026 đo trên
# 97.794 dòng mã-tháng thấy đây là chỉ báo MẠNH NHẤT trong toàn bộ 30 chỉ báo thử
# (IC 12 tháng −19,8%, ổn định cả 2020-22 lẫn 2023-26, sống sót khi trung hoà ngành).
# atrp đo biên độ trong phiên, không đo độ dao động của chuỗi lợi suất — hai thứ khác
# nhau; dùng thay thế là đo một đại lượng khác với đại lượng đã kiểm chứng.


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

def vn_thang(ts):
    """Nhãn 'YYYY-MM' theo GIỜ VIỆT NAM của một mốc nến."""
    return datetime.datetime.utcfromtimestamp(ts + 7 * 3600).strftime('%Y-%m')


def rsi_dinh_thang_truoc_do(rsi, t, i):
    """RSI CAO NHẤT trong các phiên TRƯỚC ĐÓ của cùng tháng dương lịch (None nếu hôm nay
    là phiên đầu tháng).

    Ghi MỘT con số thay vì một cờ 1/0 cho ngưỡng 80: có số này thì client tự hỏi được
    "lần đầu trong tháng vượt N" với N BẤT KỲ — `rsi_hôm_nay > N và đỉnh_trước_đó <= N` —
    thay vì kho phải đẻ thêm một trường cho mỗi ngưỡng người dùng nghĩ ra.
    Dò NGƯỢC từ hôm nay và DỪNG ngay khi lùi sang tháng trước: đây là "trong tháng dương
    lịch", không phải "trong 30 phiên".
    """
    if not t or i >= len(t):
        return None
    thang = vn_thang(t[i])
    dinh = None
    for j in range(i - 1, -1, -1):
        if j >= len(t) or vn_thang(t[j]) != thang:
            break
        if rsi[j] is not None and (dinh is None or rsi[j] > dinh):
            dinh = rsi[j]
    return round(dinh, 2) if dinh is not None else None


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
    for w in (20, 50, 150, 200):
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
    # NN 60 phiên + chuẩn hoá theo tổng GTGD cùng cửa sổ -> so được mã lớn với mã nhỏ
    nn60 = 0.0
    for j in range(max(0, n - 60), n):
        if j < len(fb) and j < len(fs): nn60 += ((fb[j] or 0) - (fs[j] or 0)) * (c[j] or 0)
    val30 = sum((c[j] or 0) * (v[j] or 0) for j in range(max(0, n - 30), n))
    val60 = sum((c[j] or 0) * (v[j] or 0) for j in range(max(0, n - 60), n))
    nnr20 = nn20 / val30 * 100 if val30 > 0 else None
    nnr60 = nn60 / val60 * 100 if val60 > 0 else None
    # độ dốc MA200: đang đi lên hay đi xuống trong ~1 tháng (điều kiện Trend Template)
    m200s = None
    if S['ma200'][i] and i >= 21 and S['ma200'][i - 21]:
        m200s = (S['ma200'][i] / S['ma200'][i - 21] - 1) * 100
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
    # 60 phiên: cổng thanh khoản của bộ lọc "cách nền" đo trên 60 phiên chứ không phải 20,
    # nên phải có đúng con số đó ở đây — lấy 20 phiên thay thế là đổi định nghĩa cổng.
    avgval60 = sum(c[j] * (v[j] or 0) for j in range(n - 60, n)) / 60 if n >= 60 else None
    vol60 = flat60 = None
    if n >= 61:
        rr = [c[j] / c[j - 1] - 1 for j in range(n - 60, n) if c[j - 1]]
        if len(rr) >= 50:
            mu = sum(rr) / len(rr)
            vol60 = round((sum((x - mu) ** 2 for x in rr) / (len(rr) - 1)) ** 0.5 * 100, 3)
            flat60 = round(sum(1 for x in rr if abs(x) < 1e-9) / len(rr) * 100, 1)

    r = {
        'c': c[i], 'ma20': S['ma20'][i], 'ma50': S['ma50'][i], 'ma200': S['ma200'][i],
        'rsi': S['rsi'][i], 'atrp': (S['atr'][i] / c[i] * 100) if S['atr'][i] else None,
        'avgv20': v20, 'volr': (v[i] / v20) if (v20 and v[i]) else None, 'avgval20': avgval20,
        'avgval60': avgval60,
        'ud': S['ud'][i],
        'hi52': S['hi52'][i], 'lo52': S['lo52'][i],
        'dhi': (c[i] / S['hi52'][i] - 1) * 100 if S['hi52'][i] else None,
        'dlo': (c[i] / S['lo52'][i] - 1) * 100 if S['lo52'][i] else None,
        'tight': S['tight'][i], 'vol60': vol60, 'flat60': flat60,
        'rsiPM': rsi_dinh_thang_truoc_do(S['rsi'], t, i),
        'r5': ret(5), 'r20': ret(20), 'r60': ret(60), 'r120': ret(120), 'r250': ret(250),
        'rs': None, 'nn20': nn20, 'streak': streak, 'cross': cross,
        'ath': 1 if c[i] >= max(c) * 0.999 else 0, 'nsess': n,
        # KHOẢNG CÁCH TỚI ĐỈNH CỦA CẢ CHUỖI (không phải đỉnh 52 tuần): mục "về bờ" hỏi
        # "còn cách đỉnh cũ bao xa", mà đỉnh cũ của phần lớn mã rơi vào 2021-2022 — đo
        # bằng đỉnh 52 tuần thì mã sập bốn năm nay lại hiện ra như chỉ mới giảm nhẹ.
        'dath': round((c[i] / max(c) - 1) * 100, 2) if max(c) else None,
        'athP': round(max(c)) if max(c) else None,
        'fs': None, 'fg1': None, 'fg2': None, 'fg3': None, 'fg4': None, 'fg5': None,
        'ma150': S['ma150'][i], 'm200s': m200s,
        'nn60': nn60, 'nnr20': nnr20, 'nnr60': nnr60,
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


# ------------------------------------------------ BỘ LỌC: dẫn xuất cơ bản (fund.json)
# Toàn bộ tính từ kho data/fin đã có (BCTC 8 năm + 8 quý) — 0 request mạng.
# Client (assets/screener.js) dùng các trường này dựng 9 preset triết lý + cờ đỏ.
FUND_FIELDS = [
    'fin','cyc',                                  # 1=tài chính (NH/CK/BH); 1=ngành chu kỳ
    'roe','roeMin5','roa','eqA',                  # sinh lời: TTM %, ROE năm thấp nhất 5 năm, ROA TTM, VCSH/TS
    'de','cr','ltdNwc',                           # nợ vay/VCSH · thanh toán hiện hành · nợ DH/vốn lưu động ròng
    'cfoT','cfoNp3','cfoNegQ',                    # CFO TTM (tỷ) · CFO/LNST 3 năm · số quý CFO<0 trong 8
    'npQ','revQ','npCagr3','npCagr5','revCagr3','npChg1',  # tăng trưởng %
    'yrsProfit','qLoss8',                         # chuỗi năm có lãi · số quý lỗ trong 8
    'divYears','divCash',                         # chuỗi năm trả cổ tức tiền · đ/cp năm hoàn thành gần nhất
    'eps3','nm','nmAvg5',                         # EPS bq 3 năm (đ) · biên ròng TTM · biên ròng bq 5 năm
    'ptx','evDebt','evCash','roc',                # LNTT TTM (tỷ) · nợ vay (tỷ) · tiền (tỷ) · ROC %
    'accr','recRev','invRev','shDil','aGrow',     # cờ đỏ: dồn tích·phải thu·tồn kho·pha loãng·TS phình
    'fsc','fmx',                                  # điểm Piotroski đạt / tối đa khả dụng
    # CHỈ ĐƯỢC NỐI THÊM VÀO CUỐI — client đọc theo THỨ TỰ của pk.f, chèn giữa là lệch hết
    'npQ2',                                       # %LNST quý liền trước so cùng kỳ
    'lossQs',                                     # số quý LỖ LIÊN TIẾP tính từ quý gần nhất
    'recRevL',                                    # MỨC phải thu ngắn hạn / doanh thu 4 quý (lần)
]
# `recRev` đã có là ĐỘ LỆCH TĂNG TRƯỞNG (phải thu tăng nhanh hơn doanh thu bao nhiêu %),
# còn `recRevL` là MỨC. Nghiên cứu 11/08/2026 đo cả hai: mức mạnh hơn hẳn (IC 12 tháng
# −14,3% so với −6,8%), bền ở cả hai giai đoạn và giữ nguyên khi trung hoà ngành
# (−14,4%) — tức là tín hiệu của từng doanh nghiệp chứ không phải đoán ngành.
_CYC_RE = ('kim loại','khai khoáng','hóa chất','dầu','khí đốt','vận chuyển','vận tải',
           'chứng khoán','vật liệu xây dựng','cao su','nông','thủy sản','phân bón')

def _lab_qy(lb):        # 'Q2/26' -> (2, 2026); '2025' -> (None, 2025)
    lb = str(lb)
    if lb.startswith('Q'):
        try: q, y = lb[1:].split('/'); return int(q), 2000 + int(y)
        except Exception: return None, None
    try: return None, int(lb)
    except Exception: return None, None

def build_fund(meta):
    stats = {'files': 0, 'roe': 0, 'fsc': 0, 'div': 0}
    out = {}
    for sym, m in meta.items():
        p = os.path.join(FIN, sym + '.json')
        if not os.path.exists(p): continue
        try: d = json.load(open(p, encoding='utf-8'))
        except Exception: continue
        stats['files'] += 1
        F = dict.fromkeys(FUND_FIELDS)
        sec = ((m.get('sector') or '') + ' ' + (m.get('parent') or '')).lower()
        F['fin'] = 1 if ('ngân hàng' in sec or 'chứng khoán' in sec or 'bảo hiểm' in sec
                         or m.get('parent') == 'Tài chính') else 0
        F['cyc'] = 1 if any(k in sec for k in _CYC_RE) else 0
        shares = m.get('shares') or 0

        Q = d.get('Q') or []; Y = d.get('Y') or []
        bsQ = d.get('bsQ') or {}; bsY = d.get('bsY') or {}
        cfQ = d.get('cfQ') or {}; cfY = d.get('cfY') or {}
        rq = {r['k']: r['v'] for r in (bsQ.get('rows') or [])}
        ry = {r['k']: r['v'] for r in (bsY.get('rows') or [])}
        cq = {r['k']: r['v'] for r in (cfQ.get('rows') or [])}
        cy = {r['k']: r['v'] for r in (cfY.get('rows') or [])}
        g  = lambda rows, k, i=-1: (rows.get(k) or [None])[i] if rows.get(k) and len(rows[k]) >= abs(i) else None
        # tổng 4 quý (TTM); đòi đủ 4 giá trị để không cộng thiếu kỳ
        def ttm(key, rows=Q, off=0):
            src = rows[-4 + off: len(rows) + off] if off else rows[-4:]
            vs = [r.get(key) for r in src]
            return sum(vs) if len(vs) == 4 and all(x is not None for x in vs) else None
        npT, revT, ptxT = ttm('np'), ttm('rev'), ttm('pretax')
        npT0, revT0 = ttm('np', Q, -4), ttm('rev', Q, -4)     # TTM kỳ trước (dịch 4 quý)

        # --- cân đối quý gần nhất + cùng kỳ năm trước
        a1, a0 = g(rq, 'bsa53', -1), g(rq, 'bsa53', -5)
        eq1, eq0 = g(rq, 'bsa78', -1), g(rq, 'bsa78', -5)
        F['evDebt'] = round((g(rq, 'bsa56', -1) or 0) + (g(rq, 'bsa71', -1) or 0), 1) or None
        F['evCash'] = g(rq, 'bsa2', -1)
        if eq1 and eq1 > 0:
            F['de'] = round(((g(rq, 'bsa56', -1) or 0) + (g(rq, 'bsa71', -1) or 0)) / eq1, 2)
        b1, b5 = g(rq, 'bsa1', -1), g(rq, 'bsa55', -1)
        if b1 is not None and b5 and b5 > 0: F['cr'] = round(b1 / b5, 2)
        if b1 is not None and b5 is not None:
            nwc = b1 - b5
            ltd = g(rq, 'bsa71', -1) or 0
            F['ltdNwc'] = round(ltd / nwc, 2) if nwc > 0 else (99 if ltd > 0 else 0)
        if a1 and a1 > 0:
            if eq1 is not None: F['eqA'] = round(eq1 / a1 * 100, 1)
            if npT is not None: F['roa'] = round(npT / a1 * 100, 1)
        avq = ((eq1 or 0) + (eq0 or 0)) / 2 if (eq1 and eq0) else eq1
        if npT is not None and avq and avq > 0: F['roe'] = round(npT / avq * 100, 1)
        ava = ((a1 or 0) + (a0 or 0)) / 2 if (a1 and a0) else a1
        # --- dòng tiền: cfa18 thường / cfb64 ngân hàng (trực tiếp, trước thuế — chỉ so nội bộ)
        ck = 'cfa18' if cq.get('cfa18') else ('cfb64' if cq.get('cfb64') else None)
        cky = 'cfa18' if cy.get('cfa18') else ('cfb64' if cy.get('cfb64') else None)
        cfoT = None
        if ck and len(cq[ck]) >= 4:
            vs = [x for x in cq[ck][-4:] if x is not None]
            if len(vs) == 4: cfoT = sum(vs)
        if cfoT is None and cky and cy[cky] and cy[cky][-1] is not None:
            cfoT = cy[cky][-1]                    # lưới an toàn: CFO năm gần nhất
        if cfoT is not None: F['cfoT'] = round(cfoT, 1)
        if ck and len(cq[ck]) >= 8:
            F['cfoNegQ'] = sum(1 for x in cq[ck][-8:] if x is not None and x < 0)
        if cky and cy[cky] and len(cy[cky]) >= 3 and Y:
            cf3 = [x for x in cy[cky][-3:] if x is not None]
            np3 = [r.get('np') for r in Y[-3:] if r.get('np') is not None]
            if len(cf3) == 3 and len(np3) == 3 and sum(np3) > 0:
                F['cfoNp3'] = round(sum(cf3) / sum(np3), 2)
        # dồn tích Sloan (TTM)
        if npT is not None and cfoT is not None and ava and ava > 0 and ck == 'cfa18':
            F['accr'] = round((npT - cfoT) / ava * 100, 1)

        # --- tăng trưởng
        if Q:
            q1, y1 = _lab_qy(Q[-1].get('label'))
            if q1:
                prev = next((r for r in Q if _lab_qy(r.get('label')) == (q1, y1 - 1)), None)
                if prev:
                    if prev.get('np') and prev['np'] > 0 and Q[-1].get('np') is not None:
                        F['npQ'] = round((Q[-1]['np'] / prev['np'] - 1) * 100, 1)
                    if prev.get('rev') and prev['rev'] > 0 and Q[-1].get('rev') is not None:
                        F['revQ'] = round((Q[-1]['rev'] / prev['rev'] - 1) * 100, 1)
        def cagr(key, yrs):
            if len(Y) < yrs + 1: return None
            a, b = Y[-1 - yrs].get(key), Y[-1].get(key)
            if a and b and a > 0 and b > 0:
                return round(((b / a) ** (1 / yrs) - 1) * 100, 1)
            return None
        F['npCagr3'] = cagr('np', 3); F['npCagr5'] = cagr('np', 5); F['revCagr3'] = cagr('rev', 3)
        if len(Y) >= 2 and Y[-2].get('np') and Y[-2]['np'] > 0 and Y[-1].get('np') is not None:
            F['npChg1'] = round((Y[-1]['np'] / Y[-2]['np'] - 1) * 100, 1)
        yp = 0
        for r in reversed(Y):
            if r.get('np') is not None and r['np'] > 0: yp += 1
            else: break
        F['yrsProfit'] = yp
        F['qLoss8'] = sum(1 for r in Q[-8:] if r.get('np') is not None and r['np'] < 0) if Q else None

        # CHUỖI QUÝ LỖ LIÊN TIẾP tính ngược từ quý gần nhất. Điều kiện đơn điệu (lỗ 6 quý
        # thì hiển nhiên lỗ 4 quý) nên một số nguyên là đủ: client hỏi "lỗ N quý" = lossQs >= N.
        # Khác qLoss8 — cái đó đếm SỐ QUÝ LỖ trong 8 quý, rời rạc cũng tính.
        k = 0
        for r in reversed(Q):
            v = r.get('np')
            if v is None or v >= 0: break
            k += 1
        F['lossQs'] = k

        # %LNST của quý LIỀN TRƯỚC so với CÙNG KỲ năm trước — ghép với npQ (quý mới nhất)
        # thành điều kiện "2 quý liên tiếp tăng mạnh so với cùng kỳ"
        if len(Q) >= 2:
            q2, y2 = _lab_qy(Q[-2].get('label'))
            if q2:
                pv = next((r for r in Q if _lab_qy(r.get('label')) == (q2, y2 - 1)), None)
                if pv and pv.get('np') and pv['np'] > 0 and Q[-2].get('np') is not None:
                    F['npQ2'] = round((Q[-2]['np'] / pv['np'] - 1) * 100, 1)

        # --- ROE năm thấp nhất 5 năm (xuyên chu kỳ — chuẩn Buffett)
        if ry.get('bsa78') and bsY.get('labels') and Y:
            eqy = dict(zip(bsY['labels'], ry['bsa78']))
            roes = []
            for r in Y[-5:]:
                e = eqy.get(str(r.get('label')))
                if e and e > 0 and r.get('np') is not None:
                    roes.append(r['np'] / e * 100)
            if len(roes) >= 4: F['roeMin5'] = round(min(roes), 1)
            if len(roes) >= 4: stats['roe'] += 1

        # --- cổ tức: năm hoàn thành gần nhất = năm BCTC năm cuối
        divs = d.get('div') or []
        y0 = None
        if Y: _, y0 = _lab_qy(Y[-1].get('label'))
        if divs and y0:
            by = {int(x['year']): x for x in divs if x.get('year')}
            F['divCash'] = int(round((by.get(y0) or {}).get('cash') or 0)) or None
            dy = 0; yy = y0
            while by.get(yy) and (by[yy].get('cash') or 0) > 0: dy += 1; yy -= 1
            F['divYears'] = dy
            if dy: stats['div'] += 1
            # pha loãng từ cổ tức CP + thưởng 3 năm gần nhất (%/năm, gần đúng)
            mul = 1.0
            for yy2 in range(y0 - 2, y0 + 1):
                x = by.get(yy2)
                if x: mul *= (1 + ((x.get('div') or 0) + (x.get('bonus') or 0)) / 100)
            if mul > 1: F['shDil'] = round((mul ** (1 / 3) - 1) * 100, 1)

        # --- định giá nền
        if len(Y) >= 3 and shares > 0:
            np3v = [r.get('np') for r in Y[-3:] if r.get('np') is not None]
            if len(np3v) == 3 and sum(np3v) > 0:
                F['eps3'] = int(round(sum(np3v) / 3 * 1e9 / shares))
        if npT is not None and revT and revT > 0: F['nm'] = round(npT / revT * 100, 1)
        nms = [r.get('nm') for r in Y[-5:] if r.get('nm') is not None]
        if len(nms) >= 3: F['nmAvg5'] = round(sum(nms) / len(nms), 1)
        if ptxT is not None: F['ptx'] = round(ptxT, 1)
        # ROC kiểu Greenblatt (proxy LNTT): vốn lưu động ròng dương + tài sản cố định
        if not F['fin'] and ptxT is not None and b1 is not None and b5 is not None:
            denom = max(b1 - b5, 0) + (g(rq, 'bsa29', -1) or 0)
            if denom > 0: F['roc'] = round(ptxT / denom * 100, 1)

        # --- cờ đỏ phụ: phải thu / tồn kho phình vs doanh thu; tổng TS phình
        r1, r0 = g(rq, 'bsa8', -1), g(rq, 'bsa8', -5)
        if r1 and r0 and r0 > 0 and revT and revT0 and revT0 > 0:
            F['recRev'] = round((r1 / r0 - 1) * 100 - (revT / revT0 - 1) * 100, 1)
        if r1 is not None and revT and revT > 0: F['recRevL'] = round(r1 / revT, 3)
        i1, i0 = g(rq, 'bsa15', -1), g(rq, 'bsa15', -5)
        if i1 and i0 and i0 > 0 and revT and revT0 and revT0 > 0:
            F['invRev'] = round((i1 / i0 - 1) * 100 - (revT / revT0 - 1) * 100, 1)
        ay1, ay0 = g(ry, 'bsa53', -1), g(ry, 'bsa53', -2)
        if ay1 and ay0 and ay0 > 0: F['aGrow'] = round((ay1 / ay0 - 1) * 100, 1)

        # --- Piotroski F (bản VN 8 tín hiệu — bỏ F7 phát hành CP vì nguồn không tách được;
        #     ngân hàng thiếu current ratio + biên gộp -> chấm trên 6)
        if len(Y) >= 2 and ry.get('bsa53') and len(ry['bsa53']) >= 2:
            npy1, npy0 = Y[-1].get('np'), Y[-2].get('np')
            ra1, ra0 = ry['bsa53'][-1], ry['bsa53'][-2]
            cf1 = cy[cky][-1] if (cky and cy.get(cky)) else None
            if npy1 is not None and ra1 and ra1 > 0:
                fsc = 0; fmx = 0
                roa1 = npy1 / ra1
                roa0 = (npy0 / ra0) if (npy0 is not None and ra0 and ra0 > 0) else None
                fmx += 1; fsc += 1 if roa1 > 0 else 0                                  # F1
                if cf1 is not None: fmx += 1; fsc += 1 if cf1 > 0 else 0               # F2
                if roa0 is not None: fmx += 1; fsc += 1 if roa1 > roa0 else 0          # F3
                if cf1 is not None: fmx += 1; fsc += 1 if cf1 > npy1 else 0            # F4
                l1 = (g(ry, 'bsa71', -1) or 0) / ra1 if ra1 else None                  # F5
                l0 = (g(ry, 'bsa71', -2) or 0) / ra0 if (ra0 and ra0 > 0) else None
                if l0 is not None: fmx += 1; fsc += 1 if l1 < l0 else 0
                cr1y = (g(ry, 'bsa1', -1) or 0) / (g(ry, 'bsa55', -1) or 0) if g(ry, 'bsa55', -1) else None
                cr0y = (g(ry, 'bsa1', -2) or 0) / (g(ry, 'bsa55', -2) or 0) if g(ry, 'bsa55', -2) else None
                if cr1y and cr0y: fmx += 1; fsc += 1 if cr1y > cr0y else 0             # F6
                gm1, gm0 = Y[-1].get('gm'), Y[-2].get('gm')
                if gm1 is not None and gm0 is not None: fmx += 1; fsc += 1 if gm1 > gm0 else 0  # F8
                rv1, rv0 = Y[-1].get('rev'), Y[-2].get('rev')
                at1 = rv1 / ra1 if (rv1 and ra1) else None                             # F9
                at0 = rv0 / ra0 if (rv0 and ra0 and ra0 > 0) else None
                if at1 and at0: fmx += 1; fsc += 1 if at1 > at0 else 0
                if fmx >= 5: F['fsc'] = fsc; F['fmx'] = fmx; stats['fsc'] += 1
        out[sym] = [F[k] for k in FUND_FIELDS]
    return out, stats


# ---------------------------------------------------------------------- chính
# ---------------------------------------------------------------------------
# SỨC MẠNH SO VỚI CHỈ SỐ SÀN — thay hẳn bộ "khoảng cách tới nền" (25/08/2026).
#
#   sm{N} = [giá ĐC(t) / giá ĐC(t−N)] ÷ [chỉ số(t) / chỉ số(t−N)] − 1        (đơn vị %)
#
# TỬ SỐ LÀ GIÁ ĐIỀU CHỈNH, KHÔNG PHẢI VỐN HOÁ. Bản cũ đo bằng vốn hoá và sai thước: vốn hoá
# tăng cả khi phát hành thêm mà cổ đông cũ không được gì. Đo 367 mã từ 2013, tỉ lệ (vốn hoá
# tăng)/(giá ĐC tăng) có p90 2,83 và max 61,5 — ORS vốn hoá ×157,6 mà giá chỉ ×11,84; HHV
# vốn hoá ×112,5 mà giá ×1,83 trong khi chỉ số ×3,11, tức THUA thị trường trong khi thước cũ
# chấm nó mạnh nhất sàn. Xem mục *SỨC MẠNH SO VỚI CHỈ SỐ* trong CLAUDE.md.
#
# CỬA SỔ CỐ ĐỊNH, KHÔNG NEO THEO MÃ. Chart neo ở phiên đầu chuỗi của từng mã, hợp cho việc
# đọc MỘT mã; bảng giá thì so ngang nên phải dùng chung một quãng — mã neo 2013 và mã neo
# 2025 không so được với nhau. Bốn cửa sổ 20/60/120/250 phiên.
#
# MỖI MÃ SO VỚI CHỈ SỐ SÀN CỦA CHÍNH NÓ (HOSE→VNINDEX · HNX→HNX · UPCOM→UPCOM). Bản cũ chỉ
# HOSE vì cần kho vốn hoá 1.250 phiên; nay tử số là giá nên CẢ BA SÀN dùng được, kể cả mã
# mới niêm yết — chỉ cần đủ N phiên.
CHISO_SAN = {'HOSE': 'VNINDEX', 'HNX': 'HNX', 'UPCOM': 'UPCOM'}
SM_CUA    = (20, 60, 120, 250)

# ── DƯỚI CHỈ SỐ N NĂM LIÊN TỤC, NAY CHỈ CÒN CÁCH ÍT (27/08/2026) ──────────────────────
# User chốt sau năm vòng đo: *"1 năm có 250 phiên thì tầm 125 phiên gần nhất dưới VN-Index
# nhưng giá chỉ còn cách VN-Index khoảng 10% thì đạt · 2 năm thì tầm 200 phiên · 3–10 năm thì
# khoảng 300 phiên"*.
#
# Đo trên ĐÚNG đường chart trang mã vẽ ở mốc "N năm". Khoảng hở
#     q(i) = [giá(i)/giá(a)] ÷ [chỉ số(i)/chỉ số(a)] − 1        a = phiên neo, lùi N×250 nến
# `q < 0` là đang ở DƯỚI đường chỉ số, và `−q` chính là "thấp hơn đường chỉ số bao nhiêu %".
#
# HAI ĐIỀU KIỆN, HẾT:
#   ① `L` phiên gần nhất **đều** có `q < 0` — ở dưới liên tục, không một phiên nào nhô lên;
#   ② khoảng cách hôm nay `−q` đủ nhỏ — chip hỏi ≤ 10%.
# `L` đổi theo mốc: 1 năm → 125 · 2 năm → 200 · 3..10 năm → 300 phiên.
#
# KHO GHI KHOẢNG CÁCH (%), KHÔNG GHI CỜ — cùng bài học với `rsiPM`: ngưỡng 10% nằm ở CLIENT
# nên siết xuống 5% hay nới lên 15% không phải dựng lại kho.
#
# VÌ SAO NEO Ở "NGAY BÂY GIỜ" MÀ KHÔNG NEO Ở LÚC CẮT — bản trước đòi "ở dưới suốt 600 phiên
# NGAY TRƯỚC VẾT CẮT" và chết vì ngay sát vết cắt giá luôn dập dềnh quanh vạch: 0 mã đạt.
# Ở đây `L` phiên tính ngược từ HÔM NAY, mà hôm nay mã vẫn còn ở dưới, nên không có vùng dập
# dềnh nào để vướng.
#
# BA CA MẪU USER ĐÃ BẮT, cả ba đều bị điều kiện ① hoặc ② loại:
#   · VBB mốc 1 năm — phá lên +25,7% ngày 22/07/2026 rồi hạ về −3,0%. Khoảng cách nay chỉ 3%
#     (qua ②) nhưng trong 125 phiên gần nhất CÓ phiên ở trên -> ① loại.
#   · NVB mốc 1 năm — cách tới 30,3%, ② loại; mốc 2 năm thì đang Ở TRÊN, ① loại.
#   · VIC / VHM — đang ở trên đường chỉ số, ① loại.
CAT_NAM = tuple(range(1, 11))    # 1..10 năm
CAT_NEN = 250                    # số nến MỘT năm ở khung Ngày — sao y NAM_NEN của chart.js
CAT_DUOI = {1: 125, 2: 200}      # số phiên gần nhất phải ở dưới; mốc khác dùng CAT_DUOI_MAC
CAT_DUOI_MAC = 300


def _nap_chiso():
    """Đọc cả ba kho chỉ số một lần. Trả {tên: {ngày: điểm}}."""
    ra = {}
    for ten in set(CHISO_SAN.values()):
        try:
            j = json.load(open(os.path.join(ROOT, 'data', 'chiso', ten + '.json'), encoding='utf-8'))
            ra[ten] = {d: c for d, c in zip(j['d'], j['c']) if c}
        except Exception:
            ra[ten] = {}
    return ra


def suc_manh(d, floor, CS):
    """`d` = nội dung data/hist/{MÃ}.json · `floor` = sàn. Trả dict các trường sm*.

    GHÉP THEO NGÀY, KHÔNG THEO CHỈ SỐ MẢNG. Nến của mã và nến chỉ số lệch nhau ở phiên mã
    bị ngừng giao dịch; ghép theo vị trí là lệch cả chuỗi mà không báo gì.
    """
    r = {('sm%d' % W): None for W in SM_CUA}
    r['smNeo'] = None
    ix = CS.get(CHISO_SAN.get(floor or '', ''), None)
    if not ix:
        return r
    t, c = d.get('t') or [], d.get('c') or []
    P, X = [], []
    for i in range(len(t)):
        if not c[i] or c[i] <= 0: continue
        dd = time.strftime('%Y-%m-%d', time.gmtime(t[i] + 25200))
        v = ix.get(dd)
        if v: P.append(c[i]); X.append(v)
    n = len(P)
    if n < 2:
        return r
    # so với phiên ĐẦU chuỗi — cùng định nghĩa với mốc neo mặc định của chart
    r['smNeo'] = round(((P[-1] / P[0]) / (X[-1] / X[0]) - 1) * 100, 2)
    for W in SM_CUA:
        if n > W:
            r['sm%d' % W] = round(((P[-1] / P[-1 - W]) / (X[-1] / X[-1 - W]) - 1) * 100, 2)
    r.update(cat_len(P, X))
    return r


def cat_len(P, X):
    """Khoảng cách (%) từ giá tới đường chỉ số neo N năm, CHỈ ghi khi `L` phiên gần nhất đều
    nằm dưới đường đó. `None` = có phiên nhô lên trong `L` phiên, hoặc chuỗi quá ngắn.

    Số dương, càng nhỏ càng áp sát. Chip hỏi ≤ 10. Xem khối chú thích trên.
    """
    r = {('ap%d' % N): None for N in CAT_NAM}
    n = len(P)
    if n < 2:
        return r
    R = [P[i] / X[i] for i in range(n)]
    for N in CAT_NAM:
        L = CAT_DUOI.get(N, CAT_DUOI_MAC)
        a = n - 1 - N * CAT_NEN
        if a < 0:
            a = 0                       # chuỗi ngắn hơn N năm -> neo phiên đầu, y như chart
        if n - 1 - a < L:
            continue                    # `L` phiên phải nằm trọn sau phiên neo
        ra = R[a]
        # ① `L` phiên gần nhất ĐỀU ở dưới — một phiên nhô lên là loại
        if any(R[k] >= ra for k in range(n - L, n)):
            continue
        # ② khoảng cách hôm nay, tính bằng % so với mức của đường chỉ số
        r['ap%d' % N] = round(100.0 * (ra / R[n - 1] - 1.0), 2)
    return r


def _ema(a, p):
    k = 2.0 / (p + 1); out = [None] * len(a); e = None; s2 = 0.0
    for i, x in enumerate(a):
        if i < p - 1: s2 += x; continue
        if i == p - 1: s2 += x; e = s2 / p
        else: e = x * k + e * (1 - k)
        out[i] = e
    return out


def chiso_trang_thai(CS):
    """Trạng thái VN-Index cho dòng mô tả ở panel bộ lọc — EMA20/EMA50 và giá."""
    try:
        j = json.load(open(os.path.join(ROOT, 'data', 'chiso', 'VNINDEX.json'), encoding='utf-8'))
        e20 = _ema(j['c'], 20); e50 = _ema(j['c'], 50)
        n = len(j['c']) - 1
        if n >= 50 and e20[n] and e50[n]:
            return dict(d=j['d'][n], c=round(j['c'][n], 2), e20=round(e20[n], 2),
                        e50=round(e50[n], 2), cong=bool(e20[n] <= e50[n] and j['c'][n] > e20[n]))
    except Exception:
        pass
    return None



def main():
    t0 = time.time()
    uni = json.load(open(os.path.join(ROOT, 'universe.json'), encoding='utf-8'))
    meta = {s['sym']: s for s in uni['stocks']}
    # ĐƯỜNG ĐUA VỐN HOÁ: giá theo THÁNG cho MỌI mã có số cổ phiếu lưu hành.
    # Trước đây chỉ lấy top 40 toàn thị trường + top 10 mỗi ngành = 401 mã, nên chọn ngành
    # ngân hàng ra đua chỉ thấy 14/30 mã — thiếu TPB, EIB, OCB, ABB... mà không báo gì, và
    # gõ tay mấy mã đó vào ô "gõ mã" cũng ra "không có trong dữ liệu đua". Danh sách mã của
    # đường đua PHẢI trùng với bảng giá, người dùng không có cách nào biết rổ bị cắt bớt.
    race_set = {s['sym'] for s in uni['stocks'] if s.get('shares')}
    races = {}
    files = sorted(f for f in os.listdir(HIST) if f.endswith('.json'))
    print(f'Đọc {len(files)} file kho hist…')

    CS = _nap_chiso()
    print('   kho chỉ số: ' + ' · '.join('%s %d phiên' % (k, len(v)) for k, v in sorted(CS.items())))
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
        # SỨC MẠNH SO VỚI CHỈ SỐ — tính NGAY TẠI ĐÂY vì `d` đã nằm trong tay. Quét lại thư
        # mục lần hai như bản `nen_tuoi()` cũ là đọc 1.529 file thêm một lượt cho không.
        r.update(suc_manh(d, (meta.get(sym) or {}).get('ex') or '', CS))
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

    # ---- trạng thái chỉ số cho dòng mô tả ở panel bộ lọc
    nen_ix = chiso_trang_thai(CS)
    print('   sức mạnh so với chỉ số: %d mã có sm120 · cổng chỉ số %s'
          % (sum(1 for s in res if res[s].get('sm120') is not None),
             'MỞ' if (nen_ix or {}).get('cong') else 'ĐÓNG'))

    # ---- ghi demo-screen.json
    intish = {'c','ma20','ma50','ma200','ma150','avgv20','avgval20','hi52','lo52',
              'nn20','nn60','streak','cross','rs','ath','dath','athP','nsess','fs','fg1','fg2','fg3','fg4','fg5',
              'avgval60'}
    def rd(x, k):
        if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))): return None
        return round(x, 0 if k in intish else 2)
    date = None
    try: date = json.load(open(os.path.join(ROOT, 'data', 'eod', 'latest.json'), encoding='utf-8'))['date']
    except Exception: pass
    out1 = dict(date=date, generated=time.strftime('%Y-%m-%dT%H:%M:%S'), f=FIELDS,
                ix=nen_ix,
                d={s: [rd(r[k], k) for k in FIELDS] for s, r in res.items()})
    json.dump(out1, open(os.path.join(OUT, 'screen.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))

    # ---- fund.json: dẫn xuất cơ bản cho BỘ LỌC (đọc lại kho fin, 0 request mạng)
    print('Dẫn xuất chỉ số cơ bản cho bộ lọc…')
    fund, fstats = build_fund(meta)
    json.dump(dict(date=date, f=FUND_FIELDS, d=fund),
              open(os.path.join(OUT, 'fund.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    print(f"   fund: {len(fund)} mã (ROE 5 năm {fstats['roe']} · F-score {fstats['fsc']} · cổ tức {fstats['div']})")

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
    # ---- "SỨC MẠNH TOÀN CẦU" ĐÃ BỎ 16/08/2026 — ĐỪNG DỰNG LẠI ----
    # Trước đây lấy CNN Fear & Greed (dự phòng: quy đổi từ VIX của Yahoo).
    # Bỏ vì hai lẽ, và lẽ thứ hai mới là chính:
    #   · Cào thì không đáng lo (1 lượt/ngày) — nhưng trang ĐANG TRƯNG tên thương hiệu
    #     "CNN Fear & Greed" kèm con số. Số 67 là dữ kiện, còn CÁI TÊN và cách tính là
    #     sản phẩm có thương hiệu của họ. Giấu User-Agent không che được thứ hiện trên
    #     mặt tiền — ai ở CNN mở cpvn.io/radar là thấy ngay.
    #   · Nhánh dự phòng VIX cũng cùng vấn đề: VIX là chỉ số có thương hiệu của CBOE, và
    #     Yahoo đã trả 429 từ lâu nên nhánh đó chết sẵn.
    # "Sức mạnh TRONG NƯỚC" giữ nguyên — CPVN tự tính từ dữ liệu của chính mình.
    if races:
        allm = set()
        for mm in races.values(): allm.update(mm.keys())
        # TRẦN SỐ THÁNG của đường đua. 78 tháng (6,5 năm) là mốc đặt hồi kho chỉ có từ
        # 2020 — giữ nguyên thì bồi kho về 2013 xong đường đua VẪN chỉ chạy 6,5 năm, tức
        # công bồi đổ sông. Nâng lên 168 tháng (14 năm) để phủ trọn kho.
        # ĐÂY LÀ ĐÁNH ĐỔI CÓ THẬT: market.json phình gấp ~2 lần (client tải nó ở trang công
        # cụ). Muốn gọn lại thì hạ số này, KHÔNG phải cắt kho — kho còn nuôi MA/RSI, đỉnh
        # 52T, độ rộng, bộ lọc.
        months = sorted(allm)[-168:]
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
    for p in ('screen.json', 'market.json', 'fund.json'):
        print(f'   data/{p}: {kb(p):.0f} KB')
    if B['mood']:
        print(f"   · Nhịp thị trường hiện tại: {B['mood'][-1]:.0f}/100")
    if races:
        print(f"   · Đường đua: {len(out2['race']['labels'])} tháng × {len(out2['race']['series'])} mã")


if __name__ == '__main__':
    main()
