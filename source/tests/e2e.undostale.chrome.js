// ทดสอบเลิกทำ/ทำซ้ำ: ฉบับที่เก็บไว้มียอดยกมา/ย/ม เก่า (วันก่อนหน้าถูกแก้ทีหลัง) ต้องคิดใหม่ ไม่ย้อนยอดเก่ากลับมา
const path=require('path'); const {chromium}=require('playwright'); let fail=0; const ok=(c,m,x)=>{ if(!c){fail++;console.log('FAIL',m,x===undefined?'':JSON.stringify(x));} else console.log('ok  ',m); }; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const pg=await (await b.newContext({viewport:{width:1366,height:900}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+(process.env.FILE||path.join(__dirname,'../../index.html'))+'',{waitUntil:'domcontentloaded'}); await sleep(2500);
 await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger');
  window.alert=()=>{}; window.confirm=()=>true; Object.keys(db).forEach(k=>delete db[k]); window.__resetUndo&&window.__resetUndo();
  const M='ตุลาคม'; const mk=k=>{ currentDate=k; const d=getCurrentDayData(); d.months=[M,'','','','','']; d.data[M]=d.data[M]||[]; return d; };
  let d=mk('2026-11-16'); d.bf=[10000,0,0,0,0,0]; d.bfCount=[2,0,0,0,0,0]; syncDailyOpeningFromMonthlyBF('2026-11-16'); updateSummaryColumn(); saveDB();
  mk('2026-11-17'); syncBroughtForwardForDate('2026-11-17',true); updateSummaryColumn(); saveDB(); });
 const S=async()=>pg.evaluate(()=>{ const s=db['2026-11-17'].data['สรุปประจำวัน']; return {bf:db['2026-11-17'].bf[0],bfc:db['2026-11-17'].bfCount[0],om:s[0].count+'/'+s[0].amount,bal:s[3].count+'/'+s[3].amount,exp:getMonthCarriedBalance('2026-11-16','ตุลาคม')}; });
 const go=async k=>{ await pg.evaluate(k=>{ currentDate=k; renderTable(); },k); };
 await go('2026-11-17'); await sleep(1200); // base D17
 await go('2026-11-16'); await pg.evaluate(()=>{ const d=db['2026-11-16']; d.data['ตุลาคม'][0]={type:'ถ',ticket:'601',book:'1',amount:1500,count:'',origIdx:0,timestamp:''}; updateSummaryColumn(); recalculateFutureBroughtForwardBalances('2026-11-16'); }); await sleep(1200);
 const afterD16=await S();
 await go('2026-11-17'); await pg.evaluate(()=>{ const d=db['2026-11-17']; d.data['ตุลาคม'][0]={type:'ส',ticket:'602',book:'1',amount:500,count:'',origIdx:0,timestamp:''}; updateSummaryColumn(); saveDB(); }); await sleep(1200);
 const afterD17=await S();
 await pg.evaluate(()=>window.undoEdit()); await sleep(400);
 const afterUndo=await S();
 await pg.evaluate(()=>window.redoEdit()); await sleep(400); const afterRedo=await S();
 ok(afterD16.bf===8500&&afterD17.bal==='0/8000','1 ตั้งต้น: แก้วัน 16 แล้ววัน 17 ยกมา 8,500 / 1 ราย · แก้วัน 17 แล้วคงเหลือ 0/8,000',[afterD16,afterD17]);
 ok(afterUndo.bf===8500&&afterUndo.bfc===1&&afterUndo.om==='1/8500'&&afterUndo.bal==='1/8500','2 เลิกทำวัน 17: ยกมา/ย/ม/คงเหลือ = ตามวัน 16 ที่แก้แล้ว (8,500 / 1) ไม่ย้อนเป็น 10,000 / 2',afterUndo);
 ok(afterRedo.bf===8500&&afterRedo.bal==='0/8000','3 ทำซ้ำวัน 17: ยกมาถูก คงเหลือ 0/8,000',afterRedo);
 ok(!errs.length,'4 ไม่มี error',errs); await b.close(); process.exit(fail?1:0); })();
