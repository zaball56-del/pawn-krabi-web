// ตั้งค่า Tailwind แบบเดียวกับที่ CDN (Play CDN v3) ใช้ = ค่าเริ่มต้นทั้งหมด
// สแกนเฉพาะซอร์ส (ไม่สแกน CSS ที่สร้างเองเพื่อกันวนซ้ำ) + รายชื่อคลาสที่เกิดตอนรันจริง
module.exports={
  content:[
    '../../src/**/*.html','../../modules/*.html','./extra-classes.txt',
    '!../../src/libs/17a-tailwind-inline.css.html'
  ],
  theme:{extend:{}}, plugins:[]
};
