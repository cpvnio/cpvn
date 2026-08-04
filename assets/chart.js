/* ============================================================================
   CPVN chart.js — biểu đồ nến LINH ĐỘNG, dùng chung cho trang cổ phiếu và
   bảng chi tiết ở trang bong bóng.
     · Nến: Trong ngày · Ngày · Tuần · Tháng · Năm (gộp tại chỗ từ nến ngày của kho)
     · Cuộn chuột = phóng to/thu nhỏ quanh con trỏ; kéo = trượt thời gian
     · Điện thoại: 1 ngón kéo, 2 ngón chụm để phóng
     · Rê chuột/chạm = thanh ngắm + dòng chú giải O·H·L·C cố định trên đầu (không che nến)
     · Trục dưới tự đổi nhãn theo mức phóng: ngày → tháng → quý → năm
   Không phụ thuộc core.js để trang bong bóng (độc lập) cũng dùng được.
   ========================================================================== */
'use strict';
(function(g){
const VNOFF=25200;                                  // VN = UTC+7, không có giờ mùa hè
const vn=t=>new Date((t+VNOFF)*1000);               // dùng kèm getUTC* để ra đúng giờ VN
const dayNum=t=>Math.floor((t+VNOFF)/86400);
const weekNum=t=>Math.floor((dayNum(t)+3)/7);       // tuần bắt đầu THỨ HAI
const p2=n=>String(n).padStart(2,'0');

/* gộp nến ngày -> tuần/tháng/năm (mở của nến đầu, đóng của nến cuối, cao/thấp/KL cộng dồn) */
function aggregate(rows,iv){
  if(!rows||!rows.length||iv==='i'||iv==='D') return rows||[];
  const keyOf = iv==='W' ? r=>weekNum(r.t)
              : iv==='M' ? r=>{const d=vn(r.t); return d.getUTCFullYear()*12+d.getUTCMonth();}
              :            r=>vn(r.t).getUTCFullYear();
  const out=[]; let cur=null,k0=null;
  for(const r of rows){
    const k=keyOf(r);
    if(k!==k0){ if(cur) out.push(cur); cur={t:r.t,o:r.o,h:r.h,l:r.l,c:r.c,v:r.v||0}; k0=k; }
    else{ if(r.h>cur.h)cur.h=r.h; if(r.l<cur.l)cur.l=r.l; cur.c=r.c; cur.v+=r.v||0; }
  }
  if(cur) out.push(cur);
  return out;
}

/* mốc chia trục dưới: đơn vị tự chọn theo số nến đang hiện */
function tickUnit(iv,visN){
  if(iv==='i') return 'hour';
  if(iv==='D') return visN<=80?'week':(visN<=420?'month':'quarter');
  if(iv==='W') return visN<=60?'month':(visN<=200?'quarter':'year');
  if(iv==='M') return visN<=40?'quarter':'year';
  return 'year';
}
function tickKey(unit,t){
  const d=vn(t);
  switch(unit){
    case 'hour':    return Math.floor((t+VNOFF)/3600);
    case 'week':    return weekNum(t);
    case 'month':   return d.getUTCFullYear()*12+d.getUTCMonth();
    case 'quarter': return d.getUTCFullYear()*4+Math.floor(d.getUTCMonth()/3);
    default:        return d.getUTCFullYear();
  }
}
function tickLabel(unit,t,prevT){
  const d=vn(t), y=d.getUTCFullYear(), m=d.getUTCMonth();
  const yearChanged=prevT==null||vn(prevT).getUTCFullYear()!==y;
  switch(unit){
    case 'hour':    return p2(d.getUTCHours())+':'+p2(d.getUTCMinutes());
    case 'week':    return d.getUTCDate()+'/'+(m+1);
    case 'month':   return yearChanged?`T${m+1}/${String(y).slice(2)}`:`T${m+1}`;
    case 'quarter': return yearChanged?`Q${Math.floor(m/3)+1}/${String(y).slice(2)}`:`Q${Math.floor(m/3)+1}`;
    default:        return String(y);
  }
}
/* nhãn ngày đầy đủ cho bảng giá khi rê chuột */
function fullLabel(iv,t){
  const d=vn(t), dd=p2(d.getUTCDate()), mm=p2(d.getUTCMonth()+1), y=d.getUTCFullYear();
  if(iv==='i') return `${dd}/${mm} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
  if(iv==='M') return `Tháng ${d.getUTCMonth()+1}/${y}`;
  if(iv==='Y') return `Năm ${y}`;
  if(iv==='W') return `Tuần ${dd}/${mm}/${y}`;
  return `${dd}/${mm}/${y}`;
}
const fmtP=v=>v>=1000?(v/1000).toLocaleString('en-US',{maximumFractionDigits:v>=10000?1:2})+'K':String(Math.round(v));
const fmtV=v=>v>=1e9?(v/1e9).toFixed(2)+' tỷ':v>=1e6?(v/1e6).toFixed(2)+' tr':v>=1e3?(v/1e3).toFixed(1)+' N':String(Math.round(v||0));

function Chart(cvs,opt){
  opt=opt||{};
  const self={};
  let rows=[],iv="D",i0=0,i1=0,hover=-1;
  let drag=null,pinch=null;
  const light=()=>opt.light?opt.light():false;
  const GRID=()=>light()?'rgba(0,0,0,.09)':'rgba(255,255,255,.06)';
  const MUT =()=>light()?'#66707f':'#8a8a99';
  const PANEL=()=>light()?'#ffffff':'#15151a';
  const TXT =()=>light()?'#16181d':'#e9e9ef';
  const UP='#16c784', DOWN='#ea3943';
  const DEFN={i:0,D:120,W:120,M:60,Y:0};            // 0 = xem hết

  /* ---- khung nhìn ---- */
  function clampView(){
    const n=rows.length;
    if(n<2){ i0=0; i1=n; return; }
    let span=Math.round(i1-i0);
    span=Math.max(5,Math.min(n,span));
    if(i0<0) i0=0;
    if(i0+span>n) i0=n-span;
    i1=i0+span;
  }
  function resetView(){
    const n=rows.length, d=DEFN[iv]||0;
    const span=(!d||d>=n)?n:d;
    i0=n-span; i1=n; clampView();
  }
  self.setRows=function(r,interval,keepView){
    rows=r||[]; if(interval) iv=interval;
    if(!keepView||i1<=i0||i1>rows.length) resetView(); else clampView();
    self.draw(); return self;
  };
  self.rows=()=>rows;
  self.interval=()=>iv;
  self.resetView=function(){ resetView(); self.draw(); };

  /* ---- vẽ ---- */
  const geo={padR:64,padT:14,plotW:0,plotH:0,cw:0,h:0,w:0,volTop:0};
  /* CHỈ BÁO bật/tắt được — mặc định chỉ MA20 như cũ; chế độ PTKT toàn màn hình bật thêm */
  const MACOL={20:'rgba(234,179,8,.85)',50:'rgba(56,189,248,.85)',200:'rgba(192,38,211,.8)'};
  const ind={ma:[20], vol:true, rsi:false};
  self.ind=()=>ind;
  self.setInd=function(o){ Object.assign(ind,o||{}); self.draw(); };
  self.draw=function(){
    const DPR=Math.min(2,window.devicePixelRatio||1);
    const w=cvs.clientWidth||600, h=cvs.clientHeight||300;
    cvs.width=Math.round(w*DPR); cvs.height=Math.round(h*DPR);
    const x=cvs.getContext('2d'); x.setTransform(DPR,0,0,DPR,0,0); x.clearRect(0,0,w,h);
    geo.w=w; geo.h=h;
    if(!rows.length){ x.fillStyle=MUT(); x.font='13px system-ui'; x.textAlign='center';
      x.fillText(opt.emptyText||'Đang tải biểu đồ…',w/2,h/2); return; }
    clampView();
    const vis=rows.slice(i0,i1), n=vis.length;
    const volH=ind.vol?Math.round(h*0.17):0;
    const rsiH=ind.rsi?Math.round(h*0.18):0;
    const padB=volH+rsiH+22, padR=geo.padR, padT=geo.padT;
    const volBase=h-22-rsiH;                 // đáy cột khối lượng (chừa chỗ cho RSI bên dưới)
    const plotW=w-padR, plotH=h-padT-padB;
    geo.plotW=plotW; geo.plotH=plotH; geo.volTop=h-padB+6;
    let mn=Infinity,mx=-Infinity,vmax=0;
    for(const r of vis){ if(r.l<mn)mn=r.l; if(r.h>mx)mx=r.h; if((r.v||0)>vmax)vmax=r.v||0; }
    if(mx-mn<1e-9) mx=mn+1;
    const pad=(mx-mn)*0.06; mn-=pad; mx+=pad;
    const y=v=>padT+(mx-v)/(mx-mn)*plotH;
    const cw=plotW/n, bw=Math.max(1,Math.min(16,cw*0.66));
    geo.cw=cw;
    const cx=i=>i*cw+cw/2;

    // lưới ngang + trục giá bên phải
    x.font='10.5px system-ui'; x.textBaseline='middle';
    for(let k=0;k<=4;k++){
      const v=mn+(mx-mn)*k/4, yy=y(v);
      x.strokeStyle=GRID(); x.beginPath(); x.moveTo(0,yy); x.lineTo(plotW,yy); x.stroke();
      x.fillStyle=MUT(); x.textAlign='left'; x.fillText(fmtP(v),plotW+6,yy);
    }
    // khối lượng
    if(ind.vol) for(let i=0;i<n;i++){
      const r=vis[i], up=r.c>=r.o, vh=vmax?(r.v||0)/vmax*(volH-6):0;
      x.fillStyle=up?'rgba(22,199,132,.34)':'rgba(234,57,67,.34)';
      x.fillRect(cx(i)-bw/2,volBase-vh,bw,vh);
    }
    // ĐƯỜNG TRUNG BÌNH (tính trên toàn chuỗi để mép trái không bị cụt)
    for(const per of ind.ma){
      if(rows.length<per+1) continue;
      x.strokeStyle=MACOL[per]||'rgba(148,163,184,.8)'; x.lineWidth=1.4;
      x.beginPath(); let st=false;
      for(let i=0;i<n;i++){
        const gi=i0+i; if(gi<per-1) continue;
        let sum=0; for(let k=gi-per+1;k<=gi;k++) sum+=rows[k].c;
        const yy=y(sum/per); st?x.lineTo(cx(i),yy):x.moveTo(cx(i),yy); st=true;
      }
      if(st) x.stroke();
    }
    // nến
    for(let i=0;i<n;i++){
      const r=vis[i], up=r.c>=r.o, col=up?UP:DOWN, X=cx(i);
      x.strokeStyle=col; x.lineWidth=Math.min(1.6,Math.max(1,bw*0.14));
      x.beginPath(); x.moveTo(X,y(r.h)); x.lineTo(X,y(r.l)); x.stroke();
      x.fillStyle=col;
      const a=y(Math.max(r.o,r.c)), b=y(Math.min(r.o,r.c));
      x.fillRect(X-bw/2,a,bw,Math.max(1,b-a));
    }
    // vạch giá mới nhất
    const lastC=vis[n-1].c, yl=y(lastC), lcol=lastC>=vis[0].o?UP:DOWN;
    x.setLineDash([3,3]); x.strokeStyle=lcol+'99';
    x.beginPath(); x.moveTo(0,yl); x.lineTo(plotW,yl); x.stroke(); x.setLineDash([]);
    x.fillStyle=lcol; x.fillRect(plotW,yl-8,padR,16);
    x.fillStyle='#fff'; x.font='700 10.5px system-ui'; x.textAlign='left'; x.textBaseline='middle';
    x.fillText(fmtP(lastC),plotW+6,yl);
    // nhãn trục dưới: chỉ vẽ tại mốc đổi đơn vị, cách nhau tối thiểu 46px
    const unit=tickUnit(iv,n);
    x.fillStyle=MUT(); x.font='10px system-ui'; x.textAlign='center'; x.textBaseline='alphabetic';
    let lastX=-1e9, prevKey=null, prevT=null;
    for(let i=0;i<n;i++){
      const k=tickKey(unit,vis[i].t);
      if(prevKey!==null&&k!==prevKey){
        const X=cx(i);
        if(X-lastX>=46&&X<plotW-14){
          x.strokeStyle=GRID(); x.beginPath(); x.moveTo(X,padT); x.lineTo(X,volBase); x.stroke();
          x.fillStyle=MUT(); x.fillText(tickLabel(unit,vis[i].t,prevT),X,h-4);
          lastX=X; prevT=vis[i].t;
        }
      }
      if(prevKey===null) prevT=vis[i].t;
      prevKey=k;
    }
    // % của khoảng đang xem + chú thích MA20
    const pct=(lastC/vis[0].o-1)*100;
    x.textAlign='left'; x.font='800 14px system-ui'; x.fillStyle=pct>=0?UP:DOWN;
    x.fillText(`${opt.label?opt.label(iv,n):''}${pct>=0?'+':''}${pct.toFixed(2)}%`,8,padT+8);
    x.font='10.5px system-ui'; let lx=8;
    for(const per of ind.ma){ x.fillStyle=MACOL[per]||'rgba(148,163,184,.9)';
      const t='— MA'+per; x.fillText(t,lx,padT+24); lx+=x.measureText(t).width+10; }
    // RSI 14 phiên (dải riêng dưới cùng)
    if(ind.rsi&&rows.length>15){
      const top=h-22-rsiH+4, bh=rsiH-10;
      const ry=v=>top+(100-v)/100*bh;
      x.strokeStyle=GRID(); x.beginPath(); x.moveTo(0,ry(70)); x.lineTo(plotW,ry(70)); x.stroke();
      x.beginPath(); x.moveTo(0,ry(30)); x.lineTo(plotW,ry(30)); x.stroke();
      x.fillStyle=MUT(); x.font='9.5px system-ui'; x.textAlign='left';
      x.fillText('70',plotW+6,ry(70)); x.fillText('30',plotW+6,ry(30));
      // Wilder: trung bình tăng/giảm làm mượt dần
      let ag=0,al=0;
      for(let k=1;k<=14&&k<rows.length;k++){ const d=rows[k].c-rows[k-1].c; d>=0?ag+=d:al-=d; }
      ag/=14; al/=14;
      const rsi=new Array(rows.length).fill(null);
      for(let k=15;k<rows.length;k++){
        const d=rows[k].c-rows[k-1].c;
        ag=(ag*13+(d>0?d:0))/14; al=(al*13+(d<0?-d:0))/14;
        rsi[k]=al===0?100:100-100/(1+ag/al);
      }
      x.strokeStyle='rgba(139,92,246,.95)'; x.lineWidth=1.4; x.beginPath(); let st=false;
      for(let i=0;i<n;i++){ const v=rsi[i0+i]; if(v==null) continue;
        const yy=ry(v); st?x.lineTo(cx(i),yy):x.moveTo(cx(i),yy); st=true; }
      if(st) x.stroke();
      x.fillStyle='rgba(139,92,246,.95)'; x.font='700 10px system-ui';
      x.fillText('RSI 14',8,top+11);
    }
    // thanh ngắm
    if(hover>=0&&hover<n){
      const X=cx(hover), r=vis[hover];
      x.strokeStyle=light()?'rgba(0,0,0,.35)':'rgba(255,255,255,.35)'; x.lineWidth=1;
      x.setLineDash([4,4]);
      x.beginPath(); x.moveTo(X,padT); x.lineTo(X,h-16); x.stroke();
      x.beginPath(); x.moveTo(0,y(r.c)); x.lineTo(plotW,y(r.c)); x.stroke();
      x.setLineDash([]);
      x.fillStyle=light()?'#16181d':'#e9e9ef';
      x.fillRect(plotW,y(r.c)-8,padR,16);
      x.fillStyle=light()?'#fff':'#0a0a0c'; x.font='700 10.5px system-ui';
      x.textAlign='left'; x.textBaseline='middle'; x.fillText(fmtP(r.c),plotW+6,y(r.c));
      paintTip(r,X,vis[hover-1]);
    } else if(opt.legend){          // chưa rê chuột: vẫn hiện nến MỚI NHẤT, chỉ để mờ
      paintTip(vis[n-1],0,vis[n-2]); opt.legend.classList.remove('on');
    }
  };

  /* ---- DÒNG CHÚ GIẢI CỐ ĐỊNH (thay hộp bám theo chuột) ----------------------
     Hộp cũ chạy theo con trỏ, che mất chính chỗ đang muốn xem. Nay O/C/H/L nằm
     yên một dòng trên đầu biểu đồ như các nền tảng PTKT chuyên dụng: rê tới đâu
     dòng này đổi số tới đó, không có gì che nến. */
  function paintTip(r,X,prev){
    const host=opt.legend; if(!host) return;
    const chg=prev?((r.c-prev.c)/prev.c*100):((r.c-r.o)/r.o*100);
    const col=chg>=0?UP:DOWN;
    const it=(k,v,c)=>`<i>${k}</i><b${c?` style="color:${c}"`:''}>${v}</b>`;
    host.innerHTML=`<u>${fullLabel(iv,r.t)}</u>`+
      it('O',fmtP(r.o))+it('H',fmtP(r.h))+it('L',fmtP(r.l))+it('C',fmtP(r.c),col)+
      it('',(chg>=0?'+':'')+chg.toFixed(2)+'%',col)+
      (r.v?it('KL',fmtV(r.v)):'');
    host.classList.add('on');
  }

  /* ---- tương tác ---- */
  const idxAt=px=>{
    if(!geo.cw) return -1;
    const i=Math.floor(px/geo.cw);
    return Math.max(0,Math.min(i1-i0-1,i));
  };
  function zoomAt(px,factor){
    const n=rows.length; if(n<6) return;
    const span=i1-i0, at=i0+px/geo.cw;
    let ns=Math.round(span*factor);
    ns=Math.max(6,Math.min(n,ns));
    let ni0=Math.round(at-(at-i0)*ns/span);
    i0=ni0; i1=ni0+ns; clampView(); self.draw();
  }
  cvs.addEventListener('wheel',e=>{
    if(!rows.length) return;
    e.preventDefault();
    const r=cvs.getBoundingClientRect();
    zoomAt(e.clientX-r.left, e.deltaY>0?1.18:0.85);
  },{passive:false});
  cvs.addEventListener('mousedown',e=>{ drag={x:e.clientX,i0}; cvs.style.cursor='grabbing'; });
  window.addEventListener('mouseup',()=>{ drag=null; cvs.style.cursor=''; });
  cvs.addEventListener('mousemove',e=>{
    const r=cvs.getBoundingClientRect(), px=e.clientX-r.left;
    if(drag){
      const dCandles=Math.round((drag.x-e.clientX)/geo.cw);
      const span=i1-i0; i0=drag.i0+dCandles; i1=i0+span; clampView(); hover=-1; self.draw(); return;
    }
    if(px>geo.plotW){ if(hover!==-1){hover=-1; self.draw();} return; }
    const i=idxAt(px);
    if(i!==hover){ hover=i; self.draw(); }
  });
  cvs.addEventListener('mouseleave',()=>{ if(hover!==-1){ hover=-1; self.draw(); } });
  cvs.addEventListener('dblclick',()=>{ self.resetView(); });
  // cảm ứng: 1 ngón trượt/xem, 2 ngón chụm để phóng
  cvs.addEventListener('touchstart',e=>{
    if(e.touches.length===2){
      pinch={d:Math.abs(e.touches[0].clientX-e.touches[1].clientX),span:i1-i0,i0}; drag=null;
    }else if(e.touches.length===1){
      const r=cvs.getBoundingClientRect();
      drag={x:e.touches[0].clientX,i0,moved:false};
      hover=idxAt(e.touches[0].clientX-r.left); self.draw();
    }
  },{passive:true});
  cvs.addEventListener('touchmove',e=>{
    const r=cvs.getBoundingClientRect();
    if(pinch&&e.touches.length===2){
      e.preventDefault();
      const d=Math.abs(e.touches[0].clientX-e.touches[1].clientX)||1;
      const ns=Math.max(6,Math.min(rows.length,Math.round(pinch.span*pinch.d/d)));
      const mid=pinch.i0+pinch.span/2;
      i0=Math.round(mid-ns/2); i1=i0+ns; clampView(); self.draw(); return;
    }
    if(drag&&e.touches.length===1){
      const px=e.touches[0].clientX-r.left, dx=drag.x-e.touches[0].clientX;
      if(Math.abs(dx)>18){                       // vuốt ngang rõ ràng -> trượt thời gian
        e.preventDefault(); drag.moved=true;
        const span=i1-i0; i0=drag.i0+Math.round(dx/geo.cw); i1=i0+span; clampView(); hover=-1;
      }else{ hover=idxAt(px); }
      self.draw();
    }
  },{passive:false});
  cvs.addEventListener('touchend',()=>{ drag=null; pinch=null; });

  let rt=null;
  window.addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(()=>self.draw(),120); });
  return self;
}

g.CPChart=Chart;
g.CPChart.aggregate=aggregate;
g.CPChart.fullLabel=fullLabel;
})(window);
