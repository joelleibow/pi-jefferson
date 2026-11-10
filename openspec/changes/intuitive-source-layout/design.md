# Design

Sources: [R] `owner-rulings.md`; [CN] `council.md` (its "Joel's rulings" override the advisors); [E heading] `research-eleanor.md`, and [E A1 §n] its Addendum 1; [A n] `research-audit.md`; [M §n] `michael-orientation.md`; [SPEC] this change's delta spec. Line numbers are the tree at `92f5d9d`.

## Context

`proposal.md` holds the motivation. What the design starts from:

- Twelve shipped source files. `visuals/` holds six of them [E Source inventory]. ADR 0005 defines `visuals/` to include the format language, the width plan and the binding, so by that ADR they are visuals [M §1]. Joel's complaint is that the placement does not say what each is [R].
- All seven instruments are declared in `visuals/instrument.ts`; only `blank` is exported [E A1 §5]. The bar has no file. It is the `$bar` branch of `resolveFormat` in `visuals/format.ts:196-206`, with the thresholds at `:37-38` [E A1 §1].
- Nothing pins a deep layout except the specs and ADRs: `files` ships `extensions`, `pi.extensions` names one file, `tsconfig` includes `extensions/**/*.ts`, and CI asserts invariants, not a list [E What pins the layout; M §2]. So any nesting under `extensions/jefferson/` needs no manifest or CI edit.
- 40 specifiers in `tests/` name source paths (22 static, 18 dynamic), and `tests/jefferson.test.ts:315-370` pins export keys [M §2; E A1 §6].

The layout is Joel's tree, word for word [CN, ruling 2]. This design carries it out and proves it changes nothing.

## Goals / Non-Goals

**Goals:**

- The tree in D1, with every file where Joel put it.
- One file per instrument, with room for `branch`, `session` and `status` [R].
- The bar in its own file, free of any other responsibility [CN, ruling 1].
- No behavior change, shown by the checks in D7 and not asserted.

**Non-Goals:**

- Moving or renaming anything outside `visuals/`: `jefferson.ts`, `startup.ts`, `configuration.ts`, `footer-setup.ts` and `data/` keep their paths [CN, ruling 2].
- Splitting `configuration.ts` (345 lines, three jobs [E Source inventory]). It sits where Joel put it, and the living requirement "Each responsibility has a home" lets a file stay whole when the design says so. It stays, and what would change that is a future change adding a fourth job to it.
- Fixing `width-plan.ts` restating `Distribution` and `Alignment`. Fixing it revises ADR 0007 [M §1].
- Audit findings 2 to 6 and the two smaller items. They go to the board [R, "The audit"; proposal].
- A registry, container or injection seam. Separation uses plain imports [SPEC, living "Separation uses plain imports"; R 2026-11-06].
- Using the word "component" for anything but paths. pi-tui's `Component` keeps its meaning in `row-renderer.ts` and `footer-setup.ts` [CN, "A fact he was told"].
- Renaming test files. Six of seven share a stem with a source file [M §2]; the spec permits renames, but each one enlarges the diff the proof must read.

## Decisions

### D1. The tree

Source: [CN, ruling 2]. Beaten: the council's tree (`instruments/` and `row/` directly under `jefferson/`, `shipped.ts` inside `instruments/`, the bar inside `format.ts`) [CN, "Synthesis"]; a flat tree and one grouped by feature, both of which comparable packages use [E-chidi: C §2, §4].

```text
extensions/
├── jefferson.ts
└── jefferson/
    ├── startup.ts  configuration.ts  footer-setup.ts   (unchanged)
    ├── format.ts                      the format language every instrument shares
    ├── shipped.ts                     the shipped instruments, and lookup by name
    ├── data/                          (unchanged)
    └── components/
        ├── instruments/   instrument.ts  instrument-binding.ts  compact-count.ts
        │                  blank.ts  model.ts  thinking.ts  path.ts  context.ts  tokens.ts  cost.ts
        │                  (branch.ts  session.ts  status.ts arrive with the paused change)
        ├── row/           row.ts  width-plan.ts  row-renderer.ts
        └── visuals/       bar.ts
```

Membership, by Joel's frame [R, "How he sees the code"]:

