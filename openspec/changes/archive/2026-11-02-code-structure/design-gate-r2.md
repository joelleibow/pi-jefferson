# Design gate (round 2) — `code-structure`

Reviewer: Michael. Gate: design (PL4). Verdict: **approve**.

## What I re-checked

- Re-read `design.md`, `specs/extension-source-layout/spec.md`, and `proposal.md` as revised.
- Re-checked each of the three required changes from `design-gate.md` against the text that now
  stands, and re-confirmed the blocking finding's second half — that requirements 6 and 8 can
  both hold as they now read.
- Layout ruling remains closed; not re-opened. No style findings raised.

## 1. Blocking finding — requirement 6 describes the invariant, and 6 & 8 now agree

**Resolved.** `spec.md`'s "The published file set is deliberate" now keeps the first sentence,
"The tarball MUST contain exactly the set named by `package.json` `files` plus npm's mandatory
files," and rewrites the CI clause to invariant terms: "CI MUST assert that set by invariant —
the allowed roots, the declared entry's presence, the absence of any test file, and the load
root's value — and MUST NOT assert an enumerated list, which would need a CI edit per module."
That is exactly the invariant assertion the finding asked for, with the exact-set statement
retained.

D3's guard matches the new clause item for item: allowed roots (the `stray` filter), the declared
entry's presence (`shipped.includes(entry)`), absence of tests (the `*.test.ts` filter), and the
load-root value (`JSON.stringify(declared) !== JSON.stringify(loadRoot)`). Nothing the clause
names is missing from the check.

**Can 6 and 8 both hold?** Yes. Requirement 8 forbids a CI edit for an ordinary module; the
amended requirement 6 no longer mandates the enumerated assertion that made an ordinary module
change CI. The two scenarios reconcile — requirement 6's "An ordinary module is added" and
requirement 8's "An ordinary module" now assert the same behaviour.

**Spec-alignment section.** The prior claim — "No requirement is weakened to fit the shape" — is
gone. The table's requirement-6 row now says the set "is pinned by invariant rather than by a
list that goes stale," and the section adds a paragraph stating plainly: "**Requirement 6 is
amended by this change, not satisfied as originally drafted**," cites the 6-vs-8 contradiction,
and records: "An earlier draft of this table claimed 'no requirement is weakened…' That was
wrong, and the gate was right to refuse it." The finding's requirement to reconcile the record is
met, not papered over.

## 2. Concern 2 — malformed-`pi` risk no longer claims a benign fallback

**Resolved.** The Risk section now states that `readPiManifest` returns `null` only when `pkg.pi`
is *not* an object, and only then does auto-discovery fall back; that if `pi` is an object with a
malformed `extensions` value, `readPiManifest` returns `{}` (truthy), `collectPackageResources`
takes the manifest branch, and "**nothing loads, with no fallback and no diagnostic.**" It
explicitly retracts the earlier claim: "An earlier draft of this design claimed the degradation
was benign; it is not." The mitigation claims only what the manifest pin can deliver — a malformed
value cannot merge — and no longer leans on a fallback that does not exist.

## 3. Concern 3 (optional) — superseded pointer added to `proposal.md`

**Resolved.** Option B's merits now carry a "**Superseded, 2026-11-01**" block that names the
false "stay as they are" CI claim, attributes the correction to the council, and points to
`design.md`'s "Record correction" and `council.md`'s "Ruling amended." A reader of `proposal.md`
alone now meets the correction, not just the false claim.

## Re-adjudication: artifact-check override

Unchanged from round 1 — the override stands. The six findings name
`extensions/jefferson/index.ts` (the post-move entry this change *creates*, migration step 1) and
`extensions/jefferson/rows.ts` (an explicitly hypothetical module used to show D3's guard passes).
No line cites a path that should exist *now* but does not.

## Honest accounting

The D3 "shown red" run remains an honest accounting, not a certificate: labelled synthetic, with
the real `npm pack` repetition handed to the implementation. Nothing in the revisions introduces
a new asserted-not-derived claim.

## Relying on later gates

- **Implementation:** repeat D3 against real `npm pack --dry-run --json`; confirm the tarball is
  `LICENSE, README.md, extensions/jefferson/index.ts, package.json`; confirm the host resolves the
  moved entry.
- **Plan:** nothing here turns on plan structure.
