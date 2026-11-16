/**
 * One fake `pi`, its real event bus, and the sessions the extension was started with. Shared by
 * every test file that drives the extension end to end, so no test file imports another's helpers
 * and no test runs twice. It is not a `*.test.ts`, as `tests/fake-theme.ts` is not, so `node --test`
 * never runs it.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  CONFIG_DIR_NAME, createEventBus, type ContextUsage, type EventBus, type ReadonlyFooterDataProvider,
  type SessionEntry, type Theme,
} from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";

import { DEFAULT_CELLS } from "../extensions/jefferson/configuration.ts";
import jefferson from "../extensions/jefferson.ts";
import { fakeTheme } from "./fake-theme.ts";

export interface CommandDef {
  description: string;
  handler: (args: string, ctx: { ui: { notify(message: string): void } }) => Promise<void>;
}

export type Handler = (event: unknown, ctx: unknown) => unknown;

/** One `pi.on` registration: the event it was taken for, and how often its release ran. */
export interface Subscription {
  event: string;
  calls: number;
}

/** The component the host keeps, so `render` and `dispose` are reachable from a test. */
export interface FakeFooter {
  render(width: number): string[];
  invalidate(): void;
  dispose?(): void;
}

/** One session's host-facing side: what it was told, what it installed, what it subscribed to. */
export interface FakeSession {
  notified: Array<{ message: string; type: string | undefined }>;
  footers: FakeFooter[];
  repaints: () => number;
  subscriptions: Subscription[];
  host: {
    contextUsage: ContextUsage | undefined; sessionId: string; leafId: string | null; entries: SessionEntry[];
    sessionName: string | undefined; branch: string | null; statuses: Map<string, string>;
  };
  reads: { usage: number; sessionId: number; leafId: number; entries: number };
  lines(width: number): string[];
}

export interface SessionOptions {
  reason?: string;
  mode?: string;
  cwd?: string;
  trusted?: boolean;
  /** Absent for a session the host restored with no model. */
  model?: { provider: string; id: string };
  /** Absent for a session the host has not named. */
  sessionName?: string;
  /** What the host reports as the branch; absent outside a repository. */
  branch?: string | null;
  statuses?: Array<[string, string]>;
  thinkingLevel?: string;
  contextUsage?: ContextUsage;
  entries?: SessionEntry[];
  /**
   * Runs after the `session_start` handler returns and before `resources_discover` fires, with the
   * session `start()` is building — the same object it resolves to — and the harness's bus.
   */
  afterSessionStart?(session: FakeSession, events: EventBus): void | Promise<void>;
}

export interface Harness {
  commands: Map<string, CommandDef>;
  /** The bus the extension was given as `pi.events`. */
  events: EventBus;
  /** The host-facing order as it happened: `setFooter#n`, `unsubscribe:<event>`. */
  log: string[];
  start(options?: SessionOptions): Promise<FakeSession>;
  dispatch(event: { type: string } & Record<string, unknown>): void;
}

