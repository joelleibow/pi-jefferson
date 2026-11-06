# Owner Rulings

Joel's rulings for this change, quoted and dated. Binding, and newer than any other artifact in this change directory.

## 2026-11-06 — What the change is

- **The objective.** Asked whether the thinking instrument could capitalize `$level`: *"In the thinking instrument, is it possible to do any string modifications? I'm curious if we can make the $level capitalized."* He then named it the first feature to run through the conductor: *"let's /conductor-janet the first feature we hit. string mutation of variable values."* **The change is string mutation of variable values.**
- **Styling attributes become modifiers.** Shown the styling a cell allows today (`bold`, `dim`, `italic`, `underline`, `inverse`, `strikethrough`), he ruled: *"we're essentially going to create each of these as a `|xxx` modifier that can follow a variable. They should be chainable, as well."* **A modifier is written `|name` after a variable; each of the six attributes is one; modifiers chain.**
- **No homemade mutations.** *"please don't come up with our own string mutation methods. There's plenty of libraries out there that do that. pick the community defacto"* **String mutations come from the community's de facto library; the change does not invent its own.**
- **What "capitalized" means.** *"capitalized should mean the first letter only. all-caps would be the modifier."* **Capitalize changes the first letter only; all-caps is a separate modifier.**
- **Keep it simple.** Asked of the design, not yet answered: *"what's easier, follow the casing the user used to provide the variable or applying a modifier? let's keep our implementation clean and simple as much as possible."* **The implementation is kept clean and simple.**
- **Modifiers apply to plain text too.** *"I should add that modifiers should able to be applied to normal text, as well. e.g. "🧠 $model via|dim $provider|capitalize""* **A modifier follows literal text as well as a variable.**
- **The library is lodash.** Told the evidence pointed to lodash, he ruled: *"lodash is the way to go. It's been king for decades"* **String mutations come from lodash.** Whether the package is `lodash` or `lodash-es`, and what each modifier is called, are not part of this ruling.

## Earlier rulings this change inherits (2026-11-05, as quoted in the brain's pi-jefferson page)

- *"Don't discourage folks from experimenting but also don't break the concepts the package aims to provide as features."*
- Instrument and variable names must not be hardcoded and strewn about: *"They need to be able to easily be added to as we move forward."*
