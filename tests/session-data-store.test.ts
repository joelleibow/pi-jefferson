import assert from "node:assert/strict";
import { test } from "node:test";

import type { MessageEndEvent, SessionEntry } from "@earendil-works/pi-coding-agent";

import type { Notice } from "../extensions/jefferson/data/notice.ts";

import { createSessionDataStore } from "../extensions/jefferson/data/session-data-store.ts";
import type { Readings, SessionDataStore, Timed } from "../extensions/jefferson/data/session-data-store.ts";

const zeroTotals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };
const seed: Readings = {
  provider: "anthropic",
  model: "claude-opus-4",
  thinkingLevel: "high",
  cwd: "/Users/joelleibow/Projects/pi-jefferson",
  home: "/Users/joelleibow",
  branch: undefined,
  sessionName: undefined,
  statuses: undefined,
  contextUsage: { tokens: 86400, percent: 43.2, contextWindow: 200000 },
  totals: zeroTotals,
  // The instant the fake clock reads, so a sample taken from this seed equals it.
  sampledAt: 0,
};
const unknown: Readings = {
  provider: undefined,
  model: undefined,
  thinkingLevel: undefined,
  cwd: undefined,
  home: undefined,
  branch: undefined,
  sessionName: undefined,
  statuses: undefined,
  contextUsage: undefined,
  totals: undefined,
  sampledAt: undefined,
};

/** Counting readers fake only the host boundary, never the store. */
function newStore(readings: Readings) {
  let repaints = 0;
  const calls = { usage: 0, entries: 0 };
  const host = {
    contextUsage: readings.contextUsage,
    sessionId: "session-1",
    leafId: null as string | null,
    entries: [] as SessionEntry[],
  };
  const store: SessionDataStore = createSessionDataStore({
    seed: readings,
    requestRender: () => void repaints++,
    readUsage: () => {
      calls.usage++;
      return host;
    },
    readEntries: () => {
      calls.entries++;
      return host.entries;
    },
    readBranch: () => [],
    now: () => 0,
    schedule: () => () => {},
  });
  return { store, host, calls, repaints: () => repaints };
}

type AssistantMessage = Extract<MessageEndEvent["message"], { role: "assistant" }>;

/** An assistant message for the notice tests: 20,000 missed tokens against a 100,000-token prompt. */
function noticeMessage(options: { dropped?: number; timestamp?: number; stopReason?: AssistantMessage["stopReason"]; prompt?: number; cacheRead?: number } = {}): AssistantMessage {
  const dropped = options.dropped ?? 0;
  const prompt = options.prompt ?? 100_000;
  const cacheRead = options.cacheRead ?? 80_000;
  return {
    role: "assistant", api: "anthropic", provider: "anthropic", model: "claude-opus-4",
    content: [], stopReason: options.stopReason ?? "stop", timestamp: options.timestamp ?? 0,
    usage: { input: prompt - cacheRead, output: 0, cacheRead, cacheWrite: 0, totalTokens: 0, cost: { input: 0.1, output: 0, cacheRead: 0, cacheWrite: 0, total: 0.1 } },
    ...(dropped === 0 ? {} : {
      diagnostics: [{
        type: "anthropic_input_transformations", timestamp: 0,
        details: { transformations: Array.from({ length: dropped }, () => ({ type: "thinking_dropped" })) },
      }],
    }),
  };
}

/** The usage a compaction or a branch summary carries. */
function usageOf(input: number, cacheRead: number, cacheWrite: number, cost: number, output = 0): Extract<SessionEntry, { type: "usage" }>["usage"] {
  return { input, output, cacheRead, cacheWrite, totalTokens: 0, cost: { input: cost, output: 0, cacheRead: 0, cacheWrite: 0, total: cost } };
}

/** A cache-warm usage entry: the previous request the miss rule measures a turn against. */
function cacheWarmEntry(): SessionEntry {
  return {
    type: "usage", id: "warm", parentId: null, timestamp: "2026-11-10T00:00:00.000Z",
    kind: "cache_warm", provider: "anthropic", model: "claude-opus-4",
    usage: usageOf(100_000, 0, 0, 0),
  } as SessionEntry;
}

