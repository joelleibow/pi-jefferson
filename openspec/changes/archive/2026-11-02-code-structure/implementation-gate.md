# Implementation gate — `code-structure`

Reviewer: Michael. Gate: implementation. Verdict: **approve**.
PR #3, branch `code-structure`, base `main`. Round 1.

The layout ruling is closed. This gate judges the approved file-entry design (`design-gate-r3.md`
full review, `design-gate-r4.md` bounded re-review) and the approved plan (`plan-gate-r4.md`)
against what was actually built on the branch. Every command below was executed on this checkout;
red inputs ran in a throwaway copy so the real tree was never edited.

## What I ran

- `git diff --stat main...code-structure` and `--name-status`: three files modified
  (`.github/workflows/ci.yml`, `extensions/jefferson.ts`, `package.json`), 45 insertions, 6
  deletions, no renames. `git status --porcelain` lists only the untracked
  `openspec/changes/code-structure/`.
- `npm run typecheck` — exit 0. `npm test` — 2 tests, 2 pass, exit 0.
- The D3 guard verbatim against real `npm pack --dry-run --json` output — green, exit 0,
  `shipping: LICENSE, README.md, extensions/jefferson.ts, package.json`.
- Eight red cases against the guard in a scratch copy: `tests` re-added to `files`; a wrong
  `pi.extensions` path; `pi.extensions` as a string; `pi = {}`; no `pi` field; `pi.extensions = []`;
  two manifest entries; a stray root file added to `files`. Each fired the expected refusal(s).
- The ordinary-module case: a real `extensions/jefferson/rows.ts` added under the working-parts
  directory, guard green, shipped list includes it, no edit to `ci.yml`.
- The 4.1 discovery command verbatim against the real tree — `count: 1`,
  `resolvedPath: /Users/joelleibow/Projects/pi-jefferson/extensions/jefferson.ts`,
  `commands: [ 'jefferson' ]`, the alpha notify text, `errors: []`. Also with strays
  (`extensions/notes.ts`, `extensions/other/index.ts`) present — still `count: 1`; and with the
  `pi` field removed — `count: 0`, `errors: []`.
- The two design reds in a scratch copy: a wrong manifest path — `count: 0`, `errors: []`, exit 0;
  a parse error in the entry — `count: 0`, one error whose `path` is the **file** and whose message
  begins `Failed to load extension: ParseError: Unexpected token …`.
- `tsc --noEmit` with an ordinary module present and the entry importing `./jefferson/rows.ts` —
  exit 0; the same entry importing bare `./jefferson` — `TS2835`, exit 1.
- `openspec validate "code-structure"` — `Change 'code-structure' is valid`, exit 0.
- Workflow YAML parse (Ruby `YAML.load_file`) — OK. `git diff` for `release.yml`,
  `tests/jefferson.test.ts`, `tsconfig.json` — empty.
- Not run: the `pi -e` corroboration leg (needs a configured provider; the plan gate skipped it too)
  and the 3.4 `shasum` snapshot/check. The diff and read-backs cover the same "nothing moved"
  property more directly.

## 1. Does the diff implement exactly the design, and nothing else?

Yes. The diff changes exactly D6's three files. Each edit is called for:

| File | Diff | Called for by |
| --- | --- | --- |
| `extensions/jefferson.ts` | comment lines added only | D2 header text, D4 membership/dependency rule, D1's one convention |
| `package.json` | one `pi` field added | D1 |
| `.github/workflows/ci.yml` | the tarball step replaced | D3 |

The entry diff is comment-only: every added line in that file's hunk is a ` * ` comment line; the
code below the header is untouched. No other tracked file changed. Nothing in the diff is
uncalled-for, and the diff does not update `proposal.md`/`council.md` (design's "Record correction"
and "Superseded artifacts" deliberately leave that trail in place).

One D4 sentence is not restated in the header — "Module filenames name the behavior or data they
own; `utils`, `helpers`, `misc`, and `common` do not exist." D4's bullet lists it, but it is the
spec's requirement 7 restated (a module-naming rule, not the directory's membership or dependency
rule), and the approved plan's step 1.2 enumerates exactly what the header states without it. So the
implementation matches the approved plan; noted below rather than treated as a gap.

