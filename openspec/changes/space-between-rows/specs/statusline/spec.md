## MODIFIED Requirements

### Requirement: The statusline renders the declared rows

In TUI mode the extension MUST install the rows its configuration declares as the footer — one
footer line per row, in declaration order — replacing the host's built-in footer. Outside TUI
mode it MUST NOT install a footer, and loading MUST NOT fail.

#### Scenario: TUI mode with declared rows

- **WHEN** the extension loads in TUI mode and the configuration declares two rows
- **THEN** the footer renders those two rows, one line each, in the declared order, each built from
  that row's cells

#### Scenario: A mode without terminal rendering

- **WHEN** the extension loads in print, JSON, or RPC mode
- **THEN** no footer is installed and loading does not fail

### Requirement: A row is one line tall

Each row MUST render as exactly one line: whatever an instrument returns, its cell MUST keep one
line and clip it to the cell's width, so each declared row adds one line to the footer. Any vertical
space between rows MUST come from the footer's stack, never from a row's or a cell's line, and the
footer's height is its rows' lines plus that space. The one-line guarantee MUST belong to the cell:
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

- **WHEN** a configuration declares three rows
- **THEN** the footer renders three row lines, and every other line it renders is space between
  rows

#### Scenario: Space between rows is not a row's line

- **WHEN** the footer renders with space between its rows
- **THEN** each row, taken alone, is one line, and the space lies in the footer's stack between row
  lines, not in any row or cell
