// Shroomy Lab: the 50 m heat map (Real, 14 Nov 2026).
// Close up, each 50 m patch has its own number: its 250 m square's score, moved up or down by
// how much shadier or sunnier the patch is than its square. An educated GUESS (config/lab.yaml),
// not from the brief. The map picture is made with the same rule (scripts/lab-heat50.py), so the
// number on the card always matches the colour that was tapped.
export interface Heat50 { weather_run: string; shade_strength: number; }

/** score250: the square's score (0-100). sh50: the patch's shade (0-100).
 *  sh250: the square's shade part (0-100). Rounds half up, like the script. */
export function heat50(score250: number, sh50: number, sh250: number, strength: number): number {
  const v = score250 * (1 + (strength * (sh50 - sh250)) / 100);
  return Math.max(0, Math.min(100, Math.floor(v + 0.5)));
}
