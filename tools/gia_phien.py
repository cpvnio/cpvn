#!/usr/bin/env python3
"""
GIÁ TRONG PHIÊN — máy cào lấy bảng giá MỘT LẦN, cả thị trường đọc lại từ kho.

VÌ SAO CÓ FILE NÀY
------------------
Trang tĩnh nên trước đây MỖI trình duyệt khách tự gọi thẳng bảng giá VPS: 11 lượt gọi,
1,48 MB cho một lượt quét đủ, lặp lại mỗi 5 phút cho MỖI tab đang mở. Đo ra:

    1 tab mở 1 giờ trong phiên   =    180 lượt ·   24 MB
    100 người xem cùng lúc, 6h   = 108.000 lượt · 14,5 GB    (gấp 28× cả pipeline)
    1000 người xem cùng lúc, 6h  =  1,08 triệu ·  145 GB     (gấp 277×)

Tức là tải lên VPS TỈ LỆ THUẬN với lượng truy cập — nó tự lớn lên theo thành công của
trang, không cần ai tấn công. Và mọi lượt gọi ấy mang sẵn `Origin: https://cpvn.io` nên
log bên kia trỏ thẳng về mình.

Script này cào MỘT LẦN cho cả thị trường, ghi vào kho, đẩy lên Cloudflare. Từ đó tải lên
VPS là HẰNG SỐ — 1 người xem hay 1 triệu đều như nhau.

HAI TẦNG THEO THANH KHOẢN:
    nhóm GTGD >= 1 tỷ (282 mã, 2 lô)  ->  mỗi  5 phút
    cả thị trường   (1.527 mã, 11 lô) ->  mỗi 15 phút
    cộng lại ~360 lượt/phiên  (so với 108.000 lượt của kịch bản 100 người xem)

NGÀY NGHỈ LỄ: hỏi tới 9:30, vẫn chưa mã nào khớp lệnh thì kết luận là nghỉ và IM tới hết
ngày — trước đây lượt nào cũng chạy, tốn ~410 lượt gọi cho đúng 0 thông tin.

GHI NGUYÊN VĂN, ĐỪNG TỰ PHÂN TÍCH
---------------------------------
File ghi ra là MẢNG THÔ mà VPS trả về, không đụng vào một trường nào. Client đã có sẵn
`doPoll()` với toàn bộ luật đã trả giá đắt — quy đổi ×1000 và ×10, cờ `nt` cho mã chưa
khớp lệnh, lưới chặn biên độ, nhận diện bảng rỗng ban đêm. Phân tích lại ở đây là đẻ ra
bản sao thứ tư của chỗ khó nhất trong dự án, và hai bên sẽ trôi khỏi nhau ngay lần sửa
sau. Ghi thô thì client chạy y hệt như khi tự gọi mạng, chỉ khác chỗ lấy byte về.

    python3 tools/gia_phien.py            # cào + ghi + commit + push
    python3 tools/gia_phien.py --thu      # chỉ cào và in ra, không ghi không đẩy
    python3 tools/gia_phien.py --khong-day  # ghi file nhưng không commit/push
"""
import json, os, sys, subprocess, datetime, urllib.error

# CONSOLE WINDOWS DÙNG CP1252 — không ép UTF-8 là script CHẾT NGAY dòng print đầu tiên có
# dấu tiếng Việt: `UnicodeEncodeError: 'charmap' codec can't encode character 'ỉ'`
# (chữ "chỉ"). Đã dính đúng vậy lượt chạy thật đầu tiên trên ASTERBOX. Nguy hiểm ở chỗ nó
# không hỏng lúc viết mà hỏng lúc CHẠY TRÊN MÁY CHỦ, và chỉ hỏng với máy chủ tiếng Anh.
# `errors="replace"` để dù ngôn ngữ hệ thống có lạ tới đâu thì cũng chỉ mất dấu, không chết.
for _s in ("stdout", "stderr"):
    try:
        getattr(sys, _s).reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RA = os.path.join(BASE, "data", "board.json")        # cả thị trường, nhịp chậm
