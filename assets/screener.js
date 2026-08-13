/* ============================================================================
   CPScreen — BỘ LỌC bảng giá CPVN: 18 chip lọc nhanh 1 chạm.
   Dữ liệu: data/screen.json (kỹ thuật) + data/fund.json (dẫn xuất từ kho BCTC,
   build_screen.py tự sinh mỗi phiên). Nạp LƯỜI khi người dùng mở panel lần đầu —
   không tốn tải trang cho người không dùng lọc.
   ========================================================================== */
'use strict';
const CPScreen={loaded:false,loading:null,T:{},F:{}};
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
    CPScreen.loaded=true; return true;
  })();
  return CPScreen.loading;
};

/* ---------- tiện ích ------------------------------------------------------- */
CPScreen.pe=c=>{ const p=(c.eps>0&&c.price>0)?c.price/c.eps:(c.pe!=null?+c.pe:null);
  return p!=null&&p>0&&p<1000?p:null; };

/* ============================================================================
   BỘ LỌC PRO — bốn yếu tố đã ĐO ĐƯỢC là bền, cộng hai cổng loại trừ.

   Khác mọi chip còn lại ở một điểm quan trọng: các chip kia là điều kiện của
   RIÊNG một mã (P/E<10, RSI<30…), còn Pro là điều kiện SO VỚI CẢ RỔ — phải xếp
   hạng toàn thị trường rồi mới biết mã nào lọt. Nên nó cần dựng một lượt trên
   toàn bộ danh sách trước khi lọc từng dòng (xem CPScreen.proBuild).

   BỐN YẾU TỐ, chọn theo IC 12 tháng đo trên 97.794 dòng mã-tháng (2020→8/2026),
   chỉ giữ yếu tố GIỮ NGUYÊN DẤU ở cả hai giai đoạn 2020-22 và 2023-26:
     · biến động 60 phiên THẤP        IC −19,8%   (−18,0 / −21,3)
     · vốn hoá LỚN                    IC +18,9%   (+10,0 / +25,8)
     · E/P CAO (rẻ)                   IC +11,5%   (+8,5 / +13,8)
     · GẦN đỉnh 52 tuần               IC +11,1%   (+4,7 / +16,0)
   Chấm điểm = trung bình bốn HẠNG PHẦN TRĂM trong rổ, lấy 30 mã đầu bảng —
   đúng cách danh mục thử nghiệm chạy: 20,2%/năm trong mẫu, 20,4%/năm ngoài mẫu,
   sụt sâu nhất 26% (rổ nền 5,4%/năm, sụt 54%).

   HAI CỔNG LOẠI TRỪ, cũng đo được là có tác dụng:
     · quý gần nhất ĐANG LỖ           IC −5,5%
     · 20% phải thu/doanh thu cao nhất — thêm cổng này nâng 20,3% lên 21,6%/năm
       (chỉ số cơ bản mạnh nhất tìm được: IC −14,3%, trung hoà ngành vẫn −14,4%)
   Thiếu dữ liệu thì CHO QUA chứ không loại — ngân hàng không có khoản mục phải
   thu/doanh thu theo nghĩa này, mà chính nhóm ngân hàng chiếm phần lớn danh mục
   thử nghiệm; loại vì thiếu số là tự tay bỏ đi thứ đã đo ra là tốt.

   KHÔNG PHẢI KHUYẾN NGHỊ MUA BÁN. Đây là thống kê mô tả quá khứ, và quá khứ đó
   chỉ dài 6 năm — xem mục "giới hạn" trong báo cáo nghiên cứu.
   ========================================================================== */
CPScreen.PRO_N=30;                 // số mã giữ lại, bằng đúng danh mục đã thử nghiệm
CPScreen.PRO_LIQ=1e9;              // >=1 tỷ/phiên — dưới mức này mọi kết quả là lý thuyết
CPScreen.PRO_FLAT=30;              // loại mã ĐỨNG GIÁ quá 30% số phiên trong 60 phiên:
                                   // "biến động thấp" của nó là do không chạy chứ không
                                   // phải do lành. Đo trên danh mục thử nghiệm: chặn ở 30%
                                   // ra 20,6%/năm so với 20,3% khi không chặn — ngang nhau
                                   // về lợi nhuận, nhưng bỏ được mã bị ghim giá.
CPScreen._pro=null;                // Set mã đạt, dựng lại mỗi lượt vẽ

CPScreen.proReset=function(){ CPScreen._pro=null; };

