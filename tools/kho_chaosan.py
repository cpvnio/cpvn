#!/usr/bin/env python3
"""
GIÁ CHÀO SÀN + KHỐI LƯỢNG NIÊM YẾT LẦN ĐẦU -> ghép vào data/niemyet.json

VÌ SAO CÓ FILE NÀY: hai lượt trước đã kết luận "không lấy được giá thị trường ngày lên sàn"
— sai. User chỉ ra trang hồ sơ doanh nghiệp của Vietstock có sẵn, và đúng là có:

    https://finance.vietstock.vn/{MÃ}/ho-so-doanh-nghiep.htm

  Ngày giao dịch đầu tiên | Giá chào sàn | Khối lượng niêm yết lần đầu | Khối lượng niêm yết

Dữ liệu nằm THẲNG trong HTML (server-rendered), không cần API, không cần khoá phiên. Đo:
VCB 60.000đ · HPG 127.000đ · FPT 400.000đ · VIC 125.000đ · REE 16.300đ · BID 18.800đ —
đều là giá thật của phiên chào sàn, không phải giá đã hạ nền.

VÌ SAO KHÔNG DÙNG "vốn hoá lúc lên sàn = giá chào sàn × KL lần đầu" LÀM MẪU SỐ CHO "×N LẦN":
nhiều mã chỉ niêm yết MỘT PHẦN vốn ở lần đầu — VCB niêm yết 112.285.426 cp trong khi vốn
điều lệ lúc đó là 1,21 tỷ cp (9,3%). Lấy phần niêm yết làm "vốn hoá cả công ty" là so một
mẩu với toàn bộ, ra bội số phóng đại hàng chục lần. Vốn hoá lúc lên sàn vẫn ghi vào kho vì
nó đúng NGHĨA CỦA NÓ (vốn hoá phần được niêm yết), nhưng ĐỪNG lấy làm mẫu số.

    python3 tools/kho_chaosan.py           # CHỈ mã còn thiếu giá chào sàn (dùng cho lượt 7:30)
    python3 tools/kho_chaosan.py --tatca   # làm mới TOÀN BỘ 1.529 mã (~484 giây, 460 MB)
    python3 tools/kho_chaosan.py VCB HPG   # vài mã
    python3 tools/kho_chaosan.py --thu     # chỉ in, không ghi
"""
import json, os, re, sys, time, html, threading, collections
import concurrent.futures as cf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = os.path.join(BASE, "data", "niemyet.json")
SUKIEN = os.path.join(BASE, "data", "sukien")
URL  = "https://finance.vietstock.vn/{}/ho-so-doanh-nghiep.htm"
THU  = "--thu" in sys.argv
NHAN = {"nd": "Ngày giao dịch đầu tiên", "gc": "Giá chào sàn",
        "kl0": "Khối lượng niêm yết lần đầu", "kln": "Khối lượng niêm yết"}
lock = threading.Lock()
dem  = collections.Counter()


def so(x):
    try: return float(str(x).replace(",", ""))
    except Exception: return None


def doc(sym):
    """Đọc bốn ô của mục 'Niêm yết'. Bóc thẻ rồi dò theo NHÃN chứ không theo vị trí: bố cục
    trang đổi thì vị trí đổi, còn nhãn thì không."""
    try:
        s = nhipmang.get(URL.format(sym), timeout=40)
    except Exception:
        with lock: dem["lỗi"] += 1
        return None
    t = html.unescape(re.sub(r"\|+", "|", re.sub(r"<[^>]+>", "|", s)))
    ra = {}
    for k, nh in NHAN.items():
        m = re.search(re.escape(nh) + r"\s*\|[\s|]*([\d.,/]+)\s*\|", t)
        if m: ra[k] = m.group(1)
    return ra or None


BIEN = {"HOSE": 0.20, "HNX": 0.30, "UPCOM": 0.40}


