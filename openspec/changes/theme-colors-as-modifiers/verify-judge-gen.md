# Verification Report: theme-colors-as-modifiers

Using change: `theme-colors-as-modifiers` (schema `marbleization`). Head reviewed: `4d99426f8f7d321f41d2c992cf4a25cd08d960c7`, branch `theme-colors-as-modifiers`, clean working tree. Nothing was edited except this report.

Evidence run on that head:

- `pnpm typecheck` is clean.
- `pnpm test` passes 578 of 578. That is the 538 tests that shipped at `cf90995` plus 40 new ones.
- `openspec validate theme-colors-as-modifiers --strict` returns "valid".
- `rg "is ThemeColor => false|names a modifier it does not implement" extensions tests` returns nothing. That confirms the interim guard and the old refusal text are gone (task 5.2).

### Summary

| Dimension | Status |
|---|---|
| Completeness | 12/13 tasks. The one open task is 5.3, the owner's live observation, expected unticked. Every ADDED and MODIFIED requirement has an implementation. 1 removal confirmed. |
| Correctness | 12/12 ADDED or MODIFIED requirements covered (6 modified and 4 added in statusline, 2 added in instrument-registration). Scenario coverage is by sampling and by the tasks' coverage table, not by running every scenario. One scenario, "A faint colour" on pi's real system theme, is verified only against the fake theme (see Not verified). |
| Coherence | Followed. Design decisions match the code. No pattern deviations of note. 1 suggestion. |

Counting note: N counts ADDED and MODIFIED requirements only. The REMOVED requirement is reported separately.

## Completeness

### Task completion

`openspec instructions apply` reports 12 of 13 complete and 1 remaining.

- **Task 5.3 is open.** It is "Joel's — watch that `|muted` looks faint on pi's system theme and that a name from the live 49-name table colours a piece". It is expected unticked and is not counted as a defect. It is the only evidence for pi's real slot table, because the suite uses `fakeTheme`.
- Tasks 5.1 and 5.2 hold on this head, per the evidence run above. The count of 538 old tests still passing matches the 578 total.

### Spec coverage

Every requirement was searched in the code.

**statusline**

| Requirement | Implemented at |
|---|---|
| MODIFIED "An instrument's style is pi's ThemeStyle" | `format.ts` `validateStyle`, which now asks the shared `foregroundCheck` for `fg` and keeps its own `getBgAnsi` probe for `bg`. |
| MODIFIED "A modifier follows a variable or literal text" | `format.ts` `parseFormat`. The `$bar` refusal is kept and the "two places" table is unchanged. |
| MODIFIED "A variable can declare forms" | The form gate now also requires `subject.colour === undefined`. This is what refuses `$path|accent|relative`. |
| MODIFIED "The thinking level takes the color…" | `resolveFormat` skips the declared token when `segment.colour` is set. |
| MODIFIED "A notice takes the colour…" | Same path as the thinking level. |
| MODIFIED "A notice's text is a format with declared variables" | A plain format refuses every `|name` before any lookup. The `{ miss: "$tokens|accent" }` row is cited in the tasks. |
| ADDED "A style modifier only adds an attribute" | `MODIFIERS` is unchanged. A colour is held as a field on the segment, not as a modifier. |
| ADDED "A foreground colour of the theme is a modifier" | `parseFormat` reads names in the order form, then `MODIFIERS`, then `check(name)`, then refusal. A background name fails `getFgAnsi` and is refused. |
| ADDED "The colour a format names is the strongest colour" | `resolveFormat`: `segment.colour ?? declaredToken`, then the merged style. The declared token is not called for a covered piece. |
| ADDED "A colour's name is the theme's own" | `foregroundCheck(theme)` asks `getFgAnsi` one name at a time. No names are copied and no theme file is read. The segment holds the name and `theme.style()` draws it at render time. |

**instrument-registration**

| Requirement | Implemented at |
|---|---|
| ADDED "A provider's default format is checked against the theme" | `adaptProvidedDeclaration(..., check)`. The listener holds provider messages until `receiveTheme`, then vets them once with the same check. This makes the outcome independent of load order. The refusal carries the parser's message. The bind's re-parse in `instrumentBindings(check, …)` gets the same check. |
| ADDED "A held message is judged as it was posted" | The copy-at-arrival member tables in `registration-listener.ts` (`REGISTRATION_COPY`, `REPORT_COPY`, and so on), typed `satisfies Record<keyof …>`. |

**REMOVED "A style modifier only sets an attribute on"**

- The baseline sits in `openspec/specs/statusline/spec.md`, including the scenario "A color is not a modifier" at line 790.
- The behaviour searched for is "`fg` and `bg` MUST NOT be modifiers". The code now accepts a foreground colour after `|`, and `bg` is still refused. No path still refuses a foreground colour.
- The attribute rules are restated in the ADDED replacement.
- The baseline spec text staying until archive is expected, not an issue.

## Correctness

### Requirement implementation mapping

No divergence found from the delta text. Points I checked in the code:

