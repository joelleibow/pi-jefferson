# Tasks

Implementation checklist for `code-structure`. It executes the approved `design.md`
migration plan (D1–D6) and carries forward the verification the design gate handed to the
implementation phase. Nothing here edits the statusline; this change adds one manifest field,
rewrites one file header, and replaces one CI step. **No file moves, and the test import does not
change.**

**Revision note.** Third revision, against the owner's settled shape: the manifest names the file
`./extensions/jefferson.ts`, `extensions/jefferson.ts` is the entry, and `extensions/jefferson/`
beside it holds the working parts. The former group 1 (relocate the entry and repoint the test
import) is deleted — there is nothing to move — so the groups renumber: header (1), manifest (2),
CI (3), host-load verification (4). Every output asserted below was **re-measured against this
shape** on the pinned host `@earendil-works/pi-coding-agent@1.4.0` in a scratch copy carrying the
`pi` field, not carried over from the directory-declaration revision; where a measured value changed
(a file entry resolves to the file, not the directory), the step says so. Repairs from earlier
rounds still stand and keep their marks: **(repaired; r2 N1/N2/N3)** and **(new — plan-gate
concern 4)**. The design gate (`design-gate-r2.md`) and plan gate (`plan-gate-r3.md`) approved the
superseded directory declaration; both re-run against this revision.

## Goal

The acceptance criteria are the eight requirements in
`specs/extension-source-layout/spec.md`; each is a MUST with its own scenarios. This change is
done when every one is observable:

| Requirement (`spec.md`) | Observable acceptance criterion | Shown by |
| --- | --- | --- |
| One host-loaded entry per extension | Discovery against the package root yields exactly one extension, and its factory registers `/jefferson` | 4.1 |
| The load root is singular and stated | `package.json` `pi.extensions` is exactly `["./extensions/jefferson.ts"]`, and discovery reaches only that file — no stray module under `extensions/` is loaded | 2.1, 2.2, 4.1 |
| Tests never occupy a loadable or shipped path | The packed tarball contains no `*.test.ts`; tests stay under `tests/` | 3.1, 3.2 |
| Host packages are imported only at the load boundary | `@earendil-works/*` stay `*`-ranged `peerDependencies` and absent from `dependencies`; only the entry may import one at runtime | 1.2, 2.2 |
| Every shipped source file is typechecked and erasable | `extensions/**/*.ts` matches the entry and every module under `extensions/jefferson/`, and no `enum`/parameter property/runtime `namespace`/decorator exists | 1.3, 4.2 |
| The published file set is deliberate | CI asserts the allowed roots, the declared entry's presence, the absence of tests, and the load-root value by invariant — not an enumerated list | 3.1, 3.2, 3.4 |
| Responsibility is inferable from path | The entry filename names the extension it provides and pairs with the working-parts directory, and the directory states its membership and dependency rule | 1.1, 1.2 |
| Growth is a named change | A real ordinary module added under `extensions/jefferson/` leaves `package.json`, `tsconfig.json`, and CI untouched, and keeps the guard green | 3.4 |

This table adds no criterion of its own; `spec.md` is the contract.

## Scope Out

Per `proposal.md` ("Out of scope", under *What Changes*) and `design.md` (*Non-Goals*):

- The statusline itself — the module library, format strings, rows, alignment, truncation.
- A second extension in this package. A second extension is a new package (design D5).
- Any change to `/jefferson`'s behavior, the release workflow, or the version contract.
- A build step, lint, or formatting tooling.
- Any file move. The entry stays at `extensions/jefferson.ts`, so `tests/jefferson.test.ts`'s
  import path is untouched (design D1, D6).
- `package.json` `files` and `tsconfig.json` `include` — both already cover the entry and the
  working-parts directory and stay unchanged (design D6).

## Sequencing

Order is load-bearing; a step run out of order verifies the wrong thing:

1. **2.1 before 3 and 4.1.** The guard (3.1) pins the manifest value, and 4.1's green is
   `count: 1` only once the `pi` field exists: with no `pi` field, `discoverAndLoadExtensions(["."])`
   against the repository root has no manifest entry to resolve and loads nothing, reporting
   `count: 0` (measured against the pinned host). Run 4.1 before 2.1 and its green assertion cannot
   hold.
2. **3.1 before 3.2–3.4.** The guard step must exist before it is exercised green and red.
3. **1.2 before 3.4.** The directory's dependency rule must be stated before a real module is
   added under it.
4. **Group 1 constrains nothing.** The header rewrite is comment-only, so 1.1–1.3 may run at any
   point and gate no other step.
