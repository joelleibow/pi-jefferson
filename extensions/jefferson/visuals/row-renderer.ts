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

  const cellView = (cell: Cell, joint: () => boolean): CellView => {
    // One text per width for the current sample: a frame asks for the probe's width, the host's
    // measure and the cell's allocation, and a repeat render of the same sample asks for nothing.
    let sample: Readings | undefined;
    let texts = new Map<number, string>();
    const textAt = (width: number): string => {
      if (sample !== current) {
        sample = current;
        texts = new Map();
      }
      const cached = texts.get(width);
      if (cached !== undefined) return cached;
      const text = cell.instrument.render(current, width, theme);
      texts.set(width, text);
      return text;
    };
    return {
      fills: cell.instrument.fills,
      contentWidth: () => cell.instrument.fills ? 0 : visibleWidth(textAt(0)),
      render(cellWidth) {
        const lead = joint() ? " " : "";
        const clipped = truncateToWidth(lead + textAt(cellWidth), cellWidth);
        const pad = Math.max(0, cellWidth - visibleWidth(clipped));
        const before = cell.align === "right" ? pad : cell.align === "center" ? Math.floor(pad / 2) : 0;
        const after = cell.align === "left" ? pad : cell.align === "center" ? pad - Math.floor(pad / 2) : 0;
        // Only the pad after our own text needs our reset; the host resets between children.
        const trailing = after > 0 ? (leavesStyleOpen(clipped) ? RESET : "") + " ".repeat(after) : "";
        const leading = before > 0 ? " ".repeat(before) : "";
        return [leading + clipped + trailing];
      },
      invalidate() {
        sample = undefined;
        texts = new Map();
      },
    };
  };

  const rowViews = rows.map((row) => {
    // The seats this row was last laid out with. A cell reads this render's joint flag from here,
    // through the closure handed to it below, as it reads the sample from `current`.
    let seats: PlannedCell[] = [];
    const components = row.cells.map((cell, index) => cellView(cell, () => seats[index]?.joint ?? false));
    const stack = new HStack([], { gap: GAP });
    return {
      components,
      stack,
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
      /** Whether the row is already seated as this plan draws it: every field a cell reads. */
      seated(plan: PlannedCell[]): boolean {
        return seats.length === plan.length && plan.every((cell, index) => {
          const held = seats[index]!;
          // The joint is compared as well as the columns: at a row's margin a joint and a text
          // column trade one for one, so a cell reads a new joint flag from an unchanged basis.
          return cell.basis === held.basis && cell.grow === held.grow && cell.joint === held.joint;
        });
      },
      seat(plan: PlannedCell[]): void {
        seats = plan;
        stack.clear();
        for (const [index, component] of components.entries()) {
          const cell = plan[index]!;
          // Every cell may give up columns, so the allocator always reaches the row's width.
          stack.addChild(component, { basis: cell.basis, grow: cell.grow, shrink: 1, minSize: 0 });
        }
      },
    };
  });
  const tree = new VStack(rowViews.map(({ stack }) => stack), { gap: 0 });

  return {
    render(width) {
      current = sampleReadings();
      // Every render plans its rows, because a cell's content decides its columns and its joint: a
      // row re-seats when the width or any cell's basis, grow or joint differs from its last seat.
      for (const view of rowViews) {
        const plan = view.plan(width);
        if (!view.seated(plan)) view.seat(plan);
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
