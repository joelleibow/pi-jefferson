# Spec Delta

## Purpose

The statusline pi-jefferson renders: the rows a user declares in configuration, and the evenly
divided cells each row renders in the footer.

## ADDED Requirements

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

### Requirement: A row's containers count

Each row MAY declare `containers`, the number of cells in that row. An absent value MUST mean 8
cells, and the ceiling MUST be 8: a declared value above 8 MUST clamp to 8 rather than be
rejected. The configuration speaks in counts and never in cells.

#### Scenario: containers absent

- **WHEN** a declared row omits `containers`
- **THEN** the row renders 8 cells

#### Scenario: containers within the ceiling

- **WHEN** a declared row sets `containers` to 3
- **THEN** the row renders 3 cells

#### Scenario: containers above the ceiling

- **WHEN** a declared row sets `containers` to 12
- **THEN** the row renders 8 cells and the configuration is accepted

#### Scenario: containers zero or not an integer

- **WHEN** a declared row sets `containers` to zero, to a negative number, or to a value that is
  not an integer
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

### Requirement: Cell content is fixed placeholder text

Every cell MUST render the same fixed Lorem placeholder text. The extension MUST NOT expose a
module or contribution interface for cell content.

#### Scenario: Rendering a row

- **WHEN** a row renders
- **THEN** every cell in it contains the placeholder text

#### Scenario: Contributing cell content

- **WHEN** the extension's exported surface is inspected
- **THEN** no API exists by which another module can supply or replace cell content

### Requirement: A row is one line tall

Each row MUST render as exactly one line: cell content wider than the cell MUST be truncated to
the cell width, so the footer's height is the number of declared rows.

#### Scenario: Content wider than its cell

- **WHEN** the placeholder text is wider than the cell it renders in
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
