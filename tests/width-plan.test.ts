import assert from "node:assert/strict";
import { test } from "node:test";

import { planRow, type CellMeasure, type PlannedCell } from "../extensions/jefferson/components/row/width-plan.ts";

/** The task list's cell notation: `L15` is a left-aligned content cell of 15 columns, `F` fills, `L0` is empty. */
function aligned(align: CellMeasure["align"], content: number): CellMeasure {
  return { align, fills: false, content };
}

const l = (content: number): CellMeasure => aligned("left", content);
const r = (content: number): CellMeasure => aligned("right", content);
const c = (content: number): CellMeasure => aligned("center", content);

const F: CellMeasure = { align: "left", fills: true, content: 0 };

/** A fill cell whose own text happens to be `content` columns wide. */
function filled(content: number): CellMeasure {
  return { align: "left", fills: true, content };
}

function plan(width: number, distribution: "content" | "equal", cells: readonly CellMeasure[]): PlannedCell[] {
  return planRow(width, distribution, cells);
}

const bases = (planned: PlannedCell[]): number[] => planned.map((cell) => cell.basis);
const grows = (planned: PlannedCell[]): number[] => planned.map((cell) => cell.grow);
const joints = (planned: PlannedCell[]): boolean[] => planned.map((cell) => cell.joint);

test("equal distribution gives every cell floor(W / N) and grow 1, with no joint, whatever the content", () => {
  const grids = [[8, 80], [3, 100], [10, 132], [8, 4]] as const;
  const alignments = ["left", "right", "center"] as const;
  const shapes = [
    (index: number) => aligned("left", 0),
    (index: number) => aligned(alignments[index % 3]!, index % 2 === 0 ? 0 : 99),
    (index: number) => aligned("right", 99),
  ];
  for (const [count, width] of grids) {
    for (const shape of shapes) {
      const planned = plan(width, "equal", Array.from({ length: count }, (_, index) => shape(index)));
      assert.deepEqual(bases(planned), Array.from({ length: count }, () => Math.floor(width / count)), `${count} at ${width}`);
      assert.deepEqual(grows(planned), Array.from({ length: count }, () => 1), "every cell is free to take the remainder");
      assert.deepEqual(joints(planned), Array.from({ length: count }, () => false), "an equal row carries no joint");
    }
  }
  // The ones that matter: the remainder is the allocator's, and more cells than columns is no special case.
  assert.deepEqual(bases(plan(100, "equal", [aligned("left", 0), aligned("left", 0), aligned("left", 0)])), [33, 33, 33]);
  assert.deepEqual(bases(plan(4, "equal", Array.from({ length: 8 }, () => aligned("left", 99)))), [0, 0, 0, 0, 0, 0, 0, 0]);
});

test("with no fill cell, the last left-aligned non-empty cell absorbs the slack, else the first non-empty cell", () => {
  // All three left-aligned: the last one absorbs, and the two joints are its neighbours' columns.
  const allLeft = plan(40, "content", [l(5), l(5), l(5)]);
  assert.deepEqual(bases(allLeft), [5, 6, 29]);
  assert.deepEqual(grows(allLeft), [0, 0, 0], "no surplus reaches the allocator");

  // No left-aligned cell at all, so the first non-empty cell absorbs: a right-aligned one, whose
  // spare columns sit before its text.
  assert.deepEqual(bases(plan(30, "content", [r(7), r(7)])), [22, 8]);

  // The empty last-left cell does not absorb; the left-aligned cell before it does.
  assert.deepEqual(bases(plan(40, "content", [l(5), r(7), l(0)])), [33, 7, 0]);

  // One cell takes the whole row.
  assert.deepEqual(bases(plan(40, "content", [l(5)])), [40]);
});

test("an empty content cell takes 0 columns; an all-empty row gives the slack to its first cell", () => {
  // The empty cell is not the absorber while a non-empty one exists, and it takes nothing.
  const emptyFirst = plan(30, "content", [l(0), r(7)]);
  assert.deepEqual(bases(emptyFirst), [0, 30]);
  assert.deepEqual(grows(emptyFirst), [0, 0]);

  // Nothing holds text: the first cell takes the row, though it renders nothing.
  assert.deepEqual(bases(plan(80, "content", [l(0), l(0)])), [80, 0]);
  assert.deepEqual(bases(plan(10, "content", [r(0), r(0), r(0)])), [10, 0, 0]);
  assert.deepEqual(grows(plan(10, "content", [r(0), r(0), r(0)])), [0, 0, 0]);

  // A single empty cell is that row's first cell.
  assert.deepEqual(bases(plan(12, "content", [l(0)])), [12]);
});

test("fill cells share the slack as floor(S / G) with grow 1, and a fill cell's own content width is ignored", () => {
  // Joel's second row: three fill cells, and the allocator's 34/33/33 is the footer's business.
  const thirds = plan(100, "content", [F, F, F]);
  assert.deepEqual(bases(thirds), [33, 33, 33]);
  assert.deepEqual(grows(thirds), [1, 1, 1]);

  // A content cell keeps its text's width; the two fills take the rest, differing by at most one.
  const between = plan(90, "content", [F, l(31), F]);
  assert.deepEqual(bases(between), [29, 31, 29]);
  assert.deepEqual(grows(between), [1, 0, 1]);

  assert.deepEqual(bases(plan(80, "content", [F, F])), [40, 40]);
  assert.deepEqual(bases(plan(99, "content", [F, F, F])), [33, 33, 33], "S mod G is 0");
  assert.deepEqual(bases(plan(101, "content", [F, F, F])), [33, 33, 33], "S mod G is G - 1");

  // A fill cell's own text is not its width.
  assert.deepEqual(bases(plan(100, "content", [filled(20), F, F])), [33, 33, 33]);
});

