# Council Synthesis

## Question and Scope

**The design question.** How does a foreground colour of the live theme become a `|name` in the format
language, without the package copying the host's token table, changing its published contract, adding a
dependency, or altering what any format accepted today renders?

Joel settled the shape on 2026-11-24 (`owner-rulings.md`; D1–D4 in `michael-orientation.md` §1): every
foreground colour a theme defines becomes a name after `|`, no background colour does, a reserved word
keeps its meaning, and a colour written in the format is the strongest colour there is. Everything else
in the change is the council's and the design's to settle against those rulings.

**Constraints in play.**

- The names are pi's, not this package's, and no copy of the host's names may be kept (D13;
  `statusline` spec, "The host's token list MUST NOT be copied").
- Nothing that works today changes: a colour only turns a refused name into an accepted one (S0; D3).
- No contract change (S11; D9), no new dependency.
- Two standing requirements are absolute and give way to a format colour: the thinking level's own
  colour (R5) and the notice's `warning` (R6).
- Users and extension authors read only "row" and "instrument" (ADR 0015).

**Evidence inputs.** `proposal.md` and the two delta specs; `research-chidi.md` (the host's token
accessors and slots) and `research-eleanor.md` (where the format language, the style validation, the
binding and the registration vet live); `michael-orientation.md` (the binding decisions, the traps T1–T11,
and the conditional in §4 that reserved one outcome for Joel); `owner-rulings.md`; and the seven lens
reports `council-zoom-out.md`, `council-critic.md`, `council-structural.md`, `council-readiness.md`,
`council-codebase.md`, `council-comprehension.md` and `council-catalyst.md`.

## Lens Findings & Trade-offs

### Necessity and scope

Zoom-out found no findings and recommended proceeding: the proposal solves per-piece foreground colouring
in the shared format language with no dependency, no copied registry and no new public vocabulary, and it
correctly leaves O1–O4 to the design rather than widening into spinner or composed-instrument work. It
marked one assumption unverified — that the live host accessor accepts exactly the host's foreground-token
set — which row 10 measured.

Catalyst found no false compromise, and confirmed the theme injection, the shared foreground probe and the
colour representation stay design decisions rather than compromises the proposal forces.

### The one contested outcome: a colour in a provider's default format

Four lenses converged on the same seam from different directions, and it was the change's only blocking
question.

- **Codebase (CB-01, blocking)** reported that the registration requirement contradicts itself. Its
  scenario says `$saved|toolDiffAdded` registers; its closing sentence says a default format refused today
  is refused still, and today registration refuses every `|name` that is not one of the nine modifiers
  (`instrument-binding.ts:236-240`), a result published at `docs/extension-authors.md:310`.
- **Critic (C1/C2, major)** found the delta never says how far a deferred refusal reaches, and showed the
  outcome can follow the load order, which D14 forbids: the registry can take a whole registration back
  from nobody.
- **Readiness (RD-01, major)** read the same two sentences as two incompatible contracts and asked what an
  extension author sees when no document names the instrument.
- **Comprehension (C2, major)** said a provider author cannot tell from the delta whether registration is
  synchronous, provisional or deferred.

All four pointed at `michael-orientation.md` §4's conditional: if the design cannot keep today's refusal,
the outcome becomes Joel's. Row 1 and row 2 answer it, and no question reached Joel.

### When a theme-dependent check can run

- **Structural (STR-1, major)**: the two standing requirements that promise when format checks run
  predate themes, so the colour half of the check cannot run at the moment they state, while the delta
  pins an outcome with no moment that can deliver it.
- **Critic (C1)** and **readiness** offered mechanisms: hold registrations behind a theme, or retract what
  was accepted early.
- **Zoom-out, catalyst, structural and readiness** each left unverified either that every theme carries the
  same names, or that the accessor tells the two slots apart.

Row 2 measured that no theme can be had before pi's `initTheme`, and that a theme exists at every
`session_start` in every mode. Row 3 found STR-1's premise wrong: the settings check always has a theme.
Row 10 measured the name set as invariant at the pin. Row 3 put the timing statement in the requirement
that owns it.

