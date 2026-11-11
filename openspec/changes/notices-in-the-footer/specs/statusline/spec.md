## ADDED Requirements

### Requirement: The notice instrument

The extension MUST implement a `notice` instrument declaring `$notice`, the notice the store holds,
with the default label `Notice:` and `$notice` as its default format. Its text MUST stay on one line
and MUST NOT depend on the cell's width, and while no notice is showing the cell MUST render nothing,
label included.

#### Scenario: The default notice cell

- **WHEN** a cell holds `notice`, nothing configures it, and the store holds
  `Cache miss: 125.3k tokens re-billed`
- **THEN** the cell renders `Notice: Cache miss: 125.3k tokens re-billed`

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

### Requirement: A notice's text is pi's text for its kind

A notice's text MUST be the text pi's transcript notice carries for that kind, in pi's wording, with
pi's compact token count and pi's cost suffix, so a footer notice reads as the transcript line would.

#### Scenario: A cache miss with a cost

- **WHEN** a miss re-bills 125,300 tokens at a cost of $0.38
- **THEN** the cell renders `Notice: Cache miss: 125.3k tokens re-billed (~$0.38)`

#### Scenario: A miss too cheap for the suffix

- **WHEN** the same miss costs less than a cent
- **THEN** the notice reads `Cache miss: 125.3k tokens re-billed`, with no cost suffix

#### Scenario: A miss after a model switch

- **WHEN** the notice's variant is a model change
- **THEN** the notice reads `Cache miss after model switch: 125.3k tokens re-billed`

#### Scenario: A miss after an idle

- **WHEN** the notice's variant is an idle
- **THEN** the notice reads `Cache miss after 6m idle: 125.3k tokens re-billed`

#### Scenario: A compaction's usage

- **WHEN** the store holds 125,300 billed tokens at a cost of $0.38 for a compaction
- **THEN** the cell renders `Notice: Compaction: 125.3k tokens billed (~$0.38)`

#### Scenario: A branch summary's usage

- **WHEN** the store holds 125,300 billed tokens for a branch summary
- **THEN** the cell renders `Notice: Branch summary: 125.3k tokens billed`

#### Scenario: Dropped thinking blocks

- **WHEN** two thinking blocks were dropped during provider recovery
- **THEN** the cell renders `Notice: Anthropic dropped 2 thinking blocks (details in session)`

### Requirement: A notice takes the colour pi gives its kind

While a notice shows at full strength its text MUST take the theme's `warning` foreground, the colour
pi gives every kind this change ships. A fade, if the change ships one, MAY change that colour after
the notice arrives; it MUST NOT change the text or the columns the notice takes.

#### Scenario: A cache-miss notice

- **WHEN** the store holds a cache-miss notice
- **THEN** the cell's text renders in the theme's `warning` foreground

#### Scenario: Any other kind

- **WHEN** the store holds a compaction, branch-summary or dropped-thinking notice
- **THEN** its text renders in `warning` too, because pi colours every kind this change ships so

### Requirement: The notice's visible time is an option of its declaration

The `notice` instrument MUST declare a visible-time option, whose value MUST be a whole number in the
unit its declaration states and MUST lie within the bounds the declaration names. An absent value
MUST leave the declared default, and a value outside those bounds MUST reject the document, naming
the option and the value, and render the default row.

#### Scenario: A visible time inside the bounds

- **WHEN** the document sets the visible time to a value inside the bounds
- **THEN** the document is accepted and a notice shows for that long

#### Scenario: No visible time configured

- **WHEN** the document sets no visible time
- **THEN** the declared default applies

#### Scenario: A visible time outside the bounds

- **WHEN** the document sets the visible time below or above the bounds, or to a fraction, a string
  or null
- **THEN** the document is rejected, the default row renders, and the warning names the option and the
  value
