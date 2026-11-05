# Spec Delta

## REMOVED Requirements

### Requirement: Host packages are imported only at the load boundary

**Reason**: The entry-only half of this rule was never measured and bought nothing. Host packages are
`peerDependencies` because the host supplies them; a nested file importing one resolves to that same
copy, and the package's own tests resolve it from `node_modules` just as readily. What it cost was
injection plumbing — a helper handed `truncateToWidth`, `visibleWidth`, and now `HStack` as parameters
so that one file could avoid writing an `import`.

**Migration**: Files import what they need, where they need it. `extensions/jefferson.ts` is still the
entry the host loads and the only place host wiring happens; helper files may import host packages
directly. Existing injected width helpers keep working and are not required to change.

## ADDED Requirements

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
