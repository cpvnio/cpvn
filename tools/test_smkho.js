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
const NAM=[1,2,3,4,5,6,7,8,9,10], NEN=250, BO=20, XU=60, MIN_CUA=150, NGUONG=10;
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
  /* DƯỚI CHỈ SỐ N NĂM, ĐANG ÁP SÁT NHẤT. Dựng lại bằng ĐÚNG công thức của chart (`q` của
     `smArr`) chứ không dùng lối tắt tỉ số của build_screen — hai đường phải ra cùng một đáp
     án thì mới chứng minh được lối tắt đó đúng. */
  for(const N of NAM){
    ra['ap'+N]=null;
    const a=Math.max(0,n-1-N*NEN), lo=a+BO;
    if(n-1-lo<MIN_CUA) continue;
    const c0=P[a], x0=X[a], q=i=>(P[i]/c0)/(X[i]/x0)-1;   // y hệt `q[i]` mà chart.js vẽ ra dải
    if(q(n-1)>=0) continue;                                // ① phải VẪN Ở DƯỚI
    const kc=[]; for(let k=lo;k<n;k++) kc.push(1/(1+q(k))-1);   // khoảng cách, dương = ở dưới
    const nay=kc[kc.length-1];
    if(kc.length<=XU||!(nay<kc[kc.length-1-XU])) continue;  // ② phải đang THU HẸP
    let ganHon=0; for(const v of kc) if(v<nay) ganHon++;
    ra['ap'+N]=Math.round(1000*ganHon/kc.length)/10;
  }
  return ra;
}

/* ---- so toàn kho ----------------------------------------------------------- */
const ix={}; scr.f.forEach((k,i)=>ix[k]=i);
kiem('screen.json có đủ 5 trường sm',
  ['smNeo','sm20','sm60','sm120','sm250'].every(k=>k in ix), true);
kiem('screen.json có đủ 10 trường ap', NAM.every(N=>('ap'+N) in ix), true);
kiem('cột cat*/gn* cũ đã gỡ hẳn',
  NAM.some(N=>('cat'+N) in ix||('gn'+N) in ix), false);

const truong=['smNeo','sm20','sm60','sm120','sm250'].concat(NAM.map(N=>'ap'+N));
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

/* ---- DƯỚI CHỈ SỐ, ĐANG ÁP SÁT: bất biến riêng ----------------------------- */
{
  const V=[];
  for(const sym of Object.keys(scr.d)) for(const N of NAM){
    const v=scr.d[sym][ix['ap'+N]];
    if(v!=null) V.push({sym,N,v});
  }
  kiem('có kha khá giá trị ap để kiểm', V.length>1000, true);
  kiem('mọi phân vị nằm trong [0, 100]', V.every(x=>x.v>=0&&x.v<=100), true);

  /* SOI THẲNG ĐỊNH NGHĨA — ba cổng, kiểm từng cái trên mã lọt lưới. */
  let daKiem=0, sai=[];
  for(const x of V.filter(y=>y.v<=NGUONG).slice(0,60)){
    const h=F(path.join(R,'data','hist',x.sym+'.json'));
    const ixs=CS[SAN_CHISO[SAN[x.sym]]||'']; if(!h||!ixs) continue;
    const P=[],X=[];
    for(let i=0;i<h.t.length;i++){ const c=h.c[i]; if(!c||c<=0) continue;
      const v=ixs[ngay(h.t[i])]; if(!v) continue; P.push(c); X.push(v); }
    const n=P.length, a=Math.max(0,n-1-x.N*NEN), lo=a+BO;
    const c0=P[a], x0=X[a], q=i=>(P[i]/c0)/(X[i]/x0)-1;
    if(!(q(n-1)<0)) sai.push(`${x.sym}/ap${x.N}: đang Ở TRÊN chỉ số (q=${q(n-1).toFixed(4)})`);
    const kc=[]; for(let k=lo;k<n;k++) kc.push(1/(1+q(k))-1);
    const nay=kc[kc.length-1];
    if(!(nay<kc[kc.length-1-XU])) sai.push(`${x.sym}/ap${x.N}: khoảng cách đang GIÃN RA`);
    let ganHon=0; for(const v of kc) if(v<nay) ganHon++;
    const pv=100*ganHon/kc.length;
    if(pv>NGUONG+1e-6) sai.push(`${x.sym}/ap${x.N}: phân vị thật ${pv.toFixed(1)}% > ${NGUONG}%`);
    daKiem++;
  }
  console.log(`  · soi thẳng ba cổng trên ${daKiem} ca`);
  kiem('mã lọt lưới: vẫn ở DƯỚI · khoảng cách đang THU HẸP · phân vị đúng ngưỡng', sai.length, 0);
  if(sai.length) console.log('      ví dụ: '+sai.slice(0,4).join(' · '));

  /* BA CA MẪU USER ĐÃ BẮT — đều phải TRƯỢT ở mọi mốc.
     VBB phá lên +25,7% rồi hạ về · NVB đỉnh đang tụt · VIC/VHM đang ở trên chỉ số. */
  for(const m of ['VBB','NVB','VIC','VHM']){
    if(!scr.d[m]) continue;
    const lot=NAM.filter(N=>{const v=scr.d[m][ix['ap'+N]];return v!=null&&v<=NGUONG;});
    kiem(`${m} không lọt ở mốc nào`, lot.join(',')||'—', '—');
  }
  const dem=N=>Object.keys(scr.d).filter(s=>{const v=scr.d[s][ix['ap'+N]];return v!=null&&v<=NGUONG;}).length;
  kiem('mốc 1 năm bắt được ít nhất vài mã', dem(1)>=5, true);
  console.log('  · chip bắt được (≤'+NGUONG+'%): '+NAM.map(N=>N+' năm '+dem(N)).join(' · '));
}

console.log('\n'+'─'.repeat(60)+`\n  ĐẠT ${pass} · HỎNG ${fail}\n`);
process.exit(fail?1:0);
