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
  fibe:'<path d="M2 2.5 H14 M2 6 H14 M2 12.5 H10"/><path d="M11.5 10 L14 12.5 L11.5 15"/>',
  pen:'<path d="M2.4 13.6 L4 9.6 L11.2 2.4 L13.6 4.8 L6.4 12 Z"/><path d="M10 3.6 L12.4 6"/>',
  poly:'<path d="M2 12 L6 5.5 L10 9.5 L14 3"/><circle cx="2" cy="12" r="1.5" fill="currentColor"/><circle cx="6" cy="5.5" r="1.5" fill="currentColor"/><circle cx="10" cy="9.5" r="1.5" fill="currentColor"/><circle cx="14" cy="3" r="1.5" fill="currentColor"/>',
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
  fibe:'Fibonacci mở rộng — bấm 3 điểm A·B·C, chiếu biên độ A→B tiếp từ C',
  pen:'Bút vẽ — giữ chuột rê tự do',
  poly:'Đường gấp khúc — bấm từng điểm, bấm đúp (hoặc Enter) để kết thúc',
  msr:'Thước đo — hiện chênh lệch giá, phần trăm và số phiên',
  txt:'Ghi chú — bấm 1 điểm rồi nhập chữ',
  mag:'Hít nến — điểm vẽ tự bám giá mở/cao/thấp/đóng gần nhất',
  del:'Xoá hình đang chọn (hoặc bấm phím Delete)',
  undo:'Hoàn tác hình vừa vẽ',
  clr:'Xoá hết hình vẽ'
};
const FULL=['cur','|','tl','ray','poly','pen','hl','vl','pc','rc','fib','fibe','msr','txt','|','mag','|','del','undo','clr'];
const GON =['cur','|','tl','ray','poly','pen','hl','fib','fibe','rc','txt','|','mag','|','del','clr'];
const DTOOL={cur:'',tl:'tl',ray:'ray',poly:'poly',pen:'pen',hl:'hl',vl:'vl',pc:'pc',rc:'rc',
  fib:'fib',fibe:'fibe',msr:'msr',txt:'txt'};
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

/* gộp nến ngày -> tuần/tháng/năm (mở của nến đầu, đóng của nến cuối, cao/thấp/KL cộng dồn)
   HAI ĐƯỜNG PHỦ đi kèm mỗi nến — `vh` vốn hoá của mã · `ix` chỉ số sàn — theo luật ĐÓNG
   CỬA: giữ giá trị CUỐI CÙNG còn số trong rổ, đúng như `cur.c`. Rổ ở đây là object dựng
   TAY nên trường nào quên chép là mất hẳn: bỏ sót hai dòng dưới thì bấm Tuần/Tháng/Năm là
   hai đường lặng lẽ biến mất, không lỗi, không dấu hiệu gì. */
