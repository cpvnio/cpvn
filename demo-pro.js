/* ============================================================================
   CPVN PRO (DEMO) — demo-pro.js
   File ĐỘC LẬP: chỉ ĐỌC kho dữ liệu có sẵn (universe.json, data/eod/latest.json,
   data/hist/*.json) + demo-screen.json (gói chỉ báo do demo-build-screen.py tạo).
   Không import, không sửa core.js / chart.js / 3 trang đang chạy.
   ========================================================================== */
'use strict';
(function(){

/* ------------------------------------------------------------------ tiện ích */
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
/* đơn vị tỷ đồng — dưới 1 tỷ thì tự lùi về triệu, trên 1.000 tỷ thì lên nghìn tỷ */
const ty=function(n){ if(n==null||isNaN(n)) return '—';
  const a=Math.abs(n); if(a<1e9||a>=1e12) return vnd(n);
  return (n/1e9).toLocaleString('en-US',{maximumFractionDigits:1})+' tỷ'; };
/* tên công ty rút gọn — bỏ tiền tố pháp lý để cột tên đọc được trong ô hẹp */
function shortName(s){
  s=String(s||'').trim();
  let t=s.replace(/^(Ngân hàng (Thương mại )?Cổ phần|Ngân hàng TMCP|Tổng Công ty Cổ phần|Công ty Cổ phần|CTCP|Công ty TNHH|Tổng Công ty|Tập đoàn)\s+/i,'')
         .replace(/\s*[-–]\s*(Công ty Cổ phần|CTCP|Công ty TNHH)\s*$/i,'');
  return t.length>=3?t:s;
}
const pct=v=>v==null||isNaN(v)?'—':(v>0?'+':'')+(+v).toFixed(2)+'%';
const cls=v=>v==null||isNaN(v)?'':Math.abs(v)<0.005?'fl':v>0?'up':'dn';
const isLight=()=>document.documentElement.dataset.theme==='light';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const LS={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},
          set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

window.DP={};
DP.logoErr=function(el){
  const cdn=el.getAttribute('data-cdn');
  if(cdn){ el.removeAttribute('data-cdn'); el.src=cdn; return; }
  const s=el.getAttribute('data-sym')||'';
  el.outerHTML=`<span class="noimg">${esc(s.slice(0,2))}</span>`;
};
const logo=(c,k)=>`<img class="${k||'lg'}" src="assets/logo/${c.sym}.webp" loading="lazy" alt=""
  data-sym="${c.sym}"${c.img?` data-cdn="${esc(c.img)}"`:''} onerror="DP.logoErr(this)">`;

function toast(msg){
  const t=document.createElement('div'); t.className='tst'; t.innerHTML=msg;
  $('#toast').appendChild(t);
  setTimeout(()=>{ t.style.transition='opacity .3s'; t.style.opacity='0'; setTimeout(()=>t.remove(),320); },3400);
}

/* ------------------------------------------------------------------- dữ liệu */
const ST={ map:new Map(), list:[], date:'', indices:[], parents:[], sectors:[], vn30:new Set() };

async function loadAll(){
  const j=u=>fetch(u,{cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null);
  const [u,eod,pk]=await Promise.all([j('universe.json'),j('data/eod/latest.json'),j('demo-screen.json')]);
  if(!u) throw new Error('Không đọc được universe.json');
  ST.date=(eod&&eod.date)||'';
  ST.indices=(eod&&eod.indices)||[];
  ST.vn30=new Set(u.vn30||[]);
  for(const s of u.stocks){
    ST.map.set(s.sym,{ sym:s.sym, name:s.name, ex:s.ex, sector:s.sector||'Khác', parent:s.parent||'Khác',
      img:s.img||null, shares:s.shares||0, mcap:s.mcap||0, pe:s.pe==null?null:+s.pe, pb:s.pb==null?null:+s.pb,
      divY:s.divY==null?null:+s.divY, w:s.pct?s.pct.w:null, m:s.pct?s.pct.m:null, y:s.pct?s.pct.y:null,
      y5:s.pct?s.pct.y5:null, close:0,ref:0,o:0,h:0,l:0,vol:0,gtgd:0,fb:0,fs:0,chg:null,rpos:null,nnVal:0 });
  }
  if(eod&&eod.data) for(const r of eod.data){
    const c=ST.map.get(r.sym); if(!c) continue;
    c.close=r.close||0; c.ref=r.ref||0; c.o=r.o||0; c.h=r.h||0; c.l=r.l||0;
    c.vol=r.vol||0; c.gtgd=r.gtgd||0; c.fb=r.fBuy||0; c.fs=r.fSell||0;
    c.ceil=r.ceil||0; c.floor=r.floor||0;
    c.chg=c.ref>0&&c.close>0?(c.close-c.ref)/c.ref*100:null;
    c.rpos=(c.h>c.l)?(c.close-c.l)/(c.h-c.l):null;
    c.nnVal=(c.fb-c.fs)*c.close;
    c.mcapLive=c.shares?c.shares*c.close:c.mcap;
  }
  if(pk&&pk.d){                                   // gói chỉ báo: trải mảng số về đúng tên trường
    const F=pk.f;
    for(const sym in pk.d){
      const c=ST.map.get(sym); if(!c) continue;
      const a=pk.d[sym];
      for(let i=0;i<F.length;i++) c[F[i]]=a[i];
    }
  }
  ST.list=Array.from(ST.map.values());
  ST.parents=Array.from(new Set(ST.list.map(c=>c.parent))).sort();
  ST.sectors=Array.from(new Set(ST.list.map(c=>c.sector))).sort();
  $('#fdate').textContent='phiên '+(ST.date||'—');
}

/* thống kê toàn thị trường + chỉ số tâm lý tự tổng hợp */
function stats(){
  let up=0,dn=0,fl=0,ce=0,fo=0,gtgd=0,mcap=0,w=0,m=0,n=0;
  for(const c of ST.list){
    mcap+=c.mcapLive||c.mcap||0;
    if(c.w!=null){ w+=c.w; m+=c.m||0; n++; }
    if(!c.vol) continue;
    gtgd+=c.gtgd;
    if(c.ceil&&c.close>=c.ceil) ce++; else if(c.floor&&c.close<=c.floor) fo++;
    if(c.chg>0.01) up++; else if(c.chg<-0.01) dn++; else fl++;
  }
  const br=up+dn?up/(up+dn):.5;
  const sc=clamp(50+(br-.5)*100*1.0,0,100)*.5 + clamp(50+(w/Math.max(1,n))*4,0,100)*.25
         + clamp(50+(m/Math.max(1,n))*1.6,0,100)*.25;
  return {up,dn,fl,ce,fo,gtgd,mcap,mood:Math.round(sc)};
}

function renderMkt(){
  const s=stats();
  const moodTxt=s.mood>=75?'Tham lam':s.mood>=60?'Lạc quan':s.mood>=40?'Trung tính':s.mood>=25?'Thận trọng':'Sợ hãi';
  const moodCol=s.mood>=60?'var(--green)':s.mood>=40?'var(--yellow)':'var(--red)';
  const tot=Math.max(1,s.up+s.dn+s.fl);
  let h='';
  for(const i of ST.indices) h+=`<div class="mi"><span class="k">${esc(i.name)}</span>
    <span class="v">${(+i.value).toLocaleString('en-US',{maximumFractionDigits:2})}</span>
    <span class="s ${cls(i.chg)}">${pct(i.chg)}</span></div>`;
  h+=`<div class="mi"><span class="k">Thanh khoản</span><span class="v">${ty(s.gtgd)}</span>
      <span class="s" style="color:var(--muted)">Vốn hoá ${vnd(s.mcap)}</span></div>`;
  h+=`<div class="mi"><span class="k">Độ rộng thị trường</span>
      <span class="v bwrap"><span class="bbar">
        <i style="width:${s.up/tot*100}%;background:var(--green)"></i>
        <i style="width:${s.fl/tot*100}%;background:var(--yellow)"></i>
        <i style="width:${s.dn/tot*100}%;background:var(--red)"></i></span></span>
      <span class="s"><span class="up">▲${s.up}</span> <span class="fl">–${s.fl}</span>
      <span class="dn">▼${s.dn}</span>${s.ce?` <span class="ce">CE${s.ce}</span>`:''}${s.fo?` <span class="fo">FL${s.fo}</span>`:''}</span></div>`;
  h+=`<div class="mi"><span class="k">Tâm lý thị trường</span>
      <span class="v" style="color:${moodCol}">${s.mood}<span style="font-size:11px;color:var(--muted)">/100</span></span>
      <span class="s" style="color:${moodCol}">${moodTxt}</span></div>`;
  $('#mkt').innerHTML=h;
}

/* ------------------------------------------------------- khối dùng lại trong UI */
function modHead(title,desc,tags,why){
  return `<div class="modhead"><h1>${title}</h1><p>${desc}</p>
    <div class="evalbar">${tags.map(t=>`<span class="ev ${t[1]||''}">${t[0]}</span>`).join('')}
      <span class="why" onclick="this.parentNode.nextElementSibling.classList.toggle('on')">Vì sao nên làm ↓</span></div>
    <div class="whybox">${why}</div></div>`;
}
function rowHTML(c,metric,mcls){
  return `<div class="row" data-sym="${c.sym}">${logo(c)}
    <span class="id"><span class="sy">${c.sym}</span><span class="nm">${esc(shortName(c.name))}</span></span>
    <span class="pz ${cls(c.chg)}">${num(c.close)}</span>
    <span class="mt ${mcls||''}">${metric}</span></div>`;
}
function cardHTML(ic,title,rows,note){
  return `<div class="card"><div class="ch"><span class="ic">${ic}</span>${title}
      <span class="cnt">${rows.length}</span></div>
    <div class="cb">${rows.length?rows.join(''):`<div class="empty">Phiên này không có mã nào thoả</div>`}
    ${note?`<div class="empty" style="padding:7px 10px 2px;text-align:left">${note}</div>`:''}</div></div>`;
}
function bindRows(root){
  root.querySelectorAll('.row[data-sym],tr[data-sym],.tile[data-sym]').forEach(e=>{
    e.onclick=()=>openChart(e.dataset.sym);
  });
}

/* ================================================================= 1. RADAR */
function renderRadar(){
  const L=ST.list, liq=c=>(c.avgval20||0);
  const top=(f,s,n)=>L.filter(f).sort(s).slice(0,n||7);
  const cards=[];

  cards.push(cardHTML('🔥','Đột biến khối lượng',
    top(c=>c.volr>=2&&c.chg>0&&liq(c)>=2e9,(a,b)=>b.volr-a.volr)
      .map(c=>rowHTML(c,'×'+fx(c.volr,1)+' KL','up'))));

  cards.push(cardHTML('🏔️','Vượt / sát đỉnh 52 tuần',
    top(c=>c.dhi!=null&&c.dhi>=-3&&liq(c)>=5e8,(a,b)=>b.dhi-a.dhi)
      .map(c=>rowHTML(c,c.dhi>=-0.05?'đỉnh 52T':fx(c.dhi,1)+'%','up'))));

  cards.push(cardHTML('⚡','Cắt lên MA50 (10 phiên)',
    top(c=>c.cross===1&&liq(c)>=1e9,(a,b)=>b.rs-a.rs)
      .map(c=>rowHTML(c,'RS '+c.rs,c.rs>=70?'up':''))));

  cards.push(cardHTML('🧊','Quá bán đang hồi',
    top(c=>c.rsi!=null&&c.rsi<=35&&c.chg>0&&liq(c)>=1e9,(a,b)=>a.rsi-b.rsi)
      .map(c=>rowHTML(c,'RSI '+fx(c.rsi,0),'fo'))));

  cards.push(cardHTML('🌊','Khối ngoại mua ròng',
    top(c=>c.nnVal>0,(a,b)=>b.nnVal-a.nnVal)
      .map(c=>rowHTML(c,'+'+ty(c.nnVal),'up'))));

  cards.push(cardHTML('🩸','Khối ngoại bán ròng',
    top(c=>c.nnVal<0,(a,b)=>a.nnVal-b.nnVal)
      .map(c=>rowHTML(c,'−'+ty(-c.nnVal),'dn'))));

  cards.push(cardHTML('🎯','Đóng cửa ở đỉnh phiên',
    top(c=>c.rpos!=null&&c.rpos>=.92&&c.chg>=1.5&&c.gtgd>=3e9,(a,b)=>b.chg-a.chg)
      .map(c=>rowHTML(c,pct(c.chg),'up')),
    'Nến đóng sát giá cao nhất = bên mua kiểm soát tới cuối phiên.'));

  cards.push(cardHTML('🏆','RS Rating dẫn đầu',
    top(c=>c.rs>=93&&liq(c)>=3e9,(a,b)=>b.rs-a.rs)
      .map(c=>rowHTML(c,'RS '+c.rs,'up')),
    'RS 1–99: xếp hạng sức mạnh giá so với 1.522 mã (kiểu IBD).'));

  cards.push(cardHTML('💧','Vua thanh khoản phiên',
    top(c=>c.gtgd>0,(a,b)=>b.gtgd-a.gtgd)
      .map(c=>rowHTML(c,ty(c.gtgd)))));

  cards.push(cardHTML('📉','Giảm sâu — thủng đáy 52T',
    top(c=>c.dlo!=null&&c.dlo<=1.5&&liq(c)>=1e9,(a,b)=>a.chg-b.chg)
      .map(c=>rowHTML(c,pct(c.chg),'dn'))));

  cards.push(cardHTML('🐢','Nền tích luỹ cạn cung',
    top(c=>c.atrp!=null&&c.atrp<=2.6&&c.volr!=null&&c.volr<=.75&&c.ma20&&Math.abs(c.close/c.ma20-1)<=.03&&liq(c)>=2e9,
        (a,b)=>a.atrp-b.atrp)
      .map(c=>rowHTML(c,'ATR '+fx(c.atrp,1)+'%')),
    'Biên độ hẹp + khối lượng cạn quanh MA20 — trạng thái hay đi trước một cú bung.'));

  cards.push(cardHTML('💤','Cạn thanh khoản — tránh',
    top(c=>c.vol>0&&liq(c)<3e8,(a,b)=>a.avgval20-b.avgval20)
      .map(c=>rowHTML(c,ty(c.avgval20))),
    'GTGD trung bình 20 phiên dưới 0,3 tỷ — vào dễ, ra rất khó.'));

  $('#m-radar').innerHTML=modHead('Radar phiên','Toàn bộ 1.522 mã được quét bằng chỉ báo tính sẵn, gom thành các nhóm tín hiệu quen thuộc của trader. Đây là màn hình mở ra mỗi sáng — thứ khiến người dùng quay lại hằng ngày.',
    [['Hiệu quả: rất cao','hi'],['Lan truyền: rất cao','vi'],['Công sức: 1–2 ngày']],
    `<b>Vì sao đây là tính năng số 1:</b> bảng giá trả lời “giá bao nhiêu”, còn radar trả lời <b>“hôm nay có gì đáng chú ý”</b> — đúng câu hỏi trader mở app lên để hỏi.
     Mỗi thẻ là một chiến lược có thật (đột biến KL, breakout đỉnh 52 tuần, golden cross, quá bán hồi phục, dòng tiền ngoại).
     Đây cũng là nội dung <b>tự sinh ra để đăng lên nhóm/fanpage mỗi ngày</b> — nguồn kéo cộng đồng rẻ nhất.
     Toàn bộ 12 thẻ này chạy từ <b>một file 225 KB</b> tính sẵn, không gọi thêm API nào.`)
    +`<div class="ctl"><button class="btn gh" id="shotRadar">📷 Chụp ảnh chia sẻ</button>
      <span style="color:var(--muted);font-size:12px">Quét ${ST.list.length.toLocaleString('en-US')} mã · phiên ${ST.date}</span></div>`
    +`<div class="grid g4" id="radarGrid">${cards.join('')}</div>`;
  bindRows($('#m-radar'));
  $('#shotRadar').onclick=()=>shot($('#radarGrid'),'cpvn-radar-'+ST.date);
}

/* ============================================================== 2. BẢN ĐỒ NHIỆT */
const HM={size:'mcap',color:'chg',scope:'all',n:200};
function heatColor(p,cap){
  const light=isLight();
  const NEU=light?[186,192,200]:[56,56,66];
  if(p==null||isNaN(p)) return {bg:`rgb(${NEU.join(',')})`,fg:light?'#10131a':'#c9c9d2'};
  const t=clamp(p/cap,-1,1), a=Math.abs(t);
  const C=t>=0?[22,199,132]:[234,57,67];
  const rgb=NEU.map((v,i)=>Math.round(v+(C[i]-v)*Math.pow(a,.72)));
  const lum=(rgb[0]*.299+rgb[1]*.587+rgb[2]*.114)/255;
  return {bg:`rgb(${rgb.join(',')})`,fg:lum>.62?'#0d1016':'#ffffff'};
}
function squarify(items,X,Y,W,H){
  const out=[]; const list=items.filter(d=>d.v>0).slice().sort((a,b)=>b.v-a.v);
  const total=list.reduce((s,d)=>s+d.v,0); if(!total||W<=0||H<=0) return out;
  let x=X,y=Y,w=W,h=H,scale=(W*H)/total,i=0;
  const worst=(ar,side)=>{ const s=ar.reduce((a,b)=>a+b,0), mx=Math.max.apply(null,ar), mn=Math.min.apply(null,ar);
    return Math.max(side*side*mx/(s*s), (s*s)/(side*side*mn)); };
  while(i<list.length&&w>.5&&h>.5){
    const side=Math.min(w,h); const row=[],areas=[];
    while(i<list.length){
      const a=Math.max(list[i].v*scale,.0001);
      if(areas.length&&worst(areas,side)<worst(areas.concat([a]),side)) break;
      areas.push(a); row.push(list[i]); i++;
    }
    const sum=areas.reduce((a,b)=>a+b,0);
    if(w>=h){ const rw=sum/h; let cy=y;
      row.forEach((d,k)=>{ const rh=areas[k]/rw; out.push({d,x,y:cy,w:rw,h:rh}); cy+=rh; });
      x+=rw; w-=rw;
    }else{ const rh=sum/w; let cx=x;
      row.forEach((d,k)=>{ const rw2=areas[k]/rh; out.push({d,x:cx,y,w:rw2,h:rh}); cx+=rw2; });
      y+=rh; h-=rh; }
  }
  return out;
}
function drawHeat(){
  const box=$('#tmap'); if(!box) return;
  const W=box.clientWidth, H=box.clientHeight;
  const key=HM.color, cap={chg:6,w:14,m:26,y:80}[key];
  let L=ST.list.filter(c=>(c.mcapLive||c.mcap)>0&&c.close>0);
  if(HM.scope==='vn30') L=L.filter(c=>ST.vn30.has(c.sym));
  else if(HM.scope!=='all') L=L.filter(c=>c.ex===HM.scope);
  const sz=c=>HM.size==='mcap'?(c.mcapLive||c.mcap):(c.gtgd||0);
  L=L.filter(c=>sz(c)>0).sort((a,b)=>sz(b)-sz(a)).slice(0,HM.n);
  const groups={};
  for(const c of L){ (groups[c.parent]=groups[c.parent]||[]).push(c); }
  const gitems=Object.keys(groups).map(k=>({k,v:groups[k].reduce((s,c)=>s+sz(c),0)}));
  const grects=squarify(gitems,0,0,W,H);
  let html='';
  for(const g of grects){
    const inner=squarify(groups[g.d.k].map(c=>({k:c.sym,v:sz(c),c})),
      g.x+1,g.y+18,Math.max(0,g.w-2),Math.max(0,g.h-19));
    let tiles='';
    for(const t of inner){
      const c=t.d.c, p=key==='chg'?c.chg:c[key];
      const col=heatColor(p,cap);
      const fs=clamp(Math.min(t.w,t.h)*.32,7,19), showPct=t.h>=30&&t.w>=42;
      tiles+=`<div class="tile" data-sym="${c.sym}" style="left:${t.x-g.x}px;top:${t.y-g.y}px;
        width:${t.w}px;height:${t.h}px;background:${col.bg}">
        ${t.w>22&&t.h>15?`<b style="font-size:${fs}px;color:${col.fg}">${c.sym}</b>`:''}
        ${showPct?`<i style="font-size:${clamp(fs*.62,7,12)}px;color:${col.fg}">${pct(p)}</i>`:''}</div>`;
    }
    html+=`<div class="tgrp" style="left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${g.h}px">
      <div class="gl">${esc(g.d.k)}</div>${tiles}</div>`;
  }
  box.innerHTML=html;
  const tip=$('#ttip');
  box.querySelectorAll('.tile').forEach(e=>{
    const c=ST.map.get(e.dataset.sym);
    e.onmousemove=ev=>{
      tip.style.display='block';
      tip.innerHTML=`<div class="t">${c.sym} <span class="${cls(c.chg)}" style="font-size:12px">${pct(c.chg)}</span></div>
        <div class="r" style="max-width:210px;white-space:normal">${esc(c.name)}</div>
        <div class="r"><span>Giá</span><b>${num(c.close)}</b></div>
        <div class="r"><span>Vốn hoá</span><b>${vnd(c.mcapLive||c.mcap)}</b></div>
        <div class="r"><span>GTGD</span><b>${ty(c.gtgd)}</b></div>
        <div class="r"><span>1 tuần / 1 tháng</span><b class="${cls(c.w)}">${pct(c.w)}</b> <b class="${cls(c.m)}">${pct(c.m)}</b></div>
        <div class="r"><span>RS Rating</span><b>${c.rs||'—'}</b></div>`;
      const w=tip.offsetWidth,h=tip.offsetHeight;
      tip.style.left=Math.min(ev.clientX+14,innerWidth-w-10)+'px';
      tip.style.top=Math.min(ev.clientY+14,innerHeight-h-10)+'px';
    };
    e.onmouseleave=()=>{ tip.style.display='none'; };
    e.onclick=()=>openChart(c.sym);
  });
}
function renderHeat(){
  const seg=(id,opts,cur)=>`<div class="seg" id="${id}">`+
    opts.map(o=>`<button data-v="${o[0]}" class="${o[0]===cur?'on':''}">${o[1]}</button>`).join('')+'</div>';
  $('#m-heat').innerHTML=modHead('Bản đồ nhiệt thị trường',
    'Toàn thị trường trong một khung hình: ô to = vốn hoá lớn, màu = mức tăng/giảm, xếp theo nhóm ngành. Nhìn 2 giây là biết tiền đang ở đâu.',
    [['Hiệu quả: cao','hi'],['Lan truyền: rất cao','vi'],['Công sức: 1 ngày']],
    `<b>Đây là tính năng dễ lan truyền nhất.</b> Ảnh chụp bản đồ nhiệt cuối phiên là dạng nội dung được chia sẻ nhiều nhất
     trong mọi cộng đồng chứng khoán (Finviz sống nhờ nó). Nó cũng bổ sung đúng thứ trang bong bóng chưa làm được:
     <b>so sánh theo ngành và theo quy mô cùng lúc</b>, bố cục ổn định nên mắt đọc rất nhanh.
     Gắn sẵn nút chụp ảnh có đóng dấu CPVN.IO thì mỗi ảnh chia sẻ là một lần quảng cáo miễn phí.`)
    +`<div class="ctl">
       <span class="lb">Kích thước</span>${seg('hmSize',[['mcap','Vốn hoá'],['gtgd','GTGD']],HM.size)}
       <span class="lb">Màu theo</span>${seg('hmColor',[['chg','1 ngày'],['w','1 tuần'],['m','1 tháng'],['y','1 năm']],HM.color)}
       <span class="lb">Phạm vi</span>${seg('hmScope',[['all','Tất cả'],['vn30','VN30'],['HOSE','HOSE'],['HNX','HNX'],['UPCOM','UPCOM']],HM.scope)}
       <span class="lb">Số mã</span>${seg('hmN',[[100,'100'],[200,'200'],[400,'400'],[800,'800']],HM.n)}
       <button class="btn gh" id="shotHeat">📷 Chụp ảnh</button>
       <span class="legend">−${({chg:6,w:14,m:26,y:80})[HM.color]}%
         <i style="background:${heatColor(-9,6).bg}"></i><i style="background:${heatColor(-2.5,6).bg}"></i>
         <i style="background:${heatColor(0,6).bg}"></i><i style="background:${heatColor(2.5,6).bg}"></i>
         <i style="background:${heatColor(9,6).bg}"></i> +${({chg:6,w:14,m:26,y:80})[HM.color]}%</span>
     </div><div id="tmap"></div>`;
  const bind=(id,k,cast)=>{ const box=$('#'+id); if(!box) return;
    box.querySelectorAll('button').forEach(b=>b.onclick=()=>{
      box.querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
      HM[k]=cast?cast(b.dataset.v):b.dataset.v; if(k==='color') renderHeat(); else drawHeat(); }); };
  bind('hmSize','size'); bind('hmColor','color'); bind('hmScope','scope'); bind('hmN','n',Number);
  $('#shotHeat').onclick=()=>shot($('#tmap'),'cpvn-heatmap-'+ST.date);
  requestAnimationFrame(drawHeat);
}

/* ================================================================ 3. BỘ LỌC */
const SCR={ f:{}, sort:'mcap', dir:-1, preset:null };
const FDEF=[
  {k:'mcap',  n:'Vốn hoá (tỷ)',      g:c=>(c.mcapLive||c.mcap)/1e9},
  {k:'val',   n:'GTGD TB20 (tỷ)',    g:c=>(c.avgval20||0)/1e9},
  {k:'price', n:'Giá (đ)',           g:c=>c.close},
  {k:'pe',    n:'P/E',               g:c=>c.pe},
  {k:'pb',    n:'P/B',               g:c=>c.pb},
  {k:'divY',  n:'Cổ tức (%)',        g:c=>c.divY},
  {k:'rs',    n:'RS Rating (1–99)',  g:c=>c.rs},
  {k:'rsi',   n:'RSI 14',            g:c=>c.rsi},
  {k:'volr',  n:'KL / TB20 (lần)',   g:c=>c.volr},
  {k:'r5',    n:'% 1 tuần',          g:c=>c.r5},
  {k:'r20',   n:'% 1 tháng',         g:c=>c.r20},
  {k:'r250',  n:'% 1 năm',           g:c=>c.r250},
  {k:'dhi',   n:'Cách đỉnh 52T (%)', g:c=>c.dhi},
  {k:'atrp',  n:'Biên độ ATR (%)',   g:c=>c.atrp},
];
const PRESETS=[
  {n:'🚀 Đà tăng bứt phá', f:{rs:[85,null],volr:[1.2,null],val:[5,null],dhi:[-8,null]},
   d:'RS ≥ 85, khối lượng trên trung bình, còn sát đỉnh 52 tuần, thanh khoản ≥ 5 tỷ/phiên'},
  {n:'🧊 Quá bán hồi phục', f:{rsi:[null,35],val:[3,null],r250:[0,null]},
   d:'RSI ≤ 35 nhưng xu hướng 1 năm vẫn dương — bắt nhịp chỉnh của cổ phiếu tốt'},
  {n:'💎 Định giá rẻ + cổ tức', f:{pe:[0,10],pb:[null,1.5],divY:[4,null],val:[1,null]},
   d:'P/E ≤ 10, P/B ≤ 1,5, cổ tức ≥ 4%/năm'},
  {n:'🏔️ Sát đỉnh 52 tuần', f:{dhi:[-3,null],val:[3,null]},
   d:'Cách đỉnh 52 tuần không quá 3% — vùng breakout kinh điển'},
  {n:'🐢 Nền chặt sắp bung', f:{atrp:[null,2.6],volr:[null,.8],val:[2,null],rs:[60,null]},
   d:'Biên độ hẹp, khối lượng cạn, RS vẫn khoẻ'},
  {n:'💰 Vua thanh khoản', f:{val:[30,null]},
   d:'GTGD trung bình 20 phiên ≥ 30 tỷ — nhóm tiền lớn thật sự chơi'},
  {n:'🌊 Khối ngoại gom', f:{val:[3,null]}, nn:true,
   d:'Khối ngoại mua ròng luỹ kế 30 phiên, sắp xếp theo giá trị gom'},
];
function scrRows(){
  let L=ST.list.filter(c=>c.close>0&&c.nsess);
  const f=SCR.f;
  for(const d of FDEF){
    const r=f[d.k]; if(!r) continue;
    if(r[0]!=null) L=L.filter(c=>{const v=d.g(c); return v!=null&&v>=r[0];});
    if(r[1]!=null) L=L.filter(c=>{const v=d.g(c); return v!=null&&v<=r[1];});
  }
  if(f.ex&&f.ex!=='all') L=f.ex==='VN30'?L.filter(c=>ST.vn30.has(c.sym)):L.filter(c=>c.ex===f.ex);
  if(f.sector&&f.sector!=='all') L=L.filter(c=>c.parent===f.sector);
  if(f.nn) L=L.filter(c=>(c.nn20||0)>0);
  if(f.maUp) L=L.filter(c=>c.ma20&&c.ma50&&c.close>c.ma20&&c.ma20>c.ma50);
  const k=SCR.sort, d=SCR.dir;
  const gv=c=>k==='sym'?c.sym:k==='mcap'?(c.mcapLive||c.mcap):k==='val'?(c.avgval20||0):
    k==='chg'?(c.chg==null?-1e9:c.chg):(c[k]==null?-1e9:c[k]);
  L.sort((a,b)=>{const x=gv(a),y=gv(b);return typeof x==='string'?d*x.localeCompare(y):d*(x-y);});
  return L;
}
function scrSentence(){
  const parts=[];
  for(const d of FDEF){ const r=SCR.f[d.k]; if(!r) continue;
    if(r[0]!=null&&r[1]!=null) parts.push(`<b>${d.n}</b> từ ${r[0]} đến ${r[1]}`);
    else if(r[0]!=null) parts.push(`<b>${d.n}</b> ≥ ${r[0]}`);
    else parts.push(`<b>${d.n}</b> ≤ ${r[1]}`); }
  if(SCR.f.ex&&SCR.f.ex!=='all') parts.push(`sàn <b>${SCR.f.ex}</b>`);
  if(SCR.f.sector&&SCR.f.sector!=='all') parts.push(`ngành <b>${esc(SCR.f.sector)}</b>`);
  if(SCR.f.nn) parts.push('<b>khối ngoại mua ròng 30 phiên</b>');
  if(SCR.f.maUp) parts.push('<b>giá > MA20 > MA50</b>');
  return parts.length?('Đang tìm cổ phiếu có '+parts.join(' · ')):'Chưa đặt điều kiện nào — đang hiện toàn bộ thị trường.';
}
function renderScreenTable(){
  const L=scrRows();
  $('#scrSent').innerHTML=scrSentence()+` → <b>${L.length}</b> mã.`;
  const th=(k,n,w)=>`<th data-k="${k}" class="${SCR.sort===k?'srt':''}${w?' l':''}">${n}</th>`;
  const rows=L.slice(0,300).map((c,i)=>`<tr data-sym="${c.sym}">
    <td style="color:var(--faint)">${i+1}</td>
    <td class="l"><div class="co">${logo(c,'')}<div><b>${c.sym}</b><span>${esc(shortName(c.name))}</span></div></div></td>
    <td>${num(c.close)}</td>
    <td class="${cls(c.chg)}">${pct(c.chg)}</td>
    <td><span class="rsbar"><i style="width:${c.rs||0}%;background:${c.rs>=80?'var(--green)':c.rs>=50?'var(--yellow)':'var(--red)'}"></i></span>${c.rs||'—'}</td>
    <td class="${c.rsi>=70?'dn':c.rsi<=30?'up':''}">${fx(c.rsi,0)}</td>
    <td class="${c.volr>=2?'up':''}">${c.volr!=null?'×'+fx(c.volr,1):'—'}</td>
    <td class="${cls(c.r20)}">${pct(c.r20)}</td>
    <td class="${cls(c.r250)}">${pct(c.r250)}</td>
    <td class="${c.dhi>=-3?'up':''}">${fx(c.dhi,1)}%</td>
    <td>${ty(c.avgval20)}</td>
    <td>${vnd(c.mcapLive||c.mcap)}</td>
    <td>${c.pe!=null?fx(c.pe,1):'—'}</td></tr>`).join('');
  $('#scrTbl').innerHTML=`<table class="tbl"><thead><tr>
    <th>#</th>${th('sym','Cổ phiếu',1)}${th('price','Giá')}${th('chg','1D%')}${th('rs','RS')}
    ${th('rsi','RSI')}${th('volr','KL/TB')}${th('r20','1 tháng')}${th('r250','1 năm')}
    ${th('dhi','Cách đỉnh')}${th('val','GTGD TB20')}${th('mcap','Vốn hoá')}${th('pe','P/E')}
    </tr></thead><tbody>${rows||'<tr><td colspan="13" style="text-align:center;padding:26px;color:var(--faint)">Không mã nào thoả — nới điều kiện xem sao</td></tr>'}</tbody></table>`;
  $('#scrTbl').querySelectorAll('th[data-k]').forEach(t=>t.onclick=()=>{
    const k=t.dataset.k;
    if(SCR.sort===k) SCR.dir*=-1; else { SCR.sort=k; SCR.dir=k==='sym'?1:-1; }
    renderScreenTable();
  });
  bindRows($('#scrTbl'));
}
function renderScreen(){
  const flds=FDEF.map(d=>`<div class="f"><label class="lb">${d.n}</label>
    <div class="fr"><input type="number" placeholder="từ" data-f="${d.k}" data-i="0"/>
    <input type="number" placeholder="đến" data-f="${d.k}" data-i="1"/></div></div>`).join('');
  $('#m-screen').innerHTML=modHead('Bộ lọc cổ phiếu (Screener)',
    'Lọc 1.522 mã theo 14 tiêu chí cơ bản + kỹ thuật, hoặc bấm một chiến lược dựng sẵn. Kết quả ra tức thì vì chỉ báo đã tính sẵn phía server.',
    [['Hiệu quả: rất cao','hi'],['Giữ chân người dùng','vi'],['Công sức: 2 ngày']],
    `<b>Đây là tính năng trader trả tiền để dùng.</b> Không có screener, người dùng chỉ xem tin rồi đi;
     có screener, họ dùng web như một công cụ làm việc mỗi ngày. Điểm mạnh của CPVN: mọi trang khác tính chỉ báo bằng
     API trả phí, còn ở đây <b>kho hist 6,5 năm đã nằm sẵn trong repo</b> — chỉ tốn 1,4 giây mỗi phiên để tính cho cả thị trường.
     Nên bổ sung: lưu bộ lọc, chia sẻ bộ lọc qua đường dẫn (?f=...) — bộ lọc được chia sẻ chính là kênh kéo người mới.`)
    +`<div class="presets" id="presets">${PRESETS.map((p,i)=>`<button class="preset" data-i="${i}" title="${esc(p.d)}">${p.n}</button>`).join('')}
        <button class="preset" data-i="-1">✕ Xoá lọc</button></div>
      <div class="filters" id="scrF">${flds}
        <div class="f"><label class="lb">Sàn</label><select data-s="ex">
          <option value="all">Tất cả</option><option>HOSE</option><option>HNX</option><option>UPCOM</option><option>VN30</option></select></div>
        <div class="f"><label class="lb">Nhóm ngành</label><select data-s="sector">
          <option value="all">Tất cả</option>${ST.parents.map(p=>`<option>${esc(p)}</option>`).join('')}</select></div>
        <div class="f"><label class="lb">Điều kiện thêm</label>
          <div class="fr" style="gap:10px;font-size:12px;color:var(--txt2)">
            <label><input type="checkbox" data-c="maUp"/> Giá&gt;MA20&gt;MA50</label>
            <label><input type="checkbox" data-c="nn"/> NN gom</label></div></div>
      </div>
      <div class="qsent" id="scrSent"></div>
      <div class="scroll" id="scrTbl"></div>`;
  const F=$('#scrF');
  F.querySelectorAll('input[type=number]').forEach(inp=>inp.oninput=()=>{
    const k=inp.dataset.f, i=+inp.dataset.i, v=inp.value===''?null:+inp.value;
    SCR.f[k]=SCR.f[k]||[null,null]; SCR.f[k][i]=v;
    if(SCR.f[k][0]==null&&SCR.f[k][1]==null) delete SCR.f[k];
    renderScreenTable();
  });
  F.querySelectorAll('select').forEach(s=>s.onchange=()=>{ SCR.f[s.dataset.s]=s.value; renderScreenTable(); });
  F.querySelectorAll('input[type=checkbox]').forEach(c=>c.onchange=()=>{ SCR.f[c.dataset.c]=c.checked; renderScreenTable(); });
  $('#presets').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    $('#presets').querySelectorAll('button').forEach(x=>x.classList.remove('on'));
    const i=+b.dataset.i;
    SCR.f={};
    F.querySelectorAll('input[type=number]').forEach(x=>x.value='');
    F.querySelectorAll('input[type=checkbox]').forEach(x=>x.checked=false);
    F.querySelectorAll('select').forEach(x=>x.value='all');
    if(i>=0){ b.classList.add('on');
      const p=PRESETS[i]; Object.assign(SCR.f,JSON.parse(JSON.stringify(p.f)));
      if(p.nn){ SCR.f.nn=true; F.querySelector('[data-c=nn]').checked=true; SCR.sort='nn20'; }
      for(const k in p.f){ const r=p.f[k];
        const a=F.querySelector(`input[data-f="${k}"][data-i="0"]`), z=F.querySelector(`input[data-f="${k}"][data-i="1"]`);
        if(a&&r[0]!=null) a.value=r[0]; if(z&&r[1]!=null) z.value=r[1]; }
    }
    renderScreenTable();
  });
  renderScreenTable();
}

/* ============================================================== 4. BIỂU ĐỒ PRO */
const CH={sym:null,iv:'D',all:[],rows:[],i0:0,i1:0,hover:-1,drag:null,
  ind:{ma20:1,ma50:1,ma200:0,bb:0},osc:'rsi',cmp:[],cache:new Map()};
const CMPCOL=['#2dd4bf','#f0b429','#c026d3','#38bdf8'];
async function histOf(sym){
  if(CH.cache.has(sym)) return CH.cache.get(sym);
  const d=await fetch(`data/hist/${sym}.json`).then(r=>r.ok?r.json():null).catch(()=>null);
  let rows=null;
  if(d&&d.t&&d.t.length) rows=d.t.map((t,i)=>({t,o:d.o[i],h:d.h[i],l:d.l[i],c:d.c[i],v:d.v[i]||0,
    fb:(d.fb||[])[i]||0,fs:(d.fs||[])[i]||0}));
  CH.cache.set(sym,rows); return rows;
}
function aggr(rows,iv){
  if(iv==='D'||!rows) return rows||[];
  const key=iv==='W'?r=>Math.floor((Math.floor((r.t+25200)/86400)+3)/7)
    :r=>{const d=new Date((r.t+25200)*1000);return d.getUTCFullYear()*12+d.getUTCMonth();};
  const out=[]; let cur=null,k0=null;
  for(const r of rows){ const k=key(r);
    if(k!==k0){ if(cur)out.push(cur); cur={t:r.t,o:r.o,h:r.h,l:r.l,c:r.c,v:r.v}; k0=k; }
    else{ cur.h=Math.max(cur.h,r.h); cur.l=Math.min(cur.l,r.l); cur.c=r.c; cur.v+=r.v; } }
  if(cur) out.push(cur); return out;
}
function maSeries(c,n){ const o=[];let s=0;
  for(let i=0;i<c.length;i++){ s+=c[i]; if(i>=n)s-=c[i-n]; o.push(i>=n-1?s/n:null); } return o; }
function rsiSeries(c,n){
  const o=new Array(c.length).fill(null); if(c.length<n+1) return o;
  let g=0,l=0;
  for(let i=1;i<=n;i++){ const d=c[i]-c[i-1]; g+=Math.max(d,0); l+=Math.max(-d,0); }
  g/=n; l/=n; o[n]=l===0?100:100-100/(1+g/l);
  for(let i=n+1;i<c.length;i++){ const d=c[i]-c[i-1];
    g=(g*(n-1)+Math.max(d,0))/n; l=(l*(n-1)+Math.max(-d,0))/n;
    o[i]=l===0?100:100-100/(1+g/l); }
  return o;
}
function emaSeries(c,n){ const k=2/(n+1),o=[];let e=null;
  for(const v of c){ e=e==null?v:v*k+e*(1-k); o.push(e); } return o; }
function macdSeries(c){
  const a=emaSeries(c,12),b=emaSeries(c,26), line=a.map((v,i)=>v-b[i]), sig=emaSeries(line,9);
  return {line,sig,hist:line.map((v,i)=>v-sig[i])};
}
function bbSeries(c,n,k){
  const ma=maSeries(c,n),up=[],lo=[];
  for(let i=0;i<c.length;i++){ if(ma[i]==null){up.push(null);lo.push(null);continue;}
    let s=0; for(let j=i-n+1;j<=i;j++) s+=(c[j]-ma[i])**2;
    const sd=Math.sqrt(s/n); up.push(ma[i]+k*sd); lo.push(ma[i]-k*sd); }
  return {ma,up,lo};
}
function chartCalc(){
  const c=CH.rows.map(r=>r.c);
  CH.calc={ma20:maSeries(c,20),ma50:maSeries(c,50),ma200:maSeries(c,200),
    bb:bbSeries(c,20,2),rsi:rsiSeries(c,14),macd:macdSeries(c)};
}
function chartReset(){ const n=CH.rows.length,d=CH.iv==='D'?160:CH.iv==='W'?150:120;
  CH.i1=n; CH.i0=Math.max(0,n-Math.min(n,d)); }
function drawChart(){
  const cv=$('#cvMain'); if(!cv||!CH.rows.length) return;
  const dpr=Math.min(2,devicePixelRatio||1), W=cv.clientWidth, H=cv.clientHeight;
  cv.width=W*dpr; cv.height=H*dpr;
  const x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,W,H);
  const light=isLight(), GRID=light?'rgba(0,0,0,.07)':'rgba(255,255,255,.055)',
        MUT=light?'#6b7280':'#7d7d8d', UP='#16c784', DN='#ea3943';
  if(CH.cmp.length){ drawCompare(x,W,H,GRID,MUT); return; }
  const padR=62, padT=12, oscH=CH.osc==='none'?0:Math.round(H*.19), volH=Math.round(H*.13);
  const priceH=H-padT-oscH-volH-24;
  const i0=Math.round(CH.i0), i1=Math.round(CH.i1), vis=CH.rows.slice(i0,i1), n=vis.length;
  if(!n) return;
  let mn=Infinity,mx=-Infinity,vmax=0;
  for(const r of vis){ mn=Math.min(mn,r.l); mx=Math.max(mx,r.h); vmax=Math.max(vmax,r.v||0); }
  const S=CH.calc, add=(arr)=>{ for(let i=i0;i<i1;i++){ const v=arr[i]; if(v!=null){mn=Math.min(mn,v);mx=Math.max(mx,v);} } };
  if(CH.ind.ma20)add(S.ma20); if(CH.ind.ma50)add(S.ma50); if(CH.ind.ma200)add(S.ma200);
  if(CH.ind.bb){add(S.bb.up);add(S.bb.lo);}
  const pad=(mx-mn)*.06||1; mn-=pad; mx+=pad;
  const plotW=W-padR, cw=plotW/n, bw=Math.max(1,Math.min(15,cw*.68));
  const cx=i=>i*cw+cw/2, py=v=>padT+(mx-v)/(mx-mn)*priceH;
  // lưới + trục giá
  x.font='10.5px system-ui'; x.textBaseline='middle';
  for(let k=0;k<=4;k++){ const v=mn+(mx-mn)*k/4, yy=py(v);
    x.strokeStyle=GRID; x.beginPath(); x.moveTo(0,yy); x.lineTo(plotW,yy); x.stroke();
    x.fillStyle=MUT; x.textAlign='left';
    x.fillText(v>=1000?(v/1000).toFixed(v>=10000?1:2)+'K':Math.round(v),plotW+6,yy); }
  // Bollinger
  if(CH.ind.bb){
    x.fillStyle=light?'rgba(45,212,191,.10)':'rgba(45,212,191,.08)';
    x.beginPath(); let st=false;
    for(let i=0;i<n;i++){ const v=S.bb.up[i0+i]; if(v==null)continue; st?x.lineTo(cx(i),py(v)):x.moveTo(cx(i),py(v)); st=true; }
    for(let i=n-1;i>=0;i--){ const v=S.bb.lo[i0+i]; if(v==null)continue; x.lineTo(cx(i),py(v)); }
    x.closePath(); x.fill();
  }
  // khối lượng
  const volTop=padT+priceH+12;
  for(let i=0;i<n;i++){ const r=vis[i], up=r.c>=r.o, h2=vmax?(r.v/vmax)*(volH-4):0;
    x.fillStyle=up?'rgba(22,199,132,.42)':'rgba(234,57,67,.42)';
    x.fillRect(cx(i)-bw/2,volTop+volH-h2,bw,h2); }
  // nến
  for(let i=0;i<n;i++){ const r=vis[i], up=r.c>=r.o, col=up?UP:DN, X=cx(i);
    x.strokeStyle=col; x.lineWidth=Math.min(1.5,Math.max(1,bw*.13));
    x.beginPath(); x.moveTo(X,py(r.h)); x.lineTo(X,py(r.l)); x.stroke();
    x.fillStyle=col; const a=py(Math.max(r.o,r.c)),b=py(Math.min(r.o,r.c));
    x.fillRect(X-bw/2,a,bw,Math.max(1,b-a)); }
  // MA
  const line=(arr,col,w)=>{ x.strokeStyle=col; x.lineWidth=w||1.4; x.beginPath(); let st=false;
    for(let i=0;i<n;i++){ const v=arr[i0+i]; if(v==null)continue; st?x.lineTo(cx(i),py(v)):x.moveTo(cx(i),py(v)); st=true; }
    if(st)x.stroke(); };
  if(CH.ind.ma20) line(S.ma20,'rgba(234,179,8,.9)');
  if(CH.ind.ma50) line(S.ma50,'rgba(56,189,248,.9)');
  if(CH.ind.ma200)line(S.ma200,'rgba(192,38,211,.85)',1.6);
  // vạch giá cuối
  const lastC=vis[n-1].c, yl=py(lastC), lcol=lastC>=vis[0].o?UP:DN;
  x.setLineDash([3,3]); x.strokeStyle=lcol+'88'; x.beginPath(); x.moveTo(0,yl); x.lineTo(plotW,yl); x.stroke(); x.setLineDash([]);
  x.fillStyle=lcol; x.fillRect(plotW,yl-8,padR,16);
  x.fillStyle='#fff'; x.font='700 10.5px system-ui'; x.textAlign='left';
  x.fillText(lastC>=1000?(lastC/1000).toFixed(2)+'K':Math.round(lastC),plotW+6,yl);
  // dao động
  if(CH.osc!=='none'){
    const oy=padT+priceH+volH+18, oh=oscH-12;
    x.strokeStyle=GRID; x.beginPath(); x.moveTo(0,oy-6); x.lineTo(plotW,oy-6); x.stroke();
    if(CH.osc==='rsi'){
      const yy=v=>oy+(100-v)/100*oh;
      x.strokeStyle=GRID; x.setLineDash([3,3]);
      [30,70].forEach(v=>{ x.beginPath(); x.moveTo(0,yy(v)); x.lineTo(plotW,yy(v)); x.stroke(); });
      x.setLineDash([]);
      x.fillStyle=MUT; x.font='9.5px system-ui'; x.textAlign='left';
      x.fillText('70',plotW+6,yy(70)); x.fillText('30',plotW+6,yy(30));
      x.strokeStyle='#a78bfa'; x.lineWidth=1.4; x.beginPath(); let st=false;
      for(let i=0;i<n;i++){ const v=S.rsi[i0+i]; if(v==null)continue; st?x.lineTo(cx(i),yy(v)):x.moveTo(cx(i),yy(v)); st=true; }
      if(st)x.stroke();
      x.fillStyle=MUT; x.font='700 10px system-ui'; x.fillText('RSI 14',6,oy+9);
    }else{
      let hm=0; for(let i=i0;i<i1;i++) hm=Math.max(hm,Math.abs(S.macd.hist[i]||0),Math.abs(S.macd.line[i]||0));
      hm=hm||1; const yy=v=>oy+oh/2-(v/hm)*(oh/2-3);
      x.strokeStyle=GRID; x.beginPath(); x.moveTo(0,yy(0)); x.lineTo(plotW,yy(0)); x.stroke();
      for(let i=0;i<n;i++){ const v=S.macd.hist[i0+i]||0;
        x.fillStyle=v>=0?'rgba(22,199,132,.6)':'rgba(234,57,67,.6)';
        x.fillRect(cx(i)-bw/2,Math.min(yy(0),yy(v)),bw,Math.abs(yy(v)-yy(0))); }
      x.strokeStyle='#38bdf8'; x.lineWidth=1.3; x.beginPath();
      for(let i=0;i<n;i++){ const v=S.macd.line[i0+i]; i?x.lineTo(cx(i),yy(v)):x.moveTo(cx(i),yy(v)); } x.stroke();
      x.strokeStyle='#f0b429'; x.beginPath();
      for(let i=0;i<n;i++){ const v=S.macd.sig[i0+i]; i?x.lineTo(cx(i),yy(v)):x.moveTo(cx(i),yy(v)); } x.stroke();
      x.fillStyle=MUT; x.font='700 10px system-ui'; x.textAlign='left'; x.fillText('MACD 12/26/9',6,oy+9);
    }
  }
  // trục thời gian
  x.fillStyle=MUT; x.font='10px system-ui'; x.textAlign='center'; x.textBaseline='alphabetic';
  const steps=Math.max(2,Math.floor(plotW/92));
  for(let k=0;k<=steps;k++){ const i=Math.round(k*(n-1)/steps); if(i<0||i>=n)continue;
    const d=new Date((vis[i].t+25200)*1000), X=cx(i);
    const lb=CH.iv==='M'?`T${d.getUTCMonth()+1}/${String(d.getUTCFullYear()).slice(2)}`
      :CH.iv==='W'?`${d.getUTCDate()}/${d.getUTCMonth()+1}/${String(d.getUTCFullYear()).slice(2)}`
      :`${d.getUTCDate()}/${d.getUTCMonth()+1}`;
    if(X<plotW-16){ x.strokeStyle=GRID; x.beginPath(); x.moveTo(X,padT); x.lineTo(X,padT+priceH); x.stroke();
      x.fillStyle=MUT; x.fillText(lb,X,H-4); } }
  // % khoảng đang xem
  const chgv=(lastC/vis[0].o-1)*100;
  x.textAlign='left'; x.font='800 15px system-ui'; x.fillStyle=chgv>=0?UP:DN;
  x.fillText(`${n} phiên · ${chgv>=0?'+':''}${chgv.toFixed(2)}%`,7,padT+13);
  // thanh ngắm
  if(CH.hover>=0&&CH.hover<n){
    const r=vis[CH.hover], X=cx(CH.hover);
    x.strokeStyle=light?'rgba(0,0,0,.32)':'rgba(255,255,255,.32)'; x.setLineDash([4,4]); x.lineWidth=1;
    x.beginPath(); x.moveTo(X,padT); x.lineTo(X,H-18); x.stroke();
    x.beginPath(); x.moveTo(0,py(r.c)); x.lineTo(plotW,py(r.c)); x.stroke(); x.setLineDash([]);
    showTip(r,X,vis[CH.hover-1]);
  } else $('#cvTip').style.display='none';
}
function drawCompare(x,W,H,GRID,MUT){
  const padR=62,padT=14,plotH=H-padT-28,plotW=W-padR;
  const syms=[CH.sym].concat(CH.cmp);
  const series=syms.map(s=>{ const rows=CH.cache.get(s)||[];
    const agg=aggr(rows,CH.iv); return agg.slice(Math.max(0,agg.length-(CH.i1-CH.i0))); });
  const len=Math.min.apply(null,series.map(s=>s.length).filter(n=>n>0));
  if(!len||len<2){ x.fillStyle=MUT; x.font='13px system-ui'; x.textAlign='center';
    x.fillText('Đang tải dữ liệu so sánh…',W/2,H/2); return; }
  const norm=series.map(s=>{ const seg=s.slice(s.length-len), b=seg[0].c;
    return seg.map(r=>({t:r.t,v:(r.c/b-1)*100})); });
  let mn=Infinity,mx=-Infinity;
  norm.forEach(s=>s.forEach(p=>{mn=Math.min(mn,p.v);mx=Math.max(mx,p.v);}));
  const pd=(mx-mn)*.08||1; mn-=pd; mx+=pd;
  const py=v=>padT+(mx-v)/(mx-mn)*plotH, cx=i=>i/(len-1)*plotW;
  x.font='10.5px system-ui'; x.textBaseline='middle';
  for(let k=0;k<=4;k++){ const v=mn+(mx-mn)*k/4,yy=py(v);
    x.strokeStyle=v>-.5&&v<.5?(MUT+'55'):GRID; x.beginPath(); x.moveTo(0,yy); x.lineTo(plotW,yy); x.stroke();
    x.fillStyle=MUT; x.textAlign='left'; x.fillText((v>0?'+':'')+v.toFixed(0)+'%',plotW+6,yy); }
  if(mn<0&&mx>0){ x.strokeStyle=MUT; x.setLineDash([4,4]); x.beginPath();
    x.moveTo(0,py(0)); x.lineTo(plotW,py(0)); x.stroke(); x.setLineDash([]); }
  norm.forEach((s,k)=>{ x.strokeStyle=k?CMPCOL[(k-1)%CMPCOL.length]:'#e11d48'; x.lineWidth=k?1.7:2.2;
    x.beginPath(); s.forEach((p,i)=>i?x.lineTo(cx(i),py(p.v)):x.moveTo(cx(i),py(p.v))); x.stroke(); });
  let lx=8;
  norm.forEach((s,k)=>{ const col=k?CMPCOL[(k-1)%CMPCOL.length]:'#e11d48', last=s[s.length-1].v;
    const txt=`${syms[k]} ${last>=0?'+':''}${last.toFixed(1)}%`;
    x.fillStyle=col; x.font='800 12px system-ui'; x.textAlign='left'; x.textBaseline='alphabetic';
    x.fillText(txt,lx,padT+12); lx+=x.measureText(txt).width+16; });
  const d0=new Date((series[0][series[0].length-len].t+25200)*1000);
  x.fillStyle=MUT; x.font='10px system-ui';
  x.fillText(`Chuẩn hoá về 0% từ ${d0.getUTCDate()}/${d0.getUTCMonth()+1}/${d0.getUTCFullYear()} · ${len} phiên`,8,H-6);
}
function showTip(r,X,prev){
  const tip=$('#cvTip'), chg=prev?((r.c-prev.c)/prev.c*100):((r.c-r.o)/r.o*100);
  const col=chg>=0?'var(--green)':'var(--red)';
  const d=new Date((r.t+25200)*1000);
  const row=(k,v,c)=>`<div class="r"><i>${k}</i><span${c?` style="color:${c}"`:''}>${v}</span></div>`;
  tip.innerHTML=`<span class="hd">${d.getUTCDate()}/${d.getUTCMonth()+1}/${d.getUTCFullYear()}</span>`+
    row('Mở',num(r.o))+row('Cao',num(r.h))+row('Thấp',num(r.l))+row('Đóng',num(r.c),col)+
    row('Thay đổi',(chg>=0?'+':'')+chg.toFixed(2)+'%',col)+row('KL',vnd(r.v).replace(' tỷ',' tr cp').replace(' tr',' tr cp'));
  tip.style.display='block';
  const w=tip.offsetWidth, cw=$('#cvMain').clientWidth;
  tip.style.left=clamp(X+14,6,cw-w-8)+'px'; tip.style.top='8px';
}
async function openChart(sym){
  showMod('chart');
  await loadChart(sym);
}
async function loadChart(sym){
  CH.sym=sym; CH.cmp=[]; CH.hover=-1;
  const c=ST.map.get(sym); if(!c) return;
  $('#chSym').innerHTML=`${logo(c,'')}<div><div style="font-size:19px;font-weight:800">${c.sym}
    <span style="font-size:12px;color:var(--muted);font-weight:600">${c.ex}</span></div>
    <div style="font-size:12px;color:var(--muted)">${esc(c.name)}</div></div>
    <div style="margin-left:auto;text-align:right"><div style="font-size:22px;font-weight:800" class="${cls(c.chg)}">${num(c.close)}</div>
    <div class="${cls(c.chg)}" style="font-size:13px;font-weight:700">${pct(c.chg)}</div></div>`;
  const rows=await histOf(sym);
  if(!rows){ toast('Kho chưa có lịch sử mã '+sym); return; }
  CH.all=rows; CH.rows=aggr(rows,CH.iv); chartCalc(); chartReset(); drawChart(); renderKPI(c);
}
function renderKPI(c){
  const k=(t,v,cl2)=>`<div><div class="k">${t}</div><div class="v ${cl2||''}">${v}</div></div>`;
  const vsMa=c.ma200?((c.close/c.ma200-1)*100):null;
  $('#chKpi').innerHTML=
    k('RS Rating',c.rs||'—',c.rs>=80?'up':c.rs<40?'dn':'')+
    k('RSI 14',fx(c.rsi,0),c.rsi>=70?'dn':c.rsi<=30?'up':'')+
    k('KL / TB20',c.volr!=null?'×'+fx(c.volr,1):'—',c.volr>=2?'up':'')+
    k('Cách đỉnh 52T',fx(c.dhi,1)+'%',c.dhi>=-3?'up':'')+
    k('Trên đáy 52T','+'+fx(c.dlo,1)+'%')+
    k('So với MA200',vsMa==null?'—':pct(vsMa),cls(vsMa))+
    k('Biên độ ATR',fx(c.atrp,1)+'%')+
    k('GTGD TB20',ty(c.avgval20))+
    k('NN 30 phiên',(c.nn20>0?'+':'')+ty(c.nn20),c.nn20>0?'up':'dn')+
    k('P/E',c.pe!=null?fx(c.pe,1):'—')+
    k('P/B',c.pb!=null?fx(c.pb,2):'—')+
    k('Vốn hoá',vnd(c.mcapLive||c.mcap));
}
function renderChart(){
  $('#m-chart').innerHTML=modHead('Biểu đồ Pro',
    'Nến 6,5 năm từ kho, kèm MA/Bollinger/RSI/MACD và chế độ so sánh nhiều mã trên cùng một khung %.',
    [['Hiệu quả: cao','hi'],['Giữ chân người dùng','vi'],['Công sức: 2–3 ngày']],
    `Biểu đồ hiện tại của CPVN đã tốt (nến + MA20 + khối lượng). Ba thứ còn thiếu mà trader dùng hằng ngày:
     <b>bộ chỉ báo (RSI/MACD/Bollinger)</b>, <b>so sánh nhiều mã chuẩn hoá về %</b> — cách duy nhất trả lời “mã tôi cầm
     mạnh hay yếu hơn ngành/VNINDEX”, và <b>vẽ đường xu hướng</b>. Làm được cái thứ hai là người dùng khỏi mở TradingView.`)
    +`<div class="card" style="margin-bottom:13px"><div class="ch" id="chSym" style="gap:11px;padding:13px 15px"></div>
      <div style="padding:11px 13px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-bottom:1px solid var(--line)">
        <input type="search" id="chFind" placeholder="Đổi mã: VIC, FPT, HPG…" style="width:172px"/>
        <div class="seg" id="chIv">
          <button data-v="D" class="on">Ngày</button><button data-v="W">Tuần</button><button data-v="M">Tháng</button></div>
        <span style="width:1px;height:22px;background:var(--line)"></span>
        <button class="chip ma20 on" data-i="ma20">MA20</button>
        <button class="chip ma50 on" data-i="ma50">MA50</button>
        <button class="chip ma200" data-i="ma200">MA200</button>
        <button class="chip bb" data-i="bb">Bollinger</button>
        <span style="width:1px;height:22px;background:var(--line)"></span>
        <div class="seg" id="chOsc">
          <button data-v="rsi" class="on">RSI</button><button data-v="macd">MACD</button><button data-v="none">Ẩn</button></div>
        <span style="width:1px;height:22px;background:var(--line)"></span>
        <input type="search" id="chCmp" placeholder="So sánh: nhập mã rồi Enter" style="width:196px"/>
        <span id="chCmpList" style="font-size:12px;color:var(--muted)"></span>
      </div>
      <div class="chartwrap" style="border:0;border-radius:0">
        <canvas id="cvMain"></canvas><div id="cvTip"></div>
        <div class="zoomctl"><button id="chZin" title="Phóng to">＋</button>
          <button id="chZout" title="Thu nhỏ">−</button>
          <button id="chZall" title="Xem lại toàn bộ">⟲</button></div></div></div>
      <div class="kpi" id="chKpi"></div>
      <p style="color:var(--faint);font-size:11.5px;margin-top:11px">
        Kéo = trượt thời gian · rê chuột = bảng giá OHLC · bấm đúp hoặc ⟲ = xem lại toàn bộ ·
        phóng to bằng nút ＋ − hoặc giữ <b>Ctrl/⌘</b> rồi lăn chuột (lăn trần vẫn cuộn trang bình thường)</p>`;
  $('#chIv').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    $('#chIv').querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
    CH.iv=b.dataset.v; CH.rows=aggr(CH.all,CH.iv); chartCalc(); chartReset(); drawChart(); });
  $('#chOsc').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    $('#chOsc').querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
    CH.osc=b.dataset.v; drawChart(); });
  $('#m-chart').querySelectorAll('.chip[data-i]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.i; CH.ind[k]=!CH.ind[k]; b.classList.toggle('on',!!CH.ind[k]); drawChart(); });
  $('#chFind').onkeydown=e=>{ if(e.key!=='Enter')return;
    const s=e.target.value.trim().toUpperCase();
    if(ST.map.has(s)){ e.target.value=''; loadChart(s); } else toast('Không có mã '+esc(s)); };
  $('#chCmp').onkeydown=async e=>{ if(e.key!=='Enter')return;
    const s=e.target.value.trim().toUpperCase(); e.target.value='';
    if(!ST.map.has(s)) return toast('Không có mã '+esc(s));
    if(CH.cmp.length>=3) return toast('So sánh tối đa 4 mã');
    if(s===CH.sym||CH.cmp.includes(s)) return;
    CH.cmp.push(s); await histOf(s);
    $('#chCmpList').innerHTML=CH.cmp.map((x,i)=>`<span style="color:${CMPCOL[i%4]};font-weight:700">${x}</span>`).join(' · ')+
      ` <span class="del" id="cmpClr" title="bỏ so sánh">✕</span>`;
    $('#cmpClr').onclick=()=>{ CH.cmp=[]; $('#chCmpList').innerHTML=''; drawChart(); };
    drawChart(); };
  const cv=$('#cvMain');
  /* Lăn chuột trần = CUỘN TRANG như bình thường (không cướp thao tác của người đọc);
     giữ Ctrl/⌘/Shift + lăn, hoặc dùng 3 nút ＋ − ⟲ ở góc biểu đồ để phóng to. */
  function zoomBy(f,px){
    const n=CH.rows.length, span=CH.i1-CH.i0, w=cv.clientWidth-62;
    const at=CH.i0+(px==null?w/2:px)/w*span;
    const ns=clamp(Math.round(span*f),12,n);
    CH.i0=clamp(Math.round(at-(at-CH.i0)*ns/span),0,n-ns); CH.i1=CH.i0+ns; drawChart();
  }
  cv.addEventListener('wheel',e=>{
    if(!(e.ctrlKey||e.metaKey||e.shiftKey)) return;      // để trang cuộn tự nhiên
    e.preventDefault();
    const r=cv.getBoundingClientRect();
    zoomBy(e.deltaY>0?1.18:.85, e.clientX-r.left);
  },{passive:false});
  $('#chZin').onclick=()=>zoomBy(.7);
  $('#chZout').onclick=()=>zoomBy(1.42);
  $('#chZall').onclick=()=>{ chartReset(); drawChart(); };
  cv.addEventListener('mousedown',e=>{ CH.drag={x:e.clientX,i0:CH.i0}; });
  addEventListener('mouseup',()=>{ CH.drag=null; });
  cv.addEventListener('mousemove',e=>{
    const r=cv.getBoundingClientRect(), px=e.clientX-r.left, n=CH.rows.length;
    const span=CH.i1-CH.i0, cw=(cv.clientWidth-62)/span;
    if(CH.drag){ const d=Math.round((CH.drag.x-e.clientX)/cw);
      CH.i0=clamp(CH.drag.i0+d,0,n-span); CH.i1=CH.i0+span; CH.hover=-1; drawChart(); return; }
    if(px>cv.clientWidth-62){ if(CH.hover!==-1){CH.hover=-1;drawChart();} return; }
    const i=clamp(Math.floor(px/cw),0,span-1);
    if(i!==CH.hover){ CH.hover=i; drawChart(); } });
  cv.addEventListener('mouseleave',()=>{ if(CH.hover!==-1){CH.hover=-1;drawChart();} });
  cv.addEventListener('dblclick',()=>{ chartReset(); drawChart(); });
  /* cảm ứng: 1 ngón kéo NGANG = trượt thời gian (kéo dọc vẫn cuộn trang), 2 ngón chụm = phóng */
  let tch=null,pin=null;
  cv.addEventListener('touchstart',e=>{
    if(e.touches.length===2){ pin={d:Math.abs(e.touches[0].clientX-e.touches[1].clientX)||1,
      span:CH.i1-CH.i0,i0:CH.i0}; tch=null; }
    else if(e.touches.length===1) tch={x:e.touches[0].clientX,y:e.touches[0].clientY,i0:CH.i0};
  },{passive:true});
  cv.addEventListener('touchmove',e=>{
    const n=CH.rows.length;
    if(pin&&e.touches.length===2){ e.preventDefault();
      const d=Math.abs(e.touches[0].clientX-e.touches[1].clientX)||1;
      const ns=clamp(Math.round(pin.span*pin.d/d),12,n), mid=pin.i0+pin.span/2;
      CH.i0=clamp(Math.round(mid-ns/2),0,n-ns); CH.i1=CH.i0+ns; drawChart(); return; }
    if(tch&&e.touches.length===1){
      const dx=tch.x-e.touches[0].clientX, dy=tch.y-e.touches[0].clientY;
      if(Math.abs(dx)>16&&Math.abs(dx)>Math.abs(dy)){ e.preventDefault();
        const span=CH.i1-CH.i0, cw=(cv.clientWidth-62)/span;
        CH.i0=clamp(tch.i0+Math.round(dx/cw),0,n-span); CH.i1=CH.i0+span; CH.hover=-1; drawChart(); }
    }
  },{passive:false});
  cv.addEventListener('touchend',()=>{ tch=null; pin=null; });
  if(!CH.sym) loadChart('VIC'); else loadChart(CH.sym);
}

