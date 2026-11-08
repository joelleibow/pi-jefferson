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

By default a cell MUST take the width its content needs, except a `blank` or `$bar` cell, which MUST fill and
share the spare columns, the remainder to the earliest. With none, they go to the last left-aligned
non-empty cell, else the first non-empty one, else the first cell, even when empty; an empty cell MUST otherwise
take none. `distribution` MUST be `"content"` (absent) or `"equal"` (`floor(W / N)` each); any other value MUST
be rejected. The joint MUST give way before any content does.

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

- **WHEN** a row of a left-aligned `path` cell, a right-aligned `model` cell and a last left-aligned cell
  whose instrument renders nothing is rendered at 80 columns
- **THEN** the empty cell occupies 0 columns, and the spare columns go to the `path` cell, the last
  left-aligned non-empty cell, so the empty cell's presence does not change where any text sits

#### Scenario: A row whose cells all render nothing

- **WHEN** a row of `model` and `thinking` cells, with no fill cell, renders at 80 columns before either
  datum is known
- **THEN** the first cell, though empty, takes the spare columns, and the row renders one line 80 columns
  wide

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

### Requirement: Cell content comes from an instrument

Every cell MUST hold an instrument, and a cell's content MUST be what its instrument renders: its
format with its variables substituted. `blank` is an instrument whose default format is the fixed
placeholder text; it is what the default row's ten cells hold, and it is what a row that declares
no `cells` renders. The extension MUST NOT expose an API by which third-party code supplies or
replaces cell content — configuration names instruments and their formats, and the extension
implements them.

#### Scenario: Rendering a row

- **WHEN** a row renders
- **THEN** every cell in it holds an instrument and contains the text that instrument resolves to

#### Scenario: Contributing cell content

- **WHEN** the extension's exported surface is inspected
- **THEN** no API exists by which third-party code can supply or replace cell content

#### Scenario: A row that declares no cells

- **WHEN** a declared row declares no `cells`
- **THEN** every cell in it holds `blank` and renders its default format, the fixed placeholder text

### Requirement: A row is one line tall

Each row MUST render as exactly one line: whatever an instrument returns, its cell MUST keep one
line and clip it to the cell's width, so the footer's height is the number of declared rows. The
guarantee MUST belong to the cell — configuration validation MUST NOT police a format's text to
keep it, and no instrument output may add a line to the footer.

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

### Requirement: Configuration designates each cell's instrument

A row MAY declare `cells`, the cell objects in cell order. The `instrument` of the object at a
position MUST name the instrument that cell renders, as the document configures that name or with
its declared defaults, and the extension MUST NOT take a cell's instrument from any other source. An
instrument name the extension does not implement MUST produce a configuration warning naming that
instrument, and MUST render that cell as `blank`; the row's other cells MUST still render their
instruments.

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

#### Scenario: One configuration, two cells holding it

- **WHEN** the document configures an instrument once and two cells in two rows hold it
- **THEN** both cells render it as configured, because a cell takes its instrument's configuration
  from the instrument's name and not from the cell

### Requirement: An instrument resolves a cell's text by reading the store

An instrument that displays a datum MUST resolve it by reading the store, synchronously, and MUST
hand its format every variable it declares already formatted. An instrument that displays no datum
— `blank` — is outside that duty. An instrument MUST NOT subscribe to host events, poll, cache host
data itself, read the terminal, run a command, or derive data the store can hold. A datum an
instrument needs that the store does not hold MUST be added to the store, not acquired by the
instrument.

#### Scenario: Resolving the text of a cell that displays a datum

- **WHEN** a cell holds an instrument that displays a datum
- **THEN** its instrument reads that datum from the store and hands its format the variable already
  formatted, without awaiting, blocking, or subscribing

#### Scenario: Resolving the text of a cell that displays no datum

- **WHEN** a cell holds `blank`
- **THEN** it resolves its constant text without reading a datum from the store

#### Scenario: An instrument needing a datum the store does not hold

- **WHEN** an instrument would need data the store does not hold
- **THEN** the data is added to the store, and the instrument still only reads

