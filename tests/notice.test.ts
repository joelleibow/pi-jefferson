import assert from "node:assert/strict";
import { test } from "node:test";

import type { MessageEndEvent, SessionEntry } from "@earendil-works/pi-coding-agent";

import { CACHE_TTL_MS, formatTokens, messageNotice, missNotice, thinkingNotice, usageNotice } from "../extensions/jefferson/data/notice.ts";
import { compactCount } from "../extensions/jefferson/components/instruments/compact-count.ts";

type AssistantMessage = Extract<MessageEndEvent["message"], { role: "assistant" }>;
type Usage = Extract<SessionEntry, { type: "usage" }>["usage"];

const entry = { id: "entry", parentId: null, timestamp: "2026-11-10T00:00:00.000Z" } as const;

/** An assistant message whose usage is the four counts and whose cost lands in the input bucket. */
function message(options: {
  input?: number; cacheRead?: number; cacheWrite?: number; cost?: number;
  timestamp?: number; model?: string; stopReason?: AssistantMessage["stopReason"]; dropped?: number;
} = {}): AssistantMessage {
  const input = options.input ?? 0, cacheRead = options.cacheRead ?? 0, cacheWrite = options.cacheWrite ?? 0;
  const cost = options.cost ?? 0;
  const dropped = options.dropped ?? 0;
  return {
    role: "assistant", api: "anthropic", provider: "anthropic", model: options.model ?? "claude-opus-4",
    content: [], stopReason: options.stopReason ?? "stop", timestamp: options.timestamp ?? 0,
    usage: { input, output: 0, cacheRead, cacheWrite, totalTokens: 0, cost: { input: cost, output: 0, cacheRead: 0, cacheWrite: 0, total: cost } },
    ...(dropped === 0 ? {} : {
      diagnostics: [{
        type: "anthropic_input_transformations", timestamp: 0,
        details: { transformations: Array.from({ length: dropped }, () => ({ type: "thinking_dropped" })) },
      }],
    }),
  };
}

function previousMessage(options: Parameters<typeof message>[0] = {}): SessionEntry {
  return { ...entry, type: "message", message: message(options) } as SessionEntry;
}

function cacheWarm(usage: Usage): SessionEntry {
  return { ...entry, type: "usage", kind: "cache_warm", provider: "anthropic", model: "claude-opus-4", usage } as SessionEntry;
}

function usageOf(input: number, cacheRead: number, cacheWrite: number, cost: number): Usage {
  return { input, output: 0, cacheRead, cacheWrite, totalTokens: 0, cost: { input: cost, output: 0, cacheRead: 0, cacheWrite: 0, total: cost } };
}

/** A turn that misses `tokens` and pays `cost` for them, against a 100,000-token prompt. */
function nearMiss(tokens: number, cost: number): { entries: SessionEntry[]; message: AssistantMessage } {
  return {
    entries: [previousMessage({ input: 100_000, cacheWrite: 0, cost: 0 })],
    message: message({ input: tokens, cacheRead: 100_000 - tokens, cacheWrite: 0, cost }),
  };
}

test("formatTokens rounds to whole thousands from 10,000 up, and compactCount does not", () => {
  for (const [count, expected, compact] of [
    [9_999, "10.0k", "10.0k"],
    [10_000, "10k", "10.0k"],
    [20_000, "20k", "20.0k"],
    [99_999, "100k", "100.0k"],
    [125_300, "125k", "125k"],
  ] as const) {
    assert.equal(formatTokens(count), expected, String(count));
    assert.equal(compactCount(count), compact, `the shared formatter's answer for ${count}`);
  }
  assert.equal(formatTokens(999), "999");
  assert.equal(formatTokens(1_000), "1.0k");
  assert.equal(formatTokens(1_000_000), "1.0M");
});

test("the noise floor: 1,024 missed tokens draws nothing and 1,025 draws a notice", () => {
  assert.equal(missNotice(nearMiss(1_024, 0.1).entries, nearMiss(1_024, 0.1).message, 0), undefined);
  const shown = missNotice(nearMiss(1_025, 0.1).entries, nearMiss(1_025, 0.1).message, 0);
  assert.ok(shown);
  assert.equal(shown.kind, "miss");
  assert.equal(shown.values.tokens, "1.0k");
});

