/**
 * The row renderer: renders a normalized row into one footer line.
 *
 * Equal cells come from explicit `floor(W / N)` arithmetic recomputed inside
 * `render(width)` — the stack allocator drains greedily and must not divide the
 * row (D7). The width helpers cross the load boundary by injection from the
 * entry (D8): this source file holds no host runtime import, so wide glyphs and ANSI
 * escapes are measured with the host's `visibleWidth`, never `String.length`.
 * Each cell's text is resolved from its instrument and then truncated and padded, so a row is
 * always one line (D10, D12).
 */

import type { Row } from "./configuration.ts";
import type { Readings } from "./session-data-store.ts";

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

/** The host's style reset, as the renderer emits it before a pad whose text left an SGR open (D6). */
const RESET = "\x1b[0m";

/** Whether cell text leaves an SGR open, so a run of spaces after it would inherit the style. */
function leavesStyleOpen(text: string): boolean {
  return text.includes("\x1b") && !text.endsWith(RESET);
}

/**
 * Render one row as one line of `width` columns: each of the row's N cells
 * occupies `floor((W - (N - 1) * GAP) / N)` columns, the remainder stays blank
 * at the right edge, and the composed line is padded to the full width. The pad
 * sits on the side the cell's `align` names; the row's remainder stays at the
 * right edge regardless (D4, D5).
 */
export function renderRow(
  row: Row,
  width: number,
  helpers: WidthHelpers,
  readings: Readings,
): string {
  const cellWidth = Math.floor((width - (row.cells.length - 1) * GAP) / row.cells.length);
  let line = "";
  let styleOpen = false; // whether the last text appended left an SGR open
  /** The spaces a pad or the row's remainder adds: reset first, so a space never inherits a style. */
  const spaces = (count: number): string => {
    if (count <= 0) return "";
    const reset = styleOpen ? RESET : "";
    styleOpen = false;
    return reset + " ".repeat(count);
  };
  for (const cell of row.cells) {
    const clipped = helpers.truncateToWidth(cell.instrument.resolve(readings), cellWidth);
    const pad = cellWidth - helpers.visibleWidth(clipped);
    if (cell.align === "right") line += spaces(pad);
    line += clipped;
    styleOpen = leavesStyleOpen(clipped);
    if (cell.align !== "right") line += spaces(pad);
  }
  line += spaces(width - helpers.visibleWidth(line));
  return line;
}

/** Build the footer component: one line per row, in declaration order. */
export function createFooter(
  rows: Row[],
  sampleReadings: () => Readings,
  helpers: WidthHelpers,
): Footer {
  return {
    render(width: number): string[] {
      // One sample per render, handed to every row and every cell, so two cells reading one datum
      // cannot disagree: agreement is structural, not procedural (D4).
      const readings = sampleReadings();
      return rows.map((row) => renderRow(row, width, helpers, readings));
    },
    // The footer caches nothing, so there is nothing to invalidate.
    invalidate(): void {},
  };
}
