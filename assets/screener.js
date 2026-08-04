/* ============================================================================
   CPScreen — BỘ LỌC bảng giá CPVN: van an toàn + chips 1 chạm + 15 bảng xếp hạng
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

/* ---------- BẢNG XẾP HẠNG (thay 9 preset triết lý cũ) -----------------------
   Preset cũ trả lời "mã này có đạt trường phái X không" — hỏi kiểu đúng/sai, và
   người dùng phải biết Graham/Piotroski là gì mới dùng được. Bảng xếp hạng trả lời
   thẳng câu người ta thật sự hỏi: "ai lãi nhất", "ai lỗ nặng nhất", "ai nhiều tiền
   mặt nhất" — vừa LỌC vừa SẮP XẾP trong một cú bấm.

   ok(c,f,t)  : mã có đủ tư cách vào bảng này không (chặn số rác)
   sc(c,f,t)  : điểm để xếp hạng, LUÔN xếp GIẢM DẦN (muốn tăng dần thì trả số âm)

   CHẶN SỐ RÁC là phần quan trọng nhất: kho có mã biên ròng 115.200% và mã lãi tăng
   +84.736% — đều là doanh thu/nền lợi nhuận tí hon chia ra, lọt vào là top vô nghĩa. */
const cap=(v,lo,hi)=>v!=null&&isFinite(v)&&v>=lo&&v<=hi;
CPScreen.ranks=[
 // ── LÃI & LỖ: câu hỏi ai cũng hỏi trước tiên ───────────────────────────────
 {id:'npBig', g:'Lãi & Lỗ', nm:'Lãi lớn nhất', dv:'tỷ',
  ds:'Lợi nhuận sau thuế năm gần nhất, cao xuống thấp. Con số tuyệt đối — quy mô thật của doanh nghiệp.',
  ok:c=>(c.np||0)>0, sc:c=>c.np},
 {id:'npLoss', g:'Lãi & Lỗ', nm:'Lỗ nặng nhất', dv:'tỷ',
  ds:'Chỉ các mã LỖ, lỗ to nhất lên đầu. Xem ai đang đốt tiền, và ai vừa thoát lỗ.',
  ok:c=>(c.np||0)<0, sc:c=>-c.np},
 {id:'npGrow', g:'Lãi & Lỗ', nm:'Lãi tăng mạnh nhất', dv:'%',
  ds:'LNST năm nay so với năm trước. Đã chặn trên 500% vì nền lợi nhuận tí hon chia ra cho số vô nghĩa.',
  ok:(c,f)=>(c.np||0)>0&&cap(f.npChg1,-100,500), sc:(c,f)=>f.npChg1},
 {id:'npCagr', g:'Lãi & Lỗ', nm:'Tăng trưởng lãi 3 năm', dv:'%/năm',
  ds:'Tốc độ tăng lợi nhuận kép 3 năm — bền hơn con số một năm, tránh mã lãi đột biến một lần.',
  ok:(c,f)=>cap(f.npCagr3,-100,200), sc:(c,f)=>f.npCagr3},

 // ── BIÊN LỢI NHUẬN: lãi trên mỗi đồng doanh thu ────────────────────────────
 {id:'nmTop', g:'Biên lợi nhuận', nm:'Biên ròng cao nhất', dv:'%',
  ds:'Lãi ròng trên doanh thu. Biên cao = có lợi thế cạnh tranh, ít bị ép giá. Chặn trong 0–100%.',
  ok:(c,f)=>cap(f.nm,0.1,100), sc:(c,f)=>f.nm},
 {id:'nmUp', g:'Biên lợi nhuận', nm:'Biên ròng cải thiện', dv:'điểm %',
  ds:'Biên năm nay CAO HƠN bình quân 5 năm bao nhiêu điểm phần trăm. Doanh nghiệp đang tốt lên, không phải đang tốt sẵn.',
  ok:(c,f)=>cap(f.nm,-50,100)&&cap(f.nmAvg5,-50,100), sc:(c,f)=>f.nm-f.nmAvg5},

 // ── TIỀN MẶT & NỢ: sống được bao lâu nếu thị trường xấu ────────────────────
 {id:'cashTop', g:'Tiền mặt & Nợ', nm:'Tiền mặt / vốn hoá', dv:'%',
  ds:'Tiền và tương đương chiếm bao nhiêu phần vốn hoá. Trên 50% nghĩa là mua công ty gần như được tặng kèm tiền mặt.',
  ok:c=>(c.cash||0)>0&&(c.mcapLive||c.mcap||0)>0, sc:c=>(c.cash*1e9)/(c.mcapLive||c.mcap)*100},
 {id:'deLow', g:'Tiền mặt & Nợ', nm:'Nợ vay thấp nhất', dv:'lần',
  ds:'Nợ vay trên vốn chủ sở hữu, thấp lên đầu. Nợ ít thì lãi suất tăng hay doanh thu hụt cũng không gãy.',
  ok:(c,f)=>cap(f.de,0,20)&&!f.fin, sc:(c,f)=>-f.de},
 {id:'roeTop', g:'Tiền mặt & Nợ', nm:'ROE cao nhất', dv:'%',
  ds:'Lợi nhuận trên vốn chủ. Chỉ số Buffett xem đầu tiên: mỗi đồng vốn cổ đông đẻ ra bao nhiêu. Chặn trong 0–100%.',
  ok:(c,f)=>cap(f.roe,0.1,100), sc:(c,f)=>f.roe},

 // ── ĐỊNH GIÁ: đắt hay rẻ ───────────────────────────────────────────────────
 {id:'peLow', g:'Định giá', nm:'P/E thấp nhất', dv:'lần',
  ds:'Giá trên lợi nhuận mỗi cổ phiếu, tính SỐNG theo giá hiện tại. Chỉ mã đang có lãi.',
  ok:c=>CPScreen.pe(c)!=null, sc:c=>-CPScreen.pe(c)},
 {id:'pbLow', g:'Định giá', nm:'P/B thấp nhất', dv:'lần',
  ds:'Giá trên giá trị sổ sách. Dưới 1 nghĩa là thị trường định giá thấp hơn vốn chủ trên giấy tờ.',
  ok:c=>cap(c.pb,0.01,50), sc:c=>-c.pb},
 {id:'dyTop', g:'Định giá', nm:'Cổ tức tiền mặt cao nhất', dv:'%',
  ds:'Cổ tức tiền mặt chia cho thị giá. Tiền thật về túi hằng năm, không phụ thuộc giá lên xuống.',
  ok:(c,f)=>(c.price||0)>0&&(f.divCash||0)>0&&f.divCash/c.price<=0.3, sc:(c,f)=>f.divCash/c.price*100},

 // ── DÒNG TIỀN & ĐÀ GIÁ ─────────────────────────────────────────────────────
 {id:'nnTop', g:'Dòng tiền & Đà giá', nm:'Khối ngoại mua ròng 20 phiên', dv:'% GTGD',
  ds:'Mua ròng của khối ngoại chiếm bao nhiêu phần giá trị giao dịch 20 phiên. Dòng tiền lớn bền bỉ, không phải cú đánh một phiên.',
  ok:(c,f,t)=>cap(t.nnr20,-100,100)&&t.nnr20>0, sc:(c,f,t)=>t.nnr20},
 {id:'rsTop', g:'Dòng tiền & Đà giá', nm:'Sức mạnh giá (RS)', dv:'/100',
  ds:'Xếp hạng đà giá so với cả thị trường, thang 1–99. Đà giá là một trong ít yếu tố được kiểm chứng lâu nhất.',
  ok:(c,f,t)=>cap(t.rs,1,99), sc:(c,f,t)=>t.rs},

 // ── CẢNH BÁO: ít người nhìn, nhưng bắt được thứ báo cáo giấu ───────────────
 {id:'cfoBad', g:'Cảnh báo', nm:'Lãi nhưng tiền không về', dv:'lần',
  ds:'Dòng tiền kinh doanh chia lợi nhuận, 3 năm — THẤP lên đầu. Báo lãi to mà tiền không về là dấu hiệu số một của lợi nhuận trên giấy.',
  ok:(c,f)=>(c.np||0)>0&&cap(f.cfoNp3,-10,10), sc:(c,f)=>-f.cfoNp3},
];
/* Trả về danh sách ĐÃ xếp hạng của một bảng, kèm điểm để hiển thị. */
CPScreen.rankList=function(id,pool){
  const R=CPScreen.ranks.find(x=>x.id===id); if(!R) return null;
  const out=[];
  for(const c of pool){
    const f=CPScreen.F[c.sym]||{}, t=CPScreen.T[c.sym]||{};
    try{ if(!R.ok(c,f,t)) continue; const v=R.sc(c,f,t);
      if(v==null||!isFinite(v)) continue; out.push({c,v}); }catch(e){}
  }
  out.sort((a,b)=>b.v-a.v);
  return out;
};

})();
