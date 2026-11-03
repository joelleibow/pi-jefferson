# Plan gate r2 — `code-structure`

Reviewer: Michael. Gate: plan (PL7). Verdict: **changes_requested**.

Prior verdict: `plan-gate.md` (changes_requested — three blocking findings, two concerns).
This round judges the revised `tasks.md` against that verdict. The owner's layout ruling, the
approved `design.md`, and `spec.md` are not reopened.

## What I ran

A scratch copy of the repo at `/tmp/pj-scratch`, with `extensions/jefferson.ts` moved to
`extensions/jefferson/index.ts`, the `pi` field added, and the test import repointed — every
claim below was executed against the pinned host, `@earendil-works/pi-coding-agent@1.4.0`
(`node_modules/@earendil-works/pi-coding-agent`), not reasoned:

- 5.1's command **verbatim** (both green and both red inputs), plus the two-argument form to test
  the hermeticity rationale.
- The stray-module case verbatim, plus the divergence probe below.
- `pi -ne -e . -p "reply with the single word ok"` on a good entry and a broken one.
- The D3 guard verbatim against real `npm pack --dry-run --json`, in four states.
- `npm run typecheck`, `npm test`, `git status --porcelain`, `git check-ignore`.

## Disposition of the five findings

**1. Blocking — 5.1's assertion is false and non-hermetic.** **Resolved.** The step now passes an
isolated `agentDir` and asserts on the loaded extension's `commands`. Ran verbatim; every
asserted value matches the host:

```
count: 1
resolvedPath: /private/tmp/pj-scratch/extensions/jefferson   (the directory, not index.ts)
commands: [ 'jefferson' ]
notified: ["pi-jefferson 0.0.0-alpha — the statusline is not built yet."]
errors: []
```

The hermeticity rationale is also correct: the two-argument call loads **five** extensions here —
`context-bar/index.ts`, `jev-router.ts`, `mid-prose-slash-autocomplete.ts`, `thinking-box.ts`, and
`jefferson` — i.e. four unrelated globals, exactly as the step says. The `pi -e` corroboration
checks out too: green is exit 0, empty stderr, `ok` on stdout; red is exit 1 with
`Error: Failed to load extension "<root>/extensions/jefferson/index.ts": Failed to load
extension: ParseError: …` on stderr. The *green* assertions are now true. (One *red* assertion in
the same step is not — new finding N1, below; it is a defect the repair introduced, not the
finding it fixed.)

