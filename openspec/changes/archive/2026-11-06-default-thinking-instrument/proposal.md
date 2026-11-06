# Proposal

## Why

Joel wants the default `thinking` instrument defined and made to behave properly: a label followed by the
level, with the level colored the way pi colors the thinking rules on the input box (`owner-rulings.md`,
2026-11-06 "Objective", "Vocabulary" and "Default composition"). Today it renders the lowercase text
`thinking: high` in the cell's own style, and nothing in the extension can put a label in front of any
instrument's format (`research-eleanor.md` §3.1, §3.2).

## What Changes

- **`label` option on every instrument.** A string option beside `format` and `style`. It is always placed
  in front of what `format` is set to, including the default format. It is not a variable: there is no
  `$label`, so it cannot be used anywhere but in front (`owner-rulings.md`, 2026-11-06 "Label option").
- **`thinking` default composition.** Default label `Thinking: `, default format `$level|capitalize`, so the
  default cell reads `Thinking: High`. The lowercase `thinking: ` literal leaves `defaultFormat` and becomes
  the default label (`owner-rulings.md`, "Default composition"; `research-eleanor.md` §3.2). **BREAKING** for
  anyone reading the default text: `thinking: high` becomes `Thinking: High`.
- **`$level` color.** The `$level` segment is colored with the same per-level color pi gives the thinking
  rules on the input box, so it changes as the level changes and follows a theme switch
  (`owner-rulings.md`, "Default composition"). Pi exposes seven levels, `off` through `max`, and colors the
  input-box rule through a per-level mapping: the exported `Theme.getThinkingBorderColor(level)` or the seven
  `thinking*` foreground tokens (`research-chidi.md` Q1, Q3, Q4). The theme must be the live render-time
  theme (`research-chidi.md` Q4, citing S11).
- **Unchanged here:** the `thinking` instrument is still the one `$level` datum, restored with the session
  and updated on `thinking_level_select` (`research-chidi.md` Q2; living `statusline` spec). An unknown level
  is `undefined`, and the living spec renders the whole cell as nothing (`research-eleanor.md` §3.4); this
  change carries that forward.

## Does not do

- It does not specify, implement or test string modifiers. `$level|capitalize` is assumed functional; the
  syntax is absent from this worktree and its tests belong to the parallel modifiers change
  (`owner-rulings.md`, "Default composition"; `research-chidi.md` Q5; `research-eleanor.md` §3.5).
  The dependency on that change is resolved: Joel ruled on 2026-11-06 that the modifiers are merged on `main`
  and released as `0.5.0` (`owner-rulings.md`, "Sequencing"), and `council.md` verified tag `v0.5.0`.
- It does not add a `$label` variable (`owner-rulings.md`, "Label option").
- It does not style `$level` through `Theme.getThinkingBorderColor`; the host API for the color is chosen in
  `design.md` D5.
- It does not give any instrument other than `thinking` a default label; how a default label is declared is in
  `design.md` D1.

## Open questions

No owner decisions remain. The council's settled decisions live in `council.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `statusline`: the requirement "The thinking instrument" changes its default composition and gains the
  level color; a new requirement adds the `label` option for every instrument; a new requirement fixes the
  `$level` color. No other statusline requirement changes: `label` is a declared option, so the option
  whitelist scenarios in "An instrument's configuration lives in the extension's own document" still hold.

## Impact

From `research-eleanor.md` §3 and §5, not verified again here:

- `extensions/jefferson/instrument.ts`: the shared option list and the `thinking` declaration.
- `extensions/jefferson/configuration.ts`: the option whitelist and the bound instrument's render.
- `extensions/jefferson/format.ts`: label prepending and the `$level` color, wherever design puts them.
- Tests that pin the old shape: `tests/instrument.test.ts` (`["format","style"]`, `thinking: $level`,
  `thinking: high`), `tests/configuration.test.ts`, `tests/jefferson.test.ts`; `tests/fake-theme.ts` has no
  `getThinkingBorderColor` and no `thinking*` tokens.
- `README.md` (the instruments table, option prose).
- Dependencies: the string-modifiers change, released as `v0.5.0`, which `$level|capitalize` needs; and pi's
  theme API. `Theme.getThinkingBorderColor` and all seven `thinking*` tokens exist in every published pi
  release, `0.81.0` through `1.5.0` (`research-chidi-addendum-1.md` §1–§4), so the evidence requires no
  compatibility floor and package metadata states none (`design.md` D6).
