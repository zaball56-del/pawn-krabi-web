// บันทึกอัตโนมัติในโหมด "ตั๋วเดิม + ตั๋วใหม่" (ผู้ใช้เลือกแบบ ข 24 พ.ย. 69)
// ถ: ยอดที่ดึงมาเองครบ → บันทึกเอง · ส/พ/ผ: ตั๋วใหม่+เล่ม+ยอดตั๋วใหม่ครบ → บันทึกเอง · ยอดที่พิมพ์เอง รอหยุดพิมพ์ 2 วินาที
const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const path=require('path'); const FILE=process.env.FILE||path.join(__dirname,'../../index.html');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
async function page(b,auto,numpad){
  const pg=await (await b.newContext({viewport:{width:390,height:780},isMobile:true,hasTouch:true})).newPage(); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,150))); pg.on('dialog',d=>d.accept());
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
  await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
  await pg.evaluate(({auto,numpad})=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); Object.keys(db).forEach(k=>delete db[k]);
    currentDate='2026-11-03'; let d=getCurrentDayData(); d.months=['พฤศจิกายน','','','','','']; d.data['พฤศจิกายน']=d.data['พฤศจิกายน']||[];
    d.sor2={v:1,file:'t',at:1,mn:'พฤศจิกายน',n:3,amt:9000,newN:3,newAmt:9000,rows:[['','',0,'55','262','1',3000],['','',0,'56','262','1',4000],['','',0,'57','262','1',2000]]};
    currentDate='2026-11-24'; d=getCurrentDayData(); d.months=['พฤศจิกายน','','','','','']; d.data['พฤศจิกายน']=d.data['พฤศจิกายน']||[]; saveDB(); renderTable();
    localStorage.setItem('pawn_qs_auto',auto?'1':'0'); localStorage.setItem('pawn_qs_numpad',numpad?'1':'0'); if(window.qsNumpadEnable) qsNumpadEnable(!!numpad); openQuickScanModal(); },{auto,numpad});
  await sleep(300); return pg;
}
const saved=(pg,t)=>pg.evaluate(t=>{ const x=(db[currentDate].data['พฤศจิกายน']||[]).find(r=>r&&r.ticket===t); return x?(x.type+'|'+x.amount+'|'+(x.newTicket||'')+'|'+(x.newAmount||'')):''; },t);
async function oldPart(pg,mode,type,t){ await sleep(1200); await pg.tap('#qs-mode button[data-m="'+mode+'"]'); await sleep(150); await pg.tap('.qs-type-btn[data-type="'+type+'"]');
  await pg.fill('#qs-month',''); await pg.tap('#qs-month'); await pg.keyboard.type('11'); await pg.tap('#qs-ticket'); await pg.keyboard.type(t); await pg.tap('#qs-book'); await pg.keyboard.type('262'); await sleep(500); }
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  let pg=await page(b,true);
  await oldPart(pg,'full','ถ','55'); await sleep(1300);
  ok(/^ถ\|3,?000\|\|/.test(await saved(pg,'55')),'1 โหมดตั๋วเดิม+ใหม่ · ถ ยอดดึงมาเอง → บันทึกเอง '+await saved(pg,'55'));
  await oldPart(pg,'full','ส','56'); await pg.tap('#qs-new-ticket'); await pg.keyboard.type('1904'); await pg.tap('#qs-new-book'); await pg.keyboard.type('278'); await sleep(400);
  ok(!(await saved(pg,'56')),'2a ส ยังไม่ครบ (เพิ่งพิมพ์เล่มตั๋วใหม่) ยังไม่บันทึกทันที');
  await sleep(1500);
  ok(/^ส\|4,?000\|1904\|4,?000/.test(await saved(pg,'56')),'2 ส ตั๋วใหม่+เล่มครบ ยอดคัดลอกเอง → บันทึกเอง '+await saved(pg,'56'));
  await oldPart(pg,'full','พ','57'); await pg.tap('#qs-new-ticket'); await pg.keyboard.type('1905'); await pg.tap('#qs-new-book'); await pg.keyboard.type('278');
  await pg.tap('#qs-new-amount'); await pg.keyboard.type('8'); await sleep(1500);
  ok(!(await saved(pg,'57')),'3a พ พิมพ์ยอดตั๋วใหม่ค้างไว้ 1.5 วิ → ยังไม่บันทึก');
  await pg.keyboard.type('9000'); await sleep(1200);
  ok(!(await saved(pg,'57')),'3b พิมพ์ต่อ → นับเวลาใหม่ ยังไม่บันทึก');
  await sleep(1600);
  ok(/^พ\|2,?000\|1905\|89,?000/.test(await saved(pg,'57')),'3 พ หยุดพิมพ์ 2 วิ → บันทึกยอดครบ 89,000 '+await saved(pg,'57'));
  ok(!pg.errs.length,'4 ไม่มี error '+JSON.stringify(pg.errs)); await pg.context().close();
  pg=await page(b,true);
  await oldPart(pg,'full','ส','56'); await pg.tap('#qs-new-ticket'); await pg.keyboard.type('1904'); await sleep(1800);
  ok(!(await saved(pg,'56')),'5 ส ยังไม่ใส่เล่มตั๋วใหม่ → ไม่บันทึกเอง'); await pg.context().close();
  pg=await page(b,false);
  await oldPart(pg,'full','ถ','55'); await sleep(1500);
  ok(!(await saved(pg,'55')),'6 ปิดบันทึกอัตโนมัติ (ตั้งค่า) → ไม่บันทึกเอง'); await pg.context().close();
  pg=await page(b,true);
  await oldPart(pg,'single','ถ','55'); await sleep(1300);
  ok(/^ถ\|3,?000/.test(await saved(pg,'55')),'7 โหมดตั๋วเดิมอย่างเดียว ยังบันทึกเองเหมือนเดิม '+await saved(pg,'55')); await pg.context().close();
  /* แก้บั๊ค 24 พ.ย. 69: พิมพ์เอง (แป้นตัวเลขของโปรแกรม) แล้วหยุดกลางเลข → ห้ามบันทึกเลขที่ยังพิมพ์ไม่จบ */
  pg=await page(b,true,true); await pg.evaluate(()=>{ const r=db['2026-11-03'].sor2.rows; r.push(['','',0,'5','262','1',1500]); saveDB(); });
  const K=async k=>{ await pg.tap('#qsnp button[data-k="'+k+'"]'); await sleep(90); };
  await pg.tap('#qs-mode button[data-m="single"]'); await pg.tap('.qs-type-btn[data-type="ถ"]'); await pg.focus('#qs-month'); await pg.evaluate(()=>{ document.getElementById('qs-month').value=''; });
  for(const k of ['1','1','ถัดไป','5']) await K(k); await sleep(1500);
  ok(!(await saved(pg,'5')),'8a พิมพ์ "5" แล้วหยุด 1.5 วิ (ตั้งใจพิมพ์ 55) → ยังไม่บันทึกตั๋ว 5');
  await K('5'); await sleep(2600);
  ok(!(await saved(pg,'5'))&&/^ถ\|3,?000/.test(await saved(pg,'55')),'8 พิมพ์ต่อเป็น 55 แล้วหยุด 2 วิ → บันทึก 55 (ไม่ใช่ 5) '+await saved(pg,'55'));
  for(const k of ['5','6']) await K(k); await sleep(1200);
  ok(!(await saved(pg,'56')),'9a บันทึกแล้วพิมพ์ใบถัดไปเอง → ยังรอ 2 วิ ไม่บันทึกเร็ว');
  await sleep(1500); ok(/^ถ\|4,?000/.test(await saved(pg,'56')),'9 ใบถัดไปบันทึกหลังหยุดพิมพ์ '+await saved(pg,'56'));
  await pg.context().close();
  pg=await page(b,true); await pg.evaluate(()=>window.qsNumpadEnable&&qsNumpadEnable(false));
  await pg.tap('#qs-mode button[data-m="single"]'); await pg.tap('.qs-type-btn[data-type="ถ"]'); await pg.fill('#qs-month','11');
  await pg.focus('#qs-ticket'); await pg.keyboard.type('55',{delay:8}); await sleep(1200);
  ok(/^ถ\|3,?000/.test(await saved(pg,'55')),'10 เครื่องยิงบาร์โค้ด (ตัวอักษรรัว) → บันทึกเร็วเหมือนเดิม '+await saved(pg,'55'));
  await sleep(600); await pg.evaluate(()=>{ const t=document.getElementById('qs-ticket'); t.value='56'; t.dispatchEvent(new Event('input',{bubbles:true})); }); await sleep(1300);
  ok(/^ถ\|4,?000/.test(await saved(pg,'56')),'11 สแกนด้วยกล้อง (ใส่ทั้งเลขทีเดียว) → บันทึกเร็วเหมือนเดิม '+await saved(pg,'56'));
  ok(!pg.errs.length,'12 ไม่มี error '+JSON.stringify(pg.errs)); await pg.context().close();
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0);
})();
