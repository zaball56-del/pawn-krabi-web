// สธ.2: บรรทัดคร่อมหน้า (รายงานพิมพ์บรรทัดสุดท้ายของหน้าซ้ำที่หัวหน้าถัดไป) ต้องนับใบเดียว (แก้บั๊ค 27 พ.ย. 69)
// เดิม: สธ.2 26 พ.ย. อ่านได้ 95 ราย 3,505,400 แต่รายงานรวม 94 ราย 3,485,400 (ตั๋ว 2258/282 นับ 2 ครั้ง)
// ใช้ PDF จำลอง tests/fixtures/sor2-pagebreak-dup.pdf (ไม่มีข้อมูลลูกค้าจริง)
const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const fs=require('fs');
const path=require('path'); const FILE=process.env.FILE||path.join(__dirname,'../../index.html');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
  const pg=await (await b.newContext()).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,150)));
  await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3500);
  const b64=fs.readFileSync(path.join(__dirname,'fixtures/sor2-pagebreak-dup.pdf')).toString('base64');
  const P=await pg.evaluate(async(b64)=>{ const bin=atob(b64), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return await window.__sor2.parse(u.buffer); },b64);
  const sum=P.rows.reduce((s,r)=>s+r.amount,0), tk=P.rows.map(r=>r.ticket+'/'+r.book).join(',');
  ok(P.rows.length===3&&sum===127500,'1 บรรทัด 2258/282 คร่อมหน้า นับใบเดียว → 3 ราย 127,500 ('+P.rows.length+' ราย '+sum+' · '+tk+')');
  ok(P.total&&P.total.n===P.rows.length&&P.total.amt===sum,'2 ตรงกับยอดรวมท้ายรายงาน ('+JSON.stringify(P.total)+')');
  const r58=P.rows.find(r=>r.ticket==='2258'), r57=P.rows.find(r=>r.ticket==='2257'), r59=P.rows.find(r=>r.ticket==='2259');
  ok(r58&&r58.amount===20000&&r57&&r57.type==='ส'&&r57.oldT==='100'&&r59&&r59.type==='พ'&&r59.oldT==='300','3 แถวอื่นอ่านครบเหมือนเดิม (ประเภท/ตั๋วเดิม/ยอด)');
  ok(P.dupLines===1,'4 บอกจำนวนบรรทัดซ้ำที่ตัดออก ('+P.dupLines+')');
  ok(!errs.length,'5 ไม่มี error '+errs.join('|'));
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
