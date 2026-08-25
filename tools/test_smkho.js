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
const NAM=[1,2,3,4,5,6,7,8,9,10], NEN=250, CUA_NEO=10;   // CUA_NEO = "xét 10 phiên gần nhất"
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
  /* VỊ TRÍ SO VỚI CHỈ SỐ NEO N NĂM, xét 10 phiên gần nhất. Dựng lại bằng ĐÚNG công thức của
     chart (`q` của `smArr`) chứ không dùng lối tắt tỉ số của build — hai đường phải ra cùng
     đáp án thì mới chứng minh lối tắt đúng. loN/hiN = min/max của q trên 10 phiên cuối (%). */
  for(const N of NAM){
    ra['lo'+N]=null; ra['hi'+N]=null;
    const a=n-1-N*NEN;
    if(a<0) continue;                                     // chưa đủ N năm -> null, y build
    const c0=P[a], x0=X[a], q=i=>(P[i]/c0)/(X[i]/x0)-1;   // y hệt `q[i]` chart.js vẽ ra dải
    let w0=n-CUA_NEO; if(w0<=a) w0=a+1;
    let lo=Infinity, hi=-Infinity;
    for(let i=w0;i<n;i++){ const v=q(i); if(v<lo)lo=v; if(v>hi)hi=v; }
    ra['lo'+N]=Math.round(100*lo*100)/100;
    ra['hi'+N]=Math.round(100*hi*100)/100;
  }
  return ra;
}

/* ---- so toàn kho ----------------------------------------------------------- */
const ix={}; scr.f.forEach((k,i)=>ix[k]=i);
kiem('screen.json có đủ 5 trường sm',
  ['smNeo','sm20','sm60','sm120','sm250'].every(k=>k in ix), true);
kiem('screen.json có đủ 20 trường lo/hi', NAM.every(N=>('lo'+N) in ix&&('hi'+N) in ix), true);
kiem('cột cat*/gn* cũ đã gỡ hẳn',
  NAM.some(N=>('cat'+N) in ix||('gn'+N) in ix||('ap'+N) in ix), false);

const truong=['smNeo','sm20','sm60','sm120','sm250'].concat(NAM.map(N=>'lo'+N)).concat(NAM.map(N=>'hi'+N));
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

