import assert from "node:assert/strict";
import { test } from "node:test";

import { createSessionDataStore } from "../extensions/jefferson/session-data-store.ts";
import type { Readings, SessionDataStore } from "../extensions/jefferson/session-data-store.ts";

/** The seed every test below starts from: a session with a provider, model, and level. */
const seed: Readings = {
  provider: "anthropic",
  model: "claude-opus-4",
  thinkingLevel: "high",
};

/** A store over `readings`, plus the count of repaints it has requested. */
function newStore(readings: Readings): { store: SessionDataStore; repaints: () => number } {
  let repaints = 0;
  const store = createSessionDataStore({
    seed: readings,
    requestRender: () => void repaints++,
  });
  return { store, repaints: () => repaints };
}

test("a sample is exactly the three datums, in order, carrying the seed", () => {
  const { store } = newStore(seed);
  const sample = store.sample();
  assert.deepEqual(Object.keys(sample), ["provider", "model", "thinkingLevel"]);
  assert.deepEqual(sample, seed);
});

test("a datum seeded undefined reads undefined, not an empty string and not zero", () => {
  const { store } = newStore({ provider: undefined, model: undefined, thinkingLevel: undefined });
  const sample = store.sample();
  assert.equal(sample.provider, undefined);
  assert.equal(sample.model, undefined);
  assert.equal(sample.thinkingLevel, undefined);
  assert.notEqual(sample.provider, "");
  assert.notEqual(sample.model, 0);
});

test("a datum seeded with an empty string reads it, distinguishable from unknown", () => {
  const { store } = newStore({ provider: "anthropic", model: "", thinkingLevel: undefined });
  const sample = store.sample();
  assert.equal(sample.model, "");
  assert.equal(sample.thinkingLevel, undefined);
  assert.notEqual(sample.model, sample.thinkingLevel);
});

test("a model selection replaces the held provider and model", () => {
  const { store } = newStore(seed);
  store.modelSelected("openai", "gpt-5");
  const sample = store.sample();
  assert.equal(sample.provider, "openai");
  assert.equal(sample.model, "gpt-5");
  assert.equal(sample.thinkingLevel, "high", "the level is not the model's to change");
});

test("a thinking-level selection replaces the held level", () => {
  const { store } = newStore(seed);
  store.thinkingLevelSelected("low");
  const sample = store.sample();
  assert.equal(sample.thinkingLevel, "low");
  assert.equal(sample.provider, "anthropic", "the model is not the level's to change");
  assert.equal(sample.model, "claude-opus-4");
});

test("a restore-style push carrying the seeded values changes nothing", () => {
  const { store } = newStore(seed);
  store.modelSelected("anthropic", "claude-opus-4");
  store.thinkingLevelSelected("high");
  assert.deepEqual(store.sample(), seed);
});

test("a sample handed out earlier keeps its values after a later push", () => {
  const { store } = newStore(seed);
  const before = store.sample();
  store.modelSelected("openai", "gpt-5");
  assert.deepEqual(before, seed, "the earlier sample is a value, not a live view");
  assert.equal(store.sample().model, "gpt-5");
});

test("a model selection that changes a datum requests exactly one repaint", () => {
  const { store, repaints } = newStore(seed);
  store.modelSelected("openai", "gpt-5");
  assert.equal(repaints(), 1, "one repaint, though two datums changed");
  store.modelSelected("openai", "gpt-5.1");
  assert.equal(repaints(), 2, "a changed model alone also repaints once");
});

test("a thinking-level selection that changes the level requests exactly one repaint", () => {
  const { store, repaints } = newStore(seed);
  store.thinkingLevelSelected("low");
  assert.equal(repaints(), 1);
});

test("a push carrying the values the store already holds requests no repaint", () => {
  const { store, repaints } = newStore(seed);
  store.modelSelected("anthropic", "claude-opus-4");
  store.thinkingLevelSelected("high");
  assert.equal(repaints(), 0);
});

test("disposal is idempotent", () => {
  const { store } = newStore(seed);
  store.dispose();
  assert.doesNotThrow(() => store.dispose(), "a second dispose does nothing");
});

test("a disposed store reads all three datums unknown, synchronously", () => {
  const { store } = newStore(seed);
  store.dispose();
  const sample = store.sample();
  assert.deepEqual(sample, {
    provider: undefined,
    model: undefined,
    thinkingLevel: undefined,
  });
});

test("a push after disposal requests no repaint", () => {
  const { store, repaints } = newStore(seed);
  store.dispose();
  store.modelSelected("openai", "gpt-5");
  store.thinkingLevelSelected("low");
  assert.equal(repaints(), 0);
});

test("a disposed store and its all-unknown replacement both read without throwing", () => {
  const first = newStore(seed);
  first.store.dispose();
  const second = newStore({ provider: undefined, model: undefined, thinkingLevel: undefined });
  assert.doesNotThrow(() => first.store.sample());
  assert.doesNotThrow(() => second.store.sample());
  assert.equal(second.store.sample().model, undefined);
});
