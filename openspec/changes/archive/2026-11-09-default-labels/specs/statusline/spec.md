## ADDED Requirements

### Requirement: A shipped instrument's default label renders as a configured label does

A shipped instrument that declares a default label MUST render it as literal text in front of the format that binds, configured or default, with the one gap, so `format: ""` renders the label alone. It MUST NOT render when the store reads a datum the instrument declares as unknown. `blank` MUST declare no default label. A configured `label` replaces it and `""` removes it, as "An instrument's label is placed in front of its format" states.

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

- **WHEN** an instrument declares a default label and a datum, and the store reads that datum as unknown
- **THEN** the cell renders nothing, with no default label and no gap

#### Scenario: The thinking default is the template

- **WHEN** `thinking` is configured with nothing and the level is `high`
- **THEN** the cell renders `Thinking: High`, the default label `Thinking:`, one gap, then the level

#### Scenario: blank has no default label

- **WHEN** a cell holds `blank` and nothing configures its label
- **THEN** the cell renders `blank`'s placeholder text with no label, and `blank` configured with the format `""` and no label renders nothing, not a lone label

## MODIFIED Requirements

### Requirement: The model instrument

The extension MUST implement a `model` instrument declaring the variables `$provider` and `$model`, with the default label `Model:` and the default format `$provider/$model`, rendering `Model: anthropic/claude-opus-4`. Configuration MUST be able to place it in a cell and configure its label, format and style, and the footer MUST render it. Its text MUST be correct when a session is restored, MUST change when the host reports a model selection, and MUST be nothing when either datum is unknown.

#### Scenario: The model changes

- **WHEN** the host reports the provider `anthropic` and the model `claude-opus-4` and nothing configures `model`
- **THEN** the cell holding `model` renders `Model: anthropic/claude-opus-4`

#### Scenario: A session is restored

- **WHEN** a session is restored and the host reports no selection
- **THEN** the cell holding `model` renders the label, then the restored session's provider and model joined by `/`

#### Scenario: A model the host has not supplied

- **WHEN** the store reads the provider or the model as unknown
- **THEN** the cell holding `model` renders nothing, rather than its label or its format with a hole in it

### Requirement: The path instrument

The extension MUST implement a `path` instrument declaring the variable `$path` — the basename of the working directory the host reports — with the default label `Path:` and `$path` as its default format. It MUST read that directory from the store, and MUST NOT render the whole directory, read the terminal, or run a command to get it.

#### Scenario: The session's directory

- **WHEN** a cell holds `path` in a session whose working directory is `/Users/joelleibow/Projects/pi-jefferson` and nothing configures it
- **THEN** it renders `Path: pi-jefferson`

#### Scenario: A directory the host has not supplied

- **WHEN** the store reads the working directory as unknown
- **THEN** the cell holding `path` renders nothing

### Requirement: The context instrument

The extension MUST implement a `context` instrument declaring `$tokens`, `$window`, `$percent` and `$bar`, read from the context usage the host reports, with the default label `Context:` and `$percent/$window` as its default format. Each variable MUST arrive already formatted — a compact token count, a percentage — and a null estimate MUST hand out `?`, as the host's own footer does, and leave `$bar` unfilled and `dim`. When the host reports no usage at all it MUST render nothing.

#### Scenario: A session with a known estimate

- **WHEN** the host reports 86,400 estimated tokens of a 200,000-token window
- **THEN** `$percent` hands out `43.2%`, `$window` `200k` and `$tokens` `86.4k`, and a cell holding `context` with nothing configured renders `Context: 43.2%/200k`

#### Scenario: An estimate the host has not made yet

- **WHEN** the host reports a context usage whose token estimate is null, as it does after a compaction and before the next response
- **THEN** `$percent` and `$tokens` hand out `?` and the cell renders `Context: ?/200k`, never `0%` and never a zero it was not given, and a `$bar` in the format draws its whole track unfilled in `dim`

