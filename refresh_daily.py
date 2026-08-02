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
import json, os, re, sys, time, datetime, platform, urllib.request, concurrent.futures, threading

BASE=os.path.dirname(os.path.abspath(__file__))
UNIV=os.path.join(BASE,"universe.json")
EOD_DIR=os.path.join(BASE,"data","eod"); HIST_DIR=os.path.join(BASE,"data","hist")
FIN_DIR=os.path.join(BASE,"data","fin"); IDX_FILE=os.path.join(BASE,"data","idx.json")
NEWS_DIR=os.path.join(BASE,"data","news")
PROF_DIR=os.path.join(BASE,"data","profile")
SPARK=os.path.join(BASE,"data","spark.json"); HEALTH=os.path.join(BASE,"data","health.json")
HL={}   # health: kết quả từng bước của lượt chạy này -> data/health.json
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
        # nhận khi có %1 năm HOẶC có vốn hoá — mã mới niêm yết (như F88) thiếu %1y
        # nhưng vẫn có mcap, đừng vứt kẻo bị loại khỏi universe oan
        if o and (o.get("pct",{}).get("y") is not None or o.get("mcap")):
            stocks[sym].update({k:v for k,v in o.items() if v is not None}); sok+=1
        else: sfail+=1
        if (sok+sfail)%200==0: print(f"  simplize {sok+sfail}/{len(syms)} (fail {sfail})",flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(work_sz,syms))
print(f"Simplize: ok {sok}, fail {sfail} (giữ giá trị cũ nếu lỗi)",flush=True)
HL["simplize"]={"ok":sok,"fail":sfail}

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
            # Xác định đơn vị giá bằng ĐỐI CHIẾU THAM CHIẾU BẢNG GIÁ (luôn đúng VND),
            # không đoán theo ngưỡng nữa — mã giá ~500 nghìn (VNZ/HLB) từng bị đoán sai 1000 lần.
            last=j["c"][-1]; ref=(board.get(sym) or {}).get("ref") or 0
            if ref>0 and last>0:
                k=1000 if abs(last*1000-ref)<abs(last-ref) else 1
            else:
                k=1000 if last<500 else 1
            n=len(j["t"])
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
sparks={}   # sym -> 30 giá đóng cửa gần nhất (cho sparkline trang bảng giá)
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
    sparks[sym]=c[-30:]
    prices[sym]={"anc":{"m3":close_at(t,c,90),"m6":close_at(t,c,180),"last":c[-1]},
                 "close":c[-1],"vol":out["v"][-1],"o":out["o"][-1],"h":out["h"][-1],"l":out["l"][-1],
                 "ts":t[-1]}
    with hlock: hstats["new" if fresh else ("full" if fullfetch else "append")]+=1
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    list(pool.map(work_hist,syms))
print(f"kho lịch sử: backfill {hstats['new']}, nối {hstats['append']}, tải lại {hstats['full']}, lỗi {hstats['fail']}",flush=True)
HL["hist"]=dict(hstats); HL["board"]=len(board); HL["indices"]=len(indices)

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
HL["snapshot"]=len(snap)
# spark.json: 30 giá đóng cửa gần nhất mỗi mã — trang bảng giá vẽ sparkline bằng 1 file duy nhất
if len(sparks)>=100:
    jdump({"date":sess_date,"d":sparks},SPARK)
    print(f"ĐÃ LƯU spark.json ({len(sparks)} mã)",flush=True)
HL["spark"]=len(sparks)
if indices:
    try: hist_idx=json.load(open(IDX_FILE,encoding="utf-8"))
    except Exception: hist_idx=[]
    row={"date":sess_date}; row.update({i["name"]:i["value"] for i in indices})
    hist_idx=[r for r in hist_idx if r.get("date")!=sess_date]+[row]
    hist_idx.sort(key=lambda r:r["date"])
    jdump(hist_idx,IDX_FILE)

