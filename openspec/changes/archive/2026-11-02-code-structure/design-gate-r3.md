# Design gate (round 3) — `code-structure`

Reviewer: Michael. Gate: design (PL4). Verdict: **changes_requested** — one blocking finding, about
the record, not about the layout or any load-bearing claim. The layout ruling is closed and I did not
re-open it. No style findings.

## What I re-checked

Full review, not a bounded re-review. Re-read `design.md`, `spec.md`, `tasks.md`, `council.md`,
`proposal.md`, both research reports, and the two prior gate verdicts; then read the pinned host
(`@earendil-works/pi-coding-agent@1.4.0`: `pi-manifest.js`, `package-manager.js`,
`extensions/loader.js`) and **reproduced every measurement** in a scratch copy.

## Independently reproduced (not taken on trust)

- **Host mechanics.** `readPiManifest` returns `null` only when `pkg.pi` is not an object, and `{}`
  (truthy) when it is an object with a malformed `extensions`; `collectPackageResources` returns from
  the manifest branch and never reaches the `extensions/` scan; `collectFilesFromManifestEntries` does
  `resolve(root, entry)` and `collectFilesFromPaths` pushes a file when `statSync` says file;
  `resolveExtensionEntries` (loader.js) is only ever called with a directory. Properties 1–3 hold as
  written, and the malformed-`pi` risk is real, not overstated.
- **Discovery.** The 4.1 command on a scratch tree carrying only the `pi` field: `count: 1`,
  `resolvedPath: …/extensions/jefferson.ts`, `commands: [ 'jefferson' ]`, `errors: []`; still
  `count: 1` with `extensions/notes.ts` and `extensions/other/index.ts` present; `count: 0` with the
  `pi` field removed.
- **The guard.** D3's script verbatim against real `npm pack --dry-run --json` output:
  `shipping: LICENSE, README.md, extensions/jefferson.ts, package.json`, exit 0; green with a real
  `extensions/jefferson/rows.ts`; red for a stray root file, a dropped entry, shipped tests, a
  malformed manifest string, `[]`, two entries, a wrong path, and an absent `pi`. The proof is real,
  not a certificate, and it admits an ordinary module with no CI edit.
- **Compiler.** `"./jefferson"` from `extensions/jefferson.ts` fails `tsc` with exactly `TS2835`;
  `"./jefferson/rows.ts"` typechecks. The one convention is measured and compiler-enforced.
- **Coverage.** `extensions/**/*.ts` matches the entry and `extensions/jefferson/rows.ts`
  (`tsc --listFiles`); `files: ["extensions", …]` ships the subtree; no file moves, so the test import
  is untouched. The asserted claims survive: `files` and `tsconfig.json` need no change; a stray at
  `extensions/` level cannot load (the manifest branch returns first); the manifest pin does cover the
  silent-failure risk.

## The eight requirements — all satisfied, none weakened

| # | Requirement | Verdict |
|---|---|---|
| 1 | One host-loaded entry per extension | **Yes.** `count: 1` measured with strays present; helper modules are not discoverable. |
| 2 | The load root is singular and stated | **Yes.** One mechanism, `pi.extensions`, pinned by CI; `extensions/` is bypassed, not a second root. |
| 3 | Tests never occupy a loadable or shipped path | **Yes.** `tests/` is outside the allowed roots and `files`; the guard refuses any shipped `*.test.ts`. |
| 4 | Host packages imported only at the load boundary | **Yes**, and *better*: D4's rule now has no `index.ts` carve-out. |
| 5 | Every shipped source file is typechecked and erasable | **Yes.** `extensions/**/*.ts` covers entry and working parts; no build step. |
| 6 | The published file set is deliberate | **Yes.** The guard asserts all four invariants, no enumerated list; req 6 and req 8 no longer collide. |
| 7 | Responsibility is inferable from path | **Yes**, and *better than the superseded shape*: `index.ts` named nothing; `jefferson.ts` beside `jefferson/` carries the inference, and the directory's membership rule has no exception. |
| 8 | Growth is a named change | **Yes.** Verified: a real module under `extensions/jefferson/` leaves `package.json`, `tsconfig.json`, and CI untouched, guard green. |

Nothing is satisfied less well than under the directory declaration. Requirement 7 is the one that
improves, exactly as the design claims.

## Blocking finding — the record still carries the superseded shape as the agreed one

`design.md` states the settled shape plainly in its body, and the clarification note is honest about
the owner's intent: it quotes him, attributes the earlier reading to the design, and says what the
change costs. That part stands.

But the note enumerates only `design-gate-r2.md` and `plan-gate-r3.md` as superseded, and claims "no
reader has to reconcile two versions." Two artifacts still declare the directory shape as **agreed or
adopted**, and neither is named:

- `council.md`, "Ruling amended — 2026-11-01, by the owner": "The agreed shape is B's directory with
  the load explicitly declared", with `"pi": { "extensions": ["./extensions/jefferson"] }` and
  `extensions/jefferson/index.ts` as the entry.
- `proposal.md`'s "Superseded, 2026-11-01" block — which *is* round 1's fix — now says "The option as
  finally adopted is the amended ruling, which is B's directory shape with the load declared in
  `package.json`". That names the wrong adopted shape.

So the round-1 pointer did not survive the shape change intact, and a reader of the change meets two
shapes. The remedy belongs in `design.md`, on the pattern it already uses for `proposal.md`'s CI
falsehood: extend the clarification note (or the Gates paragraph) to name `council.md`'s amended ruling
and `proposal.md`'s superseded block as carrying the superseded directory declaration. One or two
sentences; no layout change. Whether the earlier declaration was a misreading or a re-read is the
owner's to state, and the note reports it as he stated it — it just has to cover the artifacts that
recorded it.

## Artifact-check override — the override is correct

`extensions/` holds only `jefferson.ts`; there is no `extensions/jefferson/` and no `index.ts`.
`extensions/jefferson/rows.ts` is the hypothetical module D3 and tasks 3.4 use to prove the guard's
permissive branch; `extensions/jefferson/index.ts` appears only as the superseded shape. No line cites
a path that should exist now. Override upheld.

## Prior findings

Round 1's blocking finding (req 6 vs req 8) survives: `spec.md` is unchanged, req 6 carries the
invariant wording, and the "amended, not satisfied as originally drafted" paragraph is intact. Round
1's malformed-`pi` concern survives untouched, and I re-verified its host claim. Round 1's
`proposal.md` pointer is the casualty, folded into the finding above.

## Relying on later gates

Implementation: repeat D3 against real `npm pack` and the 4.1 discovery command on the real tree with
the rewritten header. Plan: nothing here turns on plan structure — `tasks.md` agrees with the design
step for step.
