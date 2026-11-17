# Council Synthesis

Seven lenses read `research-chidi.md`, `research-eleanor.md`, `michael-orientation.md`,
`owner-rulings.md`, `proposal.md` and the four delta specs. Michael settled every open contradiction and
question in `michael-council-rulings.md`; Joel ruled on the one item that was his. This document
records their findings and their rulings, and rules on nothing itself.

## Question and Scope

**The design question.** How does an instrument an outside extension provides become a row's text,
when today the only source of a cell's instrument is a declaration compiled into this package
(`research-eleanor.md` §1, §3)? The answer has to leave taiknr able to build its instruments in its own
repository, and it has to work for Jefferson's own instruments by the same path (D1–D3).

**What the change must hold true.** In Joel's words (`owner-rulings.md`, 2026-11-15): each extension
owns its instruments; registration is by events and Jefferson's own instruments use it too; the
contract is the small package `pi-jefferson/instruments`; Jefferson owns the store and a provider
declares what to keep and then reports changes, with the words declare and report and never push;
there are two messages; a provided name is namespaced to its extension, Jefferson's own are
`jefferson.default.*`, and a bare name is shorthand; an entry whose instrument has not registered
renders blank until it does, and an unknown name warns only after startup completes. Change 3's
spinner must be able to declare and report a boolean, and this change must not build the spinner.

**What the constraints are.** The event bus carries no sender and replays nothing; listener errors reach
only the host's console; registrations must survive a provider whose `session_start` handler runs
before Jefferson's; `data/` imports nothing outside itself; the tarball ships `extensions/`; the export
pin compares exact keys (T1–T15, `michael-orientation.md` §1).

**Evidence in play.** The proposal names one new capability, `instrument-registration`, and modifies
`statusline`, `session-data-store` and `extension-source-layout`. The council's inputs are those five
artifacts, the two research reports, the orientation and Joel's rulings; no lens ran the code, pi or
the suite (`council-*/not_checked`).

## Lens Findings & Trade-offs

**Containment and the shape of a fault.** ZO-1 shows the blanket "a resolver must return a string" rule
contradicts the declaration type this change reuses: `variables` returns `string | undefined`, `bar`
returns `number | null`, and `undefined` is the ordinary unknown value (`instrument.ts:15-61`,
`format.ts`). C5 reaches the same place from the user's side: a literal reading blanks every provided
entry before its first report. R-04 adds that nothing wraps a resolver in a `try/catch` today, so the
boundary has no home yet. COM-4 asks which of the declaration's callbacks are inside it, and CC3 asks
what repetition bound a report has, since a cell's text resolves at three widths per frame
(`row-renderer.ts:36-77`). ZO-1's remedy — contain the final bound render rather than each callback —
is what the ruling adopted, so `collapse` and `theme.fg` are inside the boundary too.

**Faults nobody can see.** CC1 is the one blocking finding and it is about observability, not
correctness: the delta requires a wrong-shaped registration to be refused, and the only scenario says
nothing a row renders changes, which an implementation that drops every payload passes. C17 adds that
faults raised before a `ctx` exists are lost, C4 that a notify raised inside a render schedules another
render, R-05 that four new warnings have neither an outlet nor a timing, and COM-5 that a provider's
author sees a blank entry either way. Codebase's owner question offered one warning per instrument per
session through `ctx.ui.notify`, console-only, or every occurrence.

**The boolean.** CC2 is the second blocking finding: D8's boolean has no path from a declaration to
text. `Reading` is `string | undefined` (`session-data-store.ts:6`), `Readings` is closed, and
`resolveFormat` builds a string map (`format.ts:217-223`). "The entry renders what its format gives
`false`" states no rule for what a format gives `false`, and `variableForms` picks a form by name, not by
value. Three outcomes were live: typecheck failure, the word `false` printed, or silent unknown.

**Repaint.** C3, R-03 and COM-3 independently find that nothing requires a report or a late
registration to request a render: the deltas say "visible from the next render" and the scenario hides
the question inside "and the host renders again". S-3 supplies the reason the living store rule does not
already cover it — `:192` speaks of "a change the store receives", and `:232` opens with "a datum the
host provides", so a report enters through no stated path. The concrete cost is Joel's own ask: a
provider reports `working = true` on a decision call and the footer stays stale until the next
keypress.

**Partial reporting and two different fallbacks.** CC4 shows the deltas never say what a partially
reported instrument renders, and the answer today is nothing at all: `resolveFormat` returns `""` if any
declared variable is unknown (`format.ts:222`, `docs/instruments.md:70`). CC6 shows the deltas then use
two different fallbacks without saying which is which: a settings fault renders `blank` (filled,
placeholder text), a resolver fault renders nothing (empty, label suppressed). Both are established
behaviours — an unknown name versus an unknown datum — and a user cannot tell the two symptoms apart.

