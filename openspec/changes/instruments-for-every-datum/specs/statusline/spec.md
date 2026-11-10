## MODIFIED Requirements

### Requirement: The path instrument

The extension MUST implement a `path` instrument declaring the variable `$path`, the working directory the host reports, with the default label `Path:` and `$path` as its default format. `$path` declares three forms: `|base`, the basename, which a bare `$path` renders; `|absolute`, the whole directory; and `|relative`, the directory written from `~/` when it is under the home directory, absolute otherwise. It MUST read both from the store.

#### Scenario: The session's directory

- **WHEN** a cell holds `path` in a session whose working directory is `/Users/joelleibow/Projects/pi-jefferson` and nothing configures it
- **THEN** it renders `Path: pi-jefferson`

#### Scenario: The base form is the bare form

- **WHEN** `path` is configured with the format `$path|base` and no label, in the same session
- **THEN** it renders `Path: pi-jefferson`, as the bare `$path` does

#### Scenario: The absolute form

- **WHEN** `path` is configured with the format `$path|absolute` and no label, in the same session
- **THEN** it renders `Path: /Users/joelleibow/Projects/pi-jefferson`

#### Scenario: The relative form under the home directory

- **WHEN** `path` is configured with the format `$path|relative` and no label, and the home directory is `/Users/joelleibow`
- **THEN** it renders `Path: ~/Projects/pi-jefferson`

#### Scenario: The relative form at the home directory

- **WHEN** the working directory is the home directory and the format is `$path|relative`
- **THEN** the variable renders `~`

#### Scenario: The relative form outside the home directory

- **WHEN** the working directory is `/opt/work` and the format is `$path|relative`
- **THEN** the variable renders `/opt/work`, because pi's own footer keeps a path outside home absolute

#### Scenario: A directory that only shares the home directory's prefix

- **WHEN** the home directory is `/Users/joelleibow`, the working directory is `/Users/joelleibow2/app` and the format is `$path|relative`
- **THEN** the variable renders `/Users/joelleibow2/app`, because `joelleibow2` is not under `joelleibow`

#### Scenario: A home directory the store does not know

- **WHEN** the store reads the home directory as unknown and the format is `$path|relative`
- **THEN** the variable renders the absolute directory, and the cell is not empty

#### Scenario: A directory the host has not supplied

- **WHEN** the store reads the working directory as unknown, in any form
- **THEN** the cell holding `path` renders nothing

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

### Requirement: A variable can declare forms

An instrument MAY declare forms for a variable: named ways of showing one datum, one of them the default a bare variable hands out. A form MUST be written `|name` directly after its variable, before any other modifier, once. A form name after literal text, after a variable that declares no such form, after another modifier or twice MUST reject the document when it is read, naming the instrument and the modifier. A form selects a value and changes no text.

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

#### Scenario: Two forms on one variable

- **WHEN** `path` is configured with the format `$path|base|absolute`
- **THEN** the document is rejected, and the warning names `path` and `|absolute`

### Requirement: The branch instrument

The extension MUST implement a `branch` instrument declaring the variable `$branch`, the git branch the host reports, with the default label `Branch:` and `$branch` as its default format. A detached HEAD renders as the host reports it, `detached`. A directory that is not a repository is unknown, so the cell renders nothing, label included.

#### Scenario: A named branch

- **WHEN** a cell holds `branch`, nothing configures it and the store holds `main`
- **THEN** it renders `Branch: main`

#### Scenario: A detached HEAD

- **WHEN** the store holds `detached`
- **THEN** the cell renders `Branch: detached`

#### Scenario: Not a repository

- **WHEN** the host reports no branch, `null`, and a cell holds `branch`
- **THEN** the cell renders nothing, with no `Branch:` label and no gap

### Requirement: The session instrument

The extension MUST implement a `session` instrument declaring the variable `$name`, the session's name, with the default label `Session:` and `$name` as its default format. A session with no name, or whose name was cleared, is unknown, so the cell renders nothing, label included.

#### Scenario: A named session

- **WHEN** a cell holds `session`, nothing configures it and the store holds `refactor footer`
- **THEN** it renders `Session: refactor footer`

#### Scenario: An unnamed session

- **WHEN** the host reports no session name and a cell holds `session`
- **THEN** the cell renders nothing, with no `Session:` label and no gap

#### Scenario: A cleared name

- **WHEN** a session's name is cleared and the host reports it as undefined
- **THEN** the cell holding `session` renders nothing from the next render

### Requirement: The status instrument

The extension MUST implement a `status` instrument declaring the variable `$status`, the text other extensions set for the footer, with the default label `Status:` and `$status` as its default format. Statuses MUST be ordered by key, each with its whitespace and newlines collapsed to single spaces, and joined by one space. No statuses is unknown, so the cell renders nothing, label included.

#### Scenario: Several statuses

- **WHEN** the host holds the statuses `b: "idle"` and `a: "3 tasks"` and a cell holds `status`
- **THEN** it renders `Status: 3 tasks idle`

#### Scenario: A status with a newline

- **WHEN** a status's text is `building\n  3 files`
- **THEN** the cell renders `Status: building 3 files` on one line

#### Scenario: No statuses

- **WHEN** the host holds no statuses and a cell holds `status`
- **THEN** the cell renders nothing, with no `Status:` label and no gap

#### Scenario: A status that collapses to nothing

- **WHEN** the only status's text is whitespace and newlines
- **THEN** the cell renders nothing, as with no statuses

### Requirement: A new instrument renders nothing over an unknown datum

An instrument added for a host datum MUST render nothing, label and gap included, when the store reads any datum it declares as unknown. It MUST NOT render a placeholder, a zero or an empty string in its place. A host value that means "none", a null branch, an unnamed session or an empty status map, MUST reach the store as unknown.

#### Scenario: A datum the store cannot supply

- **WHEN** a cell holds an instrument added for a host datum and the store reads that datum as unknown
- **THEN** the cell renders nothing, with no default label and no gap

#### Scenario: A host value that means none

- **WHEN** the host reports a null branch, an unnamed session or an empty status map
- **THEN** the store reads that datum as unknown and not as an empty string
