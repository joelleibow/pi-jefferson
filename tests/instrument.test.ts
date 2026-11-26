import assert from "node:assert/strict";
import { test } from "node:test";

import { stripTerminalSequences } from "@earendil-works/pi-tui";

import { DEFAULT_CELL_TEXT, type InstrumentDeclaration } from "../extensions/jefferson/components/instruments/instrument.ts";
import { blank } from "../extensions/jefferson/components/instruments/blank.ts";
import { SHIPPED } from "../extensions/jefferson/shipped.ts";
import { shippedInstrument } from "./shipped-instrument.ts";
import type { Notice } from "../extensions/jefferson/data/notice.ts";
import type { Readings, Timed } from "../extensions/jefferson/data/session-data-store.ts";
import { foregroundCheck } from "../extensions/jefferson/format.ts";
import { fakeTheme } from "./fake-theme.ts";

const fgCheck = foregroundCheck(fakeTheme());

const seed: Readings = {
  provider: "anthropic", model: "claude-opus-4", thinkingLevel: "high",
  cwd: "/Users/joelleibow/Projects/pi-jefferson", home: "/Users/joelleibow",
  branch: "main", sessionName: "refactor footer",
  statuses: new Map([["b", "idle"], ["a", "3 tasks"]]),
  contextUsage: { tokens: 86400, percent: 43.2, contextWindow: 200000 },
  totals: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
  sampledAt: 0,
};
const unknown: Readings = {
  provider: undefined, model: undefined, thinkingLevel: undefined,
  cwd: undefined, home: undefined, branch: undefined, sessionName: undefined, statuses: undefined,
  contextUsage: undefined, totals: undefined, sampledAt: undefined,
};

/** Any datum this declaration does not display must remain unread. */
function unreadable(known: Partial<Readings> = {}): Readings {
  const readings = {} as Readings;
  for (const key of Object.keys(unknown) as Array<keyof Readings>) {
    Object.defineProperty(readings, key, Object.hasOwn(known, key)
      ? { value: known[key], enumerable: true }
      : { get: () => { throw new Error(`the instrument read ${key}, a datum it does not display`); }, enumerable: true });
  }
  return readings;
}

const shapes = [
  ["blank", [], DEFAULT_CELL_TEXT],
  ["model", ["provider", "model"], "$provider/$model"],
  ["thinking", ["level"], "$level|capitalize"],
  ["path", ["path"], "$path"],
  ["context", ["tokens", "window", "percent"], "$percent/$window"],
  ["tokens", ["input", "output", "cacheRead", "cacheWrite", "totalTokens"], "$totalTokens"],
  ["cost", ["cost"], "$cost"],
  ["branch", ["branch"], "$branch"],
  ["session", ["name"], "$name"],
  ["status", ["status"], "$status"],
  ["notice", ["notice"], "$notice"],
] as const;

/** Every shipped declaration's default label, and `blank`'s deliberate absence [D3]. */
const labels = {
  blank: undefined, model: "Model:", thinking: "Thinking:", path: "Path:", context: "Context:",
  tokens: "Tokens:", cost: "Cost:", branch: "Branch:", session: "Session:", status: "Status:",
  notice: "Notice:",
} as const;

function named(name: string): InstrumentDeclaration {
  const declaration = shippedInstrument(name);
  assert.ok(declaration, `${name} is shipped`);
  assert.equal(declaration.name, `jefferson.default.${name}`);
  return declaration;
}

/**
 * One render through the real binding, fresh per call: the defaults reach the bar by the binding's
 * own path, and `label: ""` keeps the bound label out of a case that formats its own text.
 */
async function render(name: string, readings: Readings, format?: string): Promise<string> {
  const declaration = named(name);
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const { parseFormat } = await import("../extensions/jefferson/format.ts");
  const segments = parseFormat(declaration, format ?? declaration.defaultFormat, fgCheck);
  return instrumentBindings(fgCheck, new Map([[declaration.name, { segments, style: {}, label: "" }]]))(declaration)
    .render(readings, 80, fakeTheme());
}

test("the eleven shipped declarations own their names, variables, defaults and foundational options", () => {
  const declared: Record<string, string | undefined> = {};
  const declarations = shapes.map(([name, variables, format]) => {
    const declaration = named(name);
    assert.deepEqual(Object.keys(declaration.variables), variables);
    assert.equal(declaration.defaultFormat, format);
    assert.deepEqual(declaration.options.slice(0, 3), ["format", "style", "label"]);
    assert.deepEqual(declaration.options.slice(3), [
      ...(name === "notice" ? ["seconds", "formats"] : []),
      ...(declaration.bar !== undefined ? ["thresholds", "fill"] : []),
    ], `${name}'s options beyond the foundational three follow its own bar`);
    declared[name] = declaration.defaultLabel;
    assert.equal(Object.isFrozen(declaration.options), true);
    assert.equal(typeof declaration.bar === "function", name === "context");
    return declaration;
  });
  assert.equal(declarations.length, 11);
  assert.deepEqual(declared, labels, "every declaration's default label, and blank's absence");
  for (const declaration of declarations) assert.deepEqual(declaration.options.slice(0, 3), blank.options);
  assert.deepEqual(
    declarations.filter(declaration => declaration.bar !== undefined).map(declaration => declaration.name),
    ["jefferson.default.context"],
    "context is the only shipped declaration that carries a bar",
  );
  assert.equal(shippedInstrument("blank"), blank);
});

