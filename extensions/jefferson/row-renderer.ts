/**
 * The row renderer: renders a normalized row into one footer line.
 *
 * Equal cells come from explicit `floor(W / N)` arithmetic recomputed inside `render(width)`,
 * because the stack allocator distributes by weight and does not divide a row. That width becomes
 * each child's `basis`; the host then composes the children and pads the line to the full width,
 * so the row's remainder lands at the right edge. Composition, child iteration and line assembly
 * are the host's `HStack`; a cell component owns only its own clip and pad. Cells are one line
 * tall, so a row always is.
 */

import { HStack, VStack, truncateToWidth, visibleWidth, type Component } from "@earendil-works/pi-tui";

import type { CellAlign, Row } from "./configuration.ts";
import type { Readings } from "./session-data-store.ts";

/** The component the entry hands to `ctx.ui.setFooter`. */
export interface Footer {
  render(width: number): string[];
  invalidate(): void;
}

/** Inter-cell gap, fixed at 0 for this change (D7's `g = 0` case). */
const GAP = 0;

/** The host's style reset, as the renderer emits it before a pad whose text left an SGR open (D6). */
const RESET = "\x1b[0m";

/** Whether cell text leaves an SGR open, so a run of spaces after it would inherit the style (D6, D12). */
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
  readings: Readings,
): string {
  const cellWidth = Math.floor((width - (row.cells.length - 1) * GAP) / row.cells.length);

  /** One cell view: content in, one clipped and padded line out. It knows nothing of instruments. */
  const cellView = (text: string, align: CellAlign): Component => ({
    render: (cellRenderWidth: number): string[] => {
      const clipped = truncateToWidth(text, cellRenderWidth);
      const pad = Math.max(0, cellRenderWidth - visibleWidth(clipped));
      const before = align === "right" ? pad : align === "center" ? Math.floor(pad / 2) : 0;
      const after = align === "left" ? pad : align === "center" ? pad - Math.floor(pad / 2) : 0;
      // The pad that follows this cell's own text resets first when the text left an SGR open;
      // the pad that leads a right- or centred cell's text follows the host's reset between cells
      // (D12): the open-style reading is taken from the text this cell just appended, inside the cell.
      const trailing = after > 0 ? (leavesStyleOpen(clipped) ? RESET : "") + " ".repeat(after) : "";
      const leading = before > 0 ? " ".repeat(before) : "";
      return [leading + clipped + trailing];
    },
    invalidate(): void {},
  });

  // Each instrument resolves once per row render: the host asks a child to render more than once
  // (once to measure, again to lay out), and an instrument must not pay for that twice.
  const resolved = row.cells.map((cell) => cell.instrument.resolve(readings));
  const composed = new HStack(
    resolved.map((text, index) => ({
      component: cellView(text, row.cells[index]?.align ?? "left"),
      basis: cellWidth,
      grow: 0,
      shrink: 0,
    })),
    { gap: GAP },
  ).render(width)[0] ?? "";

  const remainder = width - visibleWidth(composed);
  return remainder > 0 ? composed + " ".repeat(remainder) : composed;
}

/** Build the footer component: one line per row, in declaration order. */
export function createFooter(
  rows: Row[],
  sampleReadings: () => Readings,
): Footer {
  return {
    render(width: number): string[] {
      // One sample per render, handed to every row and every cell, so two cells reading one datum
      // cannot disagree: agreement is structural, not procedural (D4).
      const readings = sampleReadings();
      const rowViews = rows.map((row): Component => ({
        render: (rowWidth: number): string[] => [renderRow(row, rowWidth, readings)],
        invalidate: () => {},
      }));
      // The footer is one component holding a tree: a VStack of rows, each row an HStack of cells.
      return new VStack(rowViews, { gap: 0 }).render(width);
    },
    // The footer caches nothing, so there is nothing to invalidate.
    invalidate(): void {},
  };
}