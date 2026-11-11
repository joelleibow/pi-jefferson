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

### Requirement: The store holds the notice a notice instrument shows

The store MUST hold the notice the extension shows, its kind, the values its format's variables show
and the instant it shows until. It MUST read the notice as unknown, not as an empty string, before a
notice arrives and after the session is replaced. A notice MUST arrive from a host event the feed
subscribes to, never from a read the store makes on its own.

#### Scenario: A notice arrives

- **WHEN** the host reports an event that carries a notice
- **THEN** the store holds that notice's kind, values and shown-until instant before the next render,
  requests a repaint for the arrival, and the notice instrument reads them from the store alone

#### Scenario: No notice is showing

- **WHEN** no notice has arrived, or the session was replaced
- **THEN** the store reads the notice as unknown, distinguishable from an empty notice, and a notice
  whose instant has passed stays held

### Requirement: A notice comes from the event that carries its kind

The feed MUST take each notice from the host event that carries it: a cache miss and dropped
thinking blocks from `message_end`, compaction usage from `session_compact`, branch-summary usage
from `session_tree`. Each subscription MUST be released with the feed's others, and no notice MUST
come from a read the store schedules.

#### Scenario: A miss on an assistant message

- **WHEN** `message_end` reports an assistant message that paid for a cache miss
- **THEN** the notice the store holds is a cache miss

#### Scenario: A message that carries no notice

- **WHEN** `message_end` reports a user, tool-result or custom message, or an assistant message whose
  stop reason is `aborted` or `error`
- **THEN** the store takes no notice from it, as pi's own notice takes none

#### Scenario: A compaction ends

- **WHEN** `session_compact` reports a compaction entry carrying usage
- **THEN** the store holds a compaction notice carrying that usage

#### Scenario: A branch summary ends

- **WHEN** `session_tree` reports a branch-summary entry carrying usage
- **THEN** the store holds a branch-summary notice carrying that usage

#### Scenario: A cache warm completes

- **WHEN** a cache warm completes
- **THEN** the store takes no notice for it, because no extension event carries a completed warm and
  this change does not show a warm

### Requirement: One notice shows at a time and a newer replaces it

The store MUST hold one notice at a time. A notice that arrives while another is held MUST replace it,
MUST write its own shown-until instant from its own arrival, and MUST leave no pending repaint from
the notice it replaced. When one `message_end` carries a dropped-thinking notice and a cache miss, the
cache miss MUST be the one that stays and the dropped-thinking notice is lost.

#### Scenario: A newer notice replaces the shown one

- **WHEN** a second notice arrives while a first is held
- **THEN** the store holds the second with its own instant, and the first's repaint has been cancelled

#### Scenario: The newer notice runs its full time

- **WHEN** a second notice arrives 8 seconds into a first notice's 10 seconds
- **THEN** the second shows for its whole 10 seconds, counted from its own arrival

#### Scenario: One message that carries two notices

- **WHEN** one `message_end` yields a dropped-thinking notice and a cache miss
- **THEN** the store holds the cache miss, and no thinking notice shows

### Requirement: A cache-miss notice is the miss pi's own notice names

The store MUST hold a cache-miss notice for the turns pi's transcript notice would flag and for no
others. pi's noise floor, its display gate, its five-minute TTL measured from one request to the next,
its resets at a compaction and a branch summary, and its price fallback for a turn that read no cache
MUST all apply, each constant named once beside pi's file and line.

#### Scenario: A miss under the display gate

- **WHEN** a turn's miss clears pi's noise floor but not its display gate
- **THEN** the store holds no cache-miss notice for it

#### Scenario: A cache-warm entry before the turn

- **WHEN** the previous request in the session is a cache-warm usage entry
- **THEN** the miss rule measures the turn against that entry, so the turn is not read as the first of
  a session, though no warm notice shows for it

#### Scenario: A turn with no miss to count

- **WHEN** a turn is the first of a session, follows a reset, or reports no cache activity in a
  session that never reported any before
- **THEN** no miss is counted for it

#### Scenario: A compaction between two turns

- **WHEN** a compaction or a branch summary sits between two turns
- **THEN** no miss is counted across it, because pi's own scan resets there

### Requirement: A cache-miss notice carries the variant pi gives it

A cache-miss notice MUST carry the variant pi gives it: a model change, an idle of at least pi's
five-minute TTL, or neither. A model change MUST take precedence over an idle.

#### Scenario: A miss after a model switch

- **WHEN** a miss lands on the first turn after a model change
- **THEN** the notice's variant is the model change

#### Scenario: A miss after an idle

- **WHEN** a miss lands after at least pi's five-minute TTL with no model change
- **THEN** the notice's variant is the idle, in whole minutes

#### Scenario: A miss after both

