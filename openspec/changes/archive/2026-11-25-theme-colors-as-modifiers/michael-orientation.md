# Orientation: theme-colors-as-modifiers

Michael, 2026-11-24. This is a consult. It approves nothing, and every gate still runs.

- **Base:** `cf90995` on `theme-colors-as-modifiers`.
- **Platform:** facts were checked against the pinned pi 1.4.0 under `node_modules/@earendil-works/pi-coding-agent`.
- **How I measured:** read-only `node` scripts, plus scratch worktrees under `mktemp -d` that I removed afterwards. I edited nothing in the checkout.
- **Baseline at `cf90995`:** `node --test` gives 538 pass and 0 fail, and `tsc --noEmit` is clean.

## 1. The decisions that bind this change

### Joel's rulings for this change (`owner-rulings.md`, 2026-11-24)

- **D1.** Every foreground colour is a modifier, and no background colour is. The names and their slot come from what pi provides, never from a theme file.
- **D2.** A reserved word keeps its meaning. Where a colour's name is already a modifier, the modifier keeps the name, so `|dim` stays the faint attribute.
- **D3.** Nothing that works today changes. A colour combines with the other modifiers on the same piece of text.
- **D4.** Text colour, strongest first:
  1. the colour written in the format;
  2. the instrument's built-in colour for that variable (`variableFg`);
  3. the instrument's `style`.

### Earlier rulings of Joel's that this change inherits

- **D5.** *"Don't invent what we don't have to."* pi is the source of truth, and names live in one place (`archive/2026-11-05-configurable-instruments/owner-rulings.md`).
- **D6.** Modifiers chain, and they apply to plain text as well as to variables (`archive/2026-11-06-variable-modifiers/owner-rulings.md`).
- **D7.** Anything a Jefferson instrument can do is open to extension authors (`archive/2026-11-16-extensions-provide-instruments/owner-rulings.md`, "Providers get what Jefferson's instruments get"). So D1–D4 cover a provider's default format and a provider's `variableFg` too.
- **D8.** J1(b): a fault in a provided instrument's settings refuses that instrument alone. Jefferson's own instruments keep whole-document rejection. Source: same file, "Answer to Michael's orientation".
- **D9.** The contract `pi-jefferson/instruments` carries types only (same file).
- **D10.** Rules for user-facing text, all from 2026-11-16:
  - It says "instrument" and "configuration file", never "cell" or "entry" (ADR 0015; same file, "There is no entry").
  - Markdown prose is not hard-wrapped.
  - User-facing docs get a complete editorial pass on the documenter seat running Opus 5.5 at high thinking. That ruling is worded for "all customer/user facing docs", so it covers this change's docs pass.
- **D11.** Proof is Joel watching it work in his own pi session (`archive/2026-11-05-configurable-instruments/owner-rulings.md`, "Proof"; `~/Projects/AGENTS.md`).
- **D12.** Documentation never blocks a feature (standing ruling).

### Decisions I approved that bind this change

- **D13. A theme token is checked against the live theme when the document is read, and the host's token list is never copied.**
  - Source: `archive/2026-11-05-configurable-instruments/design.md:392-405` (D6). It is now `openspec/specs/statusline/spec.md:645-668`: "The host's token list MUST NOT be copied", with the scenario "The theme the check reads".
  - D6 also records that which slot a token belongs to is the same for every theme in one pi process. I re-measured that (T1).
- **D14. A check's outcome depends on the name, never on load order.** Source: the `extensions-provide-instruments` design 13, restated at `configuration.ts:505-512`.
- **D15. A kind's format is plain** (ADR 0012:27).
  - The reason given there is that a modifier's own reset would drop the notice's `warning` foreground for the rest of the text.
  - A colour modifier emits exactly that reset, so the reason still holds.
- **D16. Only what the format names is resolved** (ADR 0020; `format.ts:225-227`).

### Standing records this change revises

