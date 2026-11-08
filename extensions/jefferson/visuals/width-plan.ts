/**
 * The width plan: the columns each cell of a row asks the host's allocator for, and which cells
 * carry the joint. A pure function over columns, and the only geometry Jefferson decides: the
 * host still spends any remainder and takes any deficit.
 *
 * It imports nothing (ADR 0007), so the two value sets it reads are restated here; the footer's
 * call fails `tsc` if `visuals/row.ts` adds a value to either.
 */

type Distribution = "content" | "equal";
type Alignment = "left" | "right" | "center";

/** What one cell says about its width before its row is planned. */
export interface CellMeasure {
  /** The side of the cell its text is padded against. */
  align: Alignment;
  /** Whether the cell fills the columns its row leaves: a `blank` cell, or one whose format holds `$bar`. */
  fills: boolean;
  /** The visible columns of the cell's text rendered at width 0, unpadded and unclipped. */
  content: number;
}

/** One cell's seat in its row. */
export interface PlannedCell {
  /** The numeric basis pi-tui is asked for. */
  basis: number;
  /** 1 where the allocator may spend a surplus column here, 0 where the basis is exact. */
  grow: 0 | 1;
  /** Whether this cell renders the joint as a leading space. */
  joint: boolean;
}

/** The cells that hold text: a fill cell is not one, and an empty cell is not one either. */
function contentCells(cells: readonly CellMeasure[]): number[] {
  return cells.flatMap((cell, index) => cell.fills || cell.content === 0 ? [] : [index]);
}

/**
 * The one cell the slack lands on, in a row with no fill cell: the last left-aligned non-empty
 * cell, else the first non-empty one, else the first cell, even when it is empty.
 */
function absorberOf(cells: readonly CellMeasure[], content: readonly number[]): number {
  if (content.length === 0) return 0;
  const leftAligned = content.filter((index) => cells[index]!.align === "left");
  return leftAligned.at(-1) ?? content[0]!;
}

/**
 * The cells that carry the joint, by index: each boundary between two content cells with no fill
 * cell between them, except the boundary an absorber's slack lands on.
 */
function jointCells(
  cells: readonly CellMeasure[],
  content: readonly number[],
  absorber: number | undefined,
): Set<number> {
  const jointed = new Set<number>();
  for (let position = 1; position < content.length; position++) {
    const left = content[position - 1]!;
    const right = content[position]!;
    if (cells.some((cell, index) => cell.fills && index > left && index < right)) continue;
    if (absorber !== undefined) {
      // A left-aligned absorber's slack lands after it, a right-aligned one's before it.
      if (left === absorber && cells[left]!.align !== "right") continue;
      if (right === absorber && cells[right]!.align !== "left") continue;
    }
    jointed.add(right);
  }
  return jointed;
}

export function planRow(
  width: number,
  distribution: Distribution,
  cells: readonly CellMeasure[],
): PlannedCell[] {
  if (distribution === "equal") {
    // Today's arithmetic, unchanged: the remainder is the allocator's, one column to the earliest.
    return cells.map(() => ({ basis: Math.floor(width / cells.length), grow: 1, joint: false }));
  }
  const fills = cells.filter((cell) => cell.fills).length;
  const content = contentCells(cells);
  // A fill cell takes the slack; only a row without one has an absorbing cell.
  const absorber = fills === 0 ? absorberOf(cells, content) : undefined;
  const jointed = jointCells(cells, content, absorber);
  // The joint gives way before any content does: when the text and its joints need the row's
  // last column or more, every counted joint drops together.
  const text = content.reduce((sum, index) => sum + cells[index]!.content, 0);
  if (text + jointed.size > width) jointed.clear();
  const slack = width - text - jointed.size;
  const share = fills === 0 ? 0 : Math.max(0, Math.floor(slack / fills));
  return cells.map((cell, index) => {
    if (cell.fills) return { basis: share, grow: 1, joint: false };
    const joint = jointed.has(index);
    const absorbed = index === absorber && slack > 0 ? slack : 0;
    return { basis: cell.content + (joint ? 1 : 0) + absorbed, grow: 0, joint };
  });
}
