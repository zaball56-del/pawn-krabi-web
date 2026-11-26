// เตือน "ตั๋วใหม่เคยถูกติดไว้แล้ว": ไม่มีเล่มที่ → เช็คเฉพาะเดือนเดียวกัน · มีเล่มที่ → เช็คย้อนหลัง 240 วันเหมือนเดิม (แก้บั๊ค 26 พ.ย. 69)
const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const path=require('path'); const FILE=process.env.FILE||path.join(__dirname,'../../index.html');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const run=async(prevDate,book)=>{
    const pg=await (await b.newContext({viewport:{width:1300,height:900}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
    await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
    await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
    await pg.evaluate(({prevDate,book})=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); Object.keys(db).forEach(k=>delete db[k]); const M=['มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน'];
      currentDate=prevDate; let d=getCurrentDayData(); d.months=M.slice(); M.forEach(m=>d.data[m]=d.data[m]||[]); d.data['กันยายน'].push({type:'ส',ticket:'90',book:book,amount:'3000',newTicket:'445',newBook:book,newAmount:'3000',timestamp:'09:00:00'});
      currentDate='2026-11-26'; d=getCurrentDayData(); d.months=M.slice(); M.forEach(m=>d.data[m]=d.data[m]||[]); saveDB(); renderTable(); localStorage.setItem('pawn_qs_auto','0'); openQuickScanModal(); },{prevDate,book});
    await sleep(1000); await pg.click('#qs-mode button[data-m="full"]'); await pg.click('.qs-type-btn[data-type="ส"]');
    await pg.evaluate(book=>{ const set=(i,v)=>{ const e=document.getElementById(i); e.value=v; }; set('qs-month','10'); set('qs-ticket','300'); set('qs-book',book); set('qs-amount','5000'); set('qs-new-ticket','445'); set('qs-new-book',book); set('qs-new-amount','5000');
      window.__cf=[]; window.confirm=m=>{ window.__cf.push(String(m)); return true; }; submitQuickScan(); },book);
    await sleep(500); await pg.evaluate(()=>{ const bs=[...document.querySelectorAll('button')].filter(x=>x.offsetParent!==null&&x.textContent.trim()==='ยืนยัน'); if(bs.length) bs[bs.length-1].click(); }); await sleep(600);
    const r=await pg.evaluate(()=>({warn:window.__cf.some(m=>/เคยถูกติดไว้แล้ว/.test(m)), saved:(db['2026-11-26'].data['ตุลาคม']||[]).some(x=>x&&x.newTicket==='445')}));
    r.errs=errs; await pg.context().close(); return r; };
  let r=await run('2026-10-15','');  ok(!r.warn&&r.saved,'1 ไม่มีเล่ม · ตั๋วใหม่ 445 ของเดือน ต.ค. → ไม่เตือน (คนละใบ) และบันทึกได้ '+JSON.stringify(r));
  r=await run('2026-11-05','');      ok(r.warn&&r.saved,'2 ไม่มีเล่ม · ตั๋วใหม่ 445 ของเดือนเดียวกัน → ยังเตือน '+JSON.stringify(r));
  r=await run('2026-10-15','264');   ok(r.warn&&r.saved,'3 มีเล่ม 264 ทั้งคู่ · ข้ามเดือน → ยังเตือนเหมือนเดิม '+JSON.stringify(r));
  ok(!r.errs.length,'4 ไม่มี error');
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
