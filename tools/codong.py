"""Phân biệt CỔ ĐÔNG LÀ TỔ CHỨC hay CÁ NHÂN, và luật lọc danh sách cổ đông.

VÌ SAO CÓ FILE NÀY (16/08/2026)
------------------------------
`data/profile/{MÃ}.json` trường `sh` chứa TÊN NGƯỜI THẬT kèm tỉ lệ sở hữu và số cổ phiếu
— 15.318 bản ghi, trong đó 12.647 dưới 5%. Tên định danh + thông tin tài chính là dữ liệu
cá nhân theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 (hiệu lực 01/01/2026), nhóm có
trần phạt cao nhất trong cả hồ sơ (3 tỷ / 5% doanh thu / 10 lần khoản thu).

Lập luận bảo vệ mạnh nhất là "dữ liệu đã công khai theo nghĩa vụ pháp luật" — mà nghĩa vụ
ấy chỉ áp cho **cổ đông lớn từ 5% trở lên**. Cổ đông cá nhân nắm 0,03% thì không có nghĩa
vụ công bố nào, nên phần đó nằm ngoài lập luận. Vì thế: giữ cá nhân từ 5%, bỏ phần dưới.

**TỔ CHỨC THÌ GIỮ HẾT, KHÔNG CÓ SÀN.** Hai lý do:
  1. Pháp nhân không phải "cá nhân" — không thuộc phạm vi Luật 91/2025.
  2. Cắt tổ chức là VỠ `build_tapdoan.py`, mà vỡ ÂM THẦM:
     · nhãn doanh nghiệp nhà nước tính bằng cách **CỘNG DỒN mọi cổ đông nhà nước KHÔNG CÓ
       SÀN %** (xem `NGUONG_CHI_PHOI`). Một Bộ nắm 3% cộng SCIC 48% = 51% -> nhà nước; bỏ
       ô 3% đi là còn 48%, cả nhóm mất nhãn mà không có lỗi nào báo ra.
     · nối nhóm theo mã (`ma:XXX`) đọc trường `t` cũng không có sàn %.

CÁCH NHẬN TỔ CHỨC — theo THỨ TỰ, dừng ở dấu hiệu đầu tiên khớp:
  1. có trường `t` (mã chứng khoán do nguồn tự dò) -> chắc chắn là tổ chức niêm yết;
  2. tên chứa một trong các từ khoá loại hình / cơ quan bên dưới.
Còn lại coi là cá nhân. Bảng từ khoá phải phủ CẢ tiếng Việt lẫn tiếng Anh vì nguồn trả
lẫn lộn: "Công ty TNHH KSP Investment", "Tokio Marine Asset Management Co., Ltd.",
"Commission for the Management of State Capital at Enterprises".

> **THÀ GIỮ NHẦM CÒN HƠN BỎ NHẦM.** Nhận nhầm cá nhân thành tổ chức chỉ là giữ lại một
> dòng lẽ ra nên bỏ; nhận nhầm tổ chức thành cá nhân là xoá mất dữ liệu mà bản đồ tập đoàn
> đang dựa vào. Nên bảng từ khoá cố ý RỘNG.
"""

import re
import unicodedata

NGUONG_CA_NHAN = 5.0        # cá nhân dưới ngưỡng này thì bỏ — đúng ngưỡng "cổ đông lớn"

