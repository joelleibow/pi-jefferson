import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { CONFIG_DIR_NAME, type ContextUsage, type SessionEntry, type Theme } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { TUI } from "@earendil-works/pi-tui";

import { DEFAULT_CELL_TEXT } from "../extensions/jefferson/components/instruments/instrument.ts";
import jefferson, { VERSION } from "../extensions/jefferson.ts";
import { fakeTheme } from "./fake-theme.ts";

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
  host: { contextUsage: ContextUsage | undefined; sessionId: string; leafId: string | null; entries: SessionEntry[] };
  reads: { usage: number; sessionId: number; leafId: number; entries: number };
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
  contextUsage?: ContextUsage;
  entries?: SessionEntry[];
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
        host: { contextUsage: options.contextUsage, sessionId: cwd, leafId: options.entries?.length ? "seeded" : null, entries: options.entries ?? [] },
        reads: { usage: 0, sessionId: 0, leafId: 0, entries: 0 },
        lines(width: number) {
          return footers.at(-1)?.render(width) ?? [];
        },
      };
      const ctx = {
        mode: options.mode ?? "tui",
        cwd,
        model: options.model,
        thinkingLevel: options.thinkingLevel,
        getContextUsage: () => { session.reads.usage++; return session.host.contextUsage; },
        sessionManager: {
          getSessionId: () => { session.reads.sessionId++; return session.host.sessionId; },
          getLeafId: () => { session.reads.leafId++; return session.host.leafId; },
          getEntries: () => { session.reads.entries++; return session.host.entries; },
        },
        isProjectTrusted: () => options.trusted ?? false,
        ui: {
          theme: fakeTheme(),
          notify: (message: string, type?: string) => void notified.push({ message, type }),
          // `Pick<TUI, "requestRender">` rather than a local shape: a rename or removal of
          // `requestRender` in the host then fails `pnpm typecheck` instead of the fake quietly
          // drifting from the host it stands in for.
          setFooter: (factory: (tui: Pick<TUI, "requestRender">, theme: Theme) => FakeFooter) => {
            log.push(`setFooter#${++installs}`);
            const tui = { requestRender: () => void (repaints += 1) };
            footers.push(factory(tui, fakeTheme()));
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
  // No document at all: the default row, one row of one line and nothing above it.
  useTempAgentDir(t);
  const session = await harness().start();
  assert.equal(session.footers.length, 1);
  assert.deepEqual(session.notified, []);
  const lines = session.lines(80);
  assert.equal(lines.length, 1, "the default row renders as one line");
  assert.equal(visibleWidth(lines[0] ?? ""), 80);
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
  const lines = session.lines(80);
  assert.equal(lines.length, 3, "the project's two rows render, with an empty line between them");
  assert.equal(lines[1], "", "the gap line is a bare empty line");
});

test("a rowGap read from the document reaches the footer startUp installs", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { rows: [{}, {}], rowGap: 2 });

  const session = await harness().start();
  const lines = session.lines(80);
  assert.equal(lines.length, 4, "two rows and two empty lines between them");
  assert.deepEqual([lines[1], lines[2]], ["", ""], "the gap lines are bare empty lines");
  assert.equal(visibleWidth(lines[0] ?? ""), 80);
  assert.equal(visibleWidth(lines[3] ?? ""), 80);
});

test("a rejected configuration warns and still installs the default row", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { cells: [{ instrument: "blank" }], rows: [{}] });

  const session = await harness().start();
  assert.equal(session.notified.length, 1);
  assert.equal(session.notified[0]?.type, "warning");
  const lines = session.lines(80);
  assert.equal(lines.length, 1, "the default row renders as one line");
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
  // Two frames of ten characters precede the text in the raw line, so the index is taken on
  // stripTerminalSequences(line): 66 in the stripped text, never the framing-shifted 86 raw.
  assert.equal(stripTerminalSequences(line).indexOf("Thinking: High"), 66);
});