function previousEntry(options: { dropped?: number } = {}): SessionEntry {
  return {
    type: "message", id: "previous", parentId: null, timestamp: "2026-11-10T00:00:00.000Z",
    message: { ...noticeMessage(options.dropped === undefined ? {} : { dropped: options.dropped }), usage: { input: 100_000, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } },
  } as SessionEntry;
}

/** A clock a test moves, and a scheduler that records its arms and its cancels. */
function clock() {
  let now = 0;
  const pending: Array<{ at: number; callback: () => void }> = [];
  const arms: number[] = [];
  const cancels: number[] = [];
  const schedule = (callback: () => void, delayMs: number): (() => void) => {
    arms.push(delayMs);
    const handle = { at: now + delayMs, callback };
    pending.push(handle);
    return () => {
      cancels.push(handle.at);
      const index = pending.indexOf(handle);
      if (index >= 0) pending.splice(index, 1);
    };
  };
  return {
    now: () => now,
    schedule,
    arms,
    cancels,
    pending: () => pending.length,
    advance(ms: number): void {
      now += ms;
      for (const handle of [...pending].filter(item => item.at <= now)) {
        const index = pending.indexOf(handle);
        if (index >= 0) pending.splice(index, 1);
        handle.callback();
      }
    },
    /** Fire the oldest pending timer early, as a host clock may. */
    fire(): void {
      pending.shift()?.callback();
    },
    /** Move the clock without firing anything, as a read between timer events does. */
    move(ms: number): void {
      now += ms;
    },
  };
}

/** The store over a fake clock and schedule, with its branch and entries readers. */
function newNoticeStore(options: { noticeSeconds?: number; branch?: SessionEntry[]; entries?: SessionEntry[] } = {}) {
  const timer = clock();
  let repaints = 0;
  const entries = options.entries ?? [];
  const branch = options.branch ?? [previousEntry()];
  const store = createSessionDataStore({
    seed,
    requestRender: () => void repaints++,
    readUsage: () => ({ contextUsage: seed.contextUsage, sessionId: "session-1", leafId: null }),
    readEntries: () => entries,
    readBranch: () => branch,
    now: timer.now,
    schedule: timer.schedule,
    ...(options.noticeSeconds === undefined ? {} : { noticeSeconds: options.noticeSeconds }),
  });
  return { store, timer, repaints: () => repaints };
}

test("the ten seeded datums and the render's instant, in order, and no notice", () => {
  const { store } = newStore(seed);
  const sample = store.sample();
  assert.deepEqual(Object.keys(sample), [
    "provider", "model", "thinkingLevel", "cwd", "home", "branch", "sessionName", "statuses", "contextUsage",
    "totals", "sampledAt",
  ]);
  assert.equal(sample.sampledAt, 0, "the instant the store's clock read");
  assert.deepEqual(sample, seed);
});

test("an absent context usage and a null estimate read back without becoming zero", () => {
  const { store, host } = newStore(seed);
  host.contextUsage = undefined;
  assert.equal(store.sample().contextUsage, undefined);
  host.contextUsage = { tokens: null, percent: null, contextWindow: 200000 };
  assert.deepEqual(store.sample().contextUsage, { tokens: null, percent: null, contextWindow: 200000 });
});

function usage(input: number, output: number, cacheRead: number, cacheWrite: number, cost: number, totalTokens: number) {
  return { input, output, cacheRead, cacheWrite, totalTokens, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: cost } };
}

// Only fields the scan reads are relevant at this boundary (chidi §1.6, addendum 2 Q2).
const allEntries = [
  { type: "usage", usage: usage(10, 5, 2, 1, 0.125, 999) },
  { type: "message", message: { role: "assistant", usage: usage(100, 50, 20, 10, 0.25, 777) } },
  { type: "message", message: { role: "toolResult", usage: usage(7, 3, 0, 0, 0.0625, 555) } },
  { type: "compaction", usage: usage(1, 1, 1, 1, 0.03125, 444) },
] as SessionEntry[];

