# Orientation: bar-thresholds

Michael, orientation pass. This is a consult and approves nothing; every gate still runs.

**Baseline, measured on `bar-thresholds` at `5fca135`.** `pnpm test` passes 578 of 578 and `pnpm typecheck` is clean. `openspec validate --all --strict` passes all four living specs. The change itself fails validation because it has no proposal or deltas yet, which is expected at this stage.

## 1. The decisions that bind this change

### Joel's rulings for this change (`owner-rulings.md`, 2026-11-25)

Where I read a ruling, the reading is marked and its source is named.

- **D1. A threshold is a state.** The user sets the percentages, and at each one any option of the instrument can change: `format`, `label`, `style` and `fill`. For a provider that opts into it, `formats` is included. `activeAt` is the threshold's own key. My reading is that `thresholds` is not an option inside a threshold. The existing unknown-option rule rejects it there with no new rule (`configuration.ts:290-294`).
- **D2. The defaults stay 70 and 90.** From 70 the fill takes the theme's `warning` colour and from 90 its `error` colour. They colour only the fill and apply at their own number (`>=`).
  - **Where the old strict rule came from.** Today's strict "above" was not an accident. It copies pi 1.4.0's own footer: `node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/components/footer.js:176-180` uses `> 90` and `> 70`. The living statusline scenario "The pressure a bar shows" names "the host's own footer" as its source (`openspec/specs/statusline/spec.md:700-705`).
  - **What the change owes.** Joel's ruling stands and outranks that record. The spec delta must replace the scenario's source with his ruling, and an ADR must record that pi parity is retired (`AGENTS.md`, "Where decisions live"). The conductor can tell Joel the strict rule matched pi as background. It is not a question.
- **D3. A user's list replaces the defaults.** My reading: because the user's list is the whole list, `"thresholds": []` means no thresholds, and it is the way to turn the default colours off.
- **D4. The settings shape copies the instrument's own.** `fill` has the same shape as `style`, and it is valid both at the top level and inside a threshold. `style` covers the whole instrument everywhere, including the bar's fill and its track.
  - On the fill, `fill` overrides `style` key by key, as `bar.ts:21-22` already does with `{ ...style, fg: "warning" }`.
  - If `fill` replaced `style` on the fill, `style` would no longer cover "the whole instrument everywhere", so the ruling decides this.
  - `fill` goes through the one style validator, `validateStyle` (`format.ts:183-225`). pi does not validate a `ThemeStyle` at runtime (research-chidi §2).
- **D5. Thresholds are independent of each other.** A key a threshold leaves out comes from the top level, otherwise from the declaration's default, and never from another threshold. The ruling does not say how deep the fallback goes inside an option whose value is an object; that is question Q1 below.
- **D6. At most four are honoured.** Of the thresholds at or below 100, the four lowest `activeAt` values apply. More than four written loads with a warning, and nothing is rejected for the count.
- **D7. `activeAt` must be a whole number.**
  - It may be any integer from 0 to 100.
  - A value above 100 does nothing, and no warning is ruled for it.
  - A negative number, a decimal or a non-number rejects. My reading: a missing `activeAt` is the same kind of "actual mistake" and rejects too.
  - Two thresholds at the same `activeAt` reject.
- **D8. Unknown counts as 0, "always".** That covers both of the bar's empty values. `null` is the window known with no estimate (`context.ts:14`). `undefined` is no usage, or a provider's unknown. A threshold at 0 applies if one is written; otherwise the top level applies. `$percent` and the empty track do not change.
- **D9. Jefferson's own instruments that declare `bar` take thresholds.** "By default I mean any instrument that Jefferson owns that can include a bar." That outranks the earlier phrase "include a bar by default", which would have excluded `context`, because its default format `$percent/$window` has no `$bar`. Today `context` is the only shipped instrument with a bar (`context.ts:14`, pinned by `tests/instrument.test.ts:85`).
- **D10. A provider opts in by listing them.** The provider writes `options: ["thresholds", "fill"]`. A provider that does not opt in draws the default bar.
  - "That's all documentation … not code on our end" means Jefferson changes no provider's code. Accepting the opt-in is Jefferson's code: the contract type (`instrument-contract.ts:49`), the adapter's option check (`instrument-binding.ts:153-161`) and the settings check (`configuration.ts:167-174`).
  - "That's exactly it" settles this.
- **D11. The bar's width does not change.**

### Inherited rulings

- **J1(b), 2026-11-16** (`archive/2026-11-16-extensions-provide-instruments/owner-rulings.md:31-36`). A fault in a provided instrument's settings refuses that instrument alone. Jefferson's own instruments keep the whole-document rejection.
  - So "rejects the settings" means the whole document for `context`, as the card's acceptance criteria say. For a provider it means only that instrument is refused.