/* ========================================================= 5. DÒNG TIỀN & NGÀNH */
function renderFlow(){
  const G={};
  for(const c of ST.list){
    const g=G[c.parent]=G[c.parent]||{n:0,cap:0,gtgd:0,d:0,w:0,m:0,y:0,nn:0,nn20:0};
    const cap=c.mcapLive||c.mcap||0;
    g.n++; g.cap+=cap; g.gtgd+=c.gtgd||0; g.nn+=c.nnVal||0; g.nn20+=c.nn20||0;
    if(c.chg!=null) g.d+=(c.chg||0)*cap;
    g.w+=(c.w||0)*cap; g.m+=(c.m||0)*cap; g.y+=(c.y||0)*cap;
  }
  const rowsG=Object.keys(G).map(k=>{ const g=G[k];
    return {k,n:g.n,cap:g.cap,gtgd:g.gtgd,nn:g.nn,nn20:g.nn20,
      d:g.cap?g.d/g.cap:0,w:g.cap?g.w/g.cap:0,m:g.cap?g.m/g.cap:0,y:g.cap?g.y/g.cap:0}; })
    .sort((a,b)=>b.d-a.d);
  const totG=rowsG.reduce((s,r)=>s+r.gtgd,0)||1;
  const hc=(v,cap)=>{const c2=heatColor(v,cap);return `style="background:${c2.bg};color:${c2.fg};font-weight:700"`;};
  const secTbl=`<table class="tbl"><thead><tr><th class="l">Nhóm ngành</th><th>Số mã</th>
    <th>1 ngày</th><th>1 tuần</th><th>1 tháng</th><th>1 năm</th><th>GTGD phiên</th><th>Tỷ trọng tiền</th>
    <th>NN ròng phiên</th></tr></thead><tbody>`+
    rowsG.map(r=>`<tr><td class="l"><b>${esc(r.k)}</b></td><td style="color:var(--muted)">${r.n}</td>
      <td ${hc(r.d,4)}>${pct(r.d)}</td><td ${hc(r.w,9)}>${pct(r.w)}</td>
      <td ${hc(r.m,18)}>${pct(r.m)}</td><td ${hc(r.y,60)}>${pct(r.y)}</td>
      <td>${ty(r.gtgd)}</td>
      <td><span class="rsbar" style="width:64px"><i style="width:${r.gtgd/totG*100}%;background:var(--teal)"></i></span>
        ${(r.gtgd/totG*100).toFixed(1)}%</td>
      <td class="${r.nn>0?'up':'dn'}">${(r.nn>0?'+':'−')+ty(Math.abs(r.nn))}</td></tr>`).join('')+'</tbody></table>';

  const nnTop=ST.list.filter(c=>c.nnVal>0).sort((a,b)=>b.nnVal-a.nnVal).slice(0,10);
  const nnBot=ST.list.filter(c=>c.nnVal<0).sort((a,b)=>a.nnVal-b.nnVal).slice(0,10);
  const nn20T=ST.list.filter(c=>c.nn20>0).sort((a,b)=>b.nn20-a.nn20).slice(0,10);
  const nn20B=ST.list.filter(c=>c.nn20<0).sort((a,b)=>a.nn20-b.nn20).slice(0,10);

  $('#m-flow').innerHTML=modHead('Dòng tiền & luân chuyển ngành',
    'Bảng nhiệt hiệu suất ngành theo 4 khung thời gian (bình quân gia quyền vốn hoá), tỷ trọng thanh khoản và dòng tiền khối ngoại — phiên và luỹ kế 30 phiên.',
    [['Hiệu quả: cao','hi'],['Lan truyền: cao','vi'],['Công sức: 1 ngày']],
    `Trader Việt giao dịch <b>theo sóng ngành</b> chứ hiếm khi theo mã đơn lẻ, nên câu hỏi “tiền đang chảy vào nhóm nào”
     có giá trị thực tế cao hơn cả biểu đồ. Bảng 4 cột thời gian cho thấy <b>luân chuyển</b>: ngành xanh cột 1 ngày nhưng đỏ cột
     1 tháng = tiền vừa quay lại. Riêng khối ngoại thì mọi diễn đàn đều bàn mỗi tối — mà kho đã có sẵn dữ liệu 30 phiên.`)
    +`<div class="scroll" style="max-height:none;margin-bottom:16px">${secTbl}</div>
      <div class="grid g4">
        ${cardHTML('🌊','NN mua ròng phiên',nnTop.map(c=>rowHTML(c,'+'+ty(c.nnVal),'up')))}
        ${cardHTML('🩸','NN bán ròng phiên',nnBot.map(c=>rowHTML(c,'−'+ty(-c.nnVal),'dn')))}
        ${cardHTML('📈','NN gom 30 phiên',nn20T.map(c=>rowHTML(c,'+'+ty(c.nn20),'up')))}
        ${cardHTML('📉','NN xả 30 phiên',nn20B.map(c=>rowHTML(c,'−'+ty(-c.nn20),'dn')))}
      </div>`;
  bindRows($('#m-flow'));
}

