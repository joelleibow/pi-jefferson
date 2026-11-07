import assert from "node:assert/strict";
import { test } from "node:test";

import { visibleWidth } from "@earendil-works/pi-tui";

import type { Row } from "../extensions/jefferson/visuals/row.ts";
import { type Instrument, instrumentNamed } from "../extensions/jefferson/visuals/instrument.ts";
import { parseFormat, resolveFormat } from "../extensions/jefferson/visuals/format.ts";
import { fakeTheme } from "./fake-theme.ts";
import {
  createFooter,
} from "../extensions/jefferson/visuals/row-renderer.ts";
import {
  createSessionDataStore,
  type Readings,
} from "../extensions/jefferson/data/session-data-store.ts";


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
const readings: Readings = { provider: undefined, model: undefined, thinkingLevel: undefined, cwd: undefined, contextUsage: undefined, totals: undefined };

function rowOf(count: number, text = "Lorem ipsum dolor sit amet"): Row {
  return {
    id: "row-0",
    cells: Array.from({ length: count }, () => ({ instrument: { render: () => text }, align: "left" as const })),
  };
}

function lineAt(row: Row, width: number): string {
  return createFooter([row], () => readings, fakeTheme()).render(width)[0] ?? "";
}

test("a width that divides evenly gives every cell the same columns", () => {
  // Cell text fits the cell exactly, so no truncation intervenes in the geometry check.
  const line = createFooter([rowOf(8, "Lorem ipsu")], () => readings, fakeTheme()).render(80)[0] ?? "";
  assert.equal(visibleWidth(line), 80);
  assert.equal(line, composed(...Array<string>(8).fill("Lorem ipsu")));
});

test("a width that does not divide evenly spends the remainder on the row's earliest cells", () => {
  const line = createFooter([rowOf(3)], () => readings, fakeTheme()).render(100)[0] ?? "";
  assert.equal(visibleWidth(line), 100);
  assert.equal(line, composed(
    "Lorem ipsum dolor sit amet".padEnd(34),
    "Lorem ipsum dolor sit amet".padEnd(33),
    "Lorem ipsum dolor sit amet".padEnd(33),
  ));
});

test("the default row of ten cells at 132 spans all 132 columns", () => {
  const line = createFooter([rowOf(10, "x")], () => readings, fakeTheme()).render(132)[0] ?? "";
  assert.equal(line, composed("x".padEnd(14), "x".padEnd(14), ...Array<string>(8).fill("x".padEnd(13))));
  assert.equal(visibleWidth(line), 132);
});

test("content wider than its cell is truncated to one line", () => {
  // 3 cells at width 12: 4 columns each, against far wider content. Each cell is truncated to
  // fill — pad 0, ending in "\x1b[0m" — so visible() absorbs each trailing reset into the
  // closing frame, and the width and substring assertions stand read from visible(line).
  const line = lineAt(rowOf(3), 12);
  const text = visible(line);
  assert.equal(typeof line, "string");
  assert.equal(visibleWidth(line), 12);
  for (const raw of text.split("\n")) assert.ok(visibleWidth(raw) <= 12);
  assert.ok(!text.includes("Lorem ipsum dolor sit amet"), "the full text cannot fit");
});

test("an instrument resolving text wider than its cell is clipped and stays one line", () => {
  const row: Row = {
    id: "row-0",
    cells: [
      { instrument: { render: () => "provider: a-very-long-model-name" }, align: "left" },
      { instrument: { render: () => "thinking: high" }, align: "left" },
    ],
  };
  const line = lineAt(row, 20);
  // The first cell is truncated to fill, so visible() absorbs its trailing reset into the
  // closing frame; the width and substring assertions stand read from visible(line).
  const text = visible(line);
  assert.equal(visibleWidth(line), 20);
  assert.ok(text.startsWith("provide"), "the first cell clips at its 10 columns");
  assert.ok(!text.includes("a-very-long-model-name"), "the text is clipped, not overflowed");
  assert.ok(!text.includes("\n"), "the row stays one line");
});

test("short cell text is padded so the line spans the full width", () => {
  const line = lineAt(rowOf(3, "ab"), 12);
  assert.equal(line, composed("ab  ", "ab  ", "ab  "));
  assert.equal(visibleWidth(line), 12);
});

test("a left-aligned cell pads to the right of its text", () => {
  const line = lineAt(rowOf(3, "ab"), 20);
  assert.equal(line, composed("ab     ", "ab     ", "ab    "));
  assert.equal(visible(line), "ab     ab     ab    ");
  assert.equal(visibleWidth(line), 20);
});

