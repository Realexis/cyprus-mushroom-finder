// PROTOTYPE: small text helpers. Same rules and wording as ui/spot.ts, copied here so this
// page does not break while other work changes that file. Keep the two in step if adopted.
import { SCORE_STOPS } from "../map/layers";
import type { Meta } from "../ui/controls";

export interface Spots { spots: { where: string }[]; }

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export const fmtDay = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { ...opts, timeZone: "Asia/Nicosia" });

export const cyprusDate = (plusDays = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Nicosia" })
  .format(new Date(Date.now() + plusDays * 86400000));

export function scoreColour(v: number) {
  let c = SCORE_STOPS[0][1];
  for (const [s, col] of SCORE_STOPS) if (v >= s) c = col;
  return c;
}

export function words(v: number) {
  if (v >= 80) return "Very good";
  if (v >= 65) return "Good";
  if (v >= 45) return "Fair";
  return "Poor";
}

/** The mushroom clock in plain words (same rules as pipeline/shroomy/score/clock.py). */
export function clockSentence(daysSince: number, c: Meta["clock"]): string {
  if (daysSince < 0) return `No soaking rain (${c.soak_mm} mm+) in the last month. Fruiting window closed.`;
  if (daysSince < c.opens) {
    const k = c.opens - daysSince;
    return `Soaking rain ${daysSince} days ago. Window opens in ${k} day${k === 1 ? "" : "s"}.`;
  }
  if (daysSince <= c.closes) {
    const k = c.closes - daysSince;
    return `Soaking rain ${daysSince} days ago. Window OPEN, about ${k} more day${k === 1 ? "" : "s"}.`;
  }
  return `Last soaking rain was ${daysSince} days ago. Fruiting window has closed.`;
}
