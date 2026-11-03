# Plan gate (PL7) — `statusline-skeleton`

Reviewer: Michael (retained thread, resumed). Gate: plan (PL7). Verdict: **changes_requested** — one
blocking finding (a step-ordering contradiction that makes a claimed red unobservable as written),
plus concerns about green-only verifications and one certificate red. I did not re-open the owner's
rulings or the approved design, and I raise no style preferences.

## What I checked

Read `tasks.md` against the approved `design.md` (D1–D10), `specs/statusline/spec.md`, `council.md`,
and `openspec/specs/extension-source-layout/spec.md`; then verified the plan's host claims against the
pinned host in `node_modules` (`ExtensionFactory` signature, `session_start` reasons, `notify` types,
`getAgentDir` env behavior, the exported layout).

## 1. Coverage — every decision has a step

| Decision | Step(s) | Present |
| --- | --- | --- |
| D1 config source / trust gate / document precedence | 1.1, 1.7, 3.2 | yes |
| D2 envelope (top-level row vs `rows` key; both rejected) | 1.2, 1.3 | yes |
| D3 default row for absent/empty/rejected; rejected warns | 1.3, 3.4 | yes |
| D4 ceiling clamps; below 1 / non-integer / non-number rejects | 1.4, 1.5 | yes |
| D5 cell-shaped internal model, descriptors permitted not built | 1.1, 1.5, 1.8 | yes |
| D6 deterministic id synthesis; collisions reject | 1.6 | yes |
| D7 `floor(W/N)` per render, remainder right edge, `gap = 0` case | 2.1, 2.2, 2.3, 2.6, 2.7 | yes |
| D8 width helpers injected from the entry | 2.1, 3.2 | yes |
| D9 footer install TUI-guarded, re-installed on `session_start` | 3.2, 3.3 | yes |
| D10 cells single-line truncate and pad themselves | 2.4, 2.5 | yes |

No decision is omitted. One bookkeeping error: the Architecture table lists step 1.8 (the cell-model
test, labeled "D5" in its own text) under **D3** and omits it from D5 — see Concern 4.

## 2. Honest verification

Most steps are exemplary: an explicit command, an explicit expected observation, and a red run that
mutates the module and names the specific failing test (1.3, 1.4, 1.5, 1.6, 1.7, 2.2, 2.3, 2.4, 2.5,
2.7, 3.3, 3.4, 4.4). The reds are real mutations, not green-by-assertion.

Two gaps against the plan's own header standard ("every check that can fail is paired with a red run
that is shown to fail"):

- **Green-only test steps.** 1.2 (envelope), 1.8 (cell model), 2.6 (footer), and 3.5 (export surface)
  add tests over an already-written module and never show a red. These checks can fail; per the plan's
  standard they owe a mutation red (delete the normalization; make `cells` non-`Cell`; drop the third
  row; add a registration hook). See Concern 2.
- **Gate steps are green-only** (4.1 typecheck, 4.2 read-back, 4.3 suite tally, 4.6 validator). Reds
  are not expected here — but the header's absolute claim is not true of them; the header should be
  qualified. See Concern 2.
- **4.5 red is partly a certificate.** The measured part is that `extensions/jefferson/scratch.test.ts`
  appears in the pack list; the claim "which CI's guard rejects" is asserted, not measured — the guard
  script is never run. See Concern 3.

## 3. Clean-tree scope

Every cleanliness assertion is scoped to what the step touches, not the whole repository:
1.1 (`-- extensions/jefferson` → only `?? extensions/jefferson/`), 1.7 (per-file shasum), 3.3
(`-- tests/jefferson.test.ts`), 4.2 (`git diff package.json tsconfig.json .github/workflows/ci.yml`),
4.5 (`-- extensions/jefferson/scratch.test.ts` → nothing). The two reds that edit the tree (4.4, 4.5)
run in a throwaway copy or remove their scratch. No whole-repository cleanliness assertion is present.
Held: **yes.**

## 4. The reconciliation the plan itself raises

