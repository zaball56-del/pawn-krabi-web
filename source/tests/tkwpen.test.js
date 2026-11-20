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
  ok(store(w).pen==='r'&&!!store(w).cl&&store(w).cn===1&&$(w,'tkw-pclose').textContent==='ปิดบัญชีครั้งที่ 2','3 ปิดครั้งที่ 1 → ปากกาแดง + จดเวลา + ปุ่มเป็นครั้งที่ 2');
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
  // ปิดบัญชีครั้งที่ 2 → น้ำเงิน, ครั้งที่ 3 → เขียว
  w.confirm=()=>true; $(w,'tkw-pclose').click(); await wait(50);
  ok(store(w).cn===2&&store(w).pen==='b'&&$(w,'tkw-pclose').textContent==='ปิดบัญชีครั้งที่ 3','11 ปิดครั้งที่ 2 → น้ำเงิน และปุ่มเปลี่ยนเป็นครั้งที่ 3');
  type(w,inp(w,5,5,0),'6001'); await wait(50);
  ok(pen(5,5)==='b'&&pen(5,3)==='r','12 ตั๋วหลังปิดครั้งที่ 2 เป็นน้ำเงิน แถวแดงเดิมค้าง');
  // นำเข้า สธ.3 ได้สีปากกาปัจจุบัน (น้ำเงิน) ทันที
  w.tkwImportS3(DAY,[{month:11,ticket:'7777',book:'12',amount:900}]);
  const imp=store(w).r[5].find(x=>x[0]==='7777');
  ok(imp&&imp[4]==='b'&&pen(5,3)==='r','13 นำเข้า สธ.3 ได้สีปากกาปัจจุบัน แถวเดิมไม่เปลี่ยน');
  // โหลดซ้ำ: สียังอยู่
  const raw=w.localStorage.getItem('pawn_tkw_v1'); ok(JSON.parse(raw)[DAY].r[5][3][4]==='r','10 บันทึกลง localStorage');
  // ยกเลิกปิดบัญชีครั้งล่าสุด (ครั้งที่ 2 → กลับเป็นครั้งที่ 1): เลข/สีปากกาถอย, แถวหลังปิด (น้ำเงิน) กลับเป็นแดง, แถวเดิมไม่เปลี่ยน
  ok(!$(w,'tkw-pcancel').hidden,'14 ปุ่มยกเลิกโผล่เมื่อปิดบัญชีไปแล้ว');
  const before=JSON.stringify(store(w).r.map(c=>c.map(x=>[x[0],x[1]])));
  w.confirm=()=>false; $(w,'tkw-pcancel').click(); await wait(50);
  ok(store(w).cn===2,'15 กดยกเลิกแต่ตอบไม่ใช่ → ไม่ทำอะไร');
  w.confirm=()=>true; $(w,'tkw-pcancel').click(); await wait(50);
  ok(store(w).cn===1&&store(w).pen==='b'&&$(w,'tkw-pclose').textContent==='ปิดบัญชีครั้งที่ 2','16 ยกเลิก → กลับเป็นปิดครั้งที่ 1 ปากกากลับเป็นสีที่เลือกไว้ก่อนปิด (น้ำเงิน) ปุ่มปิดเป็นครั้งที่ 2');
  ok(pen(5,5)==='b'&&pen(5,3)==='r'&&pen(5,0)==='k','17 แถวเดิมทุกสีไม่เปลี่ยน');
  ok(JSON.stringify(store(w).r.map(c=>c.map(x=>[x[0],x[1]])))===before,'18 ตัวเลข/ยอดทุกช่องไม่เปลี่ยน');
  ok((store(w).cls||[]).length===1,'19 ประวัติเวลาปิดเหลือ 1 ครั้ง');
  // ปิดใหม่ → ครั้งที่ 2 ตามปกติ
  $(w,'tkw-pclose').click(); await wait(50);
  ok(store(w).cn===2&&store(w).pen==='b','20 ปิดใหม่ได้ ครั้งที่ 2 น้ำเงินเหมือนเดิม');
  // ยกเลิกจนหมด → ไม่มีรอบปิด ปุ่มยกเลิกซ่อน
  $(w,'tkw-pcancel').click(); await wait(50); $(w,'tkw-pcancel').click(); await wait(50);
  ok(store(w).cn===0&&!store(w).cl&&$(w,'tkw-pcancel').hidden&&$(w,'tkw-pclose').textContent==='ปิดบัญชีครั้งที่ 1'&&store(w).pen==='k'&&pen(5,3)==='k'&&pen(5,0)==='k','21 ยกเลิกครบ → กลับสภาพก่อนปิด (ปากกาดำ แถวที่เขียนหลังปิดกลับเป็นดำ) ปุ่มยกเลิกซ่อน');
  console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
