import assert from "node:assert/strict";
import { test } from "node:test";

import { createEventBus } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences, truncateToWidth } from "@earendil-works/pi-tui";

import type { InstrumentDeclaration } from "../extensions/jefferson/components/instruments/instrument.ts";
import { adaptProvidedDeclaration } from "../extensions/jefferson/components/instruments/instrument-binding.ts";
import type { Readings } from "../extensions/jefferson/data/session-data-store.ts";
import { createProviderFields } from "../extensions/jefferson/data/provider-fields.ts";
import { createRegistrationListener } from "../extensions/jefferson/registration-listener.ts";
import {
  createRegistry, isNamePart, isProvidedName, normalizeName,
} from "../extensions/jefferson/registration.ts";
import { DEFAULT_CELL_TEXT } from "../extensions/jefferson/components/instruments/instrument.ts";
import type { ProvidedDeclaration, Registration, ReadingsView } from "../extensions/jefferson/instrument-contract.ts";
import { SHIPPED } from "../extensions/jefferson/shipped.ts";
import {
  harness, useTempAgentDir, writeAgentDocument, type FakeSession,
} from "./session-harness.ts";

/**
 * The registration taiknr posts: one instrument whose one resolver reads the string field `saved`.
 * The field is reported with a value that renders as it was written, so a line proves the report
 * reached the resolver.
 */
const registration: Registration = {
  extension: "taiknr",
  fields: { saved: "string" },
  instruments: [
    {
      name: "savings",
      variables: { saved: (readings: ReadingsView) => typeof readings.saved === "string" ? readings.saved : undefined },
      defaultFormat: "Savings: $saved",
    },
  ],
};

/** One report of taiknr's field, as the provider posts it. */
function saved(value: string): { extension: string; field: string; value: string } {
  return { extension: "taiknr", field: "saved", value };
}

/** Write a document whose rows name the instruments given, one row per list. */
function documentShowing(t: { after(fn: () => void): void }, rows: string[][]): void {
  writeAgentDocument(useTempAgentDir(t), {
    rows: rows.map(row => row.map(instrument => ({ instrument }))),
  });
}

/** The first line the footer draws, without the host's framing or its padding. */
function line(session: FakeSession, width = 80): string {
  return stripTerminalSequences(session.lines(width)[0] ?? "").trimEnd();
}

/** What a cell holding nothing but the fallback draws: the placeholder, clipped to the row. */
function placeholder(width = 80): string {
  return stripTerminalSequences(truncateToWidth(DEFAULT_CELL_TEXT, width)).trimEnd();
}

test("A1 a registration on jefferson:registration renders in a row that names it", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  h.events.emit("jefferson:registration", registration);
  h.events.emit("jefferson:update", saved("$4.10"));
  const session = await h.start();
  assert.equal(line(session), "Savings: $4.10");
  assert.deepEqual(session.notified, []);
});

test("A1 one message registers two instruments", async (t) => {
  documentShowing(t, [["taiknr.savings", "taiknr.stubs"]]);
  const h = harness();
  h.events.emit("jefferson:registration", {
    ...registration,
    instruments: [
      ...registration.instruments,
      { name: "stubs", variables: { stubs: () => "3" }, defaultFormat: "Stubs: $stubs" },
    ],
  });
  h.events.emit("jefferson:update", saved("$4.10"));
  const session = await h.start();
  assert.equal(line(session), "Savings: $4.10 Stubs: 3");
});

test("A1 a registration from beforeFactory is not registered, and the same payload after the factory is", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  // The bus replays nothing and Jefferson subscribes in its factory, so a provider that loads first
  // is never heard (the Risks list's first row).
  const early = harness({ beforeFactory: events => events.emit("jefferson:registration", registration) });
  const missed = await early.start();
  assert.equal(line(missed), placeholder(), "the factory-time registration is lost");

  const late = harness();
  late.events.emit("jefferson:registration", registration);
  late.events.emit("jefferson:update", saved("$4.10"));
  assert.equal(line(await late.start()), "Savings: $4.10");
});

test("A1 a provided name in a row renders after registration", async (t) => {
  documentShowing(t, [["model", "taiknr.savings"]]);
  const h = harness();
  h.events.emit("jefferson:registration", registration);
  h.events.emit("jefferson:update", saved("$4.10"));
  const session = await h.start({ model: { provider: "anthropic", id: "claude-opus-4" } });
  assert.equal(line(session), "Model: anthropic/claude-opus-4 Savings: $4.10");
});