- **`jefferson/` itself.** The process flow (`startup.ts`, `configuration.ts`, `footer-setup.ts`) and the logic many parts share (`format.ts`, `shipped.ts`).
- **`data/`.** What the footer knows about the session, and how it is updated.
- **`components/instruments/`.** Everything that makes an instrument: the contract, the binding of a configured label, format and style to it, the one number formatter two instruments share, and each instrument.
- **`components/row/`.** The row's types, its width plan and its renderer. They belong to the row.
- **`components/visuals/`.** A visualization an instrument can mix in. It holds one file, which ADR 0005 would reject ("a directory that owns a single file does not exist" [M §1]). That exception is Joel's call, made because he expects more visualizations [CN, "What it settles"]. D10 records it.

`visuals/` as a top-level directory is gone. "Visuals" the responsibility in the living spec (the fifth of the five homes) maps to `format.ts`, `shipped.ts` and `components/`. No living requirement names the directory, so none is modified [SPEC].

### D2. Every move

Each row answers: what did a reader look for, where did they look, where is it now? Moves are `git mv` and happen in commit 1, with only import specifiers and comments edited (D9).

| Old path | New path | What a reader looked for, and where they will now find it |
|---|---|---|
| `visuals/format.ts` | `format.ts` | "Where is `$model`, the modifiers, the styles?" It was filed under a word that suggests drawing; it parses and resolves a language. Now it sits at `jefferson/` beside the other shared logic, where Joel's frame puts it. |
| `visuals/instrument.ts` | `components/instruments/instrument.ts` | "What is an instrument?" The contract is now first in the directory of the instruments. Commit 2 trims it to the contract. |
| `visuals/instrument-binding.ts` | `components/instruments/instrument-binding.ts` | "How does a configured label, format and style attach to an instrument?" It wraps an instrument, so it sits with them. |
| `visuals/row.ts` | `components/row/row.ts` | "What is a row and a cell?" With the logic only the row uses. |
| `visuals/width-plan.ts` | `components/row/width-plan.ts` | "How wide is each cell?" Joel named it as belonging to the row [R]. |
| `visuals/row-renderer.ts` | `components/row/row-renderer.ts` | "Where are the rows clipped, padded and gapped?" Same. |
| the `$bar` drawing in `visuals/format.ts:196-206` and `:37-38` | `components/visuals/bar.ts` | "Where is the progress bar?" It had no file; Joel could not find it [R]. It is now a file with the bar's name (D5). |
| the instruments in `visuals/instrument.ts` | one file each, and `shipped.ts`, `compact-count.ts` | "Where does `cost` get its text?" `components/instruments/cost.ts` (D3). |
| `jefferson.ts`, `startup.ts`, `configuration.ts`, `footer-setup.ts`, `data/*` | unchanged | Moving them buys no sentence for the reader [CN, "Rejected"] and Joel's tree leaves them [CN, ruling 2]. |

Comments naming a moved path (`extensions/jefferson.ts:5-7`, `startup.ts:3`, `width-plan.ts:7` [M §2]) are updated in commit 1. Comments are outside the line multiset in D7. The stale comment at `tests/jefferson.test.ts:18-20` is not touched [M §2].

### D3. The instrument split

