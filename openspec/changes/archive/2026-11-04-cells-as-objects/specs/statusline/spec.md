# Spec Delta

## MODIFIED Requirements

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

### Requirement: A row's cells are its count and its placement

A row's `cells` array MUST be both the number of cells in the row and the cell object at each
position. An absent value MUST mean ten cells and the ceiling MUST be ten: a longer array MUST be
truncated to ten, not rejected. Every entry of a longer array MUST still be validated, so the
ceiling applies to its length only: an unknown instrument past it still warns though it does not
render. Each entry MUST be an object whose `instrument` is a non-empty string. A key on a cell
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

### Requirement: Instrument text is bound by the row's geometry

The text an instrument resolves to MUST be clipped at its end to its cell's width and padded to the
cell's full width — on the side opposite the cell's `align`, or across both sides under `center` —
so the row stays one line. Instrument text MUST NOT change the geometry: each of a row's N cells
occupies `floor(W / N)` columns at width W, and the leftover `W mod N` columns MUST stay blank at
the row's right edge. Alignment hugs its cell's edge, not the row's, so a right-aligned last cell
ends `W mod N` columns short of that edge — 2 columns at 132 with ten cells.

#### Scenario: An instrument's text is wider than its cell

- **WHEN** an instrument resolves to text wider than its cell
- **THEN** the text is clipped to the cell width and the row stays one line

#### Scenario: A row of instruments at a width that does not divide evenly

- **WHEN** a row of 3 instrument cells renders at a width of 100 columns
- **THEN** each cell occupies 33 columns and the remaining column is blank at the right edge

## ADDED Requirements

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
