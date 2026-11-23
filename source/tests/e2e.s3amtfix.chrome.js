// นำเข้า สธ.3: ตั๋วที่คีย์ไว้แล้ว (เดือน+เลข+เล่มตรง) แต่ยอดเงินต่าง → แก้ยอดตาม สธ.3 · ตั๋วใหม่ยังนำเข้าตามปกติ · ยอดตรง = ข้าม
// ปัญหาเดิม 23 พ.ย.: นำเข้า สธ.3 แล้วยอดไม่ถูกแก้ เพราะตั๋วที่มีอยู่ถูกข้ามว่า "ซ้ำ"
const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const path=require('path'); const FILE=process.env.FILE||path.join(__dirname,'../../index.html');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
const PDF=[{ticket:'101',book:'10',month:10,amount:5000},{ticket:'102',book:'10',month:10,amount:7000},{ticket:'103',book:'10',month:11,amount:9000},{ticket:'104',book:'11',month:11,amount:4000},{ticket:'105',book:'11',month:11,amount:6500}];
async function run(mode,opt){ opt=opt||{}; const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']}); const pg=await (await b.newContext()).newPage();
 const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,150)));
 if(mode==='native') pg.on('dialog',d=>d.accept()); else pg.on('dialog',d=>d.dismiss());
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3500);
 const K='2026-11-23';
 await pg.evaluate(({K,PDF,opt})=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); Object.keys(db).forEach(k=>delete db[k]); currentDate=K;
   const d=getCurrentDayData(); d.months=['ตุลาคม','พฤศจิกายน','','','','']; d.data['ตุลาคม']=[]; d.data['พฤศจิกายน']=[];
   d.data['ตุลาคม'].push({type:'ถ',ticket:'101',book:'10',amount:'5000'});            // ตรง
   d.data['ตุลาคม'].push({type:'ส',ticket:'102',book:'10',amount:'7700',newTicket:'900',newBook:'50',newAmount:'7700'}); // ยอดผิด
   d.data['พฤศจิกายน'].push({type:'ถ',ticket:'103',book:'99',amount:'1000'});        // คนละเล่ม = คนละใบ → นำเข้าใหม่
   if(opt.twin){ d.data['พฤศจิกายน'].push({type:'ถ',ticket:'104',book:'',amount:'1'}); d.data['พฤศจิกายน'].push({type:'ถ',ticket:'104',book:'',amount:'2'}); } // ซ้ำ 2 แถว → ไม่แตะ
   else d.data['พฤศจิกายน'].push({type:'ผ',ticket:'104',book:'',amount:''});        // ยอดว่าง → แก้
   saveDB();
   if(opt.tkwSeed){ window.tkwImportS3(K,[{ticket:'101',book:'10',month:10,amount:5000},{ticket:'102',book:'10',month:10,amount:7700},{ticket:'103',book:'10',month:11,amount:0}].concat(opt.tkwTwin?[{ticket:'104',book:'',month:11,amount:1}]:[])); 
     if(opt.tkwTwin){ const t=JSON.parse(localStorage.getItem('pawn_tkw_v1')); const D=t[K]||t.days[K]; const g=D.m.indexOf(11); D.r[g].push(['104','2','','']); localStorage.setItem('pawn_tkw_v1',JSON.stringify(t)); try{ window.tkwRestoreAll&&0; }catch(e){} } }
   document.getElementById('pdf-import-date').value=K; document.getElementById('pdf-dest-ledger').checked=true; const T=document.getElementById('pdf-dest-tkw'); if(T) T.checked=!!opt.tkw;
   pdfImportParsedRecords=PDF.map(x=>({...x,loanDate:'01/'+x.month+'/2569'})); pdfImportDetectedDate=K; pdfImportReportTotal=null; },{K,PDF,opt});
 await pg.evaluate(()=>preparePDFImport());
 const prep=await pg.evaluate(()=>pdfImportReadyRecords.map(r=>r.ticket+':'+(r.amtFix?'fix':r.duplicate?'dup':'new')).join(','));
 if(opt.untick) await pg.evaluate(()=>{ const r=pdfImportReadyRecords.find(x=>x.ticket==='102'); setPDFImportSelected(r.index,false); });
 await pg.evaluate(()=>commitPDFImport()); await sleep(400);
 if(mode!=='native'){ for(let i=0;i<12;i++){ const b2=await pg.$('#ui-dialog button:has-text("ยืนยัน"), #ui-dialog button:has-text("ตกลง")'); if(b2){ await b2.click(); await sleep(400); continue; } if(await pg.evaluate(()=>/นำเข้าสำเร็จ/.test(document.getElementById('pdf-import-status').textContent))) break; await sleep(500); } }
 await sleep(1200);
 const r=await pg.evaluate(K=>{ const d=db[K]; const L=['ตุลาคม','พฤศจิกายน'].map(m=>(d.data[m]||[]).filter(x=>x&&x.ticket).map(x=>x.ticket+'='+x.amount+(x.type?x.type:'')+(x.newTicket?'>'+x.newTicket:'')).join(',')).join(' | ');
   let au=''; try{ au=(JSON.parse(localStorage.getItem('pawn_krabi_audit_v1'))||[]).filter(x=>/สธ.3/.test(x.a)).map(x=>x.d).join(';'); }catch(e){}
   let T=''; try{ const D=(window.tkwAll()||[]).find(x=>x.k===K); T=D?D.m.map((m,g)=>m+':'+D.r[g].filter(x=>x[0]).map(x=>x[0]+'='+x[1]).join(',')).filter(x=>!/:$/.test(x)).join(' | '):'-'; }catch(e){ T='err '+e; }
   return {L,au,T}; },K);
 r.prep=prep; r.errs=errs; await b.close(); return r; }