- **"Providers get what Jefferson's instruments get", 2026-11-16** (same file, `:90-93`).
- **"Variables are never coupled", 2026-11-16**, and ADR 0020.
- **Colour precedence, 2026-11-24** (`archive/2026-11-25-theme-colors-as-modifiers/owner-rulings.md`). Strongest first: a colour the format names, then the variable's declared colour, then `style`. A threshold's `style` takes `style`'s place in that chain, and nothing above it moves. `$bar` takes no modifier (`format.ts:127-129`), so a format colour never reaches the fill.
- **2026-11-07:** "A user shouldn't have to configure any more than truly necessary."
- **2026-11-03:** "Don't invent what we don't have to."
- **Joel's preferences:** reusable, composable visuals.
- **"Unused settings", 2026-11-16:** a block entry for an instrument that never registers stays silent.
- **ADR 0015:** a printed warning says "instrument", never "cell" or "entry".

### Standing records this change leans on or revises

Each of these records a decision; none of them proves one.

- **statusline, "An instrument is declared once" (`spec.md:443-449`).** The options come from the declaration, and adding an instrument must not need a reader edit. Thresholds must therefore be driven by a declaration's options, never by the name `context`.
- **extension-source-layout, "The bar has its own file" (`spec.md:377-398`).** A visual imports no file of this package. That spec also says `bar.ts` holds "the drawing and the thresholds", and that the bar renders "byte for byte" as before. This change makes both false, and its delta must modify them.
- **statusline, "Only a variable the format names can blank an instrument" (`spec.md:1890-1895`), and ADR 0020.** The wording needs amending; see T5.
- **statusline, "A provided instrument takes only the options Jefferson implements" (`spec.md:1831-1836`).** The change modifies it.
- **The precedent for checking past a ceiling.** The reader checks every entry and only then truncates to `MAX_CELLS` (`configuration.ts:363-366`, `:419-421`). So all thresholds are checked, including any past the fourth and any above 100, before the lowest four are honoured.

## 2. What the change must not touch or foreclose

- **The published contract stays types-only at `exports["./instruments"]`.** It gains option names, no runtime statement, and the CI pin stays as it is (`AGENTS.md`).
- **`$bar`'s grammar.** A format holds one `$bar`, it takes no modifier, and it takes the width the rest of the format leaves.
- **The geometry the bar spec pins.** That is the floor and clamp, the track drawn `dim` for a `null` reading, and blank for `undefined` (`tests/format.test.ts:157-169`, `tests/jefferson.test.ts:524-538`, `:685-727`).
- **The provider rules from that change.** J1(b) containment, the outcome that never depends on load order (`configuration.ts:514-515`), and faults reported only for a document that installs (`configuration.ts:503-505`).
- **`notice`, `seconds` and composed `formats`.** They behave as they do today.
- **The width-0 rule (AGENTS item 4).** The state in force must depend on the readings and never on the width.
- **The neighbouring card "Let users compose custom instruments from variables and visualizations".** Thresholds must hang off a declaration's `bar` and its option list, not off `context`. A future user-built instrument with a bar can then take them, or not, as that card decides.
- **The neighbouring card "Show pi's spinner…".** It builds on the timed visual and the provider timer. This change touches neither.

## 3. The traps, measured where I could

- **T1. The strict edge is pinned in three places.**
  - In code: `bar.ts:21-22` (`>`).
  - In a test: `tests/format.test.ts:147-153` expects 70 to keep `accent` and 90 to stay `warning`. The test has to flip; it does not pass with the new rule.
  - In the extension-source-layout spec: "renders as before, byte for byte" (`spec.md:390-393`).
  - `openspec validate --strict` cannot catch the stale scenario. Provenance is under D2.
- **T2. `fills` is fixed when the instrument is bound, and a state can change it.**
  - `Instrument.fills` is a `readonly boolean` (`components/instruments/instrument.ts:14-18`). It is computed once from the top-level segments (`instrument-binding.ts:309`).
  - The row reads it on every plan, but without the sample (`row-renderer.ts:54-59`). A threshold's format that adds or drops `$bar` changes whether the instrument fills.
  - The label segment and its gap (`:295-298`) and the choice of composed format set (`:303-306`) are also bound once from the top-level format. All three have to become per state.
- **T3. The provider boundary wraps only `render`.** `containProvided` (`instrument-binding.ts:266-279`) passes `fills` straight through.
  - The adapter's guard covers only the provider's call. Reading `.then` on the returned value happens outside the `try` (`:100-113`).
  - I ran that guard's exact logic in Node against a value whose `then` getter throws: the error escapes `call()`.
  - So if the state is chosen anywhere outside `render`, for example to compute `fills` for the plan, a provider's `bar` can throw into the row plan and take down the footer. Choosing the state has to sit inside the outer boundary.
