#!/usr/bin/env python3
"""
CPVN — cập nhật EOD hằng ngày + KHO DỮ LIỆU VĨNH VIỄN trong repo (số liệu không bao giờ mất).
Chạy sau 15h (giờ VN), Thứ 2–6:
  1) Làm mới universe.json: mốc giá m3/m6 (VPS), % điều chỉnh w/m/y/y5 + vốn hoá + ngành (Simplize).
  2) Bảng giá VPS cuối phiên (NN, trần/sàn/TC) + chỉ số VNINDEX/VN30/HNX/UPCOM.
  3) KHO LỊCH SỬ data/hist/{SYM}.json: toàn bộ nến ngày OHLCV + NN mua/bán của TỪNG mã.
     Mã chưa có file -> tự cào đủ ~6.5 năm (backfill); ngày thường chỉ NỐI phiên mới.
  4) Snapshot EOD -> data/eod/{NGÀY_PHIÊN}.json + data/eod/latest.json
     (client CHỈ tải latest.json ~100KB — "dữ liệu hôm nay"), nối chỉ số vào data/idx.json.
  5) KHO KQKD data/fin/{SYM}.json: doanh thu/LN quý & năm + cổ tức (mã thiếu file thì cào).
`--full` (đặt lịch Thứ 2): thêm SLCP/ngành/logo/PE/PB/cổ tức; TẢI LẠI toàn bộ lịch sử nến
(đồng bộ giá điều chỉnh sau chia cổ tức/tách CP); cào lại KQKD tất cả mã. Không cần token.
Web ưu tiên API sống, tự rơi về kho này khi API lỗi.
"""
import json, os, re, sys, time, datetime, urllib.request, concurrent.futures, threading

BASE=os.path.dirname(os.path.abspath(__file__))
UNIV=os.path.join(BASE,"universe.json")
EOD_DIR=os.path.join(BASE,"data","eod"); HIST_DIR=os.path.join(BASE,"data","hist")
FIN_DIR=os.path.join(BASE,"data","fin"); IDX_FILE=os.path.join(BASE,"data","idx.json")
UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120"}
FULL="--full" in sys.argv; NOW=int(time.time())
BACKFILL_D=2400; DAILY_D=260          # backfill ~6.5 năm; ngày thường chỉ cần 260 ngày (mốc m3/m6)
VNTZ=datetime.timezone(datetime.timedelta(hours=7))
def get(url,timeout=20):
    with urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=timeout) as r:
        return json.loads(r.read().decode())
