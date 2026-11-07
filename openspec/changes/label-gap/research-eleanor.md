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
