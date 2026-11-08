## ADDED Requirements

### Requirement: Two neighbouring instruments can read as one at the row's right edge

A row MUST be able to place two instruments so that only the joint separates their text, the second
one's text ends at the row's right edge, and another instrument's text starts at the row's left edge.
The space between the two MUST NOT grow with the row's width.

#### Scenario: A working directory at the left, two instruments together at the right

- **WHEN** a row of `path`, `model` and `thinking` renders at 132 columns, with `model` and `thinking`
  right-aligned and neighbouring
- **THEN** the `path` text starts at the row's first column, the `thinking` text ends at column 132,
  and the `model` text ends one column before the `thinking` text starts

#### Scenario: The row is narrower

- **WHEN** the same row renders at 80 columns and the `path` text still fits
- **THEN** the `thinking` text ends at column 80 and the `model` text still ends one column before the
  `thinking` text starts

### Requirement: A row spans the full width however its cells are sized

Every column of a row's line MUST be allocated, at any width and whatever its cells hold: a
right-aligned last cell's text MUST end at the window's edge. Composition and allocation of the row's
columns MUST stay pi-tui's, and the extension MUST NOT pad the composed line itself.

#### Scenario: Content narrower than the row

- **WHEN** a row whose cells hold short text renders at 100 columns
- **THEN** the line is 100 columns wide, nothing at its right edge is left unallocated, and a
  right-aligned last cell's text ends at column 100

#### Scenario: The terminal is resized

- **WHEN** the same row renders again at 90 columns
- **THEN** the line is 90 columns wide, spanning the new width

### Requirement: A width-taking bar stays accounted for in a row's geometry

An instrument's `$bar` MUST keep taking exactly the columns the rest of its format leaves in the cell it
is given, and MUST shrink to nothing when none are left. The cell's width MUST NOT be derived from the
bar's own output, and a row holding a bar MUST still span the full width in one line.

#### Scenario: A bar in a row with other cells

- **WHEN** a row of a left-aligned `path` cell and a `context` cell whose format is `$percent $bar`
  renders at 80 columns
- **THEN** the line is one line of 80 columns, and the bar's block characters fill only the columns its
  own cell leaves after the rest of the format

#### Scenario: A bar with no room

- **WHEN** the cell holding `$bar` has no columns left after the rest of its format
- **THEN** the bar draws nothing and the row is still one line spanning the full width

### Requirement: Cell widths are measured in terminal columns

Any width a row derives from a cell's content MUST be the visible terminal columns of that content as
clipped, label and gap included, never code units, so that a wide glyph or an escape sequence neither
moves a neighbour nor makes a cell overrun.

#### Scenario: A wide-glyph label

- **WHEN** a cell's label is the emoji `🧠`, which occupies two columns, followed by its gap and its text
- **THEN** a neighbouring cell's text starts after all of those visible columns

#### Scenario: Styled text

- **WHEN** a cell's text carries style escape sequences
- **THEN** the position of a neighbouring cell's text is the same as it would be with unstyled text of
  the same visible width

## MODIFIED Requirements

### Requirement: Cells are evenly distributed across the width

By default a cell MUST take the width its content needs, except a `blank` cell and a `$bar` cell, which
MUST fill: they share the spare columns equally, the remainder to the earliest. With no fill cell, the
spare columns go to the last left-aligned cell, else the first. Adjacent content-sized cells with no
spare room between them MUST get one column between them, which MUST give way before any content does.
A row option MUST restore equal shares, `floor(W / N)` each.

#### Scenario: The default gives each cell what its content needs

- **WHEN** a row of `path`, `model` and `thinking` renders at 132 columns with no row option, `path`
  left-aligned and the other two right-aligned
- **THEN** `model` and `thinking` each occupy the width of their text, and `path` takes every other
  column except the one between `model` and `thinking`

#### Scenario: Joel's second row keeps its thirds

- **WHEN** a row of two `blank` cells and a right-aligned `context` cell holding `$bar` renders at 100
  columns with no row option
- **THEN** the cells occupy 34, 33 and 33 columns, and the bar fills the width its own third leaves

#### Scenario: A blank cell and a bar cell fill

- **WHEN** a row of a `blank` cell, a `model` cell and a `$bar` cell renders at 90 columns
- **THEN** the `model` cell occupies only its text's width, and the `blank` and `$bar` cells share every
  other column, differing by at most one

#### Scenario: A width that divides evenly

- **WHEN** a row of 8 cells renders at 80 columns with the row option that restores equal shares
- **THEN** each cell occupies 10 columns

#### Scenario: A width that does not divide evenly

