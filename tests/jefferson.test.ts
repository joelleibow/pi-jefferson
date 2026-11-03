import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import { DEFAULT_CELL_TEXT } from "../extensions/jefferson/configuration.ts";
import jefferson, { VERSION } from "../extensions/jefferson.ts";

/**
 * Tests live in `tests/`, never beside the extension.
 *
 * Pi loads every direct `.ts` file in `extensions/` as an extension, so a test file
 * sitting next to one is executed on every pi start. A subdirectory or a sibling tree
 * is not traversed that way.
 */

interface CommandDef {
  description: string;
  handler: (args: string, ctx: { ui: { notify(message: string): void } }) => Promise<void>;
}

interface Loaded {
  commands: Map<string, CommandDef>;
  handlers: Map<string, unknown>;
}

function load(): Loaded {
  const commands = new Map<string, CommandDef>();
  const handlers = new Map<string, unknown>();
  const fakePi = {
    registerCommand: (name: string, def: CommandDef) => void commands.set(name, def),
    on: (event: string, handler: unknown) => void handlers.set(event, handler),
  };
  (jefferson as unknown as (pi: unknown) => void)(fakePi);
  return { commands, handlers };
}

test("registers exactly one command", () => {
  assert.deepEqual([...load().commands.keys()], ["jefferson"]);
});

test("the alpha announces that it is a name claim and nothing more", async () => {
  const notified: string[] = [];
  const def = load().commands.get("jefferson");
  assert.ok(def, "no jefferson command registered");

  await def.handler("", { ui: { notify: (message) => void notified.push(message) } });

  assert.deepEqual(notified, [`pi-jefferson ${VERSION} — the statusline is not built yet.`]);
  assert.equal(VERSION, "0.0.0-alpha");
});

interface FakeCtx {
  mode: string;
  cwd: string;
  trusted: boolean;
  notified: Array<{ message: string; type: string | undefined }>;
  footers: Array<{ render(width: number): string[] }>;
}

function makeCtx(mode: string, cwd: string, trusted = false): FakeCtx {
  const ctx: FakeCtx = { mode, cwd, trusted, notified: [], footers: [] };
  return ctx;
}

/** Invoke the captured session_start handler against a fake ctx. */
async function startSession(
  ctx: FakeCtx,
): Promise<void> {
  const { handlers } = load();
  const handler = handlers.get("session_start") as (
    event: { type: string; reason: string },
    ctx: unknown,
  ) => Promise<void>;
  assert.ok(handler, "no session_start handler registered");
  const fakeCtx = {
    mode: ctx.mode,
    cwd: ctx.cwd,
    isProjectTrusted: () => ctx.trusted,
    ui: {
      notify: (message: string, type?: string) => void ctx.notified.push({ message, type }),
      setFooter: (factory: () => { render(width: number): string[] }) =>
        void ctx.footers.push(factory()),
    },
  };
  await handler({ type: "session_start", reason: "startup" }, fakeCtx);
}

/** Set PI_CODING_AGENT_DIR to a temp dir for one test and restore it after. */
function useTempAgentDir(t: { after: (fn: () => void) => void }): string {
  const agentDir = mkdtempSync(join(tmpdir(), "jefferson-agent-"));
  const previous = process.env.PI_CODING_AGENT_DIR;
  process.env.PI_CODING_AGENT_DIR = agentDir;
  t.after(() => {
    if (previous === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previous;
  });
  return agentDir;
}

test("the session_start handler installs the footer in TUI mode", async (t) => {
  useTempAgentDir(t);
  const ctx = makeCtx("tui", mkdtempSync(join(tmpdir(), "jefferson-cwd-")));
  await startSession(ctx);
  assert.equal(ctx.footers.length, 1);
  assert.deepEqual(ctx.notified, []);
});

test("the session_start handler does not install a footer outside TUI mode", async (t) => {
  useTempAgentDir(t);
  const ctx = makeCtx("print", mkdtempSync(join(tmpdir(), "jefferson-cwd-")));
  await startSession(ctx);
  assert.equal(ctx.footers.length, 0);
});

test("the footer is re-installed on every session_start", async (t) => {
  useTempAgentDir(t);
  const ctx = makeCtx("tui", mkdtempSync(join(tmpdir(), "jefferson-cwd-")));
  await startSession(ctx); // startup
  await startSession(ctx); // reload
  assert.equal(ctx.footers.length, 2);
});

function writeProjectDocument(cwd: string, document: unknown): void {
  const dir = join(cwd, CONFIG_DIR_NAME);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "pi-jefferson.json"), JSON.stringify(document));
}

test("a trusted project's document wins end to end", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeFileSync(join(agentDir, "pi-jefferson.json"), JSON.stringify({}));
  const cwd = mkdtempSync(join(tmpdir(), "jefferson-cwd-"));
  writeProjectDocument(cwd, { rows: [{}, {}] });

  const ctx = makeCtx("tui", cwd, true);
  await startSession(ctx);
  assert.equal(ctx.footers.length, 1);
  assert.equal(ctx.footers[0]?.render(80).length, 2, "the project's two rows render");
});

test("a rejected configuration warns and still installs the default row", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeFileSync(
    join(agentDir, "pi-jefferson.json"),
    JSON.stringify({ containers: 4, rows: [{}] }),
  );
  const ctx = makeCtx("tui", mkdtempSync(join(tmpdir(), "jefferson-cwd-")));
  await startSession(ctx);
  assert.equal(ctx.notified.length, 1);
  assert.equal(ctx.notified[0]?.type, "warning");
  const lines = ctx.footers[0]?.render(80) ?? [];
  assert.equal(lines.length, 1, "the default row renders");
  // One row of 8 cells at 80 columns: 10 columns each of the truncated placeholder.
  assert.equal(lines[0], truncateToWidth(DEFAULT_CELL_TEXT, 10).repeat(8));
  assert.equal(visibleWidth(lines[0] ?? ""), 80);
});

test("the exported surface offers no way to supply or replace cell content", async () => {
  const entry = await import("../extensions/jefferson.ts");
  assert.deepEqual(Object.keys(entry).sort(), ["VERSION", "default"]);

  const renderer = await import("../extensions/jefferson/row-renderer.ts");
  assert.deepEqual(Object.keys(renderer).sort(), ["createFooter", "renderRow"]);

  const configuration = await import("../extensions/jefferson/configuration.ts");
  for (const key of Object.keys(configuration)) {
    assert.ok(
      !/register|supply|contribute/i.test(key),
      `${key} looks like a contribution interface`,
    );
  }
});

test("an untrusted project's document is ignored end to end", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeFileSync(join(agentDir, "pi-jefferson.json"), JSON.stringify({}));
  const cwd = mkdtempSync(join(tmpdir(), "jefferson-cwd-"));
  writeProjectDocument(cwd, { rows: [{}, {}] });

  const ctx = makeCtx("tui", cwd, false);
  await startSession(ctx);
  assert.equal(ctx.footers.length, 1);
  assert.equal(ctx.footers[0]?.render(80).length, 1, "the agent document's one row renders");
});
