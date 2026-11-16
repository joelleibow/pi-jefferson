import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import type { Theme, ThemeStyle } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";

import { createFooter } from "../extensions/jefferson/components/row/row-renderer.ts";
import type { Cell } from "../extensions/jefferson/components/row/row.ts";
import type { Configuration } from "../extensions/jefferson/configuration.ts";
import {
  DEFAULT_CELLS,
  MAX_CELLS,
  readConfiguration,
} from "../extensions/jefferson/configuration.ts";
import { DEFAULT_CELL_TEXT } from "../extensions/jefferson/components/instruments/instrument.ts";
import type { Readings } from "../extensions/jefferson/data/session-data-store.ts";
import { fakeTheme } from "./fake-theme.ts";

const seed: Readings = {
  provider: "anthropic", model: "claude-opus-4", thinkingLevel: "high", cwd: "/a/pi-jefferson",
  home: "/a", branch: "main", sessionName: "refactor footer",
  statuses: new Map([["b", "idle"], ["a", "3 tasks"]]),
  contextUsage: { tokens: 86400, percent: 43.2, contextWindow: 200000 },
  totals: { input: 1000, output: 2000, cacheRead: 0, cacheWrite: 0, cost: 0.123 },
  sampledAt: 0,
};

/** `count` placeholder rows: a row lists the entries it renders, and one `blank` entry fills it. */
function blankRows(count: number): { instrument: string }[][] {
  return Array.from({ length: count }, () => Array.from({ length: DEFAULT_CELLS }, () => ({ instrument: "blank" })));
}

function cellText(cell: Cell): string {
  return cell.instrument.render(seed, 80, fakeTheme());
}

/** Write `document` as the agent file of a fresh temp dir and read the configuration. */
function readDocument(document: unknown, theme: Theme = fakeTheme()): Configuration & { path: string } {
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  const agentPath = join(dir, "pi-jefferson.json");
  writeFileSync(agentPath, typeof document === "string" ? document : JSON.stringify(document));
  return {
    ...readConfiguration({
      agentPath,
      projectPath: join(dir, "missing.json"),
      projectTrusted: false,
      theme,
    }),
    path: agentPath,
  };
}

test("a rows list of entry lists yields one row per member, in order", () => {
  const { rows, warning } = readDocument({
    rows: [[{ instrument: "model" }], [{ instrument: "thinking" }, { instrument: "blank" }]],
  });
  assert.equal(warning, undefined);
  assert.deepEqual(rows.map((row) => row.cells.map(cellText)), [
    ["Model: anthropic/claude-opus-4"],
    ["Thinking: " + fakeTheme().style("High", { fg: "thinkingHigh" }), DEFAULT_CELL_TEXT],
  ]);
});

test("a retired top-level key rejects alone, beside an empty rows list, and with another retired key", () => {
  // 0.12.0 read a document without `rows` as one row, so each of these renders ten blanks in
  // silence without the guard, and the guard answers before any other fault in the document.
  rejected({ distribution: "equal" }, RETIRED);
  rejected({ id: "footer" }, RETIRED);
  rejected({ cells: [{ instrument: "model" }] }, RETIRED);
  rejected({ cells: [{ instrument: "model" }], rows: [] }, RETIRED);
  rejected({ cells: [{ instrument: "model" }], id: "footer", distribution: "equal" }, RETIRED);
});

test("rows given as something other than a list is rejected naming rows", () => {
  for (const rows of [{}, "model", 4, null]) {
    rejected({ rows }, "the rows value is not a list");
  }
});

test("an empty rows list is accepted with no warning, alone and beside settings", () => {
  for (const document of [
    { rows: [] },
    { rows: [], rowGap: 2 },
    { rows: [], instruments: { blank: { format: "configured" } } },
  ]) {
    const { rows, warning } = readDocument(document);
    assert.equal(warning, undefined, JSON.stringify(document));
    assert.equal(rows.length, 1, "the default row stands in for no declared row");
    assert.equal(rows[0]?.cells.length, DEFAULT_CELLS);
  }
});

test("a document with no rows and no retired key renders the default row", () => {
  for (const [document, gap] of [
    [{}, 1],
    [{ instruments: { blank: { format: "configured" } } }, 1],
    [{ rowGap: 2 }, 2],
    [{ instruments: {}, rowGap: 3 }, 3],
  ] as const) {
    const { rows, rowGap, warning } = readDocument(document);
    assert.equal(warning, undefined, JSON.stringify(document));
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.cells.length, DEFAULT_CELLS);
    assert.equal(rowGap, gap, "a setting beside no rows still applies");
  }
});

test("the configuration document must be an object", () => {
  for (const document of [42, null, [[]], ["x"]]) {
    rejected(document, "the configuration document is not an object");
  }
});

test("a row written as an object is rejected with the whole rows form, at either mistake", () => {
  const notARow = (row: number): string =>
    `row ${row}: is not a list; a row is a list of entries, as {"rows": [[{"instrument": "model"}]]}`;
  // A row the way it was written before this change, and a flat list of entries one bracket short.
  rejected({ rows: [{ cells: [{ instrument: "model" }] }] }, notARow(1));
  rejected({ rows: [{ instrument: "model" }] }, notARow(1));
  // A member of `rows` of any other kind is placed by its row alone.
  for (const member of ["model", 4]) {
    rejected({ rows: [member] }, notARow(1));
  }
  rejected({ rows: [[{ instrument: "model" }], null] }, notARow(2));
});

