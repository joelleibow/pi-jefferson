/**
 * The instruments: the text a cell displays, resolved by reading the store.
 *
 * An instrument is a label over a data field, where either half may itself be data (D9). It is
 * handed one `Readings` and nothing else — no store, no context, no `tui` — so it cannot
 * subscribe, poll, mutate, or retain a handle, and `readonly` makes that a compile-time property
 * rather than a convention (D2). The only import is that type.
 */

import type { Reading, Readings } from "./session-data-store.ts";

/** The text `blank` displays and every cell of a row that declares no `cells` carries (D9). */
export const DEFAULT_CELL_TEXT =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor";

/** A cell's content: resolved synchronously from one render's readings. */
export interface Instrument {
  resolve(readings: Readings): string;
}

/** The placeholder instrument: it displays a constant, so it reads no datum. */
export const blank: Instrument = { resolve: () => DEFAULT_CELL_TEXT };

/** `label: data`, or "" when either half is unknown: there is no text it can honestly resolve. */
function labelled(label: (r: Readings) => Reading, data: (r: Readings) => Reading): Instrument {
  return {
    resolve(readings) {
      const l = label(readings);
      const d = data(readings);
      return l === undefined || d === undefined ? "" : `${l}: ${d}`;
    },
  };
}

/** The active model, labelled by the active provider. */
export const model: Instrument = labelled((r) => r.provider, (r) => r.model);

/** The active thinking level under a literal label. */
export const thinking: Instrument = labelled(() => "thinking", (r) => r.thinkingLevel);

/** The three instruments this extension implements, by the name configuration uses for them. */
const SHIPPED: Readonly<Record<string, Instrument>> = { blank, model, thinking };

/**
 * Resolve a configured instrument name. A lookup: an unknown name stays unknown, nothing is
 * added, and no table is mutated.
 */
export function instrumentNamed(name: string): Instrument | undefined {
  return Object.hasOwn(SHIPPED, name) ? SHIPPED[name] : undefined;
}
