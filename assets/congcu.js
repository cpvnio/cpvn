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
/* cắt chuỗi cho vừa maxW px THEO FONT ĐANG ĐẶT của ctx (nhớ set ctx.font trước khi gọi) */
function catChu(ctx,s,maxW){
  s=String(s||'');
  if(ctx.measureText(s).width<=maxW) return s;
  let lo=0,hi=s.length;
  while(lo<hi){ const m=(lo+hi+1)>>1;
    if(ctx.measureText(s.slice(0,m)+'…').width<=maxW) lo=m; else hi=m-1; }
  return s.slice(0,lo).trimEnd()+'…';
}
/* bẻ chuỗi thành TỐI ĐA sd dòng, mỗi dòng vừa maxW px (nhớ set ctx.font trước khi gọi).
   Chữ thừa dồn hết vào dòng cuối rồi mới cắt — không bao giờ mất chữ lặng lẽ giữa chừng. */
function beDong(ctx,s,maxW,sd){
  const tu=String(s||'').trim().split(/\s+/).filter(Boolean);
  if(!tu.length) return [];
  const ra=[]; let d=tu[0], i=1;
  for(;i<tu.length;i++){
    const thu=d+' '+tu[i];
    if(ctx.measureText(thu).width<=maxW){ d=thu; continue; }
    if(ra.length===sd-1) break;                  // đang ở dòng cuối -> để phần thừa cho catChu
    ra.push(d); d=tu[i];
  }
  if(i<tu.length) d+=' '+tu.slice(i).join(' ');
  ra.push(catChu(ctx,d,maxW));
  return ra;
}
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
  vn30:new Set(), tapdoan:[], quy:[], chudiem:null, pack:null, market:null, spark:{}, sparkT:[], hist:new Map() };
/* GỘP NGÀNH — BẢN SAO Y HỆT core.js và bubbles.html. Trang này trước đây dùng thẳng
   `sector` thô của nguồn, nên ô chọn ngành của đường đua hiện "Bán lẻ chuyên dụng",
   "Bán lẻ thực phẩm và thuốc", "Bán lẻ tổng hợp" thành ba ngành riêng trong khi bảng giá
   đã gộp làm một từ lâu — cùng một cái tên ngành mà hai trang ra hai rổ mã khác nhau.
   Sửa ở đây thì PHẢI sửa cả hai file kia cho khớp. */
