# 8. The space between rows is the stack's gap, and a zero-line Spacer carries it above row one

Date: 2026-11-08
Status: Accepted. Leaves [ADR 0002](0002-rows-span-the-full-width.md), [ADR 0006](0006-a-label-gets-one-gap-and-outer-whitespace-is-not-text.md) and [ADR 0007](0007-a-cell-takes-the-width-its-content-needs.md) in force: their "no gap" is horizontal, the `HStack`'s, and this decision is vertical.

## Context

The footer's rows sat on adjacent lines, and row one sat directly under the editor. Joel asked for
space, and ruled twice. Rows get one blank line between them by default, with a document-level key,
`rowGap`, to change it. And the footer *"always"* has a blank line above row one, whether or not
anything sits above it. He accepted the cost: a blank line under the editor in every session, and one
transcript line in fullscreen. The conductor read the two rulings together: `rowGap` sets both
places, the default is one line in each, and `rowGap: 0` renders exactly the old footer. After the
design gate Joel also bounded the value at 3, because pi-tui renders a huge one as millions of lines.

Two constraints shaped the mechanism. Joel's earlier ruling that pi-tui lays out the footer: *"That lets
pi-tui do its thing"* (2026-11-03). And *"Don't invent what we don't have to"*. A `VStack` puts its
`gap` as empty lines between its children only, so a gap alone leaves row one flush against the editor.

## Decision

`createFooter` builds `new VStack([new Spacer(0), …rowStacks], { gap: rowGap })`. The `gap` puts
`rowGap` empty lines between rows. The leading `Spacer(0)` is a child of zero lines, and because the
stack puts its gap between children, the gap lands between the `Spacer` and row one. One value governs
both places. At `rowGap` 0 the `Spacer` adds nothing, so the footer is the old one.

Do not remove the `Spacer(0)` as dead weight: without it, row one loses its space above. Do not size it
to the gap: the stack's gap already follows it.

`configuration.ts` reads and validates `rowGap` (a whole number from 0 to 3, default 1) and passes it to
the footer once, at install. Anything else refuses the document by the path every other invalid value
takes.

Alternatives weighed and not taken:

- **A `Spacer` between every pair of rows.** A second child list to keep in step with the rows.
- **Padding lines of Jefferson's own,** prepended to the footer's output. That invents what pi-tui
  already does.
- **A `blank` row.** Joel's council rejected it as the answer: it makes a row of what is not one, and
  the user would write it into every document.
- **`Spacer(gap)` as the first child.** The stack's gap also lands after it, so row one gets twice the
  space. Measured on pi-tui 1.4.0 at `rowGap` 1 and 2.
- **A `Spacer` sized to the gap inside an outer stack with `gap: 0`.** The same lines, with one more stack.

## Consequences

- **This is pi-tui's behavior, not a documented contract.** That a zero-line child still takes a gap
  was measured on pi-tui 1.4.0, the pinned devDependency, and 1.5.0's stack files are identical. The
  suite pins it at 1.4.0 only; the host runs whatever pi ships. A newer pi that changes it shows up as
  a footer that lost its top space, found by Joel's observation or a version bump. The fallback is the
  outer stack or a prepended line, one-line changes at the same site.
- Every footer line costs the fullscreen transcript one line. `rowGap: 0` gives it back.
- A short fullscreen terminal truncates the footer from the bottom, so blank lines are kept before row
  content. Not run in a live pi.
- A footer is no longer as tall as its rows. A test of a row's horizontal geometry passes `rowGap` 0.
- A misspelt `rowgap` is ignored without a warning, like every unknown key.
- A refused document, an unreadable file and an absent file all render the default row with the
  default gap, so a refused `rowGap` does not remove the space.
- The way back is `"rowGap": 0`; no data migrates.
