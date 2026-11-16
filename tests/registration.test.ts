import assert from "node:assert/strict";
import { test } from "node:test";

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createEventBus, type EventBus } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import type { InstrumentDeclaration } from "../extensions/jefferson/components/instruments/instrument.ts";
import { adaptProvidedDeclaration } from "../extensions/jefferson/components/instruments/instrument-binding.ts";
import type { Readings } from "../extensions/jefferson/data/session-data-store.ts";
import { createProviderFields } from "../extensions/jefferson/data/provider-fields.ts";
import { createFaultLedger } from "../extensions/jefferson/faults.ts";
import { configurationSource } from "./configuration-source.ts";
import { fakeTheme } from "./fake-theme.ts";
import { createRegistrationListener } from "../extensions/jefferson/registration-listener.ts";
import {
  createRegistry, isProvidedName, normalizeName,
} from "../extensions/jefferson/registration.ts";
import { readConfiguration } from "../extensions/jefferson/configuration.ts";
import { DEFAULT_CELL_TEXT } from "../extensions/jefferson/components/instruments/instrument.ts";
import type { ProvidedDeclaration, Registration, ReadingsView } from "../extensions/jefferson/instrument-contract.ts";
import { SHIPPED } from "../extensions/jefferson/shipped.ts";
import {
  harness, useTempAgentDir, writeAgentDocument, type FakeSession, type Harness,
} from "./session-harness.ts";

/**
 * The registration taiknr posts: one instrument whose one resolver reads the string field `saved`.
 * The field is reported with a value that renders as it was written, so a line proves the report
 * reached the resolver.
 */
const registration: Registration<"taiknr"> = {
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

/** Write a document whose rows name the instruments given, one row per list; answer its path. */
function documentShowing(t: { after(fn: () => void): void }, rows: string[][]): string {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { rows: rows.map(row => row.map(instrument => ({ instrument }))) });
  return join(agentDir, "pi-jefferson.json");
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

test("A2 a payload that is not a registration warns once, and a repeat adds nothing", async (t) => {
  documentShowing(t, [["model"]]);
  const h = harness();
  h.events.emit("jefferson:registration", 5);
  h.events.emit("jefferson:registration", 5);
  const session = await h.start({ model: { provider: "anthropic", id: "claude-opus-4" } });
  assert.deepEqual(session.notified, [
    { message: "pi-jefferson: a registration is not an object", type: "warning" },
  ], "one notice for the kind, whatever sent it and however often");
  assert.equal(line(session), "Model: anthropic/claude-opus-4", "a refused payload changes nothing a row renders");
});

test("A2 a second claim on a taken name is refused, and the first keeps rendering", async (t) => {
  documentShowing(t, [["taiknr.savings", "path"], ["taiknr.stolen"]]);
  const h = harness();
  h.events.emit("jefferson:registration", registration);
  h.events.emit("jefferson:registration", {
    extension: "taiknr",
    fields: { saved: "string" },
    instruments: [
      { ...registration.instruments[0]!, defaultFormat: "Stolen: $saved" },
      { name: "stolen", variables: { saved: (readings: ReadingsView) => String(readings.saved) }, defaultFormat: "$saved" },
    ],
  });
  h.events.emit("jefferson:update", saved("$4.10"));
  const session = await h.start({ cwd: join(mkdtempSync(join(tmpdir(), "jefferson-cwd-")), "pi-jefferson") });
  const lines = session.lines(80).map(drawn => stripTerminalSequences(drawn).trimEnd());
  assert.equal(lines[0], "Savings: $4.10 Path: pi-jefferson", "the first claim and the built-in keep rendering");
  assert.equal(lines[2], placeholder(), "the refused registration registered none of its names");
});

test("A2 a jefferson claim that is not the kept payload is refused", async (t) => {
  const cwd = join(mkdtempSync(join(tmpdir(), "jefferson-cwd-")), "pi-jefferson");
  documentShowing(t, [["jefferson.default.path"], ["jefferson.path"]]);
  const h = harness();
  // The claim composes jefferson.path, a name no instrument has registered: only the identity check
  // stands between another extension and a name in Jefferson's namespace.
  h.events.emit("jefferson:registration", {
    extension: "jefferson",
    instruments: [{ name: "path", variables: { path: () => "stolen" }, defaultFormat: "$path" }],
  });
  const session = await h.start({ cwd });
  const lines = session.lines(80).map(drawn => stripTerminalSequences(drawn).trimEnd());
  assert.equal(lines[0], "Path: pi-jefferson", "Jefferson's own instrument still renders");
  assert.equal(lines[2], placeholder(), "the claimed name renders as nothing registered");
});

test("A2 a fault reported in session one warns again in session two", async (t) => {
  documentShowing(t, [["model"]]);
  const warning = { message: "pi-jefferson: a registration is not an object", type: "warning" };
  const h = harness();
  h.events.emit("jefferson:registration", 5);
  const first = await h.start({ model: { provider: "anthropic", id: "claude-opus-4" } });
  assert.deepEqual(first.notified, [warning]);

  h.dispatch({ type: "session_shutdown", reason: "reload" });
  h.events.emit("jefferson:registration", 5);
  const second = await h.start({ model: { provider: "anthropic", id: "claude-opus-4" } });
  assert.deepEqual(second.notified, [warning], "the new session has not been told");
});

test("A2 a fault recorded before resources_discover waits for it", async (t) => {
  documentShowing(t, [["model"]]);
  const h = harness();
  const session = await h.start({
    model: { provider: "anthropic", id: "claude-opus-4" },
    afterSessionStart: (running) => {
      assert.deepEqual(running.notified, [], "delivery has not opened");
      h.events.emit("jefferson:registration", 5);
      assert.deepEqual(running.notified, [], "a fault waits for startup to complete");
    },
  });
  assert.deepEqual(session.notified, [
    { message: "pi-jefferson: a registration is not an object", type: "warning" },
  ], "and is delivered when it does");
});

test("A2 a provider-first registration and its fault survive Jefferson's next session_start and are delivered at resources_discover", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  await h.start();
  h.dispatch({ type: "session_shutdown", reason: "reload" });

  // Between the shutdown and session two's start: the provider state and the ledger belong to the
  // new session, so what arrives now must survive the `session_start` that follows.
  h.events.emit("jefferson:registration", registration);
  h.events.emit("jefferson:update", saved("$4.10"));
  h.events.emit("jefferson:registration", 5);
  const second = await h.start();
  assert.equal(line(second), "Savings: $4.10", "the registration outlived the session_start");
  assert.deepEqual(second.notified, [
    { message: "pi-jefferson: a registration is not an object", type: "warning" },
  ], "one notice, at resources_discover");
});

test("A2 outside TUI mode a fault is never delivered", async (t) => {
  documentShowing(t, [["model"]]);
  const h = harness();
  h.events.emit("jefferson:registration", 5);
  const session = await h.start({ mode: "print", model: { provider: "anthropic", id: "claude-opus-4" } });
  assert.deepEqual(session.notified, []);
});

