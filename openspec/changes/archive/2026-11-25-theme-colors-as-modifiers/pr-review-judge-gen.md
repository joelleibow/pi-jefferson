# PR review: theme-colors-as-modifiers (PR #25)

Reviewed head commit: `4d99426f8f7d321f41d2c992cf4a25cd08d960c7` (branch `theme-colors-as-modifiers`, base `main`).
Read: the PR description and diff, `proposal.md`, both spec deltas, the touched code and its callers, and the pi 1.4.0 theme code in `node_modules`. I did not read `design.md`, `tasks.md`, the council files or any review or research file.
Run locally: `pnpm typecheck` is clean. `pnpm test` shows 578 pass, 0 fail. CI `check` is green on this head.
Load assumed: one person's terminal footer, a handful of extensions, a render every few hundred milliseconds. Nothing here scales with users.

What this change does: A format can now put the name of any foreground colour of pi's theme after `|`, such as `$model|toolDiffRemoved`, and that text is drawn in that colour. Jefferson's own names (`dim`, `bold`, a variable's forms) are read first, then the theme is asked. A colour written in the format beats the colour an instrument picks for itself, which beats `style`. Because a provider's default format can now name a colour, and only a theme can say whether a name is a colour, provider registrations are copied when they arrive and held until `session_start` hands over the theme.

## Must fix

None.

## Should fix

1. **ADR 0021 points at a folder that is about to move** (`docs/adr/0021-a-foreground-colour-of-the-theme-is-a-modifier.md`, line 12)
   - **What this is:** The ADR says where Joel's rulings and the design decision live. It names `openspec/changes/theme-colors-as-modifiers/owner-rulings.md` and `.../design.md`.
   - **Problem:** The PR description says the change is "archived on this branch before merge". After that the folder is `openspec/changes/archive/<date>-theme-colors-as-modifiers/`, and both links are dead on `main`. ADR 0017 shows the repo's habit: it names the archive path. Comments in the code (`format.ts:170`, `startup.ts:40,53`, `registration-listener.ts:330`) cite "design, '…'" by section name only, which survives the move. The ADR is the only place with a full path.
   - **Fix:** Drop the path and say "the change's `owner-rulings.md` and `design.md`, archived with it", or write the archive path once the archive step runs.
   - **If we skip it:** The one record that explains why colours outrank an instrument's own colour sends a reader to a folder that does not exist.

## Nice to have

2. **A condition that is always true** (`extensions/jefferson/format.ts`, the branch that stores the colour on the segment, around L130)
   - **What this is:** After the check "neither a modifier nor a colour throws", the code does `if (modifier !== undefined) … else if (colour !== undefined) …`.
   - **Problem:** When `modifier` is undefined the code above has already guaranteed `colour` is defined, so the second test never fails. It reads as if a third case existed.
   - **Fix:** Make it a plain `else`.
   - **If we skip it:** Nothing breaks. The next reader looks for a case that cannot happen.

3. **Two copies of the same probe** (`extensions/jefferson/format.ts`, `foregroundCheck` and the local `isBackground` in `validateStyle`)
   - **What this is:** Both call a theme accessor inside a `try` and answer true or false. They differ only in `getFgAnsi` versus `getBgAnsi`.
   - **Problem:** Two near-copies of "does this accessor throw". The PR's stated aim is one probe.
   - **Fix:** One small helper that takes the accessor name, used by both. About 6 lines fewer.
   - **If we skip it:** Harmless today. If pi changes how the accessors signal a missing name, someone has to remember to fix both.

4. **A new closure on every render of a provided colour** (`extensions/jefferson/components/instruments/instrument-binding.ts`, the `variableFg` guard, L201-205)
   - **What this is:** The guard that checks a provider's colour token now calls `foregroundCheck(theme)(token)`. That builds a fresh function each time, then runs it.
   - **Problem:** It runs once per provided coloured variable per render. The cost is tiny (one closure and one map lookup), so this is only worth doing if you are already in the file.
   - **Fix:** Call `theme.getFgAnsi(token)` in a `try` directly, or build the check once per render.
   - **If we skip it:** A few allocations per repaint. Not measurable.

## What I checked and found sound

- **Parser order and chain rules.** I traced `$path|relative|accent`, `$path|accent|relative`, `$price|bold|accent`, `$p|accent|warning`, a colour on literal text, and `$bar|name`. Each matches the specs. A form after a colour is refused because of the `subject.colour === undefined` guard.
- **Strongest-colour rule.** `resolveFormat` skips the provider's colour function when the chain names a colour. The test shows a throwing provider function stays silent, as the spec says.
- **The hold.** I checked how messages are copied, queued and drained, in both load orders.
  - Every member that `vetRegistration` and `adaptProvidedDeclaration` read (`name`, `variables`, `defaultFormat`, `defaultLabel`, `variableForms`, `bar`, `fills`, `variableFg`, `composed`, `options`, `fields`) is in a copy table. The tables are pinned to the contract's keys by `satisfies`, so a new contract member fails typecheck.
  - `receiveTheme` goes live before it drains, and it contains a throw per drained message.
  - A second `session_start` only swaps the check.
- **Calling `receiveTheme` before the mode check.** In pi 1.4.0 print mode `ctx.ui.theme` is a proxy that only throws when used. `foregroundCheck` catches that and answers "not a colour", so nothing crashes outside the TUI.
- **Theme invariance.** pi 1.4.0 fills fallback tokens and takes its names from the required token table, so a theme carries every foreground name. A parsed colour therefore cannot throw at render. The PR records that fact for the next pin bump.
- **Docs and release.** Docs match the behaviour, including the new warning wording. The PR carries `release:minor`, which makes the "Jefferson 0.15.0" claims right, because the version comes from the tags and the label (`CONTRIBUTING.md`).

## Verdict

Verdict: Ship. Finding 1 is worth a one-line edit before merge, and 2-4 are optional.

Lean: -8 lines possible.

Not checked: Joel's live run in a real pi (the PR lists it as outstanding), the real 49-name slot table of other pi versions, and the archive step itself, which has not happened on this head.