test("a right-aligned cell pads to the left of its text", () => {
  const line = lineAt(
    { id: "row-0", cells: rowOf(3, "ab").cells.map((cell) => ({ ...cell, align: "right" as const })) },
    20,
  );
  assert.equal(line, composed("     ab", "     ab", "    ab"));
  assert.equal(visible(line), "     ab     ab    ab");
  assert.equal(visibleWidth(line), 20);
});

test("a centred cell splits its pad across both sides", () => {
  const line = lineAt(
    { id: "row-0", cells: rowOf(3, "ab").cells.map((cell) => ({ ...cell, align: "center" as const })) },
    20,
  );
  assert.equal(line, composed("  ab   ", "  ab   ", "  ab  "));
  assert.equal(visible(line), "  ab     ab     ab  ");
  assert.equal(visibleWidth(line), 20);
});

test("a centred cell's odd pad puts its extra column on the right", () => {
  const line = lineAt(
    { id: "row-0", cells: rowOf(3, "abé").cells.map((cell) => ({ ...cell, align: "center" as const })) },
    20,
  );
  // Only the third cell has an odd pad now: 3 columns split 1 before and 2 after.
  assert.equal(line, composed("  abé  ", "  abé  ", " abé  "));
  assert.equal(visible(line), "  abé    abé   abé  ");
  assert.equal(visibleWidth(line), 20);
});

test("text wider than its cell renders identically under any alignment", () => {
  const row: Row = {
    id: "row-0",
    cells: [
      { instrument: { render: () => "provider: a-very-long-model-name" }, align: "left" },
      { instrument: { render: () => "provider: a-very-long-model-name" }, align: "left" },
    ],
  };
  const left = lineAt(row, 21);
  const right = lineAt(
    { ...row, cells: row.cells.map((cell) => ({ ...cell, align: "right" as const })) },
    21,
  );
  const center = lineAt(
    { ...row, cells: row.cells.map((cell) => ({ ...cell, align: "center" as const })) },
    21,
  );
  assert.equal(right, left);
  assert.equal(center, left);
  assert.equal(visibleWidth(left), 21);
  // Both cells are truncated to fill — pad 0, the text ending in "\x1b[0m" — so visible()
  // absorbs each cell's trailing reset into the closing frame: the pre-merge string minus one
  // reset per cell.
  assert.equal(visible(left), "provider\x1b[0m...provide\x1b[0m...");
});

test("a wide glyph dropped by the clip leaves a pad that keeps the cell's width", () => {
  const line = lineAt(rowOf(3, "ab漢字cd"), 20);
  // The third cell drops a boundary glyph; its pad is measured from the clipped text.
  assert.equal(line, composed("ab漢\x1b[0m...", "ab漢\x1b[0m...", "ab\x1b[0m...\x1b[0m "));
  assert.equal(visible(line), "ab漢\x1b[0m...ab漢\x1b[0m...ab\x1b[0m...\x1b[0m ");
  assert.equal(visibleWidth(line), 20);
  const right = lineAt(
    { id: "row-0", cells: rowOf(3, "ab漢字cd").cells.map((cell) => ({ ...cell, align: "right" as const })) },
    20,
  );
  // Right-aligned, the pad leads and each cell's text ends in "\x1b[0m" with no pad after it, so
  // visible() absorbs that trailing reset into the closing frame: minus one reset per cell.
  assert.equal(visible(right), "ab漢\x1b[0m...ab漢\x1b[0m... ab\x1b[0m...");
  assert.equal(visibleWidth(right), 20);
});

test("an emoji clipped at the boundary leaves a one-column pad", () => {
  const line = lineAt(rowOf(3, "ab😀cdef"), 20);
  assert.equal(line, composed("ab😀\x1b[0m...", "ab😀\x1b[0m...", "ab\x1b[0m...\x1b[0m "));
  assert.equal(visible(line), "ab😀\x1b[0m...ab😀\x1b[0m...ab\x1b[0m...\x1b[0m ");
  assert.equal(visibleWidth(line), 20);
  const right = lineAt(
    { id: "row-0", cells: rowOf(3, "ab😀cdef").cells.map((cell) => ({ ...cell, align: "right" as const })) },
    20,
  );
  // As in the wide-glyph case, only the third cell needs the leading pad.
  assert.equal(visible(right), "ab😀\x1b[0m...ab😀\x1b[0m... ab\x1b[0m...");
  assert.equal(visibleWidth(right), 20);
});

