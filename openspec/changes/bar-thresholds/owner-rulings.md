# Owner Rulings

Joel's rulings for this change, quoted and dated. They bind, and they are newer than every other artifact in this change directory.

## 2026-11-06: The card

*"I want to make some abilities in the context instrument that give users some configuration ability. Something like transition points or something like that. Not sure what to call it. We're doing it already with the percentages and changing colors."*

## 2026-11-25: The Explore session

He opened it with: *"There's a ticket on the board in the brain project for thresholds in the progress bar. I'd like to do a bit of /skill:conductor-janet explore that starts with a bit of discovery and research for us."*

- **Users set the percentages and the state at each.** *"To start, I'd like to give user's the option to set their threshold percentages and what their expected state for the bar is at each of those changes."*
- **State is anything in the instrument's settings.** *"State is anything that a user can change in the instrument's config. It remains configurable at specific percentage points that the user defines."*
- **A threshold changes the bar's fill, not the text, unless the user says so.** *"It should only color the bar fill. Allow text to be colored by the user if they want it colored. That's what we just merged in the previous PR."* (Refined by the `fill` ruling below: the intent is kept through a separate `fill` option.)
- **70 and 90 stay the defaults.** Asked whether an instrument with no thresholds written keeps today's rule (warning from 70, error from 90): *"Yeah. Those are sensible defaults."*
- **A user's thresholds replace the defaults.** Offered "replace" (the user's list is the whole list) or "merge" (the user's list joins the defaults): *"#1"* (replace).
- **A threshold applies at its own number.** Asked whether a threshold at 70 applies at 70 itself or only above it: *">="*. Told that today's rule is strict "above" and a test pins it: *"Oops"*, then *"That was supposed to be a `>=`"*. **The defaults follow `>=` too: today's strict "above" is a bug this change fixes.**
- **The settings shape copies the instrument's own.** *"Could we just copy that exact shape?"*, with `"context": { ..., "thresholds": [ { "activeAt": 30, ... }, ... ] }` and *"Each `...` is the shape you showed."* (the instrument's options: `format`, `label`, `style`).
- **A key means the same thing inside a threshold as outside, so the fill gets its own key.** *"We shouldn't change the meaning from outside of a threshold's definition just because it is reused inside a threshold. The meanings need to stay the same. Should we add a `fill` parameter and leave style as it is?"* Answered yes. **`style` covers the whole instrument everywhere; `fill` takes the same shape as `style` and styles the bar's fill.**
- **`fill` is also a top-level option.** Asked whether a top-level `fill` should exist, for the fill's look before any threshold is reached: *"Yes"*.
- **At most four thresholds; extras load with a warning.** *"We should constrain the number of thresholds we will allow. I'm thinking 4 is the max."* Then: *"Nothing is broken and only a warning is shown if someone defines more than 4. The warning just let's them know they defined more than the maximum and all those beyond the 4 lowest threshold numbers are ignored."*
- **Thresholds are independent.** Asked whether a threshold that leaves a key out takes it from the top level or the threshold before it: *"Thresholds shouldn't have any awareness of one another. Everything is top-level or default if the threshold state doesn't include it"*.
- **Jefferson's own instruments that can draw a bar take thresholds.** *"only those that include a bar by default. If someone sticks a bar into an instrument besides any that are context-specific then it is just the default bar."* Then: *"We have no control over taiknr's. They just tell us they have instruments and give them to us. We assume they are following the expected contracts. By default I mean any instrument that Jefferson owns that can include a bar."*
- **An extension's instrument with a bar opts in.** *"Taiknr should know they can define thresholds and accept them in their configuration if they are going to allow a bar, but that's not on us to change. They just need to know how to allow their instrument to provide the appropriate flexibility. That's all documentation with code examples, not code on our end."* Offered the opt-in through the provider contract's list of extra settings (`options`, which today allows only `"formats"`), so a provider writes `options: ["thresholds", "fill"]` and Jefferson applies the user's thresholds and fill to its bar: *"That's exactly it."* **A provider that does not opt in draws the default bar.**
- **`activeAt` is an integer.** *"int only"*.
- **Range, sorting and the first four.** *"Nothing above 100 should do anything. max 4 items, sorted by activeAt. We honor the first 4 that have activeAt below 100."* Asked whether exactly 100 counts: *"Yeah. it's not harmful by any means"*. **`activeAt` takes the integers 0 to 100; a threshold above 100 does nothing.**
- **A malformed `activeAt` rejects the settings.** Asked about a negative number, a decimal or a non-number: *"Those are actual mistakes so the rejection seems to be consistent behavior"*.
- **Two thresholds at the same `activeAt` reject the settings.** *"Yes"*.
- **An unknown percentage counts as 0.** Asked which state applies while the percentage is unknown (pi knows the window but not the usage; `$percent` shows `?`): *"unknown is always 0"*. Confirmed: a threshold at 0 applies if one is written, and otherwise the top-level settings do. `$percent` and the empty track are unchanged.
- **The bar's width stays as it is.** After comparing zentui's fixed 10-cell gauge: *"I think what we have is better but mostly just wanted to understand the tradeoffs."* (Context only; not a change request.)
