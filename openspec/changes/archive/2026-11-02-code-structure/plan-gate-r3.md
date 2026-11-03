# Plan gate r3 — `code-structure`

Reviewer: Michael. Gate: plan (PL7). Verdict: **approve**.

Round 3, the loop's cap. Prior verdict: `plan-gate-r2.md` (`changes_requested` — one blocking, two
concerns: N1, N2, N3). This round judges the twice-revised `tasks.md` against that verdict. Round 1's
five findings are closed and are not reopened; the owner's layout ruling and the approved
`design.md` / `spec.md` are not reopened.

## What I ran

Against the pinned host, `@earendil-works/pi-coding-agent@1.4.0`, in a scratch copy at
`/tmp/mj-r3-scratch` (entry moved to `extensions/jefferson/index.ts`, `pi` field added, test import
repointed). Everything below was executed, not reasoned:

- 5.1's discovery script **verbatim** — green and both red inputs (wrong `pi.extensions`; syntax
  error in `index.ts`).
- 5.1's stray-module case, and the "remove the `pi` field" probe.
- `pi -ne -e . -p "reply with the single word ok"`, green and red.
- The D3 guard verbatim against real `npm pack --dry-run --json` output (4.2 green; 4.3 red on the
  `files` edit; 4.4 green with `rows.ts` present).
- 4.3's `.files` read-back, 4.4's `shasum` snapshot / `shasum -c`, and the scoped
  `git status --porcelain` checks.
- `npm run typecheck` and `npm test`.

## Disposition of the three findings

**N1 (blocking) — 5.1's stated red outputs cannot be produced by its own command. Resolved.**

The script now logs before it touches the loaded extension: `count` is printed first, the handler
call is guarded by `if (ext)`, and `errors` is printed last. Run verbatim:

```
# red input 1 — pi.extensions = ["./extensions/lefferson"]
count: 0
errors: []
EXIT=0

# red input 2 — syntax error appended to index.ts
count: 0
errors: [{"path":"/private/tmp/mj-r3-red2/extensions/jefferson","error":"Failed to load extension: ParseError: Missing semicolon.  \n /private/tmp/mj-r3-red2/extensions/jefferson/index.ts:24:4"}]
EXIT=0
```

Both are exactly what the step claims. Red 1 is "`count: 0` then `errors: []`, with exit 0". Red 2 is
"`count: 0` then an `errors` entry whose `path` is `<repoRoot>/extensions/jefferson` — the
**directory**, not `index.ts` — and whose message begins `Failed to load extension:`". The reorder
removes the `TypeError: Cannot read properties of undefined (reading 'commands')` that round 2
measured; both reds are now observable, and the green assertions are unchanged and still hold (below).

**N2 (concern) — the deleted 3.3's aim is not proven by 5.1. Resolved; the new attribution is
accurate.**

The step no longer credits itself with the auto-scan bypass. In its own words it now says: "What this
shows is that the declared manifest value resolves to `extensions/jefferson` and nothing else loads.
It does **not** show the `pi` field bypassing an auto-scan of `extensions/` … That bypass is design
Context property 1, read from the host source (`collectPackageResources`, the function this command
does not call), and the manifest value it rests on is pinned by 4.1."

That attribution is accurate against the host source:

- `discoverAndLoadExtensions(["."], ".", agentDir)` (loader.js) resolves the configured path `"."`
  through `resolveExtensionEntries(repoRoot)`, which reads the root `package.json`'s `pi` field and
  returns `[repoRoot/extensions/jefferson]`. It never calls `collectPackageResources` and never reads
  `extensions/`'s contents.
- The auto-scan of `extensions/` lives in `collectPackageResources` (`package-manager.js:1848`): with
  a truthy `pi` manifest it returns via `addManifestEntries`; only without one does it loop
  `RESOURCE_TYPES` and `collectResourceFiles(join(packageRoot, "extensions"))`. That is design Context
  property 1, and 5.1's command is not on that path.

The step's parenthetical is measured, not asserted: with the `pi` field removed and both strays
present, the same command reports `count: 0`, not the strays.

```
count: 0
errors: []
```

Requirement 2 still has a real check behind it. Its value is pinned by machine at two points — 3.1's
read-back and 4.1's guard (`JSON.stringify(declared) !== JSON.stringify(["./extensions/jefferson"])`
fails, so a missing, typo'd, or `["./extensions"]` value cannot merge) — and 5.1 observes discovery
reaching exactly one extension with strays present (`count: 1`, `commands: [ 'jefferson' ]`). The
repair scoped the **claim** to what the test proves; it did not remove the check.