test("an absent configuration yields the default row and the default gap, with no warning", () => {
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  const { rows, rowGap, warning } = readConfiguration({
    agentPath: join(dir, "missing-agent.json"),
    projectPath: join(dir, "missing-project.json"),
    projectTrusted: true,
    theme: fakeTheme(),
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.equal(rowGap, 1, "no document to set a gap, so the default one");
  assert.equal(warning, undefined);
});

test("a row list is both the count and the placement, in order", () => {
  const { rows, warning } = readDocument({ rows: [[{ instrument: "model" }, { instrument: "thinking" }, { instrument: "blank" }]] });
  assert.deepEqual(
    rows[0]?.cells.map(cellText),
    ["Model: anthropic/claude-opus-4", "Thinking: " + fakeTheme().style("High", { fg: "thinkingHigh" }), DEFAULT_CELL_TEXT],
  );
  assert.equal(warning, undefined);
});

test("a cell object with an unrecognised key rejects and names the key", () => {
  for (const [entry, key] of [
    [{ instrument: "model", width: 4 }, "width"],
    [{ instrument: "model", aling: "right" }, "aling"],
    [{ text: "x" }, "text"],
  ] as const) {
    const { rows, warning } = readDocument({ rows: [[entry]] });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.cells.length, 10);
    assert.ok(warning, "a rejected document warns");
    assert.match(warning, /unrecognised key/);
    assert.ok(warning.includes(key));
  }
});

test("a row list of strings is rejected with no converted read", () => {
  const { rows, warning } = readDocument({ rows: [["model", "thinking"]] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.ok(warning, "a rejected document warns");
  assert.match(warning, /not an object/);
});

test("a cell that declares no align normalizes to left", () => {
  const noAlign = readDocument({ rows: [[{ instrument: "model" }]] });
  assert.equal(noAlign.warning, undefined);
  assert.deepEqual(noAlign.rows[0]?.cells.map(cellText), ["Model: anthropic/claude-opus-4"]);
  for (const cell of noAlign.rows[0]?.cells ?? []) {
    assert.equal(cell.align, "left");
  }

  const right = readDocument({ rows: [[{ instrument: "model", align: "right" }]] });
  assert.equal(right.warning, undefined);
  assert.deepEqual(right.rows[0]?.cells.map((cell) => cell.align), ["right"]);
});

test("a cells entry past the ceiling that is not an object rejects the document", () => {
  const cells: unknown[] = Array.from({ length: 11 }, () => ({ instrument: "blank" }));
  cells.push(42);
  const { rows, warning } = readDocument({ rows: [cells] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.ok(warning, "a rejected document warns");
  assert.match(warning, /not an object/);
});

test("a cells entry past the ceiling naming an unknown instrument warns and renders ten cells", () => {
  const { rows, warning } = readDocument({
    rows: [Array.from({ length: 12 }, (_, i) => ({ instrument: i === 11 ? "brnach" : "blank" }))],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.ok(warning, "the unknown instrument still warns past the ceiling");
  assert.match(warning, /brnach/);
});

test("the cell-count constants are named for cells", () => {
  assert.equal(DEFAULT_CELLS, 10);
  assert.equal(MAX_CELLS, 10);
});

test("with a level and nothing configured, the thinking cell renders its default label and capitalized level", () => {
  const { rows, warning } = readDocument({ rows: [[{ instrument: "thinking" }]] });
  assert.equal(warning, undefined);
  assert.deepEqual(rows[0]?.cells.map(cellText), ["Thinking: " + fakeTheme().style("High", { fg: "thinkingHigh" })]);
  assert.equal(rows[0]?.cells[0]?.instrument.render({ ...seed, thinkingLevel: "off" }, 80, fakeTheme()), "Thinking: " + fakeTheme().style("Off", { fg: "thinkingOff" }), "off is a level like the others, not an unknown");
});

test("a configured label replaces the default label", () => {
  const replaced = readDocument({ instruments: { thinking: { label: "🤔" } }, rows: [[{ instrument: "thinking" }]] });
  assert.equal(replaced.warning, undefined);
  assert.deepEqual(replaced.rows[0]?.cells.map(cellText), ["🤔 " + fakeTheme().style("High", { fg: "thinkingHigh" })]);
  assert.equal(replaced.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme())?.includes("Thinking: "), false, "the default label is not shown beside a configured one");
  const removed = readDocument({ instruments: { thinking: { label: "" } }, rows: [[{ instrument: "thinking" }]] });
  assert.deepEqual(removed.rows[0]?.cells.map(cellText), [fakeTheme().style("High", { fg: "thinkingHigh" })], "an empty label removes the default");
});

test("an unknown name warns by its row, and its cell renders blank", () => {
  const { rows, warning, path } = readDocument({
    rows: [
      [{ instrument: "blank" }],
      [{ instrument: "blank" }],
      [{ instrument: "model" }, { instrument: "taiknr.savings" }, { instrument: "thinking" }],
    ],
  });
  assert.equal(warning, `pi-jefferson: ${path} row 3: "taiknr.savings" is not a known instrument`);
  assert.deepEqual(
    rows[2]?.cells.map(cellText),
    ["Model: anthropic/claude-opus-4", DEFAULT_CELL_TEXT, "Thinking: " + fakeTheme().style("High", { fg: "thinkingHigh" })],
    "the unknown name renders blank while the rest of the row renders its instruments",
  );
});

test("one unknown name in two rows is reported once for each row, in row order", () => {
  const { warning, path } = readDocument({
    rows: [[{ instrument: "taiknr.savings" }], [{ instrument: "blank" }], [{ instrument: "taiknr.savings" }]],
  });
  assert.equal(
    warning,
    `pi-jefferson: ${path} row 1: "taiknr.savings" is not a known instrument; row 3: "taiknr.savings" is not a known instrument`,
    "one part per row a user must fix",
  );
});

test("one unknown name twice in one row is reported once", () => {
  const { warning, path } = readDocument({ rows: [[{ instrument: "taiknr.savings" }, { instrument: "taiknr.savings" }]] });
  assert.equal(warning, `pi-jefferson: ${path} row 1: "taiknr.savings" is not a known instrument`);
});

test("a name only the instruments block configures is reported by the block, with no row", () => {
  const { warning, path } = readDocument({ instruments: { nope: {} } });
  assert.equal(
    warning,
    `pi-jefferson: ${path} the instruments block names instruments the extension does not implement: "nope"`,
    "no row holds the name, so the block reports it and claims nothing about a cell",
  );
});

test("the instruments block names every unknown it configures, in key order", () => {
  const { warning, path } = readDocument({ instruments: { other: {}, nope: {} } });
  assert.equal(
    warning,
    `pi-jefferson: ${path} the instruments block names instruments the extension does not implement: "other", "nope"`,
    "the block's key order, not an alphabetical one",
  );
});

test("a name a row and the block both name is reported by each, the row's part first", () => {
  const { warning, path } = readDocument({
    rows: [[{ instrument: "blank" }], [{ instrument: "nope" }]],
    instruments: { nope: {} },
  });
  assert.equal(
    warning,
    `pi-jefferson: ${path} row 2: "nope" is not a known instrument; the instruments block names instruments the extension does not implement: "nope"`,
  );
});

test("every placed part joins in row order, then the block's one part", () => {
  const { warning, path } = readDocument({
    rows: [[{ instrument: "aa" }], [{ instrument: "bb" }]],
    instruments: { nope: {} },
  });
  assert.equal(
    warning,
    `pi-jefferson: ${path} row 1: "aa" is not a known instrument; row 2: "bb" is not a known instrument; the instruments block names instruments the extension does not implement: "nope"`,
  );
});

test("two unknown names in one row follow the position of each name's first entry", () => {
  const { warning, path } = readDocument({ rows: [[{ instrument: "bb" }, { instrument: "aa" }]] });
  assert.equal(
    warning,
    `pi-jefferson: ${path} row 1: "bb" is not a known instrument; row 1: "aa" is not a known instrument`,
    "each name keeps the place of its first entry, so a user reads the row left to right",
  );
});

test("an empty row is rejected and placed by its row alone", () => {
  rejected({ rows: [[{ instrument: "model" }], []] }, "row 2: is empty; a row lists the entries it renders");
});

test("an entry that is not an object is rejected and named by row and instrument", () => {
  for (const entry of ["model", 4, ["model"], null]) {
    rejected({ rows: [[entry]] }, 'row 1, instrument 1: is not an object; declare {"instrument": "model"}');
  }
});

test("an entry with an unrecognised key is rejected naming the key", () => {
  for (const key of ["distribution", "width", "aling"]) {
    rejected(
      { rows: [[{ instrument: "model", [key]: 4 }]] },
      `row 1, instrument 1: has an unrecognised key "${key}"; an entry carries instrument and align`,
    );
  }
});

test("an entry with no instrument is rejected in Joel's words, placed by position", () => {
  rejected({ rows: [[{ instrument: "model" }, { align: "right" }]] }, 'row 1, instrument 2: no "instrument" named');
});

test("an instrument that is not a non-empty string is rejected", () => {
  for (const instrument of [4, ""]) {
    rejected(
      { rows: [[{ instrument: "blank" }], [{ instrument: "blank" }], [{ instrument: "blank" }, { instrument }]] },
      'row 3, instrument 2: "instrument" is not a non-empty string',
    );
  }
});

test("an align outside the three is rejected naming the value", () => {
  // A value that is not a string is shown unquoted, as 0.12.0 showed it.
  for (const [align, shown] of [["middle", '"middle"'], ["Center", '"Center"'], [4, "4"]] as const) {
    rejected(
      { rows: [[{ instrument: "model", align }]] },
      `row 1, instrument 1: align is not "left", "right" or "center": ${shown}`,
    );
  }
});

test("a row above the ceiling renders ten cells and is accepted", () => {
  const entries = Array.from({ length: 12 }, () => ({ instrument: "blank" }));
  const { rows, warning } = readDocument({ rows: [entries] });
  assert.equal(warning, undefined, "the ceiling truncates the list, it does not reject it");
  assert.equal(rows[0]?.cells.length, MAX_CELLS);
});

test("an entry past the ceiling is still validated and placed by its position", () => {
  const entries: { instrument: string; align?: string }[] = Array.from({ length: 11 }, () => ({ instrument: "blank" }));
  entries.push({ instrument: "blank", align: "middle" });
  rejected(
    { rows: [[{ instrument: "blank" }], entries] },
    'row 2, instrument 12: align is not "left", "right" or "center": "middle"',
  );
});

test("an unknown name past the ceiling still warns", () => {
  const entries = Array.from({ length: 12 }, (_, index) => ({ instrument: index === 11 ? "brnach" : "blank" }));
  const { rows, warning, path } = readDocument({ rows: [entries] });
  assert.equal(rows[0]?.cells.length, MAX_CELLS, "the ceiling still truncates the list");
  assert.equal(warning, `pi-jefferson: ${path} row 1: "brnach" is not a known instrument`);
});

for (const [name, entry] of [
  ["zero", 0],
  ["negative", -1],
  ["non-integer", 2.5],
  ["null", null],
] as const) {
  test(`a cells entry of ${name} is rejected`, () => {
    const { rows, warning } = readDocument({ rows: [[entry]] });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.cells.length, 10);
    assert.ok(warning, "a rejected document warns");
  });
}

test("a trusted project document replaces the agent document whole", () => {
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  const agentPath = join(dir, "agent.json");
  const projectPath = join(dir, "project.json");
  writeFileSync(
    agentPath,
    JSON.stringify({ rows: [[{ instrument: "blank" }, { instrument: "blank" }, { instrument: "blank" }]] }),
  );
  writeFileSync(projectPath, JSON.stringify({ rows: blankRows(2) }));
  const { rows } = readConfiguration({ agentPath, projectPath, projectTrusted: true, theme: fakeTheme() });
  assert.deepEqual(
    rows.map((row) => row.cells.length),
    [10, 10],
  );
});

test("an untrusted project document is ignored", () => {
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  const agentPath = join(dir, "agent.json");
  const projectPath = join(dir, "project.json");
  writeFileSync(
    agentPath,
    JSON.stringify({ rows: [[{ instrument: "blank" }, { instrument: "blank" }, { instrument: "blank" }]] }),
  );
  writeFileSync(projectPath, JSON.stringify({ rows: blankRows(2) }));
  const { rows } = readConfiguration({ agentPath, projectPath, projectTrusted: false, theme: fakeTheme() });
  assert.deepEqual(
    rows.map((row) => row.cells.length),
    [3],
  );
});

test("with only the agent file present, its rows are used", () => {
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  const agentPath = join(dir, "agent.json");
  writeFileSync(
    agentPath,
    JSON.stringify({ rows: [[{ instrument: "blank" }, { instrument: "blank" }, { instrument: "blank" }]] }),
  );
  const { rows } = readConfiguration({
    agentPath,
    projectPath: join(dir, "missing.json"),
    projectTrusted: true,
    theme: fakeTheme(),
  });
  assert.deepEqual(
    rows.map((row) => row.cells.length),
    [3],
  );
});

test("every cell carries an instrument and an alignment", () => {
  for (const count of [1, 3, 8]) {
    const { rows } = readDocument({ rows: [Array.from({ length: count }, () => ({ instrument: "blank" }))] });
    const cells = rows[0]?.cells;
    assert.ok(Array.isArray(cells) && cells.length === count);
    for (const cell of cells ?? []) {
      assert.deepEqual(Object.keys(cell), ["instrument", "align"]);
      assert.equal(cellText(cell), DEFAULT_CELL_TEXT);
      assert.equal(cell.instrument, cells[0]?.instrument);
      assert.equal(cell.align, "left");
    }
  }

  const declared = readDocument({
    rows: [[{ instrument: "model", align: "right" }, { instrument: "thinking", align: "center" }]],
  });
  assert.deepEqual(declared.rows[0]?.cells.map((cell) => cell.align), ["right", "center"]);
});

test("the default row's cells carry the left alignment", () => {
  const { rows } = readDocument({});
  const cells = rows[0]?.cells ?? [];
  for (const cell of cells) {
    assert.deepEqual(Object.keys(cell), ["instrument", "align"]);
    assert.equal(cell.align, "left");
  }
});

test("an unparseable document is rejected", () => {
  const { rows, warning } = readDocument("{ not json");
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.ok(warning, "an unparseable document warns");
});

/** One row holding one model cell: a line whose text the seed fixes, for the line-list assertions. */
const MODEL_ROW = [{ instrument: "model" }];
const MODEL_LINE = "Model: anthropic/claude-opus-4".padEnd(40);

/** The lines a document renders at `width`, its escapes stripped: what a reader sees. */
function documentLines(document: unknown, width: number): string[] {
  const { rows, rowGap } = readDocument(document);
  return createFooter(rows, () => seed, fakeTheme(), rowGap).render(width).map(stripTerminalSequences);
}

test("an absent rowGap renders one empty line between the rows", () => {
  const read = readDocument({ rows: [MODEL_ROW, MODEL_ROW] });
  assert.equal(read.warning, undefined);
  assert.equal(read.rowGap, 1, "absent leaves the default");
  assert.deepEqual(documentLines({ rows: [MODEL_ROW, MODEL_ROW] }, 40), [MODEL_LINE, "", MODEL_LINE]);
});

test("a rowGap that is not a whole number from 0 to 3 is refused, and the default row renders with the default space", () => {
  for (const value of [-1, 1.5, "1", null, 4, 1e21]) {
    rejected({ rows: blankRows(2), rowGap: value }, `rowGap must be a whole number from 0 to 3: ${JSON.stringify(value)}`);
  }

  const refused = readDocument({ rows: blankRows(2), rowGap: 4 });
  assert.equal(refused.rowGap, 1, "a refusal carries the default gap");
  const lines = createFooter(refused.rows, () => seed, fakeTheme(), refused.rowGap).render(20);
  assert.equal(lines.length, 1, "the default row renders as one line");
  assert.equal(visibleWidth(lines[0] ?? ""), 20);
});

test("rowGap 3, the ceiling, is accepted and renders three empty lines between the rows", () => {
  const read = readDocument({ rows: [MODEL_ROW, MODEL_ROW], rowGap: 3 });
  assert.equal(read.warning, undefined);
  assert.equal(read.rowGap, 3);
  assert.deepEqual(documentLines({ rows: [MODEL_ROW, MODEL_ROW], rowGap: 3 }, 40), [
    MODEL_LINE, "", "", "", MODEL_LINE,
  ]);
});

test("rowGap sits beside a rows list and in a document with no rows", () => {
  const listed = readDocument({ rows: [MODEL_ROW, MODEL_ROW], rowGap: 2 });
  assert.equal(listed.warning, undefined, "rowGap beside rows is not a conflict");
  assert.equal(listed.rowGap, 2);

  const rowless = readDocument({ rowGap: 2 });
  assert.equal(rowless.warning, undefined);
  assert.equal(rowless.rowGap, 2);
  assert.equal(rowless.rows.length, 1, "a setting and no rows renders the default row");
  assert.equal(rowless.rows[0]?.cells.length, DEFAULT_CELLS);
});

test("a misspelt rowgap is ignored without a warning and the default space renders", () => {
  const misspelt = { rows: [MODEL_ROW, MODEL_ROW], rowgap: 0 };
  const read = readDocument(misspelt);
  assert.equal(read.warning, undefined, "an unknown document key stays silent");
  assert.equal(read.rowGap, 1);
  assert.deepEqual(documentLines(misspelt, 40), [MODEL_LINE, "", MODEL_LINE]);
});

test("a document refused for another reason, and an unparseable one, render the default gap", () => {
  const refused = readDocument({ cells: [{ instrument: "model" }], rows: [{}] });
  assert.ok(refused.warning, "a rejected document warns");
  assert.equal(refused.rowGap, 1);
  const lines = createFooter(refused.rows, () => seed, fakeTheme(), refused.rowGap).render(40);
  assert.equal(lines.length, 1, "the default row renders as one line");
  assert.equal(visibleWidth(lines[0] ?? ""), 40);

  const unparseable = readDocument("{ not json");
  assert.ok(unparseable.warning, "an unparseable document warns");
  assert.equal(unparseable.rowGap, 1);
});

test("the instruments section alone configures the default row", () => {
  const configured = readDocument({ instruments: { blank: { format: "configured" } } });
  assert.equal(configured.warning, undefined);
  assert.equal(configured.rows[0]?.cells.length, 10);
  assert.deepEqual(configured.rows[0]?.cells.map(cellText), Array<string>(10).fill("configured"));
  const empty = readDocument({ instruments: {} });
  assert.equal(empty.warning, undefined);
  assert.deepEqual(empty.rows[0]?.cells.map(cellText), Array<string>(10).fill(DEFAULT_CELL_TEXT));
});

test("a document giving every shipped instrument a string label is accepted with no warning", () => {
  const instruments = Object.fromEntries(
    ["blank", "model", "thinking", "path", "context", "tokens", "cost"].map((name) => [name, { label: `${name}: ` }]),
  );
  const { warning } = readDocument({ instruments });
  assert.equal(warning, undefined);
});

test("the instruments section sits beside a rows list", () => {
  const { rows, warning } = readDocument({
    rows: [[{ instrument: "model" }]],
    instruments: { model: { format: "configured $model" } },
  });
  assert.equal(warning, undefined);
  assert.deepEqual(rows[0]?.cells.map(cellText), ["Model: configured claude-opus-4"]);
});

test("a configured label is placed in front of a configured format and a default format", () => {
  const configured = readDocument({ instruments: { model: { label: "🧠 ", format: "$model" } }, rows: [[{ instrument: "model" }]] });
  assert.equal(configured.warning, undefined);
  assert.deepEqual(configured.rows[0]?.cells.map(cellText), ["🧠 claude-opus-4"]);
  const defaulted = readDocument({ instruments: { context: { label: "ctx " } }, rows: [[{ instrument: "context" }]] });
  assert.equal(defaulted.warning, undefined);
  assert.deepEqual(defaulted.rows[0]?.cells.map(cellText), ["ctx 43.2%/200k"]);
  const unlabelled = readDocument({ rows: [[{ instrument: "model" }]] });
  assert.deepEqual(unlabelled.rows[0]?.cells.map(cellText), ["Model: anthropic/claude-opus-4"], "with no label configured the shipped default label renders");
  const emptied = readDocument({ instruments: { model: { label: "", format: "$model" } }, rows: [[{ instrument: "model" }]] });
  assert.deepEqual(emptied.rows[0]?.cells.map(cellText), ["claude-opus-4"], 'an empty label leaves the format text unchanged');
});

test("a label with no trailing whitespace gets a one-column gap before its content", () => {
  const result = readDocument({ instruments: { model: { label: "🧠", format: "$model" } }, rows: [[{ instrument: "model" }]] });
  assert.equal(result.warning, undefined);
  assert.deepEqual(result.rows[0]?.cells.map(cellText), ["🧠 claude-opus-4"]);
});

test("every instrument that has a label gets the gap", () => {
  for (const name of ["blank", "model", "thinking", "path", "context", "tokens", "cost"]) {
    const result = readDocument({ instruments: { [name]: { label: "L" } }, rows: [[{ instrument: name }]] });
    assert.equal(result.warning, undefined, name);
    const text = stripTerminalSequences(result.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()) ?? "");
    assert.ok(text.startsWith("L "), `${name} renders its label, then one blank column: ${JSON.stringify(text)}`);
    assert.notEqual(text.charAt(2), " ", `${name} renders one gap, not two`);
    assert.ok(text.length > 2, `${name} renders content after the gap`);
  }
});

test("a label that ends in whitespace or in a control character gets one gap, never two", () => {
  for (const label of [" 🧠 ", "🧠\n", "🧠\u0085", "🧠\u00a0"]) {
    const result = readDocument({ instruments: { model: { label, format: "$model" } }, rows: [[{ instrument: "model" }]] });
    assert.equal(result.warning, undefined, JSON.stringify(label));
    assert.deepEqual(result.rows[0]?.cells.map(cellText), ["🧠 claude-opus-4"], JSON.stringify(label));
  }
});

test("a label that is empty after the trim shows no label and no gap", () => {
  const result = readDocument({ instruments: { model: { label: "  ", format: "$model" } }, rows: [[{ instrument: "model" }]] });
  assert.equal(result.warning, undefined);
  assert.deepEqual(result.rows[0]?.cells.map(cellText), ["claude-opus-4"]);
});

test("a document carrying Joel's three labels renders each cell with one gap", () => {
  const result = readDocument({
    instruments: {
      model: { label: "🧠 ", format: "$model" },
      thinking: { label: "🤔 " },
      context: { label: "🔋 ", format: "$bar $percent" },
    },
    rows: [[{ instrument: "model" }, { instrument: "thinking" }, { instrument: "context" }]],
  });
  assert.equal(result.warning, undefined);
  const cells = ["🧠", "🤔", "🔋"].map((label, index) => {
    const raw = result.rows[0]?.cells[index]?.instrument.render(seed, 20, fakeTheme()) ?? "";
    const text = stripTerminalSequences(raw);
    assert.ok(text.startsWith(label + " "), `${label} renders its label and one gap: ${JSON.stringify(text)}`);
    assert.notEqual(text.charAt(label.length + 1), " ", `${label} renders one gap, not two`);
    return raw;
  });
  assert.ok(visibleWidth(cells[2] ?? "") <= 20, "the context cell is no wider than its width");
});

test("an unknown datum suppresses the whole cell, label included", () => {
  const unknownLevel: Readings = { ...seed, thinkingLevel: undefined };
  for (const format of ["$level", ""]) {
    const { rows, warning } = readDocument({ instruments: { thinking: { label: "Thinking: ", format } }, rows: [[{ instrument: "thinking" }]] });
    assert.equal(warning, undefined);
    assert.equal(rows[0]?.cells[0]?.instrument.render(unknownLevel, 80, fakeTheme()), "", `a format of ${JSON.stringify(format)} does not shield the cell`);
  }
  const known = readDocument({ instruments: { thinking: { label: "Thinking: ", format: "$level" } }, rows: [[{ instrument: "thinking" }]] });
  assert.equal(known.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()), "Thinking: " + fakeTheme().style("high", { fg: "thinkingHigh" }), "the same label with a known level renders");
});

test("a known datum with an intentionally empty format renders the label alone", () => {
  const labelled = readDocument({ instruments: { thinking: { label: "🤔", format: "" } }, rows: [[{ instrument: "thinking" }]] });
  assert.equal(labelled.warning, undefined);
  assert.equal(labelled.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()), "🤔");
  const bare = readDocument({ instruments: { thinking: { label: "", format: "" } }, rows: [[{ instrument: "thinking" }]] });
  assert.equal(bare.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()), "");
});

test("a whitespace-only format counts as empty and leaves the label alone", () => {
  const result = readDocument({ instruments: { thinking: { label: "🤔", format: "   " } }, rows: [[{ instrument: "thinking" }]] });
  assert.equal(result.warning, undefined);
  assert.equal(result.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()), "🤔");
});

