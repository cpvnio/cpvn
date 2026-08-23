"""TỈ LỆ LƯU THÔNG — TÍNH TỪ SỔ CỔ ĐÔNG, không lấy số ước lượng của nguồn.

VÌ SAO CÓ FILE NÀY (24/08/2026)
-------------------------------
User: *"lưu thông của nhiều mã cần xác định lại. ví dụ DNSE ghi nhận BIDV có lưu thông 6%
trong khi chúng ta chỉ ghi 2%. cần kiểm tra và lưu lại tỉ lệ lưu thông cho toàn bộ các mã"*.

Trường `freeFloat` trong `data/profile` lâu nay lấy thẳng `freeFloatRate` của Simplize. Soi
lại thì đó **không phải một tỉ lệ tính ra mà là ước lượng theo DẢI**:

  · lệch sổ cổ đông của CHÍNH nó **trung vị 10,17 điểm %** (988 mã so được), p90 40,4;
  · **48% giá trị là số NGUYÊN**, dồn vào bội số của 5 — 35, 40, 30, 20, 10, 25, 45, 50.

Với BID thì nó ghi 2,6% trong khi sổ cổ đông ngay trong cùng file ghi rõ: Ngân hàng Nhà nước
80,99% + KEB Hana Bank 15,00% = 95,99%, tức còn **4,01%**.

CÁCH TÍNH — MỘT CÂU, AI CŨNG KIỂM LẠI ĐƯỢC BẰNG CHÍNH BẢNG CỔ ĐÔNG TRÊN TRANG:

    lưu thông = 100% − tổng tỉ lệ của các cổ đông nắm từ 5% trở lên

NGƯỠNG 5% KHÔNG PHẢI SỐ CHỌN BỪA: đó đúng là mốc "cổ đông lớn" mà Luật Chứng khoán bắt phải
công bố, nên cũng là ranh giới của thứ mình NHÌN THẤY ĐƯỢC. Dưới mốc đó thì `data/profile`
đã lọc bỏ cổ đông cá nhân (xem mục *Cổ đông* trong CLAUDE.md) — có muốn trừ cũng không có số.

ĐÃ THỬ MIỄN TRỪ QUỸ ĐẦU TƯ RỒI BỎ. Lý lẽ nghe xuôi — cổ phiếu quỹ nắm vẫn mua bán hằng ngày
— nhưng nó đẻ ra số không tin được: **STB ra đúng 100,00%** vì cổ đông ≥5% duy nhất của mã đó
là một quỹ (5,21%). Không doanh nghiệp niêm yết nào có 100% cổ phiếu tự do chuyển nhượng, và
một con số như thế nhảy thẳng lên đầu mọi bảng xếp theo lưu thông. Thêm nữa nó bắt phải NHẬN
DẠNG tên quỹ bằng từ khoá, mà nhận nhầm một công ty mẹ thành quỹ là thổi lưu thông lên mà
không có gì báo. Giữ một câu không cần phân loại: **≥5% thì trừ, hết**.

BA NGUỒN KHÁC ĐÃ ĐO VÀ LOẠI — đừng dò lại:
  · **VNDirect `ratioCode:FREEFLOAT`** thực chất là `1 − TOTAL_INTERNAL_OWNERSHIP` và **bỏ
    qua sở hữu nhà nước**: nó báo VGI **100%** trong khi Viettel nắm 99,03%, báo BID 89% và
    VCB 89,97%. Đúng với GVR (3,23%) và STB (96,03%) vì ở đó "nội bộ" gánh hết.
  · **`STATE_OWNERSHIP` + `TOTAL_INTERNAL_OWNERSHIP`** của VNDirect điền KHÔNG NHẤT QUÁN
    giữa hai trường: GVR có nhà nước 0% / nội bộ 96,77% còn BID có nhà nước 59,35% (thật là
    80,99%) / nội bộ 0,01%. `1−NN−nb` ra 40,6% cho BID — sai hẳn.
  · **Khối `own`** ("Cổ đông chiến lược / thông thường / Quỹ") của Simplize tự mâu thuẫn:
    32 mã có tổng vượt 100%, POB ra −84,3%, KTC ra −106,1%.
  · **HOSE và DNSE** không mở endpoint nào trả tỉ lệ free-float (đã dò `api.hsx.vn`
    indices / index-constituents / stock-info và 6 đường của `services.entrade.com.vn`).

THIẾU THÌ ĐỂ TRỐNG. 467/1.526 hồ sơ không có sổ cổ đông và phần lớn là do NGUỒN không có
(hỏi thẳng Simplize: `shareholderDetails` trả mảng rỗng). Điền số ước lượng vào đó là quay
lại đúng thứ vừa bỏ; để trống thì trang in "nguồn chưa có tỉ lệ lưu thông" như đã làm sẵn.

    python3 tools/kho_luuthong.py            # tính lại toàn bộ, ghi vào data/profile
    python3 tools/kho_luuthong.py --thu      # chạy thử, không ghi
    python3 tools/kho_luuthong.py --ma BID VCB --thu
"""
import argparse
import collections
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROF = os.path.join(BASE, "data", "profile")