D1 and D4 are newer than the records below, and they revise them.

- Each record must be modified in a spec delta. The specs are the contract, not documentation.
- The retirement is recorded in an ADR, as `AGENTS.md` ("Where decisions live") requires.

The records:

- **R1. ADR 0003's clause "`fg` and `bg` are not modifiers", and its "one direction" consequence that a modifier only adds.**
  - A colour replaces the segment's `fg`.
  - The rest of ADR 0003 stands. That includes "the language adds no styling vocabulary of its own", which colour names satisfy, because they are pi's names, spelled as pi spells them.
- **R2. The statusline requirement "A style modifier only sets an attribute on" (`spec.md:776-794`).** Two parts change:
  - the clause "`fg` and `bg` MUST NOT be modifiers";
  - the scenario "A color is not a modifier", whose example is `|accent`.
- **R3. The scenario "One vocabulary for styling" (`spec.md:638-642`).** It currently says "one of `ThemeStyle`'s six booleans".
- **R4. The scenario "A name carried in two places" (`spec.md:757-761`).**
  - Jefferson's own names still come from one table.
  - Colour names come from the live theme.
- **R5. The thinking requirement (`spec.md:1027-1031`).** "On that segment the color MUST replace a configured `fg`" still holds against `style`. It now gives way to a colour written in the format.
- **R6. "A notice takes the colour pi gives its kind" (`spec.md:1429-1442`).** "A notice's text MUST take the theme's `warning` foreground" is absolute, and D4's ruling names `$notice` explicitly.

I found R2–R6 with `rg -n -i "modifier|variableFg|\bfg\b" openspec/specs` and `rg -n "replace a configured|warning. foreground" openspec/specs`.

### Standing records the change leans on and keeps

- `$bar` takes no modifier (`spec.md:723`; ADR 0003). ADR 0009 keeps the bar's own threshold colours.
- A form comes first after its variable, and only once (`spec.md:1167`; ADR 0010).
- Modifiers apply in the order the format writes them (`spec.md:721-722`).
- An unknown modifier rejects the document when it is read, never at render (`spec.md:842-858`).
- Jefferson refuses the registration of a provider whose default format it cannot parse. Sources:
  - `docs/extension-authors.md:310`;
  - instrument-registration `spec.md:40-46`: "Jefferson MUST check each member's shape when it registers".

## 2. What the change must not touch or foreclose

- **The spinner change (on the board as Doing).**
  - It adds `spinner` as a name after `|`.
  - The rule that Jefferson's name beats a pi colour must cover every name Jefferson gives meaning after `|`, not only today's `MODIFIERS` map (`format.ts:23-34`). Then a later name joins the reserved set without a second rule.
  - A colour must stay a foreground on its piece, so that `$working|spinner|accent` composes.
- **User-composed instruments (`jefferson.custom.*`, on the board as Todo).** They use the same parser, so accepting a colour belongs to the format language and the theme, not to one declaration.
- **The published contract.** `instrument-contract.ts` gains no member, because formats are strings. It must not import pi's types (D9; the comment at `instrument.ts:27-31`).
- **Plain kind formats** keep rejecting every `|name` (D15; `format.ts:101`).
- **`validateStyle`** (`format.ts:150-186`) keeps its behaviour.
- **`shownUntil` for providers**, the follow-up from 2026-11-16, stays untouched.

## 3. The traps

**T1. A per-name probe of the live theme is all the parser needs, and it gives exactly pi's set.**

- I asked each built-in theme, for every key, whether `getFgAnsi` accepts it:
  - `dark`, `light` and `system` each accept 49 names;
  - that is exactly the set pi's internal table marks as foreground;
  - `selectedBg`, `Accent`, `constructor`, `toString` and `__proto__` are all refused.
