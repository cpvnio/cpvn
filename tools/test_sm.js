/* ============================================================================
   KIỂM THỬ "SO VỚI CHỈ SỐ" — chạy: node tools/test_sm.js

   Nạp THẲNG assets/chart.js vào môi trường giả (canvas rỗng, mọi lệnh vẽ là no-op)
   rồi gọi chính `chart.smSo()`. Không mô phỏng lại công thức — kiểm đúng mã đang chạy.

   VÌ SAO CÓ FILE NÀY: đại lượng này là thứ user dùng để kết luận "mã mạnh hay yếu hơn
   xu thế chung", và nó đã sai BA LẦN trước khi ra được bản này — cả ba lần đều sai IM
   LẶNG (chart vẫn vẽ đẹp, chỉ số là sai):
     ① đo bằng VỐN HOÁ: phát hành thêm làm vốn hoá phồng mà cổ đông cũ không được gì.
        HHV vốn hoá ×112,5 nhưng giá ×1,83 khi chỉ số ×3,11 -> thước cũ chấm nó mạnh
        nhất sàn trong khi thực tế nó THUA thị trường.
     ② neo bằng TRUNG BÌNH TRƯỢT: cõng thêm ước số chỉ số, cộng sai số CHUNG trung vị
        +17,2% (max +68,1%) vào mọi mã.
     ③ neo bằng MỘT HẰNG SỐ rồi áp ngược 13 năm: năm 2013 bị đo bằng thước 2026.
   Nên mọi ca dưới đây đều nhằm khoá lại đúng một tính chất: NHÂN QUẢ, và chỉ phụ thuộc
   TỈ LỆ % của hai bên kể từ phiên neo.
   ========================================================================== */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm');
const SRC=fs.readFileSync(path.join(__dirname,'..','assets','chart.js'),'utf8');

let pass=0, fail=0;
const kiem=(ten,thuc,mong)=>{ const ok=Object.is(thuc,mong);
  ok?pass++:fail++;
  console.log(`  ${ok?'✓':'✗'} ${ten}${ok?'':`\n      mong: ${mong}\n      thực: ${thuc}`}`); };
const gan=(ten,thuc,mong,eps)=>{ const ok=Math.abs(thuc-mong)<=eps;
  ok?pass++:fail++;
  console.log(`  ${ok?'✓':'✗'} ${ten}${ok?'':`\n      mong: ${mong} ±${eps}\n      thực: ${thuc}`}`); };

/* ---- môi trường giả: mọi thứ liên quan tới vẽ đều nuốt lặng ---- */
function moiTruong(){
  const ctx=new Proxy({},{ get:(t,k)=>{
    if(k==='measureText') return ()=>({width:10});
    if(k==='canvas') return null;
    if(k==='createLinearGradient') return ()=>({addColorStop(){}});
    if(typeof k==='symbol') return undefined;
    return (k in t)?t[k]:(()=>{});
  }, set:(t,k,v)=>{ t[k]=v; return true; }});
  const cvs={ width:800, height:400, style:{}, getContext:()=>ctx,
    addEventListener(){}, removeEventListener(){}, getBoundingClientRect:()=>({left:0,top:0,width:800,height:400}) };
  const win={ devicePixelRatio:1, addEventListener(){}, removeEventListener(){},
    requestAnimationFrame:f=>f(), setTimeout, clearTimeout, Image:function(){ this.src=''; },
    matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}) };
  const c={ window:win, document:{ createElement:()=>cvs, documentElement:{classList:{contains:()=>false}} },
    Math, JSON, Object, Array, String, Number, Date, isNaN, parseFloat, parseInt, console,
    Image:win.Image, devicePixelRatio:1, setTimeout, clearTimeout, Map, Set, Infinity, NaN };
  c.globalThis=c; c.self=c;
  vm.createContext(c);
  vm.runInContext(SRC,c);
  return { CPChart:c.window.CPChart, cvs };
}
const { CPChart, cvs }=moiTruong();
kiem('nạp được assets/chart.js', typeof CPChart, 'function');

