#!/usr/bin/env bash
# สร้าง CSS ของ Tailwind แบบฝังในหน้า (แทนการโหลดจาก cdn.tailwindcss.com ทุกครั้ง)
# ทำเมื่อมีการเพิ่ม/เปลี่ยนคลาส Tailwind ในซอร์ส:  bash tools/build-tailwind.sh   (รันในโฟลเดอร์ source/)
# ต้องมี node + npm (โหลด tailwindcss@3.4.17 ผ่าน npx) และ Playwright + Chrome สำหรับขั้นเก็บคลาสตอนรันจริง
set -euo pipefail
cd "$(dirname "$0")/.."
TMP=$(mktemp -d)
# 1) สร้างหน้าชั่วคราวจากซอร์สปัจจุบัน แล้วเก็บคลาสที่เกิดตอนรัน
python3 tools/build.py "$TMP/index.html" >/dev/null
( cd tools/tailwind && node collect-classes.js "$TMP/index.html" extra-classes.txt )
# 2) สร้าง CSS (ย่อขนาด)
( cd tools/tailwind && npx --yes tailwindcss@3.4.17 -c tailwind.config.js -i input.css -o "$TMP/tw.css" --minify >/dev/null 2>&1 )
# 3) ห่อเป็นไฟล์ที่ build.py ฝังไว้ท้าย <head> (ตำแหน่งเดียวกับที่ CDN เคยแทรก <style> เพื่อให้ลำดับ cascade เหมือนเดิม)
{ printf '<style id="tw-inline">'; cat "$TMP/tw.css"; printf '</style>\n'; } > src/libs/17a-tailwind-inline.css.html
echo "สร้าง src/libs/17a-tailwind-inline.css.html ($(wc -c < src/libs/17a-tailwind-inline.css.html) ไบต์)"