**Names, identity and the bus.** R-01 and C12 find the same hole from opposite sides: Jefferson must
register `jefferson.default.*` by the same message an outside extension uses, yet a `jefferson` claim
must be refused, and the payload proves nothing about who sent it. C12 also catches a prefix test
(`begins with jefferson`) refusing an innocent `jeffersonian`, and asks about case, dots inside a part
and three-part names. C7 and T7 find the quieter hazard: the binding memo and the configured map key on
`declaration.name` (`instrument-binding.ts:21`, `configuration.ts:170`), so a provider's `path` could
share a binding with Jefferson's `path`. CC5, C16 and COM-6 then find the case no scenario covers: an
`instruments` block carrying both `path` and `jefferson.default.path` is silent, key-order-dependent
last-wins today, and both spellings resolve after the change. ZO-2 catches the mirror error in the
delta's own scenario: "a notice shows once rather than twice" would need suppression across entries,
which contradicts "One configuration, two cells holding it".

**J1(b) and load order.** C1 and COM-1 find one input with two outcomes: the carried-over scenario
"An option the instrument does not declare" rejects the whole document for any instrument, while the
added requirement refuses only the provided one. C2 finds the deeper one: tying the check to the moment
of registration makes the user's result depend on extension load order, because a provider that loads
first has registered before the document is read and before a theme exists
(`runner.js:813-839`, `startup.ts:58-62`, `configuration.ts:110-112`, `:165`).

**What a registration carries, and what the contract publishes.** S-1 is structural: no requirement
states the registration's content categories, yet two other deltas check "a variable its registration
does not declare" and "an option its registration does not declare". C8 finds `shownUntil` reaching
providers with no expiry repaint, since only the notice slot arms one
(`session-data-store.ts:107-121`). C10 finds `options` promising a provider something Jefferson then
drops, because a resolver never receives configuration (`instrument-binding.ts:10-16`). C11 and R-08
find the field types open-ended, so an object or array would be held by reference, defeat the store's
`!==` change check, and let a provider mutate rendered data without reporting. C9 finds the type
closure: if the contract exposes the same declaration type, everything it imports is type-checked under
the provider's flags, `notice.ts` included. CC8 warns that a `.ts` sibling import may need a flag a
provider will not set. CC9 finds the proposal asserting a `files` change the placement rule makes
impossible.

**Layout and the plan's ripple.** S-2 finds the living extension-source-layout spec's closed home
enumerations falsified by the files this change must add, and notes the change applies to R1 a standard
it must apply to itself. R-09 and R-10 settle placement, the `exports` shape and the CI check. CC10
refutes the claim that pi loads every direct `.ts` child of `extensions/` (the test comment is wrong)
and finds T15's line range off. R-11 and CC7 find the plan's real ripple: the harness's fake `pi` has no
`events`, so every end-to-end test in that file throws in the factory, and eight configuration call
sites change with the reader's seam.

**What the design must not sacrifice.** Catalyst finds no false compromise: one registration path
without replacing the host-data feed, instrument-local refusal without rejecting the document, and
packaging and late binding left open rather than prematurely settled. Zoom-out's opportunity is the
same point from the other side: keep the implementation on the existing declaration, binding, format,
store and repaint paths, and admit no parallel renderer, second declaration vocabulary, container or
compatibility framework.

## Synthesis & Recommendation

The registration path the proposal describes is the right shape and the lenses found no competing one.
The direction the rulings converged on:

- **One registry, keyed by the full name.** Registration arrives on the bus, Jefferson's own instruments
  by the same message, and its own claim is recognised by the identity of the payload it emitted. A
  provided name's first claim wins; a later one is refused. One normalization at the reader's edge turns
  every name a document writes into the full registered name, and the configured map, the binding memo,
  the notice gate and the declared seconds all key on it.
- **The store owns provider fields.** A declared field enters by report, reads unknown until reported,
  repaints on change under the living repaint rule, repaints not at all for an unchanged value, and dies
  at `session_shutdown`. A registration that resolves a placed entry requests one repaint.
- **One containment boundary and one warning path.** The whole bound render of a provided instrument is
  wrapped; Jefferson's own render unwrapped so their defects still fail the suite. Every provider fault
  is one warning on the configuration path, once per session, delivered outside any render and, before
  startup completes, joined to the batch the unknown-name warnings open.
