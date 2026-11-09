/* Service worker ของระบบบัญชีสถานธนานุบาล
   เป้าหมาย: เปิดโปรแกรมได้แม้เน็ตหลุด โดยไม่ติดไฟล์เวอร์ชันเก่า
   - หน้าเว็บ/ไฟล์ของเราเอง: ดึงจากเน็ตก่อนเสมอ (ข้ามแคช HTTP) ถ้าเน็ตล่มค่อยใช้ที่จำไว้
   - ไลบรารีภายนอก (Tailwind, ไอคอน, ฟอนต์, Firebase SDK): ใช้ที่จำไว้ก่อน แล้วอัปเดตเบื้องหลัง
   - คำสั่งคุยกับ Firebase (Firestore/Auth) ไม่แตะเลย ปล่อยผ่านตามปกติ */
var VERSION = 'v1';
var SHELL = 'pawn-shell-' + VERSION;
var LIBS  = 'pawn-libs-' + VERSION;
var LIB_HOSTS = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
var LIB_URLS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];
var NET_TIMEOUT = 8000;

function isLib(u){
  if (LIB_HOSTS.indexOf(u.hostname) >= 0) return true;
  return u.hostname === 'www.gstatic.com' && u.pathname.indexOf('/firebasejs/') === 0;
}
function okToStore(res){ return res && (res.ok || res.type === 'opaque'); }

self.addEventListener('install', function(e){
  e.waitUntil((async function(){
    var shell = await caches.open(SHELL), libs = await caches.open(LIBS);
    /* จำหน้าเว็บและไลบรารีไว้ตั้งแต่ครั้งแรก (พลาดบางไฟล์ไม่เป็นไร ครั้งต่อไปจะจำเพิ่มเอง) */
    await Promise.all([
      shell.add(new Request(self.registration.scope, {cache: 'reload'})).catch(function(){}),
      shell.add(new Request(new URL('firebase-config.js', self.registration.scope).href, {cache: 'reload'})).catch(function(){})
    ].concat(LIB_URLS.map(function(u){
      return fetch(new Request(u, {mode: 'no-cors'})).then(function(r){ if (okToStore(r)) return libs.put(u, r); }).catch(function(){});
    })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    var keys = await caches.keys();
    await Promise.all(keys.filter(function(k){ return k !== SHELL && k !== LIBS && /^pawn-(shell|libs)-/.test(k); }).map(function(k){ return caches.delete(k); }));
    await self.clients.claim();
  })());
});

function timeout(ms){ return new Promise(function(_, rej){ setTimeout(function(){ rej(new Error('timeout')); }, ms); }); }

async function networkFirst(req){
  var cache = await caches.open(SHELL);
  try {
    var res = await Promise.race([fetch(req, {cache: 'reload'}), timeout(NET_TIMEOUT)]);
    if (res && res.ok) cache.put(req, res.clone()).catch(function(){});
    return res;
  } catch (err) {
    var hit = await cache.match(req, {ignoreSearch: true});
    if (hit) return hit;
    if (req.mode === 'navigate') { hit = await cache.match(self.registration.scope); if (hit) return hit; }
    throw err;
  }
}

async function staleWhileRevalidate(req){
  var cache = await caches.open(LIBS);
  var hit = await cache.match(req);
  var update = fetch(req).then(function(res){ if (okToStore(res)) cache.put(req, res.clone()).catch(function(){}); return res; }).catch(function(){ return null; });
  if (hit) return hit;
  var res = await update;
  if (res) return res;
  return Response.error();
}

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (u.pathname.slice(-6) === '/sw.js') return;                // ไม่แตะตัวมันเอง
    e.respondWith(networkFirst(req));
  } else if (isLib(u)) {
    e.respondWith(staleWhileRevalidate(req));
  }
  /* ที่เหลือ (Firestore, Auth ฯลฯ) ปล่อยผ่านตามปกติ */
});
