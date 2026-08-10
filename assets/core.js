/* ============================================================================
   CPVN core.js — lõi dữ liệu dùng chung cho trang Bảng giá + trang Chi tiết mã.
   Nguyên tắc: API sống trước, KHO trong repo là lưới an toàn — mọi hàm đều có
   fallback để "không bao giờ lỗi khi gặp sự cố". Thêm ?offline vào URL để ép
   chạy 100% từ kho. Trang bong bóng (bubbles.html) độc lập, không dùng file này.
   ========================================================================== */
'use strict';
const CP={};
(function(){
const BG='https://bgapidatafeed.vps.com.vn';
const HIST='https://histdatafeed.vps.com.vn/tradingview/history';
CP.OFFLINE=/[?&]offline/.test(location.search);

/* ---------- tiện ích định dạng (chuẩn hiển thị Việt Nam) ------------------- */
CP.fmtD=n=>n==null||isNaN(n)?'—':Math.round(n).toLocaleString('en-US');
CP.fmtVnd=function(n){ if(n==null||isNaN(n)||n===0)return '—';
  // MỘT ĐƠN VỊ DUY NHẤT "tỷ" cho toàn site: viết hẳn số ra (1,100 tỷ) thay vì đổi bậc
  // (1.1 nghìn tỷ) — gọn hơn, và cả cột cùng đơn vị nên so sánh bằng mắt là ra ngay.
  const v=n/1e9, a=Math.abs(v);
  return v.toLocaleString('en-US',{maximumFractionDigits:a>=100?0:a>=1?1:2})+' tỷ'; };
CP.fmtShares=function(n){ if(!n)return '—';
  if(n>=1e9) return (n/1e9).toFixed(2)+' tỷ cp';
  if(n>=1e6) return (n/1e6).toFixed(1)+' tr cp';
  return CP.fmtD(n)+' cp'; };
CP.pcTxt=v=>v==null||isNaN(v)?'—':(v>=0?'+':'')+(+v).toFixed(2)+'%';
CP.pcCol=v=>v==null||isNaN(v)?'var(--muted)':Math.abs(v)<0.005?'var(--yellow)':v>0?'var(--green)':'var(--red)';
CP.timeAgo=function(ts){ const s=(Date.now()-ts)/1000;
  if(s<3600) return Math.max(1,Math.round(s/60))+' phút trước';
  if(s<86400) return Math.round(s/3600)+' giờ trước';
  return Math.round(s/86400)+' ngày trước'; };
CP.esc=s=>String(s||'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));

/* ---------- LOGO: KHO trong repo trước, CDN nguồn chỉ là lưới an toàn -------
   assets/logo/{MÃ}.webp (96px, ~1.6KB, cache 1 năm — xem _headers). Nguồn ngoài
   có sập/đổi đường dẫn thì web vẫn đủ logo. Chuỗi dự phòng: kho -> CDN -> chữ tắt. */
CP.logoSrc=sym=>`/assets/logo/${encodeURIComponent(sym)}.webp`;
CP.logoHTML=function(sym,cdn,lazy){
  return `<img src="${CP.logoSrc(sym)}"${lazy===false?'':' loading="lazy"'} alt="${CP.esc(sym)}"`+
    ` data-sym="${CP.esc(sym)}"${cdn?` data-cdn="${CP.esc(cdn)}"`:''} onerror="CP.logoErr(this)">`;
};
CP.logoErr=function(el){
  const cdn=el.getAttribute('data-cdn');
  if(cdn){ el.removeAttribute('data-cdn'); el.src=cdn; return; }
  const s=el.getAttribute('data-sym')||'';
  el.outerHTML=`<span class="noimg">${CP.esc(s.slice(0,2))}</span>`;
};
/* màu 1D chuẩn bảng điện: trần tím / sàn lơ / tăng xanh / giảm đỏ / TC vàng */
CP.col1d=function(c){
  if(c.ceil>0&&c.price>0&&c.price>=c.ceil) return 'var(--purple)';
  if(c.flr>0&&c.price>0&&c.price<=c.flr)  return 'var(--cyan)';
  return CP.pcCol(c.chg1d);
};

/* ---------- CHÚ GIẢI DẠNG BONG BÓNG (dùng chung cả trang) ------------------
   KHÔNG dùng thuộc tính `title` của trình duyệt: nó chờ gần một giây mới hiện, chữ bé
   tí, không theo giao diện sáng/tối, và trên máy cảm ứng thì KHÔNG BAO GIỜ hiện. Ở đây
   tự vẽ một bong bóng dùng chung, bám theo phần tử mang `data-tip`.
   Tự nhét luôn CSS để chỉ phải khai một chỗ — trang nào nạp core.js là có. */
CP.tips=function(){
  if(CP._tip) return;
  const st=document.createElement('style');
  st.textContent='.cptip{position:absolute;z-index:9999;max-width:290px;padding:8px 11px;'
    +'border-radius:10px;background:#26324c;color:#fff;font-size:12.5px;line-height:1.45;'
    /* KHÔNG hiệu ứng mờ dần: đổi display rồi thêm class trong CÙNG một nhịp thì
       transition không chạy, bong bóng đứng nguyên opacity 0 — hiện ngay cho chắc */
    +'font-weight:600;box-shadow:0 12px 32px rgba(0,0,0,.3);pointer-events:none}'
    +'.cptip::after{content:"";position:absolute;left:var(--ax,50%);margin-left:-7px;'
    +'border:7px solid transparent;border-top-color:#26324c;top:100%}'
    +'.cptip.duoi::after{top:auto;bottom:100%;border-top-color:transparent;border-bottom-color:#26324c}'
    /* con trỏ THEO THẺ CHA: hàng bấm được thì vẫn là bàn tay, chỗ khác là mũi tên thường.
       Dấu hỏi chấm của `cursor:help` trông như báo lỗi hơn là mời rê vào. */
    +'[data-tip]{cursor:inherit}';
  document.head.appendChild(st);
  const el=document.createElement('div'); el.className='cptip'; el.style.display='none';
  document.body.appendChild(el); CP._tip=el;
  let cur=null;
  const an=()=>{ el.style.display='none'; cur=null; };
  const hien=t=>{
    const s2=t.getAttribute('data-tip'); if(!s2) return;
    el.textContent=s2; el.style.display=''; el.style.left='0px'; el.style.top='0px';
    const r=t.getBoundingClientRect(), b=el.getBoundingClientRect();
    /* GHÌM TRONG KHUNG NHÌN: nhãn sát mép phải mà thả bong bóng canh giữa là nó tràn ra
       ngoài màn, đọc mất nửa câu. Mũi tên bù lại phần đã ghì để vẫn chỉ đúng nhãn. */
    let x=Math.max(8,Math.min(r.left+r.width/2-b.width/2,innerWidth-b.width-8));
    let y=r.top-b.height-11, duoi=false;
    if(y<6){ y=r.bottom+11; duoi=true; }
    el.style.left=Math.round(x)+'px'; el.style.top=Math.round(y+scrollY)+'px';
    el.classList.toggle('duoi',duoi);
    el.style.setProperty('--ax',Math.round(Math.max(12,Math.min(r.left+r.width/2-x,b.width-12)))+'px');
    cur=t;
  };
  document.addEventListener('mouseover',e=>{ const t=e.target.closest('[data-tip]');
    if(t){ if(t!==cur) hien(t); } else if(cur) an(); });
  /* máy cảm ứng không có chuột: chạm vào nhãn là hiện, chạm chỗ khác thì tắt */
  document.addEventListener('click',e=>{ const t=e.target.closest('[data-tip]');
    if(t) hien(t); else an(); });
  addEventListener('scroll',an,true); addEventListener('resize',an);
};

/* ---------- trạng thái dữ liệu -------------------------------------------- */
CP.coins=new Map();          // sym -> bản ghi đầy đủ
CP.vn30=new Set(); CP.hnx30=new Set();
CP.indices=[]; CP.eodDate=null; CP.spark={}; CP.health=null; CP.nhom=[];
/* tra nhóm theo dõi theo mã lọc: 'nhom:<id>' -> đối tượng nhóm, không khớp thì null */
CP.nhomTheoKhoa=k=>(CP.nhom||[]).find(g=>'nhom:'+g.id===k)||null;
CP.lastPollAt=0; CP.liveOk=false;

/* ---------- nạp nền tảng: universe + snapshot + spark (tất cả từ kho) ------ */
CP.loadBase=async function(){
  const [u,eod,sp,he]=await Promise.all([
    fetch('universe.json').then(r=>r.json()),
    fetch('data/eod/latest.json').then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('data/spark.json').then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('data/health.json').then(r=>r.ok?r.json():null).catch(()=>null),
  ]);
  for(const s of u.stocks){
    CP.coins.set(s.sym,{
      sym:s.sym, ex:s.ex, name:s.name, shares:s.shares||null, mcap:s.mcap||null,
      sector:s.sector||'Khác', parent:s.parent||null, img:s.img||null, pe:s.pe??null, pb:s.pb??null,
      anc:s.anc||null, pct:s.pct||null, divY:s.divY??null,
      // chỉ số cơ bản rút từ kho tài chính (refresh_daily bước 6b) — tự cập nhật mỗi phiên
      eps:s.eps??null, cash:s.cash??null, cashQ:s.cashQ||null, np:s.np??null, npY:s.npY||null,
      price:0, ref:0, ceil:0, flr:0, chg1d:null, vol:0, gtgd:0, traded:false,
      high:0, low:0, fbuy:0, fsell:0, mcapLive:s.mcap||null, o:0,
    });
  }
  CP.consolidateSectors();     // gộp ngành GIỐNG HỆT trang bong bóng -> cả site chung 1 cách chia
  CP.vn30=new Set(u.vn30||[]); CP.hnx30=new Set(u.hnx30||[]);
  /* NHÓM THEO DÕI (universe.json -> "nhom"): rổ mã chọn tay, KHÔNG phải ngành thật.
     Mã vẫn giữ nguyên ngành gốc — nếu bốc chúng ra khỏi ngành thì mọi thống kê theo
     ngành (bong bóng, ngành hôm nay, đường đua ngành) đều méo. Đây chỉ là một lối lọc
     nữa. Nhóm rỗng thì coi như không có, khỏi hiện một mục 0 mã. */
  CP.nhom=(u.nhom||[]).filter(g=>g&&g.ten&&(g.syms||[]).length)
                      .map(g=>({...g,set:new Set(g.syms)}));
  if(eod&&eod.data){
    CP.eodDate=eod.date; CP.indices=eod.indices||[];
    for(const r of eod.data){
      const c=CP.coins.get(r.sym); if(!c) continue;
      c.price=r.close||0; c.ref=r.ref||0; c.ceil=r.ceil||0; c.flr=r.floor||0;
      c.vol=r.vol||0; c.gtgd=r.gtgd||0; c.high=r.h||0; c.low=r.l||0; c.o=r.o||0;
      c.fbuy=r.fBuy||0; c.fsell=r.fSell||0; c.traded=(r.vol||0)>0;
      // KHỐI NGOẠI: cả hai đều tính bằng CỔ PHIẾU. fTotal = TRẦN room (nguồn VNDirect,
      // VPS không có) -> có nó mới suy được "đang sở hữu = trần − còn lại".
      if(r.fRoom!=null) c.froom=r.fRoom;
      if(r.fTotal!=null) c.fcap=r.fTotal;
      /* nt = CHƯA KHỚP LỆNH phiên này (giá là giá khớp cuối cùng của một phiên cũ).
         KHÔNG được lấy giá cũ trừ tham chiếu hôm nay ra % — đó là biến động chưa từng
         xảy ra. Cũng không được tô nhãn trần/sàn cho một mã đứng im. */
      c.nt=!!r.nt;
      c.chg1d=(!c.nt&&c.ref>0&&c.price>0)?(c.price-c.ref)/c.ref*100:null;
      c.mcapLive=c.shares?c.shares*c.price:(c.mcap||null);
    }
  }
  if(sp&&sp.d) CP.spark=sp.d;
  CP.health=he;
  CP.applyLive();     // bản đệm trong phiên (nếu có, cùng ngày) đè lên snapshot hôm trước
  return u;
};

/* ---------- GỘP NGÀNH: dùng CHUNG một cách chia với trang bong bóng ---------
   (1) hợp nhất các nhánh vụn về nhóm cha; (2) ngành dưới 4 mã dồn về "Khác" cho bớt
   phân mảnh. Giữ y hệt bubbles.html để bấm cùng một tên ngành ở bất kỳ trang nào
   cũng ra đúng bấy nhiêu mã. */
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
CP.consolidateSectors=function(){
  for(const c of CP.coins.values()) c.sector=SECTOR_EXPLICIT[c.sector]||c.sector||'Khác';
  const cnt={}; for(const c of CP.coins.values()) cnt[c.sector]=(cnt[c.sector]||0)+1;
  for(const c of CP.coins.values()) if(cnt[c.sector]<4) c.sector='Khác';
};

/* ---------- bảng giá trực tiếp VPS (poll 5 phút trong phiên) --------------- */
const vnNow=()=>new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Ho_Chi_Minh'}));
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
CP.sessionOpen=function(){
  const vn=vnNow();
  const d=vn.getDay(), m=vn.getHours()*60+vn.getMinutes();
  return d>=1&&d<=5&&m>=540&&m<900;
};
/* NGÀY PHIÊN GẦN NHẤT ĐÃ ĐÓNG SỔ. Sau 15h05 ngày giao dịch thì chính là hôm nay,
   còn lại lùi về ngày giao dịch trước (bỏ thứ 7, chủ nhật).
   Dùng để biết khi nào giá đã CHỐT CỨNG — không thể đổi nữa nên khỏi gọi mạng.

   LỊCH KHÔNG BIẾT NGÀY LỄ. Tết, 30/4, 2/9... rơi vào T2-T6 thì lịch vẫn tưởng là
   phiên. Nên khi ĐÃ CÓ BẰNG CHỨNG THẬT rằng hôm nay không có mã nào khớp lệnh
   (CP.nghiHomNay, đặt lúc quét thấy bảng trống trong giờ giao dịch) thì lùi tiếp. */
CP.lastSessionDate=function(){
  const vn=vnNow(), m=vn.getHours()*60+vn.getMinutes();
  const d=new Date(vn);
  const nghi=CP.nghiHomNay===ymd(vn);
  // mốc 900 = 15:00, KHỚP với lúc sessionOpen() tắt. Trước đây để 905 nên có khe
  // 15:00-15:05 hàm này còn trả về phiên HÔM QUA trong khi phiên hôm nay đã đóng
  // -> pricesFinal() tưởng xong, tắt sạch mạng, người mở trang lúc 15:02 thấy số hôm qua.
  if(nghi||!(d.getDay()>=1&&d.getDay()<=5&&m>=900)) d.setDate(d.getDate()-1);
  while(d.getDay()===0||d.getDay()===6) d.setDate(d.getDate()-1);
  return ymd(d);
};
/* Giá đang giữ đã là giá CHỐT của phiên gần nhất -> khỏi hỏi mạng thêm lần nào. */
CP.pricesFinal=function(){
  if(CP.sessionOpen()) return false;
  const vn=vnNow(), m=vn.getHours()*60+vn.getMinutes(), t=vn.getDay()>=1&&vn.getDay()<=5;
  // 15:00-15:05 bảng còn đang chốt (ATC/thoả thuận) -> chưa được coi là xong, cứ hỏi tiếp
  if(t&&m>=900&&m<905) return false;
  // bảng giá KHÔNG có mã nào giao dịch (nghỉ lễ, hoặc đêm bảng đã reset): nguồn không
  // còn gì mới để cho nữa -> số đang giữ chính là số cuối cùng, đừng hỏi lại mỗi phút
  if(CP.boardIdle) return true;
  const s=CP.lastSessionDate();
  return CP.eodDate===s||CP.liveSess===s;
};
let polling=false, inflight=null;
CP.lastFullAt=0;
/* only = mảng mã cần làm mới NHANH (những mã người dùng đang nhìn); bỏ trống = quét cả thị trường.
   Đang có lượt chạy thì TRẢ VỀ CHÍNH LƯỢT ĐÓ (trước đây trả false rồi thôi — ai gọi trúng
   lúc bận sẽ không bao giờ được báo kết quả, màn hình đứng số cũ). */
CP.pollBoard=function(only){
  if(CP.OFFLINE) return Promise.resolve(false);
  if(polling&&inflight) return inflight;
  polling=true;
  inflight=doPoll(only).finally(()=>{ polling=false; });
  return inflight;
};
async function doPoll(only){
  try{
    const syms=(only&&only.length)?only.filter(s=>CP.coins.has(s)):[...CP.coins.keys()];
    /* CÁC LƯỢT CHẠY SONG SONG. Trước đây chờ nhau nối đuôi: quét cả thị trường
       mất ~2,8 giây, đúng bằng khoảng thời gian giá "loé số cũ" khi mới mở trang. */
    const parts=[];
    for(let i=0;i<syms.length;i+=150) parts.push(syms.slice(i,i+150));
    const rows=(await Promise.all(parts.map(p=>
      fetch(BG+'/getliststockdata/'+p.join(',')).then(r=>r.json()).catch(()=>[])
    ))).flat().filter(Boolean);
    if(!rows.length) throw new Error('bảng giá rỗng');
    /* đêm reset bảng: VPS trả 0 cả thị trường -> chỉ nhận TC/trần/sàn, giữ số phiên gần nhất.
       Lượt nhỏ (1 mã) không xét được tỷ lệ nên thêm điều kiện: KHÔNG mã nào có giao dịch. */
    const active=rows.filter(t=>((+t.lastPrice||0)>0)||((+t.lot||0)>0)).length;
    const boardEmpty=active===0||(rows.length>50&&active<rows.length*0.1);
    /* BẢNG ĐỨNG YÊN: quét ĐỦ cả thị trường mà không mã nào khớp lệnh. Xảy ra khi
       nghỉ lễ, hoặc đêm/rạng sáng khi VPS đã reset bảng. Nguồn không còn gì mới để
       cho -> đánh dấu, để pricesFinal() biết đường dừng thay vì hỏi lại mỗi phút
       suốt cả kỳ nghỉ Tết (kỳ nghỉ dài hơn 1 ngày thì lịch không bắc cầu qua được). */
    if(!(only&&only.length)&&rows.length>50){
      CP.boardIdle=boardEmpty;
      // giữa giờ giao dịch mà bảng trống -> hôm nay thị trường không mở
      if(boardEmpty&&CP.sessionOpen()){
        const vn=vnNow();
        if(vn.getHours()*60+vn.getMinutes()>=600) CP.nghiHomNay=ymd(vn);  // sau 10:00 mới dám kết luận
      }
    }
    for(const t of rows){
      const c=CP.coins.get(t.sym); if(!c) continue;
      c.ref=(+t.r||0)*1000; c.ceil=(+t.c||0)*1000; c.flr=(+t.f||0)*1000;
      if(boardEmpty) continue;
      const last=(+t.lastPrice||0)*1000;
      c.vol=(+t.lot||0)*10;
      c.traded=last>0&&c.vol>0;
      if(last>0) c.price=last; else if(!c.price) c.price=c.ref;
      const ave=(parseFloat(t.avePrice)||0)*1000;
      if(ave&&c.vol) c.gtgd=ave*c.vol;
      c.high=(parseFloat(t.highPrice)||0)*1000||c.high;
      c.low=(parseFloat(t.lowPrice)||0)*1000||c.low;
      c.fbuy=(parseFloat(t.fBVol)||0)*10; c.fsell=(parseFloat(t.fSVolume)||0)*10;
      // fRoom của VPS tính theo LÔ 10 CỔ PHIẾU y như fBVol/fSVolume — đối chiếu
      // currentRoom của VNDirect ra đúng hệ số 10,0 ở cả 4 mã thử. Quên nhân 10 là
      // room nhỏ đi 10 lần (HPG 2,7% thay vì 27,3%). Nhận cả số 0 = KỊCH TRẦN.
      const fr=parseFloat(t.fRoom); if(!isNaN(fr)&&fr>=0) c.froom=fr*10;
      // vừa có lệnh khớp -> mã hết "đứng im", % lại tính được bình thường
      if(last>0) c.nt=false;
      c.chg1d=(!c.nt&&c.ref>0&&c.price>0)?(c.price-c.ref)/c.ref*100:(c.nt?null:c.chg1d);
      c.mcapLive=c.shares?c.shares*c.price:(c.mcap||null);
    }
    CP.lastPollAt=Date.now(); CP.liveOk=true;
    if(!(only&&only.length)){
      CP.lastFullAt=CP.lastPollAt;
      /* CHỈ lượt quét ĐỦ CẢ THỊ TRƯỜNG mới được đóng dấu phiên. Lượt hâm nóng vài
         chục mã mà đóng dấu thì hệ coi như đã xong, bỏ luôn lượt quét đủ -> thống
         kê thiếu mã và bộ đệm không bao giờ được ghi. */
      if(!boardEmpty) CP.liveSess=CP.sessionOpen()?CP.dayVN():CP.lastSessionDate();
    }
    /* Ghi đệm sau MỌI lượt (kể cả lượt nhỏ 1 phút): F5 giữa phiên là có ngay đúng
       những con số vừa nhìn thấy, không phải số cũ 5 phút trước.
       An toàn vì cái quyết định "đã chốt cứng" là CP.liveSess, mà liveSess chỉ được
       đóng dấu sau lượt quét ĐỦ (xem ngay trên) — lượt nhỏ không tự phong mình. */
    if(!boardEmpty) CP.saveLive();
    return true;
  }catch(e){ CP.liveOk=false; return false; }
}
/* Đệm còn TƯƠI trong vòng `giay` giây gần đây hay không. */
CP.buffFresh=function(giay){
  return !!CP.liveAt && (Date.now()-CP.liveAt)/1000 <= (giay||120);
};
/* Hâm nóng giá cho MẤY MÃ SẮP VẼ, chờ tối đa ms rồi vẽ dù xong hay chưa.
   Nếu quá hạn, lượt gọi vẫn chạy tiếp và startPolling nhận chung kết quả đó.

   BỎ QUA khi không cần, để trang hiện ra TỨC THÌ:
   · đã chốt cứng phiên gần nhất -> số không thể đổi
   · đang trong phiên mà đệm mới ghi dưới 2 phút -> vẽ đúng những con số người dùng
     vừa nhìn thấy trước khi F5. Chờ mạng rồi vẽ số mới toanh mới là cái gây cảm giác
     "nhảy giá": màn hình vừa tải lại đã khác màn hình lúc nãy. Cứ vẽ số cũ trước,
     nhịp poll ngay sau đó sẽ đổi tại chỗ đúng như khi ngồi xem mà không F5. */
CP.warmPrices=function(syms,ms){
  if(CP.OFFLINE||!syms||!syms.length) return Promise.resolve(false);
  if(CP.pricesFinal()) return Promise.resolve(false);
  if(CP.sessionOpen()&&CP.buffFresh(120)) return Promise.resolve(false);
  return Promise.race([CP.pollBoard(syms), new Promise(r=>setTimeout(()=>r(false),ms||800))]);
};
/* BỘ NHỚ GIÁ SỐNG DÙNG CHUNG (sessionStorage 'cpvn_live'): trang nào poll xong cũng ghi,
   trang khác mở ra là CÓ NGAY số sống gần nhất — không phải chờ mạng, không lóe số cũ. */
CP.dayVN=()=>new Date(Date.now()+7*3600e3).toISOString().slice(0,10);
CP.saveLive=function(){
  /* Ghi cả NGOÀI GIỜ. Trước đây chỉ ghi trong 9-15h, nên buổi tối mở trang là
     không có đệm -> luôn loé giá đóng cửa HÔM TRƯỚC rồi mới nhảy. */
  try{
    const d={};
    for(const c of CP.coins.values()){
      if(!(c.price>0)) continue;
      d[c.sym]=[c.price,c.ref,c.vol,Math.round(c.gtgd),c.fbuy,c.fsell,c.high,c.low,c.ceil,c.flr];
    }
    /* sess = phiên của số này · at = lúc ghi (để biết đệm còn tươi không)
       final = ĐÃ CHỐT CỨNG: ngoài giờ VÀ đã có lượt quét đủ sau khi đóng cửa.
       Không lấy !sessionOpen() làm final: lượt lúc 15:02 cũng ngoài giờ nhưng bảng
       chưa chốt xong, đóng dấu cứng lúc đó là đóng nhầm số dở dang. */
    localStorage.setItem('cpvn_live',JSON.stringify({at:Date.now(),
      sess:CP.liveSess||CP.dayVN(),
      final:!CP.sessionOpen()&&CP.liveSess===CP.lastSessionDate(),
      idx:(CP.indices||[]).map(i=>[i.name,i.value,i.chg,i.gtgd||0,i.vol||0]), d}));
  }catch(e){}
};
/* áp BẢN ĐỆM lên coins khi nó MỚI HƠN kho EOD. Sau 15h15 server đẩy kho ngày
   mới -> kho chính thức THẮNG, bản đệm bị bỏ qua.
   So theo NGÀY PHIÊN chứ không bắt phải đúng hôm nay: sáng sớm hôm sau mà kho
   còn trễ một phiên thì đệm chiều qua vẫn sát hơn giá đóng cửa hôm kia. */
CP.applyLive=function(){
  try{
    const j=JSON.parse(localStorage.getItem('cpvn_live')||'null');
    if(!j||!j.d||!j.sess) return false;
    if(j.sess>CP.dayVN()) return false;                // đệm ở tương lai -> hỏng, bỏ
    if(!(j.sess>(CP.eodDate||''))) return false;       // kho đã bằng hoặc mới hơn -> kho thắng
    /* ĐẾM TRƯỚC rồi mới ghi đè. Trước đây kiểm tra n<100 SAU vòng lặp: đệm thiếu mã
       thì hàm báo thất bại nhưng coins đã bị trộn nửa số sống nửa số kho. */
    let n=0;
    for(const sym in j.d){ const c=CP.coins.get(sym);
      if(c&&j.d[sym]&&j.d[sym][0]>0) n++; }
    if(n<100) return false;
    for(const sym in j.d){
      const c=CP.coins.get(sym); if(!c) continue;
      const [last,ref,vol,gtgd,fb,fs,hi,lo,ce,fl]=j.d[sym];
      if(!(last>0)) continue;
      c.price=last; if(ref>0) c.ref=ref;
      c.vol=vol||0; c.gtgd=gtgd||0; c.fbuy=fb||0; c.fsell=fs||0;
      if(hi) c.high=hi; if(lo) c.low=lo; if(ce) c.ceil=ce; if(fl) c.flr=fl;
      c.traded=last>0&&(vol||0)>0;
      c.chg1d=c.ref>0?(last-c.ref)/c.ref*100:c.chg1d;
      c.mcapLive=c.shares?c.shares*last:c.mcapLive;
    }
    if(j.idx&&j.idx.length) CP.indices=j.idx.map(x=>({name:x[0],value:x[1],chg:x[2],gtgd:x[3]||0,vol:x[4]||0}));
    CP.lastPollAt=j.at;                                // nhịp hiển thị nối tiếp từ bản đệm
    CP.liveAt=j.at;                                    // đệm ghi lúc nào -> biết còn tươi không
    if(j.final) CP.liveSess=j.sess;                    // bản CHỐT CỨNG -> khỏi gọi mạng nữa
    return true;
  }catch(e){ return false; }
};

/* NHỊP CẬP NHẬT (9–15h T2–T6):
   · mỗi 1 PHÚT: làm mới mã ĐANG HIỂN THỊ trên màn hình — 1 lượt gọi, giá nhảy gần như trực tiếp
   · mỗi 5 PHÚT: quét TOÀN BỘ thị trường (xếp hạng/lọc/thống kê luôn đúng)
   Chia 2 tầng để không nện nguồn dữ liệu 11 lượt gọi mỗi phút -> tránh bị chặn IP.
   Tab ẩn thì NGỪNG hẳn, quay lại tab là làm mới ngay.
   NGOÀI GIỜ: hỏi lại mỗi 1 PHÚT cho tới khi chốt được phiên gần nhất, chốt xong thì
   NGỪNG HẲN — không phải "30 phút/lần" như ghi chú cũ, giá đã cứng thì hỏi thêm vô nghĩa.
   Ngày nghỉ lễ (trong giờ mà bảng trống trơn): giãn còn 5 phút/lần. */
CP.startPolling=function(onUpdate,visibleSyms){
  const tick=async(fast)=>{
    const only=fast&&typeof visibleSyms==='function'?visibleSyms():null;
    if(await CP.pollBoard(only)&&onUpdate) onUpdate();
  };
  /* LƯỢT ĐẦU chỉ lấy mã ĐANG HIỆN trên màn hình: 1 lượt mạng (~30ms) thay vì
     quét cả 1.500 mã (~1,4 giây) -> giá đúng gần như ngay, hết cảnh loé số cũ.
     Quét toàn bộ đẩy lùi lại chút, chạy ngầm cho thống kê và xếp hạng.
     Nhưng nếu giá ĐÃ CHỐT CỨNG phiên gần nhất thì khỏi gọi mạng lượt nào. */
  if(!CP.pricesFinal()){
    // vừa hâm nóng xong thì khỏi lấy lại mấy mã đó, đi thẳng tới lượt quét đủ
    const vuaLay=Date.now()-CP.lastPollAt<3000;
    (vuaLay?Promise.resolve():tick(true)).then(()=>setTimeout(()=>tick(false),300));
  }
  setInterval(()=>{
    if(document.hidden) return;
    const now=Date.now();
    if(!CP.sessionOpen()){
      /* NGOÀI GIỜ: giá không thể đổi nữa. Chốt được rồi thì NGỪNG HẲN; chưa chốt
         (vừa đóng cửa, hoặc mở trang lúc chưa có số) thì hỏi lại mỗi phút cho tới khi chốt. */
      if(!CP.pricesFinal()&&now-CP.lastPollAt>=60000) tick(false);
      return;
    }
    // trong giờ mà bảng trống trơn (ngày nghỉ lễ) -> giãn ra 5 phút/lần, đừng nện 1 phút
    if(CP.boardIdle){ if(now-CP.lastPollAt>=300000) tick(false); return; }
    if(now-CP.lastFullAt>=300000) tick(false);
    else if(now-CP.lastPollAt>=60000) tick(true);
  },5000);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&CP.sessionOpen()&&Date.now()-CP.lastPollAt>=60000) tick(true);
  });
};

