// ทดสอบ modules/s3move.html : นำเข้า สธ.3 แล้วย้ายตั๋วที่คีย์ผิดเดือนไปเดือนที่ถูก
// รัน: JSDOM=/path/to/jsdom node tests/s3move.test.js
const fs=require('fs'),path=require('path');
const {JSDOM}=require(process.env.JSDOM||'jsdom');
const src=fs.readFileSync(path.join(__dirname,'../modules/s3move.html'),'utf8');
const js=src.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
const DAY='2026-11-13';
function boot(){
  const dom=new JSDOM(`<!doctype html><body><input type="checkbox" id="pdf-dest-ledger" checked><input id="pdf-import-date" value="${DAY}">
    <div><div id="pdf-import-preview-wrap"></div></div><button id="pdf-import-confirm"></button>
    <script>
      var thaiMonths=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
      var currentDate='${DAY}', saved=0, rendered=0, toasts=[];
      function normalizeCompareTicket(v){ return String(v==null?'':v).trim().replace(/^0+(?=\\d)/,''); }
      function saveDB(){ saved++; } function renderTable(){ rendered++; } function showToast(m){ toasts.push(m); }
      var blank=function(i){ return {type:'',ticket:'',amount:'',count:'',origIdx:i,timestamp:''}; };
      var db={}; db['${DAY}']={months:['','','','','','กรกฎาคม','สิงหาคม','กันยายน'].filter(Boolean),data:{}};
      ['กรกฎาคม','สิงหาคม','กันยายน'].forEach(function(m){ db['${DAY}'].data[m]=Array.from({length:10},function(_,i){return blank(i);}); });
      var pdfImportReadyRecords=[];
      function preparePDFImport(){}
      function commitPDFImport(){ /* เหมือนตัวจริง: ลงแถวว่างแรกของเดือนที่ถูก */
        var day=db['${DAY}']; pdfImportReadyRecords.filter(function(r){return r.selected&&!r.duplicate;}).forEach(function(r){
          var rows=day.data[thaiMonths[r.month-1]]; var i=rows.findIndex(function(x){return !x.ticket;});
          rows[i]={type:'',ticket:String(r.ticket),amount:String(r.amount),count:'',origIdx:i,timestamp:'15:54:17',importSource:'PDF',importBook:String(r.book),importLoanDate:'x'}; });
        document.getElementById('pdf-import-confirm').disabled=true; }
      commitPDFImport.__s3=1;
    </script></body>`,{runScripts:'dangerously',url:'https://example.test/',pretendToBeVisual:true});
  const w=dom.window; const s=w.document.createElement('script'); s.textContent=js; w.document.body.appendChild(s); return w;
}
const rec=(ticket,month,book,amount,x)=>Object.assign({ticket,month,book,amount,selected:true,duplicate:false,reason:''},x||{});
const put=(w,m,i,row)=>w.eval(`db['${DAY}'].data['${m}'][${i}]=${JSON.stringify(row)}`);
const rows=(w,m)=>w.eval(`db['${DAY}'].data['${m}'].filter(function(x){return x.ticket;})`);
const setRecs=(w,a)=>{ w.eval('pdfImportReadyRecords.length=0'); a.forEach(r=>w.eval('pdfImportReadyRecords.push('+JSON.stringify(r)+')')); };
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  { const w=boot(); await wait(600);
    put(w,'สิงหาคม',2,{type:'ผ',ticket:'2291',amount:12000,count:'',origIdx:2,timestamp:'14:19:08',book:'227',barcode:'6900227022912'});
    setRecs(w,[rec(2291,9,'227',12000)]); w.preparePDFImport();
    ok(!!w.document.getElementById('s3mv-box')&&/สิงหาคม → กันยายน/.test(w.document.getElementById('s3mv-box').textContent),'1 พบตั๋วผิดเดือน → ขึ้นกล่องแจ้ง "สิงหาคม → กันยายน"');
    w.commitPDFImport();
    const a=rows(w,'สิงหาคม'),s=rows(w,'กันยายน');
    ok(a.length===0&&s.length===1,'2 ลบจากสิงหาคม และเหลือหนึ่งแถวในกันยายน ('+a.length+'/'+s.length+')');
    ok(s[0].type==='ผ'&&s[0].book==='227'&&s[0].barcode==='6900227022912'&&s[0].importSource==='PDF','3 แถวที่ย้ายเก็บประเภท เล่ม บาร์โค้ด ที่คีย์ไว้');
    ok(w.eval('saved')===1&&w.eval('rendered')===1&&/ย้ายตั๋ว/.test(w.eval('toasts').join()),'4 บันทึก+วาดตารางใหม่+แจ้งข้อความ'); }
  { const w=boot(); await wait(600);
    put(w,'สิงหาคม',2,{type:'ผ',ticket:'2291',amount:13000,count:'',origIdx:2,timestamp:'t',book:'227'});
    setRecs(w,[rec(2291,9,'227',12000)]); w.preparePDFImport(); w.commitPDFImport();
    ok(rows(w,'สิงหาคม').length===1&&rows(w,'กันยายน').length===1,'5 เลขตั๋วเดียวกันแต่เงินต่าง → ไม่ย้าย ไม่ลบ'); }
  { const w=boot(); await wait(600);
    put(w,'สิงหาคม',2,{type:'ส',ticket:'2291',amount:12000,count:'',origIdx:2,timestamp:'t',book:'300'});
    setRecs(w,[rec(2291,9,'227',12000)]); w.preparePDFImport(); w.commitPDFImport();
    ok(rows(w,'สิงหาคม').length===1,'6 คนละเล่ม (300 กับ 227) → ไม่ย้าย'); }
  { const w=boot(); await wait(600);
    put(w,'สิงหาคม',2,{type:'ผ',ticket:'2291',amount:12000,count:'',origIdx:2,timestamp:'t',book:'227'});
    setRecs(w,[rec(2291,9,'227',12000)]); w.preparePDFImport(); w.document.getElementById('s3mv-on').checked=false; w.commitPDFImport();
    ok(rows(w,'สิงหาคม').length===1&&rows(w,'กันยายน').length===1,'7 ไม่ติ๊กย้าย → นำเข้าตามเดิม ไม่แตะแถวเดิม'); }
  { const w=boot(); await wait(600);
    put(w,'สิงหาคม',2,{type:'ผ',ticket:'2291',amount:12000,count:'',origIdx:2,timestamp:'t',book:'227'});
    setRecs(w,[rec(2291,9,'227',12000,{selected:false})]); w.preparePDFImport(); w.commitPDFImport();
    ok(rows(w,'สิงหาคม').length===1,'8 ผู้ใช้เอาติ๊กรายการนั้นออก → ไม่ย้าย'); }
  { const w=boot(); await wait(600);
    put(w,'สิงหาคม',2,{type:'ผ',ticket:'2291',amount:12000,count:'',origIdx:2,timestamp:'t',book:'227'});
    put(w,'กันยายน',0,{type:'ผ',ticket:'2291',amount:'12000',count:'',origIdx:0,timestamp:'t',importSource:'PDF'});
    setRecs(w,[rec(2291,9,'227',12000,{selected:false,duplicate:true,reason:'มีเลขตั๋วนี้ในตารางแล้ว'})]); w.preparePDFImport();
    ok(/ซ้ำผิดเดือน/.test(w.document.getElementById('s3mv-box').textContent)&&!w.document.getElementById('s3mv-on'),'9 มีในเดือนที่ถูกแล้ว → เตือนให้ลบเอง ไม่ลบให้'); }
  { const w=boot(); await wait(600);
    setRecs(w,[rec(2291,9,'227',12000)]); w.preparePDFImport();
    ok(!w.document.getElementById('s3mv-box'),'10 ไม่มีตั๋วผิดเดือน → ไม่ขึ้นกล่อง'); }
  { const w=boot(); await wait(600);
    put(w,'กรกฎาคม',0,{type:'ส',ticket:'1099',amount:50000,count:'',origIdx:0,timestamp:'t',book:'167',newTicket:'1290'});
    put(w,'กันยายน',1,{type:'ส',ticket:'1099',amount:50000,count:'',origIdx:1,timestamp:'t',book:'167'});
    setRecs(w,[rec(1099,7,'167',50000,{selected:false,duplicate:true,reason:'มีเลขตั๋วนี้ในตารางแล้ว'})]); w.preparePDFImport();
    ok(w.__s3mv.state().dups.length===1&&w.__s3mv.state().moves.length===0,'11 กรณี 1099: แถวถูกเดือนมีอยู่แล้ว ตัวผิดเดือนเป็น "ซ้ำ" ถูกแจ้งเตือน'); }
  console.log(fail?'❌ ล้มเหลว '+fail:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})();
