// ทดสอบทะเบียนกลาง: เลข+เดือนเดียวกันคนละปี (หน้าต่าง 365 วันคร่อม 2 ปี) ต้องเลือกปีล่าสุด ไม่ขึ้นหลายเล่ม/ยอดขัดกัน
const path=require('path'); const {chromium}=require('playwright'); const FILE=process.env.FILE||path.join(__dirname,'../../index.html');
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); let fail=0; const ok=(c,m,x)=>{ if(!c){fail++;console.log('FAIL',m,x===undefined?'':JSON.stringify(x));} else console.log('ok  ',m); };
(async()=>{ const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const pg=await (await b.newContext()).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(2500);
 await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger'); });
 const r=await pg.evaluate(()=>{ Object.keys(db).forEach(k=>delete db[k]); const M='ธันวาคม';
  const mkd=(k,book,amt)=>{ db[k]={months:[M,'','','','',''],bf:[0,0,0,0,0,0],bfCount:[0,0,0,0,0,0],data:{[M]:[{type:'ส',ticket:'100',book:book,importBook:book,importSource:'PDF',amount:amt,count:'',origIdx:0,timestamp:''}],'สรุปประจำวัน':[]},totalRows:60}; };
  mkd('2025-12-29','5',3000); mkd('2026-12-10','1',8000); currentDate='2026-12-28'; window.__dv=(window.__dv||0)+1;
  return {noBook:window.centralFind('100','',12),book1:window.centralFind('100','1',12),book5:window.centralFind('100','5',12)}; });
 ok(r.noBook&&r.noBook.status==='ok'&&r.noBook.amount==='8000'&&r.noBook.book==='1','1 ไม่ระบุเล่ม: เลือกใบปีล่าสุด (เล่ม 1 / 8,000) ไม่ขึ้นหลายเล่ม',r.noBook);
 ok(r.book1&&r.book1.status==='ok'&&r.book1.differs===false,'2 ระบุเล่ม 1: ยอดไม่ขัดกันกับตั๋วปีก่อน',r.book1);
 ok(r.book5&&r.book5.status==='ok'&&r.book5.amount==='3000','3 ระบุเล่ม 5: ยังหาตั๋วปีก่อนเจอเมื่อถามเล่มนั้น',r.book5);
 ok(!errs.length,'4 ไม่มี error',errs); await b.close(); process.exit(fail?1:0); })();
