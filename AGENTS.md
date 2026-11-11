# AGENTS.md

Notes for an agent working in this repository. `ARCHITECTURE.md` describes the parts; this file is the
handful of things that are easy to get wrong.

## Words

A row holds cells, and a cell holds an instrument (Joel's ruling, 2026-11-03). Never call the statusline
concept a "module" or a "widget". Where the extension-source-layout spec uses "module" as a term of
art, it means a source file, and new prose says "source file".

## Running things

```bash
pnpm typecheck   # tsc --noEmit
pnpm test        # node --test, source executed directly
openspec validate --strict
```

There is no build step. Node strips types at load, so only erasable TypeScript is allowed: no `enum`,
no parameter properties, no runtime `namespace`, no decorators. Relative imports carry the `.ts`
extension.

## Adding an instrument

1. Add one file under `extensions/jefferson/components/instruments/` that imports
   `FOUNDATIONAL_OPTIONS` from `instrument.ts` and declares the instrument — name, variables, defaults
   and options, plus a `defaultLabel` or a `variableFg` if it needs them — then add one entry to
   `extensions/jefferson/shipped.ts` so `instrumentNamed` resolves it. A `defaultLabel` carries no trailing
   space: binding adds the one gap, and a declared space would only be trimmed. `fills` is required
   on `Instrument`: set it on the declaration when the instrument takes the row's spare columns, as
   `blank` does. A `$bar` in a format makes the cell fill without saying so. A variable with more
   than one rendering declares `variableForms` in the same file: the named resolvers for that
   variable; a bare `$name` renders `variables.name`. `parseFormat` rejects a `|name` the declaration
   does not carry, and `resolveFormat` renders the form a format names, so the forms are declared
   once, on the instrument.
2. Variable resolvers read the store and return already-formatted strings. The bound render seam is
   `(readings, width, theme) => string`; never subscribe, poll, or cache host data.
3. If the store does not hold the data the instrument displays, add it in `extensions/jefferson/data/`,
   along with whatever seeds or pushes it. Do not reach for host state inside the instrument.
4. A row sizes a cell from its text rendered at width 0, so an instrument's text must not depend on
   the width unless it fills. The test in `tests/instrument.test.ts` that compares width 0 with width
   200 across the shipped instruments fails when one breaks this.
5. Add a test that proves the cell renders it, and one that proves alignment still applies.

## Adding a notice kind

One notice kind is one line pi's transcript draws. To add one, add a member of `NoticeKind` in
`extensions/jefferson/data/notice.ts`, one entry in `FORMATS` in
`extensions/jefferson/components/instruments/notice.ts`, and a subscription in
`extensions/jefferson/data/session-data-feed.ts` only if a host event carries the kind. Every
subscription joins the feed's one release, and the whole notice path stays dormant while no row places
a `notice` cell.

Two things a new kind must not break. **A kind's format is plain:** it names the values (`$tokens`,
`$cost`, `$idle`, `$blocks`) and takes no modifier and no form, because styling belongs to the cell and
an inner reset would drop the notice's `warning` foreground. **The declaration's two variable sets are
not interchangeable:** `variables` holds `$notice`, the cell's format, and `composed.variables` holds
the values a kind's format names. A `formats` entry that names `$notice`, or a cell's format that names
`$tokens`, rejects the document. [ADR 0012](docs/adr/0012-a-composed-format-is-chosen-by-a-reading.md)
says why the sets are split.

`data/notice.ts` copies pi's rule. Its header carries the pin, `shortcut: copies pi 1.4.0's rule;
drift in the user's global pi between pin bumps is invisible, re-check on every pin bump`, so check
every constant and every rule against pi's own files when the pin moves, and move the pin in that
comment.

## Testing the footer's height

The footer's first line is row one; only the lines between rows are empty. A test of a row's
horizontal geometry passes `rowGap` 0 to `createFooter` so every line is a row; a test of the gap reads
the exact list of lines. The gap line is a bare `""`, so the helper that frames a row's line does not apply
to it. [ADR 0008](docs/adr/0008-the-space-between-rows-is-the-stacks-gap.md) says why the first row sits flush on the editor.

## Two traps this repository has already paid for

**A pad needs a reset.** A cell's text may end with an open SGR. Spaces appended after it inherit the
styling. Emit a reset before such a pad. The host resets between children, so only the intra-cell case
is ours.

**Measure columns, never characters.** `visibleWidth` for measuring, `truncateToWidth` for clipping.
A wide glyph dropped at a clip boundary leaves the text narrower than the arithmetic predicted, so
compute the pad from the clipped result.

## Where decisions live

An `openspec/changes/<name>/design.md` records a change's decisions, and archives with it. Reasons that
outlive a change belong in `docs/adr/`. The model belongs in `ARCHITECTURE.md`. If a rule is being
retired, say so in an ADR rather than deleting it from a spec and leaving the next reader to guess why.
