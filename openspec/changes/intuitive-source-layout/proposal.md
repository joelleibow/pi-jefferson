# Proposal

Sources are cited as [R] `owner-rulings.md`, [C §n] `research-chidi.md` (its numbered Findings), [E heading] `research-eleanor.md`, [A n] `research-audit.md` (finding number) and [M §n] `michael-orientation.md`. A [R] ruling is binding. Nothing here picks a layout; the council and the design do.

## Why

Joel, in his words: *"If a human wanted to review or browse this code, it's not their yet but it's becoming unclear what is where and why it's where it is. That's one of the most important parts of project structure I like to keep. Intuitive by design, if you will."* He asked whether there is room for "a bit of refactoring and organization without changing functionality" [R 2026-11-10, the objective].

It ships before `instruments-for-every-datum` resumes, because that change adds `branch`, `session` and `status` and they need a place to go [R, "It goes first"].

## Today's layout, and what a reader cannot find

Twelve shipped source files: the entry `extensions/jefferson.ts`, five files in `extensions/jefferson/` (`configuration.ts`, `footer-setup.ts`, `startup.ts`, and the two `data/` files), and six in `visuals/` [E Source inventory; M baseline]. ADR 0005 laid them out by responsibility four days before the request [M §4].

Two of Joel's premises do not match the source, and the design must say so instead of inheriting them [M §1]:

- **"Each in one file" is false.** All seven instruments are declared in `visuals/instrument.ts`, and only `blank` is exported [E Source inventory; M §1]. Joel ruled **one file per instrument** [R 2026-11-10, after research]. `branch`, `session` and `status` arrive the same way.
- **The progress bar has no file.** It is the format language's `$bar` segment inside `visuals/format.ts`: parsing at lines 46-106 and drawing at 196-206 [E Where the requested concepts live; M §1]. The fill rule is in `instrument-binding.ts` and the datum hook is `InstrumentDeclaration.bar` [M §1]. Eleanor's drawing range is 192-202; the design confirms the lines against the tree before citing either.

Joel also named `width-plan`, `instrument-binding` and `format` as "not necessarily a visual". ADR 0005 defines `visuals/` to include them [M §1], so the disagreement may be with the word. His frame [R, "How he sees the code"]: logic that many parts share (the format language) against logic that belongs to one part (the row's width plan and renderer belong to the row). He does not know how to represent it and leaves that to the council and design.

`format.ts` (214 lines) mixes format parsing, style validation, string mutation and bar drawing. `configuration.ts` (345 lines) mixes path resolution, parsing and defaults [E Source inventory]. The living spec already requires the design to name any file holding more than one responsibility.

## What Changes

- Source files move, split and are renamed so a reader can tell what each holds and why it sits there.
- One file per shipped instrument, with room for the three the paused change adds [R].
- Shared logic and part-specific logic are separated, in the shape the council and design choose [R].
- The duplicate `Readings` type in `format.ts` becomes an import of the one in `data/session-data-store.ts` [A 7; E Source inventory]. It is structural, and the data-to-visuals import rule already allows it.
- The release job gains `if: github.ref == 'refs/heads/main'`, so `workflow_dispatch` cannot publish an unreviewed branch [A 1]. Joel chose to ride it along in this pull request [R]. It is outside this change's scope and no requirement covers it.
- Not changed: the footer, the `pi-jefferson.json` surface, the `/jefferson` command, the entry path, `pi.extensions`, `files` and the tarball's roots [R, "No behavior changes"; M §3 item 5].
- **BREAKING:** none. Nothing here needs a break [R, "Breaks before 1.0 are cheap"].

## The proof of "no behavior change"

Each item is a check the implementer runs and attaches, not a claim [M §2]:

1. `pnpm typecheck` and `pnpm test` pass (317 of 317 at baseline [E Baseline]), and the diff under `tests/` holds only import specifiers, renames and the export-surface pin.
2. The union of runtime exports is unchanged, or each addition is named and argued. One file per instrument makes six or more existing private declarations exported, so each is pinned and argued against `statusline`'s "Cell content comes from an instrument".
3. The sorted multiset of shipped non-import, non-comment lines is unchanged (baseline: 946 lines, prefix `133e899b93fcb35d`). A pure move passes byte for byte; any identifier rename or extraction fails it and is named in the design.
4. An import-graph script, shown catching three planted mistakes, then run on the real tree: no cycle, no import of the entry, every specifier ending in `.ts` (baseline: 20 edges).
5. `pnpm pack --dry-run --json` lists every shipped source file under `extensions/` and nothing else beyond the three root files, run locally before the pull request because a release publishes on merge [M §2].
6. `lodash-es` is still imported per function from its own path (ADR 0004).
7. `git diff -M --stat` shows each move as a rename at or above 90% similarity.

## The audit's routing

Of the seven findings in [A], two belong here: finding 1 (the release-job line) and finding 7 (the duplicate `Readings`). Joel's ruling: a finding that changes behavior is not in scope and goes to the board [R, "The audit"]. Findings 2 (version script untested), 3 (dead `VERSION` export), 4 (`basename("/")` label), 5 (`lodash-es` replacement, a decision ADR 0004 records) and 6 (action pins), and the two smaller items, go to the pi-jefferson board. Finding 3 would also change the export surface this change must hold fixed.

## Open questions

These are for the council and the design. None is settled here.

1. How are shared logic and part-specific logic named and grouped under Joel's frame, and what does a reader see in the tree that tells them which is which? Comparable packages stay flat or group by feature, and use one file per item only where each item is a registered tool [C §2, §4]; there is no consensus for small codebases [C §4].
2. Where does the bar go: its own file, or findable by name and header inside the format file? A separate file needs a new export and pin [M §4].
3. Does `visuals/` survive, under a new definition, or is it renamed or dissolved? That decides whether the reader's complaint is the word or the placement [M §3 item 2].
4. Is ADR 0005 extended or revised? Moving files out of `visuals/` also makes a sentence in ADR 0007 untrue [M §1].
5. How does the paused change's approved design get its paths updated? It cites `startup.ts`, `footer-setup.ts` and the `data/` files, and a rename re-opens a design that passed PL4 [M §2].
6. Which file does each new directory's membership rule and import rule live in? The living spec requires the change that adds a directory to state both.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `extension-source-layout`: adds the requirements that hold whatever layout is chosen: one file per instrument, the published surface unchanged, and the proof of unchanged behavior. Requirements that depend on the chosen layout wait for the design.

## Impact

- **Code:** shipped source under `extensions/`, and `tests/` for import specifiers and the export-surface pin only [M §2].
- **Docs:** comments and documents that name paths go stale: `AGENTS.md`, `ARCHITECTURE.md`, `README.md`, ADR 0007 and ADR 0005. The docs pass fixes them, not a task [M §2].
- **CI and release:** `release.yml` gains one line [A 1]. `ci.yml`, `package.json` and `tsconfig.json` do not change [E What pins the layout].
- **Published version:** every merge to `main` releases, so this lands as a patch release no user can observe [M §3 item 4]. The release label is Joel's call.
- **Paused change:** `instruments-for-every-datum` rebases without conflicts, since it differs from `main` only under `openspec/changes/` [M §2].
- **Acceptance:** "intuitive" has no test. Joel's reading of the tree, and his own `/reload`, `/jefferson` and footer check in pi, are his to observe [M §3 item 3].
