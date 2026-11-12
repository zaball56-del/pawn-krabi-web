// ทดสอบการนำเข้า สธ.3 → ตารางเขียนตั๋ว (modules/s3tkw.html + tkwImportS3 ใน modules/tkw.html ตัวจริง)
// รัน: JSDOM=/path/to/jsdom node tests/s3import.test.js   (หรือ npm i --no-save jsdom)
const fs=require('fs'),path=require('path');
const {JSDOM}=require(process.env.JSDOM||'jsdom');
const tkwSrc=fs.readFileSync(path.join(__dirname,'../modules/tkw.html'),'utf8');
const s3Src=fs.readFileSync(path.join(__dirname,'../modules/s3tkw.html'),'utf8');
const js=src=>src.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
const DAY='2026-11-12';
const rec=(ticket,month,book,amount,extra)=>Object.assign({ticket,month,book,amount,selected:true,duplicate:false},extra||{});

function boot(o={}){
  const dom=new JSDOM(`<!doctype html><body><div id="app-sidebar"></div>
    <input type="checkbox" id="pdf-dest-ledger" ${o.ledger===false?'':'checked'}><input type="checkbox" id="pdf-dest-tkw" ${o.tkw===false?'':'checked'}>
    <input id="pdf-import-date" value="${o.date||DAY}"><button id="pdf-import-confirm"></button>
    <script>
      window.matchMedia=function(){return {matches:false,addEventListener(){}}}; var currentDate='${DAY}'; function sbClose(){}
      var pdfImportReadyRecords=[]; window.__log={ledger:0,toast:[],confirm:0,alert:0,closed:0};
      function showToast(m){ __log.toast.push(m); } function closePDFImportModal(){ __log.closed++; }
      window.confirm=function(){ __log.confirm++; return true; }; window.alert=function(){ __log.alert++; };
      window.commitPDFImport=function(){ __log.ledger++; ${o.ledgerFails?'':"document.getElementById('pdf-import-confirm').disabled=true;"} };
    </script></body>`,{runScripts:'dangerously',url:'https://example.test/',pretendToBeVisual:true,
    beforeParse(w){ w.addEventListener('error',e=>{ throw new Error('PAGE ERROR '+e.message); }); }});
  const w=dom.window,d=w.document; const t=d.createElement('div'); t.innerHTML=tkwSrc.replace(/<script[\s\S]*?<\/script>/g,''); d.body.appendChild(t);
  [js(tkwSrc),js(s3Src)].forEach(code=>{ const s=d.createElement('script'); s.textContent=code; d.body.appendChild(s); });
  w.eval('pdfImportReadyRecords=[]'); return w;
}
const setRecs=(w,recs)=>{ w.pdfImportReadyRecords.length=0; recs.forEach(r=>w.pdfImportReadyRecords.push(r)); };
const store=w=>JSON.parse(w.localStorage.getItem('pawn_tkw_v1')||'{}');
const tickets=(w,k)=>{ const d=store(w)[k]; const o=[]; if(d) d.r.forEach((c,g)=>c.forEach(x=>{ if(x&&x[0]) o.push({t:x[0],b:x[2],a:x[1],month:d.m[g]}); })); return o; };
const lastToast=w=>w.__log.toast[w.__log.toast.length-1]||'';

let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
const R3=[rec('252',11,'262','8000'),rec('701',11,'266','20000'),rec('815',10,'267','58000')];