- **Precedence.** `resolveFormat` computes `token` only when `segment.colour === undefined`, then `foreground = segment.colour ?? token`. This satisfies "A colour function the format covers" (no call, no warning).
- **Reserved word wins.** `MODIFIERS.get(name)` is read before `check(name)`, so `|dim` stays the attribute even where the theme has a `dim` colour.
- **Form versus colour.**
  - A form wins only directly after its variable, once, with no modifier or colour before it.
  - `$price|bold|accent` therefore falls to the colour path.
  - `$path|accent|relative` is refused naming `|relative`.
- **Two colours on one piece.** The later `colour` overwrites the earlier one on the segment, so the later wins.
- **Label.** A label has no format and carries no `colour`, so only `style` colours it.
- **One message for every path.** One sentence ("names neither a modifier Jefferson implements nor a foreground colour of the theme: `|name`") is built in the parser. It is forwarded by `configuration.ts` for both Jefferson's own instruments and provided ones, and by the registration refusal. The docs tables in `docs/configuration.md` and `docs/extension-authors.md` match.
- **No contract change.** `instrument-contract.ts` is not in the diff, and `package.json` is untouched. This matches S11 and D9.

### Scenario coverage

Tests exist for the scenarios I spot-checked: background name (`selectedBg`), misspelling (`acccent`), case difference (`|Accent`), form-after-colour, `bold|accent` against `accent|bold`, two colours, dim versus theme `dim`, theme-lacks-or-has name provenance (`foregroundCheck(fakeTheme({ invented }))` at `tests/format.test.ts:257,400`), provider default format refusal (`notacolour`, in both load orders in `tests/registration.test.ts`), and the held-message getter and `toJSON` cases. The export pin in `tests/jefferson.test.ts:254` includes `foregroundCheck`.

I did not run each of the 40 new tests one at a time against its named scenario. The coverage table in `tasks.md` gives the mapping, and the full suite is green.

## Coherence

### Design adherence

The code follows the design's decisions:

- **One order, parser-owned.** The order is in `parseFormat` only.
- **One probe, owned by `format.ts`.** `foregroundCheck` and `ForegroundCheck` are exported. `validateStyle` and the `variableFg` guard both use it. `rg` finds no other foreground `getFgAnsi` call in `extensions/`, and no new source file was added.
- **Colour held as a field on the segment.** It is not a modifier kind, and it is optional so existing `deepEqual` assertions stay valid.
- **Registration waits for the first theme.**
  - Provider messages are copied at arrival and queued.
  - Jefferson's own payload is accepted by identity and never held.
  - `receiveTheme` goes live before the drain.
  - Each drained message is contained with `console.error("Event handler error (<channel>):")`.
  - A later `receiveTheme` call replaces the check and drains nothing.
- **Handing the theme over.** `startup.ts` hands over `ctx.ui.theme` first thing in `session_start`, before the mode check.
- **Required `check` parameters.** They have no lenient default, as designed.
- **Retirement recorded.** ADR 0021 is new, ADR 0003's status line is amended, and the pin note is added in `startup.ts`.
- **Docs pass.** `docs/formats.md`, `docs/notices.md`, `docs/extension-authors.md`, `docs/configuration.md`, `ARCHITECTURE.md` and `AGENTS.md` are updated, covering the sites the proposal lists. The remaining hits for "not a modifier" are the new `bg` sentence and the baseline spec.

### Code pattern consistency

The code uses the repository's patterns: erasable TypeScript, `.ts` import extensions, `satisfies` pins, the "Defining not assigning" rule for map copies, and a parse error forwarded as `error.message` (matching `configuration.ts` convention). No significant deviations.

## Issues by priority

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. **Version in the docs.** `docs/formats.md:76` and `docs/extension-authors.md:120` state "Jefferson 0.15.0 or later". That is correct only if the PR is labelled `release:minor`, since the highest tag is `v0.14.0` and ADR 0018 derives the version from the label and the tags. Confirm the label when merging. Otherwise the docs name the wrong release.

## Not verified

- **Pi's real theme.** The live behaviour on pi's system theme is not verified: that `|muted` renders faint, and that a name from the real 49-name table colours a piece. The suite uses `fakeTheme`, which answers by slot, and no test reads pi's files. This is task 5.3, the owner's observation, and it is open by design. The spec scenarios "A faint colour" and the real-slot half of "The names are the theme's, not a copy" rest on it.
- **Per-scenario test execution.** Each of the roughly 60 delta scenarios was not mapped to a test and run in isolation. Coverage rests on spot checks plus the `tasks.md` coverage table.
- **The "A name carried in two places" scenario.** It inspects source and has no test at `cf90995`. I checked it by reading `format.ts`: one `MODIFIERS` table holds the style and string names, and colours are not in it.

## Final assessment

No critical issues found in the checks that ran. 0 warnings, 1 suggestion. Not verified: pi's real theme behaviour (task 5.3, the owner's live observation, open by design), and per-scenario test execution. Readiness is not claimed until 5.3 is observed and ticked.
