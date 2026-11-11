# Owner Rulings

Joel's rulings for this change, quoted and dated. They are binding and newer than every other artifact in this change directory.

## 2026-11-10: What the change is

- **The objective.** Joel had just learned what pi's `showCacheMissNotices` setting draws: one-line notices in the chat transcript for a significant cache miss, a cache warm, a compaction or branch summary's billed usage, and Anthropic thinking blocks dropped during provider recovery. He asked: *"Would it be possible to grab those, prevent them from showing in the transcript, and instead show in in the footer? Have them flash on for a configurable amount of time and then fade out or disappear?"* **The change shows those notices in Jefferson's footer instead of the transcript. A notice is visible for a configurable time and then fades out or disappears.**
- **It runs through the conductor.** *"Let's /skill:conductor-janet that thing up. I'd love to see it in action!!!"* **The change ends with his live check of it in the footer.**

His question leaves one thing open: *"fade out or disappear"* names two endings. Which one ships, or whether both do, is for the council and the design to settle, and for him at PL2 if they cannot.

## Earlier rulings this change inherits

- **2026-11-05, the source of truth:** *"those all should be able to come from pi, right?"* **pi is the source of truth. Nothing reads the terminal and nothing shells out.** (archive/2026-11-05-configurable-instruments/owner-rulings.md)
- **2026-11-07:** *"A user shouldn't have to configure any more than truly necessary."*
- **2026-11-03:** *"Don't invent what we don't have to."*
- **2026-11-03, vocabulary:** a row holds cells, and a cell holds an instrument. *"`module` and `widget` are rejected words."*
- **Breaks before 1.0:** cheap. *"that's okay since we're in pre release."*
- **2026-11-06:** his `~/.pi/agent/pi-jefferson.json` is his preferred setup, and no task ever edits it.
- **2026-11-08, default labels:** every shipped instrument that shows a datum has a default label, written as a word with a colon.
