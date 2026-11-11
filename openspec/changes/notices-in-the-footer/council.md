# Council Synthesis

## Question and Scope

Joel's 2026-11-10 ruling (`owner-rulings.md`) moves the notices pi draws into the chat transcript
into Jefferson's footer, each visible for a time he configures and then faded out or disappeared. He
named two endings and left the choice open, so the council settles it before the design starts. Two of
his rulings already fixed scope. Placing the instrument is the switch, and Jefferson never reads pi's
`showCacheMissNotices`, so a user who turns pi's setting on sees both lines. Cache warm is left out.

The council was asked six things. Which ending ships? Do notices queue? What are the option's key,
unit, default and bounds? Where does the store get the visible time? How much of pi's rule is copied,
and what catches its drift? Are the delta specs fit to design from?

What it read: `research-chidi.md` and its Addendum 1 for pi's notices, events, data and formatters;
`research-eleanor.md` and its Addendum 1 for the codebase, configuration, options and existing
formatters; `michael-orientation.md` for traps T1–T10 and decisions D-a and D-b; `proposal.md` and
`specs/**`.

Five constraints bound it. pi's rule cannot be imported (T2), and pi offers no hook to suppress its
transcript notices (T1). A completed cache warm fires no event (T4). Nothing reads the terminal or
shells out (2026-11-05 ruling). An instrument may not subscribe or read host data (living statusline
spec, `:348-353`).

## Perspectives & Trade-offs

**Where the two advisors agreed.**

- **Disappear, not fade.** A fade costs a cadence of whole-tree repaints that each re-sample the host,
  the theme exposes no background for `mixColors` to mix toward, 256-colour terminals quantize the
  ramp, and a concrete-colour fade collides with a user's configured `style.fg`. Disappearing costs
  one `setTimeout` and one repaint (`council-neil-pass1.md` recommendation 1; `council-matt-pass1.md`
  recommendation 1; `research-chidi.md` §5; `michael-orientation.md` T8). Both would revisit a
  token-step fade only if Joel asks at the live check.
- **One notice at a time, newest replaces, and the replacement clears the pending expiry**, so the new
  notice runs its whole visible time from its own arrival rather than being cut short by the previous
  notice's deadline (`council-matt-pass1.md` recommendation 2; `council-neil-pass2.md` N5;
  `specs/statusline/spec.md` visible-time requirement).
- **In a same-message collision the miss wins.** pi draws the dropped-thinking notice first and the
  cache miss second, so the miss is the line that stays and the thinking notice is lost
  (`research-chidi.md` §1, IM:3010-3011; `michael-orientation.md` T10).
- **Copy pi's whole rule.** The spec promises "the turns pi's transcript notice would flag and for no
  others", and a partial copy cannot keep that promise (`council-matt-pass1.md` challenge claims;
  `council-neil-pass1.md` recommendation 4).
- **Drift is caught by boundary tests on Jefferson's own module, a `shortcut:` comment and a stated
  risk**, not by a test that reads pi's files.

**Where the two disagreed, and how it landed.**

- **The default.** Neil proposed 5 seconds in pass 1 and moved to 10 in pass 2. `message_end`,
  `session_compact` and `session_tree` all coincide with fresh transcript output or a full chat rebuild,
  and that holds the user's eye before they glance down at a ~68-column notice
  (`council-neil-pass2.md` N1). Matt's pass 1 held that neither 5 nor 10 has a source in the evidence,
  so the design should state one as an assumption for Joel's live check; he leaned 10
  (`council-matt-pass1.md` owner-decision; `council-matt-pass2.md` M1). Both ended at 10, and both call
  it Joel's to judge.
- **Whether a test may read pi's `dist` files.** Matt proposed one in pass 1 that asserted each copied
  constant in `cache-stats.js` and `interactive-mode.js`. Neil rejected it in pass 3 on three grounds:
  Michael's tasks and implementation gates refuse "a behavioral assertion about the application, not a
  library", the `status.ts:12-14` precedent already accepts silent drift, and the test fails on pi
  re-bundling while staying green when Jefferson's own gate is deleted (`council-neil-pass3.md` D1).
  Matt accepted and withdrew it (`council-matt-pass3.md` D1).
