# Eleanor reconnaissance — reshape-the-configuration

Repository `/Users/joelleibow/Projects/pi-jefferson`, `main` at `24ee86b`; scope is the repository and `openspec/changes/reshape-the-configuration/`. Read the task brief and `owner-rulings.md` in full; owner rulings bind. No source/config edits made. This report records current code, not a design.

## Required project reads

- `AGENTS.md`: read. Its user-facing vocabulary instruction (row holds cells) is now superseded for users by the newer owner ruling; code may keep “cell”. Contains testing/type rules and warnings about preserving architecture.
- `ARCHITECTURE.md`: read. Describes current config parser, normalized rows, runtime renderer and dependencies; it currently says row distribution is configuration input.
- ADRs: `docs/adr/0001`–`0014` exist. Titles read from filenames/content references; relevant detailed passages include ADR 0002 (equal layout), 0007 (content layout and row `distribution`), 0008 (vertical row gap). The owner ruling expressly requires an ADR recording retirement of the user-facing “cell” terminology. Other ADR title inventory: 0001 imports one-way; 0003 format carries modifiers; 0004 lodash mutations; 0005 source by responsibility; 0006 label gap; 0009 components/bar; 0010 variable forms; 0011 injected clock; 0012 composed format; 0013 timed visuals; 0014 backslash escaping.
- Language/build config: `package.json` read. ESM package, Node 26/type stripping, `pnpm test` (`node --test`), `pnpm typecheck` (`tsc --noEmit`), no build; runtime files are extensions, README and LICENSE. `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json` present.

## Parser and source selection

`extensions/jefferson/configuration.ts` is the parser and normalization root. `readConfiguration` selects exactly one file: trusted project `source.projectPath` if it exists, else agent `source.agentPath` (lines 365–369). Project config replaces global config whole; there is no merge. Missing selected file returns a default row, default row gap 1, no warning (369). JSON read/parse error rejects to default row with `pi-jefferson: <path> could not be read or parsed; rendering the default row` (371–382). `RejectedConfiguration` likewise returns default row/default gap/no notice time and `pi-jefferson: <path> was rejected (<reason>); rendering the default row` (393–402). Accepted warning may report legacy `containers` or unknown instrument names (337–350).

Current JSON envelope accepts either one top-level row or `rows` list, not both. `rows` must be an array (284–300); empty list defaults to a single default row (318–320). Each row must currently be an object (231–234), receives synthesized `row-N` id unless supplied (260–267), and rejects invalid/duplicate IDs (325–330). `distribution` defaults to `DISTRIBUTIONS[0]` (`content`) and accepts `content|equal`; malformed values reject whole doc (237–244). `rows` beside top-level `cells`, `id`, or `distribution` rejects (285–289). `rowGap` defaults 1, must be integer 0–3 or rejects (302–315).

Currently row `cells` is optional: absent means ten blank entries (249–257); present must be array, empty array rejects, each member must be object, only `instrument`/`align` keys allowed, instrument required/nonempty string, align optional and defaults `left`; bad shape/key/value rejects (188–228). Unknown instrument name warns and binds `blank`, including names beyond the ten-entry render ceiling; all entries are validated before truncation. `MAX_CELLS=10` (66–67, 223). The owner ruling’s new array-of-entry rows changes this document boundary; entry `instrument` and `align` semantics are rooted in this function.

Top-level `instruments` is optional (89–97); malformed block/value rejects. It configures each declaration once, validating option names, format, label, seconds, composed formats and style (98–172). Notice visible seconds default to declaration `NOTICE_SECONDS`, and only exist if installed rows contain notice (323–324).

## User-visible messages in configuration path

All `RejectedConfiguration` strings in current `configuration.ts` (the wrapper adds path and default-row suffix above):

