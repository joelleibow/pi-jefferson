# Spec Delta

## MODIFIED Requirements

### Requirement: An instrument's style is pi's ThemeStyle

A `style` MUST be pi's `ThemeStyle`, applied with `theme.style()`: `fg` and `bg` as theme tokens or
colors pi's parser accepts, plus `bold`, `dim`, `italic`, `underline`, `inverse` and
`strikethrough`. The extension MUST add no style vocabulary of its own: a modifier's attributes and
its colours are pi's names. A style MUST be resolved against the theme current at render time, and
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
- **THEN** the name it writes is one of `ThemeStyle`'s six booleans or a foreground colour of the
  theme, and the extension carries no styling name of its own

### Requirement: A modifier follows a variable or literal text

A modifier MUST be written `|name` directly after the text it applies to — a variable or literal
text — where a name is a run of the characters a variable name may hold. Modifiers MUST chain, each
applying in the order the format writes them. A modifier on literal text MUST apply to the run of
non-whitespace text immediately before it. `$bar` MUST NOT carry a modifier. A form is a modifier
only on the variable that declares it.

#### Scenario: A modifier on a variable

- **WHEN** `model` is configured with `label: ""`, the format `$model|bold` and the store holds `claude-opus-4`
- **THEN** the cell renders `claude-opus-4` bold, and the format looks up a variable named `model`

#### Scenario: A modifier on literal text

- **WHEN** `model` is configured with `label: ""`, the format `🧠 $model via|dim $provider` and the store holds
  `anthropic` and `claude-opus-4`
- **THEN** the cell renders `🧠 claude-opus-4 via anthropic`, with `dim` applied to `via` and to no
  other text

#### Scenario: A chain on literal text

- **WHEN** `model` is configured with `label: ""`, the format `$model via|dim|bold $provider` and the store holds
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
- **THEN** the style and string modifier names that parsing, validation and rendering read come from
  one table, and a form's names come from the declaration of the variable that owns it, read by all
  three alike

#### Scenario: A modifier on the width-taking variable

- **WHEN** an instrument's format writes a modifier directly after `$bar`
- **THEN** the document is rejected, the default row renders, and the warning names the instrument
  and the modifier

#### Scenario: A modifier with nothing before it

- **WHEN** `model` is configured with the format `🧠 |dim $model` and the store holds
  `claude-opus-4`
- **THEN** the document is rejected, the default row renders, and the warning names the instrument
  and the modifier, because no variable and no non-whitespace text precedes the pipe

### Requirement: A variable can declare forms

An instrument MAY declare forms for a variable: named ways of showing one datum. The bare variable
hands out its `variables` entry, which may also be named as a form. A form MUST be written `|name`
directly after its variable, before any other modifier, once. Anywhere else the name is no form, and
the order in "A foreground colour of the theme is a modifier" decides it: a name that order refuses
rejects the document, naming the instrument and the modifier. A form selects a value, not text.

#### Scenario: A form with another modifier after it

- **WHEN** `path` is configured with the format `$path|relative|bold`
- **THEN** the variable renders its relative form, bold

#### Scenario: A form after literal text

- **WHEN** an instrument's format carries `hello|base`
- **THEN** the document is rejected, the default row renders, and the warning names the instrument and `|base`

#### Scenario: A form on a variable that does not declare it

- **WHEN** `model` is configured with the format `$model|base`
- **THEN** the document is rejected, the default row renders, and the warning names `model` and `|base`

#### Scenario: A form after another modifier

- **WHEN** `path` is configured with the format `$path|bold|absolute`
- **THEN** the document is rejected, and the warning names `path` and `|absolute`

#### Scenario: A form after a colour

- **WHEN** `path` is configured with the format `$path|accent|relative`
- **THEN** the document is rejected, and the warning names `path` and `|relative`, because a colour is a
  modifier and a form comes before any modifier

#### Scenario: Two forms on one variable

- **WHEN** `path` is configured with the format `$path|base|absolute`
- **THEN** the document is rejected, and the warning names `path` and `|absolute`

### Requirement: The thinking level takes the color of the input box's thinking rules

The `$level` segment of the `thinking` instrument MUST be colored with the color pi gives the thinking
rules on the input box for that level, one per level pi reports, resolved against the theme current at
render time. On that segment the color MUST replace a configured `fg`, unless the format names a
colour for `$level`, and a configured `bg` and the boolean attributes MUST remain. Nothing cached from
an earlier level or theme MAY survive a change of either.

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

