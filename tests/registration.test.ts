import assert from "node:assert/strict";
import { test } from "node:test";

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createEventBus, type EventBus } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences, truncateToWidth } from "@earendil-works/pi-tui";

import type { InstrumentDeclaration } from "../extensions/jefferson/components/instruments/instrument.ts";
import { adaptProvidedDeclaration } from "../extensions/jefferson/components/instruments/instrument-binding.ts";
import type { Readings } from "../extensions/jefferson/data/session-data-store.ts";
import { createProviderFields } from "../extensions/jefferson/data/provider-fields.ts";
import { createFaultLedger } from "../extensions/jefferson/faults.ts";
import { createRegistrationListener } from "../extensions/jefferson/registration-listener.ts";
import {
  createRegistry, isNamePart, isProvidedName, normalizeName,
} from "../extensions/jefferson/registration.ts";
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
    ["extension grammar", events => events.emit("jefferson:registration", { extension: "Taiknr", instruments: [] }),
      'a registration names the extension "Taiknr", which is not a lowercase name'],
    ["empty extension name", events => events.emit("jefferson:registration", { extension: "", instruments: [] }),
      'a registration names the extension "", which is not a lowercase name'],
    ["jefferson claim", events => events.emit("jefferson:registration", { extension: "jefferson", instruments: [] }),
      'a registration claims "jefferson", which belongs to Jefferson'],
    ["no instruments", events => events.emit("jefferson:registration", { extension: "taiknr" }),
      'registration from "taiknr" carries no instruments'],
    ["instruments not a list", events => events.emit("jefferson:registration", { extension: "taiknr", instruments: {} }),
      'registration from "taiknr" carries no instruments'],
    ["declaration shape", events => events.emit("jefferson:registration", from({ instruments: [5] })),
      'registration from "taiknr" carries an instrument that is not a declaration'],
    ["no declaration name", events => events.emit("jefferson:registration", from({ instruments: [{ variables: {}, defaultFormat: "" }] })),
      'registration from "taiknr" carries a declaration with no name'],
    ["declaration name grammar", events => events.emit("jefferson:registration", from({ instruments: [{ name: "Savings" }] })),
      'registration from "taiknr" carries "Savings", which is not a single lowercase name'],
    ["a dotted part", events => events.emit("jefferson:registration", from({ instruments: [{ name: "custom.mine" }] })),
      'registration from "taiknr" carries "custom.mine", which is not a single lowercase name'],
    ["a taken name", events => {
      events.emit("jefferson:registration", registration);
      events.emit("jefferson:registration", registration);
    }, '"taiknr.savings" is already registered, so this registration is refused'],
    ["a repeated name", events => events.emit("jefferson:registration", from({ instruments: [savings, savings] })),
      'registration from "taiknr" carries "savings" twice'],
    ["no resolvers", events => events.emit("jefferson:registration", from({ instruments: [{ name: "savings", defaultFormat: "" }] })),
      '"taiknr.savings" carries no resolvers'],
    ["no default format", events => events.emit("jefferson:registration", from({ instruments: [{ name: "savings", variables: savings.variables }] })),
      '"taiknr.savings" carries no default format'],
    ["unparseable default format", events => events.emit("jefferson:registration",
      from({ instruments: [{ ...savings, defaultFormat: "Spent $spent" }] })),
      '"taiknr.savings" carries a default format Jefferson cannot parse'],
    ["label not a string", events => events.emit("jefferson:registration", from({ instruments: [{ ...savings, defaultLabel: 4 }] })),
      '"taiknr.savings" carries a default label that is not a string'],
    ["resolver not a function", events => events.emit("jefferson:registration", from({ instruments: [{ ...savings, variables: { saved: 4 } }] })),
      '"taiknr.savings" carries a resolver "saved" that is not a function'],
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
    message: 'pi-jefferson: "taiknr.savings" carries a resolver "saved" that is not a function',
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
  const payload: Registration = {
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
  posted.variables = { saved: () => "hijacked" };

  assert.equal(line(await h.start()), "Savings: $4.10", "what Jefferson renders is what it accepted");
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
    events, registry, faults: createFaultLedger(), fields: createProviderFields(),
    own: { extension: "jefferson", instruments: SHIPPED },
  });
  events.emit("jefferson:registration", registration);
  assert.notEqual(registry.instrument("taiknr.savings"), undefined, "a provider's two-part name registers");
  assert.equal(registry.instrument("jefferson.custom.mine"), undefined, "three parts belong to Jefferson");
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
    events, registry, faults: createFaultLedger(), fields: createProviderFields(),
    own: { extension: "jefferson", instruments: SHIPPED },
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
