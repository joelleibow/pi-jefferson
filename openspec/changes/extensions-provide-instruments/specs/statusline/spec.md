# Spec Delta

## MODIFIED Requirements

### Requirement: Cell text is the instrument its entry names

Every cell MUST hold an instrument, and a cell's content MUST be what its instrument renders: its
format with its variables substituted. `blank` is an instrument whose default format is the fixed
placeholder text; it is what the default row's ten cells hold. A cell's instrument MAY be one
Jefferson implements or one an extension registers.

#### Scenario: Rendering a row

- **WHEN** a row renders
- **THEN** every cell in it holds an instrument and contains the text that instrument resolves to

#### Scenario: Contributing cell content

- **WHEN** an extension supplies the text a row's entry shows
- **THEN** it registers an instrument, and the document names that instrument

### Requirement: An entry names the instrument its cell renders

A row's entries are in cell order. The `instrument` of an entry MUST name the instrument its cell
renders, as the document configures that name or with its declared defaults, and the extension MUST
NOT take a cell's instrument from any other source. A name no instrument has registered MUST render
that cell `blank` and MUST get its warning only after startup completes, because an instrument may
still register; the warning MUST name it. The row's other cells MUST render theirs.

#### Scenario: A row that names its instruments

- **WHEN** a declared row's list holds entry objects
- **THEN** each cell renders the instrument its entry names, in the order given

#### Scenario: An instrument the extension does not implement

- **WHEN** a declared row's entry names `taiknr.savings`, which no extension has registered
- **THEN** the document is accepted, the warning reads `row 3: "taiknr.savings" is not a known
  instrument` after startup has completed, placed by its row and never by the entry's position, and
  that cell renders `blank` while the row's other cells render theirs

#### Scenario: One unknown name in two rows

- **WHEN** two rows each carry an entry naming `taiknr.savings`
- **THEN** the document is accepted, and the name is reported once for each row, in row order

#### Scenario: One unknown name twice in one row

- **WHEN** one row carries `taiknr.savings` at two positions, and nothing else names it
- **THEN** the document is accepted, and the name is reported once for that row

#### Scenario: One configuration, two cells holding it

- **WHEN** the document configures an instrument once and two entries in two rows name it
- **THEN** both cells render it as configured, because a cell takes its instrument's configuration
  from the instrument's name and not from the entry that names it

#### Scenario: A name that registers during the session

- **WHEN** an entry names an instrument no extension has registered when the footer is installed, and
  an extension registers it before the session ends
- **THEN** that entry renders the instrument from the next render on with the instrument's own width
  behaviour, the registration requests the one repaint that shows it, and no restart is needed

### Requirement: An instrument's configuration lives in the extension's own document

The extension MUST read instrument configuration from a top-level `instruments` object in the
`pi-jefferson.json` document it already owns, keyed by instrument name, each value carrying any of
that instrument's declared options. It MUST sit beside `rows`, and a document carrying only
`instruments` MUST render the default row with those instruments configured. A trusted project's
document MUST replace the agent document whole, as it does today.

#### Scenario: An instrument configured once

- **WHEN** the document configures `model`'s format
- **THEN** every cell holding `model`, in every declared row, renders that format

#### Scenario: An instrument the document does not configure

- **WHEN** the document configures nothing for `context`
- **THEN** the cells holding `context` render its declared defaults

#### Scenario: Configuration and no rows

- **WHEN** the document carries only an `instruments` object
- **THEN** the default row renders, with those instruments configured

#### Scenario: A name the extension does not implement

- **WHEN** the `instruments` object configures a name Jefferson does not implement and no extension
  has registered, and no row's entry names it
- **THEN** the document is accepted, and once startup has completed the warning names it in a form of
  its own that is placed by the `instruments` block rather than by a row, and that claims nothing
  about any cell's rendering

#### Scenario: A name the block and a row both name

- **WHEN** the `instruments` object configures a name Jefferson does not implement and no extension
  has registered, and a row's entry names it too
- **THEN** the document is accepted, and once startup has completed the name is reported twice: once
  by the row, and once by the `instruments` block

#### Scenario: An option the instrument does not declare

- **WHEN** the `instruments` object gives one of Jefferson's own instruments a key its declaration
  does not have — a misspelling such as `frmát`, or the declined `width`
- **THEN** the document is rejected, the default row renders, and the warning names the key

#### Scenario: Both spellings of one instrument

- **WHEN** the `instruments` object configures both `path` and `jefferson.default.path`
- **THEN** the document is rejected, the default row renders, and the warning quotes both keys as
  written

#### Scenario: A trusted project's document

- **WHEN** a trusted project's document and the agent document both configure instruments
- **THEN** the project's document replaces the agent's whole, and only its configuration applies

## ADDED Requirements

### Requirement: A bare name means the default instrument of that name

In a row's entry and in the `instruments` block, a bare name MUST mean the `jefferson.default.*`
instrument of that name, so the two spellings name one instrument. A provided instrument MUST have no
bare shorthand, so a bare name MUST NOT reach a name an extension registered.

#### Scenario: A bare name in a row

- **WHEN** a row's entry names `path`
- **THEN** the entry renders the instrument registered as `jefferson.default.path`

#### Scenario: A bare name in the instruments block

- **WHEN** the `instruments` block configures `path` and a row's entry names `jefferson.default.path`
- **THEN** the one configuration applies, because both spellings name one instrument

#### Scenario: One instrument in two spellings, two rows

- **WHEN** one row's entry names `notice` and another row's entry names `jefferson.default.notice`
- **THEN** both entries render that one instrument with its one configuration, one visible time and
  one expiry, because both spellings name one instrument

#### Scenario: No shorthand for a provided instrument

- **WHEN** a row's entry names `savings` and the only registered `savings` belongs to taiknr
- **THEN** the entry renders as a name no instrument has registered does

### Requirement: A provided instrument takes no option of its own

A provided instrument takes a format, a style and a label, which Jefferson declares once. A key beyond
those three under its name in the `instruments` block MUST be refused as an option it does not take.

#### Scenario: An option a provided instrument does not take

- **WHEN** the `instruments` block gives a provided instrument `width`
- **THEN** only that instrument is refused: its entries render `blank`, and a warning names the
  instrument and the option

### Requirement: A provided instrument's settings are checked once both are in hand

Jefferson MUST check everything under a provided name's key in the `instruments` block — shape, format,
label, option, variable, modifier and style — once both the document and that registration are in hand,
whichever comes second. A fault MUST refuse that instrument alone: its entries render `blank`, a
warning names it and the fault, and the rest of the document renders as configured. A name that never
registers gets only the unknown-name warning.

#### Scenario: A variable the registration does not declare

- **WHEN** the `instruments` block gives a provided instrument a format naming a variable its
  registration does not carry
- **THEN** only that instrument is refused: its entries render `blank`, a warning names the instrument
  and the variable, and every other entry renders as configured

#### Scenario: A value that is not an object

- **WHEN** the `instruments` block gives a provided name a value that is not an object
- **THEN** only that instrument is refused, and the rest of the document renders as configured

#### Scenario: A provider that registered before the document was read

- **WHEN** the provider's `session_start` handler runs before Jefferson's, so its registration is in
  hand before the document is read
- **THEN** the same rule applies: a fault refuses only that instrument
