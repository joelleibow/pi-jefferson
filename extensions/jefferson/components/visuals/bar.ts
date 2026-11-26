/**
 * The bar: the filled track, the track it leaves, and the style each takes. An instrument can mix it
 * in, and a user places it with `$bar`. It draws what it is handed and chooses neither a colour nor a
 * percentage, so it needs no theme and imports no other file of this package.
 */
import type { ThemeStyle } from "@earendil-works/pi-coding-agent";

/** One drawn part of the bar. The format language applies the theme to each part it is given. */
export interface BarPart {
  readonly text: string;
  readonly style: ThemeStyle;
}

/**
 * The bar's parts, the filled one first: its text and the style each takes. The filled columns take
 * the style with the fill laid over it, and the track takes the style plus `dim`; which fill is in
 * force is the settings' answer, never the drawing's (design DEC-3).
 */
export function drawBar(
  barWidth: number, percent: number | null, style: ThemeStyle, fill: ThemeStyle,
): [BarPart, BarPart] {
  // A negative fraction is a number of the declared type, not a fault: it draws an empty track.
  const filled = percent === null ? 0 : Math.max(0, Math.min(barWidth, Math.floor((percent / 100) * barWidth)));
  return [
    { text: "█".repeat(filled), style: { ...style, ...fill } },
    { text: "░".repeat(barWidth - filled), style: { ...style, dim: true } },
  ];
}