#### Scenario: A datum the host does not expose

- **WHEN** an instrument would need a datum pi does not hold — a dirty working tree, or a branch's
  ahead and behind counts
- **THEN** it is not implemented, because getting it would mean reading the terminal or running a
  command, and pi is the source of truth

### Requirement: The model instrument

The extension MUST implement a `model` instrument declaring the variables `$provider` and `$model`,
whose default format `$provider: $model` renders the text it renders today. Configuration MUST be
able to place it in a row's cell and to configure its format and style, and the footer MUST render
it. Its text MUST already be correct when a session is restored, MUST change when the host reports
a model selection, and MUST be nothing when either datum is unknown.

#### Scenario: The model changes

- **WHEN** the host reports a new active model
- **THEN** the cell holding `model` renders that model's provider and model id

#### Scenario: A session is restored

- **WHEN** a session is restored and the host reports no selection
- **THEN** the cell holding `model` renders the restored session's provider and model

#### Scenario: A model the host has not supplied

- **WHEN** the store reads the provider or the model as unknown
- **THEN** the cell holding `model` renders nothing, rather than its format with a hole in it

### Requirement: The thinking instrument

The extension MUST implement a `thinking` instrument declaring the variable `$level`, with a default label that renders, gap included, as `Thinking: ` and the default format `$level|capitalize`. Configuration MUST be able to place it in a row's cell and to configure its label, format and style, and the footer MUST render it. Its text MUST be correct when a session is restored, MUST change when the host reports a selection, and MUST be nothing when the level is unknown.

#### Scenario: The default thinking cell

- **WHEN** the host reports the level `high` and the document configures nothing for `thinking`
- **THEN** the cell holding `thinking` renders `Thinking: High`, exactly as it rendered before this change

#### Scenario: The thinking level changes

- **WHEN** the host reports a new thinking level
- **THEN** the cell holding `thinking` renders the new level

#### Scenario: A configured label

- **WHEN** the document configures `thinking` with the label `🤔` and nothing else
- **THEN** the cell renders `🤔`, a one-column gap, then the capitalized level, and the default label is not shown

#### Scenario: A session is restored

- **WHEN** a session is restored and the host reports no selection
- **THEN** the cell holding `thinking` renders the restored session's thinking level

#### Scenario: A level the host has not supplied

- **WHEN** the store reads the thinking level as unknown
- **THEN** the cell holding `thinking` renders nothing, and does not claim a level the host never
  reported

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

### Requirement: The path instrument

The extension MUST implement a `path` instrument declaring the variable `$path` — the basename of
the working directory the host reports — with `$path` as its default format. It MUST read that
directory from the store, and MUST NOT render the whole directory, read the terminal, or run a
command to get it.

#### Scenario: The session's directory

- **WHEN** a cell holds `path` in a session whose working directory is
  `/Users/joelleibow/Projects/pi-jefferson`
- **THEN** it renders `pi-jefferson`

#### Scenario: A directory the host has not supplied

- **WHEN** the store reads the working directory as unknown
- **THEN** the cell holding `path` renders nothing

### Requirement: The context instrument

The extension MUST implement a `context` instrument declaring `$tokens`, `$window`, `$percent` and
`$bar`, read from the context usage the host reports, with `$percent/$window` as its default format.
Each variable MUST arrive already formatted — a compact token count, a percentage — and a null
estimate MUST hand out `?`, as the host's own footer does, and leave `$bar` unfilled and `dim`. When
the host reports no usage at all it MUST render nothing.

#### Scenario: A session with a known estimate

- **WHEN** the host reports 86,400 estimated tokens of a 200,000-token window
- **THEN** `$percent` hands out `43.2%`, `$window` `200k` and `$tokens` `86.4k`, and a cell holding
  `context` renders `43.2%/200k`

#### Scenario: An estimate the host has not made yet

- **WHEN** the host reports a context usage whose token estimate is null, as it does after a
  compaction and before the next response
