// ทดสอบ: localStorage ของเขียนตั๋วหาย (เหลือสำเนาใน IndexedDB) แล้วนำเข้า สธ.3 ลงวันนั้นทันทีหลังเปิดเว็บ ก่อนสำเนาโหลดเสร็จ
//  → ต้องได้ตั๋วทั้งของเดิม (ในสำเนา) และที่นำเข้าใหม่ (เดิม: ฉบับใหม่กว่าชนะ → ตั๋วเดิมทั้งวันหาย)
// รัน: node tests/e2e.tkwidb.chrome.js   (FILE=<index.html> เทียบเวอร์ชันอื่น)
const path=require('path'); const {chromium}=require('playwright');
const FILE=process.env.FILE||path.join(__dirname,'../../index.html'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
const K='2026-11-20';
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']}); const ctx=await b.newContext(); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,150)));
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
  await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(2500);
  // เตรียม: สำเนาใน IndexedDB มีวัน K (ตั๋ว 111, 112) · localStorage ไม่มีเขียนตั๋วเลย
  await pg.evaluate(async K=>{ const day={m:[9,10,11],r:[[['','']],[['','']],[['111','5000','12',''],['112','3000','12','']]],u:Date.now()-3600e3};
    await new Promise((res,rej)=>{ const q=indexedDB.open('pawn_tkw_store',1); q.onupgradeneeded=()=>q.result.createObjectStore('kv'); q.onsuccess=()=>{ const d=q.result, t=d.transaction('kv','readwrite'); t.objectStore('kv').put(JSON.stringify({[K]:day}),'store'); t.oncomplete=()=>{ d.close(); res(); }; t.onerror=()=>rej(t.error); }; q.onerror=()=>rej(q.error); });
    localStorage.removeItem('pawn_tkw_v1'); localStorage.removeItem('pawn_tkw_sync_v1'); },K);
  // เปิดเว็บใหม่ แล้วนำเข้าทันทีเมื่อสคริปต์โหลดเสร็จ (ก่อนสำเนาโหลด)
  await pg.addInitScript(()=>{ /* หน่วงผลการอ่าน IndexedDB 1.5 วิ ให้แน่ใจว่านำเข้าก่อนสำเนาโหลดเสร็จ */
    const d=Object.getOwnPropertyDescriptor(IDBRequest.prototype,'onsuccess');
    Object.defineProperty(IDBRequest.prototype,'onsuccess',{configurable:true,get(){ return d.get.call(this); },set(fn){ d.set.call(this, typeof fn==='function'?function(e){ const self=this; setTimeout(()=>fn.call(self,e),1500); }:fn); }}); });
  await pg.addInitScript(K=>{ document.addEventListener('DOMContentLoaded',()=>{ try{ window.__early=JSON.stringify(window.tkwImportS3(K,[{month:11,ticket:'222',book:'12',amount:4000}])); window.__earlyDay=JSON.stringify(tkwReadDay(K)); }catch(e){ window.__early='ERR '+e; } }); },K);
  await pg.reload({waitUntil:'domcontentloaded'}); await sleep(5000);
  const r=await pg.evaluate(K=>{ const d=tkwReadDay(K); const t=[]; (d&&d.r||[]).forEach(c=>c.forEach(x=>{ if(x&&String(x[0]).trim()) t.push(x[0]); }));
    let ls=''; try{ const o=JSON.parse(localStorage.getItem('pawn_tkw_v1')||'{}'); const dd=o[K]; const a=[]; (dd&&dd.r||[]).forEach(c=>c.forEach(x=>{ if(x&&String(x[0]).trim()) a.push(x[0]); })); ls=a.sort().join(','); }catch(e){}
    return {early:window.__early, earlyHad:(window.__earlyDay||'').includes('"111"'), t:t.sort().join(','), ls}; },K);
  console.log('   ',JSON.stringify(r));
  ok(!r.earlyHad,'0 (เงื่อนไขทดสอบ) นำเข้าก่อนสำเนาโหลดเสร็จจริง');
  ok(r.t==='111,112,222','1 ได้ตั๋วครบ: เดิม 111, 112 + นำเข้า 222 ('+r.t+')');
  ok(r.ls==='111,112,222','2 บันทึกลงเครื่องครบ ('+r.ls+')');
  // นำเข้าซ้ำตั๋วเดิม → ไม่ซ้ำ
  const r2=await pg.evaluate(K=>{ const x=tkwImportS3(K,[{month:11,ticket:'111',book:'12',amount:5000}]); const d=tkwReadDay(K); let n=0; d.r.forEach(c=>c.forEach(y=>{ if(y&&y[0]==='111') n++; })); return {skip:x.skipped,n}; },K);
  ok(r2.n===1,'3 นำเข้าตั๋วที่มีอยู่แล้ว → ไม่ซ้ำ ('+JSON.stringify(r2)+')');
  ok(!errs.length,'4 ไม่มี error '+errs.join('|'));
  await b.close(); console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})();
