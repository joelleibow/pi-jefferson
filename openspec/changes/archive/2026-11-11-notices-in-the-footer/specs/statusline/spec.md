## ADDED Requirements

### Requirement: The notice instrument

The extension MUST implement a `notice` instrument declaring `$notice`, the notice the store holds,
with the default label `Notice:` and `$notice` as its default format. Its text MUST stay on one line
and MUST NOT depend on the cell's width. The instrument MUST declare the reading that carries the
notice's shown-until instant, and while the notice is unknown or that instant has passed the cell MUST
render nothing, label included.

#### Scenario: The default notice cell

- **WHEN** a cell holds `notice`, nothing configures it, and the store holds
  `Cache miss: 125k tokens re-billed`
- **THEN** the cell renders `Notice: Cache miss: 125k tokens re-billed`

#### Scenario: No notice to show

- **WHEN** no notice has arrived, or the one the store holds has passed its shown-until instant
- **THEN** the cell renders nothing, with no `Notice:` label and no gap, because the timed visual
  hands out nothing and an unknown datum suppresses the label

#### Scenario: The same text at any width

- **WHEN** the instrument hands out its text at width 0 and again at width 200
- **THEN** both are the same text, because a notice's text does not depend on the width

#### Scenario: A cell narrower than the notice

- **WHEN** the notice's text is wider than the cell
- **THEN** the row stays one line and clips the text at its end, as it clips any cell's

#### Scenario: A notice beside a fill cell

- **WHEN** a notice arrives in a row that also holds a `blank` or `$bar` cell
- **THEN** the row re-seats at the notice's width, the fill cell gives up those columns, and it takes
  them back when the timed visual stops showing the notice

### Requirement: A timed visual shows and hides a datum

A visual under `components/visuals/` MUST show a datum's text while the render's instant is before the
datum's shown-until instant, and MUST hand out nothing — `undefined`, not an empty string — at or
after it, or when either instant is missing. It MUST import no source file of this package and MUST
NOT hold time, read a clock, subscribe to an event or keep configuration. An instrument MUST mix it in
by declaring the reading that carries the instant.

#### Scenario: Before the instant

- **WHEN** the render's instant is one millisecond before the datum's shown-until instant
- **THEN** the visual hands out the datum's text unchanged, and the cell renders it

#### Scenario: At the instant

- **WHEN** the render's instant is the shown-until instant
- **THEN** the visual hands out nothing, so the cell renders nothing, label included

#### Scenario: An instant the reading does not carry

- **WHEN** a timed instrument's reading yields no shown-until instant, or the render has no instant
- **THEN** the visual hands out nothing, and the cell renders nothing

#### Scenario: The instrument mixes it in

- **WHEN** the `notice` instrument renders while its notice's shown-until instant is in the future
- **THEN** the cell renders the notice, and after that instant the same cell renders nothing

#### Scenario: The visual imports nothing

- **WHEN** the imports of `components/visuals/timed.ts` are listed
- **THEN** none names another source file of this package

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

- **WHEN** the document sets `formats.miss: ""` and the store holds a miss
- **THEN** the cell renders nothing, with no `Notice:` label and no gap, because a kind whose
  configured text is empty shows nothing while that notice would show

### Requirement: The default text is pi's text for its kind

Unconfigured, each kind's default format MUST render exactly the text pi's transcript notice draws for
that kind, in pi's wording, with the count pi's `formatTokens` draws and the cost suffix pi appends.
That default MUST NOT come from the formatter the cells share, which keeps one decimal up to 100,000
where pi rounds to a whole thousand from 10,000 up.

#### Scenario: A cache miss with a cost

- **WHEN** a miss re-bills 125,300 tokens at a cost of $0.38
- **THEN** the cell renders `Notice: Cache miss: 125k tokens re-billed (~$0.38)`

#### Scenario: A miss too cheap for the suffix

- **WHEN** the same miss costs less than a cent
- **THEN** the notice reads `Cache miss: 125k tokens re-billed`, with no cost suffix

#### Scenario: A miss in the ten-thousands

- **WHEN** a miss re-bills 20,000 tokens
- **THEN** the notice reads `Cache miss: 20k tokens re-billed`, because pi rounds to whole thousands
  from 10,000 up

#### Scenario: A miss after a model switch

- **WHEN** the notice's variant is a model change
- **THEN** the notice reads `Cache miss after model switch: 125k tokens re-billed`

#### Scenario: A miss after an idle

