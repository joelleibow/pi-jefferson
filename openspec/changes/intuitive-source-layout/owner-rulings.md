# Owner Rulings

Joel's rulings for this change, quoted and dated. They are binding and newer than every other artifact in this change directory.

## 2026-11-10: What the change is

- **The objective.** He said this while the instruments change was in design: *"I'm thinking about breaking down "visuals". We have many instruments, each in one file. We have things in "visuals" that are not necessarily a visual, such as width-plan, instrument-binding, and format. We also have the progress bar and I don't know where that currently is. If a human wanted to review or browse this code, it's not their yet but it's becoming unclear what is where and why it's where it is. That's one of the most important parts of project structure I like to keep. Intuitive by design, if you will."* He asked: *"is there any opportunity for a bit of refactoring and organization without changing functionality"*. **The change reorganizes the source so a person browsing it can tell what lives where and why, without changing any behavior.**
- **No behavior changes.** *"without changing functionality"*. **The footer renders the same, the configuration means the same, and the package's published surface is unchanged.**
- **It goes first, as its own change.** Told that a structural change and a behavioral one shouldn't share a spec, he said: *"Yeah. Let's do that restructure first since we're introducing potentially more things that need a logical grouping. We'll pause this instruments change for the restructure and then we'll come back to it."* **This change ships before `instruments-for-every-datum` resumes. The layout must have a place for the three instruments that change adds: `branch`, `session` and `status`.**
- **The audit.** *"I'm very curious what /ponytail-audit will result in."* **A `ponytail-audit` of the repository runs as part of this change's research. Its findings are evidence for this change. A finding that changes behavior is not in scope; it goes to the board.**

## 2026-11-10: After research

- **One file per instrument.** He had said *"We have many instruments, each in one file."* All seven share `visuals/instrument.ts`. Asked whether he wants one file per instrument, he chose **"One file per instrument"**. **Each shipped instrument gets its own file, and the paused change's `branch`, `session` and `status` arrive the same way.**
- **How he sees the code.** Asked whether `format`, `width-plan` and `instrument-binding` should move to homes named for what they are, he answered: *"My gut feel is that what we have are components and higher-order components. I think higher-order components are a bit old-hat though. Essentially we have logic that many components share, e.g. format, and logic specific to one component, row.ts, that's in things like width-plan.ts and row-renderer.ts. I don't know the appropriate way to represent something like a HOC from the olden days of React but I think that's what we're sort of doing."* **The layout separates logic many parts share (the format language) from logic that belongs to one part (the row's width plan and renderer belong to the row).** How to name and represent that split is the council's and the design's question. His frame is shared logic against part-specific logic.
- **The audit's must-fix rides along.** Asked whether the one-line fix for the release workflow should ride in this pull request, he chose **"Ride along in this PR"**. The audit found that `workflow_dispatch` can publish an unreviewed branch (`research-audit.md` finding 1). **This pull request adds `if: github.ref == 'refs/heads/main'` to the release job. It rides outside the change's scope, like the README image in the next change.**

## Earlier rulings this change inherits

- **2026-11-06, the last restructure:** *"It's nominal structure to not be overbearing but at least doesn't just dump everything into a single directory."* Files import what they need: *"That import rule is nonsense. import the files you need where you need them."* (archive/2026-11-06-restructure-by-responsibility; ADR 0005).
- **2026-11-03:** *"Don't invent what we don't have to."*
- **2026-11-03, vocabulary:** a row holds cells, and a cell holds an instrument. *"`module` and `widget` are rejected words."*
- **Breaks before 1.0 are cheap:** *"that's okay since we're in pre release."* Nothing here should need one.
- **2026-11-06:** his `~/.pi/agent/pi-jefferson.json` is his preferred setup, and no task edits it.
