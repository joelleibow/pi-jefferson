import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { TUI } from "@earendil-works/pi-tui";

import { DEFAULT_CELL_TEXT } from "../extensions/jefferson/instrument.ts";
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

type Handler = (event: unknown, ctx: unknown) => unknown;

/** One `pi.on` registration: the event it was taken for, and how often its release ran. */
interface Subscription {
  event: string;
  calls: number;
}

/** The component the host keeps, so `render` and `dispose` are reachable from a test. */
interface FakeFooter {
  render(width: number): string[];
  invalidate(): void;
  dispose?(): void;
}

/** One session's host-facing side: what it was told, what it installed, what it subscribed to. */
interface FakeSession {
  notified: Array<{ message: string; type: string | undefined }>;
  footers: FakeFooter[];
  repaints: () => number;
  subscriptions: Subscription[];
  lines(width: number): string[];
}

interface SessionOptions {
  reason?: string;
  mode?: string;
  cwd?: string;
  trusted?: boolean;
  /** Absent for a session the host restored with no model. */
  model?: { provider: string; id: string };
  thinkingLevel?: string;
}

interface Harness {
  commands: Map<string, CommandDef>;
  /** The host-facing order as it happened: `setFooter#n`, `unsubscribe:<event>`. */
  log: string[];
  start(options?: SessionOptions): Promise<FakeSession>;
  dispatch(event: { type: string } & Record<string, unknown>): void;
}

/** A fake `pi`, the extension bound to it once, and the sessions it was started with. */
function harness(): Harness {
  const commands = new Map<string, CommandDef>();
  const handlers = new Map<string, Handler>();
  const subscriptions: Subscription[] = [];
  const log: string[] = [];
  let installs = 0;
  let current: { ctx: unknown } | undefined;

  const fakePi = {
    registerCommand: (name: string, def: CommandDef) => void commands.set(name, def),
    on: (event: string, handler: Handler): (() => void) => {
      handlers.set(event, handler);
      const subscription: Subscription = { event, calls: 0 };
      subscriptions.push(subscription);
      return () => {
        subscription.calls += 1;
        log.push(`unsubscribe:${event}`);
      };
    },
  };
  (jefferson as unknown as (pi: unknown) => void)(fakePi);

  return {
    commands,
    log,
    async start(options: SessionOptions = {}): Promise<FakeSession> {
      const cwd = options.cwd ?? mkdtempSync(join(tmpdir(), "jefferson-cwd-"));
      const notified: Array<{ message: string; type: string | undefined }> = [];
      const footers: FakeFooter[] = [];
      let repaints = 0;
      const session: FakeSession = {
        notified,
        footers,
        repaints: () => repaints,
        subscriptions: [],
        lines(width: number) {
          return footers.at(-1)?.render(width) ?? [];
        },
      };
      const ctx = {
        mode: options.mode ?? "tui",
        cwd,
        model: options.model,
        thinkingLevel: options.thinkingLevel,
        getContextUsage: () => undefined,
        sessionManager: {
          getSessionId: () => "session-1",
          getLeafId: () => null,
          getEntries: () => [],
        },
        isProjectTrusted: () => options.trusted ?? false,
        ui: {
          notify: (message: string, type?: string) => void notified.push({ message, type }),
          // `Pick<TUI, "requestRender">` rather than a local shape: a rename or removal of
          // `requestRender` in the host then fails `pnpm typecheck` instead of the fake quietly
          // drifting from the host it stands in for.
          setFooter: (factory: (tui: Pick<TUI, "requestRender">) => FakeFooter) => {
            log.push(`setFooter#${++installs}`);
            const tui = { requestRender: () => void (repaints += 1) };
            footers.push(factory(tui));
          },
        },
      };
      current = { ctx };

      const handler = handlers.get("session_start");
      assert.ok(handler, "no session_start handler registered");
      const from = subscriptions.length;
      await handler({ type: "session_start", reason: options.reason ?? "startup" }, ctx);
      session.subscriptions = subscriptions.slice(from);
      return session;
    },
    dispatch(event) {
      const handler = handlers.get(event.type);
      assert.ok(handler, `no handler registered for ${event.type}`);
      handler(event, current?.ctx);
    },
  };
}

