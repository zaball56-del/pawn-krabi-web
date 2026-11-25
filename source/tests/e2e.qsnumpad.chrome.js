// แป้นตัวเลขของหน้าคีย์ด่วน (มือถือ) — ผู้ใช้ขอ 24 พ.ย. 69
const {chromium}=require('playwright'); const path=require('path'); const FILE=process.env.FILE||path.join(__dirname,'../../index.html'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0; const ok=(c,m)=>{ if(!c) fail++; console.log((c?'ok  ':'FAIL')+' '+m); };
(async()=>{ const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const mk=async(mob)=>{ const pg=await (await b.newContext(mob?{viewport:{width:390,height:780},isMobile:true,hasTouch:true}:{viewport:{width:1300,height:900}})).newPage(); pg.on('dialog',d=>d.accept()); pg.errs=[]; pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,150)));
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
  await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
  await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); Object.keys(db).forEach(k=>delete db[k]);
    currentDate='2026-11-03'; let d=getCurrentDayData(); d.months=['พฤศจิกายน','','','','','']; d.data['พฤศจิกายน']=d.data['พฤศจิกายน']||[];
    d.sor2={v:1,file:'t',at:1,mn:'พฤศจิกายน',n:1,amt:3000,newN:1,newAmt:3000,rows:[['','',0,'55','262','1',3000]]};
    currentDate='2026-11-24'; d=getCurrentDayData(); d.months=['พฤศจิกายน','','','','','']; d.data['พฤศจิกายน']=d.data['พฤศจิกายน']||[]; saveDB(); renderTable();
    localStorage.setItem('pawn_qs_auto','1'); localStorage.removeItem('pawn_qs_numpad'); openQuickScanModal(); }); await sleep(300); return pg; };
 const K=async(pg,k)=>{ await pg.tap('#qsnp button[data-k="'+k+'"]'); await sleep(70); };
 let pg=await mk(true);
 await pg.tap('#qs-mode button[data-m="full"]'); await pg.tap('.qs-type-btn[data-type="ถ"]'); await pg.focus('#qs-month');
 ok(await pg.evaluate(()=>document.getElementById('qsnp').classList.contains('on')),'1 มือถือ: แตะช่อง → แป้นเล็กขึ้น');
 for(const k of ['1','1','ถัดไป','5','5']) await K(pg,k); await sleep(2800);   /* พิมพ์เองบนแป้น → รอหยุดพิมพ์ 2 วิก่อนบันทึก */
 const sv=await pg.evaluate(()=>{ const x=(db[currentDate].data['พฤศจิกายน']||[]).find(r=>r&&r.ticket==='55'); return x?x.type+'|'+x.book+'|'+x.amount:''; });
 ok(/^ถ\|262\|3,?000/.test(sv),'2 กดแป้นเล็ก → ระบบดึงเล่ม/ยอดเอง → บันทึกอัตโนมัติ '+sv);
 await pg.focus('#qs-ticket'); for(const k of ['1','2','3','⌫']) await K(pg,k);
 ok(await pg.evaluate(()=>document.getElementById('qs-ticket').value)==='12','3 ปุ่มลบ ⌫ '+await pg.evaluate(()=>document.getElementById('qs-ticket').value));
 await pg.focus('#qs-amount'); await pg.evaluate(()=>{ document.getElementById('qs-amount').value=''; }); for(const k of ['5','0','0','0']) await K(pg,k);
 ok(await pg.evaluate(()=>document.getElementById('qs-amount').value.replace(/,/g,'')==='5000'&&!document.querySelector('#qsnp button[data-k="00"],#qsnp button[data-k="000"]')),'4 พิมพ์ยอด 5000 ในช่องยอด · ไม่มีปุ่ม 00/000 แล้ว');
 ok(await pg.evaluate(()=>getComputedStyle(document.querySelector('.qs-right > div:last-child')).display)==='none','5 แป้นเปิด → ซ่อนแถบ ล้างข้อมูล/บันทึก');
 await pg.evaluate(()=>{ qsPickType('ส'); }); await pg.evaluate(()=>document.activeElement.blur()); await sleep(250);
 ok(await pg.evaluate(()=>!document.getElementById('qsnp').classList.contains('on')&&getComputedStyle(document.querySelector('.qs-right > div:last-child')).display!=='none'),'6 แตะที่อื่น → แป้นหาย แถบบันทึกกลับมา');
 await pg.focus('#qs-book'); await K(pg,'⌨'); await sleep(300);
 ok(await pg.evaluate(()=>localStorage.getItem('pawn_qs_numpad')==='0'&&!document.getElementById('qsnp').classList.contains('on')&&document.getElementById('qs-book').getAttribute('inputmode')==='numeric'&&!document.getElementById('qs-book').readOnly),'7 ปุ่มแป้นมือถือ → กลับไปใช้แป้นเครื่อง (inputmode ตัวเลข)');
 await pg.evaluate(()=>window.qsNumpadEnable(true)); await pg.focus('#qs-month'); await sleep(200);
 ok(await pg.evaluate(()=>document.getElementById('qsnp').classList.contains('on')),'8 เปิดกลับจากตั้งค่าได้');
 await pg.focus('#qs-ticket'); await pg.evaluate(()=>{ document.getElementById('qs-ticket').value=''; }); await pg.keyboard.type('4567'); await pg.keyboard.press('Backspace'); await pg.keyboard.type('8'); await pg.keyboard.press('Enter'); await sleep(300);
 const hs=await pg.evaluate(()=>({ro:document.getElementById('qs-ticket').readOnly,v:document.getElementById('qs-ticket').value,act:document.activeElement.id}));
 ok(hs.ro&&hs.v==='4568'&&hs.act!=='qs-ticket','11 ช่องล็อกแป้นเครื่อง (readonly) แต่เครื่องยิงบาร์โค้ด/คีย์บอร์ดจริงยังพิมพ์ได้ + Enter ไปช่องถัดไป '+JSON.stringify(hs));
 /* แก้บั๊ค 24 พ.ย. 69: พิมพ์เลขตั๋วแล้วกด ถัดไป ทันที (ก่อนระบบค้นเสร็จ) ประเภท ถ → เคอร์เซอร์ค้างที่เลขตั๋ว ตัวเลขต่อไปไปต่อท้ายเลขตั๋ว */
 for(const mode of ['full','single']){ await pg.evaluate((mode)=>{ document.activeElement&&document.activeElement.blur(); qsClearFields(false); localStorage.setItem('pawn_qs_auto','0'); document.querySelector('#qs-mode button[data-m="'+mode+'"]').click(); },mode); await sleep(200); await pg.evaluate(()=>qsPickType('ถ')); await pg.focus('#qs-month'); await pg.evaluate(()=>{ document.getElementById('qs-month').value=''; });
   for(const k of ['1','1','ถัดไป','5','5','ถัดไป']) await K(pg,k); await sleep(200);
   const st=await pg.evaluate(()=>({act:document.activeElement.id,t:document.getElementById('qs-ticket').value}));
   ok(st.act!=='qs-ticket'&&st.t==='55','12 '+mode+' · ถ พิมพ์เลขตั๋วแล้วกด ถัดไป ทันที → เคอร์เซอร์ไปช่องถัดไป ไม่ค้างที่เลขตั๋ว '+JSON.stringify(st)); }
 await pg.evaluate(()=>{ const m=document.getElementById('qs-month'); m.value='11'; }); await pg.focus('#qs-month'); await K(pg,'7'); const m7=await pg.evaluate(()=>document.getElementById('qs-month').value); await K(pg,'⌫'); await K(pg,'1'); await K(pg,'2'); const m12=await pg.evaluate(()=>document.getElementById('qs-month').value);
 ok(m7==='7'&&m12==='12','13 ช่องเดือนมี 11 กด 7 → 7 (ไม่ใช่ 117) · ลบแล้วกด 1 2 → 12 '+m7+' / '+m12);
 ok(!pg.errs.length,'9 ไม่มี error '+JSON.stringify(pg.errs));
 pg=await mk(false); await pg.focus('#qs-month'); await sleep(200);
 ok(await pg.evaluate(()=>!document.getElementById('qsnp').classList.contains('on')&&document.getElementById('qs-month').getAttribute('inputmode')!=='none'),'10 จอคอม: ไม่มีแป้นเล็ก พิมพ์คีย์บอร์ดปกติ');
 console.log(fail?'FAILED '+fail:'ALL PASS'); await b.close(); process.exit(fail?1:0); })();