- **A narrow published contract.** Types only, with no runtime statement and no runtime import; the
  declaration carries the name, the resolvers, a default format and an optional default label; the
  fields are string, finite number and boolean; no options, no timed visual, no composed format.
- **A document rule for what a provided name takes.** Format, style and label, checked against the
  registration once both are in hand, refusing only that instrument.

The mechanism for two things stays the design's, because no lens measured them: how an installed cell
takes an instrument that registers later (C14 suggests reading `fills` on every plan, and the design
names the renderer requirement it modifies), and how the reader receives "what has registered" (R-11
names the seam and the plan obligation rather than a mechanism).

## Accepted & Rejected Feedback

**Adopted.** CC1, C4, CC3, COM-5, S-4 and C17's observability demand, in the shape Michael ruled: one
warning per session on the configuration path, delivered outside renders (M1). ZO-1, C5 and R-04's
containment wording, with `undefined`, and `null` from bar, kept as the declaration's own unknown
values (M8).
C1 and COM-1's scoping, plus C2's namespace-keyed rule and its scenario for a provider that registered
before the read (M5, M6). C3, R-03, COM-3 and S-3's repaint requirement, with
`instrument-registration` dropping its own replacement rule (M7). C7's full-name keying and T7's one
normalization (M12). C8(a), C10 and S-1's content requirement, plus C11 and R-08's three field types,
latest value and snapshot (M14, M16). C9's types-only contract and CI fixture (M23). C12, R-07 and
S-7's exact first-part comparison and the `jeffersonfan` case (M11). C13's "complete by the end of the
awaited `session_start` handler" and `resources_discover` as the marker (M20). C14's geometry sentence
(M21). C15 and R-02's shutdown-only clear (M22). C16, CC5 and COM-6's duplicate-spelling rejection
(M13). CC2's resolver-carries-the-value answer (M17). CC4's pinned unknown rule (M18). COM-2's
provider-wide fields (M15). COM-4's every-callback boundary (M8). COM-7's guide content (M29). S-2's
two home requirements (M25). S-6, S-8, S-9 and S-10's one-fact-one-place edits (M28). R-09, R-10 and
CC9's placement and CI shape (M23, M24). R-11 and CC7's plan obligations (M27). CC10's correction of
the false test comment (M26). ZO-2's reworded scenario (M19). Readiness's wording question, answered
by a message table in the design (M4).

**Set aside.** Codebase's console-only option and its every-occurrence option for fault reporting; a
toast per throw is unusable at three widths per frame and console-only leaves a blank entry
indistinguishable from an absent extension (M1). Codebase's second owner question, a `/jefferson`
section listing registered and refused instruments: a warning persists in the transcript, the entry
that renders answers registration, and the command keeps its pinned strings (M2). Critic's "decide only
after O10 is measured": Michael measured the window from pi's source instead — pi starts the UI before
it binds extensions, paints from a `setTimeout` queued after a `nextTick`, and awaited handlers chain on
microtasks — so a frame paints only when a later handler yields to a macrotask, and the entry holds
`blank` with no third state (M3). C8(b), an expiry repaint per timed provider field: the store arms
expiry only for its notice slot, and `shownUntil` stays out of the contract (M14). C6(b), a contract
version field: the channels grow by adding and a breaking change takes a new channel name (M9). C12's
WeakSet-only seal: identity alone does not settle a later claim, so first claim wins on top of it
(M10). C3's suggestion to modify session-data-store `:232`: that requirement is scoped to "a datum the
host provides" and does not cover reports (M7). CC2's alternative, a boolean rendering as the word
`true`/`false`: an English word inside a value is what a user writing their own words has to work
around, so the provider's resolver converts (M17). R-09's claim that pi loads every direct `.ts` child of
`extensions/`: pi reads the manifest first and never scans that directory, so the placement rests on
the layout spec instead (M26). S-2's second option, recording in the proposal that
the J1 delta is blocked on O4/O5: the requirement was added instead (M14). Zoom-out's reservation about
the contract's location being chosen for shipping convenience: the contract sits under the load root
because the type check and the tarball reach there, and the CI assertion covers the tarball (M23, M24).

## Michael's Rulings

Every ruling below is Michael's, recorded in `michael-council-rulings.md`; his row number follows each
heading. Where a ruling changed an artifact, the change is named with it.

### M1 (ruling 1): Every provider-side fault is one warning on the configuration path