/* ---------- chỉ số VNINDEX/VN30/HNX/UPCOM (sống -> kho) -------------------- */
CP.loadIndices=async function(){
  if(!CP.OFFLINE) try{
    const IDX=[['10','VNINDEX'],['11','VN30'],['02','HNX'],['03','UPCOM']];
    const arr=await fetch(BG+'/getlistindexdetail/'+IDX.map(x=>x[0]).join(',')).then(r=>r.json());
    const nameOf=Object.fromEntries(IDX);
    const cu=Object.fromEntries((CP.indices||[]).map(d=>[d.name,d]));
    const out=(arr||[]).filter(Boolean).map(x=>{
      const v=+x.cIndex||0, ref=+x.oIndex||0, nm=nameOf[x.mc]||x.mc;
      /* THANH KHOẢN CẢ SÀN do VPS trả sẵn (`value` = triệu đồng) — gồm cả thoả thuận,
         khác hẳn tổng gtgd từng mã (chỉ khớp lệnh). Đầu phiên mới `value` về 0 trong khi
         chỉ số vẫn là giá đóng cửa cũ: lúc đó giữ số phiên trước, đừng hiện 0 tỷ. */
      const g=(+x.value||0)*1e6;
      return {name:nm, value:v, chg:ref?(v-ref)/ref*100:0,
              gtgd:g>0?g:((cu[nm]||{}).gtgd||0), vol:+x.vol||((cu[nm]||{}).vol||0)};
    }).filter(d=>d.value>0);
    // đêm reset: mọi chỉ số +0.00% giả -> giữ % PHIÊN GẦN NHẤT từ kho
    if(out.length&&!CP.sessionOpen()&&out.every(d=>Math.abs(d.chg||0)<0.005)
       &&CP.indices&&CP.indices.length) return CP.indices;
    if(out.length){ CP.indices=out; return out; }
  }catch(e){}
  return CP.indices;   // kho: đã nạp từ latest.json
};