- **THEN** `$percent` and `$tokens` hand out `?` and the cell renders `?/200k`, never `0%` and never
  a zero it was not given, and a `$bar` in the format draws its whole track unfilled in `dim`

#### Scenario: No usage the host can report

- **WHEN** the host reports no context usage, because no limits model applies
- **THEN** the cell holding `context` renders nothing

### Requirement: The tokens instrument

The extension MUST implement a `tokens` instrument declaring `$input`, `$output`, `$cacheRead`,
`$cacheWrite` and `$totalTokens`, summed from the session's usage-bearing entries as the host's
footer sums them, with `$totalTokens` as its default format. `$totalTokens` MUST be
`input + output + cacheRead + cacheWrite`, because the host's accumulation never reads
`usage.totalTokens`. The sum MUST cover the whole session, not one branch, and each variable MUST
arrive formatted as a compact count.

#### Scenario: A session's totals

- **WHEN** a cell holds `tokens` in a session whose entries carry usage
- **THEN** it renders the total tokens of those entries, formatted compactly

#### Scenario: What `$totalTokens` adds

- **WHEN** a session's usage-bearing entries carry input, output, cache-read and cache-write counts
- **THEN** `$totalTokens` is the sum of those four, and no `totalTokens` a provider reported is read

#### Scenario: The categories the host counts

- **WHEN** a session holds usage entries, assistant messages, tool-result messages carrying usage,
  and compaction or branch-summary entries carrying usage
- **THEN** all four are summed, because the host's own footer sums all four and the numbers are
  meant to match

#### Scenario: A fresh session

- **WHEN** a session holds no usage at all
- **THEN** `$totalTokens` hands out `0` and the cell renders `0`

### Requirement: The cost instrument

The extension MUST implement a `cost` instrument declaring `$cost`, the session's total cost summed
from the same entries `tokens` sums, with `$cost` as its default format. It MUST arrive already
formatted as the host's own footer formats cost, and MUST NOT be summed a second way that could
disagree with `tokens`.

#### Scenario: A session with cost

- **WHEN** a cell holds `cost` in a session whose usage carries a total cost of 0.123
- **THEN** it renders `$0.123`

#### Scenario: A fresh session

- **WHEN** a session holds no usage at all
- **THEN** the cell holding `cost` renders `$0.000`

#### Scenario: Cost and tokens in one render

- **WHEN** one render lays out a cell holding `cost` and a cell holding `tokens`
- **THEN** both read the same scan of the session's entries, taken from that render's sample

### Requirement: An instrument is declared once, and every reader reads that declaration

Each instrument MUST declare its name, its variables, its defaults and its options in one place.
Configuration, validation and rendering MUST read that declaration, and MUST NOT carry their own
copy of a name, a variable or a default. Adding an instrument MUST mean adding one declaration: no
second table of names, and no edit to the configuration reader or the renderer that the new
instrument's own shape does not require.

#### Scenario: Adding an instrument

- **WHEN** a declaration is added for an instrument the extension did not implement
- **THEN** configuration accepts its name in a cell and in the `instruments` section, its variables
  substitute in a format, and its defaults render when the document does not configure it

#### Scenario: A name carried in two places

- **WHEN** the shipped source is inspected
- **THEN** each instrument's name, variables, defaults and options come from its declaration, and
  the name lookup, the validation and the rendering read them rather than restating them

### Requirement: An instrument's configuration lives in the extension's own document

The extension MUST read instrument configuration from a top-level `instruments` object in the
`pi-jefferson.json` document it already owns, keyed by instrument name, each value carrying any of
that instrument's declared options. It MUST sit beside either envelope shape, and a document
carrying only `instruments` MUST render the default row with those instruments configured. A trusted
project's document MUST replace the agent document whole, as it does today.

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

- **WHEN** the `instruments` object configures a name the extension does not implement
- **THEN** the document is accepted, the warning names it, and no cell renders it

#### Scenario: An option the instrument does not declare

- **WHEN** an instrument's entry carries a key its declaration does not have — a misspelling such as
  `frmát`, or the declined `width`
