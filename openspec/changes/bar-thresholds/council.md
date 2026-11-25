# Council Synthesis

## Question and Scope

**The design question.** A bar's colour is fixed in code today: `context`'s bar turns `warning`
strictly above 70 and `error` strictly above 90, copying pi 1.4.0's footer. The change makes the
bar's state a user setting — a `thresholds` list of `activeAt` percentages, each setting an
instrument's format, label, style and the new `fill`, with the boundary at `>=` — and keeps the
drawing where it is. How that list is read, layered, reported and bound is what the council was asked
to stress before a design exists.

**Constraints that bind it.** `owner-rulings.md` 2026-11-25 (the `>=` boundary, the 70/90 defaults,
four thresholds at most, integer `activeAt` 0 to 100, unknown as 0, duplicate `activeAt` rejecting,
opt-in by name for providers, a threshold's keys meaning what they mean at the top level) and
2026-11-16 (only a variable the format names may blank an instrument); ADR 0020 (a declared variable
the format does not use is never resolved); ADR 0015 (`row` and `instrument` are the only words a
user reads); `AGENTS.md` (a fix rather than a hack, strict and loud at contract boundaries, one fact
in one place, the width-0 rule); `extension-source-layout` ("The bar has its own file").

**Evidence inputs.** `proposal.md` and the two deltas (`statusline`, `extension-source-layout`) as
they stood before this synthesis; `research-chidi.md` (Starship's thresholds, JSON number edges, the
warning channels); `research-eleanor.md` (where a bar's colour, `fills`, the settings readers and the
fault ledger live); `michael-orientation.md` (the decisions in play and the traps). Seven lens
reports: `council-zoom-out.md`, `council-critic.md`, `council-structural.md`, `council-readiness.md`,
`council-codebase.md`, `council-comprehension.md`, `council-catalyst.md`.

**What this synthesis did beyond summarizing.** Michael settled every contradiction and open
question in `michael-council-rulings.md`. Those rulings are carried into `proposal.md`, the
`statusline` delta and the `extension-source-layout` delta, and into a new
`instrument-registration` delta. Each ruling's landing place is listed under "Michael's Rulings".

## Lens Findings & Trade-offs

**zoom-out (ZO-1, ZO-2, major).** The structure is right — the reader, the shared binding and the
standalone visual already own the responsibilities this change needs — but two requirements had
drifted from the rulings: the delta made `bar` alone grant or require `thresholds` and `fill`, erasing
the opt-in boundary, and its fifth-threshold scenario expected the top-level settings where the
fourth-lowest threshold still applies. No new dependency or general state-machine abstraction is
warranted.

**critic (CR-1 blocking; CR-2 to CR-6 major; CR-7 to CR-12 minor).** Same fifth-threshold
contradiction, blocking; same opt-in drift; then five gaps: when the bar's reading is taken at all,
a missing `instrument-registration` delta for a faulting `bar` read only to choose a state, no
requirement that one reading serve the state, the `fills` probe and the drawing, no stated layering
order among the four style layers on the fill, and unspecified input edges (wrong-shaped list or
entry, unknown keys, `-0`, an over-four count that includes entries above 100). Smaller: options a
threshold may carry, rollback and version skew, and two requirements whose Source no longer matched
what they say. Economics are fine: at most five parsed states per instrument.

**structural (struct-1 blocking; struct-2 major; struct-3 to struct-7 minor).** The opt-in drift
appears in three places at once (the ADDED declaration requirement, the opening of the ADDED state
requirement, and the MODIFIED provided-options requirement), and the "instrument without a bar"
scenario stated Jefferson's whole-document rejection as the outcome for a provider too. It also found
two edge semantics with no stated precedence (the over-four count; a duplicate `activeAt` above 100),
the `formats` layering depth unstated, the provided-settings check list not extended, and the Impact
inventory short of `docs/instruments.md` and the shipped-options pin. It put the two edge semantics to
the owner, with recommendations.

**readiness (F1 to F13).** The deltas are close to design-ready: migration and version skew are
unrecorded; the defaults' reach into a provider's bar and their layering over a top-level `fill` are
unstated; the over-four count is ambiguous where entries above 100 appear; malformed shapes have no
scenarios; per-state binding of segments, label gap, composed choice and `fills` is undeferred to
nobody; a faulting provider `bar` has no scenario; the over-four warning's cardinality and silence
conditions are unstated; and the test list names no failing-first order. It put the defaults' reach
and layering to the owner, recommending yes to both.

**codebase (CB-01 to CB-10).** Send this to design rather than back to the proposal: every current-state
citation lands where the proposal says. The defects are in what the deltas leave unstated — "only the
fill's colour comes from the state" contradicts `fill` taking `style`'s attributes; a plan-time read of
a provider's `bar` has no containment rule while `containProvided` wraps `render` only; the over-four
warning cannot be one channel because a late registration can only reach the fault ledger; style
validation's fixed sentences would name `style` when the user wrote `fill` and cannot name a threshold's
position; and Impact is short by two source files and two pin tests. Its correction to the proposal's
premise about where the defaults can live is right: the visual import rule runs one way, and the real
constraints are the delta's sentence and the `drawBar` export pin.

**comprehension (C1 to C5).** The contradictory fifth-threshold example and the inconsistent provider
opt-in are the two a reader cannot resolve from the artifacts; then the unknown-versus-null reading
states, the style-versus-default precedence, and the unresolved `formats` depth. It read only the
proposal and the two deltas, and says so.

**catalyst.** No finding: it found no false compromise in the artifacts. Its three checked assumptions
hold — the state is chosen independently of width and without resolving an omitted `$bar`; drawing
stays in the visual while defaults and state selection live outside it; and a shared threshold reader
keeps the two failure scopes distinct.

**Across the lenses.** Five lenses (zoom-out, critic, structural, comprehension, readiness) found the
opt-in drift; three (zoom-out, critic, comprehension) the fifth-threshold contradiction; four the
over-four count; four the malformed-input surface; three the Impact inventory, with three different
lists; two migration, and two the warning path, with two incompatible fixes. Those contradictions are
what Michael settled.

## Synthesis & Recommendation

**Direction.** The change keeps the responsibilities the codebase already has: one threshold reader
serving both settings paths, the shared instrument binding, the standalone visual that draws what it
is handed, and the fault ledger that already deduplicates. No new dependency, no state-machine
abstraction, no second list of the options a state may carry. The deltas now state the behaviour
once each; the design closes five mechanism questions — where the defaults live, each state's bound
form, one reading per sample chosen inside the provider boundary, the over-four warning's one
sentence through the ledger, and the complete file map. Rollback and version skew are the design's
Migration Plan, not a spec change.

**Why this over the alternatives.** A separate notification subsystem (rejected: the ledger already
exists and is the only channel open to a late registration); a canonical list of a state's options
beside the declaration's (rejected: one fact, one home); coupling `thresholds` to `fill` so a provider
must name both (rejected: neither subset could never act, so the coupling would be a rule whose
removal breaks nothing); letting a refused bar-capable provider fall through to the default bar when
the user wrote a key it does not take (rejected: it contradicts the standing refusal for an option a
provided instrument does not take).

## Accepted & Rejected Feedback

**Accepted, and now in the artifacts.**

- The opt-in repair (ZO-1, CR-2, struct-1, C2, F8): the declaration invariant limited to Jefferson's
  own declarations and derived from each shipped declaration's `bar`; the state requirement opening on
  an instrument that takes `thresholds`; the provided-options requirement requiring `bar` *and* the
  name in `options`.
- The fifth-threshold repair (ZO-2, CR-1, C1): explicit values, the state at 40 above an ignored 50.
- One check/read order for the threshold list (struct-3, CR-8, CB-08, F3), the duplicate rule holding
  above 100 (struct-4), and their scenarios.
- One rule for malformed input inside a threshold, the warning naming the option as written and the
  1-based position (CR-7, F4, CB-04, CB-07), the `-0` and `70.0` decisions, and a fault kind of its own
  for a name without `bar` (CB-05).
- The `instrument-registration` delta (CR-4, F6, CB-02), with the faulting bar as unknown, 0 for state
  choice, and containment of the state-choice call.
- One reading per sample (CR-5, F6), blanking judged against the state in force (C3, F11, F12),
  `formats` layering kind by kind (struct-5, C5, F5), each state bound as an instrument is (F5's rest),
  the layering order on the fill (CR-6), and the qualified "Style still covers the whole instrument"
  (C4).
- The extension-source-layout rewording and its behavioural oracles (CB-01, F10).
- The Impact additions and the docs-pass list (struct-7, F9, CB-05, CB-06), with the correction to the
  proposal's premise about where the defaults can live (CB-10).
- Sources that name a decision rather than the orientation (CR-12), the two migration cases recorded
  for the design, and the test discipline passed to the tasks gate (F13).

**Set aside, with the reason.**

- **Refuse `thresholds` without `fill` (CR-10).** Michael ruled the two names separate opt-ins; the
  precedent CR-10 cites refuses an option that could never act, and neither subset is that. The cost
  of naming `thresholds` alone goes to `docs/extension-authors.md` in the docs pass.
- **Read the bar only when a user wrote a list, with a flag recording who wrote it (CR-3).** Set aside
  in favour of the narrower rule: read when the format in force names `$bar`, or when an honoured
  threshold sets an option other than `fill`. CR-3's version still reads the bar when every threshold
  the user wrote sets only `fill`, and it needs a flag the rule does not.
- **A new `Configuration` field plus a second delivery for the over-four warning (CB-03).** Its
  observation stands and is now in the artifacts; its mechanism is wrong: the reader already buffers
  warnings in the read's fault list, and `source.report` is the same ledger a late check reaches, so
  one composing function and one channel already cover both moments. `Configuration.warning` must not
  carry it.
- **A canonical list of the options a state may carry (CR-9).** Rejected: the declaration's options
  minus `thresholds` is already the rule, and a second list would give one fact two homes.
- **`startup.ts`, `blank.ts` and `width-plan.ts` in the Modify set (CB-05, F9).** `startup.ts` already
  wires `report` to the ledger, `blank.ts` sets `fills` on its declaration rather than the
  instrument's, and `width-plan.ts` takes one boolean per plan.
- **Hand-kept lists of shipped declarations' options (F8's first wording).** The scenario now states
  that the expectation is derived from each declaration's own `bar`.
- **Asking the owner the two edge questions (struct-3, F3, struct-4).** Settled from the owner's own
  words, which count what someone defines and refuse a duplicate without a range qualifier.

## Michael's Rulings

Each ruling below is Michael's; the `Decided by` line names the owner words, measurement or document
that settled it, and `Landed` names where the revised artifacts carry it. Landing places abbreviate
`proposal.md` as **P**, `specs/statusline/spec.md` as **S**, `specs/extension-source-layout/spec.md`
as **E**, and `specs/instrument-registration/spec.md` as **I**.

1. **Provider opt-in scope** (ZO-1, CR-2, struct-1, C2, F8). Opt-in by name stands as ruled. The
   shipped-declaration invariant covers Jefferson's own declarations only, proved from each SHIPPED
   declaration's `bar`; the state requirement opens on "an instrument that takes `thresholds`"; the
   provided-options requirement requires `bar` and the name in `options`, each name standing alone; a
   non-opted-in provider given `fill` has that instrument alone refused.
   *Decided by* `owner-rulings.md` 2026-11-25 ("A provider that does not opt in draws the default
   bar", "That's exactly it") and the living "An instrument is declared once".
   *Landed* S "A threshold sets the instrument's state at a percentage"; S "A shipped declaration that
   can draw a bar declares the two options" and "A shipped instrument with a bar"; S "A provided
   instrument takes only the options Jefferson implements" and "A provider that names neither"; P
   What Changes, bullets 1 and 8.
2. **Separate opt-ins.** With `bar` declared, `thresholds` without `fill` is accepted, and the reverse;
   only naming either without `bar` is refused. The spec states every combination; the cost of the
   `thresholds`-only combination goes to the extension-author docs in the docs pass.
   *Decided by* `instrument-binding.ts`'s refusal of a setting that silently does nothing, and
   "Don't invent what we don't have to".
   *Landed* S "A provided instrument takes only the options Jefferson implements" (body, plus "A
   provider that names thresholds alone", "A provider that names fill alone", "A provided instrument's
   thresholds", "A provider that names neither"); S "A registration naming an option without a bar is
   refused".
3. **A non-opted-in provider and a key it does not take.** It is refused, its entries render `blank`,
   and one warning names the instrument and the key. "Draws the default bar" describes only a
   non-opted-in provider whose settings carry neither key.
   *Decided by* the living "An option a provided instrument does not take", and inherited ruling
   J1(b).
   *Landed* S "A provider that names neither"; S "The default thresholds are 70 and 90", "A default
   reaches a provider's bar that did not opt in".
4. **The without-`bar` refusal.** It gets a kind and a sentence of its own, so
   `option-unimplemented` stays true for names outside the accepted set.
   *Decided by* `registration-listener.ts`'s separate kinds for `option-unimplemented` and
   `formats-without-composed`.
   *Landed* S "A registration naming an option without a bar is refused", with "An option outside the
   accepted set"; P Impact, the registration path bullet naming `registration-listener.ts`.
5. **The fifth threshold.** Replaced with explicit values: 10, 20, 30, 40, 50 and a reading of 55 use
   the state at 40; the one at 50 never applies; one warning names the instrument. Choosing the state
   is one rule over the checked, filtered and capped list.
   *Decided by* `owner-rulings.md` 2026-11-25 ("all those beyond the 4 lowest threshold numbers are
   ignored") and the delta's own selection rule.
   *Landed* S "Only the four lowest thresholds are honoured", "A fifth threshold" and "The four lowest
   apply".
6. **A rejection's scope, split by origin.** A Jefferson instrument without a bar given `thresholds`
   or `fill` rejects the whole document; a provided one is refused alone, its entries `blank`, while a
   sibling entry renders.
   *Decided by* inherited ruling J1(b) and the living "A provided instrument's settings are checked
   once both are in hand".
   *Landed* S "A Jefferson instrument without a bar"; S "A provided instrument without a bar".
7. **What the over-four count counts.** What was written: five or more warns, whatever the values. The
   order is stated once — check every entry, warn on the written count, drop above 100, sort
   ascending, keep four — with scenarios for four-plus-one-above-100, three-plus-two-above-100, and the
   exactly 0 and exactly 100 boundaries.
   *Decided by* `owner-rulings.md` 2026-11-25 ("only a warning is shown if someone defines more than
   4").
   *Landed* S "Only the four lowest thresholds are honoured" (body and six scenarios).
8. **Two thresholds at one number above 100.** Rejected: the duplicate rule has no range qualifier, and
   every entry is checked before entries above 100 are dropped.
   *Decided by* `owner-rulings.md` 2026-11-25 (the unconditional duplicate ruling; "Nothing above 100
   should do anything").
   *Landed* S "A malformed threshold rejects the settings", "Two thresholds at one number above 100".
9. **Malformed input beyond `activeAt`.** One rule — every value inside a threshold is checked as its
   top-level value is — plus a fault of its own for a `thresholds` value that is not a list or an entry
   that is not an object; a warning naming the instrument, the option as written and the 1-based
   position; `activeAt` judged on the parsed number, so `-0` is the threshold at 0, `70.0` and `7e1`
   are 70, and `1e400` rejects; and scenarios for each shape.
   *Decided by* `owner-rulings.md` 2026-11-25 ("The meanings need to stay the same", "int only"), the
   reader's 1-based convention, and ADR 0015.
   *Landed* S "Every value inside a threshold is checked as a top-level value is"; S "A threshold fault
   names its place"; S "A key a threshold does not take is refused"; S "A malformed threshold rejects
   the settings" ("A number JSON writes another way", "A number that parses to no whole number", "A
   negative zero").
10. **Whether the defaults reach every bar.** Yes: the defaults are the `thresholds` list in force
    whenever the settings carry none, for Jefferson's bars and providers' alike, opted in or not, with
    or without `fill`.
    *Decided by* `owner-rulings.md` 2026-11-25 ("A provider that does not opt in draws the default
    bar", the 70/90 defaults, ">=" is the fix).
    *Landed* S "The default thresholds are 70 and 90" (body, "A default reaches a provider's bar that
    did not opt in", "A default fills a provider's bar with no list written"); P What Changes, the
    BREAKING bullet.
11. **Whether the defaults layer on a top-level `fill`.** They are two thresholds setting only
    `fill.fg`, so they layer as any threshold does: a top-level `fill.fg` shows below 70, `warning` from
    70 and `error` from 90, and every other key the top-level fill sets survives.
    *Decided by* `owner-rulings.md` 2026-11-25 (the top-level fill is the look before any threshold;
    a threshold's fill changes only the keys it names).
    *Landed* S "The default thresholds are 70 and 90", "A default over a top-level fill colour" and "A
    default keeps another fill key".
12. **The order style and fill layer on the fill.** The state is one settings object, each option the
    threshold's value layered on the top level's; the fill takes that object's `style` with its `fill`
    on top; the track takes the effective `style` plus `dim`; text takes the effective `style` under the
    colours the format and the declaration name. A threshold's `style` never overrides a `fill`.
    *Decided by* `owner-rulings.md` 2026-11-25 (a key means the same thing inside a threshold) and the
    existing colour precedence.
    *Landed* S "The style, the fill and the track layer in one order" and its scenario; S "A threshold
    reached", which now renders the threshold's format in the effective style.
13. **"Style still covers the whole instrument".** Qualified to a reading below 70 or an empty list;
    the fill and the label take the style, the track takes the style plus `dim`, and from 70 the
    default changes only the fill's `fg`.
    *Decided by* `owner-rulings.md` 2026-11-25 (`fill` styles the fill) and the track's `dim`.
    *Landed* S "`fill` styles the bar's fill and nothing else", "Style still covers the whole
    instrument".
14. **The extension-source-layout wording and its proof.** "Only the fill's colour" becomes the fill's
    style — `fg`, `bg` and attributes — and the drawing's own claim stays the filled columns and the
    `dim` track. Each is proved by behaviour: the geometry tests unedited and passing, the strict-edge
    test flipped and first run red, and `drawBar` called with a fill style drawing it unchanged at every
    percentage.
    *Decided by* `owner-rulings.md` 2026-11-25 (`fill` takes `style`'s shape) and the delta's own
    scenarios that require bold on the fill.
    *Landed* E "The bar renders as before" and "Looking for the bar". The three proofs are the tasks
    gate's.
15. **When the bar is read.** Only when its reading can change what renders: the format in force names
    `$bar`, or an honoured threshold sets an option other than `fill`. No record of who wrote the list.
    *Decided by* ADR 0020 and the living "Only a variable the format names can blank an instrument".
    *Landed* S "The bar is read only when its reading can change what renders", with "A format that
    leaves the bar out", "A list that changes only the fill" and "A bar never read for a format without
    one"; P What Changes, whose last bullet now states the narrowed rule. The amendment is no longer
    appended to the MODIFIED blanking requirement: it is a requirement of its own, and that MODIFIED
    copy keeps the living rule whole.
16. **A faulting bar read only to choose a state.** A provided `bar` that throws, returns a promise or
    returns a bad value is unknown, counts as 0 for the state, is reported once per session, and blanks
    the entry only where the state's format names `$bar`.
    *Decided by* `owner-rulings.md` 2026-11-25 ("unknown is always 0") and ADR 0020.
    *Landed* I "A faulting bar is unknown, and blanks only a drawn bar", with "A bar that faults where
    no bar is drawn" and "A throwing bar counts as 0"; I "Provider code costs one entry and no more",
    "A bar that returns text", now naming `$bar`.
17. **Containing the provider while the row is planned.** The call that chooses the state sits inside
    the provider's outer boundary, as `render` does; a throw that escapes there reports one fault, leaves
    that entry blank in the top-level settings' geometry, and every row keeps rendering. Jefferson's own
    instruments stay unwrapped.
    *Decided by* the living "Provider code costs one entry and no more" and `containProvided`'s existing
    behaviour.
    *Landed* I "A state is chosen inside a provided instrument's boundary", "A throw that escapes while
    the state is chosen". The design names `containProvided` as the seam.
18. **One reading per sample.** The state is chosen at most once per instrument per sample from one
    reading, and that choice decides `fills`, the width-0 probe, the text at every width and the fill
    drawn.
    *Decided by* `AGENTS.md` (structural guarantees over remembered rules; the width-0 rule) and the
    row's per-sample reset.
    *Landed* S "A threshold's format decides whether the instrument fills" and "One reading a sample".
    The design names the single place and hands the reading to the drawing.
19. **Blanking against the state's format.** `undefined` and `null` both count as 0 for choosing a
    state; blanking is then judged against the format of the state in force — nothing rendered when it
    names `$bar` and the reading is unknown, a `dim` unfilled track when it names `$bar` and the reading
    is null, a rendered instrument when it names no `$bar`.
    *Decided by* `owner-rulings.md` 2026-11-25 ("unknown is always 0"; `$percent` and the empty track
    unchanged) and the living blanking rule.
    *Landed* S "A threshold compares the bar's own reading", "A state at 0 that drops the bar" and "A
    state at 0 that names the bar".
20. **How deep a threshold's `formats` layers.** Kind by kind: a kind the threshold names takes its
    text, a kind it leaves out takes the top level's, otherwise the declaration's default, never another
    threshold's. The same holds for every object-valued option.
    *Decided by* `owner-rulings.md` 2026-11-25 (a key means the same thing; thresholds are
    independent) and the existing kind-by-kind `formats` behaviour.
    *Landed* S "A threshold's state changes only the keys it names" and "A formats kind a threshold
    leaves out"; P Open questions, where the question is removed.
21. **Binding each state.** Each honoured state is bound once as a whole instrument would be: its
    segments, its label and gap, its composed choice and kind formats, its `fills`, and its effective
    style and fill — at most five bound states.
    *Decided by* `owner-rulings.md` 2026-11-25 (a state is anything in the settings; thresholds are
    independent) and ADR 0020's composed rule.
    *Landed* S "Each honoured state is bound as an instrument is", "A threshold that drops the label",
    "A threshold that adds a bar after a label" and "A threshold whose format drops the composed
    variable"; P Open questions, which gains "Each state's bound form".
22. **Which options a threshold may carry.** The declaration's options minus `thresholds`; no second
    list.
    *Decided by* `owner-rulings.md` 2026-11-25 and one fact, one place.
    *Landed* S "A key a threshold does not take is refused", whose body says no second list exists.
23. **The over-four warning's path.** One composing function, one channel: the reader buffers it in
    the read's fault list for a document that installs, and a late check in the watch reaches the same
    ledger through `source.report`. `Configuration.warning` does not carry it and startup needs no
    change. One warning per instrument per session; silent for a rejected document, an instrument that
    never registers, and a refused provided instrument; the same sentence in either registration order;
    print mode loses nothing.
    *Decided by* the measured reader, watch and ledger wiring.
    *Landed* S "The over-four warning is composed once and reported once", "A rejected document stays
    silent" and "A provider that registers after the read"; P Open questions, restated as one wording
    in one channel.
24. **Where the defaults live.** They are the default value of the `thresholds` option, so they live
    where the settings are applied, never in the visual. The real constraints are the delta's sentence
    that the percentage is the instrument's setting and the `drawBar` export pin; a choice that adds an
    export or a file extends that pin.
    *Decided by* the one-way visual import rule, `owner-rulings.md` 2026-11-25, and the export pin.
    *Landed* P Open questions, "Where the defaults live", corrected; P Impact, the conditional pin.
25. **Migration and rollback.** No spec change and no question for the owner: the strict boundaries
    already handle both. The design's Migration Plan states three cases — a downgrade while
    `thresholds` or `fill` is written rejects the document, a provider naming either on an older
    Jefferson is refused, and no document valid today changes meaning except at exactly 70 and 90 — and
    the docs pass names the minimum version for providers.
    *Decided by* `AGENTS.md` (strict and loud at contract boundaries) and the standing documentation
    ruling.
    *Landed* P Impact, the rollback bullet; the design's Migration Plan and the tasks' sample-provider
    fixture.
26. **Impact completeness.** Four entries added — the row renderer, the registration listener, the
    shipped-options pin test and the sample-provider fixture — with the export pin joining only if a new
    export or file lands, and `startup.ts`, `blank.ts` and `width-plan.ts` staying out. The docs list
    gains `docs/instruments.md`, `docs/configuration.md`, ADR 0009's threshold sentence and ADR 0020's
    wording beside `docs/formats.md`, `docs/extension-authors.md`, `ARCHITECTURE.md` and the ADR that
    retires pi parity. The design's file map is the complete list.
    *Decided by* the measured source and docs; one fact, one place.
    *Landed* P Impact, all three bullets that list files, documents and scope.
27. **The provided-settings check list.** Extended, keeping every scenario, to end "… modifier, style,
    `fill` and `thresholds`" — the one home of that list.
    *Decided by* one fact, one place, and the living requirement's own enumeration.
    *Landed* S "A provided instrument's settings are checked once both are in hand" (MODIFIED copy,
    plus "A threshold fault under a provided name").
28. **Sources.** The MODIFIED `$bar` requirement gains the 2026-11-25 `>=` and `fill` ruling; the
    amended blanking requirement gains the 2026-11-25 threshold rulings and this council; and every
    Source naming the orientation is replaced with a decision, because the orientation approved
    nothing.
    *Decided by* the feature-spec standard §1 and the agent contract that the orientation binds
    nothing.
    *Landed* S "$bar takes the width the rest of the format leaves" (Source added); S "Only a variable
    the format names can blank an instrument" (Source extended); every other requirement in S, E and I
    cites an owner ruling, an ADR, `AGENTS.md` or this council. P's Why paragraph keeps the orientation
    as background, where it reports provenance.
29. **Tests.** Michael holds this at the Implementation Readiness gate, not in the deltas: the flipped
    edge test written first and run red, a sibling entry beside every provider refusal, the exact
    over-four sentence asserted, the 0, 100, 101 and four-plus-one-above-100 cases covered, and only
    the provider's bus faked.
    *Decided by* the implementation-readiness standard and Derek's no-mocking rule.
    *Landed* nowhere yet: `tasks.md` carries it at that gate.

## Owner Decisions Required

None. Michael settled every contradiction and open question raised by the seven lenses, and each
settlement rests on the owner's own words in `owner-rulings.md`, a measurement in the source, or a
standing ruling. The two items the lenses put to the owner — the over-four count and a duplicate
`activeAt` above 100 — were answered from what he had already ruled, and he need not be asked again.
No item is marked `joel`, and nothing here blocks drafting `design.md`. The two consequences Michael
assigned to the docs pass — the cost of naming `thresholds` without `fill`, and the minimum Jefferson
version for providers that opt in — fall under the standing ruling that documentation never blocks a
feature.
