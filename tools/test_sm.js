/* ============================================================================
   KIỂM THỬ "SO VỚI CHỈ SỐ" — chạy: node tools/test_sm.js

   Nạp THẲNG assets/chart.js vào môi trường giả (canvas rỗng, mọi lệnh vẽ là no-op)
   rồi gọi chính `chart.smSo()`. Không mô phỏng lại công thức — kiểm đúng mã đang chạy.

   VÌ SAO CÓ FILE NÀY: đại lượng này là thứ user dùng để kết luận "mã mạnh hay yếu hơn
   xu thế chung", và nó đã sai BA LẦN trước khi ra được bản này — cả ba lần đều sai IM
   LẶNG (chart vẫn vẽ đẹp, chỉ số là sai):
     ① đo bằng VỐN HOÁ: phát hành thêm làm vốn hoá phồng mà cổ đông cũ không được gì.
        HHV vốn hoá ×112,5 nhưng giá ×1,83 khi chỉ số ×3,11 -> thước cũ chấm nó mạnh
        nhất sàn trong khi thực tế nó THUA thị trường.
     ② neo bằng TRUNG BÌNH TRƯỢT: cõng thêm ước số chỉ số, cộng sai số CHUNG trung vị
        +17,2% (max +68,1%) vào mọi mã.
     ③ neo bằng MỘT HẰNG SỐ rồi áp ngược 13 năm: năm 2013 bị đo bằng thước 2026.
   Nên mọi ca dưới đây đều nhằm khoá lại đúng một tính chất: NHÂN QUẢ, và chỉ phụ thuộc
   TỈ LỆ % của hai bên kể từ phiên neo.
   ========================================================================== */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm');
const SRC=fs.readFileSync(path.join(__dirname,'..','assets','chart.js'),'utf8');

let pass=0, fail=0;
const kiem=(ten,thuc,mong)=>{ const ok=Object.is(thuc,mong);
  ok?pass++:fail++;
  console.log(`  ${ok?'✓':'✗'} ${ten}${ok?'':`\n      mong: ${mong}\n      thực: ${thuc}`}`); };
const gan=(ten,thuc,mong,eps)=>{ const ok=Math.abs(thuc-mong)<=eps;
  ok?pass++:fail++;
  console.log(`  ${ok?'✓':'✗'} ${ten}${ok?'':`\n      mong: ${mong} ±${eps}\n      thực: ${thuc}`}`); };

/* ---- môi trường giả: mọi thứ liên quan tới vẽ đều nuốt lặng ---- */
function moiTruong(){
  const ctx=new Proxy({},{ get:(t,k)=>{
    if(k==='measureText') return ()=>({width:10});
    if(k==='canvas') return null;
    if(k==='createLinearGradient') return ()=>({addColorStop(){}});
    if(typeof k==='symbol') return undefined;
    return (k in t)?t[k]:(()=>{});
  }, set:(t,k,v)=>{ t[k]=v; return true; }});
  const cvs={ width:800, height:400, style:{}, getContext:()=>ctx,
    addEventListener(){}, removeEventListener(){}, getBoundingClientRect:()=>({left:0,top:0,width:800,height:400}) };
  const win={ devicePixelRatio:1, addEventListener(){}, removeEventListener(){},
    requestAnimationFrame:f=>f(), setTimeout, clearTimeout, Image:function(){ this.src=''; },
    matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}) };
  const c={ window:win, document:{ createElement:()=>cvs, documentElement:{classList:{contains:()=>false}} },
    Math, JSON, Object, Array, String, Number, Date, isNaN, parseFloat, parseInt, console,
    Image:win.Image, devicePixelRatio:1, setTimeout, clearTimeout, Map, Set, Infinity, NaN };
  c.globalThis=c; c.self=c;
  vm.createContext(c);
  vm.runInContext(SRC,c);
  return { CPChart:c.window.CPChart, cvs };
}
const { CPChart, cvs }=moiTruong();
kiem('nạp được assets/chart.js', typeof CPChart, 'function');

const T0=Math.floor(Date.parse('2013-01-02T09:00:00+07:00')/1000), NGAY=86400;
/* `f(i)` trả [giá, điểm chỉ số]. */
function chuoi(n,f,tuI=0){
  const out=[];
  for(let i=0;i<n;i++){ const [g,x]=f(i);
    out.push({t:T0+(tuI+i)*NGAY, o:g, h:g, l:g, c:g, v:1000, ix:x}); }
  return out;
}
const lam=()=>CPChart(cvs,{});

