## ADDED Requirements

### Requirement: A shipped instrument's default label renders as a configured label does

A shipped instrument that declares a default label MUST render it as literal text in front of its default format, with the one gap. A configured `label` MUST replace the default, and a configured `""` MUST remove it with no gap. The default label MUST NOT render when the store reads a datum the instrument declares as unknown.

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