/* ========================================================= 6. DANH MỤC & CẢNH BÁO */
const PF={key:'cpvn_demo_pf',al:'cpvn_demo_alerts'};
function pfGet(){ return LS.get(PF.key,[]); }
function pfSet(v){ LS.set(PF.key,v); renderPort(); }
function alGet(){ return LS.get(PF.al,[]); }
function alSet(v){ LS.set(PF.al,v); renderPort(); }
function renderPort(){
  const pos=pfGet(), al=alGet();
  let tCost=0,tVal=0;
  const rows=pos.map((p,i)=>{ const c=ST.map.get(p.sym); if(!c) return '';
    const val=c.close*p.qty, cost=p.cost*p.qty, pl=val-cost, plp=cost?pl/cost*100:0;
    tCost+=cost; tVal+=val;
    return {i,c,p,val,cost,pl,plp}; }).filter(Boolean);
  const tPl=tVal-tCost, tPlp=tCost?tPl/tCost*100:0;
  const body=rows.map(r=>`<tr data-sym="${r.c.sym}">
    <td class="l"><div class="co">${logo(r.c,'')}<div><b>${r.c.sym}</b><span>${esc(r.c.sector)}</span></div></div></td>
    <td>${num(r.p.qty)}</td><td>${num(r.p.cost)}</td>
    <td class="${cls(r.c.chg)}">${num(r.c.close)}</td>
    <td>${vnd(r.cost)}</td><td>${vnd(r.val)}</td>
    <td class="${r.pl>=0?'up':'dn'}">${(r.pl>=0?'+':'−')+vnd(Math.abs(r.pl))}</td>
    <td class="${r.pl>=0?'up':'dn'}"><span class="pill ${r.pl>=0?'up':'dn'}">${pct(r.plp)}</span></td>
    <td>${tVal?(r.val/tVal*100).toFixed(1):'0'}%</td>
    <td><span class="del" data-del="${r.i}">✕</span></td></tr>`).join('');
  // vòng tròn tỷ trọng theo ngành
  const bySec={}; rows.forEach(r=>{ bySec[r.c.parent]=(bySec[r.c.parent]||0)+r.val; });
  const cols=['#2dd4bf','#e11d48','#f0b429','#38bdf8','#c026d3','#16c784','#ea3943','#a78bfa'];
  let acc=0; const segs=Object.keys(bySec).sort((a,b)=>bySec[b]-bySec[a]).map((k,i)=>{
    const p=tVal?bySec[k]/tVal*100:0, s=acc; acc+=p;
    return {k,p,col:cols[i%cols.length],from:s,to:acc}; });
  const donut=segs.length?`<div class="donut" style="border-radius:50%;position:relative;
      background:conic-gradient(${segs.map(s=>`${s.col} ${s.from}% ${s.to}%`).join(',')})">
      <div style="position:absolute;inset:26%;border-radius:50%;background:var(--panel);
        display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--muted);text-align:center">
        ${rows.length} mã</div></div>
      <div style="display:flex;flex-direction:column;gap:5px;font-size:12px;justify-content:center">
      ${segs.map(s=>`<div><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${s.col};margin-right:7px"></i>
        ${esc(s.k)} <b style="color:var(--muted)">${s.p.toFixed(1)}%</b></div>`).join('')}</div>`:'';

  const alRows=al.map((a,i)=>{ const c=ST.map.get(a.sym); const hit=c&&(a.op==='>='?c.close>=a.px:c.close<=a.px);
    return `<tr><td class="l"><b>${a.sym}</b></td><td>${a.op==='>='?'≥':'≤'} ${num(a.px)}</td>
      <td>${c?num(c.close):'—'}</td>
      <td class="${hit?'up':''}">${hit?'✔ ĐÃ CHẠM':'đang chờ'}</td>
      <td><span class="del" data-dal="${i}">✕</span></td></tr>`; }).join('');

  $('#m-port').innerHTML=modHead('Danh mục & Cảnh báo giá',
    'Nhập số lượng và giá vốn — web tự tính lãi/lỗ, tỷ trọng, phân bổ ngành. Cảnh báo giá bắn thông báo ngay trên trình duyệt khi mã chạm ngưỡng.',
    [['Hiệu quả: rất cao','hi'],['Giữ chân người dùng','vi'],['Công sức: 2 ngày']],
    `<b>Đây là tính năng giữ người dùng mạnh nhất.</b> Ai đã nhập danh mục vào một trang web thì sẽ quay lại trang đó mỗi ngày —
     chi phí chuyển sang trang khác trở nên đắt. Toàn bộ lưu ở máy người dùng (localStorage), <b>không cần tài khoản, không cần server</b>,
     đúng triết lý “web tĩnh + kho dữ liệu” của CPVN. Bước sau: xuất/nhập danh mục bằng một đoạn mã để đồng bộ giữa máy tính và điện thoại.`)
    +`<div class="form">
        <div class="f"><label class="lb">Mã</label><input type="text" id="pfSym" placeholder="VIC" style="width:96px"/></div>
        <div class="f"><label class="lb">Số lượng</label><input type="number" id="pfQty" placeholder="1000" style="width:112px"/></div>
        <div class="f"><label class="lb">Giá vốn (đ)</label><input type="number" id="pfCost" placeholder="45000" style="width:122px"/></div>
        <button class="btn" id="pfAdd">+ Thêm vào danh mục</button>
        ${pos.length?'<button class="btn gh" id="pfClr">Xoá hết</button>':'<button class="btn gh" id="pfDemo">Nạp danh mục mẫu</button>'}
      </div>
      ${rows.length?`<div class="kpi" style="margin:0 0 13px">
        <div><div class="k">Giá trị thị trường</div><div class="v">${vnd(tVal)}</div></div>
        <div><div class="k">Vốn bỏ ra</div><div class="v">${vnd(tCost)}</div></div>
        <div><div class="k">Lãi/lỗ</div><div class="v ${tPl>=0?'up':'dn'}">${(tPl>=0?'+':'−')+vnd(Math.abs(tPl))}</div></div>
        <div><div class="k">Hiệu suất</div><div class="v ${tPl>=0?'up':'dn'}">${pct(tPlp)}</div></div>
        <div><div class="k">Số mã</div><div class="v">${rows.length}</div></div></div>
        <div class="scroll" style="max-height:none;margin-bottom:14px"><table class="tbl"><thead><tr>
        <th class="l">Cổ phiếu</th><th>KL</th><th>Giá vốn</th><th>Giá TT</th><th>Vốn</th><th>Giá trị</th>
        <th>Lãi/lỗ</th><th>%</th><th>Tỷ trọng</th><th></th></tr></thead><tbody>${body}</tbody></table></div>
        <div class="card" style="margin-bottom:16px"><div class="ch">🥧 Phân bổ theo nhóm ngành</div>
          <div class="cb" style="display:flex;gap:20px;padding:16px;flex-wrap:wrap">${donut}</div></div>`
      :`<div class="card" style="margin-bottom:16px"><div class="empty" style="padding:38px 12px">
          Chưa có mã nào. Nhập ở trên hoặc bấm <b>Nạp danh mục mẫu</b> để xem thử.</div></div>`}
      <div class="card"><div class="ch">🔔 Cảnh báo giá <span class="cnt">${al.length}</span></div>
        <div class="cb" style="padding:13px">
          <div class="form" style="margin-bottom:11px">
            <div class="f"><label class="lb">Mã</label><input type="text" id="alSym" style="width:92px"/></div>
            <div class="f"><label class="lb">Điều kiện</label><select id="alOp"><option value=">=">Giá ≥</option><option value="<=">Giá ≤</option></select></div>
            <div class="f"><label class="lb">Ngưỡng (đ)</label><input type="number" id="alPx" style="width:118px"/></div>
            <button class="btn" id="alAdd">+ Đặt cảnh báo</button>
            <button class="btn gh" id="alChk">Kiểm tra ngay</button>
          </div>
          ${al.length?`<table class="tbl"><thead><tr><th class="l">Mã</th><th>Điều kiện</th><th>Giá hiện tại</th>
            <th>Trạng thái</th><th></th></tr></thead><tbody>${alRows}</tbody></table>`
            :'<div class="empty">Chưa đặt cảnh báo nào</div>'}
        </div></div>`;
  $('#pfAdd').onclick=()=>{
    const s=($('#pfSym').value||'').trim().toUpperCase(), q=+$('#pfQty').value, ct=+$('#pfCost').value;
    if(!ST.map.has(s)) return toast('Không có mã '+esc(s));
    if(!(q>0)||!(ct>0)) return toast('Nhập số lượng và giá vốn');
    const v=pfGet(); v.push({sym:s,qty:q,cost:ct}); pfSet(v); toast('Đã thêm <b>'+s+'</b> vào danh mục');
  };
  const dm=$('#pfDemo'); if(dm) dm.onclick=()=>{
    pfSet([{sym:'FPT',qty:1000,cost:72000},{sym:'HPG',qty:5000,cost:20500},
           {sym:'VIC',qty:300,cost:190000},{sym:'CTG',qty:2000,cost:33000}]); };
  const cl=$('#pfClr'); if(cl) cl.onclick=()=>pfSet([]);
  $('#m-port').querySelectorAll('[data-del]').forEach(b=>b.onclick=e=>{
    e.stopPropagation(); const v=pfGet(); v.splice(+b.dataset.del,1); pfSet(v); });
  $('#m-port').querySelectorAll('[data-dal]').forEach(b=>b.onclick=()=>{
    const v=alGet(); v.splice(+b.dataset.dal,1); alSet(v); });
  $('#alAdd').onclick=()=>{
    const s=($('#alSym').value||'').trim().toUpperCase(), px=+$('#alPx').value, op=$('#alOp').value;
    if(!ST.map.has(s)) return toast('Không có mã '+esc(s));
    if(!(px>0)) return toast('Nhập ngưỡng giá');
    const v=alGet(); v.push({sym:s,op,px}); alSet(v);
    if('Notification' in window && Notification.permission==='default') Notification.requestPermission();
    toast('Đã đặt cảnh báo <b>'+s+' '+(op==='>='?'≥':'≤')+' '+num(px)+'</b>');
  };
  $('#alChk').onclick=()=>{
    const hit=alGet().filter(a=>{ const c=ST.map.get(a.sym);
      return c&&(a.op==='>='?c.close>=a.px:c.close<=a.px); });
    if(!hit.length) return toast('Chưa cảnh báo nào chạm ngưỡng');
    hit.forEach(a=>{ const c=ST.map.get(a.sym);
      toast(`🔔 <b>${a.sym}</b> ${a.op==='>='?'đã vượt':'đã xuống dưới'} ${num(a.px)} — hiện ${num(c.close)}`);
      try{ if('Notification' in window&&Notification.permission==='granted')
        new Notification('CPVN — '+a.sym,{body:`Giá ${num(c.close)} ${a.op==='>='?'≥':'≤'} ${num(a.px)}`}); }catch(e){}
    });
  };
  bindRows($('#m-port'));
}

