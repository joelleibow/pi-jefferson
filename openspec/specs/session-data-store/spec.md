# session-data-store Specification

## Purpose
One place holding the session and system data a cell can display, kept current behind the scenes
so an instrument only reads it.

## Requirements

### Requirement: The store holds the data its instruments display

The store MUST hold exactly the data the extension's instruments display, as distinct datums rather
than composed values. Every requirement in this spec binds only the datums the store holds: a datum
enters when an instrument displays it and leaves when no instrument does. A datum an instrument
needs MUST be added to the store, not to the instrument.

#### Scenario: The datums the shipped instruments display

- **WHEN** the shipped instruments and the store are inspected together
- **THEN** the store holds the active provider, model and thinking level; the working directory; the
  context usage the host reports — its token estimate, its window and its percentage; and the
  session's token totals by category with its cost total — and holds nothing else

#### Scenario: A datum an instrument displays

- **WHEN** an instrument displays a datum
- **THEN** the store holds that datum and keeps it current

#### Scenario: A datum no instrument displays

- **WHEN** the host exposes data no shipped instrument displays — the git branch, extension
  statuses, or the provider count
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
