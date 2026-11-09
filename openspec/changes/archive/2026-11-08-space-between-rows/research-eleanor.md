# Research Report

## Question and Scope

Investigated the existing pi-jefferson repository for the `space-between-rows` change. Scope: footer composition/layout, config row validation, existing geometry constraints and historical decisions, possible row-spacing workarounds, tests and README. Evidence is repository-local; no pi/pi-tui documentation was researched. The live `~/.pi/agent/pi-jefferson.json` was not accessed or changed.

## Sources / Files Examined

- `AGENTS.md`, `ARCHITECTURE.md`, `package.json`
- `openspec/changes/space-between-rows/owner-rulings.md` (binding current rulings)
- `extensions/jefferson/visuals/row-renderer.ts`, `extensions/jefferson/visuals/row.ts`, `extensions/jefferson/configuration.ts`, `extensions/jefferson/footer-setup.ts`
- `tests/row-renderer.test.ts`
- `openspec/specs/statusline/spec.md`
- `README.md`
- `openspec instructions research --change space-between-rows --json`
- `pnpm typecheck`; `pnpm test`

## Findings

### 1. Feature path: configuration to footer output

`extensions/jefferson/configuration.ts` resolves and reads the agent or trusted-project JSON in `configurationPaths()` / `readConfiguration()` (lines 258–307). `normalizeDocument()` (218–255) accepts a top-level row or `rows` list, then `normalizeRow()` (178–214) obtains `distribution` and `cells`. The normalized row shape is `id`, `distribution`, `cells` in `visuals/row.ts` (lines 17–21). `footer-setup.ts` `installFooter()` passes rows to `createFooter()` inside `ui.setFooter()` (lines 13–25).

In `visuals/row-renderer.ts`, `createFooter()` builds a `CellView` for each cell, then each row's `HStack` at line 78 with `{ gap: GAP }`, where `GAP` is `0` (line 15). `VStack` holds the row stacks at line 114 with `{ gap: 0 }`. Each render calls `planRow` through `view.plan(width)` and seats a changed plan. `seat()` calls `stack.clear()` then re-adds the same cell components with planned `basis`, `grow`, `shrink: 1`, `minSize: 0` (lines 104–110); render reaches `tree.render(width)` at line 125. The tree is built once. Geometry planning lives in `visuals/width-plan.ts` (`planRow`; not examined in full for this report).

Configuration validation is in `configuration.ts`: `normalizeRow()` validates `distribution` against `DISTRIBUTIONS` at lines 184–191 and normalizes omitted cells to ten blanks at 201–203. `cellsFromNames()` validates nonempty arrays and cell objects at lines 135–171, with only `instrument` and `align` accepted. Configuration failures return default row and a warning in `readConfiguration()` lines 296–310.

### 2. Configuration surface

Top-level forms are either a row object or `{ "rows": [...] }`; the two cannot coexist with top-level `cells`, `id`, or `distribution`. `instruments` may sit beside either envelope (and alone). Row keys actively interpreted are `distribution`, `cells`, `id`; `containers` is accepted as a legacy key but produces a notice. Other row keys are not generally enumerated/rejected. Cell keys are exactly `instrument`, `align`. Unknown cell key error: `row ${index} has a cell with an unrecognised key ${JSON.stringify(unknownKey)}; a cell carries only instrument and align` (`configuration.ts:147`). A non-object entry error spells `declare {"instrument": "model"}`. Empty cells error: `row ${index} has an empty cells list`.

Distribution values come from `DISTRIBUTIONS = ["content", "equal"]` in `visuals/row.ts:9`; omitted value defaults to `DISTRIBUTIONS[0]` (`content`) in `normalizeRow()` (`configuration.ts:185`). Invalid value error: `row ${index} has a distribution that is not "content" or "equal": ${JSON.stringify(value)}`. Top-level distribution alongside `rows` is rejected with `the configuration carries both a top-level row and a rows list`.

