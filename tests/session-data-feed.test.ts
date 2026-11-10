import assert from "node:assert/strict";
import { homedir } from "node:os";
import { test } from "node:test";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import { feedSessionData, type FooterDatumSource } from "../extensions/jefferson/data/session-data-feed.ts";

/** The host's `pi.on` register: the handlers a test can fire, and the releases the feed ran. */
function fakePi() {
  const handlers = new Map<string, (event: unknown) => void>();
  const released: string[] = [];
  const pi = {
    on: (event: string, handler: (event: unknown) => void) => {
      handlers.set(event, handler);
      return () => void released.push(event);
    },
  };
  return {
    pi: pi as unknown as ExtensionAPI,
    fire: (event: string, payload?: unknown) => handlers.get(event)?.(payload),
    released,
  };
}

/** The host's session context, faked at the boundary; nothing here is the code under test. */
function fakeContext(options: { sessionName?: string } = {}) {
  const ctx = {
    cwd: "/Users/joelleibow/Projects/pi-jefferson",
    model: { provider: "anthropic", id: "claude-opus-4" },
    thinkingLevel: "high",
    getContextUsage: () => undefined,
    sessionManager: {
      getSessionName: () => options.sessionName,
      getSessionId: () => "session-1",
      getLeafId: () => null,
      getEntries: () => [],
    },
  };
  return ctx as unknown as ExtensionContext;
}

/** The feed built over the fakes, its home read supplied as the composition root supplies it. */
function feed(options: { sessionName?: string; readHome?: () => string } = {}) {
  const host = fakePi();
  const repaints = { count: 0 };
  const readHome = options.readHome ?? (() => "/Users/joelleibow");
  const fed = feedSessionData(host.pi, fakeContext(options), () => void (repaints.count += 1), readHome);
  return { ...fed, fire: host.fire, released: host.released, repaints: () => repaints.count };
}

test("the home directory is the one the host process reports, and none is unknown", (t) => {
  const previous = process.env.HOME;
  t.after(() => {
    if (previous === undefined) delete process.env.HOME;
    else process.env.HOME = previous;
  });

  process.env.HOME = "/Users/joelleibow";
  assert.equal(feed({ readHome: homedir }).store.sample().home, "/Users/joelleibow");
  assert.equal(homedir(), "/Users/joelleibow", "the process pi runs in reports this home");

  process.env.HOME = "";
  const session = feed({ readHome: homedir });
  assert.equal(session.store.sample().home, undefined, "an empty home is unknown");
  assert.notEqual(session.store.sample().home, "", "never an empty string");
  assert.equal(session.store.sample().model, "claude-opus-4", "the session still starts");
});

test("a reader that reports an empty home leaves the store's home unknown", () => {
  const { store } = feed({ readHome: () => "" });
  assert.equal(store.sample().home, undefined);
  assert.notEqual(store.sample().home, "", "unknown is not an empty string");
});

test("a reader that throws leaves home unknown and the session still starts", () => {
  const { store } = feed({
    readHome: () => {
      throw new Error("no password database");
    },
  });
  assert.equal(store.sample().home, undefined);
  assert.equal(store.sample().model, "claude-opus-4", "a failed home lookup does not stop the install");
});

/** The footer's own data, faked at the boundary: a branch a test can move and statuses it can set. */
function fakeFooterData(options: { branch?: string | null; statuses?: Array<[string, string]> } = {}) {
  let branch = options.branch ?? null;
  const statuses = new Map<string, string>(options.statuses ?? []);
  const held: Array<() => void> = [];
  const everTaken: Array<() => void> = [];
  const counts = { reads: 0, statusReads: 0, subscriptions: 0, releases: 0 };
  const source: FooterDatumSource = {
    getGitBranch: () => {
      counts.reads += 1;
      return branch;
    },
    onBranchChange: (listener) => {
      counts.subscriptions += 1;
      held.push(listener);
      everTaken.push(listener);
      return () => {
        counts.releases += 1;
        const at = held.indexOf(listener);
        if (at >= 0) held.splice(at, 1);
      };
    },
    getExtensionStatuses: () => {
      counts.statusReads += 1;
      return statuses;
    },
  };
  return {
    source,
    counts,
    statuses,
    subscriptionsHeld: () => held.length,
    /** Every listener ever taken, as a host that ignores its own unsubscribe would fire them. */
    fireAfterRelease: () => {
      for (const listener of everTaken) listener();
    },
    /** A branch the host now reports, announced to the listeners still subscribed. */
    change(next: string | null) {
      branch = next;
      for (const listener of [...held]) listener();
    },
  };
}

test("no footer data means the branch and the statuses read unknown", () => {
  const { store } = feed();
  const sample = store.sample();
  assert.equal(sample.branch, undefined);
  assert.equal(sample.statuses, undefined);
});

