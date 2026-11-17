# Spec Delta

## MODIFIED Requirements

### Requirement: Cell text is the instrument its entry names

Every cell MUST hold an instrument, and a cell's content MUST be what its instrument renders: its
format with its variables substituted. `blank` is an instrument whose default format is the fixed
placeholder text; it is what the default row's ten cells hold. A cell's instrument MAY be one
Jefferson implements or one an extension registers.

#### Scenario: Rendering a row

- **WHEN** a row renders
- **THEN** every cell in it holds an instrument and contains the text that instrument resolves to

#### Scenario: Contributing cell content

- **WHEN** an extension supplies the text a row's entry shows
- **THEN** it registers an instrument, and the document names that instrument

### Requirement: An entry names the instrument its cell renders

A row's entries are in cell order. The `instrument` of an entry MUST name the instrument its cell
renders, as the document configures that name or with its declared defaults, and the extension MUST
NOT take a cell's instrument from any other source. A name no instrument has registered MUST render
that cell `blank` and MUST get its warning only after startup completes, because an instrument may
still register; the warning MUST name it. The row's other cells MUST render theirs.

#### Scenario: A row that names its instruments

- **WHEN** a declared row's list holds entry objects
- **THEN** each cell renders the instrument its entry names, in the order given

#### Scenario: An instrument the extension does not implement

- **WHEN** a declared row's entry names `taiknr.savings`, which no extension has registered
- **THEN** the document is accepted, the warning reads `row 3: "taiknr.savings" is not a known
  instrument` after startup has completed, placed by its row and never by the entry's position, and
  that cell renders `blank` while the row's other cells render theirs

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

#### Scenario: A name that registers during the session

- **WHEN** an entry names an instrument no extension has registered when the footer is installed, and
  an extension registers it before the session ends
- **THEN** that entry renders the instrument from the next render on with the instrument's own width
  behaviour, the registration requests the one repaint that shows it, and no restart is needed

### Requirement: An instrument's configuration lives in the extension's own document

The extension MUST read instrument configuration from a top-level `instruments` object in its
`pi-jefferson.json` document, keyed by instrument name, each value carrying any of that instrument's
declared options. It MUST sit beside `rows`, and a document carrying only `instruments` MUST render
the default row with those instruments configured. A trusted project's document MUST replace the agent
document whole. An entry whose instrument never registers MUST draw no warning, whatever it holds.

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

- **WHEN** the `instruments` object configures a name no instrument registers, with any value, and no
  row's entry names it
- **THEN** the document is accepted, and no warning names it, because its settings are checked only
  once its instrument registers

#### Scenario: A name the block and a row both name

- **WHEN** the `instruments` object configures a name no instrument registers, and a row's entry names
  it too
- **THEN** the document is accepted, and once startup has completed the name is reported once, by the
  row, because only the row's entry renders `blank`

#### Scenario: An option the instrument does not declare

- **WHEN** the `instruments` object gives one of Jefferson's own instruments a key its declaration
  does not have — a misspelling such as `frmát`, or the declined `width`
- **THEN** the document is rejected, the default row renders, and the warning names the key

#### Scenario: Both spellings of one instrument

- **WHEN** the `instruments` object configures both `path` and `jefferson.default.path`
- **THEN** the document is rejected, the default row renders, and the warning quotes both keys as
  written

#### Scenario: A trusted project's document

- **WHEN** a trusted project's document and the agent document both configure instruments
- **THEN** the project's document replaces the agent's whole, and only its configuration applies

### Requirement: An instrument resolves a cell's text by reading the store

An instrument that displays a datum MUST resolve it by reading the store, synchronously, and MUST
hand its format each variable the format names, already formatted. An instrument that displays no datum
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
with the default label `Model:` and the default format `$provider/$model`, rendering
`Model: anthropic/claude-opus-4`. Configuration MUST be able to place it in a cell and configure its
label, format and style, and the footer MUST render it. Its text MUST be correct when a session is
restored, and MUST change when the host reports a model selection.

