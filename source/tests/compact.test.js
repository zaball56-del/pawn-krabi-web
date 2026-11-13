// ทดสอบ modules/compact.html : เลื่อนแถวว่างขึ้นเฉพาะเดือนที่เลือก
const fs=require('fs'),path=require('path');
const {JSDOM}=require(process.env.JSDOM||'jsdom');
const js=fs.readFileSync(path.join(__dirname,'../modules/compact.html'),'utf8').match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
const w=new JSDOM(`<!doctype html><body><details><div><button class="menu-item" onclick="trimEmptyRows()">x</button></div></details>
<script>var currentDate='D',saved=0,rendered=0,toasts=[];function saveDB(){saved++}function renderTable(){rendered++}function showToast(m){toasts.push(m)}
var mk=function(a){return Array.from({length:8},function(_,i){return a[i]?{type:'ส',ticket:a[i],amount:'100',count:'',origIdx:i,timestamp:'t',book:'1'}:{type:'',ticket:'',amount:'',count:'',origIdx:i,timestamp:''}})};
var db={D:{months:['กรกฎาคม','สิงหาคม'],data:{กรกฎาคม:mk(['1','','3','','5']),สิงหาคม:mk(['10','','','13'])}}};</script></body>`,{runScripts:'dangerously',url:'https://example.test/'}).window;
const s=w.document.createElement('script'); s.textContent=js; w.document.body.appendChild(s);
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
const col=m=>w.eval(`db.D.data['${m}'].map(function(r){return r.ticket||'-'}).join(',')`);
ok(!!w.document.getElementById('cpk-item'),'1 มีเมนู "เลื่อนแถวว่างขึ้น" ใต้ "ตัดแถวว่างออก"');
w.__cpk.open(); const btns=w.document.querySelectorAll('#cpk-modal button[data-m]');
ok(btns.length===2&&/คั่นกลาง 2 แถว/.test(w.document.getElementById('cpk-modal').textContent),'2 รายการเดือนแสดงจำนวนแถวว่างคั่นกลาง');
btns[0].click();
ok(col('กรกฎาคม')==='1,3,5,-,-,-,-,-','3 กรกฎาคมเลื่อนขึ้น ลำดับเดิม ('+col('กรกฎาคม')+')');
ok(col('สิงหาคม')==='10,-,-,13,-,-,-,-','4 สิงหาคมไม่ขยับ');
ok(w.eval('db.D.data["กรกฎาคม"].every(function(r,i){return r.origIdx===i})')&&w.eval('db.D.data["กรกฎาคม"].length')===8,'5 origIdx ถูกต้อง จำนวนแถวเท่าเดิม');
ok(w.eval('saved')===1&&w.eval('rendered')===1,'6 บันทึก+วาดตารางใหม่');
ok(w.eval('db.D.data["กรกฎาคม"][0].book')==='1'&&w.eval('db.D.data["กรกฎาคม"][1].ticket')==='3','7 ข้อมูลในแถวไปครบ (เล่ม ฯลฯ)');
w.__cpk.open(); ok(w.document.querySelector('#cpk-modal button[data-m="กรกฎาคม"]').disabled,'8 เดือนที่ไม่มีช่องว่างแล้ว → ปุ่มกดไม่ได้');
w.__isLocked=()=>true; w.__askUnlock=()=>{w.__ask=1}; w.document.getElementById('cpk-modal').classList.remove('on'); w.__cpk.open(); ok(w.__ask===1&&!w.document.getElementById('cpk-modal').classList.contains('on'),'9 วันที่ปิดยอดล็อกอยู่ → ขอ PIN ไม่เปิดเครื่องมือ');
console.log(fail?'❌ '+fail:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
