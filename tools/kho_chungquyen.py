# -*- coding: utf-8 -*-
"""KHO CHỨNG QUYỀN ĐANG LƯU HÀNH -> `data/chungquyen.json`. MỘT lượt gọi mạng.

VÌ SAO CẦN (21/08/2026)
-----------------------
Trang phân tích hiện "tự doanh mua ròng HPG 66 tỷ" và người đọc tự nhiên hiểu đó là công
ty chứng khoán đặt cược HPG lên. Phần lớn thì KHÔNG PHẢI: bán chứng quyền mua ra thì
công ty phát hành buộc phải ôm cổ phiếu cơ sở để phòng hộ — mua vì nghĩa vụ, không mang
thông tin gì về quan điểm của họ. Cùng họ với chênh lệch ETF.

Đo được: rank IC của "tự doanh ròng ÷ giá trị khớp lệnh" với lợi suất phiên sau là
**−0,019 (t = −1,37)** — không đủ tin về thống kê, nhưng SAI CHIỀU so với trực giác
thường thấy, và đây là lời giải hợp lý nhất.

Kho này không nói được chính xác bao nhiêu phần trăm là phòng hộ (không nguồn nào công
bố vị thế phòng hộ), nhưng nói được điều cần thiết: **mã này có chứng quyền đang lưu
hành hay không, của mấy công ty**. Mã có nhiều chứng quyền thì con số tự doanh phải đọc
dè dặt hẳn; mã không có cái nào thì tự doanh gần với một quyết định thật.

NGUỒN: `api-finfo.vndirect.com.vn/v4/stocks?q=status:listed~type:COVERED_WARRANT`.
Một lượt lấy trọn 328 mã. Đã dò và ĐÓNG: `/v4/cw_issues` 404 · `iboard-query.ssi.com.vn`
`/stock/group/CW` trả SUCCESS nhưng rỗng · `bgapidatafeed.vps.com.vn/getlistCK/CW` 404.

MÃ CƠ SỞ NẰM TRONG CHÍNH MÃ CHỨNG QUYỀN: `CSTB2537` = C + **STB** + năm + số đợt. Vẫn
đối chiếu với `companyName` ("Chứng quyền mua **STB** kỳ hạn 15 tháng của KAFI") rồi mới
nhận — đọc mỗi mã là có ngày gặp mã cơ sở 2 hoặc 4 ký tự rồi cắt sai.

  python3 tools/kho_chungquyen.py
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nhipmang

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNI = os.path.join(BASE, "universe.json")
RA = os.path.join(BASE, "data", "chungquyen.json")
SRC = ("https://api-finfo.vndirect.com.vn/v4/stocks"
       "?q=status:listed~type:COVERED_WARRANT&size=1000")


def main():
    try:
        j = json.loads(nhipmang.get(SRC, timeout=60))
    except Exception as e:
        print("  không lấy được danh sách chứng quyền:", e)
        return 1
    d = j.get("data") or []
    if not d:
        print("  nguồn trả rỗng — giữ nguyên kho cũ")
        return 1

    hop_le = {s["sym"] for s in json.load(open(UNI, encoding="utf-8"))["stocks"]}
    cq, bo = [], []
    for x in d:
        code = (x.get("code") or "").upper()
        ten = x.get("companyName") or ""
        # cơ sở từ MÃ: bỏ chữ C đầu, bỏ 4 số cuối
        m = re.match(r"^C([A-Z0-9]{3})\d{4}$", code)
        cs = m.group(1) if m else None
        # đối chiếu với tên: "Chứng quyền mua XXX kỳ hạn …"
        m2 = re.search(r"mua\s+([A-Z0-9]{3})\b", ten)
        cs2 = m2.group(1) if m2 else None
        if cs and cs2 and cs != cs2:
            bo.append((code, cs, cs2))
            continue
        cs = cs or cs2
        if not cs or cs not in hop_le:
            bo.append((code, cs, "không có trong universe"))
            continue
        # tổ chức phát hành nằm cuối tên: "… của KAFI"
        m3 = re.search(r"của\s+(.+?)\s*$", ten)
        cq.append({"ma": code, "cs": cs,
                   "tc": (m3.group(1).strip() if m3 else ""),
                   "ny": x.get("listedDate"), "dh": x.get("delistedDate")})

    theo = {}
    for c in cq:
        t = theo.setdefault(c["cs"], {"n": 0, "tc": []})
        t["n"] += 1
        if c["tc"] and c["tc"] not in t["tc"]:
            t["tc"].append(c["tc"])
    for t in theo.values():
        t["tc"].sort()

    out = {"n": len(cq), "cq": cq, "theoCS": theo}
    tmp = RA + ".tmp"
    json.dump(out, open(tmp, "w", encoding="utf-8"), ensure_ascii=False,
              separators=(",", ":"))
    os.replace(tmp, RA)

    top = sorted(theo.items(), key=lambda kv: -kv[1]["n"])[:12]
    print("CHỨNG QUYỀN ĐANG LƯU HÀNH: {:,} mã trên {:,} cổ phiếu cơ sở".format(
        len(cq), len(theo)))
    if bo:
        print("  bỏ {} mã không khớp cơ sở: {}".format(len(bo), bo[:4]))
    for cs, t in top:
        print("  {:<5s} {:>3d} chứng quyền · {}".format(cs, t["n"], ", ".join(t["tc"][:5])))
    print("  ghi {} ({:,.0f} KB)".format(RA, os.path.getsize(RA) / 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())