test("an unknown datum leaves no label and no lone gap, whatever the format", () => {
  const unknownLevel: Readings = { ...seed, thinkingLevel: undefined };
  for (const format of ["$level", "", "   "]) {
    const result = readDocument({ instruments: { thinking: { label: "🤔", format } }, rows: [[{ instrument: "thinking" }]] });
    assert.equal(result.warning, undefined, JSON.stringify(format));
    assert.equal(result.rows[0]?.cells[0]?.instrument.render(unknownLevel, 80, fakeTheme()), "",
      `an unknown level with ${JSON.stringify(format)} renders no cell, label included: the guard reads the declared variables, not the trimmed segments`);
  }
  const known = readDocument({ instruments: { thinking: { label: "🤔", format: "$level" } }, rows: [[{ instrument: "thinking" }]] });
  assert.equal(known.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()),
    "🤔 " + fakeTheme().style("high", { fg: "thinkingHigh" }), "the same label with a known level renders it after the gap");
});

test("a label is literal text, never a variable and never parsed", () => {
  const dollar = readDocument({ instruments: { model: { label: "$level ", format: "$model" } }, rows: [[{ instrument: "model" }]] });
  assert.equal(dollar.warning, undefined);
  assert.deepEqual(dollar.rows[0]?.cells.map(cellText), ["$level claude-opus-4"]);
  const escaped = readDocument({ instruments: { model: { label: "a\\$b ", format: "$model" } }, rows: [[{ instrument: "model" }]] });
  assert.deepEqual(escaped.rows[0]?.cells.map(cellText), ["a\\$b claude-opus-4"], "an escape inside a label is not consumed");
  rejected({ instruments: { model: { format: "$label" } } }, '"model"\'s format names a variable it does not declare: "$label"');
});

