# Greek test copy (started 19 Nov 2026)

A separate test copy of Shroomy in Greek. It is **not** the live site and has **no automatic update**.

- **Test site:** https://realexis.github.io/shroomy-el/ (GitHub project `Realexis/shroomy-el`, branch `gh-pages`)
- **Code:** branch `greek` of `Realexis/cyprus-mushroom-finder` (cut from `lab`)
- **Words and their sources:** `docs/GLOSSARY-el.md`
- **Not checked by a native speaker.**

## How the two languages work

- One build = one language. `VITE_LANG=el` builds Greek. No setting builds English, as before.
- All text of the screens is in `web/src/i18n/en.ts` (English, the master copy) and `web/src/i18n/el.ts` (Greek).
  TypeScript stops the build if a Greek text is missing.
- The text of `index.html` and `about.html` stays English in those files. `web/src/i18n/html.el.ts` holds the
  Greek for each piece, and `web/vite.config.ts` swaps them in when building Greek. If an English piece
  changes, the Greek build stops and names it.
- Dates, month names and decimal commas follow the language (`el-CY`).
- Place names on the base map are shown in Greek where OpenStreetMap has them.
- `web/scripts/check-words.mjs` (part of every build) also bans the Greek words for "edible", "is eaten",
  "safe" and "mushroom map".

## Still in English in the Greek copy

- The exact credit lines and licence names on the About page (legal text, kept as written).
- Photo credits from iNaturalist (kept as written).
- The names of the seven nature reserves on the map (no official Greek list found).
- Latin names, "Beta", and unit symbols (m, km, mm, °C).

## How to publish the test copy by hand

No weather is fetched. The data is copied from the English robot's folder (read only).

```bash
# 1. data and map tiles (never saved in git)
cp ~/Library/Application\ Support/shroomy-lab-robot/repo/web/public/data/* web/public/data/
cp /Users/realexis/Desktop/WORK/Claude_Code/shroomy-lab/web/public/tiles/*.pmtiles web/public/tiles/

# 2. build: Greek, visit counter off, search engines asked to skip it
npm --prefix web run build:el-test

# 3. copy web/dist/ into a clone of Realexis/shroomy-el (branch gh-pages), keep .nojekyll and README.md,
#    commit and push. Never a force-push.
```

## Before this goes into the live site (not done)

- A native speaker reads the Greek.
- Decide how visitors choose the language (for example a second build under `/el/` and a link in the header).
- The daily robot would need to build both languages.