test("A8 the shipped names are the set the extension shipped", () => {
  const before = ["blank", "model", "thinking", "path", "context", "tokens", "cost", "branch", "session", "status", "notice"];
  assert.deepEqual(SHIPPED.map(declaration => declaration.name), before.map(bare => `jefferson.default.${bare}`));
  for (const bare of before) assert.ok(shippedInstrument(bare), bare);
});

test("every shipped default parses and renders its declared text", async () => {
  const expected = [
    DEFAULT_CELL_TEXT, "anthropic/claude-opus-4", fakeTheme().style("High", { fg: "thinkingHigh" }), "pi-jefferson",
    "43.2%/200k", "0", "$0.000", "main", "refactor footer", "3 tasks idle", "",
  ];
  for (const [index, [name]] of shapes.entries()) {
    assert.equal(await render(name, seed), expected[index], name);
  }
});

test("blank resolves its placeholder without reading any datum", async () => {
  assert.equal(await render("blank", seed), DEFAULT_CELL_TEXT);
  assert.equal(await render("blank", unknown), DEFAULT_CELL_TEXT);
  assert.equal(await render("blank", unreadable()), DEFAULT_CELL_TEXT);
});

test("model and thinking default formats render their declared text", async () => {
  assert.equal(await render("model", seed), "anthropic/claude-opus-4");
  assert.equal(await render("thinking", seed), fakeTheme().style("High", { fg: "thinkingHigh" }));
  assert.equal(await render("thinking", { ...seed, thinkingLevel: "off" }), fakeTheme().style("Off", { fg: "thinkingOff" }));
});

test("every thinking level renders its level text in that level's own thinking foreground", async () => {
  const theme = fakeTheme();
  const levels = [
    ["off", "thinkingOff"], ["minimal", "thinkingMinimal"], ["low", "thinkingLow"],
    ["medium", "thinkingMedium"], ["high", "thinkingHigh"], ["xhigh", "thinkingXhigh"], ["max", "thinkingMax"],
  ] as const;
  const foregrounds: string[] = [];
  for (const [level, token] of levels) {
    const capitalized = level[0]!.toUpperCase() + level.slice(1);
    assert.equal(await render("thinking", { ...seed, thinkingLevel: level }), theme.style(capitalized, { fg: token }), level);
    foregrounds.push(theme.getFgAnsi(token));
  }
  assert.equal(new Set(foregrounds).size, levels.length, "no two levels share a foreground");
});

test("each declaration reads only the datums its variables display", async () => {
  assert.equal(await render("model", unreadable({ provider: "anthropic", model: "claude-opus-4" })), "anthropic/claude-opus-4");
  assert.equal(await render("thinking", unreadable({ thinkingLevel: "high" })), fakeTheme().style("High", { fg: "thinkingHigh" }));
  assert.equal(await render("path", unreadable({ cwd: seed.cwd })), "pi-jefferson");
  assert.equal(await render("context", unreadable({ contextUsage: seed.contextUsage })), "43.2%/200k");
  assert.equal(await render("tokens", unreadable({ totals: seed.totals })), "0");
  assert.equal(await render("cost", unreadable({ totals: seed.totals })), "$0.000");
});

test("an unknown model datum blanks the declaration only when its format names it", async () => {
  assert.equal(await render("model", { ...seed, provider: undefined }, "$model"), "claude-opus-4");
  assert.equal(await render("model", { ...seed, provider: undefined }, "$provider"), "");
  assert.equal(await render("model", { ...seed, model: undefined }), "");
  assert.equal(await render("model", unknown), "");
  assert.equal(await render("model", { ...seed, provider: "" }, "$provider: $model"), ": claude-opus-4");
});

test("the level's token is chosen from the value before a modifier changes it", async () => {
  assert.equal(await render("thinking", seed, "$level|capitalize"), fakeTheme().style("High", { fg: "thinkingHigh" }));
});

test("unknown thinking renders nothing and never invents off", async () => {
  assert.equal(await render("thinking", { ...seed, thinkingLevel: undefined }), "");
});

test("compact counts follow the ratified decimal band rather than the host's 10000 cutoff", async () => {
  for (const [value, expected] of [
    [0, "0"], [999, "999"], [1000, "1.0k"], [20400, "20.4k"], [86400, "86.4k"],
    [99999, "100.0k"], [100000, "100k"], [200000, "200k"], [999999, "1000k"],
    [1000000, "1.0M"], [9999999, "10.0M"], [10000000, "10M"],
  ] as const) {
    assert.equal(await render("context", { ...seed, contextUsage: { tokens: value, percent: 43.2, contextWindow: 200000 } }, "$tokens"), expected, String(value));
    assert.equal(await render("tokens", { ...seed, totals: { input: value, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 } }, "$input"), expected, String(value));
  }
});

test("percent and cost variables arrive already formatted without a subscription annotation", async () => {
  assert.equal(await render("context", seed, "$percent"), "43.2%");
  assert.equal(await render("context", { ...seed, contextUsage: { tokens: null, percent: null, contextWindow: 200000 } }, "$percent"), "?");
  assert.equal(await render("cost", { ...seed, totals: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0.123 } }), "$0.123");
  assert.equal(await render("cost", seed), "$0.000");
});

