// ทดสอบหน้าต่างคีย์ตั๋วของหน้าเขียนตั๋ว (แบบเดียวกับหน้ารักษาของ)
// โหลด modules/tkw.html ตัวจริงเข้า jsdom · รัน: npm i --no-save jsdom แล้ว node tests/tkwpop.test.js (หรือ JSDOM=/path/to/jsdom)
const fs=require('fs'),path=require('path');
const {JSDOM}=require(process.env.JSDOM||'jsdom');
const tkwSrc=fs.readFileSync(path.join(__dirname,'../modules/tkw.html'),'utf8');
const DAY='2026-11-12';
const dayData=()=>({m:[6,7,8,9,10,11,12],r:[0,1,2,3,4,5,6].map(g=>{const c=[];for(let i=0;i<60;i++)c.push(['','']);if(g===5){c[0]=['1234','5000','12','2026-11-01'];c[1]=['1235','800','12',''];}return c;}),u:1});

function boot(){
  const dom=new JSDOM(`<!doctype html><body><div id="app-sidebar"></div><script>
    window.matchMedia=function(){return {matches:false,addEventListener(){}}}; var currentDate='${DAY}'; function sbClose(){}
  </script></body>`,{runScripts:'dangerously',url:'https://example.test/',pretendToBeVisual:true,
    beforeParse(w){ w.localStorage.setItem('pawn_tkw_v1',JSON.stringify({[DAY]:dayData()})); w.addEventListener('error',e=>{ throw new Error('PAGE ERROR '+e.message); }); }});
  const w=dom.window,d=w.document; const t=d.createElement('div'); t.innerHTML=tkwSrc.replace(/<script[\s\S]*?<\/script>/g,''); d.body.appendChild(t);
  const s=d.createElement('script'); s.textContent=tkwSrc.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]; d.body.appendChild(s);
  w.tkwOpen(); return w;
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const $=(w,id)=>w.document.getElementById(id);
const store=w=>JSON.parse(w.localStorage.getItem('pawn_tkw_v1'))[DAY];
const cell=(w,g,i)=>store(w).r[g][i];
const inp=(w,g,i,f)=>w.document.querySelector(`#tkw-table input[data-g="${g}"][data-i="${i}"][data-f="${f}"]`);
const tap=(w,el)=>{ el.dispatchEvent(new w.FocusEvent('focusin',{bubbles:true})); };
const on=w=>$(w,'tkw-tp').classList.contains('on');
const key=(w,el,k)=>el.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));

let fail=0; const ok=(c,msg)=>{ if(!c){ fail++; console.log('FAIL',msg); } else console.log('ok  ',msg); };
const type=(w,el,v)=>{ el.value=v; el.dispatchEvent(new w.Event('input',{bubbles:true})); };
(async()=>{
  const w=boot(); const pen=(g,i)=>cell(w,g,i)[4]||'';
  ok(!!$(w,'tkw-pen'),'1 มีแถบปากกา');
  // ก่อนปิดบัญชี: แถวเดิมยังไม่มีสี
  type(w,inp(w,5,2,0),'2001'); type(w,inp(w,5,2,1),'100'); await wait(50);
  ok(pen(5,2)==='' ,'2 ยังไม่เลือกสี → ไม่ติดสี');
  // กดปิดบัญชีครึ่งวัน
  $(w,'tkw-pclose').click(); await wait(50);
  ok(store(w).pen==='r'&&!!store(w).cl,'3 ปิดบัญชี → ปากกาแดง + จดเวลา');
  ok(pen(5,0)==='k'&&pen(5,1)==='k'&&pen(5,2)==='k','4 แถวรอบเช้าถูกตรึงเป็นสีดำ');
  type(w,inp(w,5,3,0),'3001'); type(w,inp(w,5,3,1),'200'); await wait(50);
  ok(pen(5,3)==='r','5 ตั๋วใหม่หลังปิด = แดง');
  ok(inp(w,5,3,0).classList.contains('pen-r')&&inp(w,5,3,1).classList.contains('pen-r')&&!inp(w,5,0,0).classList.contains('pen-r'),'6 แสดงสีแดงเฉพาะแถวรอบบ่าย');
  // แก้ตัวเลขรอบเช้า สียังดำ
  type(w,inp(w,5,0,1),'5100'); await wait(50);
  ok(pen(5,0)==='k','7 แก้แถวรอบเช้า สีไม่เปลี่ยน');
  // เปลี่ยนเป็นน้ำเงิน
  w.document.querySelector('[data-pen="b"]').click(); type(w,inp(w,5,4,0),'4001'); await wait(50);
  ok(pen(5,4)==='b'&&pen(5,3)==='r','8 เลือกน้ำเงิน แถวแดงเดิมค้างอยู่');
  // ลบแล้วเขียนใหม่ได้สีปัจจุบัน
  type(w,inp(w,5,4,0),''); type(w,inp(w,5,4,1),''); await wait(50);
  ok(pen(5,4)==='','9 แถวที่ลบ ไม่เหลือสี');
  // โหลดซ้ำ: สียังอยู่
  const raw=w.localStorage.getItem('pawn_tkw_v1'); ok(JSON.parse(raw)[DAY].r[5][3][4]==='r','10 บันทึกลง localStorage');
  console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
