/* ============================================================================
   THANH TAB ĐÁY — dựng bằng JS để năm trang khỏi phải chép năm bản HTML giống hệt
   nhau (sửa một mục là phải nhớ sửa đủ năm chỗ, kiểu gì cũng sót).

   BỘ ICON MỘT NÉT, lưới 24, nét 1.7, ăn màu theo chữ. Không dùng emoji: mỗi hệ
   điều hành vẽ một kiểu, luôn mang màu riêng chửi nhau với bảng màu, và đứng cạnh
   chữ thì lệch chân — trong một sản phẩm tài chính nó lộ ra ngay là ghép vội.
   ========================================================================== */
(function(){
  var IC={
    bang:'<path d="M3 5h18M3 10h18M3 15h11M3 20h7"/>',
    bong:'<circle cx="8.5" cy="9.5" r="4.5"/><circle cx="17.5" cy="7" r="2.5"/>'+
         '<circle cx="15" cy="16" r="4"/>',
    radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/>'+
          '<path d="M12 12l6.4-4.2"/>',
    dua:'<path d="M4 20V10M10 20V4M16 20v-8M22 20V7"/>',
    /* ĐỪNG mượn icon `dua` cho `pt`: cả hai đứng CẠNH NHAU trên thanh đáy, hai cột bar
       giống hệt nhau thì thanh điều hướng thành hai nút không phân biệt được. Phân tích
       dùng đồ thị ĐƯỜNG có trục, khác hẳn về hình khối. */
    pt:'<path d="M4 4v16h16"/><path d="M7.5 15.5l3.5-4.5 3 2.5 4.5-6.5"/>',
    tap:'<path d="M4 21V7.5L11 3l7 4.5V21M4 21h16M9.5 21v-5h4v5M9 11h.01M14 11h.01"/>'
  };
  /* BỐN MỤC CHÍNH. Bong bóng và Danh mục tập đoàn vẫn không leo lên hàng này: chúng là
     "soi thị trường theo một góc khác", cùng nhánh với Radar, nên nằm trong lối rẽ của
     Radar (xem CON bên dưới). "Phân tích" thì khác hẳn — nó là kho số chốt phiên và sổ
     lệnh, không phải một góc nhìn của radar — nên đứng riêng, đúng vị trí user chốt
     20/08/2026: GIỮA Radar và Đường đua, khớp với thanh máy bàn. */
  var MUC=[
    ['bang','Bảng giá',  '/'],
    ['pt','Phân tích',   'congcu.html?m=phantich'],
    ['dua','Đường đua',  'congcu.html?m=race']
  ];
  /* BỐN LỐI RẼ CỦA RADAR (user chốt 11/08/2026).
     Bảng giá nay SẠCH HOÀN TOÀN — không dải mục con nào, mở ra là thấy mã ngay.
     Bong bóng và Danh mục tập đoàn dọn sang đứng chung với hai mục radar, vì cả
     bốn đều là "soi thị trường theo một góc khác", còn bảng giá là chỗ tra cứu.
     Bấm Radar ở thanh đáy = về Nhịp phiên (mặc định), bốn nút này là lối rẽ.

     CẢ BỐN MỤC PHẢI CÓ HREF THẬT, kể cả hai mục nằm cùng trang radar. Bản cũ để
     chúng là <button> không href, chỉ chạy nhờ bấm hộ vào menu máy bàn (đã ẩn ở khổ
     hẹp) — mà menu đó CHỈ CÓ trên congcu.html. Trang bong bóng không có, nên đứng ở
     /bubbles bấm "Chủ điểm" là NÚT CHẾT: trang đứng im mà nút vẫn sáng lên, dải điều
     hướng nói dối chỗ mình đang đứng. Có href thì trang nào cũng đi được; riêng
     congcu.html mới chặn lại để congcu.js đổi tab TẠI CHỖ, khỏi tải lại trang. */
  /* THỨ TỰ do user chốt 12/08/2026: Toàn cầu đứng NGAY SAU Nhịp phiên (Nhịp phiên là
     mặc định nên không có nút riêng) — soi thế giới trước rồi mới soi trong nước. */
  /* "Toàn cầu" đã GỘP vào Nhịp phiên (13/08/2026) nên không còn là một lối rẽ riêng. */
  var CON=[
    ['bong','Bong bóng',  '/bubbles',                 null],
    ['tap', 'Tập đoàn',   'congcu.html?m=tapdoan',    null],
    ['vb',  'Về bờ',      'congcu.html?m=radar&t=vb', 'vb']
  ];

  /* ĐỌC CẢ URL SẠCH, đừng chỉ dò "congcu". `_redirects` viết lại /radar, /tapdoan,
     /duongdua sang congcu.html bằng rewrite 200 — URL trên thanh địa chỉ GIỮ NGUYÊN
     đường dẫn sạch và KHÔNG có ?m=. Chỉ dò chuỗi "congcu" thì vào cpvn.io/radar là
     rơi hết xuống nhánh mặc định: mất sạch bốn nút và thanh đáy sáng nhầm ở Bảng
     giá. Bắt được đúng lúc thử trên bản live — ở localhost tao toàn gõ congcu.html
     nên nhánh này không bao giờ chạy tới. congcu.js cũng đọc theo path vì lý do y hệt. */
  /* HAI ĐƯỜNG VÀO CÙNG MỘT TRANG PHẢI RA CÙNG MỘT KẾT QUẢ: `/radar?t=vb` và
     `/congcu.html?m=radar&t=vb` là y hệt nhau. Bản cũ chặn `/radar` lại ở một dòng
     riêng trả cứng 'phien' rồi mới đọc `?t=` ở nhánh `/congcu` phía dưới — nên mở
     cpvn.io/radar?t=vb (đúng thứ chính dải này sinh ra khi bấm "Về bờ") thì nội dung
     là Về bờ mà dải không sáng mục nào. congcu.js đọc `?t=` bất kể đường vào, dải
     phải đọc y như vậy. */
  function dangO(){
    var p=location.pathname.replace(/\/index\.html$/,'').replace(/\/+$/,'');
    var q=new URLSearchParams(location.search);
    /* Nhóm PHÂN TÍCH ('pt') nay gom cả Nhịp phiên (trang chính), Bong bóng, Tập đoàn và
       Về bờ (module 'radar' nay = Về bờ). Bảng giá vẫn sạch, Đường đua đứng riêng. */
    if(/bubbles/.test(p))  return ['pt','bong'];
    if(/cophieu/.test(p))  return ['bang',''];      /* trang một mã đi ra từ bảng giá */
    if(/duongdua/.test(p)) return ['dua',''];
    if(/phantich/.test(p)) return ['pt',''];
    if(/tapdoan/.test(p))  return ['pt','tap'];
    if(/radar/.test(p))    return ['pt','vb'];       /* /radar nay là Về bờ */
    var m=/congcu/.test(p) ? (q.get('m')||'phantich') : '';
    if(!m)            return ['bang',''];   /* BẢNG GIÁ: không dải mục con */
    if(m==='race')     return ['dua',''];
    if(m==='phantich') return ['pt',''];
    if(m==='tapdoan') return ['pt','tap'];
    if(m==='radar')   return ['pt','vb'];
    return ['pt',''];   /* Nhịp phiên = mặc định, không nút con nào sáng */
  }

  function dung(){
    if(document.querySelector('.mobibar')) return;
    var o=dangO(), cur=o[0], con=o[1];

    /* Dải mục con mọc ở nhóm PHÂN TÍCH (đã gộp Radar vào 27/08/2026). Bảng giá và
       Đường đua không có: bảng giá phải sạch, đường đua đã sẵn nút đổi chế độ. */
    if(cur==='pt'){
      var h=document.querySelector('header'), s=document.createElement('div');
      s.className='mobisub';
      s.innerHTML='<div class="mobisub-in">'+CON.map(function(m){
        return '<a href="'+m[2]+'"'+(m[3]?' data-t="'+m[3]+'"':'')+
          (m[0]===con?' class="on"':'')+'>'+m[1]+'</a>';
      }).join('')+'</div>';
      if(h&&h.parentNode) h.parentNode.insertBefore(s,h.nextSibling);
      else document.body.insertBefore(s,document.body.firstChild);

      s.addEventListener('click',function(e){
        var b=e.target.closest('a[data-t]'); if(!b) return;
        /* Chỉ chặn khi TRANG NÀY tự đổi tab được. Không có menu máy bàn (bong bóng)
           thì để href chạy bình thường, đừng nuốt cú bấm rồi chẳng đi đâu. */
        var dd=document.querySelector('.dd a[data-md="radar"][data-t="'+b.dataset.t+'"]');
        if(!dd) return;
        e.preventDefault(); dd.click();
        /* PHẢI XOÁ .on TRÊN CẢ DẢI, đừng chỉ quét mấy mục đổi-tại-chỗ. Bản cũ chỉ
           quét <button> nên vào /tapdoan (mục "Tập đoàn" là <a> đang sáng) rồi bấm
           "Về bờ" là SÁNG HAI MỤC CÙNG LÚC — trang đã sang Radar phiên mà dải vẫn
           bảo đang ở Tập đoàn. */
        s.querySelectorAll('a').forEach(function(x){x.classList.toggle('on',x===b)});
      });
    }

    var n=document.createElement('nav');
    n.className='mobibar';
    n.innerHTML=MUC.map(function(m){
      return '<a href="'+m[2]+'"'+(m[0]===cur?' class="on"':'')+'>'+
        '<svg viewBox="0 0 24 24" aria-hidden="true">'+IC[m[0]]+'</svg>'+
        '<span>'+m[1]+'</span></a>';
    }).join('');
    document.body.appendChild(n);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',dung);
  else dung();
})();
