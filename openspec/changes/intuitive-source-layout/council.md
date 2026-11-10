# Council Synthesis

Two advisors ran, each launched with `context: "fresh"` and reading only the change directory's artifacts:

- `council-neil` (cost), run `8b4ec794-cdb6-418c-8cec-8c38d334b0d8`
- `council-matt` (correctness), run `caee0dac-5724-44e9-bf5a-ea95a3a780e9`

There was one pass. Pass 2 was not run: the two trees match apart from two file names and one helper's home, and all three are the conductor's to settle.

## Question and Scope

The question was what source layout for `extensions/jefferson/` lets a reader tell what lives where and why, under two of Joel's rulings: one file per instrument, and his frame of logic many parts share against logic that belongs to one part. The layout must change no behavior and must leave room for `branch`, `session` and `status`.

The advisors worked from `proposal.md`, the delta spec, `research-eleanor.md`, `research-chidi.md`, `research-audit.md`, `michael-orientation.md` and the PL4 section of `michael-the-architect.md`.

## Perspectives & Trade-offs

**Both advisors propose the same structure.**

- **`visuals/` is dissolved.** Its name is the problem Joel named. It holds a format language and a width planner that draw nothing, alongside instrument and row code.
- **Joel's frame becomes the rule for where a file sits.** A file inside a part's directory belongs to that part. A file directly under `jefferson/` is either shared logic or the process flow.
  - `instruments/` holds one file per instrument, the instrument contract, the table of shipped instruments, and `instrument-binding.ts`. That file is Joel's "HOC": it wraps an instrument declaration in its configured label, format and style.
  - `row/` holds `row.ts`, `width-plan.ts` and `row-renderer.ts`, which Joel named as belonging to the row.
  - `format.ts` moves to `jefferson/` itself. The format language is the logic every instrument shares, and its place now says so.
- **Nothing outside `visuals/` moves.** `startup.ts`, `configuration.ts`, `footer-setup.ts` and `data/` stay put. Moving them buys no reader sentence, and it would break the paths the paused change's approved design cites.
- **"component" appears in no path.** `row-renderer.ts` and `footer-setup.ts` import pi-tui's `Component`, so the word would mean two things in one file. Joel's frame comes through in the directory rules instead.
- **The table of shipped instruments gets its own file.** If `SHIPPED` stayed in the contract file, the contract and each instrument file would import each other, a cycle the proof's import-graph check rejects. Both advisors found this independently.
- **The bar stays in `format.ts`.** `$bar` is a token of the format language, not an instrument. Its parse, its fill rule and its drawing are spread across the format file and the binding, so a `bar.ts` holding only the drawing would point a reader to the wrong place. The file's header names `$bar`, and a section heading marks the parse and the drawing.
- **The rules describe the graph, not enforce it,** in line with Joel's "import the files you need where you need them". The proof's import-graph check verifies them.
- **ADR 0005 is revised by a new ADR.** The new ADR supersedes ADR 0005's `visuals/` bullet and its import sentence and leaves ADR 0005's body unedited. ADR 0007's `visuals/` path reference is updated in the docs pass.

**Where they differ (the conductor settles all three):**

| Point | Neil | Matt | Conductor |
|---|---|---|---|
| Name of the shipped table | `catalog.ts` | `shipped.ts` | **`shipped.ts`.** It holds `SHIPPED` and `instrumentNamed`, and its name says which instruments it lists. "Catalog" is pi.dev's word for the package gallery. |
| `compactCount` | in the contract file | its own file once two instruments use it | **`compact-count.ts`.** Both `context` and `tokens` use it, and it is a number-formatting helper, not part of the instrument contract. One job per file. |
| Commit order | not stated | `git mv` first, then the instrument split, then audit 7, then `release.yml` | **Matt's order.** Moving files before splitting keeps `git log --follow` history on the contract, and one kind of change per commit keeps each one reviewable. |

## Synthesis & Recommendation

