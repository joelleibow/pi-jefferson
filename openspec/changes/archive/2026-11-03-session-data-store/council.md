# Council Synthesis

## Question and Scope

`session-data-store` adds a **store** to `pi-jefferson` — one place holding the session and system
data a cell can display, kept current behind the scenes — plus the seam where a **cell holds an
instrument**, configuration names which instrument fills which cell, and one live instrument
(active model and thinking level) ships. Evidence inputs: `research-chidi.md` (documentation, with
citations), `research-eleanor.md` (codebase and host recon, with file and symbol citations),
`proposal.md`, `specs/session-data-store/spec.md`, `specs/statusline/spec.md`, and
`owner-rulings.md`. Advisors were restricted to those documents and did not read the repository.

Roster: `council-kimi` and `council-argon`, two passes, no fallbacks, both at their profile's
default context (`runtime-default-unknown`). Pass 2 resumed both retained threads.

## Perspectives & Trade-offs

**Agreement, reached independently.** The store is owned per footer install, not as a module
singleton: created and seeded at `session_start` beside `createFooter`, given `tui` and
`footerData`, and released from the footer component's `dispose()`. No timers and no
factory-started background resources. Expensive derivations memoize on named invalidations —
appended entries and active-model identity — keyed on the leaf id, because `getEntryCount()` is not
on the extension-visible session manager and `getEntries().length` is a full copy per read. The
three ingestion modes hide behind one read surface: pushed, sampled-at-frame, and
memoized-derived. Unknown is a distinguished value, not `""` or `0`. A captured context throws
after reload, so post-dispose reads must return unknown rather than touch it. The devDependency
pin to host 1.5.0 is a separate change, not this one.

**Disputed and settled in Pass 2 — the frame boundary.** Neither original position survived intact.
The "no mechanism" position was right that a mid-frame update cannot occur: `render(width)` is
synchronous, the host repaints only on request, and single-threaded run-to-completion forbids
interleaving. The "explicit immutable snapshot" position was right that per-cell pass-through reads
repeat work and would silently break on any future impure datum. Both advisors converged in Pass 2
on the minimal mechanism: **the footer samples getter-backed datums once at the start of each
`render(width)`, and every read in that render hits that sample.** No snapshot data structure, no
copy-on-write, no generation counters. Derived values need no frame machinery at all, because their
memos are keyed on named invalidations. Both advisors also required the same spec amendment: the
scenario "an update arrives mid-frame" describes an event that cannot happen and is restated as
"every read during one `render(width)` observes store state as of the start of that render; an
update becomes visible no earlier than the next render".

**Disputed and left to the owner — the store's data surface.** The store spec's first requirement
forbids holding data no instrument displays, while later requirements specify freshness and repaint
for extension statuses, provider count, working directory, and the git branch — none of which a
shipped instrument displays. `council-kimi` would keep the broader contract and add one sentence
quantifying every requirement over the datums the store holds; `council-argon` would either delete
the unshipped-datum clauses or replace the prohibition with a declared data surface. Both agree the
text as written cannot stay. This is a scope ruling, and it decides whether the branch subscription
is wired at all in this change.

## Synthesis & Recommendation

Build the store as a plain per-install object whose public surface is synchronous reads and whose
internals are the three ingestion strategies. Sample getter-backed datums once per `render(width)`;
memoize derived values on named invalidations; seed pushed values at `session_start` because the
host reports no selection when a session is restored; update them from `model_select` and
`thinking_level_select`, requesting a repaint only when a displayed datum changed; release
everything from `dispose()` and gate every context touch behind a disposed flag so a stale context
is never read. Instruments receive text, not host handles: the renderer's text-per-cell contract
stays, so `floor(W / N)` geometry and one-line truncation are untouched.

Two spec amendments are required by the council before design: the mid-frame scenario restated as
above, and the data-surface scope ruled by the owner.

## Accepted & Rejected Feedback

- **Accepted:** per-install store lifetime with `dispose()` ownership; no module singleton; no
  timers; memoization keyed on leaf id and model identity; seeding model and thinking level at
  `session_start`; unknown as a distinct value; disposed-flag gating of context reads; the
  devDependency pin bump as a separate change; the mid-frame scenario restated as a run-to-
  completion invariant.
- **Rejected:** an immutable per-frame snapshot structure (defends against an impossible case and
  allocates per render); live pass-through getters read per cell with no frame sample (repeats
  work and breaks on any impure datum); per-datum generation counters; any async or read-through
  fetch; a descriptor-registration framework that exists to test datums no instrument displays
  (`council-argon`) or, in the alternative, deleting the untested clauses wholesale
  (`council-kimi`) — both are workarounds for a text the owner can rule correct.
- **Rejected outright by both, in Pass 1:** rejecting the whole configuration document for a
  `cells`/`containers` mismatch without an owner ruling on error policy; folding the host pin bump
  into this change.

## Owner Decisions Required

**Ruled 2026-11-03. All four are settled; see `owner-rulings.md` for the binding text.**

1. **The store's data surface.** Only data a shipped instrument displays. The store holds provider,
   model, and thinking level; the wider surface (git branch, extension statuses, provider count,
   working directory) is a named deferred decision, and `onBranchChange` is not subscribed in this
   change. Every requirement is quantified over the datums the store holds, per `council-kimi`'s
   amendment.
2. **`cells` and `containers`.** `containers` is removed rather than reconciled. A row's `cells`
   array is both the count and the placement, so a length mismatch is no longer expressible. This is
   **BREAKING**: `containers` shipped in 0.1.4, and the delta spec removes that requirement.
   `panel` was considered and rejected as a bordered-tile noun that adds a word without retiring one.
3. **An unknown instrument name.** Warn and render that cell as `blank`; the rest of the row still
   renders. `blank` is an instrument, so every cell has one, and the placeholder is no longer a
   special case.
4. **The instrument's rendered text.** Two instruments, not one, each a **label over a data field**
   where the label may be data: `model` renders `provider: model`, and `thinking` renders
   `thinking: level`. Provider, model, and thinking level are distinct store datums, because users
   will compose them into their own instruments later.

## Evidence & Run IDs

- `council-kimi` — Pass 1 `3cf7e997-4d35-4114-9dd3-657a2d323a1b`, Pass 2 `8e1c7e38-1dd3-4698-b831-e8afb03ea26d`
- `council-argon` — Pass 1 `dab1e801-3393-43c4-9a35-173bd371f9f9`, Pass 2 `50a55b95-baa0-409d-907c-2aa2585b5584`
- Evidence documents: `research-chidi.md`, `research-eleanor.md`, `proposal.md`,
  `specs/session-data-store/spec.md`, `specs/statusline/spec.md`, `owner-rulings.md`

## Confidence

High on the architecture: every load-bearing host fact is corroborated by shipped host code cited
in the research reports, and both advisors converged on the same mechanism from opposite starting
positions. High on the two required spec amendments. The unresolved items are scope and error
policy, which are the owner's by construction, not evidence questions.

What would change the decision: evidence that the host ever renders a footer on a timer, that
`footerDataProvider` is recreated per session, or that host 1.4.0's type surface lacks a parameter
this change uses — the last would make the pin bump a prerequisite rather than a follow-up.