/* ---------- lịch sử nến 1 mã (VPS sống -> kho hist) ------------------------ */
const histCache=new Map();
CP.loadHistFile=async function(sym){
  if(histCache.has(sym)) return histCache.get(sym);
  let d=null;
  try{ const j=await fetch(`data/hist/${sym}.json`).then(r=>r.ok?r.json():null);
    if(j&&j.t&&j.t.length) d=j; }catch(e){}
  histCache.set(sym,d); return d;
};
/* ---------- NẾN NGÀY DÀI HẠN: MƯỢN THẲNG TỪ NGUỒN, KHÔNG LẤY TRONG KHO ------
   Luật (user chốt 05/08/2026): trang KHÔNG tự lưu nến để vẽ và KHÔNG tự tính
   điều chỉnh cổ tức/chia tách nữa — cả hai để nguồn lo.
     nguồn 1  VNDirect  13,5 năm (từ 02/01/2013), ĐÃ hồi tố quyền
     nguồn 2  VPS       ~6 năm, hồi tố từ giữa 2021 trở lại — chỉ dùng khi nguồn 1 chết
     chốt cuối kho repo — cho ?offline hoặc khi cả hai nguồn tắt
   Vì sao phải có nguồn 2: nguồn 1 tắt là mất sạch chart, không có gì bù.
   Vì sao kho vẫn ở lại: data/hist còn nuôi MA/RSI/đỉnh 52T/dòng tiền NN/độ rộng
   /đường đua — nó là CƠ SỞ DỮ LIỆU, chỉ thôi đóng vai nguồn vẽ chart. */
