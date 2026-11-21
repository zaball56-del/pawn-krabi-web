// ไล่บั๊ก 6 จุด (ลบข้อมูลเก่า · ตารางเขียนตั๋ว · ข้ามปี · เบิก-คืน · ส่งออก CSV)
// รัน: node tests/e2e.audit6.chrome.js   (FILE=<index.html> เทียบเวอร์ชันอื่น)
const path=require('path'); const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const FILE=process.env.FILE||path.join(__dirname,'../../index.html'); let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const pg=await (await b.newContext({viewport:{width:1366,height:900}})).newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
  await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger'); window.alert=()=>{}; });

  // 1) ลบข้อมูลเก่า: วันแรกที่เหลือ ย/ม และคงเหลือทั้งสายต้องเท่าเดิม แม้วันก่อนหน้ามี "แก้ยอดให้ตรง" หรือกรอกคงเหลือเอง
  for(const sc of ['xadj','manual']){
    const r=await pg.evaluate((sc)=>{
      Object.keys(db).forEach(k=>delete db[k]); const M='ตุลาคม', N='พฤศจิกายน';
      const mk=k=>{ currentDate=k; const d=getCurrentDayData(); d.months=[M,N,'','','','']; [M,N].forEach(m=>d.data[m]=d.data[m]||[]); return d; };
      const row=(tk,a)=>({type:'ถ',ticket:tk,book:'1',amount:a,count:'',origIdx:0,timestamp:''});
      const fin=k=>{ currentDate=k; updateSummaryColumn(); saveDB(); recalculateFutureBroughtForwardBalances(k); };
      const D=['2024-11-18','2024-11-19','2024-11-20','2024-11-21','2024-11-25'];
      let d=mk(D[0]); d.bf=[10000,20000,0,0,0,0]; d.bfCount=[2,4,0,0,0,0]; syncDailyOpeningFromMonthlyBF(D[0]); d.data[M][0]=row('601',1000); fin(D[0]);
      d=mk(D[1]); syncBroughtForwardForDate(D[1],true); d.data[N][0]=row('701',2500); fin(D[1]);
      if(sc==='manual'){ const s=db[D[1]].data['สรุปประจำวัน']; s[3].amount=+s[3].amount+300; db[D[1]].balanceManual=true; recalculateFutureBroughtForwardBalances(D[1]); }
      d=mk(D[2]); syncBroughtForwardForDate(D[2],true); d.data[M][0]=row('602',500); fin(D[2]);
      if(sc==='xadj'){ currentDate=D[2]; applyBfAdj(1,2000,0,'แก้ให้ตรง',true); }
      d=mk(D[3]); syncBroughtForwardForDate(D[3],true); d.data[N][0]=row('702',700); fin(D[3]);
      d=mk(D[4]); syncBroughtForwardForDate(D[4],true); fin(D[4]);
      const snap=()=>[D[2],D[3],D[4]].map(k=>{ const s=db[k].data['สรุปประจำวัน']; return s[0].amount+'/'+s[3].amount; }).join(' ');
      const before=snap();
      const ks=[D[0],D[1]], anc=window.__pruneAnchorPrep?window.__pruneAnchorPrep(ks):null; ks.forEach(k=>delete db[k]); if(anc) window.__pruneAnchorApply(anc); saveDB();
      [D[2],D[3],D[4]].forEach(k=>{ document.getElementById('doc-date').value=k; changeDate(); });
      recalculateFutureBroughtForwardBalances('2000-01-01');
      return {before,after:snap()};
    },sc);
    ok(r.before===r.after,'1 ลบข้อมูลเก่า ('+sc+'): ย/ม/คงเหลือหลังลบเท่าเดิม ก่อน '+r.before+' หลัง '+r.after);
  }

  // 2) ตัวค้นกลาง: ค้นเดือน พ.ย. ในวันที่ 21 พ.ย. 69 ต้องไม่ดึงตั๋วเลขเดียวกันของ พ.ย. 68
  let r=await pg.evaluate(()=>{
    Object.keys(db).forEach(k=>delete db[k]);
    const mk=(k,rows)=>{ currentDate=k; const d=getCurrentDayData(); d.months=['พฤศจิกายน','','','','','']; d.data['พฤศจิกายน']=rows; saveDB(); };
    mk('2025-11-25',[{type:'',ticket:'134',book:'205',amount:'5000',count:''}]);
    mk('2026-11-21',[]); window.__dv++;
    const a=ticketFind('134','',11,{soft:false}), bk=ticketFind('134','205',11,{soft:false});
    mk('2026-11-21',[{type:'',ticket:'134',book:'',amount:'700',count:''}]); window.__dv++;
    return {a,bk,now:ticketFind('134','',11,{soft:false})};
  });
  ok(r.a.status==='none'&&r.bk.status==='none','2 ตั๋ว 134 พ.ย. ปีก่อนไม่ถูกดึงมาเติมยอด '+JSON.stringify([r.a,r.bk]));
  ok(r.now.status==='ok'&&r.now.amount==='700','3 ตั๋ว 134 พ.ย. ปีนี้ยังหาเจอตามปกติ '+JSON.stringify(r.now));

  // 3) ตารางเขียนตั๋ว: ลบตั๋ว → เฉพาะแถวด้านล่างเลื่อนขึ้น 1 แถว แถวว่างที่เว้นไว้คงเดิม
  await pg.evaluate(()=>{ currentDate='2026-11-20'; tkwOpen(); });
  await sleep(300);
  const seed=()=>pg.evaluate(()=>{ const K='2026-11-20'; const d={m:[6,7,8,9,10,11],r:[[['','']],[['','']],[['','']],[['','']],[['','']],[['101','1000'],['',''],['',''],['104','4000'],['105','5000'],['106','6000']]]}; tkwImportAll({[K]:d},'over'); });
  const del=async(i)=>{ await pg.evaluate(i=>document.querySelector('button[data-cx="5,'+i+'"]').click(),i); await sleep(100); await pg.evaluate(()=>document.getElementById('tkw-cx-yes').click()); await sleep(200); return pg.evaluate(()=>tkwReadDay('2026-11-20').r[5].slice(0,6).map(x=>x[0]||'_').join(',')); };
  await seed(); await sleep(200); let col=await del(5);
  ok(col==='101,_,_,104,105,_','4 ลบ 106 (แถวสุดท้าย): ช่องว่างแถว 2–3 ไม่ถูกยุบ → '+col);
  await seed(); await sleep(200); col=await del(3);
  ok(col==='101,_,_,105,106,_','5 ลบ 104: 105, 106 เลื่อนขึ้น 1 แถว ช่องว่างข้างบนคงเดิม → '+col);
  r=await pg.evaluate(()=>{ const s=document.querySelector('#tkw-table select[data-m="4"]'); s.value='11'; s.dispatchEvent(new Event('change',{bubbles:true})); return tkwReadDay('2026-11-20').m.join(','); });
  ok(r==='6,7,8,9,10,11','6 เปลี่ยนคอลัมน์ ต.ค. เป็น พ.ย. ซึ่งมีอยู่แล้ว → ไม่ยอม เดือนไม่ซ้ำ ('+r+')');

  // 4) สแกนตั๋ว: "134" ซ้ำกับ "0134" ในคอลัมน์ → ไม่บันทึกซ้ำ · ตั๋วเลขเดียวกันของ พ.ย. ปีก่อน → ไม่เตือนว่าซ้ำ
  r=await pg.evaluate(async()=>{ const K='2026-11-20'; const e=[['','']];
    tkwImportAll({'2025-11-24':{m:[6,7,8,9,10,11],r:[e,e,e,e,e,[['555','900']]]}, [K]:{m:[6,7,8,9,10,11],r:[e,e,e,e,e,[['0134','1000']]]}},'over');
    tkwOpen(); await new Promise(s=>setTimeout(s,200));
    const q=id=>document.getElementById(id); q('tkw-scan-btn').click(); await new Promise(s=>setTimeout(s,150));
    q('tkw-sq-m').value='11'; q('tkw-sq-t').value='134'; q('tkw-sq-a').value='1000'; q('tkw-sq-save').click(); const m1=q('tkw-sq-msg').textContent;
    const n1=tkwReadDay(K).r[5].filter(x=>x&&x[0]).length;
    q('tkw-sq-m').value='11'; q('tkw-sq-t').value='555'; q('tkw-sq-a').value='900'; q('tkw-sq-save').click(); const m2=q('tkw-sq-msg').textContent;
    const n2=tkwReadDay(K).r[5].filter(x=>x&&x[0]).map(x=>x[0]).join(',');
    q('tkw-sq-x').click(); return {m1,n1,m2,n2}; });
  ok(/มีอยู่แล้ว/.test(r.m1)&&r.n1===1,'7 สแกน 134 ขณะมี 0134 ในเดือนเดียวกัน → ไม่บันทึกซ้ำ ('+r.m1+')');
  ok(!/เคยบันทึกแล้ว/.test(r.m2)&&r.n2==='0134,555','8 สแกน 555 พ.ย. ปีนี้ ขณะมี 555 พ.ย. ปีก่อน → บันทึกได้ไม่เตือนซ้ำ ('+r.m2+')');

  // 5) เบิก-คืน: ไถ่ถอนของปีก่อน (เล่ม+เลขเดียวกัน) ไม่ต้องเตือน
  const cu=(back)=>pg.evaluate(async(back)=>{ Object.keys(db).forEach(k=>delete db[k]);
    const old=new Date(); old.setDate(old.getDate()-back); const pad=n=>(n<10?'0':'')+n; const k=old.getFullYear()+'-'+pad(old.getMonth()+1)+'-'+pad(old.getDate());
    currentDate=k; const d=getCurrentDayData(); d.months=['มกราคม','','','','','']; d.data['มกราคม']=[{type:'ถ',ticket:'77',book:'12',amount:'100',count:''}]; saveDB();
    window.openCustodyModal(); await new Promise(s=>setTimeout(s,200)); const q=id=>document.getElementById(id);
    q('cu-ticket').value='77'; q('cu-book').value='12'; q('cu-ticket').dispatchEvent(new Event('input')); const w=q('cu-warn').textContent; q('cu-close').click(); return w; },back);
  r=await cu(300);
  ok(!/ไถ่ถอนแล้ว/.test(r),'9 เบิกทรัพย์ตั๋ว 77/12: ไถ่ถอนเมื่อ 300 วันก่อน (ปีก่อน) → ไม่เตือน ('+r+')');
  r=await cu(30); ok(/ไถ่ถอนแล้ว/.test(r),'9b ไถ่ถอนเมื่อ 30 วันก่อน → ยังเตือนตามเดิม ('+r+')');

  // 6) ส่งออก CSV: ไม่มีคำว่า undefined · " ในเลขตั๋วไม่ทำคอลัมน์เลื่อน · แถวเกินจำนวนแถวตารางออกด้วย
  r=await pg.evaluate(()=>{ Object.keys(db).forEach(k=>delete db[k]); currentDate='2026-11-20'; const d=getCurrentDayData(); d.months=['ตุลาคม','','','','',''];
    d.data['ตุลาคม']=Array.from({length:d.totalRows},(_,i)=>({type:'',ticket:'',amount:'',count:'',origIdx:i,timestamp:''}));
    d.data['ตุลาคม'][0]={ticket:'124',amount:'200'}; d.data['ตุลาคม'][1]={type:'ถ',ticket:'7"8',amount:'300'}; d.data['ตุลาคม'][d.totalRows]={type:'ถ',ticket:'999',amount:'50'}; saveDB();
    let out=''; const OB=window.Blob; window.Blob=function(p,o){ out=p.join(''); return new OB(p,o); }; exportToExcel(); window.Blob=OB;
    const L=out.split('\n'); return {undef:/undefined/.test(out), cols:L.slice(0,-1).map(l=>(l.match(/("(?:[^"]|"")*")(?=,|$)/g)||[]).length), hid:L.some(l=>/"999"/.test(l))}; });
  ok(!r.undef,'10 CSV ไม่มีคำว่า undefined');
  ok(new Set(r.cols).size===1,'11 CSV ทุกบรรทัดมีจำนวนคอลัมน์เท่ากัน (เลขตั๋วมี " ) '+[...new Set(r.cols)]);
  ok(r.hid,'12 CSV มีแถวที่อยู่เกินจำนวนแถวตาราง (ยอดรวมนับอยู่แล้ว)');
  ok(!pg.errs.length,'13 ไม่มี error '+pg.errs.join('|'));
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0); })();