Defaults: `DEFAULT_CELLS = 10` and `MAX_CELLS = 10` (`configuration.ts:62–63`); `defaultRow()` makes ten `blank` cells (`120–124`); absent row `cells` also makes ten blank cells (`203`). `align` defaults to left (`configuration.ts:159–160`). The row option `distribution` is the most recent precedent: README documents content default/equal opt-in and upgrade behavior (`README.md:59–81`); the living spec describes both values and validation (`openspec/specs/statusline/spec.md`, “Cells are evenly distributed across the width”). The currently read repository artifacts do not provide a dated change-log note establishing precisely when it was added in version 0.8.0; package manifest here reports version `0.1.1` and history/version context is supplied by the task brief.

### 3. Existing geometric constraints and decisions

- `openspec/specs/statusline/spec.md`, “The statusline renders the declared rows”: footer is one line per row, in declaration order; two rows yield two lines.
- Same spec, “A row is one line tall”: a row is exactly one line; footer height equals declared row count; instrument output cannot add a line.
- Same spec, “The footer's tree is built once and reads the current render's sample”: `VStack` holds one `HStack` per row, each holding cells; it specifies re-layout and re-seating on width/content changes.
- `ARCHITECTURE.md` first paragraph: “pi-jefferson draws one footer line per configured row.” Row renderer section: builds one `VStack` of `HStack` rows; allocator spends remainder (`gap: 0`); row with equal distribution uses floor(W/N); tree is re-seated on width/plan changes. Fidelity section: “Rows span the full width.”
- `docs/adr/0002-rows-span-the-full-width.md` and `docs/adr/0007-a-cell-takes-the-width-its-content-needs.md` are directly referenced as geometry decisions by `ARCHITECTURE.md`; ADR files were located but their contents were not read for this run. Exact ADR quotations/line references therefore remain unverified.
- Historical deferral per requested archived artifacts has not been directly read in this report; see gaps below. Owner-rulings for this active change says this is specifically vertical spacing between footer rows, and repeats the row/cell vocabulary rule.

### 4. Workaround today

A small Node probe was attempted to exercise configuration/rendering with a scratch config, but the command had a JavaScript syntax error before any config was created or rendered. No user config was touched. Thus the requested run evidence for blank cells, empty format, and zero cells is not established here. Static source shows a zero-cell row is explicitly rejected (`configuration.ts:135–138`) and a blank cell is a configured instrument, not a separate line; tests include empty-cell geometry but do not establish a vertical-gap workaround. This item remains unknown pending a successful runtime probe.

### 5. Tests and baseline

Relevant files include `tests/configuration.test.ts` (configuration/validation), `tests/row-renderer.test.ts` (row output, height/line count, resize and re-seat), `tests/width-plan.test.ts` (geometry), `tests/jefferson.test.ts` (end-to-end footer/install), and `tests/format.test.ts` / `tests/instrument.test.ts` (rendered cell content). `row-renderer.test.ts` uses `createFooter()` with `fakeTheme()`, fake `Row`/`Instrument` objects, and helpers `composed()` (host per-child frame), `visible()` and `lineAt()`.

Baseline: `pnpm typecheck` passed (`tsc --noEmit`). `pnpm test` passed: 296 tests, 296 pass, 0 fail, 0 skipped/cancelled/todo. The test suite covers one-line rows, three-row footer height, resize re-seating, invalidation, and no wrapping.

### 6. Docs

`README.md:14–19` describes footer rows and defaults. `README.md:29 onward` begins configuration, with row/cell JSON around lines 37–57. Row `distribution` and content/equal semantics are at lines 59–81. `$bar` fill behavior is at lines 148–150. README’s “Why another statusline” mentions rows and per-gap spacing at lines 172–180 (distinctly concerning cell layout wording).

## Assumptions, Differences, and Unknowns

- The requested output path `openspec/changes/space-between-rows/research-eleanor.md` was followed.
- The scratch Node command failed syntactically, so no observed line-by-line workaround output is reported. No scratch config remained.
- Required source evidence remains incomplete for exact ADR quotes, the archived `configurable-instruments` and `cells-as-objects` owner-rulings/council passages, the living specs beyond `statusline`, the latest version’s source history, and exact line-number quotations for all living requirements. Files were located but not read for these items.
- `openspec instructions research ... --json` returned a template requiring the sections used here. Its generic resolved output is `research-*.md`; the invoker’s explicitly authoritative exact filename was used instead.
- The `openspec validate` command was not run. No source/config files were changed; only this report was written.