- **T4. The over-four warning has no home yet.** Three warning paths exist today:
  - `Configuration.warning` is set "only when a present document could not be read or was rejected" (`configuration.ts:88`), and is delivered at `session_start` (`startup.ts:153`).
  - `acceptedWarning` covers only unknown names (`configuration.ts:535-538`).
  - The faults ledger dedupes by scope and kind, uses the wrapper `pi-jefferson: ` (`faults.ts:28-29`, `:54-56`), and opens at `resources_discover` (`startup.ts:59-72`).

  A provided instrument's settings can be checked late, by the watch (`configuration.ts:513-526`), so only the ledger reaches that moment. Chidi's gap ("no channel from the factory", research-chidi §3) does not apply: Jefferson reads the document inside `session_start`, where it has `ctx` (`startup.ts:118-141`).
- **T5. The ADR 0020 rule says an unnamed variable is never resolved.** The rule (`spec.md:1890-1895`) says a declared variable the format leaves out "MUST NOT be resolved", with `$bar` named.
  - Thresholds must read the bar's percentage whether or not the format in force names `$bar`. The state's format cannot be read until the state has been chosen.
  - The intent survives: an unknown counts as 0 and never blanks the instrument (D8). The wording still needs a deliberate amendment in the spec delta and the ADR, and that must happen in this change.
  - One consequence follows: a provider's `bar` that throws gets reported even when no `$bar` is drawn, but only once the user has configured thresholds.
- **T6. Two parallel settings checkers.** Jefferson's own path (`configuration.ts:285-351`, which throws) and the provided path (`:142-238`, which returns a refusal) already restate the format, label, style and `formats` rules. Adding the threshold rules to each would make two copies of D6 and D7. One threshold reader should serve both paths, and they should differ only in how a fault is surfaced.
- **T7. Places that pin `formats` as the only extra option.**
  - The contract type `readonly "formats"[]` (`instrument-contract.ts:49`).
  - The adapter's refusal `option-unimplemented` (`instrument-binding.ts:157-158`), and the message it maps to (`registration-listener.ts:214-221`).
  - The sample provider (`tests/fixtures/sample-provider/provider.mts:81`).
  - `tests/instrument.test.ts:82`, which pins every shipped instrument except `notice` to no extra options; `context` will now list two.
  - The precedent for an option that cannot work: `formats` without `composed` is refused (`instrument-binding.ts:161`).
- **T8. What `$percent` shows and the threshold can disagree.** `$percent` is `toFixed(1)`. I measured it: 69.95, 69.96 and 69.99 all print `70.0` while `>= 70` is false; 89.95 prints `90.0` and 99.96 prints `100.0`. pi's own footer has the same gap. See S4.
- **T9. A percentage can fall outside 0 to 100.** pi does not clamp context usage (`agent-session.js:3528`), so the bar can read more than 100. A provider may return any finite number, negatives included (`instrument-binding.ts:185`, `tests/registration.test.ts:1836-45`). JSON's `-0` passes `Number.isInteger` and `>= 0`, and it equals 0, so a `-0` and a `0` threshold are duplicates (research-chidi §4).
- **T10. Documentation that becomes false.**
  - `docs/formats.md:92` says "above 70%… above 90%".
  - `docs/extension-authors.md:144`, `:247` and `:258` say `formats` is the only extra option.
  - The Configuration paragraph in `ARCHITECTURE.md` lists what is checked at read time.

  These go to the docs pass; under Joel's standing ruling, documentation never blocks the feature.

## 4. The questions only Joel can answer

### Q1. When a threshold sets a style, does it replace the instrument's style, or change only the keys it names?

This covers `style`, `fill` and a provider's `formats`. His rulings say a key a threshold leaves out comes from the top level. They do not say whether that holds inside `style`. His own words support both readings: "a key means the same thing inside a threshold" points to A, and "configure no more than truly necessary" points to B.

**A: the threshold's `style` replaces the top-level `style`.** Where it goes wrong:

1. A user writes `"fill": {"bold": true}` for `context` and no thresholds.
2. Context passes 70%.
3. The default threshold's fill takes over, and the bar turns yellow and stops being bold.

Or:

1. A user writes `"style": {"bold": true}` and a threshold at 90 with `"style": {"fg": "error"}`.
2. Usage passes 90%.
3. The instrument turns red and loses its bold.

**B: the threshold's keys go on top of the top-level keys.** Where it goes wrong:

1. A user writes `"style": {"bg": "selectedBg"}` and a threshold at 90 with `"style": {"fg": "error"}`, wanting red text on the plain background.
2. Usage passes 90%.
3. The text turns red but keeps the background. No style value removes a background. The user has to move the background into a threshold at 0 instead; independence keeps it from reaching the one at 90.

**I would choose B.**

