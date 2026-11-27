// ข้อมูลดิบ (ฐานตั้งต้น) — ผู้ใช้สั่ง 27 พ.ย. 69: นำเข้า "รายงานทะเบียนทรัพย์สินประจำวัน/เดือน" ครั้งเดียว ใช้ค้นตั๋ว ไม่ลงตาราง ไม่เข้าสูตร
// PDF จำลอง tests/fixtures/raw-asset-report.pdf (ไม่มีข้อมูลจริง): 5 ใบ 210,500 · พิมพ์ 27/11/2569 · มิ.ย. 29–30
// รัน: node tests/e2e.rawbase.chrome.js
const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const path=require('path'); const FILE=process.env.FILE||path.join(__dirname,'../../index.html');
const PDF=path.join(__dirname,'fixtures/raw-asset-report.pdf');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
  const pg=await (await b.newContext({viewport:{width:1300,height:900}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,200))); pg.on('dialog',d=>d.accept());
  await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3500);
  const M=['มิถุนายน','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน'];
  await pg.evaluate(async(M)=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger');
    Object.keys(db).forEach(k=>delete db[k]); await window.rawReady; await window.__raw.set({snapAt:0,rows:[],files:[]});
    const mk=(k)=>{ currentDate=k; const d=getCurrentDayData(); d.months=M.slice(); M.forEach(m=>d.data[m]=d.data[m]||[]); return d; };
    let d=mk('2026-11-26'); d.bf=[244000,0,0,0,0]; d.bfCount=[6,0,0,0,0];   // ยกไป 26/11 = 6 − 1 (ถ 9102) = 5 ใบ / 210,500
    d.data['มิถุนายน']=[{type:'ถ',ticket:'9102',book:'153',amount:'33500'}];          // ก่อนวันที่พิมพ์ → ไม่ตัด (รายงานพิมพ์หลังจากนั้น)
    d=mk('2026-11-27'); d.data['มิถุนายน']=[{type:'ถ',ticket:'9101',book:'153',amount:'100000'}];   // หลังพิมพ์ → จบแล้ว
    d=mk('2026-11-28'); d.sor2={v:1,mn:'พฤศจิกายน',n:1,amt:25000,rows:[['ส','9103',6,'3001','290','',25000]]};   // สธ.2 ตั๋วเดิม 9103 มิ.ย. → จบแล้ว
    saveDB(); renderTable(); },M);
  const sum0=await pg.evaluate(()=>JSON.stringify(Object.keys(db).sort().map(k=>(db[k].data['สรุปประจำวัน']||[]).map(r=>r&&(r.count+'/'+r.amount)).join(','))));
  // 1–3 อ่านไฟล์ + หน้านำเข้า
  await pg.evaluate(()=>rawOpen()); await sleep(300); await pg.setInputFiles('#rb-file',PDF); await sleep(2500);
  const prev=await pg.evaluate(()=>document.getElementById('rb-prev').innerText.replace(/\s+/g,' '));
  ok(/อ่านได้ 5 ใบ \/ 210,500/.test(prev)&&/✓ ตรงกับยอดรวมทั้งสิ้นท้ายรายงาน/.test(prev)&&/27\/11\/2569/.test(prev),'1 อ่านได้ 5 ใบ 210,500 ตรงยอดรวมทั้งสิ้น · วันที่พิมพ์ 27/11/2569 · '+prev.slice(0,160));
  ok(/มิถุนายน 2569 5 210,500 ✓ ตรง/.test(prev),'2 เทียบยกไปช่อง มิ.ย. ในตาราง (26/11: 5 ใบ / 210,500) → ✓ ตรง · '+prev.slice(prev.indexOf('มิถุนายน'),prev.indexOf('มิถุนายน')+80));
  ok(await pg.evaluate(()=>!document.getElementById('rb-go').disabled),'3 ปุ่มนำเข้ากดได้');
  await pg.click('#rb-go'); await sleep(800);
  const st=await pg.evaluate(()=>rawStats());
  ok(st.total===5&&st.active===3&&st.ended===2,'4 นำเข้า 5 ใบ · ยังอยู่ 3 · จบแล้ว 2 (9101/153 ถ วันที่ 27 · 9103 ต่อตั๋วใน สธ.2) · '+JSON.stringify(st));
  const rows=await pg.evaluate(()=>window.__raw.data().rows.map(r=>r.t+'/'+r.b+'@'+r.d+'='+r.a+(r._end?'(จบ '+r._end.d+' '+r._end.src+')':'')).join(' ; '));
  ok(/9102\/153@2026-06-29=33500 ;/.test(rows+' ;')&&!/9102\/153[^;]*จบ/.test(rows),'5 ถ ก่อนวันที่พิมพ์รายงาน (26/11) ไม่ตัด 9102 · '+rows);
  // 6–10 ค้นตั๋ว
  let r=await pg.evaluate(()=>ticketFind('9104','155',0,{}));
  ok(r.status==='ok'&&+r.amount===2000&&r.raw&&r.month==='มิถุนายน'&&r.book==='155','6 ค้น 9104/155 → ข้อมูลดิบ 2,000 มิ.ย. · '+JSON.stringify(r));
  r=await pg.evaluate(()=>ticketFind('9102','153',0,{}));
  ok(r.status==='ok'&&r.src==='ตั๋ว'&&!r.raw,'6b ตั๋วที่มีแถวในตารางแล้ว → ใช้ตาราง ไม่ใช้ข้อมูลดิบ · '+r.src);
  r=await pg.evaluate(()=>ticketFind('9101','',6,{}));
  ok(r.status==='ok'&&r.src==='ตั๋ว'&&!r.raw,'7 9101 (153 จบแล้ว) → ไม่ใช้ข้อมูลดิบของใบที่จบ ใช้แถวในตาราง · '+JSON.stringify(r));
  r=await pg.evaluate(()=>ticketFind('9101','156',0,{}));
  ok(r.status==='ok'&&+r.amount===50000&&r.raw,'8 9101/156 (คนละเล่ม ยังอยู่) → 50,000 · '+JSON.stringify(r));
  r=await pg.evaluate(()=>ticketFind('9104','',11,{soft:true}));
  ok(r.status==='ok'&&r.raw&&r.monthFallback&&r.month==='มิถุนายน','9 เดือนที่จำไว้ 11 → เจอในข้อมูลดิบ มิ.ย. เปลี่ยนเดือนให้ · '+JSON.stringify(r));
  r=await pg.evaluate(()=>ticketFind('9104','',11,{}));
  ok(r.status==='none','10 พิมพ์เดือน 11 เอง → ไม่ดึงข้อมูลดิบ มิ.ย. · '+r.status);
  // 11 ยอดบัญชีไม่เปลี่ยน
  const sum1=await pg.evaluate(()=>JSON.stringify(Object.keys(db).sort().map(k=>(db[k].data['สรุปประจำวัน']||[]).map(r=>r&&(r.count+'/'+r.amount)).join(','))));
  ok(sum0===sum1,'11 สรุปประจำวันทุกวันไม่เปลี่ยนหลังนำเข้า');
  // 12 ทะเบียน
  await pg.evaluate(()=>{ rawClose(); centralOpen(); centralFilter('raw'); }); await sleep(300);
  const ct=await pg.evaluate(()=>({n:document.querySelectorAll('#ct-tb tr').length,tab:[...document.querySelectorAll('#ct-tabs button')].map(b=>b.textContent).find(t=>/ข้อมูลดิบ/.test(t))}));
  ok(ct.n===3&&/\(3\)/.test(ct.tab||''),'12 ทะเบียน: แท็บข้อมูลดิบ 3 ใบ (เฉพาะที่ยังอยู่) · '+JSON.stringify(ct));
  // 13 หน้าค้นหา
  await pg.evaluate(()=>{ centralClose(); openGlobalSearch(); document.getElementById('global-search-input').value='9101'; executeGlobalSearch(); }); await sleep(800);
  const gs=await pg.evaluate(()=>(document.getElementById('gs-raw')||{innerText:''}).innerText.replace(/\s+/g,' '));
  ok(/9101 \/ เล่ม 153/.test(gs)&&/จบแล้ว 27\/11\/2569/.test(gs)&&/9101 \/ เล่ม 156/.test(gs)&&/ยังอยู่ในคลัง/.test(gs),'13 หน้าค้นหา: การ์ดข้อมูลดิบ 2 ใบ (153 จบแล้ว · 156 ยังอยู่) · '+gs.slice(0,200));
  await pg.evaluate(()=>closeGlobalSearch());
  // 13b–c หน้าสแกน 2 ตาราง: พิมพ์ 9104 → ดึงยอด/เล่ม/เดือนจากข้อมูลดิบ พร้อมป้ายบอกที่มา
  await pg.evaluate(()=>{ localStorage.setItem('pawn_qs_auto','0'); openQuickScanModal(); }); await sleep(800);
  await pg.click('#qs-mode button[data-m="single"]'); await pg.click('.qs-type-btn[data-type="ถ"]');
  await pg.evaluate(()=>{ document.getElementById('qs-month').value=''; }); await pg.click('#qs-ticket'); await pg.keyboard.type('9104',{delay:30}); await sleep(1300);
  const qs=await pg.evaluate(()=>['qs-month','qs-book','qs-amount'].map(i=>document.getElementById(i).value).join('|')+' · '+((document.querySelector('.qs-amt-hint')||{}).textContent||''));
  ok(/^6\|155\|2,000 · .*ข้อมูลดิบ/.test(qs),'13b คีย์ด่วนรักษาของ: 9104 → เดือน 6 เล่ม 155 ยอด 2,000 · ป้าย "ข้อมูลดิบ" · '+qs);
  await pg.evaluate(()=>closeQuickScanModal());
  await pg.evaluate(async()=>{ currentDate='2026-11-28'; tkwOpen(); await new Promise(s=>setTimeout(s,300)); document.getElementById('tkw-scan-btn').click(); await new Promise(s=>setTimeout(s,200)); const a=document.getElementById('tkw-sq-auto'); if(a.checked){a.checked=false;a.dispatchEvent(new Event('change',{bubbles:true}));} document.getElementById('tkw-sq-m').value=''; });
  await pg.click('#tkw-sq-t'); await pg.keyboard.type('9104',{delay:30}); await sleep(1300);
  const tk=await pg.evaluate(()=>document.getElementById('tkw-sq-m').value+'|'+document.getElementById('tkw-sq-a').value+' · '+document.getElementById('tkw-sq-hint').textContent);
  ok(/^6\|2,?000 · .*ข้อมูลดิบ/.test(tk),'13c สแกนเขียนตั๋ว: 9104 → เดือน 6 ยอด 2,000 · ป้าย "ข้อมูลดิบ" · '+tk);
  await pg.keyboard.press('Escape'); await pg.evaluate(()=>{ try{ document.querySelectorAll('#tkw-scan-x,#tkw-close').forEach(b=>b.click()); }catch(e){} });
  // 14 นำเข้าเดือนเดิมซ้ำ = แทนที่ ไม่ซ้อน
  await pg.evaluate(()=>rawOpen()); await sleep(200); await pg.setInputFiles('#rb-file',PDF); await sleep(2000); await pg.click('#rb-go'); await sleep(600);
  ok((await pg.evaluate(()=>rawStats().total))===5,'14 นำเข้าไฟล์เดิมซ้ำ → ยัง 5 ใบ (แทนที่ทั้งเดือน ไม่ซ้อน)');
  // 15 ล้างใบที่จบเกิน 60 วัน
  const pr=await pg.evaluate(async()=>{ const D=window.__raw.data(); D.rows.push({t:'9999',b:'1',a:1000,w:'',x:'',d:'2026-06-30',m:6,s:'2026-07-01'}); await window.__raw.set(D);
    db['2026-08-01']={months:['มิถุนายน'],data:{'มิถุนายน':[{type:'ถ',ticket:'9999',book:'1',amount:'1000'}]}}; window.__dv++; window.__raw.build(); await new Promise(r=>setTimeout(r,300));
    return window.__raw.data().rows.some(r=>r.t==='9999'); });
  ok(pr===false,'15 ใบที่จบเกิน 60 วัน ถูกล้างออกจากที่เก็บ');
  // 16 ล้างทั้งหมด
  await pg.evaluate(async()=>{ await rawClearAll(); }); await sleep(300);
  ok((await pg.evaluate(()=>rawStats().total))===0&&(await pg.evaluate(()=>ticketFind('9104','155',0,{}).status))==='none','16 ล้างข้อมูลดิบทั้งหมด → ค้นไม่เจออีก');
  ok(await pg.evaluate(()=>!!document.getElementById('rb-sb')&&!!document.getElementById('rb-mi')),'17 มีปุ่ม "นำเข้าข้อมูลดิบ" ในเมนูซ้ายและเมนู PDF');
  ok(!errs.length,'18 ไม่มี error '+errs.join(' | '));
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
