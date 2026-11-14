import "@fontsource-variable/bricolage-grotesque/wght.css";
import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import type { Design } from "../types";

// Signal. Loud and unmissable: black and warning yellow, very heavy headlines (Bricolage Grotesque),
// thick black outlines, hard-edged blocks. The rating fills a whole block with its score colour.
// The map is grey and the scale is one pink-to-plum ramp, so no map colour repeats the yellow.
export default {
  id: "signal",
  name: "Signal",
  idea: "Bold high contrast: black and warning yellow, heavy type, thick outlines, the rating as a colour block.",
  order: 6,
  theme: "light",
  themeColor: "#ffd60a",
  icons: "line",
  scoreStops: [[0, "#fbe1ee"], [30, "#f5a6ca"], [50, "#eb5ea3"], [65, "#d61c80"], [80, "#990f69"], [100, "#450634"]],
  map: {
    base: "grayscale",
    flavor: {
      background: "#f2f2f2", earth: "#f2f2f2", water: "#c9cdd1",
      wood_a: "#e7e7e7", wood_b: "#e7e7e7", scrub_a: "#ebebeb", scrub_b: "#ebebeb", park_a: "#e7e7e7", park_b: "#e7e7e7",
      buildings: "#d5d5d5",
      city_label: "#000000", city_label_halo: "#ffffff", subplace_label: "#333333", subplace_label_halo: "#ffffff",
    },
    hillshade: { exaggeration: 0.45, shadow: "#444444", highlight: "#ffffff", accent: "#909090" },
    cellOpacity: [0, 0.8, 50, 0.86, 65, 0.92, 80, 0.97],
    selection: { halo: "#ffd60a", core: "#000000" },
    reserve: { fill: "rgba(0,0,0,0.08)", stroke: "rgba(0,0,0,0.9)", line: "#000000", label: "#000000", labelHalo: "#ffd60a" },
  },
} satisfies Design;