## Addendum 1 — the row above the footer

### pi-provided status/content above the footer

Jefferson does not read or render pi extension statuses via `setStatus` or other pi-provided content above its footer. A search of `extensions/` for `setStatus` and `status(` found no matches. `extensions/jefferson/footer-setup.ts:13–25` installs only the footer factory via `ui.setFooter`; `extensions/jefferson/visuals/row-renderer.ts:114–125` builds and renders the footer's own VStack. The extension entry and startup are `extensions/jefferson.ts` and `extensions/jefferson/startup.ts`; no status API usage was found in the extension source.

### Scratch-config footer output

Used a temporary config file in a fresh `/tmp` directory, with the same rows and instrument settings as Joel's `~/.pi/agent/pi-jefferson.json`; the live file was read only and never changed. Parsed it through `readConfiguration()` and rendered through `createFooter()` at width 132 with `fakeTheme()` and representative known readings (working directory `/Users/joelleibow/Projects/pi-jefferson`, model `anthropic` / `claude-opus-4`, thinking `high`, no context usage). The component returned exactly two array entries, each a single line. `JSON.stringify(render(132))` returned:

```json
["\u001b[0m\u001b]8;;\u0007📂 pi-jefferson                                                                               \u001b[0m\u001b]8;;\u0007🧠 claude-opus-4 \u001b[2mvia\u001b[22m Anthropic\u001b[0m\u001b]8;;\u0007 🤔 \u001b[94mHigh\u001b[0m\u001b]8;;\u0007","\u001b[0m\u001b]8;;\u0007                                            \u001b[0m\u001b]8;;\u0007                                            \u001b[0m\u001b]8;;\u0007                                            \u001b[0m\u001b]8;;\u0007"]
```

There is no leading or trailing blank line: the first entry starts with the host's ANSI style/hyperlink reset framing, followed immediately by the configured path cell; the second is the configured row of three empty-format cells. `VStack` has `gap: 0` (`row-renderer.ts:114`), so there is no blank line between the two returned entries either. This run used representative readings rather than sampling Joel's live session; rendered data values and style escape sequences can differ with the session/theme.

## Addendum 2 — closing the open items

### 1. Workaround probe at width 80

Ran a saved probe file with Node's TypeScript stripping: `/tmp/sbr-probe/probe.ts`, command `node /tmp/sbr-probe/probe.ts`. It wrote and removed a scratch JSON config in a fresh `/tmp` directory, called `readConfiguration()` and `createFooter()`, and used `fakeTheme()` with known readings (anthropic / claude-opus-4 / high, Jefferson cwd, no context usage). Three-row cases used a model row, the requested middle row, and a thinking row.

Probe source:

```ts
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readConfiguration } from "/Users/joelleibow/Projects/pi-jefferson/extensions/jefferson/configuration.ts";
import { createFooter } from "/Users/joelleibow/Projects/pi-jefferson/extensions/jefferson/visuals/row-renderer.ts";
import { fakeTheme } from "/Users/joelleibow/Projects/pi-jefferson/tests/fake-theme.ts";

const dir = mkdtempSync(join(tmpdir(), "jefferson-gap-probe-"));
const theme = fakeTheme();
const readings = { provider: "anthropic", model: "claude-opus-4", thinkingLevel: "high", cwd: "/Users/joelleibow/Projects/pi-jefferson", contextUsage: undefined, totals: undefined };
function config(document: unknown) {
  const path = join(dir, "pi-jefferson.json");
  writeFileSync(path, JSON.stringify(document));
  return readConfiguration({ agentPath: path, projectPath: join(dir, "absent.json"), projectTrusted: false, theme });
}
function render(document: unknown) {
  const parsed = config(document);
  return { rows: parsed.rows.length, warning: parsed.warning, lines: createFooter(parsed.rows, () => readings, theme).render(80).map(line => JSON.stringify(line)) };
}
const prefix = { cells: [{ instrument: "model" }] };
const suffix = { cells: [{ instrument: "thinking" }] };
console.log("blank middle", JSON.stringify(render({ rows: [prefix, { cells: [{ instrument: "blank" }] }, suffix] })));
console.log("empty-format middle", JSON.stringify(render({ rows: [prefix, { cells: [{ instrument: "blank" }] }, suffix], instruments: { blank: { format: "" } } })));
console.log("zero-cell middle", JSON.stringify(render({ rows: [prefix, { cells: [] }, suffix] })));
console.log("row gap", JSON.stringify(config({ cells: [{ instrument: "blank" }], gap: 1 })));
console.log("top-level gap beside rows", JSON.stringify(config({ rows: [prefix], gap: 1 })));
rmSync(dir, { recursive: true, force: true });
```

