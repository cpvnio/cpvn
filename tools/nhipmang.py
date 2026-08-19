"""NHỊP GỌI MẠNG — trần tốc độ theo TỪNG HOST + lùi dần khi nguồn kêu.

VÌ SAO CÓ FILE NÀY (16/08/2026)
------------------------------
Pipeline vốn chỉ có `max_workers` cho từng bước và vài chỗ `time.sleep` rải rác. Ba lỗ hổng:

1. **Không có trần theo host.** Bước kho nến chạy 12 luồng, mỗi lượt ~200ms → đỉnh khoảng
   **60 lượt/giây** dội vào VNDirect. Không nguồn nào nói gì, nhưng đó là con số của một
   cuộc tấn công nhẹ chứ không phải của một trang web tử tế.
2. **Không lùi khi bị từ chối.** `get()` gặp lỗi là ném ra, nơi gọi `except: pass` rồi đi
   tiếp — mất dữ liệu ÂM THẦM, và vẫn giữ nguyên tốc độ dội tiếp vào nguồn đang quá tải.
3. **Không tự chậm lại.** Nguồn trả 429 ("chậm thôi") mà mình vẫn giữ nhịp cũ thì lần sau
   là 403 vĩnh viễn.

Đây là lớp phòng thủ cho **Điều 287 BLHS** (cản trở, gây rối loạn hoạt động mạng máy tính).
Điều đó đòi *gây rối loạn thật*, mà cách chắc chắn nhất để không bao giờ chạm tới là đừng
bao giờ chạy nhanh hơn mức một người dùng nặng bình thường. Rẻ hơn mọi lập luận pháp lý.

BA CƠ CHẾ
---------
· **Trần theo host** — mỗi host một khoảng cách tối thiểu giữa hai lượt gọi. Đo bằng đồng
  hồ chung có khoá, nên đúng kể cả khi nhiều luồng cùng gọi.
· **Lùi dần khi hỏng** — 429/5xx/lỗi mạng thì chờ 1s, 2s, 4s rồi mới thử lại. Tôn trọng
  `Retry-After` nếu nguồn có gửi.
· **TỰ CHẬM LẠI VĨNH VIỄN khi bị 429** — nhân đôi khoảng cách tối thiểu của host đó cho
  **hết lượt chạy**. Đây mới là phần quan trọng: chờ rồi thử lại với tốc độ cũ là vẫn nện.

> **ĐỪNG nới trần lên để pipeline chạy nhanh hơn.** Cả pipeline chạy lúc 15h15 không ai
> ngồi đợi; chậm thêm vài phút không mất gì, còn bị chặn IP là mất cả nguồn.
"""

import threading
import time
import urllib.error
import urllib.request

# Khoảng cách TỐI THIỂU giữa hai lượt gọi tới cùng một host, tính bằng giây.
# 1/khoảng cách = trần lượt/giây. Con số chọn theo mức nguồn chịu được và theo độ "đắt"
# của từng lượt: Simplize chặn IP sớm nhất (ghi chú có sẵn trong cao_cocau.py) nên giãn
# nhất; VPS chỉ bị gọi 12 lượt/ngày nên trần nào cũng thoải mái.
TRAN = {
    "api2.simplize.vn":            0.125,   #  8 lượt/giây
    "api.simplize.vn":             0.125,
    "dchart-api.vndirect.com.vn":  0.083,   # 12 lượt/giây — 1.526 mã ≈ 2 phút
    "api-finfo.vndirect.com.vn":   0.083,
    "bgapidatafeed.vps.com.vn":    0.200,   #  5 lượt/giây
    "histdatafeed.vps.com.vn":     0.200,
    "api-finance-t19.24hmoney.vn": 0.125,
    "iboard-query.ssi.com.vn":     0.500,   #  2 lượt/giây
    # datafeed UDF của stockchart.vietstock.vn — nguồn DUY NHẤT có lịch sử chia cổ tức đủ
    # sâu (tới 2007). Giãn 8 lượt/giây: đây là API phục vụ chart của họ, đừng ép.
    "api.vietstock.vn":            0.125,
}
MAC_DINH = 0.200          # host không khai tên -> 5 lượt/giây
LUI = (1.0, 2.0, 4.0)     # chờ bao lâu trước lần thử lại thứ 1, 2, 3
UA = "CPVN.IO/1.0 (+https://cpvn.io)"

_khoa = threading.Lock()
_lan_cuoi = {}            # host -> mốc thời gian lượt gọi gần nhất
_tran_hien = {}           # host -> trần ĐANG áp (có thể đã bị nhân đôi vì 429)


def _host(url):
    try:
        return url.split("/")[2].lower()
    except Exception:
        return "?"


def _cho_den_luot(h):
    """Chặn tới khi đủ khoảng cách với lượt gọi trước tới cùng host."""
    while True:
        with _khoa:
            tran = _tran_hien.get(h) or TRAN.get(h, MAC_DINH)
            gio = time.monotonic()
            som = _lan_cuoi.get(h, 0.0) + tran - gio
            if som <= 0:
                _lan_cuoi[h] = gio
                return
        time.sleep(som)


def _cham_lai(h, vi_sao):
    """Nguồn kêu -> nhân đôi khoảng cách của host đó cho tới hết lượt chạy."""
    with _khoa:
        cu = _tran_hien.get(h) or TRAN.get(h, MAC_DINH)
        moi = min(cu * 2, 5.0)
        _tran_hien[h] = moi
    print(f"  [nhịp] {h}: {vi_sao} -> giãn {cu:.3f}s thành {moi:.3f}s cho hết lượt chạy",
          flush=True)


def get(url, timeout=20, headers=None, doc=False):
    """Gọi URL, tôn trọng trần theo host, lùi dần khi hỏng.

    doc=True -> trả về bytes thô (dùng cho ảnh); mặc định trả về text đã giải mã.
    Ném lỗi của lần thử CUỐI nếu cả 4 lượt đều hỏng — nơi gọi tự quyết giữ số cũ hay bỏ.
    """
    h = _host(url)
    hd = {"User-Agent": UA}
    if headers:
        hd.update(headers)
    loi_cuoi = None
    for i in range(len(LUI) + 1):
        _cho_den_luot(h)
        try:
            rq = urllib.request.Request(url, headers=hd)
            with urllib.request.urlopen(rq, timeout=timeout) as r:
                b = r.read()
                return b if doc else b.decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            loi_cuoi = e
            if e.code == 429:
                _cham_lai(h, "nguồn trả 429")
                # nguồn nói rõ chờ bao lâu thì nghe theo, đừng đoán
                try:
                    ra = float(e.headers.get("Retry-After") or 0)
                except Exception:
                    ra = 0
                if ra > 0:
                    time.sleep(min(ra, 60))
                    continue
            elif e.code in (500, 502, 503, 504):
                pass                      # lỗi phía nguồn -> đáng thử lại
            else:
                raise                     # 400/403/404 -> thử lại cũng vô ích
        except Exception as e:
            loi_cuoi = e                  # timeout, đứt mạng -> thử lại
        if i < len(LUI):
            time.sleep(LUI[i])
    raise loi_cuoi


def trang_thai():
    """Host nào đã phải giãn nhịp trong lượt chạy này — để ghi vào health.json."""
    with _khoa:
        return {h: round(v, 3) for h, v in _tran_hien.items()}
