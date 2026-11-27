// กันเครื่องยิงบาร์โค้ดพิมพ์ผิดช่อง (แก้บั๊ค 27 พ.ย. 69 · ผู้ใช้เลือกแบบ ก: ยิงใบใหม่ = บันทึกใบเดิมให้ก่อนถ้าครบ)
const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const path=require('path'); const FILE=process.env.FILE||path.join(__dirname,'../../index.html');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
function bc(book,t){ let s='69'+'0'+String(book).padStart(4,'0')+String(t).padStart(5,'0'); let c=0; for(let i=0;i<12;i++) c+=(+s[i])*(i%2?3:1); return s+((10-c%10)%10); }
const C445=bc(264,445), C446=bc(264,446), C600=bc(270,600), CUNK=bc(299,777);
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const setup=async(mob,auto)=>{ const pg=await (await b.newContext(mob?{viewport:{width:390,height:780},isMobile:true,hasTouch:true}:{viewport:{width:1300,height:900}})).newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,160))); pg.on('dialog',d=>d.accept());
    await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
    await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
    await pg.evaluate(async(auto)=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger'); Object.keys(db).forEach(k=>delete db[k]);
      const M=['มิถุนายน','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน'];
      currentDate='2026-11-20'; let d=getCurrentDayData(); d.months=M.slice(); M.forEach(m=>d.data[m]=d.data[m]||[]);
      d.data['ตุลาคม']=[{type:'ส',ticket:'300',book:'240',amount:'7000',newTicket:'445',newBook:'264',newAmount:'7000'},{type:'ส',ticket:'301',book:'240',amount:'4000',newTicket:'446',newBook:'264',newAmount:'4000'}];
      currentDate='2026-11-28'; d=getCurrentDayData(); d.months=M.slice(); M.forEach(m=>d.data[m]=d.data[m]||[]); saveDB(); renderTable();
      localStorage.setItem('pawn_qs_auto',auto?'1':'0'); localStorage.setItem('pawn_tkw_auto',auto?'1':'0'); localStorage.setItem('pawn_qs_numpad','1'); },auto);
    return pg; };
  const L=pg=>pg.evaluate(()=>{ const d=db['2026-11-28'], o=[]; d.months.forEach(m=>(d.data[m]||[]).forEach(x=>{ if(x&&x.ticket) o.push(x.type+' '+x.ticket+'/'+(x.book||'')+'='+x.amount+(x.newTicket?'>'+x.newTicket+'/'+x.newBook:'')); })); return o.join(' ; ')||'-'; });
  const T=pg=>pg.evaluate(()=>{ const d=tkwReadDay('2026-11-28'); if(!d) return '-'; const o=[]; d.m.forEach((m,g)=>(d.r[g]||[]).forEach(x=>{ if(x&&x[0]) o.push(m+':'+x[0]+'='+x[1]); })); return o.join(', ')||'-'; });
  const V=(pg,ids)=>pg.evaluate(ids=>ids.map(i=>document.getElementById(i).value).join('|'),ids);
  const scan=async(pg,c,enter=true)=>{ await pg.keyboard.type(c,{delay:8}); if(enter) await pg.keyboard.press('Enter'); };
  const openQ=async(pg,mode,type)=>{ await pg.evaluate(()=>openQuickScanModal()); await sleep(900); await pg.evaluate(([m,t])=>{ document.querySelector('#qs-mode button[data-m="'+m+'"]').click(); document.querySelector('.qs-type-btn[data-type="'+t+'"]').click(); document.getElementById('qs-month').value=''; document.getElementById('qs-ticket').focus(); },[mode,type]); await sleep(200); };
  const openT=async(pg)=>{ await pg.evaluate(async()=>{ tkwOpen(); await new Promise(s=>setTimeout(s,300)); document.getElementById('tkw-scan-btn').click(); await new Promise(s=>setTimeout(s,200)); const a=document.getElementById('tkw-sq-auto'); const want=localStorage.getItem('pawn_tkw_auto')==='1'; if(a.checked!==want){a.checked=want;a.dispatchEvent(new Event('change',{bubbles:true}));} document.getElementById('tkw-sq-m').value=''; document.getElementById('tkw-sq-t').focus(); }); await sleep(200); };
  for(const mob of [false,true]){ const tg=mob?' [มือถือ]':' [คอม]';
    // 1 รักษาของ ปิดบันทึกอัตโนมัติ: ยิง 445 (ไม่กดบันทึก) แล้วยิง 446
    let pg=await setup(mob,false); await openQ(pg,'single','ถ'); await scan(pg,C445); await sleep(900); await scan(pg,C446); await sleep(1500);
    let l=await L(pg), v=await V(pg,['qs-ticket','qs-book','qs-amount']);
    ok(l==='ถ 445/264=7000'&&v==='446|264|4,000','1 รักษาของ (บันทึกอัตโนมัติปิด): ยิง 445 แล้วยิง 446 → บันทึก 445 = 7,000 แล้วรอ 446 / 4,000 (เดิม 445 = 70,006,900,…)'+tg+' · '+l+' · '+v);
    // 2 ยิงตั๋วที่ไม่มีข้อมูล → เคอร์เซอร์ไปยอดเงิน
    await pg.evaluate(()=>{ document.getElementById('qs-ticket').value=''; document.getElementById('qs-amount').value=''; document.getElementById('qs-book').value=''; document.getElementById('qs-ticket').focus(); }); await scan(pg,CUNK); await sleep(900);
    ok(await pg.evaluate(()=>document.activeElement.id)==='qs-amount','2 ยิงตั๋วที่ไม่มีข้อมูล → เคอร์เซอร์ไปช่องยอดเงิน (เดิมค้างช่องเล่ม)'+tg);
    ok(!pg.errs.length,'3 ไม่มี error'+tg+' '+pg.errs.join('|')); await pg.context().close();
    // 4 กล่องเตือนตั๋วซ้ำเปิดอยู่ แล้วยิงใบถัดไป → ไม่รับ ไม่บันทึก
    pg=await setup(mob,true); await openQ(pg,'single','ถ'); await scan(pg,C445); await sleep(2000); await scan(pg,C445); await sleep(1500);
    const dl=await pg.evaluate(()=>/บันทึกไว้แล้ว/.test(document.getElementById('ui-dialog').innerText));
    await scan(pg,C446); await sleep(2500); l=await L(pg);
    const still=await pg.evaluate(()=>getComputedStyle(document.getElementById('ui-dialog')).display!=='none');
    ok(dl&&still&&l==='ถ 445/264=7000','4 กล่องเตือนตั๋วซ้ำเปิดอยู่ ยิง 446 → ไม่ถูกกดยืนยันเอง ไม่บันทึก 446 ด้วยยอดของ 445'+tg+' · '+l);
    await pg.evaluate(()=>{ [...document.querySelectorAll('#ui-dialog button')].find(b=>b.textContent.trim()==='ยกเลิก').click(); }); await sleep(400);
    await pg.evaluate(()=>document.getElementById('qs-ticket').focus()); await scan(pg,C446); await sleep(2500); l=await L(pg);
    ok(l==='ถ 445/264=7000 ; ถ 446/264=4000','5 แตะยกเลิกแล้วยิง 446 ใหม่ → บันทึก 446 = 4,000 ถูกต้อง'+tg+' · '+l); await pg.context().close();
    // 6 ส ตั๋วเดิม+ใหม่ (ปิดอัตโนมัติ): เคอร์เซอร์อยู่ช่องยอดตั๋วเดิม แล้วยิงตั๋วใหม่ → ไปลงช่องตั๋วใหม่
    pg=await setup(mob,false); await openQ(pg,'full','ส'); await scan(pg,C445); await sleep(900); await pg.evaluate(()=>document.getElementById('qs-amount').focus()); await scan(pg,C600); await sleep(900);
    v=await V(pg,['qs-ticket','qs-amount','qs-new-ticket','qs-new-book']);
    ok(/^445\|7,000\|600\|270$/.test(v),'6 ส: ยิงตั๋วใหม่ตอนเคอร์เซอร์อยู่ช่องยอดตั๋วเดิม → ลงช่องตั๋วใหม่ ยอดเดิมไม่เปลี่ยน'+tg+' · '+v); await pg.context().close();
    // 7 เขียนตั๋ว ปิดบันทึกอัตโนมัติ: ยิง 445 แล้วยิง 446
    pg=await setup(mob,false); await openT(pg); await scan(pg,C445); await sleep(900); await scan(pg,C446); await sleep(1500);
    let t=await T(pg); v=await V(pg,['tkw-sq-t','tkw-sq-a']);
    ok(t==='11:445=7000'&&/^446\|4,?000$/.test(v),'7 เขียนตั๋ว (บันทึกอัตโนมัติปิด): ยิง 445 แล้วยิง 446 → บันทึก 445 = 7,000 แล้วรอ 446'+tg+' · '+t+' · '+v);
    // 8 ยอดเกิน 10 ล้าน → ไม่บันทึก (เขียนตั๋ว)
    await pg.evaluate(()=>{ const a=document.getElementById('tkw-sq-a'); a.value='70006900264'; document.getElementById('tkw-sq-save').click(); }); await sleep(400);
    ok((await T(pg))==='11:445=7000'&&/ผิดปกติ/.test(await pg.evaluate(()=>document.getElementById('tkw-sq-msg').textContent)),'8 เขียนตั๋ว: ยอดเกิน 10 ล้าน → ไม่บันทึก ขึ้นให้ตรวจ'+tg);
    await pg.context().close(); }
  // 9 คนพิมพ์ยอดเองช้า ๆ ไม่ถูกดัก · 10 ยอดเกิน 10 ล้านในคีย์ด่วน → ไม่บันทึก
  let pg=await setup(false,false); await openQ(pg,'single','ถ'); await pg.keyboard.type('445',{delay:120}); await sleep(900);
  await pg.evaluate(()=>{ const a=document.getElementById('qs-amount'); a.value=''; a.focus(); }); await pg.keyboard.type('7500',{delay:110}); await sleep(300);
  ok((await V(pg,['qs-amount'])).replace(/,/g,'')==='7500','9 คนพิมพ์ยอดเอง (ช้ากว่าเครื่องยิง) → ไม่ถูกดัก ยอด = 7500');
  await pg.evaluate(()=>{ document.getElementById('qs-amount').value='12000000'; submitQuickScan(); }); await sleep(500);
  ok((await L(pg))==='-'&&/ผิดปกติ/.test(await pg.evaluate(()=>document.getElementById('qs-msg').textContent)),'10 คีย์ด่วน: ยอด 12 ล้าน → ไม่บันทึก ขึ้นให้ตรวจ');
  await pg.evaluate(()=>{ document.getElementById('qs-amount').value='7000'; submitQuickScan(); }); await sleep(800);
  ok((await L(pg))==='ถ 445/264=7000','11 แก้ยอดเป็น 7,000 แล้วบันทึกได้ตามปกติ · '+await L(pg));
  ok(!pg.errs.length,'12 ไม่มี error '+pg.errs.join('|'));
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
