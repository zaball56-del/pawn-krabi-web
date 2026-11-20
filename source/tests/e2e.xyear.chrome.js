// ทดสอบ: คอลัมน์เดือนชื่อเดียวกันที่ห่างเกิน 45 วัน (ตามปฏิทิน) ไม่ดึงยอดยกมาข้ามกัน (กันดึงยอดเดือนเดียวกันของปีก่อน)
// รัน: node tests/e2e.xyear.chrome.js
const path=require('path'); const {chromium}=require('playwright');
const URL='file://'+path.join(__dirname,'../../index.html'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']}); const pg=await (await b.newContext()).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto(URL,{waitUntil:'domcontentloaded'}); await sleep(2500);
  const r=await pg.evaluate(()=>{ window.confirm=()=>true; window.alert=()=>{}; const out={};
    const reset=()=>Object.keys(db).forEach(k=>delete db[k]);
    const mk=(k,ms,bf)=>{ currentDate=k; const d=getCurrentDayData(); d.months=ms.concat(Array(6-ms.length).fill('')); d.bf=bf.concat(Array(6-bf.length).fill(0)); d.bfCount=d.bf.map(v=>v?1:0);
      ms.forEach(m=>d.data[m]=d.data[m]||[]); d.data[ms[ms.length-1]][0]={type:'ต',ticket:'9'+k.slice(-2),book:'1',amount:1,count:'',origIdx:0,timestamp:''}; saveDB(); return d; };
    // 1) ข้ามปี: ตุลาคม 2569 ค้าง 30,000 แล้วคอลัมน์หายไป (เอาออกแบบเดิม) → ตุลาคม 2570 ต้องเริ่ม 0
    reset(); mk('2026-10-30',['ตุลาคม','พฤศจิกายน'],[30000,50000]); mk('2027-04-01',['พฤศจิกายน','ธันวาคม'],[50000,60000]); mk('2027-10-01',['ธันวาคม','ตุลาคม'],[60000,0]);
    syncBroughtForwardForDate('2027-10-01',false); out.xOpen=db['2027-10-01'].bf[1]; syncBroughtForwardForDate('2027-10-01',true); out.xForce=db['2027-10-01'].bf[1];
    recalculateFutureBroughtForwardBalances('2026-10-01'); out.xRecalc=db['2027-10-01'].bf[1]; out.xDec=db['2027-10-01'].bf[0];
    // 2) ร้านหยุด 44 วัน → ยังดึงยอดเดือนเดิม
    reset(); mk('2026-03-01',['มกราคม'],[12345]); mk('2026-04-14',['มกราคม'],[0]); syncBroughtForwardForDate('2026-04-14',true); out.gap44=db['2026-04-14'].bf[0];
    // 3) ห่าง 46 วัน → ถือเป็นคนละรอบ ไม่ดึง (คงค่าที่มีอยู่ ไม่เขียนทับ)
    reset(); mk('2026-03-01',['มกราคม'],[12345]); mk('2026-04-16',['มกราคม'],[0]); syncBroughtForwardForDate('2026-04-16',true); out.gap46=db['2026-04-16'].bf[0];
    // 4) ใช้งานปกติ: ศุกร์ → จันทร์ ดึงตามปกติ
    reset(); mk('2026-11-13',['พฤศจิกายน'],[7000]); mk('2026-11-16',['พฤศจิกายน'],[0]); syncBroughtForwardForDate('2026-11-16',true); out.weekend=db['2026-11-16'].bf[0];
    return out; });
  console.log('   ',JSON.stringify(r));
  ok(r.xOpen===0&&r.xForce===0&&r.xRecalc===0,'1 ตุลาคมปีถัดไป ไม่ดึงยอดค้าง 30,000 ของปีก่อน (เปิดวัน / คำนวณใหม่ / ส่งต่อ = 0)');
  ok(r.xDec===60000,'2 เดือนอื่นที่ห่างเกิน 45 วันเหมือนกัน → คงค่าที่มีอยู่ ไม่ถูกเขียนทับ (ธันวาคม 60,000)');
  ok(r.gap44===12345,'3 ห่าง 44 วัน (ร้านหยุดยาว) → ยังดึงยอดเดิม');
  ok(r.gap46===0,'4 ห่าง 46 วัน → ถือเป็นคนละรอบ ไม่ดึง');
  ok(r.weekend===7000,'5 ศุกร์ → จันทร์ ดึงตามปกติ');
  ok(!errs.length,'6 ไม่มี error '+errs.join('|'));
  await b.close(); console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})();