# 6) KHO TÀI CHÍNH data/fin/{SYM}.json — ĐỦ BỘ 3 BÁO CÁO (24hMoney) + cổ tức (Simplize)
#    view=2 KQKD · view=1 Cân đối kế toán · view=3 Lưu chuyển tiền tệ
#    Mã thiếu file HOẶC file chưa có CĐKT (schema cũ) thì cào; --full: cào lại toàn bộ.
os.makedirs(FIN_DIR,exist_ok=True)
def fin_stale(s):
    p=os.path.join(FIN_DIR,f"{s}.json")
    if not os.path.exists(p): return True
    try: return "bsQ" not in json.load(open(p,encoding="utf-8"))
    except Exception: return True
need=[s for s in syms if FULL or fin_stale(s)]
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
def parse_generic(d):    # CĐKT/LCTT: giữ nguyên mọi dòng {k,n,v[]}, kỳ CŨ -> MỚI
    H=d.get("headers") or []; rows=d.get("rows") or []
    labels=[(f"Q{h.get('quarter')}/{str(h.get('year'))[2:]}" if h.get("quarter") else str(h.get("year"))) for h in H]
    labels.reverse()
    out=[]
    for r in rows:
        v=[rnd(x) for x in (r.get("values") or [])]; v.reverse()
        out.append({"k":r.get("key"),"n":(r.get("name") or "").strip(),"v":v})
    return {"labels":labels,"rows":out} if labels and out else None
flock=threading.Lock(); fdone=[0,0]
def work_fin(sym):
    url=lambda v,p:f"https://api-finance-t19.24hmoney.vn/v1/web/company/financial-report?symbol={sym}&view={v}&period={p}&expanded=false"
    o={"sym":sym,"updated":sess_date,"Y":[],"Q":[],"div":[]}
    for key,p in (("Y",1),("Q",2)):     # KQKD năm + quý (format cũ, panel bong bóng đang dùng)
        for att in range(2):
            try:
                o[key]=parse_fin(get(url(2,p)).get("data") or {}); break
            except Exception: time.sleep(0.8*(att+1))
        time.sleep(0.08)
    for key,v,p in (("bsY",1,1),("bsQ",1,2),("cfY",3,1),("cfQ",3,2)):  # CĐKT + LCTT
        try:
            g=parse_generic(get(url(v,p)).get("data") or {})
            if g: o[key]=g
        except Exception: pass
        time.sleep(0.08)
    o["div"]=fetch_div(sym)
    with flock:
        fdone[0]+=1
        if o["Y"] or o["Q"] or o["div"]: fdone[1]+=1
        else: return                     # không có gì -> đừng ghi file rỗng
        if fdone[0]%100==0: print(f"  tài chính {fdone[0]}/{len(need)}",flush=True)
    jdump(o,os.path.join(FIN_DIR,f"{sym}.json"))
if need:
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(work_fin,need))
print(f"kho tài chính (KQKD+CĐKT+LCTT+cổ tức): cào {len(need)} mã, có dữ liệu {fdone[1]}",flush=True)
HL["fin"]={"need":len(need),"ok":fdone[1]}

# 7) KHO TIN TỨC + BÁO CÁO CTCK data/news/{SYM}.json — web tự rơi về đây khi nguồn sống chết
#    Hằng ngày: top 200 GTGD (tin đổi nhanh); --full T2: TOÀN BỘ mã.
os.makedirs(NEWS_DIR,exist_ok=True)
if FULL: ntargets=[s for s in syms if s in prices]
else:
    ntargets=sorted([s for s in syms if s in prices],
                    key=lambda s:-(board.get(s,{}).get("gtgd") or 0))[:200]