test("A2 every registration refusal part is exact", async (t) => {
  documentShowing(t, [["model"]]);
  const savings = registration.instruments[0]!;
  const from = (body: Record<string, unknown>): Record<string, unknown> => ({ extension: "taiknr", ...body });
  const cases: Array<[label: string, send: (events: EventBus) => void, part: string]> = [
    ["registration shape", events => events.emit("jefferson:registration", []),
      "a registration is not an object"],
    ["no extension name", events => events.emit("jefferson:registration", { instruments: [] }),
      "a registration carries no extension name"],
    ["jefferson claim", events => events.emit("jefferson:registration", { extension: "jefferson", instruments: [] }),
      'a registration claims "jefferson", which belongs to Jefferson'],
    ["a name under jefferson.", events => events.emit("jefferson:registration", { extension: "jefferson.custom", instruments: [] }),
      'a registration claims "jefferson.custom", which belongs to Jefferson'],
    ["no instruments", events => events.emit("jefferson:registration", { extension: "taiknr" }),
      'registration from "taiknr" carries no instruments'],
    ["instruments not a list", events => events.emit("jefferson:registration", { extension: "taiknr", instruments: {} }),
      'registration from "taiknr" carries no instruments'],
    ["declaration shape", events => events.emit("jefferson:registration", from({ instruments: [5] })),
      'registration from "taiknr" carries an instrument that is not a declaration'],
    ["no declaration name", events => events.emit("jefferson:registration", from({ instruments: [{ variables: {}, defaultFormat: "" }] })),
      'registration from "taiknr" carries a declaration with no name'],
    ["a taken name", events => {
      events.emit("jefferson:registration", registration);
      events.emit("jefferson:registration", registration);
    }, '"taiknr.savings" is already registered, so this registration is refused'],
    ["a repeated name", events => events.emit("jefferson:registration", from({ instruments: [savings, savings] })),
      'registration from "taiknr" carries "savings" twice'],
    ["no resolvers", events => events.emit("jefferson:registration", from({ instruments: [{ name: "savings", defaultFormat: "" }] })),
      '"taiknr.savings" carries no variables'],
    ["no default format", events => events.emit("jefferson:registration", from({ instruments: [{ name: "savings", variables: savings.variables }] })),
      '"taiknr.savings" carries no default format'],
    ["unparseable default format", events => events.emit("jefferson:registration",
      from({ instruments: [{ ...savings, defaultFormat: "Spent $spent" }] })),
      '"taiknr.savings" carries a default format Jefferson cannot parse'],
    ["label not a string", events => events.emit("jefferson:registration", from({ instruments: [{ ...savings, defaultLabel: 4 }] })),
      '"taiknr.savings" carries a default label that is not a string'],
    ["resolver not a function", events => events.emit("jefferson:registration", from({ instruments: [{ ...savings, variables: { saved: 4 } }] })),
      '"taiknr.savings" carries a variable "saved" that is not a function'],
    ["a fills that is not a boolean", events => events.emit("jefferson:registration",
      from({ instruments: [{ ...savings, fills: "yes" }] })),
      '"taiknr.savings" carries fills Jefferson cannot use'],
    ["a bar that is not a function", events => events.emit("jefferson:registration",
      from({ instruments: [{ ...savings, bar: 5 }] })),
      '"taiknr.savings" carries bar Jefferson cannot use'],
    ["a form that is not a function", events => events.emit("jefferson:registration",
      from({ instruments: [{ ...savings, variableForms: { saved: { short: 5 } } }] })),
      '"taiknr.savings" carries variableForms Jefferson cannot use'],
    ["a colour that is not a function", events => events.emit("jefferson:registration",
      from({ instruments: [{ ...savings, variableFg: { saved: 5 } }] })),
      '"taiknr.savings" carries variableFg Jefferson cannot use'],
    ["a composed whose select is not a function", events => events.emit("jefferson:registration",
      from({ instruments: [{ ...savings, composed: { variable: "state", variables: {}, select: 1, formats: {} } }] })),
      '"taiknr.savings" carries composed Jefferson cannot use'],
    ["options that are not a list of strings", events => events.emit("jefferson:registration",
      from({ instruments: [{ ...savings, options: "formats" }] })),
      '"taiknr.savings" carries options Jefferson cannot use'],
    ["an option Jefferson does not implement", events => events.emit("jefferson:registration",
      from({ instruments: [{ ...savings, options: ["seconds"] }] })),
      '"taiknr.savings" declares the option "seconds", which Jefferson does not implement'],
    ["formats with no composed set", events => events.emit("jefferson:registration",
      from({ instruments: [{ ...savings, options: ["formats"] }] })),
      '"taiknr.savings" declares "formats" without a composed format set'],
    ["a composed kind Jefferson cannot parse", events => events.emit("jefferson:registration",
      from({ instruments: [{ ...savings, composed: { variable: "state", variables: {}, select: () => "busy", formats: { busy: "Busy on $nope" } } }] })),
      '"taiknr.savings" carries a composed format "busy" Jefferson cannot parse'],
    ["field type outside the three", events => events.emit("jefferson:registration", from({ fields: { saved: "array" }, instruments: [] })),
      'registration from "taiknr" declares "saved" as "array", which is not string, number or boolean'],
    ["one field at two types", events => {
      events.emit("jefferson:registration", from({ fields: { saved: "string" }, instruments: [] }));
      events.emit("jefferson:registration", from({ fields: { saved: "number" }, instruments: [] }));
    }, 'registration from "taiknr" declares "saved" as both string and number'],
  ];
  for (const [label, send, part] of cases) {
    const h = harness();
    send(h.events);
    const session = await h.start({ model: { provider: "anthropic", id: "claude-opus-4" } });
    assert.deepEqual(session.notified, [{ message: `pi-jefferson: ${part}`, type: "warning" }], label);
  }
});

test("A2 a registration whose default format names an undeclared variable is refused and the footer installs, in either order", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const broken = { ...registration, instruments: [{ ...registration.instruments[0]!, defaultFormat: "Spent $spent" }] };
  const orders: Array<[string, (h: Harness) => Promise<FakeSession>]> = [
    ["provider-first", async (h) => {
      h.events.emit("jefferson:registration", broken);
      return h.start();
    }],
    ["Jefferson-first", async (h) => h.start({
      afterSessionStart: () => void h.events.emit("jefferson:registration", broken),
    })],
  ];
  for (const [order, run] of orders) {
    const session = await run(harness());
    const messages = session.notified.map(notified => notified.message);
    assert.equal(line(session), placeholder(), `${order}: the entry renders on blank`);
    const fault = messages.findIndex(message => message.includes('"taiknr.savings" carries a default format Jefferson cannot parse'));
    const unknown = messages.findIndex(message => message.includes('row 1: "taiknr.savings" is not a known instrument'));
    assert.equal(fault, messages.length - 1, `${order}: one part, delivered after startup completes`);
    assert.ok(unknown >= 0 && unknown < fault, `${order}: the unknown-name part comes first`);
  }
});

test("A2 every report refusal part is exact", async (t) => {
  documentShowing(t, [["model"]]);
  const amount = { extension: "taiknr", fields: { amount: "number" }, instruments: [] };
  const cases: Array<[label: string, send: (events: EventBus) => void, part: string]> = [
    ["report shape", events => events.emit("jefferson:update", "nope"), "a report is not an object"],
    ["no extension name", events => events.emit("jefferson:update", { field: "saved", value: "x" }),
      "a report carries no extension name"],
    ["no field name", events => events.emit("jefferson:update", { extension: "taiknr", value: "x" }),
      "a report carries no field name"],
    ["no registration", events => events.emit("jefferson:update", saved("$4.10")),
      'taiknr reports "saved" without a registration'],
    ["undeclared field", events => {
      events.emit("jefferson:registration", registration);
      events.emit("jefferson:update", { extension: "taiknr", field: "spent", value: "2" });
    }, 'taiknr reports "spent", which it did not declare'],
    ["wrong type", events => {
      events.emit("jefferson:registration", registration);
      events.emit("jefferson:update", { extension: "taiknr", field: "saved", value: 4 });
    }, 'taiknr reports "saved" as a number, and it declared string'],
    ["a string where a number was declared", events => {
      events.emit("jefferson:registration", amount);
      events.emit("jefferson:update", { extension: "taiknr", field: "amount", value: "4" });
    }, 'taiknr reports "amount" as a string, and it declared number'],
    ["a missing value", events => {
      events.emit("jefferson:registration", registration);
      events.emit("jefferson:update", { extension: "taiknr", field: "saved" });
    }, 'taiknr reports "saved" as nothing, and it declared string'],
    ["a value that is not finite", events => {
      events.emit("jefferson:registration", amount);
      events.emit("jefferson:update", { extension: "taiknr", field: "amount", value: Number.NaN });
    }, 'taiknr reports "amount" as a number that is not finite'],
  ];
  for (const [label, send, part] of cases) {
    const h = harness();
    send(h.events);
    const session = await h.start();
    assert.deepEqual(session.notified, [{ message: `pi-jefferson: ${part}`, type: "warning" }], label);
  }
});

test("A2 a report after a fieldless registration takes the undeclared-field row", async (t) => {
  documentShowing(t, [["model"]]);
  const h = harness();
  // A registration with no fields and no instruments is accepted (the merge rule), so the report is
  // not "without a registration": nothing declared the field.
  h.events.emit("jefferson:registration", { extension: "taiknr", instruments: [] });
  h.events.emit("jefferson:update", saved("$4.10"));
  const session = await h.start();
  assert.deepEqual(session.notified, [
    { message: 'pi-jefferson: taiknr reports "saved", which it did not declare', type: "warning" },
  ]);
});

test("A2 a repeated undeclared-field report warns once and changes no row", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  h.events.emit("jefferson:registration", registration);
  h.events.emit("jefferson:update", saved("$4.10"));
  const session = await h.start();
  assert.equal(line(session), "Savings: $4.10");

  h.events.emit("jefferson:update", { extension: "taiknr", field: "spent", value: "2" });
  h.events.emit("jefferson:update", { extension: "taiknr", field: "spent", value: "3" });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(session.notified, [
    { message: 'pi-jefferson: taiknr reports "spent", which it did not declare', type: "warning" },
  ], "one part for the kind, not one per report");
  assert.equal(line(session), "Savings: $4.10", "nothing a row renders changed");
});

test("A2 a bad declaration registers none of its registration's instruments", async (t) => {
  documentShowing(t, [["taiknr.savings"], ["taiknr.stubs"]]);
  const h = harness();
  // The second declaration is good, but the first is not: the acceptance unit is the registration.
  h.events.emit("jefferson:registration", {
    extension: "taiknr",
    fields: { saved: "string" },
    instruments: [
      { name: "savings", variables: { saved: 4 }, defaultFormat: "Savings: $saved" },
      { name: "stubs", variables: { stubs: () => "3" }, defaultFormat: "Stubs: $stubs" },
    ],
  });
  const session = await h.start();
  const lines = session.lines(80).map(drawn => stripTerminalSequences(drawn).trimEnd());
  assert.equal(lines[0], placeholder(), "the bad declaration registered nothing of its own");
  assert.equal(lines[2], placeholder(), "and neither did the good one beside it");
  assert.deepEqual(session.notified.at(-1), {
    message: 'pi-jefferson: "taiknr.savings" carries a variable "saved" that is not a function',
    type: "warning",
  }, "the first fault is the one part reported");

  // And the same registration the other way round: a good declaration does not register beside a
  // bad one.
  const reversed = harness();
  reversed.events.emit("jefferson:registration", {
    extension: "taiknr",
    instruments: [
      { name: "stubs", variables: { stubs: () => "3" }, defaultFormat: "Stubs: $stubs" },
      { name: "savings", variables: { saved: 4 }, defaultFormat: "Savings: $saved" },
    ],
  });
  const refused = await reversed.start();
  const refusedLines = refused.lines(80).map(drawn => stripTerminalSequences(drawn).trimEnd());
  assert.equal(refusedLines[0], placeholder(), "the entry naming the bad declaration renders blank");
  assert.equal(refusedLines[2], placeholder(), "the good declaration did not register either");
});

