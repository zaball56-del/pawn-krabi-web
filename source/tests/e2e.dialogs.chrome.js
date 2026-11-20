// ทดสอบตอนเบราว์เซอร์บล็อกกล่องยืนยัน (มือถือ/กดซ้ำบ่อย) → เว็บถามในหน้าแทน แล้วทำงานต่อครบ "ครั้งเดียว"
// รัน: node tests/e2e.dialogs.chrome.js   (FILE=<index.html> เทียบเวอร์ชันอื่น)
const path=require('path'); const {chromium}=require('playwright');
const FILE=process.env.FILE||path.join(__dirname,'../../index.html'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
async function page(b,nat){ const pg=await (await b.newContext()).newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,150)));
  if(nat) pg.on('dialog',async d=>{ await sleep(120); nat==='yes'?d.accept():d.dismiss(); });   /* คนตอบกล่องของเบราว์เซอร์เอง (ไม่ถูกบล็อก) */
  else pg.on('dialog',d=>d.dismiss());   /* เบราว์เซอร์ตอบ "ไม่" ทันที = ถูกบล็อก */
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
  await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); }); return pg; }
async function answerAll(pg,max,no){ const seen=[]; for(let i=0;i<(max||6);i++){ await sleep(300);
  const t=await pg.evaluate(()=>{ const l=document.getElementById('ui-dialog'); return l&&l.style.display!=='none'?l.textContent.replace(/\s+/g,' ').slice(0,40):''; }); if(!t) break; seen.push(t);
  const b=no?await pg.$('#ui-dialog button:has-text("ยกเลิก")'):await pg.$('#ui-dialog button:has-text("ยืนยัน"), #ui-dialog button:has-text("ตกลง")'); if(!b) break; await b.click(); } await sleep(300); return seen; }
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  { // 1) นำเข้า สธ.3 วันที่ใน PDF ไม่ตรงกับวันที่เลือก (มีกล่องถาม 2 ชั้น) ติ๊กทั้งสองตาราง
    const pg=await page(b); const K='2026-11-20';
    await pg.evaluate(K=>{ Object.keys(db).forEach(k=>delete db[k]); currentDate=K; const d=getCurrentDayData(); d.months=['ตุลาคม','พฤศจิกายน','','','','']; d.months.forEach(m=>{ if(m) d.data[m]=d.data[m]||[]; }); saveDB();
      document.getElementById('pdf-import-date').value=K; document.getElementById('pdf-dest-ledger').checked=true; document.getElementById('pdf-dest-tkw').checked=true;
      pdfImportDetectedDate='2026-11-19'; pdfImportReportTotal=null; pdfImportReadyRecords=[{ticket:'5101',book:'230',month:11,amount:3000,selected:true,duplicate:false}];
      document.getElementById('pdf-import-confirm').disabled=false; commitPDFImport(); },K);
    const seen=await answerAll(pg);
    const r=await pg.evaluate(K=>{ const L=(db[K].data['พฤศจิกายน']||[]).filter(x=>x&&x.ticket==='5101').length; const t=tkwReadDay?tkwReadDay(K):null; let T=0; (t&&t.r||[]).forEach(c=>c.forEach(x=>{ if(x&&x[0]==='5101') T++; })); return {L,T}; },K);
    ok(r.L===1&&r.T===1,'1 นำเข้า สธ.3 (วันที่ไม่ตรง + ยืนยัน): ลงรักษาของ 1 และเขียนตั๋ว 1 ใบ ('+JSON.stringify(r)+' · ถาม '+seen.length+' ครั้ง)');
    ok(!pg.errs.length,'2 ไม่มี error '+pg.errs.join('|')); await pg.close(); }
  { // 2) หน้าเขียนตั๋ว: ปิดบัญชีครั้งที่ 2 แล้วยกเลิก → ถอยทีละ 1 ครั้งพอดี
    const pg=await page(b);
    await pg.evaluate(()=>{ tkwOpen(); }); await sleep(500);
    await pg.evaluate(()=>document.getElementById('tkw-pclose').click()); await answerAll(pg);   // ครั้งที่ 1 (ไม่ถาม)
    await pg.evaluate(()=>document.getElementById('tkw-pclose').click()); const s2=await answerAll(pg);   // ครั้งที่ 2 (ถาม)
    const c2=await pg.evaluate(()=>document.getElementById('tkw-pclose').textContent);
    await pg.evaluate(()=>document.getElementById('tkw-pcancel').click()); const s3=await answerAll(pg);
    const c3=await pg.evaluate(()=>document.getElementById('tkw-pclose').textContent);
    ok(c2==='ปิดบัญชีครั้งที่ 3'&&s2.length===1,'3 ปิดบัญชีครั้งที่ 2 ผ่านกล่องในหน้า → ปุ่มเป็น "ครั้งที่ 3" ('+c2+')');
    ok(c3==='ปิดบัญชีครั้งที่ 2'&&s3.length===1,'4 ยกเลิกปิดครั้งล่าสุด → ถอย 1 ครั้งพอดี ('+c3+')');
    ok(!pg.errs.length,'5 ไม่มี error '+pg.errs.join('|')); await pg.close(); }
  { // 3) สมุดบัญชี: ✕ ตัดหลุดทั้งเดือน (ยังมียอด) และลบแถว → ทำครั้งเดียว
    const pg=await page(b); const K='2026-11-20';
    await pg.evaluate(K=>{ Object.keys(db).forEach(k=>delete db[k]); currentDate=K; const d=getCurrentDayData(); d.months=['มิถุนายน','กรกฎาคม','สิงหาคม','','','']; d.bf=[5000,6000,7000,0,0,0]; d.bfCount=[1,1,1,0,0,0];
      d.months.forEach(m=>{ if(m) d.data[m]=d.data[m]||[]; }); saveDB(); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger'); renderTable(); },K);
    await sleep(400); await pg.evaluate(()=>document.querySelectorAll('.mcol-del')[0].click()); const s=await answerAll(pg);
    const r=await pg.evaluate(K=>({m:db[K].months.filter(Boolean).join(','),ff:Object.keys(db[K].forfeit||{}).join(',')}),K);
    ok(r.m==='กรกฎาคม,สิงหาคม'&&r.ff==='มิถุนายน'&&s.length===1,'6 ✕ ตัดหลุดมิถุนายน ผ่านกล่องในหน้า → เอาออก 1 เดือนพอดี ('+JSON.stringify(r)+')');
    const n0=await pg.evaluate(K=>db[K].totalRows,K);
    const hasDel=await pg.evaluate(()=>typeof deleteRow==='function');
    if(hasDel){ await pg.evaluate(()=>deleteRow(0)); await answerAll(pg); }
    const n1=await pg.evaluate(K=>db[K].totalRows,K);
    ok(!hasDel||n1===n0-1,'7 ลบแถวผ่านกล่องในหน้า → ลด 1 แถวพอดี ('+n0+'→'+n1+')');
    ok(!pg.errs.length,'8 ไม่มี error '+pg.errs.join('|')); await pg.close(); }
  { // 4) สแกนด่วน (สมุดบัญชี): ยอดที่กรอกไม่ตรงกับตาราง → ถามในหน้า → ปรับแถวเดิม 1 แถว ไม่เพิ่มซ้ำ (ทั้งกดปุ่ม และ Enter ที่ช่องยอด)
    for(const how of ['click','enter','cancel','nat-yes','nat-no']){
      const pg=await page(b,how.startsWith('nat-')?how.slice(4):null); const K='2026-11-20', M='พฤศจิกายน';
      await pg.evaluate(([K,M])=>{ Object.keys(db).forEach(k=>delete db[k]); currentDate=K; const d=getCurrentDayData(); d.months=[M,'','','','','']; d.bf=[50000,0,0,0,0,0]; d.bfCount=[10,0,0,0,0,0];
        d.data[M]=d.data[M]||[]; d.data[M][0]={type:'',ticket:'1234',book:'205',amount:'5000',count:'',origIdx:0,timestamp:''}; saveDB();
        const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger'); renderTable(); openQuickScanModal(); },[K,M]);
      await sleep(500);
      await pg.evaluate(()=>{ const set=(i,v)=>{ const e=document.getElementById(i); if(!e) return; e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); };
        set('qs-type','ถ'); set('qs-month','11'); set('qs-ticket','1234'); set('qs-book','205'); const a=document.getElementById('qs-amount'); a.classList.remove('qs-auto'); set('qs-amount','4000'); });
      await sleep(200);
      if(how!=='enter') await pg.evaluate(()=>submitQuickScan());
      else await pg.evaluate(()=>{ const a=document.getElementById('qs-amount'); a.focus(); a.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})); });
      const seen=await answerAll(pg,8,how==='cancel');
      const r=await pg.evaluate(([K,M])=>{ const rows=(db[K].data[M]||[]).filter(x=>x&&String(x.ticket||'').trim()); return rows.map(x=>x.type+':'+x.ticket+':'+x.amount).join(' | '); },[K,M]);
      const want=(how==='cancel'||how==='nat-no')?'ถ:1234:5000':'ถ:1234:4000';
      ok(r===want&&seen.length===(how.startsWith('nat-')?0:1),'9 สแกนด่วน ('+how+') ยอดไม่ตรง → ถามในหน้า → แถวเดิม '+want+' แถวเดียว ('+r+' · ถาม: '+seen.join(' / ').slice(0,90)+')');
      ok(!pg.errs.length,'10 ไม่มี error '+pg.errs.join('|')); await pg.close(); } }
  await b.close(); console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})();
