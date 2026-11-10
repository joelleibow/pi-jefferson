/** The path instrument: the working directory's own name. */
import { basename } from "node:path";

import { FOUNDATIONAL_OPTIONS, type InstrumentDeclaration } from "./instrument.ts";

export const path: InstrumentDeclaration = {
  name: "path",
  variables: { path: r => r.cwd === undefined ? undefined : basename(r.cwd) },
  defaultFormat: "$path",
  defaultLabel: "Path:",
  options: FOUNDATIONAL_OPTIONS,
};