Settled. A refused registration (wrong shape, a `jefferson` claim, a second claim on a taken name, one
field declared with two types), a refused report (an undeclared field, a wrong type, no registration), a
J1(b) settings refusal and a resolver fault are all `ctx.ui.notify(message, "warning")`, the path
configuration warnings take. Each names the claimed extension, the instrument or field, and the fault,
and fires once per name or extension and fault kind per session. No warning is raised inside a render: a
fault found there is queued and delivered outside it, and one found before startup completes joins the
startup-complete batch after the unknown-name parts, in arrival order. *Decided by:* J1(b)'s "a warning
names the instrument and the fault", D7's timing, and Michael's measurement that `notify` type
`warning` becomes a persistent transcript line whose `requestRender` is queued through `nextTick` and
`setTimeout`, so a notify raised in a render schedules another render
(`interactive-mode.js:2276-2285`, `:3760-3764`, `tui.js:658-667`, `startup.ts:73`). *Findings:* CC1,
C4, C17, R-05, COM-5, S-4, Codebase owner question 1. *Landed in:* a new
`instrument-registration` requirement, "A provider's fault is reported once per session"; the fault
containment requirement no longer claims Jefferson reports the fault itself.

### M2 (ruling 2): `/jefferson` does not change

Settled. Its current output and its pinned strings stay. The once-per-session warning is a persistent
transcript line, so its cause stays on screen; whether an instrument registered is answered by the entry
rendering it and by the unknown-name warning after startup. *Decided by:* D12 and the measurement that
`showWarning` adds a `ThemedText` child to the transcript, so it is not a transient toast
(`interactive-mode.js:3760-3764`, `startup.ts:35-49`). *Findings:* Codebase owner question 2, C17.
*Landed in:* proposal Impact, "Not touched".

### M3 (ruling 3): An entry waiting on a registration holds `blank`, and there is no third state

Settled. O10, measured from source: pi starts the TUI before it binds extensions, paints from a
`setTimeout` queued after a `nextTick`, and awaits handlers in order, so a frame paints in the pending
window only when a later `session_start` handler yields to a macrotask before its provider registers.
The guide tells providers to register first, before any await. *Decided by:* `owner-rulings.md`'s
"renders blank until it does", J1(b)'s "render its entries blank, as an unknown name does", and living
`statusline` :1539-1545; evidence at `interactive-mode.js:705-706`, `tui.js:658-708`,
`runner.js:813-839` (not measured in a live session). *Findings:* Critic owner question 2, C14's second
half. *Landed in:* the existing `statusline` text, which already says `blank`, and the guide's
instruction.

### M4 (ruling 4): The design states every new user-visible string, and Joel sees them at his gate

Settled. The design carries one message table holding the refused registration, the refused report, the
J1(b) refusal, the resolver fault and the two-spellings duplicate, word for word; the tests assert them;
D17's approved `row N: "<name>" is not a known instrument` is reused unchanged. *Decided by:* the
archived `reshape-the-configuration` precedent, where the block form was drafted in the design for his
gate (`tasks.md:129`, `:350`), and the fact that no archived owner ruling hands string wording to
anyone else. *Findings:* Readiness owner question 3. *Landed in:* design scope, not the deltas.

### M5 (ruling 5): J1(b) governs, and the block's rejection scenarios are scoped to Jefferson's own names

Settled. The MODIFIED scenario is scoped to Jefferson's own instruments, bare or `jefferson.default.*`;
the ADDED requirement owns provided instruments; the same scoping applies to every rejection scenario in
the instruments-block requirement a provided name could reach. *Decided by:* `owner-rulings.md`,
J1(b). *Findings:* C1, COM-1. *Landed in:* the scoped scenario, now "An option the instrument does not
declare" for one of Jefferson's own instruments.

### M6 (ruling 6): The check keys on the name, not on when the registration arrived

Settled. Every name whose first part is not `jefferson` is a provided instrument. Everything under its
key is checked, shape included: a value that is not an object, a format or label that is not a string,
an option the instrument does not take, a variable or form its registration does not carry, an unknown
modifier, and a style the theme refuses. The check runs once both the document and the registration are
in hand, whichever comes second, never before Jefferson's own `session_start`, because the style check
needs the theme. A fault refuses only that instrument; a provided name that never registers gets only
the unknown-name warning. *Decided by:* J1(b), read literally — the line falls between whose instrument
it is — with evidence that handlers run in extension order, that classification happens at read time,
that `validateStyle` needs the theme, and that `parseFormat` needs the declaration
(`runner.js:813-839`, `configuration.ts:110-112`, `:165`, `startup.ts:58-62`).
*Findings:* C2, COM-1. *Landed in:* the rewritten ADDED `statusline` requirement, plus a scenario for
a provider that registered before the read.

### M7 (ruling 7): A declared provider field is store data, with its own repaint

