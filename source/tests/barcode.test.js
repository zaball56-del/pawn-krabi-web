// เลขที่(no)=เลขตั๋วในบัญชี · เล่มที่(pad)=เล่ม · serial=เลขใหญ่มุมซ้ายบน (ยังไม่ใช้)
// รัน: node tests/barcode.test.js  (ดึง parse จาก modules/barcode.html มาทดสอบ)
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../modules/barcode.html'),'utf8');
const m=src.match(/function ok13[\s\S]*?function parse\(s\)\{[^\n]*\}/);
const parse=new Function(m[0]+';return parse;')();
const T=require('./tickets.json');
const chk=s=>{let t=0;for(let i=0;i<12;i++)t+=(+s[i])*(i%2?3:1);return (10-t%10)%10;};
const d=new Date(),fy=(d.getFullYear()+543+(d.getMonth()>=9?1:0))%100;
let fail=0;const ok=(c,msg)=>{if(!c){fail++;console.log('FAIL',msg);}};
for(const t of T){
  for(const yy of [fy,(fy+99)%100]){ // ปีงบปัจจุบัน และปีก่อน
    const b12=String(yy).padStart(2,'0')+'0'+String(t.pad).padStart(4,'0')+String(t.no).padStart(5,'0');
    const full=b12+chk(b12);
    const r=parse(full);
    ok(r&&r.book==String(t.pad)&&r.ticket==String(t.no),`#${t.n} ${full} -> ${JSON.stringify(r)}`);
    const r12=parse(b12); // สแกนได้ 12 หลักไม่มี 0 นำหน้า
    ok(r12===null||r12.book==String(t.pad),`#${t.n} 12-digit`);
    const bad=full.slice(0,12)+((+full[12]+1)%10);
    ok(parse(bad)===null,`#${t.n} checksum ผิดต้องถูกปฏิเสธ`);
  }
  ok(parse(String(t.no))===null,`#${t.n} เลขสั้นต้องไม่ถูกตีเป็นบาร์โค้ด`);
}
// ความสอดคล้อง: ตั๋วเรียงกันใน pad เดียวกันต้อง book ต่าง = ticket ต่าง
const by={};T.forEach(t=>{(by[t.big]=by[t.big]||[]).push(t.serial-t.no)});
console.log('ส่วนต่าง ticket-book ตามเลขใหญ่:',Object.fromEntries(Object.entries(by).map(([k,v])=>[k,[...new Set(v)]])));
console.log(fail?`❌ ล้มเหลว ${fail}`:`✅ ผ่านทั้งหมด (${T.length} ใบ)`);
process.exit(fail?1:0);
