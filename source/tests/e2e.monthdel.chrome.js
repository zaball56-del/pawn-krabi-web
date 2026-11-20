// ทดสอบปุ่มลบคอลัมน์เดือน (✕ ที่หัวคอลัมน์): กันลบเดือนที่ยังมียอด/มีรายการ/วันที่ปิดยอด · เลื่อนคอลัมน์ · ยกยอดต่อถูก
// รัน: node tests/e2e.monthdel.chrome.js  (ตั้ง OLD=<index.html เดิม> เพื่อเทียบหน้าพิมพ์ก่อน/หลัง)
const path=require('path'); const NEW=path.join(__dirname,'../../index.html');
const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const SETUP=()=>{ window.alert=m=>{ (window.__al=window.__al||[]).push(m); }; window.confirm=()=>true;
  Object.keys(db).forEach(k=>delete db[k]);
  const M=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม'];
  const mk=(k,bf,bc)=>{ currentDate=k; const d=getCurrentDayData(); d.months=M.slice(); d.bf=bf; d.bfCount=bc; d.customTotals=['','','','','']; d.customCarried=['','','','','']; M.forEach(m=>d.data[m]=d.data[m]||[]); return d; };
  let d=mk('2026-11-16',[1000,50000,40000,30000,20000],[1,5,4,3,2]);
  d.data['มกราคม'][0]={type:'ถ',ticket:'101',book:'1',amount:1000,count:'',origIdx:0,timestamp:''};
  d.data['กุมภาพันธ์'][0]={type:'ถ',ticket:'201',book:'1',amount:5000,count:'',origIdx:0,timestamp:''}; saveDB();
  d=mk('2026-11-17',[0,0,0,0,0],[0,0,0,0,0]); syncBroughtForwardForDate('2026-11-17',true); saveDB(); renderTable(); };
async function run(file,act){ const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}); const pg=await (await b.newContext({viewport:{width:1366,height:800}})).newPage();
 const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await pg.goto('file://'+file,{waitUntil:'domcontentloaded'}); await sleep(2500);
 await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); });
 await pg.evaluate(SETUP); const r=await act(pg); r.errs=errs; await b.close(); return r; }
