# -*- coding: utf-8 -*-
"""RỔ MÃ LỊCH SỬ (gồm cả mã ĐÃ RỜI SÀN) -> `data/rolichsu.json`. HAI lượt gọi mạng.

VÌ SAO CẦN (21/08/2026)
-----------------------
`universe.json` là rổ **HÔM NAY**. Mọi phép đo chạy trên nó đều **SỐNG SÓT SAI LỆCH**:
mã huỷ niêm yết vì thua lỗ, vì bị đình chỉ, vì phá sản — tức đúng nhóm có lợi suất tệ
nhất — không có mặt trong mẫu. Hậu quả không phải "hơi lệch" mà là lệch CÓ HỆ THỐNG và
LUÔN theo hướng lạc quan: mọi chiến lược đo trên rổ hôm nay đều đẹp hơn sự thật, và
chiến lược càng nghiêng về mã nhỏ / mã rủi ro thì càng đẹp giả nhiều.

Nguồn có sẵn: `api-finfo.vndirect.com.vn/v4/stocks?q=status:delisted~type:STOCK` trả
**443 mã đã rời sàn**, kèm `listedDate` và `delistedDate`. Một lượt gọi.

KHO NÀY CHƯA CÓ GIÁ CỦA MÃ ĐÃ RỜI SÀN. Nó trả lời được câu *"tại phiên X thì rổ gồm
những mã nào"* — đủ để biết một phép đo đang bỏ sót bao nhiêu và bỏ sót ai. Muốn đo
lợi suất thật của nhóm đã rời sàn thì còn phải cào nến của chúng, và nguồn nến có giữ
lại hay không thì **chưa dò**. Đừng nói kho này đã chữa xong sống sót sai lệch — nó mới
làm cho chỗ thiếu ĐẾM ĐƯỢC.

  python3 tools/kho_rolichsu.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RA = os.path.join(BASE, "data", "rolichsu.json")
SRC = ("https://api-finfo.vndirect.com.vn/v4/stocks"
       "?q=status:{}~type:STOCK&size=4000")


def lay(tt):
    try:
        j = json.loads(nhipmang.get(SRC.format(tt), timeout=60))
    except Exception as e:
        print("  lỗi khi xin status={}: {}".format(tt, e))
        return []
    return j.get("data") or []


def main():
    ra = {}
    for tt in ("listed", "delisted"):
        d = lay(tt)
        if not d:
            print("  nguồn trả rỗng cho status={} — KHÔNG ghi đè kho cũ".format(tt))
            return 1
        for x in d:
            c = (x.get("code") or "").upper()
            if not c or len(c) > 5:
                continue
            ra[c] = {"ex": x.get("floor"), "tt": tt,
                     "ny": x.get("listedDate"), "huy": x.get("delistedDate"),
                     "ten": x.get("companyName") or ""}
        print("  status={:<9s} {:,} mã".format(tt, len(d)))

    huy = [k for k, v in ra.items() if v["tt"] == "delisted"]
    # phân bố năm huỷ niêm yết — để biết kho này phủ được tới đâu
    nam = {}
    for k in huy:
        d = ra[k].get("huy") or ""
        if len(d) >= 4:
            nam[d[:4]] = nam.get(d[:4], 0) + 1

    out = {"n": len(ra), "nHuy": len(huy), "ma": ra}
    tmp = RA + ".tmp"
    json.dump(out, open(tmp, "w", encoding="utf-8"), ensure_ascii=False,
              separators=(",", ":"))
    os.replace(tmp, RA)
    print("RỔ LỊCH SỬ: {:,} mã ({:,} đang niêm yết, {:,} ĐÃ RỜI SÀN)".format(
        len(ra), len(ra) - len(huy), len(huy)))
    print("  năm huỷ niêm yết: {}".format(
        ", ".join("{} {}".format(k, v) for k, v in sorted(nam.items())[-10:])))
    print("  ghi {} ({:,.0f} KB)".format(RA, os.path.getsize(RA) / 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())
