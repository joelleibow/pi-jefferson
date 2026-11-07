# Michael — orientation consult (not a gate)

Retained run `b8b5a833-cffe-4d33-b378-3741cf6162ff`, 2026-11-06, written against the tree at `3b364b6` after research landed. A consult records no verdict.

## Answer

Orientation for `restructure-by-responsibility`. I checked this against the tree at 3b364b6, `ci.yml`, `package.json`, `tsconfig.json`, the five working parts, the seven test files and the archived rulings.

## 1. Decisions a restructure must satisfy or explicitly revise

**D-a. The load shape is Joel's ruling.** Source: `archive/2026-11-02-code-structure/council.md`, the ruling of 2026-11-01 and its amendment; design D1, D2 and D5.
- `extensions/jefferson.ts` is the one entry. Joel was offered `index.ts` and kept `jefferson.ts`.
- `extensions/jefferson/` holds the working parts.
- `package.json` declares `"pi": {"extensions": ["./extensions/jefferson.ts"]}`. It names a file, not a directory.
- One package, one extension.
- A layout that stays inside this shape needs nothing from Joel. Moving the entry, declaring a directory or adding a second root revises his ruling.

**D-b. The living spec `openspec/specs/extension-source-layout/spec.md`**, all eight requirements:
- one entry that default-exports a factory;
- a singular load root;
- tests only under `tests/`, never shipped;
- every shipped file covered by `tsconfig` `include` and erasable;
- the tarball asserted by invariant;
- responsibility inferable from the path: no `utils`, `helpers`, `misc` or `common`, and a grouping directory has its membership and dependency rule stated by the change that adds it;
- growth is a named change: a new top-level source directory updates `files`, `tsconfig` and CI together;
- host packages are peer `*`, imports run one way, and there are no cycles.

**D-c. ADR 0001 (2026-11-03) and Joel's 2026-11-03 rulings.** "Import the files you need where you need them" and "just good discipline":
- Any working part may import a host package.
- No entry-only rule, no DI container, no injection seams for tests.
- ADR 0001's Consequences already deleted `WidthHelpers` for being exactly that kind of seam. A restructure must not bring it back under the name of "separation".

**D-d. ADRs 0002, 0003 and 0004** fix behavior that the restructure must carry across byte for byte:
- the allocator geometry;
- the order of the modifier language;
- `lodash-es` imported per function from `lodash-es/<fn>.js`. A move that turns this into an index import or `lodash` passes typecheck and fails `node --test`.

**D-e. The living statusline spec, "no API exists by which third-party code can supply or replace cell content".** It is pinned by exact export lists for each file at `tests/jefferson.test.ts:297-308`:
- entry: `VERSION`, `default`;
- `row-renderer`: `createFooter`;
- `configuration`: `DEFAULT_CELLS`, `MAX_CELLS`, `readConfiguration`.

**D-f. The model in `ARCHITECTURE.md`.**
- The entry decides *when* things run and computes nothing. It owns `pi.on`, the config paths, `setFooter` and the repaint callback.
- The store is created per install with `dispose()`. The `session-data-store` council rejected a module-level singleton, and the reload flow re-imports with `moduleCache: false` (`session-data-store` research-eleanor).
- `ARCHITECTURE.md` is a standing record, not a decision. Where the restructure changes the model, it says so; the docs pass then rewrites the file.

**D-g. The vocabulary ruling.** Source: `archive/2026-11-03-session-data-store/owner-rulings.md`, "Vocabulary" plus its "Scope of that ruling" paragraph, restated in `configurable-instruments`.
- `module` and `widget` never name the statusline concept.
- That record explicitly leaves the layout spec's own term of art alone, where "module" means source file, and says new prose should write "source file".
- **Drift:** this change's `owner-rulings.md` (line 14) paraphrases the ruling as "appear nowhere in … specs" and drops the scope. Correct the paraphrase to quote the scope. The living spec does not get rewritten.

**D-h. This change's rulings (2026-11-06).**
- Only the restructure card. Label gap, cell grouping, new instruments and context thresholds stay out.
- The two small fixes ride inside the change.

## 2. Traps a file move walks into

**T1. The manifest is a path.**
- Renaming or moving `extensions/jefferson.ts` must change three things in the same commit: the manifest, `ci.yml:61-62` (`entry` and `loadRoot`), and the entry's header comment, which quotes the manifest.
- A wrong path fails **silently**: `collectFilesFromPaths` skips it, `/jefferson` disappears and no startup diagnostic appears (code-structure design, Risks).
- Declaring `./extensions` re-enters auto-scan.
- Subdirectories under `extensions/jefferson/` are safe at any depth. The `pi` field takes the manifest branch, so nothing there is enumerated.