nlock=threading.Lock(); ndone=[0,0]
def work_news(sym):
    o={"sym":sym,"updated":sess_date,"news":[],"reports":[]}
    try:
        j=get(f"https://api2.simplize.vn/api/company/news-event/list?ticker={sym}&page=0&size=15")
        for n in j.get("data") or []:
            o["news"].append({"title":n.get("title"),"source":n.get("sourceNameDisplay") or n.get("sourceName") or "",
                              "ts":n.get("ts") or 0,"slug":n.get("slug"),"url":None})
    except Exception: pass
    time.sleep(0.08)
    try:
        j=get(f"https://api-finfo.vndirect.com.vn/v4/news?q=tagCodes:{sym}&sort=newsDate:desc&size=15&fields=newsDate,newsTime,newsTitle,newsSource,newsUrl")
        for n in j.get("data") or []:
            ts=0
            try:
                ts=int(datetime.datetime.strptime((n.get("newsDate") or "")+" "+(n.get("newsTime") or "00:00:00"),
                        "%Y-%m-%d %H:%M:%S").replace(tzinfo=VNTZ).timestamp()*1000)
            except Exception: pass
            o["news"].append({"title":n.get("newsTitle"),"source":n.get("newsSource") or "","ts":ts,
                              "slug":None,"url":n.get("newsUrl")})
    except Exception: pass
    time.sleep(0.08)
    try:
        j=get(f"https://api2.simplize.vn/api/company/analysis-report/list?ticker={sym}&page=0&size=12")
        o["total_reports"]=j.get("total") or 0
        for r in j.get("data") or []:
            o["reports"].append({"source":r.get("source") or "","rec":r.get("recommend") or "",
                "target":r.get("targetPrice"),"date":r.get("issueDate") or "",
                "title":r.get("title") or "","pdf":r.get("attachedLink") or ""})
    except Exception: pass
    seen=set(); dedup=[]
    for it in sorted(o["news"],key=lambda x:-(x.get("ts") or 0)):
        k=(it.get("title") or "").lower()[:45]
        if not k or k in seen: continue
        seen.add(k); dedup.append(it)
    o["news"]=dedup[:20]
    with nlock:
        ndone[0]+=1
        if o["news"] or o["reports"]: ndone[1]+=1
        else: return
        if ndone[0]%200==0: print(f"  tin tức {ndone[0]}/{len(ntargets)}",flush=True)
    jdump(o,os.path.join(NEWS_DIR,f"{sym}.json"))
if ntargets:
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(work_news,ntargets))
print(f"kho tin tức/báo cáo: cào {len(ntargets)} mã, có dữ liệu {ndone[1]}",flush=True)
HL["news"]={"need":len(ntargets),"ok":ndone[1]}

# 8) KHO HỒ SƠ DOANH NGHIỆP data/profile/{SYM}.json — giới thiệu, dịch vụ, chiến lược,
#    rủi ro, website + chỉ số chất lượng + CỔ ĐÔNG LỚN + QUỸ NẮM GIỮ + CÔNG TY CON/LIÊN KẾT
#    + cơ cấu sở hữu (v2). LÀM MỚI MỖI 3 NGÀY; file thiếu v2 tự cào lại.
os.makedirs(PROF_DIR,exist_ok=True)
# map tên -> mã: nhận diện cổ đông/công ty con là DN niêm yết để web cho bấm xem.
# Chỉ nhận khớp TUYỆT ĐỐI sau chuẩn hoá; tên trùng giữa 2 mã thì bỏ (thà thiếu link còn hơn sai).
def _pnorm(s):
    return re.sub(r"\s+"," ",str(s or "").strip().lower()).rstrip(" .,;")
def _pvariants(s):
    n=_pnorm(s)
    if not n: return set()
    v={n}
    if n.startswith("công ty cổ phần "): v.add("ctcp "+n[16:])
    if n.startswith("ctcp "): v.add("công ty cổ phần "+n[5:])
    for suf in (" joint stock company"," corporation"," corp"," jsc"):
        if n.endswith(suf): v.add(n[:-len(suf)].rstrip(" .,"))
    return v
NAME2SYM={}; _amb=set()
def _learn(name,sym):
    for k in _pvariants(name):
        if len(k)<5 or k in _amb: continue
        cur=NAME2SYM.get(k)
        if cur is None: NAME2SYM[k]=sym
        elif cur!=sym: _amb.add(k); NAME2SYM.pop(k,None)
for _s in syms: _learn(stocks[_s].get("name"),_s)
if os.path.isdir(PROF_DIR):
    for _fn in os.listdir(PROF_DIR):
        if not _fn.endswith(".json"): continue
        try:
            _j=json.load(open(os.path.join(PROF_DIR,_fn),encoding="utf-8"))
            _s=_j.get("sym") or _fn[:-5]
            if _s in stocks: _learn(_j.get("nameVi"),_s); _learn(_j.get("nameEn"),_s)
        except Exception: pass
def resolve_listed(name,self_sym=None):
    for k in _pvariants(name):
        t=NAME2SYM.get(k)
        if t and t!=self_sym: return t
    return None
