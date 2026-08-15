#!/usr/bin/env python3
"""
CPVN — cập nhật EOD hằng ngày + KHO DỮ LIỆU VĨNH VIỄN trong repo (số liệu không bao giờ mất).
Chạy sau 15h (giờ VN), Thứ 2–6:
  0) Đồng bộ danh sách mã từ SSI MỖI NGÀY -> mã vừa lên sàn có mặt ngay hôm đó (kèm nạp đủ
     hồ sơ ngành/SLCP/logo cho mã còn thiếu, không phải đợi lượt --full thứ Hai).
  1) Làm mới universe.json: mốc giá m3/m6 (VPS), % điều chỉnh w/m/y/y5 + vốn hoá + ngành (Simplize).
  2) Bảng giá VPS cuối phiên (NN, trần/sàn/TC) + chỉ số VNINDEX/VN30/HNX/UPCOM.
  3) KHO LỊCH SỬ data/hist/{SYM}.json: toàn bộ nến ngày OHLCV + NN mua/bán của TỪNG mã.
     Nguồn VNDirect (hồi tố ĐỦ quyền cũ), dự phòng VPS. Mã chưa có file -> tự cào đủ
     ~6.5 năm (backfill); ngày thường chỉ NỐI phiên mới, nhưng mã nào vừa chốt quyền
     (nền giá bị hạ) thì tự phát hiện và tải lại cả chuỗi ngay hôm đó.
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

# 0) ĐỒNG BỘ danh sách mã từ SSI (thêm mã mới niêm yết, đủ HOSE+HNX+UPCOM) — CHẠY MỖI NGÀY.
#    Trước đây bước này nằm trong `if FULL` nên mã lên sàn thứ Ba phải chờ tới thứ Hai tuần
#    sau mới có mặt trên web (DMX niêm yết 07/08/2026 là ca điển hình). Ba lượt gọi, ~2 giây.
moi=set()                                  # mã MỚI THÊM lượt này -> cần nạp đủ hồ sơ + có giá mới giữ
for ex,slug in [("HOSE","hose"),("HNX","hnx"),("UPCOM","upcom")]:
    try:
        for x in get(f"https://iboard-query.ssi.com.vn/stock/exchange/{slug}")["data"]:
            if x.get("stockType")!="s": continue
            sym=x["stockSymbol"]
            if sym not in stocks:
                stocks[sym]={"sym":sym,"ex":ex,"name":x.get("companyNameVi") or sym}; moi.add(sym)
            else: stocks[sym]["ex"]=ex   # cập nhật nếu mã chuyển sàn
    except Exception as e: print("  SSI",ex,"lỗi:",e,flush=True)
print(f"đồng bộ SSI: thêm {len(moi)} mã mới{' ('+', '.join(sorted(moi))+')' if 0<len(moi)<=12 else ''}"
      f", tổng {len(stocks)}",flush=True)
HL["moi"]=sorted(moi)
syms=list(stocks)
# mã chưa có hồ sơ (mã mới, hoặc lượt --full trước đó Simplize lỗi) -> nạp ĐỦ trường ngay
# hôm nay, không đợi thứ Hai: thiếu `sector`/`shares` là mất ngành, mất logo, mất đường đua.
hoso={s for s in syms if not stocks[s].get("sector") or not stocks[s].get("shares")}

# 1) Simplize summary -> % điều chỉnh + vốn hoá (+ ngành/SLCP/logo/PE/PB/cổ tức nếu --full)
lock=threading.Lock(); sok=sfail=0
def fetch_simplize(sym):
    for att in range(2):
        try:
            d=get(f"https://api2.simplize.vn/api/company/summary/{sym}")["data"]
            # epsS lấy MỖI NGÀY (cùng 1 response, không tốn thêm request): EPS chuẩn của
            # Simplize = LNST cổ đông công ty mẹ / SLCP -> web tính P/E sống = giá / EPS
            o={"mcap":d.get("marketCap"),"epsS":d.get("epsRatio"),
               "pct":{"w":d.get("pricePctChg7d"),"m":d.get("pricePctChg30d"),
                      "y":d.get("pricePctChg1y"),"y5":d.get("pricePctChg5y")}}
            if FULL or sym in hoso:
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
                # fRoom cũng theo LÔ 10 y như fBVol/fSVolume — đối chiếu currentRoom của
                # VNDirect ra đúng hệ số 10,0 ở cả 4 mã thử. Quên nhân 10 là room nhỏ đi
                # 10 lần (HPG 2,7% thay vì 27,3%).
                "fRoom":(float(x.get("fRoom") or 0))*10,
                # GIÁ KHỚP CUỐI của bảng giá — KHÔNG dùng để ghi snapshot (close vẫn lấy
                # từ kho nến), chỉ để ĐỐI CHIẾU ở bước 5c. Đây là đường lấy số ĐỘC LẬP
                # duy nhất với nguồn vẽ chart; thiếu nó thì snapshot và kho nến cùng gốc
                # VNDirect nên so nhau bao nhiêu cũng khớp, không phát hiện được gì.
                "last":(float(x.get("lastPrice") or 0))*1000,
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
        # THANH KHOẢN CHÍNH THỨC của cả sàn, VPS trả sẵn ở đây (`value` tính bằng TRIỆU
        # đồng, `vol` tính bằng cổ phiếu). Cộng gtgd của TỪNG MÃ trong bảng giá KHÔNG ra
        # số này: bảng giá chỉ có phần KHỚP LỆNH, thiếu hẳn THOẢ THUẬN — phiên 06/08 HOSE
        # khớp lệnh 12.587 tỷ trong khi cả sàn 15.136 tỷ, hụt 17%; HNX hụt tới 53%.
        if v>0: indices.append({"name":IDX_NAMES.get(str(x.get("mc")),str(x.get("mc"))),
                                "value":round(v,2),"chg":round((v-ref)/ref*100,2) if ref else 0,
                                "gtgd":round(float(x.get("value") or 0)*1e6),
                                "vol":int(float(x.get("vol") or 0))})
except Exception as e: print("  chỉ số lỗi:",e,flush=True)

# 3) KHO LỊCH SỬ data/hist/{SYM}.json + mốc giá m3/m6/last cho universe
os.makedirs(HIST_DIR,exist_ok=True)
def close_at(t,c,days):
    tgt=NOW-days*86400; v=None
    for i in range(len(t)):
        if t[i]<=tgt: v=c[i]
        else: break
    return v if v is not None else (c[0] if c else None)
# NGUỒN NẾN, ưu tiên từ trên xuống. VNDirect HỒI TỐ ĐỦ quyền cũ, VPS chỉ hồi tố từ khoảng
# giữa 2021 — đo trên 6 mã: HPG 3/2020->nay VNDirect nhân 4,21 lần còn VPS chỉ 3,10 lần
# (thiếu đúng đợt thưởng 35% năm 2021); VIB 5,14 vs 3,66; ACB 5,00 vs 4,00; FPT 4,83 vs 4,16;
# NVL 0,51 vs 0,38. Mã nào không có quyền cũ (VCB) thì hai nguồn khớp tuyệt đối.
# Lấy sai nguồn là đường đua/đầu tư bền vững/bộ lọc đều hụt lãi mà không báo gì.
CHART_SRC=[("VNDirect","https://dchart-api.vndirect.com.vn/dchart/history","D"),
           ("VPS","https://histdatafeed.vps.com.vn/tradingview/history","1D")]
hsrc={}   # sym -> tên nguồn đã dùng (thống kê vào health.json)
def fetch_hist(sym,days):
    for ten,url,res in CHART_SRC:
        for att in range(2):
            try:
                j=get(f"{url}?symbol={sym}&resolution={res}&from={NOW-days*86400}&to={NOW}")
                if j.get("s")!="ok" or not j.get("c"): break      # nguồn không có mã -> nguồn sau
                # Xác định đơn vị giá bằng ĐỐI CHIẾU THAM CHIẾU BẢNG GIÁ (luôn đúng VND),
                # không đoán theo ngưỡng nữa — mã giá ~500 nghìn (VNZ/HLB) từng bị đoán sai 1000 lần.
                last=j["c"][-1]; ref=(board.get(sym) or {}).get("ref") or 0
                if ref>0 and last>0:
                    k=1000 if abs(last*1000-ref)<abs(last-ref) else 1
                else:
                    k=1000 if last<500 else 1
                n=len(j["t"])
                gi=lambda a,i: (a[i] if a and i<len(a) and a[i] is not None else j["c"][i])
                hsrc[sym]=ten
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
    # NỀN GIÁ ĐÃ BỊ HẠ CHƯA? Ngày chốt quyền, nguồn hồi tố hạ TOÀN BỘ chuỗi cũ xuống theo
    # tỉ lệ cổ tức. File đang lưu vẫn là nền CŨ, nối phiên mới vào là ghép hai nền khác
    # nhau -> đẻ ra một cú sập chưa từng xảy ra, đúng bằng tỉ lệ cổ tức, mà không báo gì.
    # Đối chiếu ngay tại NGÀY TRÙNG NHAU: lệch quá 0,5% nghĩa là nền đã đổi -> tải lại cả chuỗi.
    if not fullfetch and old and (old.get("t") or []) and old.get("c"):
        moc=old["t"][-1]; cu=old["c"][-1]
        j2=d["t"].index(moc) if moc in d["t"] else -1
        if j2>=0 and cu>0 and abs(d["c"][j2]-cu)/cu>0.005:
            d2=fetch_hist(sym,BACKFILL_D)
            if d2 and d2["t"]:
                print(f"  {sym}: nền giá hạ {cu} -> {d['c'][j2]} (chốt quyền) — tải lại cả chuỗi",flush=True)
                d=d2; fullfetch=True
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
        # Nguồn trả thiếu quá khứ so với file đã lưu -> ghép phần cũ lại (không mất dữ liệu),
        # nhưng phải QUY VỀ CÙNG NỀN: đo tỉ lệ ở phiên chung xa nhất rồi nhân phần cũ theo.
        # Ghép thẳng nền cũ vào nền mới là tự tạo một cú sập giả ngay tại chỗ nối.
        if old and (old.get("t") or []) and old["t"][0]<d["t"][0]:
            cu={vn_day(t):c for t,c in zip(old["t"],old.get("c") or [])}
            tile=None
            for t,c in zip(d["t"],d["c"]):
                dd=vn_day(t)
                if dd in cu and cu[dd]>0: tile=c/cu[dd]; break
            if tile is not None:
                cut=0
                while cut<len(old["t"]) and old["t"][cut]<d["t"][0]: cut+=1
                for k2 in ("o","h","l","c"): out[k2]=[round(x*tile) for x in old[k2][:cut]]+out[k2]
                for k2 in ("t","v"):         out[k2]=old[k2][:cut]+out[k2]
    else:                                         # ngày thường: nối phiên mới vào file cũ
        out=old; lastt=out["t"][-1] if out["t"] else 0
        for i,tt in enumerate(d["t"]):
            if tt>lastt:
                for k2 in ("t","o","h","l","c","v"): out[k2].append(d[k2][i])
    b=board.get(sym) or {}
    if out["t"] and (b.get("fBuy") or b.get("fSell")):   # NN phiên hôm nay từ bảng giá
        fbfs[vn_day(out["t"][-1])]=(int(b.get("fBuy") or 0),int(b.get("fSell") or 0))
    # TỰ VÁ LỖ NN: phiên nào trong 6 phiên gần nhất còn trống thì gọi bù một lượt.
    # Trước đây chỉ vá vào ngày --full (thứ 2) nên pipeline lỡ một ngày là phiên đó
    # mang NN = 0 suốt cả tuần, kéo sai luôn dòng tiền 7D/30D mà không báo gì.
    # Ngày chạy bình thường không có lỗ -> không tốn thêm lượt gọi nào.
    if not (fresh or FULL) and out["t"]:
        if any(vn_day(tt) not in fbfs for tt in out["t"][-6:]):
            f6=fetch_foreign30(sym)
            if f6: fbfs.update(f6)
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
nguon={}
for v in hsrc.values(): nguon[v]=nguon.get(v,0)+1
print(f"kho lịch sử: backfill {hstats['new']}, nối {hstats['append']}, tải lại {hstats['full']}, "
      f"lỗi {hstats['fail']} · nguồn {nguon}",flush=True)
HL["hist"]=dict(hstats); HL["histSrc"]=nguon; HL["board"]=len(board); HL["indices"]=len(indices)

# 4) ghép mốc giá + vốn hoá (=SLCP×giá đóng cửa nếu Simplize thiếu) vào universe
for sym,s in stocks.items():
    p=prices.get(sym)
    if p:
        s["anc"]=p["anc"]
        if not s.get("mcap") and s.get("shares"): s["mcap"]=s["shares"]*p["close"]

# mã VỪA THÊM mà không cào nổi một cây nến nào (mã tạm ngừng, mã SSI liệt kê sớm hơn ngày
# chào sàn) thì chưa ghi vào universe, chờ lượt sau — không để mã trống giá lọt ra web.
chua=[s for s in moi if s not in prices]
if chua: print(f"  mã mới chưa có giá, để lại lượt sau: {', '.join(sorted(chua))}",flush=True)

# --full: bỏ UPCOM không có dữ liệu (rác thanh khoản); luôn giữ HOSE/HNX. Làm mới rổ chỉ số.
keep=[s for s in stocks.values() if s["sym"] not in chua]
if FULL:
    keep=[s for s in keep if s.get("mcap") or s["ex"] in ("HOSE","HNX")]
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

# 5a) TRẦN ROOM NGOẠI — bảng giá VPS chỉ có room CÒN LẠI, không có trần, nên không suy
# ra được "nước ngoài đang sở hữu bao nhiêu". VNDirect trả cả totalRoom (trần) lẫn
# currentRoom (còn lại), gọi GỘP 50 mã một lượt nên cả sàn chỉ ~30 lượt, ~16 giây.
froom_cap={}
def fetch_room_caps():
    tu=(datetime.date.today()-datetime.timedelta(days=12)).isoformat()
    got=0
    for i in range(0,len(syms),50):
        lo=",".join(syms[i:i+50])
        try:
            d=get(f"https://api-finfo.vndirect.com.vn/v4/foreigns"
                  f"?q=code:{lo}~tradingDate:gte:{tu}&sort=tradingDate:desc&size=900")
            best={}
            for r in d.get("data") or []:
                c,day=r.get("code"),r.get("tradingDate") or ""
                if not c: continue
                if c not in best or day>best[c][0]:
                    best[c]=(day,r.get("totalRoom") or 0)
            for c,(_,cap) in best.items():
                if cap>0: froom_cap[c]=cap; got+=1
        except Exception: pass
        time.sleep(0.12)
    return got
try:
    print(f"trần room ngoại: {fetch_room_caps()} mã",flush=True)
except Exception as e:
    print("trần room ngoại: lỗi",e,flush=True)

snap=[]
for sym in syms:
    p,b=prices.get(sym),board.get(sym,{})
    if not p: continue
    # CHƯA KHỚP LỆNH PHIÊN NÀY: nến cuối của mã nằm ở ngày khác ngày phiên (mã thanh
    # khoản kém có thể đứng im hàng tháng). Giá vẫn là giá khớp cuối cùng — đúng — NHƯNG
    # tham chiếu/trần/sàn lại là của HÔM NAY. Ghép hai thứ khác phiên rồi để client tự
    # tính (giá - tham chiếu)/tham chiếu là đẻ ra một biến động CHƯA TỪNG XẢY RA:
    # đo trên latest.json phiên 04/08 — 639/1522 mã lệch phiên, 88 mã sinh 1D% giả
    # (NDC -18,65% dù khớp lệnh lần cuối 23/06), 19 mã bị tô nhãn trần/sàn giả.
    # Nên đánh dấu nt=1 để client hiện "—" thay vì bịa số, và khối lượng phiên này là 0.
    nt = vn_day(p["ts"]) != sess_date
    r={"sym":sym,"close":p["close"],"o":p["o"],"h":p["h"],"l":p["l"],
       "vol":0 if nt else p["vol"],
       "ref":b.get("ref"),"ceil":b.get("ceil"),"floor":b.get("floor"),"fBuy":b.get("fBuy"),
       "fSell":b.get("fSell"),"gtgd":b.get("gtgd"),
       "fRoom":b.get("fRoom"),"fTotal":froom_cap.get(sym)}
    if nt: r["nt"]=1
    snap.append(r)
# BẢNG GIÁ CÓ SỐNG KHÔNG? snap dựng từ KHO NẾN nên luôn đủ 100 mã kể cả khi bảng giá
# rỗng — mà trần/sàn/tham chiếu/khối ngoại/GTGD thì lấy từ BẢNG GIÁ. Ngày lễ hoặc VPS
# trả rỗng mà vẫn ghi thì latest.json của phiên trước bị thay bằng bản NN = null,
# cột "NN mua/bán" trên web trắng trơn tới phiên sau. Cùng ngưỡng 10% với assets/core.js.
board_live=sum(1 for s in snap if (s.get("fBuy") or s.get("fSell") or s.get("ref")))
if len(snap)>=100 and board_live>=len(snap)*0.1:
    doc={"date":sess_date,"generated":vn_now().strftime("%Y-%m-%d %H:%M"),
         "count":len(snap),"indices":indices,"data":snap}
    jdump(doc,os.path.join(EOD_DIR,f"{sess_date}.json"))
    jdump(doc,os.path.join(EOD_DIR,"latest.json"))
    print(f"ĐÃ LƯU snapshot EOD phiên {sess_date} ({len(snap)} mã) + latest.json",flush=True)
elif len(snap)<100:
    print(f"BỎ QUA snapshot: chỉ có {len(snap)} mã (VPS lỗi?) — giữ nguyên latest.json cũ",flush=True)
else:
    print(f"BỎ QUA snapshot: bảng giá đứng yên ({board_live}/{len(snap)} mã có số) "
          f"— nghỉ lễ hoặc VPS rỗng, giữ nguyên latest.json cũ",flush=True)
HL["snapshot"]=len(snap)

# 5b) CHUÔNG BÁO LỆCH PHIÊN. Cả một họ lỗi của trang này có chung một hình dạng: giá của
#     phiên A ghép với tham chiếu/biên độ của phiên B rồi đem chia cho nhau, đẻ ra phần
#     trăm không thể tồn tại (12/08/2026: TUG +27,04%, MGR +22,45% trên UPCOM biên ±15%).
#     Trần và sàn nằm CÙNG bản ghi với giá, cùng nguồn cùng phiên — nên giá lọt ra ngoài
#     [sàn, trần] là bằng chứng máy móc rằng hai số đó khác phiên nhau. Đếm ra đây để
#     health.json tự tố, khỏi phải đợi người dùng nhìn thấy rồi báo.
#     Nới 0,1% cho sai số làm tròn bước giá; chỉ xét mã KHÔNG mang cờ nt (mã nt vốn đã
#     được client cấm tính %, nằm ngoài biên là đúng bản chất của nó).
_ngoai=[]
for r in snap:
    if r.get("nt"): continue
    cl,ce,fl=r.get("close") or 0,r.get("ceil") or 0,r.get("floor") or 0
    if cl>0 and ce>0 and fl>0 and (cl>ce*1.001 or cl<fl*0.999):
        _ngoai.append(r["sym"])
HL["bien"]={"ngoai":len(_ngoai),"ma":_ngoai[:20]}
if _ngoai:
    print(f"CẢNH BÁO lệch phiên: {len(_ngoai)} mã có giá NGOÀI biên độ của chính nó "
          f"-> {', '.join(_ngoai[:12])}",flush=True)

# 5c) CHUÔNG BÁO NGUỒN VẼ CHART SAI — so kho nến (VNDirect) với BẢNG GIÁ (VPS).
#     Sinh ra 14/08/2026: user báo chart BID hiện giá không đúng giá đóng phiên, mà đúng
#     MỘT MÌNH BID. Soi kho thì thấy latest.json khớp data/hist từng số — nhưng phép so ấy
#     VÔ GIÁ TRỊ: `close` của snapshot LẤY TỪ CHÍNH kho nến, hai vế cùng một gốc VNDirect
#     nên khớp là đương nhiên. Bảng giá VPS mới là đường lấy số ĐỘC LẬP, và trước đây
#     pipeline ném luôn `lastPrice` đi (chỉ giữ tham chiếu/trần/sàn/khối ngoại/GTGD).
#     Hệ quả: nguồn vẽ chart trả sai cho một mã thì con số sai đó chảy vào snapshot, vào
#     bảng giá, vào mọi trang — và KHÔNG CÓ GÌ phát hiện được, phải đợi người dùng nhìn ra.
#     Chỉ xét mã có giá khớp thật trong phiên (bảng giá `last`>0) và nến cuối đúng phiên
#     này (không mang cờ nt). Nới 0,5% — cùng ngưỡng "hạ nền" của fetch_hist.
_chart=[]
for r in snap:
    if r.get("nt"): continue
    b=board.get(r["sym"]) or {}
    bl,cl=b.get("last") or 0,r.get("close") or 0
    if bl>0 and cl>0 and abs(cl-bl)/bl*100>0.5:
        _chart.append({"s":r["sym"],"kho":round(cl),"bang":round(bl),
                       "lech":round((cl-bl)/bl*100,2)})
_chart.sort(key=lambda x:-abs(x["lech"]))
HL["chart"]={"lech":len(_chart),"ma":_chart[:20]}
if _chart:
    print(f"CẢNH BÁO nguồn chart: {len(_chart)} mã có giá kho nến LỆCH bảng giá -> "
          +", ".join(f"{x['s']} {x['kho']:,} vs {x['bang']:,} ({x['lech']:+.2f}%)"
                     for x in _chart[:8]),flush=True)
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
# SƠ ĐỒ HIỆN HÀNH của một file fin. Thêm trường mới vào file thì PHẢI thêm tên nó vào đây,
# bằng không mã cũ giữ file thiếu trường đó im lặng cho tới lượt --full thứ Hai — mà nếu
# chính --full là thứ sinh ra trường đó thì kẹt luôn, phải chạy tay một script vá riêng.
# Đã dính đúng lỗi này với `divQ` (cổ tức theo quý): 234 mã đứng ngoài suốt vì bảng kiểm
# chỉ dò mỗi `bsQ` của lần đổi sơ đồ trước đó.
FIN_KEYS=("bsQ","divQ")
def fin_stale(s):
    p=os.path.join(FIN_DIR,f"{s}.json")
    if not os.path.exists(p): return True
    try:
        d=json.load(open(p,encoding="utf-8"))
        return any(k not in d for k in FIN_KEYS)
    except Exception: return True
need=[s for s in syms if FULL or fin_stale(s)]
RX_RATIO=re.compile(r"tỷ lệ\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)",re.I)
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
def _qlb(y,m):           # (2025,10) -> "Q4/25" — đúng nhãn cột quý của bảng KQKD
    return "Q%d/%s"%((int(m)-1)//3+1, str(int(y))[2:])
def fetch_div(sym):      # cổ tức TIỀN MẶT (histories) + CP/thưởng (events, parse tỉ lệ)
    # by  = gộp theo NĂM chốt quyền · byq = gộp theo QUÝ chốt quyền.
    # Bảng KQKD xem theo quý mà chỉ có số theo năm thì phải rải đều số năm ra cả 4 quý
    # -> VCB hiện 450đ ở cả Q1..Q4/25 như thể trả 4 lần, trong khi chỉ trả tháng 10.
    # Nguồn có sẵn divMonths (tháng chi trả) và sự kiện có ngày chốt quyền -> gộp đúng quý.
    by={}; byq={}
    def _q(k,lb,v):
        byq.setdefault(lb,{"cash":0,"div":0,"bonus":0})[k]+=v
    try:
        for x in get(f"https://api.simplize.vn/api/company/dividend/histories/{sym}").get("data") or []:
            y=int(x.get("year") or 0)
            if not y: continue
            by.setdefault(y,{"year":y,"cash":0,"div":0,"bonus":0})["cash"]=x.get("total") or 0
            for m,v in (x.get("divMonths") or {}).items():
                if v: _q("cash",_qlb(y,m),v)
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
            # XẾP THEO NĂM CHỐT QUYỀN cho MỌI loại — cổ tức TIỀN lấy từ histories cũng
            # là năm CHI TRẢ, nên trước đây cổ phiếu xếp theo năm TÀI CHÍNH là trộn hai
            # quy ước trong cùng một bảng: VCB 27,6% chốt quyền 22/12/2021 lại nằm ở
            # dòng 2019, đứng chung với 800đ tiền trả tháng 12/2019 — sai 21/21 sự kiện
            # trên 5 mã lớn khi đối chiếu. Nay cả bảng đọc thống nhất "năm ĐÓ nhận gì".
            y=ex_y
            if not y: continue
            k="bonus" if is_bonus else "div"
            by.setdefault(y,{"year":y,"cash":0,"div":0,"bonus":0})[k]+=pct
            if len(ex)==3 and ex[1].isdigit(): _q(k,_qlb(y,ex[1]),pct)
    except Exception: pass
    out=sorted(by.values(),key=lambda r:-r["year"])
    for r in out: r["div"]=rnd(r["div"],1); r["bonus"]=rnd(r["bonus"],1)
    for r in byq.values():
        r["cash"]=rnd(r["cash"],1); r["div"]=rnd(r["div"],1); r["bonus"]=rnd(r["bonus"],1)
    return out,byq
def parse_generic(d):    # CĐKT/LCTT: giữ nguyên mọi dòng {k,n,v[]}, kỳ CŨ -> MỚI
    H=d.get("headers") or []; rows=d.get("rows") or []
    labels=[(f"Q{h.get('quarter')}/{str(h.get('year'))[2:]}" if h.get("quarter") else str(h.get("year"))) for h in H]
    labels.reverse()
    out=[]
    for r in rows:
        v=[rnd(x) for x in (r.get("values") or [])]; v.reverse()
        out.append({"k":r.get("key"),"n":(r.get("name") or "").strip(),"v":v})
    return {"labels":labels,"rows":out} if labels and out else None
RX_MA_TIEUDE=re.compile(r"\(([A-Z0-9]{3,4})\)|(?:^|[\s\"'“(])([A-Z0-9]{3,4})\s*:")
def tin_dung_ma(sym,tieu):
    """Bài này có THẬT SỰ nói về mã `sym` không?

    Cả hai nguồn tin đều gắn thẻ khá tay: bài "Thế Giới Di Động (MWG): Doanh thu..." mang
    thẻ MWG,DXS nên lọt vào trang DXS; bài "IPO thành công, vốn hoá Điện Máy Xanh (DMX)..."
    mang thẻ DCV,DXS. Người xem mở trang Đất Xanh Services lại đọc tin Điện Máy Xanh.
    Luật: tiêu đề gọi đích danh MỘT MÃ KHÁC theo lối mạnh — "(MWG)" hoặc "MWG:" — thì bài
    của công ty kia, bỏ. Trừ khi tiêu đề gọi luôn cả mã đang xem (bài so sánh hai doanh
    nghiệp) thì giữ. Tin ngành/tin thị trường không gọi tên mã nào nên không bị đụng tới.
    Giữ ĐÚNG một luật với `CP.tinDungMa` trong assets/core.js — sửa bên này phải sửa bên kia.
    """
    co={m.group(1) or m.group(2) for m in RX_MA_TIEUDE.finditer((tieu or "").upper())}
    if not co or sym in co: return True
    return not any(x in stocks for x in co)
flock=threading.Lock(); fdone=[0,0]; fkeep=[0]   # fkeep: số mã phải lấy lại số cũ vì nguồn hụt
def work_fin(sym):
    url=lambda v,p:f"https://api-finance-t19.24hmoney.vn/v1/web/company/financial-report?symbol={sym}&view={v}&period={p}&expanded=false"
    o={"sym":sym,"updated":sess_date,"Y":[],"Q":[],"div":[],"divQ":{}}
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
    o["div"],o["divQ"]=fetch_div(sym)
    # GOM DỒN chứ đừng ghi đè: nguồn chỉ trả 8 KỲ GẦN NHẤT và không có cách xin thêm
    # (đã thử page/size/offset/fromYear — luôn trả đúng 8 quý). Ghi đè là mỗi lượt cào
    # lại đẩy quý cũ ra khỏi kho, nên trang cổ phiếu bung năm 2023 ra không có quý nào.
    # Gộp theo NHÃN, số mới thắng số cũ (nguồn có đính chính lại số đã công bố).
    cu=None
    try:
        with open(os.path.join(FIN_DIR,f"{sym}.json"),encoding="utf-8") as fh: cu=json.load(fh)
    except Exception: pass
    if cu:
        def _thu(lb):                      # 'Q3/24' -> 2024.75 · '2024' -> 2024 (để xếp thứ tự)
            m=re.match(r"Q(\d)/(\d{2})$",str(lb))
            if m: return 2000+int(m.group(2))+int(m.group(1))/10
            m=re.match(r"(\d{4})$",str(lb));  return int(m.group(1)) if m else -1
        for k in ("Y","Q"):
            gop={r.get("label"):r for r in (cu.get(k) or []) if r.get("label")}
            gop.update({r.get("label"):r for r in (o.get(k) or []) if r.get("label")})
            o[k]=sorted(gop.values(),key=lambda r:_thu(r.get("label")))
        # CÙNG LUẬT ĐÓ CHO MẤY KHOÁ CÒN LẠI. Chúng đang ghi đè thẳng: bsY/bsQ/cfY/cfQ chỉ
        # gán `if g:` nên cào hụt là khoá VẮNG MẶT, jdump xoá luôn khỏi file; div/divQ thì
        # fetch_div nuốt lỗi và trả về rỗng, ghi rỗng đè lên số cũ. fin_stale() không thấy
        # được vì khoá vẫn còn, chỉ là ruột trống -> mất im lặng tới lượt --full thứ Hai,
        # mà thứ Hai cũng có thể hụt tiếp. Nguồn hỏng lẻ tẻ có thật: lượt 07/08 fail 10 mã.
        _lay=[k for k in ("bsY","bsQ","cfY","cfQ","div","divQ") if not o.get(k) and cu.get(k)]
        for k in _lay: o[k]=cu[k]
        if _lay:
            with flock: fkeep[0]+=1
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
HL["fin"]={"need":len(need),"ok":fdone[1],"giu_cu":fkeep[0]}

# 6b) RÚT 3 CHỈ SỐ CƠ BẢN TỪ KHO TÀI CHÍNH -> universe.json (bảng giá đọc 1 lần, không phải
#     tải 1.500 file lẻ). Không tốn thêm lượt gọi mạng nào — đọc lại file vừa ghi ở bước 6.
#       cash  = tiền và tương đương tiền, KỲ GẦN NHẤT (tỷ đồng)   [bsa2]
#       np    = LNST NĂM ĐÃ HOÀN THÀNH gần nhất (tỷ đồng) + npY = năm đó
#       eps   = LNST 4 QUÝ GẦN NHẤT / SLCP (đồng/cp) -> P/E trên web tính sống = giá / eps
def _lastval(rows,labels,keys,names):
    r=None
    for k in keys:
        r=next((x for x in rows if x.get("k")==k),None)
        if r: break
    if not r and names:
        r=next((x for x in rows if any(n in (x.get("n") or "").lower() for n in names)),None)
    if not r: return None,None
    v=r.get("v") or []
    for i in range(min(len(labels),len(v))-1,-1,-1):
        if v[i] is not None: return v[i],labels[i]
    return None,None
def _basics():
    """Rút chỉ số cơ bản. Đây là bước LÀM GIÀU THÊM, không phải bước sống còn — nên mọi
    lỗi đều nuốt gọn: hỏng 1 mã thì bỏ mã đó, hỏng cả bước thì vẫn chạy tiếp 7-10."""
    fx={"cash":0,"np":0,"eps":0,"epsTTM":0}
    for sym,s in stocks.items():
        try:
            with open(os.path.join(FIN_DIR,f"{sym}.json"),encoding="utf-8") as fh: fin=json.load(fh)
            bs=fin.get("bsQ") or fin.get("bsY") or {}
            if bs.get("rows") and bs.get("labels"):
                v,lb=_lastval(bs["rows"],bs["labels"],["bsa2"],["tiền và tương đương tiền"])
                if isinstance(v,(int,float)): s["cash"]=rnd(v,1); s["cashQ"]=lb; fx["cash"]+=1
            for r in reversed(fin.get("Y") or []):
                if isinstance(r.get("np"),(int,float)):
                    s["np"]=rnd(r["np"],1); s["npY"]=r.get("label"); fx["np"]+=1; break
            # EPS: ưu tiên số CHUẨN của Simplize (LNST cổ đông công ty mẹ) cho khớp các trang
            # khác; thiếu thì tự tính LNST 4 quý gần nhất / SLCP. Tính lại mỗi phiên.
            ttm=None
            Q=[r for r in (fin.get("Q") or []) if isinstance(r.get("np"),(int,float))]
            sh=s.get("shares") or 0
            if len(Q)>=4 and sh>0: ttm=round(sum(r["np"] for r in Q[-4:])*1e9/sh)
            e=s.get("epsS") if isinstance(s.get("epsS"),(int,float)) else None
            eps=e or ttm
            if eps: s["eps"]=int(round(eps)); fx["eps"]+=1; fx["epsTTM"]+=0 if e else 1
            else: s.pop("eps",None)
        except Exception:
            continue                      # mã lỗi -> bỏ qua, KHÔNG chặn cả bước
    jdump(u,UNIV)
    return fx
try:
    _fx=_basics()
    print(f"chỉ số cơ bản -> universe: tiền mặt {_fx['cash']}, LNST năm {_fx['np']}, "
          f"EPS {_fx['eps']} (tự tính {_fx['epsTTM']})",flush=True)
    HL["basics"]=dict(_fx)
except Exception as e:
    print(f"chỉ số cơ bản LỖI (không chặn pipeline): {e}",flush=True)
    HL["basics"]={"err":str(e)[:120]}

# 6c) KHO SÂU data/finq/{MÃ}.json — CÂN ĐỐI KẾ TOÁN + LƯU CHUYỂN TIỀN TỆ ĐỦ LỊCH SỬ.
#     Bước 6 chỉ giữ được 8 KỲ CUỐN CHIẾU cho bsQ/cfQ/bsY/cfY vì nguồn 24hMoney chỉ trả
#     chừng ấy — mỗi lượt cào là đẩy kỳ cũ nhất ra khỏi kho VĨNH VIỄN (khác `Y`/`Q` đã
#     được gom dồn theo nhãn). Bước này bồi từ VNDirect financial_statements, ~79 quý /
#     22 năm, và LẤY DẤU CỦA VNDIRECT cho lưu chuyển tiền tệ (xem đầu tools/kho_sau.py:
#     kho 24hMoney sai dấu 60% số ô, VNDirect đúng 1.098/1.098).
#     `--moi` = chỉ mã nào có kỳ mà kho sâu chưa có, nên ngày thường gần như không tốn
#     lượt gọi nào; tới mùa báo cáo thì tự bồi, không cần ai nhớ chạy tay.
try:
    sys.path.insert(0,os.path.join(BASE,"tools"))
    import kho_sau as _ks
    HL["finq"]=_ks.main(moi=True, gioi_han=500)
except Exception as e:
    print(f"kho sâu LỖI (không chặn pipeline): {e}",flush=True)
    HL["finq"]={"err":str(e)[:120]}

# 6c2) CƠ CẤU LỢI NHUẬN + DƯ NỢ CHO VAY KÝ QUỸ data/cocau/{MÃ}.json — cào Simplize.
#      Thứ DUY NHẤT ở đây mà hai kho kia không có: bảng phân rã theo ĐÚNG loại hình doanh
#      nghiệp. fin/finq đều lấy bản báo cáo mẫu THƯỜNG nên với công ty chứng khoán thì
#      40 nghìn tỷ đang cho khách vay không nằm ở dòng nào (xem tools/cao_cocau.py).
#      `--moi` với ngưỡng 20 ngày: báo cáo quý ra mỗi 3 tháng, hỏi lại hằng ngày là phí
#      3.000 lượt gọi mỗi phiên cho một con số cả quý mới nhúc nhích. Nguồn chỉ trả 15 quý
#      nên đây KHÔNG phải kho vĩnh viễn — mất là cào lại được, không cần bảo toàn như fin.
try:
    sys.path.insert(0,os.path.join(BASE,"tools"))
    import cao_cocau as _cc
    HL["cocau"]=_cc.main(moi=True, ngay=20)
except Exception as e:
    print(f"cơ cấu lợi nhuận LỖI (không chặn pipeline): {e}",flush=True)
    HL["cocau"]={"err":str(e)[:120]}

# 6d) CHỈ SỐ ĐẶC THÙ NGÀNH data/nganh/{MÃ}.json — tính từ fin + finq + cocau, KHÔNG gọi mạng.
#     Phải đứng SAU 6c: lưu chuyển tiền tệ chỉ tin dấu của finq (kho fin sai dấu 60% số ô).
#     Và SAU 6c2: dòng "Dư nợ cho vay ký quỹ" của mẫu CTCK đọc thẳng data/cocau.
#     `--moi` so mtime nên ngày thường chỉ dựng lại mã vừa có báo cáo mới, vài giây là xong.
try:
    import build_nganh as _bn
    HL["nganh"]=_bn.main(moi=True)
except Exception as e:
    print(f"chỉ số ngành LỖI (không chặn pipeline): {e}",flush=True)
    HL["nganh"]={"err":str(e)[:120]}

# 7) KHO TIN TỨC + BÁO CÁO CTCK data/news/{SYM}.json — web tự rơi về đây khi nguồn sống chết
#    Hằng ngày: top 200 GTGD (tin đổi nhanh); --full T2: TOÀN BỘ mã.
os.makedirs(NEWS_DIR,exist_ok=True)
if FULL: ntargets=[s for s in syms if s in prices]
else:
    ntargets=sorted([s for s in syms if s in prices],
                    key=lambda s:-(board.get(s,{}).get("gtgd") or 0))[:200]
nlock=threading.Lock(); ndone=[0,0]
def work_news(sym):
    o={"sym":sym,"updated":sess_date,"news":[]}
    # NGUỒN SIMPLIZE news-event/list ĐÃ BỎ 16/08/2026 — ĐỪNG GỌI LẠI.
    # Nó KHÔNG trả về url thật của bài báo, chỉ có `slug` nội bộ; muốn mở bài phải gọi
    # THÊM một lượt tới Simplize để hỏi sourceUrl, lượt đó hỏng thì người dùng bị đẩy
    # thẳng sang simplize.vn. Đo 16/08: 8.966/9.847 tin báo chí trong kho ở đúng tình
    # trạng này — tức "dẫn nguồn rõ ràng, bấm là sang trang họ" chỉ đúng với 9% số tin.
    # User chốt: chỉ đưa tin có link thẳng tới trang báo, dẫn tới Simplize thì bỏ.
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
    # BÁO CÁO PHÂN TÍCH CTCK: THÔI CÀO HẲN 16/08/2026.
    # Trước đó rút dần: bỏ recommend/targetPrice/title/attachedLink (giữ mỗi source+date),
    # rồi gỡ cả mục hiển thị vì nguồn không đưa được link tới bài báo cáo trên trang CTCK.
    # Hộ tiêu thụ cuối cùng của mảng `reports` là tools/build_chudiem.py (lấy NGÀY báo cáo
    # SSI gần nhất), mà Chủ điểm đầu tư nay cũng bỏ nốt -> không còn ai đọc.
    # Bớt được ~1.500 lượt gọi api2.simplize.vn mỗi lượt --full.
    seen=set(); dedup=[]
    # BA CỔNG LỌC (user chốt 16/08/2026), theo thứ tự rẻ tới đắt:
    #   · TRONG 30 NGÀY — tin cũ hơn thì không thêm vào kho nữa. Mục tin của trang mã là
    #     "gần đây có gì", không phải kho lưu trữ; giữ vô hạn chỉ phình repo.
    #   · PHẢI CÓ URL THẬT — không có link thì người đọc không mở được bài tại nguồn,
    #     mà đó chính là lý do duy nhất để dẫn tin của người khác.
    #   · KHÔNG TRỎ VỀ SIMPLIZE — dẫn người xem sang một sản phẩm cùng phân khúc thì
    #     thà đừng đưa tin đó.
    HAN = NOW*1000 - 30*86400*1000
    for it in sorted(o["news"],key=lambda x:-(x.get("ts") or 0)):
        k=(it.get("title") or "").lower()[:45]
        if not k or k in seen or not tin_dung_ma(sym,it.get("title")): continue
        if (it.get("ts") or 0) < HAN: continue
        u=(it.get("url") or "")
        if not u or "simplize" in u.lower(): continue
        seen.add(k); dedup.append(it)
    o["news"]=dedup[:20]
    with nlock:
        ndone[0]+=1
        if o["news"]: ndone[1]+=1
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
plock=threading.Lock(); pdone=[0,0]; pkeep=[0]   # pkeep: số mã giữ lại cổ đông/cty con cũ
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
       # KHÔNG lưu `overallRiskLevel` (16/08/2026): đó là XẾP HẠNG RỦI RO của bên thứ ba đối
       # với từng mã cụ thể — một nhận định về chứng khoán, không phải dữ kiện. Trường này
       # chưa bao giờ được trang nào hiển thị, chỉ nằm im trong kho; thứ đo được tương đương
       # là `vol60` do chính CPVN tính trong build_screen.py.
       "shares":d.get("outstandingSharesValue")}
    _learn(o.get("nameVi"),sym); _learn(o.get("nameEn"),sym)
    fetch_ownership(sym,o)
    # GIỮ SỐ CŨ KHI LƯỢT NÀY CÀO HỤT. fetch_ownership nuốt mọi lỗi rồi trả về lặng thinh,
    # mà jdump ghi đè NGUYÊN file -> một cú 5xx của Simplize là danh sách cổ đông/công ty
    # con của mã đó biến mất, còn prof_stale() giữ nguyên file rỗng ấy thêm 3 ngày nữa vì
    # nó chỉ nhìn `v` với `updated`. Thứ Hai --full cào lại CẢ 1.522 mã cùng lúc nên đó là
    # ngày phơi nhiễm nặng nhất — và build_tapdoan chạy ngay sau đó trong CÙNG lượt, dựng
    # lại bản đồ tập đoàn từ kho vừa bị khoét. Chỉ lấy số cũ khi lượt mới trả về RỖNG: cổ
    # đông có bán sạch thì danh sách vẫn còn người khác, rỗng trơn chỉ có thể là nguồn hỏng.
    try:
        with open(os.path.join(PROF_DIR,f"{sym}.json"),encoding="utf-8") as fh: _cu=json.load(fh)
        _lay=[k for k in ("sh","funds","subs","own") if not o.get(k) and _cu.get(k)]
        for k in _lay: o[k]=_cu[k]
        if _lay:
            with plock: pkeep[0]+=1
    except Exception: pass
    o={k:v for k,v in o.items() if v not in (None,"")}
    with plock:
        pdone[1]+=1
        if pdone[0]%300==0: print(f"  hồ sơ {pdone[0]}/{len(ptargets)}",flush=True)
    jdump(o,os.path.join(PROF_DIR,f"{sym}.json"))
if ptargets:
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(work_prof,ptargets))
print(f"kho hồ sơ doanh nghiệp: cào {len(ptargets)} mã, ok {pdone[1]} (chu kỳ 3 ngày)",flush=True)
HL["profile"]={"need":len(ptargets),"ok":pdone[1],"giu_cu":pkeep[0]}

# 9) KHO LOGO assets/logo/{SYM}.webp — mã mới niêm yết tự có logo, không phải đụng tay.
#    (Kho gốc dựng 1 lần bằng tools/fetch_logos.py; ở đây chỉ vá phần thiếu.)
LOGO_DIR=os.path.join(BASE,"assets","logo")
os.makedirs(LOGO_DIR,exist_ok=True)
# ĐẾM THEO FILE THIẾU, ĐỪNG ĐẾM THEO MÃ CÓ URL. Bản cũ lọc `stocks[s].get("img")` ngay từ
# dòng đầu nên mã KHÔNG CÓ url biến mất khỏi cả vòng tải LẪN báo cáo — phiên 13/08 thực tế
# thiếu 16 logo mà health.json ghi 10, sáu mã còn lại (DTH, TAN, ANI, TAH, ULG, PCB) không
# ai biết là có tồn tại. Nay tách hai rổ và ghi cả hai ra:
#   `missing`  = thiếu file mà CÓ url  -> lượt sau thử lại được
#   `khong_url`= thiếu file mà KHÔNG có url -> nguồn Simplize không có, phải tìm nguồn khác
# `fetched` = 0 nhiều phiên liền TRONG KHI `missing` không giảm nghĩa là mấy url đó đang
# 404 ở nguồn, thử lại bao nhiêu lần cũng vậy — đừng đọc thành "chưa chạy tới".
lthieu=[s for s in syms if not os.path.exists(os.path.join(LOGO_DIR,f"{s}.webp"))]
lmiss=[s for s in lthieu if stocks[s].get("img")]
lno=[s for s in lthieu if not stocks[s].get("img")]
lok=0; lerr=None
if lmiss:
    try:
        sys.path.insert(0,os.path.join(BASE,"tools"))
        from fetch_logos import fetch_one
        for s in lmiss[:60]:                      # trần an toàn: mỗi lượt chạy tối đa 60 mã
            if fetch_one(s,stocks[s]["img"],os.path.join(LOGO_DIR,f"{s}.webp")): lok+=1
    except ImportError as e:                      # thiếu Pillow -> bỏ qua, web tự rơi về CDN nguồn
        lerr="no-pillow"
        print(f"kho logo: BỎ QUA ({e}) — cài Pillow để tự tải logo mã mới",flush=True)
if lthieu:
    print(f"kho logo: thiếu {len(lthieu)} file — {len(lmiss)} mã có url (tải thêm {lok}), "
          f"{len(lno)} mã NGUỒN KHÔNG CÓ URL"
          +(f" -> {', '.join(sorted(lno)[:12])}" if lno else ""),flush=True)
HL["logo"]={"missing":len(lmiss),"fetched":lok,"khong_url":len(lno),
            "ma":sorted(s for s in lthieu if not os.path.exists(os.path.join(LOGO_DIR,f"{s}.webp")))[:24]}
if lerr: HL["logo"]["err"]=lerr

# 10) DỮ LIỆU PHÂN TÍCH data/screen.json + data/market.json (Radar · Bản đồ nhiệt ·
#     So găng · Đường đua): RSI/MA/RS Rating/điểm cơ bản/nhịp thị trường — tự tươi mỗi phiên.
try:
    sys.path.insert(0,os.path.join(BASE,"tools"))
    import build_screen as _bs
    _bs.main()
    HL["screen"]={"ok":1}
    # BẢN ĐỒ TẬP ĐOÀN dựng từ danh sách cổ đông trong data/profile -> data/tapdoan.json.
    # Chạy sau build_screen vì cũng đọc universe.json vừa cập nhật.
    try:
        import build_tapdoan as _btd
        _btd.main()
        HL["tapdoan"]={"ok":1}
    except Exception as e2:
        print(f"tapdoan.json LỖI (không chặn pipeline): {e2}",flush=True)
        HL["tapdoan"]={"ok":0,"err":str(e2)[:120]}
    # LỊCH CHỐT QUYỀN -> data/cotuc.json. Nguồn riêng (VNDirect finfo) vì đây là chỗ duy
    # nhất có sự kiện SẮP TỚI — kho sự kiện của Simplize chỉ có quá khứ.
    try:
        import build_cotuc as _bct
        _bct.main()
        HL["cotuc"]={"ok":1}
    except Exception as e3:
        print(f"cotuc.json LỖI (không chặn pipeline): {e3}",flush=True)
        HL["cotuc"]={"ok":0,"err":str(e3)[:120]}
    # CHỦ ĐIỂM ĐẦU TƯ đã BỎ HẲN 16/08/2026 — bước dựng data/chudiem.json và
    # tools/build_chudiem.py đều gỡ. Cả mục là quan điểm của SSI Research dẫn lại; sau khi
    # gỡ khuyến nghị và giá mục tiêu thì phần còn lại chỉ là cách phân nhóm của họ.
except Exception as e:
    print(f"screen.json LỖI (không chặn pipeline): {e}",flush=True)
    HL["screen"]={"ok":0,"err":str(e)[:120]}

# 10b) NHỊP SỢ HÃI TOÀN CẦU (CNN Fear & Greed — thị trường Mỹ, không có CORS nên server
#      cào rồi ghi vào kho; CNN 418 với UA Chrome -> phải giả Safari + Referer)
try:
    _rq=urllib.request.Request("https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
        headers={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
                 "Accept":"application/json","Referer":"https://edition.cnn.com/markets/fear-and-greed"})
    with urllib.request.urlopen(_rq,timeout=20) as _r:
        _fg=json.loads(_r.read().decode()).get("fear_and_greed") or {}
    _mkp=os.path.join(BASE,"data","market.json")
    if _fg.get("score") is not None and os.path.exists(_mkp):
        _mk=json.load(open(_mkp,encoding="utf-8"))
        _mk["usfg"]={"v":rnd(_fg["score"],1),"rating":_fg.get("rating"),"at":sess_date}
        jdump(_mk,_mkp)
        print(f"nhịp toàn cầu (CNN): {_mk['usfg']['v']} ({_mk['usfg']['rating']})",flush=True)
        HL["usfg"]=1
except Exception as e:
    print(f"nhịp toàn cầu CNN lỗi (bỏ qua): {e}",flush=True); HL["usfg"]=0

# 11) health.json — nhật ký sức khoẻ lượt chạy (web + người vận hành đọc để tự chẩn đoán)
runner="actions" if os.environ.get("GITHUB_ACTIONS") else ("server" if platform.system()=="Windows" else "local")
HL_ok=(HL.get("hist",{}).get("fail",9999)<len(syms)*0.2 and HL.get("snapshot",0)>=100)
jdump({"date":sess_date,"generated":vn_now().strftime("%Y-%m-%d %H:%M:%S"),"runner":runner,
       "full":FULL,"total_syms":len(syms),"ok":HL_ok,"steps":HL},HEALTH)
print(f"health.json: ok={HL_ok} runner={runner}",flush=True)
print("XONG.",flush=True)
