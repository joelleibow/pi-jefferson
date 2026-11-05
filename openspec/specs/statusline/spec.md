# statusline Specification

## Purpose
The statusline pi-jefferson renders: the rows a user declares in configuration, and the evenly
divided cells each row renders in the footer.

## Requirements

### Requirement: The statusline renders the declared rows

In TUI mode the extension MUST install the rows its configuration declares as the footer — one
footer line per row, in declaration order — replacing the host's built-in footer. Outside TUI
mode it MUST NOT install a footer, and loading MUST NOT fail.

#### Scenario: TUI mode with declared rows

- **WHEN** the extension loads in TUI mode and the configuration declares two rows
- **THEN** the footer renders two lines, in the declared order, each built from that row's cells

#### Scenario: A mode without terminal rendering

- **WHEN** the extension loads in print, JSON, or RPC mode
- **THEN** no footer is installed and loading does not fail

### Requirement: Both configuration shapes normalize to a list of rows

The configuration MUST accept a single row object at the top level, which implies one row, or a
list of row objects; the extension MUST normalize both shapes to a list of rows at parse time. A
configuration that carries both shapes at once MUST be rejected.

#### Scenario: A single row at the top level

- **WHEN** the configuration is a row object at the top level
- **THEN** parsing yields exactly one row

#### Scenario: A list of rows

- **WHEN** the configuration carries a list of row objects
- **THEN** parsing yields one row per entry, in the order given

#### Scenario: Both shapes at once

- **WHEN** the configuration carries a top-level row and a list of rows
- **THEN** the configuration is rejected and none of it is rendered

### Requirement: Row identifiers

Each row MAY declare an `id`. The extension MUST synthesize an identifier for a row that declares
none, and identifiers MUST be unique within a configuration: two rows sharing one MUST be
rejected.

#### Scenario: An unnamed row

- **WHEN** a declared row omits `id`
- **THEN** parsing gives it a synthesized identifier that is non-empty and unique among the
  configuration's rows

#### Scenario: Duplicate identifiers

- **WHEN** two declared rows carry the same `id`
- **THEN** the configuration is rejected and none of it is rendered

### Requirement: Cells are evenly distributed across the width

For a row of N cells rendered at width W, each cell MUST occupy `floor(W / N)` columns, and the
leftover `W mod N` columns MUST stay unallocated at the row's right edge; the rendered line MUST
still span the full width. Cell widths MUST be recomputed from the width given at render time.

#### Scenario: A width that divides evenly

- **WHEN** a row of 8 cells renders at a width of 80 columns
- **THEN** each cell occupies 10 columns

#### Scenario: A width that does not divide evenly

- **WHEN** a row of 3 cells renders at a width of 100 columns
- **THEN** each cell occupies 33 columns and the remaining column is blank at the right edge

#### Scenario: The terminal is resized

- **WHEN** the same row renders again at a different width
- **THEN** each cell occupies `floor(new width / N)` columns, and no cell keeps its previous width

### Requirement: Cell content comes from an instrument

Every cell MUST hold an instrument, and a cell's content MUST be the text its instrument resolves
to. `blank` is an instrument: it renders the fixed placeholder text, it is what the default row's
ten cells hold, and it is what a row that declares no `cells` renders, exactly as it does today.
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

### Requirement: The configuration surface is extension-owned

The extension MUST own the configuration surface it reads: it MUST NOT rely on a host-provided
per-extension settings block, because none exists.

#### Scenario: Resolving the configuration

- **WHEN** the extension resolves the rows it renders
- **THEN** it reads a configuration surface it owns

#### Scenario: An inherited settings block

- **WHEN** the extension's configuration reading is inspected
- **THEN** no host-provided per-extension settings block supplies the rows

### Requirement: A row's cells are its count and its placement

A row's `cells` array MUST be both the number of cells in the row and the cell object at each
position. An absent value MUST mean ten cells and the ceiling MUST be ten: a longer array MUST be
truncated to ten, not rejected. Each entry MUST be an object whose `instrument` is a non-empty
string. A key on a cell
object that the extension does not recognise MUST be rejected, and the warning MUST name that key.
No other key states a cell count.

#### Scenario: cells absent

- **WHEN** a declared row omits `cells`
- **THEN** the row renders 10 cells, none of them without content

#### Scenario: cells within the ceiling

- **WHEN** a declared row places 3 cell objects in `cells`
- **THEN** the row renders 3 cells, each holding the instrument its object names

#### Scenario: cells above the ceiling

- **WHEN** a declared row places 12 cell objects in `cells`
- **THEN** the row renders the first 10 cells and the configuration is accepted

#### Scenario: cells empty

- **WHEN** a declared row carries an empty `cells` list
- **THEN** the configuration is rejected, the default row renders, and the warning names the reason

#### Scenario: a cells entry that is not a string

- **WHEN** a declared row carries a `cells` entry that is not an object — the string this key took
  before this change, a number, an array, or null (the heading predates this change, and OpenSpec
  refuses a scenario rename inside a MODIFIED block)
- **THEN** the configuration is rejected, the default row renders, and the warning says the entry
  is not an object and names the spelling to declare, `{"instrument": "model"}`

#### Scenario: entries past the ceiling are still validated

- **WHEN** a declared row carries more than ten entries and an entry past the tenth is malformed, or
  names an instrument the extension does not implement
