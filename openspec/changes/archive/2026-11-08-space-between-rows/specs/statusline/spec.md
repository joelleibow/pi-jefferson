## MODIFIED Requirements

### Requirement: The statusline renders the declared rows

In TUI mode the extension MUST install the rows its configuration declares as the footer — one
footer line per row, in declaration order — replacing the host's built-in footer. Outside TUI
mode it MUST NOT install a footer, and loading MUST NOT fail.

#### Scenario: TUI mode with declared rows

- **WHEN** the extension loads in TUI mode and the configuration declares two rows
- **THEN** the footer renders those two rows, one line each, in the declared order, each built from
  that row's cells, with the space between them that the footer's space requirements give

#### Scenario: A mode without terminal rendering

- **WHEN** the extension loads in print, JSON, or RPC mode
- **THEN** no footer is installed and loading does not fail

### Requirement: A row is one line tall

Each row MUST render as exactly one line: whatever an instrument returns, its cell MUST keep one
line and clip it to the cell's width, so each declared row adds one line to the footer. Any vertical
space between rows MUST come from the footer's stack, never from a row's or a cell's line, and the
footer's height is its rows' lines plus the space between them. The one-line guarantee MUST belong to the cell:
configuration validation MUST NOT police a format's text to keep it.

#### Scenario: Content wider than its cell

- **WHEN** a cell's content is wider than the cell it renders in
- **THEN** the row still renders one line, clipped to the cell width

#### Scenario: Content that would span more than one line

- **WHEN** an instrument returns text carrying a line break or another control character, because a
  format declared one or a datum contains one
- **THEN** its cell still renders exactly one line, clipped to the cell's width, and the footer's
  height is unchanged

#### Scenario: The footer's height

- **WHEN** a configuration declares three rows and sets no `rowGap`
- **THEN** the footer renders five lines: three row lines with one empty line between each pair, and
  no line other than those three is a row's

#### Scenario: Space between rows is not a row's line

- **WHEN** the footer renders with space between its rows
- **THEN** each row, taken alone, is one line, and the space lies in the footer's stack, between row
  lines, not in any row or cell

## ADDED Requirements

### Requirement: The footer has space between its rows and none above the first

By default the footer MUST render one empty line between each pair of rows and none above its first
row. Each empty line MUST be an unstyled empty string, in the footer's stack and in no row or cell. A
footer of one row MUST render that row alone, one line.

#### Scenario: Two rows

- **WHEN** the configuration declares two rows and sets no `rowGap`
- **THEN** the footer renders row one, an empty line, row two, three lines, and the empty line is
  `""` with none of a row's framing

#### Scenario: One row

- **WHEN** the configuration declares one row, or none and the default row renders, and sets no
  `rowGap`
- **THEN** the footer renders that row alone, one line, with no empty line above it

### Requirement: rowGap sets the space between rows

The configuration document MAY carry a top-level `rowGap`, beside either envelope, whose value MUST be
a whole number from 0 to 3 and sets the empty lines between each pair of rows and nothing above row
one; absent leaves the default space. `rowGap: 0` MUST render the footer as it rendered before this
change. Any other value MUST reject the document, name `rowGap` and the value in the warning, and
render the default row.

#### Scenario: A larger gap

- **WHEN** the document sets `rowGap` to `2` and declares two rows
- **THEN** the footer renders row one, two empty lines, row two, four lines

#### Scenario: The largest gap

- **WHEN** the document sets `rowGap` to `3` and declares two rows
- **THEN** the configuration is accepted and the footer renders three empty lines between the rows
  and none above row one

#### Scenario: A gap of zero

- **WHEN** the document sets `rowGap` to `0` and declares two rows, or one
- **THEN** the footer renders the rows and nothing else, exactly the lines it rendered before this
  change

#### Scenario: A gap beside either shape

- **WHEN** `rowGap` sits beside a `rows` list, or beside a single top-level row
- **THEN** the document is accepted and the gap applies, and `rowGap` beside `rows` is not a conflict
  like a top-level `cells`

#### Scenario: A gap that is not a whole number from 0 to 3

- **WHEN** the document sets `rowGap` to `-1`, `1.5`, `"1"`, `null`, `4` or `1e21`
- **THEN** the configuration is rejected, the default row renders, and the
  warning names `rowGap` and the value

#### Scenario: A misspelt key

- **WHEN** the document carries `rowgap` or another key the reader does not know
- **THEN** it is ignored without a warning, as every unknown row or document key is today and the
  default space renders
