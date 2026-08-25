/* ============================================================================
   CPScreen — BỘ LỌC bảng giá CPVN: 18 chip lọc nhanh 1 chạm.
   Dữ liệu: data/screen.json (kỹ thuật) + data/fund.json (dẫn xuất từ kho BCTC,
   build_screen.py tự sinh mỗi phiên). Nạp LƯỜI khi người dùng mở panel lần đầu —
   không tốn tải trang cho người không dùng lọc.
   ========================================================================== */
'use strict';
const CPScreen={loaded:false,loading:null,T:{},F:{},IX:null};
(function(){

/* ---------- nạp dữ liệu ---------------------------------------------------- */
CPScreen.load=function(){
  if(CPScreen.loading) return CPScreen.loading;
  CPScreen.loading=(async()=>{
    const [sc,fd]=await Promise.all([
      fetch('data/screen.json').then(r=>r.ok?r.json():null).catch(()=>null),
      fetch('data/fund.json').then(r=>r.ok?r.json():null).catch(()=>null),
    ]);
    if(!sc||!sc.d||!fd||!fd.d) return false;
    // hai file lưu dạng CỘT: f = tên trường, d[MÃ] = mảng giá trị cùng thứ tự
    const unpack=pk=>{const M={};for(const s in pk.d){const a=pk.d[s],o={};
      pk.f.forEach((k,i)=>o[k]=a[i]);M[s]=o;}return M;};
    CPScreen.T=unpack(sc); CPScreen.F=unpack(fd);
    CPScreen.IX=sc.ix||null;          // trạng thái VN-Index cho cổng "cách nền"
    CPScreen.loaded=true; return true;
  })();
  return CPScreen.loading;
};

/* ---------- tiện ích ------------------------------------------------------- */
CPScreen.pe=c=>{ const p=(c.eps>0&&c.price>0)?c.price/c.eps:(c.pe!=null?+c.pe:null);
  return p!=null&&p>0&&p<1000?p:null; };

/* BỘ LỌC PRO ĐÃ BỎ HẲN 16/08/2026 — ĐỪNG DỰNG LẠI.
   `PRO_N`, `PRO_LIQ`, `PRO_FLAT`, `_pro`, `proReset()`, `proBuild()`, `CPScreen.pro`,
   nhánh `case 'pro'`, hàng chip riêng trong index.html và CSS `.chippro` đều xoá.

   Vì sao bỏ: nó là chip DUY NHẤT không phải một điều kiện đo được của riêng một mã
   (P/E<10, RSI<30…) mà là **danh sách 30 mã do chủ trang chọn ra** — bốn yếu tố, ba cổng
   loại, rồi cắt top 30. Dù mỗi yếu tố đều đo được và mô tả là thống kê quá khứ, thứ người
   dùng nhận về vẫn là "đây là 30 mã", tức một danh mục gợi ý. Cộng thêm việc chủ trang có
   nắm giữ cổ phiếu Việt Nam, đó là hình dạng mà khoản 32 Điều 4 Luật CK và điều khoản thao
   túng (Luật CK sửa đổi 2024: đưa ra ý kiến sau khi đã nắm giữ vị thế) cùng nhắm tới.
   User chốt bỏ.

   `vol60` / `flat60` / `recRevL` trong screen.json và fund.json VẪN GIỮ: chúng là con số
   ĐO ĐƯỢC từ dữ liệu công khai (độ lệch chuẩn lợi suất, tỉ lệ phiên đứng giá, phải thu trên
   doanh thu), không phải ý kiến — và là nguyên liệu sẵn nếu sau này muốn làm chip THƯỜNG
   cho từng chỉ số đó, loại chip mà người dùng tự đặt ngưỡng. */

/* ---------- CHIPS 1 chạm --------------------------------------------------- */
CPScreen.chips=[
  {id:'vn30',  g:'Rổ · quy mô', nm:'Rổ VN30'},
  {id:'cap10k',g:'Rổ · quy mô', nm:'Vốn hoá ≥ 10.000 tỷ'},
  {id:'pe10',  g:'Định giá', nm:'P/E < 10'},
  {id:'pb1',   g:'Định giá', nm:'P/B < 1'},
  {id:'eps3k', g:'Định giá', nm:'EPS > 3.000đ'},
  {id:'dy5',   g:'Định giá', nm:'Cổ tức ≥ 5%'},
  {id:'cash20',g:'Sức khoẻ', nm:'Tiền mặt > 20% vốn hoá'},
  {id:'npup',  g:'Sức khoẻ', nm:'LNST năm tăng'},
  {id:'noloss',g:'Sức khoẻ', nm:'8 năm không lỗ'},
  {id:'roe15', g:'Sức khoẻ', nm:'ROE ≥ 15%'},
  {id:'ma200', g:'Kỹ thuật', nm:'Giá > MA200'},
  {id:'trend', g:'Kỹ thuật', nm:'Xu hướng tăng'},
  {id:'rsi30', g:'Kỹ thuật', nm:'RSI < 30 (quá bán)'},
  {id:'rsi80m',g:'Kỹ thuật', nm:'Lần đầu trong tháng RSI > {n}', opts:[70,75,80], def:80},
  {id:'hi52',  g:'Kỹ thuật', nm:'Gần đỉnh 52 tuần'},
  /* MÃ TỤT SAU CHỈ SỐ NAY ÁP SÁT — đo trên đúng đường chart trang mã vẽ ở mốc "N năm".
     Mã của sàn nào so với chỉ số sàn ấy (HOSE→VN-Index · HNX→HNX-Index · UPCOM→UPCOM).
     Số năm từ 3 trở lên: dưới 3 thì cửa sổ 600 phiên không nằm lọt sau phiên neo. */
  {id:'catN',  g:'Kỹ thuật', nm:'Tụt sau chỉ số {n} năm, nay áp sát nhất 2 năm',
   opts:[3,4,5,6,7,8,9,10], def:5},
  {id:'vol2',  g:'Kỹ thuật', nm:'Vol đột biến ×2'},
  {id:'nn30',  g:'Dòng tiền', nm:'NN mua ròng 30 phiên'},
  {id:'nnd10', g:'Dòng tiền', nm:'NN mua hôm nay ≥ 10 tỷ'},
  {id:'nn60',  g:'Dòng tiền', nm:'NN gom ròng 60 phiên'},
  {id:'q2up',  g:'Sức khoẻ', nm:'2 quý liền lãi tăng ≥ 25%'},
  // chip CÓ THAM SỐ: {n} là chỗ client cắm ô chọn số kỳ. def = số kỳ mặc định.
  {id:'lossQ', g:'Sức khoẻ', nm:'Lỗ {n} quý liên tiếp', opts:[1,2,3,4,5,6,7,8], def:8},
  /* ---- NĂM CHIP ĐÃ GỠ 26/08/2026 — ĐỌC TRƯỚC KHI DỰNG LẠI --------------------------
     `capmin` · `gtgd60` · `smHon` · `smKem` · `smManh` đã bỏ khỏi giao diện theo yêu cầu
     user: bộ này dựng trên giả thuyết *"mã tụt hậu rồi bùng nổ"*, mà thống kê chạy lại trên
     thước đúng đã BÁC nó — `sm60 < 0` cho PF **1,29**, THẤP HƠN nền 1,45; còn `sm60 > 0` chỉ
     lên 1,61, và cửa sổ 250 phiên thì không có tín hiệu gì (mọi ô 1,42–1,46). Xem mục
     *THỐNG KÊ CHẠY LẠI TRÊN THƯỚC ĐÚNG* trong CLAUDE.md.

     DỮ LIỆU THÌ GIỮ NGUYÊN: `screen.json` vẫn có `smNeo`/`sm20`/`sm60`/`sm120`/`sm250`,
     `avgval60` và khối `ix`. Chúng tính trong cùng vòng lặp của `build_screen` nên gần như
     miễn phí, và đợt research bộ lọc mới sẽ cần đúng mấy trường đó. Dựng lại chip chỉ là
     thêm vài dòng vào mảng này cộng mấy nhánh `case` bên dưới. */];
CPScreen.def=id=>{const x=CPScreen.chips.find(c=>c.id===id);return x&&x.def||0;};
/* n = số kỳ người dùng chọn, chỉ có nghĩa với chip mang opts */
CPScreen.chip=function(id,c,n){
  /* CHIP NHÓM THEO DÕI ('nhom:<id>'): rổ mã chọn tay khai trong universe.json. Nó là một
     TIÊU CHÍ LỌC, không phải một ngành — xếp thành ngành thì mã bị bốc khỏi ngành gốc và
     mọi thống kê theo ngành méo theo. */
  if(id.startsWith('nhom:')){ const g=CP.nhomTheoKhoa(id); return !!g&&g.set.has(c.sym); }
  const t=CPScreen.T[c.sym]||{},f=CPScreen.F[c.sym]||{},p=c.price||0;
  n=n||CPScreen.def(id);
  switch(id){
    // hai chip này KHÔNG cần kho chỉ báo, chỉ đọc thẳng universe -> lọc nhanh dùng được ngay
    case 'vn30':  return CP.vn30.has(c.sym);
    case 'cap10k':return (c.mcapLive||c.mcap||0)>=1e13;      // 10.000 tỷ đồng
    case 'pe10':  { const v=CPScreen.pe(c); return v!=null&&v<10; }
    case 'pb1':   return c.pb!=null&&c.pb>0&&c.pb<1;
    case 'eps3k': return (c.eps||0)>3000;
    case 'dy5':   return p>0&&(f.divCash||0)/p>=0.05;
    case 'cash20':return (c.cash||0)*1e9>0.2*(c.mcapLive||c.mcap||Infinity);
    case 'npup':  return (f.npChg1??-1)>0;
    case 'noloss':return (f.yrsProfit||0)>=8;
    case 'roe15': return (f.roe||0)>=15;
    case 'ma200': return p>0&&t.ma200!=null&&p>t.ma200;
    case 'trend': return p>0&&t.ma20&&t.ma50&&t.ma200&&p>t.ma20&&t.ma20>t.ma50&&t.ma50>t.ma200;
    case 'rsi30': return t.rsi!=null&&t.rsi<30;
    /* LẦN ĐẦU TRONG THÁNG vượt RSI n (khung ngày), n chọn được 70/75/80.
       Kho ghi `rsiPM` = RSI CAO NHẤT các phiên TRƯỚC ĐÓ trong cùng tháng; client so hai
       số là ra. Ghi một CON SỐ thay vì một cờ cho riêng ngưỡng 80 nên đổi ngưỡng không
       phải dựng lại kho — và ngưỡng nào cũng hỏi được, không chỉ ba mức này.
       Client KHÔNG tự tính được phần lịch sử: kho chỉ báo chỉ giữ giá trị phiên gần nhất.
       Khác hẳn "RSI > n": mã nóng nằm trên ngưỡng cả chục phiên liền thì ngày nào cũng
       lọt, tín hiệu mất hết ý nghĩa. `rsiPM` rỗng = hôm nay là phiên ĐẦU THÁNG. */
    case 'rsi80m':return t.rsi!=null&&t.rsi>n&&(t.rsiPM==null||t.rsiPM<=n);
    case 'hi52':  return t.dhi!=null&&t.dhi>=-15;
    /* MÃ TỤT SAU CHỈ SỐ NAY ÁP SÁT — HAI ĐƯỜNG VÀO, đạt một trong hai là được:
         · `catN` = số phiên kể từ lúc CẮT LÊN thật và còn giữ được (kho đã đòi gần như suốt
           600 phiên trước đó phải ở dưới) -> hỏi ≤ 50 phiên;
         · `gnN`  = khoảng hở với chỉ số đang là ĐỈNH của bao nhiêu phiên -> hỏi ≥ 500 phiên,
           tức đang áp sát chỉ số ở mức gần nhất 2 năm (kể cả chưa cắt lên).
       Đường thứ hai có vì đường thứ nhất quá chặt — chỉ 1–3 mã mỗi mốc.
       Ghi SỐ thay vì cờ nên đổi cửa sổ không phải dựng lại kho — cùng lối với `rsiPM`.
       `null` phải TRƯỢT, đừng viết kiểu `!(v>50)`: `null` lọt qua mọi phép so là bảng trộn
       mã đạt với mã không có dữ liệu, mà nhìn không ra. */
    case 'catN':  { const c=t['cat'+n], g=t['gn'+n];
                    return (c!=null&&c<=50)||(g!=null&&g>=500); }
    case 'vol2':  return (t.volr||0)>=2;
    case 'nn30':  return (t.nn20||0)>0;
    case 'nnd10': return (c.fbuy||0)*p>=1e10;
    // gom BỀN: mua ròng suốt 60 phiên VÀ chiếm >=3% giá trị giao dịch — bỏ những mã
    // chỉ dương nhờ đúng một phiên mua lớn rồi thôi
    case 'nn60':  return (t.nn60||0)>0&&(t.nnr60||0)>=3;
    // HAI quý LIÊN TIẾP lãi tăng >=25% so với CÙNG KỲ năm trước (mốc 25% của CAN SLIM).
    // So cùng kỳ chứ không so quý liền trước — tránh nhiễu mùa vụ.
    case 'q2up':  return (f.npQ??-9)>=25&&(f.npQ2??-9)>=25;
    // N quý gần nhất LIÊN TIẾP lỗ — kho lưu độ dài chuỗi lỗ, đứt một quý là về 0
    case 'lossQ': return (f.lossQs||0)>=n;
    /* Nhánh của năm chip đã gỡ (`capmin`/`gtgd60`/`smHon`/`smKem`/`smManh`) xoá cùng lượt
       26/08/2026 — xem ghi chú ở mảng `chips`. */
    default: return true;
  }
};

})();