const T0=Math.floor(Date.parse('2013-01-02T09:00:00+07:00')/1000), NGAY=86400;
/* `f(i)` trả [giá, điểm chỉ số]. */
function chuoi(n,f,tuI=0){
  const out=[];
  for(let i=0;i<n;i++){ const [g,x]=f(i);
    out.push({t:T0+(tuI+i)*NGAY, o:g, h:g, l:g, c:g, v:1000, ix:x}); }
  return out;
}
/* MẶC ĐỊNH nay là "1 năm gần nhất" (250 nến khung Ngày). Phần lớn ca dưới đây kiểm CÔNG
   THỨC nên cần mốc đứng yên ở phiên 0 — gọi `neoSoNam(0)` = "Tất cả". Ca riêng cho mốc
   mặc định thì ở khối ⑪. */
const lam=()=>{ const c=CPChart(cvs,{}); c.neoSoNam(0); return c; };
const lamMac=()=>CPChart(cvs,{});

/* ── ① CÔNG THỨC: khoảng hở = tỉ lệ giá ÷ tỉ lệ chỉ số, tính từ phiên neo ────── */
{
  const n=500, f=i=>[10000*Math.pow(1.002,i), 500*Math.pow(1.001,i)];
  const ch=lam(); ch.setRows(chuoi(n,f),'d');
  const S=ch.smSo();
  kiem('neo ở phiên ĐẦU chuỗi', S.a, 0);
  kiem('đếm đủ phiên', S.co, n);
  gan('khoảng hở tại phiên neo = 0', S.q[0], 0, 1e-12);
  const [g0,x0]=f(0), [gz,xz]=f(n-1);
  gan('khoảng hở phiên cuối khớp công thức dựng lại',
      S.q[n-1], (gz/g0)/(xz/x0)-1, 1e-12);
  gan('đường chỉ số quy đổi = giá(neo) × tỉ lệ chỉ số',
      S.ln[n-1], g0*(xz/x0), 1e-6);
  kiem('đường chỉ số tại phiên neo TRÙNG giá', Math.round(S.ln[0]), Math.round(g0));
}

/* ── ② CHỈ PHỤ THUỘC TỈ LỆ, KHÔNG PHỤ THUỘC MỨC TUYỆT ĐỐI ──────────────────
   Nhân toàn bộ chỉ số với một hằng số (đổi "đơn vị điểm") thì khoảng hở phải Y NGUYÊN.
   Đây là tính chất mà bản neo-bằng-hằng-số cũ KHÔNG có. */
{
  const n=400, f=i=>[10000*(1+0.3*Math.sin(i/40)), 500*(1+0.2*Math.cos(i/30))];
  const a=lam(); a.setRows(chuoi(n,f),'d');
  const b=lam(); b.setRows(chuoi(n,i=>{const [g,x]=f(i); return [g,x*137.9];}),'d');
  const A=a.smSo(), B=b.smSo();
  let lech=0; for(let i=0;i<n;i++) lech=Math.max(lech,Math.abs(A.q[i]-B.q[i]));
  gan('nhân thang chỉ số ×137,9 -> khoảng hở không đổi', lech, 0, 1e-12);
  /* Còn ĐƯỜNG chỉ số thì phải KHÔNG đổi luôn, vì nó đã quy về đơn vị giá */
  let l2=0; for(let i=0;i<n;i++) l2=Math.max(l2,Math.abs(A.ln[i]/B.ln[i]-1));
  gan('đường chỉ số quy đổi cũng không đổi', l2, 0, 1e-12);
}

/* ── ③ NHÂN DỒN % TỪNG PHIÊN = TỈ SỐ HAI ĐẦU (user chốt cách hiểu này) ─────── */
{
  const n=900, f=i=>[10000*(1+0.5*Math.sin(i/70)), 500*(1+0.25*Math.sin(i/55))];
  const ch=lam(); ch.setRows(chuoi(n,f),'d'); const S=ch.smSo();
  let tich=1;
  for(let i=1;i<n;i++){ const [g1,x1]=f(i), [g0,x0]=f(i-1);
    tich*=(g1/g0)/(x1/x0); }
  gan('tích của % chênh lệch từng phiên = khoảng hở cuối', tich-1, S.q[n-1], 1e-9);
}

