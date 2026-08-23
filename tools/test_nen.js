/* ============================================================================
   KIỂM THỬ DẢI "CÁCH NỀN" — chạy: node tools/test_nen.js

   Nạp THẲNG assets/chart.js vào môi trường giả (canvas rỗng, mọi lệnh vẽ là no-op)
   rồi gọi chính `chart.nenSo()`. Không mô phỏng lại công thức — kiểm đúng mã đang chạy.

   VÌ SAO CÓ FILE NÀY: dải là thứ user dùng để kết luận "mã này mạnh hay yếu hơn mặt
   bằng chung", mà cả ba cách hỏng của nó đều IM LẶNG — vẽ vẫn đẹp, chỉ có số là sai:
     ① `k` tính sai miền -> vạch nền lệch -> đọc ngược dấu.
     ② hai dấu sự kiện phải BẤT BIẾN theo `k` (chúng so g với chính g). Nếu lỡ để chúng
        phụ thuộc `k` thì đổi khung nạp một cái là dấu nhảy chỗ.
     ③ đệm không xoá khi `veLaiPhu` gắn vốn hoá vào mảng CÙNG độ dài/CÙNG mốc — đã xảy
        ra thật trong lúc dựng: dải rỗng vĩnh viễn dù dữ liệu đã về.
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
  const ctxvm={ window:win, document:{ createElement:()=>cvs, documentElement:{classList:{contains:()=>false}} },
    Math, JSON, Object, Array, String, Number, Date, isNaN, parseFloat, parseInt, console,
    Image:win.Image, devicePixelRatio:1, setTimeout, clearTimeout, Map, Set, Infinity, NaN };
  ctxvm.globalThis=ctxvm; ctxvm.self=ctxvm;
  vm.createContext(ctxvm);
  vm.runInContext(SRC,ctxvm);
  return { CPChart:ctxvm.window.CPChart, cvs };
}
const { CPChart, cvs }=moiTruong();
kiem('nạp được assets/chart.js', typeof CPChart, 'function');

const T0=Math.floor(Date.parse('2020-01-01T09:00:00+07:00')/1000), NGAY=86400;
/* Dựng chuỗi: `f(i)` trả [vốn hoá, chỉ số]. Giá để bằng vốn hoá/1e6 cho có số thật. */
function chuoi(n,f){
  const out=[];
  for(let i=0;i<n;i++){ const [vh,ix]=f(i);
    out.push({t:T0+i*NGAY, o:vh/1e6, h:vh/1e6, l:vh/1e6, c:vh/1e6, v:1000, vh, ix}); }
  return out;
}
const lam=()=>CPChart(cvs,{});

/* ── ① NỀN LÀ TRUNG BÌNH TRƯỢT, và phải khớp định nghĩa của build_screen ────
   `g[i]` = log(vốn hoá/chỉ số) trừ trung bình trượt Wma nến của chính nó. Kiểm bằng cách
   dựng lại công thức ngay tại đây rồi so từng phiên — nếu ai đó đổi về "trung bình cả
   chuỗi" như bản đầu thì ca này gãy, và đó đúng là thứ làm chart lệch bảng giá. */
{
  const ch=lam();
  const n=600;
  const f=i=>[1e12*(1+0.4*Math.sin(i/50)), 1000*(1+0.2*Math.sin(i/37))];
  ch.setRows(chuoi(n,f),'d');
  const N=ch.nenSo();
  kiem('miền neo đếm đủ phiên', N.co, n);
  kiem('có dùng vốn hoá (không phải giá)', N.vh, true);
  kiem('Wma co lại theo độ dài chuỗi', N.Wma, Math.min(1250,Math.max(120,Math.floor(n/2))));
  const L=[]; for(let i=0;i<n;i++){ const [v,x]=f(i); L.push(Math.log(v/x)); }
  let lech=0, dem=0;
  for(let i=N.Wma-1;i<n;i++){
    let s2=0; for(let j=i-N.Wma+1;j<=i;j++) s2+=L[j];
    if(N.g[i]!=null){ lech=Math.max(lech,Math.abs(N.g[i]-(L[i]-s2/N.Wma))); dem++; }
  }
  kiem('có tính được g ở phần đuôi', dem>0, true);
  gan('g khớp trung bình trượt dựng lại độc lập', lech, 0, 1e-9);
  gan('g KHÔNG phải trung bình cả chuỗi',
      Math.abs(N.g[n-1]-(L[n-1]-L.reduce((a,b)=>a+b,0)/n))>1e-6?1:0, 1, 0);
}