Exact `JSON.stringify` output (line strings are themselves JSON-stringified inside each result):

```text
blank middle {"rows":3,"lines":["\"\\u001b[0m\\u001b]8;;\\u0007anthropic: claude-opus-4                                                        \\u001b[0m\\u001b]8;;\\u0007\"","\"\\u001b[0m\\u001b]8;;\\u0007Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor  \\u001b[0m\\u001b]8;;\\u0007\"","\"\\u001b[0m\\u001b]8;;\\u0007Thinking: \\u001b[94mHigh\\u001b[39m\\u001b[0m                                                                  \\u001b[0m\\u001b]8;;\\u0007\""]}
empty-format middle {"rows":3,"lines":["\"\\u001b[0m\\u001b]8;;\\u0007anthropic: claude-opus-4                                                        \\u001b[0m\\u001b]8;;\\u0007\"","\"\\u001b[0m\\u001b]8;;\\u0007                                                                                \\u001b[0m\\u001b]8;;\\u0007\"","\"\\u001b[0m\\u001b]8;;\\u0007Thinking: \\u001b[94mHigh\\u001b[39m\\u001b[0m                                                                  \\u001b[0m\\u001b]8;;\\u0007\""]}
zero-cell middle {"rows":1,"warning":"pi-jefferson: /var/folders/bg/vzcr9n991d90wx8q5g5n8jhc0000gn/T/jefferson-gap-probe-bvX4eW/pi-jefferson.json was rejected (row 1 has an empty cells list); rendering the default row","lines":["\"\\u001b[0m\\u001b]8;;\\u0007Lorem\\u001b[0m...\\u001b[0m\\u001b]8;;\\u0007Lorem\\u001b[0m...\\u001b[0m\\u001b]8;;\\u0007Lorem\\u001b[0m...\\u001b[0m\\u001b]8;;\\u0007Lorem\\u001b[0m...\\u001b[0m\\u001b]8;;\\u0007Lorem\\u001b[0m...\\u001b[0m\\u001b]8;;\\u0007Lorem\\u001b[0m...\\u001b[0m\\u001b]8;;\\u0007Lorem\\u001b[0m...\\u001b[0m\\u001b]8;;\\u0007Lorem\\u001b[0m...\\u001b[0m\\u001b]8;;\\u0007Lorem\\u001b[0m...\\u001b[0m\\u001b]8;;\\u0007Lorem\\u001b[0m...\\u001b[0m\\u001b]8;;\\u0007\"]}
row gap {"rows":[{"id":"row-0","distribution":"content","cells":[{"instrument":{"fills":true},"align":"left"}]}]}
top-level gap beside rows {"rows":[{"id":"row-0","distribution":"content","cells":[{"instrument":{"fills":false},"align":"left"}]}]}
```

The logged `warning` property is `undefined` for the two valid middle-row configs (and thus omitted by JSON serialization); both return three lines. A single `blank` cell renders its default placeholder text filling a whole line, so it is visible content, not a blank spacer. With `blank` configured to `format: ""`, its line is 80 spaces (between host frame sequences), thus it does act as a blank line in this sample. An empty `cells` array rejects the entire document and falls back to the default row: warning exactly as shown, one returned line (ten default cells). No added line is returned for zero cells.

