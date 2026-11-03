# Plan gate round 2 (PL7) — `statusline-skeleton`

Reviewer: Michael (retained thread, resumed). Gate: plan (PL7), bounded re-review after my
`changes_requested` verdict in `plan-gate.md`. Verdict: **approve** — the blocking finding is
resolved, every numbered concern is resolved, and the fix broke nothing nearby. One residual
bookkeeping nit noted below (non-blocking). I did not re-open the owner's rulings or the approved
design, and I raise no style preferences.

## 1. The blocking finding — resolved, and reachable in the states plan order

Check against the revised `Sequencing`, 3.1, and 3.2, line by line:

- **Sequencing 2** now reads: "3.1 before 3.2–3.5. 3.1 rewrites the entry to register a
  `session_start` handler via `pi.on`; with the test fake still lacking `on` the existing suite
  throws (the red observed in 3.1). 3.2 extends the fake with an `on` recorder so the suite passes
  again."
- **3.1** is the entry rewrite, and its red is now the entry rewrite itself: the fake still lacks
  `on` "(`3.2 has not run`)", so `node --test tests/jefferson.test.ts` throws
  `TypeError: pi.on is not a function` on both existing tests.
- **3.2** extends the fake with the `on` recorder, and its error-handling line says "the red
  belongs to 3.1 and is already measured there."

This is a real reordering, not a rewording: the entry-rewrite (which introduces `pi.on`) now runs
**before** the fake gains `on`, exactly the order that makes the `TypeError` reachable. Walking the
plan as written — group 1 and 2, then 3.1 (entry rewrite → run tests → `TypeError`), then 3.2
(fake gains `on` → green) — produces the claimed red. The sequencing section, 3.1, and 3.2 now
agree on where the red lives. **Resolved.**

## 2. Each numbered concern

1. **Green-only test steps and gates — resolved.** 1.2 gained a red (make normalization ignore the
   top-level shape → "a top-level row object normalizes to one row" fails); 1.8 gained a red (push
   the constant string instead of a `Cell` → the cell-model test fails); 2.6 gained a red
   (`createFooter` returns `rows.slice(0, 2)` → the footer test fails with two lines); 3.5 gained a
   red (export a `registerCellContent(...)` from `row-renderer.ts` → the export-surface test fails).
   The header now names 4.1, 4.2, 4.3, and 4.6 as **green-only by design** with a stated reason,
   and each of those steps repeats the reason in its Shape line. The standard no longer
   over-claims a red for every check.
2. **4.5's red is now measured — resolved.** 4.5 no longer asserts "CI's guard rejects"; it builds
   the guard's two inputs (`shipping.json` from `pnpm pack --dry-run --json`, `packed-package.json`
   from the real tarball) and executes the guard `node -e` block from `.github/workflows/ci.yml`
   with `"$tmp/shipping.json" "$tmp/packed-package.json"`. I read the workflow step: the guard
   reads `process.argv[1]`/`process.argv[2]` exactly as passed, and `node -e '…' a b` yields
   `argv[1]=a`, `argv[2]=b`, so the invocation is executable as written. The expected
   `exit 1` with `test files shipped: extensions/jefferson/scratch.test.ts` is the guard's real
   `console.error` string; the post-removal `exit 0` is the second half. The rejection is measured.
3. **D1 entry-level trust wiring — resolved.** 3.3 now seeds an agent-dir `pi-jefferson.json` and a
   distinguishable project `ctx.cwd/<CONFIG_DIR_NAME>/pi-jefferson.json`, gives the fake `ctx` an
   explicit `isProjectTrusted()` (default `false`), and asserts the captured factory renders the
   project's two rows when trusted and the agent/default rows when not — with its own red
   ("pass `projectTrusted: true` unconditionally → the untrusted end-to-end test fails"). The entry
   call-through is now observed, not merely the reader's boolean.
4. **Architecture-table mapping — resolved.** The D5 row now reads "1.1, 1.5, 1.8" and the D3 row
   reads "1.3, 3.4" (1.8 removed). Step 1.8 sits under D5, matching its own text.
5. **1.6's flaky red — resolved.** The red now uses a module-level counter (`let n = 0; …
   row-${index}-${n++}`) so two reads in the same millisecond still differ, and the step text
   states the test fails "on the second read (not merely when the millisecond happens to change)."

All five concerns: **resolved.**

## 3. Did the fix break something nearby?

- **Coverage survived.** Every decision D1–D10 still has steps: D1 (1.1, 1.7, 3.1), D2 (1.2, 1.3),
  D3 (1.3, 3.4), D4 (1.4, 1.5), D5 (1.1, 1.5, 1.8), D6 (1.6), D7 (2.1, 2.2, 2.3, 2.6, 2.7),
  D8 (2.1, 3.1, 3.3), D9 (3.1, 3.3), D10 (2.4, 2.5). Every ADDED requirement in
  `specs/statusline/spec.md` still maps to a step in the Goal table, and the renumbered references
  there (declared-rows → 3.1, 3.4; extension-owned → 1.7, 3.1) were updated with the rewrite.
- **Scope survived.** Still no module/contribution interface (3.5), no configuration descriptors
  (1.5), and no manifest/`tsconfig`/CI edit — Scope Out, the constraints section, 4.2 (scoped
  `git diff` empty), and 4.5 (new modules ship under the existing `extensions/` root; `files`
  unchanged) all stand. Requirement 8's ordinary-module case is intact: the plan needs no CI edit.
- **Existing suite survived.** 3.1/3.2 keep `tests/jefferson.test.ts` passing and restate what the
  two tests cover after the change.

One residual bookkeeping nit, not introduced by the fix and not affecting coverage: the
Architecture table's D8 row still lists "2.1, 3.3" and omits **3.1**, which is now the step where
the entry injects the helpers (D9's row was updated to include 3.1, D8's was not). The steps
exist and cover D8; only the table reference is stale. Flagged as a concern below.

## Concerns (non-blocking)

1. **Architecture-table D8 reference is stale** — the D8 "Built by" cell should include 3.1 (the
   entry rewrite that performs the injection), as D9's row already does.

## Verdict

**approve.** The blocking finding is resolved by a real reorder that makes the `pi.on` red reachable
in the order the plan states; all five concerns are resolved; coverage of D1–D10 and every ADDED
requirement survived; the change remains confined to this change's scope with no manifest,
`tsconfig`, or CI edit. The single residual finding is a stale table reference that does not affect
coverage or executability.
