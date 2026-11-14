// Small pictures in front of a line of text. The original design keeps its emoji, exactly as before.
// Every other design gets drawn line icons, so the look does not depend on the phone's emoji set.
import { activeDesign } from "../designs";

const PATHS: Record<string, string> = {
  tree: `<path d="M12 2 5.5 11H9l-4.5 7h15L15 11h3.5Z"/><path d="M12 18v4"/>`,
  mountain: `<path d="m2.5 19.5 6.5-12 4 7 2.5-3.5 6 8.5Z"/>`,
  track: `<path d="M8.5 3 5 21M15.5 3 19 21M12 4.5v3M12 10.5v3M12 16.5v3"/>`,
  shade: `<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor"/>`,
  drive: `<path d="M12 3 19.5 20.5 12 17l-7.5 3.5Z"/>`,
  warn: `<path d="M12 3.5 2.5 20h19Z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.3" r="0.6" fill="currentColor"/>`,
  share: `<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v8h14v-8"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>`,
  mushroom: `<path d="M3 12.5C3 7.6 7 4 12 4s9 3.6 9 8.5Z"/><path d="M10 12.5V18a2 2 0 0 0 4 0v-5.5"/>`,
  rain: `<path d="M7 14.5h10a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 7 8.5a3 3 0 0 0 0 6Z"/><path d="m9 17.5-1 3M13 17.5l-1 3M17 17.5l-1 3"/>`,
  phone: `<path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1z"/>`,
};

/** `emoji` is what the original shows. `bare` = the original had the emoji as plain text (no span). */
export function ic(name: keyof typeof PATHS | string, emoji: string, bare = false): string {
  if (activeDesign.icons === "emoji") return bare ? emoji : `<span aria-hidden="true">${emoji}</span>`;
  return `<svg class="ico ico-${name}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]}</svg>`;
}
