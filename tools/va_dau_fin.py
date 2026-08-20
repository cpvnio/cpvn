# -*- coding: utf-8 -*-
"""VÁ DẤU LƯU CHUYỂN TIỀN TỆ TRONG `data/fin` — LẤY DẤU TỪ `data/finq`, KHÔNG GỌI MẠNG.

VÌ SAO CÓ FILE NÀY (21/08/2026)
-------------------------------
`data/fin` là kho TRANG CỔ PHIẾU ĐANG ĐỌC, và khối `cfY`/`cfQ` của nó mang dấu của
24hMoney — nguồn trả một số khoản mục thành số DƯƠNG hết, kể cả dòng chi. Đo bằng đẳng
thức bắt buộc "kinh doanh + đầu tư + tài chính = lưu chuyển thuần" trên toàn kho:

    data/finq  cfY : 20.441 đúng / 431 sai  (97,9%)
    data/fin   cfY :  9.821 đúng / 1.235 sai (88,8%)

`data/finq` lấy số CÓ DẤU của VNDirect (xem `tools/kho_sau.py`) nên gần như sạch. Hai
kho dùng CHUNG mã dòng (`cfa18` `cfa26` `cfa34` `cfa35` `cfa36` `cfa38`, ngân hàng thì
`cfb64`) và CHUNG nhãn kỳ, nên ghép được thẳng, không cần hỏi nguồn lần nào.

`tools/kho_sau.py --va-fin` làm cùng việc này nhưng phải chạy TRỌN một lượt dựng `finq`
(~1.525 mã × nhiều lượt sang VNDirect). Khi `finq` đã dựng rồi thì đó là công thừa —
và còn là một lượt cào không cần thiết, trái tinh thần `tools/nhipmang.py`.

CHỈ ĐỔI DẤU, TUYỆT ĐỐI KHÔNG ĐỔI ĐỘ LỚN
---------------------------------------
Điều kiện ghi: |fin| và |finq| bằng nhau (sai số 0,5%) mà **khác dấu**. Độ lớn lệch nhau
là chuyện KHÁC HẲN — hai nguồn chốt số ở hai thời điểm, hoặc doanh nghiệp đính chính báo
cáo — và lấy bừa số bên kia là âm thầm thay dữ liệu chứ không phải vá dấu. Ca đó đếm
riêng vào `khac_do_lon` để soi bằng mắt, không tự sửa.

  python3 tools/va_dau_fin.py --thu     # chạy thử, không ghi
  python3 tools/va_dau_fin.py           # vá thật
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIN = os.path.join(BASE, "data", "fin")
FINQ = os.path.join(BASE, "data", "finq")
THU = "--thu" in sys.argv

# Chỉ đụng khối lưu chuyển tiền tệ. `bs*` của cả hai kho đều là số dương nên không có
# chuyện dấu, mà chạm vào là mở thêm một cửa hỏng không có lý do.
KHOI = ("cfY", "cfQ")


def jdump(o, p):
    t = p + ".tmp"
    with open(t, "w", encoding="utf-8") as f:
        json.dump(o, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(t, p)


def main():
    doi = ma_doi = khac = thieu = 0
    vd = []
    for f in sorted(os.listdir(FIN)):
        if not f.endswith(".json"):
            continue
        pf = os.path.join(FIN, f)
        pq = os.path.join(FINQ, f)
        if not os.path.exists(pq):
            thieu += 1
            continue
        try:
            fin = json.load(open(pf, encoding="utf-8"))
            finq = json.load(open(pq, encoding="utf-8"))
        except Exception:
            thieu += 1
            continue
        sua = 0
        for blk in KHOI:
            a, b = fin.get(blk), finq.get(blk)
            if not (isinstance(a, dict) and isinstance(b, dict)):
                continue
            # tra cứu theo (mã dòng, NHÃN KỲ) — đừng tra theo VỊ TRÍ: hai kho khác độ sâu
            # nên cùng chỉ số i là hai kỳ khác nhau, ghép kiểu đó là trộn số của hai năm.
            bl = b.get("labels") or []
            tra = {}
            for r in b.get("rows") or []:
                for i, lb in enumerate(bl):
                    v = (r.get("v") or [None] * len(bl))
                    if i < len(v) and v[i] is not None:
                        tra[(r["k"], lb)] = v[i]
            al = a.get("labels") or []
            for r in a.get("rows") or []:
                v = r.get("v") or []
                for i, lb in enumerate(al):
                    if i >= len(v) or v[i] is None:
                        continue
                    q = tra.get((r["k"], lb))
                    if q is None or q == v[i]:
                        continue
                    if abs(abs(q) - abs(v[i])) <= max(0.005 * abs(q), 0.005):
                        if (q < 0) != (v[i] < 0):
                            if len(vd) < 8:
                                vd.append((fin.get("sym"), blk, r["k"], lb, v[i], q))
                            v[i] = q
                            sua += 1
                    else:
                        khac += 1
        if sua:
            ma_doi += 1
            doi += sua
            if not THU:
                jdump(fin, pf)
    print("VÁ DẤU LƯU CHUYỂN TIỀN TỆ trong data/fin (nguồn dấu: data/finq)")
    print("  ô đổi dấu      : {:,}".format(doi))
    print("  mã bị đụng tới : {:,}".format(ma_doi))
    print("  ô lệch ĐỘ LỚN  : {:,}  (KHÔNG tự sửa — hai nguồn chốt số khác thời điểm)".format(khac))
    print("  mã không có finq: {:,}".format(thieu))
    for s, blk, k, lb, cu, moi in vd:
        print("    {:<5s} {} {:<6s} {:<6s} {:>14,.2f} -> {:>14,.2f}".format(s, blk, k, lb, cu, moi))
    if THU:
        print("  (--thu: KHÔNG ghi file nào)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
