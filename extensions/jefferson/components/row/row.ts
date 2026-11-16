/** A row's shape, and the alignments a cell's padding may take. */
import type { Instrument } from "../instruments/instrument.ts";

/** The values a cell's `align` may take. The type and every message derive from this tuple. */
export const ALIGNMENTS = ["left", "right", "center"] as const;
export type CellAlign = (typeof ALIGNMENTS)[number];

/** The values a row's `distribution` may take. The type and every message derive from this tuple. */
export const DISTRIBUTIONS = ["content", "equal"] as const;
export type Distribution = (typeof DISTRIBUTIONS)[number];

/**
 * A single cell of a row: the resolved full name the notice gate compares, the holder a registration
 * can fill after the tree is built, and the alignment its text is padded against. It carries no
 * `instrument` key, because the holder is the one copy of what the cell renders (design 9).
 */
export interface Cell {
  name: string;
  holder: { current: Instrument };
  align: CellAlign;
}

/** A normalized statusline row: one footer line, its cells sized by `distribution`. */
export interface Row {
  distribution: Distribution;
  cells: Cell[];
}
