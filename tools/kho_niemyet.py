#!/usr/bin/env python3
"""
KHO THÔNG TIN NIÊM YẾT -> data/niemyet.json

VÌ SAO MỘT FILE CHUNG chứ không mỗi mã một file như data/sukien: trang này là một BẢNG
LIỆT KÊ TOÀN SÀN (xếp theo ngày lên sàn), tức lần nào mở cũng cần cả 1.529 mã. Chia nhỏ ra
là 1.529 lượt gọi cho một lần mở trang. Đo được: cả file ~120KB, gzip còn ~35KB.

BỐN NGUỒN, mỗi thứ một chỗ — đã dò rồi mới chọn:

① NGÀY LÊN SÀN — `api-finfo.vndirect.com.vn/v4/stocks`, trường `listedDate`.
   Phủ **1.529/1.529 mã**, từ năm 2000 tới nay. Hỏi GỘP `code:A,B,C` được, 150 mã/lượt nên
   cả sàn chỉ tốn ~11 lượt. Kèm luôn `floor`, `isin`, `faceValue`, `status`.
   > Đã dò và KHÔNG có: Simplize `company/summary` (không có trường ngày niêm yết nào),
   > `finfo/v4/companies` và `/v4/listed_info` đều 404.

② GIÁ NGÀY LÊN SÀN — tự lấy từ `data/hist`, KHÔNG có nguồn nào cho sẵn.
   Lấy nến ĐẦU TIÊN có ngày >= ngày lên sàn, chấp nhận lệch tối đa 5 ngày (sàn nghỉ lễ).
   > **HAI CON SỐ, ĐỪNG TRỘN.** `data/hist` là giá ĐÃ HẠ NỀN theo mọi lần chia sau đó:
   >   `g`  = giá phiên đầu **trên nền hôm nay** — CHÍNH XÁC, và là số đúng để so với giá
   >          hiện tại ra "tăng mấy lần kể từ ngày lên sàn" (`x`), vì hai đầu cùng một nền.
   >   `gt` = giá thị trường thật ngày đó, **ƯỚC TÍNH** bằng cách gỡ ngược chuỗi hạ nền của
   >          `data/sukien` (cổ phiếu ×(1+r) · tiền P/(P−d) · quyền mua (1+r)P/(P+rX)).
   > **VÌ SAO `gt` CHỈ LÀ ƯỚC TÍNH — đã đo, đừng tin nó như số chốt:** phép tự kiểm là giá
   > thô phải rơi đúng BƯỚC GIÁ của sàn (HOSE 10/50/100đ theo dải, HNX/UPCOM 100đ). Đo trên
   > 1.051 mã: giá kho đúng bước **29,2%**, giá đã gỡ nền **28,5%** — gỡ nền KHÔNG cải thiện.
   > Lý do: mã pha loãng nhiều thì sai số dồn (VPB tích chia cổ phiếu ×4,91 · HDB ×4,74 ·
   > VHM ×3,25), và không có nguồn nào công bố giá niêm yết gốc để đối chiếu. Ca DMX (mới
   > lên sàn, đúng một sự kiện) thì gỡ ra 82.184đ so với 78.294đ của kho — sát bước giá
   > 82.200đ, tức cơ chế ĐÚNG, chỉ là càng lùi xa càng mất chính xác.
   > Nên cờ `q=1` chỉ bật khi giá thô rơi trong 1% của một bước giá hợp lệ; giao diện phải
   > đánh dấu số `q=0` là ước tính. **Đừng bỏ `g` đi mà chỉ giữ `gt`** — `g` là số chắc chắn.
   `data/hist` phủ 1.051/1.529 (478 mã còn lại lên sàn TRƯỚC 02/01/2013 — đúng mốc nguồn nến
   VNDirect bắt đầu). Phần thiếu lấy bù từ **`api.vietstock.vn/tvnew/history`** — cùng datafeed
   UDF đã dùng cho `data/sukien`, và nó lùi tới ĐÚNG NGÀY LÊN SÀN: VCB có nến từ 30/06/2009,
   FPT 13/12/2006, STB 12/07/2006, REE 31/07/2000.
   > Hỏi bằng CỬA SỔ HẸP quanh ngày lên sàn (−7 tới +53 ngày), không xin cả chuỗi: nguồn cắt
   > ở **5.000 nến** và cắt ở ĐẦU MỚI (REE xin cả chuỗi thì trả 2000→2021, mất hẳn 5 năm gần
   > đây). Cửa sổ hẹp thì mỗi lượt ~0,1 giây và không bao giờ chạm trần.
   > **HAI NGUỒN CÙNG MỘT NỀN — đã đo trước khi ghép**: 8 mã lớn, phần chồng nhau 1.651–3.400
   > phiên, trung vị tỷ lệ Vietstock/kho 0,9998–1,0049. Nên lấy giá phiên đầu của Vietstock
   > rồi chia giá hôm nay của kho để ra "×N lần" là hợp lệ, sai số ~0,5%.
   > BẪY ĐƠN VỊ: `data/hist` lưu giá KHÔNG ĐỒNG NHẤT giữa các mã (mã thì đồng, mã thì nghìn
   > đồng). Phải suy hệ số cho TỪNG MÃ bằng cách so nến cuối với `data/eod/latest.json`
   > (nguồn này chắc chắn là ĐỒNG). Bỏ qua bước này thì giá lên sàn sai 1.000 lần ở một nửa
   > số mã — đã tự dính lúc dò.

③ VỐN HOÁ NGÀY LÊN SÀN = giá lên sàn × số cổ phiếu LÚC ĐÓ. Số cổ phiếu lấy từ VỐN GÓP
   (`data/finx`, nhóm OWNERS_EQUITY) chia mệnh giá 10.000đ — quý gần nhất TRƯỚC/BẰNG quý lên
   sàn. Phủ **859 mã**. Không dùng SLCP hôm nay: mã lên sàn 10 năm trước có thể đã tăng vốn
   chục lần, nhân giá cũ với số cổ phiếu mới là thổi vốn hoá lên hàng chục lần.

④ SẮP LÊN SÀN — hai đường, và phải nói rõ đây là chỗ dữ liệu MỎNG NHẤT:
   · `api.hsx.vn/l/api/v1/1/securities?newListingStatusId=N` — đường ống hồ sơ niêm yết của
     HOSE. Tìm ra bằng cách tải bundle `www.hsx.vn/static/js/main.*.js` rồi lần theo
     `/securities/new-listing-status`. Bốn nhóm: 0 = nộp hồ sơ mới, 7 = chờ bổ sung,
     8 = ĐƯỢC CHẤP THUẬN CHÍNH THỨC, 1 = chứng quyền.
     **Chỉ HOSE**, và **không có ngày giao dịch đầu tiên** (`ftdate` luôn rỗng). Đo 20/08:
     8 hồ sơ đã nộp, 0 chờ bổ sung, 1 được chấp thuận, 35 chứng quyền.
   · **LỊCH NIÊM YẾT LẦN ĐẦU — `finfo/v4/events` nhóm `stockAlert`, type `listedHose` /
     `listedUpcom` / `listedHnx`.** ĐÂY MỚI LÀ THỨ CẦN TÌM, và tao đã kết luận nhầm "không có
     nguồn nào" ở hai lượt trước vì chỉ dò `group:investorRight` với `/v4/stocks`.
     Mỗi bản ghi có: mã · ngày niêm yết (`effectiveDate`) · sàn (suy từ `type`) · **ngày công
     bố** (`disclosureDate`) · và **giá tham chiếu** nằm trong `note` ("Giá tham chiếu: 30.000
     đ/cp"). Đo: 251 sự kiện từ 01/2022, 239 có giá tham chiếu, công bố TRƯỚC 7-10 ngày.
     > Lúc dựng kho (20/08/2026) chưa có mã nào sắp tới — đó là "chưa tới lúc công bố", KHÔNG
     > phải "không có nguồn". Giao diện phải nói đúng vế đó, kèm bằng chứng nguồn còn sống
     > (số sự kiện đã ghi + mốc gần nhất), bằng không người xem tưởng mục hỏng.
   · ~~`finfo/v4/events` type `LISTED`~~ — ĐÃ BỎ khỏi giao diện 20/08/2026. Đó là **GD BỔ SUNG** (cổ
     phiếu mới của mã ĐÃ niêm yết chính thức chào sàn), CÓ ngày rõ ràng. Không phải mã mới
     nhưng là nguồn cung thật sắp vào thị trường nên vẫn đáng hiện, để riêng một mục.
     Bản ghi có BỐN trường ngày và với loại này cả ba `effectiveDate`/`expiredDate`/
     `actualDate` bằng nhau (đo: 100/100 bản ghi) nên không có gì để chọn nhầm. Lấy thêm
     `disclosureDate` (ngày công bố) và `numberOfShares`: user nhìn "Ngày giao dịch
     20/08/2026" trơ trọi thì tưởng số liệu hỏng, phải cho thấy nó được công bố từ 9-14 ngày
     trước và khối lượng bằng bao nhiêu phần của lượng đang lưu hành thì mới đọc ra nghĩa.
     Lưu ý có bản ghi công bố từ 2023-2025 mà hiệu lực 2026 — đó là cổ phiếu ESOP hết hạn
     chuyển nhượng, không phải bản ghi cũ sót lại.
   > Đã dò và ĐÓNG: `/v4/stocks?status:pending` (rỗng), `/v4/events?group:listing` (rỗng),
   > `api.hsx.vn/l/api/v1/1/news` 404, HNX `api.hnx.vn` không phân giải, `finance.vietstock.vn
   > /data/newlisting` 404, 24hMoney `upcoming-listing` 404, Simplize `new-listing` 404.
   > **Không nguồn nào có "mã mới + ngày giao dịch đầu tiên" cho cả ba sàn.** Đừng dò lại.

    python3 tools/kho_niemyet.py          # dựng thật
    python3 tools/kho_niemyet.py --thu    # chỉ in, không ghi
"""
import json, os, sys, time, datetime, collections, ssl, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNI  = os.path.join(BASE, "universe.json")
HIST = os.path.join(BASE, "data", "hist")
FINX = os.path.join(BASE, "data", "finx")
SUKIEN = os.path.join(BASE, "data", "sukien")
LATEST = os.path.join(BASE, "data", "eod", "latest.json")
OUT  = os.path.join(BASE, "data", "niemyet.json")
VND  = "https://api-finfo.vndirect.com.vn/v4"
VS   = "https://api.vietstock.vn/tvnew/history"
HSX  = "https://api.hsx.vn/l/api/v1/1/securities"
LO   = 150
THU  = "--thu" in sys.argv
_CTX = ssl.create_default_context(); _CTX.check_hostname = False; _CTX.verify_mode = ssl.CERT_NONE