/* ── ① CÔNG THỨC: khoảng hở = tỉ lệ giá ÷ tỉ lệ chỉ số, tính từ phiên neo ────── */
{
  const n=500, f=i=>[10000*Math.pow(1.002,i), 500*Math.pow(1.001,i)];
  const ch=lam(); ch.setRows(chuoi(n,f),'d');
  const S=ch.smSo();
  kiem('neo ở phiên ĐẦU chuỗi', S.a, 0);
  kiem('đếm đủ phiên', S.co, n);
  gan('khoảng hở tại phiên neo = 0', S.q[0], 0, 1e-12);
  const [g0,x0]=f(0), [gz,xz]=f(n-1);
  gan('khoảng hở phiên cuối khớp công thức dựng lại',
      S.q[n-1], (gz/g0)/(xz/x0)-1, 1e-12);
  gan('đường chỉ số quy đổi = giá(neo) × tỉ lệ chỉ số',
      S.ln[n-1], g0*(xz/x0), 1e-6);
  kiem('đường chỉ số tại phiên neo TRÙNG giá', Math.round(S.ln[0]), Math.round(g0));
}

/* ── ② CHỈ PHỤ THUỘC TỈ LỆ, KHÔNG PHỤ THUỘC MỨC TUYỆT ĐỐI ──────────────────
   Nhân toàn bộ chỉ số với một hằng số (đổi "đơn vị điểm") thì khoảng hở phải Y NGUYÊN.
   Đây là tính chất mà bản neo-bằng-hằng-số cũ KHÔNG có. */
{
  const n=400, f=i=>[10000*(1+0.3*Math.sin(i/40)), 500*(1+0.2*Math.cos(i/30))];
  const a=lam(); a.setRows(chuoi(n,f),'d');
  const b=lam(); b.setRows(chuoi(n,i=>{const [g,x]=f(i); return [g,x*137.9];}),'d');
  const A=a.smSo(), B=b.smSo();
  let lech=0; for(let i=0;i<n;i++) lech=Math.max(lech,Math.abs(A.q[i]-B.q[i]));
  gan('nhân thang chỉ số ×137,9 -> khoảng hở không đổi', lech, 0, 1e-12);
  /* Còn ĐƯỜNG chỉ số thì phải KHÔNG đổi luôn, vì nó đã quy về đơn vị giá */
  let l2=0; for(let i=0;i<n;i++) l2=Math.max(l2,Math.abs(A.ln[i]/B.ln[i]-1));
  gan('đường chỉ số quy đổi cũng không đổi', l2, 0, 1e-12);
}

/* ── ③ NHÂN DỒN % TỪNG PHIÊN = TỈ SỐ HAI ĐẦU (user chốt cách hiểu này) ─────── */
{
  const n=900, f=i=>[10000*(1+0.5*Math.sin(i/70)), 500*(1+0.25*Math.sin(i/55))];
  const ch=lam(); ch.setRows(chuoi(n,f),'d'); const S=ch.smSo();
  let tich=1;
  for(let i=1;i<n;i++){ const [g1,x1]=f(i), [g0,x0]=f(i-1);
    tich*=(g1/g0)/(x1/x0); }
  gan('tích của % chênh lệch từng phiên = khoảng hở cuối', tich-1, S.q[n-1], 1e-9);
}

/* ── ④ NHÂN QUẢ: thêm phiên MỚI không được đổi số của phiên CŨ ──────────────
   Đây là tính chất mà cả hai bản trước đều thiếu — trung bình trượt và hằng số neo đều
   khiến quá khứ bị viết lại mỗi khi có dữ liệu mới. */
{
  const f=i=>[10000*(1+0.4*Math.sin(i/50)), 500*(1+0.2*Math.cos(i/45))];
  const a=lam(); a.setRows(chuoi(600,f),'d'); const A=a.smSo();
  const b=lam(); b.setRows(chuoi(900,f),'d'); const B=b.smSo();
  let lech=0; for(let i=0;i<600;i++) lech=Math.max(lech,Math.abs(A.q[i]-B.q[i]));
  gan('thêm 300 phiên mới -> 600 phiên cũ không đổi một số nào', lech, 0, 1e-12);
}