- **THEN** the document is rejected, the default row renders, and the warning names the key

#### Scenario: A trusted project's document

- **WHEN** a trusted project's document and the agent document both configure instruments
- **THEN** the project's document replaces the agent's whole, and only its configuration applies

### Requirement: An instrument's format is plain text and variables

A `format` MUST be plain text: literal characters render verbatim, and `$name` substitutes the value
the instrument hands out. The format language MUST NOT format a number or parse Markdown. `$` starts a
variable and `|` a modifier when a name follows it; `\$` and `\|` escape them. Whitespace at the front
and back of a format MUST be removed, after control characters collapse to spaces. An undeclared
`$name` MUST reject the document, naming the instrument and the variable.

#### Scenario: Literal text among variables

- **WHEN** `model` is configured with the format `🧠: $model from $provider` and the store holds
  `anthropic` and `claude-opus-4`
- **THEN** the cell renders `🧠: claude-opus-4 from anthropic`

#### Scenario: A number the format does not format

- **WHEN** `tokens` is configured with the format `↑$input ↓$output`
- **THEN** each variable renders exactly as the instrument formatted it, and the format adds no
  digit, group separator or unit of its own

#### Scenario: A literal dollar sign

- **WHEN** a format carries `\$`
- **THEN** the cell renders a literal `$` and names no variable

#### Scenario: Brackets are text

- **WHEN** a format carries `[a](b)`
- **THEN** the cell renders `[a](b)`, because the extension parses no group syntax

#### Scenario: Markdown is text

- **WHEN** a format, or a value substituted into it, carries `**bold**`
- **THEN** the cell renders the characters `**bold**` and no Markdown is parsed

#### Scenario: A variable the instrument does not declare

- **WHEN** an instrument's format names a variable its declaration does not have
- **THEN** the document is rejected, the default row renders, and the warning names the instrument
  and the variable

#### Scenario: A pipe no name follows

- **WHEN** `model` is configured with the format `$model | $provider` and the store holds
  `anthropic` and `claude-opus-4`
- **THEN** the cell renders `claude-opus-4 | anthropic`, because the `|` is followed by a space and
  not by a name, so it is the character it is

#### Scenario: A literal pipe beside a name

- **WHEN** a format writes `\|` where the next character is one a name may hold
- **THEN** the cell renders a `|` and starts no modifier

#### Scenario: Space at the front or back of a format

- **WHEN** `model` is configured with the format `  $model  ` and the store holds `claude-opus-4`
- **THEN** the cell renders `claude-opus-4`, as if the format had no leading or trailing space

#### Scenario: Control characters at the edge of a format

- **WHEN** a format ends in a newline, which collapses to a space
- **THEN** that space is removed with the rest of the trailing whitespace, and the cell renders on one
  line

#### Scenario: Space inside a format

- **WHEN** a format is `$percent $bar`
- **THEN** the space between the two variables renders as written; only the format's front and back are
  trimmed

### Requirement: An instrument's style is pi's ThemeStyle

A `style` MUST be pi's `ThemeStyle`, applied with `theme.style()`: `fg` and `bg` as theme color
tokens or colors pi's own parser accepts, plus the booleans `bold`, `dim`, `italic`, `underline`,
`inverse` and `strikethrough`. The extension MUST NOT add style vocabulary of its own, in a `style`
or in a format's modifier. A style MUST be resolved against the theme current at render time, and
any styled text the extension caches MUST be rebuilt when the host invalidates the footer.

#### Scenario: A theme color token

- **WHEN** an instrument is configured with the style `{"fg": "accent"}`
- **THEN** its cell's text is styled with the theme's `accent` foreground, through `theme.style()`

#### Scenario: A text attribute

- **WHEN** an instrument is configured with the style `{"bold": true}`
- **THEN** its cell's text renders bold and no other attribute of it changes

#### Scenario: A style pi's ThemeStyle does not allow

- **WHEN** a style carries a key `ThemeStyle` does not have, an `fg` that is neither a theme token
  nor a color pi's parser accepts, or an attribute whose value is not a boolean
