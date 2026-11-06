# Spec Delta

## ADDED Requirements

### Requirement: An instrument's label is placed in front of its format

Every instrument MUST accept a `label` option, a string, beside `format` and `style`. The label MUST be
rendered in front of the text the instrument's format produces, configured or default, as literal text
in which `$` has no meaning, in the instrument's configured `style`. It MUST NOT be a variable: no
instrument declares `$label`. A `label` that is not a string MUST reject the document. An unknown datum
MUST suppress the whole cell, label included.

#### Scenario: A label in front of a configured format

- **WHEN** `model` is configured with the label `🧠 ` and the format `$model`
- **THEN** the cell renders `🧠 ` followed by the model id

#### Scenario: A label in front of the default format

- **WHEN** an instrument is configured with a label and no format
- **THEN** the cell renders the label followed by that instrument's default format

#### Scenario: An unknown datum suppresses the label

- **WHEN** an instrument holds a label and the store reads one of its declared data as unknown
- **THEN** the cell renders nothing, the label included, whatever the format is

#### Scenario: An empty format leaves the label alone

- **WHEN** a datum is known, the instrument is configured with the label `🤔` and the format `""`
- **THEN** the cell renders `🤔` and nothing after it

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

- **WHEN** `context` is configured with the label `ab ` (3 columns) and the format `$percent $bar` in a
  cell 20 columns wide, and the rest of the format takes 6 of them
- **THEN** the bar occupies 11 columns, the width the label and the format together leave

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

## MODIFIED Requirements

### Requirement: The thinking instrument

The extension MUST implement a `thinking` instrument declaring the variable `$level`, whose default
label is `Thinking: ` and whose default format is `$level|capitalize`, so that it renders `Thinking: `
followed by the capitalized level. Configuration MUST be able to place it in a row's cell and to
configure its label, format and style, and the footer MUST render it. Its text MUST already be correct
when a session is restored, MUST change when the host reports a thinking-level selection, and MUST be
nothing when the level is unknown — not a fallback the host did not report.

#### Scenario: The default thinking cell

- **WHEN** the host reports the level `high` and the document configures nothing for `thinking`
- **THEN** the cell holding `thinking` renders `Thinking: High`

#### Scenario: The thinking level changes

- **WHEN** the host reports a new thinking level
- **THEN** the cell holding `thinking` renders the new level

#### Scenario: A configured label

- **WHEN** the document configures `thinking` with the label `🤔` and nothing else
- **THEN** the cell renders `🤔` followed by the capitalized level, and the default label is not shown

#### Scenario: A session is restored

- **WHEN** a session is restored and the host reports no selection
- **THEN** the cell holding `thinking` renders the restored session's thinking level

#### Scenario: A level the host has not supplied

- **WHEN** the store reads the thinking level as unknown
- **THEN** the cell holding `thinking` renders nothing, and does not claim a level the host never
  reported