Settled. The `session-data-store` delta gains one requirement: a declared field enters by report and by
nothing else, reads unknown until reported, a report that changes it requests one repaint, a report of
the same value requests none, and it does not survive a session replacement.
`instrument-registration` refers to that requirement and drops its own replacement rule. `statusline`'s
"A name that registers during the session" gains: a registration that changes what a placed entry
renders requests one repaint. Living `:232` is unchanged, because it is scoped to a datum the host
provides. *Decided by:* D4 and living `session-data-store` :192 and :169, with
`session-data-store.ts:170-195` calling `requestRender` only when values differ. *Findings:* C3, R-03,
COM-3, S-3, S-5. *Landed in:* the new `session-data-store` requirement and the `statusline` scenario.

### M8 (ruling 8): What counts as a cause, what it costs, and what it renders

Settled. `undefined` from a variable, form, select or `shownUntil`, and `null` from bar, are the
declaration type's own unknown values, not faults; a fault is a throw, or a value outside the callback's
declared result type, a promise included. Containment is one boundary around the whole bound render of a
provided instrument, covering every callback path and everything their values reach, such as `collapse`
and `theme.fg`; Jefferson's own instruments render unwrapped so their defects still fail the suite. A
faulted entry renders nothing, label included, keeps its bound geometry, is not swapped to `blank`, and
tries again next render. A returned promise that rejects must be observed, because an unobserved
rejection exits pi. *Decided by:* the declared types in `instrument.ts`, S1 and T9, and Michael's
measurement that an unhandled rejection exits Node with code 1 while pi installs no
`unhandledRejection` handler on the interactive path (`interactive-mode.js:3520-3528`,
`format.ts:218-222`, `:37`). *Findings:* C5, ZO-1, R-04, COM-4, CC3, CC6. *Landed in:* the rewritten
containment requirement and four scenarios: a throw, a promise, a number, and `undefined`.

### M9 (ruling 9): Both messages are read tolerantly

Settled. An unknown key is ignored; a missing required key, or one of the wrong type, refuses the
message and warns. The channels grow by adding, and a breaking change takes a new channel name, so there
is no version field. A newer provider on an older Jefferson keeps everything the older one understands,
and on a Jefferson without the feature nothing hears the message. *Decided by:* D1 and D12, and
`ci.yml:33-35`'s rule that a published mistake is permanent, which forbids refusing unknown keys
forever. *Findings:* C6, R-06. *Landed in:* the new "Jefferson reads both messages tolerantly"
requirement, replacing "of another shape".

### M10 (ruling 10): Jefferson recognises its own claim by identity, and the first claim wins

Settled. A `jefferson` claim is accepted only when the payload is the exact object Jefferson emitted,
checked by identity; every other `jefferson` claim is refused and warned. For a provided name the first
claim wins, and a later claim is refused. Ordering or a flag set around Jefferson's own emit is not
enough, because another extension's factory may already be subscribed and can emit inside that window.
Tests on a real `createEventBus` check that every shipped name is registered after the factory runs,
that a later `jefferson.*` claim is refused, and that a second claim leaves the first in place.
*Decided by:* D6 and Michael's measurement that the bus calls listeners synchronously in subscription
order and that package extensions load at rank 4. *Findings:* R-01, C12, S-4. *Landed in:* the
namespace requirement's identity sentence and the registration requirement's first-claim rule.

### M11 (ruling 11): A provided name is exactly two dot-separated parts, reserved by exact first part

Settled. Each part is non-empty and contains no dot. The reservation compares the first part exactly
with `jefferson`, so `jeffersonfan.stats` is legal, an extension named `jefferson` provides nothing, and
case cannot imitate Jefferson. `[a-z][a-z0-9-]*` is recommended and the exact character class is the
design's. Three-part names belong to Jefferson alone. `jefferson.path` or `a.b.c` names nothing
registered, so the entry renders blank and warns after startup. *Decided by:* D6, the shipped names
(`shipped.ts:16`) and today's exact-match lookup (`shipped.ts:19-20`, `configuration.ts:228`).
*Findings:* C12, S-7, R-07. *Landed in:* the grammar requirement and three scenarios, including
`jeffersonfan`.

### M12 (ruling 12): One normalization at the reader's edge, keyed by the full name

Settled. Every name a document writes becomes the full registered name, a bare name becoming
`jefferson.default.<name>`. The configured map, the binding memo, the notice gate's identity check and
`declaredSeconds` all key on it; the spelling the document used is kept only for messages; a provided
declaration is registered under its full name, so `taiknr.path` and `jefferson.default.path` never share
a binding. *Decided by:* D6, D7 and living `statusline` "An instrument is declared once", with
`instrument-binding.ts:21`, `:23`, `:60` and `configuration.ts:170`, `:176`, `:299-300` keying by
`declaration.name`. *Findings:* C7, T7, S-8. *Landed in:* the bare-name requirement's "one instrument"
clause and the notice-gate scenario.

