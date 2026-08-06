/* ============================================================================
   CPVN LAB — lab.js
   Xưởng tính năng: 3 tính năng được duyệt làm lại từ đầu (Radar · Bản đồ nhiệt ·
   Tìm cơ hội) + 6 đề xuất mới hướng lan toả/giữ chân, mỗi mục có nút ⭐ để chọn.
   File độc lập, chỉ ĐỌC kho: ../universe.json, ../data/*, demo-*.json.
   Nguyên tắc nội dung: chỉ số liệu & thống kê mô tả — không khuyến nghị mua bán.
   ========================================================================== */
'use strict';
(function(){

/* ---------------------------------------------------------------- tiện ích */
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const num=n=>n==null||isNaN(n)?'—':Math.round(n).toLocaleString('en-US');
const fx=(n,d)=>n==null||isNaN(n)?'—':(+n).toFixed(d==null?2:d);
const vnd=function(n){ if(n==null||isNaN(n)||!n) return '—';
  // MỘT ĐƠN VỊ DUY NHẤT "tỷ" cho toàn site (xem chú thích ở assets/core.js)
  const v=n/1e9, a=Math.abs(v);
  return v.toLocaleString('en-US',{maximumFractionDigits:a>=100?0:a>=1?1:2})+' tỷ'; };
const ty=n=>n==null||isNaN(n)?'—':vnd(n);   // vnd đã thống nhất đơn vị tỷ
const pct=v=>v==null||isNaN(v)?'—':(v>0?'+':'')+(+v).toFixed(2)+'%';
const cls=v=>v==null||isNaN(v)?'':Math.abs(v)<0.005?'fl':v>0?'up':'dn';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const isLight=()=>document.documentElement.dataset.theme==='light';
const LS={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},
          set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const tsDate=t=>{ const d=new Date((t+25200)*1000);
  return d.getUTCDate()+'/'+(d.getUTCMonth()+1)+'/'+d.getUTCFullYear(); };
const tsDM=t=>{ const d=new Date((t+25200)*1000); return d.getUTCDate()+'/'+(d.getUTCMonth()+1); };
function shortName(s){ s=String(s||'').trim();
  let t=s.replace(/^(Ngân hàng (Thương mại )?Cổ phần|Ngân hàng TMCP|Tổng Công ty Cổ phần|Công ty Cổ phần|CTCP|Công ty TNHH|Tổng Công ty|Tập đoàn)\s+/i,'')
         .replace(/\s*[-–]\s*(Công ty Cổ phần|CTCP|Công ty TNHH)\s*$/i,'');
  return t.length>=3?t:s; }
window.LB={};
LB.logoErr=function(el){
  const cdn=el.getAttribute('data-cdn');
  if(cdn){ el.removeAttribute('data-cdn'); el.src=cdn; return; }
  const s=el.getAttribute('data-sym')||'';
  el.parentNode.outerHTML='<span class="noimg">'+esc(s.slice(0,2))+'</span>';
};
const logoHTML=c=>'<span class="lgw"><img src="assets/logo/'+c.sym+'.webp" loading="lazy" alt="" data-sym="'+c.sym+'"'+
  (c.img?' data-cdn="'+esc(c.img)+'"':'')+' onerror="LB.logoErr(this)"></span>';
function toast(msg){ const t=document.createElement('div'); t.className='tst'; t.innerHTML=msg;
  $('#toast').appendChild(t);
  setTimeout(()=>{ t.style.transition='opacity .3s'; t.style.opacity='0'; setTimeout(()=>t.remove(),320); },3600); }
function dpr(cv,W,H){ const r=Math.min(2,devicePixelRatio||1);
  cv.width=Math.round(W*r); cv.height=Math.round(H*r);
  const x=cv.getContext('2d'); x.setTransform(r,0,0,r,0,0); x.clearRect(0,0,W,H); return x; }
function drawSpark(cv,vals,forceCol){
  if(!cv||!vals||vals.length<2) return;
  const W=cv.clientWidth||74, H=cv.clientHeight||26, x=dpr(cv,W,H);
  let mn=Infinity,mx=-Infinity; for(const v of vals){ if(v<mn)mn=v; if(v>mx)mx=v; }
  if(mx-mn<1e-9) mx=mn+1;
  const up=vals[vals.length-1]>=vals[0], col=forceCol||(up?'#16c784':'#ea3943');
  const X=i=>i/(vals.length-1)*(W-2)+1, Y=v=>H-2-(v-mn)/(mx-mn)*(H-4);
  x.beginPath(); vals.forEach((v,i)=>i?x.lineTo(X(i),Y(v)):x.moveTo(X(i),Y(v)));
  x.strokeStyle=col; x.lineWidth=1.6; x.lineJoin='round'; x.stroke();
  const g=x.createLinearGradient(0,0,0,H);
  const fillTop=forceCol?(forceCol==='#c026d3'?'rgba(192,38,211,.25)':'rgba(14,165,233,.25)')
    :(up?'rgba(22,199,132,.22)':'rgba(234,57,67,.22)');
  g.addColorStop(0,fillTop); g.addColorStop(1,'rgba(0,0,0,0)');
  x.lineTo(X(vals.length-1),H); x.lineTo(X(0),H); x.closePath(); x.fillStyle=g; x.fill();
}
function drawSparks(root){
  (root||document).querySelectorAll('canvas.rs').forEach(cv=>{
    const a=ST.spark[cv.dataset.s]; if(a) drawSpark(cv,a,cv.dataset.col||null);
  });
}
function heatColor(p,cap){
  const light=isLight(), NEU=light?[189,195,204]:[52,52,62];
  if(p==null||isNaN(p)) return {bg:'rgb('+NEU.join(',')+')',fg:light?'#10131a':'#c9c9d2'};
  const t=clamp(p/cap,-1,1), a=Math.abs(t), C=t>=0?[22,199,132]:[234,57,67];
  const rgb=NEU.map((v,i)=>Math.round(v+(C[i]-v)*Math.pow(a,.7)));
  const lum=(rgb[0]*.299+rgb[1]*.587+rgb[2]*.114)/255;
  return {bg:'rgb('+rgb.join(',')+')',fg:lum>.62?'#0d1016':'#ffffff'};
}
function squarify(items,X,Y,W,H){
  const out=[], list=items.filter(d=>d.v>0).slice().sort((a,b)=>b.v-a.v);
  const total=list.reduce((s,d)=>s+d.v,0); if(!total||W<=0||H<=0) return out;
  let x=X,y=Y,w=W,h=H,scale=(W*H)/total,i=0;
  const worst=(ar,side)=>{ const s=ar.reduce((a,b)=>a+b,0), mx=Math.max.apply(null,ar), mn=Math.min.apply(null,ar);
    return Math.max(side*side*mx/(s*s),(s*s)/(side*side*mn)); };
  while(i<list.length&&w>.5&&h>.5){
    const side=Math.min(w,h), row=[], areas=[];
    while(i<list.length){
      const a=Math.max(list[i].v*scale,.0001);
      if(areas.length&&worst(areas,side)<worst(areas.concat([a]),side)) break;
      areas.push(a); row.push(list[i]); i++;
    }
    const sum=areas.reduce((a,b)=>a+b,0);
    if(w>=h){ const rw=sum/h; let cy=y;
      row.forEach((d,k)=>{ const rh=areas[k]/rw; out.push({d,x,y:cy,w:rw,h:rh}); cy+=rh; }); x+=rw; w-=rw; }
    else{ const rh=sum/w; let cx=x;
      row.forEach((d,k)=>{ const rw2=areas[k]/rh; out.push({d,x:cx,y,w:rw2,h:rh}); cx+=rw2; }); y+=rh; h-=rh; }
  }
  return out;
}
function shotView(){   // chụp đúng KHUNG ĐANG NHÌN (viewport) + đóng dấu
  const run=()=>{ toast('Đang dựng ảnh…');
    window.html2canvas(document.body,{
      backgroundColor:isLight()?'#eef0f4':'#07070b', scale:2, logging:false, useCORS:true,
      x:scrollX, y:scrollY, width:innerWidth, height:innerHeight,
      windowWidth:innerWidth, windowHeight:innerHeight,
      onclone:doc=>{ doc.body.classList.add('shotmode'); },   // tắt lớp nền/toast gây mờ ảnh
    }).then(cv=>{
      const g=cv.getContext('2d'); g.setTransform(1,0,0,1,0,0);
      const W=cv.width,H=cv.height,k=W/innerWidth;
      g.textAlign='center'; g.shadowColor=isLight()?'rgba(255,255,255,.8)':'rgba(0,0,0,.85)'; g.shadowBlur=5*k;
      g.font='800 '+Math.round(22*k)+'px system-ui'; g.fillStyle=isLight()?'rgba(23,26,33,.92)':'rgba(255,255,255,.95)';
      g.fillText('CPVN.IO',W/2,H-14*k); g.shadowBlur=0;
      g.textAlign='right'; g.font='600 '+Math.round(10*k)+'px system-ui';
      g.fillStyle=isLight()?'rgba(23,26,33,.5)':'rgba(255,255,255,.45)';
      g.fillText('phiên '+ST.date,W-10*k,H-8*k);
      const a=document.createElement('a'); a.download='CPVN_'+(TITLEOF[cur]||'congcu').replace(/\s+/g,'-')+'_'+ST.date+'.png';
      a.href=cv.toDataURL('image/png'); a.click(); toast('Đã tải ảnh về máy ✓');
    }).catch(()=>toast('Không dựng được ảnh'));
  };
  if(window.html2canvas) return run();
  const sc=document.createElement('script'); sc.src='html2canvas.min.js';
  sc.onload=run; sc.onerror=()=>toast('Thiếu html2canvas.min.js'); document.head.appendChild(sc);
}
function shot(el,name){
  const run=()=>{ toast('Đang dựng ảnh…');
    window.html2canvas(el,{backgroundColor:isLight()?'#eef0f4':'#07070b',scale:2,logging:false}).then(cv=>{
      const g=cv.getContext('2d'), W=cv.width;
      g.font='800 '+Math.round(W/50)+'px system-ui'; g.textAlign='right';
      g.fillStyle='rgba(45,212,191,.92)';
      g.fillText('CPVN.IO · phiên '+ST.date,W-20,cv.height-18);
      const a=document.createElement('a'); a.download=(name||'cpvn')+'.png';
      a.href=cv.toDataURL('image/png'); a.click(); toast('Đã tải ảnh về máy ✓');
    }).catch(()=>toast('Không dựng được ảnh')); };
  if(window.html2canvas) return run();
  const s=document.createElement('script'); s.src='html2canvas.min.js';
  s.onload=run; s.onerror=()=>toast('Thiếu html2canvas.min.js'); document.head.appendChild(s);
}

/* ---------------------------------------------------------------- dữ liệu */
const ST={ map:new Map(), list:[], date:'', indices:[], parents:[], sectors:[], nnBuy:0, nnSell:0,
  vn30:new Set(), pack:null, market:null, spark:{}, sparkT:[], hist:new Map() };
async function loadAll(){
  const j=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
  const [u,eod,pk,mk]=await Promise.all([
    j('universe.json'), j('data/eod/latest.json'),
    j('data/screen.json'), j('data/market.json')]);
  if(!u||!pk) throw new Error('thiếu dữ liệu');
  ST.pack=pk; ST.market=mk;
  ST.date=(eod&&eod.date)||pk.date||''; ST.indices=(eod&&eod.indices)||[];
  ST.vn30=new Set(u.vn30||[]);
  for(const s of u.stocks){
    ST.map.set(s.sym,{ sym:s.sym, name:s.name, ex:s.ex, sector:s.sector||'Khác', parent:s.parent||'Khác',
      img:s.img||null, shares:s.shares||0, mcap:s.mcap||0,
      pe:s.pe==null?null:+s.pe, pb:s.pb==null?null:+s.pb, divY:s.divY==null?null:+s.divY,
      w:s.pct?s.pct.w:null, m:s.pct?s.pct.m:null, y:s.pct?s.pct.y:null,
      close:0,ref:0,vol:0,gtgd:0,chg:null,rpos:null,nnVal:0,ceil:0,floor:0,mcapLive:s.mcap||0 });
  }
  if(eod&&eod.data) for(const r of eod.data){
    const c=ST.map.get(r.sym); if(!c) continue;
    c.close=r.close||0; c.ref=r.ref||0; c.vol=r.vol||0; c.gtgd=r.gtgd||0;
    c.ceil=r.ceil||0; c.floor=r.floor||0;
    c.chg=c.ref>0&&c.close>0?(c.close-c.ref)/c.ref*100:null;
    c.rpos=(r.h>r.l)?(c.close-r.l)/(r.h-r.l):null;
    c.nnVal=((r.fBuy||0)-(r.fSell||0))*c.close;
    ST.nnBuy+=(r.fBuy||0)*c.close; ST.nnSell+=(r.fSell||0)*c.close;
    c.mcapLive=c.shares?c.shares*c.close:c.mcap;
  }
  const F=pk.f;
  for(const sym in pk.d){ const c=ST.map.get(sym); if(!c) continue;
    const a=pk.d[sym]; for(let i=0;i<F.length;i++) c[F[i]]=a[i]; }
  ST.list=Array.from(ST.map.values());
  ST.parents=Array.from(new Set(ST.list.map(c=>c.parent))).sort();
  ST.sectors=Array.from(new Set(ST.list.map(c=>c.sector))).sort();
  j('data/spark.json').then(sp=>{      // sparkline tải NỀN — không bắt người dùng chờ
    if(!sp||!sp.d) return;
    ST.spark=sp.d;
    const len=(sp.d[Object.keys(sp.d)[0]]||[]).length;
    ST.sparkT=(mk&&mk.t)?mk.t.slice(-len):[];
    drawSparks();
  });
  $('#fdate').textContent=ST.date||'—';
}
/* ---- GIÁ SỐNG trong phiên: radar không đi chậm hơn thị trường ----
   Mỗi 60s (tab hiện + 9-15h T2-T6) kéo bảng VPS, cập nhật close/chg/GTGD/NN/volr/rpos
   của từng mã rồi vẽ lại module đang mở. Ngoài giờ giữ số kho. */
function sessionOpenVN(){
  const vn=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Ho_Chi_Minh'}));
  const d=vn.getDay(), m=vn.getHours()*60+vn.getMinutes();
  return d>=1&&d<=5&&m>=540&&m<900;
}
let liveAt=0, livePolling=false;
/* áp bộ nhớ giá sống chung (do bong bóng/bảng giá/chính trang này ghi) — mở là có ngay */
const dayVN=()=>new Date(Date.now()+7*3600e3).toISOString().slice(0,10);
function applyLiveCache(){
  try{
    const j=JSON.parse(localStorage.getItem('cpvn_live')||'null');
    if(!j||!j.d||!j.sess||j.sess>dayVN()) return false;
    // đệm chỉ THẮNG khi mới hơn kho EOD (luật chung với core.js và bubbles.html).
    // Bản cũ đòi đệm phải đúng ngày HÔM NAY: sau 15h15 kho đã chốt vẫn bị đệm giữa
    // phiên đè lên, còn sáng hôm sau kho trễ một phiên thì lại vứt đệm sát hơn.
    if(!(j.sess>(ST.date||''))) return false;
    // ĐẾM TRƯỚC rồi mới ghi đè, kẻo đệm thiếu mã thì ST.map bị trộn nửa sống nửa kho
    let n=0,nnB=0,nnS=0;
    for(const sym in j.d) if(ST.map.get(sym)&&j.d[sym]&&j.d[sym][0]>0) n++;
    if(n<100) return false;
    for(const sym in j.d){
      const c=ST.map.get(sym); if(!c) continue;
      const [last,ref,vol,gtgd,fb,fs,hi,lo,ce,fl]=j.d[sym];
      if(!(last>0)) continue;
      c.close=last; if(ref>0){ c.ref=ref; c.chg=(last-ref)/ref*100; }
      if(vol>0){ c.vol=vol; c.gtgd=gtgd||c.gtgd;
        if(c.avgv20) c.volr=+(vol/c.avgv20).toFixed(2); }
      if(hi>lo&&last>0) c.rpos=(last-lo)/(hi-lo);
      if(ce>0) c.ceil=ce; if(fl>0) c.floor=fl;
      c.nnVal=((fb||0)-(fs||0))*last; nnB+=(fb||0)*last; nnS+=(fs||0)*last;
      c.mcapLive=c.shares?c.shares*last:c.mcapLive;
    }
    if(nnB||nnS){ ST.nnBuy=nnB; ST.nnSell=nnS; }
    if(j.idx&&j.idx.length) ST.indices=j.idx.map(x=>({name:x[0],value:x[1],chg:x[2]}));
    liveAt=j.at;
    return true;
  }catch(e){ return false; }
}
function saveLiveCache(){
  try{
    const d={};
    for(const c of ST.list){
      if(!(c.close>0)) continue;
      d[c.sym]=[c.close,c.ref||0,c.vol||0,Math.round(c.gtgd||0),
        c._fb||0,c._fs||0,c._hi||0,c._lo||0,c.ceil||0,c.floor||0];
    }
    const cur=JSON.parse(localStorage.getItem('cpvn_live')||'null');
    if(cur&&cur.at>=liveAt) return;
    localStorage.setItem('cpvn_live',JSON.stringify({at:liveAt, sess:dayVN(),
      idx:(ST.indices||[]).map(i=>[i.name,i.value,i.chg]), d}));
  }catch(e){}
}
const FORCE_LIVE=/[?&]forcelive/.test(location.search);   // cờ kiểm thử: poll cả khi tab ẩn
async function pollLive(){
  if(livePolling) return false; livePolling=true;
  try{
    const syms=[...ST.map.keys()], rows=[];
    for(let i=0;i<syms.length;i+=150){
      const arr=await fetch('https://bgapidatafeed.vps.com.vn/getliststockdata/'+syms.slice(i,i+150).join(','))
        .then(r=>r.json());
      for(const t of arr) rows.push(t);
    }
    const active=rows.filter(t=>((+t.lastPrice||0)>0)||((+t.lot||0)>0)).length;
    if(rows.length<50||active<rows.length*0.1) return false;   // bảng đêm rỗng -> giữ kho
    let nnB=0,nnS=0;
    for(const t of rows){
      const c=ST.map.get(t.sym); if(!c) continue;
      const last=(+t.lastPrice||0)*1000, ref=(+t.r||0)*1000;
      c.ceil=(+t.c||0)*1000; c.floor=(+t.f||0)*1000; if(ref>0) c.ref=ref;
      const vol=(+t.lot||0)*10;
      if(last>0){ c.close=last; c.chg=ref>0?(last-ref)/ref*100:c.chg; }
      if(vol>0){ c.vol=vol;
        const ave=(parseFloat(t.avePrice)||0)*1000;
        c.gtgd=(ave||last)*vol;
        if(c.avgv20) c.volr=+(vol/c.avgv20).toFixed(2);   // đột biến KL theo giá sống
      }
      const hi=(parseFloat(t.highPrice)||0)*1000, lo=(parseFloat(t.lowPrice)||0)*1000;
      if(hi>lo&&last>0) c.rpos=(last-lo)/(hi-lo);
      const fb=(parseFloat(t.fBVol)||0)*10, fs=(parseFloat(t.fSVolume)||0)*10;
      c._fb=fb; c._fs=fs; c._hi=(parseFloat(t.highPrice)||0)*1000; c._lo=(parseFloat(t.lowPrice)||0)*1000;
      if(last>0){ c.nnVal=(fb-fs)*last; nnB+=fb*last; nnS+=fs*last; }
      c.mcapLive=c.shares?c.shares*(last||c.close):c.mcapLive;
    }
    if(nnB||nnS){ ST.nnBuy=nnB; ST.nnSell=nnS; }
    try{   // chỉ số sống (VNINDEX/VN30/HNX/UPCOM) cho cột thông tin
      const IDX=[['10','VNINDEX'],['11','VN30'],['02','HNX'],['03','UPCOM']];
      const arr=await fetch('https://bgapidatafeed.vps.com.vn/getlistindexdetail/10,11,02,03').then(r=>r.json());
      const out=[];
      for(const d of arr||[]){
        const m=IDX.find(x=>x[0]===String(d.indexId||d.mc||'')); if(!m) continue;
        const v=+d.cIndex||0, o=+d.oIndex||0;
        if(v>0) out.push({name:m[1], value:v, chg:o>0?(v-o)/o*100:null});
      }
      if(out.length) ST.indices=out;
    }catch(e){}
    liveAt=Date.now();
    return true;
  }catch(e){ return false; }
  finally{ livePolling=false; }
}
function updateHeadChips(){
  const md=moodLive();
  const hm=$('#hMood');
  if(hm&&md!=null) hm.innerHTML='Nhịp đập <b style="color:'+moodCol(md)+'">'+Math.round(md)+'</b> · '+
    '<span style="color:'+moodCol(md)+';font-weight:700">'+moodWord(md)+'</span>';
  const hd=$('#hDate');
  if(hd) hd.innerHTML=liveAt>0
    ? 'trực tiếp <b>'+dayVN().split('-').reverse().join('/')+'</b>'
    : 'phiên <b>'+esc(ST.date)+'</b>';
}
function startLive(){
  const tick=async()=>{
    if((document.hidden&&!FORCE_LIVE)||!sessionOpenVN()) return;
    if(Date.now()-liveAt<55000) return;
    if(await pollLive()){
      updateHeadChips();
      if(cur==='radar') MODULES.find(x=>x.id==='radar').render();   // vẽ lại tại chỗ, KHÔNG cuộn
    }
  };
  tick();
  setInterval(tick,10000);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) tick(); });
}

