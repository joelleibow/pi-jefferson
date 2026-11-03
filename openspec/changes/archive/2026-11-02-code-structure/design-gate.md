# Design gate — `code-structure`

Reviewer: Michael. Gate: design (PL4). Verdict: **changes_requested**.

## What I checked

- Read `design.md`, `specs/extension-source-layout/spec.md`, `council.md` (B ruling and the
  2026-11-01 amendment), `research-eleanor.md`, `research-chidi.md`, `proposal.md`.
- Verified the design's load-bearing host claims against the pinned host,
  `node_modules/@earendil-works/pi-coding-agent@1.4.0`: `collectPackageResources`
  (package-manager.js:1848), `addManifestEntries`/`collectFilesFromManifestEntries` (:1950),
  `collectFilesFromPaths` (:2068), `collectResourceFiles` (:464), `collectAutoExtensionEntries`
  (:408), `resolveExtensionEntries` (:381), `readPiManifest` (pi-manifest.js).
- Ran the D3 guard's decision logic verbatim against synthetic tarball/manifest inputs.

## Verdict against the eight requirements

| # | Requirement | Satisfied | Note |
|---|---|---|---|
| 1 | One host-loaded entry per extension | yes | Manifest branch early-returns; `resolveExtensionEntries` yields `index.ts` before the `readdirSync`. Verified in source. |
| 2 | The load root is singular and stated | yes | `pi.extensions` is the one mechanism; the `pi` field makes discovery take the manifest branch, so `extensions/` is not scanned. Verified. |
| 3 | Tests never occupy a loadable or shipped path | yes | `tests/` is outside discovery and `files`; guard refuses any shipped `*.test.ts`. |
| 4 | Host packages imported only at the load boundary | yes | `peerDependencies` unchanged; D4 states the rule and `index.ts` carries only `import type`. |
| 5 | Every shipped source file is typechecked and erasable | yes | `extensions/**/*.ts` matches the deeper path; no build step. Verified against `tsconfig.json`. |
| 6 | The published file set is deliberate | **no** | The requirement mandates "CI MUST assert that exact set." D3 replaces the exact-set assertion with a roots+entry+no-tests+manifest invariant. The design does not assert the exact set, and `spec.md` is not updated to say otherwise. |
| 7 | Responsibility is inferable from path | yes | D4 states membership and the dependency rule; the `index.ts` naming weakness is surfaced in D2, not hidden. |
| 8 | Growth is a named change | yes | The invariant check permits ordinary modules; a new root/entry/manifest value is a named change. |

## Findings

### 1. Blocking — requirement 6 is changed, not satisfied, and the spec is not reconciled

`spec.md` ("The published file set is deliberate") states the tarball "MUST contain exactly the
set named by `package.json` `files` plus npm's mandatory files, **and CI MUST assert that exact
set**." D3 replaces that step with a permissive invariant check and then claims, in the alignment
table, "No requirement is weakened to fit the shape." It is weakened — the exact-set assertion is
gone. The design even argues the old check is a defect (it fails on every ordinary module), which
makes the resolution reasonable, and the owner's amendment ("the CI check moves off a static file
list") mandates it. But then requirement 6's text is now wrong and must change in the same
change. It does not. As shipped, this change merges a spec whose requirement 6 and requirement 8
cannot both hold, plus a design that asserts otherwise.

Required change: update requirement 6 in `spec.md` so its CI clause describes the invariant
assertion (keeping "the tarball contains exactly the set named by `files`"), or record the
amendment explicitly. Do not silently keep both texts.

### 2. Concern — the "malformed `pi` field" fallback claim is contradicted by the host

Risks says: "If a `pi` field were later malformed, `readPiManifest` returns null and the host
falls back to auto-discovery, which still resolves `extensions/jefferson/index.ts`." In
`pi-manifest.js`, `readPiManifest` returns null only when `pkg.pi` is **not an object**. If
`pi` is an object with a malformed `extensions` value (e.g. a string, or an array with non-strings),
it returns `{}` — truthy — and `collectPackageResources` takes the manifest branch and loads
nothing, with no fallback. That is precisely the silent no-load the design guards against only in
CI. The claim is asserted, not derived, and overstates benign degradation.

Required change: scope or correct the claim; state that a malformed-but-object `pi` disables the
extension silently.

### 3. Concern — the record correction is adequate but leaves `proposal.md` misleading

`proposal.md`'s option-B merits still assert the CI assertion "stays as is." The council's
accepted feedback was that "`proposal.md` gets corrected in the design," and Context does record
the correction. That satisfies the inherited decision, so this is not a gate blocker — but a
reader of `proposal.md` alone still meets the false claim. Optional: add a one-line superseded
pointer in `proposal.md`.

## Adjudication: artifact-check override

**The override is correct, and I do not challenge it.** The six findings (design.md:144, 204, 253,
261, 295, 308) flag `extensions/jefferson/index.ts` — the post-move entry this change *creates*
(migration step 1) — and `extensions/jefferson/rows.ts` — an explicitly hypothetical "ordinary
module" used to show the guard passes. Both are absent because the change has not been implemented
or because they are illustrative; a checker with no concept of "a path a change creates" cannot
represent either. No line cites a path that should exist *now* but does not.

## Honest accounting / asserted-not-derived

- The D3 "shown red" run is an **honest accounting**, not a certificate: it is labelled synthetic
  and explicitly hands the real `npm pack` repetition to the implementation. I reproduced its
  logic and all seven cases behave as printed.
- `files`/`tsconfig` unchanged, and "a stray file at `extensions/` level cannot load," both
  **derive** from the host source I verified (manifest branch early-return; `files` ships the whole
  subtree; the include glob matches). Only the malformed-pi claim (finding 2) does not.

## Relying on later gates

- Implementation: repeat the guard against real `npm pack --dry-run --json`; confirm the tarball
  is `LICENSE, README.md, extensions/jefferson/index.ts, package.json`; confirm the host actually
  loads the moved entry.
- Plan: nothing here turns on plan structure.