test("A2 a second registration adds a field and an instrument", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  h.events.emit("jefferson:registration", { extension: "taiknr", fields: { saved: "string" }, instruments: [] });
  h.events.emit("jefferson:update", saved("$4.10"));
  h.events.emit("jefferson:registration", {
    extension: "taiknr",
    fields: { omitted: "string" },
    instruments: [{
      name: "savings",
      variables: {
        saved: (readings: ReadingsView) => typeof readings.saved === "string" ? readings.saved : undefined,
        omitted: (readings: ReadingsView) => typeof readings.omitted === "string" ? readings.omitted : undefined,
      },
      defaultFormat: "Saved $saved, omitted $omitted",
    }],
  });
  h.events.emit("jefferson:update", { extension: "taiknr", field: "omitted", value: "2k" });
  assert.equal(line(await h.start()), "Saved $4.10, omitted 2k");
});

test("A2 a registration with an empty variables map and an empty default format registers", async (t) => {
  documentShowing(t, [["taiknr.idle"]]);
  const h = harness();
  h.events.emit("jefferson:registration", {
    extension: "taiknr",
    fields: { saved: "string" },
    instruments: [
      ...registration.instruments,
      // `{}` and `""` are the contract's own accepted values, not absent keys.
      { name: "idle", variables: {}, defaultFormat: "Idle" },
    ],
  });
  assert.equal(line(await h.start()), "Idle");
});

test("A2 a same-type redeclaration keeps the reported value", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  h.events.emit("jefferson:registration", registration);
  h.events.emit("jefferson:update", saved("$4.10"));
  // The field is declared again with the type it already has, and no name is claimed twice.
  h.events.emit("jefferson:registration", { extension: "taiknr", fields: { saved: "string" }, instruments: [] });
  const session = await h.start();
  assert.equal(line(session), "Savings: $4.10", "the value the field already held survived");
  assert.deepEqual(session.notified, [], "a same-type redeclaration is accepted");
});

test("A2 a different-type redeclaration is refused and the first stays intact", async (t) => {
  documentShowing(t, [["taiknr.savings"], ["taiknr.total"]]);
  const h = harness();
  h.events.emit("jefferson:registration", registration);
  h.events.emit("jefferson:update", saved("$4.10"));
  h.events.emit("jefferson:registration", {
    extension: "taiknr",
    fields: { saved: "number" },
    instruments: [{ name: "total", variables: { saved: () => "hijacked" }, defaultFormat: "$saved" }],
  });
  const session = await h.start();
  const lines = session.lines(80).map(drawn => stripTerminalSequences(drawn).trimEnd());
  assert.equal(lines[0], "Savings: $4.10", "the earlier declaration and its value keep rendering");
  assert.equal(lines[2], placeholder(), "the refused registration registered no name");
  assert.deepEqual(session.notified.at(-1), {
    message: 'pi-jefferson: registration from "taiknr" declares "saved" as both string and number',
    type: "warning",
  });
});

test("A2 a change made after registering does not reach the render or the check", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  const payload: Registration<"taiknr"> = {
    extension: "taiknr",
    fields: { saved: "string" },
    instruments: [{
      name: "savings",
      variables: { saved: (readings: ReadingsView) => typeof readings.saved === "string" ? readings.saved : undefined },
      defaultFormat: "Savings: $saved",
    }],
  };
  h.events.emit("jefferson:registration", payload);
  h.events.emit("jefferson:update", saved("$4.10"));

  // The provider mutates what it posted after acceptance: Jefferson copied the plain data and holds
  // the resolvers by reference (the spec's "A change made after registering").
  const posted = payload.instruments[0]!;
  posted.name = "renamed";
  posted.defaultFormat = "Hijacked $saved";
  posted.defaultLabel = "Hijacked:";
  posted.variables = { saved: () => "hijacked", added: () => "later" };

  assert.equal(line(await h.start()), "Savings: $4.10", "what Jefferson renders is what it accepted");

  // A later J1(b) check reads the accepted copy too: the variable the provider added after
  // acceptance is not one the instrument declares, so a format naming it refuses the instrument.
  const later = useTempAgentDir(t);
  writeAgentDocument(later, {
    instruments: { "taiknr.savings": { format: "$added" } },
    rows: [[{ instrument: "taiknr.savings" }]],
  });
  const checked = harness();
  const reposted: Registration<"taiknr"> = {
    extension: "taiknr",
    fields: { saved: "string" },
    instruments: [{
      name: "savings",
      variables: { saved: (readings: ReadingsView) => typeof readings.saved === "string" ? readings.saved : undefined },
      defaultFormat: "Savings: $saved",
    }],
  };
  checked.events.emit("jefferson:registration", reposted);
  reposted.instruments[0]!.variables = { saved: () => "hijacked", added: () => "later" };
  const refused = await checked.start();
  assert.deepEqual(refused.notified, [{
    message: 'pi-jefferson: "taiknr.savings" is configured with a format naming "$added", which the instrument does not declare; it renders blank',
    type: "warning",
  }]);
  assert.equal(line(refused), placeholder(), "and the entry renders the fallback");
});

test("A8 jeffersonfan.stats registers through the bus and renders", async (t) => {
  documentShowing(t, [["jeffersonfan.stats"]]);
  const h = harness();
  h.events.emit("jefferson:registration", {
    extension: "jeffersonfan",
    instruments: [{ name: "stats", variables: { stats: () => "4" }, defaultFormat: "Fan $stats" }],
  });
  assert.equal(line(await h.start()), "Fan 4", "the comparison is on the whole first part");
});

test("A8 jefferson.custom.mine stays free", () => {
  const events = createEventBus();
  const registry = createRegistry();
  createRegistrationListener({
    events, registry, faults: createFaultLedger(), fields: createProviderFields(() => {}), repaint: () => {},
    own: { extension: "jefferson", instruments: SHIPPED },
  });
  events.emit("jefferson:registration", registration);
  assert.notEqual(registry.instrument("taiknr.savings"), undefined, "a provider's two-part name registers");
  assert.equal(registry.instrument("jefferson.custom.mine"), undefined, "three parts belong to Jefferson");
});

test("A5 an unknown name warns once, after startup completes", async (t) => {
  const path = documentShowing(t, [["nope"]]);
  const h = harness();
  const session = await h.start({
    afterSessionStart: (running) => assert.deepEqual(running.notified, [], "an accepted document says nothing at session_start"),
  });
  assert.deepEqual(session.notified, [
    { message: `pi-jefferson: ${path} row 1: "nope" is not a known instrument`, type: "warning" },
  ]);
});

test("A5 an unknown name in two rows warns once per row", async (t) => {
  const path = documentShowing(t, [["nope"], ["nope"]]);
  const session = await harness().start();
  assert.deepEqual(session.notified, [{
    message: `pi-jefferson: ${path} row 1: "nope" is not a known instrument; row 2: "nope" is not a known instrument`,
    type: "warning",
  }]);
});

test("A5 an unknown name twice in one row warns once", async (t) => {
  const path = documentShowing(t, [["nope", "nope"]]);
  const session = await harness().start();
  assert.deepEqual(session.notified, [
    { message: `pi-jefferson: ${path} row 1: "nope" is not a known instrument`, type: "warning" },
  ]);
});

test("A5 a name only the block names draws no warning", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { instruments: { "taiknr.savings": {} }, rows: [[{ instrument: "model" }]] });
  const session = await harness().start({ model: { provider: "anthropic", id: "claude-opus-4" } });
  assert.deepEqual(session.notified, [], "no row holds the name, so nothing renders blank");
});

test("A5 a name the block and a row both name warns once, by its row", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, {
    instruments: { nope: {} },
    rows: [[{ instrument: "model" }], [{ instrument: "nope" }]],
  });
  const session = await harness().start({ model: { provider: "anthropic", id: "claude-opus-4" } });
  assert.deepEqual(session.notified, [{
    message: `pi-jefferson: ${join(agentDir, "pi-jefferson.json")} row 2: "nope" is not a known instrument`,
    type: "warning",
  }], "only the row renders blank, so only the row reports");
});

test("A5 a registration from beforeFactory leaves its name warned as unknown", async (t) => {
  const path = documentShowing(t, [["taiknr.savings"]]);
  const early = harness({ beforeFactory: events => events.emit("jefferson:registration", registration) });
  const session = await early.start({
    afterSessionStart: (running) => assert.deepEqual(running.notified, []),
  });
  assert.deepEqual(session.notified, [
    { message: `pi-jefferson: ${path} row 1: "taiknr.savings" is not a known instrument`, type: "warning" },
  ]);
});

