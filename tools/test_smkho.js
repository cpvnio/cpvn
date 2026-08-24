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
  return ra;
}

/* ---- so toàn kho ----------------------------------------------------------- */
const ix={}; scr.f.forEach((k,i)=>ix[k]=i);
kiem('screen.json có đủ 5 trường sm',
  ['smNeo','sm20','sm60','sm120','sm250'].every(k=>k in ix), true);

const truong=['smNeo','sm20','sm60','sm120','sm250'];
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

console.log('\n'+'─'.repeat(60)+`\n  ĐẠT ${pass} · HỎNG ${fail}\n`);
process.exit(fail?1:0);
