## MODIFIED Requirements

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
- **THEN** only `shipped.ts`, `configuration.ts` (for the fallback `blank` and the `notice` declaration it gates on) and the tests appear
