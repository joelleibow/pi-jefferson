/** A once-built footer tree; the host allocates columns, each cell owns its clip and pad. */
import { HStack, VStack, truncateToWidth, visibleWidth, type Component } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";

import type { Cell, Row } from "./row.ts";
import { planRow, type PlannedCell } from "./width-plan.ts";
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

/** A cell component, plus what the row needs to know about it before it renders. */
interface CellView extends Component {
  /** Whether the cell fills the columns its row leaves. */
  readonly fills: boolean;
  /** The columns its text needs, measured at width 0 and unpadded: its probe. */
  contentWidth(): number;
}

export function createFooter(
  rows: Row[],
  sampleReadings: () => Readings,
  theme: Theme,
): Footer {
  let current: Readings = sampleReadings();
  let lastWidth: number | undefined;

  const cellView = (cell: Cell): CellView => {
    let cached: { sample: Readings; width: number; text: string } | undefined;
    const textAt = (width: number): string => {
      if (cached?.sample !== current || cached?.width !== width) {
        cached = { sample: current, width, text: cell.instrument.render(current, width, theme) };
      }
      return cached.text;
    };
    return {
      fills: cell.instrument.fills,
      contentWidth: () => cell.instrument.fills ? 0 : visibleWidth(textAt(0)),
      render(cellWidth) {
        const clipped = truncateToWidth(textAt(cellWidth), cellWidth);
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

  const rowViews = rows.map((row) => {
    const components = row.cells.map(cellView);
    return {
      components,
      stack: new HStack([], { gap: GAP }),
      plan: (width: number): PlannedCell[] => planRow(
        width,
        row.distribution,
        row.cells.map((cell, index) => ({
          align: cell.align,
          fills: components[index]!.fills,
          // Read on demand, so a row that distributes equally never takes the probe.
          get content(): number {
            return components[index]!.contentWidth();
          },
        })),
      ),
    };
  });
  const tree = new VStack(rowViews.map(({ stack }) => stack), { gap: 0 });

  return {
    render(width) {
      current = sampleReadings();
      if (width !== lastWidth) {
        for (const view of rowViews) {
          const plan = view.plan(width);
          view.stack.clear();
          for (const [index, component] of view.components.entries()) {
            const cell = plan[index]!;
            view.stack.addChild(component, { basis: cell.basis, grow: cell.grow, shrink: 0 });
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
