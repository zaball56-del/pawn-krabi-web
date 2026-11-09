import os,re,shutil
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));S=R+'/src';N=R+'/src2'
parts=[l.strip() for l in open(S+'/manifest.txt') if l.strip()]
names={ # number -> (folder, name)
1:('libs','tailwind-cdn'),3:('styles','base'),5:('libs','firebase-config'),7:('libs','firebase-app'),9:('libs','firebase-auth'),
11:('libs','firebase-firestore'),13:('styles/overrides','sidebar-scrollbar'),15:('styles/overrides','sidebar-popup'),
17:('styles/overrides','header-bar'),19:('styles/overrides','header-white'),20:('styles/overrides','home-bright'),
22:('styles/overrides','home-onepage'),23:('styles/overrides','home-gradient'),24:('styles/overrides','home-mobile'),
25:('styles/overrides','mobile-fix'),26:('styles/overrides','header-3'),28:('styles/overrides','custody-hint'),
29:('markup','login-and-body'),30:('libs','pdfjs-cdn'),32:('app','main'),34:('app','desktop-update-button'),
36:('app','settings'),38:('libs','pdfjs-embedded-main'),40:('libs','pdfjs-embedded-worker'),42:('libs','pdfjs-fallback-loader'),
44:('app','dialogs'),46:('features','v1.2-monthly-summary'),48:('features','v1.3-close-day-advances'),
50:('features','v1.4-number-guard'),52:('features','v1.5-history-lock'),54:('features','v1.6-quickkey-validation'),
56:('features','v1.7-undo-redo-restore'),58:('features','v1.8-home-summary'),60:('features','v1.10-pin-keypad'),
62:('features','safe-entry'),64:('features','tidy-buttons'),66:('features','home-banner'),68:('features','quickkey-preview'),
70:('features','page-info-layout'),72:('features','pc-cards'),74:('features','gold-timeline'),76:('features','quickkey-amount-lookup'),
78:('features','custody'),80:('sync','firebase-sync'),82:('features','prune-old-data'),84:('styles/overrides','sidebar-groups'),
86:('features','sidebar-groups'),88:('styles/overrides','sidebar-row'),89:('styles/overrides','sidebar-leftpill'),
90:('styles/overrides','perks'),92:('features','perks'),94:('styles/overrides','header-2'),96:('features','header-2')}
# group: each named block absorbs following html filler(s); html parts w/o name merge into previous
groups=[] # [folder,name,ext,[files]]
for p in parts:
    n=int(p[:3])
    if n in names:
        f,nm=names[n]; ext='css.html' if p.endswith('.css.html') else 'js.html'
        if f.startswith('markup'): ext='html'
        groups.append([f,nm,ext,[p]])
    else:
        if groups: groups[-1][3].append(p)
        else: groups.append(['head','head','html',[p]])
# unique names
seen={};out=[]
os.makedirs(N,exist_ok=True)
for i,(f,nm,ext,fs) in enumerate(groups):
    rel=f'{f}/{i:02d}-{nm}.{ext}'
    os.makedirs(os.path.dirname(f'{N}/{rel}'),exist_ok=True)
    with open(f'{N}/{rel}','w',encoding='utf-8',newline='') as o:
        for x in fs: o.write(open(f'{S}/{x}',encoding='utf-8',newline='').read())
    out.append(rel)
open(N+'/manifest.txt','w').write('\n'.join(out)+'\n')
shutil.copytree(S+'/assets',N+'/assets')
print(len(out),'files')
