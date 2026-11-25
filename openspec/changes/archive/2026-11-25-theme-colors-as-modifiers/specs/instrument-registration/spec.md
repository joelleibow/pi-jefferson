# Spec Delta

## ADDED Requirements

### Requirement: A provider's default format is checked against the theme

A provider's default format MUST be checked as any format is (`statusline`, "A foreground colour of the
theme is a modifier"), when it registers. A foreground colour of the theme it names MUST register and
render as a document's format would. A default format refused today for any reason other than a
foreground colour MUST be refused still, whether or not a document names the instrument. The outcome
MUST NOT depend on the order in which extensions register.

#### Scenario: A default format naming a colour

- **WHEN** a provider's default format carries `$saved|toolDiffAdded`
- **THEN** the instrument registers, and its text renders in that colour as a document's own format
  would, whether the provider's handler runs before or after Jefferson's, and when a row places the
  instrument and the `instruments` block does not configure it

#### Scenario: A default format naming a name the theme does not have

- **WHEN** a provider's default format carries `$saved|notacolour`
- **THEN** the registration is refused as it is today, with its sibling instruments, its fields and its
  later reports, one warning names the instrument and `|notacolour`, the outcome is the same in both
  load orders and with no configuration file, and a row that names the instrument renders it as an
  unknown name, as it does for any refused registration today

#### Scenario: A default format that is not a format

- **WHEN** a provider's default format names a variable its declaration does not carry, or writes a
  modifier where none may go
- **THEN** the refusal stands as it does today, and the warning names the instrument

### Requirement: A held message is judged as it was posted

Jefferson MUST judge a message it holds as it was posted: a change the provider makes afterwards to
an object it posted MUST reach nothing Jefferson checks or renders.

#### Scenario: A change made while a message waits

- **WHEN** a provider posts a registration and a report before Jefferson's `session_start`, then changes
  the objects it posted before that session starts
- **THEN** Jefferson checks and renders what was posted, as it does when the provider posts after
  Jefferson's `session_start`
