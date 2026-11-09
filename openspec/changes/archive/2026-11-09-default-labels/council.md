# Council Synthesis

**Roster.** Two advisors ran, each launched with `context: "fresh"`:
- `council-neil` (cost), run `42b035e8-6295-443e-98bd-1719e6eae614`;
- `council-matt` (correctness), run `4a9104e8-541e-4b42-b28c-032bdc445ed1`.

Both read only the change directory's artifacts. The council ran one pass. Pass 2 was not run, because the two reports converge on everything except `model`, which is Joel's to rule either way.

## Question and Scope

For each shipped instrument, the council answered:
- whether it gets a default label;
- the label's shape and text;
- what to do about `model`'s `"$provider: $model"` format next to a label.

**Evidence:**
- `proposal.md` and its five open questions;
- the delta spec;
- `research-chidi.md` and `research-eleanor.md`;
- `michael-orientation.md`;
- the design gate (PL4) section of `michael-the-architect.md`.

**Out of scope:** new instruments, context thresholds, custom instruments, renaming `path`, and the gap, trim and `""` behavior, which are already settled.

## Perspectives & Trade-offs

**Where both advisors agree:**

- **Shape: a word with a colon, no trailing space.**
  - It is the only shape the repository ships (`Thinking:`), and Joel's three examples use it.
  - Icons depend on the terminal font. Both surveyed tools have to detect the font or fall back to text (`research-chidi.md` Q3).
  - There is no community convention to follow instead (Q3).
- **`blank`: no default label.**
  - It displays no datum (living spec "An instrument that displays no datum — `blank` — is outside that duty"), so nothing ever hides its label.
  - A label would render `Blank:` in both blank cells of Joel's second row. His `"blank": {"format": ""}` leaves the label alone, measured in `michael-orientation.md` §2.
  - It would also render `Blank: Lorem ipsum…` across the ten-cell default row and in any cell whose instrument name is misspelt.
  - Only a `"label": ""` that Joel writes himself would undo it.
- **Texts:** `Path:` and `Context:` (his examples), `Thinking:` unchanged, `Tokens:`, `Cost:`.
- **Mechanism: one `defaultLabel` field per declaration.**
  - Each label is declared exactly as `thinking` declares its own.
  - Binding, format and layout are unchanged.
  - A label never renders over an absent datum. That is already true, measured in `michael-orientation.md` §2.
- **Tests must render through the bindings.** `tests/instrument.test.ts`'s `render()` helper bypasses labels, so a test written through it stays green with the label deleted.

**Where they differ:**

`model` is the one disagreement. Today it renders `anthropic: claude-opus-4`.
- **Neil** would give it `Model:` and keep the format. That renders `Model: anthropic: claude-opus-4`, two colons and 31 columns. His second choice is no label.
- **Matt** would give it no label. The provider prefix already says what the cell holds, and a colon label adds a double colon.
- **Both reject changing the default format.** That would revise the living requirement that model "renders the text it renders today" and about 20 pinned assertions, just to add a word.

## Synthesis & Recommendation

Proposed defaults:

| Instrument | Default label | Renders |
|---|---|---|
| `blank` | none | (unchanged) |
| `model` | Joel's ruling | `anthropic: claude-opus-4`, or `Model: anthropic: claude-opus-4` |
| `thinking` | `Thinking:` (unchanged) | `Thinking: High` |
| `path` | `Path:` | `Path: pi-jefferson` |
| `context` | `Context:` | `Context: 43.2%/200k` |
| `tokens` | `Tokens:` | `Tokens: 212` |
| `cost` | `Cost:` | `Cost: $0.123` |

**Effect on Joel's footer.** His own footer does not change. He sets emoji labels on path, model, thinking and context, and his blank cells stay label-free.

**Spec.** Each labelled instrument's per-instrument requirement becomes MODIFIED, so the living spec states the labelled text (Matt; see accepted feedback below).

## Accepted & Rejected Feedback

**Accepted:**
- The word-with-colon shape.
- No label on `blank`.
- `Tokens:` and `Cost:`.
- One field per declaration.
- Tests through bindings.
- From Matt, three corrections:
  - **Per-instrument requirements must be MODIFIED.** The proposal said those requirements stay untouched. That is wrong for every labelled instrument, because the spec would then contradict the code (path renders `pi-jefferson` versus `Path: pi-jefferson`).
  - **A test pins `blank` with no default label**, so the ruling stays enforced.
  - **Two existing tests are retired or rewritten** rather than re-pinned: the test that only thinking has a default, and the test titled "no label and no default label renders as before".

**Rejected:**
- Changing `model`'s default format, by both advisors.
- Icons as the default shape. They depend on the font, and pi-jefferson has no font detection.

## Owner Decisions Required

Each item below was tested against `owner-rulings.md`. His rulings name `Thinking:`, `Context:` and `Path:` only as examples and leave the other texts unruled. So the table needs his confirmation, and `model` needs his choice.

1. **The default labels.**
   - `Path:`, `Context:`, `Tokens:` and `Cost:` added; `Thinking:` unchanged.
   - No label on `blank`.
   - Word with colon as the shape.
   - Recommended: confirm as proposed.
2. **`model`.**
   - **No default label:** renders `anthropic: claude-opus-4`. Matt recommends this.
   - **`Model:`:** renders `Model: anthropic: claude-opus-4`. Neil recommends this.
   - Changing the default format is rejected by both advisors.

### Joel's rulings

Recorded at PL2, 2026-11-08.

1. Asked *"The council proposes word-and-colon default labels: Path:, Context:, Tokens:, Cost:, with Thinking: unchanged and no label on blank. Your own footer doesn't change, because your four instruments set emoji labels. Confirm?"*, he chose **"Confirm as proposed (Recommended)"**. **`path` gets `Path:`, `context` gets `Context:`, `tokens` gets `Tokens:`, `cost` gets `Cost:`, `thinking` keeps `Thinking:`, and `blank` gets no default label. The shape is a word with a colon.**
2. Asked *"model's default format is already "provider: model". The two advisors split. What should model's default be?"* (offered no default label, or `Model:` over the current format), he answered in his own words: **"Model: antropic/claude-opus-4"**. **`model` gets the default label `Model:`, and its default format changes from `$provider: $model` to `$provider/$model`, so it renders `Model: anthropic/claude-opus-4`.** This overrides both advisors' rejection of a default-format change, and it revises the living requirement that model renders the text it renders today. ("antropic" in his answer is the provider id `anthropic`.)