test("the attach seeds the branch before the first render, and no sample asks the host again", () => {
  const { store, attachFooterData } = feed();
  const footer = fakeFooterData({ branch: "main" });
  attachFooterData(footer.source);

  assert.equal(store.sample().branch, "main", "the branch is held before the first render");
  assert.equal(footer.counts.reads, 1, "one read at the attach");
  store.sample();
  store.sample();
  assert.equal(footer.counts.reads, 1, "no sample asks the host for the branch");
  assert.equal(footer.counts.subscriptions, 1);
});

test("a branch change is pushed and repaints once, and the held branch repaints nothing", () => {
  const { store, attachFooterData, repaints } = feed();
  const footer = fakeFooterData({ branch: "main" });
  attachFooterData(footer.source);
  const seeded = repaints();

  footer.change("feature/x");
  assert.equal(store.sample().branch, "feature/x");
  assert.equal(repaints(), seeded + 1);
  footer.change("feature/x");
  assert.equal(repaints(), seeded + 1, "a change to the branch already held repaints nothing");
});

test("a null branch is unknown, and an empty string is a datum the store keeps", () => {
  const { store, attachFooterData } = feed();
  attachFooterData(fakeFooterData({ branch: null }).source);
  assert.equal(store.sample().branch, undefined);
  assert.notEqual(store.sample().branch, "", "unknown is not an empty string");
  store.branchChanged("");
  assert.equal(store.sample().branch, "", "an empty string the host reported is kept as it is");
});

test("an attach after the release takes no subscription and seeds nothing", () => {
  const { store, attachFooterData, release } = feed();
  release();
  const footer = fakeFooterData({ branch: "main" });
  attachFooterData(footer.source);
  assert.equal(footer.counts.subscriptions, 0);
  assert.equal(footer.subscriptionsHeld(), 0);
  assert.equal(footer.counts.reads, 0, "nothing was seeded");
  assert.equal(store.sample().branch, undefined);
});

test("a second attach releases the first's subscription, and only the second's runs", () => {
  const { store, attachFooterData } = feed();
  const first = fakeFooterData({ branch: "main" });
  const second = fakeFooterData({ branch: "feature/x" });
  attachFooterData(first.source);
  attachFooterData(second.source);

  assert.equal(first.counts.releases, 1, "the first build's subscription is released");
  assert.equal(first.subscriptionsHeld(), 0);
  assert.equal(second.subscriptionsHeld(), 1);
  assert.equal(store.sample().branch, "feature/x");

  first.change("stale");
  assert.equal(store.sample().branch, "feature/x", "the released build's branch reaches nothing");
  second.change("newer");
  assert.equal(store.sample().branch, "newer");
});

test("a branch listener fired after the release touches no store code and requests no repaint", () => {
  const { attachFooterData, release, repaints } = feed();
  const footer = fakeFooterData({ branch: "main" });
  attachFooterData(footer.source);
  release();

  const repaintsAtRelease = repaints();
  const readsAtRelease = footer.counts.reads;
  footer.fireAfterRelease();
  assert.equal(repaints(), repaintsAtRelease, "no repaint");
  assert.equal(footer.counts.reads, readsAtRelease, "the store was not asked to read the branch");
});

test("the release takes the branch subscription and the name subscription with the rest", () => {
  const { attachFooterData, release, released } = feed();
  const footer = fakeFooterData({ branch: "main" });
  attachFooterData(footer.source);
  release();
  assert.equal(footer.counts.releases, 1);
  assert.deepEqual(released, [
    "model_select", "thinking_level_select", "turn_end", "session_info_changed",
  ]);
});

test("the session's name is seeded at the start and pushed by the event the host announces", () => {
  const { store, fire, repaints } = feed({ sessionName: "refactor footer" });
  assert.equal(store.sample().sessionName, "refactor footer");

  fire("session_info_changed", { type: "session_info_changed", name: "docs" });
  assert.equal(store.sample().sessionName, "docs");
  assert.equal(repaints(), 1);
  fire("session_info_changed", { type: "session_info_changed", name: undefined });
  assert.equal(store.sample().sessionName, undefined, "a cleared name is unknown, never the old one");
  assert.equal(repaints(), 2, "clearing the name is a change");
});

test("statuses are read on every sample and an empty set reads unknown", () => {
  const { store, attachFooterData } = feed();
  const footer = fakeFooterData({ statuses: [["b", "idle"], ["a", "3 tasks"]] });
  attachFooterData(footer.source);

  assert.equal(store.sample().statuses, footer.statuses, "the host's map, held raw");
  assert.equal(store.sample().statuses?.size, 2, "and read again for the next sample");
  footer.statuses.clear();
  assert.equal(store.sample().statuses, undefined, "statuses cleared by the host read unknown");
});
