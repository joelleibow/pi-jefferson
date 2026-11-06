# Tasks

Each task starts with a test that fails first, then makes it pass. `D#` is a decision in `design.md`; a spec name
is a scenario or requirement in `specs/statusline/spec.md`. Tests drive the real `readConfiguration`, bound
instruments, `resolveFormat` and `createFooter`; only the host is faked: the slot-aware `tests/fake-theme.ts` and
plain `Readings` values. No task tests string modifiers or `capitalize` itself, adds a dependency, flag, stored
data or migration, edits `package.json`, calls `Theme.getThinkingBorderColor`, changes `resolveFormat`'s
six-parameter signature, or edits Markdown other than this file (the docs pass writes the README instruments table
and the `label` option prose). All commands run from the repository root.

**Test routes.** A test that needs a label or a configured style obtains its bound instrument through
`readConfiguration`, with the `readDocument` / `cellText` harness already in `tests/configuration.test.ts`.
`instrumentBindings` is not exported, and the `render` helper in `tests/instrument.test.ts` calls `resolveFormat`
directly with an empty style and no label, so it bypasses the label and any configured style. That helper is used
only for tests that need neither, and is named when it is.

**Guard tasks.** Where an earlier task already delivers a behavior, the later task's test passes as soon as it is
written. It is then a guard, and its Verify step applies the named mutation to the code, runs the test, records
that it fails, and restores the code. A guard is never described as red first.

**Existing pins.** A task updates a pin in the task that makes it false. 4.1 owns every old-text pin; 5.1 owns the
pins its coloring makes false.

## 1. Precondition

- [x] 1.1 Fast-forward this worktree from `152cfe3` to tag `v0.5.0` (`e593968311946be0d762ecb1fed0a545f5eac11b`),
  then run `pnpm install`. Traces to D7. Nothing below starts before this. **Verify:**
  `git merge-base --is-ancestor v0.5.0 HEAD` exits 0, `git rev-parse HEAD` is `e593968…`, and
  `pnpm typecheck && pnpm test` pass on the untouched code, so every later failure is the change's own. Boundary:
  none.

## 2. The `label` option

- [x] 2.1 Add `"label"` to `FOUNDATIONAL_OPTIONS` so every shipped instrument accepts it. Traces to D1 and the
  requirement "An instrument's label is placed in front of its format". **Failing test first** (in
  `tests/configuration.test.ts`, via `readDocument`): "a document giving every shipped instrument a string
  `label` is accepted with no warning". Also update the pin in `tests/instrument.test.ts` from
  `["format", "style"]` to `["format", "style", "label"]` (still frozen). **Boundary:** a misspelled `lable` is
  still rejected naming the key. **Verify:** both tests fail before the change; `pnpm test` green.
- [x] 2.2 `readInstruments` rejects a `label` that is not a string and keeps a valid one on `ConfiguredInstrument`
  as `label?: string`. Traces to D1; spec "A label that is not a string". **Failing test first** (in
  `tests/configuration.test.ts`): "an instrument entry with `label: 3` rejects the document, the default row
  renders, and the warning names the instrument and the option". **Boundary:** `label: {}` rejects the same way;
  `label: ""` is accepted. **Verify:** the test fails once 2.1 has made `label` an accepted key, and passes after
  the validation; `pnpm test` green.

## 3. The label in front of the format

All tests in this group use the `tests/configuration.test.ts` route.

- [x] 3.1 Prepend the label at binding. Add the optional `defaultLabel` field to `InstrumentDeclaration` (no
  declaration sets it yet). In `instrumentBindings`, `label = entry?.label ?? declaration.defaultLabel ?? ""`,
  with `entry` the per-instrument entry, not the configured-instruments Map. When `label` is non-empty, pass
  `[{ kind: "literal", text: label, modifiers: [] }, ...segments]` to `resolveFormat`. No `collapse` yet (3.5).
  Traces to D1, D3; specs "A label in front of a configured format", "A label in front of the default format".
  **Failing test first:** "`model` configured with label `🧠 ` and format `$model` renders `🧠 ` then the model
  id; `context` with a label and no format renders the label then its default format". **Boundary:** an
  instrument with no label configured and no `defaultLabel` renders exactly as before; `label: ""` leaves the
  format's text unchanged. **Verify:** fails before, passes after; `tests/format.test.ts`, which calls
  `resolveFormat` with six parameters, stays green unedited until 5.1, the only task that edits it;
  `pnpm typecheck` accepts the new field.
