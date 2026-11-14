// One design = one folder in src/designs/: design.ts (this shape) and, if it wants, design.css.
// A new folder shows up in the picker by itself. See src/designs/README.md.
import type { Flavor } from "@protomaps/basemaps";

export type Stops = [number, string][];

/** How the map itself looks in a design. */
export interface MapLook {
  /** The Protomaps base map to start from (also picks the map's small icons). */
  base: "light" | "dark" | "white" | "grayscale" | "black";
  /** Base map colours changed on top of `base` (land, water, forest, roads, place names). */
  flavor: Partial<Flavor>;
  /** Hills and valleys. */
  hillshade: { exaggeration: number; shadow: string; highlight: string; accent: string };
  /** How solid a square is drawn, as "score, opacity" pairs. Default: 0 .62, 50 .7, 65 .85, 80 .95. */
  cellOpacity?: number[];
  /** Outline of the tapped square. */
  selection: { halo: string; core: string };
  /** Closed nature reserves: hatch background and lines, outline, name. */
  reserve: { fill: string; stroke: string; line: string; label: string; labelHalo: string };
}

export interface Design {
  id: string;
  /** Short plain name, shown in the picker. */
  name: string;
  /** One line on the idea. */
  idea: string;
  /** Place in the picker (0 = the original). */
  order: number;
  /** Light or dark page. Leave out to follow the phone (the original does). */
  theme?: "light" | "dark";
  /** Colour of the phone's browser bar. */
  themeColor?: string;
  /** "emoji" = the original's emoji. "line" = drawn line icons. */
  icons: "emoji" | "line";
  /** The design's own score colours (0-100). Leave out to keep the original scale.
   *  The 250 m squares, the 50 m heat map, the colour key and the card all read this one list. */
  scoreStops?: Stops;
  map?: MapLook;
}
