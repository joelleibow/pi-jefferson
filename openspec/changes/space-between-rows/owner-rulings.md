# Owner Rulings

Joel's rulings for this change, quoted and dated. Binding, and newer than any other artifact in this change directory.

## 2026-11-08 — What the change is

- **The objective.** Seeing his footer after the cell-widths change (screenshot `pi-clipboard-0ef76095…png`, 2026-11-08 11:18), he asked: *"Since our PR is opened is it the right place to address the spacing between rows or do we want to merge and release this and follow up with a patch?"* He then merged that PR (*"let's merge it"*) and opened this change with *"Next card: 'Space between rows'."* **The change is the spacing between the footer's rows.**
- **One card.** *"One change per spec."* **This change is the "Space between rows" card only.** The other cards on the board (default labels, an instrument for every datum pi provides, context thresholds, composing custom instruments, the OpenSpec `context:` block) are separate changes.

- **What he wants considered.** During this change's Research, with subagents running (screenshot `pi-clipboard-2939d60c…png`): *"Something worth consideration is what is happening now in our session. Because we have active subagents there's a informative row that seems to always be added during subagents being active. It always sits above the jefferson footer."* **The row another extension places directly above the footer is in scope for this change's consideration.** (That row is pi-subagents' fleet status, set through pi's `ctx.ui.setWidget` with `belowEditor` placement: `pi-subagents/src/tui/fleet-status.js:516,638`.)

## 2026-11-08 — How the change is run

- *"Before drafting tasks, run every check a task relies on and show it go red and green."* **Every check a task in `tasks.md` relies on is run, and shown failing and then passing, before `tasks.md` is drafted.**
- *"Measure each spec requirement paragraph under 500 characters before syncing."* **Each requirement paragraph in the delta specs is measured under 500 characters before the delta is synced into `openspec/specs/`.**
- *"Joel's live observation comes before the archive, and the merge waits for his go."* **His observation in his own pi session is ticked before the change is archived, and the PR is not merged until he says go.**

## Earlier rulings this change inherits

- 2026-11-07: *"A user shouldn't have to configure any more than truly necessary."* A default that looks right beats a setting.
- 2026-11-07, on cell widths: *"The combination of 1 and 3 seems the most flexible. By default, it behaves as #1 and a config option on the row can allow for the cells to get equal distribution as we started with as the default."* The ideal as the default, plus an escape hatch for what a break removes.
- 2026-11-03: *"Don't invent what we don't have to."* And on the layout: *"That lets pi-tui do its thing and we are spared anything that risks us having bugs."*
- 2026-11-05: *"Don't discourage folks from experimenting but also don't break the concepts the package aims to provide as features."*
- 2026-11-03, the vocabulary: a row holds cells and a cell holds an instrument. *"`module` and `widget` are rejected words."*
- Breaks are cheap before 1.0: *"that's okay since we're in pre release"*, and on 0.8.0, *"It's a breaking change but we're still pre 1.0.0 so this is acceptable for the time being."*
- 2026-11-06: his `~/.pi/agent/pi-jefferson.json` is his preferred setup and is never edited by a task; a check that needs a configuration uses a scratch agent directory.
