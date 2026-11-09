# Pawn ledger (สถานธนานุบาล) — source layout

Output is ONE `index.html` (GitHub Pages unchanged). Edit parts, then build:

    python3 tools/build.py            # -> dist/index.html
    python3 tools/build.py /path/out.html

Order matters (CSS overrides win by position). `src/manifest.txt` is the exact order;
file number prefix = position. Folders only group by purpose:

- src/head      <head> start, meta, fonts
- src/libs      external/embedded libraries (Tailwind, Firebase SDK, pdf.js)
- src/styles    base CSS (02) and styles/overrides (layered tweaks, later wins)
- src/markup    login modal + page body markup
- src/app       core: main script (ledger/formulas), settings, dialogs
- src/features  versioned feature scripts (v1.2 … v1.10) and small add-ons
- src/sync      Firebase/Firestore sync
- src/assets    big base64 blobs (referenced as @@BLOB:xxxxxxxx@@)
- modules/      newer modules appended before </body> in modules/order.txt
                (sor2, assets, quickkey, storage, mobile, backup, netstate, swreg)
- tools/        split.py (one-time splitter), reorg.py (rename), build.py

Check: build output must `cmp` identical to the deployed index.html.
