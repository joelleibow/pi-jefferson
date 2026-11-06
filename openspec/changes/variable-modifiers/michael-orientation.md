# Michael — orientation consult (not a gate)

Retained run `bd6f92cf-e8f1-449e-b8e5-b7d3ceba208c`, 2026-11-06. Written before research landed and before Joel's later rulings (plain-text modifiers, lodash, first-letter capitalize). A consult records no verdict. Item 6's clause "add no new dependencies" is not Joel's quoted wording and is superseded by his 2026-11-06 lodash ruling.

## Answer

Orientation only. Nothing here is a design or a verdict. These are the decisions already in play for `|name` modifiers, with where each was made.

**Joel's rulings for this change** (`openspec/changes/variable-modifiers/owner-rulings.md`, 2026-11-06)
1. The change is string mutation of variable values. Its motivating case is capitalizing the thinking instrument's `$level`.
2. A modifier is written `|name` directly after a variable. Each of the six ThemeStyle attributes (`bold`, `dim`, `italic`, `underline`, `inverse`, `strikethrough`) is a modifier, and modifiers chain.

**Rulings this change inherits** (`archive/2026-11-05-configurable-instruments/owner-rulings.md`; the change's own file re-quotes two of them)
3. "Don't discourage folks from experimenting but also don't break the concepts the package aims to provide." The one-line guarantee belongs to the cell (statusline spec, "A row is one line tall"), not to format validation.
4. Names live in one place. Each instrument declares its name, variables, defaults and options once, and configuration, validation and rendering all read that declaration (statusline spec, "An instrument is declared once"). By the same logic, the modifier names need one home that the parser, the validator and the renderer all read.
5. Instruments get two options, `format` and `style`. `format` is plain text plus `$variables`. Instruments hand out values already formatted, so the format language never formats numbers. `style` is pi's ThemeStyle.
6. "Don't invent what we don't have to." Use pi and pi-tui names, and add no new dependencies. The living spec puts it as "The extension MUST NOT add style vocabulary of its own" (statusline spec, "An instrument's style is pi's ThemeStyle"). So the six style modifiers must be spelled exactly as ThemeStyle spells them and be applied through `theme.style()`.
7. No Markdown and no Starship group syntax. Brackets stay literal text.
8. `$bar` takes the width the rest of the format leaves, and a format may hold at most one width-taking variable.
9. Proof: Joel watches the footer live in his own pi session. One run is a sample, never proof.

**Living specs and standing records**
10. The statusline spec's "An instrument's format is plain text and variables" says the format language MUST NOT format a number, apply a style, or parse Markdown, and that `$` is the only special character (escaped as `\$`). That clause came from rulings 5 and 7. This change revises it: a style modifier applies a style inside a format, and `|` becomes special. The change has to say so and amend the requirement, and an ADR should record the reason, because AGENTS.md says to retire a rule "in an ADR rather than deleting it."
11. The same requirement says an unknown `$name` rejects the document and the warning names both the instrument and the variable. By the same convention, an unknown modifier should reject and name the instrument and the modifier.
12. The statusline spec's "An instrument's style is validated when its document is read" checks styles at read time, against the live theme. Modifiers should be checked at read time too, in `parseFormat`, not at render time.
13. `$bar` (statusline spec, and `format.ts:resolveFormat`) measures what the rest of the format leaves using `visibleWidth` of the resolved pieces. Any string mutation must therefore happen before that measurement.
14. The control-character collapse lives in `format.ts:collapse`, and the store's values arrive unknown or already formatted ("An instrument resolves a cell's text by reading the store"). Mutation runs on those values. It must not reach into the store, and a variable that resolves to unknown must still make the cell render nothing.
15. Two traps: put a reset before any pad (ARCHITECTURE.md, AGENTS.md), and measure columns, never characters. Per-segment styling already exists (`styledPiece` in `format.ts`), so styling one variable fits the current mechanism. Changing case can change the width of the text (`ß` becomes `SS`), so the width trap applies.
16. Layering (ADR 0001, extension-source-layout spec): imports run one way and none cycle. The format language's home is `format.ts` (ARCHITECTURE.md). Any new module must be named for what it owns, never `utils` or `helpers`.
17. Erasable TypeScript only, no build step, and tests live under `tests/` (AGENTS.md, extension-source-layout).

**The decision most likely to constrain the design** is the format-language requirement in item 10. The change either revises it explicitly or contradicts it silently.

**What needs Joel's ruling before design (owner = joel)**
- (a) Which string mutations ship, and what "capitalized" means: `High` (first letter) or `HIGH` (whole value)? Is there an `upper`, `lower` or `capitalize` set, and what are the names? The ruling names the objective but not the vocabulary.
- (b) Does a `|` straight after a variable, which renders literally today (variable names match `[A-Za-z0-9_]+`), now always start a modifier? If so, is `\|` the escape, and do existing documents whose text looks like `$level|...` break?
- (c) Do the style modifiers only add to the instrument's `style`, or can they turn an attribute off? Can they apply to `$bar`?

## Decided by

The statusline spec's "An instrument's format is plain text and variables" (from Joel's 2026-11-05 rulings in configurable-instruments: format is plain text with `$variables`, no Markdown, no group syntax). It says the format language MUST NOT apply a style and that `$` is its only special character. Joel's 2026-11-06 modifier ruling revises it, and the design must name that revision, amend the requirement and record the reason.

## Owner

joel

## Follow-up

Strongest challenge: style modifiers give styling a second home. Until now styling lived in one place, the instrument's `style` (ThemeStyle, checked against the live theme). Modifiers add per-variable styling inside `format`, but only for the six boolean attributes: `fg` and `bg` cannot be modifiers, and a modifier has no way to turn an attribute off. Before design, Joel should confirm three things. First, that modifiers only add to the instrument's `style`, so a `|bold` over `style: {bold: false}` renders bold. Second, that leaving out colors (`|accent`) is deliberate and not an oversight. Third, which string mutations ship and what they are called. Otherwise the design will invent the rules for how the two styling sources combine, which 'don't invent' forbids.
