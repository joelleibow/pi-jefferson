# Owner Rulings

Joel's rulings for this change, quoted and dated. They are binding and newer than every other artifact in this change directory.

## 2026-11-10: What the change is

- **The objective.** Joel had just learned what pi's `showCacheMissNotices` setting draws: one-line notices in the chat transcript for a significant cache miss, a cache warm, a compaction or branch summary's billed usage, and Anthropic thinking blocks dropped during provider recovery. He asked: *"Would it be possible to grab those, prevent them from showing in the transcript, and instead show in in the footer? Have them flash on for a configurable amount of time and then fade out or disappear?"* **The change shows those notices in Jefferson's footer instead of the transcript. A notice is visible for a configurable time and then fades out or disappears.**
- **It runs through the conductor.** *"Let's /skill:conductor-janet that thing up. I'd love to see it in action!!!"* **The change ends with his live check of it in the footer.**

His question leaves one thing open: *"fade out or disappear"* names two endings. Which one ships, or whether both do, is for the council and the design to settle, and for him at PL2 if they cannot.

## 2026-11-10: After research

Michael's orientation found that pi has no hook an extension can use to stop its own transcript notices, and that a finished cache warm fires no event an extension can hear. Joel was asked both.

- **The contract with pi's setting.** Asked whether the contract is that placing the notice instrument turns the footer version on while pi's `showCacheMissNotices` stays off, its default, he chose **"Footer on, pi setting off"**. **Jefferson never reads or writes pi's settings. A user who also turns pi's setting on sees both, and the README says so.**
- **Cache warm.** Asked whether to ship the cache-warm notice late, when the next scan finds it, or leave it out, he chose **"Leave it out"**. **The change ships cache misses, compaction and branch-summary usage, and dropped thinking blocks. Cache warm is not shown, and the README says why.**

## 2026-11-10: After the council

- **The notice text is configurable, not localized.** After the council converged on copying pi's text, Joel said: *"I'm sorry if this is scope creep. I saw the inherited tokens thought it should be said, I want to be mindful of non-English speakers. rather than provide localization I'd like the strings to be configurable. we should provide variables for the values and allow string formatting for this purpose."* **Each notice's words are a format the user can configure. The values in it (token counts, costs, the idle minutes, the number of thinking blocks and the like) are variables. The defaults read as pi's English text. Jefferson ships no translations.** This is in scope: he asked for it, and it supersedes the council's "the notice's text is pi's text" wherever the two differ.

## Earlier rulings this change inherits

- **2026-11-05, the source of truth:** *"those all should be able to come from pi, right?"* **pi is the source of truth. Nothing reads the terminal and nothing shells out.** (archive/2026-11-05-configurable-instruments/owner-rulings.md)
- **2026-11-07:** *"A user shouldn't have to configure any more than truly necessary."*
- **2026-11-03:** *"Don't invent what we don't have to."*
- **2026-11-03, vocabulary:** a row holds cells, and a cell holds an instrument. *"`module` and `widget` are rejected words."*
- **Breaks before 1.0:** cheap. *"that's okay since we're in pre release."*
- **2026-11-06:** his `~/.pi/agent/pi-jefferson.json` is his preferred setup, and no task ever edits it.
- **2026-11-08, default labels:** every shipped instrument that shows a datum has a default label, written as a word with a colon.
