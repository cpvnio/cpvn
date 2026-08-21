# -*- coding: utf-8 -*-
"""GỌN KHO `data/giaodich` — bỏ trường Vietstock đã hết giá trị. KHÔNG gọi mạng.

VÌ SAO (22/08/2026): kho chuyển hẳn sang VNDirect cho tầng dòng tiền, nên một số trường
Vietstock chỉ còn nằm đó chiếm chỗ. Nhưng **KHÔNG PHẢI trường Vietstock nào cũng thừa** —
đo từng nhóm trước khi xoá, và chỉ xoá cái chứng minh được là bỏ đi không mất gì.

XOÁ
---
· `fnMuaPc` `fnBanPc` — **suy ra được**: `fnMuaGT ÷ mval × 100`. Đo 10.623 mẫu, lệch
  trung vị **0,0000**, p99 0,17%. Nguồn tính sẵn cho tiện, không mang thêm thông tin nào.
· `bMua` `bBan` `bMuaKL` `bBanKL` — giá và khối lượng ở bước giá tốt nhất LÚC ĐÓNG CỬA.
  Không chỗ nào trong site đọc, không nằm trong bất kỳ tín hiệu nào đã đo, và bản thân nó
  là ảnh chụp MỘT thời điểm nên không dựng được chuỗi gì có nghĩa.

· `qMua` `qBan` `nMua` `nBan` (sổ lệnh, **28,8 MB**) — user chốt 22/08/2026: *"tao không
  cần data sổ lệnh hàng ngày nữa, giá khớp lệnh trung bình và tổng khối lượng khớp lệnh
  của từng mã là quá đủ"*. Lượt EOD đã thôi cào từ cùng ngày.
  **XOÁ ĐƯỢC MÀ KHÔNG MẤT VĨNH VIỄN** — đo độ sâu trước khi xoá: trung vị **121 phiên**,
  p90 121, max 251. Vietstock chặn cứng 1 năm nên cào lại lúc nào cũng lấy về đúng chừng
  ấy; đây không phải dữ liệu chỉ-có-một-lần như tách thoả thuận.
  Cái giá, nói cho rõ: đây là tín hiệu MẠNH NHẤT kho từng đo (rank IC +0,082,
  **t = +12,24** trên 248 phiên). Mọi nghiên cứu dựa vào nó sẽ đứng lại ở 21/08/2026.

GIỮ — và đây mới là phần đáng nói
---------------------------------
· `*TTGT` `*TTKL` (tách thoả thuận) — VNDirect chỉ cho TỔNG. Không có bộ này thì không
  bao giờ trả lời được "khối ngoại mua 130 tỷ nhưng bao nhiêu là sang tay".
· `fnSoHuu` `fnRoom` — thử suy từ `fnRoomV/sh` và `(fnRoomTong−fnRoomV)/sh`: trung vị khớp
  (0,001 và 0,004) nhưng **p95 lệch 8,9 và 17,4** — tức đúng phần lớn, sai ở đuôi. Suy ra
  được "gần đúng" thì không phải là suy ra được.
· `sh` `shR` — VNDirect `stock_prices` không có SLCP lẫn vốn hoá.

  python3 tools/gon_kho.py --thu     # đo, không ghi
  python3 tools/gon_kho.py
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
THU = "--thu" in sys.argv

BO = ("fnMuaPc", "fnBanPc", "bMua", "bBan", "bMuaKL", "bBanKL", "shVa", "shLa",
      "qMua", "qBan", "nMua", "nBan")


def main():
    truoc = sau = 0
    n = 0
    dem = {k: 0 for k in BO}
    for f in sorted(os.listdir(GD)):
        if not f.endswith(".json"):
            continue
        p = os.path.join(GD, f)
        truoc += os.path.getsize(p)
        try:
            o = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        co = [k for k in BO if k in o]
        for k in co:
            dem[k] += 1
            del o[k]
        if co and not THU:
            tmp = p + ".tmp"
            with open(tmp, "w", encoding="utf-8") as g:
                json.dump(o, g, ensure_ascii=False, separators=(",", ":"))
            os.replace(tmp, p)
        sau += os.path.getsize(p)
        n += 1
    print("GỌN KHO data/giaodich — {:,} file".format(n))
    for k in BO:
        print("  bỏ {:<9s} khỏi {:,} file".format(k, dem[k]))
    print("  trước {:,.0f} MB -> sau {:,.0f} MB  (tiết kiệm {:,.0f} MB)".format(
        truoc / 1e6, sau / 1e6, (truoc - sau) / 1e6))
    if THU:
        print("  (--thu: KHÔNG ghi file nào)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