Source: [R, "One file per instrument"]; the declarations and their dependencies are [E A1 §5]. Beaten: leaving one file and an index of seven (Joel ruled against it); `compactCount` inside the contract (the council's accepted point is its own file, because two instruments use it and it is not part of the contract [CN, differences table]).

What lands where:

| File | Holds | Becomes an export |
|---|---|---|
| `instrument.ts` | `Instrument`, `InstrumentDeclaration` (types), `DEFAULT_CELL_TEXT`, `FOUNDATIONAL_OPTIONS` | `FOUNDATIONAL_OPTIONS` (used by all seven) |
| `compact-count.ts` | `compactCount` and its four limit constants, which only it uses | `compactCount` |
| `blank.ts` | `blank` | none new; `blank` was exported |
| `model.ts`, `path.ts`, `cost.ts` | the declaration; `path.ts` also imports `basename` | `model`, `path`, `cost` |
| `thinking.ts` | `thinking` and `THINKING_FG` | `thinking` (`THINKING_FG` stays private; only `thinking` uses it) |
| `context.ts`, `tokens.ts` | the declaration, importing `compactCount` | `context`, `tokens` |
| `shipped.ts` | `SHIPPED` (private) and `instrumentNamed` | none new; `instrumentNamed` was exported |

Eight declarations become exports: `FOUNDATIONAL_OPTIONS`, `compactCount`, `model`, `thinking`, `path`, `context`, `tokens`, `cost`. The union of runtime exports goes from 22 [M §2] to 31 with `drawBar` (D5): 22 + 8 + 1. `blank`, `instrumentNamed` and `DEFAULT_CELL_TEXT` keep their names and change file or stay.

`DEFAULT_CELL_TEXT` stays in `instrument.ts`. Only `blank` uses it, but tests import it from there [E A1 §5], and moving it buys nothing a reader looks for. Beaten: moving it into `blank.ts`.

**Why the exports are safe.** The living spec forbids any export that lets third-party code supply or replace cell content [SPEC, living "The export surface stays free…"]. None of the eight is a function that accepts a declaration, and `SHIPPED` stays private: `instrumentNamed` is the one lookup and it reads only that table (`statusline`: "Cell content comes from an instrument"). The name scan `/register|supply|contribute/i` at `tests/jefferson.test.ts:349-363` covers every new file.

**The pin.** The test gains an exact-keys assertion for each new file: `compact-count.ts`, `blank.ts`, `model.ts`, `thinking.ts`, `path.ts`, `context.ts`, `tokens.ts`, `cost.ts`, `shipped.ts`, `components/visuals/bar.ts`, and `instrument.ts` (which was scanned, and now has two values to pin: `DEFAULT_CELL_TEXT`, `FOUNDATIONAL_OPTIONS`). The existing exact-key entries keep their keys and change specifier [E A1 §6]. The scan loop covers the new files too. The union before and after is compared, not only each file [M §2].

Tests that import `blank` or `instrumentNamed` from `instrument.ts` (`tests/instrument.test.ts:55,196-198,234-235`, and the pin) now import from `blank.ts` and `shipped.ts`. These are import lines, which the spec allows [SPEC, living "The existing tests are the proof…"].

### D4. `shipped.ts` at `jefferson/`

Source: [CN, ruling 2] places it there; the council's reason still stands: if the table lived in `instrument.ts`, the contract and each instrument file would import each other, and the import-graph check rejects the cycle [CN, "Synthesis"]. At `jefferson/` it is imported by `configuration.ts` and imports the instruments, and nothing in `components/instruments/` imports it. Beaten: `catalog.ts` (pi.dev's word for the package gallery [CN, differences table]); the table inside `instrument.ts`.

### D5. The bar extraction

Source: [CN, ruling 1] and Joel's words: it is "a component that an instrument can mix in", used by the default `context` instrument and open to users through `$bar`, and it must stand independent because a future spec changes it. Beaten: keeping it in `format.ts` with a header and section heading (both advisors, overridden by Joel); a `bar.ts` holding only the drawing while the thresholds stay in `format.ts` (the thresholds are the bar's, so it would still be split).

**What moves out of `format.ts`:**

- `WARNING_PERCENT` (70) and `ERROR_PERCENT` (90) [E A1 §1], private in `bar.ts`.
- The filled-portion rule (`filled`, `format.ts:201`).
- The threshold color choice (`filledStyle`, `:202-203`).
- The glyph strings `"█"` and `"░"` and the dimming of the unfilled part (`:204-205`).

**What stays:**

- The `{ kind: "bar" }` segment and the parse of `$bar`, including the check that the instrument declares `bar` (`:68`) [E A1 §3]. Placing the bar is the format language's job [CN, conductor's reading].
- The measuring of the width: `nonBar` and `barWidth` need `pieces`, which are the format's [E A1 §2].
- The call `declaration.bar!(readings)` for the percent. `InstrumentDeclaration.bar` is the datum hook the instrument supplies, and `format.ts` already holds the declaration.
- `styledPiece`, which the rest of the format language also uses.
- The `fills` line in `instrument-binding.ts:32` (`declaration.fills === true || segments.some(...bar)`). It reads the parsed segment list and decides whether the cell takes the row's spare columns. That is layout, driven by a format the user wrote, and moving it would make the binding import the bar to ask one question of format's output. See Open Questions: the ruling's phrase "fill rule" has a second reading.

