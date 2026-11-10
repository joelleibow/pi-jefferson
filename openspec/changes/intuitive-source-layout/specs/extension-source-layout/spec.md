## ADDED Requirements

### Requirement: Each shipped instrument has its own source file

Each shipped instrument MUST be declared in its own source file under `components/instruments/`, and `instrumentNamed`, in `shipped.ts`, MUST resolve every shipped instrument by name. Adding an instrument MUST add one source file and one entry in `shipped.ts`, and MUST NOT edit another instrument's file. Source: `owner-rulings.md` (2026-11-10, "One file per instrument"); `council.md`, Joel's tree.

#### Scenario: Looking for an instrument

- **WHEN** a reader looks for where an instrument's text is produced
- **THEN** one source file named for that instrument holds its declaration and no other instrument's

#### Scenario: Resolving every shipped instrument

- **WHEN** `instrumentNamed` is called with the name of each shipped instrument
- **THEN** it returns that instrument's declaration, and the set of names resolved equals the set resolved before the change

#### Scenario: Adding an instrument

- **WHEN** a new instrument is added by the same pattern
- **THEN** one new source file declares it, `shipped.ts` gains one entry, and no other instrument's file changes

### Requirement: The source tree has the ruled homes

Under `extensions/jefferson/`, `format.ts`, `shipped.ts`, `startup.ts`, `configuration.ts` and `footer-setup.ts` MUST sit directly, with `data/` unchanged. `components/instruments/` MUST hold `instrument.ts`, `instrument-binding.ts`, `compact-count.ts` and one file per instrument; `components/row/` MUST hold `row.ts`, `width-plan.ts` and `row-renderer.ts`. A top-level `visuals/` MUST NOT exist. Source: `council.md`, Joel's tree, word for word.

#### Scenario: Looking for the format language or the shipped table

- **WHEN** a reader looks for the logic every instrument shares, or for the list of shipped instruments
- **THEN** `format.ts` and `shipped.ts` are directly under `extensions/jefferson/`

#### Scenario: Looking for the row

- **WHEN** a reader looks for the row's types, width plan or renderer
- **THEN** all three are in `components/row/` and no other source file is

#### Scenario: The old directory

- **WHEN** the source tree is listed
- **THEN** no `extensions/jefferson/visuals/` directory exists

### Requirement: Imports between the homes run one way

`data/` MUST import no source file outside itself. A file in `components/row/` MAY import its own directory, the types of `data/` and the type `instrument.ts` defines. A file in `components/instruments/` MAY import its own directory, the types of `data/` and, for `instrument-binding.ts` only, `format.ts`. Only `shipped.ts` MUST import the files that declare instruments. Source: `owner-rulings.md` (2026-11-06, imports); `shipped.ts` avoids a cycle with the contract (`council.md`).

#### Scenario: An instrument file imports

- **WHEN** the imports of one instrument's file are listed
- **THEN** each names `instrument.ts`, `compact-count.ts` or a type of `data/`, and none names `shipped.ts`, `format.ts` or `components/row/`

#### Scenario: A row file imports

- **WHEN** the imports of a file in `components/row/` are listed
- **THEN** none names `format.ts`, `shipped.ts` or an instrument's file

#### Scenario: Only the table names the instruments

- **WHEN** the importers of an instrument's file are listed
- **THEN** only `shipped.ts` and the tests appear

### Requirement: The bar has its own file

The bar's drawing, its filled-portion rule and its threshold colors MUST live in `components/visuals/bar.ts` and nowhere else, and that file MUST import no other source file of this package. `format.ts` MUST still parse `$bar` and place the bar, and MUST NOT draw it. Output MUST equal the output before the change. Source: `council.md`, Joel's bar ruling (an instrument mixes it in; it must stand independent).

#### Scenario: Looking for the bar

- **WHEN** a reader looks for how the bar is drawn or when it turns warning or error colored
- **THEN** `components/visuals/bar.ts` holds the drawing and the thresholds, and `format.ts` holds neither

#### Scenario: The bar renders as before

- **WHEN** a format containing `$bar` is resolved at any width and percent
- **THEN** the text is byte for byte what it was before the change

#### Scenario: A user places the bar

- **WHEN** a format places `$bar` among prose for an instrument that declares a percent
- **THEN** it parses and draws as before, and for an instrument without one the parse error is unchanged

### Requirement: A layout change leaves the published surface unchanged

A change that moves or separates source files MUST NOT alter the entry's path, `package.json` `pi.extensions`, `files`, or the tarball's roots. The entry MUST stay `extensions/jefferson.ts`. Source: `owner-rulings.md` (2026-11-10, "No behavior changes": the published surface is unchanged).

#### Scenario: The manifest and the tarball

- **WHEN** `package.json` and the packed tarball are compared before and after the change
- **THEN** `pi.extensions` and `files` are identical, and every shipped source file is under `extensions/`

#### Scenario: The entry

- **WHEN** the host resolves the package's extension entry
- **THEN** it resolves `extensions/jefferson.ts`, which default-exports a factory, as before

### Requirement: The change carries the proof of unchanged behavior

The change MUST attach the output of each check its design names to show behavior unchanged. The set MUST cover the existing suite, the export union, the multiset of shipped code lines, the import graph, the tarball's file list and the per-function `lodash-es` imports. Source: `michael-orientation.md` §2.

#### Scenario: Reviewing the proof

- **WHEN** the restructure is reviewed
- **THEN** each check the design names has attached output, and no check is asserted in prose only

#### Scenario: A line-multiset difference

- **WHEN** the multiset of shipped non-import, non-comment lines differs from the baseline
- **THEN** the design names each difference and its reason, or the change does not conform
