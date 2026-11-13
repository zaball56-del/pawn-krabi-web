// ทดสอบปุ่ม "⇡ เลื่อนขึ้น" ในตารางเขียนตั๋ว (modules/tkw.html ตัวจริง): เลื่อนเฉพาะคอลัมน์เดือนที่เลือก
const fs=require('fs'),path=require('path');
const {JSDOM}=require(process.env.JSDOM||'jsdom');
const tkwSrc=fs.readFileSync(path.join(__dirname,'../modules/tkw.html'),'utf8');
const js=src=>src.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
const DAY='2026-11-13';
const dom=new JSDOM(`<!doctype html><body><div id="app-sidebar"></div><script>
  window.matchMedia=function(){return {matches:false,addEventListener(){}}}; var currentDate='${DAY}'; function sbClose(){}
  window.__toasts=[]; function showToast(m){ __toasts.push(m); } window.__conf=true; window.confirm=function(){ return __conf; };
  localStorage.setItem('pawn_tkw_v1',JSON.stringify({'${DAY}':{m:[7,8,9],r:[
    [['1','100','10'],['',''],['3','300','10'],['',''],['5','500','10']].concat(Array.from({length:55},()=>['',''])),
    [['11','1100','20'],['',''],['',''],['14','1400','20']].concat(Array.from({length:56},()=>['',''])),
    Array.from({length:60},()=>['',''])],u:1}}));
</script></body>`,{runScripts:'dangerously',url:'https://example.test/',pretendToBeVisual:true,beforeParse(w){ w.addEventListener('error',e=>{ throw new Error('PAGE ERROR '+e.message); }); }});
const w=dom.window,d=w.document; const t=d.createElement('div'); t.innerHTML=tkwSrc.replace(/<script[\s\S]*?<\/script>/g,''); d.body.appendChild(t);
const s=d.createElement('script'); s.textContent=js(tkwSrc); d.body.appendChild(s);
const st=()=>JSON.parse(w.localStorage.getItem('pawn_tkw_v1'))[DAY];
const col=g=>st().r[g].map(x=>x[0]||'-').slice(0,6).join(',');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  w.tkwOpen&&w.tkwOpen(); await new Promise(r=>setTimeout(r,300));
  ok(!!d.getElementById('tkw-compact'),'1 มีปุ่ม "⇡ เลื่อนขึ้น"');
  d.querySelector('#tkw-tabs button[data-tab="0"]').click();
  d.getElementById('tkw-compact').click();
  ok(col(0)==='1,3,5,-,-,-'&&col(1)==='11,-,-,14,-,-','2 เลื่อนเฉพาะ ก.ค. ('+col(0)+') ส.ค.ไม่ขยับ ('+col(1)+')');
  ok(st().r[0].length===60&&st().r[0][0][2]==='10','3 จำนวนแถวเท่าเดิม และเล่มไปกับตั๋ว');
  d.getElementById('tkw-compact').click(); ok(/ไม่มีแถวว่าง/.test(w.__toasts[w.__toasts.length-1]),'4 ไม่มีช่องว่างแล้ว → แจ้ง ไม่ทำอะไร');
  d.getElementById('tkw-undo').click(); ok(col(0)==='1,-,3,-,5,-','5 เลิกทำ ย้อนกลับได้ ('+col(0)+')');
  w.__conf=false; d.getElementById('tkw-compact').click(); ok(col(0)==='1,-,3,-,5,-','6 กดยกเลิกในหน้ายืนยัน → ไม่เปลี่ยน');
  console.log(fail?'❌ '+fail:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})();