const SECTOR_EXPLICIT={
  // bán lẻ (3 nhánh -> 1)
  'Bán lẻ chuyên dụng':'Bán lẻ','Bán lẻ thực phẩm và thuốc':'Bán lẻ','Bán lẻ tổng hợp':'Bán lẻ',
  // y tế & dược
  'Dược phẩm':'Dược phẩm & Y tế','Dịch vụ chăm sóc sức khỏe':'Dược phẩm & Y tế','Thiết bị vật tư Y tế':'Dược phẩm & Y tế',
  // công nghệ + viễn thông: tách ra thì mỗi bên chỉ 4-6 mã đủ lớn, đứng lẻ loi cả hai
  'Phần mềm và dịch vụ CNTT':'Công nghệ & Viễn thông','Chất bán dẫn & Thiết bị bán dẫn':'Công nghệ & Viễn thông',
  'Thiết bị & Phụ tùng điện tử':'Công nghệ & Viễn thông','Máy tính, điện thoại & điện tử gia dụng':'Công nghệ & Viễn thông',
  'Thiết bị văn phòng':'Công nghệ & Viễn thông','Dịch vụ Viễn thông':'Công nghệ & Viễn thông',
  'Truyền thông & Mạng':'Công nghệ & Viễn thông','Truyền thông và Xuất bản':'Công nghệ & Viễn thông',
  // dầu khí: thượng nguồn và dịch vụ khoan/thiết bị chạy chung một chu kỳ giá dầu
  'Dầu và Khí đốt':'Dầu khí','Dịch vụ và Thiết bị Dầu khí':'Dầu khí',
  // xây dựng dân dụng vốn là một nhánh của xây dựng
  'Xây dựng và vật liệu xây dựng dân dụng':'Xây dựng',
  // than là khai khoáng, nguồn để riêng nên còn đúng 1 mã đủ lớn
  'Kim loại và Khai khoáng':'Khai khoáng & Kim loại','Than':'Khai khoáng & Kim loại',
  // giấy -> bao bì: DHC, HHP làm cả hai thứ trong cùng một nhà máy
  'Hộp đựng và Bao bì':'Giấy & Bao bì','Giấy và Lâm sản':'Giấy & Bao bì',
  // hàng không đi cùng khách sạn: cùng nhịp mùa du lịch, cùng cú sốc dịch bệnh
  'Khách sạn và Giải trí':'Du lịch & Giải trí','Vận chuyển hành khách':'Du lịch & Giải trí',
  // ba rổ "đa ngành / thương mại tổng hợp" của nguồn vốn dĩ là một
  'Dịch vụ công nghiệp và Thương mại':'Đa ngành & Thương mại',
  'Bán buôn hàng công nghiệp tổng hợp':'Đa ngành & Thương mại',
  'Tập đoàn đa ngành (hàng tiêu dùng)':'Đa ngành & Thương mại',
  // bột giặt, hoá mỹ phẩm, đồ gia dụng — hoá chất tiêu dùng, cùng một kệ hàng
  'Hóa chất':'Hoá chất & Hàng gia dụng','Hàng gia dụng':'Hoá chất & Hàng gia dụng',
  'Sản phẩm Dịch vụ cá nhân, gia dụng':'Hoá chất & Hàng gia dụng',
};
function gopNganh(){
  for(const c of ST.map.values()) c.sector=SECTOR_EXPLICIT[c.sector]||c.sector||'Khác';
  const dem={}; for(const c of ST.map.values()) dem[c.sector]=(dem[c.sector]||0)+1;
  for(const c of ST.map.values()) if(dem[c.sector]<4) c.sector='Khác';   // ngành vụn dồn về Khác
}
async function loadAll(){
  const j=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
  const [u,eod,pk,mk,td,qy,cd]=await Promise.all([
    j('universe.json'), j('data/eod/latest.json'),
    j('data/screen.json'), j('data/market.json'), j('data/tapdoan.json'), j('data/quy.json'),
    j('data/chudiem.json')]);
  ST.tapdoan=(td&&td.nhom)||[]; ST.quy=(qy&&qy.quy)||[]; ST.chudiem=cd||null;
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
  gopNganh();                 // PHẢI gộp trước mọi thứ đọc c.sector
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
    if(j.idx&&j.idx.length) ST.indices=j.idx.map(x=>({name:x[0],value:x[1],chg:x[2],gtgd:x[3]||0,vol:x[4]||0}));
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
      idx:(ST.indices||[]).map(i=>[i.name,i.value,i.chg,i.gtgd||0,i.vol||0]), d}));
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
        /* `value` (triệu đồng) là THANH KHOẢN CẢ SÀN, gồm cả thoả thuận — không cộng lại
           được từ gtgd từng mã. Đầu phiên nó về 0 thì giữ số phiên trước, đừng hiện 0. */
        const g=(+d.value||0)*1e6, cu=(ST.indices||[]).find(i=>i.name===m[1])||{};
        if(v>0) out.push({name:m[1], value:v, chg:o>0?(v-o)/o*100:null,
                          gtgd:g>0?g:(cu.gtgd||0), vol:+d.vol||(cu.vol||0)});
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
  {id:'tapdoan', ic:'🏢', name:'Danh mục tập đoàn', tag:'Gom công ty cùng một nhà để soi dòng tiền chảy vào cả họ — và lật danh mục các quỹ đang nắm giữ.',
   meta:[], render:renderTapDoan},
  {id:'race', ic:'🏁', name:'Đường đua vốn hoá', tag:'6,5 năm thị trường chạy lại trong 30 giây — bảng xếp hạng vốn hoá đổi ngôi theo từng tháng.',
   meta:[], render:renderRace},
];
let cur=null; const done={};
const PATHOF={radar:'/radar',tapdoan:'/tapdoan',race:'/duongdua'};
const TITLEOF={radar:'Radar phiên',tapdoan:'Danh mục tập đoàn',race:'Đường đua vốn hoá'};
function renderNav(){
  $$('.tabs a[data-m]').forEach(e=>{
    e.classList.toggle('on',e.dataset.m===cur);
    if(!e._b){ e._b=1; e.onclick=ev=>{ ev.preventDefault(); showMod(e.dataset.m); }; }
  });
  $$('.dd a[data-md]').forEach(e=>{
    if(!e._b){ e._b=1; e.onclick=ev=>{ ev.preventDefault();
      e.closest('.tw').classList.remove('mo'); moTab(e.dataset.md,e.dataset.t); }; }
  });
  /* "Danh mục tập đoàn" chạy trên trang công cụ nhưng thuộc NHÓM BẢNG GIÁ — mục cha
     "Bảng giá" phải sáng, bằng không đang ở trong nhóm mà thanh trên lại tối thui. */
  const fam=$('.tabs .tw:first-child>a');
  if(fam) fam.classList.toggle('on',cur==='tapdoan');
  /* mục con đang xem cũng sáng theo, để mở menu ra là biết mình đứng ở đâu */
  const tNay=cur==='radar'?radarTab:cur==='race'?(RA.mode==='dca'?'dca':'dua'):null;
  $$('.dd a[data-md]').forEach(a=>a.classList.toggle('on',a.dataset.md===cur&&a.dataset.t===tNay));
}
function head(m){
  return '<div class="mhead"><span class="eyebrow">CPVN.IO — công cụ thị trường</span>'+
    '<h1>'+m.ic+' '+m.name+'</h1>'+(m.tag?'<p>'+esc(m.tag)+'</p>':'')+
    (m.meta.length?'<div class="mmeta">'+m.meta.map(t=>'<span class="tagc '+(t[1]||'')+'">'+t[0]+'</span>').join('')+'</div>':'')+'</div>';
}
/* chọn tab bên trong của một module từ menu thả xuống */
function moTab(m,t){
  if(m==='radar'){ radarTab=(t==='cd'||t==='vb')?t:'phien'; if(cur==='radar') renderRadar(); else done.radar=0; }
  /* ĐANG Ở TRANG ĐUA thì BẤM THẲNG nút chuyển chế độ có sẵn, đừng dựng lại module:
     nút đó mới là chỗ chạy syncMode (dừng animation, về vạch xuất phát, đổi khung đồ thị).
     Dựng lại module tưởng gọn mà chế độ không đổi — đã dính đúng vậy. */
  if(m==='race'){ const v=(t==='dca'?'dca':'race'), b=$('#raMode button[data-v="'+v+'"]');
    if(cur==='race'&&b){ if(!b.classList.contains('on')) b.click(); }
    else RA.mode=v; }
  showMod(m);
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
/* ---- SĂN TẬP ĐOÀN: gom công ty cùng một nhà để soi dòng tiền chảy vào cả họ ----
   Bản đồ do tools/build_tapdoan.py dựng từ DANH SÁCH CỔ ĐÔNG của từng mã (data/profile),
   không phải nhập tay. Bấm vào một nhóm là bung danh sách công ty con kèm giá/%/GTGD/NN. */
const tdMo=new Set();
/* Nhãn % SỞ HỮU dán ngay cạnh mã. Tỉ lệ đã nhân dồn dọc chuỗi nên đọc thẳng được: FOC ghi
   23,8% là phần của cả nhà FPT chứ không phải 56,4% mà FPT Telecom đứng tên. Con nắm gián
   tiếp mang dấu ≈ và di chuột vào là biết đi vòng qua ai. */
const soHuu=o=>{
  if(o.p==null) return '<em class="own me">mẹ</em>';
  const s=(+o.p).toFixed(1).replace(/\.0$/,'').replace('.',',');
  return '<em class="own'+(o.gt?' gt':'')+'"'
    +(o.gt?' title="Nắm gián tiếp'+(o.qua?' qua '+esc(o.qua):'')+'"':'')
    +'>'+(o.gt?'≈':'')+s+'%</em>';
};
/* Thứ tự bảng: mặc định VỐN HOÁ cao→thấp, bấm lại chính nút đang bật là lật chiều. Cùng
   một lựa chọn áp cho cả hàng nhóm lẫn danh sách công ty con bên trong — xếp nhóm theo vốn
   hoá mà con bên trong vẫn xếp theo thứ khác thì mắt phải đổi hệ quy chiếu giữa chừng. */
let tdSort={k:'cap',d:-1};                       // d=-1: cao→thấp
const tdKhoa={cap:o=>o.c.mcapLive||o.c.mcap||0, gtgd:o=>o.c.gtgd||0};
const tdXep=ma=>ma.slice().sort((a,b)=>(tdKhoa[tdSort.k](a)-tdKhoa[tdSort.k](b))*tdSort.d);
function tapDoanPanel(){
  const ds=(ST.tapdoan||[]).map(g=>{      // g.me = mã công ty mẹ nếu mẹ cũng niêm yết
    const ma=g.syms.map(x=>({p:x.p,gt:x.gt,qua:x.qua,c:ST.map.get(x.s)})).filter(x=>x.c&&x.c.close>0);
    let cap=0,d=0,gtgd=0,nn=0,up=0,dn=0;
    /* VỐN HOÁ CẢ NHÓM chỉ trừ chồng lấn KHI MẸ CŨNG NIÊM YẾT — vốn hoá VIC đã bao gồm 69%
       VHM nên cộng thô là đếm hai lần. Mẹ không niêm yết (PVN, Viettel, EVN) thì cộng đủ,
       trừ đi là tự tay xoá phần lớn nhóm. */
    const coMe=!!(g.me&&ST.map.has(g.me));
    for(const {p,c} of ma){ const v=c.mcapLive||c.mcap||0;
      cap+=(coMe&&p)?v*Math.max(0,1-Math.min(p,100)/100):v;
      gtgd+=c.gtgd||0; nn+=c.nnVal||0;
      if(c.chg!=null){ d+=c.chg*v; if(c.chg>0.01)up++; else if(c.chg<-0.01)dn++; } }
    const capTho=ma.reduce((a2,x)=>a2+(x.c.mcapLive||x.c.mcap||0),0);
    return {g,ma,cap,d:capTho?d/capTho:0,gtgd,nn,up,dn};
  }).filter(x=>x.ma.length>=2);
  ds.sort((a,b)=>((tdSort.k==='cap'?a.cap-b.cap:a.gtgd-b.gtgd))*tdSort.d);
  if(!ds.length) return '<div class="empty">Chưa có bản đồ tập đoàn — chạy tools/build_tapdoan.py</div>';
  const mx=Math.max.apply(null,ds.map(x=>Math.abs(x.d)))||1;
  const hang=x=>{
    const g=x.g, mo=tdMo.has(g.id);
    /* LOGO CỦA NHÀ: lấy logo mã MẸ khi mẹ có niêm yết (80/164 nhóm). Mẹ không lên sàn
       (PVN, Viettel, SCIC, các Bộ) thì KHÔNG mượn logo của mã con to nhất — nhìn logo GAS
       mà tưởng đó là PVN thì sai hẳn; thay bằng ô chữ tắt lấy từ chính tên nhóm. */
    const cMe=g.me&&ST.map.get(g.me);
    const dau=cMe?logoHTML(cMe)
      :'<span class="gini">'+esc((g.ten||'').replace(/[^\p{L}\p{N}]/gu,'').slice(0,2).toUpperCase())+'</span>';
    return '<div class="tdrow'+(mo?' on':'')+'" data-td="'+esc(g.id)+'">'
      +'<span class="sn"><i class="cr">'+(mo?'▾':'▸')+'</i>'+dau+'<em class="nm">'+esc(g.ten)+'</em>'
      +(g.kieu==='nn'?'<b class="nn">nhà nước</b>':g.kieu==='cn'?'<b class="nn cn">cá nhân</b>':'')+'</span>'
      +'<span class="sbr"><i class="z"></i><i class="b '+(x.d>=0?'pos':'neg')
      +'" style="width:'+(Math.abs(x.d)/mx*50)+'%"></i></span>'
      +'<span class="sp '+cls(x.d)+'">'+pct(x.d)+'</span>'
      +'<span class="sb"><b class="up">▲'+x.up+'</b> <b class="dn">▼'+x.dn+'</b>'
      +'<u>/'+x.ma.length+'</u></span>'
      +'<span class="sc"><i>GTGD</i>'+ty(x.gtgd)+'</span>'
      +'<span class="sn2 '+cls(x.nn)+'"><i>NN ròng</i>'+(x.nn>=0?'+':'−')+ty(Math.abs(x.nn))+'</span>'
      +'<span class="sv"><i>vốn hoá</i>'+ty(x.cap)+'</span></div>'
      /* HÀNG CON PHẢI ĂN KHỚP CỘT VỚI HÀNG NHÓM. Trước đây nó có lưới riêng (5 cột) lồng
         trong khung thụt lề 26px nên mọi con số lệch hẳn khỏi cột của hàng nhóm ngay phía
         trên — mắt vừa đọc "GTGD" ở một chỗ, bung ra lại thấy nó nhảy sang chỗ khác. Nay
         dùng CHUNG lưới `--tdc`, mấy ô `sp0` là chỗ trống giữ đúng cột của thanh xanh đỏ
         và ô đếm tăng giảm; màn hẹp giấu chúng đi thì cột tự dồn y hệt hàng nhóm. */
      +(mo?'<div class="tdcon"><div class="rw hd">'
          +'<span class="c1">công ty<i> · % nhà mẹ nắm</i></span><span class="sp0"></span>'
          +'<span class="tdv">hôm nay</span><span class="sp0"></span>'
          +'<span class="tdg">GTGD</span><span class="tdn">NN ròng</span>'
          +'<span class="tdp">vốn hoá</span></div>'
        +tdXep(x.ma).map(o=>{ const c=o.c, nn=c.nnVal||0;
          return '<div class="rw" data-sym="'+c.sym+'">'
          +'<span class="c1">'+logoHTML(c)
          +'<span class="idn"><b>'+c.sym+soHuu(o)+'</b><i>'+esc(shortName(c.name||''))+'</i></span></span>'
          +'<span class="sp0"></span>'
          +'<span class="tdv '+cls(c.chg)+'">'+pct(c.chg)+'</span>'
          +'<span class="sp0"></span>'
          +'<span class="tdg">'+ty(c.gtgd)+'</span>'
          /* không có số NN thì để gạch ngang trơ, đừng ghép dấu vào: VGI ra "+—" đọc như lỗi */
          +'<span class="tdn '+cls(nn)+'">'+(nn?(nn>0?'+':'−')+ty(Math.abs(nn)):'—')+'</span>'
          +'<span class="tdp">'+ty(c.mcapLive||c.mcap||0)+'</span></div>'; }).join('')+'</div>':'');
  };
  const nutXep=(k,t)=>'<button class="srtb'+(tdSort.k===k?' on':'')+'" data-srt="'+k+'"'
    +' title="Xếp theo '+t+(tdSort.k===k?' — bấm lại để lật chiều':'')+'">'+t
    +(tdSort.k===k?'<i>'+(tdSort.d<0?'↓':'↑')+'</i>':'')+'</button>';
  return '<div class="panel"><div class="ph">Dòng tiền theo tập đoàn'
    +'<span class="tdsrt">xếp theo'+nutXep('cap','vốn hoá')+nutXep('gtgd','GTGD')+'</span>'
    +'<span class="cnt">'+ds.length+' nhóm</span></div>'
    /* lớp x<khoá> để màn hẹp hiện ĐÚNG cột đang xếp theo — nó chỉ đủ chỗ cho một cột tiền,
       xếp theo vốn hoá mà cột hiện ra là GTGD thì bảng trông như không xếp gì cả */
    +'<div class="pb x'+tdSort.k+'" style="padding:10px 16px" id="tdPanel">'+ds.map(hang).join('')+'</div></div>';
}
let radarTab='phien';   // tab đang xem trong module radar: 'phien' | 'cd'
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
  /* THANH KHOẢN lấy số CHÍNH THỨC của cả sàn (VPS trả kèm chỉ số), KHÔNG cộng gtgd từng
     mã: bảng giá chỉ có phần khớp lệnh, thiếu hẳn thoả thuận. Phiên 06/08 cộng tay ra
     13.411 tỷ cho cả 3 sàn, trong khi riêng HOSE đã là 15.136 tỷ. Kho cũ chưa có trường
     này thì rơi về cách cộng cũ, thà thiếu còn hơn trống. */
  const gSan=nm=>(((ST.indices||[]).find(i=>i.name===nm)||{}).gtgd)||0;
  const gHose=gSan('VNINDEX'), gPhu=gSan('HNX')+gSan('UPCOM');
  const infoRow=(k,v,cls2)=>'<div class="rrRow"><span>'+k+'</span>'+
    '<b class="bdg '+(cls2||'')+'">'+v+'</b></div>';
  /* TAB ngay đầu trang radar: xem nhịp phiên hay soi tập đoàn. Để tập đoàn thành một mục
     riêng trên thanh điều hướng chính thì nó tách khỏi bối cảnh phiên, mà hai thứ này
     người xem hay đọc nối nhau. */
  $('#m-radar').innerHTML=head(m)
    /* dải tab của radar đã dọn lên MENU THẢ XUỐNG của mục "Radar" trên thanh trên —
       giữ lại ở đây là hai chỗ chọn cùng một thứ, lại ăn thêm một hàng */
    +'<div id="rdCd"'+(radarTab==='cd'?'':' style="display:none"')+'>'
    +(radarTab==='cd'?chuDiemPanel():'')+'</div>'
    +'<div id="rdVb"'+(radarTab==='vb'?'':' style="display:none"')+'>'
    +(radarTab==='vb'?veBoPanel():'')+'</div>'
    +'<div id="rdPhien"'+(radarTab!=='phien'?' style="display:none"':'')+'>'
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
    +infoRow('Thanh khoản HOSE',ty(gHose||s.gtgd),'bGold')
    +(gPhu?infoRow('HNX + UPCOM',ty(gPhu),''):'')
    +infoRow('Khối ngoại mua ròng',(nnNet>=0?'+':'−')+ty(Math.abs(nnNet)),nnNet>=0?'bUp':'bDn')
    +'</div>'
    +'</div>'
    +'<div id="radarAll">'
    +sectionHead('r-flow','💰 Dòng tiền trong phiên')+'<div class="grid g3">'+flow.join('')+'</div>'
    +sectionHead('r-power','🚀 Sức mạnh giá')+'<div class="grid g3">'+power.join('')+'</div>'
    +sectionHead('r-risk','⚠️ Mặt tối của phiên')+'<div class="grid g3">'+risk.join('')+'</div>'
    +sectionHead('r-sec','🏭 Nhóm ngành hôm nay')+sectorPanel()
    +'</div></div>';
  const bt=$('#vbThem'); if(bt) bt.onclick=()=>{ vbTop+=100; renderRadar(); };
  if(radarTab==='phien') drawSparks($('#m-radar'));
}

/* ======================================================== 4. ĐƯỜNG ĐUA VỐN HOÁ */
/* Ô chọn ngành có thêm RỔ CHỈ SỐ (VN30) đứng riêng trên đầu — không phải một ngành, nên
   mang khoá '@vn30' để không bao giờ đụng tên ngành thật. Rổ lấy thẳng `u.vn30` trong
   universe.json, pipeline làm mới mỗi lượt --full nên đổi rổ là web đổi theo. */