/* ---- BA THƯỚC dưới / trên / vừa cắt: bất biến riêng ----------------------- */
{
  const g=(sym,N,k)=>scr.d[sym][ix[k+N]];
  const co  =(s,N)=>g(s,N,'lo')!=null&&g(s,N,'hi')!=null;
  const duoi=(s,N)=>co(s,N)&&g(s,N,'hi')<0;              // dưới đường suốt 10 phiên
  const tren=(s,N)=>co(s,N)&&g(s,N,'lo')>0;              // trên đường suốt 10 phiên
  const cat =(s,N)=>co(s,N)&&g(s,N,'lo')<0&&g(s,N,'hi')>0; // có mặt hai phía -> vừa cắt
  const syms=Object.keys(scr.d);

  // lo ≤ hi (min ≤ max) ở mọi mốc
  let loHi=0, badLoHi=[];
  for(const s of syms) for(const N of NAM) if(co(s,N)){ loHi++;
    if(g(s,N,'lo')>g(s,N,'hi')+1e-9) badLoHi.push(`${s}/${N}`); }
  kiem('có kha khá cặp lo/hi để kiểm', loHi>2000, true);
  kiem('lo ≤ hi ở mọi mốc', badLoHi.length, 0);

  // BA TẬP RỜI NHAU: không mã nào rơi vào hai nhóm cùng một mốc
  let chong=[];
  for(const s of syms) for(const N of NAM) if(duoi(s,N)+tren(s,N)+cat(s,N)>1) chong.push(`${s}/${N}`);
  kiem('dưới/trên/vừa cắt rời nhau (không mã nào ở hai nhóm cùng mốc)', chong.length, 0);

  // GẦN VÉT CẠN: cặp lo/hi nào cũng rơi vào một trong ba, trừ ca chạm đúng vạch 0
  let ngoai=[];
  for(const s of syms) for(const N of NAM) if(co(s,N)&&!duoi(s,N)&&!tren(s,N)&&!cat(s,N)){
    if(Math.abs(g(s,N,'lo'))>1e-9&&Math.abs(g(s,N,'hi'))>1e-9)
      ngoai.push(`${s}/${N} lo=${g(s,N,'lo')} hi=${g(s,N,'hi')}`);
  }
  kiem('mọi cặp lo/hi thuộc dưới|trên|vừa cắt (trừ ca chạm đúng vạch 0)', ngoai.length, 0);
  if(ngoai.length) console.log('      ví dụ: '+ngoai.slice(0,4).join(' · '));

  const demD=N=>syms.filter(s=>duoi(s,N)).length;
  const demT=N=>syms.filter(s=>tren(s,N)).length;
  const demC=N=>syms.filter(s=>cat(s,N)).length;
  kiem('mốc 1 năm: DƯỚI có mã',    demD(1)>=5, true);
  kiem('mốc 1 năm: TRÊN có mã',    demT(1)>=5, true);
  kiem('mốc 1 năm: VỪA CẮT có mã', demC(1)>=1, true);

  // Soi thẳng đường q trên vài chục ca "vừa cắt": phải có q hai phía 0 và số khớp
  let daKiem=0, sai=[];
  const catList=[]; for(const s of syms) for(const N of NAM) if(cat(s,N)) catList.push({s,N});
  for(const x of catList.slice(0,60)){
    const h=F(path.join(R,'data','hist',x.s+'.json'));
    const ixs=CS[SAN_CHISO[SAN[x.s]]||'']; if(!h||!ixs) continue;
    const P=[],X=[];
    for(let i=0;i<h.t.length;i++){ const c=h.c[i]; if(!c||c<=0) continue;
      const v=ixs[ngay(h.t[i])]; if(!v) continue; P.push(c); X.push(v); }
    const n=P.length, a=n-1-x.N*NEN; if(a<0) continue;
    const c0=P[a],x0=X[a],q=i=>(P[i]/c0)/(X[i]/x0)-1;
    let w0=n-CUA_NEO; if(w0<=a) w0=a+1;
    let lo=Infinity,hi=-Infinity; for(let i=w0;i<n;i++){ const v=q(i); if(v<lo)lo=v; if(v>hi)hi=v; }
    if(!(lo<0&&hi>0)) sai.push(`${x.s}/${x.N}: kho bảo cắt nhưng tự tính lo=${(100*lo).toFixed(2)} hi=${(100*hi).toFixed(2)}`);
    const LO=Math.round(100*lo*100)/100, HI=Math.round(100*hi*100)/100;
    if(Math.abs(LO-g(x.s,x.N,'lo'))>0.011||Math.abs(HI-g(x.s,x.N,'hi'))>0.011)
      sai.push(`${x.s}/${x.N}: kho ${g(x.s,x.N,'lo')}/${g(x.s,x.N,'hi')} vs tự ${LO}/${HI}`);
    daKiem++;
  }
  console.log(`  · soi thẳng đường q trên ${daKiem} ca "vừa cắt"`);
  kiem('mã "vừa cắt" thật sự có q hai phía vạch 0 · số khớp', sai.length, 0);
  if(sai.length) console.log('      ví dụ: '+sai.slice(0,4).join(' · '));

  // Chẩn đoán vài mã quen (không assert cứng — chỉ in để thấy phân loại có lý)
  for(const m of ['VIC','VHM','NVB','VBB']){
    if(!scr.d[m]) continue;
    const lab=N=>duoi(m,N)?'dưới':tren(m,N)?'trên':cat(m,N)?'cắt':(co(m,N)?'~0':'—');
    console.log(`  · ${m}: `+NAM.map(N=>N+lab(N)).join(' '));
  }
  console.log('  · dưới|trên|cắt theo mốc: '+NAM.map(N=>N+'n '+demD(N)+'/'+demT(N)+'/'+demC(N)).join(' · '));
}

console.log('\n'+'─'.repeat(60)+`\n  ĐẠT ${pass} · HỎNG ${fail}\n`);
process.exit(fail?1:0);
