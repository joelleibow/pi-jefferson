## ADDED Requirements

### Requirement: Two neighbouring instruments can read as one at the row's right edge

A row MUST be able to place two instruments so that only the joint separates their text, the second
one's text ends at the row's right edge, and another instrument's text starts at the row's left edge.
The space between the two MUST NOT grow with the row's width. The joint is one column, between two
non-empty content-sized cells with no spare room between them; there is none beside a fill cell, nor
where an absorbing cell's spare columns land.

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

Any width a row derives from a cell's content MUST be the visible terminal columns of that content,
unclipped and unpadded, label and gap included, never code units, so that a wide glyph or an escape
sequence neither moves a neighbour nor makes a cell overrun.

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
MUST fill and share the spare columns, the remainder to the earliest. With no fill cell the spare columns
go to the last left-aligned non-empty cell, else the first non-empty one; an empty cell MUST take none.
A row's `distribution` MUST be `"content"` (absent) or `"equal"`, which gives `floor(W / N)` each; any
other value MUST be rejected. The joint MUST give way before any content does.

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

#### Scenario: The row option's values

- **WHEN** a row declares `distribution` `"content"`, or declares none
- **THEN** its cells are sized by their content; and `"equal"` gives the equal shares of the scenarios
  below

#### Scenario: A distribution that is not one of the two

- **WHEN** a row declares `distribution` as `"equl"`, `"Equal"`, `4` or `null`
- **THEN** the configuration is rejected, the default row renders, and the warning names the key and the
  value and lists the two valid ones, `"content"` and `"equal"`

#### Scenario: A distribution beside rows

- **WHEN** a document carries a top-level `distribution` and a `rows` list together
- **THEN** the configuration is rejected like a top-level `cells` or `id` beside `rows`, the default row
  renders, and the warning says the document carries both a top-level row and a rows list

#### Scenario: An empty cell takes no column

- **WHEN** a row of a left-aligned `path` cell, a `model` cell and a last left-aligned cell whose
  instrument renders nothing is rendered at 80 columns
- **THEN** the empty cell occupies 0 columns, and the spare columns go to the `path` cell, the last
  left-aligned non-empty cell, so the empty cell's presence does not change where any text sits

#### Scenario: No joint beside an absorbing cell

- **WHEN** a left-aligned `path` cell absorbs the spare columns beside a right-aligned `model` cell
- **THEN** only those spare columns separate their texts, and the `model` cell occupies exactly its
  text's width

#### Scenario: No joint beside a fill cell

- **WHEN** a row of a `model` cell, a `blank` cell and a `thinking` cell renders at a width equal to the
  sum of the two texts' widths
- **THEN** the two texts abut, no joint is added beside the `blank` cell, and neither text is shortened

#### Scenario: A joint beside an absorbing cell at the margin

- **WHEN** a row of a left-aligned `path`, a right-aligned `model` and a right-aligned `thinking` renders
  at one column more than its three texts' widths
- **THEN** the `thinking` text keeps its joint, the `path` text abuts the `model` text, and no text is
  shortened

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
- **THEN** the composition, the child iteration and the allocation of the columns are pi-tui's, and the
  extension pads nothing onto the composed line

### Requirement: A row's cells are its count and its placement

A row's `cells` array MUST be both the number of cells in the row and the cell object at each
position. An absent value MUST mean ten cells and the ceiling MUST be ten: a longer array MUST be
truncated to ten, not rejected. Each entry MUST be an object whose `instrument` is a non-empty
string. A key on a cell object that the extension does not recognise MUST be rejected, naming that key.
No other key states a cell count.

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

- **WHEN** a row of three cells, each holding text 40 columns wide, renders at 80 columns
- **THEN** the footer shows one line for that row, 80 columns wide, no cell's text carries a line
  break, and each cell's text is whole or clipped at its end with the ellipsis

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