RA_NONG = os.path.join(BASE, "data", "board_nong.json")  # nhóm thanh khoản, nhịp nhanh
LATEST = os.path.join(BASE, "data", "eod", "latest.json")
GTGD_NONG = 1e9        # >= 1 tỷ/phiên. Đo 14/08: 282 mã, đúng 2 lô, chiếm 99,5% thanh
                       # khoản TOÀN thị trường — nên nhóm này cập nhật nhanh là gần như
                       # cập nhật nhanh mọi thứ người ta thật sự nhìn.
BG = "https://bgapidatafeed.vps.com.vn/getliststockdata/"
IDX = "https://bgapidatafeed.vps.com.vn/getlistindexdetail/10,11,02,03"
LO = 150                                   # y hệt client và refresh_daily
VNTZ = datetime.timezone(datetime.timedelta(hours=7))
THU = "--thu" in sys.argv
KHONG_DAY = "--khong-day" in sys.argv
# Dấu "hôm nay là ngày nghỉ" — file CỤC BỘ trên máy cào, không đẩy lên kho (xem .gitignore).
NGHI = os.path.join(BASE, "server", ".nghi_le")
PHUT_KET_LUAN = 30     # sau 9:30 mà bảng vẫn chưa ai khớp lệnh thì kết luận là nghỉ


def gio_vn():
    return datetime.datetime.now(VNTZ)


def trong_phien(t=None):
    """9:00-15:05 các ngày T2-T6. Mốc 15:05 khớp `sessionOpen` của client — để lệch là
       có khe giờ mà một bên tưởng còn phiên còn bên kia tưởng đã nghỉ."""
    t = t or gio_vn()
    if t.weekday() > 4:
        return False
    p = t.hour * 60 + t.minute
    return 540 <= p < 905


def da_biet_nghi(t):
    """Đã kết luận hôm nay là ngày nghỉ chưa. Ghi theo NGÀY nên sang hôm sau tự hết hiệu lực."""
    try:
        return open(NGHI, encoding="utf-8").read().strip() == t.strftime("%Y-%m-%d")
    except Exception:
        return False


def ghi_nghi(t):
    """NGÀY NGHỈ LỄ: kết luận MỘT LẦN rồi thôi gọi mạng cả ngày.
       Trước đây lượt nào cũng chạy, cũng gọi VPS, rồi thấy bảng trống thì bỏ — một ngày lễ
       tốn ~410 lượt gọi cho đúng 0 thông tin, mà lại đúng cái hình dạng dễ bị đọc là máy
       quét mù. Nay hỏi tới 9:30; vẫn chưa mã nào khớp lệnh thì đóng dấu và im tới hết ngày.
       CHỈ đóng dấu khi NHẬN ĐƯỢC bảng hợp lệ mà bảng trống — `dang_song` đòi >= 50 dòng, nên
       lượt gọi HỎNG (rows rỗng) không bao giờ tới được đây. Phân biệt chỗ này là bắt buộc:
       nhầm một sự cố mạng thành ngày nghỉ là tắt giá suốt cả phiên thật."""
    try:
        os.makedirs(os.path.dirname(NGHI), exist_ok=True)
        open(NGHI, "w", encoding="utf-8").write(t.strftime("%Y-%m-%d"))
    except Exception:
        pass


def nhom_nong():
    """Mã có thanh khoản, lấy từ snapshot EOD gần nhất. Không cào được thì trả rỗng ->
       lượt nào cũng quét đủ, chậm hơn chứ không sai."""
    try:
        d = json.load(open(LATEST, encoding="utf-8"))
        return sorted(r["sym"] for r in d["data"] if (r.get("gtgd") or 0) >= GTGD_NONG)
    except Exception:
        return []


