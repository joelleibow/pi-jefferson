## Verification Report: notices-in-the-footer

Using change: `notices-in-the-footer`, schema `marbleization`. Branch `notices-in-the-footer`, PR #22, head `f3e871293a21ad88f2fd3807711f8835440d2150`. That is the same commit the brief names, and `gh pr view` confirms it at the time of reading. The tree was clean and I wrote nothing. For `tarball.sh`, which makes a scratch directory beside itself, I ran a copy from `/tmp` and deleted it.

### Summary

| Dimension | Status |
|---|---|
| Completeness | 82/83 tasks. The one open box is 9.7, Joel's live check, as intended. All 19 ADDED/MODIFIED requirements are implemented. |
| Correctness | 19/19 requirements covered. 62 of 63 scenarios have a code path and a test. The remaining one, "Nothing is asked of the host", is covered only by the store's structure. |
| Coherence | Design decisions D1–D11 are followed. One stale ADR body and one cosmetic point. |

The 19 requirements are 3 MODIFIED and 16 ADDED across `extension-source-layout`, `session-data-store` and `statusline`. No REMOVED or RENAMED requirements exist.

### Check scripts, run against `f3e8712`

| Script | Result |
|---|---|
| `suite.sh <repo> 424` | `pnpm typecheck` clean. 424 passed, 0 failed, matches the expected count. PASS |
| `imports.mjs <repo>` | 28 files, 52 edges, no problems. PASS |
| `terminal.sh <repo>` | No spawn or terminal read under `extensions/`. PASS |
| `tarball.sh <repo> 28` | 28 source files shipped, 28 tracked, no test file, entry intact. PASS |
| `specs.sh <repo> notices-in-the-footer` | `openspec validate --strict` is valid. Longest paragraphs are 472, 386 and 480 characters, none over 500. PASS |
| `testdiff.sh <repo> b9668d9` | The 3 removed assertion lines are the shipped-declarations expectations that 4.7 names. |
| `testdiff.sh <repo> 0d6cd85` | 21 removed assertion lines, matching 9.5's account. Each is a shipped fact that moved: no store-side hiding, `shownUntil`, bare `$idle` and `$blocks`, `thinkingOne`. |
| `scope.sh` | Not run. It needs per-group base and head SHAs that the brief doesn't give. |

### Completeness

- **Task completion:** 82 of 83 tasks are done. The only open box is 9.7 at `tasks.md:1434`, which the brief says is meant to stay unticked.
- **Spec coverage:** every ADDED and MODIFIED requirement has an implementation. The main ones:
  - **Timed visual:** `components/visuals/timed.ts:7-14`.
  - **Notice instrument:** `components/instruments/notice.ts`.
  - **Format language:** the generalised escape at `format.ts` (the `\` branch), plain mode, `resolvePlain`, and the pre-resolved parameter.
  - **Configuration:** `seconds` and `formats` are read, and `noticeSeconds` is derived from the installed rows. See `configuration.ts` `readInstruments` and `normalizeDocument`.
  - **Store:** the slot, the stamp, one timer, re-arm on early fire, and release. See `session-data-store.ts` (`showNotice`, `armExpiry`, `dispose`).
  - **Feed:** the three events are subscribed only while `noticeSeconds !== undefined`, and the subscriptions are released with the others.
  - **Startup:** `startup.ts` reads configuration before building the feed, supplies `performance.now` and `setTimeout`, and registers `session_shutdown` to run the release.
  - **Pi's rule:** `data/notice.ts` is a faithful copy.

### Correctness

I compared `data/notice.ts` line by line with the installed pi `core/cache-stats.js` and `interactive-mode.js`. They agree on:
- the miss guard and the noise floor of 1,024;
- the paid and read per-token rates, including the cache-read price fallback;
- the idle measured start to start, and the model-change key;
- the resets at a compaction and a branch summary, and the cache-warm entry becoming the previous request;
- the display gate of 20,000 tokens or $0.10, and the cost suffix at $0.01;
- the thinking-drop count and delta, read from `getBranch()`;
- the variant precedence of model switch, then idle, then plain;
- the compaction and branch-summary token sum.

The `shortcut:` pin comment is present.

The default texts, `20k` versus `compactCount`'s `20.0k`, bare `$idle` and `$blocks`, the `thinkingOne` kind and the `$idle\m` escape all match the spec's scenarios. Each is pinned by a named test. Examples:
- **Dispose and shutdown:** a post-release `message_end` takes no notice, and `session_shutdown` runs the release.
- **Thinking delta:** it reads the branch, not the entries.
- **Collision and replacement:** the miss wins a collision, and a newer notice replaces the shown one.
- **Row seating:** the row's re-seat beside a fill cell is covered.

### Coherence

- **Design adherence:** D1 to D11 are followed as written, including the `session_shutdown` release. For D4, `readConfiguration` has no dependence on the feed or the store, so the reorder is safe.
- **Pattern consistency:** one instrument file plus one `shipped.ts` entry, a visual that imports nothing, and the clock named only in `startup.ts` all follow `AGENTS.md`. There is no `enum`, and every relative import carries `.ts`.

### Issues

**CRITICAL:** none.

**WARNING:** none.

**SUGGESTION:**

1. **ADR 0011's body describes behaviour the code no longer has.**
   - **Location:** `docs/adr/0011-the-store-keeps-time-on-an-injected-clock.md:47-49`. It reads "The clock decides everything … and drops the notice when a read begins at or past it." Its alternatives list at `:35` rejects "Dropping the notice at sample time". Its consequences section at `:69-71` has the same assumption.
   - **Evidence:** `session-data-store.ts` never drops a notice. `armExpiry`'s callback only requests a repaint. `sample()` spreads the notice unconditionally, and `timed.ts` hides it.
   - **Reading of the ADR rules:** ADR 0013 "narrows" it and says 0011's body is not edited. That fits a record that had already been accepted. Here both ADRs are new in this same unmerged PR, so 0011 describes an intermediate design.
   - **Recommendation:** add a one-line pointer to its Status line, for example "Narrowed by ADR 0013: the hiding moved to the timed visual." That is not an edit to the decision.

2. **Scenario "Nothing is asked of the host" has no direct assertion.** Under "A notice's instant requests exactly one repaint", the callback calls only `requestRender`. Its guarantee comes from the code's structure, not from a test that fails if the callback read the host. I found no direct test naming the scenario. Severity is low because the test names suggest the one-repaint and early-fire tests cover the behaviour, and the code is a three-line callback.

### Final assessment

No critical issues found in the checks that ran. 2 suggestions to consider. All 83 tasks are ticked except 9.7, which is Joel's live check and stays open by design.

The verdict still depends on 9.7 and on the check below, which I could not run:
- **Live behaviour:** I did not observe a real pi session. The real `setTimeout`, the real TUI repaint, `ctx.reload()`, pi 1.5.2's behaviour against the 1.4.0 pin, the 10-second default and the absence of a fade are all unverified.
- **`checks/scope.sh`:** not run, because it needs each group's base and head SHAs.

Not checked: `scope.sh`'s per-group boundaries; pi 1.5.2 behaviour; any live, real-clock or render-cost property; whether the README and `ARCHITECTURE.md` match the code beyond a grep and a read of the diff.
