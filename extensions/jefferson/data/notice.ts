/**
 * pi's notice rule, copied: the cache miss's scan and display gate, its three variants, the
 * compaction and branch-summary usage, and the dropped-thinking delta. The values are formatted
 * here, so a notice's resolvers hand them on unchanged and no instrument reads a host type.
 *
 * shortcut: copies pi 1.4.0's rule; drift in the user's global pi between pin bumps is invisible,
 * re-check on every pin bump
 */
import type { MessageEndEvent, SessionEntry } from "@earendil-works/pi-coding-agent";

/** The six kinds of notice pi's transcript draws, and the four values a kind's format carries. */
export type NoticeKind = "miss" | "missModelSwitch" | "missIdle" | "compaction" | "branchSummary" | "thinking";
export type NoticeValue = "tokens" | "cost" | "idle" | "blocks";

/** A notice: its kind and each value already formatted, absent where the kind does not carry it. */
export interface Notice {
  readonly kind: NoticeKind;
  readonly values: Partial<Record<NoticeValue, string>>;
}

type AssistantMessage = Extract<MessageEndEvent["message"], { role: "assistant" }>;
type Usage = Extract<SessionEntry, { type: "usage" }>["usage"];

/** pi's prompt-cache TTL (`dist/core/cache-stats.js:5`); an idle this long explains a miss. */
export const CACHE_TTL_MS = 5 * 60 * 1_000;
/** A per-turn miss at or below this is cache breakpoint noise (`cache-stats.js:7`, applied `:24`). */
const NOISE_FLOOR_TOKENS = 1_024;
/** pi's display gate: a notice shows at this many missed tokens or this much cost (`interactive-mode.js:3367`). */
const DISPLAY_GATE_TOKENS = 20_000;
const DISPLAY_GATE_COST = 0.1;
/** pi's cost suffix appears at a cent, and reads to two decimals (`interactive-mode.js:3369`, `:3311`). */
const COST_SUFFIX_MIN = 0.01;
const THOUSAND = 1_000;
const TEN_THOUSAND = 10_000;
const MILLION = 1_000_000;
const DECIMAL_MILLIONS_LIMIT = 10_000_000;
const MINUTE_MS = 60_000;

/** pi's token count for the footer: whole thousands from 10,000 up (`components/footer.js:20-30`). */
export function formatTokens(count: number): string {
  if (count < THOUSAND) return count.toString();
  if (count < TEN_THOUSAND) return `${(count / THOUSAND).toFixed(1)}k`;
  if (count < MILLION) return `${Math.round(count / THOUSAND)}k`;
  if (count < DECIMAL_MILLIONS_LIMIT) return `${(count / MILLION).toFixed(1)}M`;
  return `${Math.round(count / MILLION)}M`;
}

/** pi's cost suffix, ` (~$0.38)`, and nothing below a cent (`interactive-mode.js:3369`, `:3311`). */
function costSuffix(cost: number): string {
  return cost >= COST_SUFFIX_MIN ? ` (~$${cost.toFixed(2)})` : "";
}

/** The count pi's thinking notice reads from the message's own diagnostics (`:3349`). */
function countDroppedThinkingBlocks(message: AssistantMessage): number {
  let count = 0;
  for (const diagnostic of message.diagnostics ?? []) {
    if (diagnostic.type !== "anthropic_input_transformations") continue;
    const transformations = diagnostic.details?.transformations;
    if (!Array.isArray(transformations)) continue;
    count += transformations.filter((transformation) =>
      typeof transformation === "object" && transformation !== null && !Array.isArray(transformation)
      && (transformation as { type?: unknown }).type === "thinking_dropped").length;
  }
  return count;
}

interface PreviousRequest {
  readonly promptTokens: number;
  readonly modelKey: string;
  readonly timestamp: number;
  readonly reportedCache: boolean;
}

interface CacheMiss {
  readonly missedTokens: number;
  readonly missedCost: number;
  readonly idleMs: number;
  readonly modelChanged: boolean;
}

/** The previous request a message leaves behind (`cache-stats.js:41-52`); nothing with no prompt. */
function asPreviousRequest(message: AssistantMessage, reportedCache: boolean): PreviousRequest | undefined {
  const usage = message.usage;
  const promptTokens = usage.input + usage.cacheRead + usage.cacheWrite;
  if (promptTokens <= 0) return undefined;
  return {
    promptTokens,
    modelKey: `${message.provider}/${message.model}`,
    timestamp: message.timestamp,
    reportedCache: reportedCache || usage.cacheRead + usage.cacheWrite > 0,
  };
}

