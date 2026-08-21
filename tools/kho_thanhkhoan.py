# -*- coding: utf-8 -*-
"""THANH KHOẢN CHÍNH THỨC CỦA TỪNG SÀN THEO PHIÊN -> `data/thanhkhoan.json`.

VÌ SAO CÓ FILE NÀY (22/08/2026)
-------------------------------
Kho của mình cộng từ 1.529 mã lên. Cộng từ dưới lên thì **thiếu bao nhiêu cũng không ai
biết** — con số vẫn hợp lý, vẫn tăng giảm theo thị trường, chỉ là thấp hơn sự thật. Đúng
cái đã xảy ra: user đối chiếu phiên 05/08/2025 thấy báo chí ghi 85,8 nghìn tỷ còn trang
mình ghi 84.371 tỷ, và soi ra là **thoả thuận hụt 30%** suốt bốn năm.

`api-finfo.vndirect.com.vn/v4/vnmarket_prices` trả số CỦA CẢ SÀN cho từng phiên, tách sẵn
`nmValue` (khớp lệnh) và `ptValue` (thoả thuận) — tức đúng hai con số mà kho tự cộng lấy.
Có nó thì mỗi phiên đều **kiểm được**: `tools/soi_thanhkhoan.py` chạy offline, không gọi
mạng, và nói ngay phiên nào hụt bao nhiêu.

ĐƠN VỊ: **ĐỒNG**, số nguyên — giống `mval`/`pval` trong `data/giaodich`. Đừng đổi sang tỷ
khi lưu; mọi cái bẫy đơn vị của dự án này đều bắt đầu từ một chỗ lưu "cho gọn".

CHỈ BA CHỈ SỐ TỔNG (VNINDEX · HNX · UPCOM). VN30/HNX30 là TẬP CON của HOSE/HNX — để chung
một file là sớm muộn có người cộng cả năm cái rồi ra con số gấp rưỡi thị trường.

    python3 tools/kho_thanhkhoan.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RA = os.path.join(BASE, "data", "thanhkhoan.json")
API = "https://api-finfo.vndirect.com.vn/v4/vnmarket_prices"
SAN = ("VNINDEX", "HNX", "UPCOM")


def main():
    ra = {}
    for m in SAN:
        u = (f"{API}?q=code:{m}~date:gte:2000-01-01~date:lte:2100-01-01"
             "&size=9000&sort=date")
        try:
            j = json.loads(nhipmang.get(u, timeout=60))
        except Exception as e:
            print(f"    {m}: lỗi {e}", flush=True)
            continue
        rows = sorted(j.get("data") or [], key=lambda r: r["date"])
        if not rows:
            continue
        ra[m] = {
            "d": [r["date"] for r in rows],
            "kl": [int(r.get("nmValue") or 0) for r in rows],
            "tt": [int(r.get("ptValue") or 0) for r in rows],
        }
        kl = sum(ra[m]["kl"]) / 1e12
        tt = sum(ra[m]["tt"]) / 1e12
        print(f"    {m}: {len(rows):,} phiên · {rows[0]['date']} → {rows[-1]['date']}"
              f" · khớp lệnh {kl:,.0f} nghìn tỷ · thoả thuận {tt:,.0f} nghìn tỷ", flush=True)
    if not ra:
        print("  không lấy được phiên nào — GIỮ NGUYÊN file cũ")
        return 0
    tmp = RA + ".tmp"
    json.dump(ra, open(tmp, "w", encoding="utf-8"), ensure_ascii=False,
              separators=(",", ":"))
    os.replace(tmp, RA)
    print(f"  data/thanhkhoan.json · {os.path.getsize(RA)//1024} KB")
    return len(ra)


if __name__ == "__main__":
    main()
