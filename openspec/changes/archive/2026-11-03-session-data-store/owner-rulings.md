# Owner rulings — session-data-store

Rulings the owner made during this change, recorded so design, specs, and tasks cite them instead
of re-deriving or re-asking.

## Vocabulary (2026-11-03, ruling)

- A **row** holds **cells**.
- A **cell** holds an **instrument**. An instrument displays data.
- The **store** is a local store of available session and system data, kept current behind the
  scenes, so an instrument's only concern is reading it. The owner's frame: the Redux-era local store.
- **`module` and `widget` are rejected words.** They must not appear in these specs, the design,
  the tasks, the code identifiers, or the prose of this change.

### Scope of that ruling

The ruling governs the *statusline concept*: what fills a cell. It does not rename the
`extension-source-layout` spec's term of art, where "module" means **source file** and where
requirements read "the module the host loads as an entry" and "each source module MUST be named for
the behavior it owns". Substituting "instrument" there produces false statements. That spec is
untouched; where it must be referenced, say "source file".

## Cells are the count and the placement (2026-11-03, ruling)

A row holds **cells**. A cell holds an **instrument**. There is no `containers` key and no separate
count: a row's `cells` array is both how many cells it has and which instrument fills each. The two
keys were two spellings of one thing, which is why they could disagree.

- **`containers` is removed.** This is **BREAKING** and shipped in 0.1.4, so the delta spec removes
a requirement rather than adding one. The owner accepted the break on 2026-11-03 — *"that's okay since
we're in pre release"* — so no deprecation shim is written and `containers: N` stops being read at all.
- **`panel` was considered and rejected.** A panel reads as a bordered tile with its own frame, and
  it adds a noun without retiring one. `cell` is the spreadsheet vernacular the owner already chose.
- **`blank` is an instrument.** The placeholder stops being a special case: every cell holds an
  instrument, the default row is eight `blank` cells, and no padding rule exists because a length
  mismatch is no longer expressible.
- The ceiling of 8 applies to the length of `cells`.
- An unknown instrument name warns and renders that cell as `blank`; the rest of the row still
  renders. One typo does not take down the statusline.

## What the live instruments show (2026-11-03, ruling)

**Two instruments, not one.** An instrument has a **label** and a **data field**, and the label may
itself be data.

- `model` — renders `provider: model`; the provider is the label and its value is data.
- `thinking` — renders `thinking: level`; a literal label over the level.

`cells: ["model", "thinking"]` is the starting configuration. Provider, model, and thinking level
are three distinct store datums, not one composed value, because users must be able to compose them
into instruments of their own later.

## The store's data surface (2026-11-03, ruling)

The store holds **only data a shipped instrument displays** — provider, model, and thinking level —
and every requirement is quantified over the datums it holds. The wider surface (git branch,
extension statuses, provider count, working directory) is a **named deferred decision**: the
instrument that needs one arrives with the store field it needs. `onBranchChange` is not subscribed
in this change. The push path is still exercised, because `model_select` and `thinking_level_select`
are pushes.

## Which instrument sits in which cell (2026-11-03, ruling, superseded in form)

**Configuration designates cells.** A row may name its instruments: a `cells` key carrying
instrument names in order. The extension's fallback when a row names none stays as shipped.

Consequences this ruling forces, so no later step re-opens them:

- Design decision D5 (configuration speaks in counts and never in cells) is **superseded** by this
  change, deliberately, by the owner.
- `openspec/specs/statusline/spec.md` requirement "Cell content is fixed placeholder text" is
  **rewritten**, not deleted. The sentence forbidding a contribution *interface* survives in a
  rewritten form: configuration names instruments and the extension implements them; there is still
  no API by which third-party code supplies or replaces cell content.

## The first live instrument (2026-11-03, ruling)

**Model and thinking level.** This is the datum the first live cell shows.

## Scope approved (2026-11-03)

Store + consumer seam + one live cell, proven in a terminal. Not store-only, and not a catalog.