- `the instruments value is not an object` (93)
- `the instruments configuration for ${JSON.stringify(name)} is not an object` (97)
- `instrument ${JSON.stringify(name)} carries an option its declaration does not have: ${JSON.stringify(key)}` (105)
- `instrument ${JSON.stringify(name)} has a format that is not a string` (109)
- format parser's own `error.message` (115–118)
- `instrument ${JSON.stringify(name)} has a label that is not a string` (124)
- `seconds must be a whole number from 1 to 60: ${JSON.stringify(seconds)}` (130)
- `instrument ${JSON.stringify(name)} has formats that is not an object` (135)
- `instrument ${JSON.stringify(name)}'s formats names a kind it does not carry: ${JSON.stringify(kind)}` (140)
- `instrument ${JSON.stringify(name)}'s formats has a kind whose format is not a string: ${JSON.stringify(kind)}` (143)
- format parser error message (147–150)
- `instrument ${JSON.stringify(declaration.name)} ${error.message}` for style (155–158)
- `row ${index} has an empty cells list` (190)
- `row ${index} has a cells entry that is not an object; declare {"instrument": "model"}` (196)
- `row ${index} has a cell with an unrecognised key ${JSON.stringify(unknownKey)}; a cell carries only instrument and align` (202)
- `row ${index} has a cell with no instrument` (208)
- `row ${index} has an instrument that is not a non-empty string` (211)
- `row ${index} has an align that is not ${orList(ALIGNMENTS)}: ${JSON.stringify(alignValue)}` (214)
- `row ${index} is not an object` (233)
- `row ${index} has a distribution that is not ${orList(DISTRIBUTIONS)}: ${JSON.stringify(row.distribution)}` (241)
- `row ${index} has a cells value that is not a list` (252)
- `row ${index} has an id that is not a non-empty string` (263)
- `the configuration document is not an object` (280)
- `the configuration carries both a top-level row and a rows list` (288)
- `the rows value is not a list` (292)
- `rowGap must be a whole number from 0 to ${MAX_ROW_GAP}: ${JSON.stringify(value)}` (310)
- `two rows share the id ${JSON.stringify(row.id)}` (328).

“Cell” is user-visible in legacy parse errors for cell keys, `cells` key/messages and containers notice. The containers warning text is exactly `carries the containers key, which is no longer read; declare cells instead` (339); unknown warning fragment is `names instruments the extension does not implement: ${names}; those cells render blank` (341–346). Combined warning is `pi-jefferson: ${path} ${parts.join("; ")}` (350). Distribution is named in the bad-distribution error and the top-level row-conflict behavior, not warning-specific text. Other user text: `startup.ts` emits status `/jefferson — the statusline footer is installed, <N> row(s).` (43–45) and calls `ctx.ui.notify(configuration.warning, "warning")` (inspect startup lines 58–83); warning travels to host notification. `README.md` documents current config errors and upgrade text.

## Runtime shape and flow

`components/row/row.ts`: `Row={id:string, distribution:Distribution, cells:Cell[]}` (19–23); `Cell={instrument:Instrument,align:CellAlign}` (13–16). Parser creates these rows, and `footer-setup.ts` passes them to `createFooter`; `row-renderer.ts` maps `row.cells` to cell components and passes `row.distribution` to `planRow` (74–86); `width-plan.ts` handles `equal` specially (73–93). Renderer’s equal/content branches and their tests are independent of configuration. Removing distribution from JSON does not inherently require removing runtime `Row.distribution`: parser could always normalize to `content` (current default). Runtime shape and consumers can remain for both distributions, consistent with owner ruling to keep renderer support.

## Tests and message assertions