test("A5 a fault recorded before resources_discover is delivered after the unknown-name part", async (t) => {
  const path = documentShowing(t, [["nope"]]);
  const h = harness();
  h.events.emit("jefferson:registration", 5);
  const session = await h.start();
  assert.deepEqual(session.notified, [
    { message: `pi-jefferson: ${path} row 1: "nope" is not a known instrument`, type: "warning" },
    { message: "pi-jefferson: a registration is not an object", type: "warning" },
  ], "the unknown-name part first, then the faults in arrival order");
});

test("A5 warning is undefined for an accepted document naming an unknown instrument", () => {
  const dir = mkdtempSync(join(tmpdir(), "jefferson-config-test-"));
  writeAgentDocument(dir, { rows: [[{ instrument: "nope" }]] });
  const { source } = configurationSource({
    agentPath: join(dir, "pi-jefferson.json"),
    projectPath: join(dir, "missing.json"),
    projectTrusted: false,
    theme: fakeTheme(),
  });
  const result = readConfiguration(source);
  assert.equal(result.warning, undefined, "an accepted document's unknown names travel as data");
  assert.deepEqual(result.unknownNames.map(unknown => unknown.written), ["nope"]);
});

test("A5 a rejected document still warns at session_start", async (t) => {
  writeAgentDocument(useTempAgentDir(t), { rows: 42 });
  const h = harness();
  const session = await h.start({
    afterSessionStart: (running) => assert.equal(running.notified.length, 1, "the rejection warns before startup completes"),
  });
  assert.match(session.notified[0]?.message ?? "", /was rejected \(the rows value is not a list\)/);
});

test("A5 an accepted document naming an unregistered provided instrument notifies nothing at session_start and one warning at resources_discover", async (t) => {
  const path = documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  const session = await h.start({
    afterSessionStart: (running) => assert.deepEqual(running.notified, [], "a provider may still register it"),
  });
  assert.deepEqual(session.notified, [
    { message: `pi-jefferson: ${path} row 1: "taiknr.savings" is not a known instrument`, type: "warning" },
  ]);

  // The same document once the provider registers before the read: no warning at all.
  const known = harness();
  known.events.emit("jefferson:registration", registration);
  assert.deepEqual((await known.start()).notified, []);
});

test("A5 a row name registered after Jefferson's session_start is not warned as unknown", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  const session = await h.start({
    afterSessionStart: () => void h.events.emit("jefferson:registration", registration),
  });
  assert.equal(session.notified.some(notified => notified.message.includes("taiknr.savings")), false,
    "the registry answers the name by the time startup completes");
});

test("A5 a block key registered after Jefferson's session_start is not warned as unknown", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { instruments: { "taiknr.savings": {} }, rows: [[{ instrument: "model" }]] });
  const h = harness();
  const session = await h.start({
    model: { provider: "anthropic", id: "claude-opus-4" },
    afterSessionStart: () => void h.events.emit("jefferson:registration", registration),
  });
  assert.equal(session.notified.some(notified => notified.message.includes("taiknr.savings")), false);
});

test("A4 a late registration reaches its entry, with its width behaviour", async (t) => {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, {
    rows: [[{ instrument: "taiknr.savings" }, { instrument: "model", align: "right" }], [{ instrument: "taiknr.never" }]],
  });
  const h = harness();
  const session = await h.start({
    model: { provider: "anthropic", id: "claude-opus-4" },
    afterSessionStart: () => {
      h.events.emit("jefferson:registration", registration);
      h.events.emit("jefferson:update", saved("$4.10"));
    },
  });
  const lines = session.lines(80).map(drawn => stripTerminalSequences(drawn));
  // Before the registration the entry held the fallback, which fills; after it, the provided
  // instrument takes its own columns and the right-aligned model keeps the row's edge (M21).
  assert.equal(lines[0], "Savings: $4.10" + " ".repeat(80 - 14 - "Model: anthropic/claude-opus-4".length) + "Model: anthropic/claude-opus-4");
  assert.equal(visibleWidth(lines[0] ?? ""), 80);
  assert.equal(lines[2]?.trimEnd(), placeholder(), "a name that never registers stays blank");
});

test("A4 a registration in session two leaves session one's footer untouched", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  const first = await h.start();
  const released = (): string => stripTerminalSequences(first.lines(80)[0] ?? "").trimEnd();
  assert.equal(released(), placeholder(), "nothing is registered in session one");

  h.dispatch({ type: "session_shutdown", reason: "reload" });
  const second = await h.start({
    afterSessionStart: () => {
      h.events.emit("jefferson:registration", registration);
      h.events.emit("jefferson:update", saved("$4.10"));
    },
  });
  assert.equal(stripTerminalSequences(second.lines(80)[0] ?? "").trimEnd(), "Savings: $4.10");
  assert.equal(released(), placeholder(), "the released footer took nothing the new session registered");
});

/** A document configuring one provided name beside the model, and the harness that registers it. */
function settingsDocument(
  t: { after(fn: () => void): void }, value: unknown, payload: Registration<"taiknr"> = registration,
): { session: Promise<FakeSession>; harness: Harness; path: string } {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, {
    instruments: { "taiknr.savings": value },
    rows: [[{ instrument: "model" }, { instrument: "taiknr.savings" }]],
  });
  const h = harness();
  // Provider-first: the registration is in hand before the document is read.
  h.events.emit("jefferson:registration", payload);
  h.events.emit("jefferson:update", saved("$4.10"));
  return {
    session: h.start({ model: { provider: "anthropic", id: "claude-opus-4" } }),
    harness: h,
    path: join(agentDir, "pi-jefferson.json"),
  };
}

test("A3 a format naming an undeclared variable refuses it alone", async (t) => {
  const { session } = settingsDocument(t, { format: "Spent $spent" });
  const started = await session;
  assert.deepEqual(started.notified, [{
    message: 'pi-jefferson: "taiknr.savings" is configured with a format naming "$spent", which the instrument does not declare; it renders blank',
    type: "warning",
  }]);
  const drawn = line(started);
  assert.ok(drawn.startsWith("Model: anthropic/claude-opus-4"), "every other entry renders as configured");
  assert.equal(drawn.includes("Savings"), false, "the refused instrument's entry renders blank");
});

test("A3 a value that is not an object refuses it alone", async (t) => {
  const { session } = settingsDocument(t, 5);
  const started = await session;
  assert.deepEqual(started.notified, [{
    message: 'pi-jefferson: "taiknr.savings" is configured with a value that is not an object; it renders blank',
    type: "warning",
  }]);
  assert.ok(line(started).startsWith("Model: anthropic/claude-opus-4"));
});

/** A composed registration, so the settings rows can name a kind its declaration carries. */
const composed: Registration<"taiknr"> = {
  extension: "taiknr",
  fields: { saved: "string", working: "boolean" },
  instruments: [{
    name: "savings",
    variables: { state: () => undefined },
    composed: {
      variable: "state",
      variables: {},
      select: (readings: ReadingsView) => readings.working === true ? "busy" : "idle",
      formats: { busy: "Busy", idle: "Idle" },
    },
    defaultFormat: "$state",
    options: ["formats"],
  }],
};

test("A3 a provided composed instrument takes the user's formats", async (t) => {
  for (const order of ["provider-first", "Jefferson-first"] as const) {
    const agentDir = useTempAgentDir(t);
    writeAgentDocument(agentDir, {
      instruments: { "taiknr.savings": { formats: { busy: "Working on $count" } } },
      rows: [[{ instrument: "taiknr.savings" }]],
    });
    const h = harness();
    // The composed value name is the provider's own, so the user's text is the only change.
    const countable: Registration<"taiknr"> = {
      ...composed,
      fields: { saved: "string", working: "boolean", count: "number" },
      instruments: [{
        ...composed.instruments[0]!,
        composed: {
          variable: "state",
          variables: { count: (readings: ReadingsView) => typeof readings.count === "number" ? String(readings.count) : undefined },
          select: (readings: ReadingsView) => readings.working === true ? "busy" : "idle",
          formats: { busy: "Busy", idle: "Idle" },
        },
      }],
    };
    const send = (): void => {
      h.events.emit("jefferson:registration", countable);
      h.events.emit("jefferson:update", { extension: "taiknr", field: "working", value: true });
      h.events.emit("jefferson:update", { extension: "taiknr", field: "count", value: 3 });
    };
    const session = order === "provider-first"
      ? await (send(), h.start())
      : await h.start({ afterSessionStart: send });
    assert.equal(line(session), "Working on 3", order);
    assert.deepEqual(session.notified, [], order);
  }
});

