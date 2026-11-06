# Owner Rulings

Joel's rulings for this change, quoted and dated. Binding, and newer than any other artifact in this change directory.

## 2026-11-05 — Layout

- **The footer's shape.** *"the footer is a vstack of hstack components, one per configured row. Each hstack row must contain at least one cell and a maximum of seven (currently it's ten)."* He then withdrew the seven: *"I hate 7 as a maximum, fwiw. what's ideal in your opinion? we don't have to pivot from 10"*, and accepted ten on the evidence that with the remainder spread by `grow` no ceiling has a geometric advantage. **A row holds 1 to 10 cells; the default row is ten placeholder cells.**
- **Let pi-tui do the layout.** *"That lets pi-tui do its thing and we are spared anything that risks us having bugs."* Every cell gets `basis: floor(W / N)` together with `grow: 1`, so pi-tui's allocator hands the leftover columns out and the row fills the window. `grow: 1` alone is not an option: pi-tui 1.5.0's allocator computes each share from what the cells before it left, so ten cells over 80 columns come out 13,11,10,9,8,7,6,6,5,5.
- **Build the tree once.** *"build the VStack of HStacks once in createFooter, have each cell read the current sample, and let footer.render call the tree."*
- **A row is always one line.** *"Don't discourage folks from experimenting but also don't break the concepts the package aims to provide as features."* Whatever an instrument returns, the cell keeps exactly one line and clips it to its width. The guarantee belongs to the cell, not to validation of formats.

## 2026-11-05 — Instruments and their data

- **The out-of-the-box set.** model, thinking, path (basename), context, tokens, cost. *"those all should be able to come from pi, right?"* They do: `ctx.model`, `ctx.thinkingLevel` and their select events; `ctx.cwd`; `ctx.getContextUsage()`; assistant `usage` summed from `ctx.sessionManager`. **pi is the source of truth; nothing reads the terminal and nothing shells out.**
- **Git is a separate change.** *"k. I think we should take on git separately from the other instruments. get the one that pi gives us working correctly and then work on git."* pi exposes only the branch (`footerData.getGitBranch()`, `onBranchChange()`); dirty and ahead/behind counts would need git run directly. Not in this change.

## 2026-11-05 — Instrument configuration

- **Where it lives and how it applies.** *"the instrument config lives in the pi-jefferson json file we're using today. When an instrument is put into a cell in the config it's rendered as it's configured."* Each instrument is configured once by name in `pi-jefferson.json`; a cell names the instrument it holds and renders it as configured, or with its defaults.
- **Two foundational options.** *"so I think we're saying that instruments get format and style."* `format` is plain text with `$variables`; an instrument hands out its variables already formatted, as Starship's `memory_usage` offers `$ram` and `$ram_pct`, so the format language never formats numbers. `style` is pi's `ThemeStyle`: theme colors plus `bold`, `dim`, `italic`, `underline`, `inverse`, `strikethrough`. Joel's own model format: `🧠: $model from $provider`.
- **No Markdown.** *"let's forgo the markdown thing for now. it adds complexity."* pi-tui's `Markdown` wraps instead of clipping, parses block syntax, and reads Markdown inside data values.
- **A bar is a variable.** `"$bar in format be better than an optional "widget": "bar" option? $bar would let it be placed amongst prose, if desired"` — yes, and sold: *"$bar"* takes the width the rest of the format leaves in the cell, shrinks to nothing when nothing is left, and a format holds at most one width-taking variable. Drawn on the pattern of Mario Zechner's `pi-context-tree-widget` gist (`█`/`░` repeat, theme color by threshold); no npm package.
- **Names live in one place.** *"we should be certain that these names aren't hardcoded and strewn about. They need to be able to easily be added to as we move forward."* Each instrument declares its name, variables, defaults and options once; configuration, validation and rendering read that declaration.
- **Don't invent.** *"that's the goal! Don't invent what we don't have to. make it easy to do without making it crazily convoluted."* Use pi and pi-tui's own names. No new dependencies. No `widget` or `module` anywhere in specs, code or conversation (the 2026-11-03 vocabulary ruling stands).

## 2026-11-05 — Scope held out of this change

Row-level justify, gaps, proportional widths, a fourth alignment, the GitHub description drift, the parked clickable-cell idea, and the git instrument are separate changes if they ever matter.

## 2026-11-05 — Proof

Joel watches the footer work live in his own pi session. One run is a sample, never proof.
