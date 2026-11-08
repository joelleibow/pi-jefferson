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
    distribution: "equal",
    cells: Array.from({ length: count }, () => ({ instrument: { fills: false, render: () => text }, align: "left" as const })),
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
  const line = lineAt(contentRowOf(3, "Lorem ipsum dolor sit amet"), 12);
  const text = visible(line);
  assert.equal(typeof line, "string");
  assert.equal(visibleWidth(line), 12);
  for (const raw of text.split("\n")) assert.ok(visibleWidth(raw) <= 12);
  assert.ok(!text.includes("Lorem ipsum dolor sit amet"), "the full text cannot fit");
});

test("an instrument resolving text wider than its cell is clipped and stays one line", () => {
  const row: Row = {
    id: "row-0",
    distribution: "content",
    cells: [
      { instrument: { fills: false, render: () => "provider: a-very-long-model-name" }, align: "left" },
      { instrument: { fills: false, render: () => "thinking: high" }, align: "left" },
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
    { id: "row-0", distribution: "equal", cells: rowOf(3, "ab").cells.map((cell) => ({ ...cell, align: "right" as const })) },
    20,
  );
  assert.equal(line, composed("     ab", "     ab", "    ab"));
  assert.equal(visible(line), "     ab     ab    ab");
  assert.equal(visibleWidth(line), 20);
});

test("a centred cell splits its pad across both sides", () => {
  const line = lineAt(
    { id: "row-0", distribution: "equal", cells: rowOf(3, "ab").cells.map((cell) => ({ ...cell, align: "center" as const })) },
    20,
  );
  assert.equal(line, composed("  ab   ", "  ab   ", "  ab  "));
  assert.equal(visible(line), "  ab     ab     ab  ");
  assert.equal(visibleWidth(line), 20);
});

test("a centred cell's odd pad puts its extra column on the right", () => {
  const line = lineAt(
    { id: "row-0", distribution: "equal", cells: rowOf(3, "abé").cells.map((cell) => ({ ...cell, align: "center" as const })) },
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
    distribution: "equal",
    cells: [
      { instrument: { fills: false, render: () => "provider: a-very-long-model-name" }, align: "left" },
      { instrument: { fills: false, render: () => "provider: a-very-long-model-name" }, align: "left" },
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
    { id: "row-0", distribution: "equal", cells: rowOf(3, "ab漢字cd").cells.map((cell) => ({ ...cell, align: "right" as const })) },
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
    { id: "row-0", distribution: "equal", cells: rowOf(3, "ab😀cdef").cells.map((cell) => ({ ...cell, align: "right" as const })) },
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
    { id: "row-0", distribution: "equal", cells: rowOf(3, "abé").cells.map((cell) => ({ ...cell, align: "right" as const })) },
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
    distribution: "equal",
    cells: Array.from({ length: 3 }, () => ({ instrument: { fills: false, render: () => text }, align: "left" as const })),
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
    distribution: "equal",
    cells: [
      { instrument: { fills: false, render: () => "\x1b[4mabcdefghij" }, align: "left" },
      { instrument: { fills: false, render: () => "cd" }, align: "right" },
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
    distribution: "equal",
    // String.length would under-pad the styled cell mid-line; allocation cannot repair it.
    cells: [
      { instrument: { fills: false, render: () => "\x1b[31mab\x1b[0m" }, align: "left" },
      { instrument: { fills: false, render: () => "😀" }, align: "left" },
    ],
  };
  const line = lineAt(row, 9);
  assert.equal(visibleWidth(line), 9);
  assert.equal(line, composed("\x1b[31mab\x1b[0m" + "   ", "😀" + "  "));
  assert.ok(!line.includes("\n"));
});

test("the footer renders one line per row, in order, each spanning the width", () => {
  const footer = createFooter(
    [contentRowOf(2, "aa"), contentRowOf(4, "b"), contentRowOf(8, "c")],
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
  const line = lineAt(contentRowOf(8, "Lorem ipsum dolor sit amet"), 4);
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
    distribution: "equal",
    cells: [{ instrument: { fills: false, render: () => { resolves++; return "kept"; } }, align: "left" }],
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
    fills: false,
    render(r, width) {
      handed.push({ readings: r, width });
      return "";
    },
  };
  const footer = createFooter(
    [
      { id: "row-0", distribution: "equal", cells: [{ instrument: capture, align: "left" }, { instrument: capture, align: "left" }, { instrument: capture, align: "left" }] },
      { id: "row-1", distribution: "equal", cells: [{ instrument: capture, align: "left" }] },
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
  const capture: Instrument = { fills: false, render: () => { resolves++; return "text"; } };
  const footer = createFooter([0, 1, 2].map((index) => ({
    id: `row-${index}`,
    distribution: "equal",
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
  const model: Instrument = { fills: false, render: (readings, width, theme) => resolveFormat(declaration, segments, {}, readings, width, theme) };
  const live: Readings = { ...readings, provider: "anthropic", model: "claude-opus-4", thinkingLevel: "high" };
  const footer = createFooter(
    [{ id: "row-0", distribution: "equal", cells: [{ instrument: model, align: "left" }, { instrument: model, align: "left" }] }],
    () => live,
    fakeTheme(),
  );
  const [line] = footer.render(48);
  assert.equal(line, composed("anthropic: claude-opus-4", "anthropic: claude-opus-4"));
});

test("a push between two renders shows up in the next render and not before", () => {
  const handed: Readings[] = [];
  const capture: Instrument = {
    fills: false,
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
    [{ id: "row-0", distribution: "equal", cells: [{ instrument: capture, align: "left" }, { instrument: capture, align: "left" }] }],
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

/** A content-distribution row of one text, repeated, for the tests the default holds. */
function contentRowOf(count: number, text: string): Row {
  return rowOfCells(Array.from({ length: count }, () => cellOf(text)));
}

/** A content-distribution row: one fake instrument per cell, holding the given text. */
function contentRow(cells: Array<{ text: string; align?: "left" | "right" | "center" }>): Row {
  return {
    id: "row-0",
    distribution: "content",
    cells: cells.map(({ text, align = "left" }) => ({ instrument: { fills: false, render: () => text }, align })),
  };
}

test("a content cell takes the width its text needs", () => {
  // The left-aligned cell is the absorber, so its spare columns sit after its text and the
  // right-aligned neighbour is exactly its text's width.
  const line = lineAt(contentRow([{ text: "ab" }, { text: "cdef", align: "right" }]), 40);
  assert.equal(line, composed("ab" + " ".repeat(34), "cdef"));
  assert.equal(visibleWidth(line), 40);

  const one = lineAt(contentRow([{ text: "ab" }]), 20);
  assert.equal(one, composed("ab".padEnd(20)));
  assert.equal(visibleWidth(one), 20);

  // W equals the two texts' widths: nothing is left to absorb and nothing separates them.
  const exact = lineAt(contentRow([{ text: "ab" }, { text: "cdef", align: "right" }]), 6);
  assert.equal(exact, composed("ab", "cdef"));
  assert.equal(visibleWidth(exact), 6);
});

test("content width is measured in columns, whatever the text holds", () => {
  // Each payload with the columns it occupies: a wide emoji, a wide BMP glyph, a combining mark,
  // and the same two letters wrapped in a style. None of them is its string length.
  const payloads: Array<[string, number]> = [
    ["🧠 ab", 5],
    ["漢ab", 4],
    ["e\u0301ab", 3],
    ["\x1b[31mab\x1b[0m", 2],
  ];
  for (const [text, columns] of payloads) {
    // The neighbour of a wide or styled text starts at the same column as of a plain one: the
    // right-aligned cell is exactly its own two columns.
    const line = lineAt(contentRow([{ text }, { text: "xy", align: "right" }]), 20);
    assert.equal(line, composed(text + " ".repeat(18 - columns), "xy"), `${JSON.stringify(text)} is ${columns} columns`);
    assert.equal(visibleWidth(line), 20);

    // At W exactly the two texts' columns there is nothing to absorb and nothing is clipped: the
    // first text is whole and the neighbour's two columns follow it, so S is 0.
    const exact = lineAt(contentRow([{ text }, { text: "xy", align: "right" }]), columns + 2);
    // The host's framing merges with a text's own closing reset, so this reads the line with every
    // escape stripped: what a reader sees is the text, whole, then the neighbour's two columns.
    const plain = (value: string): string => visible(value).replace(/\x1b\[[0-9;]*m/g, "");
    assert.equal(visibleWidth(exact), columns + 2, `the line is ${columns + 2} columns at ${JSON.stringify(text)}`);
    assert.equal(plain(exact), plain(text) + "xy", "the text is whole and the neighbour follows it with no pad");
    assert.ok(!plain(exact).includes("..."), "no ellipsis when the text exactly fits");
  }
});

test("the probe is taken at width 0, not at the row's width", () => {
  // This text is 40 columns wide only when it is asked at 40, the row's own width: a probe at the
  // row width would be the only render that carries the '#', and it would reach the line.
  const spiky: Instrument = {
    fills: false,
    render: (_readings: Readings, width: number) => width === 40 ? "ab" + "#".repeat(38) : "ab",
  };
  const row: Row = {
    id: "row-0",
    distribution: "content",
    cells: [{ instrument: spiky, align: "left" }, { instrument: { fills: false, render: () => "cd" }, align: "right" }],
  };
  const line = lineAt(row, 40);
  // The final text is resolved at the cell's own allocated width (38), never at the row's.
  assert.equal(line, composed("ab" + " ".repeat(36), "cd"));
  assert.equal(visible(line).includes("#"), false, "the row's own width never reaches the measure");
  assert.equal(visibleWidth(line), 40);
});

/** One cell of a content row, its fake instrument reporting whether it fills. */
function cellOf(
  text: string,
  { fills = false, align = "left" }: { fills?: boolean; align?: "left" | "right" | "center" } = {},
): Row["cells"][number] {
  return { instrument: { fills, render: () => text }, align };
}

function rowOfCells(cells: Row["cells"]): Row {
  return { id: "row-0", distribution: "content", cells };
}

test("blank and bar cells fill and share the rest, differing by at most one", () => {
  // Joel's second row: three fill cells at 100 take 34, 33, 33 — the first takes the remainder.
  const thirds = lineAt(rowOfCells([
    cellOf("a", { fills: true }),
    cellOf("b", { fills: true }),
    cellOf("c", { fills: true }),
  ]), 100);
  assert.equal(visibleWidth(thirds), 100);
  assert.equal(visible(thirds), "a".padEnd(34) + "b".padEnd(33) + "c".padEnd(33));

  // A content cell at its text's width leaves the two fills the rest, the earlier one taking the
  // remainder column: 30 + 31 + 29.
  const mixed = lineAt(rowOfCells([
    cellOf("a", { fills: true }),
    cellOf("x".repeat(31)),
    cellOf("b", { fills: true }),
  ]), 90);
  assert.equal(visibleWidth(mixed), 90);
  assert.equal(visible(mixed), "a".padEnd(30) + "x".repeat(31) + "b".padEnd(29));

  // A fill cell's own text is not its width: the row lays out as though it held nothing.
  const longText = lineAt(rowOfCells([
    cellOf("y".repeat(20), { fills: true }),
    cellOf("b", { fills: true }),
    cellOf("c", { fills: true }),
  ]), 100);
  assert.equal(visibleWidth(longText), 100);
  assert.equal(visible(longText), "y".repeat(20).padEnd(34) + "b".padEnd(33) + "c".padEnd(33));
});

test("an empty cell takes no column and does not change where any text sits", () => {
  const two = lineAt(rowOfCells([cellOf("path"), cellOf("model", { align: "right" })]), 80);
  const three = lineAt(rowOfCells([cellOf("path"), cellOf("model", { align: "right" }), cellOf("")]), 80);
  assert.equal(three, two, "a last empty cell adds no column and moves no text");
  assert.equal(visibleWidth(three), 80);
  assert.equal(visible(three), "path" + " ".repeat(71) + "model", "the left-aligned path cell absorbs");

  // Nothing renders text at all: the first cell takes the row, though it holds nothing.
  const allEmpty = lineAt(rowOfCells([cellOf("", { align: "right" }), cellOf("", { align: "right" })]), 80);
  assert.equal(visibleWidth(allEmpty), 80);
  assert.equal(visible(allEmpty), " ".repeat(80));
});

test("a joint sits ahead of a left-aligned or centred cell's text, plain and unstyled", () => {
  // The plan is [5, 6, 9]: the joints sit before `b` and `c`, and `c` absorbs the slack to its
  // right, so the line is text, space, text, space, text, and the rest.
  const line = lineAt(rowOfCells([cellOf("aaaaa"), cellOf("bbbbb"), cellOf("ccccc")]), 20);
  assert.equal(visible(line), "aaaaa bbbbb ccccc   ");
  assert.equal(visibleWidth(line), 20);

  // A styled neighbour's joint is a plain leading space, ahead of the cell's own escape.
  const styled = lineAt(
    rowOfCells([cellOf("a", { align: "right" }), cellOf("\x1b[4mbc", { align: "right" })]),
    4,
  );
  assert.equal(styled, composed("a", " \x1b[4mbc"), "the space is outside the style, and the host closes the line");
  assert.equal(visibleWidth(styled), 4);
});

/** Joel's top-row shape: 15, 32 and 6 columns, left, right and right. */
function topRow(): Row {
  return rowOfCells([
    cellOf("a".repeat(15)),
    cellOf("b".repeat(32), { align: "right" }),
    cellOf("c".repeat(6), { align: "right" }),
  ]);
}

test("two right-aligned instruments sit together at the right edge, whatever the width", () => {
  for (const width of [132, 100, 80]) {
    const line = lineAt(topRow(), width);
    // Built from the fixture's text widths: the absorber's slack, then the two texts with one
    // column between them, the last ending at the row's last column.
    assert.equal(visible(line), "a".repeat(15) + " ".repeat(width - 54) + "b".repeat(32) + " " + "c".repeat(6), `at ${width}`);
    assert.equal(visibleWidth(line), width);
  }
});

test("no joint where room already exists beside an absorbing cell", () => {
  const line = lineAt(rowOfCells([cellOf("a".repeat(15)), cellOf("b".repeat(32), { align: "right" })]), 80);
  assert.equal(visible(line), "a".repeat(15) + " ".repeat(33) + "b".repeat(32), "only the slack separates the texts");
  assert.equal(visibleWidth(line), 80);

  // A right-aligned first cell absorbs: only its own spare columns sit before it, and the joint
  // before the second cell is present.
  const leading = lineAt(rowOfCells([cellOf("a".repeat(5), { align: "right" }), cellOf("b".repeat(7), { align: "right" })]), 80);
  assert.equal(visible(leading), " ".repeat(67) + "a".repeat(5) + " " + "b".repeat(7));
  assert.equal(visibleWidth(leading), 80);
});

test("no joint beside a fill cell, and none for an empty cell", () => {
  const atExact = lineAt(rowOfCells([cellOf("a".repeat(5), { align: "right" }), cellOf("x", { fills: true }), cellOf("b".repeat(7), { align: "right" })]), 12);
  assert.equal(visible(atExact), "a".repeat(5) + "b".repeat(7), "the texts abut, and neither is shortened");
  assert.equal(visibleWidth(atExact), 12);

  const oneShort = lineAt(rowOfCells([cellOf("a".repeat(5), { align: "right" }), cellOf("x", { fills: true }), cellOf("b".repeat(7), { align: "right" })]), 11);
  assert.equal(visibleWidth(oneShort), 11, "one line, the row's width");
  // Which of the two content cells loses the column is the allocator's, so this asks only that a
  // text gave way at its end rather than the row overflowing.
  assert.ok(visible(oneShort).includes("..."), "a text is clipped at its end");

  const between = lineAt(rowOfCells([cellOf("a".repeat(5), { align: "right" }), cellOf("x", { fills: true }), cellOf("b".repeat(7), { align: "right" })]), 30);
  assert.equal(visible(between), "a".repeat(5) + "x".padEnd(18) + "b".repeat(7), "the fill cell sits between the texts");
  assert.equal(visibleWidth(between), 30);

  // An empty cell is not a neighbour: the joint goes to the text after it.
  const acrossEmpty = lineAt(rowOfCells([cellOf("a".repeat(5), { align: "right" }), cellOf(""), cellOf("b".repeat(7), { align: "right" })]), 20);
  assert.equal(visible(acrossEmpty), " ".repeat(7) + "a".repeat(5) + " " + "b".repeat(7));
  assert.equal(visibleWidth(acrossEmpty), 20);

  // Where the slack is smaller than the fill cells it would be shared between, a joint across a
  // fill cell would take the fill's only column: the spare one goes to the fill, not to a joint.
  const starved = lineAt(rowOfCells([
    cellOf("a".repeat(5), { align: "right" }),
    cellOf("x", { fills: true }),
    cellOf("y", { fills: true }),
    cellOf("b".repeat(7), { align: "right" }),
  ]), 13);
  assert.equal(visible(starved), "a".repeat(5) + "x" + "b".repeat(7));
  assert.equal(visibleWidth(starved), 13);
});

test("the joint gives way before content: both right-aligned", () => {
  const cells = (): Row => rowOfCells([cellOf("a".repeat(8), { align: "right" }), cellOf("b".repeat(8), { align: "right" })]);
  const roomy = lineAt(cells(), 18);
  assert.equal(visible(roomy), " " + "a".repeat(8) + " " + "b".repeat(8), "one spare column before the first text");

  const atTheMargin = lineAt(cells(), 17);
  assert.equal(visible(atTheMargin), "a".repeat(8) + " " + "b".repeat(8), "no spare column, and the joint stays");

  const oneShort = lineAt(cells(), 16);
  assert.equal(visible(oneShort), "a".repeat(8) + "b".repeat(8), "the joint is gone and both texts are whole");
  for (const line of [roomy, atTheMargin, oneShort]) assert.equal(line.split("\n").length, 1);
});

test("the joints collapse together, and path abuts model at the margin", () => {
  const atTheMargin = lineAt(topRow(), 54);
  assert.equal(visible(atTheMargin), "a".repeat(15) + "b".repeat(32) + " " + "c".repeat(6), "path abuts model, the joint before thinking stays");

  const collapsed = lineAt(topRow(), 53);
  assert.equal(visible(collapsed), "a".repeat(15) + "b".repeat(32) + "c".repeat(6), "no joint remains, and no text is shortened");

  const oneSpare = lineAt(topRow(), 55);
  assert.equal(visible(oneSpare), "a".repeat(15) + " " + "b".repeat(32) + " " + "c".repeat(6), "the spare column goes to path");

  // Two counted joints go together, never one.
  const three = lineAt(rowOfCells([
    cellOf("a".repeat(6), { align: "right" }),
    cellOf("b".repeat(6), { align: "right" }),
    cellOf("c".repeat(6), { align: "right" }),
  ]), 19);
  assert.equal(visible(three), " " + "a".repeat(6) + "b".repeat(6) + "c".repeat(6));
});

test("a centred absorber with one spare column puts it on the right", () => {
  const line = lineAt(rowOfCells([
    cellOf("a".repeat(5), { align: "center" }),
    cellOf("b".repeat(3), { align: "right" }),
    cellOf("c".repeat(3), { align: "right" }),
  ]), 13);
  assert.equal(visible(line), "a".repeat(5) + " " + "b".repeat(3) + " " + "c".repeat(3));
  assert.equal(visibleWidth(line), 13);
  assert.equal(line.split("\n").length, 1);
});

test("when the content needs more than the row, every cell can give up columns, and a row is still one line of W", () => {
  const wide = (): Row => rowOfCells([
    cellOf("a".repeat(40)),
    cellOf("b".repeat(40), { align: "right" }),
    cellOf("c".repeat(40), { align: "right" }),
  ]);
  const line = lineAt(wide(), 80);
  assert.equal(line.split("\n").length, 1, "one line");
  assert.equal(visibleWidth(line), 80);
  // No cell is dropped in favour of the others: each gives up columns, so each ends in its own
  // ellipsis. Which cell lost how much is the allocator's call, and is not asserted.
  assert.equal(visible(line).match(/\.\.\./g)?.length, 3, "every cell's text is clipped at its end");

  // The same cells grow between two renders at the same width.
  let size = 5;
  const growing: Instrument = { fills: false, render: () => "g".repeat(size) };
  const footer = createFooter([rowOfCells([
    { instrument: growing, align: "left" },
    { instrument: growing, align: "left" },
    { instrument: growing, align: "left" },
  ])], () => ({ ...readings }), fakeTheme());
  assert.equal(visibleWidth(footer.render(80)[0] ?? ""), 80);
  size = 40;
  const grown = footer.render(80)[0] ?? "";
  assert.equal(grown.split("\n").length, 1, "still one line");
  assert.equal(visibleWidth(grown), 80);

  // One column over the row, with nothing to give but a cell's own text.
  const tight = lineAt(rowOfCells([cellOf("x".repeat(40)), cellOf("y")]), 40);
  assert.equal(visibleWidth(tight), 40);
  assert.equal(tight.split("\n").length, 1);
});

test("every column is allocated, at any width, with the composition the host's", () => {
  const footer = createFooter([
    // Content cells with an absorber, a fill between content cells, an empty row, ten fills, three
    // right-aligned cells, and one equal row of seven.
    rowOfCells([cellOf("a".repeat(12)), cellOf("b".repeat(20), { align: "right" }), cellOf("c".repeat(6), { align: "right" })]),
    rowOfCells([cellOf("x", { fills: true }), cellOf("d".repeat(10)), cellOf("y", { fills: true }), cellOf("e".repeat(7), { align: "right" })]),
    rowOfCells([cellOf(""), cellOf("")]),
    rowOfCells(Array.from({ length: 10 }, () => cellOf("z", { fills: true }))),
    rowOfCells([cellOf("f".repeat(6), { align: "right" }), cellOf("g".repeat(6), { align: "right" }), cellOf("h".repeat(6), { align: "right" })]),
    { id: "row-5", distribution: "equal", cells: Array.from({ length: 7 }, (_, index) => cellOf(String(index).repeat(3))) },
  ], () => readings, fakeTheme());

  for (let width = 1; width <= 150; width++) {
    const lines = footer.render(width);
    assert.equal(lines.length, 6, `six rows at ${width}`);
    for (const line of lines) {
      assert.equal(line.split("\n").length, 1, `one line at ${width}`);
      assert.equal(visibleWidth(line), width, `exactly the row's width at ${width}`);
      // The line is the host's composition of its children and nothing else: every column belongs
      // to a cell, so the extension padded nothing onto the line.
      const children = line.split(FRAME).slice(1, -1);
      assert.equal(children.reduce((sum, child) => sum + visibleWidth(child), 0), width, `the cells hold every column at ${width}`);
    }
  }

  // Fixed cases at the boundaries the plan's arithmetic has, where a column's owner is visible.
  const fill = (text: string): Row["cells"][number] => cellOf(text, { fills: true });
  const twoTexts = (width: number): string => visible(lineAt(rowOfCells([
    cellOf("a".repeat(5), { align: "right" }),
    fill("x"),
    cellOf("b".repeat(7), { align: "right" }),
  ]), width));
  assert.equal(twoTexts(12), "a".repeat(5) + "b".repeat(7), "S = 0 leaves the fill nothing");
  assert.equal(twoTexts(13), "a".repeat(5) + "x" + "b".repeat(7), "S = 1 is the fill's");

  assert.equal(
    visible(lineAt(rowOfCells([fill("x"), cellOf("y".repeat(31)), fill("z")]), 90)),
    "x".padEnd(30) + "y".repeat(31) + "z".padEnd(29),
    "S mod G = 0",
  );
  assert.equal(
    visible(lineAt(rowOfCells([fill("x"), fill("y")]), 81)),
    "x".padEnd(41) + "y".padEnd(40),
    "S mod G = G - 1: the remainder column goes to the earliest fill",
  );
  assert.equal(visibleWidth(lineAt(rowOfCells(Array.from({ length: 8 }, () => cellOf("w"))), 4)), 4, "W < N");
});

test("align in a content cell with no spare columns changes nothing", () => {
  const lines = (["left", "right", "center"] as const).map((align) =>
    lineAt(rowOfCells([cellOf("abc", { align }), cellOf("yy")]), 20));
  // The last cell is the left-aligned absorber and the first has exactly its three columns, so
  // the pad arithmetic emits nothing for any of the three alignments: the line is the first text,
  // the joint before the absorber, the absorber's text, and its slack.
  assert.equal(visible(lines[0] ?? ""), "abc" + " yy" + " ".repeat(14));
  assert.equal(lines[1], lines[0], "right renders the same columns as left");
  assert.equal(lines[2], lines[0], "center renders the same columns as left");
});

test("a second render of the same sample asks for nothing new", () => {
  const calls: Record<string, number[]> = { a: [], b: [], c: [] };
  const fake = (name: "a" | "b" | "c", text: string): Instrument => ({
    fills: false,
    render: (_readings: Readings, width: number) => {
      calls[name]!.push(width);
      return text;
    },
  });
  const footer = createFooter([rowOfCells([
    { instrument: fake("a", "a".repeat(15)), align: "left" },
    { instrument: fake("b", "b".repeat(32)), align: "right" },
    { instrument: fake("c", "c".repeat(6)), align: "right" },
  ])], () => readings, fakeTheme());

  footer.render(100);
  // One resolve per width each: the probe, the host's measure, and the allocated width — and the
  // allocated widths are not the row's, which is what the old one-slot memo could not hold.
  assert.deepEqual(calls.a, [0, 100, 61]);
  assert.deepEqual(calls.b, [0, 100, 32]);
  assert.deepEqual(calls.c, [0, 100, 7]);

  footer.render(100);
  assert.deepEqual(calls.a, [0, 100, 61], "the same sample at the same width asks nothing new");
  assert.deepEqual(calls.b, [0, 100, 32]);
  assert.deepEqual(calls.c, [0, 100, 7]);
});

test("a new sample, or invalidate(), drops every cached width", () => {
  let resolves = 0;
  const fake: Instrument = {
    fills: false,
    render: (sample: Readings) => {
      resolves += 1;
      return sample.model === "second" ? "y".repeat(10) : "ab";
    },
  };
  let current: Readings = { ...readings, model: "first" };
  const footer = createFooter([rowOfCells([{ instrument: fake, align: "left" }])], () => current, fakeTheme());

  assert.equal(visible(footer.render(20)[0] ?? ""), "ab".padEnd(20));
  current = { ...readings, model: "second" };
  assert.equal(
    visible(footer.render(20)[0] ?? ""),
    "y".repeat(10).padEnd(20),
    "the new sample's text, whole: nothing cached from the sample before it survives",
  );

  const afterNewSample = resolves;
  footer.render(20);
  assert.equal(resolves, afterNewSample, "and a repeat render of that sample asks nothing new");

  footer.invalidate();
  footer.render(20);
  assert.ok(resolves > afterNewSample, "invalidation drops the cached text, so the next render resolves again");
  const afterInvalidate = resolves;
  footer.render(20);
  assert.equal(resolves, afterInvalidate, "and the cache fills again");
});

test("the row re-seats when a cell's basis changes, not only when the window does", () => {
  let thinking = "t".repeat(7);
  let current: Readings = readings;
  const cells = (): Row["cells"] => [
    { instrument: { fills: false, render: () => "a".repeat(15) }, align: "left" },
    { instrument: { fills: false, render: () => "b".repeat(32) }, align: "right" },
    { instrument: { fills: false, render: () => thinking }, align: "right" },
  ];
  const footer = createFooter([rowOfCells(cells())], () => current, fakeTheme());
  // [60, 32, 8]: the path text absorbs 45 columns, the joint sits before the thinking text.
  assert.equal(visible(footer.render(100)[0] ?? ""), "a".repeat(15) + " ".repeat(45) + "b".repeat(32) + " " + "t".repeat(7));

  thinking = "t".repeat(6);
  current = { ...readings };
  const second = footer.render(100)[0] ?? "";
  const fresh = createFooter([rowOfCells(cells())], () => current, fakeTheme()).render(100)[0] ?? "";
  assert.equal(second, fresh, "the second render lays the row out for the shorter text");
  // One column shorter's worth of breadth: [61, 32, 7], and the thinking text still ends at 100.
  assert.equal(visible(second), "a".repeat(15) + " ".repeat(46) + "b".repeat(32) + " " + "t".repeat(6));
  assert.equal(visibleWidth(second), 100);
});

test("a resize re-seats the default row", () => {
  const footer = createFooter([topRow()], () => readings, fakeTheme());
  assert.equal(visible(footer.render(100)[0] ?? ""), "a".repeat(15) + " ".repeat(46) + "b".repeat(32) + " " + "c".repeat(6));

  const resized = footer.render(90)[0] ?? "";
  const fresh = createFooter([topRow()], () => readings, fakeTheme()).render(90)[0] ?? "";
  assert.equal(resized, fresh, "the resized row is the row a fresh footer draws at 90");
  assert.equal(visible(resized), "a".repeat(15) + " ".repeat(36) + "b".repeat(32) + " " + "c".repeat(6), "no cell keeps a width from 100");
  assert.equal(visibleWidth(resized), 90);
});