- [x] 3.2 **(Guard.)** An unknown datum suppresses the whole cell, label included. Traces to D3 (first table row);
  spec "An unknown datum suppresses the label". Test: "`thinkingLevel: undefined` with label `Thinking: ` renders
  nothing, for format `$level` and for format `""`". **Boundary:** the format `""` case, since a format with no
  `$level` must not shield the cell; the same label with a known level renders. **Verify:** mutation: prepend the
  label to `resolveFormat`'s returned string instead of passing it as a segment; the test fails; restore.
- [x] 3.3 **(Guard.)** A known datum with an intentionally empty format renders the label alone. Traces to D3
  (second and third rows) and the council's C2 seam; spec "An empty format leaves the label alone". Test:
  "`thinkingLevel: "high"`, `label: "🤔"`, `format: ""` renders `🤔`". **Boundary:** `format: ""` with
  `label: ""` renders `""`. **Verify:** mutation: prepend after `resolveFormat` returns only when its result is
  non-empty (Kimi's binding-output seam); the test fails; restore.
- [x] 3.4 **(Guard.)** The label is not a variable and is not parsed. Traces to D2; specs "A dollar sign in a
  label", "The label is not a variable". Test: "label `$level` renders the characters `$level`; a format naming
  `$label` rejects the document, the default row renders, and the warning names the instrument and the variable".
  **Boundary:** label `a\$b` renders `a\$b`. **Verify:** mutation: send the label through `parseFormat`; the test
  fails; restore.
- [x] 3.5 Export `collapse` from `format.ts` and apply it once to the resolved label in `configuration.ts`:
  `collapse(entry?.label ?? declaration.defaultLabel ?? "")`. `configuration.ts` is its only consumer and its rule
  is not copied. Traces to D2; spec "Control characters in a label". **Failing test first:** "label
  `"A\nB\u0085C "` with format `$level` and level `high` renders `A B C high` on one line"; it fails after 3.1
  because the output holds the raw `\n`. **Boundary:** a tab and `\r` each become one space. **Verify:** passes
  after; `git grep -n "collapse" extensions/` lists `collapse` defined in `format.ts` and imported only by
  `extensions/jefferson/configuration.ts` (plus its own uses in `format.ts`); `pnpm test` green.
- [x] 3.6 **(Guard.)** The label takes the instrument's configured `style`. Traces to D4; spec "The label takes the
  instrument's style". Test: "label `Q: ` with style `{"fg":"accent"}` renders the label wrapped in the fake
  theme's `accent` foreground". **Boundary:** with no `style` the label is unstyled text. **Verify:** mutation:
  append the label to the styled result unstyled; the test fails; restore.
- [x] 3.7 **(Guard.)** The label's width reduces `$bar`. Traces to D3 (consequence); spec "The label takes width
  from a bar". Test: the exact input of that scenario (a 3-column label, the rest of the format taking 6 of a
  20-column cell), expecting an 11-column bar. **Boundary:** a label as wide as the cell leaves the bar nothing.
  **Verify:** mutation: leave the label out of the `nonBar` sum (bar 14 columns); the test fails; restore.

## 4. The default `thinking` cell

- [x] 4.1 Give `thinking` `defaultLabel: "Thinking: "` and `defaultFormat: "$level|capitalize"`. Traces to D1; spec
  "The default thinking cell". **Failing test first** (in `tests/configuration.test.ts`): "with level `high` and
  nothing configured, the `thinking` cell renders `Thinking: High`". This task owns every old-text pin; each
  fails until the declaration changes and is updated here:
  - `tests/instrument.test.ts`: the `shapes` pin `["thinking", ["level"], "thinking: $level"]` becomes
    `$level|capitalize`; the "model and thinking default formats keep their original text shapes" test follows;
    the pins asserting `thinking: high` / `thinking: off` through the `render` helper become `High` / `Off`, since
    that helper carries no label; and a new assertion that of the shipped declarations only `thinking` declares a
    `defaultLabel`, `Thinking: `, while `model`, `path`, `context`, `tokens`, `cost` and `blank` do not.
  - `tests/configuration.test.ts` and `tests/jefferson.test.ts`: every `thinking: high` / `thinking: off` /
    `thinking: low` expectation becomes `Thinking: High` / `Thinking: Off` / `Thinking: Low`, including the
    `thinking: low` pins at `tests/jefferson.test.ts:400` and `:451` (line numbers at `v0.5.0`).
  - `tests/jefferson.test.ts:574-588` (at `v0.5.0`): the document sets `thinking: { format: "$level" }` and
    expects `high` and `low` padded into 8-column cells. The default label now applies to a configured format,
    which would turn those cells into a clipped `Thinking: …`. The intent-preserving update adds `label: ""` to
    that document's `thinking` entry, so the test keeps asserting the configured `$level` text and does not
    acquire the default label. Its expectations are not edited.

  **Boundary:** `off` renders (it is a level, not unknown); the existing "unknown thinking renders nothing and
  never invents off" test passes unedited. **Verify:** the updated pins fail before the declaration change and pass
  after; `git grep -n "thinking: " tests/` returns only the stub `render: () => "thinking: high"` in
  `tests/row-renderer.test.ts` (not an expectation of the thinking instrument) and the configuration line
  `thinking: { format: "$level", label: "" }` near `tests/jefferson.test.ts:578`; every other match is a
  `Thinking: ` expectation of the new text. `pnpm test` green.