def jdump(o, p):
    tmp = p + ".tmp"
    json.dump(o, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)


def ymd(ts):
    return datetime.datetime.fromtimestamp(int(ts), datetime.UTC).strftime("%Y-%m-%d")


def ngayVN(ts):
    """Mốc của Vietstock phải đọc ở UTC+7 mới ra đúng ngày phiên — cùng bài học với
    `tools/kho_sukien.py`, đọc theo UTC là lệch một ngày."""
    return datetime.datetime.fromtimestamp(int(ts) + 7 * 3600, datetime.UTC).strftime("%Y-%m-%d")


def qk(lb):
    q, y = lb.split("/")
    return (2000 + int(y)) * 4 + int(q[1])


def buoc_gia(p, ex):
    """Bước giá của sàn — dùng làm phép TỰ KIỂM cho giá thô dựng ngược, không cần nguồn thứ hai."""
    if ex == "HOSE": return 10 if p < 10000 else (50 if p < 50000 else 100)
    return 100


def chuoi_go(sk, h, k):
    """Mốc (ngày, M) để gỡ hạ nền: giá THÔ = giá kho × M(ngày). Đi NGƯỢC từ nay về trước,
    mỗi sự kiện nhân thêm nghịch đảo hệ số hạ nền của nó. Giống hệt `bangSLCP` trên trang
    cổ phiếu — nếu sửa một bên thì phải sửa cả hai, bằng không hai chỗ ra hai con số."""
    if not sk: return []
    ngay = [ymd(t) for t in h["t"]]
    def dong_truoc(d):                       # giá kho phiên ngay TRƯỚC ngày d
        v = None
        for i, dd in enumerate(ngay):
            if dd < d: v = h["c"][i]
            else: break
        return v
    moc = []; M = 1.0
    for e in sorted(sk, key=lambda x: x["d"], reverse=True):
        if e.get("k") in ("bctc", "khac"): continue
        moc.append((e["d"], M))              # M này áp cho MỌI ngày TRƯỚC sự kiện
        adj = dong_truoc(e["d"])
        if not adj: continue
        P = adj * k * M; nd = 1.0
        r = (e.get("tl") or 0) / 100.0
        if e["k"] in ("cp", "thuong") and r > 0: nd = 1 + r
        elif e["k"] == "tien" and (e.get("tien") or 0) > 0:
            d0 = e["tien"]
            if P > 0 and d0 / P <= 0.30: nd = P / (P - d0)
        elif e["k"] == "quyenmua" and r > 0 and (e.get("gia") or 0) > 0:
            if P > 0: nd = (1 + r) * P / (P + r * e["gia"])
        if nd > 0: M *= nd
    moc.append(("0000-00-00", M))
    moc.reverse()
    return moc


