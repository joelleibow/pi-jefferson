/** The model instrument: the provider and the model the session is running. */
import { FOUNDATIONAL_OPTIONS, type InstrumentDeclaration } from "./instrument.ts";

export const model: InstrumentDeclaration = {
  name: "model",
  variables: { provider: r => r.provider, model: r => r.model },
  defaultFormat: "$provider/$model",
  defaultLabel: "Model:",
  options: FOUNDATIONAL_OPTIONS,
};
