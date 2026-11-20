// ทดสอบยอดปรับยกมา (+/−) เช่น ตั๋วที่หักไปแล้วอนุมัติกลับ: ไม่ถูกเขียนทับเมื่อแก้ย้อนหลัง/คำนวณใหม่ · ส่งต่อวันถัดไป · หน้าพิมพ์
// รัน: node tests/e2e.bfadj.chrome.js  (ตั้ง OLD=<index.html เดิม> เพื่อเทียบหน้าพิมพ์/ยอดของข้อมูลที่ไม่มียอดปรับ ก่อน/หลัง)
const path=require('path'); const {chromium}=require('playwright'); const NEW=path.join(__dirname,'../../index.html');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
const SEED=()=>{ window.alert=m=>{ (window.__al=window.__al||[]).push(m); }; window.confirm=()=>true;
  Object.keys(db).forEach(k=>delete db[k]); const M='มิถุนายน', N='กรกฎาคม';
  const mk=k=>{ currentDate=k; const d=getCurrentDayData(); d.months=[M,N,'','','','']; [M,N].forEach(m=>d.data[m]=d.data[m]||[]); return d; };
  const a=mk('2026-11-16'); a.bf=[10000,20000,0,0,0,0]; a.bfCount=[2,4,0,0,0,0];
  a.data[M][0]={type:'ส',ticket:'601',book:'1',amount:5000,count:'',origIdx:0,timestamp:''};
  a.data[N][0]={type:'ถ',ticket:'701',book:'1',amount:2500,count:'',origIdx:0,timestamp:''}; saveDB();
  mk('2026-11-17'); syncBroughtForwardForDate('2026-11-17',true); saveDB();
  const c=mk('2026-11-18'); syncBroughtForwardForDate('2026-11-18',true); c.data[M][0]={type:'ถ',ticket:'602',book:'1',amount:1000,count:'',origIdx:0,timestamp:''}; saveDB();
  mk('2026-11-19'); syncBroughtForwardForDate('2026-11-19',true); saveDB(); currentDate='2026-11-17'; };
async function open(file){ const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}); const pg=await (await b.newContext({viewport:{width:1366,height:800}})).newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(String(e))); await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
  await pg.goto('file://'+file,{waitUntil:'domcontentloaded'}); await sleep(2500);
  await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger'); });
  await pg.evaluate(SEED); pg.errs=errs; pg.b=b; return pg; }
