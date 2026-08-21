# -*- coding: utf-8 -*-
"""GỘP KHO GIAO DỊCH Ở MÁY VỚI BẢN TRÊN `origin/main` — KHÔNG GỌI MẠNG.

VÌ SAO CÓ FILE NÀY (22/08/2026)
------------------------------
Lượt `kho_vnd.py --de` ở máy chạy mất ~5 tiếng (VNDirect trả 429, `nhipmang` tự giãn tới
trần 5s/lượt — xem CLAUDE.md, KHÔNG được gỡ trần ra để chạy nhanh hơn). Trong lúc đó VPS
chạy lượt EOD 15:15 và ghi PHIÊN HÔM NAY vào ĐÚNG những file `data/giaodich/*.json` mà lượt
ở máy đang viết lại. Hai bên cùng sửa một file → `git merge` xung đột cả nghìn file.

Không bên nào đúng hoàn toàn:

* **Bản ở máy** có thứ VPS không có: tầng giá đã ĐÈ bằng VNDirect cho đủ 1.000 phiên (mỗi
  cột một nguồn). Đây là mục đích của cả lượt chạy.
* **Bản `origin`** có thứ máy không có: phiên hôm nay ĐÃ CHỐT, cộng mấy trường chỉ Vietstock
  mới có cho phiên đó (`qMua`/`qBan`/`nMua`/`nBan`, tách khớp lệnh/thoả thuận). Mã nào lượt
  ở máy cào TRƯỚC 15:00 thì ô hôm nay của nó là số TRONG PHIÊN — lấy bừa là ghi đè số chốt
  bằng số dở dang, mà nhìn không ra vì cả hai đều là "một con số hợp lý".

LUẬT GỘP — ba dòng, theo đúng thứ tự:

1. **Ngày >= `--tu` (mặc định hôm nay): `origin` THẮNG TOÀN BỘ.** Đây là phiên VPS vừa chốt.
2. **Ngày chỉ có ở một bên: lấy bên đó.** Hợp nhất theo danh sách ngày, không cắt của ai.
3. **Còn lại: bản ở máy thắng; ô nào ở máy TRỐNG thì lấy `origin` lấp vào.** Vế sau là để
   giữ mấy trường Vietstock (sổ lệnh, tách thoả thuận) mà VNDirect không có.

Chạy khi nào: SAU khi `kho_vnd.py --de` chạy xong và SAU khi VPS đã đẩy lượt EOD.

    git fetch origin
    python3 tools/gop_eod.py --thu       # đếm thay đổi, không ghi
    python3 tools/gop_eod.py             # ghi thật
"""
import io
import json
import os
import subprocess
import sys
import time

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = os.path.join(BASE, "data", "giaodich")
NHANH = "origin/main"

THU = "--thu" in sys.argv
TU = None
for i, a in enumerate(sys.argv):
    if a == "--tu" and i + 1 < len(sys.argv):
        TU = sys.argv[i + 1]
if not TU:
    TU = time.strftime("%Y-%m-%d")

# Khoá vô hướng: lấy của bản ở máy, trừ `updated`/`n` phải tính lại sau khi gộp.
VO_HUONG = ("sym", "v", "sid", "day")


def cua_origin(duong):
    """Nội dung file trên `origin/main`. Trả None nếu nhánh đó chưa có file."""
    try:
        r = subprocess.run(["git", "show", "%s:%s" % (NHANH, duong)],
                           cwd=BASE, capture_output=True)
    except Exception:
        return None
    if r.returncode != 0:
        return None
    try:
        return json.loads(r.stdout.decode("utf-8"))
    except Exception:
        return None


def cot(o):
    """Tên các cột mảng (bỏ `d`)."""
    return [k for k, v in o.items() if k != "d" and isinstance(v, list)]


def gop(may, org):
    """Trả (bản gộp, số ô lấy của origin). `may` là bản ở máy, `org` là bản trên origin."""
    dm, do = may.get("d") or [], org.get("d") or []
    if not do:
        return may, 0
    im = {d: i for i, d in enumerate(dm)}
    io_ = {d: i for i, d in enumerate(do)}
    ngay = sorted(set(dm) | set(do))

    ra = {}
    for k in VO_HUONG:
        if k in may:
            ra[k] = may[k]
        elif k in org:
            ra[k] = org[k]
    ra["d"] = ngay

    lay_org = 0
    for k in sorted(set(cot(may)) | set(cot(org))):
        vm, vo = may.get(k) or [], org.get(k) or []
        arr = []
        for d in ngay:
            a = im.get(d)
            b = io_.get(d)
            x = vm[a] if (a is not None and a < len(vm)) else None
            y = vo[b] if (b is not None and b < len(vo)) else None
            # ① phiên VPS vừa chốt -> origin thắng toàn bộ
            if d >= TU:
                v = y if y is not None else x
                if y is not None and y != x:
                    lay_org += 1
            # ② ngày chỉ có ở origin -> lấy origin
            elif a is None:
                v = y
                if y is not None:
                    lay_org += 1
            # ③ máy thắng, trống thì origin lấp
            else:
                v = x
                if v is None and y is not None:
                    v = y
                    lay_org += 1
            arr.append(v)
        if any(z is not None for z in arr):
            ra[k] = arr

    ra["n"] = len(ngay)
    ra["updated"] = max(may.get("updated") or "", org.get("updated") or "") or ngay[-1]
    return ra, lay_org


def main():
    ten = sorted(f for f in os.listdir(GD) if f.endswith(".json"))
    doi = giu = thieu = 0
    o_org = 0
    ngay_them = 0
    for f in ten:
        p = os.path.join(GD, f)
        try:
            may = json.load(io.open(p, encoding="utf-8"))
        except Exception:
            continue
        org = cua_origin("data/giaodich/" + f)
        if org is None:
            thieu += 1
            continue
        truoc = len(may.get("d") or [])
        moi, n = gop(may, org)
        o_org += n
        ngay_them += len(moi["d"]) - truoc
        cu_s = json.dumps(may, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        moi_s = json.dumps(moi, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        if cu_s == moi_s:
            giu += 1
            continue
        doi += 1
        if not THU:
            io.open(p, "w", encoding="utf-8").write(
                json.dumps(moi, ensure_ascii=False, separators=(",", ":")))

    print("gộp với %s · mốc 'origin thắng' từ %s%s" % (NHANH, TU, "  (CHẠY THỬ)" if THU else ""))
    print("  file đổi %d · giữ nguyên %d · origin chưa có %d" % (doi, giu, thieu))
    print("  ô lấy của origin %d · phiên thêm mới %d" % (o_org, ngay_them))


if __name__ == "__main__":
    main()