#### Scenario: The model changes

- **WHEN** the host reports the provider `anthropic` and the model `claude-opus-4` and nothing
  configures `model`
- **THEN** the cell holding `model` renders `Model: anthropic/claude-opus-4`

#### Scenario: A session is restored

- **WHEN** a session is restored and the host reports no selection
- **THEN** the cell holding `model` renders the label, then the restored session's provider and model
  joined by `/`

#### Scenario: A model the host has not supplied

- **WHEN** the store reads the provider or the model as unknown
- **THEN** the cell holding `model` renders nothing, rather than its label or its format with a hole in
  it

#### Scenario: A format that names one datum

- **WHEN** `model` is configured with the format `$model` and the store reads the provider as unknown
- **THEN** the cell renders `Model: claude-opus-4`

### Requirement: The thinking instrument

The extension MUST implement a `thinking` instrument declaring the variable `$level`, with a default
label that renders, gap included, as `Thinking: ` and the default format `$level|capitalize`.
Configuration MUST be able to place it in a row's cell and to configure its label, format and style,
and the footer MUST render it. Its text MUST be correct when a session is restored, and MUST change
when the host reports a selection.

#### Scenario: The default thinking cell

- **WHEN** the host reports the level `high` and the document configures nothing for `thinking`
- **THEN** the cell holding `thinking` renders `Thinking: High`, exactly as it rendered before this
  change

#### Scenario: The thinking level changes

- **WHEN** the host reports a new thinking level
- **THEN** the cell holding `thinking` renders the new level

#### Scenario: A configured label

- **WHEN** the document configures `thinking` with the label `🤔` and nothing else
- **THEN** the cell renders `🤔`, a one-column gap, then the capitalized level, and the default label
  is not shown

#### Scenario: A session is restored

- **WHEN** a session is restored and the host reports no selection
- **THEN** the cell holding `thinking` renders the restored session's thinking level

#### Scenario: A level the host has not supplied

- **WHEN** the store reads the thinking level as unknown
- **THEN** the cell holding `thinking` renders nothing, and does not claim a level the host never
  reported

### Requirement: The context instrument

The extension MUST implement a `context` instrument declaring `$tokens`, `$window`, `$percent` and
`$bar`, read from the context usage the host reports, with the default label `Context:` and
`$percent/$window` as its default format. Each variable MUST arrive already formatted — a compact
token count, a percentage — and a null estimate MUST hand out `?`, as the host's own footer does, and
leave `$bar` unfilled and `dim`. With no usage at all, its variables and `$bar` MUST be unknown.

#### Scenario: A session with a known estimate

- **WHEN** the host reports 86,400 estimated tokens of a 200,000-token window
- **THEN** `$percent` hands out `43.2%`, `$window` `200k` and `$tokens` `86.4k`, and a cell holding
  `context` with nothing configured renders `Context: 43.2%/200k`

#### Scenario: An estimate the host has not made yet

- **WHEN** the host reports a context usage whose token estimate is null, as it does after a
  compaction and before the next response
- **THEN** `$percent` and `$tokens` hand out `?` and the cell renders `Context: ?/200k`, never `0%` and
  never a zero it was not given, and a `$bar` in the format draws its whole track unfilled in `dim`

#### Scenario: No usage the host can report

- **WHEN** the host reports no context usage, because no limits model applies
- **THEN** the cell holding `context` renders nothing

#### Scenario: A bar alone with no usage

- **WHEN** `context` is configured with the format `$bar` and the host reports no usage
- **THEN** the cell renders nothing, label included

### Requirement: An instrument's label is placed in front of its format

