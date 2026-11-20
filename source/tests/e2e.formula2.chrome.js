// ทดสอบสูตรทั้งระบบแบบสุ่ม (ชุดใหญ่) เทียบกับตัวคำนวณอิสระ (oracle) ที่เขียนแยกจากโค้ดแอป
//  ทุกวัน ทุกเดือน: ยกมา · ยกไป · สรุปประจำวัน (ย/ม, ไถ่ถอน, คงเหลือ) · คงเหลือ = ยกไปรวมทุกเดือน
//  เหตุการณ์สุ่ม: ไถ่ถอน ถ/ส/พ/ผ + ประเภทที่ไม่หัก + แถวมีประเภทแต่ไม่มีเลขตั๋ว/ยอด · สธ.2 · เพิ่มเดือนใหม่ · ตัดหลุดทั้งเดือน · ยอดปรับยกมา ±
//  แล้วแก้ย้อนหลังแบบสุ่ม · คำนวณใหม่ทั้งชุด (เหมือนรวม 2 เครื่อง)
// รัน: node tests/e2e.formula2.chrome.js   (SEEDS=1,2,3 DAYS=30 ปรับได้)
const path=require('path'); const {chromium}=require('playwright');
const URL='file://'+path.join(__dirname,'../../index.html'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const SEEDS=(process.env.SEEDS||'11,22,33,44').split(',').map(Number), DAYS=Number(process.env.DAYS||30);
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} else console.log('ok  ',m); };