test("A3 every settings refusal part is exact", async (t) => {
  const blank = "; it renders blank";
  const cases: Array<[label: string, value: unknown, part: string, payload?: Registration<"taiknr">]> = [
    ["a value that is not an object", 5,
      `"taiknr.savings" is configured with a value that is not an object${blank}`],
    ["a format that is not a string", { format: 5 },
      `"taiknr.savings" is configured with a format that is not a string${blank}`],
    ["a label that is not a string", { label: 5 },
      `"taiknr.savings" is configured with a label that is not a string${blank}`],
    ["an option the instrument does not take", { width: 20 },
      `"taiknr.savings" is configured with "width", which the instrument does not declare${blank}`],
    ["a format naming an undeclared variable", { format: "$spent" },
      `"taiknr.savings" is configured with a format naming "$spent", which the instrument does not declare${blank}`],
    ["a modifier the format does not allow", { format: "$saved|wobble" },
      `"taiknr.savings" is configured with a format Jefferson cannot parse${blank}`],
    ["a style the theme refuses", { style: { fg: "nope" } },
      `"taiknr.savings" is configured with a style Jefferson cannot use${blank}`],
    ["formats that are not an object", { formats: 5 },
      `"taiknr.savings" is configured with formats that is not an object${blank}`, composed],
    ["a formats kind the instrument does not carry", { formats: { sleepy: "x" } },
      `"taiknr.savings" is configured with a formats kind "sleepy", which the instrument does not carry${blank}`, composed],
    ["a formats kind that is not a string", { formats: { busy: 5 } },
      `"taiknr.savings" is configured with a formats kind "busy" whose format is not a string${blank}`, composed],
    ["a formats kind Jefferson cannot parse", { formats: { busy: "Busy on $nope" } },
      `"taiknr.savings" is configured with a formats kind "busy" whose format Jefferson cannot parse${blank}`, composed],
  ];
  for (const [label, value, part, payload] of cases) {
    const { session } = settingsDocument(t, value, payload);
    const started = await session;
    assert.deepEqual(started.notified, [{ message: `pi-jefferson: ${part}`, type: "warning" }], label);
    assert.ok(line(started).startsWith("Model: anthropic/claude-opus-4"), `${label}: the rest of the row renders`);
    assert.equal(line(started).includes("Savings"), false, `${label}: the refused entry renders blank`);
  }
});

/** A document configuring one provided name, and the two orders a provider may register in. */
function configuredDocument(
  t: { after(fn: () => void): void }, value: unknown, rows = [[{ instrument: "taiknr.savings" }]],
): { path: string; providerFirst: () => Promise<FakeSession>; jeffersonFirst: () => Promise<FakeSession> } {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { instruments: { "taiknr.savings": value }, rows });
  const send = (h: Harness): void => {
    h.events.emit("jefferson:registration", registration);
    h.events.emit("jefferson:update", saved("$4.10"));
  };
  return {
    path: join(agentDir, "pi-jefferson.json"),
    providerFirst: async () => {
      const h = harness();
      send(h);
      return h.start();
    },
    jeffersonFirst: async () => {
      const h = harness();
      return h.start({ afterSessionStart: () => send(h) });
    },
  };
}

test("A3 both orders render the same configured document", async (t) => {
  const document = configuredDocument(t, { format: "Saved: $saved", label: "T:", style: { fg: "accent" } });
  const before = await document.providerFirst();
  const after = await document.jeffersonFirst();
  assert.equal(stripTerminalSequences(after.lines(80)[0] ?? "").trimEnd(), "T: Saved: $4.10");
  assert.equal(after.lines(80)[0], before.lines(80)[0], "the same document renders the same, whichever came first");
  assert.deepEqual([...before.notified, ...after.notified], [], "a valid configuration says nothing");
});

test("A3 a Jefferson-first fault stays blank", async (t) => {
  const document = configuredDocument(t, { format: "Spent $spent" });
  const session = await document.jeffersonFirst();
  assert.equal(stripTerminalSequences(session.lines(80)[0] ?? "").trimEnd(), placeholder(),
    "the refused instrument's entry renders blank");
});

test("A3 the same document in Jefferson-first order refuses the same instrument", async (t) => {
  const document = configuredDocument(t, { format: "Spent $spent" });
  const before = await document.providerFirst();
  const after = await document.jeffersonFirst();
  assert.equal(before.notified.length, 1);
  assert.deepEqual(after.notified, before.notified, "the outcome depends on the name, not the load order");
  assert.match(after.notified[0]?.message ?? "",
    /"taiknr\.savings" is configured with a format naming "\$spent", which the instrument does not declare; it renders blank/);
});

test("A3 a non-object value for a provided name stays blank, then refuses it alone when it registers", async (t) => {
  const document = configuredDocument(t, 5, [[{ instrument: "model" }, { instrument: "taiknr.savings" }]]);
  const h = harness();
  const session = await h.start({
    model: { provider: "anthropic", id: "claude-opus-4" },
    afterSessionStart: () => {
      h.events.emit("jefferson:registration", registration);
      h.events.emit("jefferson:update", saved("$4.10"));
    },
  });
  assert.deepEqual(session.notified, [{
    message: 'pi-jefferson: "taiknr.savings" is configured with a value that is not an object; it renders blank',
    type: "warning",
  }]);
  const drawn = line(session);
  assert.ok(drawn.startsWith("Model: anthropic/claude-opus-4"), "the rest of the row renders");
  assert.equal(drawn.includes("Savings"), false, "the refused entry stays blank");
});

test("A3 a non-object value for a provided name that never registers leaves the document accepted, with no warning", async (t) => {
  configuredDocument(t, 5, [[{ instrument: "model" }]]);
  const session = await harness().start({ model: { provider: "anthropic", id: "claude-opus-4" } });
  assert.deepEqual(session.notified, [], "no settings are checked for a name that never registered");
});

test("A3 a rejected document's names are never checked when they register", async (t) => {
  const agentDir = useTempAgentDir(t);
  // The row naming the provided instrument normalizes before the second row refuses the document.
  writeAgentDocument(agentDir, {
    instruments: { "taiknr.savings": { format: "Spent $spent" } },
    rows: [[{ instrument: "taiknr.savings" }], []],
  });
  const h = harness();
  const session = await h.start({
    afterSessionStart: () => {
      h.events.emit("jefferson:registration", registration);
      h.events.emit("jefferson:update", saved("$4.10"));
    },
  });
  assert.match(session.notified[0]?.message ?? "", /was rejected \(row 2: is empty; a row lists the instruments it renders\)/);
  assert.equal(session.notified.some(notified => notified.message.includes("is configured with")), false,
    "a rejected read registered no watch");
});

/** A registration whose one instrument's one resolver is the function given. */
function faultyRegistration(resolver: (readings: ReadingsView) => unknown): Registration<"taiknr"> {
  return {
    extension: "taiknr",
    fields: { saved: "string" },
    instruments: [{
      name: "savings",
      variables: { saved: resolver as (readings: ReadingsView) => string | undefined },
      defaultFormat: "Savings: $saved",
    }],
  };
}

/**
 * A session whose row places the model beside one provided entry, with the registration made in the
 * order given. The provider's resolver is the function given, and the fault arrives at a render.
 */
async function providedRow(
  t: { after(fn: () => void): void },
  resolver: (readings: ReadingsView) => unknown,
  order: "provider-first" | "Jefferson-first" = "provider-first",
): Promise<FakeSession> {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { rows: [[{ instrument: "model" }, { instrument: "taiknr.savings" }]] });
  const h = harness();
  const send = (): void => {
    h.events.emit("jefferson:registration", faultyRegistration(resolver));
    h.events.emit("jefferson:update", saved("$4.10"));
  };
  const options = { model: { provider: "anthropic", id: "claude-opus-4" } };
  if (order === "provider-first") {
    send();
    return h.start(options);
  }
  return h.start({ ...options, afterSessionStart: send });
}

/** Let the ledger's microtask deliver what a render recorded. */
async function settle(): Promise<void> {
  await new Promise(resolve => setImmediate(resolve));
}

test("A6 a variable the active format does not name never blanks the instrument", async (t) => {
  const agentDir = useTempAgentDir(t);
  // The block's format names $saved alone; `stubs` is never reported.
  writeAgentDocument(agentDir, {
    rows: [[{ instrument: "taiknr.savings" }]],
    instruments: { "taiknr.savings": { format: "$saved", label: "Saved:" } },
  });
  const withStubs: Registration<"taiknr"> = {
    extension: "taiknr",
    fields: { saved: "string", stubs: "number" },
    instruments: [{
      name: "savings",
      variables: {
        saved: (readings: ReadingsView) => typeof readings.saved === "string" ? readings.saved : undefined,
        stubs: (readings: ReadingsView) => typeof readings.stubs === "number" ? String(readings.stubs) : undefined,
      },
      defaultFormat: "$saved in $stubs stubs",
    }],
  };
  const h = harness();
  h.events.emit("jefferson:registration", withStubs);
  h.events.emit("jefferson:update", saved("$4.10"));
  const session = await h.start();
  assert.equal(line(session), "Saved: $4.10", "a declared variable the format leaves out has no bearing");
  assert.deepEqual(session.notified, []);
});

/** A session whose one row is given, with taiknr registered in the order given and the reports sent. */
async function registeredRow(
  t: { after(fn: () => void): void },
  payload: Registration<"taiknr">,
  row: Array<Record<string, unknown>>,
  reports: ReadonlyArray<{ extension: string; field: string; value: string | number | boolean }> = [],
  order: "provider-first" | "Jefferson-first" = "provider-first",
): Promise<FakeSession> {
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { rows: [row] });
  const h = harness();
  const send = (): void => {
    h.events.emit("jefferson:registration", payload);
    for (const report of reports) h.events.emit("jefferson:update", report);
  };
  const options = { model: { provider: "anthropic", id: "claude-opus-4" } };
  if (order === "provider-first") {
    send();
    return h.start(options);
  }
  return h.start({ ...options, afterSessionStart: send });
}

