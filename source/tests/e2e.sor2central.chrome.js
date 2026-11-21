// สธ.2 เทียบตั๋วเดิมกับฐานข้อมูลกลาง (ทะเบียนทรัพย์รับจำนำ) — เดิม __assetFind ไม่มีอยู่จริง ทำให้ไม่เคยเตือนยอดตั๋วเดิมที่คีย์ผิด
// รัน: node tests/e2e.sor2central.chrome.js   (FILE=<index.html> เทียบเวอร์ชันอื่น)
const path=require('path'); const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const FILE=process.env.FILE||path.join(__dirname,'../../index.html');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
const SEED=([amt,book])=>{ Object.keys(db).forEach(k=>delete db[k]); const M=['สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน'];
  const mk=k=>{ currentDate=k; const d=getCurrentDayData(); d.months=M.concat(['','']); M.forEach(m=>d.data[m]=d.data[m]||[]); saveDB(); return d; };
  const a=mk('2026-08-10'); a.sor2={v:1,file:'t',at:1,mn:'สิงหาคม',n:1,amt:2000,newN:1,newAmt:2000,rows:[['','',0,'801','5','1',2000]]};   // ตั๋ว 801 จำนำใหม่ ส.ค. ยอด 2,000 เล่ม 5
  const b=mk('2026-11-19'); b.data['สิงหาคม'][0]={type:'',ticket:'801',book:book,amount:amt,count:'',origIdx:0,timestamp:''}; saveDB(); currentDate='2026-11-19'; renderTable(); };
const P={date:'2026-11-19',total:null,month:null,goldBuy:null,goldSell:null,rows:[{type:'ส',oldT:'801',oldM:8,ticket:'9001',book:'230',weight:'2',amount:2500}]};
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  async function run(amt,book){ const pg=await (await b.newContext()).newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
    await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
    await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger'); });
    await pg.evaluate(SEED,[amt,book]);
    const r=await pg.evaluate(P=>{ openSor2Modal(); window.__sor2.test(P,'2026-11-19'); const al=document.getElementById('s2-alert'); const o=window.__sor2.analyze(P,'2026-11-19').res[0]; if(al) al.classList.remove('on');
      return {kind:o.kind,msgs:o.msgs,base:o.base||null}; },P); r.errs=pg.errs; await pg.close(); return r; }
  let r=await run('2100','5'); ok(r.kind==='conflict'&&r.msgs.some(m=>/ยอดตั๋วเดิมในบัญชี 2,100/.test(m)&&/ฐานข้อมูลกลาง = 2,000/.test(m)),'1 ยอดตั๋วเดิมในบัญชีคีย์ผิด (2,100 แต่ สธ.2 เดิม 2,000) → เตือนขัดกับฐานข้อมูลกลาง '+JSON.stringify(r.msgs));
  ok(r.base&&r.base.amount===2000&&r.base.book==='5'&&r.base.year===2026,'2 แสดงข้อมูลอ้างอิงจากฐานข้อมูลกลาง (ปี/เล่ม/ยอด) '+JSON.stringify(r.base));
  r=await run('2000','5'); ok(r.kind==='fill'&&!r.msgs.length,'3 ยอดตรงฐานข้อมูลกลาง → ไม่เตือน เติมให้ตามปกติ ('+r.kind+')');
  r=await run('2100',''); ok(r.kind==='conflict','4 บัญชีไม่ได้ลงเล่ม แต่ฐานข้อมูลกลางมีเล่มเดียวชัดเจน → ยังเทียบยอดได้ ('+r.kind+')');
  r=await run('2100','9'); ok(r.kind==='fill','5 เล่มในบัญชีต่างจากฐานข้อมูลกลาง (คนละใบ) → ไม่เทียบยอดข้ามเล่ม ไม่เตือนมั่ว ('+r.kind+')');
  ok(!r.errs.length,'6 ไม่มี error '+r.errs.join('|'));
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0); })();
