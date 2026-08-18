#!/usr/bin/env python3
"""
BỘ ĐO PHÂN TÍCH KỸ THUẬT DÙNG CHUNG — đọc thẳng kho nến, trả về CHUỖI đầy đủ.

VÌ SAO CÓ FILE NÀY
------------------
`build_screen.py` đã tính đủ chỉ báo nhưng chỉ giữ GIÁ TRỊ PHIÊN CUỐI vào screen.json
(một dòng mỗi mã). Muốn phân tích một mã theo thời gian — Wyckoff, xem RSI phân kỳ, xem
MA cắt nhau lúc nào — thì cần cả chuỗi, mà chuỗi đó đang bị khoá bên trong hàm `analyse`.

Cách rẻ tiền là ĐỔ chuỗi chỉ báo vào data/hist. Đã đo: kho phình từ 33,5 MB lên 77,5 MB
gzip (gấp 2,3 lần) để lưu những con số tính lại hết 2 mili-giây. Không đáng.

Nên: chỉ báo KHÔNG lưu, mà tính lại từ nến — nhưng bằng MỘT bộ công thức duy nhất, để
trình duyệt, build_screen.py và AI đều ra đúng một con số. Công thức dưới đây SAO Y
build_screen.py (RSI/ATR dùng làm trơn Wilder, không phải SMA) — đã đối chiếu khớp tuyệt
đối trên toàn bộ mã bằng `python3 tools/ta.py --doi-chieu`.

DÙNG
----
  python3 tools/ta.py HPG                 # tóm tắt phiên gần nhất
  python3 tools/ta.py HPG --n 40          # bảng 40 phiên gần nhất
  python3 tools/ta.py HPG --json          # toàn bộ chuỗi, cho máy đọc
  python3 tools/ta.py --doi-chieu         # tự kiểm khớp với screen.json

  from ta import nap, do, tomtat
  d = nap('HPG'); S = do(d); print(tomtat(d, S))

ĐƠN VỊ: kho lưu giá bằng ĐỒNG (21050), khối lượng bằng CỔ PHIẾU. Mọi thứ dưới đây giữ
nguyên đơn vị đó — không tự chia 1000.
"""
import os, sys, json, math, datetime
from collections import deque

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HIST = os.path.join(BASE, "data", "hist")


# ─────────────────────────────────────────────── nền: sao y build_screen.py

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
    """RSI Wilder. KHÔNG phải RSI dùng SMA — hai cái lệch nhau vài điểm ở vùng quá mua,
    đủ để một bộ lọc 'RSI > 70' cho ra danh sách khác hẳn."""
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


# ─────────────────────────────────────────────── bổ sung: chuẩn ngành, kho chưa có

def ema_series(a, n):
    """EMA khởi động bằng SMA n phiên đầu — cùng quy ước TradingView/MetaStock. Khởi động
    bằng giá trị đầu tiên (cách hay gặp trong code mẫu) làm EMA lệch dai dẳng hàng trăm
    phiên, MACD vì thế cũng lệch theo."""
    out = [None] * len(a)
    if len(a) < n: return out
    k = 2.0 / (n + 1)
    e = sum(a[:n]) / n; out[n - 1] = e
    for i in range(n, len(a)):
        e = a[i] * k + e * (1 - k); out[i] = e
    return out


def macd_series(c, nhanh=12, cham=26, tin_hieu=9):
    """Trả (macd, signal, histogram). Signal là EMA của CHUỖI MACD tính từ phiên đầu tiên
    macd có giá trị — nên nó bắt đầu muộn hơn macd đúng `tin_hieu-1` phiên."""
    ef, es = ema_series(c, nhanh), ema_series(c, cham)
    macd = [None if (ef[i] is None or es[i] is None) else ef[i] - es[i] for i in range(len(c))]
    dau = next((i for i, x in enumerate(macd) if x is not None), None)
    sig = [None] * len(c); hist = [None] * len(c)
    if dau is not None:
        s = ema_series(macd[dau:], tin_hieu)
        for j, x in enumerate(s):
            if x is not None:
                sig[dau + j] = x; hist[dau + j] = macd[dau + j] - x
    return macd, sig, hist


