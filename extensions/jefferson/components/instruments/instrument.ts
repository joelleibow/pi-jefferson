/** Each instrument owns its name, variables, default format and accepted options. */
import type { Theme, ThemeColor } from "@earendil-works/pi-coding-agent";

import type { Readings } from "../../data/session-data-store.ts";

export const DEFAULT_CELL_TEXT =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor";

export interface Instrument {
  /** Whether the cell holding it fills the columns its row leaves, rather than taking its content's. */
  readonly fills: boolean;
  render(readings: Readings, width: number, theme: Theme): string;
}

export interface InstrumentDeclaration {
  readonly name: string;
  readonly variables: Readonly<Record<string, (readings: Readings) => string | undefined>>;
  readonly bar?: (readings: Readings) => number | null;
  /** A declaration that fills in every format. A `$bar` in the format fills without saying so. */
  readonly fills?: boolean;
  readonly defaultFormat: string;
  readonly defaultLabel?: string;
  readonly variableFg?: Readonly<Record<string, (value: string) => ThemeColor | undefined>>;
  readonly options: readonly string[];
}

export const FOUNDATIONAL_OPTIONS = Object.freeze(["format", "style", "label"] as const);
