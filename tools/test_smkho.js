/* ============================================================================
   KIỂM KHO `sm*` TRONG data/screen.json — chạy: node tools/test_smkho.js

   DỰNG LẠI ĐỘC LẬP từ `data/hist` + `data/chiso` + `universe.json` rồi so từng mã với
   những gì `tools/build_screen.py` đã ghi. Hai bản viết bằng hai ngôn ngữ, không dùng
   chung một dòng code nào — trùng nhau thì mới tin được.

   VÌ SAO CÓ FILE NÀY. Đại lượng `sm*` là thứ mọi phân tích sức mạnh tương đối dựa vào, và
   nó có ba cách hỏng IM LẶNG:
     ① GHÉP THEO VỊ TRÍ MẢNG thay vì theo NGÀY — nến của mã và nến chỉ số lệch nhau ở phiên
        mã bị ngừng giao dịch, ghép theo vị trí là lệch cả chuỗi mà không báo gì;
     ② DÙNG NHẦM CHỈ SỐ SÀN — mã HNX/UPCOM đem so với VNINDEX vẫn ra một con số trông hợp lý;
     ③ MÃ CHƯA ĐỦ N PHIÊN mà vẫn ra số (phải là `null`).
   Cả ba đều không làm build đổ, không làm chart trắng — chỉ làm số sai.

   Chạy sau `build_screen.py`; nếu kho chưa dựng thì tự bỏ qua chứ không báo hỏng.
   ========================================================================== */
'use strict';
const fs=require('fs'), path=require('path');
const R=path.join(__dirname,'..');

let pass=0, fail=0;
const kiem=(ten,thuc,mong)=>{ const ok=Object.is(thuc,mong);
  ok?pass++:fail++;
  console.log(`  ${ok?'✓':'✗'} ${ten}${ok?'':`\n      mong: ${mong}\n      thực: ${thuc}`}`); };

const F=p=>{ try{ return JSON.parse(fs.readFileSync(p,'utf8')); }catch(e){ return null; } };
const scr=F(path.join(R,'data','screen.json'));
if(!scr||!scr.d){ console.log('  (chưa có data/screen.json — bỏ qua)'); process.exit(0); }

/* ---- dựng lại độc lập ------------------------------------------------------ */
const SAN_CHISO={HOSE:'VNINDEX',HNX:'HNX',UPCOM:'UPCOM'};
const CUA=[20,60,120,250];
const NAM=[3,4,5,6,7,8,9,10], NEN=250, CUA_CAT=50, DO_CAT=250, DUOI=600, TY=0.95,
      GN_CUA=500, GN_TY=0.50;
const CS={};
for(const t of new Set(Object.values(SAN_CHISO))){
  const j=F(path.join(R,'data','chiso',t+'.json'));
  const m={}; if(j) j.d.forEach((d,i)=>{ if(j.c[i]) m[d]=j.c[i]; });
  CS[t]=m;
}
const uni=F(path.join(R,'universe.json'));
const SAN={}; (uni&&uni.stocks||[]).forEach(s=>SAN[s.sym]=s.ex);
/* Mốc của kho nến đọc ở UTC+7 mới ra đúng ngày phiên — cùng bài học với kho sự kiện. */
const ngay=t=>new Date((t+25200)*1000).toISOString().slice(0,10);

