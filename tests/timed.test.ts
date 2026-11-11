import assert from "node:assert/strict";
import { test } from "node:test";

import { timed } from "../extensions/jefferson/components/visuals/timed.ts";

/** A clock the test moves; the visual sees it only through the two instants it is given. */
function fakeClock(start = 0): { now: () => number; advance: (ms: number) => void } {
  let now = start;
  return { now: () => now, advance: (ms) => void (now += ms) };
}

test("the timed visual shows its text while the render's instant is before the datum's", () => {
  const clock = fakeClock();
  const shownUntil = clock.now() + 10_000;
  clock.advance(9_999);
  assert.equal(timed("Notice: Cache miss: 20k tokens re-billed", shownUntil, clock.now()),
    "Notice: Cache miss: 20k tokens re-billed", "one millisecond before the instant");
});

test("the timed visual hands out nothing at the instant and after it", () => {
  const clock = fakeClock();
  const shownUntil = clock.now() + 10_000;
  clock.advance(10_000);
  assert.equal(timed("Notice: Cache miss: 20k tokens re-billed", shownUntil, clock.now()), undefined, "at the instant");
  clock.advance(1);
  assert.equal(timed("Notice: Cache miss: 20k tokens re-billed", shownUntil, clock.now()), undefined, "after it");
});

test("a missing instant on either side hides the text", () => {
  assert.equal(timed("Notice: 20k", undefined, 0), undefined, "the reading carries no shown-until instant");
  assert.equal(timed("Notice: 20k", 2_000, undefined), undefined, "the render carries no instant");
  assert.equal(timed("Notice: 20k", undefined, undefined), undefined, "neither");
});

test("the text it was given comes back unchanged, an empty one included", () => {
  assert.equal(timed("", 2_000, 1_999), "", "an empty text before the instant is the text");
  assert.equal(timed("", 2_000, 2_000), undefined, "and hides at it");
  const text = "Notice: Cache miss after 6m idle: 125k tokens re-billed";
  assert.equal(timed(text, 1, 0), text, "the same string, not a copy of another");
});
