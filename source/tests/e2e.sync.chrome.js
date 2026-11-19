// ทดสอบในแอปจริง (Chrome ออฟไลน์ + Firebase จำลองในหน้า) · ไม่ใส่ PIN ใด ๆ
// - สมุดบัญชี: แก้ตอนออฟไลน์ → ปิดเว็บ → อีกเครื่องแก้วันเดียวกัน → เปิดใหม่ต้องรวมทีละแถว (ไม่ทิ้งของฝั่งใด)
// - พื้นที่เต็ม: สมุดบัญชีย้ายไป IndexedDB แล้วลบสำเนาเก่าใน localStorage · เขียนตั๋วรอดการรีเฟรชผ่าน IndexedDB
// build ก่อน: python3 tools/build.py ../index.html   รัน: NODE_PATH=<node_modules ที่มี playwright> node tests/e2e.sync.chrome.js
const path=require('path'); const {chromium}=require('playwright');
const URL='file://'+path.join(__dirname,'../../index.html'); const M='พฤศจิกายน';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
const d=new Date(); const p2=n=>String(n).padStart(2,'0'); const K=`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const FLD='d'+K.replace(/-/g,''), WID='w'+Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5/7);

/* Firebase จำลอง (ทำงานในหน้า) · window.__srv.docs = ข้อมูลบนเซิร์ฟเวอร์ · window.__online = ต่อเน็ตไหม */
function fakeFirebase(initDocs){
  const DEL={__del:1}; const docs=JSON.parse(initDocs||'{}'); const subs=[];
  window.__online=true; Object.defineProperty(navigator,'onLine',{get:()=>window.__online});
  const colOf=(c)=>docs[c]=docs[c]||{};
  const D=(c,id)=>({id,exists:!!colOf(c)[id],data:()=>Object.assign({},colOf(c)[id]||{})});
  const snap=(c,ids,filter)=>({docs:Object.keys(colOf(c)).filter(filter||(()=>true)).map(id=>D(c,id)),metadata:{fromCache:false},docChanges:()=>(ids||Object.keys(colOf(c))).map(id=>({type:colOf(c)[id]?'modified':'removed',doc:D(c,id)}))});
  const write=(c,id,o,merge)=>{ if(c==='backup'&&colOf(c)[id]) throw {code:'permission-denied'};   /* กฎ: backup เพิ่มได้อย่างเดียว */ const cur=merge?Object.assign({},colOf(c)[id]||{}):{}; Object.keys(o).forEach(f=>{ if(o[f]===DEL) delete cur[f]; else cur[f]=o[f]; }); colOf(c)[id]=cur; subs.filter(s=>s.c===c).forEach(s=>setTimeout(()=>s.cb(snap(c,[id])),5)); };
  function col(c){ const q={
      _fs:[], _desc:false, _lim:0,
      where(fp,op,v){ const q=Object.assign(col(c),{_fs:this._fs.concat([id=>op==='>='?id>=v:op==='<'?id<v:op==='<='?id<=v:true]),_desc:this._desc,_lim:this._lim}); q._f=id=>q._fs.every(f=>f(id)); return q; },
      orderBy(fp,dir){ if(dir==='desc') this._needIndex=true; this._desc=dir==='desc'; return this; },   /* ของจริง: desc บน __name__ ต้องสร้างดัชนี */ limit(n){ this._lim=n; return this; },
      onSnapshot(a,b){ const cb=typeof a==='function'?a:b; const f=this._f; subs.push({c,cb}); setTimeout(()=>cb(snap(c,null,f)),5); return ()=>{}; },
      get(){ if(!window.__online) return Promise.reject({code:'unavailable'}); if(this._needIndex) return Promise.reject({code:'failed-precondition'}); const s=snap(c,null,this._f); s.docs.sort((x,y)=>x.id<y.id?-1:1); if(this._desc) s.docs.reverse(); if(this._lim) s.docs=s.docs.slice(0,this._lim); return Promise.resolve(s); },
      doc:id=>({id,_c:c,get:()=>window.__online?Promise.resolve(D(c,id)):Promise.reject({code:'unavailable'}),set:(o,opt)=>{ if(!window.__online) return Promise.reject({code:'unavailable'}); try{ write(c,id,JSON.parse(JSON.stringify(o)),opt&&opt.merge); }catch(e){ return Promise.reject(e); } return Promise.resolve(); },delete:()=>{ delete colOf(c)[id]; return Promise.resolve(); },
        onSnapshot(a,b){ const cb=typeof a==='function'?a:b; subs.push({c,cb:s=>cb(D(c,id))}); setTimeout(()=>cb(D(c,id)),5); return ()=>{}; }}) }; return q; }
  const fs={collection:col,enablePersistence:()=>Promise.resolve(),settings(){},
    runTransaction:async fn=>{ if(!window.__online) throw {code:'unavailable'}; const pend=[]; await fn({get:async r=>D(r._c,r.id),set:(r,o,opt)=>pend.push([r._c,r.id,o,opt&&opt.merge])}); pend.forEach(x=>write(...x)); }};
  const user={uid:'u',email:'test@example.test'};
  const fb={apps:[],initializeApp(){ fb.apps.push({}); },firestore:()=>fs,auth:()=>({currentUser:user,onAuthStateChanged:cb=>setTimeout(()=>cb(user),10),signInWithEmailAndPassword:()=>Promise.resolve()})};
  fb.firestore.FieldValue={delete:()=>DEL,serverTimestamp:()=>new Date().toISOString()}; fb.firestore.FieldPath={documentId:()=>'__id'};
  Object.defineProperty(window,'firebase',{get:()=>fb,set(){},configurable:true});
  window.__srv={docs};
}
function shiftDays(n){ const RD=Date, off=n*864e5; window.Date=class extends RD{ constructor(...a){ a.length?super(...a):super(RD.now()+off); } static now(){ return RD.now()+off; } }; }
async function open(ctx,initDocs,extra){
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,160)));
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
  await pg.addInitScript(fakeFirebase,initDocs||'{}'); if(extra) await pg.addInitScript(extra);
  await pg.goto(URL,{waitUntil:'domcontentloaded'}); await sleep(3000);
  await pg.evaluate(()=>{ document.querySelectorAll('#login-modal,#fb-auth').forEach(e=>e.style.display='none'); });
  pg.errs=errs; return pg;
}
const tickets=pg=>pg.evaluate(([K,M])=>((db[K]&&db[K].data[M])||[]).map(r=>r&&r.ticket).filter(Boolean).sort().join(','),[K,M]);
const srvTickets=(docs)=>{ const j=((docs.ledger||{})[WID]||{})[FLD]; if(!j) return ''; return JSON.parse(j).data[M].map(r=>r&&r.ticket).filter(Boolean).sort().join(','); };

(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  { /* 1) สมุดบัญชี: รวมทีละแถวตอนเปิดเว็บ */
    const ctx=await b.newContext(); let pg=await open(ctx);
    await pg.evaluate(([K,M])=>{ db[K]={months:[M],bf:[0],bfCount:[0],data:{[M]:[{type:'ส',ticket:'1110',book:'243',amount:100000,count:'',timestamp:'10:00:00',origIdx:0}],'สรุปประจำวัน':[]}}; currentDate=K; saveDB(); },[K,M]);
    await sleep(2500); let srv=await pg.evaluate(()=>JSON.stringify(window.__srv.docs));
    ok(srvTickets(JSON.parse(srv))==='1110','1.0 ส่งวันนี้ขึ้นคลาวด์ (1110) '+srvTickets(JSON.parse(srv)));
    await pg.evaluate(([K,M])=>{ window.__online=false; const a=db[K].data[M]; a[1]={type:'ถ',ticket:'2222',book:'243',amount:700,count:'',timestamp:'11:00:00',origIdx:1}; saveDB(); },[K,M]);
    await sleep(2500);
    const pb=await pg.evaluate(K=>{ try{ return !!JSON.parse(localStorage.getItem('pawn_krabi_fb_base')||'{}')[K]; }catch(e){ return false; } },K);
    ok(pb,'1.1 ออฟไลน์: เก็บฐานของวันที่แก้ค้างไว้ในเครื่อง');
    await pg.close();
    /* อีกเครื่องเพิ่มตั๋ว 3333 ลงแถวเดียวกัน (แถว 2) ระหว่างนั้น */
    const s2=JSON.parse(srv); const day=JSON.parse(s2.ledger[WID][FLD]); const arr=day.data[M]; arr[1]={type:'ถ',ticket:'3333',book:'243',amount:900,count:'',timestamp:'11:05:00',origIdx:1}; s2.ledger[WID][FLD]=JSON.stringify(day);
    pg=await open(ctx,JSON.stringify(s2)); await sleep(2500);
    ok((await tickets(pg))==='1110,2222,3333','1.2 เปิดใหม่: มีทั้งของเครื่องนี้ (2222) และอีกเครื่อง (3333) ('+(await tickets(pg))+')');
    const after=await pg.evaluate(()=>JSON.stringify(window.__srv.docs));
    ok(srvTickets(JSON.parse(after))==='1110,2222,3333','1.3 คลาวด์ได้ฉบับรวมครบ 3 ใบ ('+srvTickets(JSON.parse(after))+')');
    ok(await pg.evaluate(K=>!JSON.parse(localStorage.getItem('pawn_krabi_fb_base')||'{}')[K],K),'1.4 ส่งสำเร็จแล้วล้างฐานที่เก็บไว้');
    ok(!pg.errs.length,'1.5 ไม่มี error '+pg.errs.join(' | '));
    await ctx.close(); }

  { /* 2) พื้นที่ localStorage เต็ม */
    const ctx=await b.newContext(); let pg=await open(ctx);
    await pg.evaluate(([K,M])=>{ db[K]={months:[M],bf:[0],bfCount:[0],data:{[M]:[{type:'ส',ticket:'1110',book:'243',amount:100000,count:'',timestamp:'10:00:00',origIdx:0}],'สรุปประจำวัน':[]}}; saveDB(); },[K,M]); await sleep(800);
    ok(await pg.evaluate(()=>!!localStorage.getItem('pawn_krabi_master_db')),'2.0 ตอนพื้นที่พอ: สมุดบัญชีอยู่ใน localStorage');
    await pg.evaluate(()=>{ const o=Storage.prototype.setItem; Storage.prototype.setItem=function(k,v){ if(k==='pawn_krabi_master_db'||k==='pawn_tkw_v1'){ const e=new Error('quota'); e.name='QuotaExceededError'; throw e; } return o.apply(this,arguments); }; });
    await pg.evaluate(([K,M])=>{ db[K].data[M][1]={type:'ถ',ticket:'2222',book:'243',amount:700,count:'',timestamp:'11:00:00',origIdx:1}; saveDB();
      tkwImportS3(K,[{month:11,ticket:'9001',book:'12',amount:500}]); },[K,M]); await sleep(1500);
    ok(await pg.evaluate(()=>localStorage.getItem('pawn_krabi_master_db')===null),'2.1 พื้นที่เต็ม: ย้ายไป IndexedDB แล้วลบสำเนาเก่าใน localStorage (คืนพื้นที่)');
    await sleep(1500); const srvB=await pg.evaluate(()=>{ const o=JSON.parse(JSON.stringify(window.__srv.docs)); delete o.tkw; return JSON.stringify(o); });   /* ตัดเขียนตั๋วบนคลาวด์ออก เพื่อพิสูจน์ว่ากลับมาจาก IndexedDB จริง */ await pg.close();
    pg=await open(ctx,srvB,()=>{ const o=Storage.prototype.setItem; Storage.prototype.setItem=function(k,v){ if(k==='pawn_krabi_master_db'||k==='pawn_tkw_v1'){ const e=new Error('quota'); e.name='QuotaExceededError'; throw e; } return o.apply(this,arguments); }; });
    await sleep(500);
    ok((await tickets(pg))==='1110,2222','2.2 รีเฟรช: สมุดบัญชีกลับมาครบจาก IndexedDB ('+(await tickets(pg))+')');
    const tk=await pg.evaluate(K=>{ const d=tkwReadDay(K); const o=[]; (d&&d.r||[]).forEach(c=>c.forEach(x=>{ if(x&&String(x[0]).trim()) o.push(x[0]); })); return o.join(','); },K);
    ok(tk==='9001','2.3 รีเฟรช: ตารางเขียนตั๋วกลับมาจาก IndexedDB แม้ localStorage เต็ม ('+tk+')');
    ok(!pg.errs.length,'2.4 ไม่มี error '+pg.errs.join(' | '));
    await ctx.close(); }

  { /* 3) การ์ดดูสำเนาที่ชน ในหน้าตั้งค่า/ข้อมูล */
    const ctx=await b.newContext({viewport:{width:1100,height:900}}); const pg=await open(ctx);
    await pg.evaluate(()=>{ localStorage.setItem('pawn_sync_conflicts',JSON.stringify([{kind:'live',k:'2026-11-18',at:new Date().toISOString(),notes:['เดือนพฤศจิกายน แถว 12'],remote:'{"x":1}'},{kind:'tkw-startup-local',k:'2026-11-17',at:new Date(Date.now()-864e5).toISOString(),notes:['ไม่รู้ฉบับซิงก์ล่าสุด'],remote:'{"m":[]}'}])); });
    const has=await pg.evaluate(()=>typeof openDataSettings==='function'); if(has){ await pg.evaluate(()=>openDataSettings()); await sleep(1500); }
    const card=await pg.evaluate(()=>{ const c=document.getElementById('sc-card'); return c?c.innerText:''; });
    ok(/18\/11\/2569/.test(card)&&/17\/11\/2569/.test(card)&&/ดาวน์โหลด/.test(card),'3.0 หน้าตั้งค่า/ข้อมูลแสดงรายการสำเนาที่ชน 2 รายการ');
    const el=await pg.$('#sc-card'); if(el){ await el.scrollIntoViewIfNeeded(); await sleep(300); await el.screenshot({path:path.join(__dirname,'../../../sync-conflicts-card.png')}); }
    await ctx.close(); }
  { /* 4) สำรองบนคลาวด์: วันละครั้ง คัดลอกเฉพาะที่เปลี่ยน · แก้/ลบสำเนาไม่ได้ · กู้คืนเป็นไฟล์นำเข้า */
    const ctx=await b.newContext(); let pg=await open(ctx,null,'window.__cbDelay=99999999;');
    await pg.evaluate(([K,M])=>{ db[K]={months:[M],bf:[0],bfCount:[0],data:{[M]:[{type:'ส',ticket:'1110',book:'243',amount:100000,count:'',timestamp:'10:00:00',origIdx:0}],'สรุปประจำวัน':[]}}; saveDB(); tkwImportS3(K,[{month:11,ticket:'9001',book:'12',amount:500}]); },[K,M]);
    await pg.evaluate(()=>tkwEnsure(3000)); await sleep(5000);
    const r1=await pg.evaluate(()=>window.__cloudBackup.run(true));
    const s1=await pg.evaluate(()=>JSON.parse(JSON.stringify(window.__srv.docs)));
    const bk1=Object.keys(s1.backup||{}), d1=K.replace(/-/g,'');
    ok(r1.done==='new'&&bk1.includes('m'+d1)&&bk1.filter(x=>x[0]==='b').length===r1.docs&&r1.docs>=2,'4.0 สำรองครั้งแรก: คัดลอกทุกเอกสาร (ledger+tkw) + บันทึกประจำวัน ('+bk1.join(',')+')');
    const r2=await pg.evaluate(()=>window.__cloudBackup.run(true));
    ok(r2.done==='exists'&&Object.keys((await pg.evaluate(()=>window.__srv.docs)).backup).length===bk1.length,'4.1 กดซ้ำวันเดียวกัน: ไม่สำรองซ้ำ');
    const prot=await pg.evaluate(id=>firebase.firestore().collection('backup').doc(id).set({x:1}).then(()=>'wrote',e=>e.code),bk1.find(x=>x[0]==='b'));
    ok(prot==='permission-denied','4.2 เขียนทับสำเนาเดิมไม่ได้ (เพิ่มได้อย่างเดียว)');
    const srv=JSON.stringify(s1); await pg.close();
    /* วันถัดไป: แก้เฉพาะสมุดบัญชี → สำรองควรคัดลอกเฉพาะเอกสาร ledger ที่เปลี่ยน */
    pg=await open(ctx,srv,'('+shiftDays.toString()+')(1); window.__cbDelay=99999999;'); await sleep(1000);
    await pg.evaluate(([K,M])=>{ db[K].data[M][1]={type:'ถ',ticket:'2222',book:'243',amount:700,count:'',timestamp:'11:00:00',origIdx:1}; saveDB(); },[K,M]); await sleep(3000);
    const r3=await pg.evaluate(()=>window.__cloudBackup.run(true));
    ok(r3.done==='new'&&r3.wrote===1,'4.3 วันถัดไป: คัดลอกเฉพาะเอกสารที่เปลี่ยน (wrote='+r3.wrote+' จาก '+r3.docs+')');
    const list=await pg.evaluate(()=>window.__cloudBackup.list(10));
    ok(list.length===2,'4.4 รายการสำรองมี 2 วัน ('+list.map(x=>x.day).join(',')+')');
    const f=await pg.evaluate(day=>window.__cloudBackup.build(day).then(x=>x.text),list[0].day);
    const fo=JSON.parse(f); const t=(fo[K]&&fo[K].data[M]||[]).map(r=>r&&r.ticket).filter(Boolean).sort().join(',');
    ok(t==='1110,2222'&&fo._extra&&fo._extra.tkw&&fo._extra.tkw[K],'4.5 กู้คืนวันล่าสุด: สมุดบัญชีฉบับใหม่ + เขียนตั๋วจากสำเนาวันก่อน ('+t+')');
    const f0=JSON.parse(await pg.evaluate(day=>window.__cloudBackup.build(day).then(x=>x.text),list[1].day));
    ok((f0[K].data[M]||[]).map(r=>r&&r.ticket).filter(Boolean).join(',')==='1110','4.6 กู้คืนวันแรก: ได้ฉบับก่อนแก้ (1110)');
    /* กู้คืนผ่านการ์ด → กล่องนำเข้าเดิม */
    await pg.evaluate(()=>{ window.__msg=''; window.uiChoice=(m)=>{ window.__msg=m; return Promise.resolve(null); }; });
    if(await pg.evaluate(()=>typeof openDataSettings==='function')){ await pg.evaluate(()=>openDataSettings()); await sleep(1200);
      await pg.evaluate(()=>document.getElementById('cb-list').click()); await sleep(800);
      await pg.evaluate(()=>{ const b=document.querySelector('[data-cbi]'); b&&b.click(); }); await sleep(1500); }
    ok(/นำเข้าไฟล์ pawn-krabi-cloud-backup-/.test(await pg.evaluate(()=>window.__msg)),'4.7 ปุ่ม "นำเข้า…" ในการ์ด เปิดกล่องเลือกวิธีนำเข้าเดิม');
    ok(!pg.errs.length,'4.8 ไม่มี error '+pg.errs.join(' | '));
    await ctx.close(); }
  await b.close();
  console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})();
