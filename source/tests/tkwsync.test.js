// ทดสอบซิงก์ตารางเขียนตั๋ว (modules/tkw.html) กับ Firestore จำลองที่ใช้ร่วมกัน 2 เครื่อง
// เน้นกรณี: แก้ตอนออฟไลน์ → รีเฟรช → อีกเครื่องแก้วันเดียวกัน ต้องไม่หาย · นาฬิกาเครื่องไม่ตรงกัน
// รัน: NODE_PATH=<node_modules ที่มี jsdom> node tests/tkwsync.test.js
const fs=require('fs'),path=require('path');
const {JSDOM}=require(process.env.JSDOM||'jsdom');
const tkwSrc=fs.readFileSync(path.join(__dirname,'../modules/tkw.html'),'utf8');
/* ตัวรวมกลาง window.__syncMerge อยู่ในไฟล์ซิงก์สมุดบัญชี → ตัดเฉพาะส่วนนั้นมาใช้ */
const syncSrc=fs.readFileSync(path.join(__dirname,'../src/sync/44-firebase-sync.js.html'),'utf8');
const smSrc=syncSrc.slice(syncSrc.indexOf('var SM=window.__syncMerge='),syncSrc.indexOf('var LF=['));
const DAY='2026-11-12', F='d20261112', MON='2026-11';
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- Firestore จำลอง (ใช้ร่วมทุกเครื่อง) ---------- */
function makeServer(){
  const docs={}, subs=[];
  const D=id=>({id,data:()=>Object.assign({},docs[id])});
  const snapOf=ch=>{ const all=Object.keys(docs).map(D); return {docs:all,metadata:{fromCache:false},docChanges:()=>(ch?[ch]:Object.keys(docs)).map(id=>({type:'modified',doc:D(id)}))}; };
  const notify=id=>subs.forEach(s=>{ if(s.alive()) setTimeout(()=>{ if(s.alive()) s.cb(snapOf(id)); },5); });
  const write=(id,o)=>{ docs[id]=Object.assign({},docs[id]||{},o); notify(id); };
  return {docs,write,
    client(dev){
      const col={ onSnapshot(opt,cb){ const s={cb,alive:()=>!dev.dead}; subs.push(s); setTimeout(()=>{ if(s.alive()) cb(snapOf()); },5); return ()=>{}; },
        doc(id){ return {id,set:(o)=>{ if(!dev.online) return Promise.reject({code:'unavailable'}); write(id,o); return Promise.resolve(); }}; } };
      const fsx={ collection:()=>col,
        runTransaction:async fn=>{ if(!dev.online) throw {code:'unavailable'}; const pend=[];
          await fn({ get:async ref=>({exists:!!docs[ref.id],data:()=>Object.assign({},docs[ref.id]||{})}), set:(ref,o)=>pend.push([ref.id,o]) });
          pend.forEach(([id,o])=>write(id,o)); } };
      return {apps:[{}],auth:()=>({currentUser:{uid:'u'}}),firestore:()=>fsx};
    }};
}
/* ---------- เปิดเว็บ 1 เครื่อง (ส่ง ls = สำเนา localStorage เดิม เพื่อจำลองการรีเฟรช) ---------- */
function boot(server,{ls={},online=true,clock=0}={}){
  const dev={online,dead:false};
  const dom=new JSDOM(`<!doctype html><body><div id="app-sidebar"></div><script>window.matchMedia=function(){return {matches:false,addEventListener(){}}};var currentDate='${DAY}';function sbClose(){}</script></body>`,
    {runScripts:'dangerously',url:'https://example.test/',pretendToBeVisual:true,beforeParse(w){
      Object.keys(ls).forEach(k=>w.localStorage.setItem(k,ls[k]));
      Object.defineProperty(w.navigator,'onLine',{get:()=>dev.online});
      if(clock){ const RD=w.Date, off=clock; w.Date=class extends RD{ constructor(...a){ a.length?super(...a):super(RD.now()+off); } static now(){ return RD.now()+off; } }; }
      w.firebase=server.client(dev); w.showToast=()=>{}; w.console.warn=()=>{};
      w.addEventListener('error',e=>{ throw new Error('PAGE ERROR '+e.message); }); }});
  const w=dom.window,d=w.document, t=d.createElement('div'); t.innerHTML=tkwSrc.replace(/<script[\s\S]*?<\/script>/g,''); d.body.appendChild(t);
  const s0=d.createElement('script'); s0.textContent=smSrc; d.body.appendChild(s0);
  const s=d.createElement('script'); s.textContent=tkwSrc.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]; d.body.appendChild(s);
  dev.w=w; dev.ls=()=>{ const o={}; for(let i=0;i<w.localStorage.length;i++){ const k=w.localStorage.key(i); o[k]=w.localStorage.getItem(k); } return o; };
  dev.close=()=>{ dev.dead=true; const o=dev.ls(); w.close(); return o; };
  dev.tickets=()=>{ const r=w.tkwReadDay(DAY); const out=[]; (r&&r.r||[]).forEach(c=>c.forEach(x=>{ if(x&&String(x[0]).trim()) out.push(String(x[0])); })); return out.sort(); };
  dev.add=(t,amt)=>w.tkwImportS3(DAY,[{month:11,ticket:t,book:'12',amount:amt||1000}]);
  return dev;
}
const srvTickets=server=>{ const j=(server.docs[MON]||{})[F]; if(!j) return []; const out=[]; JSON.parse(j).r.forEach(c=>c.forEach(x=>{ if(x&&String(x[0]).trim()) out.push(String(x[0])); })); return out.sort(); };
async function start(dev){ await dev.w.tkwEnsure(3000); await wait(700); }
let fail=0; const ok=(c,msg,extra)=>{ if(!c){ fail++; console.log('FAIL',msg,extra||''); } else console.log('ok  ',msg); };

