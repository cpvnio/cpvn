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
  vn30:new Set(), tapdoan:[], quy:[], pack:null, market:null, spark:{}, sparkT:[], hist:new Map() };
/* GỘP NGÀNH — BẢN SAO Y HỆT core.js và bubbles.html. Trang này trước đây dùng thẳng
   `sector` thô của nguồn, nên ô chọn ngành của đường đua hiện "Bán lẻ chuyên dụng",
   "Bán lẻ thực phẩm và thuốc", "Bán lẻ tổng hợp" thành ba ngành riêng trong khi bảng giá
   đã gộp làm một từ lâu — cùng một cái tên ngành mà hai trang ra hai rổ mã khác nhau.
   Sửa ở đây thì PHẢI sửa cả hai file kia cho khớp. */
const SECTOR_EXPLICIT={
  /* ĐỔI TÊN CHO ĐÚNG CÁCH GỌI CỦA THỊ TRƯỜNG VN (user chốt 15/08/2026). Nguồn dịch máy
     nên đẻ ra "Chứng khoán và Ngân hàng đầu tư", "Tiện ích điện và sản xuất điện",
     "Quản lý và phát triển bất động sản" — dài, lặp và không ai gọi thế. Đây CHỈ đổi
     TÊN HIỂN THỊ; `sector` thô trong universe.json giữ nguyên vì tools/build_nganh.py
     chọn mẫu chỉ số đặc thù NGÀNH theo tên thô đó. */
  'Chứng khoán và Ngân hàng đầu tư':'Chứng khoán',
  'Tài chính ngân hàng':'Ngân hàng',
  'Quản lý và phát triển bất động sản':'Bất động sản',
  'Tiện ích điện và sản xuất điện':'Điện',
  'Cơ sở hạ tầng giao thông vận tải':'Hạ tầng giao thông',
  'Vận chuyển hàng hóa và Giao nhận':'Vận tải & Logistics',
  'Ô tô và Phụ tùng ô tô':'Ô tô & Phụ tùng',
  'Nước & Tiện ích liên quan':'Nước & Môi trường',
  // rổ này gồm cả nông nghiệp, thuỷ sản, mía đường, chăn nuôi (nguồn không có ngành
  // "Nông nghiệp" riêng) — gọi "thuốc lá" là lấy phần bé nhất đặt tên cho cả rổ
  'Thực phẩm và thuốc lá':'Thực phẩm & Nông sản',
  // GEE, TBD, RAL, PAC, VEA: thiết bị điện và cơ khí chế tạo, không phải "đóng tàu"
  'Máy móc, thiết bị nặng và đóng tàu':'Cơ khí & Thiết bị điện',
  // bán lẻ (3 nhánh -> 1)
  'Bán lẻ chuyên dụng':'Bán lẻ','Bán lẻ thực phẩm và thuốc':'Bán lẻ','Bán lẻ tổng hợp':'Bán lẻ',
  // y tế & dược
  'Dược phẩm':'Dược phẩm & Y tế','Dịch vụ chăm sóc sức khỏe':'Dược phẩm & Y tế','Thiết bị vật tư Y tế':'Dược phẩm & Y tế',
  // công nghệ + viễn thông: tách ra thì mỗi bên chỉ 4-6 mã đủ lớn, đứng lẻ loi cả hai
  'Phần mềm và dịch vụ CNTT':'Công nghệ & Viễn thông','Chất bán dẫn & Thiết bị bán dẫn':'Công nghệ & Viễn thông',
  'Thiết bị & Phụ tùng điện tử':'Công nghệ & Viễn thông','Máy tính, điện thoại & điện tử gia dụng':'Công nghệ & Viễn thông',
  'Thiết bị văn phòng':'Công nghệ & Viễn thông','Dịch vụ Viễn thông':'Công nghệ & Viễn thông',
  'Truyền thông & Mạng':'Công nghệ & Viễn thông','Truyền thông và Xuất bản':'Công nghệ & Viễn thông',
  // dầu khí: thượng nguồn và dịch vụ khoan/thiết bị chạy chung một chu kỳ giá dầu.
  // CNG (phân phối khí) nguồn xếp riêng thành "tiện ích khí" một mình -> về đúng nhà.
  'Dầu và Khí đốt':'Dầu khí','Dịch vụ và Thiết bị Dầu khí':'Dầu khí','Tiện ích khí tự nhiên':'Dầu khí',
  // xây dựng dân dụng vốn là một nhánh của xây dựng
  'Xây dựng và vật liệu xây dựng dân dụng':'Xây dựng',
  // HPG, HSG, NKG, GDA là THÉP — chiếm gần hết vốn hoá rổ này, nên tên phải nói ra.
  // Than là khai khoáng, nguồn để riêng nên còn đúng 1 mã đủ lớn.
  'Kim loại và Khai khoáng':'Thép & Khoáng sản','Than':'Thép & Khoáng sản',
  // giấy -> bao bì: DHC, HHP làm cả hai thứ trong cùng một nhà máy
  'Hộp đựng và Bao bì':'Giấy & Bao bì','Giấy và Lâm sản':'Giấy & Bao bì',
  // hàng không đi cùng khách sạn: cùng nhịp mùa du lịch, cùng cú sốc dịch bệnh
  'Khách sạn và Giải trí':'Du lịch & Giải trí','Vận chuyển hành khách':'Du lịch & Giải trí',
  // thuỷ điện/điện tái tạo là nhà máy điện, để riêng thì 3 mã rơi hết vào "Khác"
  'Năng lượng tái tạo':'Điện',
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
  const [u,eod,pk,mk,td,qy]=await Promise.all([
    j('universe.json'), j('data/eod/latest.json'),
    j('data/screen.json'), j('data/market.json'), j('data/tapdoan.json'), j('data/quy.json')]);
  ST.tapdoan=(td&&td.nhom)||[]; ST.quy=(qy&&qy.quy)||[];
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
/* mốc giờ của data/board.json — nuôi nhãn "giá lúc HH:MM", xem CP.nhanGia trong core.js */
let boardAt=0;
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
      const [last,ref,vol,gtgd,fb,fs,hi,lo,ce,fl,nt,op]=j.d[sym];
      if(!(last>0)) continue;
      c.close=last; c.nt=!!nt;                        // giá của phiên CŨ -> cấm tính %
      // lưới chặn biên độ, y như vòng poll — đệm cũng phải qua cửa này
      if(!c.nt&&ref>0&&ce>0&&fl>0&&(last>ce*1.001||last<fl*0.999)) c.nt=true;
      if(ref>0){ c.ref=ref; c.chg=c.nt?null:(last-ref)/ref*100; }
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
      // phần tử 11 = cờ CHƯA KHỚP LỆNH (bản đệm cũ 10 phần tử vẫn đọc được)
      d[c.sym]=[c.close,c.ref||0,c.vol||0,Math.round(c.gtgd||0),
        c._fb||0,c._fs||0,c._hi||0,c._lo||0,c.ceil||0,c.floor||0,c.nt?1:0,c._o||0];
    }
    const cur=JSON.parse(localStorage.getItem('cpvn_live')||'null');
    if(cur&&cur.at>=liveAt) return;
    localStorage.setItem('cpvn_live',JSON.stringify({at:liveAt, sess:dayVN(),
      idx:(ST.indices||[]).map(i=>[i.name,i.value,i.chg,i.gtgd||0,i.vol||0]), d}));
  }catch(e){}
}
const FORCE_LIVE=/[?&]forcelive/.test(location.search);   // cờ kiểm thử: poll cả khi tab ẩn
/* ═══ NGUỒN FILE GIÁ ═══
   Để rỗng = đọc từ chính cpvn.io (`data/board*.json`, đi qua git + build Cloudflare).
   Đặt thành 'https://data.cpvn.io' = đọc thẳng từ R2 — file giá thôi đi qua git.
   VÌ SAO ĐÁNG ĐỔI: mỗi phiên thêm ~13 commit giá, `.git` đã 363 MB và còn phình. Nó vừa
   làm gãy deploy 19 tiếng ngày 18/08 (file pack vượt 25 MiB) và làm mọi lượt build chậm
   dần. Đưa file giá sang R2 là chặn đúng gốc: git ngừng phình vì giá, build ngừng chậm
   thêm, và nhịp cập nhật không còn bị hạn mức build ghim.
   ĐỔI MỘT DÒNG NÀY LÀ ĐỔI CẢ BA BẢN SAO — nhớ sửa cả bubbles.html và congcu.js. */
