/** A once-built footer tree; the host allocates columns, each cell owns its clip and pad. */
import { HStack, VStack, truncateToWidth, visibleWidth, type Component } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";

import type { Cell, Row } from "./row.ts";
import type { Readings } from "../data/session-data-store.ts";

export interface Footer {
  render(width: number): string[];
  invalidate(): void;
}

const GAP = 0;
const RESET = "\x1b[0m";

function leavesStyleOpen(text: string): boolean {
  return text.includes("\x1b") && !text.endsWith(RESET);
}

export function createFooter(
  rows: Row[],
  sampleReadings: () => Readings,
  theme: Theme,
): Footer {
  let current: Readings = sampleReadings();
  let lastWidth: number | undefined;

  const cellView = (cell: Cell): Component => {
    let cached: { sample: Readings; width: number; text: string } | undefined;
    return {
      render(cellWidth) {
        if (cached?.sample !== current || cached?.width !== cellWidth) {
          cached = { sample: current, width: cellWidth, text: cell.instrument.render(current, cellWidth, theme) };
        }
        const clipped = truncateToWidth(cached.text, cellWidth);
        const pad = Math.max(0, cellWidth - visibleWidth(clipped));
        const before = cell.align === "right" ? pad : cell.align === "center" ? Math.floor(pad / 2) : 0;
        const after = cell.align === "left" ? pad : cell.align === "center" ? pad - Math.floor(pad / 2) : 0;
        // Only the pad after our own text needs our reset; the host resets between children.
        const trailing = after > 0 ? (leavesStyleOpen(clipped) ? RESET : "") + " ".repeat(after) : "";
        const leading = before > 0 ? " ".repeat(before) : "";
        return [leading + clipped + trailing];
      },
      invalidate() {
        cached = undefined;
      },
    };
  };

  const rowViews = rows.map((row) => ({
    components: row.cells.map(cellView),
    stack: new HStack([], { gap: GAP }),
  }));
  const tree = new VStack(rowViews.map(({ stack }) => stack), { gap: 0 });

  return {
    render(width) {
      current = sampleReadings();
      if (width !== lastWidth) {
        for (const { components, stack } of rowViews) {
          stack.clear();
          for (const component of components) {
            stack.addChild(component, { basis: Math.floor(width / components.length), grow: 1, shrink: 0 });
          }
        }
        lastWidth = width;
      }
      return tree.render(width);
    },
    invalidate() {
      for (const { components } of rowViews) {
        for (const component of components) component.invalidate();
      }
    },
  };
}
