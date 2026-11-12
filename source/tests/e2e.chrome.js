// ทดสอบแอปจริงใน Chrome (ออฟไลน์ ไม่ต่อเน็ต): บันทึก/โหลดข้อมูล, ล็อกวันที่ปิดยอด, ประวัติแก้ไข
// ต้องสร้างไฟล์ก่อน: python3 tools/build.py ../index.html   แล้วรัน: node tests/e2e.chrome.js
// ต้องมี Playwright + Chrome (ในแซนด์บ็อกซ์ของ Claude มีอยู่แล้ว) · ไม่ใส่ PIN ใด ๆ ทั้งสิ้น (ปลดล็อกในเทสต์ใช้การตั้งสถานะ __unlocked ของแอปที่ถูกสร้างขึ้นใหม่ในเทสต์เท่านั้น)
const path=require('path'); const {chromium}=require('playwright');
const URL='file://'+path.join(__dirname,'../../index.html'); const K='2026-11-12', M='พฤศจิกายน';
const SEED=`db['${K}']={months:['${M}'],bf:[0],bfCount:[0],data:{'${M}':[{type:'ส',ticket:'1110',book:'243',amount:100000,count:'',timestamp:'10:00:00'},{type:'ถ',ticket:'1111',book:'243',amount:5000,count:'',timestamp:'10:01:00'}],'สรุปประจำวัน':[]}}; currentDate='${K}';`;
const SEEDFN='()=>{'+SEED+'}';
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
const fn=(pg,src)=>pg.evaluate(eval(src));
const seed=pg=>pg.evaluate(new Function('return ('+SEEDFN+')')());
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function open(ctx,init){
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
  if(init) await pg.addInitScript(init);
  await pg.goto(URL,{waitUntil:'domcontentloaded'}); await sleep(2500);
  await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); });
  pg.errs=errs; return pg;
}
const tk=pg=>pg.evaluate(`(()=>{ const d=db['${K}']; return d&&d.data&&d.data['${M}']?d.data['${M}'].map(r=>r.ticket+'/'+r.book+'/'+r.amount).join(','):'' })()`);
const rows=pg=>pg.evaluate(`db['${K}'].data['${M}'].length`);

