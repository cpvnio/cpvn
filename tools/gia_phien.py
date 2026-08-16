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

Script này lấy đúng 11 lượt mỗi nhịp, ghi vào kho, đẩy lên Cloudflare. Từ đó tải lên VPS
là HẰNG SỐ — 1 người xem hay 1 triệu đều như nhau.

    nhịp 30 phút · phiên 9:00-15:00  ->  13 lượt chạy = 143 lượt gọi/phiên
    (so với 108.000 lượt của kịch bản 100 người xem)

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
RA = os.path.join(BASE, "data", "board.json")
BG = "https://bgapidatafeed.vps.com.vn/getliststockdata/"
IDX = "https://bgapidatafeed.vps.com.vn/getlistindexdetail/10,11,02,03"
LO = 150                                   # y hệt client và refresh_daily
VNTZ = datetime.timezone(datetime.timedelta(hours=7))
THU = "--thu" in sys.argv
KHONG_DAY = "--khong-day" in sys.argv


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


def cao():
    """Trả về (rows, indices). Lô nào hỏng thì BỎ QUA lô đó chứ không bỏ cả lượt —
       mất 150 mã còn hơn mất 1.527."""
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


def main():
    t = gio_vn()
    rows, idx, hong = cao()
    print(f"{t:%Y-%m-%d %H:%M} · {len(rows)} mã · {len(idx)} chỉ số · {hong} lô hỏng", flush=True)

    if not rows:
        print("không lấy được mã nào -> giữ nguyên file cũ", flush=True)
        return 1
    if not dang_song(rows):
        # KHÔNG phải lỗi: ngoài giờ / nghỉ lễ thì bảng đứng yên là đúng. Chỉ là không có
        # gì mới để ghi, mà ghi đè lượt rỗng lên file cũ là xoá giá phiên vừa đóng.
        print("bảng chưa có giao dịch (ngoài giờ / nghỉ) -> không ghi", flush=True)
        return 0

    goi = {"at": int(t.timestamp() * 1000), "sess": t.strftime("%Y-%m-%d"),
           "rows": rows, "idx": idx}
    if THU:
        m = next((x for x in rows if x.get("sym") == "VIC"), rows[0])
        print("  thử — không ghi. Mẫu:", json.dumps(m, ensure_ascii=False)[:180], flush=True)
        return 0

    tmp = RA + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(goi, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, RA)                      # atomic: đọc dở file đang ghi là JSON vỡ
    print(f"đã ghi {RA} ({os.path.getsize(RA)/1024:.0f} KB)", flush=True)

    if KHONG_DAY:
        return 0
    return day()


def day():
    """Commit + push. KÉO LẠI TRƯỚC MỖI LƯỢT ĐẨY — cùng bài học với run_refresh.ps1: có
       commit khác chen vào giữa chừng là `git push` bị từ chối IM LẶNG, cả lượt nằm lại
       trong máy mà không ai biết (`Last Result: 0` vẫn là hỏng).
       `-X theirs` = đụng nhau thì lấy BẢN VỪA CÀO. An toàn tuyệt đối ở đây vì file này
       dựng lại từ đầu mỗi lượt, không có gì để mất; thiếu nó là rebase dừng giữa chừng và
       máy kẹt vĩnh viễn — ở nhịp 30 phút thì kẹt cả phiên chứ không phải một ngày.
       KHÔNG đặt GIT_SSH_COMMAND ở đây: run_gia_phien.ps1 đặt sẵn cho cả lượt chạy, giữ
       một chỗ duy nhất phải nhớ (khoá deploy tên không mặc định + known_hosts của SYSTEM)."""
    def g(*a):
        return subprocess.run(["git", "-C", BASE, *a], capture_output=True, text=True)

    def ket():
        return any(os.path.exists(os.path.join(BASE, ".git", x))
                   for x in ("rebase-merge", "rebase-apply"))

    if not g("status", "--porcelain", "data/board.json").stdout.strip():
        print("file không đổi -> khỏi commit", flush=True)
        return 0
    g("add", "data/board.json")
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
    if "--bat-buoc" not in sys.argv and not trong_phien() and not THU:
        print(f"{gio_vn():%H:%M} ngoài phiên -> thôi", flush=True)
        sys.exit(0)
    sys.exit(main())