- [x] 4.2 **(Guard.)** A configured label replaces the default. Traces to D1; spec "A configured label". Test
  (`tests/configuration.test.ts`): "`thinking` configured with label `🤔` and nothing else renders `🤔High`, with
  no `Thinking: `". **Boundary:** `label: ""` renders `High` alone. **Verify:** mutation: resolve
  `declaration.defaultLabel ?? entry?.label`, so the default wins; the test fails; restore.
- [x] 4.3 **(Guard.)** The `thinking` cell follows the host through the label path. Traces to the modified
  requirement "The thinking instrument"; specs "The thinking level changes", "A session is restored". Test (the
  existing seed-and-push harness in `tests/jefferson.test.ts`, adding assertions only, no pin edits): "a
  `thinking_level_select` to `low` after a first render shows `Thinking: Low`, and a session seeded with `xhigh`
  shows `Thinking: Xhigh`". **Boundary:** a repeated level requests no extra repaint (existing behavior, still
  green). **Verify:** mutation: read the level once at binding instead of per render; the test fails; restore.

## 5. The `$level` color

- [x] 5.1 Add the seven foreground slots `thinkingOff`, `thinkingMinimal`, `thinkingLow`, `thinkingMedium`,
  `thinkingHigh`, `thinkingXhigh`, `thinkingMax` to `tests/fake-theme.ts`, each rendering distinguishably (no
  fixture self-test; this task's own test fails if a slot is missing or two alike). Add the optional `variableFg`
  field (`Readonly<Record<string, (value: string) => ThemeColor | undefined>>`) to `InstrumentDeclaration`;
  `thinking` declares `variableFg.level`, mapping `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max` to
  `thinkingOff` through `thinkingMax`. `resolveFormat` calls the entry with the declared variable's value before any
  modifier mutates it, and styles that segment as `theme.style(text, { ...mergedStyle(style, segment.modifiers),
  fg: token })`, with `styledPiece`'s empty-style early return no longer skipping a token. Traces to D5; specs
  "The level changes", "Every level has its color". **Failing test first** (in `tests/instrument.test.ts`, via the
  `render` helper, which needs neither label nor style): "for each of the seven levels the default `thinking`
  cell's level text is wrapped in that level's own `thinking*` foreground, and no two levels share one".
  **Boundary:** the default `thinking` has an empty `style`, so this is the empty-style case; `off` and `max` are
  included. This task also owns every plain-text thinking-level expectation written before it, because its
  coloring makes each one false, not only those 4.1 wrote: the known-level boundary assertions of 3.2, the
  `thinking` cases of 3.4 where the label test uses it, the `A B C high` assertion of 3.5, the `Thinking: High` /
  `Thinking: Off` and `Thinking: Low` pins of 4.1, the `🤔High` and `High` assertions of 4.2, and the
  `Thinking: Low` / `Thinking: Xhigh` assertions of 4.3. Each is rewritten as follows:
  - `tests/instrument.test.ts` and `tests/configuration.test.ts`: assert the styled form built from the fake
    theme's own slot for the level (`thinkingHigh`, `thinkingOff`, `thinkingLow`, `thinkingXhigh`), keeping the
    label and any literal text in their own styled or plain form.
  - `tests/format.test.ts:354` and `:359` (at `v0.5.0`): the `capitalize` assertion and the `$level|upper`
    assertion, both on level `high`, which `variableFg` now colors. Their inputs and expected texts (`High`,
    `HIGH`) stay byte-identical; each is wrapped only in the already-imported `stripTerminalSequences`.
  - `tests/jefferson.test.ts`: where only text matters, compare through `stripTerminalSequences`, which the file
    already imports from pi-tui and already uses near `:570` and `:586`; no new ANSI-stripping helper is added.
    Where the cell is asserted whole, assert the styled form.

  **Verify:** the new test fails against a hard-coded token (all levels equal) and against an implementation that
  skips the token on an empty style; `git grep -in "high\|off\|low\|xhigh" tests/instrument.test.ts
  tests/configuration.test.ts tests/jefferson.test.ts`, case-insensitive so it also sees 3.5's lowercase `high`,
  filtered to thinking-cell expectations, shows each one styled or compared through `stripTerminalSequences`; `pnpm typecheck && pnpm test` green.
- [x] 5.2 **(Guard.)** A configured `fg` does not beat the level color. Traces to D5; spec "A configured
  foreground". Test (`tests/configuration.test.ts`): "`thinking` with style `{"fg":"accent"}` and level `high`
  renders the level in `thinkingHigh`, not `accent`". **Boundary:** none beyond the input. **Verify:** mutation:
  spread the token before the configured style; the test fails; restore.
- [x] 5.3 **(Guard.)** A configured `bg` and boolean attributes survive on `$level`. Traces to D5 and the
  council's C1; spec "A configured background and attributes". Test (`tests/configuration.test.ts`): "`thinking`
  with style `{"bg":"selectedBg","bold":true}` and level `high` renders the level with `thinkingHigh` foreground,
  `selectedBg` background and bold". **Boundary:** `{"italic":true}` alone. **Verify:** mutation: style the
  segment with a foreground-only wrap of the token (what `getThinkingBorderColor` does) instead of
  `theme.style(…)`; the test fails; restore. The fake theme has no `getThinkingBorderColor`, so a real call to it
  would also fail.
- [x] 5.4 **(Guard.)** Only the level segment is recolored. Traces to D5, D4; spec "Text outside the level". Test
  (`tests/configuration.test.ts`): "`thinking` with style `{"fg":"accent"}`, format `[$level]` and label `Q: `
  renders the brackets and the label in `accent` and only the level in `thinkingHigh`". **Boundary:** none.
  **Verify:** mutation: apply the token to every segment; the test fails; restore.
- [x] 5.5 **(Guard.)** The token is chosen from the unmutated level. Traces to D5 (fourth consequence) and D8's
  "Token keys on the unmutated level" row. Test (`tests/instrument.test.ts`, `render` helper): "format
  `$level|capitalize` with level `high` renders `High` in `thinkingHigh`". This tests the lookup's input, not
  `capitalize`. **Boundary:** none. **Verify:** mutation: call `variableFg` with the mutated piece `High`; the
  lookup returns `undefined`, the level loses its color, and the test fails; restore.
- [x] 5.6 **(Guard.)** A level outside the seven keeps the instrument's own style. Traces to D5 (third
  consequence). Test (`tests/configuration.test.ts`): "level `ultra` renders `Thinking: Ultra` with the
  instrument's own style and no `thinking*` token". **Boundary:** a configured `style: {"fg":"accent"}` keeps
  `accent` on the level. **Verify:** mutation: map an unrecognized level to `thinkingOff`; the test fails; restore.
