// ทดสอบ: แก้วันย้อนหลังแล้วคงเหลือวันถัดไปคำนวณตาม · รายงานรายเดือน (27-v1.2) + ปิดยอดวัน (28-v1.3) เทียบตัวคำนวณอิสระ — ตรวจอย่างเดียว ไม่แก้โค้ด
const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const FILE=process.env.FILE||require('path').join(__dirname,'../../index.html');
let fail=0; const ok=(c,m,x)=>{ if(!c){fail++;console.log('FAIL',m,x===undefined?'':JSON.stringify(x));} else console.log('ok  ',m); };
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const pg=await (await b.newContext({viewport:{width:1366,height:900}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(2500);
 await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger'); });
 const res=await pg.evaluate(async()=>{
  window.alert=()=>{}; window.confirm=()=>true;
  Object.keys(db).forEach(k=>delete db[k]);
  const M='ตุลาคม', N='พฤศจิกายน';
  const mk=k=>{ currentDate=k; const d=getCurrentDayData(); d.months=[M,N,'','','','']; [M,N].forEach(m=>d.data[m]=d.data[m]||[]); return d; };
  const row=(t,tk,a)=>({type:t,ticket:tk,book:'1',amount:a,count:'',origIdx:0,timestamp:''});
  const setPledge=(k,c,a)=>{ currentDate=k; const s=db[k].data['สรุปประจำวัน']; s[1].count=c; s[1].amount=a; };
  const fin=k=>{ currentDate=k; updateSummaryColumn(); saveDB(); recalculateFutureBroughtForwardBalances(k); };
  // D1
  let d=mk('2026-11-16'); d.bf=[10000,20000,0,0,0,0]; d.bfCount=[2,4,0,0,0,0];
  d.data[M][0]=row('ส','601',1000); d.data[N][0]=row('ถ','701',2500); syncDailyOpeningFromMonthlyBF('2026-11-16'); setPledge('2026-11-16',1,3000); fin('2026-11-16');
  // D2 (มี สธ.2: ตั๋วใหม่ของ N 1 ใบ 2000 = รับจำนำ 2000)
  d=mk('2026-11-17'); syncBroughtForwardForDate('2026-11-17',true); d.data[M][0]=row('ถ','602',500); d.sor2={mn:N,n:1,amt:2000}; setPledge('2026-11-17',1,2000); fin('2026-11-17');
  // D3: ปรับยอดยกมา M +5000/+1 (อนุมัติกลับ, รวมใน ย/ม)
  d=mk('2026-11-18'); syncBroughtForwardForDate('2026-11-18',true); currentDate='2026-11-18'; fin('2026-11-18'); applyBfAdj(0,5000,1,'อนุมัติกลับ');
  // D4: แก้ยอดให้ตรง N +2000 (ไม่รวมใน ย/ม)
  d=mk('2026-11-19'); syncBroughtForwardForDate('2026-11-19',true); d.data[N][0]=row('ส','702',1500); fin('2026-11-19'); applyBfAdj(1,2000,0,'แก้ให้ตรง',true);
  // D5: ตัดหลุดทั้งเดือน M
  d=mk('2026-11-20'); syncBroughtForwardForDate('2026-11-20',true); fin('2026-11-20'); removeMonthAt(0);
  d=mk('2026-11-23'); syncBroughtForwardForDate('2026-11-23',true); d.data[N][0]=row('ถ','703',700); fin('2026-11-23');
  const snap=()=>Object.keys(db).sort().map(k=>{ const s=db[k].data['สรุปประจำวัน']; return [k.slice(5),+s[0].amount,+s[2].amount,+s[3].amount]; });
  const indep=()=>{ let prev=null; return Object.keys(db).sort().map(k=>{ const s=db[k].data['สรุปประจำวัน']; const dl=getDayOpeningDelta(k).a; const o=prev===null?+s[0].amount:Math.round((prev+dl)*100)/100; const ba=Math.round((o+(+s[1].amount||0)-(+s[2].amount||0))*100)/100; prev=ba; return [k.slice(5),o,ba]; }); };
  const out={};
  out.before=snap().map(x=>x.join('|'));
  // แก้ย้อนหลัง: เพิ่มไถ่ถอน ถ 800 ในวันที่ 16 (ผ่านเส้นทางเดียวกับการพิมพ์ในตาราง)
  currentDate='2026-11-16'; db['2026-11-16'].data['ตุลาคม'][1]={type:'ถ',ticket:'650',book:'1',amount:800,count:'',origIdx:1,timestamp:''};
  updateSummaryColumn(); recalculateFutureBroughtForwardBalances('2026-11-16');
  out.afterEditStored=snap().map(x=>x.join('|')); out.afterEditIndep=indep().map(x=>x.join('|'));
  // เปิดวันถัดๆ ไป (ผ่าน changeDate) ทีละวัน
  const open=k=>{ document.getElementById('doc-date').value=k; changeDate(); };
  open('2026-11-23'); out.afterOpen23only=snap().map(x=>x.join('|'));
  for(const k of ['2026-11-17','2026-11-18','2026-11-19','2026-11-20','2026-11-23']) open(k);
  out.afterOpenAll=snap().map(x=>x.join('|'));
  window.openMonthlyReport(); await new Promise(r=>setTimeout(r,200));
  out.reportRows=[...document.querySelectorAll('#mr-modal .mr-t tbody tr')].map(tr=>[...tr.children].map(td=>td.textContent.trim()).join('|'));
  return out;
 });
 ok(JSON.stringify(res.afterEditStored.map(x=>x.split('|').filter((_,i)=>i!==2)))===JSON.stringify(res.afterEditIndep.map(x=>x.split('|'))),'1 แก้วันย้อนหลัง → ย/ม และคงเหลือของทุกวันถัดไปตรงตัวคำนวณแยกทันที (ไม่ต้องเปิดไล่วัน)',res);
 ok(JSON.stringify(res.afterEditStored)===JSON.stringify(res.afterOpenAll),'2 เปิดไล่วันแล้วค่าไม่เปลี่ยน');
 ok(!errs.length,'3 ไม่มี error',errs);
 await b.close(); process.exit(fail?1:0);
})();
