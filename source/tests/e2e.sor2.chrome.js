// ทดสอบนำเข้า สธ.2 (ทะเบียนรับจำนำ): เติมตั๋วเดิม/ใหม่ · ตั๋วใหม่เข้าเดือนปัจจุบัน · สรุปประจำวัน · คงเหลือ = ยกไปรวม · นำเข้าย้อนหลัง · กล่องยืนยันถูกบล็อก
// รัน: node tests/e2e.sor2.chrome.js   (FILE=<index.html> เทียบเวอร์ชันอื่น)
const path=require('path'); const {chromium}=require('playwright');
const FILE=process.env.FILE||path.join(__dirname,'../../index.html'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
const SEED=()=>{ Object.keys(db).forEach(k=>delete db[k]); const M=['สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน'];
  const mk=(k,i)=>{ currentDate=k; const d=getCurrentDayData(); d.months=M.concat(['','']); if(i===0){ d.bf=[40000,50000,60000,30000,0,0]; d.bfCount=[4,5,6,3,0,0]; }
    M.forEach(m=>d.data[m]=d.data[m]||[]); saveDB(); syncBroughtForwardForDate(k,i>0); return d; };
  const a=mk('2026-11-18',0); a.data['ตุลาคม'][0]={type:'ถ',ticket:'301',book:'10',amount:'1000',count:'',origIdx:0,timestamp:''}; saveDB(); currentDate='2026-11-18'; renderTable();
  const b=mk('2026-11-19',1);
  b.data['สิงหาคม'][0]={type:'',ticket:'801',book:'11',amount:'2000.10',count:'',origIdx:0,timestamp:''};   // ต่อตั๋ว → ตั๋วใหม่ 9001
  b.data['กันยายน'][0]={type:'',ticket:'902',book:'12',amount:'3000.20',count:'',origIdx:0,timestamp:''};   // ต่อตั๋ว (ส) → ตั๋วใหม่ 9002
  b.data['ตุลาคม'][0]={type:'',ticket:'303',book:'13',amount:'500',count:'',origIdx:0,timestamp:''};      // ไถ่ปกติ ไม่อยู่ใน สธ.2 → เติม ถ
  saveDB(); currentDate='2026-11-19'; renderTable();
  mk('2026-11-20',1); currentDate='2026-11-20'; renderTable(); };
const P={date:'2026-11-19',total:{n:4,amt:0.1+0.2+1200.3+2500.4+3100.5},month:null,goldBuy:null,goldSell:null,rows:[
  {type:'ถ',oldT:'801',oldM:8,ticket:'9001',book:'230',weight:'2.5',amount:2500.4},
  {type:'ส',oldT:'902',oldM:9,ticket:'9002',book:'230',weight:'3',amount:3100.5},
  {type:'',oldT:'',oldM:0,ticket:'9003',book:'230',weight:'1',amount:1200.3},
  {type:'',oldT:'',oldM:0,ticket:'9004',book:'230',weight:'0.1',amount:0.3}]};
P.total.amt=P.rows.reduce((s,r)=>s+r.amount,0);
async function page(b,blocked){ const pg=await (await b.newContext()).newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,150)));
  if(blocked) pg.on('dialog',d=>d.dismiss()); else pg.on('dialog',d=>d.accept());
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
  await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger'); });
  await pg.evaluate(SEED); return pg; }
async function answer(pg){ for(let i=0;i<6;i++){ let t=''; for(let w=0;w<15;w++){ await sleep(150); t=await pg.evaluate(()=>{ const l=document.getElementById('ui-dialog'); return l&&l.style.display!=='none'?'y':''; }); if(t) break; } if(!t) break;
  const bt=await pg.$('#ui-dialog button:has-text("ยืนยัน"), #ui-dialog button:has-text("ตกลง")'); await bt.click(); } await sleep(300); }
