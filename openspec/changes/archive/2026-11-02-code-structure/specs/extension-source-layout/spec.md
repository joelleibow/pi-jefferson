# Spec Delta

## Purpose

Defines what the host may load from this package, where that loadable code lives, what ships in
the tarball, and which modules may depend on host packages — so a contributor can tell from a
path what a file is responsible for, and can tell whether adding a file is routine or a named
structural change.

These requirements are the tests any selected layout must pass. They do not choose between the
layouts in the proposal; they fix what the chosen one must be checkable for.

## ADDED Requirements

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

### Requirement: Host packages are imported only at the load boundary

Host packages (`@earendil-works/*`) MUST be declared in `peerDependencies` with a `*` range and
MUST NOT appear in `dependencies`. Runtime imports of host packages MUST occur only in the
module the host loads as an entry; type-only imports are permitted in any module.

#### Scenario: A helper reaches for the host at runtime

- **WHEN** a module other than the host-loaded entry contains a runtime import of a host package
- **THEN** the tree does not conform, and the change adding it is rejected

#### Scenario: Declaring a host package

- **WHEN** `package.json` is inspected
- **THEN** each host package is a `peerDependencies` entry with a `*` range and is absent from
  `dependencies`

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