/* ── ⑤ DỜI MỐC NEO ─────────────────────────────────────────────────────────── */
{
  const n=500, f=i=>[10000*(1+0.3*Math.sin(i/40)), 500*(1+0.1*Math.cos(i/25))];
  const R=chuoi(n,f);
  const ch=lam(); ch.setRows(R,'d');
  kiem('mặc định neo phiên 0', ch.smSo().a, 0);
  ch.neoTai(R[200].t);
  const S=ch.smSo();
  kiem('dời neo về phiên 200', S.a, 200);
  gan('khoảng hở tại mốc mới = 0', S.q[200], 0, 1e-12);
  const [g0,x0]=f(200), [gz,xz]=f(n-1);
  gan('khoảng hở cuối tính lại theo mốc mới', S.q[n-1], (gz/g0)/(xz/x0)-1, 1e-12);
  kiem('phiên TRƯỚC mốc neo không có số', S.q[199], null);
  ch.neoTai(null);
  kiem('trả về mặc định', ch.smSo().a, 0);
}

/* ── ⑥ NEO VÀO PHIÊN THIẾU CHỈ SỐ -> LÙI VỀ PHIÊN HỢP LỆ TRƯỚC ĐÓ ───────────
   Bỏ neo im lặng thì người vừa bấm không thấy gì đổi, đọc ra là nút hỏng. */
{
  const n=300, R=chuoi(n,i=>[10000+i, 500+i]);
  for(let i=150;i<160;i++) R[i].ix=0;            // mười phiên mất chỉ số
  const ch=lam(); ch.setRows(R,'d');
  ch.neoTai(R[155].t);
  kiem('neo vào phiên mất chỉ số -> lùi về phiên 149', ch.smSo().a, 149);
}

/* ── ⑦ THIẾU DỮ LIỆU: ngắt nét, không bịa số ───────────────────────────────── */
{
  const n=200, R=chuoi(n,i=>[10000+i*10, 500+i]);
  R[100].c=0; R[120].ix=0;
  const ch=lam(); ch.setRows(R,'d'); const S=ch.smSo();
  kiem('phiên mất giá -> khoảng hở null', S.q[100], null);
  kiem('phiên mất chỉ số -> khoảng hở null', S.q[120], null);
  kiem('phiên mất giá -> đường chỉ số null', S.ln[100], null);
  kiem('phiên liền sau vẫn có số', S.q[121]!=null, true);
}

/* ── ⑧ KHÔNG CÓ CHỈ SỐ -> KHÔNG CÓ GÌ, và không nổ ─────────────────────────── */
{
  const R=chuoi(200,i=>[10000+i,500+i]).map(r=>({...r, ix:undefined}));
  const ch=lam(); ch.setRows(R,'d'); const S=ch.smSo();
  kiem('không phiên nào có chỉ số -> a = −1', S.a, -1);
  kiem('đếm được 0 phiên', S.co, 0);
  kiem('mảng khoảng hở rỗng hoàn toàn', S.q.some(v=>v!=null), false);
}

/* ── ⑨ MÃ MỚI NIÊM YẾT: đọc được ngay, KHÔNG cần cửa sổ khởi động ───────────
   Bản cũ đòi 250 nến mới cho ra số nên VCK (169 phiên) không có gì. */
{
  const n=12, f=i=>[20000*(1+0.02*i), 1000*(1+0.01*i)];
  const ch=lam(); ch.setRows(chuoi(n,f),'d'); const S=ch.smSo();
  kiem('12 phiên vẫn neo được', S.a, 0);
  const [g0,x0]=f(0), [gz,xz]=f(n-1);
  gan('12 phiên vẫn ra số đúng', S.q[n-1], (gz/g0)/(xz/x0)-1, 1e-12);
}

/* ── ⑩ ĐỔI KHUNG KHÔNG ĐỔI SỐ ở phiên cuối ────────────────────────────────
   `neoT` là MỐC THỜI GIAN nên phải trỏ đúng phiên đó ở mọi khung. */
{
  const n=600, f=i=>[10000*(1+0.4*Math.sin(i/60)), 500*(1+0.15*Math.cos(i/50))];
  const R=chuoi(n,f);
  const ch=lam(); ch.setRows(R,'d'); ch.neoTai(R[300].t);
  const q1=ch.smSo().q[n-1], neo1=ch.neoDang();
  ch.setRows(R,'W',true);                        // cùng dữ liệu, khai là khung Tuần
  kiem('đổi khung -> mốc neo giữ nguyên', ch.neoDang(), neo1);
  gan('đổi khung -> số cuối giữ nguyên', ch.smSo().q[n-1], q1, 1e-12);
}

console.log('\n'+'─'.repeat(60)+`\n  ĐẠT ${pass} · HỎNG ${fail}\n`);
process.exit(fail?1:0);
