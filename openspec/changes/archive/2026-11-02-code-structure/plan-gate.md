# Plan gate — `code-structure`

Reviewer: Michael. Gate: plan (PL7). Verdict: **changes_requested**.

## What I checked

Read `tasks.md`, `design.md`, `specs/extension-source-layout/spec.md`, `design-gate.md`,
`design-gate-r2.md`, `council.md`, and `plan-creation`'s Quality Bar. Then I ran the claims
against the pinned host, `@earendil-works/pi-coding-agent@1.4.0`, in a post-move scratch tree:
`discoverAndLoadExtensions` on the moved package, the `dist/core/pi-manifest.js` import path,
D3's guard against synthetic tarball sets, and `pi -e` on the extension. Findings below are
executed, not reasoned.

## Quality Bar walk (blocking list)

The plan-level sections the bar makes blocking — **Goal** as observable acceptance criteria,
**Scope Out**, **Sequencing**, **Architecture** with every component mapped, **Boyscouting** —
do not appear in `tasks.md`, which is a checkbox list. The per-step shape (failing `Test`,
`Boundary cases`, `Impl`, `Logging`, `Error handling`) is likewise absent. This is a genuine
mismatch: most of those criteria are *n/a* for a pure layout change (no use cases, adapters,
or DI), and their substance for this change lives in `design.md`/`proposal.md`/`spec.md`. But
if the bar governs this document literally, the plan-level items are unmet. I treat this as a
**concern** (C2) rather than the blocker, and judge the substantive per-step verification below.

## Q1 — host internals vs. an end-to-end check

Two different things, and the plan gets both wrong.

- **5.1 (`discoverAndLoadExtensions`) is a public export**, not a deep internal — it is exported
  from the package's `dist/index.js` alongside `defineTool`. So the "internal API" framing is
  too strong. But the step's *assertion* is false: post-move I ran
  `discoverAndLoadExtensions([root], root)` and the single extension's `path`/`resolvedPath` is
  the **directory** `extensions/jefferson`, not `extensions/jefferson/index.ts`. The API returns
  the manifest-declared directory; jiti resolves `index.ts` internally. The step's check would
  fail as written. It **is** stronger than "resolution" — the factory executes and `/jefferson`
  registers — but the step asserts resolution to a path the API never returns.
- **5.1 is also non-hermetic.** Called with two arguments, `agentDir` defaults to the operator's
  real `~/.pi/agent`; in this environment that loaded four unrelated global extensions, so
  "exactly one extension" is false on a real machine. It needs an isolated third argument.
- **3.3 is a true internal and cannot run.** `import("@earendil-works/pi-coding-agent/dist/core/pi-manifest.js")`
  is refused — `ERR_PACKAGE_PATH_NOT_EXPORTED`; the `exports` map exposes only `.` and
  `./rpc-entry`, and `readPiManifest` is not exported anywhere. The step must read the file by
  absolute path (fragile) or drop the route.
- **3.3 also proves less than it says.** `readPiManifest` returning the array does not show "the
  host takes the manifest branch, so `extensions/` is not auto-scanned" — that behaviour is
  `collectPackageResources`'s, a different function.
- **The cheap end-to-end check exists and is unused.** `pi -e <path> … -p` ran RC 0 against the
  moved entry (a broken entry yields a load diagnostic on stderr). Either route is defensible;
  what is not defensible is a route whose assertion is wrong and whose environment is unpinned.
  Fix 5.1 (assert on the loaded extension's registered command set, isolate `agentDir`) **or**
  replace it with the `pi -e` end-to-end and say what red looks like.

## Q2 — 4.3's red run

Adequately specified in intent, unsafe as written.

- **Half the red input cannot fire.** 4.3 offers "a real stray file at `extensions/`". The guard
  allows anything under `extensions/`; I ran it and a stray `extensions/notes.ts` / `notes.md`
  **passes**. Only the `files`-array edit (`"tests"`) turns it red. A step whose value is proving
  the guard can catch a mistake must name an input that actually diverges.
- **The revert is not verifiedly complete.** Green-on-re-run covers the `files` case, but nothing
  asserts `git status`/`git diff` is clean, and a leftover stray file at `extensions/` would slip
  past the guard, `typecheck`, and `test` alike — CI would not catch it. Add an explicit
  clean-tree check (and prefer the `files`-edit input, which CI *does* catch).

## Q3 — coverage of the migration plan and the eight requirements

- **Migration plan:** all six steps are present (1.1, 2.1/2.2, 1.2, 3.1, 4.1, 4.2/5.2). No gap.
- **3.2 ("`files`/`include`/`peerDependencies` unchanged") is strong enough.** `git diff
  package.json tsconfig.json` showing only the added `pi` field is a real observation, not a
  restatement; the literal array checks are correct against the tree.
- **2.1/2.2 do not exceed a restatement.** They paraphrase D2/D4, and D2's block is itself
  abbreviated (`...`), so there is no exact text to match; "verify the header matches D2/D4" is
  reading, not a check. A doc comment is prose and cannot be mutation-tested, so this is
  acceptable — but if verification is wanted, quote the exact header string once.
- **One requirement is present but unverifiable as written.** Requirement 8's "An ordinary module
  is added" scenario — the whole point of D3, and the council's fix — is never shown green on a
  real input. 4.2 packs a singleton file set; the permissive branch is exercised only by the
  design's synthetic run. The bar's "Build the Divergence the Test Needs" asks for the real input.

## Adjudication: artifact-check override

**The override is correct.** Lines 27 (2.1) and 76 (5.1) cite `extensions/jefferson/index.ts`,
the post-move entry this change *creates* via 1.1's `git mv`. It is absent because the change is
unimplemented; the checker has no concept of a path a change creates. No line cites a path that
should exist now.

## Findings

1. **Blocking — 5.1's assertion is false and non-hermetic.** See Q1. Rewrite to assert on the
   loaded extension's commands with an isolated `agentDir`, or use `pi -e`.
2. **Blocking — 3.3 cannot run and proves the wrong function.** See Q1.
3. **Blocking — 4.3's second red input cannot fire, and the revert is unverified.** See Q2.
4. **Concern — requirement 8's ordinary-module-green is never shown on a real input.**
5. **Concern — the bar's plan-level sections are absent from `tasks.md`** (C2).

## Relied-on, not proven here

The D3 guard's *logic* is sound for the inputs that reach it (I reproduced its cases). `pi -e` is
a usable end-to-end but I did not confirm `/jefferson` registration non-interactively; the plan
should state the observable that red/green turns on.