/* ── ② HAI DẤU BẤT BIẾN THEO `k` ───────────────────────────────────────────
   Nhân toàn bộ chỉ số với một hằng số -> `k` đổi, g dịch đúng một hằng số, nên
   argmin/argmax trong mọi cửa sổ phải y nguyên. Đây là lý do dải dùng được để đọc
   sớm dù vạch nền tự nó có nhìn trước. */
{
  const n=800, f=i=>[1e12*(1+0.5*Math.sin(i/60)+i/4000), 1000*(1+0.3*Math.cos(i/45))];
  const a=lam(); a.setRows(chuoi(n,f),'d'); const A=a.nenSo();
  const b=lam(); b.setRows(chuoi(n,i=>{const [v,x]=f(i); return [v,x*7.3];}),'d'); const B=b.nenSo();
  kiem('đổi thang chỉ số -> k đổi', A.k!==B.k, true);
  let lechG=0; for(let i=0;i<n;i++) lechG=Math.max(lechG,Math.abs((A.g[i]-B.g[i])-(A.g[0]-B.g[0])));
  gan('g chỉ dịch đúng một hằng số', lechG, 0, 1e-9);
  const dem=(x,m)=>x[m].reduce((s,v)=>s+(v?1:0),0);
  kiem('số dấu △ không đổi', dem(A,'pk'), dem(B,'pk'));
  let lech=0; for(let i=0;i<n;i++) if(A.pk[i]!==B.pk[i]) lech++;
  kiem('△ nằm đúng các phiên cũ', lech, 0);
}

/* ── ③ △ PHÂN KỲ: vốn hoá thủng đáy mới mà g thì không ─────────────────────
   Dựng thẳng ca đó: 250 phiên đầu vốn hoá và chỉ số cùng rơi (g phẳng, đáy của g nằm
   ở đầu chuỗi); tới cuối cho vốn hoá rơi tiếp nhưng chỉ số rơi MẠNH HƠN -> vốn hoá
   đáy mới, g lại đi lên. */
{
  const n=400, out=[];
  for(let i=0;i<n;i++){
    let vh,ix;
    if(i<300){ vh=1e12*Math.exp(-i/300); ix=1000*Math.exp(-i/300); }        // g phẳng
    else{ vh=1e12*Math.exp(-300/300)*Math.exp(-(i-300)/900);                // vốn hoá còn rơi
          ix=1000*Math.exp(-300/300)*Math.exp(-(i-300)/200); }              // chỉ số rơi mạnh hơn
    out.push({t:T0+i*NGAY,o:vh/1e6,h:vh/1e6,l:vh/1e6,c:vh/1e6,v:1000,vh,ix});
  }
  const ch=lam(); ch.setRows(out,'d'); const N=ch.nenSo();
  const co=N.pk.some((v,i)=>v&&i>=310);
  kiem('△ nổ khi vốn hoá đáy mới mà g đi lên', co, true);
  kiem('vốn hoá phiên cuối đúng là đáy chuỗi',
    N.b[n-1]<=Math.min(...N.b.filter(v=>v!=null))+1e-6, true);
  kiem('g phiên cuối KHÔNG phải đáy chuỗi', N.g[n-1]>Math.min(...N.g)+1e-9, true);
}

