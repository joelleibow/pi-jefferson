## ADDED Requirements

### Requirement: Each shipped instrument has its own source file

Each shipped instrument MUST be declared in its own source file, and `instrumentNamed` MUST resolve every shipped instrument by name. Adding an instrument MUST add one source file and MUST NOT edit another instrument's file. Source: `owner-rulings.md` (2026-11-10, "One file per instrument").

#### Scenario: Looking for an instrument

- **WHEN** a reader looks for where an instrument's text is produced
- **THEN** one source file named for that instrument holds its declaration and no other instrument's

#### Scenario: Resolving every shipped instrument

- **WHEN** `instrumentNamed` is called with the name of each shipped instrument
- **THEN** it returns that instrument's declaration, and the set of names resolved equals the set resolved before the change

#### Scenario: Adding an instrument

- **WHEN** a new instrument is added by the same pattern
- **THEN** one new source file declares it, and no other instrument's file changes

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
