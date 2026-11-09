#!/usr/bin/env python3
"""One-time splitter: index_base.html -> src/ parts + manifest. Lossless by construction."""
import re, os, sys, shutil, hashlib
SRC='/home/claude/fb/index_base38.html'
OUT='/home/claude/fb/proj/src'
if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(OUT+'/assets')
t=open(SRC,encoding='utf-8').read()
# 1) pull out huge base64 payloads (data URIs and giant script bodies) into assets with placeholders
blobs={}
def stash(m):
    s=m.group(0); h=hashlib.sha1(s.encode()).hexdigest()[:8]
    if h not in blobs: blobs[h]=s
    return '@@BLOB:%s@@'%h
t=re.sub(r'data:[a-z/+\-.]+;base64,[A-Za-z0-9+/=]{20000,}',stash,t)
# giant script bodies (pdf.js embedded as base64)
def stash_body(m):
    head,body,tail=m.group(1),m.group(2),m.group(3)
    if len(body)>100000 and re.fullmatch(r'[\sA-Za-z0-9+/=\'"`;:\-_.,()\[\]{}\\]*',body):
        return head+stash(re.match(r'.*',body,re.S))+tail
    return m.group(0)
t=re.sub(r'(<script\b[^>]*>)(.*?)(</script>)',stash_body,t,flags=re.S)
for h,s in blobs.items():
    open(f'{OUT}/assets/blob-{h}.txt','w',encoding='utf-8',newline='').write(s)
# 2) split into segments
pat=re.compile(r'<(style|script)\b[^>]*>.*?</\1>',re.S)
segs=[];pos=0
for m in pat.finditer(t):
    if m.start()>pos: segs.append(('html',t[pos:m.start()]))
    segs.append((m.group(1),m.group(0)));pos=m.end()
segs.append(('html',t[pos:]))
def slug(kind,txt,i):
    m=re.search(r'\bid="([^"]+)"',txt[:300])
    if m: return re.sub(r'[^A-Za-z0-9_-]+','-',m.group(1))
    return ''
manifest=[]
for i,(k,v) in enumerate(segs):
    ext={'html':'html','style':'css.html','script':'js.html'}[k]
    sl=slug(k,v,i)
    name=f'{i:03d}-{k}'+(f'-{sl}' if sl else '')+'.'+ext
    open(f'{OUT}/{name}','w',encoding='utf-8',newline='').write(v)
    manifest.append(name)
open(OUT+'/manifest.txt','w').write('\n'.join(manifest)+'\n')
print(len(manifest),'parts',len(blobs),'blobs')
