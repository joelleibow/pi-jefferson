# Plan gate r4 — `code-structure`

Reviewer: Michael. Gate: plan. Verdict: **approve**.

Round 4, re-run because the owner replaced the layout the earlier plan was built on. Prior verdict:
`plan-gate-r3.md` (`approve`, for the superseded directory declaration). The design gate has approved
the file-entry revision (`design-gate-r3.md`, `design-gate-r4.md`); this round judges the revised
`tasks.md` against the approved `design.md` and the unchanged `spec.md`. The layout ruling is closed;
the shape is `extensions/jefferson.ts` (entry, file) beside `extensions/jefferson/` (working parts).

## What I ran

Master scratch copy at `/tmp/mj-r4-scratch` (repo copy, `.git` removed, the `pi` field added) and
`/tmp/mj-r4-guard` (same, for the CI guard). Pinned host `@earendil-works/pi-coding-agent@1.4.0` in
`node_modules`; the `pi` CLI on this machine is `1.5.0`. Everything below was executed:

- `tasks.md` 4.1's discovery command **verbatim** — green, the stray-module case, the "remove the `pi`
  field" probe, and both reds.
- `tasks.md` 3.2/3.3/3.4's D3 guard verbatim against real `npm pack --dry-run --json` output, plus
  the `.files` read-back and the `shasum` snapshot / `shasum -c`.
- `npm run typecheck`.

Not re-run: the `pi -e` corroboration leg (needs a configured provider; it is corroboration only, and
4.1 already names discovery as authoritative) and the workflow-YAML parse (r3 also relied on it).

## 1. The shape change, end to end

- **No step moves or renames a file.** The former relocation group is deleted; every reference to a
  move is the revision note that records the deletion (`tasks.md` line 11). Group 1 is now
  comment-only.
- **The manifest step names the file.** 2.1 adds `"pi": { "extensions": ["./extensions/jefferson.ts"] }`
  and its read-back prints exactly that. Matches design D1.
- **The header step edits the top of `extensions/jefferson.ts`.** 1.1 replaces the header doc comment
  "at the top of `extensions/jefferson.ts`" with the D2 text; "Change nothing below the comment."
- **The CI step pins `extensions/jefferson.ts`.** 3.1 pins the declared entry's presence
  (`extensions/jefferson.ts`) and `pi.extensions` equal to `["./extensions/jefferson.ts"]`. Matches
  design D3 and spec requirement 6.

No step names a directory where the design names a file. Measured, no pinned value disagrees with the
approved design.

## 2. Coverage of the approved design

Every D-decision and every D6 row has a step:

| Design | Step |
| --- | --- |
| D1 layout + the `pi` field | 2.1 |
| D1's one convention (import names a file, `./jefferson/rows.ts`) | 1.2 |
| D2 header text | 1.1 |
| D3 guard (replace the exact-list step) | 3.1, exercised 3.2 (green), 3.3 (red), 3.4 (ordinary case) |
| D4 directory membership + dependency rule | 1.2 |
| D5 one entry | 2.1 (array holds one), 3.1 (manifest pin) |
| D6 leave-alone surfaces (`files`, `tsconfig` include, `peerDependencies`, test import) | 2.2 |
| Migration plan 4–5 (pack, discovery) | 3.2, 4.1 |

Nothing the design requires is missing. 1.3 (entry still default-exports a factory, registers
`/jefferson`, erasable-only syntax) is an extra check that serves spec requirements 1 and 5 and does
not contradict the design.

## 3. Does the shape change make a step vacuous?

The two tests survive as a real check, and the plan says so plainly. 1.3 keeps
`tests/jefferson.test.ts`'s two tests and states what they now cover: "there is no relocation, so
they stand for the entry's observable behavior — one registered command, the version string, the
notify text — which a comment-only edit must leave identical." That is non-vacuous: they pin the
entry's contract, which the comment-only edit must preserve. I measured the same behavior in 4.1's
green (`commands: [ 'jefferson' ]`, `notified: ["pi-jefferson 0.0.0-alpha — the statusline is not
built yet."]`).

No other step's verification became vacuous. 1.1/1.2's `npm run typecheck && npm test` is the
signal that the header edit stayed comment-only (a stray edit below the comment fails). 2.2's scoped
`git diff` still catches an accidental touch of `tsconfig.json` or the test. 3.2–3.4 each run
against real pack output and still fire.