**N3 (concern) — the clean-tree and untouched-file assertions are unscoped. Resolved.**

All three named assertions are now scoped, and none is unsatisfiable while the change is in progress:

- **4.3** dropped the whole-tree `git status --porcelain` / `git diff --exit-code` pair and asserts
  the revert by reading the field it edited —
  `node -e "console.log(JSON.stringify(require('./package.json').files))"` prints
  `["extensions","README.md","LICENSE"]`. Measured: after the temporary `"tests"` element the
  read-back prints `["extensions","README.md","LICENSE","tests"]` (the leftover is visible), and after
  the revert it prints `["extensions","README.md","LICENSE"]`. Satisfiable mid-change, and strong
  enough for the leftover it exists to catch.
- **4.4** replaces the three-file `git diff --exit-code` / `git status` pair with a before/after
  self-check: `shasum package.json tsconfig.json .github/workflows/ci.yml >
  /tmp/code-structure-4.4.before`, then, after removing the module, `shasum -c` prints `OK` for each
  and exits 0, and `git status --porcelain -- extensions/jefferson/rows.ts` prints nothing. Measured:
  both hold. The untouched claim is about the step's own delta — if adding a module had required
  editing `tsconfig.json`, `package.json`, or CI, the hash would differ and the step would fail — so
  the check is non-vacuous, and the module-leftover half is caught by the path-scoped status.
- **5.1** asserts the stray revert with
  `git status --porcelain -- extensions/notes.ts extensions/other` printing nothing, and its Error
  handling states that a whole-tree `git status --porcelain` is expected to list this in-progress
  change and is not the assertion. Measured: with the strays present the scoped status names them;
  after removal it prints nothing. Satisfiable and targeted at the leftover.

The scoping-adjacent assertions that were not findings remain satisfiable: 1.1's
`git status --short` says "shows `R …`" (a contains-check, not a clean-tree check), and 3.2's
`git diff package.json tsconfig.json` "shows only the added `pi` field" is already scoped to two
files, one of which (`tsconfig.json`) this change deliberately leaves alone.

## The three checks, run

**1. 5.1's green.** Every asserted value matches byte for byte:

```
count: 1
resolvedPath: /private/tmp/mj-r3-scratch/extensions/jefferson
commands: [ 'jefferson' ]
notified: ["pi-jefferson 0.0.0-alpha — the statusline is not built yet."]
errors: []
```

The isolated `agentDir` is what makes `count: 1` true: the operator's `~/.pi/agent/extensions` holds
four extensions and the repo's `cwd/.pi/extensions` does not exist, so an unisolated call reports
five. The stray case holds (`count: 1`, `commands: [ 'jefferson' ]`). The `pi -e` corroboration holds
on both legs: green is stdout `ok` with empty stderr; red is
`Error: Failed to load extension "…/extensions/jefferson/index.ts": Failed to load extension: ParseError: Missing semicolon. …`
on stderr — the **file** path here, distinct from the discovery error's **directory** path, exactly as
the step says.

**2. The N2 attribution.** Accurate, per the source reading above; requirement 2 retains a machine pin
(4.1), a read-back (3.1), and an observation (5.1).

**3. N3 scoping.** Strong enough for each leftover, and nothing is unsatisfiable mid-change.

## New findings

None. The repairs falsified nothing else in the artifact, and every output the repaired steps assert
is one I measured:

- 5.1's green, both reds, the stray case, and the `pi -e` legs — match.
- 4.2 green ships `LICENSE, README.md, extensions/jefferson/index.ts, package.json`, exit 0 — match.
- 4.3 red exits 1 with `paths outside the expected roots: tests/jefferson.test.ts; test files shipped:
  tests/jefferson.test.ts` — match; the revert read-back `["extensions","README.md","LICENSE"]` —
  match.
- 4.4 green ships `…, extensions/jefferson/rows.ts, …`, exit 0; `npm run typecheck` passes with the
  module present; `shasum -c` prints `OK` for each, exit 0; the scoped status is clean — match.

## Relied on, not re-run this round

- The workflow YAML's own parse (`4.1`). The inline node script is syntactically valid and I ran it
  against real pack output, but I did not put `ci.yml` through a workflow parser.
- `pi -e` requires a configured provider; this environment has one. On a host without one the green
  would fail for an unrelated reason, as the step already states.

## Verdict

**approve.** N1, N2, and N3 are each resolved with measured evidence; no repair introduced a new
falsehood; no repaired step asserts an output nobody has measured. The plan gate passes and the change
may proceed to implementation.