### Where a colour's precedence is resolved

- **Codebase (CB-03, major)**: a format colour cannot be carried in the merged `ThemeStyle` without losing
  D4, because two scenarios reach the built-in colour with the same merged `fg` and need opposite results.
- **Critic (C4)** and **readiness (RD-06)** observed that no scenario says the built-in colour function
  stops being called, so an author would still see a warning about a colour the user replaced.
- **Codebase (CB-04, major)**: "sets nothing else" is false of pi's own rendering, which turns faint on for
  any token in a theme's `dimTokens`.

Rows 6, 7 and 8 settle all three.

### Remaining structural and wording findings

- **Structural (STR-2, STR-3, STR-4)**: one rule stated in two requirements; the plain-kind-format rule
  owned by a colour requirement although it predates colours; the registration requirement restating the
  lookup order the statusline spec owns.
- **Critic (C6, C7, C9)** and **comprehension (C5)**: a kept scenario whose title now denies its body; a
  precedence scenario that can pass with one colour on both sides; the theme named two ways.
- **Codebase (CB-07)**, **readiness (RD-09)** and **comprehension (C3)**: the lookup order is not stated
  whole, and "a name Jefferson gives meaning keeps that meaning" is already false on a variable that
  declares a form by that name.
- **Codebase (CB-06)** and **readiness (RD-07)**: "no list of the theme's names is anywhere in the source"
  is false of correct shipped code (`thinking.ts`, `notice.ts`, `bar.ts` name tokens), and the two
  source-inspection scenarios plus "A faint colour" have no provable test.

Rows 12, 13 and 16 settle these.

### Migration, version skew and boundaries

- **Readiness (RD-04, major)**: an older Jefferson rejects a whole document that uses a colour, and a
  whole registration whose default format names one, and nothing marks which Jefferson is running.
- **Readiness (RD-05, minor)** and **critic (C8)** asked what a probe should do with a non-throwing
  accessor, and what happens across a theme switch to a theme that lacks a name.
- **Readiness (RD-08, minor)** and **critic (C5)** named the boundary names and the warning texts that no
  artifact pins.

Rows 10, 11, 14 and 15 settle these.

## Synthesis & Recommendation

Proceed to design. The direction the council recommends, and that Michael then ruled into the artifacts:

1. **Keep today's contract for a provider's default format.** A foreground colour of the theme in a
   default format registers and renders as a document's format would. Any other name keeps the whole
   registration refusal that fires when it registers — siblings, fields and later reports — with one
   warning naming the instrument and the offending name.
2. **Hold, do not retract.** A provider message that arrives before Jefferson holds a theme waits whole,
   with every report behind it, in arrival order, and is vetted once at the top of Jefferson's
   `session_start`. Nothing is accepted before it is vetted, so the registry gains no removal path and
   today's published outcome holds in both load orders and with no configuration file.
3. **Resolve precedence before anything folds into a `ThemeStyle`**: the last colour the chain names;
   then the instrument's built-in colour, consulted only when the chain names none; then the `style`.
4. **One order after `|`, stated once**: a form directly after its variable and once; then Jefferson's own
   names; then a foreground colour of the theme; then a refusal.
5. **No capability signal, no render-time guard, no probe change.** Both are refused on the deletion test
   or on parity with `style.fg`, and the platform facts they would guard become cited facts re-checked at
   every pi pin bump.

## Accepted & Rejected Feedback

**Adopted.**

