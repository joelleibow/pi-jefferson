/**
 * Each instrument owns its name, variables, default format and accepted options. The declaration is
 * the published contract's declaration over Jefferson's own readings, plus the members only a
 * shipped instrument takes, so change 3's visual mix-in lands once (design 3; M14).
 */
import type { Theme, ThemeColor } from "@earendil-works/pi-coding-agent";

import type { ComposedFormat as ContractComposedFormat, ContractDeclaration } from "../../instrument-contract.ts";
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
export type ComposedFormat = ContractComposedFormat<Readings>;

export type InstrumentDeclaration = Omit<ContractDeclaration<Readings>, "variableFg" | "options"> & {
  /**
   * A foreground token per variable; the render's theme is passed so a provided token is checked.
   * The contract gives a provider `string | undefined`, because pi's own type graph must not enter a
   * provider's compile (owner-rulings.md, 2026-11-16).
   */
  readonly variableFg?: Readonly<Record<string, (value: string, theme: Theme) => ThemeColor | undefined>>;
  /**
   * A timed datum's instant: the reading the timed visual compares against the render's instant.
   * A declaration carrying it is timed, and the whole cell shows or hides with the datum.
   */
  readonly shownUntil?: (readings: Readings) => number | undefined;
  readonly options: readonly string[];
};

export const FOUNDATIONAL_OPTIONS = Object.freeze(["format", "style", "label"] as const);