- **THEN** the ceiling applies to the array's length only: a malformed entry is still rejected, and
  an unknown instrument name still warns though its cell does not render

#### Scenario: an entry that carries no instrument

- **WHEN** a declared row carries a `cells` entry object with no `instrument` key
- **THEN** the configuration is rejected, the default row renders, and the warning names the reason

#### Scenario: an instrument that is not a name

- **WHEN** a declared row carries a cell object whose `instrument` is not a string, or is an empty
  string
- **THEN** the configuration is rejected, the default row renders, and the warning names the reason

#### Scenario: a cell object with an unrecognised key

- **WHEN** a declared row carries a cell object with a key the extension does not recognise — the
  declined `width`, or a misspelling such as `aling`
- **THEN** the configuration is rejected, the default row renders, and the warning names the key

### Requirement: Configuration designates each cell's instrument

A row MAY declare `cells`, the cell objects in cell order. The `instrument` of the object at a
position MUST name the instrument the cell at that position renders: the extension MUST render that
instrument there, and MUST NOT take a cell's instrument from any other source. An instrument name
the extension does not implement MUST produce a configuration warning naming that instrument, and
MUST render that cell as `blank`; the row's other cells MUST still render their instruments.

#### Scenario: A row that names its instruments

- **WHEN** a declared row carries a `cells` list of cell objects
- **THEN** each cell renders the instrument its object names, in the order given

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

The text an instrument resolves to MUST be clipped at its end to its cell's width and padded to the
cell's full width — on the side opposite the cell's `align`, or across both sides under `center` —
so the row stays one line. Instrument text MUST NOT change the geometry: each of a row's N cells
occupies `floor(W / N)` columns at width W, and the leftover `W mod N` columns MUST stay blank at
the row's right edge. Alignment hugs its cell's edge, not the row's.

#### Scenario: An instrument's text is wider than its cell

- **WHEN** an instrument resolves to text wider than its cell
- **THEN** the text is clipped to the cell width and the row stays one line

#### Scenario: A right-aligned last cell at a width that does not divide evenly

- **WHEN** the last cell of a row declares `align` `right` and the row's width does not divide by the
  cell count
- **THEN** its text ends at its own cell's right edge, `W mod N` columns short of the row's edge —
  2 columns at 132 with ten cells

#### Scenario: A row of instruments at a width that does not divide evenly

- **WHEN** a row of 3 instrument cells renders at a width of 100 columns
- **THEN** each cell occupies 33 columns and the remaining column is blank at the right edge

### Requirement: A cell's alignment is the padding side inside it

A cell MAY declare `align`, whose value MUST be `left`, `right` or `center`; an absent value MUST
mean `left`. Clipping stays at the text's end with the ellipsis the row already uses, and the space
the text leaves in its cell, whether or not clipping occurred, MUST become padding that puts the
text against the side `align` names — `center` splits it across both sides. The pad MUST be
measured in visible terminal columns, after clipping, never in code units.

#### Scenario: A cell that declares no align

- **WHEN** a cell declares no `align`
- **THEN** its text is clipped at its end and the space it leaves is padding to its right, so the
  text starts at the cell's left edge

#### Scenario: A right-aligned cell narrower than its cell

- **WHEN** a cell declaring `align` `right` holds text narrower than the cell
- **THEN** the pad sits to the text's left, so the text ends at the cell's right edge

#### Scenario: A centred cell narrower than its cell

- **WHEN** a cell declaring `align` `center` holds text narrower than the cell
- **THEN** the pad is split across both sides of the text, `floor(pad / 2)` columns to its left and
  the remainder to its right, so an odd pad leaves its extra column on the right and the text sits
  half a column left of exact centre

#### Scenario: Text wider than the cell, under any alignment

- **WHEN** a cell's text is wider than the cell, whichever `align` it declares
- **THEN** clipping consumes the cell's whole width, no pad remains, and every alignment renders the
  same columns

#### Scenario: An align outside the three

- **WHEN** a cell declares an `align` other than `left`, `right` or `center` — `"middle"`,
  `"Center"`, or a value that is not a string such as `4`
- **THEN** the configuration is rejected, the default row renders, and the warning names the align
  value

#### Scenario: A wide glyph at the clip boundary

- **WHEN** a cell's text is clipped where a wide glyph straddles the cut, so the glyph is dropped and
  the text is narrower than its cell by more than an ASCII clip would leave
- **THEN** the pad it leaves sits to the text's left under `right` and to the text's right under
  `left`, and the cell still occupies `floor(W / N)` columns

#### Scenario: An emoji in a cell

- **WHEN** a cell's text carries an emoji and clips narrower than its cell
- **THEN** the pad sits to the text's left under `right` and to the text's right under `left`, with
  the emoji measured the way the host measures it

#### Scenario: ANSI styling in a cell

- **WHEN** a cell's text carries ANSI styling and clips narrower than its cell
- **THEN** the pad sits to the text's left under `right` and to the text's right under `left`, the
  pad carries none of that styling — which the renderer may achieve with a style reset before the
  pad — and the host's line-end style reset is untouched

#### Scenario: A combining mark in a cell

- **WHEN** a cell's text carries a combining mark and clips narrower than its cell
- **THEN** the pad sits to the text's left under `right` and to the text's right under `left`, with
  the mark measured the way the host measures it
