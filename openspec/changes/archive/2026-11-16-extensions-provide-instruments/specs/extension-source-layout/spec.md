# Spec Delta

## REMOVED Requirements

### Requirement: The export surface stays free of any way to contribute cell content

**Reason**: Joel's 2026-11-15 rulings make registration the way an extension supplies an instrument,
which retires the 2026-11-03 rule that no API lets third-party code supply or replace cell content
(D1–D3, `michael-orientation.md` §1; S8, R1). The retired rule was written when the shipped table was
the only source of a cell's instrument.

**Migration**: "The export surface offers registration and no other way to contribute cell content"
replaces it: it keeps the export pin, adds the contract's own file to the pin with no runtime export,
and keeps the rule that a new export is argued against it. The test that scanned export keys for a
contribution path is rewritten to pin the registration surface.

## MODIFIED Requirements

### Requirement: The source tree has the ruled homes

Under `extensions/jefferson/`, `format.ts`, `shipped.ts`, `startup.ts`, `configuration.ts` and
`footer-setup.ts` MUST sit directly. `components/instruments/` MUST hold `instrument.ts`,
`instrument-binding.ts`, `compact-count.ts` and one file per instrument; `components/row/` MUST hold
`row.ts`, `width-plan.ts` and `row-renderer.ts`. The published contract MUST sit under
`extensions/jefferson/`. A top-level `visuals/` MUST NOT exist. Source: `council.md`, Joel's tree.

#### Scenario: Looking for the format language or the shipped table

- **WHEN** a reader looks for the logic every instrument shares, or for the list of shipped instruments
- **THEN** `format.ts` and `shipped.ts` are directly under `extensions/jefferson/`

#### Scenario: Looking for the row

- **WHEN** a reader looks for the row's types, width plan or renderer
- **THEN** all three are in `components/row/` and no other source file is

#### Scenario: The old directory

- **WHEN** the source tree is listed
- **THEN** no `extensions/jefferson/visuals/` directory exists

### Requirement: Each responsibility has a home recognizable from its path

Startup, configuration loading, footer setup, registration, data and its updates, and the parts with
the logic they share MUST each have a stated home, and each home's path MUST name its responsibility.
The parts live under `components/`, and the shared logic is `format.ts` and `shipped.ts`. A file
holding more than one of the six MUST be named in the change's design, which states whether it is
separated or why it stays. Source: `owner-rulings.md`; `council.md`, Joel's tree.

#### Scenario: Looking for a responsibility

- **WHEN** a reader wants where the config paths are resolved, where the footer is installed, where
  registrations are kept, where session data is kept, where the session-start lifecycle and the
  `/jefferson` command are registered (startup), or where the host's session and events reach the
  session data (data)
- **THEN** the path alone leads to one home for each

#### Scenario: Looking for a part or its shared logic

- **WHEN** a reader wants an instrument, the row, the bar, the format language, or the list of shipped
  instruments
- **THEN** the path alone leads to `components/instruments/`, `components/row/`, `components/visuals/`,
  `format.ts` or `shipped.ts`

#### Scenario: A file holding two responsibilities

- **WHEN** a shipped source file holds code of more than one of the six
- **THEN** the design names it and states the seam, or states why the file stays whole

#### Scenario: A grouping directory

- **WHEN** the change introduces a directory to group files
- **THEN** the design states, as "Responsibility is inferable from path" requires, what belongs in it
  and what may import what

### Requirement: Each shipped instrument has its own source file

Each shipped instrument MUST be declared in its own source file under `components/instruments/`, and
the extension MUST register every shipped instrument itself, so a document names it as it always did.
Adding an instrument MUST add one source file and one registration in the shipped set, and MUST NOT
edit another instrument's file. Source: `owner-rulings.md` (2026-11-10, "One file per instrument");
`council.md`, Joel's tree.

#### Scenario: Looking for an instrument

- **WHEN** a reader looks for where an instrument's text is produced
- **THEN** one source file named for that instrument holds its declaration and no other instrument's

#### Scenario: Resolving every shipped instrument

- **WHEN** a row's entry names each shipped instrument
- **THEN** each entry renders that instrument, and the set of names is the set the extension shipped
  before this change

#### Scenario: Adding an instrument

- **WHEN** a new instrument is added by the same pattern
- **THEN** one new source file declares it, the shipped set gains one registration, and no other
  instrument's file changes