test("totals scan the whole getEntries array across all four host categories, never totalTokens", () => {
  const { store, host } = newStore(seed);
  host.entries = allEntries;
  assert.deepEqual(store.sample().totals, { input: 118, output: 59, cacheRead: 23, cacheWrite: 12, cost: 0.46875 });
});

test("a branch summary counts like a compaction and unrelated messages contribute nothing", () => {
  const { store, host } = newStore(seed);
  host.entries = [
    { type: "branch_summary", usage: usage(1, 1, 1, 1, 0.03125, 444) },
    { type: "message", message: { role: "toolResult" } },
    { type: "message", message: { role: "user", usage: usage(100, 100, 100, 100, 100, 100) } },
    { type: "compaction" },
  ] as SessionEntry[];
  assert.deepEqual(store.sample().totals, { input: 1, output: 1, cacheRead: 1, cacheWrite: 1, cost: 0.03125 });
});

test("entries without usage give all five zero totals", () => {
  const { store } = newStore(seed);
  assert.deepEqual(store.sample().totals, zeroTotals);
});

test("two samples under one session and leaf scan once and share their totals object", () => {
  const { store, calls } = newStore(seed);
  const first = store.sample();
  const second = store.sample();
  assert.equal(calls.entries, 1);
  assert.equal(first.totals, second.totals);
});

for (const key of ["leafId", "sessionId"] as const) {
  test(`a moved ${key} scans again without a turn boundary`, () => {
    const { store, host, calls } = newStore(seed);
    store.sample();
    host[key] = "moved";
    host.entries = allEntries;
    assert.deepEqual(store.sample().totals, { input: 118, output: 59, cacheRead: 23, cacheWrite: 12, cost: 0.46875 });
    assert.equal(calls.entries, 2);
  });
}

test("a null leaf is a cache key and moving away then back is two moves", () => {
  const { store, host, calls } = newStore(seed);
  store.sample();
  store.sample();
  assert.equal(calls.entries, 1);
  host.leafId = "next";
  store.sample();
  host.leafId = null;
  store.sample();
  assert.equal(calls.entries, 3);
  store.dispose();
  store.sample();
  assert.equal(calls.entries, 3);
});

test("context usage is read on every sample even when the scan key does not move", () => {
  const { store, host, calls } = newStore(seed);
  assert.deepEqual(store.sample().contextUsage, seed.contextUsage);
  host.contextUsage = { tokens: 86400, percent: 21.6, contextWindow: 400000 };
  assert.deepEqual(store.sample().contextUsage, host.contextUsage);
  host.contextUsage = { tokens: null, percent: null, contextWindow: 400000 };
  assert.equal(store.sample().contextUsage?.percent, null);
  host.contextUsage = undefined;
  assert.equal(store.sample().contextUsage, undefined);
  assert.equal(calls.usage, 4);
  assert.equal(calls.entries, 1);
});

test("a turn boundary repaints once only when scanned totals change and the next sample reuses the scan", () => {
  const { store, host, calls, repaints } = newStore(seed);
  store.sample();
  host.entries = allEntries;
  host.leafId = "turn-1";
  store.turnEnded();
  assert.equal(repaints(), 1);
  assert.deepEqual(store.sample().totals, { input: 118, output: 59, cacheRead: 23, cacheWrite: 12, cost: 0.46875 });
  assert.equal(calls.entries, 2);
  host.leafId = "turn-2";
  store.turnEnded();
  store.turnEnded();
  assert.equal(repaints(), 1, "an unchanged total never repaints, even at a new leaf");
  assert.equal(calls.entries, 3);
});

test("a turn boundary changing only cacheWrite still repaints", () => {
  const { store, host, repaints } = newStore(seed);
  store.sample();
  host.entries = [{ type: "usage", usage: usage(0, 0, 0, 1, 0, 999) }] as SessionEntry[];
  host.leafId = "cache-write";
  store.turnEnded();
  assert.equal(repaints(), 1);
  assert.equal(store.sample().totals?.cacheWrite, 1);
});