#### Scenario: No usage the host can report

- **WHEN** the host reports no context usage, because no limits model applies
- **THEN** the cell holding `context` renders nothing

### Requirement: The tokens instrument

The extension MUST implement a `tokens` instrument declaring `$input`, `$output`, `$cacheRead`, `$cacheWrite` and `$totalTokens`, summed from the session's usage-bearing entries as the host's footer sums them, with the default label `Tokens:` and `$totalTokens` as its default format. `$totalTokens` MUST be `input + output + cacheRead + cacheWrite`, because the host never reads `usage.totalTokens`. The sum MUST cover the whole session, not one branch, and each variable MUST be a compact count.

#### Scenario: A session's totals

- **WHEN** a cell holds `tokens` in a session whose entries carry usage and nothing configures it
- **THEN** it renders `Tokens:`, one gap, then the total tokens of those entries, formatted compactly

#### Scenario: What `$totalTokens` adds

- **WHEN** a session's usage-bearing entries carry input, output, cache-read and cache-write counts
- **THEN** `$totalTokens` is the sum of those four, and no `totalTokens` a provider reported is read

#### Scenario: The categories the host counts

- **WHEN** a session holds usage entries, assistant messages, tool-result messages carrying usage, and compaction or branch-summary entries carrying usage
- **THEN** all four are summed, because the host's own footer sums all four and the numbers are meant to match

#### Scenario: A fresh session

- **WHEN** a session holds no usage at all
- **THEN** `$totalTokens` hands out `0` and the cell renders `Tokens: 0`

### Requirement: The cost instrument

The extension MUST implement a `cost` instrument declaring `$cost`, the session's total cost summed from the same entries `tokens` sums, with the default label `Cost:` and `$cost` as its default format. It MUST arrive already formatted as the host's own footer formats cost, and MUST NOT be summed a second way that could disagree with `tokens`.

#### Scenario: A session with cost

- **WHEN** a cell holds `cost` in a session whose usage carries a total cost of 0.123 and nothing configures it
- **THEN** it renders `Cost: $0.123`

#### Scenario: A fresh session

- **WHEN** a session holds no usage at all
- **THEN** the cell holding `cost` renders `Cost: $0.000`

#### Scenario: Cost and tokens in one render

- **WHEN** one render lays out a cell holding `cost` and a cell holding `tokens`
- **THEN** both read the same scan of the session's entries, taken from that render's sample

### Requirement: An instrument's format is plain text and variables

A `format` MUST be plain text: literal characters render verbatim, and `$name` substitutes the value
the instrument hands out. The format language MUST NOT format a number or parse Markdown. `$` starts a
variable and `|` a modifier when a name follows it; `\$` and `\|` escape them. Whitespace at the front
and back of a format MUST be removed, after control characters collapse to spaces. An undeclared
`$name` MUST reject the document, naming the instrument and the variable.

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

### Requirement: A modifier follows a variable or literal text

A modifier MUST be written `|name` directly after the text it applies to — a variable or literal
text — where a name is a run of the characters a variable name may hold. Modifiers MUST chain, each
applying in the order the format writes them. A modifier on literal text MUST apply to the run of
non-whitespace text immediately before it. `$bar` MUST NOT carry a modifier.

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

### Requirement: $bar takes the width the rest of the format leaves

An instrument MAY declare `$bar`. It MUST take the columns the rest of the format leaves in the
cell, MUST shrink to nothing when nothing is left, and a format MUST hold at most one width-taking
variable — a second MUST reject the document, naming it. The bar MUST be drawn from block
characters in theme colors, with no dependency the package does not already declare, and with no
estimate to show it MUST draw its whole track unfilled in `dim`.

#### Scenario: A bar in a cell with room

- **WHEN** `context` is configured with `label: ""` and the format `$percent $bar` in a cell 20 columns wide, and
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
