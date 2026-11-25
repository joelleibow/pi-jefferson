# Design Review

## Stage 1: Initial Zoom Out

The `council-zoom-out` lens reviewed `design.md` against `zoom-out-standard.md` and passed it with one minor finding.

**ZO-01 (minor), Module & File Placement.** The authoritative placement table named `extensions/jefferson/instrument-binding.ts`, a file that does not exist. The existing binding lives at `extensions/jefferson/components/instruments/instrument-binding.ts`. An implementer following the table would look for or create a top-level file instead of modifying the existing adapter, foreground guard and binding in the component directory. Recommendation: correct the row to the component path and keep all proposed binding changes in that existing module, with no forwarding file.

The lens's recommendation: "Pass Stage 1 with one minor correction to the authoritative file-placement table. The parser owns lookup order, segments retain foreground intent, rendering owns precedence, and the existing listener/startup boundary owns waiting for a theme. Reusing the foreground probe and existing theme/test infrastructure avoids parallel validation paths, new dependencies, and unnecessary source files."

Three assumptions were verified — the foreground probe is duplicated today in `validateStyle` and the provided `variableFg` guard, so the parser's third consumer justifies extracting into the format-language module; the source structure already separates startup wiring, registration bus handling, configuration reading, format-language behaviour and instrument binding; and `fakeTheme` already supports invented names, missing real pi names, background-slot rejection and case-sensitive lookup. One assumption was unverified: the pinned host's theme availability at `session_start` and invariant foreground names across theme switches, which the council had settled as platform measurements.

Report: `design-review-1-zoom-out.md`.

## Stage 2: Comprehension Test

**What this proposes (naive paraphrase)** — verbatim from `design-review-2-comprehension.md`:

> "The design adds live-theme foreground names as pipe modifiers in formats, with reserved modifiers and variable forms taking priority. A format colour overrides the instrument's own colour and configured foreground for that piece. Provider messages received before a theme exists are queued and then checked in order, so invalid default formats still refuse the whole registration. The design also forwards a parser error that quotes an unrecognized name and defers documentation changes to a separate pass."

**How the existing system works, per design.md** — verbatim from the same report:

> "Formats are parsed into segments and rendered with theme styling; unknown pipe names are currently refused. Style validation and provided-instrument colour checks already consult the theme, but provided default formats are parsed without one. A registration's first fault refuses the whole registration, while reports from an unregistered provider are refused. Extensions register before the session theme exists, and Jefferson installs its footer after session start."

The comprehension lens raised five findings. **C1 (major)** — the design relied on variable forms and `$bar`'s special refusal without saying what a form is, how one is declared or written, or what `$bar` refuses. **C2 (major)** — the only planned user-facing explanation of the new syntax and its precedence was a docs pass explicitly stated not to block the feature. **C3 (major)** — the no-render-guard rationale proved theme-name invariance at the pinned pi version, while the migration plan also supported other pi versions without saying what happens if their theme name sets vary. **C4 (minor)** — the table said there were six `instrumentBindings` sites but listed seven line locations. **C5 (minor)** — the proof said a row still renders after its provider registration is refused, but did not describe what the user sees in that row or whether a fallback is used.

Its recommendation: "Clarify the format vocabulary and release-facing behavior before implementation; also correct the inconsistent test-site count."

Report: `design-review-2-comprehension.md`.

## Stage 3: Critic Review Loop

Four rounds, run by `council-critic` and `council-structural` against `feature-spec-standard.md`, with Michael as Resolver. Two consecutive clean rounds met the convergence criterion before the five-round cap.

Reports: `design-review-3-r1-critic.md`, `design-review-3-r1-structural.md`, `design-review-3-r2-critic.md`, `design-review-3-r2-structural.md`, `design-review-3-r3-critic.md`, `design-review-3-r3-structural.md`, `design-review-3-r4-critic.md`, `design-review-3-r4-structural.md`.

| Round | Findings | Severity mix | Michael's round status |
|---|---|---|---|
| 1 | 11 | 1 blocking, 5 major, 5 minor | needs fixes |
| 2 | 9 | 3 major, 6 minor | needs fixes |
| 3 | 5 | 5 minor | clean |
| 4 | 5 | 5 minor | clean |

