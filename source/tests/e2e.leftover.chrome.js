// ที่ค้าง: ลบข้อมูลเก่าถาม PIN เมื่อมีวันที่ปิดยอด · บันทึกเบิก-คืนทรัพย์อยู่ในไฟล์สำรอง · จุดกู้คืนอัตโนมัติเก็บตารางเขียนตั๋ว
// รัน: node tests/e2e.leftover.chrome.js   (FILE=<index.html> เทียบเวอร์ชันอื่น)
const path=require('path'); const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const FILE=process.env.FILE||path.join(__dirname,'../../index.html'); let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1366,height:900},acceptDownloads:true}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
  await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger');
    window.__asked=[]; window.uiChoice=async()=>window.__mode; window.uiConfirm=async(m)=>{ window.__asked.push(m); return true; }; window.uiPrompt=async(m)=>{ window.__asked.push(m); return window.__pin; };
    window.exportJSON=async()=>{ localStorage.setItem('pawn_krabi_last_backup',String(Date.now()+Math.random())); };   // จำลองสำรองไฟล์สำเร็จ
    window.__bkArchive=async()=>({ok:true,folder:'ทดสอบ'}); });

  // 1) ลบข้อมูลเก่า: ช่วงที่จะลบมีวันที่ปิดยอดแล้ว → PIN ผิด = ไม่ลบ · PIN ถูก = ลบ
  const prune=(pin)=>pg.evaluate(async(pin)=>{ window.__pin=pin; window.__asked=[];
    openPruneOldData(); await new Promise(r=>setTimeout(r,200)); const q=id=>document.getElementById(id);
    q('prune-years').value='2'; q('prune-years').dispatchEvent(new Event('input')); q('prune-ok').checked=true; q('prune-ok').dispatchEvent(new Event('change'));
    q('prune-go').disabled=false; q('prune-go').click(); await new Promise(r=>setTimeout(r,800)); const err=(q('prune-err')||{}).textContent||''; try{ q('prune-cancel').click(); }catch(e){}
    return {left:Object.keys(db).filter(k=>k<'2020-01-01').length, asked:window.__asked.join(' | '), err}; },pin);
  await pg.evaluate(()=>{ Object.keys(db).forEach(k=>delete db[k]); ['2019-03-01','2019-03-04'].forEach(k=>{ currentDate=k; const d=getCurrentDayData(); d.months=['มีนาคม','','','','','']; }); db['2019-03-04'].closing={closed:true,counted:'1'};
    currentDate='2026-11-20'; getCurrentDayData(); saveDB(); });
  let r=await prune('0000');
  ok(r.left===2&&/PIN/.test(r.asked),'1 ลบข้อมูลเก่าที่มีวันปิดยอดแล้ว + PIN ผิด → ไม่ลบ ('+r.err+')');
  r=await prune('1234'); ok(r.left===0,'2 PIN ถูก → ลบแล้ว (เหลือ '+r.left+' วัน)');

  // 2) บันทึกเบิก-คืนทรัพย์อยู่ในไฟล์สำรอง และนำเข้ากลับได้ (รวม ไม่ซ้ำ)
  r=await pg.evaluate(async()=>{ const ev=[{id:'c1',kind:'out',ticket:'77',book:'12',who:'สมชาย',reason:'ตรวจสอบ',note:'',date:'2026-11-20',time:'09:00',ts:1},{id:'c2',kind:'in',ticket:'77',book:'12',who:'สมชาย',reason:'',note:'',date:'2026-11-20',time:'10:00',ts:2}];
    localStorage.setItem('pawn_krabi_custody',JSON.stringify(ev)); const f=JSON.parse(pawnBackupText(false)); const inFile=!!(f._extra&&f._extra.custody&&f._extra.custody.ev&&f._extra.custody.ev.length===2);
    localStorage.setItem('pawn_krabi_custody',JSON.stringify([ev[0]]));
    window.__mode='add'; await importJSON({target:{files:[new File([JSON.stringify(f)],'f.json')],value:''}}); await new Promise(r=>setTimeout(r,300));
    const a1=JSON.parse(localStorage.getItem('pawn_krabi_custody')||'[]').map(x=>x.id).sort().join(',');
    await importJSON({target:{files:[new File([JSON.stringify(f)],'f.json')],value:''}}); await new Promise(r=>setTimeout(r,300));
    const a2=JSON.parse(localStorage.getItem('pawn_krabi_custody')||'[]').length; return {inFile,a1,a2}; });
  ok(r.inFile,'3 ไฟล์สำรองมีบันทึกเบิก-คืนทรัพย์');
  ok(r.a1==='c1,c2'&&r.a2===2,'4 นำเข้าไฟล์สำรอง → ได้บันทึกที่ขาดคืน และนำเข้าซ้ำไม่เพิ่มซ้ำ ('+r.a1+' / '+r.a2+' รายการ)');

  // 3) จุดกู้คืนอัตโนมัติเก็บตารางเขียนตั๋ว แล้วกู้คืนได้
  r=await pg.evaluate(async()=>{ tkwImportAll({'2026-11-20':{m:[11],r:[[['501','700']]]}},'over'); await window.__snapshotNow('ทดสอบ',true);
    tkwImportAll({'2026-11-20':{m:[11],r:[[['777','5']]]}},'over'); tkwImportAll({'2026-11-21':{m:[11],r:[[['888','9']]]}},'over');
    openRestorePoints(); await new Promise(r=>setTimeout(r,500)); const btns=[...document.querySelectorAll('#rp-modal [data-r]')]; const rows=[...document.querySelectorAll('#rp-modal tbody tr')].map(t=>t.textContent);
    const i=rows.findIndex(t=>/ทดสอบ/.test(t)); window.__pin='1234'; window.__asked=[]; btns[i].click(); await new Promise(r=>setTimeout(r,800));
    const t20=JSON.stringify(tkwReadDay('2026-11-20').r), t21=JSON.stringify(tkwReadDay('2026-11-21').r); return {t20,t21,asked:window.__asked.join(' | ')}; });
  ok(/501/.test(r.t20)&&!/777/.test(r.t20),'5 กู้คืนจากจุดกู้คืน → ตารางเขียนตั๋วกลับเป็นแบบจุดเวลานั้น '+r.t20);
  ok(!/888/.test(r.t21),'6 วันที่เพิ่มในตารางเขียนตั๋วหลังจุดกู้คืน → ถูกล้าง'+(/888/.test(r.t21)?' (ยังมี 888)':''));
  ok(/ตารางเขียนตั๋วจะกลับ/.test(r.asked),'7 ข้อความยืนยันบอกว่าตารางเขียนตั๋วจะกลับด้วย');
  ok(!errs.length,'8 ไม่มี error '+errs.join('|'));
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0); })();
