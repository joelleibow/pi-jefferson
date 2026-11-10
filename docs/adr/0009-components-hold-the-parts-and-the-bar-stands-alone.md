# 9. Components hold the parts, and the bar stands alone

Date: 2026-11-10
Status: Accepted. Revises [ADR 0005](0005-source-is-laid-out-by-responsibility.md)'s `visuals/` bullet
and its import sentence; the rest of ADR 0005 stays in force. Restates a sentence of
[ADR 0007](0007-a-cell-takes-the-width-its-content-needs.md) under its new path.

## Context

ADR 0005 gave `visuals/` the files that decide what a cell shows and how rows are laid out and drawn.
That name held a format language that draws nothing, a width plan, the row, the renderer, the binding
and every instrument. Joel's frame separates logic many parts share, and the process flow, from logic
that belongs to one part. `visuals/` mixed them.

He ruled on two points when the layout was planned. On the bar: *"It most definitely doesn't go in
format. Why did it ever even end up in format? It has nothing to do with formating? That's just silly.
It's a component that an instrument can mix in to help with affordance of the data presented. We're
going to be making some changes to it in a future spec so it needs to be independent of anything else's
responsibility."* On the tree, after seeing the council's, he wrote his own: *"This feels better to me.
A bit more granularity and not as generalized."*

## Decision

`visuals/` as a top-level directory is gone. Joel's tree is the layout:

```text
extensions/jefferson/
   ├── startup.ts
   ├── configuration.ts
   ├── footer-setup.ts
   ├── format.ts
   ├── data/
   │   ├── session-data-store.ts
   │   └── session-data-feed.ts
   ├── components/
   │   ├── instruments/
   │   │   ├── instrument.ts
   │   │   ├── instrument-binding.ts
   │   │   ├── blank.ts  model.ts  thinking.ts  path.ts
   │   │   ├── context.ts  tokens.ts  cost.ts
   │   │   ├── compact-count.ts
   │   │   └── (branch.ts  session.ts  status.ts arrive with the paused change)
   │   ├── row/
   │   │   ├── row.ts
   │   │   ├── width-plan.ts
   │   │   └── row-renderer.ts
   │   └── visuals/
   │        └── bar.ts
   └── shipped.ts
```

- **The frame is the rule.** A file directly under `extensions/jefferson/` is shared logic or the
  process flow. A file inside a directory of `components/` is that part's own logic.
- **The import rule replaces ADR 0005's sentence** that `visuals/` imports only itself and the types of
  `data/`. `components/` files import host packages, their own directory, the types of `data/` and
  `format.ts`, and never startup, footer setup, configuration or `shipped.ts`. `format.ts` imports
  `components/visuals/bar.ts` and types. `data/` is unchanged.
- **The bar stands alone.** Its drawing, filled portion and threshold colors live in
  `components/visuals/bar.ts`, which imports no file of this package. `format.ts` still parses `$bar`,
  because the format is how a user places the bar among prose, and Joel confirmed that purpose: *"$bar
  in a format was solely for users to be able to use it themselves if they see fit."*
- **`components/visuals/` holds one file.** That breaks ADR 0005's rule that a directory owning a single
  file does not exist. It is Joel's call, made because he expects more visualizations.
- **ADR 0007's width plan.** Its sentence "a pure function under `visuals/`, the width plan" now reads
  `components/row/`. The width plan still imports nothing, so ADR 0007 stays true.

## Consequences

- A reader looking for `cost` opens `components/instruments/cost.ts`. Adding an instrument is one file
  there and one entry in `shipped.ts`.
- The bar can change in a later spec without touching the format language or an instrument.
- `components/visuals/` is a single-file directory until a second visualization arrives. Moving
  `bar.ts` reverses it.
- Rejected: editing ADR 0005, because an accepted ADR's body is not edited; and keeping the bar in
  `format.ts`, which both council advisors proposed and Joel overruled.
- The rules describe the import graph and are not enforced at runtime, as in ADR 0005.
