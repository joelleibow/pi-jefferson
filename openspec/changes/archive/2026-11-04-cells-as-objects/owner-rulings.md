# Owner rulings — cells-as-objects

Rulings Joel made before this change existed. They are binding on the specs, the design, and the
tasks. Nothing here is open for design to re-decide.

## Cells are objects

A row's `cells` is a list of objects, never a bare number and never a list of strings:

```json
{ "rows": [ { "cells": [ { "instrument": "model" }, { "instrument": "thinking" } ] } ] }
```

A list of strings cannot carry a per-cell property, and per-cell properties are the use case.

## `align` is on the cell; `width` is declined

A cell may carry `align`. What he wanted from the two-cell screenshot was the second cell's content
hugging the right edge — a padding decision inside a cell, not a share of the row.

Ruled: `align` with `left` as the default and `right` available. **`width` and a `spacer` instrument
are declined** — a relative share pool means deciding what the pool totals, what happens when shares
overshoot, and how the remainder distributes, all to produce a gap that `align` already provides.
Proportional layout is an addition to this shape if a real need appears later.

**`center` joins them on 2026-11-03**, after the first pass of this change was built: the owner
corrected his own earlier scope, saying *"There should be left, right, and center."* So `align` is a
three-valued enum — `left` (default), `right`, `center` — and an `align` outside those three still
rejects the document, naming the value it refused.

With an odd pad, centering cannot split evenly: `floor(pad / 2)` goes on the left and the remainder on
the right, so an odd pad leaves its extra column on the right and the text sits half a column left of
exact centre. That is the recorded choice, not an accident.

## Truncation stays at the end

A right-aligned cell whose text overflows keeps the ellipsis at the end, like every other cell. Only
the padding side moves.

## Default and ceiling move from 8 to 10

Ten divides 80 (8), 100 (10), 120 (12), 160 (16) and 200 (20) exactly under `floor(W / N)`.
Eight does not divide 100 (12.5) or 132 (16.5). Ten is not universal either — it leaves 2 columns at
132 (13.2) against eight's 4 (16.5) — so the honest claim is that ten divides more of the common
widths and leaves a smaller fragment where it does not, which is why it wins.

The cost, recorded with the decision: at 80 columns ten cells is 8 characters each, so a model name
clips hard in a narrow window.

## No duck typing on `cells`

`cells` is a list of objects or it is absent. No bare number, no `cellCount` key. Omitting `cells`
already yields the default row, so a count would only serve widths the default does not cover, at
the price of a second spelling for one idea.

## Vocabulary, unchanged from the previous change

A **row** holds **cells**, a **cell** holds an **instrument**, an instrument is a **label over a data
field**. The words `module` and `widget` remain banned. `instrument` names the content; `align` names
a cell property; nothing here renames the store.