#### Scenario: A colour in the format

- **WHEN** `thinking` is configured with the format `$level|accent` and the level is `high`
- **THEN** the `$level` segment renders in `accent`, not in the color the input box's rule takes for
  `high`, because the colour written in the format is the strongest colour

### Requirement: A notice takes the colour pi gives its kind

A notice's text MUST take the theme's `warning` foreground, the colour pi gives every kind this change
ships, unless the instrument's format names a colour for `$notice`, and MUST NOT change colour, text
or columns while the notice shows.

#### Scenario: A cache-miss notice

- **WHEN** the store holds a cache-miss notice
- **THEN** the cell's text renders in the theme's `warning` foreground

#### Scenario: Any other kind

- **WHEN** the store holds a compaction, branch-summary or dropped-thinking notice
- **THEN** its text renders in `warning` too, because pi colours every kind this change ships so

#### Scenario: A colour in the format

- **WHEN** the document configures `notice` with the format `$notice|accent` and the store holds a
  cache-miss notice
- **THEN** the notice's text renders in `accent`, and its text and columns are as they are without a
  colour

### Requirement: A notice's text is a format with declared variables

Each notice kind's text MUST be a format the user can configure, and its values MUST be variables the
declaration carries. A value MUST carry the quantity and no English word — `$idle` is the minutes,
`$blocks` the count — and a unit or a noun belongs in the kind's text. A kind's text MUST be plain: a
`|name` in it, a colour included, MUST reject the document (ADR 0012). A variable's numeral rendering
MUST keep pi's formatting, and Jefferson MUST ship no translations.

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

## REMOVED Requirements

### Requirement: A style modifier only sets an attribute on

**Reason**: The colour clause "`fg` and `bg` MUST NOT be modifiers" is retired, and the requirement's
kept scenario title, "A color is not a modifier", no longer holds once a foreground colour is a
modifier. The rules about attributes are restated, unchanged, as "A style modifier only adds an
attribute".

**Migration**: No document changes. A format that writes a foreground colour after `|` now colours the
piece it attaches to instead of being refused; every format accepted today renders as it does today.

## ADDED Requirements

### Requirement: A style modifier only adds an attribute

The six `ThemeStyle` booleans are the format's style modifiers. Each MUST only set its attribute
on, and MUST add to the instrument's `style` rather than replace it, so a modifier applies even
where the instrument's `style` sets the same attribute off. A style modifier MUST NOT switch an
attribute off, and `bg` MUST NOT be a modifier. A foreground colour is the other kind of modifier
("A foreground colour of the theme is a modifier").

#### Scenario: A modifier over an attribute set off

- **WHEN** an instrument is configured with the style `{"bold": false}` and its format carries
  `$model|bold`
- **THEN** the cell renders the model's value bold, because a style modifier adds an attribute and
  cannot take one away

#### Scenario: A colour sets no attribute

- **WHEN** a format carries `|accent`
- **THEN** the text takes the theme's `accent` foreground and no attribute changes, because a colour
  is not one of the six style attributes and the extension adds no style name of its own

#### Scenario: A colour leaves an attribute set off

- **WHEN** an instrument is configured with the style `{"bold": false}` and its format carries
  `|accent`
- **THEN** the text takes the theme's `accent` foreground and renders unbold, because a colour sets no
  attribute and clears none

### Requirement: A foreground colour of the theme is a modifier

A `|name` MAY be a foreground colour of the theme. The colour MUST set the piece's foreground and
nothing the extension chooses; a theme that renders that colour faint renders it faint. A name after
`|` is read in one order: a form, directly after its variable and once (ADR 0010), then Jefferson's
own names, then a foreground colour of the theme; anything else is refused. A name Jefferson already
gives meaning keeps it on a variable that declares no form by that name.

#### Scenario: A colour on a variable

- **WHEN** `model` is configured with `label: ""` and the format `$model|toolDiffRemoved`, and the
  store holds `claude-opus-4`
- **THEN** that value renders in the theme's `toolDiffRemoved` foreground, and nothing else in the
  format changes

#### Scenario: A colour on literal text

- **WHEN** `model` is configured with `label: ""` and the format `$model via|muted $provider`, and the
  store holds `anthropic` and `claude-opus-4`
- **THEN** the word `via` renders in the theme's `muted` foreground, and the two values render as they
  do with no colour

