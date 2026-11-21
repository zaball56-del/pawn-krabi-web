// ทดสอบนำเข้า JSON: วันที่เพิ่ม/แทนจากไฟล์ → ยกมา ย/ม คงเหลือของวันถัดไปคิดตามใหม่ (เดิมค้างค่าเก่า)
const path=require('path'); const {chromium}=require('playwright'); let fail=0; const ok=(c,m,x)=>{ if(!c){fail++;console.log('FAIL',m,x===undefined?'':JSON.stringify(x));} else console.log('ok  ',m); }; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const pg=await (await b.newContext({viewport:{width:1366,height:900}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+(process.env.FILE||path.join(__dirname,'../../index.html'))+'',{waitUntil:'domcontentloaded'}); await sleep(2500);
 await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger'); window.alert=m=>{(window.__al=window.__al||[]).push(m)}; window.confirm=()=>true; });
 const out=await pg.evaluate(async()=>{
  Object.keys(db).forEach(k=>delete db[k]); const M='ตุลาคม';
  const mk=k=>{ currentDate=k; const d=getCurrentDayData(); d.months=[M,'','','','','']; d.data[M]=d.data[M]||[]; return d; };
  let d=mk('2026-11-16'); d.bf=[10000,0,0,0,0,0]; d.bfCount=[2,0,0,0,0,0]; syncDailyOpeningFromMonthlyBF('2026-11-16'); updateSummaryColumn(); saveDB();
  mk('2026-11-17'); syncBroughtForwardForDate('2026-11-17',true); updateSummaryColumn(); saveDB();
  const file=JSON.parse(JSON.stringify(db)); // ไฟล์สำรอง = ก่อนแก้วัน 16
  // ในไฟล์: วัน 16 มีไถ่ถอนเพิ่ม (ฉบับแก้แล้ว) แต่วัน 17 เก่า
  file['2026-11-16'].data[M][0]={type:'ถ',ticket:'601',book:'1',amount:1500,count:'',origIdx:0,timestamp:''}; file['2026-11-16'].data['สรุปประจำวัน'][2]={type:'ไถ่ถอน',count:1,amount:1500}; file['2026-11-16'].data['สรุปประจำวัน'][3]={type:'คงเหลือ',count:1,amount:8500};
  window.uiChoice=async()=>'over'; window.savePreImportRecoverySnapshot=window.savePreImportRecoverySnapshot||(async()=>true);
  await importJSON({target:{files:[{name:'b.json',text:async()=>JSON.stringify(file)}]}}); await new Promise(r=>setTimeout(r,300));
  const s16=db['2026-11-16'].data['สรุปประจำวัน'], s17=db['2026-11-17'].data['สรุปประจำวัน'];
  return {d16:[s16[2].count+'/'+s16[2].amount,s16[3].count+'/'+s16[3].amount],closed16:db['2026-11-16'].closing,d17:[s17[0].count+'/'+s17[0].amount,s17[3].count+'/'+s17[3].amount],bf17:db['2026-11-17'].bf[0],al:window.__al||[]}; });
 const out2=await pg.evaluate(async()=>{
  Object.keys(db).forEach(k=>delete db[k]); const M='ตุลาคม'; window.__al=[];
  const mk=k=>{ currentDate=k; const d=getCurrentDayData(); d.months=[M,'','','','','']; d.data[M]=d.data[M]||[]; return d; };
  let d=mk('2026-11-16'); d.bf=[10000,0,0,0,0,0]; d.bfCount=[2,0,0,0,0,0]; d.data[M][0]={type:'ถ',ticket:'601',book:'1',amount:1500,count:'',origIdx:0,timestamp:''}; syncDailyOpeningFromMonthlyBF('2026-11-16'); updateSummaryColumn(); saveDB();
  const file=JSON.parse(JSON.stringify(db)); // ไฟล์มีวัน 16 (คงเหลือ 1 ราย / 8,500)
  Object.keys(db).forEach(k=>delete db[k]);
  d=mk('2026-11-17'); d.bf=[9999,0,0,0,0,0]; d.bfCount=[7,0,0,0,0,0]; syncDailyOpeningFromMonthlyBF('2026-11-17'); updateSummaryColumn(); saveDB(); // เครื่องมีแต่วัน 17 (ยกมาพิมพ์เอง)
  window.uiChoice=async()=>'add'; await importJSON({target:{files:[{name:'b.json',text:async()=>JSON.stringify(file)}]}}); await new Promise(r=>setTimeout(r,300));
  const s17=db['2026-11-17'].data['สรุปประจำวัน']; return {bf17:db['2026-11-17'].bf[0],om:s17[0].count+'/'+s17[0].amount,bal:s17[3].count+'/'+s17[3].amount,days:Object.keys(db).sort()}; });
 ok(out.d16[1]==='1/8500'&&out.d17[0]==='1/8500'&&out.d17[1]==='1/8500'&&out.bf17===8500,'1 นำเข้าแบบ "ใช้ของในไฟล์แทน": วัน 16 ถูก และวัน 17 ย/ม/คงเหลือ/ยกมา คิดตาม = 1 ราย / 8,500',out);
 ok(out2.days.join()==='2026-11-16,2026-11-17'&&out2.bf17===8500&&out2.om==='1/8500'&&out2.bal==='1/8500','2 นำเข้าแบบ "เพิ่มเฉพาะวันที่ยังไม่มี" (วัน 16 อยู่ก่อนวัน 17): วัน 17 คิดตามโซ่ใหม่',out2);
 ok(!errs.length,'3 ไม่มี error',errs); await b.close(); process.exit(fail?1:0); })();