async function RUN(arg){ const seed0=arg.seed, NDAYS=arg.days; const tick=()=>new Promise(r=>setTimeout(r,0));   /* พักให้หน้าเว็บหายใจ (งานต่อเนื่อง >30 วิ Chrome ปิดแท็บ) */
  let seed=seed0; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; }; const ri=n=>Math.floor(rnd()*n);
  window.confirm=()=>true; window.__al=[]; window.alert=m=>{ window.__al.push(String(m)); };
  Object.keys(db).forEach(k=>delete db[k]);
  const r2=v=>Math.round((v+Number.EPSILON)*100)/100, num=v=>Number(String(v==null?'':v).replace(/,/g,''))||0;
  const NAMES=thaiMonths.slice(), RED=['ถ','ส','พ','ผ'], T=['ถ','ส','พ','ผ','ถ','ส','','ต'];
  const fmtD=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const days=[]; let d=new Date(2026,5,1,12); while(days.length<NDAYS){ d.setDate(d.getDate()+1); if(d.getDay()===0||d.getDay()===6) continue; days.push(fmtD(d)); }
  const ev={}, stat={rows:0,red:0,blank:0,ff:0,add:0,adj:0,sor2:0,retro:0};
  const SUM=k=>db[k].data['สรุปประจำวัน'];
  const openDay=k=>{ currentDate=k; getCurrentDayData(); syncBroughtForwardForDate(k,false); renderTable(); };
  const setPledge=k=>{ const dd=db[k], s=SUM(k); s[1].count=dd.sor2?dd.sor2.n:''; s[1].amount=dd.sor2?dd.sor2.amt:''; dd.balanceManual=false; updateSummaryColumn(); renderTable(); };
  const present=k=>db[k].months.map((m,ix)=>[m,ix]).filter(x=>x[0]);
  const fillRows=(k,i,m)=>{ const rows=db[k].data[m]||(db[k].data[m]=[]); const n=ri(7);
    for(let j=0;j<n;j++){ const blank=rnd()<0.08, ty=T[ri(T.length)]; rows[j]={type:ty,ticket:blank?'':String(10000+i*100+j),book:'1',amount:blank?'':String(r2(rnd()*9000)),count:'',origIdx:j,timestamp:''};
      stat.rows++; if(blank&&RED.includes(ty)) stat.blank++; } };

  /* ---------- สร้างข้อมูลทีละวัน แบบที่ผู้ใช้ทำในหน้าจอ ---------- */
  for(let i=0;i<days.length;i++){ const k=days[i]; await tick(); currentDate=k; const day=getCurrentDayData(); ev[k]={adj:{},ff:[]};
    if(i===0){ const ms=NAMES.slice(0,6); day.months=ms.slice(); day.bf=ms.map(()=>r2(rnd()*500000)); day.bfCount=ms.map(()=>1+ri(60)); ms.forEach(m=>day.data[m]=day.data[m]||[]); }
    syncBroughtForwardForDate(k,false); renderTable();
    if(i>0&&rnd()<0.15){ const p=present(k); if(p.length>2){ const [m,ix]=p[ri(p.length)]; removeMonthAt(ix); if(db[k].forfeit&&db[k].forfeit[m]){ ev[k].ff.push(m); stat.ff++; } } }
    if(i>0&&rnd()<0.2){ let ei=db[k].months.indexOf(''); if(ei<0){ addMonthCol(); ei=db[k].months.indexOf(''); }
      const cand=NAMES.filter(m=>!db[k].months.includes(m)); if(cand.length){ updateMonthName(ei,cand[ri(cand.length)]); stat.add++; } }
    if(i>0&&rnd()<0.2){ const p=present(k); const [m,ix]=p[ri(p.length)]; const a=r2((rnd()-0.3)*20000), c=ri(5)-1; applyBfAdj(ix,String(a),String(c),'สุ่ม'); ev[k].adj[m]={a,c}; stat.adj++; }
    present(k).forEach(([m])=>fillRows(k,i,m));
    if(rnd()<0.5){ const p=present(k); db[k].sor2={mn:p[ri(p.length)][0],n:1+ri(6),amt:r2(rnd()*50000)}; stat.sor2++; }
    saveDB(); setPledge(k); }

  /* ---------- ตัวคำนวณอิสระ ---------- */
  const oracle=()=>{ const st={}; let prev=null; const out={};
    days.forEach((k,i)=>{ const dd=db[k], e=ev[k], res={bf:{},carry:{}}; const delta={a:0,c:0}, red={a:0,c:0}, sc={a:0,c:0}, sb={a:0,c:0};
      e.ff.forEach(m=>{ const x=st[m]||{a:0,c:0}; delta.a=r2(delta.a-x.a); delta.c-=x.c; delete st[m]; });
      dd.months.forEach((m,ix)=>{ if(!m) return;
        const base=i===0?{a:num(dd.bf[ix]),c:num(dd.bfCount[ix])}:(st[m]?{a:st[m].a,c:st[m].c}:{a:0,c:0});
        const adj=e.adj[m]||{a:0,c:0}; delta.a=r2(delta.a+adj.a); delta.c+=adj.c;
        const bf={a:r2(base.a+adj.a),c:base.c+adj.c};
        let ra=0, rc=0; (dd.data[m]||[]).forEach(x=>{ if(!x) return; const ty=String(x.type||'').trim(), tk=String(x.ticket||'').trim(), am=num(x.amount); if(RED.includes(ty)&&(tk!==''||am!==0)){ ra=r2(ra+am); rc++; } });
        const add=(dd.sor2&&dd.sor2.mn===m)?{a:r2(dd.sor2.amt),c:dd.sor2.n}:{a:0,c:0};
        const carry={a:r2(bf.a+add.a-ra),c:bf.c+add.c-rc}; st[m]=carry; res.bf[m]=bf; res.carry[m]=carry;
        red.a=r2(red.a+ra); red.c+=rc; sc.a=r2(sc.a+carry.a); sc.c+=carry.c; sb.a=r2(sb.a+bf.a); sb.c+=bf.c; });
      const ym=i===0?sb:{a:r2(prev.a+delta.a),c:prev.c+delta.c};
      const pl=dd.sor2?{a:r2(dd.sor2.amt),c:dd.sor2.n}:{a:0,c:0};
      const bal={a:r2(ym.a+pl.a-red.a),c:ym.c+pl.c-red.c}; prev=bal; out[k]=Object.assign(res,{ym,red,bal,sc}); });
    return out; };
  const near=(a,b)=>Math.abs(a-b)<0.005;
  const cmp=tag=>{ const o=oracle(), bad=[]; let cells=0;
    days.forEach(k=>{ const dd=db[k], x=o[k], s=SUM(k);
      dd.months.forEach((m,ix)=>{ if(!m) return; cells++; const e=x.bf[m];
        if(!near(num(dd.bf[ix]),e.a)||num(dd.bfCount[ix])!==e.c) bad.push(tag+' '+k+' '+m+' ยกมา '+dd.bf[ix]+'/'+dd.bfCount[ix]+' ควร '+e.a+'/'+e.c);
        const ca=getMonthCarriedBalance(k,m), cc=getMonthCarriedCount(k,m);
        if(!near(ca,x.carry[m].a)||cc!==x.carry[m].c) bad.push(tag+' '+k+' '+m+' ยกไป '+ca+'/'+cc+' ควร '+x.carry[m].a+'/'+x.carry[m].c); });
      [['ย/ม',0,x.ym],['ไถ่ถอน',2,x.red],['คงเหลือ',3,x.bal]].forEach(([lb,r,e])=>{ if(!near(num(s[r].amount),e.a)||num(s[r].count)!==e.c) bad.push(tag+' '+k+' '+lb+' '+s[r].amount+'/'+s[r].count+' ควร '+e.a+'/'+e.c); });
      if(!near(x.bal.a,x.sc.a)||x.bal.c!==x.sc.c) bad.push(tag+' '+k+' (oracle) คงเหลือ≠ยกไปรวม');
      let ma=0, mc=0; dd.months.forEach(m=>{ if(!m) return; ma=r2(ma+getMonthCarriedBalance(k,m)); mc+=getMonthCarriedCount(k,m); });
      if(!near(num(s[3].amount),ma)||num(s[3].count)!==mc) bad.push(tag+' '+k+' คงเหลือในแอป '+s[3].amount+'/'+s[3].count+' ≠ ยกไปรวม '+ma+'/'+mc);
      dd.bf.forEach(v=>{ if(typeof v==='number'&&Math.abs(v*100-Math.round(v*100))>1e-6) bad.push(tag+' '+k+' ทศนิยมเพี้ยน '+v); }); });
    return {bad,cells}; };

  const R={};
  R.build=cmp('สร้าง');
  /* ---------- แก้ย้อนหลังแบบสุ่ม (ทำในวันนั้นแล้วส่งต่อ) แล้วเปิดวันถัดไปตามลำดับ ---------- */
  for(let t=0;t<8;t++){ const i=1+ri(days.length-3), k=days[i]; currentDate=k; renderTable(); const p=present(k); const [m,ix]=p[ri(p.length)];
    const kind=ri(4), rows=db[k].data[m]||(db[k].data[m]=[]);
    if(kind===0){ rows.push({type:'ถ',ticket:String(90000+t),book:'1',amount:String(r2(rnd()*5000)),count:'',origIdx:rows.length,timestamp:''}); }
    else if(kind===1){ const j=rows.findIndex(x=>x&&x.ticket); if(j>=0) rows[j].amount=String(r2(rnd()*9000)); }
    else if(kind===2){ const j=rows.findIndex(x=>x&&x.ticket); if(j>=0) rows[j].type=RED.includes(rows[j].type)?'ต':'ส'; }
    else { if(!(db[k].forfeit&&Object.keys(db[k].forfeit).length)||true){ const a=r2((rnd()-0.5)*8000), c=ri(3)-1; applyBfAdj(ix,String(a),String(c),'แก้ย้อนหลัง'); ev[k].adj[m]={a,c}; } }
    saveDB(); renderTable(); recalculateFutureBroughtForwardBalances(k); stat.retro++;
    for(const kk of days.slice(i)){ openDay(kk); setPledge(kk); await tick(); } }
  R.retro=cmp('แก้ย้อนหลัง');
  /* ---------- คำนวณใหม่ทั้งชุด (เหมือนรวม 2 เครื่อง) ---------- */
  days.forEach(k=>syncBroughtForwardForDate(k,true)); for(const k of days){ openDay(k); setPledge(k); await tick(); }
  R.force=cmp('คำนวณใหม่ทั้งชุด');
  /* ---------- ตัวตรวจความสอดคล้อง: ต้องไม่เตือน ย/ม ผิด ในข้อมูลที่ถูกต้อง ---------- */
  currentDate=days[days.length-1]; const ck=(window.__ckList?window.__ckList():[]).filter(x=>/ย\/ม ไม่ตรง|ไม่ได้แสดงในตาราง|ทศนิยม/.test(x.t)).map(x=>x.date+' '+x.t);
  return {R,stat,ck,alerts:window.__al.slice(0,5)}; }