# Việt hoá tên cổ đông (nguồn Simplize trả tiếng Anh): mã niêm yết -> tên SSI chuẩn;
# tổ chức nhà nước/quen thuộc -> từ điển; cá nhân "Họ (Tên Đệm...)" -> "Họ Đệm... Tên";
# hậu tố pháp lý JSC/Ltd -> CTCP/Công ty TNHH. CHỈ áp cho cổ đông Việt Nam.
VN_ORG={
 "state bank of vietnam":"Ngân hàng Nhà nước Việt Nam",
 "state capital investment corporation":"Tổng công ty Đầu tư và Kinh doanh vốn Nhà nước (SCIC)",
 "state capital investment corporation (scic)":"Tổng công ty Đầu tư và Kinh doanh vốn Nhà nước (SCIC)",
 "ministry of finance":"Bộ Tài chính","ministry of industry and trade":"Bộ Công Thương",
 "ministry of construction":"Bộ Xây dựng","ministry of health":"Bộ Y tế",
 "ministry of transport":"Bộ Giao thông Vận tải","ministry of defence":"Bộ Quốc phòng",
 "ministry of agriculture and rural development":"Bộ Nông nghiệp và Phát triển nông thôn",
 "vietnam national oil and gas group":"Tập đoàn Dầu khí Việt Nam (PVN)",
 "vietnam oil and gas group":"Tập đoàn Dầu khí Việt Nam (PVN)",
 "vietnam electricity":"Tập đoàn Điện lực Việt Nam (EVN)",
 "vietnam national coal - mineral industries holding corporation limited":"Tập đoàn Than - Khoáng sản Việt Nam (TKV)",
 "vietnam national coal-mineral industries holding corporation limited":"Tập đoàn Than - Khoáng sản Việt Nam (TKV)",
 "vietnam national chemical group":"Tập đoàn Hoá chất Việt Nam (Vinachem)",
 "vietnam rubber group":"Tập đoàn Công nghiệp Cao su Việt Nam",
 "vietnam posts and telecommunications group":"Tập đoàn Bưu chính Viễn thông Việt Nam (VNPT)",
 "vietnam national textile and garment group":"Tập đoàn Dệt may Việt Nam (Vinatex)",
 "vietnam airlines corporation":"Tổng công ty Hàng không Việt Nam",
 "vietnam maritime corporation":"Tổng công ty Hàng hải Việt Nam (VIMC)",
 "vietnam national shipping lines":"Tổng công ty Hàng hải Việt Nam (VIMC)",
 "vietnam railway corporation":"Tổng công ty Đường sắt Việt Nam",
 "vietnam northern food corporation":"Tổng công ty Lương thực miền Bắc",
 "vietnam southern food corporation":"Tổng công ty Lương thực miền Nam",
 "vietnam investment group joint stock company":"CTCP Tập đoàn Đầu tư Việt Nam",
 "masan corporation":"Tập đoàn Masan","masan corp":"Tập đoàn Masan",
 "hanoi people's committee":"UBND Thành phố Hà Nội",
 "ho chi minh city people's committee":"UBND TP. Hồ Chí Minh",
 "vietnam bank for agriculture and rural development":"Ngân hàng Nông nghiệp và PTNT Việt Nam (Agribank)",
 "viettel group":"Tập đoàn Công nghiệp - Viễn thông Quân đội (Viettel)",
 "military telecommunications group":"Tập đoàn Công nghiệp - Viễn thông Quân đội (Viettel)",
}
def _fixcaps(s):
    if not s.isupper() or len(s)<8: return s     # tên VIẾT HOA TOÀN BỘ -> hoa chữ đầu
    w=s.split()
    return " ".join([w[0]]+[x.capitalize() if len(x)>3 else x.lower() for x in w[1:]])