function tuTinh(sym){
  const h=F(path.join(R,'data','hist',sym+'.json'));
  const ix=CS[SAN_CHISO[SAN[sym]]||''];
  const ra={smNeo:null}; CUA.forEach(W=>ra['sm'+W]=null);
  if(!h||!ix) return ra;
  const P=[],X=[];
  for(let i=0;i<h.t.length;i++){
    const c=h.c[i]; if(!c||c<=0) continue;
    const v=ix[ngay(h.t[i])]; if(!v) continue;
    P.push(c); X.push(v);
  }
  const n=P.length;
  if(n<2) return ra;
  const r2=x=>Math.round(x*100)/100;
  ra.smNeo=r2(((P[n-1]/P[0])/(X[n-1]/X[0])-1)*100);
  for(const W of CUA) if(n>W) ra['sm'+W]=r2(((P[n-1]/P[n-1-W])/(X[n-1]/X[n-1-W])-1)*100);
  /* CẮT LÊN ĐƯỜNG CHỈ SỐ NEO N NĂM, VÀ CÒN GIỮ ĐƯỢC. Dựng lại bằng ĐÚNG công thức của
     chart (`q` của `smArr`) chứ không dùng lối tắt tỉ số của build_screen — hai đường phải
     ra cùng một đáp án thì mới chứng minh được lối tắt đó đúng. */
  for(const N of NAM){
    ra['cat'+N]=null;
    const a=Math.max(0,n-1-N*NEN);
    if(n-1-a<CUA_CAT) continue;
    const c0=P[a], x0=X[a];
    const q=i=>(P[i]/c0)/(X[i]/x0)-1;          // y hệt `q[i]` mà chart.js vẽ ra dải
    if(q(n-1)<=0) continue;                    // đang ở DƯỚI -> không có gì để nói
    const lo=Math.max(a+1,n-1-DO_CAT);
    let i=n-1;
    while(i>lo&&q(i-1)>0) i--;
    if(i<=a+1||q(i-1)>0) continue;             // ở trên từ sau phiên neo, hoặc lâu quá cửa quét
    if(i-DUOI<a) continue;                     // cửa sổ 600 phiên phải nằm trọn sau phiên neo
    let duoi=0; for(let k=i-DUOI;k<i;k++) if(q(k)<=0) duoi++;
    if(duoi<TY*DUOI) continue;                 // chưa đủ "gần như suốt 600 phiên ở dưới"
    ra['cat'+N]=(n-1)-i;
  }
  /* ÁP SÁT CHỈ SỐ Ở MỨC GẦN NHẤT 2 NĂM — đường vào thứ hai của chip. */
  for(const N of NAM){
    ra['gn'+N]=null;
    const a=Math.max(0,n-1-N*NEN), cua=Math.min(GN_CUA,n-1-a);
    if(cua<60) continue;
    const c0=P[a], x0=X[a], q=i=>(P[i]/c0)/(X[i]/x0)-1;
    const lo=n-1-cua;
    let duoi=0; for(let k=lo;k<n;k++) if(q(k)<=0) duoi++;
    if(duoi<GN_TY*(cua+1)) continue;           // không phải mã tụt sau
    let j=n-1; while(j>lo&&q(j-1)<=q(n-1)) j--;
    ra['gn'+N]=(q(j-1)>q(n-1))?(n-1)-j:cua;
  }
  return ra;
}

/* ---- so toàn kho ----------------------------------------------------------- */
const ix={}; scr.f.forEach((k,i)=>ix[k]=i);
kiem('screen.json có đủ 5 trường sm',
  ['smNeo','sm20','sm60','sm120','sm250'].every(k=>k in ix), true);
kiem('screen.json có đủ 8 trường cat', NAM.every(N=>('cat'+N) in ix), true);
kiem('screen.json có đủ 8 trường gn', NAM.every(N=>('gn'+N) in ix), true);

const truong=['smNeo','sm20','sm60','sm120','sm250']
  .concat(NAM.map(N=>'cat'+N)).concat(NAM.map(N=>'gn'+N));
let soSanh=0, lech=[], nullSai=[], thieuKho=0;
for(const sym of Object.keys(scr.d)){
  if(!fs.existsSync(path.join(R,'data','hist',sym+'.json'))){ thieuKho++; continue; }
  const tu=tuTinh(sym), a=scr.d[sym];
  for(const k of truong){
    const A=a[ix[k]], B=tu[k];
    if(A==null&&B==null) continue;
    if(A==null||B==null){ nullSai.push(`${sym}.${k} kho=${A} tự=${B}`); continue; }
    soSanh++;
    if(Math.abs(A-B)>0.011) lech.push(`${sym}.${k} kho=${A} tự=${B}`);
  }
}
console.log(`  · so ${soSanh} con số trên ${Object.keys(scr.d).length} mã (bỏ ${thieuKho} mã không có kho nến)`);
kiem('không con số nào lệch quá 0,01', lech.length, 0);
if(lech.length) console.log('      ví dụ: '+lech.slice(0,5).join(' · '));
kiem('không mã nào một bên null một bên có số', nullSai.length, 0);
if(nullSai.length) console.log('      ví dụ: '+nullSai.slice(0,5).join(' · '));
kiem('có so được kha khá', soSanh>3000, true);

