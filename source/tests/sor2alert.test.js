// ทดสอบหน้าต่างเตือนตอนนำเข้า สธ.2 (modules/sor2.html ตัวจริง): กรอกผิดแล้วต้องเด้งเตือนทันที
// รัน: JSDOM=/path/to/jsdom node tests/sor2alert.test.js
const fs=require('fs'),path=require('path'); const {JSDOM}=require(process.env.JSDOM||'jsdom');
const src=fs.readFileSync(path.join(__dirname,'../modules/sor2.html'),'utf8');
const js=src.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
const K='2026-11-12', M='พฤศจิกายน';
const L=(t,b,a,nt,nb,na,type)=>({type:type||'',ticket:t,book:b,amount:a,newTicket:nt||'',newBook:nb||'',newAmount:na||''});
function boot(rows){
  const dom=new JSDOM('<!doctype html><body><script>var currentDate="'+K+'";var db={};db["'+K+'"]={months:["'+M+'"],data:{"'+M+'":'+JSON.stringify(rows)+',"สรุปประจำวัน":[{},{},{},{}]}};</script></body>',{runScripts:'dangerously',url:'https://example.test/',pretendToBeVisual:true});
  const w=dom.window,d=w.document; const t=d.createElement('div'); t.innerHTML=src.replace(/<script[\s\S]*?<\/script>/g,''); d.body.appendChild(t);
  const s=d.createElement('script'); s.textContent=js; d.body.appendChild(s); return w;
}
const R=(type,oldT,ticket,book,amount)=>({type,oldT,oldM:11,ticket,book,weight:'',amount});
const popup=w=>{ const e=w.document.getElementById('s2-alert'); return {on:!!e&&e.classList.contains('on'),text:e?e.textContent:''}; };
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };

{ const w=boot([L('2235','254','26500','3000','300','30000')]); const n=w.__sor2.test({rows:[R('ส','2235','3000','300',30000)]},K); const p=popup(w);
  ok(n===0&&!p.on,'1 กรอกถูกทุกอย่าง → ไม่เด้งเตือน'); }
{ const w=boot([L('2235','254','26500','2999','300','30000')]); const n=w.__sor2.test({rows:[R('ส','2235','3000','300',30000)]},K); const p=popup(w);
  ok(p.on&&n>=1&&/ขัดกับบัญชี/.test(p.text)&&/บัญชีผูกตั๋วใหม่ 2999/.test(p.text)&&/3000/.test(p.text),'2 กรอกเลขตั๋วใหม่ผิด (2999 แทน 3000) → เด้งเตือนทันที บอกทั้งสองเลข'); }
{ const w=boot([L('2235','254','26500','3000','301','30000')]); w.__sor2.test({rows:[R('ส','2235','3000','300',30000)]},K); const p=popup(w);
  ok(p.on&&/เล่มตั๋วใหม่ในบัญชี 301/.test(p.text),'3 กรอกเล่มตั๋วใหม่ผิด → เด้งเตือน'); }
{ const w=boot([L('2235','254','26500','3000','300','31000')]); w.__sor2.test({rows:[R('ส','2235','3000','300',30000)]},K); const p=popup(w);
  ok(p.on&&/ยอดตั๋วใหม่ในบัญชี/.test(p.text),'4 กรอกยอดตั๋วใหม่ผิด → เด้งเตือน'); }
{ const w=boot([L('2253','254','26500')]); w.__sor2.test({rows:[R('ส','2235','3000','300',30000)]},K); const p=popup(w);
  ok(p.on&&/ไม่พบตั๋วเดิม/.test(p.text)&&/2235/.test(p.text),'5 กรอกเลขตั๋วเดิมผิด (2253 แทน 2235) → เด้ง "ไม่พบตั๋วเดิม"'); }
{ const w=boot([L('2235','254','26500','3000','300','30000'),L('2236','254','1000','4000','300','1000')]); w.__sor2.test({rows:[R('ส','2235','3000','300',30000)]},K); const p=popup(w);
  ok(p.on&&/ตั๋วใหม่ในบัญชีไม่อยู่ใน สธ\.2/.test(p.text)&&/4000/.test(p.text),'6 ตั๋วใหม่ในบัญชีที่ไม่มีใน สธ.2 → เด้งเตือน'); }
{ const w=boot([L('2235','254','26500','3000','300','30000','พ')]); w.__sor2.test({rows:[R('ส','2235','3000','300',30000)]},K); const p=popup(w);
  ok(p.on&&/ประเภท พ/.test(p.text),'7 ประเภทไม่ตรง (พ แทน ส) → เด้งเตือน'); }
{ const w=boot([L('2235','254','26500','3000','300','30000'),L('2300','254','5000')]); w.__sor2.test({rows:[R('ส','2235','3000','300',30000)]},K); const p=popup(w);
  ok(!p.on,'8 มีแถวอื่นที่ไม่เกี่ยวกับ สธ.2 → ไม่เด้งเตือนเกินจำเป็น'); }
{ const w=boot([L('2253','254','26500')]); w.__sor2.test({rows:[R('ส','2235','3000','300',30000)]},K); w.document.getElementById('s2-al-go').click();
  ok(!popup(w).on&&w.document.querySelectorAll('#s2-tb tr').length===1,'9 กด "ดูเฉพาะรายการเตือน" → ปิดหน้าต่างและกรองตารางเหลือเฉพาะรายการเตือน'); }
console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
