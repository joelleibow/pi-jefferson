# Documentation research — cells-as-objects (Chidi the Librarian)

Scope: what the shipped pi / pi-tui documentation and type declarations say about width
measurement, padding, ANSI handling, and the `Component.render(width)` contract, plus how
starship, powerline, and tmux document per-item alignment. No design decisions, no
implementation proposals. Host examined: `@earendil-works/pi-coding-agent` 1.5.0 (local install,
includes `node_modules/@earendil-works/pi-tui`).

## Sources

- S1 — Host `docs/tui.md` (`.../pi-coding-agent/docs/tui.md`)
- S2 — pi-tui `README.md` (`.../pi-tui/README.md`)
- S3 — pi-tui `dist/utils.d.ts` and `dist/utils.js` (shipped type declarations + implementation comments)
- S4 — Host `docs/extensions.md` (`ctx.ui.setFooter`, line ~2905)
- S5 — Starship configuration docs: https://starship.rs/config/ (Fill module) and https://starship.rs/advanced-config/ (right_format)
- S6 — Powerline docs: https://powerline.readthedocs.io/en/latest/configuration/reference.html (segment `align`, `width`) and https://powerline.readthedocs.io/en/latest/develop/segments.html (expand/truncate, display cells)
- S7 — tmux manual: `status-justify` option (left|centre|right|absolute-centre), via the tmux manual mirror at https://libtmux.org/en/tmux/latest/catalog/options/status-justify/

## Q1 — Padding and width helpers

**Documented helpers (S1, S2, S3):**

- `visibleWidth(str: string): number` — "Calculate the visible width of a string in terminal
  columns" (S3, utils.d.ts:14–16). It counts **visible terminal columns**, not string length; it
  ignores ANSI codes (S2, "ANSI Code Considerations": `visibleWidth("\x1b[31mHello\x1b[0m") // 5`).