- **WHEN** a miss lands after a model change and after an idle longer than pi's TTL
- **THEN** the notice's variant is the model change

### Requirement: A dropped-thinking notice shows only when its count rises

A dropped-thinking notice MUST show only when the count pi derives for the message exceeds the count on
the branch's previous assistant message, so a later turn that repeats the same count MUST NOT show it
again. The notice MUST carry that count as a bare number, and its kind MUST name the noun.

#### Scenario: The count rises

- **WHEN** a message drops two thinking blocks and the previous assistant message dropped none
- **THEN** the store holds a dropped-thinking notice for two blocks

#### Scenario: The count repeats

- **WHEN** a message drops the same count as the previous assistant message
- **THEN** the store holds no dropped-thinking notice

#### Scenario: A count of one

- **WHEN** a message drops exactly one thinking block and the branch's previous assistant message
  dropped none
- **THEN** the store holds a `thinkingOne` notice whose `$blocks` value is `1`

### Requirement: The notice's subscriptions and its timer exist only for a placed cell

The feed MUST subscribe to the notice events, and the store MUST hold a timed datum's repaint, only
while the rows the root installs place a `notice` cell in some row. With no `notice` cell in any row the
extension MUST NOT subscribe to those events, MUST NOT scan session entries for a notice, MUST NOT hold
a timer, and MUST take no visible time from the composition root.

#### Scenario: No notice cell placed

- **WHEN** no row places a `notice` cell
- **THEN** no notice event is subscribed, no session entry is scanned for a notice, and no notice
  timer is held

#### Scenario: A notice cell placed

- **WHEN** a row places a `notice` cell
- **THEN** the feed subscribes to `message_end`, `session_compact` and `session_tree` for it

#### Scenario: A document the configuration rejects

- **WHEN** the configuration rejects the document, so the default row renders
- **THEN** no row places a `notice` cell, the extension takes no visible time, and no notice event is
  subscribed

### Requirement: The store's visible time comes from the composition root

The store MUST take its visible time from the composition root, which passes the one value the
document's `notice` declaration names, or the declared default when the document names none. The data
home MUST NOT read configuration.

#### Scenario: A configured visible time

- **WHEN** the document declares `seconds` and a notice arrives
- **THEN** the store stamps that notice's instant at the clock plus the declared number of seconds,
  converting the document's seconds once

#### Scenario: No visible time configured

- **WHEN** the document declares no `seconds` and a notice arrives
- **THEN** the store stamps that notice's instant at the clock plus the declared default

### Requirement: A timed datum carries the instant it shows until

The store MUST hold a timed datum's shown-until instant, stamped once on arrival from the clock the
composition root supplies, and MUST NOT hide the datum: it holds it until a newer one replaces it or
the session is replaced. Every sample MUST carry `sampledAt`, the render's own instant, read once per
render and unknown after disposal. The data home MUST NOT reach for a clock itself.

#### Scenario: The instant passes

- **WHEN** a render's `sampledAt` is at or after a notice's shown-until instant
- **THEN** the store still holds the notice with its instant, and the timed visual is what stops
  showing it

#### Scenario: One instant per render

- **WHEN** two timed cells read the sample in one render
- **THEN** both read the same `sampledAt`

### Requirement: The store requests one repaint at a timed datum's instant

The store MUST request exactly one repaint at a timed datum's shown-until instant, re-arming for the
time left when its callback fires early, and MUST NOT poll. It asks the host nothing to do it, so the
repaint makes no datum fresher than the host delivered.

#### Scenario: One repaint at the instant

- **WHEN** the store schedules the repaint for a notice and the clock reaches its instant
- **THEN** exactly one repaint is requested

#### Scenario: An early fire

- **WHEN** the scheduled callback fires before the instant
- **THEN** the store re-arms for the time left and requests no repaint

#### Scenario: Nothing is asked of the host

- **WHEN** the store schedules or fires the repaint
- **THEN** it reads nothing from the host to do it, and the repaint makes no datum fresher than the
  host delivered

#### Scenario: No timed datum, no timer

- **WHEN** no timed datum is held
- **THEN** the store holds no pending repaint

### Requirement: A pending repaint is cleared with the release

The store MUST hold no pending repaint after the footer is disposed, and the extension MUST run that
same release when the session shuts down, because the host does not dispose the footer on every
reload. After the release no scheduled callback MUST request a repaint or touch a context the host has
invalidated.

#### Scenario: The footer is disposed mid-notice

- **WHEN** the host disposes the footer while a notice is held
- **THEN** no scheduled callback survives and no repaint follows

#### Scenario: A shutdown that disposes no footer

- **WHEN** the session shuts down without the host clearing the footer, as `ctx.reload()` does
- **THEN** the release runs then, so no callback fires into the invalidated session
