// สแกน/พิมพ์ตั๋ว → ดึงยอด/เดือน/เล่มจากทะเบียนกลาง (ตัวค้นกลาง ticketFind + สแกนด่วนรักษาของ + สแกนตารางเขียนตั๋ว)
// รัน: node tests/e2e.scanlookup.chrome.js   (FILE=<index.html> เทียบเวอร์ชันอื่น)
const path=require('path'); const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const FILE=process.env.FILE||path.join(__dirname,'../../index.html'); let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
async function answer(pg){ for(let i=0;i<4;i++){ let t=''; for(let w=0;w<12;w++){ await sleep(150); t=await pg.evaluate(()=>{ const l=document.getElementById('ui-dialog'); return l&&l.style.display!=='none'?'y':''; }); if(t) break; } if(!t) break;
  const bt=await pg.$('#ui-dialog button:has-text("ยืนยัน"), #ui-dialog button:has-text("ตกลง")'); await bt.click(); } await sleep(300); }
const SEED=()=>{ Object.keys(db).forEach(k=>delete db[k]); const M=['สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน'];
  const mk=k=>{ currentDate=k; const d=getCurrentDayData(); d.months=M.concat(['','']); M.forEach(m=>d.data[m]=d.data[m]||[]); saveDB(); return d; };
  const a=mk('2026-08-10'); a.sor2={v:1,file:'t',at:1,mn:'สิงหาคม',n:2,amt:5000,newN:2,newAmt:5000,rows:[['','',0,'801','5','1',2000],['','',0,'802','5','1',3000]]}; saveDB();   // ตั๋ว 801 เล่ม 5 จำนำใหม่ ส.ค. (จาก สธ.2)
  const c=mk('2026-11-20'); c.data['สิงหาคม'][0]={type:'',ticket:'100',book:'',amount:'1000',count:'',origIdx:0,timestamp:'',importSource:'PDF',importBook:'5'};   // แถวนำเข้า สธ.3: เลข 100 เล่ม 5
  saveDB(); currentDate='2026-11-20'; renderTable(); };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const pg=await (await b.newContext()).newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
  await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger'); });
  await pg.evaluate(SEED);
  let r=await pg.evaluate(()=>{ const f=(t,b,m)=>window.ticketFind(t,b,m,{soft:false}); return {okB:f('801','5',8),wrong:f('801','9',8),none:f('999','5',8),noBookArg:f('801','',8)}; });
  ok(r.okB.status==='ok'&&r.okB.amount==='2000'&&r.okB.book==='5','1 ค้นตั๋ว 801 เล่ม 5 เดือน ส.ค. → ยอด 2,000 เล่ม 5 (จาก สธ.2)');
  ok(r.wrong.status==='bookmismatch'&&r.wrong.books==='5','2 ใส่เล่มผิด (9) → สถานะ "เล่มไม่ตรง" บอกเล่มที่พบ (5) '+JSON.stringify(r.wrong));
  ok(r.none.status==='none','3 ตั๋วที่ไม่มีเลย → ไม่พบ');
  ok(r.noBookArg.status==='ok'&&r.noBookArg.book==='5','4 ไม่ใส่เล่ม แต่มีเล่มเดียวชัดเจน → ดึงได้พร้อมเล่ม');
  r=await pg.evaluate(()=>{ const q=id=>document.getElementById(id); q('qs-month').value='8'; q('qs-ticket').value='801'; q('qs-book').value=''; q('qs-amount').value=''; window.__qsRun(); const e1={book:q('qs-book').value,amt:q('qs-amount').value,hint:q('qs-amt-hint').textContent};
    q('qs-book').value='9'; q('qs-amount').value=''; q('qs-amount').classList.remove('qs-auto'); window.__qsRun(); const e2={amt:q('qs-amount').value,hint:q('qs-amt-hint').textContent}; return {e1,e2}; });
  ok(r.e1.book==='5'&&/2,000/.test(r.e1.amt),'5 สแกนด่วนรักษาของ: ตั๋วที่มาจาก สธ.2 → เติมเล่ม 5 และยอดให้ (เดิมเติมแต่ยอด) '+JSON.stringify(r.e1));
  ok(/เล่มที่ไม่ตรง/.test(r.e2.hint)&&/5/.test(r.e2.hint)&&r.e2.amt==='','6 สแกนด่วน: เล่มผิด → ข้อความ "เล่มที่ไม่ตรง ... อยู่เล่ม 5" และไม่ดึงยอด '+r.e2.hint);
  r=await pg.evaluate(()=>{ const q=id=>document.getElementById(id); q('qs-type').value='ส'; q('qs-month').value='8'; q('qs-ticket').value='100'; q('qs-book').value='7'; q('qs-amount').value='1000'; q('qs-new-ticket').value=''; q('qs-new-book').value=''; q('qs-new-amount').value=''; submitQuickScan(); });
  await answer(pg); r=await pg.evaluate(()=>{ const rows=db['2026-11-20'].data['สิงหาคม'].filter(x=>x&&String(x.ticket).trim()); return rows.map(x=>[x.ticket,x.book||'',x.importBook||'',x.type].join('/')); });
  ok(r.length===2&&r.includes('100//5/')&&r.some(s=>/^100\/7\//.test(s)&&/ส$/.test(s)),'7 สแกนด่วนเลข 100 เล่ม 7: ไม่ไปทับแถว สธ.3 เลข 100 เล่ม 5 — เพิ่มเป็นแถวใหม่ '+JSON.stringify(r));
  r=await pg.evaluate(()=>{ const q=id=>document.getElementById(id); q('qs-type').value='ส'; q('qs-month').value='8'; q('qs-ticket').value='100'; q('qs-book').value='5'; q('qs-amount').value='1000'; submitQuickScan(); });
  await answer(pg); r=await pg.evaluate(()=>{ const rows=db['2026-11-20'].data['สิงหาคม'].filter(x=>x&&String(x.ticket).trim()); return rows.map(x=>[x.ticket,x.book||'',x.importBook||'',x.type].join('/')); });
  ok(r.length===2&&r.includes('100/5/5/ส'),'8 สแกนด่วนเลข 100 เล่ม 5 (ตรงกับแถว สธ.3) → ปรับแถวเดิม ไม่เพิ่มซ้ำ '+JSON.stringify(r));
  ok(!pg.errs.length,'9 ไม่มี error '+pg.errs.join('|'));
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0); })();