test("a combining mark is measured in columns, not code units", () => {
  const line = lineAt(rowOf(3, "abé"), 20);
  assert.equal(line, composed("abé    ", "abé    ", "abé   "));
  assert.equal(visible(line), "abé    abé    abé   ");
  assert.equal(visibleWidth(line), 20);
  const right = lineAt(
    { id: "row-0", cells: rowOf(3, "abé").cells.map((cell) => ({ ...cell, align: "right" as const })) },
    20,
  );
  assert.equal(visible(right), "    abé    abé   abé");
  assert.equal(visibleWidth(right), 20);
});

test("an ANSI-styled cell's pad carries no styling", () => {
  // Asserted by counting the line's style-setting SGR sequences, not by matching a substring:
  // one open per cell, and none between the cell's close and its pad.
  const styled = (text: string): Row => ({
    id: "row-0",
    cells: Array.from({ length: 3 }, () => ({ instrument: { render: () => text }, align: "left" as const })),
  });
  for (const text of ["\x1b[31mab\x1b[0m", "\x1b[4mab"]) {
    const line = lineAt(styled(text), 20);
    assert.equal(visibleWidth(line), 20);
    for (const cell of line.split(FRAME).slice(1, 4)) {
      const setting = cell.match(/\x1b\[[0-9;]*m/g)?.filter((sgr) => sgr !== "\x1b[0m") ?? [];
      assert.equal(setting.length, 1, "one style-setting open per cell");
      assert.ok(/\x1b\[0m +$/.test(cell), "no styling between the cell's close and its pad");
    }
  }
});

test("the host closes an open style between cells", () => {
  const row: Row = {
    id: "row-0",
    cells: [
      { instrument: { render: () => "\x1b[4mabcdefghij" }, align: "left" },
      { instrument: { render: () => "cd" }, align: "right" },
    ],
  };
  const line = lineAt(row, 20);
  // cellWidth 10, remainder 0: the frame sits between the cells, so the second cell's leading
  // pad follows a reset the host wrote, not one this renderer wrote.
  assert.equal(line, composed("\x1b[4mabcdefghij", "        cd"));
  assert.equal(visibleWidth(line), 20);
});

test("wide glyphs and ANSI escapes are measured in visible columns, not string length", () => {
  const row: Row = {
    id: "row-0",
    // String.length would under-pad the styled cell mid-line; allocation cannot repair it.
    cells: [
      { instrument: { render: () => "\x1b[31mab\x1b[0m" }, align: "left" },
      { instrument: { render: () => "😀" }, align: "left" },
    ],
  };
  const line = lineAt(row, 9);
  assert.equal(visibleWidth(line), 9);
  assert.equal(line, composed("\x1b[31mab\x1b[0m" + "   ", "😀" + "  "));
  assert.ok(!line.includes("\n"));
});

test("the footer renders one line per row, in order, each spanning the width", () => {
  const footer = createFooter(
    [rowOf(2, "aa"), rowOf(4, "b"), rowOf(8, "c")],
    () => readings,
    fakeTheme(),
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
  const line = lineAt(rowOf(8), 4);
  assert.equal(typeof line, "string");
  assert.equal(visibleWidth(line), 4);
});

test("cell widths are recomputed when the width changes", () => {
  const footer = createFooter([rowOf(3)], () => readings, fakeTheme());
  const first = footer.render(100)[0] ?? "";
  assert.equal(first, composed("Lorem ipsum dolor sit amet".padEnd(34), "Lorem ipsum dolor sit amet".padEnd(33), "Lorem ipsum dolor sit amet".padEnd(33)));
  const resized = footer.render(90)[0] ?? "";
  assert.equal(visibleWidth(resized), 90);
  assert.equal(resized, composed(...Array<string>(3).fill("Lorem ipsum dolor sit amet".padEnd(30))));
});

test("the built-once tree keeps its cell memo when two renders share sample and width", () => {
  let resolves = 0;
  const footer = createFooter([{
    id: "row-0",
    cells: [{ instrument: { render: () => { resolves++; return "kept"; } }, align: "left" }],
  }], () => readings, fakeTheme());
  assert.equal(footer.render(30)[0], composed("kept".padEnd(30)));
  assert.equal(footer.render(30)[0], composed("kept".padEnd(30)));
  assert.equal(resolves, 1, "rebuilding the tree would discard the cell's memo");
  footer.render(40);
  assert.equal(resolves, 2, "a new width misses even with the same sample object");
});

test("each row seats its own basis on the first render", () => {
  const footer = createFooter([rowOf(3, "a"), rowOf(4, "b")], () => readings, fakeTheme());
  assert.deepEqual(footer.render(13), [
    composed("a    ", "a   ", "a   "),
    composed("b   ", "b  ", "b  ", "b  "),
  ]);
});

test("one render samples the store exactly once, whatever the row and cell count", () => {
  let samples = 0;
  const footer = createFooter(
    [rowOf(8, "a"), rowOf(8, "b"), rowOf(8, "c")],
    () => {
      samples += 1;
      return readings;
    },
    fakeTheme(),
  );
  assert.equal(samples, 1, "installation seeds the render slot");
  footer.render(80);
  assert.equal(samples, 2, "three rows of eight cells still take one render sample");
  footer.render(80);
  assert.equal(samples, 3, "one sample per render, not one per render per row");
});

test("an instrument resolves once per (sample, width) within a render, and again in the next render", () => {
  const handed: Array<{ readings: Readings; width: number }> = [];
  const capture: Instrument = {
    render(r, width) {
      handed.push({ readings: r, width });
      return "";
    },
  };
  const footer = createFooter(
    [
      { id: "row-0", cells: [{ instrument: capture, align: "left" }, { instrument: capture, align: "left" }, { instrument: capture, align: "left" }] },
      { id: "row-1", cells: [{ instrument: capture, align: "left" }] },
    ],
    // A fresh object per call: identity can only hold if the render sampled once.
    () => ({ ...readings }),
    fakeTheme(),
  );
  footer.render(30); // row 0's cells are 10 columns wide; row 1's single cell is 30
  assert.deepEqual(
    handed.map((call) => call.width),
    [30, 30, 30, 10, 10, 10, 30],
    "one call per distinct (cell, width): row 1's measure and layout both use the row width",
  );
  for (const call of handed) assert.equal(call.readings, handed[0]?.readings, "one object for the whole render");
  const previous = handed[0]?.readings;
  handed.length = 0;
  footer.render(30);
  assert.deepEqual(handed.map((call) => call.width), [30, 30, 30, 10, 10, 10, 30]);
  assert.notEqual(handed[0]?.readings, previous, "a new sample must re-resolve at the same width");
  for (const call of handed) assert.equal(call.readings, handed[0]?.readings);
});

test("invalidation drops cell memos and keeps the footer's three lines", () => {
  let resolves = 0;
  const capture: Instrument = { render: () => { resolves++; return "text"; } };
  const footer = createFooter([0, 1, 2].map((index) => ({
    id: `row-${index}`,
    cells: [{ instrument: capture, align: "left" }],
  })), () => readings, fakeTheme());
  footer.invalidate();
  assert.equal(footer.render(20).length, 3);
  assert.equal(resolves, 3);
  footer.invalidate();
  footer.invalidate();
  assert.equal(footer.render(20).length, 3);
  assert.equal(resolves, 6);
});

test("two cells holding the model instrument resolve identical text", () => {
  const declaration = instrumentNamed("model");
  assert.ok(declaration);
  const segments = parseFormat(declaration, declaration.defaultFormat);
  const model: Instrument = { render: (readings, width, theme) => resolveFormat(declaration, segments, {}, readings, width, theme) };
  const live: Readings = { ...readings, provider: "anthropic", model: "claude-opus-4", thinkingLevel: "high" };
  const footer = createFooter(
    [{ id: "row-0", cells: [{ instrument: model, align: "left" }, { instrument: model, align: "left" }] }],
    () => live,
    fakeTheme(),
  );
  const [line] = footer.render(48);
  assert.equal(line, composed("anthropic: claude-opus-4", "anthropic: claude-opus-4"));
});

test("a push between two renders shows up in the next render and not before", () => {
  const handed: Readings[] = [];
  const capture: Instrument = {
    render(r) {
      handed.push(r);
      return r.model ?? "";
    },
  };
  const store = createSessionDataStore({
    seed: { provider: "anthropic", model: "claude-opus-4", thinkingLevel: "high", cwd: undefined },
    requestRender: () => {},
    readUsage: () => ({ contextUsage: undefined, sessionId: "session-1", leafId: null }),
    readEntries: () => [],
  });
  const footer = createFooter(
    [{ id: "row-0", cells: [{ instrument: capture, align: "left" }, { instrument: capture, align: "left" }] }],
    () => store.sample(),
    fakeTheme(),
  );

  const first = footer.render(26)[0];
  store.modelSelected("anthropic", "gpt-5");
  const second = footer.render(26)[0];

  assert.equal(first, composed(...Array<string>(2).fill("claude-opus-4")));
  assert.equal(second, composed(...Array<string>(2).fill("gpt-5".padEnd(13))), "both cells see the pushed value");
  assert.equal(handed[0]?.model, "claude-opus-4", "the first render's object kept its values");
});
