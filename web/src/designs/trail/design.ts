import "@fontsource-variable/overpass/wght.css";
import type { Design } from "../types";

// Outdoor gear at night. Deep navy terrain with strong relief, a cool glowing scale (navy to teal to
// ice), amber only for warnings, like the label on a headlamp. Overpass type (drawn from road-sign
// lettering), chunky buttons with thick outlines, a panel with a grab handle.
export default {
  id: "trail",
  name: "Night Trail",
  idea: "Dark outdoor-gear look: navy relief map, glowing cool scale, amber warnings, chunky buttons.",
  order: 3,
  theme: "dark",
  themeColor: "#101827",
  icons: "line",
  scoreStops: [[0, "#1b1d44"], [30, "#2b4279"], [50, "#2f77a3"], [65, "#35a7ad"], [80, "#74d6b2"], [100, "#eafbd7"]],
  map: {
    base: "dark",
    flavor: {
      background: "#0a0f1a", earth: "#141c2b", water: "#070b14",
      wood_a: "#172133", wood_b: "#172133", scrub_a: "#161f30", scrub_b: "#161f30", park_a: "#172133", park_b: "#172133",
      buildings: "#232e45", ocean_label: "#4d6187",
      city_label: "#f3efe6", city_label_halo: "#0a0f1a", subplace_label: "#aab4c8", subplace_label_halo: "#0a0f1a",
      roads_label_minor: "#8c98b0", roads_label_minor_halo: "#0a0f1a", roads_label_major: "#aab4c8", roads_label_major_halo: "#0a0f1a",
    },
    hillshade: { exaggeration: 0.85, shadow: "#02040a", highlight: "#4a5c82", accent: "#0a0f1a" },
    cellOpacity: [0, 0.55, 50, 0.72, 65, 0.88, 80, 0.96],
    selection: { halo: "#0a0f1a", core: "#ffb454" },
    reserve: { fill: "rgba(150,160,180,0.28)", stroke: "rgba(230,234,242,0.85)", line: "#dfe4ee", label: "#f3efe6", labelHalo: "#2a3550" },
  },
} satisfies Design;