def viet_name(nm,country,tick=None):
    if tick and tick in stocks and stocks[tick].get("name"): return stocks[tick]["name"]
    if (country or "").strip().lower() not in ("vietnam","việt nam","viet nam"): return nm
    low=_pnorm(nm)
    if low in VN_ORG: return VN_ORG[low]
    m=re.match(r"^([A-Za-zÀ-ỹ]+)\s*\(\s*(?:mr|ms|mrs|dr)?\.?\s*([^)]+?)\s*\)$",nm.strip(),re.I)
    if m:  # cá nhân: "Họ (Tên Đệm...)" -> "Họ Đệm... Tên"
        p=m.group(2).split()
        return (m.group(1)+" "+" ".join(p[1:])+" "+p[0]).replace("  "," ").strip()
    n=re.sub(r"[\s,]*joint\s+stock\s+company$","",nm,flags=re.I)
    if n!=nm: return "CTCP "+_fixcaps(n.strip(" ,."))
    n=re.sub(r"[\s,]*(company\s+limited|company\s+ltd\.?|co\.?\s*,?\s*ltd\.?|limited)$","",nm,flags=re.I)
    if n!=nm: return "Công ty TNHH "+_fixcaps(n.strip(" ,."))
    return _fixcaps(nm)
def prof_stale(s):
    p=os.path.join(PROF_DIR,f"{s}.json")
    try:
        j=json.load(open(p,encoding="utf-8"))
        if j.get("v")!=2: return True          # bản cũ chưa có cổ đông/cty con -> cào lại
        u=j.get("updated","2000-01-01")
        return (datetime.date.fromisoformat(sess_date)-datetime.date.fromisoformat(u)).days>=3
    except Exception: return True
ptargets=[s for s in syms if prof_stale(s)]
plock=threading.Lock(); pdone=[0,0]
def fetch_ownership(sym,o):
    """Điền sh (cổ đông lớn) / funds (quỹ nắm giữ) / subs (cty con-liên kết) / own (cơ cấu) vào o."""
    try:
        sh=get(f"https://api2.simplize.vn/api/company/ownership/shareholder-fund-details/{sym}?page=0&size=100")["data"] or {}
        seen=set(); out=[]
        for r in sh.get("shareholderDetails") or []:
            nm=re.sub(r"\s+"," ",(r.get("investorFullName") or "").strip())
            if not nm or nm.lower() in seen: continue
            seen.add(nm.lower())
            t=resolve_listed(nm,sym)
            e={"n":viet_name(nm,r.get("countryOfInvestor"),t),
               "p":rnd(r.get("pctOfSharesOutHeld")),"s":r.get("sharesHeld"),"c":r.get("countryOfInvestor")}
            if t: e["t"]=t
            out.append({k:v for k,v in e.items() if v is not None})
        if out: o["sh"]=out[:40]
        ff=[{"n":f.get("fundCode"),"fn":f.get("fundName"),"s":f.get("sharesHeld"),
             "v":f.get("sharesHeldValueVnd"),"d":f.get("fillingDate")}
            for f in sh.get("fundHoldings") or [] if f.get("sharesHeld")]
        if ff:
            o["funds"]=[{k:v for k,v in f.items() if v is not None}
                        for f in sorted(ff,key=lambda x:-(x.get("v") or 0))[:12]]
    except Exception: pass
    time.sleep(0.06)
    try:
        ss=[]
        for r in get(f"https://api2.simplize.vn/api/company/sub-company/{sym}")["data"] or []:
            if not r.get("companyName"): continue
            e={"n":re.sub(r"\s+"," ",r["companyName"].strip()),"p":rnd(r.get("ratio")),"cap":r.get("capital")}
            if r.get("type")=="ASSOCIATED": e["a"]=1
            t=(r.get("companyTicker") or "").strip().upper()
            if t and t in stocks and t!=sym: e["t"]=t
            elif e["n"]:
                t2=resolve_listed(e["n"],sym)
                if t2: e["t"]=t2
            ss.append({k:v for k,v in e.items() if v is not None})
        if ss: o["subs"]=sorted(ss,key=lambda x:-(x.get("p") or 0))
    except Exception: pass
    time.sleep(0.06)
    try:
        oo=[{"n":x.get("investorType"),"p":rnd(x.get("pctOfSharesOutHeldTier"))}
            for x in get(f"https://api2.simplize.vn/api/company/ownership/ownership-breakdown/{sym}")["data"] or []
            if x.get("investorType") and x.get("pctOfSharesOutHeldTier")]
        if oo: o["own"]=oo
    except Exception: pass
