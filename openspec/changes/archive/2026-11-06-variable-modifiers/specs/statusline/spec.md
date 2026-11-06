# Spec Delta

## MODIFIED Requirements

### Requirement: An instrument's format is plain text and variables

A `format` MUST be plain text: literal characters render verbatim, and `$name` substitutes the value
the instrument hands out, already formatted. The format language MUST NOT format a number or parse
Markdown, and `[`, `]`, `(` and `)` are the characters they are. `$` starts a variable; `|` starts
a modifier when a name follows it directly, and is text otherwise; both are escaped with a
backslash: `\$`, `\|`. An undeclared `$name` MUST reject the document, naming the instrument and
the variable.

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

## ADDED Requirements

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
