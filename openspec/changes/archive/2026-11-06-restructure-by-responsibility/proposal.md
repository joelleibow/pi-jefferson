# Proposal

## Why

Joel, 2026-11-06, asked where to start among several things bothering him: *"The repo is a flat directory with everything dumped into it. There's no separation of concerns for handling the startup, loading the config, using it to setup the `setFooter` component that's returned, distinguishing data and data updates from visuals and process flow handling, etc."* (`owner-rulings.md`). He then ruled this the first card of the queue: *"We'll start with the restructure card once you do that."* This change is that card and only that card.

## What Changes

The objective is a repository restructured by responsibility: **startup, config loading, footer setup, and data and its updates kept apart from visuals and process flow.** Each gets one stated home, and the behavior of the extension does not change (`owner-rulings.md`).

What exists today (`research-eleanor.md` §2): one entry, `extensions/jefferson.ts`, and five working parts under `extensions/jefferson/`, each already named for a responsibility. Two shipped files hold more than one of the five:

- the entry mixes startup (the event subscriptions and release), config loading (the two `pi-jefferson.json` paths) and footer setup (the `setFooter` callback);
- `configuration.ts` mixes config loading with binding instruments to their formats, which is visual work.

The other three files each hold one responsibility. The store (`session-data-store.ts`) imports no local file, and `Readings` flows to the visuals as a type only (Eleanor §3).

### Constraints on any solution

Each constraint is stated as a requirement in the delta spec; the sources are:

- **Behavior is preserved.** User-visible output, the `pi-jefferson.json` surface, the `/jefferson` command and the lifecycle through `session_start` and reload do not change (`owner-rulings.md`; `research-chidi.md` §3 on what `/reload` requires of the extension; Eleanor §3 for the install order). The 243 tests that pass today (Eleanor §7) are the proof; their assertions stay (`michael-orientation.md` T3).
- **The load shape is Joel's.** The entry stays a file, `extensions/jefferson.ts`, named by `pi.extensions`, with the working parts under `extensions/jefferson/` (`michael-orientation.md` D-a, citing Joel's 2026-11-01 ruling and its amendment in `archive/2026-11-02-code-structure/council.md`). Working parts may nest below it; the manifest is the allowlist (Chidi §1). Moving the entry, declaring a directory or adding a source root would revise that ruling and go to Joel first (Michael §3).
- **Imports are plain.** *"import the files you need where you need them"* and *"just good discipline"* (`owner-rulings.md`, 2026-11-03); ADR 0001 deleted `WidthHelpers` as that kind of seam (Eleanor §1). Separation adds no registry, container, port or injection seam.
- **Imports name the file and run one way.** Relative imports carry `.ts` and never name a directory (Chidi §5; Michael T4). The existing no-cycle rule holds, and no standing check enforces it, so the change shows it (Michael T5).
- **The no-contribution export pin holds.** `statusline` forbids any API to supply or replace cell content, and a test pins each file's exports (Michael D-e; Eleanor §7). If separation moves exports between files, the pin is rewritten for the new files and argued in the design.
- **Behavior fixed by ADRs 0002 to 0004 carries over untouched**, including `lodash-es` imported per function (Michael D-d; Eleanor §1).
- **Vocabulary.** Joel's 2026-11-03 ruling rejects two words for the statusline concept. Its scope paragraph leaves the `extension-source-layout` spec's own term of art alone, where it means a source file; that spec's existing text is untouched, and this change's prose says "source file" (`owner-rulings.md`).

### Two boyscout fixes

In scope, with no workflow of their own (`owner-rulings.md`: *"Those last 2 bullets should be boyscoutted in and not something that requires a strict workflow."*):

1. **The description.** The GitHub repository description and `package.json`'s `description` are the same sentence and both use the word Joel rejected (Eleanor §6; Michael §3). Both change to the same new sentence: "A starship-style statusline for pi — instruments, a real layout, and per-instrument formatting." `package.json` ships to npm, so the file and the setting change together. The setting is not a file; it is changed with `gh repo edit --description`.
2. **The keyword.** `package.json` `keywords` is `["pi", "statusline", "prompt"]` and gains `pi-package`, the keyword that makes the package eligible for the pi.dev gallery (Chidi §4; Eleanor §6).

### What stays out

Label gap, cell grouping, instruments for every datum pi provides, and thresholds on the context instrument are four separate changes (`owner-rulings.md`). So is any change to what the user sees or to the configuration surface; Michael's consult sends such a change to Joel (§3). The change does not rewrite the existing text of the `extension-source-layout` spec, and it leaves archived changes as they are (Eleanor §5: historical record, not load-bearing).

### The council answered the question

The question was whether Joel's complaint requires splitting responsibilities out of existing files or only moving files into named subdirectories. The council answered it from Joel's recorded words and Eleanor's map: the change **extracts** the mixed responsibilities from the entry and from `configuration.ts`, and does not merely move files into subdirectories (`council.md`; `owner-rulings.md`). The question does not go to Joel. The design must still name the seams it extracts: for each, the files and directories that hold it, what would change each unit, and the import graph. This proposal chooses no layout.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `extension-source-layout`: requirements are **added**; none of the existing eight is revised. The additions fix that the restructure preserves behavior and is proven by the existing tests, that the export pin holds, that each of the five responsibilities has a home recognizable from its path, that data does not depend on visuals, that separation uses plain imports, that relative imports name files, that the manifest names the entry as a file, and that the import graph is shown acyclic. If the design finds an existing requirement it must revise, the revision comes back as an amendment under MODIFIED.

`statusline` and `session-data-store` get no delta. Their requirements are the behavior this change must leave true, and the delta spec cites them rather than restating them.

## Impact

Paths the move touches (`research-eleanor.md` §5):

- `extensions/` (the entry and the five working parts) and every `tests/` import of them, static and dynamic. The export-surface test in `tests/jefferson.test.ts` is the one test that asserts paths.
- `package.json`: `pi.extensions` and `files`, unchanged if the layout stays inside the load shape; `description` and `keywords` change for the fixes.
- `tsconfig.json` `include` and `.github/workflows/ci.yml` (its entry, load-root and allowed-root expectations and the comment naming `extensions/jefferson/`), unchanged if the layout stays inside the load shape. `release.yml` names no source path.
- Documents that name paths and become false if files move: the entry's header comment, `ARCHITECTURE.md`, `AGENTS.md`, `README.md` and the ADRs that name files. The documentation pass owns them; Michael adds that comments citing archived decision numbers travel with moved code and should state the fact instead (T7).
- The GitHub repository description, a repository setting.

No dependency is added or removed, and the published file set changes only by the files the restructure itself adds or moves under `extensions/`.
