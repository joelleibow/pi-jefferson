# Council Synthesis

## Question and Scope

Are `proposal.md` and the two delta specs (`specs/statusline/spec.md`, `specs/session-data-store/spec.md`) the right design basis for `configurable-instruments`, and of the eight evidence/ruling collisions and eight owner-open shapes the proposal names, which must change before `design.md` is drafted?

Scope: the three ruled parts (layout onto pi-tui with `basis: floor(W / N)` plus `grow: 1` and a once-built tree; six instruments from pi's own data with git excluded; per-instrument `format` and `style` configured once by name, `$bar` as a width-taking variable, one declaration per instrument). Non-goals: implementation design, the git instrument, row-level justify/gaps/proportional widths/a fourth alignment, Markdown, new dependencies, the retired vocabulary.

Evidence inputs: `owner-rulings.md`, `proposal.md`, both delta specs, `research-chidi.md`, `research-eleanor.md`, Chidi addendum 1 (run `183718c4`) and addendum 2 (run `650e92d9`), and the "The design gate (PL4)" section of `michael-the-architect.md`.

Roster and passes: `council-kimi` (run `851e661a`) and `council-argon` (run `1a7900d5`), both fresh context by profile (`defaultContext: fresh`), read-only, Pass 1 only. Pass cap 2; Pass 2 not run, for the reason stated under Perspectives.

## Perspectives & Trade-offs

**Agreements.** Both advisors rate the proposal and delta specs a sound design basis at high confidence. Both accept all eight collisions as correctly resolved with the ruling winning. Both accept open shapes 1 (top-level `instruments` key), 7 (own control-character collapse) and 8 (`blank` takes the two options). Both accept the `$bar` thresholds (warning above 70 %, error above 90 %) and `?` for a null context estimate as mirroring pi's own footer. Neither advisor raised an owner decision.

**The one dispute, settled by evidence already in hand.** Kimi held open shape 2 feasible as specced (`turn_end` plus session replacement as the named invalidations), with an unverified assumption that usage appended outside turn boundaries might need a supplementary leaf-id check. Argon held `turn_end` insufficient as the sole key, because it never fires for three of the four usage categories the statusline spec counts (`compaction`, `branch_summary`, `type: "usage"`), while all four advance `sessionManager.getLeafId()`; and because `ctx.getContextUsage()` changes on `model_select` and after compaction with no `turn_end` at all. Chidi's addendum 2 established both facts with emit-site citations, and kimi's own report names exactly this as the condition under which "the leaf-id cache key should become the primary mechanism rather than a supplement." The dispute is therefore closed by evidence both advisors received, not by preference: the `getEntries()` scan is keyed on `(getSessionId(), getLeafId())`, `ctx.getContextUsage()` is read at sample time, and `turn_end` remains available only as a repaint trigger. Pass 2 exists to cross-examine disputes that evidence can still settle; this one is settled, so no Pass 2 ran.

**A second apparent dispute that is not one.** Kimi left open whether parse-time theme-token validation is awkward because configuration is read before the footer factory hands over the theme, suggesting the spec scenario might soften to rejection at footer install. Argon held parse-time validation mandatory, because the statusline delta already mandates whole-document rejection for an invalid `style` and `theme.style()` throws at render time on raw color strings and wrong-slot tokens. Chidi's addendum 2 closes the awkwardness: `ctx.ui.theme` is a `Theme` instance available to the extension at `session_start`, so the live theme's slot maps are reachable at parse time. The spec stands as written; the mechanism is pinned.

**Argon's remaining findings, all accepted as corrections rather than disputes:** `$bar` needs a stated rendering for the post-compaction null estimate; `$totalTokens` must be defined as `input + output + cacheRead + cacheWrite` because pi's `addUsageToTotals` never reads `usage.totalTokens`; and the once-built `HStack` cannot take a per-render `basis` through any typed public route, because `Stack.addChild` copies option values into fresh internal entry objects behind `protected readonly entries` with no setter — the public typed route is `clear()` plus `addChild(component, options)` when the width changes, which keeps the cell components and retires only the entry options.

**Kimi's required correction, accepted:** open shape 7's claim that pi-tui exports no control-character helper is true only at the repository's resolved pi-tui 1.4.0; at 1.5.0 `replaceControlCharacters` exists but is escape-naive and collapses runs, so it cannot be applied to styled text. The choice of Jefferson's own collapse survives for that reason, and the proposal must say so, including the ordering constraint that any collapse runs before styling.

## Synthesis & Recommendation

Draft `design.md` against the proposal and delta specs after one bounded Builder revision pass carries the accepted corrections: the leaf-id-keyed scan and sample-time context read in the session-data-store delta; parse-time `style` validation against the live theme's slot maps with `parseColor` for non-token colors in the statusline delta; `$bar`'s null-estimate rendering and the `$totalTokens` definition; the version-relative wording and ordering constraint in open shape 7; and the `clear()`-plus-`addChild` resize route with per-segment styling around `$bar` as design constraints. Everything else in the proposal stands. No owner decision is required.

## Accepted & Rejected Feedback

Accepted, from argon: the `(sessionId, leafId)` key for the entry scan with sample-time `getContextUsage()`; parse-time `style` validation storing parsed `Color` objects, with slot-specific token checks; `$bar` on a null estimate renders an unfilled `dim` track while the cell shows `?/<window>`; `$totalTokens` defined as the four-field sum; the `clear()`-plus-`addChild` resize route on public typed API rather than a cast or a deep import of the unexported `LAYOUT_NODE`; instrument `style` applied per non-`$bar` segment so the bar's internal resets do not strip styling from trailing prose.

Accepted, from kimi: the version-relative correction to open shape 7 with its ordering constraint; theme-token validation reading the live theme (`theme.colors` keys or the slot maps) rather than a copied `THEME_TOKENS` list, which pi does not export and which would drift; the note that the entry's subscription count changes from two to whatever the named invalidations need, already named in the proposal's Impact.

Rejected: kimi's framing of `turn_end` as sufficient for usage invalidation, on Chidi's emit-site evidence and kimi's own flip condition; kimi's suggestion that the parse-time rejection scenario might soften to footer-install rejection, because `ctx.ui.theme` makes the live theme reachable at parse time; argon's implicit reading that the once-built ruling forbids `clear()`-plus-`addChild` on width change — the ruling fixes that the tree is built once at install, and re-seating entry options on a width change keeps every component the tree holds.

## Owner Decisions Required

None. Both advisors returned empty owner-decision lists, and every shape they challenged is settled by cited evidence or by a ruling already in `owner-rulings.md`.