test("the exported surface offers no way to supply or replace cell content", async () => {
  const entry = await import("../extensions/jefferson.ts");
  assert.deepEqual(Object.keys(entry).sort(), ["VERSION", "default"]);

  const renderer = await import("../extensions/jefferson/components/row/row-renderer.ts");
  assert.deepEqual(Object.keys(renderer).sort(), ["createFooter"]);

  const configuration = await import("../extensions/jefferson/configuration.ts");
  assert.deepEqual(
    Object.keys(configuration).sort(),
    ["DEFAULT_CELLS", "MAX_CELLS", "configurationPaths", "readConfiguration"],
  );

  const row = await import("../extensions/jefferson/components/row/row.ts");
  assert.deepEqual(Object.keys(row).sort(), ["ALIGNMENTS", "DISTRIBUTIONS"]);

  const widthPlan = await import("../extensions/jefferson/components/row/width-plan.ts");
  assert.deepEqual(Object.keys(widthPlan).sort(), ["planRow"]);

  const binding = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  assert.deepEqual(Object.keys(binding).sort(), ["instrumentBindings"]);

  const feed = await import("../extensions/jefferson/data/session-data-feed.ts");
  assert.deepEqual(Object.keys(feed).sort(), ["feedSessionData"]);

  const footerSetup = await import("../extensions/jefferson/footer-setup.ts");
  assert.deepEqual(Object.keys(footerSetup).sort(), ["installFooter"]);

  const startup = await import("../extensions/jefferson/startup.ts");
  assert.deepEqual(Object.keys(startup).sort(), ["startUp"]);

  const contract = await import("../extensions/jefferson/components/instruments/instrument.ts");
  assert.deepEqual(Object.keys(contract).sort(), ["DEFAULT_CELL_TEXT", "FOUNDATIONAL_OPTIONS"]);

  const compactCounts = await import("../extensions/jefferson/components/instruments/compact-count.ts");
  assert.deepEqual(Object.keys(compactCounts).sort(), ["compactCount"]);

  const blank = await import("../extensions/jefferson/components/instruments/blank.ts");
  assert.deepEqual(Object.keys(blank).sort(), ["blank"]);

  const model = await import("../extensions/jefferson/components/instruments/model.ts");
  assert.deepEqual(Object.keys(model).sort(), ["model"]);

  const thinking = await import("../extensions/jefferson/components/instruments/thinking.ts");
  assert.deepEqual(Object.keys(thinking).sort(), ["thinking"]);

  const path = await import("../extensions/jefferson/components/instruments/path.ts");
  assert.deepEqual(Object.keys(path).sort(), ["path"]);

  const context = await import("../extensions/jefferson/components/instruments/context.ts");
  assert.deepEqual(Object.keys(context).sort(), ["context"]);

  const tokens = await import("../extensions/jefferson/components/instruments/tokens.ts");
  assert.deepEqual(Object.keys(tokens).sort(), ["tokens"]);

  const cost = await import("../extensions/jefferson/components/instruments/cost.ts");
  assert.deepEqual(Object.keys(cost).sort(), ["cost"]);

  const shipped = await import("../extensions/jefferson/shipped.ts");
  assert.deepEqual(Object.keys(shipped).sort(), ["instrumentNamed"]);

  const bar = await import("../extensions/jefferson/components/visuals/bar.ts");
  assert.deepEqual(Object.keys(bar).sort(), ["drawBar"]);

  const store = await import("../extensions/jefferson/data/session-data-store.ts");
  const format = await import("../extensions/jefferson/format.ts");
  const scanned = [
    contract, compactCounts, blank, model, thinking, path, context, tokens, cost, shipped, bar,
    store, format, row, binding, feed, footerSetup, startup,
  ];
  for (const exports of scanned) {
    for (const key of Object.keys(exports)) {
      assert.ok(
        !/register|supply|contribute/i.test(key),
        `${key} looks like a contribution interface`,
      );
    }
  }

  // `instrumentNamed` is a lookup, not a registration path: an unimplemented name stays
  // unimplemented, and asking for it changes neither file's exported surface.
  const surface = [Object.keys(shipped).sort(), Object.keys(store).sort()];
  assert.equal(shipped.instrumentNamed("nope"), undefined);
  assert.equal(shipped.instrumentNamed("nope"), undefined);
  assert.deepEqual([Object.keys(shipped).sort(), Object.keys(store).sort()], surface);
});

test("an untrusted project's document is ignored end to end", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, {});
  const cwd = mkdtempSync(join(tmpdir(), "jefferson-cwd-"));
  writeProjectDocument(cwd, { rows: [{}, {}] });

  const session = await harness().start({ cwd, trusted: false });
  assert.equal(session.footers.length, 1);
  assert.equal(session.lines(80).length, 1, "the agent document's one row renders as one line");
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
    assert.ok(visible(line ?? "").startsWith("Model: anthropic/claude-opus-4"), "the model cell renders the seed");
    assert.ok(stripTerminalSequences(line ?? "").includes("Thinking: High"), "the thinking cell renders the seed");
    assert.deepEqual(session.notified, []);
  });
}