function mood(){ const B=ST.market&&ST.market.breadth;
  return (B&&B.mood.length)?B.mood[B.mood.length-1]:null; }
/* Nhịp sợ hãi TRONG NƯỚC tính SỐNG trong phiên — cùng công thức build_screen:
   25% mã trên MA50 + 15% trên MA200 + 20% đỉnh/đáy 52T (3 thành phần này tính lại
   từ GIÁ ĐANG CHẠY so với MA/mốc của từng mã trong kho screen.json) + 15% dòng tiền
   20 phiên (thành phần chậm, lấy chốt gần nhất) + 25% quán tính (suy từ chốt gần nhất
   cộng biến động VNINDEX hôm nay). Chưa có giá sống -> dùng số chốt phiên trước. */
function moodLive(){
  const base=mood();
  if(!liveAt) return base;
  const B=ST.market&&ST.market.breadth;
  let n50=0,a50=0,n200=0,a200=0,nh=0,nl=0;
  for(const c of ST.list){
    if(!(c.close>0)) continue;
    if(c.ma50){ n50++; if(c.close>c.ma50) a50++; }
    if(c.ma200){ n200++; if(c.close>c.ma200) a200++; }
    if(c.hi52&&c.close>=c.hi52*0.999) nh++;
    if(c.lo52&&c.close<=c.lo52*1.001) nl++;
  }
  if(n50<100) return base;
  const c50=a50/n50*100, c200=n200?a200/n200*100:50;
  const hl=50+50*(nh-nl)/Math.max(1,nh+nl);
  const ud=B&&B.ud&&B.ud.length?B.ud[B.ud.length-1]:50;
  let mom=B&&B.mom&&B.mom.length?B.mom[B.mom.length-1]:50;
  const vni=(ST.indices||[]).find(i=>/VNINDEX/i.test(i.name));
  if(vni&&vni.chg!=null){
    const x=1+(mom-50)/1000;
    mom=50+clamp((x*(1+vni.chg/100)-1)*1000,-50,50);
  }
  return Math.round((.25*c50+.15*c200+.20*hl+.15*ud+.25*mom)*10)/10;
}
const moodWord=v=>v==null?'—':v>=75?'Hưng phấn':v>=60?'Lạc quan':v>=40?'Trung tính':v>=25?'Thận trọng':'Sợ hãi';
const moodCol=v=>v==null?'var(--mut)':v>=60?'var(--green)':v>=40?'var(--yellow)':v>=25?'#f97316':'var(--red)';
function marketStats(){
  let up=0,dn=0,fl=0,ce=0,fo=0,gtgd=0,ath=0,nh=0;
  for(const c of ST.list){
    if(c.ath===1&&c.close>0) ath++;
    if(c.dhi!=null&&c.dhi>=-1&&(c.avgval20||0)>=5e8) nh++;
    if(!c.vol) continue;
    gtgd+=c.gtgd;
    if(!c.nt&&c.ceil&&c.close>=c.ceil) ce++; else if(!c.nt&&c.floor&&c.close<=c.floor) fo++;
    if(c.chg>0.01) up++; else if(c.chg<-0.01) dn++; else fl++;
  }
  return {up,dn,fl,ce,fo,gtgd,ath,nh};
}
function sectorPerf(){
  const G={};
  for(const c of ST.list){ const g=G[c.parent]=G[c.parent]||{cap:0,d:0};
    const cap=c.mcapLive||c.mcap||0; g.cap+=cap; if(c.chg!=null) g.d+=c.chg*cap; }
  return Object.keys(G).map(k=>({k,d:G[k].cap?G[k].d/G[k].cap:0})).sort((a,b)=>b.d-a.d);
}