JSON configurations are exercised mainly in `tests/configuration.test.ts` and end-to-end via `tests/jefferson.test.ts`; `tests/instrument.test.ts` also writes a JSON document (line 312). `tests/configuration.test.ts` contains the bulk of envelope/row/instrument JSON cases and pattern assertions for rejection/warnings (e.g. lines 136–196, 223–263, 304–345, 383–390, 476–554). `jefferson.test.ts` has JSON-backed config cases (e.g. 321, 336–371, 475 onward). `instrument.test.ts` JSON doc at 312. Direct `createFooter` construction appears in `tests/format.test.ts:179` and `tests/session-data-feed.test.ts:303–305`; these construct runtime rows and should not be confused with JSON config. Other runtime row consumers/test constructors include row-renderer/width-plan tests; exact all-test counts are not reliably enumerable from sampled search and need a dedicated count before implementation. Message assertions are in `tests/configuration.test.ts` at the patterns noted above, including rejection categories; `tests/jefferson.test.ts` checks warnings/notifications in integration cases. No exact exhaustive message-assertion inventory was established.

## Documentation and current-shape references

- `README.md`: current examples at lines 36–65 use top-level `cells` and row `distribution`; lines 68–83 explain both layouts, rejection, and equal-upgrade config; lines 88–90 show `rows` containing `{cells:...}`. Many further uses of “cell” describe implementation/layout rather than config; search hit spans 130–142, 190–192, 224–225, 259–262. README user-facing cell terminology and config snippets conflict with binding owner ruling.
- `AGENTS.md`: lines 3–5 vocabulary (“row holds cells”); many cell terminology lines in instrument/testing instructions (not config schema). It describes adding notice cell at 48–52.
- `ARCHITECTURE.md`: Configuration paragraphs describe rows/cell placement and notice cells; row renderer describes `distribution` at the row-renderer section; Fidelity explicitly says `distribution: "equal"` and content default. Its model must be checked against new user terminology/config contract.
- ADR relevant passages: `docs/adr/0007-a-cell-takes-the-width-its-content-needs.md:45–52` specifies row option `distribution`, `content/equal`, absent default, and rejection. ADR 0002 describes equal shares, no config key requirement. ADR 0008 title/header mentions horizontal/vertical gap only. Numerous ADRs contain internal “cell” as code concept; owner says code retains it and specifically requires a new ADR to record retirement of user-facing vocabulary.
- Active `openspec/specs/statusline/spec.md`: lines 65–70 specifies layout and `distribution`; 111–125 scenarios specify row distribution, invalid values and distribution beside `rows`; 185–205 speaks `cells` key/default; 254–275 explicitly makes `cells` array the count/placement key and tests absent/present/ceiling. These requirements assert the current cells-key behavior and distribution-as-config behavior and are the obvious spec changes. Other active specs: `session-data-store/spec.md` uses cell as runtime concept (e.g. lines 4,126,155–166,502–523) but no cells config key/distribution; `extension-source-layout/spec.md` refers to supplying cell content, not config shape. `openspec/specs/.gitkeep` only; no additional active spec files were found.

## Other configuration artifacts and release

No package-shipped default JSON/schema was identified. Package `files` includes extensions, README, LICENSE only. Default row is synthesized in `configuration.ts:175–180` as ten blank bound instruments, `content`, left alignment; missing file also uses it. Repository has test JSON fixtures created inline rather than a confirmed standalone config example. README is the principal published example.

`.github/workflows/release.yml`: push to `main` runs typecheck/tests, reads PR labels `release:major`, `release:minor`, `release:patch`; major/minor recognized, all else (including unlabeled) is patch. It calls `.github/scripts/next-version.mjs`; base is highest reachable release tag on `HEAD~1` (prerelease excluded; fallback `v0.0.0`), then bumps selected component. Workflow applies computed version to package manifest, publishes latest, creates GitHub release/tag. No breaking-change warning/reminder mechanism found; workflow comments explicitly say missing label under-bumps.

## Unknowns / follow-up checks

A line-by-line exhaustive enumeration/count of every JSON-input test, every direct `createFooter` test, every test asserting exact warning text, and every matching `cells|distribution|cell` occurrence across all requested documentation was not completed; cited locations are representative, not exhaustive. The new configuration contract intentionally conflicts with active statusline spec, README, AGENTS wording and ADR 0007; their exact reconciliation is for design/implementation owners. No pi platform behavior or external docs researched.