{ const w=boot(); setRecs(w,R3); w.commitPDFImport();
  ok(w.__log.ledger===1&&tickets(w,DAY).length===3,'1 ติ๊กทั้งสองช่อง → ลงรักษาของและเขียนตั๋ว 3 ใบ');
  ok(/เขียนตั๋ว: ลง 3 ใบ/.test(lastToast(w))&&!/ข้าม/.test(lastToast(w)),'1b มีข้อความ "เขียนตั๋ว: ลง 3 ใบ" ('+lastToast(w)+')');
  const t=tickets(w,DAY); ok(t.find(x=>x.t==='252').b==='262'&&t.find(x=>x.t==='252').a==='8000','1c เลขตั๋ว เล่ม ยอดเงิน ถูกต้อง'); }
{ const w=boot({ledger:false}); setRecs(w,R3); w.commitPDFImport();
  ok(w.__log.ledger===0&&w.__log.confirm===1&&tickets(w,DAY).length===3&&w.__log.closed===1,'2 ติ๊กเฉพาะเขียนตั๋ว → ไม่แตะรักษาของ ถามยืนยัน ลงตาราง 3 ใบ แล้วปิดหน้าต่าง'); }
{ const w=boot({tkw:false}); setRecs(w,R3); w.commitPDFImport();
  ok(w.__log.ledger===1&&tickets(w,DAY).length===0,'3 ติ๊กเฉพาะรักษาของ → ตารางเขียนตั๋วว่าง (นี่คือกรณี "นำเข้าแล้วไม่ขึ้น")'); }
{ const w=boot({ledger:false,tkw:false}); setRecs(w,R3); w.commitPDFImport();
  ok(w.__log.alert===1&&w.__log.ledger===0&&tickets(w,DAY).length===0,'4 ไม่ติ๊กอะไรเลย → เตือน ไม่ลงที่ไหน'); }
{ const w=boot(); setRecs(w,R3); w.commitPDFImport(); w.document.getElementById('pdf-import-confirm').disabled=false; w.commitPDFImport();
  ok(tickets(w,DAY).length===3&&/ลง 0 ใบ/.test(lastToast(w))&&/ข้ามที่มีอยู่แล้ว 3/.test(lastToast(w)),'5 นำเข้าซ้ำ → ข้ามครบ ไม่เบิ้ล ('+lastToast(w)+')'); }
{ const w=boot({date:'2026-11-13'}); setRecs(w,R3); w.commitPDFImport();
  ok(tickets(w,'2026-11-13').length===3&&tickets(w,DAY).length===0,'6 นำเข้าด้วยวันที่คนละวัน → ตั๋วไปอยู่วันนั้น วันที่เปิดดูอยู่ว่าง (นี่คือกรณี "นำเข้าแล้วไม่ขึ้น")'); }
{ const w=boot(); setRecs(w,R3); w.commitPDFImport(); const d=store(w)[DAY];
  const col=m=>d.r[d.m.indexOf(m)].filter(x=>x[0]).map(x=>x[0]);
  ok(col(11).join()==='252,701'&&col(10).join()==='815','7 ตั๋วแยกลงคอลัมน์ตามเดือนของตั๋ว (11: 252,701 / 10: 815) → บนมือถือเห็นทีละเดือน ต้องกดแท็บเดือนนั้นถึงจะเห็น'); }
{ const w=boot(); setRecs(w,[rec('252',11,'262','8000',{selected:false,duplicate:true,reason:'มีเลขตั๋วนี้ในตารางแล้ว'}),rec('999',11,'1','1',{selected:false,duplicate:false,reason:'อื่น ๆ'})]); w.commitPDFImport();
  const t=tickets(w,DAY); ok(t.length===1&&t[0].t==='252','8 ตั๋วที่ซ้ำกับรักษาของ ("มีเลขตั๋วนี้ในตารางแล้ว") ยังลงตารางเขียนตั๋วได้ ส่วนที่ไม่ได้เลือกด้วยเหตุอื่นไม่ลง'); }
{ const w=boot({ledgerFails:true}); setRecs(w,R3); w.commitPDFImport();
  ok(w.__log.ledger===1&&tickets(w,DAY).length===0,'9 ถ้าลงรักษาของไม่สำเร็จ (ปุ่มยืนยันไม่ถูกปิด) → ไม่ลงเขียนตั๋วต่อ'); }
{ const w=boot(); setRecs(w,[rec('2329',10,'','51500')]); w.commitPDFImport(); setRecs(w,[rec('2329',10,'255','51500')]); w.document.getElementById('pdf-import-confirm').disabled=false; w.commitPDFImport();
  ok(tickets(w,DAY).length===1&&tickets(w,DAY)[0].b==='255'&&tickets(w,DAY)[0].a==='51500','10 ตั๋วที่มีในตารางแต่ไม่มีเล่ม → นำเข้า สธ.3 แล้วเติมเล่มที่ให้ (2329 → 255) ไม่เบิ้ลแถว ยอดไม่เปลี่ยน');
  ok(/เติมเล่มที่ให้ 1 ใบ/.test(lastToast(w))&&/ลง 0 ใบ/.test(lastToast(w)),'10b ข้อความแจ้งว่าเติมเล่มที่ให้ ('+lastToast(w)+')'); }
{ const w=boot(); setRecs(w,[rec('2329',10,'254','51500')]); w.commitPDFImport(); setRecs(w,[rec('2329',10,'255','51500')]); w.document.getElementById('pdf-import-confirm').disabled=false; w.commitPDFImport();
  ok(tickets(w,DAY).length===2&&!/เติมเล่มที่/.test(lastToast(w)),'10c ตั๋วเลขเดียวกันแต่คนละเล่ม (254 กับ 255) ไม่ถูกเติม/ทับ → เป็นคนละใบ'); }
{ const w=boot(); setRecs(w,[rec('2329',10,'255','51500')]); w.commitPDFImport(); setRecs(w,[rec('2329',10,'','51500')]); w.document.getElementById('pdf-import-confirm').disabled=false; w.commitPDFImport();
  ok(tickets(w,DAY).length===1&&tickets(w,DAY)[0].b==='255','10d สธ.3 ไม่มีเล่มที่ → ไม่ลบเล่มที่เดิม'); }
{ const w=boot(); setRecs(w,[rec('',11,'1','1'),rec('55',11,'3','1,500')]); w.commitPDFImport(); const t=tickets(w,DAY);
  ok(t.length===1&&t[0].t==='55'&&t[0].a==='1500','11 แถวไม่มีเลขตั๋วถูกข้าม และยอดมีคอมมา (1,500) แปลงเป็นตัวเลข'); }
{ const w=boot(); w.eval("tkwOpen()"); setRecs(w,R3); w.commitPDFImport(); const el=w.document.getElementById('tkw-s3note');
  ok(el.classList.contains('on')&&/ลงเขียนตั๋ว 3 ใบ/.test(el.textContent)&&/12\/11\/2569/.test(el.textContent),'12 หลังนำเข้า มีสรุปถาวรเหนือแผงเทียบ: ลง 3 ใบ วันที่ 12/11/2569 ('+el.textContent.slice(0,90)+'…)');
  ok(/ตุลาคม 1/.test(el.textContent)&&/พฤศจิกายน 2/.test(el.textContent),'12b บอกว่าลงเดือนไหนกี่ใบ (ต.ค. 1 · พ.ย. 2)');
  w.eval("tkwOpen()"); ok(w.document.getElementById('tkw-s3note').classList.contains('on'),'12c เปิดหน้าใหม่แล้วสรุปยังอยู่ (ไม่หายเหมือนข้อความ toast)');
  const w2=w.localStorage.getItem('pawn_tkw_s3note'); ok(!!w2&&JSON.parse(w2)[DAY].added===3,'12d เก็บลงเครื่อง (pawn_tkw_s3note)'); }
console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
