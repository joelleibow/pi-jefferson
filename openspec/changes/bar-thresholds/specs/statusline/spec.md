# Spec Delta

## ADDED Requirements

### Requirement: A threshold sets the instrument's state at a percentage

An instrument that takes `thresholds` MUST accept a list whose entries each carry an integer
`activeAt` and any option the instrument declares, `thresholds` excepted. The entry with the highest
`activeAt` at or below the bar's reading MUST set the state for that render, and the top-level
settings MUST apply when none does. Source: `owner-rulings.md`, 2026-11-25; `council.md`, "A fifth
threshold".

#### Scenario: A threshold reached

- **WHEN** an instrument carrying a bar is configured with a threshold at `activeAt` 70 giving a
  format and a style, and its bar reads 72
- **THEN** the instrument renders that threshold's format in the effective style, the threshold's
  layered on the top level's

#### Scenario: Below every threshold

- **WHEN** the lowest `activeAt` an instrument's settings carry is 70, and its bar reads 50
- **THEN** the instrument renders the top-level settings, as it does with no threshold written

#### Scenario: A threshold at its own percentage

- **WHEN** an instrument's bar reads exactly the `activeAt` of the highest threshold at or below it
- **THEN** that threshold's state applies, because a threshold applies at its own number

#### Scenario: Two thresholds below the reading

- **WHEN** an instrument's settings carry thresholds at 30 and 60, and its bar reads 80
- **THEN** the state at 60 applies, and no setting of the one at 30 reaches it

### Requirement: The default thresholds are 70 and 90

