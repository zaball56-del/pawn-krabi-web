// ทดสอบไฟล์สำรอง + การนำเข้าแบบเลือกวิธี ในแอปจริง (Chrome ออฟไลน์ ไม่ต่อ Firebase) · ไม่ใส่ PIN ใด ๆ
// ต้อง build ก่อน: python3 tools/build.py ../index.html   รัน: NODE_PATH=<node_modules ที่มี playwright> node tests/e2e.backup.chrome.js
const path=require('path'); const {chromium}=require('playwright');
const URL='file://'+path.join(__dirname,'../../index.html'); const M='พฤศจิกายน';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
async function open(ctx){
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,160)));
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
  await pg.goto(URL,{waitUntil:'domcontentloaded'}); await sleep(2500);
  await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); });
  pg.errs=errs; return pg;
}
const day=t=>`{months:['${M}'],bf:[0],bfCount:[0],data:{'${M}':[{type:'ถ',ticket:'${t}',book:'12',amount:1000,count:'',timestamp:'10:00:00'}],'สรุปประจำวัน':[]}}`;
/* นำเข้าไฟล์ด้วยข้อความ JSON · choice = คำตอบที่จะเลือกในกล่องเลือกวิธี (null = ยกเลิก) */
const imp=(pg,text,choice,confirm2)=>pg.evaluate(async([text,choice,confirm2])=>{
  window.__msg=''; window.__opts=[];
  window.uiChoice=(m,o)=>{ window.__msg=m; window.__opts=o.map(x=>x.v); return Promise.resolve(choice); };
  window.uiConfirm=(m)=>{ window.__msg2=m; return Promise.resolve(!!confirm2); };
  await importJSON({target:{files:[new File([text],'test-backup.json',{type:'application/json'})],value:''}});
  return {msg:window.__msg,opts:window.__opts,msg2:window.__msg2||'',keys:Object.keys(db).filter(k=>k).sort().join(','),k1:db['2026-11-10']&&db['2026-11-10'].data['พฤศจิกายน'][0].ticket};
},[text,choice,confirm2]);
const tkwTickets=(pg,k)=>pg.evaluate(k=>{ const d=window.tkwReadDay(k); const o=[]; (d&&d.r||[]).forEach(c=>c.forEach(x=>{ if(x&&String(x[0]).trim()) o.push(String(x[0])); })); return o.sort().join(','); },k);

