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
/* Ngày ngắn cho nhãn mốc neo — chỉ dd/mm/yyyy, không mang tiền tố khung như `fullLabel`
   (nhãn neo phải đọc được y hệt ở mọi khung, chứ "Tuần 02/01/2013" thì rối). */
function ngayNgan(t){
  const d=vn(t);
  return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth()+1)}/${d.getUTCFullYear()}`;
}
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
    /* XOÁ ĐỆM Ở ĐÂY, ĐỪNG DỰA VÀO KHOÁ ĐỆM. `veLaiPhu` gắn chỉ số/vốn hoá vào rồi gọi lại
       setRows với mảng CÙNG độ dài, cùng mốc đầu và cùng mốc cuối — khoá đệm nào dựng từ
       hình dạng chuỗi cũng thấy y hệt lần trước và trả về kết quả tính lúc chưa có phủ, tức
       dải vĩnh viễn rỗng. Đây là đường duy nhất thay `rows` nên xoá ở đây là đủ.
       KHÔNG xoá `neoT`: nó là một MỐC THỜI GIAN nên đổi khung Ngày↔Tuần↔Tháng vẫn trỏ đúng
       phiên đó. Đổi mã thì cả trang tải lại (`location.href='/cophieu/MÃ'`) nên chart mới
       hoàn toàn — không có đường nào mang mốc neo của mã cũ sang mã mới. */
    smCache.k='';
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
  /* EMA200 LÀ ĐƯỜNG MẶC ĐỊNH TỪ 25/08/2026 (user: *"đổi MA200 thành EMA200"*); trước đó là
     MA200 (24/08, đổi từ MA20). Chart của trang mã bày 13 năm nến cạnh vốn hoá và chỉ số,
     mà ở tầm đó một trung bình 20 phiên chỉ là cái bóng của chính đường giá; 200 mới nói
     được xu hướng. EMA bám giá nhanh hơn MA cùng kỳ nên bẻ hướng sớm hơn ở chỗ đảo chiều.
     ĐỔI CẢ MẶC ĐỊNH CỦA `bubbles.html` — trang đó dùng chung `ind` này và không có nút chỉ
     báo nào, nên chart chi tiết ở đó cũng chuyển sang EMA200.
     ĐƯỜNG NÀY DÙNG XÁM THÉP, không giữ tím tía nữa. Nó là đường LUÔN BẬT, mà tím
     `rgb(192,38,211)` đứng cạnh hồng sen của VN-Index quy đổi `rgb(219,39,119)` thì lệch
     nhau đúng một kênh (ΔG=1, ΔR=27) — nhìn ra hai đường thì được, nhưng cùng đọc là
     "hồng tím" nên mắt phải dừng lại phân biệt, đúng chỗ không nên phải dừng.
     Xám cũng ĐÚNG VAI: đường xu hướng là cái NỀN để so, không phải một nhân vật của câu chuyện —
     hai nhân vật là vốn hoá (xanh lá) và chỉ số (hồng sen). Cùng lý lẽ đã ghi cho đường
     vốn hoá thị trường hồi trước.
     XÁM TRUNG chứ đừng xám nhạt (luật đã ghi): `#cbd5e1` từng bị đo là trùng dải với
     đường gần trắng. MA20 giữ hổ phách và MA50 giữ xanh trời — hai nút đó chỉ còn ở cửa
     sổ PTKT, đổi màu chúng là đổi thứ người dùng PTKT đã quen. */
  const MACOL={20:'rgba(234,179,8,.85)',50:'rgba(56,189,248,.85)',200:'rgba(148,163,184,.95)'};
  /* EMA màu RIÊNG, không mượn màu MA: bật cả MA50 lẫn EMA50 mà cùng màu thì hai đường
     chạy sát nhau thành một vệt, không đọc ra đường nào là đường nào. */
  /* EMA200 lấy màu XÁM XANH của MA200 cũ (25/08/2026, khi MA200 rời khỏi giao diện). Màu
     fuchsia cũ `rgb(232,121,249)` đứng cạnh đường nền hồng sen `rgb(219,39,119)` là lặp lại
     đúng cái bẫy đã ghi ở MACOL: hai màu lệch nhau quá ít, chạy sát nhau thành một vệt. */
  const EMACOL={20:'rgba(52,211,153,.9)',50:'rgba(251,146,60,.9)',200:'rgba(148,163,184,.95)'};
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
  const ind={ma:[], ema:[200], vol:true, rsi:false, bb:false, macd:false, sk:true, bctc:false,
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
  let mocMenu=[];           // ô bấm của bảng chọn số năm, chỉ có khi bảng đang mở
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
  /* ---- SỨC MẠNH SO VỚI CHỈ SỐ, NEO Ở MỘT PHIÊN (user chốt 25/08/2026) ------------
     Thay hẳn bộ "cách nền" cũ. Lý do đổi, đo được hết, ghi lại để đừng ai dựng lại bản cũ:

     ① BẢN CŨ ĐO BẰNG VỐN HOÁ — SAI THƯỚC. Vốn hoá tăng cả khi phát hành thêm mà cổ đông cũ
        không được gì. Đo 367 mã từ 2013: tỉ lệ (vốn hoá tăng)/(giá điều chỉnh tăng) có trung
        vị 0,88 nhưng p90 **2,83** và max **61,5**. ORS vốn hoá ×157,6 mà người cầm cổ phiếu
        chỉ ×11,84 (vốn điều lệ 240 → 6.239 tỷ, tức số cổ phiếu ×26, trong đó chỉ ×1,95 là
        phần được hạ nền). HHV còn ngược dấu: vốn hoá ×112,5 mà giá ×1,83 trong khi chỉ số
        ×3,11 — tức THUA thị trường trong khi thước cũ chấm nó mạnh nhất sàn.
        Lý do gốc: giá chỉ hạ nền khi có giá trị RA KHỎI cổ đông hiện hữu (cổ tức, cổ phiếu
        thưởng, quyền mua giá ưu đãi). Chào bán riêng lẻ bằng giá thị trường thì không hạ nền
        — không ai mất gì — nhưng vốn hoá tăng đúng tỉ lệ cổ phiếu mới.

     ② BẢN CŨ NEO BẰNG TRUNG BÌNH TRƯỢT — CÒN CÕNG THÊM ƯỚC SỐ CHỈ SỐ. `log(vốn hoá ÷ chỉ
        số) = log(tỉ trọng) + log(ước số)`, mà ước số bị điều chỉnh mỗi lần có mã lên/rời sàn
        hay phát hành thêm. Đo: tổng vốn hoá ÷ VN-Index trôi **×3,01** trong 13 năm, khiến MỌI
        con số "cách nền" bị cộng thêm một sai số CHUNG — trung vị **+17,2%**, max **+68,1%**
        (2020), 12,7% ở phiên 21/08/2026.

     ③ CÔNG THỨC NAY: hai bên đều là thước GIÁ thuần, neo cùng một phiên.
            đường chỉ số(i) = giá(a) × chỉ số(i) ÷ chỉ số(a)
            khoảng hở(i)    = [giá(i)/giá(a)] ÷ [chỉ số(i)/chỉ số(a)] − 1
        `a` = phiên neo. Hai đường GẶP NHAU tại `a`; sau đó mỗi đường đi theo % của chính nó.
        Tương đương với "nhân dồn % từng phiên" — kiểm sai số tích luỹ qua 3.400 phiên chỉ
        1,4e-14 nên dùng tỉ số hai đầu là an toàn.

     ĐƯỢC GÌ: nhân quả tuyệt đối (mọi phiên chỉ dùng dữ liệu trước nó) · KHÔNG cửa sổ, KHÔNG
     khởi động nên mã mới niêm yết đọc được từ phiên đầu · KHÔNG cần tổng vốn hoá sàn nên
     chuyện huỷ niêm yết thành vô nghĩa · sai số ước số +17,2% biến mất theo cấu trúc.

     CÒN LẠI, GHI RÕ CHỨ ĐỪNG IM: VN-Index là chỉ số GIÁ, không tính cổ tức, còn giá điều
     chỉnh thì CÓ — nên phép so thiên về cổ phiếu cỡ 2–3%/năm. Quy ước tiêu chuẩn của mọi
     biểu đồ sức mạnh tương đối, không vá được bằng dữ liệu đang có.

     PHIÊN NEO MẶC ĐỊNH = phiên ĐẦU TIÊN có cả giá và chỉ số. Với 190/405 mã HOSE lên sàn từ
     2013 thì đó đúng là phiên chào sàn; 215 mã còn lại lên sàn trước 02/01/2013 (mốc kho nến
     bắt đầu) nên neo ở 02/01/2013 — nhãn PHẢI in ngày neo thật, đừng ghi "chào sàn" cho tất.
     Bấm vào một phiên rồi bấm ô "Neo" thì dời mốc về đó. */
  /* ---- MỐC NEO MẶC ĐỊNH: MỘT NĂM GẦN NHẤT, không phải phiên chào sàn (26/08/2026) ----
     User: *"nhiều mã có VN-Index cách cổ phiếu quá xa, xa đến nỗi không bao giờ còn có thể
     cắt nhau được nữa"*. Đo trên 1.471 mã ≥600 phiên, đếm số lần đường giá cắt đường chỉ số
     trong 250 phiên gần nhất:

       neo phiên chào sàn   -> trung vị  0 lần · chỉ  19% số mã có cắt
       neo 250 phiên trước  -> trung vị 10 lần ·     100% số mã có cắt

     Neo chào sàn cho khoảng hở tích luỹ cả chục năm: trung vị 63%, p90 200%, max 21.402%.
     Ở mức đó hai đường không còn gặp nhau nữa, và một đường không bao giờ cắt thì không nói
     được gì về hiện tại — nó chỉ là một dữ kiện lịch sử đứng yên.

     MỐC MẶC ĐỊNH KHÔNG TRÔI KHI KÉO CHART. Nó đếm lùi từ phiên CUỐI CHUỖI, không phải từ mép
     khung nhìn — kéo/phóng bao nhiêu cũng không dời được nó. Chỉ khi có phiên mới thì nó lùi
     đúng một nến, đó là bản chất của "một năm gần nhất". Đây là chỗ khác hẳn cái neo trung
     bình trượt đã bỏ: cái đó đổi mốc theo dữ liệu, cái này đổi theo thời gian và nói rõ ra.

     Quy theo khung để mọi khung đều nói về CÙNG một quãng thời gian. `0` = từ đầu chuỗi.

     SỐ NĂM CHỌN TỰ DO 1..10 HOẶC "TẤT CẢ" (user chốt 27/08/2026: *"mục chọn 1-3-từ đầu nên
     để dạng tuỳ chọn, tôi có thể chọn 1-2-3-4-5-6-7-8-9-10-all"*). Bản trước có ba nấc và
     bấm một ô là xoay vòng qua chúng. Hai chỗ hỏng: ba nấc bỏ trống hẳn quãng 4..9 năm —
     đúng quãng chứa trọn một chu kỳ thị trường — và xoay vòng thì muốn quay lại nấc vừa
     lướt qua phải bấm hết một vòng. Nay ô "Mốc" MỞ BẢNG CHỌN, bấm thẳng vào số năm muốn.
     Một năm quy ra nến theo khung, để mọi khung nói về cùng một quãng thời gian. */
  const NAM_NEN={d:250, W:52, M:12, Y:1};      // số nến của MỘT năm ở từng khung
  const NEO_CHON=[1,2,3,4,5,6,7,8,9,10,0];     // 0 = "Tất cả", neo ở phiên đầu chuỗi
  const tenNam=v=>v?(v+' năm'):'Tất cả';
  let neoNam=1;                        // số năm đang chọn; 0 = từ đầu chuỗi
  let neoT=null;                       // mốc người dùng TỰ neo; null = đi theo số năm
  /* NEO TAY LÀ MỘT NÚT RIÊNG, HAI NHỊP (user chốt 27/08/2026: *"neo nên là 1 mục riêng,
     bấm vào nút neo xong mới bấm vào vị trí cần neo"*). Bản trước neo tay đi kèm việc ghim
     một phiên: phải ghim trước thì ô neo mới hiện ra — tức là muốn neo tay phải đoán trúng
     một thao tác không ghi ở đâu cả. Nay: bấm "Neo" -> chart chờ -> bấm vào phiên cần neo. */
  let mocMo=false;                     // bảng chọn số năm đang mở
  let neoArm=false;                    // đã bấm nút Neo, đang chờ bấm vào một phiên
  const smCache={k:'',v:null};
  function smArr(){
    const khoa=rows.length+'|'+(rows.length?rows[0].t+'|'+rows[rows.length-1].t:'')
              +'|'+(neoT||0)+'|'+neoNam+'|'+iv;
    if(smCache.k===khoa) return smCache.v;
    const n=rows.length, q=new Array(n).fill(null), ln=new Array(n).fill(null);
    const out={q:q,ln:ln,a:-1,co:0};
    let dau=-1, co=0;
    for(let i=0;i<n;i++){ const r=rows[i];
      if(r&&r.c>0&&r.ix>0){ if(dau<0) dau=i; co++; } }
    out.co=co;
    if(dau<0){ smCache.k=khoa; smCache.v=out; return out; }
    /* PHIÊN NEO PHẢI CÓ ĐỦ HAI SỐ. Neo vào một phiên thiếu chỉ số thì lùi về phiên hợp lệ
       gần nhất TRƯỚC đó, chứ đừng bỏ neo im lặng — người dùng vừa bấm thì phải thấy đổi. */
    let a=dau;
    if(neoT!=null){
      for(let i=0;i<n;i++){ const r=rows[i];
        if(r&&r.t<=neoT&&r.c>0&&r.ix>0) a=i; else if(r&&r.t>neoT) break; }
    }else{
      const lui=neoNam>0?neoNam*(NAM_NEN[iv]||NAM_NEN.d):0;
      if(lui>0){
        /* Đếm lùi `lui` NẾN HỢP LỆ từ phiên cuối, chứ không phải `n-1-lui`: chuỗi có phiên
           thiếu chỉ số thì đếm theo chỉ số mảng là ra một mốc ngắn hơn ý định. */
        let dem=0;
        for(let i=n-1;i>=dau;i--){ const r=rows[i];
          if(!r||!(r.c>0)||!(r.ix>0)) continue;
          if(dem>=lui){ a=i; break; }
          dem++;
        }
        if(dem<lui) a=dau;                 // chuỗi ngắn hơn cửa sổ -> lùi hết cỡ
      }
    }
    out.a=a;
    const c0=rows[a].c, x0=rows[a].ix;
    for(let i=a;i<n;i++){ const r=rows[i];
      if(!r||!(r.c>0)||!(r.ix>0)) continue;
      ln[i]=c0*r.ix/x0;                       // đường chỉ số quy về đơn vị GIÁ
      q[i]=(r.c/c0)/(r.ix/x0)-1;              // khoảng hở, đọc thẳng ra %
    }
    smCache.k=khoa; smCache.v=out;
    return out;
  }
  /* Cửa ra để đọc số — trang ngoài và bộ kiểm thử đều cần lấy ĐÚNG mảng chart đang vẽ, chứ
     tính lại ở chỗ khác là hai nơi lệch nhau lúc nào không biết. */
  self.smSo=()=>smArr();
  /* Khung nhìn hiện hành + các ô bấm trong khung — bộ kiểm thử cần biết ĐANG vẽ từ nến nào
     tới nến nào và ô nằm ở đâu, để phân biệt "tính sai" với "nằm ngoài khung". */
  self.khungNhin=()=>({i0:i0,i1:i1,cw:geo.cw,plotW:geo.plotW,plotH:geo.plotH,
                       oBam:mocHit.map(m=>m.k+':'+Math.round(m.x)+'-'+Math.round(m.x+m.w)),
                       oNut:mocHit.map(m=>({k:m.k,x:Math.round(m.x+m.w/2),y:Math.round(m.y+m.h/2)})),
                       padTv:geo.padTv, plotHv:geo.plotHv,
                       rsTop:geo.rsTop, rsBh:geo.rsBh,
                       oNam:mocMenu.filter(m=>m.k==='nam')
                              .map(m=>({v:m.v,x:Math.round(m.x+m.w/2),y:Math.round(m.y+m.h/2)})),
                       oNeo:(m=>m?{x:Math.round(m.x+m.w/2),y:Math.round(m.y+m.h/2)}:null)
                              (mocMenu.find(m=>m.k==='neo'))});
  self.neoTai=function(t){ neoT=(t==null?null:t); smCache.k=''; self.draw(); return self; };
  self.neoDang=()=>{ const S=smArr(); return S.a>=0&&rows[S.a]?rows[S.a].t:null; };
  /* Đặt mốc mặc định theo SỐ NĂM (0 = tất cả). Nhận thẳng số năm chứ không nhận chỉ số
     trong một mảng: chỉ số thì mỗi lần thêm/bớt một nấc là mọi chỗ gọi lệch đi một bậc mà
     không ai báo. Đặt số năm thì bỏ luôn mốc neo tay — chọn mốc mới là thay mốc cũ. */
  self.neoSoNam=function(v){ if(v!=null){
      v=Math.round(Number(v)||0);
      neoNam=Math.max(0,Math.min(10,v)); neoT=null; smCache.k=''; self.draw(); }
    return {nam:neoNam,ten:tenNam(neoNam)}; };
  /* Trạng thái bộ mốc, cho trang ngoài và bộ kiểm thử đọc. */
  self.mocTrangThai=()=>({nam:neoNam, tay:neoT, mo:mocMo, cho:neoArm});
  /* Nhãn ĐÃ VẼ của ô Mốc và của nút Neo trong bảng. Trả về đúng chuỗi vừa in lên canvas,
     không tính lại: nhãn là thứ duy nhất nói ra trạng thái khi bảng đã đóng, mà tính lại ở
     một chỗ thứ hai thì hai nơi lệch nhau lúc nào không ai biết. */
  self.nhanMoc=()=>{ const m=mocHit.find(o=>o.k==='__moc'); return m?m.ten:null; };
  self.tenNutNeo=()=>{ const m=mocMenu.find(o=>o.k==='neo'); return m?m.ten:null; };
  const fmtSM=v=>{ const p=v*100;
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
    /* Dải "So với chỉ số" cũng phải có mốc TỪ ĐÂY, cùng lý do: từ 27/08/2026 lớp bấm phải
       biết dải nằm ở đâu để phân biệt "bấm trúng dải" với "bấm vào chỗ trống". Một nguồn
       duy nhất — đoạn vẽ dải ở cuối draw() đọc lại hai số này chứ không tự tính. */
    geo.rsTop=rsH?h-22-rsH+4:null; geo.rsBh=rsH?rsH-10:0;
    /* TRỤC PHẢI THỨ HAI cho cặp vốn hoá ↔ chỉ số. Cặp này KHÔNG dùng chung trục với nến:
       trục giá tự khít theo nến đang hiện, dính vào đó là mọi phép neo cứng đều trôi khỏi
       khung (đo được 47,5% số cửa sổ). Có trục riêng thì nến giữ nguyên thang của nến, cặp
       kia giữ nguyên thang của nó — cùng một cơ chế `cfg.phai2` của đồ thị /phantich. */
    /* Trục phải thứ hai chỉ dựng khi có VỐN HOÁ. Đường chỉ số nay dùng trục giá nên bật
       một mình nó thì không cần chừa chỗ. */
    const padR2=ind.vh?62:0;
    const plotW=w-padR-padR2, plotH=h-padT-padB;
    geo.plotW=plotW; geo.plotH=plotH; geo.volTop=h-padB+6;
    let mn=Infinity,mx=-Infinity,vmax=0;
    for(const r of vis){ if(r.l<mn)mn=r.l; if(r.h>mx)mx=r.h; if((r.v||0)>vmax)vmax=r.v||0; }
    if(mx-mn<1e-9) mx=mn+1;
    /* Khối chú thích dài về `k` cố định và "miền neo" của bản 23/08 đã xoá 25/08/2026 cùng
       với chính cơ chế đó. Muốn đọc lại vì sao nó từng tồn tại và vì sao bỏ thì xem mục
       *SỨC MẠNH SO VỚI CHỈ SỐ* trong CLAUDE.md — ở đó có cả số đo của ba lần sai. */

    /* ---- TRỤC PHẢI THỨ HAI — NAY CHỈ CÒN CHO VỐN HOÁ (25/08/2026) --------------------
       Trước đây trục này cõng CẶP vốn hoá ↔ chỉ số, và mọi rắc rối đều từ đó: phải nghĩ ra
       một hằng số `k` để quy chỉ số về đơn vị tỷ đồng, mà `k` thì hoặc nhìn trước, hoặc
       trôi theo số nến đang nạp, hoặc cõng thêm ước số chỉ số (xem khối `smArr`).

       NAY ĐƯỜNG CHỈ SỐ VỀ TRỤC GIÁ, vì `giá(a) × chỉ số(i)/chỉ số(a)` có ĐƠN VỊ ĐỒNG —
       cùng đơn vị với nến, không cần quy đổi gì. Trục phải thứ hai chỉ còn để vẽ VỐN HOÁ,
       và vốn hoá nay là một đường THÔNG TIN đứng riêng, không so với ai, nên thang cứ khít
       chính nó là xong. Không còn `k`, không còn miền neo giao nhau.

       ĐƯỜNG CHỈ SỐ KHÔNG ĐƯỢC NỚI TRỤC GIÁ. Trục giá khít theo nến đang hiện; cho đường chỉ
       số tham gia vào min/max thì mã nào lệch xa (HHV giá ×1,83 khi chỉ số ×3,11) là nến bị
       nén bẹp. Nên nó CHỈ được vẽ, bị cắt ở mép, và số thật thì đọc ở dải dưới — dải là chỗ
       không bao giờ tràn khung. */
    let P2=null;
    if(ind.vh){
      let lo=Infinity,hi=-Infinity,dau=-1,cuoi=-1;
      for(let z=0;z<rows.length;z++){
        const v=rows[z].vh;
        if(!(v>0)) continue;
        if(dau<0) dau=z; cuoi=z;
        const g=Math.log(v); if(g<lo)lo=g; if(g>hi)hi=g;
      }
      if(dau>=0){
        if(!(hi>lo)){ lo-=0.05; hi+=0.05; }
        const pd=(hi-lo)*0.07; lo-=pd; hi+=pd;
        P2={lo:lo,hi:hi,a:dau,b:cuoi,
            y:v=>padT+(hi-Math.log(v))/(hi-lo)*plotH};
      }
    }
    geo.yVH=P2?P2.y:null;      // lớp bấm ngoài draw() dò trúng đường vốn hoá bằng hàm này

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
    /* ---- ĐƯỜNG CHỈ SỐ QUY VỀ MỐC NEO — vẽ trên TRỤC GIÁ (25/08/2026) ----------------
       `giá(a) × chỉ số(i)/chỉ số(a)` có đơn vị ĐỒNG, nên nó dùng thẳng `y()` của nến. Hai
       đường gặp nhau tại phiên neo; sau đó mỗi đường đi theo % của chính nó.
       CẮT Ở MÉP, KHÔNG NỚI TRỤC — xem chú thích ở khối P2. Số thật đọc ở dải dưới. */
    if(ind.idx){
      const S=smArr();
      if(S.a>=0){
        x.save();
        x.beginPath(); x.rect(0,padT,plotW,plotH); x.clip();
        x.strokeStyle=IXCOL(); x.lineWidth=1.8; x.lineJoin='round';
        x.beginPath(); let st=false;
        for(let i=0;i<n;i++){ const v=S.ln[i0+i];
          if(v==null){ st=false; continue; }
          const X=cx(i), yy=y(v); st?x.lineTo(X,yy):x.moveTo(X,yy); st=true; }
        x.stroke(); x.restore(); x.lineWidth=1; x.lineJoin='miter';
        /* MỐC NEO: vạch dọc mảnh + chấm, để thấy ngay hai đường bắt đầu từ đâu. */
        const gi=S.a;
        if(gi>=i0&&gi<i1){
          const X=cx(gi-i0);
          x.save(); x.setLineDash([2,3]); x.strokeStyle=IXCOL()+'88'; x.lineWidth=1;
          x.beginPath(); x.moveTo(X,padT); x.lineTo(X,padT+plotH); x.stroke(); x.restore();
          const yy=y(rows[gi].c);
          if(yy>=padT&&yy<=padT+plotH){
            x.beginPath(); x.arc(X,yy,3.6,0,6.283);
            x.fillStyle=light()?'#ffffff':'#14161c'; x.fill();
            x.beginPath(); x.arc(X,yy,2.4,0,6.283); x.fillStyle=IXCOL(); x.fill();
          }
        }
      }
    }
    /* ---- VỐN HOÁ — đường THÔNG TIN trên trục phải riêng, không so với ai ---------------
       Ngắt nét ở phiên thiếu số chứ đừng nối thẳng qua: vốn hoá chỉ có ở phần kho có, còn
       nến thì tới 13 năm — nối thẳng là bịa ra một đoạn không có dữ liệu. */
    if(P2){
      x.strokeStyle=VHCOL(); x.lineWidth=2.4; x.lineJoin='round';
      x.beginPath(); let st=false;
      for(let i=0;i<n;i++){ const gi=i0+i;
        if(gi<P2.a||gi>P2.b){ st=false; continue; }
        const v=vis[i].vh;
        if(!(v>0)){ st=false; continue; }
        const X=cx(i), yy=P2.y(v); st?x.lineTo(X,yy):x.moveTo(X,yy); st=true; }
      x.stroke(); x.lineWidth=1; x.lineJoin='miter';
      /* TRỤC PHẢI THỨ HAI — 4 nhãn. Thang loga nên nhãn KHÔNG cách đều nhau về giá trị; đó
         là đúng, và cũng là dấu hiệu duy nhất cho biết đây là thang loga. Đơn vị in một lần
         ở đỉnh cột chứ đừng dán vào từng số: cột chỉ rộng 62px. */
      x.font='10px system-ui'; x.textAlign='left'; x.textBaseline='middle';
      x.fillStyle=MUT();
      for(let t=0;t<=3;t++){
        const lv=P2.lo+(P2.hi-P2.lo)*(3-t)/3;
        x.fillText(Math.round(Math.exp(lv)/1e9).toLocaleString('vi-VN'),
                   plotW+padR+4,padT+(P2.hi-lv)/(P2.hi-P2.lo)*plotH);
      }
      x.fillStyle=VHCOL(); x.font='700 9.5px system-ui';
      x.fillText('tỷ',plotW+padR+4,padT-6);
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
    if(P2){ x.fillStyle=VHCOL();
      const t='— Vốn hoá'; x.fillText(t,lx,padT+24); lx+=x.measureText(t).width+10; }
    if(ind.idx){ const S=smArr();
      /* TÊN PHẢI IN NGÀY NEO THẬT. 215/405 mã HOSE lên sàn trước 02/01/2013 nên mốc neo của
         chúng là ngày kho nến bắt đầu, KHÔNG phải ngày chào sàn — ghi "chào sàn" cho tất là
         nói sai với hơn một nửa bảng. */
      x.fillStyle=IXCOL();
      const t='— '+ixTen+(S.a>=0&&rows[S.a]?(' · neo '+ngayNgan(rows[S.a].t)):'');
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
    if(iv!=='i'&&(opt.onInd||rows.some(r=>r&&r.ix>0))) cvNut.push(['rs','So với chỉ số']);
    /* MỘT Ô MỐC DUY NHẤT, MỞ BẢNG CHỌN (user chốt 27/08/2026: *"nên đặt tuỳ chọn neo giá
       vào ô Tất cả trong hình, như vậy sẽ gọn hơn"*). Bản trước để `⚓ Neo` thành ô thứ hai
       trên hàng: hàng này là chỗ chật nhất của cả khung (khổ điện thoại vùng vẽ ~205px) nên
       thêm một ô là hàng xuống hẳn hai dòng. Nút Neo nay nằm TRONG bảng chọn, cạnh `Tất cả`
       — nó vốn là một cách trả lời câu "so từ lúc nào", đúng chỗ của nó.
       NHÃN MANG LUÔN TRẠNG THÁI, vì bảng đóng thì nó là thứ duy nhất còn nói được:
         · đang chờ chọn phiên -> `⚓ Bấm chọn phiên`, ô sáng;
         · đang neo tay        -> `Mốc 05/06/2026`, in NGÀY chứ không in số năm (số năm lúc
           này không có hiệu lực, in ra là nói dối);
         · còn lại            -> `Mốc 7 năm`. */
    if(ind.idx||ind.rs){
      const S0=smArr();
      const nhan=neoArm?'⚓ Bấm chọn phiên'
                :(neoT!=null&&S0.a>=0&&rows[S0.a]?'Mốc '+ngayNgan(rows[S0.a].t)
                 :'Mốc '+tenNam(neoNam));
      cvNut.push(['__moc',nhan,mocMo||neoArm]);
    }
    if(plotH>=150&&cvNut.length){
      x.font='700 10px system-ui'; x.textAlign='left'; x.textBaseline='middle';
      /* XUỐNG HÀNG KHI HẾT CHỖ. Từ khi tách ô neo ra riêng, hàng này có tới năm ô và ở khổ
         điện thoại (vùng vẽ ~310px) thì ô cuối bị cắt cụt hoặc chạy ra ngoài canvas — bấm
         không trúng mà cũng không thấy nó đâu. Thà tốn thêm 22px chiều cao. */
      const bh=17;
      let mx0=8, by=padT+33;
      for(const [mk,ten,batTay] of cvNut){
        const bat=(batTay!=null)?!!batTay:!!ind[mk];
        const bw=x.measureText(ten).width+16;
        if(mx0>8&&mx0+bw>plotW-4){ mx0=8; by+=bh+5; }
        x.fillStyle=bat?(light()?'rgba(15,23,42,.86)':'rgba(233,233,239,.90)')
                       :(light()?'rgba(15,23,42,.07)':'rgba(255,255,255,.10)');
        if(x.roundRect){ x.beginPath(); x.roundRect(mx0,by,bw,bh,9); x.fill(); }
        else x.fillRect(mx0,by,bw,bh);
        x.fillStyle=bat?(light()?'#ffffff':'#0a0a0c'):MUT();
        x.fillText(ten,mx0+8,by+bh/2+0.5);
        mocHit.push({x:mx0,y:by,w:bw,h:bh,k:mk,ten:ten});
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
    /* ---- DẢI "SO VỚI CHỈ SỐ" (user chốt 25/08/2026) ---------------------------------
       Đúng khoảng hở giữa đường giá và đường chỉ số quy về mốc neo, in ra %. Vạch 0 = phiên
       neo, và cũng chính là chỗ hai đường trên vùng giá gặp nhau — một khái niệm, một con
       số, ba chỗ (dải · hai đường · bộ lọc bảng giá) nói cùng một câu.

       VÌ SAO PHẢI CÓ DẢI RIÊNG dù đã vẽ đường chỉ số trên trục giá: trục giá khít theo nến,
       nên khi mã lệch xa chỉ số thì đường chỉ số chạy ra ngoài khung và bị cắt. Dải thì
       thang khít theo CHÍNH khoảng hở nên không bao giờ tràn — số luôn đọc được.

       THANG CỐ ĐỊNH THEO CẢ CHUỖI, không theo khung nhìn (bài học 23/08: lấy min/max của
       `vis` thì kéo ngang một cái là đường đổi hình). */
    if(ind.rs&&rsH){
      const top=geo.rsTop, bh=geo.rsBh, S=smArr();
      const nhan='So với '+ixTen+(S.a>=0&&rows[S.a]?(' — neo '+ngayNgan(rows[S.a].t)):'');
      x.textAlign='left'; x.textBaseline='middle';
      if(S.a<0||S.co<2){
        x.fillStyle=MUT(); x.font='700 10px system-ui'; x.fillText(nhan,8,top+11);
        x.font='11px system-ui';
        x.fillText(S.co?'khoảng này chưa có dữ liệu chỉ số':'đang tải dữ liệu chỉ số…',8,top+bh/2);
      }else{
        /* THANG BẬC THANG THEO KHUNG NHÌN, KHÔNG khít cả chuỗi và cũng KHÔNG khít liên tục.
           User 26/08: *"mỗi lần bấm vào mốc 1 năm - 3 năm - từ đầu là chart bị reset rất khó
           chịu, cần cố định để dễ quan sát nhất"*. Khung nhìn ngang thì KHÔNG hề reset (đo:
           `[2688,3320]` giữ nguyên qua cả ba lần bấm) — thứ nhảy là thang dọc của dải.

           Vì sao thang cả chuỗi hỏng ở đây: `q` chỉ có từ phiên neo trở đi, nên đổi mốc là
           đổi luôn miền giá trị. Chọn "Từ đầu" thì thang phải ôm 13 năm biến động và đoạn
           250 phiên đang xem bị nén thành một vệt — đúng cảm giác "bị reset".

           Vì sao KHÔNG khít liên tục theo khung nhìn (dù MACD của chính chart này làm vậy):
           kéo ngang một chút là thang nhích một chút, đường cứ trườn — user đã bắt lỗi đó
           hồi 23/08 với bản cũ.

           Cách dùng: lấy min/max của ĐOẠN ĐANG XEM rồi NẮN LÊN BẬC THANG gần nhất. Thang chỉ
           đổi khi vượt hẳn một bậc, nên kéo/phóng bình thường thì nó đứng yên; còn đổi mốc
           neo thì nó nhảy đúng một lần sang bậc hợp lý và đoạn đang xem vẫn lấp đầy dải. */
        let mn=Infinity,mx=-Infinity;
        for(let i=0;i<n;i++){ const q=S.q[i0+i]; if(q==null) continue;
          if(q<mn)mn=q; if(q>mx)mx=q; }
        if(!(mx>=mn)){ mn=-0.05; mx=0.05; }
        if(mn>0)mn=0; if(mx<0)mx=0;                     // vạch neo luôn nằm trong khung
        /* Bậc dày một chút ở vùng hay gặp (dưới 100%) để đỡ phí chỗ: đoạn nằm gọn ở
           −43,5%..−29,1% mà bậc gần nhất là 60% thì đường chỉ chiếm một phần tư dải. */
        const BAC=[.05,.075,.10,.15,.20,.30,.40,.50,.75,1,1.5,2,3,5,8,12,20,40,100,250,1000];
        const nan=v=>{ for(const b of BAC) if(v<=b+1e-12) return b; return Math.ceil(v); };
        const lo=mn<0?-nan(-mn):0, hi=mx>0?nan(mx):0;
        if(hi-lo<1e-9){ /* cả đoạn phẳng ở 0 */ }
        const ry=v=>top+(hi-v)/((hi-lo)||1)*bh, y0=ry(0);
        x.beginPath(); let st=false;
        for(let i=0;i<n;i++){ const q=S.q[i0+i]; if(q==null){ st=false; continue; }
          const X=cx(i); st?x.lineTo(X,ry(q)):x.moveTo(X,ry(q)); st=true; }
        if(st){ const xr=cx(Math.max(0,n-1)), xl=cx(0);
          x.lineTo(xr,y0); x.lineTo(xl,y0); x.closePath();
          x.fillStyle=RSCOL()+'1f'; x.fill(); }
        x.save(); x.setLineDash([4,3]); x.strokeStyle=MUT(); x.globalAlpha=.75; x.lineWidth=1;
        x.beginPath(); x.moveTo(0,y0); x.lineTo(plotW,y0); x.stroke(); x.restore();
        x.strokeStyle=RSCOL(); x.lineWidth=1.5; x.beginPath(); st=false;
        for(let i=0;i<n;i++){ const q=S.q[i0+i]; if(q==null){ st=false; continue; }
          const X=cx(i), yy=ry(q); st?x.lineTo(X,yy):x.moveTo(X,yy); st=true; }
        x.stroke(); x.lineWidth=1;
        x.fillStyle=MUT(); x.font='9.5px system-ui';
        x.fillText('neo',plotW+6,y0);
        if(hi>0) x.fillText(fmtSM(hi),plotW+6,ry(hi)+5);
        if(lo<0) x.fillText(fmtSM(lo),plotW+6,ry(lo)-5);
        // MỨC HÔM NAY: phiên cuối CẢ CHUỖI, không phải phiên cuối khung nhìn
        let nay=null;
        for(let z=rows.length-1;z>=0;z--){ if(S.q[z]!=null){ nay=S.q[z]; break; } }
        if(nay!=null&&nay>=lo&&nay<=hi){
          x.fillStyle=RSCOL(); x.fillRect(plotW,ry(nay)-7,padR,14);
          x.fillStyle='#fff'; x.font='700 9.5px system-ui'; x.fillText(fmtSM(nay),plotW+6,ry(nay));
        }
        /* NHÃN CÓ NỀN LÓT — dải chỉ cao 18% chiều cao chart, ở khổ điện thoại là ~45px nên
           đường thường chạy ngay qua chỗ đặt nhãn. */
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
       CHỈ TAM GIÁC, KHÔNG CÒN THANH DỌC (user chốt 27/08/2026: *"nên bỏ thanh dọc khi nhấn
       chuột trên biểu đồ đi"*). Đây là quay về đúng ký hiệu của đồ thị /phantich (mục *MỐC
       PHIÊN LÀ TAM GIÁC*), và đúng lý do đã ghi ngay từ đầu ở chỗ này: một vạch chạy suốt
       chiều cao vùng vẽ thì CẮT NGANG chính dữ liệu đang xem, trong khi hai tam giác nằm
       ngoài rìa vẫn chỉ đúng cột. Bản trước vẽ cả hai — vừa nói vạch dọc là sai vừa vẽ nó.
       Phân biệt với thanh ngắm nay là ở CHỖ ĐỨNG: thanh ngắm là nét đứt chạy theo chuột,
       tam giác thì bám mép trên/mép dưới và đứng yên. */
    const gI=choGhim()?ghimIdx():-1;   // tắt đường phủ thì mốc ghim cũ cũng thôi hiện
    if(gI>=0&&gI>=i0&&gI<i1){
      const X=cx(gI-i0), y0=padT, y1=padT+plotH;
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
      { const S=smArr(), q=S.q[gI];
        if(q!=null) dong.push(['So với '+ixTen,fmtSM(q),RSCOL()]); }
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
            if(rr.vh>0){ const y2=P2.y(rr.vh); if(y2>=by&&y2<=by+bh) dem++; }
          }
        }
        /* Ô CÔNG TẮC CŨNG LÀ VẬT CẢN, và NẶNG HƠN NẾN. Nến bị che thì mất một mẩu thông
           tin đọc được ở chỗ khác; ô bị che thì mất một thứ BẤM ĐƯỢC — người ta không
           thấy nó thì coi như nó không tồn tại. Từ 27/08 hàng ô xuống tới hai dòng nên
           góc trái trên gần như luôn có ô nằm đó. Cân 40 ≈ che mất 40 nến. */
        for(const m of mocHit){
          if(bx<m.x+m.w&&bx+bw>m.x&&by<m.y+m.h&&by+bh>m.y) dem+=40;
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
    /* ---- BẢNG CHỌN SỐ NĂM (mở bằng ô "Mốc") --------------------------------------
       VẼ THẲNG LÊN CANVAS, không dựng thẻ DOM: ô mở nó nằm trong khung đồ thị, mà một lớp
       DOM đặt chồng lên canvas thì phải tự đồng bộ toạ độ với mọi lượt kéo/phóng/đổi khổ
       và với cả chế độ toàn màn hình — đúng thứ `veHopGhim`/`veHopSK` đã chọn tránh.
       VẼ SAU CÙNG: hộp đọc số của phiên đang ghim tự chọn một trong bốn góc, có lúc chọn
       đúng góc trái trên — vẽ bảng trước nó thì bảng bị đè mất một nửa.
       XẾP 5+5+1: một hàng mười ô là ~280px, tràn khổ điện thoại. */
    mocMenu.length=0;
    const oMoc=mocMo?mocHit.find(m=>m.k==='__moc'):null;
    if(oMoc&&plotH>=150){
      const CW=26, CH=19, GAP=4, PAD=6, COT=5;
      const pw=PAD*2+COT*CW+(COT-1)*GAP, ph=PAD*2+CH*3+GAP*2;
      const bx=Math.max(2,Math.min(plotW-pw-2,oMoc.x)), by=oMoc.y+oMoc.h+5;
      x.fillStyle=light()?'rgba(255,255,255,.97)':'rgba(18,18,22,.97)';
      x.strokeStyle=light()?'rgba(15,23,42,.18)':'rgba(255,255,255,.20)'; x.lineWidth=1;
      if(x.roundRect){ x.beginPath(); x.roundRect(bx,by,pw,ph,8); x.fill(); x.stroke(); }
      else { x.fillRect(bx,by,pw,ph); x.strokeRect(bx,by,pw,ph); }
      x.font='700 10px system-ui'; x.textAlign='center'; x.textBaseline='middle';
      const RONG=COT*CW+(COT-1)*GAP, W2=(RONG-GAP)/2;   // hàng ba chia đôi: Tất cả | Neo
      const oVe=(ox,oy,ow,ten,chon)=>{
        x.fillStyle=chon?(light()?'rgba(15,23,42,.86)':'rgba(233,233,239,.90)')
                        :(light()?'rgba(15,23,42,.07)':'rgba(255,255,255,.10)');
        if(x.roundRect){ x.beginPath(); x.roundRect(ox,oy,ow,CH,6); x.fill(); }
        else x.fillRect(ox,oy,ow,CH);
        x.fillStyle=chon?(light()?'#ffffff':'#0a0a0c'):MUT();
        x.fillText(ten,ox+ow/2,oy+CH/2+0.5);
      };
      /* Chỉ sáng khi số năm ĐANG THẬT SỰ có hiệu lực. Neo tay đè lên số năm, nên lúc đó
         không ô năm nào sáng — bằng không bảng nói dối là đang so từ mốc N năm. */
      const sangNam=v=>(neoT==null&&neoNam===v);
      for(let i=0;i<10;i++){
        const v=NEO_CHON[i];
        const ox=bx+PAD+(i%COT)*(CW+GAP), oy=by+PAD+Math.floor(i/COT)*(CH+GAP);
        oVe(ox,oy,CW,String(v),sangNam(v));
        mocMenu.push({x:ox,y:oy,w:CW,h:CH,k:'nam',v:v});
      }
      const y3=by+PAD+2*(CH+GAP);
      oVe(bx+PAD,y3,W2,'Tất cả',sangNam(0));
      mocMenu.push({x:bx+PAD,y:y3,w:W2,h:CH,k:'nam',v:0});
      /* NÚT NEO NẰM CẠNH "TẤT CẢ". Ba trạng thái, nhưng bảng đóng ngay khi vào chế độ chờ
         (nó che mất chính vùng phải bấm) nên `Đang chờ` chỉ hiện nếu trạng thái lỡ chồng
         nhau — vẽ ra cho bảng không bao giờ nói sai, chứ không phải đường đi thường. */
      const tenNeo=neoArm?'⚓ Đang chờ':(neoT!=null?'↺ Bỏ neo':'⚓ Neo');
      const nx=bx+PAD+W2+GAP;
      oVe(nx,y3,W2,tenNeo,neoArm||neoT!=null);
      mocMenu.push({x:nx,y:y3,w:W2,h:CH,k:'neo',ten:tenNeo});
      x.textAlign='left';
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
      ((ind.rs||ind.idx)?(()=>{ const S=smArr(), gi=rows.indexOf(r), q=gi>=0?S.q[gi]:null;
         return q==null?'':it('So với '+ixTen,fmtSM(q),RSCOL()); })():'');
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
  self.vOfY=vOfY; self.tOfX=tOfX; self.yOfV=v=>yOfV(v);
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
    /* BẢNG CHỌN XÉT TRƯỚC vì nó nằm ĐÈ lên vùng vẽ và có thể phủ cả hàng ô. Bấm ra ngoài
       bảng thì đóng bảng và NUỐT luôn cú bấm đó — bằng không một cú bấm vừa đóng bảng vừa
       ghim nhầm một phiên ở ngay dưới. */
    if(mocMo){
      for(const m of mocMenu){
        if(px>=m.x&&px<=m.x+m.w&&py>=m.y&&py<=m.y+m.h){
          mocMo=false;                       // chọn xong là đóng, kể cả khi vào chế độ chờ:
          if(m.k!=='neo'){ self.neoSoNam(m.v); return true; }   // bảng che đúng chỗ phải bấm
          /* Ba trạng thái, một chiều: chờ -> huỷ | đang neo tay -> bỏ neo | còn lại -> chờ.
             Ô sáng ở hai trạng thái đầu, nên luật "đang sáng thì bấm là tắt" vẫn đúng. */
          if(neoArm) neoArm=false;
          else if(neoT!=null){ neoT=null; smCache.k=''; }
          else neoArm=true;
          self.draw(); return true;
        }
      }
      mocMo=false; self.draw(); return true;
    }
    for(const m of mocHit){
      if(px>=m.x&&px<=m.x+m.w&&py>=m.y&&py<=m.y+m.h){
        /* Bấm ô Mốc lúc ĐANG CHỜ thì vừa huỷ chờ vừa mở bảng: người ta quay lại ô này là
           đang muốn đổi mốc, bắt bấm hai lần (một lần huỷ, một lần mở) là thừa. */
        if(m.k==='__moc'){ neoArm=false; mocMo=true; self.draw(); return true; }
        ind[m.k]=!ind[m.k]; self.draw();
        if(opt.onInd) opt.onInd(m.k,ind[m.k]);   // trang ngoài đi nạp kho nếu cần
        return true;
      }
    }
    return false;
  }
  /* ĐANG CHỜ NEO: cú bấm kế tiếp trong vùng vẽ đặt mốc neo rồi thoát chế độ chờ. Nuốt cú
     bấm dù rơi ra ngoài vùng vẽ — người ta bấm để thoát chờ thì phải thoát được, đừng để
     kẹt trong một chế độ không có đường ra. Không đi qua `choGhim()`: bật riêng dải "So với
     chỉ số" (vốn hoá lẫn đường chỉ số đều tắt) thì ô Neo vẫn hiện, nên phải neo được. */
  function bamNeo(px){
    if(!neoArm) return false;
    neoArm=false;
    if(px>=0&&px<=geo.plotW&&rows.length){
      const gi=i0+idxAt(px);
      if(gi>=0&&gi<rows.length){ neoT=rows[gi].t; smCache.k=''; }
    }
    self.draw(); return true;
  }
  /* BẤM (không phải KÉO) trong vùng vẽ -> ghim / bỏ ghim đúng cột đó.
     CHỈ MỞ KHOÁ KHI CÓ ĐƯỜNG/DẢI SO SÁNH. Không có cái nào thì hộp chỉ lặp lại đúng thứ
     dòng chú giải trên đầu đã in sẵn khi rê chuột — mà đổi hành vi của cú bấm trên một
     chart có sẵn bộ công cụ vẽ là chuyện phải có lý do.
     `rs` NAY CŨNG MỞ KHOÁ (27/08/2026). Trước đây loại nó ra vì hộp kéo theo một thanh dọc
     xuyên qua vùng giá chỉ để đọc một con số nằm ở dải dưới. Thanh dọc đã bỏ, và user vừa
     chốt là bấm vào chính dải đó phải hiện hộp — nên lý do cũ hết hiệu lực. */
  const choGhim=()=>!!(ind.vh||ind.idx||ind.rs);
  /* ---- BẤM TRÚNG DỮ LIỆU MỚI GHIM (user chốt 27/08/2026) -----------------------
     *"tôi muốn khi nhấn vào đường giá hoặc nhấn vào khoảng trống là sẽ biến mất; nhấn vào
     đường giá hoặc VN-Index hoặc biểu đồ (so với VN-Index — neo) mới xuất hiện"*.

     Bản trước chỉ xét X: bấm BẤT KỲ đâu trong vùng vẽ là ghim, kể cả khoảng trắng mênh
     mông phía trên/dưới nến. Vùng giá phần lớn là chỗ trống, nên xác suất bung hộp ngoài ý
     muốn cao hơn hẳn xác suất cố tình bấm — và hộp thì che mất chính chỗ đang đọc.

     BA ĐÍCH: đường giá (bật nến thì tính cả thân lẫn bóng), đường chỉ số, đường vốn hoá.
     Cộng thêm CẢ KHUNG của dải "So với chỉ số" — dải là một khung riêng, bấm đâu trong đó
     cũng là đang trỏ vào chính nó, đòi trúng nét trong một dải cao 18% màn hình là bắt bí.
     Dò theo ĐOẠN chứ không theo một điểm: trong bề ngang một cột, đường đi từ giá trị nến
     trước sang nến sau — lấy mỗi giá trị tại cột đó thì đoạn nào dốc là bấm trúng nét vẫn
     báo trượt. */
  const NGUONG_GHIM=8;                 // vừa tay cho cả chuột lẫn ngón, không nuốt chỗ trống
  function trungDuLieu(gi,py){
    if(py==null) return true;          // chỗ gọi không biết y -> giữ nguyên nếp cũ
    if(ind.rs&&geo.rsTop!=null&&py>=geo.rsTop-4&&py<=geo.rsTop+geo.rsBh+4) return true;
    const r=rows[gi]; if(!r) return false;
    const T=NGUONG_GHIM;
    const trong=(a,b)=>py>=Math.min(a,b)-T&&py<=Math.max(a,b)+T;
    const t=rows[gi-1], s=rows[gi+1];
    if(ind.nen){ if(trong(yOfV(r.h),yOfV(r.l))) return true; }
    else{
      const c=[r.c, t?t.c:r.c, s?s.c:r.c];
      if(trong(yOfV(Math.min(...c)),yOfV(Math.max(...c)))) return true;
    }
    if(ind.idx){
      const L=smArr().ln, a=L[gi];
      if(a!=null){
        const v=[a, L[gi-1]!=null?L[gi-1]:a, L[gi+1]!=null?L[gi+1]:a];
        if(trong(yOfV(Math.min(...v)),yOfV(Math.max(...v)))) return true;
      }
    }
    if(ind.vh&&geo.yVH&&r.vh>0){
      const v=[r.vh, (t&&t.vh>0)?t.vh:r.vh, (s&&s.vh>0)?s.vh:r.vh];
      if(trong(geo.yVH(Math.min(...v)),geo.yVH(Math.max(...v)))) return true;
    }
    return false;
  }
  function bamGhim(px,py){
    if(!choGhim()) return false;
    if(!(px>=0&&px<=geo.plotW)||!rows.length) return false;
    /* BẤM TRƯỢT MÀ ĐANG CÓ HỘP -> TẮT HỘP, và nuốt cú bấm. Đây đúng là nửa đầu yêu cầu của
       user: bấm ra khoảng trống là hộp biến mất. Không có hộp thì trả FALSE để cú bấm còn
       đi tiếp được cho việc khác. */
    const tat=()=>{ if(ghimT==null) return false; ghimT=null; self.draw(); return true; };
    const gi=i0+idxAt(px);
    if(gi<0||gi>=rows.length) return tat();      // bấm vào vùng trống tương lai
    if(!trungDuLieu(gi,py)) return tat();
    ghimT=(ghimT===rows[gi].t)?null:rows[gi].t;
    self.draw();
    return true;
  }
  /* Cú bấm (không kéo) trong vùng vẽ: đang chờ neo thì ĐẶT MỐC NEO, còn lại thì ghim
     phiên để đọc số. Một cửa vào duy nhất cho cả chuột lẫn ngón tay. */
  function bamTrongKhung(px,py){ return bamNeo(px)||bamGhim(px,py); }
  /* Cửa vào cho bộ kiểm thử: môi trường giả không phát được sự kiện chuột thật, mà luồng
     neo hai nhịp thì đúng là thứ hỏng im lặng được. Trả về nơi cú bấm rơi vào. */
  self.bamThu=function(px,py){
    if(bamMoc(px,py)) return 'o';
    if(bamTrongKhung(px,py)) return 'khung';
    return '';
  };
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
      const rn=cvs.getBoundingClientRect();
      bamTrongKhung(e.clientX-rn.left, e.clientY-rn.top);
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
    for(const m of mocMenu.concat(mocHit)){
      if(px>=m.x&&px<=m.x+m.w&&py>=m.y&&py<=m.y+m.h){ cvs.style.cursor='pointer'; return; }
    }
    if(px>geo.plotW){ if(hover!==-1){hover=-1; hoverY=-1; self.draw();} return; }
    if(neoArm){ cvs.style.cursor='crosshair'; }   // đang chờ chọn phiên để neo
    if(!tool&&draws.length) cvs.style.cursor=hitTest(px,py)?'move':'';   // rê trúng hình -> báo kéo được
    const i=idxAt(px);
    /* Đường ngang phải BÁM ĐÚNG CHUỘT, không hít vào giá đóng cửa của nến. Nên vẽ lại
       cả khi chỉ đổi Y (rê dọc trong cùng một nến) — trước chỉ vẽ khi đổi nến. */
    if(i!==hover||Math.abs(py-hoverY)>0.5){ hover=i; hoverY=py; self.draw(); }
  });
  cvs.addEventListener('mouseleave',()=>{ if(hover!==-1||skHover!==-1){ hover=-1; hoverY=-1; skHover=-1; self.draw(); } });
  /* Trang gọi khi bấm Esc: đang vẽ dở thì huỷ nét vẽ và trả TRUE, để Esc đó
     không đóng luôn cửa sổ toàn màn hình. */
  self.cancelTool=function(){
    /* Esc cũng phải thoát được chế độ chờ neo và đóng bảng chọn — cả hai đều là "đang dở
       một thao tác", đúng nghĩa của phím này, và phải xét TRƯỚC nét vẽ đang dở. */
    if(neoArm||mocMo){ neoArm=false; mocMo=false; self.draw(); return true; }
    if(!pending&&!tool) return false; cancelDraw(); return true; };
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
     hoạt vẽ lại (lúc đó là `nenArr` chạy O(n·W) trên 3.400 nến), máy chậm thì lượt vẽ nuốt trọn cửa
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
    { const rn=cvs.getBoundingClientRect();
      bamTrongKhung(t.clientX-rn.left, t.clientY-rn.top); }
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