- The lookup is a `Map` (`theme.js:117, 212-216`), so names inherited from `Object.prototype` cannot pass.
- Tokens a theme file leaves out are filled by pi's fallbacks in the `Theme` constructor (`theme.js:133`). I read that path but did not run it.
- Nothing in this change needs a list of the names. The 2026-11-05 design D6 already rejected reading `theme.colors`, because it mixes both slots.
- **A correction to Chidi §1.** A copied list checked with `satisfies Record<ThemeColor, true>` is complete against the pin: `tsc` fails with TS2740, naming 48 missing tokens (measured).
  - The copy is still wrong, for two reasons. D13 forbids it. And `peerDependencies` is `*` (`package.json`), so the pi a user actually runs can differ from the pin.
  - It is rejected on D13 and drift, not on completeness.

**T2. No theme exists where a provider's default format is first parsed.**

- A theme exists only as `ctx.ui.theme` (`dist/core/extensions/types.d.ts:178-179`). `ExtensionAPI` carries none.
- The registration listener starts at load (`startup.ts:39-47`).
- Jefferson's own instruments register through it before any `session_start`.
- Providers post from their own `session_start` handler (`docs/extension-authors.md:35`). By load order, that handler runs before or after Jefferson's.
- `adaptProvidedDeclaration` parses the default format and refuses `unparseable-default-format` at `instrument-binding.ts:236-240`. The colour half of that check has no theme to ask.
- What keeps it solvable:
  - nothing renders before Jefferson's `session_start` installs the footer (`startup.ts:144`);
  - faults are delivered only after startup (`startup.ts:64`).
- So a check that runs once a theme is in hand, before the read resolves names, shows a provider exactly what a check at registration would.

**T3. A parse failure at bind escapes the read and fails session start.**

- I measured this in a scratch worktree with this setup:
  - a declaration accepted into the registry with the default format `$x|notacolour`;
  - placed by a row;
  - absent from `instruments`.
- `readConfiguration` threw `format names a modifier it does not implement`.
- The path:
  - the parse at bind (`instrument-binding.ts:283`) runs inside `binding(declaration)`;
  - `binding(declaration)` is evaluated before `containProvided` wraps the result (`configuration.ts:487`);
  - `readConfiguration` rethrows anything that is not `RejectedConfiguration` (`configuration.ts:584-595`).
- Today this cannot happen, because the registration parse already refused the format.
- Any design that moves part of the check off registration must close this path.

**T4. Which check runs depends on load order today.**

- Take a provided instrument that registered **before** the read, is placed by a row, and has no `instruments` entry. It never reaches `checkProvidedSettings`: `readInstruments` walks only the block (`configuration.ts:239-280`), and its default format is parsed only at registration and at bind.
- Take the same instrument registering **after** the read. The watch runs `checkProvidedSettings` on it with no settings (`configuration.ts:505-520`).
- While the parse needed no theme, the two paths were equivalent.
- Once part of the check needs a theme, the first path has none, and the outcome follows load order, against D14.

**T5. The code inverts D4 today, and the built-in colour function always runs.**

- At `format.ts:269-275`, `variableFg` is called for every variable that declares one, and its token overrides the merged style's `fg`.
- D4 puts a format colour above it.
- When a format colour covers the segment, the built-in function must not run. A provider's `variableFg` that faults records a warning (`instrument-binding.ts:186-206`) about a colour the user replaced and will never see.
- This is the same principle as D16.

**T6. The foreground-token probe already lives in two places.**

- `validateStyle` (`format.ts:161-167`) and the adapter's colour guard (`instrument-binding.ts:198-205`) both wrap `getFgAnsi` in a `try`/`catch`.
- A third copy for colour modifiers would be a finding.
- Both files are in this change, so the design names one home and routes the other uses through it.

**T7. Only `dim` collides today, and later names can shadow a colour without a warning.**

- I compared the 49 foreground tokens with every name Jefferson reads after `|`:
  - the nine modifiers;
  - the shipped forms `base`, `absolute` and `relative`;
  - the planned `spinner`.