test("a label's control characters each become one space so the label stays on one line", () => {
  const result = readDocument({ instruments: { thinking: { label: "A\nB\u0085C ", format: "$level" } }, rows: [[{ instrument: "thinking" }]] });
  assert.equal(result.warning, undefined);
  const text = result.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()) ?? "";
  assert.equal(text, "A B C " + fakeTheme().style("high", { fg: "thinkingHigh" }));
  assert.equal(text.includes("\n"), false);
  const controls = readDocument({ instruments: { thinking: { label: "T\tB\r", format: "$level" } }, rows: [[{ instrument: "thinking" }]] });
  assert.equal(controls.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()), "T B " + fakeTheme().style("high", { fg: "thinkingHigh" }), "a tab and a carriage return each become one space");
});

test("the label takes the instrument's configured style", () => {
  const theme = fakeTheme();
  const styled = readDocument({ instruments: { model: { label: "Q: ", format: "$model", style: { fg: "accent" } } }, rows: [[{ instrument: "model" }]] }, theme);
  assert.equal(styled.warning, undefined);
  assert.deepEqual(styled.rows[0]?.cells.map(cellText), [theme.style("Q: ", { fg: "accent" }) + theme.style("claude-opus-4", { fg: "accent" })]);
  const plain = readDocument({ instruments: { model: { label: "Q: ", format: "$model" } }, rows: [[{ instrument: "model" }]] });
  assert.deepEqual(plain.rows[0]?.cells.map(cellText), ["Q: claude-opus-4"], "with no style the label is unstyled text");
});

test("the label's width reduces what the bar has left", () => {
  const theme = fakeTheme();
  const result = readDocument({ instruments: { context: { label: "ab ", format: "$percent $bar" } }, rows: [[{ instrument: "context" }]] });
  assert.equal(result.warning, undefined);
  const text = result.rows[0]?.cells[0]?.instrument.render(seed, 20, theme) ?? "";
  assert.equal(text, "ab 43.2% " + "█".repeat(4) + theme.style("░".repeat(7), { dim: true }));
  assert.equal(visibleWidth(text), 20);
  const full = readDocument({ instruments: { context: { label: "x".repeat(20), format: "$bar" } }, rows: [[{ instrument: "context" }]] });
  assert.equal(full.rows[0]?.cells[0]?.instrument.render(seed, 20, theme), "x".repeat(20) + " ", "a label as wide as the cell leaves the bar nothing");
});

test("a label narrower than the cell shrinks the bar by its columns and the gap's one", () => {
  const theme = fakeTheme();
  const result = readDocument({ instruments: { context: { label: "ab", format: "$percent $bar" } }, rows: [[{ instrument: "context" }]] });
  assert.equal(result.warning, undefined);
  const text = result.rows[0]?.cells[0]?.instrument.render(seed, 20, theme) ?? "";
  assert.equal(text, "ab 43.2% " + "█".repeat(4) + theme.style("░".repeat(7), { dim: true }));
  assert.equal(visibleWidth(text), 20);
});

/** Nothing configured: the cell's text with each datum known, and the message that names a failing row. */
const DEFAULT_LABEL_TEXTS = [
  ["path", seed, "Path: pi-jefferson", "path"],
  ["context", seed, "Context: 43.2%/200k", "context"],
  ["tokens", seed, "Tokens: 3.0k", "tokens"],
  ["cost", seed, "Cost: $0.123", "cost"],
  ["model", seed, "Model: anthropic/claude-opus-4", "model"],
  ["context", { ...seed, contextUsage: { tokens: null, percent: null, contextWindow: 200000 } }, "Context: ?/200k", "context with a null token estimate"],
] as const;

test("each of the five shipped default labels renders in front of its default format", () => {
  for (const [instrument, readings, text, message] of DEFAULT_LABEL_TEXTS) {
    const { rows, warning } = readDocument({ rows: [[{ instrument }]] });
    assert.equal(warning, undefined, message);
    assert.equal(rows[0]?.cells[0]?.instrument.render(readings, 80, fakeTheme()), text, message);
  }
});