- [x] 5.7 **(Guard.)** The token resolves against the theme passed to each render. Traces to D5 (second
  consequence); spec "The theme changes". Test (`tests/configuration.test.ts`): "rendering the bound `thinking`
  instrument obtained through `readConfiguration` with theme A and then theme B, whose `thinkingHigh` renders
  differently, uses B's value on the second render". The second theme is a second instance of the fake with a
  different `thinkingHigh` rendering; the fixture gets no self-test. **Boundary:** the same readings and width on
  both renders. **Verify:** mutation: resolve the token once at binding; the test fails; restore.

## 6. Completion

- [x] 6.1 Verify the whole change against the installed devDependency. **Verify:** `pnpm typecheck` and
  `pnpm test` pass; `git diff v0.5.0 --stat` lists only `extensions/jefferson/format.ts`,
  `extensions/jefferson/instrument.ts`, `extensions/jefferson/configuration.ts` and files under `tests/` (plus this
  change directory's Markdown); `package.json` and `pnpm-lock.yaml` are not in it; `git grep -n
  "getThinkingBorderColor" extensions/` finds nothing; `git diff v0.5.0 -- extensions/jefferson/format.ts` shows
  `resolveFormat`'s signature `(declaration, segments, style, readings, width, theme)` unchanged. Traces to D3, D5,
  D6 and the Non-Goals. Boundary: none.