Settings carrying no `thresholds` MUST apply two defaults: `activeAt` 70 setting `fill` to the
theme's `warning`, and `activeAt` 90 setting it to `error`. Each is a threshold like any other, so
it layers on the top-level `fill`, changes no other key, never colours text, and reaches every bar,
Jefferson's own or a provider's, opted in or not. Source: `owner-rulings.md`, 2026-11-25 ("Those are
sensible defaults", ">="); `council.md`, the defaults rows.

#### Scenario: Exactly 70

- **WHEN** a bar renders with no threshold configured and the bar's reading is 70
- **THEN** its filled portion takes the theme's `warning` colour

#### Scenario: Exactly 90

- **WHEN** a bar renders with no threshold configured and the bar's reading is 90
- **THEN** its filled portion takes the theme's `error` colour

#### Scenario: Below the first default

- **WHEN** a bar renders with no threshold configured and the bar's reading is 69.9
- **THEN** its fill takes neither colour, and only the top-level `fill` or `style` colours it

#### Scenario: A default colours the fill and no text

- **WHEN** a bar renders past 90 with no threshold configured, in an instrument whose format places
  text beside the bar
- **THEN** the filled portion is `error` coloured and the text keeps the instrument's style

#### Scenario: A default over a top-level fill colour

- **WHEN** an instrument's settings give `"fill": {"fg": "muted"}` and no `thresholds`, and its bar
  reads 75
- **THEN** the fill is the theme's `warning`, and below 70 that same fill is muted

#### Scenario: A default keeps another fill key

- **WHEN** an instrument's settings give `"fill": {"bold": true}` and no `thresholds`, and its bar
  reads 75
- **THEN** the fill is the theme's `warning` and still bold

#### Scenario: A default reaches a provider's bar that did not opt in

- **WHEN** a provided instrument declares `bar` and no `options`, its settings carry no new key, and
  its bar reads 70
- **THEN** its fill is the theme's `warning`, because the defaults are the list in force for every bar

#### Scenario: A default fills a provider's bar with no list written

- **WHEN** a provided instrument declares `bar` and `options: ["thresholds"]`, and the
  `instruments` block gives it no list
- **THEN** its fill takes the default colours, because the defaults are the list in force

### Requirement: A configured list replaces the defaults

A `thresholds` list MUST replace the defaults whole: a configured entry MUST NOT be joined by a
default entry, and an empty list MUST apply no threshold at all, so nothing colours the fill at any
percentage. Source: `owner-rulings.md`, 2026-11-25 ("#1", replace).

#### Scenario: One threshold and no default

- **WHEN** an instrument's settings carry one threshold at 90 and its bar reads 75
- **THEN** no default `warning` colour reaches the fill

#### Scenario: An empty list

- **WHEN** an instrument's settings carry `"thresholds": []` and its bar reads 95
- **THEN** no threshold applies and the fill takes only what the top-level `fill` or `style` gives it

### Requirement: A threshold's state changes only the keys it names

A threshold MUST NOT depend on another: a key it leaves out MUST come from the top-level settings,
and otherwise from the declaration's default, never from another threshold. An object-valued option
MUST layer key by key, and `formats` MUST layer kind by kind, so a kind a threshold leaves out is
the top level's. Source: `owner-rulings.md`, 2026-11-25 ("replaces only the keys it names");
`council.md`, the `formats` row.

#### Scenario: A key one threshold leaves out

- **WHEN** the top-level settings give an instrument a label and a threshold at 70 sets only a style
- **THEN** the label renders at 70, because the key the threshold leaves out comes from the top level

#### Scenario: The top level's keys stay

- **WHEN** the top-level `fill` is `{"bold": true}` and a threshold reached sets
  `"fill": {"fg": "warning"}`
- **THEN** the fill is the theme's `warning` colour and still bold

#### Scenario: A second threshold inherits nothing from the first

- **WHEN** a threshold at 30 sets a background and a threshold at 60 sets only a foreground
- **THEN** at 60 the background is the top level's, and not the one the threshold at 30 set

#### Scenario: A formats kind a threshold leaves out

- **WHEN** the top-level settings set the formats `busy` and `idle`, and a threshold at 70 sets only
  `busy`
- **THEN** at 70 `busy` is the threshold's text and `idle` is the top level's, never another
  threshold's

### Requirement: The style, the fill and the track layer in one order

The state in force MUST be one settings object: each option the threshold's value layered on the top
level's. The fill MUST take that object's `style` with its `fill` on top, the track MUST take its
`style` plus `dim`, and text MUST take its `style` under the colours the format and the declaration
name. A threshold's `style` MUST NOT override a `fill`. Source: `council.md`, the layering-order row;
`owner-rulings.md`, 2026-11-25.

#### Scenario: A threshold's style colours the text and not the fill

- **WHEN** the top-level `fill` is `{"fg": "muted"}`, a threshold at 70 sets only
  `"style": {"fg": "error"}`, and the bar reads 75
- **THEN** the fill is muted and the text is `error` coloured


### Requirement: `fill` styles the bar's fill and nothing else

`fill` MUST take `style`'s shape and MUST be valid at the top level and inside a threshold. It MUST
style the bar's fill and no other column: `style` MUST still cover the whole instrument, `fill` MUST
override the `style` keys it names on the fill, and it MUST never reach the track. It MUST be
checked as a `style` is. Source: `owner-rulings.md`, 2026-11-25 (the `fill` rulings).

#### Scenario: A top-level fill before any threshold

- **WHEN** an instrument's settings give `"fill": {"fg": "muted"}` and no threshold applies
- **THEN** the bar's filled portion is muted, and the instrument's label keeps the `style`

#### Scenario: Style still covers the whole instrument

- **WHEN** an instrument's settings give a `style` and no `fill`, its bar reads below 70 or its
  `thresholds` is `[]`, and a bar renders within it
- **THEN** the filled portion and the label take that style, and the unfilled track takes it plus
  `dim`, because no threshold changes it

#### Scenario: A fill no style allows

- **WHEN** `fill` carries a key `style` does not have, or a colour or attribute `style` refuses
- **THEN** the settings are rejected as they are for such a `style`, and the warning names the
  instrument and `fill`, and, for a `fill` inside a threshold, that threshold's position

#### Scenario: A fill inside a threshold

- **WHEN** a threshold reached sets `"fill": {"fg": "accent"}` and the top-level `style` is bold
- **THEN** the filled portion is `accent` and bold, and the rest of the instrument is bold

### Requirement: Each honoured state is bound as an instrument is

Each honoured state MUST be bound once, when the instrument is bound, as a whole instrument is: its
own segments, from its format, else the top level's, else the declaration's default; its own label
and gap; its own composed choice and kind formats; its own `fills`; and its effective style and fill.
An instrument MUST hold at most five bound states. Source: `owner-rulings.md`, 2026-11-25 (a state is
anything in the settings); ADR 0020.

#### Scenario: A threshold that drops the label

- **WHEN** a threshold reached sets `"label": ""`
- **THEN** from that percentage on the instrument renders its text with no label and no gap

#### Scenario: A threshold that adds a bar after a label

- **WHEN** a threshold's format places `$bar` after a label, and that threshold's state is in force
- **THEN** the label has one gap before the bar's text, and the instrument fills from that percentage

#### Scenario: A threshold whose format drops the composed variable

- **WHEN** a threshold's format leaves the composed variable out, and that threshold's state is in
  force
- **THEN** its set's `select` never runs, as ADR 0020 says for a variable the format leaves out

### Requirement: Only the four lowest thresholds are honoured

The settings MUST be read in one order: check every entry; warn when more than four were written;
drop each entry above 100; sort ascending; keep the four lowest. Only those four MAY decide the
state, and an ignored entry MUST play no part when the instrument renders. Source:
`owner-rulings.md`, 2026-11-25 ("4 is the max"); `council.md`, the over-four row.

#### Scenario: A fifth threshold

- **WHEN** an instrument's settings carry thresholds at 10, 20, 30, 40 and 50, and its bar reads 55
- **THEN** the state at 40 applies, the one at 50 never does, and one warning names the instrument and
  says more than four were written

#### Scenario: The four lowest apply

- **WHEN** an instrument's settings carry five thresholds and the four lowest `activeAt` values are
  10, 20, 30 and 40
- **THEN** those four decide the state, and the fifth never does

#### Scenario: A malformed fifth threshold

- **WHEN** the fifth entry's `activeAt` is a string or a decimal
- **THEN** the settings are rejected, because every entry is checked before the four are honoured

#### Scenario: Four with one above 100

- **WHEN** an instrument's settings carry thresholds at 10, 20, 30, 40 and 101
- **THEN** the settings load with one warning, and 10 to 40 decide the state, because the written
  count was five

#### Scenario: Three with two above 100

- **WHEN** an instrument's settings carry thresholds at 10, 20, 30, 101 and 102
- **THEN** the settings load with one warning, and 10, 20 and 30 decide the state

#### Scenario: The boundaries

- **WHEN** an instrument's settings carry thresholds at exactly 0 and exactly 100
- **THEN** both load, apply at their own percentages, and raise no warning

### Requirement: The over-four warning is composed once and reported once

More than four thresholds MUST be reported once per instrument per session, as one sentence naming
the instrument, saying more than the maximum were defined, and saying entries past the four lowest
are ignored. Neither a rejected document nor a refused provided instrument MUST report such a
warning, and the sentence MUST be the same whichever side of the document's read the registration
happens. Source: `council.md`, the warning-path row; `owner-rulings.md`, 2026-11-25.

#### Scenario: A rejected document stays silent

- **WHEN** a document gives one of Jefferson's own instruments five well-formed thresholds, and a row
  the configuration read rejects
- **THEN** the document is rejected, and no over-four warning is reported beside the rejection

#### Scenario: A refused provided instrument says nothing of the count

- **WHEN** a provided instrument, which opted in, is given five thresholds and the third sets a
  `fill` the theme does not have
- **THEN** only the refusal is reported, naming the instrument, `fill` and position 3, and no
  over-four warning is reported

#### Scenario: A provider that registers after the read

- **WHEN** a provided instrument's settings carry five thresholds and its provider registers after
  the document is read
- **THEN** one sentence names the instrument, exactly as when it registers before the read

### Requirement: A malformed threshold rejects the settings

`activeAt` MUST be judged on the parsed number: it MUST be a number, a whole one, and at or above 0.
A missing or non-numeric `activeAt`, a decimal, a negative one, or two thresholds at one number MUST
reject the settings: the whole document for Jefferson's own instrument, that instrument alone for a
provider's. `-0` MUST be the threshold at 0, and a whole number above 100 MUST load and raise no
warning. Source: `owner-rulings.md`, 2026-11-25 ("int only").

#### Scenario: A threshold that is no whole number

- **WHEN** one of Jefferson's own instruments is given a threshold whose `activeAt` is `-5`, `70.5`,
  `"70"` or absent
- **THEN** the document is rejected, the default row renders, and the warning names the instrument
  and the threshold by its position in the list

#### Scenario: A number JSON writes another way

- **WHEN** an entry writes `activeAt` as `70.0` or `7e1`
- **THEN** each is the threshold at 70, because the parsed number is judged and not its spelling

#### Scenario: A number that parses to no whole number

- **WHEN** an entry writes `activeAt` as `1e400`
- **THEN** the settings are rejected, because the parsed number is not a whole one

#### Scenario: Two thresholds at one number

- **WHEN** a document gives an instrument two thresholds whose `activeAt` is 70
- **THEN** the document is rejected, and the warning names the instrument and the repeated number

#### Scenario: Two thresholds at one number above 100

- **WHEN** the settings carry two thresholds whose `activeAt` is 110
- **THEN** the settings are rejected, because the duplicate rule holds whatever the number, and the
  warning names the instrument and the repeated number

#### Scenario: A negative zero

- **WHEN** one threshold's `activeAt` is `-0` and another's is 0
- **THEN** the settings are rejected as a duplicate, because `-0` is the threshold at 0

#### Scenario: A percentage above 100

- **WHEN** an instrument's settings carry a threshold whose `activeAt` is 101 beside one at 50
- **THEN** the settings are accepted, the threshold at 50 decides, and the one above 100 never applies
  and raises no warning

#### Scenario: A provider's malformed threshold

- **WHEN** the `instruments` block gives a provided instrument a threshold whose `activeAt` is a
  decimal
- **THEN** only that instrument is refused, a warning names it and the threshold, and every other
  entry renders as configured

### Requirement: Every value inside a threshold is checked as a top-level value is

Every value inside every threshold written, honoured or not, MUST be checked exactly as the same value
at the top level is, and a `thresholds` value that is not a list, or an entry that is not an object,
MUST be a fault of its own. Each fault MUST reject the whole document for Jefferson's own instrument
and only that instrument for a provider's. Source: `owner-rulings.md`, 2026-11-25 ("The meanings need to stay the same");
`council.md`, the malformed-input row.

#### Scenario: A fault in a threshold above 100

- **WHEN** thresholds are written at 10, 20, 30, 40 and 101, and the one at 101 carries a `fill`
  colour the theme does not have
- **THEN** the settings are rejected as this requirement says, and the warning names the instrument,
  `fill` and position 5

#### Scenario: A fault past the fourth

- **WHEN** thresholds are written at 10, 20, 30, 40 and 50, and the one at 50 carries a format that
  does not parse
- **THEN** the settings are rejected as this requirement says, and the warning names the instrument,
  the format and position 5

#### Scenario: A position counted before the sort

- **WHEN** thresholds are written at 90 and then 10, and the one at 10 carries a format that does not
  parse
- **THEN** the warning names position 2, the place it was written, though that threshold sorts first

#### Scenario: A thresholds value that is not a list

- **WHEN** the `instruments` block gives an instrument `"thresholds"` as `{}`, `null` or `70`
- **THEN** the settings are rejected and the warning names the instrument and `thresholds`

#### Scenario: An entry that is not an object

- **WHEN** a threshold entry is `70` rather than an object carrying `activeAt`
- **THEN** the settings are rejected, and the warning names the instrument and the entry's position

#### Scenario: A format inside an entry that does not parse

- **WHEN** a threshold's format names a variable the declaration does not carry, or writes a
  modifier where none may go
- **THEN** the settings are rejected, and the warning names the instrument, the format and the
  position

#### Scenario: A provider's faulty entry

- **WHEN** the `instruments` block gives a provided instrument a threshold whose format does not
  parse, beside a sibling entry under another name
- **THEN** only that instrument is refused, the warning names it and the position, and the sibling
  entry renders as configured

### Requirement: A threshold fault names its place

A fault inside a threshold MUST be reported naming the instrument, the option as the user wrote it,
so a `fill` fault never reads as a `style` one, and that threshold's 1-based position in the list as
written. Source: `council.md`, the refusal-kind and malformed-input rows; ADR 0015.

#### Scenario: The warning names the option as written

- **WHEN** a threshold's `fill` carries a colour the theme does not have
- **THEN** the warning names the instrument, `fill` and the threshold's position, and never the
  instrument's `style`

#### Scenario: A fault in the third entry

- **WHEN** the faulty threshold is third in the list as written
- **THEN** the warning says `3`, whether or not an entry above 100 sits before it

### Requirement: A key a threshold does not take is refused

A key a threshold's declaration does not offer it, `thresholds` itself included, MUST be refused by
the same unknown-option rule that guards the top level, so no second list of a state's options
exists. Source: `council.md`, the options-a-threshold-may-carry row; statusline, "An option the
instrument does not declare".

#### Scenario: An unknown key in an entry

- **WHEN** a threshold carries `"width": 5`
- **THEN** the settings are rejected, and the warning names the instrument and `width`

#### Scenario: A nested thresholds

- **WHEN** a threshold carries its own `thresholds` list
- **THEN** the settings are rejected, because a threshold's keys are the declaration's options
  minus `thresholds`

#### Scenario: A provider's threshold with an unknown key

- **WHEN** the `instruments` block gives a provided instrument, which opted in, a threshold carrying
  a key its declaration does not have
- **THEN** only that instrument is refused, and a sibling entry renders as configured

### Requirement: A threshold compares the bar's own reading

A threshold MUST be chosen by the reading the bar's declaration gives: a reading the host has not
reported, or has no estimate for, MUST count as 0; a negative one MUST sit below every threshold; and
it MUST NOT be compared as the rounded text `$percent` prints. Blanking MUST then be judged against
the format of the state in force. Source: `owner-rulings.md`, 2026-11-25 ("unknown is always 0");
`council.md`, the reading rows.

#### Scenario: An unknown percentage

- **WHEN** a bar's reading is unknown, because the host reports no usage, and the settings carry a
  threshold at 0
- **THEN** the threshold at 0 applies, and with no threshold at 0 the top-level settings do

#### Scenario: A reading between two printed values

- **WHEN** the bar's reading is 69.99, `$percent` prints `70.0`, and the settings carry a threshold
  at 70
- **THEN** the threshold at 70 does not apply, because the reading is compared and not the text

#### Scenario: A negative reading

- **WHEN** a provided bar reports `-1` and the settings carry a threshold at 0
- **THEN** no threshold applies, and the top-level settings do

#### Scenario: A count of zero with nothing to fill

- **WHEN** the bar's reading is null, because the host knows the window and has no estimate, and the
  settings carry a threshold at 0
- **THEN** the state at 0 applies, and the bar still draws its whole track unfilled in `dim`, because
  there is no fraction to fill

#### Scenario: A state at 0 that drops the bar

- **WHEN** the host reports no usage, the top-level format is `no estimate $bar`, and a threshold at
  0 gives `no estimate`
- **THEN** the state at 0 applies and the instrument renders `no estimate` after its label, because
  that state's format names no `$bar` and no variable. The top-level format alone renders nothing

#### Scenario: A state at 0 that names the bar

- **WHEN** the host reports no usage, the top-level format is `no estimate`, and a threshold at 0
  gives `no estimate $bar`
- **THEN** the instrument renders nothing, label included, because the state's format names `$bar`.
  The top-level format alone renders `no estimate`

### Requirement: A threshold's format decides whether the instrument fills

A declaration with `fills: true` MUST fill at every reading, because `fills` is the declaration's,
not a threshold's. Otherwise the state in force MUST decide the width: a threshold whose format adds
`$bar` MUST fill from that percentage, and one that drops it MUST end the fill. The state MUST NOT
depend on the width, and MUST be chosen once per instrument per sample, from one reading.
Source: `owner-rulings.md`, 2026-11-25; instrument-registration; `council.md`, the one-reading row.

#### Scenario: A declared fill outlasts the state

- **WHEN** a provided instrument declares `bar` and `fills: true`, its top-level format is
  `$percent $bar`, and a threshold at 90 gives `$percent`
- **THEN** it still fills at 90 and above

#### Scenario: A threshold that shows the bar

- **WHEN** an instrument's top-level format is `$percent` and a threshold at 70 gives `$percent $bar`
- **THEN** below 70 the instrument takes the width its text needs, and at 70 or above it fills the
  row's spare columns

#### Scenario: A threshold that hides the bar

- **WHEN** an instrument's top-level format is `$percent $bar` and a threshold at 90 gives `$percent`
- **THEN** below 90 the instrument fills, and at 90 or above it stops filling and the row reflows

#### Scenario: The state at two widths

- **WHEN** an instrument renders at width 0 and again at width 200 with the same reading
- **THEN** the same threshold's state is in force both times, because the state comes from the
  reading and never from the width

#### Scenario: One reading a sample

- **WHEN** one sample renders an instrument placed twice in one row and once in another, for each
  placement's `fills`, at width 0 and at its own width
- **THEN** the bar is read once, and every placement renders the state that reading chose

### Requirement: The bar is read only when its reading can change what renders

The bar's reading MUST be taken to choose a state only when the state can change what renders: when
the format in force names `$bar`, or when an honoured threshold sets an option other than `fill`. The
defaults and a user's list MUST follow that rule, so neither records who wrote the list. Source:
ADR 0020; `owner-rulings.md`, 2026-11-25 (the defaults set only the fill); `council.md`, the
when-the-bar-is-read row.

#### Scenario: A format that leaves the bar out

- **WHEN** an instrument's top-level format is `$percent` and a threshold sets a format or a label
- **THEN** the state is chosen from the bar's reading and the instrument renders, with `$bar` never
  resolved

#### Scenario: A list that changes only the fill

- **WHEN** the format names no `$bar` and every threshold the settings carry sets only a `fill`
- **THEN** the bar is never read, because no state can change what that format renders

#### Scenario: A bar never read for a format without one

- **WHEN** no thresholds are written, the format names no `$bar`, and a provided bar would throw
- **THEN** the entry renders and no fault is reported, because the bar is never read

### Requirement: A shipped declaration that can draw a bar declares the two options

A shipped declaration that carries `bar` MUST list `thresholds` and `fill` among its options, and one
that carries no `bar` MUST list neither, so a document writing either for it is refused by the
unknown-option rule. A provided declaration opts in by name instead, as its own requirement says.
Source: `owner-rulings.md`, 2026-11-25 ("any instrument that Jefferson owns that can include a bar");
statusline, "An instrument is declared once".

#### Scenario: A shipped instrument with a bar

- **WHEN** the shipped declarations are inspected
- **THEN** every declaration that carries `bar` lists `thresholds` and `fill`, and none that carries
  no `bar` lists either, the expectation derived from each declaration's own `bar`

#### Scenario: A Jefferson instrument without a bar

- **WHEN** a document gives one of Jefferson's own instruments that carries no bar a `thresholds`
  list or a `fill`
- **THEN** the document is rejected, the default row renders, and the warning names the instrument and
  the key

#### Scenario: An option a bar-capable instrument takes

- **WHEN** a document gives an instrument that carries a bar a `fill` and a `thresholds` list
- **THEN** the document is accepted and the settings apply as these requirements say

### Requirement: A registration naming an option Jefferson cannot honour is refused

A registration declaring an option Jefferson does not implement for a provided instrument, `seconds`
included, MUST be refused with a warning that says so. A registration naming `thresholds` or `fill` on
a declaration that carries no `bar` MUST be refused with a refusal of its own kind, whose warning says
the declaration named that option without a bar. Source: `council.md`, the refusal-kind row;
`owner-rulings.md`, 2026-11-25.

#### Scenario: An option named without a bar

- **WHEN** a registration declares `options: ["thresholds"]` and carries no `bar`
- **THEN** the registration is refused, one warning names the instrument and `thresholds` and says it
  was named without a bar, and a row naming the instrument renders it as an unknown name

#### Scenario: An option outside the accepted set

- **WHEN** a registration declares `seconds`
- **THEN** the registration is refused, and the warning says Jefferson does not implement that option

## MODIFIED Requirements

### Requirement: $bar takes the width the rest of the format leaves

An instrument MAY declare `$bar`. It MUST take the columns the rest of the format leaves in the
cell, MUST shrink to nothing when nothing is left, and a format MUST hold at most one width-taking
variable — a second MUST reject the document, naming it. The bar MUST be drawn from block characters
in theme colors, with no dependency the package does not already declare, and with no estimate MUST
draw its whole track unfilled in `dim`. Source: `owner-rulings.md`, 2026-11-25 (">=", `fill`).

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

- **WHEN** the fraction a bar shows reaches a threshold's percentage
- **THEN** the filled portion takes the colour the state in force gives the fill, and the empty
  portion is drawn `dim`

#### Scenario: A bar with no estimate to show

- **WHEN** the instrument holding `$bar` has a null estimate, so there is no fraction to fill
- **THEN** the bar draws its whole track unfilled in `dim`, and the cell still shows `?/<window>`

#### Scenario: No new dependency

- **WHEN** a cell renders a bar
- **THEN** it is drawn from block characters and theme colors, and the package's declared
  dependencies are unchanged

### Requirement: A provided instrument takes only the options Jefferson implements

A provided instrument takes a format, a style and a label, `formats` when it declares
`options: ["formats"]` with a `composed` format set, and `thresholds` or `fill` when its declaration
carries `bar` and names that option in `options`, each one a separate opt-in. `seconds` is not
offered. A key beyond those under its name in the `instruments` block MUST be refused as an option it
does not take. Source: `owner-rulings.md`, 2026-11-25 ("That's exactly it").

#### Scenario: An option a provided instrument does not take

- **WHEN** the `instruments` block gives a provided instrument `width`
- **THEN** only that instrument is refused: its entries render `blank`, and a warning names the
  instrument and the option

#### Scenario: A provided instrument's formats

- **WHEN** a provided instrument declares `options: ["formats"]` and a `composed` format set, and the
  `instruments` block gives it `formats: { "busy": "Working on $count" }`
- **THEN** the cell renders the selected `busy` text as the user wrote it

#### Scenario: A provided instrument's thresholds

- **WHEN** a provided instrument declares `bar` and `options: ["thresholds", "fill"]`, and the
  `instruments` block gives it a threshold at 50 setting a fill
- **THEN** from 50 that fill colours the bar, and the rest of the threshold rules hold as they do for
  Jefferson's own instrument

#### Scenario: A provider that names thresholds alone

- **WHEN** a provided instrument declares `bar` and `options: ["thresholds"]`, and the block gives it
  a threshold at 50 setting a label
- **THEN** that label applies from 50, and no default colour reaches the fill at any reading, because
  a configured list replaces the defaults whole whether or not the provider names `fill`; the fill
  takes only what the state's effective `style` gives it

#### Scenario: A provider that names fill alone

- **WHEN** a provided instrument declares `bar` and `options: ["fill"]`, and the block gives it
  `"fill": {"fg": "muted"}`
- **THEN** the fill is muted below every threshold, and the defaults colour it from 70

#### Scenario: A provider that names neither

- **WHEN** a provided instrument declares `bar` and no `options`, and the `instruments` block gives
  it a `fill`
- **THEN** only that instrument is refused: its entries render `blank`, one warning names the
  instrument and `fill`, and every other entry renders as configured

#### Scenario: A provided instrument without a bar

- **WHEN** the `instruments` block gives a provided instrument that carries no bar a `thresholds`
  list, beside a sibling entry
- **THEN** only that instrument is refused, its entries render `blank`, one warning names it and
  `thresholds`, and the sibling entry renders as configured

### Requirement: A provided instrument's settings are checked once both are in hand

Jefferson MUST check everything under a provided name's key in the `instruments` block — shape,
format, label, option, formats, variable, modifier, style, fill and thresholds — once both the
document and that registration are in hand, whichever comes second, whether or not a row places the
name. A fault MUST refuse that instrument alone: its entries render `blank`, a warning names it and
the fault, and the rest of the document renders as configured. Source: `council.md`, the check-list
row.

#### Scenario: A variable the registration does not declare

- **WHEN** the `instruments` block gives a provided instrument a format naming a variable its
  registration does not carry
- **THEN** only that instrument is refused: its entries render `blank`, a warning names the instrument
  and the variable, and every other entry renders as configured

#### Scenario: A value that is not an object

- **WHEN** the `instruments` block gives a provided name a value that is not an object
- **THEN** only that instrument is refused, and the rest of the document renders as configured

#### Scenario: A name only the block configures

- **WHEN** the `instruments` block configures a provided name no row places, and its provider registers
  after the document is read
- **THEN** its settings are checked when it registers, and a fault refuses only that instrument

#### Scenario: A formats kind the instrument does not carry

- **WHEN** the `instruments` block gives a provided instrument a `formats` kind its registration does
  not carry
- **THEN** only that instrument is refused, its entries render `blank`, and the warning names the
  instrument and the kind

#### Scenario: A provider that registered before the document was read

- **WHEN** the provider's `session_start` handler runs before Jefferson's, so its registration is in
  hand before the document is read
- **THEN** the same rule applies: a fault refuses only that instrument

#### Scenario: A threshold fault under a provided name

- **WHEN** the `instruments` block gives a provided instrument, which opted in, a threshold whose
  `activeAt` is a decimal
- **THEN** only that instrument is refused, and the warning names it, `thresholds` and the position

### Requirement: Only a variable the format names can blank an instrument

An instrument MUST resolve only the variables its format names: a declared variable the format leaves
out MUST NOT be resolved and MUST have no effect. A named variable that is unknown, `$bar` included,
MUST render the instrument as nothing, label included, so a format that names no variable is never
blanked. Jefferson's own instruments and provided ones MUST follow the same rule. Source:
`owner-rulings.md`, 2026-11-16 and 2026-11-25; `council.md`.

#### Scenario: A variable the format leaves out

- **WHEN** taiknr declares `$saved` and `$stubs`, the format is `$saved`, `saved` is reported and
  `stubs` is not
- **THEN** the instrument renders its label and the saved value, and `$stubs` is never resolved

#### Scenario: A named variable that is unknown

- **WHEN** `model`'s default format binds and the store reads the provider as unknown
- **THEN** the cell renders nothing, label included

#### Scenario: A format that names no variable

- **WHEN** `thinking` is configured with the label `🤔` and the format `""`, and the level is unknown
- **THEN** the cell renders `🤔`

#### Scenario: A composed variable the format leaves out

- **WHEN** taiknr declares `$saved` and a composed `$state`, the format is `$saved`, `saved` is reported, and the composed set's `select` has no answer
- **THEN** the instrument renders the saved value, because a composed variable with nothing to compose blanks only a format that names it

#### Scenario: A named bar with no usage

- **WHEN** the format in force names `$bar` and the instrument's bar value is unknown
- **THEN** the instrument renders nothing, label included, as it does today
