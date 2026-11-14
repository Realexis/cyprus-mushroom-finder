import "@fontsource-variable/schibsted-grotesk/wght.css";
import type { Design } from "../types";

// A Swiss poster. White, black, and one red kept for danger. Very large, tight headline type on a
// strict left edge, heavy black rules between parts, no corners, no shadows, no small pictures.
// The map goes grey so the one blue scale (pale to midnight) is the only colour on it.
export default {
  id: "swiss",
  name: "Swiss Grid",
  idea: "A Swiss poster: white, black and one red; huge tight type, heavy rules, grey map with one blue scale.",
  order: 4,
  theme: "light",
  themeColor: "#ffffff",
  icons: "line",
  scoreStops: [[0, "#dbe4f3"], [30, "#b0c4e8"], [50, "#7797dc"], [65, "#3b68d2"], [80, "#1740b0"], [100, "#081a5e"]],
  map: {
    base: "grayscale",
    flavor: {
      background: "#ffffff", earth: "#f3f3f3", water: "#d6d9dc",
      wood_a: "#ebebeb", wood_b: "#ebebeb", scrub_a: "#eeeeee", scrub_b: "#eeeeee", park_a: "#ebebeb", park_b: "#ebebeb",
      buildings: "#dcdcdc",
      city_label: "#000000", city_label_halo: "#ffffff", subplace_label: "#3c3c3c", subplace_label_halo: "#ffffff",
    },
    hillshade: { exaggeration: 0.4, shadow: "#555555", highlight: "#ffffff", accent: "#999999" },
    cellOpacity: [0, 0.75, 50, 0.82, 65, 0.9, 80, 0.96],
    selection: { halo: "#ffffff", core: "#e4002b" },
    reserve: { fill: "rgba(0,0,0,0.06)", stroke: "rgba(0,0,0,0.85)", line: "#000000", label: "#000000", labelHalo: "#ffffff" },
  },
} satisfies Design;
