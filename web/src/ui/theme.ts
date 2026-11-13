import type { Theme } from "../map/style";

const KEY = "cmf-theme";

export function currentTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch { /* storage blocked: fall back to the system setting */ }
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#14211b" : "#fffdf8");
}

export function toggleTheme(): Theme {
  // Flip what is shown (it can come from the web address, ?theme=), not only what is saved.
  const shown = document.documentElement.dataset.theme;
  const t: Theme = (shown === "dark" || shown === "light" ? shown : currentTheme()) === "dark" ? "light" : "dark";
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  applyTheme(t);
  return t;
}
