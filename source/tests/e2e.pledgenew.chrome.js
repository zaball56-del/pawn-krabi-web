// ตั๋วใหม่ที่ติดแทนตั๋วเดิม (ส/ผ คีย์ด่วน) นับเป็น "รับจำนำ" ทันที · ไม่นับซ้ำเมื่อกรอกเอง/นำเข้า สธ.2 · วันก่อน 23 พ.ย. 69 ไม่เปลี่ยน
// รัน: node tests/e2e.pledgenew.chrome.js   (FILE=<index.html> เทียบเวอร์ชันอื่น)
const path=require('path'); const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const FILE=process.env.FILE||path.join(__dirname,'../../index.html'); let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const pg=await (await b.newContext({viewport:{width:1366,height:900}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
  await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger');
    window.uiConfirm=async()=>true; localStorage.setItem('pawn_qs_auto','0'); });
  const K='2026-11-23', K2='2026-11-24', M='กรกฎาคม';
  await pg.evaluate(([K,K2,M])=>{ Object.keys(db).forEach(k=>delete db[k]);
    const mk=k=>{ currentDate=k; const d=getCurrentDayData(); d.months=[M,'','','','','']; d.bf=[100000,0,0,0,0,0]; d.bfCount=[3,0,0,0,0,0]; d.data[M]=[{type:'',ticket:'1861',book:'174',amount:'36000',count:''},{type:'',ticket:'1862',book:'174',amount:'1000',count:''}]; return d; };
    mk(K); syncDailyOpeningFromMonthlyBF(K); currentDate=K; updateSummaryColumn(); saveDB(); mk(K2); syncBroughtForwardForDate(K2,true); currentDate=K2; updateSummaryColumn(); saveDB(); recalculateFutureBroughtForwardBalances(K);
    document.getElementById('doc-date').value=K; changeDate(); },[K,K2,M]);
  const S=(k)=>pg.evaluate(k=>{ const s=db[k].data['สรุปประจำวัน']; return {ym:+s[0].amount||0, pc:+s[1].count||0, pa:+s[1].amount||0, rc:+s[2].count||0, ra:+s[2].amount||0, bal:+s[3].amount||0}; },k);
  const qk=(type,t,book,amt,nt,nb,na)=>pg.evaluate(async([type,t,book,amt,nt,nb,na])=>{ openQuickScanModal(); await new Promise(r=>setTimeout(r,250)); const q=id=>document.getElementById(id);
    q('qs-type').value=type; qsPaintType(); q('qs-month').value='7'; q('qs-ticket').value=t; q('qs-book').value=book; q('qs-amount').value=amt; q('qs-new-ticket').value=nt; q('qs-new-book').value=nb; q('qs-new-amount').value=na;
    submitQuickScan(); await new Promise(r=>setTimeout(r,400)); closeQuickScanModal(); },[type,t,book,amt,nt,nb,na]);
  let s0=await S(K);
  await qk('ส','1861','174','36000','1895','278','36000');
  let s=await S(K); ok(s.pc===1&&s.pa===36000,'1 ส ติดตั๋วใหม่ 1895 (36,000) → รับจำนำ 1 ราย 36,000');
  ok(s.bal===s.ym+s.pa-s.ra,'2 คงเหลือ = ย/ม + รับจำนำ − ไถ่ถอน ('+s.ym+' + '+s.pa+' − '+s.ra+' = '+s.bal+')');
  let n2=await S(K2); ok(n2.ym===s.bal,'3 ย/ม วันถัดไปตามคงเหลือใหม่ ('+n2.ym+')');
  await qk('ผ','1862','174','1000','1894','278','29800');
  s=await S(K); ok(s.pc===2&&s.pa===65800,'4 เพิ่ม ผ ตั๋วใหม่ 29,800 → รับจำนำ 2 ราย 65,800 ('+s.pc+' / '+s.pa+')');
  let dom=await pg.evaluate(()=>document.querySelector('.summary-amount-1')&&document.querySelector('.summary-amount-1').value); ok(dom==='65,800','5 ช่องรับจำนำบนตารางแสดง 65,800 ('+dom+')');
  // พ ก็นับ · ถ ไม่มีตั๋วใหม่
  await pg.evaluate(M=>{ db[currentDate].data[M].push({type:'',ticket:'1863',book:'174',amount:'2000',count:''}); saveDB(); renderTable(); },M);
  await qk('พ','1863','174','2000','1896','278','5000');
  s=await S(K); ok(s.pc===3&&s.pa===70800,'4b พ ติดตั๋วใหม่ 5,000 → รับจำนำ 3 ราย 70,800 ('+s.pc+' / '+s.pa+')');
  await pg.evaluate(async(M)=>{ const rows=db[currentDate].data[M]; const i=rows.findIndex(x=>x&&x.newTicket==='1896'); const btn=document.createElement('button'); btn.dataset.m=M; btn.dataset.i=String(i); qsUnlink(btn); await new Promise(r=>setTimeout(r,300)); },M);
  // ยกเลิกการติด
  await pg.evaluate(async(M)=>{ const rows=db[currentDate].data[M]; const i=rows.findIndex(x=>x&&x.newTicket==='1894'); const btn=document.createElement('button'); btn.dataset.m=M; btn.dataset.i=String(i); qsUnlink(btn); await new Promise(r=>setTimeout(r,300)); },M);
  s=await S(K); ok(s.pc===1&&s.pa===36000,'6 ยกเลิกการติดตั๋วใหม่ 1894 → รับจำนำกลับเป็น 36,000 ('+s.pa+')');
  // กรอกรับจำนำเอง (ถือว่ารวมตั๋วใหม่แล้ว) → ไม่บวกซ้ำ · ติดเพิ่มอีกใบ → บวกเพิ่ม
  await pg.evaluate(()=>{ const c=document.querySelector('.summary-count-1'), a=document.querySelector('.summary-amount-1'); c.focus(); c.value='5'; c.dispatchEvent(new Event('input',{bubbles:true})); c.blur(); a.focus(); a.value='100000'; a.dispatchEvent(new Event('input',{bubbles:true})); a.blur(); });
  await sleep(600); s=await S(K); ok(s.pc===5&&s.pa===100000,'7 กรอกรับจำนำเอง 5 ราย 100,000 → คงตามที่กรอก ไม่บวกตั๋วใหม่ซ้ำ ('+s.pc+' / '+s.pa+')');
  await qk('ผ','1862','174','1000','1894','278','29800');
  s=await S(K); ok(s.pc===6&&s.pa===129800,'8 ติดตั๋วใหม่เพิ่มหลังกรอกเอง → บวกเพิ่มเฉพาะใบใหม่ (6 / 129,800) ('+s.pc+' / '+s.pa+')');
  // นำเข้า สธ.2 ตั้งยอดรวม → ใช้ยอด สธ.2
  await pg.evaluate(()=>{ const d=db[currentDate], r=d.data['สรุปประจำวัน']; r[1].count=9; r[1].amount=250000; d.pledgeSor2={count:9,amount:250000,at:1}; delete d.pledgeManual; delete d.pledgeLast; updateSummaryColumn(); });   // เหมือน sor2.html ตอนนำเข้า
  s=await S(K); ok(s.pc===9&&s.pa===250000,'9 นำเข้า สธ.2 ตั้งรับจำนำ 9 ราย 250,000 → ใช้ยอด สธ.2 ไม่บวกตั๋วใหม่ซ้ำ ('+s.pa+')');
  await pg.evaluate(M=>{ db[currentDate].data[M].push({type:'',ticket:'1864',book:'174',amount:'3000',count:''}); saveDB(); renderTable(); },M);
  await qk('ส','1864','174','3000','1897','278','3000');
  s=await S(K); ok(s.pc===9&&s.pa===250000,'9b หลังนำเข้า สธ.2 แล้วติดตั๋วใหม่เพิ่ม → ยังยึดยอด สธ.2 (250,000) ('+s.pa+')');
  // วันก่อน 23 พ.ย. 69 ที่มีตั๋วใหม่อยู่แล้ว → ยอดรับจำนำเดิมไม่เปลี่ยน
  let r=await pg.evaluate(([M])=>{ const k='2026-11-20'; currentDate=k; const d=getCurrentDayData(); d.months=[M,'','','','',''];
    d.data[M]=[{type:'ส',ticket:'1',book:'1',amount:'500',count:'',newTicket:'9',newBook:'2',newAmount:'500'}]; const r=d.data['สรุปประจำวัน']; while(r.length<4) r.push({type:'',ticket:'',amount:'',count:''}); r[1].count=3; r[1].amount=7000; saveDB();
    document.getElementById('doc-date').value=k; changeDate(); updateSummaryColumn(); return {c:+r[1].count, a:+r[1].amount}; },[M]);
  ok(r.c===3&&r.a===7000,'10 วันที่ 20 พ.ย. (ก่อนเริ่มใช้) มีตั๋วใหม่อยู่แล้ว → รับจำนำ 7,000 เท่าเดิม');
  // นำเข้า สธ.2 จริง: ยอดตั๋วใหม่ที่คีย์ผิด (เลขตั๋ว/เล่มตรง) → ปรับตาม สธ.2 ให้เอง · รับจำนำ = ยอด สธ.2
  r=await pg.evaluate(async([M])=>{ const k='2026-11-25'; currentDate=k; const d=getCurrentDayData(); d.months=[M,'','','','',''];
    d.data[M]=[{type:'ส',ticket:'1861',book:'174',amount:'36000',count:'',newTicket:'1895',newBook:'278',newAmount:'35000'}]; saveDB(); document.getElementById('doc-date').value=k; changeDate();
    const P={rows:[{type:'ส',oldT:'1861',oldM:7,ticket:'1895',book:'278',weight:'',amount:36000}]};
    let cmsg=''; window.confirm=(m)=>{ cmsg+=m; return true; }; openSor2Modal(); window.__sor2.test(P,k); sor2Commit(); await new Promise(r=>setTimeout(r,400)); try{ closeSor2Modal(); }catch(e){}
    const row=db[k].data[M][0], sr=db[k].data['สรุปประจำวัน']; return {na:String(row.newAmount), pc:+sr[1].count, pa:+sr[1].amount, cmsg}; },[M]);
  ok(r.na==='36000','12 คีย์ยอดตั๋วใหม่ 35,000 แต่ สธ.2 = 36,000 → นำเข้าแล้วแถวถูกปรับเป็น 36,000 ('+r.na+')');
  ok(r.pc===1&&r.pa===36000,'13 รับจำนำหลังนำเข้า = ยอด สธ.2 1 ราย 36,000 ('+r.pc+' / '+r.pa+')');
  ok(/ปรับยอดตั๋วใหม่ตาม สธ\.2 1 ใบ/.test(r.cmsg),'14 หน้าต่างยืนยันบอกจำนวนใบที่ปรับยอดตาม สธ.2');
  // ส: ยอดตั๋วใหม่คัดลอกจากยอดตั๋วเดิมให้เอง
  r=await pg.evaluate(async()=>{ const q=id=>document.getElementById(id), w=ms=>new Promise(r=>setTimeout(r,ms)); openQuickScanModal(); await w(250);
    q('qs-type').value='ส'; qsPaintType(); q('qs-amount').value='36,000'; await w(350); const a=q('qs-new-amount').value, h=(q('qs-new-amt-hint')||{}).textContent||'';
    q('qs-amount').value='40,000'; await w(350); const b=q('qs-new-amount').value;
    q('qs-type').value='ผ'; qsPaintType(); await w(350); const c=q('qs-new-amount').value;
    q('qs-type').value='ส'; qsPaintType(); await w(350); q('qs-new-amount').value='12,345'; q('qs-new-amount').dispatchEvent(new Event('input',{bubbles:true})); q('qs-amount').value='50,000'; await w(350); const d=q('qs-new-amount').value;
    q('qs-type').value='ถ'; qsPaintType(); await w(300); const e=q('qs-new-amount').value;
    closeQuickScanModal(); return {a,h,b,c,d,e}; });
  ok(r.a==='36,000'&&/คัดลอก/.test(r.h),'15 กด ส → ยอดตั๋วใหม่ = ยอดตั๋วเดิม 36,000 ให้เอง ('+r.a+')');
  ok(r.b==='40,000','16 ยอดตั๋วเดิมเปลี่ยน → ยอดตั๋วใหม่ตาม ('+r.b+')');
  ok(r.c==='','17 เปลี่ยนเป็น ผ → ล้างยอดที่คัดลอกไว้ ('+r.c+')');
  ok(r.d==='12,345','18 พิมพ์ยอดตั๋วใหม่เอง → ไม่ถูกทับ ('+r.d+')');
  ok(r.e==='12,345'||r.e==='','19 เปลี่ยนเป็น ถ → ค่าที่พิมพ์เองไม่ถูกคัดลอกทับ ('+r.e+')');
  // รายการวันนี้: "ไม่มีตั๋วใหม่" ไม่ขึ้นสำหรับ ถ และซ่อนในโหมดสแกนตั๋วเดิมอย่างเดียว
  r=await pg.evaluate(async([M])=>{ const k='2026-11-26'; currentDate=k; const d=getCurrentDayData(); d.months=[M,'','','','',''];
    d.data[M]=[{type:'ถ',ticket:'11',book:'1',amount:'100',count:'',attachedAt:'2'},{type:'ส',ticket:'12',book:'1',amount:'200',count:'',attachedAt:'1'}]; saveDB(); document.getElementById('doc-date').value=k; changeDate();
    const w=ms=>new Promise(r=>setTimeout(r,ms)); const vis=()=>[...document.querySelectorAll('#qs-recent .qs-nonew')].filter(e=>e.offsetParent!==null).length;
    document.querySelector('#qs-mode [data-m="full"]').click(); openQuickScanModal(); await w(300); qsRenderRecent(); const all=document.querySelectorAll('#qs-recent .qs-nonew').length, full=vis();
    document.querySelector('#qs-mode [data-m="single"]').click(); await w(200); const single=vis(); closeQuickScanModal(); document.querySelector('#qs-mode [data-m="full"]').click(); return {all,full,single}; },[M]);
  ok(r.all===1&&r.full===1&&r.single===0,'20 "ไม่มีตั๋วใหม่": ถ ไม่ขึ้น · ส ขึ้นในโหมดปกติ · โหมดสแกนตั๋วเดิมอย่างเดียวไม่ขึ้น '+JSON.stringify(r));
  // ไม่ถามก่อนบันทึกเมื่อตั๋วไม่อยู่ใน สธ.3 ที่นำเข้าวันนี้
  r=await pg.evaluate(async([M])=>{ const k='2026-11-27'; currentDate=k; const d=getCurrentDayData(); d.months=['ตุลาคม','','','','',''];
    d.data['ตุลาคม']=[{type:'',ticket:'500',book:'200',amount:'1000',count:'',importSource:'PDF'}]; saveDB(); document.getElementById('doc-date').value=k; changeDate();
    let asked=''; const oc=window.uiConfirm; window.uiConfirm=async(m)=>{ asked+=m; return true; };
    document.querySelector('#qs-mode [data-m="full"]').click(); openQuickScanModal(); await new Promise(r=>setTimeout(r,250)); const q=id=>document.getElementById(id);
    q('qs-type').value='ผ'; qsPaintType(); q('qs-month').value='10'; q('qs-ticket').value='1931'; q('qs-book').value='251'; q('qs-amount').value='34000'; ['qs-new-ticket','qs-new-book','qs-new-amount'].forEach(i=>q(i).value='');
    submitQuickScan(); await new Promise(r=>setTimeout(r,400)); closeQuickScanModal(); window.uiConfirm=oc;
    return {asked, saved:db[k].data['ตุลาคม'].some(x=>x&&x.ticket==='1931'&&x.type==='ผ')}; },[M]);
  ok(!/สธ\.3/.test(r.asked)&&r.saved,'21 ตั๋วไม่อยู่ใน สธ.3 ที่นำเข้าวันนี้ → ไม่ถาม บันทึกเลย ('+(r.asked||'ไม่มีหน้าต่าง').slice(0,60)+')');
  // นำเข้า สธ.2 ก่อนมีระบบนี้ (day.sor2 ไม่มี pledgeSor2) → ยึด สธ.2 · ถ้าเคยถูกบวกซ้ำไปแล้ว → คืนยอด สธ.2
  r=await pg.evaluate(async([M])=>{ const mk=(k,extra)=>{ currentDate=k; const d=getCurrentDayData(); d.months=[M,'','','','',''];
      d.data[M]=[{type:'ส',ticket:'1',book:'1',amount:'36000',count:'',newTicket:'1895',newBook:'278',newAmount:'36000'}]; Object.assign(d,extra); saveDB(); document.getElementById('doc-date').value=k; changeDate(); const r=d.data['สรุปประจำวัน'][1]; return r.count+'/'+r.amount; };
    const fresh=mk('2026-11-28',{sor2:{v:1,at:1}}); db['2026-11-28'].data['สรุปประจำวัน'][1].count=1; db['2026-11-28'].data['สรุปประจำวัน'][1].amount=36000;
    currentDate='2026-11-29'; const d=getCurrentDayData(); d.months=[M,'','','','','']; d.data[M]=[{type:'ส',ticket:'1',book:'1',amount:'36000',count:'',newTicket:'1895',newBook:'278',newAmount:'36000'}];
    const sr=d.data['สรุปประจำวัน']; sr[1].count=2; sr[1].amount=72000; d.sor2={v:1,at:1}; d.pledgeManual={count:1,amount:36000}; d.pledgeLast={count:2,amount:72000}; saveDB();
    document.getElementById('doc-date').value='2026-11-29'; changeDate(); const rep=sr[1].count+'/'+sr[1].amount;
    currentDate='2026-11-30'; const e=getCurrentDayData(); e.months=[M,'','','','','']; e.data[M]=[{type:'ส',ticket:'1',book:'1',amount:'36000',count:'',newTicket:'1895',newBook:'278',newAmount:'36000'}];
    e.data['สรุปประจำวัน'][1].count=1; e.data['สรุปประจำวัน'][1].amount=36000; e.sor2={v:1,at:1}; saveDB(); document.getElementById('doc-date').value='2026-11-30'; changeDate(); const keep=e.data['สรุปประจำวัน'][1].count+'/'+e.data['สรุปประจำวัน'][1].amount;
    return {rep,keep}; },[M]);
  ok(r.keep==='1/36000','22 นำเข้า สธ.2 ไว้ก่อนอัปเดต → เปิดวันแล้วยังเป็นยอด สธ.2 ไม่บวกตั๋วใหม่ซ้ำ ('+r.keep+')');
  ok(r.rep==='1/36000','23 วันที่ถูกบวกซ้ำไปแล้ว (72,000) → คืนเป็นยอด สธ.2 36,000 ('+r.rep+')');
  // ส คัดลอกยอด: ลบช่องยอดตั๋วใหม่จนว่างเพื่อพิมพ์ใหม่ → ไม่ถูกเติมกลับ
  r=await pg.evaluate(async()=>{ const q=id=>document.getElementById(id), w=ms=>new Promise(r=>setTimeout(r,ms)); openQuickScanModal(); await w(250);
    q('qs-type').value='ส'; qsPaintType(); q('qs-amount').value='36,000'; await w(300); const N=q('qs-new-amount');
    N.value=''; N.dispatchEvent(new Event('input',{bubbles:true})); await w(400); const cleared=N.value; N.value='35,500'; N.dispatchEvent(new Event('input',{bubbles:true})); await w(300); const typed=N.value;
    qsClearFields(true); await w(50); q('qs-type').value='ส'; qsPaintType(); q('qs-amount').value='20,000'; await w(300); const next=N.value; closeQuickScanModal(); return {cleared,typed,next}; });
  ok(r.cleared===''&&r.typed==='35,500','24 ลบยอดตั๋วใหม่ที่คัดลอกจนว่าง → ไม่ถูกเติมกลับ พิมพ์ใหม่ได้ ('+JSON.stringify(r)+')');
  ok(r.next==='20,000','25 ใบถัดไป (ล้างช่องแล้ว) → คัดลอกยอดได้ตามปกติ ('+r.next+')');
  ok(!errs.length,'11 ไม่มี error '+errs.join('|'));
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0); })();