- **WHEN** a row of 3 cells renders at 100 columns with the row option that restores equal shares
- **THEN** the first cell occupies 34 columns and the other two 33 each, whatever their content, so the
  row spans all 100 columns with nothing left blank at the right edge

#### Scenario: A row of ten cells at a width that does not divide evenly

- **WHEN** the default row of ten cells renders at 132 columns with the row option that restores equal
  shares
- **THEN** the first two cells occupy 14 columns and the other eight 13 each, so the row spans all 132
  columns

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
- **THEN** the composition, the child iteration and the allocation of the columns are pi-tui's, and the
  extension pads nothing onto the composed line

### Requirement: A row's cells are its count and its placement

A row's `cells` array MUST be both the number of cells in the row and the cell object at each
position. An absent value MUST mean ten cells and the ceiling MUST be ten: a longer array MUST be
truncated to ten, not rejected. Each entry MUST be an object whose `instrument` is a non-empty
string. A key the extension does not recognise MUST be rejected, naming that key. No other key states
a cell count.

#### Scenario: cells absent

- **WHEN** a declared row omits `cells` and renders at 80 columns
- **THEN** the row renders 10 cells, none of them without content, on one line 80 columns wide

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

### Requirement: Instrument text is bound by the row's geometry

The text an instrument renders MUST be clipped at its end, with the ellipsis the row already uses, and
never wrapped, so a row stays one line of exactly the row's width, even when its cells need more
columns than the row has or grow between renders. Every cell MUST be eligible to give up columns; no
promise says which loses first or by what ratio. `align` in a cell with no spare columns changes nothing.

#### Scenario: An instrument's text is wider than its cell

- **WHEN** an instrument resolves to text wider than its cell
- **THEN** the text is clipped to the cell width and the row stays one line

#### Scenario: Content that needs more than the row

- **WHEN** a row's cells hold text needing 120 columns in all and the row renders at 80 columns
- **THEN** the footer shows one line for that row, 80 columns wide, no cell's text carries a line
  break, and every cell's text is clipped at its end with the ellipsis

#### Scenario: A cell's content grows

- **WHEN** an instrument's text grows from a short value to a long one between two renders at the same
  width
- **THEN** the row is still one line of that width

#### Scenario: A right-aligned last cell at a width that does not divide evenly

- **WHEN** the last cell of a row declares `align` `right`, the row option restores equal shares, and
  the width does not divide by the cell count
- **THEN** its text ends at its own cell's right edge, which is the row's right edge — at 132 with ten
  cells the last cell occupies 13 columns and its text ends at the window's edge

#### Scenario: A row of instruments at a width that does not divide evenly

- **WHEN** a row of 3 instrument cells renders at 100 columns with no row option
- **THEN** the row spans all 100 columns with nothing blank at the right edge, and the cells that are
  not filling occupy only their text's width

#### Scenario: An align in a cell with no spare columns

- **WHEN** a content-sized cell declares `align` `right` or `center` and its width is its text's width
- **THEN** it renders the same columns as `align` `left`

### Requirement: The footer's tree is built once and reads the current render's sample

The footer MUST build its tree once, when installed: a `VStack` holding one `HStack` per declared row,
each holding that row's cells. Every render MUST lay out that tree, and every cell MUST read the sample
taken at the start of its render. A row MUST re-lay out when a cell's width changes, not only the
window's; entry options are re-seated through the stack's public typed route, keeping every component.
Cached text MUST NOT survive into a later render, and MUST be dropped on `invalidate()`.

#### Scenario: Two renders

- **WHEN** the footer renders twice
- **THEN** both renders lay out the tree built when the footer was installed, and the second reads
  the sample taken at its own start

#### Scenario: A push between two renders

- **WHEN** the store receives a change that alters displayed data between two renders
- **THEN** the second render shows it, and no text the first render produced survives into it

#### Scenario: The host invalidates the footer

- **WHEN** the host calls the footer's `invalidate()`, as it does when the theme changes
- **THEN** what the footer cached is dropped and the next render rebuilds it

#### Scenario: A resize re-seats the entry options

- **WHEN** the footer renders at a width other than the one before it
- **THEN** each row re-seats its cells' entry options for the new width by clearing the row's stack
  and adding the same cell components back, reaching no entry list the host keeps protected and
  importing no layout symbol the host does not export

#### Scenario: A cell's content changes width

- **WHEN** the `thinking` text changes from `High` to `Max` between two renders at the same width
- **THEN** the second render lays the row out for the new text: the `thinking` text still ends at the
  row's right edge and the `model` text ends one column before it starts
