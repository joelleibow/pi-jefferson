# Proposal

## Why

The footer renders the rows configuration declares, but every cell carries the same fixed
placeholder text, so the statusline says nothing about the session it sits in. The layout and
configuration contract are settled; what is missing is the data behind a cell, and a seam that
puts it there without each cell acquiring it. This change adds the store that keeps that data
current, the cell-holds-instrument seam, and two live instruments — the active model and the
active thinking level — proven in a real footer.

## What Changes

- **BREAKING**: `containers` is removed. A row's `cells` array is now both how many cells the row
  has and which instrument fills each, so a length mismatch is no longer expressible. An absent
  `cells` means eight cells, and a `cells` array longer than 8 is truncated to 8, exactly as the
  old clamp behaved. A document that declared `containers` declares `cells` instead; a document
  that declared neither keeps the eight cells it renders today.
- A **store**: one place holding the session and system data a cell can display, kept current
  behind the scenes. Pushing, reading on demand, and caching an expensive derivation are the
  store's problem, not the consumer's: an instrument reads, and never subscribes, polls, or
  computes. The store holds only the data an instrument displays — provider, model, and thinking
  level, as three distinct datums rather than one composed value, so users can compose them into
  instruments of their own.
- A **consumer seam**: a cell holds an instrument, and an instrument resolves to the text that cell
  displays. Rendering stays synchronous — nothing a cell renders awaits, blocks, or throws.
- **`blank` is an instrument**, not a special case. The default row is eight `blank` cells, a row
  that names no `cells` renders as it does today, and a cell whose instrument name the extension
  does not implement warns, naming the unknown instrument, and renders `blank` while the rest of
  the row still renders.
- **Two instruments, not one.** An instrument has a label and a data field, and either may be
  data: `model` renders `provider: model`, and `thinking` renders `thinking: level`. They are read
  when a session starts, because the host reports no selection when it restores a session, and
  updated from the host's `model_select` and `thinking_level_select` pushes.
- The current spec's sentence forbidding *any* contribution interface is **removed and replaced**
  by the narrower promise it was protecting: configuration names instruments, the extension
  implements them, and there is still no API by which third-party code supplies or replaces cell
  content.
- The entry stops discarding the footer factory's `tui`: it is the only repaint request a footer
  has, so a pushed change repaints without the consumer asking for one.
- Out of scope: the wider data surface — the git branch, extension statuses, the provider count,
  and the working directory — is a **named deferred decision**, in which the instrument that needs
  a datum arrives with the store field it needs; `onBranchChange` is therefore not subscribed in
  this change. Also out of scope: a catalog of instruments; any API by which third-party code
  supplies cell content; the built-in footer's data beyond what an instrument displays; per-cell
  styling.

## Capabilities

### New Capabilities

- `session-data-store`: one place holding the session and system data a cell can display — a
  synchronous, total read surface with stated freshness, bounded derivation, one coherent state per
  render, and release on disposal. Named for the durable behavior it provides — a store of session
  and system data — not for this change's steps.

### Modified Capabilities

- `statusline`: the requirement `A row's containers count` is **removed**, because a row's `cells`
  array is now both the count and the placement. `Cell content is fixed placeholder text` is
  renamed to "cell content comes from an instrument", with `blank` as an instrument holding the
  placeholder and the sentence forbidding any contribution interface replaced by the narrower
  promise above. A row's `cells` key names instruments, an unknown name warns and renders `blank`,
  the two instruments `model` and `thinking` are the first live content, and the one-line,
  `floor(W / N)` geometry is stated to bind the text an instrument resolves to.

## Impact

- `extensions/jefferson.ts` (the entry): hands the footer factory's `tui` to the store it starts
  beside `createFooter`, so the store can request a repaint, and releases the store when the host
  disposes the footer.
- `extensions/jefferson/` (the working parts): a store source file, the instrument seam, the
  `blank` instrument, and the `model` and `thinking` instruments; the row renderer resolves each
  cell's instrument in place of the fixed text.
- `extensions/jefferson/configuration.ts`: a row's `cells` replaces `containers`, a name the
  extension does not implement warns and renders `blank`, and the placeholder text survives as the
  `blank` instrument's text.
- `tests/`: the store's freshness, per-render coherence, session-replacement reset, repaint, and
  disposal; instrument resolution and unknown-name handling; the two instruments in a rendered
  footer.
- Untouched: `package.json`, `tsconfig.json`, `.github/workflows/ci.yml` — an ordinary source file
  under the declared load root needs no manifest or workflow change, and no new structural rule is
  introduced.
- Host version drift: `devDependencies` pin host 1.4.0 while the running host is 1.5.0. The
  surfaces this change uses were read from 1.5.0. Whether to pin `devDependencies` to the shipped
  host is left to design.
- Open questions for design: what a `cells` array renders as when it is empty, and whether a
  document that still carries a `containers` key is rejected, ignored, or warned about. Both are
  configuration error policy, which the owner has not ruled; the specs state only the ruled
  behavior.