5. **4.2 and 4.3 last.** Typecheck, tests, and `openspec validate` run against the final tree.

## Architecture

`design.md` D1–D6 is the architecture. This section maps every component to its decision and to the
task group that builds it:

| Component | Decision | Built by |
| --- | --- | --- |
| The entry `extensions/jefferson.ts` | D1 (layout, unchanged path), D2 (contract header) | 1.1 |
| `package.json` `pi.extensions` field | D1 | 2.1 |
| Working-parts directory `extensions/jefferson/` membership and dependency rule | D4 | 1.2 |
| CI tarball / load-contract guard | D3 | 3.1–3.4 |
| One package, one extension (the manifest carries one entry) | D5 | 2.1, 3.1 |
| `files`, `tsconfig.json` `include`, `peerDependencies`, and the test import left alone | D6 | 2.2, 4.2 |

The host-resolution mechanics the architecture rests on are `design.md` Context properties 1–3
(a `pi` field makes `collectPackageResources` take the manifest branch; a plain file entry is
pushed as it stands; the working-parts directory is never enumerated), verified against
`@earendil-works/pi-coding-agent@1.4.0`. The repository layout is `design.md` D1.

## Boyscouting

Nothing to clean, and the reason is the tree's size. This change touches three files, and the
entire tracked non-OpenSpec surface is twelve files with one shipped source module and one test
(`git ls-files`). A repository scan for `TODO`/`FIXME`/`XXX`/`HACK` returns nothing. No dead code,
unused export, or incidental defect exists in `extensions/`, `tests/`, `package.json`,
`tsconfig.json`, or `.github/workflows/ci.yml`. There is no boyscouting work to fold in.

## 1. State the load contract and the dependency rule in the entry header (design D2, D4)

- [x] 1.1 Replace the header doc comment at the top of `extensions/jefferson.ts` with the D2 text:
  name the `package.json` declaration (`"pi": { "extensions": ["./extensions/jefferson.ts"] }`),
  state that pi loads `jefferson.ts` — this file — as the extension, and state that every file in
  `extensions/jefferson/` beside it is a working part imported by relative path and never
  host-loaded. Change nothing below the comment. Verify the file still parses and behaves: run
  `npm run typecheck && npm test`.

  Shape — **Test:** n/a for the prose (a doc comment cannot be mutation-tested); `npm test` is the
  check that the edit stayed comment-only. **Boundary cases:** n/a (one comment block). **Impl:**
  the comment text quoted in `design.md` D2. **Logging:** n/a. **Error handling:** a stray edit
  below the comment shows up as a failing test or typecheck; that is the signal.