### M13 (ruling 13): An instruments block carrying both spellings rejects the document

Settled. The warning quotes both keys as written. Only Jefferson's own instruments have two spellings,
so this is always a fault in one of them, and the string goes to Joel at the PL2 gate. *Decided by:*
J1(b)'s second half and `ARCHITECTURE.md:89`'s "configures each name once"; without it the later key
wins in silence in `Object.entries` order (`configuration.ts:106-176`). *Findings:* CC5, C16, COM-6.
*Landed in:* a new scenario, "Both spellings of one instrument", in the instruments-block requirement,
beside the option scenario M5 scoped.

### M14 (ruling 14): What a registration carries, and what the contract does not offer

Settled. A registration carries the extension, the fields with their types, and per instrument its name,
the resolvers of the variables its format may name, a default format and an optional default label. No
`shownUntil`, no `options`, no `composed`, and no `variableForms`, `bar`, `fills` or `variableFg` in this
change. Jefferson's own declaration becomes the contract's declaration over Jefferson's readings plus
the members only its own instruments take. *Decided by:* D12, D8's requirement that change 3 build on
this contract, `ci.yml:33-35`'s permanence rule, and the measurement that the contract's import closure
is type-checked under the provider's flags; also that `armExpiry` runs only from `showNotice` and that a
resolver receives no options (`session-data-store.ts:117-139`, `instrument-binding.ts:10-16`).
*Findings:* S-1, C8, C10, C11. *Landed in:* the new "A registration carries one declaration per
instrument" requirement, the `statusline` requirement "A provided instrument takes no option of its own",
and the scenario "An option a provided instrument does not take", which sits under that
requirement.

### M15 (ruling 15): Fields belong to the extension, not to one instrument

Settled. A report names the extension and the field; every instrument that provider registered reads
the provider's fields; two providers' fields of one name are separate; one field name has one type per
provider, and a registration declaring one field with two types is refused; a provider's resolvers
receive only that provider's fields. *Decided by:* D5 in Joel's words, "hey, I'm FOO and my data, BAR,
changed", and S2. *Findings:* COM-2. *Landed in:* the fields requirement and two scenarios.

### M16 (ruling 16): Three field types, latest value, and a snapshot at registration

Settled. Field types are string, finite number and boolean; a declaration carries no first value and an
unreported field reads unknown; the store keeps the latest value per extension and field, never a queue.
A report is refused, changes nothing and warns once when it names an undeclared field, comes from an
extension with no registration, or carries a value of the wrong type, NaN and ±Infinity included. The
plain-data members are copied when it registers, so a later mutation cannot get past the J1(b) check;
resolvers are held by reference. A report before its own registration is a provider fault, not a race.
*Decided by:* D4, D8 and the measurement that the bus hands payloads over by reference while the store
detects change with `!==`. *Findings:* C11, R-08. *Landed in:* the fields and report requirements.

### M17 (ruling 17): Jefferson converts no value; the provider's resolver does

Settled. A field reaches text only through a resolver the registration supplies, which receives the
typed value with `false` distinct from `undefined` and returns the text. The scenario: a provider
declares a boolean `working` and a variable whose resolver returns "idle" for false, so a report of
false renders "idle" and before any report the entry renders as unknown. The host's `Reading` stays
`string | undefined`; the wider value range belongs only to provider fields, read through the provider's
own view. A visual for booleans is change 3's. *Decided by:* S1 and S2, `AGENTS.md`'s rule that an
English word inside a value is what a user writing their own words must work around, and D13; evidence
at `instrument.ts:32`, `format.ts:217-222`, `session-data-store.ts:7`. *Findings:* CC2, R-08.
*Landed in:* the resolver-view requirement, the boolean scenario, and `session-data-store`'s false
scenario.

### M18 (ruling 18): A provided instrument renders only when all its variables resolve

Settled. The unknown rule is unchanged and broader than the finding states: `resolveFormat` runs every
variable the declaration carries, so one `undefined` empties the entry, label included. The delta pins it
for a provided instrument, and the guide says plainly that a resolver returns text for an unreported
field, or the provider splits the instrument. *Decided by:* living `statusline` "An unknown datum
suppresses the label" and the model requirement, `docs/instruments.md:70`, and `format.ts:218-222`.
*Findings:* CC4. *Landed in:* the scenario "A field nobody has reported".

### M19 (ruling 19): One instrument in two spellings renders in both entries