/* ==================================================== 7. MÙA VỤ & KIỂM ĐỊNH */
const SE={sym:'VIC'};
async function renderSeason(){
  $('#m-season').innerHTML=modHead('Mùa vụ & Kiểm định chiến lược',
    'Sáu năm rưỡi lịch sử trong kho được dùng để trả lời hai câu hỏi rất "trader": mã này thường mạnh vào tháng nào, và một quy tắc mua bán đơn giản có thắng nổi việc mua nắm giữ không.',
    [['Hiệu quả: trung bình','hi'],['Lan truyền: rất cao','vi'],['Công sức: 2 ngày']],
    `Đây là <b>tính năng gây ấn tượng</b> — gần như không trang chứng khoán Việt nào có, mà CPVN thì có sẵn nguyên liệu (kho hist 1.638 phiên/mã).
     Mỗi biểu đồ mùa vụ là một bài đăng: “VNM 10 năm qua tăng 7/10 lần trong tháng 12”. Cần ghi rõ <b>hiệu suất quá khứ không đảm bảo tương lai</b>
     và không được diễn giải thành khuyến nghị mua bán.`)
    +`<div class="ctl"><span class="lb">Mã</span>
       <input type="search" id="seSym" value="${SE.sym}" style="width:118px"/>
       <button class="btn gh" id="seGo">Phân tích</button>
       <span style="color:var(--muted);font-size:12px" id="seNote"></span></div>
      <div class="grid g2">
        <div class="card"><div class="ch">📅 Hiệu suất bình quân theo tháng</div>
          <div class="cb" style="padding:12px"><canvas id="cvSeason" style="width:100%;height:230px;display:block"></canvas>
          <div id="seTbl" style="margin-top:8px"></div></div></div>
        <div class="card"><div class="ch">🧪 Kiểm định: MA20 cắt MA50 vs. Mua & nắm giữ</div>
          <div class="cb" style="padding:12px"><canvas id="cvBT" style="width:100%;height:230px;display:block"></canvas>
          <div id="btStat" style="margin-top:8px"></div></div></div>
      </div>
      <div class="card" style="margin-top:13px"><div class="ch">📆 Hiệu suất bình quân theo thứ trong tuần</div>
        <div class="cb" style="padding:12px" id="dowTbl"></div></div>`;
  $('#seGo').onclick=()=>{ const s=($('#seSym').value||'').trim().toUpperCase();
    if(!ST.map.has(s)) return toast('Không có mã '+esc(s)); SE.sym=s; runSeason(); };
  $('#seSym').onkeydown=e=>{ if(e.key==='Enter') $('#seGo').click(); };
  runSeason();
}
async function runSeason(){
  const rows=await histOf(SE.sym);
  if(!rows||rows.length<300){ $('#seNote').textContent='Kho chưa đủ lịch sử cho mã này'; return; }
  const y0=new Date((rows[0].t+25200)*1000).getUTCFullYear(),
        y1=new Date((rows[rows.length-1].t+25200)*1000).getUTCFullYear();
  $('#seNote').innerHTML=`<b>${SE.sym}</b> · ${rows.length.toLocaleString('en-US')} phiên · ${y0}–${y1}`;
  // ----- mùa vụ theo tháng
  const bucket={};
  for(const r of rows){ const d=new Date((r.t+25200)*1000), k=d.getUTCFullYear()+'-'+d.getUTCMonth();
    (bucket[k]=bucket[k]||[]).push(r.c); }
  const M=Array.from({length:12},()=>({s:0,n:0,w:0}));
  for(const k in bucket){ const a=bucket[k]; if(a.length<3) continue;
    const m=+k.split('-')[1], ret=(a[a.length-1]/a[0]-1)*100;
    M[m].s+=ret; M[m].n++; if(ret>0) M[m].w++; }
  drawBars($('#cvSeason'),M.map((m,i)=>({lb:'T'+(i+1),v:m.n?m.s/m.n:0,sub:m.n?Math.round(m.w/m.n*100)+'%':''})));
  const best=M.map((m,i)=>({i,v:m.n?m.s/m.n:0,w:m.n?m.w/m.n:0,n:m.n})).filter(x=>x.n>=2).sort((a,b)=>b.v-a.v);
  if(best.length) $('#seTbl').innerHTML=
    `<div style="font-size:12.5px;line-height:1.75;color:var(--txt2)">
      Tháng mạnh nhất: <b class="up">Tháng ${best[0].i+1}</b> — bình quân ${pct(best[0].v)}, thắng ${Math.round(best[0].w*100)}% số năm (${best[0].n} năm).<br/>
      Tháng yếu nhất: <b class="dn">Tháng ${best[best.length-1].i+1}</b> — bình quân ${pct(best[best.length-1].v)},
      thắng ${Math.round(best[best.length-1].w*100)}% số năm.
      <div style="color:var(--faint);font-size:11px;margin-top:5px">Số nhỏ dưới mỗi cột = tỷ lệ số năm tháng đó tăng giá.</div></div>`;
  // ----- thứ trong tuần
  const D=Array.from({length:5},()=>({s:0,n:0,w:0}));
  for(let i=1;i<rows.length;i++){ const d=new Date((rows[i].t+25200)*1000).getUTCDay();
    if(d<1||d>5) continue; const ret=(rows[i].c/rows[i-1].c-1)*100;
    D[d-1].s+=ret; D[d-1].n++; if(ret>0) D[d-1].w++; }
  $('#dowTbl').innerHTML=`<table class="tbl"><thead><tr><th class="l">Thứ</th>
    ${['Hai','Ba','Tư','Năm','Sáu'].map(x=>`<th>Thứ ${x}</th>`).join('')}</tr></thead><tbody>
    <tr><td class="l" style="color:var(--muted)">Bình quân/phiên</td>
      ${D.map(d=>`<td class="${d.n&&d.s/d.n>0?'up':'dn'}">${d.n?pct(d.s/d.n):'—'}</td>`).join('')}</tr>
    <tr><td class="l" style="color:var(--muted)">Tỷ lệ phiên tăng</td>
      ${D.map(d=>`<td>${d.n?Math.round(d.w/d.n*100)+'%':'—'}</td>`).join('')}</tr></tbody></table>`;
  // ----- kiểm định MA20/MA50
  const c=rows.map(r=>r.c), ma20=maSeries(c,20), ma50=maSeries(c,50);
  let eq=100, bh=100, trades=0, wins=0, entry=null, inPos=false;
  const E=[],B=[]; let peakE=100,ddE=0,peakB=100,ddB=0;
  const start=50;
  for(let i=start;i<c.length;i++){
    const sig=ma20[i-1]!=null&&ma50[i-1]!=null&&ma20[i-1]>ma50[i-1];
    const ret=c[i]/c[i-1];
    if(sig) eq*=ret;
    bh*=ret;
    if(sig&&!inPos){ inPos=true; entry=c[i]; trades++; }
    else if(!sig&&inPos){ inPos=false; if(c[i]>entry) wins++; }
    peakE=Math.max(peakE,eq); ddE=Math.max(ddE,(peakE-eq)/peakE*100);
    peakB=Math.max(peakB,bh); ddB=Math.max(ddB,(peakB-bh)/peakB*100);
    E.push(eq); B.push(bh);
  }
  if(inPos&&c[c.length-1]>entry) wins++;
  drawEquity($('#cvBT'),E,B);
  const yrs=(rows[rows.length-1].t-rows[start].t)/(365.25*86400);
  const cagr=v=>((Math.pow(v/100,1/Math.max(.5,yrs))-1)*100);
  $('#btStat').innerHTML=`<table class="tbl"><thead><tr><th class="l">Chỉ tiêu</th>
    <th style="color:var(--teal)">MA20&gt;MA50</th><th>Mua &amp; nắm giữ</th></tr></thead><tbody>
    <tr><td class="l" style="color:var(--muted)">Tổng lợi nhuận</td>
      <td class="${eq>=100?'up':'dn'}">${pct(eq-100)}</td><td class="${bh>=100?'up':'dn'}">${pct(bh-100)}</td></tr>
    <tr><td class="l" style="color:var(--muted)">Bình quân năm</td>
      <td class="${cagr(eq)>=0?'up':'dn'}">${pct(cagr(eq))}</td><td class="${cagr(bh)>=0?'up':'dn'}">${pct(cagr(bh))}</td></tr>
    <tr><td class="l" style="color:var(--muted)">Sụt giảm sâu nhất</td>
      <td class="dn">−${ddE.toFixed(1)}%</td><td class="dn">−${ddB.toFixed(1)}%</td></tr>
    <tr><td class="l" style="color:var(--muted)">Số lệnh · tỷ lệ thắng</td>
      <td>${trades} · ${trades?Math.round(wins/trades*100):0}%</td><td>1 · —</td></tr></tbody></table>
    <div style="color:var(--faint);font-size:11px;margin-top:7px">Chưa tính phí, thuế và trượt giá.
      Kết quả quá khứ không đảm bảo cho tương lai — đây là công cụ tham khảo, không phải khuyến nghị.</div>`;
}
function drawBars(cv,data){
  const dpr=Math.min(2,devicePixelRatio||1), W=cv.clientWidth, H=cv.clientHeight;
  cv.width=W*dpr; cv.height=H*dpr;
  const x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,W,H);
  const light=isLight(), MUT=light?'#6b7280':'#7d7d8d', GRID=light?'rgba(0,0,0,.08)':'rgba(255,255,255,.06)';
  const mx=Math.max(...data.map(d=>Math.abs(d.v)))||1, pad=26, h=H-pad-16, zero=16+h/2;
  const bw=(W-16)/data.length;
  x.strokeStyle=GRID; x.beginPath(); x.moveTo(0,zero); x.lineTo(W,zero); x.stroke();
  data.forEach((d,i)=>{
    const hh=Math.abs(d.v)/mx*(h/2-6), X=8+i*bw;
    x.fillStyle=d.v>=0?'#16c784':'#ea3943';
    x.fillRect(X+bw*.16,d.v>=0?zero-hh:zero,bw*.68,Math.max(1,hh));
    x.fillStyle=MUT; x.font='10px system-ui'; x.textAlign='center';
    x.fillText(d.lb,X+bw/2,H-4);
    x.font='700 9.5px system-ui'; x.fillStyle=d.v>=0?'#16c784':'#ea3943';
    x.fillText((d.v>=0?'+':'')+d.v.toFixed(1),X+bw/2,d.v>=0?zero-hh-4:zero+hh+11);
    if(d.sub){ x.fillStyle=MUT; x.font='9px system-ui'; x.fillText(d.sub,X+bw/2,H-15); }
  });
}
function drawEquity(cv,A,B){
  const dpr=Math.min(2,devicePixelRatio||1), W=cv.clientWidth, H=cv.clientHeight;
  cv.width=W*dpr; cv.height=H*dpr;
  const x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,W,H);
  const light=isLight(), MUT=light?'#6b7280':'#7d7d8d', GRID=light?'rgba(0,0,0,.08)':'rgba(255,255,255,.06)';
  const all=A.concat(B), mn=Math.min.apply(null,all), mx=Math.max.apply(null,all);
  const pad=44, plotW=W-pad, py=v=>10+(mx-v)/(mx-mn||1)*(H-32);
  x.font='10px system-ui'; x.textBaseline='middle';
  for(let k=0;k<=3;k++){ const v=mn+(mx-mn)*k/3, yy=py(v);
    x.strokeStyle=GRID; x.beginPath(); x.moveTo(0,yy); x.lineTo(plotW,yy); x.stroke();
    x.fillStyle=MUT; x.textAlign='left'; x.fillText(Math.round(v),plotW+5,yy); }
  const draw=(arr,col,w)=>{ x.strokeStyle=col; x.lineWidth=w; x.beginPath();
    arr.forEach((v,i)=>{const X=i/(arr.length-1)*plotW; i?x.lineTo(X,py(v)):x.moveTo(X,py(v));}); x.stroke(); };
  draw(B,light?'#9aa1ad':'#55555f',1.5); draw(A,'#2dd4bf',2);
  x.textBaseline='alphabetic'; x.font='800 11px system-ui'; x.textAlign='left';
  x.fillStyle='#2dd4bf'; x.fillText('MA20>MA50',8,15);
  x.fillStyle=light?'#9aa1ad':'#7d7d8d'; x.fillText('Mua & nắm giữ',96,15);
}

