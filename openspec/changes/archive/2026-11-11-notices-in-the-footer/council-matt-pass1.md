# matt-p1 (60f2ee02-b227-47f1-913b-603e6157c065)

## Recommendation

1. Ship disappear only. Either ending satisfies Joel's "fade out or disappear". Disappear costs one timeout and one repaint. A fade costs a timed cadence of whole-tree repaints and a colour ramp, and the theme gives no background colour to mix toward. Remove the statusline spec's "A fade, if the change ships one, MAY…" clause. It is code for later, and it leaves the decision open in a spec. A token-step fade can be a later change if Joel asks for one at the live check.
2. One notice at a time, newest replaces. Add two scenarios the specs lack. (a) A new notice clears the pending expiry and runs its full visible time from its own arrival. Without this, the old timer clears the new notice early. (b) When one `message_end` carries both a dropped-thinking notice and a miss, pi draws the thinking notice first and the miss second, so the miss is what stays. State that the thinking notice is lost in this case.
3. The visible time is a whole number of seconds, in a key that names its unit (e.g. `seconds`). Default 10, accepted 1..60, checked the way `rowGap` is checked. Reject 0: it would place an instrument that never shows anything. An upper bound is required, not taste: past about 24.8 days a Node timer does not wait. Fix one gap in the spec: the option sits on the instrument's declaration, but the expiry runs in the store, and a document can place two `notice` cells with different times. Make that document fail with an error that names both values. The composition root passes the one value to the store.
4. Copy pi's whole rule. The spec promises "the turns pi's transcript notice would flag and for no others", so copying only part of the rule would break it. The copy is:
- the 1024-token noise floor and the 20k-token / $0.10 display gate;
- the 5-minute TTL, measured start-to-start;
- the resets at compaction and branch summary;
- a cache-warm entry becoming the previous request;
- the first-turn and zero-cache guards;
- the `cacheRead===0` price fallback;
- model change taking precedence over idle;
- skipping aborted and errored messages;
- the thinking-drop count delta.
Each constant gets one named home with pi file:line provenance. To catch drift, add a test that reads the pinned pi `dist` files (`cache-stats.js`, `interactive-mode.js`) and asserts each copied constant and gate. It fails when the pin moves and pi has retuned. The comment for this is `shortcut: copies pi 1.4.0's rule; drift in the user's global pi between pin bumps is invisible, re-check on every pin bump`.
Spec changes before design: add the thinking-drop delta scenario, add the singular-text scenario for n=1 quoted from pi's source, and decide whether the notice subscriptions and timer run when no `notice` cell is placed. I would pick no: placing the instrument is the switch.

## Evidence

- Fade has no theme background to mix toward; disappear is one timeout [research-chidi.md §5; michael-orientation.md T8]
- One message_end can carry a thinking-drop and a miss, thinking first [research-chidi.md §1 IM:3010-3011; michael-orientation.md T10]
- The dropped-thinking notice shows only if the count exceeds the branch's last persisted assistant message [research-chidi.md §1 table, IM:3501-3523]
- A cache-warm usage entry becomes prev; compaction and branch summary reset [research-chidi.md §1 scan, cache-stats.js:59-76]
- The rule cannot be imported: exports are only . and ./rpc-entry [michael-orientation.md T2]
- Bounded-integer precedent rejects the whole document [research-eleanor.md §4, configuration.ts:253-265]
- The proposal puts the option on the declaration and the expiry in the store [proposal.md What Changes; specs/statusline visible-time requirement; specs/session-data-store expiry requirement]

## Assumptions

- (unverified) Node timers past 2^31-1 ms fire almost at once (from Node's documentation, not the research)
- (unverified) A test may read pi's installed dist files, since the 2026-11-05 ruling governs runtime
- (unverified) pi's thinking-drop text for n=1 is singular
- (unverified) ctx.modelRegistry.find returns the same prices as pi's ModelRuntime
- (unverified) Jefferson has or can reuse a token formatter matching pi's formatTokens
- (unverified) The configuration is read before the store is created, so the root can pass the visible time
- (unverified) Default of 10 s and bounds of 1..60 s are my judgment for Joel's live check

## Risks

- Without the cleared expiry, notice A at t=0 and notice B at t=8 with a 10 s visible time: A's timer hides B at t=10
- Without the thinking delta, each later turn whose diagnostics repeat the earlier drops shows the notice again, which pi does not
- Two notice cells set to 5 and 30: the store's single expiry gives one of them the wrong time
- pi 1.5.2 or later retunes the 20k gate: Jefferson's notice fires on different turns, and nothing fails until the pin moves

## Confidence

medium: The pi facts are well cited. The Node timer limit, the n=1 text and the config wiring order are unverified.

## Challenge claims

- Copying part of pi's rule cannot satisfy the spec's 'for the turns pi would flag and for no others'
- A fade 'MAY' clause in the spec is code for later and leaves the decision open
- The visible time on the declaration plus a single expiry in the store is ambiguous when two notice cells are placed

## Owner decisions

- The default visible time and bounds (10 s, 1..60): the design proposes them and Joel judges them at the live check

## What would change my mind

- Evidence that pi's thinking diagnostics are per-message rather than cumulative would make the delta scenario cosmetic
- Evidence that the store cannot receive configuration from the root would favour moving the visible time to a document-level option
- Joel asking for a fade at the live check
