# 11. The store keeps time on an injected clock, and one repaint expires a notice

Date: 2026-11-10
Status: Accepted. Revises a Non-Goal of the `instruments-for-every-datum` change, which forbade a
repaint the extension requests on a timer and which never reached a spec. The living specs' rule
against polling stays in force, and this record says what a poll is. Narrowed by
[ADR 0013](0013-a-visual-shows-and-hides-a-datum-on-the-clock.md): the hiding moved to the timed
visual; the store stamps the instant and requests the repaint.

## Context

Joel's 2026-11-10 ruling puts pi's transcript notices in the footer and gives each one a visible time:
*"Have them flash on for a configurable amount of time and then fade out or disappear?"* A notice that
stays until the next host render is not that.

Until now the store held nothing the extension itself aged. Every value came from a push, from a seed
at session start, or from a host read at sample time. A notice's end is different: it is decided by a
clock, and it has to make the footer draw with no host event behind it.

The repaint rule is what makes this necessary rather than convenient. The session-data-store spec
requires the store to ask for a repaint when a displayed datum changes, and it forbids relying on the
host repainting for its own reasons. So the store cannot leave an expired notice for a quiet footer to
notice eventually. Something has to wake it.

Three constraints shape it. `data/` names no process API, because the composition root is the
one file that does, and time is such an API. Time has to be testable without a real timer, since every
boundary of a visible time is a case a test has to straddle. And the store must ask the host nothing
to expire a notice it already holds, because the living specs forbid polling — asking the host again
whether something changed — while a deadline known at arrival is not a question at all.

Alternatives weighed and not taken:

- **The store calling a timer global itself.** It names a process API in `data/`, and no test can move
  time under it.
- **An interval that ticks and compares.** It repaints on a cadence for a possibly invisible datum,
  and it is a poll wearing a different name.
- **Dropping the notice at sample time with no timer.** A footer with nothing else moving keeps a
  notice past its time, which is the case the repaint rule exists to forbid.
- **A wall clock.** A wall clock steps under a sleep or a network time correction, so a visible time
  could shorten or stretch with nothing deciding it. A monotonic clock cannot, and both are read at
  the same cost.

## Decision

The composition root supplies the store two readers beside its others: a clock, `now() => number`, and
a scheduler, `(callback, delayMs) => cancel`. It passes a monotonic clock and a closure over the
host's timer functions. `data/` names neither.

**One decides, the other asks for the repaint.** The clock decides everything and the scheduler only
asks for a repaint. The store converts a visible time from seconds in one place, records the deadline
when the notice arrives, and drops the notice when a read begins at or past it. That is why the expiry is
testable without timers: a fake clock drives every boundary, and a deadline passed in silence still
ends the notice at the next read.

**A timer cannot extend or shorten a visible time.** The store asks for one callback per notice, for
the time left. If it fires early, the store re-arms for the time left and requests nothing; at or past
the deadline it requests the one repaint. A repeated or late fire finds the clock past the deadline
and decides nothing new.

**The handle lives with the notice.** A newer notice replaces the shown one and cancels its handle, so
each notice takes its whole visible time from its own arrival. The feed's one release cancels the
handle and disposes the store, and the composition root runs that release on a session shutdown,
because a reload shuts the session down without clearing the footer. A pending callback after that
would repaint a context the host has invalidated.

**A placed cell pays for it, and nothing else does.** The store is given a visible time only when the
rows about to be installed place a `notice` cell. With no such row it holds no notice and no timer,
takes no notice subscription, and scans no entries for one.

## Consequences

- The footer can now request a paint with no host event behind it. That repaint's sample reads context
  usage and statuses exactly as any render does and claims no freshness beyond "as of this render", so
  no datum becomes fresher than the host delivered.
- The store holds one value it ages itself, so "as of that render" now means the clock was consulted
  as well as the host. A read is still synchronous and total, and the expiry asks the host nothing.
- A test drives every boundary with a fake clock and a recording scheduler, including an early fire, a
  repeated fire, and a read past the deadline that no timer announced.
- The visible time's choice is the document's, and it reaches the store from the composition root.
  Nothing in `data/` reads configuration.
- Reversing this means a notice stays until the host renders for its own reasons or a poll is
  reintroduced, and the specs refuse both.