/* ============================================================ 8. LỘ TRÌNH */
const ROAD=[
 ['Làm ngay — đổi chất trang web',[
  ['Gói chỉ báo tính sẵn (data/screen.json)','Thêm 1 bước vào refresh_daily.py: tính RSI/MA/RS/52 tuần/khối lượng TB cho 1.522 mã rồi ghi 1 file 225 KB. Đây là nền móng của Radar, Bộ lọc, Biểu đồ và mọi thứ khác.',['P1','1 buổi','Đã dựng thử: 1,4 giây']],
  ['Radar phiên','12 nhóm tín hiệu tự quét mỗi phiên. Vừa là trang người dùng mở mỗi sáng, vừa là nguồn nội dung đăng nhóm mỗi ngày.',['P1','1–2 ngày','Lan truyền cao']],
  ['Bản đồ nhiệt','Treemap theo ngành, nút chụp ảnh có đóng dấu. Loại nội dung được chia sẻ nhiều nhất trong cộng đồng chứng khoán.',['P1','1 ngày','Lan truyền rất cao']],
  ['Bộ lọc cổ phiếu','14 tiêu chí + 7 chiến lược dựng sẵn. Đây là thứ biến người xem thành người dùng thường xuyên.',['P1','2 ngày','Giữ chân']],
  ['Danh mục cá nhân','Lưu ở localStorage, không cần tài khoản. Người đã nhập danh mục sẽ quay lại mỗi ngày.',['P1','2 ngày','Giữ chân']],
 ]],
 ['Nên có — tăng độ chuyên nghiệp',[
  ['Chỉ báo trên biểu đồ','RSI, MACD, Bollinger, MA200 + so sánh nhiều mã chuẩn hoá %. Thiếu phần này người dùng vẫn phải mở TradingView.',['P2','2–3 ngày']],
  ['Dòng tiền & luân chuyển ngành','Bảng nhiệt ngành 4 khung thời gian + khối ngoại phiên/30 phiên. Trader Việt giao dịch theo sóng ngành.',['P2','1 ngày']],
  ['Cảnh báo giá','Web Notification khi mã chạm ngưỡng. Lý do để người dùng mở tab cả ngày.',['P2','1 ngày']],
  ['Bảng lệnh nhanh ⌘K','Gõ mã ở bất kỳ đâu là nhảy tới. Chi tiết nhỏ nhưng tạo cảm giác "công cụ chuyên nghiệp" ngay lập tức.',['P2','nửa ngày']],
  ['Chia sẻ bộ lọc / mã bằng đường dẫn','?f=... và /cophieu/VIC?tab=... để mọi thứ đều dán được vào nhóm chat — kênh kéo người mới rẻ nhất.',['P2','1 ngày','Lan truyền']],
  ['Ảnh og:image riêng cho từng mã','Server dựng sẵn ảnh 1200×630 (logo + giá + biểu đồ nhỏ) cho mỗi mã. Link dán vào Zalo/Facebook hiện thẻ đẹp thay vì trống trơn.',['P2','1–2 ngày','Lan truyền']],
 ]],
 ['Về sau — chiều sâu',[
  ['Mùa vụ & kiểm định chiến lược','Thống kê theo tháng/thứ + backtest MA. Gần như không đối thủ Việt nào có.',['P3','2 ngày','Ấn tượng']],
  ['So sánh mã theo ngành (bảng định giá)','P/E, P/B, ROE, biên lợi nhuận của cả ngành trong một bảng — dữ liệu đã có sẵn trong data/fin.',['P3','1–2 ngày']],
  ['Lịch sự kiện','Ngày giao dịch không hưởng quyền, cổ tức, ĐHCĐ, ngày ra báo cáo. Cần thêm nguồn cào.',['P3','2 ngày']],
  ['PWA — cài lên màn hình chính','manifest + service worker: mở như app, kho dữ liệu vẫn xem được khi mất mạng. Rất hợp với kiến trúc web tĩnh hiện tại.',['P3','1 ngày']],
  ['Sổ nhật ký giao dịch','Ghi lệnh mua/bán, tự tính hiệu suất và thống kê thói quen. Tính năng giữ chân bậc nhất, chưa trang Việt nào làm tử tế.',['P3','3 ngày']],
 ]],
 ['Kỹ thuật nền — ít thấy nhưng quyết định cảm giác "chuyên nghiệp"',[
  ['Khung xương khi tải (skeleton)','Thay vì màn hình trắng rồi nhảy giật, hiện khung mờ đúng vị trí. Cảm giác nhanh hơn hẳn dù tốc độ y nguyên.',['P2','nửa ngày']],
  ['Số liệu dùng font tabular','font-variant-numeric:tabular-nums — cột số thẳng hàng tuyệt đối. Một dòng CSS, khác biệt thấy ngay.',['P1','5 phút']],
  ['Danh sách ảo hoá','Bảng giá 1.522 dòng chỉ dựng ~40 dòng đang nhìn thấy. Cuộn mượt trên điện thoại yếu.',['P2','1 ngày']],
  ['Dữ liệu có cấu trúc cho Google (JSON-LD)','Đánh dấu từng trang mã là thực thể tài chính + sitemap.xml 1.522 đường dẫn. Kênh tìm kiếm miễn phí, dài hạn.',['P2','1 ngày','SEO']],
  ['Trạng thái rỗng và lỗi tử tế','Mọi bảng đều có câu trả lời khi không có dữ liệu, thay vì để trống gây cảm giác web hỏng.',['P2','nửa ngày']],
  ['Đo lường người dùng','Thống kê tự lưu (Cloudflare Web Analytics — không cookie) để biết tính năng nào thực sự được dùng trước khi làm tiếp.',['P2','1 giờ']],
 ]],
];
function renderRoad(){
  let h=modHead('Lộ trình nâng cấp đề xuất',
    'Toàn bộ đề xuất, xếp theo thứ tự nên làm. P1 = làm ngay, đổi chất trang web; P2 = tăng độ chuyên nghiệp; P3 = chiều sâu.',
    [['22 hạng mục'],['Ưu tiên P1: 5 việc','hi'],['Tổng ~3 tuần công']],
    `Nguyên tắc xếp: ưu tiên thứ <b>dùng được ngay bằng dữ liệu đã có trong repo</b> và có khả năng <b>tự lan truyền</b>
     (ảnh chia sẻ, link dán vào nhóm chat). Tính năng nào cần thêm nguồn dữ liệu mới đều bị đẩy xuống P3.`);
  for(const [sect,items] of ROAD){
    h+=`<div class="secthead">${sect}</div><div class="rmgrid">`;
    items.forEach((it,i)=>{
      h+=`<div class="rm"><h4><span class="no">${String(i+1).padStart(2,'0')}</span>${it[0]}</h4>
        <p>${it[1]}</p><div class="tags">${it[2].map(t=>{
          const c2=t==='P1'?'p1':t==='P2'?'p2':t==='P3'?'p3':t.indexOf('Đã')===0?'done':'';
          return `<span class="tg ${c2}">${t}</span>`;}).join('')}</div></div>`;
    });
    h+='</div>';
  }
  $('#m-road').innerHTML=h;
}