- **THEN** the document is rejected, the default row renders, and the warning names the offender

#### Scenario: The theme changes

- **WHEN** the host switches theme and invalidates the footer
- **THEN** the next render styles the cell with the new theme's colors, and nothing cached from the
  old theme survives

#### Scenario: Style and the pad

- **WHEN** a styled cell's text is narrower than its cell
- **THEN** the pad carries none of that style, exactly as it does for text carrying ANSI today

#### Scenario: One vocabulary for styling

- **WHEN** a format applies a style modifier
- **THEN** the name it writes is one of `ThemeStyle`'s six booleans, and the extension carries no
  styling name of its own

### Requirement: An instrument's style is validated when its document is read

A `style` MUST be validated when its document is read, against the live theme the host hands the
extension at `session_start`: a string `fg` MUST name a foreground-slot token of that theme, a
string `bg` a background-slot token, and a color string or number naming no token MUST go through
pi-tui's `parseColor()` there and be kept as a `Color`, because `theme.style()` throws at render
time on a raw color string and on a wrong-slot token. The host's token list MUST NOT be copied.

#### Scenario: A color that is no token

- **WHEN** an instrument is configured with the style `{"fg": "#bf5700"}`
- **THEN** the reader parses it into a `Color` when it reads the document, and the cell renders that
  color through `theme.style()` instead of throwing at render time

#### Scenario: A token in the wrong slot

- **WHEN** an instrument's style names a background-slot token as its `fg`, or a foreground-slot
  token as its `bg`
- **THEN** the document is rejected when it is read and the warning names the token, because the
  theme accepts a token only in its own slot

#### Scenario: The theme the check reads

- **WHEN** the shipped source is inspected
- **THEN** the token check reads the live theme the host hands the extension, and no copy of the
  host's token list is in it

### Requirement: $bar takes the width the rest of the format leaves

An instrument MAY declare `$bar`. It MUST take the columns the rest of the format leaves in the
cell, MUST shrink to nothing when nothing is left, and a format MUST hold at most one width-taking
variable — a second MUST reject the document, naming it. The bar MUST be drawn from block
characters in theme colors, with no dependency the package does not already declare, and with no
estimate to show it MUST draw its whole track unfilled in `dim`.

#### Scenario: A bar in a cell with room

- **WHEN** `context` is configured with the format `$percent $bar` in a cell 20 columns wide, and
  the rest of the format takes 6 of them
- **THEN** the bar occupies the 14 columns the format left

#### Scenario: A bar with no room

- **WHEN** the rest of the format fills the cell
- **THEN** the bar occupies nothing, and the format's own text is what the cell clips

#### Scenario: A bar among prose

- **WHEN** a format places `$bar` between literal text and a variable
- **THEN** the bar sits where the format put it and takes the width the rest of the format leaves

#### Scenario: Two width-taking variables

- **WHEN** a format names two width-taking variables
- **THEN** the document is rejected, the default row renders, and the warning names the second

#### Scenario: The pressure a bar shows

- **WHEN** the fraction `context`'s bar shows is above the thresholds the host's own footer colors
  context pressure by
- **THEN** the filled portion takes the theme's `warning` and then `error` color, and the empty
  portion is drawn `dim`

#### Scenario: A bar with no estimate to show

- **WHEN** the instrument holding `$bar` has a null estimate, so there is no fraction to fill
- **THEN** the bar draws its whole track unfilled in `dim`, and the cell still shows `?/<window>`

#### Scenario: No new dependency

- **WHEN** a cell renders a bar
- **THEN** it is drawn from block characters and theme colors, and the package's declared
  dependencies are unchanged

### Requirement: A modifier follows a variable or literal text

A modifier MUST be written `|name` directly after the text it applies to — a variable or literal
text — where a name is a run of the characters a variable name may hold. Modifiers MUST chain, each
applying in the order the format writes them. A modifier on literal text MUST apply to the run of
non-whitespace text immediately before it. `$bar` MUST NOT carry a modifier.

