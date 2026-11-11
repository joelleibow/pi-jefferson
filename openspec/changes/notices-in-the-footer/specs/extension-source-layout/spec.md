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

### Requirement: The bar has its own file

Each visual under `components/visuals/` MUST live in its own source file and MUST import no other
source file of this package. A visual MUST be mixed into an instrument by a declaration field naming
the reading it needs, or by the format language placing it. Any component file and `format.ts` MAY
import a visual. The bar's drawing MUST stay in `bar.ts`, and `format.ts` MUST still parse `$bar`.
Source: Joel's bar ruling, extended by his 2026-11-10 ruling on the visual.

#### Scenario: Looking for the bar

- **WHEN** a reader looks for how the bar is drawn or when it turns warning or error colored
- **THEN** `components/visuals/bar.ts` holds the drawing and the thresholds, and `format.ts` holds neither

#### Scenario: The bar renders as before

- **WHEN** a format containing `$bar` is resolved at any width and percent
- **THEN** the text is byte for byte what it was before the change

#### Scenario: A user places the bar

- **WHEN** a format places `$bar` among prose for an instrument that declares a percent
- **THEN** it parses and draws as before, and for an instrument without one the parse error is unchanged

#### Scenario: Looking for the timed visual

- **WHEN** a reader looks for what decides a datum's visibility on the clock
- **THEN** `components/visuals/timed.ts` holds it, and neither the notice instrument nor the store
  decides visibility

#### Scenario: A visual's imports

- **WHEN** the imports of any file under `components/visuals/` are listed
- **THEN** none names another source file of this package, and a `components/` file or `format.ts`
  that imports the visual conforms
