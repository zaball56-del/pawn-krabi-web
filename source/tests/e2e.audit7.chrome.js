// ไล่บั๊กรอบ 2: กู้คืนก่อนนำเข้า · ลบเบิกล่วงหน้าวันที่ปิดยอด · นำเข้าแทนที่ทั้งหมด+ข้ามวันล็อก · รีเซ็ตตั้งค่าต้องใส่ PIN · คำเตือนคีย์ด่วนข้ามปี · ประวัติการแก้ไข
// รัน: node tests/e2e.audit7.chrome.js   (FILE=<index.html> เทียบเวอร์ชันอื่น)
const path=require('path'); const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const FILE=process.env.FILE||path.join(__dirname,'../../index.html'); let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const pg=await (await b.newContext({viewport:{width:1366,height:900}})).newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,150)));
  let native=0; pg.on('dialog',d=>{ native++; d.accept(); });
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
  await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger');
    window.__asked=[]; window.uiChoice=async()=>window.__mode; window.uiConfirm=async(m)=>{ window.__asked.push(m); return window.__yes!==false; }; window.uiPrompt=async(m)=>{ window.__asked.push(m); return window.__pin; }; });
  const audits=()=>pg.evaluate(()=>{ try{ return JSON.parse(localStorage.getItem('pawn_krabi_audit_v1')||'[]').map(x=>x.a); }catch(e){ return []; } });

  // ข้อมูล 3 วัน + ตารางเขียนตั๋ว
  await pg.evaluate(()=>{ Object.keys(db).forEach(k=>delete db[k]); const M='พฤศจิกายน';
    const mk=(k,amt)=>{ currentDate=k; const d=getCurrentDayData(); d.months=[M,'','','','','']; d.data[M]=d.data[M]||[]; d.data[M][0]={type:'ถ',ticket:'1',book:'1',amount:String(amt),count:'',origIdx:0,timestamp:''}; d.bf=[10000,0,0,0,0,0]; d.bfCount=[5,0,0,0,0,0]; syncBroughtForwardForDate(k,true); updateSummaryColumn(); saveDB(); };
    mk('2026-11-16',1000); mk('2026-11-17',500); mk('2026-11-18',200); recalculateFutureBroughtForwardBalances('2026-11-16');
    tkwImportAll({'2026-11-18':{m:[11],r:[[['501','700']]]}},'over'); window.__file=pawnBackupText(true); });
  const imp=(text,mode,pin)=>pg.evaluate(async([text,mode,pin])=>{ window.__mode=mode; window.__pin=pin; window.__asked=[]; await importJSON({target:{files:[new File([text],'f.json')],value:''}}); await new Promise(r=>setTimeout(r,300)); },[text,mode,pin]);

  // 1) กู้คืนก่อนนำเข้า: ถาม PIN เมื่อทับวันที่ปิดยอด · ตารางเขียนตั๋วกลับด้วย · ไม่ใช้กล่องของเบราว์เซอร์ · บันทึกประวัติ
  const f2=await pg.evaluate(()=>{ const f=JSON.parse(window.__file); f._extra.tkw['2026-11-18'].r=[[['777','5']]]; f['2026-11-17'].data['พฤศจิกายน'][0].amount='9999'; return JSON.stringify(f); });
  await imp(f2,'over',null);
  let a=await audits(); ok(a.includes('นำเข้าไฟล์ข้อมูล'),'1 นำเข้าไฟล์ → มีบันทึกในประวัติการแก้ไข');
  await pg.evaluate(()=>{ db['2026-11-17'].closing={closed:true,counted:'1'}; saveDB(); });
  native=0;
  let r=await pg.evaluate(async()=>{ window.__pin='0000'; window.__asked=[]; await restorePreImportBackup(); await new Promise(r=>setTimeout(r,300));
    return {amt:db['2026-11-17'].data['พฤศจิกายน'][0].amount, asked:window.__asked.join(' | ')}; });
  ok(r.amt==='9999'&&/PIN/.test(r.asked),'2 กู้คืนทับวันที่ปิดยอด + PIN ผิด → ไม่กู้คืน (ยอดยัง 9999)');
  r=await pg.evaluate(async()=>{ window.__pin='1234'; window.__asked=[]; await restorePreImportBackup(); await new Promise(r=>setTimeout(r,400));
    return {amt:db['2026-11-17'].data['พฤศจิกายน'][0].amount, tkw:JSON.stringify(tkwReadDay('2026-11-18').r)}; });
  ok(r.amt==='500','3 PIN ถูก → กู้คืนยอดเดิม 500 ('+r.amt+')');
  ok(/501/.test(r.tkw)&&!/777/.test(r.tkw),'4 ตารางเขียนตั๋วกลับเป็นก่อนนำเข้า (501 ไม่ใช่ 777) '+r.tkw);
  ok(native===0,'5 ไม่ใช้กล่องยืนยันของเบราว์เซอร์ ('+native+')');
  a=await audits(); ok(a.includes('กู้คืนก่อนนำเข้า'),'6 กู้คืนก่อนนำเข้า → มีบันทึกในประวัติ');

  // 2) แทนที่ทั้งหมด + ข้ามวันที่ปิดยอด (PIN ผิด) → ย/ม วันถัดไปตามคงเหลือวันที่คงไว้ทันที
  await pg.evaluate(()=>{ const d=db['2026-11-17']; d.closing={closed:true,counted:'1'}; d.data['พฤศจิกายน'][0].amount='300'; currentDate='2026-11-17'; updateSummaryColumn(); saveDB(); recalculateFutureBroughtForwardBalances('2026-11-17'); });
  const f3=await pg.evaluate(()=>{ const f=JSON.parse(window.__file); delete f._extra; return JSON.stringify(f); });
  await imp(f3,'replace','0000');
  r=await pg.evaluate(()=>({b:db['2026-11-17'].data['สรุปประจำวัน'][3].amount, c:db['2026-11-18'].data['สรุปประจำวัน'][0].amount}));
  ok(String(r.b)===String(r.c),'7 แทนที่ทั้งหมดข้ามวันที่ 17 → ย/ม วันที่ 18 = คงเหลือวันที่ 17 ('+r.b+' / '+r.c+')');

  // 3) ลบเบิกล่วงหน้าของวันที่ปิดยอดแล้ว ขณะเปิดดูวันอื่น → ต้องใส่ PIN
  r=await pg.evaluate(async()=>{ window.__unlocked={}; const d=db['2026-11-17']; d.advances=[{id:'a1',amount:500,who:'x',settled:false}]; d.closing={closed:true,counted:'1'}; saveDB();
    currentDate='2026-11-18'; document.getElementById('doc-date').value='2026-11-18'; changeDate();
    openDayClose(); await new Promise(r=>setTimeout(r,200)); window.__pin=null; window.__asked=[];
    const btn=document.querySelector('#cl-modal [data-del="2026-11-17|a1"]'); btn.click(); await new Promise(r=>setTimeout(r,300));
    const left=(db['2026-11-17'].advances||[]).length; document.querySelector('#cl-x').click(); return {left,asked:window.__asked.join(' | ')}; });
  ok(r.left===1&&/PIN/.test(r.asked),'8 ลบเบิกของวันที่ปิดยอด (ยกเลิก PIN) → รายการยังอยู่ ('+r.asked.slice(0,60)+')');

  // 4) รีเซ็ตการตั้งค่าทั้งหมด → ต้องใส่ PIN ปัจจุบัน
  r=await pg.evaluate(async()=>{ localStorage.setItem('pawn_krabi_app_settings',JSON.stringify({org:'ทดสอบ',autoLockMin:5}));
    openDataSettings(); await new Promise(r=>setTimeout(r,300)); const tb=document.querySelector('#ds-modal [data-tab="use"]'); if(tb) tb.click(); await new Promise(r=>setTimeout(r,300));
    const btn=document.getElementById('ds-reset'); if(!btn) return {nobtn:true};
    localStorage.setItem('pawn_krabi_app_settings',JSON.stringify({org:'ทดสอบ',autoLockMin:5})); window.__asked=[];
    window.__pin='9999'; btn.click(); await new Promise(r=>setTimeout(r,300)); const wrong=localStorage.getItem('pawn_krabi_app_settings'); window.__dbg=window.__asked.join(' | ');
    window.__pin='1234'; document.getElementById('ds-reset').click(); await new Promise(r=>setTimeout(r,300)); const right=localStorage.getItem('pawn_krabi_app_settings');
    try{ closeDataSettings(); }catch(e){} return {wrong,right,dbg:window.__dbg}; });
  ok(!r.nobtn&&/ทดสอบ/.test(r.wrong||'')&&/PIN ปัจจุบัน/.test(r.dbg),'9 รีเซ็ตด้วย PIN ผิด → การตั้งค่า/PIN ยังอยู่ '+(r.dbg||'').slice(0,90));
  ok(!/ทดสอบ/.test(r.right||''),'10 รีเซ็ตด้วย PIN ถูก → รีเซ็ตแล้ว');
  a=await audits(); ok(a.includes('รีเซ็ตการตั้งค่าทั้งหมด'),'11 รีเซ็ตการตั้งค่า → มีบันทึกในประวัติ');

  // 5) คีย์ด่วน: ไถ่ถอน/ติดตั๋วใหม่ของปีก่อน (เล่ม+เลขเดียวกัน) ไม่เตือน
  r=await pg.evaluate(async()=>{ Object.keys(db).forEach(k=>delete db[k]); const M='พฤศจิกายน';
    currentDate='2025-11-20'; let d=getCurrentDayData(); d.months=[M,'','','','','']; d.data[M]=d.data[M]||[]; d.data[M][0]={type:'ถ',ticket:'88',book:'4',amount:'100',count:'',newTicket:'900',newBook:'5',newAmount:'100'}; saveDB();
    currentDate='2026-11-20'; d=getCurrentDayData(); d.months=[M,'','','','','']; d.data[M]=d.data[M]||[]; saveDB(); renderTable();
    const q=id=>document.getElementById(id); window.__asked=[]; window.__yes=false;
    q('qs-type').value='ถ'; q('qs-month').value='11'; q('qs-ticket').value='88'; q('qs-book').value='4'; q('qs-amount').value='100'; q('qs-new-ticket').value='900'; q('qs-new-book').value='5'; q('qs-new-amount').value='100';
    submitQuickScan(); await new Promise(r=>setTimeout(r,300)); window.__yes=true;
    const row=(db['2026-11-20'].data[M]||[]).find(x=>x&&x.ticket==='88'); return {asked:window.__asked.join(' | '), saved:!!row}; });
  ok(!/เคยถูกไถ่/.test(r.asked)&&!/เคยถูกติด/.test(r.asked)&&r.saved,'12 คีย์ด่วนตั๋ว 88/4 → ตั๋วใหม่ 900/5 ของปีก่อน: ไม่เตือน บันทึกได้ ('+r.asked.slice(0,80)+')');
  r=await pg.evaluate(async()=>{ const M='พฤศจิกายน'; currentDate='2026-10-01'; let d=getCurrentDayData(); d.months=[M,'','','','','']; d.data[M]=d.data[M]||[]; d.data[M][0]={type:'ถ',ticket:'66',book:'7',amount:'100',count:''}; saveDB();
    currentDate='2026-11-20'; renderTable(); const q=id=>document.getElementById(id); window.__asked=[]; window.__yes=false;
    q('qs-type').value='ถ'; q('qs-month').value='11'; q('qs-ticket').value='66'; q('qs-book').value='7'; q('qs-amount').value='100'; ['qs-new-ticket','qs-new-book','qs-new-amount'].forEach(i=>q(i).value='');
    submitQuickScan(); await new Promise(r=>setTimeout(r,300)); window.__yes=true; return window.__asked.join(' | '); });
  ok(/เคยถูกไถ่/.test(r),'13 ไถ่ถอนเมื่อ 50 วันก่อน → ยังเตือนตามเดิม');

  // 6) ยกเลิกการติดตั๋วใหม่ ใช้กล่องของเว็บ
  native=0; r=await pg.evaluate(async()=>{ const M='พฤศจิกายน', row=db['2026-11-20'].data[M].find(x=>x&&x.ticket==='88'); const i=db['2026-11-20'].data[M].indexOf(row);
    const btn=document.createElement('button'); btn.dataset.m=M; btn.dataset.i=String(i); window.__asked=[]; qsUnlink(btn); await new Promise(r=>setTimeout(r,200)); return {nt:row.newTicket||'',asked:window.__asked.length}; });
  ok(native===0&&r.asked===1&&r.nt==='','14 ยกเลิกการติดตั๋วใหม่ → ถามด้วยกล่องของเว็บ แล้วยกเลิกแล้ว');
  ok(!pg.errs.length,'15 ไม่มี error '+pg.errs.join('|'));
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0); })();