test("a turn boundary before the first render fills the cache without repainting", () => {
  const { store, host, calls, repaints } = newStore(seed);
  host.entries = allEntries;
  store.turnEnded();
  assert.equal(repaints(), 0);
  assert.equal(store.sample().totals?.input, 118);
  assert.equal(calls.entries, 1);
});

test("a disposed turn boundary calls neither reader and requests no repaint", () => {
  const { store, calls, repaints } = newStore(seed);
  store.dispose();
  store.turnEnded();
  assert.deepEqual(calls, { usage: 0, entries: 0 });
  assert.equal(repaints(), 0);
});

test("a datum seeded undefined reads undefined, not an empty string and not zero", () => {
  const { store } = newStore(unknown);
  const sample = store.sample();
  assert.equal(sample.provider, undefined);
  assert.equal(sample.model, undefined);
  assert.equal(sample.thinkingLevel, undefined);
  assert.equal(sample.cwd, undefined);
  assert.notEqual(sample.provider, "");
  assert.notEqual(sample.model, 0);
});

test("a datum seeded with an empty string reads it, distinguishable from unknown", () => {
  const { store } = newStore({ ...seed, model: "", thinkingLevel: undefined });
  const sample = store.sample();
  assert.equal(sample.model, "");
  assert.equal(sample.thinkingLevel, undefined);
  assert.notEqual(sample.model, sample.thinkingLevel);
});

test("a model selection replaces the held provider and model", () => {
  const { store } = newStore(seed);
  store.modelSelected("openai", "gpt-5");
  const sample = store.sample();
  assert.equal(sample.provider, "openai");
  assert.equal(sample.model, "gpt-5");
  assert.equal(sample.thinkingLevel, "high", "the level is not the model's to change");
});

test("a thinking-level selection replaces the held level", () => {
  const { store } = newStore(seed);
  store.thinkingLevelSelected("low");
  const sample = store.sample();
  assert.equal(sample.thinkingLevel, "low");
  assert.equal(sample.provider, "anthropic", "the model is not the level's to change");
  assert.equal(sample.model, "claude-opus-4");
});

test("a restore-style push carrying the seeded values changes nothing", () => {
  const { store } = newStore(seed);
  store.modelSelected("anthropic", "claude-opus-4");
  store.thinkingLevelSelected("high");
  assert.deepEqual(store.sample(), seed);
});

test("a sample handed out earlier keeps its values after a later push", () => {
  const { store } = newStore(seed);
  const before = store.sample();
  store.modelSelected("openai", "gpt-5");
  assert.deepEqual(before, seed, "the earlier sample is a value, not a live view");
  assert.equal(store.sample().model, "gpt-5");
});

test("a model selection that changes a datum requests exactly one repaint", () => {
  const { store, repaints } = newStore(seed);
  store.modelSelected("openai", "gpt-5");
  assert.equal(repaints(), 1, "one repaint, though two datums changed");
  store.modelSelected("openai", "gpt-5.1");
  assert.equal(repaints(), 2, "a changed model alone also repaints once");
});

test("a thinking-level selection that changes the level requests exactly one repaint", () => {
  const { store, repaints } = newStore(seed);
  store.thinkingLevelSelected("low");
  assert.equal(repaints(), 1);
});

test("a push carrying the values the store already holds requests no repaint", () => {
  const { store, repaints } = newStore(seed);
  store.modelSelected("anthropic", "claude-opus-4");
  store.thinkingLevelSelected("high");
  assert.equal(repaints(), 0);
});

test("disposal is idempotent", () => {
  const { store } = newStore(seed);
  store.dispose();
  assert.doesNotThrow(() => store.dispose(), "a second dispose does nothing");
});

