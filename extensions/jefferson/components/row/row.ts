/** A row's shape, and the alignments a cell's padding may take. */
import type { Instrument } from "../instruments/instrument.ts";

/** The values a cell's `align` may take. The type and every message derive from this tuple. */
export const ALIGNMENTS = ["left", "right", "center"] as const;
export type CellAlign = (typeof ALIGNMENTS)[number];

/** The values a row's `distribution` may take. The type and every message derive from this tuple. */
export const DISTRIBUTIONS = ["content", "equal"] as const;
export type Distribution = (typeof DISTRIBUTIONS)[number];

/** A single cell of a row: the instrument whose text it displays, padded against its align. */
export interface Cell {
  instrument: Instrument;
  align: CellAlign;
}

/** A normalized statusline row: one footer line, its cells sized by `distribution`. */
export interface Row {
  id: string;
  distribution: Distribution;
  cells: Cell[];
}