test("A1 a registration is the way an extension supplies text", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const silent = await harness().start();
  assert.equal(line(silent), placeholder(), "no extension claimed the name, so nothing supplied its text");

  const h = harness();
  h.events.emit("jefferson:registration", registration);
  h.events.emit("jefferson:update", saved("$4.10"));
  assert.equal(line(await h.start()), "Savings: $4.10");
});

test("A1 a registration with an unknown key still registers", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  h.events.emit("jefferson:registration", {
    ...registration,
    // A channel grows by adding: a key this Jefferson does not read changes nothing.
    version: 2,
    instruments: [{ ...registration.instruments[0]!, priority: "high" }],
  });
  h.events.emit("jefferson:update", saved("$4.10"));
  assert.equal(line(await h.start()), "Savings: $4.10");
});

test("A8 a provider registration made before Jefferson's session_start is heard", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  // Jefferson's factory subscribes, so a provider's `session_start` handler that runs first is in
  // hand before the document is read.
  h.events.emit("jefferson:registration", registration);
  h.events.emit("jefferson:update", saved("$4.10"));
  const session = await h.start();
  assert.equal(line(session), "Savings: $4.10");
  assert.deepEqual(session.notified, [], "no warning calls its name unknown");
});

test("A2 a registration after a shutdown is accepted, not refused", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  h.events.emit("jefferson:registration", registration);
  h.events.emit("jefferson:update", saved("$4.10"));
  assert.equal(line(await h.start()), "Savings: $4.10");

  h.dispatch({ type: "session_shutdown", reason: "reload" });
  // The same provider registers in the next session: the shutdown cleared its registration, so the
  // name is free rather than a second claim.
  h.events.emit("jefferson:registration", registration);
  h.events.emit("jefferson:update", saved("$4.10"));
  const second = await h.start();
  assert.equal(line(second), "Savings: $4.10");
  assert.deepEqual(second.notified, [], "not refused as a second claim");
});

test("A1 a report on jefferson:update reaches the row from the next render", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  h.events.emit("jefferson:registration", registration);
  const session = await h.start();
  assert.equal(line(session), "", "nothing is reported yet, so the datum is unknown");
  h.events.emit("jefferson:update", saved("$4.10"));
  assert.equal(line(session), "Savings: $4.10", "the next render shows the reported value");
});

test("A1 two reports before one render show both values", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  h.events.emit("jefferson:registration", {
    extension: "taiknr",
    fields: { saved: "string", omitted: "string" },
    instruments: [{
      name: "savings",
      variables: {
        saved: (readings: ReadingsView) => typeof readings.saved === "string" ? readings.saved : undefined,
        omitted: (readings: ReadingsView) => typeof readings.omitted === "string" ? readings.omitted : undefined,
      },
      defaultFormat: "Saved $saved, omitted $omitted",
    }],
  });
  h.events.emit("jefferson:update", saved("$4.10"));
  h.events.emit("jefferson:update", { extension: "taiknr", field: "omitted", value: "2k" });
  assert.equal(line(await h.start()), "Saved $4.10, omitted 2k");
});

test("A1 a report with an unknown key is read as the known ones", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  h.events.emit("jefferson:registration", registration);
  h.events.emit("jefferson:update", { ...saved("$4.10"), sequence: 3 });
  assert.equal(line(await h.start()), "Savings: $4.10");
});

test("A1 a report made before Jefferson's session_start renders once the footer installs", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  // Held from the factory, not from `session_start`: a report that arrives first must survive.
  h.events.emit("jefferson:registration", registration);
  h.events.emit("jefferson:update", saved("$4.10"));
  assert.equal(line(await h.start()), "Savings: $4.10");
});

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
  createRegistrationListener({
    events, registry, fields: createProviderFields(), own: { extension: "jefferson", instruments: SHIPPED },
  });
  for (const declaration of SHIPPED) {
    assert.equal(registry.instrument(declaration.name), declaration, declaration.name);
  }
});

test("A1 two providers' fields of one name are separate", () => {
  const fields = createProviderFields();
  fields.declare("taiknr", { saved: "string" });
  fields.declare("other", { saved: "number" });
  fields.report("taiknr", "saved", "$4.10");
  fields.report("other", "saved", 12);
  assert.equal(fields.view("taiknr").saved, "$4.10");
  assert.equal(fields.view("other").saved, 12);
});