/* ---------------------------------------------------------------- đăng ký */
const MODULES=[
  {id:'radar', ic:'📡', name:'Radar phiên', tag:'',
   meta:[], render:renderRadar},
  {id:'race', ic:'🏁', name:'Đường đua vốn hoá', tag:'6,5 năm thị trường chạy lại trong 30 giây — bảng xếp hạng vốn hoá đổi ngôi theo từng tháng.',
   meta:[], render:renderRace},
];
let cur=null; const done={};
const PATHOF={radar:'/radar',race:'/duongdua'};
const TITLEOF={radar:'Radar phiên',race:'Đường đua vốn hoá'};
function renderNav(){
  $$('.tabs a[data-m]').forEach(e=>{
    e.classList.toggle('on',e.dataset.m===cur);
    if(!e._b){ e._b=1; e.onclick=ev=>{ ev.preventDefault(); showMod(e.dataset.m); }; }
  });
}
function head(m){
  return '<div class="mhead"><span class="eyebrow">CPVN.IO — công cụ thị trường</span>'+
    '<h1>'+m.ic+' '+m.name+'</h1>'+(m.tag?'<p>'+esc(m.tag)+'</p>':'')+
    (m.meta.length?'<div class="mmeta">'+m.meta.map(t=>'<span class="tagc '+(t[1]||'')+'">'+t[0]+'</span>').join('')+'</div>':'')+'</div>';
}
function showMod(id){
  const m=MODULES.find(x=>x.id===id); if(!m) return;
  cur=id; renderNav();
  MODULES.forEach(x=>{ const el=$('#m-'+x.id); if(el) el.classList.toggle('on',x.id===id); });
  if(!done[id]){ done[id]=1; m.render(); }
  if(m.after) m.after();
  document.title='CPVN — '+TITLEOF[id];
  if(!/\.html$/i.test(location.pathname)) history.replaceState(null,'',PATHOF[id]);
  else history.replaceState(null,'','congcu.html?m='+id);
  scrollTo({top:0,behavior:'smooth'});
}