Every instrument MUST accept a string `label` option, rendered as literal text in front of its format
text. Whitespace at the front and back of a label MUST be removed, after control characters collapse
to spaces. When the label and the format, so trimmed, are both non-empty, a one-column gap MUST
separate them, always, with no option, setting or opt-out, whatever the format renders. A configured
label empty after the trim MUST replace the default label with none, and no gap renders.

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
- **THEN** that space is removed as trailing whitespace and the cell renders the label, one gap, then
  the content

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

- **WHEN** an instrument holds a label and the store reads a datum its format names as unknown
- **THEN** the cell renders nothing, with no label and no gap

#### Scenario: An empty format leaves the label alone

- **WHEN** a datum is known, the instrument is configured with the label `🤔` and the format `""`
- **THEN** the cell renders `🤔` and nothing after it, no gap included

#### Scenario: A whitespace-only format counts as empty

- **WHEN** a datum is known, the instrument is configured with the label `🤔` and the format `"   "`
- **THEN** the cell renders `🤔` and nothing after it, no gap included

#### Scenario: A dollar sign in a label

- **WHEN** an instrument's label is `$level` and its format is non-empty
- **THEN** the cell renders the characters `$level`, a one-column gap, then the content, and
  substitutes no variable

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

### Requirement: A shipped instrument's default label renders as a configured label does

Every shipped instrument that displays a datum MUST declare a default label and render it as literal
text in front of the format that binds, configured or default, with the one gap, so `format: ""`
renders the label alone. `blank` MUST declare no default label. A configured `label` replaces it and
`""` removes it, as "An instrument's label is placed in front of its format" states.

#### Scenario: The default label in front of the default format

- **WHEN** a shipped instrument declares a default label, nothing configures it, and its data are known
- **THEN** the cell renders the default label, one gap, then the default format's text

#### Scenario: The default label in front of a configured format

- **WHEN** `path` is configured with the format `$path!` and no label, and its data are known
- **THEN** the cell renders `Path:`, one gap, then `pi-jefferson!`

#### Scenario: An empty format leaves the default label alone

- **WHEN** `context` is configured with `format: ""` and no label, and its data are known
- **THEN** the cell renders `Context:` and nothing else

#### Scenario: No label over an absent datum

- **WHEN** an instrument declares a default label and a datum, its format names that datum, and the
  store reads it as unknown
- **THEN** the cell renders nothing, with no default label and no gap

#### Scenario: The thinking default is the template

- **WHEN** `thinking` is configured with nothing and the level is `high`
- **THEN** the cell renders `Thinking: High`, the default label `Thinking:`, one gap, then the level

#### Scenario: blank has no default label

- **WHEN** a cell holds `blank` and nothing configures its label
- **THEN** the cell renders `blank`'s placeholder text with no label, and `blank` configured with the
  format `""` and no label renders nothing, not a lone label

#### Scenario: Every datum-showing instrument has a default label

- **WHEN** the shipped instruments are inspected
- **THEN** each one other than `blank` declares a default label, so a new instrument added for a datum
  arrives with one

### Requirement: The branch instrument

The extension MUST implement a `branch` instrument declaring the variable `$branch`, the git branch
the host reports, with the default label `Branch:` and `$branch` as its default format. A detached
HEAD renders as the host reports it, `detached`. A directory that is not a repository is unknown.

#### Scenario: A named branch

- **WHEN** a cell holds `branch`, nothing configures it and the store holds `main`
- **THEN** it renders `Branch: main`

#### Scenario: A detached HEAD

- **WHEN** the store holds `detached`
- **THEN** the cell renders `Branch: detached`

#### Scenario: Not a repository

- **WHEN** the host reports no branch, `null`, and a cell holds `branch`
- **THEN** the cell renders nothing, with no `Branch:` label and no gap

### Requirement: The session instrument

The extension MUST implement a `session` instrument declaring the variable `$name`, the session's
name, with the default label `Session:` and `$name` as its default format. A session with no name, or
whose name was cleared, is unknown.

#### Scenario: A named session

- **WHEN** a cell holds `session`, nothing configures it and the store holds `refactor footer`
- **THEN** it renders `Session: refactor footer`

