import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import type { Configuration } from "../extensions/jefferson/configuration.ts";
import {
  DEFAULT_CELLS,
  MAX_CELLS,
  readConfiguration,
} from "../extensions/jefferson/configuration.ts";
import { blank, model, thinking } from "../extensions/jefferson/instrument.ts";

/** Write `document` as the agent file of a fresh temp dir and read the configuration. */
function readDocument(document: unknown): Configuration {
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  const agentPath = join(dir, "pi-jefferson.json");
  writeFileSync(agentPath, typeof document === "string" ? document : JSON.stringify(document));
  return readConfiguration({
    agentPath,
    projectPath: join(dir, "missing.json"),
    projectTrusted: false,
  });
}

test("a top-level row object normalizes to one row", () => {
  const { rows, warning } = readDocument({ cells: ["blank", "blank", "blank", "blank"] });
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
  const { rows, warning } = readDocument({ cells: ["blank"], rows: [{}] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 8);
  assert.ok(warning, "a rejected document warns");
});

test("an absent configuration yields the default row with no warning", () => {
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  const { rows, warning } = readConfiguration({
    agentPath: join(dir, "missing-agent.json"),
    projectPath: join(dir, "missing-project.json"),
    projectTrusted: true,
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 8);
  assert.equal(warning, undefined);
});

test("an empty object yields one row of eight with no warning", () => {
  const { rows, warning } = readDocument({});
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 8);
  assert.equal(warning, undefined);
});

test("an empty rows list yields the default row with no warning", () => {
  const { rows, warning } = readDocument({ rows: [] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 8);
  assert.equal(warning, undefined);
});

test("a row omitting cells renders 8 cells", () => {
  const { rows, warning } = readDocument({ rows: [{}] });
  assert.equal(rows[0]?.cells.length, 8);
  assert.equal(warning, undefined);
});

test("a row omitting cells holds eight blank cells", () => {
  const { rows, warning } = readDocument({ rows: [{}] });
  const cells = rows[0]?.cells ?? [];
  assert.equal(cells.length, DEFAULT_CELLS);
  for (const cell of cells) {
    assert.equal(cell.instrument, blank, "the instrument itself, not merely equal text");
  }
  assert.equal(warning, undefined);
});

test("cells is both the count and the placement, in order", () => {
  const { rows, warning } = readDocument({ rows: [{ cells: ["model", "thinking", "blank"] }] });
  assert.deepEqual(
    rows[0]?.cells.map((cell) => cell.instrument),
    [model, thinking, blank],
  );
  assert.equal(warning, undefined);
});

test("cells naming 12 instruments keeps the first 8 and warns nothing", () => {
  const { rows, warning } = readDocument({ rows: [{ cells: Array(12).fill("blank") }] });
  assert.equal(rows[0]?.cells.length, MAX_CELLS);
  assert.equal(warning, undefined, "the clamp stays accepted behavior under its truthful name");
});

test("a cells entry past the ceiling that is not a string rejects the document", () => {
  const { rows, warning } = readDocument({
    rows: [{ cells: ["blank", "blank", "blank", "blank", "blank", "blank", "blank", "blank", 42] }],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 8);
  assert.ok(warning, "a rejected document warns");
  assert.match(warning, /not a string/);
});

test("a cells entry past the ceiling naming an unknown instrument warns and renders eight cells", () => {
  const { rows, warning } = readDocument({
    rows: [{ cells: ["blank", "blank", "blank", "blank", "blank", "blank", "blank", "blank", "brnach"] }],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 8);
  assert.ok(warning, "the unknown instrument still warns past the ceiling");
  assert.match(warning, /brnach/);
});

test("the cell-count constants are named for cells", () => {
  assert.equal(DEFAULT_CELLS, 8);
  assert.equal(MAX_CELLS, 8);
});

test("a document carrying containers is accepted and renders eight blank cells", () => {
  const { rows, warning } = readDocument({ containers: 3 });
  const cells = rows[0]?.cells ?? [];
  assert.equal(cells.length, DEFAULT_CELLS, "the key is not read, so the count does not move");
  for (const cell of cells) assert.equal(cell.instrument, blank);
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

test("a document naming cells and no containers warns nothing extra", () => {
  const { rows, warning } = readDocument({ rows: [{ cells: ["model"] }] });
  assert.equal(rows[0]?.cells.length, 1);
  assert.equal(warning, undefined);
});

test("an instrument the extension does not implement renders blank and warns naming it", () => {
  const { rows, warning } = readDocument({ rows: [{ cells: ["model", "nope", "thinking"] }] });
  assert.deepEqual(
    rows[0]?.cells.map((cell) => cell.instrument),
    [model, blank, thinking],
    "the unknown name renders blank while the rest of the row renders its instruments",
  );
  assert.ok(warning);
  assert.match(warning, /nope/);
});

test("two unimplemented instruments in different rows share one warning", () => {
  const { rows, warning } = readDocument({
    rows: [{ cells: ["alpha", "model"] }, { cells: ["thinking", "beta"] }],
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
  assert.equal(rows[0]?.cells.length, 8);
  assert.ok(warning, "a row of no cells has no geometry");
  assert.match(warning, /empty cells/);
});

for (const [name, entry] of [
  ["zero", 0],
  ["negative", -1],
  ["non-integer", 2.5],
  ["null", null],
  ["a cell-descriptor object", [{ text: "x" }]],
] as const) {
  test(`a cells entry of ${name} is rejected`, () => {
    const { rows, warning } = readDocument({ rows: [{ cells: [entry] }] });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.cells.length, 8);
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
    assert.equal(rows[0]?.cells.length, 8);
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
  assert.equal(rows[0]?.cells.length, 8);
  assert.ok(warning, "a duplicate id warns");
});

test("an explicit id colliding with a synthesized id is rejected", () => {
  const { rows, warning } = readDocument({ rows: [{ id: "row-1" }, {}] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 8);
  assert.ok(warning, "an id collision warns");
});

test("a trusted project document replaces the agent document whole", () => {
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  const agentPath = join(dir, "agent.json");
  const projectPath = join(dir, "project.json");
  writeFileSync(
    agentPath,
    JSON.stringify({ rows: [{ cells: ["blank", "blank", "blank"] }] }),
  );
  writeFileSync(projectPath, JSON.stringify({ rows: [{}, {}] }));
  const { rows } = readConfiguration({ agentPath, projectPath, projectTrusted: true });
  assert.deepEqual(
    rows.map((row) => row.cells.length),
    [8, 8],
  );
});

test("an untrusted project document is ignored", () => {
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  const agentPath = join(dir, "agent.json");
  const projectPath = join(dir, "project.json");
  writeFileSync(
    agentPath,
    JSON.stringify({ rows: [{ cells: ["blank", "blank", "blank"] }] }),
  );
  writeFileSync(projectPath, JSON.stringify({ rows: [{}, {}] }));
  const { rows } = readConfiguration({ agentPath, projectPath, projectTrusted: false });
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
    JSON.stringify({ rows: [{ cells: ["blank", "blank", "blank"] }] }),
  );
  const { rows } = readConfiguration({
    agentPath,
    projectPath: join(dir, "missing.json"),
    projectTrusted: true,
  });
  assert.deepEqual(
    rows.map((row) => row.cells.length),
    [3],
  );
});

test("every cell is a Cell object carrying only an instrument", () => {
  for (const count of [1, 3, 8]) {
    const { rows } = readDocument({ rows: [{ cells: Array(count).fill("blank") }] });
    const cells = rows[0]?.cells;
    assert.ok(Array.isArray(cells) && cells.length === count);
    for (const cell of cells ?? []) {
      assert.deepEqual(Object.keys(cell), ["instrument"]);
      assert.equal(cell.instrument, blank);
    }
  }
});

test("an unparseable document is rejected", () => {
  const { rows, warning } = readDocument("{ not json");
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 8);
  assert.ok(warning, "an unparseable document warns");
});

test("containers beside a rows list warns once rather than passing silently", () => {
  const { rows, warning } = readDocument({ containers: 3, rows: [{}, {}] });
  assert.equal(rows.length, 2, "the document's rows still render");
  assert.ok(warning, "the key is not read, and its removal is not silent");
  assert.equal(warning.match(/containers/g)?.length, 1);
  assert.match(warning, /declare cells instead/);
});