**2. Blocking — 3.3 cannot run and proves the wrong function.** **Resolved.** The step is deleted,
and the deletion note gives the executed reason (`ERR_PACKAGE_PATH_NOT_EXPORTED`; only `.` and
`./rpc-entry` are exported; `readPiManifest` is the wrong function for "the host takes the
manifest branch"). Nothing in the revised `tasks.md` deep-imports a host internal. The residual —
that the note hands the deleted step's claim to 5.1, which does not actually exercise it — is new
finding N2.

**3. Blocking — 4.3's second red input cannot fire, and the revert is unverified.** **Resolved.**
4.3 now names the `files`-edit input and explicitly excludes the stray-under-`extensions/` input
as one that cannot fire. Ran the D3 guard verbatim against real pack output:

```
# files = ["extensions","tests","README.md","LICENSE"]
shipping: LICENSE, README.md, extensions/jefferson/index.ts, package.json, tests/jefferson.test.ts
tarball or load contract changed; paths outside the expected roots: tests/jefferson.test.ts; test files shipped: tests/jefferson.test.ts
EXIT=1
# reverted
shipping: LICENSE, README.md, extensions/jefferson/index.ts, package.json
EXIT=0
```

The red is non-zero and names exactly the two refusals the step quotes. The revert is now
asserted (clean-tree check). Whether that check is *scoped* correctly is new finding N3.

**4. Concern — requirement 8's ordinary-module-green is never shown on a real input.** **Resolved.**
The new 4.4 creates a real module under the load root and reruns the guard. Ran it: with
`extensions/jefferson/rows.ts` present the guard exits 0 and ships
`LICENSE, README.md, extensions/jefferson/index.ts, extensions/jefferson/rows.ts, package.json` —
the permissive branch, on a real input, which the design's synthetic run never reached.

**5. Concern — the bar's plan-level sections are absent.** **Resolved.** See check 3.

## The three checks

### 1. 5.1's measured outputs — match, except the stated red

Green: **all five asserted values match** the host, byte for byte, including the em dash and the
`0.0.0-alpha` string (which comes from the entry's `VERSION` constant, not `package.json`'s
`0.1.1`). The isolation rationale matches (two-arg call → five extensions). The `pi -e`
corroboration matches on both green and red.

Red: the discovery command's **stated red output is not what the command prints.** The command is

```sh
const [ext] = extensions;
const notified = [];
await ext.commands.get("jefferson").handler("", { ui: { notify: … } });
console.log("count:", extensions.length);
…
```

`ext` is read before anything is printed. On a wrong `pi.extensions` value the host returns
`{ extensions: [], errors: [] }`, so `ext` is `undefined` and the script dies at line 9:

```
TypeError: Cannot read properties of undefined (reading 'commands')
    at file:///private/tmp/pj-scratch/[eval1]:9:13
EXIT=1
```

It never prints `count: 0` or `errors: []`. Same for the syntax-error input — it dies at the same
line, so the asserted `errors` entry (`path` = `<repoRoot>/extensions/jefferson`, message begins
`Failed to load extension:`) is never printed either, even though the host does return it. Both
asserted reds are false as scripted. New finding **N1**.

### 2. The clean-tree assertion — strong enough for the stray, over-broad as written

As asked: **yes, it catches the leftover it exists to catch.** `git status --porcelain` reports an
untracked file as `?? path`, and nothing under `extensions/` is gitignored —
`git check-ignore -v extensions/notes.ts extensions/other/index.ts extensions/jefferson/rows.ts`
returns nothing (exit 1, `.gitignore` covers only `node_modules/`, `.DS_Store`, `*.tgz`, `.pi/`).
`git diff --exit-code` covers a modification to a tracked file. So a stray `.ts` left under
`extensions/` cannot slip past the pair.

The defect is the other direction. The assertion is written as **"`git status --porcelain` prints
nothing"** for the *whole* tree, and the whole tree is not clean at the moment the step runs. Now,
on this checkout, it prints:

```
$ git status --porcelain
?? openspec/changes/code-structure/
```

and mid-implementation it would additionally print the change's own edits (the staged rename, the
`pi` field, the rewritten `ci.yml`, the repointed test import). 4.4's sibling assertion —
`git diff --exit-code` on `package.json`, `tsconfig.json`, `.github/workflows/ci.yml` "exits 0" —
has the same problem: those three files carry this change's edits. An assertion that is never
satisfiable trains the reader to skim past the output that would reveal a real stray. It should be
scoped to the thing it is checking. New finding **N3**.

### 3. The plan-level sections — present, sourced, and shaped

**Present and pointed at their sources, not restated wholesale.**

- **Goal** — a table of the eight requirements as observable criteria, each with the step that
  shows it, closing "This table adds no criterion of its own; `spec.md` is the contract." The
  eight rows match `spec.md`'s eight `### Requirement:` headings one-for-one, and every row cites
  a step that exists.