Settled. The ZO-2 scenario is reworded: both entries render the one instrument with its one
configuration and its one notice gate — one visible time and one expiry — which is what two `notice`
entries do today. There is no suppression across entries, and "shows once" goes. *Decided by:* living
"One configuration, two cells holding it" and T7, with `instrument-binding.ts:18-23` memoizing one
shared instrument per name and `configuration.ts:299-300` comparing the notice binding by identity.
*Findings:* ZO-2. *Landed in:* the scenario "One instrument in two spellings, two rows".

### M20 (ruling 20): A registration is complete by the end of the awaited `session_start` handler

Settled. A registration after startup completes still renders from the next render on, but its name has
already been warned as unknown; the guide says to register before any await. `resources_discover` is the
startup-complete marker, with a pin comment like `data/notice.ts`'s, because no pi document promises the
order. *Decided by:* D7 and Michael's measurement that `session_start` is emitted to every extension
before `resources_discover` (`agent-session.js:2680-2686`, `runner.js:1165-1198`). *Findings:* C13.
*Landed in:* the registration-timing requirement and the guide's instruction, which the docs pass
carries.

### M21 (ruling 21): A late registration changes the entry's geometry too

Settled. An entry that held `blank`, which fills, takes the provided instrument's width behaviour from
the next render on, and the `statusline` scenario says so. The mechanism is the design's; C14 suggests
reading `fills` on every plan, and the design names the renderer requirement it modifies, "The footer's
tree is built once". *Decided by:* D7 and living `statusline` :260-266, with `row-renderer.ts:54`
copying `fills` when the tree is built and `:88` reading the copy. *Findings:* C14. *Landed in:* the
"A name that registers during the session" scenario, which now names the width behaviour and the one
repaint.

### M22 (ruling 22): Registrations and reports are held from the factory and dropped at shutdown

Settled. Provider registrations and reported values are dropped in the `session_shutdown` handler that
already exists, never at `session_start`; Jefferson's own registrations last for the factory's life; a
provider that registers again after a shutdown is accepted. Tests cover the provider first, Jefferson
first, and the harness starting again. *Decided by:* living `session-data-store` :169 and T2, with
`agent-session-runtime.js:102-113` emitting shutdown before every resume, new, fork and import.
*Findings:* R-02, C15. *Landed in:* the registration-timing requirement and a scenario.

### M23 (ruling 23): The contract is types only

Settled. The file `pi-jefferson/instruments` names, and every file it imports, hold type declarations
only with no runtime statement; it imports none of Jefferson's runtime files and may import pi's
published type packages; channel names are string-literal types the provider writes; it sits under
`extensions/jefferson/`; the export pin lists it with no runtime exports; if `data/` needs the field
value type, that type lives once in a types-only file in `data/` and the contract imports it. The design
adds a check that a sample provider type-checks against the packed contract under other flags. CC8's
premise is refuted: a `.ts` relative import inside the package compiles for a provider without
`allowImportingTsExtensions`. *Decided by:* D3, Chidi §4a, and Michael's `tsc` measurements under
nodenext and bundler with and without `allowImportingTsExtensions` (a closure containing
`Object.hasOwn` under lib ES2021 fails, TS2550, inside `node_modules`). *Findings:* C9, CC8, R-09, R-10.
*Landed in:* the new "The published contract is types only" requirement, and Joel's confirming ruling
recorded below.

### M24 (ruling 24): `exports` holds `./instruments` alone, and CI reads the packed manifest

Settled. `exports` holds `./instruments` only; `files` does not change, because it already ships
`extensions/`; the existing packed-tarball step gains one assertion that the export's target is in the
packed file list, read from the packed manifest; the coder shows the check failing once in a temporary
copy; the guide names nodenext, node16 and bundler resolution as supported, and notes that node10
ignores `exports`. *Decided by:* D12 and `ci.yml:33-39`, where the packed manifest is what a consumer
receives (`package-manager.js:1887-1888`, Chidi §4b). *Findings:* R-10, CC9. *Landed in:* "The
published contract resolves from the installed package" and the proposal's Package bullet.

### M25 (ruling 25): Two home requirements change to admit what this change places

Settled. The delta modifies "The source tree has the ruled homes" and "Each responsibility has a home
recognizable from its path", so together they admit the contract, the registry and its listener, and the
holding for provider fields in `data/`; the delta also states the membership and import rule of any new
grouping directory. *Decided by:* living `extension-source-layout` :103-117, :219-235 and :327-335 — the
same standard the change applies to the retired export rule. *Findings:* S-2. *Landed in:* both
requirements, registration added as a sixth responsibility, "with `data/` unchanged" removed, and a new
requirement stating a grouping directory's membership and import rule.

