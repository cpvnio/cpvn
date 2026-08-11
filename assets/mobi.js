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
  /* MỤC CON KHÔNG CHIẾM CHỖ TRÊN ĐỈNH. Dải chip cố định dưới header ăn đứt 54px
     của mọi màn hình, cả ngày chỉ để chờ người ta bấm một lần. Nay bấm vào mục
     chính ở thanh đáy thì mục con mới bung lên — đúng chỗ ngón cái đang đặt,
     và không tốn một pixel nào khi không dùng. */
  var CON={
    bang:[['bang','Bảng giá','/'],
          ['bong','Bản đồ bong bóng','/bubbles'],
          ['tap','Danh mục tập đoàn','congcu.html?m=tapdoan']],
    radar:[['phien','Nhịp phiên','congcu.html?m=radar&t=phien'],
           ['cd','Chủ điểm đầu tư','congcu.html?m=radar&t=cd'],
           ['vb','Khi nào về bờ','congcu.html?m=radar&t=vb']],
    dua:[['dua','Đường đua vốn hoá','congcu.html?m=race&t=dua'],
         ['dca','Đầu tư bền vững','congcu.html?m=race&t=dca']]
  };

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

    var n=document.createElement('nav');
    n.className='mobibar';
    n.innerHTML=MUC.map(function(m){
      return '<a href="'+m[2]+'" data-muc="'+m[0]+'"'+(m[0]===cur?' class="on"':'')+'>'+
        '<svg viewBox="0 0 24 24" aria-hidden="true">'+IC[m[0]]+'</svg>'+
        '<span>'+m[1]+'</span></a>';
    }).join('');
    document.body.appendChild(n);

    var nen=document.createElement('div'); nen.className='mobinen';
    var pop=document.createElement('div'); pop.className='mobipop';
    document.body.appendChild(nen); document.body.appendChild(pop);

    function dong(){ pop.classList.remove('on'); nen.classList.remove('on'); }
    function mo(muc){
      var ds=CON[muc]||[];
      pop.innerHTML='<div class="mobipop-in"><div class="grab"></div>'+ds.map(function(m){
        return '<a href="'+m[2]+'"'+((muc===cur&&m[0]===con)?' class="on"':'')+'>'+m[1]+
          '<i></i></a>';
      }).join('')+'</div>';
      pop.classList.add('on'); nen.classList.add('on');
    }
    nen.addEventListener('click',dong);

    /* Bấm mục chính = BUNG mục con, không đi thẳng. Chặn ở pointerdown chứ đừng
       đợi click: cú chạm làm hiện nội dung đang ẩn hay bị trình duyệt nuốt mất
       click (đã đo trên máy ảo Android khi làm menu thả xuống ở máy bàn). */
    n.addEventListener('click',function(e){
      var a=e.target.closest('a[data-muc]'); if(!a) return;
      var muc=a.dataset.muc;
      if(!CON[muc]) return;                 /* không có mục con thì đi luôn */
      e.preventDefault(); e.stopPropagation();
      if(pop.classList.contains('on')&&pop.dataset.muc===muc){ dong(); return; }
      pop.dataset.muc=muc; mo(muc);
    });
    addEventListener('keydown',function(e){ if(e.key==='Escape') dong(); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',dung);
  else dung();
})();