### 2. Unknown `gap` row keys

Ran both cases using the same scratch `readConfiguration()` probe. `JSON.stringify` results:

```json
{"rows":[{"id":"row-0","distribution":"content","cells":[{"instrument":{"fills":true},"align":"left"}]}]}
{"rows":[{"id":"row-0","distribution":"content","cells":[{"instrument":{"fills":false},"align":"left"}]}]}
```

In each object `warning` is `undefined` (the JSON serializer omits it). No warning/notice is raised for `gap`. For row `{cells:[{instrument:"blank"}], gap:1}`, the row-level `gap` is simply never read. For `{rows:[{cells:[{instrument:"model"}]}], gap:1}`, the top-level key is likewise never read. `normalizeRow()` reads `distribution`, records a legacy `containers` notice, reads `cells`, and optionally `id`, then returns `{ id, distribution, cells }` (`extensions/jefferson/configuration.ts:178–214`); there is no general unknown-row-key loop. Top-level `normalizeDocument()` checks only top-level row-envelope conflicts (`cells`, `id`, `distribution`) with `rows` and specifically records `containers` as a notice (`218–255`). `acceptedWarning()` constructs warnings only for `containers` and unknown instrument names (`258–272`).

### 3. ADR quotations: line count, height and gaps

`docs/adr/0002-rows-span-the-full-width.md`:

- Lines 20–22: “Give each of a row's N cells `basis: floor(W / N)`, `grow: 1` and `shrink: 0`, with no gap. The host's allocator spends the remainder and its `HStack` composes the line; Jefferson does not pad the composed row.” This is row cell/HStack layout; it does not specify a vertical gap between rows.
- Lines 30–32: “Every row spans the full window, and a right-aligned last cell ends at the window's edge.” Remainder allocation follows in the next sentence. No footer-height/line-count rule or vertical row spacing is stated in ADR 0002.

`docs/adr/0007-a-cell-takes-the-width-its-content-needs.md`:

- Lines 15–18: “His 2026-11-07 rulings settled four things. The default is content-sized cells, and a row option restores equal distribution. The mechanism is the cell itself, with no cell holding several instruments. Two content-sized neighbours get one system space between them, and it collapses when the row is narrow. The break to existing rows is accepted before 1.0.” This describes a horizontal space between neighbor cells, not rows.
- Lines 33–34: “Every cell is `shrink: 1` with `minSize: 0`, so a row over its width loses columns to the host's allocator and stays one line. No priority is configurable.”
- Lines 41–44 describe the horizontal “joint” between adjacent non-empty cells and its collapse before text is shortened.
- Lines 67–68: “A stack `gap: 1` for the joint. It would put a column between every pair, empty and filling cells included, and break the equal option's ‘no gap’.” This is horizontal cell separation; neither ADR states a vertical gap between footer rows or a footer-height rule.

### 4. Historical set-aside passages

`openspec/changes/archive/2026-11-05-configurable-instruments/owner-rulings.md:26–28`:

> “## 2026-11-05 — Scope held out of this change”
>
> “Row-level justify, gaps, proportional widths, a fourth alignment, the GitHub description drift, the parked clickable-cell idea, and the git instrument are separate changes if they ever matter.”

`openspec/changes/archive/2026-11-05-configurable-instruments/council.md:7` names as non-goals “row-level justify/gaps/proportional widths/a fourth alignment”. `council.md:22–24` says: “Both advisors approved the shape and the declined scope, independently. `align` supplies the gap the owner wanted, powerline is the only prior art with per-cell alignment, and declining a share pool avoids deciding what a pool totals and how a remainder distributes.” This gap refers to cell alignment/spacing; the scope line explicitly sets row-level gaps aside.

`openspec/changes/archive/2026-11-04-cells-as-objects/owner-rulings.md:21–24`:

> “Ruled: `align` with `left` as the default and `right` available. **`width` and a `spacer` instrument are declined** — a relative share pool means deciding what the pool totals, what happens when shares overshoot, and how the remainder distributes, all to produce a gap that `align` already provides. Proportional layout is an addition to this shape if a real need appears later.”