/** The row's first line with its terminal sequences intact, for a test about styling. */
function rawLine(session: FakeSession, width = 80): string {
  return session.lines(width)[0] ?? "";
}

test("A6 a provided bar draws $bar from its own fields", async (t) => {
  const session = await registeredRow(t, {
    extension: "taiknr",
    fields: { saved: "number" },
    instruments: [{
      name: "usage",
      variables: { saved: (readings: ReadingsView) => typeof readings.saved === "number" ? `${readings.saved}%` : undefined },
      bar: (readings: ReadingsView) => typeof readings.saved === "number" ? readings.saved : undefined,
      defaultFormat: "Used: $saved $bar",
    }],
  }, [{ instrument: "model" }, { instrument: "taiknr.usage" }], [{ extension: "taiknr", field: "saved", value: 50 }]);
  const drawn = line(session);
  assert.match(drawn, /Used: 50% █+░+$/, drawn);
  await settle();
  assert.deepEqual(session.notified, []);
});

test("A6 a provided bar that is unknown blanks the instrument", async (t) => {
  const session = await registeredRow(t, {
    extension: "taiknr",
    fields: { saved: "number" },
    instruments: [{
      name: "usage",
      variables: { saved: (readings: ReadingsView) => typeof readings.saved === "number" ? `${readings.saved}%` : undefined },
      bar: (readings: ReadingsView) => typeof readings.saved === "number" ? readings.saved : undefined,
      defaultFormat: "Used: $saved $bar",
    }],
  }, [{ instrument: "model" }, { instrument: "taiknr.usage" }]);
  assert.equal(line(session), "Model: anthropic/claude-opus-4", "an unknown $bar blanks the instrument");
  await settle();
  assert.deepEqual(session.notified, []);
});

test("A6 a provided form renders through its resolver", async (t) => {
  const session = await registeredRow(t, {
    extension: "taiknr",
    fields: { saved: "number" },
    instruments: [{
      name: "usage",
      variables: { saved: (readings: ReadingsView) => typeof readings.saved === "number" ? String(readings.saved) : undefined },
      variableForms: {
        saved: { percent: (readings: ReadingsView) => typeof readings.saved === "number" ? `${readings.saved}%` : undefined },
      },
      defaultFormat: "$saved|percent",
    }],
  }, [{ instrument: "model" }, { instrument: "taiknr.usage" }], [{ extension: "taiknr", field: "saved", value: 42 }]);
  assert.ok(line(session).endsWith("42%"), line(session));
  await settle();
  assert.deepEqual(session.notified, []);
});

test("A6 a provided colour styles its variable", async (t) => {
  const session = await registeredRow(t, {
    extension: "taiknr",
    fields: { saved: "string" },
    instruments: [{
      name: "usage",
      variables: { saved: (readings: ReadingsView) => typeof readings.saved === "string" ? readings.saved : undefined },
      variableFg: { saved: (value: string) => value === "busy" ? "accent" : undefined },
      defaultFormat: "$saved",
    }],
  }, [{ instrument: "model" }, { instrument: "taiknr.usage" }], [{ extension: "taiknr", field: "saved", value: "busy" }]);
  assert.ok(rawLine(session).includes(fakeTheme().style("busy", { fg: "accent" })), rawLine(session));
  await settle();
  assert.deepEqual(session.notified, []);
});

test("A6 fills takes the row's spare columns", async (t) => {
  const session = await registeredRow(t, {
    extension: "taiknr",
    fields: { saved: "string" },
    instruments: [{
      name: "usage",
      variables: { saved: (readings: ReadingsView) => typeof readings.saved === "string" ? readings.saved : undefined },
      fills: true,
      defaultFormat: "$saved",
    }],
  }, [{ instrument: "taiknr.usage" }, { instrument: "model" }], [{ extension: "taiknr", field: "saved", value: "$4.10" }]);
  const drawn = line(session);
  assert.ok(drawn.startsWith("$4.10"), drawn);
  assert.ok(drawn.indexOf("Model:") >= 50, `the fill took the row's spare columns: ${drawn}`);
  assert.equal(visibleWidth(drawn), 80);
  await settle();
  assert.deepEqual(session.notified, []);
});

test("A6 a provided composed format renders the selected text", async (t) => {
  const session = await registeredRow(t, {
    extension: "taiknr",
    fields: { saved: "string", working: "boolean" },
    instruments: [{
      name: "usage",
      variables: { state: () => undefined },
      composed: {
        variable: "state",
        variables: { saved: (readings: ReadingsView) => typeof readings.saved === "string" ? readings.saved : undefined },
        select: (readings: ReadingsView) => readings.working === true ? "busy" : "idle",
        formats: { busy: "Working on $saved", idle: "Idle" },
      },
      defaultFormat: "$state",
    }],
  }, [{ instrument: "model" }, { instrument: "taiknr.usage" }], [
    { extension: "taiknr", field: "working", value: true },
    { extension: "taiknr", field: "saved", value: "3" },
  ]);
  assert.ok(line(session).endsWith("Working on 3"), line(session));
  await settle();
  assert.deepEqual(session.notified, []);
});

test("A6 every provided member fault part is exact", async (t) => {
  const cases: Array<[label: string, instruments: readonly unknown[], reports: ReadonlyArray<{ extension: string; field: string; value: string | number | boolean }>, part: string]> = [
    ["a bar that throws", [{
      name: "usage", variables: { saved: () => "x" }, bar: () => { throw new Error("provider"); }, defaultFormat: "$saved $bar",
    }], [], "its bar threw"],
    ["a bar that returns text", [{
      name: "usage", variables: { saved: () => "x" }, bar: () => "50", defaultFormat: "$saved $bar",
    }], [], "its bar returned a string, where a finite number or null is declared"],
    ["a bar that returns NaN", [{
      name: "usage", variables: { saved: () => "x" }, bar: () => Number.NaN, defaultFormat: "$saved $bar",
    }], [], "its bar returned a number, where a finite number or null is declared"],
    ["a bar that returns a promise", [{
      name: "usage", variables: { saved: () => "x" }, bar: () => Promise.resolve(50), defaultFormat: "$saved $bar",
    }], [], "its bar returned a promise"],
    ["a form that returns a number", [{
      name: "usage",
      variables: { saved: (readings: ReadingsView) => typeof readings.saved === "string" ? readings.saved : undefined },
      variableForms: { saved: { short: () => 42 } },
      defaultFormat: "$saved|short",
    }], [{ extension: "taiknr", field: "saved", value: "x" }], "its variable returned a number, where text is declared"],
    ["a select that throws", [{
      name: "usage",
      variables: { state: () => undefined },
      composed: {
        variable: "state", variables: { saved: () => "x" },
        select: () => { throw new Error("provider"); }, formats: { busy: "Busy" },
      },
      defaultFormat: "$state",
    }], [], "its select threw"],
  ];
  for (const [label, instruments, reports, part] of cases) {
    const session = await registeredRow(
      t,
      { extension: "taiknr", fields: { saved: "string" }, instruments } as unknown as Registration<"taiknr">,
      [{ instrument: "model" }, { instrument: "taiknr.usage" }],
      reports,
    );
    assert.equal(line(session), "Model: anthropic/claude-opus-4",
      `${label}: the entry renders nothing while the model beside it renders`);
    await settle();
    assert.deepEqual(session.notified, [{
      message: `pi-jefferson: "taiknr.usage" failed to render: ${part}`,
      type: "warning",
    }], label);
  }
});

test("A6 a provided colour the theme does not have falls back to the cell's style", async (t) => {
  const session = await registeredRow(t, {
    extension: "taiknr",
    fields: { saved: "string" },
    instruments: [{
      name: "usage",
      variables: { saved: (readings: ReadingsView) => typeof readings.saved === "string" ? readings.saved : undefined },
      variableFg: { saved: () => "nope" },
      defaultFormat: "$saved",
    }],
  }, [{ instrument: "model" }, { instrument: "taiknr.usage" }], [{ extension: "taiknr", field: "saved", value: "7" }]);
  assert.ok(line(session).endsWith("7"), "no colour is not an unknown datum");
  await settle();
  assert.deepEqual(session.notified, [{
    message: 'pi-jefferson: "taiknr.usage" failed to render: its colour returned "nope", where a theme colour is declared',
    type: "warning",
  }]);
});

test("A6 a provided bar below zero draws an unfilled track", async (t) => {
  const session = await registeredRow(t, {
    extension: "taiknr",
    fields: { saved: "string" },
    instruments: [{
      name: "usage",
      variables: { saved: () => "x" },
      bar: () => -5,
      defaultFormat: "Used: $bar",
    }],
  }, [{ instrument: "model" }, { instrument: "taiknr.usage" }]);
  assert.match(line(session), /Used: ░+$/, line(session));
  await settle();
  assert.deepEqual(session.notified, []);
});