/* ---- bất biến ------------------------------------------------------------- */
const coSan=s=>Object.keys(scr.d).filter(x=>SAN[x]===s);
for(const s of ['HOSE','HNX','UPCOM']){
  const ds=coSan(s).filter(x=>scr.d[x][ix.smNeo]!=null);
  kiem(`sàn ${s} có mã tính được smNeo`, ds.length>50, true);
}
/* Mã HNX/UPCOM PHẢI so với chỉ số sàn của nó — nếu build dùng nhầm VNINDEX cho tất thì
   phép so ở trên đã gãy, nhưng kiểm thẳng một ca cho rõ ý đồ. */
{
  const hnx=coSan('HNX').filter(x=>scr.d[x][ix.sm120]!=null)[0];
  if(hnx){
    const dung=tuTinh(hnx).sm120;
    const saiSan=(()=>{ const h=F(path.join(R,'data','hist',hnx+'.json')), vni=CS.VNINDEX;
      const P=[],X=[];
      for(let i=0;i<h.t.length;i++){ const c=h.c[i]; if(!c||c<=0) continue;
        const v=vni[ngay(h.t[i])]; if(!v) continue; P.push(c); X.push(v); }
      const n=P.length; if(n<=120) return null;
      return Math.round(((P[n-1]/P[n-121])/(X[n-1]/X[n-121])-1)*10000)/100; })();
    kiem(`${hnx} (HNX) khớp bản dùng HNX-Index`, scr.d[hnx][ix.sm120], dung);
    if(saiSan!=null)
      kiem(`${hnx} KHÔNG khớp bản dùng nhầm VNINDEX`, Math.abs(scr.d[hnx][ix.sm120]-saiSan)>0.011, true);
  }
}
/* Mã mới niêm yết: có smNeo nhưng sm250 phải null */
{
  const moi=Object.keys(scr.d).filter(x=>{
    const h=F(path.join(R,'data','hist',x+'.json'));
    return h&&h.t&&h.t.length>20&&h.t.length<250;
  })[0];
  if(moi){
    kiem(`${moi} (${(F(path.join(R,'data','hist',moi+'.json')).t||[]).length} nến) có smNeo`,
      scr.d[moi][ix.smNeo]!=null, true);
    kiem(`${moi} chưa đủ 250 phiên -> sm250 = null`, scr.d[moi][ix.sm250], null);
  }
}