| Finding | Ruling | Why |
|---|---|---|
| CB-01, RD-01, critic C1/C2, comprehension C2 | 1, 2 | The refusal keeps today's whole-registration scope and gains order- and document-independence through the hold. |
| STR-1 | 3 | Its premise was wrong: the settings check always has a theme. The timing statement moves into the requirement that owns the order. |
| Critic C3, RD-02 | 4 | The bind never parses a format its admission did not accept, and every parse site takes a required colour check. |
| CB-02, RD-03, critic C5, comprehension C4 | 5 | Both provided paths quote the offending `\|name`; Joel's J1(b) and the standing statusline requirement already require the fault to be named. |
| Critic C4, RD-06, comprehension C4 | 6 | One scenario states that the built-in colour is not consulted for a piece the format colours. |
| CB-03 | 7 | The merged style cannot be the discriminator; precedence is decided first. |
| CB-04, STR-2 | 8, 16 | Faint is pi's, not the extension's, and the duplicate phrase goes. |
| CB-05 | 9 | The design's file table is the change's one home for the files it touches. |
| Critic C8, comprehension C1 | 10 | The name set is invariant at the pin, so this gets a cited fact and no mechanism. |
| RD-04 | 11 | No channel change, no signal, the minor release stands, and the design's Migration Plan records both directions. |
| CB-07, RD-09, comprehension C3 | 12 | The order is stated once and the forms requirement takes the sentence that makes it true. |
| CB-06, RD-07 | 13 | The rule is reworded to the set of names a format may write, and proven behaviourally against a theme the source cannot know. |
| RD-08 | 15 | The tasks name the boundary set and the legitimate rewrites. |
| STR-3, STR-4, critic C6, C7, comprehension C5 | 16 | Each rule gets one home and each scenario names what it pins. |

**Rejected.**

- **CB-01's remedy** — move the name check to the first read. Rejected: it would turn a published refusal
  of the whole registration into a document-dependent refusal of one instrument, which is the contract
  change §4 reserved for Joel, and the evidence shows no need for it.
- **Readiness's option (a)** — retract registrations accepted earlier. Rejected: with the hold, nothing is
  accepted before it is vetted, so no removal path is needed.
- **Structural's option (b)** — modify the two standing timing requirements. Rejected: they stay true once
  registration runs with a theme, so the proposal's "no existing requirement there changes" stands.
  2026-11-24, design review stage 3 (critic-R1): "The proposal's No existing requirement there changes
  stands" is superseded: `instrument-registration` gains a requirement that a held message is judged as it
  was posted, and no existing requirement in it changes; the two timing requirements still do not change.
- **Critic C1's alternative** of reading pi's internal theme global instead of holding. Rejected on D9's
  no-pi-internals rule.
- **Readiness RD-05** — accept a name only when the accessor returns a string, plus a test against an
  invented accessor. Declined on the deletion test and Joel's no-warnings-about-upstream rule.
- **Critic C8's render-time guard** and **comprehension C1's revalidation mechanism**. Not added: parity
  with `style.fg`, which has had the same exposure since it shipped.
- **Codebase's owner question 1** (check at the first read) and **readiness's options (b) and (c)**
  (narrow the refused unit; warn only when a document names the instrument). Both change what an author
  sees today.
- **CB-06's fake theme without `accent`**. Not needed and not reachable: the test helper can only add
  names.

## Michael's Rulings

All sixteen rows are settled. None is marked `joel`. "Landed in" says where each one went.

