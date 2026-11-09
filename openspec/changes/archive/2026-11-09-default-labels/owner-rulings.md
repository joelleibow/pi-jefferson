# Owner Rulings

Joel's rulings for this change, quoted and dated. Binding, and newer than any other artifact in this change directory.

## 2026-11-08 — What the change is

- **The objective.** With the pi-jefferson board's Todo lane in front of him, its first card being "Give every shipped instrument a default label", he said: *"lets do #1"*. **The change is a default label on every shipped instrument.**
- **The card, as he raised it.** On 2026-11-07, while the label-gap change was being designed, he asked whether that spec was the place to set a default label on every shipped instrument, with his examples "Thinking:" on thinking, "Context:" on context and "Path:" on path (recorded in the archived `2026-11-07-label-gap/owner-rulings.md`, item 18, and on the board's task note). **Those three texts are his examples. The label text for model, tokens and cost is not ruled.**
- **One card.** The queue is one change per spec. Instruments for new data, thresholds on the context instrument, composing custom instruments, renaming the `path` instrument and the OpenSpec `context:` block are separate cards.

## Earlier rulings this change inherits

- 2026-11-07: *"A user explicitly setting a label to "" is acceptable and replaces the default with nothing."* A label configured as `""` removes the default label and renders no gap (archived `2026-11-07-label-gap`).
- 2026-11-07: a label always renders with one gap before its content, and a label's and a format's outer whitespace is trimmed: *"We should be trimming labels and text. Remove spaces blased at the front or back of labels and format. They really shouldn't be needed if we have sensible defaults."*
- 2026-11-07: *"A user shouldn't have to configure any more than truly necessary."* A default that looks right beats a setting.
- 2026-11-07, on cell widths: the ideal as the default, plus an escape hatch for what a break removes.
- 2026-11-03: *"Don't invent what we don't have to."*
- 2026-11-03, the vocabulary: a row holds cells and a cell holds an instrument. *"`module` and `widget` are rejected words."*
- Breaks are cheap before 1.0: *"that's okay since we're in pre release."*
- 2026-11-06: his `~/.pi/agent/pi-jefferson.json` is his preferred setup and is never edited by a task.
