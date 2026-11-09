# Proposal

Citations: [R] `owner-rulings.md` (Joel, binding); [C Qn] `research-chidi.md`, question n; [E heading] `research-eleanor.md`, the named section; [M n] `michael-orientation.md` section n (a consult, not a ruling).

## Why

Only `thinking` ships a default label, `Thinking:`. The other shipped instruments render bare text, so a new user's footer shows `43.2%/200k` and `212` with nothing saying what they are [E Label path, Current no-configuration output]. Joel asked for a default label on every shipped instrument [R 2026-11-08, "What the change is"]. His examples are `Thinking:`, `Context:` and `Path:`, and he calls them examples, not final texts [R].

## What Changes

- Shipped instruments gain a default label, declared the way `thinking` declares its own (a `defaultLabel` field on its declaration) [E Label path; M 3 closing paragraph]. Which instruments and texts: settled by Joel's PL2 rulings (see Open questions, each marked settled). `Path:`, `Context:`, `Tokens:`, `Cost:` are added, `Thinking:` stays, `Model:` is added with a changed default format, and `blank` gets none [council.md "Joel's rulings"].
- Nothing about the mechanism changes. A label already renders in front of the default format, takes the one gap, is trimmed, is removed by `""`, and is suppressed over an unknown datum [E Label path; M 1 B–E]. This change adds one requirement saying a *default* label obeys those rules.
- Tests that pin unlabelled default output change with the defaults: the one test asserting that only `thinking` has a default label, plus roughly 36 assertion lines that go through binding [M 2, last bullet; E Exact-text tests]. Which of them flip follows the rulings below; the design names them.
- **BREAKING**, pre-1.0 and accepted: a default-configured cell gets wider by its label and gap [R "Breaks are cheap before 1.0"; M 2 widths bullet]. A user who wants the old text sets `label: ""` [M 1 J]. `model`'s default format also changes, `$provider: $model` to `$provider/$model` [council.md "Joel's rulings" 2]; `label: ""` does not bring back the old format, only a configured `format` does.

Deliberately not done, per [R "One card"]: instruments for new data, thresholds on `context`, custom instruments, renaming `path`, the OpenSpec `context:` block. No label variable [R, archived 2026-11-06 ruling quoted at E README and archived rulings]. Joel's own `~/.pi/agent/pi-jefferson.json` is never edited [R 2026-11-06].

## Evidence

**What exists** [E]: only `thinking` sets `defaultLabel` (`Thinking:`). A configured label, `""` included, beats the default, and the one gap appears only when label and format are both non-empty. An unknown datum returns `""` before the label is reached, so a default label cannot render over an absent datum with no new code. A label counts toward a content-sized cell and comes out of a `$bar`.

**Prior art** [C Q1–Q3]: there is no de facto "Word:" convention.
- pi's own footer labels no field with a word. It uses symbolic prefixes on numbers only (`↑ ↓ R W CH $`), and a bare path, model and context percent.
- Starship uses a symbol (emoji or Nerd Font glyph) plus a preposition (`on`, `via`), and nothing for `directory`. Its plain-text preset uses a bare word and a space, no colon.
- pi-powerline-footer uses an icon with an ASCII fallback. Its only word-and-colon labels are `think:`, `in:` and `out:`.
- Where a label exists it is usually an icon; the plain-text alternatives disagree with each other on the colon.

So the word-and-colon shape comes from Joel's examples [R], not from a convention.

**Traps** [M 2, E]:
- `blank` declares no data, so nothing can suppress its label. It is the default row's ten placeholder cells and the fallback for a misspelt instrument name. Joel's second row holds two `blank` cells with `format: ""` and no label; a default there would render the label alone in his footer, and only a `label: ""` he writes himself removes it.
- `model`'s default format is `$provider: $model`. A colon-terminated label gives two colons (`Model: anthropic: claude-opus-4`). Changing the format revises the living `model` requirement ("renders the text it renders today") and about 20 assertions.
- Widths: with a `Name:` label, content-sized cells grow (path 12→18, model 24→31, tokens 1→9, cost 6→12, context 10→19). In a `path, model, thinking` row at 80 columns `path` absorbs the difference [M 2].
- Joel's two blank cells and his configuration: his `path`, `model`, `thinking` and `context` carry configured labels, so defaults on those never reach his footer; `tokens`, `cost` and `blank` are the cells a default could change [E Joel's live configuration].
- Tests: the `render()` helper in `tests/instrument.test.ts` bypasses binding, so a test of a new default must go through binding or it proves nothing [M 2].

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `statusline`: adds one requirement, that a shipped instrument's default label renders as a configured label does (in front of the default format, one gap, replaced by a configured label, removed by `""`, absent over an unknown datum). It states nothing that depends on an open question. Settled at PL2: the per-instrument requirements that pin default text (`model`, `path`, `context`, `tokens`, `cost` [M 1 G]) are MODIFIED, each stating its labelled text, and `model` states the new `$provider/$model` format [council.md "Accepted & Rejected Feedback" and "Joel's rulings"]. The added requirement also says `blank` declares no default label.

## Open questions

Each was Joel's to answer [M 3]. All five are settled by his rulings at PL2, 2026-11-08 [council.md "Joel's rulings"]; the original questions stay for the record.

1. SETTLED: no. `blank` gets no default label [ruling 1]. Is `blank` in "every shipped instrument"? It displays no datum, and a default on it changes what his own blank cells and the default row show.
2. SETTLED: `Model:`, `Tokens:`, `Cost:` [rulings 1, 2]. What are the label texts for `model`, `tokens` and `cost`? [R: not ruled]
3. SETTLED: label `Model:` and the default format changes to `$provider/$model`, rendering `Model: anthropic/claude-opus-4` [ruling 2]. What happens to `model`: a colon label beside `$provider: $model`, a different shape, a changed default format, or no label?
4. SETTLED: yes, the texts are `Thinking:`, `Context:`, `Path:` [ruling 1]. Are `Thinking:`, `Context:` and `Path:` the texts, or only the shape? [R: "examples"]
5. SETTLED: a word with a colon [ruling 1]. Is the label a word with a colon (Joel's examples), an icon, or a bare word? Chidi found no convention for any of the three [C Q3]; Joel's examples are the only word-and-colon evidence that bears on this repository.

## Impact

- Code: the instrument declarations (one `defaultLabel` field per labelled instrument, plus `model`'s default format) [E Label path]. No change to binding, format or layout.
- Tests: those pinning unlabelled default output [E Exact-text tests; M 2]; the exact set is in design.md.
- Docs (docs pass, not a task): the README's "Only `thinking` has a default label" sentence and its instruments table [M 2].
- Dependencies: none.