test("a disposed store reads all ten datums unknown without calling throwing readers", () => {
  const calls = { usage: 0, entries: 0 };
  const store = createSessionDataStore({
    seed,
    requestRender: () => {},
    readUsage: () => {
      calls.usage++;
      throw new Error("stale context");
    },
    readEntries: () => {
      calls.entries++;
      throw new Error("stale entries");
    },
    readBranch: () => [],
    now: () => 0,
    schedule: () => () => {},
  });
  store.dispose();
  assert.deepEqual(store.sample(), unknown);
  assert.deepEqual(calls, { usage: 0, entries: 0 });
});

test("a sample handed out before disposal keeps its values", () => {
  const { store } = newStore(seed);
  const before = store.sample();
  store.dispose();
  assert.deepEqual(before, seed);
  assert.deepEqual(store.sample(), unknown);
});

test("a push after disposal requests no repaint", () => {
  const { store, repaints } = newStore(seed);
  store.dispose();
  store.modelSelected("openai", "gpt-5");
  store.thinkingLevelSelected("low");
  assert.equal(repaints(), 0);
});

test("a disposed store and its all-unknown replacement both read without throwing", () => {
  const first = newStore(seed);
  first.store.dispose();
  const second = newStore(unknown);
  assert.doesNotThrow(() => first.store.sample());
  assert.doesNotThrow(() => second.store.sample());
  assert.equal(second.store.sample().model, undefined);
});

test("the branch is held as reported, and the host's null reads unknown rather than an empty string", () => {
  const { store } = newStore(seed);
  store.branchChanged("main");
  assert.equal(store.sample().branch, "main");
  store.branchChanged("detached");
  assert.equal(store.sample().branch, "detached", "detached is the text the host reports");
  store.branchChanged(null);
  assert.equal(store.sample().branch, undefined);
  assert.notEqual(store.sample().branch, "");
});

test("a branch change repaints once, and a report of the branch already held repaints nothing", () => {
  const { store, repaints } = newStore(seed);
  store.branchChanged("main");
  assert.equal(repaints(), 1, "a first report replaces unknown and repaints");
  store.branchChanged("main");
  assert.equal(repaints(), 1, "the held branch repaints nothing");
  store.branchChanged("feature/x");
  assert.equal(repaints(), 2);
  assert.equal(store.sample().branch, "feature/x");
});

test("the session's name is seeded, replaced by a push, and cleared to unknown", () => {
  const { store, repaints } = newStore({ ...seed, sessionName: "refactor footer" });
  assert.equal(store.sample().sessionName, "refactor footer");
  store.sessionNamed("docs");
  assert.equal(store.sample().sessionName, "docs");
  assert.equal(repaints(), 1);
  store.sessionNamed(undefined);
  assert.equal(store.sample().sessionName, undefined, "a cleared name is unknown, not stale");
  assert.equal(repaints(), 2, "clearing the name is a change and repaints");
  store.sessionNamed(undefined);
  assert.equal(repaints(), 2, "a push that changes nothing repaints nothing");
});

test("statuses are read once per sample, held raw, and an empty map reads unknown", () => {
  const { store } = newStore(seed);
  let reads = 0;
  const statuses = new Map([["b", "idle"], ["a", "3 tasks"]]);
  store.readStatusesFrom(() => {
    reads++;
    return statuses;
  });
  const sample = store.sample();
  assert.equal(reads, 1, "one sample asks the host once");
  assert.equal(sample.statuses, statuses, "the host's map is held raw, not composed here");
  assert.deepEqual([...sample.statuses!.keys()], ["b", "a"], "the store does not order them");
  store.readStatusesFrom(() => new Map());
  assert.equal(store.sample().statuses, undefined, "an empty set is unknown");
});

test("a branch push, a name push and a status reader after disposal leave the store untouched", () => {
  const { store, repaints } = newStore(seed);
  let reads = 0;
  store.readStatusesFrom(() => { reads++; return new Map([["a", "x"]]); });
  store.dispose();
  store.branchChanged("main");
  store.sessionNamed("docs");
  assert.equal(repaints(), 0);
  assert.equal(store.sample().branch, undefined);
  assert.equal(store.sample().sessionName, undefined);
  assert.equal(store.sample().statuses, undefined);
  assert.equal(reads, 0, "a disposed store reads no statuses");
});