const RO_CHISO={'@vn30':{ten:'VN30', co:s=>ST.vn30.has(s)}};
const tenNganh=k=>(RO_CHISO[k]||{}).ten||k;
const locNganh=k=>{ const r=RO_CHISO[k];
  return r?r.co:(s=>{ const c=ST.map.get(s); return !!c&&c.sector===k; }); };
const RA={f:0,playing:false,speed:1,curY:{},imgs:{},data:null,raf:null,last:0,sector:null,
  settling:false,maxDelta:0,mode:'race',dcaMx:0,top:10};
const TOP_CHON=[10,15,20,25,30];   // số công ty hiện cùng lúc, dùng chung cho cả hai chế độ
const NGUONG_VON=1e12;             // 1.000 tỷ — dưới mức này không vào rổ dựng sẵn
/* BẢNG MÀU KHÔNG GIỚI HẠN: 16 màu chọn tay cho những thứ hạng đầu (đẹp và quen mắt),
   quá 16 thì sinh thêm bằng GÓC VÀNG 137,5° nên màu nào cũng cách xa màu liền kề —
   30 công ty cùng lúc vẫn không có hai đường trùng tông. */
const COL16=['#2dd4bf','#f43f5e','#f5b40a','#38bdf8','#a78bfa','#16c784','#fb923c','#e879f9',
             '#4ade80','#60a5fa','#f87171','#facc15','#34d399','#c084fc','#fbbf24','#22d3ee'];
function mauThu(i){
  if(i<COL16.length) return COL16[i];
  const h=Math.round((23+(i-COL16.length)*137.508)%360);
  return 'hsl('+h+','+(isLight()?'68%,42%':'70%,64%')+')';
}
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
  /* giữ THỨ TỰ chứ không giữ mã màu: màu sinh ra phụ thuộc nền sáng/tối, mà RA.data thì
     nhớ suốt phiên — chốt cứng mã màu là đổi giao diện xong màu cũ vẫn nằm nguyên đó. */
  const idx={}; syms.forEach((s,i)=>idx[s]=i);
  /* NGƯỠNG VỐN HOÁ: mã dưới 1.000 tỷ (theo vốn hoá HIỆN TẠI) không vào các rổ dựng sẵn —
     thanh khoản mỏng, mua bán vài trăm triệu là đã đội giá, nên đưa vào đường đua chỉ tổ
     đẻ ra những cú nhân mấy chục lần mà ngoài đời không ai vào được. 414/1.519 mã lọt.
     Vẫn GÕ TAY được mã nhỏ ở ô "gõ mã riêng" — chặn cả lối đó là tước mất lựa chọn. */
  const lon=new Set(syms.filter(x=>{ const c=ST.map.get(x);
    return c&&(c.mcapLive||c.mcap||0)>=NGUONG_VON; }));
  RA.data={labels:R.labels,series,syms,idx,lon,note:R.note};
  return RA.data;
}
function raceFmt(v){ if(v==null) return '—';   // v tính bằng NGHÌN TỶ -> quy về tỷ
  return Math.round(v*1000).toLocaleString('en-US')+' tỷ'; }
/* DẤU THƯƠNG HIỆU mờ chính giữa canvas — ai quay màn hình cũng mang theo CPVN.IO.
   Ảnh nạp một lần; về sau khi canvas đã vẽ xong thì vẽ lại một lượt. */
/* MỘT chỗ chỉnh duy nhất cho dấu chìm, dùng chung cả hai biểu đồ — trước đây chỉ biểu đồ
   đầu tư bền vững được chỉnh nên nhìn sang đường đua lại tưởng chưa đổi gì.
   Các bước +15%/+20% liên tiếp nằm dưới ngưỡng mắt nhận ra (alpha 0,090 -> 0,104 -> 0,119),
   nên chốt hẳn một mức đọc rõ khi quay video: chữ ~0,20 và cỡ gấp rưỡi. */
const DAU_DAM=2.2, DAU_TO=1.45;
const BRAND=new Image(); let brandOK=false;
BRAND.onload=()=>{ brandOK=true; if(cur==='race') curDraw(); };
BRAND.src='assets/logo-128.png?v=3';
/* `dam` = hệ số đậm nhạt, `to` = hệ số phóng to, so với mức nền (1 = như cũ). Biểu đồ
   đầu tư bền vững nhiều khoảng trống hơn đường đua nên dấu chìm ở đó chịu được đậm và
   to hơn — quay video lên là logo đọc rõ mà vẫn không át đường giá. */