### M26 (ruling 26): pi never scans `extensions/` for a package that declares its entries

Settled. CC10 is right: for a package that declares `pi.extensions`, whether installed or loaded from a
path, pi reads the manifest and never scans `extensions/`. The test comment saying otherwise is false,
this change corrects it, and the contract's placement rests on the layout spec rather than that comment.
*Decided by:* `package-manager.js:1887-1893` and `:1934-1938` returning on the manifest's entries before
any directory scan, and the fact that Joel loads this repository as a path package. *Findings:* CC10,
against R-09. *Landed in:* the proposal's Source bullet; the comment itself is a task.

### M27 (ruling 27): The reader's seam and the harness are plan obligations

Settled. The design names the seam the configuration reader takes for "what has registered"
(`ConfigurationSource` or a closure); the tasks list `tests/configuration.test.ts`,
`tests/instrument.test.ts` and the `tests/jefferson.test.ts` harness as files to modify; the first task
group gives the fake pi a real `createEventBus()` and makes `start()` fire `resources_discover` after
`session_start`, so the suite stays green; tests replace `instrumentNamed` with a helper under `tests/`,
not a production export; Joel observes once, in a live session, that a late unknown name warns after
startup, and the coder does not tick that box. *Decided by:* T15's use of the real bus and the gate's
rule that no production branch exists only for tests (`tests/jefferson.test.ts:94-107`,
`dist/index.d.ts:7`). *Findings:* R-11, CC7. *Landed in:* the plan, not the deltas.

### M28 (ruling 28): One fact, one place — four minor edits

Settled. `statusline` keeps "it registers an instrument the document then names" and drops "the package
offers no other way", which `extension-source-layout` owns along with its pin. The contract's host-load
scenario says the export adds no `pi.extensions` entry instead of restating the one-entry rule. The
bare-name shorthand moves to `statusline`, which owns what a document means, while
`instrument-registration` keeps the grammar and the reservation. Provider-side MUSTs become what
Jefferson guarantees: it receives a registration sent from `session_start` in either order and sends no
readiness message, while the provider's duties go to the guide and the contract's types. *Decided by:*
the proposal's capability split and living `extension-source-layout` "One host-loaded entry per
extension". *Findings:* S-6, S-8, S-9, S-10. *Landed in:* four edits across the `statusline` and
`extension-source-layout` deltas.

### M29 (ruling 29): The guide carries one end-to-end example

Settled. `docs/extension-authors.md` declares fields, a boolean included; registers in `session_start`
before any await; reports values, `false` included; configures a namespaced entry; and stops reporting
at `session_shutdown`. It also explains the types-only import, and states the minimum Jefferson version
and the partial-reporting unknown rule. Documentation never blocks, and the docs pass carries it.
*Decided by:* D9, D18 and Joel's standing ruling that documentation never blocks a feature.
*Findings:* COM-7, with the content set by rulings 3, 9, 18, 20 and 22. *Landed in:* the docs pass.

## Owner Decisions Required

**One item needed Joel: whether the published contract carries types only, or types plus a runtime
helper. Status: ruled — types only, confirming Michael's ruling 23.**

Michael's recommendation (ruling 23) was a types-only contract: the file `pi-jefferson/instruments`
names, and everything it imports, hold type declarations with no runtime statement; the provider writes
the handshake itself. His reason is that a runtime import would force every provider to carry
`pi-jefferson` as a full dependency, because pi does not install the peer dependencies of the packages
it manages, and plain Node refuses a `.ts` file under `node_modules`.

Joel ruled in `owner-rulings.md`, 2026-11-15, "The contract is types-only", after being offered (a)
types only, where each provider writes about six lines of handshake against the types, or (b) types plus
the helper:

> "I agree with Michael. That's honestly what my mind was seeing as the package, tyoe imports for
> sanity sake of the consumer and knowing they're valid without having to run anything."

The ruling also says `pi-jefferson/instruments` carries types only, a provider imports them with
`import type` and writes the handshake itself, and the extension-author guide shows the handshake; it
clarifies the earlier "I like the small package Jefferson publishes" — the package is the types.

Landed: the `extension-source-layout` requirement "The published contract is types only", the proposal's
"types only" bullet, and no requirement in any delta names a runtime call.

Nothing else is open. All 29 of Michael's rulings are settled, none was marked `joel`, and the one item
Joel ruled on — the contract's surface — confirms ruling 23 and is recorded above. The design settles
two mechanisms, both named in the rulings above rather than left as questions: the seam the renderer
takes for a late registration, and the seam the configuration reader takes for what has registered.
