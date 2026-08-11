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
  /* BA MỤC CHÍNH, đúng như cây điều hướng đã chốt ở máy bàn. Bong bóng và Danh
     mục tập đoàn KHÔNG được leo lên hàng mục chính: chúng là ba cách nhìn CÙNG
     một rổ mã — bảng số, bản đồ bong bóng, gom theo nhà — nên phải nằm chung
     dưới Bảng giá. Tách ra thành tab riêng là thanh đáy có 5 mục ngang hàng
     trong khi thật ra chỉ có 3 nhánh, người dùng đọc ra một cấu trúc sai. */
  var MUC=[
    ['bang','Bảng giá',  '/'],
    ['radar','Radar',    'congcu.html?m=radar'],
    ['dua','Đường đua',  'congcu.html?m=race']
  ];
  /* Mục con của nhóm Bảng giá — ba TRANG khác nhau nên không trang nào tự dựng
     được dải này, phải dựng ở đây một lần cho cả ba. */
  /* Nhãn RÚT GỌN, không bê nguyên tên đầy đủ như menu máy bàn: ba chip ngắn thì
     nằm trọn một hàng 375px, còn "Bản đồ bong bóng" + "Danh mục tập đoàn" là
     phải cuộn ngang — mà cuộn để thấy mục thứ ba thì coi như mục đó bị giấu. */
  var CON=[
    ['bang','Bảng giá',  '/'],
    ['bong','Bong bóng', '/bubbles'],
    ['tap','Tập đoàn',   'congcu.html?m=tapdoan']
  ];

  /* Đang đứng ở đâu: trang công cụ phải soi thêm ?m= vì ba module khác nhau cùng
     chạy trên một file. Trả về [mục chính, mục con]. */
  function dangO(){
    var p=location.pathname.replace(/\/index\.html$/,'/');
    if(/bubbles/.test(p)) return ['bang','bong'];
    if(/congcu/.test(p)){
      var m=(new URLSearchParams(location.search)).get('m')||'radar';
      if(m==='race') return ['dua',''];
      if(m==='tapdoan') return ['bang','tap'];
      return ['radar',''];
    }
    if(/cophieu/.test(p)) return ['bang',''];  /* trang một mã đi ra từ bảng giá */
    return ['bang','bang'];
  }

  function dung(){
    if(document.querySelector('.mobibar')) return;
    var o=dangO(), cur=o[0], con=o[1];

    /* Dải mục con chỉ hiện khi đang Ở TRONG nhóm Bảng giá, và không hiện ở trang
       một mã — ở đó người ta đang xem một cổ phiếu, không phải đang chọn cách
       nhìn cả rổ. */
    if(con){
      var h=document.querySelector('header'), s=document.createElement('div');
      s.className='mobisub';
      s.innerHTML='<div class="mobisub-in">'+CON.map(function(m){
        return '<a href="'+m[2]+'"'+(m[0]===con?' class="on"':'')+'>'+m[1]+'</a>';
      }).join('')+'</div>';
      if(h&&h.parentNode) h.parentNode.insertBefore(s,h.nextSibling);
      else document.body.insertBefore(s,document.body.firstChild);
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