const VNDCHART='https://dchart-api.vndirect.com.vn/dchart/history';
/* ĐƠN VỊ: hai nguồn đều trả NGHÌN đồng, nhưng có mã trả sẵn VND -> đối chiếu với
   tham chiếu bảng giá rồi chọn hệ số, TUYỆT ĐỐI không đoán theo ngưỡng (VNZ/HLB
   giá ~500 nghìn rơi đúng biên, từng sai 1000 lần). */
function chuanDonVi(sym,j){
  const c0=CP.coins.get(sym)||{}, moc=c0.ref||c0.price||0;
  const cuoi=j.c[j.c.length-1];
  const k=moc>0&&cuoi>0?(Math.abs(cuoi*1000-moc)<Math.abs(cuoi-moc)?1000:1):(cuoi<500?1000:1);
  const g=(a,i)=>(a&&a[i]!=null?a[i]:j.c[i]);
  return j.t.map((t,i)=>({t,
    o:Math.round(g(j.o,i)*k), h:Math.round(g(j.h,i)*k),
    l:Math.round(g(j.l,i)*k), c:Math.round(j.c[i]*k), v:(j.v||[])[i]||0}));
}
const dayCache=new Map();
CP.loadDaily=function(sym){
  if(dayCache.has(sym)) return dayCache.get(sym);
  const p=(async()=>{
    const to=Math.floor(Date.now()/1e3), from=to-15*365*86400;
    if(!CP.OFFLINE) for(const [url,res,ten] of [[VNDCHART,'D','VNDirect'],[HIST,'1D','VPS']]){
      try{
        const j=await fetch(`${url}?symbol=${sym}&resolution=${res}&from=${from}&to=${to}`)
                        .then(r=>r.ok?r.json():null);
        if(j&&j.s==='ok'&&j.t&&j.t.length>=2) return {rows:chuanDonVi(sym,j),src:ten};
      }catch(e){}
    }
    const f=await CP.loadHistFile(sym);
    if(!f||!f.t||f.t.length<2) return null;
    return {rows:chuanDonVi(sym,f),src:'kho CPVN'};
  })();
  dayCache.set(sym,p); return p;
};