def hop_le(m):
    """`gc` có khớp với `d` không — Vietstock ghép NHẦM hai ô này ở mã CHUYỂN SÀN: họ cập
    nhật *Ngày giao dịch đầu tiên* sang sàn mới nhưng *Giá chào sàn* vẫn giữ của lần niêm yết
    gốc. Đo 20/08: ITA ghi 13/02/2025 · 54.000đ trong khi giá thật hôm đó 2.300đ; NTC ghi
    28/10/2025 · 20.000đ trong khi giá thật 164.500đ.

    Hai phép chặn, cần cả hai:
      ① `gc` là GIÁ THAM CHIẾU phiên đầu (chú giải của chính Vietstock), nên giá ĐÓNG CỬA
         phiên đó chỉ được lệch trong BIÊN ĐỘ của sàn. Cao hơn biên độ -> ghép nhầm.
      ② Thấp hơn thì hợp lệ nếu đã chia nhiều lần, nhưng KHÔNG được vượt xa mức mà chuỗi sự
         kiện giải thích được. Cho hệ số 3 lần dư dả trên tích chia tách.
    Không có `g` để soi thì cho qua — thà giữ còn hơn loại mù."""
    gc, g = m.get("gc"), m.get("g")
    if not gc or not g: return True
    b = BIEN.get(m.get("ex"), 0.40)
    if gc * (1 - b - 0.05) <= g <= gc * (1 + b + 0.05): return True
    if g > gc: return False                       # ① vượt biên độ phiên đầu
    try:
        ev = [e for e in json.load(open(os.path.join(SUKIEN, m["s"] + ".json"),
                                        encoding="utf-8"))["ev"] if e["d"] >= m["d"]]
    except Exception:
        ev = []
    nhan = 1.0
    for e in ev:
        if e.get("k") in ("cp", "thuong", "quyenmua") and (e.get("tl") or 0) > 0:
            nhan *= 1 + e["tl"] / 100
    return gc / g <= max(nhan * 3.0, 3.0)         # ②


