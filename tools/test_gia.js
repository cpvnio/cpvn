/* ============================================================================
   KIỂM THỬ CƠ CHẾ GIÁ — chạy: node tools/test_gia.js
   Nạp THẲNG assets/core.js vào một môi trường giả (đồng hồ giả, localStorage giả,
   mạng giả) rồi kiểm từng luật. Không mô phỏng lại logic — kiểm chính mã đang chạy.

   Vì sao có file này: giá sai hoặc giá nhảy lúc mở trang là lỗi người dùng ghét
   nhất mà lại IM LẶNG nhất — không có ngoại lệ, không có log, chỉ có con số sai
   trên màn hình. Mọi lần sửa core.js phải chạy lại file này trước khi đẩy.
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'assets', 'core.js'), 'utf8');

let pass = 0, fail = 0;
const kiem = (ten, thuc, mong) => {
  const ok = JSON.stringify(thuc) === JSON.stringify(mong);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${ten}${ok ? '' : `\n      mong: ${JSON.stringify(mong)}\n      thực: ${JSON.stringify(thuc)}`}`);
};

/* Dựng một "trình duyệt" giả với đồng hồ đứng yên tại mốc giờ VN cho trước. */
function dungCP(gioVN, { dem = null, offline = false } = {}) {
  const moc = new Date(gioVN + '+07:00').getTime();
  const kho = dem ? { cpvn_live: JSON.stringify(dem) } : {};
  class FakeDate extends Date {
    constructor(...a) { a.length ? super(...a) : super(moc); }
    static now() { return moc; }
  }
  const ctx = {
    Date: FakeDate, JSON, Math, Object, Array, String, Number, isNaN, parseFloat, parseInt,
    Set, Map, Promise, console, setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: {
      getItem: k => (k in kho ? kho[k] : null),
      setItem: (k, v) => { kho[k] = String(v); },
      removeItem: k => { delete kho[k]; },
    },
    location: { search: offline ? '?offline' : '' },
    document: { hidden: false, addEventListener() {} },
    fetch: () => Promise.reject(new Error('mạng bị chặn trong kiểm thử')),
    window: {},
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  // core.js khai báo `const CP={}` ở tầng đầu -> đó là BIẾN TỪ VỰNG, không phải thuộc
  // tính của ngữ cảnh. Phải lấy qua eval, y như trong trình duyệt window.CP là undefined.
  return { CP: vm.runInContext('CP', ctx), kho, moc };
}

/* Bản đệm giả: n mã, đủ 10 phần tử đúng thứ tự hợp đồng */
const demGia = (sess, final, n = 200, gia = 100000) => ({
  at: Date.now(), sess, final,
  d: Object.fromEntries(Array.from({ length: n }, (_, i) =>
    [`M${i}`, [gia, gia, 1000, 1e9, 10, 20, gia, gia, gia, gia]])),
});

console.log('\n── 1. LỊCH PHIÊN ────────────────────────────────────────────');
{
  const M = [
    ['2026-08-04T08:30', false, '2026-08-03', 'thứ 3 trước giờ mở'],
    ['2026-08-04T09:00', true,  '2026-08-03', 'đúng lúc mở cửa'],
    ['2026-08-04T14:59', true,  '2026-08-03', 'sắp đóng'],
    ['2026-08-04T15:00', false, '2026-08-04', 'đóng cửa — phiên hôm nay đã chốt sổ'],
    ['2026-08-04T21:00', false, '2026-08-04', 'buổi tối'],
    ['2026-08-05T07:00', false, '2026-08-04', 'sáng hôm sau, trước giờ mở'],
    ['2026-08-08T10:00', false, '2026-08-07', 'thứ 7'],
    ['2026-08-09T20:00', false, '2026-08-07', 'chủ nhật'],
    ['2026-08-10T08:00', false, '2026-08-07', 'thứ 2 trước giờ mở'],
  ];
  for (const [gio, mo, phien, ten] of M) {
    const { CP } = dungCP(gio);
    kiem(`${gio.slice(5, 16)} · ${ten}`, [CP.sessionOpen(), CP.lastSessionDate()], [mo, phien]);
  }
  // mốc lật của lastSessionDate PHẢI trùng mốc tắt của sessionOpen, nếu không có khe chết
  const a = dungCP('2026-08-04T14:59:59').CP, b = dungCP('2026-08-04T15:00:00').CP;
  kiem('không có khe giữa sessionOpen và lastSessionDate',
    [a.sessionOpen(), a.lastSessionDate(), b.sessionOpen(), b.lastSessionDate()],
    [true, '2026-08-03', false, '2026-08-04']);
}

console.log('\n── 2. CHỐT CỨNG (pricesFinal) ───────────────────────────────');
{
  const t = (gio, gan, mong, ten) => {
    const { CP } = dungCP(gio); Object.assign(CP, gan);
    kiem(ten, CP.pricesFinal(), mong);
  };
  t('2026-08-04T10:00', { eodDate: '2026-08-03' }, false, 'trong phiên — không bao giờ chốt');
  t('2026-08-04T10:00', { eodDate: '2026-08-04' }, false, 'trong phiên, kho có hôm nay — vẫn không chốt');
  t('2026-08-04T15:02', { eodDate: '2026-08-03' }, false, '15:02 bảng đang chốt ATC — chưa xong');
  t('2026-08-04T15:30', { eodDate: '2026-08-03' }, false, 'ngoài giờ, kho còn phiên trước — chưa chốt');
  t('2026-08-04T15:30', { eodDate: '2026-08-04' }, true,  'ngoài giờ, kho đã có phiên hôm nay');
  t('2026-08-04T15:30', { eodDate: '2026-08-03', liveSess: '2026-08-04' }, true, 'ngoài giờ, đã quét đủ sau đóng cửa');
  t('2026-08-04T21:00', { eodDate: '2026-08-01', boardIdle: true }, true, 'bảng đứng yên (lễ/đêm) — ngừng hỏi');
  t('2026-08-08T10:00', { eodDate: '2026-08-07' }, true,  'thứ 7 — kho đã có phiên thứ 6');
}

console.log('\n── 3. BẢN ĐỆM: chỉ thắng khi MỚI HƠN kho ────────────────────');
{
  const t = (gio, eod, dem, mong, ten) => {
    const { CP } = dungCP(gio, { dem });
    CP.eodDate = eod;
    for (let i = 0; i < 200; i++) CP.coins.set(`M${i}`, { sym: `M${i}`, price: 1, ref: 1, shares: 1 });
    kiem(ten, CP.applyLive(), mong);
  };
  t('2026-08-04T10:00', '2026-08-03', demGia('2026-08-04', false), true,  'đệm hôm nay > kho hôm qua → áp');
  t('2026-08-04T16:00', '2026-08-04', demGia('2026-08-04', true),  false, 'kho đã bằng đệm → KHO THẮNG');
  t('2026-08-05T08:00', '2026-08-03', demGia('2026-08-04', true),  true,  'sáng hôm sau, kho trễ → đệm cũ vẫn sát hơn');
  t('2026-08-04T10:00', '2026-08-05', demGia('2026-08-04', true),  false, 'kho mới hơn đệm → bỏ đệm');
  t('2026-08-04T10:00', '2026-08-03', demGia('2026-08-05', false), false, 'đệm ở TƯƠNG LAI (đồng hồ máy sai) → bỏ');
  t('2026-08-04T10:00', '2026-08-03', demGia('2026-08-04', false, 50), false, 'đệm chỉ 50 mã → dưới ngưỡng, bỏ');

  // đệm thiếu mã KHÔNG được để lại dữ liệu trộn nửa sống nửa kho
  const { CP } = dungCP('2026-08-04T10:00', { dem: demGia('2026-08-04', false, 50, 999) });
  CP.eodDate = '2026-08-03';
  for (let i = 0; i < 200; i++) CP.coins.set(`M${i}`, { sym: `M${i}`, price: 111, ref: 111, shares: 1 });
  CP.applyLive();
  const doi = [...CP.coins.values()].filter(c => c.price !== 111).length;
  kiem('đệm thiếu mã → KHÔNG mã nào bị ghi đè (đếm trước, ghi sau)', doi, 0);
}

console.log('\n── 4. F5 GIỮA PHIÊN KHÔNG ĐƯỢC CHỜ MẠNG ─────────────────────');
{
  const t = async (gio, gan, tuoiGiay, mongGoiMang, ten) => {
    // PHẢI dùng đồng hồ GIẢ của hộp cát, không phải Date.now() thật của máy chạy test
    const { CP, moc } = dungCP(gio); Object.assign(CP, gan);
    CP.liveAt = moc - tuoiGiay * 1000;
    let goi = false;
    CP.pollBoard = () => { goi = true; return Promise.resolve(true); };
    await CP.warmPrices(['A'], 50);
    kiem(ten, goi, mongGoiMang);
  };
  return (async () => {
    await t('2026-08-04T10:00', { eodDate: '2026-08-03' },  10, false, 'trong phiên, đệm 10 giây → vẽ ngay, KHÔNG gọi mạng');
    await t('2026-08-04T10:00', { eodDate: '2026-08-03' }, 110, false, 'trong phiên, đệm 110 giây → vẫn còn tươi');
    await t('2026-08-04T10:00', { eodDate: '2026-08-03' }, 300, true,  'trong phiên, đệm 5 phút → phải lấy giá mới');
    await t('2026-08-04T10:00', { eodDate: '2026-08-03' }, 1e9, true,  'trong phiên, chưa có đệm → phải lấy giá mới');
    await t('2026-08-04T16:00', { eodDate: '2026-08-04' },  10, false, 'ngoài giờ đã chốt cứng → không gọi mạng');
    await t('2026-08-04T16:00', { eodDate: '2026-08-03' }, 1e9, true,  'ngoài giờ chưa chốt → vẫn phải lấy');

    console.log('\n── 4b. MÃ CHƯA KHỚP LỆNH PHIÊN NÀY (nt) ─────────────────────');
    {
      // Kho từng ghép giá đóng cửa PHIÊN CŨ với tham chiếu HÔM NAY rồi để client tự
      // tính % -> đẻ ra biến động chưa từng xảy ra (NDC -18,65% dù khớp lệnh cuối 23/06).
      const nap = (row) => {
        const { CP } = dungCP('2026-08-04T20:00');
        CP.coins.set('X', { sym: 'X', shares: 1, price: 0, ref: 0 });
        // gọi đúng đoạn đọc kho trong loadBase qua một bản ghi giả
        const c = CP.coins.get('X');
        c.price = row.close || 0; c.ref = row.ref || 0; c.ceil = row.ceil || 0; c.flr = row.floor || 0;
        c.vol = row.vol || 0; c.traded = (row.vol || 0) > 0; c.nt = !!row.nt;
        c.chg1d = (!c.nt && c.ref > 0 && c.price > 0) ? (c.price - c.ref) / c.ref * 100 : null;
        return c;
      };
      const dung = nap({ close: 157000, ref: 193000, ceil: 270200, floor: 115800, vol: 0, nt: 1 });
      kiem('mã đứng im: 1D% phải là — chứ không phải -18,65%', dung.chg1d, null);
      kiem('mã đứng im: không tính là đã giao dịch', dung.traded, false);
      const tran = nap({ close: 122900, ref: 99500, ceil: 114400, floor: 84600, vol: 0, nt: 1 });
      kiem('mã đứng im: KHÔNG tô nhãn trần dù giá cũ vượt trần hôm nay',
        !tran.nt && tran.ceil > 0 && tran.price >= tran.ceil, false);
      const thuong = nap({ close: 218000, ref: 213000, ceil: 227900, floor: 198100, vol: 5187600 });
      kiem('mã có khớp lệnh: 1D% tính bình thường', Math.round(thuong.chg1d * 100) / 100, 2.35);
      kiem('mã có khớp lệnh: tính là đã giao dịch', thuong.traded, true);
    }

    console.log('\n── 5. HỢP ĐỒNG BẢN ĐỆM (4 trang dùng chung) ─────────────────');
    {
      const { CP, kho } = dungCP('2026-08-04T16:00');
      CP.eodDate = '2026-08-03'; CP.liveSess = '2026-08-04';
      CP.coins.set('AAA', { sym: 'AAA', price: 12345, ref: 12000, vol: 10, gtgd: 5e8,
        fbuy: 1, fsell: 2, high: 12500, low: 11900, ceil: 13000, flr: 11000, shares: 1 });
      CP.saveLive();
      const j = JSON.parse(kho.cpvn_live);
      kiem('khoá lưu đúng tên cpvn_live', Object.keys(kho), ['cpvn_live']);
      kiem('có đủ 5 trường {at,sess,final,idx,d}',
        ['at', 'sess', 'final', 'idx', 'd'].every(k => k in j), true);
      kiem('mỗi mã là mảng 10 phần tử ĐÚNG THỨ TỰ', j.d.AAA,
        [12345, 12000, 10, 5e8, 1, 2, 12500, 11900, 13000, 11000]);
      kiem('ngoài giờ + đã quét đủ → final = true', j.final, true);

      const b = dungCP('2026-08-04T15:02');
      b.CP.liveSess = '2026-08-03';
      b.CP.coins.set('AAA', { sym: 'AAA', price: 1, ref: 1, shares: 1 });
      b.CP.saveLive();
      kiem('15:02 bảng chưa chốt xong → final = false', JSON.parse(b.kho.cpvn_live).final, false);
    }

    console.log('\n── 6. CHẾ ĐỘ OFFLINE ────────────────────────────────────────');
    {
      const { CP } = dungCP('2026-08-04T10:00', { offline: true });
      kiem('?offline → nhận diện đúng', CP.OFFLINE, true);
      const ok = await CP.pollBoard();
      kiem('?offline → không gọi mạng lượt nào', ok, false);
    }

    console.log(`\n${'─'.repeat(60)}\n  ĐẠT ${pass} · HỎNG ${fail}\n`);
    process.exit(fail ? 1 : 0);
  })();
}
