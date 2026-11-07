## MODIFIED Requirements

### Requirement: The thinking instrument

The extension MUST implement a `thinking` instrument declaring the variable `$level`, with a default label that renders as `Thinking: ` and the default format `$level|capitalize`. Configuration MUST be able to place it in a row's cell and to configure its label, format and style, and the footer MUST render it. Its text MUST be correct when a session is restored, MUST change when the host reports a thinking-level selection, and MUST be nothing when the level is unknown — not a fallback the host did not report.

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

### Requirement: An instrument's label is placed in front of its format

Every instrument MUST accept a `label` option, a string, beside `format` and `style`. The label MUST be rendered in front of the text the instrument's format produces, configured or default, as literal text in which `$` has no meaning, in the instrument's configured `style`. It MUST NOT be a variable: no instrument declares `$label`. A `label` that is not a string MUST reject the document. An unknown datum MUST suppress the whole cell, label included. The gap between label and content is set by "A label is separated from the content it precedes".

#### Scenario: A label in front of a configured format

<!-- OPEN (a), owner = joel: this scenario used the label `🧠 ` (written trailing space). It is restated with
     a label that has none. What `🧠 ` renders waits for (a): as written, or one more gap. -->

- **WHEN** `model` is configured with the label `🧠` and the format `$model`
- **THEN** the cell renders `🧠`, a one-column gap, then the model id

#### Scenario: A label in front of the default format

- **WHEN** an instrument is configured with a label and no format
- **THEN** the cell renders the label followed by that instrument's default format

#### Scenario: An unknown datum suppresses the label

- **WHEN** an instrument holds a label and the store reads one of its declared data as unknown
- **THEN** the cell renders nothing, the label included, whatever the format is

#### Scenario: An empty format leaves the label alone

- **WHEN** a datum is known, the instrument is configured with the label `🤔` and the format `""`
- **THEN** the cell renders `🤔` and nothing after it, no gap included

#### Scenario: A dollar sign in a label

- **WHEN** an instrument's label is `$level`
- **THEN** the cell renders the characters `$level` as the label and substitutes no variable

#### Scenario: Control characters in a label

- **WHEN** an instrument's label carries a newline and a C1 control character
- **THEN** the cell renders on one line, each control character replaced by one space, as in the
  format's own literal text

#### Scenario: The label takes the instrument's style

- **WHEN** an instrument is configured with the label `Q: ` and the style `{"fg": "accent"}`
- **THEN** the label is styled with the theme's `accent` foreground, as the format's own text is

#### Scenario: The label takes width from a bar

<!-- OPEN (a), owner = joel: this scenario used the label `ab ` (3 columns, bar 11). It is restated with a
     label that has no trailing space, which gives the same 11. What `ab ` leaves waits for (a): 11 as
     written, 10 with one more gap. -->

- **WHEN** `context` is configured with the label `ab` (2 columns) and the format `$percent $bar` in a
  cell 20 columns wide, and the rest of the format takes 6 of them
- **THEN** the bar occupies 11 columns, the width the label, the gap and the format together leave

#### Scenario: The label is not a variable

- **WHEN** a format names `$label`
- **THEN** the document is rejected, the default row renders, and the warning names the instrument and
  the variable, as for any variable the instrument does not declare

#### Scenario: A label that is not a string

- **WHEN** an instrument's `label` is a number or an object
- **THEN** the document is rejected, the default row renders, and the warning names the instrument and
  the option

## ADDED Requirements

<!-- OPEN (a), owner = joel: "ends in no whitespace" leaves a label that already ends in whitespace, such as
     `🧠 `, `🤔 `, `🔋 ` and a trailing control character that collapses to a space, unstated. (a) binds
     there: rendered as written, or given another gap. The default label's text `Thinking: High` binds
     with it. -->
<!-- OPEN (b), owner = joel: "MUST show" admits no flush label. (b) binds on that word: if a label may still
     sit flush against its content, the requirement gains the condition that allows it. -->

### Requirement: A label is separated from the content it precedes

When an instrument renders a label and its format produces content, and the label ends in no whitespace, the cell MUST show a one-column gap between them, on every instrument. The gap MUST count in the cell's width and in what `$bar` leaves, MUST NOT add a line, and MUST NOT appear where the cell renders nothing or the format produces no content. Nothing in a label gains meaning from the gap, and no option sets it.

#### Scenario: A label with no trailing whitespace gets a gap

- **WHEN** `model` is configured with the label `ctx` and the format `$model`, and the model is known
- **THEN** the cell renders `ctx`, one blank column, then the model id

#### Scenario: Every instrument that has a label gets the gap

- **WHEN** any instrument is configured with a label that ends in no whitespace, its data are known and
  its format produces content
- **THEN** one blank column lies between the label and that content, whichever instrument it is

#### Scenario: An unknown datum leaves no gap

- **WHEN** an instrument holds a label that ends in no whitespace and the store reads one of its declared
  data as unknown
- **THEN** the cell renders nothing, with no label and no gap, whatever the format is

#### Scenario: A label alone has no gap

- **WHEN** a datum is known, the label ends in no whitespace and the format is `""`
- **THEN** the cell renders the label with no blank column after it

#### Scenario: The gap counts against a bar

- **WHEN** `context` is configured with the label `ab` and the format `$percent $bar`, and the label,
  the gap and the rest of the format together take 9 columns of a 20-column cell
- **THEN** the bar occupies 11 columns, and the cell is exactly 20 columns wide

#### Scenario: A narrow cell clips the gap with the rest

- **WHEN** a cell is narrower than the label, the gap and the content together
- **THEN** the cell renders no more columns than it was given, clipped at its end as any text is, and no
  rule of its own truncates the label or the gap

#### Scenario: The gap keeps the cell on one line

- **WHEN** an instrument's label ends in no whitespace and carries a control character, and its format
  produces content
- **THEN** the cell renders on one line, the gap among its columns

#### Scenario: The gap is not syntax

- **WHEN** an instrument's label is `$level` and its format produces content
- **THEN** the cell renders the characters `$level`, a one-column gap, then the content, and no variable
  is substituted
