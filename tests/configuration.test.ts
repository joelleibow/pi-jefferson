import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import type { Theme, ThemeStyle } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";

import { createFooter } from "../extensions/jefferson/visuals/row-renderer.ts";
import type { Cell } from "../extensions/jefferson/visuals/row.ts";
import type { Configuration } from "../extensions/jefferson/configuration.ts";
import {
  DEFAULT_CELLS,
  MAX_CELLS,
  readConfiguration,
} from "../extensions/jefferson/configuration.ts";
import { DEFAULT_CELL_TEXT } from "../extensions/jefferson/visuals/instrument.ts";
import type { Readings } from "../extensions/jefferson/data/session-data-store.ts";
import { fakeTheme } from "./fake-theme.ts";

const seed: Readings = {
  provider: "anthropic", model: "claude-opus-4", thinkingLevel: "high", cwd: "/a/pi-jefferson",
  contextUsage: { tokens: 86400, percent: 43.2, contextWindow: 200000 },
  totals: { input: 1000, output: 2000, cacheRead: 0, cacheWrite: 0, cost: 0.123 },
};

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

test("a top-level row object normalizes to one row", () => {
  const { rows, warning } = readDocument({
    cells: [
      { instrument: "blank" },
      { instrument: "blank" },
      { instrument: "blank" },
      { instrument: "blank" },
    ],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 4);
  assert.equal(warning, undefined);
});

test("a rows list normalizes to one row per entry in order", () => {
  const { rows, warning } = readDocument({ rows: [{}, {}] });
  assert.equal(rows.length, 2);
  assert.equal(warning, undefined);
});

test("both shapes at once is rejected", () => {
  const { rows, warning } = readDocument({ cells: [{ instrument: "blank" }], rows: [{}] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.ok(warning, "a rejected document warns");
});

test("an absent configuration yields the default row with no warning", () => {
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  const { rows, warning } = readConfiguration({
    agentPath: join(dir, "missing-agent.json"),
    projectPath: join(dir, "missing-project.json"),
    projectTrusted: true,
    theme: fakeTheme(),
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.equal(warning, undefined);
});

test("an empty object yields one row of ten with no warning", () => {
  const { rows, warning } = readDocument({});
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.equal(warning, undefined);
});

test("an empty rows list yields the default row with no warning", () => {
  const { rows, warning } = readDocument({ rows: [] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.equal(warning, undefined);
});

test("a row omitting cells renders 10 cells", () => {
  const { rows, warning } = readDocument({ rows: [{}] });
  assert.equal(rows[0]?.cells.length, 10);
  assert.equal(warning, undefined);
});

test("a row omitting cells holds ten blank cells", () => {
  const { rows, warning } = readDocument({ rows: [{}] });
  const cells = rows[0]?.cells ?? [];
  assert.equal(cells.length, DEFAULT_CELLS);
  for (const cell of cells) {
    assert.equal(cellText(cell), DEFAULT_CELL_TEXT);
    assert.equal(cell.instrument, cells[0]?.instrument, "one bound blank within this document");
  }
  assert.equal(warning, undefined);
});

test("cells is both the count and the placement, in order", () => {
  const { rows, warning } = readDocument({ rows: [{ cells: [{ instrument: "model" }, { instrument: "thinking" }, { instrument: "blank" }] }] });
  assert.deepEqual(
    rows[0]?.cells.map(cellText),
    ["anthropic: claude-opus-4", "Thinking: " + fakeTheme().style("High", { fg: "thinkingHigh" }), DEFAULT_CELL_TEXT],
  );
  assert.equal(warning, undefined);
});

test("a cells entry that is not an object rejects and names the object spelling", () => {
  for (const entry of ["model", 4, ["model"], null]) {
    const { rows, warning } = readDocument({ rows: [{ cells: [entry] }] });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.cells.length, 10);
    assert.ok(warning, "a rejected document warns");
    assert.match(warning, /not an object/);
    assert.match(warning, /declare \{"instrument": "model"\}/);
  }
});

test("a cell object with an unrecognised key rejects and names the key", () => {
  for (const [entry, key] of [
    [{ instrument: "model", width: 4 }, "width"],
    [{ instrument: "model", aling: "right" }, "aling"],
    [{ text: "x" }, "text"],
  ] as const) {
    const { rows, warning } = readDocument({ rows: [{ cells: [entry] }] });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.cells.length, 10);
    assert.ok(warning, "a rejected document warns");
    assert.match(warning, /unrecognised key/);
    assert.ok(warning.includes(key));
  }
});

test("a cell object with no instrument rejects", () => {
  const { rows, warning } = readDocument({ rows: [{ cells: [{ align: "right" }] }] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.ok(warning, "a rejected document warns");
  assert.match(warning, /no instrument/);
});

test("an instrument that is not a non-empty string rejects", () => {
  for (const entry of [{ instrument: 4 }, { instrument: "" }]) {
    const { rows, warning } = readDocument({ rows: [{ cells: [entry] }] });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.cells.length, 10);
    assert.ok(warning, "a rejected document warns");
    assert.match(warning, /not a non-empty string/);
  }
});

test("an align outside the three rejects and names the value", () => {
  for (const [entry, expected] of [
    [{ instrument: "model", align: "middle" }, '"middle"'],
    [{ instrument: "model", align: "Center" }, '"Center"'],
    [{ instrument: "model", align: 4 }, ": 4"],
  ] as const) {
    const { rows, warning } = readDocument({ rows: [{ cells: [entry] }] });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.cells.length, 10);
    assert.ok(warning, "a rejected document warns");
    assert.match(warning, /align/);
    assert.ok(warning.includes(expected));
  }
});

test("a cells list of strings is rejected with no converted read", () => {
  const { rows, warning } = readDocument({ rows: [{ cells: ["model", "thinking"] }] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.ok(warning, "a rejected document warns");
  assert.match(warning, /not an object/);
});

test("a cell that declares no align normalizes to left", () => {
  const noAlign = readDocument({ rows: [{ cells: [{ instrument: "model" }] }] });
  assert.equal(noAlign.warning, undefined);
  assert.deepEqual(noAlign.rows[0]?.cells.map(cellText), ["anthropic: claude-opus-4"]);
  for (const cell of noAlign.rows[0]?.cells ?? []) {
    assert.equal(cell.align, "left");
  }

  const right = readDocument({ rows: [{ cells: [{ instrument: "model", align: "right" }] }] });
  assert.equal(right.warning, undefined);
  assert.deepEqual(right.rows[0]?.cells.map((cell) => cell.align), ["right"]);
});

test("cells naming 12 instruments keeps the first 10 and warns nothing", () => {
  const { rows, warning } = readDocument({ rows: [{ cells: Array.from({ length: 12 }, () => ({ instrument: "blank" })) }] });
  assert.equal(rows[0]?.cells.length, 10);
  assert.equal(warning, undefined, "the clamp stays accepted behavior under its truthful name");
});

test("a cells entry past the ceiling that is not an object rejects the document", () => {
  const cells: unknown[] = Array.from({ length: 11 }, () => ({ instrument: "blank" }));
  cells.push(42);
  const { rows, warning } = readDocument({ rows: [{ cells }] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.ok(warning, "a rejected document warns");
  assert.match(warning, /not an object/);
});

test("a cells entry past the ceiling naming an unknown instrument warns and renders ten cells", () => {
  const { rows, warning } = readDocument({
    rows: [{ cells: Array.from({ length: 12 }, (_, i) => ({ instrument: i === 11 ? "brnach" : "blank" })) }],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.ok(warning, "the unknown instrument still warns past the ceiling");
  assert.match(warning, /brnach/);
});

test("an align past the ceiling that is outside the three rejects the document", () => {
  const cells: { instrument: string; align?: string }[] = Array.from({ length: 11 }, () => ({ instrument: "blank" }));
  cells.push({ instrument: "blank", align: "middle" });
  const { rows, warning } = readDocument({ rows: [{ cells }] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.ok(warning, "a rejected document warns");
  assert.match(warning, /align/);
});

test("the cell-count constants are named for cells", () => {
  assert.equal(DEFAULT_CELLS, 10);
  assert.equal(MAX_CELLS, 10);
});

test("a document carrying containers is accepted and renders ten blank cells", () => {
  const { rows, warning } = readDocument({ containers: 3 });
  const cells = rows[0]?.cells ?? [];
  assert.equal(cells.length, DEFAULT_CELLS, "the key is not read, so the count does not move");
  for (const cell of cells) {
    assert.equal(cellText(cell), DEFAULT_CELL_TEXT);
    assert.equal(cell.instrument, cells[0]?.instrument);
  }
  assert.ok(warning, "the break is breaking, so it warns");
  assert.match(warning, /containers/);
  assert.match(warning, /declare cells instead/);
});

test("two rows carrying containers still warn once per document", () => {
  const { rows, warning } = readDocument({ rows: [{ containers: 3 }, { containers: 2 }] });
  assert.deepEqual(
    rows.map((row) => row.cells.length),
    [DEFAULT_CELLS, DEFAULT_CELLS],
  );
  assert.ok(warning);
  assert.equal(warning.match(/containers/g)?.length, 1, "once per document, not once per row");
});

test("with a level and nothing configured, the thinking cell renders its default label and capitalized level", () => {
  const { rows, warning } = readDocument({ cells: [{ instrument: "thinking" }] });
  assert.equal(warning, undefined);
  assert.deepEqual(rows[0]?.cells.map(cellText), ["Thinking: " + fakeTheme().style("High", { fg: "thinkingHigh" })]);
  assert.equal(rows[0]?.cells[0]?.instrument.render({ ...seed, thinkingLevel: "off" }, 80, fakeTheme()), "Thinking: " + fakeTheme().style("Off", { fg: "thinkingOff" }), "off is a level like the others, not an unknown");
});

test("a configured label replaces the default label", () => {
  const replaced = readDocument({ instruments: { thinking: { label: "🤔" } }, cells: [{ instrument: "thinking" }] });
  assert.equal(replaced.warning, undefined);
  assert.deepEqual(replaced.rows[0]?.cells.map(cellText), ["🤔 " + fakeTheme().style("High", { fg: "thinkingHigh" })]);
  assert.equal(replaced.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme())?.includes("Thinking: "), false, "the default label is not shown beside a configured one");
  const removed = readDocument({ instruments: { thinking: { label: "" } }, cells: [{ instrument: "thinking" }] });
  assert.deepEqual(removed.rows[0]?.cells.map(cellText), [fakeTheme().style("High", { fg: "thinkingHigh" })], "an empty label removes the default");
});

test("a document naming cells and no containers warns nothing extra", () => {
  const { rows, warning } = readDocument({ rows: [{ cells: [{ instrument: "model" }] }] });
  assert.equal(rows[0]?.cells.length, 1);
  assert.equal(warning, undefined);
});

test("an instrument the extension does not implement renders blank and warns naming it", () => {
  const { rows, warning } = readDocument({ rows: [{ cells: [{ instrument: "model" }, { instrument: "nope" }, { instrument: "thinking" }] }] });
  assert.deepEqual(
    rows[0]?.cells.map(cellText),
    ["anthropic: claude-opus-4", DEFAULT_CELL_TEXT, "Thinking: " + fakeTheme().style("High", { fg: "thinkingHigh" })],
    "the unknown name renders blank while the rest of the row renders its instruments",
  );
  assert.ok(warning);
  assert.match(warning, /nope/);
});

test("two unimplemented instruments in different rows share one warning", () => {
  const { rows, warning } = readDocument({
    rows: [
      { cells: [{ instrument: "alpha" }, { instrument: "model" }] },
      { cells: [{ instrument: "thinking" }, { instrument: "beta" }] },
    ],
  });
  assert.deepEqual(
    rows.map((row) => row.cells.length),
    [2, 2],
  );
  assert.ok(warning);
  assert.equal(warning.match(/does not implement/g)?.length, 1, "one warning reports them all");
  assert.equal(warning.match(/alpha/g)?.length, 1);
  assert.equal(warning.match(/beta/g)?.length, 1);
});

test("an empty cells array is rejected", () => {
  const { rows, warning } = readDocument({ rows: [{ cells: [] }] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.ok(warning, "a row of no cells has no geometry");
  assert.match(warning, /empty cells/);
});

for (const [name, entry] of [
  ["zero", 0],
  ["negative", -1],
  ["non-integer", 2.5],
  ["null", null],
] as const) {
  test(`a cells entry of ${name} is rejected`, () => {
    const { rows, warning } = readDocument({ rows: [{ cells: [entry] }] });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.cells.length, 10);
    assert.ok(warning, "a rejected document warns");
  });
}

for (const [name, value] of [
  ["a number", 4],
  ["a string", "4"],
] as const) {
  test(`cells given as ${name} is rejected rather than read as a list`, () => {
    const { rows, warning } = readDocument({ rows: [{ cells: value }] });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.cells.length, 10);
    assert.ok(warning, "a rejected document warns");
  });
}

test("an unnamed row gets a synthesized deterministic id", () => {
  const first = readDocument({ rows: [{}, {}] });
  const second = readDocument({ rows: [{}, {}] });
  assert.deepEqual(
    first.rows.map((row) => row.id),
    ["row-0", "row-1"],
  );
  assert.deepEqual(
    second.rows.map((row) => row.id),
    ["row-0", "row-1"],
    "synthesized ids are deterministic across reads",
  );
  for (const row of first.rows) assert.notEqual(row.id, "");
});

test("an explicit id is kept", () => {
  const { rows } = readDocument({ rows: [{ id: "banner" }] });
  assert.equal(rows[0]?.id, "banner");
});

test("two explicit duplicate ids are rejected", () => {
  const { rows, warning } = readDocument({ rows: [{ id: "a" }, { id: "a" }] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.ok(warning, "a duplicate id warns");
});

test("an explicit id colliding with a synthesized id is rejected", () => {
  const { rows, warning } = readDocument({ rows: [{ id: "row-1" }, {}] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 10);
  assert.ok(warning, "an id collision warns");
});

test("a trusted project document replaces the agent document whole", () => {
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  const agentPath = join(dir, "agent.json");
  const projectPath = join(dir, "project.json");
  writeFileSync(
    agentPath,
    JSON.stringify({ rows: [{ cells: [{ instrument: "blank" }, { instrument: "blank" }, { instrument: "blank" }] }] }),
  );
  writeFileSync(projectPath, JSON.stringify({ rows: [{}, {}] }));
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
    JSON.stringify({ rows: [{ cells: [{ instrument: "blank" }, { instrument: "blank" }, { instrument: "blank" }] }] }),
  );
  writeFileSync(projectPath, JSON.stringify({ rows: [{}, {}] }));
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
    JSON.stringify({ rows: [{ cells: [{ instrument: "blank" }, { instrument: "blank" }, { instrument: "blank" }] }] }),
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
    const { rows } = readDocument({ rows: [{ cells: Array.from({ length: count }, () => ({ instrument: "blank" })) }] });
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
    rows: [{ cells: [{ instrument: "model", align: "right" }, { instrument: "thinking", align: "center" }] }],
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

test("containers beside a rows list warns once rather than passing silently", () => {
  const { rows, warning } = readDocument({ containers: 3, rows: [{}, {}] });
  assert.equal(rows.length, 2, "the document's rows still render");
  assert.ok(warning, "the key is not read, and its removal is not silent");
  assert.equal(warning.match(/containers/g)?.length, 1);
  assert.match(warning, /declare cells instead/);
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

test("the instruments section sits beside either row envelope", () => {
  for (const envelope of [{ cells: [{ instrument: "model" }] }, { rows: [{ cells: [{ instrument: "model" }] }] }]) {
    const { rows, warning } = readDocument({ ...envelope, instruments: { model: { format: "configured $model" } } });
    assert.equal(warning, undefined);
    assert.deepEqual(rows[0]?.cells.map(cellText), ["configured claude-opus-4"]);
  }
});

test("a configured label is placed in front of a configured format and a default format", () => {
  const configured = readDocument({ instruments: { model: { label: "🧠 ", format: "$model" } }, cells: [{ instrument: "model" }] });
  assert.equal(configured.warning, undefined);
  assert.deepEqual(configured.rows[0]?.cells.map(cellText), ["🧠 claude-opus-4"]);
  const defaulted = readDocument({ instruments: { context: { label: "ctx " } }, cells: [{ instrument: "context" }] });
  assert.equal(defaulted.warning, undefined);
  assert.deepEqual(defaulted.rows[0]?.cells.map(cellText), ["ctx 43.2%/200k"]);
  const unlabelled = readDocument({ cells: [{ instrument: "model" }] });
  assert.deepEqual(unlabelled.rows[0]?.cells.map(cellText), ["anthropic: claude-opus-4"], "no label and no default label renders as before");
  const emptied = readDocument({ instruments: { model: { label: "", format: "$model" } }, cells: [{ instrument: "model" }] });
  assert.deepEqual(emptied.rows[0]?.cells.map(cellText), ["claude-opus-4"], 'an empty label leaves the format text unchanged');
});

test("a label with no trailing whitespace gets a one-column gap before its content", () => {
  const result = readDocument({ instruments: { model: { label: "🧠", format: "$model" } }, cells: [{ instrument: "model" }] });
  assert.equal(result.warning, undefined);
  assert.deepEqual(result.rows[0]?.cells.map(cellText), ["🧠 claude-opus-4"]);
});

test("every instrument that has a label gets the gap", () => {
  for (const name of ["blank", "model", "thinking", "path", "context", "tokens", "cost"]) {
    const result = readDocument({ instruments: { [name]: { label: "L" } }, cells: [{ instrument: name }] });
    assert.equal(result.warning, undefined, name);
    const text = stripTerminalSequences(result.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()) ?? "");
    assert.ok(text.startsWith("L "), `${name} renders its label, then one blank column: ${JSON.stringify(text)}`);
    assert.notEqual(text.charAt(2), " ", `${name} renders one gap, not two`);
    assert.ok(text.length > 2, `${name} renders content after the gap`);
  }
});

test("a label that ends in whitespace or in a control character gets one gap, never two", () => {
  for (const label of [" 🧠 ", "🧠\n", "🧠\u0085", "🧠\u00a0"]) {
    const result = readDocument({ instruments: { model: { label, format: "$model" } }, cells: [{ instrument: "model" }] });
    assert.equal(result.warning, undefined, JSON.stringify(label));
    assert.deepEqual(result.rows[0]?.cells.map(cellText), ["🧠 claude-opus-4"], JSON.stringify(label));
  }
});

test("a label that is empty after the trim shows no label and no gap", () => {
  const result = readDocument({ instruments: { model: { label: "  ", format: "$model" } }, cells: [{ instrument: "model" }] });
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
    cells: [{ instrument: "model" }, { instrument: "thinking" }, { instrument: "context" }],
  });
  assert.equal(result.warning, undefined);
  const cells = ["🧠", "🤔", "🔋"].map((_label, index) => result.rows[0]?.cells[index]?.instrument.render(seed, 20, fakeTheme()) ?? "");
  ["🧠", "🤔", "🔋"].forEach((label, index) => {
    const text = stripTerminalSequences(cells[index] ?? "");
    assert.ok(text.startsWith(label + " "), `${label} renders its label and one gap: ${JSON.stringify(text)}`);
    assert.notEqual(text.charAt(label.length + 1), " ", `${label} renders one gap, not two`);
  });
  assert.ok(visibleWidth(cells[2] ?? "") <= 20, "the context cell is no wider than its width");
});

test("an unknown datum suppresses the whole cell, label included", () => {
  const unknownLevel: Readings = { ...seed, thinkingLevel: undefined };
  for (const format of ["$level", ""]) {
    const { rows, warning } = readDocument({ instruments: { thinking: { label: "Thinking: ", format } }, cells: [{ instrument: "thinking" }] });
    assert.equal(warning, undefined);
    assert.equal(rows[0]?.cells[0]?.instrument.render(unknownLevel, 80, fakeTheme()), "", `a format of ${JSON.stringify(format)} does not shield the cell`);
  }
  const known = readDocument({ instruments: { thinking: { label: "Thinking: ", format: "$level" } }, cells: [{ instrument: "thinking" }] });
  assert.equal(known.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()), "Thinking: " + fakeTheme().style("high", { fg: "thinkingHigh" }), "the same label with a known level renders");
});

test("a known datum with an intentionally empty format renders the label alone", () => {
  const labelled = readDocument({ instruments: { thinking: { label: "🤔", format: "" } }, cells: [{ instrument: "thinking" }] });
  assert.equal(labelled.warning, undefined);
  assert.equal(labelled.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()), "🤔");
  const bare = readDocument({ instruments: { thinking: { label: "", format: "" } }, cells: [{ instrument: "thinking" }] });
  assert.equal(bare.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()), "");
});

test("a whitespace-only format counts as empty and leaves the label alone", () => {
  const result = readDocument({ instruments: { thinking: { label: "🤔", format: "   " } }, cells: [{ instrument: "thinking" }] });
  assert.equal(result.warning, undefined);
  assert.equal(result.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()), "🤔");
});

test("an unknown datum leaves no label and no lone gap, whatever the format", () => {
  const unknownLevel: Readings = { ...seed, thinkingLevel: undefined };
  for (const format of ["$level", "", "   "]) {
    const result = readDocument({ instruments: { thinking: { label: "🤔", format } }, cells: [{ instrument: "thinking" }] });
    assert.equal(result.warning, undefined, JSON.stringify(format));
    assert.equal(result.rows[0]?.cells[0]?.instrument.render(unknownLevel, 80, fakeTheme()), "",
      `an unknown level with ${JSON.stringify(format)} renders no cell, label included: the guard reads the declared variables, not the trimmed segments`);
  }
  const known = readDocument({ instruments: { thinking: { label: "🤔", format: "$level" } }, cells: [{ instrument: "thinking" }] });
  assert.equal(known.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()),
    "🤔 " + fakeTheme().style("high", { fg: "thinkingHigh" }), "the same label with a known level renders it after the gap");
});

test("a label is literal text, never a variable and never parsed", () => {
  const dollar = readDocument({ instruments: { model: { label: "$level ", format: "$model" } }, cells: [{ instrument: "model" }] });
  assert.equal(dollar.warning, undefined);
  assert.deepEqual(dollar.rows[0]?.cells.map(cellText), ["$level claude-opus-4"]);
  const escaped = readDocument({ instruments: { model: { label: "a\\$b ", format: "$model" } }, cells: [{ instrument: "model" }] });
  assert.deepEqual(escaped.rows[0]?.cells.map(cellText), ["a\\$b claude-opus-4"], "an escape inside a label is not consumed");
  rejected({ instruments: { model: { format: "$label" } } }, '"model"\'s format names a variable it does not declare: "$label"');
});

test("a label's control characters each become one space so the label stays on one line", () => {
  const result = readDocument({ instruments: { thinking: { label: "A\nB\u0085C ", format: "$level" } }, cells: [{ instrument: "thinking" }] });
  assert.equal(result.warning, undefined);
  const text = result.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()) ?? "";
  assert.equal(text, "A B C " + fakeTheme().style("high", { fg: "thinkingHigh" }));
  assert.equal(text.includes("\n"), false);
  const controls = readDocument({ instruments: { thinking: { label: "T\tB\r", format: "$level" } }, cells: [{ instrument: "thinking" }] });
  assert.equal(controls.rows[0]?.cells[0]?.instrument.render(seed, 80, fakeTheme()), "T B " + fakeTheme().style("high", { fg: "thinkingHigh" }), "a tab and a carriage return each become one space");
});

test("the label takes the instrument's configured style", () => {
  const theme = fakeTheme();
  const styled = readDocument({ instruments: { model: { label: "Q: ", format: "$model", style: { fg: "accent" } } }, cells: [{ instrument: "model" }] }, theme);
  assert.equal(styled.warning, undefined);
  assert.deepEqual(styled.rows[0]?.cells.map(cellText), [theme.style("Q: ", { fg: "accent" }) + theme.style("claude-opus-4", { fg: "accent" })]);
  const plain = readDocument({ instruments: { model: { label: "Q: ", format: "$model" } }, cells: [{ instrument: "model" }] });
  assert.deepEqual(plain.rows[0]?.cells.map(cellText), ["Q: claude-opus-4"], "with no style the label is unstyled text");
});

test("the label's width reduces what the bar has left", () => {
  const theme = fakeTheme();
  const result = readDocument({ instruments: { context: { label: "ab ", format: "$percent $bar" } }, cells: [{ instrument: "context" }] });
  assert.equal(result.warning, undefined);
  const text = result.rows[0]?.cells[0]?.instrument.render(seed, 20, theme) ?? "";
  assert.equal(text, "ab 43.2% " + "█".repeat(4) + theme.style("░".repeat(7), { dim: true }));
  assert.equal(visibleWidth(text), 20);
  const full = readDocument({ instruments: { context: { label: "x".repeat(20), format: "$bar" } }, cells: [{ instrument: "context" }] });
  assert.equal(full.rows[0]?.cells[0]?.instrument.render(seed, 20, theme), "x".repeat(20) + " ", "a label as wide as the cell leaves the bar nothing");
});

test("a label narrower than the cell shrinks the bar by its columns and the gap's one", () => {
  const theme = fakeTheme();
  const result = readDocument({ instruments: { context: { label: "ab", format: "$percent $bar" } }, cells: [{ instrument: "context" }] });
  assert.equal(result.warning, undefined);
  const text = result.rows[0]?.cells[0]?.instrument.render(seed, 20, theme) ?? "";
  assert.equal(text, "ab 43.2% " + "█".repeat(4) + theme.style("░".repeat(7), { dim: true }));
  assert.equal(visibleWidth(text), 20);
});

test("a configured foreground does not beat the level's color", () => {
  const theme = fakeTheme();
  const { rows, warning } = readDocument({ instruments: { thinking: { style: { fg: "accent" } } }, cells: [{ instrument: "thinking" }] }, theme);
  assert.equal(warning, undefined);
  const text = rows[0]?.cells[0]?.instrument.render(seed, 80, theme) ?? "";
  assert.equal(stripTerminalSequences(text), "Thinking: High");
  assert.equal(text, theme.style("Thinking: ", { fg: "accent" }) + theme.style("High", { fg: "thinkingHigh" }));
});

test("a configured background and boolean attributes survive on the level", () => {
  const theme = fakeTheme();
  const style = { bg: "selectedBg", bold: true } as const;
  const { rows } = readDocument({ instruments: { thinking: { style } }, cells: [{ instrument: "thinking" }] }, theme);
  assert.equal(rows[0]?.cells[0]?.instrument.render(seed, 80, theme), theme.style("Thinking: ", style) + theme.style("High", { ...style, fg: "thinkingHigh" }));
  const italic = { italic: true } as const;
  const attrs = readDocument({ instruments: { thinking: { style: italic } }, cells: [{ instrument: "thinking" }] }, theme);
  assert.equal(attrs.rows[0]?.cells[0]?.instrument.render(seed, 80, theme), theme.style("Thinking: ", italic) + theme.style("High", { italic: true, fg: "thinkingHigh" }));
});

test("only the level segment is recolored", () => {
  const theme = fakeTheme();
  const style = { fg: "accent" } as const;
  const { rows } = readDocument({ instruments: { thinking: { style, format: "[$level]", label: "Q: " } }, cells: [{ instrument: "thinking" }] }, theme);
  assert.equal(rows[0]?.cells[0]?.instrument.render(seed, 80, theme),
    theme.style("Q: ", style) + theme.style("[", style) + theme.style("high", { fg: "thinkingHigh" }) + theme.style("]", style));
});

test("a level outside the seven keeps the instrument's own style", () => {
  const theme = fakeTheme();
  const plain = readDocument({ cells: [{ instrument: "thinking" }] }, theme);
  const styled = readDocument({ instruments: { thinking: { style: { fg: "accent" } } }, cells: [{ instrument: "thinking" }] }, theme);
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
  const { rows } = readDocument({ cells: [{ instrument: "thinking" }] }, a);
  const cell = rows[0]?.cells[0];
  assert.ok(cell);
  assert.equal(cell.instrument.render(seed, 80, a), "Thinking: " + a.style("High", { fg: "thinkingHigh" }));
  assert.equal(cell.instrument.render(seed, 80, b), "Thinking: " + b.style("High", { fg: "thinkingHigh" }), "the second render uses the second theme");
  assert.notEqual(a.getFgAnsi("thinkingHigh"), b.getFgAnsi("thinkingHigh"));
});

test("trusted project instruments replace the agent document whole and untrusted instruments are ignored", () => {
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  const agentPath = join(dir, "agent.json"), projectPath = join(dir, "project.json");
  writeFileSync(agentPath, JSON.stringify({ instruments: { blank: { format: "agent" }, model: { format: "agent-model" } }, cells: [{ instrument: "blank" }, { instrument: "model" }] }));
  writeFileSync(projectPath, JSON.stringify({ instruments: { blank: { format: "project" } }, cells: [{ instrument: "blank" }, { instrument: "model" }] }));
  const trusted = readConfiguration({ agentPath, projectPath, projectTrusted: true, theme: fakeTheme() });
  assert.deepEqual(trusted.rows[0]?.cells.map(cellText), ["project", "anthropic: claude-opus-4"]);
  const untrusted = readConfiguration({ agentPath, projectPath, projectTrusted: false, theme: fakeTheme() });
  assert.deepEqual(untrusted.rows[0]?.cells.map(cellText), ["agent", "agent-model"]);
});

test("a configured name binds once across cells and rows while unconfigured names keep defaults", () => {
  const { rows, warning } = readDocument({
    instruments: { model: { format: "🧠: $model from $provider" }, tokens: { format: "↑$input ↓$output" }, context: { format: "unused" } },
    rows: [
      { cells: [{ instrument: "model" }, { instrument: "model" }, { instrument: "thinking" }, { instrument: "tokens" }] },
      { cells: [{ instrument: "model" }, { instrument: "tokens" }] },
    ],
  });
  assert.equal(warning, undefined);
  assert.deepEqual(rows.map(row => row.cells.map(cellText)), [
    ["🧠: claude-opus-4 from anthropic", "🧠: claude-opus-4 from anthropic", "Thinking: " + fakeTheme().style("High", { fg: "thinkingHigh" }), "↑1.0k ↓2.0k"],
    ["🧠: claude-opus-4 from anthropic", "↑1.0k ↓2.0k"],
  ]);
  assert.equal(rows[0]?.cells[0]?.instrument, rows[0]?.cells[1]?.instrument);
  assert.equal(rows[0]?.cells[0]?.instrument, rows[1]?.cells[0]?.instrument);
  assert.equal(rows[0]?.cells[3]?.instrument, rows[1]?.cells[1]?.instrument);
});

test("unknown instrument names in the section and cells share one exact notice", () => {
  const onlySection = readDocument({ instruments: { nope: {} }, cells: [{ instrument: "model" }] });
  assert.equal(onlySection.warning, `pi-jefferson: ${onlySection.path} names instruments the extension does not implement: nope; those cells render blank`);
  assert.deepEqual(onlySection.rows[0]?.cells.map(cellText), ["anthropic: claude-opus-4"]);
  const both = readDocument({ instruments: { nope: {}, blank: { format: "configured blank" } }, cells: [{ instrument: "model" }, { instrument: "nope" }, { instrument: "thinking" }] });
  assert.equal(both.warning, `pi-jefferson: ${both.path} names instruments the extension does not implement: nope; those cells render blank`);
  assert.deepEqual(both.rows[0]?.cells.map(cellText), ["anthropic: claude-opus-4", "configured blank", "Thinking: " + fakeTheme().style("High", { fg: "thinkingHigh" })]);
});

test("containers and multiple unknown section names retain the accepted-notice order", () => {
  const result = readDocument({ containers: 3, instruments: { nope: {}, other: {} } });
  assert.equal(result.warning, `pi-jefferson: ${result.path} carries the containers key, which is no longer read; declare cells instead; names instruments the extension does not implement: nope, other; those cells render blank`);
  assert.equal(result.rows[0]?.cells.length, 10);
});

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
    rejected({ instruments, cells: [{ instrument: "model" }] }, "the instruments value is not an object");
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
  const empty = readDocument({ instruments: { model: { label: "" } }, cells: [{ instrument: "model" }] });
  assert.equal(empty.warning, undefined);
});

test("an explicitly empty configured format is accepted and renders nothing", () => {
  const result = readDocument({ instruments: { model: { format: "" } }, cells: [{ instrument: "model" }] });
  assert.equal(result.warning, undefined);
  assert.deepEqual(result.rows[0]?.cells.map(cellText), [""]);
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
  const result = readDocument({ instruments: { model: { format: "$model", style } }, cells: [{ instrument: "model" }] });
  assert.equal(result.warning, undefined);
  assert.deepEqual(result.rows[0]?.cells.map(cellText), [fakeTheme().style("claude-opus-4", style)]);
  const falseAttributes = Object.fromEntries(Object.keys(style).map(key => [key, false]));
  const disabled = readDocument({ instruments: { model: { format: "$model", style: falseAttributes } }, cells: [{ instrument: "model" }] });
  assert.equal(disabled.warning, undefined);
  assert.deepEqual(disabled.rows[0]?.cells.map(cellText), ["claude-opus-4"]);
  const empty = readDocument({ instruments: { model: { style: {} } }, cells: [{ instrument: "model" }] });
  const absent = readDocument({ cells: [{ instrument: "model" }] });
  assert.equal(empty.warning, undefined);
  assert.deepEqual(empty.rows[0]?.cells.map(cellText), absent.rows[0]?.cells.map(cellText));
});

test("error precedence reads the envelope before instruments and instruments before cells", () => {
  rejected({ instruments: { model: { format: 42 } }, cells: [{ instrument: "model", align: "middle" }] }, 'instrument "model" has a format that is not a string');
  rejected({ instruments: 42, rows: [{}], cells: [{ instrument: "model" }] }, "the configuration carries both a top-level row and a rows list");
  rejected({ instruments: { model: { format: 42 } }, rows: [{ cells: [{ instrument: "model", align: "middle" }] }] }, 'instrument "model" has a format that is not a string');
});

const FRAME = "\x1b[0m\x1b]8;;\x07";
const RESET = "\x1b[0m";

function footerFor(document: unknown, theme: Theme = fakeTheme()) {
  const result = readDocument(document, theme);
  assert.equal(result.warning, undefined);
  return createFooter(result.rows, () => seed, theme);
}

test("configured styled cells reset before every trailing pad, including attribute-only styles", () => {
  const theme = fakeTheme();
  for (const style of [{ fg: "accent" }, { bold: true }, { strikethrough: true }] as const) {
    const footer = footerFor({ instruments: { blank: { format: "ab", style } }, cells: Array.from({ length: 3 }, () => ({ instrument: "blank" })) }, theme);
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
    const document = { instruments: { context: { label: "Q", format: "$percent", style } }, cells: [{ instrument: "context" }] };
    const { rows } = readDocument(document, theme);
    const text = theme.style("Q ", style) + theme.style("43.2%", style);
    assert.equal(rows[0]?.cells[0]?.instrument.render(seed, 80, theme), text, JSON.stringify(style));
    const line = footerFor(document, theme).render(20)[0] ?? "";
    assert.equal(visibleWidth(line), 20);
    assert.ok(line.includes(text + RESET + " ".repeat(13)), "the cell's pad follows the styled gap and one reset");
  }
});

test("a cell narrower than the label, the gap and the content clips them together", () => {
  const footer = footerFor({ instruments: { model: { label: "ab", format: "$model" } }, cells: [{ instrument: "model" }] });
  const lines = footer.render(10);
  assert.equal(lines.length, 1);
  assert.equal(visibleWidth(lines[0] ?? ""), 10);
  assert.ok(stripTerminalSequences(lines[0] ?? "").startsWith("ab c"), "the label, the gap, then the clipped content");
});

test("right-aligned styled cells lead with unstyled pad and exact-fill cells add no reset", () => {
  const theme = fakeTheme();
  const footer = footerFor({ instruments: { blank: { format: "ab", style: { fg: "accent" } } }, cells: [{ instrument: "blank", align: "right" }] }, theme);
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
  const footer = footerFor({ instruments: { blank: { format: "ab漢字cd", style: { fg: "accent" } } }, cells: Array.from({ length: 3 }, () => ({ instrument: "blank" })) }, theme);
  const line = footer.render(20)[0] ?? "";
  assert.equal(visibleWidth(line), 20);
  const third = line.split(FRAME)[3] ?? "";
  assert.equal(third, theme.getFgAnsi("accent") + "ab" + RESET + "..." + RESET + " ");
  assert.equal(third.match(/\x1b\[0m/g)?.length, 2);
});

test("configured prose around a bar is styled per segment and the dim track retains its background", () => {
  const theme = fakeTheme();
  const style: ThemeStyle = { fg: "accent", bg: "selectedBg" };
  const footer = footerFor({ instruments: { context: { format: "[$bar]", style } }, cells: [{ instrument: "context" }] }, theme);
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
  const absent = footerFor({ instruments: { blank: { format: "ab" } }, cells }).render(21);
  const empty = footerFor({ instruments: { blank: { format: "ab", style: {} } }, cells }).render(21);
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
  const footer = footerFor({ instruments: { blank: { format: "ab", style: { fg: "accent" } } }, cells: [{ instrument: "blank" }] }, live);
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
