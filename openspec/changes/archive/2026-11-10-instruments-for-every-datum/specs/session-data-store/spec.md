## MODIFIED Requirements

### Requirement: The store holds the data its instruments display

The store MUST hold the data the extension's instruments display, and any datum a displayed form is derived from, as distinct datums rather than composed values. Every requirement in this spec binds only the datums the store holds: a datum enters when an instrument displays it or derives from it, and leaves when none does. A datum an instrument needs MUST be added to the store, not to the instrument.

#### Scenario: The datums the shipped instruments display

- **WHEN** the shipped instruments and the store are inspected together
- **THEN** every datum a shipped instrument displays or derives a form from is one the store holds, and the store holds no datum that none of them uses

#### Scenario: A datum an instrument displays

- **WHEN** an instrument displays a datum
- **THEN** the store holds that datum and keeps it current

#### Scenario: A datum no instrument displays

- **WHEN** the host exposes a datum that no shipped instrument displays, such as the provider count or the active tools
- **THEN** the store does not hold it, and takes no subscription for it

#### Scenario: An instrument needs a datum the store does not hold

- **WHEN** a new instrument would display a datum the store does not hold
- **THEN** that datum is added to the store, and the instrument still only reads

## ADDED Requirements

### Requirement: A new datum enters the store and the feed, never an instrument

A datum the host provides and no instrument yet displays MUST enter through the store's reading and the feed's wiring: the feed seeds it, pushes it or supplies the reader the store samples. An instrument MUST NOT read host state, subscribe to a host event or hold the datum itself. Every subscription the feed takes for it MUST be released with the others. A host value that means none, a null branch, an unnamed session or an empty status set, MUST reach the store as unknown.

#### Scenario: An instrument added for a new datum

- **WHEN** an instrument is added for a datum the store did not hold
- **THEN** the store holds the datum, the feed supplies it, and the instrument's resolver reads it from the store alone

#### Scenario: A subscription for the new datum

- **WHEN** the feed subscribes to a host event for a new datum and the footer is disposed
- **THEN** that subscription is released with the feed's others and no callback for it runs afterwards

### Requirement: The git branch is seeded once and pushed on change

The store MUST hold the git branch the host reports, read once when the footer is installed and replaced when the host announces a branch change. A read of the store MUST NOT ask the host for the branch. A `null` branch MUST be held as unknown, and `detached` as the text `detached`. A change MUST request a repaint only when the branch differs from the held one.

#### Scenario: The footer installs

- **WHEN** the footer is installed and the host reports `main`
- **THEN** the store holds `main` before the first render, and no later sample asks the host for the branch

#### Scenario: The branch changes

- **WHEN** the host announces a branch change and now reports `feature/x`
- **THEN** the store holds `feature/x` and a repaint is requested

#### Scenario: A change to the same branch

- **WHEN** the host announces a branch change and reports the branch the store already holds
- **THEN** no repaint is requested

#### Scenario: Outside a repository

- **WHEN** the host reports `null`
- **THEN** the store holds the branch as unknown

#### Scenario: The footer is disposed

- **WHEN** the footer is disposed and the host later announces a branch change
- **THEN** no callback of the store runs, and no repaint is requested

### Requirement: The session name is seeded and pushed on change

The store MUST hold the session's name, read when the session starts and replaced when the host reports `session_info_changed`, using the name that event carries. A session with no name, or an event whose name is undefined, MUST leave the datum unknown. A change MUST request a repaint only when the name differs from the held one.

#### Scenario: A session starts with a name

- **WHEN** a session starts that already has the name `refactor footer`
- **THEN** the store holds `refactor footer`

#### Scenario: The session is named

- **WHEN** the host reports `session_info_changed` with the name `docs`
- **THEN** the store holds `docs` and a repaint is requested

#### Scenario: The name is cleared

- **WHEN** the host reports `session_info_changed` with an undefined name
- **THEN** the store holds the name as unknown and a repaint is requested

#### Scenario: A session is replaced

- **WHEN** the host replaces the session with an unnamed one
- **THEN** the store does not hold the previous session's name

### Requirement: Extension statuses are read once per render sample

The store MUST read the host's extension statuses once per render sample and hold them as the host reports them, raw. An empty set MUST read as unknown. The store MUST claim no freshness beyond the last render the host requested, and MUST NOT poll.

#### Scenario: A status is set between two renders

- **WHEN** an extension sets a status and the host requests a render
- **THEN** that render's sample holds the new status

#### Scenario: Statuses cleared on a session switch

- **WHEN** the host clears every status while replacing the session
- **THEN** the next sample reads the statuses as unknown

#### Scenario: Two cells, one render

- **WHEN** two cells read the statuses in one render
- **THEN** the host is asked once and both cells read the same text

### Requirement: The home directory is held beside the working directory

The store MUST hold the home directory of the user pi runs as, read once when the session starts from the host process, and MUST NOT run a command or read the terminal to get it. When the process reports an empty string, or the lookup throws, the store MUST hold it as unknown. A consumer MUST NOT read the environment itself.

#### Scenario: The home directory is read at session start

- **WHEN** a session starts
- **THEN** the store holds the home directory the host process reports, and takes no subscription for it

#### Scenario: No home directory

- **WHEN** the host process reports an empty string as the home directory, or the lookup throws
- **THEN** the store holds it as unknown, the session still starts, and a read does not throw

### Requirement: The footer's host data is attached once and released with the feed

The footer-only host data, the branch and the extension statuses, reaches the store through one attachment the feed offers when the footer is built, because that data exists only inside the footer's construction. The attachment MUST seed the branch, subscribe to branch changes and supply the statuses reader. Its subscription MUST be released with the feed's others, and an attachment after the release MUST take none. A second attachment MUST release the first's.

#### Scenario: The footer is built

- **WHEN** the host builds the footer with its footer data
- **THEN** the store holds the branch, a branch change repaints, and the statuses are read each sample

#### Scenario: The footer is built after the release

- **WHEN** the feed was released and a footer is then built
- **THEN** no branch subscription is taken and no repaint is requested

#### Scenario: The footer is built twice

- **WHEN** the host builds the footer a second time without a release between
- **THEN** the first build's branch subscription is released and only the second's runs

#### Scenario: No footer data

- **WHEN** no footer has been built
- **THEN** the branch and the statuses read as unknown
