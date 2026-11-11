## ADDED Requirements

### Requirement: The notice instrument

The extension MUST implement a `notice` instrument declaring `$notice`, the notice the store holds,
with the default label `Notice:` and `$notice` as its default format. Its text MUST stay on one line
and MUST NOT depend on the cell's width, and while no notice is showing the cell MUST render nothing,
label included.

#### Scenario: The default notice cell

- **WHEN** a cell holds `notice`, nothing configures it, and the store holds
  `Cache miss: 125k tokens re-billed`
- **THEN** the cell renders `Notice: Cache miss: 125k tokens re-billed`

#### Scenario: No notice to show

- **WHEN** no notice is showing
- **THEN** the cell renders nothing, with no `Notice:` label and no gap

#### Scenario: The same text at any width

- **WHEN** the instrument hands out its text at width 0 and again at width 200
- **THEN** both are the same text, because a notice's text does not depend on the width

#### Scenario: A cell narrower than the notice

- **WHEN** the notice's text is wider than the cell
- **THEN** the row stays one line and clips the text at its end, as it clips any cell's

#### Scenario: A notice beside a fill cell

- **WHEN** a notice arrives in a row that also holds a `blank` or `$bar` cell
- **THEN** the row re-seats at the notice's width, the fill cell gives up those columns, and it takes
  them back when the notice expires

### Requirement: A notice's text is a format with declared variables

Each notice kind's text MUST be a format the user can configure, and the values in it MUST be
variables the declaration carries: the token count, the cost, the idle minutes, the number of dropped
thinking blocks and the like. A variable's value MUST keep pi's formatting, and Jefferson MUST ship no
translations.

#### Scenario: A configured format

- **WHEN** the document writes a notice kind's text in its own words around the declared variables
- **THEN** the cell renders those words, with the notice's values in place of the variables

#### Scenario: A value keeps pi's formatting

- **WHEN** a configured format shows a count for a notice of 20,000 tokens
- **THEN** the value reads `20k`, because pi's formatting belongs to the value and not to the words

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

- **WHEN** the notice's variant is an idle
- **THEN** the notice reads `Cache miss after 6m idle: 125k tokens re-billed`

#### Scenario: A compaction's usage

- **WHEN** the store holds 125,300 billed tokens at a cost of $0.38 for a compaction
- **THEN** the cell renders `Notice: Compaction: 125k tokens billed (~$0.38)`

#### Scenario: A branch summary's usage

- **WHEN** the store holds 125,300 billed tokens for a branch summary
- **THEN** the cell renders `Notice: Branch summary: 125k tokens billed`

#### Scenario: Dropped thinking blocks

- **WHEN** two thinking blocks were dropped during provider recovery
- **THEN** the cell renders `Notice: Anthropic dropped 2 thinking blocks (details in session)`

#### Scenario: One dropped thinking block

- **WHEN** one thinking block was dropped during provider recovery
- **THEN** the cell renders `Notice: Anthropic dropped 1 thinking block (details in session)`, because
  pi chooses the noun by the count

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
and the value, and the default row MUST render.

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
