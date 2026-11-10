# extension-source-layout Specification

## Purpose
Defines what the host may load from this package, where that loadable code lives, what ships in
the tarball, and which modules may depend on host packages — so a contributor can tell from a
path what a file is responsible for, and can tell whether adding a file is routine or a named
structural change.

These requirements are the tests any selected layout must pass. They do not choose between the
layouts in the proposal; they fix what the chosen one must be checkable for.

## Requirements

### Requirement: One host-loaded entry per extension

The package MUST expose exactly one module per extension as the entry the host discovers, and
that module MUST default-export a factory function. Helper modules MUST NOT be discoverable as
extensions, and adding one MUST NOT change the set of entries the host loads.

#### Scenario: The host's discovered entry set

- **WHEN** the host resolves extension resources for the installed package
- **THEN** it discovers exactly one entry per extension, each default-exporting a factory

#### Scenario: Adding a helper module

- **WHEN** a module that is not an extension entry is added to the source tree
- **THEN** discovery yields the same entry set it yielded before the module existed

### Requirement: The load root is singular and stated

Host discovery MUST reach exactly one source location, and that location MUST be stated by
exactly one mechanism: the `extensions/` convention directory, or a `package.json`
`pi.extensions` array. Every other source directory MUST be outside host discovery.

#### Scenario: Identifying the load root

- **WHEN** `package.json` and the source tree are inspected together
- **THEN** exactly one of those two mechanisms identifies the load root, and no second source
  directory is reachable by discovery

#### Scenario: Source outside the load root

- **WHEN** a source module lives outside the load root
- **THEN** the host does not load it as an extension

### Requirement: Tests never occupy a loadable or shipped path

No test file MUST sit in a location the host discovers as an extension, and no test file MUST
appear in the published tarball. Tests MUST live under `tests/` unless a later change names a
different location.

#### Scenario: Packing the package

- **WHEN** the tarball is produced
- **THEN** its file list contains no `*.test.ts`

#### Scenario: Placing a new test

- **WHEN** a test is added for a source module
- **THEN** it lives under `tests/` and imports the source by relative path

### Requirement: Every shipped source file is typechecked and erasable

Each shipped source file MUST match `tsconfig.json`'s `include`, so `npm run typecheck` checks
it, and MUST use only erasable TypeScript: no `enum`, no parameter properties, no runtime
`namespace`, no decorators. There is no build step, and there MUST NOT be one.

#### Scenario: A shipped file outside the include globs

- **WHEN** a source file ships but is not matched by `tsconfig.json`'s `include`
- **THEN** the tree does not conform until the include covers it

#### Scenario: A non-erasable construct

- **WHEN** a shipped source file uses a construct Node's type stripping refuses
- **THEN** `npm test` fails, because Node executes the source directly

### Requirement: The published file set is deliberate

The tarball MUST contain exactly the set named by `package.json` `files` plus npm's mandatory
files. CI MUST assert that set by invariant — the allowed roots, the declared entry's presence,
the absence of any test file, and the load root's value — and MUST NOT assert an enumerated list,
which would need a CI edit per module. A change to a root, the entry, or the load root MUST update
`files`, the manifest, and the CI expectation together.

#### Scenario: A layout moves the shipped paths

- **WHEN** source moves to a path the current `files` array does not ship
- **THEN** `files` and the CI expectation change in the same change

#### Scenario: An ordinary module is added

- **WHEN** a module is added under the declared load root and nothing else changes
- **THEN** the tarball set changes and CI still passes, because the check asserts invariants and not a
  list of files

#### Scenario: Drift between manifest and assertion

- **WHEN** the tarball, the manifest's declared load root, and the CI expectation disagree
- **THEN** CI fails before anything can be published

### Requirement: Responsibility is inferable from path

Each source module MUST be named for the behavior or data it owns. A module named for no
responsibility — `utils`, `helpers`, `misc`, `common` — MUST NOT exist. A directory introduced
to group modules MUST have its membership and dependency rule stated by the change that adds
it, and modules in it MUST follow that rule.

#### Scenario: Adding a module

- **WHEN** a module is added
- **THEN** its filename names the behavior or data it owns

#### Scenario: Adding a grouping directory

- **WHEN** a directory is introduced to group modules
- **THEN** the change that adds it states what belongs in it and what may import what, and every
  module in it conforms

### Requirement: Growth is a named change

Introducing a new top-level source directory, a second host-loaded entry, or a new kind of
module that changes the pinned mechanisms MUST be a named change, and that change MUST update
`package.json`, `tsconfig.json`, and the CI expectation wherever it touches them. A module
that follows an established pattern MUST NOT require such a change.

#### Scenario: A new kind of module

- **WHEN** a change adds a source root, a loadable entry, or a new structural rule
- **THEN** it names the addition in an OpenSpec change and updates the pinned mechanisms in the
  same change

#### Scenario: An ordinary module

- **WHEN** a module is added inside an established pattern
- **THEN** no new structure, manifest field, or CI expectation is required

### Requirement: Host packages are the host's to supply, and imports run one way

Host packages (`@earendil-works/*`) MUST be declared in `peerDependencies` with a `*` range and MUST
NOT appear in `dependencies`, so exactly one copy reaches the process. Any shipped source file MAY
import a host package at runtime. Within this package, imports MUST run one way: the entry may import
the working parts, a working part MUST NOT import the entry, and no import cycle MUST exist.

#### Scenario: Declaring a host package

- **WHEN** `package.json` is inspected
- **THEN** each host package is a `peerDependencies` entry with a `*` range and is absent from
  `dependencies`

#### Scenario: A working part imports the host

