# Spec Delta

## ADDED Requirements

### Requirement: A rows list is the only way to declare rows

The configuration document MAY carry a top-level `rows` list, the only way to declare rows; each
member MUST be a row written as a list of entries, and a member written as an object MUST be
rejected. A top-level `cells`, `id` or `distribution` MUST be rejected with or without `rows`, and
the message MUST show the `rows` form. A document with neither `rows` nor one of those keys MUST
render the default row.

#### Scenario: Rows in a list

- **WHEN** the configuration carries a `rows` list of row lists
- **THEN** parsing yields one row per member, in the order given

#### Scenario: A row written as an object

- **WHEN** a member of `rows` is an object rather than a list — a row the way it was written before
  this change, or a flat list of entries written one bracket short
- **THEN** the configuration is rejected, the default row renders, and the warning says each row is
  a list and shows the whole form `{"rows": [[{"instrument": "model"}]]}`

#### Scenario: A lone `distribution`

- **WHEN** the document carries a top-level `distribution` and no `rows`, which 0.12.0 read as a
  one-row document
- **THEN** the configuration is rejected, the default row renders, and one warning shows the `rows`
  form and says to drop the top-level `id` or `distribution` it carries

#### Scenario: A lone `id`

- **WHEN** the document carries a top-level `id` and no `rows`
- **THEN** the configuration is rejected, the default row renders, and the warning shows the `rows`
  form and says to drop the top-level `id` or `distribution` it carries

#### Scenario: A lone `cells`

- **WHEN** the document carries a top-level `cells` and no `rows`
- **THEN** the configuration is rejected, the default row renders, and the warning shows the `rows`
  form, so the user sees the shape that replaces the key

#### Scenario: A top-level `cells` beside `rows`

- **WHEN** the document carries a top-level `cells` and a `rows` list together
- **THEN** the configuration is rejected, the default row renders, and the warning shows the `rows`
  form

#### Scenario: One message for every retired key

- **WHEN** the document carries more than one retired top-level key, such as `cells` beside a
  top-level `id`
- **THEN** the configuration is rejected, and a single warning serves them all — the `rows` form it
  shows replaces the retired row key, and it says to drop the top-level `id` or `distribution` — so
  a user fixes every retired key in one edit

#### Scenario: rows is not a list

- **WHEN** the document's `rows` value is not a list — an object, a string, a number or null
- **THEN** the configuration is rejected, the default row renders, and the warning names `rows` and
  the reason

#### Scenario: An empty rows list

- **WHEN** the document's `rows` list is empty, alone or beside settings
- **THEN** the document is accepted with no warning, and the default row renders

#### Scenario: No rows declared

- **WHEN** the document carries no `rows` and no retired key — nothing at all, only `instruments`,
  only `rowGap`, or both
- **THEN** the default row renders

### Requirement: A row's entries are its cells and their places

A row MUST be a list of entries, and the first ten of them MUST be the row's cells, in their order.
An entry MUST be an object whose `instrument` is a non-empty string, and MAY carry `align`; a key it
carries that the extension does not recognise MUST be rejected, naming that key. An empty row MUST
be rejected. A list longer than ten MUST be truncated to ten, not rejected, and every entry in it
MUST still be validated.

#### Scenario: A row of three entries

- **WHEN** a declared row places 3 entry objects in its list
- **THEN** the row renders 3 cells, each holding the instrument its entry names

#### Scenario: A row above the ceiling

- **WHEN** a declared row places 12 entry objects in its list
- **THEN** the row renders the first 10 cells and the configuration is accepted

#### Scenario: An empty row

- **WHEN** a declared row is an empty list
- **THEN** the configuration is rejected, the default row renders, and the warning says the row is
  empty

#### Scenario: An entry that is not an object

- **WHEN** a declared row carries an entry that is not an object — a string, a number, an array or
  null
- **THEN** the configuration is rejected, the default row renders, and the warning says the entry is
  not an object and names the spelling to write, `{"instrument": "model"}`

#### Scenario: Entries past the ceiling are still validated

- **WHEN** a declared row carries more than ten entries and an entry past the tenth is malformed, or
  names an instrument the extension does not implement
- **THEN** the ceiling applies to the list's length only: a malformed entry is still rejected, and an
  unknown instrument name still warns though its cell does not render

#### Scenario: An entry that carries no instrument

- **WHEN** a declared row carries an entry object with no `instrument` key
- **THEN** the configuration is rejected, the default row renders, and the warning says no
  `instrument` is named

#### Scenario: An instrument that is not a name

- **WHEN** a declared row carries an entry whose `instrument` is not a string, or is an empty string
- **THEN** the configuration is rejected, the default row renders, and the warning names the reason

#### Scenario: An entry with a key the extension does not recognise