/* ── ④ NHÂN QUẢ: thêm phiên MỚI không được đổi số của phiên CŨ ──────────────
   Đây là tính chất mà cả hai bản trước đều thiếu — trung bình trượt và hằng số neo đều
   khiến quá khứ bị viết lại mỗi khi có dữ liệu mới. */
{
  const f=i=>[10000*(1+0.4*Math.sin(i/50)), 500*(1+0.2*Math.cos(i/45))];
  const a=lam(); a.setRows(chuoi(600,f),'d'); const A=a.smSo();
  const b=lam(); b.setRows(chuoi(900,f),'d'); const B=b.smSo();
  let lech=0; for(let i=0;i<600;i++) lech=Math.max(lech,Math.abs(A.q[i]-B.q[i]));
  gan('thêm 300 phiên mới -> 600 phiên cũ không đổi một số nào', lech, 0, 1e-12);
}

/* ── ⑤ DỜI MỐC NEO ─────────────────────────────────────────────────────────── */
{
  const n=500, f=i=>[10000*(1+0.3*Math.sin(i/40)), 500*(1+0.1*Math.cos(i/25))];
  const R=chuoi(n,f);
  const ch=lam(); ch.setRows(R,'d');
  kiem('đặt "Từ đầu" -> neo phiên 0', ch.smSo().a, 0);
  ch.neoTai(R[200].t);
  const S=ch.smSo();
  kiem('dời neo về phiên 200', S.a, 200);
  gan('khoảng hở tại mốc mới = 0', S.q[200], 0, 1e-12);
  const [g0,x0]=f(200), [gz,xz]=f(n-1);
  gan('khoảng hở cuối tính lại theo mốc mới', S.q[n-1], (gz/g0)/(xz/x0)-1, 1e-12);
  kiem('phiên TRƯỚC mốc neo không có số', S.q[199], null);
  ch.neoTai(null);
  kiem('bỏ ghim -> về lại mốc mặc định đang đặt', ch.smSo().a, 0);
}

/* ── ⑥ NEO VÀO PHIÊN THIẾU CHỈ SỐ -> LÙI VỀ PHIÊN HỢP LỆ TRƯỚC ĐÓ ───────────
   Bỏ neo im lặng thì người vừa bấm không thấy gì đổi, đọc ra là nút hỏng. */
{
  const n=300, R=chuoi(n,i=>[10000+i, 500+i]);
  for(let i=150;i<160;i++) R[i].ix=0;            // mười phiên mất chỉ số
  const ch=lam(); ch.setRows(R,'d');
  ch.neoTai(R[155].t);
  kiem('neo vào phiên mất chỉ số -> lùi về phiên 149', ch.smSo().a, 149);
}

/* ── ⑦ THIẾU DỮ LIỆU: ngắt nét, không bịa số ───────────────────────────────── */
{
  const n=200, R=chuoi(n,i=>[10000+i*10, 500+i]);
  R[100].c=0; R[120].ix=0;
  const ch=lam(); ch.setRows(R,'d'); const S=ch.smSo();
  kiem('phiên mất giá -> khoảng hở null', S.q[100], null);
  kiem('phiên mất chỉ số -> khoảng hở null', S.q[120], null);
  kiem('phiên mất giá -> đường chỉ số null', S.ln[100], null);
  kiem('phiên liền sau vẫn có số', S.q[121]!=null, true);
}

/* ── ⑧ KHÔNG CÓ CHỈ SỐ -> KHÔNG CÓ GÌ, và không nổ ─────────────────────────── */
{
  const R=chuoi(200,i=>[10000+i,500+i]).map(r=>({...r, ix:undefined}));
  const ch=lam(); ch.setRows(R,'d'); const S=ch.smSo();
  kiem('không phiên nào có chỉ số -> a = −1', S.a, -1);
  kiem('đếm được 0 phiên', S.co, 0);
  kiem('mảng khoảng hở rỗng hoàn toàn', S.q.some(v=>v!=null), false);
}