test("a $bar-only context renders nothing with no usage, and an unfilled track for a null estimate", async () => {
  // No usage at all is unknown, so a format that names only $bar renders nothing.
  assert.equal(await render("context", unknown, "$bar"), "");
  // A null estimate is a known usage with nothing to fill, so the dim track draws unfilled.
  const { stripTerminalSequences } = await import("@earendil-works/pi-tui");
  assert.equal(
    stripTerminalSequences(await render("context", {
      ...seed, contextUsage: { tokens: null, contextWindow: 200000, percent: null },
    }, "$bar")),
    "░".repeat(80),
  );
});

test("context distinguishes known estimates, null estimates, absent usage and real zero", async () => {
  assert.equal(await render("context", seed), "43.2%/200k");
  assert.equal(await render("context", seed, "$tokens"), "86.4k");
  const compacted = { ...seed, contextUsage: { tokens: null, percent: null, contextWindow: 200000 } };
  assert.equal(await render("context", compacted), "?/200k");
  assert.equal(await render("context", compacted, "$tokens"), "?");
  assert.equal(await render("context", { ...seed, contextUsage: undefined }), "");
  for (const percent of [0, 100, 150]) {
    assert.equal(await render("context", { ...seed, contextUsage: { tokens: 0, percent, contextWindow: 200000 } }), `${percent.toFixed(1)}%/200k`);
  }
});

test("path renders only the basename including trailing-separator and root boundaries", async () => {
  for (const [cwd, expected] of [
    ["/Users/joelleibow/Projects/pi-jefferson", "pi-jefferson"], ["/a/b/", "b"], ["x", "x"], ["/", ""], [undefined, ""],
  ] as const) {
    assert.equal(await render("path", { ...seed, cwd }), expected);
  }
});

test("path's base form is the basename a bare $path renders", async () => {
  assert.equal(await render("path", seed), "pi-jefferson");
  assert.equal(await render("path", seed, "$path|base"), "pi-jefferson");
  assert.equal(await render("path", seed, "$path|base"), await render("path", seed));
});

test("a variable's forms are its named resolvers, and a bare $name hands out its variables entry", () => {
  const declaration = named("path");
  const forms = declaration.variableForms?.path;
  assert.ok(forms, "path declares forms for $path");
  assert.deepEqual(
    Object.keys(forms).sort(),
    ["absolute", "base", "relative"],
    "the forms are the named resolvers, with no second home for the default",
  );
  assert.equal(forms.base, declaration.variables.path, "the form named base is the resolver a bare $path renders");
});

test("path's absolute form is the whole directory", async () => {
  assert.equal(await render("path", seed, "$path|absolute"), "/Users/joelleibow/Projects/pi-jefferson");
});

test("path's relative form is pi's rule: ~ at home, ~/ below it, the path outside it", async () => {
  assert.equal(await render("path", seed, "$path|relative"), "~/Projects/pi-jefferson");
  assert.equal(await render("path", { ...seed, cwd: "/Users/joelleibow" }, "$path|relative"), "~");
  assert.equal(await render("path", { ...seed, cwd: "/opt/work" }, "$path|relative"), "/opt/work");
});

test("path's relative form holds for a trailing separator on home and for a sibling that only shares its prefix", async () => {
  assert.equal(
    await render("path", { ...seed, home: "/Users/joelleibow/", cwd: "/Users/joelleibow/Projects" }, "$path|relative"),
    "~/Projects",
  );
  assert.equal(
    await render("path", { ...seed, home: "/Users/joelleibow", cwd: "/Users/joelleibow2/app" }, "$path|relative"),
    "/Users/joelleibow2/app",
    "joelleibow2 is not under joelleibow",
  );
});

test("an unknown home directory renders the absolute directory, and the cell is not empty", async () => {
  const relative = await render("path", { ...seed, home: undefined }, "$path|relative");
  assert.equal(relative, "/Users/joelleibow/Projects/pi-jefferson");
  assert.notEqual(relative, "");
});

test("an unknown working directory renders nothing in every form", async () => {
  for (const format of ["$path", "$path|base", "$path|absolute", "$path|relative"]) {
    assert.equal(await render("path", { ...seed, cwd: undefined }, format), "", format);
  }
});

test("a form with another modifier after it renders the form's text under that modifier", async () => {
  const theme = fakeTheme();
  assert.equal(await render("path", seed, "$path|relative|bold"), theme.style("~/Projects/pi-jefferson", { bold: true }));
  assert.equal(await render("path", seed, "$path|absolute|upper"), "/USERS/JOELLEIBOW/PROJECTS/PI-JEFFERSON");
});

test("branch reads only the branch, and renders the text the host reported", async () => {
  assert.equal(await render("branch", unreadable({ branch: "main" })), "main");
  assert.equal(await render("branch", { ...seed, branch: "detached" }), "detached", "a detached HEAD is the text the host reports");
  assert.equal(await render("branch", unknown), "", "no branch renders nothing");
});

test("session reads only the name, and renders nothing for an unnamed session", async () => {
  assert.equal(await render("session", unreadable({ sessionName: "refactor footer" })), "refactor footer");
  assert.equal(await render("session", { ...seed, sessionName: undefined }), "");
  assert.equal(await render("session", unknown), "");
});