test("the display gate: 19,999 tokens and $0.099 draw nothing; 20,000 tokens or $0.10 draws", () => {
  const under = nearMiss(19_999, 0.099);
  assert.equal(missNotice(under.entries, under.message, 0), undefined, "both just under the gate");
  const tokens = nearMiss(20_000, 0.099);
  assert.ok(missNotice(tokens.entries, tokens.message, 0), "at the token gate");
  const cost = nearMiss(19_999, 0.1);
  assert.ok(missNotice(cost.entries, cost.message, 0), "at the cost gate");
});

test("the cost suffix appears at a cent and reads to two decimals", () => {
  const under = nearMiss(20_000, 0.0099);
  assert.equal(missNotice(under.entries, under.message, 0)?.values.cost, "");
  const at = nearMiss(20_000, 0.01);
  assert.equal(missNotice(at.entries, at.message, 0)?.values.cost, " (~$0.01)");
});

test("the idle variant: exactly five minutes reads missIdle and a millisecond under does not", () => {
  const previous = previousMessage({ input: 100_000, timestamp: 0, cost: 0 });
  const at = message({ input: 20_000, cacheRead: 80_000, cacheWrite: 0, cost: 0.1, timestamp: CACHE_TTL_MS });
  const under = message({ input: 20_000, cacheRead: 80_000, cacheWrite: 0, cost: 0.1, timestamp: CACHE_TTL_MS - 1 });
  const idle = missNotice([previous], at, 0);
  assert.equal(idle?.kind, "missIdle");
  assert.equal(idle?.values.idle, "5");
  assert.equal(missNotice([previous], under, 0)?.kind, "miss");
});

test("a model change beats an idle of the same turn", () => {
  const previous = previousMessage({ input: 100_000, timestamp: 0, cost: 0 });
  const changed = message({ input: 20_000, cacheRead: 80_000, cacheWrite: 0, cost: 0.1, timestamp: CACHE_TTL_MS, model: "claude-opus-5" });
  const shown = missNotice([previous], changed, 0);
  assert.equal(shown?.kind, "missModelSwitch");
  assert.equal(shown?.values.idle, undefined, "the model switch's format carries no idle");
});

test("the cache-read fallback prices a turn that read no cache", () => {
  const previous = previousMessage({ input: 100_000, cacheRead: 1_000, timestamp: 0, cost: 0 });
  // The turn reads no cache, so the model's cache-read rate decides the extra cost: $0.10 paid
  // for 20,000 tokens, less 20,000 × $0.000002 = $0.04, leaves $0.06.
  const noRead = message({ input: 20_000, cacheRead: 0, cacheWrite: 0, cost: 0.1, timestamp: 0 });
  assert.equal(missNotice([previous], noRead, 0)?.values.cost, " (~$0.10)");
  assert.equal(missNotice([previous], noRead, 0.000002)?.values.cost, " (~$0.06)");
});

test("a turn with no cache activity in a session that reported none counts nothing", () => {
  const first = message({ input: 50_000, cacheRead: 0, cacheWrite: 0, cost: 0 });
  assert.equal(missNotice([], first, 0), undefined, "the first turn of a session");
  const previous = previousMessage({ input: 100_000, cacheRead: 0, cacheWrite: 0, cost: 0 });
  assert.equal(missNotice([previous], first, 0), undefined, "a provider that never reported caching");
});

test("an aborted or errored message draws nothing, for the miss and for the thinking delta", () => {
  const previous = previousMessage({ input: 100_000, cost: 0 });
  for (const stopReason of ["aborted", "error"] as const) {
    const stopped = message({ input: 20_000, cacheRead: 80_000, cacheWrite: 0, cost: 0.1, stopReason, dropped: 2 });
    assert.equal(missNotice([previous], stopped, 0), undefined, stopReason);
    assert.equal(thinkingNotice(stopped, [previous]), undefined, stopReason);
  }
});

