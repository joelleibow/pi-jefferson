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

`data/` MUST import no source file outside itself. A file in `components/row/` MAY import its own directory, the types of `data/` and the type `instrument.ts` defines. No instrument's file MUST import `shipped.ts`, `format.ts`, `components/row/` or another instrument's file, and `shipped.ts` MUST import every instrument's file. Source: `owner-rulings.md` (2026-11-06, imports); `shipped.ts` avoids a cycle with the contract (`council.md`).

#### Scenario: An instrument file imports

- **WHEN** the local imports of one instrument's file are listed
- **THEN** each names `instrument.ts`, `compact-count.ts` or a type of `data/`, and none names `shipped.ts`, `format.ts`, `components/row/` or another instrument

#### Scenario: A row file imports

- **WHEN** the imports of a file in `components/row/` are listed
- **THEN** none names `format.ts`, `shipped.ts` or an instrument's file

#### Scenario: Who names the instruments

- **WHEN** the importers of an instrument's file are listed
- **THEN** only `shipped.ts`, `configuration.ts` (for the fallback `blank`) and the tests appear

### Requirement: The bar has its own file

The bar's drawing (glyphs, filled portion, threshold colors) MUST live in `components/visuals/bar.ts` and nowhere else, and that file MUST import no other source file of this package. `format.ts` MUST still parse `$bar`, place the bar and apply the theme to the parts it returns, as it does every piece. Output MUST equal the output before. Source: `council.md`, Joel's bar ruling (an instrument mixes it in; it must stand independent).

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

## MODIFIED Requirements

### Requirement: Each responsibility has a home recognizable from its path

Startup, configuration loading, footer setup, data and its updates, and the parts with the logic they share MUST each have a stated home, and each home's path MUST name its responsibility. The parts live under `components/`, and the shared logic is `format.ts` and `shipped.ts`. A file holding more than one of the five MUST be named in the change's design, which states whether it is separated or why it stays and what would change it. Source: `owner-rulings.md`; `council.md`, Joel's tree.

#### Scenario: Looking for a responsibility

- **WHEN** a reader wants where the config paths are resolved, where the footer is installed, where session data is kept, where the session-start lifecycle and the `/jefferson` command are registered (startup), or where the host's session and events reach the session data (data)
- **THEN** the path alone leads to one home for each

#### Scenario: Looking for a part or its shared logic

- **WHEN** a reader wants an instrument, the row, the bar, the format language, or the list of shipped instruments
- **THEN** the path alone leads to `components/instruments/`, `components/row/`, `components/visuals/`, `format.ts` or `shipped.ts`

#### Scenario: A file holding two responsibilities

- **WHEN** a shipped source file holds code of more than one of the five
- **THEN** the design names it and states the seam, or states why the file stays whole

#### Scenario: A grouping directory

- **WHEN** the restructure introduces a directory to group files
- **THEN** the design states, as "Responsibility is inferable from path" requires, what belongs in it and what may import what

### Requirement: Data and its updates do not depend on visuals or process flow

The home of data and its updates MUST NOT import a source file from `components/`, `format.ts`, `shipped.ts`, footer setup, startup or configuration loading. Files in those homes MAY import its types. Source: `owner-rulings.md` (data and updates kept apart from visuals); today the store imports no local file and `Readings` flows to the visuals as a type only (`research-eleanor.md` §3).

#### Scenario: Imports out of the data home

- **WHEN** the imports of the data home are listed
- **THEN** none names a file in another home of this change

#### Scenario: Visuals reading data types

- **WHEN** a file in `components/` or `format.ts` imports a type the data home defines
- **THEN** the tree conforms