/* ============================================================ 1. RADAR PHIÊN */
function row(c,metric,mcls){
  // KỊCH TRẦN: cả dòng TÍM (mã, đồ thị, giá, chỉ số) · KỊCH SÀN: cả dòng XANH LƠ — như bảng điện
  const ce=!c.nt&&c.ceil>0&&c.close>0&&c.close>=c.ceil, fo=!c.nt&&c.floor>0&&c.close>0&&c.close<=c.floor;
  const pcls=ce?'ce':fo?'fo':cls(c.chg);
  const sym=ce?'<b class="ce">'+c.sym+'</b>':fo?'<b class="fo">'+c.sym+'</b>':'<b>'+c.sym+'</b>';
  const spark=ce?'#c026d3':fo?'#0ea5e9':'';
  return '<div class="rw" data-sym="'+c.sym+'" title="Bấm mở trang '+c.sym+'">'+logoHTML(c)+
    '<span class="idn">'+sym+'<i>'+esc(shortName(c.name))+'</i></span>'+
    '<canvas class="rs" data-s="'+c.sym+'"'+(spark?' data-col="'+spark+'"':'')+'></canvas>'+
    '<span class="pz '+pcls+'">'+num(c.close)+'</span>'+
    '<span class="mt '+(ce?'ce':fo?'fo':(mcls||''))+'">'+metric+'</span></div>';
}
function radarCard(ic,title,rows,id){
  return '<div class="panel" id="rc-'+id+'"><div class="ph"><span>'+ic+'</span>'+title+
    '<span class="cnt">'+rows.length+'</span>'+
    '<button class="shotbtn" title="Chụp thẻ này" onclick="LB.shotCard(\''+id+'\',\''+id+'\')">📷</button></div>'+
    '<div class="pb">'+(rows.length?rows.join(''):'<div class="empty">Phiên này không có mã nào thoả</div>')+'</div></div>';
}
LB.shotCard=(el,name)=>shot($('#rc-'+el),'cpvn-'+name+'-'+ST.date);
function sectionHead(id,t){ return '<div class="secthead" id="'+id+'">'+t+'</div>'; }
/* bảng ngành hôm nay: 1D% bình quân theo vốn hoá + độ rộng trong ngành */
function sectorPanel(){
  const G={};
  for(const c of ST.list){ if(!(c.close>0)) continue;
    const g=G[c.parent]=G[c.parent]||{cap:0,d:0,up:0,dn:0,n:0};
    const cap=c.mcapLive||c.mcap||0; g.cap+=cap; g.n++;
    if(c.chg!=null){ g.d+=c.chg*cap; if(c.chg>0.01)g.up++; else if(c.chg<-0.01)g.dn++; } }
  const rows=Object.keys(G).map(k=>({k,d:G[k].cap?G[k].d/G[k].cap:0,up:G[k].up,dn:G[k].dn,n:G[k].n}))
    .sort((a,b)=>b.d-a.d);
  const mx=Math.max.apply(null,rows.map(r=>Math.abs(r.d)))||1;
  return '<div class="panel"><div class="ph">Hiệu suất 1 ngày, bình quân theo vốn hoá'+
    '<span class="cnt">'+rows.length+' nhóm</span>'+
    '<button class="shotbtn" onclick="LB.shotSec()" title="Chụp bảng ngành">📷</button></div>'+
    '<div class="pb" style="padding:10px 16px" id="secPanel">'+rows.map(r=>{
      const w=Math.abs(r.d)/mx*50;
      return '<div class="secrow"><span class="sn">'+esc(r.k)+'</span>'+
        '<span class="sbr"><i class="z"></i><i class="b '+(r.d>=0?'pos':'neg')+'" style="width:'+w+'%"></i></span>'+
        '<span class="sp '+cls(r.d)+'">'+pct(r.d)+'</span>'+
        '<span class="sc"><b class="up">▲'+r.up+'</b> <b class="dn">▼'+r.dn+'</b> <span style="color:var(--faint)">/'+r.n+'</span></span></div>';
    }).join('')+'</div></div>';
}
LB.shotSec=()=>shot($('#secPanel'),'cpvn-nganh-'+ST.date);
function renderRadar(){
  const m=MODULES.find(x=>x.id==='radar');
  const L=ST.list, liq=c=>(c.avgval20||0);
  const top=(f,s,n)=>L.filter(c=>c.close>0).filter(f).sort(s).slice(0,n||5);
  const md=moodLive(), s=marketStats(), tot=Math.max(1,s.up+s.dn+s.fl);

  /* trần — sàn gộp 1 thẻ: ưu tiên mã thanh khoản cao */
  function ceflRows(){
    const ces=L.filter(c=>!c.nt&&c.close>0&&c.ceil>0&&c.close>=c.ceil).sort((a,b)=>b.gtgd-a.gtgd);
    const fls=L.filter(c=>c.close>0&&c.floor>0&&c.close<=c.floor).sort((a,b)=>b.gtgd-a.gtgd);
    const a=ces.slice(0,3).map(c=>row(c,'TRẦN','ce'));
    return a.concat(fls.slice(0,6-a.length).map(c=>row(c,'SÀN','fo'))).slice(0,6);
  }

  const flow=[
    radarCard('🔥','Đột biến khối lượng',
      top(c=>c.volr>=2&&c.chg>0&&liq(c)>=2e9,(a,b)=>b.volr-a.volr).map(c=>row(c,'×'+fx(c.volr,1)+' KL','up')),'vol'),
    radarCard('💧','Vua thanh khoản phiên',
      top(c=>c.gtgd>0,(a,b)=>b.gtgd-a.gtgd).map(c=>row(c,ty(c.gtgd),'')),'liq'),
    radarCard('🎯','Đóng cửa ở đỉnh phiên',
      top(c=>c.rpos!=null&&c.rpos>=.92&&c.chg>=1.5&&c.gtgd>=3e9,(a,b)=>b.chg-a.chg).map(c=>row(c,pct(c.chg),'up')),'top'),
    radarCard('🌊','Khối ngoại mua ròng phiên',
      top(c=>c.nnVal>0,(a,b)=>b.nnVal-a.nnVal).map(c=>row(c,'+'+ty(c.nnVal),'up')),'nnb'),
    radarCard('🩸','Khối ngoại bán ròng phiên',
      top(c=>c.nnVal<0,(a,b)=>a.nnVal-b.nnVal).map(c=>row(c,'−'+ty(-c.nnVal),'dn')),'nns'),
    radarCard('🧲','Khối ngoại gom 30 phiên',
      top(c=>(c.nn20||0)>0,(a,b)=>b.nn20-a.nn20).map(c=>row(c,'+'+ty(c.nn20),'up')),'nng'),
  ];
  const power=[
    radarCard('🏔️','Vượt / sát đỉnh 52 tuần',
      top(c=>c.dhi!=null&&c.dhi>=-3&&liq(c)>=5e8,(a,b)=>b.dhi-a.dhi).map(c=>row(c,c.dhi>=-0.05?'đỉnh 52T':fx(c.dhi,1)+'%','up')),'hi52'),
    radarCard('👑','Lập đỉnh lịch sử hôm nay',
      top(c=>c.ath===1&&liq(c)>=5e8,(a,b)=>(b.mcapLive||0)-(a.mcapLive||0)).map(c=>row(c,vnd(c.mcapLive),'up')),'ath'),
    radarCard('⚡','Cắt lên MA50 (10 phiên)',
      top(c=>c.cross===1&&liq(c)>=1e9,(a,b)=>(b.rs||0)-(a.rs||0)).map(c=>row(c,'RS '+(c.rs||'—'),c.rs>=70?'up':'')),'ma50'),
    radarCard('🏆','RS Rating dẫn đầu',
      top(c=>c.rs>=93&&liq(c)>=3e9,(a,b)=>(b.rs||0)-(a.rs||0)).map(c=>row(c,'RS '+c.rs,'up')),'rs'),
    radarCard('🔗','Chuỗi tăng đang chạy',
      top(c=>c.streak>=4&&liq(c)>=5e8,(a,b)=>b.streak-a.streak).map(c=>row(c,'+'+c.streak+' phiên','up')),'stku'),
    radarCard('🟣','Kịch trần — kịch sàn',ceflRows(),'cefl'),
  ];
  const risk=[
    radarCard('🧊','Quá bán đang hồi',
      top(c=>c.rsi!=null&&c.rsi<=35&&c.chg>0&&liq(c)>=1e9,(a,b)=>a.rsi-b.rsi).map(c=>row(c,'RSI '+fx(c.rsi,0),'fo')),'rsi'),
    radarCard('🌡️','Quá mua (RSI ≥ 75)',
      top(c=>c.rsi>=75&&liq(c)>=1e9,(a,b)=>b.rsi-a.rsi).map(c=>row(c,'RSI '+fx(c.rsi,0),'dn')),'rsih'),
    radarCard('🕳️','Chạm / thủng đáy 52 tuần',
      top(c=>c.dlo!=null&&c.dlo<=1.5&&liq(c)>=5e8,(a,b)=>a.dlo-b.dlo).map(c=>row(c,c.dlo<=0.05?'đáy 52T':'+'+fx(c.dlo,1)+'% đáy','dn')),'lo52'),
    radarCard('⛓️','Chuỗi giảm đang chạy',
      top(c=>c.streak<=-4&&liq(c)>=5e8,(a,b)=>a.streak-b.streak).map(c=>row(c,c.streak+' phiên','dn')),'stkd'),
    radarCard('🔻','Cắt xuống MA50 (10 phiên)',
      top(c=>c.cross===-1&&liq(c)>=1e9,(a,b)=>(a.rs||99)-(b.rs||99)).map(c=>row(c,'RS '+(c.rs||'—'),'dn')),'ma50d'),
    radarCard('💤','Thanh khoản rất thấp',
      top(c=>c.vol>0&&liq(c)>0&&liq(c)<3e8,(a,b)=>a.avgval20-b.avgval20).map(c=>row(c,ty(c.avgval20),'')),'illq'),
  ];

  const G=ST.market&&ST.market.global;
  const vni=(ST.indices||[]).find(i=>/VNINDEX/i.test(i.name));
  const nnNet=ST.nnBuy-ST.nnSell;
  const infoRow=(k,v,cls2)=>'<div class="rrRow"><span>'+k+'</span>'+
    '<b class="bdg '+(cls2||'')+'">'+v+'</b></div>';
  $('#m-radar').innerHTML=head(m)
    +'<div class="hero h3c">'
    +'<div class="panel mood"><div class="big" style="color:'+moodCol(md)+'">'+(md==null?'—':Math.round(md))+'<small>/100</small></div>'
    +'<div class="word" style="color:'+moodCol(md)+'">'+moodWord(md)+'</div>'
    +'<div class="sub">nhịp sợ hãi thị trường TRONG NƯỚC</div>'
    +'<div class="bbar"><i style="width:'+(s.up/tot*100)+'%;background:var(--green)"></i>'
    +'<i style="width:'+(s.fl/tot*100)+'%;background:var(--yellow)"></i>'
    +'<i style="width:'+(s.dn/tot*100)+'%;background:var(--red)"></i></div>'
    +'<div class="sub">▲'+s.up+' · –'+s.fl+' · ▼'+s.dn+' trên '+ST.list.length.toLocaleString('en-US')+' mã</div></div>'
    +'<div class="panel mood">'+(G
      ?'<div class="big" style="color:'+moodCol(G.v)+'">'+G.v+'<small>/100</small></div>'
      +'<div class="word" style="color:'+moodCol(G.v)+'">'+moodWord(G.v)+'</div>'
      +'<div class="sub">nhịp sợ hãi thị trường TOÀN CẦU</div>'
      +'<div class="sub" style="margin-top:5px;opacity:.75">'+esc(G.src||'')+'</div>'
      :'<div class="sub">Chưa có số liệu toàn cầu</div>')+'</div>'
    +'<div class="panel mood rrInfo">'
    +(vni?infoRow('VNINDEX',(+vni.value).toLocaleString('en-US',{maximumFractionDigits:2})
        +' · '+pct(vni.chg), vni.chg>0.005?'bUp':vni.chg<-0.005?'bDn':'bFl'):'')
    +infoRow('Thanh khoản ngày',ty(s.gtgd),'bGold')
    +infoRow('Khối ngoại mua ròng',(nnNet>=0?'+':'−')+ty(Math.abs(nnNet)),nnNet>=0?'bUp':'bDn')
    +'</div>'
    +'</div>'
    +'<div id="radarAll">'
    +sectionHead('r-flow','💰 Dòng tiền trong phiên')+'<div class="grid g3">'+flow.join('')+'</div>'
    +sectionHead('r-power','🚀 Sức mạnh giá')+'<div class="grid g3">'+power.join('')+'</div>'
    +sectionHead('r-risk','⚠️ Mặt tối của phiên')+'<div class="grid g3">'+risk.join('')+'</div>'
    +sectionHead('r-sec','🏭 Nhóm ngành hôm nay')+sectorPanel()
    +'</div>';
  drawSparks($('#m-radar'));
}

