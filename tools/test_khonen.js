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

console.log('\n────────────────────────────────────────────────────────────');
console.log(`  ĐẠT ${pass} · HỎNG ${fail}\n`);
process.exit(fail ? 1 : 0);
})();