const snapAll=pg=>pg.evaluate(()=>JSON.stringify(Object.keys(db).sort().map(k=>[k,db[k].bf.slice(0,2),db[k].bfCount.slice(0,2)])));
const printOf=pg=>pg.evaluate(()=>{ renderTable(); openPrintPreview(); return document.getElementById('print-preview-table-container').innerHTML; });
(async()=>{
  if(process.env.OLD){ const o=await open(process.env.OLD), n=await open(NEW);
    ok((await snapAll(o))===(await snapAll(n)),'1 ไม่มียอดปรับ → ยกมาทุกวันเท่าเดิม (ก่อน/หลังแก้)');
    ok((await printOf(o))===(await printOf(n)),'2 ไม่มียอดปรับ → หน้าพิมพ์ก่อน/หลังแก้ เหมือนกันทุกตัวอักษร');
    await o.b.close(); await n.b.close(); }
  const pg=await open(NEW); const g=(k,i)=>pg.evaluate(([k,i])=>db[k].bf[i]+'/'+db[k].bfCount[i],[k,i]);
  ok((await g('2026-11-17',0))==='5000/1','3 ก่อนปรับ: มิ.ย. ยกมา 5,000 / 1 ราย');
  // เปิดหน้าต่างปรับจากปุ่มในตาราง แล้วกรอก +1 ราย +5,000
  await pg.evaluate(()=>{ renderTable(); }); await pg.click('#ledger-tbody .bfadj-btn, .bfadj-btn'); await sleep(200);
  ok(await pg.isVisible('#bfadj-modal'),'4 กดปุ่ม ± ที่ช่องยกมา → เปิดหน้าต่างปรับยอด');
  await pg.fill('#bfadj-c','1'); await pg.fill('#bfadj-a','5000'); await pg.fill('#bfadj-n','ตั๋ว 601 อนุมัติกลับ');
  ok(/2 ราย · 10,000 บาท/.test(await pg.textContent('#bfadj-p')),'5 แสดงยกมาใหม่ก่อนบันทึก (2 ราย · 10,000)');
  await pg.click('#bfadj-ok'); await sleep(200);
  ok((await g('2026-11-17',0))==='10000/2'&&!(await pg.isVisible('#bfadj-modal')),'6 บันทึกแล้ว ยกมา = 10,000 / 2 ราย');
  ok(await pg.evaluate(()=>{ const x=db['2026-11-17'].bfAdj['มิถุนายน']; return x.a===5000&&x.c===1&&x.note==='ตั๋ว 601 อนุมัติกลับ'; }),'7 เก็บยอดปรับ + หมายเหตุแยกไว้');
  ok((await g('2026-11-18',0))==='10000/2'&&(await g('2026-11-19',0))==='9000/1','8 ส่งต่อวันถัดไป (18 = 10,000 · 19 = 10,000−1,000)');
  ok((await g('2026-11-17',1))==='17500/3','9 เดือนอื่นไม่กระทบ');
  // แก้วันก่อนหน้า (ยอดเท่าเดิม) → เดิมยอดที่พิมพ์เองหาย ตอนนี้ต้องอยู่
  await pg.evaluate(()=>{ currentDate='2026-11-16'; updateBF(0,'10000'); });
  ok((await g('2026-11-17',0))==='10000/2','10 แก้วันก่อนหน้า → ยอดปรับไม่หาย (เดิมกลับเป็น 5,000)');
  // แก้ย้อนหลังจริง: ส่งขาย 5,000 → 3,000 → ฐานเปลี่ยน ยอดปรับยังบวกอยู่
  await pg.evaluate(()=>{ db['2026-11-16'].data['มิถุนายน'][0].amount=3000; saveDB(); recalculateFutureBroughtForwardBalances('2026-11-16'); });
  ok((await g('2026-11-17',0))==='12000/2'&&(await g('2026-11-19',0))==='11000/1','11 แก้ย้อนหลัง → ยกมา = ฐานใหม่ 7,000 + ปรับ 5,000 และส่งต่อถูก');
  // รวมข้อมูล 2 เครื่อง/รีเฟรช: เรียกคำนวณซ้ำทั้งชุด
  await pg.evaluate(()=>{ Object.keys(db).sort().forEach(k=>syncBroughtForwardForDate(k,true)); });
  ok((await g('2026-11-17',0))==='12000/2','12 คำนวณใหม่ทั้งชุด (เหมือนตอนรวม 2 เครื่อง) → ยอดปรับยังอยู่');
  // หน้าพิมพ์แสดงยกมารวมยอดปรับ
  ok(await pg.evaluate(()=>{ currentDate='2026-11-17'; renderTable(); openPrintPreview(); const h=document.getElementById('print-preview-table-container').innerHTML; closePrintPreview&&closePrintPreview(); return h.includes('12,000'); }),'13 หน้าพิมพ์แสดงยกมา 12,000');
  ok(await pg.evaluate(()=>{ renderTable(); const b=document.querySelector('.bfadj-btn'); return b&&b.textContent.trim()==='ปรับ'&&/ตั๋ว 601/.test(b.title); }),'14 ปุ่มเปลี่ยนเป็น "ปรับ" พร้อมรายละเอียดเมื่อชี้');
  // ลบเดือนที่ยังมียอด (รวมยอดปรับ) ไม่ได้
  ok(await pg.evaluate(()=>{ window.__al=[]; removeMonthAt(0); return window.__al.length===1&&db['2026-11-17'].months[0]==='มิถุนายน'; }),'15 เดือนที่มียอดปรับค้าง → ลบคอลัมน์ไม่ได้');
  // ล้างยอดปรับ → กลับเป็นฐาน
  await pg.evaluate(()=>{ applyBfAdj(0,0,0,''); });
  ok((await g('2026-11-17',0))==='7000/1'&&(await g('2026-11-19',0))==='6000/0','16 ล้างยอดปรับ → กลับเป็นยอดตามสูตร');
  // ติดลบได้
  await pg.evaluate(()=>{ applyBfAdj(0,'-2000','-1','ปรับลด'); });
  ok((await g('2026-11-17',0))==='5000/0','17 ยอดปรับติดลบได้');
  await pg.evaluate(()=>{ applyBfAdj(0,0,0,''); });
  // วันที่ปิดยอด → ถาม PIN ไม่บันทึก
  ok(await pg.evaluate(()=>{ db['2026-11-17'].closing={closed:true}; let asked=0; const o=window.__askUnlock; window.__askUnlock=function(){ asked++; return Promise.resolve(false); };
     applyBfAdj(0,'9999','1',''); openBfAdj(0); const r=asked===2&&db['2026-11-17'].bf[0]===7000&&!document.getElementById('bfadj-modal'); window.__askUnlock=o; delete db['2026-11-17'].closing; return r; }),'18 วันที่ปิดยอดแล้ว → ถาม PIN ก่อน ไม่เปลี่ยนยอด');
  ok(!pg.errs.length,'19 ไม่มี error ในหน้า '+pg.errs.join('|'));
  await pg.b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