test("a completed assistant message's notice is the store's notice datum", () => {
  const { store } = newNoticeStore({ noticeSeconds: 10, entries: [previousEntry()] });
  store.messageEnded(noticeMessage(), 0);
  const notice: Timed<Notice> | undefined = store.sample().notice;
  assert.deepEqual(notice, { kind: "miss", values: { tokens: "20k", cost: " (~$0.10)" }, shownUntil: 10_000 });
});

test("a user message, a non-message event and an aborted or errored message take no notice", () => {
  const { store } = newNoticeStore({ noticeSeconds: 10, entries: [previousEntry()] });
  store.messageEnded({ role: "user", content: [], timestamp: 0 } as MessageEndEvent["message"], 0);
  assert.equal(store.sample().notice, undefined, "a user message");
  for (const stopReason of ["aborted", "error"] as const) {
    store.messageEnded(noticeMessage({ stopReason }), 0);
    assert.equal(store.sample().notice, undefined, stopReason);
  }
});

test("a compaction and a branch summary each hold their usage as a notice", () => {
  const { store } = newNoticeStore({ noticeSeconds: 10 });
  store.compactionEnded(usageOf(100, 200, 300, 0.38, 400));
  assert.deepEqual(store.sample().notice, { kind: "compaction", values: { tokens: "1.0k", cost: " (~$0.38)" }, shownUntil: 10_000 });
  store.branchSummarised(usageOf(100, 200, 300, 0.38, 400));
  assert.deepEqual(store.sample().notice, { kind: "branchSummary", values: { tokens: "1.0k", cost: " (~$0.38)" }, shownUntil: 10_000 });
});

test("a compaction or a branch summary carrying no usage takes no notice", () => {
  const { store } = newNoticeStore({ noticeSeconds: 10 });
  store.compactionEnded(undefined);
  assert.equal(store.sample().notice, undefined);
  store.branchSummarised(undefined);
  assert.equal(store.sample().notice, undefined);
});

test("with no visible time the store takes no notice and holds no timer", () => {
  const { store, timer } = newNoticeStore({ entries: [previousEntry()] });
  store.messageEnded(noticeMessage(), 0);
  store.compactionEnded(usageOf(100, 200, 300, 0.38));
  assert.equal(store.sample().notice, undefined);
  assert.equal(timer.pending(), 0, "no visible time, no timer");
});

test("a notice's instant requests exactly one repaint, and the store keeps the notice", () => {
  const { store, timer, repaints } = newNoticeStore({ noticeSeconds: 10, entries: [previousEntry()] });
  store.messageEnded(noticeMessage(), 0);
  assert.equal(repaints(), 0, "the arrival requests nothing; the host renders the event");
  const held = { kind: "miss", values: { tokens: "20k", cost: " (~$0.10)" }, shownUntil: 10_000 };
  assert.deepEqual(store.sample().notice, held, "the notice shows before its instant");
  timer.advance(10_000);
  assert.equal(repaints(), 1, "the instant requests one repaint");
  assert.deepEqual(store.sample().notice, held, "the store never hides the notice");
  assert.equal(timer.pending(), 0, "and the handle is spent");
});

test("a read past the instant keeps the notice and its instant, and asks for nothing", () => {
  const { store, timer, repaints } = newNoticeStore({ noticeSeconds: 10, entries: [previousEntry()] });
  store.messageEnded(noticeMessage(), 0);
  timer.move(10_000);
  assert.equal(store.sample().notice?.shownUntil, 10_000, "the store still holds the notice and its instant");
  assert.equal(repaints(), 0, "a read asks nothing of the store");
  assert.equal(timer.pending(), 1, "the scheduled repaint is still pending");
});

