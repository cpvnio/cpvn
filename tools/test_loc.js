/* ============================================================================
   KIỂM THỬ NĂM CHIP "SO VỚI CHỈ SỐ" CỦA BẢNG GIÁ — chạy: node tools/test_loc.js

   Nạp THẲNG assets/screener.js vào môi trường giả rồi gọi chính `CPScreen.chip`.

   VÌ SAO CÓ FILE NÀY: mấy chip này quyết định mã nào LỌT vào bảng, mà cách hỏng
   nguy hiểm nhất của chúng là **im lặng lọt nhầm**: mã chưa đủ N phiên có `sm{N} =
   null`, nên một phép so sánh viết ẩu kiểu `!(v<=0)` sẽ cho `null` đi qua và người
   dùng nhận về một bảng trộn mã đủ và chưa đủ dữ liệu mà không có dấu hiệu gì.
   ========================================================================== */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm');
const SRC=fs.readFileSync(path.join(__dirname,'..','assets','screener.js'),'utf8');

let pass=0, fail=0;
const kiem=(ten,thuc,mong)=>{ const ok=Object.is(thuc,mong);
  ok?pass++:fail++;
  console.log(`  ${ok?'✓':'✗'} ${ten}${ok?'':`\n      mong: ${mong}\n      thực: ${thuc}`}`); };

const ctx={console,Math,JSON,Object,Array,Number,String,Set,Map,
  CP:{vn30:new Set(['VNM']),nhomTheoKhoa:()=>null,esc:x=>x}};
ctx.globalThis=ctx;
vm.createContext(ctx);
/* `const CPScreen` ở đầu screener.js KHÔNG gắn vào object ngữ cảnh của vm (khác `var`),
   nên phải nối một dòng xuất ra thì mới cầm được. */
vm.runInContext(SRC+'\n;globalThis.__S=CPScreen;',ctx);
const S=ctx.__S;
kiem('nạp được assets/screener.js', typeof S.chip, 'function');

/* T = nội dung screen.json đã giải nén cho từng mã */
function dung(T){ S.T=T; S.F={}; S.loaded=true; }
const ma=(sym,mcap)=>({sym,price:10000,mcap:mcap||2e12});

/* ── chip vốn hoá và thanh khoản: ngưỡng do người dùng đặt ────────────────── */
dung({AAA:{avgval60:2.5e9}, BBB:{avgval60:1.2e9}, CCC:{}});
kiem('vốn hoá ≥1.000 tỷ: 2.000 tỷ lọt',  S.chip('capmin',ma('AAA',2e12),1000), true);
kiem('vốn hoá ≥1.000 tỷ: 800 tỷ trượt',  S.chip('capmin',ma('AAA',8e11),1000), false);
kiem('vốn hoá ≥10.000 tỷ: 2.000 tỷ trượt',S.chip('capmin',ma('AAA',2e12),10000), false);
kiem('GTGD60 ≥2 tỷ: 2,5 tỷ lọt',   S.chip('gtgd60',ma('AAA'),2), true);
kiem('GTGD60 ≥2 tỷ: 1,2 tỷ trượt', S.chip('gtgd60',ma('BBB'),2), false);
kiem('GTGD60 thiếu dữ liệu -> TRƯỢT, không lọt', S.chip('gtgd60',ma('CCC'),2), false);

/* ── SO VỚI CHỈ SỐ: dấu phải đúng, và thiếu dữ liệu phải TRƯỢT ───────────────
   `sm{N}` là % vượt/kém chỉ số sàn trong N phiên. Cách hỏng nguy hiểm nhất là im lặng
   lọt nhầm: mã chưa đủ N phiên có `sm{N} = null`, mà một phép so viết ẩu kiểu `!(v<=0)`
   sẽ cho `null` đi qua và người dùng nhận về một bảng trộn mã đủ và chưa đủ dữ liệu. */
dung({A1:{sm20:+3.2,sm60:-1.1,sm120:+25.4,sm250:null},
      A2:{sm20:-0.5,sm60:+0.5,sm120:-8.0,sm250:+4.0},
      A3:{sm120:0},
      A4:{sm120:null},
      A5:{}});
kiem('sm20 +3,2% -> hơn chỉ số 20 phiên',      S.chip('smHon',ma('A1'),20), true);
kiem('sm60 −1,1% -> KHÔNG hơn 60 phiên',       S.chip('smHon',ma('A1'),60), false);
kiem('sm60 −1,1% -> kém chỉ số 60 phiên',      S.chip('smKem',ma('A1'),60), true);
kiem('sm20 +3,2% -> KHÔNG kém 20 phiên',       S.chip('smKem',ma('A1'),20), false);
kiem('sm250 = null -> hơn: TRƯỢT',             S.chip('smHon',ma('A1'),250), false);
kiem('sm250 = null -> kém: TRƯỢT (không lọt)', S.chip('smKem',ma('A1'),250), false);
kiem('đúng bằng 0 -> không tính là hơn',       S.chip('smHon',ma('A3'),120), false);
kiem('đúng bằng 0 -> không tính là kém',       S.chip('smKem',ma('A3'),120), false);
kiem('thiếu hẳn trường -> hơn: TRƯỢT',         S.chip('smHon',ma('A5'),120), false);
kiem('thiếu hẳn trường -> kém: TRƯỢT',         S.chip('smKem',ma('A5'),120), false);
kiem('sm120 +25,4% ≥ 20% -> lọt',              S.chip('smManh',ma('A1'),20), true);
kiem('sm120 +25,4% ≥ 50% -> trượt',            S.chip('smManh',ma('A1'),50), false);
kiem('sm120 −8% -> trượt mọi ngưỡng',          S.chip('smManh',ma('A2'),5), false);
kiem('sm120 = null -> trượt',                  S.chip('smManh',ma('A4'),5), false);
kiem('đổi cửa sổ: A2 sm120 −8% -> kém 120p',   S.chip('smKem',ma('A2'),120), true);
kiem('đổi cửa sổ: A2 sm250 +4% -> hơn 250p',   S.chip('smHon',ma('A2'),250), true);

/* ── bốn chip phải nằm trong danh sách và có tham số đúng ─────────────────── */
const id=x=>S.chips.find(c=>c.id===x);
/* Bốn cửa sổ này PHẢI trùng `SM_CUA` của tools/build_screen.py — đổi một bên mà quên bên
   kia thì chip hỏi `sm300` trong khi kho chỉ ghi sm20/60/120/250, và mọi mã đều trượt. */
kiem('smHon có 4 cửa sổ', JSON.stringify(id('smHon').opts), '[20,60,120,250]');
kiem('smKem có 4 cửa sổ', JSON.stringify(id('smKem').opts), '[20,60,120,250]');
kiem('cửa sổ mặc định là 120',    id('smHon').def, 120);
kiem('vốn hoá mặc định 1.000 tỷ', id('capmin').def, 1000);
kiem('GTGD mặc định 2 tỷ',        id('gtgd60').def, 2);
kiem('smManh mặc định 20%',       id('smManh').def, 20);

console.log('\n'+'─'.repeat(60)+`\n  ĐẠT ${pass} · HỎNG ${fail}\n`);
process.exit(fail?1:0);