(async()=>{
  let r=await run('native');
  ok(r.prep==='101:dup,102:fix,103:new,104:fix,105:new','1 เตรียม: ตรง=ข้าม, ยอดต่าง/ว่าง=แก้, คนละเล่ม/ไม่มี=ใหม่ '+r.prep);
  ok(r.L==='101=5000ถ,102=7000ส>900 | 103=1000ถ,104=4000ผ,103=9000,105=6500'&&!r.errs.length,'2 แก้ยอดเฉพาะเงินต้น เก็บประเภท/ตั๋วใหม่ไว้ + นำเข้าใหม่ '+JSON.stringify(r));
  ok(/102 7,700→7,000/.test(r.au)&&/104 0→4,000/.test(r.au),'3 บันทึกประวัติการแก้ยอด '+r.au);
  r=await run('blocked',{tkw:true});
  ok(r.L==='101=5000ถ,102=7000ส>900 | 103=1000ถ,104=4000ผ,103=9000,105=6500'&&!r.errs.length,'4 เบราว์เซอร์บล็อกกล่องยืนยัน (ถามในหน้า) + เขียนตั๋ว '+JSON.stringify(r));
  r=await run('native',{untick:true});
  ok(/102=7700ส/.test(r.L)&&/104=4000/.test(r.L),'5 เอาติ๊กออก = ไม่แก้ใบนั้น '+r.L);
  r=await run('native',{twin:true});
  ok(/104:dup/.test(r.prep)&&/104=1ถ,104=2ถ/.test(r.L),'6 ตั๋วซ้ำ 2 แถวในตาราง = ไม่เดาแก้ '+r.prep+' '+r.L);
  r=await run('native',{tkw:true,tkwSeed:true});
  ok(r.T==='10:101=5000,102=7000 | 11:103=9000,104=4000,105=6500'&&/103 0→9,000/.test(r.au),'7 เขียนตั๋ว: ยอดผิด/ว่างแก้ตาม สธ.3 · ใบใหม่ลงเพิ่ม '+JSON.stringify(r));
  r=await run('blocked',{tkw:true,tkwSeed:true});
  ok(r.T==='10:101=5000,102=7000 | 11:103=9000,104=4000,105=6500','8 เขียนตั๋ว + ถามในหน้า '+r.T);
  r=await run('native',{tkw:true,tkwSeed:true,untick:true});
  ok(/102=7700/.test(r.T)&&/102=7700/.test(r.L),'9 เอาติ๊กออก = ไม่แก้ทั้ง 2 ตาราง '+r.T);
  console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0); })();
