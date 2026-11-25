# Plan context

There is no larger plan document or Linear ticket. The work is one card on the brain's pi-jefferson board.

## The card

Source: `🤖 Knowledge/projects/pi-jefferson-notes/let-users-set-thresholds-on-the-context-instrument.md` (brain vault), "Let users set thresholds on the context instrument", from 2026-11-06. Its acceptance criteria:

- "A user can set where the bar's state changes and what it changes to."
- "The format language's styles and modifiers still compose with it."
- "Tests prove a configured threshold, the unconfigured default, and a whole-document rejection for a malformed threshold."

Out of scope: "Thresholds on non-numeric data."

Prior art it names: Starship's battery `display` entries (each a `threshold` and a `style`) and Grafana's thresholds ("reflected visually when it's met or exceeded").

## Earlier changes this builds on

- `openspec/changes/archive/2026-11-25-theme-colors-as-modifiers/owner-rulings.md`: a format may name the theme's foreground colours (ADR 0021); a format colour beats an instrument's built-in colour.
- `openspec/changes/archive/2026-11-16-extensions-provide-instruments/owner-rulings.md`: other extensions provide instruments, including a bar; Joel: *"Anything a Jefferson instrument can do should be open to extension authors to do, as well."*
- `openspec/changes/archive/2026-11-10-*` (instruments for every datum) and ADR 0012: a composed format chosen by a reading.

## Neighbouring cards on the board

- "Show pi's spinner while a provider reports work" (Doing, no change yet).
- "Let users compose custom instruments from variables and visualizations" (Todo).
