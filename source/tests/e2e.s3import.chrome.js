// ทดสอบนำเข้า สธ.3 ลงทั้งรักษาของ + เขียนตั๋ว ทั้งตอนกล่องยืนยันของเบราว์เซอร์ใช้ได้ และตอนเบราว์เซอร์บล็อก (เว็บถามในหน้าแทน)
// ปัญหาเดิม 20 พ.ย.: บนมือถือ ลงเฉพาะรักษาของ ไม่ลงเขียนตั๋ว
const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const path=require('path'); const FILE=process.env.FILE||path.join(__dirname,'../../index.html');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
async function run(mode,dest){ dest=dest||{L:true,T:true}; const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']}); const pg=await (await b.newContext()).newPage();
 const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,150)));
 if(mode==='native') pg.on('dialog',d=>d.accept()); else pg.on('dialog',d=>d.dismiss());   // blocked = เบราว์เซอร์ตอบ "ไม่" ทันที (เช่น ติ๊ก "ไม่ให้หน้านี้แสดงกล่องโต้ตอบอีก")
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3500);
 const K='2026-11-20';
 await pg.evaluate(({K,D})=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); Object.keys(db).forEach(k=>delete db[k]); currentDate=K;
   const d=getCurrentDayData(); d.months=['กันยายน','ตุลาคม','พฤศจิกายน','','','']; d.months.forEach(m=>{ if(m) d.data[m]=d.data[m]||[]; }); saveDB();
   document.getElementById('pdf-import-date').value=K; document.getElementById('pdf-dest-ledger').checked=D.L; document.getElementById('pdf-dest-tkw').checked=D.T;
   pdfImportDetectedDate=K; pdfImportReportTotal=null;
   pdfImportReadyRecords=[{ticket:'5101',book:'230',month:11,amount:3000,selected:true,duplicate:false},{ticket:'5102',book:'230',month:10,amount:4500,selected:true,duplicate:false}];
   document.getElementById('pdf-import-confirm').disabled=false; },{K,D:dest});
 await pg.evaluate(()=>commitPDFImport()); await sleep(400);
 if(mode!=='native'){ for(let i=0;i<4;i++){ const ok=await pg.$('#ui-dialog button:has-text("ยืนยัน"), #ui-dialog button:has-text("ตกลง")'); if(!ok) break; await ok.click(); await sleep(400); } }
 await sleep(500);
 const r=await pg.evaluate(K=>{ const d=db[K]; const L=['กันยายน','ตุลาคม','พฤศจิกายน'].map(m=>(d.data[m]||[]).filter(x=>x&&x.ticket).map(x=>x.ticket).join('/')).join(' | ');
   let T=''; try{ const t=JSON.parse(localStorage.getItem('pawn_tkw_v1')||'{}'); const day=t[K]||(t.days&&t.days[K]); T=day?JSON.stringify(day.r.map(c=>c.filter(x=>x[0]).map(x=>x[0]))):'(ไม่มีวันนี้)'; }catch(e){ T='err '+e; }
   return {ledger:L,tkw:T}; },K);
 r.errs=errs; await b.close(); return r; }
(async()=>{
  const T2='[[],[],[],[],["5102"],["5101"],[]]', L2=' | 5102 | 5101';
  let r=await run('native'); ok(r.ledger===L2&&r.tkw===T2&&!r.errs.length,'1 กล่องยืนยันของเบราว์เซอร์: ลงทั้งรักษาของและเขียนตั๋ว '+JSON.stringify(r));
  r=await run('blocked'); ok(r.ledger===L2&&r.tkw===T2&&!r.errs.length,'2 เบราว์เซอร์บล็อกกล่องยืนยัน (ถามในหน้า): ลงทั้งสองตาราง ไม่ซ้ำ '+JSON.stringify(r));
  r=await run('blocked',{L:false,T:true}); ok(r.ledger===' |  | '&&r.tkw===T2,'3 ถามในหน้า + ติ๊กเฉพาะเขียนตั๋ว: ลงเฉพาะเขียนตั๋ว '+JSON.stringify(r));
  r=await run('blocked',{L:true,T:false}); ok(r.ledger===L2&&r.tkw==='(ไม่มีวันนี้)','4 ถามในหน้า + ติ๊กเฉพาะรักษาของ: ไม่ลงเขียนตั๋ว '+JSON.stringify(r));
  console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0); })();
