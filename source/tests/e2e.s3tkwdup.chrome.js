// นำเข้า สธ.3 ลงตารางเขียนตั๋ว: ตั๋วที่คีย์ไว้แล้วแต่เขียนต่างรูป ("0123", " 124 ") ต้องนับว่ามีอยู่แล้ว ไม่ลงซ้ำ · เล่มต่างกันจริงยังลงได้
const path=require('path'); const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const FILE=process.env.FILE||path.join(__dirname,'../../index.html'); let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{ const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']}); const pg=await (await b.newContext()).newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
  const r=await pg.evaluate(()=>{ const K='2026-11-20'; const c=[]; for(let i=0;i<10;i++) c.push(['','']); c[0]=['0123','500','5','']; c[1]=[' 124 ','600','','']; c[2]=['125','700','7','']; const o={}; o[K]={m:[11],r:[c]}; window.tkwImportAll(o,'over');
    const res=window.tkwImportS3(K,[{ticket:'123',month:11,book:'5',amount:500},{ticket:'124',month:11,book:'5',amount:600},{ticket:'125',month:11,book:'8',amount:700}]);
    const d=window.tkwReadDay(K); return {res,col:d.r[0].filter(x=>x[0]||x[1]).map(x=>String(x[0]).trim()+'/'+x[2]).join(' ')}; });
  ok(r.res.added===1&&r.res.skipped===2,'ตั๋ว 0123 และ " 124 " ไม่ลงซ้ำ · 125 คนละเล่ม (7 กับ 8) ลงเพิ่ม 1 ใบ '+JSON.stringify(r.res));
  ok(/124\/5/.test(r.col)&&!/ 123\/5|^123/.test(r.col.replace('0123/5','')),'เติมเล่มให้ตั๋วเดิมที่ยังไม่มีเล่ม '+r.col); ok(!pg.errs.length,'ไม่มี error '+pg.errs.join('|'));
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0); })();