test("a compaction and a branch summary each reset the previous request", () => {
  for (const type of ["compaction", "branch_summary"] as const) {
    const reset = { ...entry, type, summary: "", ...(type === "compaction" ? { firstKeptEntryId: "x", tokensBefore: 0 } : { fromId: "x" }) } as SessionEntry;
    const entries = [previousMessage({ input: 100_000, cost: 0 }), reset];
    const turn = message({ input: 20_000, cacheRead: 60_000, cacheWrite: 0, cost: 0.1 });
    assert.equal(missNotice(entries, turn, 0), undefined, type);
  }
});

test("a cache-warm usage entry measures the turn as the previous request, and draws no warm notice", () => {
  const warm = cacheWarm(usageOf(100_000, 0, 0, 0));
  const turn = message({ input: 20_000, cacheRead: 80_000, cacheWrite: 0, cost: 0.1 });
  const shown = missNotice([warm], turn, 0);
  assert.ok(shown, "the warm entry is the previous request");
  assert.equal(shown.kind, "miss", "the warm itself draws nothing");
  // Without the warm entry the turn would read as a session's first, and count no miss.
  assert.equal(missNotice([], turn, 0), undefined);
});

test("the thinking delta shows when the count rises and stays silent when it repeats", () => {
  const previous = previousMessage({ dropped: 0 });
  const branch = [previous];
  assert.deepEqual(thinkingNotice(message({ dropped: 2 }), branch), {
    kind: "thinking", values: { blocks: "2" },
  });
  assert.deepEqual(thinkingNotice(message({ dropped: 1 }), branch), {
    kind: "thinkingOne", values: { blocks: "1" },
  });
  assert.equal(thinkingNotice(message({ dropped: 0 }), branch), undefined, "no diagnostic, no notice");
  const repeated = previousMessage({ dropped: 2 });
  assert.equal(thinkingNotice(message({ dropped: 2 }), [repeated]), undefined, "the same count repeating");
  assert.equal(thinkingNotice(message({ dropped: 1 }), [repeated]), undefined, "a lower count");
});

test("the thinking delta reads the branch, not the entries: a sibling's higher count stays silent", () => {
  // The entries hold a sibling branch's assistant message, which dropped more; the branch does not.
  const sibling = previousMessage({ dropped: 2 });
  const current = previousMessage({ dropped: 0 });
  const turn = message({ dropped: 1 });
  assert.ok(thinkingNotice(turn, [current]), "the branch's previous count is zero, so the turn rises");
  assert.equal(thinkingNotice(turn, [sibling]), undefined, "the entries' sibling count is higher, so nothing rises");
  // The one message notice reads the entries and the branch as different lists: the entries carry
  // the sibling's higher count and yield no miss, and the branch's zero lets the thinking step rise.
  assert.deepEqual(messageNotice(turn, [sibling], [current], 0), {
    kind: "thinkingOne", values: { blocks: "1" },
  });
});

test("one message carrying a thinking drop and a miss keeps the miss and loses the thinking notice", () => {
  const previous = previousMessage({ input: 100_000, dropped: 0 });
  const turn = message({ input: 20_000, cacheRead: 80_000, cacheWrite: 0, cost: 0.1, dropped: 2 });
  const shown = messageNotice(turn, [previous], [previous], 0);
  assert.equal(shown?.kind, "miss");
  assert.equal(shown?.values.blocks, undefined);
});

test("a compaction's usage reads the token sum and the cost suffix", () => {
  const usage = usageOf(100, 300, 200, 0.38);
  usage.output = 400;
  assert.deepEqual(usageNotice("compaction", usage), {
    kind: "compaction", values: { tokens: "1.0k", cost: " (~$0.38)" },
  });
  assert.deepEqual(usageNotice("branchSummary", usage), {
    kind: "branchSummary", values: { tokens: "1.0k", cost: " (~$0.38)" },
  });
  assert.equal(usageNotice("compaction", undefined), undefined, "no usage, no notice");
  const cheap = usageOf(20_000, 0, 0, 0.0099);
  assert.equal(usageNotice("compaction", cheap)?.values.cost, "", "under a cent, no suffix");
});
