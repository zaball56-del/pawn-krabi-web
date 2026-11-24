// หน้าเขียนตั๋ว → สแกนตั๋วเดิม: บันทึกอัตโนมัติเมื่อข้อมูลครบทุกช่อง + ระหว่างพิมพ์ไม่ดึงข้อมูลตั๋วใบอื่น (ผู้ใช้ขอ 24 พ.ย. 69)
const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const path=require('path'); const FILE=process.env.FILE||path.join(__dirname,'../../index.html');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const pg=await (await b.newContext({viewport:{width:1200,height:900}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
  await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
  const K='2026-11-24';
  await pg.evaluate(async(K)=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); if(ac){ ac.classList.remove('hidden'); ac.style.display='flex'; }
    Object.keys(db).forEach(k=>delete db[k]);
    currentDate='2026-11-13'; let d=getCurrentDayData(); d.months=['พฤศจิกายน','','','','','']; d.data['พฤศจิกายน']=[{type:'ส',ticket:'5',book:'250',amount:'1500',timestamp:'09:00:00'},{type:'ส',ticket:'56',book:'262',amount:'4000',timestamp:'09:00:00'}];   // ข้อมูลที่คีย์เอง (ยังไม่ยืนยันกับ สธ.3)
    currentDate=K; d=getCurrentDayData(); d.months=['พฤศจิกายน','','','','','']; d.data['พฤศจิกายน']=d.data['พฤศจิกายน']||[]; saveDB();
    const e=[['','']]; tkwImportAll({[K]:{m:[6,7,8,9,10,11],r:[e,e,e,e,e,e]}},'over');
    localStorage.setItem('pawn_tkw_auto','1');
    tkwOpen(); await new Promise(s=>setTimeout(s,250)); document.getElementById('tkw-scan-btn').click(); await new Promise(s=>setTimeout(s,200));
    const a=document.getElementById('tkw-sq-auto'); if(a&&!a.checked){ a.checked=true; a.dispatchEvent(new Event('change',{bubbles:true})); } },K);
  const col=()=>pg.evaluate(K=>{ const d=tkwReadDay(K); const g=d.m.indexOf(11); return (d.r[g]||[]).filter(x=>x&&x[0]).map(x=>x[0]+'='+x[1]).join(','); },K);
  const V=()=>pg.evaluate(()=>['tkw-sq-m','tkw-sq-t','tkw-sq-a'].map(i=>document.getElementById(i).value).join('|'));
  const typeIn=async(id,txt)=>{ await pg.focus('#'+id); await pg.evaluate(id=>{ const e=document.getElementById(id); e.value=''; e.dispatchEvent(new Event('input',{bubbles:true})); },id); await pg.keyboard.type(txt,{delay:150}); };
  // 1 ระหว่างพิมพ์ไม่ดึงข้อมูลตั๋ว 5 · พิมพ์จบเป็น 56 → ดึงยอด 56 (ข้อมูลที่คีย์เอง) และบันทึกเอง
  await typeIn('tkw-sq-m','11'); await pg.focus('#tkw-sq-t'); await pg.keyboard.type('5'); await sleep(150); const mid=await V(); await pg.keyboard.type('6'); await sleep(900);
  const filled=await V();
  ok(/^11\|5\|$/.test(mid),'1a กด 5 แล้วกดต่อทันที → ยังไม่ดึงยอดของตั๋ว 5 '+mid);
  ok(/^11\|56\|4,?000$/.test(filled),'1b พิมพ์จบเป็น 56 → ดึงยอด 4,000 ของ 56 '+filled);
  await sleep(2600);
  ok(/56=4000/.test(await col()),'1 ยอดจากข้อมูลที่คีย์เอง ครบทุกช่อง → บันทึกเอง (เดิมไม่บันทึกเอง) '+await col());
  // 2 ตั๋วที่ไม่มีในข้อมูลเดิม: พิมพ์ยอดเอง → รอหยุดพิมพ์ 2 วิแล้วบันทึกเอง
  await typeIn('tkw-sq-t','777'); await sleep(800); await typeIn('tkw-sq-a','900'); await sleep(1200);
  const c2a=await col(); await sleep(1800);
  ok(!/777=/.test(c2a)&&/777=900/.test(await col()),'2 พิมพ์ยอดเอง → ไม่บันทึกระหว่างพิมพ์ · หยุด 2 วิแล้วบันทึกเอง '+await col());
  // 3 ปิดบันทึกอัตโนมัติ → ไม่บันทึกเอง
  await pg.evaluate(()=>{ const a=document.getElementById('tkw-sq-auto'); a.checked=false; a.dispatchEvent(new Event('change',{bubbles:true})); });
  await typeIn('tkw-sq-t','888'); await typeIn('tkw-sq-a','500'); await sleep(2800);
  ok(!/888=/.test(await col()),'3 ปิดบันทึกอัตโนมัติ → ไม่บันทึกเอง');
  ok(!errs.length,'4 ไม่มี error '+JSON.stringify(errs));
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