- **Two `notice` cells with different times.** Matt proposed rejecting a document that named two
  visible times. Eleanor's Addendum 1 showed a cell accepts only `instrument` and `align`, while
  options are configured once per instrument name, so two `notice` cells necessarily share one value
  and the rule guards an unreachable state; Matt withdrew it (`council-matt-pass2.md` M2;
  `council-neil-pass2.md` N2; `research-eleanor.md` Addendum 1).
- **Which formatter draws the count.** Neil challenged reusing Jefferson's `compactCount` and
  `cost.ts`, and Matt's M3 settled it: `compactCount` draws `20.0k` where pi's `formatTokens` draws
  `20k`, and `cost.ts` draws `$0.410` where pi's suffix is ` (~$0.41)`, so the notice copies pi's
  formatter and suffix under pi-named constants and leaves the existing formatters alone
  (`council-matt-pass2.md` M3; `research-chidi.md` Addendum 1 §1; `research-eleanor.md` Addendum 1,
  Existing compact-token and USD-cost formatters).

## Synthesis & Recommendation

The position, stated plainly: ship the smallest version that shows the notices and expires them, and add
nothing that needs a cadence until Joel sees it live. The council recommends that version, and the
deliverables below carry it:

- **The notice disappears when its time is over.** No fade, no cadence, no colour maths; the spec's
  "A fade, if the change ships one, MAY…" clause goes, because a clause that leaves a decision open in
  a spec is code for later (`council-matt-pass1.md` recommendation 1).
- **One slot and one timer.** A newer notice replaces the shown one, clears the pending expiry and runs
  its full time from its own arrival; a same-message collision keeps the miss.
- **The option is `seconds`**: a whole number from 1 to 60, default 10, rejected outside the bounds the
  way `rowGap` is rejected. `1` refuses a notice that never shows, the upper bound keeps one timer's
  delay inside a Node timer's range, and omitting the cell from `rows` is the off switch
  (`council-matt-pass1.md` recommendation 3; `research-eleanor.md` §4).
- **The composition root passes the value to the store**, so `data/` names no configuration module, on
  the D-a seam that already supplies `homedir` and `requestRender` (`council-matt-pass2.md` M5;
  `michael-orientation.md` §1).
- **pi's rule is copied whole**, each constant in one named place with pi's file and line, and that
  includes `formatTokens` and the ` (~$X.XX)` suffix.
- **Drift is caught by boundary tests on Jefferson's pure notice module, a `shortcut:` comment naming
  the pin, and a risk the design states.** No test reads pi's files.
- **Nothing is subscribed and no timer runs unless a row places a `notice` cell**, so a document that
  renders as it does today incurs no `message_end` scan and no timer-driven repaint
  (`council-neil-pass2.md` N3).
- **The delta specs are corrected before the design**: `125.3k` becomes `125k`, the singular
  `1 thinking block` and the 10,000-to-100,000 edge get scenarios, the fade clause goes, the visible
  time becomes `seconds`, and the new collision, replacement, delta, warm-entry and gating scenarios
  are added (`council-neil-pass1.md` recommendation 5; `council-matt-pass2.md` M4).
- **One point is left for the design.** Passing the value at the root needs `readConfiguration` before
  `feedSessionData`, and the evidence that `readConfiguration` reads nothing the feed creates is not in
  the reports (`council-matt-pass2.md` M5).

Why it is this size: every input is pi's, the miss detection rides the leaf-keyed scan the store already
makes, and the whole of it is one instrument, one datum, one timeout cleared in the existing release,
one bounded option and pinned constants.

Joel ruled after this synthesis that the notice's text is a format the user can configure, which
supersedes the council's fixed-text premise; the ruling and what it changes are recorded below.

## Accepted & Rejected Feedback

1. **Disappear only, and the statusline spec's fade "MAY" clause removed — accepted.** A clause left in
   a spec keeps the decision open, and disappearance satisfies Joel's "fade out or disappear"
   (`council-matt-pass1.md` recommendation 1; `council-neil-pass1.md` recommendation 1).
2. **One notice at a time, newest replaces, and a replacement resets the pending expiry — accepted.**
   Without the cleared expiry, a notice arriving 8 seconds into a 10-second notice disappears 2 seconds
   after it appears (`council-matt-pass1.md` risk; `council-neil-pass2.md` N5).
3. **In a same-message collision the miss wins and the thinking notice is lost — accepted.** The order
   is pi's own, and resolving it in memory before scheduling keeps one timer and one repaint
   (`council-neil-pass1.md` recommendation 2; `council-matt-pass1.md` recommendation 2b).