The same change's `council.md:22–24` records: “Both advisors approved the shape and the declined scope, independently. `align` supplies the gap the owner wanted, powerline is the only prior art with per-cell alignment, and declining a share pool avoids deciding what a pool totals and how a remainder distributes.” The historical “gap” there is a cell's alignment/padding gap; the configurable-instruments owner ruling explicitly sets row-level gaps aside.

## Addendum 3 — where a document-level value enters

### 1. `readConfiguration()` return type

`extensions/jefferson/configuration.ts:53–60` declares `export interface Configuration { rows: Row[]; warning: string | undefined; }`. The named fields are `rows` (`Row[]`) and `warning` (`string | undefined`). `readConfiguration(source: ConfigurationSource): Configuration` is declared at `configuration.ts:286`.

### 2. Result call chain to footer construction

- `readConfiguration(source: ConfigurationSource): Configuration` — `extensions/jefferson/configuration.ts:286`. `source` carries `agentPath`, `projectPath`, `projectTrusted`, and `theme` (`:46–51`); the result has `rows` and `warning`.
- `startUp(pi: ExtensionAPI): void` — `extensions/jefferson/startup.ts:11`. In the `session_start` handler it destructures `{ rows, warning }` from `readConfiguration(...)` at `startup.ts:49–53`; warns if `warning !== undefined` at `:54`; then passes `rows` as the `rows` field to `installFooter()` at `:57–63`. It also passes `sample: () => store.sample()`, `dispose: release`, and `receiveRepaint`.
- `installFooter(ui: ExtensionUIContext, { rows, sample, dispose, receiveRepaint }: { rows: Row[]; sample: () => Readings; dispose: () => void; receiveRepaint: (requestRepaint: () => void) => void }): void` — `extensions/jefferson/footer-setup.ts:12–20`. Its `ui.setFooter` factory invokes `createFooter(rows, sample, theme)` at `:21–23`. `warning` is not passed to the footer; it is only handled by startup.
- `createFooter(rows: Row[], sampleReadings: () => Readings, theme: Theme): Footer` — `extensions/jefferson/visuals/row-renderer.ts:29–33`. The `rows` field from `Configuration` is its first argument; `sample` from `installFooter` is its second; the live theme supplied to the UI factory is its third.

### 3. Validation refusal path

`readConfiguration()` catches `RejectedConfiguration` at `extensions/jefferson/configuration.ts:309–315`. At `:310–314`, that refusal returns exactly `{ rows: [defaultRow(bind)], warning: \`pi-jefferson: ${path} was rejected (${error.message}); rendering the default row\` }`. In words, its fields are `rows` containing one default row and `warning` containing the path/reason message. The acceptance path returns `{ rows, warning: acceptedWarning(path, notices) }` at `:305–308`. Read/parse errors use a separate path at `:295–300`.

### 4. `distribution` precedent and top-level read site

`normalizeRow(raw, index, notices, bind)` is at `extensions/jefferson/configuration.ts:178`. It initializes `distribution` to `DISTRIBUTIONS[0]` (`:185`), checks whether `distribution` is present (`:186`), validates it with `isDistribution(row.distribution)` (`:187`), and on failure throws `RejectedConfiguration` with the message assembled inline at `:188`: `row ${index} has a distribution that is not ${orList(DISTRIBUTIONS)}: ${JSON.stringify(row.distribution)}`. `isDistribution()` is at `:35–37`; `orList()` constructs the quoted alternatives at `:40–44`. A valid supplied value is assigned at `:190`, and the returned row includes `distribution` at `:214`.

In `normalizeDocument(document, notices, theme)` (`:218`), the top-level envelope is narrowed as `doc` at `:222`; the `rows` envelope is checked at `:225`. Existing top-level row keys that conflict with `rows` are checked at `:226`; an explicit document-level value such as `distribution` would be read from `doc` in this function, after the envelope is known and before row normalization. Current implementation does not read a top-level `gap` key; the current normalization uses `doc.instruments` at `:242`, then maps row objects through `normalizeRow()` at `:245`.