- **WHEN** a declared row carries an entry with a key the extension does not recognise — the retired
  `distribution`, the declined `width`, or a misspelling such as `aling`
- **THEN** the configuration is rejected, the default row renders, and the warning names the key

### Requirement: An entry names the instrument its cell renders

A row's entries are in cell order. The `instrument` of an entry MUST name the instrument its cell
renders, as the document configures that name or with its declared defaults, and the extension MUST
NOT take a cell's instrument from any other source. An instrument name the extension does not
implement MUST produce a configuration warning naming that instrument and MUST render that cell as
`blank`; the row's other cells MUST still render theirs.

#### Scenario: A row that names its instruments

- **WHEN** a declared row's list holds entry objects
- **THEN** each cell renders the instrument its entry names, in the order given

#### Scenario: An instrument the extension does not implement

- **WHEN** a declared row's entry names `taiknr.savings`, which no shipped instrument answers to
- **THEN** the document is accepted, the warning reads `row 3: "taiknr.savings" is not a known
  instrument`, placed by its row and never by the entry's position, and that cell renders `blank`
  while the row's other cells render theirs

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

### Requirement: A rejection locates its offender by row and position

A message that rejects one entry MUST place it by its row and by its position in that row, written
`row 1, instrument 2`. A message that rejects a row rather than one entry MUST place it by its row
alone, written `row 3`. Both numbers MUST count from 1, so the first row is row 1 and its first
entry is instrument 1.

#### Scenario: The first row and its first entry

- **WHEN** the first entry of the first row is malformed
- **THEN** the warning carries the placement `row 1, instrument 1:`

#### Scenario: A later row and a later entry

- **WHEN** the second entry of the third row is malformed
- **THEN** the warning carries the placement `row 3, instrument 2:`

#### Scenario: An entry past the tenth

- **WHEN** the twelfth entry of the second row is malformed
- **THEN** the warning carries the placement `row 2, instrument 12:`, because the position counts
  every entry in the list

#### Scenario: A row with no one entry to blame

- **WHEN** a row is malformed as a whole, because it is an empty list or not a list
- **THEN** the warning carries the placement `row 2:` for the second row, and names no entry

### Requirement: Cell text is the instrument its entry names

Every cell MUST hold an instrument, and a cell's content MUST be what its instrument renders: its
format with its variables substituted. `blank` is an instrument whose default format is the fixed
placeholder text; it is what the default row's ten cells hold. The extension MUST NOT expose an API
by which third-party code supplies or replaces cell content — configuration names instruments and
their formats, and the extension implements them.

#### Scenario: Rendering a row

- **WHEN** a row renders
- **THEN** every cell in it holds an instrument and contains the text that instrument resolves to

#### Scenario: Contributing cell content

- **WHEN** the extension's exported surface is inspected
- **THEN** no API exists by which third-party code can supply or replace cell content

### Requirement: A cell takes the width its content needs

By default a cell MUST take the width its content needs, except a `blank` or `$bar` cell, which MUST
fill and share the spare columns, the remainder to the earliest. With none, they go to the last
left-aligned non-empty cell, else the first non-empty one, else the first cell, even when empty; an
empty cell MUST otherwise take none. The joint MUST give way before any content does.

#### Scenario: The default gives each cell what its content needs

- **WHEN** a row of `path`, `model` and `thinking` renders at 132 columns, `path` left-aligned and
  the other two right-aligned
- **THEN** `model` and `thinking` each occupy the width of their text, and `path` takes every other
  column except the one between `model` and `thinking`

#### Scenario: Joel's second row keeps its thirds

- **WHEN** a row of two `blank` cells and a right-aligned `context` cell holding `$bar` renders at
  100 columns
- **THEN** the cells occupy 34, 33 and 33 columns, and the bar fills the width its own third leaves

#### Scenario: A blank cell and a bar cell fill

- **WHEN** a row of a `blank` cell, a `model` cell and a `$bar` cell renders at 90 columns
- **THEN** the `model` cell occupies only its text's width, and the `blank` and `$bar` cells share
  every other column, differing by at most one

#### Scenario: An empty cell takes no column

- **WHEN** a row of a left-aligned `path` cell, a right-aligned `model` cell and a last left-aligned
  cell whose instrument renders nothing is rendered at 80 columns
- **THEN** the empty cell occupies 0 columns, and the spare columns go to the `path` cell, the last
  left-aligned non-empty cell, so the empty cell's presence does not change where any text sits

#### Scenario: A row whose cells all render nothing

- **WHEN** a row of `model` and `thinking` cells, with no fill cell, renders at 80 columns before
  either datum is known
- **THEN** the first cell, though empty, takes the spare columns, and the row renders one line 80
  columns wide

#### Scenario: No joint beside an absorbing cell