## 2. The header

It is the D2 contract text plus D4's rule and D1's convention. The header names:

- the `package.json` declaration, quoted verbatim:
  `"pi": { "extensions": ["./extensions/jefferson.ts"] }`;
- pi loads `jefferson.ts` — this file — as the extension, and every file in the
  `extensions/jefferson/` directory beside it is a working part, imported by relative path and never
  host-loaded (membership rule);
- "This file is the entry and the only module that may contain a runtime import of a host package
  (`@earendil-works/*`); modules under `extensions/jefferson/` import each other by relative path and
  use `import type` for host types" (dependency rule);
- "an import from here must name a file inside it (`./jefferson/rows.ts`), not the bare
  `./jefferson`" (D1's convention).

The first paragraph matches D2's quoted text exactly. The convention is not just prose: the compiler
enforces it — the bare specifier fails `tsc --noEmit` with `TS2835` and the file specifier typechecks.

## 3. The CI step

The shipped step is byte-identical to design D3's block (diff against the design's fenced block:
exit 0, 35 lines each, including the comment and step name). It asserts the four invariants:

- allowed roots: `package.json`, `README.md`, `LICENSE`, or `p.startsWith("extensions/")`;
- the declared entry is shipped: `extensions/jefferson.ts`;
- no shipped `*.test.ts`;
- `pi.extensions` exactly `["./extensions/jefferson.ts"]` (JSON-stringified comparison, so a string,
  `{}`, `[]`, two entries, a wrong path, or a missing `pi` field all fail).

It still admits an ordinary new module with no CI edit. Measured: with a real
`extensions/jefferson/rows.ts` present and `ci.yml` untouched, the guard printed
`shipping: LICENSE, README.md, extensions/jefferson.ts, extensions/jefferson/rows.ts, package.json`
and exited 0. The permissive branch requirement 8 protects — and the one requirement 6 was rewritten
to stop contradicting — holds. The workflow YAML parses; the guard triggers on `pull_request` and
pushes to `main`.

## 4. Verification re-run — measured results