**The seam.** `bar.ts` exports one function:

```ts
export function drawBar(barWidth: number, percent: number | null, style: ThemeStyle): [BarPart, BarPart]
// BarPart = { text: string; style: ThemeStyle }; the filled part first, then the unfilled
```

`format.ts` computes `barWidth` and `percent`, calls `drawBar`, and applies `styledPiece(part.text, part.style, theme)` to each part, joining them. The bar takes its width and its percent as plain numbers, so it needs no theme, no pi-tui and no other file of the package. It imports only the `ThemeStyle` type from the host package `format.ts:2` already imports it from. That is what "independent of anything else's responsibility" requires [CN, ruling 1], and it is why the bar returns parts rather than calling `styledPiece`: calling it would import `format.ts` from `bar.ts` while `format.ts` imports `bar.ts`, a cycle. The parameter keeps the name `barWidth`, and `filled` and `filledStyle` move verbatim, so the lines stay recognizable in the diff.

**Byte-for-byte.** The old branch built `styledPiece(filledText, filledStyle, theme) + styledPiece(emptyText, {...style, dim: true}, theme)`. The new one calls the same function with the same three arguments per part, in the same order, and concatenates. The text is the same by construction, and the existing tests prove it by running (D7 item 1). Whether those tests exercise both thresholds is not known: [E] does not say. The rule for commit 3 is a mutation check. Derek changes `WARNING_PERCENT` to 71 and `ERROR_PERCENT` to 91 and shows a test fail. If none does, the tasks add a characterization test at 70, 71, 90 and 91 percent that passes on the unextracted source first.

The export grows by one name, `drawBar`, pinned with the others (D3). The new line multiset differs from the baseline in these lines, which D7 names: the two `styledPiece` lines of the old branch, the old `bar =` assignment, and the new function's signature and return.

### D6. Import directions

Source: the rules are the delta spec's "Imports between the homes run one way"; the base rules are ADR 0001 and ADR 0005 [M §1]; the edges are today's graph [E Import graph] moved onto the new paths. They describe the graph, and the graph check in D7 verifies them; they are not enforced at runtime, as Joel's "import the files you need" rules [CN, "Synthesis"].

Edges after the change (a "(type)" edge is `import type`):

```text
jefferson.ts            → startup
startup                 → configuration, data/session-data-feed, footer-setup
configuration           → shipped, format, components/row/row, components/instruments/instrument-binding
                          (and instrument.ts, if it uses a name from it)
footer-setup            → components/row/row-renderer, components/row/row (type), data/session-data-store (type)
shipped                 → instruments/instrument (type), the seven instrument files
format                  → components/visuals/bar, instruments/instrument (type), data/session-data-store (type, D8)
instrument-binding      → instrument (type), format
instrument files        → instrument, compact-count (context, tokens), data/session-data-store (type)
instrument              → data/session-data-store (type)
row                     → instruments/instrument (type)
row-renderer            → row, width-plan, data/session-data-store (type)
width-plan, bar, data/session-data-store, compact-count → no local imports
data/session-data-feed  → data/session-data-store
```

Which names `configuration.ts` takes from `instrument.ts` and which from `shipped.ts` is not stated in [E], so the edge list above is the expectation and the graph script's output on the real tree is the record.

**No cycle.** Every arrow runs from a file toward one with fewer outgoing arrows, ending at the files with none:

- `bar` imports nothing local.
- `format` → `bar`, `instrument`, the store. `instrument` → the store. Neither imports `format`.
- `instrument-binding` → `format`. `format` does not import the binding.
- `shipped` → the instrument files. No instrument file imports `shipped`. That absence is the reason `shipped.ts` is its own file (D4).
- `row` → `instrument` (type). `instrument` does not import `row`.
- Nothing in `components/`, `format.ts` or `shipped.ts` imports `startup`, `configuration`, `footer-setup` or the entry.

Between directories, `format.ts` and `components/instruments/` import each other's files in opposite directions (`format` → `instrument.ts` type; `instrument-binding` → `format`). The rule in ADR 0001 is about files [M §1], and no file closes a loop. The check reports a file cycle if one appears.