const CHECK=([dk])=>{ const S='สรุปประจำวัน', n=v=>Number(String(v==null?'':v).replace(/,/g,''))||0, out={};
  const d=db[dk]; const row=(m,t)=>(d.data[m]||[]).find(x=>x&&x.ticket===t)||{};
  out.r801=['type','newTicket','newBook','newAmount'].map(f=>row('สิงหาคม','801')[f]).join('/'); out.r902=['type','newTicket'].map(f=>row('กันยายน','902')[f]).join('/'); out.r303=row('ตุลาคม','303').type;
  out.s1=d.data[S][1].count+'/'+d.data[S][1].amount; out.sor2=d.sor2&&(d.sor2.mn+' '+d.sor2.n+' '+d.sor2.amt);
  const sum=k=>db[k].months.filter(Boolean).reduce((t,m)=>({a:roundMoney(t.a+getMonthCarriedBalance(k,m)),c:t.c+getMonthCarriedCount(k,m)}),{a:0,c:0});
  out.nov=getMonthCarriedBalance(dk,'พฤศจิกายน')+'/'+getMonthCarriedCount(dk,'พฤศจิกายน');
  ['2026-11-19','2026-11-20'].forEach(k=>{ const s=db[k].data[S], c=sum(k); out['bal'+k.slice(-2)]=n(s[3].amount)+'/'+n(s[3].count); out['sum'+k.slice(-2)]=c.a+'/'+c.c; out['ym'+k.slice(-2)]=n(s[0].amount)+'/'+n(s[0].count); });
  out.s1raw=String(d.data[S][1].amount); out.ps=!!d.pledgeSor2; if(typeof updateSummaryColumn==='function'&&typeof currentDate!=='undefined'&&currentDate===dk){ updateSummaryColumn(); out.s1after=d.data[S][1].count+'/'+d.data[S][1].amount; } else out.s1after=out.s1; return out; };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const mode of ['ปัจจุบัน','ย้อนหลัง','บล็อก']){
    const pg=await page(b,mode==='บล็อก');
    await pg.evaluate(([P,mode])=>{ currentDate=mode==='ย้อนหลัง'?'2026-11-20':'2026-11-19'; renderTable(); openSor2Modal(); window.__sor2.test(P,'2026-11-19'); const al=document.getElementById('s2-alert'); if(al) al.classList.remove('on'); },[P,mode]);
    await pg.evaluate(()=>sor2Commit()); if(mode==='บล็อก') await answer(pg); await sleep(300);
    /* เปิดวันถัดไปแบบที่ผู้ใช้ทำ (ไม่ได้เปิดวันที่นำเข้า) */
    await pg.evaluate(()=>{ currentDate='2026-11-20'; syncBroughtForwardForDate('2026-11-20',false); renderTable(); });
    const r=await pg.evaluate(CHECK,['2026-11-19']); console.log('   ',mode,JSON.stringify(r));
    ok(r.r801==='ถ/9001/230/2500.4'&&r.r902==='ส/9002'&&r.r303==='ถ','['+mode+'] เติมตั๋วเดิม (ประเภท/ตั๋วใหม่/เล่ม/ยอด) และเติม ถ ให้แถวที่ว่าง');
    ok(r.sor2&&r.sor2.startsWith('พฤศจิกายน 4 '),'['+mode+'] ตั๋วใหม่ 4 ราย เข้าเดือนพฤศจิกายน');
    ok(r.s1==='4/6801.5','['+mode+'] สรุปประจำวัน "รับจำนำ" = 4 ราย / 6,801.50 (ไม่มีเศษทศนิยมเพี้ยน: '+r.s1raw+')');
    ok(r.ps&&r.s1after==='4/6801.5','['+mode+'] นำเข้า สธ.2 แล้วยึดยอด สธ.2 (ไม่บวกตั๋วใหม่ซ้ำหลังคำนวณสรุปใหม่: '+r.s1after+')');
    ok(r.bal19===r.sum19,'['+mode+'] วันที่นำเข้า: คงเหลือ = ยกไปรวม ('+r.bal19+' vs '+r.sum19+')');
    ok(r.ym20===r.bal19&&r.bal20===r.sum20,'['+mode+'] วันถัดไป: ย/ม = คงเหลือวันนำเข้า และคงเหลือ = ยกไปรวม (ย/ม '+r.ym20+' · คงเหลือ '+r.bal20+' vs '+r.sum20+')');
    ok(!pg.errs.length,'['+mode+'] ไม่มี error '+pg.errs.join('|')); await pg.close(); }
  { // นำเข้าซ้ำวันเดิม → ยอดเท่าเดิม ไม่บวกซ้ำ
    const pg=await page(b,false);
    for(let i=0;i<2;i++){ await pg.evaluate(P=>{ currentDate='2026-11-19'; renderTable(); openSor2Modal(); window.__sor2.test(P,'2026-11-19'); const al=document.getElementById('s2-alert'); if(al) al.classList.remove('on'); },P); await pg.evaluate(()=>sor2Commit()); await sleep(300); }
    const r=await pg.evaluate(CHECK,['2026-11-19']);
    ok(r.s1==='4/6801.5'&&r.nov==='36801.5/7'&&r.bal19===r.sum19,'[นำเข้าซ้ำ] รับจำนำ/เดือนพฤศจิกายน/คงเหลือ เท่ากับนำเข้าครั้งเดียว ('+r.s1+' · '+r.nov+' · '+r.bal19+')');
    // วันที่ปิดยอดแล้ว → ถาม PIN ไม่บันทึก
    const lk=await pg.evaluate(P=>{ db['2026-11-19'].closing={closed:true}; let asked=0; const o=window.__askUnlock; window.__askUnlock=function(){ asked++; return Promise.resolve(false); };
      const before=JSON.stringify(db['2026-11-19'].sor2); window.__sor2.test(Object.assign({},P,{rows:P.rows.slice(0,2)}),'2026-11-19'); const al=document.getElementById('s2-alert'); if(al) al.classList.remove('on'); sor2Commit();
      const r={asked,same:JSON.stringify(db['2026-11-19'].sor2)===before}; window.__askUnlock=o; delete db['2026-11-19'].closing; return r; },P);
    ok(lk.asked===1&&lk.same,'[ปิดยอดแล้ว] นำเข้า สธ.2 ทับวันที่ปิดยอด → ถาม PIN ก่อน ไม่บันทึก');
    ok(!pg.errs.length,'[นำเข้าซ้ำ] ไม่มี error '+pg.errs.join('|')); await pg.close(); }
  { // ต้นเดือน: ยังไม่มีคอลัมน์ "ธันวาคม" → เตือน + เพิ่มคอลัมน์ให้ (ติ๊กไว้) / ไม่เพิ่ม (เอาติ๊กออก)
    for(const tick of [true,false]){
      const pg=await page(b,false);
      const r=await pg.evaluate(tick=>{ const K1='2026-11-30', K='2026-12-01', S='สรุปประจำวัน'; Object.keys(db).forEach(k=>delete db[k]);
        currentDate=K1; let p=getCurrentDayData(); p.months=['ตุลาคม','พฤศจิกายน','','','','']; p.bf=[60000,30000,0,0,0,0]; p.bfCount=[6,3,0,0,0,0]; p.data['ตุลาคม']=[{type:'ถ',ticket:'1',book:'1',amount:'100',count:'',origIdx:0,timestamp:''}]; p.data['พฤศจิกายน']=[]; saveDB(); syncBroughtForwardForDate(K1,false); renderTable();
        currentDate=K; const d=getCurrentDayData(); syncBroughtForwardForDate(K,false); renderTable();
        openSor2Modal(); window.__sor2.test({date:K,total:{n:1,amt:5000},month:null,rows:[{type:'',oldT:'',oldM:0,ticket:'9100',book:'240',weight:'1',amount:5000}]},K);
        const warn=/ยังไม่มีคอลัมน์เดือนธันวาคม/.test(document.getElementById('s2-sum').textContent);
        if(!tick){ const c=document.getElementById('s2-addcol'); c.checked=false; c.dispatchEvent(new Event('change')); }
        const al=document.getElementById('s2-alert'); if(al) al.classList.remove('on'); sor2Commit(); renderTable();
        const sum=db[K].months.filter(Boolean).reduce((t,m)=>roundMoney(t+getMonthCarriedBalance(K,m)),0);
        return {warn,cols:db[K].months.filter(Boolean).join(','),dec:db[K].months.includes('ธันวาคม')?getMonthCarriedBalance(K,'ธันวาคม')+'/'+getMonthCarriedCount(K,'ธันวาคม'):'-',bal:Number(db[K].data[S][3].amount),sum}; },tick);
      console.log('   ',JSON.stringify(r));
      if(tick) ok(r.warn&&r.cols==='ตุลาคม,พฤศจิกายน,ธันวาคม'&&r.dec==='5000/1'&&r.bal===r.sum,'[ต้นเดือน] เตือน + เพิ่มคอลัมน์ธันวาคม (ยกมา 0 + ตั๋วใหม่ 5,000) · คงเหลือ = ยกไปรวม ('+r.bal+')');
      else ok(r.cols==='ตุลาคม,พฤศจิกายน','[ต้นเดือน] เอาติ๊กออก → ไม่เพิ่มคอลัมน์');
      ok(!pg.errs.length,'[ต้นเดือน] ไม่มี error '+pg.errs.join('|')); await pg.close(); } }
  await b.close(); console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})();