#### Scenario: A modifier on a variable

- **WHEN** `model` is configured with the format `$model|bold` and the store holds `claude-opus-4`
- **THEN** the cell renders `claude-opus-4` bold, and the format looks up a variable named `model`

#### Scenario: A modifier on literal text

- **WHEN** `model` is configured with the format `🧠 $model via|dim $provider` and the store holds
  `anthropic` and `claude-opus-4`
- **THEN** the cell renders `🧠 claude-opus-4 via anthropic`, with `dim` applied to `via` and to no
  other text

#### Scenario: A chain on literal text

- **WHEN** `model` is configured with the format `$model via|dim|bold $provider` and the store holds
  `anthropic` and `claude-opus-4`
- **THEN** the cell renders `claude-opus-4 via anthropic` with `via` both dim and bold, and no other
  text carrying either attribute

#### Scenario: Chained modifiers

- **WHEN** a format carries `$provider|bold|underline`
- **THEN** the value renders bold and underlined, and each modifier applied in the order written

#### Scenario: A modifier on a value the store does not know

- **WHEN** `thinking` is configured with the format `$level|capitalize` and the level is unknown
- **THEN** the cell renders nothing, exactly as it does with no modifier, because a modifier cannot
  turn an unknown value into text

#### Scenario: A name carried in two places

- **WHEN** the shipped source is inspected
- **THEN** the modifier names that parsing, validation and rendering read come from one table, and
  none of the three carries its own copy

#### Scenario: A modifier on the width-taking variable

- **WHEN** an instrument's format writes a modifier directly after `$bar`
- **THEN** the document is rejected, the default row renders, and the warning names the instrument
  and the modifier

#### Scenario: A modifier with nothing before it

- **WHEN** `model` is configured with the format `🧠 |dim $model` and the store holds
  `claude-opus-4`
- **THEN** the document is rejected, the default row renders, and the warning names the instrument
  and the modifier, because no variable and no non-whitespace text precedes the pipe

### Requirement: A style modifier only sets an attribute on

The six `ThemeStyle` booleans are the format's style modifiers. Each MUST only set its attribute
on, and MUST add to the instrument's `style` rather than replace it, so a modifier applies even
where the instrument's `style` sets the same attribute off. A modifier MUST NOT switch an attribute
off, and `fg` and `bg` MUST NOT be modifiers.

#### Scenario: A modifier over an attribute set off

- **WHEN** an instrument is configured with the style `{"bold": false}` and its format carries
  `$model|bold`
- **THEN** the cell renders the model's value bold, because a style modifier adds an attribute and
  cannot take one away

#### Scenario: A color is not a modifier

- **WHEN** a format carries a modifier named for a color, such as `|accent`
- **THEN** the document is rejected, because colors are not modifiers and the extension adds no
  style name of its own

### Requirement: The string modifiers are capitalize, upper and lower

A modifier that changes a value's text MUST be one of `capitalize`, `upper` and `lower`.
`capitalize` MUST upper-case the first character and leave the rest of the value as it is; `upper`
MUST upper-case the whole value and `lower` MUST lower-case it. The mutation MUST come from the
library the package declares as a runtime dependency, and the extension MUST NOT carry a string
mutation of its own.

#### Scenario: Capitalizing a value

- **WHEN** a format carries `$level|capitalize` and the level is `high`
- **THEN** the cell renders `High`

#### Scenario: Capitalizing a value whose first letter is already uppercase

- **WHEN** a format carries `$level|capitalize` and the level is `HIGH`
- **THEN** the cell renders `HIGH`, because only the first character changes and the rest is left
  as it was

#### Scenario: Upper and lower

- **WHEN** a format carries `$level|upper` for `high` and another carries `$level|lower` for `HIGH`
- **THEN** the first cell renders `HIGH` and the second `high`

#### Scenario: A mutation that changes the value's width

- **WHEN** a format carries `$model|upper` and the model's value carries `ß`
- **THEN** the cell renders the value with `SS` where the `ß` was

#### Scenario: A value the format does not mutate