def main():
    av = [a.upper() for a in sys.argv[1:] if not a.startswith("--")]
    d = json.load(open(OUT, encoding="utf-8"))
    ma = {r["s"]: r for r in d["ma"]}
    # ---- MẶC ĐỊNH CHỈ CÀO MÃ CÒN THIẾU ----------------------------------------
    # Giá chào sàn của mã cũ KHÔNG BAO GIỜ ĐỔI, nên cào lại cả sàn mỗi ngày là 1.529 trang
    # HTML ~300KB = 460 MB và 484 giây, để đổi lại đúng vài mã mới lên sàn. Chỉ lấy mã chưa
    # có `gc`. Muốn làm mới toàn bộ (đổi cách đọc, nguồn sửa dữ liệu) thì `--tatca`.
    if av:
        syms = av
    elif "--tatca" in sys.argv:
        syms = list(ma)
    else:
        # `gcx` = đã cào rồi và bị PHÉP KIỂM loại (xem `hop_le` bên dưới). Không cào lại
        # mỗi ngày để rồi loại lại — nguồn sẽ không tự sửa, mà mỗi lượt tốn 300KB/mã.
        syms = [k for k, v in ma.items() if not v.get("gc") and not v.get("gcx")]
        if not syms:
            print("  không mã nào thiếu giá chào sàn — không cào gì (dùng --tatca để làm mới hết)")
            return 0
    print(f"  {len(syms)} mã · giá chào sàn + KL niêm yết lần đầu (finance.vietstock.vn)"
          + ("  [CHẠY THỬ]" if THU else ""))
    t0 = time.time()

    def viec(sym):
        r = doc(sym)
        if not r: return sym, None
        with lock:
            dem["đọc được"] += 1
            if r.get("gc"): dem["có giá chào sàn"] += 1
            if r.get("kl0"): dem["có KL lần đầu"] += 1
        return sym, r

    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        kq = list(ex.map(viec, syms))

    for sym, r in kq:
        if not r or sym not in ma: continue
        m = ma[sym]
        gc, kl0 = so(r.get("gc")), so(r.get("kl0"))
        if gc and gc > 0: m["gc"] = round(gc)            # GIÁ THẬT phiên chào sàn
        if kl0 and kl0 > 0: m["kl0"] = round(kl0)        # KL niêm yết lần đầu
        # ngày giao dịch đầu tiên của Vietstock để ĐỐI CHIẾU với listedDate của VNDirect
        nd = (r.get("nd") or "")
        if re.match(r"^\d{2}/\d{2}/\d{4}$", nd):
            iso = nd[6:] + "-" + nd[3:5] + "-" + nd[:2]
            if iso != m.get("d"): m["nd2"] = iso
        if m.get("gc") and m.get("kl0"):
            m["mcny"] = round(m["gc"] * m["kl0"] / 1e9, 1)   # vốn hoá PHẦN NIÊM YẾT, tỷ đồng
        if not hop_le(m):
            for kk in ("gc", "kl0", "mcny"): m.pop(kk, None)
            m["gcx"] = 1
            dem["loại vì không khớp ngày"] += 1

    # ---- NGÀY GIAO DỊCH ĐẦU TIÊN LẤY CỦA VIETSTOCK, khớp cặp với giá chào sàn ----
    # Hai nguồn hiểu "ngày lên sàn" KHÁC NHAU: VNDirect `listedDate` = ngày niêm yết trên
    # SÀN HIỆN TẠI, Vietstock = ngày giao dịch ĐẦU TIÊN. Mã chuyển sàn thì lệch hẳn (MHL
    # 2024-09-20 vs 2009-11-26 · CVN 2025-06-11 vs 2010-08-06) — 52 mã.
    # Phát hiện ra bằng BẤT BIẾN: giá chào sàn phải >= giá đã hạ nền (hạ nền chỉ kéo giá
    # quá khứ XUỐNG). 53 mã vi phạm, và đúng là nhóm chuyển sàn — vì `g` đo ở ngày của
    # VNDirect còn `gc` là của ngày Vietstock, hai thời điểm khác nhau.
    for r in d["ma"]:
        nd2 = r.pop("nd2", None)
        if nd2 and nd2 != "1900-01-01":     # 1900-01-01 = ô rỗng của Vietstock
            r["dS"] = r["d"]                # ngày niêm yết trên sàn hiện tại
            r["d"] = nd2                    # ngày giao dịch đầu tiên
            dem["đổi sang ngày Vietstock"] += 1

    # ---- TỔNG LỢI SUẤT TRÊN MỘT CỔ PHIẾU, tính từ GIÁ CHÀO SÀN THẬT ----
    # x = (giá nay × số cp mà 1 cp gốc đã nhân lên  +  cổ tức tiền đã nhận trên 1 cp gốc)
    #     / giá chào sàn
    # KHÔNG tính quyền mua vào `nh`: nhận thêm cổ phiếu kiểu đó phải BỎ THÊM TIỀN, gộp vào
    # là tính lãi cho phần vốn góp thêm. Đây cũng là chỗ con số này thấp hơn cột cũ (dựng từ
    # chuỗi hạ nền): chuỗi đó có hạ nền theo quyền mua, tức ngầm giả định có tham gia.
    # Đo chênh lệch: VIC 30,46 vs 78,66 · REE 17,05 vs 65,48 · VCB 4,06 vs 6,32.
    try:
        lat = {r["sym"]: r for r in json.load(
            open(os.path.join(BASE, "data", "eod", "latest.json"), encoding="utf-8"))["data"]}
    except Exception:
        lat = {}
    SK = os.path.join(BASE, "data", "sukien")
    for r in d["ma"]:
        for k in ("g", "gd", "gt", "q", "nv", "mc", "sh"): r.pop(k, None)
        gc = r.get("gc")
        if not gc or gc < 10: r.pop("x", None); continue
        try:
            ev = [e for e in json.load(open(os.path.join(SK, r["s"] + ".json"),
                                            encoding="utf-8"))["ev"] if e["d"] >= r["d"]]
        except Exception:
            ev = []
        ev.sort(key=lambda e: e["d"])
        nhan, tien = 1.0, 0.0
        for e in ev:
            if e["k"] in ("cp", "thuong") and (e.get("tl") or 0) > 0: nhan *= 1 + e["tl"] / 100
            elif e["k"] == "tien" and (e.get("tien") or 0) > 0: tien += e["tien"] * nhan
        p = (lat.get(r["s"]) or {}).get("close") or 0
        if not p: r.pop("x", None); continue
        r["nh"] = round(nhan, 4)              # 1 cp gốc nay thành mấy cp
        r["ct"] = round(tien)                 # cổ tức tiền đã nhận trên 1 cp gốc
        r["x"] = round((p * nhan + tien) / gc, 2)
        dem["tính được tổng lợi suất"] += 1

    lech = [r for r in d["ma"] if r.get("dS")]
    print(f"  xong {time.time()-t0:.0f}s · " + " · ".join(f"{k} {v:,}" for k, v in dem.items()))
    print(f"  mã CHUYỂN SÀN (hai nguồn khác ngày): {len(lech)}"
          + (f" · ví dụ {[(x['s'],x['d'],x['dS']) for x in lech[:3]]}" if lech else ""))
    co = sum(1 for r in d["ma"] if r.get("gc"))
    print(f"  -> giá chào sàn phủ {co:,}/{len(d['ma']):,} mã ({100*co/len(d['ma']):.1f}%)")
    if not THU:
        json.dump(d, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(f"  đã ghi {OUT}")
    else:
        for s in syms[:6]:
            m = ma.get(s, {})
            print(f"    {s:<6}{m.get('d','—'):<12}{str(m.get('gc','—')):>10}đ"
                  f"{m.get('kl0',0):>16,} cp{str(m.get('mcny','—')):>12} tỷ")
    return 0


if __name__ == "__main__":
    sys.exit(main())
