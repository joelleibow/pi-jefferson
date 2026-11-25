# Eleanor codebase research: theme colours as modifiers

Scope: `/Users/joelleibow/Projects/pi-jefferson`, format implementation, instrument contracts, docs/tests, and neighbouring feature context. Read-only research; no implementation or design recommendation. Binding rulings are in `openspec/changes/theme-colors-as-modifiers/owner-rulings.md`; plan context in `plan-context.md`.

## Binding rulings and adjacent work

`owner-rulings.md` (read in full) establishes: theme-provided foreground-slot colours only become candidate colour modifiers (not background colours); existing modifier names such as `dim` retain their attribute meaning; colour composes with other modifiers; explicit format colour outranks variable built-in colour and style (`format > variableFg > style`). It says not to read theme files, but use pi's provided access.

`plan-context.md` (read in full) identifies adjacent proposed `|spinner` and user-composed instruments, plus existing forms, extension providers, and plain notice formats. These are context rather than implemented changes.

## Format language, parsing and rendering

- `extensions/jefferson/format.ts:1-32`: `FormatSegment` is literal or variable (optional `form`) with modifiers, or bar. `MODIFIERS` enumerates six style attributes (`bold`, `dim`, `italic`, `underline`, `inverse`, `strikethrough`) and three mutations (`capitalize`, `upper`, `lower`).
- `format.ts:54-145`: `parseFormat` collapses controls and trims outer whitespace, then scans text. `$name` accepts `[A-Za-z0-9_]+`, validates declaration membership and emits a variable segment; `$bar` is special and only one width-taking bar is allowed. Backslash escapes the next character, any character; terminal backslash stays literal. `|name` accepts the same name run. After a variable, one declared form is selected before modifiers; otherwise modifier table is consulted. After literal text, a modifier attaches to the final non-whitespace run, splitting preceding whitespace into an unmodified literal. Modifiers on `$bar` reject. Unknown modifier error is exactly `format names a modifier it does not implement: "|NAME"` (`:119-120`).
- Style-key validation is at `format.ts:147-182`: fg/bg strings are checked through `theme.getFgAnsi` / `getBgAnsi`, falling back to `parseColor` for concrete colours. Style tokens therefore use pi slot accessors, not a Jefferson colour list.
- `format.ts:185-205, 235-278`: `resolveFormat` first resolves values/forms (unknown value blanks whole instrument), mutates each segment in modifier order, then calls `theme.style` for styled pieces. Attribute modifiers add true to the style; mutations transform text. Variable `variableFg` is evaluated against arrived, pre-mutation text and currently takes foreground precedence over the merged cell style. `resolvePlain` (`:207-224`) simply joins plain literals and values.
- Exact SGR opens/closes/resets are delegated to pi's `theme.style` (`:185-187,273-278`), not constructed locally; no local numeric SGR sequences found. Host theme internals are not assigned to Eleanor.

## Names / enumeration

Runtime modifier enumeration: `extensions/jefferson/format.ts:23-33`. Docs list current mutations and attributes at `docs/formats.md:38-60`, and state fg/bg are not modifiers at `:82`; README links formats at `README.md:51`. Tests enumerate accepted/rejected modifiers at `tests/format.test.ts:250-270`, styles at `:285-310`, and form ordering at `:370-415`. `extensions/jefferson/instrument-contract.ts` does not enumerate modifier names; `defaultFormat` is `string` (`:27-49`). Provider contract includes `variableForms` and `variableFg` but no modifier union (`:37-46`).

## Colour path, built-ins and style

`validateStyle` validates style fg/bg independently of the format modifier list (`format.ts:147-182`). Configuration applies it for own and registered declarations in `extensions/jefferson/configuration.ts:177-193,298-336`; format parsing occurs alongside at `:177,227,298,327`. `variableFg` typing is local (`components/instruments/instrument.ts:25-37`) and published (`instrument-contract.ts:44-46`).

Thinking's `$level` built-in maps levels to `thinkingOff` … `thinkingMax` (`components/instruments/thinking.ts:6-18`). Notice `$notice` maps to `warning` (`components/instruments/notice.ts:35-45`); composed notice kind text is resolved plain (`notice.ts:16-33`). Current `resolveFormat` applies the variable token after style and thus wins on fg (`format.ts:262-273`). Owner ruling explicitly requires format colour to win over this built-in token, which is the inverse of current ordering for fg. Format modifiers currently only add attributes, never set colour, so no present-format colour-vs-variableFg collision.

## Plain notice formats and forms