# BA BẢNG, BA KIỂU KHỚP — đừng gộp, mỗi kiểu sinh ra để chữa một lỗi đã ĐO ĐƯỢC.
#
# CHUA : từ khoá DÀI, khớp CHUỖI CON ở bất kỳ đâu. Đủ dài để không trúng bừa.
# DAU  : từ chỉ cơ quan/loại hình tiếng Việt, CHỈ khớp khi là TỪ ĐẦU TIÊN.
#        "Quỹ …", "Bộ …", "Sở …", "Cục …", "Viện …" luôn đứng đầu tên tổ chức. Khớp ở
#        giữa hay cuối là bắt nhầm TÊN NGƯỜI — đo trên kho thật: "Nguyen Van Quy",
#        "La Thi Quy", "Le Thanh Vien", "Lim Young So"; riêng "quy" dính 48 bản ghi.
# DUOI : hậu tố pháp lý Latin, CHỈ khớp khi nằm trong HAI TỪ CUỐI. Suffix công ty luôn ở
#        cuối ("… Pte. Ltd.", "… Corp JSC", "Tundra Fonder AB"). Cho lùi một nấc vì có tên
#        đính đuôi trong ngoặc — "T. Rowe Price International Ltd. (Australia)".
CHUA = (
    "cong ty", "cty", "ctcp", "tnhh", "co phan", "tap doan", "tong cong ty",
    "doanh nghiep", "xi nghiep", "nong truong", "lam truong", "hop tac xa",
    "chi nhanh", "van phong dai dien",
    "fund", "fonder", "fondi", "ngan hang", "bank", "bao hiem", "insurance",
    "chung khoan", "securities", "dau tu", "investment", "capital", "asset",
    "holding", "financ", "credit", "trust", "pension", "sicav", "portfolio",
    "partners", "advisor", "adviser", "associates", "management", "managers",
    "co., ltd", "co.,ltd", "co ltd", "limited", "corporation", "company",
    "incorporated", "enterprise", "group", "gmbh", "sarl", "kgaa",
    "ubnd", "uy ban", "tinh uy", "thanh uy", "hoc vien", "truong dai hoc",
    "university", "ministry", "commission", "committee", "authority", "agency",
    "government", "people's committee", "peoples committee", "province",
    "treasury", "central bank", "federation", "association", "hiep hoi",
    "lien doan", "cong doan", "to chuc", "organization", "foundation", "institute",
    "scic", "vsd",
)
DAU  = ("quy", "bo", "so", "cuc", "vien", "ban", "hoi", "lien", "tong", "trung")
DUOI = ("ab", "abp", "as", "a/s", "oyj", "plc", "inc", "inc.", "corp", "corp.",
        "ltd", "ltd.", "llc", "l.l.c", "lp", "l.p", "jsc", "j.s.c", "pte", "pte.",
        "nv", "n.v", "bv", "b.v", "sa", "s.a", "spa", "s.p.a", "ag", "se")


def _tach_tu(t):
    """cắt thành token, giữ dấu chấm dính cuối ('ltd.' vẫn là một token)"""
    return [w for w in re.split(r"[^a-z0-9./]+", t) if w]


def _phang(s):
    """Bỏ dấu tiếng Việt, về chữ thường. đ/Đ phải đổi TRƯỚC khi bỏ dấu — NFD không tách
    được U+0110/U+0111 nên `encode(ascii,'ignore')` nuốt luôn chữ, "Điện lực" ra "ien luc"
    (cùng bài học đã trả giá ở build_tapdoan.khong_dau)."""
    s = str(s or "").replace("Đ", "D").replace("đ", "d")
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s).strip().lower()


def la_to_chuc(cd):
    """cd = một phần tử của mảng `sh`. True nếu là tổ chức/pháp nhân/cơ quan."""
    if not isinstance(cd, dict):
        return False
    if (cd.get("t") or "").strip():          # nguồn đã dò ra mã chứng khoán -> tổ chức
        return True
    ten = _phang(cd.get("n"))
    if not ten:
        return True                          # không có tên thì không dám coi là cá nhân
    if any(k in ten for k in CHUA):
        return True
    tu = _tach_tu(ten)
    if not tu:
        return True
    if tu[0] in DAU:
        return True
    return bool(set(tu[-2:]) & set(DUOI))


def loc(sh):
    """Lọc mảng `sh`: giữ MỌI tổ chức, và cá nhân từ NGUONG_CA_NHAN trở lên."""
    ra = []
    for x in sh or []:
        if la_to_chuc(x) or (x.get("p") or 0) >= NGUONG_CA_NHAN:
            ra.append(x)
    return ra
