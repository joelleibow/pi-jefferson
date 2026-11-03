# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Cell content is fixed placeholder text`
- TO: `### Requirement: Cell content comes from an instrument`

## MODIFIED Requirements

### Requirement: Cell content comes from an instrument

Every cell MUST hold an instrument, and a cell's content MUST be the text its instrument resolves
to. `blank` is an instrument: it renders the fixed placeholder text, it is what the default row's
eight cells hold, and it is what a row that declares no `cells` renders, exactly as it does today.
The extension MUST NOT expose an API by which third-party code supplies or replaces cell content —
configuration names instruments, and the extension implements them.

#### Scenario: Rendering a row

- **WHEN** a row renders
- **THEN** every cell in it holds an instrument and contains the text that instrument resolves to

#### Scenario: Contributing cell content

- **WHEN** the extension's exported surface is inspected
- **THEN** no API exists by which third-party code can supply or replace cell content

#### Scenario: A row that declares no cells

- **WHEN** a declared row declares no `cells`
- **THEN** every cell in it holds `blank` and renders the fixed placeholder text

### Requirement: A row is one line tall

Each row MUST render as exactly one line: cell content wider than the cell MUST be truncated to
the cell width, so the footer's height is the number of declared rows.

#### Scenario: Content wider than its cell

- **WHEN** a cell's content is wider than the cell it renders in
- **THEN** the row still renders one line, clipped to the cell width

#### Scenario: The footer's height

- **WHEN** a configuration declares three rows
- **THEN** the footer renders three lines

## REMOVED Requirements

### Requirement: A row's containers count

**Reason**: `containers` and a row's `cells` array were two spellings of one thing — how many cells
the row has — which is why they could disagree. `cells` is now both the count and the placement, so
no separate count exists and a length mismatch cannot be expressed.

**Migration**: A row that declared `containers: 3` declares `cells` carrying three instrument names
— `["blank", "blank", "blank"]` for three empty cells. A row that declared no `containers` declares
nothing and keeps its eight cells. A `cells` array longer than 8 is truncated to 8, as a
`containers` value above 8 clamped to 8.

## ADDED Requirements

### Requirement: A row's cells are its count and its placement

A row's `cells` array MUST be both the number of cells in the row and the instrument filling each
of them. An absent value MUST mean eight cells, and the ceiling MUST be 8: a `cells` array longer
than 8 MUST be truncated to 8 rather than rejected. Every entry of a longer array MUST still be
validated, so the ceiling applies to its length only: an unknown name past it still warns though
its cell does not render. No other key states a cell count.

#### Scenario: cells absent

- **WHEN** a declared row omits `cells`
- **THEN** the row renders 8 cells, none of them without content

#### Scenario: cells within the ceiling

- **WHEN** a declared row names 3 instruments in `cells`
- **THEN** the row renders 3 cells, each holding the instrument named at its position

#### Scenario: cells above the ceiling

- **WHEN** a declared row names 12 instruments in `cells`
- **THEN** the row renders the first 8 cells and the configuration is accepted

#### Scenario: cells empty

- **WHEN** a declared row carries an empty `cells` list
- **THEN** the configuration is rejected, the default row renders, and the warning names the reason

### Requirement: Configuration designates each cell's instrument

A row MAY declare `cells`, the names of instruments in cell order. The extension MUST render the
instrument named at each position in the cell at that position, and MUST NOT take a cell's
instrument from any other source. An instrument name the extension does not implement MUST produce
a configuration warning naming that instrument, and MUST render that cell as `blank`; the row's
other cells MUST still render their instruments.

#### Scenario: A row that names its instruments

- **WHEN** a declared row carries a `cells` list of instrument names
- **THEN** each cell renders the instrument named at its position, in the order given

#### Scenario: A row that names none

- **WHEN** a declared row carries no `cells` list
- **THEN** the row renders as it does today: the placeholder text in each of its cells, with no
  cell left without content

#### Scenario: An instrument the extension does not implement

- **WHEN** a declared row names an instrument the extension does not implement
- **THEN** the configuration warns, naming the unknown instrument, and that cell renders `blank`
  while the row's other cells render theirs

### Requirement: An instrument resolves a cell's text by reading the store

An instrument that displays a datum MUST resolve that datum by reading the store, and MUST resolve
it synchronously. An instrument that displays no datum — `blank`, whose text is a constant — is
outside that duty: it resolves its constant without reading one. An instrument MUST NOT subscribe to
host events, poll, cache host data itself, or derive data the store can hold. A datum an instrument
needs that the store does not hold MUST be added to the store, not acquired by the instrument.

#### Scenario: Resolving the text of a cell that displays a datum

- **WHEN** a cell holds an instrument that displays a datum
- **THEN** its instrument reads that datum from the store and returns text, without awaiting,
  blocking, or subscribing

#### Scenario: Resolving the text of a cell that displays no datum

- **WHEN** a cell holds `blank`
- **THEN** it resolves its constant text without reading a datum from the store

#### Scenario: An instrument needing a datum the store does not hold

- **WHEN** an instrument would need data the store does not hold
- **THEN** the data is added to the store, and the instrument still only reads

### Requirement: The model instrument

The extension MUST implement a `model` instrument whose label is the active provider and whose data
is the active model, rendering `provider: model`. Configuration MUST be able to place it in a row's
cell, and the footer MUST render it. Its text MUST already be correct when a session is restored,
and MUST change when the host reports a model selection.

#### Scenario: The model changes

- **WHEN** the host reports a new active model
- **THEN** the cell holding `model` renders that model's provider and model id

#### Scenario: A session is restored

- **WHEN** a session is restored and the host reports no selection
- **THEN** the cell holding `model` renders the restored session's provider and model

### Requirement: The thinking instrument

The extension MUST implement a `thinking` instrument whose literal label sits over the active
thinking level as its data, rendering `thinking: level`. Configuration MUST be able to place it in
a row's cell, and the footer MUST render it. Its text MUST already be correct when a session is
restored, and MUST change when the host reports a thinking-level selection.

#### Scenario: The thinking level changes

- **WHEN** the host reports a new thinking level
- **THEN** the cell holding `thinking` renders the new level

#### Scenario: A session is restored

- **WHEN** a session is restored and the host reports no selection
- **THEN** the cell holding `thinking` renders the restored session's thinking level

### Requirement: Instrument text is bound by the row's geometry

The text an instrument resolves to MUST be truncated to its cell's width and padded so the row
stays one line. Instrument text MUST NOT change the geometry: each of a row's N cells occupies
`floor(W / N)` columns at width W, and the leftover `W mod N` columns MUST stay blank at the row's
right edge.

#### Scenario: An instrument's text is wider than its cell

- **WHEN** an instrument resolves to text wider than its cell
- **THEN** the text is clipped to the cell width and the row stays one line

#### Scenario: A row of instruments at a width that does not divide evenly

- **WHEN** a row of 3 instrument cells renders at a width of 100 columns
- **THEN** each cell occupies 33 columns and the remaining column is blank at the right edge
