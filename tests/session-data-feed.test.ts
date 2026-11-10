import assert from "node:assert/strict";
import { homedir } from "node:os";
import { test } from "node:test";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import { feedSessionData } from "../extensions/jefferson/data/session-data-feed.ts";

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
function fakeContext() {
  const ctx = {
    cwd: "/Users/joelleibow/Projects/pi-jefferson",
    model: { provider: "anthropic", id: "claude-opus-4" },
    thinkingLevel: "high",
    getContextUsage: () => undefined,
    sessionManager: {
      getSessionName: () => undefined,
      getSessionId: () => "session-1",
      getLeafId: () => null,
      getEntries: () => [],
    },
  };
  return ctx as unknown as ExtensionContext;
}

/** The feed built over the fakes, its home read supplied as the composition root supplies it. */
function feed(readHome: () => string) {
  const host = fakePi();
  const repaints = { count: 0 };
  const fed = feedSessionData(host.pi, fakeContext(), () => void (repaints.count += 1), readHome);
  return { ...fed, fire: host.fire, released: host.released, repaints: () => repaints.count };
}

test("the home directory is the one the host process reports, and none is unknown", (t) => {
  const previous = process.env.HOME;
  t.after(() => {
    if (previous === undefined) delete process.env.HOME;
    else process.env.HOME = previous;
  });

  process.env.HOME = "/Users/joelleibow";
  assert.equal(feed(homedir).store.sample().home, "/Users/joelleibow");
  assert.equal(homedir(), "/Users/joelleibow", "the process pi runs in reports this home");

  process.env.HOME = "";
  const session = feed(homedir);
  assert.equal(session.store.sample().home, undefined, "an empty home is unknown");
  assert.notEqual(session.store.sample().home, "", "never an empty string");
  assert.equal(session.store.sample().model, "claude-opus-4", "the session still starts");
});

test("a reader that reports an empty home leaves the store's home unknown", () => {
  const { store } = feed(() => "");
  assert.equal(store.sample().home, undefined);
  assert.notEqual(store.sample().home, "", "unknown is not an empty string");
});

test("a reader that throws leaves home unknown and the session still starts", () => {
  const { store } = feed(() => {
    throw new Error("no password database");
  });
  assert.equal(store.sample().home, undefined);
  assert.equal(store.sample().model, "claude-opus-4", "a failed home lookup does not stop the install");
});
