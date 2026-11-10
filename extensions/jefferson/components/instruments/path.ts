/** The path instrument: the working directory's own name, and the whole directory in three forms. */
import { basename, isAbsolute, relative, resolve, sep } from "node:path";

import { FOUNDATIONAL_OPTIONS, type InstrumentDeclaration, type VariableForm } from "./instrument.ts";

/**
 * pi's own rule for the directory, copied: `~` for home itself and `~/sub` below it, the path as
 * the host gave it anywhere else. Both paths are resolved first, so a trailing separator on the
 * home directory and a sibling that only shares its prefix both come out right.
 */
const relativeToHome: VariableForm = (readings) => {
  const cwd = readings.cwd;
  if (cwd === undefined) return undefined;
  const home = readings.home;
  if (home === undefined) return cwd;
  const inside = relative(resolve(home), resolve(cwd));
  const underHome = inside === "" || (inside !== ".." && !inside.startsWith(`..${sep}`) && !isAbsolute(inside));
  if (!underHome) return cwd;
  return inside === "" ? "~" : `~${sep}${inside}`;
};

const base: VariableForm = readings => readings.cwd === undefined ? undefined : basename(readings.cwd);

export const path: InstrumentDeclaration = {
  name: "path",
  variables: { path: base },
  variableForms: {
    path: { defaultForm: "base", byName: { base, absolute: readings => readings.cwd, relative: relativeToHome } },
  },
  defaultFormat: "$path",
  defaultLabel: "Path:",
  options: FOUNDATIONAL_OPTIONS,
};
