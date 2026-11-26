# 22. A threshold applies at its own percentage, and the defaults are the owner's

Date: 2026-11-26
Status: Accepted. Retires the strict "above" boundary this repository copied from pi 1.4.0's own footer, and the parity it stood for. Amends one sentence each of [ADR 0007](0007-a-cell-takes-the-width-its-content-needs.md), [ADR 0009](0009-components-hold-the-parts-and-the-bar-stands-alone.md) and [ADR 0020](0020-only-a-variable-the-format-names-can-blank-an-instrument.md); all three stay Accepted. The rulings are Joel's of 2026-11-25, recorded in `openspec/changes/bar-thresholds/owner-rulings.md`, and the decisions they took are that change's `design.md` (DEC-2, DEC-3, DEC-10, DEC-15).

## Context

The bar's filled part turned the theme's `warning` strictly above 70 and its `error` strictly above 90. Nobody chose that boundary. It copied pi 1.4.0's own footer, and the living statusline scenario said as much, naming the host's footer as the thing it matched. Parity was the point, so the numbers were the host's and so was the comparison.

Joel ended that on 2026-11-25, in two rulings. On the boundary, asked whether a threshold at 70 applies at 70 itself: *">="*. Told that today's rule was strict and a test pinned it, he said *"Oops"*, then *"That was supposed to be a `>=`"*. On the rule itself: *"To start, I'd like to give user's the option to set their threshold percentages and what their expected state for the bar is at each of those changes."* So the boundary stops being a constant in the drawing, and both the percentages and the state at each become settings a user owns.

## Decision

- **A threshold applies at its own percentage.** `activeAt` 70 applies at 70 and above, and the strict "above" is retired.
- **The defaults are the owner's, not the host's.** A bar with no list written takes `warning` from 70 and `error` from 90, each an ordinary threshold that layers on the top-level `fill` and changes no other key. They reach every bar, Jefferson's own and every provider's, opted in or not, and they are not a copy of pi's footer. The host stops being a source for this boundary, so a later pin bump does not revive the strict rule.
- **A bar's state is a setting.** A `thresholds` list replaces the defaults whole, an empty list sets none, at most four entries decide the state, and each entry carries an integer `activeAt` and the settings that apply from it. `fill` styles the bar's filled part and nothing else.
- **The drawing makes no percentage-to-colour choice.** It draws the style and the fill it is handed, and nothing else.
- **A later change to this boundary supersedes this record** rather than quietly differing from it.

## Alternatives weighed and not taken

- **Keep the strict boundary for pi parity.** It gives up the boundary a user reads and writes down — the number the setting carries — to match a footer that has no thresholds to set, so the mismatch lands at exactly 70 where a user looks. Joel ruled it a bug.
- **Keep the constants in the drawing and let a user shift the percentages.** A state is the whole instrument's settings, so it can change a format, a label and a composed text as well as a colour, and a visual cannot bind any of those. The rule would live in the drawing while its effects lived elsewhere.
- **Join a user's list to the defaults.** Joel took replace: *"#1"*. A list that cannot turn the default colours off is a list a user cannot use to colour the bar themselves.

## Consequences

- Every bar changes colour at exactly 70 and exactly 90, a provider's included, without its author changing anything. A document that is valid today keeps its meaning at every other percentage.
- A user's top-level `fill` colour is overridden from 70 by the default. `"thresholds": []` is how they keep a colour of their own at every percentage.
- The living statusline scenario states the boundary and no longer names the host's footer as its source; the reason the host stops being one is recorded here instead.
- An extension author opts a bar-capable instrument in by name, and a bar that did not opt in still takes the defaults, because the defaults are the list in force for every bar.
- A threshold's own format can add or drop `$bar`, so the instrument's width, and with it the row's geometry, changes at that percentage.
- Reversing this means putting a fixed boundary back into the drawing and superseding this record, and every user's bar loses the setting it was given here.
