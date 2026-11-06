import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_CELL_TEXT,
  blank,
  instrumentNamed,
  model,
  thinking,
} from "../extensions/jefferson/instrument.ts";
import type { Reading, Readings } from "../extensions/jefferson/session-data-store.ts";

const seed: Readings = { provider: "anthropic", model: "claude-opus-4", thinkingLevel: "high", cwd: undefined, contextUsage: undefined, totals: undefined };
const unknown: Readings = { provider: undefined, model: undefined, thinkingLevel: undefined, cwd: undefined, contextUsage: undefined, totals: undefined };

/** Readings whose every datum throws if it is read, so a datum read fails the test. */
function unreadable(): Readings {
  const fail = (): never => {
    throw new Error("the instrument read a datum it does not display");
  };
  return {
    get provider() {
      return fail();
    },
    get model() {
      return fail();
    },
    get thinkingLevel() {
      return fail();
    },
    get cwd() {
      return fail();
    },
    get contextUsage() {
      return fail();
    },
    get totals() {
      return fail();
    },
  };
}

test("blank resolves the placeholder for any readings", () => {
  assert.equal(blank.render(seed, 80), DEFAULT_CELL_TEXT);
  assert.equal(blank.render(unknown, 80), DEFAULT_CELL_TEXT);
});

test("blank reads no datum", () => {
  assert.equal(blank.render(unreadable(), 80), DEFAULT_CELL_TEXT);
});

test("model resolves the provider as label over the model as data", () => {
  assert.equal(model.render(seed, 80), "anthropic: claude-opus-4");
});

test("thinking resolves a literal label over the level as data", () => {
  assert.equal(thinking.render(seed, 80), "thinking: high");
  assert.equal(thinking.render({ ...seed, thinkingLevel: "off" }, 80), "thinking: off");
});

test("model yields an empty string when either half is unknown", () => {
  assert.equal(
    model.render({ ...unknown, provider: undefined, model: "claude-opus-4", thinkingLevel: "high" }, 80),
    "",
  );
  assert.equal(
    model.render({ ...unknown, provider: "anthropic", model: undefined, thinkingLevel: "high" }, 80),
    "",
  );
});

test("thinking yields an empty string when the level is unknown", () => {
  assert.equal(
    thinking.render({ ...unknown, provider: "anthropic", model: "claude-opus-4", thinkingLevel: undefined }, 80),
    "",
  );
});

test("model reads no datum its text does not use", () => {
  const readings: Readings = {
    ...unknown,
    provider: "anthropic",
    model: "claude-opus-4",
    get thinkingLevel(): Reading {
      throw new Error("model read the thinking level");
    },
  };
  assert.equal(model.render(readings, 80), "anthropic: claude-opus-4");
});

test("thinking reads no datum its text does not use", () => {
  const readings: Readings = {
    ...unknown,
    get provider(): Reading {
      throw new Error("thinking read the provider");
    },
    get model(): Reading {
      throw new Error("thinking read the model");
    },
    thinkingLevel: "high",
  };
  assert.equal(thinking.render(readings, 80), "thinking: high");
});

test("each shipped name resolves the instrument that name denotes", () => {
  assert.equal(instrumentNamed("blank"), blank);
  assert.equal(instrumentNamed("model"), model);
  assert.equal(instrumentNamed("thinking"), thinking);
});

test("a name the extension does not implement stays unresolved, however often it is asked", () => {
  assert.equal(instrumentNamed("nope"), undefined);
  assert.equal(instrumentNamed("nope"), undefined, "the lookup gained nothing from the first ask");
});
