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
    tap:'<path d="M4 21V7.5L11 3l7 4.5V21M4 21h16M9.5 21v-5h4v5M9 11h.01M14 11h.01"/>'
  };
  /* BA MỤC CHÍNH. Bong bóng và Danh mục tập đoàn không leo lên hàng này: năm mục
     ngang hàng trong khi thật ra chỉ có ba nhánh thì người dùng đọc ra một cấu
     trúc sai. Chúng nằm trong bốn lối rẽ của Radar (xem CON bên dưới). */
  var MUC=[
    ['bang','Bảng giá',  '/'],
    ['radar','Radar',    'congcu.html?m=radar'],
    ['dua','Đường đua',  'congcu.html?m=race']
  ];
  /* BỐN LỐI RẼ CỦA RADAR (user chốt 11/08/2026).
     Bảng giá nay SẠCH HOÀN TOÀN — không dải mục con nào, mở ra là thấy mã ngay.
     Bong bóng và Danh mục tập đoàn dọn sang đứng chung với hai mục radar, vì cả
     bốn đều là "soi thị trường theo một góc khác", còn bảng giá là chỗ tra cứu.
     Bấm Radar ở thanh đáy = về Nhịp phiên (mặc định), bốn nút này là lối rẽ.

     Hai mục có TRANG RIÊNG (bong bóng, tập đoàn) đi bằng link thật; hai mục nằm
     CÙNG trang radar thì bấm thẳng vào mục tương ứng trong menu máy bàn (đã ẩn ở
     khổ hẹp) để congcu.js đổi tab tại chỗ, khỏi tải lại trang. */
  var CON=[
    ['bong','Bong bóng',  '/bubbles'],
    ['cd',  'Chủ điểm',   null],
    ['tap', 'Tập đoàn',   'congcu.html?m=tapdoan'],
    ['vb',  'Về bờ',      null],
    ['tg',  'Toàn cầu',   null]
  ];

  /* ĐỌC CẢ URL SẠCH, đừng chỉ dò "congcu". `_redirects` viết lại /radar, /tapdoan,
     /duongdua sang congcu.html bằng rewrite 200 — URL trên thanh địa chỉ GIỮ NGUYÊN
     đường dẫn sạch và KHÔNG có ?m=. Chỉ dò chuỗi "congcu" thì vào cpvn.io/radar là
     rơi hết xuống nhánh mặc định: mất sạch bốn nút và thanh đáy sáng nhầm ở Bảng
     giá. Bắt được đúng lúc thử trên bản live — ở localhost tao toàn gõ congcu.html
     nên nhánh này không bao giờ chạy tới. congcu.js cũng đọc theo path vì lý do y hệt. */
  function dangO(){
    var p=location.pathname.replace(/\/index\.html$/,'').replace(/\/+$/,'');
    if(/bubbles/.test(p))  return ['radar','bong'];
    if(/cophieu/.test(p))  return ['bang',''];      /* trang một mã đi ra từ bảng giá */
    if(/duongdua/.test(p)) return ['dua',''];
    if(/tapdoan/.test(p))  return ['radar','tap'];
    if(/radar/.test(p))    return ['radar','phien'];
    if(/congcu/.test(p)){
      var q=new URLSearchParams(location.search), m=q.get('m')||'radar';
      if(m==='race')    return ['dua',''];
      if(m==='tapdoan') return ['radar','tap'];
      return ['radar',q.get('t')||'phien'];   /* phien = mặc định, không nút nào sáng */
    }
    return ['bang',''];                       /* BẢNG GIÁ: không dải mục con */
  }

  function dung(){
    if(document.querySelector('.mobibar')) return;
    var o=dangO(), cur=o[0], con=o[1];

    /* Dải chỉ mọc ở nhóm Radar. Bảng giá và Đường đua không có: bảng giá phải
       sạch, còn đường đua đã sẵn nút đổi chế độ trong trang. */
    if(cur==='radar'){
      var h=document.querySelector('header'), s=document.createElement('div');
      s.className='mobisub';
      s.innerHTML='<div class="mobisub-in">'+CON.map(function(m){
        var on=(m[0]===con?' class="on"':'');
        return m[2] ? '<a href="'+m[2]+'"'+on+'>'+m[1]+'</a>'
                    : '<button type="button" data-t="'+m[0]+'"'+on+'>'+m[1]+'</button>';
      }).join('')+'</div>';
      if(h&&h.parentNode) h.parentNode.insertBefore(s,h.nextSibling);
      else document.body.insertBefore(s,document.body.firstChild);

      s.addEventListener('click',function(e){
        var b=e.target.closest('button[data-t]'); if(!b) return;
        var dd=document.querySelector('.dd a[data-md="radar"][data-t="'+b.dataset.t+'"]');
        if(dd) dd.click();
        s.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b)});
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