test("A6 a resolver that throws costs only its own entry", async (t) => {
  const session = await providedRow(t, () => { throw new Error("provider threw"); });
  const drawn = line(session);
  assert.ok(drawn.startsWith("Model: anthropic/claude-opus-4"), "the rest of the row renders");
  assert.equal(drawn.includes("Savings"), false, "the entry renders nothing, label included");
  await settle();
  assert.deepEqual(session.notified, [
    { message: 'pi-jefferson: "taiknr.savings" failed to render: its variable threw', type: "warning" },
  ]);
});

test("A6 a resolver that returns a number loses only its own text", async (t) => {
  const session = await providedRow(t, () => 42);
  const drawn = line(session);
  assert.ok(drawn.startsWith("Model: anthropic/claude-opus-4"));
  assert.equal(drawn.includes("42"), false, "only that entry loses its text");
  await settle();
  assert.deepEqual(session.notified, [{
    message: 'pi-jefferson: "taiknr.savings" failed to render: its variable returned a number, where text is declared',
    type: "warning",
  }]);
});

test("A6 a resolver that returns a rejected promise costs only its own entry", async (t) => {
  const session = await providedRow(t, () => Promise.reject(new Error("provider rejected")));
  const drawn = line(session);
  assert.ok(drawn.startsWith("Model: anthropic/claude-opus-4"));
  await settle();
  assert.deepEqual(session.notified, [{
    message: 'pi-jefferson: "taiknr.savings" failed to render: its variable returned a promise',
    type: "warning",
  }], "the rejection is observed, so the process keeps running");
});

test("A6 a resolver that returns undefined reports no fault", async (t) => {
  const session = await providedRow(t, () => undefined);
  assert.ok(line(session).startsWith("Model: anthropic/claude-opus-4"));
  await settle();
  assert.deepEqual(session.notified, [], "`undefined` is the declaration's own unknown value");
});

test("A6 a variable that resolves to nothing renders nothing, with no fault", async (t) => {
  // Nothing was reported for the field, so the resolver sees unknown and the entry renders nothing.
  const agentDir = useTempAgentDir(t);
  writeAgentDocument(agentDir, { rows: [[{ instrument: "model" }, { instrument: "taiknr.savings" }]] });
  const h = harness();
  h.events.emit("jefferson:registration", registration);
  const unreported = await h.start({ model: { provider: "anthropic", id: "claude-opus-4" } });
  const drawn = line(unreported);
  assert.ok(drawn.startsWith("Model: anthropic/claude-opus-4"));
  assert.equal(drawn.includes("Savings"), false, "the entry renders nothing, label included");
  await settle();
  assert.deepEqual(unreported.notified, [], "and no fault is reported");
});

test("A6 a resolver that throws on every render warns once", async (t) => {
  const session = await providedRow(t, () => { throw new Error("provider threw"); });
  line(session);
  // A notify raised inside a render schedules another render, and that one another: the fault waits
  // for the ledger's flush instead (design 7; the spec's "None MUST be raised inside a render").
  assert.deepEqual(session.notified, [], "nothing is raised inside the render");
  await settle();
  assert.equal(session.notified.length, 1, "one part after the first render's flush");
  for (let frame = 0; frame < 5; frame++) line(session);
  await settle();
  assert.equal(session.notified.length, 1, "and still one after sixty frames' worth of renders");
});

test("A6 a thenable whose then getter throws is contained, provider-first", async (t) => {
  const session = await providedRow(t, () => ({ get then(): never { throw new Error("provider getter"); } }));
  const drawn = line(session);
  assert.ok(drawn.startsWith("Model: anthropic/claude-opus-4"), "the rest of the row renders");
  assert.equal(drawn.includes("Savings"), false);
  await settle();
  assert.deepEqual(session.notified, [
    { message: 'pi-jefferson: "taiknr.savings" failed to render: its variable threw', type: "warning" },
  ], "the outer boundary records the threw row, once");
});

test("A6 a thenable whose then getter throws is contained, Jefferson-first", async (t) => {
  const session = await providedRow(
    t, () => ({ get then(): never { throw new Error("provider getter"); } }), "Jefferson-first",
  );
  const drawn = line(session);
  assert.ok(drawn.startsWith("Model: anthropic/claude-opus-4"), "the rest of the row renders");
  assert.equal(drawn.includes("Savings"), false);
  await settle();
  assert.deepEqual(session.notified, [
    { message: 'pi-jefferson: "taiknr.savings" failed to render: its variable threw', type: "warning" },
  ]);
});

test("A6 every resolver fault part is exact", async (t) => {
  const cases: Array<[label: string, resolver: (readings: ReadingsView) => unknown, part: string | undefined]> = [
    ["a throw", () => { throw new Error("provider threw"); }, "its variable threw"],
    ["a number", () => 42, "its variable returned a number, where text is declared"],
    ["a boolean", () => true, "its variable returned a boolean, where text is declared"],
    ["a bigint", () => 42n, "its variable returned a bigint, where text is declared"],
    ["a symbol", () => Symbol("saved"), "its variable returned a symbol, where text is declared"],
    ["a function", () => () => "text", "its variable returned a function, where text is declared"],
    ["an object", () => ({ saved: "$4.10" }), "its variable returned an object, where text is declared"],
    ["an array", () => ["$4.10"], "its variable returned an object, where text is declared"],
    ["null", () => null, "its variable returned null, where text is declared"],
    ["a promise", () => Promise.resolve("$4.10"), "its variable returned a promise"],
    ["undefined", () => undefined, undefined],
  ];
  for (const [label, resolver, part] of cases) {
    const session = await providedRow(t, resolver);
    line(session);
    await settle();
    assert.deepEqual(session.notified, part === undefined ? [] : [{
      message: `pi-jefferson: "taiknr.savings" failed to render: ${part}`,
      type: "warning",
    }], label);
  }
});

test("A7 an accepted registration requests one repaint", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  await h.start({
    afterSessionStart: (running) => {
      const before = running.repaints();
      h.events.emit("jefferson:registration", registration);
      assert.equal(running.repaints(), before + 1, "one repaint for the accepted registration");
      // A fields-only registration is accepted too, so it takes its one repaint.
      h.events.emit("jefferson:registration", { extension: "taiknr", fields: { saved: "string" }, instruments: [] });
      assert.equal(running.repaints(), before + 2);
    },
  });
});

test("A7 a changed report requests one repaint", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  await h.start({
    afterSessionStart: (running) => {
      h.events.emit("jefferson:registration", registration);
      h.events.emit("jefferson:update", saved("$4.10"));
      const before = running.repaints();
      h.events.emit("jefferson:update", saved("$9.99"));
      assert.equal(running.repaints(), before + 1, "a changed value asks for the render that shows it");
    },
  });
});

test("A7 a same-value report requests none", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  await h.start({
    afterSessionStart: (running) => {
      h.events.emit("jefferson:registration", registration);
      h.events.emit("jefferson:update", saved("$4.10"));
      const before = running.repaints();
      h.events.emit("jefferson:update", saved("$4.10"));
      assert.equal(running.repaints(), before, "reporting what is already held costs no render");
    },
  });
});

test("A7 a refused registration requests no repaint", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  await h.start({
    afterSessionStart: (running) => {
      const before = running.repaints();
      h.events.emit("jefferson:registration", 5);
      assert.equal(running.repaints(), before, "nothing a row renders changed");
    },
  });
});

test("A7 a field reads unknown before any report", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  h.events.emit("jefferson:registration", registration);
  const session = await h.start();
  assert.equal(line(session), "", "an unreported field is unknown, not an empty string");
});

test("A7 nothing a provider reported survives a session replacement", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  const h = harness();
  h.events.emit("jefferson:registration", registration);
  h.events.emit("jefferson:update", saved("$4.10"));
  assert.equal(line(await h.start()), "Savings: $4.10");

  h.dispatch({ type: "session_shutdown", reason: "reload" });
  // The provider registers again in the new session, and reports nothing.
  h.events.emit("jefferson:registration", registration);
  assert.equal(line(await h.start()), "", "only the new session's reports are read");
});

test("A9 a boolean field reads false as reported, and unknown before the report", async (t) => {
  documentShowing(t, [["taiknr.working"]]);
  const work: Registration<"taiknr"> = {
    extension: "taiknr",
    fields: { working: "boolean" },
    instruments: [{
      name: "working",
      variables: {
        state: (readings: ReadingsView) => readings.working === false ? "idle"
          : readings.working === true ? "busy" : undefined,
      },
      defaultFormat: "Working: $state",
    }],
  };
  const h = harness();
  h.events.emit("jefferson:registration", work);
  const session = await h.start();
  assert.equal(line(session), "", "unknown before the report");
  h.events.emit("jefferson:update", { extension: "taiknr", field: "working", value: false });
  assert.equal(line(session), "Working: idle", "false is a value, distinct from unknown");
});

test("A9 a report that is not finite takes its row", async (t) => {
  documentShowing(t, [["model"]]);
  const amount: Registration<"taiknr"> = { extension: "taiknr", fields: { amount: "number" }, instruments: [] };
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const h = harness();
    h.events.emit("jefferson:registration", amount);
    h.events.emit("jefferson:update", { extension: "taiknr", field: "amount", value });
    const session = await h.start({ model: { provider: "anthropic", id: "claude-opus-4" } });
    assert.deepEqual(session.notified, [
      { message: 'pi-jefferson: taiknr reports "amount" as a number that is not finite', type: "warning" },
    ], String(value));
  }
  // A number where a string was declared takes the wrong-type row instead.
  const wrong = harness();
  wrong.events.emit("jefferson:registration", registration);
  wrong.events.emit("jefferson:update", { extension: "taiknr", field: "saved", value: 4 });
  const session = await wrong.start({ model: { provider: "anthropic", id: "claude-opus-4" } });
  assert.deepEqual(session.notified, [
    { message: 'pi-jefferson: taiknr reports "saved" as a number, and it declared string', type: "warning" },
  ]);
});

