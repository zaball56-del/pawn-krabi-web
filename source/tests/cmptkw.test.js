// ทดสอบ "เทียบ สธ.3 กับตารางเขียนตั๋ว": มีข้อมูลแล้วต้องไม่บอกว่า "ไม่พบข้อมูล"
// โหลด modules/tkw.html + modules/cmptkw.html ตัวจริงเข้า jsdom (จำลอง localStorage / Firebase)
// รัน: npm i --no-save jsdom แล้ว  node tests/cmptkw.test.js   (หรือ JSDOM=/path/to/jsdom node tests/cmptkw.test.js)
const fs=require('fs'),path=require('path');
const {JSDOM}=require(process.env.JSDOM||'jsdom');
const read=f=>fs.readFileSync(path.join(__dirname,'../modules',f),'utf8');
const tkwSrc=read('tkw.html'),cmpSrc=read('cmptkw.html');
const DAY='2026-11-12';
const dayData=()=>({m:[6,7,8,9,10,11,12],r:[0,1,2,3,4,5,6].map(g=>{const c=[];for(let i=0;i<60;i++)c.push(['','']);if(g===5){c[0]=['1234','5000','12',''];c[1]=['1235','800','12',''];}return c;}),u:1});

function boot({pre,firebase}={}){
  const dom=new JSDOM(`<!doctype html><body><div id="app-sidebar"></div>
  <input type="radio" name="cmpT" id="cmp-t-tkw" checked><div id="pdf-cmp-l1"></div><div id="pdf-cmp-l2"></div><div id="pdf-cmp-note"></div>
  <input id="pdf-compare-date" value="${DAY}"><div id="pdf-compare-status"></div><div id="pdf-compare-summary" class="hidden"></div><div id="pdf-compare-results" class="hidden"></div>
  <select id="pdf-compare-filter"><option value="issues">issues</option></select><table><tbody id="pdf-compare-tbody"></tbody></table>
  <script>
    window.matchMedia=function(){return {matches:false,addEventListener(){}}};
    let pdfCompareRecords=[{month:11,ticket:'1234',book:'12',amount:5000}];
    let pdfCompareResultsCache=[];
    function escapeHtml(s){return String(s)} function formatNumber(v){return String(v)}
    function runPDFComparison(){ return 'orig'; } function filterPDFCompareResults(){}
    var currentDate='${DAY}'; function sbClose(){}
  </script></body>`,{runScripts:'dangerously',url:'https://example.test/',pretendToBeVisual:true,
    beforeParse(w){ if(pre) pre(w); if(firebase) w.firebase=firebase(); w.addEventListener('error',e=>{ throw new Error('PAGE ERROR '+e.message); }); }});
  const w=dom.window,d=w.document;
  const mount=html=>{ const t=d.createElement('div'); t.innerHTML=html.replace(/<script[\s\S]*?<\/script>/g,''); d.body.appendChild(t);
    const s=d.createElement('script'); s.textContent=html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]; d.body.appendChild(s); };
  mount(tkwSrc); mount(cmpSrc);
  return w;
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function run(w){ w.runPDFComparison(); const el=w.document.getElementById('pdf-compare-status'); const t0=Date.now(); await wait(20); while(/กำลังโหลด/.test(el.textContent)&&Date.now()-t0<7000) await wait(50); return el.textContent; }
const done=s=>/เปรียบเทียบเสร็จแล้ว/.test(s);
const withData=extra=>({pre:w=>w.localStorage.setItem('pawn_tkw_v1',JSON.stringify(Object.assign({[DAY]:dayData()},extra)))});
const fakeFb=()=>{ const docs=[{data:()=>({['d'+DAY.replace(/-/g,'')]:JSON.stringify(dayData())})}];
  const col={onSnapshot(o,cb){ setTimeout(()=>cb({docs,metadata:{fromCache:false}}),0); },doc(){return {set:()=>Promise.resolve()}}};
  return {apps:[{}],auth:()=>({currentUser:{uid:'u'}}),firestore:()=>({collection:()=>col})}; };

let fail=0; const ok=(c,msg)=>{ if(!c){ fail++; console.log('FAIL',msg); } else console.log('ok  ',msg); };
(async()=>{
  { const w=boot(withData()); ok(done(await run(w)),'A มีข้อมูลใน localStorage ตั้งแต่เปิดหน้า'); }
  { const w=boot(); w.localStorage.setItem('pawn_tkw_v1',JSON.stringify({[DAY]:dayData()})); ok(done(await run(w)),'B localStorage ถูกเขียนหลังโหลดหน้า (restore / แท็บอื่น) ต้องเห็นข้อมูลล่าสุด'); }
  { const w=boot({firebase:fakeFb}); ok(done(await run(w)),'C ข้อมูลมีแต่บนคลาวด์ ยังไม่เคยเปิดหน้าเขียนตั๋ว ต้องเริ่มซิงก์เอง'); }
  { const w=boot({pre:w=>{ w.Storage.prototype.setItem=function(){ throw new Error('QuotaExceededError'); }; }}); const origWarn=console.warn; console.warn=()=>{};
    w.tkwImportS3(DAY,[{month:11,ticket:'1234',book:'12',amount:5000}]); w.tkwOpen(); const s=await run(w); console.warn=origWarn;
    ok(done(s),'D โควตา localStorage เต็ม: เปิดหน้าเขียนตั๋วแล้วข้อมูลในหน่วยความจำต้องไม่หาย'); }
  { const w=boot({pre:w=>w.localStorage.setItem('pawn_tkw_v1',JSON.stringify({'2026-11-11':dayData()}))}); const s=await run(w); const b=w.document.querySelector('#pdf-compare-status [data-cmpd]');
    ok(!done(s)&&b&&b.getAttribute('data-cmpd')==='2026-11-11','E ไม่มีข้อมูลวันที่เลือก: ต้องมีปุ่มชี้ไปวันที่มีข้อมูล'); if(b){ b.click(); ok(done(await run(w)),'E2 กดปุ่มแล้วเปรียบเทียบกับวันนั้นได้ (ทดสอบ 1 ครั้ง)'); } }
  { const w=boot(); const s=await run(w); ok(!done(s)&&/ไม่พบข้อมูลในตารางเขียนตั๋วของวันที่ 12\/11\/2569/.test(s)&&/Firebase/.test(s),'F ไม่มีข้อมูลเลย: ต้องบอกวันที่ (พ.ศ.) และสาเหตุ'); }
  { const w=boot(withData()); await run(w); const c=[...w.document.querySelectorAll('#pdf-compare-summary > div')].map(x=>x.textContent.replace(/\s+/g,'')); ok(c[0]==='ตรงกัน1'&&c[4]==='เกิน/ซ้ำ1','G ผลเปรียบเทียบถูก: ตรงกัน 1, มีในตารางแต่ไม่อยู่ใน PDF 1 ('+c.join(',')+')'); }
  console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})();