#### Scenario: An unnamed session

- **WHEN** the host reports no session name and a cell holds `session`
- **THEN** the cell renders nothing, with no `Session:` label and no gap

#### Scenario: A cleared name

- **WHEN** a session's name is cleared and the host reports it as undefined
- **THEN** the cell holding `session` renders nothing from the next render

### Requirement: The status instrument

The extension MUST implement a `status` instrument declaring the variable `$status`, the footer text
other extensions set, with the default label `Status:` and `$status` as its default format. The
resolver MUST order statuses by key, collapse each one's whitespace and newlines to one space, drop
those left empty and join the rest by one space.

A status's own terminal sequences are stripped; the cell's style colours it. No statuses left is
unknown.

#### Scenario: Several statuses

- **WHEN** the host holds the statuses `b: "idle"` and `a: "3 tasks"` and a cell holds `status`
- **THEN** it renders `Status: 3 tasks idle`

#### Scenario: A status with a newline

- **WHEN** a status's text is `building\n  3 files`
- **THEN** the cell renders `Status: building 3 files` on one line

#### Scenario: No statuses

- **WHEN** the host holds no statuses and a cell holds `status`
- **THEN** the cell renders nothing, with no `Status:` label and no gap

#### Scenario: A status that collapses to nothing

- **WHEN** the only status's text is whitespace and newlines
- **THEN** the cell renders nothing, as with no statuses

### Requirement: A notice's text is a format with declared variables

Each notice kind's text MUST be a format the user can configure, and the values in it MUST be
variables the declaration carries: the token count, the cost, the idle minutes, the number of dropped
thinking blocks and the like. A value MUST carry the quantity and no English word — `$idle` is the
minutes and `$blocks` the count — and a unit or a noun belongs in the kind's text. A variable's
numeral rendering MUST keep pi's formatting, and Jefferson MUST ship no translations.

#### Scenario: A configured format

- **WHEN** the document writes a notice kind's text in its own words around the declared variables
- **THEN** the cell renders those words, with the notice's values in place of the variables

#### Scenario: A value keeps pi's formatting

- **WHEN** a configured format shows a count for a notice of 20,000 tokens
- **THEN** the value reads `20k`, because pi's formatting belongs to the value and not to the words

#### Scenario: A value with no word in it

- **WHEN** a user writes `Anthropic a supprimé $blocks` for a notice of two dropped blocks
- **THEN** the value is `2`, and the user's own words supply the noun pi would have written

#### Scenario: An empty kind text silences it

- **WHEN** the document sets `formats.miss: ""`, the cell's format names `$notice`, and the store holds a miss
- **THEN** the cell renders nothing, with no `Notice:` label and no gap, because `$notice` has no text while that kind would show

#### Scenario: An empty kind text under a format that leaves out `$notice`

- **WHEN** the document sets `formats.miss: ""`, the cell's format is `!`, and the store holds a miss
- **THEN** the cell renders `Notice: !`, because a variable the format does not name has no effect

## ADDED Requirements

### Requirement: A bare name means the default instrument of that name

In a row's entry and in the `instruments` block, a bare name MUST mean the `jefferson.default.*`
instrument of that name, so the two spellings name one instrument. A provided instrument MUST have no
bare shorthand, so a bare name MUST NOT reach a name an extension registered.

#### Scenario: A bare name in a row

- **WHEN** a row's entry names `path`
- **THEN** the entry renders the instrument registered as `jefferson.default.path`

#### Scenario: A bare name in the instruments block

- **WHEN** the `instruments` block configures `path` and a row's entry names `jefferson.default.path`
- **THEN** the one configuration applies, because both spellings name one instrument

#### Scenario: One instrument in two spellings, two rows

- **WHEN** one row's entry names `notice` and another row's entry names `jefferson.default.notice`
- **THEN** both entries render that one instrument with its one configuration, one visible time and
  one expiry, because both spellings name one instrument