test("when the content needs W or more, nothing grows and nothing is negative", () => {
  // A fill cell between two content cells that already fill the row: its basis floors at zero.
  const overfull = plan(50, "content", [l(30), F, l(30)]);
  assert.deepEqual(bases(overfull), [30, 0, 30]);
  assert.deepEqual(grows(overfull), [0, 1, 0]);
  assert.deepEqual(joints(overfull), [false, false, false], "no joint across the fill cell");

  assert.deepEqual(bases(plan(30, "content", [l(30), F])), [30, 0], "S = 0 leaves the fill nothing");

  // Without a fill cell the joints collapse and the absorber's slack is not applied.
  const full = plan(80, "content", [l(40), l(40), l(40)]);
  assert.deepEqual(bases(full), [40, 40, 40]);
  assert.deepEqual(grows(full), [0, 0, 0]);
  assert.deepEqual(joints(full), [false, false, false], "C + J exceeds the row, so every joint drops");
});

test("a joint belongs to the right-hand cell of two non-empty content cells with no spare room between them", () => {
  // Joel's top row: `path` absorbs, so the joint sits before `thinking`, not before `model`.
  const top = plan(100, "content", [l(15), r(32), r(6)]);
  assert.deepEqual(bases(top), [61, 32, 7]);
  assert.deepEqual(joints(top), [false, false, true]);

  // The joint skips the empty cell between two content cells.
  const acrossEmpty = plan(30, "content", [r(5), r(0), r(7)]);
  assert.deepEqual(bases(acrossEmpty), [22, 0, 8]);
  assert.deepEqual(joints(acrossEmpty), [false, false, true]);

  // No joint beside a fill cell, at any width: the fill's share is the room, or there is none.
  for (const [width, expected] of [[30, [5, 18, 7]], [12, [5, 0, 7]], [11, [5, 0, 7]]] as const) {
    const besideFill = plan(width, "content", [r(5), F, r(7)]);
    assert.deepEqual(bases(besideFill), expected, `at ${width}`);
    assert.deepEqual(joints(besideFill), [false, false, false], `no joint at ${width}`);
  }
  const twoFills = plan(13, "content", [r(5), F, F, r(7)]);
  assert.deepEqual(bases(twoFills), [5, 0, 0, 7], "S = 1 is less than G = 2");
  assert.deepEqual(joints(twoFills), [false, false, false, false]);

  // A centered absorber's boundaries are not the joint's: its slack splits across both sides.
  const centred = plan(13, "content", [c(5), r(3), r(3)]);
  assert.deepEqual(bases(centred), [6, 3, 4]);
  assert.deepEqual(joints(centred), [false, false, true]);
});

test("every counted joint drops together when C + J > W, and not before", () => {
  // Both right-aligned, no absorber boundary to exclude: one joint. C + J = 17.
  assert.deepEqual(bases(plan(18, "content", [r(8), r(8)])), [9, 9], "one spare column before the first text");
  const atTheMargin = plan(17, "content", [r(8), r(8)]);
  assert.deepEqual(bases(atTheMargin), [8, 9], "W = C + J keeps the joint");
  assert.deepEqual(joints(atTheMargin), [false, true]);
  const oneShort = plan(16, "content", [r(8), r(8)]);
  assert.deepEqual(bases(oneShort), [8, 8], "W = C + J - 1 drops it, and no text is shortened");
  assert.deepEqual(joints(oneShort), [false, false]);

  // Joel's top row against the margin: at W = C + J the `path` text abuts `model` and the joint
  // before `thinking` stays; one column less and every joint is gone.
  assert.deepEqual(bases(plan(55, "content", [l(15), r(32), r(6)])), [16, 32, 7]);
  const abut = plan(54, "content", [l(15), r(32), r(6)]);
  assert.deepEqual(bases(abut), [15, 32, 7], "S = 0, and the absorber's neighbour abuts it");
  assert.deepEqual(joints(abut), [false, false, true]);
  const collapsed = plan(53, "content", [l(15), r(32), r(6)]);
  assert.deepEqual(bases(collapsed), [15, 32, 6]);
  assert.deepEqual(joints(collapsed), [false, false, false]);

  // Two counted joints go together, never one.
  const twoJoints = plan(20, "content", [r(6), r(6), r(6)]);
  assert.deepEqual(bases(twoJoints), [6, 7, 7], "C + J = 20 exactly");
  assert.deepEqual(joints(twoJoints), [false, true, true]);
  const bothGone = plan(19, "content", [r(6), r(6), r(6)]);
  assert.deepEqual(bases(bothGone), [7, 6, 6], "both joints gone; the freed column is the absorber's");
  assert.deepEqual(joints(bothGone), [false, false, false]);
});
