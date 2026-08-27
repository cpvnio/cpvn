#!/usr/bin/env python3
"""kho_dongtien.py — DÒNG TIỀN TỰ DOANH & THOẢ THUẬN cho các thẻ Radar (`data/dongtien.json`).

Radar hiện đã có ba thẻ KHỐI NGOẠI (mua/bán ròng phiên · gom 30 phiên). User muốn thêm bộ
tương tự cho TỰ DOANH, và một thẻ THOẢ THUẬN chỉ liệt kê khối lượng (thoả thuận không tách
được mua/bán nên chỉ nêu vol).

╔══════════════════════════════════════════════════════════════════════════════════════╗
║ NGUỒN: data/giaodich/{MÃ}.json  (kho VNDirect, ~1.000 phiên, bồi mỗi phiên)           ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
· TỰ DOANH ròng = `tdMuaTG − tdBanTG` (VNDirect, đơn vị ĐỒNG, đã gồm cả thoả thuận — đúng
  chuẩn "tự doanh ròng" mà trang Phân tích đang hiện). KHÔNG dùng `tdMuaGT/tdBanGT` (Vietstock):
  bản đó chỉ sâu ~251 phiên và tách khớp lệnh riêng.
· THOẢ THUẬN: `pv` (khối lượng, cp) · `pval` (giá trị, đồng).

> TỰ DOANH TRỄ MỘT PHIÊN. Nguồn proprietary_trading công bố T+1, nên phiên tự doanh mới nhất
> thường LÙI một phiên so với giá/thoả thuận. Ghi rõ `tdDate` ≠ `date` để radar gắn nhãn ngày
> trên các thẻ tự doanh, đừng để người xem tưởng là cùng phiên với ba thẻ khối ngoại.

> CHẠY SAU `va_donvi.py`. Kho tự doanh có ô sai đơn vị ×1000 (xem va_donvi.py); phải để bước
> vá chạy trước thì số ở đây mới sạch.

Ghi số ĐỒNG (radar tự quy ra tỷ bằng `ty()`), thoả thuận ghi [KL_cp, GT_đồng].
Chạy:  python3 tools/kho_dongtien.py
"""
import json, os, glob, time, datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD   = os.path.join(BASE, 'data', 'giaodich')
RA   = os.path.join(BASE, 'data', 'dongtien.json')
VNTZ = datetime.timezone(datetime.timedelta(hours=7))

CUA_GOM = 30                     # "gom 30 phiên" — cộng dồn tự doanh ròng bấy nhiêu phiên


def doc():
    """Đọc cả kho giao dịch một lượt. Trả (danh sách bản ghi mã, ngày giá mới nhất)."""
    ma = []
    ngay_max = ''
    for f in glob.glob(os.path.join(GD, '*.json')):
        try:
            d = json.load(open(f, encoding='utf-8'))
        except Exception:
            continue
        ds = d.get('d') or []
        if not ds:
            continue
        sym = d.get('sym') or os.path.basename(f)[:-5]
        if ds[-1] > ngay_max:
            ngay_max = ds[-1]
        ma.append((sym, d, ds))
    return ma, ngay_max


def phien_tudoanh_moinhat(ma):
    """Ngày GẦN NHẤT có ít nhất một mã mang số tự doanh ≠ 0 (nguồn trễ T+1)."""
    tot = ''
    for sym, d, ds in ma:
        tm, tb = d.get('tdMuaTG') or [], d.get('tdBanTG') or []
        for i in range(len(ds) - 1, -1, -1):
            m = tm[i] if i < len(tm) else 0
            b = tb[i] if i < len(tb) else 0
            if (m or 0) or (b or 0):
                if ds[i] > tot:
                    tot = ds[i]
                break                       # chỉ cần phiên mới nhất của mã này
    return tot


def main():
    ma, date = doc()
    if not ma or not date:
        raise SystemExit('KHÔNG CÓ data/giaodich — chạy kho_vnd_lo.py / kho_giaodich trước')
    tdDate = phien_tudoanh_moinhat(ma)

    td, td30, tt = {}, {}, {}
    for sym, d, ds in ma:
        # ── THOẢ THUẬN tại phiên giá mới nhất ──
        if ds[-1] == date:
            i = len(ds) - 1
            pv = (d.get('pv') or [None] * len(ds))[i]
            pval = (d.get('pval') or [None] * len(ds))[i]
            if pv:
                tt[sym] = [round(pv), round(pval or 0)]

        # ── TỰ DOANH ròng: phiên mới nhất + cộng dồn 30 phiên (tính tới tdDate) ──
        if not tdDate or tdDate not in ds:
            continue
        j = ds.index(tdDate)
        tm, tb = d.get('tdMuaTG') or [], d.get('tdBanTG') or []
        rong = lambda k: ((tm[k] if k < len(tm) else 0) or 0) - ((tb[k] if k < len(tb) else 0) or 0)
        net = rong(j)
        if net:
            td[sym] = round(net)
        g = sum(rong(k) for k in range(max(0, j - CUA_GOM + 1), j + 1))
        if g:
            td30[sym] = round(g)

    out = {
        'generated': datetime.datetime.now(VNTZ).strftime('%Y-%m-%d %H:%M'),
        'date': date, 'tdDate': tdDate,
        'td': td, 'td30': td30, 'tt': tt,
    }
    tmp = RA + '.tmp'
    json.dump(out, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, RA)
    print('kho_dongtien: giá %s · tự doanh %s | td %d mã · td30 %d mã · thoả thuận %d mã · %.0f KB'
          % (date, tdDate or '—', len(td), len(td30), len(tt), os.path.getsize(RA) / 1024))


if __name__ == '__main__':
    main()
