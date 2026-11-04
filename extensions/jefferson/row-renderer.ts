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

import { HStack, truncateToWidth, visibleWidth, type Component } from "@earendil-works/pi-tui";

import type { Row } from "./configuration.ts";
import type { Readings } from "./session-data-store.ts";

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
export function renderRow(
  row: Row,
  width: number,
  readings: Readings,
): string {
  const cellWidth = Math.floor((width - (row.cells.length - 1) * GAP) / row.cells.length);

  /** One cell: clipped to the width the row gives it, padded so it occupies that width. */
  const cellComponent = (text: string): Component => ({
    render: (cellRenderWidth: number): string[] => {
      const clipped = truncateToWidth(text, cellRenderWidth);
      const pad = Math.max(0, cellRenderWidth - visibleWidth(clipped));
      return [clipped + " ".repeat(pad)];
    },
    invalidate(): void {},
  });

  // Each instrument resolves once per row render: the host asks a child to render more than once
  // (once to measure, again to lay out), and an instrument must not pay for that twice.
  const resolved = row.cells.map((cell) => cell.instrument.resolve(readings));
  const composed = new HStack(
    resolved.map((text) => ({ component: cellComponent(text), basis: cellWidth, grow: 0, shrink: 0 })),
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
      return rows.map((row) => renderRow(row, width, readings));
    },
    // The footer caches nothing, so there is nothing to invalidate.
    invalidate(): void {},
  };
}
