// เก็บชื่อคลาสทุกตัวที่ปรากฏบนหน้าจริงตอนใช้งาน (รวมคลาสที่โค้ดประกอบขึ้นเอง ซึ่งการสแกนซอร์สเฉย ๆ มองไม่เห็น)
// ใช้: node collect-classes.js ../../../index.html extra-classes.txt  (ต้องมี Playwright + Chrome)
const fs=require('fs'),path=require('path'); const {chromium}=require('playwright');
const html=path.resolve(process.argv[2]), out=path.resolve(process.argv[3]||'extra-classes.txt');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']}); const all=new Set();
  for(const vp of [{width:412,height:860},{width:1280,height:800}]){
    const ctx=await b.newContext({viewport:vp}); const pg=await ctx.newPage(); await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
    await pg.addInitScript(()=>{ window.__cls=new Set(); const add=e=>{ if(e&&e.classList) e.classList.forEach(c=>window.__cls.add(c)); };
      const scan=n=>{ if(n.nodeType!==1)return; add(n); n.querySelectorAll&&n.querySelectorAll('[class]').forEach(add); };
      new MutationObserver(ms=>ms.forEach(m=>{ if(m.type==='attributes')add(m.target); m.addedNodes.forEach(scan); })).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
      document.addEventListener('DOMContentLoaded',()=>{ document.querySelectorAll('[class]').forEach(add); }); });
    await pg.goto('file://'+html,{waitUntil:'domcontentloaded'}); await sleep(2500);
    await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); const ac=document.getElementById('app-container'); if(ac){ ac.classList.remove('hidden'); ac.style.display='block'; }
      const day=new Date().toISOString().slice(0,10); db[day]={months:['พฤศจิกายน','ตุลาคม'],bf:[0,0],bfCount:[0,0],data:{'พฤศจิกายน':[{type:'ส',ticket:'1110',book:'243',amount:100000,newTicket:'1157',newBook:'271',newAmount:100000,timestamp:'10:00:00'},{type:'ถ',ticket:'1111',book:'243',amount:5000,timestamp:'10:01:00'}],'ตุลาคม':[],'สรุปประจำวัน':[]}}; currentDate=day; });
    for(const step of ["goPage('home')","goPage('ledger')","renderTable&&renderTable()","window.tkwOpen&&tkwOpen()","goPage('ledger')","openGlobalSearch()","document.getElementById('global-search-input').value='1110';executeGlobalSearch()","closeGlobalSearch()","openPDFImportModal()","closePDFImportModal&&closePDFImportModal()","openPDFCompareModal()","closePDFCompareModal&&closePDFCompareModal()","openQuickScanModal()","closeQuickScanModal&&closeQuickScanModal()","openPrintPreview()","closePrintPreview&&closePrintPreview()","openMonthAudit&&openMonthAudit()","openReliableDatabase&&openReliableDatabase()","openAuditLog&&openAuditLog()","openCustodyModal&&openCustodyModal()","sbToggle&&sbToggle()","sbToggle&&sbToggle()"]){
      try{ await pg.evaluate(step); }catch(e){} await sleep(250); }
    (await pg.evaluate(()=>[...window.__cls])).forEach(c=>all.add(c)); await ctx.close(); }
  await b.close(); fs.writeFileSync(out,[...all].sort().join('\n')+'\n'); console.log('classes',all.size,'->',out);
})();
