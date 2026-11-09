# Michael — orientation consult (not a gate)

Retained run `38e8179b-7347-4da0-8f01-a2fb5759e952`, 2026-11-08, run in parallel with Research. A consult records no verdict. Transcribed verbatim from his returned output.

Michael — orientation consult for default-labels (not a gate; approves nothing). Read-only: owner-rulings.md, both archived rulings files, ADR 0006/0007, statusline spec, AGENTS.md, ARCHITECTURE.md, README.md, instrument.ts, instrument-binding.ts, format.ts, configuration.ts, tests/, and Joel's ~/.pi/agent/pi-jefferson.json (read, never edited). Baseline: `pnpm test` 309/309 green at 133dec3. Measurements below were run with a scratch script in /tmp that overlays a `defaultLabel` onto the shipped declarations and renders through `instrumentBindings`; nothing in the repo was touched.

## 1. Decisions on record a default label on every shipped instrument must meet or explicitly revise

A. The change itself — openspec/changes/default-labels/owner-rulings.md:7 "**The change is a default label on every shipped instrument.**"; :8 "**Those three texts are his examples. The label text for model, tokens and cost is not ruled.**" (examples: "Thinking:", "Context:", "Path:"); :9 one card — new instruments, context thresholds, renaming `path`, custom instruments are separate.

B. A label is always in front of the format, including the default, and is never a variable — archive/2026-11-06-default-thinking-instrument/owner-rulings.md:27 "The label option should be added for all instruments and behave this way for all instruments. Always in front of format, including its default." Living spec openspec/specs/statusline/spec.md:1056-1062 and :1108-1111 ("A label in front of the default format"). Binding does this at extensions/jefferson/visuals/instrument-binding.ts:26-29.

C. The one gap, and the trim — label-gap owner-rulings.md:15 ("We should be trimming labels and text…"); spec.md:1060-1061 "a one-column gap MUST separate them, always, with no option"; ADR 0006:40 "A declared default label follows the same rule: it carries no trailing space, and the gap supplies it."; AGENTS.md:22-23 "A `defaultLabel` carries no trailing space". So every new default is declared colon-terminated with no space, like `thinking` at instrument.ts:68.

D. `""` removes a default — label-gap owner-rulings.md:17 "A user explicitly setting a label to "" is acceptable and replaces the default with nothing."; spec.md:1061-1062, :1098-1106. This is the escape hatch every new default relies on, and it already works (measured: blank with format "" and label "" renders "").

E. An unknown datum suppresses the label — spec.md:1113-1116 "the cell renders nothing, with no label and no gap, whatever the format is". Enforced at format.ts:188 (early return before segments are mapped).

F. The label takes width from `$bar` and counts toward a content-sized cell — spec.md:1152-1157; README.md:66 "a cell takes the columns its text needs, label included"; ADR 0007.

G. Each instrument's requirement pins its default rendered text, and each is a MODIFIED requirement if a label lands on it: spec.md:381 model "whose default format `$provider: $model` renders the text it renders today"; :586 path "renders `pi-jefferson`"; :605 context "renders `43.2%/200k`"; :648 tokens "renders `0`"; :660/:665 cost "renders `$0.123`"/"`$0.000`"; :403 thinking "a default label that renders, gap included, as `Thinking: `" (the only one that already states a label — it is the template for the others).

H. `blank` is the placeholder/fill, displays no datum, and is the fallback for an unknown instrument name — spec.md:66 "a `blank` or `$bar` cell, which MUST fill"; :186-187 "`blank` is an instrument whose default format is the fixed placeholder text; it is what the default row's ten cells hold"; :205; :320 and :337 an unknown instrument name "MUST render that cell as `blank`"; :350 "An instrument that displays no datum — `blank` — is outside that duty." Code: configuration.ts:127-132 (default row), :175 `bind(instrument ?? blank)`.

I. "A user shouldn't have to configure any more than truly necessary." (label-gap owner-rulings.md:13; this change's rulings file) and "Don't invent what we don't have to." (2026-11-03).

J. Breaks are cheap pre-1.0, no shim; the upgrading note pattern is README.md:133-136 (set `label: ""` to get the previous text back).

K. Joel's `~/.pi/agent/pi-jefferson.json` is his preferred setup and is never edited by a task (2026-11-06; repeated in this change's rulings).