(async()=>{
  /* 1) A แก้ตอนออฟไลน์ แล้วรีเฟรช · ระหว่างนั้น B เพิ่มตั๋ว → เปิด A ใหม่ ต้องได้ทั้งสองใบ ทั้งในเครื่องและบนคลาวด์ */
  { const S=makeServer();
    let A=boot(S); await start(A); A.add('1001'); await wait(3600); ok(srvTickets(S).join()==='1001','1.0 A ส่งตั๋ว 1001 ขึ้นคลาวด์',srvTickets(S));
    A.online=false; A.add('2002'); await wait(3600); ok(srvTickets(S).join()==='1001','1.1 ออฟไลน์: ยังไม่ส่ง 2002');
    const lsA=A.close();
    const B=boot(S); await start(B); B.add('3003'); await wait(3600); ok(srvTickets(S).join()==='1001,3003','1.2 B ส่ง 3003',srvTickets(S));
    A=boot(S,{ls:lsA}); await start(A); await wait(3600);
    ok(A.tickets().join()==='1001,2002,3003','1.3 A หลังรีเฟรช: มีทั้งของตัวเอง (2002) และของ B (3003)',A.tickets());
    ok(srvTickets(S).join()==='1001,2002,3003','1.4 คลาวด์มีครบ 3 ใบ',srvTickets(S));
    await wait(300); ok(B.tickets().join()==='1001,2002,3003','1.5 B ได้รับ 2002 ด้วย',B.tickets());
    A.close(); B.close(); }

  /* 2) นาฬิกาเครื่อง B ช้ากว่า 1 ชั่วโมง: A ไม่ได้แก้ค้าง ต้องรับของ B ทันที */
  { const S=makeServer();
    const A=boot(S); await start(A); A.add('1001'); await wait(3600);
    const B=boot(S,{clock:-3600e3}); await start(B); B.add('4004'); await wait(3800);
    ok(srvTickets(S).join()==='1001,4004','2.0 คลาวด์มี 4004 จาก B',srvTickets(S));
    ok(A.tickets().join()==='1001,4004','2.1 A รับของ B แม้เวลาเครื่อง B ช้ากว่า',A.tickets());
    A.close(); B.close(); }

  /* 3) A ไม่ได้แก้อะไร ปิดไป · B แก้ → A เปิดใหม่ต้องได้ฉบับของ B (ไม่ส่งของเก่าทับ) */
  { const S=makeServer();
    let A=boot(S); await start(A); A.add('1001'); await wait(3600); const lsA=A.close();
    const B=boot(S,{clock:-3600e3}); await start(B); B.add('5005'); await wait(3600);
    A=boot(S,{ls:lsA}); await start(A); await wait(3600);
    ok(A.tickets().join()==='1001,5005'&&srvTickets(S).join()==='1001,5005','3.0 A เปิดใหม่ได้ฉบับของ B และคลาวด์ไม่ถูกทับ',[A.tickets(),srvTickets(S)]);
    A.close(); B.close(); }

  /* 4) ข้อมูลเครื่องจากเวอร์ชันก่อน (ไม่มีสถานะซิงก์) + คลาวด์ใหม่กว่า → ใช้ของคลาวด์ และเก็บสำเนาของเครื่องนี้ไว้ */
  { const S=makeServer(); const mk=(t,u)=>({m:[6,7,8,9,10,11,12],r:[0,1,2,3,4,5,6].map(g=>{ const c=[]; for(let i=0;i<60;i++) c.push(['','']); if(g===5) c[0]=[t,'1000','12','']; return c; }),u});
    S.docs[MON]={[F]:JSON.stringify(mk('7007',Date.now()))};
    const A=boot(S,{ls:{pawn_tkw_v1:JSON.stringify({[DAY]:mk('6006',Date.now()-60e3)})}}); await start(A);
    const cf=JSON.parse(A.w.localStorage.getItem('pawn_sync_conflicts')||'[]');
    ok(A.tickets().join()==='7007','4.0 ใช้ฉบับคลาวด์ที่ใหม่กว่า',A.tickets());
    ok(cf.some(x=>x.kind==='tkw-startup-local'&&/6006/.test(x.remote)),'4.1 เก็บสำเนาของเครื่องนี้ (6006) ไว้ใน pawn_sync_conflicts');
    A.close(); }

  console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})();
