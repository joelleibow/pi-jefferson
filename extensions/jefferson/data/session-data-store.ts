/** Session datums and usage derivations; the session data feed supplies readers, never a host handle. */
import type { ContextUsage, MessageEndEvent, SessionEntry } from "@earendil-works/pi-coding-agent";

import { messageNotice, usageNotice, type Notice } from "./notice.ts";

/** `undefined` is unknown — never an empty string, zero, or a stale value. */
export type Reading = string | undefined;
/** The usage a compaction or branch summary carries. */
type UsageOf = Extract<SessionEntry, { type: "usage" }>["usage"];

export interface UsageTotals {
  readonly input: number;
  readonly output: number;
  readonly cacheRead: number;
  readonly cacheWrite: number;
  readonly cost: number;
}

/** A datum that shows until an instant: the store stamps the instant once, on arrival. */
export type Timed<T> = T & { readonly shownUntil: number };

/** One render's values, shared by all its cells. */
export interface Readings {
  readonly provider: Reading;
  readonly model: Reading;
  readonly thinkingLevel: Reading;
  readonly cwd: Reading;
  readonly home: Reading;
  readonly branch: Reading;
  readonly sessionName: Reading;
  readonly statuses: ReadonlyMap<string, string> | undefined;
  readonly contextUsage: ContextUsage | undefined;
  readonly totals: UsageTotals | undefined;
  /** The notice a notice instrument shows, with the instant it shows until; unknown while none is held. */
  readonly notice?: Timed<Notice>;
  /** The instant this sample read, once per render; unknown after disposal. */
  readonly sampledAt: number | undefined;
}

export interface SessionDataStore {
  sample(): Readings;
  modelSelected(provider: string, model: string): void;
  thinkingLevelSelected(level: string): void;
  branchChanged(branch: string | null): void;
  sessionNamed(name: string | undefined): void;
  readStatusesFrom(read: () => ReadonlyMap<string, string>): void;
  turnEnded(): void;
  /** A completed message: its cache miss and its dropped thinking, the miss winning a collision. */
  messageEnded(message: MessageEndEvent["message"], readCachePerToken: number | undefined): void;
  /** A compaction's billed usage, or nothing when it carries none. */
  compactionEnded(usage: UsageOf | undefined): void;
  /** A branch summary's billed usage, or nothing when it carries none. */
  branchSummarised(usage: UsageOf | undefined): void;
  dispose(): void;
}

/** The host footer counts these four categories over the whole session. */
function scanTotals(entries: SessionEntry[]): UsageTotals {
  const totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };
  for (const entry of entries) {
    const usage = entry.type === "usage"
      ? entry.usage
      : entry.type === "message" && (entry.message.role === "assistant" || entry.message.role === "toolResult")
        ? entry.message.usage
        : entry.type === "compaction" || entry.type === "branch_summary"
          ? entry.usage
          : undefined;
    if (usage === undefined) continue;
    totals.input += usage.input;
    totals.output += usage.output;
    totals.cacheRead += usage.cacheRead;
    totals.cacheWrite += usage.cacheWrite;
    totals.cost += usage.cost.total;
  }
  return totals;
}