test("a configured label replaces a shipped default and keeps the one gap", () => {
  for (const name of ["path", "context", "tokens", "cost", "model"]) {
    const labelled = readDocument({ instruments: { [name]: { label: "L" } }, rows: [[{ instrument: name }]] });
    assert.equal(labelled.warning, undefined, name);
    const bare = readDocument({ instruments: { [name]: { label: "" } }, rows: [[{ instrument: name }]] });
    assert.equal(bare.warning, undefined, name);
    const [labelledText = ""] = labelled.rows[0]?.cells.map(cellText) ?? [];
    const [bareText = ""] = bare.rows[0]?.cells.map(cellText) ?? [];
    assert.equal(labelledText, "L " + bareText, `${name} renders its configured label, one gap and its content, and no default label`);
  }
});

test("an empty configured label removes a shipped default and its gap", () => {
  for (const name of ["path", "context", "tokens", "cost", "model"]) {
    const { rows, warning } = readDocument({ instruments: { [name]: { label: "", format: "x" } }, rows: [[{ instrument: name }]] });
    assert.equal(warning, undefined, name);
    assert.deepEqual(rows[0]?.cells.map(cellText), ["x"], `${name} configured with label "" renders its format alone, with no label and no gap`);
  }
});

test("a shipped default label does not render over an unknown datum", () => {
  const unknown: Readings = {
    provider: undefined, model: undefined, thinkingLevel: undefined,
    cwd: undefined, home: undefined, branch: undefined, sessionName: undefined, statuses: undefined,
    contextUsage: undefined, totals: undefined, sampledAt: undefined,
  };
  for (const name of ["path", "context", "tokens", "cost", "model"]) {
    const { rows, warning } = readDocument({ rows: [[{ instrument: name }]] });
    assert.equal(warning, undefined, name);
    assert.deepEqual(
      rows[0]?.cells.map((cell) => cell.instrument.render(unknown, 80, fakeTheme())),
      [""],
      `${name} renders nothing over an unknown datum, with no default label and no gap`,
    );
  }
});

test("blank declares no default label, so its placeholder and its empty format carry none", () => {
  const placeholder = readDocument({ rows: [[{ instrument: "blank" }]] });
  assert.equal(placeholder.warning, undefined);
  assert.deepEqual(placeholder.rows[0]?.cells.map(cellText), [DEFAULT_CELL_TEXT], "nothing configured, and no label in front of the placeholder");
  const emptied = readDocument({ instruments: { blank: { format: "" } }, rows: [[{ instrument: "blank" }]] });
  assert.equal(emptied.warning, undefined);
  assert.deepEqual(emptied.rows[0]?.cells.map(cellText), [""], 'a format of "" renders nothing, not a lone label');
});

test("the branch cell renders its default label, and nothing at all outside a repository", () => {
  const known = readDocument({ rows: [[{ instrument: "branch" }]] });
  assert.equal(known.warning, undefined);
  assert.deepEqual(known.rows[0]?.cells.map(cellText), ["Branch: main"]);

  const outside = readDocument({ rows: [[{ instrument: "branch" }]] });
  assert.deepEqual(
    outside.rows[0]?.cells.map((cell) => cell.instrument.render({ ...seed, branch: undefined }, 80, fakeTheme())),
    [""],
    "unknown is not an empty string: no label and no gap",
  );
  const empty = outside.rows[0]?.cells.map((cell) => cell.instrument.render({ ...seed, branch: "" }, 80, fakeTheme()));
  assert.deepEqual(empty, ["Branch: "], "an empty string is a datum, so the bare label renders");
});

test("the session cell renders its default label, and nothing at all for an unnamed session", () => {
  const named = readDocument({ rows: [[{ instrument: "session" }]] });
  assert.equal(named.warning, undefined);
  assert.deepEqual(named.rows[0]?.cells.map(cellText), ["Session: refactor footer"]);
  assert.deepEqual(
    named.rows[0]?.cells.map((cell) => cell.instrument.render({ ...seed, sessionName: undefined }, 80, fakeTheme())),
    [""],
    "no name means no label and no gap, not a lone `Session:`",
  );
});

test("the status cell renders its default label over the statuses, and nothing over none", () => {
  const set = readDocument({ rows: [[{ instrument: "status" }]] });
  assert.equal(set.warning, undefined);
  assert.deepEqual(set.rows[0]?.cells.map(cellText), ["Status: 3 tasks idle"]);
  const none = readDocument({ rows: [[{ instrument: "status" }]] });
  assert.deepEqual(
    none.rows[0]?.cells.map((cell) => cell.instrument.render({ ...seed, statuses: undefined }, 80, fakeTheme())),
    [""],
    "no statuses means no label and no gap",
  );
  const blankText = none.rows[0]?.cells.map((cell) => cell.instrument.render({ ...seed, statuses: new Map([["a", " \n "]]) }, 80, fakeTheme()));
  assert.deepEqual(blankText, [""], "a status that collapses to nothing renders nothing, as with no statuses");
});

test("a coloured status is measured as its text, so the cell's plan counts '● ok' only", () => {
  const { rows, warning } = readDocument({ rows: [[{ instrument: "status" }]] });
  assert.equal(warning, undefined);
  const cell = rows[0]!.cells[0]!;
  const coloured = { ...seed, statuses: new Map([["a", "\x1b[32m●\x1b[0m ok"]]) };
  // A row sizes a cell from its text rendered at width 0: its probe.
  const probe = cell.instrument.render(coloured, 0, fakeTheme());
  assert.equal(probe, "Status: ● ok");
  assert.equal(visibleWidth(probe), visibleWidth("Status: ● ok"), "the plan counts the text, not the sequences");
});

test("a shipped default label precedes a configured format", () => {
  const { rows, warning } = readDocument({ instruments: { path: { format: "$path!" } }, rows: [[{ instrument: "path" }]] });
  assert.equal(warning, undefined);
  assert.deepEqual(rows[0]?.cells.map(cellText), ["Path: pi-jefferson!"], "no label configured, so the default label comes first");
});

test("an empty format on a shipped instrument leaves its default label alone", () => {
  const { rows, warning } = readDocument({ instruments: { context: { format: "" } }, rows: [[{ instrument: "context" }]] });
  assert.equal(warning, undefined);
  assert.deepEqual(rows[0]?.cells.map(cellText), ["Context:"], 'a format of "" renders the default label alone');
});

test("a path, model and thinking row at 80 columns keeps every text in its columns", () => {
  const { rows, warning } = readDocument({
    rows: [[
      { instrument: "path" },
      { instrument: "model", align: "right" },
      { instrument: "thinking", align: "right" },
    ]],
  });
  assert.equal(warning, undefined);
  const [line = ""] = createFooter(rows, () => seed, fakeTheme(), 0).render(80);
  assert.equal(visibleWidth(line), 80, "one line of the row's width");
  assert.equal(
    stripTerminalSequences(line),
    "Path: pi-jefferson" + " ".repeat(17) + "Model: anthropic/claude-opus-4 Thinking: High",
    "path absorbs the slack, the model text ends at column 65 and the thinking text at 80",
  );
});

test("a configured foreground does not beat the level's color", () => {
  const theme = fakeTheme();
  const { rows, warning } = readDocument({ instruments: { thinking: { style: { fg: "accent" } } }, rows: [[{ instrument: "thinking" }]] }, theme);
  assert.equal(warning, undefined);
  const text = rows[0]?.cells[0]?.instrument.render(seed, 80, theme) ?? "";
  assert.equal(stripTerminalSequences(text), "Thinking: High");
  assert.equal(text, theme.style("Thinking: ", { fg: "accent" }) + theme.style("High", { fg: "thinkingHigh" }));
});

test("a configured background and boolean attributes survive on the level", () => {
  const theme = fakeTheme();
  const style = { bg: "selectedBg", bold: true } as const;
  const { rows } = readDocument({ instruments: { thinking: { style } }, rows: [[{ instrument: "thinking" }]] }, theme);
  assert.equal(rows[0]?.cells[0]?.instrument.render(seed, 80, theme), theme.style("Thinking: ", style) + theme.style("High", { ...style, fg: "thinkingHigh" }));
  const italic = { italic: true } as const;
  const attrs = readDocument({ instruments: { thinking: { style: italic } }, rows: [[{ instrument: "thinking" }]] }, theme);
  assert.equal(attrs.rows[0]?.cells[0]?.instrument.render(seed, 80, theme), theme.style("Thinking: ", italic) + theme.style("High", { italic: true, fg: "thinkingHigh" }));
});

test("only the level segment is recolored", () => {
  const theme = fakeTheme();
  const style = { fg: "accent" } as const;
  const { rows } = readDocument({ instruments: { thinking: { style, format: "[$level]", label: "Q: " } }, rows: [[{ instrument: "thinking" }]] }, theme);
  assert.equal(rows[0]?.cells[0]?.instrument.render(seed, 80, theme),
    theme.style("Q: ", style) + theme.style("[", style) + theme.style("high", { fg: "thinkingHigh" }) + theme.style("]", style));
});