- **WHEN** a format carries no string modifier
- **THEN** each value renders exactly as the instrument handed it out, character for character

#### Scenario: No mutation written here

- **WHEN** the shipped source is inspected
- **THEN** every string mutation a modifier performs is a call into the declared dependency, and the
  extension implements none of them

#### Scenario: The dependency pi installs

- **WHEN** the package's manifest is read
- **THEN** the library the mutations come from is declared in `dependencies`, so pi installs it with
  the package

### Requirement: An unknown modifier rejects the document when it is read

A modifier the extension does not implement MUST reject the document when it is read, naming the
instrument and the modifier, the way an undeclared `$name` does. The rejection MUST happen at read
time, not at render time, so a misspelling never renders as literal text.

#### Scenario: A modifier the extension does not implement

- **WHEN** an instrument's format carries `|bd` and the extension implements no modifier by that
  name
- **THEN** the document is rejected, the default row renders, and the warning names the instrument
  and the modifier

#### Scenario: Nothing renders before the rejection

- **WHEN** a document whose format carries an unknown modifier is read
- **THEN** the rejection happens there, so the cell never renders those characters as literal text

### Requirement: An instrument's label is placed in front of its format

Every instrument MUST accept a string `label` option, rendered as literal text in front of its format
text. Whitespace at the front and back of a label MUST be removed, after control characters collapse to
spaces. When the label and the format, so trimmed, are both non-empty, a one-column gap MUST separate
them, always, with no option, setting or opt-out, whatever the format renders. A configured label empty
after the trim MUST replace the default label with none, and no gap renders.

#### Scenario: A label with no trailing whitespace gets a gap

- **WHEN** `model` is configured with the label `ctx` and the format `$model`, and the model is known
- **THEN** the cell renders `ctx`, one blank column, then the model id

#### Scenario: A label in front of a configured format

- **WHEN** `model` is configured with the label `🧠` and the format `$model`
- **THEN** the cell renders `🧠`, a one-column gap, then the model id

#### Scenario: Every instrument that has a label gets the gap

- **WHEN** any instrument is configured with a non-empty label, its data are known and its format is
  non-empty
- **THEN** one blank column lies between the label and the content, whichever instrument it is

#### Scenario: A label that ends in a space gets one gap

- **WHEN** `model` is configured with the label `🧠 ` and the format `$model`, and likewise `🤔 ` and
  `🔋 ` on their instruments
- **THEN** each cell renders its label, one gap, then the content, never two blank columns

#### Scenario: The default thinking label keeps its text

- **WHEN** `thinking` is configured with nothing and the level is `high`
- **THEN** the cell renders `Thinking: High`, with one gap between the colon and the level

#### Scenario: A label that ends in a control character

- **WHEN** an instrument's label ends in a newline, which collapses to a space, and its format is
  `$model`
- **THEN** that space is removed as trailing whitespace and the cell renders the label, one gap, then the
  content

#### Scenario: An empty label replaces the default label

- **WHEN** `thinking` is configured with `label: ""` and the default format, and the level is `high`
- **THEN** the cell renders only the styled `High`, with no `Thinking:` and no leading gap

#### Scenario: A whitespace-only label replaces the default label

- **WHEN** `thinking` is configured with `label: "   "` and the default format, and the level is `high`
- **THEN** the cell renders only the styled `High`, with no `Thinking:` and no leading gap

#### Scenario: A label in front of the default format

- **WHEN** an instrument is configured with a label and no format
- **THEN** the cell renders the label, a gap, then that instrument's default format

#### Scenario: An unknown datum suppresses the label

- **WHEN** an instrument holds a label and the store reads one of its declared data as unknown
- **THEN** the cell renders nothing, with no label and no gap, whatever the format is

#### Scenario: An empty format leaves the label alone

- **WHEN** a datum is known, the instrument is configured with the label `🤔` and the format `""`
- **THEN** the cell renders `🤔` and nothing after it, no gap included

#### Scenario: A whitespace-only format counts as empty