/* ── ⑨ MÃ MỚI NIÊM YẾT: đọc được ngay, KHÔNG cần cửa sổ khởi động ───────────
   Bản cũ đòi 250 nến mới cho ra số nên VCK (169 phiên) không có gì. */
{
  const n=12, f=i=>[20000*(1+0.02*i), 1000*(1+0.01*i)];
  const ch=lam(); ch.setRows(chuoi(n,f),'d'); const S=ch.smSo();
  kiem('12 phiên vẫn neo được', S.a, 0);
  const [g0,x0]=f(0), [gz,xz]=f(n-1);
  gan('12 phiên vẫn ra số đúng', S.q[n-1], (gz/g0)/(xz/x0)-1, 1e-12);
}

/* ── ⑩ ĐỔI KHUNG KHÔNG ĐỔI SỐ ở phiên cuối ────────────────────────────────
   `neoT` là MỐC THỜI GIAN nên phải trỏ đúng phiên đó ở mọi khung. */
{
  const n=600, f=i=>[10000*(1+0.4*Math.sin(i/60)), 500*(1+0.15*Math.cos(i/50))];
  const R=chuoi(n,f);
  const ch=lam(); ch.setRows(R,'d'); ch.neoTai(R[300].t);
  const q1=ch.smSo().q[n-1], neo1=ch.neoDang();
  ch.setRows(R,'W',true);                        // cùng dữ liệu, khai là khung Tuần
  kiem('đổi khung -> mốc neo giữ nguyên', ch.neoDang(), neo1);
  gan('đổi khung -> số cuối giữ nguyên', ch.smSo().q[n-1], q1, 1e-12);
}

/* ── ⑪ MỐC MẶC ĐỊNH: MỘT NĂM GẦN NHẤT, ĐẾM LÙI TỪ PHIÊN CUỐI ────────────────
   User 26/08: *"nhiều mã có VN-Index cách cổ phiếu quá xa, xa đến nỗi không bao giờ còn
   có thể cắt nhau được nữa"*. Đo 1.471 mã: neo chào sàn cho trung vị 0 lần cắt trong 250
   phiên (chỉ 19% số mã có cắt), neo 250 phiên trước cho trung vị 10 lần (100% số mã).
   ĐẾM LÙI TỪ PHIÊN CUỐI CHUỖI, không phải từ mép khung nhìn — kéo chart không được dời mốc. */
{
  const n=1000, f=i=>[10000*(1+0.3*Math.sin(i/60)), 500*(1+0.1*Math.cos(i/45))];
  const ch=lamMac(); ch.setRows(chuoi(n,f),'d');
  kiem('mặc định = 1 năm -> neo lùi đúng 250 nến', ch.smSo().a, n-1-250);
  kiem('tên mốc mặc định', ch.neoSoNam().ten, '1 năm');
  /* SỐ NĂM CHỌN TỰ DO 1..10 — kiểm CẢ QUÃNG, không chỉ ba nấc cũ. Chạy trên chuỗi 3.000
     nến chứ không phải 1.000: với 1.000 nến thì mọi mốc từ 4 năm trở lên đều kẹp về phiên
     0, và một ca luôn ra 0 thì không phân biệt được đúng với sai. */
  const nd=3000, chD=lamMac(); chD.setRows(chuoi(nd,f),'d');
  for(const nam of [1,2,3,4,5,6,7,8,9,10]){
    chD.neoSoNam(nam);
    kiem('mốc '+nam+' năm -> lùi '+(nam*250)+' nến', chD.smSo().a, nd-1-nam*250);
    kiem('tên mốc '+nam+' năm', chD.neoSoNam().ten, nam+' năm');
  }
  chD.neoSoNam(0);
  kiem('mốc Tất cả -> phiên 0', chD.smSo().a, 0);
  kiem('tên mốc Tất cả', chD.neoSoNam().ten, 'Tất cả');
  /* Số ngoài khoảng bị KẸP chứ không xoay vòng: xoay vòng thì gọi nhầm 11 ra 1 mà không
     ai biết, kẹp thì ra 10 — vẫn sai nhưng sai ở mép, nhìn là thấy. */
  ch.neoSoNam(37); kiem('số năm quá lớn -> kẹp về 10', ch.neoSoNam().nam, 10);
  ch.neoSoNam(-4); kiem('số năm âm -> kẹp về 0', ch.neoSoNam().nam, 0);
  ch.neoSoNam(1);
  /* Chuỗi NGẮN hơn cửa sổ thì lùi hết cỡ chứ đừng để âm */
  const ng=lamMac(); ng.setRows(chuoi(80,f),'d');
  kiem('chuỗi 80 nến < 250 -> neo phiên 0', ng.smSo().a, 0);
  /* Quy theo khung: khung Tuần thì "1 năm" là 52 nến, không phải 250 */
  const tu=lamMac(); tu.setRows(chuoi(400,f),'W');
  kiem('khung Tuần: 1 năm = 52 nến', tu.smSo().a, 400-1-52);
}

