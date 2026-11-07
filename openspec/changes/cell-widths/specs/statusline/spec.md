## ADDED Requirements

### Requirement: Two neighbouring instruments can read as one at the row's right edge

A row MUST be able to place two instruments so that nothing but the joint between them separates their
text and the second one's text ends at the row's right edge, with another instrument's text starting at
the row's left edge. The space between the two MUST NOT grow with the row's width.

#### Scenario: A working directory at the left, two instruments together at the right

- **WHEN** a row of `path`, `model` and `thinking` renders at 80 columns, with `model` and `thinking`
  right-aligned and neighbouring
- **THEN** the `path` text starts at the row's first column, the `thinking` text ends at column 80, and
  the `model` text sits against the `thinking` text with only the joint between them

#### Scenario: The row is wider

- **WHEN** the same row renders at 132 columns
- **THEN** the `thinking` text ends at column 132 and the space between the `model` text and the
  `thinking` text is the same as it was at 80

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

### Requirement: Overflow never widens or splits a row

When the content of a row's cells needs more columns than the row has, or grows between renders, the row
MUST still render one line of exactly the row's width. Each cell's text MUST be clipped at its end with
the ellipsis the row already uses, never wrapped.

#### Scenario: Content that needs more than the row

- **WHEN** a row's cells hold text needing 120 columns in all and the row renders at 80 columns
- **THEN** the footer shows one line for that row, 80 columns wide, and no cell's text carries a line
  break

#### Scenario: A cell's content grows

- **WHEN** an instrument's text grows from a short value to a long one between two renders at the same
  width
- **THEN** the row is still one line of that width

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

### Requirement: A row that declares no cells renders as a whole row

A row that declares no `cells` MUST render as ten cells on one line spanning the window's full width,
and its cell count MUST stay within the ceiling of ten.

#### Scenario: A row with no cells declared

- **WHEN** a declared row omits `cells` and renders at 80 columns
- **THEN** it renders ten cells on one line 80 columns wide
