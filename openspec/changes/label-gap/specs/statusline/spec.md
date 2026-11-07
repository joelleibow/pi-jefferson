## MODIFIED Requirements

### Requirement: The thinking instrument

The extension MUST implement a `thinking` instrument declaring the variable `$level`, with a default label that renders, gap included, as `Thinking: ` and the default format `$level|capitalize`. Configuration MUST be able to place it in a row's cell and to configure its label, format and style, and the footer MUST render it. Its text MUST be correct when a session is restored, MUST change when the host reports a thinking-level selection, and MUST be nothing when the level is unknown — not a fallback the host did not report.

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

### Requirement: An instrument's format is plain text and variables

A `format` MUST be plain text: literal characters render verbatim, and `$name` substitutes the value
the instrument hands out, already formatted. The format language MUST NOT format a number or parse
Markdown, and `[`, `]`, `(` and `)` are the characters they are. `$` starts a variable; `|` starts
a modifier when a name follows it directly, and is text otherwise; both are escaped with a
backslash: `\$`, `\|`. Whitespace at the front and back of a format MUST be removed, after control
characters collapse to spaces, so a format renders as if it had none there; whitespace between a
format's parts is text and renders as written. An undeclared `$name` MUST reject the document, naming
the instrument and the variable.

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

### Requirement: An instrument's label is placed in front of its format

Every instrument MUST accept a `label` option, a string, beside `format` and `style`. The label MUST be
rendered in front of the text the instrument's format produces, configured or default, as literal text
in which `$` has no meaning, in the instrument's configured `style`. It MUST NOT be a variable: no
instrument declares `$label`. A `label` that is not a string MUST reject the document. An unknown datum
MUST suppress the whole cell, label included.

Whitespace at the front and back of a label MUST be removed, after control characters collapse to
spaces, so the label carries no space of its own at its edges. When the label, so trimmed, is non-empty
and the format, so trimmed, is non-empty, the cell MUST show a gap between the label and the content
that follows, on every instrument: always, with no option, setting or opt-out, so a label never sits flush
against its content. The condition is the format being non-empty, not what it renders: a format that is
empty after the trim leaves the label alone, with no gap. A configured label that is empty, or empty after the trim, replaces the instrument's default label with no label, and no gap renders. The gap MUST be one column wide. It MUST take the style the label
has, so it leaves no unstyled hole between label and content; it MUST count in the cell's width and in
what `$bar` leaves; and it MUST NOT add a line. Nothing in a label gains meaning from the gap.

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
