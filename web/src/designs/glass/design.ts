import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import type { Design } from "../types";

// A weather app. The map fills the whole screen at dusk; the header, the safety line and the panel
// float on it as frosted glass. The rating reads like a temperature: one huge light number.
// Score colours: plum to ember to pale gold, dark to light, so good squares glow.
export default {
  id: "glass",
  name: "Dusk Glass",
  idea: "A weather-app look: full-screen dusk map, floating frosted panels, the score as one huge number.",
  order: 7,
  theme: "dark",
  themeColor: "#1c2033",
  icons: "line",
  scoreStops: [[0, "#2f1463"], [30, "#632183"], [50, "#aa337d"], [65, "#e2566a"], [80, "#fb9366"], [100, "#fdf3b4"]],
  map: {
    base: "dark",
    flavor: {
      background: "#171a2a", earth: "#22263a", water: "#12141f",
      wood_a: "#262b41", wood_b: "#262b41", scrub_a: "#24293e", scrub_b: "#24293e", park_a: "#262b41", park_b: "#262b41",
      buildings: "#30364f", ocean_label: "#5d668c",
      city_label: "#ffffff", city_label_halo: "#171a2a", subplace_label: "#c3c9de", subplace_label_halo: "#171a2a",
      roads_label_minor: "#9aa2bd", roads_label_minor_halo: "#171a2a", roads_label_major: "#c3c9de", roads_label_major_halo: "#171a2a",
    },
    hillshade: { exaggeration: 0.6, shadow: "#080912", highlight: "#525a80", accent: "#171a2a" },
    cellOpacity: [0, 0.6, 50, 0.75, 65, 0.9, 80, 0.97],
    selection: { halo: "#171a2a", core: "#ffffff" },
    reserve: { fill: "rgba(160,168,196,0.26)", stroke: "rgba(232,235,246,0.85)", line: "#dde1f0", label: "#ffffff", labelHalo: "#30364f" },
  },
} satisfies Design;
