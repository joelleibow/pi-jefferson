/**
 * The bar: the filled track, the track it leaves, and the colors its fill takes. An instrument can
 * mix it in, and a user places it with `$bar`. It takes plain numbers and returns its parts, so it
 * needs no theme and imports no other file of this package.
 */
import type { ThemeStyle } from "@earendil-works/pi-coding-agent";

/** One drawn part of the bar. The format language applies the theme to each part it is given. */
export interface BarPart {
  readonly text: string;
  readonly style: ThemeStyle;
}

const WARNING_PERCENT = 70;
const ERROR_PERCENT = 90;

/** The bar's parts, the filled one first: its text and the style each takes. */
export function drawBar(barWidth: number, percent: number | null, style: ThemeStyle): [BarPart, BarPart] {
  const filled = percent === null ? 0 : Math.min(barWidth, Math.floor((percent / 100) * barWidth));
  const filledStyle: ThemeStyle = percent !== null && percent > ERROR_PERCENT ? { ...style, fg: "error" }
    : percent !== null && percent > WARNING_PERCENT ? { ...style, fg: "warning" } : style;
  return [
    { text: "█".repeat(filled), style: filledStyle },
    { text: "░".repeat(barWidth - filled), style: { ...style, dim: true } },
  ];
}