- **Scope Out** — per `proposal.md` ("Out of scope") and `design.md` (*Non-Goals*), citing both.
- **Sequencing** — five ordered constraints with a stated reason each (e.g. "Run 5.1 before 3.1
  and discovery scans `extensions/` by convention instead — it would prove the wrong mechanism and
  still pass"). Present.
- **Architecture** — "`design.md` D1–D6 is the architecture", then a component → decision → step
  map, and a pointer to Context properties 1–3 rather than a re-derivation. Present.
- **Boyscouting** — states none found and gives the reason (tree size, the absence grep, the file
  count) rather than omitting it.

**Per-step shape is now present with reasons where n/a.** All fifteen steps carry a
`Shape — **Test / **Boundary cases** / **Impl** / **Logging** / **Error handling**` line, and
every `n/a` carries a reason ("a `git mv` changes a path, not behavior"; "a doc comment is prose
and cannot be mutation-tested"). Good.

One thing I did not treat as a finding, because it is not what this round was scoped to, but the
parent may want it: the steps→Sequencing walk leaves **3.2** unplaced. Sequencing names 3.1, not
group 3, so 3.2 (verify `files`/`tsconfig`/`peerDeps` unchanged) has no row and is an orphan under
the bar's "every step accounted for". Its placement is obvious and harmless; naming it in
Sequencing closes it.

## New findings

**N1 (blocking) — 5.1's stated red outputs cannot be produced by 5.1's own command.**
The command reads `ext.commands` before it checks `ext`, so on both red inputs it throws
`TypeError: Cannot read properties of undefined (reading 'commands')` and prints nothing. The step
tells the implementer to observe `count: 0` with `errors: []` (and, for the syntax error, the
`errors` entry with `path` = `<repoRoot>/extensions/jefferson` and message beginning `Failed to
load extension:`). Neither is observable from the script as written. Required change: reorder the
`console.log` lines above the handler call (and/or guard `ext`), then the asserted reds are what
the command prints — verified: with the logs moved first, the wrong-manifest input prints
`count: 0` / `errors: []` and the syntax-error input prints `count: 0` and the `errors` entry with
the stated path and message.

**N2 (concern) — the claim that 5.1 now proves the deleted 3.3's aim is not supported.**
The deletion note says the claim 3.3 aimed at ("the manifest is the single load mechanism") "is
now proven observably in 5.1." It is not. 5.1 uses `discoverAndLoadExtensions(["."], ".", …)`.
That resolver never reaches `extensions/`'s contents: `resolveExtensionEntries(repoRoot)` takes the
manifest entry when a `pi` field is present, and `discoverExtensionsInDir(repoRoot)` — the fallback
— scans the *repo root* and asks `resolveExtensionEntries("extensions/")`, which is null. So the
stray test passes for a reason unrelated to the manifest, and cannot fail for the reason it is
written to test. Measured, strays present:

```
pi field present   → discoverAndLoadExtensions(["."]) → count: 1  (jefferson)
pi field removed   → discoverAndLoadExtensions(["."]) → count: 0  (not the strays)
pi field present   → collectPackageResources(root)     → [jefferson/index.ts]
pi field removed   → collectPackageResources(root)     → [jefferson/index.ts, notes.ts, other/index.ts]
```

The auto-scan of `extensions/`, and the `["./extensions"]` hazard the design warns about, live in
`collectPackageResources` — the function 5.1 does not call. So the stray test pins the manifest
*value*, and demonstrates requirement 2's "source outside the load root" scenario *for the loader
API*; it does not demonstrate the manifest-branch bypass. Required change: restate the step's
claim to what the test shows (the manifest value resolves to the declared directory and nothing
else loads), rather than asserting the auto-scan bypass — that property is established from the
host source, as design Context property 1 says, and need not be re-proven here. This does not
weaken safety: the failure mode needs a manifest the CI pin (4.1) already refuses.

**N3 (concern) — the clean-tree and untouched-file assertions are unscoped.**
4.3 ("`git status --porcelain` prints nothing and `git diff --exit-code` exits 0"), 4.4 ("`git
diff --exit-code` on those three exits 0", "`git status --porcelain` prints nothing"), and 5.1
("`git status --porcelain` prints nothing") all assert a fully clean tree, but each runs mid-change
with this change's edits present — measured now, `git status --porcelain` prints
`?? openspec/changes/code-structure/`. The assertion is unsatisfiable as written, and an
unsatisfiable clean-tree check is one the implementer learns to read past, which is exactly the
leftover it exists to catch. Required change: scope it to what each step created — e.g.
`git status --porcelain -- extensions/` (prints nothing), plus `git diff --exit-code --
package.json` (or the specific file) for the revert.

## Relied-on, not proven here

- The D3 guard's four refusals are correct against real pack output for the inputs I ran (4.2
  green; 4.3 red on the `files` edit; 4.4 green with an added module). I did not run the YAML
  itself through a workflow parser (4.1's "the workflow YAML parses"); the inline node script is
  syntactically valid, which I did check.
- `pi -e` requires a configured provider, as the step says; this environment has one, so green was
  observable. On a host without a provider the green would fail for an unrelated reason — the step
  already says so.
- The artifact-check override still holds: every path it reports
  (`extensions/jefferson/index.ts`, `extensions/jefferson/rows.ts`, `extensions/notes.ts`,
  `extensions/other/index.ts`) is one this change creates — two of them only transiently — so no
  line cites a path that should exist now.