- **WHEN** a datum is known, the instrument is configured with the label `🤔` and the format `"   "`
- **THEN** the cell renders `🤔` and nothing after it, no gap included

#### Scenario: A dollar sign in a label

- **WHEN** an instrument's label is `$level` and its format is non-empty
- **THEN** the cell renders the characters `$level`, a one-column gap, then the content, and substitutes
  no variable

#### Scenario: Control characters in a label

- **WHEN** an instrument's label carries a newline and a C1 control character between other text
- **THEN** the cell renders on one line, each control character replaced by one space, as in the
  format's own literal text, and the gap keeps the cell on that one line

#### Scenario: The label takes the instrument's style

- **WHEN** an instrument is configured with the label `Q` and the style `{"fg": "accent"}`
- **THEN** the label is styled with the theme's `accent` foreground, as the format's own text is

#### Scenario: The gap takes the label's style

- **WHEN** an instrument is configured with the label `Q`, the format `$percent` and the style
  `{"bg": "selectedBg"}` (or `{"underline": true}`), and its data are known
- **THEN** the background (or underline) runs unbroken from the label across the gap, with no unstyled
  column between `Q` and the value, and the row's colors are clean past the cell's end

#### Scenario: The label takes width from a bar

- **WHEN** `context` is configured with the label `ab` (2 columns) and the format `$percent $bar` in a
  cell 20 columns wide, and the rest of the format takes 6 of them
- **THEN** the bar occupies 11 columns, the width the label, the gap and the format together leave, and
  the cell is exactly 20 columns wide

#### Scenario: A narrow cell clips the gap with the rest

- **WHEN** a cell is narrower than the label, the gap and the content together
- **THEN** the cell renders no more columns than it was given, clipped at its end as any text is, and no
  rule of its own truncates the label or the gap

#### Scenario: The label is not a variable

- **WHEN** a format names `$label`
- **THEN** the document is rejected, the default row renders, and the warning names the instrument and
  the variable, as for any variable the instrument does not declare

#### Scenario: A label that is not a string

- **WHEN** an instrument's `label` is a number or an object
- **THEN** the document is rejected, the default row renders, and the warning names the instrument and
  the option

### Requirement: The thinking level takes the color of the input box's thinking rules

The `$level` segment of the `thinking` instrument MUST be colored with the color pi gives the thinking
rules on the input box for that level, one per level pi reports, resolved against the theme current at
render time. On that segment the color MUST replace a configured `fg`, and a configured `bg` and the
boolean attributes MUST remain. Nothing cached from an earlier level or theme MAY survive a change of
either.

#### Scenario: The level changes

- **WHEN** the host reports a new thinking level
- **THEN** the `$level` segment renders in the color the input box's rule takes for that level

#### Scenario: Every level has its color

- **WHEN** the level is any of `off`, `minimal`, `low`, `medium`, `high`, `xhigh` or `max`
- **THEN** the `$level` segment renders in the color the input box's rule takes for that level, and
  `off` is a level like the others

#### Scenario: The theme changes

- **WHEN** the host switches theme and invalidates the footer
- **THEN** the next render colors the `$level` segment from the new theme, and the input box's rule and
  the segment still match

#### Scenario: A configured foreground

- **WHEN** `thinking` is configured with the style `{"fg": "accent"}` and the level is `high`
- **THEN** the `$level` segment renders in the color the input box's rule takes for `high`, not `accent`

#### Scenario: A configured background and attributes

- **WHEN** `thinking` is configured with the style `{"bg": "selectedBg", "bold": true}` and the level is
  `high`
- **THEN** the `$level` segment renders in the `high` color, on `selectedBg`, in bold

#### Scenario: Text outside the level

- **WHEN** a `thinking` format carries literal text beside `$level`
- **THEN** only the `$level` segment takes the level's color, and the literal text keeps the
  instrument's own style

#### Scenario: A level outside the seven

- **WHEN** the host reports a thinking level that is none of the seven
- **THEN** the cell renders the level, and the `$level` segment keeps the instrument's own style with
  no `thinking*` token
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
