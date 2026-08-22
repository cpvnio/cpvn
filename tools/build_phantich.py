"""BỘ TỔNG HỢP CHO TRANG PHÂN TÍCH — `data/giaodich/*` -> `data/phantich.json` + `data/phien/*`.

CHIA THEO NGÀY, KHÔNG GỘP MỘT CỤC (user chốt 20/08/2026: *"nên phân ra theo ngày rõ ràng
cho tao dễ nhìn dễ đối chiếu dễ phân tích"*).

· `data/phantich.json` — NHẸ, trang tải ngay: CHUỖI TOÀN THỊ TRƯỜNG theo phiên (đơn vị tiền
  là TỶ đồng, khối lượng là NGHÌN cổ phiếu) và khối `chiso` — điểm đóng cửa cùng % thay đổi
  của VNINDEX/VN30/HNX/HNX30/UPCOM, gióng đúng trục ngày. Nguồn chỉ số do
  `kho_giaodich.py --chiso` cào riêng vào `data/chiso.json`.
· `data/phien/{NGÀY}.json` — MỘT FILE MỖI PHIÊN, tải khi người dùng chọn phiên đó. Chứa
  `bang` (bảng mã của phiên: giá, giá TB, giá trị khớp lệnh, giá trị thoả thuận, khối
  lượng) và `ma` (vùng giá khớp lệnh + phân bổ dòng tiền, do `kho_giaodich.py --vg` ghi).
  Hai khối ghi bởi hai lượt khác nhau nên phải TRỘN chứ đừng ghi đè.

TIỀN CHỨ KHÔNG PHẢI CỔ PHIẾU (user chốt 20/08/2026: *"nhiều cổ phiếu khớp nhiều nhưng thực
tế chỉ vài trăm triệu nếu quy ra tiền"*). Bảng mã vì thế xếp mặc định theo GIÁ TRỊ khớp
lệnh, và khối lượng chỉ còn là cột phụ.

KHÔNG ĐƯA KHỐI LƯỢNG ĐẶT MUA / ĐẶT BÁN VÀO BẢNG (user chốt: *"chỉ làm nhiễu"*). Kho
`data/giaodich` vẫn lưu đủ `qMua`/`qBan`/`nMua`/`nBan` — chỉ là trang không hiện. Muốn bật
lại thì thêm vào `COT_BANG`, khỏi phải cào lại.

BA LUẬT ĐẾM, phá cái nào cũng ra số sai mà trông vẫn hợp lý
-----------------------------------------------------------
1. **CHỈ CỘNG MÃ CÓ SỐ CỦA ĐÚNG PHIÊN ĐÓ**, và ghi kèm `n` = số mã góp vào. Kho bồi dần nên
   mỗi phiên phủ khác nhau; không nói ra thì đường giá trị giao dịch dốc lên chỉ vì kho dày
   lên, mà đọc thành "thị trường sôi động dần".
2. **VỐN HOÁ CHỈ TÍNH KHI CÓ `sh`.** Coi trống là 0 thì vốn hoá thị trường tụt một bậc.
3. **PHIÊN QUÁ THƯA THÌ ĐỪNG GHI FILE NGÀY.** Dưới `MIN_MA` mã thì bảng của phiên đó không
   đại diện cho gì cả — thà không có còn hơn có một bảng 30 mã trông như cả thị trường.
"""

import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
PHIEN = os.path.join(BASE, "data", "phien")
UNI = os.path.join(BASE, "universe.json")
RA = os.path.join(BASE, "data", "phantich.json")

# Cột của bảng theo mã — TIỀN đứng trước, khối lượng là phụ.
# `sec` = ngành, để trang dựng được khối "ngành hút tiền" mà khỏi tải universe.json.
COT_BANG = ["ex", "sec", "ff", "c", "tc", "vwap", "mval", "pval", "mv", "pv", "sh",
            "fnMuaGT", "fnBanGT", "fnMuaKL", "fnBanKL", "fnSoHuu", "fnRoom",
            "tdMuaGT", "tdBanGT", "tdMuaKL", "tdBanKL",
            # VNDirect: TỔNG (khớp lệnh + thoả thuận), sâu 1.000 phiên. Trường RIÊNG,
            # không trộn với mấy cột trên — hai nguồn hai định nghĩa.
            "fnMuaTG", "fnBanTG", "tdMuaTG", "tdBanTG"]