test("A8 isProvidedName treats jeffersonfan.stats as provided", () => {
  assert.equal(isProvidedName("jeffersonfan.stats"), true, "the comparison is on the whole first part");
  assert.equal(isProvidedName("taiknr.savings"), true);
  assert.equal(isProvidedName("jefferson.default.path"), false);
  assert.equal(isProvidedName("jefferson.custom.mine"), false, "three parts belong to Jefferson");
  assert.equal(isProvidedName("a.b.c"), true, "any name outside jefferson. is a provider's, whatever its parts");
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
    events, registry, faults: createFaultLedger(), fields: createProviderFields(() => {}), repaint: () => {},
    own: { extension: "jefferson", instruments: SHIPPED },
  });
  for (const declaration of SHIPPED) {
    assert.equal(registry.instrument(declaration.name), declaration, declaration.name);
  }
});

/** The one settings part a block-only provided name takes, whichever came first. */
const BLOCK_ONLY_PART = 'pi-jefferson: "taiknr.savings" is configured with a format naming "$nope", which the instrument does not declare; it renders blank';

test("A8 a provider's name may be anything outside jefferson.", async (t) => {
  documentShowing(t, [["Taiknr Pro.savings.total"]]);
  const h = harness();
  const payload: Registration<"Taiknr Pro"> = {
    extension: "Taiknr Pro",
    fields: { saved: "string" },
    instruments: [{ ...registration.instruments[0]!, name: "savings.total" }],
  };
  h.events.emit("jefferson:registration", payload);
  h.events.emit("jefferson:update", { extension: "Taiknr Pro", field: "saved", value: "$4.10" });
  const session = await h.start();
  assert.equal(line(session), "Savings: $4.10", "the composed name is Taiknr Pro.savings.total");
  assert.deepEqual(session.notified, []);
});

test("A2 a registration under jefferson. is refused, whatever follows the prefix", async (t) => {
  const path = documentShowing(t, [["model"], ["jefferson.custom.mine"]]);
  const h = harness();
  h.events.emit("jefferson:registration", {
    extension: "jefferson.custom",
    instruments: [{ ...registration.instruments[0]!, name: "mine" }],
  });
  const session = await h.start({ model: { provider: "anthropic", id: "claude-opus-4" } });
  assert.deepEqual(session.notified, [
    { message: `pi-jefferson: ${path} row 2: "jefferson.custom.mine" is not a known instrument`, type: "warning" },
    { message: 'pi-jefferson: a registration claims "jefferson.custom", which belongs to Jefferson', type: "warning" },
  ]);
});

test("A3 an instruments-block entry whose instrument never registers draws no warning", async (t) => {
  const agentDir = useTempAgentDir(t);
  // Silent, whatever the entry holds and whoever the name belongs to: its settings are checked only
  // when the instrument registers (owner-rulings.md, 2026-11-16).
  writeAgentDocument(agentDir, {
    instruments: { "taiknr.savings": 5, nope: 5, "a.b.c": { format: "$x" }, "jefferson.custom.mine": [] },
    rows: [[{ instrument: "model" }]],
  });
  const session = await harness().start({ model: { provider: "anthropic", id: "claude-opus-4" } });
  assert.deepEqual(session.notified, []);
  assert.equal(line(session), "Model: anthropic/claude-opus-4", "the document is accepted");
});

test("A3 a block-only provided name is checked provider-first", async (t) => {
  // No row places the name: only the instruments block configures it, so the check must come from
  // the watch the block's raw value takes.
  const document = configuredDocument(t, { format: "$nope" }, [[{ instrument: "model" }]]);
  const session = await document.providerFirst();
  assert.deepEqual(session.notified, [{ message: BLOCK_ONLY_PART, type: "warning" }]);
});

test("A3 a block-only provided name is checked Jefferson-first", async (t) => {
  const document = configuredDocument(t, { format: "$nope" }, [[{ instrument: "model" }]]);
  const session = await document.jeffersonFirst();
  assert.deepEqual(session.notified, [{ message: BLOCK_ONLY_PART, type: "warning" }],
    "the outcome depends on the name, never on the load order");
});

test("A3 a rejected document reports no settings fault, provider-first", async (t) => {
  const agentDir = useTempAgentDir(t);
  // Row two is refused after the block's provided name was checked, so the settings fault the check
  // found belongs to a document that never installed.
  writeAgentDocument(agentDir, {
    instruments: { "taiknr.savings": { format: "Spent $spent" } },
    rows: [[{ instrument: "taiknr.savings" }], [{ instrument: "model", align: "rgiht" }]],
  });
  const h = harness();
  h.events.emit("jefferson:registration", registration);
  const session = await h.start({ model: { provider: "anthropic", id: "claude-opus-4" } });
  assert.equal(session.notified.length, 1, "one notice, and it is the rejection");
  assert.match(session.notified[0]?.message ?? "", /was rejected/);
  assert.equal(session.notified.some(notified => notified.message.includes("is configured with")), false,
    "a document that never installed says nothing about its settings");
});

test("A8 no bus handler of Jefferson's raises an error, from the factory through a report", async (t) => {
  documentShowing(t, [["taiknr.savings"]]);
  // pi's bus catches whatever a handler throws and prints it, so a handler that reads a binding
  // before it is initialized still runs and the suite still passes: nothing else would notice.
  const errors = t.mock.method(console, "error");
  const h = harness();
  const session = await h.start({
    afterSessionStart: () => {
      h.events.emit("jefferson:registration", registration);
      h.events.emit("jefferson:update", saved("$4.10"));
    },
  });
  assert.equal(line(session), "Savings: $4.10");
  assert.deepEqual(errors.mock.calls.map(call => call.arguments), [], "no bus handler raised");
});

test("A1 two providers' fields of one name are separate", () => {
  const fields = createProviderFields(() => {});
  fields.declare("taiknr", { saved: "string" });
  fields.declare("other", { saved: "number" });
  fields.report("taiknr", "saved", "$4.10");
  fields.report("other", "saved", 12);
  assert.equal(fields.view("taiknr").saved, "$4.10");
  assert.equal(fields.view("other").saved, 12);
});

test("A1 the view holds only that provider's declared fields", () => {
  const fields = createProviderFields(() => {});
  fields.declare("taiknr", { saved: "string" });
  fields.declare("other", { saved: "number", working: "boolean" });
  fields.report("other", "saved", 3);
  assert.deepEqual(Object.keys(fields.view("other")).sort(), ["saved", "working"]);
  assert.equal(fields.view("other").working, undefined, "declared and not yet reported");
  assert.equal(fields.view("taiknr").working, undefined, "another provider's field");
  assert.deepEqual(Object.keys(fields.view("taiknr")), ["saved"]);
});

test("A1 an undeclared key reads undefined", () => {
  const fields = createProviderFields(() => {});
  fields.declare("taiknr", { saved: "string" });
  assert.equal(fields.view("taiknr").spent, undefined);
  assert.equal(fields.view("taiknr").saved, undefined, "declared and unreported is unknown too");
});

test("A1 checkFields answers outside and conflict", () => {
  const fields = createProviderFields(() => {});
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
  const fields = createProviderFields(() => {});
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
  }, () => {});
  assert.ok(!("refused" in adapted));
  const readings = {} as Readings;
  assert.equal(adapted.variables.saved?.(readings), "$1");
  assert.equal(adapted.variables.saved?.(readings), "$2", "each call asks the provider's view again");
});

test("A1 a resolver that is not a function is refused", () => {
  const declaration = { ...registration.instruments[0]!, variables: { saved: "nope" } } as unknown as ProvidedDeclaration;
  assert.deepEqual(adaptProvidedDeclaration("taiknr.savings", declaration, () => ({}), () => {}),
    { refused: "resolver-not-function", variable: "saved" });
});

test("A1 a default label that is not a string is refused", () => {
  const declaration = { ...registration.instruments[0]!, defaultLabel: 4 } as unknown as ProvidedDeclaration;
  assert.deepEqual(adaptProvidedDeclaration("taiknr.savings", declaration, () => ({}), () => {}), { refused: "label-not-string" });
});

test("A1 a default format Jefferson cannot parse is refused", () => {
  const declaration = { ...registration.instruments[0]!, defaultFormat: "Spent $spent" } as unknown as ProvidedDeclaration;
  assert.deepEqual(adaptProvidedDeclaration("taiknr.savings", declaration, () => ({}), () => {}),
    { refused: "unparseable-default-format" });
  // The table's row order decides which fault a payload with two is refused for.
  const twice = { ...declaration, defaultLabel: 4 } as unknown as ProvidedDeclaration;
  assert.deepEqual(adaptProvidedDeclaration("taiknr.savings", twice, () => ({}), () => {}), { refused: "unparseable-default-format" });
});
