// ทดสอบนำเข้า JSON: วันที่ปิดยอดแล้ว ต้องขอ PIN ก่อนทับ/ลบ · ไม่ใส่/ผิด = ข้ามเฉพาะวันนั้น
const path=require('path'); const {chromium}=require('playwright'); let fail=0; const ok=(c,m,x)=>{ if(!c){fail++;console.log('FAIL',m,x===undefined?'':JSON.stringify(x));} else console.log('ok  ',m); };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const pg=await (await b.newContext({viewport:{width:1366,height:900}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+(process.env.FILE||path.join(__dirname,'../../index.html')),{waitUntil:'domcontentloaded'}); await sleep(2500);
 await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger'); window.alert=()=>{}; window.confirm=()=>true; });
 const run=(mode,pin)=>pg.evaluate(async([mode,pin])=>{
  Object.keys(db).forEach(k=>delete db[k]); const M='ตุลาคม';
  const mk=k=>{ currentDate=k; const d=getCurrentDayData(); d.months=[M,'','','','','']; d.data[M]=d.data[M]||[]; return d; };
  let d=mk('2026-11-16'); d.bf=[10000,0,0,0,0,0]; d.bfCount=[2,0,0,0,0,0]; syncDailyOpeningFromMonthlyBF('2026-11-16'); updateSummaryColumn(); saveDB();
  mk('2026-11-17'); syncBroughtForwardForDate('2026-11-17',true); updateSummaryColumn(); saveDB();
  const file=JSON.parse(JSON.stringify(db)); file['2026-11-16'].data[M][0]={type:'ถ',ticket:'601',book:'1',amount:1500,count:'',origIdx:0,timestamp:''};
  db['2026-11-16'].closing={opening:'',adj:'',adjNote:'',counted:'1',note:'',closed:true,closedAt:'x'}; delete window.__unlocked['2026-11-16'];
  window.uiChoice=async()=>mode; window.uiConfirm=async()=>true; let asked=0; window.uiPrompt=async()=>{ asked++; return pin; };
  await importJSON({target:{files:[{name:'b.json',text:async()=>JSON.stringify(file)}]}}); await new Promise(r=>setTimeout(r,300));
  const f=db['2026-11-16']; return {asked,ticket:(f.data[M][0]||{}).ticket||'',closed:!!(f.closing&&f.closing.closed)}; },[mode,pin]);
 const pinGood=await pg.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('pawn_krabi_app_settings')||'{}'); return s.pinHash?null:String(CORRECT_PIN); });
 const good=pinGood||'0000';
 let r=await run('over',good); ok(r.asked===1&&r.ticket==='601'&&!r.closed,'1 ใช้ของในไฟล์แทน + ใส่ PIN ถูก: ทับวันที่ปิดยอดแล้วได้ (ถามครั้งเดียว)',r);
 r=await run('over','9999x'); ok(r.asked===1&&r.ticket===''&&r.closed,'2 ใส่ PIN ผิด: ข้ามวันที่ปิดยอดแล้ว ข้อมูลเดิม+สถานะปิดยอดอยู่ครบ',r);
 r=await run('over',null); ok(r.asked===1&&r.ticket===''&&r.closed,'3 ยกเลิกช่อง PIN: ข้ามวันที่ปิดยอดแล้ว',r);
 r=await run('add','9999x'); ok(r.asked===0&&r.ticket==='','4 เพิ่มเฉพาะวันที่ยังไม่มี: ไม่แตะวันที่มีอยู่ ไม่ถาม PIN',r);
 ok(!errs.length,'5 ไม่มี error',errs); await b.close(); process.exit(fail?1:0); })();
