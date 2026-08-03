/* ============================================================================
   CPScreen — BỘ LỌC bảng giá CPVN: van an toàn + chips 1 chạm + 9 preset triết lý
   Dữ liệu: data/fund.json (dẫn xuất từ kho BCTC,
   build_screen.py tự sinh mỗi phiên) + data/screen.json (kỹ thuật). Nạp LƯỜI khi
   người dùng mở panel lần đầu — không tốn tải trang cho người không dùng lọc.
   ========================================================================== */
'use strict';
const CPScreen={loaded:false,loading:null,T:{},F:{},pb20:null,mfRank:null};
(function(){

/* ---------- nạp dữ liệu + dựng các ngưỡng thống kê ------------------------- */
CPScreen.load=function(){
  if(CPScreen.loading) return CPScreen.loading;
  CPScreen.loading=(async()=>{
    const [sc,fd]=await Promise.all([
      fetch('data/screen.json').then(r=>r.ok?r.json():null).catch(()=>null),
      fetch('data/fund.json').then(r=>r.ok?r.json():null).catch(()=>null),
    ]);
    if(!sc||!sc.d||!fd||!fd.d) return false;
    const unpack=pk=>{const M={};for(const s in pk.d){const a=pk.d[s],o={};
      pk.f.forEach((k,i)=>o[k]=a[i]);M[s]=o;}return M;};
    CPScreen.T=unpack(sc); CPScreen.F=unpack(fd);
    buildStats();
    CPScreen.loaded=true; return true;
  })();
  return CPScreen.loading;
};

/* trung vị biên ròng theo ngành (cho Buffett) — tính trên TOÀN thị trường cho ổn định.
   Ngành < 8 mã gộp về ngành cha để trung vị không bị vài mã kéo lệch. */
let nmMed={},nmAll=null;
function buildStats(){
  const bySec={},byPar={};
  for(const c of CP.coins.values()){
    const f=CPScreen.F[c.sym]; if(!f) continue;
    if(f.nm!=null){
      (bySec[c.sector]=bySec[c.sector]||[]).push(f.nm);
      const p=c.parent||c.sector;
      (byPar[p]=byPar[p]||[]).push(f.nm);
    }
  }
  const med=a=>{a.sort((x,y)=>x-y);return a[Math.floor(a.length/2)];};
  const all=[];for(const k in bySec) all.push(...bySec[k]);
  nmAll=all.length?med(all.slice()):0;
  nmMed={};
  for(const c of CP.coins.values()){
    const s=c.sector, p=c.parent||s;
    if(nmMed[s]!=null) continue;
    const arr=(bySec[s]&&bySec[s].length>=8)?bySec[s]:(byPar[p]&&byPar[p].length>=8?byPar[p]:null);
    nmMed[s]=arr?med(arr.slice()):nmAll;
  }
}
const secNm=c=>nmMed[c.sector]!=null?nmMed[c.sector]:nmAll;

/* CÁC NGƯỠNG XẾP HẠNG TƯƠNG ĐỐI tính TRONG VŨ TRỤ ĐÃ QUA VAN AN TOÀN — Piotroski
   chọn nhóm P/B rẻ nhất và Greenblatt lấy top 30 phải xếp hạng giữa các mã ĐẦU TƯ
   ĐƯỢC, không phải giữa cả nghìn mã penny bị chính cái van chặn ngoài cửa.
   Gọi lại mỗi khi người dùng chỉnh van (rẻ: <10ms cho 1.500 mã). */
CPScreen.rebuild=function(vanFn){
  const V=[...CP.coins.values()].filter(c=>CPScreen.F[c.sym]&&(!vanFn||vanFn(c)));
  // P/B đáy 20% của vũ trụ lọc (cho Piotroski)
  const pbs=V.map(c=>c.pb).filter(x=>(x||0)>0).sort((a,b)=>a-b);
  CPScreen.pb20=pbs.length?pbs[Math.floor(pbs.length*0.2)]:1;
  // Greenblatt: xếp hạng kép EY + ROC, chốt theo phiên gần nhất
  const pool=[];
  for(const c of V){
    const f=CPScreen.F[c.sym];
    if(f.fin||/tiện ích/i.test(c.sector||'')) continue;
    if(!((f.ptx||0)>0)||f.roc==null) continue;
    const ev=(c.mcap||0)+((f.evDebt||0)-(f.evCash||0))*1e9;
    if(ev<=0) continue;
    pool.push({s:c.sym,ey:f.ptx*1e9/ev,roc:f.roc});
  }
  pool.sort((a,b)=>b.ey-a.ey);  const rE={}; pool.forEach((x,i)=>rE[x.s]=i);
  pool.sort((a,b)=>b.roc-a.roc);const rR={}; pool.forEach((x,i)=>rR[x.s]=i);
  const order=pool.map(x=>x.s).sort((a,b)=>(rE[a]+rR[a])-(rE[b]+rR[b]));
  CPScreen.mfRank={}; order.forEach((s,i)=>CPScreen.mfRank[s]=i+1);
};

/* ---------- tiện ích ------------------------------------------------------- */
const nz=(v,d)=>v==null?d:v;
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
    default: return true;
  }
};

