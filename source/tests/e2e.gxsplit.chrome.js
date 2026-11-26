// ค้นประวัติตั๋ว: ตั๋วเลขซ้ำกันคนละใบ (เลขตั๋วเริ่มใหม่ทุกเดือน) ต้องไม่รวมเป็นสายเดียว (แก้บั๊ค 26 พ.ย. 69)
const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const path=require('path'); const FILE=process.env.FILE||path.join(__dirname,'../../index.html');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const run=async(bk,mob)=>{
    const pg=await (await b.newContext(mob?{viewport:{width:390,height:780},isMobile:true,hasTouch:true}:{viewport:{width:1300,height:900}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
    await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
    await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
    await pg.evaluate(bk=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); if(ac){ac.classList.remove('hidden');ac.style.display='flex';} Object.keys(db).forEach(k=>delete db[k]); const M=['มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน'];
      const put=(k,m,r)=>{ currentDate=k; const d=getCurrentDayData(); d.months=M.slice(); M.forEach(x=>d.data[x]=d.data[x]||[]); d.data[m].push(r); };
      put('2026-09-10','กันยายน',{type:'ส',ticket:'90',book:bk?'240':'',amount:'3000',newTicket:'445',newBook:bk?'250':'',newAmount:'3000',timestamp:'09:00:00'});
      put('2026-10-12','กันยายน',{type:'ถ',ticket:'445',book:bk?'250':'',amount:'3000',timestamp:'09:00:00'});
      put('2026-11-20','ตุลาคม',{type:'พ',ticket:'300',book:bk?'255':'',amount:'5000',newTicket:'445',newBook:bk?'264':'',newAmount:'7000',timestamp:'10:00:00'});
      put('2026-11-26','พฤศจิกายน',{type:'ผ',ticket:'445',book:bk?'264':'',amount:'7000',newTicket:'512',newBook:bk?'264':'',newAmount:'6000',timestamp:'11:00:00'});
      saveDB(); renderTable(); openGlobalSearch(); },bk);
    await sleep(700); await pg.evaluate(()=>{ document.getElementById('global-search-input').value='445'; executeGlobalSearch(); }); await sleep(1200);
    const r=await pg.evaluate(()=>{ const h=document.getElementById('gs-timeline'); const t=s=>{ const e=h.querySelector(s); return e?e.innerText.replace(/\s+/g,' ').trim():''; };
      return {res:t('.gx-res'), money:t('.gx-money'), chain:t('.gx-chain'), rows:h.querySelectorAll('.gx-hist .gx-tr:not(.gx-th)').length, oth:t('.gx-oth')}; });
    r.errs=errs; await pg.context().close(); return r; };
  for(const [bk,mob] of [[false,false],[true,false],[true,true]]){
    const r=await run(bk,mob), tag=(bk?'มีเล่ม':'ไม่มีเล่ม')+(mob?' มือถือ':' คอม');
    ok(/พบข้อมูล 2 ครั้ง/.test(r.res)&&/20\/11\/2569 – 26\/11\/2569/.test(r.res),tag+' · สรุปนับเฉพาะใบล่าสุด 2 ครั้ง 20/11–26/11 · '+r.res);
    ok(/5,000/.test(r.money)&&/6,000/.test(r.money)&&/\+20\.00%/.test(r.money)&&!/3,000/.test(r.money),tag+' · ยอดเริ่มต้น 5,000 → 6,000 (+20%) ไม่ใช่ 3,000 · '+r.money);
    ok(r.rows===2&&/300.*445.*512/.test(r.chain),tag+' · ตารางประวัติ 2 แถว สาย 300→445→512 · '+r.rows+' '+r.chain);
    ok(/ใบอื่น/.test(r.oth)&&/90/.test(r.oth)&&/ไถ่ถอนแล้ว/.test(r.oth),tag+' · ใบเก่า 90→445 (ไถ่ถอนแล้ว) แยกไว้กล่อง "ใบอื่น" · '+r.oth.slice(0,120));
    ok(!r.errs.length,tag+' · ไม่มี error '+JSON.stringify(r.errs)); }
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
