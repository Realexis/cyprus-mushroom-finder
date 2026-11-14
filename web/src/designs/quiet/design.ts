import "@fontsource-variable/lexend/wght.css";
import type { Design } from "../types";

// Quiet. Lots of air, very little ink. Cool porcelain white, one deep green, thin lines only where
// two things must be told apart. Lexend type (made to ease reading), light weights at large sizes.
// Buttons become plain rows. The map is almost blank so the one green scale carries everything.
export default {
  id: "quiet",
  name: "Quiet",
  idea: "Calm and airy: porcelain white, one deep green, light type, plain rows, an almost blank map.",
  order: 5,
  theme: "light",
  themeColor: "#fbfcfa",
  icons: "line",
  scoreStops: [[0, "#dfe8db"], [30, "#bcd2ba"], [50, "#8bb692"], [65, "#4c986b"], [80, "#1d774d"], [100, "#0a4630"]],
  map: {
    base: "white",
    flavor: {
      background: "#f4f6f3", earth: "#f4f6f3", water: "#dde6e8",
      wood_a: "#eef1ec", wood_b: "#eef1ec", scrub_a: "#f0f3ee", scrub_b: "#f0f3ee", park_a: "#eef1ec", park_b: "#eef1ec",
      buildings: "#e3e6e1", sand: "#f1f2ec", beach: "#f1f2ec",
      city_label: "#17211c", city_label_halo: "#f4f6f3", subplace_label: "#5b665f", subplace_label_halo: "#f4f6f3",
      ocean_label: "#8aa0a6",
    },
    hillshade: { exaggeration: 0.3, shadow: "#7d857f", highlight: "#ffffff", accent: "#b4bbb5" },
    cellOpacity: [0, 0.7, 50, 0.8, 65, 0.9, 80, 0.96],
    selection: { halo: "#ffffff", core: "#17211c" },
    reserve: { fill: "rgba(90,100,95,0.12)", stroke: "rgba(60,70,65,0.7)", line: "#5b665f", label: "#17211c", labelHalo: "#ffffff" },
  },
} satisfies Design;
