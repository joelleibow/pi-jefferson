# Verification Report: bar-thresholds

Verifier: judge-gen. Branch `bar-thresholds`, HEAD `94e4630` ("Document bar thresholds"). Schema: `marbleization`. Read-only run; the only file written is this report.

## Summary

| Dimension    | Status |
|--------------|--------|
| Completeness | 21/22 tasks. The one open task is 5.1, the owner's live observation, which is expected to be unticked. 26 ADDED/MODIFIED requirements across 3 delta specs, all with implementation found. |
| Correctness  | 26/26 requirements covered. 648 of 648 tests pass, `pnpm typecheck` is clean, and `openspec validate bar-thresholds --strict` reports valid. |
| Coherence    | Design followed. 3 suggestions, no warnings. |

Counts: statusline has 22 requirements (18 ADDED, 4 MODIFIED), instrument-registration has 3 (2 ADDED, 1 MODIFIED), and extension-source-layout has 1 MODIFIED, so 26 in all. None is REMOVED or RENAMED.

## Evidence run

- `pnpm typecheck`: clean.
- `pnpm test`: 648 tests, 648 pass, 0 fail. This matches task 4.3 (base 578, plus 70 new).
- `openspec validate bar-thresholds --strict`: "Change 'bar-thresholds' is valid".
- Fixture check from `.github/workflows/ci.yml:101-118`, reproduced by hand in a temp directory:
  - `pnpm pack`, then extract the tarball into the provider's `node_modules/pi-jefferson`.
  - The fixture's `tsc` exits 0 with `progress` opting in via `["formats", "thresholds", "fill"]`.
  - The reserved config fails with one `TS2344`.
  - This confirms task 3.4's done-when.
- Two mutations re-run on a scratch copy of HEAD:
  - `<=` changed to `<` in `stateAt` turns A15, A16, A17 and A5 red (M3).
  - The bar read forced on for every instrument turns the suite red.
  - This is a spot check of task 4.2, not a replay of M1–M24.

## Completeness

### Tasks

`openspec instructions apply` reports 22 tasks, 21 complete and 1 remaining.

- The remaining one is 5.1, "Joel's live observation", which tasks.md says the writer never ticks. It is expected and is not counted as a defect.
- Tasks 1.1–1.5, 2.1–2.8, 3.1–3.5 and 4.1–4.3 are ticked, and the code and tests bear that out.

Note for archive: tasks.md says `openspec validate --archived` fails the archive until 5.1 is ticked with the owner's words.

### Spec coverage (requirement to code)