/** The framing the host wraps around each child it composes: a style reset and a hyperlink reset. */
const FRAME = "\x1b[0m\x1b]8;;\x07";

/** A line with the host's framing removed, for assertions about what a reader sees. */
function visible(line: string): string {
  return line.replaceAll(FRAME, "");
}

test("registers exactly one command", () => {
  assert.deepEqual([...harness().commands.keys()], ["jefferson"]);
});

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

function writeAgentDocument(agentDir: string, document: unknown): void {
  writeFileSync(join(agentDir, "pi-jefferson.json"), JSON.stringify(document));
}

function writeProjectDocument(cwd: string, document: unknown): void {
  const dir = join(cwd, CONFIG_DIR_NAME);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "pi-jefferson.json"), JSON.stringify(document));
}

test("the jefferson command reports the installed footer and how many rows it renders", async (t) => {
  const agentDir = useTempAgentDir(t);

  const notifiedBy = async (document: unknown): Promise<string[]> => {
    writeAgentDocument(agentDir, document);
    const h = harness();
    await h.start();
    const def = h.commands.get("jefferson");
    assert.ok(def, "no jefferson command registered");

    const notified: string[] = [];
    await def.handler("", { ui: { notify: (message) => void notified.push(message) } });
    return notified;
  };

  assert.deepEqual(await notifiedBy({}), [
    "pi-jefferson — the statusline footer is installed, 1 row.",
  ]);
  assert.deepEqual(await notifiedBy({ rows: [{}, {}, {}] }), [
    "pi-jefferson — the statusline footer is installed, 3 rows.",
  ]);

  // The message must not print it: `VERSION` is `0.0.0-alpha` while `package.json` says `0.1.1`.
  assert.equal(VERSION, "0.0.0-alpha");
});

test("outside TUI mode the jefferson command reports that no footer is installed", async (t) => {
  useTempAgentDir(t);
  const h = harness();
  await h.start({ mode: "print" });
  const def = h.commands.get("jefferson");
  assert.ok(def, "no jefferson command registered");

  // Print and RPC modes have no footer install, so the command is the only account of it.
  const notified: string[] = [];
  await def.handler("", { ui: { notify: (message) => void notified.push(message) } });
  assert.deepEqual(notified, ["pi-jefferson — no statusline footer is installed."]);
});

test("the session_start handler installs the footer in TUI mode", async (t) => {
  useTempAgentDir(t);
  const session = await harness().start();
  assert.equal(session.footers.length, 1);
  assert.deepEqual(session.notified, []);
});

test("the session_start handler does not install a footer outside TUI mode", async (t) => {
  useTempAgentDir(t);
  const session = await harness().start({ mode: "print" });
  assert.equal(session.footers.length, 0);
});

test("the footer is re-installed on every session_start", async (t) => {
  useTempAgentDir(t);
  const h = harness();
  const first = await h.start({ reason: "startup" });
  const second = await h.start({ reason: "reload" });
  assert.equal(first.footers.length, 1);
  assert.equal(second.footers.length, 1);
});

test("a trusted project's document wins end to end", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, {});
  const cwd = mkdtempSync(join(tmpdir(), "jefferson-cwd-"));
  writeProjectDocument(cwd, { rows: [{}, {}] });

  const session = await harness().start({ cwd, trusted: true });
  assert.equal(session.footers.length, 1);
  assert.equal(session.lines(80).length, 2, "the project's two rows render");
});

test("a rejected configuration warns and still installs the default row", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { cells: [{ instrument: "blank" }], rows: [{}] });

  const session = await harness().start();
  assert.equal(session.notified.length, 1);
  assert.equal(session.notified[0]?.type, "warning");
  const lines = session.lines(80);
  assert.equal(lines.length, 1, "the default row renders");
  // One row of 10 cells at 80 columns: 8 columns each of the truncated placeholder.
  // Ten 8-column cells of the placeholder; the host's framing between cells is covered by
  // tests/row-renderer.test.ts, so this asserts what a reader sees.
  const cellText = truncateToWidth(DEFAULT_CELL_TEXT, 8).replace(/\x1b\[[0-9;]*m/g, "");
  assert.equal(visible(lines[0] ?? "").replace(/\x1b\[[0-9;]*m/g, ""), cellText.repeat(10));
  assert.equal(visibleWidth(lines[0] ?? ""), 80);
});

