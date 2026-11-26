// ตั๋วใหม่ที่คีย์เอง (ส/พ/ผ) เป็นตั๋วเดือนของวันที่ออกตั๋ว ไม่ใช่เดือนของตั๋วเดิม (แก้บั๊ค 26 พ.ย. 69)
// เดิม: ตั๋วเดิม ต.ค. ออกตั๋วใหม่ 445/264 วันที่ 20 พ.ย. → สแกน 445 ระบบดึงยอดถูกแต่ลงตารางเดือน 10
const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const path=require('path'); const FILE=process.env.FILE||path.join(__dirname,'../../index.html');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
function bc(book,t){ let s='69'+'0'+String(book).padStart(4,'0')+String(t).padStart(5,'0'); let c=0; for(let i=0;i<12;i++) c+=(+s[i])*(i%2?3:1); return s+((10-c%10)%10); }
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=async()=>{ const pg=await (await b.newContext({viewport:{width:390,height:780},isMobile:true,hasTouch:true})).newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
    await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
    await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
    await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); if(ac){ac.classList.remove('hidden');ac.style.display='flex';} Object.keys(db).forEach(k=>delete db[k]);
      const M=['มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน'];
      currentDate='2026-11-20'; let d=getCurrentDayData(); d.months=M.slice(); M.forEach(m=>d.data[m]=d.data[m]||[]);
      d.data['ตุลาคม'].push({type:'ส',ticket:'300',book:'240',amount:'5000',newTicket:'445',newBook:'264',newAmount:'7000',timestamp:'10:00:00'});
      currentDate='2026-11-26'; d=getCurrentDayData(); d.months=M.slice(); M.forEach(m=>d.data[m]=d.data[m]||[]); saveDB(); renderTable();
      localStorage.setItem('pawn_qs_auto','1'); localStorage.setItem('pawn_qs_numpad','0'); if(window.qsNumpadEnable) qsNumpadEnable(false); localStorage.setItem('pawn_tkw_auto','1'); });
    return pg; };
  const where=(pg,t)=>pg.evaluate(t=>{ const d=db['2026-11-26'], o=[]; d.months.forEach(m=>(d.data[m]||[]).forEach(x=>{ if(x&&String(x.ticket)===t) o.push(m+':'+x.amount); })); return o.join(',')||'-'; },t);
  // 1 ตัวค้นกลาง
  let pg=await page();
  const f=await pg.evaluate(()=>{ window.__dv++; const a=ticketFind('445','264',0,{}), b=ticketFind('445','264',10,{}), c=ticketFind('445','264',10,{soft:true}); return [a.status,a.month,b.status,c.status,c.month,!!c.monthFallback].join('|'); });
  ok(/^ok\|พฤศจิกายน\|(none|bookmismatch)\|ok\|พฤศจิกายน\|true$/.test(f),'1 ตั๋วใหม่ที่ออก 20 พ.ย. = ตั๋วเดือน 11 (ค้นเดือน 10 ไม่เจอ · เดือนที่จำไว้ 10 → เปลี่ยนเป็น 11) '+f);
  // 2 รักษาของ: ช่องเดือนว่าง สแกนบาร์โค้ด 445/264 → เดือน 11 และลงตาราง 11
  await pg.evaluate(()=>openQuickScanModal()); await sleep(1200);
  await pg.tap('#qs-mode button[data-m="single"]'); await pg.tap('.qs-type-btn[data-type="ถ"]');
  await pg.evaluate(v=>{ const m=document.getElementById('qs-month'); m.value=''; const el=document.getElementById('qs-ticket'); el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); },bc(264,445));
  await sleep(700); const mon=await pg.evaluate(()=>document.getElementById('qs-month').value); await sleep(2500);
  ok(mon==='11'&&/^พฤศจิกายน:7,?000$/.test(await where(pg,'445')),'2 รักษาของ: สแกนตั๋วใหม่ 445 → เดือน 11 ลงตาราง พ.ย. (เดิมลง ต.ค.) '+mon+' '+await where(pg,'445'));
  ok(!pg.errs.length,'3 ไม่มี error '+JSON.stringify(pg.errs)); await pg.context().close();
  // 4 เขียนตั๋ว: เดือนที่จำไว้ 10 → สแกน 445 → เปลี่ยนเป็น 11 ลงคอลัมน์ 11
  pg=await page();
  await pg.evaluate(async()=>{ tkwOpen(); await new Promise(s=>setTimeout(s,300)); document.getElementById('tkw-scan-btn').click(); await new Promise(s=>setTimeout(s,200)); const a=document.getElementById('tkw-sq-auto'); if(!a.checked){a.checked=true;a.dispatchEvent(new Event('change',{bubbles:true}));} document.getElementById('tkw-sq-m').value='10'; });
  await pg.evaluate(v=>{ const el=document.getElementById('tkw-sq-t'); el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); },bc(264,445));
  await sleep(2500);
  const tw=await pg.evaluate(()=>{ const d=tkwReadDay('2026-11-26'); if(!d) return '-'; const o=[]; d.m.forEach((m,g)=>(d.r[g]||[]).forEach(x=>{ if(x&&x[0]==='445') o.push(m+':'+x[1]); })); return o.join(',')||'-'; });
  ok(tw==='11:7000','4 เขียนตั๋ว: สแกนตั๋วใหม่ 445 → ลงคอลัมน์เดือน 11 (เดิม 10) '+tw);
  ok(!pg.errs.length,'5 ไม่มี error '+JSON.stringify(pg.errs)); await pg.context().close();
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