const GIA_GOC='';
const fGia=t=>(GIA_GOC||'')+(GIA_GOC?'/':'data/')+t;
async function pollLive(){
  if(livePolling) return false; livePolling=true;
  try{
    /* GIÁ ĐỌC TỪ KHO — bản sao thứ ba của luật trong core.js `doPoll`, xem chú thích đầy
       đủ ở đó. Bản này trước đây còn tệ hơn hai bản kia: nó gọi 11 lô NỐI ĐUÔI nhau. */
    let rows=null;
    try{
      const j=await fetch(fGia('board.json')).then(r=>r.ok?r.json():null);
      if(j&&j.rows&&j.rows.length){ rows=j.rows.filter(Boolean); boardAt=j.at||0; }
      /* nhóm thanh khoản nhịp nhanh — ghép SAU để đè lên bản chậm (xem core.js) */
      const h=await fetch(fGia('board_nong.json')).then(r=>r.ok?r.json():null).catch(()=>null);
      if(h&&h.rows&&h.rows.length){ rows=(rows||[]).concat(h.rows.filter(Boolean));
        if((h.at||0)>boardAt) boardAt=h.at; }
    }catch(e){}
    if(!rows){       // chỉ khi kho KHÔNG CÓ file
      const syms=[...ST.map.keys()]; rows=[];
      for(let i=0;i<syms.length;i+=150){
        const arr=await fetch('https://bgapidatafeed.vps.com.vn/getliststockdata/'+syms.slice(i,i+150).join(','))
          .then(r=>r.json());
        for(const t of arr) rows.push(t);
      }
    }
    const active=rows.filter(t=>((+t.lastPrice||0)>0)||((+t.lot||0)>0)).length;
    if(rows.length<50||active<rows.length*0.1) return false;   // bảng đêm rỗng -> giữ kho
    let nnB=0,nnS=0;
    for(const t of rows){
      const c=ST.map.get(t.sym); if(!c) continue;
      const last=(+t.lastPrice||0)*1000, ref=(+t.r||0)*1000;
      c.ceil=(+t.c||0)*1000; c.floor=(+t.f||0)*1000; if(ref>0) c.ref=ref;
      const vol=(+t.lot||0)*10;
      /* CHƯA KHỚP LỆNH PHIÊN NÀY: giá đang giữ thuộc phiên CŨ còn c.ref vừa nhận là
         tham chiếu HÔM NAY. Không chỉ % sai — nhãn trần/sàn, đếm độ rộng và danh sách
         "kịch trần" của radar đều đọc c.nt, mà vòng này trước giờ không hề đặt nó. */
      if(last>0){ c.close=last; c.nt=false; c.chg=ref>0?(last-ref)/ref*100:c.chg; }
      else { c.nt=true; c.chg=null; }
      /* LƯỚI CHẶN CUỐI: giá lọt ra ngoài [sàn, trần] của chính phiên này thì nó không
         phải giá của phiên này -> cấm tính %. Xem chú thích dài trong assets/core.js. */
      if(!c.nt&&c.ref>0&&c.ceil>0&&c.floor>0&&(c.close>c.ceil*1.001||c.close<c.floor*0.999)){
        c.nt=true; c.chg=null;
      }
      if(vol>0){ c.vol=vol;
        const ave=(parseFloat(t.avePrice)||0)*1000;
        c.gtgd=(ave||last)*vol;
        if(c.avgv20) c.volr=+(vol/c.avgv20).toFixed(2);   // đột biến KL theo giá sống
      }
      const hi=(parseFloat(t.highPrice)||0)*1000, lo=(parseFloat(t.lowPrice)||0)*1000;
      if(hi>lo&&last>0) c.rpos=(last-lo)/(hi-lo);
      const fb=(parseFloat(t.fBVol)||0)*10, fs=(parseFloat(t.fSVolume)||0)*10;
      c._fb=fb; c._fs=fs; c._hi=(parseFloat(t.highPrice)||0)*1000; c._lo=(parseFloat(t.lowPrice)||0)*1000;
      c._o=(parseFloat(t.openPrice)||0)*1000||c._o;   // giá mở cửa: giữ trong đệm cho trang mã dựng nến
      if(last>0){ c.nnVal=(fb-fs)*last; nnB+=fb*last; nnS+=fs*last; }
      c.mcapLive=c.shares?c.shares*(last||c.close):c.mcapLive;
    }
    if(nnB||nnS){ ST.nnBuy=nnB; ST.nnSell=nnS; }
    try{   // chỉ số sống (VNINDEX/VN30/HNX/UPCOM) cho cột thông tin
      const IDX=[['10','VNINDEX'],['11','VN30'],['02','HNX'],['03','UPCOM']];
    /* chỉ số lấy từ kho, đừng gọi VPS riêng — bản sao luật của CP.loadIndices (core.js) */
    let arr=null;
    for(const f of [fGia('board_nong.json'),fGia('board.json')]){
      try{ const j=await fetch(f).then(r=>r.ok?r.json():null);
        if(j&&j.idx&&j.idx.length){ arr=j.idx; break; } }catch(e){}
    }
    if(!arr) arr=await fetch('https://bgapidatafeed.vps.com.vn/getlistindexdetail/10,11,02,03').then(r=>r.json());
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
  /* In thẳng mốc giờ của `data/board.json`. Không có nhãn này thì cả hai máy cào chết vẫn
     trông như đang chạy — xem chú thích CP.nhanGia trong core.js. */
  if(hd){
    const p=boardAt?Math.round((Date.now()-boardAt)/60000):null;
    const gio=boardAt?new Date(boardAt):null;
    const hhmm=gio?String(gio.getHours()).padStart(2,'0')+':'+String(gio.getMinutes()).padStart(2,'0'):'';
    hd.innerHTML=boardAt
      ? (sessionOpenVN()&&p>45
          ? '<b style="color:var(--red)">⚠ giá lúc '+hhmm+'</b> · đã '+p+' phút'
          : 'giá lúc <b>'+hhmm+'</b>')
      : 'phiên <b>'+esc(ST.date)+'</b>';
  }
}
function startLive(){
  const tick=async()=>{
    if((document.hidden&&!FORCE_LIVE)||!sessionOpenVN()) return;
    if(Date.now()-liveAt<55000) return;
    if(await pollLive()){
      updateHeadChips();
      /* Mục TOÀN CẦU tự có nhịp riêng và tự cập nhật TẠI CHỖ. Để nó vẽ lại theo nhịp
         này là mỗi lần bơm giá trong nước lại dựng lại cả panel -> mọi thẻ nước đang
         mở bay sạch, cứ ~2 phút một lần. */
      /* Radar phiên nay CHỨA bản đồ thế giới, mà bản đồ tự cập nhật tại chỗ theo nhịp
         riêng. Vẽ lại cả module ở đây là giết mọi thẻ nước đang mở, cứ ~1 phút một lần.
         Nên chỉ vẽ lại phần trong nước bằng cách dựng lại khối #radarAll. */
      /* ĐANG GÕ TRONG Ô TÌM MÃ THÌ ĐỪNG DỰNG LẠI MODULE. Vẽ lại là ô bị thay bằng ô mới:
         mất con trỏ giữa chừng, bàn phím điện thoại đóng sập, gõ dở một mã là cụt. Bỏ qua
         một lượt bơm giá đổi lại việc gõ liền mạch — lượt sau (10 giây) tự bù. */
      const dangGo=document.activeElement&&document.activeElement.id==='vbQ';
      if(cur==='radar'&&radarTab==='phien') veLaiTrongNuoc();
      else if(cur==='radar'&&!dangGo) MODULES.find(x=>x.id==='radar').render();
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


/* ================= THÔNG TIN NIÊM YẾT (data/niemyet.json) =========================
   Kho do `tools/kho_niemyet.py` dựng. Nạp LƯỜI — file ~200KB mà chỉ mục này dùng, kéo về
   trong `loadAll` là mọi người vào trang công cụ đều phải tải dù không mở tới.

   BẢNG CHỈ CÒN NĂM CỘT, và chuyện GỠ BỚT mới là phần đáng ghi lại:
     "Tổng lợi suất"     = giá nay / giá phiên đầu, hai đầu cùng một nền. ĐÃ GỒM CỔ TỨC TIỀN —
                           nguồn hạ nền chuỗi giá theo cả cổ tức tiền lẫn cổ phiếu (đo 19/08:
                           HRB chia 3.000đ, giá thô 35.400 -> giá kho 32.402 = đúng
                           35.400×32.400/35.400). Ai đòi cộng thêm Σ(cổ tức × SLCP) là ĐẾM
                           HAI LẦN — đã có người đề nghị đúng như vậy.
     "Giá nền quy đổi"   = giá phiên đầu kéo về mặt bằng hôm nay. KHÔNG phải giá thị trường
                           ngày đó (VCB ghi 9.084đ trong khi thực tế ~60.000đ) — nhãn cũ ghi
                           "Giá phiên đầu" nên bị đọc thành giá thật, phải đổi.

   ĐÃ GỠ "Giá lúc đó" VÀ "Vốn hoá lên sàn" (20/08/2026) — ĐỪNG DỰNG LẠI khi chưa có nguồn mới.
   Dựng ngược về giá thô chỉ đạt 28,5% rơi đúng bước giá của sàn, riêng VCB lệch ~1,7 lần; vốn
   hoá lên sàn dựa trên chính con số ấy nên bỏ theo. Giá IPO cũng không thay được: kho đấu giá
   HOSE (821 bản ghi từ 2005) chỉ có GIÁ KHỞI ĐIỂM, `auctiondbAucResults` rỗng ở mọi bản ghi,
   không kèm mã chứng khoán, và không có VCB. Trường `gt`/`q`/`mc` vẫn nằm trong kho cho ai
   muốn nghiên cứu — chỉ không hiện ra. */
let NY=null, nyLoc={ex:'all',tim:''}, nySort={k:'d',d:-1};
async function nyLoad(){
  if(NY) return NY;
  try{ NY=await (await fetch('data/niemyet.json')).json(); }catch(e){ NY={ma:[],sap:[],bosung:[]}; }
  return NY;
}
const nyNgay=d=>{ if(!d||d.length<10) return '—';
  return d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4); };
function nyBang(){
  const ma=(NY.ma||[]).filter(r=>{
    if(nyLoc.ex!=='all'&&r.ex!==nyLoc.ex) return false;
    if(nyLoc.tim){ const q=nyLoc.tim.toUpperCase();
      const c=ST.map.get(r.s);
      if(r.s.indexOf(q)<0 && String((c&&c.name)||'').toUpperCase().indexOf(q)<0) return false; }
    return true;
  });
  const K=nySort.k, D=nySort.d;
  ma.sort((a,b)=>{
    const va=K==='s'?a.s:(a[K]==null?-Infinity:a[K]), vb=K==='s'?b.s:(b[K]==null?-Infinity:b[K]);
    return (va<vb?-1:va>vb?1:0)*D;
  });
  if(!ma.length) return '<div class="empty">Không có mã nào khớp bộ lọc.</div>';
  const th=(k,t,cl)=>'<th class="'+(cl||'')+' nyh" data-k="'+k+'">'+t+(nySort.k===k?(D<0?' ▾':' ▴'):'')+'</th>';
  const hang=r=>{
    const c=ST.map.get(r.s);
    const x=r.x==null?'—':'<b style="color:'+(r.x>=1?'var(--green)':'var(--red)')+'">×'+r.x.toFixed(2)+'</b>';
    /* mã CHUYỂN SÀN: ngày hiện ra là phiên giao dịch ĐẦU TIÊN, ngày lên sàn hiện tại để
       trong dấu ↷ — bằng không thấy "HOSE · 2009" mà mã đang ở UPCOM thì tưởng sai. */
    const ngay=nyNgay(r.d)+(r.dS?'<i class="nydn" title="Ngày niêm yết trên sàn hiện tại — mã này đã chuyển sàn">↷ '+nyNgay(r.dS)+'</i>':'');
    return '<tr data-sym="'+esc(r.s)+'">'
      +'<td class="l"><div class="co">'+(c?logoHTML(c):'<span class="lgw"></span>')
        +'<div><b>'+esc(r.s)+'</b><i class="nyn">'+esc((c&&c.name)||'')+'</i></div></div></td>'
      +'<td>'+esc(r.ex||'—')+'</td>'
      +'<td>'+ngay+'</td>'
      +'<td class="nycb">'+(r.gc!=null?num(r.gc)+'đ':'—')+'</td>'
      +'<td class="nycb">'+(r.g!=null?num(r.g)+'đ':'—')+'</td>'
      +'<td>'+x+'</td></tr>';
  };
  return '<div class="nywrap"><table class="tbl"><thead><tr>'
    +th('s','Mã','l')+th('ex','Sàn')+th('d','Ngày lên sàn')
    +th('gc','Giá tham chiếu phiên đầu')+th('g','Giá nền quy đổi')+th('x','Tổng lợi suất')
    +'</tr></thead><tbody>'+ma.map(hang).join('')+'</tbody></table></div>'
    +'<div class="nynote">'+ma.length.toLocaleString('en-US')+' mã.<br>'
    +'<b>Tổng lợi suất = giá hôm nay ÷ Giá nền quy đổi.</b> Giá nền là giá phiên đầu tiên sau '
    +'khi trừ hết mọi lần chia tách, cổ tức tiền, cổ tức cổ phiếu và quyền mua — nên tỉ lệ này '
    +'đã bao gồm <b>tất cả</b>: cổ tức tái đầu tư và có tham gia đủ mọi đợt chào bán thêm. '
    +'Đây cũng là cách các chỉ số tổng lợi suất tính.<br>'
    +'<b>Giá tham chiếu phiên đầu</b> là giá thị trường thật của phiên chào sàn (nguồn: hồ sơ '
    +'doanh nghiệp Vietstock). Đặt cạnh giá nền để thấy cổ phiếu đã bị pha loãng/chia bao nhiêu '
    +'lần kể từ đó — VCB chào sàn 60.000đ, nền quy đổi 9.084đ, tức đã chia ra hơn 6 lần.<br>'
    +'Ngày kèm dấu <b>↷</b> là mã đã <b>chuyển sàn</b>: ngày hiện ra là phiên giao dịch đầu '
    +'tiên, ngày trong dấu là ngày niêm yết trên sàn hiện tại.<br>'
    +'<b>Ô trống là cố ý.</b> Giá tham chiếu bị bỏ khi nó không khớp với chính ngày Vietstock '
    +'ghi (mã chuyển sàn hay bị ghép ngày mới với giá của lần niêm yết gốc — đo được hàng trăm '
    +'ca). Giá nền bị bỏ khi chuỗi giá sâu của nguồn không nối liền được với kho nến CPVN tại '
    +'phiên giao nhau. Thà để trống còn hơn hiện một con số không kiểm được.</div>';
}
/* KHÔNG CÒN NƠI GỌI từ 21/08/2026 — thẻ "Cổ phiếu sắp niêm yết" đã bỏ theo yêu cầu user.
   Giữ lại vì dữ liệu `NY.sap`/`NY.ny` vẫn được `kho_niemyet.py` cào mỗi lượt 7:30 và vẫn
   đúng; bật lại chỉ là cắm một thẻ, khỏi phải dựng lại gì. Xoá hàm này thì lần sau muốn
   bật lại phải viết lại từ đầu. */
function nyLichHTML(){
  /* ================= LỊCH NIÊM YẾT MỚI =========================================
     NGUỒN: `finfo/v4/events` nhóm `stockAlert`, type `listedHose`/`listedUpcom`/`listedHnx`.
     Đây MỚI là lịch niêm yết lần đầu — tìm ra sau khi đã dò trượt bảy cửa khác. Mỗi bản ghi
     có mã · ngày niêm yết · sàn · NGÀY CÔNG BỐ · và giá tham chiếu nằm trong `note`.
     Đo: 251 sự kiện từ 01/2022, 239 có giá tham chiếu, công bố trước 7-10 ngày.

     HIỆN TẠI KHÔNG CÓ MÃ NÀO SẮP TỚI — và phải nói rõ đó là "chưa công bố", không phải
     "không có nguồn". Hai câu đó khác hẳn nhau: nguồn chạy tốt, chỉ là đợt tới chưa tới lúc
     công bố. Nên khối rỗng vẫn kèm bằng chứng nguồn sống (mốc gần nhất + số sự kiện).

     KHÔNG DỰNG LẠI KHỐI "VỪA LÊN SÀN" (user chốt 20/08/2026 — xoá). Mục này để trả lời
     "sắp tới có gì", mã đã lên sàn rồi thì tra ở thẻ "Toàn bộ mã đang niêm yết", xếp theo
     ngày lên sàn là ra. Danh sách quá khứ vẫn giữ trong `NY.ny` vì khối rỗng cần nó làm
     bằng chứng nguồn chưa chết. */
  const L=NY.ny||[], sap=NY.sap||[];
  const hnay=new Date(); hnay.setHours(0,0,0,0);
  const tl=L.filter(r=>new Date(r.d+'T00:00:00')>=hnay);
  const qua=L.filter(r=>new Date(r.d+'T00:00:00')<hnay);   // chỉ dùng làm BẰNG CHỨNG nguồn còn sống
  const conLai=d=>{const t=new Date(d+'T00:00:00'); if(isNaN(t)) return '';
    const n=Math.round((t-hnay)/86400000);
    return n<=0?'<b class="nyd0">hôm nay</b>':n===1?'<b class="nyd0">ngày mai</b>':'<i class="nydn">còn '+n+' ngày</i>';};
  const bang=(rows,truoc)=>'<div class="nywrap"><table class="tbl"><thead><tr>'
    +'<th class="l">Mã</th><th>Sàn</th><th>Ngày lên sàn</th><th>Giá tham chiếu</th><th>Ngày công bố</th>'
    +'</tr></thead><tbody>'+rows.map(r=>{const c=ST.map.get(r.s);
      return '<tr'+(c?' data-sym="'+esc(r.s)+'"':'')+'><td class="l"><div class="co">'
      +(c?logoHTML(c):'<span class="lgw"></span>')+'<b>'+esc(r.s)+'</b></div></td>'
      +'<td>'+esc(r.ex||'—')+'</td>'
      +'<td>'+nyNgay(r.d)+(truoc?' '+conLai(r.d):'')+'</td>'
      +'<td>'+(r.gtc?num(r.gtc)+'đ':'—')+'</td>'
      +'<td class="nycb">'+nyNgay(r.cb)+'</td></tr>';}).join('')+'</tbody></table></div>';

  let h='<h3 class="nyh3">Sắp lên sàn</h3>';
  if(tl.length) h+=bang(tl,true);
  else h+='<div class="empty" style="text-align:left;padding:14px 12px">'
    +'<b>Chưa có mã nào được công bố ngày lên sàn.</b><br>'
    +'Không phải thiếu nguồn — sở công bố trước ngày giao dịch đầu tiên khoảng <b>7–10 ngày</b>, '
    +'nên mục này chỉ có tên khi đợt tới đã được công bố. Bằng chứng nguồn đang chạy: đã ghi '
    +'<b>'+L.length+'</b> lượt niêm yết, gần nhất <b>'+(L[0]?nyNgay(L[0].d)+' — '+esc(L[0].s):'—')+'</b>.'
    +'</div>';

  h+='<h3 class="nyh3">Hồ sơ đang chờ — HOSE</h3>';
  if(!sap.length) h+='<div class="empty">'+(NY.sapLoi
    ?'Chưa lấy được đường ống hồ sơ của HOSE ở lượt cập nhật gần nhất (API của Sở đang chập chờn).'
    :'Hiện không có hồ sơ nào trong đường ống của HOSE.')+'</div>';
  else h+='<div class="nywrap"><table class="tbl"><thead><tr><th class="l">Doanh nghiệp</th>'
    +'<th>Trạng thái</th><th>KL niêm yết</th><th>Ngày hồ sơ</th></tr></thead><tbody>'
    +sap.map(r=>'<tr><td class="l">'+esc(r.ten||r.s||'—')+'</td>'
      +'<td><b class="nytt'+(r.tt==='Đã được chấp thuận'?' ok':'')+'">'+esc(r.tt)+'</b></td>'
      +'<td>'+num(r.kl)+' cp</td><td>'+nyNgay(r.d)+'</td></tr>').join('')
    +'</tbody></table></div>';
  h+='<div class="nynote">Đường ống hồ sơ chỉ có ở HOSE — HNX và UPCOM không công bố qua giao '
    +'diện máy đọc được. Sở cũng không kèm ngày giao dịch đầu tiên ở bước này, nên mục này trả '
    +'lời “sắp có ai lên sàn”, còn “ngày nào” thì phải đợi mục <b>Sắp lên sàn</b> ở trên.</div>';
  return h;
}
async function renderNiemYet(){
  const el=$('#m-niemyet'); const m=MODULES.find(x=>x.id==='niemyet');
  el.innerHTML='<div class="empty">Đang nạp…</div>';
  await nyLoad();
  const sanDem={};
  for(const r of NY.ma||[]) sanDem[r.ex]=(sanDem[r.ex]||0)+1;
  const chip=(v,t)=>'<button data-ex="'+v+'"'+(nyLoc.ex===v?' class="on"':'')+'>'+t+'</button>';
  /* MỘT BẢNG, KHÔNG TIÊU ĐỀ, KHÔNG THẺ CHUYỂN (user chốt 21/08/2026: *"để 1 bảng các mã
     đã niêm yết là đủ rồi vào là hiểu ngay"*). Đã bỏ:
     · khối `head(m)` — dòng "CPVN.IO — công cụ thị trường" + "🔔 Thông tin niêm yết". Tên
       mục đã nằm trên thanh điều hướng và trên tiêu đề tab trình duyệt rồi; lặp lần nữa
       chỉ đẩy bảng xuống dưới một màn.
     · thẻ "Cổ phiếu sắp niêm yết". `nyLichHTML()` và dữ liệu `NY.sap`/`NY.ny` VẪN CÒN
       trong kho và trong mã nguồn — muốn bật lại chỉ việc cắm lại một thẻ, khỏi cào lại. */
  el.innerHTML='<div class="card" id="ny-ds">'
    +'<div class="nybar"><div class="nyseg" id="nyEx">'+chip('all','Tất cả')
      +Object.keys(sanDem).sort().map(k=>chip(k,k+' '+sanDem[k])).join('')+'</div>'
    +'<input id="nyTim" placeholder="Tìm mã hoặc tên…" value="'+esc(nyLoc.tim)+'"></div>'
    +'<div id="nyBody">'+nyBang()+'</div></div>';
  const ve=()=>{ $('#nyBody').innerHTML=nyBang(); gan(); };
  const gan=()=>{
    $$('#nyBody .nyh').forEach(t=>t.onclick=()=>{
      const k=t.dataset.k;
      if(nySort.k===k) nySort.d=-nySort.d; else { nySort.k=k; nySort.d=(k==='s'?1:-1); }
      ve();
    });
  };
  gan();
  $$('#nyEx button').forEach(b=>b.onclick=()=>{
    nyLoc.ex=b.dataset.ex;
    $$('#nyEx button').forEach(x=>x.classList.toggle('on',x===b));
    ve();
  });
  const o=$('#nyTim');
  let t0=0;
  o.oninput=()=>{ clearTimeout(t0); t0=setTimeout(()=>{ nyLoc.tim=o.value.trim(); ve(); },200); };
}

/* ---------------------------------------------------------------- đăng ký */
/* ==================================================== 5. PHÂN TÍCH DỮ LIỆU */
/* THIẾT KẾ LẠI 20/08/2026 theo đúng bốn điều user chốt:
   ① PHÂN THEO NGÀY — cả trang xoay quanh MỘT phiên đang chọn, đổi phiên bằng nút ◀ ▶,
     ô chọn, hoặc BẤM THẲNG VÀO CỘT trên đồ thị. Bản trước chỉ có phiên gần nhất.
   ② TIỀN CHỨ KHÔNG PHẢI CỔ PHIẾU — "nhiều cổ phiếu khớp nhiều nhưng thực tế chỉ vài trăm
     triệu nếu quy ra tiền". Bảng xếp mặc định theo GIÁ TRỊ khớp lệnh; khối lượng là cột phụ.
   ③ BỎ KHỐI LƯỢNG ĐẶT MUA / ĐẶT BÁN khỏi giao diện — "chỉ làm nhiễu". Kho vẫn lưu đủ.
   ④ THÊM VÙNG GIÁ KHỚP LỆNH — bấm một mã là bung ra biểu đồ khối lượng theo từng mức giá
     của chính phiên đang chọn, kèm phân bổ dòng tiền.

   Dữ liệu chia hai tầng: `data/phantich.json` nhẹ (chỉ chuỗi toàn thị trường, tải ngay) và
   `data/phien/{NGÀY}.json` (bảng mã + vùng giá, tải khi chọn phiên). */
/* ICON MỘT NÉT THAY CHO EMOJI. Luật hình ảnh của dự án (CLAUDE.md) là KHÔNG EMOJI: mỗi hệ
   điều hành vẽ một kiểu, và chúng mang MÀU RIÊNG chửi nhau với bảng màu — trên một trang
   mà xanh/đỏ có nghĩa là tăng/giảm thì một cái 📉 đỏ chót cạnh tiêu đề là nhiễu thật sự.
   Icon nét dùng `currentColor` nên tự đổi theo chủ đề sáng/tối và theo màu chữ chỗ nó đứng.
   Bản 21/08/2026 gỡ 📊 ✨ 💸 📋 🌏 🏦 💰 📈 📉 🤝 🏭 khỏi mục này. */
const PTIC={
  tt:   '<path d="M3 20h18"/><path d="M6.5 20v-7"/><path d="M11 20V5"/><path d="M15.5 20v-10"/><path d="M20 20v-5"/>',
  tien: '<path d="M4 8h13"/><path d="M14 5l3 3-3 3"/><path d="M20 16H7"/><path d="M10 13l-3 3 3 3"/>',
  ngoai:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z"/>',
  bank: '<path d="M3.5 10L12 4.5 20.5 10"/><path d="M6 10.5v8"/><path d="M10 10.5v8"/><path d="M14 10.5v8"/><path d="M18 10.5v8"/><path d="M3.5 19.5h17"/>',
  sang: '<path d="M11 3.5l1.7 4.6 4.6 1.7-4.6 1.7L11 16.1 9.3 11.5 4.7 9.8l4.6-1.7z"/><path d="M17.6 15.4l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  xu:   '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v5.5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 11.5V17c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5.5"/>',
  len:  '<path d="M3 17.5l6-6 3.5 3.5L21 7"/><path d="M15 7h6v6"/>',
  xuong:'<path d="M3 6.5l6 6 3.5-3.5L21 17"/><path d="M15 17h6v-6"/>',
  tay:  '<rect x="2.5" y="9" width="6" height="6" rx="1.6"/><rect x="15.5" y="9" width="6" height="6" rx="1.6"/><path d="M9.5 12h5"/><path d="M12.8 10.2l1.8 1.8-1.8 1.8"/>',
  nganh:'<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
  bang: '<rect x="3" y="4.5" width="18" height="15" rx="2.2"/><path d="M3 9.5h18"/><path d="M9.5 9.5v10"/>',
  bieu: '<path d="M3.5 3.5v17h17"/><path d="M7 15.5l4-5 3 3 5.5-7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11.2v5"/><path d="M12 7.6v.9"/>',
  trai: '<path d="M15 5l-7 7 7 7"/>',
  phai: '<path d="M9 5l7 7-7 7"/>',
  ve:   '<path d="M20 12H4.5"/><path d="M11 5.5L4.5 12 11 18.5"/>'
};
function ptIc(k){
  return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"'+
    ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(PTIC[k]||'')+'</svg>';
}
/* GHI CHÚ GẤP LẠI ĐƯỢC. Bản trước để hai khối ghi chú viền ĐỎ đứng thường trực giữa dữ
   liệu — mà đỏ trên chính trang này là màu của GIẢM GIÁ, hai mảng đỏ cạnh bảng số đọc ra
   như báo động. Chữ vẫn còn nguyên chữ, chỉ gấp lại sau một nút.
   PHẢI NHỚ TRẠNG THÁI: bảng vẽ lại mỗi lần đổi cột xếp hay gõ ô tìm, `<details>` trơn sẽ
   tự sập đúng vào lúc người ta đang đọc dở. */
function ptGiai(id,ten,html){
  return '<details class="ptgt" data-g="'+id+'"'+(PT.giai[id]?' open':'')+'>'
    +'<summary>'+ptIc('info')+(ten||'Cách đọc')+'</summary><div>'+html+'</div></details>';
}
function ptBindGiai(){ $$('.ptgt').forEach(d=>{ d.ontoggle=()=>{ PT.giai[d.dataset.g]=d.open; }; }); }

/* CÔNG TẮC BẬT/TẮT TỪNG KHỐI CỦA TRANG PHÂN TÍCH (user chốt 22/08/2026: *"tạm ẩn đi 4
   mục"*). Đổi `false` -> `true` là khối đó hiện lại, không phải sửa gì thêm — MỌI mạch
   dựng, dữ liệu và CSS của bốn khối này VẪN CÒN NGUYÊN trong mã nguồn và trong kho
   (`data/phien/*.json` vẫn mang `la`, `dt`, `dtf`; `tools/quet_la.py` vẫn chạy trong
   lượt EOD). Đây là ẩn, không phải gỡ.
   Cùng lối với cờ `HIEN_MORONG` của `cophieu.html` — xem CLAUDE.md. */
const PT_HIEN={
  quetla:   false,   // "Phiên này có gì lạ"
  dongtien: false,   // "Khối ngoại và tự doanh mua bán gì"
  diemsang: false,   // "Điểm sáng phiên"
  boloc:    false,   // "Bộ lọc đặc trưng"
};

const PT={tt:null, ngay:null, phien:{}, sort:'mval', dir:-1, ex:'all', q:'', mo:null,
          n:100, ma:null, maD:null, nMa:63, maI:null, ghim:null, giai:{},
          che:'ai'};   // 'tong' = khớp lệnh + thoả thuận · 'ai' = ai mua ai bán   // nMa = 63 phiên ≈ 3 tháng

async function ptTT(){
  if(PT.tt) return PT.tt;
  try{ PT.tt=await (await fetch('data/phantich.json')).json(); }catch(e){ PT.tt={err:1}; }
  /* CHỨNG QUYỀN — 26 KB, tải cùng lượt đầu. Không có nó thì con số tự doanh đọc ra sai
     bản chất (xem ptDongTien), mà tải lười thì nó về sau khối đã vẽ xong. */
  try{ PT.cq=(await (await fetch('data/chungquyen.json')).json()).theoCS||{}; }catch(e){ PT.cq={}; }
  return PT.tt;
}
/* Mỗi phiên một file, đệm lại theo ngày — đổi qua đổi lại giữa hai phiên không gọi mạng lần hai */
async function ptPhien(ng){
  if(PT.phien[ng]!==undefined) return PT.phien[ng];
  try{ PT.phien[ng]=await (await fetch('data/phien/'+ng+'.json')).json(); }
  catch(e){ PT.phien[ng]=null; }
  return PT.phien[ng];
}

async function renderPhanTich(){
  /* KHÔNG DỰNG `head(m)` — user chốt 21/08/2026 ("bỏ khối tiêu đề"). Ba dòng "CPVN.IO —
     công cụ thị trường" / tên mục / câu mô tả chiếm gần một phần ba màn trước khi thấy số
     đầu tiên, mà tên mục đã nằm sẵn trên thanh điều hướng và trên tiêu đề tab trình duyệt.
     Cùng một quyết định đã áp cho Thông tin niêm yết cùng ngày — hai mục cùng site thì
     phải cùng một giọng. */
  const el=$('#m-phantich');
  el.innerHTML='<div class="empty">Đang nạp…</div>';
  const o=await ptTT();
  if(!o||o.err||!o.tt||!o.tt.d||!o.tt.d.length){
    el.innerHTML='<div class="panel"><div class="pb"><div class="empty">'+
      'Chưa có dữ liệu — kho <code>data/giaodich</code> đang được bồi.</div></div></div>';
    return;
  }
  if(!PT.ngay) PT.ngay=o.tt.d[o.tt.d.length-1];
  /* Vào thẳng bằng `?sym=` (link từ trang cổ phiếu) thì NẠP LUÔN dữ liệu mã đó trước khi
     vẽ. Không nạp thì `ptVeMa` chạy với `PT.maD` rỗng và trang đứng im ở "Đang nạp…" —
     vì hàm gọi fetch là `ptMoMa`, mà đường vào bằng URL không đi qua nó. */
  if(PT.ma&&!PT.maD){
    try{ PT.maD=await (await fetch('data/giaodich/'+PT.ma+'.json')).json(); }
    catch(e){ PT.maD={err:1}; }
  }
  el.innerHTML='<div id="ptBody"></div>';
  await ptVe();
}

/* Phiên nào CÓ file ngày thì mới chọn được — phiên thưa mã không dựng file (xem build_phantich) */
/* Phiên nào CÓ file ngày thì mới chọn được. Trần 320 khớp `SO_PHIEN_FILE` của
   `build_phantich.py` — hai chỗ lệch nhau thì hoặc ô chọn bày ra phiên không có file
   (bấm vào bảng trống), hoặc giấu mất phiên đã có file. */
function ptCoFile(o){ const t=o.tt; return t.d.filter((d,i)=>t.n[i]>=100).slice(-320); }

async function ptVe(){
  const o=PT.tt, b=$('#ptBody'); if(!b) return;
  const co=ptCoFile(o), i=co.indexOf(PT.ngay);
  const opt=co.slice().reverse().map(d=>'<option'+(d===PT.ngay?' selected':'')+'>'+d+'</option>').join('');
  b.innerHTML=
    '<div class="ptbar">'
      +'<button id="ptTruoc" class="ptnav"'+(i<=0?' disabled':'')+' title="Phiên trước">'+ptIc('trai')+'</button>'
      +'<select id="ptNgay">'+opt+'</select>'
      +'<button id="ptSau" class="ptnav"'+(i<0||i>=co.length-1?' disabled':'')+' title="Phiên sau">'+ptIc('phai')+'</button>'
      +'<span class="ptseg" id="ptKhung">'
        +[100,300,600,1000].map(x=>'<button data-n="'+x+'"'+(PT.n===x?' class="on"':'')+'>'
            +x+'</button>').join('')+'</span>'
      +'<span class="ptbarn">'+co.length+' phiên có bảng mã</span>'
      +'<span class="ptbaon" id="ptBaoN"></span></div>'
    +'<div id="ptTop"></div><div id="ptTab"></div>';
  ptTop();
  if(PT.ma){ ptVeMa(); } else { await ptBang(); }
  /* ĐỔI KHUNG THÌ CHỈ VẼ LẠI ĐỒ THỊ, đừng dựng lại cả trang: bảng mã và mấy khối dưới
     không phụ thuộc khung, dựng lại chúng là mất chỗ đang cuộn và mất cả ô tìm đang gõ. */
  const kh=$('#ptKhung');
  if(kh) kh.onclick=e=>{ const b=e.target.closest('button'); if(!b) return;
    PT.n=+b.dataset.n;
    $$('#ptKhung button').forEach(x=>x.classList.toggle('on',x===b));
    ptVeChart(); };
  $('#ptNgay').onchange=e=>{ PT.ngay=e.target.value; PT.mo=null; ptVe(); };
  $('#ptTruoc').onclick=()=>{ const j=co.indexOf(PT.ngay); if(j>0){ PT.ngay=co[j-1]; PT.mo=null; ptVe(); } };
  $('#ptSau').onclick=()=>{ const j=co.indexOf(PT.ngay); if(j>=0&&j<co.length-1){ PT.ngay=co[j+1]; PT.mo=null; ptVe(); } };
}

function ptTop(){
  const o=PT.tt, t=o.tt, i=t.d.indexOf(PT.ngay);
  if(i<0) return;
  const kl=t.mval[i], tt=t.pval[i], tong=kl+tt;
  const cs=o.chiso||{};
  const box=(nhan,gt,ghi,cl)=>'<div class="ptbox"><span class="ptlb">'+nhan+'</span><b'+
    (cl?' class="'+cl+'"':'')+'>'+gt+'</b>'+(ghi?'<i>'+ghi+'</i>':'')+'</div>';
  /* CHỈ SỐ ĐỨNG TRƯỚC TIỀN. Câu đầu tiên của một phiên là "hôm nay thị trường lên hay
     xuống"; giá trị giao dịch là câu thứ hai. Bản trước không có chỉ số nên nhìn vào
     không biết phiên đó là phiên tăng hay giảm — user chốt 20/08/2026. */
  const vn=cs.VNINDEX, pc=vn&&vn.pc[i];
  const soChia=(t.nFn||[]).filter(x=>x).length;
  const phu=['VN30','HNX','UPCOM'].map(k=>{
    const x=cs[k]; if(!x||x.c[i]==null) return '';
    const p=x.pc[i];
    return '<span class="ptcs"><b>'+k+'</b> '+num2(x.c[i])+
      '<i class="'+cls(p)+'">'+(p>0?'+':'')+(p==null?'—':p.toFixed(2)+'%')+'</i></span>';
  }).join('');
  /* CHỈ SỐ GỘP THÀNH MỘT Ô RỘNG, KHÔNG CÒN DẢI RIÊNG BÊN DƯỚI. Bản trước xếp ba tầng số
     chồng nhau — sáu ô lớn, rồi dải VN30/HNX/UPCOM, rồi dải chi tiết khối ngoại/tự doanh —
     mắt không biết đọc tầng nào trước. VN-Index và ba chỉ số phụ vốn là CÙNG một câu hỏi
     ("hôm nay thị trường lên hay xuống"), nên chúng thuộc về cùng một ô; gộp lại là bớt
     hẳn một tầng mà không mất chữ nào. */
  /* Bên trong ô: VN-Index to bên TRÁI, ba chỉ số phụ xếp dọc gọn bên PHẢI. Xếp dọc chúng
     xuống dưới thì ô cao gấp đôi năm ô còn lại, và lưới kéo cả năm ô kia cao theo — năm
     mảng trống to đúng bằng phần chữ. */
  const boxCS='<div class="ptbox ptbox2"><div class="ptcsm"><div class="ptcsa">'
    +'<span class="ptlb">VN-Index</span>'
    +'<b'+(pc==null?'':' class="'+cls(pc)+'"')+'>'+(vn&&vn.c[i]!=null?num2(vn.c[i]):'—')+'</b>'
    +(pc==null?'':'<i><b class="'+cls(pc)+'">'+(pc>0?'+':'')+pc.toFixed(2)
      +'%</b> so với phiên trước</i>')
    +'</div>'+(phu?'<div class="ptcsw">'+phu+'</div>':'')+'</div></div>';
  $('#ptTop').innerHTML='<div class="panel"><div class="ph">'+ptIc('tt')+'Toàn thị trường — phiên '+
    esc(PT.ngay)
    +'<span class="cnt">'+num(t.n[i])+' mã</span></div><div class="pb">'
    +'<div class="ptgrid ptg7">'
    +boxCS
    /* MỘT Ô CHO CẢ HAI LOẠI GIAO DỊCH, không tách hai ô. Ô lớn đọc được "hôm nay thị
       trường giao dịch bao nhiêu tiền"; tách khớp lệnh với thoả thuận là chi tiết, thuộc
       về dòng phụ. Gộp lại còn để lưới xuống 6 đơn vị — 7 đơn vị thì mỗi ô hẹp tới mức
       "10.167 nghìn tỷ" bị cắt cụt, mà con số bị cắt thì mất nghĩa hoàn toàn. */
    /* Ô này mang màu "còn lại (trong nước)" vì cột trên đồ thị chính là giá trị khớp
       lệnh; phần thoả thuận nằm NGOÀI cột nên nói ngay ở đây, khỏi chú thích riêng. */
    +box('<i class="pkR"></i>Giá trị giao dịch', num(tong)+' tỷ',
         'khớp lệnh <b>'+num(kl)+'</b> = chiều cao cột · thoả thuận <b>'+num(tt)
         +'</b> tỷ nằm ngoài cột')
    /* HAI CON SỐ, KHÔNG PHẢI MỘT. Vốn hoá danh nghĩa 10.167 nghìn tỷ nghe như quy mô
       thị trường, nhưng phần THỰC SỰ MUA BÁN ĐƯỢC chỉ 2.049 — 20,1%. Phần chênh nằm ở
       tay nhà nước và cổ đông chiến lược, không bao giờ ra sàn. Hiện mỗi con số đầu là
       nói quá quy mô thị trường lên 5 lần. */
    /* VIẾT HẲN SỐ THEO ĐƠN VỊ TỶ, ĐỪNG ĐỔI BẬC SANG "NGHÌN TỶ" (user chốt 22/08/2026).
       "10.167 nghìn tỷ" đọc ra không ai hiểu là **hơn 10 TRIỆU tỷ** — mắt bắt lấy con số
       10.167 rồi dừng ở đó, chữ "nghìn" phía sau thành ra chỉ là một cái đuôi. Viết
       10.167.115 tỷ thì độ lớn nằm ngay trong chính con số, không phải nhân nhẩm.
       Đây cũng đúng luật sẵn có của dự án mà đoạn cũ đã phá: *một đơn vị `tỷ` duy nhất,
       viết hẳn số, không đổi bậc; chỉ CÂU CHỮ mới viết "nghìn tỷ"* — xem mục Quy ước
       toàn site trong CLAUDE.md. Cùng lý do đã bỏ hậu tố tự chế "N"/"Tr" ở bảng giá. */
    +box('Vốn hoá thị trường', num(t.mcap[i])+' tỷ',
         (t.mcapFF&&t.mcapFF[i]!=null)
           ?('giao dịch được <b>'+num(t.mcapFF[i])+' tỷ</b> · <b>'
             +(t.mcap[i]?(t.mcapFF[i]/t.mcap[i]*100).toFixed(1):'—')+'%</b> free float')
           :('<b>'+num(t.nMcap[i])+'</b> mã có số cổ phiếu'))
    /* KHỐI NGOẠI và TỰ DOANH: hiện RÒNG làm số chính, mua/bán làm phụ. `nFn`/`nTd` phải nói
       ra vì hai tầng này phủ khác nhau — tự doanh phiên 20/08 chỉ có 62 mã trong khi khối
       ngoại có 1.525, mà phần lớn 1.463 mã kia KHÔNG PHẢI thiếu dữ liệu: chúng không có
       tự doanh thật. Không ghi số mã thì "+508 tỷ" đọc như của cả thị trường. */
    +box('<i class="pkN"></i>Khối ngoại ròng',
         (t.fnMua&&t.fnMua[i]!=null)
           ?('<span class="'+cls(t.fnMua[i]-t.fnBan[i])+'">'+((t.fnMua[i]-t.fnBan[i])>0?'+':'')
             +num(t.fnMua[i]-t.fnBan[i])+' tỷ</span>'):'—',
         (t.fnMua&&t.fnMua[i]!=null)
           ?('mua <b class="up">'+num(t.fnMua[i])+'</b> · bán <b class="dn">'+num(t.fnBan[i])
             +'</b> tỷ · chiếm <b>'+(t.mval[i]?((t.fnMua[i]+t.fnBan[i])/2/t.mval[i]*100).toFixed(1):'—')
             +'%</b> · <b>'+num(t.nFn[i])+'</b> mã'):'kho chưa có')
    +box('<i class="pkT"></i>Tự doanh ròng',
         (t.tdMua&&t.tdMua[i]!=null)
           ?('<span class="'+cls(t.tdMua[i]-t.tdBan[i])+'">'+((t.tdMua[i]-t.tdBan[i])>0?'+':'')
             +num(t.tdMua[i]-t.tdBan[i])+' tỷ</span>'):'—',
         (t.tdMua&&t.tdMua[i]!=null)
           ?('mua <b class="up">'+num(t.tdMua[i])+'</b> · bán <b class="dn">'+num(t.tdBan[i])
             +'</b> tỷ · chiếm <b>'+(t.mval[i]?((t.tdMua[i]+t.tdBan[i])/2/t.mval[i]*100).toFixed(1):'—')
             +'%</b> · <b>'+num(t.nTd[i])+'</b> mã có'):'kho chưa có')
    +'</div>'
    +'<div class="ptcv" id="ptCvW"><canvas id="ptCv"></canvas>'
      +'<div class="ptcvhl" id="ptHL"></div><div class="pttip" id="ptTip"></div></div>'
    /* CHÚ THÍCH CHỈ CÒN THỨ HÀNG Ô TRÊN KHÔNG NÓI. Ba màu chính (khối ngoại · tự doanh ·
       còn lại) nay nằm ngay trên chính cái ô mang con số của khối đó, nên nhìn ô là biết
       cột màu nào là ai — khỏi dóng xuống hàng chú thích rồi dóng ngược lên.
       DẢI CHI TIẾT ĐÃ GỠ (user chốt 22/08/2026: *"ở trên đã có rồi, tại sao phía dưới lại
       nhắc lại"*): nó in đúng `mua · bán · ròng · chiếm %` của khối ngoại và tự doanh,
       trùng TỪNG CON SỐ với hai ô ngay phía trên. Thứ duy nhất nó nói thêm là "chiếm %",
       nay đã nhét vào chính hai ô đó. */
    +'<p class="ptleg"><i class="pk0"></i> phiên kho chưa cào đủ mã'
      +' &nbsp; <i class="pk3"></i> VN-Index (trục phải)'
      +(soChia<t.d.length
        ?(' &nbsp;·&nbsp; cột chia màu theo khối ở <b>'+num(soChia)+' phiên gần nhất</b>;'
          +' xa hơn nguồn chỉ cho TỔNG (gồm thoả thuận) nên để một màu')
        :'')
      +' &nbsp;·&nbsp; <b>bấm vào cột để xem chi tiết phiên đó</b></p>'
    +ptGiai('cot','Vì sao màu trên cột lại chia như vậy',
       'Màu trên cột là <b>mức tham gia</b> = (mua + bán) ÷ 2, không phải mua cộng bán: mỗi '
      +'lệnh khớp có đúng một người mua và một người bán, cộng thẳng cả hai vế là đếm hai '
      +'lần. Chia đôi thì ba mảng cộng lại bằng đúng giá trị khớp lệnh của phiên. '
      +'Cột <b>xám</b> là phiên kho chưa cào đủ mã — thấp vì thiếu dữ liệu chứ không phải vì ế.')
    +'</div></div>';
  const ch=$('#ptChe');
  if(ch) ch.onclick=e=>{ const b=e.target.closest('button'); if(!b) return;
    PT.che=b.dataset.c; ptTop(); };
  ptBindGiai();
  ptVeChart();
}
/* `ptChiTiet` ĐÃ XOÁ 22/08/2026 — nó dựng dải `mua · bán · ròng · chiếm %` cho khối
   ngoại và tự doanh ngay dưới đồ thị, mà hàng ô ở trên đã in đúng từng con số đó. User
   chốt: *"ở trên đã có rồi, tại sao phía dưới lại nhắc lại"*. Phần "chiếm %" đã chuyển
   vào chính hai ô ấy, còn màu của từng khối nay nằm trên nhãn ô (chấm `.pkN`/`.pkT`)
   nên nhìn ô là biết cột màu nào là ai. CSS `.ptct`/`.ptcti`/`.ptctn`/`.ptctv`/`.ptctp`
   cũng xoá theo. */
const num2=n=>n==null||isNaN(n)?'—':n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

/* BƯỚC CHIA TRÒN CHO TRỤC DỌC. Mốc phải rơi vào số người ta đọc được — 5.000, 10.000,
   25.000 — chứ không phải "21.818" là đúng bằng cột cao nhất. Bản trước chỉ in mỗi con số
   đỉnh nên không đọc được cột giữa bằng bao nhiêu, phải rê chuột từng cột.
   Ứng viên 1 / 2 / 2,5 / 5 × 10^k là bộ chuẩn của mọi thư viện đồ thị: mọi bội số của
   chúng đều là số tròn trong hệ thập phân. Nhắm ~5 vạch. */
function ptBuoc(mx){
  const tho=mx/5, e=Math.pow(10,Math.floor(Math.log10(tho||1)));
  for(const k of [1,2,2.5,5,10]) if(tho<=k*e) return k*e;
  return 10*e;
}
/* Đồ thị cột chồng, BẤM ĐƯỢC. Toạ độ từng cột nhớ lại trong `ptCols` để đổi x -> ngày;
   tính lại mỗi lượt vẽ vì bề ngang canvas đổi theo khổ màn. */
let ptCols=[];
function ptVeChart(){
  const cv=$('#ptCv'); if(!cv) return;
  const o=PT.tt, t=o.tt;
  /* KHUNG CỐ ĐỊNH Ở N PHIÊN GẦN NHẤT, KHÔNG CO THEO PHIÊN ĐANG CHỌN. Bản trước lấy
     `i1 = max(iSel+1, N)` nên bấm vào một cột cũ là mọi cột SAU nó biến mất — chọn xong
     không còn đường bấm quay lại, phải dùng ô chọn ngày. User chốt 20/08/2026. */
  const i1=t.d.length, i0=Math.max(0, i1-PT.n);
  const dpr=devicePixelRatio||1, W=cv.clientWidth||800;
  /* CAO HƠN HẲN (user chốt 20/08/2026): 190px thì mấy chục cột chồng lên nhau thành một
     dải, không đọc được cột nào với cột nào. Khổ hẹp thấp hơn vì màn dọc còn phải chừa
     chỗ cho bảng. */
  const H=W<560?240:330;
  cv.width=W*dpr; cv.height=H*dpr; cv.style.height=H+'px';
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
  /* DÒ CHỦ ĐỀ BẰNG `isLight()`, ĐỪNG DÒ BẰNG `classList`. Trang đặt chủ đề vào
     `document.documentElement.dataset.theme` (xem đoạn inline đầu congcu.html và nút đổi
     đèn), KHÔNG bao giờ gắn class `theme-dark`/`theme-light` — nên nhánh classList cũ
     LUÔN sai và cả biểu thức rơi về `prefers-color-scheme` của hệ điều hành. Hậu quả đo
     được: máy để hệ điều hành TỐI mà bấm trang sang SÁNG thì đồ thị vẫn vẽ bảng màu tối
     lên nền sáng, và ngược lại. Im lặng hoàn toàn vì trên máy có OS và trang cùng chế độ
     thì nó lại đúng — chỉ hỏng đúng nhóm người dùng đổi đèn thủ công. */
  const dark=!isLight();
  const c1=dark?'#38bdf8':'#0284c7', c2=dark?'#a78bfa':'#7c3aed',
        cg=dark?'rgba(148,163,184,.20)':'rgba(100,116,139,.18)', ct=dark?'#94a3b8':'#64748b';
  let mx=0, nMax=0;
  for(let i=i0;i<i1;i++){ mx=Math.max(mx,t.mval[i]||0); nMax=Math.max(nMax,t.n[i]||0); }
  if(mx<=0) mx=1;
  /* PHIÊN THIẾU PHỦ PHẢI TRÔNG KHÁC HẲN PHIÊN Ế. Kho bồi dần nên phiên cũ có ít mã hơn,
     cột thấp theo — mà nhìn cột thì không tài nào biết thấp vì thị trường ế hay vì kho
     chưa cào tới. User hỏi đúng câu đó ("sao các ngày ở tháng 7 vol thấp vậy?"), và một
     dòng ghi chú dưới đồ thị không cứu được: mắt đọc cột trước khi đọc chữ.
     Dưới 60% số mã của phiên dày nhất trong khung -> tô XÁM, và nói ra trong chú thích. */
  const duPhu=i=>nMax>0&&(t.n[i]||0)>=nMax*0.6;
  /* TRẦN CỐ ĐỊNH 50.000 TỶ (user chốt 20/08/2026), bước 5.000 -> 10 vạch. Trần cố định
     thì đổi khung thời gian hay đổi phiên, chiều cao cột vẫn so thẳng được với lần trước;
     trần co theo dữ liệu thì cùng một phiên nhìn cao thấp khác nhau tuỳ khung đang mở.
     Vượt 50.000 thì mới nới, và nới theo bước tròn. */
  const TRAN_VOL=50000;
  let dinh=TRAN_VOL, buoc=5000;
  if(mx>TRAN_VOL){ buoc=ptBuoc(mx); dinh=Math.ceil(mx/buoc)*buoc; }
  /* Chừa chỗ TRÁI cho nhãn trục — đo bằng chính chữ sắp in, đừng đoán: "50,000" và "500"
     rộng khác nhau, ghim cứng một số là hoặc cụt nhãn hoặc phí chỗ. */
  g.font='11px system-ui,sans-serif';
  const padL=Math.ceil(g.measureText(num(dinh)).width)+10, padB=20, padT=8;
  const plotH=H-padB-padT, plotW=W-padL;
  g.strokeStyle=cg; g.lineWidth=1; g.fillStyle=ct; g.textBaseline='middle'; g.textAlign='right';
  for(let v=0; v<=dinh+1; v+=buoc){
    const y=padT+plotH-(v/dinh)*plotH;
    g.beginPath(); g.moveTo(padL,y+.5); g.lineTo(W,y+.5); g.stroke();
    if(v>0) g.fillText(num(v), padL-6, y);
  }
  const n=i1-i0, gap=plotW/n, bw=Math.max(1,gap*0.72);
  /* Bảng màu cho chế độ "ai mua ai bán". Khối ngoại và tự doanh phải KHÁC HẲN nhau về sắc
     độ chứ không chỉ khác đậm nhạt — hai nhóm này hay đi ngược chiều nhau, mà đó chính là
     thứ người xem mở đồ thị ra để tìm. */
  const cN=dark?'#22d3ee':'#0891b2',      // khối ngoại
        cT=dark?'#fb923c':'#ea580c',      // tự doanh
        cR=dark?'rgba(56,189,248,.42)':'rgba(2,132,199,.30)';   // còn lại (trong nước)
  const xam=dark?'rgba(148,163,184,.40)':'rgba(148,163,184,.50)';
  ptCols=[];
  for(let i=i0;i<i1;i++){
    const x=padL+(i-i0)*gap+(gap-bw)/2, du=duPhu(i);
    if(t.d[i]===PT.ngay){ g.fillStyle=dark?'rgba(244,63,94,.20)':'rgba(244,63,94,.13)';
      g.fillRect(padL+(i-i0)*gap, padT, gap, plotH); }
    /* MỘT CỘT = TỔNG GIÁ TRỊ KHỚP LỆNH của phiên, tô theo MỨC THAM GIA của từng khối.
       User chốt 21/08/2026: hai cột cạnh nhau (mua/bán) rối mắt — cột cứ hiện tổng, màu
       nói khối nào mạnh, bấm vào mới xem chi tiết mua/bán/ròng.

       MỨC THAM GIA = (mua + bán) ÷ 2, KHÔNG phải mua + bán. Mỗi lệnh khớp có đúng một
       người mua và một người bán, nên cộng thẳng cả hai vế là đếm hai lần và tổng sẽ vượt
       giá trị phiên. Chia đôi thì ba phần cộng lại bằng ĐÚNG giá trị khớp lệnh: khối ngoại
       bán cho nhà đầu tư trong nước thì nửa giá trị ghi cho khối ngoại, nửa ghi cho trong
       nước — đúng như thực tế mỗi bên đóng một vai. */
    /* CHIA MÀU CHỈ KHI CÓ SỐ KHỚP LỆNH CỦA TỪNG KHỐI. Tầng đó lấy từ Vietstock và bị
       nguồn chặn ở 1 năm, trong khi cột thì sâu 1.000 phiên (VNDirect). Phiên cũ hơn vẫn
       có TỔNG của khối ngoại (`fnMuaT`) nhưng tổng gồm cả thoả thuận — mà thoả thuận
       chiếm **15,1%** giá trị khối ngoại toàn kho, nên đem tổng đội lốt khớp lệnh là thổi
       mức tham gia lên gần một phần năm. Thà vẽ cột một màu và nói ra. */
    const mval=t.mval[i]||0;
    const coChia=!!(t.nFn&&t.nFn[i]);
    const fn=coChia?((t.fnMua?t.fnMua[i]||0:0)+(t.fnBan?t.fnBan[i]||0:0))/2:0;
    const td=coChia?((t.tdMua?t.tdMua[i]||0:0)+(t.tdBan?t.tdBan[i]||0:0))/2:0;
    const con=Math.max(0,mval-fn-td);      // kẹp 0: nhiễu nguồn không được đẻ cột âm
    let day=0;
    for(const [v,mau] of [[con,cR],[td,cT],[fn,cN]]){
      if(v<=0) continue;
      g.fillStyle=du?mau:xam;
      g.fillRect(x, padT+plotH-(day+v)/dinh*plotH, bw, Math.max(1,v/dinh*plotH));
      day+=v;
    }
    ptCols.push({x0:padL+(i-i0)*gap, x1:padL+(i-i0+1)*gap, d:t.d[i]});
  }
  /* ĐƯỜNG VN-INDEX CHỒNG LÊN CỘT, TRỤC RIÊNG BÊN PHẢI. Khối lượng và điểm số là hai đại
     lượng khác đơn vị hoàn toàn — ép chung một trục là một trong hai bẹp dí. Trục phải
     KHÔNG bắt đầu từ 0 (chỉ số dao động quanh một mức cao, kéo về 0 thì đường thẳng đơ);
     lấy min/max trong khung rồi nới 8% mỗi đầu cho đường không chạm mép. */
  const cs=(o.chiso&&o.chiso.VNINDEX)||null;
  if(cs){
    let lo=Infinity, hi=-Infinity;
    for(let i=i0;i<i1;i++){ const v=cs.c[i]; if(v!=null){ lo=Math.min(lo,v); hi=Math.max(hi,v); } }
    if(hi>lo){
      const bien=(hi-lo)*0.08; lo-=bien; hi+=bien;
      const yI=v=>padT+plotH-(v-lo)/(hi-lo)*plotH;
      g.strokeStyle=dark?'#fbbf24':'#d97706'; g.lineWidth=1.8;
      g.beginPath(); let dau=true;
      for(let i=i0;i<i1;i++){ const v=cs.c[i]; if(v==null){ dau=true; continue; }
        const x=padL+(i-i0)*gap+gap/2, y=yI(v);
        if(dau){ g.moveTo(x,y); dau=false; } else g.lineTo(x,y); }
      g.stroke();
      g.fillStyle=dark?'#fbbf24':'#d97706'; g.font='10.5px system-ui,sans-serif';
      g.textAlign='right'; g.textBaseline='top';    g.fillText(num2(hi-bien), W-2, padT+1);
      g.textBaseline='bottom'; g.fillText(num2(lo+bien), W-2, padT+plotH-1);
    }
  }
  g.fillStyle=ct; g.font='11px system-ui,sans-serif'; g.textBaseline='top'; g.textAlign='left';
  g.fillText(t.d[i0], padL, H-15);
  g.textAlign='right'; g.fillText(t.d[i1-1], W, H-15);
  g.textAlign='left'; g.fillText('tỷ đồng', 0, H-15);
  cv.style.cursor='pointer';
  cv.onclick=e=>{ const r=cv.getBoundingClientRect(), x=e.clientX-r.left;
    const c=ptCols.find(z=>x>=z.x0&&x<z.x1); if(!c) return;
    /* CHỈ NHẢY TỚI PHIÊN CÓ FILE NGÀY — và khi không có thì PHẢI NÓI RA. Từ khi khung
       đồ thị lên tới 1.000 phiên mà kho file ngày chỉ dựng 320 phiên gần nhất, phần lớn
       cột bên trái là bấm không ăn. Im lặng thì đọc ra như nút hỏng, và người ta sẽ bấm
       lại mấy lần — đúng cái bẫy đã ghi ở hàng bảng mã ("bấm là phải có phản hồi"). */
    if(ptCoFile(o).indexOf(c.d)<0){
      const nb=$('#ptBaoN');
      if(nb){ nb.textContent='Phiên '+c.d+' chưa có bảng mã — kho chỉ dựng bảng cho '
        +ptCoFile(o).length+' phiên gần nhất. Đồ thị vẫn đủ dữ liệu.';
        nb.style.display='block'; clearTimeout(PT._bn);
        PT._bn=setTimeout(()=>{ nb.style.display='none'; },4000); }
      return;
    }
    PT.ngay=c.d; PT.mo=null; ptVe(); };
  /* THẺ CHÚ GIẢI TỰ VẼ, KHÔNG DÙNG `title` CỦA TRÌNH DUYỆT. `title` đợi ~1 giây mới hiện,
     hiện ở góc chuột bằng phông hệ thống, và không xuống dòng được — rê dọc một dải 60 cột
     thì gần như không bao giờ kịp thấy. Thẻ tự vẽ hiện tức thì và xếp được số theo cột.
     Vạch nền `#ptHL` tô cột đang rê bằng một thẻ RIÊNG chứ không vẽ lại canvas: vẽ lại cả
     đồ thị theo từng lượt `mousemove` là 60 cột × mỗi pixel chuột đi qua. */
  const wrap=$('#ptCvW'), hl=$('#ptHL'), tip=$('#ptTip');
  const hien=(x,ep)=>{
    const c=ptCols.find(z=>x>=z.x0&&x<z.x1);
    if(!c){ if(hl) hl.style.display='none'; if(tip) tip.style.display='none'; return; }
    const k=t.d.indexOf(c.d), cs=(o.chiso&&o.chiso.VNINDEX)||null;
    const tongGD=(t.mval[k]||0)+(t.pval[k]||0), pc=cs?cs.pc[k]:null;
    if(hl){ hl.style.display='block'; hl.style.left=c.x0+'px'; hl.style.width=(c.x1-c.x0)+'px'; }
    if(!tip) return;
    tip.innerHTML='<b>'+esc(c.d)+'</b>'
      +'<div class="tpr"><span>Tổng giao dịch</span><i>'+num(tongGD)+' tỷ</i></div>'
      +'<div class="tpr tp2"><span>khớp lệnh</span><i>'+num(t.mval[k])+' tỷ</i></div>'
      +'<div class="tpr tp2"><span>thoả thuận</span><i>'+num(t.pval[k])+' tỷ</i></div>'
      +'<div class="tpr"><span>Khối lượng khớp</span><i>'+num(t.mv[k])+' nghìn cp</i></div>'
      +((t.nFn&&t.nFn[k])
        ?'<div class="tpr"><span>Khối ngoại ròng <b>khớp lệnh</b></span><i class="'+cls(t.fnMua[k]-t.fnBan[k])+'">'+
          ((t.fnMua[k]-t.fnBan[k])>0?'+':'')+num(t.fnMua[k]-t.fnBan[k])+' tỷ</i></div>'+
         '<div class="tpr tp2"><span>mua / bán</span><i>'+num(t.fnMua[k])+' / '+num(t.fnBan[k])+' tỷ</i></div>'
        :((t.nFnT&&t.nFnT[k])
          ?'<div class="tpr"><span>Khối ngoại ròng <b>tổng</b></span><i class="'+cls(t.fnMuaT[k]-t.fnBanT[k])+'">'+
            ((t.fnMuaT[k]-t.fnBanT[k])>0?'+':'')+num(t.fnMuaT[k]-t.fnBanT[k])+' tỷ</i></div>'+
           '<div class="tpr tp2"><span>gồm cả thoả thuận</span><i>'+num(t.fnMuaT[k])+' / '+num(t.fnBanT[k])+' tỷ</i></div>':''))
      +((t.tdMua&&t.tdMua[k]!=null)
        ?'<div class="tpr"><span>Tự doanh ròng</span><i class="'+cls(t.tdMua[k]-t.tdBan[k])+'">'+
          ((t.tdMua[k]-t.tdBan[k])>0?'+':'')+num(t.tdMua[k]-t.tdBan[k])+' tỷ</i></div>':'')
      +(cs&&cs.c[k]!=null?'<div class="tpr"><span>VN-Index</span><i>'+num2(cs.c[k])+
         (pc==null?'':' <b class="'+cls(pc)+'">'+(pc>0?'+':'')+pc.toFixed(2)+'%</b>')+'</i></div>':'')
      +'<div class="tpr"><span>Số mã có số</span><i>'+num(t.n[k])+'</i></div>'
      +(duPhu(k)?'':'<div class="tpw">kho chưa cào đủ mã — cột thấp vì thiếu dữ liệu, không phải vì ế</div>');
    tip.style.display='block';
    /* Lật sang trái khi gần mép phải, bằng không thẻ tràn khỏi khung và bị xén */
    const W2=wrap.clientWidth, tw=tip.offsetWidth, giua=(c.x0+c.x1)/2;
    tip.style.left=Math.max(0,Math.min(W2-tw, giua-tw/2))+'px';
    tip.style.top=(ep||8)+'px';
  };
  cv.onmousemove=e=>{ const r=cv.getBoundingClientRect(); hien(e.clientX-r.left, e.clientY-r.top+14); };
  cv.onmouseleave=()=>{ if(hl) hl.style.display='none'; if(tip) tip.style.display='none'; };
  /* Màn cảm ứng: chạm và rê cũng ra thẻ. `passive:true` vì không chặn cuộn — đồ thị này
     nằm trong dòng chảy của trang, giành lấy cử chỉ dọc là khoá luôn việc cuộn trang. */
  cv.ontouchstart=cv.ontouchmove=e=>{ const tch=e.touches&&e.touches[0]; if(!tch) return;
    const r=cv.getBoundingClientRect(); hien(tch.clientX-r.left, 8); };
}

/* DÒNG TIỀN KHỐI NGOẠI & TỰ DOANH THEO MÃ — user chốt 21/08/2026: *"chưa thực sự thấy rõ
   là nhóm này mua cổ phiếu nào và bán cổ phiếu nào vào ngày hôm đó"*. Đúng: trang đang nói
   "khối ngoại bán ròng 582 tỷ" mà không nói bán mã nào — con số tổng không dùng được cho
   việc gì ngoài việc biết chiều.

   XẾP THEO RÒNG, KHÔNG XẾP THEO MUA HAY BÁN RIÊNG. Một mã khối ngoại vừa mua 300 tỷ vừa
   bán 290 tỷ thì đứng đầu bảng "mua nhiều nhất" mà thực chất chỉ gom được 10 tỷ — đó là
   sang tay giữa các quỹ chứ không phải dòng tiền vào. Ròng mới là thứ nói được chiều. */
function ptDongTien(r){
  const co=(k1,k2)=>r.filter(x=>x[k1]!=null||x[k2]!=null)
    .map(x=>({sym:x.sym,sec:x.sec,pc:x.pc,rong:(x[k1]||0)-(x[k2]||0),
              mua:x[k1]||0,ban:x[k2]||0}))
    .filter(x=>x.rong);
  const fn=co('fnM','fnB'), td=co('tdM','tdB');
  /* `cq` = số chứng quyền đang lưu hành trên mã đó. CHỈ gắn vào cột TỰ DOANH, không gắn
     vào cột khối ngoại: khối ngoại không phát hành chứng quyền nên nó chẳng nói gì ở đó. */
  const dong=(x,cq)=>{
    const n=cq?((PT.cq||{})[x.sym]||{}).n||0:0;
    return '<div class="dsr" data-sym="'+x.sym+'" title="mua '+ptTien(x.mua)+
      ' · bán '+ptTien(x.ban)+(n?(' · '+n+' chứng quyền đang lưu hành của '+
        (((PT.cq||{})[x.sym]||{}).tc||[]).join(', ')):'')+'"><b>'+esc(x.sym)+
      (n?'<i class="dscq" title="'+n+' chứng quyền đang lưu hành">CQ</i>':'')+'</b>'+
      '<span class="dsn">'+esc(shortName(x.sec||''))+'</span>'+
      '<span class="dsv '+cls(x.rong)+'">'+(x.rong>0?'+':'')+ptTien(x.rong)+'</span></div>';
  };
  const cot=(ic,ten,rows,ghi)=>'<div class="dscol"><h4>'+ptIc(ic)+ten+'</h4>'+
    (rows.length?rows:'<div class="dse">không có mã nào</div>')+
    (ghi?'<p class="dsg">'+ghi+'</p>':'')+'</div>';
  const top=(a,chieu,cq)=>a.slice().sort((x,y)=>chieu*(y.rong-x.rong))
    .filter(x=>chieu>0?x.rong>0:x.rong<0).slice(0,8).map(x=>dong(x,cq)).join('');
  if(!fn.length&&!td.length) return '';
  /* Có bao nhiêu mã trong cột tự doanh mua ròng đang có chứng quyền — con số này quyết
     định câu ghi chú bên dưới nói mạnh tới đâu. Phiên 20/08: 12/12 mã đầu bảng đều có. */
  const tdTop=td.slice().sort((x,y)=>y.rong-x.rong).filter(x=>x.rong>0).slice(0,8);
  const nCQ=tdTop.filter(x=>((PT.cq||{})[x.sym]||{}).n).length;
  return '<div class="panel"><div class="ph">'+ptIc('tien')+'Khối ngoại và tự doanh mua bán gì — phiên '+
    esc(PT.ngay)+'</div><div class="pb"><div class="dsw">'
    +cot('ngoai','Khối ngoại MUA ròng', top(fn,1,0), 'rê chuột để xem mua/bán từng mã')
    +cot('ngoai','Khối ngoại BÁN ròng', top(fn,-1,0), '')
    +cot('bank','Tự doanh MUA ròng', top(td,1,1),
         'tổng tự doanh toàn thị trường — nguồn KHÔNG tách theo công ty chứng khoán')
    +cot('bank','Tự doanh BÁN ròng', top(td,-1,1), '')
    +'</div>'
    /* ĐỌC SỐ TỰ DOANH DÈ DẶT — và nói ra vì sao, ngay cạnh con số. Không có câu này thì
       "tự doanh mua ròng HPG 66 tỷ" đọc ra như công ty chứng khoán đặt cược HPG lên. */
    +(tdTop.length?ptGiai('tdcq','Vì sao con số tự doanh phải đọc dè dặt',
       'Nhãn <b>CQ</b> nghĩa là mã đó đang có <b>chứng quyền lưu hành</b>. Bán chứng quyền '
      +'mua ra thì công ty phát hành <b>buộc phải ôm cổ phiếu cơ sở để phòng hộ</b> — mua vì '
      +'nghĩa vụ, không phải vì quan điểm. Chênh lệch ETF cũng vậy. Phiên này <b>'+nCQ+'/'
      +tdTop.length+'</b> mã đầu bảng tự doanh mua ròng đang có chứng quyền'
      +(nCQ===tdTop.length?' — không sót mã nào.':'.')
      +' Toàn thị trường có <b>'+num(Object.keys(PT.cq||{}).reduce((a,k)=>a+((PT.cq[k].n)||0),0))
      +'</b> chứng quyền trên <b>'+num(Object.keys(PT.cq||{}).length)+'</b> cổ phiếu cơ sở. '
      +'Nguồn không công bố vị thế phòng hộ nên không tách được bao nhiêu phần là phòng hộ; '
      +'mã <b>không</b> có nhãn CQ thì con số tự doanh gần với một quyết định thật hơn.'):'')
    +'</div></div>';
}

/* ================== BỘ LỌC ĐẶC TRƯNG — NGƯỜI DÙNG TỰ ĐẶT TIÊU CHÍ ==================
   Đọc khối `dt`/`dtf` mà `tools/quet_la.py` ghi sẵn vào file phiên: một lát cắt ngang
   toàn thị trường với 22 đại lượng đã tính sẵn ở kho đặc trưng.

   ĐÂY LÀ BỘ ĐO, KHÔNG PHẢI DANH MỤC GỢI Ý — và đó là một ràng buộc pháp lý, không phải
   sở thích thiết kế. Bộ lọc Pro cũ bị gỡ hẳn 16/08/2026 vì nó chấm điểm bằng trọng số
   CỦA CHỦ TRANG rồi cắt lấy 30 mã: dù từng yếu tố đều đo được, thứ người dùng nhận về
   vẫn là *"đây là 30 mã"* — tức khuyến nghị đầu tư, đúng khoản 32 Điều 4 Luật CK 2019.
   Bản này không có điểm tổng hợp, không có trọng số, không có top N mặc định: người dùng
   chọn lọc theo cái gì, ngưỡng bao nhiêu, xếp theo cái nào. Kết quả là của họ.
   ĐỪNG THÊM một nút "chấm điểm tổng hợp" hay một bộ tiêu chí dựng sẵn nào vào đây.

   Mỗi đại lượng kèm CÂU GIẢI THÍCH của chính nó — một cái tên như "Amihud" hay
   "cỡ lệnh mua/bán" mà không nói nghĩa thì bộ lọc chỉ dùng được bởi người đã biết. */
const DTM={
  mval:  {t:'Giá trị khớp lệnh',      d:'tiền thật khớp trong phiên', f:v=>ptTien(v), don:'đồng'},
  mcapFF:{t:'Vốn hoá free float',     d:'phần vốn hoá thực sự mua bán được', f:v=>ptTien(v), don:'đồng'},
  vqf:   {t:'Vòng quay free float',   d:'% cổ phiếu tự do chuyển nhượng đã sang tay trong phiên', f:v=>v.toFixed(3)+'%', don:'%'},
  ami:   {t:'Kém thanh khoản (Amihud)',d:'% giá nhảy trên mỗi tỷ đồng khớp — cao là mã mỏng', f:v=>v.toFixed(4), don:''},
  bd20:  {t:'Biên độ TB 20 phiên',    d:'(cao − thấp) ÷ đóng cửa, trung bình 20 phiên', f:v=>v.toFixed(2)+'%', don:'%'},
  vol20: {t:'Biến động 20 phiên',     d:'độ lệch chuẩn lợi suất ngày', f:v=>v.toFixed(2)+'%', don:'%'},
  gtx:   {t:'Thanh khoản so TB 20',   d:'giá trị hôm nay ÷ trung bình 20 phiên TRƯỚC đó', f:v=>'×'+v.toFixed(2), don:'lần'},
  d52:   {t:'Cách đỉnh 52 tuần',      d:'0% là đang ở đỉnh, −30% là đã rơi 30% khỏi đỉnh', f:v=>v.toFixed(1)+'%', don:'%'},
  r20:   {t:'Lợi suất 20 phiên',      d:'dồn từ % từng phiên nên đã sạch mọi sự kiện quyền', f:v=>v.toFixed(1)+'%', don:'%'},
  r60:   {t:'Lợi suất 60 phiên',      d:'dồn từ % từng phiên', f:v=>v.toFixed(1)+'%', don:'%'},
  clm:   {t:'Cỡ lệnh mua / bán',      d:'log tỉ lệ — dương là bên mua đặt lệnh to hơn', f:v=>v.toFixed(2), don:''},
  cl:    {t:'Cỡ lệnh trung bình',     d:'khối lượng đặt ÷ số lệnh — lệnh to là tổ chức', f:v=>num(Math.round(v)), don:'cp'},
  ep:    {t:'Lợi suất trên giá',      d:'LNST 4 quý ÷ vốn hoá — nghịch đảo P/E, dùng được cả khi lỗ', f:v=>v.toFixed(2)+'%', don:'%'},
  roe:   {t:'ROE',                    d:'lợi nhuận trên vốn chủ sở hữu', f:v=>v.toFixed(1)+'%', don:'%'},
  ngaypt:{t:'Số ngày phải thu',       d:'bán chịu bao lâu mới thu được tiền', f:v=>num(v), don:'ngày'},
  ngaytk:{t:'Số ngày tồn kho',        d:'hàng nằm kho bao lâu', f:v=>num(v), don:'ngày'},
  novayvc:{t:'Nợ vay / vốn chủ',      d:'đòn bẩy tài chính', f:v=>v.toFixed(2), don:'lần'},
  biengop:{t:'Biên lợi nhuận gộp',    d:'', f:v=>v.toFixed(1)+'%', don:'%'},
  fnr20: {t:'Khối ngoại ròng 20 phiên',d:'cộng dồn mua trừ bán', f:v=>ptTien(v), don:'đồng'},
  fnp:   {t:'% phiên là khối ngoại',  d:'(mua + bán) ÷ 2 ÷ giá trị khớp lệnh', f:v=>v.toFixed(1)+'%', don:'%'},
  room:  {t:'Room ngoại còn',         d:'0% là hết room; mã nguồn không biết trần thì để trống', f:v=>v.toFixed(2)+'%', don:'%'},
  shu:   {t:'Sở hữu nước ngoài',      d:'', f:v=>v.toFixed(1)+'%', don:'%'},
  ttp:   {t:'Tỉ trọng thoả thuận',    d:'giá trị thoả thuận ÷ giá trị khớp lệnh', f:v=>v.toFixed(2), don:'lần'},
  ff:    {t:'Free float',             d:'% cổ phiếu tự do chuyển nhượng', f:v=>v.toFixed(1)+'%', don:'%'},
  pc:    {t:'% thay đổi phiên',       d:'', f:v=>(v>0?'+':'')+v.toFixed(2)+'%', don:'%'},
};
/* Ba dòng điều kiện là đủ: bốn dòng trở lên thì gần như lượt lọc nào cũng ra rỗng, mà
   rỗng thì không học được gì về dữ liệu. */
const LOC={dk:[{k:'mval',op:'>=',v:''},{k:'',op:'>=',v:''},{k:'',op:'>=',v:''}],
           sap:'mval', chieu:-1, hien:['vqf','d52','ep','roe']};

function ptLocDL(p){
  if(!p||!p.dt||!p.dtf||!p.bang) return null;
  const ix={}; p.dtf.forEach((k,i)=>ix[k]=i);
  const bx={}; (p.f||[]).forEach((k,i)=>bx[k]=i);
  const r=[];
  for(const sym in p.bang){
    const b=p.bang[sym], dt=p.dt[sym]; if(!dt) continue;
    const c=b[bx['c']], tc=b[bx['tc']];
    const x={sym, ten:'', sec:b[bx['sec']]||'', ex:b[bx['ex']]||'', ff:b[bx['ff']],
             c, mval:b[bx['mval']], pc:(c&&tc)?((c/tc-1)*100):null};
    for(const k in ix) x[k]=dt[ix[k]];
    r.push(x);
  }
  return r;
}
function ptBoLoc(p){
  const r=ptLocDL(p); if(!r) return '';
  const opt=(sel,rong)=>(rong?'<option value="">— chọn đại lượng —</option>':'')
    +Object.keys(DTM).map(k=>'<option value="'+k+'"'+(k===sel?' selected':'')+'>'+DTM[k].t+'</option>').join('');
  const dong=(d,i)=>'<div class="lcr"><select class="lck" data-i="'+i+'">'+opt(d.k,1)+'</select>'
    +'<select class="lco" data-i="'+i+'"><option value=">="'+(d.op==='>='?' selected':'')+'>≥</option>'
      +'<option value="<="'+(d.op==='<='?' selected':'')+'>≤</option></select>'
    +'<input class="lcv" data-i="'+i+'" value="'+esc(d.v)+'" placeholder="ngưỡng">'
    +'<span class="lcd">'+(d.k?esc(DTM[d.k].don||''):'')+'</span></div>';
  return '<div class="panel"><div class="ph">'+ptIc('bang')+'Bộ lọc đặc trưng — phiên '+esc(PT.ngay)
    +'<span class="cnt" id="lcN">'+num(r.length)+' mã</span></div><div class="pb">'
    +ptGiai('boloc','Bộ lọc này là gì và không phải là gì',
       'Đây là <b>bộ đo</b>: bạn chọn lọc theo đại lượng nào, ngưỡng bao nhiêu, xếp theo cái gì. '
      +'Trang <b>không</b> chấm điểm tổng hợp, không có bộ tiêu chí dựng sẵn và không đề xuất mã nào — '
      +'mọi con số ở đây là thống kê mô tả quá khứ, tính thẳng từ số chốt phiên và báo cáo đã công bố. '
      +'Chỉ tiêu cơ bản (ROE, lợi suất trên giá, số ngày phải thu…) gắn theo <b>ngày công bố báo cáo</b> '
      +'chứ không theo ngày chốt quý, nên phiên nào cũng chỉ thấy thứ thị trường đã biết vào đúng phiên đó.')
    +'<div class="lcw" id="lcW">'+LOC.dk.map(dong).join('')+'</div>'
    +'<div class="lcbar"><span>xếp theo</span><select id="lcS">'+opt(LOC.sap,0)+'</select>'
      +'<button id="lcD" class="ptnav" title="đổi chiều xếp">'+ptIc(LOC.chieu<0?'xuong':'len')+'</button>'
      +'<button id="lcX" class="lcbtn">xoá bộ lọc</button></div>'
    +'<div class="pttw" id="lcT"></div></div></div>';
}
function ptLocVe(p){
  const w=$('#lcT'); if(!w) return;
  let r=ptLocDL(p)||[];
  for(const d of LOC.dk){
    if(!d.k||d.v==='') continue;
    const v=parseFloat(String(d.v).replace(/,/g,''));
    if(isNaN(v)) continue;
    r=r.filter(x=>x[d.k]!=null&&(d.op==='>='?x[d.k]>=v:x[d.k]<=v));
  }
  const k=LOC.sap;
  r.sort((a,b)=>{ const x=a[k],y=b[k];
    if(x==null&&y==null) return 0; if(x==null) return 1; if(y==null) return -1;
    return LOC.chieu*(x-y); });
  const nn=$('#lcN'); if(nn) nn.textContent=num(r.length)+' mã';
  /* Cột hiện ra = mấy đại lượng ĐANG LỌC cộng với cột đang xếp. Bày cứng một bộ cột thì
     lọc theo ROE xong lại không thấy cột ROE đâu — phải tự nhớ mình vừa lọc cái gì. */
  const cot=[]; const them=x=>{ if(x&&cot.indexOf(x)<0) cot.push(x); };
  LOC.dk.forEach(d=>them(d.k)); them(LOC.sap); LOC.hien.forEach(them);
  const th='<th>Mã</th><th>Sàn</th><th class="r">Giá</th><th class="r">±%</th>'
    +cot.slice(0,7).map(c=>'<th class="r">'+esc(DTM[c].t)+'</th>').join('');
  const body=r.slice(0,300).map(x=>'<tr data-sym="'+x.sym+'"><td><b>'+esc(x.sym)+'</b></td>'
    +'<td>'+esc(x.ex)+'</td><td class="r">'+num(x.c)+'</td>'
    +'<td class="r '+(x.pc==null?'':cls(x.pc))+'">'+(x.pc==null?'—':(x.pc>0?'+':'')+x.pc.toFixed(2)+'%')+'</td>'
    +cot.slice(0,7).map(c=>'<td class="r">'+(x[c]==null?'—':DTM[c].f(x[c]))+'</td>').join('')
    +'</tr>').join('');
  w.innerHTML='<table class="pttb"><thead><tr>'+th+'</tr></thead><tbody>'
    +(body||'<tr><td colspan="11"><div class="empty">Không mã nào thoả — nới ngưỡng lại.</div></td></tr>')
    +'</tbody></table>'+(r.length>300?'<p class="ptbarn ptdu">Hiện 300 mã đầu — còn '+num(r.length-300)+' mã nữa.</p>':'');
  $$('#lcT tr[data-sym]').forEach(t=>{ t.onclick=()=>ptMoMa(t.dataset.sym); });
}
function ptLocBind(p){
  const w=$('#lcW'); if(!w) return;
  $$('#lcW .lck').forEach(e=>{ e.onchange=()=>{ LOC.dk[+e.dataset.i].k=e.value;
    const d=e.parentNode.querySelector('.lcd'); if(d) d.textContent=e.value?(DTM[e.value].don||''):'';
    ptLocVe(p); }; });
  $$('#lcW .lco').forEach(e=>{ e.onchange=()=>{ LOC.dk[+e.dataset.i].op=e.value; ptLocVe(p); }; });
  $$('#lcW .lcv').forEach(e=>{ e.oninput=()=>{ clearTimeout(LOC._t);
    LOC._t=setTimeout(()=>{ LOC.dk[+e.dataset.i].v=e.value.trim(); ptLocVe(p); },250); }; });
  const ss=$('#lcS'); if(ss) ss.onchange=()=>{ LOC.sap=ss.value; ptLocVe(p); };
  const dd=$('#lcD'); if(dd) dd.onclick=()=>{ LOC.chieu=-LOC.chieu;
    dd.innerHTML=ptIc(LOC.chieu<0?'xuong':'len'); ptLocVe(p); };
  const xx=$('#lcX'); if(xx) xx.onclick=()=>{ LOC.dk.forEach(d=>{ d.k=''; d.v=''; });
    LOC.dk[0].k='mval'; ptBang(); };
  ptLocVe(p);
}

/* QUÉT BẤT THƯỜNG — "phiên này có gì lạ". Đọc khối `la` mà `tools/quet_la.py` ghi sẵn
   vào chính file phiên, nên đổi phiên là quét đổi theo mà không tốn thêm lượt tải nào.

   VÌ SAO KHỐI NÀY ĐỨNG ĐẦU, TRÊN CẢ DÒNG TIỀN VÀ ĐIỂM SÁNG: hai khối kia trả lời "mã nào
   to nhất, tiền chảy đi đâu" — câu hỏi của người đã biết mình tìm gì. Khối này trả lời
   "có chuyện gì tôi chưa thấy", và đó là câu duy nhất mà một bảng 1.525 dòng không bao
   giờ trả lời được, vì thứ bất thường nằm lẫn trong đó chứ không nổi lên.

   MÔ TẢ SỰ KIỆN ĐÃ XẢY RA, KHÔNG SUY DIỄN. Mỗi dòng là một con số đo được ("thoả thuận
   khớp thấp hơn giá sàn 26%"), không kèm một chữ nào về nên làm gì — xem mục Ranh giới
   pháp lý trong CLAUDE.md. */
const QL=[
  ['thoathuan','tay','Thoả thuận lệch xa giá sàn',
   'sang tay lô lớn ở giá thương lượng, từ 20 tỷ và lệch từ 10%',
   x=>ptTien(x.pval), x=>x.ttl, x=>(x.ttl>0?'+':'')+x.ttl.toFixed(1)+'% so giá sàn'],
  ['slcp','nganh','Số cổ phiếu vừa nhảy bậc',
   'phát hành thêm · chia thưởng · chuyển đổi — từ 5% trong một phiên',
   x=>(x.dsh>0?'+':'')+x.dsh.toFixed(1)+'%', x=>x.dsh, null],
  ['dotbien','len','Đột biến thanh khoản',
   'giá trị khớp lệnh so với trung bình 20 phiên TRƯỚC đó',
   x=>'×'+x.gtx.toFixed(1), x=>x.pc, x=>ptTien(x.mval)],
  ['doidau','tien','Khối ngoại và tự doanh đối đầu',
   'hai nhóm đi ngược chiều trên cùng một mã, mỗi bên từ 5 tỷ',
   x=>((x.fnr>0?'NN +':'NN ')+ptTien(x.fnr)), x=>x.fnr,
   x=>(x.tdr>0?'TD +':'TD ')+ptTien(x.tdr)],
  ['room','ngoai','Room ngoại gần cạn',
   'khối ngoại gần như không mua thêm được nữa',
   x=>x.room.toFixed(2)+'%', x=>x.pc, x=>ptTien(x.mval)],
  ['dinh','sang','Đang ở đỉnh 52 tuần',
   'vị trí giá kèm tiền vào — là phép đo, không phải nhận định',
   x=>x.d52.toFixed(1)+'%', x=>x.pc, x=>'×'+x.gtx.toFixed(1)+' thanh khoản'],
  ['noibo','ngoai','Người nội bộ vừa mua / bán',
   'công bố theo Điều 127 Luật CK — ghép với cột thoả thuận là ra bức tranh đủ',
   x=>(x.chieu==='bán'?'bán ':'mua ')+num(x.sl)+' CP', x=>(x.chieu==='bán'?-1:1),
   x=>esc(x.chuc||'')],
  ['colenh','bang','Cỡ lệnh hai bên lệch mạnh',
   'khối lượng đặt chia cho SỐ LỆNH — lệnh to là tổ chức, nhỏ là cá nhân',
   x=>(x.clm>0?'mua to hơn':'bán to hơn'), x=>x.clm,
   x=>'×'+Math.exp(Math.abs(x.clm)).toFixed(1)],
];
function ptQuetLa(p){
  const q=p&&p.la; if(!q||!q.muc) return '';
  const cot=QL.map(([k,ic,ten,ghi,chinh,mau,phu])=>{
    const rows=q.muc[k]||[]; if(!rows.length) return '';
    return '<div class="dscol"><h4>'+ptIc(ic)+ten+'</h4>'
      +rows.slice(0,8).map(x=>'<div class="dsr" data-sym="'+x.sym+'" title="'+
          esc(x.ten||'')+(x.gt?(' — ước '+ptTien(x.gt)):'')+'">'
        +'<b>'+esc(x.sym)+'</b>'
        +'<span class="dsn">'+(phu?phu(x):esc(shortName(x.sec||'')))+'</span>'
        +'<span class="dsv '+(mau?cls(mau(x)):'')+'">'+chinh(x)+'</span></div>').join('')
      +'<p class="dsg">'+ghi+'</p></div>';
  }).join('');
  if(!cot) return '';
  return '<div class="panel"><div class="ph">'+ptIc('info')+'Phiên này có gì lạ — '+esc(q.ngay)
    +'<span class="cnt">'+num(q.n)+' mã có khớp lệnh</span></div><div class="pb">'
    +ptGiai('quetla','Mấy bảng này đọc thế nào',
       'Đây là <b>mô tả sự kiện đã xảy ra</b>, đo thẳng từ số chốt phiên — không phải nhận '
      +'định và không phải gợi ý. Mọi bảng đều lọc mã khớp dưới 1 tỷ đồng: không lọc thì '
      +'đầu bảng toàn mã đổi chủ vài lô, nhảy trần đều đặn và đẩy hết thứ đáng đọc xuống dưới.')
    +'<div class="dsw">'+cot+'</div></div></div>';
}

/* ĐIỂM SÁNG TRONG NGÀY — user chốt 20/08/2026: *"cách sắp xếp dữ liệu đang khó nhìn làm tao
   không thể biết được điểm sáng nào trong ngày"*. Đúng: một bảng 1.525 dòng xếp theo giá trị
   trả lời được "mã nào to nhất" nhưng KHÔNG trả lời được "phiên này có gì đáng chú ý".
   Năm câu hỏi, mỗi câu một cột, đọc hết trong một màn.

   NGƯỠNG THANH KHOẢN LÀ BẮT BUỘC ở hai cột tăng/giảm. Không lọc thì đầu bảng toàn mã khớp
   vài trăm cổ phiếu nhảy kịch trần — đúng thứ nhiễu mà user vừa bảo bỏ ở cột đặt lệnh.
   5 tỷ là mức một lệnh cá nhân lớn cũng không đẩy nổi. */
const DS_MIN=5e9;
function ptDiemSang(r){
  const co=r.filter(x=>x.mval>=DS_MIN);
  const dong=(x,ph)=>'<div class="dsr" data-sym="'+x.sym+'"><b>'+esc(x.sym)+'</b>'+
    '<span class="dsn">'+esc(shortName(x.sec||''))+'</span>'+
    '<span class="dsv '+(x.pc==null?'':cls(x.pc))+'">'+ph+'</span></div>';
  const cot=(ic,ten,ghi,rows)=>'<div class="dscol"><h4>'+ptIc(ic)+ten+'</h4>'+
    (rows.length?rows:'<div class="dse">không có mã nào</div>')+
    (ghi?'<p class="dsg">'+ghi+'</p>':'')+'</div>';

  const tien=r.slice().sort((a,b)=>b.mval-a.mval).slice(0,8)
    .map(x=>dong(x, ptTien(x.mval))).join('');
  const tang=co.filter(x=>x.pc!=null).sort((a,b)=>b.pc-a.pc).slice(0,8)
    .map(x=>dong(x,(x.pc>0?'+':'')+x.pc.toFixed(2)+'%')).join('');
  const giam=co.filter(x=>x.pc!=null).sort((a,b)=>a.pc-b.pc).slice(0,8)
    .map(x=>dong(x,x.pc.toFixed(2)+'%')).join('');
  const tt=r.filter(x=>x.pval>0).sort((a,b)=>b.pval-a.pval).slice(0,8)
    .map(x=>dong(x, ptTien(x.pval))).join('');

  /* Ngành: cộng giá trị khớp lệnh, kèm số mã tăng/giảm để biết cả ngành đi cùng chiều hay
     chỉ một mã đầu tàu kéo. Tổng tiền mà không có độ rộng thì đọc nhầm rất dễ. */
  const ng={};
  for(const x of r){ if(!x.sec) continue;
    const g=ng[x.sec]||(ng[x.sec]={v:0,u:0,d:0,n:0});
    g.v+=x.mval; g.n++; if(x.pc>0) g.u++; else if(x.pc<0) g.d++; }
  const tongV=r.reduce((a,b)=>a+b.mval,0)||1;
  const nganh=Object.keys(ng).sort((a,b)=>ng[b].v-ng[a].v).slice(0,8).map(k=>{
    const g=ng[k];
    return '<div class="dsr dsr2"><b class="dsnn">'+esc(shortName(k))+'</b>'+
      '<span class="dsn">'+g.u+'▲ '+g.d+'▼</span>'+
      '<span class="dsv">'+ptTien(g.v)+'<i>'+(g.v/tongV*100).toFixed(1)+'%</i></span></div>';
  }).join('');

  return '<div class="panel"><div class="ph">'+ptIc('sang')+'Điểm sáng phiên '+esc(PT.ngay)+
    '</div><div class="pb"><div class="dsw">'
    +cot('xu','Hút tiền nhất','', tien)
    +cot('len','Tăng mạnh nhất','lọc mã khớp từ '+ptTien(DS_MIN)+' trở lên', tang)
    +cot('xuong','Giảm mạnh nhất','lọc mã khớp từ '+ptTien(DS_MIN)+' trở lên', giam)
    +cot('tay','Thoả thuận lớn nhất','giao dịch ngoài sổ lệnh', tt)
    +cot('nganh','Ngành hút tiền','▲▼ = số mã tăng/giảm trong ngành', nganh)
    +'</div></div></div>';
}

/* ============================ PHÂN TÍCH MỘT MÃ (3 tháng) ============================
   Bấm một mã ở bảng hoặc ở khối Điểm sáng -> mở hẳn một trang con cho mã đó. Dữ liệu đọc
   THẲNG `data/giaodich/{MÃ}.json` — không cần dựng thêm file gộp nào, và file một mã ở độ
   sâu 100 phiên chỉ vài chục KB.

   BỘ VẼ DÙNG CHUNG `ptVe1()` cho mọi đồ thị nhỏ. Sáu đồ thị mà mỗi cái một đoạn canvas
   riêng là sáu chỗ phải sửa mỗi lần đổi bảng màu hay đổi cách chia trục. */
function ptVe1(cv, cfg){
  if(!cv) return;
  const dpr=devicePixelRatio||1, W=cv.clientWidth||600, H=cfg.cao||150;
  cv.width=W*dpr; cv.height=H*dpr; cv.style.height=H+'px';
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
  /* DÒ CHỦ ĐỀ BẰNG `isLight()`, ĐỪNG DÒ BẰNG `classList`. Trang đặt chủ đề vào
     `document.documentElement.dataset.theme` (xem đoạn inline đầu congcu.html và nút đổi
     đèn), KHÔNG bao giờ gắn class `theme-dark`/`theme-light` — nên nhánh classList cũ
     LUÔN sai và cả biểu thức rơi về `prefers-color-scheme` của hệ điều hành. Hậu quả đo
     được: máy để hệ điều hành TỐI mà bấm trang sang SÁNG thì đồ thị vẫn vẽ bảng màu tối
     lên nền sáng, và ngược lại. Im lặng hoàn toàn vì trên máy có OS và trang cùng chế độ
     thì nó lại đúng — chỉ hỏng đúng nhóm người dùng đổi đèn thủ công. */
  const dark=!isLight();
  const cg=dark?'rgba(148,163,184,.20)':'rgba(100,116,139,.16)', ct=dark?'#94a3b8':'#64748b';
  const S=cfg.series.filter(x=>x&&x.v);
  if(!S.length) return;
  const n=cfg.d.length;
  let lo=Infinity, hi=-Infinity;
  for(const s of S) for(let i=0;i<n;i++){ const v=cfg.chong?S.reduce((a,x)=>a+(x.v[i]||0),0):s.v[i];
    if(v!=null&&!isNaN(v)){ lo=Math.min(lo,v); hi=Math.max(hi,v); } }
  if(!(hi>-Infinity)) return;
  /* Đồ thị CỘT phải CHỨA MỐC 0 — cột mà không từ 0 thì tỉ lệ chiều cao nói dối.
     Nhưng ghim `lo=0` thì cột ÂM biến mất: đồ thị "% thay đổi mỗi phiên" chỉ còn phiên
     tăng, đọc ra như mã chỉ có lên chứ không có xuống. Nên lấy `min(0, …)`/`max(0, …)`
     và vẽ từ ĐƯỜNG 0 ra hai phía.
     Đồ thị ĐƯỜNG (giá, vốn hoá) thì không kéo về 0: kéo về là mọi biến động thành vạch phẳng. */
  if(cfg.kieu!=='line'){ lo=Math.min(0,lo); hi=Math.max(0,hi); }
  else { const b=(hi-lo)*0.10||1; lo-=b; hi+=b; }
  if(hi<=lo) hi=lo+1;
  g.font='10px system-ui,sans-serif';
  /* TRỤC PHẢI (`cfg.phai`) — cho đồ thị GỘP cột-tiền với đường-giá. Hai đại lượng khác
     đơn vị hoàn toàn, ép chung một trục là một trong hai bẹp dí; và trục phải KHÔNG kéo
     về 0 (giá dao động quanh một mức cao, kéo về 0 là đường thẳng đơ). Cùng cách
     `ptVeChart` đã làm với VN-Index. */
  const P2=cfg.phai&&cfg.phai.series?cfg.phai.series.filter(x=>x&&x.v):null;
  let lo2=Infinity, hi2=-Infinity;
  if(P2&&P2.length){
    for(const s2 of P2) for(let i=0;i<n;i++){ const v=s2.v[i];
      if(v!=null&&!isNaN(v)){ lo2=Math.min(lo2,v); hi2=Math.max(hi2,v); } }
    if(hi2>lo2){ const b2=(hi2-lo2)*0.10; lo2-=b2; hi2+=b2; }
    else if(hi2>-Infinity){ lo2=hi2*0.98; hi2=hi2*1.02; }
  }
  const coP2=P2&&P2.length&&hi2>lo2;
  const nhanP=v=>cfg.phai&&cfg.phai.nhan?cfg.phai.nhan(v):num(v);
  const padL=Math.ceil(g.measureText(cfg.nhan?cfg.nhan(hi):num(hi)).width)+8, padB=14, padT=6;
  const padR=coP2?Math.ceil(g.measureText(nhanP(hi2)).width)+8:0;
  const plotH=H-padB-padT, plotW=W-padL-padR;
  const y=v=>padT+plotH-(v-lo)/(hi-lo)*plotH;
  g.strokeStyle=cg; g.lineWidth=1; g.fillStyle=ct; g.textAlign='right'; g.textBaseline='middle';
  for(let k=0;k<=3;k++){ const v=lo+(hi-lo)*k/3, yy=y(v);
    g.beginPath(); g.moveTo(padL,yy+.5); g.lineTo(W-padR,yy+.5); g.stroke();
    g.fillText(cfg.nhan?cfg.nhan(v):num(v), padL-4, yy); }
  if(coP2){
    g.textAlign='left';
    for(let k=0;k<=3;k++){ const v=lo2+(hi2-lo2)*k/3;
      g.fillText(nhanP(v), W-padR+4, padT+plotH-(v-lo2)/(hi2-lo2)*plotH); }
    g.textAlign='right';
  }
  const gap=plotW/n, bw=Math.max(1,gap*0.7);
  if(cfg.kieu==='line'){
    for(const s of S){ g.strokeStyle=s.mau; g.lineWidth=1.8; g.beginPath(); let dau=true;
      for(let i=0;i<n;i++){ const v=s.v[i]; if(v==null||isNaN(v)){ dau=true; continue; }
        const x=padL+i*gap+gap/2; if(dau){ g.moveTo(x,y(v)); dau=false; } else g.lineTo(x,y(v)); }
      g.stroke(); }
  } else {
    const y0=y(0);
    if(lo<0){ g.strokeStyle=ct; g.lineWidth=1; g.beginPath();
      g.moveTo(padL,y0+.5); g.lineTo(W,y0+.5); g.stroke(); }
    for(let i=0;i<n;i++){ let day=0;
      for(const s of S){ const v=s.v[i]; if(v==null||isNaN(v)||!v) continue;
        g.fillStyle=(s.mauAm&&v<0)?s.mauAm:s.mau;
        const a=y(day), b=y(day+v);
        g.fillRect(padL+i*gap+(gap-bw)/2, Math.min(a,b), bw, Math.max(1,Math.abs(b-a)));
        if(cfg.chong) day+=v; } }
  }
  if(coP2){
    const y2=v=>padT+plotH-(v-lo2)/(hi2-lo2)*plotH;
    for(const s2 of P2){
      g.strokeStyle=s2.mau; g.lineWidth=1.8; g.beginPath(); let dau=true;
      for(let i=0;i<n;i++){ const v=s2.v[i];
        if(v==null||isNaN(v)){ dau=true; continue; }
        const x=padL+i*gap+gap/2;
        if(dau){ g.moveTo(x,y2(v)); dau=false; } else g.lineTo(x,y2(v)); }
      g.stroke();
    }
  }
  /* MỐC ĐÁNH DẤU DÙNG CHUNG cho cả sáu đồ thị. User chốt 20/08/2026: bấm một cột ở đồ thị
     khối lượng thì phải thấy luôn giá đóng cửa và % của chính phiên đó ở các đồ thị khác —
     sáu đồ thị mà mỗi cái một mốc riêng thì phải tự dóng bằng mắt qua trục ngày. */
  if(cfg.moc!=null&&cfg.moc>=0&&cfg.moc<n){
    const x=padL+cfg.moc*gap+gap/2;
    /* ĐÃ GHIM thì vẽ NÉT LIỀN, dày hơn, kèm tam giác trên đỉnh. Nét đứt = mốc đang chạy
       theo chuột, nét liền = mốc đứng yên. Không phân biệt được hai trạng thái thì bấm
       xong không biết mình đã ghim hay chưa, mà đó đúng là câu hỏi duy nhất lúc đó. */
    g.strokeStyle=dark?'rgba(244,63,94,.9)':'rgba(225,29,72,.8)';
    g.lineWidth=cfg.ghim?2:1.5;
    if(!cfg.ghim) g.setLineDash([3,3]);
    g.beginPath(); g.moveTo(x,padT); g.lineTo(x,padT+plotH); g.stroke(); g.setLineDash([]);
    if(cfg.ghim){
      g.fillStyle=g.strokeStyle;
      g.beginPath(); g.moveTo(x-4,padT); g.lineTo(x+4,padT); g.lineTo(x,padT+5); g.fill();
    }
  }
  g.fillStyle=ct; g.textAlign='left'; g.textBaseline='top';
  g.fillText(cfg.d[0], padL, H-12);
  g.textAlign='right'; g.fillText(cfg.d[n-1], W-padR, H-12);
  if(cfg.chon){
    const chi=e=>{ const r=cv.getBoundingClientRect();
      const i=Math.floor((e.clientX-r.left-padL)/gap);
      return (i>=0&&i<n)?i:null; };
    cv.style.cursor='crosshair';
    cv.onmousemove=e=>{ const i=chi(e); if(i!=null) cfg.chon(i); };
    cv.onclick=e=>{ const i=chi(e); if(i!=null) cfg.chon(i,true); };
    cv.ontouchstart=cv.ontouchmove=e=>{ const t2=e.touches&&e.touches[0]; if(!t2) return;
      const r=cv.getBoundingClientRect(), i=Math.floor((t2.clientX-r.left-padL)/gap);
      if(i>=0&&i<n) cfg.chon(i); };
  }
}

async function ptMoMa(sym){
  PT.ma=sym; PT.maD=null; PT.maI=null; PT.ghim=null;
  await ptVe();
  try{ PT.maD=await (await fetch('data/giaodich/'+sym+'.json')).json(); }
  catch(e){ PT.maD={err:1}; }
  ptVeMa();
}

function ptVeMa(){
  const w=$('#ptTab'); if(!w||!PT.ma) return;
  const o=PT.maD;
  const dau='<div class="ptmahead"><button id="ptQuay" class="ptnav" title="Quay lại bảng phiên">'+
    ptIc('ve')+'</button>'+
    '<h2>'+esc(PT.ma)+'</h2><span class="ptbarn">phân tích '+PT.nMa+' phiên gần nhất</span>'+
    '<a class="ptlink" href="/cophieu/'+esc(PT.ma)+'">mở trang cổ phiếu →</a></div>';
  if(!o){ w.innerHTML=dau+'<div class="panel"><div class="pb"><div class="empty">Đang nạp…</div></div></div>'; ptBindMa(); return; }
  if(o.err||!o.d||!o.d.length){
    w.innerHTML=dau+'<div class="panel"><div class="pb"><div class="empty">Mã này chưa có trong kho giao dịch.</div></div></div>';
    ptBindMa(); return; }
  const n=o.n||o.d.length, i0=Math.max(0,n-PT.nMa);
  const lay=k=>(o[k]||[]).slice(i0);
  const d=o.d.slice(i0), c=lay('c'), tc=lay('tc'), vwN=lay('vwap'),
        op=lay('o'), hi=lay('h'), lo=lay('l'),
        mval=lay('mval'), pval=lay('pval'), mv=lay('mv'), pv=lay('pv'), sh=lay('sh'),
        fnM=lay('fnMuaGT'), fnB=lay('fnBanGT'), fnMK=lay('fnMuaKL'), fnBK=lay('fnBanKL'),
        fnSH=lay('fnSoHuu'), fnRO=lay('fnRoom'),
        tdM=lay('tdMuaGT'), tdB=lay('tdBanGT');
  /* Giá bình quân của RIÊNG thoả thuận. Để `null` khi phiên không có thoả thuận — vẽ 0 thì
     đường tụt thẳng xuống đáy, đọc ra như giá sập trong khi thực ra hôm đó không có lệnh nào. */
  const ptt=pval.map((x,i)=>(x&&pv[i])?(x/pv[i]):null);
  /* GIÁ KHỚP LỆNH TRUNG BÌNH = GIÁ TRỊ ÷ KHỐI LƯỢNG, tự tính, KHÔNG lấy `AvrPrice` của
     nguồn. Hai số này khớp nhau ở phần lớn kho (đo 100.536 ô: trung vị lệch 0,000%,
     91,9% nằm trong 0,5%) nhưng lệch hẳn ở phiên biến động mạnh — PNJ 08/07/2026 nguồn
     ghi 49.262 trong khi GT/KL ra 48.579, lệch 1,39%. Lấy GT/KL vì nó ĐỊNH NGHĨA ra
     chính nó và tự nhất quán với hai con số nằm ngay cạnh trên màn hình: người xem cộng
     trừ lại được. Còn `AvrPrice` thì không truy được cách nguồn tính. */
  const vw=mval.map((x,i)=>(x&&mv[i])?(x/mv[i]):null);
  const m=d.length-1;
  const mcap=c.map((x,i)=>(x&&sh[i])?x*sh[i]:null);
  const pcs=c.map((x,i)=>(x&&tc[i])?((x/tc[i]-1)*100):null);
  const fnRong=fnM.map((x,i)=>(x==null&&fnB[i]==null)?null:((x||0)-(fnB[i]||0)));
  const tdRong=tdM.map((x,i)=>(x==null&&tdB[i]==null)?null:((x||0)-(tdB[i]||0)));
  /* % giá trị phiên là của khối ngoại — tính trên (mua+bán)/2 so với giá trị khớp lệnh,
     vì một cổ phiếu khối ngoại mua từ khối ngoại khác thì đếm cả hai vế là đếm hai lần. */
  const fnPc=mval.map((x,i)=>(x&&(fnM[i]!=null||fnB[i]!=null))
    ?(((fnM[i]||0)+(fnB[i]||0))/2/x*100):null);
  if(PT.maI==null||PT.maI>m) PT.maI=m;
  const k=PT.maI;
  /* `doi` `tbGT` `tongTT` `tongKL` `fnRongTong` `tdRongTong` ĐÃ XOÁ 22/08/2026 cùng
     hàng ô tổng hợp — chúng chỉ phục vụ mấy ô đó. Muốn dựng lại thì tính lại, đừng để
     sáu biến chết nằm đây rồi lần sau có người tưởng chúng đang được dùng. */
  const ph=(v)=>v==null?'—':'<b class="'+cls(v)+'">'+(v>0?'+':'')+v.toFixed(2)+'%</b>';
  /* VÙNG GIÁ PHẢI LÀ CỦA PHIÊN ĐANG CHỌN Ở CHÍNH TRANG MÃ NÀY (`d[k]`), KHÔNG PHẢI
     `PT.ngay` của thanh chọn trên đầu — bẫy đã dính: ghim phiên 08/07 trên đồ thị mã mà
     đồ thị vùng giá vẫn vẽ phiên 20/08, im lặng hoàn toàn vì cả hai đều là "một phiên
     nào đó" nên nhìn không ra. Đây đúng là chỗ trả lời câu "khối lượng khớp ở giá nào",
     mà nó lại trả lời về một ngày khác. */
  const ngVG=d[k];
  /* PHẢI TỰ TẢI FILE PHIÊN CỦA NGÀY ĐANG GHIM. `PT.phien` chỉ chứa những phiên người
     dùng đã mở qua THANH CHỌN ở đầu trang — mà ghim một phiên trên đồ thị mã thì không
     đi qua đường đó, nên bộ đệm rỗng và đồ thị vùng giá báo "chưa cào" trong khi kho có
     đủ. Im lặng và rất dễ tin nhầm thành thiếu dữ liệu.
     `ptPhien` tự đệm (kể cả khi hỏng thì đệm `null`) nên nhánh này chạy ĐÚNG MỘT LẦN cho
     mỗi ngày — không có vòng lặp vô tận. */
  if(PT.phien[ngVG]===undefined){ ptPhien(ngVG).then(()=>{ if(PT.ma&&d[PT.maI]===ngVG) ptVeMa(); }); }
  const vg=(PT.phien[ngVG]&&PT.phien[ngVG].ma&&PT.phien[ngVG].ma[PT.ma])||null;
  /* Chú thích phải NÓI RA MỨC GIÁ HÚT NHIỀU NHẤT, đừng bắt người ta soi cột cao nhất rồi
     tự dóng xuống trục. PNJ 08/07/2026: 44,1% khối lượng khớp ở ĐÚNG 49.800 trong khi
     đóng cửa 52.000 — con số đó mới là câu trả lời cho "khớp ở giá nào", chứ không phải
     hình dạng cái đồ thị. */
  let vgGhi='phiên này chưa cào vùng giá cho mã này — kho vùng giá lấy riêng từng phiên';
  if(vg&&vg.v&&vg.v.length){
    const tg=vg.v.reduce((a,b)=>a+b,0);
    let mi=0; for(let z=1;z<vg.v.length;z++) if(vg.v[z]>vg.v[mi]) mi=z;
    vgGhi='khối lượng gộp theo từng mức giá · <b>hút nhiều nhất '+num(vg.p[mi])+'đ</b> với '
      +num(vg.v[mi])+' cp = <b>'+(tg?(vg.v[mi]/tg*100).toFixed(1):'—')+'%</b> khối lượng phiên';
  }
  /* HÀNG Ô TỔNG HỢP ĐÃ XOÁ 22/08/2026 (user chốt: *"xoá cái này ở mỗi cổ phiếu phân
     tích luôn, tao cần giá theo phiên"*). Bảy ô đó in số của CẢ KHUNG — "so 1 tháng",
     "so 63 phiên", "GT khớp lệnh TB", "khối ngoại ròng cả khung" — trong khi cả trang
     này xoay quanh MỘT PHIÊN đang chọn/đang ghim. Hai loại kỳ khác nhau nằm chồng lên
     nhau ở đầu trang là đọc nhầm rất dễ: thấy "−461 tỷ" tưởng của phiên đang xem.
     Thứ duy nhất trong đó là số THEO PHIÊN — tỉ lệ sở hữu nước ngoài — đã chuyển vào
     đúng ô Khối ngoại của thanh đọc số. */
  w.innerHTML=dau
    /* THANH ĐỌC SỐ CỦA PHIÊN ĐANG CHỌN — đứng NGAY TRÊN lưới đồ thị, không nhét xuống dưới:
       rê chuột trên đồ thị mà số hiện ở cuối trang thì mắt phải nhảy đi nhảy lại. */
    +'<div class="ptdoc" id="ptDoc"></div>'
    +'<div class="ptbieu">'
      /* GỘP GIÁ VÀ TIỀN LÀM MỘT (user chốt 22/08/2026). Hai đồ thị rời thì phải tự dóng
         bằng mắt qua trục ngày để hỏi câu duy nhất người ta hỏi ở đây: *phiên tiền vào
         nhiều là phiên giá đi đâu*. Chồng lên nhau thì đọc thẳng — cột cao mà giá tụt là
         phân phối, cột cao mà giá bật là gom. Đường giá đi TRỤC PHẢI vì tiền và giá khác
         đơn vị hoàn toàn. */
      +ptO('Giá và giá trị giao dịch mỗi phiên', 'mc1',
           '<i class="pk1"></i> khớp lệnh &nbsp; <i class="pk2"></i> thoả thuận'
           +' &nbsp;·&nbsp; <i class="pkA"></i> đóng cửa &nbsp; <i class="pkB"></i> giá TB (VWAP)'
           +' &nbsp;—&nbsp; hai đường đọc ở <b>trục phải</b>', 1)
      +ptO('Khối ngoại mua / bán', 'mc3',
           '<i class="pkC"></i> mua &nbsp; <i class="pkD"></i> bán &nbsp;·&nbsp; giá trị mỗi phiên')
      +ptO('Khối ngoại ròng', 'mc4', 'mua trừ bán — cột xanh là mua ròng, đỏ là bán ròng')
      +ptO('Tự doanh ròng', 'mcT', 'tiền của chính công ty chứng khoán — nhóm khác hẳn khối ngoại')
      +ptO('% giá trị phiên là của khối ngoại', 'mc5',
           '(mua + bán) ÷ 2 ÷ giá trị khớp lệnh — đếm cả hai vế là đếm hai lần')
      +ptO('% thay đổi giá mỗi phiên', 'mc6', 'so với giá tham chiếu của chính phiên đó')
      +ptO('Giá thoả thuận so với giá sàn', 'mcP',
           '<i class="pkA"></i> đóng cửa &nbsp; <i class="pkP"></i> giá bình quân thoả thuận'
           +' &nbsp;·&nbsp; chỉ vẽ phiên CÓ thoả thuận')
      +ptO('Vốn hoá', 'mc7', 'giá đóng cửa × số cổ phiếu lưu hành của chính phiên đó')
      +ptO('Khối lượng khớp lệnh', 'mc8', 'cổ phiếu')
      +ptO('Vùng giá khớp lệnh — phiên '+esc(ngVG), 'mc9', vgGhi)
    +'</div>';
  /* DÒ CHỦ ĐỀ BẰNG `isLight()`, ĐỪNG DÒ BẰNG `classList`. Trang đặt chủ đề vào
     `document.documentElement.dataset.theme` (xem đoạn inline đầu congcu.html và nút đổi
     đèn), KHÔNG bao giờ gắn class `theme-dark`/`theme-light` — nên nhánh classList cũ
     LUÔN sai và cả biểu thức rơi về `prefers-color-scheme` của hệ điều hành. Hậu quả đo
     được: máy để hệ điều hành TỐI mà bấm trang sang SÁNG thì đồ thị vẫn vẽ bảng màu tối
     lên nền sáng, và ngược lại. Im lặng hoàn toàn vì trên máy có OS và trang cùng chế độ
     thì nó lại đúng — chỉ hỏng đúng nhóm người dùng đổi đèn thủ công. */
  const dark=!isLight();
  const XANH=dark?'#34d399':'#16a34a', DO=dark?'#f87171':'#dc2626';
  /* GHIM PHIÊN (user chốt 22/08/2026: *"tao không bấm chọn ... để neo lại được"*).
     Bản cũ nhận tham số `bam` rồi KHÔNG DÙNG TỚI, mà lượt `mousemove` đã dời mốc tới
     đúng cột đó trước rồi — nên tới lúc `click` chạy thì `i===PT.maI` và hàm thoát ngay
     ở dòng đầu. Tức nút bấm có tồn tại nhưng KHÔNG BAO GIỜ làm gì, và mốc thì luôn chạy
     theo chuột: nhấc tay ra là mất phiên vừa xem.
     Nay: bấm = ghim/bỏ ghim; đã ghim thì rê chuột không đổi phiên nữa. */
  const chon=(i,bam)=>{
    if(bam){ PT.ghim=(PT.ghim===i)?null:i; PT.maI=i; ptVeMa(); return; }
    if(PT.ghim!=null) return;
    if(i===PT.maI) return;
    PT.maI=i; ptVeMa();
  };
  /* Đồ thị nhỏ thấp hơn bản trước (150 -> 136): lưới đã lên ba cột nên mỗi ô hẹp lại,
     giữ nguyên chiều cao là ô thành hình chữ nhật dựng đứng, đường giá bị kéo dốc giả. */
  const C=(cfg)=>Object.assign({d,moc:PT.maI,ghim:PT.ghim!=null,chon,cao:136},cfg);
  ptVe1($('#mc1'),C({cao:300,kieu:'bar',chong:1,
    series:[{v:mval,mau:dark?'#38bdf8':'#0284c7'},{v:pval,mau:dark?'#a78bfa':'#7c3aed'}],
    nhan:v=>ptTien(v),
    phai:{nhan:num,series:[{v:c,mau:dark?'#f8fafc':'#0f172a'},
                           {v:vw,mau:dark?'#fbbf24':'#d97706'}]}}));
  ptVe1($('#mc3'),C({kieu:'bar',series:[{v:fnM,mau:XANH},{v:fnB,mau:DO}],nhan:v=>ptTien(v)}));
  ptVe1($('#mc4'),C({kieu:'bar',series:[{v:fnRong,mau:XANH,mauAm:DO}],nhan:v=>ptTien(v)}));
  ptVe1($('#mcT'),C({kieu:'bar',series:[{v:tdRong,mau:XANH,mauAm:DO}],nhan:v=>ptTien(v)}));
  ptVe1($('#mc5'),C({kieu:'bar',series:[{v:fnPc,mau:dark?'#22d3ee':'#0891b2'}],
    nhan:v=>v.toFixed(1)+'%'}));
  ptVe1($('#mc6'),C({kieu:'bar',series:[{v:pcs,mau:XANH,mauAm:DO}],nhan:v=>v.toFixed(1)+'%'}));
  ptVe1($('#mcP'),C({kieu:'line',series:[{v:c,mau:dark?'#38bdf8':'#0284c7'},
    {v:ptt,mau:dark?'#c084fc':'#7c3aed'}],nhan:num}));
  ptVe1($('#mc7'),C({kieu:'line',series:[{v:mcap,mau:XANH}],nhan:v=>ptTien(v)}));
  ptVe1($('#mc8'),C({kieu:'bar',series:[{v:mv,mau:dark?'#94a3b8':'#64748b'}],nhan:num}));
  if(vg) ptVe1($('#mc9'),{d:vg.p.map(x=>num(x)),kieu:'bar',cao:136,
    series:[{v:vg.v,mau:dark?'#38bdf8':'#0284c7'}],nhan:num});
  /* BẢNG ĐỌC SỐ — SÁU KHỐI CÓ THỨ BẬC, không phải 12 mẩu rời (user chốt 22/08/2026:
     *"liếc mắt 1 cái là nhìn ra các con số nhanh và đơn giản hơn"*).
     Bản cũ in 12 `<span>` cùng cỡ cùng màu xếp thành một hàng dài — mọi con số ngang vai
     nhau nên mắt phải đọc HẾT nhãn mới tìm ra thứ mình cần, mà nhãn thì bé hơn số.
     Nay mỗi khối trả lời một câu: giá bao nhiêu · giao dịch bao nhiêu tiền · khối ngoại
     làm gì · tự doanh làm gì · thoả thuận ở giá nào · công ty to cỡ nào. Trong khối thì
     MỘT con số lớn là câu trả lời, phần còn lại là chú thích cho chính nó. */
  const oNul='<span class="ptdn">—</span>';
  const oo=(nhan,gt,phu,cl)=>'<div class="ptdc"><span class="ptdcl">'+nhan+'</span>'
    +'<b class="ptdcv'+(cl?' '+cl:'')+'">'+gt+'</b>'
    +(phu?'<span class="ptdcp">'+phu+'</span>':'')+'</div>';
  const tien=(v)=>v==null?null:((v>0?'+':'')+ptTien(v));
  const cqN=((PT.cq||{})[PT.ma]||{}).n||0;
  $('#ptDoc').innerHTML=
    '<div class="ptdh"><span class="ptdd">'+esc(d[k])+'</span>'
      +(PT.ghim!=null
        ? '<button class="ptdgh on" id="ptBoGhim">đã ghim — bấm để bỏ</button>'
        : '<span class="ptdg">rê chuột lên đồ thị để xem phiên khác · <b>bấm để ghim</b></span>')
    +'</div>'
    +'<div class="ptdw">'
    +oo('Đóng cửa', num(c[k]), (pcs[k]==null?'':ph(pcs[k])+' · ')+'giá TB '+num(vw[k]),
        pcs[k]==null?'':cls(pcs[k]))
    /* GIÁ KHỚP LỆNH TB đứng thành Ô RIÊNG, không nhét vào dòng phụ của ô đóng cửa
       (user chốt 22/08/2026: *"tôi không đọc được giá khớp lệnh trung bình"*). Đây là chỗ
       lộ ra phiên nào đóng cửa không đại diện cho phiên: PNJ 08/07/2026 đóng 52.000 mà
       giá khớp bình quân 48.579 — lệch 6,6%, vì mã mở cửa KỊCH SÀN rồi được kéo lên
       suốt phiên. Nhìn mỗi giá đóng cửa thì không đời nào thấy được điều đó. */
    +oo('Giá khớp lệnh TB', vw[k]!=null?num(Math.round(vw[k])):oNul,
        (vw[k]!=null&&c[k])
          ?('<b class="'+cls(vw[k]/c[k]-1)+'">'+((vw[k]/c[k]-1)>0?'+':'')
            +((vw[k]/c[k]-1)*100).toFixed(1)+'%</b> so giá đóng cửa'
            +((vwN[k]&&Math.abs(vw[k]/vwN[k]-1)>0.005)
               ?' · nguồn ghi '+num(vwN[k]):''))
          :'')
    +oo('Giá trị khớp lệnh', ptTien(mval[k]), num(mv[k])+' cp')
    /* BIÊN ĐỘ PHIÊN — mở/cao/thấp. Không có nó thì "đóng cửa 52.000, giá TB 48.579" là
       một mâu thuẫn không giải thích được; có nó thì đọc ra ngay: mở 47.250 đúng giá SÀN,
       thấp nhất cũng 47.250, tức cả phiên là một cú kéo từ sàn lên. */
    +oo('Biên độ phiên', (hi[k]&&lo[k]&&c[k])?(((hi[k]-lo[k])/c[k]*100).toFixed(1)+'%'):oNul,
        (op[k]?('mở <b>'+num(op[k])+'</b>'+(tc[k]&&Math.abs(op[k]/tc[k]-1)>=0.0695
            ?' <b class="'+cls(op[k]-tc[k])+'">'+(op[k]>tc[k]?'kịch trần':'kịch sàn')+'</b>':'')):'')
          +(hi[k]?' · cao <b>'+num(hi[k])+'</b>':'')+(lo[k]?' · thấp <b>'+num(lo[k])+'</b>':''))
    +oo('Khối ngoại ròng', fnRong[k]!=null?tien(fnRong[k]):oNul,
        fnM[k]!=null?('mua <b class="up">'+ptTien(fnM[k])+'</b> · bán <b class="dn">'
          +ptTien(fnB[k])+'</b>'+(fnPc[k]!=null?' · chiếm <b>'+fnPc[k].toFixed(1)+'%</b>':'')
          +(fnSH[k]!=null?' · sở hữu <b>'+fnSH[k].toFixed(1)+'%</b>':'')):'',
        fnRong[k]!=null?cls(fnRong[k]):'')
    /* Ô này từng in một câu giải thích tĩnh ("tiền của chính công ty chứng khoán") —
       chữ đó không đổi theo phiên nên chiếm chỗ mà không nói gì. Nay in mua/bán của
       CHÍNH phiên đó, và nói luôn mã có bao nhiêu chứng quyền đang lưu hành: 12/12 mã
       đầu bảng tự doanh mua ròng đều có chứng quyền, tức phần lớn là phòng hộ bắt buộc
       chứ không phải đặt cược — không nói ra thì con số này đọc sai bản chất. */
    +oo('Tự doanh ròng', tdRong[k]!=null?tien(tdRong[k]):oNul,
        tdRong[k]==null?'nguồn không có tự doanh ở mã này'
          :('mua <b class="up">'+ptTien(tdM[k]||0)+'</b> · bán <b class="dn">'
            +ptTien(tdB[k]||0)+'</b>'+(cqN?' · <b>'+cqN+' chứng quyền</b> đang lưu hành':'')),
        tdRong[k]!=null?cls(tdRong[k]):'')
    /* THOẢ THUẬN PHẢI CÓ GIÁ TRỊ BẰNG TIỀN (user chốt 22/08/2026). "200.000 cp" không
       nói được gì nếu chưa nhân với giá — cùng một khối lượng ở mã 3.000đ và mã 200.000đ
       là hai câu chuyện khác hẳn, mà đây đúng là chỗ hay có lô sang tay lớn. */
    +oo('Thoả thuận', pval[k]?ptTien(pval[k]):oNul,
        ptt[k]!=null?('giá <b>'+num(ptt[k])+'</b> · <b class="'+cls(ptt[k]/c[k]-1)+'">'
          +((ptt[k]/c[k]-1)>0?'+':'')+((ptt[k]/c[k]-1)*100).toFixed(1)+'%</b> so giá sàn · '
          +num(pv[k])+' cp'):'phiên này không có thoả thuận')
    +oo('Vốn hoá', mcap[k]?ptTien(mcap[k]):oNul, sh[k]?num(sh[k])+' cp lưu hành':'')
    +'</div>';
  const bg=$('#ptBoGhim');
  if(bg) bg.onclick=()=>{ PT.ghim=null; ptVeMa(); };
  ptBindMa();
}
/* `to=1` -> đồ thị CHIẾM CẢ CHIỀU NGANG và cao hơn. Bản trước cho cả 11 đồ thị cùng một
   cỡ, nên "giá đóng cửa" và "vùng giá khớp lệnh" ngang vai nhau — lưới 11 ô đều tăm tắp
   thì không ô nào là câu trả lời đầu tiên, mắt phải đọc hết tên từng ô mới biết nhìn đâu.
   Giá và tiền là hai câu hỏi chính của mọi mã, cho chúng đứng riêng một hàng. */
function ptO(ten,id,ghi,to){
  return '<div class="panel ptbo'+(to?' ptbig':'')+'"><div class="ph">'+ptIc('bieu')+ten+
    '</div><div class="pb">'+
    '<canvas id="'+id+'"></canvas>'+(ghi?'<p class="ptleg">'+ghi+'</p>':'')+'</div></div>';
}
function ptBindMa(){
  const b=$('#ptQuay'); if(b) b.onclick=()=>{ PT.ma=null; PT.maD=null; ptVe(); };
}

/* ---- BẢNG MÃ CỦA PHIÊN ĐANG CHỌN ---- */
/* CỘT TIỀN ĐỨNG TRƯỚC CỘT KHỐI LƯỢNG. Không có khối lượng đặt mua/đặt bán — user chốt là
   nhiễu. Muốn bật lại thì thêm vào đây và vào COT_BANG của build_phantich.py. */
const PTC=[
  {k:'sym', t:'Mã'},
  {k:'ex',  t:'Sàn'},
  {k:'c',   t:'Giá',            n:1},
  {k:'pc',  t:'±%',             n:1},
  {k:'vwap',t:'Giá TB',         n:1},
  {k:'mval',t:'GT khớp lệnh',   n:1, tien:1},
  {k:'pval',t:'GT thoả thuận',  n:1, tien:1},
  /* GIÁ BÌNH QUÂN CỦA RIÊNG THOẢ THUẬN = GT thoả thuận ÷ KL thoả thuận.
     Không nguồn nào tao dò được có CHI TIẾT TỪNG LỆNH thoả thuận (đã thử Vietstock, VPS,
     HOSE, CafeF, Simplize, Fireant, 24hMoney — 15 endpoint, 404 hoặc rơi về trang tổng
     quan). Nhưng con số bình quân này trả lời được câu hỏi thực tế: thoả thuận hôm đó
     khớp quanh vùng giá nào và lệch bao xa so với giá sàn.
     Ra số TRÒN TUYỆT ĐỐI (46.000, 52.000…) nghĩa là cả phiên chỉ khớp ở ĐÚNG MỘT giá —
     tự nó là một tín hiệu, thường là một cú sang tay trọn lô. */
  {k:'ptt', t:'Giá thoả thuận', n:1},
  {k:'mv',  t:'KL khớp lệnh',   n:1},
  {k:'mcap',t:'Vốn hoá',        n:1, tien:1},
  /* FREE FLOAT — tỉ lệ cổ phiếu thực sự chuyển nhượng được, và vốn hoá tương ứng.
     Nằm sẵn trong `data/profile` từ lâu mà tới 21/08/2026 mới có chỗ nào đọc.
     Vì sao đáng một cột riêng: BID vốn hoá 279 nghìn tỷ mà free float 2,6% -> chỉ 7
     nghìn tỷ mua bán được, trong khi STB 140 nghìn tỷ với 95% -> 133. Xếp bảng theo cột
     `mcapFF` là ra một thứ hạng KHÁC HẲN cột `mcap`, và đó mới là thứ hạng nói được vì
     sao mã này chạy còn mã kia đứng im. */
  {k:'ff',  t:'Free float',     n:1},
  {k:'mcapFF',t:'Vốn hoá FF',   n:1, tien:1},
];

async function ptBang(){
  const w=$('#ptTab'); if(!w) return;
  w.innerHTML='<div class="panel"><div class="pb"><div class="empty">Đang nạp phiên '+esc(PT.ngay)+'…</div></div></div>';
  const p=await ptPhien(PT.ngay);
  if(!p||!p.bang){
    /* KHÔNG gọi ptDiemSang ở đây — `rDay` chỉ được dựng sau khi đọc xong file phiên, gọi
       ở nhánh thoát sớm này là ReferenceError và cả trang trắng. Mà cũng vô nghĩa: không
       có file thì không có mã nào để tìm điểm sáng. */
    w.innerHTML='<div class="panel"><div class="ph">'+ptIc('bang')+'Bảng mã — phiên '+esc(PT.ngay)+
      '</div><div class="pb"><div class="empty">Phiên này chưa có file dữ liệu. '+
      'Kho chỉ dựng file cho phiên có từ 100 mã trở lên.</div></div></div>';
    return;
  }
  const ix={}; (p.f||[]).forEach((k,i)=>ix[k]=i);
  let r=[];
  for(const sym in p.bang){
    const v=p.bang[sym], g=k=>v[ix[k]];
    const c=g('c'), tc=g('tc'), sh=g('sh');
    r.push({sym, ex:g('ex')||'', sec:g('sec')||'', c, tc, vwap:g('vwap'), mval:g('mval')||0, pval:g('pval')||0,
            mv:g('mv')||0, mcap:(c&&sh)?c*sh:null, pc:(c&&tc)?((c/tc-1)*100):null,
            ptt:(g('pv')&&g('pval'))?(g('pval')/g('pv')):null,
            ff:g('ff'), mcapFF:(c&&sh&&g('ff'))?c*sh*g('ff')/100:null,
            fnM:g('fnMuaGT'), fnB:g('fnBanGT'), tdM:g('tdMuaGT'), tdB:g('tdBanGT'),
            vg:(p.ma&&p.ma[sym])||null});
  }
  /* Điểm sáng dựng từ rổ ĐẦY ĐỦ của phiên, KHÔNG theo bộ lọc sàn / ô tìm đang bật:
     nó trả lời "phiên này có gì đáng chú ý", mà lọc còn 1 mã thì câu đó vô nghĩa. */
  const rDay=r.slice();
  if(PT.ex!=='all') r=r.filter(x=>x.ex===PT.ex);
  if(PT.q){ const q=PT.q.toUpperCase(); r=r.filter(x=>x.sym.indexOf(q)>=0); }
  const s=PT.sort, dir=PT.dir;
  r.sort((a,b)=>{ const x=a[s], y=b[s];
    if(x==null&&y==null) return 0; if(x==null) return 1; if(y==null) return -1;
    return typeof x==='string'?dir*x.localeCompare(y):dir*(x-y); });
  const dem={}; for(const sym in p.bang) dem[p.bang[sym][ix['ex']]]=(dem[p.bang[sym][ix['ex']]]||0)+1;
  const chip=(v,t)=>'<button data-ex="'+v+'"'+(PT.ex===v?' class="on"':'')+'>'+t+'</button>';
  const th=PTC.map(c=>'<th data-k="'+c.k+'" class="'+(c.n?'r':'')+
    (s===c.k?' sorted '+(dir<0?'d':'a'):'')+'">'+c.t+'</th>').join('');
  const coVG=!!(p.ma&&Object.keys(p.ma).length);
  const body=r.slice(0,400).map(x=>{
    const mo=PT.mo===x.sym;
    let tr='<tr data-sym="'+x.sym+'" class="'+(mo?'ptmo':'')+(x.vg?' ptco':'')+'">'+PTC.map(c=>{
      const v=x[c.k];
      if(c.k==='sym') return '<td><b>'+esc(x.sym)+'</b>'+(x.vg?'<i class="ptdau">▾</i>':'')+'</td>';
      if(c.k==='ex')  return '<td>'+esc(x.ex)+'</td>';
      if(v==null) return '<td class="r">—</td>';
      if(c.k==='pc') return '<td class="r '+cls(v)+'">'+(v>0?'+':'')+v.toFixed(2)+'%</td>';
      if(c.k==='ff') return '<td class="r">'+v.toFixed(1)+'%</td>';
      if(c.tien) return '<td class="r">'+ptTien(v)+'</td>';
      /* Giá thoả thuận: kèm CHÊNH so với giá đóng cửa. Bản thân mức giá không nói được gì
         nếu không biết nó lệch bao xa — LPB 23/06 thoả thuận ở 46.122 trong khi sàn đóng
         52.600, tức sang tay rẻ hơn 12,3%; đó mới là con số đáng đọc. */
      if(c.k==='ptt') return '<td class="r">'+num(v)+
        (x.c?' <i class="ptcl '+cls(v/x.c-1)+'">'+((v/x.c-1)*100).toFixed(1)+'%</i>':'')+'</td>';
      return '<td class="r">'+num(v)+'</td>';
    }).join('')+'</tr>';
    /* BẤM LÀ PHẢI CÓ PHẢN HỒI, kể cả khi chưa có vùng giá. Bản trước chỉ bung hàng khi
       CÓ dữ liệu, nên bấm vào mã chưa cào thì trang đứng im — người dùng không phân biệt
       được "không có dữ liệu" với "nút hỏng", và sẽ bấm lại mấy lần. */
    if(mo) tr+='<tr class="ptvgr"><td colspan="'+PTC.length+'">'+
      (x.vg?ptVungGia(x):'<div class="ptvg1"><b>'+esc(x.sym)+'</b> — phiên '+esc(PT.ngay)+
        ' chưa cào vùng giá khớp lệnh.<br><i>Kho vùng giá lấy riêng từng phiên và chỉ có từ '+
        'khoảng 09/2025; phiên nào đã cào thì dòng có dấu ▾.</i></div>')+'</td></tr>';
    return tr;
  }).join('');
  w.innerHTML=(PT_HIEN.quetla?ptQuetLa(p):'')
    +(PT_HIEN.dongtien?ptDongTien(rDay):'')
    +(PT_HIEN.diemsang?ptDiemSang(rDay):'')
    +(PT_HIEN.boloc?ptBoLoc(p):'')+
    '<div class="panel"><div class="ph">'+ptIc('bang')+'Bảng mã — phiên '+esc(PT.ngay)+
    '<span class="cnt">'+num(r.length)+' mã</span></div><div class="pb">'
    +ptGiai('bang','Vì sao bảng xếp theo tiền chứ không theo khối lượng',
       'Một mã khớp mấy triệu cổ phiếu giá 3.000đ chỉ là vài tỷ, còn mã khớp vài trăm nghìn '
      +'cổ phiếu giá 200.000đ mới là tiền thật. '
      +(coVG?'Bấm vào dòng có dấu ▾ để xem <b>vùng giá khớp lệnh</b> của mã đó trong phiên này.'
        :'Vùng giá khớp lệnh của phiên này chưa cào — bảng vẫn đầy đủ.'))
    +'<div class="nybar"><div class="nyseg" id="ptEx">'+chip('all','Tất cả')
      +chip('HOSE','HOSE'+(dem.HOSE?' '+dem.HOSE:''))+chip('HNX','HNX'+(dem.HNX?' '+dem.HNX:''))
      +chip('UPCOM','UPCOM'+(dem.UPCOM?' '+dem.UPCOM:''))+'</div>'
      +'<input id="ptQ" class="ptq" placeholder="tìm mã…" value="'+esc(PT.q)+'"></div>'
    +'<div class="pttw"><table class="pttb"><thead><tr>'+th+'</tr></thead><tbody>'+
      (body||'<tr><td colspan="'+PTC.length+'"><div class="empty">Không có mã nào</div></td></tr>')+
      '</tbody></table></div>'
    +(r.length>400?'<p class="ptbarn ptdu">Hiện 400 mã đầu theo thứ tự đang xếp — còn '+num(r.length-400)+' mã nữa.</p>':'')
    +'</div></div>';
  ptBind();
  if(PT_HIEN.boloc) ptLocBind(p);
}

/* Tiền: đổi bậc cho dễ đọc. Cột tiền đứng cạnh nhau nên phải CÙNG một bậc trong một cột —
   trộn "tỷ" với "triệu" trong cùng cột là mắt không so thẳng được nữa. Ngưỡng 1 tỷ. */
function ptTien(v){
  if(v==null) return '—';
  if(Math.abs(v)>=1e9) return num(v/1e9)+' tỷ';
  if(Math.abs(v)>=1e6) return (v/1e6).toFixed(1)+' tr';
  return num(v);
}

/* VÙNG GIÁ KHỚP LỆNH — dựng bằng thẻ HTML chứ không vẽ canvas: nó nằm trong một hàng bảng
   bung ra, bề ngang đổi theo cột, và cần rê chuột ra số. Thẻ thật thì được cả hai miễn phí. */
function ptVungGia(x){
  const vg=x.vg; if(!vg||!vg.p||!vg.p.length) return '<div class="empty">Không có dữ liệu</div>';
  let mx=0; for(const v of vg.v) mx=Math.max(mx,v);
  const tong=vg.v.reduce((a,b)=>a+b,0);
  const cot=vg.p.map((g,i)=>{
    const h=mx?vg.v[i]/mx*100:0;
    const tien=g*vg.v[i];
    return '<div class="ptvgc" title="'+num(g)+'đ — '+num(vg.v[i])+' cp ('+
      (tong?(vg.v[i]/tong*100).toFixed(1):0)+'%) ≈ '+ptTien(tien)+'">'+
      '<span style="height:'+h.toFixed(1)+'%"></span><i>'+num(g)+'</i></div>';
  }).join('');
  let cf='';
  if(vg.cf&&vg.cf.length===3){
    const [u,f,d]=vg.cf, t=u+f+d;
    const bar=(nhan,v,cl)=>'<div class="ptcfc"><span class="'+cl+'" style="height:'+
      (t?Math.max(2,v/Math.max(u,f,d,1)*100):0).toFixed(1)+'%"></span>'+
      '<i>'+nhan+'</i><b>'+ptTien(v*1e6)+'</b></div>';
    cf='<div class="ptcf"><h4>Phân bổ dòng tiền</h4><div class="ptcfw">'+
       bar('Tăng',u,'up')+bar('Không đổi',f,'fl')+bar('Giảm',d,'dn')+'</div>'+
       '<p class="ptcfn">Giá trị khớp lệnh tách theo hướng giá của lệnh so với lệnh liền trước — '+
       'tăng = bên mua chủ động nâng giá, giảm = bên bán chủ động hạ giá.</p></div>';
  }
  return '<div class="ptvg"><div class="ptvgl"><h4>Vùng giá khớp lệnh — '+esc(x.sym)+
    ' phiên '+esc(PT.ngay)+'</h4><div class="ptvgw">'+cot+'</div>'+
    '<p class="ptcfn">Cột = khối lượng khớp tại mức giá đó. Tổng '+num(tong)+' cp'+
    (x.mv&&tong!==x.mv?' <b>(lệch với KL cả phiên '+num(x.mv)+')</b>':' — khớp đúng KL cả phiên')+
    '. Rê vào cột để xem số.</p></div>'+cf+'</div>';
}

function ptBind(){
  ptBindGiai();
  const ex=$('#ptEx'); if(ex) ex.onclick=e=>{ const b=e.target.closest('button'); if(!b) return;
    PT.ex=b.dataset.ex; ptBang(); };
  const q=$('#ptQ');
  if(q) q.oninput=()=>{ clearTimeout(PT._t); const v=q.value;
    /* giữ tiêu điểm và vị trí con trỏ qua lượt vẽ lại — cùng bài học với #vbQ của Về bờ */
    const pos=q.selectionStart;
    PT._t=setTimeout(async()=>{ PT.q=v.trim(); await ptBang();
      const n=$('#ptQ'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } },220); };
  const tb=$('.pttb'); if(!tb) return;
  tb.querySelectorAll('th[data-k]').forEach(th=>{ th.onclick=()=>{
    const k=th.dataset.k;
    if(PT.sort===k) PT.dir=-PT.dir; else { PT.sort=k; PT.dir=(k==='sym'||k==='ex')?1:-1; }
    ptBang(); }; });
  /* Bấm một mã ở khối điểm sáng = lọc bảng về đúng mã đó rồi bung vùng giá — bằng không
     người ta thấy tên mã hay ho mà không có đường nào đi tiếp. */
  $$('.dsr[data-sym]').forEach(d=>{ d.onclick=()=>{ ptMoMa(d.dataset.sym); }; });
  tb.querySelectorAll('tr[data-sym]').forEach(tr=>{ tr.onclick=()=>{
    ptMoMa(tr.dataset.sym); }; });
}

const MODULES=[
  {id:'radar', ic:'📡', name:'Radar phiên', tag:'',
   meta:[], render:renderRadar},
  {id:'tapdoan', ic:'🏢', name:'Danh mục tập đoàn', tag:'Gom công ty cùng một nhà để soi dòng tiền chảy vào cả họ — và lật danh mục các quỹ đang nắm giữ.',
   meta:[], render:renderTapDoan},
  {id:'phantich', ic:'📊', name:'Phân tích dữ liệu', tag:'Số chốt phiên và sổ lệnh khi chốt phiên của cả thị trường — khớp lệnh tách khỏi thoả thuận, và áp lực đặt mua so với đặt bán.',
   meta:[], render:renderPhanTich},
  {id:'race', ic:'🏁', name:'Đường đua vốn hoá', tag:'6,5 năm thị trường chạy lại trong 30 giây — bảng xếp hạng vốn hoá đổi ngôi theo từng tháng.',
   meta:[], render:renderRace},
  {id:'niemyet', ic:'🔔', name:'Thông tin niêm yết', tag:'Ngày lên sàn của toàn bộ mã đang niêm yết, giá phiên đầu tiên và mức tăng kể từ đó — kèm hồ sơ đang chờ lên sàn.',
   meta:[], render:renderNiemYet},
];
let cur=null; const done={};
const PATHOF={radar:'/radar',tapdoan:'/tapdoan',race:'/duongdua',niemyet:'/niemyet',
              phantich:'/phantich'};
const TITLEOF={radar:'Radar phiên',tapdoan:'Danh mục tập đoàn',race:'Đường đua vốn hoá',
               niemyet:'Thông tin niêm yết',phantich:'Phân tích dữ liệu'};
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
  if(fam) fam.classList.toggle('on',cur==='tapdoan'||cur==='niemyet');
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
  /* 'tg' gộp vào 'phien' từ 13/08/2026 — giữ nhánh này để link cũ ?t=tg còn mở được */
  if(m==='radar'){ radarTab=(t==='vb')?t:'phien'; if(cur==='radar') renderRadar(); else done.radar=0; }
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
/* LỌC THEO HẠNG (17/08/2026). Bảng vốn đã chia bốn khối, nhưng 164 nhóm nghĩa là muốn xem
   khối "Cá nhân chi phối" phải cuộn qua gần hết bảng mới tới — trên điện thoại là hơn 8.000px.
   Chip lọc chỉ giấu bớt khối, KHÔNG đổi cách gom nhóm hay thứ tự bên trong. */
let tdLoc='all';                                 // 'all' | 'tt' | 'nn' | 'cq' | 'cn'
const tdKhoa={cap:o=>o.c.mcapLive||o.c.mcap||0, gtgd:o=>o.c.gtgd||0};
const tdXep=ma=>ma.slice().sort((a,b)=>(tdKhoa[tdSort.k](a)-tdKhoa[tdSort.k](b))*tdSort.d);
/* TÊN NHÓM BỎ ĐUÔI PHÁP LÝ trước khi hiện (17/08/2026). Kho ghi "MÃ · tên pháp lý đầy đủ",
   mà đuôi ấy giống hệt nhau ở mọi mã cùng loại: mười mấy nhóm ngân hàng đều mở đầu bằng
   "Ngân hàng Thương mại Cổ phần …" — 34 ký tự KHÔNG phân biệt được nhóm nào với nhóm nào,
   trong khi nó đẩy tên xuống ba dòng trên điện thoại. Đo trên 164 nhóm: trung bình 31,3 ->
   25,6 ký tự, số tên buộc phải xuống dòng ở màn hẹp 77 -> 48.
   Dùng lại `shortName` — CHÍNH hàm mà hàng công ty con bên trong đang dùng, nên mở một nhóm
   ra thì tên nhóm và tên con cùng một lối viết. Tên pháp lý đầy đủ chuyển sang `title`.
   Cắt Ở ĐÂY chứ không cắt trong kho: kho giữ tên đầy đủ thì đổi cách rút gọn là sửa một
   dòng, khỏi dựng lại `data/tapdoan.json`. */
const tenGon=t=>{ const i=String(t||'').indexOf(' · ');
  return i<0?t:t.slice(0,i+3)+shortName(t.slice(i+3)); };
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
  const hang=x=>{
    const g=x.g, mo=tdMo.has(g.id);
    /* LOGO CỦA NHÀ: lấy logo mã MẸ khi mẹ có niêm yết (80/164 nhóm). Mẹ không lên sàn
       (PVN, Viettel, SCIC, các Bộ) thì KHÔNG mượn logo của mã con to nhất — nhìn logo GAS
       mà tưởng đó là PVN thì sai hẳn; thay bằng ô chữ tắt lấy từ chính tên nhóm. */
    const cMe=g.me&&ST.map.get(g.me);
    const dau=cMe?logoHTML(cMe)
      :'<span class="gini">'+esc((g.ten||'').replace(/[^\p{L}\p{N}]/gu,'').slice(0,2).toUpperCase())+'</span>';
    /* MỘT NHÃN DUY NHẤT, và nó phải NÓI THÊM ĐƯỢC ĐIỀU GÌ.
       Nhánh con thì nhãn là "thuộc <nhà mẹ>" chứ KHÔNG lặp lại "nhà nước": nhóm đã nằm
       trong khối "Doanh nghiệp nhà nước" rồi, dán thêm chữ ấy là nói hai lần cùng một
       chuyện — mà lại đúng chỗ dễ đọc ra mâu thuẫn nhất ("Ngân hàng Nhà nước đã nắm CTG ở
       trên, sao xuống dưới CTG lại có nhãn nhà nước nữa?"). Đổi thành "thuộc Ngân hàng Nhà
       nước" là câu trả lời cho chính thắc mắc đó. Nhóm GỐC mới giữ nhãn hạng. */
    /* Nhãn trên hàng phải NGẮN nên `chaTen` đã bị cắt; tooltip thì lấy TÊN ĐẦY ĐỦ tra
       ngược từ id — có sẵn trong chính danh sách đang dựng, khỏi nhét thêm trường vào kho. */
    const chaDay=((ST.tapdoan||[]).find(x=>x.id===g.cha)||{}).ten||g.chaTen;
    const nhan=g.cha
      ? '<b class="nn thuoc" title="Nhánh con — công ty mẹ của nhóm này nằm trong nhóm “'
        +esc(chaDay)+'”. Vốn hoá phần chồng lấn đã được trừ nên không đếm hai lần.">thuộc '
        +esc(g.chaTen)+'</b>'
      : g.kieu==='nn' ? '<b class="nn">nhà nước</b>'
      : g.kieu==='cq' ? '<b class="nn cq">cơ quan</b>'
      : g.kieu==='cn' ? '<b class="nn cn">cá nhân</b>' : '';
    const gon=tenGon(g.ten);
    return '<div class="tdrow'+(mo?' on':'')+'" data-td="'+esc(g.id)+'">'
      +'<span class="sn"><i class="cr">'+(mo?'▾':'▸')+'</i>'+dau
      /* title chỉ gắn khi CÓ cắt bớt — gắn cả khi tên không đổi thì rê chuột vào đâu cũng
         bung một khung nhắc lại đúng dòng chữ đang nhìn, phiền chứ chẳng nói thêm gì */
      +'<em class="nm"'+(gon!==g.ten?' title="'+esc(g.ten)+'"':'')+'>'+esc(gon)+'</em>'
      +nhan+'</span>'
      /* KHÔNG có thanh xanh đỏ ở đây (bỏ 17/08/2026). Bảng này đã có % ngay bên cạnh và
         ô đếm ▲/▼ — thanh chỉ nói lại đúng dấu của con số đó, mà ăn nguyên một cột 92px
         trong khi tên nhà lại đang bị cắt bằng dấu ba chấm. Trả chỗ đó cho cột tên.
         Bảng NGÀNH (.secrow) vẫn giữ thanh: ở đó nó xếp hạng ~25 dòng đọc một lượt. */
      +'<span class="sp '+cls(x.d)+'">'+pct(x.d)+'</span>'
      +'<span class="sb"><b class="up">▲'+x.up+'</b> <b class="dn">▼'+x.dn+'</b>'
      +'<u>/'+x.ma.length+'</u></span>'
      +'<span class="sc"><i>GTGD</i>'+ty(x.gtgd)+'</span>'
      /* KHÔNG có số NN thì để gạch ngang TRƠN, đừng ghép dấu vào: ty(0) trả về "—" nên
         bản cũ ra "+—", đọc như lỗi hiển thị. Cùng bẫy đã vá ở hàng công ty con. */
      +'<span class="sn2 '+cls(x.nn)+'"><i>NN ròng</i>'
      +(x.nn?(x.nn>0?'+':'−')+ty(Math.abs(x.nn)):'—')+'</span>'
      +'<span class="sv"><i>vốn hoá</i>'+ty(x.cap)+'</span></div>'
      /* HÀNG CON PHẢI ĂN KHỚP CỘT VỚI HÀNG NHÓM. Trước đây nó có lưới riêng (5 cột) lồng
         trong khung thụt lề 26px nên mọi con số lệch hẳn khỏi cột của hàng nhóm ngay phía
         trên — mắt vừa đọc "GTGD" ở một chỗ, bung ra lại thấy nó nhảy sang chỗ khác. Nay
         dùng CHUNG lưới `--tdc`, ô `sp0` là chỗ trống giữ đúng cột của ô đếm tăng giảm
         (hàng con không đếm ▲/▼); màn hẹp giấu nó đi thì cột tự dồn y hệt hàng nhóm.
         GỠ THANH XANH ĐỎ thì phải gỡ luôn ô `sp0` từng giữ cột ấy — bằng không hàng con
         thừa một ô, mọi con số bên trong trượt sang phải một cột so với hàng nhóm. */
      +(mo?'<div class="tdcon"><div class="rw hd">'
          +'<span class="c1">công ty<i> · % nhà mẹ nắm</i></span>'
          +'<span class="tdv">hôm nay</span><span class="sp0"></span>'
          +'<span class="tdg">GTGD</span><span class="tdn">NN ròng</span>'
          +'<span class="tdp">vốn hoá</span></div>'
        +tdXep(x.ma).map(o=>{ const c=o.c, nn=c.nnVal||0;
          return '<div class="rw" data-sym="'+c.sym+'">'
          +'<span class="c1">'+logoHTML(c)
          +'<span class="idn"><b>'+c.sym+soHuu(o)+'</b><i>'+esc(shortName(c.name||''))+'</i></span></span>'
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
  /* ═══ BỐN HẠNG, MỖI HẠNG MỘT KHỐI ═══
     Bản trước là một danh sách PHẲNG 164 dòng trộn ba tầng khác hẳn nhau của cùng một cây
     sở hữu: cơ quan nhà nước, tập đoàn, và nhánh con của chính tập đoàn đó. Vingroup đứng
     ngang hàng Ngân hàng Nhà nước, mà "Ngân hàng Nhà nước" không phải một NHÀ — VCB, BID,
     CTG là đối thủ của nhau. Tách khối kèm một câu giải thích ngay dưới tiêu đề thì mỗi
     dòng đọc ra đúng nghĩa của nó, khỏi phải suy. */
  /* Cột thứ 5 là NHÃN NGẮN cho chip lọc. Chip phải ngắn hơn tiêu đề khối: năm chip nằm chung
     một hàng 313px, để nguyên "Cơ quan nắm vốn nhà nước" là mỗi chip chiếm trọn một dòng.
     Tên đầy đủ vẫn còn nguyên ở tiêu đề khối ngay bên dưới, nên không mất nghĩa. */
  const HANG=[
    ['tt','🏢','Tập đoàn tư nhân','','Tư nhân'],
    ['nn','🏛️','Doanh nghiệp nhà nước',
     'Nhà nước sở hữu quá bán công ty mẹ. Đây là MỘT NHÀ thật: mẹ con hợp nhất báo cáo, '
     +'chung một ban điều hành.','Nhà nước'],
    ['cq','📋','Cơ quan nắm vốn nhà nước',
     '<b>Không phải một nhà</b> — đây là DANH MỤC CỔ PHẦN của một cơ quan. Ngân hàng Nhà '
     +'nước nắm cả VCB, BID và CTG nhưng ba ngân hàng đó là đối thủ của nhau; SCIC cũng vậy '
     +'với 82 mã. Muốn xem từng nhà thì mở khối bên trên.','Cơ quan'],
    ['cn','👤','Cá nhân chi phối',
     'Một người (thường là cả gia đình) nắm chi phối từ hai mã trở lên. Vẫn đáng theo dõi, '
     +'nhưng gọi đúng tên chứ không phải tập đoàn.','Cá nhân'],
  ];
  const khoi=HANG.map(([k,ic,ten,mo])=>{
    if(tdLoc!=='all'&&tdLoc!==k) return '';       // đang lọc thì chỉ dựng khối được chọn
    const p=ds.filter(x=>(x.g.kieu||'tt')===k);
    if(!p.length) return '';
    const con=p.filter(x=>x.g.cha).length;
    /* TIÊU ĐỀ KHỐI Ở LẠI KỂ CẢ KHI ĐANG LỌC — nó không thừa: câu giải thích dán ngay dưới
       mới là thứ nói cho biết "cơ quan" khác "nhà nước" ở chỗ nào, mà đó đúng là lúc người
       ta vừa chủ động bấm vào khối ấy nên đang cần đọc nhất. */
    return '<div class="tdhang">'+ic+' '+ten
      +'<em>'+p.length+' nhóm'+(con?' · '+con+' nhánh con':'')+'</em></div>'
      +(mo?'<div class="tdghi">'+mo+'</div>':'')
      +p.map(hang).join('');
  }).join('');
  /* ═══ CHIP LỌC ═══ Đếm trên ds ĐẦY ĐỦ, không phải trên phần đang hiện — chip mà đếm theo
     kết quả đã lọc thì bấm vào "Tư nhân" xong mọi chip khác tụt về 0, không còn đường quay ra. */
  const demHang={};
  for(const x of ds){ const k=x.g.kieu||'tt'; demHang[k]=(demHang[k]||0)+1; }
  const nutLoc=(k,ten,ttl)=>{
    const n=k==='all'?ds.length:(demHang[k]||0);
    if(!n) return '';                             // hạng rỗng thì không bày chip chết
    return '<button class="locb'+(tdLoc===k?' on':'')+'" data-loc="'+k+'"'
      +(ttl?' title="'+esc(ttl)+'"':'')+'>'+esc(ten)+'<i>'+n+'</i></button>';
  };
  const thanhLoc='<div class="tdloc" id="tdLoc">'
    +nutLoc('all','Tất cả','Hiện cả bốn hạng')
    +HANG.map(([k,ic,ten,mo,ngan])=>nutLoc(k,ngan,ten)).join('')+'</div>';
  const soHien=tdLoc==='all'?ds.length:(demHang[tdLoc]||0);
  return '<div class="panel"><div class="ph">Dòng tiền theo tập đoàn'
    +'<span class="tdsrt">xếp theo'+nutXep('cap','vốn hoá')+nutXep('gtgd','GTGD')+'</span>'
    +'<span class="cnt">'+soHien+' nhóm</span></div>'
    +thanhLoc
    /* Bỏ lớp x<khoá> (17/08/2026). Nó sinh ra chỉ để màn hẹp chọn hiện ĐÚNG MỘT cột tiền —
       cột đang xếp theo. Nay màn hẹp xếp hàng thành thẻ hai tầng nên hiện được cả GTGD lẫn
       vốn hoá cùng lúc, không còn phải chọn, và mấy luật CSS đọc lớp này đã xoá theo. */
    +'<div class="pb" style="padding:10px 16px" id="tdPanel">'+khoi+'</div></div>';
}
/* ═══════════ BỨC TRANH TOÀN CẦU — bản đồ thế giới tô theo chỉ số từng nước ═══════════
   MÀU THEO LUẬT CHỨNG KHOÁN VIỆT NAM: xanh = tăng, đỏ = giảm, vàng = tham chiếu.
   Cố ý KHÁC Trung/Nhật/Hàn (bên đó đỏ là tăng) — người đọc là nhà đầu tư Việt.

   NGUỒN: CNBC (quote.cnbc.com), là nguồn DUY NHẤT dò được vừa miễn phí vừa MỞ CORS nên
   trình duyệt gọi thẳng được. Đã dò và loại: Yahoo Finance trả 429 (chặn theo IP, kể cả
   bản dự phòng VIX trong build_screen cũng đang chết vì lý do này), Stooq chặn bằng
   thử-thách JavaScript, TradingView thì dự án đã chốt không phụ thuộc.

   > **KHÔNG ĐƯỢC nói đây là ảnh chụp CÙNG MỘT THỜI ĐIỂM.** Mỗi nước một múi giờ: lúc
   > Việt Nam đang khớp lệnh thì châu Âu chưa mở, Mỹ đã đóng từ đêm qua. Nên mỗi nước
   > phải kèm TRẠNG THÁI CHỢ (đang mở / đã đóng) và giờ bản địa của số đó. Gộp hết thành
   > "thế giới hôm nay" là nói dối, và là kiểu nói dối nhìn rất thuyết phục.

   Việt Nam KHÔNG lấy của CNBC mà lấy VNINDEX của chính trang — số của họ trễ pha
   (đo 12/08: họ 1.793,18 lúc 14:45 trong khi bảng điện mình đang chạy khác). */
const TG_NUOC=[
  ['.SPX','US','Mỹ','S&P 500'],            ['.GSPTSE','CA','Canada','S&P/TSX'],
  ['.BVSP','BR','Brazil','Bovespa'],       ['.MXX','MX','Mexico','IPC'],
  ['.FTSE','GB','Anh','FTSE 100'],         ['.GDAXI','DE','Đức','DAX'],
  ['.FCHI','FR','Pháp','CAC 40'],          ['.SSMI','CH','Thuỵ Sĩ','SMI'],
  ['.IBEX','ES','Tây Ban Nha','IBEX 35'],  ['.FTMIB','IT','Ý','FTSE MIB'],
  ['.AEX','NL','Hà Lan','AEX'],            ['.OMXS30','SE','Thuỵ Điển','OMX 30'],
  ['.XU100','TR','Thổ Nhĩ Kỳ','BIST 100'], ['.TA35','IL','Israel','TA-35'],
  ['.N225','JP','Nhật','Nikkei 225'],      ['.KS11','KR','Hàn Quốc','KOSPI'],
  ['.SSEC','CN','Trung Quốc','Shanghai'],  ['.HSI','HK','Hồng Kông','Hang Seng'],
  ['.TWII','TW','Đài Loan','TAIEX'],       ['.NSEI','IN','Ấn Độ','Nifty 50'],
  ['.STI','SG','Singapore','STI'],         ['.KLSE','MY','Malaysia','KLCI'],
  ['.SETI','TH','Thái Lan','SET'],         ['.PSI','PH','Philippines','PSEi'],
  ['.AXJO','AU','Úc','ASX 200'],           ['.NZ50','NZ','New Zealand','NZX 50'],
  /* Đợt mở rộng 13/08/2026 — dò 90 mã trên 63 nước, đây là những mã CNBC thật sự có.
     Loại `.IDX` (nguồn trả "S&P 400 MidCap" của MỸ, không phải Indonesia) và `.IBRX`
     (trùng Brazil đã có `.BVSP`). Không có: Nga, Nam Phi, Ả Rập Xê Út, Ba Lan, Ấn Độ
     (BSE — đang dùng Nifty), Pakistan, Chile, Peru, Romania và ~30 nước nhỏ khác. */
  ['.BFX','BE','Bỉ','BEL 20'],             ['.ISEQ','IE','Ireland','ISEQ'],
  ['.PSI20','PT','Bồ Đào Nha','PSI'],      ['.ATG','GR','Hy Lạp','ATHEX'],
  ['.BUX','HU','Hungary','BUX'],           ['.PX','CZ','Séc','PX'],
  ['.SBITOP','SI','Slovenia','SBITOP'],    ['.OMXC20','DK','Đan Mạch','OMXC 20'],
  ['.OMXH25','FI','Phần Lan','OMXH 25'],   ['.OSEAX','NO','Na Uy','OSEAX'],
  ['.OMXIPI','IS','Iceland','OMXI'],       ['.EGX30','EG','Ai Cập','EGX 30'],
  ['.DFMGI','AE','UAE','DFM General'],     ['.BAX','BH','Bahrain','All Share'],
  ['.AMGNRLX','JO','Jordan','ASE General'],['.MERV','AR','Argentina','S&P Merval'],
  ['.COLCAP','CO','Colombia','MSCI COLCAP'],
];
/* Nguồn không có 4 nước này — nói ra chứ đừng để bản đồ xám mà người xem tự đoán. */
const TG_THIEU='Nga · Nam Phi · Ả Rập Xê Út · Indonesia · Ba Lan · Pakistan · Chile và ~30 nước nhỏ khác (nguồn không có chỉ số)';
/* MỐC ĐẬM NHẤT = ±2%, KHÔNG phải ±3%. Đây là CHỈ SỐ cả sàn chứ không phải một cổ phiếu:
   phần lớn phiên các nước chỉ chạy ±0,3–1%, để thang tới 3% thì ngày thường cả bản đồ
   nằm ở một phần ba dưới của thang, ra một mảng nhợt đúng như user chê. Với chỉ số thì
   2% đã là một ngày lớn — đáng cho nó ăn màu đậm nhất. */
const TG_MOC=2;
/* `view` = KHUNG NHÌN hiện tại của bản đồ (chính là viewBox của thẻ svg). Giữ trong TG
   chứ không đọc ngược từ DOM: panel bị dựng lại mỗi lần đổi giao diện sáng/tối, đọc từ
   DOM là mất mức phóng người dùng vừa đặt. */
let TG={map:null,rows:null,at:0,loi:null,dang:false,hen:null,view:null,keoLuc:0};
/* NHỊP LÀM MỚI BẢN ĐỒ TOÀN CẦU — 30 PHÚT (user chốt 17/08/2026, trước là 2 phút).
   Đây là lượt gọi DUY NHẤT còn tỉ lệ thuận với người xem theo THỜI GIAN MỞ TAB, chứ không
   theo số trang mở: chart gọi một lần rồi đệm lại, còn bản đồ gọi lại đều đặn suốt thời
   gian tab còn mở. Đo ở quy mô 1.000 người: nhịp 2 phút, mỗi người mở radar 2 tiếng ->
   60.000 lượt · 2 GB sang CNBC, VƯỢT cả VNDirect. Nhịp 30 phút cắt còn 1/15.
   Chỉ số chứng khoán nước ngoài không nhảy nhanh tới mức cần 2 phút, mà đây lại đúng là
   bên đã phải gỡ Fear & Greed vì ngại rủi ro — càng không nên nện.
   MỘT hằng số cho cả ba chỗ: hạn đệm mỗi nước, hạn hỏi lại, và hạn coi số là cũ khi vẽ.
   Ba chỗ đó mà lệch nhau là có lượt gọi mạng xong vứt đi, hoặc số đứng im không ai hiểu. */
const TG_HAN=30*60*1000;
const TG_ZMAX=8;                                        // phóng tối đa 8 lần
const tgHep=()=>window.matchMedia('(max-width:640px)').matches;
/* ═══ RỔ CỔ PHIẾU TRỤ CỘT TỪNG NƯỚC — bấm vào bản đồ thì bung ra ═══
   > **KHÔNG phải bảng xếp hạng vốn hoá tự động.** CNBC trả giá và % nhưng KHÔNG trả vốn
   > hoá (đã dò hết 36 trường của bản ghi), mà cũng không có API danh sách thành phần chỉ
   > số nào mở CORS. Nên đây là rổ TRỤ CỘT chọn tay — mấy mã dẫn dắt của từng sàn, đủ để
   > liếc qua thị trường nước đó đang ra sao. Nhãn trên giao diện phải nói đúng như vậy,
   > đừng ghi "10 mã vốn hoá lớn nhất" khi không xếp được theo vốn hoá.
   > RIÊNG VIỆT NAM xếp ĐÚNG theo vốn hoá vì kho của chính trang có số cổ phiếu và giá.

   DẠNG MÃ CỦA CNBC, mỗi sàn một kiểu — đã dò 250 mã mới ra quy luật, đừng đoán:
   · Mỹ: mã trần (AAPL) · phần lớn còn lại: `MÃ-CC` (SAP-DE, BHP-AU)
   · Nhật: `SỐ.T-JP` · Hồng Kông: `SỐ-HK` nhưng phải BỎ SỐ 0 ĐẦU (700-HK, không phải 0700-HK)
   · Thuỵ Điển: `MÃ.HẠNG-SE` (VOLV.B-SE) · Anh có mã kết thúc bằng dấu chấm (BP.-GB)
   KHÔNG CÓ: Hàn Quốc, Mexico, Thổ Nhĩ Kỳ — nguồn chỉ có chỉ số, không có cổ phiếu đơn lẻ
   (đã thử hết mọi dạng mã). Bấm vào ba nước đó thì nói thẳng ra. */
const TG_RO={
 US:["AAPL","MSFT","NVDA","GOOGL","AMZN","META","AVGO","TSLA","BRK.B","JPM"],
 JP:["7203.T-JP","6758.T-JP","8306.T-JP","6861.T-JP","9984.T-JP","6501.T-JP","7974.T-JP","8035.T-JP","9433.T-JP","4063.T-JP"],
 HK:["700-HK","9988-HK","939-HK","1398-HK","3690-HK","941-HK","1299-HK","388-HK","2318-HK","5-HK"],
 CN:["600519-CN","601398-CN","601857-CN","600036-CN","601288-CN","600941-CN","601988-CN","600900-CN","601628-CN","600028-CN"],
 TW:["2330-TW","2317-TW","2454-TW","2308-TW","2881-TW","2882-TW","2412-TW","3711-TW","2891-TW","1216-TW"],
 IN:["RELIANCE-IN","TCS-IN","HDFCBANK-IN","ICICIBANK-IN","INFY-IN","BHARTIARTL-IN","SBIN-IN","LT-IN","ITC-IN","HINDUNILVR-IN"],
 GB:["AZN-GB","SHEL-GB","HSBA-GB","ULVR-GB","BP.-GB","RIO-GB","GSK-GB","DGE-GB","BATS-GB","LSEG-GB"],
 DE:["SAP-DE","SIE-DE","ALV-DE","DTE-DE","MBG-DE","BMW-DE","MUV2-DE","BAS-DE","IFX-DE","DBK-DE"],
 FR:["MC-FR","OR-FR","TTE-FR","SAN-FR","AIR-FR","SU-FR","RMS-FR","BNP-FR","AI-FR","EL-FR"],
 CH:["NESN-CH","NOVN-CH","UBSG-CH","ZURN-CH","ABBN-CH","CFR-CH","LONN-CH","SIKA-CH","GIVN-CH","ALC-CH"],
 NL:["ASML-NL","INGA-NL","HEIA-NL","PRX-NL","AD-NL","PHIA-NL","ADYEN-NL","WKL-NL","KPN-NL","RAND-NL"],
 IT:["ENEL-IT","ISP-IT","UCG-IT","ENI-IT","STLAM-IT","G-IT","MB-IT","TIT-IT","PST-IT","RACE-IT"],
 ES:["ITX-ES","IBE-ES","SAN-ES","BBVA-ES","REP-ES","AENA-ES","FER-ES","TEF-ES","AMS-ES","CLNX-ES"],
 SE:["INVE.B-SE","ATCO.A-SE","VOLV.B-SE","ERIC.B-SE","HM.B-SE","SEB.A-SE","SAND-SE","ASSA.B-SE","SWED.A-SE","EQT-SE"],
 CA:["RY-CA","TD-CA","SHOP-CA","ENB-CA","CNR-CA","BMO-CA","BNS-CA","CP-CA","SU-CA","TRP-CA"],
 AU:["BHP-AU","CBA-AU","CSL-AU","NAB-AU","WBC-AU","ANZ-AU","WES-AU","MQG-AU","RIO-AU","FMG-AU"],
 SG:["D05-SG","O39-SG","U11-SG","Z74-SG","C6L-SG","S63-SG","BN4-SG","F34-SG","A17U-SG","C38U-SG"],
 TH:["PTT-TH","AOT-TH","CPALL-TH","ADVANC-TH","SCB-TH","KBANK-TH","PTTEP-TH","BDMS-TH","GULF-TH","SCC-TH"],
 MY:["MAYBANK-MY","PBBANK-MY","TENAGA-MY","CIMB-MY","PCHEM-MY","IHH-MY","MISC-MY","PETGAS-MY","HLBANK-MY","AXIATA-MY"],
 PH:["SM-PH","BDO-PH","SMPH-PH","ALI-PH","BPI-PH","JFC-PH","ICT-PH","AC-PH","TEL-PH","URC-PH"],
 BR:["VALE3-BR","PETR4-BR","ITUB4-BR","BBDC4-BR","ABEV-BR","B3SA3-BR","WEGE3-BR","BBAS3-BR","SUZB3-BR","RENT3-BR"],
 IL:["TEVA-IL","LUMI-IL","POLI-IL","NICE-IL","ESLT-IL","ICL-IL","MZTF-IL","DSCT-IL","TSEM-IL","AZRG-IL"],
 NZ:["FPH-NZ","AIA-NZ","MEL-NZ","IFT-NZ","SPK-NZ","MCY-NZ","EBO-NZ","CEN-NZ","POT-NZ","ATM-NZ"],
};
/* TÊN HIỆN TRÊN Ô NHIỆT.
   Hai lý do phải có bảng này:
   ① **Thượng Hải, Tokyo, Hồng Kông, Đài Bắc đánh mã bằng SỐ** (600519, 7203, 700, 2330).
      Đó là mã thật của sàn, không phải lỗi — nhưng nhìn dãy số thì không ai đoán ra công ty
      nào, cả thẻ thành một mớ số vô nghĩa. Nên bốn sàn đó hiện TÊN thay cho mã. Tên rút từ
      chính tên nguồn trả về, không bịa. Mã số và tên đầy đủ vẫn nằm ở `title`.
   ② Vài sàn (Ấn Độ) đặt mã chữ rất dài, ô hẹp cắt thành "BHARTIA…" — rút về đúng cách thị
      trường đó gọi tắt.
   Sàn dùng mã CHỮ gợi nhớ (AAPL, SAP, BMW, NESN) thì giữ nguyên mã: ngắn và là thứ người ta
   tra cứu, đổi sang tên chỉ tốn chỗ. */
const TG_TEN={
 // Trung Quốc (Thượng Hải)
 "600519-CN":"Moutai","601398-CN":"ICBC","601857-CN":"PetroChina","600036-CN":"CM Bank",
 "601288-CN":"AgBank","600941-CN":"ChinaMob","601988-CN":"BoC","600900-CN":"Yangtze",
 "601628-CN":"China Life","600028-CN":"Sinopec",
 // Nhật (Tokyo)
 "7203.T-JP":"Toyota","6758.T-JP":"Sony","8306.T-JP":"MUFG","6861.T-JP":"Keyence",
 "9984.T-JP":"SoftBank","6501.T-JP":"Hitachi","7974.T-JP":"Nintendo","8035.T-JP":"TokyoElec",
 "9433.T-JP":"KDDI","4063.T-JP":"Shin-Etsu",
 // Hồng Kông
 "700-HK":"Tencent","9988-HK":"Alibaba","939-HK":"CCB","1398-HK":"ICBC","3690-HK":"Meituan",
 "941-HK":"ChinaMob","1299-HK":"AIA","388-HK":"HKEX","2318-HK":"Ping An","5-HK":"HSBC",
 // Đài Loan
 "2330-TW":"TSMC","2317-TW":"Hon Hai","2454-TW":"MediaTek","2308-TW":"Delta","2881-TW":"Fubon",
 "2882-TW":"Cathay","2412-TW":"Chunghwa","3711-TW":"ASE","2891-TW":"CTBC","1216-TW":"Uni-Pres",
 // Ấn Độ — mã chữ nhưng quá dài
 "HDFCBANK-IN":"HDFC","ICICIBANK-IN":"ICICI","BHARTIARTL-IN":"BHARTI",
 "HINDUNILVR-IN":"HUL","RELIANCE-IN":"RIL"};
let TGC={};        // đệm theo nước, đỡ gọi lại mỗi lần bấm

/* ═══ THANG MÀU ═══
   NỘI SUY MÀU THẬT, KHÔNG tô bằng alpha đè lên nền. Bản đầu dùng rgba(...,a): trên nền
   TỐI thì rực, nhưng trên nền SÁNG cùng alpha ấy đè lên trắng ra pastel — cả bản đồ nhợt,
   chỉ mã gần kịch thang mới nhìn thấy (user báo "loá mắt và không rõ"). Nội suy giữa hai
   đầu màu ĐẶT RIÊNG CHO TỪNG GIAO DIỆN thì hai bên đều no màu.
   Vẫn cấm color-mix() — html2canvas của nút chụp ảnh không hiểu, ảnh ra trắng bệch.

   GAMMA 0.6 chứ không tuyến tính: phần lớn phiên các nước chỉ nhúc nhích ±0,3%, để tuyến
   tính thì cả bản đồ một màu nhờ nhờ đúng cái đang bị chê. Gamma <1 kéo khoảng nhỏ ra
   trước, ±0,3% đã thấy rõ tông mà ±3% vẫn là đậm nhất. */
const TG_THANG={
  //            đất không số   nền biển   nét viền   0%(vàng)   xanh nhạt→đậm        đỏ nhạt→đậm
  light:{nen:[197,206,219], bien:'#e3e9f1', net:'#ffffff', pl:[236,213,148],
         g0:[188,229,207], g1:[7,124,77],   r0:[250,206,211], r1:[186,32,48]},
  dark :{nen:[44,53,72],   bien:'#161c29', net:'#1b2130', pl:[128,102,32],
         g0:[32,74,62],    g1:[46,214,150], r0:[74,38,48],   r1:[247,92,104]},
};
/* CHỮ TRÊN Ô NHIỆT phải tự chọn đen hay trắng theo độ sáng của chính ô đó — thang chạy
   từ nhạt tới đậm nên để cứng một màu chữ là nửa số ô không đọc nổi. Ngưỡng 0,62 theo
   độ sáng cảm nhận (hệ số 0.299/0.587/0.114), đo mắt trên cả hai giao diện. */
function tgChu(rgb){
  const m=/(\d+),\s*(\d+),\s*(\d+)/.exec(rgb); if(!m) return 'inherit';
  const L=(0.299*+m[1]+0.587*+m[2]+0.114*+m[3])/255;
  return L>0.62?'#12161f':'#ffffff';
}
const tgPha=(a,b,k)=>'rgb('+Math.round(a[0]+(b[0]-a[0])*k)+','
  +Math.round(a[1]+(b[1]-a[1])*k)+','+Math.round(a[2]+(b[2]-a[2])*k)+')';
function tgBang(){ return TG_THANG[isLight()?'light':'dark']; }
function tgMau(p){
  const T=tgBang();
  if(p==null) return tgPha(T.nen,T.nen,0);
  if(Math.abs(p)<0.05) return tgPha(T.pl,T.pl,0);
  const k=Math.pow(Math.min(1,Math.abs(p)/TG_MOC),0.6);
  return p>0?tgPha(T.g0,T.g1,k):tgPha(T.r0,T.r1,k);
}
function tgPct(p){ return p==null?'—':(p>0?'+':'')+p.toFixed(2)+'%'; }
/* SỐ NÀY CŨ BAO NHIÊU? Đây mới là thứ người xem cần trên một bản đồ trải 24 múi giờ:
   Thái Lan hiện −0,72% mà là số của PHIÊN HÔM QUA thì đọc khác hẳn.
   ĐÃ THỬ VÀ BỎ trường `curmktstatus` của CNBC: nó trả REG_MKT cho MỌI mã, kể cả Nikkei
   lúc 15:45 JST (Tokyo đóng 15:00) và Thái Lan với con số từ hôm trước — tức là hằng số
   chứ không phải trạng thái. Dán nhãn "đang mở" theo nó là nói sai, mà lại sai một cách
   trông rất chắc chắn. Nên tự tính tuổi từ `last_time` (ISO có sẵn lệch múi giờ). */
function tgTuoi(iso){
  if(!iso) return null;
  const t=Date.parse(iso); if(isNaN(t)) return null;
  return Math.max(0,(Date.now()-t)/60000);      // phút
}
function tgCu(ph){
  if(ph==null) return '';
  if(ph<90) return 'vừa xong';
  if(ph<20*60) return Math.round(ph/60)+' giờ trước';
  return 'phiên trước';
}

async function tgLoad(){
  if(TG.dang) return; TG.dang=true;
  try{
    if(!TG.map) TG.map=await fetch('assets/worldmap.json?v=2').then(r=>r.json());
    const q=TG_NUOC.map(r=>r[0].replace('.','%2E')).join('%7C');
    const j=await fetch('https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol'
      +'?symbols='+q+'&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json')
      .then(r=>r.json());
    let arr=(j.FormattedQuoteResult||{}).FormattedQuote||[];
    if(!Array.isArray(arr)) arr=[arr];
    const by={}; arr.forEach(x=>{ if(x&&x.symbol) by[x.symbol]=x; });
    const rows=[];
    for(const [sym,iso,ten,chiSo] of TG_NUOC){
      const x=by[sym]||{};
      /* change_pct là CHUỖI kiểu "+0.83%", và "UNCH" khi đứng giá — parseFloat("UNCH")
         ra NaN nên phải bắt riêng, bằng không New Zealand thành "không có dữ liệu". */
      const raw=x.change_pct;
      let p=null, moi=false;
      if(raw!=null){
        if(/UNCH/i.test(raw)){
          /* "UNCH" có HAI nghĩa khác hẳn nhau, phải tách ra:
             · last ≠ previous_close  -> phiên đó đóng cửa ĐÚNG BẰNG tham chiếu, 0% là thật.
             · last = previous_close TỚI TỪNG CHỮ SỐ -> nguồn đã lật sang PHIÊN MỚI và mã
               chưa khớp lệnh nào; 0% ở đây là bịa. Đo 03:00 giờ VN: 8 nước trong rổ đang
               ở trạng thái này (Đức, Pháp, Thuỵ Sĩ, Tây Ban Nha, Hà Lan, Thuỵ Điển, Thổ,
               Israel) — tô vàng "tham chiếu" hết cho cả châu Âu trong khi họ vừa đóng cửa
               với mức tăng giảm thật. Đúng con bệnh cờ `nt` của cổ phiếu Việt, chỉ khác
               nguồn. Không biết thì để TRỐNG, đừng vẽ 0. */
          const L=String(x.last||''), P=String(x.previous_day_closing||'');
          if(L&&L===P){ p=null; moi=true; } else p=0;
        } else { const v=parseFloat(String(raw).replace(/[+%,]/g,'')); if(!isNaN(v)) p=v; }
      }
      rows.push({iso,ten,chiSo,p,moi,gia:x.last||null,tuoi:tgTuoi(x.last_time),
                 gio:x.last_timedate||'',tz:x.timeZone||'',rt:x.realTime===true||x.realTime==='true'});
    }
    /* VIỆT NAM lấy số của chính mình — xem chú thích đầu khối. */
    const vn=(ST.indices||[]).find(i=>i.name==='VNINDEX');
    if(vn) rows.push({iso:'VN',ten:'Việt Nam',chiSo:'VN-Index',p:vn.chg,
      gia:vn.value?vn.value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):null,
      tuoi:0,gio:'bảng điện CPVN',tz:'ICT',rt:true,nha:1});
    TG.rows=rows; TG.at=Date.now(); TG.loi=null;
  }catch(e){ TG.loi=String(e&&e.message||e); }
  TG.dang=false;
}

/* ═══ BẤM VÀO MỘT NƯỚC -> BUNG BẢNG CỔ PHIẾU TRỤ CỘT ═══ */
async function tgLayCo(iso){
  if(TGC[iso]&&Date.now()-TGC[iso].at<TG_HAN) return TGC[iso];
  if(iso==='VN'){
    /* Việt Nam xếp ĐÚNG theo vốn hoá — kho của chính trang có SLCP và giá sống.
       Ưu tiên mcapLive (giá trong phiên) rồi mới tới mcap của kho. */
    const co=ST.list.filter(c=>(c.mcapLive||c.mcap)>0)
      .sort((a,b)=>(b.mcapLive||b.mcap)-(a.mcapLive||a.mcap)).slice(0,10)
      .map(c=>({ma:c.sym,ten:c.name||'',gia:c.close?Math.round(c.close).toLocaleString('en-US'):null,
                p:c.nt?null:c.chg}));
    return TGC[iso]={rows:co,at:Date.now(),xepVon:true};
  }
  const ro=TG_RO[iso]; if(!ro) return TGC[iso]={rows:null,at:Date.now()};
  try{
    const j=await fetch('https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol'
      +'?symbols='+ro.map(x=>encodeURIComponent(x)).join('%7C')
      +'&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json').then(r=>r.json());
    let a=(j.FormattedQuoteResult||{}).FormattedQuote||[]; if(!Array.isArray(a)) a=[a];
    const by={}; a.forEach(x=>{ if(x&&x.symbol) by[x.symbol]=x; });
    const rows=ro.map(sym=>{
      const x=by[sym]||{}, raw=x.change_pct; let p=null;
      if(raw!=null){ if(/UNCH/i.test(raw)) p=0; else { const v=parseFloat(String(raw).replace(/[+%,]/g,'')); if(!isNaN(v)) p=v; } }
      /* hiện MÃ NGẮN, bỏ đuôi sàn: "7203.T-JP" -> "7203", "BP.-GB" -> "BP" */
      const goc=sym.replace(/[.-][A-Z]{2}$/,'').replace(/\.T$/,'').replace(/\.$/,'');
      return {ma:TG_TEN[sym]||goc, goc,
              ten:x.name||x.shortName||'',gia:x.last||null,p};
    }).filter(r=>r.gia!=null);
    return TGC[iso]={rows,at:Date.now()};
  }catch(e){ return TGC[iso]={rows:[],at:Date.now(),loi:String(e&&e.message||e)}; }
}
/* NHIỀU THẺ CÙNG LÚC, MỖI THẺ NEO TẠI CHỖ NƯỚC ĐÓ.
   Bản đầu là MỘT bảng chắn giữa bản đồ: mở nước thứ hai là mất nước thứ nhất, mà so hai
   thị trường với nhau mới là việc người ta làm ở đây. Nay mỗi nước một thẻ nhỏ đặt cạnh
   chính nó, mở bao nhiêu cái cũng được, bấm lại vào nước đang mở thì đóng thẻ ấy.
   KHÔNG có lớp nền mờ phía sau: có nó thì mở xong thẻ đầu là không bấm được nước thứ hai
   nữa — đúng thứ chặn mất tính năng này. */
let tgZ=20, tgGiu=false;
/* Vẽ lại RIÊNG phần trong nước của Radar phiên, giữ nguyên node bản đồ.
   Nhấc node thật ra rồi cắm lại (không clone): clone là mất sạch listener kéo thẻ và
   mọi thẻ nước đang mở. Cờ tgGiu bảo renderRadar đừng dựng lại ruột bản đồ. */
function veLaiTrongNuoc(){
  const el=$('#rdTg'); const R=MODULES.find(x=>x.id==='radar');
  if(!el){ R.render(); return; }
  el.parentNode.removeChild(el);
  tgGiu=true; R.render(); tgGiu=false;
  const moi=$('#rdTg'); if(moi&&moi.parentNode) moi.parentNode.replaceChild(el,moi);
}

function tgViTri(el,iso){
  /* MÀN HẸP: bản đồ chỉ cao ~146px trong khi một thẻ cao ~180px — neo "cạnh nước" là bất
     khả thi. Ở khổ đó cho thẻ XẾP CHỒNG NGAY DƯỚI bản đồ (CSS lo bố cục). */
  /* MÀN HẸP: thẻ NỔI ĐÈ LÊN bản đồ (user chốt), và vì bản đồ chỉ 329×146 nên không neo
     cạnh nước được — thẻ gần to bằng cả bản đồ. Đặt GIỮA, coi như một tấm che. */
  if(window.matchMedia('(max-width:640px)').matches){
    const w0=$('#tgMap')||$('#tgWrap'); if(!w0) return;
    const w=el.offsetWidth||248, h=el.offsetHeight||180;
    el.style.left=Math.max(2,(w0.clientWidth-w)/2)+'px';
    el.style.top =Math.max(2,(w0.clientHeight-h)/2)+'px';
    return;
  }
  const M=TG.map, wrap=$('#tgWrap'); if(!M||!wrap) return;
  const W=wrap.clientWidth, H=wrap.clientHeight;
  const w=el.offsetWidth||236, h=el.offsetHeight||180;
  /* thẻ người dùng ĐÃ TỰ KÉO thì giữ nguyên chỗ họ đặt — nhớ theo TỈ LỆ khung, để đổi bề
     ngang cửa sổ thì thẻ vẫn nằm đúng chỗ tương đối chứ không trôi ra ngoài */
  if(el.dataset.keo){
    el.style.left=Math.max(4,Math.min(W-w-4,(el._fx||0)*W))+'px';
    el.style.top =Math.max(4,Math.min(H-h-4,(el._fy||0)*H))+'px';
    return;
  }
  const p=(M.c[iso]||M.cham[iso]); if(!p) return;
  const k=W/M.w, cx=p.cx*k, cy=p.cy*k;
  /* TÁM CHỖ ĐẶT ỨNG VIÊN quanh nước. Bản đầu chỉ có một chỗ (chéo xuống phải) nên hai
     nước gần nhau là thẻ chồng gần kín nhau, phải kéo tay ra mới đọc được. Nay chấm điểm
     từng chỗ: phạt NẶNG phần diện tích chồng lên thẻ đang mở, phạt NHẸ khoảng cách tới
     nước — nên nó tự tìm chỗ trống gần nhất thay vì đè lên thẻ cũ. */
  const U=[[cx+14,cy+10],[cx-w-14,cy+10],[cx+14,cy-h-10],[cx-w-14,cy-h-10],
           [cx-w/2,cy+18],[cx-w/2,cy-h-18],[cx+14,cy-h/2],[cx-w-14,cy-h/2]];
  const khac=[...wrap.querySelectorAll('.tgcard')].filter(x=>x!==el).map(x=>({
    l:parseFloat(x.style.left)||0,t:parseFloat(x.style.top)||0,w:x.offsetWidth,h:x.offsetHeight}));
  const chong=(l,t)=>khac.reduce((a,o)=>a
    +Math.max(0,Math.min(l+w,o.l+o.w)-Math.max(l,o.l))
    *Math.max(0,Math.min(t+h,o.t+o.h)-Math.max(t,o.t)),0);
  let tot=null,diem=Infinity;
  for(const [x0,y0] of U){
    const l=Math.max(4,Math.min(W-w-4,x0)), t=Math.max(4,Math.min(H-h-4,y0));
    const d=Math.hypot(l+w/2-cx,t+h/2-cy);
    const e=chong(l,t)/60+d;                 // 60 = quy diện tích chồng về cùng thang với px
    if(e<diem){ diem=e; tot=[l,t]; }
  }
  el.style.left=tot[0]+'px'; el.style.top=tot[1]+'px';
}
/* KÉO THẺ bằng thanh tiêu đề. Ghi vị trí theo TỈ LỆ khung chứ không phải px tuyệt đối,
   để đổi cỡ cửa sổ thì thẻ giữ đúng chỗ tương đối. Nút ✕ không được biến thành tay cầm. */
function tgKeo(el){
  const th=el.querySelector('.tgch'), wrap=$('#tgWrap'); if(!th||!wrap) return;
  th.addEventListener('pointerdown',e=>{
    if(e.target.closest('.tgcx')) return;
    if(window.matchMedia('(max-width:640px)').matches) return;   // màn hẹp: thẻ xếp cột, không kéo
    const b=el.getBoundingClientRect(), wb=wrap.getBoundingClientRect();
    const dx=e.clientX-b.left, dy=e.clientY-b.top;
    el.style.zIndex=++tgZ; el.dataset.keo='1'; th.classList.add('keo');
    const mv=ev=>{
      const l=Math.max(4,Math.min(wrap.clientWidth-el.offsetWidth-4,ev.clientX-wb.left-dx));
      const t=Math.max(4,Math.min(wrap.clientHeight-el.offsetHeight-4,ev.clientY-wb.top-dy));
      el.style.left=l+'px'; el.style.top=t+'px';
      el._fx=l/wrap.clientWidth; el._fy=t/wrap.clientHeight;
    };
    const up=()=>{ th.classList.remove('keo');
      document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up); };
    document.addEventListener('pointermove',mv); document.addEventListener('pointerup',up);
    e.preventDefault();
  });
}
function tgMoBang(iso){
  const by={}; (TG.rows||[]).forEach(r=>by[r.iso]=r);
  const n=by[iso]; if(!n) return;
  const oi=$('#tgPops'); if(!oi) return;
  const cu=oi.querySelector('.tgcard[data-c="'+iso+'"]');
  if(cu){ cu.remove(); tgNutDong(); return; }        // bấm lại nước đang mở -> đóng
  /* MÀN HẸP: MỖI LẦN MỘT NƯỚC. Máy bàn mở nhiều thẻ để so hai thị trường, nhưng ở khổ
     329px thẻ gần to bằng bản đồ nên hai thẻ là chồng kín nhau, không so được gì. */
  if(window.matchMedia('(max-width:640px)').matches)
    oi.querySelectorAll('.tgcard').forEach(x=>x.remove());
  const el=document.createElement('div');
  el.className='tgcard'; el.dataset.c=iso; el.style.zIndex=++tgZ;
  const dau='<div class="tgch"><b>'+esc(n.ten)+'</b>'
    +'<span class="tgcp '+(n.p==null?'':cls(n.p))+'">'+tgPct(n.p)+'</span>'
    +'<button class="tgcx" aria-label="Đóng">✕</button></div>';
  el.innerHTML=dau+'<div class="tgce">Đang lấy…</div>';
  oi.appendChild(el); tgViTri(el,iso); tgKeo(el); tgNutDong();
  /* thẻ nào bấm vào cũng nhảy lên trên cùng — mấy nước sát nhau thì thẻ chồng nhau */
  el.onmousedown=()=>{ el.style.zIndex=++tgZ; };
  el.querySelector('.tgcx').onclick=ev=>{ ev.stopPropagation(); el.remove(); tgNutDong(); };
  tgLayCo(iso).then(d=>{
    if(!el.isConnected) return;
    let ruot;
    /* Nói RÕ nguồn nào và thiếu ở mức nào. Câu cũ ("nguồn không có cổ phiếu đơn lẻ của
       nước này") nói trống quá nên đọc như chống chế — user hỏi thẳng "cái này là thật ư".
       Đã kiểm hai đường: API trả rỗng cho cả 44 dạng mã của Samsung/SK Hynix/Hyundai, và
       trang quote của chính cnbc.com trả 404 cho mã sàn Hàn trong khi vẫn 200 cho KOSPI,
       Apple, Toyota. Thứ duy nhất có là chứng chỉ lưu ký Samsung niêm yết ở London
       (SMSN-GB) — khác sàn, khác tiền tệ, khác phiên, nên không gán vào đây. */
    if(!d.rows) ruot='<div class="tgce">CNBC chỉ cung cấp <b>chỉ số</b> của nước này, '
      +'không có dữ liệu từng cổ phiếu trên sàn.</div>';
    else if(!d.rows.length) ruot='<div class="tgce">Không lấy được danh sách.</div>';
    /* LƯỚI Ô NHIỆT thay cho danh sách dọc: màu đọc nhanh hơn số, liếc một cái là biết
       sàn đó đang xanh hay đỏ mà không phải quét mắt qua 10 dòng. Giá đưa vào `title`,
       để trong ô thì chữ chen nhau mà cũng không phải thứ cần biết ngay.
       Ô ĐỀU NHAU, không chia theo vốn hoá: nguồn không trả vốn hoá cho cổ phiếu nước
       ngoài (xem chú thích ở TG_RO) nên vẽ ô to nhỏ khác nhau là bịa ra một trọng số. */
    else ruot='<div class="tgheat">'+d.rows.map(r=>{
        const bg=tgMau(r.p);
        return '<div class="tgt" style="background:'+bg+';color:'+tgChu(bg)+'"'
          +' title="'+esc((r.goc&&r.goc!==r.ma?r.goc+' · ':'')+r.ten)+' — '+esc(String(r.gia))+'">'
          +'<b>'+esc(r.ma)+'</b><i>'+tgPct(r.p)+'</i></div>'; }).join('')
      +'</div><div class="tgcn">'+(d.xepVon?'10 mã vốn hoá lớn nhất'
        :'10 mã trụ cột — ô đều nhau, không phải trọng số vốn hoá')+'</div>';
    el.innerHTML=dau+ruot;
    el.querySelector('.tgcx').onclick=ev=>{ ev.stopPropagation(); el.remove(); tgNutDong(); };
    tgKeo(el);
    tgViTri(el,iso);           // đo lại sau khi có ruột thật, thẻ cao lên thì né lại cho đúng
  });
}
function tgDongBang(){ const o=$('#tgPops');
  if(o) o.querySelectorAll('.tgcard').forEach(x=>x.remove());   // giữ lại nút, chỉ dọn thẻ
  tgNutDong(); }
/* nút "đóng tất cả" chỉ mọc khi có từ HAI thẻ trở lên — một thẻ thì cái ✕ của nó là đủ */
function tgNutDong(){
  const o=$('#tgPops'), b=$('#tgDongHet'); if(!o||!b) return;
  b.style.display=o.querySelectorAll('.tgcard').length>1?'':'none';
}

/* ═══ NHỊP RIÊNG CHO BẢN ĐỒ THẾ GIỚI ═══
   Nhịp sống của trang bị khoá theo PHIÊN VIỆT NAM (9:00–15:00 T2–T6) vì nó sinh ra để bơm
   giá cổ phiếu trong nước. Nhưng thế giới giao dịch đúng vào lúc VN đã nghỉ: Mỹ mở 20:30
   giờ VN, châu Âu chạy tới nửa đêm. Ăn theo nhịp kia thì mở bản đồ lúc 9 giờ tối để xem Mỹ
   là số đứng im. Nên mục này có nhịp của riêng nó, không hỏi giờ Việt Nam.
   CẬP NHẬT TẠI CHỖ, không dựng lại panel: dựng lại là mọi thẻ nước đang mở bay sạch. */
/* ═══ NHÃN NGAY TRÊN BẢN ĐỒ ═══
   Bản trước để tên nước và % ở một BẢNG DÀI phía dưới: muốn biết mảng màu kia là nước nào
   phải rê chuột hoặc dò xuống bảng. Nay in thẳng lên bản đồ — tên trên, % dưới.
   44 nhãn không thể nhét hết vào một tấm 1000×439, riêng châu Âu đã hơn chục nước chen
   nhau, nên phải XẾP THAM LAM: ưu tiên nước biến động mạnh nhất (đó là thứ người ta muốn
   thấy trước), thử 5 chỗ quanh nước, chỗ nào chưa bị chiếm thì đặt; hết chỗ thì BỎ nhãn
   đó — nước vẫn còn màu và vẫn rê/bấm ra được, chứ chồng chữ lên nhau thì không đọc nổi
   cái nào. Ước lượng bề rộng bằng 4,3 đơn vị/ký tự: đo bằng canvas thì chính xác hơn
   nhưng phải dựng context riêng mỗi lượt vẽ, không đáng cho vài chục nhãn. */
function tgNhan(M,by,view){
  /* KHUNG NHÌN quyết định hai thứ, và cả hai đều bắt buộc khi có phóng to:
     ① đặt nhãn cho NƯỚC NÀO — chỉ nước đang nhìn thấy, nên phóng vào châu Âu là mấy
        nhãn bị bỏ ở mức 1× nay hiện đủ, đúng thứ người ta phóng vào để đọc;
     ② nhãn to bao nhiêu ĐƠN VỊ viewBox — phóng 3 lần mà giữ nguyên cỡ khai trong CSS
        thì chữ cũng to gấp 3 trên màn, trùm kín chính mấy nước vừa phóng vào để xem.
     Ở mức 1× mọi phép tính dưới đây ra đúng con số cũ, nên máy bàn không đổi gì. */
  const V=view||{x:0,y:0,w:M.w,h:M.h}, z=M.w/V.w;
  const ds=[];
  for(const iso in by){
    const g=M.c[iso]||M.cham[iso]; if(!g) continue;
    if(g.cx<V.x||g.cx>V.x+V.w||g.cy<V.y||g.cy>V.y+V.h) continue;   // ngoài khung nhìn
    const r=by[iso];
    /* VIỆT NAM luôn đứng đầu hàng ưu tiên, không xếp theo biên độ như các nước khác.
       Đây là trang chứng khoán Việt — để nó tranh chỗ bằng biên độ thì một phiên đi
       ngang (+0,13%) là mất nhãn, nhường chỗ cho Thái Lan hay Philippines. Đã dính đúng
       vậy ở lượt đầu. */
    ds.push({iso,r,cx:g.cx,cy:g.cy,uu:iso==='VN'?1e9:(r.p==null?-1:Math.abs(r.p))});
  }
  ds.sort((a,b)=>b.uu-a.uu);
  /* CỠ CHỮ ĐỔI THEO KHỔ MÀN nên phép đo chỗ trống cũng phải đổi theo. Bản đầu tính bằng
     hằng số của máy bàn, chạy trên điện thoại thì CSS phóng chữ lên gấp ba mà thuật toán
     vẫn tưởng nhãn bé tí — xếp đủ 38 cái chồng lên nhau thành một mảng chữ. */
  const hep=tgHep();
  const CH=(hep?26:7.6)/z, RC=(hep?14.5:4.3)/z;
  /* Cỡ chữ và bề dày quầng viền phải chia theo mức phóng, mà cỡ khai trong CSS thì cố
     định — nên khai THẲNG vào từng thẻ. Inline style thắng class nên khỏi cần !important. */
  const F1=(hep?25:7.4)/z, F2=(hep?24:7.2)/z, SW=(hep?7:2.4)/z;
  /* GIỮ CHỖ cho hai hộp chỉ số sức mạnh ở góc dưới-trái: thuật toán xếp nhãn không nhìn
     thấy chúng (hộp là HTML phủ lên, không nằm trong SVG) nên phải khai tay, bằng không
     có ngày một nước Nam Mỹ được đặt nhãn ngay dưới hộp và biến mất. Ở màn hẹp hộp đã dời
     ra ngoài bản đồ nên không cần giữ chỗ. */
  /* Giữ chỗ cho hai hộp chỉ số sức mạnh ở góc dưới-trái. Màn hẹp bản đồ co lại nên hộp
     chiếm phần lớn hơn hẳn theo tỉ lệ, phải khai ô rộng hơn. */
  /* Hộp là HTML phủ lên, neo vào GÓC MÀN của bản đồ — nên trong hệ toạ độ viewBox nó
     TRÔI THEO khung nhìn và co lại theo mức phóng, chứ không đứng yên ở góc bản đồ. */
  const bw=(hep?205:140)/z, bh=(hep?215:90)/z;
  const oc=[{l:V.x,t:V.y+V.h-bh,w:bw,h:bh}], ra=[];
  /* Nút "về khung ban đầu" ở góc 1 giờ CHỈ MỌC KHI ĐÃ PHÓNG — giữ chỗ cho nó đúng lúc
     đó. Cùng bài học với hộp chỉ số: thuật toán không nhìn thấy thứ dựng bằng HTML, không
     khai tay thì có ngày một nhãn nằm lọt dưới nút rồi biến mất. 116 đơn vị viewBox ở mức
     1× ≈ 38px thật trên khổ hẹp, đúng cỡ nút cộng lề. */
  if(hep&&z>1.02){ const s=116/z; oc.push({l:V.x+V.w-s,t:V.y,w:s,h:s}); }
  for(const d of ds){
    const t1=d.r.ten, t2=tgPct(d.r.p);
    const w=Math.max(t1.length,t2.length)*RC+4/z, h=CH*2+2/z;
    /* TÁM chỗ thử thay vì năm: cụm châu Âu chen nhau nên năm chỗ là rớt gần hết mấy
       nước nhỏ. Thứ tự từ gần ra xa, để nhãn vẫn bám sát nước của nó. */
    const U=[[d.cx,d.cy],[d.cx,d.cy-h],[d.cx,d.cy+h],[d.cx-w*0.7,d.cy],[d.cx+w*0.7,d.cy],
             [d.cx-w*0.7,d.cy-h],[d.cx+w*0.7,d.cy-h],[d.cx,d.cy-h*2],[d.cx,d.cy+h*2]];
    let ok=null;
    const m=1/z;                                  // mép chừa 1px thật, bất kể mức phóng
    for(const [x,y] of U){
      const l=clamp(x-w/2,V.x+m,Math.max(V.x+m,V.x+V.w-w-m));
      const t=clamp(y-h/2,V.y+m,Math.max(V.y+m,V.y+V.h-h-m));
      if(!oc.some(o=>l<o.l+o.w&&l+w>o.l&&t<o.t+o.h&&t+h>o.t)){ ok={l,t,w,h}; break; }
    }
    if(!ok) continue;
    oc.push(ok); ra.push({d,ok,t1,t2});
  }
  const vien=tgBang().bien;
  const st=f=>'stroke:'+vien+';stroke-width:'+SW.toFixed(2)+'px;font-size:'+f.toFixed(2)+'px';
  return ra.map(({d,ok,t1,t2})=>{
    const x=(ok.l+ok.w/2).toFixed(1);
    return '<text class="tgl1" x="'+x+'" y="'+(ok.t+CH-CH*0.16).toFixed(1)+'" style="'+st(F1)+'">'+esc(t1)+'</text>'
      +'<text class="tgl2 '+(d.r.p==null?'tglx':cls(d.r.p))+'" x="'+x+'" y="'+(ok.t+CH*2-1/z).toFixed(1)+'" style="'+st(F2)+'">'+t2+'</text>';
  }).join('');
}

/* ═══ PHÓNG TO · KÉO BẢN ĐỒ (CHỈ KHỔ HẸP) ═══════════════════════════════════════════
   Làm bằng viewBox của thẻ svg chứ không phải transform: cả hình nước, chấm tròn lẫn
   nhãn cùng đi theo một khung toạ độ, và `vector-effect:non-scaling-stroke` của .tgc
   giữ nét biên giới đúng một bề dày ở mọi mức phóng.
   MÁY BÀN KHÔNG ĐỤNG TỚI: ở đó bản đồ rộng gấp ba, đọc thẳng được, mà mọi thao tác
   chuột hiện có (rê ra thẻ nhỏ, bấm mở thẻ nước, kéo thẻ) phải giữ nguyên. */
const tgViewGoc=()=>TG.map?{x:0,y:0,w:TG.map.w,h:TG.map.h}:null;
const tgVBox=()=>{ const v=TG.view||tgViewGoc();
  return v?[v.x,v.y,v.w,v.h].map(n=>+n.toFixed(2)).join(' '):'0 0 1000 500'; };
/* GIỮ ĐÚNG TỈ LỆ KHUNG và không cho kéo ra ngoài mép bản đồ. Tỉ lệ mà lệch thì phép đổi
   toạ độ màn ↔ toạ độ bản đồ không còn đồng nhất hai trục, điểm neo lúc phóng trượt đi. */
function tgKep(v){
  const M=TG.map; if(!M) return v;
  v.w=clamp(v.w,M.w/TG_ZMAX,M.w); v.h=v.w*M.h/M.w;
  v.x=clamp(v.x,0,M.w-v.w); v.y=clamp(v.y,0,M.h-v.h);
  return v;
}
let tgNhanRaf=0;
function tgVeNhan(){                       // vẽ lại nhãn, gộp về mỗi khung hình một lượt
  if(tgNhanRaf) return;
  tgNhanRaf=requestAnimationFrame(()=>{
    tgNhanRaf=0;
    const g=$('#tgNhanG'); if(!g||!TG.map||!TG.rows) return;
    const by={}; TG.rows.forEach(r=>by[r.iso]=r);
    g.innerHTML=tgNhan(TG.map,by,TG.view);
  });
}
function tgApDung(veNhan){
  const svg=$('#tgSvg'), M=TG.map; if(!svg||!M||!TG.view) return;
  svg.setAttribute('viewBox',tgVBox());
  const z=M.w/TG.view.w, doi=z>1.02||TG.view.x>0.5||TG.view.y>0.5;
  /* Lớp `tgz` = "đang không ở khung gốc". Nó điều khiển hai thứ trong CSS: touch-action
     (nhường hay giành trục dọc) và nút về khung ban đầu (chỉ mọc khi có cái để về). */
  const map=$('#tgMap'); if(map) map.classList.toggle('tgz',doi);
  /* Chấm tròn Singapore/Hồng Kông giữ NGUYÊN CỠ TRÊN MÀN: bán kính chia theo mức phóng.
     Không chia thì phóng 4 lần là hai cái chấm trùm kín Đông Nam Á. */
  svg.querySelectorAll('.tgd').forEach(el=>el.setAttribute('r',(7.5/z).toFixed(2)));
  if(veNhan!==false) tgVeNhan();
}
function tgVeGoc(){ TG.view=tgViewGoc(); tgApDung(); }
/* CHẠM: hai ngón xoè ra = phóng TẠI CHỖ ĐANG THAO TÁC · một ngón = kéo bản đồ.
   TOUCH-ACTION ĐỔI THEO MỨC PHÓNG (khai trong CSS), đây là chỗ dễ sai nhất:
   · chưa phóng -> `pan-y`: bản đồ vừa khít khung, không có gì để kéo dọc, nên nhường
     trục dọc cho TRANG cuộn. Trói cứng ở đây thì người ta vuốt xuống đọc tiếp mà trang
     đứng im mỗi lần ngón tay rơi trúng dải bản đồ cao 146px.
   · đã phóng  -> `none`: lúc đó kéo dọc mới là để xem phần đang khuất, phải giành trọn
     cử chỉ (cùng bài học với canvas của chart.js — nhường một trục là preventDefault bị
     bỏ qua và phần xử lý viết sẵn gần như không bao giờ chạy).
   Hai ngón thì cả hai mức đều về tay mình: `pan-y` đã cấm trình duyệt tự phóng trang. */
function tgChamBind(svg){
  if(!svg||svg._cham) return; svg._cham=1;
  let hai=null, mot=null;
  const diem=(cx,cy,r)=>({x:TG.view.x+(cx-r.left)/r.width*TG.view.w,
                          y:TG.view.y+(cy-r.top)/r.height*TG.view.h});
  svg.addEventListener('touchstart',e=>{
    if(!tgHep()||!TG.view) return;
    if(e.touches.length>=2){
      const a=e.touches[0], b=e.touches[1], r=svg.getBoundingClientRect();
      hai={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY), w0:TG.view.w,
           neo:diem((a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2,r)};
      mot=null;
    }else if(e.touches.length===1){
      mot={x:e.touches[0].clientX,y:e.touches[0].clientY,v:{...TG.view}};
    }
  },{passive:true});
  svg.addEventListener('touchmove',e=>{
    if(!tgHep()||!TG.view||!TG.map) return;
    const M=TG.map, v=TG.view, r=svg.getBoundingClientRect();
    if(hai&&e.touches.length>=2){
      const a=e.touches[0], b=e.touches[1];
      const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
      if(!(hai.d>12&&d>12)) return;      // hai ngón sát nhau -> chia cho số bé, biên độ nhảy loạn
      e.preventDefault();
      v.w=clamp(hai.w0*hai.d/d,M.w/TG_ZMAX,M.w); v.h=v.w*M.h/M.w;
      /* ĐIỂM BẢN ĐỒ DƯỚI TÂM HAI NGÓN PHẢI ĐỨNG YÊN suốt cú phóng — đó chính là nghĩa
         của "phóng tại vị trí thao tác". Tâm hai ngón cũng được phép trôi, nên một cú
         vừa xoè vừa đẩy là vừa phóng vừa kéo, đúng thói quen dùng bản đồ. */
      const cx=(a.clientX+b.clientX)/2, cy=(a.clientY+b.clientY)/2;
      v.x=hai.neo.x-(cx-r.left)/r.width*v.w;
      v.y=hai.neo.y-(cy-r.top)/r.height*v.h;
      tgKep(v); TG.keoLuc=Date.now(); tgApDung();
      return;
    }
    if(mot&&e.touches.length===1){
      if(M.w/v.w<=1.02) return;          // chưa phóng: không có gì để kéo, nhường trang cuộn
      e.preventDefault();
      const t=e.touches[0];
      v.x=mot.v.x-(t.clientX-mot.x)/r.width*v.w;
      v.y=mot.v.y-(t.clientY-mot.y)/r.height*v.h;
      tgKep(v); TG.keoLuc=Date.now(); tgApDung();
    }
  },{passive:false});
  const het=e=>{ if(e.touches.length<2) hai=null; if(!e.touches.length) mot=null; };
  svg.addEventListener('touchend',het); svg.addEventListener('touchcancel',het);
}

function tgVeLai(){
  const svg=$('#tgSvg'); if(!svg) return false;
  const by={}; (TG.rows||[]).forEach(r=>by[r.iso]=r);
  svg.querySelectorAll('[data-iso]').forEach(el=>{
    const r=by[el.dataset.iso]; el.setAttribute('fill',tgMau(r?r.p:null)); });
  const oo=TG.rows.filter(r=>r.p!=null);
  const dem=$('#tgDem');
  if(dem) dem.textContent=oo.filter(r=>r.p>0.05).length+' nước tăng · '
    +oo.filter(r=>r.p<-0.05).length+' nước giảm';
  const nh=$('#tgNhanG'); if(nh) nh.innerHTML=tgNhan(TG.map,by,TG.view);
  /* thẻ đang mở: cập nhật % ở tiêu đề, và lấy lại luôn giá cổ phiếu bên trong — thẻ để
     mở cả tiếng mà ruột vẫn là giá lúc mới bấm thì tệ hơn là không cập nhật gì. */
  $$('#tgPops .tgcard').forEach(el=>{
    const iso=el.dataset.c, n=by[iso]; if(!n) return;
    const h=el.querySelector('.tgcp');
    if(h){ h.className='tgcp '+(n.p==null?'':cls(n.p)); h.textContent=tgPct(n.p); }
    delete TGC[iso];
    tgLayCo(iso).then(d=>{ if(!el.isConnected||!d.rows||!d.rows.length) return;
      const l=el.querySelector('.tgheat'); if(!l) return;
      l.innerHTML=d.rows.map(r=>{ const bg=tgMau(r.p);
        return '<div class="tgt" style="background:'+bg+';color:'+tgChu(bg)+'"'
          +' title="'+esc((r.goc&&r.goc!==r.ma?r.goc+' · ':'')+r.ten)+' — '+esc(String(r.gia))+'">'
          +'<b>'+esc(r.ma)+'</b><i>'+tgPct(r.p)+'</i></div>'; }).join(''); });
  });
  return true;
}
function tgNhip(){
  clearInterval(TG.hen);
  /* Hỏi mỗi 20 giây nhưng chỉ GỌI MẠNG khi số đã cũ quá 2 phút — cùng ngưỡng với lượt vẽ
     đầu, nên hai đường không giẫm chân nhau. Tab ẩn thì thôi, khỏi tốn lượt gọi vô ích. */
  TG.hen=setInterval(()=>{
    if(cur!=='radar'||radarTab!=='phien'){ clearInterval(TG.hen); TG.hen=null; return; }
    /* Tab ẩn thì thôi, khỏi tốn lượt gọi vô ích — trừ khi có cờ kiểm thử ?forcelive,
       dùng chung với startLive vì khung xem tự động luôn báo document.hidden=true. */
    if((document.hidden&&!FORCE_LIVE)||Date.now()-TG.at<TG_HAN) return;
    /* 'phien' chứ KHÔNG phải 'tg': bản đồ đã gộp vào Nhịp phiên 13/08/2026 nên radarTab
       không bao giờ còn mang giá trị 'tg'. Để sót một chữ ở đây là mỗi 2 phút vẫn tải số
       mới về đàng hoàng rồi VỨT ĐI — bản đồ đứng im, đúng cái cảnh "mở lúc 9 giờ tối xem
       Mỹ mà số không nhúc nhích" mà nhịp riêng này sinh ra để chữa. */
    tgLoad().then(()=>{ if(cur==='radar'&&radarTab==='phien') tgVeLai(); });
  },20000);
}

function toanCauPanel(){
  if(TG.loi) return '<div class="empty">Không lấy được dữ liệu thế giới: '+esc(TG.loi)
    +'<br/><span style="color:var(--faint);font-size:12px">Nguồn CNBC có thể đang chặn hoặc mạng đang hỏng — thử tải lại trang.</span></div>';
  if(!TG.rows||!TG.map) return '<div class="empty">Đang lấy dữ liệu thế giới…</div>';
  const M=TG.map, by={}; TG.rows.forEach(r=>by[r.iso]=r);
  if(!TG.view) TG.view=tgViewGoc();     // giữ mức phóng qua các lượt dựng lại panel
  const oo=TG.rows.filter(r=>r.p!=null);
  const tang=oo.filter(r=>r.p>0.05).length, giam=oo.filter(r=>r.p<-0.05).length;
  const path=Object.entries(M.c).map(([k,v])=>{
    const r=by[k];
    return '<path d="'+v.d+'" fill="'+tgMau(r?r.p:null)+'" class="tgc'+(r?' co':'')+'"'
      +' stroke="'+tgBang().net+'"'+(r?' data-iso="'+k+'"':'')+'/>';
  }).join('');
  /* Nước quá nhỏ để nhìn thấy hình -> chấm tròn. Vẽ SAU các path để luôn nằm trên. */
  const cham=Object.entries(M.cham).map(([k,v])=>{
    const r=by[k]; if(!r) return '';
    return '<circle cx="'+v.cx+'" cy="'+v.cy+'" r="7.5" fill="'+tgMau(r.p)+'"'
      +' stroke="'+tgBang().net+'" class="tgd" data-iso="'+k+'"/>';
  }).join('');
  return tgKhung(M,path,cham,tang,giam,tgNhan(M,by,TG.view));
}
/* HAI CHỈ SỐ SỨC MẠNH đặt vào GÓC DƯỚI-TRÁI bản đồ — chỗ đó là Nam Thái Bình Dương,
   trống trơn ở mọi phép chiếu và không nước nào có sàn. Dựng bằng HTML phủ lên chứ không
   phải <text> trong SVG: chữ trong SVG co theo viewBox nên màn hẹp là teo còn 3px. */
function tgSucManh(){
  const md=moodLive(), st=marketStats(), tot=Math.max(1,st.up+st.dn+st.fl);
  /* Ô "Sức mạnh TOÀN CẦU" ĐÃ BỎ 16/08/2026 — nó hiện chỉ số CNN Fear & Greed kèm đúng tên
     thương hiệu của họ. Con số là dữ kiện, nhưng cái tên và cách tính là sản phẩm của CNN.
     Chỉ còn ô TRONG NƯỚC — thứ CPVN tự tính từ dữ liệu của chính mình. Xem ghi chú dài ở
     tools/build_screen.py. Đừng dựng lại bằng VIX: cùng vấn đề (chỉ số thương hiệu CBOE). */
  const o=(nhan,v,phu)=>'<div class="tgsm1"><span class="tgsmn">'+nhan+'</span>'
    +'<b style="color:'+moodCol(v)+'">'+(v==null?'—':Math.round(v))+'<i>/100</i></b>'
    +'<span class="tgsmw" style="color:'+moodCol(v)+'">'+moodWord(v)+'</span>'
    +(phu?'<span class="tgsmp">'+phu+'</span>':'')+'</div>';
  return '<div id="tgSM">'
    +o('Sức mạnh thị trường',md,'▲'+st.up+' · –'+st.fl+' · ▼'+st.dn)
    +'</div>';
}
function tgKhung(M,path,cham,tang,giam,nhan){
  return '<div class="panel"><div class="ph">🌏 Bản đồ thế giới'
    +'<span id="tgDem" style="margin-left:auto;font-weight:600;color:var(--mut);font-size:12px">'
    +tang+' nước tăng · '+giam+' nước giảm</span></div>'
    /* #tgMap bọc RIÊNG thẻ svg để hộp chỉ số neo vào đúng khung BẢN ĐỒ. Neo vào #tgWrap
       thì ở màn hẹp sai chỗ: lúc đó lớp thẻ nước (#tgPops) thôi neo và chảy theo dòng,
       làm #tgWrap cao hơn bản đồ, nên `bottom:6px` rơi xuống dưới bản đồ. */
    +'<div class="pb"><div id="tgWrap"><div id="tgMap">'
    /* viewBox lấy theo KHUNG NHÌN đang giữ, không viết cứng 0 0 w h: đổi giao diện
       sáng/tối là panel dựng lại, viết cứng thì mức phóng người dùng vừa đặt bay mất. */
    +'<svg id="tgSvg" viewBox="'+tgVBox()+'"'
    +' style="background:'+tgBang().bien+'">'
    +path+cham+'<g id="tgNhanG">'+nhan+'</g></svg>'
    /* LỚP THẺ PHẢI ĐỨNG SAU <svg>: ở màn hẹp lớp này thôi neo và chảy theo dòng, đứng
       trước thì cột thẻ mọc NGAY TRÊN ĐẦU bản đồ, đẩy bản đồ xuống — đã dính đúng vậy,
       thẻ dựng ra rồi mà cuộn tới bản đồ thì không thấy đâu. */
    /* Hộp chỉ số phải đứng SAU <svg>: màn hẹp nó thôi neo và chảy theo dòng, đứng
       trước thì nhảy lên TRÊN bản đồ. Máy bàn neo tuyệt đối nên thứ tự không đổi gì. */
    +tgSucManh()
    /* NÚT VỀ KHUNG BAN ĐẦU — góc 1 giờ của CHÍNH BẢN ĐỒ (nằm trong #tgMap nên nó bám
       mép bản đồ, không bám khung ngoài vốn cao hơn ở màn hẹp). Biểu tượng bốn góc
       khung, một nét — không dùng emoji: mỗi hệ điều hành vẽ một kiểu và mang màu riêng. */
    +'<button id="tgVe" type="button" title="Về khung bản đồ ban đầu" aria-label="Về khung bản đồ ban đầu">'
    +'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 4H5.6A1.6 1.6 0 004 5.6v3.9'
    +'M14.5 4h3.9A1.6 1.6 0 0120 5.6v3.9M9.5 20H5.6A1.6 1.6 0 014 18.4v-3.9'
    +'M14.5 20h3.9a1.6 1.6 0 001.6-1.6v-3.9"/></svg></button>'
    +'</div>'
    +'<div id="tgPops"><button id="tgDongHet" style="display:none">✕ Đóng tất cả</button></div>'
    +'<div id="tgTip"></div></div>'
    /* THANH CHÚ GIẢI xanh–đỏ đã bỏ (user chốt 13/08/2026): xanh tăng đỏ giảm là quy ước
       người chơi chứng khoán nào cũng biết, giải thích lại chỉ tốn một hàng. */
    +'</div></div>'
}

let radarTab='phien';   // tab đang xem trong module radar: 'phien' | 'vb'  ('cd' đã bỏ 16/08/2026)
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
    +'<div id="rdVb"'+(radarTab==='vb'?'':' style="display:none"')+'>'
    +(radarTab==='vb'?veBoPanel():'')+'</div>'
    +'<div id="rdPhien"'+(radarTab!=='phien'?' style="display:none"':'')+'>'
    /* BẢN ĐỒ THẾ GIỚI đứng ngay đầu Radar phiên, thay cho cụm ba thẻ cũ (nhịp sợ hãi
       trong nước / toàn cầu / tóm tắt chỉ số). Cụm đó lặp lại thứ đã có ở thanh đầu trang
       và ăn nguyên một màn trước khi thấy nội dung thật. */
    +'<div id="rdTg"></div>'
    +'<div id="radarAll">'
    +sectionHead('r-flow','💰 Dòng tiền trong CKVN')+'<div class="grid g3">'+flow.join('')+'</div>'
    +sectionHead('r-power','🚀 Sức mạnh giá')+'<div class="grid g3">'+power.join('')+'</div>'
    +sectionHead('r-risk','⚠️ Mặt tối của phiên')+'<div class="grid g3">'+risk.join('')+'</div>'
    +sectionHead('r-sec','🏭 Nhóm ngành hôm nay')+sectorPanel()
    +'</div></div>';
  const bt=$('#vbThem'); if(bt) bt.onclick=()=>{ vbTop+=100; renderRadar(); };
  $$('#m-radar [data-vbs]').forEach(b=>b.onclick=()=>{ const k=b.dataset.vbs;
    if(vbSort.k===k) vbSort.d=-vbSort.d; else { vbSort.k=k; vbSort.d=(k==='roi'?1:-1); }
    vbTop=100; renderRadar(); });
  /* chip chế độ — về đầu danh sách vì rổ đổi hẳn; `vbTop` phải reset, bằng không đang mở
     300 mã của rổ cũ thì rổ mới cũng bung sẵn 300 dòng */
  $$('#m-radar [data-vbc]').forEach(b=>b.onclick=()=>{
    if(tachMa(vbQ).length) return;                // đang gõ mã thì chip vô hiệu, đúng như vẻ mờ của nó
    vbChe=b.dataset.vbc; vbTop=100;
    /* HƯỚNG XẾP ĐI THEO CHẾ ĐỘ. Rổ "Gần đỉnh" mà vẫn xếp rơi-nhiều-nhất-trước thì mở ra
       thấy ngay mã −9,9% còn mã đang ở đúng đỉnh nằm tận cuối — ngược hẳn thứ vừa bấm vào
       để tìm. Chỉ chỉnh khi đang xếp theo MỨC RƠI; ai đã chuyển sang vốn hoá thì để yên,
       và chiều vẫn lật tay được như cũ. */
    if(vbSort.k==='roi') vbSort.d=(vbChe==='gan'?-1:1);
    renderRadar();
    const el=$('#vbChe'), hd=document.querySelector('header');
    /* đọc rect TRƯỚC rồi mới tới scrollY — xem chú thích dài ở chip lọc bảng tập đoàn */
    if(el){ const dinh=el.getBoundingClientRect().top;
      scrollTo({top:Math.max(0,dinh+scrollY
        -((hd?hd.getBoundingClientRect().height:0)+10)),behavior:'auto'}); } });
  vbBind();
  if(radarTab==='phien') drawSparks($('#m-radar'));
  if(radarTab==='phien'&&!tgGiu){
    /* Bản đồ nạp qua mạng nên KHÔNG chặn lượt vẽ: hiện "đang lấy…" trước, có số rồi mới
       thay ruột. Số cũ quá 2 phút thì lấy lại — chợ nước ngoài không nhảy nhanh tới mức
       phải hỏi mỗi phút. */
    const ve=()=>{ const el=$('#rdTg'); if(el){ el.innerHTML=toanCauPanel(); tgBind(); tgNhip(); } };
    if(!TG.rows||Date.now()-TG.at>TG_HAN){
      tgLoad().then(()=>{ if(radarTab==='phien') ve(); });
      const el=$('#rdTg'); if(el) el.innerHTML='<div class="panel"><div class="pb tgce">Đang lấy bản đồ thế giới…</div></div>';
    } else ve();
  }
}
/* Rê/chạm vào một nước -> hiện thẻ nhỏ. Gắn theo lối UỶ QUYỀN trên khung ngoài, không
   gắn 174 listener lên từng path; và chạm cũng ăn, kẻo trên điện thoại bản đồ thành
   một mảng màu không tra cứu được gì. */
function tgBind(){
  const wrap=$('#tgWrap'), tip=$('#tgTip'); if(!wrap||!tip) return;
  const by={}; (TG.rows||[]).forEach(r=>by[r.iso]=r);
  const hien=(iso,ev)=>{
    const r=by[iso]; if(!r){ tip.classList.remove('on'); return; }
    tip.innerHTML='<b>'+esc(r.ten)+'</b><span class="tgti">'+esc(r.chiSo)+'</span>'
      +'<span class="tgtv '+(r.p==null?'':cls(r.p))+'">'+tgPct(r.p)+'</span>'
      +(r.gia?'<span class="tgtg">'+esc(r.gia)+'</span>':'')
      +'<span class="tgts">'+(r.p==null?(r.moi?'đã sang phiên mới, chưa khớp lệnh':'nguồn không có')
        :esc(r.gio||'')+(tgCu(r.tuoi)?' · '+tgCu(r.tuoi):''))+'</span>';
    const b=wrap.getBoundingClientRect();
    /* kẹp trong khung để thẻ không tràn ra ngoài mép phải/đáy khi trỏ vào nước ở rìa */
    tip.classList.add('on');
    const tw=tip.offsetWidth, th=tip.offsetHeight;
    tip.style.left=Math.max(4,Math.min(b.width-tw-4,ev.clientX-b.left+12))+'px';
    tip.style.top =Math.max(4,Math.min(b.height-th-4,ev.clientY-b.top+12))+'px';
  };
  const tim=e=>{ const t=e.target.closest('[data-iso]'); if(t) hien(t.dataset.iso,e);
    else tip.classList.remove('on'); };
  wrap.onmousemove=tim;
  wrap.onmouseleave=()=>tip.classList.remove('on');
  /* BẤM/CHẠM = bung bảng cổ phiếu trụ cột. Rê chuột vẫn chỉ ra thẻ nhỏ — hai mức thông
     tin khác nhau: liếc thì rê, muốn soi kỹ thì bấm. */
  wrap.onclick=e=>{
    /* VỪA KÉO/PHÓNG XONG thì cú click sinh ra ngay sau đó không phải một cú BẤM CHỌN
       nước — không chặn thì kéo bản đồ một cái là bung luôn thẻ của nước dưới ngón tay. */
    if(TG.keoLuc&&Date.now()-TG.keoLuc<400) return;
    const t=e.target.closest('[data-iso]');
    if(t){ tip.classList.remove('on'); tgMoBang(t.dataset.iso); } };
  tgChamBind($('#tgSvg'));
  const nve=$('#tgVe');
  if(nve) nve.onclick=e=>{ e.stopPropagation(); tgVeGoc(); };
  /* Panel vừa dựng lại (đổi đèn, đổi tab) mà đang phóng dở: viewBox đã đúng nhờ tgVBox,
     còn lớp `tgz` và bán kính chấm tròn thì phải áp lại. Nhãn đã dựng sẵn nên bỏ qua. */
  tgApDung(false);
  const nut=$('#tgDongHet'); if(nut) nut.onclick=tgDongBang;
  if(!window.__tgEsc){ window.__tgEsc=1;
    document.addEventListener('keydown',ev=>{ if(ev.key==='Escape') tgDongBang(); }); }
  /* Đổi bề ngang cửa sổ là svg co giãn -> mọi thẻ phải neo lại, bằng không chúng trôi
     khỏi nước của mình. Một listener dùng chung, gắn một lần. */
  if(!window.__tgRs){ window.__tgRs=1;
    window.addEventListener('resize',()=>{ const o=$('#tgPops'); if(!o) return;
      o.querySelectorAll('.tgcard').forEach(el=>tgViTri(el,el.dataset.c)); }); }
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
  settling:false,maxDelta:0,mode:'race',dcaMx:0,top:10,ma:''};
/* Tách chuỗi người dùng gõ thành danh sách mã. Dùng chung cho cả hai chế độ để một kiểu
   gõ chạy được ở cả hai chỗ — "hpg, fpt vnm" hay "HPG FPT VNM" đều ra cùng kết quả. */
const tachMa=s=>[...new Set((s||'').toUpperCase().match(/[A-Z][A-Z0-9]{2,}/g)||[])];
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
  /* MÃ GÕ TAY = THÊM VÀO rổ đang chọn, KHÔNG thay thế nó. Người dùng muốn "cho thêm một
     mã vào ngành có sẵn" chứ không phải đổi sang đua riêng mấy mã vừa gõ — nên ở đây
     khác hẳn ô gõ mã bên Đầu tư bền vững (bên đó gõ mã là thay cả rổ).
     Hai đặc quyền đi kèm, thiếu cái nào thì gõ xong vẫn không thấy mã đâu:
     · MIỄN ngưỡng 1.000 tỷ — lý do chính người ta gõ tay là để kéo một mã nhỏ vào xem.
     · GHIM, không bị cắt bởi ô "số công ty": mã nhỏ luôn xếp chót, cứ slice top-N là nó
       rụng ngay, gõ vào rồi mà màn hình không đổi gì thì đúng là bó tay không hiểu vì sao. */
  const them=tachMa(RA.ma).filter(s=>D.series[s]);
  if(them.length){ const co=new Set(pool); for(const s of them) if(!co.has(s)) pool.push(s); }
  const N=RA.top||10;
  const xong=pool.map(s=>({s,v:val(s)})).filter(r=>r.v!=null&&r.v>0).sort((a,b)=>b.v-a.v);
  const ghim=new Set(them);
  const buoc=xong.filter(r=>ghim.has(r.s));                       // mã gõ tay: luôn có mặt
  const rows2=buoc.concat(xong.filter(r=>!ghim.has(r.s))
    .slice(0,Math.max(0,N-buoc.length)))                          // phần còn lại lấp cho đủ N
    .sort((a,b)=>b.v-a.v);
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
   "Thực phẩm & Nông sản" nói đúng ngay cái đang xem, còn số mã đã có ở dòng phụ. */
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
    /* Tên NGÀNH dài không đoán trước được ("Hoá chất & Hàng gia dụng"): thay vì
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
    +'<br/><br/><b>Vì sao chia bốn khối:</b> danh sách này trộn ba tầng của cùng một cây sở '
    +'hữu. <b>Doanh nghiệp nhà nước</b> (PVN, EVN, Viettel) là một NHÀ thật — mẹ con hợp '
    +'nhất báo cáo. <b>Cơ quan nắm vốn</b> (Ngân hàng Nhà nước, SCIC, các Bộ, UBND tỉnh) thì '
    +'không: đó chỉ là danh mục cổ phần, VCB–BID–CTG cùng một chủ nhưng là đối thủ của nhau. '
    +'Còn <b>nhánh con</b> mang nhãn "thuộc …" là nhóm mà công ty mẹ của nó đã nằm trong một '
    +'nhóm khác — CTG thuộc Ngân hàng Nhà nước, GAS thuộc PVN, Techcombank thuộc Masan. '
    +'Nhánh con vẫn để riêng chứ không gộp vào mẹ, vì phần lớn có mã mà nhóm mẹ không có: '
    +'SCIC chỉ nắm VGT, còn 19 mã dệt may kia là con của chính Vinatex. '
    +'<b>Vốn hoá không bị đếm hai lần</b> — mã tới qua một thành viên khác chỉ tính phần '
    +'ngoài (vốn hoá GAS đã gồm 35% PGS).</div>';
}
/* ---- CHỦ ĐIỂM ĐẦU TƯ — ĐÃ BỎ HẲN 16/08/2026, ĐỪNG DỰNG LẠI ----------------------
   Sơ đồ Venn ba trục, thẻ từng mã, `chuDiemPanel()`, `cdBadge()` và kho `data/chudiem.json`
   đều xoá; `tools/build_chudiem.py` và bước gọi nó trong refresh_daily cũng gỡ.
   Lý do: cả mục là quan điểm của SSI Research dẫn lại — danh sách mã do họ chọn, cách phân
   nhóm do họ đặt. Sau khi gỡ khuyến nghị và giá mục tiêu (16/08) thì phần còn lại chỉ là
   "SSI xếp 16 mã này vào ba nhóm", vừa không còn mấy giá trị vừa vẫn là ý kiến của một đơn
   vị CÓ giấy phép tư vấn đầu tư mà CPVN dẫn lại. User chốt bỏ.
   Sơ đồ ba trục vốn NHẬP TAY (SSI không mở dữ liệu ra ngoài — đã dò iboard-api 401,
   api.ssi.com.vn 404, trang báo cáo chặn máy) nên cũng không có gì để tự động hoá lại. */
/* ---- KHI NÀO VỀ BỜ: mã đã rơi sâu khỏi ĐỈNH CỦA CẢ CHUỖI, xếp theo mức rơi --------
   Đo bằng `dath` (đỉnh của toàn bộ chuỗi giá trong kho) chứ KHÔNG phải đỉnh 52 tuần:
   phần lớn mã sập từ 2021-2022, lấy đỉnh 52 tuần thì mã mất 80% bốn năm nay lại hiện
   ra như chỉ mới giảm nhẹ — đúng cái nhóm người ta muốn tìm thì lọt lưới.
   KHÔNG lọc vốn hoá: đây là chỗ để soi mã đã rơi, mã nhỏ mới là phần đông. */
const VB_NGUONG=-30;
const VB_GAN=-10;
/* ═══ LỌC THEO MỨC RƠI (17/08/2026) ═══
   Trước chỉ có MỘT rổ: "đã rơi quá 30%". Rổ ngược lại — mã ĐANG SÁT ĐỈNH — không có đường
   nào xem được, trong khi nó trả lời một câu hỏi khác hẳn và cũng chính đáng: giữa lúc thị
   trường đỏ thì mã nào vẫn chưa rời đỉnh. Nay là ba chế độ, và chế độ ĐỘC LẬP với ngành
   (chọn ngành rồi vẫn lọc tiếp được trong ngành đó).
   `dath` là % lệch khỏi đỉnh, luôn ≤ 0 — nên "giảm dưới 10%" là `dath > -10`. */
const VB_CHE={
  sau:{ten:'Rơi sâu',  ttl:'Đã rơi hơn '+(-VB_NGUONG)+'% khỏi đỉnh của cả chuỗi giá',
       tieu:'Đã rơi hơn '+(-VB_NGUONG)+'% khỏi đỉnh', hop:c=>c.dath<=VB_NGUONG},
  gan:{ten:'Gần đỉnh', ttl:'Còn cách đỉnh dưới '+(-VB_GAN)+'% — nhóm chưa hề rời đỉnh bao xa',
       tieu:'Còn cách đỉnh dưới '+(-VB_GAN)+'%',      hop:c=>c.dath>VB_GAN},
  het:{ten:'Tất cả',   ttl:'Không lọc theo mức rơi',
       tieu:'Mọi mã có đủ dữ liệu đỉnh',              hop:()=>true},
};
let vbChe='sau';
let vbTop=100;
/* d=1: rơi NHIỀU nhất trước (dath âm sâu nhất) · d=-1: rơi ít nhất trước.
   Với vốn hoá thì d=-1 là to→nhỏ, cùng một quy ước "bấm lại là lật chiều". */
let vbSort={k:'roi',d:1};
const VBK={roi:c=>c.dath, von:c=>c.mcapLive||c.mcap||0};
/* NGÀNH ĐANG CHỌN. 'all' = toàn thị trường.
   CHỌN MỘT NGÀNH THÌ TỰ CHUYỂN CHẾ ĐỘ SANG 'het' (xem `vbBind`), giữ đúng luật user chốt
   15/08/2026: chọn ngành là để soi CẢ NGÀNH xem ai rơi ai chưa, nên phải hiện đủ mã kể cả
   mã mới rơi 1% hay đang ở đỉnh. Khác bản trước ở chỗ đó nay là GIÁ TRỊ MẶC ĐỊNH chứ không
   phải luật cứng — trong ngành vẫn bấm tiếp "Rơi sâu"/"Gần đỉnh" để thu hẹp được. */
let vbSec='all';
/* Ô TÌM MÃ — gõ được NHIỀU mã một lúc ("VIC HPG, FPT"), dùng chung bộ tách `tachMa` với
   hai ô gõ mã của Đường đua nên một kiểu gõ chạy được ở cả ba chỗ.
   Gõ mã thì THAY THẾ mọi bộ lọc khác (ngưỡng -30% lẫn ngành đang chọn): người ta gõ tên
   một mã cụ thể là muốn thấy ĐÚNG mã đó, không phải "mã đó nếu nó tình cờ thoả điều kiện
   đang bật" — im lặng bỏ qua là ngồi gõ lại mấy lần mà không hiểu vì sao trắng bảng. */
let vbQ='';
/* Ngành và chế độ nay CỘNG DỒN chứ không loại trừ nhau — hai câu hỏi khác nhau, hỏi cùng
   lúc được: "trong ngành thép, mã nào còn sát đỉnh?" */
const vbHop=()=>ST.list.filter(c=>c.close>0&&c.dath!=null
  &&(vbSec==='all'||c.sector===vbSec)&&VB_CHE[vbChe].hop(c));
const vbLoc=()=>{
  const go=tachMa(vbQ);
  if(go.length) return go.map(s=>ST.map.get(s)).filter(c=>c&&c.close>0&&c.dath!=null);
  return vbHop();
};
/* mã gõ vào mà không hiện được -> phải NÓI RA mã nào và vì sao, đừng lặng lẽ bỏ qua */
const vbThieu=()=>tachMa(vbQ).filter(s=>{ const c=ST.map.get(s);
  return !(c&&c.close>0&&c.dath!=null); });
function veBoPanel(){
  const ds=vbLoc().sort((a,b)=>(VBK[vbSort.k](a)-VBK[vbSort.k](b))*vbSort.d);
  const go=tachMa(vbQ), thieu=vbThieu();
  /* Ô TÌM luôn phải còn đó kể cả khi không ra mã nào — gõ sai một chữ mà ô biến mất thì
     không còn đường sửa, phải tải lại trang. */
  const oTim='<div class="vbfind"><input type="text" id="vbQ" value="'+esc(vbQ)+'" '
    +'placeholder="tìm mã: VIC HPG FPT" spellcheck="false" autocomplete="off" '
    +'title="Gõ một hay nhiều mã, cách nhau bằng dấu cách hay dấu phẩy — hiện đúng mấy mã đó, '
    +'kể cả mã chưa rơi khỏi đỉnh"/>'
    +(go.length?'<button class="pickbtn" id="vbXoa" style="margin:0">✕ xoá tìm</button>':'')
    +(thieu.length?'<span class="vbmiss">không có: <b>'+thieu.map(esc).join(', ')
      +'</b> — sai mã, hoặc kho chưa có đủ giá để tính đỉnh</span>':'')+'</div>';
  /* ═══ CHIP CHẾ ĐỘ ═══ Đếm trên rổ ĐANG XÉT (đã lọc ngành, CHƯA lọc chế độ) — đếm sau khi
     lọc chế độ thì hai chip kia luôn bằng 0, hết đường đọc xem bấm sang sẽ được bao nhiêu mã.
     Gõ mã thì chip mờ đi và thôi đếm: ô tìm đã thay thế mọi bộ lọc, để chip sáng là nói dối
     về thứ đang hiện — cùng lối đã dùng cho nút "☰ Ngành". */
  const nen=go.length?[]:ST.list.filter(c=>c.close>0&&c.dath!=null&&(vbSec==='all'||c.sector===vbSec));
  const nutChe=k=>'<button class="locb'+(!go.length&&vbChe===k?' on':'')+'" data-vbc="'+k+'"'
    +' title="'+esc(VB_CHE[k].ttl)+'">'+VB_CHE[k].ten
    +(go.length?'':'<i>'+nen.filter(VB_CHE[k].hop).length+'</i>')+'</button>';
  const thanhChe='<div class="tdloc" id="vbChe"'+(go.length?' style="opacity:.45"':'')+'>'
    +Object.keys(VB_CHE).map(nutChe).join('')+'</div>';
  /* NHÁNH RỖNG PHẢI GIỮ LẠI CẢ Ô TÌM LẪN HÀNG CHIP. Cùng bài học đã trả giá với ô tìm: chọn
     một chế độ ra 0 mã mà hàng chip biến mất thì không còn đường bấm về, phải tải lại trang. */
  if(!ds.length) return '<div class="panel vbpan"><div class="ph"><span class="vbti">'
    +(go.length?'Không tìm thấy mã nào':VB_CHE[vbChe].tieu)+'</span>'
    +'<button class="secbtn'+(vbSec==='all'?'':' on')+'" id="vbSecBtn">☰ Ngành</button></div>'
    +oTim+thanhChe+'<div class="pb"><div class="empty" style="padding:14px">'
    +(go.length?'Không có mã nào khớp — kiểm lại mã vừa gõ.'
      :'Không mã nào thoả “'+esc(VB_CHE[vbChe].ten)+'”'
       +(vbSec==='all'?' trên toàn thị trường':' trong ngành “'+esc(vbSec)+'”')
       +' — bấm chip khác để đổi rổ.')
    +'</div></div></div>'+vbSecBarHTML();
  /* CẦN BAO NHIÊU LẦN để về bờ: rơi 50% thì phải tăng 100% mới hoà vốn. Đây mới là con
     số người cầm hàng cần, chứ "-50%" nghe nhẹ hơn thực tế rất nhiều. */
  const lai=d=>(100/(100+d)-1)*100;
  const nut=(k,t)=>'<button class="srtb'+(vbSort.k===k?' on':'')+'" data-vbs="'+k+'"'
    +' title="Xếp theo '+t+(vbSort.k===k?' — bấm lại để lật chiều':'')+'">'+t
    +(vbSort.k===k?'<i>'+(vbSort.d===(k==='roi'?1:-1)?'↓':'↑')+'</i>':'')+'</button>';
  /* HÀNG NHÃN CỘT PHẢI MANG ĐÚNG CLASS CỦA TỪNG CỘT. Bản cũ để tám thẻ <span> trần, mà
     khổ hẹp lại ẩn ba cột dữ liệu (.vbb/.vbp/.vbv) bằng chính class đó — nên nhãn không
     bị ẩn theo, tám nhãn dồn vào lưới năm cột rồi tràn xuống dòng: "GIÁ · ĐỈNH CŨ VỐN
     HOÁ" dính liền nhau ở dòng hai, còn con số vốn hoá thì nằm dưới chữ "ĐỂ VỀ BỜ" nên
     đọc ra thành "vốn hoá để về bờ" — vô nghĩa. Có class thì nhãn ẩn/hiện và canh lề đi
     theo đúng cột của nó, khỏi cần luật nth-child riêng. */
  const hd='<div class="rw hd"><span></span><span>công ty</span>'
    +'<span class="vbd">rơi khỏi đỉnh</span><span class="vbb"></span>'
    +'<span class="vbl">cần tăng</span><span class="vbp">giá · đỉnh cũ</span>'
    +'<span class="vbm">vốn hoá hiện tại</span><span class="vbv">hôm nay</span></div>';
  const hang=c=>'<div class="rw" data-sym="'+c.sym+'" title="Bấm mở trang '+c.sym+'">'+logoHTML(c)
    +'<span class="idn"><b>'+c.sym+'</b><i>'+esc(shortName(c.name||''))+'</i></span>'
    /* MÃ ĐANG Ở ĐÚNG ĐỈNH KHÔNG ĐƯỢC TÔ ĐỎ. Cột này luôn đỏ vì nó là "mức rơi", đúng khi
       rổ toàn mã rơi sâu; nhưng rổ "Gần đỉnh" thì gần cả bảng là 0% — một màn đỏ rực báo
       hiệu điều ngược hẳn sự thật. Số 0 làm tròn từ khoảng (-0,5%, 0] nên xét theo giá trị
       thật chứ không xét chuỗi đã in ra. Cột "×1,0 để về bờ" cũng thôi tô vàng: không phải
       chờ tăng thêm gì thì cảnh báo màu là thừa. */
    +'<span class="vbd'+(c.dath>-0.5?' dinh':'')+'">'+c.dath.toFixed(0)+'%</span>'
    +'<span class="vbb"><i class="z"></i><i class="b" style="width:'+Math.min(100,-c.dath)+'%"></i></span>'
    +'<span class="vbl'+(c.dath>-0.5?' dinh':'')+'">×'+(100/(100+c.dath)).toFixed(1)
      +'<u>'+(c.dath>-0.5?'đang ở đỉnh':'để về bờ')+'</u></span>'
    /* GIÁ MỘT CỔ PHIẾU tính bằng ĐỒNG — nhét vào ty() (đơn vị tỷ) là ra "0 tỷ" hết,
       đúng cái bẫy đã dính ở giá mục tiêu bên Chủ điểm đầu tư */
    +'<span class="vbp">'+Math.round(c.close).toLocaleString('en-US')
      +'<u>đỉnh '+Math.round(c.athP||0).toLocaleString('en-US')+'</u></span>'
    +'<span class="vbm">'+ty(c.mcapLive||c.mcap||0)+'</span>'
    +'<span class="vbv '+cls(c.chg)+'">'+pct(c.chg)+'</span></div>';
  /* TIÊU ĐỀ NGẮN, đừng nhồi cả câu giải thích vào: hàng này là flex nên ở khổ hẹp một
     tiêu đề dài bị bóp thành bảy dòng dọc, còn nút ngành teo lại thành "☰…". Tên ngành
     đứng một mình là đủ (câu "tất cả mã của ngành" đã nằm ở ghi chú cuối bảng), và nút
     giữ nhãn NGẮN CỐ ĐỊNH — không lặp lại tên ngành mà tiêu đề vừa nói. */
  const tieu=go.length?'Mã đang tìm'
    :vbSec==='all'?VB_CHE[vbChe].tieu:esc(vbSec);
  return '<div class="panel vbpan"><div class="ph"><span class="vbti">'+tieu+'</span>'
    /* đang gõ mã thì ô ngành hết tác dụng — làm mờ đi cho khỏi tưởng vẫn đang lọc theo
       ngành, đúng lối đã dùng cho ô nhóm ngành của Đầu tư bền vững */
    +'<button class="secbtn'+(go.length?'':(vbSec==='all'?'':' on'))+'" id="vbSecBtn" '
      +(go.length?'style="opacity:.45" ':'')
      +'title="Chọn nhóm ngành — chọn rồi thì hiện ĐỦ mã của ngành, kể cả mã chưa rơi">'
      +'☰ Ngành</button>'
    +'<span class="tdsrt">xếp theo'+nut('roi','mức rơi')+nut('von','vốn hoá')+'</span>'
    +'<span class="cnt">'+ds.length+' mã</span></div>'+oTim+thanhChe
    +'<div class="pb" style="padding:8px 14px" id="vbPanel">'
    +hd+ds.slice(0,vbTop).map(hang).join('')+'</div></div>'
    +(ds.length>vbTop?'<div class="note" style="text-align:center"><button class="pickbtn" id="vbThem" '
      +'style="margin:0">Xem thêm '+Math.min(100,ds.length-vbTop)+' mã</button></div>':'')
    +'<div class="note"><b>Đỉnh ở đây là đỉnh của CẢ CHUỖI giá trong kho</b> (từ 2020), không phải '
    +'đỉnh 52 tuần — phần lớn mã sập từ 2021-2022, đo bằng đỉnh 52 tuần thì mã mất 80% bốn năm '
    +'nay lại hiện ra như chỉ mới giảm nhẹ. Cột <b>×</b> là số lần giá phải tăng để về lại đỉnh cũ: '
    +'rơi 50% thì phải tăng gấp đôi mới hoà vốn, rơi 80% thì phải gấp năm. '
    +(go.length
      ? 'Đang hiện <b>đúng '+go.length+' mã bạn gõ</b> — bỏ mọi bộ lọc khác, nên có cả mã chưa '
        +'rơi. Mã đang đứng ngay đỉnh hiện 0% và cần tăng ×1,0. Xoá ô tìm để về danh sách cũ. '
      : vbChe==='gan'
      /* Câu này phải NÓI THẲNG cái bẫy: "gần đỉnh" rất dễ đọc thành "mã khoẻ, nên mua" —
         đúng kiểu suy diễn mà cả trang đang tránh. Nó chỉ là một phép đo vị trí giá. */
      ? 'Đang hiện mã <b>còn cách đỉnh dưới '+(-VB_GAN)+'%</b>'
        +(vbSec==='all'?' trên toàn thị trường':' trong ngành này')+'. Sát đỉnh KHÔNG có nghĩa '
        +'là khoẻ hay sắp tăng tiếp — mã thanh khoản mỏng đứng im hàng tháng cũng nằm ở đây, '
        +'vì giá không đi đâu thì cũng không rời đỉnh. Đây là phép đo vị trí giá, không hơn. '
      : vbChe==='het'
      ? 'Đang hiện <b>đủ mã</b>'+(vbSec==='all'?' toàn thị trường':' của ngành này')
        +' nên có cả mã chưa rơi — mã ở ngay đỉnh hiện 0% và cần tăng ×1,0. '
      : 'Đang hiện mã <b>đã rơi quá '+(-VB_NGUONG)+'%</b>'
        +(vbSec==='all'?' trên toàn thị trường':' trong ngành này')
        +'; bấm <b>Gần đỉnh</b> hay <b>Tất cả</b> ở hàng chip trên bảng để đổi rổ. ')
    +'Mục này KHÔNG lọc theo vốn hoá — mã nhỏ mới là phần đông trong nhóm rơi sâu, mà cũng là nhóm '
    +'thanh khoản mỏng nhất. Rơi sâu KHÔNG có nghĩa là sắp hồi: nhiều mã rơi vì doanh nghiệp hỏng '
    +'thật. Đây là danh sách để soi, không phải danh sách để mua.</div>'
    +vbSecBarHTML();
}
/* CỘT NGÀNH — dựng cùng lúc với panel rồi để CSS trượt ra/vào, không dựng lại mỗi lần mở.
   Đếm "rơi/tổng": số mã của ngành đã rơi quá ngưỡng trên TỔNG số mã ngành đó, để trước
   khi bấm đã biết chọn vào sẽ thấy gì. Màu tên ngành lấy theo góc vàng 137,5° y như cột
   ngành bảng giá — hai dòng cạnh nhau luôn khác tông rõ. */
function vbSecBarHTML(){
  const G={};
  for(const c of ST.list){
    if(!(c.close>0)||c.dath==null) continue;
    const s=c.sector||'Khác', g=G[s]=G[s]||{n:0,roi:0,cap:0};
    g.n++; g.cap+=c.mcapLive||c.mcap||0;
    if(c.dath<=VB_NGUONG) g.roi++;
  }
  const secs=Object.keys(G).sort((a,b)=>G[b].cap-G[a].cap);
  const tongRoi=secs.reduce((s,k)=>s+G[k].roi,0);
  const si=(val,ten,dem,big,mau)=>'<div class="si'+(vbSec===val?' on':'')+(big?' big':'')
    +'" data-vbsec="'+esc(val)+'"'+(mau?' style="--cl:'+mau[0]+';--cd:'+mau[1]+'"':'')+'>'
    +'<span class="n">'+esc(ten)+'</span><span class="c">'+dem+'</span></div>';
  return '<div id="vbSecBd"></div><div id="vbSecBar">'
    +'<div class="sbh"><b>Nhóm ngành</b>'
    +'<em>Chọn một ngành để xem <b>đủ mã</b> của ngành đó — kể cả mã chưa rơi. '
    +'Số bên phải là <b>đã rơi quá '+(-VB_NGUONG)+'% / tổng mã</b>.</em></div>'
    +si('all','Tất cả ngành',tongRoi,false,null)
    +secs.map((s,i)=>si(s,s,G[s].roi+'/'+G[s].n,G[s].cap>=1e14,vbMau(i))).join('')
    +'</div>';
}
/* CỘT NGÀNH PHẢI ĐƯỢC CHUYỂN RA THẲNG <body>. `position:fixed` bị TỔ TIÊN CÓ
   `backdrop-filter` bắt làm khối chứa (header và mấy thẻ của trang này đều có), nên để
   nguyên chỗ dựng ra thì cột không bám mép màn hình và chiều cao bị cắt theo tổ tiên đó —
   đo được lệch 28px ở máy bàn, 14px ở màn hẹp. Cùng họ với luật `#tgPops phải đứng SAU
   <svg>` của bản đồ thế giới: thứ neo tuyệt đối rất nhạy với chỗ nó nằm trong cây DOM.
   Vì `renderRadar` dựng lại panel mỗi lượt bơm giá sống, phải TỰ DỌN bản cũ đã chuyển ra
   body trước khi chuyển bản mới, bằng không mỗi phút lại chồng thêm một cột chết. */
let vbBarEl=null, vbBdEl=null, vbSecMo=false;
/* Ô TÌM MÃ bị THAY BẰNG Ô MỚI mỗi lượt vẽ lại (panel dựng lại từ chuỗi HTML). Không tự
   trả lại con trỏ thì gõ tới chữ thứ hai là mất tiêu điểm, bàn phím điện thoại đóng sập.
   Nhớ cả VỊ TRÍ con trỏ chứ không chỉ "focus": nhảy về cuối chuỗi thì sửa một mã ở giữa
   là không sửa nổi. Hoãn 200ms để mỗi phím gõ không kéo theo một lượt lọc 1.500 mã. */
let vbTimer=0, vbCaret=null;
function vbBind(){
  const q=$('#vbQ');
  if(q){
    q.oninput=e=>{ vbQ=e.target.value||''; vbTop=100;
      vbCaret=e.target.selectionStart;
      clearTimeout(vbTimer); vbTimer=setTimeout(()=>renderRadar(),200); };
    q.onkeydown=e=>{ if(e.key==='Enter'){ clearTimeout(vbTimer); renderRadar(); } };
    if(vbCaret!=null){ const p=Math.min(vbCaret,q.value.length);
      q.focus(); try{ q.setSelectionRange(p,p); }catch(_){} }
  }
  const xo=$('#vbXoa');
  if(xo) xo.onclick=()=>{ vbQ=''; vbCaret=null; vbTop=100; renderRadar(); };
  if(vbBarEl){ vbBarEl.remove(); vbBarEl=null; }
  if(vbBdEl){ vbBdEl.remove(); vbBdEl=null; }
  const bar=$('#m-radar #vbSecBar'), bd=$('#m-radar #vbSecBd'), btn=$('#vbSecBtn');
  if(!bar||!bd||!btn) return;
  document.body.appendChild(bd); document.body.appendChild(bar);
  vbBarEl=bar; vbBdEl=bd;
  const dat=mo=>{ vbSecMo=mo; bar.classList.toggle('on',mo); bd.classList.toggle('on',mo); };
  btn.onclick=()=>dat(!bar.classList.contains('on'));
  bd.onclick=()=>dat(false);
  $$('#vbSecBar [data-vbsec]').forEach(e=>e.onclick=()=>{
    const moi=e.dataset.vbsec;
    /* ĐỔI NGÀNH THÌ VỀ CHẾ ĐỘ MẶC ĐỊNH CỦA NGÀNH ĐÓ, giữ đúng luật user chốt 15/08/2026:
       chọn một ngành là để soi CẢ NGÀNH xem ai rơi ai chưa -> 'het' (hiện đủ mã); về lại
       toàn thị trường thì 'het' là 1.500 dòng vô nghĩa -> quay về 'sau'.
       Chỉ đặt khi ngành THẬT SỰ ĐỔI — bấm lại đúng ngành đang xem mà cũng nhảy về 'het'
       thì bộ lọc người ta vừa chọn bị xoá không lý do. */
    if(moi!==vbSec) vbChe=(moi==='all'?'sau':'het');
    vbSec=moi; vbTop=100; dat(false); renderRadar();
    const p=$('#m-radar .panel'); if(p) p.scrollIntoView({block:'start',behavior:'smooth'}); });
  /* giữ trạng thái đang mở qua các lượt vẽ lại (vòng giá sống dựng lại module mỗi phút) */
  if(vbSecMo) dat(true);
}
/* Bản sao rút gọn của bộ màu cột ngành bên bảng giá (index.html `sectorColor`): xoay tông
   theo góc vàng rồi dò độ sáng tới khi tương phản >=4.6 trên nền của CẢ HAI giao diện.
   Sửa bảng màu ở một bên thì bên kia lệch tông — chỉ là chuyện thẩm mỹ, không phải dữ liệu. */
function vbMau(i){
  const h=Math.round((i*137.508)%360), s=74;
  const hsl2=(hh,ss,ll)=>{ ss/=100; ll/=100;
    const k=n=>(n+hh/30)%12, a=ss*Math.min(ll,1-ll);
    const f=n=>ll-a*Math.max(-1,Math.min(k(n)-3,9-k(n),1));
    return [f(0),f(8),f(4)].map(v=>v*255); };
  const lum=rgb=>{ const c=rgb.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});
    return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
  const ti=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  const fit=(bg,up)=>{ let l=up?64:38;
    for(let k=0;k<30&&l>10&&l<94;k++){ if(ti(lum(hsl2(h,s,l)),bg)>=4.6) break; l+=up?2:-2; }
    return l; };
  return ['hsl('+h+','+s+'%,'+fit(lum([238,240,244]),false)+'%)',
          'hsl('+h+','+s+'%,'+fit(lum([27,33,48]),true)+'%)'];
}
/* KHÔI PHỤC 16/08/2026 — dòng này bị CẮT LẸM khi gỡ Chủ điểm (commit c0647e49).
   Khối xoá chạy từ `function chuDiemPanel(){` tới hàm kế tiếp, mà `let tdTab` lại nằm
   lọt giữa hai thứ đó nên bị nuốt theo. Hậu quả: `ReferenceError: tdTab is not defined`
   -> renderTapDoan ném lỗi -> mục Tập đoàn ĐỨNG VĨNH VIỄN ở trạng thái loading.
   Bài học: xoá theo KHOẢNG DÒNG thì phải soi lại danh sách khai báo cấp cao trước/sau,
   đừng tin mỗi cú `node --check` — thiếu một biến toàn cục vẫn qua được kiểm cú pháp. */
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
    +'<select id="raSec"><option value="">Toàn thị trường</option>'+secOpts(RA.sector)+'</select>'
    +'<input type="text" id="raMa" value="'+esc(RA.ma)+'" placeholder="thêm mã: HPG FPT"'
    +' title="Gõ mã để THÊM vào rổ đang chọn (cách nhau bởi dấu cách/phẩy). Mã thêm tay được'
    +' miễn ngưỡng 1.000 tỷ và luôn hiện trên biểu đồ, dù vốn hoá xếp chót."/></span>'
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
    /* Gõ mã mà kho không có thì PHẢI NÓI RA. Im lặng bỏ qua là người ta ngồi gõ lại
       mấy lần, tưởng mình gõ sai chính tả — trong khi mã đó niêm yết sau tháng bắt đầu. */
    +'<div class="note" id="raThieu" style="display:none"></div>'
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
    $('#raMa').placeholder=hep()?'+ mã':'thêm mã: HPG FPT';
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
  /* Mã gõ vào mà kho đua không có -> nói thẳng ra mã nào, kèm lý do thường gặp nhất. */
  const baoThieu=()=>{ const el=$('#raThieu'); if(!el) return;
    const D2=raceData(), go=tachMa(RA.ma);
    const thieu=D2?go.filter(s=>!D2.series[s]):[];
    el.style.display=thieu.length?'':'none';
    el.innerHTML=thieu.length?('Không đưa vào đua được: <b>'+thieu.map(esc).join(', ')+'</b> — '
      +'mã không có trong kho đua (niêm yết sau tháng bắt đầu, hoặc gõ sai mã).'):''; };
  $('#raMa').oninput=e=>{ RA.ma=e.target.value||''; RA.curY={};
    baoThieu(); drawRace(); settleRace(); };
  baoThieu();
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
    /* CHIP LỌC HẠNG — cũng phải bắt trước hàng nhóm, cùng lý do với nút xếp. Đổi bộ lọc là
       cả danh sách bên dưới thay mới, nên phải kéo màn về đúng hàng chip: đang cuộn sâu
       trong khối "Cơ quan" mà bấm "Tư nhân" thì tại chỗ cũ chẳng còn gì, nhìn như trang lỗi.
       Trừ đi chiều cao header ĐO THẬT chứ đừng viết cứng — máy bàn ~44px, màn hẹp có thêm
       dải tab nên gấp đôi; viết cứng một số là một trong hai khổ bị header che mất hàng chip. */
    const lc=e.target.closest('[data-loc]');
    if(lc){ tdLoc=lc.dataset.loc; renderTapDoan();
      /* KÉO MÀN VỀ HÀNG CHIP. Lọc 164 -> 17 nhóm làm tài liệu ngắn đi hàng nghìn pixel nên
         trình duyệt tự KẸP scrollY xuống đáy mới; không kéo về thì chỗ đang đứng chẳng còn
         gì, nhìn như trang lỗi.
         THỨ TỰ HAI PHÉP ĐỌC LÀ QUAN TRỌNG: đọc `getBoundingClientRect()` TRƯỚC — chính nó
         ép trình duyệt tính lại bố cục, và việc kẹp scrollY xảy ra trong lượt tính đó — rồi
         mới đọc `scrollY`. Đảo lại là cộng toạ độ MỚI với scrollY CŨ, ra một điểm không có
         thật (đo được: nhảy tới 1734 trong khi hàng chip nằm ở 366, lệch 1368px).
         ĐỪNG bọc trong requestAnimationFrame: rAF KHÔNG chạy khi tab ở nền, mà hàm này cũng
         không cần đợi khung hình nào — đọc rect là đã có số đúng rồi.
         Nhảy thẳng, không `behavior:'smooth'`: cả danh sách vừa bị thay mới nên chạy hoạt
         ảnh qua mấy nghìn pixel nội dung sắp biến mất chỉ là nhiễu. */
      const b=$('#tdLoc'), hd=document.querySelector('header');
      if(b){ const dinh=b.getBoundingClientRect().top;         // đọc rect TRƯỚC
        scrollTo({top:Math.max(0,dinh+scrollY                  // rồi mới tới scrollY
          -((hd?hd.getBoundingClientRect().height:0)+10)),behavior:'auto'}); }
      return; }
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
  const byPath={radar:'radar',tapdoan:'tapdoan',duongdua:'race',niemyet:'niemyet',
                phantich:'phantich'}[location.pathname.replace(/\//g,'')];
  const start=q||byPath||(location.hash||'').replace('#','');
  /* ?t= chọn sẵn tab bên trong — link từ trang khác trỏ thẳng vào đúng mục con */
  const t0=new URLSearchParams(location.search).get('t');
  if(t0==='phien'||t0==='vb') radarTab=t0;   // 'cd' (chủ điểm) đã bỏ — link cũ rơi về 'phien'
  if(t0==='dca'||t0==='dua') RA.mode=(t0==='dca'?'dca':'race');
  /* `?sym=XXX` mở thẳng trang phân tích của một mã — trang cổ phiếu trỏ sang bằng đường này.
     Đọc ở đây chứ không đọc trong renderPhanTich: `showMod` chỉ gọi render MỘT LẦN cho mỗi
     module (`done[id]`), nên đọc muộn hơn là lần thứ hai vào mục sẽ không mở mã nữa. */
  const s0=(new URLSearchParams(location.search).get('sym')||'').trim().toUpperCase();
  if(s0&&/^[A-Z0-9]{3,10}$/.test(s0)) PT.ma=s0;
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