/* rows nến {t,o,h,l,c,v}[] — res '5'|'30'|'1D'; fallback = nến ngày từ kho */
CP.loadCandles=async function(sym,res,spanSec){
  const to=Math.floor(Date.now()/1e3);
  if(!CP.OFFLINE) try{
    const j=await fetch(`${HIST}?symbol=${sym}&resolution=${res}&from=${to-spanSec}&to=${to}`).then(r=>r.json());
    if(j.s==='ok'&&j.t&&j.t.length>=2){
      let rows=j.t.map((t,i)=>({t,o:j.o[i],h:j.h[i],l:j.l[i],c:j.c[i],v:(j.v||[])[i]||0}));
      const refP=(CP.coins.get(sym)||{}).ref||0, lastC=rows[rows.length-1].c;
      const k=refP>0&&lastC>0?(Math.abs(lastC*1000-refP)<Math.abs(lastC-refP)?1000:1):(lastC<500?1000:1);
      if(k!==1) rows=rows.map(r=>({...r,o:r.o*k,h:r.h*k,l:r.l*k,c:r.c*k}));
      return {rows,saved:false};
    }
  }catch(e){}
  const f=await CP.loadHistFile(sym);
  if(!f) return null;
  const from=to-Math.max(spanSec,30*86400);
  const rows=[];
  for(let i=0;i<f.t.length;i++) if(f.t[i]>=from)
    rows.push({t:f.t[i],o:f.o[i],h:f.h[i],l:f.l[i],c:f.c[i],v:f.v[i]||0});
  return rows.length>=2?{rows,saved:true}:null;
};

