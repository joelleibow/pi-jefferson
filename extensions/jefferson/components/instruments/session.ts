/** The session instrument: the name the session was given. */
import { FOUNDATIONAL_OPTIONS, type InstrumentDeclaration } from "./instrument.ts";

export const session: InstrumentDeclaration = {
  name: "session",
  variables: { name: readings => readings.sessionName },
  defaultFormat: "$name",
  defaultLabel: "Session:",
  options: FOUNDATIONAL_OPTIONS,
};