const printHTML=pg=>pg.evaluate(()=>{ openPrintPreview(); return document.getElementById('print-preview-table-container').innerHTML; });
(async()=>{
 let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
 // 1) หน้าพิมพ์ก่อน/หลัง (ข้อมูลเดียวกัน) ต้องเหมือนกันทุกตัวอักษร
 if(process.env.OLD){ const a=await run(process.env.OLD,async pg=>({p:await printHTML(pg)})); const bb=await run(NEW,async pg=>({p:await printHTML(pg)}));
 ok(a.p===bb.p&&a.p.length>1000,'1 หน้าพิมพ์ก่อน/หลังแก้ เหมือนกันทุกตัวอักษร ('+a.p.length+' ตัว)'); }
 const r=await run(NEW,async pg=>pg.evaluate(()=>{ const out={};
   const n0=document.querySelectorAll('#ledger-thead .mcol-del').length; out.btn=n0; out.cols=db[currentDate].months.length;
   // กุมภาพันธ์ยังมียอด → ห้ามลบ
   let cmsg=''; window.confirm=m=>{ cmsg=m; return false; }; removeMonthAt(1); window.confirm=()=>true; out.blockBal=db[currentDate].months[1]==='กุมภาพันธ์'&&/45,000/.test(cmsg)&&/ทรัพย์หลุด/.test(cmsg)&&!db[currentDate].forfeit;
   // มีรายการวันนี้ → ห้ามลบ (ใส่แถวว่างยอดแต่มีประเภท)
   const d=db[currentDate]; d.data['มกราคม'][0]={type:'ถ',ticket:'',book:'',amount:'',count:'',origIdx:0,timestamp:''};
   window.__al=[]; removeMonthAt(0); out.blockRow=window.__al.length===1&&d.months[0]==='มกราคม';
   d.data['มกราคม'][0]={type:'',ticket:'',book:'',amount:'',count:'',origIdx:0,timestamp:''};
   // ตอบไม่ใช่ → ไม่ลบ
   window.confirm=()=>false; removeMonthAt(0); out.cancel=d.months[0]==='มกราคม'; window.confirm=()=>true;
   // ลบมกราคม
   removeMonthAt(0); const x=db[currentDate];
   out.after={m:x.months.slice(0,4).join(','),bf:x.bf.slice(0,4).join(','),bc:x.bfCount.slice(0,4).join(','),lens:[x.months.length,x.bf.length,x.bfCount.length,x.customTotals.length,x.customCarried.length].join(','),jan:!!x.data['มกราคม']};
   // วันถัดไป
   x.data['มีนาคม'][0]={type:'ถ',ticket:'301',book:'1',amount:4000,count:'',origIdx:0,timestamp:''}; saveDB();
   currentDate='2026-11-18'; const c=getCurrentDayData(); c.months=x.months.slice(); c.bf=c.months.map(()=>0); c.bfCount=c.months.map(()=>0); c.months.forEach(m=>{ if(m) c.data[m]=c.data[m]||[]; }); syncBroughtForwardForDate('2026-11-18',true);
   out.next=c.bf.slice(0,4).join(',')+' / '+c.bfCount.slice(0,4).join(',');
   // วันที่ปิดยอด → ต้องถาม PIN (ไม่ใส่ PIN)
   currentDate='2026-11-17'; db['2026-11-17'].closing={closed:true}; let asked=0; const o=window.__askUnlock; window.__askUnlock=function(){ asked++; return Promise.resolve(false); };
   const before=db['2026-11-17'].months.join(','); removeMonthAt(3); out.lock=asked===1&&db['2026-11-17'].months.join(',')===before; window.__askUnlock=o;
   return out; }));
 console.log(JSON.stringify(r));
 ok(r.btn===r.cols&&r.btn>=5,'2 มีปุ่ม ✕ ทุกคอลัมน์เดือน ('+r.btn+')');
 ok(r.blockBal,'3 เดือนที่ยังมียอด → ถามว่าจะตัดเป็นทรัพย์หลุดทั้งเดือนไหม (แสดงยอด) · ตอบไม่ → ไม่ทำอะไร');
 ok(r.blockRow,'4 เดือนที่มีรายการวันนี้ → ลบไม่ได้');
 ok(r.cancel,'5 ตอบ "ไม่" → ไม่ลบ');
 ok(r.after.m==='กุมภาพันธ์,มีนาคม,เมษายน,พฤษภาคม'&&r.after.bf==='45000,40000,30000,20000'&&r.after.bc==='4,4,3,2'&&!r.after.jan,'6 ลบมกราคม → เดือนเลื่อนซ้าย ยอดยกมาตามไปถูกคอลัมน์');
 ok(new Set(r.after.lens.split(',')).size===1,'7 ช่องยกมา/จำนวน/ยอดเอง ยาวเท่ากันทุกชุด ('+r.after.lens+')');
 ok(r.next==='45000,36000,30000,20000 / 4,3,3,2','8 วันถัดไปยกยอดต่อถูก');
 ok(r.lock,'9 วันที่ปิดยอดแล้ว → ถาม PIN ก่อน ไม่ลบ');
 // ---- ตัดทรัพย์หลุดทั้งเดือน (ยังมียอด) ----
 const f=await run(NEW,async pg=>pg.evaluate(()=>{ const out={}, S='สรุปประจำวัน', A='2026-11-16', B='2026-11-17', C='2026-11-18';
   const sumCarry=k=>db[k].months.filter(Boolean).reduce((t,m)=>({a:roundMoney(t.a+getMonthCarriedBalance(k,m)),c:t.c+getMonthCarriedCount(k,m)}),{a:0,c:0});
   const open=k=>{ currentDate=k; syncBroughtForwardForDate(k,false); renderTable(); };
   open(A); open(B); const ymB0=db[B].data[S][0]; out.ymB0=ymB0.amount+'/'+ymB0.count; const balA=db[A].data[S][3]; out.balA=balA.amount+'/'+balA.count;
   removeMonthAt(1);   // กุมภาพันธ์ 45,000 / 4 ราย → ตัดหลุด
   const d=db[B]; out.months=d.months.filter(Boolean).join(','); out.ff=JSON.stringify({a:d.forfeit['กุมภาพันธ์'].a,c:d.forfeit['กุมภาพันธ์'].c});
   out.ymB=d.data[S][0].amount+'/'+d.data[S][0].count; out.balB=d.data[S][3].amount+'/'+d.data[S][3].count; const sb=sumCarry(B); out.sumB=sb.a+'/'+sb.c;
   // วันถัดไป: เดือนที่หลุดไม่ถูกดึงกลับ แม้เลือกเดือนนั้นกลับมาภายหลัง
   currentDate=C; const c=getCurrentDayData(); syncBroughtForwardForDate(C,true); renderTable(); out.cMonths=c.months.filter(Boolean).join(',');
   const sc=sumCarry(C); out.balC=c.data[S][3].amount+'/'+c.data[S][3].count; out.sumC=sc.a+'/'+sc.c;
   const ei=c.months.indexOf(''); updateMonthName(ei,'กุมภาพันธ์'); syncBroughtForwardForDate(C,true); out.reC=c.bf[ei]+'/'+c.bfCount[ei];
   // รายที่อนุมัติกลับหลังหลุด: ยอดปรับ + บนเดือนที่เลือกกลับมา → ฐาน 0 + 5,000
   applyBfAdj(ei,'5000','1','ตั๋ว 2xx อนุมัติกลับ'); renderTable(); const sc2=sumCarry(C); out.appr=c.bf[ei]+'/'+c.bfCount[ei]+' bal='+c.data[S][3].amount+' sum='+sc2.a;
   out.ck=(typeof window.__ckList==='function'?'':'NO_CKLIST')+window.__ckList().filter(x=>/ย\/ม ไม่ตรง/.test(x.t)).map(x=>x.date).join(',');
   applyBfAdj(ei,0,0,''); updateMonthName(ei,'');
   // ยกเลิกในวันเดียวกัน: เลือกเดือนกลับมา → ยอดคืน
   currentDate=B; renderTable(); const bi=db[B].months.indexOf(''); updateMonthName(bi,'กุมภาพันธ์'); renderTable();
   out.restore=db[B].bf[bi]+'/'+db[B].bfCount[bi]+' ff='+!!(db[B].forfeit&&db[B].forfeit['กุมภาพันธ์'])+' ym='+db[B].data[S][0].amount+'/'+db[B].data[S][0].count;
   out.delta=JSON.stringify(getDayOpeningDelta(B));
   return out; }));
 console.log('   ',JSON.stringify(f));
 ok(f.ymB0===f.balA,'11 ก่อนตัดหลุด ย/ม = คงเหลือวันก่อน');
 ok(f.months==='มกราคม,มีนาคม,เมษายน,พฤษภาคม'&&f.ff==='{"a":45000,"c":4}','12 ตัดหลุดกุมภาพันธ์ 45,000 / 4 ราย → คอลัมน์ออก เก็บยอดหลุดไว้');
 ok(f.ymB===(Number(f.balA.split('/')[0])-45000)+'/'+(Number(f.balA.split('/')[1])-4),'13 ย/ม = คงเหลือวันก่อน − ยอดหลุด');
 ok(f.balB===f.sumB,'14 คงเหลือ = ยกไปรวมทุกเดือน ('+f.balB+')');
 ok(f.cMonths==='มกราคม,มีนาคม,เมษายน,พฤษภาคม'&&f.balC===f.sumC,'15 วันถัดไปไม่มีเดือนที่หลุด และคงเหลือยังตรง ('+f.balC+')');
 ok(f.reC==='0/0','16 เลือกเดือนที่หลุดกลับมาในวันหลัง → ยกมา 0 (ไม่ดึงยอดก่อนหลุดกลับ) ใช้ยอดปรับ + สำหรับรายที่อนุมัติ');
 ok(f.appr==='5000/1 bal=95000 sum=95000','16a เดือนที่หลุดแล้ว อนุมัติกลับรายเดียว → ยกมา 5,000 / 1 ราย คงเหลือ = ยกไปรวม');
 ok(f.ck==='','16b ตัวตรวจความสอดคล้องไม่เตือน ย/ม (นับยอดหลุด/ยอดปรับแล้ว)'+(f.ck?' → '+f.ck:''));
 ok(f.restore==='45000/4 ff=false ym='+f.ymB0&&f.delta==='{"a":0,"c":0}','17 กดผิด → เลือกเดือนกลับมาในวันเดียวกัน ยอดคืนครบ ย/ม กลับเป็นเดิม');
 ok(!r.errs.length,'10 ไม่มี error ในหน้า '+r.errs.join('|'));
 console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