### D7. The proof of no behavior change

Source: [M §2], carried into the delta spec's "The change carries the proof…". Each item is output attached to the pull request. The baseline [M, measured at `3bfd157`]: 317 tests, 20 edges, 946 lines, prefix `133e899b93fcb35d`.

1. **Tests.** `pnpm typecheck` and `pnpm test` pass with 317 of 317. `git diff -U0 main -- tests/` holds only specifier lines, new import lines for relocated names, and the pin.
2. **Export union.** The sorted union of runtime exports is the 22 names plus the 9 in D3 and D5, and nothing else.
3. **Line multiset.** The sorted multiset of shipped non-import, non-comment lines, by the command in [M §2]. Expected after each commit:
   - Commit 1 (moves): hash `133e899b93fcb35d`, byte for byte.
   - Commit 2 (split): identical after stripping a leading `export ` from each line. The eight new exports are the only edits; the check shows it.
   - Commit 3 (bar): the differences named in D5, and only them.
   - Commit 4 (finding 7): the removed alias line or lines, and nothing else.
4. **Import graph.** The script shown catching three planted mistakes (a cycle, an import of the entry, a specifier without `.ts`), then run on the real tree: no cycle, no import of the entry, every specifier ends in `.ts`, and the edge list equals D6's or each difference is explained [SPEC, living "The import graph is shown acyclic"].
5. **Tarball.** `pnpm pack --dry-run --json` before the pull request, because a merge releases [M §2]: every shipped source file under `extensions/`, plus `package.json`, `README.md` and `LICENSE`, and nothing else. Today's 12 source files become 22: ten are new (`bar`, `shipped`, `compact-count` and the seven instrument files), and `instrument.ts` stays as the contract.
6. **`lodash-es`.** `rg -n lodash extensions/` shows only per-function `lodash-es/<fn>.js` imports in `format.ts` [ADR 0004].
7. **Rename similarity.** `git diff -M --stat` on commit 1 shows each move at or above 90%. A small file whose specifier edit drops it below is named. `row.ts` is 23 lines and is the likely one [E Source inventory].

### D8. The two riders

- **Audit finding 7.** `format.ts` deletes its private `Readings` alias (`:10`) and imports `Readings` from `data/session-data-store.ts` as a type [A 7; E Source inventory]. The living spec already lets visual files import the data home's types [SPEC, living "Data and its updates do not depend…"]. Proof: `pnpm typecheck` and the multiset difference in D7. Beaten: leaving it (the proposal routes it here).
- **The `release.yml` line.** The release job gains `if: github.ref == 'refs/heads/main'` [A 1; R "The audit's must-fix rides along"]. No requirement covers it and no task claims behavior for it. Proof: the one-line diff. It does not touch the source or the manifest.

### D9. Commit order

Source: [CN, accepted points]. One kind of change per commit keeps each reviewable, and moving before splitting keeps `git log --follow` on the contract [CN, differences table; M §2].

1. `git mv` of the six files, with specifier and comment edits only.
2. The instrument split: each declaration exported and pinned.
3. The bar extraction.
4. Audit finding 7.
5. The `release.yml` line.

Each commit passes `pnpm typecheck` and `pnpm test`. The pull request is squash-merged, so the order helps review and not `main`'s history [M §2].

### D10. ADR 0005's revision

Source: [CN, "Accepted"]. A new ADR, number 0009, written in the docs pass. It revises ADR 0005's `visuals/` bullet (`:35-36`) and its import sentence (`:37-38`) [M §1], and leaves ADR 0005's body unedited. It records:

- the tree in D1 and the import directions in D6;
- `components/visuals/` as the exception to "a directory that owns one file does not exist" [M §1], as Joel's call;
- that ADR 0007's sentence "a pure function under `visuals/`, the width plan" now reads `components/row/` and the width plan still imports nothing [M §1], so ADR 0007 stays true.

One decision, one ADR: the layout. The bar's independence is part of it, not a second decision. Beaten: editing ADR 0005 (an accepted ADR's body is never edited).

### D11. The paused change

