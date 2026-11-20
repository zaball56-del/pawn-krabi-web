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
  // สรุปประจำวัน: ย/ม = คงเหลือวันก่อน + ยอดปรับ → คงเหลือ = ยกไปรวมทุกเดือน
  const sm=await pg.evaluate(()=>{ const out={}; const S='สรุปประจำวัน';
    const sumCarry=k=>db[k].months.filter(Boolean).reduce((t,m)=>({a:roundMoney(t.a+getMonthCarriedBalance(k,m)),c:t.c+getMonthCarriedCount(k,m)}),{a:0,c:0});
    ['2026-11-16','2026-11-17','2026-11-18','2026-11-19'].forEach(k=>{ currentDate=k; syncBroughtForwardForDate(k,true); renderTable(); });
    currentDate='2026-11-16'; renderTable(); const prev=db['2026-11-16'].data[S][3]; out.prevBal=prev.amount+'/'+prev.count;
    currentDate='2026-11-17'; renderTable(); const y0=db['2026-11-17'].data[S][0]; out.ymBefore=y0.amount+'/'+y0.count;
    out.ym18pre=db['2026-11-18'].data[S][0].amount;
    applyBfAdj(0,'5000','1','ตั๋ว 601 อนุมัติกลับ'); renderTable(); out.ym18=db['2026-11-18'].data[S][0].amount;
    const d=db['2026-11-17'].data[S]; out.ym=d[0].amount+'/'+d[0].count; out.bal=d[3].amount+'/'+d[3].count; const sc=sumCarry('2026-11-17'); out.sum=sc.a+'/'+sc.c;
    ['2026-11-18','2026-11-19'].forEach(k=>{ currentDate=k; syncBroughtForwardForDate(k,false); renderTable(); });  /* เปิดวันถัดไปตามปกติ (เหมือน changeDate) */ const d19=db['2026-11-19'].data[S]; const s19=sumCarry('2026-11-19'); out.bal19=d19[3].amount+'/'+d19[3].count; out.sum19=s19.a+'/'+s19.c;
    currentDate='2026-11-17'; applyBfAdj(0,0,0,''); renderTable(); out.ymCleared=db['2026-11-17'].data[S][0].amount+'/'+db['2026-11-17'].data[S][0].count;
    return out; });
  console.log('   ',JSON.stringify(sm));
  ok(sm.ymBefore===sm.prevBal,'20 ไม่มียอดปรับ → ย/ม = คงเหลือวันก่อน (สูตรเดิม)');
  ok(sm.ym===(Number(sm.prevBal.split('/')[0])+5000)+'/'+(Number(sm.prevBal.split('/')[1])+1),'21 มียอดปรับ → ย/ม = คงเหลือวันก่อน + 5,000 / +1 ราย');
  ok(sm.bal===sm.sum,'22 คงเหลือในสรุปประจำวัน = ยกไปรวมทุกเดือน ('+sm.bal+')');
  ok(sm.ym18===sm.ym18pre+5000,'23a ย/ม ของวันถัดไปรับยอดใหม่ทันทีหลังบันทึก');
  ok(!!sm.bal19&&sm.bal19===sm.sum19,'23 วันถัดไปยังตรงกัน ('+sm.bal19+')');
  ok(sm.ymCleared===sm.ymBefore,'24 ล้างยอดปรับ → ย/ม กลับเป็นเดิม');
  // แก้ยอดให้ตรง (ไม่รวมใน ย/ม): คงเหลือที่ร้านนับจริงมากกว่ายอดรายเดือน 1,000 → วันถัดไปแก้ยกมาเดือนหนึ่ง +1,000 ติ๊กช่อง → ตรงกัน
  const fx=await pg.evaluate(()=>{ const out={}, S='สรุปประจำวัน';
    const sum=k=>db[k].months.filter(Boolean).reduce((t,m)=>({a:roundMoney(t.a+getMonthCarriedBalance(k,m)),c:t.c+getMonthCarriedCount(k,m)}),{a:0,c:0});
    const open=k=>{ currentDate=k; syncBroughtForwardForDate(k,false); renderTable(); };
    ['2026-11-16','2026-11-17','2026-11-18','2026-11-19'].forEach(open);
    currentDate='2026-11-17'; renderTable(); const s17=db['2026-11-17'].data[S]; db['2026-11-17'].balanceManual=true; s17[3].amount=roundMoney(Number(s17[3].amount)+1000); saveDB(); renderTable();
    open('2026-11-18'); const d=db['2026-11-18']; out.diffBefore=roundMoney(sum('2026-11-18').a-Number(d.data[S][3].amount)); out.ym0=d.data[S][0].amount;
    return out; });
  await pg.evaluate(()=>{ currentDate='2026-11-18'; renderTable(); });
  await pg.click('.bfadj-btn'); await sleep(200);
  await pg.fill('#bfadj-a','1000'); await pg.check('#bfadj-fx'); await pg.fill('#bfadj-n','แก้ยอดให้ตรงกับที่นับ');
  const pv=await pg.textContent('#bfadj-p'); await pg.click('#bfadj-ok'); await sleep(200);
  const fx2=await pg.evaluate(()=>{ const out={}, S='สรุปประจำวัน', k='2026-11-18';
    const sum=k=>db[k].months.filter(Boolean).reduce((t,m)=>({a:roundMoney(t.a+getMonthCarriedBalance(k,m)),c:t.c+getMonthCarriedCount(k,m)}),{a:0,c:0});
    const d=db[k]; out.ym=d.data[S][0].amount; out.diff=roundMoney(sum(k).a-Number(d.data[S][3].amount)); out.flag=d.bfAdj&&d.bfAdj['มิถุนายน']&&d.bfAdj['มิถุนายน'].x===true;
    Object.keys(db).sort().forEach(x=>syncBroughtForwardForDate(x,true)); currentDate=k; renderTable(); out.diffForce=roundMoney(sum(k).a-Number(db[k].data[S][3].amount));
    currentDate='2026-11-19'; syncBroughtForwardForDate('2026-11-19',false); renderTable(); out.diff19=roundMoney(sum('2026-11-19').a-Number(db['2026-11-19'].data[S][3].amount));
    currentDate=k; renderTable(); const b=document.querySelector('.bfadj-btn'); out.btn=b.textContent.trim(); out.title=b.title;
    out.ck=window.__ckList().filter(x=>/ย\/ม ไม่ตรง/.test(x.t)&&x.date>='2026-11-18').length;
    return out; });
  console.log('   ',JSON.stringify(fx),JSON.stringify(fx2),pv);
  ok(fx.diffBefore===-1000,'25 สร้างสถานการณ์: ยกไปรวมน้อยกว่าคงเหลือ 1,000');
  ok(/ไม่รวมใน ย\/ม/.test(pv),'26 หน้าต่างบอกว่า "ไม่รวมใน ย/ม" เมื่อติ๊ก');
  ok(fx2.flag&&fx2.ym===fx.ym0&&fx2.diff===0,'27 ติ๊ก "แก้ยอดให้ตรง" +1,000 → ย/ม เท่าเดิม และยกไปรวม = คงเหลือ');
  ok(fx2.diffForce===0&&fx2.diff19===0,'28 คำนวณใหม่ทั้งชุด / วันถัดไป ยังตรงกัน');
  ok(fx2.btn==='แก้'&&/แก้ยอดให้ตรง/.test(fx2.title),'29 ปุ่มขึ้นว่า "แก้" พร้อมคำอธิบาย');
  ok(fx2.ck===0,'30 ตัวตรวจไม่เตือน ย/ม');
  ok(!pg.errs.length,'19 ไม่มี error ในหน้า '+pg.errs.join('|'));
  await pg.b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