function brandMark(x,W,H,dam,to){
  x.save(); x.textBaseline='middle';
  const a=(isLight()?0.09:0.11)*(dam||1), s=clamp(W*0.055,20,30)*(to||1);
  x.font='800 '+s+'px system-ui';
  const tw=x.measureText('CPVN.IO').width;
  const lg=brandOK?s*1.4:0, gap=lg?s*0.3:0, x0=(W-(lg+gap+tw))/2, cy=H/2;
  if(lg){ x.globalAlpha=a+0.05*(dam||1); x.drawImage(BRAND,x0,cy-lg/2,lg,lg); }
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
  let pool=D.syms.filter(s=>D.lon.has(s));
  if(RA.sector) pool=pool.filter(locNganh(RA.sector));
  const N=RA.top||10;
  const rows2=pool.map(s=>({s,v:val(s)})).filter(r=>r.v!=null&&r.v>0)
    .sort((a,b)=>b.v-a.v).slice(0,N);           // số công ty do người xem chọn (10..30)
  if(!rows2.length){ x.fillStyle=isLight()?'#5d6272':'#9092a3'; x.font='13px system-ui';
    x.textAlign='center'; x.fillText('Ngành này chưa đủ dữ liệu đua',W/2,H/2); return; }
  for(const r of rows2) if(RA.imgs[r.s]===undefined){ const im=new Image();
    im.onerror=()=>{ RA.imgs[r.s]=null; }; im.src='assets/logo/'+r.s+'.webp'; RA.imgs[r.s]=im; }
  const mx=rows2[0].v*1.06;
  /* MÀN HẸP (điện thoại dọc): logo+mã thu nhỏ để nhường đường đua cho thanh vốn hoá,
     con số vốn hoá in ĐẬM bám cuối thanh (hết chỗ thì nằm trong thanh) — nổi hơn hẳn. */
  const mob=W<560;
  const top=16, rowH=(H-top-(mob?38:46))/rows2.length;
  /* CÀNG NHIỀU CÔNG TY thì hàng càng mỏng -> logo và chữ phải co theo, bằng không 30 hàng
     chồng lấn nhau thành một mảng đặc. Trần giữ đúng cỡ cũ để 10 hàng nhìn y như trước. */
  const logoR=clamp(rowH*.32,4.5,mob?8:12);
  const fzTen=clamp(rowH*.42,8.5,mob?11.5:14), fzSo=clamp(rowH*.4,8,mob?11.5:12.5);
  const labX=mob?60:118, barX=labX+(mob?6:10);
  const barW=W-barX-(mob?12:130);
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
    const y=RA.curY[r.s], col=mauThu(D.idx[r.s]||0);
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
    x.font='800 '+fzTen.toFixed(1)+'px system-ui';
    x.textAlign='left'; x.textBaseline='middle';
    x.fillText(r.s,mob?26:labX-52,y+rowH*.5);
    const vt=raceFmt(r.v);
    x.font=(mob?'800 ':'700 ')+fzSo.toFixed(1)+'px system-ui';
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
  brandMark(x,W,H,DAU_DAM,DAU_TO);
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
/* ---- ĐẦU TƯ: bỏ tiền ĐỀU HÀNG THÁNG hay MỘT LẦN DUY NHẤT, vào TỪNG MÃ hay GỘP RỔ
   CHIA ĐỀU — luôn kèm đối thủ ngân hàng 7%/năm để biết mua cổ phiếu thắng hay thua gửi
   tiết kiệm. Dùng CHÍNH chuỗi race (mcap = giá tháng đó × SLCP hiện tại): tỉ lệ giữa các
   tháng đúng bằng tỉ lệ giá, nên với chuỗi a và tháng bắt đầu i0:
     hàng tháng   v_k = X · a_k · Σ(1/a_j, j=0..k)   (tháng nào cũng mua thêm)
     một lần      v_k = X · a_k / a_0                 (mua đúng tháng i0 rồi giữ)
     phân bổ đều  = trung bình cộng các đường (mỗi mã X/N), chia đều và không cân lại. */
const DCA={amtD:5,amtM:100,from:0,sec:null,ma:'',kieu:'deu',gop:false,calc:null};
const dcaTien=()=>+(DCA.kieu==='mot'?DCA.amtM:DCA.amtD)||0;
function dcaFmt(v){ // v tính bằng TRIỆU đồng
  if(v>=1000) return (v/1000).toLocaleString('en-US',{maximumFractionDigits:v>=10000?1:2})+' tỷ';
  if(v>=10) return Math.round(v).toLocaleString('en-US')+' triệu';
  /* DƯỚI 10 TRIỆU phải giữ phần lẻ: chia đều 5 triệu cho rổ VN30 là 0,185 triệu mỗi mã,
     làm tròn kiểu cũ ra "0 triệu" — đọc như thể không mua gì. */
  if(v>=1) return (+v.toFixed(1))+' triệu';
  return Math.round(v*1000).toLocaleString('en-US')+' nghìn';
}
function dcaPct(v,goc){ if(!(goc>0)) return '';
  const p=(v/goc-1)*100;
  return (p>=0?'+':'')+(Math.abs(p)>=1000?Math.round(p).toLocaleString('en-US'):p.toFixed(0))+'%'; }
/* chuỗi giá trị THEO TỪNG THÁNG của mọi mã đạt điều kiện — tính MỘT lần mỗi khi đổi tham
   số, biểu đồ và bảng xếp hạng cùng đọc. Đòi có giá NGAY tháng bắt đầu, đứt tháng nào loại. */
function dcaAll(){
  if(DCA.calc) return DCA.calc;
  const D=raceData(); if(!D) return null;
  const L=D.labels.length, i0=clamp(DCA.from,0,L-1), amt=dcaTien(), n=L-i0;
  const mot=DCA.kieu==='mot';
  /* GÕ MÃ có quyền cao hơn chọn ngành: "HPG" -> một mã; "HPG FPT VCB" -> rổ chia đều
     đúng mấy mã đó. Mã không nằm trong dữ liệu đua thì gom vào `thieu` để báo lại. */
  const goTay=[...new Set((DCA.ma||'').toUpperCase().match(/[A-Z][A-Z0-9]{2,}/g)||[])];
  const laMa=goTay.length>0, thieu=[];
  let pool;
  if(laMa) pool=goTay.filter(s=>{ if(D.series[s]) return true; thieu.push(s); return false; });
  else{
    /* RỔ CHIA ĐỀU TÍNH TRÊN TOÀN NGÀNH, không cắt theo vốn hoá. Ngưỡng 1.000 tỷ sinh ra
       để chặn mấy cú "nhân ba mươi lần" của mã thanh khoản mỏng chiếm hết đường vẽ —
       nhưng khi chia đều thì mỗi mã chỉ gánh 1/N, không mã nào lái được cả rổ, mà bỏ
       chúng ra thì rổ "ngành X" lại không phải ngành X. Ngưỡng vì vậy chỉ còn áp cho
       ĐƯỜNG VẼ RIÊNG từng mã, xử ở dưới. */
    pool=D.syms.slice();
    if(DCA.sec) pool=pool.filter(locNganh(DCA.sec));
  }
  const rows=[], chuaCo=[];
  for(const s of pool){
    const a=D.series[s];
    if(!(a[i0]>0)){ chuaCo.push(s); continue; }   // chưa niêm yết / chưa có giá tháng đó
    let acc=0, ok=true; const vals=[];
    for(let i=i0;i<L;i++){ const v=a[i]; if(!(v>0)){ ok=false; break; }
      if(mot) vals.push(amt*v/a[i0]);
      else { acc+=1/v; vals.push(amt*acc*v); } }
    if(ok) rows.push({s,vals,fin:vals[vals.length-1]});
  }
  rows.sort((a,b)=>b.fin-a.fin);
  let ro=null;                        // RỔ CHIA ĐỀU: mỗi mã X/N -> đường rổ = trung bình cộng
  if(rows.length){
    const N=rows.length, vals=new Array(n).fill(0);
    for(const r of rows) for(let k=0;k<n;k++) vals[k]+=r.vals[k]/N;
    ro={s:'rổ',vals,fin:vals[n-1],n:N};
  }
  /* ĐƯỜNG VẼ RIÊNG mới chịu ngưỡng vốn hoá — rổ ở trên đã tính đủ cả ngành rồi.
     Gõ mã tay thì không cắt gì: đã gõ đích danh là có ý xem đúng mã đó. */
  const veRieng=laMa?rows:rows.filter(r=>D.lon.has(r.s));
  const nhoBiAn=rows.length-veRieng.length;
  const rB=0.07/12;                   // 7%/năm ghép lãi theo tháng
  DCA.calc={rows:veRieng,roRows:rows,nhoBiAn,ro,n,i0,amt,mot,thieu,laMa,chuaCo,
    /* vốn đã bỏ tới tháng thứ k; một lần thì vốn đứng yên bằng đúng X */
    von:k=>mot?amt:amt*(k+1),
    /* ngân hàng cùng quy ước với cổ phiếu: khoản vừa bỏ tháng này chưa kịp sinh lời,
       nên k=0 cả hai bên đều đúng bằng X — so nhau mới công bằng */
    bank:k=>mot?amt*Math.pow(1+rB,k):amt*((Math.pow(1+rB,k+1)-1)/rB)};
  return DCA.calc;
}
const GRAD={up:'linear-gradient(90deg,rgba(22,199,132,.45),var(--green))',
            dn:'linear-gradient(90deg,rgba(234,57,67,.45),var(--red))',
            nh:'linear-gradient(90deg,rgba(245,180,10,.3),#f5b40a)',
            ro:'linear-gradient(90deg,rgba(45,212,191,.35),#2dd4bf)'};
/* TÊN CỦA RỔ = thứ người dùng vừa chọn, không phải "rổ 12 mã": trên biểu đồ đang chạy thì
   "Tài chính ngân hàng" nói đúng ngay cái đang xem, còn số mã đã có ở dòng phụ. */
function tenRo(C2){
  if(C2.laMa){ const m=C2.rows.map(r=>r.s);
    return m.length<=3?m.join(' · '):m.length+' mã đã chọn'; }
  return tenNganh(DCA.sec)||'Toàn thị trường';
}
function renderDCA(){
  const D=raceData(), box=$('#dcaOut'); if(!D||!box) return;
  const C2=dcaAll(); if(!C2) return;
  const n=C2.n, amt=C2.amt, von=C2.von(n-1), moc=D.labels[C2.i0], sum=$('#dcaSum');
  if(sum) sum.innerHTML=!(amt>0)?'':((C2.mot
      ? 'bỏ <b>'+dcaFmt(amt)+'</b> một lần tháng '+moc+' rồi giữ tới nay ('+n+' tháng)'
      : 'bỏ <b>'+dcaFmt(amt)+'</b>/tháng × '+n+' tháng = vốn <b>'+dcaFmt(von)+'</b>')
    /* NÓI THẲNG SỐ MÃ TRONG RỔ và vì sao nó khác con số người ta trông đợi: VN30 chọn từ
       3/2020 chỉ ra 27 vì TCX, VPL, SSB niêm yết sau. Không ghi ra thì người xem tưởng
       thiếu dữ liệu. */
    +(C2.ro&&!C2.laMa?' · rổ <b>'+C2.ro.n+' mã</b>':'')
    +(C2.nhoBiAn?' <span style="color:var(--mut)">('+C2.nhoBiAn+' mã dưới 1.000 tỷ có tính vào rổ nhưng không vẽ đường riêng)</span>':'')
    +(C2.thieu.length?' · <span style="color:var(--red)">không có dữ liệu: '+esc(C2.thieu.join(', '))+'</span>':'')
    +(C2.chuaCo.length?' · <span style="color:var(--mut)">chưa có giá tháng '+moc+' nên đứng ngoài: '
        +esc(C2.chuaCo.slice(0,14).join(', '))+(C2.chuaCo.length>14?' …+'+(C2.chuaCo.length-14):'')+'</span>':''));
  if(!(amt>0)){ box.innerHTML='<div class="empty">Nhập số tiền đầu tư</div>'; return; }
  /* bảng bám theo số công ty đang chọn — chốt cứng 12 thì chọn "30 công ty" xong bảng
     vẫn chỉ ra 12 dòng, nhìn như dữ liệu bị thiếu. Sàn 12 để mặc định không hụt so với trước. */
  const top=C2.rows.slice(0,Math.max(RA.top||10,12));
  const nh=C2.bank(n-1);
  const mxv=Math.max(nh,C2.ro?C2.ro.fin:0,top.length?top[0].fin:0)||1;
  /* một hàng của bảng: logo · tên · thanh tỉ lệ · giá trị + % so vốn đã bỏ */
  const dong=(o)=>'<div class="dcarow'+(o.sym?'':' fix')+'"'+(o.sym?' data-sym="'+o.sym+'" title="Bấm mở trang '+o.sym+'"':'')+'>'
    +(o.logo||'<span class="noimg" style="font-size:13px">'+o.ico+'</span>')
    +'<span class="idn"><b'+(o.mau?' style="color:'+o.mau+'"':'')+'>'+o.ten+'</b><i>'+esc(o.phu||'')+'</i></span>'
    +'<span class="dbar"><i style="width:'+(Math.max(0,o.val)/mxv*100).toFixed(1)+'%;background:'+o.bg+'"></i></span>'
    +'<span class="dval">'+dcaFmt(o.val)+'<b class="'+(o.val>=von?'up':'dn')+'">'+dcaPct(o.val,von)+'</b></span></div>';
  /* NGÂN HÀNG luôn đứng đầu bảng: mọi con số bên dưới đọc xong là biết hơn/kém gửi tiết kiệm */
  let html=dong({ico:'🏦',ten:'Ngân hàng 7%/năm',mau:'#f5b40a',
    phu:C2.mot?'gửi một lần, ghép lãi theo tháng':'gửi đều mỗi tháng, ghép lãi theo tháng',
    val:nh,bg:GRAD.nh});
  if(DCA.gop&&C2.ro) html+=dong({ico:'⚖',ten:esc(tenRo(C2)),mau:'var(--tealT)',
    phu:'phân bổ đều '+C2.ro.n+' mã · mỗi mã '+dcaFmt(amt/C2.ro.n)+(C2.mot?'':'/tháng'),
    val:C2.ro.fin,bg:GRAD.ro});
  html+=top.map(r=>{
    const c=ST.map.get(r.s)||{sym:r.s,name:'',img:null};
    return dong({sym:r.s,logo:logoHTML(c),ten:r.s,phu:shortName(c.name||''),
      val:r.fin,bg:r.fin>=von?GRAD.up:GRAD.dn});
  }).join('');
  box.innerHTML=top.length?html
    :'<div class="empty">'+(C2.laMa?'Mã đã gõ không có trong dữ liệu đua'
       :'Nhóm này không có mã nào đủ dữ liệu từ tháng đã chọn')+'</div>';
}
/* BIỂU ĐỒ ĐẦU TƯ BỀN VỮNG: trục dọc = số tiền, trục ngang = thời gian, chạy từng
   tháng như đường đua. Mỗi mã một đường, nhãn mã bám đầu đường; thêm đường đứt
   "vốn đã bỏ" để thấy ngay lãi/lỗ. Trục co giãn mượt theo giá trị lớn nhất đã hiện. */
function drawDCA(lerp){
  const cv=$('#cvDca'); if(!cv) return;
  const D=raceData(), C2=dcaAll(); if(!D||!C2) return;
  const W=cv.clientWidth||900, H=cv.clientHeight||520, x=dpr(cv,W,H);
  const mob=W<560, TXTC=isLight()?'#101321':'#ecedf4', MUTC=isLight()?'#5d6272':'#9092a3';
  /* PHÂN BỔ ĐỀU -> đúng MỘT đường (cả danh mục); tắt -> bấy nhiêu đường người xem chọn */
  const rows=DCA.gop?(C2.ro?[C2.ro]:[]):C2.rows.slice(0,RA.top||10);
  if(!rows.length||!(C2.amt>0)){
    x.fillStyle=MUTC; x.font='13px system-ui'; x.textAlign='center';
    x.fillText(!(C2.amt>0)?'Nhập số tiền đầu tư'
      :(C2.laMa?'Mã đã gõ không có trong dữ liệu đua'
               :'Nhóm này không có mã nào đủ dữ liệu từ tháng đã chọn'),W/2,H/2);
    return;
  }
  for(const r of rows) if(RA.imgs[r.s]===undefined){ const im=new Image();
    im.onerror=()=>{ RA.imgs[r.s]=null; }; im.src='assets/logo/'+r.s+'.webp'; RA.imgs[r.s]=im; }
  const n=C2.n, f=clamp(RA.f,0,n-1);
  const iA=Math.floor(f), iB=Math.min(n-1,iA+1), tt=f-iA;
  const cur=a=>a[iA]+((a[iB]!=null?a[iB]:a[iA])-a[iA])*tt;
  const bank=C2.bank;                            // đối thủ ngân hàng 7%/năm (xem dcaAll)
  /* padR = chỗ dành cho nhãn đầu đường: logo + tên + số tiền + %. Nhãn dài nhất là
     "Ngân hàng 7% 984 triệu +26%" ~200px — để 172 thì phần % bị cắt cụt ngoài khung. */
  const fNhan=mob?'800 10.5px system-ui':'800 12.5px system-ui';
  const padL=mob?10:14, padT=20, padB=30;
  const gopRo=DCA.gop&&C2.ro;
  let padR=mob?110:210, nhanRo=[];
  if(gopRo&&!mob){
    /* Tên NGÀNH dài không đoán trước được ("Quản lý và phát triển bất động sản"): thay vì
       cắt cụt cho vừa một dòng, BẺ XUỐNG TỐI ĐA 2 DÒNG rồi số tiền nằm dòng dưới cùng.
       Chốt trần padR trước (34% bề ngang) rồi mới bẻ theo chỗ đó — làm ngược lại thì tên
       dài hơn trần là tràn khỏi khung. */
    const tran=W*0.34, cung=11+12;
    x.font=fNhan; nhanRo=beDong(x,tenRo(C2),tran-cung,2);
    const rong=Math.max(...nhanRo.map(s=>x.measureText(s).width),0);
    padR=clamp(cung+rong,padR,tran);
  }
  /* MÀN DỌC: nhét tên ngành vào đầu đường thì chỉ còn "Tài chính…" — cụt và mất chỗ vẽ.
     Đưa hẳn lên khối chữ lớn góc trên (chỗ đang trống trong chế độ này), đầu đường chỉ
     giữ chấm màu + số tiền. Quay video là đọc được ngay đang xem nhóm nào. */
  const roHUD=gopRo&&mob?tenRo(C2):'';
  const plotW=W-padL-padR, plotH=H-padT-padB;
  const xmax=Math.max(f,6);                      // trục ngang nở dần theo cuộc chạy
  const X=i=>padL+i/xmax*plotW;
  // đỉnh trục tiền: giá trị lớn nhất ĐÃ HIỆN (mã, ngân hàng, vốn), co giãn mượt
  let mx=Math.max(C2.von(iB),bank(iB));
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
  brandMark(x,W,H,DAU_DAM,DAU_TO);               // dấu thương hiệu, dưới các đường
  // tháng hiện tại to mờ + HUD "đã bỏ bao nhiêu" — nhìn phát biết ngay vốn theo từng tháng
  x.fillStyle=isLight()?'rgba(16,19,33,.12)':'rgba(255,255,255,.09)';
  x.font=mob?'900 30px system-ui':'900 44px system-ui'; x.textAlign='left';
  x.fillText(D.labels[C2.i0+Math.round(f)],padL+6,padT+(mob?22:30));
  const soThang=Math.floor(f)+1, von=C2.von(f);
  x.fillStyle=TXTC; x.font=mob?'800 15px system-ui':'800 20px system-ui';
  x.fillText('đã bỏ '+dcaFmt(von),padL+8,padT+(mob?48:66));
  x.fillStyle=MUTC; x.font=mob?'700 10.5px system-ui':'700 12px system-ui';
  x.fillText(C2.mot?('mua một lần tháng '+D.labels[C2.i0]+' · giữ '+soThang+' tháng')
                   :(soThang+' tháng × '+dcaFmt(C2.amt)),padL+8,padT+(mob?64:86));
  if(roHUD){                                     // màn dọc: tên nhóm ngành nằm ngay dưới HUD
    x.fillStyle=isLight()?'#0d9488':'#2dd4bf'; x.font='800 12.5px system-ui';
    const duoi=' · '+C2.ro.n+' mã';
    x.fillText(catChu(x,roHUD,W-padL-18-x.measureText(duoi).width)+duoi,padL+8,padT+82);
  }
  // đường VỐN ĐÃ BỎ (đứt nét) — mốc so lãi/lỗ; mua một lần thì nó nằm ngang
  x.strokeStyle=MUTC; x.setLineDash([5,4]); x.lineWidth=1.2; x.beginPath();
  for(let i=0;i<=iA;i++){ const p=[X(i),Y(C2.von(i))]; i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]); }
  x.lineTo(X(f),Y(von)); x.stroke(); x.setLineDash([]);
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
  const RO=isLight()?'#0d9488':'#2dd4bf';        // đường PHÂN BỔ ĐỀU dùng màu ngọc riêng
  const tips=[];
  /* Trục tiền GIÃN TỪ TỪ theo giá trị lớn nhất đã hiện, nên giữa lúc chạy đường vọt lên
     luôn nhô khỏi đỉnh khung một nhịp. Cắt gọn phần nhô ra bằng clip, bằng không nét vẽ
     đè thẳng lên số tháng to và dòng "đã bỏ ...". Nhãn nằm NGOÀI clip nên vẫn hiện đủ. */
  x.save();
  x.beginPath(); x.rect(padL,padT-4,plotW+3,plotH+8); x.clip();
  const bPts=ptsOf(bank); bPts.push([X(f),Y(bank(f))]);
  vien(bPts,GOLD,2.6);                           // ngân hàng vẽ TRƯỚC: nó là mốc, nằm dưới
  rows.forEach((r,ri)=>{
    const gop=r===C2.ro, col=gop?RO:mauThu(ri+1);   // +1: nhường màu ngọc cho đường phân bổ đều
    const vNow=cur(r.vals);
    const pts=ptsOf(i=>r.vals[i]); pts.push([X(f),Y(vNow)]);
    vien(pts,col,gop?3.2:2.6);
    tips.push({s:gop?'':r.s,dong:gop?nhanRo:null,col,v:vNow,y:Y(vNow),gop});
  });
  x.restore();
  tips.push({s:mob?'NH 7%':'Ngân hàng 7%',col:GOLD,v:bank(f),y:Y(bank(f)),bank:true});
  /* nhãn "vốn đã bỏ" ĐI CHUNG hàng ngũ với các nhãn khác: mua một lần thì nó nằm rất
     thấp, để nó vẽ riêng là chồng đúng lên mấy mã đội sổ */
  tips.push({s:'vốn đã bỏ',col:MUTC,v:von,y:Y(von),von:true});
  // nhãn: dồn cho khỏi đè nhau rồi vẽ logo/chấm màu + mã + giá trị + % lãi
  tips.sort((a,b)=>a.y-b.y);
  /* nhãn nhiều thì phải nép lại cho đủ chỗ: 30 đường × 22px là 660px, quá cả vùng vẽ */
  const GAP=clamp(plotH/(tips.length+1),mob?11:12.5,mob?18:22), LH=mob?12:14, x0=X(f);
  /* Nhãn tên-ngành chiếm NHIỀU DÒNG nên mỗi nhãn mang bề cao riêng; dồn theo bề cao đó
     chứ không theo một GAP chung, bằng không khối 3 dòng đè lên hàng xóm. */
  for(const t of tips) t.h=t.dong&&t.dong.length?Math.max(GAP,(t.dong.length+1)*LH):GAP;
  /* KẸP VÀO TRONG KHUNG TRƯỚC KHI DỒN: đường nào đang nhô khỏi đỉnh (trục chưa giãn kịp)
     thì nhãn của nó rơi vào toạ độ ÂM và biến mất khỏi canvas ngay giữa lúc chạy — đúng
     lúc người xem đang nhìn con số đó. Kẹp xong mới dồn cho khỏi đè nhau. */
  for(const t of tips) t.y=clamp(t.y,padT+t.h/2,padT+plotH-t.h/2);
  for(let i=1;i<tips.length;i++){
    const can=(tips[i-1].h+tips[i].h)/2;
    if(tips[i].y-tips[i-1].y<can) tips[i].y=tips[i-1].y+can;
  }
  /* tràn đáy thì đẩy NGƯỢC LÊN theo dây chuyền — bản cũ chỉ nhích được đúng một nhãn
     nên khi 4-5 nhãn cùng dồn xuống đáy (kiểu mua một lần, mã đội sổ nằm sát nhau) là
     chúng đè chồng lên nhau thành một mớ chữ */
  for(let i=tips.length-1;i>=0;i--){
    const lim=(i===tips.length-1?padT+plotH-tips[i].h/2
                                :tips[i+1].y-(tips[i].h+tips[i+1].h)/2);
    if(tips[i].y>lim) tips[i].y=lim;
  }
  x.textBaseline='middle';
  const fTien=mob?'700 10px system-ui':'700 11.5px system-ui';
  const veTien=(t,sx,yy)=>{                      // số tiền + % lãi/lỗ so vốn đã bỏ
    const s1=dcaFmt(t.v);
    x.fillStyle=TXTC; x.font=fTien;
    x.fillText(s1,sx,yy);
    const w1=x.measureText(s1).width;            // đo TRƯỚC khi đổi font sang cỡ của %
    /* % kể cả đường ngân hàng, để đọc thẳng "cổ phiếu +323% / gửi +18%" */
    if(!mob&&von>0){
      const p=(t.v/von-1)*100;
      x.fillStyle=p>=0?(isLight()?'#0a9e63':'#16c784'):(isLight()?'#dc3644':'#ea3943');
      x.font='700 10.5px system-ui';
      x.fillText((p>=0?'+':'')+(Math.abs(p)>=1000?Math.round(p).toLocaleString('en-US'):p.toFixed(0))+'%',
                 sx+w1+5,yy);
    }
  };
  for(const t of tips){
    let sx=x0+6;
    if(t.von){                                   // nhãn vốn: chỉ chữ mờ, không chấm/không %
      x.fillStyle=MUTC; x.font=mob?'700 10px system-ui':'700 11px system-ui';
      x.textAlign='left'; x.fillText('vốn đã bỏ '+dcaFmt(von),sx,t.y); continue;
    }
    x.textAlign='left';
    if(t.dong&&t.dong.length){                   // TÊN NHÓM NGÀNH: tên xuống dòng, tiền dưới cùng
      x.fillStyle=t.col; x.beginPath(); x.arc(sx+3.5,t.y-(t.dong.length)*LH/2,3.5,0,7); x.fill();
      const sx2=sx+11;
      let yy=t.y-(t.dong.length)*LH/2;
      x.font=mob?'800 10.5px system-ui':'800 12.5px system-ui'; x.fillStyle=t.col;
      for(const ln of t.dong){ x.fillText(ln,sx2,yy); yy+=LH; }
      veTien(t,sx2,yy);
      continue;
    }
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
    x.fillText(t.s,sx,t.y);
    veTien(t,sx+x.measureText(t.s).width+5,t.y);
  }
}
function tapDoanNote(){
  return '<div class="note">Bản đồ dựng TỰ ĐỘNG từ danh sách cổ đông của từng mã '
    +'(<code>tools/build_tapdoan.py</code>), không nhập tay: ai nắm từ 20% của hai mã trở lên '
    +'thì xếp chung một nhà. <b>Cổ đông có mã niêm yết thì gom theo MÃ chứ không theo tên</b> — '
    +'một công ty viết hai kiểu tên là tách thành hai nhóm rời, Sonadezi từng bị đúng vậy: 8 '
    +'công ty con ghi cổ đông là "Tổng Công ty Cổ phần Phát triển Khu công nghiệp", không có '
    +'chữ nào là "Sonadezi". Từ đó lan tiếp theo danh sách công ty con nên bắt được cả '
    +'<b>con gián tiếp</b> — FOC không có nổi một dòng cổ đông nhắc tới FPT, phải đi vòng qua '
    +'FPT Telecom mới ra. Bảng mặc định xếp theo VỐN HOÁ cao→thấp; đổi sang GTGD để thấy tiền '
    +'đang chảy vào họ nào chứ không phải họ nào to nhất, bấm lại nút đang bật là lật chiều. '
    +'Thứ tự áp cho cả danh sách công ty con bên trong. <b>% cạnh mã là tỉ lệ nhà mẹ '
    +'nắm, đã nhân dồn dọc chuỗi</b>: FPT nắm 45,7% FPT Telecom, FPT Telecom nắm 56,4% FOC thì '
    +'FOC ghi ≈23,8% chứ không phải 56,4%. Dấu ≈ là nắm gián tiếp, rê chuột vào biết đi qua ai. '
    +'Nhóm do nhà nước hoặc cá nhân chi phối được dán nhãn riêng: Ngân hàng Nhà nước '
    +'nắm cả BID, VCB, CTG nhưng ba ngân hàng đó không cùng một nhà.</div>';
}
/* ---- CHỦ ĐIỂM ĐẦU TƯ — DẪN NGUỒN SSI RESEARCH ----------------------------------
   ĐÂY LÀ Ý KIẾN KHUYẾN NGHỊ CỦA BÊN THỨ BA, KHÔNG PHẢI của trang. Trang chỉ dẫn lại,
   nên tên nguồn phải nằm ngay đầu mục và lời miễn trừ nằm ngay dưới — cả hai KHÔNG
   được rút gọn cho gọn mắt.

   Sơ đồ ba trục nhập tay (SSI không mở dữ liệu này ra ngoài — xem tools/build_chudiem.py),
   còn khuyến nghị + giá mục tiêu từng mã thì tự cập nhật mỗi phiên từ kho báo cáo. */