`instruments-for-every-datum` differs from `main` only under `openspec/changes/`, so a rebase has no conflicts [M §2]. By a search of its files for the layout's file names, its approved `design.md` cites only `startup.ts` (`:8, :34`) and `footer-setup.ts` (`:47`), and neither moves. So it does not re-open PL4. Its other files cite these paths, which change:

| Cited path | New path | Cited in |
|---|---|---|
| `extensions/jefferson/visuals/instrument.ts` | `extensions/jefferson/components/instruments/instrument.ts` for the contract; each instrument in `components/instruments/<name>.ts`; the lookup in `extensions/jefferson/shipped.ts` | `research-eleanor.md`, `michael-orientation.md` (`instrument.ts`) |
| `extensions/jefferson/visuals/instrument-binding.ts` | `extensions/jefferson/components/instruments/instrument-binding.ts` | `research-eleanor.md` |
| `extensions/jefferson/visuals/row-renderer.ts` | `extensions/jefferson/components/row/row-renderer.ts` | `research-eleanor.md` |
| `extensions/jefferson/visuals/format.ts` | `extensions/jefferson/format.ts` | `research-eleanor.md`; `michael-pl4.json` (`format.ts`) |
| `visuals/` (the directory) | `components/` | `michael-orientation.md` |

These are evidence reports and a verdict, not the contract, so the paused change refreshes them when it resumes. Its D8 test expectations (an instrument count of seven; the width-0 against width-200 list of six [M §2]) relocate with the split. `branch`, `session` and `status` become three files in `components/instruments/` and three entries in `shipped.ts`. Paths under `data/`, `startup.ts` and `footer-setup.ts` are unchanged.

### D12. The docs pass

Not tasks [Michael's tasks gate]. Bambadjan writes them after the implementation gate. The files and what each holds:

- `ARCHITECTURE.md`: the parts map (lines 9-17, which lump six files into one line, and 89-99 [M §2]) becomes the tree in D1.
- `AGENTS.md` "Adding an instrument" (`:20, :28` [M §2]): one new file in `components/instruments/` and one entry in `shipped.ts`, not one declaration in `visuals/instrument.ts`. The command and the width-0 test rule are unchanged.
- `README.md:211-212`: a path it names.
- ADR 0009 (D10); ADR 0007's `visuals/` sentence stays true by that ADR.

## Risks / Trade-offs

- **[Risk] The split gives up `git log --follow` for each instrument's lines** [M §2]. → Commit 1 moves before commit 2 splits, so the contract keeps its history. The per-instrument lines lose theirs permanently; the squash-merge keeps no per-commit history anyway.
- **[Risk] A moved line is changed in passing and the multiset hides it.** → D7 item 3 states the permitted difference after each commit.
- **[Risk] A threshold test is missing, and the bar drifts.** → The mutation check in D5, with a characterization test as the fallback.
- **[Risk] Eight new exports widen the surface.** → D3 argues each against "Cell content comes from an instrument", pins each, and scans each name.
- **[Risk] `components/visuals/` is a single-file directory.** → Joel's call; D10 records it. A reader can reverse it by moving one file.
- **[Trade-off] More files and directories for a footer that has seven instruments.** Michael's challenge was that this is ceremony unless each move answers a reader's search [M §4]. D2 gives that answer for each. Joel chose the granularity: "A bit more granularity and not as generalized" [CN, ruling 2].
- **[Risk] The release publishes on merge** [M §2]. → The tarball check runs locally before the pull request.

## Migration Plan

No data, configuration or user step. Five commits in the order of D9, each green. The pull request carries the proof outputs of D7. The release label is Joel's call; the council recommends a patch [CN]. Rollback is reverting the pull request: the layout changes no behavior and no stored data.

## Open Questions

1. **What "fill rule" meant in Joel's bar ruling.** He listed "its drawing, its fill rule and its threshold colors" [CN, ruling 1]. D5 moves the filled-portion computation and leaves the `fills` line in `instrument-binding.ts:32`, which Michael also called the fill rule [M §1]. If Joel meant that line, a one-line helper would move and the binding would import `bar.ts`. It would not change the tree or the specs. For Michael's design gate to confirm.
2. **The release label** (patch or other) [M §3 item 4]. Joel's call at merge.
