/** The context instrument: the window's usage, its size, and the percent a bar draws. */
import { compactCount } from "./compact-count.ts";
import { FOUNDATIONAL_OPTIONS, type InstrumentDeclaration } from "./instrument.ts";

export const context: InstrumentDeclaration = {
  name: "jefferson.default.context",
  variables: {
    tokens: ({ contextUsage: usage }) => usage === undefined ? undefined : usage.tokens === null ? "?" : compactCount(usage.tokens),
    window: ({ contextUsage: usage }) => usage === undefined ? undefined : compactCount(usage.contextWindow),
    percent: ({ contextUsage: usage }) => usage === undefined ? undefined : usage.percent === null ? "?" : `${usage.percent.toFixed(1)}%`,
  },
  // No usage at all is unknown, so a format that names only `$bar` renders nothing; a null estimate
  // is a known usage with nothing to fill, so the track draws unfilled.
  bar: r => r.contextUsage === undefined ? undefined : r.contextUsage.percent,
  defaultFormat: "$percent/$window",
  defaultLabel: "Context:",
  options: FOUNDATIONAL_OPTIONS,
};