## 4. Does the shape change make a step unnecessary?

None is strictly unnecessary. The change is smaller only in that the relocation group is gone, which
the plan already deleted. The closest candidates are lighter than they look but each retains a real
check: 1.3 is a behavior smoke check over a comment-only edit, and 2.2 restates the D6 leave-alone
surfaces. Neither is dead weight — 2.2 fails if the implementation accidentally edits `tsconfig.json`
or the test import, and 1.3 fails if an edit below the comment changes behavior.

## 5. What round 3 settled

Both carry-forwards survive the revision:

- **Scoped clean-tree assertions.** 3.3 asserts the revert by reading the field it edited
  (`node -e "console.log(JSON.stringify(require('./package.json').files))"` — measured:
  `["extensions","README.md","LICENSE","tests"]` with the temporary element, `["extensions","README.md","LICENSE"]`
  after). 3.4 isolates its own delta with a `shasum` snapshot / `shasum -c` (measured `OK` for all
  three) plus a path-scoped `git status --porcelain -- extensions/jefferson/rows.ts`. 4.1 asserts the
  stray revert with `git status --porcelain -- extensions/notes.ts extensions/other` and states the
  whole-tree status is expected to list this in-progress change and is not the assertion. All three
  are satisfiable mid-change and target the leftover each exists to catch.
- **Hermetic discovery.** 4.1 still passes an isolated `agentDir` and states that the default is the
  operator's real `~/.pi/agent`. Measured green with the manuscript command: `count: 1`,
  `commands: [ 'jefferson' ]`, `errors: []`.
- **The measured output is right for a file entry.** Confirmed against the host source and by
  execution. `resolveExtensionEntries(root)` returns the manifest path resolved to the file
  (`path.resolve(dir, "./extensions/jefferson.ts")`), and `resolvedPath` is that path. Measured:
  `resolvedPath: /private/tmp/mj-r4-scratch/extensions/jefferson.ts` — the **file**, not the
  directory, exactly as 4.1 asserts. Red 2 likewise reports
  `{"path":"…/extensions/jefferson.ts","error":"Failed to load extension: ParseError: …"}` — the
  **file**. No step still expects a directory.

## 6. Is the plan's proof honest?

Yes. Each guard/command step records how it was measured rather than merely that it passed: 3.2
"Measured in a scratch copy … `shipping: LICENSE, README.md, extensions/jefferson.ts, package.json`,
exit 0"; 3.3 the exact two problems and the read-back; 3.4 the shipped line with the module, the
`shasum -c` result, and the `npm run typecheck` result; 4.1 the green values and both reds with
outputs. The steps that remain prose (1.2) say so and name where the rule becomes executable (3.4)
and compiler-enforced (the import convention).

## Cross-check against the source

`loader.js` `resolveExtensionEntries(dir)` reads `package.json`'s `pi.extensions` and returns the
resolved entries, then `discoverAndLoadExtensions` continues rather than enumerating the directory;
`loadExtension` sets `resolvedPath = resolvePath(entryPath, cwd)`. This is why a file entry reports the
file, why strays under `extensions/` are unreachable on this path, and why removing the `pi` field
collapses to `count: 0` (no manifest, no `index.ts` at the root) instead of the strays — all three
measured, matching 4.1.

## New findings

None. No step moves a file; no pinned value disagrees with the design; the two tests still assert real
behavior and the plan says what they cover; the round-3 carry-forwards survive; and every asserted
output is one I measured.

## Observations (not findings)

- The asserted `resolvedPath` value is correct, but the step's gloss "The API returns the
  manifest-declared path" is loose — the loader resolves the declared path to an absolute path — the
  asserted value is the correct one, so nothing needs changing.
- After this change `extensions/jefferson/` will hold no file until the first module is added, so on
  disk the directory will not exist (git does not track empty directories). Design D4 settles that the
  header states the directory's rule; this is design-consistent and is not reopened here.

## Verdict

**approve.** The plan implements the approved file-entry design step for step, carries no move or
rename, pins `extensions/jefferson.ts` in CI and the manifest, and keeps the round-3 disciplines
(scoped clean-tree checks, hermetic discovery, a file-entry expectation). Every asserted output was
re-measured against the pinned host and matches.
