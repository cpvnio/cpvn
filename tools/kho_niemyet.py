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
import json, os, re, sys, time, datetime, collections, ssl, urllib.request

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
    nay = datetime.date.today().isoformat()   # khai báo Ở ĐẦU: khối ④b cũ (đã thay) từng
                                              # giữ nó, dời khối là mất luôn -> NameError
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
    try:
        cu = {r["s"]: r for r in json.load(open(OUT, encoding="utf-8"))["ma"]}
    except Exception:
        cu = {}
    for s in syms:
        x = info.get(s)
        if not x: dem["thiếu ngày"] += 1; continue
        dd = x["listedDate"]
        # CHỈ GHI BỐN TRƯỜNG NÀY, GIỮ NGUYÊN PHẦN CÒN LẠI của bản ghi cũ.
        # Trước đây hàm này dựng lại `ma` từ số 0 nên mỗi lượt chạy là xoá sạch `gc`/`kl0`/
        # `mcny`/`gcx`/`dS` do `kho_chaosan` đắp vào — mà `gcx` mất thì lượt sau cào lại cả
        # 1.529 trang HTML (460 MB) rồi lại loại đúng ngần ấy mã.
        # Chia chủ sở hữu cho rành mạch, đừng để hai công cụ cùng ghi một trường:
        #   kho_niemyet  -> d (theo VNDirect) · ex · st · sap · sapLoi · ny
        #   kho_chaosan  -> gc · kl0 · mcny · gcx · dS · d (ghi đè theo Vietstock) · g · x
        r = cu.get(s) or {}
        truoc = r.get("d")
        r.update({"s": s, "ex": x.get("floor") or "", "st": x.get("status") or ""})
        if r.get("dS"):
            # MÃ CHUYỂN SÀN — `d` đang là ngày giao dịch ĐẦU TIÊN (Vietstock), ghép cặp với
            # `gc`. Ghi đè bằng `listedDate` của VNDirect là phá cặp đó và `gc` thành số lạc
            # (ITA: ngày 2025 của VNDirect đi với giá 54.000đ của lần niêm yết 2006).
            # Giữ `d`, còn ngày của VNDirect cho vào `dS` = ngày lên sàn HIỆN TẠI.
            r["d"] = truoc or dd
            r["dS"] = dd
        else:
            r["d"] = dd
        ma.append(r)
    ma.sort(key=lambda r: r["d"], reverse=True)
    # `g`/`x` nay do kho_chaosan tính (nó mới biết ngày CUỐI CÙNG sau bước đổi ngày), nên
    # ở đây chỉ báo lại phần đang giữ để thấy ngay nếu một lượt chạy làm mất dữ liệu cũ.
    print(f"  giữ lại từ lượt trước: giá chào sàn {sum(1 for r in ma if r.get('gc')):,}"
          f" · giá nền {sum(1 for r in ma if r.get('g')):,}"
          f" · tổng lợi suất {sum(1 for r in ma if r.get('x')):,}")

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

    # ---------- ④b LỊCH NIÊM YẾT LẦN ĐẦU ----------
    # `group:stockAlert`, type `listedHose`/`listedUpcom`/`listedHnx`. Mỗi bản ghi có mã ·
    # ngày niêm yết · sàn (suy từ type) · ngày công bố · và GIÁ THAM CHIẾU nằm trong `note`.
    # ĐÃ BỎ `bosung` (type LISTED = giao dịch bổ sung của mã đã niêm yết): user xoá khỏi
    # giao diện 20/08 vì bị đọc nhầm thành "mã mới lên sàn" hai lần. Đừng ghi lại vào kho.
    SAN = {"listedHose": "HOSE", "listedUpcom": "UPCOM", "listedHnx": "HNX"}
    ny = []
    try:
        d = json.loads(nhipmang.get(
            f"{VND}/events?q=group:stockAlert~type:listedHose,listedUpcom,listedHnx"
            f"&size=500&sort=effectiveDate:desc", timeout=45))
        seen = set()
        for x in d.get("data") or []:
            if (x.get("locale") or "VN") != "VN": continue
            c0, dd0 = x.get("code"), x.get("effectiveDate")
            if not c0 or not dd0 or (c0, dd0) in seen: continue
            seen.add((c0, dd0))
            m = re.search(r"([\d.,]+)\s*đ/cp", str(x.get("note") or ""))
            gtc = None
            if m:
                try: gtc = int(m.group(1).replace(".", "").replace(",", ""))
                except Exception: pass
            ny.append({"s": c0, "d": dd0, "ex": SAN.get(x.get("type"), ""),
                       "cb": x.get("disclosureDate") or "", "gtc": gtc})
        ny.sort(key=lambda z: z["d"], reverse=True)
    except Exception as e:
        print(f"  lịch niêm yết: lỗi {type(e).__name__}")
    print(f"  lịch niêm yết lần đầu: {len(ny)} sự kiện"
          + (f" · sắp tới {sum(1 for z in ny if z['d'] >= nay)}" if ny else ""))

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
           "sapLoi": bool(sapLoi), "ny": ny}
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