/* ── ④ ● và ○ chỉ nổ khi CÒN DƯỚI NỀN, và hai tầng KHÔNG chồng nhau ────────
   Đỉnh W2 hiển nhiên cũng là đỉnh W1, nên nếu quên trừ thì đúng những phiên đáng chú ý
   nhất lại bị vẽ hai dấu đè lên nhau. */
{
  /* CHUỖI PHẢI DAO ĐỘNG, đừng dùng chuỗi tăng đều. Với nền là TRUNG BÌNH TRƯỢT thì một mã
     mạnh lên liên tục luôn nằm TRÊN nền của chính nó, nên không dấu nào nổ và ca kiểm mất
     hết ý nghĩa — đúng lỗi của bản đầu ca này. Sóng sin cho g cắt qua 0 nhiều lần, tức có
     cả đoạn "còn dưới nền mà vừa lập đỉnh cửa sổ" để hai dấu có chỗ mà nổ. */
  const n=900;
  const ch=lam(); ch.setRows(chuoi(n,i=>[1e12*(1+0.5*Math.sin(i/90)),1000]),'d');
  const N=ch.nenSo();
  kiem('không có ● nào nằm trên nền', N.dinh.some((v,i)=>v&&N.g[i]>=0), false);
  kiem('không có ○ nào nằm trên nền', N.dinhN.some((v,i)=>v&&N.g[i]>=0), false);
  kiem('có ít nhất một ● ở nửa dưới', N.dinh.some(v=>v), true);
  kiem('có ít nhất một ○ ở nửa dưới', N.dinhN.some(v=>v), true);
  let chong=0; for(let i=0;i<n;i++) if(N.dinh[i]&&N.dinhN[i]) chong++;
  kiem('hai tầng không trùng phiên nào', chong, 0);
  kiem('tầng sớm ○ dày hơn tầng xác nhận ●',
    N.dinhN.filter(Boolean).length>N.dinh.filter(Boolean).length, true);
}

/* ── ⑤ ĐỆM PHẢI XOÁ KHI setRows — ca đã hỏng thật lúc dựng ─────────────────
   `veLaiPhu` gắn vốn hoá/chỉ số vào rồi gọi lại setRows với mảng CÙNG độ dài, CÙNG
   mốc đầu, CÙNG mốc cuối. Khoá đệm dựng từ hình dạng chuỗi sẽ thấy y hệt lần trước. */
{
  const n=500;
  const tron=chuoi(n,i=>[1e12*(1+0.3*Math.sin(i/40)),1000*(1+0.1*Math.sin(i/33))]);
  const rong=tron.map(r=>({...r, vh:undefined, ix:undefined}));
  const ch=lam();
  ch.setRows(rong,'d');
  kiem('chưa có phủ -> miền neo rỗng', ch.nenSo().co, 0);
  ch.setRows(tron,'d');
  kiem('gắn phủ vào rồi -> miền neo đầy đủ', ch.nenSo().co, n);
}

/* ── ⑥ KHÔNG CÓ VỐN HOÁ THÌ LUI VỀ GIÁ, không bỏ trắng dải ─────────────────── */
{
  const n=400;
  const r=chuoi(n,i=>[1e12*(1+0.2*Math.sin(i/30)),1000*(1+0.1*Math.cos(i/25))])
    .map(x=>({...x, vh:undefined}));
  const ch=lam(); ch.setRows(r,'d'); const N=ch.nenSo();
  kiem('lui về giá', N.vh, false);
  kiem('vẫn dựng được miền neo', N.co, n);
}

/* ── ⑦ CỬA SỔ CO THEO ĐỘ DÀI CHUỖI (khung Tuần/Tháng không mất trắng dải) ─── */
{
  const dai=lam(); dai.setRows(chuoi(2000,i=>[1e12*(1+0.2*Math.sin(i/80)),1000]),'d');
  /* 100/200 phải TRÙNG với `opts` của chip `nengan` trong assets/screener.js — đổi một
     bên mà quên bên kia là chart và bảng giá nói hai chuyện. */
  kiem('chuỗi dài giữ cửa sổ chuẩn 100/200', dai.nenSo().W1+'/'+dai.nenSo().W2, '100/200');
  const ngan=lam(); ngan.setRows(chuoi(180,i=>[1e12*(1+0.2*Math.sin(i/20)),1000]),'m');
  const N=ngan.nenSo();
  kiem('chuỗi ngắn co cửa sổ lại', N.W1<100&&N.W2<200, true);
  kiem('cửa sổ ngắn vẫn nằm trong chuỗi', N.W2<=180, true);
}

console.log('\n'+'─'.repeat(60)+`\n  ĐẠT ${pass} · HỎNG ${fail}\n`);
process.exit(fail?1:0);