/* ------------------------------------------------------ chụp ảnh chia sẻ */
function shot(el,name){
  const run=()=>{
    toast('Đang dựng ảnh…');
    window.html2canvas(el,{backgroundColor:isLight()?'#f2f4f7':'#08080b',scale:2,logging:false}).then(cv=>{
      const g=cv.getContext('2d'), W=cv.width;
      g.font='800 '+Math.round(W/46)+'px system-ui'; g.textAlign='right';
      g.fillStyle='rgba(45,212,191,.92)';
      g.fillText('CPVN.IO · phiên '+ST.date,W-18,cv.height-16);
      const a=document.createElement('a'); a.download=(name||'cpvn')+'.png'; a.href=cv.toDataURL('image/png'); a.click();
      toast('Đã tải ảnh về máy ✓');
    }).catch(()=>toast('Không dựng được ảnh'));
  };
  if(window.html2canvas) return run();
  const s=document.createElement('script'); s.src='html2canvas.min.js';
  s.onload=run; s.onerror=()=>toast('Thiếu html2canvas.min.js');
  document.head.appendChild(s);
}

/* ------------------------------------------------------------ điều hướng */
const MODS=[['radar','Radar phiên',renderRadar],['heat','Bản đồ nhiệt',renderHeat],
  ['screen','Bộ lọc',renderScreen],['chart','Biểu đồ Pro',renderChart],
  ['flow','Dòng tiền & ngành',renderFlow],['port','Danh mục',renderPort],
  ['season','Mùa vụ & Kiểm định',renderSeason],['road','Lộ trình nâng cấp',renderRoad]];
