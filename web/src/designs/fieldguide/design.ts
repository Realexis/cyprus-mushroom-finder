import "@fontsource-variable/literata/wght.css";
import "@fontsource-variable/literata/wght-italic.css";
import type { Design } from "../types";

// A printed nature guide. Serif type (Literata, made for long reading), white paper, ink rules
// instead of boxes, photos as small plates, the colour key as a printed map key.
// Score colours: straw to deep red-brown, light to dark, like ink density on paper.
export default {
  id: "fieldguide",
  name: "Field Guide",
  idea: "A printed nature guide: serif type, white paper, ink rules, no boxes or shadows.",
  order: 1,
  theme: "light",
  themeColor: "#ffffff",
  icons: "line",
  scoreStops: [[0, "#ecdfb4"], [30, "#e4c97f"], [50, "#d9a24a"], [65, "#c97329"], [80, "#a83e1c"], [100, "#6e1414"]],
  map: {
    base: "light",
    flavor: {
      background: "#f7f6f0", earth: "#f7f6f0", water: "#cddbe0",
      wood_a: "#ecefdf", wood_b: "#ecefdf", scrub_a: "#f0f1e4", scrub_b: "#f0f1e4", park_a: "#ecefdf", park_b: "#ecefdf",
      buildings: "#dcd9cc", sand: "#f1ecd9", beach: "#f1ecd9",
      highway: "#ffffff", major: "#ffffff", minor_a: "#ffffff", minor_b: "#ffffff", other: "#e9e6da",
      highway_casing_late: "#9a9686", major_casing_late: "#aeaa9a", minor_casing: "#c4c0b1",
      city_label: "#14231c", city_label_halo: "#f7f6f0", subplace_label: "#46544b", subplace_label_halo: "#f7f6f0",
      roads_label_major: "#46544b", roads_label_major_halo: "#f7f6f0", roads_label_minor: "#6a766e", roads_label_minor_halo: "#f7f6f0",
      ocean_label: "#6f8a93",
    },
    hillshade: { exaggeration: 0.6, shadow: "#6b6654", highlight: "#ffffff", accent: "#a39d87" },
    cellOpacity: [0, 0.7, 50, 0.78, 65, 0.88, 80, 0.95],
    selection: { halo: "#ffffff", core: "#14231c" },
    reserve: { fill: "rgba(120,126,123,0.22)", stroke: "rgba(40,50,45,0.8)", line: "#3a443e", label: "#14231c", labelHalo: "#ffffff" },
  },
} satisfies Design;