4. **An integer `seconds` option, 1..60, default 10 — accepted.** The key names its unit, `1` refuses a
   notice that never shows, and the 60-second ceiling catches a value typed in milliseconds. Neil's
   pass-1 default of 5 gave way to 10 in pass 2, on the evidence that the events coincide with
   transcript output (`council-neil-pass1.md` recommendation 3; `council-neil-pass2.md` N1;
   `council-matt-pass1.md` recommendation 3).
5. **No subscriptions and no timer when no `notice` cell is placed — accepted.** Placing the instrument
   is the switch; without the gate a default document would scan session entries on every `message_end`
   and fire a timer-driven repaint for an invisible datum, breaking "renders as it does today"
   (`council-neil-pass2.md` N3; `council-matt-pass1.md` recommendation 4, last paragraph;
   `proposal.md` "No breaking change").
6. **The store gets the visible time from the composition root — accepted.** The option sits on the
   declaration and the expiry runs in the store, and the root is the only place that can join them
   without `data/` importing configuration (`council-matt-pass1.md` recommendation 3;
   `council-matt-pass2.md` M5; `michael-orientation.md` §1 D-a).
7. **pi's whole miss rule copied, including `formatTokens` and the ` (~$X.XX)` suffix, with each
   constant in one named place with pi file:line provenance — accepted.** The rule and its formatters
   are unexported, and the spec's "for no others" cannot be met by a partial copy
   (`council-neil-pass1.md` recommendation 4; `council-matt-pass2.md` M3; `research-chidi.md`
   Addendum 1 §1; `michael-orientation.md` T2).
8. **Drift handled by boundary tests, a `shortcut:` comment and a stated design risk, not by a test
   that reads pi's files — accepted.** The scraping test fails the tasks and implementation gates,
   breaks on pi's bundling, and stays green when Jefferson's own gate is deleted; it also catches only
   a deliberate pin bump, which the comment already names (`council-neil-pass3.md` D1;
   `council-matt-pass3.md` D1; `michael-orientation.md` T2).
9. **The two-cell conflict rule — rejected.** A cell carries only `instrument` and `align`, so two
   `notice` cells share the one configured value and the rule guards a state that cannot occur
   (`council-neil-pass2.md` N2; `council-matt-pass2.md` M2, withdrawing it).
10. **Reordering `readConfiguration` before the feed — carried to the design as a question, not ruled.**
    Today `feedSessionData` runs before `readConfiguration`, so the store cannot be given the value
    when it is built. Whether `readConfiguration` reads anything the feed creates is not in the
    evidence: it validates style against the live theme, and where that theme comes from at that moment
    is not recorded (`council-matt-pass2.md` M5; `research-eleanor.md` Addendum 1,
    `startup.ts:36-60`).

## Michael's Rulings

None. The passes left no dispute open: the only one standing after pass 2 was the drift test, and Matt
accepted Neil's rejection of it in pass 3 (`council-matt-pass3.md`). Nothing reached Michael, so there
is no ruling of his to record.

## Owner Decisions Required

None. The 10-second default and the 1..60 bounds are the design's proposal, not a ruling: he judges
them at the live check his 2026-11-10 ruling already asks for ("Let's /skill:conductor-janet that thing
up. I'd love to see it in action!!!", `owner-rulings.md`), and `proposal.md` Open Questions carries
them. They cost one constant to change, so nothing about the design waits on them.

## Joel's Ruling After the Council

On 2026-11-10, after the council converged, Joel ruled that the notice text is configurable rather
than localized: *"rather than provide localization I'd like the strings to be configurable. we should
provide variables for the values and allow string formatting for this purpose."* Each notice's words
are a format the user configures, the values in it are variables, the defaults read as pi's English
text, and no translations ship (`owner-rulings.md`, "2026-11-10: After the council").

It **supersedes this council's "a notice's text is pi's text" wherever the two differ**: pi's text is
now the default a format renders, and the instrument fixes no string. Two things survive unchanged.
The default text for every kind is pi's text exactly, and a variable's value keeps pi's formatting.
That is why the copied `formatTokens`, the ` (~$X.XX)` suffix and their drift handling stay (Accepted
& Rejected Feedback 7 and 8). What the ruling hands to the design: whether the shape is one format per
kind or another arrangement, the variable names, and how the miss variants are expressed
(`proposal.md` Open Questions).