test("in TUI mode a session takes exactly the three subscriptions it names", async (t) => {
  useTempAgentDir(t);
  const session = await harness().start();
  assert.deepEqual(
    session.subscriptions.map((subscription) => subscription.event),
    ["model_select", "thinking_level_select", "turn_end"],
    "the two selections and the named turn boundary, with no other subscription",
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

  assert.ok(visible(session.lines(80)[0] ?? "").startsWith("Model: openai/gpt-5"));
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

  assert.ok(stripTerminalSequences(session.lines(80)[0] ?? "").includes("Thinking: Low"));
  assert.equal(session.repaints(), 1);
});

test("the thinking cell follows the host through the label path", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { cells: [{ instrument: "thinking" }] });
  const h = harness();
  const session = await h.start({ reason: "startup", thinkingLevel: "high" });
  assert.ok(stripTerminalSequences(session.lines(80)[0] ?? "").includes("Thinking: High"));
  h.dispatch({ type: "thinking_level_select", level: "low" });
  assert.ok(stripTerminalSequences(session.lines(80)[0] ?? "").includes("Thinking: Low"));
  assert.equal(session.repaints(), 1);
  h.dispatch({ type: "thinking_level_select", level: "low" });
  assert.equal(session.repaints(), 1, "a repeated level requests no extra repaint");

  const restored = await harness().start({ reason: "resume", thinkingLevel: "xhigh" });
  assert.ok(stripTerminalSequences(restored.lines(80)[0] ?? "").includes("Thinking: Xhigh"), "a restored session shows the level it was seeded with");
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
  assert.ok(visible(session.lines(80)[0] ?? "").startsWith("Model: anthropic/claude-opus-4"));
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
    [1, 1, 1],
    "each of the first install's three unsubscribes fired exactly once",
  );
  assert.deepEqual(h.log, [
    "setFooter#1",
    "unsubscribe:model_select",
    "unsubscribe:thinking_level_select",
    "unsubscribe:turn_end",
    "setFooter#2",
  ]);

  const [line] = second.lines(80);
  assert.ok(visible(line ?? "").startsWith("Model: openai/gpt-5"), "the second footer renders the second context");
  assert.ok(stripTerminalSequences(line ?? "").includes("Thinking: Low"), "never the first install's values");

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
    [1, 1, 1],
    "each unsubscribe fired exactly once in total, across both callers",
  );
  assert.deepEqual(h.log, [
    "setFooter#1",
    "unsubscribe:model_select",
    "unsubscribe:thinking_level_select",
    "unsubscribe:turn_end",
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

test("configured formats, styles and a width-taking bar render end to end", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, {
    instruments: { model: { label: "", format: "🧠: $model from $provider", style: { fg: "accent" } }, context: { label: "", format: "$percent $bar", style: { fg: "accent" } } },
    cells: [{ instrument: "model" }, { instrument: "context" }],
  });
  const session = await harness().start({ model: { provider: "anthropic", id: "claude-opus-4" }, contextUsage: { tokens: 86400, percent: 43.2, contextWindow: 200000 } });
  const line = session.lines(80)[0] ?? "";
  // The rule's arithmetic, not the output: the model cell takes its text's columns, the `$bar`
  // cell takes the rest of the row, and the bar splits its cell's columns by the percent.
  const model = "🧠: claude-opus-4 from anthropic";
  const bar = 80 - visibleWidth(model) - visibleWidth("43.2% ");
  const filled = Math.floor((43.2 / 100) * bar);
  assert.equal(stripTerminalSequences(line), model + "43.2% " + "█".repeat(filled) + "░".repeat(bar - filled));
  assert.equal(visibleWidth(line), 80);
  assert.ok(line.includes(fakeTheme().getFgAnsi("accent")));
  assert.deepEqual(session.notified, []);
});

