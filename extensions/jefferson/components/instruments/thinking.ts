/** The thinking instrument: the level, in the color pi's editor border takes for that level. */
import type { ThemeColor } from "@earendil-works/pi-coding-agent";

import { FOUNDATIONAL_OPTIONS, type InstrumentDeclaration } from "./instrument.ts";

/** Pi's per-level editor-border tokens, the color its input box gives the thinking rules. */
const THINKING_FG: Readonly<Record<string, ThemeColor>> = {
  off: "thinkingOff", minimal: "thinkingMinimal", low: "thinkingLow", medium: "thinkingMedium",
  high: "thinkingHigh", xhigh: "thinkingXhigh", max: "thinkingMax",
};

export const thinking: InstrumentDeclaration = {
  name: "thinking",
  variables: { level: r => r.thinkingLevel },
  variableFg: { level: level => Object.hasOwn(THINKING_FG, level) ? THINKING_FG[level] : undefined },
  defaultFormat: "$level|capitalize",
  defaultLabel: "Thinking:",
  options: FOUNDATIONAL_OPTIONS,
};