/* ---------- tài chính + cổ tức (kho fin là chuẩn; đủ KQKD/CĐKT/LCTT) ------- */
const finCache=new Map();
CP.loadFin=async function(sym){
  if(finCache.has(sym)) return finCache.get(sym);
  let d=null;
  try{ d=await fetch(`data/fin/${sym}.json`).then(r=>r.ok?r.json():null); }catch(e){}
  if((!d||!(d.Q&&d.Q.length))&&!CP.OFFLINE){   // kho thiếu (mã quá mới) -> gọi sống KQKD
    try{
      const url=p=>`https://api-finance-t19.24hmoney.vn/v1/web/company/financial-report?symbol=${sym}&view=2&period=${p}&expanded=false`;
      const parse=D=>{ const H=D.headers||[];
        const row=(...ks)=>{ for(const k of ks){ const r=(D.rows||[]).find(x=>x.key===k); if(r) return r.values; } return []; };
        const rev=row('total_revenue','isa3','isi64'),cogs=row('total_cost','isa4'),
              gross=row('isa5','isi87'),pre=row('isa16'),np=row('isa22','isa20'),nm=row('net_profit_margin');
        const out=[];
        for(let i=0;i<H.length;i++){ const h=H[i];
          out.push({label:h.quarter?`Q${h.quarter}/${String(h.year).slice(2)}`:String(h.year),
            rev:rev[i]??null,cogs:cogs[i]??null,gross:gross[i]??null,pretax:pre[i]??null,np:np[i]??null,nm:nm[i]??null}); }
        return out.reverse();
      };
      const [y,q]=await Promise.all([
        fetch(url(1)).then(r=>r.json()).then(j=>parse(j.data||{})).catch(()=>[]),
        fetch(url(2)).then(r=>r.json()).then(j=>parse(j.data||{})).catch(()=>[]),
      ]);
      if(y.length||q.length) d=Object.assign(d||{sym},{Y:y,Q:q});
    }catch(e){}
  }
  finCache.set(sym,d); return d;
};