test("status orders by key, collapses whitespace, drops what is left empty and joins by one space", async () => {
  const statuses = (...entries: Array<[string, string]>) => ({ ...seed, statuses: new Map(entries) });
  assert.equal(await render("status", statuses(["b", "idle"], ["a", "3 tasks"])), "3 tasks idle", "insertion order is not key order");
  assert.equal(await render("status", statuses(["a", "building\n  3 files"])), "building 3 files", "a newline and a run of spaces collapse");
  assert.equal(await render("status", statuses(["a", "  trimmed  "])), "trimmed");
  assert.equal(await render("status", statuses(["a", "one"], ["b", "two"])), "one two");
  assert.equal(await render("status", statuses(["a", "  \n\t "])), "", "a status that collapses to nothing is unknown");
  assert.equal(await render("status", statuses(["a", "  \n\t "], ["b", "kept"])), "kept", "and is dropped from the join");
  assert.equal(await render("status", { ...seed, statuses: undefined }), "", "no statuses is unknown");
  assert.equal(await render("status", { ...seed, statuses: new Map() }), "");
});

test("a status's own terminal sequences are stripped, so the cell's style owns the colour", async () => {
  const statuses = (...entries: Array<[string, string]>) => ({ ...seed, statuses: new Map(entries) });
  const text = await render("status", statuses(["a", "\x1b[32m●\x1b[0m ok"]));
  assert.equal(text, "● ok", "the cell renders the text, and the joined texts keep one space");
  assert.ok(!text.includes("\x1b"), "no escape sequence reaches the cell");
});

test("status reads only the statuses", async () => {
  assert.equal(await render("status", unreadable({ statuses: new Map([["a", "3 tasks"]]) })), "3 tasks");
});

test("token variables use the four totals fields and cost uses the same totals", async () => {
  const readings = { ...seed, totals: { input: 118, output: 59, cacheRead: 23, cacheWrite: 12, cost: 0.123 } };
  assert.equal(await render("tokens", readings, "$input $output $cacheRead $cacheWrite $totalTokens"), "118 59 23 12 212");
  assert.equal(await render("cost", readings), "$0.123");
  assert.equal(await render("tokens", { ...seed, totals: undefined }), "");
  assert.equal(await render("cost", { ...seed, totals: undefined }), "");
  assert.equal(await render("tokens", seed), "0");
  assert.equal(await render("cost", seed), "$0.000");
  assert.equal(await render("cost", { ...seed, totals: { ...readings.totals, cost: 0.0004 } }), "$0.000");
  assert.equal(await render("tokens", { ...seed, totals: { input: 1000, output: 2000, cacheRead: 0, cacheWrite: 0, cost: 0 } }, "$input $output $cacheRead $cacheWrite $totalTokens"), "1.0k 2.0k 0 0 3.0k");
});

test("a footer's bound cost and tokens read one identical totals object from one store scan", async () => {
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { readConfiguration } = await import("../extensions/jefferson/configuration.ts");
  const { configurationSource } = await import("./configuration-source.ts");
  const { createFooter } = await import("../extensions/jefferson/components/row/row-renderer.ts");
  const { createSessionDataStore } = await import("../extensions/jefferson/data/session-data-store.ts");
  const { stripTerminalSequences } = await import("@earendil-works/pi-tui");
  const { fakeTheme } = await import("./fake-theme.ts");
  const dir = mkdtempSync(join(tmpdir(), "jefferson-agreement-"));
  const agentPath = join(dir, "pi-jefferson.json");
  writeFileSync(agentPath, JSON.stringify({ rows: [[{ instrument: "cost" }, { instrument: "tokens" }]] }));
  const { rows, warning } = readConfiguration(configurationSource({
    agentPath, projectPath: join(dir, "missing.json"), projectTrusted: false, theme: fakeTheme(),
  }).source);
  assert.equal(warning, undefined);
  let scans = 0;
  const store = createSessionDataStore({
    seed,
    requestRender: () => {},
    readUsage: () => ({ contextUsage: seed.contextUsage, sessionId: "session-1", leafId: "leaf-1" }),
    readEntries: () => {
      scans++;
      return [{ type: "usage", usage: { input: 118, output: 59, cacheRead: 23, cacheWrite: 12, totalTokens: 2775, cost: { total: 0.123 } } }] as import("@earendil-works/pi-coding-agent").SessionEntry[];
    },
    readBranch: () => [],
    now: () => 0,
    schedule: () => () => {},
  });
  const seen: Array<Readings["totals"]> = [];
  for (const cell of rows[0]?.cells ?? []) {
    const bound = cell.holder.current;
    cell.holder.current = { fills: bound.fills, render(readings, width, theme) {
      seen.push(readings.totals);
      return bound.render(readings, width, theme);
    } };
  }
  const footer = createFooter(rows, () => store.sample(), fakeTheme(), 0);
  const line = footer.render(80)[0] ?? "";
  assert.equal(stripTerminalSequences(line), "Cost: $0.123 Tokens: 212".padEnd(80));
  assert.equal(scans, 1);
  assert.equal(seen.length, 6, "each cell is rendered at its probe, the host's measure and its allocation");
  for (const totals of seen) assert.equal(totals, seen[0]);
  assert.deepEqual(seen[0], { input: 118, output: 59, cacheRead: 23, cacheWrite: 12, cost: 0.123 });
});

