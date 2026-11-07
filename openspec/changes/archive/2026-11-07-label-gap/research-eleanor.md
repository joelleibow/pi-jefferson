# Eleanor research — label-gap

Reconnaissance of the existing pi-jefferson worktree for the `label-gap` change: how an
instrument's `label` is read, validated, defaulted, collapsed, measured, styled and rendered today,
so the design can decide how a label written with no trailing space gets a visible gap before the
content. Every finding cites a path and line. Nothing was edited; the only file written is this
report. Binding evidence: `openspec/changes/label-gap/owner-rulings.md` (2026-11-06 objective: *"I
have to use spaces in my label config because it renders right up against the instrument content
and looks bad."* — the change is the gap between label and content, and only that).

## 1. Required reads

- `AGENTS.md` — read in full. No `CLAUDE.md` exists. Commands: `pnpm typecheck` (tsc --noEmit),
  `pnpm test` (node --test, source executed directly, erasable TypeScript only, `.ts` import
  extensions, no build step). Two traps: emit a reset before an intra-cell pad that follows an open
  SGR; measure with `visibleWidth`, clip with `truncateToWidth`, and compute the pad from the
  clipped result.
- `ARCHITECTURE.md` — read in full. Layout after the `2026-11-06-restructure-by-responsibility`
  archive: entry `extensions/jefferson.ts`; `extensions/jefferson/{startup,configuration,footer-setup}.ts`;
  `data/`; `visuals/`. Its Instrument paragraph states the label pipeline: binding "resolves the
  label (configured, else the declaration's default), collapses its control characters once, and
  hands it to the format language as a leading literal segment, so the label is styled and measured
  like the format's own text."
- ADRs — `docs/adr/` holds exactly five; all read (titles/status):
  - `docs/adr/0001-imports-run-one-way.md` — "1. Imports run one way; host packages are the host's
    to supply" (2026-11-03, Accepted; supersedes the entry-only import rule).
  - `docs/adr/0002-rows-span-the-full-width.md` — "2. Rows span the full width" (2026-11-05,
    Accepted; cells get `basis: floor(W/N)`, `grow: 1`, `shrink: 0`, no gap).
  - `docs/adr/0003-a-format-carries-modifiers.md` — "3. A format carries modifiers, and `|` is a
    second special character" (2026-11-06, Accepted; a modifier on literal text covers the run of
    non-whitespace directly before it — the only ADR whitespace mention, line 33).
  - `docs/adr/0004-string-mutations-come-from-lodash-es.md` — "4. String mutations come from
    `lodash-es`, the package's first runtime dependency" (2026-11-06, Accepted).
  - `docs/adr/0005-source-is-laid-out-by-responsibility.md` — "5. Source is laid out by
    responsibility, with data kept apart from visuals" (2026-11-06, Accepted; narrows ADR 0001).
  - None of the five states anything about a label.
- Language/build config — `package.json` (read): `pi-jefferson` 0.1.1, `"type": "module"`,
  `packageManager pnpm@12.17.0`, scripts `test: node --test`, `typecheck: tsc --noEmit`,
  `pi.extensions: ["./extensions/jefferson.ts"]`, peerDeps `@earendil-works/pi-coding-agent: *` and
  `@earendil-works/pi-tui: *`, the single runtime dependency `lodash-es ^4.18.1`, devDeps include
  `@types/lodash-es`, `@types/node`, `typescript ^7`. `tsconfig.json` (read): ES2023, nodenext,
  strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `verbatimModuleSyntax` +
  `allowImportingTsExtensions`, `noEmit`, include `extensions/**/*.ts`, `tests/**/*.ts`.
  `openspec/config.yaml` (read): `schema: marbleization`, plus a context block repeating the
  vocabulary rule (row/cell/instrument) and the commands.

## 2. Structure map (as it actually exists)

- `extensions/jefferson.ts` — the only host-loaded entry; default-exports `jefferson(pi)` which
  calls `startUp(pi)` from `./jefferson/startup.ts`; exports `VERSION = "0.0.0-alpha"`.
- `extensions/jefferson/startup.ts` — `startUp` (:11): the `/jefferson` command and the
  `session_start` install lifecycle (data → configuration → footer).
- `extensions/jefferson/configuration.ts` — the `pi-jefferson.json` reader: `readConfiguration`
  (:268), `readInstruments` (:63), `normalizeDocument` (:200), `normalizeRow`, `cellsFromNames`,
  `RejectedConfiguration`, `DEFAULT_CELLS`/`MAX_CELLS = 10`, whole-document rejection semantics.
- `extensions/jefferson/footer-setup.ts` — `installFooter`: the one `ctx.ui.setFooter` call; builds
  the footer via `createFooter(rows, sample, theme)`.
- `extensions/jefferson/data/` — `session-data-store.ts`, `session-data-feed.ts` (store + host event
  adaptation; not label-relevant beyond `Readings`).
- `extensions/jefferson/visuals/` — `instrument.ts` (declarations), `instrument-binding.ts` (the
  binding that resolves the label), `format.ts` (the format language: `parseFormat`, `collapse`,
  `validateStyle`, `resolveFormat`), `row.ts` (`Cell`, `Row`, `ALIGNMENTS`), `row-renderer.ts`
  (`createFooter`, `cellView` clip/pad).
- `tests/` — `configuration.test.ts`, `format.test.ts`, `instrument.test.ts`, `jefferson.test.ts`,
  `row-renderer.test.ts`, `session-data-store.test.ts`, `fake-theme.ts`.
- Specs — living `openspec/specs/{statusline,session-data-store,extension-source-layout}/spec.md`;
  archived changes under `openspec/changes/archive/` (nine, including
  `2026-11-06-default-thinking-instrument` which introduced the label and
  `2026-11-06-restructure-by-responsibility` which set the current layout).
- Change directory `openspec/changes/label-gap/` holds exactly `owner-rulings.md` (read in full).

## 3. Feature path — the label's lifecycle, file:line

### 3.1 Every place a label is read, validated, defaulted, collapsed, measured, styled, rendered

1. **Configuration reader** — `extensions/jefferson/configuration.ts`:
   - `readInstruments` (:63) iterates the document's `instruments` object. Any key not in
     `declaration.options` rejects the whole document (:82-86); `label` is allowed because
     `FOUNDATIONAL_OPTIONS = Object.freeze(["format", "style", "label"] as const)`
     (`visuals/instrument.ts:24`).
   - `label` is read at :95 and validated only as `typeof label === "string"` (:96-98); a non-string
     label throws `RejectedConfiguration("instrument \"<name>\" has a label that is not a string")`,
     rejecting the whole document (default row + warning). **No trim, no collapse, no whitespace
     handling at read time** — the string is stored verbatim.
   - :106 stores it: `configured.set(declaration.name, label === undefined ? { segments, style } :
     { segments, style, label })` into `ConfiguredInstrument` (`visuals/instrument-binding.ts:12`
     `label?: string`). `format` is parsed at :90 via `parseFormat`; the label is *not* parsed.
2. **Declarations' `defaultLabel`** — `extensions/jefferson/visuals/instrument.ts`: the
   `InstrumentDeclaration` interface gains `defaultLabel?: string` (:19). Exactly one declaration
   carries one: `thinking` at :58-65, with `defaultFormat: "$level|capitalize"` (:62) and
   **`defaultLabel: "Thinking: "` (:63) — the exact string is `Thinking: ` with one trailing space**.
   `blank` (:39), `model` (:46), `path` (:68), `context` (:75), `tokens` (:87), `cost` (:100) declare
   no `defaultLabel`. `SHIPPED` (:106) and `instrumentNamed` (:110) resolve names.
3. **Binder** — `extensions/jefferson/visuals/instrument-binding.ts`, `instrumentBindings` (:15):
   - :23 `const label = collapse(entry?.label ?? declaration.defaultLabel ?? "")` — configured label
     wins, else the declaration's default, else `""`. **`collapse` is applied exactly once, here, at
     binding time** — it is `text.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")`
     (`visuals/format.ts:40-42`): every C0/C1 control character (newline, tab, CR included) becomes
     one space. **No trim**: leading and trailing spaces (and spaces that control characters became)
     survive untouched. `""` is a legal label that removes the default.
   - :24-25 `label === "" ? segments : [{ kind: "literal", text: label, modifiers: [] }, ...segments]`
     — a non-empty label becomes **one leading literal segment** prepended to the parsed format
     segments. It never goes through `parseFormat`, so `$`, `\$`, `|` in a label are literal
     characters and no `$label` variable exists.
   - :26-28 the bound `Instrument.render = (readings, width, renderTheme) =>
     resolveFormat(declaration, labelled, style, readings, width, renderTheme)`, memoized per
     instrument name.
4. **Format language** — `extensions/jefferson/visuals/format.ts`:
   - `parseFormat` (:47) collapses its own literal runs at flush (:54) and in the modifier branch
     (:99) with the same `collapse`; it never sees the label. A `|` modifier after literal text
     applies to the run of non-whitespace directly before it (:99-105) — since the label is a
     *separate* segment, a format-initial `|mod` still rejects ("a modifier with nothing before it"),
     and a format's first modifier never reaches back into the label.
   - `resolveFormat` (:175): :183-187 the guard — every declared variable is resolved and
     `collapse`d (:187); **if any is `undefined`, the whole render returns `""` at :186, before any
     segment (label included) is styled**. :189-193 builds `pieces` (bar piece is `""`, literals and
     mutated variable values are the text). :195-197 `$bar` sizing: `nonBar` sums
     `visibleWidth(piece)` over **all** non-bar pieces — the label's piece is in `pieces`, so the
     label's visible width is subtracted: `barWidth = Math.max(0, width - nonBar)`. :202-203 draw the
     bar (`█` filled / `░` dim, fg warning/error above 90/70 percent). :206-210 style each segment
     once through `mergedStyle`/`styledPiece` — the label segment has `modifiers: []`, so it takes the
     instrument's configured `style` verbatim; `variableFg` (:209) applies only to `variable` segments,
     so a declared token (e.g. `thinking`'s `thinkingHigh`) recolors `$level` but **not** the label.
5. **Cell clip and pad** — `extensions/jefferson/visuals/row-renderer.ts`, `cellView` (:30):
   - :31-34 memo by `(sample, width)`; :35 `truncateToWidth(cached.text, cellWidth)` clips the whole
     rendered line — **label included, clipped together with the format's text at the line's end**;
   - :36 `pad = Math.max(0, cellWidth - visibleWidth(clipped))` — the label's columns are part of
     `clipped`, so they count against the cell's width and reduce the pad; :37-39 the pad splits by
     `align`; :40 a `RESET` (`\x1b[0m`, :17) precedes a trailing pad only when `leavesStyleOpen`
     (:16-18). Row geometry is the host's: `addChild(component, { basis: Math.floor(width / N), grow: 1,
     shrink: 0 })` (:63), `gap: 0` (:13) — **no separator is inserted between cells or between label
     and content anywhere in the pipeline**.

### 3.2 The "cell renders empty" rule

`resolveFormat` :183-187: when any declared variable resolves `undefined`, it returns `""` before
styling anything — the label is a segment inside `resolveFormat`, so **an unknown datum suppresses
the whole cell, label included**, whatever the format (even `""`). Conversely, when the datum is
known and the configured format is `""`, the label segment is the only piece and **the label alone
renders** beside the empty format. `blank` declares no variables, so its guard never trips.

### 3.3 What a label's width contributes

- To `$bar`: the label is piece 0 in `pieces`, so `nonBar` (:196) includes `visibleWidth(label)` and
  `barWidth = max(0, width - nonBar)` (:197) shrinks by the label's columns (pinned by the scenario
  "The label takes width from a bar": label `ab ` (3 columns) + `$percent $bar` in a 20-wide cell
  with 6 columns of format leaves an 11-column bar).
- To the cell's clip and pad: the label is inside the rendered line, so `truncateToWidth` (:35) clips
  it with everything else at the cell's end, and `visibleWidth(clipped)` (:36) makes its columns count
  toward the cell width, reducing the pad. There is no separate label truncation rule.

### 3.4 Net whitespace statement

The only transformations any step applies to a label are: (a) `collapse` once at binding time
(control chars → one space each, `format.ts:40-42`), and (b) being styled/measured as an ordinary
literal segment. **No step trims, appends, or inserts whitespace** — a label written with no trailing
space renders flush against the format's first character; the gap users see today comes only from a
trailing space typed into the label string itself (as in the default `"Thinking: "`).

## 4. Living specs, archived change and ADRs that state anything about a label

- Living `openspec/specs/statusline/spec.md`:
  - **Requirement: "An instrument's label is placed in front of its format"** — "The label MUST be
    rendered in front of the text the instrument's format produces, configured or default, as
    literal text in which `$` has no meaning, in the instrument's configured `style`. It MUST NOT be
    a variable… A `label` that is not a string MUST reject the document. **An unknown datum MUST
    suppress the whole cell, label included.**" Scenarios: "A label in front of a configured format"
    (label `🧠 ` — trailing space — + `$model` → `🧠 ` + model id); "A label in front of the default
    format"; "An unknown datum suppresses the label"; "An empty format leaves the label alone"
    (label `🤔`, format `""` → renders `🤔` and nothing after it); "A dollar sign in a label"
    (`$level` renders literally); "Control characters in a label" (newline + C1 each become one
    space, "as in the format's own literal text"); "The label takes the instrument's style"
    (label `Q: ` — trailing space — + `{"fg":"accent"}`); "The label takes width from a bar"
    (label `ab `, 3 columns, bar gets 11 of 20); "The label is not a variable" (`$label` in a format
    rejects); "A label that is not a string".
  - **Requirement: "The thinking instrument"** — "with the default label `Thinking: ` and the default
    format `$level|capitalize`"; scenario "The default thinking cell" renders `Thinking: High`;
    scenario "A configured label" (`🤔`) renders `🤔` followed by the capitalized level; "A level the
    host has not supplied" renders nothing.
  - **Requirement: "$bar takes the width the rest of the format leaves"** — the bar "MUST take the
    columns the rest of the format leaves in the cell"; the label is part of "the rest" by
    construction.
- Archived `openspec/changes/archive/2026-11-06-default-thinking-instrument/`:
  - `specs/statusline/spec.md` — the same label requirement as an ADDED delta (identical wording and
    scenarios), and the thinking-instrument requirement MODIFIED to name the default label
    `Thinking: `.
  - `design.md` — D1 (:66-78): `label` is a foundational option on every declaration;
    `defaultLabel` exists only on `thinking`, `"Thinking: "`; a configured label replaces the
    default and `""` removes it. D2 (:92-106): the label is raw literal text, collapsed **once** where
    its segment is made (`collapse` from `format.ts`, every control character becomes one space).
    D3 (:108-147): the label is prepended as **one leading literal segment** in `instrumentBindings`;
    consequence (:144-147): "`$bar` shrinks by the label's visible width, because the label is one of
    the pieces the `nonBar` sum counts". D4 (:149-153): the label inherits the instrument's `style`
    through the same `styledPiece` path. Risk (:246-248): "[A width cost] The label spends columns in
    a narrow cell and gets clipped with the rest… no truncation rule is added."
  - `owner-rulings.md` — "Default composition": *"The default label should just be "Thinking: "
    "*; "Label option": the label "should always be placed in front of what format is set to… Always
    in front of format, including its default."
- `openspec/changes/label-gap/owner-rulings.md` — the change objective (quoted above) and the
  inherited rulings; no spec/design/tasks artifacts exist in this change directory yet.
- ADRs: none mention a label; the only whitespace statement is ADR 0003's modifier run on literal
  text (`docs/adr/0003-a-format-carries-modifiers.md:33`).

## 5. Tests that set a label or assert on label text (with trailing-space flags)

All in `tests/`; `tests/format.test.ts` and `tests/row-renderer.test.ts` contain **no** label tests.

- `tests/configuration.test.ts`
  - :272-277 "…the thinking cell renders its default label and capitalized level" — expects
    `"Thinking: " + style("High", {fg:"thinkingHigh"})` (**trailing space** in the label/expected).
  - :279-286 "a configured label replaces the default label" — label `"🤔"` (no trailing space);
    `label: ""` removes the default.
  - :494-498 "…every shipped instrument a string label…" — labels `` `${name}: ` `` (**trailing
    space** each).
  - :510-521 "a configured label is placed in front of a configured format and a default format" —
    `"🧠 "` (**trailing**) → `"🧠 claude-opus-4"`; `"ctx "` (**trailing**) → `"ctx 43.2%/200k"`;
    no-label case `"anthropic: claude-opus-4"`; `label: ""` → `"claude-opus-4"`.
  - :523-532 "an unknown datum suppresses the whole cell, label included" — label `"Thinking: "`
    (**trailing**) with formats `"$level"` and `""`, both render `""` when the level is unknown;
    known level renders `"Thinking: " + style("high", {fg:"thinkingHigh"})`.
  - :534-539 "a known datum with an intentionally empty format renders the label alone" — `"🤔"` +
    `format: ""` → `"🤔"`; `""` + `""` → `""`.
  - :542-549 "a label is literal text, never a variable and never parsed" — `"$level "`
    (**trailing**) → `"$level claude-opus-4"`; `"a\\$b "` (**trailing**) escape not consumed;
    `$label` in a format rejects the document.
  - :551-558 "a label's control characters each become one space…" — `"A\nB\u0085C "` (**trailing**)
    → `"A B C "`; `"T\tB\r"` (no trailing) → `"T B "`.
  - :561-568 "the label takes the instrument's configured style" — `"Q: "` (**trailing**) styled
    with `fg: accent`; unstyled renders `"Q: claude-opus-4"`.
  - :570-579 "the label's width reduces what the bar has left" — `"ab "` (**trailing**), 20-wide
    cell, bar occupies 11; `"x".repeat(20)` (no trailing) leaves the bar nothing.
  - :602-605 "only the level segment is recolored" — label `"Q: "` (**trailing**) keeps `fg: accent`
    while `[$level]` recolors.
  - :710-715 "a label that is not a string rejects the document…" — `3` and `{}` rejected; `""`
    accepted.
- `tests/instrument.test.ts:58-59` — every declaration's `options` is `["format","style","label"]`;
  `defaultLabel` is `"Thinking: "` (**trailing space**) for `thinking`, `undefined` otherwise.
- `tests/jefferson.test.ts:428-441` — "the thinking cell follows the host through the label path":
  asserts `Thinking: High` / `Thinking: Low` / `Thinking: Xhigh` (**trailing space** via the default
  label). :617-619 configures `thinking` with `label: ""` (no trailing).

**Command runs** (this worktree): `pnpm typecheck` → `tsc --noEmit`, exit 0, no diagnostics.
`pnpm test` → `node --test`: **243 tests, 243 pass, 0 fail** (0 cancelled/skipped/todo,
duration ≈ 562 ms).

## 6. README and other documentation

- `README.md:70-73` — "Every instrument also accepts `label`, a string placed in front of its
  format, whether the format is configured or the default. It is literal text: `$` means nothing
  in it… Each control character in it becomes one space, and it takes the instrument's `style`. A
  `label` that is not a string rejects the document." No whitespace/gap rule is stated.
- `README.md:76` — example `"thinking": { "label": "🤔" }` (no trailing space).
- `README.md:79-82` — "Only `thinking` has a default label, `Thinking: ` (**trailing space**), so
  its default cell reads `Thinking: High`. A configured `label` replaces the default, and
  `label: ""` removes it. When an instrument's data is unknown the cell renders nothing, label
  included. With known data and `"format": ""`, the cell is the label alone."
- `README.md:84-86` — upgrading note: a previously configured `thinking` format now starts with
  `Thinking: ` (**trailing space**); set `label: ""` to get the previous text back.
- `README.md:126-129` — the `thinking*` tokens recolor `$level` only; "the label and any other text
  keep the instrument's `fg`".
- `README.md:184-186` mentions "label" only in the unrelated PR-release-label sense.
- No other doc line shows a label with a trailing space besides `Thinking: ` occurrences above and
  the spec scenarios `🧠 ` / `Q: ` / `ab ` quoted in §4.

## 7. Unknowns and questions for the conductor

- No code path inserts any gap between label and content today; the only separator is a trailing
  space inside the label string itself. Confirmed at every step in §3.
- Whether the gap should be added in the binder (segment construction), the format language, the
  configuration reader, or the spec, and whether it should apply to configured labels, the default
  label, or both — design judgment (Michael/Joel), deliberately not answered here.
- Whether a gap should interact with `collapse` (e.g. a trailing tab in a label collapses to a
  space, which already reads as a gap) — behavior today is fully described; the design question is
  open.
- Whether `openspec validate --strict` is expected to run against this change directory — it holds
  only `owner-rulings.md` plus this report; not run, since no spec artifacts exist yet.
- The archived `2026-11-06-restructure-by-responsibility` research cites the pre-restructure flat
  layout at old paths; current paths were re-verified directly against the worktree.

## 8. Acceptance report

```json
{
  "criteriaSatisfied": [
    { "id": "criterion-1", "status": "satisfied", "evidence": "Report written to openspec/changes/label-gap/research-eleanor.md with all six brief sections (label pipeline with file:line, empty-cell rule, $bar/clip/pad width contributions, spec/ADR quotes, test inventory with trailing-space flags and command counts, README lines); canonical structured output returned with exact paths/symbols in feature_path and gaps in unknowns/questions." }
  ],
  "changedFiles": ["openspec/changes/label-gap/research-eleanor.md"],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    { "command": "pnpm typecheck", "result": "passed", "summary": "tsc --noEmit exit 0, no diagnostics" },
    { "command": "pnpm test", "result": "passed", "summary": "node --test: 243 tests, 243 pass, 0 fail, ~562ms" }
  ],
  "validationOutput": ["pnpm typecheck: exit 0 clean; pnpm test: tests 243 / pass 243 / fail 0"],
  "residualRisks": ["Cited line numbers are against the current worktree; concurrent edits would shift them.", "No design verdict given or implied; the gap mechanism remains open for Michael/Joel."],
  "noStagedFiles": true,
  "diffSummary": "Added openspec/changes/label-gap/research-eleanor.md only; no source, spec, or config files modified.",
  "reviewFindings": ["no blockers"],
  "manualNotes": "Brief honored: no repo edits besides this report, no pi installed-package source read, ~/.pi/agent/pi-jefferson.json never touched, no workflow disposition given."
}
```

## Eleanor addendum 1 — label-gap: format whitespace and the binder

Answers to `/tmp/labelgap-brief-eleanor-addendum-1.md`, cited file:line. Tree: branch `label-gap`,
HEAD `ad0e28f`; the working tree is dirty only in `openspec/changes/label-gap/proposal.md` and
`openspec/changes/label-gap/specs/statusline/spec.md` (the design drafts) — every cited source and
test file is at HEAD, unmodified. Read-only apart from this file. No design proposals, no verdicts.
Per this run's authoritative output path, this addendum is written to
`openspec/changes/label-gap/research-eleanor.2a0dab84.md`.

## 1. Format whitespace inventory in `tests/`

Method: every format string in `tests/{format,configuration,jefferson,instrument,row-renderer}.test.ts`
— arguments of `rendered(name, "…")` / `parseFormat(decl, "…")` / `render(name, readings, "…")` /
`format: "…"`, including the `for (const format of […])` arrays (format.test.ts:61, :346, :373;
configuration.test.ts:525) — was checked after `collapse` (`format.ts:40-42`, control chars → space)
for leading/trailing whitespace or whitespace-only text.

Result: **no non-empty format in `tests/` begins or ends with whitespace after collapse, and none is
whitespace-only.** The only matches are the empty format `""` (collapse of `""` is `""`):

| file:line | format | expected |
| --- | --- | --- |
| `tests/format.test.ts:73` | `parseFormat(named("model"), "")` | segments `[]` (deepEqual) |
| `tests/format.test.ts:74` | `rendered("model", "")` | `""` |
| `tests/configuration.test.ts:525` (test at :523, `for (const format of ["$level", ""])`) | `""` with `label: "Thinking: "` (:526) | render under unknown level is `""` (:528) |
| `tests/configuration.test.ts:535` | `format: ""` with `label: "🤔"` | `"🤔"` (:537) |
| `tests/configuration.test.ts:538` | `format: ""` with `label: ""` | `""` (:539) |
| `tests/configuration.test.ts:719` (test at :718, "an explicitly empty configured format is accepted and renders nothing") | `format: ""` | cell text `[""]` (:722) |

Near-miss worth recording: `tests/format.test.ts:145` uses format `"L\n$model"` — the internal `\n`
collapses to a space inside the leading literal (`"L "`), but the format string itself starts with
`L` and ends with `$model`, so it is not edge-whitespace. `tests/row-renderer.test.ts` uses the
format language only at :380 (`parseFormat(declaration, declaration.defaultFormat)`); its other
cell texts ("ab", "provider: a-very-long-model-name", :38, :85-86, :147-148) are raw instrument
outputs, never parsed. Fixtures: `tests/format.test.ts:181` fixture `defaultFormat: "$value"` — no
edge whitespace; `tests/instrument.test.ts:36-44` `shapes` table lists all seven defaultFormats —
none with edge whitespace.

## 2. Shipped `defaultFormat`s and edge whitespace

No. `extensions/jefferson/visuals/instrument.ts`: `DEFAULT_CELL_TEXT` :7-8 (used by `blank` :41),
`model` :48 `"$provider: $model"`, `thinking` :62 `"$level|capitalize"`, `path` :70 `"$path"`,
`context` :82 `"$percent/$window"`, `tokens` :95 `"$totalTokens"`, `cost` :102 `"$cost"`. None begins
or ends with whitespace, and none contains a control character, so `collapse` is the identity on all
seven.

## 3. Where the binder gets segments for an unconfigured instrument

In the binder itself: `extensions/jefferson/visuals/instrument-binding.ts:21`
`const segments = entry?.segments ?? parseFormat(declaration, declaration.defaultFormat);` — for an
instrument the document does not configure (`entry === undefined`), the binder calls
`parseFormat(declaration, declaration.defaultFormat)` at :21. The other producer is
`extensions/jefferson/configuration.ts:90` inside `readInstruments`
(`segments = parseFormat(declaration, format ?? declaration.defaultFormat)`), stored at :106 into
`ConfiguredInstrument.segments`, which the binder reads as `entry?.segments`.
Yes — a `parseFormat` result is the only way segments reach the binder: the only other segment-list
construction is the label prepend at `instrument-binding.ts:24-25`. (Tests also call `parseFormat`
directly — format.test.ts:30, row-renderer.test.ts:380, instrument.test.ts:50 — but that is not the
binder path.)

## 4. `parseFormat`: adjacent literals, empty literals, modifier-segment whitespace

All in `extensions/jefferson/visuals/format.ts`:

- **Empty-text literal segments: never.** `flush` guards `literal !== ""` (:54); the modifier branch
  guards `prefix !== ""` (:105); the run is `text.match(/\S+$/)` (:100), always non-empty, pushed at
  :106. The binder's label segment is likewise guarded by `label === ""`
  (`instrument-binding.ts:24`).
- **Two adjacent literal segments: yes.** The modifier-on-literal branch splits the pending literal
  into a prefix pushed at :105 and the run pushed at :106, back to back. Example: `"hello world|dim"`
  → literal `"hello "` (no modifiers) + literal `"world"` `[dim]` (asserted at
  `tests/format.test.ts:310`); `"$model via|dim|bold $provider"` → variable + literal `" "`
  (whitespace-only, no modifiers) + `"via"` (tests/format.test.ts:317-318).
- **Modifier-carrying literal with whitespace at its edges: no.** The segment that receives the
  modifier is exactly `run = text.match(/\S+$/)` (:100, :106); `\S` excludes every whitespace
  character (JS `\s` includes NBSP `\u00a0` — see tests/format.test.ts:311), so the modifier segment
  can neither begin nor end with whitespace. The whitespace stays in the prefix segment (:104-105),
  which carries `modifiers: []`. This confirms ADR 0003's line 33 ("the run of non-whitespace text
  directly before it") at `format.ts:99-106`.
- Note: a literal consisting only of control characters (e.g. `"\t"`) is non-empty before collapse,
  so `flush` emits it as a whitespace-only literal segment with `modifiers: []` (collapse at :54;
  exercised at tests/format.test.ts:137-140).

## 5. Label tests with no trailing space in the label and format `""` or absent

- `tests/configuration.test.ts:279-286` ("a configured label replaces the default label"):
  :280 `readDocument({ instruments: { thinking: { label: "🤔" } }, cells: [{ instrument: "thinking" }] })`
  — format absent, so the declaration default `"$level|capitalize"` (instrument.ts:62) is used;
  :282 expected `["🤔" + fakeTheme().style("High", { fg: "thinkingHigh" })]`.
  :284-285 `label: ""`, format absent → expected `[fakeTheme().style("High", { fg: "thinkingHigh" })]`
  ("an empty label removes the default").
- `tests/configuration.test.ts:534-539` ("a known datum with an intentionally empty format renders the
  label alone"): :535 `label: "🤔", format: ""` → :537 expected `"🤔"`; :538 `label: "", format: ""`
  → :539 expected `""`.
- `tests/configuration.test.ts:557-558` (second case of the test at :551): :557
  `label: "T\tB\r", format: "$level"` → :558 expected
  `"T B " + fakeTheme().style("high", { fg: "thinkingHigh" })`. The raw label has no trailing space;
  after `collapse` `"T\tB\r"` becomes `"T B "`, which does end with a space.
- `tests/configuration.test.ts:577-578` (the `x`.repeat(20) case of the test at :570): :577
  `label: "x".repeat(20), format: "$bar"` → :578
  `render(seed, 20, theme)` expected `"x".repeat(20)` ("a label as wide as the cell leaves the bar
  nothing").

## 6. README lines showing a format with leading or trailing whitespace

None. The format examples in `README.md` are: :47 `"format": "🧠: $model from $provider"`,
:51 `"format": "$bar $percent"`, the default-format table :62-68 (`Lorem ipsum …`, `$provider: $model`,
`$level\|capitalize`, `$path`, `$percent/$window`, `$totalTokens`, `$cost`), the modifier example
:92-94 `` `🧠 $model via|dim $provider|capitalize` ``, and the pipe prose :104-108
(`$model | $provider` → `claude-opus-4 | anthropic`, `\|`). No format string in the README begins or
ends with whitespace. The only edge-whitespace strings in the README are label prose: :79 and :85
(`Thinking: `, with its trailing space).

## Eleanor bounded addendum — label-gap (tasks drafting)

Answers only, file:line. Tree: branch `label-gap` HEAD `ad0e28f`. No file besides this one touched;
`~/.pi/agent/pi-jefferson.json` never read.

1. **Scratch agent directory.** `tests/configuration.test.ts:33-44` `readDocument(document, theme)`:
   `mkdtempSync` temp dir (:34), writes `pi-jefferson.json` as `agentPath` (:36), calls
   `readConfiguration({ agentPath, projectPath: join(dir, "missing.json"), projectTrusted: false, theme })`
   (:38-42). `readConfiguration` takes `ConfigurationSource.agentPath` (`extensions/jefferson/configuration.ts:35-36`,
   used at :271); `configurationPaths` (:255-258) is the only caller of `getAgentDir()`, so tests never touch
   `~/.pi/agent`. End-to-end: `tests/jefferson.test.ts:171-180` `useTempAgentDir(t)` (mkdtemp + sets
   `PI_CODING_AGENT_DIR` :174-175, restored via `t.after` :176-179) with `writeAgentDocument(agentDir, document)`
   (:182-184). Cell-to-text helper: `tests/configuration.test.ts:28-30` `cellText(cell)` =
   `cell.instrument.render(seed, 80, fakeTheme())`, used at :282 via `rows[0].cells.map(cellText)`; the
   :570-579 bar tests instead call `rows[0].cells[0].instrument.render(seed, 20, theme)` directly (:575, :578).
2. **`$bar` segment kind.** `extensions/jefferson/visuals/format.ts:12-15`: `FormatSegment` =
   `{ kind: "literal"; … } | { kind: "variable"; … } | { kind: "bar" }` — `$bar` is its own kind `"bar"`
   (:15), pushed at :76. Not a `variable` segment.
3. **`$bar`-width tests + styled render through an instrument.** `tests/format.test.ts:87-90` uses helper
   `rendered(name, format, { width, theme })` (:26-30, = `resolveFormat(decl, parseFormat(decl, format), …)`)
   with `rendered("context", "$percent $bar", { width: 20, theme })` → `"43.2% " + "█".repeat(6) +
   theme.style("░".repeat(8), { dim: true })`; also `tests/configuration.test.ts:570-576` via `readDocument`
   + `instrument.render(seed, 20, theme)`. Yes, bg and underline already render through an instrument:
   `tests/format.test.ts:81` `cellStyle = { fg: "accent", bg: "selectedBg", bold: true }` rendered at :96 and
   :108 (expected built from `theme.style(…, cellStyle)` :103-107); underline at :261-264
   (`rendered("model", "$provider|bold|underline")` → `theme.style("anthropic", { bold: true, underline: true })`).
   Fake theme for reuse: `tests/fake-theme.ts:5` `fakeTheme()`, whose `style()` is at :22.

## Eleanor bounded fact — label-gap (clip test for "A narrow cell clips the gap with the rest")

file:line only. Tree: branch `label-gap` HEAD `ad0e28f`. No other file written; `~/.pi/agent/pi-jefferson.json` never read.

- Clip tests in `tests/row-renderer.test.ts`: `lineAt(row, width)` helper at :44-46
  (`createFooter([row], () => readings, fakeTheme()).render(width)[0]`); "content wider than its cell is
  truncated to one line" :73-79 (`lineAt(rowOf(3), 12)`, asserts `visibleWidth(line) === 12`, no full text);
  "an instrument resolving text wider than its cell is clipped and stays one line" :81-96 (cells with
  `render: () => "provider: a-very-long-model-name"` at :85-86, `lineAt(row, 20)`, asserts
  `text.startsWith("provide")` and no `"a-very-long-model-name"` at :94-95); same pattern at :147-148.
- Helper instrument source: `rowOf(count, text)` :37-42 builds cells with `{ render: () => text }`; `lineAt`
  takes any `Row`, i.e. any structural `Instrument` (`render(readings, width, theme)`). Existing row-renderer
  tests use only hand-built instruments — :380-381 builds one from `instrumentNamed("model")` +
  `parseFormat`/`resolveFormat`, not from `instrumentBindings` — but a bound instrument from
  `instrumentBindings()`/`readDocument` is structurally accepted by `lineAt`/`rowOf` cells.
- Bound instrument + cell clip already combined: `tests/configuration.test.ts:794-798` `footerFor(document, theme)`
  = `readDocument` (→ `instrumentBindings`) → `createFooter(rows, () => seed, theme)`; clip-at-fixed-width
  assertions: :833-838 (`format: "ab漢字cd"`, `footer.render(20)`, third cell asserted as
  `getFgAnsi("accent") + "ab" + RESET + "..." + RESET + " "`), also :803-816, :820-828, :859-862.
  End-to-end at width 80: `tests/jefferson.test.ts:430-441`, :587-592, :610, :629-630, :640 (`session.lines(80)`).
