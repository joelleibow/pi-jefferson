**Reviewed head:** `f3e871293a21ad88f2fd3807711f8835440d2150`. That is the PR head from `gh pr view`, and the checkout matches it. `pnpm test` ran here and passed 424 of 424.

**What this change does:** It adds a `notice` footer cell. The cell shows pi's cache-miss, compaction, branch-summary and dropped-thinking notices for a configurable 1–60 seconds, then goes blank. The store stamps each notice with an expiry time and sets one timer for it. A small pure `timed` visual decides whether the cell shows or hides. The text of each notice kind is a user-editable format. The format escape rule is widened so `\m` renders `m`. I assumed a single user running one TUI session.

I checked these against pi's own source in `node_modules` and they hold:
- pi's miss rule is copied faithfully.
- The copied display gate, cost suffix and thinking-drop delta match pi's.
- pi calls extensions' `message_end` handlers before it persists the message, so scanning `getEntries()` there matches pi's own scan.
- Notice subscriptions are released with the feed's others, and the timer is cleared on dispose.

## Should fix

1. **An empty notice text leaves a bare `Notice:` on screen** (`extensions/jefferson/components/instruments/instrument-binding.ts:L43-50`)
   - **What this is:** The user can write each kind's text in `formats`. The bound render resolves the chosen text and passes it to `resolveFormat` as the `$notice` value.
   - **Problem:** The empty string is not "nothing to show". The cell only drops its label when a value is `undefined`. I ran this against the repo (in `/tmp`, nothing written to it) with a miss notice held and `formats.miss` set to `""`, `"   "` or `"$idle"`. `$idle` has no value on a plain miss. All three rendered `"Notice: "`, the label plus its gap and no text. A user who silences one kind with `"formats": {"compaction": ""}` gets a lone `Notice:`, in a different style from the notice text, for the full `seconds` on every compaction. The row also re-seats around it. The spec says the cell renders nothing, label included, when there is no notice to show.
   - **Fix:** When the resolved plain text is empty, treat the notice as absent. After `resolvePlain(...)`, `return ""` from the render if the result is `""`. Add a test with `formats.miss: ""` that expects `""`.
   - **If we skip it:** Silencing a kind is a natural use of `formats`. It will show a stray `Notice:` each time instead.

## Nice to have

2. **Nothing requests a repaint when a notice arrives** (`extensions/jefferson/data/session-data-store.ts`, `showNotice` at about L135-142)
   - **What this is:** The other store pushes (`modelSelected`, `sessionNamed`, `turnEnded`) call `requestRender` when their value changes. `showNotice` stores the notice and arms the expiry timer but never asks for a render.
   - **Problem:** It works today only because pi's UI repaints after `message_end`, `session_compact` and `session_tree`. Extensions run before UI listeners, so the notice is already held when that repaint happens. I did not observe this live, and the PR says the live footer is unchecked. If a host path stores a notice with no UI repaint, the notice appears late or only when something else repaints. In that case its `seconds` are already running down.
   - **Fix:** Call `requestRender?.()` at the end of `showNotice`. The tests that count repaints at expiry would need one more repaint for the arrival.
   - **If we skip it:** It is probably fine. The risk is a late or missed notice in an event path pi has not exercised yet.

Verdict: fix 1 first, then ship. Finding 2 is optional.

Lean: no lean findings.

Not checked: the live footer render and the actual repaint order in pi 1.5.2 (I read the 1.4.0 pin in `node_modules`). I also did not read the PR's checks scripts or the full 28-file tarball.