| Requirement (capability) | Evidence |
|---|---|
| A threshold sets the instrument's state at a percentage (statusline) | `stateAt` is the last ascending entry with `activeAt <= (reading ?? 0)` (`extensions/jefferson/thresholds.ts`). The binding chooses it in `atSample` (`components/instruments/instrument-binding.ts`). |
| The default thresholds are 70 and 90 | `DEFAULT_THRESHOLDS` is 70 → `warning` and 90 → `error`, each an ordinary layered threshold. The binding falls back to it when `thresholds` is absent, for every bar, opted in or not. |
| A configured list replaces the defaults | `(thresholds ?? DEFAULT_THRESHOLDS)`. `[]` binds no state, so nothing colours the fill. |
| A threshold's state changes only the keys it names | `layerThreshold` merges records one level and replaces parsed format lists and labels whole. Each state is layered on `top` and never on another threshold. |
| The style, the fill and the track layer in one order | `bar.ts` draws the filled columns as `{...style, ...fill}` and the track as `{...style, dim: true}`. |
| `fill` styles the bar's fill and nothing else | `validateStyle(..., "fill")`. `fill` is carried on both paths in `ownValues` and `checkProvidedSettings`. |
| Each honoured state is bound as an instrument is | `bindState` gives each state its own segments, label and gap, composed choice, kind formats, `fills`, style and fill. The cap of four gives at most five states. |
| Only the four lowest thresholds are honoured | `readThresholds` walks in written order, then warns on the written count, drops entries above 100, sorts and keeps four. |
| The over-four warning is composed once and reported once | The sentence is composed in `readThresholds`. It is pushed to `reading.faults` only after `configured.set` on the own path, and to the read-time and watch paths after `configured.set` on the provided path (`configuration.ts`). A rejected document and a refused provider never carry it. |
| A malformed threshold rejects the settings | Checks run in this order: `typeof === "number"`, `Number.isInteger`, `>= 0`, then the duplicate check. `-0` equals 0, so it is a duplicate, and `70.0` and `7e1` parse to 70. |
| Every value inside a threshold is checked as a top-level value is | One per-value check serves the top level and every threshold on each path (`ownValues`, and `values` inside `checkProvidedSettings`). |
| A threshold fault names its place | `thresholdPlace` is `<subject>, thresholds <N>:`. The position is the written one and the option is named as written (`fill` never reads as `style`). |
| A key a threshold does not take is refused | `allowed = options minus "thresholds"` on the provided path. On the own path, `key === "thresholds" \|\| !declaration.options.includes(key)`. |
| A threshold compares the bar's own reading | The slot keeps the raw reading and `stateAt` uses `reading ?? 0`. A negative reading sits below every threshold. `$percent`'s rounded text is not used. |
| A threshold's format decides whether the instrument fills | `Instrument.fills(readings)` is per sample. `declaration.fills === true` fills at every reading. The slot memoises one outcome per sample object (`row-renderer.ts` and `instrument-binding.ts`). |
| The bar is read only when its reading can change what renders | `readsBar` is true when the top format names `$bar`, or when an honoured threshold sets a key other than `fill`. The defaults follow the same rule. |
| A shipped declaration that can draw a bar declares the two options | `BAR_OPTIONS` is exported from `instrument.ts` and used in `context.ts`. The pinned expectation in `tests/instrument.test.ts` is derived from each declaration's own `bar`. |
| A registration naming an option Jefferson cannot honour is refused | The new `option-without-bar` refusal in the adapter and the listener. `option-unimplemented` is kept for `seconds` and other names. |
| `$bar` takes the width the rest of the format leaves (MOD) | `drawBar` takes the fill. `resolveFormat` takes the trailing `bar?: {reading, fill}` and never calls `declaration.bar`. |
| A provided instrument takes only the options Jefferson implements (MOD) | The adapter accepts `thresholds` and `fill` by name on a declaration with `bar`. The existing unknown-key loop refuses the rest. |
| A provided instrument's settings are checked once both are in hand (MOD) | `checkProvidedSettings` now returns `{settings, warning?}` or `{kind, part}`. Both callers (the read and the watch) were moved. |
| Only a variable the format names can blank an instrument (MOD) | Blanking is judged on the chosen state's segments (`state.segments`, `drawsBar`). |
| A faulting bar is unknown, and blanks only a drawn bar (instrument-registration) | The adapter's `bar` returns undefined on a fault and reports once. `readsBar` and `drawsBar` keep a state that draws no `$bar` rendering. |
| A state is chosen inside a provided instrument's boundary | `containProvided` wraps `fills` and `render`. The `fills` catch records `resolver-threw` ("its bar threw") and answers `topLevelFills`. |
| Provider code costs one entry and no more (MOD) | The wrapper is unchanged for the other scenarios. |
| The bar has its own file (extension-source-layout, MOD) | `bar.ts` holds no percentage or colour choice. `tests/jefferson.test.ts` (A60) pins that no visual or `thresholds.ts` has a relative import. |

No requirement is missing from the code.

### Scenario coverage

The tests cover each scenario family:

- `tests/thresholds.test.ts` (A1–A20) covers the reader, the sort, the cap, `stateAt`, layering and the defaults.
- `tests/configuration.test.ts` and `tests/instrument.test.ts` cover the own path, the binding, the per-sample slot, the two widths, and the blanking of states at 0.
- `tests/registration.test.ts` (129 A-references) covers the provider path:
  - the opt-ins;
  - the refusals asserted whole beside a rendering sibling;
  - the over-four warning in both registration orders;
  - the throwing `then` getter;
  - bar faults returning a string or throwing.
- `tests/format.test.ts` has the strict-edge pair flipped to the inclusive rule.

No scenario was found without a test or a code path.

## Correctness

No divergence from the delta specs found. Points checked by reading the code:

