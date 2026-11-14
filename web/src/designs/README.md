# Designs (look-and-feel exploration)

Same features, same data, same numbers. Only the look changes.

## Switch
- Web address: `?design=<id>` (for example `?design=swiss`). The choice is remembered, so About keeps it.
- On the page: the dark bar on top (previous, list, next). `?picker=0` hides it. `VITE_DESIGN_PICKER=off` removes it from a build.

## Add a design = add one folder
`src/designs/<id>/design.ts` (see `types.ts`) and, if wanted, `design.css`. Nothing else to register.

- `design.ts`: name, one-line idea, order, light or dark, icons, its own score colours (`scoreStops`), and the map look
  (base map colours, hills, outline of the tapped square, closed reserves). Fonts are imported here (free, bundled).
- `design.css`: everything inside `html:root[data-design="<id>"] { ... }`. Set the colour and type settings first, then
  only what makes the design itself. `shared.css` already maps corners to `--r-s/-m/-l/-pill` and gives line icons.

## One colour scale = one meaning
`scoreStops` is read by the 250 m squares, the colour key, the card's colour chip and the 50 m heat map.
The heat map picture has the original colours baked in; `map/recolor.ts` swaps them for the design's colours of the
same score in the browser. A design that goes live should get its own picture from `scripts/lab-heat50.py`.
Keep a scale going one way in brightness (light to dark, or dark to light), so colour-blind eyes can read it.

## Design 0
`original/` has no styles and no colours of its own: it is the Lab as backed up on 14 Nov 2026.
