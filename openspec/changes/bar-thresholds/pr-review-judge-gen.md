# PR review: bar-thresholds (PR #26)

**Reviewed head commit:** `94e4630328fa9a09bfd1cd8a7d0a2317d8eddc80` (`gh pr view --json headRefOid` matched the local checkout at the start and the end of the review).

**Load I assumed:** one person's terminal footer. It re-renders a few times a second with a handful of cells. There are no many-user or many-process concerns, so I judged speed against "work done on every frame".

**What I ran:** `pnpm typecheck` (clean) and `pnpm test` (648 pass, 0 fail).

**What I read:** the PR description and diff, `proposal.md`, the three spec deltas (`statusline`, `instrument-registration`, `extension-source-layout`), and the code the diff touches: `thresholds.ts`, `configuration.ts`, `instrument-binding.ts`, `instrument.ts`, `format.ts`, `bar.ts`, `row-renderer.ts`, `registration-listener.ts`, `faults.ts`, plus the docs diff. I did not read `design.md`, `tasks.md`, `council*.md`, the review files, `michael-*` or the research files.

## What this change does

A user can now say at which percentages a bar changes state (`thresholds`) and what changes (`format`, `label`, `style`, `fill`). A new `fill` option styles only the bar's filled part. The old 70 and 90 colour rule becomes the default list. It now applies at `>=` instead of strict `>`. Extension authors opt in by naming `thresholds` and/or `fill` in `options` on an instrument that declares `bar`.

I traced the flow from the document, through the threshold reader, into the bound states, and out to the drawing. I held it against every requirement in the three spec deltas. I found no requirement that is missed, wrong or exceeded. The edge cases the specs call out all behave as written:

- `-0` counts as the threshold at 0.
- `1e400` is refused as not whole.
- A duplicate above 100 is refused.
- A fault in a threshold that would be dropped is still found.
- A fault's position is the written position, not the sorted one.
- The over-four sentence is pushed only for settings that were accepted.
- An unknown reading counts as 0, and a negative one sits below every threshold.
- The raw reading is compared, not the rounded `$percent` text.
- The bar is read once per sample, and a throw while choosing a state costs one entry, never the row.

The tests pin these cases.

I found nothing that must be fixed. The findings below are small.

## Must fix

None.

## Should fix

None.

## Nice to have

1. **Every instrument binds the two default states, even ones with no bar** (`extensions/jefferson/components/instruments/instrument-binding.ts:L386-389`)
   - **What this is:** When an instrument is bound, each honoured threshold is bound as a full state of its own: segments, label, composed formats, `fills`. If the document wrote no list, the 70 and 90 defaults stand in.
   - **Problem:** The fallback `thresholds ?? DEFAULT_THRESHOLDS` runs for every declaration, including `model`, `thinking` and the other instruments that have no `bar`. Each of those binds three states instead of one. For a composed instrument that also parses every kind's text three times. `readsBar` is false for them, so the extra states can never be chosen. Nothing breaks, because it happens once at bind time. It is dead work, and it makes the "at most five bound states" rule say less than it seems to.
   - **Fix:** Use an empty list when the declaration has no bar: `const list = thresholds ?? (declaration.bar === undefined ? [] : DEFAULT_THRESHOLDS);`. Use `list` in both places in that function. Two lines change.
   - **If we skip it:** A little wasted work at startup for every non-bar instrument. A reader may also wonder why `model` has states at 70 and 90.

2. **`resolveFormat` silently draws nothing if the caller forgets its new `bar` argument** (`extensions/jefferson/format.ts:L264-L311`)
   - **What this is:** The new eighth parameter, `bar`, is optional. It carries the reading and the fill for the state in force.
   - **Problem:** If a format names `$bar` and the caller leaves `bar` out, `bar?.reading` is `undefined`. The function then returns `""` as if the datum were unknown, so the instrument blanks with no error. There is only one caller today (`instrument-binding.ts:L446`), and it passes the argument whenever the state's format names `$bar`. A second caller added later would get a blank cell with nothing to point at the cause.
   - **Fix:** Throw a plain `Error` when a `$bar` segment is present and `bar === undefined`. The repo's own rule is "strict and loud at contract boundaries". Alternatively, make the parameter required and let the caller pass `undefined` explicitly.
   - **If we skip it:** A future caller's mistake looks like a data problem.

3. **A dead field on the reader's "refused" result** (`extensions/jefferson/thresholds.ts:L50`, `L108`)
   - **What this is:** `ThresholdsRead` has a `refused` arm, `{ refused, position }`.
   - **Problem:** No caller reads `position`. Both settings paths take only `read.refused`. It is a speculative field.
   - **Fix:** Drop `position` from the type and from the `return` on line 108.
   - **If we skip it:** One unused field that looks meaningful.

4. **The reader's fault wording is written twice** (`extensions/jefferson/configuration.ts:L152-L161` and `L390-L407`)
   - **What this is:** `thresholdFaultSentence` words the reader's four faults for Jefferson's own instruments. `providedThresholdFault` words them again for provided ones.
   - **Problem:** Three of the four sentences are the same text, with the same place phrase and the same `activeAt` wording. The provided version only adds `; it renders blank` and a different first sentence for "not a list". They must change together. The PR says the threshold rules are "written once for both origins". The wording is a place where that is not yet true.
   - **Fix:** Build the provided version from the first one. For the three shared kinds, return `{ kind: fault.kind, part: thresholdFaultSentence(quoted, fault) + consequence }`. Keep a one-line special case for `settings-thresholds`. Roughly 10 lines go.
   - **If we skip it:** Someone rewords one path's sentence and the other drifts.

   The same shape of duplication sits between `ownValues` and the inner `values` of `checkProvidedSettings`: both parse format, label, style, fill and formats. That duplication predates this PR, but the PR added `fill` to both. I am not asking for a merge here. It is the larger cleanup this change leaves behind.

## Notes for the author

- The PR description says the OpenSpec change is "archived on this branch before merge". At this head the change is still under `openspec/changes/bar-thresholds/`, and the spec deltas have not been folded into `openspec/specs`. That is only true once the archive commit lands. Check that it does before merging.
- The task 5.1 live check in pi is listed as outstanding. I cannot judge it from the code. The width reflow when a threshold adds or drops `$bar` (spec "A threshold's format decides whether the instrument fills") is where I would look first in a real footer.

Verdict: Ship. Findings 1 to 4 are optional.
Lean: -14 lines possible.
Not checked: I did not run the feature in a live pi session (task 5.1 is outstanding). I did not read the unchanged parts of `width-plan.ts` and the session store beyond how the sample object is built. I did not compare ADR 0022 and the ARCHITECTURE.md prose line by line against the code.
