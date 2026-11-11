/** What keeps the session data current: the seed, the readers of the host's session, and its pushes. */
import type { ExtensionAPI, ExtensionContext, MessageEndEvent } from "@earendil-works/pi-coding-agent";

import { createSessionDataStore, type Reading, type SessionDataStore } from "./session-data-store.ts";

/**
 * The footer-only host data this feed needs, as a shape rather than pi's type: the branch, its
 * announcement and the statuses. The footer's factory is the one edge that names the host's type.
 */
export interface FooterDatumSource {
  getGitBranch(): string | null;
  onBranchChange(listener: () => void): () => void;
  getExtensionStatuses(): ReadonlyMap<string, string>;
}

/** The home directory pi's own footer reads, from the process pi runs in; unknown when there is none. */
function homeDirectory(readHome: () => string): Reading {
  try {
    return readHome() || undefined;
  } catch {
    // A failed password-database lookup must not stop the install; the path stays absolute.
    return undefined;
  }
}

/**
 * Create this install's store from the host's context, subscribe to the events that move it, and
 * hand back the store, the one release that undoes both, and the attachment the footer's own data
 * enters through.
 */
export function feedSessionData(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  requestRender: () => void,
  readHome: () => string,
  now: () => number,
  schedule: (callback: () => void, delayMs: number) => () => void,
  noticeSeconds: number | undefined,
): { store: SessionDataStore; release: () => void; attachFooterData: (footerData: FooterDatumSource) => void } {
  // Seeded from the context because the host reports no selection when it restores a session.
  const store = createSessionDataStore({
    seed: {
      provider: ctx.model?.provider,
      model: ctx.model?.id,
      thinkingLevel: ctx.thinkingLevel,
      cwd: ctx.cwd,
      home: homeDirectory(readHome),
      sessionName: ctx.sessionManager.getSessionName(),
    },
    requestRender,
    readUsage: () => ({
      contextUsage: ctx.getContextUsage(),
      sessionId: ctx.sessionManager.getSessionId(),
      leafId: ctx.sessionManager.getLeafId(),
    }),
    readEntries: () => ctx.sessionManager.getEntries(),
    readBranch: () => ctx.sessionManager.getBranch(),
    now,
    schedule,
    ...(noticeSeconds === undefined ? {} : { noticeSeconds }),
  });

  // Pushes are unwrapped here, so the store names no host event.
  const releaseModel = pi.on("model_select", (event) =>
    store.modelSelected(event.model.provider, event.model.id),
  );
  const releaseThinking = pi.on("thinking_level_select", (event) =>
    store.thinkingLevelSelected(event.level),
  );
  const releaseTurn = pi.on("turn_end", () => store.turnEnded());
  const releaseName = pi.on("session_info_changed", (event) => store.sessionNamed(event.name));

  // The notice subscriptions exist only while a row places a notice cell: a document without one
  // pays nothing for a notice, and the store is given no visible time.
  const noticeSubscriptions: Array<() => void> = [];
  if (noticeSeconds !== undefined) {
    const cacheReadRate = (message: MessageEndEvent["message"]): number | undefined =>
      message.role === "assistant"
        ? (ctx.modelRegistry.find(message.provider, message.model)?.cost.cacheRead ?? 0) / 1_000_000
        : undefined;
    noticeSubscriptions.push(
      pi.on("message_end", (event) => store.messageEnded(event.message, cacheReadRate(event.message))),
      pi.on("session_compact", (event) => store.compactionEnded(event.compactionEntry.usage)),
      pi.on("session_tree", (event) => store.branchSummarised(event.summaryEntry?.usage)),
    );
  }

  let released = false;
  let releaseBranch: (() => void) | undefined;

  // The branch and the statuses exist only inside the footer's construction, so the footer's
  // factory hands them here. A second attachment replaces the first's subscription; an
  // attachment after the release takes none, and a listener the host fires after it is ignored.
  const attachFooterData = (footerData: FooterDatumSource): void => {
    if (released) return;
    releaseBranch?.();
    store.readStatusesFrom(() => footerData.getExtensionStatuses());
    store.branchChanged(footerData.getGitBranch());
    releaseBranch = footerData.onBranchChange(() => {
      if (released) return;
      store.branchChanged(footerData.getGitBranch());
    });
  };

  // The single teardown: every subscription and the store, released together. Two callers
  // reach it — the host's `dispose()` and the next session's `releasePrevious()`.
  const release = (): void => {
    if (released) return;
    released = true;
    releaseBranch?.();
    releaseBranch = undefined;
    releaseModel();
    releaseThinking();
    releaseTurn();
    releaseName();
    for (const releaseNotice of noticeSubscriptions) releaseNotice();
    store.dispose();
  };
  return { store, release, attachFooterData };
}