**Round 1.** The blocking finding was critic-R1: the hold queued provider payloads by reference, so a provider could change its own message between arrival and the drain, breaking the published "copy the plain data when it registers" behaviour and `tests/registration.test.ts:598-622`. The five major findings were critic-R2 (Jefferson's own load-time vet was claimed but did not exist), critic-R3 (the rewrite table and file table omitted sites), critic-R4 (the listener's interface and states were never specified), structural-STR3-1 (the load-time vet had no owning module), and structural-STR3-2 (the required-check signature contradicted "plain sites pass none"). The five minor findings were critic-R5 (the same signature contradiction), critic-R6 and structural-STR3-3 (the second production `instrumentBindings` site at `configuration.ts:550`), critic-R7 (parse-once not weighed), and structural-STR3-4 (precedence restated in decision 3).

**Round 2.** Three major findings: critic-R2-1 (the drain lacked per-message containment, so a throwing provider payload could skip `readConfiguration` and `installFooter` in the provider-first order), critic-R2-2 (the form check stopped working once a colour lived outside `modifiers`), and critic-R2-3 (the full warning texts for the provided paths were not stated). Six minor findings: critic-R2-4 (`variableFg` left out of the copy), critic-R2-5 and structural-STR-R2-1 (wrong `instrument-binding.ts` path), critic-R2-6 (new signatures unnamed), structural-STR-R2-2 (the settings warning text could drop the instrument name), and structural-STR-R2-3 (the copy's member list not tied to the contract).

**Round 3.** Five minor findings: critic-R3-1 (a field type posted as an object is quoted as it reads at the vet), critic-R3-2 (getter scope understated), critic-R3-3 (the shape rule omitted the message and `instruments` elements, and `checkProvidedSettings`'s check parameter was unnamed), critic-R3-4 (`:1797-1806` should not be rewritten), and structural-STR-R3-1 (the `:1595-1611` citation was ambiguous). Michael marked the round clean.

**Round 4.** Five minor findings: critic-R4-1 (the message itself was not guarded by the shape rule), critic-R4-2 (maps must be copied by defining entries, not assigning), critic-R4-3 (three line citations were wrong), structural-STR4-1 ("What this design does not add" restated scope facts with homes), and structural-STR4-2 (shorthand not anchored). Michael marked the round clean.

## Stage 4: Intermediate Zoom Out

The `council-zoom-out` lens audited the edits from Stages 2-3 and passed the design with one minor finding.

**ZO4-01 (minor), "The copy, at arrival" and the `tests/registration.test.ts` placement row.** The snapshot clarification dropped below design altitude: it prescribed member-table implementation, exact TypeScript typing syntax, individual collection-copy operations, and a detailed inventory of malformed-input regression fixtures inside the file-placement table. The essential architectural decision was sound — the listener snapshots contract-known members at arrival, preserves malformed shapes and own keys, and vets the snapshot once — but the recipe and fixture inventory made that decision harder to locate. Recommendation: keep the listener ownership, snapshot timing, contract-key-only rule, shape/own-key preservation, accepted observable differences and per-message containment in `design.md`; move the precise table typing, collection-copy recipe, exhaustive measurements and individual regression fixtures into `tasks.md` or supporting research.

The lens's recommendation: "Pass Stage 4 with one minor altitude cleanup. The corrected binding path targets the existing component owner, and the design adds no source files, dependencies, architectural layers, or neighboring feature work. The listener hold and arrival-time copy address concrete compatibility failures rather than speculative needs, but their implementation recipe and exhaustive regression inventory should not remain in the high-level design."

Report: `design-review-4-zoom-out.md`.

## Michael's Resolutions

Every finding was resolved by Michael as `propose_fix`, except two declined nits. No finding was contested, escalated or prototyped.

**Stage 2 (comprehension):**
- **C1** — `propose_fix`: replaced the restated order and "the delta states this" with pointers to the statusline delta; kept the `$bar` check where it runs today.
- **C2** — `propose_fix`: removed the release gate; the docs pass runs inside the change and never blocks a feature.
- **C3** — `propose_fix`: added no render-time guard, no revalidation and no operator remedy; scoped the no-guard statement to the pinned name-set invariance.
- **C4** — `propose_fix`: corrected the count from six to seven.
- **C5** — `propose_fix`: described the row's visible outcome and the two warnings.

**Stage 3, Round 1:**
- **critic-R1** — `propose_fix`: copy at arrival.
- **critic-R2** — `propose_fix`: dropped the load-time vet claim.
- **critic-R3** — `propose_fix`: added the missing sites to the rewrite table.
- **critic-R4** — `propose_fix`: specified the listener's handle, states and transitions.
- **critic-R5** — `propose_fix`: closed by structural-STR3-2's signature.
- **critic-R6** — `propose_fix`: added `:550`.
- **critic-R7** — `decline`: parse-once is not required; the bind keeps its parse for Jefferson's own instruments.
- **structural-STR3-1** — `propose_fix`: dropped the load-time vet claim.
- **structural-STR3-2** — `propose_fix`: named the signature and recorded the `tsc` measurement.
- **structural-STR3-3** — `propose_fix`: added `:550`.
- **structural-STR3-4** — `decline`: the sentence names the mechanism `resolveFormat` implements and agrees with the delta.

**Stage 3, Round 2:**
- **critic-R2-1** — `propose_fix`: per-message containment; live before the drain.
- **critic-R2-2** — `propose_fix`: the form check also refuses when the segment carries a colour.
- **critic-R2-3** — `propose_fix`: both warning templates stated verbatim.
- **critic-R2-4** — `propose_fix`: `variableFg` added to the copy's maps.
- **critic-R2-5** — `propose_fix`: corrected the path.
- **critic-R2-6** — `propose_fix`: named every new signature.
- **structural-STR-R2-1** — `propose_fix`: corrected the path.
- **structural-STR-R2-2** — `propose_fix`: the settings warning keeps the instrument name.
- **structural-STR-R2-3** — `propose_fix`: the copy's member table is typed against the contract.

**Stage 3, Round 3:**
- **critic-R3-1** — `propose_fix`: recorded the field-type quotation as an accepted difference.
- **critic-R3-2** — `propose_fix`: corrected the getter scope to "any side effect".
- **critic-R3-3** — `propose_fix`: added the shape rule, `instruments` elements and `checkProvidedSettings`'s check parameter.
- **critic-R3-4** — `propose_fix`: left `:1797-1806` unchanged.
- **structural-STR-R3-1** — `propose_fix`: named the file and requirement in the citation.

**Stage 3, Round 4:**
- **critic-R4-1** — `propose_fix`: guarded the message with `isPlainObject`.
- **critic-R4-2** — `propose_fix`: maps copied by defining entries.
- **critic-R4-3** — `propose_fix`: corrected three citations.
- **structural-STR4-1** — `propose_fix`: removed "What this design does not add" and kept its unique fact in the invariance decision.
- **structural-STR4-2** — `propose_fix`: added one shorthand legend to Context.

**Declined nits:** critic-R7 (parse-once) and structural-STR3-4 (precedence restated in decision 3).

## Settled Findings

The final list from Round 4's resolution:

1. **comprehension-C2 (release gate on docs):** no release gate. The docs pass has no gate and never blocks a feature (D12; conductor-janet `references/implementation.md:10`). It runs on the change's branch after the implementation gate and before Validate (`SKILL.md:83`), so the feature never ships without its docs. Re-open only if the Migration Plan's docs-pass section changes.
2. **comprehension-C3 (a theme lacking a name on an unpinned pi):** the design adds no render-time guard, no revalidation on a theme switch, no operator-remedy mechanism and no warning about future pi (council rulings 10 and 14; `~/Projects/AGENTS.md`). The no-guard rule rests on one fact measured at the pin: every theme in one process carries the same names. The package already rests on that fact for `style.fg` and for the fixed names the thinking, notice and bar instruments draw. Re-open only if the pin moves or that decision changes.
3. **comprehension-C5 (two warnings for a refused registration a row places):** the unknown-name notice followed by the refusal is today's measured behaviour and what the delta's scenario specifies. Do not ask to suppress either warning; S0 holds.
4. **comprehension-C1 (defining forms and `$bar` in the design):** the statusline delta defines forms and the `$bar` restriction ("A variable can declare forms"; "A modifier follows a variable or literal text"). The design points there and does not restate them, per the feature-spec standard's one-home rule.
5. **structural-STR3-1 owner question (load-time vet for Jefferson's own payload):** settled as dropping the claim (critic-R2's change). Shipped default formats are parsed at the read and at the bind with the read's check. No load-time vet, refuse-all check or second check constructor is added. Re-open only if a shipped default format must name a colour before any session exists.
6. **critic-R1 / critic-R3-2 accepted difference (getters):** the copy at arrival reads every contract-named member exactly once, before any is judged. A getter with any side effect, a throw included, therefore runs even on a member today's vet never reaches. A payload that carries a fault and a later throwing member now ends on the throw: pi's bus logs it, and there is no warning. A getter that posts on a member past the first fault now posts. This is accepted because only a payload whose own getters do work can show it, and that payload's registration is refused either way. Rejected: a lazy copy in the vet's order, which states decision 15's order a second time. Re-open only if the copy's rule changes.
7. **critic-R1 rejected alternative (vet at arrival and defer only the colour answers):** rejected because the first fault would follow the load order (ruling 2(a)), and because name-taken and report-no-registration depend on whether earlier queued messages are accepted. Re-open only if the hold is redesigned.
8. **critic-R7 (parse once at admission):** declined. Jefferson's own instruments are never parsed at admission, so the bind keeps its parse regardless. Both parses ask a theme that carries the same names (ruling 10), and the required check at every site closes the double-parse risk. Re-open only if the bind's parse or the adapted declaration's shape changes.
9. **structural-STR3-4 (precedence restated in decision 3):** declined. The sentence names the mechanism `resolveFormat` implements and agrees with the delta, which is the rule's home. Re-open only if decision 3 or the delta's precedence requirement changes.
10. **critic-R2-1 alternatives (how the drain keeps the arrival-time outcome):** settled as per-message containment, logged in the bus's shape, with the listener live before the drain. Rejected alternatives: making the field-type-outside text throw-proof; a drain that stays holding while it runs; a drain that loops until empty. Re-open only if the drain or the vet's provider-code surface changes.
11. **critic-R2-3 wording (the warning templates):** settled as the possessive template the own-instrument read already uses. Settings path: the instrument's quoted name, then `'s`, then the parser's message, ending `; it renders blank`. Registration arm: the instrument's quoted name, then `'s default`, then the parser's message. Both forward every parse fault, and the settings-variable special case keeps its text. Alternatives that rewrite the parser's message to fit `is configured with` or `carries` were rejected as string surgery. Re-open only if the one-message decision changes.
12. **critic-R3-1 accepted difference (a field type posted as an object):** the copy keeps a `fields` entry, and a `fields` value that is not a plain object, as posted, one level deep. A provider's later change to such an object therefore reaches the quoted value in the field-type-outside warning in the provider-first order only (measured: `{"kind":"y"}` against `{"kind":"x"}`). The refusal, its kind and its scope are identical in both orders, and nothing renders from it. So "A held message is judged as it was posted" holds: the quotation is neither a check nor a render. This is accepted because only a payload that breaks the field contract and then mutates the object it broke it with can show it. Rejected: a deep copy, and stringifying the value at arrival. Re-open only if the copy's rule or the field-type-outside text changes.
13. **critic-R4-1 / critic-R4-2 (the copy's write and its guard on the message):** settled. The message itself is copied only when `isPlainObject` accepts it, and any other posted value is kept for the vet to refuse as today. A map is copied by defining its own enumerable entries (`Object.fromEntries(Object.entries(value))`), never by assignment, so an own `__proto__` key stays an entry. Both choices were measured at cf90995 to reproduce today's refusals in both load orders. Re-open only if the copy's rule changes.
14. **structural-STR4-1 (Migration Plan's version-skew reasons):** the Migration Plan keeps ruling 11's reasons as the operator-facing home ruling 11 assigned it. Non-Goals only cites ruling 11. This is not a duplicate to remove. Re-open only if Non-Goals starts restating those reasons.

## Owner Decisions Required

None. No finding was escalated to Joel. The one owner question in the reports — structural-STR3-1's "whether to place a load-time vet for Jefferson's own payload or drop the claim" — was settled by Michael as dropping the claim, not escalated.
