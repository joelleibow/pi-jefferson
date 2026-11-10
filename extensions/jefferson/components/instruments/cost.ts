/** The cost instrument: what the session has spent so far. */
import { FOUNDATIONAL_OPTIONS, type InstrumentDeclaration } from "./instrument.ts";

export const cost: InstrumentDeclaration = {
  name: "cost",
  variables: { cost: ({ totals }) => totals === undefined ? undefined : `$${totals.cost.toFixed(3)}` },
  defaultFormat: "$cost",
  defaultLabel: "Cost:",
  options: FOUNDATIONAL_OPTIONS,
};
