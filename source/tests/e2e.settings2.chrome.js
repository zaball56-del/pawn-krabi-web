// ตั้งค่าใหม่: ล็อกวันย้อนหลังอัตโนมัติ · เครื่องสแกน (Enter/บันทึกเอง/ทดสอบเครื่องสแกน)
// รัน: node tests/e2e.settings2.chrome.js   (FILE=<index.html> เทียบเวอร์ชันอื่น)
const path=require('path'); const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const FILE=process.env.FILE||path.join(__dirname,'../../index.html'); let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const pg=await (await b.newContext({viewport:{width:1366,height:900}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
  await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger');
    window.__asked=[]; window.uiConfirm=async(m)=>{ window.__asked.push(m); return true; }; window.uiPrompt=async(m)=>{ window.__asked.push(m); return window.__pin; }; });
  const ymd=(off)=>pg.evaluate(off=>{ const d=new Date(); d.setDate(d.getDate()-off); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); },off);
  const k10=await ymd(10), k2=await ymd(2), k0=await ymd(0);
  const setS=(o)=>pg.evaluate(o=>{ const s=JSON.parse(localStorage.getItem('pawn_krabi_app_settings')||'{}'); Object.assign(s,o); localStorage.setItem('pawn_krabi_app_settings',JSON.stringify(s)); },o);

  // 1) ล็อกวันย้อนหลังอัตโนมัติ
  await pg.evaluate(([a,b2,c])=>{ Object.keys(db).forEach(k=>delete db[k]); [a,b2,c].forEach(k=>{ currentDate=k; const d=getCurrentDayData(); d.months=['พฤศจิกายน','','','','','']; }); saveDB(); },[k10,k2,k0]);
  let r=await pg.evaluate(([a,b2])=>({a:__isLocked(a),b:__isLocked(b2)}),[k10,k2]);
  ok(!r.a&&!r.b,'1 ปิดไว้ (ค่าเริ่มต้น) → วันเก่าไม่ล็อก');
  await setS({lockOldDays:3});
  r=await pg.evaluate(([a,b2,c])=>({a:__isLocked(a),b:__isLocked(b2),c:__isLocked(c),why:__lockReason(a)}),[k10,k2,k0]);
  ok(r.a&&!r.b&&!r.c,'2 ตั้ง 3 วัน → วันที่ 10 วันก่อนล็อก · 2 วันก่อน/วันนี้ไม่ล็อก');
  ok(/ย้อนหลังเกิน 3 วัน/.test(r.why),'3 เหตุผลที่แสดง: '+r.why);
  r=await pg.evaluate(async(a)=>{ document.getElementById('doc-date').value=a; changeDate(); await new Promise(r=>setTimeout(r,200)); window.__pin=null; window.__asked=[];
    const inp=document.querySelector('input[oninput*="\'ticket\'"]'); inp.value='555'; inp.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,200));
    const row=db[a].data['พฤศจิกายน'][0]; await new Promise(r=>setTimeout(r,1200)); return {saved:row&&row.ticket||'', asked:window.__asked.join(' | '), banner:(document.getElementById('lock-txt')||{}).textContent||''}; },k10);
  ok(r.saved!=='555'&&/ย้อนหลังเกิน 3 วัน/.test(r.asked),'4 แก้วันย้อนหลัง → ถาม PIN ไม่บันทึก ('+r.asked.slice(0,50)+')');
  ok(/ล็อกอัตโนมัติ/.test(r.banner),'5 แถบบนตารางบอกว่าล็อกอัตโนมัติ ('+r.banner.slice(0,60)+')');
  r=await pg.evaluate(async()=>{ openDataSettings(); await new Promise(r=>setTimeout(r,300)); const tb=document.querySelector('#ds-modal [data-tab="sec"]'); tb.click(); await new Promise(r=>setTimeout(r,300));
    const sel=document.getElementById('ds-lockold'); window.__pin='9999'; sel.value='0'; sel.dispatchEvent(new Event('change')); await new Promise(r=>setTimeout(r,300));
    const v1=JSON.parse(localStorage.getItem('pawn_krabi_app_settings')).lockOldDays;
    window.__pin='1234'; sel.value='7'; sel.dispatchEvent(new Event('change')); await new Promise(r=>setTimeout(r,300)); const v2=JSON.parse(localStorage.getItem('pawn_krabi_app_settings')).lockOldDays;
    try{ closeDataSettings(); }catch(e){} return {v1,v2}; });
  ok(r.v1===3,'6 ปิดการล็อกด้วย PIN ผิด → ไม่เปลี่ยน (ยัง '+r.v1+' วัน)');
  ok(r.v2===7,'7 เปลี่ยนด้วย PIN ถูก → '+r.v2+' วัน');
  await setS({lockOldDays:0});

  // 2) เครื่องสแกน
  await pg.evaluate(async(k)=>{ Object.keys(db).forEach(x=>delete db[x]); currentDate=k; const d=getCurrentDayData(); d.months=['พฤศจิกายน','','','','',''];
    db[k].data['พฤศจิกายน']=db[k].data['พฤศจิกายน']||[]; saveDB(); document.getElementById('doc-date').value=k; changeDate(); },k0);
  const pledgeKey=await pg.evaluate(()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01'; });
  const scan=(enterSave,autoSave,sendEnter)=>pg.evaluate(async([es,as,se,pk,k])=>{ const s=JSON.parse(localStorage.getItem('pawn_krabi_app_settings')||'{}'); s.scanEnterSave=es; s.scanAutoSave=as; localStorage.setItem('pawn_krabi_app_settings',JSON.stringify(s));
    if(!db[pk]){ const cd=currentDate; currentDate=pk; const d=getCurrentDayData(); d.months=['พฤศจิกายน','','','','','']; d.data['พฤศจิกายน']=[{type:'',ticket:'134',book:'205',amount:'5000',count:''}]; currentDate=cd; saveDB(); window.__dv=(window.__dv||0)+1; }
    const M='พฤศจิกายน'; db[k].data[M]=(db[k].data[M]||[]).map(x=>x&&x.ticket==='134'&&k!==pk?{type:'',ticket:'',amount:'',count:''}:x); saveDB();
    openQuickScanModal&&openQuickScanModal(); await new Promise(r=>setTimeout(r,300)); const q=id=>document.getElementById(id);
    q('qs-type').value='ถ'; q('qs-type').dispatchEvent(new Event('change',{bubbles:true})); q('qs-month').value=String(new Date().getMonth()+1); q('qs-month').dispatchEvent(new Event('change',{bubbles:true}));
    const t=q('qs-ticket'); t.focus(); t.value='6900205001342'; t.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(r=>setTimeout(r,250)); const amt=q('qs-amount').value;
    if(se) t.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    await new Promise(r=>setTimeout(r,700));
    const n134=(db[k].data[M]||[]).filter(x=>x&&x.ticket==='134'&&x.type==='ถ').length, saved=n134>0; const foc=document.activeElement&&document.activeElement.id;
    try{ closeQuickScanModal(); }catch(e){} return {amt,saved,foc,n134}; },[enterSave,autoSave,sendEnter,pledgeKey,k0]);
  r=await scan(true,false,true); ok(r.saved,'8 ค่าเริ่มต้น: สแกน + Enter → บันทึกทันที (ยอด '+r.amt+')');
  r=await scan(false,false,true); ok(!r.saved&&r.foc==='qs-amount','9 ปิด "Enter บันทึกทันที" → Enter พาไปช่องยอดเงิน ไม่บันทึก ('+r.foc+')');
  r=await scan(true,true,false); ok(r.saved,'10 เปิด "บันทึกเองหลังอ่านบาร์โค้ด" → ไม่กด Enter ก็บันทึก');
  r=await scan(true,true,true); ok(r.n134===1,'10b เปิดบันทึกเอง + เครื่องส่ง Enter ด้วย → บันทึกครั้งเดียว ไม่ซ้ำ ('+r.n134+' แถว)');
  r=await scan(true,false,false); ok(!r.saved,'11 ปิดบันทึกเอง + ไม่กด Enter → ยังไม่บันทึก');

  // 3) ทดสอบเครื่องสแกน
  r=await pg.evaluate(async()=>{ openScanTest(); await new Promise(r=>setTimeout(r,100)); const inp=document.getElementById('st-in');
    for(const ch of '6900205001342'){ inp.dispatchEvent(new KeyboardEvent('keydown',{key:ch,bubbles:true,cancelable:true})); }
    inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})); const a=document.getElementById('st-out').textContent;
    for(const ch of 'ถ'){ inp.dispatchEvent(new KeyboardEvent('keydown',{key:ch,bubbles:true,cancelable:true})); } await new Promise(r=>setTimeout(r,500)); const b=document.getElementById('st-out').textContent;
    document.getElementById('st-x').click(); return {a,b}; });
  ok(/เครื่องสแกน/.test(r.a)&&/ส่ง Enter/.test(r.a)&&/ปีงบ 69 · เล่ม 205 · เลขที่ 134/.test(r.a),'12 ทดสอบเครื่องสแกน: บอกความเร็ว/Enter/อ่านเป็นตั๋ว ('+r.a.slice(0,90)+')');
  ok(/ไม่ส่ง Enter/.test(r.b)&&/ไม่ใช่บาร์โค้ดตั๋ว/.test(r.b),'13 ข้อความที่ไม่ใช่บาร์โค้ด → บอกว่าอ่านไม่ได้');
  ok(!errs.length,'14 ไม่มี error '+errs.join('|'));
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0); })();