/* ======================================================== 4. ĐƯỜNG ĐUA VỐN HOÁ */
const RA={f:0,playing:false,speed:1,curY:{},imgs:{},data:null,raf:null,last:0,sector:null,
  settling:false,maxDelta:0,mode:'race',dcaMx:0};
function raceData(){
  if(RA.data) return RA.data;
  const R=ST.market&&ST.market.race; if(!R) return null;
  const series={};
  for(const sym in R.series){
    const src=R.series[sym], out=[]; let lastv=null;
    for(const v of src){ if(v!=null) lastv=v; out.push(lastv); }
    if(out.some(v=>v!=null)) series[sym]=out;
  }
  const syms=Object.keys(series);
  const COL=['#2dd4bf','#f43f5e','#f5b40a','#38bdf8','#a78bfa','#16c784','#fb923c','#e879f9',
             '#4ade80','#60a5fa','#f87171','#facc15','#34d399','#c084fc','#fbbf24','#22d3ee'];
  const cols={}; syms.forEach((s,i)=>cols[s]=COL[i%COL.length]);
  RA.data={labels:R.labels,series,syms,cols,note:R.note};
  return RA.data;
}
function raceFmt(v){ if(v==null) return '—';   // v tính bằng NGHÌN TỶ -> quy về tỷ
  return Math.round(v*1000).toLocaleString('en-US')+' tỷ'; }
/* DẤU THƯƠNG HIỆU mờ chính giữa canvas — ai quay màn hình cũng mang theo CPVN.IO.
   Ảnh nạp một lần; về sau khi canvas đã vẽ xong thì vẽ lại một lượt. */
const BRAND=new Image(); let brandOK=false;
BRAND.onload=()=>{ brandOK=true; if(cur==='race') curDraw(); };
BRAND.src='assets/logo-128.png?v=3';
function brandMark(x,W,H){
  x.save(); x.textBaseline='middle';
  const a=isLight()?0.09:0.11, s=clamp(W*0.055,20,30);
  x.font='800 '+s+'px system-ui';
  const tw=x.measureText('CPVN.IO').width;
  const lg=brandOK?s*1.4:0, gap=lg?s*0.3:0, x0=(W-(lg+gap+tw))/2, cy=H/2;
  if(lg){ x.globalAlpha=a+0.05; x.drawImage(BRAND,x0,cy-lg/2,lg,lg); }
  x.globalAlpha=a; x.fillStyle=isLight()?'#101321':'#ecedf4';
  x.textAlign='left'; x.fillText('CPVN.IO',x0+lg+gap,cy);
  x.restore();
}
function curDraw(l){ if(RA.mode==='dca') drawDCA(l); else drawRace(l); }
/* mốc cuối của dòng thời gian theo chế độ: đua = cả chuỗi; bền vững = từ tháng chọn */
function raceEnd(){ const D=raceData(); if(!D) return 0;
  const L=D.labels.length;
  return RA.mode==='dca'?Math.max(0,L-1-clamp(DCA.from,0,L-1)):L-1; }
function drawRace(lerp){
  const cv=$('#cvRace'); if(!cv) return;
  const D=raceData(); if(!D) return;
  const W=cv.clientWidth||900, H=cv.clientHeight||520, x=dpr(cv,W,H);
  const L=D.labels.length, f=clamp(RA.f,0,L-1);
  const i0=Math.floor(f), i1=Math.min(L-1,i0+1), tt=f-i0;
  const val=s=>{ const a=D.series[s][i0], b=D.series[s][i1];
    if(a==null&&b==null) return null; if(a==null) return b; if(b==null) return a;
    return a+(b-a)*tt; };
  let pool=D.syms;
  if(RA.sector) pool=pool.filter(s=>{ const c=ST.map.get(s); return c&&c.sector===RA.sector; });
  const rows2=pool.map(s=>({s,v:val(s)})).filter(r=>r.v!=null&&r.v>0)
    .sort((a,b)=>b.v-a.v).slice(0,10);          // tối đa 10 công ty trong cuộc đua
  if(!rows2.length){ x.fillStyle=isLight()?'#5d6272':'#9092a3'; x.font='13px system-ui';
    x.textAlign='center'; x.fillText('Ngành này chưa đủ dữ liệu đua',W/2,H/2); return; }
  for(const r of rows2) if(RA.imgs[r.s]===undefined){ const im=new Image();
    im.onerror=()=>{ RA.imgs[r.s]=null; }; im.src='assets/logo/'+r.s+'.webp'; RA.imgs[r.s]=im; }
  const mx=rows2[0].v*1.06;
  /* MÀN HẸP (điện thoại dọc): logo+mã thu nhỏ để nhường đường đua cho thanh vốn hoá,
     con số vốn hoá in ĐẬM bám cuối thanh (hết chỗ thì nằm trong thanh) — nổi hơn hẳn. */
  const mob=W<560;
  const logoR=mob?8:12, labX=mob?60:118, barX=labX+(mob?6:10);
  const barW=W-barX-(mob?12:130);
  const top=16, rowH=(H-top-(mob?38:46))/10;
  let md=0;                                     // độ lệch lớn nhất còn lại (cho pha xếp hàng)
  const K=lerp==null?.18:lerp;
  rows2.forEach((r,rank)=>{
    const ty2=top+rank*rowH;
    if(RA.curY[r.s]==null) RA.curY[r.s]=ty2;
    RA.curY[r.s]+=(ty2-RA.curY[r.s])*K;
    md=Math.max(md,Math.abs(ty2-RA.curY[r.s]));
  });
  RA.maxDelta=md;
  for(const r of rows2){
    const y=RA.curY[r.s], col=D.cols[r.s];
    const bw=Math.max(2,r.v/mx*barW), bh=rowH*.66;
    x.fillStyle=col+'26'; x.beginPath(); x.roundRect(barX,y+rowH*.14,bw,bh,8); x.fill();
    x.fillStyle=col; x.beginPath(); x.roundRect(barX,y+rowH*.14,Math.min(bw,5),bh,2); x.fill();
    x.globalAlpha=.92; x.fillStyle=col;
    x.beginPath(); x.roundRect(barX,y+rowH*.14,bw,bh,8); x.globalAlpha=.32; x.fill(); x.globalAlpha=1;
    const im=RA.imgs[r.s];
    if(im&&im.complete&&im.naturalWidth){
      const lcx=mob?14:labX-72;
      x.save(); x.beginPath(); x.arc(lcx,y+rowH*.5,logoR,0,7); x.closePath();
      x.fillStyle='#fff'; x.fill(); x.clip();
      x.drawImage(im,lcx-logoR,y+rowH*.5-logoR,logoR*2,logoR*2); x.restore();
    }
    x.fillStyle=isLight()?'#101321':'#ecedf4';
    x.font=mob?'800 11.5px system-ui':'800 14px system-ui';
    x.textAlign='left'; x.textBaseline='middle';
    x.fillText(r.s,mob?26:labX-52,y+rowH*.5);
    const vt=raceFmt(r.v);
    x.font=mob?'800 11.5px system-ui':'700 12.5px system-ui';
    if(mob&&bw+8+x.measureText(vt).width>barW){   // thanh dài kịch khung -> số vào TRONG thanh
      x.textAlign='right'; x.fillStyle=isLight()?'#101321':'#fff';
      x.fillText(vt,barX+bw-7,y+rowH*.5); x.textAlign='left';
    }else{
      x.fillStyle=mob?(isLight()?'#101321':'#ecedf4'):(isLight()?'#5d6272':'#9092a3');
      x.fillText(vt,barX+bw+(mob?7:10),y+rowH*.5);
    }
  }
  x.fillStyle=isLight()?'rgba(16,19,33,.14)':'rgba(255,255,255,.1)';
  x.font=mob?'900 34px system-ui':'900 54px system-ui';
  x.textAlign='right'; x.textBaseline='alphabetic';
  x.fillText(D.labels[Math.round(f)],W-(mob?12:18),H-(mob?12:18));
  if(!mob){                                     // màn hẹp bỏ ghi chú, nhường chỗ cho đường đua
    x.fillStyle=isLight()?'#9aa0af':'#5d5f70'; x.font='10.5px system-ui'; x.textAlign='left';
    x.fillText('Vốn hoá quy ước: số cổ phiếu HIỆN TẠI × giá tháng đó',14,H-10);
  }
  brandMark(x,W,H);
}
/* CÁN ĐÍCH XONG XẾP HÀNG: các hàng đang bay dở tiếp tục trườn về đúng vị trí rồi
   khoá thẳng hàng — trước đây dừng vẽ ngay tại đích nên logo đè lên nhau. */
