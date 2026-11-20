// ทดสอบ: เครื่องสแกนบาร์โค้ด (ทำงานเหมือนคีย์บอร์ด) ยิงตอนเครื่องอยู่ภาษาไทย → ตัวอักษรไทยแถวบนถูกแปลงกลับเป็นตัวเลข
// รัน: node tests/e2e.thkey.chrome.js
const path=require('path'); const {chromium}=require('playwright');
const URL='file://'+path.join(__dirname,'../../index.html'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
const TH={'1':'ๅ','2':'/','3':'-','4':'ภ','5':'ถ','6':'ุ','7':'ึ','8':'ค','9':'ต','0':'จ'}; const th=s=>[...s].map(c=>TH[c]).join('');
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']}); const pg=await (await b.newContext()).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto(URL,{waitUntil:'domcontentloaded'}); await sleep(2500);
  await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); tkwOpen(); }); await sleep(600);
  const BC='6900205001342';   // ปีงบ 69 · เล่ม 205 · เลขที่ 134
  // 1) หน้าเขียนตั๋ว: ยิงแบบเครื่องสแกน (เร็ว) ตอนแป้นภาษาไทย
  const typ=(id,txt,gap)=>pg.evaluate(async([id,txt,gap])=>{ const el=document.getElementById(id); el.value=''; el.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(r=>setTimeout(r,120)); for(const ch of txt){ el.value+=ch; el.dispatchEvent(new InputEvent('input',{bubbles:true,data:ch})); await new Promise(r=>setTimeout(r,gap)); } return el.value; },[id,txt,gap]);
  await typ('tkw-sq-t',th(BC),6); await sleep(400);
  const r1=await pg.evaluate(()=>({v:document.getElementById('tkw-sq-t').value,msg:(document.getElementById('tkw-sq-msg')||{}).textContent||''}));
  ok(r1.v!==''&&!/[^\d]/.test(r1.v),'1 ช่องยิงบาร์โค้ดหน้าเขียนตั๋ว: ตัวอักษรไทยกลายเป็นตัวเลข ('+r1.v+')');
  ok(!/ไม่ตรงรูปแบบ/.test(r1.msg),'2 อ่านบาร์โค้ดได้ ไม่ขึ้นว่าไม่ตรงรูปแบบ ('+r1.msg.slice(0,60)+')');
  // 2) แป้นอังกฤษปกติ: ไม่เปลี่ยนอะไร
  await typ('tkw-sq-t',BC,6); await sleep(300); const r2=await pg.evaluate(()=>document.getElementById('tkw-sq-t').value);
  ok(/^\d+$/.test(r2),'3 แป้นอังกฤษ: ยิงได้ตามปกติ ('+r2+')');
  // 3) สมุดบัญชี สแกนด่วน (qs-ticket): ยิงภาษาไทย
  const r3=await pg.evaluate(async BCt=>{ const el=document.getElementById('qs-ticket'); if(!el) return 'NO'; el.value=''; let v='';
    for(const ch of BCt){ el.value+=ch; el.dispatchEvent(new InputEvent('input',{bubbles:true,data:ch})); await new Promise(r=>setTimeout(r,5)); } return el.value; },th(BC));
  ok(r3!=='NO'&&/^\d+$/.test(r3),'4 ช่องเลขตั๋วในสแกนด่วน (สมุดบัญชี): ตัวอักษรไทยกลายเป็นตัวเลข ('+r3+')');
  // 4) คนพิมพ์ช้า ๆ ที่มี - หรือ / : ไม่แปลง (อาจตั้งใจพิมพ์)
  const r4=await pg.evaluate(async()=>{ const el=document.getElementById('qs-ticket'); el.value='';
    for(const ch of '12-3'){ el.value+=ch; el.dispatchEvent(new InputEvent('input',{bubbles:true,data:ch})); await new Promise(r=>setTimeout(r,250)); } return el.value; });
  ok(r4==='12-3','5 พิมพ์ช้า "12-3" → คงไว้ตามที่พิมพ์ ('+r4+')');
  // 5) พิมพ์ช้าเป็นตัวอักษรไทยแถวตัวเลข (ลืมเปลี่ยนภาษา) → แปลงตัวอักษรไทย
  const r5=await pg.evaluate(async()=>{ const el=document.getElementById('qs-ticket'); el.value='';
    for(const ch of 'ๅภถ'){ el.value+=ch; el.dispatchEvent(new InputEvent('input',{bubbles:true,data:ch})); await new Promise(r=>setTimeout(r,250)); } return el.value; });
  ok(r5==='145','6 พิมพ์ช้าตอนลืมเปลี่ยนภาษา (ๅภถ) → 145 ('+r5+')');
  // 6) ช่องอื่นไม่ถูกแตะ
  const r6=await pg.evaluate(()=>{ const el=document.getElementById('qs-amount'); if(!el) return 'NO'; el.value='ค่า'; el.dispatchEvent(new Event('input',{bubbles:true})); return el.value; });
  ok(r6==='NO'||!/8/.test(r6),'7 ช่องอื่น (ยอดเงิน) ไม่ถูกแปลงเป็นตัวเลข ('+r6+')');
  ok(!errs.length,'8 ไม่มี error '+errs.join('|'));
  await b.close(); console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})();
