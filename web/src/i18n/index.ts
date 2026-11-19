// The language of this build. One build = one language, chosen when the site is built:
//   VITE_LANG=el npm run build   -> Greek        (no setting -> English, as before)
// The text of index.html and about.html is swapped at build time too (vite.config.ts + html.el.ts),
// so the page title, the share text and the first paint are already in the right language.
import { en, type Strings } from "./en";
import { el } from "./el";

export type Lang = "en" | "el";
export const LANG: Lang = import.meta.env.VITE_LANG === "el" ? "el" : "en";
export const T: Strings = LANG === "el" ? el : en;
export type { FieldNotes, SpeciesText, Strings } from "./en";
