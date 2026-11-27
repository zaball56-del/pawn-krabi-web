// เครื่องยิงบาร์โค้ด: หลังอ่านตั๋วเดิม เคอร์เซอร์ต้องไปช่องที่ถูก ไม่ถูกดึงกลับ (แก้บั๊ค 27 พ.ย. 69)
// เดิม: ส/พ/ผ ยิงตั๋วเดิม + Enter → ไปช่องตั๋วใหม่ แล้วโดนดึงกลับไปช่องยอดเงิน → ยิงตั๋วใหม่ เลขไปต่อท้ายยอด 7,000 → 70,006,900,...
const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const path=require('path'); const FILE=process.env.FILE||path.join(__dirname,'../../index.html');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
function bc(book,t){ let s='69'+'0'+String(book).padStart(4,'0')+String(t).padStart(5,'0'); let c=0; for(let i=0;i<12;i++) c+=(+s[i])*(i%2?3:1); return s+((10-c%10)%10); }
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const run=async(o)=>{
    const pg=await (await b.newContext({viewport:{width:1300,height:900}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
    await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
    await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
    await pg.evaluate(o=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); Object.keys(db).forEach(k=>delete db[k]); const M=['มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน'];
      currentDate='2026-11-20'; let d=getCurrentDayData(); d.months=M.slice(); M.forEach(m=>d.data[m]=d.data[m]||[]);
      d.data['ตุลาคม'].push({type:'ส',ticket:'300',book:'240',amount:'7000',newTicket:'445',newBook:'264',newAmount:'7000',timestamp:'10:00:00'});
      currentDate='2026-11-27'; d=getCurrentDayData(); d.months=M.slice(); M.forEach(m=>d.data[m]=d.data[m]||[]); saveDB(); renderTable();
      localStorage.setItem('pawn_qs_auto',o.auto?'1':'0'); localStorage.setItem('pawn_qs_numpad','0'); openQuickScanModal(); },o);
    await sleep(1000); await pg.click('#qs-mode button[data-m="'+o.mode+'"]'); await pg.click('.qs-type-btn[data-type="'+o.type+'"]');
    await pg.evaluate(m=>{ document.getElementById('qs-month').value=m; document.getElementById('qs-ticket').focus(); },o.month);
    const scan=async c=>{ await pg.keyboard.type(c,{delay:8}); if(o.enter) await pg.keyboard.press('Enter'); };
    await scan(bc(264,445)); await sleep(600);
    const f1=await pg.evaluate(()=>document.activeElement.id);
    let f2='', v='';
    if(o.type!=='ถ'){ await scan(bc(270,600)); await sleep(400); f2=await pg.evaluate(()=>document.activeElement.id); }
    v=await pg.evaluate(()=>['qs-month','qs-ticket','qs-book','qs-amount','qs-new-ticket','qs-new-book','qs-new-amount'].map(i=>document.getElementById(i).value).join('|'));
    await sleep(2200);
    const saved=await pg.evaluate(()=>{ const o=[]; const d=db['2026-11-27']; d.months.forEach(m=>(d.data[m]||[]).forEach(x=>{ if(x&&x.ticket) o.push(m+' '+x.type+' '+x.ticket+'/'+x.book+'='+x.amount+(x.newTicket?'>'+x.newTicket+'/'+x.newBook+'='+x.newAmount:'')); })); return o.join(';'); });
    await pg.context().close(); return {f1,f2,v,saved,errs}; };
  const C=[
    ['1 ส · เดือนตั้งไว้ · ยิงมี Enter',{mode:'full',type:'ส',month:'11',enter:true,auto:true}],
    ['2 ส · เดือนว่าง · ยิงมี Enter',{mode:'full',type:'ส',month:'',enter:true,auto:true}],
    ['3 ส · เดือนตั้งไว้ · ยิงไม่มี Enter',{mode:'full',type:'ส',month:'11',enter:false,auto:true}],
    ['4 พ · เดือนว่าง · ยิงไม่มี Enter',{mode:'full',type:'พ',month:'',enter:false,auto:true}]];
  for(const [n,o] of C){ const r=await run(o);
    ok(r.f1==='qs-new-ticket','ยิงตั๋วเดิมแล้วไปรอช่องตั๋วใหม่ · '+n+' · focus='+r.f1);
    ok(/^11\|445\|264\|7,000\|600\|270\|/.test(r.v),'ยิงตั๋วใหม่ลงช่องตั๋วใหม่ ยอดเดิมไม่ถูกต่อท้าย · '+n+' · '+r.v);
    if(o.type==='ส') ok(/พฤศจิกายน ส 445\/264=7,?000>600\/270=/.test(r.saved),'บันทึกเองครบ ตั๋วเดิม 445 → ตั๋วใหม่ 600 · '+n+' · '+r.saved);
    else ok(r.saved==='','พ ยังไม่บันทึกเอง (รอกรอกยอดที่เพิ่ม) · '+n+' · '+(r.saved||'(ยังไม่บันทึก)'));
    ok(!r.errs.length,'ไม่มี error · '+n); }
  for(const [n,o] of [['5 ถ · เดือนตั้งไว้ · มี Enter',{mode:'single',type:'ถ',month:'11',enter:true,auto:true}],['6 ถ · เดือนว่าง · ไม่มี Enter',{mode:'single',type:'ถ',month:'',enter:false,auto:true}]]){ const r=await run(o);
    ok(/ถ 445\/264=7,?000/.test(r.saved)&&!/>/.test(r.saved),'ถ ยังบันทึกเองเหมือนเดิม · '+n+' · '+r.saved);
    ok(!r.errs.length,'ไม่มี error · '+n); }
  { const r=await run({mode:'full',type:'ส',month:'11',enter:true,auto:false});
    ok(r.f1==='qs-new-ticket'&&/^11\|445\|264\|7,000\|600\|270\|/.test(r.v),'7 ปิดบันทึกอัตโนมัติ · ยิง 2 ใบลงช่องถูก · '+r.f1+' '+r.v); }
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
