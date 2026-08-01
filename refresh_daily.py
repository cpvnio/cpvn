#!/usr/bin/env python3
"""
CPVN — cập nhật EOD hằng ngày (khớp universe v2: ngành chi tiết + % điều chỉnh + UPCOM).
Chạy sau 15h (giờ VN), Thứ 2–6:
  1) Làm mới universe.json: mốc giá m3/m6 (VPS), % điều chỉnh w/m/y/y5 + vốn hoá + ngành (Simplize).
  2) Lưu snapshot EOD -> data/eod/YYYY-MM-DD.json (giá/KLGD/NN chốt phiên).
`--full` (nên đặt lịch Thứ 2): làm mới thêm SLCP/ngành/logo/PE/PB/cổ tức. Không cần token.
"""
import json, os, sys, time, datetime, urllib.request, concurrent.futures, threading

BASE=os.path.dirname(os.path.abspath(__file__))
UNIV=os.path.join(BASE,"universe.json"); EOD_DIR=os.path.join(BASE,"data","eod")
UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120"}
FULL="--full" in sys.argv; NOW=int(time.time())
def get(url,timeout=15):
    with urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=timeout) as r:
        return json.loads(r.read().decode())
def vn_now(): return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))

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

# 2) VPS histdatafeed -> mốc m3/m6/last + giá/KLGD đóng cửa hôm nay
def close_at(t,c,days):
    tgt=NOW-days*86400; v=None
    for i in range(len(t)):
        if t[i]<=tgt: v=c[i]
        else: break
    return v if v is not None else (c[0] if c else None)
def fetch_px(sym):
    try:
        j=get(f"https://histdatafeed.vps.com.vn/tradingview/history?symbol={sym}&resolution=1D&from={NOW-260*86400}&to={NOW}")
        if j.get("s")!="ok" or not j.get("c"): return sym,None
        t,c=j["t"],j["c"]; v=j.get("v",[]); k=1000 if c[-1]<500 else 1; cc=[x*k for x in c]
        return sym,{"anc":{"m3":close_at(t,cc,90),"m6":close_at(t,cc,180),"last":cc[-1]},
                    "close":cc[-1],"vol":(v[-1] if v else 0)}
    except Exception: return sym,None
prices={}
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    for sym,d in pool.map(fetch_px,syms):
        if d: prices[sym]=d
print(f"giá lịch sử: {len(prices)}/{len(syms)}",flush=True)

# 3) bảng giá cuối phiên -> NN + trần/sàn/tham chiếu
board={}
for i in range(0,len(syms),150):
    try:
        for x in get("https://bgapidatafeed.vps.com.vn/getliststockdata/"+",".join(syms[i:i+150])):
            board[x["sym"]]={"ref":(float(x.get("r") or 0))*1000,"ceil":(float(x.get("c") or 0))*1000,
                "floor":(float(x.get("f") or 0))*1000,"fBuy":(float(x.get("fBVol") or 0))*10,
                "fSell":(float(x.get("fSVolume") or 0))*10,
                "gtgd":(float(x.get("avePrice") or 0))*1000*(float(x.get("lot") or 0))*10}
    except Exception as e: print("  board lỗi:",e,flush=True)

# 4) ghép anchors + vốn hoá (=SLCP×giá đóng cửa nếu Simplize thiếu)
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

today=vn_now().strftime("%Y-%m-%d")
u["stocks"]=sorted(keep,key=lambda s:-(s.get("mcap") or 0))
u["generated"]=today; u["ancDate"]=today
json.dump(u,open(UNIV,"w",encoding="utf-8"),ensure_ascii=False)
print(f"ĐÃ CẬP NHẬT universe.json ({len(u['stocks'])} mã, generated={today})",flush=True)

# 5) snapshot EOD
os.makedirs(EOD_DIR,exist_ok=True)
snap=[]
for sym in syms:
    p,b=prices.get(sym),board.get(sym,{})
    if not p: continue
    snap.append({"sym":sym,"close":p["close"],"vol":p["vol"],"ref":b.get("ref"),
        "ceil":b.get("ceil"),"floor":b.get("floor"),"fBuy":b.get("fBuy"),
        "fSell":b.get("fSell"),"gtgd":b.get("gtgd")})
out=os.path.join(EOD_DIR,f"{today}.json")
json.dump({"date":today,"count":len(snap),"data":snap},open(out,"w",encoding="utf-8"),ensure_ascii=False)
print(f"ĐÃ LƯU snapshot EOD: {out} ({len(snap)} mã)",flush=True)
