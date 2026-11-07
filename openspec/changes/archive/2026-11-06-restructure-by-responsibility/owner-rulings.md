# Owner Rulings

Joel's rulings for this change, quoted and dated. Binding, and newer than any other artifact in this change directory.

## 2026-11-06 — What the change is

- **The objective.** Asked where to start among several things bothering him, he named the first as a restructure: *"The repo is a flat directory with everything dumped into it. There's no separation of concerns for handling the startup, loading the config, using it to setup the `setFooter` component that's returned, distinguishing data and data updates from visuals and process flow handling, etc."* **The change is a restructure of the repository by responsibility: startup, config loading, footer setup, and data and its updates kept apart from visuals and process flow.**
- **It runs first.** After the five-card queue was written to the brain, he said: *"We'll start with the restructure card once you do that."* **This change is the restructure card and only that card. The other four cards (label gap, cell grouping, instruments for every datum pi provides, thresholds on the context instrument) are separate changes.**
- **Two small fixes ride inside it.** Of the GitHub repository description still saying "modules" and the `package.json` keywords missing `pi-package`: *"Those last 2 bullets should be boyscoutted in and not something that requires a strict workflow."* **Both are made inside this change, with no workflow of their own.**

## Earlier rulings this change inherits (as quoted in the brain's pi-jefferson page)

- 2026-11-03, killing an entry-only import rule: *"That import rule is nonsense. import the files you need where you need them."* And on dependency injection: *"just good discipline is what we need right now."*
- 2026-11-03, the vocabulary (`openspec/changes/archive/2026-11-03-session-data-store/owner-rulings.md`): a row holds cells and a cell holds an instrument. *"`module` and `widget` are rejected words. They must not appear in these specs, the design, the tasks, the code identifiers, or the prose of this change."* Its scope paragraph: the ruling governs the statusline concept, what fills a cell. It does not rename the `extension-source-layout` spec's term of art, where "module" means **source file**; that spec is untouched, and where it must be referenced the prose says "source file".
- 2026-11-03, on pi-tui: *"That lets pi-tui do its thing and we are spared anything that risks us having bugs."* and *"Don't invent what we don't have to."*
