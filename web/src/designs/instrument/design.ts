import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import "@fontsource-variable/atkinson-hyperlegible-mono/wght.css";
import type { Design } from "../types";

// A measuring instrument. The number comes first, with a gauge that shows where it sits on the scale.
// Graphite panel, hairlines, square corners, facts as a table. Atkinson Hyperlegible Next for text,
// its Mono cut for readings. Score colours: blue to yellow (a scale built for colour-blind eyes).
export default {
  id: "instrument",
  name: "Instrument",
  idea: "A precise measuring device: the number first, a gauge, tight graphite panels.",
  order: 2,
  theme: "dark",
  themeColor: "#1b1f25",
  icons: "line",
  scoreStops: [[0, "#0b2a66"], [30, "#3d5a8c"], [50, "#7f8793"], [65, "#b5a878"], [80, "#dcc45a"], [100, "#ffe93b"]],
  map: {
    base: "dark",
    flavor: {
      background: "#101317", earth: "#191d22", water: "#0b0e12",
      wood_a: "#1c2127", wood_b: "#1c2127", scrub_a: "#1b1f25", scrub_b: "#1b1f25", park_a: "#1c2127", park_b: "#1c2127",
      buildings: "#262b33", ocean_label: "#5c6877",
      city_label: "#eef1f4", city_label_halo: "#101317", subplace_label: "#a8b1bd", subplace_label_halo: "#101317",
      roads_label_minor: "#8a94a1", roads_label_minor_halo: "#101317", roads_label_major: "#a8b1bd", roads_label_major_halo: "#101317",
    },
    hillshade: { exaggeration: 0.5, shadow: "#000000", highlight: "#3c444e", accent: "#101317" },
    selection: { halo: "#101317", core: "#ffffff" },
    reserve: { fill: "rgba(150,158,168,0.28)", stroke: "rgba(225,230,236,0.85)", line: "#d5dbe2", label: "#f2f4f6", labelHalo: "#30363f" },
  },
} satisfies Design;
