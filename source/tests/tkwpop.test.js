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
(async()=>{
  { const w=boot(); tap(w,inp(w,5,0,0));
    ok(on(w)&&$(w,'tkw-tp-t').value==='1234'&&$(w,'tkw-tp-b').value==='12'&&$(w,'tkw-tp-sub').textContent==='แก้ไขตั๋วที่มีอยู่'&&$(w,'tkw-tp-ttl').textContent==='คีย์ตั๋ว · แถว 1'&&$(w,'tkw-tp-mon').textContent==='พฤศจิกายน','1 แตะช่องเลขตั๋วที่มีอยู่ → popup เปิด แสดงเลขตั๋ว/เล่ม/แถว/เดือน');
    ok($(w,'tkw-tp-del').classList.contains('on'),'1b มีปุ่มลบรายการนี้เมื่อเป็นตั๋วที่มีอยู่'); }
  { const w=boot(); tap(w,inp(w,5,0,0)); $(w,'tkw-tp-t').value='9999'; $(w,'tkw-tp-b').value='77'; key(w,$(w,'tkw-tp-t'),'Enter'); key(w,$(w,'tkw-tp-b'),'Enter'); await wait(150);
    const c=cell(w,5,0); ok(!on(w)&&c[0]==='9999'&&c[1]==='5000'&&c[2]==='77'&&c[3]==='','2 แก้เลขตั๋ว+เล่ม (Enter→Enter) แล้วยอดเงินยังอยู่ ส่วนเลขเดิมของ x[3] ถูกล้าง ('+JSON.stringify(c)+')');
    ok(inp(w,5,0,0).value==='9999','2b ตารางแสดงเลขใหม่');
    ok(w.document.activeElement===inp(w,5,0,1),'2c หลังตกลง โฟกัสไปช่องจำนวนเงินของแถวเดียวกัน'); }
  { const w=boot(); tap(w,inp(w,5,0,0)); $(w,'tkw-tp-b').value='99'; $(w,'tkw-tp-o').click(); await wait(100);
    const c=cell(w,5,0); ok(c[0]==='1234'&&c[2]==='99'&&c[3]==='2026-11-01','3 แก้เฉพาะเล่ม เลขตั๋วเดิมไม่เปลี่ยน ข้อมูลอื่น (x[3]) ไม่ถูกล้าง ('+JSON.stringify(c)+')'); }
  { const w=boot(); tap(w,inp(w,5,5,0)); ok(on(w)&&$(w,'tkw-tp-sub').textContent==='ตั๋วใหม่ในแถวนี้'&&!$(w,'tkw-tp-del').classList.contains('on'),'4 แถวว่าง → ตั๋วใหม่ ไม่มีปุ่มลบ');
    $(w,'tkw-tp-t').value=''; $(w,'tkw-tp-o').click(); ok(on(w),'4b เลขตั๋วว่าง → ตกลงแล้ว popup ยังไม่ปิด');
    $(w,'tkw-tp-t').value='ab 5x5'; $(w,'tkw-tp-b').value='3-4'; $(w,'tkw-tp-o').click(); await wait(100);
    const c=cell(w,5,5); ok(c[0]==='55'&&c[2]==='34','4c รับเฉพาะตัวเลข (ab 5x5 → 55, 3-4 → 34) ('+JSON.stringify(c)+')'); }
  { const w=boot(); tap(w,inp(w,5,0,0)); $(w,'tkw-tp-x').click(); ok(!on(w)&&cell(w,5,0)[0]==='1234','5 ยกเลิก → ปิดโดยไม่แก้ข้อมูล');
    tap(w,inp(w,5,0,0)); key(w,w.document,'Escape'); ok(!on(w),'5b กด Esc ปิด'); }
  { const w=boot(); tap(w,inp(w,5,0,0)); const dl=$(w,'tkw-tp-del'); dl.click();
    ok(on(w)&&dl.classList.contains('sure')&&cell(w,5,0)[0]==='1234','6 ลบ: แตะครั้งแรกแค่ขอยืนยัน ข้อมูลยังอยู่');
    dl.click(); await wait(50); ok(!on(w)&&cell(w,5,0)[0]===''&&cell(w,5,1)[0]==='1235','6b แตะครั้งที่สองลบเฉพาะช่องนี้ แถวอื่นไม่ขยับ');
    const sn=w.document.getElementById('tkw-tp-sn'); ok(!!sn&&/1234/.test(sn.textContent),'6c มีแถบกู้คืน'); sn.querySelector('button').click(); await wait(50);
    const c=cell(w,5,0); ok(c[0]==='1234'&&c[1]==='5000'&&c[2]==='12'&&c[3]==='2026-11-01','6d กู้คืนได้ครบ ('+JSON.stringify(c)+')');
    $(w,'tkw-undo').click(); await wait(20); ok(true,'6e ปุ่มเลิกทำเดิมยังใช้ได้ ไม่พัง'); }
  { const w=boot(); tap(w,inp(w,5,0,1)); ok(!on(w),'7 แตะช่องจำนวนเงิน → ไม่เปิด popup (พิมพ์ยอดตามเดิมได้)'); }
  console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})();
