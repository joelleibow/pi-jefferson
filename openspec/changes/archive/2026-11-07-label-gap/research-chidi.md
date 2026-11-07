# Documentation research — label-gap (Chidi the Librarian)

Scope: prior art and platform facts about the gap between a label (symbol, icon) and the value
it precedes — how Starship places the space, how other pi footer packages document icon/label
separation, how pi-tui's `visibleWidth` / `truncateToWidth` treat a trailing space after a wide
glyph, and whether terminals disagree on the width of the owner's emoji (🧠 🤔 🔋). No design
decisions, no implementation proposals. Host examined: `@earendil-works/pi-coding-agent` 1.5.0
(local install, including `node_modules/@earendil-works/pi-tui` 1.5.0).

## Sources

- S1 — Starship configuration docs: https://starship.rs/config/ (Format Strings; per-module
  `symbol`/`format` option tables; module convention prose)
- S2 — pi-powerline-footer README (nicobailon): https://github.com/nicobailon/pi-powerline-footer/blob/main/README.md
  (npm `pi-powerline-footer` 0.22.0; also the maintained fork README at
  https://github.com/CarterMcAlister/pi-packages/blob/main/packages/pi-powerline-footer/README.md)
- S3 — pi-tui shipped type declarations and implementation: `.../pi-coding-agent/node_modules/@earendil-works/pi-tui/dist/utils.d.ts`
  and `dist/utils.js` (cited by file and line)
- S4 — pi host docs: `.../pi-coding-agent/docs/tui.md` (cited by line)
- S5 — iTerm2 documentation: https://iterm2.com/documentation-preferences-profiles-text.html and
  https://iterm2.com/feature-reporting/unicode.txt
- S6 — kitty FAQ: https://sw.kovidgoyal.net/kitty/faq/ and kitty discussion
  https://github.com/kovidgoyal/kitty/discussions/7689
- S7 — zsh-workers mailing list, emoji width per terminal: https://www.zsh.org/mla/workers/2024/msg00487.html
- S8 — Jeff Quast, "Terminal Emulators Battle Royale – Unicode Edition!":
  https://www.jeffquast.com/post/ucs-detect-test-results/
- S9 — terminfo.dev, emoji wide chars: https://terminfo.dev/text/emoji-wide-chars
- S10 — fish-shell PR #5722 (runtime emoji-width detection): https://github.com/fish-shell/fish-shell/pull/5722
- S11 — Unicode/emoji codepoint references: https://emojipedia.org/brain,
  https://codepoints.net/U+1F914, https://codepoints.net/U+1F50B
- S12 — Darren Burns, "Terminal support for emoji": https://darrenburns.net/posts/emoji-in-the-terminal/

## Q1 — Starship: where the space between symbol and value lives

**The documented convention puts the trailing space inside the symbol string. Starship adds no
space automatically.** (S1)

- The Format Strings section documents that spaces in format strings are explicit, never
  inserted: `'$git_branch$git_commit'` renders adjacent; "'$git_branch $git_commit' has the two
  variables separated with a space." (S1)
- Language modules ship symbol defaults that end in a space, and the default format strings place
  `$symbol` flush against the next variable — the only space is the one inside the symbol:
  - Bun: `symbol` default `'🥟 '`; `format` default `'via [$symbol($version )]($style)'` (S1).
  - Python: `symbol` default `'🐍 '`; `format` default
    `'via [${symbol}${pyenv_prefix}(${version} )(\($virtualenv\) )]($style)'` (S1).
  - OS module symbol map: `Macos = "🍎 "` — the example cited in the brief — and every other OS
    entry likewise ends in a space (S1).
- Modules without a `symbol` option carry the gap in the format string instead. Directory has no
  `symbol`; its default format ends with the separating space:
  `'[$path]($style)[$read_only]($read_only_style) '` (S1).
- Starship also documents a module-level convention: "By convention, most modules have a prefix
  of default terminal color (e.g. `via` in "nodejs") and an empty space as a suffix." (S1) —
  that trailing space separates one module from the next, a different gap from the symbol–value
  gap.
- **What users do to change it:** set the module's `symbol` option in `~/.config/starship.toml`
  (the docs' own example shows `[character] success_symbol = '[➜](bold green)'`), editing the
  trailing space into or out of the symbol string; or override the module's `format` (S1). There
  is no documented global "gap" setting.

## Q2 — Other pi footer/statusline packages: icon/label separation

Examined: `pi-powerline-footer` (nicobailon, npm 0.22.0) and its maintained fork
(CarterMcAlister/pi-packages). Published documentation only. (S2)

- The label-like mechanism is `customItems[].prefix`: "`prefix` (optional): text shown before the
  live status value" (S2). The documentation defines placement only; **it does not say whether a
  space separates the prefix from the value**, nor whether that gap is configurable.
- Icons are user-overridable strings via `theme.json`: "Icons can be any string, including `""`
  when you want to suppress a specific glyph entirely" (S2). No documented spacing behavior
  attached to icons.
- The only documented spacing knob is `powerline.padding` (integer 0–8, default 1), which
  controls "the outer spaces on each edge of every primary and secondary bar row" — and the docs
  explicitly carve out the interior: "Padding does not change segment-internal spacing,
  separators, or editor, transcript, and queue-preview spacing." (S2) So segment-internal spacing
  exists as a concept but is documented as *not* user-configurable via padding.
- Separators (`powerline`, `slash`, `pipe`, `none`, …) sit **between segments**, not between an
  icon and its value (S2).
- **Documentation gap:** neither the original nor the fork's published documentation states how
  the gap between an icon/prefix and its value is produced (embedded in the icon string, in a
  format template, or added by the renderer). Answering that would require reading the extension's
  source, which this brief excludes ("from their published documentation only").

## Q3 — pi-tui: `visibleWidth` and `truncateToWidth` on a trailing space after a wide glyph

Host docs mandate these helpers: "`visibleWidth()`, `truncateToWidth()`, `sliceByColumn()`, and
`wrapTextWithAnsi()`" are the prescribed width tools, because "ANSI escapes, wide characters,
emoji, and combining characters change display width" (S4, docs/tui.md:24,26).

**`visibleWidth` (S3, utils.d.ts:14–16 — "Calculate the visible width of a string in terminal
columns"; implementation utils.js:212):**

- Width is computed per grapheme cluster and summed: the segmenter loop at utils.js:256 does
  `width += graphemeWidth(segment)`. Each grapheme is measured independently of its neighbors.
- A space (U+0020) is printable ASCII → width 1 (utils.js:151–152, the `code >= 0x20 && code <=
  0x7e` branch of `graphemeWidth`, and the `asciiVisibleWidth` fast path at utils.js:428,433).
- A wide emoji such as 🧠 (U+1F9E0) → width 2: `couldBeEmoji` (utils.js:23–32) pre-filters
  emoji-block codepoints, VS16-containing segments (`segment.includes("\uFE0F")`, utils.js:29),
  and multi-codepoint sequences; clusters that then match `\p{RGI_Emoji}` return 2
  (utils.js:165–166).
- **Consequence (from the code, stated as fact):** `"🧠 "` measures 3 columns — emoji 2, space 1.
  The trailing space is its own grapheme and always counts 1, regardless of how any terminal
  renders the emoji. `visibleWidth` is a pure function of the string; it does not query the
  terminal. For emoji with variation selectors (e.g. `☁️` = U+2601 U+FE0F), the VS16 routes the
  whole cluster through the emoji test (utils.js:29), so the cluster counts 2 if it is
  RGI-qualified, and a following space still counts 1.

**`truncateToWidth` (S3, utils.d.ts:72–86; implementation utils.js:1083):**

- Signature: `truncateToWidth(text, maxWidth, ellipsis = "...", pad = false)`; JSDoc: "Truncate
  text to fit within a maximum visible width, adding ellipsis if needed. Optionally pad with
  spaces to reach exactly maxWidth."
- If the whole string fits (`visibleWidth(text) <= maxWidth`), it is returned unchanged — a
  trailing space is preserved (utils.js:1202–1203 `if (!overflowed && exhaustedInput) return pad
  ? ... : text;`; ASCII fast path utils.js:1103–1105).
- When clipping, it keeps the contiguous grapheme prefix while `keptWidth + width <= targetWidth`
  with `targetWidth = maxWidth - visibleWidth(ellipsis)` (utils.js:1109, 1122). A trailing space
  at the clip boundary is an ordinary width-1 grapheme: kept if a column remains, dropped if not.
- On any overflow the ellipsis (default `"..."`) is appended to the kept prefix
  (utils.js:1205, `finalizeTruncatedResult`), so at a clip boundary the gap space — like any
  trailing content — is replaced by the ellipsis; there is no special handling of spaces.

## Q4 — Do terminals disagree on the width of 🧠 🤔 🔋?

**Unicode facts (documented, S11):**

- 🧠 U+1F9E0 BRAIN — approved in Unicode 10.0 (2017), Emoji 5.0; `Emoji_Presentation = 1`;
  default presentation is emoji (wide).
- 🤔 U+1F914 THINKING FACE — Unicode 8.0 (2015), Emoji 1.0; "Its East Asian Width is wide"
  (codepoints.net).
- 🔋 U+1F50B BATTERY — Unicode 6.0 (2010); "Its East Asian Width is wide" (codepoints.net).

**Terminal disagreement (documented):**

- iTerm2 ships user-facing width settings precisely because systems disagree: "Use Unicode
  Version 9+ Widths — Unicode version 9 offers better formatting for Emoji. If your applications
  have been updated to use these tables, you should enable this setting," and "Ambiguous
  characters are double-width" (S5). iTerm2's Unicode feature notes state: "'Ambiguous'
  characters resolve as either Wide or Narrow depending on the terminal emulator's
  configuration," and document that e.g. ANGRY FACE (U+1F620) "is Narrow in Unicode 8 and Wide
  in Unicode 9 and up" (S5).
- A concrete per-terminal divergence with a variation-selector emoji (S7, zsh-workers 2024, for
  `☁️` = U+2601 U+FE0F): "Kitty renders this as 2 cells wide and width is computed as 2 cells
  wide. Default Mac terminal — rendered as 2 cells wide, but width is computed as 1 cell wide.
  Results in the next character overlapping the emoji. iTerm 2 — same as default Mac terminal
  (next char overlaps). Alacritty — renders as 1 cell wide." In the overlap terminals, the cell
  where a one-space gap would sit is exactly the cell that gets overdrawn.
- kitty documents that it follows Unicode cell counts strictly and rescales or truncates glyphs
  that do not fit, "different from other terminals which just let the character overflow into
  neighboring cells" (S6) — i.e. in overflow-tolerant terminals a wide glyph can bleed into the
  adjacent (gap) cell. A kitty maintainer discussion also notes glyph-size differences: the same
  emoji renders at different visual sizes in kitty vs WezTerm because "the aspect ratio of the
  cells are different in the two terminal emulators" (S6, discussion #7689).
- "Terminals frequently disagree on emoji widths, especially for newer Unicode additions" (S9).
  Quast's cross-terminal survey documents wide/zero-width handling differences across popular
  emulators (S8). fish-shell measures emoji width at runtime because "Since Unicode 9, the width
  of some characters changed to 2. Depending on the system, it might have support for it, or it
  might not" (S10). Identical strings can render at different widths across terminals for
  multi-codepoint emoji (Hyper vs iTerm2 example) (S12).

**Assessment against the question (documented basis + marked uncertainty):** yes, terminals
disagree about emoji cell widths, and the documented mechanisms (Unicode-version table
differences, render-2/compute-1 overlap, glyph overflow into neighboring cells, cell aspect-ratio
differences) all bear on whether a one-space gap after a wide emoji stays visible. **Uncertain:**
I found no terminal-by-terminal measurement table for 🧠/🤔/🔋 specifically; all three are
East-Asian-Wide with default emoji presentation, and 🧠 (Unicode 10.0) is newer than the Unicode-9
width transition that iTerm2's setting addresses, so a terminal or libc pinned to pre-Unicode-9
tables would be expected to mismeasure it — that specific consequence is inferred from the
documented mechanism, not directly documented for these codepoints.

## Gaps and failed verifications

- pi-powerline-footer's published docs do not describe icon/prefix-to-value spacing (Q2); only
  its source could, and source reading was excluded by the brief.
- Starship's docs never use the phrase "trailing space"; the symbol-contains-the-space convention
  is established from the documented option defaults and format strings, not from a prose
  statement.
- No terminal-specific width measurements found for the exact trio 🧠 🤔 🔋 (see Q4 uncertainty).
- Context7 was used for Starship (`/websites/starship_rs`) and cross-checked against a direct
  fetch of starship.rs; pi footer packages are not indexed in Context7, so their GitHub/npm
  documentation was fetched directly. Exa's free rate limit was hit on two search queries; the
  affected angles were retried successfully through other providers.