test("a right-aligned cell ends at its cell's right edge end to end", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { cells: [{ instrument: "model" }, { instrument: "thinking", align: "right" }] });

  const session = await harness().start({
    model: { provider: "anthropic", id: "claude-opus-4" },
    thinkingLevel: "high",
  });

  const line = session.lines(80)[0] ?? "";
  assert.equal(visibleWidth(line), 80);
  // Two frames of ten characters precede the text in the raw line, so the index is taken on what
  // a reader sees: 66 in visible(line), never the framing-shifted 86 of the raw line.
  assert.equal(visible(line).indexOf("thinking: high"), 66);
});

test("the exported surface offers no way to supply or replace cell content", async () => {
  const entry = await import("../extensions/jefferson.ts");
  assert.deepEqual(Object.keys(entry).sort(), ["VERSION", "default"]);

  const renderer = await import("../extensions/jefferson/row-renderer.ts");
  assert.deepEqual(Object.keys(renderer).sort(), ["createFooter"]);

  const configuration = await import("../extensions/jefferson/configuration.ts");
  assert.deepEqual(
    Object.keys(configuration).sort(),
    ["DEFAULT_CELLS", "MAX_CELLS", "readConfiguration"],
  );

  const instrument = await import("../extensions/jefferson/instrument.ts");
  const store = await import("../extensions/jefferson/session-data-store.ts");
  for (const key of [...Object.keys(instrument), ...Object.keys(store)]) {
    assert.ok(
      !/register|supply|contribute/i.test(key),
      `${key} looks like a contribution interface`,
    );
  }

  // `instrumentNamed` is a lookup, not a registration path: an unimplemented name stays
  // unimplemented, and asking for it changes neither file's exported surface.
  const surface = [Object.keys(instrument).sort(), Object.keys(store).sort()];
  assert.equal(instrument.instrumentNamed("nope"), undefined);
  assert.equal(instrument.instrumentNamed("nope"), undefined);
  assert.deepEqual([Object.keys(instrument).sort(), Object.keys(store).sort()], surface);
});

test("an untrusted project's document is ignored end to end", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, {});
  const cwd = mkdtempSync(join(tmpdir(), "jefferson-cwd-"));
  writeProjectDocument(cwd, { rows: [{}, {}] });

  const session = await harness().start({ cwd, trusted: false });
  assert.equal(session.footers.length, 1);
  assert.equal(session.lines(80).length, 1, "the agent document's one row renders");
});

for (const reason of ["startup", "new", "resume", "fork", "reload"]) {
  test(`a ${reason} session renders the model and thinking level it was seeded with`, async (t) => {
    const agentDir = useTempAgentDir(t);
    writeAgentDocument(agentDir, { cells: [{ instrument: "model" }, { instrument: "thinking" }] });

    // The host reports no selection when it restores, so nothing here is dispatched.
    const session = await harness().start({
      reason,
      model: { provider: "anthropic", id: "claude-opus-4" },
      thinkingLevel: "high",
    });

    const [line] = session.lines(80);
    assert.ok(visible(line ?? "").startsWith("anthropic: claude-opus-4"), "the model cell renders the seed");
    assert.ok(visible(line ?? "").includes("thinking: high"), "the thinking cell renders the seed");
    assert.deepEqual(session.notified, []);
  });
}

test("in TUI mode a session takes exactly the two selection subscriptions", async (t) => {
  useTempAgentDir(t);
  const session = await harness().start();
  assert.deepEqual(
    session.subscriptions.map((subscription) => subscription.event),
    ["model_select", "thinking_level_select"],
    "the two pushed datums, and no branch subscription for the deferred one",
  );
});

test("outside TUI mode a session takes no subscription", async (t) => {
  useTempAgentDir(t);
  const session = await harness().start({ mode: "print" });
  assert.deepEqual(session.subscriptions, []);
});