`parseFormat(..., true)` rejects all recognized pipe names with `format puts a modifier in a plain format: "|NAME"` (`format.ts:110-112`), before form selection; `tests/format.test.ts:487-520` cover plain notice format parsing. Plain formats also disallow forms (comment `format.ts:49-53`; tests near `:515`), keeping notice text one colour. A color name passed after pipe would follow this same rejection unless behavior is separately changed.

Forms are declaration-owned via `variableForms` (`instrument-contract.ts:37-39`, architecture/AGENTS). Parser determines forms only immediately after a variable, only once, before modifiers (`format.ts:103-117`). `forms` uses the subject variable's map and `Object.hasOwn`; if not a form, modifier lookup is attempted. Thus a provider form named the same as a modifier/colour name wins as a form in that position; provider forms are arbitrary string-keyed maps, so collision is possible. Later pipes parse as modifiers. ADR 0010 (`docs/adr/0010-a-variable-declares-the-forms-it-accepts.md`) records form ownership.

## Extension-provided instruments

Provider declarations pass through Jefferson's configuration validation/parser: `configuration.ts:298-336`; registration path is `extensions/jefferson/registration-listener.ts` (registration tests in `tests/registration.test.ts`). Published types are in `extensions/jefferson/instrument-contract.ts`; they do not enumerate pipe modifiers or theme colour tokens, and provider formats are plain strings. `docs/extension-authors.md:224-226` describes `variableFg` tokens. Architecture says configuration validates provided format/style against declaration and live theme.

## Resets and sizing

`AGENTS.md` “A pad needs a reset” says open SGR styling would leak into appended spaces and requires reset before pad; host resets between children. `extensions/jefferson/components/row/row-renderer.ts:17-22,55-68` detects an open style and inserts `RESET` before trailing pad. It clips with `truncateToWidth` and measures `visibleWidth`; architecture describes this. `AGENTS.md` also requires width-independent text except fill instruments, and calls out `tests/instrument.test.ts` comparing width 0 and 200. Search located the width tests around `tests/instrument.test.ts:364-390`; exact assertion details were not separately read. `tests/format.test.ts` covers styled output and format semantics; `tests/row-renderer.test.ts` covers rendering/padding.

## Docs, tests and plan neighbours

Documentation pages relevant to modifier listing/semantics: `docs/formats.md` (especially `:38-60,82`), `README.md:51`, and extension contract explanations in `docs/extension-authors.md:142,224-226`. Tests: `tests/format.test.ts`, `tests/instrument.test.ts`, `tests/row-renderer.test.ts`, configuration and registration suites. Plan-context `|spinner` is a prospective new pipe name; current pipe dispatch is centralized in `parseFormat` and a static `MODIFIERS` table, so this research sees no existing spinner implementation. User-composed instruments can use existing declaration variables/forms/modifiers and the same parser. Neither neighbouring plan item appears represented as a colour-token type in the published contract; no implementation judgment made.

## Required-read and repository notes

Read in full: `AGENTS.md`, `ARCHITECTURE.md`, `package.json`, `owner-rulings.md`, `plan-context.md`, and `format.ts`, plus relevant instrument/contract/theme helper files. Repository root is `/Users/joelleibow/Projects/pi-jefferson`; `pnpm test` uses `node --test`; `pnpm typecheck` uses `tsc --noEmit`. ADR directory is `docs/adr/` with 20 files (`0001`–`0020`); relevant title/summary: ADR 0003 “A format carries modifiers” (the format owns modifiers); ADR 0010 “A variable declares the forms it accepts” (form resolvers declared per variable); ADR 0012 “A composed format is chosen by a reading” (notice/composed selection); ADR 0014 “A backslash escapes the character after it” (escape rule); ADR 0017 “Registration replaces the no third-party content rule” (providers can register instruments); ADR 0019 “A block entry is checked once its instrument registers” (provided config validation timing). ADR titles are present in filenames; detailed ADR text was not read because brief asks the feature, not ADR deep disclosure.

## Unknowns / residual gaps

- No full line-by-line review of all docs, configuration, registration, row renderer or tests; references above identify search/read evidence rather than claiming complete test assertions.
- Need Chidi/conductor for pi's exact foreground token enumeration/slot API guarantees and actual SGR byte behavior; no theme files or external docs were inspected.
- A form/colour-name collision is possible by declaration shape and parser ordering, but no specific provider collision was found.
- Whether all supported pi themes expose a uniform enumeration API for foreground slots is not established by the files read.