/** The scan's last request: a cache-warm entry, a compaction or a branch summary resets it. */
function previousRequest(entries: SessionEntry[]): PreviousRequest | undefined {
  let previous: PreviousRequest | undefined;
  for (const entry of entries) {
    if (entry.type === "compaction" || entry.type === "branch_summary") {
      // The context legitimately changed; the next turn's prompt is new content, not re-billed.
      previous = undefined;
      continue;
    }
    if (entry.type === "usage" && entry.kind === "cache_warm") {
      const usage = entry.usage;
      const promptTokens = usage.input + usage.cacheRead + usage.cacheWrite;
      if (promptTokens > 0) {
        previous = {
          promptTokens,
          modelKey: `${entry.provider}/${entry.model}`,
          timestamp: Date.parse(entry.timestamp),
          reportedCache: true,
        };
      }
    } else if (entry.type === "message" && entry.message.role === "assistant") {
      previous = asPreviousRequest(entry.message, previous?.reportedCache ?? false) ?? previous;
    }
  }
  return previous;
}

/** pi's miss for one assistant message (`cache-stats.js:20-40`), with the model's cache-read fallback. */
function detectMiss(previous: PreviousRequest | undefined, message: AssistantMessage, readCachePerToken: number): CacheMiss | undefined {
  const usage = message.usage;
  const promptTokens = usage.input + usage.cacheRead + usage.cacheWrite;
  if (previous === undefined || promptTokens <= 0 || (usage.cacheRead + usage.cacheWrite === 0 && !previous.reportedCache)) return undefined;
  const missedTokens = Math.min(previous.promptTokens, promptTokens) - usage.cacheRead;
  if (missedTokens <= NOISE_FLOOR_TOKENS) return undefined;
  const paidTokens = usage.input + usage.cacheWrite;
  const paidPerToken = paidTokens > 0 ? (usage.cost.input + usage.cost.cacheWrite) / paidTokens : 0;
  const readPerToken = usage.cacheRead > 0 ? usage.cost.cacheRead / usage.cacheRead : readCachePerToken;
  return {
    missedTokens,
    missedCost: missedTokens * Math.max(0, paidPerToken - readPerToken),
    idleMs: Math.max(0, message.timestamp - previous.timestamp),
    modelChanged: `${message.provider}/${message.model}` !== previous.modelKey,
  };
}

/** The cache-miss notice pi's transcript would draw, or nothing when the display gate refuses it. */
export function missNotice(entries: SessionEntry[], message: AssistantMessage, readCachePerToken: number | undefined): Notice | undefined {
  if (message.stopReason === "aborted" || message.stopReason === "error") return undefined;
  const miss = detectMiss(previousRequest(entries), message, readCachePerToken ?? 0);
  if (miss === undefined) return undefined;
  if (miss.missedTokens < DISPLAY_GATE_TOKENS && miss.missedCost < DISPLAY_GATE_COST) return undefined;
  const kind: NoticeKind = miss.modelChanged ? "missModelSwitch" : miss.idleMs >= CACHE_TTL_MS ? "missIdle" : "miss";
  const values: Partial<Record<NoticeValue, string>> = {
    tokens: formatTokens(miss.missedTokens),
    cost: costSuffix(miss.missedCost),
  };
  if (kind === "missIdle") values.idle = `${Math.round(miss.idleMs / MINUTE_MS)}m`;
  return { kind, values };
}

/** The dropped-thinking notice pi's transcript would draw, or nothing when the count does not rise. */
export function thinkingNotice(message: AssistantMessage, branch: SessionEntry[]): Notice | undefined {
  if (message.stopReason === "aborted" || message.stopReason === "error") return undefined;
  const dropped = countDroppedThinkingBlocks(message);
  if (dropped === 0) return undefined;
  // message_end reaches the handler before the message is persisted, so the branch's last
  // assistant message is the previous response (`interactive-mode.js:3338-3346`).
  let previous = 0;
  for (let index = branch.length - 1; index >= 0; index--) {
    const entry = branch[index]!;
    if (entry.type === "message" && entry.message.role === "assistant") {
      previous = countDroppedThinkingBlocks(entry.message);
      break;
    }
  }
  if (dropped <= previous) return undefined;
  const noun = dropped === 1 ? "thinking block" : "thinking blocks";
  return { kind: "thinking", values: { blocks: `${dropped} ${noun}` } };
}

/** The one notice a completed message yields: the miss pi draws second wins the collision. */
export function messageNotice(
  message: AssistantMessage,
  entries: SessionEntry[],
  branch: SessionEntry[],
  readCachePerToken: number | undefined,
): Notice | undefined {
  return missNotice(entries, message, readCachePerToken) ?? thinkingNotice(message, branch);
}

/** The compaction or branch-summary notice pi's transcript draws, or nothing without usage. */
export function usageNotice(kind: "compaction" | "branchSummary", usage: Usage | undefined): Notice | undefined {
  if (usage === undefined) return undefined;
  const tokens = usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
  return { kind, values: { tokens: formatTokens(tokens), cost: costSuffix(usage.cost.total) } };
}