test("A1 the view holds only that provider's declared fields", () => {
  const fields = createProviderFields();
  fields.declare("taiknr", { saved: "string" });
  fields.declare("other", { saved: "number", working: "boolean" });
  fields.report("other", "saved", 3);
  assert.deepEqual(Object.keys(fields.view("other")).sort(), ["saved", "working"]);
  assert.equal(fields.view("other").working, undefined, "declared and not yet reported");
  assert.equal(fields.view("taiknr").working, undefined, "another provider's field");
  assert.deepEqual(Object.keys(fields.view("taiknr")), ["saved"]);
});

test("A1 an undeclared key reads undefined", () => {
  const fields = createProviderFields();
  fields.declare("taiknr", { saved: "string" });
  assert.equal(fields.view("taiknr").spent, undefined);
  assert.equal(fields.view("taiknr").saved, undefined, "declared and unreported is unknown too");
});

test("A1 checkFields answers outside and conflict", () => {
  const fields = createProviderFields();
  fields.declare("taiknr", { saved: "string" });
  assert.equal(fields.checkFields("taiknr", undefined), undefined, "fields are optional");
  assert.equal(fields.checkFields("taiknr", { saved: "string", omitted: "number" }), undefined);
  assert.deepEqual(fields.checkFields("taiknr", { saved: "string", spent: "array" }),
    { type: "outside", field: "spent", given: "array" });
  assert.deepEqual(fields.checkFields("taiknr", { spent: 4 }), { type: "outside", field: "spent", given: 4 });
  assert.deepEqual(fields.checkFields("taiknr", { saved: "number" }),
    { type: "conflict", field: "saved", declared: "string", given: "number" });
});

test("A1 checkReport answers undeclared, wrong-type and not-finite", () => {
  const fields = createProviderFields();
  fields.declare("taiknr", { saved: "string", working: "boolean", amount: "number" });
  assert.deepEqual(fields.checkReport("taiknr", "spent", "x"), { type: "undeclared" });
  assert.deepEqual(fields.checkReport("taiknr", "saved", 5), { type: "wrong-type", declared: "string", given: 5 });
  assert.deepEqual(fields.checkReport("taiknr", "working", undefined),
    { type: "wrong-type", declared: "boolean", given: undefined });
  assert.deepEqual(fields.checkReport("taiknr", "amount", Number.NaN), { type: "not-finite" });
  assert.deepEqual(fields.checkReport("taiknr", "amount", Number.POSITIVE_INFINITY), { type: "not-finite" });
  assert.equal(fields.checkReport("taiknr", "amount", 3), undefined);
  assert.equal(fields.checkReport("taiknr", "working", false), undefined, "false is a value, not unknown");
  assert.equal(fields.checkReport("taiknr", "saved", ""), undefined, "an empty string is a value");
});

test("A1 a provider variable reads its view", () => {
  const reads: ReadingsView[] = [];
  const adapted = adaptProvidedDeclaration("taiknr.savings", registration.instruments[0]!, () => {
    const view = { saved: `$${reads.length + 1}` };
    reads.push(view);
    return view;
  });
  assert.ok(!("refused" in adapted));
  const readings = {} as Readings;
  assert.equal(adapted.variables.saved?.(readings), "$1");
  assert.equal(adapted.variables.saved?.(readings), "$2", "each call asks the provider's view again");
});

test("A1 a resolver that is not a function is refused", () => {
  const declaration = { ...registration.instruments[0]!, variables: { saved: "nope" } } as unknown as ProvidedDeclaration;
  assert.deepEqual(adaptProvidedDeclaration("taiknr.savings", declaration, () => ({})),
    { refused: "resolver-not-function", variable: "saved" });
});

test("A1 a default label that is not a string is refused", () => {
  const declaration = { ...registration.instruments[0]!, defaultLabel: 4 } as unknown as ProvidedDeclaration;
  assert.deepEqual(adaptProvidedDeclaration("taiknr.savings", declaration, () => ({})), { refused: "label-not-string" });
});

test("A1 a default format Jefferson cannot parse is refused", () => {
  const declaration = { ...registration.instruments[0]!, defaultFormat: "Spent $spent" } as unknown as ProvidedDeclaration;
  assert.deepEqual(adaptProvidedDeclaration("taiknr.savings", declaration, () => ({})),
    { refused: "unparseable-default-format" });
  // The table's row order decides which fault a payload with two is refused for.
  const twice = { ...declaration, defaultLabel: 4 } as unknown as ProvidedDeclaration;
  assert.deepEqual(adaptProvidedDeclaration("taiknr.savings", twice, () => ({})), { refused: "unparseable-default-format" });
});