test("a level outside the seven keeps the instrument's own style", () => {
  const theme = fakeTheme();
  const plain = readDocument({ rows: [[{ instrument: "thinking" }]] }, theme);
  const styled = readDocument({ instruments: { thinking: { style: { fg: "accent" } } }, rows: [[{ instrument: "thinking" }]] }, theme);
  // An inherited object name is no more a token than a future host level is, so it renders unstyled.
  const levels = [["ultra", "Ultra"], ["toString", "ToString"], ["constructor", "Constructor"], ["__proto__", "__proto__"]] as const;
  for (const [level, capitalized] of levels) {
    const readings: Readings = { ...seed, thinkingLevel: level };
    assert.equal(plain.rows[0]?.cells[0]?.instrument.render(readings, 80, theme), "Thinking: " + capitalized, `${level} renders with no token to give it`);
    assert.equal(styled.rows[0]?.cells[0]?.instrument.render(readings, 80, theme),
      theme.style("Thinking: ", { fg: "accent" }) + theme.style(capitalized, { fg: "accent" }), `${level} keeps the configured foreground`);
  }
});

test("the level's token resolves against the theme passed to each render", () => {
  const a = fakeTheme();
  const b = fakeTheme({ thinkingHigh: "\x1b[38;5;99m" });
  const { rows } = readDocument({ rows: [[{ instrument: "thinking" }]] }, a);
  const cell = rows[0]?.cells[0];
  assert.ok(cell);
  assert.equal(cell.instrument.render(seed, 80, a), "Thinking: " + a.style("High", { fg: "thinkingHigh" }));
  assert.equal(cell.instrument.render(seed, 80, b), "Thinking: " + b.style("High", { fg: "thinkingHigh" }), "the second render uses the second theme");
  assert.notEqual(a.getFgAnsi("thinkingHigh"), b.getFgAnsi("thinkingHigh"));
});

test("trusted project instruments replace the agent document whole and untrusted instruments are ignored", () => {
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  const agentPath = join(dir, "agent.json"), projectPath = join(dir, "project.json");
  writeFileSync(agentPath, JSON.stringify({ instruments: { blank: { format: "agent" }, model: { format: "agent-model" } }, rows: [[{ instrument: "blank" }, { instrument: "model" }]] }));
  writeFileSync(projectPath, JSON.stringify({ instruments: { blank: { format: "project" } }, rows: [[{ instrument: "blank" }, { instrument: "model" }]] }));
  const trusted = readConfiguration({ agentPath, projectPath, projectTrusted: true, theme: fakeTheme() });
  assert.deepEqual(trusted.rows[0]?.cells.map(cellText), ["project", "Model: anthropic/claude-opus-4"]);
  const untrusted = readConfiguration({ agentPath, projectPath, projectTrusted: false, theme: fakeTheme() });
  assert.deepEqual(untrusted.rows[0]?.cells.map(cellText), ["agent", "Model: agent-model"]);
});

test("a configured name binds once across cells and rows while unconfigured names keep defaults", () => {
  const { rows, warning } = readDocument({
    instruments: { model: { format: "🧠: $model from $provider" }, tokens: { format: "↑$input ↓$output" }, context: { format: "unused" } },
    rows: [
      [{ instrument: "model" }, { instrument: "model" }, { instrument: "thinking" }, { instrument: "tokens" }],
      [{ instrument: "model" }, { instrument: "tokens" }],
    ],
  });
  assert.equal(warning, undefined);
  assert.deepEqual(rows.map(row => row.cells.map(cellText)), [
    ["Model: 🧠: claude-opus-4 from anthropic", "Model: 🧠: claude-opus-4 from anthropic", "Thinking: " + fakeTheme().style("High", { fg: "thinkingHigh" }), "Tokens: ↑1.0k ↓2.0k"],
    ["Model: 🧠: claude-opus-4 from anthropic", "Tokens: ↑1.0k ↓2.0k"],
  ]);
  assert.equal(rows[0]?.cells[0]?.instrument, rows[0]?.cells[1]?.instrument);
  assert.equal(rows[0]?.cells[0]?.instrument, rows[1]?.cells[0]?.instrument);
  assert.equal(rows[0]?.cells[3]?.instrument, rows[1]?.cells[1]?.instrument);
});

test("an unknown name in the block and in a row each get their part, and its cell renders the configured blank", () => {
  const onlySection = readDocument({ instruments: { nope: {} }, rows: [[{ instrument: "model" }]] });
  assert.equal(onlySection.warning, `pi-jefferson: ${onlySection.path} the instruments block names instruments the extension does not implement: "nope"`);
  assert.deepEqual(onlySection.rows[0]?.cells.map(cellText), ["Model: anthropic/claude-opus-4"]);
  const both = readDocument({ instruments: { nope: {}, blank: { format: "configured blank" } }, rows: [[{ instrument: "model" }, { instrument: "nope" }, { instrument: "thinking" }]] });
  assert.equal(both.warning, `pi-jefferson: ${both.path} row 1: "nope" is not a known instrument; the instruments block names instruments the extension does not implement: "nope"`);
  assert.deepEqual(both.rows[0]?.cells.map(cellText), ["Model: anthropic/claude-opus-4", "configured blank", "Thinking: " + fakeTheme().style("High", { fg: "thinkingHigh" })]);
});

test("several unknown names in the instruments block keep their key order, beside the default row", () => {
  const result = readDocument({ instruments: { nope: {}, other: {} } });
  assert.equal(
    result.warning,
    `pi-jefferson: ${result.path} the instruments block names instruments the extension does not implement: "nope", "other"`,
  );
  assert.equal(result.rows[0]?.cells.length, DEFAULT_CELLS);
});

/** Decision 5's one part for a row at the document's top level, shown form and all. */
const RETIRED = 'a row at the top level is retired; declare rows as {"rows": [[{"instrument": "model"}]]} and drop any top-level id or distribution';

function rejected(document: unknown, message: string): void {
  let result!: ReturnType<typeof readDocument>;
  assert.doesNotThrow(() => { result = readDocument(document); }, `reject with ${message}, not an uncaught exception`);
  assert.equal(result.warning, `pi-jefferson: ${result.path} was rejected (${message}); rendering the default row`);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]?.cells.length, 10);
  assert.deepEqual(result.rows[0]?.cells.map(cellText), Array<string>(10).fill(DEFAULT_CELL_TEXT));
}

test("the instruments section shape guard rejects non-objects with the exact message", () => {
  for (const instruments of [null, [], 42, "model"]) {
    rejected({ instruments, rows: [[{ instrument: "model" }]] }, "the instruments value is not an object");
  }
});

test("the instrument entry shape guard rejects non-objects even without a holding cell", () => {
  for (const entry of [null, [], 42, "format"]) {
    rejected({ instruments: { model: entry } }, 'the instruments configuration for "model" is not an object');
  }
});

test("the declaration option-key guard names misspellings and the declined width option", () => {
  for (const key of ["frmát", "width", "lable"]) {
    rejected({ instruments: { model: { [key]: 4 } } }, `instrument "model" carries an option its declaration does not have: ${JSON.stringify(key)}`);
  }
});

test("the format type guard rejects present non-strings including null", () => {
  for (const format of [42, null, true, {}]) {
    rejected({ instruments: { model: { format } } }, 'instrument "model" has a format that is not a string');
  }
});

test("a label that is not a string rejects the document naming the instrument and the option", () => {
  for (const label of [3, {}]) {
    rejected({ instruments: { model: { label } } }, 'instrument "model" has a label that is not a string');
  }
  const empty = readDocument({ instruments: { model: { label: "" } }, rows: [[{ instrument: "model" }]] });
  assert.equal(empty.warning, undefined);
});

test("an explicitly empty configured format is accepted and leaves the default label alone", () => {
  const result = readDocument({ instruments: { model: { format: "" } }, rows: [[{ instrument: "model" }]] });
  assert.equal(result.warning, undefined);
  assert.deepEqual(result.rows[0]?.cells.map(cellText), ["Model:"]);
});

test("the document surfaces the unknown-variable guard's full message", () => {
  rejected({ instruments: { model: { format: "$nope" } } }, '"model"\'s format names a variable it does not declare: "$nope"');
});

test("the document surfaces the second-width-taker guard's full message", () => {
  rejected({ instruments: { context: { format: "$bar $bar" } } }, '"context"\'s format names a second width-taking variable: "$bar"');
});

test("the document surfaces the unknown-modifier guard's full message", () => {
  rejected({ instruments: { model: { format: "$model|bd" } } }, '"model"\'s format names a modifier it does not implement: "|bd"');
});

test("the style shape guard rejects a non-object with the full composed message", () => {
  for (const style of [null, [], 42, "bold"]) {
    rejected({ instruments: { model: { style } } }, 'instrument "model" has a style that is not an object');
  }
});

test("the style-key guard rejects unknown keys with the full composed message", () => {
  rejected({ instruments: { model: { style: { colour: "red" } } } }, 'instrument "model" has a style key that pi\'s ThemeStyle does not have: "colour"');
});