(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});

  { // บันทึก → รีโหลด
    const ctx=await b.newContext(); let pg=await open(ctx); await seed(pg); const r=await pg.evaluate('saveDB()'); await sleep(400);
    ok(r===true&&(await pg.evaluate("(localStorage.getItem('pawn_krabi_master_db')||'').includes('1110')")),'1 saveDB สำเร็จ และข้อมูลอยู่ใน localStorage');
    await pg.close(); pg=await open(ctx); ok((await tk(pg))==='1110/243/100000,1111/243/5000','2 รีโหลดหน้าแล้วข้อมูลกลับมาครบ (เลขตั๋ว/เล่ม/ยอด) ('+(await tk(pg))+')'); await ctx.close(); }

  { // localStorage เต็ม → สำรอง IndexedDB แล้วรีโหลดต้องได้ข้อมูลคืน
    const ctx=await b.newContext();
    let pg=await open(ctx,()=>{ const o=Storage.prototype.setItem; Storage.prototype.setItem=function(k,v){ if(k==='pawn_krabi_master_db'||k==='pawn_krabi_saved_at'){ const e=new Error('quota'); e.name='QuotaExceededError'; throw e; } return o.apply(this,arguments); }; });
    await seed(pg); const r=await pg.evaluate('saveDB()'); await sleep(1200);
    ok(r===true&&(await pg.evaluate("localStorage.getItem('pawn_krabi_master_db')"))===null,'3 localStorage เต็ม → saveDB ยังคืน true (ใช้ที่เก็บสำรอง) และ localStorage ไม่มีข้อมูล');
    await pg.close(); pg=await open(ctx); ok((await tk(pg))==='1110/243/100000,1111/243/5000','4 รีโหลดโดย localStorage ว่าง → กู้ข้อมูลจาก IndexedDB ได้ครบ ('+(await tk(pg))+')'); await ctx.close(); }

  { // ล็อกวันที่ปิดยอด (ไม่ใส่ PIN: ปิดกล่องถาม PIN ด้วย null เสมอ)
    const ctx=await b.newContext(); const pg=await open(ctx); await seed(pg);
    await fn(pg,`()=>{ db['${K}'].closing={closed:true}; window.__asked=0; window.uiPrompt=function(){ window.__asked++; return Promise.resolve(null); }; }`);
    ok(await pg.evaluate('window.__isLocked("'+K+'")'),'5 วันที่ปิดยอดแล้ว → ถูกล็อก');
    const n0=await rows(pg); await pg.evaluate('addRow()'); await sleep(150);
    ok((await rows(pg))===n0&&(await pg.evaluate('window.__asked'))===1,'6 ล็อกอยู่: เพิ่มแถวไม่ได้ และถูกถาม PIN 1 ครั้ง (ตอบยกเลิก)');
    await pg.evaluate("updateCellData(0,0,'amount','999')"); await sleep(150);
    ok((await tk(pg))==='1110/243/100000,1111/243/5000'&&(await pg.evaluate('window.__asked'))===2,'7 ล็อกอยู่: แก้ยอดไม่ได้ ข้อมูลเดิมไม่เปลี่ยน');
    await pg.evaluate("updateCellData(0,0,'amount','100000')"); await sleep(150);
    ok((await pg.evaluate('window.__asked'))===2,'8 ล็อกอยู่: ใส่ค่าเดิมซ้ำ (แค่คลิกเข้าออกช่อง) → ไม่ถาม PIN');
    await pg.evaluate(`window.__unlocked['${K}']=true`); await pg.evaluate('addRow()'); await sleep(200);
    ok((await rows(pg))>n0,'9 ปลดล็อกแล้ว (ตั้งสถานะในแอปทดสอบ): เพิ่มแถวได้'); await ctx.close(); }

  { // ประวัติแก้ไข
    const ctx=await b.newContext(); const pg=await open(ctx); await seed(pg); await pg.evaluate('try{renderTable()}catch(e){}'); await sleep(1800);
    await fn(pg,`()=>{ db['${K}'].data['${M}'].push({type:'ส',ticket:'2222',book:'9',amount:777,count:'',timestamp:'11:00:00'}); saveDB(); }`); await sleep(1500);
    const a=await pg.evaluate("JSON.parse(localStorage.getItem('pawn_krabi_audit_v1')||'[]')");
    ok(a.some(x=>x.date===K&&/เพิ่มรายการ/.test(x.a)&&/2222/.test(x.d)),'10 เพิ่มตั๋วแล้วมีบันทึกประวัติ "เพิ่มรายการ ตั๋ว 2222" ('+JSON.stringify(a.map(x=>x.a))+')');
    await fn(pg,`()=>{ db['${K}'].data['${M}'].find(r=>r.ticket==='2222').amount=888; saveDB(); }`); await sleep(1500);
    const a2=await pg.evaluate("JSON.parse(localStorage.getItem('pawn_krabi_audit_v1')||'[]')");
    ok(a2.some(x=>/แก้/.test(x.a)&&/777/.test(x.d)&&/888/.test(x.d)),'11 แก้ยอด 777→888 มีบันทึกประวัติ ('+a2.map(x=>x.a+':'+x.d).slice(-1)+')');
    await pg.evaluate("window.__audit('ทดสอบ','รายละเอียด','"+K+"')"); await pg.evaluate('openAuditLog()'); await sleep(300);
    ok(await pg.evaluate("document.body.innerText.includes('รายละเอียด')"),'12 หน้าประวัติเปิดได้และแสดงรายการ');
    await ctx.close(); }

  { // ประวัติบันทึกไม่ได้ → ต้องเตือน
    const ctx=await b.newContext(); const pg=await open(ctx,()=>{ const o=Storage.prototype.setItem; Storage.prototype.setItem=function(k){ if(k==='pawn_krabi_audit_v1'){ const e=new Error('q'); e.name='QuotaExceededError'; throw e; } return o.apply(this,arguments); }; });
    await fn(pg,`()=>{ window.__t=[]; window.showToast=function(m){ window.__t.push(m); }; }`); await pg.evaluate("window.__audit('x','y','"+K+"')"); await sleep(200);
    ok((await pg.evaluate('window.__t')).some(m=>/ไม่สำเร็จ|⚠/.test(m)),'13 บันทึกประวัติไม่ได้ (พื้นที่เต็ม) → มีข้อความเตือน ไม่เงียบ'); await ctx.close(); }

  await b.close(); console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
