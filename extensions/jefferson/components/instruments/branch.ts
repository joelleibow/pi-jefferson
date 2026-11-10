/** The branch instrument: the git branch the host reports for the working directory. */
import { FOUNDATIONAL_OPTIONS, type InstrumentDeclaration } from "./instrument.ts";

export const branch: InstrumentDeclaration = {
  name: "branch",
  variables: { branch: readings => readings.branch },
  defaultFormat: "$branch",
  defaultLabel: "Branch:",
  options: FOUNDATIONAL_OPTIONS,
};
