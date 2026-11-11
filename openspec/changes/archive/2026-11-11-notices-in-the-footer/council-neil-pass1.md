# neil-p1 (bfc6517a-ee9a-4f82-93eb-be174d8ba518)

## Recommendation

1. **Ship disappear, not fade.** Disappear costs one `setTimeout` (cleared in `release` and `session_shutdown`), one repaint, and `warning` via `variableFg`. Fade costs an interval cadence firing N whole-tree repaints (each re-sampling `getContextUsage` and statuses), has no public theme background for `mixColors`, quantizes on 256-colour terminals, and breaks under `variableFg` when a user sets `style.fg`. Defer token-step fade unless Joel asks for it at his live check.

2. **One notice at a time (newest replaces); no queue.** Keep one slot and one timer. When one `message_end` yields both dropped-thinking and cache-miss, evaluate in pi's order (`thinking-drop` then `cache-miss`) in memory so `cache-miss` wins with one timer and one repaint; mark with a `shortcut:` comment.

3. **Option `seconds`: default `5`, integer `1..60`.** Naming the key `seconds` removes ms/s ambiguity; `1` rejects zero-duration flash churn (omitting `notice` from `rows` is the off switch); `60` fails loud if someone types `5000` thinking milliseconds. Run `readConfiguration` before `feedSessionData` in `startup.ts` so the root passes `visibleMs` into the store without coupling `data/` to `configuration.ts`.

4. **Copy pi's full 4-kind rule in one pure module; catch drift with pinned constants and boundary tests.** Ride `scanTotals` in one pass (keeping `kind: "cache_warm"` updating `prev` and compaction/branch_summary resetting `prev`), copy `1024` floor, `20k`/`$0.10` gate, `5m` TTL, `modelRegistry.find` fallback, thinking-drop branch delta, and pi's 5-line `formatTokens`/`~$X.XX`.

5. **Fix delta specs before `design.md`:** change impossible `125.3k` (`125,300` tokens) examples in `specs/statusline/spec.md` to `125k` (plus `1 thinking block` singular), remove its hedged fade clause, fill in `seconds` (`5`, `1..60`), and add dropped-thinking branch-delta, `cache_warm` `prev`-update, and newest-replaces scenarios to `specs/session-data-store/spec.md`.

## Evidence

- Fade requires repeated whole-tree repaints re-sampling host data, lacks a public theme background for mixColors, and collides with user style.fg precedence over variableFg; disappear takes one setTimeout and one repaint. [owner-rulings.md:7-10; michael-orientation.md §1, T8, §3.1; research-chidi.md §5; research-eleanor.md §1, §5]
- startup.ts:36-60 runs feedSessionData before readConfiguration, and configuration.ts keys instrument options once under instruments.notice, never per cell. [research-eleanor.md Addendum 1; michael-orientation.md D-a, T5, T6]
- pi's formatTokens rounds >=10,000 to whole k (20,000 -> 20k, 125,300 -> 125k), formats cost as ~$X.XX (>=0.01), singular/pluralizes thinking block/blocks, gates drops against the previous assistant message, and updates scan prev on cache_warm entries. [research-chidi.md §1, Addendum 1 §1-§2; research-eleanor.md Addendum 1; specs/statusline/spec.md:12,40-75; specs/session-data-store/spec.md:18-99]

## Assumptions

- (verified) pi's ctx.modelRegistry.find(provider, model)?.cost.cacheRead returns the same Model cost object as ModelRuntime.getModel in 1.4.0 and 1.5.2.
- (verified) Instrument options are configured once under instruments.notice rather than per cell, so one notice duration governs the store.
- (unverified) readConfiguration in startup.ts:36-60 has no dependency on feedSessionData outputs and can run before store creation (startup.ts not read directly).
- (unverified) A 5-second default and 1..60-second bounds fit live reading until Joel checks them live.
- (unverified) One timer-driven expiry repaint per notice has negligible terminal render cost in tmux and 256-colour modes (not measured).

## Risks

- If specs/statusline/spec.md keeps 125.3k for 125,300 tokens while requiring pi's formatTokens (which outputs 125k), no implementation can satisfy both clauses at PL4/PL7.
- If specs/session-data-store/spec.md omits pi's branch-delta guard on thinking_dropped, one historical drop re-fires Anthropic dropped N thinking blocks on every later assistant turn.
- If scan skips kind: 'cache_warm' usage entries because warm notices are hidden, the turn after a background warm compares against the pre-warm turn and miscomputes missedTokens and idleMs.

## Confidence

high: Evidence and bounded addenda verified pi 1.4.0/1.5.2 templates, modelRegistry price parity, startup/config wiring, and two blocking delta-spec defects.

## Challenge claims

- Fade triggers N whole-tree host re-samples per notice even when no notice cell is placed, and token-step fade via variableFg fails whenever a user configures instruments.notice.style.fg.
- Reusing Jefferson's compactCount (20,000 -> 20.0k) or cost.ts ($0.410) breaks transcript parity with pi's formatTokens (20k) and ~$0.41 suffix right at the 20k miss gate.
- specs/statusline/spec.md asserts 125.3k for 125,300 tokens across six scenarios, an output neither pi's formatTokens nor Jefferson's compactCount can produce (125k).

## Owner decisions


## What would change my mind

- Proof that fade avoids N full-tree host re-samples and cleanly steps user-configured style.fg without new format.ts machinery.
- Session evidence that real turns drop actionable notices often enough within 5 seconds to justify queue state and stale-notice rules.
