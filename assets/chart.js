/* ============================================================================
   CPVN chart.js — biểu đồ nến LINH ĐỘNG, dùng chung cho trang cổ phiếu và
   bảng chi tiết ở trang bong bóng.
     · Nến: Trong ngày · Ngày · Tuần · Tháng · Năm (gộp tại chỗ từ nến ngày của kho)
     · Cuộn chuột = phóng to/thu nhỏ quanh con trỏ; kéo = trượt cả thời gian lẫn vùng giá
     · Kéo tiếp sang trái = chừa VÙNG TRỐNG TƯƠNG LAI (tối đa nửa màn hình) để vẽ dự phóng
     · Điện thoại: 1 ngón kéo, 2 ngón chụm để phóng
     · Rê chuột/chạm = thanh ngắm + dòng chú giải O·H·L·C cố định trên đầu (không che nến)
     · Trục dưới tự đổi nhãn theo mức phóng: ngày → tháng → quý → năm
   Không phụ thuộc core.js để trang bong bóng (độc lập) cũng dùng được.
   ========================================================================== */
'use strict';
(function(g){
/* ---- LOGO CPVN đóng dấu trong vùng vẽ ---------------------------------------
   Nạp MỘT lần rồi mọi biểu đồ dùng chung. Ảnh về sau khi chart đã vẽ xong thì
   phải vẽ lại, nếu không lần đầu vào trang sẽ mất dấu. Đường dẫn TUYỆT ĐỐI vì
   cophieu.html chạy URL hai tầng /cophieu/MÃ. */
let logoImg=null, logoXong=false;
const doiLogo=[];                       // các hàm vẽ lại, gọi đúng một lượt khi ảnh về
function logoSan(){
  if(!logoImg){
    logoImg=new Image();
    logoImg.onload=()=>{ logoXong=true; doiLogo.splice(0).forEach(f=>{try{f()}catch(e){}}); };
    logoImg.onerror=()=>{ logoImg=null; };   // hỏng thì thôi, chỉ in chữ
    logoImg.src='/assets/logo-64.png?v=3';
  }
  return logoXong?logoImg:null;
}
function khiCoLogo(f){ if(!logoXong&&logoImg) doiLogo.push(f); }
/* ---- BỘ NÚT VẼ dùng chung cho cả biểu đồ nhỏ lẫn chế độ toàn màn hình ------
   Xếp CỘT DỌC BÊN TRÁI biểu đồ đúng thói quen các trang phân tích kỹ thuật. */
const SVG={
  cur:'<path d="M3.4 2.6 L7 12 L8.6 8.6 L12 7 Z" fill="currentColor" stroke="none"/>',
  tl :'<path d="M3 13 L13 3"/><circle cx="3" cy="13" r="1.7" fill="currentColor"/><circle cx="13" cy="3" r="1.7" fill="currentColor"/>',
  ray:'<path d="M2.5 13.5 L14 2"/><circle cx="2.5" cy="13.5" r="1.7" fill="currentColor"/><path d="M10.5 2 H14 V5.5"/>',
  hl :'<path d="M1.5 8 H14.5"/><circle cx="8" cy="8" r="1.7" fill="currentColor"/>',
  vl :'<path d="M8 1.5 V14.5"/><circle cx="8" cy="8" r="1.7" fill="currentColor"/>',
  pc :'<path d="M1.5 11 L11 1.5 M5 14.5 L14.5 5"/>',
  rc :'<rect x="2.2" y="4" width="11.6" height="8"/>',
  fib:'<path d="M2 3 H14 M2 6.4 H14 M2 9.6 H14 M2 13 H14"/>',
  msr:'<path d="M1.6 9.5 L6.5 14.4 L14.4 6.5 L9.5 1.6 Z M5.2 5.9 L6.9 7.6 M7.6 3.5 L9.3 5.2 M2.8 8.3 L4.5 10"/>',
  txt:'<path d="M3 3.5 H13 M8 3.5 V13 M5.8 13 H10.2"/>',
  mag:'<path d="M4 2.5 V8 a4 4 0 0 0 8 0 V2.5 M4 6 H12"/><path d="M3 2.5 H5.2 M10.8 2.5 H13"/>',
  del:'<path d="M3.4 3.4 L12.6 12.6 M12.6 3.4 L3.4 12.6"/>',
  undo:'<path d="M3 8.2 A5 5 0 1 1 5.2 12.4"/><path d="M2.2 4.6 V8.6 H6.2"/>',
  clr:'<path d="M2.6 4.3 H13.4 M6.4 4.3 V2.6 H9.6 V4.3 M4.2 4.3 L4.9 13.6 H11.1 L11.8 4.3"/>'
};
const TIP={
  cur:'Con trỏ — kéo để dời biểu đồ, cuộn để phóng to thu nhỏ',
  tl :'Đường xu hướng — bấm rồi kéo, hoặc bấm 2 điểm',
  ray:'Tia — như đường xu hướng nhưng kéo dài mãi về phía trước',
  hl :'Đường ngang — mốc giá hỗ trợ / kháng cự',
  vl :'Đường dọc — mốc thời gian',
  pc :'Kênh song song — vẽ 1 đường rồi bấm điểm thứ 3 định độ rộng',
  rc :'Vùng chữ nhật — bấm rồi kéo',
  fib:'Fibonacci thoái lui — kéo từ đỉnh xuống đáy',
  msr:'Thước đo — hiện chênh lệch giá, phần trăm và số phiên',
  txt:'Ghi chú — bấm 1 điểm rồi nhập chữ',
  mag:'Hít nến — điểm vẽ tự bám giá mở/cao/thấp/đóng gần nhất',
  del:'Xoá hình đang chọn (hoặc bấm phím Delete)',
  undo:'Hoàn tác hình vừa vẽ',
  clr:'Xoá hết hình vẽ'
};
const FULL=['cur','|','tl','ray','hl','vl','pc','rc','fib','msr','txt','|','mag','|','del','undo','clr'];
const GON =['cur','|','tl','ray','hl','fib','rc','txt','|','mag','|','del','clr'];
const DTOOL={cur:'',tl:'tl',ray:'ray',hl:'hl',vl:'vl',pc:'pc',rc:'rc',fib:'fib',msr:'msr',txt:'txt'};
function paletteHTML(kind){
  return (kind==='gon'?GON:FULL).map(k=>{
    if(k==='|') return '<hr>';
    const attr=(k in DTOOL)?` data-t="${DTOOL[k]}"${k==='cur'?' class="on"':''}`:` data-a="${k}"`;
    return `<button${attr} title="${TIP[k]}"><svg viewBox="0 0 16 16">${SVG[k]}</svg></button>`;
  }).join('');
}
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
  let rows=[],iv="D",i0=0,i1=0,hover=-1,hoverY=-1;   // hoverY = Y THẬT của con trỏ
/* TRỤC GIÁ chỉnh tay: yPan = dời (theo phần của biên độ), yZoom = giãn/co.
   0 và 1 = tự khít theo nến đang xem như cũ. */
let yPan=0, yZoom=1;
/* HÌNH VẼ PTKT — neo theo DỮ LIỆU (thời gian + giá) nên kéo/phóng vẫn đứng yên */
let draws=[], tool=null, pending=null, preview=null;
let sel=-1, dmove=null, magnet=false, dcol=null;   // hình đang chọn · đang kéo · hít nến · màu vẽ
let dpen=null;                                     // mốc bấm xuống, để phân biệt bấm-nhả với bấm-kéo
  let drag=null,pinch=null;
  const light=()=>opt.light?opt.light():false;
  const GRID=()=>light()?'rgba(0,0,0,.09)':'rgba(255,255,255,.06)';
  const MUT =()=>light()?'#66707f':'#8a8a99';
  const FUT =()=>light()?'#aab2bf':'#5c6070';   // mốc thời gian ở vùng trống tương lai: nhạt hơn
  const PANEL=()=>light()?'#ffffff':'#15151a';
  const TXT =()=>light()?'#16181d':'#e9e9ef';
  const UP='#16c784', DOWN='#ea3943';
  const DEFN={i:0,D:120,W:120,M:60,Y:0};            // 0 = xem hết

  /* ---- khung nhìn ----
     i1 ĐƯỢC PHÉP vượt quá số nến: phần dôi ra là VÙNG TRỐNG TƯƠNG LAI, để kéo
     nến hôm nay vào giữa màn hình mà vẽ đường dự phóng ra phía trước. */
  const OFFMAX=0.5;                        // trống tối đa nửa bề ngang
  function clampView(){
    const n=rows.length;
    if(n<2){ i0=0; i1=n; return; }
    let span=Math.round(i1-i0);
    span=Math.max(5,Math.min(n,span));
    const maxOff=Math.floor(span*OFFMAX);  // số nến trống tối đa được chừa bên phải
    if(i0>n-span+maxOff) i0=n-span+maxOff;
    if(i0<0) i0=0;
    i1=i0+span;
  }
  function resetView(){
    yPan=0; yZoom=1;
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
  const ind={ma:[20], vol:true, rsi:false, bb:false, macd:false};
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
    /* span = bề rộng khung nhìn tính theo NẾN (kể cả phần trống tương lai),
       n = số nến THẬT vẽ được. Bề rộng mỗi nến chia theo span nên khi kéo ra
       vùng trống, nến giữ nguyên kích thước thay vì bị kéo giãn. */
    const span=i1-i0;
    const vis=rows.slice(i0,i1), n=vis.length;
    const volH=ind.vol?Math.round(h*0.17):0;
    const rsiH=ind.rsi?Math.round(h*0.18):0;
    const macH=ind.macd?Math.round(h*0.18):0;
    const subH=rsiH+macH;                    // tổng chiều cao các dải phụ dưới đáy
    const padB=volH+subH+22, padR=geo.padR, padT=geo.padT;
    const volBase=h-22-subH;                 // đáy cột khối lượng (chừa chỗ cho dải phụ)
    const plotW=w-padR, plotH=h-padT-padB;
    geo.plotW=plotW; geo.plotH=plotH; geo.volTop=h-padB+6;
    let mn=Infinity,mx=-Infinity,vmax=0;
    for(const r of vis){ if(r.l<mn)mn=r.l; if(r.h>mx)mx=r.h; if((r.v||0)>vmax)vmax=r.v||0; }
    if(mx-mn<1e-9) mx=mn+1;
    const pad=(mx-mn)*0.06; mn-=pad; mx+=pad;
    if(yZoom!==1||yPan!==0){                    // người dùng đã kéo/giãn trục giá bằng tay
      const c=(mn+mx)/2, hf=(mx-mn)/2*yZoom, sh=yPan*(mx-mn);
      mn=c-hf+sh; mx=c+hf+sh;
    }
    const y=v=>padT+(mx-v)/(mx-mn)*plotH;
    geo.mn=mn; geo.mx=mx; geo.padTv=padT; geo.plotHv=plotH;   // cho lớp vẽ dùng lại
    const cw=plotW/span, bw=Math.max(1,Math.min(16,cw*0.66));
    geo.cw=cw;
    const cx=i=>i*cw+cw/2;

    // TÊN MÃ chìm giữa vùng vẽ (kiểu các trang PTKT): ảnh chụp mang đi đâu cũng
    // biết đang xem mã nào. Vẽ TRƯỚC lưới nên luôn nằm dưới nến, không che gì.
    const wm=opt.wm&&opt.wm();
    if(wm&&wm.sym){
      x.save();
      x.textAlign='center'; x.textBaseline='middle';
      const mid=plotW/2, midY=padT+plotH/2;
      // chặn TRẦN kích thước: màn rộng mà không chặn thì chữ nuốt luôn cái chart
      const s=Math.max(20,Math.min(plotW*0.17,plotH*0.30,120));
      // ĐỦ MỜ để mắt bỏ qua khi đang đọc nến. Đậm lên là khó chịu ngay — người
      // dùng nhìn chart chứ không nhìn chữ; danh tính mã đã có ở đầu trang và ở
      // dấu CPVN.IO góc dưới, chữ này chỉ để ảnh cắt rời vẫn còn ngữ cảnh.
      const al=light()?0.055:0.07;
      x.fillStyle=TXT(); x.globalAlpha=al;
      x.font=`800 ${s}px system-ui`;
      x.fillText(wm.sym,mid,midY-(wm.phu?s*0.18:0));
      if(wm.phu){                       // tên công ty dài -> nhỏ và nhạt hơn hẳn mã
        x.globalAlpha=al*0.7;
        x.font=`600 ${Math.max(10,Math.min(s*0.20,15))}px system-ui`;
        x.fillText(wm.phu,mid,midY+s*0.40);
      }
      x.restore();
    }

    // DẤU CPVN.IO góc trái dưới vùng vẽ — chỗ các trang chart hay đặt logo, không
    // đụng chú giải (góc trái TRÊN) lẫn trục giá (bên phải). Ảnh cắt riêng vùng
    // chart vẫn còn nguồn.
    if(wm&&wm.sym&&plotH>=150){        // chart lùn (panel bong bóng ~110px) thì bỏ, kẻo chật
      const lg=logoSan(), L=20, by=padT+plotH-8;
      khiCoLogo(()=>self.draw());       // ảnh về sau -> vẽ lại đúng một lượt
      x.save();
      let bx=8;
      if(lg){                           // logo để RÕ, dưới 18px là thành cục mờ
        x.globalAlpha=0.85; x.drawImage(lg,bx,by-L+3,L,L); bx+=L+5;
      }
      x.globalAlpha=light()?0.55:0.5;
      x.fillStyle=TXT(); x.textAlign='left'; x.textBaseline='alphabetic';
      x.font='800 12px system-ui'; x.fillText('CPVN.IO',bx,by-4);
      x.restore();
    }

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
    // DẢI BOLLINGER 20 phiên · 2 độ lệch chuẩn (tô mờ khoảng giữa 2 dải)
    if(ind.bb&&rows.length>21){
      const P=20, K=2, up=[], lo=[], mid=[];
      for(let i=0;i<n;i++){
        const gi=i0+i; if(gi<P-1){ up.push(null); lo.push(null); mid.push(null); continue; }
        let s=0; for(let k=gi-P+1;k<=gi;k++) s+=rows[k].c;
        const m=s/P; let q=0; for(let k=gi-P+1;k<=gi;k++) q+=(rows[k].c-m)**2;
        const sd=Math.sqrt(q/P);
        mid.push(m); up.push(m+K*sd); lo.push(m-K*sd);
      }
      x.fillStyle=light()?'rgba(56,189,248,.10)':'rgba(56,189,248,.09)';
      x.beginPath(); let st=false;
      for(let i=0;i<n;i++){ if(up[i]==null) continue; const X=cx(i); st?x.lineTo(X,y(up[i])):x.moveTo(X,y(up[i])); st=true; }
      for(let i=n-1;i>=0;i--){ if(lo[i]==null) continue; x.lineTo(cx(i),y(lo[i])); }
      if(st){ x.closePath(); x.fill(); }
      x.lineWidth=1.2;
      for(const [arr,col,dash] of [[up,'rgba(56,189,248,.85)',null],[lo,'rgba(56,189,248,.85)',null],
                                   [mid,'rgba(56,189,248,.55)',[4,3]]]){
        x.strokeStyle=col; x.setLineDash(dash||[]); x.beginPath(); let s2=false;
        for(let i=0;i<n;i++){ if(arr[i]==null) continue; const X=cx(i); s2?x.lineTo(X,y(arr[i])):x.moveTo(X,y(arr[i])); s2=true; }
        if(s2) x.stroke();
      }
      x.setLineDash([]);
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
    paintDraws(x,y);
    // vạch giá mới nhất
    const lastC=vis[n-1].c, yl=y(lastC), lcol=lastC>=vis[0].o?UP:DOWN;
    x.setLineDash([3,3]); x.strokeStyle=lcol+'99';
    x.beginPath(); x.moveTo(0,yl); x.lineTo(plotW,yl); x.stroke(); x.setLineDash([]);
    x.fillStyle=lcol; x.fillRect(plotW,yl-8,padR,16);
    x.fillStyle='#fff'; x.font='700 10.5px system-ui'; x.textAlign='left'; x.textBaseline='middle';
    x.fillText(fmtP(lastC),plotW+6,yl);
    // nhãn trục dưới: chỉ vẽ tại mốc đổi đơn vị, cách nhau tối thiểu 46px
    const unit=tickUnit(iv,span);
    x.fillStyle=MUT(); x.font='10px system-ui'; x.textAlign='center'; x.textBaseline='alphabetic';
    let lastX=-1e9, prevKey=null, prevT=null;
    const step=barStep();
    // chạy hết span: qua khỏi nến cuối thì mốc thời gian được ngoại suy, để vùng
    // trống tương lai vẫn biết đang chiếu tới tháng/năm nào
    for(let i=0;i<span;i++){
      const t=i<n?vis[i].t:Math.round(vis[n-1].t+(i-(n-1))*step);
      const k=tickKey(unit,t);
      if(prevKey!==null&&k!==prevKey){
        const X=cx(i);
        if(X-lastX>=46&&X<plotW-14){
          x.strokeStyle=GRID(); x.beginPath(); x.moveTo(X,padT); x.lineTo(X,volBase); x.stroke();
          x.fillStyle=i<n?MUT():FUT(); x.fillText(tickLabel(unit,t,prevT),X,h-4);
          lastX=X; prevT=t;
        }
      }
      if(prevKey===null) prevT=t;
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
      const top=h-22-subH+4, bh=rsiH-10;
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
    // MACD 12/26/9 (dải riêng dưới cùng): cột chênh lệch + 2 đường
    if(ind.macd&&rows.length>35){
      const top=h-22-macH+4, bh=macH-10;
      const ema=(arr,per)=>{ const k=2/(per+1), o=[]; let e=arr[0];
        for(let i=0;i<arr.length;i++){ e=i?arr[i]*k+e*(1-k):arr[i]; o.push(e); } return o; };
      const cl=rows.map(r=>r.c), e12=ema(cl,12), e26=ema(cl,26);
      const mac=cl.map((_,i)=>e12[i]-e26[i]), sig=ema(mac,9);
      let amp=1e-9;
      for(let i=0;i<n;i++){ const gi=i0+i; if(gi<26) continue;
        amp=Math.max(amp,Math.abs(mac[gi]),Math.abs(sig[gi]),Math.abs(mac[gi]-sig[gi])); }
      const my=v=>top+bh/2-(v/amp)*(bh/2-2);
      x.strokeStyle=GRID(); x.beginPath(); x.moveTo(0,my(0)); x.lineTo(plotW,my(0)); x.stroke();
      for(let i=0;i<n;i++){ const gi=i0+i; if(gi<26) continue;
        const hv=mac[gi]-sig[gi], y0=my(0), y1=my(hv);
        x.fillStyle=hv>=0?'rgba(22,199,132,.55)':'rgba(234,57,67,.55)';
        x.fillRect(cx(i)-bw/2,Math.min(y0,y1),bw,Math.max(1,Math.abs(y1-y0)));
      }
      for(const [arr,col] of [[mac,'rgba(56,189,248,.95)'],[sig,'rgba(249,115,22,.95)']]){
        x.strokeStyle=col; x.lineWidth=1.3; x.beginPath(); let st=false;
        for(let i=0;i<n;i++){ const gi=i0+i; if(gi<26) continue;
          const yy=my(arr[gi]); st?x.lineTo(cx(i),yy):x.moveTo(cx(i),yy); st=true; }
        if(st) x.stroke();
      }
      x.fillStyle=MUT(); x.font='700 10px system-ui'; x.textAlign='left';
      x.fillText('MACD 12/26/9',8,top+11);
    }
    // thanh ngắm
    if(hover>=0&&hover<span){
      const future=hover>=n;                       // đang rê vào vùng trống phía trước
      const X=cx(hover), r=vis[Math.min(hover,n-1)];
      const DK=light()?'#16181d':'#e9e9ef', LT=light()?'#fff':'#0a0a0c';
      x.strokeStyle=light()?'rgba(0,0,0,.35)':'rgba(255,255,255,.35)'; x.lineWidth=1;
      x.setLineDash([4,4]);
      x.beginPath(); x.moveTo(X,padT); x.lineTo(X,h-16); x.stroke();
      // ĐƯỜNG NGANG theo ĐÚNG Y CỦA CHUỘT (không hít vào giá đóng cửa)
      const yy=hoverY>=0?Math.max(padT,Math.min(padT+plotH,hoverY)):y(r.c);
      x.beginPath(); x.moveTo(0,yy); x.lineTo(plotW,yy); x.stroke();
      x.setLineDash([]);
      // nhãn giá = giá TẠI VỊ TRÍ CHUỘT (nghịch đảo của hàm y)
      const pAt=mx-(yy-padT)/plotH*(mx-mn);
      x.fillStyle=DK; x.fillRect(plotW,yy-8,padR,16);
      x.fillStyle=LT; x.font='700 10.5px system-ui';
      x.textAlign='left'; x.textBaseline='middle'; x.fillText(fmtP(pAt),plotW+6,yy);
      // nhãn NGÀY dưới trục thời gian, ngay dưới thanh ngắm
      const lb=fullLabel(iv,future?tOfX(X):r.t);
      x.font='700 10px system-ui'; x.textAlign='center'; x.textBaseline='middle';
      const tw=x.measureText(lb).width+12;
      const bx=Math.max(0,Math.min(plotW-tw,X-tw/2));
      x.fillStyle=DK; x.fillRect(bx,h-16,tw,15);
      x.fillStyle=LT; x.fillText(lb,bx+tw/2,h-8);
      // vùng trống chưa có nến -> dòng chú giải giữ nến mới nhất và để mờ
      if(future){ paintTip(vis[n-1],0,vis[n-2]); if(opt.legend) opt.legend.classList.remove('on'); }
      else paintTip(r,X,vis[hover-1]);
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

  /* ---- LỚP VẼ PHÂN TÍCH KỸ THUẬT ------------------------------------------
     Mỗi hình lưu theo (thời gian, giá) chứ không theo pixel, nên kéo ngang/dọc
     hay phóng to thu nhỏ thì hình vẫn dính đúng chỗ trên nến. */
  const FIB=[0,0.236,0.382,0.5,0.618,0.786,1];
  function barStep(){                        // khoảng thời gian trung bình giữa 2 nến gần đây
    const n=rows.length; if(n<2) return 86400;
    const k=Math.min(n-1,20);
    return (rows[n-1].t-rows[n-1-k].t)/k || 86400;
  }
  function idxOfT(t){                       // vị trí (số thực) của mốc thời gian trong dãy nến
    const n=rows.length; if(!n) return 0;
    if(t<=rows[0].t) return 0;
    // quá nến cuối -> ngoại suy vào vùng trống, để vẽ được đường dự phóng tương lai
    if(t>=rows[n-1].t) return n-1+(t-rows[n-1].t)/barStep();
    let lo=0,hi=n-1;
    while(hi-lo>1){ const m=(lo+hi)>>1; if(rows[m].t<=t) lo=m; else hi=m; }
    const a=rows[lo].t,b=rows[hi].t;
    return lo+(b>a?(t-a)/(b-a):0);
  }
  const xOfT=t=>(idxOfT(t)-i0)*geo.cw+geo.cw/2;
  function tOfX(px){
    const n=rows.length; if(!n) return 0;
    const f=i0+px/geo.cw-0.5;
    if(f>=n-1) return Math.round(rows[n-1].t+(f-(n-1))*barStep());   // vùng trống tương lai
    const k=Math.max(0,f);
    const lo=Math.floor(k), hi=Math.min(n-1,lo+1);
    return Math.round(rows[lo].t+(rows[hi].t-rows[lo].t)*(k-lo));
  }
  const vOfY=py=>geo.mx-(py-geo.padTv)/geo.plotHv*(geo.mx-geo.mn);
  self.vOfY=vOfY; self.tOfX=tOfX;
  const DCOL='#2962ff';
  const yOfV=v=>geo.padTv+(geo.mx-v)/(geo.mx-geo.mn)*geo.plotHv;   // bản dùng ngoài draw()
  function paintOne(x,y,d,live,isSel){
    const P=d.p.map(q=>({x:xOfT(q.t),y:y(q.v)}));
    x.save();
    x.strokeStyle=d.col||DCOL; x.fillStyle=d.col||DCOL;
    x.lineWidth=(live?1.2:1.6)*(isSel?1.6:1); if(live) x.setLineDash([5,4]);
    const W=geo.plotW;
    if(d.k==='hl'&&P[0]){
      x.beginPath(); x.moveTo(0,P[0].y); x.lineTo(W,P[0].y); x.stroke();
      x.font='700 10px system-ui'; x.textAlign='left'; x.textBaseline='bottom';
      x.fillText(fmtP(d.p[0].v),4,P[0].y-3);
    }else if(d.k==='vl'&&P[0]){
      x.beginPath(); x.moveTo(P[0].x,geo.padTv); x.lineTo(P[0].x,geo.padTv+geo.plotHv); x.stroke();
    }else if(d.k==='txt'&&P[0]){
      x.font='700 12px system-ui'; x.textAlign='left'; x.textBaseline='middle';
      x.fillText(d.txt||'Ghi chú',P[0].x+7,P[0].y);
      x.beginPath(); x.arc(P[0].x,P[0].y,3,0,7); x.fill();
    }else if(P.length>=2){
      const a=P[0], b=P[1];
      if(d.k==='tl'){ x.beginPath(); x.moveTo(a.x,a.y); x.lineTo(b.x,b.y); x.stroke(); }
      else if(d.k==='ray'){                       // tia: kéo dài mãi về phía điểm thứ 2
        const dx=b.x-a.x, dy=b.y-a.y, k=dx?(dx>0?(W-a.x)/dx:(0-a.x)/dx):1e4;
        x.beginPath(); x.moveTo(a.x,a.y); x.lineTo(a.x+dx*Math.max(1,k),a.y+dy*Math.max(1,k)); x.stroke();
      }
      else if(d.k==='pc'&&P.length>=3){           // kênh song song: 2 đường song song + tô mờ
        const c=P[2], off=c.y-(a.y+(b.y-a.y)*((c.x-a.x)/((b.x-a.x)||1)));
        x.beginPath(); x.moveTo(a.x,a.y); x.lineTo(b.x,b.y); x.stroke();
        x.beginPath(); x.moveTo(a.x,a.y+off); x.lineTo(b.x,b.y+off); x.stroke();
        x.globalAlpha=0.10; x.beginPath();
        x.moveTo(a.x,a.y); x.lineTo(b.x,b.y); x.lineTo(b.x,b.y+off); x.lineTo(a.x,a.y+off);
        x.closePath(); x.fill(); x.globalAlpha=1;
      }
      else if(d.k==='msr'){                       // thước đo: chênh lệch giá · % · số phiên
        const v0=d.p[0].v, v1=d.p[1].v, pc=v0?((v1-v0)/v0*100):0, up=v1>=v0;
        const nb=Math.round(Math.abs(idxOfT(d.p[1].t)-idxOfT(d.p[0].t)));
        x.strokeStyle=x.fillStyle=up?UP:DOWN;
        const X0=Math.min(a.x,b.x), X1=Math.max(a.x,b.x), Y0=Math.min(a.y,b.y), Y1=Math.max(a.y,b.y);
        x.globalAlpha=0.13; x.fillRect(X0,Y0,X1-X0,Y1-Y0); x.globalAlpha=1;
        x.beginPath(); x.rect(X0,Y0,X1-X0,Y1-Y0); x.stroke();
        x.beginPath(); x.moveTo((X0+X1)/2,a.y); x.lineTo((X0+X1)/2,b.y); x.stroke();
        const lb=`${up?'+':''}${fmtP(v1-v0)}  (${pc>=0?'+':''}${pc.toFixed(2)}%)  ${nb} phiên`;
        x.font='700 11px system-ui'; x.textAlign='center'; x.textBaseline='bottom';
        const tw=x.measureText(lb).width+14, cx0=Math.max(tw/2,Math.min(W-tw/2,(X0+X1)/2));
        x.fillRect(cx0-tw/2,Y0-19,tw,17);
        x.fillStyle='#fff'; x.fillText(lb,cx0,Y0-5);
      }
      else if(d.k==='rc'){
        x.beginPath(); x.rect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x),Math.abs(b.y-a.y));
        x.stroke(); x.globalAlpha=0.10; x.fill(); x.globalAlpha=1;
      }else if(d.k==='fib'){
        const v0=d.p[0].v, v1=d.p[1].v, x0=Math.min(a.x,b.x), x1=Math.max(a.x,b.x);
        x.font='700 9.5px system-ui'; x.textBaseline='bottom';   // chữ nằm TRÊN đường, khỏi bị gạch ngang
        x.setLineDash([4,3]);
        // nhãn nằm bên phải, nhưng nếu sát mép thì lật vào trong cho khỏi bị cắt
        const flip=x1>W-72; x.textAlign=flip?'right':'left';
        for(const f of FIB){
          const v=v0+(v1-v0)*f, yy=y(v);
          x.beginPath(); x.moveTo(x0,yy); x.lineTo(x1,yy); x.stroke();
          x.fillText((f*100).toFixed(1)+'%  '+fmtP(v),flip?x1-4:x1+4,yy-2.5);
        }
        x.setLineDash([]);
      }
    }
    // chấm neo để biết hình đang ở đâu; hình ĐANG CHỌN thì neo to hơn, viền trắng
    if(!live) for(const q of P){
      x.beginPath(); x.arc(q.x,q.y,isSel?5:2.6,0,7); x.fill();
      if(isSel){ x.strokeStyle='#fff'; x.lineWidth=1.6; x.stroke(); }
    }
    x.restore();
  }
  function paintDraws(x,y){
    // cắt gọn trong vùng giá: hình vẽ không được tràn xuống dải khối lượng / RSI / MACD
    x.save(); x.beginPath(); x.rect(0,geo.padTv,geo.plotW,geo.plotHv); x.clip();
    draws.forEach((d,i)=>paintOne(x,y,d,false,i===sel));
    if(pending){
      const pts=pending.p.concat(preview?[preview]:[]);
      if(pts.length) paintOne(x,y,{k:pending.k,p:pts,col:pending.col,txt:pending.txt},true);
    }
    x.restore();
  }
  const NEED={hl:1,vl:1,txt:1,tl:2,ray:2,rc:2,fib:2,msr:2,pc:3};

  /* ---- CHỌN / KÉO / XOÁ TỪNG HÌNH ---------------------------------------- */
  const HIT=8;                                          // bán kính bắt trúng (px)
  function segDist(px,py,a,b){                          // khoảng cách từ điểm tới đoạn thẳng
    const dx=b.x-a.x, dy=b.y-a.y, L=dx*dx+dy*dy;
    const t=L?Math.max(0,Math.min(1,((px-a.x)*dx+(py-a.y)*dy)/L)):0;
    return Math.hypot(px-(a.x+dx*t),py-(a.y+dy*t));
  }
  function hitOne(d,px,py){
    const P=d.p.map(q=>({x:xOfT(q.t),y:yOfV(q.v)})), W=geo.plotW;
    for(let i=0;i<P.length;i++) if(Math.hypot(px-P[i].x,py-P[i].y)<=HIT) return {pt:i};
    if(d.k==='hl') return Math.abs(py-P[0].y)<=HIT?{}:null;
    if(d.k==='vl') return Math.abs(px-P[0].x)<=HIT?{}:null;
    if(d.k==='txt') return (px>P[0].x-HIT&&px<P[0].x+90&&Math.abs(py-P[0].y)<=10)?{}:null;
    if(P.length<2) return null;
    const a=P[0], b=P[1];
    if(d.k==='tl') return segDist(px,py,a,b)<=HIT?{}:null;
    if(d.k==='ray'){
      const dx=b.x-a.x, dy=b.y-a.y, k=dx?(dx>0?(W-a.x)/dx:(0-a.x)/dx):1e4;
      return segDist(px,py,a,{x:a.x+dx*Math.max(1,k),y:a.y+dy*Math.max(1,k)})<=HIT?{}:null;
    }
    if(d.k==='rc'||d.k==='msr'){
      const X0=Math.min(a.x,b.x), X1=Math.max(a.x,b.x), Y0=Math.min(a.y,b.y), Y1=Math.max(a.y,b.y);
      return (px>=X0-HIT&&px<=X1+HIT&&py>=Y0-HIT&&py<=Y1+HIT)?{}:null;
    }
    if(d.k==='pc'&&P.length>=3){
      const c=P[2], off=c.y-(a.y+(b.y-a.y)*((c.x-a.x)/((b.x-a.x)||1)));
      return (segDist(px,py,a,b)<=HIT||segDist(px,py,{x:a.x,y:a.y+off},{x:b.x,y:b.y+off})<=HIT)?{}:null;
    }
    if(d.k==='fib'){
      const v0=d.p[0].v, v1=d.p[1].v, X0=Math.min(a.x,b.x), X1=Math.max(a.x,b.x);
      if(px<X0-HIT||px>X1+HIT) return null;
      for(const f of FIB) if(Math.abs(py-yOfV(v0+(v1-v0)*f))<=HIT) return {};
      return null;
    }
    return null;
  }
  function hitTest(px,py){                              // hình vẽ sau đè hình trước
    for(let i=draws.length-1;i>=0;i--){ const h=hitOne(draws[i],px,py); if(h) return {i,pt:h.pt}; }
    return null;
  }
  function snapV(px,py){                                // hít vào giá O/H/L/C gần nhất
    if(!magnet) return vOfY(py);
    const gi=Math.round(i0+px/geo.cw-0.5);
    const r=rows[Math.max(0,Math.min(rows.length-1,gi))]; if(!r) return vOfY(py);
    const v=vOfY(py);
    let best=v, bd=Infinity;
    for(const c of [r.o,r.h,r.l,r.c]){ const dd=Math.abs(yOfV(c)-py); if(dd<bd){bd=dd;best=c;} }
    return bd<=22?best:v;                               // xa quá thì thôi, khỏi giật
  }
  self.setTool=function(n){ tool=n||null; pending=null; preview=null; sel=-1;
    cvs.style.cursor=tool?'crosshair':''; self.draw(); };
  self.getTool=()=>tool;
  self.getDraws=()=>draws;
  self.setDraws=function(a){ draws=Array.isArray(a)?a:[]; sel=-1; self.draw(); };
  self.undoDraw=function(){ if(pending){pending=null;preview=null;} else {draws.pop(); sel=-1;}
    self.draw(); if(opt.onDraws) opt.onDraws(draws); };
  self.clearDraws=function(){ draws=[]; pending=null; preview=null; sel=-1;
    self.draw(); if(opt.onDraws) opt.onDraws(draws); };
  self.getSel=()=>sel;
  self.delSel=function(){ if(sel<0) return false;
    draws.splice(sel,1); sel=-1; self.draw(); if(opt.onDraws) opt.onDraws(draws); return true; };
  self.setMagnet=function(b){ magnet=!!b; };
  self.getMagnet=()=>magnet;
  self.setColor=function(c){ dcol=c||null;
    if(sel>=0){ draws[sel].col=dcol; self.draw(); if(opt.onDraws) opt.onDraws(draws); } };
  /* QUY TẮC VẼ theo đúng thói quen các trang phân tích kỹ thuật:
       · bấm–kéo–thả ra một hình, hoặc bấm điểm đầu rồi bấm điểm cuối
       · vẽ XONG MỘT hình là tự trả về con trỏ (không vẽ liên tiếp)
       · Esc huỷ hình đang vẽ dở                                            */
  function finishDraw(){
    if(!pending) return;
    if(pending.k==='txt'){
      const s=prompt('Nội dung ghi chú:','');
      if(s===null||!s.trim()){ cancelDraw(); return; }
      pending.txt=s.trim();
    }
    draws.push(pending); pending=null; preview=null;
    if(opt.onDraws) opt.onDraws(draws);
    tool=null; cvs.style.cursor='';                 // trả về con trỏ
    if(opt.onTool) opt.onTool(null);
    self.draw();
  }
  function cancelDraw(){
    pending=null; preview=null; tool=null; cvs.style.cursor='';
    if(opt.onTool) opt.onTool(null);
    self.draw();
  }
  function addPoint(px,py){
    // giữ điểm vẽ trong vùng giá, kể cả khi bấm/nhả trúng trục giá bên phải
    px=Math.max(0,Math.min(geo.plotW-1,px));
    py=Math.max(geo.padTv,Math.min(geo.padTv+geo.plotHv,py));
    const p={t:tOfX(px), v:snapV(px,py)};
    if(!pending) pending={k:tool,p:[p],col:dcol||undefined};
    else pending.p.push(p);
    if(pending.p.length>=(NEED[pending.k]||2)) finishDraw(); else self.draw();
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
  cvs.addEventListener('mousedown',e=>{
    const r=cvs.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top;
    if(tool){                                     // đang chọn công cụ vẽ
      addPoint(px,py);
      if(pending) dpen={x:px,y:py,n:pending.p.length};   // ghi mốc để biết có KÉO hay không
      return;
    }
    if(px<=geo.plotW){                            // không có công cụ -> thử CHỌN hình vẽ
      const h=hitTest(px,py);
      if(h){ sel=h.i;
        dmove={i:h.i, pt:h.pt, t0:tOfX(px), v0:vOfY(py), p0:draws[h.i].p.map(q=>({...q}))};
        cvs.style.cursor='move'; self.draw(); return;
      }
      if(sel>=0){ sel=-1; self.draw(); }          // bấm ra chỗ trống -> bỏ chọn
    }
    // kéo trên TRỤC GIÁ = giãn/co trục giá; kéo trong khung = dời cả 2 chiều
    drag={x:e.clientX,y:e.clientY,i0,yPan,yZoom,axis:px>geo.plotW};
    cvs.style.cursor=drag.axis?'ns-resize':'grabbing';
  });
  window.addEventListener('mouseup',e=>{
    // nhả chuột sau khi KÉO -> chốt luôn điểm cuối (kiểu bấm–kéo–thả)
    if(dpen&&pending&&pending.p.length===dpen.n){
      const r=cvs.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top;
      // nhả tay ra ngoài vùng vẽ thì KẸP vào mép, đừng bỏ dở hình đang vẽ
      if(Math.hypot(px-dpen.x,py-dpen.y)>5) addPoint(Math.min(px,geo.plotW-1),py);
    }
    dpen=null;
    if(dmove){ dmove=null; if(opt.onDraws) opt.onDraws(draws); }
    drag=null; cvs.style.cursor=tool?'crosshair':'';
  });
  cvs.addEventListener('mousemove',e=>{
    const r=cvs.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top;
    if(dmove){                                    // đang kéo hình vẽ (cả hình hoặc 1 điểm neo)
      const dt=tOfX(px)-dmove.t0, dv=snapV(px,py)-dmove.v0, d=draws[dmove.i];
      if(dmove.pt!=null){ d.p[dmove.pt]={t:dmove.p0[dmove.pt].t+dt, v:dmove.p0[dmove.pt].v+dv}; }
      else d.p=dmove.p0.map(q=>({t:q.t+dt, v:q.v+dv}));
      hover=-1; self.draw(); return;
    }
    if(drag){
      if(drag.axis){                              // giãn/co trục giá
        yZoom=Math.max(0.15,Math.min(6,drag.yZoom*(1+(e.clientY-drag.y)/260)));
      }else{                                      // DỜI: ngang = thời gian, DỌC = giá
        const span=i1-i0;
        i0=drag.i0+Math.round((drag.x-e.clientX)/geo.cw); i1=i0+span; clampView();
        yPan=drag.yPan+(e.clientY-drag.y)/(geo.plotHv||geo.plotH||1);
      }
      hover=-1; self.draw(); return;
    }
    if(tool&&pending){ preview={t:tOfX(px),v:snapV(px,py)}; self.draw(); return; }
    if(px>geo.plotW){ if(hover!==-1){hover=-1; hoverY=-1; self.draw();} return; }
    if(!tool&&draws.length) cvs.style.cursor=hitTest(px,py)?'move':'';   // rê trúng hình -> báo kéo được
    const i=idxAt(px);
    /* Đường ngang phải BÁM ĐÚNG CHUỘT, không hít vào giá đóng cửa của nến. Nên vẽ lại
       cả khi chỉ đổi Y (rê dọc trong cùng một nến) — trước chỉ vẽ khi đổi nến. */
    if(i!==hover||Math.abs(py-hoverY)>0.5){ hover=i; hoverY=py; self.draw(); }
  });
  cvs.addEventListener('mouseleave',()=>{ if(hover!==-1){ hover=-1; hoverY=-1; self.draw(); } });
  /* Trang gọi khi bấm Esc: đang vẽ dở thì huỷ nét vẽ và trả TRUE, để Esc đó
     không đóng luôn cửa sổ toàn màn hình. */
  self.cancelTool=function(){ if(!pending&&!tool) return false; cancelDraw(); return true; };
  // phím Delete xoá hình đang chọn
  window.addEventListener('keydown',e=>{
    if(!cvs.isConnected) return;
    const a=document.activeElement;
    if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.isContentEditable)) return;
    if(sel<0) return;
    if(e.key!=='Delete'&&e.key!=='Backspace') return;
    e.preventDefault(); self.delSel();
  });
  cvs.addEventListener('dblclick',()=>{ self.resetView(); });
  // cảm ứng: 1 ngón trượt/xem, 2 ngón chụm để phóng
  cvs.addEventListener('touchstart',e=>{
    if(e.touches.length===2){
      pinch={d:Math.abs(e.touches[0].clientX-e.touches[1].clientX),span:i1-i0,i0}; drag=null;
    }else if(e.touches.length===1){
      const r=cvs.getBoundingClientRect();
      const p0=e.touches[0], px=p0.clientX-r.left, py=p0.clientY-r.top;
      if(tool){ addPoint(px,py); if(pending) dpen={x:px,y:py,n:pending.p.length}; return; }
      if(px<=geo.plotW){                       // chạm trúng hình vẽ -> chọn và kéo được bằng ngón
        const hit=hitTest(px,py);
        if(hit){ sel=hit.i;
          dmove={i:hit.i, pt:hit.pt, t0:tOfX(px), v0:vOfY(py), p0:draws[hit.i].p.map(q=>({...q}))};
          self.draw(); return;
        }
        if(sel>=0){ sel=-1; self.draw(); }
      }
      drag={x:p0.clientX,y:p0.clientY,i0,yPan,moved:false};
      hover=idxAt(e.touches[0].clientX-r.left); self.draw();
    }
  },{passive:true});
  cvs.addEventListener('touchmove',e=>{
    const r=cvs.getBoundingClientRect();
    if(tool&&pending&&e.touches.length===1){   // đang kéo ra hình -> xem trước
      e.preventDefault();
      const px=e.touches[0].clientX-r.left, py=e.touches[0].clientY-r.top;
      preview={t:tOfX(px),v:snapV(px,py)}; self.draw(); return;
    }
    if(dmove&&e.touches.length===1){          // kéo hình vẽ bằng ngón tay
      e.preventDefault();
      const px=e.touches[0].clientX-r.left, py=e.touches[0].clientY-r.top;
      const dt=tOfX(px)-dmove.t0, dv=snapV(px,py)-dmove.v0, d=draws[dmove.i];
      if(dmove.pt!=null) d.p[dmove.pt]={t:dmove.p0[dmove.pt].t+dt, v:dmove.p0[dmove.pt].v+dv};
      else d.p=dmove.p0.map(q=>({t:q.t+dt, v:q.v+dv}));
      hover=-1; self.draw(); return;
    }
    if(pinch&&e.touches.length===2){
      e.preventDefault();
      const d=Math.abs(e.touches[0].clientX-e.touches[1].clientX)||1;
      const ns=Math.max(6,Math.min(rows.length,Math.round(pinch.span*pinch.d/d)));
      const mid=pinch.i0+pinch.span/2;
      i0=Math.round(mid-ns/2); i1=i0+ns; clampView(); self.draw(); return;
    }
    if(drag&&e.touches.length===1){
      const px=e.touches[0].clientX-r.left, dx=drag.x-e.touches[0].clientX;
      const dy=(drag.y||0)-e.touches[0].clientY;
      if(Math.abs(dx)>18||Math.abs(dy)>18){      // vuốt rõ ràng -> dời cả ngang lẫn dọc
        e.preventDefault(); drag.moved=true;
        const span=i1-i0; i0=drag.i0+Math.round(dx/geo.cw); i1=i0+span; clampView();
        yPan=(drag.yPan||0)-dy/(geo.plotHv||geo.plotH||1); hover=-1;
      }else{ hover=idxAt(px); }
      self.draw();
    }
  },{passive:false});
  cvs.addEventListener('touchend',e=>{
    // nhấc ngón sau khi kéo -> chốt điểm cuối, giống bấm–kéo–thả bằng chuột
    if(dpen&&pending&&pending.p.length===dpen.n){
      const t=e.changedTouches&&e.changedTouches[0];
      if(t){ const r=cvs.getBoundingClientRect(), px=t.clientX-r.left, py=t.clientY-r.top;
        if(Math.hypot(px-dpen.x,py-dpen.y)>8) addPoint(Math.min(px,geo.plotW-1),py); }
    }
    dpen=null;
    if(dmove){ dmove=null; if(opt.onDraws) opt.onDraws(draws); }
    drag=null; pinch=null;
  });

  let rt=null;
  window.addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(()=>self.draw(),120); });
  return self;
}