- [x] 1.2 State the working-parts directory's membership and dependency rule in the same header per
  D4: every file in `extensions/jefferson/` is a working part of the one `jefferson` extension;
  `extensions/jefferson.ts` is the entry and the only module that may contain a runtime import of a
  host package (`@earendil-works/*`); internal modules import each other by relative path and use
  `import type` for host types. State the one convention this shape needs: an import from the entry
  names a file inside the directory (`./jefferson/rows.ts`), because the directory shares its stem
  with the entry file beside it and `moduleResolution: nodenext` rejects a bare `./jefferson`.
  Verify the header matches design D2/D4 and `npm run typecheck` and `npm test` still pass.

  Shape — **Test:** n/a for the prose; the rule becomes executable in 3.4, where a real ordinary
  module is added under it, and the import convention is enforced by `npm run typecheck` the first
  time a module is imported. **Boundary cases:** the rule's boundary (a runtime host import) is
  exercised only when a module adds one; no such module exists in this change. **Impl:** the
  comment text. **Logging:** n/a. **Error handling:** n/a (the rule is enforced by review now and by
  the spec's requirement 4).

- [x] 1.3 Confirm the entry still `default`-exports a factory function, registers `/jefferson`, and
  uses only erasable TypeScript (no `enum`, parameter properties, runtime `namespace`, or
  decorators). Verify by inspection and by `npm test`, which executes the file directly under Node's
  type stripping. Keep the two existing tests in `tests/jefferson.test.ts` ("registers exactly one
  command", "the alpha announces that it is a name claim and nothing more") as the regression check
  for this change, and note what they now cover: there is no relocation, so they stand for the
  entry's observable behavior — one registered command, the version string, the notify text — which
  a comment-only edit must leave identical. No new test is added.

  Shape — **Test:** `npm test` is the executable check (Node refuses a non-erasable construct), and
  the two tests are the behavior regression. **Boundary cases:** n/a (the entry has no inputs).
  **Impl:** n/a (assert only). **Logging:** n/a. **Error handling:** a non-erasable construct makes
  `npm test` fail to parse the entry; that is the signal.

## 2. Declare the load root in `package.json` (design D1)

- [x] 2.1 Add exactly one field to `package.json`:
  `"pi": { "extensions": ["./extensions/jefferson.ts"] }`. Verify with
  `node -e "console.log(JSON.stringify(require('./package.json').pi))"` printing
  `{"extensions":["./extensions/jefferson.ts"]}`.

  Shape — **Test:** the one-line `node -e` read-back is the check. **Boundary cases:** the array
  must hold exactly one entry (D5) and must name the file, not a directory (D1). **Impl:** one field
  added; nothing else in the file changes. **Logging:** n/a. **Error handling:** n/a (a malformed
  value is caught by 3.1's guard, per design's Risks).

- [x] 2.2 Verify the pinned mechanisms the design says must not move are unchanged: `files` is
  still `["extensions","README.md","LICENSE"]`, `tsconfig.json` `include` is still
  `["extensions/**/*.ts","tests/**/*.ts"]`, host packages remain in `peerDependencies` with a `*`
  range and absent from `dependencies`, and `tests/jefferson.test.ts`'s import is still
  `../extensions/jefferson.ts`. Verify `git diff package.json tsconfig.json tests/jefferson.test.ts`
  shows only the added `pi` field.

  Shape — **Test:** `git diff` scoped to those three files is the observation. **Boundary cases:**
  the four surfaces named above are the boundary. **Impl:** n/a (assert only). **Logging:** n/a.
  **Error handling:** n/a.

## 3. Replace the CI tarball assertion (design D3)

- [x] 3.1 Replace the "The tarball is the file set we expect" step in `.github/workflows/ci.yml`
  with the D3 invariant guard: allowed roots, the declared entry's presence
  (`extensions/jefferson.ts`), the absence of any `*.test.ts`, and `pi.extensions` equal to
  `["./extensions/jefferson.ts"]`. Verify the workflow YAML parses and the step's inline node script
  is syntactically valid.

  Shape — **Test:** the guard *is* the test; 3.2–3.4 exercise it on real inputs. **Boundary cases:**
  the four refusals the guard encodes — a path outside the allowed roots, a missing declared entry,
  a shipped `*.test.ts`, and a `pi.extensions` value other than the exact one. **Impl:** the D3
  step text, replacing the exact-list assertion. **Logging:** `console.log("shipping:", …)` prints
  the shipped list on every run. **Error handling:** `process.exit(1)` after printing
  `tarball or load contract changed; <problems>`; the guard never edits anything.

- [x] 3.2 Repeat the guard against real `npm pack --dry-run --json` output — not a synthetic set.
  Run `npm pack --dry-run --json` and feed its output to the guard; confirm it exits 0 and prints a
  shipped list of exactly `LICENSE, README.md, extensions/jefferson.ts, package.json`. This is the
  real run the design gate handed forward. Measured in a scratch copy carrying only the `pi` field:
  `shipping: LICENSE, README.md, extensions/jefferson.ts, package.json`, exit 0.

  Shape — **Test:** the guard's exit 0 is the assertion. **Boundary cases:** the shipped list is a
  singleton file set here; the permissive branch is proven in 3.4. **Impl:** n/a (run the command;
  commit no artifact). **Logging:** the guard's `shipping:` line is the evidence to record.
  **Error handling:** a non-zero exit names the specific refusal.

- [x] 3.3 **(repaired; r2 N3)** Show the guard red against a real failing input: temporarily add
  `"tests"` to the `files` array in `package.json`, run `npm pack --dry-run --json` and the guard,
  and confirm a non-zero exit naming the refusal — `paths outside the expected roots:
  tests/jefferson.test.ts` and `test files shipped: tests/jefferson.test.ts`. A stray file placed at
  `extensions/` is *not* a valid red input: the guard allows anything under `extensions/`, so it
  passes. Revert the `files` edit and re-run to confirm green.

  Then assert the revert, scoped to what this step changed. The tree is not pristine mid-change
  (this change's own `pi` field and `ci.yml` edits are present, so a whole-tree `git diff
  --exit-code` cannot pass), and the step's only edit was the `files` array: read it back with
  `node -e "console.log(JSON.stringify(require('./package.json').files))"` and confirm it prints
  `["extensions","README.md","LICENSE"]`. That read-back is the whole revert — the temporary
  array element is the only thing this step changed, and reading the array avoids asserting a
  clean `package.json` that carries this change's `pi` field.

  Measured: with the temporary element the read-back prints
  `["extensions","README.md","LICENSE","tests"]` and the guard exits 1 with exactly the two
  problems above; after the revert it prints `["extensions","README.md","LICENSE"]` and the guard
  exits 0.

  Shape — **Test:** the guard's non-zero exit on the `files` edit, then exit 0 after reversion.
  **Boundary cases:** the stray-under-`extensions/` input is explicitly excluded because it cannot
  fire; the `"tests"` edit is the input CI itself would catch. **Impl:** one temporary array
  element, reverted. **Logging:** record the guard's stderr problem list. **Error handling:** the
  read-back closes the step — it proves the temporary `files` element is gone; a whole-tree
  `git status --porcelain` is expected to list this in-progress change and is not the assertion.

- [x] 3.4 **(new — plan-gate concern 4; r2 N3)** Show requirement 8's ordinary-module case green on
  a real input. Record the files this step claims to leave alone, before touching anything:
  `shasum package.json tsconfig.json .github/workflows/ci.yml > /tmp/code-structure-3.4.before`.
  Then create a real ordinary module in the working-parts directory — e.g.
  `extensions/jefferson/rows.ts` containing `export const ROWS = 0;`, named for the data it owns,
  with no runtime host import and only erasable syntax. Run `npm pack --dry-run --json` and the
  guard; confirm the guard exits 0 and its shipped list now includes `extensions/jefferson/rows.ts`,
  and `npm run typecheck` still passes. Remove the module, then confirm *this step* changed none of
  the three recorded files with `shasum -c /tmp/code-structure-3.4.before` (prints `OK` for each,
  exit 0) and confirm no stray survives with
  `git status --porcelain -- extensions/jefferson/rows.ts` printing nothing.

  The untouched claim is about the step's own delta, not a pristine tree: mid-change those three
  files already carry this change's edits (the `pi` field, the rewritten `ci.yml`), so a
  whole-tree `git diff --exit-code` cannot pass and is not the assertion; the before/after hashes
  isolate what this step did.

  Measured in a scratch copy carrying only the `pi` field: the guard printed
  `shipping: LICENSE, README.md, extensions/jefferson.ts, extensions/jefferson/rows.ts, package.json`
  and exited 0, and `npm run typecheck` exited 0 with the module present.

  Shape — **Test:** the guard's exit 0 with an extra real module shipped is the assertion; it is the
  permissive branch the synthetic run never proved. **Boundary cases:** exactly one added module,
  inside `extensions/jefferson/`, following D4 — this is the case requirement 8 names. **Impl:** one
  real module file, removed before the step ends, plus a hash snapshot outside the repository.
  **Logging:** record the `shipping:` line showing the module. **Error handling:** the scoped checks
  after removal — `shasum -c` proves the step touched none of the three files, and
  `git status --porcelain -- extensions/jefferson/rows.ts` proves a leftover module did not
  survive.

## 4. Verify the host loads the entry and the suite is green (gate hand-forward)

- [x] 4.1 **(repaired; r2 N1, N2, N3)** Confirm the host resolves the declared entry and executes
  it, using an **isolated `agentDir`** so the result is hermetic. `discoverAndLoadExtensions(configuredPaths,
  cwd, agentDir, eventBus)` defaults `agentDir` to the operator's real `~/.pi/agent`; passing an
  isolated directory is what makes "exactly one extension" true on a real machine. From the
  repository root:

  ```sh
  node --input-type=module -e '
    import { mkdtempSync } from "node:fs";
    import { tmpdir } from "node:os";
    import { join } from "node:path";
    import { discoverAndLoadExtensions } from "@earendil-works/pi-coding-agent";
    const agentDir = mkdtempSync(join(tmpdir(), "jefferson-agentdir-"));
    const { extensions, errors } = await discoverAndLoadExtensions(["."], ".", agentDir);
    const [ext] = extensions;
    console.log("count:", extensions.length);
    if (ext) {
      const notified = [];
      await ext.commands.get("jefferson").handler("", { ui: { notify: (m) => notified.push(m) } });
      console.log("resolvedPath:", ext.resolvedPath);
      console.log("commands:", [...ext.commands.keys()]);
      console.log("notified:", JSON.stringify(notified));
    }
    console.log("errors:", JSON.stringify(errors));
  '
  ```

  Green is `count: 1` and `resolvedPath:` `<repoRoot>/extensions/jefferson.ts` — the **file**, which
  is what the manifest names. (The API returns the manifest-declared path; a file entry returns the
  file, where the superseded directory declaration returned the directory. Measured against the
  pinned host: `/private/tmp/pj-file-entry-scratch/extensions/jefferson.ts`.) It also prints
  `commands: [ 'jefferson' ]`, `notified: ["pi-jefferson 0.0.0-alpha — the statusline is not built
  yet."]`, and `errors: []`.

  Then pin the manifest value (requirement 2) on a real input: place a valid stray module at
  `extensions/notes.ts` (a default-exported no-op factory) and a valid `extensions/other/index.ts`,
  re-run the same command, and confirm it still reports `count: 1` and `commands: [ 'jefferson' ]`.
  What this shows is that the declared manifest value resolves to `extensions/jefferson.ts` and
  nothing else loads. It does **not** show the `pi` field bypassing an auto-scan of `extensions/`:
  `discoverAndLoadExtensions(["."], …)` resolves the repository root through the manifest entry and
  never reads `extensions/`'s contents, so the strays are unreachable for that reason — remove the
  `pi` field and this same command reports `count: 0`, not the strays (measured against the pinned
  host). That bypass is design Context property 1, read from the host source
  (`collectPackageResources`, the function this command does not call), and the manifest value it
  rests on is pinned by 3.1. Remove both strays and assert the revert with
  `git status --porcelain -- extensions/notes.ts extensions/other` printing nothing.

  Red, for this step — observe both in a throwaway copy of the repository (scoped to the red, so
  the real tree is never edited; the plan gate's copy was `/tmp/pj-scratch`), because both inputs
  edit the tree. A wrong `pi.extensions` value (e.g. `["./extensions/lefferson.ts"]`) prints
  `count: 0` then `errors: []`, with exit 0 — the silent no-load the design records in Risks, now
  observable because the logs precede the handler call. A non-loading entry (a syntax error in
  `extensions/jefferson.ts`) prints `count: 0` then an `errors` entry whose `path` is
  `<repoRoot>/extensions/jefferson.ts` — the **file**, because that is what the manifest declares
  (the superseded directory declaration reported the directory here) — and whose message begins
  `Failed to load extension:`, e.g. `{"path":"<repoRoot>/extensions/jefferson.ts","error":"Failed to
  load extension: ParseError: Missing semicolon. …"}`. Both measured.

  As corroboration, run the host's own loader against the package root with discovery disabled so
  only the explicit entry loads: `pi -ne -e . -p "reply with the single word ok"`. Green is exit 0
  with an empty stderr (a model reply on stdout); it requires a configured provider. Red is exit 1
  with `Error: Failed to load extension "<repoRoot>/extensions/jefferson.ts": …` on stderr. Both
  legs measured; the green prints `ok` on stdout. The discovery command above remains the
  authoritative check — it runs against the pinned host in `node_modules` (`1.4.0`), while the `pi`
  CLI on this machine is `1.5.0` — and `pi -e` corroborates it end to end.

  Shape — **Test:** the discovery command's expected output and the `pi -e` exit code are the
  assertions. **Boundary cases:** the isolated `agentDir` (a real machine's global extensions), the
  file path the API returns for a file entry, the stray-module case, and the two red signals.
  **Impl:** n/a (a run-once verification; no test file is added — 1.3's two tests remain the
  committed regression). **Logging:** the printed `count`/`resolvedPath`/`commands`/`errors` lines
  are the evidence. **Error handling:** a non-empty `errors` array or `count: 0` is the failure. The
  strays are reverted and checked with `git status --porcelain -- extensions/notes.ts
  extensions/other` printing nothing; the red inputs run in a throwaway copy and are not applied to
  this tree. The whole-tree `git status --porcelain` is expected to list this in-progress change, so
  it is not an assertion here.

- [x] 4.2 Run `npm run typecheck && npm test` against the final tree. Verify the entry and any
  module under `extensions/jefferson/` are covered by `extensions/**/*.ts`, and both existing tests
  pass.

  Shape — **Test:** typecheck and the two tests are the assertions. **Boundary cases:** n/a (the
  entry has no inputs). **Impl:** n/a (run only). **Logging:** n/a. **Error handling:** a non-zero
  exit is the failure signal.

- [x] 4.3 Run `openspec validate "code-structure"` and confirm the change validates before it is
  archived.

  Shape — **Test:** the validator's verdict is the assertion. **Boundary cases:** n/a. **Impl:** n/a
  (run only). **Logging:** record the validator's exact output. **Error handling:** a validation
  error blocks archiving.
