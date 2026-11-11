## ADDED Requirements

### Requirement: The store holds the notice a notice instrument shows

The store MUST hold the notice the extension shows, its kind and the values its format's variables
show, and MUST read it as unknown, not as an empty string, while no notice is showing. A notice MUST
arrive from a host event the feed subscribes to, never from a read the store makes on its own.

#### Scenario: A notice arrives

- **WHEN** the host reports an event that carries a notice
- **THEN** the store holds that notice's kind and values before the next render, and the notice
  instrument reads them from the store alone

#### Scenario: No notice is showing

- **WHEN** no notice has arrived, or the last one's visible time is over
- **THEN** the store reads the notice as unknown, distinguishable from an empty notice

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

The store MUST hold one notice at a time. A notice that arrives while another shows MUST replace it,
MUST take its whole visible time from its own arrival, and MUST leave no pending expiry from the
notice it replaced. When one `message_end` carries a dropped-thinking notice and a cache miss, the
cache miss MUST be the one that stays and the dropped-thinking notice is lost.

#### Scenario: A newer notice replaces the shown one

- **WHEN** a second notice arrives while a first is showing
- **THEN** the store holds the second, and the first's expiry has been cleared

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
again. The notice MUST carry that count.

#### Scenario: The count rises

- **WHEN** a message drops two thinking blocks and the previous assistant message dropped none
- **THEN** the store holds a dropped-thinking notice for two blocks

#### Scenario: The count repeats

- **WHEN** a message drops the same count as the previous assistant message
- **THEN** the store holds no dropped-thinking notice

### Requirement: The notice's subscriptions and its timer exist only for a placed cell

The feed MUST subscribe to the notice events, and the store MUST hold a notice's expiry, only while the
rows the root installs place a `notice` cell in some row. With no `notice` cell in any row the
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
- **THEN** the store expires that notice after the declared number of seconds

#### Scenario: No visible time configured

- **WHEN** the document declares no `seconds` and a notice arrives
- **THEN** the store expires that notice after the declared default

### Requirement: A notice expires on a clock the composition root supplies

The store MUST drop a notice when its visible time is over, measured on a clock the composition root
supplies, and the data home MUST NOT reach for one itself. The expiry MUST be a scheduled change to
state the store holds, not a poll: one repaint requested, nothing asked of the host, and no freshness
claimed for any datum.

#### Scenario: The visible time is over

- **WHEN** a notice's visible time has elapsed
- **THEN** the store reads the notice as unknown and requests one repaint

#### Scenario: Nothing is asked of the host

- **WHEN** the store expires a notice
- **THEN** it reads nothing from the host to do it, and the repaint it requests makes no datum
  fresher than the host delivered

#### Scenario: No notice, no timer

- **WHEN** no notice is showing
- **THEN** the store holds no pending expiry timer

### Requirement: A pending expiry is cleared with the release

The store MUST hold no pending expiry after the footer is disposed, and the extension MUST run that
same release when the session shuts down, because the host does not dispose the footer on every
reload. After the release no expiry MUST request a repaint or touch a context the host has
invalidated.

#### Scenario: The footer is disposed mid-notice

- **WHEN** the host disposes the footer while a notice is showing
- **THEN** no expiry timer survives and no repaint follows

#### Scenario: A shutdown that disposes no footer

- **WHEN** the session shuts down without the host clearing the footer, as `ctx.reload()` does
- **THEN** the release runs then, so no expiry fires into the invalidated session
