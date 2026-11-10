/** The status instrument: the statuses other extensions set, as pi's own footer shows them. */
import { stripTerminalSequences } from "@earendil-works/pi-tui";

import { FOUNDATIONAL_OPTIONS, type InstrumentDeclaration, type VariableForm } from "./instrument.ts";

/**
 * pi's own rule for one status's text: carriage returns, newlines and tabs become spaces, a run of
 * spaces collapses to one, and the ends are trimmed. A status carries its own terminal sequences
 * by convention; the cell's style owns colour here, so they are stripped first rather than
 * reaching the format language, which would collapse each ESC into a visible space.
 */
function sanitize(text: string): string {
  return stripTerminalSequences(text).replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim();
}

const statusText: VariableForm = (readings) => {
  const statuses = readings.statuses;
  if (statuses === undefined) return undefined;
  // Ordered by key, as pi orders them, then joined; a status left empty is dropped, and a set
  // that leaves nothing is unknown so the cell renders no label.
  const texts = [...statuses.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, text]) => sanitize(text))
    .filter(text => text !== "");
  return texts.length === 0 ? undefined : texts.join(" ");
};

export const status: InstrumentDeclaration = {
  name: "status",
  variables: { status: statusText },
  defaultFormat: "$status",
  defaultLabel: "Status:",
  options: FOUNDATIONAL_OPTIONS,
};
