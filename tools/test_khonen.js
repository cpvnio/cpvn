/* ============================================================================
   KIỂM THỬ "KHO CÓ ĐANG Ở NỀN CŨ KHÔNG" — chạy: node tools/test_khonen.js

   Nạp THẲNG assets/core.js vào môi trường giả rồi gọi chính `CP.khoLoiThoi`.
   Không mô phỏng lại logic — kiểm đúng mã đang chạy.

   Vì sao có file này: từ 19/08/2026 chart đọc KHO trước, nên hàm này là thứ DUY NHẤT
   đứng giữa người xem và một cú sập giả bằng đúng tỉ lệ cổ tức. Nó lại thuộc loại sai
   IM LẶNG nhất: chart vẫn vẽ, vẫn mượt, chỉ có một cây nến rơi thẳng đứng mà không ai
   biết là bịa. Bỏ sót một ca ở đây tệ hơn hẳn mọi lỗi bố cục.

   NGUYÊN TẮC ĐANG KIỂM: báo nhầm thì vô hại (mã đó đi mượn nguồn ngoài, đúng bằng hành
   vi cũ của cả trang), bỏ sót mới chết. Nên mọi ca nghi ngờ đều phải ngả về `true`.
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'assets', 'core.js'), 'utf8');

let pass = 0, fail = 0;
const kiem = (ten, thuc, mong) => {
  const ok = thuc === mong;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${ten}${ok ? '' : `\n      mong: ${mong}\n      thực: ${thuc}`}`);
};

const NGAY = 86400;
/* mốc phiên: 2026-08-19 10:00 giờ VN — giữa phiên ngày HCC/TVS chốt quyền */
const GIO = '2026-08-19T10:00:00';
const T = d => Math.floor(new Date(d + 'T09:00:00+07:00').getTime() / 1000);

/* `lich` = nội dung data/cotuc.json giả; null nghĩa là tải hỏng (kiểm nhánh suy biến).
   `coins` = bảng giá đã nạp; để trống là mô phỏng lúc chưa có bảng giá. */