- Today the bar's warning colour already goes on top of the instrument's style rather than replacing it (`bar.ts:21-22`). The format language adds its attributes and colours on top of the style the same way (`format.ts:232-237`, `:318`). A provider's `formats` goes on top of the declared defaults one kind at a time (`instrument-binding.ts:316-318`).
- B lets a user write only what changes, per his 2026-11-07 ruling.
- A's first failure hits the defaults themselves, a user who never wrote a threshold.

**Source the question rests on:** the 2026-11-25 independence ruling, and the code above.

## 5. What is settled, and what stays open

### Settled here, with the source

These need no question to Joel.

- **S1. A threshold that changes whether the bar shows also changes the instrument's width.**
  - When a threshold adds or drops `$bar`, the instrument's width in the row follows the state in force. At that percentage it sizes exactly as if that threshold's settings were its own.
  - The alternative was to make an instrument fill whenever any of its states draws a bar. Then a threshold's format would shape the instrument below that threshold, which is the coupling the independence ruling and "Variables are never coupled" rule out.
  - The consequence Joel should be able to see: a row reflows when the percentage crosses a threshold that adds or removes the bar. "Show the bar only from 70%" works as a user would expect.
  - The cost in mechanism is T2 and T3.
- **S2. Choosing the state.** The thresholds in force are taken as follows:
  - each is checked, past the cap and above 100 included (D7, and the ceiling precedent);
  - any above 100 are dropped;
  - the rest are sorted ascending and the lowest four are kept, with a warning when more than four were written (D6).

  The state is the highest kept `activeAt` at or below the bar's raw percentage, with an unknown counted as 0 (D8). Without one, the top level applies. A negative known percentage is below every threshold, a threshold at 0 included, under the literal `>=` of D2.
- **S3. The provider rules.**
  - A provider fault refuses that instrument alone (J1(b)).
  - The over-four warning is not a refusal for either origin (D6), and the instrument renders as configured.
  - The two options are separate opt-ins. A threshold accepts the instrument's declared options except `thresholds` (D1).
  - Declaring `thresholds` or `fill` without `bar` refuses the registration, by the `formats`-without-`composed` precedent (`instrument-binding.ts:161`). Such a setting could never do anything.
- **S4. Thresholds compare the raw percentage, not the rounded one `$percent` prints (T8).** Comparing against the rounded text would need a rounding rule for each declaration. A provider's bar has no printed text to round to, so that would be invented mechanism, which the 2026-11-03 ruling rules out. The gap is under 0.05 percentage points, and pi's own footer has it.
- **S5. A threshold's style is the instrument's style while it is in force.** Format colours and the declared colours still beat it (2026-11-24). That meets the card's criterion that "styles and modifiers still compose".
- **S6. No prototype is needed.** Every mechanism question here can be answered from source: the row reads `fills` on every plan through a getter (`row-renderer.ts:54-59`), and the reach of the provider boundary is in T3. Q1 belongs to Joel and cannot be prototyped.

### Open for the council and the design

The design must close each of these. None of them is Joel's.

1. **Where the defaults live.** The visual cannot import the binding. The design must say where the 70 and 90 constants live, and how the extension-source-layout scenarios on `bar.ts` "holding the thresholds" are rewritten (T1).
2. **Each state's bound form.** The design must define how a state's segments, label gap, composed set, `fills` and fill style are bound. It must also put state selection inside the provider boundary (T2, T3).
3. **The over-four warning.** The design must name one path for it that gives the same wording whichever moment checks the instrument (T4). It must not warn for a document that is rejected or an instrument that is refused (`configuration.ts:503-505`).
4. **One threshold reader for both paths (T6).** Its messages should place a threshold by its 1-based written position, as rows do (`configuration.ts:372`, `:382`), and use "instrument" wording (ADR 0015).
5. **Keeping the bar rule structural.** Every shipped declaration that has `bar` must list `thresholds` and `fill`, enforced by a test or by derivation, not by memory (D9, statusline `spec.md:443-449`).
6. **Spec deltas and ADRs.** Covered so far are the strict-to-`>=` retirement and pi parity (D2), the ADR 0020 wording (T5), and the provided-options requirement (T7).
7. **Tests the card asks for.** A configured threshold, the unconfigured default at exactly 70 and 90, and a whole-document rejection for a bad threshold. The design should add the per-instrument refusal for a provider's bad threshold, the over-four warning, the `[]` case and the unknown-as-0 case.

### What this pass did not cover

- I did not read the brain card itself; `plan-context.md` quotes its acceptance criteria.
- I read `registration-listener.ts` only at the refusal mapping.
- I did not read every page of `docs/`.
- I did not run the CI pack check.
- I did not re-derive the zentui, Starship and Grafana comparisons. Nothing here rests on them.

The council, and later gates, must check:

- that state selection stays inside the provider boundary;
- that the strict-edge test is flipped, not deleted;
- that the threshold rules live in one place.