| Check | Result |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm test` | 2 pass, 0 fail, exit 0 |
| Guard, real `npm pack --dry-run --json` | `shipping: LICENSE, README.md, extensions/jefferson.ts, package.json`, exit 0 |
| Guard red: `tests` added to `files` | exit 1, exactly `paths outside the expected roots: tests/jefferson.test.ts; test files shipped: tests/jefferson.test.ts`; `files` read-back `["extensions","README.md","LICENSE"]` after revert |
| Guard red: wrong manifest path | exit 1, `pi.extensions is not exactly …: ["./extensions/lefferson.ts"]` |
| Guard red: `pi.extensions` as string / `pi = {}` / no `pi` / `[]` / two entries | each exit 1 with the manifest refusal |
| Guard red: stray root file in `files` | exit 1, `paths outside the expected roots: notes.md` |
| Guard green: ordinary module, no CI edit | exit 0, shipped list includes `extensions/jefferson/rows.ts` |
| Discovery, real tree | `count: 1`; `resolvedPath: …/extensions/jefferson.ts`; `commands: [ 'jefferson' ]`; alpha notify text; `errors: []` |
| Discovery with strays present | `count: 1` (only the manifest-declared file loads) |
| Discovery with no `pi` field | `count: 0`, `errors: []` |
| Discovery, wrong manifest path | `count: 0`, `errors: []`, exit 0 — the silent no-load |
| Discovery, parse error in entry | `count: 0`, error `path` is the **file**, message begins `Failed to load extension: ParseError: Unexpected token …` |
| `tsc` with module + `./jefferson/rows.ts` import | exit 0 |
| `tsc` with bare `./jefferson` import | `TS2835`, exit 1 |
| `openspec validate "code-structure"` | valid, exit 0 |

## 5. The two reported deviations

**(a) `git status --porcelain -- extensions/jefferson/rows.ts` prints nothing on stdout and warns on
stderr — benign.** I measured stdout empty and exit 0 in four forms; stderr carried one warning,
`warning: could not open directory 'extensions/jefferson/': No such file or directory` — one, not
the reported two. The warning is git's pathspec message for a subdirectory that does not exist while
its parent does; it is not a status entry. The assertion is non-vacuous: in a throwaway repo, a
leftover `rows.ts` present prints `?? extensions/jefferson/rows.ts` on stdout. So empty stdout plus
the warning proves no leftover module survived. The two-vs-one warning count is a reporting detail,
not an implementation gap.

**(b) The red case's parse detail was `Unexpected token`, not the plan's illustrative
`Missing semicolon` — benign.** The plan wrote "e.g. `Missing semicolon`"; Node's parser message
depends on the broken input and version. The red signal's substance holds: `count: 0`, one error
whose `path` is `extensions/jefferson.ts` (the file the manifest declares) and whose message begins
`Failed to load extension:`. Nothing in the design or plan depends on the parser's wording.

## 6. The silent-failure risk against the shipped guard

The design's risk is real and I reproduced it: a wrong manifest path loads nothing, reports
`count: 0` and `errors: []`, and exits 0 — silent. The design claims the CI guard covers it. That
claim is now true of the shipped guard: against the same wrong path the shipped guard exits 1
(`pi.extensions is not exactly ["./extensions/jefferson.ts"]: ["./extensions/lefferson.ts"]`), and
it also refuses the sharper malformed-but-object cases the design names — `pi.extensions` as a
string, `{}`, `[]`, two entries, and no `pi` field at all. Since the workflow runs on pull requests
and pushes to `main`, a manifest typo cannot merge. The guard reads the repository's `package.json`,
which is the manifest `npm pack` ships, so the value it pins is the value that publishes.

## 7. What the design keeps did not move

Nothing moved. Measured on the branch:

- `package.json` `files` — still `["extensions","README.md","LICENSE"]`.
- `tsconfig.json` `include` — still `["extensions/**/*.ts","tests/**/*.ts"]`; `git diff` empty.
- `tests/jefferson.test.ts` — import still `../extensions/jefferson.ts`; `git diff` empty.
- `dependencies` — still absent; both host packages remain `peerDependencies` with `"*"` ranges.
- `/jefferson`'s behavior — both tests pass; discovery's notify text is unchanged; `VERSION` is
  still `0.0.0-alpha`.
- The release workflow and the version contract — no diff.

`git diff --name-status main...code-structure` reports three modifications and no rename, so no file
moved at all. The only "move" in the diff is the replaced CI step, which D3 calls for.

## 8. Is the change archivable?

Yes. `openspec validate "code-structure"` is green, and all eight spec requirements are observable on
the real tree: one host-loaded entry (`count: 1`); the load root singular and stated (the manifest
pin, strays unreachable); no tests shipped (guard green and red); host imports only at the boundary
(`peerDependencies` intact, the entry's host import type-only, no helper module exists); every shipped
source file typechecked and erasable (typecheck green, no `enum`/parameter property/runtime
`namespace`/decorator in the shipped source, no build script); the published set deliberate (the
invariant guard, exercised green and red); responsibility inferable from path (the entry named for
the extension, paired with its working-parts directory, whose rule the header states); growth a named
change (an ordinary module needs no manifest, `tsconfig`, or CI edit — measured). Nothing is unbuilt
that would make archiving record something false.

## Findings

None. The implementation realises the approved design and plan. Two things to know for the record,
neither a finding:

- The untracked `openspec/changes/code-structure/` directory means PR #3's diff (`main...code-structure`)
  contains only the three code files. The change's spec delta, design, tasks, and gate records exist
  on disk and would land through a commit or the archive step, not through this diff. That is a
  process note for the main agent, not a spec or content falsehood.
- The tests file's header rationale ("Pi loads every direct `.ts` file in `extensions/`") is narrower
  than this package's actual mechanism — the manifest branch never scans `extensions/`. D6
  deliberately leaves that file unchanged, so it is not a finding; the rule it states (tests live in
  `tests/`) still holds.

## Verdict

**approve.** The diff is exactly the approved design: three files, each edit called for, the header
the D2 contract plus D4's rule and D1's convention, the CI step byte-identical to D3 and still
permissive for an ordinary module. Every asserted verification was re-run and matched; both reported
deviations are benign; the silent-failure risk the design names is refused by the shipped guard; and
nothing the design keeps moved. The change validates and is archivable.
