import assert from "node:assert/strict";
import { test } from "node:test";

import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import type { Row } from "../extensions/jefferson/configuration.ts";
import { createFooter, renderRow, type WidthHelpers } from "../extensions/jefferson/row-renderer.ts";

const helpers: WidthHelpers = { truncateToWidth, visibleWidth };

function rowOf(count: number, text = "Lorem ipsum dolor sit amet"): Row {
  return {
    id: "row-0",
    cells: Array.from({ length: count }, () => ({ text })),
  };
}

test("a width that divides evenly gives every cell the same columns", () => {
  // Cell text fits the cell exactly, so no truncation intervenes in the geometry check.
  const line = renderRow(rowOf(8, "Lorem ipsu"), 80, helpers);
  assert.equal(visibleWidth(line), 80);
  assert.equal(line, "Lorem ipsu".repeat(8));
});

test("a width that does not divide evenly leaves the remainder blank at the right edge", () => {
  const line = renderRow(rowOf(3), 100, helpers);
  assert.equal(visibleWidth(line), 100);
  // 33 columns per cell, the 100th column blank at the right edge.
  assert.equal(line, "Lorem ipsum dolor sit amet".padEnd(33).repeat(3) + " ");
  assert.equal(line.at(-1), " ");
});

test("content wider than its cell is truncated to one line", () => {
  // 3 cells at width 12: 4 columns each, against far wider content.
  const line = renderRow(rowOf(3), 12, helpers);
  assert.equal(typeof line, "string");
  assert.equal(visibleWidth(line), 12);
  for (const raw of line.split("\n")) assert.ok(visibleWidth(raw) <= 12);
  assert.ok(!line.includes("Lorem ipsum dolor sit amet"), "the full text cannot fit");
});

test("short cell text is padded so the line spans the full width", () => {
  const line = renderRow(rowOf(3, "ab"), 12, helpers);
  assert.equal(line, "ab  ab  ab  ");
  assert.equal(visibleWidth(line), 12);
});

test("wide glyphs and ANSI escapes are measured in visible columns, not string length", () => {
  const row: Row = {
    id: "row-0",
    // The ANSI cell comes first and the width leaves a remainder of 1, so
    // padding it from String.length (12, not 2) under-pads it mid-line and
    // the line-level remainder cannot restore the byte-identical string.
    cells: [{ text: "\x1b[31mab\x1b[0m" }, { text: "😀" }],
  };
  const line = renderRow(row, 9, helpers);
  assert.equal(visibleWidth(line), 9);
  assert.equal(line, "\x1b[31mab\x1b[0m" + "  " + "😀" + "   ");
  assert.ok(!line.includes("\n"));
});

test("the footer renders one line per row, in order, each spanning the width", () => {
  const footer = createFooter([rowOf(2, "aa"), rowOf(4, "b"), rowOf(8, "c")], helpers);
  const lines = footer.render(80);
  assert.equal(lines.length, 3);
  assert.deepEqual(
    lines.map((line) => visibleWidth(line)),
    [80, 80, 80],
  );
  assert.ok(lines[0]?.startsWith("aa"));
  assert.ok(lines[1]?.startsWith("b"));
  assert.ok(lines[2]?.startsWith("c"));
});

test("more cells than columns still renders exactly one line of the width", () => {
  const line = renderRow(rowOf(8), 4, helpers);
  assert.equal(typeof line, "string");
  assert.equal(visibleWidth(line), 4);
});

test("cell widths are recomputed when the width changes", () => {
  const row = rowOf(3, "Lorem ipsum dolor sit amet");
  renderRow(row, 100, helpers); // 33 columns per cell
  const resized = renderRow(row, 90, helpers); // 30 columns per cell, nothing retained
  assert.equal(visibleWidth(resized), 90);
  assert.equal(resized, "Lorem ipsum dolor sit amet".padEnd(30).repeat(3));
});