test("an instrument that does not fill renders the same text at width 0 and at width 200", async () => {
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const { parseFormat } = await import("../extensions/jefferson/format.ts");
  const theme = fakeTheme();
  const bound = instrumentBindings(fgCheck);

  // The probe's assumption: a width-0 render is the instrument's text, because nothing but `$bar`
  // reads the width, and a bar declares that it fills.
  const measured: string[] = [];
  for (const [name] of shapes) {
    const instrument = bound(named(name));
    const atZero = instrument.render(seed, 0, theme);
    if (instrument.fills(seed)) {
      assert.equal(name, "blank", "blank is the only shipped default that fills");
      assert.equal(atZero, DEFAULT_CELL_TEXT, "a fill cell's text is its own, whatever the width");
      continue;
    }
    assert.equal(atZero, instrument.render(seed, 200, theme), `${name} does not fill, so the width cannot change its text`);
    measured.push(name);
  }
  assert.deepEqual(
    measured,
    ["model", "thinking", "path", "context", "tokens", "cost", "branch", "session", "status", "notice"],
    "ten of the eleven are measured",
  );

  // The guard discriminates: the one instrument that reads the width is marked, and its text moves.
  const configured = instrumentBindings(fgCheck, new Map([
    [named("context").name, { segments: parseFormat(named("context"), "$percent $bar", fgCheck), style: {} }],
  ]));
  const bar = configured(named("context"));
  assert.equal(bar.fills(seed), true, "a format holding $bar fills");
  assert.notEqual(bar.render(seed, 0, theme), bar.render(seed, 200, theme), "and it is the one whose text the width changes");
});

test("the notice's default text is its kind's, in the warning colour, and nothing shows without a notice", async () => {
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const { stripTerminalSequences } = await import("@earendil-works/pi-tui");
  const theme = fakeTheme();
  const bound = instrumentBindings(fgCheck)(named("notice"));
  // The instant is in the future of the seed's sample, so every case shows.
  const shownUntil = 1;
  const cases: Array<[Timed<Notice>, string]> = [
    [{ kind: "miss", values: { tokens: "125k", cost: " (~$0.38)" }, shownUntil }, "Cache miss: 125k tokens re-billed (~$0.38)"],
    [{ kind: "miss", values: { tokens: "125k", cost: "" }, shownUntil }, "Cache miss: 125k tokens re-billed"],
    [{ kind: "missModelSwitch", values: { tokens: "125k", cost: "" }, shownUntil }, "Cache miss after model switch: 125k tokens re-billed"],
    [{ kind: "missIdle", values: { tokens: "125k", cost: "", idle: "6" }, shownUntil }, "Cache miss after 6m idle: 125k tokens re-billed"],
    [{ kind: "compaction", values: { tokens: "125k", cost: " (~$0.38)" }, shownUntil }, "Compaction: 125k tokens billed (~$0.38)"],
    [{ kind: "branchSummary", values: { tokens: "125k", cost: "" }, shownUntil }, "Branch summary: 125k tokens billed"],
    [{ kind: "thinking", values: { blocks: "2" }, shownUntil }, "Anthropic dropped 2 thinking blocks (details in session)"],
    [{ kind: "thinkingOne", values: { blocks: "1" }, shownUntil }, "Anthropic dropped 1 thinking block (details in session)"],
  ];
  for (const [notice, text] of cases) {
    const shown: Readings = { ...seed, notice };
    assert.equal(stripTerminalSequences(bound.render(shown, 80, theme)), `Notice: ${text}`);
    assert.equal(bound.render(shown, 80, theme), "Notice: " + theme.style(text, { fg: "warning" }),
      "the composed text takes the warning colour; the label does not");
    assert.equal(bound.render(shown, 0, theme), bound.render(shown, 200, theme), "the width cannot change the text");
  }
  assert.equal(bound.render(seed, 80, theme), "", "no notice, no label and no gap");
  assert.equal(bound.fills(seed), false);
});

test("a notice's format colour beats warning while its text and columns are unchanged", async () => {
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const { parseFormat } = await import("../extensions/jefferson/format.ts");
  const { stripTerminalSequences, visibleWidth } = await import("@earendil-works/pi-tui");
  const theme = fakeTheme();
  const declaration = named("notice");
  const shown: Readings = { ...seed, notice: { kind: "miss", values: { tokens: "20k", cost: " (~$0.10)" }, shownUntil: 1 } };
  const draw = (format: string): string => instrumentBindings(fgCheck, new Map([
    [declaration.name, { segments: parseFormat(declaration, format, fgCheck), style: {} }],
  ]))(declaration).render(shown, 80, theme);
  const plain = draw("$notice");
  assert.equal(plain, "Notice: " + theme.style("Cache miss: 20k tokens re-billed (~$0.10)", { fg: "warning" }));
  assert.equal(draw("$notice|accent"), "Notice: " + theme.style("Cache miss: 20k tokens re-billed (~$0.10)", { fg: "accent" }));
  assert.equal(stripTerminalSequences(draw("$notice|accent")), stripTerminalSequences(plain), "the text is the same");
  assert.equal(visibleWidth(draw("$notice|accent")), visibleWidth(plain), "so are the columns");
});