function cdBadge(kn){
  const k=(kn||'').toUpperCase();
  const m=/MUA|KHẢ QUAN/.test(k)?'mua':/BÁN|KÉM/.test(k)?'ban':/TRUNG LẬP|NẮM GIỮ/.test(k)?'giu':'';
  return kn?'<b class="cdkn '+m+'">'+esc(kn)+'</b>':'';
}
/* SƠ ĐỒ BA VÒNG (Venn) — dựng lại đúng dạng slide gốc của nguồn, vẽ bằng SVG nên co giãn
   theo bề ngang và đổi màu theo giao diện sáng/tối. Ba vòng tô cùng một độ mờ, chỗ chồng
   nhau tự đậm lên — đó chính là thứ nói lên "mã này hội tụ mấy chủ điểm", khỏi cần chú thích. */
function vennSVG(D,T){
  const tr=(D.truc||[]).slice(0,3);
  if(tr.length<3) return '';
  const R=210, d=165, C=[[0,-d],[-d*0.866,d*0.5],[d*0.866,d*0.5]];   // 0 trên · 1 trái · 2 phải
  /* NEO TỪNG VÙNG đặt tay chứ không lấy trọng tâm hình học: trọng tâm của vùng "chỉ một
     vòng" nằm lệch về phía chỗ chồng lấn, chữ hai vùng cạnh nhau sẽ đè lên nhau. */
  const NEO={'0':[0,-258],'1':[-234,116],'2':[234,116],
             '01':[-152,-86],'02':[152,-86],'12':[0,172],'012':[0,4]};
  const LH=27, idx={};
  tr.forEach((t,i)=>idx[t.id]=i);
  const khoa=x=>x.truc.map(id=>idx[id]).filter(i=>i!=null).sort().join('');
  const vung={};
  for(const x of D.ma){ const k=khoa(x); if(NEO[k]) (vung[k]=vung[k]||[]).push(x); }
  /* tên chủ điểm dài thì bẻ CÂN hai dòng — bẻ theo số ký tự tối đa sẽ ra một dòng dài
     một dòng cụt lủn, nhìn lệch hẳn so với khối mã bên dưới */
  const beDoi=s=>{ if(s.length<=17) return [s];
    const w=s.split(' '); let a='',i=0;
    while(i<w.length && (a+' '+w[i]).trim().length<=Math.ceil(s.length/2)) a=(a+' '+w[i++]).trim();
    return [a||w[0], w.slice(a?i:1).join(' ')].filter(Boolean); };
  let g='';
  for(let i=0;i<3;i++) g+='<circle cx="'+C[i][0].toFixed(1)+'" cy="'+C[i][1].toFixed(1)+'" r="'+R
    +'" fill="'+tr[i].mau+'" fill-opacity=".15" stroke="'+tr[i].mau+'" stroke-opacity=".45"/>';
  for(const k in vung){
    const mot=k.length===1, dong=mot?beDoi(tr[+k].ten):[];
    const n=dong.length+vung[k].length, [ax,ay]=NEO[k];
    let y=ay-(n-1)*LH/2;
    for(const t of dong){ g+='<text class="vtt" x="'+ax+'" y="'+y+'" fill="'+tr[+k].mau+'">'+esc(t)+'</text>'; y+=LH; }
    for(const x of vung[k]){
      const c=ST.map.get(x.s), kn=x.ssi||{};
      const chu=c&&c.chg!=null?'  '+pct(c.chg):'';
      g+='<g class="cdsym" data-sym="'+x.s+'"><title>'+esc(x.s+(c?' · '+shortName(c.name||''):'')
          +(kn.kn?' · SSI '+kn.kn:'')+(kn.tp?' · mục tiêu '+Math.round(kn.tp).toLocaleString('en-US')+' đ':''))+'</title>'
        +'<text class="vsym" x="'+ax+'" y="'+y+'">'+x.s
        +'<tspan class="vpc '+cls(c&&c.chg)+'">'+esc(chu)+'</tspan></text></g>';
      y+=LH;
    }
  }
  return '<div class="venn"><svg viewBox="-375 -395 750 700" role="img" aria-label="Sơ đồ chủ điểm đầu tư">'
    +g+'</svg></div>';
}
/* ---- VỀ BỜ: mã đã rơi sâu khỏi ĐỈNH CỦA CẢ CHUỖI, xếp theo mức rơi ----------------
   Đo bằng `dath` (đỉnh của toàn bộ chuỗi giá trong kho) chứ KHÔNG phải đỉnh 52 tuần:
   phần lớn mã sập từ 2021-2022, lấy đỉnh 52 tuần thì mã mất 80% bốn năm nay lại hiện
   ra như chỉ mới giảm nhẹ — đúng cái nhóm người ta muốn tìm thì lọt lưới.
   KHÔNG lọc vốn hoá: đây là chỗ để soi mã đã rơi, mã nhỏ mới là phần đông. */