(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});   /* /dev/shm ในแซนด์บ็อกซ์เล็ก — ไม่ใส่แล้ว Chrome ล่มเมื่อทดสอบนาน */
  let total=0;
  for(const seed of SEEDS){
    const pg=await (await b.newContext()).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,160)));
    await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort()); await pg.goto(URL,{waitUntil:'domcontentloaded'}); await sleep(2500);
    await pg.evaluate(()=>{ document.querySelectorAll('#login-modal').forEach(e=>e.style.display='none'); });
    const r=await pg.evaluate(RUN,{seed,days:DAYS});
    const s=r.stat; console.log(`   seed ${seed}: ${DAYS} วัน · แถว ${s.rows} (มีประเภทแต่ว่าง ${s.blank}) · สธ.2 ${s.sor2} · เพิ่มเดือน ${s.add} · ตัดหลุด ${s.ff} · ยอดปรับ ${s.adj} · แก้ย้อนหลัง ${s.retro}`);
    for(const ph of ['build','retro','force']){ const x=r.R[ph]; total+=x.cells; ok(!x.bad.length,`seed ${seed} · ${ph}: ${x.cells} ช่องเดือน-วัน ตรงกับตัวคำนวณอิสระ`+(x.bad.length?' · '+x.bad.length+' จุด: '+x.bad.slice(0,4).join(' | '):'')); }
    ok(!r.ck.length,`seed ${seed} · ตัวตรวจความสอดคล้องไม่เตือนผิด`+(r.ck.length?' · '+r.ck.slice(0,3).join(' | '):''));
    ok(!errs.length,`seed ${seed} · ไม่มี error `+errs.slice(0,2).join(' | '));
    await pg.close();
  }
  console.log(`   รวมตรวจ ${total} ช่องเดือน-วัน`);
  await b.close(); console.log(fail?`❌ ล้มเหลว ${fail}`:'✅ ผ่านทั้งหมด'); process.exit(fail?1:0);
})();