NGUONG = 5.0          # mốc "cổ đông lớn" của Luật Chứng khoán
TRAN_TONG = 100.5     # tổng vượt mức này = sổ cổ đông hỏng, không tính

def tinh(p):
    """Trả về (lưu thông, số cổ đông lớn đã trừ, lý do nếu không tính được)."""
    sh = p.get("sh") or []
    if not sh:
        return None, 0, "không có sổ cổ đông"
    lon = []
    for x in sh:
        try:
            t = float(x.get("p") or 0)
        except Exception:
            continue
        if t >= NGUONG:
            lon.append(t)
    tong = sum(lon)
    if tong > TRAN_TONG:
        return None, len(lon), "tổng cổ đông lớn %.1f%% > 100%%" % tong
    # KHÔNG CÓ AI TỪ 5% TRỞ LÊN = KHÔNG ĐỦ CĂN CỨ, ĐỪNG TRẢ VỀ 100%. Nhìn thì giống "công
    # ty đại chúng thật sự", nhưng soi ra toàn là sổ cổ đông KHUYẾT: AMV có đúng 1 dòng
    # tổng 3,05%, DDG 1 dòng 0,94%, DRH 1 dòng 0,29%, HQC 2 dòng 0,36%. Cả EIB 13 dòng mà
    # tổng chỉ 6,85% trong khi mã đó có cổ đông tổ chức nắm hàng chục phần trăm.
    # Không phân biệt được "không có cổ đông lớn" với "nguồn chưa ghi cổ đông lớn" thì
    # trả về 100% là đẩy đúng nhóm KHÔNG BIẾT GÌ lên đầu mọi bảng xếp theo lưu thông —
    # cùng cái bẫy đã ghi khi quyết định để trống free float hồi 21/08.
    if not lon:
        return None, 0, "sổ cổ đông không có ai từ 5% trở lên"
    return round(max(0.0, min(100.0, 100.0 - tong)), 2), len(lon), None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ma", nargs="*")
    ap.add_argument("--thu", action="store_true", help="chạy thử, không ghi")
    a = ap.parse_args()

    fs = sorted(os.listdir(PROF))
    if a.ma:
        chon = {s.upper() + ".json" for s in a.ma}
        fs = [f for f in fs if f in chon]
    ok = trong = 0
    ly = collections.Counter()
    doi = []
    for f in fs:
        if not f.endswith(".json"):
            continue
        d = os.path.join(PROF, f)
        try:
            p = json.load(open(d, encoding="utf-8"))
        except Exception:
            continue
        ff, n, ldo = tinh(p)
        cu = p.get("freeFloat")
        if ldo:
            ly[ldo] += 1
            trong += 1
        else:
            ok += 1
            if cu is not None and abs(float(cu) - ff) > 0.05:
                doi.append((p.get("sym"), float(cu), ff))
        # GHI ĐÈ `freeFloat` và GIỮ số cũ ở `ffNguon` — bằng không lần sau không còn gì
        # để đối chiếu, mà đây đúng là trường vừa phải sửa vì tin nhầm nguồn.
        if not a.thu:
            if cu is not None and "ffNguon" not in p:
                p["ffNguon"] = cu
            p["freeFloat"] = ff
            p["ffN"] = n
            tmp = d + ".tmp"
            json.dump(p, open(tmp, "w", encoding="utf-8"),
                      ensure_ascii=False, separators=(",", ":"))
            os.replace(tmp, d)
        if a.thu and a.ma:
            print("  %-5s cũ=%-6s mới=%-6s (trừ %d cổ đông lớn) %s"
                  % (p.get("sym"), cu, ff, n, ldo or ""))
    print("TỈ LỆ LƯU THÔNG%s" % (" (chạy thử)" if a.thu else ""))
    print("  tính được : %d mã" % ok)
    print("  để trống  : %d mã · %s" % (trong, dict(ly)))
    if doi:
        doi.sort(key=lambda z: -abs(z[1] - z[2]))
        le = sorted(abs(x[1] - x[2]) for x in doi)
        print("  đổi số    : %d mã · lệch trung vị %.2f điểm %% · p90 %.2f"
              % (len(doi), le[len(le) // 2], le[int(len(le) * .9)]))
        print("  lệch nhất :", [(s, c, m) for s, c, m in doi[:6]])


if __name__ == "__main__":
    main()