L. Vocabulary: row > cell > instrument; `module`/`widget` rejected.

## 2. Traps (M = measured, R = read)

- **A label over an absent datum (M).** With a default label overlaid on model, path, context, tokens and cost and every datum undefined, each renders "" (width 0). format.ts:188 returns before the label segment is reached, so decision E holds with no new code. `blank` is the exception: it declares no variables, so nothing can ever suppress its label (M: renders the label over all-unknown readings).

- **`model`'s `"$provider: $model"` next to a colon label (M).** `Model:` + default format renders `Model: anthropic: claude-opus-4` — two colons, 31 columns. Any colon-terminated label on model either reads badly or forces a change to model's default format, which revises spec.md:381 ("renders the text it renders today") and flips ~20 assertions pinning `anthropic: claude-opus-4` (configuration.test.ts:124,199,299,479,588,788,814,817; row-renderer.test.ts:442; jefferson.test.ts:397,478; instrument.test.ts:77,90,111). Joel's own model entry sets label `🧠` and format `$model via|dim $provider|capitalize` (M: `🧠 claude-opus-4 via Anthropic`), so his footer is unaffected whatever is chosen.

- **`blank` as placeholder and fill (M).** (i) Default row / unknown-name fallback: a label on blank renders `Blank: Lorem ipsum…` (85 columns) in all ten default cells and in any cell whose instrument name is a typo (configuration.ts:175 binds the same `blank`), so a misspelt instrument would show a label naming `blank`. (ii) Joel's configuration sets `"blank": {"format": ""}` with no label; parseFormat("") yields zero segments, the gap rule (binding.ts:27) then puts the label alone — measured `Blank:` (6 columns) in both of his second-row blank cells. `fills` stays true (M), so the cell still takes its third and the label text sits inside it. Only `label: ""` in his document undoes it, and no task may edit that file (K) — so a default label on blank is a change to Joel's footer that he alone can repair, against ruling I.

- **`context`'s `$bar` and the width a label takes (M).** Default format `$percent/$window` has no bar, so the cell is content-sized: `Context: 43.2%/200k` is 19 columns against 10 today (+9). Width 0 and width 200 render identically (the AGENTS.md:4 invariant holds because the label is a literal). With a bar format `$bar $percent` at 20 columns: `Context: ██░░░ 43.2%`, exactly 20 — the label and gap come out of the bar (spec F), no new arithmetic. At 8 columns the bar is 0 and the text overflows to 15; the cell's clip handles it as today (spec.md:1159-1163). Content-sized widths with a `Name:` label: path 12→18, model 24→31, tokens 1→9, cost 6→12, context 10→19, thinking 14→14. In a `path, model, thinking` row at 80 columns the absorbing `path` cell loses ~13 columns of slack; spec.md:1241's "the path text still fits" scenario still holds at these texts.

- **Joel's own configuration (R + M).** path, model, thinking, context each carry a configured label, so defaults on those four never reach his footer. tokens and cost are not in his document. blank is the only instrument where a default would change what he sees (above).

- **Tests that pin unlabelled output (R, counted).** instrument.test.ts:60 pins `defaultLabel === undefined` for every instrument but thinking — the one test that necessarily flips. instrument.test.ts's `render()` helper (lines 46-50) bypasses `instrumentBindings`, so its "renders its declared text" expectations (lines 77, 84-86, 90, 111-116) stay green whatever default label is declared: a test proving a new default renders must go through binding, or it proves nothing. Through binding, ~36 assertion lines pin unlabelled text: configuration.test.ts:114,124,199,255,299,449,479,561,588 ("no label and no default label renders as before" — its premise is retired by this change),788,803,814,817,832; row-renderer.test.ts:442; jefferson.test.ts:294,397,478,605,751,773-777 (`"pi-jefferson" + "43.2% "`),796,811,816. Spec scenarios that pin the same texts are listed under G and H. README.md:128 "Only `thinking` has a default label" and the table at README.md:103-111 (no label column) go to Bambadjan's docs pass; documentation never blocks.

