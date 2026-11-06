# Council Synthesis

## Question and Scope

What is the simplest design that honors Joel's 2026-11-06 rulings (`owner-rulings.md`): a `|name` modifier after a variable or after plain text, chainable; each of the six ThemeStyle attributes is a modifier; string mutations come from lodash and none is invented; "capitalized" changes the first letter only and all-caps is a separate modifier; the implementation stays clean and simple. Evidence: `research-chidi.md`, `research-eleanor.md`, `proposal.md`, `specs/statusline/spec.md`, `michael-orientation.md`, and Michael's PL4 section. The seven open questions in the proposal were put to the council.

## Perspectives & Trade-offs

**Agreed by both advisors (`council-kimi`, `council-argon`):**

- **One modifier table in `format.ts`**, read by parsing, validation and rendering. It holds the six ThemeStyle booleans plus three lodash functions: `upperFirst`, `toUpper`, `toLower`. Never `_.capitalize` (lowercases the rest) and never `_.upperCase`/`_.lowerCase` (they split words) (`research-chidi.md` Addendum 2).
- **Style modifiers only add.** They merge into the segment's effective style, and the segment makes **one** `theme.style()` call. Nested calls break SGR 22 (`research-chidi.md` §5; proposal collision 3). No attribute off-switch, no `fg`/`bg` modifiers.
- **A modifier after `$bar` rejects at read time.**
- **Order in `resolveFormat`:** undefined check (any declared variable undefined renders `""`), then `collapse`, then string mutations in written order, then the `$bar` width measurement, then one styling call per segment. Mutating after styling would uppercase escape codes.
- **On plain text a modifier attaches to the preceding non-whitespace run** (`via|dim` styles `via`). The consequence is that a multi-word phrase needs a modifier on each word, or a grouping syntax the change does not add.
- **A modifier, not variable casing, supplies capitalization.** Variable lookup is case-sensitive and names like `$cacheRead` are already mixed case; casing-by-spelling cannot reach plain text. Joel's own example writes `$provider|capitalize` (`owner-rulings.md`), so the ruling already places the capitalizing behavior in a modifier.
- **Unknown modifier names reject at read time**, naming the instrument and the modifier.

**Disputed:**

- **A `|` that no name follows.** `council-kimi`: it is literal text, so `"$model | $provider"` keeps rendering, and `\|` writes an unambiguous literal pipe. `council-argon`: every unescaped `|` begins a modifier, and a bare or spaced pipe rejects the document, so that same format rejects until written `\|`. Both reject `$level|bd`. The difference is only a pipe followed by a space, the end of the text, or a non-name character. Both labelled their rule their own judgment, not a spec line.
- **Package.** `council-kimi` picks `lodash-es` (the package is `"type": "module"`); `council-argon` picks `lodash` plus `@types/lodash` in `devDependencies`. Not a dispute over a ruling; it is the design's. `council-argon` raised that neither package bundles `.d.ts` (`research-chidi.md` §6) so `pnpm typecheck` would need a `@types` package; `council-kimi` raised that `lodash-es` named imports resolving through pi's loader were verified from loader code comments only (`research-chidi.md` §7).

## Synthesis & Recommendation

Adopt the agreed design. One table of nine modifiers in `format.ts`; style attributes composed into one `theme.style()` call per segment; mutations run on plain text before the width is measured; read-time rejection of an unknown modifier and of any modifier on `$bar`; a literal pipe expressible as `\|`. Verify the package choice by installing and importing it from an extension file before the design commits to it (`council-kimi`'s change-my-mind condition), and declare the matching `@types` package as a dev dependency. The `capitalize` name must map to `upperFirst`, with a comment in the table naming the collision, since a later "fix" to `_.capitalize` would silently break the ruling (`council-kimi` risk).

## Accepted & Rejected Feedback

- **Accepted (both):** every item under "Agreed" above, each backed by a cited report line.
- **Accepted (`council-argon`):** declare `@types` as a `devDependency`; reject `|` on `$bar`; mutations before the width measurement.
- **Accepted (`council-kimi`):** install-and-import verification of the package; a table comment naming the `capitalize`/`upperFirst` collision; a pinned test for `ß` becoming `SS` against the `$bar` math.
- **Not decided here:** the dispute over a `|` with no name after it, which no evidence settles; it is Joel's, below.
- **Settled by a ruling and so not presented:** that capitalization is a modifier (`owner-rulings.md`, his `$provider|capitalize` example); that `capitalize` means first-letter-only; the library is lodash.

## Owner Decisions Required

1. **Names for the other string mutations.** Joel ruled `capitalize` by example and said "all-caps would be the modifier," but named neither the all-caps modifier nor a lowercase one. Council advice: `capitalize`, `upper`, `lower`, one per lodash function (`upperFirst`, `toUpper`, `toLower`).
2. **Style modifiers add only.** The six set an attribute on; there is no way to switch an instrument's attribute off; no `fg`/`bg` modifiers. Both advisors recommend it, and `michael-orientation.md` names it Joel's to rule before design.
3. **A `|` that no name follows.** Literal text (`council-kimi`) or a rejected document (`council-argon`). It decides whether `"$model | $provider"` keeps working.

---

Run ids: `council-kimi` 01731777-62cb-483e-b7b0-44ebcc56f0b5; `council-argon` 9739b74c-405a-4110-b947-7d64af6e38eb. Roster: both on fresh context, Pass 1 only; no Pass 2, because the one dispute is a product trade-off no advisor evidence settles. Confidence: high on the agreed design, per both advisors; what would change it: a failed install-and-import test for `lodash-es` (switch to CJS `lodash`), or Joel ruling off-switches, `fg`/`bg` modifiers or a different literal-pipe rule.

## Joel's rulings at the owner-decisions gate (2026-11-06)

Asked the three decisions above, he chose the council's first option on the names, the add-only style scope, and the literal reading of a bare pipe. His selections, as worded in the questions:

- **Names:** *"capitalize, upper, lower (Recommended)"* — `capitalize` (first letter only), `upper` (all-caps), `lower`, one per lodash function: `upperFirst`, `toUpper`, `toLower`.
- **Style scope:** *"Add only (Recommended)"* — the six style modifiers only turn an attribute on; there is no off-switch and there are no `fg`/`bg` modifiers.
- **A `|` that no name follows:** *"Literal text"* — a `|` begins a modifier only when a name follows it directly; `$model | $provider` keeps rendering; an unknown name after a `|` rejects the document; `\|` writes a literal pipe.