#### Scenario: No shorthand for a provided instrument

- **WHEN** a row's entry names `savings` and the only registered `savings` belongs to taiknr
- **THEN** the entry renders as a name no instrument has registered does

### Requirement: A provided instrument takes only the options Jefferson implements

A provided instrument takes a format, a style and a label, and `formats` when it declares
`options: ["formats"]` with a `composed` format set. A key beyond those under its name in the
`instruments` block MUST be refused as an option it does not take, and a registration declaring an
option Jefferson does not implement for a provided instrument MUST be refused. `seconds` is not
offered.

#### Scenario: An option a provided instrument does not take

- **WHEN** the `instruments` block gives a provided instrument `width`
- **THEN** only that instrument is refused: its entries render `blank`, and a warning names the
  instrument and the option

#### Scenario: A provided instrument's formats

- **WHEN** a provided instrument declares `options: ["formats"]` and a `composed` format set, and the
  `instruments` block gives it `formats: { "busy": "Working on $count" }`
- **THEN** the cell renders the selected `busy` text as the user wrote it

### Requirement: A provided instrument's settings are checked once both are in hand

Jefferson MUST check everything under a provided name's key in the `instruments` block — shape, format,
label, option, formats, variable, modifier and style — once both the document and that registration are
in hand, whichever comes second, whether or not a row places the name. A fault MUST refuse that instrument
alone: its entries render `blank`, a warning names it and the fault, and the rest of the document
renders as configured.

#### Scenario: A variable the registration does not declare

- **WHEN** the `instruments` block gives a provided instrument a format naming a variable its
  registration does not carry
- **THEN** only that instrument is refused: its entries render `blank`, a warning names the instrument
  and the variable, and every other entry renders as configured

#### Scenario: A value that is not an object

- **WHEN** the `instruments` block gives a provided name a value that is not an object
- **THEN** only that instrument is refused, and the rest of the document renders as configured

#### Scenario: A name only the block configures

- **WHEN** the `instruments` block configures a provided name no row places, and its provider registers
  after the document is read
- **THEN** its settings are checked when it registers, and a fault refuses only that instrument

#### Scenario: A formats kind the instrument does not carry

- **WHEN** the `instruments` block gives a provided instrument a `formats` kind its registration does
  not carry
- **THEN** only that instrument is refused, its entries render `blank`, and the warning names the
  instrument and the kind

#### Scenario: A provider that registered before the document was read

- **WHEN** the provider's `session_start` handler runs before Jefferson's, so its registration is in
  hand before the document is read
- **THEN** the same rule applies: a fault refuses only that instrument

### Requirement: Only a variable the format names can blank an instrument

An instrument MUST resolve only the variables its format names: a declared variable the format leaves
out MUST NOT be resolved and MUST have no effect. A named variable that is unknown, `$bar` included,
MUST render the instrument as nothing, label included, so a format that names no variable is never
blanked. Jefferson's own instruments and provided ones MUST follow the same rule. Source:
`owner-rulings.md`, 2026-11-16.

#### Scenario: A variable the format leaves out

- **WHEN** taiknr declares `$saved` and `$stubs`, the format is `$saved`, `saved` is reported and
  `stubs` is not
- **THEN** the instrument renders its label and the saved value, and `$stubs` is never resolved

#### Scenario: A named variable that is unknown

- **WHEN** `model`'s default format binds and the store reads the provider as unknown
- **THEN** the cell renders nothing, label included

#### Scenario: A format that names no variable

- **WHEN** `thinking` is configured with the label `🤔` and the format `""`, and the level is unknown
- **THEN** the cell renders `🤔`

#### Scenario: A composed variable the format leaves out

- **WHEN** taiknr declares `$saved` and a composed `$state`, the format is `$saved`, `saved` is reported, and the composed set's `select` has no answer
- **THEN** the instrument renders the saved value, because a composed variable with nothing to compose blanks only a format that names it
