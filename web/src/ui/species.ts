// The target species (from config/species.yaml via species.json): trees, altitude bands and
// season months. Shroomy Lite uses them only to list what is in season on a tapped square.
import data from "../generated/species.json";

export interface Species {
  code: string; latin: string; common: string;
  trees: number[]; bands: number[]; months: number[]; season_text: string;
}

export const SPECIES = data.species as Species[];

/** Species whose trees and altitude band fit this square and whose season includes this month. */
export function inSeasonHere(tree: number, band: number, month: number): Species[] {
  return SPECIES.filter((s) => s.trees.includes(tree) && s.bands.includes(band) && s.months.includes(month));
}