/* Nối cột nút với một biểu đồ. Trả về hàm đánh dấu nút đang chọn, để biểu đồ
   gọi lại mỗi khi vẽ xong và tự trả về con trỏ. */
function bindPalette(host,chart){
  const tbs=[...host.querySelectorAll('button[data-t]')];
  const mark=t=>tbs.forEach(b=>b.classList.toggle('on',(b.dataset.t||'')===(t||'')));
  tbs.forEach(b=>b.onclick=()=>{ chart.setTool(b.dataset.t||null); mark(b.dataset.t||''); });
  host.querySelectorAll('button[data-a]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.a;
    if(a==='mag'){ const on=!chart.getMagnet(); chart.setMagnet(on); b.classList.toggle('on',on); }
    else if(a==='del'){ if(!chart.delSel()) alert('Bấm vào một hình vẽ để chọn trước đã.'); }
    else if(a==='undo') chart.undoDraw();
    else if(a==='clr'){ if(chart.getDraws().length&&confirm('Xoá hết hình vẽ của mã này?')) chart.clearDraws(); }
  });
  return mark;
}

g.CPChart=Chart;
g.CPChart.aggregate=aggregate;
g.CPChart.fullLabel=fullLabel;
g.CPChart.paletteHTML=paletteHTML;
g.CPChart.bindPalette=bindPalette;
})(window);