#### Scenario: A colour after a form

- **WHEN** `path` is configured with the format `$path|relative|accent` and no label
- **THEN** the relative form renders in the theme's `accent` foreground, because the form is read
  first and the colour comes after it

#### Scenario: A form named like a colour

- **WHEN** a variable declares the form `accent` and a format carries `$price|accent`
- **THEN** the form renders, because a form is read first, directly after the variable that declares it

#### Scenario: That name after another modifier

- **WHEN** a variable declares the form `accent` and a format carries `$price|bold|accent`
- **THEN** the value renders bold in the theme's `accent` foreground, because a form is read only
  directly after its own variable

#### Scenario: A colour and an attribute on one piece

- **WHEN** one format carries `$provider|accent|bold` and another `$provider|bold|accent`
- **THEN** both render the value in `accent` and bold

#### Scenario: A background colour

- **WHEN** a format carries `$model|selectedBg`
- **THEN** the document is rejected when it is read, the default row renders, and the warning names
  the instrument and the modifier, because only a foreground colour is a modifier

#### Scenario: A name the theme does not have

- **WHEN** a format carries `$model|acccent`
- **THEN** the document is rejected when it is read, the default row renders, and the warning names
  the instrument and the modifier, as for any name the extension does not implement

#### Scenario: A provided instrument's format names a colour the theme does not have

- **WHEN** a document configures a provided instrument with the format `$saved|acccent`
- **THEN** that instrument alone is refused, one warning names the instrument and `|acccent`, and the
  rest of the document renders

#### Scenario: dim is the attribute

- **WHEN** a format carries `$model|dim` and the theme carries a `dim` colour too
- **THEN** the text renders faint, and the theme's `dim` colour is reached through the instrument's
  `style` foreground

### Requirement: The colour a format names is the strongest colour

A piece's foreground MUST be the first of these that applies: the last colour its chain names; then
the instrument's built-in colour for that variable, consulted only when the chain names no colour;
then the instrument's `style`. With no colour in the format the other two apply as they do today. A
label has no format, so only the `style` colours it. Two colours on one piece apply in the order
written, so the later one wins.

#### Scenario: Two colours on one piece

- **WHEN** a format carries `$provider|accent|warning`
- **THEN** the value renders in `warning`, the colour written later, because the chain applies in the
  order written

#### Scenario: A colour over the style

- **WHEN** an instrument is configured with the style `{"fg": "accent"}` and the format
  `$model|warning via`
- **THEN** the value renders in `warning`, the colour written in the format, and the word `via`
  renders in `accent`, the `style`'s foreground

#### Scenario: A label keeps the style

- **WHEN** `model` is configured with the label `Model:` and the format `$model|accent`
- **THEN** the value renders in `accent`, and the label keeps the instrument's style

#### Scenario: A colour function the format covers

- **WHEN** a provided instrument's colour function for `$saved` throws, and the document configures
  that instrument with the format `$saved|accent`
- **THEN** the value renders in `accent` and no warning is drawn, because the built-in colour is
  consulted only for a piece the format does not colour

### Requirement: A colour's name is the theme's own

A colour name MUST be a foreground-slot name of the theme, spelled as pi spells it, so a name
differing only in case is another name. The name MUST be asked of the theme the host hands the
extension: the shipped source MUST hold no copy of the set of names a format may write as a colour,
MUST read no theme file, and MUST NOT compensate for a theme that renders a colour faint. The text
MUST be drawn with the colour the theme current at render time gives that name.

#### Scenario: A case-different name

- **WHEN** a format carries `$model|Accent` and the theme's name is `accent`
- **THEN** the document is rejected when it is read, because a colour's name is pi's spelling and
  case is part of it

#### Scenario: A faint colour

- **WHEN** the theme renders a foreground colour faint, as pi's system theme does for `muted`
- **THEN** the text renders faint, exactly as the same colour renders through the instrument's `style`,
  and the extension compensates for nothing

#### Scenario: The theme changes

- **WHEN** the host switches theme and invalidates the footer
- **THEN** the next render draws the text in the new theme's colour for that name, and nothing cached
  from the old theme survives

#### Scenario: The names are the theme's, not a copy

- **WHEN** a format carries a colour name against a theme that carries a name pi does not have, and
  against a theme that lacks a name pi has
- **THEN** the name the theme carries is a colour and the name it lacks is refused, because the
  extension holds no copy of the set of names a format may write as a colour