def bollinger(c, n=20, k=2.0):
    """Trả (giữa, trên, dưới, %B, độ rộng %). Độ lệch chuẩn TOÀN THỂ (chia n), không phải
    mẫu (chia n-1) — đúng quy ước Bollinger gốc."""
    mid = roll_mean(c, n)
    tren = [None] * len(c); duoi = [None] * len(c); pb = [None] * len(c); bw = [None] * len(c)
    for i in range(len(c)):
        if mid[i] is None: continue
        m = mid[i]
        sd = math.sqrt(sum((c[j] - m) ** 2 for j in range(i - n + 1, i + 1)) / n)
        tren[i] = m + k * sd; duoi[i] = m - k * sd
        rong = tren[i] - duoi[i]
        pb[i] = (c[i] - duoi[i]) / rong if rong else None
        bw[i] = rong / m * 100 if m else None
    return mid, tren, duoi, pb, bw


def obv_series(c, v):
    out = [0.0] * len(c)
    for i in range(1, len(c)):
        if c[i] > c[i - 1]:   out[i] = out[i - 1] + (v[i] or 0)
        elif c[i] < c[i - 1]: out[i] = out[i - 1] - (v[i] or 0)
        else:                 out[i] = out[i - 1]
    return out


def stoch_series(h, l, c, n=14, d=3):
    k = [None] * len(c)
    hi, lo = roll_max(h, n), roll_min(l, n)
    for i in range(len(c)):
        if hi[i] is None or lo[i] is None: continue
        r = hi[i] - lo[i]
        k[i] = 50.0 if not r else (c[i] - lo[i]) / r * 100
    dd = [None] * len(c)
    for i in range(len(c)):
        cua = [k[j] for j in range(max(0, i - d + 1), i + 1) if k[j] is not None]
        if len(cua) == d: dd[i] = sum(cua) / d
    return k, dd


# ─────────────────────────────────────────────── đọc kho + đo

def nap(sym):
    """Đọc data/hist/{SYM}.json. Trả None nếu chưa có mã đó trong kho."""
    p = os.path.join(HIST, f"{sym.upper()}.json")
    if not os.path.exists(p): return None
    d = json.load(open(p, encoding="utf-8"))
    d["sym"] = sym.upper()
    return d