## 3. Calls that are certainly Joel's

1. **Whether `blank` is in "every shipped instrument".** It displays no datum (spec.md:350), it is the fill and the unknown-name fallback, and a default label on it rewrites his own footer's two blank cells and the default row's placeholder. Product behavior, his footer, his ruling to reconcile with ruling I.
2. **The label texts for model, tokens and cost** — the brief and his rulings say these are unruled.
3. **What happens to `model`:** a colon label beside `$provider: $model` (double colon), a different label shape, a changed default format (revises spec.md:381), or no label. User-facing text either way.
4. **Confirmation that "Thinking:", "Context:", "Path:" are the texts, not just the shape** — his rulings file calls them examples.

Everything else is settled: placement (B), gap and trim (C), `""` as the removal (D), suppression on unknown data (E), width accounting (F), pre-1.0 break with an upgrading note (J), and that no mechanism changes — each new default is one `defaultLabel` field on a declaration in instrument.ts, exactly as thinking's at line 68.

## 4. The strongest challenge to doing the change as stated

"Every shipped instrument" read literally includes `blank`, and the only user whose footer that provably changes is Joel: his two blank cells would read `Blank:` and he would have to add `"label": ""` to keep what he has, which contradicts his own "a user shouldn't have to configure any more than truly necessary" and makes the default row's placeholder say the name of a cell that is meant to be nothing. The second half of the challenge is `model`: the default format already names its content (`anthropic: claude-opus-4`), so a `Model:` label adds a second colon and seven columns to say what the cell already says. The honest reading of the card is "a default label on every instrument that displays a datum whose value does not name itself": thinking (has one), context, path, tokens, cost — with blank excluded by spec.md:350 and model decided by Joel on the colon. If Joel rules literally, the design must name the `blank` consequence to his footer and the model double colon as deliberate.

What I would choose if no decision settles it: no default label on `blank`; `Context:`, `Path:`, `Tokens:`, `Cost:` as declared one-field defaults; `model` taken to Joel because any answer there changes a pinned default text. Why: it meets every decision A–L without revising one, it is the smallest diff (four one-line fields and the test flips), and it leaves Joel's untouchable footer rendering exactly as it does today.

Skipped / not checked: research has not landed, so no prior art or host facts; I did not apply a patch to count the exact test failures (counts above are from grep, 36 lines through binding plus instrument.test.ts:60) and did not re-derive the 80-column `path, model, thinking` fit beyond adding the measured widths.

## decided_by

Scope and the three example texts: openspec/changes/default-labels/owner-rulings.md:7-9 (2026-11-08). Label always in front of the format including its default, never a variable: archive/2026-11-06-default-thinking-instrument/owner-rulings.md:27; spec.md:1056-1062. One gap, trimmed, no trailing space on a declared default: archive/2026-11-07-label-gap/owner-rulings.md:15; ADR 0006:40; AGENTS.md:22-23. `""` removes a default: label-gap owner-rulings.md:17. Unknown datum suppresses label: spec.md:1113-1116, format.ts:188. Label width counts and comes out of `$bar`: spec.md:1152-1157, README.md:66. `blank` displays no datum, is the fill and the unknown-name fallback: spec.md:186-187, :320, :337, :350; configuration.ts:175. Each instrument's default text pinned per requirement: spec.md:381, :403, :586, :605, :648, :660. Joel's config never edited: 2026-11-06 ruling. The four calls in section 3 (blank's inclusion, texts for model/tokens/cost, model's colon, confirmation of the three texts) are settled by no decision — they are Joel's.

## owner: michael

## follow_up

Does "every shipped instrument" include `blank`? A default label on it renders `Blank:` in the two blank cells of Joel's own second row (measured: his `"blank": {"format": ""}` leaves the label alone) and prefixes the default row's placeholder, and only a `"label": ""` he writes himself removes it — against his ruling that a user configures no more than truly necessary. And on `model`: the measured default with a colon label is `Model: anthropic: claude-opus-4`; which of label-without-colon, a changed default format (revising spec.md:381), or no label does he want?
