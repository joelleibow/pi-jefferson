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
    assert.equal(cell.instrument, blank, "the instrument itself, not merely equal text");
  }
  assert.equal(warning, undefined);
});

test("cells is both the count and the placement, in order", () => {
  const { rows, warning } = readDocument({ rows: [{ cells: [{ instrument: "model" }, { instrument: "thinking" }, { instrument: "blank" }] }] });
  assert.deepEqual(
    rows[0]?.cells.map((cell) => cell.instrument),
    [model, thinking, blank],
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
  assert.deepEqual(noAlign.rows[0]?.cells.map((cell) => cell.instrument), [model]);
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
  const { rows, warning } = readDocument({ rows: [{ cells: [{ instrument: "model" }] }] });
  assert.equal(rows[0]?.cells.length, 1);
  assert.equal(warning, undefined);
});

test("an instrument the extension does not implement renders blank and warns naming it", () => {
  const { rows, warning } = readDocument({ rows: [{ cells: [{ instrument: "model" }, { instrument: "nope" }, { instrument: "thinking" }] }] });
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
  const { rows } = readConfiguration({ agentPath, projectPath, projectTrusted: true });
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
    JSON.stringify({ rows: [{ cells: [{ instrument: "blank" }, { instrument: "blank" }, { instrument: "blank" }] }] }),
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

test("every cell carries an instrument and an alignment", () => {
  for (const count of [1, 3, 8]) {
    const { rows } = readDocument({ rows: [{ cells: Array.from({ length: count }, () => ({ instrument: "blank" })) }] });
    const cells = rows[0]?.cells;
    assert.ok(Array.isArray(cells) && cells.length === count);
    for (const cell of cells ?? []) {
      assert.deepEqual(Object.keys(cell), ["instrument", "align"]);
      assert.equal(cell.instrument, blank);
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