def do(d):
    """Toàn bộ chuỗi chỉ báo cho một mã. Mỗi chuỗi dài BẰNG số phiên, phần chưa đủ dữ
    liệu là None — giữ nguyên chỉ số phiên để ghép thẳng với d['t'] không phải căn lại."""
    c = d.get("c") or []; h = d.get("h") or []; l = d.get("l") or []; v = d.get("v") or []
    n = len(c)
    S = {}
    for w in (10, 20, 50, 150, 200):
        S[f"ma{w}"] = roll_mean(c, w) if n >= w else [None] * n
    S["ema12"], S["ema26"] = ema_series(c, 12), ema_series(c, 26)
    S["macd"], S["macdSig"], S["macdHist"] = macd_series(c)
    S["rsi"] = rsi_series(c)
    S["atr"] = atr_series(h, l, c)
    # Cùng quy ước "0 coi như không có" với `volr` ở dưới: mã đứng im tuyệt đối 14 phiên
    # cho ATR = 0, build_screen trả None. Bám theo để screen.json và ta.py không hai chuẩn.
    S["atrp"] = [None if not (S["atr"][i] and c[i]) else S["atr"][i] / c[i] * 100 for i in range(n)]
    S["bbMid"], S["bbUp"], S["bbLow"], S["bbPctB"], S["bbWidth"] = bollinger(c)
    S["obv"] = obv_series(c, v)
    S["stochK"], S["stochD"] = stoch_series(h, l, c)
    S["v20"] = roll_mean(v, 20) if n >= 20 else [None] * n
    # BÁM THEO build_screen.py: phiên KHÔNG có giao dịch (v=0) cho `None` chứ không cho 0.
    # Về ý nghĩa thì 0 đúng hơn — "hôm nay không ai mua bán" là một thông tin, còn None là
    # "không biết". Nhưng screen.json là bản đang chạy và bộ lọc trên trang đang dựa vào
    # nó, nên đổi ở đây là tự tạo ra hai chuẩn. Muốn sửa thì sửa cả hai cùng lúc.
    S["volr"] = [None if not (S["v20"][i] and v[i]) else v[i] / S["v20"][i] for i in range(n)]
    w52 = min(250, n) or 1
    S["hi52"], S["lo52"] = roll_max(h, w52), roll_min(l, w52)
    hi20, lo20 = roll_max(h, 20), roll_min(l, 20)
    S["tight"] = [None if (hi20[i] is None or not lo20[i]) else (hi20[i] / lo20[i] - 1) * 100 for i in range(n)]

    # dòng tiền phiên tăng / phiên giảm, cửa sổ 20 — sao y build_screen
    upv = [0.0] * n; dnv = [0.0] * n
    for i in range(1, n):
        if c[i] > c[i - 1]:   upv[i] = v[i] or 0
        elif c[i] < c[i - 1]: dnv[i] = v[i] or 0
    su, sd = roll_sum(upv, 20), roll_sum(dnv, 20)
    S["ud"] = [None if su[i] is None else (su[i] / sd[i] if sd[i] else 3.0) for i in range(n)]

    # ĐỈNH LUỸ KẾ + sụt so với đỉnh. Dùng đỉnh CẢ CHUỖI chứ không phải 52 tuần: đỉnh cũ
    # của phần lớn mã rơi vào 2021-2022, đo bằng 52 tuần thì mã sập bốn năm nay lại hiện
    # ra như chỉ mới giảm nhẹ. Đây đúng là con số mục "về bờ" đang hỏi.
    ath = [None] * n; dd = [None] * n
    m = None
    for i in range(n):
        m = c[i] if m is None else max(m, c[i])
        ath[i] = m
        dd[i] = (c[i] / m - 1) * 100 if m else None
    S["ath"], S["dath"] = ath, dd

    # khối ngoại luỹ kế theo GIÁ TRỊ (mua ròng × giá) — cộng dồn để nhìn xu hướng dòng tiền
    fb, fs = d.get("fb") or [], d.get("fs") or []
    nn = [None] * n; run = 0.0
    for i in range(n):
        if i < len(fb) and i < len(fs):
            run += ((fb[i] or 0) - (fs[i] or 0)) * (c[i] or 0)
        nn[i] = run
    S["nnCum"] = nn
    return S


def tomtat(d, S=None, i=-1):
    """Giá trị mọi chỉ báo tại MỘT phiên (mặc định phiên cuối), kèm vài số phái sinh."""
    if S is None: S = do(d)
    c = d.get("c") or []
    n = len(c)
    if not n: return {}
    if i < 0: i += n
    lay = lambda k: (S[k][i] if S.get(k) and i < len(S[k]) else None)
    ret = lambda k: (c[i] / c[i - k] - 1) * 100 if (i >= k and c[i - k]) else None
    r = {"sym": d.get("sym"), "phien": ngay(d["t"][i]), "i": i, "nsess": n,
         "c": c[i], "o": (d.get("o") or [None])[i], "h": (d.get("h") or [None])[i],
         "l": (d.get("l") or [None])[i], "v": (d.get("v") or [None])[i]}
    for k in ("ma10", "ma20", "ma50", "ma150", "ma200", "ema12", "ema26",
              "macd", "macdSig", "macdHist", "rsi", "atr", "atrp",
              "bbMid", "bbUp", "bbLow", "bbPctB", "bbWidth", "obv",
              "stochK", "stochD", "v20", "volr", "hi52", "lo52",
              "tight", "ud", "ath", "dath", "nnCum"):
        r[k] = lay(k)
    r["dhi52"] = (c[i] / S["hi52"][i] - 1) * 100 if lay("hi52") else None
    r["dlo52"] = (c[i] / S["lo52"][i] - 1) * 100 if lay("lo52") else None
    # độ dốc MA200 qua 21 phiên — điều kiện Trend Template, sao y build_screen
    r["m200s"] = None
    if lay("ma200") and i >= 21 and S["ma200"][i - 21]:
        r["m200s"] = (S["ma200"][i] / S["ma200"][i - 21] - 1) * 100
    for k in (5, 20, 60, 120, 250): r[f"r{k}"] = ret(k)
    return r