function aggregate(rows,iv){
  if(!rows||!rows.length||iv==='i'||iv==='D') return rows||[];
  const keyOf = iv==='W' ? r=>weekNum(r.t)
              : iv==='M' ? r=>{const d=vn(r.t); return d.getUTCFullYear()*12+d.getUTCMonth();}
              :            r=>vn(r.t).getUTCFullYear();
  const out=[]; let cur=null,k0=null;
  for(const r of rows){
    const k=keyOf(r);
    if(k!==k0){ if(cur) out.push(cur); cur={t:r.t,o:r.o,h:r.h,l:r.l,c:r.c,v:r.v||0,vh:r.vh,ix:r.ix}; k0=k; }
    else{ if(r.h>cur.h)cur.h=r.h; if(r.l<cur.l)cur.l=r.l; cur.c=r.c; cur.v+=r.v||0;
          if(r.vh!=null) cur.vh=r.vh; if(r.ix!=null) cur.ix=r.ix; }
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
/* VỐN HOÁ VIẾT HẲN SỐ THEO ĐƠN VỊ TỶ, đừng đổi bậc sang "nghìn tỷ" — luật toàn site
   (CLAUDE.md): mắt bắt lấy con số rồi dừng, chữ "nghìn" phía sau thành cái đuôi. */
const fmtTy=v=>Math.round(v/1e9).toLocaleString('vi-VN')+' tỷ';

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
let veBut=false;                                   // bút đang được giữ và rê
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
    /* XOÁ ĐỆM NỀN Ở ĐÂY, ĐỪNG DỰA VÀO KHOÁ ĐỆM. `veLaiPhu` gắn vốn hoá/chỉ số vào rồi gọi
       lại setRows với mảng CÙNG độ dài, cùng mốc đầu và cùng mốc cuối — khoá đệm nào dựng
       từ hình dạng chuỗi cũng thấy y hệt lần trước và trả về kết quả tính lúc chưa có phủ,
       tức dải vĩnh viễn rỗng. Đây là đường duy nhất thay `rows` nên xoá ở đây là đủ. */
    nenCache.k='';
    rows=r||[]; if(interval) iv=interval;
    /* ĐIỀU KIỆN RESET KHÔNG ĐƯỢC BẮT VÀO `i1 > rows.length` (sửa 25/08/2026).
       User: *"khi bấm vào vốn hoá / VN-Index / cách nền, chart không bị reset — hiện tại cứ
       chọn là bị reset, mất công kéo lại để nhìn xa hơn"*.
       `clampView` CHO PHÉP chừa tới `span*OFFMAX` nến trống bên phải (vùng trống tương lai,
       để vẽ dự phóng), nên `i1 > rows.length` là trạng thái HỢP LỆ chứ không phải hỏng —
       ai kéo sang phải hoặc thu nhỏ đủ xa là rơi vào đó. Bắt nó rồi gọi `resetView` nghĩa
       là mọi lần bật/tắt đường phủ (đều đi qua `setRows` để gắn dữ liệu vào nến) đều quăng
       người dùng về khung mặc định.
       Chỉ reset khi mép TRÁI thật sự nằm ngoài dữ liệu (`i0 >= rows.length`) — vẫn giữ
       nguyên hành vi reset khi đổi khung Ngày→Tháng, vì lúc đó số nến co lại hàng chục lần
       nên `i0` cũ chắc chắn vượt. */
    if(!keepView||i1<=i0||i0>=rows.length) resetView(); else clampView();
    self.draw(); return self;
  };
  self.rows=()=>rows;
  self.interval=()=>iv;
  self.resetView=function(){ resetView(); self.draw(); };

  /* ---- vẽ ---- */
  const geo={padR:64,padT:14,plotW:0,plotH:0,cw:0,h:0,w:0,volTop:0};
  /* CHỈ BÁO bật/tắt được — mặc định chỉ MA20 như cũ; chế độ PTKT toàn màn hình bật thêm */
  /* MA200 LÀ ĐƯỜNG MẶC ĐỊNH TỪ 24/08/2026 (user: *"nên đổi ma20 thành 200"*) — trước là
     MA20. Chart của trang mã nay bày 13 năm nến cạnh vốn hoá và chỉ số, mà ở tầm đó một
     trung bình 20 phiên chỉ là cái bóng của chính đường giá; 200 mới nói được xu hướng.
     MA200 ĐỔI SANG XÁM THÉP, không giữ tím tía nữa. Nó nay là đường LUÔN BẬT, mà tím
     `rgb(192,38,211)` đứng cạnh hồng sen của VN-Index quy đổi `rgb(219,39,119)` thì lệch
     nhau đúng một kênh (ΔG=1, ΔR=27) — nhìn ra hai đường thì được, nhưng cùng đọc là
     "hồng tím" nên mắt phải dừng lại phân biệt, đúng chỗ không nên phải dừng.
     Xám cũng ĐÚNG VAI: MA200 là cái NỀN để so, không phải một nhân vật của câu chuyện —
     hai nhân vật là vốn hoá (xanh lá) và chỉ số (hồng sen). Cùng lý lẽ đã ghi cho đường
     vốn hoá thị trường hồi trước.
     XÁM TRUNG chứ đừng xám nhạt (luật đã ghi): `#cbd5e1` từng bị đo là trùng dải với
     đường gần trắng. MA20 giữ hổ phách và MA50 giữ xanh trời — hai nút đó chỉ còn ở cửa
     sổ PTKT, đổi màu chúng là đổi thứ người dùng PTKT đã quen. */
  const MACOL={20:'rgba(234,179,8,.85)',50:'rgba(56,189,248,.85)',200:'rgba(148,163,184,.95)'};
  /* EMA màu RIÊNG, không mượn màu MA: bật cả MA50 lẫn EMA50 mà cùng màu thì hai đường
     chạy sát nhau thành một vệt, không đọc ra đường nào là đường nào. */
  const EMACOL={20:'rgba(52,211,153,.9)',50:'rgba(251,146,60,.9)',200:'rgba(232,121,249,.85)'};
  /* HAI CỜ RIÊNG cho hai loại mốc, và `bctc` MẶC ĐỊNH TẮT. Lý do đo được: mốc BCTC có
     mỗi quý một cái, mà chart mặc định mở ở khung Tháng/Năm — VCB ra 27 mốc BCTC chen với
     19 mốc cổ tức trên cùng một hàng, thành một dải chấm liền không đọc được gì. Cổ tức thì
     thưa (19 mốc trải 16 năm) nên bật sẵn được. Ai cần ngày ra báo cáo thì bấm một nút. */
  /* HAI ĐƯỜNG PHỦ — VỐN HOÁ CỦA MÃ (`vh`) và CHỈ SỐ SÀN (`idx`), cả hai MẶC ĐỊNH TẮT vì
     đều phải gọi mạng thêm một lượt. Màu và bề dày ĐỒNG BỘ với đồ thị /phantich (bảng ở
     mục "ĐỒ THỊ CHÍNH CÒN BA ĐƯỜNG" trong CLAUDE.md): xanh lá DÀY = vốn hoá, hồng sen =
     chỉ số. Người xem đi qua lại hai trang, đổi màu ở một bên là mất luôn phép nhận mặt.
     Xanh lá trùng màu nến TĂNG là biết trước và chấp nhận: bề dày 2,4px tách nó ra khỏi
     thân nến, và đây là đường người dùng vừa tự tay bật lên nên không bất ngờ. */
  const VHCOL=()=>light()?'#16a34a':'#34d399';
  const IXCOL=()=>light()?'#db2777':'#f472b6';
  /* SỨC MẠNH TƯƠNG ĐỐI đứng ở DẢI RIÊNG nên được màu riêng — xanh mòng két, không mượn
     hồng sen của đường chỉ số trên chart giá: bật cả hai mà cùng màu thì hai thứ KHÁC
     NHAU (một đường quy đổi neo theo khung · một tỉ số cố định) trông như một. */
  const RSCOL=()=>light()?'#0d9488':'#2dd4bf';
  /* Tỉ số giá÷điểm nhảy bậc rất rộng giữa các mã: VNZ ~300, mã nghìn đồng ~0,002. Số chữ
     số thập phân phải theo độ lớn, cố định 2 chữ số là mã nhỏ hiện toàn "0,00". */
  let ixTen='VN-Index';                    // đổi theo sàn của mã — xem self.setChiSoTen
  /* `nen` — TẮT ĐƯỢC THÂN NẾN (user chốt 23/08/2026: *"có thể chọn ẩn biểu đồ giá đi để
     dễ xem vốn hoá và vnindex hơn"*). Tắt nến KHÔNG đụng tới THANG GIÁ: trục vẫn khít theo
     đỉnh/đáy của chính mấy cây nến đang ẩn, nhờ vậy MA/Bollinger và mọi hình vẽ PTKT vẫn
     đứng nguyên chỗ cũ. Bật/tắt nến là đổi thứ NHÌN THẤY, không đổi hệ toạ độ — bằng không
     ẩn nến một cái là hình vẽ trôi đi mất. */
  const ind={ma:[200], ema:[], vol:true, rsi:false, bb:false, macd:false, sk:true, bctc:false,
             vh:false, idx:false, rs:false, nen:true};
  /* ---- MỐC SỰ KIỆN DOANH NGHIỆP (data/sukien) --------------------------------
     Mỗi mốc: {t, k, gc} — t là giây UNIX ở 00:00 UTC của NGÀY sự kiện, đúng quy ước
     mốc nến của kho. `xOfT` lo phần chiếu sang pixel nên khung Tuần/Tháng/Năm tự đúng,
     không phải xử lý riêng.
     GOM THEO NẾN chứ không vẽ từng mốc: một mã có thể chốt quyền tiền và cổ phiếu CÙNG
     một ngày (SSI 17/08/2026), và ở khung Tháng thì cả chục sự kiện rơi vào một nến —
     vẽ rời ra là mấy chấm chồng lên nhau thành một vệt không đọc được. */
  let sukien=[];            // [{t,k,gc}] đã xếp theo thời gian
  let skHit=[];             // [{x,y,r,ev}] ô bấm trúng của lượt vẽ gần nhất
  let skHover=-1;
  /* HAI CÔNG TẮC MỐC NẰM NGAY TRONG KHUNG ĐỒ THỊ (user chốt 24/08/2026: *"ô hiện hoặc ẩn
     cổ tức và bctc nằm trong khung đồ thị luôn"*). Chúng điều khiển thứ VẼ TRÊN CHÍNH
     KHUNG NÀY nên đứng trong khung là đúng chỗ — và trả lại hai ô cho hàng nút phía trên,
     thứ đang chật nhất ở khổ điện thoại. `mocHit` là ô bấm của lượt vẽ gần nhất. */
  let mocHit=[];
  /* ---- GHIM MỘT PHIÊN ĐỂ ĐỌC SỐ (user chốt 23/08/2026) ------------------------
     *"hiện thêm toạ độ tam giác khi tôi bật chỉ báo vnindex lên, bấm vào sẽ hiện ra điểm
     vnindex - vốn hoá - giá cổ phiếu tại vị trí tôi bấm, để đọc nhanh tình hình tại thời
     điểm đó"*.

     NEO THEO MỐC THỜI GIAN, KHÔNG NEO THEO CHỈ SỐ NẾN. Chỉ số đổi mỗi lần kéo khung (i0
     chạy) và đổi hẳn khi bấm Tuần/Tháng/Năm (số nến co lại còn một phần mười); neo bằng
     `t` thì ghim ở đâu vẫn nằm đúng chỗ đó qua mọi khung, mọi mức phóng.

     CHỈ BẬT KHI CÓ ĐƯỜNG PHỦ (`ind.vh || ind.idx || ind.rs`). Không có hai đường ấy thì hộp chỉ lặp
     lại đúng thứ dòng chú giải trên đầu đã in sẵn khi rê chuột — mà đổi hành vi của cú bấm
     trên một chart có sẵn bộ công cụ vẽ là chuyện phải có lý do. */
  let ghimT=null;
  self.setSuKien=function(list){
    sukien=(list||[]).filter(e=>e&&e.t).sort((a,b)=>a.t-b.t);
    self.draw(); return self;
  };
  /* EMA phải tính DỒN từ đầu chuỗi (mỗi giá trị phụ thuộc toàn bộ quá khứ), không cắt cửa
     sổ như MA được. Nên tính một lần rồi ĐỆM lại, đừng tính trong vòng vẽ: chart vẽ lại
     mỗi lần rê chuột, tính lại 200 kỳ × 3000 nến mỗi khung hình là giật ngay. */
  /* ---- NỀN TƯƠNG QUAN VÀ HAI SỰ KIỆN SỚM (user chốt 25/08/2026) --------------
     *"đợi đường vốn hoá cắt đường VN-Index thì cổ phiếu đã đi được một đoạn xa rồi"* — đo
     trên chính kho này thì đúng y như vậy: 340 lần tụt sâu rồi cắt lên lại, tới lúc cắt
     vốn hoá đã tăng TRUNG VỊ +86% so với đáy, còn lợi suất tương đối 60 phiên SAU cú cắt
     là −1,1%. Cú cắt là mốc mô tả, không phải mốc sớm.

     `g[i]` = log(vốn hoá ÷ k·chỉ số) — ĐÚNG khoảng hở giữa hai đường trên chart, nên
     g = 0 chính là điểm hai đường chạm nhau. Dải này chỉ là cái khoảng hở đó được phóng
     to và cho trục riêng; không phải một phép đo thứ hai để rồi hai chỗ nói hai kiểu.
     `k` tính lại ở đây bằng ĐÚNG công thức của P2 để dải vẫn chạy khi hai đường đang tắt.

     BA DẤU THÌ KHÔNG DÍNH `k`: cả ba đều so sánh g với chính g trong quá khứ, nên nhân k
     kiểu gì chúng cũng đứng nguyên chỗ cũ — tức là chúng nhân quả, còn `k` thì không (k lấy
     trung bình cả chuỗi, có cả phần tương lai của mọi phiên trong quá khứ). Đó là lý do vạch
     số 0 chỉ dùng để MÔ TẢ, còn các dấu mới dùng để ĐỌC SỚM.

     △ PHÂN KỲ — vốn hoá thủng đáy W1 phiên mà g thì không. Nổ sớm hơn cú cắt 262 phiên, lúc
       nổ vốn hoá còn −2% so với đáy. NHƯNG NÓ KHÔNG PHẢI TÍN HIỆU CHỌN MÃ: gộp mỗi tháng
       thành MỘT quan sát thì xác suất cắt lên còn 27% — THẤP HƠN nền 34%. Nó nổ hàng loạt
       đúng lúc chỉ số sập (07/2026: 92 lần trong một tháng, phần lớn các tháng khác bằng 0),
       tức đang nói về THỊ TRƯỜNG chứ không nói gì về từng mã. Vẫn vẽ vì mốc đáy hoảng loạn
       là thông tin thật — nhưng đừng trình bày nó như một tín hiệu sớm.
     ○ G ĐỈNH W1 · ● G ĐỈNH W2, khi CÒN dưới nền — đây mới là tín hiệu cổ phiếu, và chúng
       sống sót qua phép gộp theo tháng: trung vị 120 phiên +1,2% so với nền −2,5%, 250 phiên
       +5,1% so với −4,4%, xác suất cắt lên 50% so với 34%, trải trên 74–106 tháng khác nhau
       (5 tháng đông nhất chỉ chiếm 19%). ○ sớm và dày (bắt 90% số đoạn, sớm hơn cú cắt 115
       phiên), ● thưa và chắc tay hơn (65%, sớm hơn 92 phiên). W2 ⊂ W1 nên phải TRỪ.

     CẢNH BÁO ĐÃ ĐO, ĐỪNG GỠ KHỎI TÀI LIỆU: cả vùng dưới nền đều ÂM trong 2023–2025 bất kể
     dấu nào, vì đó là giai đoạn chỉ số tự nó chạy mạnh nên mã tụt hậu tụt tiếp. Ưu thế của
     ○/● đo trên 2013–2022 rồi nghiệm lại 2020–2025; đừng coi nó là hằng số.

     CỬA SỔ TÍNH THEO SỐ NẾN, không theo số ngày — giống hệt MA/RSI trên chart này: bật
     khung Tuần thì 120 nến là 120 tuần. Chuỗi ngắn thì co lại theo `n` để khung Tháng
     không mất trắng dải. */
  /* CỬA SỔ PHẢI TRÙNG VỚI BỘ LỌC BẢNG GIÁ (`screener.js`: 100/200/300/400), nếu không thì
     một mã hiện `nd100 = 2 phiên` ở bảng giá mà trên chart lại không có dấu nào gần đây —
     đã xảy ra thật khi chart dùng 120/250: dấu gần nhất của GAS lùi tận 144 phiên. */
  const NEN_W1=100, NEN_W2=200, NEN_MA=1250;
  /* CỬA SỔ NỀN QUY THEO KHUNG để mọi khung nói về CÙNG MỘT quãng thời gian (~5 năm), và
     để khung Ngày trùng đúng 1.250 phiên của `build_screen.nen_tuoi()`. Không quy đổi thì
     bật Tuần một cái là nền tụt còn 2,5 năm mà nhãn vẫn ghi "phiên" — user bắt đúng lỗi
     này trên ảnh PVP: "Cách nền 128 phiên" trong khi đang ở khung Tuần. */
  const NEN_MA_KHUNG={d:NEN_MA, W:Math.round(NEN_MA/5), M:Math.round(NEN_MA/21), Y:5};
  const NEN_DV={W:'tuần', M:'tháng', Y:'năm'};
  const nenCache={k:'',v:null};
  function nenArr(){
    const khoa=rows.length+'|'+(rows.length?rows[0].t+'|'+rows[rows.length-1].t:'');
    if(nenCache.k===khoa) return nenCache.v;
    const n=rows.length, g=new Array(n).fill(null), b=new Array(n).fill(null);
    let sa=0,sb=0,co=0,dungVH=false;
    for(let i=0;i<n;i++){ const r=rows[i]; if(r&&r.vh>0&&r.ix>0){ dungVH=true; break; } }
    for(let i=0;i<n;i++){ const r=rows[i]; if(!r||!(r.ix>0)) continue;
      const u=dungVH?r.vh:r.c;
      if(!(u>0)) continue;
      b[i]=u; sa+=Math.log(u); sb+=Math.log(r.ix); co++; }
    const out={k:null,g:g,b:b,pk:new Array(n).fill(false),
               dinhN:new Array(n).fill(false),dinh:new Array(n).fill(false),
               co:co,vh:dungVH,W1:0,W2:0,Wma:0};
    if(co>=2){
      /* NỀN = TRUNG BÌNH TRƯỢT `Wma` NẾN CỦA CHÍNH TỈ SỐ, không phải trung bình cả chuỗi.
         Bản đầu lấy trung bình cả đoạn đang nạp — cùng công thức với `k` của P2 nên vạch 0
         của dải trùng đúng chỗ hai đường cắt nhau, nghe thì gọn. Hai chỗ hỏng:
         ① nó có NHÌN TRƯỚC: mọi phiên quá khứ được neo bằng một con số chứa cả tương lai
            của chính nó, nên không dùng để đọc sớm được;
         ② số phiên nạp thay đổi theo mã và theo khung (GAS về 3.400 nến, VHM về 1.246),
            nên CÙNG MỘT MÃ ra hai con số khác nhau ở chart và ở bảng giá — đo được:
            GAS −33,0% trên chart nhưng −18,3% ở bảng giá, cùng phiên 21/08/2026.
         Trung bình trượt chữa cả hai: nhân quả, và khớp ĐÚNG định nghĩa `nen` của
         `build_screen.nen_tuoi()`. Đổi lại vạch 0 KHÔNG còn trùng điểm cắt của hai đường —
         chấp nhận, vì hai đường trả lời "đắt/rẻ so với trung bình đoạn đang xem" còn dải
         trả lời "mạnh/yếu so với chính mình 5 năm qua". Nhãn dải ghi rõ số nến để không
         ai đọc nhầm thành cùng một câu hỏi. */
      const k=Math.exp(sa/co-sb/co); out.k=k;
      /* KHÔNG cắt còn `n/2` như bản đầu. Chuỗi ngày nạp mặc định chỉ ~1.246 nến nên `n/2`
         hạ cửa sổ xuống 623 — tức chart đo trên 2,5 năm còn bảng giá đo trên 5 năm, đúng
         cái lệch vừa mất công sửa. Cửa sổ cứ để nguyên; phần đầu chuỗi chưa đủ nến thì
         trung bình chạy trên số nến ĐANG CÓ (nở dần rồi mới trượt), và chỉ bắt đầu cho ra
         giá trị khi đã gom đủ `min(Wma,60)` điểm. */
      const Wma=Math.min(NEN_MA_KHUNG[iv]||NEN_MA,Math.max(20,n)); out.Wma=Wma;
      const L=new Array(n).fill(null);
      for(let i=0;i<n;i++) if(b[i]!=null) L[i]=Math.log(b[i]/rows[i].ix);
      let tong=0, dem=0;
      const cua=[];
      for(let i=0;i<n;i++){
        if(L[i]!=null){ cua.push(i); tong+=L[i]; dem++; }
        while(cua.length&&cua[0]<=i-Wma){ tong-=L[cua[0]]; dem--; cua.shift(); }
        if(L[i]!=null&&dem>=Math.min(Wma,60)) g[i]=L[i]-tong/dem;
      }
      const W1=Math.min(NEN_W1,Math.max(20,Math.floor(n/6)));
      const W2=Math.min(NEN_W2,Math.max(40,Math.floor(n/3)));
      out.W1=W1; out.W2=W2;
      const TRE=Math.max(3,Math.round(W1/24));      // "đáy vừa xong" = trong TRE nến gần nhất
      const CU =Math.max(8,Math.round(W1/3));       // "đáy của g đã cũ" = quá CU nến
      let nghi=-1e9;
      for(let i=W1-1;i<n;i++){
        if(b[i]==null||g[i]==null) continue;
        let kb=-1,vb=Infinity,kg=-1,vg=Infinity,thieu=false;
        for(let j=i-W1+1;j<=i;j++){
          if(b[j]==null||g[j]==null){ thieu=true; break; }
          if(b[j]<vb){ vb=b[j]; kb=j; }
          if(g[j]<vg){ vg=g[j]; kg=j; }
        }
        if(thieu) continue;
        if(i-kb<=TRE&&i-kg>CU&&i-nghi>=Math.round(W1/6)){ out.pk[i]=true; nghi=i; }
      }
      /* HAI TẦNG CÙNG MỘT HỌ: đỉnh W1 phiên (sớm, dày) và đỉnh W2 phiên (xác nhận, thưa).
         Đỉnh W2 hiển nhiên cũng là đỉnh W1 nên tầng nhỏ phải TRỪ tầng lớn ra, không thì
         hai dấu chồng lên nhau ở đúng những phiên đáng chú ý nhất. */
      const dinhCua=(W,ra,cach)=>{
        let nghi=-1e9;
        for(let i=W-1;i<n;i++){
          if(g[i]==null||g[i]>=0) continue;        // chỉ tính khi CÒN dưới nền
          let mx=-Infinity,thieu=false;
          for(let j=i-W+1;j<=i;j++){
            if(g[j]==null){ thieu=true; break; }
            if(g[j]>mx) mx=g[j];
          }
          if(thieu) continue;
          if(g[i]>=mx-1e-12&&i-nghi>=cach){ ra[i]=true; nghi=i; }
        }
      };
      /* NGHỈ NGẮN (W/20) chỉ để dấu khỏi dính thành vệt khi mã lập đỉnh nhiều phiên liền.
         Bảng giá KHÔNG có nghỉ — nó đếm phiên gần nhất — nên trong một chuỗi đỉnh liên tiếp
         chart vẽ dấu ở phiên ĐẦU còn bảng giá đếm phiên CUỐI; lệch tối đa W/20 phiên, và
         đó là lệch có chủ ý chứ không phải hai định nghĩa khác nhau. */
      dinhCua(W2,out.dinh,Math.round(W2/20));
      dinhCua(W1,out.dinhN,Math.round(W1/20));
      for(let i=0;i<n;i++) if(out.dinh[i]) out.dinhN[i]=false;
    }
    nenCache.k=khoa; nenCache.v=out;
    return out;
  }
  /* Cửa ra để đọc số của dải — trang ngoài và bộ kiểm thử đều cần lấy ĐÚNG mảng chart
     đang vẽ, chứ tính lại ở chỗ khác là hai nơi lệch nhau lúc nào không biết. */
  self.nenSo=()=>nenArr();
  /* Khung nhìn hiện hành — bộ kiểm thử cần biết ĐANG vẽ từ nến nào tới nến nào và mỗi nến
     rộng bao nhiêu, để phân biệt "dấu tính sai" với "dấu nằm ngoài khung". */
  self.khungNhin=()=>({i0:i0,i1:i1,cw:geo.cw,plotW:geo.plotW,plotH:geo.plotH,
                       oBam:mocHit.map(m=>m.k+':'+Math.round(m.x)+'-'+Math.round(m.x+m.w))});
  const fmtNen=g=>{ const p=(Math.exp(g)-1)*100;
    return (p>=0?'+':'')+p.toLocaleString('vi-VN',{maximumFractionDigits:Math.abs(p)<10?1:0})+'%'; };

  const emaCache=new Map();
  function emaArr(per){
    const khoa=per+'|'+rows.length+'|'+(rows.length?rows[rows.length-1].t:0);
    const co=emaCache.get(per);
    if(co&&co.k===khoa) return co.v;
    const k=2/(per+1), out=new Array(rows.length).fill(null);
    let e=null, sum=0;
    for(let i=0;i<rows.length;i++){
      const c=rows[i].c;
      if(i<per-1){ sum+=c; continue; }
      if(i===per-1){ sum+=c; e=sum/per; }      // mồi bằng trung bình cộng per kỳ đầu, chuẩn chung
      else e=c*k+e*(1-k);
      out[i]=e;
    }
    emaCache.set(per,{k:khoa,v:out});
    return out;
  }
  /* Nến đang ghim. Khung gộp thì mốc rơi vào GIỮA một cây nến tuần/tháng — lấy cây CHỨA
     nó (cây cuối cùng có `t <= ghimT`), đừng đòi khớp tuyệt đối rồi trả về "không có". */
  function ghimIdx(){
    if(ghimT==null||!rows.length) return -1;
    if(ghimT<rows[0].t||ghimT>rows[rows.length-1].t+barStep()) return -1;
    let k=-1;
    for(let z=0;z<rows.length;z++){ if(rows[z].t<=ghimT) k=z; else break; }
    return k;
  }
  self.ghim=()=>ghimT;
  self.setGhim=function(t){ ghimT=t; self.draw(); return self; };
  self.ind=()=>ind;
  self.setInd=function(o){ Object.assign(ind,o||{}); self.draw(); };
  /* Tên chỉ số hiện ở chú thích và ở dòng đọc số. Mã HOSE thì "VN-Index", HNX thì
     "HNX-Index", UPCOM thì "UPCOM-Index" — chart không tự biết sàn, trang gọi phải nói. */
  self.setChiSoTen=function(t){ ixTen=t||'VN-Index'; self.draw(); return self; };
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
    /* KHUNG "TRONG NGÀY" LÀ NẾN 5 PHÚT — kho vốn hoá và kho chỉ số chỉ có số THEO PHIÊN,
       nên dải không có gì để vẽ. Cho `rsH=0` chứ đừng vẽ dải rỗng: cờ vẫn bật, đổi về khung
       ngày là dải trở lại nguyên trạng, mà 18% chiều cao không bị một dòng "đang tải…" chiếm. */
    const rsH=(ind.rs&&iv!=='i')?Math.round(h*0.18):0;   // CÁCH NỀN — dải dưới cùng
    const subH=rsiH+macH+rsH;                // tổng chiều cao các dải phụ dưới đáy
    const padB=volH+subH+22, padR=geo.padR, padT=geo.padT;
    const volBase=h-22-subH;                 // đáy cột khối lượng (chừa chỗ cho dải phụ)
    /* Hình học dải RSI phải biết TỪ ĐÂY, không đợi tới đoạn vẽ đường RSI ở cuối draw():
       lớp vẽ chạy trước đoạn đó, thiếu mốc là hình của dải RSI bị coi như không vẽ được. */
    geo.rsiTop=rsiH?h-22-subH+4:null; geo.rsiH=rsiH?rsiH-10:0;
    /* TRỤC PHẢI THỨ HAI cho cặp vốn hoá ↔ chỉ số. Cặp này KHÔNG dùng chung trục với nến:
       trục giá tự khít theo nến đang hiện, dính vào đó là mọi phép neo cứng đều trôi khỏi
       khung (đo được 47,5% số cửa sổ). Có trục riêng thì nến giữ nguyên thang của nến, cặp
       kia giữ nguyên thang của nó — cùng một cơ chế `cfg.phai2` của đồ thị /phantich. */
    const coPhu=(ind.vh||ind.idx), padR2=coPhu?62:0;
    const plotW=w-padR-padR2, plotH=h-padT-padB;
    geo.plotW=plotW; geo.plotH=plotH; geo.volTop=h-padB+6;
    let mn=Infinity,mx=-Infinity,vmax=0;
    for(const r of vis){ if(r.l<mn)mn=r.l; if(r.h>mx)mx=r.h; if((r.v||0)>vmax)vmax=r.v||0; }
    if(mx-mn<1e-9) mx=mn+1;
    /* ---- CẶP VỐN HOÁ ↔ CHỈ SỐ: TRỤC RIÊNG, NEO CỨNG MỘT LẦN CHO CẢ CHUỖI -------------
       User 23/08/2026: *"vnindex phải thực sự cố định trên chart khi tao kéo qua trái hoặc
       phải … vốn hoá cổ phiếu cắt lên vnindex => cổ phiếu mạnh hơn mặt bằng chung"*.

       BẢN CŨ SAI Ở ĐÂU (đo được, không phải chuyện thẩm mỹ): mỗi đường tự neo RIÊNG vào giá
       đóng cửa theo TRUNG BÌNH KHUNG NHÌN. Chỗ hai đường cắt nhau chỉ phụ thuộc TỈ SỐ giữa
       hai phép neo — mà tỉ số đó trôi **trung vị ×1,95 · p90 ×2,88 · max ×10,6** giữa các
       khung trên CÙNG một mã (251 mã HOSE). Tức chỗ cắt biến mất hoặc mọc ra chỗ khác mỗi
       lần kéo chart: đúng thứ người ta nhìn vào để kết luận mạnh/yếu.

       CÁCH LÀM ĐÚNG — hai việc tách bạch:
       ① `k` CỐ ĐỊNH, tính MỘT LẦN trên MIỀN NEO (các phiên có đủ những đường đang bật), không
          tính theo khung nhìn:
                k = exp( TB(log vốn hoá) − TB(log chỉ số) )
          Hai đường vẽ ra là `vốn hoá(i)` và `k × chỉ số(i)`. Chỗ cắt = chỗ
          `vốn hoá/chỉ số = k`, mà `k` bất biến nên **chỗ cắt bất biến**. Kéo/phóng bao nhiêu
          cũng không dời được một điểm cắt nào.
       ② TRỤC RIÊNG (`padR2`), thang khít MIỀN NEO chứ không khít khung nhìn — nên cặp này
          cũng không nhúc nhích lên xuống so với nến. Nến giữ trục của nến.

       VÌ SAO LOGA: câu hỏi là "mạnh hơn bao nhiêu", tức một TỈ LỆ. Trên thang loga, khoảng
       cách dọc giữa hai đường đúng bằng `log(vốn hoá ÷ k×chỉ số)` — hơn 20% ở 2022 trông
       đúng bằng hơn 20% ở 2026. Thang thường thì cùng một mức hơn kém lại to nhỏ khác nhau
       tuỳ chỗ. Đo ra gần như nhau về độ nén (41% so với 40% chiều cao trục cho cửa sổ 120
       phiên) nên chọn loga là chọn không mất gì.

       VÌ SAO VẪN CHẮC CHẮN CÓ ĐIỂM CẮT: `k` đặt cho TB(log vốn hoá − log k×chỉ số) = 0. Nằm
       trên ở mọi phiên thì trung bình phải dương — mâu thuẫn. Đo trên 251 mã: trung vị **22
       lần cắt** trong 1.000 phiên (p10 5 · p90 41).

       MIỀN NEO = GIAO của các đường ĐANG BẬT, và đây là chi tiết dễ bỏ sót nhất. Bật cả hai
       thì miền = phần có vốn hoá (1.000 phiên gần nhất) — đuôi chỉ số 2013–2022 KHÔNG được
       tính vào thang và không vẽ, vì ở đó không có gì để so. Cho nó vào thì thang phải ôm cả
       cú leo 3,7 lần của thị trường và cửa sổ 120 phiên tụt từ **39% xuống 13%** chiều cao
       trục — nén tới mức không đọc được cặp đường mà mình đang muốn đọc. Tắt vốn hoá đi thì
       miền = toàn bộ chỉ số và đường chỉ số dài lại như cũ. */
    let P2=null;
    if(coPhu){
      const cVH=!!ind.vh, cIX=!!ind.idx, mien=[];
      for(let z=0;z<rows.length;z++){
        const a=rows[z].vh>0, b=rows[z].ix>0;
        if(cVH&&cIX){ if(a&&b) mien.push(z); }
        else if(cVH){ if(a) mien.push(z); }
        else if(b) mien.push(z);
      }
      if(mien.length>=2){
        let k=1;
        if(cVH&&cIX){
          /* `k` NEO TRÊN ĐÚNG SỐ NẾN CỦA NỀN (1.250 phiên quy theo khung), KHÔNG phải trên
             toàn bộ chuỗi đang nạp — sửa 25/08/2026 sau khi user báo:
             *"DHC rõ ràng đã cắt và trên nền rồi tại sao vẫn báo dưới nền ở bộ lọc?"*.
             Đúng, và lỗi ở đây. Số nến nạp đổi theo mã (DHC về 3.400, VHM về 1.246) nên
             mốc của hai đường trôi theo từng mã, trong khi dải và bộ lọc neo cố định
             1.250 phiên. Đo DHC phiên 21/08/2026: neo cả 3.400 nến ra **+46,7%** (vốn hoá
             nằm TRÊN đường chỉ số) còn neo 1.250 phiên ra **−17,8%** (dưới nền) — hai câu
             trả lời ngược nhau trên cùng một màn hình.
             Neo theo đuôi thì dấu của "đang trên hay dưới" ở MÉP PHẢI luôn khớp bộ lọc.
             Các lần cắt trong quá khứ vẫn đọc theo `k` cố định này chứ không theo nền
             trượt — hai đường chỉ mang được MỘT hằng số, không thể khớp mọi thời điểm. */
          const nNeo=Math.min(mien.length, NEN_MA_KHUNG[iv]||NEN_MA);
          const duoi=mien.slice(mien.length-nNeo);
          let sa=0,sb=0;
          for(const z of duoi){ sa+=Math.log(rows[z].vh); sb+=Math.log(rows[z].ix); }
          k=Math.exp(sa/duoi.length-sb/duoi.length);
        }
        /* THANG PHẢI KHÍT THEO ĐÚNG THỨ SẼ VẼ. Từ 25/08 đường thứ hai là NỀN TRƯỢT chứ
           không còn là `k×chỉ số`, mà hai thứ lệch nhau tới p90 84% — lấy thang theo cái
           cũ là đường nền chạy ra ngoài khung. */
        const NAt=nenArr(), coNent=(NAt.co>=2&&NAt.vh);
        let lo=Infinity,hi=-Infinity;
        for(const z of mien){
          if(cVH){ const v=Math.log(rows[z].vh); if(v<lo)lo=v; if(v>hi)hi=v; }
          if(cIX){
            let u=null;
            if(cVH&&coNent){ const q=NAt.g[z]; if(q!=null&&rows[z].vh>0) u=rows[z].vh/Math.exp(q); }
            else u=k*rows[z].ix;
            if(u>0){ const v=Math.log(u); if(v<lo)lo=v; if(v>hi)hi=v; }
          }
        }
        if(!(hi>lo)){ lo-=0.05; hi+=0.05; }
        const pd=(hi-lo)*0.07; lo-=pd; hi+=pd;
        P2={k:k,lo:lo,hi:hi,cVH:cVH,cIX:cIX,a:mien[0],b:mien[mien.length-1],
            y:v=>padT+(hi-Math.log(v))/(hi-lo)*plotH};
      }
    }
    const pad=(mx-mn)*0.06; mn-=pad; mx+=pad;
    if(yZoom!==1||yPan!==0){                    // người dùng đã kéo/giãn trục giá bằng tay
      const c=(mn+mx)/2, hf=(mx-mn)/2*yZoom, sh=yPan*(mx-mn);
      mn=c-hf+sh; mx=c+hf+sh;
      /* GIÁ KHÔNG THỂ ÂM. Thu vùng giá hết cỡ là mép dưới lọt xuống dưới 0 và trục hiện
         "-31206" — đọc như thị trường trả tiền để người ta cầm cổ phiếu. Chỉ kẹp lúc VẼ,
         yZoom giữ nguyên nên phóng lại là về đúng chỗ cũ. */
      if(mn<0) mn=0;
    }
    const y=v=>padT+(mx-v)/(mx-mn)*plotH;
    geo.mn=mn; geo.mx=mx; geo.padTv=padT; geo.plotHv=plotH;   // cho lớp vẽ dùng lại
    const cw=plotW/span, bw=Math.max(1,Math.min(16,cw*0.66));
    geo.cw=cw;
    const cx=i=>i*cw+cw/2;

    /* Tên mã KHÔNG đặt giữa vùng vẽ nữa — chữ to nằm chính giữa che nến, nhìn lâu
       khó chịu dù đã hạ rất mờ. Nay in ở GÓC TRÁI TRÊN, chỗ trước đây để "Nến ngày
       +xx%" (xem đoạn vẽ chú giải phía dưới). */
    const wm=opt.wm&&opt.wm();

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
    // ĐƯỜNG TRUNG BÌNH LUỸ THỪA (EMA) — nét mảnh hơn MA một chút cho dễ tách khi trùng vùng
    for(const per of ind.ema){
      if(rows.length<per+1) continue;
      const E=emaArr(per);
      x.strokeStyle=EMACOL[per]||'rgba(148,163,184,.8)'; x.lineWidth=1.3;
      x.beginPath(); let st=false;
      for(let i=0;i<n;i++){ const v=E[i0+i]; if(v==null) continue;
        const yy=y(v); st?x.lineTo(cx(i),yy):x.moveTo(cx(i),yy); st=true; }
      if(st) x.stroke();
    }
    // nến
    if(ind.nen) for(let i=0;i<n;i++){
      const r=vis[i], up=r.c>=r.o, col=up?UP:DOWN, X=cx(i);
      x.strokeStyle=col; x.lineWidth=Math.min(1.6,Math.max(1,bw*0.14));
      x.beginPath(); x.moveTo(X,y(r.h)); x.lineTo(X,y(r.l)); x.stroke();
      x.fillStyle=col;
      const a=y(Math.max(r.o,r.c)), b=y(Math.min(r.o,r.c));
      x.fillRect(X-bw/2,a,bw,Math.max(1,b-a));
    }
    /* CẶP VỐN HOÁ ↔ CHỈ SỐ vẽ SAU nến để nến không che — đây là đường người dùng vừa tự bật.
       Ngắt nét ở phiên thiếu số (`st=false`) chứ đừng nối thẳng qua: vốn hoá chỉ có 1.000
       phiên gần nhất còn nến có tới 13 năm, nối thẳng là bịa ra một đoạn không có dữ liệu.
       Chỉ vẽ TRONG MIỀN NEO — ngoài đó không có gì để so, mà vẽ ra thì thang phải nới theo. */
    if(P2){
      const veP=(lay,mau,day)=>{
        x.strokeStyle=mau; x.lineWidth=day; x.lineJoin='round';
        x.beginPath(); let st=false;
        for(let i=0;i<n;i++){ const gi=i0+i;
          if(gi<P2.a||gi>P2.b){ st=false; continue; }
          const v=lay(vis[i],gi);      // gi = chỉ số TOÀN CỤC; đừng dùng rows.indexOf ở đây,
                                       // nó biến vòng vẽ thành O(n²) và chart vẽ lại mỗi lần rê chuột
          if(!(v>0)){ st=false; continue; }
          const X=cx(i), yy=P2.y(v); st?x.lineTo(X,yy):x.moveTo(X,yy); st=true; }
        x.stroke(); x.lineWidth=1; x.lineJoin='miter';
      };
      /* ---- MỘT MỐC DUY NHẤT: NỀN TRƯỢT 1.250 PHIÊN (user chốt 25/08/2026) -----------
         *"chỉ có thể dùng 1.250 phiên chứ không thể áp ngược 13 năm được"* — đúng, và đây
         là chỗ sửa.

         BẢN CŨ VẼ "VN-INDEX QUY ĐỔI" BẰNG MỘT HẰNG SỐ `k`, rồi áp ngược cho cả 13 năm nến.
         `k` là trung bình tương quan của 1.250 phiên GẦN NHẤT, tức năm 2013 người ta đang
         bị đo bằng cái thước của năm 2026 — thước đó lúc ấy chưa tồn tại. Hệ quả thấy ngay
         ở VNM: đo bằng thước từng thời điểm thì 2022 lệch −48,3% còn 2026 lệch −44,0%,
         nhưng đo cả hai bằng thước hôm nay thì 2026 toác rộng hơn hẳn — user đọc ra là
         "cách nền bị sai".

         KHÔNG THỂ GIỮ CẢ HAI. Đo trên 278 mã đủ 2.500 phiên: ngay trong 1.250 nến cuối,
         chênh lệch lớn nhất giữa hai mốc đã là **trung vị 37,8% · p90 84,2% · VNM 117,8%**.
         Hai mốc thật sự khác nhau, không phải sai số làm tròn.

         NÊN CHỈ CÒN MỘT: `nền(i) = vốn hoá(i) ÷ exp(g(i))` = `chỉ số(i) × exp(TB trượt)`.
         Nó vẫn mang HÌNH của chỉ số, chỉ khác là quy đổi lại ở TỪNG phiên bằng tương quan
         trung bình 1.250 phiên trước đó thay vì bằng một hằng số của hôm nay.
           · nhân quả ở mọi điểm — phiên nào cũng chỉ dùng dữ liệu trước nó;
           · vốn hoá cắt lên đường này ⟺ dải cắt vạch 0 ⟺ `nen ≥ 0` của bộ lọc bảng giá,
             ba chỗ khớp nhau ĐÚNG TỪNG PHIÊN chứ không chỉ khớp ở mép phải;
           · ở phiên cuối nó trùng khít đường quy đổi cũ (đo được lệch 0,000000%), nên câu
             "vốn hoá cắt lên VN-Index" hôm nay vẫn đọc y như trước.

         BẬT MÌNH `VN-Index` (không bật vốn hoá) thì vẫn vẽ CHỈ SỐ THÔ theo điểm — lúc đó
         không có tử số nên nền vô nghĩa, mà chỉ số thô tự nó vẫn đọc được. */
      const NA=nenArr();
      const coNen=(NA.co>=2&&NA.vh);
      const layNen=(r,gi)=>{ const q=NA.g[gi];
        return (q==null||!(r.vh>0))?null:r.vh/Math.exp(q); };
      if(P2.cVH) veP(r=>r.vh,VHCOL(),2.4);
      if(P2.cIX){
        if(P2.cVH&&coNen) veP(layNen,IXCOL(),1.8);
        else veP(r=>P2.k*r.ix,IXCOL(),1.8);
      }
      /* TRỤC PHẢI THỨ HAI — 4 nhãn. Thang loga nên nhãn KHÔNG cách đều nhau về giá trị; đó
         là đúng, và cũng là dấu hiệu duy nhất cho biết đây là thang loga. Đơn vị in một lần
         ở đỉnh cột chứ đừng dán vào từng số: cột chỉ rộng 62px. */
      const dv=P2.cVH?'tỷ':'điểm';
      const soP2=v=>P2.cVH?Math.round(v/1e9).toLocaleString('vi-VN')
                          :v.toLocaleString('vi-VN',{maximumFractionDigits:0});
      x.font='10px system-ui'; x.textAlign='left'; x.textBaseline='middle';
      x.fillStyle=MUT();
      for(let t=0;t<=3;t++){
        const lv=P2.lo+(P2.hi-P2.lo)*(3-t)/3;
        x.fillText(soP2(Math.exp(lv)),plotW+padR+4,padT+(P2.hi-lv)/(P2.hi-P2.lo)*plotH);
      }
      x.fillStyle=P2.cVH?VHCOL():IXCOL(); x.font='700 9.5px system-ui';
      x.fillText(dv,plotW+padR+4,padT-6);
    }
    paintDraws(x,y,'main');       // khung giá: sơn ngay sau nến
    /* Vạch giá mới nhất đi THEO nến — nó là một mẩu của biểu đồ giá chứ không phải khung
       chart. Giữ lại khi đã ẩn nến thì còn đúng một vạch đỏ/xanh và một thẻ giá lơ lửng
       giữa khung, đọc ra như đường giá vẫn còn ở đâu đó mà không thấy. */
    if(ind.nen){
      const lastC=vis[n-1].c, yl=y(lastC), lcol=lastC>=vis[0].o?UP:DOWN;
      x.setLineDash([3,3]); x.strokeStyle=lcol+'99';
      x.beginPath(); x.moveTo(0,yl); x.lineTo(plotW,yl); x.stroke(); x.setLineDash([]);
      x.fillStyle=lcol; x.fillRect(plotW,yl-8,padR,16);
      x.fillStyle='#fff'; x.font='700 10.5px system-ui'; x.textAlign='left'; x.textBaseline='middle';
      x.fillText(fmtP(lastC),plotW+6,yl);
    }
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
    // TÊN MÃ ở góc trái trên + chú thích MA. Trước đây ô này in "Nến ngày +65,66%"
    // — % của riêng khoảng đang xem, đổi theo mức phóng nên gây hiểu nhầm; user bỏ.
    // Khung thời gian đã có ở dải nút Ngày/Tuần/Tháng nên cũng không nhắc lại.
    // giữ textBaseline='middle' như dòng MA ngay dưới, nếu đổi sang 'top' là chữ
    // tụt xuống chồng lên "— MA20"
    x.textAlign='left'; x.textBaseline='middle';
    if(wm&&wm.sym){
      x.fillStyle=TXT(); x.font='800 14px system-ui';
      x.fillText(wm.sym,8,padT+8);
      if(wm.phu){
        const w1=x.measureText(wm.sym).width;
        x.fillStyle=MUT(); x.font='600 11.5px system-ui';
        x.fillText(wm.phu,8+w1+7,padT+9);
      }
    }
    x.font='10.5px system-ui'; let lx=8;
    for(const per of ind.ma){ x.fillStyle=MACOL[per]||'rgba(148,163,184,.9)';
      const t='— MA'+per; x.fillText(t,lx,padT+24); lx+=x.measureText(t).width+10; }
    for(const per of ind.ema){ x.fillStyle=EMACOL[per]||'rgba(148,163,184,.9)';
      const t='— EMA'+per; x.fillText(t,lx,padT+24); lx+=x.measureText(t).width+10; }
    if(P2&&P2.cVH){ x.fillStyle=VHCOL();
      const t='— Vốn hoá'; x.fillText(t,lx,padT+24); lx+=x.measureText(t).width+10; }
    if(P2&&P2.cIX){ x.fillStyle=IXCOL();
      /* Nói rõ đây là đường ĐÃ QUY ĐỔI về thang vốn hoá, đừng để trần chữ "VN-Index" —
         số trên trục là tỷ đồng chứ không phải điểm, mà ô đọc số thì in điểm thật. */
      /* TÊN PHẢI NÓI ĐÚNG THỨ ĐANG VẼ. Bật cùng vốn hoá thì đây là NỀN (chỉ số quy đổi lại
         ở từng phiên theo tương quan trung bình 1.250 phiên trước đó), không phải chỉ số
         nhân một hằng số — gọi trần "VN-Index quy đổi" là mời người xem hiểu sai. Bật một
         mình thì nó đúng là chỉ số thô, giữ nguyên tên. */
      const NAl=nenArr(), coNenl=(P2.cVH&&NAl.co>=2&&NAl.vh);
      const t=coNenl ? ('— nền '+(NAl.Wma||NEN_MA)+' '+(NEN_DV[iv]||'phiên')+' · '+ixTen)
                     : ('— '+ixTen+(P2.cVH?' quy đổi':''));
      x.fillText(t,lx,padT+24); lx+=x.measureText(t).width+10; }
    /* HAI Ô CÔNG TẮC — hàng thứ ba của góc trái trên, dưới tên mã và dòng chú thích.
       VỊ TRÍ CỐ ĐỊNH, không nối đuôi dòng chú thích: dòng đó dài ngắn theo số chỉ báo đang
       bật, nối vào đó là hai cái ô nhảy chỗ mỗi lần bật/tắt một đường — thứ bấm được thì
       phải đứng yên một chỗ.
       CHART LÙN THÌ BỎ (`plotH<150`, cùng ngưỡng với dấu CPVN.IO): panel bong bóng cao
       110px, đặt ô ở hàng thứ ba là nó nằm giữa vùng vẽ. */
    mocHit.length=0;
    /* Ô "Cách nền" đứng chung hàng với hai ô mốc: user đã chốt 24/08 rằng thứ bật/tắt phụ
       thì nằm TRONG khung đồ thị, hàng nút dưới chart giữ đúng sáu nút 3×2 ở khổ hẹp. Nó
       có điều kiện hiện riêng (cần chuỗi chỉ số) nên danh sách phải dựng động — đừng gộp
       lại thành một mảng cố định như cũ. */
    const cvNut=[];
    if(sukien.length) cvNut.push(['sk','Cổ tức'],['bctc','BCTC']);
    /* Ô hiện được TRƯỚC khi có dữ liệu: kho vốn hoá + chỉ số chỉ nạp khi người ta hỏi tới,
       mà gác ô theo "đã có dữ liệu chưa" thì nó vĩnh viễn không hiện — không ai bật được
       cái mà chính nó phải bật mới có. Trang nào nhận `onInd` là trang biết đi nạp.
       Khung "Trong ngày" là nến 5 phút, hai kho kia chỉ có số theo PHIÊN nên bỏ hẳn ô. */
    if(iv!=='i'&&(opt.onInd||rows.some(r=>r&&r.ix>0))) cvNut.push(['rs','Cách nền']);
    if(plotH>=150&&cvNut.length){
      x.font='700 10px system-ui'; x.textAlign='left'; x.textBaseline='middle';
      let mx0=8;
      for(const [mk,ten] of cvNut){
        const bat=!!ind[mk], bw=x.measureText(ten).width+16, bh=17, by=padT+33;
        x.fillStyle=bat?(light()?'rgba(15,23,42,.86)':'rgba(233,233,239,.90)')
                       :(light()?'rgba(15,23,42,.07)':'rgba(255,255,255,.10)');
        if(x.roundRect){ x.beginPath(); x.roundRect(mx0,by,bw,bh,9); x.fill(); }
        else x.fillRect(mx0,by,bw,bh);
        x.fillStyle=bat?(light()?'#ffffff':'#0a0a0c'):MUT();
        x.fillText(ten,mx0+8,by+bh/2+0.5);
        mocHit.push({x:mx0,y:by,w:bw,h:bh,k:mk});
        mx0+=bw+6;
      }
    }
    // RSI 14 phiên (dải riêng dưới cùng)
    if(ind.rsi&&rows.length>15){
      const top=geo.rsiTop, bh=geo.rsiH;
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
      paintDraws(x,y,'rsi');       // hình của dải RSI sơn SAU đường RSI để nằm trên
    }
    // MACD 12/26/9 (dải riêng dưới cùng): cột chênh lệch + 2 đường
    if(ind.macd&&rows.length>35){
      const top=h-22-macH-rsH+4, bh=macH-10;   // rsH: dải sức mạnh nằm DƯỚI MACD
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
    /* ---- SỨC MẠNH TƯƠNG ĐỐI: giá ÷ điểm chỉ số (user chốt 23/08/2026) --------------
       User: *"chỉ báo vnindex đang không cố định theo chart, khi tôi kéo về phía sau thì
       nó cũng di chuyển … tôi muốn biến nó thành 1 chỉ báo thực sự và cố định"*.

       VÌ SAO PHẢI RỜI KHỎI TRỤC GIÁ, KHÔNG PHẢI VÌ LƯỜI: trục giá TỰ KHÍT theo nến đang
       hiện, nên MỌI đường neo cứng đều phải trôi ra ngoài khung. Đo 216 mã HOSE × 30.073
       cửa sổ 120 phiên, neo VN-Index một lần cho cả chuỗi: **47,5% số cửa sổ đường nằm HẲN
       ngoài khung nến**; nới trục để ôm nó thì khung phình trung vị ×1,50 · p90 ×4,15 ·
       max ×62, tức nến bẹp còn 67% / 24% / 1,6% chiều cao. Không có cách thứ ba.

       CÔNG THỨC — TỈ SỐ THÔ, KHÔNG CHUẨN HOÁ (user chọn):
             RS(i) = giá đóng cửa(i) ÷ điểm chỉ số(i)
       Mỗi phiên MỘT giá trị, phụ thuộc đúng hai con số của chính phiên đó — không cửa sổ,
       không trung bình trượt, không phiên neo. Kéo/phóng bao nhiêu cũng KHÔNG đổi được nó,
       và RS đi lên nghĩa là mã chạy hơn thị trường ở mọi khung, mọi mức phóng.
       (Đã cân nhắc rồi bỏ: Mansfield 250 `(RS/TB250−1)×100` — 7,8 lần cắt mốc 0 mỗi năm,
       biên độ p90 33 điểm %; Alpha 60 phiên — 15,3 lần/năm, quá nhiễu; Alpha 250 — biên độ
       p90 70 điểm % nên thang nhảy mạnh khi đổi mã. User chọn tỉ số thô.)

       THANG DẢI KHÍT THEO KHUNG NHÌN, KHÔNG KHÍT CẢ CHUỖI — và đây là chỗ dễ hiểu ngược.
       "Cố định" đã nằm ở CHỖ KHÁC rồi: giá trị từng phiên là bất biến, nên phép đọc không
       bao giờ lật (không còn cảnh cùng một ngày mà chỗ này đọc ra hơn, chỗ kia đọc ra kém).
       Khít cả chuỗi thì đúng là đường đứng im tuyệt đối, nhưng đo được: một cửa sổ 120 phiên
       chỉ chiếm **trung vị 16% chiều cao dải** (p10 6%; thang loga cũng chỉ 17%/9%) — trên
       dải ~60px là một vệt 10px, phóng to để rồi không đọc được gì.
       Bù lại phải LUÔN IN SỐ THẬT: hai nhãn mép phải + thẻ giá trị phiên cuối + ô trong
       dòng đọc số. Có số thì mức phóng đổi bao nhiêu cũng không gây hiểu nhầm.

       VẠCH ĐỨT = MỨC CỦA PHIÊN MỚI NHẤT TOÀN CHUỖI (không phải phiên cuối khung nhìn):
       nó cho biết đoạn đang xem mạnh hay yếu hơn HÔM NAY, và vì neo vào phiên cuối chuỗi
       nên kéo đi đâu nó vẫn nói đúng một điều. */
    if(ind.rs&&rsH){
      const top=h-22-rsH+4, bh=rsH-10, NA=nenArr();
      const nhan='Cách nền '+(NA.Wma||NEN_MA)+' '+(NEN_DV[iv]||'phiên')+' — '
                 +((wm&&wm.sym)?wm.sym+' ':'')+(NA.vh?'vốn hoá':'giá')+' ÷ '+ixTen;
      x.textAlign='left'; x.textBaseline='middle';
      if(NA.co<2){
        x.fillStyle=MUT(); x.font='700 10px system-ui'; x.fillText(nhan,8,top+11);
        x.font='11px system-ui';
        x.fillText(NA.co?'khoảng này chưa có dữ liệu chỉ số':'đang tải dữ liệu chỉ số…',8,top+bh/2);
      }else{
        /* THANG CỐ ĐỊNH THEO CẢ CHUỖI, KHÔNG THEO KHUNG NHÌN. Dải cũ lấy min/max của
           `vis` nên kéo ngang một cái là đường đổi hình — đúng lỗi user đã bắt ở đường
           VN-Index hồi 23/08. Lấy theo `rows` thì kéo đi đâu vạch 0 vẫn nằm đúng chỗ. */
        let mn=Infinity,mx=-Infinity;
        for(let i=0;i<rows.length;i++){ const q=NA.g[i]; if(q==null) continue;
          if(q<mn)mn=q; if(q>mx)mx=q; }
        if(mn>0)mn=0; if(mx<0)mx=0;                     // vạch nền luôn nằm trong khung
        if(mx-mn<1e-9){ mn-=0.01; mx+=0.01; }
        const pd=(mx-mn)*0.08, lo=mn-pd, hi=mx+pd;
        const ry=v=>top+(hi-v)/(hi-lo)*bh, y0=ry(0);
        // tô nhạt hai bên vạch nền: trên nền = mạnh hơn mặt bằng chung, dưới = yếu hơn
        x.beginPath(); let st=false;
        for(let i=0;i<n;i++){ const q=NA.g[i0+i]; if(q==null){ st=false; continue; }
          const X=cx(i); st?x.lineTo(X,ry(q)):x.moveTo(X,ry(q)); st=true; }
        if(st){ const xr=cx(Math.max(0,n-1)), xl=cx(0);
          x.lineTo(xr,y0); x.lineTo(xl,y0); x.closePath();
          x.fillStyle=RSCOL()+'1f'; x.fill(); }
        /* VẠCH NỀN LÀ THỨ CẢ DẢI NÓI VỀ nên không để nó mờ như lưới: nét đứt, màu chữ phụ,
           kèm chữ "nền" ở mép trái. Mờ quá thì người đọc không biết mình đang so với cái gì. */
        x.save(); x.setLineDash([4,3]); x.strokeStyle=MUT(); x.globalAlpha=.75; x.lineWidth=1;
        x.beginPath(); x.moveTo(0,y0); x.lineTo(plotW,y0); x.stroke(); x.restore();
        x.strokeStyle=RSCOL(); x.lineWidth=1.5; x.beginPath(); st=false;
        for(let i=0;i<n;i++){ const q=NA.g[i0+i]; if(q==null){ st=false; continue; }
          const X=cx(i), yy=ry(q); st?x.lineTo(X,yy):x.moveTo(X,yy); st=true; }
        x.stroke(); x.lineWidth=1;
        /* CÁC DẤU SỰ KIỆN. △ rỗng ở ĐÁY dải (nó nói về đáy) — ○/● nằm ngay trên đường (chúng
           nói về chính đường).

           NGƯỠNG ẨN TÍNH THEO KHOẢNG CÁCH THẬT GIỮA HAI DẤU, không theo bề rộng nến. Bản đầu
           gác `geo.cw>1.5` và sai hẳn mục đích: ở mức phóng MẶC ĐỊNH (khoảng 250 nến trong
           330px) bề rộng nến chỉ 1,3px nên dấu KHÔNG BAO GIỜ hiện — người dùng phải tự phóng
           to mới thấy thứ đáng lẽ phải đập vào mắt. Mà mật độ dấu đâu phụ thuộc bề rộng nến:
           `dinhCua` đã ép các dấu cách nhau W/10 nến, nên cứ nhân ra pixel mà xét. Dưới 6px
           thì mới thật sự dính nhau. */
        if(geo.cw*Math.max(1,Math.round(NA.W1/10))>=6){
          for(let i=0;i<n;i++){ const gi=i0+i, q=NA.g[gi];
            if(q==null) continue; const X=cx(i);
            if(NA.pk[gi]){ const yy=top+bh-3;      // △ rỗng, ĐỈNH HƯỚNG LÊN: nó nói về một cái đáy
              x.strokeStyle=RSCOL(); x.lineWidth=1.3; x.beginPath();
              x.moveTo(X,yy-7); x.lineTo(X+4.5,yy); x.lineTo(X-4.5,yy); x.closePath(); x.stroke(); }
            if(NA.dinhN[gi]){                       // ○ rỗng, nhỏ — tầng sớm
              const yy=ry(q);
              x.beginPath(); x.arc(X,yy,2.2,0,6.283);
              x.fillStyle=light()?'#ffffff':'#14161c'; x.fill();
              x.beginPath(); x.arc(X,yy,2.2,0,6.283);
              x.strokeStyle=RSCOL(); x.lineWidth=1.2; x.stroke(); }
            if(NA.dinh[gi]){                        // ● đặc — tầng xác nhận
              const yy=ry(q);
              x.beginPath(); x.arc(X,yy,3.4,0,6.283);
              x.fillStyle=light()?'#ffffff':'#14161c'; x.fill();
              x.beginPath(); x.arc(X,yy,2.4,0,6.283); x.fillStyle=RSCOL(); x.fill(); }
          }
          x.lineWidth=1;
        }
        x.fillStyle=MUT(); x.font='9.5px system-ui';
        x.fillText('nền',plotW+6,y0);
        x.fillText(fmtNen(hi-pd),plotW+6,ry(hi-pd)); x.fillText(fmtNen(lo+pd),plotW+6,ry(lo+pd));
        // MỨC HÔM NAY: phiên cuối CẢ CHUỖI, không phải phiên cuối khung nhìn
        let nay=null;
        for(let z=rows.length-1;z>=0;z--){ if(NA.g[z]!=null){ nay=NA.g[z]; break; } }
        if(nay!=null&&nay>=lo&&nay<=hi){
          x.fillStyle=RSCOL(); x.fillRect(plotW,ry(nay)-7,padR,14);
          x.fillStyle='#fff'; x.font='700 9.5px system-ui'; x.fillText(fmtNen(nay),plotW+6,ry(nay));
        }
        /* NHÃN CÓ NỀN LÓT. Dải chỉ cao 18% chiều cao chart, ở khổ điện thoại là ~45px —
           đường thường chạy ngay qua chỗ đặt nhãn và cắt nát chữ. Lót một mảng nền mờ sau
           chữ rẻ hơn nhiều so với việc đẩy nhãn xuống (xuống nữa là đụng trục ngày). */
        x.font='700 10px system-ui';
        const nw=x.measureText(nhan).width;
        x.fillStyle=light()?'rgba(255,255,255,.82)':'rgba(20,22,28,.82)';
        if(x.roundRect){ x.beginPath(); x.roundRect(5,top+3,nw+6,16,4); x.fill(); }
        else x.fillRect(5,top+3,nw+6,16);
        x.fillStyle=RSCOL(); x.fillText(nhan,8,top+11);
      }
    }
    /* ---- MỐC SỰ KIỆN — GẮN NGAY TRÊN ĐỈNH NẾN (user chốt 19/08/2026) -----------
       Bản đầu đặt tất cả ở một hàng cố định sát đáy vùng giá. User báo "nó đang ở dưới
       chart nên hơi không quen" — đúng, vì mốc nằm rời khỏi cây nến thì mắt phải tự dóng
       xuống mới biết ngày đó là ngày nào; các trang PTKT đều neo mốc vào chính cây nến.

       BA RỦI RO CỦA VIỆC NEO THEO GIÁ, và cách xử — đừng gỡ mấy cái chặn này:
       ① TRỤC GIÁ KÉO/PHÓNG ĐƯỢC (yPan/yZoom) nên đỉnh nến chạy ra ngoài khung được. Ghì
          mốc vào trong vùng giá; không ghì thì mốc biến mất hoặc vẽ đè lên dải khối lượng.
       ② NẾN SÁT ĐỈNH KHUNG thì phía trên hết chỗ -> LẬT XUỐNG dưới đáy nến. Chỉ ghì mà
          không lật thì mốc dán đè lên chính cây nến đang muốn xem.
       ③ SỰ KIỆN Ở VÙNG TRỐNG TƯƠNG LAI (đã công bố ngày chốt quyền nhưng chưa tới phiên)
          KHÔNG có nến để neo -> rơi về hàng đáy như cũ.
       Riêng chuyện mốc che nến: chấm chỉ 13px và đặt CÁCH đỉnh nến 14px nên nằm ở khoảng
       trống phía trên, không đè vào thân nến hay đường MA. */
    skHit.length=0;
    if((ind.sk||ind.bctc)&&sukien.length){
      const yDay=padT+plotH-9, yTran=padT+9;     // biên ghì trên/dưới của vùng giá
      const gom=new Map();                       // chỉ số nến -> danh sách sự kiện
      for(const e of sukien){
        if(e.k==='bctc'?!ind.bctc:!ind.sk) continue;
        const idx=Math.round(idxOfT(e.t));
        if(idx<i0-1||idx>i1) continue;           // ngoài khung nhìn
        (gom.get(idx)||gom.set(idx,[]).get(idx)).push(e);
      }
      x.textAlign='center'; x.textBaseline='middle'; x.font='700 9px system-ui';
      for(const [idx,evs] of gom){
        /* Chiếu theo mốc CỦA NẾN chứ không của sự kiện: ở khung Tháng thì mấy sự kiện
           trong cùng tháng có t khác nhau, lấy t sự kiện là chấm lệch khỏi tâm nến. */
        const trong=idx>=0&&idx<rows.length;     // có nến thật để neo không
        const nen=trong?rows[idx]:null;
        const X=xOfT(nen?nen.t:evs[0].t);
        if(X<-8||X>plotW+8) continue;
        /* ① ghì trong vùng giá · ② hết chỗ trên đỉnh thì lật xuống đáy nến · ③ không có
           nến thì về hàng đáy — xem khối chú thích đầu mục. */
        let yMoc=yDay;
        if(nen){
          const tren=y(nen.h)-14;
          yMoc=tren>=yTran?tren:y(nen.l)+14;
          yMoc=Math.max(yTran,Math.min(yDay,yMoc));
        }
        /* MÀU THEO LOẠI, ưu tiên loại "nặng" nhất trong nhóm: chia cổ phiếu/thưởng đổi số
           cổ phiếu nên đáng chú ý hơn cổ tức tiền, còn BCTC là nhóm riêng. */
        const co=k=>evs.some(e=>e.k===k);
        const mau = co('cp')||co('thuong') ? '#eab308'
                  : co('quyenmua')||co('phathanh') ? '#c026d3'
                  : co('tien') ? '#38bdf8' : '#8a8a99';
        const chu = co('cp')||co('thuong') ? 'C'
                  : co('quyenmua')||co('phathanh') ? 'P'
                  : co('tien') ? 'D' : 'B';
        const R=6.5;
        x.beginPath(); x.arc(X,yMoc,R,0,7);
        x.fillStyle=mau; x.fill();
        x.strokeStyle=PANEL(); x.lineWidth=1.5; x.stroke();
        x.fillStyle='#fff'; x.fillText(chu,X,yMoc+0.5);
        if(evs.length>1){                        // nhiều sự kiện cùng nến -> ghi số lượng
          x.beginPath(); x.arc(X+R-1,yMoc-R+1,4.5,0,7);
          x.fillStyle=PANEL(); x.fill();
          x.fillStyle=mau; x.font='800 8px system-ui'; x.fillText(String(evs.length),X+R-1,yMoc-R+1.5);
          x.font='700 9px system-ui';
        }
        skHit.push({x:X,y:yMoc,r:R+3,ev:evs});
      }
      // hộp chú giải của mốc đang rê — vẽ SAU tất cả để không bị chấm nào đè lên
      if(skHover>=0&&skHover<skHit.length) veHopSK(x,skHit[skHover],w,h);
    }
    /* ---- PHIÊN ĐANG GHIM: hai tam giác kẹp trên/dưới + hộp đọc số ------------------
       Ký hiệu lấy đúng của đồ thị /phantich (mục *MỐC PHIÊN LÀ TAM GIÁC*): một vạch dọc
       cao suốt vùng vẽ sẽ CẮT NGANG chính dữ liệu đang xem, còn tam giác thì nằm ngoài
       rìa và vẫn chỉ đúng cột. Khác thanh ngắm ở NÉT: thanh ngắm là nét đứt và chạy theo
       chuột, mốc ghim là nét LIỀN và đứng yên — không phân biệt được hai cái thì bấm xong
       không biết mình đã ghim hay chưa. */
    const gI=choGhim()?ghimIdx():-1;   // tắt đường phủ thì mốc ghim cũ cũng thôi hiện
    if(gI>=0&&gI>=i0&&gI<i1){
      const X=cx(gI-i0), y0=padT, y1=padT+plotH;
      x.strokeStyle=light()?'rgba(0,0,0,.45)':'rgba(255,255,255,.45)'; x.lineWidth=1;
      x.beginPath(); x.moveTo(X,y0); x.lineTo(X,y1); x.stroke();
      x.fillStyle=light()?'#0f172a':'#e9e9ef';
      const tam=(yy,xuong)=>{ x.beginPath(); x.moveTo(X,yy);
        x.lineTo(X-5,yy+(xuong?-7:7)); x.lineTo(X+5,yy+(xuong?-7:7)); x.closePath(); x.fill(); };
      tam(y0+1,true); tam(y1-1,false);
      const r=rows[gI];
      /* Hộp đọc số in SỐ ĐẦY ĐỦ, không rút gọn kiểu `35.3K` như dòng chú giải trên đầu.
         Dòng kia phải nhét O/H/L/C/%/KL vào một hàng nên rút gọn là đúng; hộp này người ta
         bấm ra để ĐỌC một con số cụ thể, mà `35.3K` thì không biết là 35.300 hay 35.349. */
      const dong=[['Giá',Math.round(r.c).toLocaleString('vi-VN')+' đ',null]];
      if(r.vh>0) dong.push(['Vốn hoá',fmtTy(r.vh),VHCOL()]);
      if(r.ix>0) dong.push([ixTen,r.ix.toLocaleString('vi-VN',{maximumFractionDigits:2}),IXCOL()]);
      /* Khoảng cách tới nền vào hộp ghim KỂ CẢ khi dải dưới đang tắt: người ghim một phiên
         là đang hỏi "lúc đó mạnh hay yếu hơn mặt bằng chung", mà đó đúng là con số này. */
      { const NA=nenArr(), q=NA.g[gI];
        if(q!=null) dong.push(['Cách nền',fmtNen(q)+(NA.pk[gI]?' △':'')+(NA.dinhN[gI]?' ○':'')+(NA.dinh[gI]?' ●':''),RSCOL()]); }
      /* ĐẾM XEM MỘT Ô CHỮ NHẬT CÓ ĐÈ LÊN DỮ LIỆU KHÔNG — dùng để chọn chỗ đặt hộp đọc số.
         Đếm trên DỮ LIỆU chứ không dò pixel: pixel thì phải đọc ngược canvas (chậm, và
         lúc này hộp chưa vẽ nên vẫn phải đoán), còn dữ liệu thì có sẵn ngay đây và cho
         đúng câu trả lời. Tính cả nến lẫn hai đường phủ vì user bắt lỗi ở chỗ hộp đè lên
         cặp vốn hoá ↔ chỉ số, mà cặp đó nằm trên TRỤC RIÊNG nên vị trí nến không đoán được. */
      const demDe=(bx,by,bw,bh)=>{
        let dem=0;
        for(let i=0;i<n;i++){
          const xx=cx(i);
          if(xx<bx-2||xx>bx+bw+2) continue;
          const rr=vis[i];
          if(!(y(rr.l)<by||y(rr.h)>by+bh)) dem++;          // thân+bóng nến cắt ô
          if(P2){
            if(P2.cVH&&rr.vh>0){ const y2=P2.y(rr.vh); if(y2>=by&&y2<=by+bh) dem++; }
            if(P2.cIX&&rr.ix>0){ const y2=P2.y(P2.k*rr.ix); if(y2>=by&&y2<=by+bh) dem++; }
          }
        }
        return dem;
      };
      veHopGhim(x,X,y0,w,fullLabel(iv,r.t),dong,demDe,plotH);
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

  /* Hộp đọc số của phiên ĐANG GHIM. Hai cột: nhãn trái, số phải — số phải thẳng cột thì
     mới liếc một cái là so được, dồn thành một dòng chảy là phải đọc từng chữ.
     Vẽ thẳng lên canvas cùng lý do với `veHopSK`: toạ độ đổi theo mọi lượt kéo/phóng. */
  function veHopGhim(x,X,yTop,w,tieu,dong,demDe,plotH){
    x.font='700 11px system-ui'; x.textBaseline='middle';
    const wN=Math.max(x.measureText(tieu).width,
      ...dong.map(d=>x.measureText(d[0]).width+14+x.measureText(d[1]).width));
    const bw=Math.min(240,wN+20), bh=18+dong.length*16+8;
    /* CHỌN GÓC ÍT ĐÈ NHẤT TRONG BỐN GÓC (user 25/08: *"bảng thông báo hiện ra che mất một
       phần phía sau gây khó chịu khi đọc"*). Bản cũ luôn dán vào phải-trên và chỉ lật sang
       trái khi hết chỗ, nên ở mã nào có đường phủ chạy cao là đè trúng ngay.
       Bốn ứng viên, chấm bằng `demDe` rồi lấy ít nhất; hoà thì giữ thứ tự ưu tiên cũ
       (phải-trên trước) để hộp không nhảy lung tung giữa các lần bấm. */
    const kepX=v=>Math.max(4,Math.min(v,w-bw-4));
    const dayHop=(plotH?yTop+plotH:yTop+220)-bh-10;
    let bx=X+12, by=yTop+10;
    if(demDe){
      const uv=[[X+12,yTop+10],[X-bw-12,yTop+10],[X+12,dayHop],[X-bw-12,dayHop]]
        .map(([a,b])=>[kepX(a),Math.max(yTop+4,b)]);
      let tot=Infinity;
      for(const [a,b] of uv){ const d=demDe(a,b,bw,bh); if(d<tot){ tot=d; bx=a; by=b; } }
    }else{
      if(bx+bw>w-4) bx=X-bw-12;               // sát mép phải -> lật sang trái
    }
    bx=kepX(bx);
    x.fillStyle=light()?'rgba(255,255,255,.98)':'rgba(24,26,34,.98)';
    x.strokeStyle=light()?'rgba(0,0,0,.16)':'rgba(255,255,255,.18)'; x.lineWidth=1;
    if(x.roundRect){ x.beginPath(); x.roundRect(bx,by,bw,bh,8); x.fill(); x.stroke(); }
    else { x.fillRect(bx,by,bw,bh); x.strokeRect(bx,by,bw,bh); }
    x.textAlign='left'; x.fillStyle=TXT(); x.font='700 11px system-ui';
    x.fillText(tieu,bx+10,by+13);
    dong.forEach((d,i)=>{
      const yy=by+29+i*16;
      x.textAlign='left'; x.fillStyle=MUT(); x.font='10.5px system-ui';
      x.fillText(d[0],bx+10,yy);
      x.textAlign='right'; x.fillStyle=d[2]||TXT(); x.font='700 11px system-ui';
      x.fillText(d[1],bx+bw-10,yy);
    });
    x.textAlign='left';
  }

  /* Hộp chú giải của mốc sự kiện. Vẽ THẲNG LÊN CANVAS chứ không dùng thẻ HTML như bảng
     KQKD: chart này kéo/phóng/vẽ hình được nên toạ độ đổi liên tục, gắn thẻ HTML là phải
     đồng bộ vị trí mỗi khung hình. Chart đã tự bắt chuột sẵn cho thanh ngắm rồi. */
  function veHopSK(x,hit,w,h){
    const dong=hit.ev.map(e=>e.gc||'').filter(Boolean);
    if(!dong.length) return;
    x.font='600 11px system-ui'; x.textAlign='left'; x.textBaseline='middle';
    const MAXW=330;
    // cắt dòng quá dài bằng "…" — hộp tràn ra ngoài canvas thì đọc mất nửa câu
    const cat=t=>{ if(x.measureText(t).width<=MAXW) return t;
      let a=t; while(a.length>4&&x.measureText(a+'…').width>MAXW) a=a.slice(0,-1); return a+'…'; };
    const ds=dong.map(cat);
    const bw=Math.max(...ds.map(t=>x.measureText(t).width))+18;
    const bh=ds.length*16+10;
    let bx=hit.x+12, by=hit.y-bh-10;
    if(bx+bw>w-4) bx=hit.x-bw-12;                // sát mép phải -> lật sang trái
    if(bx<4) bx=4;
    if(by<4) by=hit.y+14;                        // sát mép trên -> lật xuống dưới
    x.fillStyle=light()?'rgba(255,255,255,.98)':'rgba(24,26,34,.98)';
    x.strokeStyle=light()?'rgba(0,0,0,.16)':'rgba(255,255,255,.18)'; x.lineWidth=1;
    if(x.roundRect){ x.beginPath(); x.roundRect(bx,by,bw,bh,8); x.fill(); x.stroke(); }
    else { x.fillRect(bx,by,bw,bh); x.strokeRect(bx,by,bw,bh); }
    x.fillStyle=TXT();
    ds.forEach((t,i)=>x.fillText(t,bx+9,by+13+i*16));
  }

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
      (r.v?it('KL',fmtV(r.v)):'')+
      /* SỐ THẬT, không phải số đã quy đổi để vẽ. Tỉ số neo đổi theo khung nhìn nên in nó ra
         là mỗi lần kéo chart một con số khác — vốn hoá thì phải là vốn hoá, chỉ số là điểm. */
      (ind.vh&&r.vh!=null?it('Vốn hoá',fmtTy(r.vh),VHCOL()):'')+
      (ind.idx&&r.ix!=null?it(ixTen,r.ix.toLocaleString('vi-VN',{maximumFractionDigits:2}),IXCOL()):'')+
      (ind.rs?(()=>{ const NA=nenArr(), gi=rows.indexOf(r), q=gi>=0?NA.g[gi]:null;
         if(q==null) return '';
         const dau=(gi>=0&&NA.pk[gi]?' △':'')+(gi>=0&&NA.dinhN[gi]?' ○':'')
                  +(gi>=0&&NA.dinh[gi]?' ●':'');
         return it('Cách nền',fmtNen(q)+dau,RSCOL()); })():'');
    host.classList.add('on');
  }

  /* ---- LỚP VẼ PHÂN TÍCH KỸ THUẬT ------------------------------------------
     Mỗi hình lưu theo (thời gian, giá) chứ không theo pixel, nên kéo ngang/dọc
     hay phóng to thu nhỏ thì hình vẫn dính đúng chỗ trên nến. */
  const FIB=[0,0.236,0.382,0.5,0.618,0.786,1];
  // mức mở rộng chuẩn: chiếu tiếp biên độ A→B từ điểm C
  const FIBE=[0,0.618,1,1.272,1.618,2,2.618];
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
  /* ---- KHUNG VẼ: 'main' = vùng giá · 'rsi' = dải RSI (thang cố định 0..100) ----
     Hình vẽ neo theo (thời gian, GIÁ TRỊ) nên đổi khung là đổi cách quy giá trị ra y.
     Dải RSI chỉ tồn tại khi bật chỉ báo -> tắt RSI thì hình của khung đó tạm ẩn,
     bật lại là hiện đúng chỗ cũ (không xoá dữ liệu). */
  const coRSI=()=>ind.rsi&&geo.rsiTop!=null&&geo.rsiH>0;
  const yRSI=v=>geo.rsiTop+(100-Math.max(0,Math.min(100,v)))/100*geo.rsiH;
  const vRSI=py=>100-(py-geo.rsiTop)/geo.rsiH*100;
  const khungTaiY=py=>(coRSI()&&py>=geo.rsiTop-4&&py<=geo.rsiTop+geo.rsiH+4)?'rsi':'main';
  const yOfP=(pane,v)=>pane==='rsi'?yRSI(v):yOfV(v);
  const vOfP=(pane,py)=>pane==='rsi'?vRSI(py):vOfY(py);
  const veDuoc=d=>d.pane!=='rsi'||coRSI();
  function paintOne(x,y,d,live,isSel){
    const yy2=d.pane==='rsi'?yRSI:y;                 // hình ở dải RSI dùng thang riêng
    const P=d.p.map(q=>({x:xOfT(q.t),y:yy2(q.v)}));
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
    }else if((d.k==='pen'||d.k==='poly')&&P.length>=1){
      /* BÚT VẼ và ĐA ĐOẠN dùng chung cách vẽ: nối hết các điểm. Khác nhau ở cách
         NHẬP điểm — bút lấy theo đường rê chuột, đa đoạn lấy theo từng cú bấm. */
      x.lineJoin=x.lineCap='round';
      x.beginPath(); P.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));
      x.stroke();
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
      }
      /* FIBO MỞ RỘNG: 3 điểm A-B-C. Lấy biên độ A→B chiếu tiếp từ C để ước lượng
         đích của nhịp sau — khác fibo thoái lui (2 điểm, đo mức lùi trong nhịp cũ). */
      else if(d.k==='fibe'&&P.length>=3){
        const vA=d.p[0].v, vB=d.p[1].v, vC=d.p[2].v, bien=vB-vA;
        const x0=Math.min(a.x,P[2].x), x1=Math.max(b.x,P[2].x);
        x.globalAlpha=.5; x.setLineDash([2,3]);
        x.beginPath(); x.moveTo(a.x,a.y); x.lineTo(b.x,b.y); x.lineTo(P[2].x,P[2].y); x.stroke();
        x.globalAlpha=1; x.setLineDash([4,3]);
        x.font='700 9.5px system-ui'; x.textBaseline='bottom';
        const flip=x1>W-86; x.textAlign=flip?'right':'left';
        for(const f of FIBE){
          const v=vC+bien*f, yy=yy2(v);
          x.beginPath(); x.moveTo(x0,yy); x.lineTo(x1,yy); x.stroke();
          x.fillText((f*100).toFixed(1)+'%  '+fmtP(v),flip?x1-4:x1+4,yy-2.5);
        }
        x.setLineDash([]);
      }
      else if(d.k==='fib'){
        const v0=d.p[0].v, v1=d.p[1].v, x0=Math.min(a.x,b.x), x1=Math.max(a.x,b.x);
        x.font='700 9.5px system-ui'; x.textBaseline='bottom';   // chữ nằm TRÊN đường, khỏi bị gạch ngang
        x.setLineDash([4,3]);
        // nhãn nằm bên phải, nhưng nếu sát mép thì lật vào trong cho khỏi bị cắt
        const flip=x1>W-72; x.textAlign=flip?'right':'left';
        for(const f of FIB){
          const v=v0+(v1-v0)*f, yy=yy2(v);
          x.beginPath(); x.moveTo(x0,yy); x.lineTo(x1,yy); x.stroke();
          x.fillText((f*100).toFixed(1)+'%  '+fmtP(v),flip?x1-4:x1+4,yy-2.5);
        }
        x.setLineDash([]);
      }
    }
    // chấm neo để biết hình đang ở đâu; hình ĐANG CHỌN thì neo to hơn, viền trắng
    const neo=d.k==='pen'?[P[0],P[P.length-1]].filter(Boolean):P;   // bút: chỉ neo 2 đầu
    if(!live) for(const q of neo){
      x.beginPath(); x.arc(q.x,q.y,isSel?5:2.6,0,7); x.fill();
      if(isSel){ x.strokeStyle='#fff'; x.lineWidth=1.6; x.stroke(); }
    }
    x.restore();
  }
  function paintDraws(x,y,chiKhung){
    /* Cắt theo ĐÚNG KHUNG của từng hình: hình vùng giá không tràn xuống dải phụ,
       hình dải RSI không trào ngược lên vùng giá. */
    const cat=(pane,fn)=>{
      x.save(); x.beginPath();
      if(pane==='rsi') x.rect(0,geo.rsiTop-2,geo.plotW,geo.rsiH+4);
      else x.rect(0,geo.padTv,geo.plotW,geo.plotHv);
      x.clip(); fn(); x.restore();
    };
    const hop=p=>!chiKhung||(p||'main')===chiKhung;
    draws.forEach((d,i)=>{ if(veDuoc(d)&&hop(d.pane)) cat(d.pane,()=>paintOne(x,y,d,false,i===sel)); });
    if(pending&&hop(pending.pane)){
      const pts=pending.p.concat(preview?[preview]:[]);
      if(pts.length) cat(pending.pane,()=>paintOne(x,y,
        {k:pending.k,p:pts,col:pending.col,txt:pending.txt,pane:pending.pane},true));
    }
  }
  // 0 = số điểm KHÔNG cố định (bút, đa đoạn) — kết thúc bằng thả chuột / bấm đúp / Enter
  const NEED={hl:1,vl:1,txt:1,tl:2,ray:2,rc:2,fib:2,msr:2,pc:3,fibe:3,pen:0,poly:0};

  /* ---- CHỌN / KÉO / XOÁ TỪNG HÌNH ---------------------------------------- */
  const HIT=8;                                          // bán kính bắt trúng (px)
  function segDist(px,py,a,b){                          // khoảng cách từ điểm tới đoạn thẳng
    const dx=b.x-a.x, dy=b.y-a.y, L=dx*dx+dy*dy;
    const t=L?Math.max(0,Math.min(1,((px-a.x)*dx+(py-a.y)*dy)/L)):0;
    return Math.hypot(px-(a.x+dx*t),py-(a.y+dy*t));
  }
  function hitOne(d,px,py){
    if(!veDuoc(d)) return null;                     // hình dải RSI mà đang tắt RSI
    const P=d.p.map(q=>({x:xOfT(q.t),y:yOfP(d.pane,q.v)})), W=geo.plotW;
    // bút có hàng trăm điểm -> chỉ cho tóm hai đầu, kẻo rê chuột đâu cũng dính neo
    const neoI=d.k==='pen'?[0,P.length-1]:P.map((_,i)=>i);
    for(const i of neoI) if(P[i]&&Math.hypot(px-P[i].x,py-P[i].y)<=HIT) return {pt:i};
    if(d.k==='pen'||d.k==='poly'){
      for(let i=1;i<P.length;i++) if(segDist(px,py,P[i-1],P[i])<=HIT) return {};
      return null;
    }
    if(d.k==='fibe'&&P.length>=3){
      const vC=d.p[2].v, bien=d.p[1].v-d.p[0].v;
      const X0=Math.min(P[0].x,P[2].x), X1=Math.max(P[1].x,P[2].x);
      if(px<X0-HIT||px>X1+HIT) return null;
      for(const f of FIBE) if(Math.abs(py-yOfP(d.pane,vC+bien*f))<=HIT) return {};
      return null;
    }
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
      for(const f of FIB) if(Math.abs(py-yOfP(d.pane,v0+(v1-v0)*f))<=HIT) return {};
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
    px=Math.max(0,Math.min(geo.plotW-1,px));
    // KHUNG do điểm ĐẦU TIÊN quyết định — bấm vào dải RSI thì cả hình thuộc dải RSI,
    // các điểm sau bị giữ trong đúng khung đó để hình không vắt ngang hai vùng.
    const pane=pending?pending.pane:khungTaiY(py);
    if(pane==='rsi') py=Math.max(geo.rsiTop,Math.min(geo.rsiTop+geo.rsiH,py));
    else py=Math.max(geo.padTv,Math.min(geo.padTv+geo.plotHv,py));
    const p={t:tOfX(px), v:pane==='rsi'?vRSI(py):snapV(px,py)};
    if(!pending) pending={k:tool,p:[p],col:dcol||undefined,pane};
    else pending.p.push(p);
    const can=NEED[pending.k];
    if(can&&pending.p.length>=can) finishDraw(); else self.draw();
  }
  /* hình SỐ ĐIỂM KHÔNG CỐ ĐỊNH (bút, đa đoạn): tự chốt khi thả chuột / bấm đúp / Enter */
  function chotMo(){
    if(!pending||NEED[pending.k]!==0) return false;
    if(pending.p.length<2){ cancelDraw(); return true; }
    finishDraw(); return true;
  }
  self.chotMo=chotMo;

  /* ---- tương tác ---- */
  /* Bấm trúng một trong hai ô công tắc trong khung -> bật/tắt, và NUỐT luôn cú bấm để nó
     không đi tiếp thành ghim phiên hay thành cú kéo. */
  function bamMoc(px,py){
    for(const m of mocHit){
      if(px>=m.x&&px<=m.x+m.w&&py>=m.y&&py<=m.y+m.h){
        ind[m.k]=!ind[m.k]; self.draw();
        if(opt.onInd) opt.onInd(m.k,ind[m.k]);   // trang ngoài đi nạp kho nếu cần
        return true;
      }
    }
    return false;
  }
  /* BẤM (không phải KÉO) trong vùng vẽ -> ghim / bỏ ghim đúng cột đó. */
  const choGhim=()=>!!(ind.vh||ind.idx);
  function bamGhim(px){
    /* CHỈ MỞ KHOÁ KHI CÓ ĐƯỜNG PHỦ TRÊN VÙNG GIÁ (user chốt 25/08: *"thanh dọc này chỉ
       xuất hiện khi bật vốn hoá hoặc VN-Index"*). Có lúc tao cho `rs` mở khoá luôn vì hộp
       ghim in được dòng "Cách nền" — nhưng dải nằm ở khung riêng phía dưới, ghim một thanh
       dọc xuyên qua vùng giá để đọc nó thì thanh ấy che nến mà chẳng phục vụ cái gì đang
       xem. Bật vốn hoá/VN-Index thì khác: lúc đó thanh dọc trỏ đúng vào thứ người ta đang
       so sánh. */
    if(!choGhim()) return false;
    if(!(px>=0&&px<=geo.plotW)||!rows.length) return false;
    const gi=i0+idxAt(px);
    if(gi<0||gi>=rows.length) return false;      // rê vào vùng trống tương lai
    ghimT=(ghimT===rows[gi].t)?null:rows[gi].t;
    self.draw();
    return true;
  }
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
    if(vuaCham()) return;                         // xem chú thích ở `chamLuc`
    const r=cvs.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top;
    if(!tool&&bamMoc(px,py)) return;              // các ô công tắc trong khung
    if(tool){                                     // đang chọn công cụ vẽ
      addPoint(px,py);
      if(tool==='pen'&&pending){ veBut=true; return; }   // bút: rê tới đâu ghi tới đó
      if(pending) dpen={x:px,y:py,n:pending.p.length};   // ghi mốc để biết có KÉO hay không
      return;
    }
    if(px<=geo.plotW){                            // không có công cụ -> thử CHỌN hình vẽ
      const h=hitTest(px,py);
      if(h){ sel=h.i;
        dmove={i:h.i, pt:h.pt, t0:tOfX(px), v0:vOfP(draws[h.i].pane,py),
               pane:draws[h.i].pane, p0:draws[h.i].p.map(q=>({...q}))};
        cvs.style.cursor='move'; self.draw(); return;
      }
      if(sel>=0){ sel=-1; self.draw(); }          // bấm ra chỗ trống -> bỏ chọn
    }
    // kéo trên TRỤC GIÁ = giãn/co trục giá; kéo trong khung = dời cả 2 chiều
    drag={x:e.clientX,y:e.clientY,i0,yPan,yZoom,axis:px>geo.plotW};
    cvs.style.cursor=drag.axis?'ns-resize':'grabbing';
  });
  window.addEventListener('mouseup',e=>{
    if(vuaCham()) return;
    if(veBut){ veBut=false; chotMo(); return; }   // bút: nhả tay là xong nét
    // nhả chuột sau khi KÉO -> chốt luôn điểm cuối (kiểu bấm–kéo–thả)
    if(dpen&&pending&&pending.p.length===dpen.n){
      const r=cvs.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top;
      // nhả tay ra ngoài vùng vẽ thì KẸP vào mép, đừng bỏ dở hình đang vẽ
      if(Math.hypot(px-dpen.x,py-dpen.y)>5) addPoint(Math.min(px,geo.plotW-1),py);
    }
    dpen=null;
    /* Phân biệt BẤM với KÉO bằng quãng đường, ngưỡng 4px — chuột ai cũng nhích một chút
       lúc nhả. Không có ngưỡng thì mỗi lần kéo chart xong là ghim nhầm một phiên. */
    if(drag&&!drag.axis&&!dmove&&!tool&&!pending&&
       Math.abs(e.clientX-drag.x)<4&&Math.abs(e.clientY-drag.y)<4){
      bamGhim(e.clientX-cvs.getBoundingClientRect().left);
    }
    if(dmove){ dmove=null; if(opt.onDraws) opt.onDraws(draws); }
    drag=null; cvs.style.cursor=tool?'crosshair':'';
  });
  cvs.addEventListener('mousemove',e=>{
    const r=cvs.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top;
    if(veBut&&pending){                           // bút đang chạy: gom điểm theo đường rê
      const l=pending.p[pending.p.length-1];
      // thưa bớt: chỉ ghi khi đã dịch >3px, kẻo một nét ngắn cũng thành ngàn điểm
      if(!l||Math.hypot(px-xOfT(l.t),py-yOfP(pending.pane,l.v))>3) addPoint(px,py);
      return;
    }
    if(dmove){                                    // đang kéo hình vẽ (cả hình hoặc 1 điểm neo)
      // hình ở dải RSI quy theo thang 0..100, không hít nến; hình vùng giá giữ hít nến
      const dt=tOfX(px)-dmove.t0, dv=(dmove.pane==='rsi'?vRSI(py):snapV(px,py))-dmove.v0, d=draws[dmove.i];
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
    /* RÊ TRÚNG MỐC SỰ KIỆN — kiểm TRƯỚC thanh ngắm. Chấm nằm sát đáy vùng giá, nơi
       thanh ngắm cũng chạy qua; xét sau thì mỗi lần vẽ lại vì thanh ngắm là chỉ số mốc
       bị xoá, hộp chú giải chớp tắt liên tục. */
    {
      let h2=-1;
      for(let i=0;i<skHit.length;i++){
        const d=skHit[i];
        if(Math.abs(px-d.x)<=d.r&&Math.abs(py-d.y)<=d.r){ h2=i; break; }
      }
      if(h2!==skHover){ skHover=h2; self.draw(); }
      if(h2>=0){ cvs.style.cursor='pointer'; return; }
    }
    for(const m of mocHit){
      if(px>=m.x&&px<=m.x+m.w&&py>=m.y&&py<=m.y+m.h){ cvs.style.cursor='pointer'; return; }
    }
    if(px>geo.plotW){ if(hover!==-1){hover=-1; hoverY=-1; self.draw();} return; }
    if(!tool&&draws.length) cvs.style.cursor=hitTest(px,py)?'move':'';   // rê trúng hình -> báo kéo được
    const i=idxAt(px);
    /* Đường ngang phải BÁM ĐÚNG CHUỘT, không hít vào giá đóng cửa của nến. Nên vẽ lại
       cả khi chỉ đổi Y (rê dọc trong cùng một nến) — trước chỉ vẽ khi đổi nến. */
    if(i!==hover||Math.abs(py-hoverY)>0.5){ hover=i; hoverY=py; self.draw(); }
  });
  cvs.addEventListener('mouseleave',()=>{ if(hover!==-1||skHover!==-1){ hover=-1; hoverY=-1; skHover=-1; self.draw(); } });
  /* Trang gọi khi bấm Esc: đang vẽ dở thì huỷ nét vẽ và trả TRUE, để Esc đó
     không đóng luôn cửa sổ toàn màn hình. */
  self.cancelTool=function(){ if(!pending&&!tool) return false; cancelDraw(); return true; };
  // phím Delete xoá hình đang chọn
  window.addEventListener('keydown',e=>{
    if(!cvs.isConnected) return;
    const a=document.activeElement;
    if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.isContentEditable)) return;
    if(e.key==='Enter'&&chotMo()){ e.preventDefault(); return; }   // chốt đa đoạn/bút
    if(sel<0) return;
    if(e.key!=='Delete'&&e.key!=='Backspace') return;
    e.preventDefault(); self.delSel();
  });
  /* BẤM ĐÚP có hai việc: đang vẽ hình nhiều điểm thì CHỐT nét, còn lại là xem lại
     toàn bộ. Để hai listener riêng thì chốt nét xong bị listener kia reset khung ngay. */
  cvs.addEventListener('dblclick',e=>{ if(chotMo()){ e.preventDefault(); return; } self.resetView(); });
  /* ---- CẢM ỨNG ----------------------------------------------------------------
     Luật giống các app biểu đồ hiện nay:
       · một ngón NGANG = kéo thời gian (quá khứ ↔ tương lai)
       · một ngón DỌC   = giãn/co VÙNG GIÁ — kéo xuống thì nến co lại (vùng giá rộng ra),
                          vuốt lên thì nến giãn ra (vùng giá hẹp lại)
       · hai ngón       = chụm ngang đổi thời gian, chụm dọc đổi vùng giá
       · chạm hai lần   = về khung mặc định
     BẢN THÂN ĐỒ THỊ KHÔNG BAO GIỜ TRƯỢT LÊN XUỐNG. Thứ chuyển động là vùng giá và
     khung thời gian, còn khối đồ thị đứng yên.
     > Gốc lỗi cũ: canvas để `touch-action:pan-y`, nghĩa là nhường trục dọc cho TRÌNH
     > DUYỆT — vuốt dọc trên biểu đồ là cả trang cuộn, cả khối đồ thị trôi theo ngón tay
     > (user báo "rất khó chịu"), và `preventDefault` trong touchmove bị bỏ qua nên phần
     > dời trục giá viết sẵn ở đây gần như không bao giờ chạy. Canvas nay `touch-action:none`
     > để nhận trọn cử chỉ; đổi giá trị đó về là lỗi quay lại y nguyên.
     KHOÁ TRỤC ngay từ đầu cú vuốt và giữ tới khi nhấc tay: vuốt ngang không được làm
     nhảy vùng giá, vuốt dọc không được làm trôi khung thời gian. */
  const NGUONG=18;             // vuốt rõ ràng mới tính, kẻo chạm xem giá cũng dời khung
  let chamCuoi=0, chamXY=null; // mốc chạm trước, để bắt chạm-hai-lần
  /* ---- CHẶN SỰ KIỆN CHUỘT GIẢ SAU KHI CHẠM (sửa 25/08/2026) -------------------
     User: *"bật tắt cổ tức và cách nền trên điện thoại bị lỗi"*. Trình duyệt di động phát
     THÊM một cặp `mousedown`/`mouseup` giả sau mỗi lần chạm để tương thích với trang chỉ
     viết cho chuột. Cả `touchstart` lẫn `mousedown` đều gọi `bamMoc`, nên một cú chạm vào
     ô "Cổ tức"/"Cách nền" bật rồi TẮT ngay lại — nhìn ra y như nút hỏng.

     CHẶN BẰNG `preventDefault`, KHÔNG BẰNG MỐC THỜI GIAN. Bản đầu tao chặn theo thời gian
     (bỏ qua chuột trong 700ms sau khi chạm) và nó SAI ở đúng chỗ dễ bỏ sót: cú chạm kích
     hoạt vẽ lại (`nenArr` chạy O(n·W) trên 3.400 nến), máy chậm thì lượt vẽ nuốt trọn cửa
     sổ 700ms rồi chuột giả mới tới — đo được **1.124ms** ngay trên máy đang thử. Hàng rào
     nào dựa vào "đủ nhanh" thì hỏng đúng lúc máy chậm, tức đúng lúc cần nó nhất.
     `preventDefault` trên `touchstart` thì theo chuẩn là huỷ hẳn cặp chuột giả, không phụ
     thuộc máy nhanh hay chậm.

     GIÁ PHẢI TRẢ LÀ `{passive:false}` cho `touchstart`. Chấp nhận được vì: chỉ gọi
     `preventDefault` khi cú chạm TRÚNG một ô công tắc, còn lại vẫn cho cuộn bình thường;
     và canvas này vốn đã `{passive:false}` ở `touchmove` (cần chặn để kéo/chụm), nên nó
     không phải vùng cuộn mượt sẵn có.
     Mốc thời gian vẫn giữ làm lớp hai cho trình duyệt cũ nào lỡ vẫn phát chuột giả. */
  let chamLuc=0;
  const vuaCham=()=>Date.now()-chamLuc<700;
  cvs.addEventListener('touchstart',e=>{
    chamLuc=Date.now();
    if(e.touches.length===2){
      const a=e.touches[0], b=e.touches[1];
      pinch={dx:Math.abs(a.clientX-b.clientX), dy:Math.abs(a.clientY-b.clientY),
             span:i1-i0, i0, yZoom}; drag=null;
    }else if(e.touches.length===1){
      const r=cvs.getBoundingClientRect();
      const p0=e.touches[0], px=p0.clientX-r.left, py=p0.clientY-r.top;
      if(!tool&&bamMoc(px,py)){ drag=null; if(e.cancelable) e.preventDefault(); return; }
      if(tool){ addPoint(px,py); if(pending) dpen={x:px,y:py,n:pending.p.length}; return; }
      if(px<=geo.plotW){                       // chạm trúng hình vẽ -> chọn và kéo được bằng ngón
        const hit=hitTest(px,py);
        if(hit){ sel=hit.i;
          dmove={i:hit.i, pt:hit.pt, t0:tOfX(px), v0:vOfY(py), p0:draws[hit.i].p.map(q=>({...q}))};
          self.draw(); return;
        }
        if(sel>=0){ sel=-1; self.draw(); }
      }
      drag={x:p0.clientX,y:p0.clientY,i0,yZoom,truc:null,moved:false};
      hover=idxAt(px); self.draw();
    }
  },{passive:false});
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
      // hình ở dải RSI quy theo thang 0..100, không hít nến; hình vùng giá giữ hít nến
      const dt=tOfX(px)-dmove.t0, dv=(dmove.pane==='rsi'?vRSI(py):snapV(px,py))-dmove.v0, d=draws[dmove.i];
      if(dmove.pt!=null) d.p[dmove.pt]={t:dmove.p0[dmove.pt].t+dt, v:dmove.p0[dmove.pt].v+dv};
      else d.p=dmove.p0.map(q=>({t:q.t+dt, v:q.v+dv}));
      hover=-1; self.draw(); return;
    }
    if(pinch&&e.touches.length===2){
      e.preventDefault();
      const a=e.touches[0], b=e.touches[1];
      const ndx=Math.abs(a.clientX-b.clientX), ndy=Math.abs(a.clientY-b.clientY);
      /* Hai trục tính RỜI NHAU: chụm ngang đổi thời gian, chụm dọc đổi vùng giá, chụm
         chéo đổi cả hai — giống thao tác quen tay ở các app. Trục nào mà hai ngón vốn
         đã gần sát nhau thì bỏ qua: chia cho một số bé là biên độ nhảy loạn. */
      if(pinch.dx>24&&ndx>8){
        const ns=Math.max(6,Math.min(rows.length,Math.round(pinch.span*pinch.dx/ndx)));
        const mid=pinch.i0+pinch.span/2;
        i0=Math.round(mid-ns/2); i1=i0+ns; clampView();
      }
      if(pinch.dy>24&&ndy>8) yZoom=Math.max(0.15,Math.min(6,pinch.yZoom*pinch.dy/ndy));
      hover=-1; self.draw(); return;
    }
    if(drag&&e.touches.length===1){
      const t=e.touches[0], px=t.clientX-r.left;
      const dx=drag.x-t.clientX;      // >0 = ngón sang TRÁI  -> khung trôi về phía tương lai
      const dy=t.clientY-drag.y;      // >0 = ngón đi XUỐNG   -> vùng giá rộng ra, nến co lại
      if(!drag.truc){
        if(Math.abs(dx)<NGUONG&&Math.abs(dy)<NGUONG){ hover=idxAt(px); self.draw(); return; }
        drag.truc=Math.abs(dx)>=Math.abs(dy)?'x':'y';    // khoá trục, giữ tới lúc nhấc tay
      }
      e.preventDefault(); drag.moved=true; hover=-1;
      if(drag.truc==='x'){
        const span=i1-i0; i0=drag.i0+Math.round(dx/geo.cw); i1=i0+span; clampView();
      }else{
        /* Chia theo CHIỀU CAO KHUNG VẼ chứ không phải một số cứng: vuốt hết chiều cao
           biểu đồ luôn cho đúng 2×, dù là chart nhỏ trong trang mã hay chart toàn màn
           hình. Để cứng 260 thì cái chart lùn 110px của bảng bong bóng nhạy tới mức
           chạm hụt một cái là vùng giá nhảy gấp đôi. */
        const cao=Math.max(220,geo.plotHv||geo.plotH||260);
        yZoom=Math.max(0.15,Math.min(6,drag.yZoom*(1+dy/cao)));
      }
      self.draw();
    }
  },{passive:false});
  cvs.addEventListener('touchend',e=>{
    chamLuc=Date.now();
    const t=e.changedTouches&&e.changedTouches[0];
    // nhấc ngón sau khi kéo -> chốt điểm cuối, giống bấm–kéo–thả bằng chuột
    if(dpen&&pending&&pending.p.length===dpen.n){
      if(t){ const r=cvs.getBoundingClientRect(), px=t.clientX-r.left, py=t.clientY-r.top;
        if(Math.hypot(px-dpen.x,py-dpen.y)>8) addPoint(Math.min(px,geo.plotW-1),py); }
    }
    /* CHẠM HAI LẦN = về khung mặc định. Phải tự bắt lấy: `dblclick` trên màn cảm ứng lúc
       có lúc không, mà từ khi vuốt dọc đổi được vùng giá thì luôn phải có đường quay về,
       bằng không kéo lố một cái là mắc kẹt ở khung giá lạ. */
    const chamTron=t&&!tool&&!pending&&!dpen&&!dmove&&drag&&!drag.moved&&e.touches.length===0;
    dpen=null;
    if(dmove){ dmove=null; if(opt.onDraws) opt.onDraws(draws); }
    drag=null; pinch=null;
    if(!chamTron) return;
    const nay=Date.now();
    if(nay-chamCuoi<320&&chamXY&&Math.hypot(t.clientX-chamXY[0],t.clientY-chamXY[1])<32){
      chamCuoi=0; chamXY=null; hover=-1; self.resetView(); return;
    }
    chamCuoi=nay; chamXY=[t.clientX,t.clientY];
    bamGhim(t.clientX-cvs.getBoundingClientRect().left);
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