def cao(syms=None):
    """Trả về (rows, indices). Lô nào hỏng thì BỎ QUA lô đó chứ không bỏ cả lượt —
       mất 150 mã còn hơn mất 1.527."""
    if syms is None:
        u = json.load(open(os.path.join(BASE, "universe.json"), encoding="utf-8"))
        syms = [s["sym"] for s in u["stocks"]]
    rows, hong = [], 0
    for i in range(0, len(syms), LO):
        try:
            rows += json.loads(nhipmang.get(BG + ",".join(syms[i:i + LO]))) or []
        except Exception as e:
            hong += 1
            print(f"  lô {i//LO+1} hỏng: {e}", flush=True)
    idx = []
    try:
        idx = json.loads(nhipmang.get(IDX)) or []
    except Exception as e:
        print("  chỉ số hỏng:", e, flush=True)
    return rows, idx, hong


def dang_song(rows):
    """Bảng có SỐ THẬT không. Ban đêm và ngày nghỉ VPS trả 0 cả thị trường; ghi đè lượt
       rỗng đó lên file đang có là xoá sạch giá của phiên vừa đóng. Cùng luật `boardEmpty`
       của client: đếm mã có giá khớp HOẶC có khối lượng."""
    if len(rows) < 50:
        return False
    song = sum(1 for x in rows
               if (float(x.get("lastPrice") or 0) > 0 or float(x.get("lot") or 0) > 0))
    return song > len(rows) * 0.1


def ghi(path, rows, idx, t):
    """Ghi atomic. Trả về True nếu RUỘT thật sự đổi — chỉ mốc giờ đổi thì thôi, đừng ghi.
       Giờ nghỉ trưa và lúc thị trường lặng, bảng đứng yên hàng chục phút; commit một file
       chỉ khác mỗi trường `at` là tốn một lượt build Cloudflare cho đúng 0 thông tin."""
    try:
        cu = json.load(open(path, encoding="utf-8")).get("rows")
    except Exception:
        cu = None
    if cu == rows:
        return False
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"at": int(t.timestamp() * 1000), "sess": t.strftime("%Y-%m-%d"),
                   "rows": rows, "idx": idx}, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)                    # atomic: đọc dở file đang ghi là JSON vỡ
    return True


def main():
    """HAI TẦNG THEO THANH KHOẢN (user chốt 17/08/2026).
       Không ai xem cùng lúc 1.527 mã. Nhóm GTGD >= 1 tỷ chỉ có 282 mã (đúng 2 lô) mà
       chiếm 99,5% thanh khoản toàn thị trường — cập nhật nhanh nhóm đó là gần như cập
       nhật nhanh mọi thứ người ta thật sự nhìn, với 2 lượt gọi thay vì 11.
           nhóm thanh khoản  ->  5 phút  ·  2 lô
           cả thị trường     -> 15 phút  · 11 lô
       Cộng lại ~360 lượt/phiên = 0,017 lượt/giây lên VPS."""
    t = gio_vn()
    nong = nhom_nong()
    # Quét ĐỦ khi: tới nhịp 15 phút · chưa lấy được nhóm nóng · file cả-thị-trường thiếu
    # hoặc đã sang phiên khác. Điều kiện cuối quan trọng: mở phiên mới mà chỉ cập nhật 282
    # mã thì 1.245 mã còn lại mang giá phiên TRƯỚC suốt 15 phút đầu.
    du = (t.minute % 15) < 5 or not nong
    if not du:
        try:
            du = json.load(open(RA, encoding="utf-8")).get("sess") != t.strftime("%Y-%m-%d")
        except Exception:
            du = True

    rows, idx, hong = cao(None if du else nong)
    print(f"{t:%Y-%m-%d %H:%M} · {'QUÉT ĐỦ' if du else 'nhóm thanh khoản'} · "
          f"{len(rows)} mã · {len(idx)} chỉ số · {hong} lô hỏng", flush=True)

    if not rows:
        print("không lấy được mã nào -> giữ nguyên file cũ", flush=True)
        return 1
    if not dang_song(rows):
        p = t.hour * 60 + t.minute
        if p >= 540 + PHUT_KET_LUAN:
            ghi_nghi(t)
            print(f"tới {t:%H:%M} vẫn chưa mã nào khớp lệnh -> KẾT LUẬN NGÀY NGHỈ, "
                  f"thôi gọi mạng tới hết ngày", flush=True)
        else:
            print("bảng chưa có giao dịch (đầu phiên) -> không ghi, lượt sau hỏi lại", flush=True)
        return 0
    if THU:
        m = next((x for x in rows if x.get("sym") == "VIC"), rows[0])
        print("  thử — không ghi. Mẫu:", json.dumps(m, ensure_ascii=False)[:150], flush=True)
        return 0

    doi = []
    if du and ghi(RA, rows, idx, t):
        doi.append("data/board.json")
    # Lượt quét đủ cũng làm mới luôn file nhóm nóng, để hai file không lệch mốc giờ
    con = [r for r in rows if r.get("sym") in set(nong)] if (du and nong) else rows
    if nong and ghi(RA_NONG, con, idx, t):
        doi.append("data/board_nong.json")
    if not doi:
        print("ruột không đổi (bảng đứng yên) -> khỏi ghi, khỏi commit", flush=True)
        return 0
    print("đã ghi: " + ", ".join(f"{p} ({os.path.getsize(os.path.join(BASE,p))/1024:.0f} KB)"
                                 for p in doi), flush=True)
    return 0 if KHONG_DAY else day(doi)