- `dim` is the only collision (measured).
- Two later events would change a working format silently, and no code can prevent either:
  - Jefferson adds a pipe name that pi also uses;
  - a provider adds a form named like a colour on one of its variables. Forms win (`format.ts:109-111`).
- The docs state the lookup order. Nothing more is needed.

**T8. pi's `dim` colour can no longer be written on one piece of text (D2).**

- It stays reachable through `style: {"fg": "dim"}` (`validateStyle`).
- Joel's `pi-theme-grid` lists `dim` among the COLORS, so the docs must say which one `|dim` is.

**T9. On pi's system theme some colours are also faint, and that is pi's doing.**

- Measured: the system theme's `style("x", {fg: "muted", bold: true})` returns `\e[39m\e[1m\e[2mx\e[22m\e[39m`. pi's `style()` turns on faint for its faint tokens (`theme.js:188-191`).
- So `|muted` renders faint on the system theme, exactly as `style.fg: "muted"` does today. Jefferson must not compensate.
- Chidi's §4 worry, that an inner `fg()` close ends an outer bold, does not arise. Jefferson styles each segment once, with one `theme.style()` call over a merged style (`format.ts:188-191, 267-276`), and never nests.

**T10. Some tests encode the rule being retired.**

- `tests/format.test.ts:259-264` asserts that `|accent` is unknown. Rewriting it is legitimate only with R2's delta. Without the delta, the rewrite is an expectation edited to make the code pass.
- `:383-404` assert the unknown-modifier message for forms in the wrong place. Their expectations move if the design changes that message (O4).

**T11. The test theme is small, and no test reads pi's files.**

- `tests/fake-theme.ts` has ten foreground tokens and one background token, and it answers by slot.
- `foregroundOverrides` adds tokens such as `toolDiffRemoved` and `bashMode`.
- No test reads pi's `dist` files. That precedent is set in the notices design at `archive/2026-11-11-notices-in-the-footer/design.md:554-556`.
- So pi's real slot table is proven by Joel's live check (D11), not by the suite.

## 4. The questions only Joel can answer

None are open. Each question I considered is settled by one of his rulings, an approved decision or a measurement. Section 5 names the source for each.

One would become his. If the design cannot keep today's refusal of a provider's default format (S10, T2), the change alters a published contract for extension authors, and the conductor brings it to him at that point. In what an author sees:

1. A provider ships a default format with a misspelt colour.
2. Today the registration is refused and one warning names the instrument, whether or not a row places it.
3. If the check moved to the configuration read, the instrument would register.
4. It would render blank only where a row or the `instruments` block names it.
5. An author who never places the instrument would never hear about it.

## 5. What is settled and what stays open

### Settled

- **S0. Nothing that works today changes (D3).**
  - Today a `|name` that is neither a form nor one of the nine modifiers is rejected (`format.ts:113-116`). Colours can only turn rejected formats into accepted ones.
  - The change of precedence touches only segments that carry a format colour, and no format accepted today has one.
- **S1. Which names are colours.** A name is a colour when pi's live theme accepts it as a foreground token through `getFgAnsi`. Each name is asked one at a time, when the format is checked (D1, D13, T1). There is no list, no reading of `theme.colors` and no theme file.
- **S2. The lookup order after `|`:**
  1. a declared form, first after its variable;
  2. one of Jefferson's own names;
  3. a foreground colour of the theme;
  4. otherwise, rejected.

  Sources: D2, ADR 0010, T7.
- **S3.** A background token is rejected as unknown (D1).
- **S4. What a colour attaches to.**
  - It sets only the foreground of its piece: a variable's value after its form and mutations, or the run of non-whitespace text before the pipe.
  - It composes with attributes and mutations in the same chain (D3, D6; `spec.md:720-723`).
