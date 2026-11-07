/** What keeps the session data current: the seed, the readers of the host's session, and its pushes. */
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import { createSessionDataStore, type SessionDataStore } from "./session-data-store.ts";

/**
 * Create this install's store from the host's context, subscribe to the events that move it, and
 * hand back the store with the one release that undoes both.
 */
export function feedSessionData(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  requestRender: () => void,
): { store: SessionDataStore; release: () => void } {
  // Seeded from the context because the host reports no selection when it restores a session.
  const store = createSessionDataStore({
    seed: {
      provider: ctx.model?.provider,
      model: ctx.model?.id,
      thinkingLevel: ctx.thinkingLevel,
      cwd: ctx.cwd,
    },
    requestRender,
    readUsage: () => ({
      contextUsage: ctx.getContextUsage(),
      sessionId: ctx.sessionManager.getSessionId(),
      leafId: ctx.sessionManager.getLeafId(),
    }),
    readEntries: () => ctx.sessionManager.getEntries(),
  });

  // Pushes are unwrapped here, so the store names no host event.
  const releaseModel = pi.on("model_select", (event) =>
    store.modelSelected(event.model.provider, event.model.id),
  );
  const releaseThinking = pi.on("thinking_level_select", (event) =>
    store.thinkingLevelSelected(event.level),
  );
  const releaseTurn = pi.on("turn_end", () => store.turnEnded());

  // The single teardown: all three subscriptions and the store, released together. Two
  // callers reach it — the host's `dispose()` and the next session's `releasePrevious()`.
  let released = false;
  const release = (): void => {
    if (released) return;
    released = true;
    releaseModel();
    releaseThinking();
    releaseTurn();
    store.dispose();
  };
  return { store, release };
}
