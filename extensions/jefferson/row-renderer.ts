/**
 * The row renderer: renders a normalized row into one footer line.
 *
 * Equal cells come from explicit `floor(W / N)` arithmetic recomputed inside
 * `render(width)` — the stack allocator drains greedily and must not divide the
 * row (D7). The width helpers cross the load boundary by injection from the
 * entry (D8): this module holds no host runtime import, so wide glyphs and ANSI
 * escapes are measured with the host's `visibleWidth`, never `String.length`.
 * Each cell truncates and pads its own content so a row is always one line (D10).
 */

import type { Row } from "./configuration.ts";

/** The host's width helpers, injected by the entry (D8). */
export interface WidthHelpers {
  truncateToWidth(text: string, maxWidth: number): string;
  visibleWidth(text: string): number;
}

/** The component the entry hands to `ctx.ui.setFooter`. */
export interface Footer {
  render(width: number): string[];
  invalidate(): void;
}

/** Inter-cell gap, fixed at 0 for this change (D7's `g = 0` case). */
const GAP = 0;

/**
 * Render one row as one line of `width` columns: each of the row's N cells
 * occupies `floor((W - (N - 1) * GAP) / N)` columns, the remainder stays blank
 * at the right edge, and the composed line is padded to the full width.
 */
export function renderRow(row: Row, width: number, helpers: WidthHelpers): string {
  const cellWidth = Math.floor((width - (row.cells.length - 1) * GAP) / row.cells.length);
  let line = "";
  for (const cell of row.cells) {
    const truncated = helpers.truncateToWidth(cell.text, cellWidth);
    line += truncated + " ".repeat(Math.max(0, cellWidth - helpers.visibleWidth(truncated)));
  }
  const remainder = width - helpers.visibleWidth(line);
  return remainder > 0 ? line + " ".repeat(remainder) : line;
}

/** Build the footer component: one line per row, in declaration order. */
export function createFooter(rows: Row[], helpers: WidthHelpers): Footer {
  return {
    render(width: number): string[] {
      return rows.map((row) => renderRow(row, width, helpers));
    },
    invalidate(): void {},
  };
}