test("an early fire re-arms for the time left and requests no repaint", () => {
  const { store, timer, repaints } = newNoticeStore({ noticeSeconds: 10, entries: [previousEntry()] });
  store.messageEnded(noticeMessage(), 0);
  timer.move(4_000);
  timer.fire();
  assert.equal(repaints(), 0, "an early fire asks for nothing");
  assert.equal(timer.pending(), 1, "it re-arms instead");
  assert.deepEqual(timer.arms, [10_000, 6_000], "the re-arm covers the time left");
  assert.ok(store.sample().notice, "the notice still shows");
  timer.advance(6_000);
  assert.equal(repaints(), 1, "the re-armed timer requests the one repaint at the instant");
  assert.equal(store.sample().notice?.shownUntil, 10_000, "and the store still holds the notice");
});

test("a newer notice replaces the shown one and takes its whole visible time from its own arrival", () => {
  const { store, timer } = newNoticeStore({ noticeSeconds: 10, entries: [previousEntry()] });
  store.messageEnded(noticeMessage(), 0);
  const first = timer.arms[0];
  timer.move(8_000);
  store.compactionEnded(usageOf(100, 200, 300, 0.38));
  assert.equal(store.sample().notice?.kind, "compaction", "the newer replaces the shown");
  assert.equal(timer.pending(), 1, "the first's handle is cleared and one remains");
  assert.deepEqual(timer.cancels, [first], "the first's handle was cancelled when the second arrived");
  assert.deepEqual(timer.arms, [10_000, 10_000], "the second's delay is its own full visible time");
  timer.advance(9_999);
  assert.equal(store.sample().notice?.kind, "compaction", "one second short of its full time");
  timer.advance(1);
  assert.equal(store.sample().notice?.shownUntil, 18_000, "the second reached its own instant and stays held");
});

test("one message carrying a thinking drop and a miss keeps the miss", () => {
  const { store } = newNoticeStore({ noticeSeconds: 10, entries: [previousEntry()] });
  store.messageEnded(noticeMessage({ dropped: 2 }), 0);
  assert.equal(store.sample().notice?.kind, "miss");
  assert.equal(store.sample().notice?.values.blocks, undefined, "the thinking notice is lost");
});

test("the thinking delta reads the branch, not the entries: a sibling's higher count stays silent", () => {
  const sibling = previousEntry({ dropped: 2 });
  const current = previousEntry();
  // The turn reads no cache, so the entries yield no miss and the thinking step decides; the
  // sibling dropped two blocks and the branch's previous message dropped none.
  const turn = noticeMessage({ dropped: 1, cacheRead: 0 });
  const { store } = newNoticeStore({ noticeSeconds: 10, entries: [sibling], branch: [current] });
  store.messageEnded(turn, 0);
  assert.deepEqual(store.sample().notice, { kind: "thinkingOne", values: { blocks: "1" }, shownUntil: 10_000 });
});

test("the cache-warm entry is the previous request the miss rule measures", () => {
  const { store } = newNoticeStore({ noticeSeconds: 10, entries: [cacheWarmEntry()] });
  store.messageEnded(noticeMessage(), 0);
  assert.equal(store.sample().notice?.kind, "miss", "the warm measures the turn though no warm notice shows");
});

test("no notice, no timer: the store holds no pending handle before an arrival", () => {
  const { timer } = newNoticeStore({ noticeSeconds: 10, entries: [previousEntry()] });
  assert.equal(timer.pending(), 0);
});

test("disposal clears the pending expiry, and a message after it takes no notice and repaints nothing", () => {
  const { store, timer, repaints } = newNoticeStore({ noticeSeconds: 10, entries: [previousEntry()] });
  store.messageEnded(noticeMessage(), 0);
  assert.equal(timer.pending(), 1);
  store.dispose();
  assert.equal(timer.pending(), 0, "the handle is cancelled");
  timer.advance(10_000);
  assert.equal(repaints(), 0, "no expiry repaints after disposal");
  assert.equal(store.sample().notice, undefined);
  store.messageEnded(noticeMessage(), 0);
  assert.equal(repaints(), 0, "a message after disposal takes no notice");
});