test("the style-key guard rejects inherited-name own keys including JSON proto keys", () => {
  for (const key of ["constructor", "toString", "__proto__"]) {
    rejected(`{"instruments":{"model":{"style":{${JSON.stringify(key)}:true}}}}`, `instrument "model" has a style key that pi's ThemeStyle does not have: ${JSON.stringify(key)}`);
  }
});

test("the style attribute guard rejects non-booleans for all six attributes", () => {
  for (const key of ["bold", "dim", "italic", "underline", "inverse", "strikethrough"]) {
    rejected({ instruments: { model: { style: { [key]: "true" } } } }, `instrument "model" has a style attribute that is not a boolean: ${JSON.stringify(key)}`);
  }
});

test("the foreground value guard reports rejected types, wrong slots, colors and indices", () => {
  for (const fg of ["nope", "selectedBg", "", {}, true, null, 256, ["#bf5700"]]) {
    rejected({ instruments: { model: { style: { fg } } } }, `instrument "model" has an fg that is neither a foreground-slot theme token nor a color pi's parser accepts: ${JSON.stringify(fg)}`);
  }
});

test("the background value guard reports rejected colors, wrong slots and fractional indices", () => {
  for (const bg of ["nope", "accent", 1.5, ["#bf5700"]]) {
    rejected({ instruments: { model: { style: { bg } } } }, `instrument "model" has a bg that is neither a background-slot theme token nor a color pi's parser accepts: ${JSON.stringify(bg)}`);
  }
});

test("all six attributes accept boolean values and empty styles preserve unstyled bytes", () => {
  const style = { bold: true, dim: true, italic: true, underline: true, inverse: true, strikethrough: true };
  const result = readDocument({ instruments: { model: { format: "$model", style } }, rows: [[{ instrument: "model" }]] });
  assert.equal(result.warning, undefined);
  assert.deepEqual(result.rows[0]?.cells.map(cellText), [fakeTheme().style("Model: ", style) + fakeTheme().style("claude-opus-4", style)]);
  const falseAttributes = Object.fromEntries(Object.keys(style).map(key => [key, false]));
  const disabled = readDocument({ instruments: { model: { format: "$model", style: falseAttributes } }, rows: [[{ instrument: "model" }]] });
  assert.equal(disabled.warning, undefined);
  assert.deepEqual(disabled.rows[0]?.cells.map(cellText), ["Model: claude-opus-4"]);
  const empty = readDocument({ instruments: { model: { style: {} } }, rows: [[{ instrument: "model" }]] });
  const absent = readDocument({ rows: [[{ instrument: "model" }]] });
  assert.equal(empty.warning, undefined);
  assert.deepEqual(empty.rows[0]?.cells.map(cellText), absent.rows[0]?.cells.map(cellText));
});

test("error precedence reads the envelope and the rowGap before instruments and instruments before cells", () => {
  // The retired-key guard answers first, whatever else the document carries.
  rejected({ cells: [{ instrument: "model" }], rows: 42, rowGap: 1.5, instruments: 42 }, RETIRED);
  rejected({ id: "footer", rows: [[]] }, RETIRED);
  rejected({ instruments: { model: { format: 42 } }, rows: [[{ instrument: "model", align: "middle" }]] }, 'instrument "model" has a format that is not a string');
  // The gap is a document-level key, read before any row and before the instruments section.
  rejected({ instruments: { model: { format: 42 } }, rows: [blankRows(10)], rowGap: 1.5 }, "rowGap must be a whole number from 0 to 3: 1.5");
});

const FRAME = "\x1b[0m\x1b]8;;\x07";
const RESET = "\x1b[0m";

function footerFor(document: unknown, theme: Theme = fakeTheme()) {
  const result = readDocument(document, theme);
  assert.equal(result.warning, undefined);
  // These tests read a row's line, so the vertical gap is 0 and line 0 is that row.
  return createFooter(result.rows, () => seed, theme, 0);
}