def M_tai(moc, d):
    v = 1.0
    for dd, m in moc:
        if dd <= d: v = m
        else: break
    return v


def hsx(sid):
    """Đường ống niêm yết mới của HOSE. Chứng chỉ của họ hay lệch chuỗi nên bỏ verify —
    đây là dữ liệu công bố công khai, không gửi gì đi nên không có gì để lộ."""
    # API của HOSE CHẬP CHỜN — đo được TimeoutError ngay ở lượt chạy thử thứ hai. Thử lại
    # ba lần: mất mục "sắp lên sàn" chỉ vì một lượt nghẽn là quá phí, mà đây cũng là phần
    # dữ liệu mỏng nhất nên càng không được để rơi im lặng.
    req = urllib.request.Request(
        f"{HSX}?pageIndex=1&pageSize=200&newListingStatusId={sid}",
        headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json",
                 "Referer": "https://www.hsx.vn/"})
    loi = None
    for lan in range(3):
        try:
            with urllib.request.urlopen(req, timeout=45, context=_CTX) as r:
                return (json.loads(r.read().decode("utf-8", "replace")).get("data") or {}).get("list") or []
        except Exception as e:
            loi = e; time.sleep(2 * (lan + 1))
    raise loi


def main():
    t0 = time.time()
    uni = json.load(open(UNI, encoding="utf-8"))["stocks"]
    syms = [s["sym"] for s in uni]
    print(f"  {len(syms)} mã" + ("  [CHẠY THỬ]" if THU else ""))

    # ---------- ① ngày lên sàn ----------
    info = {}
    for i in range(0, len(syms), LO):
        d = json.loads(nhipmang.get(
            f"{VND}/stocks?q=code:{','.join(syms[i:i+LO])}&size=400", timeout=60))
        for x in d.get("data") or []:
            if x.get("listedDate"): info[x["code"]] = x
    print(f"  ngày lên sàn: {len(info):,}/{len(syms):,} mã")

    # ---------- giá ĐỒNG chuẩn để suy hệ số đơn vị của từng mã ----------
    dong = {}
    try:
        for r in json.load(open(LATEST, encoding="utf-8"))["data"]:
            if r.get("close"): dong[r["sym"]] = float(r["close"])
    except Exception:
        pass

    ma = []
    dem = collections.Counter()
    for s in syms:
        x = info.get(s)
        if not x: dem["thiếu ngày"] += 1; continue
        dd = x["listedDate"]
        r = {"s": s, "d": dd, "ex": x.get("floor") or "", "st": x.get("status") or ""}
        # ---------- ② giá ngày lên sàn ----------
        try:
            h = json.load(open(os.path.join(HIST, s + ".json"), encoding="utf-8"))
        except Exception:
            h = None
        if h and h.get("t"):
            # HỆ SỐ ĐƠN VỊ THEO TỪNG MÃ — xem bẫy ở đầu file
            k = 1
            if dong.get(s) and h["c"][-1]:
                k = 1000 if abs(h["c"][-1] * 1000 - dong[s]) < abs(h["c"][-1] - dong[s]) else 1
            try:
                sk = json.load(open(os.path.join(SUKIEN, s + ".json"), encoding="utf-8")).get("ev") or []
            except Exception:
                sk = []
            moc = chuoi_go(sk, h, k)
            for i, tt in enumerate(h["t"]):
                if ymd(tt) >= dd:
                    if (datetime.date.fromisoformat(ymd(tt))
                            - datetime.date.fromisoformat(dd)).days <= 5:
                        adj = h["c"][i] * k
                        r["g"] = round(adj)                      # trên NỀN HÔM NAY — chắc chắn
                        r["gd"] = ymd(tt)
                        gt = adj * M_tai(moc, ymd(tt))           # giá thị trường thật — ƯỚC TÍNH
                        r["gt"] = round(gt)
                        b = buoc_gia(gt, r["ex"])
                        r["q"] = 1 if abs(gt - round(gt / b) * b) < b * 0.01 else 0
                        if h["c"][-1]:
                            r["x"] = round(h["c"][-1] / h["c"][i], 2)   # tăng mấy lần, cùng nền
                    break
        # BÙ TỪ VIETSTOCK cho mã kho nến không với tới — xem chú thích ② ở đầu file
        if "g" not in r and h and h.get("t"):
            try:
                a0 = int(datetime.datetime.fromisoformat(dd).replace(tzinfo=datetime.UTC).timestamp())
                vs = json.loads(nhipmang.get(
                    f"{VS}?symbol={s}&resolution=D&from={a0-86400*7}&to={a0+86400*53}",
                    timeout=30, headers={"Referer": "https://stockchart.vietstock.vn/"}))
                if vs.get("s") == "ok" and vs.get("t"):
                    for i, tt in enumerate(vs["t"]):
                        d1 = ngayVN(tt)
                        if d1 >= dd:
                            if (datetime.date.fromisoformat(d1)
                                    - datetime.date.fromisoformat(dd)).days <= 5:
                                r["g"] = round(vs["c"][i]); r["gd"] = d1; r["nv"] = 1
                                if h["c"][-1]: r["x"] = round(h["c"][-1] * k / vs["c"][i], 2)
                            break
            except Exception:
                pass
        # CHẶN GIÁ VÔ NGHĨA. Nguồn trả 0 cho vài mã (VNX toàn phiên đầu = 0), mà `x` thì
        # chia cho nó -> ra ×1818 đứng đầu bảng "tăng mạnh nhất": sai mà lại ở chỗ dễ thấy
        # nhất. Dưới 10đ là dưới bước giá nhỏ nhất của mọi sàn nên chắc chắn không phải giá
        # thật; bỏ cả cụm thay vì hiện một con số không đọc được.
        if r.get("g") is not None and r["g"] < 10:
            for kk in ("g", "gd", "gt", "q", "x", "mc", "nv"): r.pop(kk, None)
            dem["bỏ vì giá < 10đ"] += 1
        if "g" in r: dem["có giá"] += 1
        if r.get("nv"): dem["  trong đó bù từ Vietstock"] += 1
        # ---------- ③ số cổ phiếu + vốn hoá lúc lên sàn ----------
        try:
            Q = (json.load(open(os.path.join(FINX, s + ".json"), encoding="utf-8")).get("Q") or {})
            vg = next((row for row in Q.get("rows") or []
                       if row.get("g") == "OWNERS_EQUITY" and "ốn góp" in (row.get("n") or "")), None)
            if vg:
                mk = int(dd[:4]) * 4 + (int(dd[5:7]) - 1) // 3 + 1
                best = None
                for lb, v in zip(Q.get("labels") or [], vg["v"]):
                    if v and qk(lb) <= mk and (best is None or qk(lb) > best[0]): best = (qk(lb), v)
                if best: r["sh"] = round(best[1] * 1e9 / 1e4)
        except Exception:
            pass
        # VỐN HOÁ ngày lên sàn dùng GIÁ THÔ (`gt`), không dùng `g`: `g` nằm trên nền hôm nay
        # nên nhân với số cổ phiếu LÚC ĐÓ là trộn hai thời điểm, ra số vô nghĩa.
        if r.get("gt") and r.get("sh"):
            r["mc"] = round(r["gt"] * r["sh"] / 1e9, 1)    # tỷ đồng
            dem["có vốn hoá"] += 1
        ma.append(r)
    ma.sort(key=lambda r: r["d"], reverse=True)
    print(f"  giá ngày lên sàn: {dem['có giá']:,} · vốn hoá ngày lên sàn: {dem['có vốn hoá']:,}")

    # ---------- ④a đường ống HOSE ----------
    sap = []
    sapLoi = False          # PHÂN BIỆT "không có hồ sơ" VỚI "không lấy được" — xem ghi chú dưới
    NHOM = {0: "Đã nộp hồ sơ", 7: "Chờ bổ sung hồ sơ", 8: "Đã được chấp thuận"}
    for sid, ten in NHOM.items():
        try: L = hsx(sid)
        except Exception as e:
            print(f"  HOSE nhóm {sid}: lỗi {type(e).__name__}"); sapLoi = True; continue
        for x in L:
            sap.append({"ten": (x.get("name") or "").strip(), "s": x.get("code") or "",
                        "kl": round(x.get("listingVolume") or 0),
                        "d": ymd(x["listDate"]) if x.get("listDate") else "",
                        "tt": ten, "ex": "HOSE"})
    sap.sort(key=lambda r: r["d"], reverse=True)
    print(f"  HOSE sắp niêm yết: {len(sap)} hồ sơ")

    # ---------- ④b giao dịch bổ sung đã có ngày ----------
    nay = datetime.date.today().isoformat()
    bosung = []
    try:
        d = json.loads(nhipmang.get(
            f"{VND}/events?q=type:LISTED~effectiveDate:gte:{nay}&sort=effectiveDate:asc&size=200",
            timeout=45))
        seen = set()
        for x in d.get("data") or []:
            if (x.get("locale") or "VN") != "VN": continue     # nguồn trả cả bản EN, lọc kẻo nhân đôi
            key = (x.get("code"), x.get("effectiveDate"), x.get("note"))
            if key in seen: continue
            seen.add(key)
            bosung.append({"s": x.get("code"), "d": x.get("effectiveDate"),
                           "cb": x.get("disclosureDate") or "",       # ngày công bố
                           "kl": round(x.get("numberOfShares") or 0),
                           "gc": (x.get("note") or "").strip()})
    except Exception as e:
        print(f"  GD bổ sung: lỗi {type(e).__name__}")
    print(f"  GD bổ sung sắp tới: {len(bosung)} đợt")

    # GIỮ LẠI DANH SÁCH CŨ KHI LẤY HỎNG. API của HOSE chập chờn thật (đo 20/08: đầu phiên
    # gọi được 9 hồ sơ, cuối phiên nghẽn liên tục suốt 5 phút). Ghi đè bằng mảng rỗng là mục
    # "sắp lên sàn" biến mất mà trang lại nói "hiện không có hồ sơ nào" — sai hẳn nghĩa.
    # Cờ `sapLoi` để giao diện nói đúng "chưa lấy được" thay vì "không có".
    if sapLoi and not sap:
        try:
            sap = json.load(open(OUT, encoding="utf-8")).get("sap") or []
            print(f"  HOSE lấy hỏng -> giữ lại {len(sap)} hồ sơ của lượt trước")
        except Exception:
            sap = []
    out = {"generated": nay, "n": len(ma), "ma": ma, "sap": sap,
           "sapLoi": bool(sapLoi), "bosung": bosung}
    if not THU:
        jdump(out, OUT)
        print(f"  đã ghi {OUT} ({os.path.getsize(OUT)/1024:.0f} KB) · {time.time()-t0:.0f}s")
    else:
        print(f"  [chạy thử] {len(json.dumps(out,ensure_ascii=False))/1024:.0f} KB")
        for r in ma[:5]:
            print(f"    {r['s']:<6}{r['d']:<12}{r.get('ex',''):<7}"
                  f"{(str(r.get('g','—'))+'đ'):>12}{(str(r.get('mc','—'))+' tỷ'):>16}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