VN = datetime.timezone(datetime.timedelta(hours=7))
def ngay(ts): return datetime.datetime.fromtimestamp(ts, VN).strftime("%Y-%m-%d")


# ─────────────────────────────────────────────── tự kiểm: phải khớp screen.json

# Sao y `intish` trong build_screen.py: các trường này ghi ra screen.json làm tròn 0 chữ
# số thập phân, phần còn lại 2 chữ số. Sửa bên kia mà quên bên này thì lượt --doi-chieu
# sẽ kêu — đó chính là việc của nó.
INTISH = {'c', 'ma20', 'ma50', 'ma200', 'ma150', 'avgv20', 'avgval20', 'hi52', 'lo52',
          'nn20', 'nn60', 'streak', 'cross', 'rs', 'ath', 'dath', 'athP', 'nsess',
          'fs', 'fg1', 'fg2', 'fg3', 'fg4', 'fg5'}

# Trường đã bị round(...,2) NGAY TRONG analyse() trước khi rd() làm tròn lần nữa.
PRE2 = {'dath'}

def doi_chieu(gioihan=None):
    """So từng trường của ta.py với screen.json ĐANG DÙNG. Lệch quá 0,01% là kêu.

    Đây là thứ giữ cho hai bộ công thức không âm thầm trôi khỏi nhau: sửa build_screen mà
    quên sửa ta.py (hoặc ngược lại) thì lượt chạy này bắt được ngay, chứ không đợi tới lúc
    một con số trên trang không khớp với một con số trong bài phân tích.
    """
    sp = os.path.join(BASE, "data", "screen.json")
    if not os.path.exists(sp):
        print("không có data/screen.json để đối chiếu"); return 1
    sc = json.load(open(sp, encoding="utf-8"))
    # CẤU TRÚC: `f` là danh sách tên cột (KHÔNG có 'sym'), `d` là dict {mã: [giá trị...]}.
    # Mã nằm ở KHOÁ chứ không nằm trong hàng — đọc nhầm thành list-of-rows thì vòng lặp
    # chạy rỗng và báo "0 khớp, 0 lệch", trông y như đã kiểm xong. Đã dính đúng vậy.
    cot = sc["f"]; hang = sc["d"]
    MAP = {"c": "c", "ma20": "ma20", "ma50": "ma50", "ma200": "ma200", "ma150": "ma150",
           "rsi": "rsi", "atrp": "atrp", "avgv20": "v20", "volr": "volr", "ud": "ud",
           "hi52": "hi52", "lo52": "lo52", "tight": "tight", "m200s": "m200s",
           "dhi": "dhi52", "dlo": "dlo52", "dath": "dath"}
    xet = {k: v for k, v in MAP.items() if k in cot}
    ok = lech = thieu = 0
    xau = []
    syms = sorted(hang)
    if gioihan is not None: syms = syms[:gioihan]
    ds = syms
    for sym in syms:
        row = hang[sym]
        d = nap(sym)
        if not d or len(d.get("c") or []) < 60: thieu += 1; continue
        S = do(d); t = tomtat(d, S)
        for kc, kt in xet.items():
            a = row[cot.index(kc)]; b = t.get(kt)
            if a is None or b is None:
                if (a is None) != (b is None): lech += 1; xau.append((sym, kc, a, b))
                continue
            # screen.json ĐÃ LÀM TRÒN khi ghi — sao y bảng `intish`/`rd` của build_screen.py
            # rồi mới so. So thô với giá trị chưa làm tròn thì mọi trường đều "lệch", mà
            # đó chỉ là chữ số bị cắt lúc ghi file chứ không phải công thức khác nhau.
            # LÀM TRÒN HAI LẦN cho `dath`: build_screen đã round(...,2) ngay trong analyse
            # rồi rd() round tiếp về 0. Với giá trị sát mốc .5 thì một lần và hai lần cho
            # kết quả KHÁC NHAU (-77,4998 → một lần ra -77, hai lần ra -78). Không sao y
            # đúng thứ tự này thì phép so báo lệch giả ở đúng những mã sát mốc.
            if kc in PRE2: b = round(b, 2)
            if round(b, 0 if kc in INTISH else 2) == a: ok += 1
            else: lech += 1; xau.append((sym, kc, a, b))
    print(f"  đối chiếu ta.py ↔ screen.json ({len(ds)} mã, {len(xet)} trường)")
    print(f"    khớp   : {ok:,}")
    print(f"    lệch   : {lech:,}")
    print(f"    bỏ qua : {thieu} mã (chưa có kho / dưới 60 phiên)")
    for s, k, a, b in xau[:15]:
        print(f"      {s:<6} {k:<8} screen={a}  ta={b}")
    return 0 if lech == 0 else 2


