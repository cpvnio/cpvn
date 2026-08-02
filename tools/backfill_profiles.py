#!/usr/bin/env python3
"""Backfill kho hồ sơ doanh nghiệp data/profile/*.json bản v2 (+ cổ đông lớn, quỹ nắm giữ,
công ty con/liên kết, cơ cấu sở hữu) — logic PHẢN CHIẾU bước 8 của refresh_daily.py;
đổi schema thì phải sửa CẢ HAI file. Dùng khi cần đổ đầy kho ngay, không đợi chu kỳ 3 ngày
(bình thường refresh_daily.py tự backfill dần vì file thiếu v2 bị coi là cũ).

  python3 tools/backfill_profiles.py            # mọi mã chưa có bản v2
  python3 tools/backfill_profiles.py VNM VIC    # chỉ vài mã (test)
  python3 tools/backfill_profiles.py --force    # cào lại tất cả
"""
import json, os, re, sys, time, datetime, urllib.request, concurrent.futures, threading

BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNIV=os.path.join(BASE,"universe.json")
PROF_DIR=os.path.join(BASE,"data","profile")
UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120"}
VNTZ=datetime.timezone(datetime.timedelta(hours=7))
TODAY=datetime.datetime.now(VNTZ).strftime("%Y-%m-%d")
def get(url,timeout=20):
    with urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=timeout) as r:
        return json.loads(r.read().decode())
def jdump(obj,path):
    tmp=path+".tmp"
    json.dump(obj,open(tmp,"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
    os.replace(tmp,path)
def rnd(x,n=2): return round(x,n) if isinstance(x,(int,float)) else None

u=json.load(open(UNIV,encoding="utf-8"))
stocks={s["sym"]:s for s in u["stocks"]}
syms=list(stocks)

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
# Việt hoá tên cổ đông — GIỮ ĐỒNG BỘ với refresh_daily.py
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
    if not s.isupper() or len(s)<8: return s
    w=s.split()
    return " ".join([w[0]]+[x.capitalize() if len(x)>3 else x.lower() for x in w[1:]])
def viet_name(nm,country,tick=None):
    if tick and tick in stocks and stocks[tick].get("name"): return stocks[tick]["name"]
    if (country or "").strip().lower() not in ("vietnam","việt nam","viet nam"): return nm
    low=_pnorm(nm)
    if low in VN_ORG: return VN_ORG[low]
    m=re.match(r"^([A-Za-zÀ-ỹ]+)\s*\(\s*(?:mr|ms|mrs|dr)?\.?\s*([^)]+?)\s*\)$",nm.strip(),re.I)
    if m:
        p=m.group(2).split()
        return (m.group(1)+" "+" ".join(p[1:])+" "+p[0]).replace("  "," ").strip()
    n=re.sub(r"[\s,]*joint\s+stock\s+company$","",nm,flags=re.I)
    if n!=nm: return "CTCP "+_fixcaps(n.strip(" ,."))
    n=re.sub(r"[\s,]*(company\s+limited|company\s+ltd\.?|co\.?\s*,?\s*ltd\.?|limited)$","",nm,flags=re.I)
    if n!=nm: return "Công ty TNHH "+_fixcaps(n.strip(" ,."))
    return _fixcaps(nm)

def fetch_ownership(sym,o):
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

os.makedirs(PROF_DIR,exist_ok=True)
FORCE="--force" in sys.argv
picked=[a.upper() for a in sys.argv[1:] if not a.startswith("-")]
if picked: targets=[s for s in picked if s in stocks]
elif FORCE: targets=syms
else:
    def is_v2(s):
        try: return json.load(open(os.path.join(PROF_DIR,f"{s}.json"),encoding="utf-8")).get("v")==2
        except Exception: return False
    targets=[s for s in syms if not is_v2(s)]
print(f"backfill hồ sơ v2: {len(targets)}/{len(syms)} mã",flush=True)

lock=threading.Lock(); done=[0,0]
def work(sym):
    d=None
    for att in range(2):
        try:
            d=get(f"https://api2.simplize.vn/api/company/summary/{sym}")["data"]; break
        except Exception: time.sleep(0.8*(att+1))
    time.sleep(0.1)
    with lock: done[0]+=1
    if not d: return
    o={"sym":sym,"updated":TODAY,"v":2,
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
    with lock:
        done[1]+=1
        if done[0]%100==0: print(f"  {done[0]}/{len(targets)}",flush=True)
    jdump(o,os.path.join(PROF_DIR,f"{sym}.json"))

if targets:
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(work,targets))
print(f"XONG: cào {done[0]}, ok {done[1]}",flush=True)
