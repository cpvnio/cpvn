/* ============================================================================
   CPScreen — BỘ LỌC bảng giá CPVN: van an toàn + 19 chip lọc nhanh 1 chạm.
   Dữ liệu: data/screen.json (kỹ thuật) + data/fund.json (dẫn xuất từ kho BCTC,
   build_screen.py tự sinh mỗi phiên). Nạp LƯỜI khi người dùng mở panel lần đầu —
   không tốn tải trang cho người không dùng lọc.
   ========================================================================== */
'use strict';
const CPScreen={loaded:false,loading:null,T:{},F:{}};
(function(){

/* ---------- nạp dữ liệu ---------------------------------------------------- */
CPScreen.load=function(){
  if(CPScreen.loading) return CPScreen.loading;
  CPScreen.loading=(async()=>{
    const [sc,fd]=await Promise.all([
      fetch('data/screen.json').then(r=>r.ok?r.json():null).catch(()=>null),
      fetch('data/fund.json').then(r=>r.ok?r.json():null).catch(()=>null),
    ]);
    if(!sc||!sc.d||!fd||!fd.d) return false;
    // hai file lưu dạng CỘT: f = tên trường, d[MÃ] = mảng giá trị cùng thứ tự
    const unpack=pk=>{const M={};for(const s in pk.d){const a=pk.d[s],o={};
      pk.f.forEach((k,i)=>o[k]=a[i]);M[s]=o;}return M;};
    CPScreen.T=unpack(sc); CPScreen.F=unpack(fd);
    CPScreen.loaded=true; return true;
  })();
  return CPScreen.loading;
};

/* ---------- tiện ích ------------------------------------------------------- */
CPScreen.pe=c=>{ const p=(c.eps>0&&c.price>0)?c.price/c.eps:(c.pe!=null?+c.pe:null);
  return p!=null&&p>0&&p<1000?p:null; };

/* ---------- CHIPS 1 chạm --------------------------------------------------- */
CPScreen.chips=[
  {id:'pe10',  g:'Định giá', nm:'P/E < 10'},
  {id:'pb1',   g:'Định giá', nm:'P/B < 1'},
  {id:'eps3k', g:'Định giá', nm:'EPS > 3.000đ'},
  {id:'dy5',   g:'Định giá', nm:'Cổ tức ≥ 5%'},
  {id:'cash20',g:'Sức khoẻ', nm:'Tiền mặt > 20% vốn hoá'},
  {id:'npup',  g:'Sức khoẻ', nm:'LNST năm tăng'},
  {id:'noloss',g:'Sức khoẻ', nm:'8 năm không lỗ'},
  {id:'roe15', g:'Sức khoẻ', nm:'ROE ≥ 15%'},
  {id:'ma200', g:'Kỹ thuật', nm:'Giá > MA200'},
  {id:'trend', g:'Kỹ thuật', nm:'Xu hướng tăng'},
  {id:'rsi30', g:'Kỹ thuật', nm:'RSI < 30 (quá bán)'},
  {id:'hi52',  g:'Kỹ thuật', nm:'Gần đỉnh 52 tuần'},
  {id:'vol2',  g:'Kỹ thuật', nm:'Vol đột biến ×2'},
  {id:'nn30',  g:'Dòng tiền', nm:'NN mua ròng 30 phiên'},
  {id:'nnd10', g:'Dòng tiền', nm:'NN mua hôm nay ≥ 10 tỷ'},
  {id:'nn60',  g:'Dòng tiền', nm:'NN gom ròng 60 phiên'},
  {id:'q2up',  g:'Sức khoẻ', nm:'2 quý liền lãi tăng ≥ 25%'},
  {id:'lossY3',g:'Đáy & Phục hồi', nm:'Lỗ 3 năm nhưng thu hẹp'},
  {id:'lossQ8',g:'Đáy & Phục hồi', nm:'Lỗ 8 quý nhưng thu hẹp'},
];
CPScreen.chip=function(id,c){
  const t=CPScreen.T[c.sym]||{},f=CPScreen.F[c.sym]||{},p=c.price||0;
  switch(id){
    case 'pe10':  { const v=CPScreen.pe(c); return v!=null&&v<10; }
    case 'pb1':   return c.pb!=null&&c.pb>0&&c.pb<1;
    case 'eps3k': return (c.eps||0)>3000;
    case 'dy5':   return p>0&&(f.divCash||0)/p>=0.05;
    case 'cash20':return (c.cash||0)*1e9>0.2*(c.mcapLive||c.mcap||Infinity);
    case 'npup':  return (f.npChg1??-1)>0;
    case 'noloss':return (f.yrsProfit||0)>=8;
    case 'roe15': return (f.roe||0)>=15;
    case 'ma200': return p>0&&t.ma200!=null&&p>t.ma200;
    case 'trend': return p>0&&t.ma20&&t.ma50&&t.ma200&&p>t.ma20&&t.ma20>t.ma50&&t.ma50>t.ma200;
    case 'rsi30': return t.rsi!=null&&t.rsi<30;
    case 'hi52':  return t.dhi!=null&&t.dhi>=-15;
    case 'vol2':  return (t.volr||0)>=2;
    case 'nn30':  return (t.nn20||0)>0;
    case 'nnd10': return (c.fbuy||0)*p>=1e10;
    // gom BỀN: mua ròng suốt 60 phiên VÀ chiếm >=3% giá trị giao dịch — bỏ những mã
    // chỉ dương nhờ đúng một phiên mua lớn rồi thôi
    case 'nn60':  return (t.nn60||0)>0&&(t.nnr60||0)>=3;
    // HAI quý LIÊN TIẾP lãi tăng >=25% so với CÙNG KỲ năm trước (mốc 25% của CAN SLIM).
    // So cùng kỳ chứ không so quý liền trước — tránh nhiễu mùa vụ.
    case 'q2up':  return (f.npQ??-9)>=25&&(f.npQ2??-9)>=25;
    // CÒN LỖ nhưng đáy đã qua: 3 năm liền lỗ mà lỗ nhỏ dần từng năm
    case 'lossY3':return f.lossY3===1;
    // 8 quý liền lỗ, nhưng tổng lỗ 4 quý gần đây NHỎ HƠN 4 quý trước đó
    case 'lossQ8':return f.lossQ8===1;
    default: return true;
  }
};

})();