- `truncateToWidth(text: string, maxWidth: number, ellipsis?: string, pad?: boolean): string`
  (S3, utils.d.ts:86). Defaults: `ellipsis = "..."`, `pad = false` (S3, utils.js:1083). JSDoc:
  "Truncated text, optionally padded to exactly maxWidth". So truncation is column-based and the
  built-in pad is a **right-pad with spaces to exactly `maxWidth`**. `pad` is not mentioned in the
  pi-tui README; the README instead shows manual right-padding as caller arithmetic:
  `line + " ".repeat(width - visible)` where `visible = visibleWidth(line)` (S2, "Handling Line
  Width", marked "optional, for backgrounds").
- `sliceByColumn(line, startCol, length, strict?): string` — "Extract a range of visible columns
  from a line. Handles ANSI codes and wide chars." `strict: true` excludes wide chars at the
  boundary that would extend past the range (S3).
- `sliceWithWidth(...)`, `extractSegments(...)`, `wrapTextWithAnsi(text, width): string[]`,
  `applyBackgroundToLine(line, width, bgFn)` (pads to full width after applying a background) (S3).

**Alignment / left-pad:** There is **no documented helper for left-padding or text alignment**.
No function named `align*`, `padLeft`, `justify`, or similar exists in the shipped type
declarations. Both the `pad` parameter of `truncateToWidth` and the README's manual example pad on
the right; the docs' guidance is `docs/tui.md:26`: "Use `visibleWidth()`, `truncateToWidth()`,
`sliceByColumn()`, and `wrapTextWithAnsi()` instead of implementing terminal-width handling
yourself." For any other pad side, the padding count is the caller's arithmetic against
`visibleWidth` — exactly as the README's own example does for right-padding.

## Q2 — Wide glyphs, emoji, combining marks

- `docs/tui.md:24` (S1): "Every rendered line must fit within the supplied width. Measure visible
  terminal columns rather than string length because ANSI escapes, wide characters, emoji, and
  combining characters change display width."
- The implementation is grapheme-cluster based: `getGraphemeSegmenter(): Intl.Segmenter` and
  `getGraphemeCellRange(line, column)` ("Return the terminal-cell range occupied by the grapheme at
  a visible column") are exported (S3). `sliceByColumn` documents wide chars explicitly and its
  `strict` mode excludes a wide char straddling the boundary.
- Consequence documented by the docs (noted, not decided): a correct pad must count
  `visibleWidth(text)` **after** any truncation, not `text.length` and not assumed character
  counts. A truncated string can end up narrower than `maxWidth` when a wide character at the cut
  boundary is dropped, so `maxWidth - visibleWidth(result)` is the only documented-safe pad amount.
- **Gap:** the docs do not say which width table or wcwidth variant pi-tui uses, do not define
  emoji-ZWJ or combining-mark width rules, and do not promise stable widths across terminal
  emulators. They state only that these cases change display width and must be measured, not
  assumed. `docs/tui.md:184` advises testing "narrow widths, wide characters, resize events".

## Q3 — ANSI and padding

- S2 line 267: "The TUI appends a full SGR reset and OSC 8 reset at the end of each rendered line.
  Styles do not carry across lines." S1 repeats this: "Pi resets styling and hyperlinks after every
  line, so reapply styles on each rendered line."
- S2, "ANSI Code Considerations": "`visibleWidth()` ignores ANSI codes when calculating width;
  `truncateToWidth()` preserves ANSI codes and properly closes them when truncating."
- **Pad after a styled run:** the docs do not state a dedicated rule for placing a pad after an
  ANSI-styled run. Two relevant documented facts: (a) padding with plain spaces inside a line is
  shown as normal practice (S2 example, noted "optional, for backgrounds" — i.e. plain-space
  padding is unstyled and will not carry a background); (b) the shipped implementation comments
  note "Underline and strikethrough must be closed to prevent bleeding into padding" (S3,
  utils.js:739), and the exported `getActiveBackgroundAnsi(text)` helper exists precisely to detect
  a background still active at the end of a styled string. **Gap:** no doc explicitly documents a
  "reset hazard when a pad lands after a styled run"; the hazards (background/underline bleeding
  into pad spaces) are inferable from the implementation comments and helpers, not from prose docs.

## Q4 — `Component.render(width)` contract

- S2 line 261 (`Component` table): "`render(width)` — Returns an array of strings, one per line.
  Each line **must not exceed `width`** or the TUI will error. Use `truncateToWidth()` or manual
  wrapping to ensure this." S2 line 802 repeats the error guarantee.
- Lines **shorter** than `width` are fine; padding to exact width is explicitly optional ("optional,
  for backgrounds", S2).
- Nothing in the docs constrains alignment, trailing spaces, or minimum width of a returned line.
- No line-count constraint is documented for a component's return value in general; the array is
  "one per line" and containers handle layout.

## Q5 — Prior art vocabulary (starship, powerline, tmux)

- **Starship** (S5): alignment is positional, not a per-module property. The **`fill` module**
  "fills any extra space on the line with a symbol... This is useful for aligning other modules";
  multiple fills "split the space evenly between them". Right-side content uses the prompt-wide
  **`right_format`** option ("Enable Right Prompt" in Advanced Configuration). No per-module
  `align` key exists; `fill` is the documented mechanism for pushing content apart within a line.
- **Powerline** (S6): the closest precedent for this change. Each segment dictionary supports an
  **`align`** key: "Aligns the segments contents to the left (`l`), center (`c`) or right (`r`).
  Has no sense if `width` key was not specified..." — i.e. alignment is meaningful only inside a
  bounded width, exactly the cell-with-fixed-columns model. A `width: auto` segment "work[s] as a
  spacer", with "the space distributed equally among all the spacer segments", and spacer contents
  "can be aligned with the `align` property". Segments are also partitioned into `left` and `right`
  lists. Powerline's developer docs are explicit about units: the `expand` callback's `amount` is a
  number of **display cells** — "'Amount of display cells' is *not* number of Unicode codepoints,
  string length, or byte count" — and the suggested expand is `(' ' * amount) + contents`. A global
  `ambiwidth` option handles East Asian Ambiguous width (1 or 2).
- **tmux** (S7): the status line is divided by **position, not per-item alignment**:
  `status-left` / `status-right` (with `status-left-length` / `status-right-length`) hold content at
  the two ends, and **`status-justify`** — values `left`, `centre`, `right`, `absolute-centre` —
  "Set[s] the position of the window list in the status line". Per-item padding within a side is
  done with format modifiers, not an align property.

Vocabulary note: powerline uses `align` with letter values (`l`/`c`/`r`); starship uses a
positional `fill`; tmux uses `justify` for block positioning. All three keep truncation and
alignment as separate concerns.

## Assumptions

- The local host install (1.5.0) is authoritative even though the repo typechecks against 1.4.0;
  per the brief, the host's shipped docs are primary.
- The public pi documentation site was not consulted because the shipped docs answered all
  questions; no conflicting information was encountered.

## Gaps

- pi-tui docs do not document any left-pad/alignment helper — padding side and count beyond the
  built-in right-pad are caller arithmetic. (Finding, also a gap.)
- pi-tui docs do not document the width table (wcwidth variant), emoji-ZWJ handling, or
  combining-mark width rules beyond "measure, don't assume".
- No documented rule about padding after an ANSI-styled run; the style-bleed hazard into padding is
  evidenced only in implementation comments and the `getActiveBackgroundAnsi` helper.
- Powerline's `align` docs say it "has no sense" without `width`; tmux and starship offer no
  per-item align property at all — so `align` as a per-cell property of a fixed-width region has
  one strong precedent (powerline) rather than three.