Correct, and not papered over. The plan records (revision note, 3.2) that `ExtensionFactory` receives
no `ctx`, so the install lives in the `pi.on("session_start", …)` handler, where `reason: "startup"`
covers initial load and `"reload"` covers `/reload`. This matches my PL4 concern 1. Verified against
the pinned host: `SessionStartEvent.reason` is `"startup" | "reload" | "new" | "resume" | "fork"`
(`types.d.ts:578`), so the design's "at load and on every `session_start`" collapses to the single
session_start hook with the same observable behavior. D9's requirement — TUI-guarded and re-installed
on every `session_start` — is satisfied: 3.3 invokes the handler with `mode: "tui"` and with
`mode: "print"` (setFooter must not be called), and invokes it twice with `"tui"` (startup then reload)
asserting two `setFooter` calls. Held: **yes**, and the wording issue is resolved rather than hidden.

## 5. Scope

Stays inside the change. No module/contribution interface: 3.5 asserts the entry's exported keys are
exactly `["VERSION", "default"]`. No configuration descriptors: 1.5 rejects a descriptor array. No
manifest/`tsconfig`/CI edits: Scope Out, the constraints section, 4.2 (scoped `git diff` empty), and
4.5 (new modules ship under the existing `extensions/` root; `files` unchanged). Requirement 8's
ordinary-module case holds — the plan adds two modules under `extensions/jefferson/` and requires **no
CI edit**. Held: **yes.**

## 6. The existing suite

3.1 extends the fake `ExtensionAPI` with an `on` recorder and states what the two existing tests cover
after the change: "registers exactly one command" → the command map is still exactly `["jefferson"]`;
"the alpha announces that it is a name claim and nothing more" → the `/jefferson` notify text and
`VERSION === "0.0.0-alpha"` are unchanged. 4.3 runs the full suite expecting the existing two plus the
new files to pass. Held: **yes** — but the order in which 3.1's red is observed is contradictory (the
blocking finding).

## Blocking finding

**Steps 3.1 and 3.2 contradict each other and the Sequencing section on where the `pi.on` red is
observed.** Sequencing says "3.1 before 3.2–3.5." But 3.1 says its red is observed "once the entry
registers a handler (3.2)" and that the failure is "record[ed] ... in 3.2," while 3.2 says the red is
captured "with the fake still lacking `on`" and then "land 3.1's fake change." Following the written
order (add `on` in 3.1, then rewrite the entry in 3.2) yields a fake that **already has `on`**, so the
claimed `TypeError: pi.on is not a function` can never appear. The red is only observable if the entry
is rewritten first — i.e. 3.2 before 3.1 — which the Sequencing section forbids. As written the plan
cannot produce the red it depends on, so this check is a certificate. Required change: choose one
order and make the red's location match it (either rewrite the entry first, observe the `TypeError`,
then add `on`; or delete 3.1's "this step is the red for itself" and capture the red transiently inside
3.2).

## Concerns (non-blocking)

1. **Green-only test steps** (1.2, 1.8, 2.6, 3.5) and green-only gates (4.1, 4.2, 4.3, 4.6) do not
   meet the plan's own header standard. Add a mutation red to the four test steps, or qualify the
   header so it does not claim a red for every check.
2. **4.5's red is partly a certificate** — the CI guard is never executed. Run the guard step from
   `.github/workflows/ci.yml` against the scratch pack so the rejection is measured.
3. **D1's entry-level trust wiring is unobserved.** 1.7 tests the reader given a `projectTrusted`
   boolean; no step asserts the entry passes `ctx.isProjectTrusted()` through (3.3's fake `ctx` trust
   value is unspecified). Set `isProjectTrusted` true/false in 3.3 and assert the project file is
   honored/ignored end to end.
4. **Architecture-table mapping error** — 1.8 is listed under D3 and omitted from D5.
5. **1.6's red is flaky** — `Date.now()` appended per row can be identical across two reads in the
   same millisecond, so the determinism test may spuriously pass. Use a non-repeatable mutation (e.g.
   a module-level counter) so the red is reliable.

## Verdict

**changes_requested.** Coverage is complete (D1–D10 all have steps), clean-tree scope is correctly
scoped throughout, the `session_start` reconciliation is correct and satisfies D9, scope is contained,
and the existing suite is preserved and explained. The plan is blocked by the 3.1/3.2 ordering
contradiction, which makes a claimed red unobservable as written; the concerns above are refinements to
the verification story and one table entry.