- **WHEN** a left-aligned `path` cell absorbs the spare columns beside a right-aligned `model` cell
- **THEN** only those spare columns separate their texts, and the `model` cell occupies exactly its
  text's width

#### Scenario: No joint beside a fill cell

- **WHEN** a row of a `model` cell, a `blank` cell and a `thinking` cell renders at a width equal to
  the sum of the two texts' widths
- **THEN** the two texts abut, no joint is added beside the `blank` cell, and neither text is
  shortened

#### Scenario: A joint beside an absorbing cell at the margin

- **WHEN** a row of a left-aligned `path`, a right-aligned `model` and a right-aligned `thinking`
  renders at one column more than its three texts' widths
- **THEN** the `thinking` text keeps its joint, the `path` text abuts the `model` text, and no text
  is shortened

#### Scenario: The joints collapse together

- **WHEN** the same row renders at exactly its three texts' widths
- **THEN** no joint remains anywhere in it, no text is shortened, and the row is one line

#### Scenario: The joint collapses before content does

- **WHEN** two adjacent content-sized cells have text that fits the row only without the one column
  between them
- **THEN** the row is one line, the joint is gone, and neither cell's text is shortened for it

#### Scenario: The terminal is resized

- **WHEN** the same row renders again at a different width
- **THEN** its cells take the widths that rule gives at the new width, and no cell keeps a width it
  was given at the previous one

#### Scenario: Composition and allocation are the host's

- **WHEN** a row's cells are composed into a line
- **THEN** the composition, the child iteration and the allocation of the columns are pi-tui's, and
  the extension pads nothing onto the composed line

### Requirement: rowGap sets the space between declared rows

The configuration document MAY carry a top-level `rowGap` beside `rows`, whose value MUST be a whole
number from 0 to 3 and sets the empty lines between each pair of rows and nothing above row one;
absent leaves the default space. `rowGap: 0` MUST render no empty line between rows. Any other
value MUST reject the document, name `rowGap` and the value in the warning, and render the default
row.

#### Scenario: A larger gap

- **WHEN** the document sets `rowGap` to `2` and declares two rows
- **THEN** the footer renders row one, two empty lines, row two, four lines

#### Scenario: The largest gap

- **WHEN** the document sets `rowGap` to `3` and declares two rows
- **THEN** the configuration is accepted and the footer renders three empty lines between the rows
  and none above row one

#### Scenario: A gap of zero

- **WHEN** the document sets `rowGap` to `0` and declares two rows, or one
- **THEN** the footer renders the rows and no empty line between them, and nothing above row one

#### Scenario: A gap that is not a whole number from 0 to 3

- **WHEN** the document sets `rowGap` to `-1`, `1.5`, `"1"`, `null`, `4` or `1e21`
- **THEN** the configuration is rejected, the default row renders, and the warning names `rowGap`
  and the value

#### Scenario: A misspelt key

- **WHEN** the document carries `rowgap` or another key the reader does not know
- **THEN** it is ignored without a warning, as every unknown document key is, and the default space
  renders

## MODIFIED Requirements

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

- **WHEN** the `instruments` object configures a name the extension does not implement, and no
  row's entry names it
- **THEN** the document is accepted, and the warning names it in a form of its own that is placed by
  the `instruments` block rather than by a row, and that claims nothing about any cell's rendering

#### Scenario: A name the block and a row both name

- **WHEN** the `instruments` object configures a name the extension does not implement and a row's
  entry names it too
- **THEN** the document is accepted, and the name is reported twice: once by the row, and once by
  the `instruments` block

#### Scenario: An option the instrument does not declare

- **WHEN** an instrument's entry carries a key its declaration does not have — a misspelling such as
  `frmát`, or the declined `width`
- **THEN** the document is rejected, the default row renders, and the warning names the key

#### Scenario: A trusted project's document

- **WHEN** a trusted project's document and the agent document both configure instruments
- **THEN** the project's document replaces the agent's whole, and only its configuration applies

### Requirement: A cell's alignment is the padding side inside it

A row's entry MAY declare `align`, whose value MUST be `left`, `right` or `center`; an absent `align`
MUST mean `left`. Clipping stays at the text's end with the ellipsis the row already uses, and the
space the text leaves in its cell, whether or not clipping occurred, MUST become padding that puts
the text against the side `align` names — `center` splits it across both sides. The pad MUST be
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
  `left`, and the cell still occupies the columns its row gave it

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

### Requirement: Instrument text is bound by the row's geometry

The text an instrument renders MUST be clipped at its end, with the ellipsis the row already uses, and
never wrapped, so a row stays one line of exactly the row's width, even when its cells need more
columns than the row has or grow between renders. Every cell MUST be eligible to give up columns; no
promise says which loses first or by what ratio. `align` in a cell with no spare columns changes nothing.

