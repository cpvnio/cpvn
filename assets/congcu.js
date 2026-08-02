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
  const a=Math.abs(n), s=n<0?'-':'';
  if(a>=1e15) return s+(a/1e15).toLocaleString('en-US',{maximumFractionDigits:2})+' triệu tỷ';
  if(a>=1e12) return s+(a/1e12).toLocaleString('en-US',{maximumFractionDigits:1})+' nghìn tỷ';
  if(a>=1e9)  return s+(a/1e9).toLocaleString('en-US',{maximumFractionDigits:1})+' tỷ';
  if(a>=1e6)  return s+(a/1e6).toFixed(1)+' tr';
  return num(n); };
const ty=n=>{ if(n==null||isNaN(n)) return '—';
  const a=Math.abs(n); if(a<1e9||a>=1e12) return vnd(n);
  return (n/1e9).toLocaleString('en-US',{maximumFractionDigits:1})+' tỷ'; };
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
function drawSpark(cv,vals){
  if(!cv||!vals||vals.length<2) return;
  const W=cv.clientWidth||74, H=cv.clientHeight||26, x=dpr(cv,W,H);
  let mn=Infinity,mx=-Infinity; for(const v of vals){ if(v<mn)mn=v; if(v>mx)mx=v; }
  if(mx-mn<1e-9) mx=mn+1;
  const up=vals[vals.length-1]>=vals[0], col=up?'#16c784':'#ea3943';
  const X=i=>i/(vals.length-1)*(W-2)+1, Y=v=>H-2-(v-mn)/(mx-mn)*(H-4);
  x.beginPath(); vals.forEach((v,i)=>i?x.lineTo(X(i),Y(v)):x.moveTo(X(i),Y(v)));
  x.strokeStyle=col; x.lineWidth=1.6; x.lineJoin='round'; x.stroke();
  const g=x.createLinearGradient(0,0,0,H);
  g.addColorStop(0,up?'rgba(22,199,132,.22)':'rgba(234,57,67,.22)'); g.addColorStop(1,'rgba(0,0,0,0)');
  x.lineTo(X(vals.length-1),H); x.lineTo(X(0),H); x.closePath(); x.fillStyle=g; x.fill();
}
function drawSparks(root){
  (root||document).querySelectorAll('canvas.rs').forEach(cv=>{
    const a=ST.spark[cv.dataset.s]; if(a) drawSpark(cv,a);
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
const ST={ map:new Map(), list:[], date:'', indices:[], parents:[], sectors:[],
  vn30:new Set(), pack:null, market:null, spark:{}, sparkT:[], hist:new Map() };
async function loadAll(){
  const j=u=>fetch(u,{cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null);
  const [u,eod,pk,mk,sp]=await Promise.all([
    j('universe.json'), j('data/eod/latest.json'),
    j('data/screen.json'), j('data/market.json'), j('data/spark.json')]);
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
    c.mcapLive=c.shares?c.shares*c.close:c.mcap;
  }
  const F=pk.f;
  for(const sym in pk.d){ const c=ST.map.get(sym); if(!c) continue;
    const a=pk.d[sym]; for(let i=0;i<F.length;i++) c[F[i]]=a[i]; }
  ST.list=Array.from(ST.map.values());
  ST.parents=Array.from(new Set(ST.list.map(c=>c.parent))).sort();
  ST.sectors=Array.from(new Set(ST.list.map(c=>c.sector))).sort();
  if(sp&&sp.d){ ST.spark=sp.d;
    const len=(sp.d[Object.keys(sp.d)[0]]||[]).length;
    ST.sparkT=(mk&&mk.t)?mk.t.slice(-len):[]; }
  $('#fdate').textContent=ST.date||'—';
}
function mood(){ const B=ST.market&&ST.market.breadth;
  return (B&&B.mood.length)?B.mood[B.mood.length-1]:null; }
const moodWord=v=>v==null?'—':v>=75?'Hưng phấn':v>=60?'Lạc quan':v>=40?'Trung tính':v>=25?'Thận trọng':'Sợ hãi';
const moodCol=v=>v==null?'var(--mut)':v>=60?'var(--green)':v>=40?'var(--yellow)':v>=25?'#f97316':'var(--red)';
function marketStats(){
  let up=0,dn=0,fl=0,ce=0,fo=0,gtgd=0,ath=0,nh=0;
  for(const c of ST.list){
    if(c.ath===1&&c.close>0) ath++;
    if(c.dhi!=null&&c.dhi>=-1&&(c.avgval20||0)>=5e8) nh++;
    if(!c.vol) continue;
    gtgd+=c.gtgd;
    if(c.ceil&&c.close>=c.ceil) ce++; else if(c.floor&&c.close<=c.floor) fo++;
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
  {id:'heat', ic:'🗺️', name:'Bản đồ nhiệt', tag:'Toàn cảnh thị trường trong một hình: ô to theo vốn hoá, màu theo biến động — kịch trần TÍM, kịch sàn XANH LƠ như bảng điện. Bấm ngành để phóng to, bấm mã để mở trang cổ phiếu.',
   meta:[], render:renderHeat},
  {id:'radar', ic:'📡', name:'Radar phiên', tag:'18 nhóm tín hiệu chia 3 khu vực + bảng ngành — mở ra là thấy hết chuyện của phiên hôm nay. Bấm mã bất kỳ để xem chi tiết.',
   meta:[], render:renderRadar},
  {id:'race', ic:'🏁', name:'Đường đua vốn hoá', tag:'6,5 năm thị trường chạy lại trong 30 giây — bảng xếp hạng vốn hoá đổi ngôi theo từng tháng.',
   meta:[], render:renderRace},
];
let cur=null; const done={};
const PATHOF={heat:'/bandonhiet',radar:'/radar',race:'/duongdua'};
const TITLEOF={heat:'Bản đồ nhiệt',radar:'Radar phiên',race:'Đường đua vốn hoá'};
function renderNav(){
  $$('.tabs a[data-m]').forEach(e=>{
    e.classList.toggle('on',e.dataset.m===cur);
    if(!e._b){ e._b=1; e.onclick=ev=>{ ev.preventDefault(); showMod(e.dataset.m); }; }
  });
}
function head(m){
  return '<div class="mhead"><span class="eyebrow">CPVN.IO — công cụ thị trường</span>'+
    '<h1>'+m.ic+' '+m.name+'</h1><p>'+esc(m.tag)+'</p>'+
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
  return '<div class="rw" data-sym="'+c.sym+'" title="Bấm mở trang '+c.sym+'">'+logoHTML(c)+
    '<span class="idn"><b>'+c.sym+'</b><i>'+esc(shortName(c.name))+'</i></span>'+
    '<canvas class="rs" data-s="'+c.sym+'"></canvas>'+
    '<span class="pz '+cls(c.chg)+'">'+num(c.close)+'</span>'+
    '<span class="mt '+(mcls||'')+'">'+metric+'</span></div>';
}
function radarCard(ic,title,rows,id){
  return '<div class="panel" id="rc-'+id+'"><div class="ph"><span>'+ic+'</span>'+title+
    '<span class="cnt">'+rows.length+'</span>'+
    '<button class="shotbtn" title="Chụp thẻ này" onclick="LB.shotCard(\''+id+'\',\''+id+'\')">📷</button></div>'+
    '<div class="pb">'+(rows.length?rows.join(''):'<div class="empty">Phiên này không có mã nào thoả</div>')+'</div></div>';
}
LB.shotCard=(el,name)=>shot($('#rc-'+el),'cpvn-'+name+'-'+ST.date);
function recap(){
  const s=marketStats(), sp=sectorPerf(), md=mood();
  const nnT=ST.list.filter(c=>c.nnVal>0).sort((a,b)=>b.nnVal-a.nnVal)[0];
  const nnB=ST.list.filter(c=>c.nnVal<0).sort((a,b)=>a.nnVal-b.nnVal)[0];
  const idx=ST.indices.map(i=>'<b>'+esc(i.name)+'</b> '+(+i.value).toLocaleString('en-US',{maximumFractionDigits:2})+
    ' <span class="'+cls(i.chg)+'">'+pct(i.chg)+'</span>').join(' · ');
  const dom=s.up>s.dn*1.25?'sắc <b class="up">xanh</b> chiếm ưu thế':s.dn>s.up*1.25?'sắc <b class="dn">đỏ</b> chiếm ưu thế':'thị trường <b>giằng co</b>';
  const lines=[];
  lines.push(idx+'.');
  lines.push('Độ rộng <span class="up">▲'+s.up+'</span> · <span class="fl">–'+s.fl+'</span> · <span class="dn">▼'+s.dn+'</span>'+
    (s.ce?' · <span class="ce">'+s.ce+' trần</span>':'')+(s.fo?' · <span class="fo">'+s.fo+' sàn</span>':'')+
    ' — '+dom+'. Thanh khoản khớp <b>'+ty(s.gtgd)+'</b>.');
  if(sp.length) lines.push('Nhóm mạnh nhất: <b>'+esc(sp[0].k)+'</b> <span class="'+cls(sp[0].d)+'">'+pct(sp[0].d)+'</span>'+
    ' · yếu nhất: <b>'+esc(sp[sp.length-1].k)+'</b> <span class="'+cls(sp[sp.length-1].d)+'">'+pct(sp[sp.length-1].d)+'</span>.');
  if(nnT&&nnB) lines.push('Khối ngoại mua ròng mạnh nhất <b>'+nnT.sym+'</b> <span class="up">+'+ty(nnT.nnVal)+'</span>, '+
    'bán ròng mạnh nhất <b>'+nnB.sym+'</b> <span class="dn">−'+ty(-nnB.nnVal)+'</span>.');
  if(s.ath||s.nh) lines.push((s.ath?'<b>'+s.ath+'</b> mã đóng cửa ở đỉnh lịch sử kho':'')+
    (s.ath&&s.nh?' · ':'')+(s.nh?'<b>'+s.nh+'</b> mã trong vòng 1% quanh đỉnh 52 tuần':'')+'.');
  return lines.join('<br/>');
}
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
  const md=mood(), s=marketStats(), tot=Math.max(1,s.up+s.dn+s.fl);
  const nnTot=L.reduce((t,c)=>t+(c.nnVal||0),0);
  const volSpike=L.filter(c=>c.volr>=2&&liq(c)>=1e9).length;

  /* trần — sàn gộp 1 thẻ: ưu tiên mã thanh khoản cao */
  function ceflRows(){
    const ces=L.filter(c=>c.close>0&&c.ceil>0&&c.close>=c.ceil).sort((a,b)=>b.gtgd-a.gtgd);
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

  const tiles='<div class="stat" style="margin-bottom:15px">'
    +'<div><div class="k">Thanh khoản khớp</div><div class="v">'+ty(s.gtgd)+'</div></div>'
    +'<div><div class="k">Khối ngoại ròng</div><div class="v '+(nnTot>0?'up':'dn')+'">'+(nnTot>0?'+':'−')+ty(Math.abs(nnTot))+'</div></div>'
    +'<div><div class="k">Kịch trần · sàn</div><div class="v"><span class="ce">'+s.ce+'</span> · <span class="fo">'+s.fo+'</span></div></div>'
    +'<div><div class="k">Lập đỉnh lịch sử</div><div class="v">'+s.ath+'</div></div>'
    +'<div><div class="k">Sát đỉnh 52T (≤1%)</div><div class="v">'+s.nh+'</div></div>'
    +'<div><div class="k">Đột biến khối lượng</div><div class="v">'+volSpike+'</div></div></div>';

  $('#m-radar').innerHTML=head(m)
    +'<div class="hero">'
    +'<div class="panel mood"><div class="big" style="color:'+moodCol(md)+'">'+(md==null?'—':Math.round(md))+'<small>/100</small></div>'
    +'<div class="word" style="color:'+moodCol(md)+'">'+moodWord(md)+' — nhịp đập thị trường</div>'
    +'<div class="bbar"><i style="width:'+(s.up/tot*100)+'%;background:var(--green)"></i>'
    +'<i style="width:'+(s.fl/tot*100)+'%;background:var(--yellow)"></i>'
    +'<i style="width:'+(s.dn/tot*100)+'%;background:var(--red)"></i></div>'
    +'<div class="sub">▲'+s.up+' · –'+s.fl+' · ▼'+s.dn+' trên '+ST.list.length.toLocaleString('en-US')+' mã</div></div>'
    +'<div class="panel story"><span class="dt">Chuyện phiên '+esc(ST.date)+'</span>'+recap()+'</div>'
    +'</div>'
    +tiles
    +'<div class="ctl" style="margin-bottom:2px">'
    +[['r-flow','💰 Dòng tiền'],['r-power','🚀 Sức mạnh giá'],['r-risk','⚠️ Mặt tối'],['r-sec','🏭 Ngành']]
      .map(a=>'<button class="btn gh" data-go="'+a[0]+'">'+a[1]+'</button>').join('')
    +'<button class="btn gh" id="shotRadar">📷 Chụp cả radar</button>'
    +'<span class="note" style="margin:0">Mỗi thẻ có nút 📷 riêng — đăng nhóm mỗi sáng.</span></div>'
    +'<div id="radarAll">'
    +sectionHead('r-flow','💰 Dòng tiền trong phiên')+'<div class="grid g3">'+flow.join('')+'</div>'
    +sectionHead('r-power','🚀 Sức mạnh giá')+'<div class="grid g3">'+power.join('')+'</div>'
    +sectionHead('r-risk','⚠️ Mặt tối của phiên')+'<div class="grid g3">'+risk.join('')+'</div>'
    +sectionHead('r-sec','🏭 Nhóm ngành hôm nay')+sectorPanel()
    +'</div>';
  drawSparks($('#m-radar'));
  $('#shotRadar').onclick=()=>shot($('#radarAll'),'cpvn-radar-'+ST.date);
  $$('#m-radar [data-go]').forEach(b=>b.onclick=()=>{
    const el=$('#'+b.dataset.go); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); });
}

/* ========================================================== 2. BẢN ĐỒ NHIỆT */
const HM={size:'mcap',color:'chg',scope:'all',n:300,sector:null,tiles:[],chg:null,day:0,playing:null,speed:1};
const HM_CAP={chg:6,w:14,m:26,y:80,nn:30};
function heatVal(c){ return HM.color==='chg'?c.chg:HM.color==='nn'?(c.nnVal/1e9):c[HM.color]; }
function heatTxt(v){ return HM.color==='nn'?(v==null?'—':(v>0?'+':'')+fx(v,1)+' tỷ'):pct(v); }
function drawHeat(){
  const box=$('#hm'); if(!box) return;
  const W=box.clientWidth, H=box.clientHeight;
  // danh sách theo PHẠM VI (chưa lọc ngành) — dùng chung cho cột ngành bên trái
  let base=ST.list.filter(c=>(c.mcapLive||c.mcap)>0&&c.close>0);
  if(HM.scope==='vn30') base=base.filter(c=>ST.vn30.has(c.sym));
  else if(HM.scope!=='all') base=base.filter(c=>c.ex===HM.scope);
  renderHeatSide(base);
  let L=HM.sector?base.filter(c=>c.sector===HM.sector):base;
  const sz=c=>HM.size==='mcap'?(c.mcapLive||c.mcap):(c.gtgd||0);
  L=L.filter(c=>sz(c)>0).sort((a,b)=>sz(b)-sz(a)).slice(0,HM.n);
  const cap=HM_CAP[HM.color];
  HM.tiles=[];
  let html='';
  const tile=(c,x,y,w,h)=>{
    const v=heatVal(c);
    let col=heatColor(v,cap);
    if(HM.color==='chg'&&c.close>0){           // màu bảng điện: trần TÍM · sàn XANH LƠ
      if(c.ceil>0&&c.close>=c.ceil)      col={bg:'#c026d3',fg:'#ffffff'};
      else if(c.floor>0&&c.close<=c.floor) col={bg:'#0ea5e9',fg:'#ffffff'};
    }
    const fs=clamp(Math.min(w,h)*.3,8,22), showP=h>=32&&w>=44;
    HM.tiles.push({sym:c.sym});
    return '<div class="htile" data-sym="'+c.sym+'" style="left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px;background:'+col.bg+'">'+
      (w>23&&h>15?'<b style="font-size:'+fs+'px;color:'+col.fg+'">'+c.sym+'</b>':'')+
      (showP?'<i class="hpct" style="font-size:'+clamp(fs*.58,8,12)+'px;color:'+col.fg+'">'+heatTxt(v)+'</i>':'')+'</div>';
  };
  if(HM.sector){
    const rects=squarify(L.map(c=>({k:c.sym,v:sz(c),c})),0,0,W,H);
    for(const t of rects) html+=tile(t.d.c,t.x,t.y,t.w,t.h);
  }else{
    const groups={};
    for(const c of L) (groups[c.sector]=groups[c.sector]||[]).push(c);
    // ngành chỉ còn 1-2 mã lọt top đang vẽ -> gộp vào "Ngành khác" cho bản đồ đỡ vụn
    // (cột ngành bên trái vẫn liệt kê ĐẦY ĐỦ như trang bong bóng)
    const small=Object.keys(groups).filter(k=>groups[k].length<3);
    if(small.length>1){
      const oth=[];
      for(const k of small){ oth.push(...groups[k]); delete groups[k]; }
      if(oth.length) groups['Ngành khác']=oth;
    }
    const gitems=Object.keys(groups).map(k=>({k,v:groups[k].reduce((s,c)=>s+sz(c),0)}));
    const grects=squarify(gitems,0,0,W,H);
    for(const g of grects){
      const inner=squarify(groups[g.d.k].map(c=>({k:c.sym,v:sz(c),c})),
        g.x+1,g.y+17,Math.max(0,g.w-2),Math.max(0,g.h-18));
      let tiles='';
      for(const t of inner) tiles+=tile(t.d.c,t.x-g.x,t.y-g.y,t.w,t.h);
      const gj=groups[g.d.k]; let gc=0,gd=0;
      for(const c of gj){ const cp=c.mcapLive||c.mcap||0; gc+=cp; if(c.chg!=null) gd+=c.chg*cp; }
      const gp={d:gc?gd/gc:0};
      html+='<div class="hgrp" style="left:'+g.x+'px;top:'+g.y+'px;width:'+g.w+'px;height:'+g.h+'px">'+
        '<div class="gl" data-g="'+esc(g.d.k)+'" title="Bấm để phóng to ngành này">'+esc(g.d.k)+
        (gp&&g.w>150?' <span class="'+cls(gp.d)+'">'+pct(gp.d)+'</span>':'')+'</div>'+tiles+'</div>';
    }
  }
  box.innerHTML=html;
  const tip=$('#htip');
  box.querySelectorAll('.htile').forEach(e=>{
    const c=ST.map.get(e.dataset.sym);
    e.onmousemove=ev=>{
      tip.style.display='block';
      tip.innerHTML='<div class="t">'+c.sym+' <span class="'+cls(c.chg)+'" style="font-size:12px">'+pct(c.chg)+'</span></div>'+
        '<div class="r" style="max-width:220px;white-space:normal;color:var(--faint)">'+esc(shortName(c.name))+'</div>'+
        '<div class="r"><span>Giá</span><b>'+num(c.close)+'</b></div>'+
        '<div class="r"><span>Vốn hoá</span><b>'+vnd(c.mcapLive||c.mcap)+'</b></div>'+
        '<div class="r"><span>GTGD</span><b>'+ty(c.gtgd)+'</b></div>'+
        '<div class="r"><span>1 tuần / 1 tháng</span><b class="'+cls(c.w)+'">'+pct(c.w)+'</b> <b class="'+cls(c.m)+'">'+pct(c.m)+'</b></div>'+
        '<div class="r"><span>NN ròng phiên</span><b class="'+(c.nnVal>0?'up':c.nnVal<0?'dn':'')+'">'+(c.nnVal?((c.nnVal>0?'+':'−')+ty(Math.abs(c.nnVal))):'—')+'</b></div>'+
        '<div class="r"><span>RS Rating</span><b>'+(c.rs||'—')+'</b></div>';
      const w=tip.offsetWidth,h2=tip.offsetHeight;
      tip.style.left=Math.min(ev.clientX+14,innerWidth-w-10)+'px';
      tip.style.top=Math.min(ev.clientY+14,innerHeight-h2-10)+'px';
    };
    e.onmouseleave=()=>{ tip.style.display='none'; };
    e.onclick=()=>{ location.href='cophieu.html?sym='+c.sym; };   // bấm ô = mở trang mã
  });
  box.querySelectorAll('.gl').forEach(e=>e.onclick=()=>{ HM.sector=e.dataset.g; drawHeat(); });
}
function replayStop(){ if(HM.playing){ clearInterval(HM.playing); HM.playing=null; }
  const b=$('#rpPlay'); if(b) b.textContent='▶'; }
function replayExit(){ replayStop(); $('#replayBar').classList.remove('on'); drawHeat(); }
function replayShow(d){
  if(!HM.chg){ HM.chg={};
    for(const sym in ST.spark){ const a=ST.spark[sym], o=[];
      for(let i=1;i<a.length;i++) o.push(a[i-1]?((a[i]/a[i-1]-1)*100):null);
      HM.chg[sym]=o; } }
  HM.day=d;
  const lbl=ST.sparkT.length>d?tsDate(ST.sparkT[d]):('phiên '+d);
  $('#rpDay').textContent=lbl; $('#rpSlide').value=d;
  const cap=6;
  $('#hm').querySelectorAll('.htile').forEach(e=>{
    const arr=HM.chg[e.dataset.sym], v=arr?arr[d-1]:null;
    const col=heatColor(v,cap);
    e.style.background=col.bg;
    const b=e.querySelector('b'); if(b) b.style.color=col.fg;
    const i=e.querySelector('.hpct'); if(i){ i.style.color=col.fg; i.textContent=pct(v); }
  });
}
/* cột ngành dọc bên trái — như thanh ngành của trang bong bóng */
function renderHeatSide(base){
  const el=$('#hmSide'); if(!el) return;
  const G={};
  let allCap=0, allD=0;
  for(const c of base){
    const g=G[c.sector]=G[c.sector]||{n:0,cap:0,d:0};
    const cap=c.mcapLive||c.mcap||0;
    g.n++; g.cap+=cap; allCap+=cap;
    if(c.chg!=null){ g.d+=c.chg*cap; allD+=c.chg*cap; }
  }
  // danh sách ngành đầy đủ, xếp theo SỐ MÃ như thanh ngành trang bong bóng
  const rows=Object.keys(G).map(k=>({k,n:G[k].n,d:G[k].cap?G[k].d/G[k].cap:0}))
    .sort((a,b)=>b.n-a.n);
  const item=(k,lb,n,d)=>'<div class="hsItem'+((HM.sector||'')===k?' on':'')+'" data-s="'+esc(k)+'">'+
    '<span class="n">'+esc(lb)+'</span><span class="c">'+n+'</span>'+
    '<span class="p '+cls(d)+'">'+pct(d)+'</span></div>';
  el.innerHTML='<div class="hsHead">Nhóm ngành</div>'+
    item('','Tất cả ngành',base.length,allCap?allD/allCap:0)+
    rows.map(r=>item(r.k,r.k,r.n,r.d)).join('');
  el.querySelectorAll('.hsItem').forEach(e=>e.onclick=()=>{
    HM.sector=e.dataset.s||null; drawHeat(); });
}
function renderHeat(){
  const m=MODULES.find(x=>x.id==='heat');
  const seg=(id,opts,cur2)=>'<div class="seg" id="'+id+'">'+opts.map(o=>
    '<button data-v="'+o[0]+'" class="'+(String(o[0])===String(cur2)?'on':'')+'">'+o[1]+'</button>').join('')+'</div>';
  $('#m-heat').innerHTML=head(m)
    +'<div class="ctl">'
    +'<span class="lb">Ô to theo</span>'+seg('hmSize',[['mcap','Vốn hoá'],['gtgd','GTGD']],HM.size)
    +'<span class="lb">Màu</span>'+seg('hmColor',[['chg','1 ngày'],['w','1 tuần'],['m','1 tháng'],['y','1 năm'],['nn','NN ròng']],HM.color)
    +'<span class="lb">Phạm vi</span>'+seg('hmScope',[['all','Tất cả'],['vn30','VN30'],['HOSE','HOSE'],['HNX','HNX'],['UPCOM','UPCOM']],HM.scope)
    +seg('hmN',[[150,'150'],[300,'300'],[500,'500']],HM.n)
    +'<span class="legend">−'+HM_CAP[HM.color]+(HM.color==='nn'?' tỷ':'%')
    +'<i style="background:'+heatColor(-9,6).bg+'"></i><i style="background:'+heatColor(-2.5,6).bg+'"></i>'
    +'<i style="background:'+heatColor(0,6).bg+'"></i><i style="background:'+heatColor(2.5,6).bg+'"></i>'
    +'<i style="background:'+heatColor(9,6).bg+'"></i>+'+HM_CAP[HM.color]+(HM.color==='nn'?' tỷ':'%')
    +(HM.color==='chg'?' <i style="background:#c026d3"></i>trần <i style="background:#0ea5e9"></i>sàn':'')+'</span>'
    +'</div>'
    +'<div class="ctl"><button class="btn gh" id="hmReplay">🎬 Xem lại 30 phiên</button>'
    +'<button class="btn gh" id="hmFull">⛶ Toàn màn hình</button>'
    +'<button class="btn gh" id="hmShot">📷 Chụp ảnh</button>'
    +'<span class="note" style="margin:0">Chọn ngành ở cột bên trái để xem riêng ngành đó (bấm tên ngành trên bản đồ cũng được) · rê chuột xem chi tiết mã.</span></div>'
    +'<div id="hmWrap"><div id="hmLayout"><div id="hmSide"></div><div id="hm"></div></div>'
    +'<div id="replayBar"><button class="btn gh" id="rpPlay" style="padding:7px 13px">▶</button>'
    +'<span class="day" id="rpDay">—</span>'
    +'<input type="range" id="rpSlide" min="1" max="29" step="1" value="29"/>'
    +seg('rpSpeed',[[0.5,'chậm'],[1,'vừa'],[2,'nhanh']],1)
    +'<button class="btn gh" id="rpExit">✕ Về trực tiếp</button></div></div>';
  const bind=(id,k,cast,after)=>{ const box=$('#'+id); if(!box) return;
    box.querySelectorAll('button').forEach(b=>b.onclick=()=>{
      box.querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
      HM[k]=cast?cast(b.dataset.v):b.dataset.v; if(after)after(); }); };
  bind('hmSize','size',null,drawHeat);
  bind('hmColor','color',null,()=>{ replayExit(); renderHeat(); });
  bind('hmScope','scope',null,()=>{ HM.sector=null; drawHeat(); });
  bind('hmN','n',Number,drawHeat);
  bind('rpSpeed','speed',Number,()=>{ if(HM.playing){ replayStop(); startPlay(); } });
  $('#hmShot').onclick=()=>shot($('#hmLayout'),'cpvn-heatmap-'+ST.date);
  $('#hmFull').onclick=()=>{ const el=$('#hmWrap');
    if(document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen&&el.requestFullscreen(); };
  document.addEventListener('fullscreenchange',()=>{
    const h=document.fullscreenElement?'calc(100vh - 96px)':'';
    $('#hm').style.height=h;
    const sd=$('#hmSide'); if(sd) sd.style.maxHeight=h;
    drawHeat(); if($('#replayBar').classList.contains('on')) replayShow(HM.day);
  });
  const startPlay=()=>{
    $('#rpPlay').textContent='⏸';
    HM.playing=setInterval(()=>{
      let d=HM.day+1; const mx=+$('#rpSlide').max;
      if(d>mx){ replayStop(); return; }
      replayShow(d);
    },Math.round(650/HM.speed));
  };
  $('#hmReplay').onclick=()=>{
    const bar=$('#replayBar');
    if(bar.classList.contains('on')){ replayExit(); return; }
    if(!Object.keys(ST.spark).length) return toast('Kho chưa có spark.json');
    bar.classList.add('on');
    const len=(ST.spark[Object.keys(ST.spark)[0]]||[]).length;
    $('#rpSlide').max=len-1;
    replayShow(1); replayStop(); startPlay();
  };
  $('#rpPlay').onclick=()=>{ if(HM.playing) replayStop(); else{
    if(HM.day>=+$('#rpSlide').max) replayShow(1);
    (function(){ $('#rpPlay').textContent='⏸';
      HM.playing=setInterval(()=>{ let d=HM.day+1;
        if(d>+$('#rpSlide').max){ replayStop(); return; } replayShow(d);
      },Math.round(650/HM.speed)); })(); } };
  $('#rpSlide').oninput=e=>{ replayStop(); replayShow(+e.target.value); };
  $('#rpExit').onclick=replayExit;
  requestAnimationFrame(drawHeat);
}
MODULES.find(x=>x.id==='heat').after=()=>requestAnimationFrame(drawHeat);

/* ======================================================== 4. ĐƯỜNG ĐUA VỐN HOÁ */
const RA={f:0,playing:false,speed:1,curY:{},imgs:{},data:null,raf:null,last:0,sector:null};
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
function raceFmt(v){ if(v==null) return '—';
  return v>=1000?(v/1000).toFixed(2)+' triệu tỷ':Math.round(v)+' nghìn tỷ'; }
function drawRace(){
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
  const top=16, rowH=(H-top-46)/10, labX=118, barX=labX+10, barW=W-barX-130;
  rows2.forEach((r,rank)=>{
    const ty2=top+rank*rowH;
    if(RA.curY[r.s]==null) RA.curY[r.s]=ty2;
    RA.curY[r.s]+=(ty2-RA.curY[r.s])*.18;
  });
  for(const r of rows2){
    const y=RA.curY[r.s], col=D.cols[r.s];
    const bw=Math.max(2,r.v/mx*barW), bh=rowH*.66;
    x.fillStyle=col+'26'; x.beginPath(); x.roundRect(barX,y+rowH*.14,bw,bh,8); x.fill();
    x.fillStyle=col; x.beginPath(); x.roundRect(barX,y+rowH*.14,Math.min(bw,5),bh,2); x.fill();
    x.globalAlpha=.92; x.fillStyle=col;
    x.beginPath(); x.roundRect(barX,y+rowH*.14,bw,bh,8); x.globalAlpha=.32; x.fill(); x.globalAlpha=1;
    const im=RA.imgs[r.s];
    if(im&&im.complete&&im.naturalWidth){
      x.save(); x.beginPath(); x.arc(labX-72,y+rowH*.5,12,0,7); x.closePath();
      x.fillStyle='#fff'; x.fill(); x.clip();
      x.drawImage(im,labX-84,y+rowH*.5-12,24,24); x.restore();
    }
    x.fillStyle=isLight()?'#101321':'#ecedf4'; x.font='800 14px system-ui';
    x.textAlign='left'; x.textBaseline='middle';
    x.fillText(r.s,labX-52,y+rowH*.5);
    x.fillStyle=isLight()?'#5d6272':'#9092a3'; x.font='700 12.5px system-ui';
    x.fillText(raceFmt(r.v),barX+bw+10,y+rowH*.5);
  }
  x.fillStyle=isLight()?'rgba(16,19,33,.14)':'rgba(255,255,255,.1)';
  x.font='900 54px system-ui'; x.textAlign='right'; x.textBaseline='alphabetic';
  x.fillText(D.labels[Math.round(f)],W-18,H-18);
  x.fillStyle=isLight()?'#9aa0af':'#5d5f70'; x.font='10.5px system-ui'; x.textAlign='left';
  x.fillText('Vốn hoá quy ước: số cổ phiếu HIỆN TẠI × giá tháng đó',14,H-10);
}
function raceTick(ts){
  if(!RA.playing) return;
  if(!RA.last) RA.last=ts;
  const dt=(ts-RA.last)/1000; RA.last=ts;
  const D=raceData(); if(!D) return;
  RA.f+=dt*2.2*RA.speed;
  if(RA.f>=D.labels.length-1){ RA.f=D.labels.length-1; RA.playing=false;
    const b=$('#raPlay'); if(b) b.textContent='▶ Chạy lại'; }
  const sl=$('#raSlide'); if(sl) sl.value=RA.f;
  drawRace();
  if(RA.playing) RA.raf=requestAnimationFrame(raceTick);
}
function renderRace(){
  const m=MODULES.find(x=>x.id==='race');
  const D=raceData();
  if(!D){ $('#m-race').innerHTML=head(m)+'<div class="empty">Chưa có dữ liệu đua — chạy lại demo-build-screen.py</div>'; return; }
  const secCnt={};
  for(const c of ST.list) secCnt[c.sector]=(secCnt[c.sector]||0)+1;
  const secOpts=Object.keys(secCnt).sort((a,b)=>secCnt[b]-secCnt[a])
    .map(k=>'<option value="'+esc(k)+'"'+(RA.sector===k?' selected':'')+'>'+esc(k)+'</option>').join('');
  $('#m-race').innerHTML=head(m)
    +'<div class="ctl"><button class="btn" id="raPlay">▶ Bắt đầu đua</button>'
    +'<span class="lb">Nhóm ngành</span>'
    +'<select id="raSec"><option value="">Toàn thị trường</option>'+secOpts+'</select>'
    +'<div class="seg" id="raSpeed"><button data-v="0.5">chậm</button><button data-v="1" class="on">vừa</button>'
    +'<button data-v="2">nhanh</button><button data-v="4">rất nhanh</button></div>'
    +'<input type="range" id="raSlide" min="0" max="'+(D.labels.length-1)+'" step="0.01" value="0" style="flex:1;min-width:170px"/>'
    +'<span class="note" style="margin:0">'+D.labels[0]+' → '+D.labels[D.labels.length-1]+'</span></div>'
    +'<div class="panel" style="padding:12px"><canvas id="cvRace" class="block" style="height:520px"></canvas></div>'
    +'<div class="note">Top 10 vốn hoá lớn nhất tại từng thời điểm (chọn nhóm ngành để đua riêng ngành đó). '+esc(D.note||'')+' Quay màn hình lại là có video đăng cộng đồng.</div>';
  $('#raPlay').onclick=()=>{
    if(RA.playing){ RA.playing=false; $('#raPlay').textContent='▶ Tiếp tục'; return; }
    if(RA.f>=D.labels.length-1.01) RA.f=0;
    RA.playing=true; RA.last=0; $('#raPlay').textContent='⏸ Tạm dừng';
    RA.raf=requestAnimationFrame(raceTick);
  };
  $('#raSpeed').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    $('#raSpeed').querySelectorAll('button').forEach(x2=>x2.classList.remove('on'));
    b.classList.add('on'); RA.speed=+b.dataset.v; });
  $('#raSlide').oninput=e=>{ RA.playing=false; $('#raPlay').textContent='▶ Tiếp tục';
    RA.f=+e.target.value; drawRace(); };
  $('#raSec').onchange=e=>{ RA.sector=e.target.value||null; RA.curY={}; drawRace(); };
  RA.f=0; RA.curY={};
  requestAnimationFrame(drawRace);
}
MODULES.find(x=>x.id==='race').after=()=>requestAnimationFrame(drawRace);

/* ---------------------------------------------------------------- khởi động */
async function init(){
  try{ await loadAll(); }
  catch(e){ $('#load').innerHTML='<p style="color:var(--red)">Không nạp được dữ liệu.<br/>Tải lại trang giúp nhé.</p>'; return; }
  const mn=$('#mn');
  for(const m of MODULES){ const s=document.createElement('section');
    s.className='mod'; s.id='m-'+m.id; mn.appendChild(s); }
  const md=mood();
  $('#hMood').innerHTML='Nhịp đập <b style="color:'+moodCol(md)+'">'+(md==null?'—':Math.round(md))+'</b> · '+
    '<span style="color:'+moodCol(md)+';font-weight:700">'+moodWord(md)+'</span>';
  $('#hDate').innerHTML='phiên <b>'+esc(ST.date)+'</b>';
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
    const rw=e.target.closest('.rw');
    if(rw&&rw.dataset.sym) location.href='cophieu.html?sym='+rw.dataset.sym;
  });
  addEventListener('resize',(()=>{ let rt; return ()=>{ clearTimeout(rt);
    rt=setTimeout(()=>{ const m=MODULES.find(x=>x.id===cur);
      if(m){ if(cur==='heat') drawHeat(); else if(m.after) m.after(); } },180); }; })());
  const q=new URLSearchParams(location.search).get('m');
  const byPath={bandonhiet:'heat',radar:'radar',duongdua:'race'}[location.pathname.replace(/\//g,'')];
  const start=q||byPath||(location.hash||'').replace('#','');
  showMod(MODULES.some(m=>m.id===start)?start:'heat');
  $('#load').classList.add('off');
  setTimeout(()=>$('#load').remove(),420);
}
init();
})();
