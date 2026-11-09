## ADDED Requirements

### Requirement: A shipped instrument's default label renders as a configured label does

A shipped instrument that declares a default label MUST render it as literal text in front of its default format, with the one gap. A configured `label` MUST replace the default, and a configured `""` MUST remove it with no gap. The default label MUST NOT render when the store reads a datum the instrument declares as unknown. `blank` MUST declare no default label.

#### Scenario: The default label in front of the default format

- **WHEN** a shipped instrument declares a default label, nothing configures it, and its data are known
- **THEN** the cell renders the default label, one gap, then the default format's text

#### Scenario: A configured label replaces the default

- **WHEN** an instrument that declares a default label is configured with the label `Q`
- **THEN** the cell renders `Q`, one gap, then the content, and the default label's text does not render

#### Scenario: An empty label removes the default

- **WHEN** an instrument that declares a default label is configured with `label: ""` and its data are known
- **THEN** the cell renders only its content, with no default label and no leading gap

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
