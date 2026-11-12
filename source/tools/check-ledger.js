// ตัวตรวจความสอดคล้องของบัญชี (อ่านอย่างเดียว ไม่แก้ข้อมูล)
// ใช้: node tools/check-ledger.js export.json   (ไฟล์ {"db":{...},"tkw":{...}} ที่ export จากเบราว์เซอร์)
// ยอดสรุปประจำวัน (ย/ม รับจำนำ ไถ่ถอน คงเหลือ) ผู้ใช้กรอกเอง แอปไม่คำนวณให้ จึงตรวจ "ความสอดคล้อง" ไม่ใช่คำนวณใหม่
const SUM='สรุปประจำวัน';
const num=v=>{const x=Number(String(v==null?'':v).replace(/,/g,''));return isFinite(x)?x:0};
const str=v=>String(v==null?'':v).trim();
const isDay=k=>/^\d{4}-\d{2}-\d{2}$/.test(k);

function summaryOf(day){
  const s=(day&&day.data&&day.data[SUM])||[]; const g=t=>{const r=s.find(x=>x&&x.type===t); return {a:r?num(r.amount):0,c:r?num(r.count):0};};
  return {ym:g('ย/ม'),rp:g('รับจำนำ'),tk:g('ไถ่ถอน'),kh:g('คงเหลือ')};
}
function ledgerRows(day){ // ตั๋วเดิมทุกแถวที่มีเลขตั๋ว
  const out=[]; ((day&&day.months)||[]).forEach(m=>{ (((day.data||{})[m])||[]).forEach(r=>{ if(r&&str(r.ticket)!=='') out.push({t:str(r.ticket),b:str(r.book),a:num(r.amount),m}); }); }); return out;
}
function tkwRows(store,k){
  const d=store&&store[k]; const out=[]; if(!d||!d.r) return out;
  d.r.forEach((col,g)=>(col||[]).forEach((x,i)=>{ if(x&&str(x[0])!=='') out.push({t:str(x[0]),b:str(x[2]),a:num(x[1]),g,i}); }));
  return out;
}

/** ตรวจยอดสรุป: สูตร / ยกมาต่อเนื่อง / ไถ่ถอนเท่าผลรวมตั๋ว */
function checkSummary(db){
  const issues=[]; const ks=Object.keys(db).filter(isDay).sort(); let prev=null;
  ks.forEach(k=>{
    const day=db[k], s=summaryOf(day), rows=ledgerRows(day);
    const hasData=rows.length>0||s.kh.a!==0||s.ym.a!==0;
    if(s.ym.a+s.rp.a-s.tk.a!==s.kh.a) issues.push({day:k,kind:'สูตรไม่ตรง',msg:`ย/ม ${s.ym.a} + รับจำนำ ${s.rp.a} − ไถ่ถอน ${s.tk.a} ≠ คงเหลือ ${s.kh.a}`});
    if(s.ym.c+s.rp.c-s.tk.c!==s.kh.c) issues.push({day:k,kind:'จำนวนรายไม่ตรง',msg:`ย/ม ${s.ym.c} + รับ ${s.rp.c} − ไถ่ ${s.tk.c} ≠ คงเหลือ ${s.kh.c}`});
    if(prev&&(prev.kh.a!==0||prev.kh.c!==0)&&(s.ym.a!==prev.kh.a||s.ym.c!==prev.kh.c)) issues.push({day:k,kind:'ยกมาไม่ต่อเนื่อง',msg:`ย/ม ${s.ym.a}/${s.ym.c} ≠ คงเหลือวันก่อน (${prev.day}) ${prev.kh.a}/${prev.kh.c}`});
    if(rows.length){ const sum=rows.reduce((t,r)=>t+r.a,0); if(sum!==s.tk.a||rows.length!==s.tk.c) issues.push({day:k,kind:'ไถ่ถอนไม่เท่าตั๋วในตาราง',msg:`สรุป ${s.tk.c} ราย/${s.tk.a} แต่ตารางรวม ${rows.length} ใบ/${sum}`}); }
    if(hasData) prev={day:k,kh:s.kh};
  });
  return issues;
}

/** เทียบตารางเขียนตั๋วกับตั๋วเดิมในบัญชีของวันนั้น (จับด้วย เลขตั๋ว+เล่มที่) */
function checkTkw(db,store,k){
  const L=ledgerRows(db[k]), T=tkwRows(store,k), key=x=>x.t+'|'+x.b;
  const group=a=>{const m=new Map(); a.forEach(x=>m.set(key(x),(m.get(key(x))||[]).concat(x))); return m;};
  const lm=group(L), tm=group(T);
  const r={
    tkwRows:T.length, ledgerRows:L.length, tkwSum:T.reduce((s,x)=>s+x.a,0), ledgerSum:L.reduce((s,x)=>s+x.a,0),
    onlyInTkw:T.filter(x=>!lm.has(key(x))), onlyInLedger:L.filter(x=>!tm.has(key(x))),
    amountDiffs:[], duplicatesInTkw:[], missingBook:T.filter(x=>x.b==='')
  };
  T.forEach(x=>{const m=lm.get(key(x)); if(m&&m[0].a!==x.a) r.amountDiffs.push({t:x.t,b:x.b,tkw:x.a,ledger:m[0].a});});
  tm.forEach((v,kk)=>{ if(v.length>1) r.duplicatesInTkw.push({key:kk,times:v.length,amounts:v.map(z=>z.a)}); });
  r.diffSum=r.tkwSum-r.ledgerSum;
  return r;
}

module.exports={checkSummary,checkTkw,summaryOf,ledgerRows,tkwRows};

if(require.main===module){
  const f=process.argv[2]; if(!f){ console.log('ใช้: node tools/check-ledger.js export.json [YYYY-MM-DD]'); process.exit(2); }
  const j=JSON.parse(require('fs').readFileSync(f,'utf8')); const iss=checkSummary(j.db||{});
  console.log(iss.length?iss.map(i=>`✗ ${i.day} ${i.kind}: ${i.msg}`).join('\n'):'✓ ยอดสรุปสอดคล้องทุกวัน');
  const day=process.argv[3]; if(day){ console.log(JSON.stringify(checkTkw(j.db||{},j.tkw||{},day),null,1)); }
}
