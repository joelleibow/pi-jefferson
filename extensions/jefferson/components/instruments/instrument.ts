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

/** One named way of showing a variable's datum, over the readings the sample already carries. */
export type VariableForm = (readings: Readings) => string | undefined;

/** A format set chosen by a reading: the notice's kind, its values and its default text. */
export interface ComposedFormat {
  /** The variable the chosen text arrives at the cell's format through. */
  readonly variable: string;
  /** The values a kind's format may name, already formatted. */
  readonly variables: Readonly<Record<string, (readings: Readings) => string | undefined>>;
  /** The reading that selects the format's key; nothing to compose when it yields `undefined`. */
  readonly select: (readings: Readings) => string | undefined;
  /** One default format per key. */
  readonly formats: Readonly<Record<string, string>>;
}

export interface InstrumentDeclaration {
  readonly name: string;
  readonly variables: Readonly<Record<string, (readings: Readings) => string | undefined>>;
  /**
   * The named forms a variable accepts, by variable and then by name; `|name` after that variable
   * selects one. A bare `$name` renders `variables`, which a form may also be named for.
   */
  readonly variableForms?: Readonly<Record<string, Readonly<Record<string, VariableForm>>>>;
  readonly bar?: (readings: Readings) => number | null;
  /** A declaration that fills in every format. A `$bar` in the format fills without saying so. */
  readonly fills?: boolean;
  readonly defaultFormat: string;
  readonly defaultLabel?: string;
  readonly variableFg?: Readonly<Record<string, (value: string) => ThemeColor | undefined>>;
  /** A format set chosen by a reading, composed into the variable it names. */
  readonly composed?: ComposedFormat;
  /**
   * A timed datum's instant: the reading the timed visual compares against the render's instant.
   * A declaration carrying it is timed, and the whole cell shows or hides with the datum.
   */
  readonly shownUntil?: (readings: Readings) => number | undefined;
  readonly options: readonly string[];
}

export const FOUNDATIONAL_OPTIONS = Object.freeze(["format", "style", "label"] as const);