#### Scenario: An instrument's text is wider than its cell

- **WHEN** an instrument resolves to text wider than its cell
- **THEN** the text is clipped to the cell width and the row stays one line

#### Scenario: Content that needs more than the row

- **WHEN** a row of three cells, each holding text 40 columns wide, renders at 80 columns
- **THEN** the footer shows one line for that row, 80 columns wide, no cell's text carries a line
  break, and each cell's text is whole or clipped at its end with the ellipsis

#### Scenario: A cell's content grows

- **WHEN** an instrument's text grows from a short value to a long one between two renders at the same
  width
- **THEN** the row is still one line of that width

#### Scenario: A right-aligned last cell at a width that does not divide evenly

- **WHEN** a row of ten `blank` cells renders at 132 columns with `align` `right` on its last cell
- **THEN** its text ends at its own cell's right edge, which is the row's right edge — at 132 columns
  the last cell occupies 13 columns and its text ends at the window's edge

#### Scenario: A row of instruments at a width that does not divide evenly

- **WHEN** a row of 3 instrument cells renders at 100 columns
- **THEN** the row spans all 100 columns with nothing blank at the right edge, and the cells that are
  not filling occupy only their text's width

#### Scenario: An align in a cell with no spare columns

- **WHEN** a content-sized cell declares `align` `right` or `center` and its width is its text's width
- **THEN** it renders the same columns as `align` `left`

## REMOVED Requirements

### Requirement: Both configuration shapes normalize to a list of rows

**Reason**: Joel retired the one-row shortcut, answering `michael-orientation.md`'s JOEL-1 with
"a" (`owner-rulings.md`, "The one-row shortcut is retired"): `rows` is the only way to declare rows,
so a document that puts `cells` at its top level is rejected rather than normalized. That ruling
retires his own rule of 2026-11-02 (D14). Replaced by "A rows list is the only way to declare rows".

**Migration**: Write a one-row document as `{"rows": [[{"instrument": "model"}]]}`. The rejection
names the new form.

### Requirement: Row identifiers

**Reason**: A row is now a plain list of entries, so a row cannot carry an `id` (Joel's ruling,
2026-11-15; `michael-orientation.md` D3). Every row's identifier is synthesized, so the check for
duplicate identifiers can never fire (`michael-orientation.md` T7: the duplicate-id check is `id`'s
only reader).

**Migration**: Remove `id` from every row. A document that still carries one is rejected; nothing
replaces the key, because a row is now placed by its position in `rows`.

### Requirement: Cells are evenly distributed across the width

**Reason**: A configuration can no longer set `distribution`, so nothing a user writes selects equal
shares (Joel's ruling, 2026-11-15: "it seems safe to drop. we should keep the code in place though";
`michael-orientation.md` D8). The renderer keeps its support for both distributions and its tests.
Replaced by "A cell takes the width its content needs", which states the content layout alone.

**Migration**: Remove `distribution` from every row. A row that still carries one is rejected,
because a row's entries are a list and the key is not `instrument` or `align`. Equal shares can no
longer be configured.

### Requirement: Cell content comes from an instrument

**Reason**: Its scenario "A row that declares no cells" states behaviour this change makes
impossible, because an empty row is rejected and `cells` is no longer a key; OpenSpec cannot drop a
scenario inside a `MODIFIED` block (`michael-orientation.md` T1; `research-chidi.md` §1). Replaced
by "Cell text is the instrument its entry names", which keeps the third-party clause word for word.

**Migration**: None. Every rule it stated that still holds is stated by its replacement.

### Requirement: A row's cells are its count and its placement

**Reason**: Its scenario "cells absent" states behaviour this change makes impossible, because a row
with no entries is now rejected and `cells` is no longer a key; OpenSpec cannot drop a scenario
inside a `MODIFIED` block (`michael-orientation.md` T1). Replaced by "A row's entries are its cells
and their places".

**Migration**: A row's list is its cell count and its placement. Write ten entries to get ten cells;
an empty row is rejected.

### Requirement: Configuration designates each cell's instrument

**Reason**: Its scenario "A row that names none" states behaviour this change makes impossible,
because `cells` is no longer a key; OpenSpec cannot drop a scenario inside a `MODIFIED` block
(`michael-orientation.md` T1). Replaced by "An entry names the instrument its cell renders".

**Migration**: None. Each entry names one instrument, and the rules for an unknown name are
unchanged.

### Requirement: rowGap sets the space between rows

**Reason**: Its scenario "A gap beside either shape" states behaviour this change makes impossible,
because there is one shape for rows now; OpenSpec cannot drop a scenario inside a `MODIFIED` block
(`michael-orientation.md` T1). Replaced by "rowGap sets the space between declared rows".

**Migration**: None. `rowGap` keeps its range, its default and its meaning beside `rows`.