**T2. The tarball.**
- `files` is `["extensions", "README.md", "LICENSE"]`, and CI's `allowed` is `p.startsWith("extensions/")`.
- Anything moved outside `extensions/` (a `src/`, say) does not ship, and the published extension breaks at import.
- Tests pass locally either way, because they import from the repo. Only CI's pack step or a real install catches it.

**T3. Test imports, and the proof of "behavior-preserving".**
- Every test imports by relative path (`../extensions/jefferson/<file>.ts`), and four test files reach into two or three source files each.
- The only credible proof the move preserves behavior: test bodies unchanged, and the diff in `tests/` limited to import specifiers and file renames.
- The one deliberate exception is the export-surface pin (D-e). Splitting `configuration.ts` or `row-renderer.ts` moves those lists. The new lists must be argued against the spec requirement in the design, or the gate will read the edit as reshaping the test to pass.

**T4. Import specifiers.**
- Relative imports carry `.ts`.
- A bare `./jefferson` from the entry fails `nodenext` with TS2835 (code-structure D1). The same applies to any new directory that shares its stem with a file beside it.
- Only erasable TypeScript.

**T5. Cycles have no mechanical guard.**
- No madge, lint or CI step checks the spec's no-cycle MUST (I searched `ci.yml`, `package.json` and `tests/`).
- The current graph is acyclic: entry → configuration, row-renderer and store; configuration → instrument and format; format → instrument (type only); row-renderer → configuration and store (type only); instrument → store (type only).
- Splitting configuration (read, parse, bind) or format (parse, style, render) is where a cycle appears. The design must state the graph, and verification must show it.

**T6. Vocabulary.**
- No directory or identifier named `modules/`, `widgets/`, `utils/`, `helpers/`, `common/` or `misc/`.
- Write "source file" in new prose.

**T7. Stale cross-references travel with moved code.**
- Comments cite archived decision numbers, for example `configuration.ts:4-8` (D1, D2, D3, D4, D6, D10).
- Line 8 still describes the retired `import type` host rule.
- A move rewrites these headers anyway, so state the fact rather than the number.

## 3. What needs Joel before design

Nothing, provided the design stays inside D-a: same entry file, same manifest value, working parts (and any subdirectories) under `extensions/jefferson/`.

Three things would go to Joel:
- moving or renaming the entry, or declaring a directory;
- a new top-level source root;
- anything that changes user-visible output or the config surface. That belongs to the other four cards.

The two small fixes are already ruled "boyscouted in, no workflow". The replacement wording for "modules" is the conductor's to draft and Joel sees it in the PR. The same "modules … per-module" string is also `package.json`'s `description`, which ships to npm. I would fix both in the same commit, since it is one sentence in two homes, and add `pi-package` to `keywords`.

## 4. The strongest challenge to the change as stated

The tree is not literally flat. It is one entry plus five working parts, each already named for a responsibility. Joel's complaint is about seams *inside* files: startup, config loading, footer setup, and data and its updates versus visuals and process flow.
- **The entry (130 lines)** does the wiring:
  - it adapts `ctx` into store readers;
  - it subscribes and releases events;
  - it resolves config paths;
  - it adapts the footer component.
- **`configuration.ts` (324 lines)** does file I/O, parsing, validation and instrument binding.
- **`instrument.ts`** mixes data resolvers (reads of the store) with render binding.

Two failure modes follow:
- **A cosmetic move.** Files get relocated into subdirectories. That satisfies the words and leaves the complaint intact.
- **An over-correction.** The split brings in layers, ports or injection seams. That violates the 2026-11-03 "good discipline, don't invent" rulings and ADR 0001.

The design should answer with the seams it extracts, one sentence each on what would change each new unit, a stated import graph, and an export surface reconciled with D-e. Each of those must stay testable through the current tests, unchanged except for imports.

## Decided by

Item 1 is settled by recorded decisions: Joel's 2026-11-01 layout ruling and amendment (archive/2026-11-02-code-structure/council.md; design D1, D2, D5); the living spec openspec/specs/extension-source-layout/spec.md; ADRs 0001–0004; the 2026-11-03 vocabulary ruling and its scope paragraph (archive/2026-11-03-session-data-store/owner-rulings.md); this change's 2026-11-06 rulings (owner-rulings.md); and the statusline spec's no-contribution-API requirement as pinned at tests/jefferson.test.ts:297-308. Items 2 and 4 are my reading of the tree at 3b364b6, not decisions.

## Owner

michael

## Follow-up

Strongest open question for design: does Joel's "flat directory" complaint require splitting responsibilities out of the existing files (the entry's wiring, configuration's I/O versus parsing versus binding, instrument's data versus render), or only moving files into named subdirectories? If the research shows the complaint names the seams inside files, the design must say how each split keeps the D-e export surface and the no-cycle rule. I would choose extraction over relocation, and if Bambadjan is unsure which Joel meant, that is the one question worth taking to him.
