# 13. A visual shows and hides a datum on the clock, and the store only stamps and repaints

Date: 2026-11-10
Status: Accepted. Narrows [ADR 0011](0011-the-store-keeps-time-on-an-injected-clock.md): the clock
still decides and one repaint still follows, while the hiding leaves the store for a visual. Both
records stay Accepted, and ADR 0011's body is not edited.

## Context

Joel's 2026-11-10 ruling names the timed show-and-hide as a visual of its own: *"What we're buidling is
a visual that can show and hide data on timed basis. It will be used for the cache miss instrument."*
Asked to confirm it sits under `components/visuals/` beside the bar and can be mixed into any
instrument, he said: *"Don't bake the visual into the instrument. Let's the visual be reusable, if so
desired, and be composable into an instrument."*

Before this record the store did the hiding. ADR 0011 gave it the clock and the scheduler, and the
store dropped a notice at the first read past its deadline. That put one datum's visibility inside
`data/`, where no second instrument could reach it, and it removed the datum from the state rather than
from the rendering.

## Decision

**The visual is a pure part.** `components/visuals/timed.ts` holds one function of the datum's text,
the instant it shows until, and the render's instant. It hands the text back before the instant, and
nothing at or after it, or when either instant is missing. It imports no file of this package, reads no
clock and holds no time, as the bar does.

**A declaration mixes it in.** `InstrumentDeclaration.shownUntil` is the reading that carries the
datum's instant, and a declaration carrying it is timed. Binding applies the visual to the text the
format resolved, with the render's instant. Nothing to show renders as nothing, so the cell drops its
label and its gap through the unknown rule every instrument already obeys.

**The store stamps and repaints, and never hides.** The composition root still injects the clock and the
scheduler (ADR 0011). The store writes the datum's instant once, on arrival, converting the document's
seconds in that one place. Each sample carries the render's own instant, read once, so two timed cells
in one render agree. The scheduler's callback requests one repaint at the instant, re-arming when it
fires early. The store holds the datum until a newer one replaces it or the session is replaced.

**Why the time is not a format variable.** A variable renders a piece of prose, where a hidden datum is
the whole text, label included. The duration is not a word either: it configures the instrument, and
the root hands it to the store for that datum.

## Consequences

- `components/visuals/` holds two files, and its rule covers the directory: a visual imports nothing of
  this package. Any component file and `format.ts` may import one.
- The store holds a datum past its instant, so the state says what the store holds. "As of this
  render" gains the render's instant alongside the host's delivery.
- The notice is the visual's first user and not its owner. A second timed instrument declares its own
  `shownUntil` and its own duration, with no change to the store.
- The boundary where a datum stops showing is the visual's to test, and the store's tests assert one
  repaint and a datum still held.
- Reversing this puts the hiding back in `data/`, where one datum's visibility is again beyond the next
  instrument's reach and an absent datum means two things.
