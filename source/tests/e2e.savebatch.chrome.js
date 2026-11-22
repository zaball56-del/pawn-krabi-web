// บันทึกแบบรวมครั้งระหว่างพิมพ์ (ข้อมูลไม่หาย) + แถบ "มีเวอร์ชันใหม่"
// รัน: node tests/e2e.savebatch.chrome.js   (FILE=<index.html> เทียบเวอร์ชันอื่น)
const path=require('path'), fs=require('fs'), os=require('os'), http=require('http'); const {chromium}=require('playwright'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const FILE=process.env.FILE||path.join(__dirname,'../../index.html'); let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const ctx=await b.newContext({viewport:{width:1366,height:900}}); let pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,150)));
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto('file://'+FILE,{waitUntil:'domcontentloaded'}); await sleep(3000);
  const login=p=>p.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); ac.classList.remove('hidden'); ac.style.display='flex'; goPage('ledger'); });
  await login(pg);
  await pg.evaluate(()=>{ Object.keys(db).forEach(k=>delete db[k]); currentDate='2026-11-20'; const d=getCurrentDayData(); d.months=['พฤศจิกายน','','','','','']; saveDB(); document.getElementById('doc-date').value=currentDate; changeDate(); });
  const stored=()=>pg.evaluate(()=>{ try{ const x=JSON.parse(localStorage.getItem('pawn_krabi_master_db')||'{}'); const r=x['2026-11-20']&&x['2026-11-20'].data['พฤศจิกายน']; return r&&r[0]?String(r[0].ticket||''):''; }catch(e){ return 'ERR'; } });
  const type=(v)=>pg.evaluate(v=>{ const inp=document.querySelector('input[oninput*="\'ticket\'"]'); inp.value=v; inp.dispatchEvent(new Event('input',{bubbles:true})); return db['2026-11-20'].data['พฤศจิกายน'][0].ticket; },v);
  let mem=await type('1'); await type('12'); mem=await type('123');
  ok(mem==='123','1 ข้อมูลในหน่วยความจำอัปเดตทันทีทุกตัวอักษร ('+mem+')');
  await sleep(700); ok(await stored()==='123','2 หยุดพิมพ์ 0.4 วิ → บันทึกลงเครื่องแล้ว');
  await type('1234');
  await pg.evaluate(()=>{ Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'}); document.dispatchEvent(new Event('visibilitychange')); });
  ok(await stored()==='1234','3 สลับแท็บ/ย่อหน้าต่างทันทีหลังพิมพ์ → บันทึกทันที');
  await pg.evaluate(()=>{ delete document.visibilityState; });
  await type('12345'); await pg.evaluate(()=>{ saveDB(); }); ok(await stored()==='12345','4 มีการบันทึกอื่นระหว่างรอ → บันทึกล่าสุดทันที');
  await type('123456'); await sleep(700); await pg.reload({waitUntil:'domcontentloaded'}); await sleep(3000);
  const after=await pg.evaluate(()=>{ const d=db['2026-11-20']; return d&&d.data['พฤศจิกายน'][0]&&d.data['พฤศจิกายน'][0].ticket; });
  ok(after==='123456','5 รีเฟรชแล้วข้อมูลที่พิมพ์ยังอยู่ ('+after+')');
  await login(pg); await pg.evaluate(()=>{ currentDate='2026-11-20'; document.getElementById('doc-date').value=currentDate; changeDate(); });
  await type('7777'); await pg.reload({waitUntil:'domcontentloaded'}); await sleep(3000);
  const after2=await pg.evaluate(()=>{ const d=db['2026-11-20']; return d&&d.data['พฤศจิกายน'][0]&&d.data['พฤศจิกายน'][0].ticket; });
  ok(after2==='7777','5b พิมพ์แล้วรีเฟรช/ปิดแท็บทันที (ไม่รอ) → ข้อมูลยังอยู่ ('+after2+')');
  await pg.close();

  // แถบ "มีเวอร์ชันใหม่" (ต้องเปิดผ่าน http)
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nv-')); const html=fs.readFileSync(FILE,'utf8'); fs.writeFileSync(path.join(dir,'index.html'),html);
  const me=(html.match(/var ME='([0-9a-f]{12})'/)||[])[1]||'';
  ok(/^[0-9a-f]{12}$/.test(me),'6 index.html มีรหัสเวอร์ชัน ('+me+')');
  let ver=me; const srv=http.createServer((q,s)=>{ const u=q.url.split('?')[0]; if(u==='/version.txt'){ s.writeHead(200,{'content-type':'text/plain'}); s.end(ver+'\n'); return; } if(u==='/'||u==='/index.html'){ s.writeHead(200,{'content-type':'text/html; charset=utf-8'}); s.end(html); return; } s.writeHead(404); s.end(); }).listen(0); await sleep(200);
  const port=srv.address().port; pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(String(e).slice(0,150)));
  await pg.route('**/*',r=>/^http:\/\/127\.0\.0\.1/.test(r.request().url())?r.continue():r.abort()); await pg.goto('http://127.0.0.1:'+port+'/index.html',{waitUntil:'domcontentloaded'}); await sleep(2500);
  const bar=async()=>{ await pg.evaluate(()=>window.__newverCheck&&window.__newverCheck()); await sleep(600); return pg.evaluate(()=>!!document.getElementById('newver-bar')); };
  ok(!(await bar()),'7 version.txt ตรงกับหน้าเว็บ → ไม่ขึ้นแถบ');
  ver='0123456789ab'; ok(await bar(),'8 มีเวอร์ชันใหม่ → ขึ้นแถบ "มีเวอร์ชันใหม่"');
  srv.close(); fs.rmSync(dir,{recursive:true,force:true});
  ok(!errs.length,'9 ไม่มี error '+errs.join('|'));
  await b.close(); console.log(fail?'FAILED '+fail:'ALL PASS'); process.exit(fail?1:0); })();