function settleRace(){
  if(RA.settling) return; RA.settling=true;
  const step=()=>{
    if(RA.playing){ RA.settling=false; return; }   // người dùng bấm chạy tiếp -> nhường
    curDraw();
    if(RA.maxDelta>0.4) requestAnimationFrame(step);
    else{ RA.settling=false; curDraw(1); }         // khung cuối: khoá đúng hàng
  };
  requestAnimationFrame(step);
}
function raceTick(ts){
  if(!RA.playing) return;
  if(!RA.last) RA.last=ts;
  const dt=(ts-RA.last)/1000; RA.last=ts;
  const D=raceData(); if(!D) return;
  const end=raceEnd();
  RA.f+=dt*2.2*RA.speed;
  if(RA.f>=end){ RA.f=end; RA.playing=false;
    const b=$('#raPlay');
    if(b){ b.dataset.t='again';
      b.textContent=innerWidth<=640?'▶':'▶ Chạy lại'; } }
  const sl=$('#raSlide'); if(sl) sl.value=RA.f;
  curDraw();
  if(RA.playing) RA.raf=requestAnimationFrame(raceTick);
  else settleRace();                              // hết đua -> xếp hàng thẳng lối rồi mới đứng im
}
/* ---- ĐẦU TƯ ĐỀU ĐẶN (DCA): bỏ X triệu mỗi tháng từ tháng đã chọn tới nay ----
   Dùng CHÍNH chuỗi race (mcap = giá tháng đó × SLCP hiện tại): tỉ lệ giữa các tháng
   đúng bằng tỉ lệ giá nên giá trị DCA = X × Σ(v_cuối / v_tháng-mua). */
const DCA={amt:5,from:0,sec:null,calc:null};
function dcaFmt(v){ // v tính bằng TRIỆU đồng
  if(v>=1000) return (v/1000).toLocaleString('en-US',{maximumFractionDigits:v>=10000?1:2})+' tỷ';
  return Math.round(v).toLocaleString('en-US')+' triệu';
}
/* chuỗi giá trị DCA THEO TỪNG THÁNG của mọi mã đạt điều kiện — tính MỘT lần mỗi khi
   đổi tham số, biểu đồ và bảng xếp hạng cùng đọc. vals[k] = giá trị tại tháng i0+k
   = X × v_k × Σ(1/v_j, j=i0..k). Đòi có giá NGAY tháng bắt đầu, đứt tháng nào loại. */
function dcaAll(){
  if(DCA.calc) return DCA.calc;
  const D=raceData(); if(!D) return null;
  const L=D.labels.length, i0=clamp(DCA.from,0,L-1), amt=+DCA.amt||0;
  let pool=D.syms;
  if(DCA.sec) pool=pool.filter(s=>{ const c=ST.map.get(s); return c&&c.sector===DCA.sec; });
  const rows=[];
  for(const s of pool){
    const a=D.series[s];
    if(a[i0]==null) continue;
    let acc=0, ok=true; const vals=[];
    for(let i=i0;i<L;i++){ const v=a[i]; if(!(v>0)){ ok=false; break; }
      acc+=1/v; vals.push(amt*acc*v); }
    if(ok) rows.push({s,vals,fin:vals[vals.length-1]});
  }
  rows.sort((a,b)=>b.fin-a.fin);
  DCA.calc={rows,n:L-i0,i0,amt};
  return DCA.calc;
}
function renderDCA(){
  const D=raceData(), box=$('#dcaOut'); if(!D||!box) return;
  const C2=dcaAll(); if(!C2) return;
  const n=C2.n, amt=C2.amt, cost=amt*n, rows=C2.rows.map(r=>({s:r.s,val:r.fin}));
  const sum=$('#dcaSum');
  if(sum) sum.innerHTML=amt>0?'bỏ <b>'+dcaFmt(amt)+'</b>/tháng × '+n+' tháng = vốn <b>'+dcaFmt(cost)+'</b>':'';
  if(!(amt>0)){ box.innerHTML='<div class="empty">Nhập số tiền bỏ vào mỗi tháng</div>'; return; }
  const top=rows.slice(0,12), mxv=top.length?top[0].val:1;
  box.innerHTML=top.length?top.map(r=>{
    const c=ST.map.get(r.s)||{sym:r.s,name:'',img:null};
    const p=cost>0?(r.val/cost-1)*100:null, up=p!=null&&p>=0;
    const pc=p==null?'':(p>=0?'+':'')+(Math.abs(p)>=1000?Math.round(p).toLocaleString('en-US'):p.toFixed(0))+'%';
    return '<div class="dcarow" data-sym="'+r.s+'" title="Bấm mở trang '+r.s+'">'+logoHTML(c)
      +'<span class="idn"><b>'+r.s+'</b><i>'+esc(shortName(c.name||''))+'</i></span>'
      +'<span class="dbar"><i style="width:'+(r.val/mxv*100).toFixed(1)+'%;background:'
      +(up?'linear-gradient(90deg,rgba(22,199,132,.45),var(--green))':'linear-gradient(90deg,rgba(234,57,67,.45),var(--red))')
      +'"></i></span>'
      +'<span class="dval">'+dcaFmt(r.val)+'<b class="'+(up?'up':'dn')+'">'+pc+'</b></span></div>';
  }).join(''):'<div class="empty">Nhóm này không có mã nào đủ dữ liệu từ tháng đã chọn</div>';
}
/* BIỂU ĐỒ ĐẦU TƯ BỀN VỮNG: trục dọc = số tiền, trục ngang = thời gian, chạy từng
   tháng như đường đua. Mỗi mã một đường, nhãn mã bám đầu đường; thêm đường đứt
   "vốn đã bỏ" để thấy ngay lãi/lỗ. Trục co giãn mượt theo giá trị lớn nhất đã hiện. */