(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  /* เครื่องเดิม: สมุดบัญชี 2 วัน + เขียนตั๋ว 1 วัน + วันหยุด 1 วัน → ทำไฟล์สำรอง */
  const c1=await b.newContext(); const p1=await open(c1);
  const file=await p1.evaluate(`(()=>{ db['2026-11-10']=${day('1001')}; db['2026-11-11']=${day('1002')}; saveDB();
    tkwImportS3('2026-11-11',[{month:11,ticket:'9001',book:'12',amount:500},{month:10,ticket:'9002',book:'12',amount:700}]);
    holidaysImport({'2026-12-05':{n:'วันพ่อ',u:Date.now()}});
    return pawnBackupText(true); })()`);
  const fo=JSON.parse(file);
  ok(fo._extra&&fo._extra.tkw&&fo._extra.tkw['2026-11-11']&&fo._extra.holidays&&fo._extra.holidays['2026-12-05'],'1 ไฟล์สำรองมีตารางเขียนตั๋ว + วันหยุด (_extra)');
  ok(Object.keys(fo).filter(k=>k!=='_extra').sort().join()==='2026-11-10,2026-11-11','2 สมุดบัญชีในไฟล์ครบ 2 วัน และ _extra ไม่ปนใน db ('+await p1.evaluate("'_extra' in db")+')');
  const auto=await p1.evaluate(`(()=>{ const s=document.getElementById('bk-js')?document.getElementById('bk-js').textContent:''; return /pawnBackupText\\(false\\)/.test(s); })()`);
  ok(auto,'3 สำรองอัตโนมัติลงโฟลเดอร์ใช้ไฟล์รูปแบบเดียวกัน');
  await c1.close();

  /* เครื่องใหม่/เครื่องที่มีข้อมูลอื่น: มีวัน 2026-11-10 (แก้ต่างจากไฟล์) และ 2026-11-12 (ไม่มีในไฟล์) */
  const seed2=`(()=>{ Object.keys(db).forEach(k=>delete db[k]); db['2026-11-10']=${day('5555')}; db['2026-11-12']=${day('1003')}; saveDB(); })()`;
  { const c=await b.newContext(); const p=await open(c); await p.evaluate(seed2);
    const r=await imp(p,file,null);
    ok(r.keys==='2026-11-10,2026-11-12'&&r.k1==='5555','4 กดยกเลิก → ข้อมูลไม่เปลี่ยน');
    ok(/ยังไม่มีในเครื่อง: 1 วัน/.test(r.msg)&&/ไม่ตรงกัน: 1 วัน/.test(r.msg)&&/ไม่มีในไฟล์: 1 วัน \(12\/11\/2569\)/.test(r.msg)&&/เขียนตั๋ว 1 วัน · วันหยุด 1 วัน/.test(r.msg),'5 กล่องเลือกแสดงจำนวนวันถูกต้อง');
    ok(r.opts.join()==='add,over,replace','6 มีให้เลือก 3 วิธี (เพิ่มเฉพาะที่ยังไม่มี / แทนวันที่ไม่ตรง / แทนที่ทั้งหมด)');
    const r2=await imp(p,file,'add'); await sleep(300);
    ok(r2.keys==='2026-11-10,2026-11-11,2026-11-12'&&r2.k1==='5555','7 "เพิ่มเฉพาะที่ยังไม่มี": ได้ 11/11 เพิ่ม · 10/11 ของเครื่องคงเดิม · 12/11 ไม่ถูกลบ');
    ok((await tkwTickets(p,'2026-11-11'))==='9001,9002','8 ตารางเขียนตั๋วกลับมาจากไฟล์ ('+(await tkwTickets(p,'2026-11-11'))+')');
    ok(await p.evaluate("isHolidayDate('2026-12-05')&&holidayName('2026-12-05')==='วันพ่อ'"),'9 วันหยุดกลับมาจากไฟล์');
    ok(!p.errs.length,'10 ไม่มี error ในหน้า '+p.errs.join(' | ')); await c.close(); }
  { const c=await b.newContext(); const p=await open(c); await p.evaluate(seed2);
    const r=await imp(p,file,'over');
    ok(r.keys==='2026-11-10,2026-11-11,2026-11-12'&&r.k1==='1001','11 "แทนวันที่ไม่ตรง": 10/11 ใช้ของไฟล์ · 12/11 ยังอยู่'); await c.close(); }
  { const c=await b.newContext(); const p=await open(c); await p.evaluate(seed2);
    const r0=await imp(p,file,'replace',false);
    ok(r0.keys==='2026-11-10,2026-11-12'&&/ลบ 1 วัน \(12\/11\/2569\)/.test(r0.msg2),'12 "แทนที่ทั้งหมด" ต้องยืนยันซ้ำ (บอกวันที่จะถูกลบ) · กดกลับ = ไม่เปลี่ยน');
    const r=await imp(p,file,'replace',true);
    ok(r.keys==='2026-11-10,2026-11-11'&&r.k1==='1001','13 ยืนยันแล้ว: แทนที่ตามไฟล์ (12/11 ถูกลบ)'); await c.close(); }
  { const c=await b.newContext(); const p=await open(c); await p.evaluate(seed2);
    const old=JSON.stringify({'2026-11-11':JSON.parse(file)['2026-11-11']});
    const r=await imp(p,old,'add');
    ok(r.keys==='2026-11-10,2026-11-11,2026-11-12'&&/ไม่มีตารางเขียนตั๋ว \(ไฟล์รุ่นก่อน\)/.test(r.msg),'14 ไฟล์สำรองรุ่นเก่า (ไม่มี _extra) ยังนำเข้าได้'); await c.close(); }
  { /* ภาพตัวอย่างกล่องเลือกจริง */
    const c=await b.newContext({viewport:{width:1100,height:820}}); const p=await open(c); await p.evaluate(seed2);
    await p.evaluate(t=>{ importJSON({target:{files:[new File([t],'pawn-krabi-backup-2026-11-19_1830.json')],value:''}}); },file); await sleep(800);
    await p.screenshot({path:path.join(__dirname,'../../../import-choice.png')});
    ok(await p.evaluate("!!document.querySelector('#ui-dialog') && document.querySelector('#ui-dialog').style.display==='flex'"),'15 กล่องเลือกวิธีแสดงจริงในหน้า'); await c.close(); }
  await b.close();
  console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})();
