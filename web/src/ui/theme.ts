import type { Theme } from "../map/style";
import { activeDesign } from "../designs";

/** Light or dark, from the phone's own setting (or ?theme=light|dark in the web address). */
export const systemTheme = (): Theme => (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", activeDesign.themeColor ?? (t === "dark" ? "#14211b" : "#fffdf8"));
}