function drawDCA(lerp){
  const cv=$('#cvDca'); if(!cv) return;
  const D=raceData(), C2=dcaAll(); if(!D||!C2) return;
  const W=cv.clientWidth||900, H=cv.clientHeight||520, x=dpr(cv,W,H);
  const mob=W<560, TXTC=isLight()?'#101321':'#ecedf4', MUTC=isLight()?'#5d6272':'#9092a3';
  const rows=C2.rows.slice(0,8);                 // 8 đường là trần đọc được
  if(!rows.length||!(C2.amt>0)){
    x.fillStyle=MUTC; x.font='13px system-ui'; x.textAlign='center';
    x.fillText(C2.amt>0?'Nhóm này không có mã nào đủ dữ liệu từ tháng đã chọn':'Nhập số tiền bỏ vào mỗi tháng',W/2,H/2);
    return;
  }
  for(const r of rows) if(RA.imgs[r.s]===undefined){ const im=new Image();
    im.onerror=()=>{ RA.imgs[r.s]=null; }; im.src='assets/logo/'+r.s+'.webp'; RA.imgs[r.s]=im; }
  const n=C2.n, f=clamp(RA.f,0,n-1);
  const iA=Math.floor(f), iB=Math.min(n-1,iA+1), tt=f-iA;
  const cur=a=>a[iA]+((a[iB]!=null?a[iB]:a[iA])-a[iA])*tt;
  /* ĐỐI THỦ NGÂN HÀNG: gửi X mỗi tháng, lãi 7%/năm ghép theo tháng (r=7%/12).
     Khoản gửi tháng j hưởng (k-j) tháng lãi -> tổng tại tháng k = X·((1+r)^(k+1)-1)/r.
     Cùng quy ước với cổ phiếu: khoản tháng này chưa kịp sinh lời. */
  const rB=0.07/12, bank=k=>C2.amt*((Math.pow(1+rB,k+1)-1)/rB);
  const padL=mob?10:14, padR=mob?110:172, padT=20, padB=30;
  const plotW=W-padL-padR, plotH=H-padT-padB;
  const xmax=Math.max(f,6);                      // trục ngang nở dần theo cuộc chạy
  const X=i=>padL+i/xmax*plotW;
  // đỉnh trục tiền: giá trị lớn nhất ĐÃ HIỆN (mã, ngân hàng, vốn), co giãn mượt
  let mx=Math.max(C2.amt*(iB+1),bank(iB));
  for(const r of rows) for(let i=0;i<=iB;i++) if(r.vals[i]>mx) mx=r.vals[i];
  mx*=1.08;
  const K=lerp==null?.18:lerp;
  if(!(RA.dcaMx>0)) RA.dcaMx=mx;
  RA.dcaMx+=(mx-RA.dcaMx)*K;
  RA.maxDelta=Math.abs(mx-RA.dcaMx)/mx*plotH;    // quy về px cho pha xếp hàng dùng chung
  const Y=v=>padT+plotH-(v/RA.dcaMx)*plotH;
  // lưới tiền 4 vạch, nhãn nép phải trong vùng vẽ
  x.font='10.5px system-ui'; x.textBaseline='middle';
  x.strokeStyle=isLight()?'rgba(15,23,42,.08)':'rgba(255,255,255,.07)';
  for(let k=1;k<=4;k++){
    const v=RA.dcaMx*k/4, yy=Y(v);
    x.beginPath(); x.moveTo(padL,yy); x.lineTo(padL+plotW,yy); x.stroke();
    x.fillStyle=MUTC; x.textAlign='right'; x.fillText(dcaFmt(v),padL+plotW-4,yy-8);
  }
  // mốc thời gian dưới đáy
  const stepT=Math.max(1,Math.ceil(xmax/(mob?4:7)));
  x.textAlign='center'; x.fillStyle=MUTC;
  for(let i=0;i<=Math.min(Math.ceil(f),n-1);i+=stepT)
    x.fillText(D.labels[C2.i0+i],X(i),H-12);
  brandMark(x,W,H);                              // dấu thương hiệu dưới các đường
  // tháng hiện tại to mờ + HUD "đã bỏ bao nhiêu" — nhìn phát biết ngay vốn theo từng tháng
  x.fillStyle=isLight()?'rgba(16,19,33,.12)':'rgba(255,255,255,.09)';
  x.font=mob?'900 30px system-ui':'900 44px system-ui'; x.textAlign='left';
  x.fillText(D.labels[C2.i0+Math.round(f)],padL+6,padT+(mob?22:30));
  const soThang=Math.floor(f)+1, von=C2.amt*soThang;
  x.fillStyle=TXTC; x.font=mob?'800 15px system-ui':'800 20px system-ui';
  x.fillText('đã bỏ '+dcaFmt(von),padL+8,padT+(mob?48:66));
  x.fillStyle=MUTC; x.font=mob?'700 10.5px system-ui':'700 12px system-ui';
  x.fillText(soThang+' tháng × '+dcaFmt(C2.amt),padL+8,padT+(mob?64:86));
  // đường VỐN ĐÃ BỎ (đứt nét) — mốc so lãi/lỗ
  x.strokeStyle=MUTC; x.setLineDash([5,4]); x.lineWidth=1.2; x.beginPath();
  for(let i=0;i<=iA;i++){ const p=[X(i),Y(C2.amt*(i+1))]; i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]); }
  x.lineTo(X(f),Y(C2.amt*(f+1))); x.stroke(); x.setLineDash([]);
  /* CÁC ĐƯỜNG: mỗi đường có VIỀN NỀN lót dưới rồi mới tô màu — chỗ cắt nhau vẫn
     tách bạch chứ không hoà thành mớ; nét 2.6 thay 2. Bảng màu RIÊNG gán theo
     THỨ HẠNG nên 8 đường luôn tương phản mạnh, không trùng tông; màu vàng dành
     riêng cho ngân hàng. */
  const GOLD='#f5b40a';
  const HALO=isLight()?'rgba(255,255,255,.95)':'rgba(9,9,15,.92)';
  const vien=(pts,col,w)=>{
    x.lineJoin='round'; x.lineCap='round';
    for(const cw of [[HALO,w+2.8],[col,w]]){
      x.strokeStyle=cw[0]; x.lineWidth=cw[1]; x.beginPath();
      pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));
      x.stroke();
    }
  };
  const ptsOf=g=>{ const a2=[]; for(let i=0;i<=iA;i++) a2.push([X(i),Y(g(i))]); return a2; };
  // ngân hàng vẽ TRƯỚC (nó là mốc so sánh, nằm dưới các mã)
  const bPts=ptsOf(bank); bPts.push([X(f),Y(bank(f))]);
  vien(bPts,GOLD,2.6);
  const PAL=['#f43f5e','#38bdf8','#16c784','#a78bfa','#fb923c','#2dd4bf','#e879f9','#60a5fa'];
  const tips=[];
  rows.forEach((r,ri)=>{
    const col=PAL[ri%PAL.length];
    const vNow=cur(r.vals);
    const pts=ptsOf(i=>r.vals[i]); pts.push([X(f),Y(vNow)]);
    vien(pts,col,2.6);
    tips.push({s:r.s,col,v:vNow,y:Y(vNow)});
  });
  tips.push({s:mob?'NH 7%':'Ngân hàng 7%',col:GOLD,v:bank(f),y:Y(bank(f)),bank:true});
  // nhãn: dồn cho khỏi đè nhau rồi vẽ logo/chấm màu + mã + giá trị + % lãi
  tips.sort((a,b)=>a.y-b.y);
  const GAP=mob?16:19, x0=X(f);
  for(let i=1;i<tips.length;i++) if(tips[i].y-tips[i-1].y<GAP) tips[i].y=tips[i-1].y+GAP;
  for(let i=tips.length-1;i>0;i--) if(tips[i].y>padT+plotH){ tips[i].y=padT+plotH;
    if(tips[i].y-tips[i-1].y<GAP) tips[i-1].y=tips[i].y-GAP; }
  x.textBaseline='middle';
  for(const t of tips){
    let sx=x0+6;
    const im=t.bank?null:RA.imgs[t.s];
    if(im&&im.complete&&im.naturalWidth){        // logo công ty tròn ở đầu đường
      const R2=mob?7:8;
      x.save(); x.beginPath(); x.arc(sx+R2,t.y,R2,0,7); x.closePath();
      x.fillStyle='#fff'; x.fill(); x.strokeStyle=t.col; x.lineWidth=1.4; x.stroke(); x.clip();
      x.drawImage(im,sx,t.y-R2,R2*2,R2*2); x.restore();
      sx+=R2*2+4;
    }else{
      x.fillStyle=t.col; x.beginPath(); x.arc(sx+3.5,t.y,3.5,0,7); x.fill(); sx+=11;
    }
    x.fillStyle=t.bank?GOLD:TXTC; x.font=mob?'800 10.5px system-ui':'800 12.5px system-ui';
    x.textAlign='left'; x.fillText(t.s,sx,t.y);
    sx+=x.measureText(t.s).width+5;
    x.fillStyle=TXTC; x.font=mob?'700 10px system-ui':'700 11.5px system-ui';
    x.fillText(dcaFmt(t.v),sx,t.y);
    if(!mob&&!t.bank&&von>0){                    // % lãi/lỗ so vốn — chỉ màn rộng cho khỏi chật
      sx+=x.measureText(dcaFmt(t.v)).width+5;
      const p=(t.v/von-1)*100;
      x.fillStyle=p>=0?(isLight()?'#0a9e63':'#16c784'):(isLight()?'#dc3644':'#ea3943');
      x.font='700 10.5px system-ui';
      x.fillText((p>=0?'+':'')+(Math.abs(p)>=1000?Math.round(p).toLocaleString('en-US'):p.toFixed(0))+'%',sx,t.y);
    }
  }
  // nhãn đường vốn
  x.fillStyle=MUTC; x.font=mob?'700 10px system-ui':'700 11px system-ui'; x.textAlign='left';
  x.fillText('vốn đã bỏ',x0+7,clamp(Y(C2.amt*(f+1)),padT+8,padT+plotH-4)+(mob?12:14));
}
function renderRace(){
  const m=MODULES.find(x=>x.id==='race');
  const D=raceData();
  if(!D){ $('#m-race').innerHTML=head(m)+'<div class="empty">Chưa có dữ liệu đua — chạy lại demo-build-screen.py</div>'; return; }
  const secCnt={};
  for(const c of ST.list) secCnt[c.sector]=(secCnt[c.sector]||0)+1;
  const secKeys=Object.keys(secCnt).sort((a,b)=>secCnt[b]-secCnt[a]);
  const secOpts=sel=>secKeys.map(k=>'<option value="'+esc(k)+'"'+(sel===k?' selected':'')+'>'+esc(k)+'</option>').join('');
  // màn dọc: ô chọn hẹp -> bỏ chữ "Tháng" kẻo select cắt cụt mất số năm
  const thang=lb=>{ const p=String(lb).split('/');
    return (innerWidth<=640?'':'Tháng ')+p[0]+'/20'+p[1]; };
  const fromOpts=D.labels.map((lb,i)=>'<option value="'+i+'"'+(i===DCA.from?' selected':'')+'>'+thang(lb)+'</option>').join('');
  $('#m-race').innerHTML=head(m)
    +'<div class="ctl" id="raBar"><button class="btn" id="raPlay"></button>'
    +'<div class="seg" id="raMode">'
    +'<button data-v="race"'+(RA.mode!=='dca'?' class="on"':'')+' data-lg="🏁 Đường đua" data-sm="🏁 Đua"></button>'
    +'<button data-v="dca"'+(RA.mode==='dca'?' class="on"':'')+' data-lg="🌱 Đầu tư bền vững" data-sm="🌱 Bền vững"></button></div>'
    +'<div class="seg" id="raSpeed"><button data-v="0.5" data-lg="chậm" data-sm="×½"></button>'
    +'<button data-v="1" class="on" data-lg="vừa" data-sm="×1"></button>'
    +'<button data-v="2" data-lg="nhanh" data-sm="×2"></button>'
    +'<button data-v="4" data-lg="rất nhanh" data-sm="×4"></button></div>'
    +'<input type="range" id="raSlide" min="0" max="'+(D.labels.length-1)+'" step="0.01" value="0"/></div>'
    /* ---- chế độ ĐƯỜNG ĐUA ---- */
    +'<div id="raView">'
    +'<div class="ctl" id="raCtl"><span class="lb">Nhóm ngành</span>'
    +'<select id="raSec"><option value="">Toàn thị trường</option>'+secOpts(RA.sector)+'</select>'
    +'<span class="note raRange" style="margin:0">'+D.labels[0]+' → '+D.labels[D.labels.length-1]+'</span></div>'
    +'<div class="panel racePanel"><canvas id="cvRace" class="block" style="height:520px"></canvas></div>'
    +'<div class="note">Top 10 vốn hoá lớn nhất tại từng thời điểm (chọn nhóm ngành để đua riêng ngành đó). '+esc(D.note||'')+' Quay màn hình lại là có video đăng cộng đồng.</div>'
    +'</div>'
    /* ---- chế độ ĐẦU TƯ BỀN VỮNG ---- */
    +'<div id="dcaView" style="display:none">'
    +'<div class="ctl" id="dcaCtl"><span class="lb lbMoi">Mỗi tháng</span>'
    +'<input type="number" id="dcaAmt" min="0.5" step="0.5" value="'+DCA.amt+'" title="Số tiền bỏ vào mỗi tháng (triệu đồng)"/>'
    +'<span class="lb lbTr" style="text-transform:none;letter-spacing:0">triệu đồng</span>'
    +'<span class="lb lbTu">Từ</span><select id="dcaFrom" title="Tháng bắt đầu">'+fromOpts+'</select>'
    +'<span class="lb lbNg">Nhóm ngành</span>'
    +'<select id="dcaSec" title="Nhóm ngành"><option value="">Toàn thị trường</option>'+secOpts(DCA.sec)+'</select></div>'
    +'<div class="panel racePanel"><canvas id="cvDca" class="block" style="height:520px"></canvas></div>'
    +'<div class="note">8 mã giá trị cao nhất trong nhóm — bấm ▶ để xem tiền lớn lên qua từng tháng. Đường đứt là vốn đã bỏ; đường vàng là gửi ngân hàng lãi 7%/năm (ghép lãi theo tháng) để so ngay đầu tư thắng hay thua tiết kiệm.</div>'
    +'<div class="panel"><div class="ph">Giá trị hôm nay<span id="dcaSum" style="margin-left:auto;font-weight:600;color:var(--mut)"></span></div>'
    +'<div class="pb" id="dcaOut"></div></div>'
    +'<div class="note">Mua tại giá đóng cửa THÁNG, giá ĐÃ HỒI TỐ cổ tức/chia tách theo nguồn — tức phần lớn cổ tức '
    +'(cả tiền lẫn cổ phiếu) đã nằm trong kết quả như thể được tái đầu tư; số ít đợt nguồn bỏ sót thì kết quả hơi thấp hơn thực nhận. '
    +'Mã phải có giao dịch đủ từ tháng bắt đầu mới được xếp hạng. Thống kê quá khứ, không phải khuyến nghị đầu tư.</div>'
    +'</div>';
  /* nhãn nút dài/ngắn theo bề ngang — màn dọc phải nén để cả cụm nằm gọn MỘT hàng */
  const hep=()=>innerWidth<=640;
  const nhanPlay=t=>{ const b2=$('#raPlay');
    b2.textContent=hep()?(t==='pause'?'⏸':'▶'):
      (t==='pause'?'⏸ Tạm dừng':t==='again'?'▶ Chạy lại':t==='cont'?'▶ Tiếp tục':'▶ Bắt đầu');
    b2.dataset.t=t; };
  const capNhatNhan=()=>{
    $$('#raMode button,#raSpeed button').forEach(b2=>b2.textContent=hep()?b2.dataset.sm:b2.dataset.lg);
    nhanPlay($('#raPlay').dataset.t||'start');
  };
  const syncMode=()=>{                            // đổi chế độ: dừng chạy, về vạch xuất phát
    RA.playing=false; RA.f=0; RA.curY={}; RA.dcaMx=0;
    nhanPlay('start');
    $('#raView').style.display=RA.mode==='dca'?'none':'';
    $('#dcaView').style.display=RA.mode==='dca'?'':'none';
    /* THANH TUA đi theo chế độ: nhét vào cuối hàng điều khiển của view đang hiện.
       Để nguyên ở hàng đầu thì màn dọc phải gánh 4 cụm -> tràn thành 4 hàng riêng. */
    const sl=$('#raSlide');
    (RA.mode==='dca'?$('#dcaCtl'):$('#raCtl')).appendChild(sl);
    sl.max=raceEnd(); sl.value=0;
    requestAnimationFrame(()=>curDraw());         // canvas vừa hiện mới đo được kích thước
  };
  addEventListener('resize',capNhatNhan);
  $('#raMode').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    if(RA.mode===b.dataset.v) return;
    $('#raMode').querySelectorAll('button').forEach(x2=>x2.classList.remove('on'));
    b.classList.add('on'); RA.mode=b.dataset.v; syncMode();
  });
  $('#raPlay').onclick=()=>{
    if(RA.playing){ RA.playing=false; nhanPlay('cont'); return; }
    if(RA.f>=raceEnd()-0.01) RA.f=0;
    RA.playing=true; RA.last=0; nhanPlay('pause');
    RA.raf=requestAnimationFrame(raceTick);
  };
  $('#raSpeed').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    $('#raSpeed').querySelectorAll('button').forEach(x2=>x2.classList.remove('on'));
    b.classList.add('on'); RA.speed=+b.dataset.v; });
  $('#raSlide').oninput=e=>{ RA.playing=false; nhanPlay('cont');
    RA.f=+e.target.value; curDraw(); };
  $('#raSlide').onchange=()=>settleRace();        // thả tay -> hàng nào bay dở cũng về đúng chỗ
  $('#raSec').onchange=e=>{ RA.sector=e.target.value||null; RA.curY={}; drawRace(); settleRace(); };
  /* đổi tham số bền vững: tính lại chuỗi; đổi THÁNG là đổi cả dòng thời gian -> về vạch */
  $('#dcaAmt').oninput=e=>{ DCA.amt=+e.target.value||0; DCA.calc=null; RA.dcaMx=0; renderDCA(); drawDCA(1); };
  $('#dcaFrom').onchange=e=>{ DCA.from=+e.target.value||0; DCA.calc=null; syncMode(); renderDCA(); };
  $('#dcaSec').onchange=e=>{ DCA.sec=e.target.value||null; DCA.calc=null; RA.dcaMx=0; renderDCA(); drawDCA(1); };
  syncMode(); capNhatNhan();
  renderDCA();
}
MODULES.find(x=>x.id==='race').after=()=>requestAnimationFrame(()=>curDraw());