- **Inclusive boundary.** `threshold.activeAt <= value`; 70 and 90 apply at themselves. The scratch mutation to `<` turned the reader tests red.
- **Reader order.** Shape, then number rules, then duplicate, then the settings path's own `check`, then the warn, drop, sort and cap, so a fifth threshold at 101 is still checked and its fault keeps position 5.
- **Placement of the over-four warning.** It is pushed after `configured.set`, so a later rejection of the document discards it, and a refused provided instrument never carries it.
- **Provided path without `bar`.** It refuses `thresholds` and `fill` as `option-without-bar` at registration. A document that writes either under a provided name without the opt-in is refused by the existing unknown-key rule.
- **Defaults and the shared state.** The defaults reach a provided bar that did not opt in, because they are the list in force whenever `thresholds` is absent. The state is cached per sample object, so every placement of an instrument sees one reading.

## Coherence

### Design adherence

The Contracts section, DEC-1 to DEC-14 and the module placement are followed:

- **DEC-1, DEC-2, DEC-5, DEC-11:** `thresholds.ts` is pure, imports nothing of the package, and exports exactly `DEFAULT_THRESHOLDS`, `layerThreshold`, `readThresholds` and `stateAt`.
- **DEC-3:** `drawBar(barWidth, percent, style, fill)` draws what it is handed.
- **DEC-4, DEC-6, DEC-7, DEC-8:**
  - States are bound at bind time.
  - There is one slot per bound instrument.
  - `fills` is a function of the sample.
  - `readsBar` is decided once.
- **DEC-9:** `BoundInstrument` is not exported, `topLevelFills` is read only by `containProvided`, and the `fills` catch records before the `render` catch.
- **DEC-12, DEC-13:** the `option-without-bar` kind and sentence, and the declaration-driven `BAR_OPTIONS`.
- **DEC-14:** `validateStyle` takes the option name, and the place phrase is composed once and not exported (so the `configuration.ts` export pin is unchanged).
- **DEC-15 and the docs pass:** ADR 0022 is written, and ADRs 0007, 0009 and 0020 carry the amendment sentences. `ARCHITECTURE.md`, `AGENTS.md`, `docs/configuration.md`, `docs/formats.md`, `docs/instruments.md` and `docs/extension-authors.md` are updated.
- **Published contract:** only the option names widen (`instrument-contract.ts`, a type-only change). `package.json` and the CI pin are untouched, as designed.

### Code pattern consistency

Consistent with project patterns:

- Erasable TypeScript only, and `.ts` import extensions.
- A pure source file with named exports.
- Pins updated in `tests/jefferson.test.ts`.
- The "reset before a pad" and "measure columns" traps are not touched.

## Issues by priority

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. **Proposal wording disagrees with what was built (fixture).** `proposal.md` (Impact) says `tests/fixtures/sample-provider/provider.mts` "gains an instrument that opts in". The implementation, as the file map and 3.4 intend, changes the existing `progress` instrument's `options` and adds no instrument. Recommendation: correct the proposal's sentence to "an existing instrument opts in", so the archived artifacts agree with the diff.
2. **Stale lead-in sentence in `docs/instruments.md`.** The Options section still opens "Every instrument takes three options" (line 29), then adds `thresholds` and `fill` for `context` further down. The paragraph after the table makes it true, but the opening claim is no longer literally so. Recommendation: reword to "Every instrument takes three options, and one that draws a bar takes two more", or keep the three-option table and say so in the heading sentence.
3. **Defaults bound for instruments that can never use them.** `instrumentBindings` binds `DEFAULT_THRESHOLDS` into two extra states, with a format parse each, for every instrument including those with no `bar` (`model`, `notice` and the others). `readsBar` is false for them, so the states are never chosen. This costs bind time only and is not a defect. Recommendation: consider skipping the default states when `declaration.bar === undefined` (`instrument-binding.ts`, the `honoured` map), if the "at most five states" invariant should also mean none for barless instruments.

## Notes and limits

- Task 4.2 asks for any mutation that stays green to be recorded in the change's notes. No such note was found, and the supplied materials do not say whether any M1–M24 stayed green. This run re-ran two mutations only (M3, and an unlisted always-read variant of M13), so it did not verify the rest of the M-list.
- The owner's live observation (5.1) is not something this pass can do.

## Final assessment

No critical issues or warnings. 3 suggestions to consider. Every check ran and none was skipped. The only open task is 5.1, the owner's live observation, as expected, so the change is ready for archive once the owner ticks 5.1 with his own words (with the noted improvements).
