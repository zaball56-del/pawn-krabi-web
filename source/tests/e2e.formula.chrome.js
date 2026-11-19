// ทดสอบสูตรยกยอดแบบสุ่มในแอปจริง (ไม่แตะสูตร — ตรวจว่าทำงานตามสูตรที่ผู้ใช้ยืนยันไว้):
//  ยกไปรายเดือน = ยกมา + ตั๋วใหม่ สธ.2 (เดือนตรง) − ไถ่ถอน (ถ/ส/พ/ผ) · ยกมาวันถัดไป = วันล่าสุดที่มีเดือนนั้น (ข้ามวันหยุด) · แก้ย้อนหลังส่งต่อทุกวันถัดไป
// รัน: NODE_PATH=<playwright> node tests/e2e.formula.chrome.js
const path=require('path'); const {chromium}=require('playwright');
const URL='file://'+path.join(__dirname,'../../index.html'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}); const pg=await (await b.newContext()).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
  await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto(URL,{waitUntil:'domcontentloaded'}); await sleep(2500);
  const res=await pg.evaluate(()=>{
    let seed=12345; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
    const M=['สิงหาคม','กันยายน','ตุลาคม']; const T=['ถ','ส','พ','ผ','','ต']; // '' และ 'ต' ต้องไม่ถูกหัก
    Object.keys(db).forEach(k=>delete db[k]);
    const days=[]; let d=new Date(2026,9,1,12);
    while(days.length<15){ d.setDate(d.getDate()+1); if(d.getDay()===0||d.getDay()===6) continue; days.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')); }
    const r2=v=>Math.round((v+Number.EPSILON)*100)/100;
    days.forEach((k,i)=>{ currentDate=k; const day=getCurrentDayData();
      if(i===0){ day.months=M.concat(['','','']); day.bf=[500000.5,300000,120000.25,0,0,0]; day.bfCount=[50,30,12,0,0,0]; M.forEach(m=>{ if(!day.data[m]) day.data[m]=[]; }); }
      if(i===7){ day.months=['สิงหาคม','','ตุลาคม','','',''];  }   // วันที่ 8 ไม่มีคอลัมน์ กันยายน
      if(i===8){ day.months=M.concat(['','','']); while(day.bf.length<6){day.bf.push(0);day.bfCount.push(0);} M.forEach(m=>{ if(!day.data[m]) day.data[m]=[]; }); }   // วันที่ 9 ใส่กันยายนกลับ → ต้องดึงยกมาจากวันที่ 7
      syncBroughtForwardForDate(k,true);
      day.months.forEach(m=>{ if(!m) return; const rows=day.data[m]||(day.data[m]=[]); const n=Math.floor(rnd()*6);
        for(let j=0;j<n;j++) rows[j]={type:T[Math.floor(rnd()*T.length)],ticket:String(1000+i*10+j),book:'1',amount:Math.round(rnd()*900000)/100,count:'',origIdx:j,timestamp:''}; });
      if(i%4===2) day.sor2={mn:'ตุลาคม',n:3,amt:12345.67};
      saveDB(); });
    /* ตรวจลูกโซ่ทุกวัน ทุกเดือน */
    const check=()=>{ const bad=[];
      days.forEach((k,i)=>{ if(!i) return; const day=db[k];
        day.months.forEach((m,idx)=>{ if(!m) return; const src=getPrevDateForMonth(k,m); if(!src) return; const s=db[src], si=s.months.indexOf(m);
          let red=0, cnt=0; (s.data[m]||[]).forEach(x=>{ if(x&&['ถ','ส','พ','ผ'].includes(String(x.type).trim())){ red=r2(red+(Number(x.amount)||0)); cnt++; } });
          const add=(s.sor2&&s.sor2.mn===m)?{a:r2(s.sor2.amt),n:s.sor2.n}:{a:0,n:0};
          const expA=r2(Number(s.bf[si])+add.a-red), expC=Number(s.bfCount[si])+add.n-cnt;
          if(Number(day.bf[idx])!==expA||Number(day.bfCount[idx])!==expC) bad.push(k+' '+m+': ได้ '+day.bf[idx]+'/'+day.bfCount[idx]+' ควร '+expA+'/'+expC+' (จาก '+src+')'); }); });
      return bad; };
    days.forEach(k=>syncBroughtForwardForDate(k,true));
    const bad1=check();
    /* แก้ย้อนหลัง: วันที่ 3 เพิ่มไถ่ถอน 2 รายการ แล้วส่งต่อ */
    const k3=days[2]; db[k3].data['สิงหาคม'].push({type:'ถ',ticket:'9001',book:'1',amount:1234.56,count:'',origIdx:db[k3].data['สิงหาคม'].length,timestamp:''},{type:'ส',ticket:'9002',book:'1',amount:0.44,count:'',origIdx:db[k3].data['สิงหาคม'].length+1,timestamp:''});
    recalculateFutureBroughtForwardBalances(k3);
    const bad2=check();
    const sep=[getPrevDateForMonth(days[8],'กันยายน')];
    const fl=[]; days.forEach(k=>db[k].bf.forEach(v=>{ if(typeof v==='number'&&Math.abs(v*100-Math.round(v*100))>1e-6) fl.push(k+':'+v); }));
    /* สรุปประจำวัน: เดินวันตามลำดับแบบที่หน้าจอทำ (เปิดวัน → ใส่รับจำนำ → รวมไถ่ถอน) */
    const bad3=[]; days.forEach((k,i)=>{ currentDate=k; getCurrentDayData(); syncBroughtForwardForDate(k,false); const S=db[k].data['สรุปประจำวัน'];
      S[1].count=i+1; S[1].amount=r2(1000*(i+1)+0.25); db[k].balanceManual=false; updateSummaryColumn(); });
    days.forEach((k,i)=>{ const S=db[k].data['สรุปประจำวัน'], n=v=>Number(v)||0;
      let rc=0, ra=0; db[k].months.forEach(m=>{ if(!m) return; const t=getMonthlyRedemptionTotals(db[k],m); rc+=t.count; ra=r2(ra+t.amount); });
      if(n(S[2].count)!==rc||n(S[2].amount)!==ra) bad3.push(k+' ไถ่ถอน '+S[2].count+'/'+S[2].amount+' ควร '+rc+'/'+ra);
      if(n(S[3].count)!==n(S[0].count)+n(S[1].count)-n(S[2].count)||n(S[3].amount)!==r2(n(S[0].amount)+n(S[1].amount)-n(S[2].amount))) bad3.push(k+' คงเหลือผิด');
      if(i){ const P=db[days[i-1]].data['สรุปประจำวัน']; if(n(S[0].count)!==n(P[3].count)||n(S[0].amount)!==n(P[3].amount)) bad3.push(k+' ย/ม '+S[0].amount+' ≠ คงเหลือวันก่อน '+P[3].amount); } });
    return {bad1,bad2,bad3,sep:sep[0],day7:days[6],fl};
  });
  ok(!res.bad1.length,'1 ลูกโซ่ยกยอด 15 วัน × 3 เดือน (ข้ามเสาร์-อาทิตย์, สธ.2, ประเภทที่ไม่หัก) ถูกทุกช่อง'+(res.bad1.length?' · '+res.bad1.slice(0,3).join(' | '):''));
  ok(!res.bad2.length,'2 แก้ย้อนหลังวันที่ 3 แล้วส่งต่อทุกวันถัดไปถูกต้อง'+(res.bad2.length?' · '+res.bad2.slice(0,3).join(' | '):''));
  ok(res.sep===res.day7,'3 วันที่ไม่มีคอลัมน์เดือน ถูกข้าม (กันยายนวันที่ 9 ดึงจากวันที่ 7: '+res.sep+')');
  ok(!res.fl.length,'4 ไม่มีเศษทศนิยมเพี้ยนในยอดยกมา '+res.fl.slice(0,3).join(','));
  ok(!res.bad3.length,'5 สรุปประจำวัน 15 วัน: ไถ่ถอน = รวมทุกเดือน · คงเหลือ = ย/ม + รับจำนำ − ไถ่ถอน · ย/ม = คงเหลือวันก่อน'+(res.bad3.length?' · '+res.bad3.slice(0,3).join(' | '):''));
  ok(!errs.length,'6 ไม่มี error '+errs.join(' | '));
  await b.close(); console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})();