def jdump(obj,path):                   # ghi JSON gọn (không khoảng trắng) + atomic
    tmp=path+".tmp"
    json.dump(obj,open(tmp,"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
    os.replace(tmp,path)
def vn_now(): return datetime.datetime.now(VNTZ)
def vn_day(ts): return datetime.datetime.fromtimestamp(ts,VNTZ).strftime("%Y-%m-%d")
def rnd(x,n=2): return round(x,n) if isinstance(x,(int,float)) else None

u=json.load(open(UNIV,encoding="utf-8"))
stocks={s["sym"]:s for s in u["stocks"]}
print(f"universe: {len(stocks)} mã",flush=True)

# 0) --full: ĐỒNG BỘ danh sách mã từ SSI (thêm mã mới niêm yết, đủ HOSE+HNX+UPCOM)
if FULL:
    added=0
    for ex,slug in [("HOSE","hose"),("HNX","hnx"),("UPCOM","upcom")]:
        try:
            for x in get(f"https://iboard-query.ssi.com.vn/stock/exchange/{slug}")["data"]:
                if x.get("stockType")!="s": continue
                sym=x["stockSymbol"]
                if sym not in stocks:
                    stocks[sym]={"sym":sym,"ex":ex,"name":x.get("companyNameVi") or sym}; added+=1
                else: stocks[sym]["ex"]=ex   # cập nhật nếu mã chuyển sàn
        except Exception as e: print("  SSI",ex,"lỗi:",e,flush=True)
    print(f"--full: đồng bộ SSI, thêm {added} mã mới, tổng {len(stocks)}",flush=True)
syms=list(stocks)

# 1) Simplize summary -> % điều chỉnh + vốn hoá (+ ngành/SLCP/logo/PE/PB/cổ tức nếu --full)
lock=threading.Lock(); sok=sfail=0
def fetch_simplize(sym):
    for att in range(2):
        try:
            d=get(f"https://api2.simplize.vn/api/company/summary/{sym}")["data"]
            o={"mcap":d.get("marketCap"),
               "pct":{"w":d.get("pricePctChg7d"),"m":d.get("pricePctChg30d"),
                      "y":d.get("pricePctChg1y"),"y5":d.get("pricePctChg5y")}}
            if FULL:
                o.update({"shares":d.get("outstandingSharesValue"),
                    "sector":(d.get("industryActivity") or "").strip() or None,
                    "sectorKey":d.get("bcIndustryGroupSlug"),"parent":d.get("bcEconomicSectorName"),
                    "img":d.get("imageUrl"),"pe":d.get("peRatio"),"pb":d.get("pbRatio"),
                    "divY":d.get("dividendYieldCurrent")})
            return o
        except Exception:
            time.sleep(1.0*(att+1))
    return None
def work_sz(sym):
    global sok,sfail
    time.sleep(0.15)
    o=fetch_simplize(sym)
    with lock:
        if o and o.get("pct",{}).get("y") is not None:
            stocks[sym].update({k:v for k,v in o.items() if v is not None}); sok+=1
        else: sfail+=1
        if (sok+sfail)%200==0: print(f"  simplize {sok+sfail}/{len(syms)} (fail {sfail})",flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(work_sz,syms))
print(f"Simplize: ok {sok}, fail {sfail} (giữ giá trị cũ nếu lỗi)",flush=True)

# 2) bảng giá cuối phiên -> NN + trần/sàn/tham chiếu (chạy TRƯỚC kho hist để ghi NN hôm nay)
board={}
for i in range(0,len(syms),150):
    try:
        for x in get("https://bgapidatafeed.vps.com.vn/getliststockdata/"+",".join(syms[i:i+150])):
            board[x["sym"]]={"ref":(float(x.get("r") or 0))*1000,"ceil":(float(x.get("c") or 0))*1000,
                "floor":(float(x.get("f") or 0))*1000,"fBuy":(float(x.get("fBVol") or 0))*10,
                "fSell":(float(x.get("fSVolume") or 0))*10,
                "gtgd":(float(x.get("avePrice") or 0))*1000*(float(x.get("lot") or 0))*10}
    except Exception as e: print("  board lỗi:",e,flush=True)
print(f"bảng giá: {len(board)} mã",flush=True)

# 2b) chỉ số VNINDEX/VN30/HNX/UPCOM (lưu vào snapshot + idx.json để web có dự phòng)
IDX_NAMES={"10":"VNINDEX","11":"VN30","02":"HNX","03":"UPCOM"}
indices=[]
try:
    for x in get("https://bgapidatafeed.vps.com.vn/getlistindexdetail/10,11,02,03") or []:
        if not x: continue
        v=float(x.get("cIndex") or 0); ref=float(x.get("oIndex") or 0)
        if v>0: indices.append({"name":IDX_NAMES.get(str(x.get("mc")),str(x.get("mc"))),
                                "value":round(v,2),"chg":round((v-ref)/ref*100,2) if ref else 0})
except Exception as e: print("  chỉ số lỗi:",e,flush=True)

# 3) KHO LỊCH SỬ data/hist/{SYM}.json + mốc giá m3/m6/last cho universe
os.makedirs(HIST_DIR,exist_ok=True)
def close_at(t,c,days):
    tgt=NOW-days*86400; v=None
    for i in range(len(t)):
        if t[i]<=tgt: v=c[i]
        else: break
    return v if v is not None else (c[0] if c else None)
def fetch_hist(sym,days):
    for att in range(2):
        try:
            j=get(f"https://histdatafeed.vps.com.vn/tradingview/history?symbol={sym}&resolution=1D&from={NOW-days*86400}&to={NOW}")
            if j.get("s")!="ok" or not j.get("c"): return None
            k=1000 if j["c"][-1]<500 else 1; n=len(j["t"])
            gi=lambda a,i: (a[i] if a and i<len(a) and a[i] is not None else j["c"][i])
            return {"t":j["t"],
                    "o":[round(gi(j.get("o"),i)*k) for i in range(n)],
                    "h":[round(gi(j.get("h"),i)*k) for i in range(n)],
                    "l":[round(gi(j.get("l"),i)*k) for i in range(n)],
                    "c":[round(x*k) for x in j["c"]],
                    "v":[int(j["v"][i] or 0) if j.get("v") and i<len(j["v"]) else 0 for i in range(n)]}
        except Exception: time.sleep(0.8*(att+1))
    return None
def fetch_foreign30(sym):   # seed NN 30 phiên gần nhất (24hMoney) khi backfill lần đầu
    try:
        d=get(f"https://api-finance-t19.24hmoney.vn/v1/ios/stock/foreign-trading-history?symbol={sym}").get("data") or []
        return {vn_day(int(x["trading_date"])):(int(x.get("buy_foreign_qtty") or 0),
                                                int(x.get("sell_foreign_qtty") or 0)) for x in d}
    except Exception: return None
hlock=threading.Lock(); hstats={"new":0,"append":0,"full":0,"fail":0}
prices={}   # sym -> anc/close/vol/o/h/l/ts (cho universe + snapshot)
def work_hist(sym):
    path=os.path.join(HIST_DIR,f"{sym}.json")
    fresh=not os.path.exists(path)
    old=None
    if not fresh:
        try: old=json.load(open(path,encoding="utf-8"))
        except Exception: old=None
    fullfetch=fresh or FULL or old is None
    d=fetch_hist(sym, BACKFILL_D if fullfetch else DAILY_D)
    if not d or not d["t"]:
        with hlock: hstats["fail"]+=1
        return
    fbfs={}                                       # ngày -> (NN mua, NN bán); VPS không có NN lịch sử
    if old:                                       # -> luôn GIỮ NN đã lưu, không bao giờ mất
        for i,tt in enumerate(old.get("t") or []):
            fb=(old.get("fb") or [])[i] if i<len(old.get("fb") or []) else 0
            fs=(old.get("fs") or [])[i] if i<len(old.get("fs") or []) else 0
            if fb or fs: fbfs[vn_day(tt)]=(fb,fs)
    if fresh or FULL:      # backfill lần đầu + --full T2: vá lại NN 30 phiên gần nhất
        f30=fetch_foreign30(sym)   # -> ngày nào Actions lỡ/lỗi cũng được bù NN trong vòng 1 tuần
        if f30: fbfs.update(f30)
    if fullfetch:
        out=d
        # nếu VPS trả thiếu quá khứ so với file đã lưu -> ghép phần cũ lại (không mất dữ liệu)
        if old and (old.get("t") or []) and old["t"][0]<d["t"][0]:
            cut=0
            while cut<len(old["t"]) and old["t"][cut]<d["t"][0]: cut+=1
            for k2 in ("t","o","h","l","c","v"): out[k2]=old[k2][:cut]+out[k2]
    else:                                         # ngày thường: nối phiên mới vào file cũ
        out=old; lastt=out["t"][-1] if out["t"] else 0
        for i,tt in enumerate(d["t"]):
            if tt>lastt:
                for k2 in ("t","o","h","l","c","v"): out[k2].append(d[k2][i])
    b=board.get(sym) or {}
    if out["t"] and (b.get("fBuy") or b.get("fSell")):   # NN phiên hôm nay từ bảng giá
        fbfs[vn_day(out["t"][-1])]=(int(b.get("fBuy") or 0),int(b.get("fSell") or 0))
    out["fb"]=[]; out["fs"]=[]
    for tt in out["t"]:
        fb,fs=fbfs.get(vn_day(tt),(0,0))
        out["fb"].append(fb); out["fs"].append(fs)
    out["sym"]=sym
    jdump(out,path)
    t,c=out["t"],out["c"]
    prices[sym]={"anc":{"m3":close_at(t,c,90),"m6":close_at(t,c,180),"last":c[-1]},
                 "close":c[-1],"vol":out["v"][-1],"o":out["o"][-1],"h":out["h"][-1],"l":out["l"][-1],
                 "ts":t[-1]}
    with hlock: hstats["new" if fresh else ("full" if fullfetch else "append")]+=1
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    list(pool.map(work_hist,syms))
print(f"kho lịch sử: backfill {hstats['new']}, nối {hstats['append']}, tải lại {hstats['full']}, lỗi {hstats['fail']}",flush=True)

# 4) ghép mốc giá + vốn hoá (=SLCP×giá đóng cửa nếu Simplize thiếu) vào universe
for sym,s in stocks.items():
    p=prices.get(sym)
    if p:
        s["anc"]=p["anc"]
        if not s.get("mcap") and s.get("shares"): s["mcap"]=s["shares"]*p["close"]

# --full: bỏ UPCOM không có dữ liệu (rác thanh khoản); luôn giữ HOSE/HNX. Làm mới rổ chỉ số.
keep=stocks.values()
if FULL:
    keep=[s for s in stocks.values() if s.get("mcap") or s["ex"] in ("HOSE","HNX")]
    def idx(n):
        try: return get(f"https://bgapidatafeed.vps.com.vn/getlistckindex/{n}")
        except Exception: return u.get({"VN30":"vn30","HNX30":"hnx30"}[n],[])
    u["vn30"]=idx("VN30"); u["hnx30"]=idx("HNX30")

# ngày PHIÊN = ngày của nến cuối cùng (chạy cuối tuần vẫn ghi đúng ngày Thứ 6)
sess_date=vn_day(max((p["ts"] for p in prices.values()),default=NOW))
today=vn_now().strftime("%Y-%m-%d")
u["stocks"]=sorted(keep,key=lambda s:-(s.get("mcap") or 0))
u["generated"]=today; u["ancDate"]=sess_date
jdump(u,UNIV)
print(f"ĐÃ CẬP NHẬT universe.json ({len(u['stocks'])} mã, phiên {sess_date})",flush=True)

# 5) snapshot EOD (client chỉ tải latest.json) + lịch sử chỉ số
os.makedirs(EOD_DIR,exist_ok=True)
snap=[]
for sym in syms:
    p,b=prices.get(sym),board.get(sym,{})
    if not p: continue
    snap.append({"sym":sym,"close":p["close"],"o":p["o"],"h":p["h"],"l":p["l"],"vol":p["vol"],
        "ref":b.get("ref"),"ceil":b.get("ceil"),"floor":b.get("floor"),"fBuy":b.get("fBuy"),
        "fSell":b.get("fSell"),"gtgd":b.get("gtgd")})
if len(snap)>=100:                    # chống ghi đè kho bằng dữ liệu rỗng khi VPS sập
    doc={"date":sess_date,"generated":vn_now().strftime("%Y-%m-%d %H:%M"),
         "count":len(snap),"indices":indices,"data":snap}
    jdump(doc,os.path.join(EOD_DIR,f"{sess_date}.json"))
    jdump(doc,os.path.join(EOD_DIR,"latest.json"))
    print(f"ĐÃ LƯU snapshot EOD phiên {sess_date} ({len(snap)} mã) + latest.json",flush=True)
else:
    print(f"BỎ QUA snapshot: chỉ có {len(snap)} mã (VPS lỗi?) — giữ nguyên latest.json cũ",flush=True)
if indices:
    try: hist_idx=json.load(open(IDX_FILE,encoding="utf-8"))
    except Exception: hist_idx=[]
    row={"date":sess_date}; row.update({i["name"]:i["value"] for i in indices})
    hist_idx=[r for r in hist_idx if r.get("date")!=sess_date]+[row]
    hist_idx.sort(key=lambda r:r["date"])
    jdump(hist_idx,IDX_FILE)

# 6) KHO KQKD + CỔ TỨC data/fin/{SYM}.json (24hMoney + Simplize)
#    Mã thiếu file thì cào (lần đầu = backfill tất cả); --full: cào lại toàn bộ.
os.makedirs(FIN_DIR,exist_ok=True)
need=[s for s in syms if FULL or not os.path.exists(os.path.join(FIN_DIR,f"{s}.json"))]
RX_RATIO=re.compile(r"tỷ lệ\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)",re.I)
RX_FY=re.compile(r"năm\s*(\d{4})")
RX_DIVCP=re.compile(r"cổ tức.*cổ phiếu",re.I)
def parse_fin(d):        # cùng logic với web: isa3 DT, isa4 giá vốn, isa5 LN gộp, isa20/22 LNST
    H=d.get("headers") or []; rows=d.get("rows") or []
    def row(*keys):
        for k in keys:
            r=next((x for x in rows if x.get("key")==k),None)
            if r: return r.get("values") or []
        return []
    rev=row("total_revenue","isa3","isi64"); cogs=row("total_cost","isa4")
    gross=row("isa5","isi87"); pretax=row("isa16")
    np=row("isa22","isa20"); gm=row("gross_profit_margin"); nm=row("net_profit_margin")
    out=[]
    for i,h in enumerate(H):
        y=h.get("year"); q=h.get("quarter")
        g=lambda a:(rnd(a[i]) if i<len(a) else None)
        out.append({"label":(f"Q{q}/{str(y)[2:]}" if q else str(y)),
                    "rev":g(rev),"cogs":g(cogs),"gross":g(gross),
                    "pretax":g(pretax),"np":g(np),"gm":g(gm),"nm":g(nm)})
    out.reverse()        # cũ -> mới, khớp thứ tự client dùng
    return out
def fetch_div(sym):      # cổ tức TIỀN MẶT (histories) + CP/thưởng (events, parse tỉ lệ)
    by={}
    try:
        for x in get(f"https://api.simplize.vn/api/company/dividend/histories/{sym}").get("data") or []:
            y=int(x.get("year") or 0)
            if y: by.setdefault(y,{"year":y,"cash":0,"div":0,"bonus":0})["cash"]=x.get("total") or 0
    except Exception: pass
    time.sleep(0.1)
    try:
        for e in get(f"https://api.simplize.vn/api/company/events/list?ticker={sym}&type=&page=0&size=200").get("data") or []:
            t=e.get("eventTypeName") or ""; desc=e.get("description") or ""
            is_bonus="thưởng" in t.lower(); is_div=bool(RX_DIVCP.search(t))
            if not is_bonus and not is_div: continue
            m=RX_RATIO.search(desc)
            if not m: continue
            pct=float(m.group(2))/float(m.group(1))*100
            ex=(e.get("exDividendDate") or "").split("/")
            ex_y=int(ex[2]) if len(ex)==3 and ex[2].isdigit() else 0
            if is_bonus: y=ex_y                       # thưởng: năm chốt quyền
            else:
                fy=RX_FY.search(desc)                 # cổ tức CP: năm tài chính, thiếu -> ex−1
                y=int(fy.group(1)) if fy else (ex_y-1 if ex_y else 0)
            if not y: continue
            r=by.setdefault(y,{"year":y,"cash":0,"div":0,"bonus":0})
            r["bonus" if is_bonus else "div"]+=pct
    except Exception: pass
    out=sorted(by.values(),key=lambda r:-r["year"])
    for r in out: r["div"]=rnd(r["div"],1); r["bonus"]=rnd(r["bonus"],1)
    return out
flock=threading.Lock(); fdone=[0,0]
def work_fin(sym):
    url=lambda p:f"https://api-finance-t19.24hmoney.vn/v1/web/company/financial-report?symbol={sym}&view=2&period={p}&expanded=false"
    o={"sym":sym,"updated":sess_date,"Y":[],"Q":[],"div":[]}
    for key,p in (("Y",1),("Q",2)):
        for att in range(2):
            try:
                o[key]=parse_fin(get(url(p)).get("data") or {}); break
            except Exception: time.sleep(0.8*(att+1))
        time.sleep(0.1)
    o["div"]=fetch_div(sym)
    with flock:
        fdone[0]+=1
        if o["Y"] or o["Q"] or o["div"]: fdone[1]+=1
        else: return                     # không có gì -> đừng ghi file rỗng
        if fdone[0]%100==0: print(f"  KQKD {fdone[0]}/{len(need)}",flush=True)
    jdump(o,os.path.join(FIN_DIR,f"{sym}.json"))
if need:
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(work_fin,need))
print(f"kho KQKD/cổ tức: cào {len(need)} mã, có dữ liệu {fdone[1]}",flush=True)
print("XONG.",flush=True)