**Row 1 — A provider's default format names a colour the theme does not have.**
Ruled: a foreground colour of the theme registers and renders as a document's format would; any other
name keeps today's contract, refused whole when it registers, with one warning naming the instrument and
the offending name; the outcome is the same in both load orders, with or without a document, a
configuration file, or a rejected document. Decided by D1, D7, D3/S0, D14, the published refusal at
`docs/extension-authors.md:310`, the "check each member's shape when it registers" requirement, the
first-fault rule in `registration-listener.ts:43-48`, and row 2's measurement that the design can deliver
it. CB-01 stands as a drafting contradiction; its remedy is rejected, and this is not Joel's because §4's
conditional fires only if the design cannot keep the refusal.
*Landed in:* `specs/instrument-registration/spec.md` (requirement sentence 4; scenario 1 extended;
scenario 2 replaced) and `proposal.md` ("A bad name is a refusal, at read time"; "Provided instruments get
the same language").

**Row 2 — Can "refused at registration, the same in either load order" survive when no theme exists as a
registration arrives?**
Ruled: yes, through a hold. No theme can be had earlier — pi exports no theme instance
(`index.d.ts:38`), creates its theme after extensions load (`main.js:701` vs `:737`), and `project_trust`
hands a `ui` with no theme. A theme exists at every `session_start` in every mode, and nothing between a
message's arrival and the top of Jefferson's own `session_start` can be observed. A provider message
arriving before the hold waits whole with its reports, in arrival order, vetted once in decision 15's
order; the theme is handed to the listener before the mode check and before `readConfiguration`; the
listener holds the object `ctx.ui.theme` returns, never `ctx`; Jefferson's own payload stays unheld; nothing
needs retracting. Decided by measurements of pinned pi 1.4.0 (listed in `michael-council-rulings.md`), the
standing hold requirement (`instrument-registration` spec:246-250) and the published "replies on neither
channel".
*Landed in:* `council.md` (here) and the design's obligations; no spec change. The contingency — a plain
question to Joel — fires only if the design gate finds the hold cannot be built.

**Row 3 — When do the colour checks run, and against which theme?**
Ruled: both standing requirements stay true and neither changes. Registration is the moment of
acceptance and its vet now runs with a theme; the settings check always has a theme because
`readConfiguration` runs only inside Jefferson's `session_start`. State the theme once, in "A colour's
name is the theme's own", as a theme the host hands the extension; the registration requirement points at
"a foreground colour of the theme is a modifier" and keeps only order-independence. Decided by
`startup.ts:111-127`, `configuration.ts:505-520`, the two standing requirements, and row 10's single set
of names. This is spec wording, not Joel's.
*Landed in:* `specs/instrument-registration/spec.md` (requirement body rewritten) and
`specs/statusline/spec.md` ("A colour's name is the theme's own", unchanged, is now the only home).

**Row 4 — The bind parses a default format before the read contains it (T3).**
Ruled: the bind never parses a format its admission did not accept under the same colour check; every
parse site that is not a plain format takes a required colour check with no optional or lenient default,
so `tsc` lists every production site and all 42 test calls. Parsing once at admission is acceptable, not
required. A try/catch around the provided bind is not a fix. Proof comes through the session harness in
both load orders. Decided by orientation T3, `configuration.ts:483-488` and `:584-595`,
`instrument-binding.ts:277-283`, design 10, and row 10.
*Landed in:* the design's obligations and the tasks; no separate spec scenario, because this is row 1's
scenario set.

**Row 5 — A provided instrument's warnings cannot name the offending name.**
Ruled: name it. Both provided paths quote the offending `|name`; kinds may stay; the words are the
design's (O4), within D10. This revises orientation S10's "with today's warning": the refusal stays and its
warning gains the name. Decided by Joel's J1(b), the standing statusline requirement ("a warning names it
and the fault"), the settings-variable precedent and his strict-and-loud engineering rule.
*Landed in:* `specs/statusline/spec.md` (new scenario in "A foreground colour of the theme is a
modifier") and `specs/instrument-registration/spec.md` (scenario 2 names the name). The design's file table
carries `configuration.ts:184-186`, the refusal arm in `registration-listener.ts` and the expectations at
`tests/registration.test.ts:950` and `:1980-1986`; `docs/configuration.md:129` and
`docs/extension-authors.md:310` go to the docs pass.

**Row 6 — The built-in colour function must not run under a format colour.**
Ruled: the built-in colour is consulted only for a piece that carries no format colour; one scenario
states it. No thinking scenario: thinking's colour function is pure, so not calling it changes nothing a
test can see. Decided by D4, D16 and orientation T5.
*Landed in:* `specs/statusline/spec.md` ("The colour a format names is the strongest colour").

**Row 7 — A format colour cannot be folded into the merged `ThemeStyle` (CB-03).**
Ruled: CB-03 is right, and precedence is decided before anything folds. A piece's foreground is the last
colour its chain names; then the instrument's built-in colour, called only when the chain names none;
then the style's `fg`. Attributes fold as they do today. Whether a colour is a modifier kind the merge
skips or a field on the segment stays O3, the design's. For O2, the one probe is the host check
`validateStyle` and the adapter's guard both make today, `validateStyle`'s `parseColor` fallback stays
inside `validateStyle`, and no raw colour can slip through after `|`. Decided by D4, `format.ts:193-198`
and `:269-275`, and a measurement of pi-tui's `parseColor`.
*Landed in:* `specs/statusline/spec.md` ("The colour a format names is the strongest colour").

**Row 8 — "Sets only the foreground" is false of pi's rendering (CB-04).**
Ruled: reword to "the colour sets the piece's foreground and nothing the extension chooses; a theme that
renders that colour faint renders it faint", drop the restating phrase from "A style modifier only sets an
attribute on", and point there at the colour requirement. Decided by a measurement of `theme.js:188-191`
and the `dimTokens` of the three built-in themes, D1 and D13. Not Joel's.
*Landed in:* `specs/statusline/spec.md` (the retired requirement's replacement, "A style modifier only
adds an attribute", and "A foreground colour of the theme is a modifier") and `proposal.md` (first "What
Changes" bullet). The faint look on the system theme is the docs pass's, and minor under D12.

**Row 9 — The Impact list under-counts the files the change touches (CB-05).**
Ruled: CB-05 is right, with two corrections — the ten `instrumentBindings` sites are seven with no
argument and three with a `Map`, and `startup.ts` is missing. The design's file table is the change's one
home for that list, and the proposal's Impact need not repeat it. Not Joel's.
*Landed in:* `proposal.md` ("Source and tests", as a pointer to the design's file table); the list itself
is the design's.

**Row 10 — What happens when a theme switch selects a theme lacking a name (comprehension C1, critic C8).**
Ruled: nothing, because at the pin no theme pi loads can lack a name. Every built-in carries pi's 49
foreground names, the validator refuses a user theme that leaves a required token out or adds an unknown
key, and a failable token is filled with its fallback. The one way in is another extension constructing a
partial `Theme` with pi's public class, which would break pi's own interface too, and `style.fg` has had
the same exposure since it shipped — so no guard at render unless `style.fg` gets one. The design records
the invariance as a cited platform fact, re-checked at every pin bump beside the existing pin note. The
delta's "The theme changes" scenario stands. Decided by measurement of how pi 1.4.0 loads themes and by
critic C8's parity argument.
*Landed in:* the design's cited platform fact; no spec change.

**Row 11 — An older Jefferson, or a pi whose names moved (RD-04).**
Ruled: no capability signal, no channel change, the minor release stands. Older behaviour is already
released and cannot be altered here; a new channel name would hide every provider that moved to it from
every older Jefferson; the channel rule grows by adding keys, formats are values in a contract that does
not change; a signal would need Jefferson to reply on a channel, which the published contract says it does
not. Required: the design's Migration Plan records both directions, rollback is a revert, and the docs
pass says which release colours need. Not Joel's.
*Landed in:* the design's Migration Plan and the docs pass; `council.md` here. `proposal.md`'s "Deliberately
not done" now records that no capability marker is added.

**Row 12 — The lookup order after `|` is not stated whole (comprehension C3, RD-09, CB-07).**
Ruled: state it once, in "A foreground colour of the theme is a modifier": a form, read only directly
after its variable and only once (ADR 0010); Jefferson's own names; a foreground colour of the theme;
anything else rejected. Qualify the reserved-word sentence with "on a variable that declares no form by
that name", and add two scenarios for a variable that declares a form named like a colour. The standing
requirement "A variable can declare forms" also goes stale — its "after another modifier or twice MUST
reject" sentence is already false for a form named like one of Jefferson's modifiers — so the delta
modifies it to send the name to the order, and its two rejecting scenarios stand because no pi foreground
name is `base`, `absolute` or `relative`. Decided by orientation S2 and T7, ADR 0010 and
`format.ts:107-116`.
*Landed in:* `specs/statusline/spec.md` ("A foreground colour of the theme is a modifier" body and two new
scenarios; a new MODIFIED block for "A variable can declare forms") and `proposal.md` (the lookup-order
bullet and the Modified Capabilities list).

**Row 13 — "No list of the theme's names" is false of correct code (CB-06, RD-07).**
Ruled: reword both sentences to "no copy of the set of names a format may write as a colour". Replace the
two source-inspection scenarios with one behavioural scenario: against a theme that carries a name pi does
not have, that name is a colour; against a theme that lacks a name pi has, that name is refused. One test
covers both rules, since a copied list or a read of a theme file would fail the second half. "A faint
colour" is proven as pass-through, compared the way the existing style tests compare, and the faint look
on the system theme is Joel's to watch in his session (D11) because no test reads pi's files. Decided by
measurement of the token literals in `thinking.ts`, `notice.ts` and `bar.ts`, the test helper's ten names,
D11 and the notices design's precedent.
*Landed in:* `specs/statusline/spec.md` ("A colour's name is the theme's own" body and one replacement
scenario; the removed scenario in "A modifier follows a variable or literal text") and `proposal.md` (the
names bullet and the R4 sentence in Modified Capabilities).

**Row 14 — Count a name as a colour only when the accessor returns a string (RD-05).**
Declined: at the pin the accessor throws for every name that is not a foreground token, so the check would
never fire and the deletion test removes it; a test against an invented accessor would test a pi that does
not exist; and Joel's standing rule forbids warnings about what an upstream dependency might change. The
probe keeps pi's semantics in one home, re-checked at each pin bump. Decided by the deletion test,
`theme.js:212-216` and `:234`, and `~/Projects/AGENTS.md`.
*Landed in:* no artifact change; the requirement already says only a foreground-slot name of the theme is
a colour.

**Row 15 — Boundary names and the legitimate rewrites (RD-08).**
Ruled: the tasks name the boundary set — `constructor`, `toString` and `__proto__` (both lookups use a
`Map`), `selectedBg`, `Accent`, and row 12's form-and-colour pair. A `|` with no name after it is literal
text, not a modifier, so it is not a boundary. The rewrites this delta makes legitimate are
`format.test.ts:259-264`, where `accent` moves to accepted while `bd` and `fg` stay rejected, and
`:383-404` only if O4 changes the message. Minor. Decided by `theme.js:117` and `:212-216`, the test
helper's lookup, and orientation T10.
*Landed in:* the tasks; no spec change.

**Row 16 — Three wording findings (comprehension C5, critic C6/C7, STR-3).**
Ruled, all minor: rename "A color is not a modifier" to "A colour sets no attribute"; give the plain-kind-
format rule one home in the standing requirement "A notice's text is a format with declared variables"
(a `|name` in it, a colour included, rejects the document), and drop the clause from the colour
requirement — a provider's composed kinds go through the same parse and the same refusal at registration;
and make "A colour over the style" concrete with `style {"fg": "accent"}` and the format
`$model|warning via`, so the value renders in `warning` and `via` in `accent`. Decided by the
feature-spec standard's one-home rule, ADR 0012:27 and `format.ts:101`.
*Landed in:* `specs/statusline/spec.md` and `proposal.md` (the Modified Capabilities list, which now counts
six modified, one retired and replaced, and four added).

The rename took one step more than the ruling names, so it is recorded here in full. `openspec validate
--strict` refuses a MODIFIED block that drops a scenario the living spec holds by name, and
`## RENAMED Requirements` accepts requirement headings only — a scenario rename has no expression the
delta schema takes. So the requirement is retired, with its reason and a no-document-changes migration,
and added under "A style modifier only adds an attribute" with the corrected scenario title. Its second
kept scenario keeps today's case verbatim, and a third states what the pair needed: with the style
`{"bold": false}` and the format `|accent`, the text is coloured and stays unbold, because a colour
sets no attribute and clears none.

## Owner Decisions Required

**None.** All sixteen rows are settled by Michael; no row is marked `joel`, and the change's planning
artifacts carry every ruling.

One contingency is recorded but is not an open decision: row 2 held that the registration outcome goes to
Joel only if the design gate finds the hold cannot be built. If it does, Michael's recommendation is the
option that refuses the whole registration, because the alternative — blanking one instrument, with a
warning only when someone's configuration uses it — leaves an author who misspells a colour never seeing
it.