const done={};
function showMod(id){
  MODS.forEach(m=>{ $('#m-'+m[0]).classList.toggle('on',m[0]===id); });
  $$('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.m===id));
  const m=MODS.find(x=>x[0]===id);
  if(m&&(!done[id]||id==='port')){ done[id]=1; m[2](); }
  if(id==='heat') requestAnimationFrame(drawHeat);
  if(id==='chart') requestAnimationFrame(drawChart);
  location.hash=id;
  scrollTo({top:0,behavior:'smooth'});
}

/* -------------------------------------------------------- bảng lệnh ⌘K */
const PAL={sel:0,items:[]};
function palOpen(){ $('#pal').classList.add('on'); $('#palin').value=''; $('#palin').focus(); palSearch(''); }
function palClose(){ $('#pal').classList.remove('on'); }
function palSearch(q){
  q=(q||'').trim().toUpperCase();
  const items=[];
  MODS.forEach(m=>{ if(!q||m[1].toUpperCase().includes(q)) items.push({t:'mod',id:m[0],a:m[1],b:'Chuyển màn hình'}); });
  if(q){ const hit=ST.list.filter(c=>c.sym.startsWith(q))
      .concat(ST.list.filter(c=>!c.sym.startsWith(q)&&(c.sym.includes(q)||c.name.toUpperCase().includes(q))))
      .slice(0,24);
    hit.forEach(c=>items.push({t:'sym',id:c.sym,a:c.sym,b:c.name,c}));
  }
  PAL.items=items.slice(0,28); PAL.sel=0; palDraw();
}
function palDraw(){
  $('#palres').innerHTML=PAL.items.map((it,i)=>`<div class="pr ${i===PAL.sel?'sel':''}" data-i="${i}">
    <b>${it.t==='sym'?it.a:'▸'}</b><span>${esc(it.t==='sym'?it.b:it.a)}</span>
    <span class="tag">${it.t==='sym'?(it.c.chg!=null?pct(it.c.chg):''):it.b}</span></div>`).join('')
    ||'<div class="empty">Không tìm thấy</div>';
  $('#palres').querySelectorAll('.pr').forEach(e=>e.onclick=()=>palGo(+e.dataset.i));
}
function palGo(i){
  const it=PAL.items[i]; if(!it) return; palClose();
  if(it.t==='mod') showMod(it.id); else openChart(it.id);
}

/* ------------------------------------------------------------------ khởi động */
async function init(){
  try{ await loadAll(); }
  catch(e){ $('#load').innerHTML='<p style="color:var(--red)">Không nạp được dữ liệu.<br/>Hãy chạy web bằng máy chủ tĩnh:<br/><code>python3 -m http.server 8778 -d ~/Documents/vn-bubbles</code></p>'; return; }
  renderMkt();
  $('#tabs').innerHTML=MODS.map(m=>`<button data-m="${m[0]}">${m[1]}</button>`).join('');
  $$('#tabs button').forEach(b=>b.onclick=()=>showMod(b.dataset.m));
  $('#btnThm').onclick=()=>{
    const light=!isLight();
    document.documentElement.dataset.theme=light?'light':'';
    localStorage.setItem('cpvn_theme',light?'light':'');
    $('#btnThm').textContent=light?'☀️':'🌙';
    renderMkt();
    const cur=MODS.find(m=>$('#m-'+m[0]).classList.contains('on'));
    if(cur&&done[cur[0]]) cur[2]();
    if(cur&&cur[0]==='chart') requestAnimationFrame(drawChart);
  };
  $('#btnThm').textContent=isLight()?'☀️':'🌙';
  $('#btnPal').onclick=palOpen;
  $('#pal').onclick=e=>{ if(e.target.id==='pal') palClose(); };
  $('#palin').oninput=e=>palSearch(e.target.value);
  $('#palin').onkeydown=e=>{
    if(e.key==='ArrowDown'){ PAL.sel=Math.min(PAL.sel+1,PAL.items.length-1); palDraw(); e.preventDefault(); }
    else if(e.key==='ArrowUp'){ PAL.sel=Math.max(PAL.sel-1,0); palDraw(); e.preventDefault(); }
    else if(e.key==='Enter') palGo(PAL.sel);
    else if(e.key==='Escape') palClose();
  };
  addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); palOpen(); }
    else if(e.key==='Escape') palClose();
    else if(e.key==='/'&&!/input|textarea|select/i.test((e.target.tagName||''))){ e.preventDefault(); palOpen(); }
  });
  let rt; addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(()=>{
    if($('#m-heat').classList.contains('on')) drawHeat();
    if($('#m-chart').classList.contains('on')) drawChart(); },160); });
  const start=(location.hash||'').replace('#','');
  showMod(MODS.some(m=>m[0]===start)?start:'radar');
  $('#load').classList.add('off');
  setTimeout(()=>$('#load').remove(),400);
  setTimeout(()=>toast('Gõ <b>⌘K</b> (hoặc phím <b>/</b>) để tìm nhanh bất kỳ mã nào'),1200);
}
init();
})();