# Ba cột KHÔNG nằm trong `data/giaodich` mà ghép từ chỗ khác — `ex`/`sec` từ universe,
# `ff` từ hồ sơ doanh nghiệp. Tách ra một chỗ để đừng phải nhớ danh sách này ở ba nơi.
COT_NGOAI = ("ex", "sec", "ff")
PROFILE = os.path.join(BASE, "data", "profile")
# Dựng file ngày cho ngần này phiên gần nhất. Nâng 120 -> 320 khi kho lên 300 phiên
# (22/08/2026): ô chọn khung cho phép xem tới 300 phiên trên đồ thị, mà bấm vào một cột
# là nhảy tới phiên đó — không có file thì bấm xong ra bảng trống.
# `ptCoFile` bên client cắt ở 320, HAI SỐ NÀY PHẢI KHỚP NHAU.
# NGUỒN CHO TẦNG DÒNG TIỀN — user chốt 22/08/2026: *"tạm ẩn nguồn Vietstock đi, toàn bộ
# dùng nguồn VNDirect"*.
#   "vnd"       -> `fnMuaTG`/`tdMuaTG` (TỔNG, gồm thoả thuận), sâu 1.000 phiên
#   "vietstock" -> `fnMuaGT`/`tdMuaGT` (khớp lệnh tách riêng), chỉ 249 phiên
#
# VÌ SAO CHỌN VNDIRECT — ba lý do đo được, không phải sở thích:
#   ① SÂU HƠN 4 LẦN: 1.000 phiên so với 249 (Vietstock chặn cứng 1 năm, đã thử lách bằng
#     cửa sổ ngày, nguồn bỏ qua cửa sổ).
#   ② CHÍNH XÁC HƠN: đối chiếu 195.524 ô, phần lệch gần như toàn bộ là **lô lẻ** mà
#     VNDirect có còn Vietstock làm tròn về lô chẵn; thêm 116 ô Vietstock làm tròn xuống 0.
#   ③ SẠCH HƠN: tìm được **112 ô Vietstock sai đơn vị ×1000** (MCH 17/12/2025 ghi tự doanh
#     bán 220 NGHÌN tỷ trong khi khối lượng × giá ra 212,5 tỷ). Chính mấy ô này đẻ ra
#     "tự doanh ròng −220.196 tỷ · chiếm 706,1%" trên trang. VNDirect không có ô nào như vậy.
#
# ĐỔI LẠI: mất phần TÁCH khớp lệnh / thoả thuận (VNDirect chỉ cho tổng). Kho vẫn giữ
# nguyên trường Vietstock, đổi hằng số này về "vietstock" là quay lại được.
NGUON_DONGTIEN = "vnd"

# 120 -> 320 -> **1000** (22/08/2026): đồ thị cho xem tới 1.000 phiên mà bấm vào cột là
# nhảy tới phiên đó — không có file thì bấm xong ra bảng trống. `ptCoFile` bên client cắt
# ở cùng số này, HAI SỐ PHẢI KHỚP NHAU.
# Giá phải trả, đo trên file phiên 20/08: 536 KB = `bang` 240 + `dt` 213 (bộ lọc ĐANG TẮT)
# + `ma` 75. Nhân 1.000 phiên là hơn nửa GB, nên đi kèm phép bỏ cột rỗng ở dưới; và
# `quet_la` vẫn chỉ ghi `dt` cho 100 phiên gần nhất chứ không phải cả 1.000.
SO_PHIEN_FILE = 1000
MIN_MA = 100             # phiên ít mã hơn thì không dựng file ngày