test("configured formats, styles and a width-taking bar render end to end under equal distribution", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, {
    instruments: { model: { label: "", format: "🧠: $model from $provider", style: { fg: "accent" } }, context: { label: "", format: "$percent $bar", style: { fg: "accent" } } },
    distribution: "equal",
    cells: [{ instrument: "model" }, { instrument: "context" }],
  });
  const session = await harness().start({ model: { provider: "anthropic", id: "claude-opus-4" }, contextUsage: { tokens: 86400, percent: 43.2, contextWindow: 200000 } });
  const line = session.lines(80)[0] ?? "";
  assert.equal(stripTerminalSequences(line), "🧠: claude-opus-4 from anthropic".padEnd(40) + "43.2% " + "█".repeat(14) + "░".repeat(20));
  assert.equal(visibleWidth(line), 80);
  assert.ok(line.includes(fakeTheme().getFgAnsi("accent")));
  assert.deepEqual(session.notified, []);
});

test("a rejected style warns with its exact envelope and installs the default footer", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { instruments: { model: { style: { fg: "nope" } } }, cells: [{ instrument: "model" }] });
  const session = await harness().start({ model: { provider: "anthropic", id: "claude-opus-4" } });
  assert.deepEqual(session.notified, [{ message: `pi-jefferson: ${join(agentDir, "pi-jefferson.json")} was rejected (instrument "model" has an fg that is neither a foreground-slot theme token nor a color pi's parser accepts: "nope"); rendering the default row`, type: "warning" }]);
  const lines = session.lines(80);
  assert.equal(lines.length, 1, "the default row renders as one line");
  assert.equal(stripTerminalSequences(lines[0] ?? ""), stripTerminalSequences(truncateToWidth(DEFAULT_CELL_TEXT, 8)).repeat(10));
});

test("a turn boundary after disposal repaints nothing and calls no captured reader", async (t) => {
  useTempAgentDir(t);
  const h = harness();
  const session = await h.start();
  session.footers[0]?.dispose?.();
  const before = { ...session.reads };
  h.dispatch({ type: "turn_end" });
  assert.equal(session.repaints(), 0);
  assert.deepEqual(session.reads, before);
});

function usageEntry(input: number, cost: number): SessionEntry {
  return { type: "usage", usage: { input, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 999, cost: { total: cost } } } as SessionEntry;
}

test("a dispatched turn boundary repaints only changed totals and its scan is reused by the footer", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { distribution: "equal", cells: [{ instrument: "tokens" }, { instrument: "cost" }] });
  const h = harness();
  const session = await h.start();
  assert.equal(stripTerminalSequences(session.lines(80)[0] ?? ""), "Tokens: 0".padEnd(40) + "Cost: $0.000".padEnd(40));
  session.host.entries.push(usageEntry(212, 0.125));
  session.host.leafId = "turn-1";
  h.dispatch({ type: "turn_end" });
  assert.equal(session.repaints(), 1);
  assert.equal(stripTerminalSequences(session.lines(80)[0] ?? ""), "Tokens: 212".padEnd(40) + "Cost: $0.125".padEnd(40));
  assert.equal(session.reads.entries, 2, "the render reuses the boundary's scan");
  session.host.entries.push(usageEntry(0, 0));
  session.host.leafId = "turn-2";
  h.dispatch({ type: "turn_end" });
  h.dispatch({ type: "turn_end" });
  assert.equal(session.repaints(), 1, "unchanged totals never repaint, including at a moved leaf");
  assert.equal(session.reads.entries, 3);
});

test("an unchanged turn boundary before the first render leaves the install-time cache filled without repainting", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { distribution: "equal", cells: [{ instrument: "tokens" }] });
  const h = harness();
  const session = await h.start();
  h.dispatch({ type: "turn_end" });
  assert.equal(session.repaints(), 0);
  assert.equal(session.reads.entries, 1, "createFooter's initial sample filled the cache");
  assert.equal(stripTerminalSequences(session.lines(80)[0] ?? ""), "Tokens: 0".padEnd(80));
  assert.equal(session.reads.entries, 1);
});