const VB_NGUONG=-30;
let vbTop=100;
function veBoPanel(){
  const ds=ST.list.filter(c=>c.close>0&&c.dath!=null&&c.dath<=VB_NGUONG)
    .sort((a,b)=>a.dath-b.dath);
  if(!ds.length) return '<div class="empty">Chưa có dữ liệu — chạy lại tools/build_screen.py</div>';
  /* CẦN BAO NHIÊU LẦN để về bờ: rơi 50% thì phải tăng 100% mới hoà vốn. Đây mới là con
     số người cầm hàng cần, chứ "-50%" nghe nhẹ hơn thực tế rất nhiều. */
  const lai=d=>(100/(100+d)-1)*100;
  const hang=c=>'<div class="rw" data-sym="'+c.sym+'" title="Bấm mở trang '+c.sym+'">'+logoHTML(c)
    +'<span class="idn"><b>'+c.sym+'</b><i>'+esc(shortName(c.name||''))+'</i></span>'
    +'<span class="vbd">'+c.dath.toFixed(0)+'%</span>'
    +'<span class="vbb"><i class="z"></i><i class="b" style="width:'+Math.min(100,-c.dath)+'%"></i></span>'
    +'<span class="vbl">×'+(100/(100+c.dath)).toFixed(1)+'<u>để về bờ</u></span>'
    /* GIÁ MỘT CỔ PHIẾU tính bằng ĐỒNG — nhét vào ty() (đơn vị tỷ) là ra "0 tỷ" hết,
       đúng cái bẫy đã dính ở giá mục tiêu bên Chủ điểm đầu tư */
    +'<span class="vbp">'+Math.round(c.close).toLocaleString('en-US')
      +'<u>đỉnh '+Math.round(c.athP||0).toLocaleString('en-US')+'</u></span>'
    +'<span class="vbv '+cls(c.chg)+'">'+pct(c.chg)+'</span></div>';
  return '<div class="panel"><div class="ph">Đã rơi hơn '+(-VB_NGUONG)+'% khỏi đỉnh'
    +'<span class="cnt">'+ds.length+' mã</span></div>'
    +'<div class="pb" style="padding:8px 14px" id="vbPanel">'
    +ds.slice(0,vbTop).map(hang).join('')+'</div></div>'
    +(ds.length>vbTop?'<div class="note" style="text-align:center"><button class="pickbtn" id="vbThem" '
      +'style="margin:0">Xem thêm '+Math.min(100,ds.length-vbTop)+' mã</button></div>':'')
    +'<div class="note"><b>Đỉnh ở đây là đỉnh của CẢ CHUỖI giá trong kho</b> (từ 2020), không phải '
    +'đỉnh 52 tuần — phần lớn mã sập từ 2021-2022, đo bằng đỉnh 52 tuần thì mã mất 80% bốn năm '
    +'nay lại hiện ra như chỉ mới giảm nhẹ. Cột <b>×</b> là số lần giá phải tăng để về lại đỉnh cũ: '
    +'rơi 50% thì phải tăng gấp đôi mới hoà vốn, rơi 80% thì phải gấp năm. '
    +'Mục này KHÔNG lọc theo vốn hoá — mã nhỏ mới là phần đông trong nhóm rơi sâu, mà cũng là nhóm '
    +'thanh khoản mỏng nhất. Rơi sâu KHÔNG có nghĩa là sắp hồi: nhiều mã rơi vì doanh nghiệp hỏng '
    +'thật. Đây là danh sách để soi, không phải danh sách để mua.</div>';
}
function chuDiemPanel(){
  const D=ST.chudiem;
  if(!D||!(D.ma||[]).length) return '<div class="empty">Chưa có dữ liệu chủ điểm — chạy tools/build_chudiem.py</div>';
  const T={}; for(const t of D.truc||[]) T[t.id]=t;
  const nhom=[[3,'Trọng tâm — hội tụ cả 3 chủ điểm'],[2,'Giao hai chủ điểm'],[1,'Từng chủ điểm riêng']];
  const the=x=>{
    const c=ST.map.get(x.s), k=x.ssi||{};
    /* CHÊNH so với giá mục tiêu của SSI — con số đáng xem nhất, nhưng chỉ tính khi có
       ĐỦ cả giá hiện tại lẫn giá mục tiêu, đừng suy ra từ một nửa dữ liệu */
    const gia=c&&c.close>0?c.close:0, tp=k.tp||0;
    const ch=(gia&&tp)?(tp-gia)/gia*100:null;
    return '<div class="cdcard" data-sym="'+x.s+'">'
      +'<div class="cdtop">'+(c?logoHTML(c):'')
      +'<span class="cdid"><b>'+x.s+'</b><i>'+esc(c?shortName(c.name||''):'')+'</i></span>'
      +'<span class="cdpc '+cls(c&&c.chg)+'">'+(c?pct(c.chg):'—')+'</span></div>'
      +'<div class="cdtruc">'+x.truc.map(id=>T[id]
          ?'<em style="color:'+T[id].mau+';border-color:'+T[id].mau+'">'+esc(T[id].ten)+'</em>':'').join('')+'</div>'
      +(k.kn||k.tp?'<div class="cdssi">'+cdBadge(k.kn)
          /* GIÁ MỤC TIÊU LÀ GIÁ MỘT CỔ PHIẾU, tính bằng ĐỒNG — nhét vào ty() (đơn vị tỷ)
             thì 105.900 đ ra thành "0 tỷ", đọc như báo cáo khuyên mua một mã vô giá trị */
          +(tp?'<span class="cdtp">mục tiêu <b>'+Math.round(tp).toLocaleString('en-US')+' đ</b></span>':'')
          +(ch!=null?'<span class="cdch '+(ch>=0?'up':'dn')+'">'+(ch>=0?'+':'')+ch.toFixed(0)+'%</span>':'')
          +(k.d?'<span class="cdd">'+k.d.split('-').reverse().join('/')+'</span>':'')
          +'</div>':'<div class="cdssi trong">SSI chưa có báo cáo riêng cho mã này trong kho</div>')
      +'</div>';
  };
  let html='<div class="panel"><div class="ph">Chủ điểm đầu tư'
    +'<span class="cdsrc">nguồn <b>'+esc(D.nguon||'SSI Research')+'</b>'
    +(D.ky?' · '+esc(D.ky):'')+'</span>'
    +'<span class="cnt">'+D.ma.length+' mã</span></div><div class="pb" style="padding:12px 16px">';
  html+=vennSVG(D,T);
  for(const [n,ten] of nhom){
    const ds=D.ma.filter(x=>x.truc.length===n);
    if(!ds.length) continue;
    html+='<div class="cdgrp">'+esc(ten)+'<u>'+ds.length+' mã</u></div>'
      +'<div class="cdgrid">'+ds.map(the).join('')+'</div>';
  }
  html+='</div></div>'
    +'<div class="note"><b>Dẫn nguồn '+esc(D.nguon||'SSI Research')+'</b>'+(D.ky?' — '+esc(D.ky):'')+'. '
    +'Sơ đồ ba chủ điểm là quan điểm của '+esc(D.nguon||'SSI Research')+', CPVN.IO chỉ dẫn lại và '
    +'ghép thêm giá cùng khuyến nghị đang lưu trong kho, <b>không đưa ra khuyến nghị nào của riêng '
    +'mình</b>. Khuyến nghị và giá mục tiêu từng mã lấy từ báo cáo phân tích của chính '
    +esc(D.nguon||'SSI Research')+', tự làm mới mỗi phiên; ngày ghi cạnh mỗi mã là ngày ra báo cáo — '
    +'báo cáo càng cũ thì giá mục tiêu càng ít còn giá trị tham chiếu. '
    +'Sơ đồ thuần phân tích cơ bản và câu chuyện doanh nghiệp, <b>chưa tính tới dòng tiền, thanh khoản '
    +'hay trạng thái của VN-Index</b>. Đây là thông tin tham khảo, không phải lời mời hay khuyến nghị '
    +'mua bán.</div>';
  return html;
}
/* ============================================ 2. DANH MỤC TẬP ĐOÀN (module riêng)
   Tách khỏi Radar vì hai thứ khác nhịp hẳn nhau: radar là thứ soi TRONG PHIÊN, còn bản đồ
   tập đoàn và danh mục quỹ là cấu trúc sở hữu, cả tháng mới nhúc nhích. Quỹ đứng chung
   trang này vì cùng một câu hỏi "ai đang nắm gì". */