def work_prof(sym):
    d=None
    for att in range(2):
        try:
            d=get(f"https://api2.simplize.vn/api/company/summary/{sym}")["data"]; break
        except Exception: time.sleep(0.8*(att+1))
    time.sleep(0.1)
    with plock: pdone[0]+=1
    if not d: return
    o={"sym":sym,"updated":sess_date,"v":2,
       "nameVi":d.get("nameVi"),"nameEn":d.get("nameEn"),
       "website":d.get("website"),"exchange":d.get("stockExchange"),
       "industry":d.get("industryActivity"),"sectorParent":d.get("bcEconomicSectorName"),
       "overview":d.get("businessOverall") or d.get("businessLine"),
       "services":d.get("mainService"),"strategy":d.get("businessStrategy"),"risk":d.get("businessRisk"),
       "roe":rnd(d.get("roe")),"roa":rnd(d.get("roa")),"beta5y":d.get("beta5y"),
       "freeFloat":d.get("freeFloatRate"),"bookValue":d.get("bookValue"),
       "eps":rnd(d.get("epsRatio")),"evEbitda":rnd(d.get("evEbitdaRatio")),
       "revLtmGrowth":rnd(d.get("revenueLtmGrowth")),"npLtmGrowth":rnd(d.get("netIncomeLtmGrowth")),
       "riskLevel":d.get("overallRiskLevel"),"shares":d.get("outstandingSharesValue")}
    _learn(o.get("nameVi"),sym); _learn(o.get("nameEn"),sym)
    fetch_ownership(sym,o)
    o={k:v for k,v in o.items() if v not in (None,"")}
    with plock:
        pdone[1]+=1
        if pdone[0]%300==0: print(f"  hồ sơ {pdone[0]}/{len(ptargets)}",flush=True)
    jdump(o,os.path.join(PROF_DIR,f"{sym}.json"))
if ptargets:
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(work_prof,ptargets))
print(f"kho hồ sơ doanh nghiệp: cào {len(ptargets)} mã, ok {pdone[1]} (chu kỳ 3 ngày)",flush=True)
HL["profile"]={"need":len(ptargets),"ok":pdone[1]}

# 9) KHO LOGO assets/logo/{SYM}.webp — mã mới niêm yết tự có logo, không phải đụng tay.
#    (Kho gốc dựng 1 lần bằng tools/fetch_logos.py; ở đây chỉ vá phần thiếu.)
LOGO_DIR=os.path.join(BASE,"assets","logo")
os.makedirs(LOGO_DIR,exist_ok=True)
lmiss=[s for s in syms if stocks[s].get("img") and not os.path.exists(os.path.join(LOGO_DIR,f"{s}.webp"))]
if lmiss:
    try:
        sys.path.insert(0,os.path.join(BASE,"tools"))
        from fetch_logos import fetch_one
        lok=0
        for s in lmiss[:60]:                      # trần an toàn: mỗi lượt chạy tối đa 60 mã
            if fetch_one(s,stocks[s]["img"],os.path.join(LOGO_DIR,f"{s}.webp")): lok+=1
        print(f"kho logo: thiếu {len(lmiss)}, tải thêm {lok}",flush=True)
        HL["logo"]={"missing":len(lmiss),"fetched":lok}
    except ImportError as e:                      # thiếu Pillow -> bỏ qua, web tự rơi về CDN nguồn
        print(f"kho logo: BỎ QUA ({e}) — cài Pillow để tự tải logo mã mới",flush=True)
        HL["logo"]={"missing":len(lmiss),"fetched":0,"err":"no-pillow"}
else:
    HL["logo"]={"missing":0,"fetched":0}

# 10) health.json — nhật ký sức khoẻ lượt chạy (web + người vận hành đọc để tự chẩn đoán)
runner="actions" if os.environ.get("GITHUB_ACTIONS") else ("server" if platform.system()=="Windows" else "local")
HL_ok=(HL.get("hist",{}).get("fail",9999)<len(syms)*0.2 and HL.get("snapshot",0)>=100)
jdump({"date":sess_date,"generated":vn_now().strftime("%Y-%m-%d %H:%M:%S"),"runner":runner,
       "full":FULL,"total_syms":len(syms),"ok":HL_ok,"steps":HL},HEALTH)
print(f"health.json: ok={HL_ok} runner={runner}",flush=True)
print("XONG.",flush=True)
