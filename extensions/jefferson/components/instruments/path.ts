/** The path instrument: the working directory's own name, and the whole directory in three forms. */
import { basename, isAbsolute, relative, resolve, sep } from "node:path";

import { FOUNDATIONAL_OPTIONS, type InstrumentDeclaration, type VariableForm } from "./instrument.ts";

/**
 * pi's own rule for the directory, copied: `~` for home itself and `~/sub` below it, the path as
 * the host gave it anywhere else. `path.relative` resolves its own arguments and answers `..` for
 * a sibling, which is what makes a trailing separator on home and a shared prefix come out right;
 * the explicit resolves copy pi's shape and are not the reason.
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
    path: { base, absolute: readings => readings.cwd, relative: relativeToHome },
  },
  defaultFormat: "$path",
  defaultLabel: "Path:",
  options: FOUNDATIONAL_OPTIONS,
};