test("the thinking level's own colour holds until the format names one", async () => {
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const { parseFormat } = await import("../extensions/jefferson/format.ts");
  const theme = fakeTheme();
  const declaration = named("thinking");
  const draw = (format: string): string => instrumentBindings(fgCheck, new Map([
    [declaration.name, { segments: parseFormat(declaration, format, fgCheck), style: {} }],
  ]))(declaration).render(seed, 80, theme);
  assert.equal(draw("$level"), "Thinking: " + theme.style("high", { fg: "thinkingHigh" }), "the level keeps the input box's colour");
  assert.equal(draw("$level|accent"), "Thinking: " + theme.style("high", { fg: "accent" }), "the format's colour is the strongest");
});

test("a label keeps the style while the value takes the format's colour", async () => {
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const { parseFormat } = await import("../extensions/jefferson/format.ts");
  const theme = fakeTheme();
  const declaration = named("model");
  const bound = instrumentBindings(fgCheck, new Map([[declaration.name, {
    segments: parseFormat(declaration, "$model|warning", fgCheck), style: { fg: "accent" }, label: "Model:",
  }]]))(declaration);
  assert.equal(bound.render(seed, 80, theme),
    theme.style("Model: ", { fg: "accent" }) + theme.style("claude-opus-4", { fg: "warning" }));
});

test("a timed declaration shows its text until its instant and nothing after it, label included", async () => {
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const theme = fakeTheme();
  const declaration: InstrumentDeclaration = {
    name: "timed",
    variables: { model: readings => readings.model },
    defaultFormat: "$model",
    defaultLabel: "Timed:",
    shownUntil: readings => readings.notice?.shownUntil,
    options: Object.freeze(["format", "label"]),
  };
  const bound = instrumentBindings(fgCheck)(declaration);
  const held: Readings = { ...seed, notice: { kind: "miss", values: {}, shownUntil: 1 } };
  assert.equal(bound.render(held, 80, theme), "Timed: claude-opus-4", "before the instant");
  assert.equal(bound.render({ ...held, sampledAt: 1 }, 80, theme), "", "at the instant: no text, no label, no gap");
  assert.equal(bound.render({ ...held, sampledAt: 2 }, 80, theme), "", "after it");
  // The instant is the reading's, not the text's: a later one shows the same text again.
  assert.equal(bound.render({ ...held, sampledAt: 1, notice: { kind: "miss", values: {}, shownUntil: 2 } }, 80, theme),
    "Timed: claude-opus-4");
  assert.equal(bound.render({ ...seed }, 80, theme), "", "an unknown instant hides the text");
});

test("the notice instrument shows its text until its instant and nothing after it", async () => {
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const { stripTerminalSequences } = await import("@earendil-works/pi-tui");
  const theme = fakeTheme();
  const bound = instrumentBindings(fgCheck)(named("notice"));
  const held: Readings = { ...seed, notice: { kind: "miss", values: { tokens: "125k", cost: "" }, shownUntil: 1 } };
  assert.equal(stripTerminalSequences(bound.render(held, 80, theme)), "Notice: Cache miss: 125k tokens re-billed",
    "before the instant");
  assert.equal(bound.render({ ...held, sampledAt: 1 }, 80, theme), "", "at the instant: no label and no gap");
  assert.equal(bound.render({ ...held, sampledAt: 2 }, 80, theme), "", "after it");
});

test("an empty kind text silences that kind", async () => {
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const { parseFormat } = await import("../extensions/jefferson/format.ts");
  const { stripTerminalSequences } = await import("@earendil-works/pi-tui");
  const theme = fakeTheme();
  const boundWith = (formats: Record<string, string>, cell = "$notice") => instrumentBindings(fgCheck, new Map([
    [named("notice").name, { segments: parseFormat(named("notice"), cell, fgCheck), style: {},
      formats: Object.fromEntries(Object.entries(formats)
        .map(([kind, format]) => [kind, parseFormat(named("notice"), format, fgCheck, true)])) }],
  ]))(named("notice"));
  const held: Readings = { ...seed, notice: { kind: "miss", values: { tokens: "125k", cost: " (~$0.38)" }, shownUntil: 1 } };
  assert.equal(boundWith({ miss: "" }).render(held, 80, theme), "", "an empty kind text renders nothing, label included");
  assert.equal(boundWith({ miss: "   " }).render(held, 80, theme), "", "whitespace alone trims to the same");
  assert.equal(boundWith({ miss: "$idle" }).render(held, 80, theme), "",
    "and a text that resolves empty because its only value is one this kind does not carry");
  assert.equal(stripTerminalSequences(boundWith({ miss: "" }, "!").render(held, 80, theme)), "Notice: !",
    "the format does not name $notice, so an empty kind text leaves the label and its literal alone");
  assert.equal(stripTerminalSequences(boundWith({ miss: "Spent $tokens" }).render(held, 80, theme)),
    "Notice: Spent 125k", "a kind with text still renders");
});

