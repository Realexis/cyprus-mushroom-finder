// Basemap style: Protomaps OSM vector tiles, recoloured into our own calm palette.
import { layers, namedFlavor, type Flavor } from "@protomaps/basemaps";
import type { StyleSpecification } from "maplibre-gl";

export type Theme = "dark" | "light";

const ASSETS = "https://protomaps.github.io/basemaps-assets";

function flavor(theme: Theme): Flavor {
  if (theme === "dark") {
    return {
      ...namedFlavor("dark"),
      background: "#0c1612", earth: "#1c2722", water: "#0b1a1f",
      wood_a: "#1f2c24", wood_b: "#1f2c24", scrub_a: "#1e2a23", scrub_b: "#1e2a23",
      park_a: "#1f2c24", park_b: "#1f2c24",
      buildings: "#26322c", ocean_label: "#4f6f78",
      city_label: "#e9efe6", city_label_halo: "#0c1612",
      subplace_label: "#a9b8ad", subplace_label_halo: "#0c1612",
      roads_label_minor: "#8d9c92", roads_label_minor_halo: "#0c1612",
      roads_label_major: "#b3c0b6", roads_label_major_halo: "#0c1612",
      boundaries: "#5b6b62",
    };
  }
  return {
    ...namedFlavor("light"),
    background: "#f3f0e7", earth: "#ece7da", water: "#bfd6dc",
    wood_a: "#e1e3cf", wood_b: "#e1e3cf", scrub_a: "#e6e5d3", scrub_b: "#e6e5d3",
    park_a: "#e1e3cf", park_b: "#e1e3cf", buildings: "#dcd5c6",
    city_label: "#1b2620", city_label_halo: "#f3f0e7",
    subplace_label: "#4f5f55", subplace_label_halo: "#f3f0e7",
  };
}

export function baseStyle(theme: Theme, basemapUrl: string): StyleSpecification {
  return {
    version: 8,
    glyphs: `${ASSETS}/fonts/{fontstack}/{range}.pbf`,
    sprite: `${ASSETS}/sprites/v4/${theme}`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${basemapUrl}`,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
    // Neutral map: no country names or country borders (this map is about forests).
    layers: (layers("protomaps", flavor(theme), { lang: "en" }) as StyleSpecification["layers"])
      .filter((l) => !/country|boundaries/.test(l.id)),
  };
}