/** A fake `pi`, the extension bound to it once, and the sessions it was started with. */
export function harness(options: { beforeFactory?(events: EventBus): void } = {}): Harness {
  const commands = new Map<string, CommandDef>();
  const handlers = new Map<string, Handler>();
  const subscriptions: Subscription[] = [];
  const log: string[] = [];
  let installs = 0;
  let current: { ctx: unknown } | undefined;

  // The real bus, never a stand-in: a registration travels the path a provider's does.
  const events = createEventBus();

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
    events,
  };
  options.beforeFactory?.(events);
  (jefferson as unknown as (pi: unknown) => void)(fakePi);

  return {
    commands,
    events,
    log,
    async start(sessionOptions: SessionOptions = {}): Promise<FakeSession> {
      const cwd = sessionOptions.cwd ?? mkdtempSync(join(tmpdir(), "jefferson-cwd-"));
      const notified: Array<{ message: string; type: string | undefined }> = [];
      const footers: FakeFooter[] = [];
      let repaints = 0;
      const session: FakeSession = {
        notified,
        footers,
        repaints: () => repaints,
        subscriptions: [],
        host: {
          contextUsage: sessionOptions.contextUsage, sessionId: cwd,
          leafId: sessionOptions.entries?.length ? "seeded" : null,
          sessionName: sessionOptions.sessionName, branch: sessionOptions.branch ?? null,
          statuses: new Map(sessionOptions.statuses ?? []),
          entries: sessionOptions.entries ?? [],
        },
        reads: { usage: 0, sessionId: 0, leafId: 0, entries: 0 },
        lines(width: number) {
          return footers.at(-1)?.render(width) ?? [];
        },
      };
      const ctx = {
        mode: sessionOptions.mode ?? "tui",
        cwd,
        model: sessionOptions.model,
        thinkingLevel: sessionOptions.thinkingLevel,
        getContextUsage: () => { session.reads.usage++; return session.host.contextUsage; },
        modelRegistry: { find: () => undefined },
        sessionManager: {
          getSessionId: () => { session.reads.sessionId++; return session.host.sessionId; },
          getLeafId: () => { session.reads.leafId++; return session.host.leafId; },
          getSessionName: () => session.host.sessionName,
          getEntries: () => { session.reads.entries++; return session.host.entries; },
          getBranch: () => session.host.entries,
        },
        isProjectTrusted: () => sessionOptions.trusted ?? false,
        ui: {
          theme: fakeTheme(),
          notify: (message: string, type?: string) => void notified.push({ message, type }),
          // `Pick<TUI, "requestRender">` rather than a local shape: a rename or removal of
          // `requestRender` in the host then fails `pnpm typecheck` instead of the fake quietly
          // drifting from the host it stands in for.
          setFooter: (
            factory: (tui: Pick<TUI, "requestRender">, theme: Theme, footerData: ReadonlyFooterDataProvider) => FakeFooter,
          ) => {
            log.push(`setFooter#${++installs}`);
            const tui = { requestRender: () => void (repaints += 1) };
            // The host's footer-only data, faked at its boundary: the branch and the statuses.
            const footerData: ReadonlyFooterDataProvider = {
              getGitBranch: () => session.host.branch,
              getExtensionStatuses: () => session.host.statuses,
              getAvailableProviderCount: () => 0,
              onBranchChange: () => () => {},
            };
            footers.push(factory(tui, fakeTheme(), footerData));
          },
        },
      };
      current = { ctx };

      const handler = handlers.get("session_start");
      assert.ok(handler, "no session_start handler registered");
      const from = subscriptions.length;
      await handler({ type: "session_start", reason: sessionOptions.reason ?? "startup" }, ctx);
      session.subscriptions = subscriptions.slice(from);
      await sessionOptions.afterSessionStart?.(session, events);
      // pi emits this after every extension's `session_start` handler on every path that starts a
      // session, but only when someone handles it: this extension's handler is what marks startup
      // complete (design 12).
      handlers.get("resources_discover")?.({ type: "resources_discover", cwd, reason: "startup" }, ctx);
      return session;
    },
    dispatch(event) {
      const handler = handlers.get(event.type);
      assert.ok(handler, `no handler registered for ${event.type}`);
      handler(event, current?.ctx);
    },
  };
}

/** Set PI_CODING_AGENT_DIR to a temp dir for one test and restore it after. */
export function useTempAgentDir(t: { after: (fn: () => void) => void }): string {
  const agentDir = mkdtempSync(join(tmpdir(), "jefferson-agent-"));
  const previous = process.env.PI_CODING_AGENT_DIR;
  process.env.PI_CODING_AGENT_DIR = agentDir;
  t.after(() => {
    if (previous === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previous;
  });
  return agentDir;
}

/** `count` placeholder rows: a row lists the entries it renders, and one `blank` entry fills it. */
export function blankRows(count: number): { instrument: string }[][] {
  return Array.from({ length: count }, () => Array.from({ length: DEFAULT_CELLS }, () => ({ instrument: "blank" })));
}

export function writeAgentDocument(agentDir: string, document: unknown): void {
  writeFileSync(join(agentDir, "pi-jefferson.json"), JSON.stringify(document));
}

export function writeProjectDocument(cwd: string, document: unknown): void {
  const dir = join(cwd, CONFIG_DIR_NAME);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "pi-jefferson.json"), JSON.stringify(document));
}
