import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  type Configuration,
  DEFAULT_CELL_TEXT,
  readConfiguration,
} from "../extensions/jefferson/configuration.ts";

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
  const { rows, warning } = readDocument({ containers: 4 });
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
  const { rows, warning } = readDocument({ containers: 4, rows: [{}] });
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

test("a row omitting containers renders 8 cells", () => {
  const { rows, warning } = readDocument({ rows: [{}] });
  assert.equal(rows[0]?.cells.length, 8);
  assert.equal(warning, undefined);
});

test("containers within the ceiling is honored", () => {
  const { rows, warning } = readDocument({ rows: [{ containers: 3 }] });
  assert.equal(rows[0]?.cells.length, 3);
  assert.equal(warning, undefined);
});

test("containers above the ceiling clamps to 8", () => {
  const { rows, warning } = readDocument({ rows: [{ containers: 12 }] });
  assert.equal(rows[0]?.cells.length, 8);
  assert.equal(warning, undefined);
});

for (const [name, containers] of [
  ["zero", 0],
  ["negative", -1],
  ["non-integer", 2.5],
  ["null", null],
  ["a cell-descriptor array", [{ text: "x" }]],
] as const) {
  test(`containers of ${name} is rejected`, () => {
    const { rows, warning } = readDocument({ rows: [{ containers }] });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.cells.length, 8);
    assert.ok(warning, "a rejected document warns");
  });
}

test("containers given as a string is rejected", () => {
  const { rows, warning } = readDocument({ rows: [{ containers: "4" }] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 8);
  assert.ok(warning, "a rejected document warns");
});

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
  writeFileSync(agentPath, JSON.stringify({ rows: [{ containers: 3 }] }));
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
  writeFileSync(agentPath, JSON.stringify({ rows: [{ containers: 3 }] }));
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
  writeFileSync(agentPath, JSON.stringify({ rows: [{ containers: 3 }] }));
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

test("every cell is a Cell object carrying only the placeholder text", () => {
  for (const count of [1, 3, 8]) {
    const { rows } = readDocument({ rows: [{ containers: count }] });
    const cells = rows[0]?.cells;
    assert.ok(Array.isArray(cells) && cells.length === count);
    for (const cell of cells ?? []) {
      assert.equal(typeof cell, "object");
      assert.equal(cell.text, DEFAULT_CELL_TEXT);
      assert.deepEqual(Object.keys(cell), ["text"]);
    }
  }
});

test("an unparseable document is rejected", () => {
  const { rows, warning } = readDocument("{ not json");
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.cells.length, 8);
  assert.ok(warning, "an unparseable document warns");
});
