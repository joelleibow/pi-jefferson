/** The context instrument: the window's usage, its size, and the percent a bar draws. */
import { compactCount } from "./compact-count.ts";
import { FOUNDATIONAL_OPTIONS, type InstrumentDeclaration } from "./instrument.ts";

export const context: InstrumentDeclaration = {
  name: "context",
  variables: {
    tokens: ({ contextUsage: usage }) => usage === undefined ? undefined : usage.tokens === null ? "?" : compactCount(usage.tokens),
    window: ({ contextUsage: usage }) => usage === undefined ? undefined : compactCount(usage.contextWindow),
    percent: ({ contextUsage: usage }) => usage === undefined ? undefined : usage.percent === null ? "?" : `${usage.percent.toFixed(1)}%`,
  },
  bar: r => r.contextUsage?.percent ?? null,
  defaultFormat: "$percent/$window",
  defaultLabel: "Context:",
  options: FOUNDATIONAL_OPTIONS,
};
