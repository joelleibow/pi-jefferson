import assert from "node:assert/strict";
import { test } from "node:test";

import { visibleWidth } from "@earendil-works/pi-tui";

import type { Row } from "../extensions/jefferson/configuration.ts";
import { type Instrument, model } from "../extensions/jefferson/instrument.ts";
import {
  createFooter,
  renderRow,
} from "../extensions/jefferson/row-renderer.ts";
import {
  createSessionDataStore,
  type Readings,
} from "../extensions/jefferson/session-data-store.ts";


/** The framing the host wraps around each child it composes: a style reset and a hyperlink reset. */
const FRAME = "\x1b[0m\x1b]8;;\x07";

/** A row's line as the host composes it: one framing per cell, plus one closing the line. */
function composed(...cells: string[]): string {
  return FRAME + cells.join(FRAME) + FRAME;
}

/** A line with the host's framing removed, for assertions about what a reader sees. */
function visible(line: string): string {
  return line.replaceAll(FRAME, "");
}

/** The readings a geometry fixture's instrument ignores: these tests are about width, not data. */
const readings: Readings = { provider: undefined, model: undefined, thinkingLevel: undefined };

function rowOf(count: number, text = "Lorem ipsum dolor sit amet"): Row {
  return {
    id: "row-0",
    cells: Array.from({ length: count }, () => ({ instrument: { resolve: () => text } })),
  };
}

test("a width that divides evenly gives every cell the same columns", () => {
  // Cell text fits the cell exactly, so no truncation intervenes in the geometry check.
  const line = renderRow(rowOf(8, "Lorem ipsu"), 80, readings);
  assert.equal(visibleWidth(line), 80);
  assert.equal(line, composed(...Array<string>(8).fill("Lorem ipsu")));
});

test("a width that does not divide evenly leaves the remainder blank at the right edge", () => {
  const line = renderRow(rowOf(3), 100, readings);
  assert.equal(visibleWidth(line), 100);
  // 33 columns per cell, the 100th column blank at the right edge.
  assert.equal(line, composed(...Array<string>(3).fill("Lorem ipsum dolor sit amet".padEnd(33))) + " ");
  assert.equal(line.at(-1), " ");
});

test("content wider than its cell is truncated to one line", () => {
  // 3 cells at width 12: 4 columns each, against far wider content.
  const line = renderRow(rowOf(3), 12, readings);
  assert.equal(typeof line, "string");
  assert.equal(visibleWidth(line), 12);
  for (const raw of line.split("\n")) assert.ok(visibleWidth(raw) <= 12);
  assert.ok(!line.includes("Lorem ipsum dolor sit amet"), "the full text cannot fit");
});

test("an instrument resolving text wider than its cell is clipped and stays one line", () => {
  const row: Row = {
    id: "row-0",
    cells: [
      { instrument: { resolve: () => "provider: a-very-long-model-name" } },
      { instrument: { resolve: () => "thinking: high" } },
    ],
  };
  const line = renderRow(row, 20, readings);
  assert.equal(visibleWidth(line), 20);
  assert.ok(visible(line).startsWith("provide"), "the first cell clips at its 10 columns");
  assert.ok(!line.includes("a-very-long-model-name"), "the text is clipped, not overflowed");
  assert.ok(!line.includes("\n"), "the row stays one line");
});

test("short cell text is padded so the line spans the full width", () => {
  const line = renderRow(rowOf(3, "ab"), 12, readings);
  assert.equal(line, composed("ab  ", "ab  ", "ab  "));
  assert.equal(visibleWidth(line), 12);
});

test("wide glyphs and ANSI escapes are measured in visible columns, not string length", () => {
  const row: Row = {
    id: "row-0",
    // The ANSI cell comes first and the width leaves a remainder of 1, so
    // padding it from String.length (12, not 2) under-pads it mid-line and
    // the line-level remainder cannot restore the byte-identical string.
    cells: [
      { instrument: { resolve: () => "\x1b[31mab\x1b[0m" } },
      { instrument: { resolve: () => "😀" } },
    ],
  };
  const line = renderRow(row, 9, readings);
  assert.equal(visibleWidth(line), 9);
  assert.equal(line, composed("\x1b[31mab\x1b[0m" + "  ", "😀" + "  ") + " ");
  assert.ok(!line.includes("\n"));
});

