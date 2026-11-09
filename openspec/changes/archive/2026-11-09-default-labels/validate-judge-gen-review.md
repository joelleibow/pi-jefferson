# PR #17 review: `default-labels` into `main`

**Head commit reviewed:** `ac46b24ae095760a98c6f50e574cc31060346aa5` (the PR head when I started and when I finished).

**What this change does:** Five shipped instruments (`path`, `context`, `tokens`, `cost`, `model`) get a default label (`Path:`, `Context:`, `Tokens:`, `Cost:`, `Model:`), so an unconfigured cell says what it shows. `thinking` already had one, and `blank` gets none. `model`'s default format changes from `$provider: $model` to `$provider/$model`, so the label does not make two colons. Production code is six added lines and one changed line in `visuals/instrument.ts`. The rest is tests, README text and the change's own files.

I read the diff and the PR description. From the change directory I read only `proposal.md` and `specs/`. Note: `gh pr diff` printed the whole diff, including `tasks.md` and the other change files. I did not use them as evidence. I judged against the proposal, the spec delta, and the code.

## Findings

None to fix.

## What I checked

- **Binding path** (`visuals/instrument-binding.ts`): the label is `entry?.label ?? declaration.defaultLabel ?? ""`. A configured label, including `""`, wins over the default. The one gap exists only when label and segments are both non-empty. Every spec scenario follows from this unchanged code: default label before a default format, before a configured format, alone with `format: ""`, and replaced or removed by a configured label.
- **No label over an unknown datum** (`visuals/format.ts` `resolveFormat`): it returns `""` when any variable the declaration declares reads as unknown. This check runs over all declared variables, not only the ones the format names. So the label is hidden even with `format: ""`. That matches the spec and needs no new code.
- **`blank`**: it declares no label, so the default row's placeholders and the fallback for an unknown instrument name are unchanged.
- **Width and the 80-column row.** The new `path, model, thinking` test pins the exact line and the 80-column width.
- **Other users of the model text.** I searched the source, ARCHITECTURE and the ADRs. No other code, doc or ADR depends on `$provider: $model` or on "only `thinking` has a label". The README table and upgrading note were updated, and the note gives the right recipe to get the old model text back (`label: ""` plus `format: "$provider: $model"`).
- **Spec delta against the code.** The `model`, `path`, `context`, `tokens` and `cost` requirements state the same texts and formats the code now declares. The main spec still shows the old `model` text. That is expected until the change is synced into `openspec/specs/` and archived.
- **Tests.** `pnpm typecheck` is clean. `pnpm test` gives 317 tests, 317 pass. The new tests go through `readDocument` / `createFooter`, not the `render()` helper that skips labels, so they fail if a declaration is reverted. The `label: ""` fixture edits keep the old expectations for tests whose subject is not the label. I read through them and found none loosened.
- **Load.** This is a footer drawn per render for one person. The change adds a literal segment that binding builds once per instrument, not per render, so I saw no cost.

Looks good. Ship.

Verdict: Ship.

Not checked: I did not run pi live, and I did not diff the delta spec's unchanged scenarios line by line against the main spec. The PR leaves the live check to Joel's own task.
