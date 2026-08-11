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
  var MUC=[
    ['bang','Bảng giá',      '/'],
    ['bong','Bong bóng',     '/bubbles'],
    ['radar','Radar',        'congcu.html?m=radar'],
    ['dua','Đường đua',      'congcu.html?m=race'],
    ['tap','Tập đoàn',       'congcu.html?m=tapdoan']
  ];

  /* Mục nào đang mở: trang công cụ phải soi thêm ?m= vì ba tab khác nhau cùng
     chạy trên một file. Thiếu bước này thì vào Radar mà thanh đáy vẫn sáng ở
     Bảng giá — người dùng mất luôn cảm giác mình đang đứng ở đâu. */
  function dangO(){
    var p=location.pathname.replace(/\/index\.html$/,'/');
    if(/bubbles/.test(p)) return 'bong';
    if(/congcu/.test(p)){
      var m=(new URLSearchParams(location.search)).get('m')||'radar';
      return m==='race'?'dua':m==='tapdoan'?'tap':'radar';
    }
    if(/cophieu/.test(p)) return 'bang';   /* trang một mã đi ra từ bảng giá */
    return 'bang';
  }

  function dung(){
    if(document.querySelector('.mobibar')) return;
    var cur=dangO(), n=document.createElement('nav');
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