def nap_ff():
    """TỈ LỆ CỔ PHIẾU TỰ DO CHUYỂN NHƯỢNG (free float), %, từ `data/profile/{MÃ}.json`.

    ĐÃ NẰM SẴN TRONG KHO TỪ LÂU MÀ KHÔNG CHỖ NÀO ĐỌC (phát hiện 21/08/2026). Đây không
    phải một con số phụ: đo phiên 20/08 thì **vốn hoá toàn bộ 10.167 nghìn tỷ, vốn hoá
    free float chỉ 2.050 nghìn tỷ — 20,2%**. Và thứ hạng lật hẳn:

        BID  279 nghìn tỷ ->   7   (free float  2,6%)
        VGI  266          ->   4   (1,3%)
        VCB  483          ->  30   (6,2%)
        STB  140          -> 133   (95,0%)

    Tức STB có lượng cổ phiếu mua bán được LỚN GẤP GẦN 20 LẦN BID trong khi vốn hoá danh
    nghĩa chỉ bằng một nửa. Đó là lời giải cho chuyện ai cũng thấy mà không giải thích
    được: vì sao mấy mã nhà nước nắm gần hết thì vốn hoá to mà giá gần như không nhúc
    nhích. Xếp hạng hay cộng tổng theo vốn hoá danh nghĩa là đo một thứ không giao dịch
    được.

    Kiểm chứng bằng số: vòng quay tính trên free float dự báo lợi suất phiên sau MẠNH HƠN
    vòng quay tính trên toàn bộ cổ phiếu (rank IC −0,043 t=−3,29 so với −0,036 t=−3,18,
    đo trên 99 phiên) — đúng khái niệm và đúng cả thực nghiệm.

    THIẾU THÌ ĐỂ `None`, ĐỪNG LẤY 100 LẤP VÀO. 96/1.525 mã nguồn không có số; coi chúng
    là 100% free float thì đúng nhóm không biết gì lại nhảy lên đầu bảng thanh khoản.
    """
    ra = {}
    if not os.path.isdir(PROFILE):
        return ra
    for f in os.listdir(PROFILE):
        if not f.endswith(".json"):
            continue
        try:
            o = json.load(open(os.path.join(PROFILE, f), encoding="utf-8"))
        except Exception:
            continue
        v = o.get("freeFloat")
        if isinstance(v, (int, float)) and 0 < v <= 100:
            ra[f[:-5]] = round(float(v), 2)
    return ra