- **WHEN** the notice's variant is an idle of six minutes
- **THEN** the notice reads `Cache miss after 6m idle: 125k tokens re-billed`, because the default
  writes `$idle\m` and `\` escapes the `m` after the bare minutes

#### Scenario: A compaction's usage

- **WHEN** the store holds 125,300 billed tokens at a cost of $0.38 for a compaction
- **THEN** the cell renders `Notice: Compaction: 125k tokens billed (~$0.38)`

#### Scenario: A branch summary's usage

- **WHEN** the store holds 125,300 billed tokens for a branch summary
- **THEN** the cell renders `Notice: Branch summary: 125k tokens billed`

#### Scenario: Dropped thinking blocks

- **WHEN** two thinking blocks were dropped during provider recovery
- **THEN** the cell renders `Notice: Anthropic dropped 2 thinking blocks (details in session)`, and the
  notice's kind is `thinking`

#### Scenario: One dropped thinking block

- **WHEN** one thinking block was dropped during provider recovery
- **THEN** the cell renders `Notice: Anthropic dropped 1 thinking block (details in session)`, because
  pi chooses the noun by the count and the count of one is its own kind, `thinkingOne`

#### Scenario: The kind carries the number and the text carries the noun

- **WHEN** two thinking blocks were dropped and the notice's kind is `thinking`
- **THEN** the value `$blocks` is `2`, and the default text supplies `thinking blocks`

### Requirement: A notice takes the colour pi gives its kind

A notice's text MUST take the theme's `warning` foreground, the colour pi gives every kind this change
ships, and MUST NOT change colour, text or columns while the notice shows.

#### Scenario: A cache-miss notice

- **WHEN** the store holds a cache-miss notice
- **THEN** the cell's text renders in the theme's `warning` foreground

#### Scenario: Any other kind

- **WHEN** the store holds a compaction, branch-summary or dropped-thinking notice
- **THEN** its text renders in `warning` too, because pi colours every kind this change ships so

### Requirement: The notice's visible time is the `seconds` option

The `notice` instrument MUST declare a `seconds` option: a whole number of seconds from 1 to 60,
default 10, checked the way the document-level `rowGap` is. An absent value MUST leave the default. A
value that is not a whole number, or lies outside 1 to 60, MUST reject the document, naming the option
and the value, and the default row MUST render. The duration belongs to the instrument's datum: the
composition root hands it to the store, and the visual keeps no configuration.

#### Scenario: A visible time inside the bounds

- **WHEN** the document sets `seconds` to 30
- **THEN** the document is accepted and a notice shows for 30 seconds

#### Scenario: No visible time configured

- **WHEN** the document sets no `seconds`
- **THEN** a notice shows for 10 seconds, the declared default

#### Scenario: A visible time outside the bounds

- **WHEN** the document sets `seconds` to 0, 61, 1.5, `"10"` or null
- **THEN** the document is rejected, the default row renders, and the warning names the option and the
  value

## MODIFIED Requirements

### Requirement: An instrument's format is plain text and variables

A `format` MUST be plain text: literal characters render verbatim, and `$name` substitutes the value
the instrument hands out. The format language MUST NOT format a number or parse Markdown.

`$` starts a variable and `|` a modifier when a name follows it, and `\` makes the character after it
that character, so `\$`, `\|` and `\m` render `$`, `|` and `m`. A `\` with no character after it is
the character itself. Whitespace at the front and back of a format MUST be removed, after control
characters collapse to spaces. An undeclared `$name` MUST reject the document, naming the instrument
and the variable.

#### Scenario: Literal text among variables

- **WHEN** `model` is configured with `label: ""`, the format `🧠: $model from $provider` and the store holds
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

- **WHEN** `model` is configured with `label: ""`, the format `$model | $provider` and the store holds
  `anthropic` and `claude-opus-4`
- **THEN** the cell renders `claude-opus-4 | anthropic`, because the `|` is followed by a space and
  not by a name, so it is the character it is

#### Scenario: A literal pipe beside a name

- **WHEN** a format writes `\|` where the next character is one a name may hold
- **THEN** the cell renders a `|` and starts no modifier

#### Scenario: A backslash before a letter

- **WHEN** a format carries `$idle\m` and the notice's idle is six minutes
- **THEN** the cell renders `6m` with no space between them, because `\` escapes the `m` and the name
  `$idlem` is not what the format asks for

#### Scenario: A backslash before any other character

- **WHEN** a format carries `a\b`
- **THEN** the cell renders `ab`, because a backslash yields the character after it

#### Scenario: A backslash with nothing after it

- **WHEN** a format ends in `\`, so no character follows it
- **THEN** the cell renders a `\`, because a backslash escapes only a character that follows it

#### Scenario: Space at the front or back of a format

- **WHEN** `model` is configured with `label: ""`, the format `  $model  ` and the store holds `claude-opus-4`
- **THEN** the cell renders `claude-opus-4`, as if the format had no leading or trailing space

#### Scenario: Control characters at the edge of a format

- **WHEN** a format ends in a newline, which collapses to a space
- **THEN** that space is removed with the rest of the trailing whitespace, and the cell renders on one
  line

#### Scenario: Space inside a format

- **WHEN** a format is `$percent $bar`
- **THEN** the space between the two variables renders as written; only the format's front and back are
  trimmed
