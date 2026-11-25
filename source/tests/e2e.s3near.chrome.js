// นำเข้า สธ.3: ตั๋วที่คีย์ไว้แล้วแต่ "เล่มผิด" หรือ "เลขตั๋วผิด 1 หลัก/สลับหลัก" → แก้แถวเดิม ไม่เพิ่มแถวใหม่ (แก้บั๊ค 25 พ.ย. 69: นำเข้าแล้วเกินมา 1 ราย)
const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const path=require('path'); const FILE=process.env.FILE||path.join(__dirname,'../../index.html');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
const PDF=[{ticket:'1850',book:'146',month:6,amount:17000},{ticket:'2402',book:'180',month:7,amount:13000},{ticket:'301',book:'200',month:7,amount:5000},{ticket:'777',book:'210',month:7,amount:9000},{ticket:'1851',book:'146',month:6,amount:2000}];
async function run(b,keyed,opt){ opt=opt||{};
  const pg=await (await b.newContext({viewport:{width:1300,height:900}})).newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
  await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
  const r=await pg.evaluate(async({PDF,keyed,opt})=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const K='2026-11-23';
    document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); Object.keys(db).forEach(k=>delete db[k]); currentDate='2026-11-25'; getCurrentDayData();
    const d=getCurrentDayDataForDate(K); d.months=['มิถุนายน','กรกฎาคม','','','','']; d.data['มิถุนายน']=[]; d.data['กรกฎาคม']=[];
    keyed.forEach(x=>d.data[x.mn].push({type:x.type||'ถ',ticket:x.t,book:x.b,amount:String(x.a),newTicket:x.nt||'',newBook:x.nt?'278':'',newAmount:x.nt?String(x.a):'',attachedAt:'x'})); saveDB();
    document.getElementById('pdf-import-date').value=K; document.getElementById('pdf-dest-ledger').checked=true; document.getElementById('pdf-dest-tkw').checked=false;
    pdfImportParsedRecords=PDF.map(x=>({...x,loanDate:'1/1/2569'})); pdfImportDetectedDate=K; pdfImportReportTotal=null; preparePDFImport();
    const near=pdfImportReadyRecords.filter(x=>x.nearFix).map(x=>x.ticket+'<'+x.near.ticket+'/'+x.near.book);
    if(opt.untick) pdfImportReadyRecords.filter(x=>x.nearFix).forEach(x=>setPDFImportSelected(x.index,false));
    commitPDFImport(); await sleep(400);
    const L=['มิถุนายน','กรกฎาคม'].map(m=>d.data[m].filter(x=>x&&x.ticket).map(x=>x.ticket+'/'+(x.book||x.importBook)+'='+x.amount+(x.type?x.type:'')+(x.newTicket?'>'+x.newTicket:'')).sort().join(',')).join(' | ');
    let n=0; d.months.forEach(m=>(d.data[m]||[]).forEach(x=>{ if(x&&x.ticket) n++; }));
    let au=''; try{ au=(JSON.parse(localStorage.getItem('pawn_krabi_audit_v1'))||[]).filter(x=>/เล่ม\/เลขตั๋ว/.test(x.a)).map(x=>x.d).join(';'); }catch(e){}
    return {near,L,n,au}; },{PDF,keyed,opt});
  r.errs=pg.errs; await pg.context().close(); return r; }
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const base=[{mn:'กรกฎาคม',t:'2402',b:'180',a:13000},{mn:'กรกฎาคม',t:'301',b:'200',a:5000},{mn:'กรกฎาคม',t:'777',b:'210',a:9000},{mn:'มิถุนายน',t:'1851',b:'146',a:2000}];
  let r=await run(b,[{mn:'มิถุนายน',t:'1850',b:'147',a:17000,type:'ส',nt:'1904'}].concat(base));
  ok(r.n===5&&/1850\/146=17000ส>1904/.test(r.L)&&!/1850\/147/.test(r.L),'1 คีย์เล่มผิด (147) → แก้แถวเดิมเป็น 146 ไม่เพิ่มแถว เก็บประเภท/ตั๋วใหม่ '+r.n+' '+r.L);
  ok(/1850\/147 → 1850\/146/.test(r.au),'1b บันทึกประวัติการแก้ '+r.au);
  r=await run(b,[{mn:'มิถุนายน',t:'1805',b:'146',a:17000}].concat(base));
  ok(r.n===5&&/1850\/146=17000/.test(r.L)&&!/1805/.test(r.L),'2 คีย์เลขตั๋วสลับหลัก (1805) → แก้เป็น 1850 '+r.L);
  r=await run(b,[{mn:'กรกฎาคม',t:'1850',b:'999',a:16000,type:'ผ',nt:'1905'}].concat(base));
  ok(r.n===5&&/^1850\/146=17000ผ>1905/.test(r.L)&&!/1850\/999/.test(r.L),'3 คีย์ผิดเดือน+เล่มผิด+ยอดผิด → ย้ายไปเดือนที่ถูก แก้เล่ม/ยอด '+r.L);
  r=await run(b,[{mn:'มิถุนายน',t:'1850',b:'147',a:17000}].concat(base),{untick:true});
  ok(r.n===6&&/1850\/146=17000/.test(r.L)&&/1850\/147=17000/.test(r.L),'4 เอาติ๊กออก → ลงเป็นใบใหม่เหมือนเดิม (แถวที่คีย์ไว้ยังอยู่) '+r.n);
  r=await run(b,[{mn:'มิถุนายน',t:'1850',b:'147',a:17000},{mn:'กรกฎาคม',t:'1850',b:'148',a:17000}].concat(base));
  ok(!r.near.length&&r.n===7,'5 มีแถวที่น่าจะใช่ 2 แถว → ไม่เดา ลงเป็นใบใหม่ '+JSON.stringify(r.near)+' '+r.n);
  r=await run(b,[{mn:'มิถุนายน',t:'1805',b:'146',a:17500}].concat(base));
  ok(!r.near.length,'6 เลขตั๋วใกล้กันแต่ยอดไม่ตรง → ไม่ถือเป็นใบเดียวกัน '+JSON.stringify(r.near));
  r=await run(b,base.concat([{mn:'มิถุนายน',t:'1850',b:'146',a:17000}]));
  ok(!r.near.length&&r.n===5,'7 คีย์ถูกครบ → ไม่มีอะไรเปลี่ยน (1851 ที่ใกล้กับ 1850 ไม่ถูกแตะ เพราะตรงกับใบใน สธ.3 อยู่แล้ว) '+r.n);
  r=await run(b,[{mn:'กรกฎาคม',t:'1850',b:'146',a:17000}].concat(base));
  ok(!r.near.length&&r.n===5&&/^1850\/146=17000/.test(r.L),'8 คีย์ผิดเดือนอย่างเดียว (เล่มถูก) → ใช้ตัวย้ายเดือนเดิม ไม่ซ้ำ '+r.L);
  ok(!r.errs.length,'9 ไม่มี error '+JSON.stringify(r.errs));
  /* ตารางเขียนตั๋ว: คีย์เล่มผิด/เลขตั๋วสลับหลัก → แก้แถวเดิม ไม่เพิ่มแถว */
  { const pg=await (await b.newContext({viewport:{width:1300,height:900}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
    await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
    const t=await pg.evaluate(async(PDF)=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const K='2026-11-23';
      document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); Object.keys(db).forEach(k=>delete db[k]); currentDate='2026-11-25'; getCurrentDayData(); saveDB();
      tkwImportAll({[K]:{m:[6,7],r:[[['1850','17000','147',''],['1851','2000','146','']],[['2402','13000','180',''],['310','5000','200',''],['777','9000','210','']]]}},'over');
      const cnt=()=>{ const d=tkwReadDay(K); return d.r.map((c,g)=>d.m[g]+':'+c.filter(x=>x&&x[0]).map(x=>x[0]+'/'+x[2]+'='+x[1]).join(',')).join(' | '); };
      document.getElementById('pdf-import-date').value=K; document.getElementById('pdf-dest-ledger').checked=false; document.getElementById('pdf-dest-tkw').checked=true;
      pdfImportParsedRecords=PDF.map(x=>({...x,loanDate:'1/1/2569'})); pdfImportDetectedDate=K; pdfImportReadyRecords=PDF.map((x,i)=>({...x,index:i,selected:true,duplicate:false}));
      const before=cnt(); window.tkwImportS3(K,pdfImportReadyRecords,{near:true}); await sleep(200); const after=cnt(); window.tkwImportS3(K,pdfImportReadyRecords,{near:true}); return {before,after,again:cnt()}; },PDF);
    const one=await pg.evaluate(()=>{ const K='2026-11-24'; tkwImportAll({[K]:{m:[11],r:[[['5001','1000','12','']]]}},'merge'); window.tkwImportS3(K,[{month:11,ticket:'6001',book:'12',amount:1000}]); const d=tkwReadDay(K); return d.r[0].filter(x=>x&&x[0]).map(x=>x[0]).join(); });
    ok(one==='5001,6001','10b เพิ่มทีละใบ (ปุ่มหน้าเทียบ) ไม่แก้แถวอื่นเอง '+one);
    ok(t.after==='6:1850/146=17000,1851/146=2000 | 7:2402/180=13000,301/200=5000,777/210=9000'&&t.again===t.after,'10 เขียนตั๋ว: เล่มผิด (147) และเลขตั๋วสลับหลัก (310) → แก้แถวเดิม ไม่เพิ่มแถว · นำเข้าซ้ำไม่เปลี่ยน '+t.after);
    ok(!errs.length,'11 ไม่มี error (เขียนตั๋ว) '+JSON.stringify(errs)); await pg.context().close(); }
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
