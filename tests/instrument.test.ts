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

const seed: Readings = { provider: "anthropic", model: "claude-opus-4", thinkingLevel: "high" };
const unknown: Readings = { provider: undefined, model: undefined, thinkingLevel: undefined };

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
  };
}

test("blank resolves the placeholder for any readings", () => {
  assert.equal(blank.resolve(seed), DEFAULT_CELL_TEXT);
  assert.equal(blank.resolve(unknown), DEFAULT_CELL_TEXT);
});

test("blank reads no datum", () => {
  assert.equal(blank.resolve(unreadable()), DEFAULT_CELL_TEXT);
});

test("model resolves the provider as label over the model as data", () => {
  assert.equal(model.resolve(seed), "anthropic: claude-opus-4");
});

test("thinking resolves a literal label over the level as data", () => {
  assert.equal(thinking.resolve(seed), "thinking: high");
  assert.equal(thinking.resolve({ ...seed, thinkingLevel: "off" }), "thinking: off");
});

test("model yields an empty string when either half is unknown", () => {
  assert.equal(
    model.resolve({ provider: undefined, model: "claude-opus-4", thinkingLevel: "high" }),
    "",
  );
  assert.equal(
    model.resolve({ provider: "anthropic", model: undefined, thinkingLevel: "high" }),
    "",
  );
});

test("thinking yields an empty string when the level is unknown", () => {
  assert.equal(
    thinking.resolve({ provider: "anthropic", model: "claude-opus-4", thinkingLevel: undefined }),
    "",
  );
});

test("model reads no datum its text does not use", () => {
  const readings: Readings = {
    provider: "anthropic",
    model: "claude-opus-4",
    get thinkingLevel(): Reading {
      throw new Error("model read the thinking level");
    },
  };
  assert.equal(model.resolve(readings), "anthropic: claude-opus-4");
});

test("thinking reads no datum its text does not use", () => {
  const readings: Readings = {
    get provider(): Reading {
      throw new Error("thinking read the provider");
    },
    get model(): Reading {
      throw new Error("thinking read the model");
    },
    thinkingLevel: "high",
  };
  assert.equal(thinking.resolve(readings), "thinking: high");
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