/* ---------- tin tức + báo cáo CTCK (sống -> kho news) ---------------------- */
const newsCache=new Map();
CP.newsFresh=function(sym){ newsCache.delete(sym); return CP.loadNews(sym); };  // ép lấy tin mới
/* TIN CÓ THẬT SỰ NÓI VỀ MÃ NÀY KHÔNG?
   Cả hai nguồn đều gắn thẻ khá tay: bài "Thế Giới Di Động (MWG): Doanh thu..." mang thẻ
   MWG,DXS nên nó lọt vào trang DXS; bài "IPO thành công, vốn hoá Điện Máy Xanh (DMX)..."
   mang thẻ DCV,DXS. Người xem mở trang Đất Xanh Services lại đọc tin Điện Máy Xanh.
   Luật: tiêu đề gọi đích danh MỘT MÃ KHÁC theo lối mạnh — "(MWG)" hoặc "MWG:" — thì bài
   đó là của công ty kia, bỏ. Trừ khi tiêu đề gọi luôn cả mã ĐANG XEM (bài so sánh hai
   doanh nghiệp) thì vẫn giữ. Tin ngành và tin thị trường không gọi tên mã nào nên không
   bị đụng tới — đó vẫn là bối cảnh đáng đọc. */
CP.maTrongTieuDe=function(tieu){
  const ra=new Set();
  const th=String(tieu||'').toUpperCase();
  let m; const rx=/\(([A-Z0-9]{3,4})\)|(?:^|[\s"'“(])([A-Z0-9]{3,4})\s*:/g;
  while((m=rx.exec(th))) ra.add(m[1]||m[2]);
  return ra;
};
CP.tinDungMa=function(sym,tieu){
  const co=CP.maTrongTieuDe(tieu);
  if(!co.size||co.has(sym)) return true;
  for(const x of co) if(CP.coins.has(x)) return false;   // gọi đích danh mã khác -> của họ
  return true;
};
CP.loadNews=async function(sym){
  if(newsCache.has(sym)&&Date.now()-newsCache.get(sym).at<300000) return newsCache.get(sym).d;
  let news=null, reports=null, total=0;
  if(!CP.OFFLINE){
    try{
      const [sim,vnd]=await Promise.all([
        fetch(`https://api2.simplize.vn/api/company/news-event/list?ticker=${sym}&page=0&size=15`).then(r=>r.json()).catch(()=>null),
        fetch(`https://api-finfo.vndirect.com.vn/v4/news?q=tagCodes:${sym}&sort=newsDate:desc&size=15&fields=newsDate,newsTime,newsTitle,newsSource,newsUrl`).then(r=>r.json()).catch(()=>null),
      ]);
      const items=[];
      for(const n of (sim&&sim.data)||[])
        items.push({title:n.title,source:n.sourceNameDisplay||n.sourceName||'',ts:n.ts||0,slug:n.slug,url:null});
      for(const n of (vnd&&vnd.data)||[]){
        const ts=Date.parse((n.newsDate||'')+'T'+(n.newsTime||'00:00:00')+'+07:00')||0;
        items.push({title:n.newsTitle,source:n.newsSource||'',ts,slug:null,url:n.newsUrl});
      }
      if(items.length){
        items.sort((a,b)=>b.ts-a.ts);
        const seen=new Set(); news=[];
        for(const it of items){ const k=(it.title||'').toLowerCase().slice(0,45);
          if(!k||seen.has(k)||!CP.tinDungMa(sym,it.title))continue; seen.add(k); news.push(it); }
      }
    }catch(e){}
    try{
      const j=await fetch(`https://api2.simplize.vn/api/company/analysis-report/list?ticker=${sym}&page=0&size=12`).then(r=>r.json());
      total=j.total||0;
      reports=(j.data||[]).map(r=>({source:r.source||'',rec:r.recommend||'',target:r.targetPrice||null,
        date:r.issueDate||'',title:r.title||'',pdf:r.attachedLink||''}));
    }catch(e){}
  }
  if(!news||!reports){   // nguồn sống chết -> kho tin tức
    try{
      const f=await fetch(`data/news/${sym}.json`).then(r=>r.ok?r.json():null);
      if(f){ if(!news&&f.news&&f.news.length) news=f.news;
             if(!reports&&f.reports&&f.reports.length){ reports=f.reports; total=f.total_reports||f.reports.length; } }
    }catch(e){}
  }
  const d={news:news||[],reports:reports||[],total};
  newsCache.set(sym,{at:Date.now(),d}); return d;
};
CP.openNewsItem=async function(n){
  if(n.url){ window.open(n.url,'_blank','noopener'); return; }
  if(n.slug&&!CP.OFFLINE){
    try{
      const j=await fetch(`https://api2.simplize.vn/api/company/news-event/detail/${n.slug}`).then(r=>r.json());
      const u=j.data&&(j.data.sourceUrl||j.data.sourceWebsite);
      window.open(u||'https://simplize.vn/tin-tuc','_blank','noopener'); return;
    }catch(e){}
  }
  window.open('https://simplize.vn','_blank','noopener');
};
CP.recStyle=function(r){
  r=(r||'').toUpperCase();
  if(/MUA|KHẢ QUAN|TÍCH LŨY|TĂNG|OUTPERFORM|BUY|ADD/.test(r)) return 'background:var(--green);color:#04240f';
  if(/BÁN|KÉM|SELL|UNDERPERFORM|REDUCE/.test(r))              return 'background:var(--red);color:#fff';
  if(/TRUNG LẬP|NẮM GIỮ|NEUTRAL|HOLD/.test(r))                return 'background:var(--yellow);color:#332703';
  return 'background:#3a3a44;color:#c9c9d2';
};

/* ---------- watchlist (⭐ localStorage) ------------------------------------ */
CP.watch={
  key:'cpvn_watchlist',
  get(){ try{ return new Set(JSON.parse(localStorage.getItem(this.key)||'[]')); }catch(e){ return new Set(); } },
  has(sym){ return this.get().has(sym); },
  toggle(sym){ const s=this.get(); s.has(sym)?s.delete(sym):s.add(sym);
    localStorage.setItem(this.key,JSON.stringify([...s])); return s.has(sym); },
};

/* ---------- sparkline mini (canvas) --------------------------------------- */
CP.drawSpark=function(cvs,vals,days){
  const v=(vals||[]).slice(-days);
  const w=cvs.width=cvs.clientWidth*2||120, h=cvs.height=(cvs.clientHeight||34)*2;
  const g=cvs.getContext('2d'); g.clearRect(0,0,w,h);
  if(v.length<2) return;
  let mn=Math.min(...v), mx=Math.max(...v); if(mx-mn<1e-9) mx=mn+1;
  const up=v[v.length-1]>=v[0];
  const col=up?'#16c784':'#ea3943';
  const x=i=>i/(v.length-1)*(w-4)+2, y=p=>h-3-(p-mn)/(mx-mn)*(h-8);
  g.beginPath();
  v.forEach((p,i)=>i?g.lineTo(x(i),y(p)):g.moveTo(x(i),y(p)));
  g.strokeStyle=col; g.lineWidth=2.4; g.lineJoin='round'; g.stroke();
  const gr=g.createLinearGradient(0,0,0,h);
  gr.addColorStop(0,up?'rgba(22,199,132,.22)':'rgba(234,57,67,.22)');
  gr.addColorStop(1,'rgba(0,0,0,0)');
  g.lineTo(x(v.length-1),h); g.lineTo(x(0),h); g.closePath();
  g.fillStyle=gr; g.fill();
};

/* ---------- tổng hợp thị trường (cho hàng thống kê) ------------------------ */
CP.marketStats=function(){
  let mcap=0, gtgd=0, up=0, down=0, flat=0, ceil=0, floor=0;
  for(const c of CP.coins.values()){
    mcap+=(c.mcapLive||c.mcap||0);
    if(!c.traded) continue;
    gtgd+=(c.gtgd||0);
    if(c.ceil>0&&c.price>=c.ceil) ceil++;
    else if(c.flr>0&&c.price<=c.flr) floor++;
    if(c.chg1d>0.01) up++; else if(c.chg1d<-0.01) down++; else flat++;
  }
  return {mcap,gtgd,up,down,flat,ceil,floor};
};
})();
