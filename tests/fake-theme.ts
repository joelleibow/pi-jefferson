import type { Theme } from "@earendil-works/pi-coding-agent";
import { backgroundAnsi, foregroundAnsi, styleTextWithAnsi } from "@earendil-works/pi-tui";

/** Slot-aware host boundary; the host styling primitive preserves its selective closes. */
export function fakeTheme(foregroundOverrides: Readonly<Record<string, string>> = {}): Theme {
  const foregrounds = new Map<string, string>([
    ["accent", "\x1b[34m"], ["warning", "\x1b[33m"], ["error", "\x1b[31m"],
    ["thinkingOff", "\x1b[90m"], ["thinkingMinimal", "\x1b[91m"], ["thinkingLow", "\x1b[92m"],
    ["thinkingMedium", "\x1b[93m"], ["thinkingHigh", "\x1b[94m"], ["thinkingXhigh", "\x1b[95m"],
    ["thinkingMax", "\x1b[96m"],
  ]);
  for (const [token, ansi] of Object.entries(foregroundOverrides)) foregrounds.set(token, ansi);
  const backgrounds = new Map<string, string>([["selectedBg", "\x1b[44m"]]);
  const lookup = (slots: Map<string, string>, token: string): string => {
    const ansi = slots.get(token);
    if (ansi === undefined) throw new Error(`Unknown theme color: ${token}`);
    return ansi;
  };
  const theme: Pick<Theme, "getFgAnsi" | "getBgAnsi" | "style"> = {
    getFgAnsi: token => lookup(foregrounds, token),
    getBgAnsi: token => lookup(backgrounds, token),
    style(text, options) {
      const { fg, bg } = options;
      return styleTextWithAnsi(text,
        fg === undefined ? undefined : typeof fg === "string" ? lookup(foregrounds, fg) : foregroundAnsi(fg, "truecolor"),
        bg === undefined ? undefined : typeof bg === "string" ? lookup(backgrounds, bg) : backgroundAnsi(bg, "truecolor"),
        options);
    },
  };
  return theme as Theme;
}