for (const reason of ["new", "resume", "fork", "reload"]) {
  test(`a ${reason} replacement drops the old cwd, model, totals and captured readers`, async (t) => {
    const agentDir = useTempAgentDir(t);
    writeAgentDocument(agentDir, {
      instruments: {
        path: { label: "" }, model: { label: "", format: "$model" },
        tokens: { label: "" }, cost: { label: "" }, thinking: { format: "$level", label: "" },
      },
      distribution: "equal",
      cells: Array.from({ length: 10 }, (_, index) => ({ instrument: ["path", "model", "tokens", "cost", "thinking"][index % 5] })),
    });
    const root = mkdtempSync(join(tmpdir(), "jefferson-replacement-"));
    const oldCwd = join(root, "old"), newCwd = join(root, "new");
    mkdirSync(oldCwd); mkdirSync(newCwd);
    const h = harness();
    const first = await h.start({ cwd: oldCwd, model: { provider: "old-provider", id: "old-id" }, thinkingLevel: "high", entries: [usageEntry(17, 0.125)] });
    assert.equal(stripTerminalSequences(first.lines(80)[0] ?? ""), ["old", "old-id", "17", "$0.125", "high"].map(text => text.padEnd(8)).join("").repeat(2));
    const oldReads = { ...first.reads };
    const second = await h.start({ reason, cwd: newCwd, model: { provider: "new-provider", id: "new-id" }, thinkingLevel: "low", entries: [usageEntry(212, 0.25)] });
    assert.equal(stripTerminalSequences(second.lines(80)[0] ?? ""), ["new", "new-id", "212", "$0.250", "low"].map(text => text.padEnd(8)).join("").repeat(2));
    assert.equal(stripTerminalSequences(first.footers[0]?.render(80)[0] ?? ""), " ".repeat(80));
    assert.deepEqual(first.reads, oldReads, "nothing reads the old context again after release");
    assert.equal(second.reads.entries, 1, "the new install owns a new scan");
  });
}

test("a session without context usage renders its context cell empty", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { cells: [{ instrument: "context" }] });
  const session = await harness().start();
  assert.equal(stripTerminalSequences(session.lines(80)[0] ?? ""), " ".repeat(80));
  assert.deepEqual(session.notified, []);
});

test("Joel's top row puts the working directory at the left and two instruments together at the right", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, {
    instruments: {
      path: { label: "📁" },
      model: { label: "🧠", format: "$model via $provider" },
      thinking: { label: "🤔" },
    },
    cells: [
      { instrument: "path" },
      { instrument: "model", align: "right" },
      { instrument: "thinking", align: "right" },
    ],
  });
  const root = mkdtempSync(join(tmpdir(), "jefferson-top-row-"));
  const cwd = join(root, "pi-jefferson");
  mkdirSync(cwd);
  const session = await harness().start({
    cwd,
    model: { provider: "Anthropic", id: "claude-opus-5-5" },
    thinkingLevel: "max",
  });

  // The three texts, by their columns: a label is its glyph, its one gap and its content.
  const pathText = "📁 pi-jefferson";
  const modelText = "🧠 claude-opus-5-5 via Anthropic";
  const thinkingText = "🤔 Max";
  assert.deepEqual([pathText, modelText, thinkingText].map(visibleWidth), [15, 32, 6]);

  // C = 53 and one joint: the path cell absorbs every column but the joint and the two texts.
  for (const [width, slack] of [[100, 46], [132, 78], [80, 26]] as const) {
    const line = session.lines(width)[0] ?? "";
    const text = stripTerminalSequences(line);
    assert.equal(visibleWidth(line), width, `one line of ${width} columns`);
    assert.equal(text, pathText + " ".repeat(slack) + modelText + " " + thinkingText, `at ${width}`);
    assert.ok(text.endsWith(thinkingText), "the thinking text ends at the row's last column");
    assert.equal(text.indexOf(modelText), 15 + slack, "the model text starts where the slack ends");
  }

  // At the margin: path abuts model with no room between them, and the joint still holds.
  assert.equal(
    stripTerminalSequences(session.lines(54)[0] ?? ""),
    pathText + modelText + " " + thinkingText,
    "the path text abuts the model text, and the joint before thinking stays",
  );
  assert.equal(
    stripTerminalSequences(session.lines(53)[0] ?? ""),
    pathText + modelText + thinkingText,
    "one column less and every joint is gone",
  );
});