### Requirement: Imports between the homes run one way

`data/` MUST import no source file outside itself. A file in `components/row/` MAY import its own
directory, the types of `data/` and the type `instrument.ts` defines. No instrument's file MUST import
`shipped.ts`, `format.ts`, `components/row/` or another instrument's file, and `shipped.ts` MUST import
every instrument's file. Source: `owner-rulings.md` (2026-11-06, imports); `shipped.ts` avoids a cycle
with the contract (`council.md`).

#### Scenario: An instrument file imports

- **WHEN** the local imports of one instrument's file are listed
- **THEN** each names `instrument.ts`, `compact-count.ts` or a type of `data/`, and none names
  `shipped.ts`, `format.ts`, `components/row/` or another instrument

#### Scenario: A row file imports

- **WHEN** the imports of a file in `components/row/` are listed
- **THEN** none names `format.ts`, `shipped.ts` or an instrument's file

#### Scenario: Who names the instruments

- **WHEN** the importers of an instrument's file are listed
- **THEN** only the file holding the shipped set and the tests appear, because the fallback `blank` and
  the notice gate read what has registered rather than naming an instrument's file

## ADDED Requirements

### Requirement: The export surface offers registration and no other way to contribute cell content

No shipped source file MUST export a way for third-party code to supply or replace a cell's content,
except registration through the published contract. A test MUST pin the exported keys of every shipped
source file, the contract's file among them with none, and a new export MUST be argued against this
requirement.

#### Scenario: An author looks for a way to supply text

- **WHEN** an extension author looks for how to put its own text in a row's entry
- **THEN** the package offers instrument registration and nothing else

#### Scenario: A file is separated

- **WHEN** a file is separated and its exports are shared between the new files
- **THEN** the pin lists the exact exports of each new file

#### Scenario: A new file joins the pin

- **WHEN** a shipped source file is added
- **THEN** the pin covers it, or the change states why it exports nothing a caller could use to supply
  content

#### Scenario: A new export beside registration

- **WHEN** a shipped source file gains an export that is not registration
- **THEN** the change states why it supplies no content, and the pin names it

### Requirement: The published contract resolves from the installed package

`package.json` MUST declare `exports` with `./instruments` alone, and `files` MUST NOT change, because
it already ships the tree. CI MUST fail when the export's target is missing from the packed file list
read from the packed manifest. The export MUST add no `pi.extensions` entry.

#### Scenario: An installed copy's contract

- **WHEN** an extension imports `pi-jefferson/instruments` from an installed package
- **THEN** the import resolves to the published contract

#### Scenario: A target the tarball lacks

- **WHEN** the export names a file the packed file list does not carry
- **THEN** CI fails before anything is published

#### Scenario: What the manifest declares

- **WHEN** the export is added to `package.json`
- **THEN** `pi.extensions` still names exactly one entry, and `files` is unchanged

### Requirement: The published contract is types only

`pi-jefferson/instruments` MUST name a file holding type declarations only, with no runtime statement,
and every file it imports MUST hold types only. It MUST import no runtime file of this package, and MAY
import pi's published type packages. `jefferson:registration` and `jefferson:update` MUST be
string-literal types the provider writes. The field value type MUST live once, in a types-only file in `data/`.

#### Scenario: A runtime statement in the contract

- **WHEN** a runtime statement is added to the contract's file or to a file it imports
- **THEN** the package does not conform, because a provider would have to install the package to run

#### Scenario: A provider sends a registration

- **WHEN** a provider writes the channel's name from the contract's types
- **THEN** it writes a literal, and no runtime import is needed

#### Scenario: The field value type

- **WHEN** the store holds a provider's field and the contract types that field
- **THEN** both read one declaration, in `data/`, and `data/` imports nothing outside itself

### Requirement: A grouping directory this change adds has a stated rule

A grouping directory this change adds MUST hold the files of one responsibility, MUST import only its
own directory, the types of `data/` and host packages, and MUST NOT import the entry, `format.ts`,
`shipped.ts` or another home's file. Its design MUST state what belongs in it and what may import what.

#### Scenario: A new grouping directory

- **WHEN** the change adds a directory to group files
- **THEN** every file in it belongs to that one responsibility

#### Scenario: A file in a new grouping directory

- **WHEN** the local imports of a file in that directory are listed
- **THEN** each names its own directory, a type of `data/` or a host package