CPScreen.proBuild=function(coins){
  const S=new Set();
  /* `CP.coins` LÀ MỘT Map (mã -> coin), KHÔNG phải mảng. Bản đầu viết `!coins.length`
     nên với Map luôn ra undefined -> hàm thoát ngay, bộ lọc trả về RỖNG trên bản chạy
     thật trong khi phép kiểm bằng Node (tự dựng mảng) vẫn xanh. Nhận cả ba dạng cho
     chắc, và `for...of` trên Map trả CẶP [khoá, giá trị] chứ không trả coin. */
  const ds = coins instanceof Map ? [...coins.values()]
           : Array.isArray(coins)  ? coins
           : coins ? Object.values(coins) : [];
  if(!CPScreen.loaded||!ds.length){ CPScreen._pro=S; return S; }
  // --- cổng vào
  const pool=[];
  for(const c of ds){
    const t=CPScreen.T[c.sym]||{}, f=CPScreen.F[c.sym]||{}, p=c.price||0;
    if(!p) continue;
    if((t.avgval20||0)<CPScreen.PRO_LIQ) continue;      // thanh khoản
    if((t.flat60||0)>CPScreen.PRO_FLAT) continue;       // giá bị ghim, không phải ổn định
    if((f.lossQs||0)>=1) continue;                      // đang lỗ
    const cap=c.mcapLive||c.mcap||0;
    const ep=(c.eps>0?c.eps/p:null);
    if(!cap||ep==null||t.vol60==null||t.dhi==null) continue;
    pool.push({sym:c.sym, cap, ep, vol:t.vol60, dhi:t.dhi, rec:f.recRevL});
  }
  if(!pool.length){ CPScreen._pro=S; return S; }
  // --- cổng loại: 20% phải thu/doanh thu CAO NHẤT (mã thiếu số thì cho qua)
  const recs=pool.map(x=>x.rec).filter(x=>x!=null).sort((a,b)=>a-b);
  const nguong=recs.length>=20?recs[Math.floor(recs.length*0.8)]:Infinity;
  const con=pool.filter(x=>x.rec==null||x.rec<=nguong);
  // --- hạng phần trăm từng yếu tố (0..1, cao = tốt)
  const hang=(arr,key,dao)=>{
    const v=arr.slice().sort((a,b)=>dao?(b[key]-a[key]):(a[key]-b[key]));
    const m=new Map(), n=v.length;
    v.forEach((x,i)=>m.set(x.sym, n>1?i/(n-1):1));
    return m;
  };
  const A=hang(con,'vol',true),   // biến động THẤP -> điểm cao
        B=hang(con,'cap',false),  // vốn hoá LỚN
        C=hang(con,'ep',false),   // E/P CAO
        D=hang(con,'dhi',false);  // dhi âm ít -> gần đỉnh
  con.forEach(x=>x.diem=(A.get(x.sym)+B.get(x.sym)+C.get(x.sym)+D.get(x.sym))/4);
  con.sort((a,b)=>b.diem-a.diem);
  con.slice(0,CPScreen.PRO_N).forEach(x=>S.add(x.sym));
  CPScreen._pro=S; return S;
};

/* ---------- CHIPS 1 chạm --------------------------------------------------- */
/* Chip Pro đứng RIÊNG một hàng phía trên, không trộn vào hàng "Lọc nhanh": nó không
   cùng loại với các chip kia (một điều kiện đơn) mà là cả một bộ tiêu chí đã kiểm chứng. */
CPScreen.pro={id:'pro', nm:'Pro',
  mo:'Bốn yếu tố bền nhất đo được trên 6 năm: biến động thấp · vốn hoá lớn · E/P cao · gần đỉnh 52 tuần. '
    +'Loại mã đang lỗ và 20% phải thu/doanh thu cao nhất. Giữ 30 mã đầu bảng.'};

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
  {id:'vol2',  g:'Kỹ thuật', nm:'Vol đột biến ×2'},
  {id:'nn30',  g:'Dòng tiền', nm:'NN mua ròng 30 phiên'},
  {id:'nnd10', g:'Dòng tiền', nm:'NN mua hôm nay ≥ 10 tỷ'},
  {id:'nn60',  g:'Dòng tiền', nm:'NN gom ròng 60 phiên'},
  {id:'q2up',  g:'Sức khoẻ', nm:'2 quý liền lãi tăng ≥ 25%'},
  // chip CÓ THAM SỐ: {n} là chỗ client cắm ô chọn số kỳ. def = số kỳ mặc định.
  {id:'lossQ', g:'Sức khoẻ', nm:'Lỗ {n} quý liên tiếp', opts:[1,2,3,4,5,6,7,8], def:8},
];
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
    // BỘ LỌC PRO: đã dựng sẵn danh sách ở proBuild trước khi lọc, đây chỉ tra thành viên.
    // Nếu chưa dựng (gọi ngoài luồng render) thì dựng ngay từ CP.coins cho an toàn.
    case 'pro':   return (CPScreen._pro||CPScreen.proBuild(CP.coins)).has(c.sym);
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
    default: return true;
  }
};

})();