# ─────────────────────────────────────────────── dòng lệnh

def main():
    av = sys.argv[1:]
    if "--doi-chieu" in av:
        gh = None
        if "--n" in av: gh = int(av[av.index("--n") + 1])
        sys.exit(doi_chieu(gh))
    if not av or av[0].startswith("-"):
        print(__doc__); sys.exit(1)
    sym = av[0].upper()
    d = nap(sym)
    if not d:
        print(f"không có {sym} trong kho ({HIST})"); sys.exit(1)
    S = do(d)
    if "--json" in av:
        json.dump({"sym": sym, "t": d["t"], "o": d["o"], "h": d["h"], "l": d["l"],
                   "c": d["c"], "v": d["v"], "fb": d.get("fb"), "fs": d.get("fs"), "ta": S},
                  sys.stdout, separators=(",", ":"))
        return
    if "--n" in av:
        n = int(av[av.index("--n") + 1])
        cot = ["ma20", "ma50", "ma200", "rsi", "macdHist", "bbPctB", "volr", "dath"]
        print(f"  {sym} — {n} phiên gần nhất (giá ĐỒNG)")
        print("  " + f"{'phiên':<11}{'đóng':>9}" + "".join(f"{k:>11}" for k in cot))
        for i in range(max(0, len(d["c"]) - n), len(d["c"])):
            t = tomtat(d, S, i)
            s = f"  {t['phien']:<11}{t['c']:>9,}"
            for k in cot:
                x = t.get(k)
                s += f"{'—':>11}" if x is None else f"{x:>11,.2f}"
            print(s)
        return
    t = tomtat(d, S)
    print(f"\n  {sym}  ·  phiên {t['phien']}  ·  {t['nsess']:,} phiên trong kho\n")
    nhom = [("giá", ["c", "o", "h", "l", "v"]),
            ("xu hướng", ["ma10", "ma20", "ma50", "ma150", "ma200", "m200s"]),
            ("động lượng", ["rsi", "macd", "macdSig", "macdHist", "stochK", "stochD"]),
            ("biến động", ["atr", "atrp", "bbUp", "bbMid", "bbLow", "bbPctB", "bbWidth", "tight"]),
            ("khối lượng", ["v20", "volr", "ud", "obv"]),
            ("vị thế", ["hi52", "lo52", "dhi52", "dlo52", "ath", "dath"]),
            ("lợi suất %", ["r5", "r20", "r60", "r120", "r250"]),
            ("khối ngoại", ["nnCum"])]
    for ten, ks in nhom:
        print(f"  ── {ten}")
        for k in ks:
            x = t.get(k)
            print(f"     {k:<10} {'—' if x is None else f'{x:,.2f}'}")
        print()


if __name__ == "__main__":
    main()