/* ---------------------------------------------------------------- khởi động */
async function init(){
  try{ await loadAll(); }
  catch(e){ $('#load').innerHTML='<p style="color:var(--red)">Không nạp được dữ liệu.<br/>Tải lại trang giúp nhé.</p>'; return; }
  const mn=$('#mn');
  for(const m of MODULES){ const s=document.createElement('section');
    s.className='mod'; s.id='m-'+m.id; mn.appendChild(s); }
  updateHeadChips();
  $('#btnShot').onclick=shotView;
  $('#btnThm').textContent=isLight()?'☀️':'🌙';
  $('#btnThm').onclick=()=>{
    const light=!isLight();
    document.documentElement.dataset.theme=light?'light':'';
    localStorage.setItem('cpvn_theme',light?'light':'');
    $('#btnThm').textContent=light?'☀️':'🌙';
    Object.keys(done).forEach(k=>delete done[k]);
    showMod(cur);
  };
  $('#mn').addEventListener('click',e=>{           // bấm dòng mã ở bất kỳ thẻ nào -> trang cổ phiếu
    const rw=e.target.closest('.rw,.dcarow');
    if(rw&&rw.dataset.sym) location.href='cophieu.html?sym='+rw.dataset.sym;
  });
  addEventListener('resize',(()=>{ let rt; return ()=>{ clearTimeout(rt);
    rt=setTimeout(()=>{ const m=MODULES.find(x=>x.id===cur);
      if(m&&m.after) m.after(); },180); }; })());
  const q=new URLSearchParams(location.search).get('m');
  const byPath={radar:'radar',duongdua:'race'}[location.pathname.replace(/\//g,'')];
  const start=q||byPath||(location.hash||'').replace('#','');
  const cached=applyLiveCache();          // có bộ nhớ sống -> vẽ TỨC THÌ, poll chạy nền
  if(!cached&&sessionOpenVN()) await pollLive();   // lần đầu tiên trong phiên mới phải chờ (~1s)
  showMod(MODULES.some(m=>m.id===start)?start:'radar');
  updateHeadChips();   // chip nhịp đập + ngày đúng NGAY (kể cả khi dùng bản đệm)
  startLive();         // rồi giữ nhịp mỗi phút
  $('#load').classList.add('off');
  setTimeout(()=>$('#load').remove(),420);
}
init();
})();