```text
extensions/
├── jefferson.ts                 the entry pi loads (unchanged)
└── jefferson/
    ├── startup.ts               session start: wires the feed and the footer (unchanged)
    ├── configuration.ts         reads and validates pi-jefferson.json (unchanged)
    ├── footer-setup.ts          registers the footer with pi (unchanged)
    ├── format.ts                the format language every instrument shares: variables, modifiers, styles, $bar
    ├── data/                    what the footer knows about the session (unchanged)
    │   ├── session-data-store.ts
    │   └── session-data-feed.ts
    ├── instruments/             each instrument, and the logic only instruments use
    │   ├── instrument.ts          the contract every instrument implements
    │   ├── instrument-binding.ts  wraps an instrument in its configured label, format and style
    │   ├── shipped.ts             the table of shipped instruments, and lookup by name
    │   ├── compact-count.ts       20.4k-style counts, shared by context and tokens
    │   ├── blank.ts  model.ts  thinking.ts  path.ts  context.ts  tokens.ts  cost.ts
    │   └── (branch.ts  session.ts  status.ts arrive with the paused change)
    └── row/                     the row, its cells, and the logic only the row uses
        ├── row.ts                 row and cell types
        ├── width-plan.ts          how wide each cell is
        └── row-renderer.ts        draws the rows: clip, pad, gap
```

Audit finding 7 replaces `format.ts`'s duplicate `Readings` type with an import from `data/`. The `release.yml` line rides along on Joel's ruling. The release label is a patch: no user can see a layout change, and every merge releases. That is routine and the conductor's call.

## Accepted & Rejected Feedback

**Accepted:**

- the shared structure above;
- the import-cycle point;
- the bar staying in `format.ts`;
- "component" out of paths;
- a new ADR that revises ADR 0005;
- Matt's commit order;
- Matt's risk point: the design must name every declaration that becomes an export and extend the export pin to the new files. Otherwise the proof's check that no source line changed fails.

**Rejected:**

- **A `bar.ts`,** by both advisors. Most of the bar would stay elsewhere, so the file name would mislead.
- **Moving or renaming anything outside `visuals/`.** It buys no reader sentence and forces a re-gate of the paused design.

## Owner Decisions Required

I checked these against `owner-rulings.md`. Joel couldn't find the bar, and "intuitive" is judged by his reading of the tree, so both go to him.

1. **The tree above.** Recommended: approve it as shown.
2. **The bar.** Recommended: keep it in `format.ts`, with the file header naming `$bar` and a section heading over its parse and drawing. The alternative is its own `bar.ts`.

### Joel's rulings

Recorded at PL2, 2026-11-10.

1. **The bar.** He was asked whether the bar should stay in `format.ts` (the council's recommendation) or get its own `bar.ts`. He answered: *"It most definitely doesn't go in format. Why did it ever even end up in format? It has nothing to do with formating? That's just silly. It's a component that an instrument can mix in to help with affordance of the data presented. We're going to be making some changes to it in a future spec so it needs to be independent of anything else's responsibility."*
   - **The ruling:** the bar's drawing, its fill rule and its threshold colors leave `format.ts` for a home of their own that no other responsibility shares. An instrument mixes the bar in. This overrides both advisors.
   - **The conductor's reading:** the format language still parses the `$bar` token, because that is how a user places the bar among prose. His 2026-11-05 ruling made `$bar` a format variable for exactly that reason (archive/2026-11-05-configurable-instruments/owner-rulings.md:22). Placing the bar is the format language's job. Drawing it is the bar's. He confirmed the purpose of `$bar` the same day: *"$bar in a format was solely for users to be able to use it themselves if they see fit. That's all. It's going to be used in our default off the shelf context instrument but some crafty user may find a use for it elsewhere."*
2. **The tree.** The question's preview truncated and he could not see it: *"I can't see the suggestions in this question"*. The tree is re-presented with the bar ruling applied. Open.