/* ── ⑫ MỐC MẶC ĐỊNH KHÔNG TRÔI KHI KÉO CHART ───────────────────────────────
   Đây đúng là điều user bắt lỗi hồi 23/08 với bản cũ. Mốc đếm từ phiên CUỐI CHUỖI nên
   kéo/phóng bao nhiêu cũng không dời; chỉ khi có phiên MỚI nó mới lùi một nến. */
{
  const n=800, f=i=>[10000*(1+0.3*Math.sin(i/50)), 500*(1+0.1*Math.cos(i/40))];
  const ch=lamMac(); ch.setRows(chuoi(n,f),'d');
  const a1=ch.smSo().a, q1=ch.smSo().q[n-1];
  ch.draw();                                   // vẽ lại nhiều lần không đổi gì
  kiem('vẽ lại -> mốc giữ nguyên', ch.smSo().a, a1);
  gan('vẽ lại -> số giữ nguyên', ch.smSo().q[n-1], q1, 1e-12);
  /* thêm một phiên mới -> mốc lùi ĐÚNG một nến */
  const R2=chuoi(n+1,f);
  ch.setRows(R2,'d',true);
  kiem('thêm 1 phiên -> mốc lùi đúng 1 nến', ch.smSo().a, a1+1);
}

/* ── ⑬ BỘ MỐC TRÊN KHUNG: MỘT ô mở bảng chọn, neo tay HAI NHỊP ──────────────
   User 27/08: *"mục chọn 1-3-từ đầu nên để dạng tuỳ chọn"*, *"neo nên là 1 mục riêng, bấm
   vào nút neo xong mới bấm vào vị trí cần neo"*, rồi *"nên đặt tuỳ chọn neo giá vào ô Tất
   cả trong hình, như vậy sẽ gọn hơn"*. Luồng hai nhịp là thứ hỏng IM LẶNG được: chart vẫn
   vẽ đúng, chỉ là bấm xong không có gì xảy ra. Đi qua `bamThu` — đúng đường định tuyến của
   cú bấm thật — chứ môi trường giả không phát được sự kiện chuột. */
{
  const n=900, f=i=>[10000*(1+0.3*Math.sin(i/60)), 500*(1+0.1*Math.cos(i/45))];
  const ch=lamMac(); ch.setRows(chuoi(n,f),'d');
  ch.setInd({rs:true});                      // ô mốc chỉ hiện khi có đường/dải so sánh
  const oNut=k=>ch.khungNhin().oNut.find(o=>o.k===k);
  kiem('bật dải so sánh -> có ô "Mốc"', !!oNut('__moc'), true);
  /* HÀNG Ô CHỈ CÒN MỘT Ô MỐC. Đây đúng là điều user đổi ở lượt cuối: nút Neo dọn vào trong
     bảng cho hàng đỡ chật, nên hàng phải KHÔNG còn ô `__neo` nào. */
  kiem('nút Neo không còn nằm trên hàng ô', !!oNut('__neo'), false);
  /* Chuỗi thử không có sự kiện cổ tức/BCTC nên hai ô đó không hiện — hàng còn đúng
     `rs` + `__moc`, và quan trọng là KHÔNG có ô nào đứng sau `__moc`. */
  kiem('hàng ô còn đúng hai cái', ch.khungNhin().oNut.map(o=>o.k).join(','), 'rs,__moc');

  /* --- bảng chọn số năm --- */
  kiem('chưa bấm -> bảng chọn đóng', ch.mocTrangThai().mo, false);
  const om=()=>oNut('__moc');
  kiem('bấm ô Mốc -> nuốt cú bấm', ch.bamThu(om().x,om().y), 'o');
  kiem('bấm ô Mốc -> bảng mở', ch.mocTrangThai().mo, true);
  const oNam=ch.khungNhin().oNam;
  kiem('bảng có đủ 11 lựa chọn năm', oNam.length, 11);
  kiem('có đủ 1..10 và Tất cả', oNam.map(o=>o.v).join(','), '1,2,3,4,5,6,7,8,9,10,0');
  kiem('bảng có thêm nút Neo', !!ch.khungNhin().oNeo, true);
  /* Nút Neo đứng CẠNH "Tất cả" (cùng hàng ba), không phải một hàng riêng — nếu nó tụt
     xuống hàng bốn thì bảng cao thêm mà user vừa bảo là muốn gọn lại. */
  kiem('nút Neo cùng hàng với "Tất cả"',
       ch.khungNhin().oNeo.y, oNam.find(o=>o.v===0).y);
  const o5=oNam.find(o=>o.v===5);
  kiem('bấm ô "5" -> nuốt cú bấm', ch.bamThu(o5.x,o5.y), 'o');
  kiem('bấm ô "5" -> mốc thành 5 năm', ch.mocTrangThai().nam, 5);
  kiem('chọn xong -> bảng đóng', ch.mocTrangThai().mo, false);
  kiem('mốc 5 năm -> neo lùi 1.250 nến', ch.smSo().a, n-1-1250<0?0:n-1-1250);
  const oAll=(ch.bamThu(om().x,om().y), ch.khungNhin().oNam.find(o=>o.v===0));
  ch.bamThu(oAll.x,oAll.y);
  kiem('bấm "Tất cả" -> neo phiên 0', ch.smSo().a, 0);
  /* Bấm RA NGOÀI bảng: đóng bảng, và nuốt cú bấm để nó không đi tiếp thành ghim phiên */
  ch.bamThu(om().x,om().y);
  kiem('bấm ra ngoài bảng -> nuốt cú bấm', ch.bamThu(400,240), 'o');
  kiem('bấm ra ngoài bảng -> bảng đóng', ch.mocTrangThai().mo, false);
  kiem('bấm ra ngoài bảng -> không ghim nhầm phiên', ch.ghim(), null);

  /* --- neo tay hai nhịp, nút nằm trong bảng --- */
  const bamNeo=()=>{ ch.bamThu(om().x,om().y);            // mở bảng
                     const o=ch.khungNhin().oNeo; return ch.bamThu(o.x,o.y); };
  kiem('chưa bấm Neo -> không ở chế độ chờ', ch.mocTrangThai().cho, false);
  kiem('bấm Neo trong bảng -> nuốt cú bấm', bamNeo(), 'o');
  kiem('bấm Neo -> vào chế độ chờ', ch.mocTrangThai().cho, true);
  /* BẢNG PHẢI ĐÓNG NGAY: nó phủ đúng vùng người ta sắp phải bấm để chọn phiên. */
  kiem('vào chế độ chờ -> bảng đóng', ch.mocTrangThai().mo, false);
  kiem('mới bấm Neo -> chưa neo tay', ch.mocTrangThai().tay, null);
  const kh=ch.khungNhin(), px=300, iMuon=kh.i0+Math.floor(px/kh.cw);
  kiem('nhịp hai: bấm trong khung -> nuốt cú bấm', ch.bamThu(px,240), 'khung');
  kiem('bấm trong khung -> neo đúng phiên vừa bấm', ch.smSo().a, iMuon);
  kiem('neo xong -> thoát chế độ chờ', ch.mocTrangThai().cho, false);
  /* Nhịp hai KHÔNG được ghim phiên: hai việc khác nhau trên cùng một cú bấm là bấm neo
     xong tự dưng mọc thêm một hộp đọc số. */
  kiem('nhịp hai -> không ghim phiên', ch.ghim(), null);
  /* Đang neo tay: nhãn ô Mốc phải in NGÀY neo, vì bảng đóng rồi thì nó là thứ duy nhất
     còn nói được là đang so từ mốc nào. */
  kiem('đang neo tay -> ô Mốc in ngày, không in số năm',
       /^Mốc \d{2}\/\d{2}\/\d{4}$/.test(ch.nhanMoc()), true);
  /* Đang neo tay: nút trong bảng thành "Bỏ neo", bấm là trả về mốc số năm đang chọn */
  ch.bamThu(om().x,om().y);
  kiem('đang neo tay -> nút trong bảng là "Bỏ neo"', ch.tenNutNeo(), '↺ Bỏ neo');
  { const o=ch.khungNhin().oNeo; ch.bamThu(o.x,o.y); }
  kiem('bấm Bỏ neo -> hết mốc tay', ch.mocTrangThai().tay, null);
  kiem('bỏ neo tay -> về mốc "Tất cả" đang chọn', ch.smSo().a, 0);
  kiem('bỏ neo tay -> không vào chế độ chờ', ch.mocTrangThai().cho, false);
  kiem('hết neo tay -> ô Mốc in lại số năm', ch.nhanMoc(), 'Mốc Tất cả');
  /* Chọn số năm ĐÈ lên neo tay — chọn mốc mới là thay mốc cũ, không cộng dồn hai mốc */
  bamNeo(); ch.bamThu(px,240);
  kiem('neo tay lại -> có mốc tay', ch.mocTrangThai().tay!=null, true);
  ch.bamThu(om().x,om().y);
  const o2=ch.khungNhin().oNam.find(o=>o.v===2); ch.bamThu(o2.x,o2.y);
  kiem('chọn số năm -> xoá mốc neo tay', ch.mocTrangThai().tay, null);
  kiem('chọn số năm -> neo theo 2 năm', ch.smSo().a, n-1-500);

  /* --- ô Mốc lúc đang chờ: vừa huỷ chờ vừa mở bảng, không bắt bấm hai lần --- */
  bamNeo();
  kiem('đang chờ -> nhãn ô Mốc đổi hẳn', ch.nhanMoc(), '⚓ Bấm chọn phiên');
  ch.bamThu(om().x,om().y);
  kiem('bấm ô Mốc lúc đang chờ -> huỷ chờ', ch.mocTrangThai().cho, false);
  kiem('bấm ô Mốc lúc đang chờ -> mở luôn bảng', ch.mocTrangThai().mo, true);
  ch.bamThu(400,240);                                   // đóng bảng

  /* --- Esc thoát được cả hai trạng thái dở dang --- */
  bamNeo();
  kiem('Esc khi đang chờ neo -> nuốt phím', ch.cancelTool(), true);
  kiem('Esc -> thoát chế độ chờ', ch.mocTrangThai().cho, false);
  ch.bamThu(om().x,om().y);
  kiem('Esc khi bảng đang mở -> nuốt phím', ch.cancelTool(), true);
  kiem('Esc -> bảng đóng', ch.mocTrangThai().mo, false);
  kiem('Esc lúc không có gì dở -> KHÔNG nuốt phím', ch.cancelTool(), false);

  /* --- tắt hết đường so sánh thì ô mốc biến mất --- */
  ch.setInd({rs:false,idx:false});
  kiem('tắt so sánh -> hết ô Mốc', !!oNut('__moc'), false);
}

console.log('\n'+'─'.repeat(60)+`\n  ĐẠT ${pass} · HỎNG ${fail}\n`);
process.exit(fail?1:0);