- **WHEN** a source file other than the entry imports a host package at runtime
- **THEN** the tree conforms, and the import resolves to the host's copy

#### Scenario: A working part imports the entry

- **WHEN** a source file other than the entry imports the entry
- **THEN** the tree does not conform, because the dependency would run the wrong way

#### Scenario: An import cycle

- **WHEN** following imports from any shipped file returns to a file already visited
- **THEN** the tree does not conform

### Requirement: A layout change preserves behavior and the configuration surface

A change that moves or separates source files MUST leave unchanged everything a user or the host can observe: the rendered footer, the `pi-jefferson.json` surface with its warnings, the `/jefferson` command, and the host events the extension subscribes to. Source: `owner-rulings.md` (a restructure only); `statusline` and `session-data-store` are the behavior it must leave true.

#### Scenario: The same documents

- **WHEN** the agent document, a trusted project's document and an untrusted project's document are read after the change
- **THEN** each yields the rows and the warnings it yielded before

#### Scenario: Starting and reloading

- **WHEN** a session starts or reloads in the terminal mode
- **THEN** the previous install is released first, the footer is registered from the session-start handler, and one release disposes the subscriptions, the store and the footer, as before

#### Scenario: Outside the terminal mode

- **WHEN** a session starts in a mode other than the terminal mode
- **THEN** no footer is installed, as before

#### Scenario: String mutations

- **WHEN** the shipped source is inspected
- **THEN** `lodash-es` is still imported per function from its own path, never from an index. ADR 0004 chooses the per-function paths so three modules load rather than the library's index; the index import is caught only by a search of the source, because `lodash-es` works under both `tsc` and `node --test`. The form that passes `tsc` and fails `node --test` is a named import from the CommonJS `lodash`

### Requirement: The existing tests are the proof of unchanged behavior

Every test that passed before a layout change MUST pass after it with its assertions unchanged. Edits under `tests/` MUST be limited to import specifiers, file renames, and the export-surface pin governed by the next requirement. Source: `michael-orientation.md` T3; 243 tests passed before this change (`research-eleanor.md` §7).

#### Scenario: Reading the test diff

- **WHEN** the diff under `tests/` is read
- **THEN** every changed line is an import specifier, a rename, or part of the export-surface pin

#### Scenario: A test loosened to pass

- **WHEN** an assertion outside the export-surface pin is edited or removed
- **THEN** the change does not conform

### Requirement: The export surface stays free of any way to contribute cell content

No shipped source file MUST export a way for third-party code to supply or replace cell content, and a test MUST pin the exported keys of every shipped source file that holds one. If a change moves exports between files, the pin MUST be rewritten for the new files and argued against `statusline`'s "Cell content comes from an instrument". Source: `michael-orientation.md` D-e; `research-eleanor.md` §7.

#### Scenario: A file is separated

- **WHEN** a file is separated and its exports are shared between the new files
- **THEN** the pin lists the exact exports of each new file, and the design states why none supplies cell content

#### Scenario: A new file joins the pin

- **WHEN** a shipped source file is added
- **THEN** the pin covers it, or the design states why it exports nothing a caller could use to supply content

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

### Requirement: Separation uses plain imports

Source files MUST reach one another by importing the file they need. A layout change MUST NOT introduce a registry, container, port or injection seam whose purpose is separation or testing, and the seams that exist, such as the store's injected readers, MUST stay as they are. Source: `owner-rulings.md` (2026-11-03, on imports and injection); ADR 0001.

#### Scenario: A new unit needs another

- **WHEN** one new unit needs another's function
- **THEN** it imports the file that holds it

#### Scenario: An injection seam appears

- **WHEN** a layout change adds a parameter, container or registry only so that a dependency can be substituted
- **THEN** the change does not conform

### Requirement: Relative imports name the file

Every relative import MUST name its target file with the `.ts` extension, and none MUST name a directory. Source: `research-chidi.md` §5 (Node refuses a bare directory import with `ERR_UNSUPPORTED_DIR_IMPORT` and an extensionless one with `ERR_MODULE_NOT_FOUND`); `michael-orientation.md` T4.

#### Scenario: A new directory shares a stem with a file

- **WHEN** a directory is added beside a file of the same stem
- **THEN** every import still names the file with its extension, and `pnpm typecheck` and `pnpm test` pass

### Requirement: The manifest names the entry as a file

`package.json` `pi.extensions` MUST name the entry as a file path and MUST NOT name a directory. Working parts MAY nest below the entry's directory at any depth, because the manifest is the allowlist and arbitrary files beneath a declared path do not become entries. Source: `research-chidi.md` §1; `michael-orientation.md` D-a and T1.

#### Scenario: A nested working part

- **WHEN** a working part is added several directories below the entry's directory
- **THEN** host discovery yields the same entry set as before

#### Scenario: The manifest names a directory

- **WHEN** `pi.extensions` names a directory
- **THEN** the package does not conform, because discovery would then enumerate what it reaches

### Requirement: The import graph is shown acyclic

The change that restructures the source MUST show, by a check run on the tree, that no shipped source file imports the entry and that the import graph has no cycle. No standing check exists, so the evidence belongs to the change. Source: this spec's "Host packages are the host's to supply, and imports run one way"; `michael-orientation.md` T5; the current graph is acyclic (`research-eleanor.md` §3).

#### Scenario: The evidence

- **WHEN** the restructure is reviewed
- **THEN** the change carries the output of a check that lists the imports and finds no cycle and no import of the entry

#### Scenario: A split closes a loop

- **WHEN** separating a file makes two of its parts import each other, directly or through a third
- **THEN** the check reports the cycle and the change does not conform

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
