## ADDED Requirements

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

Startup, configuration loading, footer setup, data and its updates, and visuals and process flow MUST each have a stated home, and each home's path MUST name its responsibility. A shipped source file that holds more than one of the five MUST be named in the change's design, which states whether it is separated or why it stays and what would change it. Source: `owner-rulings.md`; `research-eleanor.md` §2 for the five and their current files.

#### Scenario: Looking for a responsibility

- **WHEN** a reader wants where the config paths are resolved, where the footer is installed, where session data is kept, where an instrument's text is produced, where the session-start lifecycle and the `/jefferson` command are registered (startup), or where the host's session and events reach the session data (data)
- **THEN** the path alone leads to one home for each

#### Scenario: A file holding two responsibilities

- **WHEN** a shipped source file holds code of more than one of the five
- **THEN** the design names it and states the seam, or states why the file stays whole

#### Scenario: A grouping directory

- **WHEN** the restructure introduces a directory to group files
- **THEN** the design states, as "Responsibility is inferable from path" requires, what belongs in it and what may import what

### Requirement: Data and its updates do not depend on visuals or process flow

The home of data and its updates MUST NOT import a source file from the homes of visuals and process flow, footer setup, startup or configuration loading. Visual files MAY import its types. Source: `owner-rulings.md` (data and updates kept apart from visuals); today the store imports no local file and `Readings` flows to the visuals as a type only (`research-eleanor.md` §3).

#### Scenario: Imports out of the data home

- **WHEN** the imports of the data home are listed
- **THEN** none names a file in another home of this change

#### Scenario: Visuals reading data types

- **WHEN** a visual file imports a type the data home defines
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
