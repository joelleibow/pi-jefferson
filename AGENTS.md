# AGENTS.md

Notes for an agent working in this repository. `ARCHITECTURE.md` describes the parts; this file is the
handful of things that are easy to get wrong.

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

1. Add one declaration to `extensions/jefferson/visuals/instrument.ts` — name, variables, defaults
   and options, plus a `defaultLabel` or a `variableFg` if it needs them — and include it in the
   shipped declarations table so `instrumentNamed` resolves it.
2. Variable resolvers read the store and return already-formatted strings. The bound render seam is
   `(readings, width, theme) => string`; never subscribe, poll, or cache host data.
3. If the store does not hold the data the instrument displays, add it in `extensions/jefferson/data/`,
   along with whatever seeds or pushes it. Do not reach for host state inside the instrument.
4. Add a test that proves the cell renders it, and one that proves alignment still applies.

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