test("a configured kind's format renders the user's words around the declared values", async () => {
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const { parseFormat } = await import("../extensions/jefferson/format.ts");
  const bound = instrumentBindings(fgCheck, new Map([
    [named("notice").name, { segments: parseFormat(named("notice"), "$notice", fgCheck), style: {},
      formats: { miss: parseFormat(named("notice"), "Spent $tokens, paid$cost", fgCheck, true) } }],
  ]))(named("notice"));
  const shown: Readings = { ...seed, notice: { kind: "miss", values: { tokens: "125k", cost: " (~$0.38)" }, shownUntil: 1 } };
  assert.equal((await import("@earendil-works/pi-tui")).stripTerminalSequences(bound.render(shown, 80, fakeTheme())),
    "Notice: Spent 125k, paid (~$0.38)");
});

test("every shipped declaration that can draw a bar declares the two options, and none else does", () => {
  // The invariant is derived from each declaration's own `bar`, so the next bar-capable instrument
  // joins by declaration and no hand-kept list exists (statusline, "A shipped instrument with a bar").
  for (const declaration of SHIPPED) {
    const bar = declaration.bar !== undefined;
    assert.equal(declaration.options.includes("thresholds"), bar, `${declaration.name} and thresholds`);
    assert.equal(declaration.options.includes("fill"), bar, `${declaration.name} and fill`);
  }
});

/** The reading a percentage makes, in the form every instrument test samples. */
function pressured(percent: number): Readings {
  return { ...seed, contextUsage: { tokens: 86400, percent, contextWindow: 200000 } };
}

test("A48 a threshold's format decides whether the instrument fills, at any width", async () => {
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const { parseFormat } = await import("../extensions/jefferson/format.ts");
  const theme = fakeTheme();
  const declaration = named("context");
  const segments = (format: string) => parseFormat(declaration, format, fgCheck);

  const adding = instrumentBindings(fgCheck, new Map([[declaration.name, {
    segments: segments("$percent"), style: {},
    thresholds: [{ activeAt: 70, settings: { segments: segments("$percent $bar") } }],
  }]]))(declaration);
  assert.equal(adding.fills(pressured(69.9)), false, "below 70 the instrument takes its text's width");
  assert.equal(adding.fills(pressured(70)), true, "at 70 the state's format adds the bar");

  // The state comes from the reading and never from the width: the same state is in force at both.
  const below = pressured(69.9);
  assert.equal(adding.render(below, 0, theme), adding.render(below, 200, theme), "no bar below 70");
  const at = pressured(70);
  assert.equal(stripTerminalSequences(adding.render(at, 0, theme)), "Context: 70.0% ",
    "at width 0 the same state renders its text, the format's own space, and no bar column");
  assert.equal(stripTerminalSequences(adding.render(at, 200, theme)).startsWith("Context: 70.0%"), true);

  const hiding = instrumentBindings(fgCheck, new Map([[declaration.name, {
    segments: segments("$percent $bar"), style: {},
    thresholds: [{ activeAt: 90, settings: { segments: segments("$percent") } }],
  }]]))(declaration);
  assert.equal(hiding.fills(pressured(89)), true, "below 90 the top level's bar fills");
  assert.equal(hiding.fills(pressured(90)), false, "at 90 the state's format drops the bar");
  const ninety = pressured(90);
  assert.equal(hiding.render(ninety, 0, theme), hiding.render(ninety, 200, theme), "the width cannot change it");
});

test("A49 a declared fill outlasts a state whose format drops the bar", async () => {
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const { parseFormat } = await import("../extensions/jefferson/format.ts");
  const stripTerminal = (await import("@earendil-works/pi-tui")).stripTerminalSequences;
  const filler: InstrumentDeclaration = {
    name: "filler",
    variables: { percent: () => "95.0%" },
    bar: () => 95,
    fills: true,
    defaultFormat: "$percent $bar",
    options: Object.freeze(["format", "style", "label"]),
  };
  const bound = instrumentBindings(fgCheck, new Map([[filler.name, {
    segments: parseFormat(filler, "$percent $bar", fgCheck), style: {},
    thresholds: [{ activeAt: 90, settings: { segments: parseFormat(filler, "$percent", fgCheck) } }],
  }]]))(filler);
  assert.equal(bound.fills(seed), true, "a declaration that fills fills at every reading");
  assert.equal(stripTerminal(bound.render(seed, 80, fakeTheme())), "95.0%", "and the state's format still decides the text");
});

test("A55 the bar is never read when no state can change what the format renders", async () => {
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const { parseFormat } = await import("../extensions/jefferson/format.ts");
  const theme = fakeTheme();
  let reads = 0;
  const counted: InstrumentDeclaration = {
    ...named("context"),
    name: "counted.context",
    bar: () => { reads++; return 75; },
  };
  const segments = (format: string) => parseFormat(counted, format, fgCheck);
  const entry = (settings: object) => new Map([[counted.name, {
    segments: segments("$percent"), style: {}, thresholds: [{ activeAt: 50, settings }],
  }]]);

  const fillOnly = instrumentBindings(fgCheck, entry({ fill: { fg: "accent" } }))(counted);
  const sample = pressured(75);
  fillOnly.fills(sample);
  fillOnly.render(sample, 80, theme);
  assert.equal(reads, 0, "a list that changes only the fill needs no reading");

  reads = 0;
  const labelled = instrumentBindings(fgCheck, entry({ label: "hot" }))(counted);
  const hot = pressured(75);
  labelled.fills(hot);
  assert.equal(stripTerminalSequences(labelled.render(hot, 80, theme)), "hot 75.0%");
  assert.equal(reads, 1, "the state changes the label, so one reading serves the sample");
});