test("a model selection push changes the line and requests one repaint", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { cells: [{ instrument: "model" }, { instrument: "thinking" }] });
  const h = harness();
  const session = await h.start({
    model: { provider: "anthropic", id: "claude-opus-4" },
    thinkingLevel: "high",
  });

  h.dispatch({ type: "model_select", model: { provider: "openai", id: "gpt-5" } });

  assert.ok(visible(session.lines(80)[0] ?? "").startsWith("openai: gpt-5"));
  assert.equal(session.repaints(), 1);
});

test("a thinking-level push changes the line and requests one repaint", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { cells: [{ instrument: "model" }, { instrument: "thinking" }] });
  const h = harness();
  const session = await h.start({
    model: { provider: "anthropic", id: "claude-opus-4" },
    thinkingLevel: "high",
  });

  h.dispatch({ type: "thinking_level_select", level: "low" });

  assert.ok(visible(session.lines(80)[0] ?? "").includes("thinking: low"));
  assert.equal(session.repaints(), 1);
});

test("a push carrying the values the store already holds requests no repaint", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { cells: [{ instrument: "model" }, { instrument: "thinking" }] });
  const h = harness();
  const session = await h.start({
    model: { provider: "anthropic", id: "claude-opus-4" },
    thinkingLevel: "high",
  });

  h.dispatch({ type: "model_select", model: { provider: "anthropic", id: "claude-opus-4" } });
  h.dispatch({ type: "thinking_level_select", level: "high" });

  assert.equal(session.repaints(), 0);
  assert.ok(visible(session.lines(80)[0] ?? "").startsWith("anthropic: claude-opus-4"));
});

test("a second session_start releases the first install before installing its own", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { cells: [{ instrument: "model" }, { instrument: "thinking" }] });
  const h = harness();

  const first = await h.start({
    reason: "startup",
    model: { provider: "anthropic", id: "claude-opus-4" },
    thinkingLevel: "high",
  });
  const second = await h.start({
    reason: "new",
    model: { provider: "openai", id: "gpt-5" },
    thinkingLevel: "low",
  });

  assert.deepEqual(
    first.subscriptions.map((subscription) => subscription.calls),
    [1, 1],
    "each of the first install's two unsubscribes fired exactly once",
  );
  assert.deepEqual(h.log, [
    "setFooter#1",
    "unsubscribe:model_select",
    "unsubscribe:thinking_level_select",
    "setFooter#2",
  ]);

  const [line] = second.lines(80);
  assert.ok(visible(line ?? "").startsWith("openai: gpt-5"), "the second footer renders the second context");
  assert.ok(visible(line ?? "").includes("thinking: low"), "never the first install's values");

  h.dispatch({ type: "model_select", model: { provider: "google", id: "gemini-3" } });
  assert.equal(second.repaints(), 1, "the repaint lands on the second tui");
  assert.equal(first.repaints(), 0, "and never on the first");
});

test("disposing a footer then replacing the session releases the first install once", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { cells: [{ instrument: "model" }, { instrument: "thinking" }] });
  const h = harness();

  const first = await h.start({
    reason: "startup",
    model: { provider: "anthropic", id: "claude-opus-4" },
    thinkingLevel: "high",
  });
  first.footers[0]?.dispose?.();

  h.dispatch({ type: "model_select", model: { provider: "openai", id: "gpt-5" } });
  assert.equal(first.repaints(), 0, "a disposed footer requests no repaint");

  const second = await h.start({
    reason: "new",
    model: { provider: "google", id: "gemini-3" },
    thinkingLevel: "low",
  });

  assert.deepEqual(
    first.subscriptions.map((subscription) => subscription.calls),
    [1, 1],
    "each unsubscribe fired exactly once in total, across both callers",
  );
  assert.deepEqual(h.log, [
    "setFooter#1",
    "unsubscribe:model_select",
    "unsubscribe:thinking_level_select",
    "setFooter#2",
  ]);

  h.dispatch({ type: "model_select", model: { provider: "openai", id: "gpt-5.1" } });
  assert.equal(first.repaints(), 0, "the first tui is never asked again");
  assert.equal(second.repaints(), 1);

  assert.equal(
    visible(first.footers[0]?.render(80)[0] ?? ""),
    " ".repeat(80),
    "the disposed footer resolves empty cells rather than the old values",
  );
});
