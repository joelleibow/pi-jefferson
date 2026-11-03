/**
 * The session data store: the session data an instrument displays, kept current behind the
 * scenes so an instrument only reads it.
 *
 * The store holds exactly the datums a shipped instrument displays — the active provider, the
 * active model, and the active thinking level — and nothing else (D2, D3). It holds no host
 * handle but the injected `requestRender` callback, so this file has no import at all; a host
 * context never reaches it, and every value leaves `session_start` as a plain string (D8).
 */

/** One datum's value. `undefined` is unknown — never `""`, never `0`, never a stale value. */
export type Reading = string | undefined;

/** The values one render observes, taken once at the start of that render (D4). */
export interface Readings {
  readonly provider: Reading;
  readonly model: Reading;
  readonly thinkingLevel: Reading;
}

export interface SessionDataStore {
  /** This render's values, taken once per render. Total: never blocks, awaits, or throws. */
  sample(): Readings;
  /** A model selection push, already unwrapped from the host's event. */
  modelSelected(provider: string, model: string): void;
  /** A thinking-level selection push, already unwrapped from the host's event. */
  thinkingLevelSelected(level: string): void;
  /** Releases the store. Idempotent. */
  dispose(): void;
}

export function createSessionDataStore(options: {
  seed: Readings;
  requestRender: () => void;
}): SessionDataStore {
  let provider = options.seed.provider;
  let model = options.seed.model;
  let thinkingLevel = options.seed.thinkingLevel;
  // Cleared on disposal, not merely flagged: the callback closes over the host's `tui`, so
  // dropping it releases that handle too (D8).
  let requestRender: (() => void) | undefined = options.requestRender;

  return {
    // A value, not a live view: the object a render holds keeps the values it was handed.
    sample: () =>
      requestRender === undefined
        ? { provider: undefined, model: undefined, thinkingLevel: undefined }
        : { provider, model, thinkingLevel },
    modelSelected(nextProvider, nextModel) {
      if (requestRender === undefined) return;
      const changed = nextProvider !== provider || nextModel !== model;
      provider = nextProvider;
      model = nextModel;
      if (changed) requestRender(); // one repaint per push, not one per datum (D7)
    },
    thinkingLevelSelected(level) {
      if (requestRender === undefined) return;
      const changed = level !== thinkingLevel;
      thinkingLevel = level;
      if (changed) requestRender();
    },
    dispose() {
      requestRender = undefined;
    },
  };
}