function dung({ lich, coins = {} }) {
  const moc = new Date(GIO + '+07:00').getTime();
  class FakeDate extends Date {
    constructor(...a) { a.length ? super(...a) : super(moc); }
    static now() { return moc; }
  }
  const ctx = {
    Date: FakeDate, JSON, Math, Object, Array, String, Number, isNaN, parseFloat, parseInt,
    Set, Map, Promise, console, setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { search: '' },
    document: { hidden: false, addEventListener() {} },
    fetch: (u) => {
      if (String(u).includes('cotuc.json')) {
        return Promise.resolve(lich === null
          ? { ok: false, json: () => Promise.reject(new Error('hỏng')) }
          : { ok: true, json: () => Promise.resolve(lich) });
      }
      return Promise.reject(new Error('mạng bị chặn trong kiểm thử'));
    },
    window: {},
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  const CP = vm.runInContext('CP', ctx);
  for (const [sym, c] of Object.entries(coins)) CP.coins.set(sym, { sym, ...c });
  return CP;
}

/* file kho giả: nến cuối vào ngày `den`, giá đóng cửa cuối `dong` (ĐỒNG) */
const khoGia = (den, dong) => ({
  t: [T(den) - 2 * NGAY, T(den) - NGAY, T(den)],
  o: [dong, dong, dong], h: [dong, dong, dong],
  l: [dong, dong, dong], c: [dong, dong, dong], v: [1e5, 1e5, 1e5],
});

const LICH_THAT = { sk: [
  { s: 'HCC', d: '2026-08-19', k: 'cp', tl: 10 },
  { s: 'TVS', d: '2026-08-19', k: 'cp', tl: 7 },
  { s: 'VIX', d: '2026-08-20', k: 'cp', tl: 5 },   // NGÀY MAI — hôm nay chưa được tính
] };

(async () => {
console.log('\n── 1. LỊCH CHỐT QUYỀN ───────────────────────────────────────');
{
  const CP = dung({ lich: LICH_THAT, coins: {
    HCC: { ex: 'HNX', ref: 25455 }, TVS: { ex: 'HOSE', ref: 13505 },
    VIX: { ex: 'HOSE', ref: 20000 }, HPG: { ex: 'HOSE', ref: 21000 } } });
  /* Nền kho khớp tham chiếu để lưới SỐ im lặng -> chỉ còn lịch quyết định.
     Không làm vậy thì hai lưới cùng bắt, không biết phép kiểm đang kiểm cái nào. */
  kiem('HCC chốt quyền HÔM NAY -> lỗi thời',
    await CP.khoLoiThoi('HCC', khoGia('2026-08-18', 25455)), true);
  kiem('TVS chốt quyền HÔM NAY -> lỗi thời',
    await CP.khoLoiThoi('TVS', khoGia('2026-08-18', 13505)), true);
  kiem('VIX chốt quyền NGÀY MAI -> hôm nay kho vẫn dùng được',
    await CP.khoLoiThoi('VIX', khoGia('2026-08-18', 20000)), false);
  kiem('HPG không có sự kiện -> dùng được',
    await CP.khoLoiThoi('HPG', khoGia('2026-08-18', 21000)), false);
  kiem('HCC nhưng kho ĐÃ có nến hôm nay -> đã hạ nền rồi, dùng được',
    await CP.khoLoiThoi('HCC', khoGia('2026-08-19', 25455)), false);
}

console.log('\n── 2. LƯỚI SỐ: HOSE/HNX ngưỡng 0,5% ─────────────────────────');
{
  const CP = dung({ lich: { sk: [] }, coins: {
    A: { ex: 'HOSE', ref: 20000 }, B: { ex: 'HNX', ref: 20000 },
    C: { ex: 'HOSE', ref: 20000 }, D: { ex: 'HOSE', ref: 20000 } } });
  kiem('HOSE kho cao hơn 10% (cổ tức CP 100:10) -> lỗi thời',
    await CP.khoLoiThoi('A', khoGia('2026-08-18', 22000)), true);
  kiem('HNX kho cao hơn 5% -> lỗi thời',
    await CP.khoLoiThoi('B', khoGia('2026-08-18', 21000)), true);
  kiem('HOSE khớp đúng tham chiếu -> dùng được',
    await CP.khoLoiThoi('C', khoGia('2026-08-18', 20000)), false);
  /* MỘT CHIỀU: kho THẤP hơn tham chiếu không bao giờ là hạ nền — hạ nền chỉ làm giá quá
     khứ thấp đi. Bắt cả hai chiều là báo nhầm vô cớ mà chẳng bịt thêm ca nào. */
  kiem('HOSE kho THẤP hơn tham chiếu 10% -> KHÔNG phải hạ nền',
    await CP.khoLoiThoi('D', khoGia('2026-08-18', 18000)), false);
}

console.log('\n── 3. LƯỚI SỐ: UPCOM ngưỡng 5% (tham chiếu là bình quân) ─────');
{
  const CP = dung({ lich: { sk: [] }, coins: {
    U1: { ex: 'UPCOM', ref: 20000 }, U2: { ex: 'UPCOM', ref: 20000 } } });
  /* Đo thật 18/08/2026 trên 819 mã UPCOM: p95 lệch 1,67%, p99 7,00%. Ngưỡng 0,5% của
     HOSE mà đem áp sang đây là báo nhầm 60+ mã mỗi phiên. */
  kiem('UPCOM lệch 2% (nhiễu bình quân) -> KHÔNG báo',
    await CP.khoLoiThoi('U1', khoGia('2026-08-18', 20400)), false);
  kiem('UPCOM lệch 8% (sự kiện thật) -> lỗi thời',
    await CP.khoLoiThoi('U2', khoGia('2026-08-18', 21600)), true);
}

console.log('\n── 4. SUY BIẾN: lịch hỏng / chưa có bảng giá ────────────────');
{
  const CP = dung({ lich: null, coins: {
    H: { ex: 'HOSE', ref: 20000 }, U: { ex: 'UPCOM', ref: 20000 } } });
  /* Lịch hỏng thì HOSE/HNX vẫn tin được — lưới số ở hai sàn đó đo được 0,00% nhiễu ở
     mọi phân vị. UPCOM mất lưới DUY NHẤT của nó nên phải ngả về an toàn. */
  kiem('lịch hỏng + HOSE khớp tham chiếu -> vẫn dùng kho',
    await CP.khoLoiThoi('H', khoGia('2026-08-18', 20000)), false);
  kiem('lịch hỏng + UPCOM -> ngả về an toàn, đi mượn nguồn',
    await CP.khoLoiThoi('U', khoGia('2026-08-18', 20000)), true);
}
{
  const CP = dung({ lich: LICH_THAT, coins: {} });   // bảng giá CHƯA nạp
  kiem('chưa có bảng giá + lịch có sự kiện -> vẫn bắt được bằng lịch',
    await CP.khoLoiThoi('HCC', khoGia('2026-08-18', 28000)), true);
  /* Không có `ex` thì coi như sàn nhiễu (không phải HOSE/HNX) -> mất lưới số, nhưng lịch
     đọc được nên vẫn kết luận đúng. */
  kiem('chưa có bảng giá + lịch sạch -> dùng được',
    await CP.khoLoiThoi('HPG', khoGia('2026-08-18', 21000)), false);
}
{
  const CP = dung({ lich: { sk: [] }, coins: { X: { ex: 'HOSE', ref: 20000 } } });
  kiem('kho rỗng -> coi như lỗi thời',
    await CP.khoLoiThoi('X', { t: [], c: [] }), true);
  kiem('kho là null -> coi như lỗi thời',
    await CP.khoLoiThoi('X', null), true);
}

console.log('\n── 5. NẾN CỦA PHIÊN ĐANG CHẠY (dựng từ bảng giá) ────────────');
{
  /* mốc 10:00 sáng 19/08 — GIỮA PHIÊN, đúng khoảng lỗi cũ dán giá mới lên nến cũ */
  const CP = dung({ lich: { sk: [] }, coins: {} });
  CP.liveSess = '2026-08-19';
  const dat = (sym, o) => { CP.coins.set(sym, { sym, ex: 'HOSE', ...o }); };
  dat('A', { price: 21000, o: 20500, high: 21200, low: 20400, vol: 1e6, nt: false });
  const n = CP.nenHomNay('A');
  kiem('dựng được nến hôm nay', !!n, true);
  kiem('  ngày đúng 19/08', n && new Date((n.t + 25200) * 1000).toISOString().slice(0, 10), '2026-08-19');
  kiem('  o/h/l/c lấy đúng từ bảng giá',
    n && [n.o, n.h, n.l, n.c].join(','), '20500,21200,20400,21000');

  /* BA CỔNG */
  dat('B', { price: 21000, o: 0, high: 21200, low: 20400, nt: false });
  kiem('thiếu giá mở cửa -> KHÔNG dựng (thà không có còn hơn đoán)', CP.nenHomNay('B'), null);
  dat('C', { price: 21000, o: 20500, nt: true });
  kiem('mã CHƯA khớp lệnh phiên này -> KHÔNG dựng', CP.nenHomNay('C'), null);
  CP.liveSess = '2026-08-18';
  kiem('bảng giá còn ở phiên CŨ -> KHÔNG dựng', CP.nenHomNay('A'), null);
  CP.liveSess = '2026-08-19';

  /* cao/thấp phải BAO giá mở và giá hiện tại */
  dat('D', { price: 22000, o: 19000, high: 21000, low: 20000, vol: 5, nt: false });
  const d = CP.nenHomNay('D');
  kiem('cao/thấp bao trọn giá mở và giá hiện tại', [d.h, d.l].join(','), '22000,19000');
}

console.log('\n── 6. GHÉP: NỐI CÂY MỚI, KHÔNG GHI ĐÈ NẾN PHIÊN CŨ ──────────');
{
  const CP = dung({ lich: { sk: [] }, coins: {} });
  CP.liveSess = '2026-08-19';
  CP.coins.set('A', { sym: 'A', ex: 'HOSE', price: 21000, o: 20500, high: 21200, low: 20400, vol: 1e6, nt: false });
  const ngay = d => Math.floor(Date.parse(d + 'T00:00:00Z') / 1000);

  /* ĐÂY LÀ CA CỦA LỖI ĐÃ DÍNH: chuỗi kết ở phiên HÔM QUA (kho chốt 15:15), giữa phiên.
     Bản cũ khớp `ngayVN(nến cuối)===CP.lastSessionDate()` (cả hai đều là 18/08) rồi ghi
     thẳng giá hôm nay lên nến 18/08. */
  const rows = [{ t: ngay('2026-08-17'), o: 1, h: 1, l: 1, c: 19000, v: 1 },
                { t: ngay('2026-08-18'), o: 2, h: 2, l: 2, c: 20000, v: 2 }];
  const doi = CP.gopNenHomNay(rows, 'A');
  kiem('có nối thêm nến', doi, true);
  kiem('  chuỗi dài thêm 1 (NỐI, không ghi đè)', rows.length, 3);
  kiem('  nến 18/08 GIỮ NGUYÊN giá đóng cũ', rows[1].c, 20000);
  kiem('  nến mới mang ngày 19/08',
    new Date((rows[2].t + 25200) * 1000).toISOString().slice(0, 10), '2026-08-19');

  /* gọi lại lần hai: cập nhật TẠI CHỖ, không đẻ thêm cây nữa */
  CP.coins.get('A').price = 21500;
  CP.gopNenHomNay(rows, 'A');
  kiem('gọi lần hai -> vẫn 3 nến', rows.length, 3);
  kiem('  nến hôm nay cập nhật tại chỗ', rows[2].c, 21500);

  /* chuỗi đã có nến hôm nay sẵn (nguồn ngoài) -> cập nhật, không nối */
  const rows2 = [{ t: ngay('2026-08-18'), o: 1, h: 1, l: 1, c: 20000, v: 1 },
                 { t: ngay('2026-08-19'), o: 9, h: 9, l: 9, c: 9, v: 9 }];
  CP.gopNenHomNay(rows2, 'A');
  kiem('chuỗi đã có nến hôm nay -> cập nhật chứ không nối', rows2.length, 2);
  kiem('  giá trị được làm mới', rows2[1].c, 21500);

  /* chuỗi đi XA hơn hôm nay (không nên xảy ra) -> đừng đụng vào */
  const rows3 = [{ t: ngay('2026-08-20'), o: 1, h: 1, l: 1, c: 1, v: 1 }];
  kiem('chuỗi đã đi xa hơn hôm nay -> không đụng', CP.gopNenHomNay(rows3, 'A'), false);
}

console.log('\n────────────────────────────────────────────────────────────');
console.log(`  ĐẠT ${pass} · HỎNG ${fail}\n`);
process.exit(fail ? 1 : 0);
})();
