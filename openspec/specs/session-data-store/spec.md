# session-data-store Specification

## Purpose
One place holding the session and system data a cell can display, kept current behind the scenes
so an instrument only reads it.

## Requirements

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

### Requirement: A read is synchronous and total

Every read from the store MUST return synchronously. A read MUST NOT block, await, request a
repaint, or throw — including before the first value has arrived, while a session is being
replaced, and after the session that supplied the data is gone.

#### Scenario: Reading before any data arrives

- **WHEN** a read happens before the store has received any value for that datum
- **THEN** the read returns, synchronously, and does not throw

#### Scenario: Reading while the session is being replaced

- **WHEN** a read happens after the previous session was torn down and before the new one has
  supplied anything
- **THEN** the read returns, synchronously, and does not fail

#### Scenario: Reading after the footer is disposed

- **WHEN** a read happens after the store was released
- **THEN** it returns unknown, synchronously, without touching the released session

### Requirement: Unknown is a distinguished value

A datum the store has no value for MUST read as unknown, distinguishable from an empty string and
from zero. The store MUST NOT substitute an empty string, a zero, or a stale value for unknown.

#### Scenario: A datum with no value yet

- **WHEN** an instrument reads a datum the store cannot supply
- **THEN** it reads unknown, not an empty string and not zero

#### Scenario: A datum whose value is genuinely empty

- **WHEN** a datum is supplied with an empty value
- **THEN** the read yields that empty value, distinguishable from unknown

### Requirement: Freshness never exceeds the host's delivery

For every datum it holds, the store MUST state how current that value is, and MUST NOT claim
freshness greater than the host's own delivery. The model, the thinking level and the working
directory MUST be read at session start, and the model and thinking level updated from the host's
`model_select` and `thinking_level_select` pushes. The context usage MUST be read once per render
sample; the entry scan MUST be keyed on the session and leaf ids the host reports, which every
append moves.

#### Scenario: A session is restored

- **WHEN** the host restores a session and reports no model or thinking-level selection
- **THEN** the store holds the restored session's model and thinking level, because it read them at
  session start

#### Scenario: A model selection is pushed

- **WHEN** the host reports a model selection through `model_select`
- **THEN** the store holds the newly selected model from that push on, and claims nothing fresher

#### Scenario: A thinking-level selection is pushed

- **WHEN** the host reports a thinking-level selection through `thinking_level_select`
- **THEN** the store holds the newly selected thinking level from that push on, and claims nothing
  fresher

#### Scenario: A usage-derived datum at sample time

- **WHEN** a render reads the context usage, the token totals or the cost total
- **THEN** the value is the one the host exposes at the start of that render, the store claims
  nothing fresher, and a null the host reports stays unknown rather than becoming zero

#### Scenario: A context usage that changes with no append

- **WHEN** the host's context usage changes with nothing appended to the session — a model selection
  changing the window it reports
- **THEN** the next render's sample reads the changed value, because the usage is read per sample
  and not frozen between invalidations

#### Scenario: A turn boundary

- **WHEN** the host reports a turn boundary, appending the entries that boundary recorded
- **THEN** the leaf id the host reports has moved, so the next render's scan is recomputed; the
  boundary is a repaint trigger and not what makes the scan current

### Requirement: Expensive derivations are bounded and invalidated by name

A value the store derives — from its datums or a synchronous host read at sample time — MUST be
derived at most once per render, reused by every read in that render, and recomputed only on one of
the store's named invalidations, each named for its cause. The entry scan MUST be keyed on the
session and leaf ids the host reports, which every append moves, and dropped on a session
replacement; a turn boundary MUST NOT be its key, since usage, compaction and branch-summary appends
fire none.

#### Scenario: Two reads of a derived datum in one render

- **WHEN** two cells read the same derived datum during one render
- **THEN** it is derived once, and both reads return the same value

#### Scenario: A named invalidation

- **WHEN** a datum change the derivation is named after occurs
- **THEN** the derived value is recomputed on the next read, once

#### Scenario: A render with no invalidation

- **WHEN** a render happens and no named invalidation has occurred since the previous render
- **THEN** no derived value is recomputed

#### Scenario: An append no turn boundary announces

- **WHEN** the host appends a `usage`, compaction or branch-summary entry, which moves the leaf id
  it reports and fires no turn boundary
- **THEN** the next render's scan sees it, because the scan is keyed on the leaf and not on the
  boundary

#### Scenario: Two renders over one session's entries

- **WHEN** two renders read the token totals with neither the session id nor the leaf id moved
  between them
- **THEN** the host's entries are scanned once, and both renders read the same totals

### Requirement: Every read in one render observes one state

Every read the store serves during one `render(width)` MUST observe store state as of the start of
that render, and an update the store receives MUST become visible no earlier than the next render.
No cell may observe a half-applied update, and two cells reading one datum in one render MUST agree.

#### Scenario: A render begins

- **WHEN** a render starts and lays out a row's cells
- **THEN** every read in that render observes the store as of the start of that render, and an
  update that arrives afterwards becomes visible no earlier than the next render

#### Scenario: Two cells, one datum

- **WHEN** two cells in the same render read the same datum
- **THEN** they read the same value

### Requirement: Store data does not survive a session replacement

After a session replacement — new, resume, fork, or reload — the store MUST hold nothing from the
previous session, and MUST re-seed the datums it holds from the current session. A derived value
MUST be dropped with it. A read MUST NOT touch a context captured from an earlier session, which the
host invalidates when it replaces the session.

#### Scenario: A new session starts

- **WHEN** the host replaces the session and the store is read
- **THEN** nothing from the previous session is read, and no read throws

#### Scenario: Re-seeding from the new session

- **WHEN** the host starts a session after a replacement
- **THEN** the store holds that session's provider, model, thinking level and working directory,
  and the usage-derived datums of that session's entries, and none of the previous session's values

#### Scenario: A derived total from the previous session

- **WHEN** the host replaces the session and a render reads the token totals or the cost total
- **THEN** nothing the previous session's entries contributed is in them

### Requirement: A pushed change that alters displayed data results in a repaint

When a change the store receives alters a datum a cell displays, the store MUST request a repaint
itself; a repaint MUST NOT depend on the consumer noticing the change. When the change alters no
displayed datum, no repaint is requested. A change the store learns of only by reading the host — a
turn boundary that alters one of the token and cost totals — MUST likewise request a repaint, and
MUST NOT rely on the host repainting for its own reasons.

#### Scenario: A displayed datum is pushed

- **WHEN** `model_select` or `thinking_level_select` reports a value a displayed instrument shows
- **THEN** a repaint is requested without the instrument or the cell asking for one

#### Scenario: A turn boundary alters a displayed total

- **WHEN** the host reports a turn boundary and the token and cost totals differ from what the store
  last read
- **THEN** a repaint is requested without the instrument or the cell asking for one

#### Scenario: No held datum changes

- **WHEN** the store receives an update that alters no datum the store holds
- **THEN** no repaint is requested

### Requirement: Every subscription is released when the footer is disposed

The store MUST release every subscription and callback it holds when the footer is disposed, which
the host does when it replaces or clears the footer. After disposal no callback of the store may
run, and the store MUST NOT request a repaint.

#### Scenario: The footer is disposed

- **WHEN** the host disposes the footer the store belongs to
- **THEN** the store holds no subscription and requests no repaint

#### Scenario: A reload

- **WHEN** the extension reloads and the host clears the footer
- **THEN** every subscription the store took is released rather than left running

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