export function createSessionDataStore(options: {
  seed: Pick<Readings, "provider" | "model" | "thinkingLevel" | "cwd" | "home" | "sessionName">;
  requestRender: () => void;
  readUsage: () => { contextUsage: ContextUsage | undefined; sessionId: string; leafId: string | null };
  readEntries: () => SessionEntry[];
  readBranch: () => SessionEntry[];
  now: () => number;
  schedule: (callback: () => void, delayMs: number) => () => void;
  /** The visible time a notice takes from its arrival, or `undefined` when no row places a notice cell. */
  noticeSeconds?: number;
}): SessionDataStore {
  let provider = options.seed.provider;
  let model = options.seed.model;
  let thinkingLevel = options.seed.thinkingLevel;
  let branch: Reading;
  let sessionName = options.seed.sessionName;
  const cwd = options.seed.cwd;
  const home = options.seed.home;
  let requestRender: (() => void) | undefined = options.requestRender;
  let readUsage: typeof options.readUsage | undefined = options.readUsage;
  let readEntries: typeof options.readEntries | undefined = options.readEntries;
  let readStatuses: (() => ReadonlyMap<string, string>) | undefined;
  let scanCache: { sessionId: string; leafId: string | null; totals: UsageTotals } | undefined;
  let readBranch: (() => SessionEntry[]) | undefined = options.readBranch;
  let now: (() => number) | undefined = options.now;
  let schedule: ((callback: () => void, delayMs: number) => () => void) | undefined = options.schedule;
  const noticeSeconds = options.noticeSeconds;
  // One notice at a time: the slot, carrying the instant its arrival stamped, and the pending
  // repaint's cancel. The instant lives on the datum, so the store has one home for it.
  let notice: Timed<Notice> | undefined;
  let cancelExpiry: (() => void) | undefined;

  const cancelNotice = (): void => {
    cancelExpiry?.();
    cancelExpiry = undefined;
  };

  // A timer may not extend or shorten a notice: an early fire re-arms for the time left and
  // requests nothing, and a fire at or past the instant requests the one repaint. The store never
  // hides the datum, so the callback changes nothing it holds.
  const armExpiry = (at: number): void => {
    if (schedule === undefined || now === undefined) return;
    cancelExpiry = schedule(() => {
      if (now === undefined) return;
      if (now() < at) {
        armExpiry(at);
        return;
      }
      // The handle has fired, so nothing is pending: the slot means a timer still to come, and a
      // later cancel must call nothing that has already run.
      cancelExpiry = undefined;
      requestRender?.();
    }, Math.max(0, at - now()));
  };

  const showNotice = (next: Notice): void => {
    if (noticeSeconds === undefined || now === undefined || schedule === undefined) return;
    cancelNotice();
    // The one home of the instant: stamped on arrival, from the document's seconds.
    const shownUntil = now() + noticeSeconds * 1_000;
    notice = { ...next, shownUntil };
    armExpiry(shownUntil);
    // The arrival asks for its own repaint, as every push does: the living store spec has the store
    // request it and forbids leaning on the host repainting for its own reasons. The instant's is a
    // second, separate request.
    requestRender?.();
  };

  return {
    sample() {
      if (readUsage === undefined || readEntries === undefined) {
        return {
          provider: undefined, model: undefined, thinkingLevel: undefined, cwd: undefined, home: undefined,
          branch: undefined, sessionName: undefined, statuses: undefined, contextUsage: undefined, totals: undefined,
          sampledAt: undefined,
        };
      }
      const { contextUsage, sessionId, leafId } = readUsage();
      if (scanCache?.sessionId !== sessionId || scanCache?.leafId !== leafId) {
        scanCache = { sessionId, leafId, totals: scanTotals(readEntries()) };
      }
      const statuses = readStatuses?.();
      return {
        provider, model, thinkingLevel, cwd, home, branch, sessionName,
        // The host's map is held raw; a map with nothing in it means no extension set a status.
        statuses: statuses === undefined || statuses.size === 0 ? undefined : statuses,
        contextUsage, totals: scanCache.totals,
        // One instant per render, so two timed cells in one sample agree on when they are.
        sampledAt: now === undefined ? undefined : now(),
        ...(notice === undefined ? {} : { notice }),
      };
    },
    modelSelected(nextProvider, nextModel) {
      if (requestRender === undefined) return;
      const changed = nextProvider !== provider || nextModel !== model;
      provider = nextProvider;
      model = nextModel;
      if (changed) requestRender();
    },
    thinkingLevelSelected(level) {
      if (requestRender === undefined) return;
      const changed = level !== thinkingLevel;
      thinkingLevel = level;
      if (changed) requestRender();
    },
    branchChanged(next) {
      if (requestRender === undefined) return;
      // The host reports no branch as `null`; the store's unknown is `undefined`, never `""`.
      const value = next ?? undefined;
      const changed = value !== branch;
      branch = value;
      if (changed) requestRender();
    },
    sessionNamed(name) {
      if (requestRender === undefined) return;
      const changed = name !== sessionName;
      sessionName = name;
      if (changed) requestRender();
    },
    readStatusesFrom(read) {
      readStatuses = read;
    },
    messageEnded(message, readCachePerToken) {
      if (requestRender === undefined || readEntries === undefined || readBranch === undefined) return;
      if (message.role !== "assistant") return;
      const next = messageNotice(message, readEntries(), readBranch(), readCachePerToken);
      if (next !== undefined) showNotice(next);
    },
    compactionEnded(usage) {
      if (requestRender === undefined) return;
      const next = usageNotice("compaction", usage);
      if (next !== undefined) showNotice(next);
    },
    branchSummarised(usage) {
      if (requestRender === undefined) return;
      const next = usageNotice("branchSummary", usage);
      if (next !== undefined) showNotice(next);
    },
    turnEnded() {
      if (requestRender === undefined) return;
      const previous = scanCache?.totals;
      const current = this.sample().totals;
      if (previous !== undefined && current !== undefined && (
        previous.input !== current.input || previous.output !== current.output ||
        previous.cacheRead !== current.cacheRead || previous.cacheWrite !== current.cacheWrite ||
        previous.cost !== current.cost
      )) requestRender();
    },
    dispose() {
      // These callbacks capture the old session; the host disposes us before invalidating it.
      cancelNotice();
      requestRender = undefined;
      readUsage = undefined;
      readEntries = undefined;
      readBranch = undefined;
      now = undefined;
      schedule = undefined;
      readStatuses = undefined;
      scanCache = undefined;
      notice = undefined;
    },
  };
}
