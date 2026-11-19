// ตรวจไวยากรณ์ทุก <script> ในไฟล์ที่ build แล้ว (กันคอมเมนต์ // กลืนโค้ดที่เหลือในบรรทัด ฯลฯ ก่อนขึ้นเว็บ)
// รัน: python3 tools/build.py ../index.html && node tests/syntax.test.js
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const files=['../../firebase-config.js','../../sw.js'].map(f=>path.join(__dirname,f)).filter(f=>fs.existsSync(f));
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m,n=0,bad=0;
while((m=re.exec(html))){ n++; try{ new Function(m[1]); }catch(e){ bad++; const line=html.slice(0,m.index).split('\n').length; console.log('FAIL script #'+n+' (บรรทัด '+line+'):',e.message); } }
files.forEach(f=>{ try{ new Function(fs.readFileSync(f,'utf8')); }catch(e){ bad++; console.log('FAIL',path.basename(f)+':',e.message); } });
console.log(bad?`❌ ล้มเหลว ${bad}`:`✅ ผ่านทั้งหมด (${n} สคริปต์ + ${files.length} ไฟล์)`); process.exit(bad?1:0);
