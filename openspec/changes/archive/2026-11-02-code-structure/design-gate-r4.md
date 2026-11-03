# Design gate (round 4) — `code-structure`

Reviewer: Michael. Gate: design (PL4). Verdict: **approve** — the round-3 blocking finding is
resolved, the remedy broke nothing load-bearing, and every earlier note survives. One non-blocking
concern, a duplicated sentence introduced in the closing note. No layout, no style.

## What I re-checked

Bounded re-review, as scoped. I re-read `design.md` (body plus the closing **Clarification note** and
its **Superseded artifacts** section), and the two artifacts round 3 named — `council.md`'s "Ruling
amended — 2026-11-01, by the owner" and `proposal.md`'s "Superseded, 2026-11-01" block. I did not
re-open the layout ruling and did not re-review anything round 3 approved, except where the remedy
could have made it false. Nothing in the host, the discovery counts, or the guard was touched, so I
did not re-run them.

## 1. The blocking finding — resolved

Round 3 required the record to name the artifacts still carrying the superseded directory
declaration. The new **Superseded artifacts** section names exactly the artifacts round 3 named, and
classifies them correctly:

- "Two are verdicts returned for a shape that no longer stands: the design gate's round-2 verdict
  (`design-gate-r2.md`) and the plan gate's round-3 verdict (`plan-gate-r3.md`)." — the two gate
  verdicts are verdicts for a shape that no longer stands. Correct.
- "Two state the directory as **agreed or adopted**, which is now wrong: `council.md`'s "Ruling
  amended — 2026-11-01, by the owner" ("The agreed shape is B's directory with the load explicitly
  declared", `"pi": { "extensions": ["./extensions/jefferson"] }`), and `proposal.md`'s "Superseded,
  2026-11-01" block." — both named, both correctly described as stating the directory as adopted,
  which is now wrong. Correct.
- It states why the proposal block is a casualty: "The proposal block was the round-1 fix for a
  different error — the CI falsehood — and did not survive this shape change intact, so it names the
  wrong adopted shape." This is the exact drift round 3 identified. Correct.

Both named artifacts really do carry the superseded declaration, verified against source:
`council.md` says "The agreed shape is B's directory with the load explicitly declared" with the
directory manifest value and `extensions/jefferson/index.ts` as the entry; `proposal.md`'s block says
"The option as finally adopted is the amended ruling, which is B's directory shape".

**The unqualified "no reader has to reconcile two versions" claim is gone.** No occurrence of
`reconcile two versions` (or `no reader`) remains in `design.md`. It is replaced by a qualified,
honest statement: the note opens "Four artifacts other than the design still carry the earlier
directory declaration, and they are named in **Superseded artifacts** below; read that before
believing any of them." The reader is now told there *are* artifacts to reconcile, and where they
are. The count is consistent: four named (two verdicts + council + proposal).

## 2. Did the fix break something nearby? — No

The remedy touched only the closing note. Its other statements still hold:

- **Attribution.** "The design read *"here's the extension directory you expect"* as a declaration of
  the **directory** … The owner corrected that reading." The earlier reading is still attributed to
  the design, not to the owner. Holds.
- **The three counts.** (1) Explicitness increases — the manifest names the file, not a directory
  resolved through `index.ts`; (2) the working-parts directory gets one rule with no exception — the
  entry is no longer inside it, so membership carries no `index.ts` carve-out; (3) no file moves, so
  the test import path is untouched. All three remain true of the settled shape. Hold.
- **The cost paragraph.** One convention (`./jefferson/rows.ts`), `files` and `tsconfig.json`
  `include` unchanged, the guard's pinned entry value `extensions/jefferson.ts`. Unchanged and
  consistent with D1/D3/D6. Holds.
- **The gate paragraph.** "D1, D2's header target, and D6 all change from the drafts the gates read,
  so the design gate re-runs against this revision and the plan's steps follow it." Consistent with
  this round existing. Holds — subject to the duplication noted below.

Nothing in the note is now inconsistent.

## 3. Do the earlier notes still stand? — Yes

The remedy touches none of them. They survive unchanged:

- **Host mechanics.** `readPiManifest` null-vs-`{}`, the manifest branch returning before the
  `extensions/` scan, `collectFilesFromPaths`/`statSync`, `resolveExtensionEntries` called only with
  a directory — reproduced in round 3, untouched here.
- **Discovery counts.** `count: 1` with strays present, `count: 0` with the `pi` field removed —
  untouched.
- **The guard against real `npm pack` output.** Round 3 ran D3 verbatim against real output; the
  design still states that result and now adds the real-module case. Untouched by this remedy.
- **Artifact-check override.** `extensions/` holds only `jefferson.ts`; there is still no
  `extensions/jefferson/` and no `index.ts`; `extensions/jefferson/rows.ts` remains the hypothetical
  module. Override upheld.

## Concern (non-blocking) — a duplicated sentence in the Gates paragraph

The **Gates** paragraph now closes with the same clause twice:

> "Nothing is implemented, so this is the cheapest moment the change could be made. Nothing is
> implemented, so this is the cheapest moment the change could be made."

The second copy is truncated by the file end and says nothing the first does not. It is an editing
artifact, not a falsehood — every statement in the paragraph remains true — so it does not block the
gate. Remove the duplicated clause so the paragraph ends once.

## Dispositions

- **Round 3 blocking finding (record still carried the superseded shape as agreed):** resolved.
- Round 1's blocking finding (req 6 vs req 8) and round 1's malformed-`pi` concern: untouched by the
  remedy, still survive as previously recorded.

## Relying on later gates

Implementation: repeat D3 against real `npm pack` and the 4.1 discovery command on the real tree with
the rewritten header. Plan: `tasks.md` agrees with the design step for step; nothing here turns on
plan structure.