- **S5. Two colours on one piece: the later one wins.**
  - The basis is "each applying in the order the format writes them" (`spec.md:721-722`).
  - Today the language rejects no repeated or contradictory chain: `|bold|bold` and `|upper|lower` both parse (`format.ts:113-121`).
- **S6. D4 applies to Jefferson's and provided instruments alike (D7).** A label has no format, so only `style` colours it.
- **S7.** `$bar` and plain kind formats take no colour (the records in §1; D15).
- **S8.** Names are spelled as pi spells them, and they are case-sensitive (ADR 0003; T1).
- **S9. A bad name in a user's configuration file is rejected when the file is read.**
  - For Jefferson's own instruments, the whole file is rejected.
  - For a provided instrument, only that instrument is (`spec.md:842-858`; D8).
- **S10. A provider's default format may carry colours (D7).** One that names no foreground colour stays a registration refusal with today's warning, whatever the load order. Sources: D3, D14 and the registration records in §1; see also T2.
- **S11.** The contract does not change (D9).
- **S12. Docs point to pi's theme documentation for the names rather than listing them.**
  - The basis is D13's drift reason and one fact in one place.
  - The docs also say that `|dim` is the attribute and that the `dim` colour is reached through `style` (T8).
- **S13. Spec deltas and docs.**
  - The change carries spec deltas for R2–R6 and an ADR for R1.
  - The docs pass covers `docs/formats.md:60,64,80-84,96-107`, `docs/notices.md:60`, `docs/extension-authors.md:226`, `ARCHITECTURE.md:44,71` and `AGENTS.md:25`.
  - I found them with `rg -n -i "modifier|not modifiers|variableFg|colour|color" ARCHITECTURE.md AGENTS.md README.md docs/*.md`.
  - Under D12 these are minor findings.

### Open for the council and the design

- **O1. How a theme reaches every parse that can meet a colour.** This includes how a registration's default format is checked once a theme is in hand (T2–T4). The constraints:
  - S10 and D14 hold;
  - no bind path throws without containment;
  - each format is parsed once per read, where possible. Today `instrument-binding.ts:283` re-parses what registration already parsed.

  The parse sites at `cf90995`:

  | Site | Theme in hand? |
  | --- | --- |
  | `configuration.ts:177` and `:298` (reading the file) | Yes |
  | `instrument-binding.ts:237` (registration) | No |
  | `instrument-binding.ts:283` (bind) | No |
  | `configuration.ts:227`, `:327`; `instrument-binding.ts:248`, `:299` (plain formats) | Not needed: they reject every `|name` |

  The suite calls `parseFormat` 42 times (35 in `format.test.ts`, 6 in `instrument.test.ts`, 1 in `row-renderer.test.ts`), which is the cost of changing its signature.
- **O2.** One home for the foreground probe (T6).
- **O3.** How a colour is held in a segment and where precedence is resolved. The built-in colour function must not be called when a format colour covers the segment (T5).
- **O4. The warning for a name that is neither a modifier nor a foreground colour.**
  - The choice is between keeping "names a modifier it does not implement" and a distinct warning that says what the name is: a background colour, or neither a modifier nor a foreground colour of the theme.
  - "Strict and loud at contract boundaries" (`~/Projects/AGENTS.md`) favours naming the slot.
  - The wording follows D10. This is the design's call.

### Prototype

None requested.

- T1 and T3 are measured.
- O1 is answered by reading the code.
- O1's proof is a test in `tests/registration.test.ts` that drives both load orders through the session harness.

## What this pass did not check

- A live pi session across a theme switch. I re-measured D13's invariance on the three built-in themes only. pi's fallback for a user theme that leaves tokens out is read (`theme.js:133`), not run.
- The brain-vault notes for the spinner change and for composed instruments. I relied on `plan-context.md`'s quotes of them.
- Minor corrections to the research:
  - Eleanor places the unknown-modifier error at `format.ts:119-120`; it is at `:114-115`.
  - Chidi's claim that a typed copy cannot be complete is corrected in T1.