test("configured styled cells reset before every trailing pad, including attribute-only styles", () => {
  const theme = fakeTheme();
  for (const style of [{ fg: "accent" }, { bold: true }, { strikethrough: true }] as const) {
    const footer = footerFor({ instruments: { blank: { format: "ab", style } }, rows: [Array.from({ length: 3 }, () => ({ instrument: "blank" }))]}, theme);
    const line = footer.render(20)[0] ?? "";
    assert.equal(visibleWidth(line), 20);
    const styled = theme.style("ab", style);
    const settings = styled.match(/\x1b\[[0-9;]*m/g) ?? [];
    const cells = line.split(FRAME).slice(1, 4);
    assert.equal(cells.length, 3);
    for (const [index, cell] of cells.entries()) {
      assert.equal(cell, styled + RESET + " ".repeat(index === 2 ? 4 : 5));
      assert.equal(cell.match(/\x1b\[[0-9;]*m/g)?.length, settings.length + 1, "only the style's SGR and our pad reset");
      assert.equal(cell.match(/\x1b\[0m/g)?.length, 1, "one reset immediately before the pad");
    }
  }
});

test("the gap takes the label's style, so the background runs unbroken across it", () => {
  const theme = fakeTheme();
  for (const style of [{ bg: "selectedBg" }, { underline: true }] as const) {
    const document = { instruments: { context: { label: "Q", format: "$percent", style } }, rows: [[{ instrument: "context" }]] };
    const { rows } = readDocument(document, theme);
    const text = theme.style("Q ", style) + theme.style("43.2%", style);
    assert.equal(rows[0]?.cells[0]?.instrument.render(seed, 80, theme), text, JSON.stringify(style));
    const line = footerFor(document, theme).render(20)[0] ?? "";
    assert.equal(visibleWidth(line), 20);
    assert.ok(line.includes(text + RESET + " ".repeat(13)), "the cell's pad follows the styled gap and one reset");
  }
});

test("a cell narrower than the label, the gap and the content clips them together", () => {
  const footer = footerFor({ instruments: { model: { label: "ab", format: "$model" } }, rows: [[{ instrument: "model" }]] });
  const lines = footer.render(10);
  assert.equal(lines.length, 1);
  assert.equal(visibleWidth(lines[0] ?? ""), 10);
  assert.ok(stripTerminalSequences(lines[0] ?? "").startsWith("ab c"), "the label, the gap, then the clipped content");
});

test("right-aligned styled cells lead with unstyled pad and exact-fill cells add no reset", () => {
  const theme = fakeTheme();
  const footer = footerFor({ instruments: { blank: { format: "ab", style: { fg: "accent" } } }, rows: [[{ instrument: "blank", align: "right" }]] }, theme);
  for (const width of [7, 2]) {
    const line = footer.render(width)[0] ?? "";
    const cell = line.split(FRAME)[1] ?? "";
    assert.equal(stripTerminalSequences(cell), " ".repeat(width - 2) + "ab");
    assert.ok(cell.startsWith(" ".repeat(width - 2) + theme.getFgAnsi("accent")));
    assert.equal(cell.match(/\x1b\[0m/g)?.length ?? 0, 0, "no trailing pad means no reset of ours");
    assert.equal((cell.match(/\x1b\[[0-9;]*m/g) ?? []).filter(sgr => sgr === theme.getFgAnsi("accent")).length, 1);
  }
});

test("styled clips retain the clip's own resets around ellipsis before a wide-glyph pad", () => {
  const theme = fakeTheme();
  const footer = footerFor({ instruments: { blank: { format: "ab漢字cd", style: { fg: "accent" } } }, rows: [Array.from({ length: 3 }, () => ({ instrument: "blank" }))]}, theme);
  const line = footer.render(20)[0] ?? "";
  assert.equal(visibleWidth(line), 20);
  const third = line.split(FRAME)[3] ?? "";
  assert.equal(third, theme.getFgAnsi("accent") + "ab" + RESET + "..." + RESET + " ");
  assert.equal(third.match(/\x1b\[0m/g)?.length, 2);
});

test("configured prose around a bar is styled per segment and the dim track retains its background", () => {
  const theme = fakeTheme();
  const style: ThemeStyle = { fg: "accent", bg: "selectedBg" };
  const footer = footerFor({ instruments: { context: { label: "", format: "[$bar]", style } }, rows: [[{ instrument: "context" }]] }, theme);
  const line = footer.render(12)[0] ?? "";
  const cell = line.split(FRAME)[1] ?? "";
  const filled = theme.style("█".repeat(4), style);
  const empty = theme.style("░".repeat(6), { ...style, dim: true });
  assert.equal(stripTerminalSequences(cell), "[" + "█".repeat(4) + "░".repeat(6) + "]");
  assert.ok(cell.startsWith(theme.style("[", style) + filled + empty));
  const sgr = cell.match(/\x1b\[[0-9;]*m/g) ?? [];
  assert.equal(sgr.filter(code => code === theme.getFgAnsi("accent")).length, 4, "both literals and both track portions carry their own style");
  assert.equal(sgr.filter(code => code === theme.getBgAnsi("selectedBg")).length, 4, "the dim track keeps the configured background");
  assert.equal(sgr.filter(code => code === "\x1b[2m").length, 1);
});

test("empty configured styles are byte-identical to absent styles through the footer", () => {
  const cells = [{ instrument: "blank" }, { instrument: "blank" }];
  const absent = footerFor({ instruments: { blank: { format: "ab" } }, rows: [cells] }).render(21);
  const empty = footerFor({ instruments: { blank: { format: "ab", style: {} } }, rows: [cells] }).render(21);
  assert.deepEqual(empty, absent);
  assert.equal(absent[0], FRAME + "ab".padEnd(11) + FRAME + "ab".padEnd(10) + FRAME);
});

test("theme invalidation re-styles the same footer with no bytes cached from the old theme", () => {
  const a = fakeTheme(), b = fakeTheme({ accent: "\x1b[35m" });
  let current = a;
  let styles = 0;
  const live = new Proxy(a, { get(_target, key) {
    if (key === "style") return (text: string, style: ThemeStyle) => { styles++; return current.style(text, style); };
    return Reflect.get(current, key);
  } });
  const footer = footerFor({ instruments: { blank: { format: "ab", style: { fg: "accent" } } }, rows: [[{ instrument: "blank" }]] }, live);
  const first = footer.render(10)[0] ?? "";
  assert.equal(first, FRAME + a.style("ab", { fg: "accent" }) + RESET + " ".repeat(8) + FRAME);
  assert.equal(styles, 1);
  current = b;
  footer.invalidate();
  footer.invalidate();
  const second = footer.render(10)[0] ?? "";
  assert.equal(second, FRAME + b.style("ab", { fg: "accent" }) + RESET + " ".repeat(8) + FRAME);
  assert.equal(second.includes(a.getFgAnsi("accent")), false);
  assert.equal(styles, 2);
  const resized = footer.render(20)[0] ?? "";
  assert.equal(resized, FRAME + b.style("ab", { fg: "accent" }) + RESET + " ".repeat(18) + FRAME);
  assert.equal(styles, 3);
  footer.invalidate();
  assert.equal(footer.render(20)[0], resized);
  assert.equal(styles, 4, "even invalidation without a theme change re-resolves");
});

test("a row carries a distribution and no id, and the parser writes content", () => {
  const { rows, warning } = readDocument({ rows: [[{ instrument: "model" }]] });
  assert.equal(warning, undefined);
  assert.deepEqual(Object.keys(rows[0] ?? {}).sort(), ["cells", "distribution"]);
  assert.equal(rows[0]?.distribution, "content");
});

test("a top-level containers key is an ordinary unknown key and is ignored in silence", () => {
  const { rows, warning } = readDocument({ containers: 3, rows: [] });
  assert.equal(warning, undefined, "the key has not been read since 2026-11-03, so it says nothing");
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, DEFAULT_CELLS);
});

test("every row the parser writes is sized by content", () => {
  const declared = readDocument({ rows: [[{ instrument: "model" }], [{ instrument: "blank" }, { instrument: "thinking" }]] });
  assert.equal(declared.warning, undefined);
  assert.equal(declared.rows.length, 2);
  assert.deepEqual(declared.rows.map((row) => row.distribution), ["content", "content"], "nothing a document writes changes it");

  // Both rows the extension makes for itself: the absent file, and a rejection's default row.
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  const absent = readConfiguration({
    agentPath: join(dir, "pi-jefferson.json"),
    projectPath: join(dir, "missing.json"),
    projectTrusted: false,
    theme: fakeTheme(),
  });
  assert.equal(absent.warning, undefined);
  assert.deepEqual(absent.rows.map((row) => row.distribution), ["content"]);

  const refused = readDocument({ rows: 42 });
  assert.ok(refused.warning, "a rejected document warns");
  assert.deepEqual(refused.rows.map((row) => row.distribution), ["content"]);
});

test("blank fills, and so does an instrument whose format takes the width", () => {
  const defaults = readDocument({
    rows: [["blank", "model", "thinking", "path", "tokens", "cost", "context"].map((instrument) => ({ instrument }))],
  });
  assert.equal(defaults.warning, undefined);
  assert.deepEqual(
    defaults.rows[0]?.cells.map((cell) => cell.instrument.fills),
    [true, false, false, false, false, false, false],
    "blank fills; context's default $percent/$window has no bar",
  );

  const configured = readDocument({ instruments: { context: { format: "$percent $bar" } }, rows: [[{ instrument: "context" }]] });
  assert.equal(configured.warning, undefined);
  assert.deepEqual(configured.rows[0]?.cells.map((cell) => cell.instrument.fills), [true], "a configured bar fills");

  const escaped = readDocument({ instruments: { context: { format: "\\$percent \\$bar" } }, rows: [[{ instrument: "context" }]] });
  assert.equal(escaped.warning, undefined);
  assert.deepEqual(escaped.rows[0]?.cells.map((cell) => cell.instrument.fills), [false], "an escaped \\$bar is plain text");
});

test("a notice cell takes the declared seconds, or the declared default of ten", () => {
  const configured = readDocument({ rows: [[{ instrument: "notice" }]], instruments: { notice: { seconds: 30 } } });
  assert.equal(configured.noticeSeconds, 30);
  assert.equal(configured.warning, undefined);
  const defaulted = readDocument({ rows: [[{ instrument: "notice" }]] });
  assert.equal(defaulted.noticeSeconds, 10, "the declared default");
});

test("a seconds value outside the bounds rejects the document and names the option and the value", () => {
  for (const seconds of [0, 61, 1.5, "10", null]) {
    const { rows, warning, noticeSeconds } = readDocument({
      rows: [[{ instrument: "notice" }]], instruments: { notice: { seconds } },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.cells.length, 10, "the default row renders");
    assert.ok(warning, `${JSON.stringify(seconds)} rejects`);
    assert.match(warning, /seconds must be a whole number from 1 to 60: /);
    assert.ok(warning.includes(JSON.stringify(seconds)), `${JSON.stringify(seconds)} is named`);
    assert.equal(noticeSeconds, undefined, "the default row places no notice cell");
  }
});

test("a notice cell takes a configured format for its kind, in the document's words", () => {
  const { rows } = readDocument({
    rows: [[{ instrument: "notice" }]],
    instruments: { notice: { formats: { miss: "Spent $tokens, paid$cost" } } },
  });
  const shown: Readings = { ...seed, notice: { kind: "miss", values: { tokens: "125k", cost: " (~$0.38)" }, shownUntil: 1 } };
  assert.equal(stripTerminalSequences(rows[0]!.cells[0]!.instrument.render(shown, 80, fakeTheme())),
    "Notice: Spent 125k, paid (~$0.38)");
});

test("a configured format's undeclared variable, modifier and form each reject the document", () => {
  for (const [formats, detail] of [
    [{ miss: "Spent $nope" }, 'names a variable it does not declare: "$nope"'],
    [{ miss: "$tokens|bold" }, 'puts a modifier in a plain format: "|bold"'],
    [{ miss: "$notice" }, 'names a variable it does not declare: "$notice"'],
  ] as const) {
    const { rows, warning } = readDocument({ rows: [[{ instrument: "notice" }]], instruments: { notice: { formats } } });
    assert.equal(rows[0]?.cells.length, 10, "the default row renders");
    assert.ok(warning?.includes(detail), `${detail} in the warning: ${warning}`);
  }
});

test("a formats key the notice's declaration does not carry rejects the document", () => {
  // `thinkingOne` is a kind now; a near miss like `thinkingTwo` is still unknown.
  for (const kind of ["warm", "thinkingTwo"]) {
    const { warning } = readDocument({ rows: [[{ instrument: "notice" }]], instruments: { notice: { formats: { [kind]: "x" } } } });
    assert.ok(warning?.includes(`formats names a kind it does not carry: ${JSON.stringify(kind)}`), warning ?? "");
  }
});

test("a formats value that is not a string, and formats that is not an object, each reject", () => {
  const notString = readDocument({ rows: [[{ instrument: "notice" }]], instruments: { notice: { formats: { miss: 5 } } } });
  assert.ok(notString.warning?.includes("has a kind whose format is not a string"), notString.warning ?? "");
  const notObject = readDocument({ rows: [[{ instrument: "notice" }]], instruments: { notice: { formats: ["x"] } } });
  assert.ok(notObject.warning?.includes("has formats that is not an object"), notObject.warning ?? "");
});

test("no notice cell, the default row and a rejected document each take no visible time", () => {
  assert.equal(readDocument({ rows: [[{ instrument: "blank" }]] }).noticeSeconds, undefined, "no notice cell");
  assert.equal(readDocument({ rows: [] }).noticeSeconds, undefined, "the default row");
  assert.equal(readDocument({ cells: [{ instrument: "notice" }], rows: [{}] }).noticeSeconds, undefined, "a rejected document");
  assert.equal(readDocument("not json").noticeSeconds, undefined, "an unparseable document");
});

test("a notice cell past the ten-cell ceiling does not count as placement", () => {
  const cells = Array.from({ length: 10 }, () => ({ instrument: "blank" }));
  const { rows, noticeSeconds } = readDocument({ rows: [[...cells, { instrument: "notice" }]] });
  assert.equal(rows[0]?.cells.length, 10, "the ceiling truncates the notice cell");
  assert.equal(noticeSeconds, undefined, "the rows the root installs place no notice");
});