def main():
    u = json.load(open(UNI, encoding="utf-8"))["stocks"]
    san = {s["sym"]: s.get("ex") or "" for s in u}
    nganh = {s["sym"]: s.get("sector") or "" for s in u}
    ff = nap_ff()

    tt = {}                 # ngày -> tổng toàn thị trường
    bang = {}               # ngày -> {mã: [cột…]}
    doc = 0

    for s in u:
        m = s["sym"]
        p = os.path.join(GD, m + ".json")
        if not os.path.exists(p):
            continue
        try:
            o = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        doc += 1
        n = o.get("n") or 0
        d = o.get("d") or []
        if not d:
            continue
        col = {k: (o.get(k) or [None] * n) for k in COT_BANG if k not in COT_NGOAI}

        for i, ng in enumerate(d):
            c, mval, pval = col["c"][i], col["mval"][i], col["pval"][i]
            # CHỈ ĐẾM MÃ CÓ SỐ, ĐỪNG ĐẾM MÃ CHỈ "CÓ MẶT" — đã trả giá 20/08/2026.
            # Hai endpoint của nguồn có độ sâu KHÁC NHAU: thống kê giá 20 dòng/trang,
            # thống kê đặt lệnh 30 dòng/trang. Nên 10 phiên ở khoảng 21-30 có bản ghi
            # (vì có sổ lệnh) nhưng `mval`/`mv` đều None. Đếm chúng vào `n` thì đồ thị
            # hiện "1.520 mã" cạnh một cột gần bằng 0 — đọc ra thành thị trường sập,
            # trong khi sự thật là kho chưa có giá của mấy phiên đó. Nhãn số mã mà nói
            # ngược lại cái cột thì còn tệ hơn là không có nhãn.
            if c is None or mval is None:
                continue
            t = tt.setdefault(ng, {"n": 0, "mval": 0.0, "pval": 0.0, "mv": 0, "pv": 0,
                                   "mcap": 0.0, "nMcap": 0, "mcapFF": 0.0, "nFF": 0,
                                   "fnMua": 0.0, "fnBan": 0.0, "nFn": 0,
                                   "tdMua": 0.0, "tdBan": 0.0, "nTd": 0,
                                   "fnMuaT": 0.0, "fnBanT": 0.0, "nFnT": 0,
                                   "tdMuaT": 0.0, "tdBanT": 0.0, "nTdT": 0})
            t["n"] += 1
            t["mval"] += mval or 0
            t["pval"] += pval or 0
            t["mv"] += col["mv"][i] or 0
            t["pv"] += col["pv"][i] or 0
            # KHỐI NGOẠI — cộng riêng và đếm riêng `nFn`. Kho khối ngoại nông hơn kho giá
            # (nguồn trả 30 dòng/trang, lấy 2 trang = 60 phiên), nên phiên cũ có ít mã có
            # số khối ngoại hơn hẳn. Dùng chung `n` là đọc ra "khối ngoại chỉ chiếm 2% giá
            # trị" trong khi sự thật là 2% đó tính trên mẫu số của cả 1.525 mã còn tử số
            # mới có 300 mã.
            _hau = "TG" if NGUON_DONGTIEN == "vnd" else "GT"
            fm, fb2 = col["fnMua" + _hau][i], col["fnBan" + _hau][i]
            if fm is not None or fb2 is not None:
                t["fnMua"] += fm or 0
                t["fnBan"] += fb2 or 0
                t["nFn"] += 1
            # TỰ DOANH — đếm riêng `nTd` y như khối ngoại, cùng lý do: hai tầng cào bởi
            # hai lượt khác nhau nên độ phủ khác nhau, dùng chung mẫu số là ra tỉ lệ bịa.
            tm, tb2 = col["tdMua" + _hau][i], col["tdBan" + _hau][i]
            if tm is not None or tb2 is not None:
                t["tdMua"] += tm or 0
                t["tdBan"] += tb2 or 0
                t["nTd"] += 1
            # ── TỔNG của VNDirect, đếm RIÊNG. Sâu 1.000 phiên trong khi hai khối trên chỉ
            # 249 (trần 1 năm của Vietstock). KHÔNG được dùng thay cho nhau: thoả thuận
            # chiếm **15,1%** giá trị khối ngoại toàn kho, lấy tổng đội lốt khớp lệnh là
            # thổi mức tham gia lên gần một phần năm.
            fmT, fbT = col["fnMuaTG"][i], col["fnBanTG"][i]
            if fmT is not None or fbT is not None:
                t["fnMuaT"] += fmT or 0
                t["fnBanT"] += fbT or 0
                t["nFnT"] += 1
            tmT, tbT = col["tdMuaTG"][i], col["tdBanTG"][i]
            if tmT is not None or tbT is not None:
                t["tdMuaT"] += tmT or 0
                t["tdBanT"] += tbT or 0
                t["nTdT"] += 1
            sh = col["sh"][i]
            if sh and c:
                t["mcap"] += c * sh
                t["nMcap"] += 1
                # VỐN HOÁ FREE FLOAT — đếm riêng `nFF`, cùng lý do với `nFn`/`nTd`: mã
                # thiếu free float không góp vào tử số, không nói ra thì tỉ lệ float/tổng
                # đọc ra như cả thị trường trong khi mẫu số gồm cả mã chưa có số.
                f = ff.get(m)
                if f:
                    t["mcapFF"] += c * sh * f / 100.0
                    t["nFF"] += 1
            bang.setdefault(ng, {})[m] = [san.get(m, ""), nganh.get(m, ""), ff.get(m)] + \
                [col[k][i] for k in COT_BANG if k not in COT_NGOAI]

    ngays = sorted(tt)
    if not ngays:
        print("  chưa có dữ liệu trong data/giaodich", flush=True)
        return 0

    # ── file ngày ──
    os.makedirs(PHIEN, exist_ok=True)
    ghi = bo = 0
    for ng in ngays[-SO_PHIEN_FILE:]:
        r = bang.get(ng) or {}
        if len(r) < MIN_MA:
            bo += 1
            continue
        p = os.path.join(PHIEN, ng + ".json")
        cu = {}
        if os.path.exists(p):
            try:
                cu = json.load(open(p, encoding="utf-8"))
            except Exception:
                cu = {}
        # TRỘN: khối `ma` (vùng giá) do `kho_giaodich --vg` ghi, đừng xoá mất.
        # BỎ CỘT RỖNG THEO TỪNG PHIÊN. Phiên cũ hơn 249 không có một cột Vietstock nào
        # (`fnMuaGT` `tdMuaGT` `fnSoHuu` `fnRoom`…), để nguyên là mỗi mã gánh một chuỗi
        # "null,null,null…" — nhân 1.525 mã × 1.000 phiên thì riêng chữ `null` nặng hơn
        # cả dữ liệu thật.
        # AN TOÀN VỚI CLIENT: `ptBang` dựng bảng tra từ chính `p.f` (`ix[k]=i`) rồi đọc
        # `v[ix[k]]`, nên cột vắng mặt trả `undefined` — đi đúng nhánh "không có số" vốn
        # đã có. Không phải sửa gì bên client.
        dung = [k for j, k in enumerate(COT_BANG)
                if any(v[j] is not None for v in r.values())]
        if len(dung) < len(COT_BANG):
            gi = [COT_BANG.index(k) for k in dung]
            r = {m: [v[j] for j in gi] for m, v in r.items()}
        cu["date"] = ng
        cu["f"] = dung
        cu["bang"] = r
        cu["n"] = len(r)
        # CHỈ GHI KHI ĐỔI — bảng mã của một phiên đã qua không đổi nữa. Ghi vô điều kiện
        # thì lượt EOD mỗi ngày đụng vào cả 120 file cho nội dung y hệt, và git giữ lại
        # từng bản một. Cùng luật với `kho_sukien.py` và `quet_la.py`.
        moi = json.dumps(cu, ensure_ascii=False, separators=(",", ":"))
        try:
            with open(p, encoding="utf-8") as f:
                if f.read() == moi:
                    continue
        except Exception:
            pass
        tmp = p + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(moi)
        os.replace(tmp, p)
        ghi += 1

    # ── chuỗi toàn thị trường ──
    for d in ngays:
        t = tt[d]
        for k in ("mval", "pval", "mcap", "mcapFF", "fnMua", "fnBan", "tdMua", "tdBan",
                  "fnMuaT", "fnBanT", "tdMuaT", "tdBanT"):
            t[k] = round(t[k] / 1e9, 1)
        # ── PHIÊN THIẾU SỐ CỔ PHIẾU THÌ ĐỂ TRỐNG VỐN HOÁ, ĐỪNG CỘNG NỬA VỜI ──────────
        # `ratios` của VNDirect chỉ sâu 16 quý (kỳ cũ nhất 2022-12-31), nên mọi phiên
        # TRƯỚC 03/01/2023 chỉ có ĐÚNG MỘT mã có số cổ phiếu. Cộng lên vẫn ra một con số
        # trông bình thường — 2022-09-05 ra 265.616 tỷ — mà sự thật khi đó là ~5,9 triệu
        # tỷ. Đồ thị vẽ liền mạch qua chỗ đó thành ra "thị trường tăng 37 lần trong 4
        # năm", và ô "Vốn hoá thị trường" in thẳng con số 4% sự thật không kèm dấu hiệu gì.
        # Đây đúng loại sai nguy hiểm nhất của dự án này: KHÔNG có ô nào trống, không con
        # số nào vô lý, chỉ là sai. Cùng luật với cột xám "phiên kho chưa cào đủ mã" của
        # đồ thị thị trường — thà không vẽ còn hơn vẽ một con số không ai kiểm được.
        # Ngưỡng 80%: phiên đủ phủ thì tỉ lệ này luôn trên 99%, nên 80% cách xa mọi phiên
        # lành mà vẫn chặn sạch nhóm hỏng (108 phiên trước 2023).
        if not t["nMcap"] or not t["n"] or t["nMcap"] / t["n"] < 0.80:
            t["mcap"] = None
            t["mcapFF"] = None
        for k in ("mv", "pv"):
            t[k] = round(t[k] / 1e3)
    # CHỈ SỐ — gióng theo đúng trục ngày của chuỗi giao dịch. Thiếu phiên nào thì để None
    # chứ đừng kéo giá trị gần nhất lấp vào: chỉ số đứng im ba phiên liền là một câu nói
    # về thị trường, không phải một chỗ trống được lấp.
    cs = {}
    try:
        raw = json.load(open(os.path.join(BASE, "data", "chiso.json"), encoding="utf-8"))
        for m, o in raw.items():
            ix = {d: i for i, d in enumerate(o["d"])}
            cs[m] = {"c": [o["c"][ix[d]] if d in ix else None for d in ngays],
                     "pc": [o["pc"][ix[d]] if d in ix else None for d in ngays]}
    except Exception:
        cs = {}

    out = {
        "date": ngays[-1],
        "phu": {"docFile": doc, "phien": len(ngays), "fileNgay": ghi},
        "tt": {"d": ngays,
               **{k: [tt[d][k] for d in ngays]
                  for k in ("n", "mval", "pval", "mv", "pv", "mcap", "nMcap",
                            "mcapFF", "nFF",
                            "fnMua", "fnBan", "nFn", "tdMua", "tdBan", "nTd",
                            "fnMuaT", "fnBanT", "nFnT", "tdMuaT", "tdBanT", "nTdT")}},
        "chiso": cs,
    }
    tmp = RA + ".tmp"
    json.dump(out, open(tmp, "w", encoding="utf-8"), ensure_ascii=False,
              separators=(",", ":"))
    os.replace(tmp, RA)

    i = len(ngays) - 1
    print(f"  đọc {doc:,} file · {len(ngays):,} phiên · file ngày: GHI {ghi} (còn lại y hệt), bỏ {bo} (dưới {MIN_MA} mã)"
          f" · phantich.json {os.path.getsize(RA)/1024:,.0f} KB", flush=True)
    print(f"  phiên {ngays[i]}: {out['tt']['n'][i]:,} mã · khớp lệnh {out['tt']['mval'][i]:,.0f} tỷ"
          f" · thoả thuận {out['tt']['pval'][i]:,.0f} tỷ"
          f" · vốn hoá {out['tt']['mcap'][i]/1000:,.0f} nghìn tỷ", flush=True)
    _mc, _ffc = out["tt"]["mcap"][i], out["tt"]["mcapFF"][i]
    print(f"  free float: vốn hoá giao dịch được {_ffc/1000:,.0f} nghìn tỷ"
          f" = {(_ffc/_mc*100 if _mc else 0):.1f}% vốn hoá danh nghĩa"
          f" · {out['tt']['nFF'][i]:,}/{out['tt']['nMcap'][i]:,} mã có tỉ lệ", flush=True)
    print(f"  khối ngoại: mua {out['tt']['fnMua'][i]:,.0f} tỷ · bán {out['tt']['fnBan'][i]:,.0f} tỷ"
          f" · ròng {out['tt']['fnMua'][i]-out['tt']['fnBan'][i]:+,.0f} tỷ"
          f" · trên {out['tt']['nFn'][i]:,} mã có số", flush=True)
    print(f"  tự doanh  : mua {out['tt']['tdMua'][i]:,.0f} tỷ · bán {out['tt']['tdBan'][i]:,.0f} tỷ"
          f" · ròng {out['tt']['tdMua'][i]-out['tt']['tdBan'][i]:+,.0f} tỷ"
          f" · trên {out['tt']['nTd'][i]:,} mã có số", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
