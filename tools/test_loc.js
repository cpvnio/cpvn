/* ============================================================================
   KIỂM THỬ BỐN CHIP "CÁCH NỀN" CỦA BẢNG GIÁ — chạy: node tools/test_loc.js

   Nạp THẲNG assets/screener.js vào môi trường giả rồi gọi chính `CPScreen.chip`.

   VÌ SAO CÓ FILE NÀY: bốn chip này quyết định mã nào LỌT vào bảng, mà cách hỏng
   nguy hiểm nhất của chúng là **im lặng lọt nhầm**: mã HNX/UPCOM không có trường
   `nen` (kho vốn hoá 1.250 phiên chỉ có ở HOSE), nên một phép so sánh viết ẩu kiểu
   `!(t.nen>=0)` sẽ cho `undefined` đi qua và người dùng nhận về một danh sách trộn
   hai định nghĩa khác nhau mà không có dấu hiệu gì.
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

/* ── "dưới nền": chỉ nhận số ÂM, và thiếu dữ liệu là trượt ────────────────── */
dung({D1:{nen:-31.2}, D2:{nen:+18.0}, D3:{nen:0}, D4:{}, D5:{nen:null}});
kiem('nen −31,2% -> dưới nền',        S.chip('nenduoi',ma('D1')), true);
kiem('nen +18,0% -> không dưới nền',  S.chip('nenduoi',ma('D2')), false);
kiem('nen đúng bằng 0 -> KHÔNG tính là dưới', S.chip('nenduoi',ma('D3')), false);
kiem('mã không có trường nen -> TRƯỢT',       S.chip('nenduoi',ma('D4')), false);
kiem('nen = null (HNX/UPCOM) -> TRƯỢT',       S.chip('nenduoi',ma('D5')), false);

/* ── "hẹp nhất N phiên": ndN là SỐ PHIÊN kể từ lần gần nhất ───────────────── */
dung({E1:{nd100:0,nd200:0,nd300:null,nd400:null},
      E2:{nd100:5,nd200:9},
      E3:{nd100:6},
      E4:{nd100:null},
      E5:{}});
kiem('nd100=0 (hôm nay) -> lọt',      S.chip('nengan',ma('E1'),100), true);
kiem('nd100=5 -> lọt (đúng ngưỡng)',  S.chip('nengan',ma('E2'),100), true);
kiem('nd100=6 -> trượt (quá 5 phiên)',S.chip('nengan',ma('E3'),100), false);
kiem('nd100=null -> trượt',           S.chip('nengan',ma('E4'),100), false);
kiem('thiếu hẳn trường -> trượt',     S.chip('nengan',ma('E5'),100), false);
kiem('đổi cửa sổ sang 200: nd200=9 -> trượt', S.chip('nengan',ma('E2'),200), false);
kiem('đổi cửa sổ sang 200: nd200=0 -> lọt',   S.chip('nengan',ma('E1'),200), true);
kiem('cửa sổ 300 chưa từng đạt -> trượt',     S.chip('nengan',ma('E1'),300), false);

/* ── ngưỡng "trong bao nhiêu phiên" phải là hằng số đọc được, không chôn cứng ── */
kiem('NEN_TRE là số phiên, mặc định 5', S.NEN_TRE, 5);
S.NEN_TRE=10;
kiem('đổi NEN_TRE=10 thì nd100=6 lọt', S.chip('nengan',ma('E3'),100), true);
S.NEN_TRE=5;

/* ── bốn chip phải nằm trong danh sách và có tham số đúng ─────────────────── */
const id=x=>S.chips.find(c=>c.id===x);
kiem('chip nengan có 4 cửa sổ', JSON.stringify(id('nengan').opts), '[100,200,300,400]');
kiem('cửa sổ mặc định là 100',  id('nengan').def, 100);
kiem('vốn hoá mặc định 1.000 tỷ', id('capmin').def, 1000);
kiem('GTGD mặc định 2 tỷ',        id('gtgd60').def, 2);
kiem('nenduoi KHÔNG có tham số',  id('nenduoi').opts, undefined);

console.log('\n'+'─'.repeat(60)+`\n  ĐẠT ${pass} · HỎNG ${fail}\n`);
process.exit(fail?1:0);