/* ---- CẮT LÊN: bất biến riêng ---------------------------------------------- */
{
  const V=[];
  for(const sym of Object.keys(scr.d)) for(const N of NAM){
    const v=scr.d[sym][ix['cat'+N]];
    if(v!=null) V.push({sym,N,v});
  }
  /* Vết cắt nay HIẾM theo đúng thiết kế (đòi gần như suốt 600 phiên ở dưới), nên ngưỡng cũ
     ">500 vết" là ngưỡng của bản trước — giữ lại là ca kiểm luôn đỏ mà chẳng nói gì. */
  kiem('có vết cắt để kiểm', V.length>0, true);
  /* Trần là ĐÚNG `DO_CAT`, không phải `DO_CAT-1`: đoạn đang-ở-trên được phép bắt đầu ngay
     tại mép cửa quét (`n-1-DO_CAT`), nên tuổi lớn nhất bằng chính `DO_CAT`. */
  kiem('mọi tuổi vết cắt nằm trong [0, '+DO_CAT+']',
    V.every(x=>Number.isInteger(x.v)&&x.v>=0&&x.v<=DO_CAT), true);

  /* CHUỖI NGẮN HƠN CỬA SỔ THÌ PHẢI NULL — tại phiên neo hai đường trùng nhau theo định
     nghĩa, nên nếu mốc neo lọt vào chính 50 phiên đang hỏi thì "vừa cắt" mất hết nghĩa. */
  const ngan=Object.keys(scr.d).filter(x=>{
    const h=F(path.join(R,'data','hist',x+'.json'));
    return h&&h.t&&h.t.length>5&&h.t.length<50;
  });
  if(ngan.length)
    kiem(`${ngan.length} mã dưới 50 phiên -> cat* đều null`,
      ngan.every(x=>NAM.every(N=>scr.d[x][ix['cat'+N]]==null)), true);

  /* KIỂM THẲNG ĐỊNH NGHĨA trên vài ca. Ba điều phải đúng cùng lúc, và điều thứ ba mới là
     thứ user sẽ kiểm bằng mắt khi mở chart lên: HIỆN VẪN ĐANG Ở TRÊN. */
  let daKiem=0, sai=[];
  for(const x of V.slice(0,60)){
    const h=F(path.join(R,'data','hist',x.sym+'.json'));
    const ixs=CS[SAN_CHISO[SAN[x.sym]]||'']; if(!h||!ixs) continue;
    const P=[],X=[];
    for(let i=0;i<h.t.length;i++){ const c=h.c[i]; if(!c||c<=0) continue;
      const v=ixs[ngay(h.t[i])]; if(!v) continue; P.push(c); X.push(v); }
    const n=P.length, a=Math.max(0,n-1-x.N*NEN);
    const c0=P[a], x0=X[a], q=i=>(P[i]/c0)/(X[i]/x0)-1;
    const j=(n-1)-x.v;
    if(!(q(j-1)<=0&&q(j)>0))
      sai.push(`${x.sym}/cat${x.N}: q(${j-1})=${q(j-1).toFixed(4)} q(${j})=${q(j).toFixed(4)} — không đổi dấu`);
    if(!(q(n-1)>0))
      sai.push(`${x.sym}/cat${x.N}: hiện đang Ở DƯỚI (q=${q(n-1).toFixed(4)})`);
    for(let i=j+1;i<n;i++) if(q(i)<=0)
      { sai.push(`${x.sym}/cat${x.N}: đã rơi lại xuống ở phiên ${i}`); break; }
    daKiem++;
  }
  console.log(`  · soi thẳng định nghĩa trên ${daKiem} ca`);
  kiem('q đổi dấu đúng phiên được chỉ ra · từ đó tới nay KHÔNG rơi lại · hiện đang ở TRÊN',
    sai.length, 0);
  if(sai.length) console.log('      ví dụ: '+sai.slice(0,4).join(' · '));

  /* MỐC DÀI HƠN THÌ KHÓ CẮT HƠN — đường neo càng xa thì khoảng hở tích luỹ càng lớn.
     Không phải luật cứng cho từng mã, nhưng trên cả kho thì phải thấy rõ. */
  /* HAI ĐƯỜNG VÀO CỦA CHIP — đếm đúng thứ giao diện hỏi. */
  const dem=N=>Object.keys(scr.d).filter(s=>{
    const c=scr.d[s][ix['cat'+N]], g=scr.d[s][ix['gn'+N]];
    return (c!=null&&c<=CUA_CAT)||(g!=null&&g>=GN_CUA);}).length;
  const demCat=N=>Object.keys(scr.d).filter(s=>{const v=scr.d[s][ix['cat'+N]];return v!=null&&v<=CUA_CAT;}).length;
  kiem('đường "áp sát 2 năm" nới thêm được so với chỉ xét vết cắt', dem(5)>demCat(5), true);
  /* `gn` không bao giờ vượt cửa sổ, và cửa sổ tối đa là 2 năm. */
  const G=[];
  for(const sym of Object.keys(scr.d)) for(const N of NAM){
    const v=scr.d[sym][ix['gn'+N]]; if(v!=null) G.push(v);
  }
  kiem('mọi giá trị gn nằm trong [0, '+GN_CUA+']',
    G.every(v=>Number.isInteger(v)&&v>=0&&v<=GN_CUA), true);
  /* MỌI MÃ LỌT LƯỚI PHẢI ĐANG Ở TRÊN — đây là bất biến user kiểm được bằng mắt, và là thứ
     phân biệt bản này với bản đầu (bản đầu nhận cả vết cắt đã bị xoá ngay sau đó, khoảng
     một nửa số mã lọt lưới đang nằm lại dưới đường chỉ số). */
  let duoi=0;
  for(const N of NAM) for(const sym of Object.keys(scr.d)){
    const v=scr.d[sym][ix['cat'+N]]; if(v==null) continue;
    const tu=tuTinh(sym); if(tu['cat'+N]==null) duoi++;
  }
  kiem('không mã nào được chấm "vừa cắt lên" mà đang ở dưới', duoi, 0);
  console.log(`  · chip bắt được: 3 năm ${dem(3)} mã · 5 năm ${dem(5)} · 10 năm ${dem(10)}`
    +`   (riêng vết cắt: ${demCat(3)} · ${demCat(5)} · ${demCat(10)})`);
}

console.log('\n'+'─'.repeat(60)+`\n  ĐẠT ${pass} · HỎNG ${fail}\n`);
process.exit(fail?1:0);