let tdTab='td';                          // 'td' = tập đoàn · 'quy' = quỹ
function renderTapDoan(){
  const m=MODULES.find(x=>x.id==='tapdoan');
  $('#m-tapdoan').innerHTML=head(m)
    +'<div class="ctl" id="tdTab"><div class="seg">'
    +'<button data-v="td"'+(tdTab==='td'?' class="on"':'')+'>🏢 Danh mục tập đoàn</button>'
    +'<button data-v="quy"'+(tdTab==='quy'?' class="on"':'')+'>💼 Soi quỹ đầu tư</button>'
    +'</div></div>'
    +(tdTab==='td'?tapDoanPanel()+tapDoanNote():quyPanel()+quyNote());
  $('#tdTab').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    if(tdTab===b.dataset.v) return;
    tdTab=b.dataset.v; renderTapDoan(); scrollTo({top:0,behavior:'smooth'});
  });
}
/* ---- SOI QUỸ ĐẦU TƯ: lật danh mục các quỹ, xem quỹ nào đang cầm mã nào ---- */
const quyMo=new Set();
/* Quỹ nhỏ hơn ngần này thì phần danh mục ghi nhận được quá mỏng để soi ra điều gì —
   một quỹ hiện 116 tỷ rải trên 30 mã thì mỗi mã vài tỷ, đọc xong chẳng biết để làm gì. */
