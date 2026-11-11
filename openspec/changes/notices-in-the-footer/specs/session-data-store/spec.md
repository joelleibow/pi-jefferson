## ADDED Requirements

### Requirement: The store holds the notice a notice instrument shows

The store MUST hold the notice the extension shows, its kind and the values its text displays, and
MUST read it as unknown, not as an empty string, while no notice is showing. A notice MUST arrive
from a host event the feed subscribes to, never from a read the store makes on its own.

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

### Requirement: A cache-miss notice is the miss pi's own notice names

The store MUST hold a cache-miss notice for the turns pi's transcript notice would flag and for no
others. pi's noise floor and its display gate both apply, and the notice carries which variant it
is: a model change, an idle of at least pi's five-minute TTL, or neither, with a model change taking
precedence.

#### Scenario: A miss under the display gate

- **WHEN** a turn's miss clears pi's noise floor but not its display gate
- **THEN** the store holds no cache-miss notice for it

#### Scenario: A miss after a model switch

- **WHEN** a miss lands on the first turn after a model change
- **THEN** the notice's variant is the model change

#### Scenario: A miss after an idle

- **WHEN** a miss lands after at least pi's five-minute TTL with no model change
- **THEN** the notice's variant is the idle, in whole minutes

#### Scenario: A miss after both

- **WHEN** a miss lands after a model change and after an idle longer than pi's TTL
- **THEN** the notice's variant is the model change

#### Scenario: A turn with no miss to count

- **WHEN** a turn is the first of a session, follows a reset, or reports no cache activity in a
  session that never reported any before
- **THEN** no miss is counted for it

#### Scenario: A compaction between two turns

- **WHEN** a compaction or a branch summary sits between two turns
- **THEN** no miss is counted across it, because pi's own scan resets there

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