test("Joel's second row keeps its thirds, with a real bar", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, {
    instruments: { context: { label: "", format: "$percent $bar" } },
    cells: [{ instrument: "blank" }, { instrument: "blank" }, { instrument: "context", align: "right" }],
  });
  const session = await harness().start({ contextUsage: { tokens: 86400, percent: 43.2, contextWindow: 200000 } });

  // Three fill cells at 100: 34, 33 and 33, the first taking the remainder. The bar of the third
  // is its own cell's columns less the rest of its format, split by the percent.
  const third = 33;
  const track = third - visibleWidth("43.2% ");
  const filled = Math.floor((43.2 / 100) * track);
  const clipped = (width: number): string => stripTerminalSequences(truncateToWidth(DEFAULT_CELL_TEXT, width));
  const line = session.lines(100)[0] ?? "";
  assert.equal(visibleWidth(line), 100);
  assert.equal(
    stripTerminalSequences(line),
    clipped(34) + clipped(33) + "43.2% " + "█".repeat(filled) + "░".repeat(track - filled),
  );
});

test("a bar takes only what its own cell leaves, and draws nothing with no room", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, {
    instruments: { path: { label: "" }, context: { label: "", format: "$percent $bar" } },
    cells: [{ instrument: "path" }, { instrument: "context" }],
  });
  const root = mkdtempSync(join(tmpdir(), "jefferson-bar-"));
  const cwd = join(root, "pi-jefferson");
  mkdirSync(cwd);
  const session = await harness().start({ cwd, contextUsage: { tokens: 86400, percent: 43.2, contextWindow: 200000 } });

  // The path cell takes its text's twelve columns; the bar's cell takes the other 68, and the bar
  // itself the 62 the rest of its format leaves.
  const track = 80 - visibleWidth("pi-jefferson") - visibleWidth("43.2% ");
  const filled = Math.floor((43.2 / 100) * track);
  const line = session.lines(80)[0] ?? "";
  assert.equal(visibleWidth(line), 80);
  assert.equal(stripTerminalSequences(line), "pi-jefferson" + "43.2% " + "█".repeat(filled) + "░".repeat(track - filled));

  // A path text wider than the row leaves the bar's cell nothing, and the bar draws nothing.
  const wide = join(root, "p".repeat(100));
  mkdirSync(wide);
  const squeezed = await harness().start({ cwd: wide, contextUsage: { tokens: 86400, percent: 43.2, contextWindow: 200000 } });
  const squeezedLine = squeezed.lines(80)[0] ?? "";
  assert.equal(visibleWidth(squeezedLine), 80, "one line of the row's width");
  assert.ok(!stripTerminalSequences(squeezedLine).includes("█"), "no filled block");
  assert.ok(!stripTerminalSequences(squeezedLine).includes("░"), "no empty track");
});

test("the default row of ten blank cells is unchanged", async (t) => {
  useTempAgentDir(t);
  const session = await harness().start();
  // At 80 the existing assertion in "a rejected configuration warns and still installs the default
  // row" holds; here the width with a remainder of two.
  const line = session.lines(132)[0] ?? "";
  assert.equal(visibleWidth(line), 132);
  const clipped = (width: number): string => stripTerminalSequences(truncateToWidth(DEFAULT_CELL_TEXT, width));
  assert.equal(
    stripTerminalSequences(line),
    clipped(14).repeat(2) + clipped(13).repeat(8),
    "two cells of 14 columns and eight of 13",
  );
});

test("distribution equal restores equal shares end to end", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, {
    distribution: "equal",
    cells: [{ instrument: "blank" }, { instrument: "blank" }, { instrument: "thinking", align: "right" }],
  });
  const session = await harness().start({ thinkingLevel: "max" });
  const clipped = (width: number): string => stripTerminalSequences(truncateToWidth(DEFAULT_CELL_TEXT, width));
  const three = session.lines(100)[0] ?? "";
  assert.equal(visibleWidth(three), 100);
  assert.equal(
    stripTerminalSequences(three),
    clipped(34) + clipped(33) + "Thinking: Max".padStart(33),
    "34, 33 and 33, whatever the content",
  );

  writeAgentDocument(agentDir, { distribution: "equal", cells: Array.from({ length: 10 }, () => ({ instrument: "thinking", align: "right" })) });
  const ten = await harness().start({ thinkingLevel: "max" });
  const line = ten.lines(132)[0] ?? "";
  assert.equal(visibleWidth(line), 132);
  const cells = line.split(FRAME).slice(1, -1);
  assert.equal(cells.length, 10, "ten cells");
  assert.equal(visibleWidth(cells.at(-1) ?? ""), 13, "the last cell occupies 13 columns");
  assert.ok(stripTerminalSequences(line).endsWith("Thinking: Max"), "a right-aligned last cell's text ends at the window's edge");
});