/* ---------- 9 PRESET triết lý ---------------------------------------------- */
CPScreen.presets=[
 {id:'graham',ic:'🏛',nm:'Phòng thủ Graham',
  ds:'P/E trên EPS bình quân 3 năm ≤ 15 · P/E×P/B ≤ 22,5 · 8 năm liền có lãi · cổ tức tiền mặt đều ≥ 5 năm · thanh toán hiện hành ≥ 2 và nợ dài hạn ≤ vốn lưu động ròng (nhóm tài chính miễn 2 điều kiện cấu trúc nợ)'},
 {id:'buffett',ic:'💎',nm:'Chất lượng Buffett',
  ds:'ROE ≥ 15% TỪNG NĂM suốt 5 năm (xuyên chu kỳ) · 8 năm không lỗ · biên ròng trên trung vị ngành và không suy giảm · nợ vay/VCSH < 1 + CFO/LNST ≥ 0,9 (tài chính: thay bằng ROA ≥ 1% & VCSH/TS ≥ 5%)'},
 {id:'canslim',ic:'🚀',nm:'CAN SLIM (O’Neil)',
  ds:'LNST quý ≥ +25% cùng kỳ · LNST tăng ≥ 25%/năm suốt 3 năm · ROE ≥ 17% · giá cách đỉnh 52W ≤ 15% · RS ≥ 80 · khối ngoại mua ròng 30 phiên (chữ I bản VN)'},
 {id:'miner',ic:'📈',nm:'Trend Template Minervini',
  ds:'Giá > MA50 > MA150 > MA200 · MA200 dốc lên ≥ 1 tháng · giá cao hơn đáy 52W ≥ 30% · cách đỉnh ≤ 25% · RS ≥ 70 · đủ ~1 năm giao dịch'},
 {id:'pio',ic:'🎯',nm:'Điểm Piotroski F',
  ds:'Nhóm P/B rẻ nhất 20% thị trường + đạt gần tối đa 8 tín hiệu sức khoẻ BCTC (ROA, CFO, dồn tích, đòn bẩy, thanh khoản, biên gộp, vòng quay — ngân hàng chấm trên 6)'},
 {id:'mf',ic:'🧮',nm:'Công thức kỳ diệu Greenblatt',
  ds:'Xếp hạng kép: Tỷ suất lợi nhuận (LNTT/EV) + Sinh lời trên vốn — lấy TOP 30, loại tài chính & tiện ích như công thức gốc. Kết quả xếp đúng thứ hạng'},
 {id:'div',ic:'💰',nm:'Cổ tức bền vững',
  ds:'Tỷ suất cổ tức tiền mặt ≥ 5% · trả đều ≥ 5 năm liên tục · payout ≤ 60% · CFO phủ được cổ tức · LNST năm gần nhất không giảm quá 20%'},
 {id:'lynch',ic:'⚖️',nm:'GARP Lynch',
  ds:'PEG < 1 (P/E ÷ tăng trưởng LNST 3 năm) · nợ vay/VCSH < 0,5 · tồn kho không phình nhanh hơn doanh thu · LOẠI ngành chu kỳ (PEG đáy chu kỳ là bẫy) · tài chính: VCSH/TS > 5% & ROA > 1%'},
 {id:'nn',ic:'🌊',nm:'Sóng ngầm khối ngoại',
  ds:'Khối ngoại mua ròng ≥ 5% tổng GTGD 30 phiên VÀ còn mua ròng luỹ kế 60 phiên · giá trên MA50 · RS ≥ 70 — dòng tiền lớn bền bỉ, không phải cú đánh 1 phiên'},
];
CPScreen.pass=function(id,c){
  const t=CPScreen.T[c.sym],f=CPScreen.F[c.sym],p=c.price||0;
  if(!t||!f) return false;
  switch(id){
    case 'graham':{
      const pe3=(f.eps3||0)>0&&p>0?p/f.eps3:null;
      if(!(pe3&&pe3<=15&&(c.pb||99)*pe3<=22.5)) return false;
      if((f.yrsProfit||0)<8||(f.divYears||0)<5) return false;
      return f.fin?true:(nz(f.cr,0)>=2&&nz(f.ltdNwc,99)<=1);
    }
    case 'buffett':{
      if(nz(f.roeMin5,-99)<15||(f.yrsProfit||0)<8) return false;
      if(f.nm==null||f.nm<secNm(c)||f.nmAvg5==null||f.nm<f.nmAvg5-1) return false;
      return f.fin?(nz(f.roa,0)>=1&&nz(f.eqA,0)>=5):(nz(f.de,99)<1&&nz(f.cfoNp3,0)>=0.9);
    }
    case 'canslim':
      return nz(f.npQ,-99)>=25&&nz(f.npCagr3,-99)>=25&&nz(f.roe,0)>=17
        &&nz(t.dhi,-99)>=-15&&(t.rs||0)>=80&&(t.nn20||0)>0;
    case 'miner':
      return p>0&&t.ma50&&t.ma150&&t.ma200&&p>t.ma50&&t.ma50>t.ma150&&t.ma150>t.ma200
        &&nz(t.m200s,-1)>0&&nz(t.dlo,0)>=30&&nz(t.dhi,-99)>=-25&&(t.rs||0)>=70&&(t.nsess||0)>=210;
    case 'pio':
      return c.pb!=null&&c.pb>0&&c.pb<=CPScreen.pb20&&(f.fmx||0)>=6&&(f.fsc||0)>=(f.fmx||9)-1;
    case 'mf':
      return CPScreen.mfRank&&CPScreen.mfRank[c.sym]!=null&&CPScreen.mfRank[c.sym]<=30;
    case 'div':{
      if(!(p>0&&(f.divCash||0)/p>=0.05)) return false;
      if((f.divYears||0)<5||nz(f.npChg1,-99)<-20) return false;
      const pay=(c.eps||0)>0?(f.divCash||0)/c.eps:9;
      if(pay>0.6) return false;
      return f.fin?true:((f.cfoT||0)*1e9>=(f.divCash||0)*(c.shares||0));
    }
    case 'lynch':{
      const pv=CPScreen.pe(c);
      if(!(pv&&(f.npCagr3||0)>0&&pv/f.npCagr3<1)||f.cyc) return false;
      return f.fin?(nz(f.eqA,0)>5&&nz(f.roa,0)>1):(nz(f.de,99)<0.5&&nz(f.invRev,0)<=10);
    }
    case 'nn':
      return nz(t.nnr20,-99)>=5&&(t.nn60||0)>0&&p>0&&t.ma50!=null&&p>t.ma50&&(t.rs||0)>=70;
    default: return true;
  }
};

})();