test("A56 a bound state carries its own label, format, composed choice and kind formats", async () => {
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const { parseFormat } = await import("../extensions/jefferson/format.ts");
  const theme = fakeTheme();
  const declaration = named("context");
  const segments = (format: string) => parseFormat(declaration, format, fgCheck);
  type Honoured = NonNullable<Parameters<typeof instrumentBindings>[1]> extends ReadonlyMap<string, infer E>
    ? E extends { thresholds?: infer T } ? T : never : never;
  const bound = (thresholds: NonNullable<Honoured>, format = "$percent") => instrumentBindings(fgCheck,
    new Map([[declaration.name, { segments: segments(format), style: {}, thresholds }]]))(declaration);

  // (a) A state that gives an empty label renders its text alone.
  const blanked = bound([{ activeAt: 70, settings: { label: "" } }]);
  assert.equal(stripTerminalSequences(blanked.render(pressured(75), 80, theme)), "75.0%");
  assert.equal(stripTerminalSequences(blanked.render(pressured(50), 80, theme)), "Context: 50.0%");

  // (b) A state whose format adds the bar after a label gives the label one gap and fills the row.
  const adding = bound([{ activeAt: 70, settings: { segments: segments("$bar") } }]);
  const sample = pressured(75);
  assert.equal(stripTerminalSequences(adding.render(sample, 20, theme)),
    "Context: " + "█".repeat(8) + "░".repeat(3));
  assert.equal(adding.fills(sample), true);

  // (c) A state whose format drops the composed variable never runs the set's `select`.
  let selects = 0;
  const composed: InstrumentDeclaration = {
    name: "composed.fixture",
    variables: { state: () => undefined, other: () => "other" },
    bar: readings => readings.contextUsage?.percent,
    composed: { variable: "state", variables: {}, select: () => { selects++; return "busy"; }, formats: { busy: "Busy" } },
    defaultFormat: "$state",
    options: FreeOptions,
  };
  const composedBound = instrumentBindings(fgCheck, new Map([[composed.name, {
    segments: parseFormat(composed, "$state", fgCheck), style: {},
    thresholds: [{ activeAt: 70, settings: { segments: parseFormat(composed, "$other", fgCheck) } }],
  }]]))(composed);
  assert.equal(composedBound.render(pressured(75), 80, theme), "other",
    "the threshold's format names no composed variable");
  assert.equal(selects, 0, "so the set's select never runs");
  assert.equal(stripTerminalSequences(composedBound.render(pressured(50), 80, theme)), "Busy");
  assert.equal(selects, 1);

  // (d) A kind a threshold leaves out is the top level's, and one it sets is its own.
  let chosen = "busy";
  const stateful: InstrumentDeclaration = {
    name: "stateful.fixture",
    variables: { state: () => undefined },
    bar: readings => readings.contextUsage?.percent,
    composed: {
      variable: "state", variables: {}, select: () => chosen,
      formats: { busy: "A", idle: "B" },
    },
    defaultFormat: "$state",
    defaultLabel: "State:",
    options: FreeOptions,
  };
  const statefulBound = instrumentBindings(fgCheck, new Map([[stateful.name, {
    segments: parseFormat(stateful, "$state", fgCheck), style: {}, label: "",
    thresholds: [{ activeAt: 70, settings: { formats: { busy: parseFormat(stateful, "C", fgCheck, true) } } }],
  }]]))(stateful);
  const busy = pressured(75);
  assert.equal(statefulBound.render(busy, 80, theme), "C", "the threshold's kind text, not the top level's");
  chosen = "idle";
  assert.equal(statefulBound.render(pressured(75), 80, theme), "B", "a kind the threshold leaves out stays the top level's");
});

/** An empty frozen option list, for a stand-in declaration that takes no configuration. */
const FreeOptions: readonly string[] = Object.freeze([]);

test("A50 one reading a sample: every render of one sample draws the reading it first took", async () => {
  const { instrumentBindings } = await import("../extensions/jefferson/components/instruments/instrument-binding.ts");
  const { parseFormat } = await import("../extensions/jefferson/format.ts");
  const theme = fakeTheme();
  let reads = 0;
  const counted: InstrumentDeclaration = {
    ...named("context"),
    name: "sample.context",
    // The first sample's read is 40, and every later one is 90: a second read would move the bar.
    bar: () => (++reads === 1 ? 40 : 90),
  };
  const bound = instrumentBindings(fgCheck, new Map([[counted.name, {
    segments: parseFormat(counted, "$bar", fgCheck), style: {}, label: "",
  }]]))(counted);
  const sample = pressured(50);
  const first = stripTerminalSequences(bound.render(sample, 10, theme));
  assert.equal(first, "█".repeat(4) + "░".repeat(6));
  assert.equal(stripTerminalSequences(bound.render(sample, 10, theme)), first,
    "the same sample draws the reading it first took");
  bound.fills(sample);
  assert.equal(reads, 1, "one sample, one reading");

  const next = pressured(50);
  assert.equal(stripTerminalSequences(bound.render(next, 10, theme)), "█".repeat(9) + "░".repeat(1),
    "a new sample reads again");
  assert.equal(reads, 2);
});
