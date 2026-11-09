# 8. The space between rows is the stack's gap

Date: 2026-11-08
Status: Accepted. Leaves [ADR 0002](0002-rows-span-the-full-width.md), [ADR 0006](0006-a-label-gets-one-gap-and-outer-whitespace-is-not-text.md) and [ADR 0007](0007-a-cell-takes-the-width-its-content-needs.md) in force: their "no gap" is horizontal, the `HStack`'s, and this decision is vertical.

## Context

The footer's rows sat on adjacent lines, and row one sat directly under the editor. Joel asked for
space between the rows, with a document-level key, `rowGap`, to change it. He first ruled that the
footer also always has a blank line above row one. A zero-line `Spacer` as the stack's first child
built that: the stack puts its `gap` between children only, so the gap landed between the `Spacer` and
row one. `rowGap` governed both places.

Joel then looked at it live. Of the default: *"this is the default. It's way too much space"*. Asked
which line to remove, he asked whether the gap could be padding on the `VStack`, and then ruled: *"Can
we take out that spacer that's above our first line? This might be acceptable without that."* He kept
the verdict for the preview without the spacer. Seeing it: *"Better. It's still an awful lot of space
between rows. Maybe nothing I can really do about it though, huh?"* Offered one line between rows by
default or none, he ruled: *"This is the way. What we have now. It's visually better than them seeming
too cramped. Too spacious is better than too cramped,"*. After the design gate he also bounded the value
at 3, because pi-tui renders a huge one as millions of lines.

The constraints that held throughout: pi-tui lays out the footer (*"That lets pi-tui do its thing"*,
2026-11-03), and *"Don't invent what we don't have to"*.

## Decision

`createFooter` builds `new VStack(rowStacks, { gap: rowGap })`. The stack's `gap` is the whole
mechanism: `rowGap` empty lines between rows, none above row one, so row one sits directly under the
editor. At `rowGap` 0 the footer is the old one.

`configuration.ts` reads and validates `rowGap` (a whole number from 0 to 3, default 1) and passes it to
the footer once, at install. Anything else refuses the document by the path every other invalid value
takes.

The `Spacer(0)` was built and then removed on Joel's live observation. If someone asks why the footer
sits flush on the editor, that ruling is the answer; do not put a spacer back to add space above row one.

Alternatives weighed and not taken:

- **A zero-line `Spacer` as the first child.** Built, then removed. It gave row one a space above, which
  Joel found too much.
- **`Spacer(gap)` as the first child.** The stack's gap also lands after it, so row one gets twice the
  space. Measured on pi-tui 1.4.0 at `rowGap` 1 and 2.
- **A `Spacer` between every pair of rows.** A second child list to keep in step with the rows.
- **Padding lines of Jefferson's own,** prepended to the footer's output. That invents what pi-tui
  already does.
- **A `blank` row.** Joel's council rejected it as the answer: it makes a row of what is not one, and
  the user would write it into every document.
- **No space by default.** Joel was offered it and chose one line: too spacious beats too cramped.

## Consequences

- Every gap line costs the fullscreen transcript one line. `rowGap: 0` gives it back.
- A short fullscreen terminal truncates the footer from the bottom, so a squeezed footer keeps row one
  and the gap line and loses row two before the gap. Not run in a live pi.
- A footer is no longer as tall as its rows. A test of a row's horizontal geometry passes `rowGap` 0, so
  every line it reads is a row.
- A misspelt `rowgap` is ignored without a warning, like every unknown key.
- A refused document, an unreadable file and an absent file all render the default row with the
  default gap, so a refused `rowGap` does not remove the space.
- The way back is `"rowGap": 0`; no data migrates.
