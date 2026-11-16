import assert from "node:assert/strict";
import { test } from "node:test";

import { createEventBus } from "@earendil-works/pi-coding-agent";

import type { InstrumentDeclaration } from "../extensions/jefferson/components/instruments/instrument.ts";
import { createRegistrationListener } from "../extensions/jefferson/registration-listener.ts";
import {
  createRegistry, isNamePart, isProvidedName, normalizeName,
} from "../extensions/jefferson/registration.ts";
import { SHIPPED } from "../extensions/jefferson/shipped.ts";

test("A8 isProvidedName treats jeffersonfan.stats as provided", () => {
  assert.equal(isProvidedName("jeffersonfan.stats"), true, "the comparison is on the whole first part");
  assert.equal(isProvidedName("taiknr.savings"), true);
  assert.equal(isProvidedName("jefferson.default.path"), false);
  assert.equal(isProvidedName("jefferson.custom.mine"), false, "three parts belong to Jefferson");
});

test("A8 isNamePart refuses a dotted part", () => {
  assert.equal(isNamePart("savings"), true);
  assert.equal(isNamePart("savings-total"), true);
  assert.equal(isNamePart("custom.mine"), false, "one part carries no dot");
  assert.equal(isNamePart("Savings"), false);
  assert.equal(isNamePart(""), false);
  assert.equal(isNamePart("2savings"), false);
});

test("A8 normalizeName leaves a written full name and a three-part name alone", () => {
  assert.equal(normalizeName("path"), "jefferson.default.path");
  assert.equal(normalizeName("taiknr.savings"), "taiknr.savings");
  assert.equal(normalizeName("jefferson.default.path"), "jefferson.default.path");
  assert.equal(normalizeName("a.b.c"), "a.b.c");
});

test("A8 an inherited or unimplemented name is undefined twice", () => {
  const declaration: InstrumentDeclaration = { name: "taiknr.savings", variables: {}, defaultFormat: "Savings", options: [] };
  const registry = createRegistry();
  registry.accept("taiknr", [declaration]);
  assert.equal(registry.instrument("taiknr.savings"), declaration, "the accepted name answers");
  for (const name of ["git", "nope", "toString", "constructor", "hasOwnProperty", "__proto__"]) {
    assert.equal(registry.instrument(name), undefined, name);
    assert.equal(registry.instrument(name), undefined, name);
  }
});

test("A8 Jefferson's own payload registers every shipped name, with no session", () => {
  const events = createEventBus();
  const registry = createRegistry();
  createRegistrationListener({ events, registry, own: { extension: "jefferson", instruments: SHIPPED } });
  for (const declaration of SHIPPED) {
    assert.equal(registry.instrument(declaration.name), declaration, declaration.name);
  }
});
