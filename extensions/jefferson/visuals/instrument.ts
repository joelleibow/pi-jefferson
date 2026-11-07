/** Each instrument owns its name, variables, default format and accepted options. */
import { basename } from "node:path";
import type { Theme, ThemeColor } from "@earendil-works/pi-coding-agent";

import type { Readings } from "../data/session-data-store.ts";

export const DEFAULT_CELL_TEXT =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor";

export interface Instrument {
  render(readings: Readings, width: number, theme: Theme): string;
}

export interface InstrumentDeclaration {
  readonly name: string;
  readonly variables: Readonly<Record<string, (readings: Readings) => string | undefined>>;
  readonly bar?: (readings: Readings) => number | null;
  readonly defaultFormat: string;
  readonly defaultLabel?: string;
  readonly variableFg?: Readonly<Record<string, (value: string) => ThemeColor | undefined>>;
  readonly options: readonly string[];
}

const FOUNDATIONAL_OPTIONS = Object.freeze(["format", "style", "label"] as const);
const THOUSAND = 1_000;
const MILLION = 1_000_000;
const DECIMAL_THOUSANDS_LIMIT = 100_000;
const DECIMAL_MILLIONS_LIMIT = 10_000_000;

function compactCount(count: number): string {
  if (count < THOUSAND) return String(count);
  if (count < DECIMAL_THOUSANDS_LIMIT) return (count / THOUSAND).toFixed(1) + "k";
  if (count < MILLION) return Math.round(count / THOUSAND) + "k";
  if (count < DECIMAL_MILLIONS_LIMIT) return (count / MILLION).toFixed(1) + "M";
  return Math.round(count / MILLION) + "M";
}

export const blank: InstrumentDeclaration = {
  name: "blank",
  variables: {},
  defaultFormat: DEFAULT_CELL_TEXT,
  options: FOUNDATIONAL_OPTIONS,
};

const model: InstrumentDeclaration = {
  name: "model",
  variables: { provider: r => r.provider, model: r => r.model },
  defaultFormat: "$provider: $model",
  options: FOUNDATIONAL_OPTIONS,
};

/** Pi's per-level editor-border tokens, the color its input box gives the thinking rules. */
const THINKING_FG: Readonly<Record<string, ThemeColor>> = {
  off: "thinkingOff", minimal: "thinkingMinimal", low: "thinkingLow", medium: "thinkingMedium",
  high: "thinkingHigh", xhigh: "thinkingXhigh", max: "thinkingMax",
};

const thinking: InstrumentDeclaration = {
  name: "thinking",
  variables: { level: r => r.thinkingLevel },
  variableFg: { level: level => Object.hasOwn(THINKING_FG, level) ? THINKING_FG[level] : undefined },
  defaultFormat: "$level|capitalize",
  defaultLabel: "Thinking: ",
  options: FOUNDATIONAL_OPTIONS,
};

const path: InstrumentDeclaration = {
  name: "path",
  variables: { path: r => r.cwd === undefined ? undefined : basename(r.cwd) },
  defaultFormat: "$path",
  options: FOUNDATIONAL_OPTIONS,
};

const context: InstrumentDeclaration = {
  name: "context",
  variables: {
    tokens: ({ contextUsage: usage }) => usage === undefined ? undefined : usage.tokens === null ? "?" : compactCount(usage.tokens),
    window: ({ contextUsage: usage }) => usage === undefined ? undefined : compactCount(usage.contextWindow),
    percent: ({ contextUsage: usage }) => usage === undefined ? undefined : usage.percent === null ? "?" : `${usage.percent.toFixed(1)}%`,
  },
  bar: r => r.contextUsage?.percent ?? null,
  defaultFormat: "$percent/$window",
  options: FOUNDATIONAL_OPTIONS,
};

const tokens: InstrumentDeclaration = {
  name: "tokens",
  variables: {
    input: ({ totals }) => totals === undefined ? undefined : compactCount(totals.input),
    output: ({ totals }) => totals === undefined ? undefined : compactCount(totals.output),
    cacheRead: ({ totals }) => totals === undefined ? undefined : compactCount(totals.cacheRead),
    cacheWrite: ({ totals }) => totals === undefined ? undefined : compactCount(totals.cacheWrite),
    totalTokens: ({ totals }) => totals === undefined ? undefined : compactCount(totals.input + totals.output + totals.cacheRead + totals.cacheWrite),
  },
  defaultFormat: "$totalTokens",
  options: FOUNDATIONAL_OPTIONS,
};

const cost: InstrumentDeclaration = {
  name: "cost",
  variables: { cost: ({ totals }) => totals === undefined ? undefined : `$${totals.cost.toFixed(3)}` },
  defaultFormat: "$cost",
  options: FOUNDATIONAL_OPTIONS,
};

const SHIPPED: Readonly<Record<string, InstrumentDeclaration>> = Object.fromEntries(
  [blank, model, thinking, path, context, tokens, cost].map(declaration => [declaration.name, declaration]),
);

export function instrumentNamed(name: string): InstrumentDeclaration | undefined {
  return Object.hasOwn(SHIPPED, name) ? SHIPPED[name] : undefined;
}
