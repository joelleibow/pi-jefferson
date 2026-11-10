# Owner Rulings

Joel's rulings for this change, quoted and dated. They are binding and newer than every other artifact in this change directory.

## 2026-11-06 — What the change is

- **The objective.** From his footer complaint of 2026-11-06: *"We aren't providing default instruments for all the data points that Pi gives us."* **The change gives every datum pi provides to an extension a shipped instrument.** He started the change on 2026-11-09: *"rather than trigger another release for just that let's roll it into the next ticket on the board in the brain. Can you please read that and then let's /skill:conductor-janet through it."* The ticket is the board card "Ship an instrument for every datum pi provides".

## 2026-11-09 — A rider on this change's pull request

- **The README shows the gallery image.** Told that pi.dev's gallery thumbnail is fixed at 13rem by pi.dev's stylesheet, and that the README is the one place the image could show at full width, he said: *"I would like it in README but rather than trigger another release for just that let's roll it into the next ticket on the board."* **This change's pull request adds the image `docs/images/jefferson-cosmic-star-dragon.png` to README.md.** It must use the image's absolute raw GitHub URL, because `docs/` is not in the package. It rides in this pull request, outside the change's scope, and Bambadjan adds it in the docs pass. Where in the README it sits is the conductor's call.

## Earlier rulings this change inherits

- **2026-11-05, git:** *"I think we should take on git separately from the other instruments. get the one that pi gives us working correctly and then work on git."* pi exposes only the branch (`footerData.getGitBranch()`, `onBranchChange()`). Dirty and ahead/behind counts would need git run directly, and they are not in this change (archive/2026-11-05-configurable-instruments/owner-rulings.md:15).
- **2026-11-05, the source of truth:** *"those all should be able to come from pi, right?"* **pi is the source of truth. Nothing reads the terminal and nothing shells out.** (same file, :14)
- **2026-11-08, default labels:** every shipped instrument that shows a datum has a default label, written as a word with a colon (`Path:`, `Context:`, `Tokens:`, `Cost:`, `Model:`, `Thinking:`), and `blank` has none (archive/2026-11-09-default-labels, council.md "Joel's rulings").
- **2026-11-06 and 2026-11-07, labels:** a label always renders in front of the format, including its default. A label gets one gap. `""` removes a label.
- **2026-11-07:** *"A user shouldn't have to configure any more than truly necessary."*
- **2026-11-03:** *"Don't invent what we don't have to."*
- **2026-11-03, vocabulary:** a row holds cells, and a cell holds an instrument. *"`module` and `widget` are rejected words."*
- **Breaks before 1.0:** cheap. *"that's okay since we're in pre release."*
- **2026-11-06:** his `~/.pi/agent/pi-jefferson.json` is his preferred setup, and no task ever edits it.
