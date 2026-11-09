#!/usr/bin/env python3
"""Build index.html from src/ (manifest order) + modules/ (appended before </body>, in order)."""
import re, os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=ROOT+'/src'; MOD=ROOT+'/modules'
def read(p): return open(p,encoding='utf-8',newline='').read()
parts=[l.strip() for l in open(SRC+'/manifest.txt') if l.strip()]
t=''.join(read(f'{SRC}/{p}') for p in parts)
t=re.sub(r'@@BLOB:([0-9a-f]{8})@@',lambda m:read(f'{SRC}/assets/blob-{m.group(1)}.txt'),t)
mods=[l.strip() for l in open(MOD+'/order.txt') if l.strip() and not l.startswith('#')]
for m in mods:
    t=t.replace('</body>',read(f'{MOD}/{m}')+'\n</body>')
out=sys.argv[1] if len(sys.argv)>1 else ROOT+'/dist/index.html'
os.makedirs(os.path.dirname(out),exist_ok=True)
open(out,'w',encoding='utf-8',newline='').write(t)
print('built',out,len(t))
