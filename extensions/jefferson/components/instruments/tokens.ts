/** The tokens instrument: the session's four token totals, and their sum. */
import { compactCount } from "./compact-count.ts";
import { FOUNDATIONAL_OPTIONS, type InstrumentDeclaration } from "./instrument.ts";

export const tokens: InstrumentDeclaration = {
  name: "tokens",
  variables: {
    input: ({ totals }) => totals === undefined ? undefined : compactCount(totals.input),
    output: ({ totals }) => totals === undefined ? undefined : compactCount(totals.output),
    cacheRead: ({ totals }) => totals === undefined ? undefined : compactCount(totals.cacheRead),
    cacheWrite: ({ totals }) => totals === undefined ? undefined : compactCount(totals.cacheWrite),
    totalTokens: ({ totals }) => totals === undefined ? undefined : compactCount(totals.input + totals.output + totals.cacheRead + totals.cacheWrite),
  },
  defaultFormat: "$totalTokens",
  defaultLabel: "Tokens:",
  options: FOUNDATIONAL_OPTIONS,
};
