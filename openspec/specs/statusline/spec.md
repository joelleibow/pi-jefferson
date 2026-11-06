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

For a row of N cells rendered at width W, each cell MUST be given `floor(W / N)` columns as its
`basis` and MUST be left free to `grow`, so pi-tui's allocator spends the leftover `W mod N`
columns — one at a time, on the row's earliest cells — and the row spans the full width. The
extension MUST NOT leave that remainder unallocated, and MUST NOT pad the composed line itself.
Cell widths MUST be recomputed from the width given at render time.

#### Scenario: A width that divides evenly

- **WHEN** a row of 8 cells renders at a width of 80 columns
- **THEN** each cell occupies 10 columns and no cell grows

#### Scenario: A width that does not divide evenly

- **WHEN** a row of 3 cells renders at a width of 100 columns
- **THEN** the first cell occupies 34 columns and the other two 33 each, so the row spans all 100
  columns with nothing left blank at the right edge

#### Scenario: The terminal is resized

- **WHEN** the same row renders again at a different width
- **THEN** each cell occupies `floor(new width / N)` columns, plus one more wherever the new
  remainder reaches it, and no cell keeps its previous width

#### Scenario: A row of ten cells at a width that does not divide evenly

- **WHEN** the default row of ten cells renders at a width of 132 columns
- **THEN** the first two cells occupy 14 columns and the other eight 13 each, so the row spans all
  132 columns

#### Scenario: Composition and allocation are the host's

- **WHEN** a row's cells are composed into a line
- **THEN** the composition, the child iteration and the allocation of the leftover columns are
  pi-tui's `HStack`, and the extension supplies each cell's `basis` and `grow`

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

The extension MUST implement a `thinking` instrument declaring the variable `$level`, whose default
format `thinking: $level` renders the text it renders today. Configuration MUST be able to place it
in a row's cell and to configure its format and style, and the footer MUST render it. Its text MUST
already be correct when a session is restored, MUST change when the host reports a thinking-level
selection, and MUST be nothing when the level is unknown — not a fallback the host did not report.

#### Scenario: The thinking level changes

- **WHEN** the host reports a new thinking level
- **THEN** the cell holding `thinking` renders the new level

#### Scenario: A session is restored

- **WHEN** a session is restored and the host reports no selection
- **THEN** the cell holding `thinking` renders the restored session's thinking level

#### Scenario: A level the host has not supplied

- **WHEN** the store reads the thinking level as unknown
- **THEN** the cell holding `thinking` renders nothing, and does not claim a level the host never
  reported

### Requirement: Instrument text is bound by the row's geometry

The text an instrument renders MUST be clipped at its end to its cell's width and padded to the
cell's full width — on the side opposite the cell's `align`, or across both sides under `center` —
so the row stays one line. Instrument text MUST NOT change the geometry: each of a row's N cells
occupies the width pi-tui allocates it, `floor(W / N)` columns plus one more wherever the row's
leftover columns reach it, and the row spans the full width. Alignment hugs its cell's edge, not
the row's.

#### Scenario: An instrument's text is wider than its cell

- **WHEN** an instrument resolves to text wider than its cell
- **THEN** the text is clipped to the cell width and the row stays one line

#### Scenario: A right-aligned last cell at a width that does not divide evenly

- **WHEN** the last cell of a row declares `align` `right` and the row's width does not divide by the
  cell count
- **THEN** its text ends at its own cell's right edge, which is the row's right edge — at 132 with
  ten cells the last cell occupies 13 columns and its text ends at the window's edge

#### Scenario: A row of instruments at a width that does not divide evenly

- **WHEN** a row of 3 instrument cells renders at a width of 100 columns
- **THEN** the first cell occupies 34 columns and the other two 33 each, and the row spans all 100
  columns with nothing blank at the right edge

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

### Requirement: The footer's tree is built once and reads the current render's sample

The footer MUST build its tree once, when it is installed: a `VStack` holding one `HStack` per
declared row, each holding that row's cells. Every render MUST lay out that tree, and every cell
MUST read the sample taken at the start of the render it is in. A width change MUST re-seat the
entry options through the stack's public typed route, keeping every component. Text a cell cached
MUST NOT survive into a later render, and what the footer caches MUST be dropped when the host
invalidates it.

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
- **THEN** each row re-seats its cells' entry options for the new basis by clearing the row's stack
  and adding the same cell components back, reaching no entry list the host keeps protected and
  importing no layout symbol the host does not export

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
the instrument hands out for that variable, already formatted. The format language MUST NOT format a
number, apply a style, or parse Markdown, and `[`, `]`, `(` and `)` are the characters they are. `$`
is the only special character, escaped `\$`. A `$name` the instrument does not declare MUST reject
the document, naming the instrument and the variable.

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

### Requirement: An instrument's style is pi's ThemeStyle

A `style` MUST be pi's `ThemeStyle`, applied with `theme.style()`: `fg` and `bg` as theme color
tokens or colors pi's own parser accepts, plus the booleans `bold`, `dim`, `italic`, `underline`,
`inverse` and `strikethrough`. The extension MUST NOT add style vocabulary of its own. A style MUST
be resolved against the theme current at render time, and any styled text the extension caches MUST
be rebuilt when the host invalidates the footer.

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