const QUY_MIN=500;                                     // tỷ đồng
function quyPanel(){
  const ds=(ST.quy||[]).filter(q=>(q.syms||[]).length>=2&&(q.tong||0)>=QUY_MIN);
  if(!ds.length) return '<div class="empty">Chưa có dữ liệu quỹ — chạy tools/build_tapdoan.py</div>';
  const cu=q=>(q.ky||'')<'2025-01-01';            // kỳ công bố đã quá cũ
  const hang=q=>{
    const mo=quyMo.has(q.ma);
    const ma=q.syms.map(x=>({v:x.v,cp:x.cp,c:ST.map.get(x.s)||{sym:x.s,name:'',close:0,chg:null}}));
    let d=0,tv=0;
    for(const {v,c} of ma){ if(c.chg!=null){ d+=c.chg*v; tv+=v; } }
    return '<div class="tdrow'+(mo?' on':'')+'" data-quy="'+esc(q.ma)+'">'
      +'<span class="sn"><i class="cr">'+(mo?'▾':'▸')+'</i><em class="nm">'+esc(q.ma)+' · '
      +esc(q.ten)+'</em>'+(cu(q)?'<b class="nn cu">số cũ</b>':'')+'</span>'
      +'<span class="sp '+cls(tv?d/tv:0)+'">'+pct(tv?d/tv:0)+'</span>'
      +'<span class="sb"><u>'+ma.length+' mã</u></span>'
      +'<span class="sc"><i>giá trị</i>'+ty(q.tong*1e9)+'</span>'
      +'<span class="sv"><i>kỳ</i>'+esc((q.ky||'').split('-').reverse().join('/'))+'</span></div>'
      /* hàng quỹ có 5 ô (tên · % · số mã · giá trị · kỳ) nên hàng con xếp theo đúng chừng ấy
         cột: giá trị nắm giữ rơi thẳng dưới cột "giá trị" của quỹ, khỏi phải dò ngang */
      +(mo?'<div class="tdcon"><div class="rw hd"><span class="c1">công ty</span>'
          +'<span class="tdv">hôm nay</span><span class="sp0"></span>'
          +'<span class="tdp">đang nắm</span><span class="tdg">GTGD</span></div>'
        +ma.map(({v,c})=>
          '<div class="rw" data-sym="'+c.sym+'"><span class="c1">'+logoHTML(c)
          +'<span class="idn"><b>'+c.sym+'</b><i>'+esc(shortName(c.name||''))+'</i></span></span>'
          +'<span class="tdv '+cls(c.chg)+'">'+pct(c.chg)+'</span>'
          +'<span class="sp0"></span>'
          +'<span class="tdp">'+ty(v*1e9)+'</span>'
          +'<span class="tdg">'+ty(c.gtgd)+'</span></div>').join('')+'</div>':'');
  };
  return '<div class="panel"><div class="ph">Danh mục các quỹ đang nắm giữ'
    +'<span class="cnt">'+ds.length+' quỹ</span></div>'
    +'<div class="pb" style="padding:10px 16px" id="quyPanel">'+ds.map(hang).join('')+'</div></div>';
}
function quyNote(){
  return '<div class="note">Lật ngược từ danh sách quỹ nắm giữ của từng mã trong kho hồ sơ '
    +'doanh nghiệp. Chỉ hiện quỹ có danh mục ghi nhận được <b>từ '+QUY_MIN+' tỷ trở lên</b>; '
    +'dưới ngưỡng đó mỗi mã chỉ vài tỷ, xem xong không rút ra được điều gì. '
    +'<b>Kỳ công bố lệch nhau rất xa</b> — quỹ nội báo cáo đều nên có số tới '
    +'giữa 2026, còn Dragon Capital hay PYN thì nguồn chỉ có tới cuối 2023, hơn hai năm. '
    +'Cột "kỳ" ghi rõ ngày của từng quỹ và quỹ nào quá cũ bị dán nhãn — đừng đọc số cũ như '
    +'danh mục hiện tại. % là biến động hôm nay bình quân theo giá trị nắm giữ.</div>';
}
function renderRace(){
  const m=MODULES.find(x=>x.id==='race');
  const D=raceData();
  if(!D){ $('#m-race').innerHTML=head(m)+'<div class="empty">Chưa có dữ liệu đua — chạy lại demo-build-screen.py</div>'; return; }
  const secCnt={};
  for(const c of ST.list) secCnt[c.sector]=(secCnt[c.sector]||0)+1;
  const secKeys=Object.keys(secCnt).sort((a,b)=>secCnt[b]-secCnt[a]);
  /* Rổ chỉ số đứng trước, rồi mới tới ngành thật. Nhóm theo dõi (thoái vốn) KHÔNG nằm ở
     đây — nó là tiêu chí lọc của Bộ Lọc PRO bên bảng giá; muốn đua mấy mã đó thì gõ thẳng
     mã vào ô "gõ mã riêng". */
  const secOpts=sel=>Object.entries(RO_CHISO).map(([k,r])=>
      '<option value="'+k+'"'+(sel===k?' selected':'')+'>'+esc(r.ten)+'</option>').join('')
    +secKeys.map(k=>'<option value="'+esc(k)+'"'+(sel===k?' selected':'')+'>'+esc(k)+'</option>').join('');
  /* ô tháng chỉ ghi "3/2020": nhãn ngay trước nó đã là "triệu/tháng, từ" nên chữ "Tháng"
     trong từng dòng chọn chỉ tổ làm ô rộng thêm 46px, đủ để đẩy ô gõ mã rớt xuống hàng hai */
  const thang=lb=>{ const p=String(lb).split('/'); return p[0]+'/20'+p[1]; };
  const fromOpts=D.labels.map((lb,i)=>'<option value="'+i+'"'+(i===DCA.from?' selected':'')+'>'+thang(lb)+'</option>').join('');
  /* MỘT hàng tham số duy nhất (#raBar) + MỘT thanh điều khiển nằm TRONG khung đồ thị
     (#raPlayBar, do syncMode chuyển sang khung của chế độ đang hiện). Trước đây nút chạy,
     tốc độ, thanh tua và tham số nằm rải ở 2-3 hàng riêng, ăn hết chỗ trước khi thấy đồ
     thị. Hai cụm tham số dùng display:contents nên con của chúng nằm CHUNG một hàng flex,
     hẹp thì tự xuống dòng — không phải hai hàng cứng. */
  $('#m-race').innerHTML=head(m)
    +'<div class="ctl" id="raBar">'
    +'<div class="seg" id="raMode">'
    +'<button data-v="race"'+(RA.mode!=='dca'?' class="on"':'')+' data-lg="🏁 Đường đua" data-sm="🏁 Đua"></button>'
    +'<button data-v="dca"'+(RA.mode==='dca'?' class="on"':'')+' data-lg="🌱 Đầu tư bền vững" data-sm="🌱 Bền vững"></button></div>'
    /* tham số của ĐƯỜNG ĐUA */
    +'<span class="pgrp" id="pRace"><span class="lb lbNg">Nhóm ngành</span>'
    +'<select id="raSec"><option value="">Toàn thị trường</option>'+secOpts(RA.sector)+'</select></span>'
    /* tham số của ĐẦU TƯ BỀN VỮNG */
    +'<span class="pgrp" id="pDca">'
    +'<span class="seg" id="dcaKieu">'
    +'<button data-v="deu"'+(DCA.kieu!=='mot'?' class="on"':'')+' data-lg="🔁 Hàng tháng" data-sm="🔁 Tháng"></button>'
    +'<button data-v="mot"'+(DCA.kieu==='mot'?' class="on"':'')+' data-lg="1️⃣ Một lần" data-sm="1️⃣ 1 lần"></button></span>'
    +'<input type="number" id="dcaAmt" min="0.5" step="0.5" value="'+dcaTien()+'" title="Số tiền đầu tư (triệu đồng)"/>'
    +'<span class="lb lbTr" id="dcaLbAmt" style="text-transform:none;letter-spacing:0">'
    +(DCA.kieu==='mot'?'triệu, từ':'triệu/tháng, từ')+'</span>'
    +'<select id="dcaFrom" title="Tháng bắt đầu">'+fromOpts+'</select>'
    +'<button class="btn gh tog'+(DCA.gop?' on':'')+'" id="dcaGop" data-lg="⚖ Phân bổ đều" data-sm="⚖ Phân bổ"'
    +' title="Gộp cả nhóm thành MỘT danh mục, tiền chia đều cho từng mã — thay vì xếp hạng từng mã"></button>'
    +'<select id="dcaSec" title="Nhóm ngành"><option value="">Toàn thị trường</option>'+secOpts(DCA.sec)+'</select>'
    +'<input type="text" id="dcaMa" value="'+esc(DCA.ma)+'" placeholder="hoặc gõ mã: HPG FPT"'
    +' title="Gõ 1 hay nhiều mã (cách nhau bởi dấu cách/phẩy) để đầu tư đúng mấy mã đó — bỏ trống thì dùng nhóm ngành"/>'
    +'</span></div>'
    /* thanh điều khiển dùng chung, syncMode nhét vào khung đồ thị đang hiện */
    +'<div class="playbar" id="raPlayBar"><button class="btn" id="raPlay"></button>'
    +'<div class="seg" id="raSpeed"><button data-v="0.5">×½</button>'
    +'<button data-v="1" class="on">×1</button>'
    +'<button data-v="2">×2</button><button data-v="4">×4</button></div>'
    +'<select id="raTop" title="Số công ty hiện cùng lúc trên biểu đồ">'
    +TOP_CHON.map(n=>'<option value="'+n+'"'+(RA.top===n?' selected':'')+'>'+n+' công ty</option>').join('')
    +'</select>'
    +'<input type="range" id="raSlide" min="0" max="'+(D.labels.length-1)+'" step="0.01" value="0"/>'
    +'<span class="rng">'+D.labels[0]+' → '+D.labels[D.labels.length-1]+'</span></div>'
    /* ---- chế độ ĐƯỜNG ĐUA ---- */
    +'<div id="raView">'
    +'<div class="panel racePanel"><canvas id="cvRace" class="block"></canvas></div>'
    +'<div class="note">Những công ty vốn hoá lớn nhất tại từng thời điểm — chọn nhóm ngành để đua riêng ngành đó, '
    +'chọn số công ty ở ô ngay dưới biểu đồ (10 đến 30). Bỏ qua mã vốn hoá dưới 1.000 tỷ — '
    +'thanh khoản mỏng, ngoài đời khó mua đủ lượng. '+esc(D.note||'')+' Quay màn hình lại là có video đăng cộng đồng.</div>'
    +'</div>'
    /* ---- chế độ ĐẦU TƯ BỀN VỮNG ---- */
    +'<div id="dcaView" style="display:none">'
    +'<div class="panel racePanel"><canvas id="cvDca" class="block"></canvas></div>'
    +'<div class="note">Bấm ▶ để xem tiền lớn lên qua từng tháng. <b>Hàng tháng</b> = tháng nào cũng bỏ thêm; '
    +'<b>Một lần</b> = bỏ đúng một lần vào tháng đã chọn rồi giữ tới nay. <b>Phân bổ đều</b> = cả nhóm ngành '
    +'(hoặc mấy mã vừa gõ) thành một danh mục, tiền chia đều cho từng mã — tắt thì xếp hạng từng mã, '
    +'số công ty hiện cùng lúc chọn ở ô ngay dưới biểu đồ. '
    +'Đường đứt là vốn đã bỏ; đường vàng là gửi ngân hàng lãi 7%/năm (ghép lãi theo tháng) để so ngay đầu tư thắng hay thua tiết kiệm.</div>'
    +'<div class="panel"><div class="ph">Giá trị hôm nay<span id="dcaSum" style="margin-left:auto;font-weight:600;color:var(--mut)"></span></div>'
    +'<div class="pb" id="dcaOut"></div></div>'
    +'<div class="note">Mua tại giá đóng cửa THÁNG, giá ĐÃ HỒI TỐ cổ tức/chia tách theo nguồn — tức phần lớn cổ tức '
    +'(cả tiền lẫn cổ phiếu) đã nằm trong kết quả như thể được tái đầu tư; số ít đợt nguồn bỏ sót thì kết quả hơi thấp hơn thực nhận. '
    +'Rổ dựng sẵn chỉ gồm mã vốn hoá từ 1.000 tỷ (gõ tay ở ô "gõ mã riêng" thì mã nào cũng chạy được). '
    +'Mã phải có giao dịch đủ từ tháng bắt đầu mới được xếp hạng — rổ chia đều cũng chỉ gồm những mã đó, '
    +'nên kết quả rổ không kể mã đã huỷ niêm yết giữa đường. Thống kê quá khứ, không phải khuyến nghị đầu tư.</div>'
    +'</div>';
  /* nhãn nút dài/ngắn theo bề ngang — màn dọc phải nén để cả cụm nằm gọn MỘT hàng */
  const hep=()=>innerWidth<=640;
  const nhanPlay=t=>{ const b2=$('#raPlay');
    b2.textContent=hep()?(t==='pause'?'⏸':'▶'):
      (t==='pause'?'⏸ Tạm dừng':t==='again'?'▶ Chạy lại':t==='cont'?'▶ Tiếp tục':'▶ Bắt đầu');
    b2.dataset.t=t; };
  const capNhatNhan=()=>{
    $$('#raMode button,#dcaKieu button,#dcaGop')
      .forEach(b2=>b2.textContent=hep()?b2.dataset.sm:b2.dataset.lg);
    $('#dcaMa').placeholder=hep()?'gõ mã':'hoặc gõ mã riêng';
    /* màn dọc bỏ chữ "công ty" trong từng dòng chọn — ô hẹp, chỉ con số là đủ hiểu */
    $$('#raTop option').forEach(o=>o.textContent=o.value+(hep()?'':' công ty'));
    nhanPlay($('#raPlay').dataset.t||'start');
    capNhatCao();
  };
  /* BỀ CAO ĐỒ THỊ. Đường đua chỉ có 10 thanh ngang nên vừa phải là đủ; đầu tư bền vững
     vẽ tới 8 đường CHỒNG CHÉO nhau + 2 mốc, cao thêm là mỗi đường được một khoảng thở
     và nhãn hết dồn cục. Chế độ phân bổ đều chỉ có 1 đường nên không cần cao bằng. */
  const capNhatCao=()=>{
    const n=RA.top||10, m=hep();
    const r=$('#cvRace'), d=$('#cvDca');
    /* Hiện 30 công ty trong khung cao 624px thì mỗi hàng chỉ còn 19px — chữ với logo
       dính chùm. Khung phải nở theo số công ty; 10 công ty vẫn đúng bề cao cũ. */
    if(r) r.style.height=Math.round(clamp(n*(m?26:34)+96,m?520:624,m?1000:1280))+'px';
    if(d) d.style.height=(DCA.gop?(m?520:600)
          :Math.round(clamp(n*(m?24:30)+300,m?620:720,m?1000:1280)))+'px';
  };
  const syncMode=()=>{                            // đổi chế độ: dừng chạy, về vạch xuất phát
    const dca=RA.mode==='dca';
    RA.playing=false; RA.f=0; RA.curY={}; RA.dcaMx=0;
    nhanPlay('start');
    $('#raView').style.display=dca?'none':'';
    $('#dcaView').style.display=dca?'':'none';
    /* display:contents -> con của cụm nằm chung hàng flex với nút chế độ; 'none' giấu cả cụm */
    $('#pRace').style.display=dca?'none':'contents';
    $('#pDca').style.display=dca?'contents':'none';
    /* THANH ĐIỀU KHIỂN nằm TRONG khung đồ thị của chế độ đang hiện — như thanh tua của
       trình phát video, và nhờ vậy hàng tham số phía trên chỉ còn đúng một hàng. */
    (dca?$('#dcaView'):$('#raView')).querySelector('.racePanel').appendChild($('#raPlayBar'));
    const sl=$('#raSlide'); sl.max=raceEnd(); sl.value=0;
    capNhatCao();
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
  $('#raTop').onchange=e=>{
    RA.top=+e.target.value||10;
    RA.curY={};                                   // số hàng đổi -> vị trí cũ vô nghĩa
    capNhatCao();
    requestAnimationFrame(()=>{ curDraw(1); settleRace(); });
  };
  $('#raSpeed').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    $('#raSpeed').querySelectorAll('button').forEach(x2=>x2.classList.remove('on'));
    b.classList.add('on'); RA.speed=+b.dataset.v; });
  $('#raSlide').oninput=e=>{ RA.playing=false; nhanPlay('cont');
    RA.f=+e.target.value; curDraw(); };
  $('#raSlide').onchange=()=>settleRace();        // thả tay -> hàng nào bay dở cũng về đúng chỗ
  $('#raSec').onchange=e=>{ RA.sector=e.target.value||null; RA.curY={}; drawRace(); settleRace(); };
  /* đổi tham số bền vững: tính lại chuỗi; đổi THÁNG là đổi cả dòng thời gian -> về vạch */
  const veLai=()=>{ DCA.calc=null; RA.dcaMx=0; renderDCA(); drawDCA(1); };
  /* gõ mã thì ô nhóm ngành hết tác dụng — làm mờ đi cho khỏi tưởng đang lọc theo ngành */
  const khoaNganh=()=>{ const s=$('#dcaSec');
    const co=!!(DCA.ma||'').trim(); s.disabled=co; s.style.opacity=co?.45:1; };
  $('#dcaKieu').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    if(DCA.kieu===b.dataset.v) return;
    $('#dcaKieu').querySelectorAll('button').forEach(x2=>x2.classList.remove('on'));
    b.classList.add('on'); DCA.kieu=b.dataset.v;
    /* hai kiểu giữ SỐ TIỀN RIÊNG: 5 triệu/tháng và 100 triệu một lần là hai thói quen khác
       nhau, đổi qua đổi lại mà số tiền nhảy theo thì phải gõ lại mỗi lần */
    $('#dcaAmt').value=dcaTien();
    $('#dcaLbAmt').textContent=DCA.kieu==='mot'?'triệu, từ':'triệu/tháng, từ';
    DCA.calc=null; syncMode(); renderDCA();
  });
  $('#dcaGop').onclick=()=>{ DCA.gop=!DCA.gop;
    $('#dcaGop').classList.toggle('on',DCA.gop);
    capNhatCao(); veLai(); };
  $('#dcaAmt').oninput=e=>{ const v=+e.target.value||0;
    if(DCA.kieu==='mot') DCA.amtM=v; else DCA.amtD=v; veLai(); };
  $('#dcaFrom').onchange=e=>{ DCA.from=+e.target.value||0; DCA.calc=null; syncMode(); renderDCA(); };
  $('#dcaSec').onchange=e=>{ DCA.sec=e.target.value||null; veLai(); };
  $('#dcaMa').oninput=e=>{ DCA.ma=e.target.value||''; khoaNganh(); veLai(); };
  khoaNganh();
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
  $('#mn').addEventListener('click',e=>{
    /* bấm HÀNG TẬP ĐOÀN -> mở/thu danh sách công ty con. Phải bắt TRƯỚC dòng mã, bằng
       không bấm trúng hàng nhóm lại nhảy sang trang một mã nào đó. */
    /* nút xếp thứ tự nằm ở ĐẦU BẢNG, bắt trước mọi thứ — bấm lại nút đang bật thì lật chiều */
    const sx=e.target.closest('[data-srt]');
    if(sx){ const k=sx.dataset.srt;
      if(tdSort.k===k) tdSort.d=-tdSort.d; else { tdSort.k=k; tdSort.d=-1; }
      renderTapDoan(); return; }
    const tq=e.target.closest('.tdrow[data-quy]');
    if(tq){ const id=tq.dataset.quy;
      quyMo.has(id)?quyMo.delete(id):quyMo.add(id);
      renderTapDoan();
      const l2=document.querySelector('.tdrow[data-quy="'+id.replace(/"/g,'')+'"]');
      if(l2) l2.scrollIntoView({block:'nearest'});
      return; }
    const td=e.target.closest('.tdrow');
    if(td&&td.dataset.td){
      const id=td.dataset.td;
      tdMo.has(id)?tdMo.delete(id):tdMo.add(id);
      renderTapDoan();                              // vẽ lại cả bảng cho chắc, rẻ hơn vá tay
      const lai=document.querySelector('.tdrow[data-td="'+id.replace(/"/g,'')+'"]');
      if(lai) lai.scrollIntoView({block:'nearest'});
      return;
    }
    const rw=e.target.closest('.rw,.dcarow,.cdcard,.cdsym');
    if(rw&&rw.dataset.sym) location.href='cophieu.html?sym='+rw.dataset.sym;
  });
  addEventListener('resize',(()=>{ let rt; return ()=>{ clearTimeout(rt);
    rt=setTimeout(()=>{ const m=MODULES.find(x=>x.id===cur);
      if(m&&m.after) m.after(); },180); }; })());
  const q=new URLSearchParams(location.search).get('m');
  const byPath={radar:'radar',tapdoan:'tapdoan',duongdua:'race'}[location.pathname.replace(/\//g,'')];
  const start=q||byPath||(location.hash||'').replace('#','');
  /* ?t= chọn sẵn tab bên trong — link từ trang khác trỏ thẳng vào đúng mục con */
  const t0=new URLSearchParams(location.search).get('t');
  if(t0==='cd'||t0==='phien'||t0==='vb') radarTab=t0;
  if(t0==='dca'||t0==='dua') RA.mode=(t0==='dca'?'dca':'race');
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