def day(doi):
    """Commit + push. KÉO LẠI TRƯỚC MỖI LƯỢT ĐẨY — cùng bài học với run_refresh.ps1: có
       commit khác chen vào giữa chừng là `git push` bị từ chối IM LẶNG, cả lượt nằm lại
       trong máy mà không ai biết (`Last Result: 0` vẫn là hỏng).
       `-X theirs` = đụng nhau thì lấy BẢN VỪA CÀO. An toàn tuyệt đối ở đây vì hai file này
       dựng lại từ đầu mỗi lượt, không có gì để mất; thiếu nó là rebase dừng giữa chừng và
       máy kẹt vĩnh viễn — ở nhịp 5 phút thì kẹt cả phiên chứ không phải một ngày.
       KHÔNG đặt GIT_SSH_COMMAND ở đây: run_gia_phien.ps1 đặt sẵn cho cả lượt chạy, giữ
       một chỗ duy nhất phải nhớ (khoá deploy tên không mặc định + known_hosts của SYSTEM)."""
    def g(*a):
        return subprocess.run(["git", "-C", BASE, *a], capture_output=True, text=True)

    def ket():
        return any(os.path.exists(os.path.join(BASE, ".git", x))
                   for x in ("rebase-merge", "rebase-apply"))

    if not g("status", "--porcelain", *doi).stdout.strip():
        print("file không đổi -> khỏi commit", flush=True)
        return 0
    g("add", *doi)
    g("commit", "-q", "-m", f"Giá phiên {gio_vn():%Y-%m-%d %H:%M}")
    for lan in range(1, 5):
        g("pull", "--rebase", "-X", "theirs", "-q", "origin", "main")
        if ket():
            print(f"  rebase kẹt vòng {lan} -> huỷ để lượt sau còn chạy", flush=True)
            g("rebase", "--abort")
            continue
        r = g("push", "-q", "origin", "HEAD:main")
        if r.returncode == 0:
            print(f"đã đẩy (vòng {lan})", flush=True)
            return 0
        print(f"  đẩy hỏng vòng {lan}: {r.stderr.strip()[:120]}", flush=True)
    open(os.path.join(BASE, "PUSH_FAILED.txt"), "w", encoding="utf-8").write(
        f"gia_phien day hong {gio_vn():%Y-%m-%d %H:%M}\n")
    return 1


if __name__ == "__main__":
    _t = gio_vn()
    if "--bat-buoc" not in sys.argv and not THU:
        if not trong_phien(_t):
            print(f"{_t:%H:%M} ngoài phiên -> thôi", flush=True)
            sys.exit(0)
        # Kiểm TRƯỚC khi gọi mạng: đã biết hôm nay nghỉ thì không tốn lượt nào nữa
        if da_biet_nghi(_t):
            print(f"{_t:%H:%M} hôm nay đã kết luận là ngày nghỉ -> thôi", flush=True)
            sys.exit(0)
    sys.exit(main())
