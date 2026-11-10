## MODIFIED Requirements

### Requirement: A shipped instrument's default label renders as a configured label does

Every shipped instrument that displays a datum MUST declare a default label and render it as literal text in front of the format that binds, configured or default, with the one gap, so `format: ""` renders the label alone. It MUST NOT render when the store reads a datum the instrument declares as unknown. `blank` MUST declare no default label. A configured `label` replaces it and `""` removes it, as "An instrument's label is placed in front of its format" states.

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

#### Scenario: Every datum-showing instrument has a default label

- **WHEN** the shipped instruments are inspected
- **THEN** each one other than `blank` declares a default label, so a new instrument added for a datum arrives with one

## ADDED Requirements

### Requirement: A new instrument renders nothing over an unknown datum

An instrument added for a host datum MUST render nothing, label and gap included, when the store reads any datum it declares as unknown. It MUST NOT render a placeholder, a zero or an empty string in its place. A datum the host reports as genuinely empty is a known value and renders as the instrument's format says.

#### Scenario: A datum the store cannot supply

- **WHEN** a cell holds an instrument added for a host datum and the store reads that datum as unknown
- **THEN** the cell renders nothing, with no default label and no gap

#### Scenario: A datum that is known and empty

- **WHEN** the store holds the datum as an empty value
- **THEN** the cell renders as the instrument's format says, and is not treated as unknown
