/** Session datums and usage derivations; the session data feed supplies readers, never a host handle. */
import type { ContextUsage, SessionEntry } from "@earendil-works/pi-coding-agent";

/** `undefined` is unknown — never an empty string, zero, or a stale value. */
export type Reading = string | undefined;

export interface UsageTotals {
  readonly input: number;
  readonly output: number;
  readonly cacheRead: number;
  readonly cacheWrite: number;
  readonly cost: number;
}

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
}

export interface SessionDataStore {
  sample(): Readings;
  modelSelected(provider: string, model: string): void;
  thinkingLevelSelected(level: string): void;
  branchChanged(branch: string | null): void;
  sessionNamed(name: string | undefined): void;
  readStatusesFrom(read: () => ReadonlyMap<string, string>): void;
  turnEnded(): void;
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

  return {
    sample() {
      if (readUsage === undefined || readEntries === undefined) {
        return {
          provider: undefined, model: undefined, thinkingLevel: undefined, cwd: undefined, home: undefined,
          branch: undefined, sessionName: undefined, statuses: undefined, contextUsage: undefined, totals: undefined,
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
      requestRender = undefined;
      readUsage = undefined;
      readEntries = undefined;
      readStatuses = undefined;
      scanCache = undefined;
    },
  };
}
