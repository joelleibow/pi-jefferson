# 16. The equal distribution stays in the code, and leaves the configuration

Date: 2026-11-15
Status: Accepted. Narrows [ADR 0007](0007-a-cell-takes-the-width-its-content-needs.md)'s
`distribution` row option: no document selects it, and [ADR 0002](0002-rows-span-the-full-width.md)'s
equal layout is reachable only from code.

## Context

ADR 0007 gave a row a `distribution` option with the values `"content"` and `"equal"`, absent meaning
`"content"`. It had to live on the row because a row was an object, and the renderer read the option
from it.

This change makes a row a plain list of entries. A row has no keys left to carry an option, and the
document's top level gains one job: it holds `rows`, `instruments` and `rowGap`. Equal shares had no
way in once the row's key list went, so the question was whether the branch goes with it.

Joel's 2026-11-15 ruling: *"yeah. it seems safe to drop. we should keep the code in place though, in
case it resurfaces"*.

## Decision

- **The configuration no longer accepts `distribution`.** A top-level `distribution` rejects the
  document with the rest of the retired shape. An entry carrying `distribution` rejects too, because
  an entry carries `instrument` and `align` and nothing else.
- **The code keeps both distributions.** `DISTRIBUTIONS`, `Row.distribution`, the width plan's equal
  branch, the renderer's path that skips the probe, and the tests that pin all of it stay. The parser
  writes `"content"` for every row.
- **The specification states content sizing alone.** A scenario states what a user or the host can
  observe, and no document reaches the equal branch. The branch's guard is the renderer and
  width-plan tests the change keeps, not a scenario.

## Alternatives weighed and not taken

- **Delete the branch and its tests.** The ruling refuses it, and the branch is small: a basis of
  `floor(W / N)` and a grow of 1, with no probe and no joint.
- **Give `distribution` a new home at the document's top level.** A user who wants a cell to take the
  slack already has `blank`, and ADR 0007 refused a per-cell key on the same ground. A document-level
  switch would also be a second place that decides a row's geometry.
- **Keep an equal-share scenario in the specification.** It would describe behaviour that no input
  reaches, and every other scenario in that file names a document or a host the reader can produce.

## Consequences

- Equal shares cannot be configured. A user who set `"distribution": "equal"` has no replacement, and
  the upgrade note says so.
- If a later change exposes a distribution again, the code and its tests are already in place, and
  only the reader and a scenario are missing.
- `Row.distribution` remains a field that always holds `"content"`. It stays because removing it
  would reach into the renderer and the width plan, which this change does not enter.