test("the footer renders one line per row, in order, each spanning the width", () => {
  const footer = createFooter(
    [rowOf(2, "aa"), rowOf(4, "b"), rowOf(8, "c")],
    () => readings,
  );
  const lines = footer.render(80);
  assert.equal(lines.length, 3);
  assert.deepEqual(
    lines.map((line) => visibleWidth(line)),
    [80, 80, 80],
  );
  assert.ok(visible(lines[0] ?? "").startsWith("aa"));
  assert.ok(visible(lines[1] ?? "").startsWith("b"));
  assert.ok(visible(lines[2] ?? "").startsWith("c"));
});

test("more cells than columns still renders exactly one line of the width", () => {
  const line = renderRow(rowOf(8), 4, readings);
  assert.equal(typeof line, "string");
  assert.equal(visibleWidth(line), 4);
});

test("cell widths are recomputed when the width changes", () => {
  const row = rowOf(3, "Lorem ipsum dolor sit amet");
  renderRow(row, 100, readings); // 33 columns per cell
  const resized = renderRow(row, 90, readings); // 30 columns per cell, nothing retained
  assert.equal(visibleWidth(resized), 90);
  assert.equal(resized, composed(...Array<string>(3).fill("Lorem ipsum dolor sit amet".padEnd(30))));
});

test("one render samples the store exactly once, whatever the row and cell count", () => {
  let samples = 0;
  const footer = createFooter(
    [rowOf(8, "a"), rowOf(8, "b"), rowOf(8, "c")],
    () => {
      samples += 1;
      return readings;
    },
  );
  footer.render(80);
  assert.equal(samples, 1, "three rows of eight cells still take one sample");
  footer.render(80);
  assert.equal(samples, 2, "one sample per render, not one per render per row");
});

test("every cell of one render is handed the same readings object", () => {
  const handed: Readings[] = [];
  const capture: Instrument = {
    resolve(r) {
      handed.push(r);
      return "";
    },
  };
  const footer = createFooter(
    [
      { id: "row-0", cells: [{ instrument: capture }, { instrument: capture }] },
      { id: "row-1", cells: [{ instrument: capture }] },
    ],
    // A fresh object per call: identity can only hold if the render sampled once.
    () => ({ ...readings }),
  );
  footer.render(30);
  assert.equal(handed.length, 3);
  for (const r of handed) assert.equal(r, handed[0], "one object for the whole render");
});

test("two cells holding the model instrument resolve identical text", () => {
  const live: Readings = { provider: "anthropic", model: "claude-opus-4", thinkingLevel: "high" };
  const footer = createFooter(
    [{ id: "row-0", cells: [{ instrument: model }, { instrument: model }] }],
    () => live,
  );
  const [line] = footer.render(48);
  assert.equal(line, composed("anthropic: claude-opus-4", "anthropic: claude-opus-4"));
});

test("a push between two renders shows up in the next render and not before", () => {
  const handed: Readings[] = [];
  const capture: Instrument = {
    resolve(r) {
      handed.push(r);
      return r.model ?? "";
    },
  };
  const store = createSessionDataStore({
    seed: { provider: "anthropic", model: "claude-opus-4", thinkingLevel: "high" },
    requestRender: () => {},
  });
  const footer = createFooter(
    [{ id: "row-0", cells: [{ instrument: capture }, { instrument: capture }] }],
    () => store.sample(),
  );

  const first = footer.render(26)[0];
  store.modelSelected("anthropic", "gpt-5");
  const second = footer.render(26)[0];

  assert.equal(first, composed(...Array<string>(2).fill("claude-opus-4")));
  assert.equal(second, composed(...Array<string>(2).fill("gpt-5".padEnd(13))), "both cells see the pushed value");
  assert.equal(handed[0]?.model, "claude-opus-4", "the first render's object kept its values");
});
