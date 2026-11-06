# Research — Chidi (documentation)

Change: `2026-11-06-default-thinking-instrument`
Seat: documentation, API and platform behavior. No design judgments, no workflow verdict.

Host examined: `@earendil-works/pi-coding-agent` **1.5.0** (installed at
`~/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent`).
Context7 was not queried: pi is not a Context7-indexed library, and the brief permits the
installed pi docs and type declarations as authoritative local sources. Every citation below
names a file in that install or in this repository.

## Sources

| ID | Source | Purpose |
| --- | --- | --- |
| S1 | `docs/settings.md` (pi install) | Thinking levels enum, `defaultThinkingLevel` default |
| S2 | `docs/models.md` (pi install) | `/thinking` command, per-model level clamping |
| S3 | `docs/usage.md` (pi install) | Editor border indicates thinking level; `/thinking`, `Shift+Tab` |
| S4 | `docs/extensions.md` (pi install) | `ctx.thinkingLevel`, `thinking_level_select` event, `pi.getThinkingLevel()/setThinkingLevel()`, `ctx.ui.theme`, `ctx.ui.setFooter` |
| S5 | `docs/themes.md` (pi install) | Theme color token groups, `thinkingMax` fallback |
| S6 | `schemas/theme.schema.json` (pi install) | Formal schema for `thinkingOff`…`thinkingMax` tokens |
| S7 | `dist/modes/interactive/theme/theme.d.ts`, `dist/modes/interactive/theme/theme.js` (pi install) | Public `Theme.getThinkingBorderColor(level)` declaration and its per-level mapping |
| S8 | `dist/modes/interactive/interactive-mode.js` (pi install) | Editor border color = `theme.getThinkingBorderColor(session.thinkingLevel \|\| "off")` |
| S9 | `dist/index.d.ts` (pi install) | `Theme`, `ThemeColor`, `ThemeToken`, `ThinkingLevelSelectEvent` are exported public API |
| S10 | `dist/modes/interactive/theme/dark.json` (pi install) | Built-in dark theme values for the seven thinking border tokens |
| S11 | `docs/tui.md` (pi install) | Theme usage rules for extensions; theme-change cache invalidation |
| S12 | `docs/keybindings.md` (pi install) | `app.thinking.cycle` (`shift+tab`), `app.thinking.save` (`ctrl+s`) |
| S13 | pi-jefferson `README.md`, `extensions/jefferson/format.ts`, `openspec/specs/statusline/spec.md` (this repo) | Current documented shape of `format` and the `thinking` instrument |
| S14 | `openspec/changes/2026-11-06-default-thinking-instrument/owner-rulings.md` (this repo) | Owner rulings being verified against docs |
| S15 | `/tmp/pi-jefferson-current-thinking-bar.png` | Visual reference: current bar renders `🤔 high` beside a level-colored editor border |

## Question 1 — What are pi's current thinking levels, and where are they documented?

Pi has seven thinking levels: **`off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`**.

- `settings.md` documents `defaultThinkingLevel` as `"off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max"` with default `"medium"` (S1, line 15).
- `extensions.md` repeats the same seven-value union for `pi.getThinkingLevel()` (S4, line 1945).
- `models.md` uses the same keys for `samplingParamsByThinkingLevel` (S2, line 116).
- The `/thinking` command selects the level for the current model, and "Pi limits the choices to levels supported by the selected model" (S2, line 31). `Shift+Tab` cycles supported levels; `Ctrl+S` saves the startup level (S3 line 49; S12 lines 156–157; S2 line 31).
- `thinkingBudgets` configures token budgets for `minimal`, `low`, `medium`, and `high` only (S1, line 17).

## Question 2 — What does `ctx.thinkingLevel` mean, and what does `thinking_level_select` deliver?

**`ctx.thinkingLevel`** is "its [the active model's] current effective thinking level" (S4, line 1216). "Effective" matters: `pi.getThinkingLevel()` clamps the level to model capabilities — "non-reasoning models always use `\"off\"`" (S4, line 1940). The same value is exposed in the SDK as `session.thinkingLevel` (`docs/sdk.md`, line 30).

**`thinking_level_select`** is a notification-only extension event; handler return values are ignored (S4, line 952). Its payload is:

- `event.level` — newly selected thinking level
- `event.previousLevel` — previous thinking level

(S4, lines 957–963.) It fires when the thinking level changes via settings, keybinding, `pi.setThinkingLevel()`, **and** when a model change causes the level to change or be clamped — `/model` cycling emits `thinking_level_select` first, then `model_select` (S4, lines 402–403). The docs' own example uses it to drive a footer-style status: `ctx.ui.setStatus("thinking", \`thinking: ${event.level}\`)` (S4, line 961). The event type `ThinkingLevelSelectEvent` is exported public API (S9, line 8). Session restore: `pi.setThinkingLevel()` is "recorded in session history and restored when that session is resumed" but does not change the configured default for new sessions (S4, line 1942).

## Question 3 — What colors the thinking horizontal rules on the input box, and is it a fixed token or per-level mapping?

**It is a per-level mapping, not a fixed token.** Seven dedicated theme color tokens exist, one per level:

| Token | Schema description |
| --- | --- |
| `thinkingOff` | "Thinking level border: off" |
| `thinkingMinimal` | "Thinking level border: minimal" |
| `thinkingLow` | "Thinking level border: low" |
| `thinkingMedium` | "Thinking level border: medium" |
| `thinkingHigh` | "Thinking level border: high" |
| `thinkingXhigh` | "Thinking level border: xhigh" |
| `thinkingMax` | "Thinking level border: max (falls back to thinkingXhigh when omitted)" |

(S6, `properties/colors`; S5, lines 115 and 128 group them under "Editor modes: `thinking*`".)

Mechanism, from shipped code: the interactive mode sets the editor's border color to
`theme.getThinkingBorderColor(this.session.thinkingLevel || "off")` (S8, lines 1902, 3033, 3125).
`getThinkingBorderColor` is a switch mapping each level to its token (`theme.fg("thinkingOff", …)`
through `theme.fg("thinkingMax", …)`) (S7, theme.js lines 244–260). The user-facing docs confirm the
behavior: "The editor border indicates the current thinking level" (S3, line 25).

Built-in dark theme values (S10, lines 64–70) show an intentional per-level gradient, e.g.
`thinkingMedium: okhsl(263 59% 56%)`, `thinkingHigh: okhsl(295 73% 59%)`,
`thinkingMax: okhsl(20 99% 63%)` — so matching "the thinking HR color" means resolving the token
for the *current* level, not one constant color.

## Question 4 — Which theme tokens or public API should an extension use, and what happens when the theme changes?

Two documented/declared routes exist:

1. **`Theme.getThinkingBorderColor(level: ThinkingLevel): (str: string) => string`** — a public
   method on the exported `Theme` class (S7, theme.d.ts line 81; `Theme` is exported from the
   package root, S9 line 38; `ThinkingLevel` comes from `@earendil-works/pi-agent-core`). This is
   exactly what pi itself uses for the editor border (S8), so it is the most faithful match.
   *Caveat:* it appears in the shipped type declarations but is **not mentioned in the prose docs**
   (`docs/themes.md`, `docs/tui.md`, `docs/extensions.md`) — see Gaps.
2. **The tokens directly** — `theme.fg("thinkingHigh", text)` or
   `theme.style(text, { fg: "thinkingHigh" })`, using the level→token mapping. Tokens are ordinary
   foreground color tokens; `theme.colors` exposes concrete resolved colors (S11, "Apply themes
   correctly"; S9 line 38 exports `ThemeColor`/`ThemeToken`).

**Theme changes:** the theme object is passed per render — footer factories receive
`(tui, theme, footerData)` and component callbacks receive a `theme` (S4, lines 2907, 2914; S11).
Docs instruct: "Use the theme passed to the extension or component callback" and warn: "Do not
permanently store strings with theme colors unless `invalidate()` rebuilds them. A theme change
clears render caches, but it cannot remove old ANSI colors embedded in application state" (S11,
lines 170–173). So an extension that resolves the level color inside `render(width)` (or rebuilds
in `invalidate()`) tracks theme switches automatically; a `thinkingMax` token omitted from a
custom theme falls back to `thinkingXhigh` (S5, line 128).

## Question 5 — Current documented shape of string modifiers in pi-jefferson (`capitalize`)

**Gap: there is no documented or implemented string-modifier feature in pi-jefferson today.**

- The README documents `format` as "plain text with the instrument's already-formatted
  `$variables`" and lists variables per instrument with **no `|` modifier syntax** anywhere
  (S13, README lines 57–70).
- The format parser (`extensions/jefferson/format.ts`) recognizes literals, `$variable`,
  the `\$` escape, and the `$bar` width-taker — nothing else; a bare `$` is an error and an
  undeclared variable is an error (S13, format.ts lines 10–45).
- The current statusline spec requirement "The thinking instrument" declares `$level` with
  default format `thinking: $level` — no modifiers (S13, spec.md lines 311–332).
- The `$level|capitalize` syntax appears **only** in `owner-rulings.md` (S14), which itself
  states: "The text feature isn't there yet but can safely be assumed as functioning … The
  modifiers tests will already be in place once the other conductor gets things done."

Per the brief, this is reported as a documentation/feature gap owned by the parallel modifiers
change — **not** a test obligation for this change.

## Differences from supplied assumptions

- The owner ruling says "$level should always use the same color that is used for the thinking HRs
  that appear on the input box when the thinking level changes." Docs confirm these rules are the
  **editor border**, recolored per level — so "the same color" is a *function of the current
  level* (seven tokens), not a single fixed token. An implementation that picks one token
  (e.g. always `thinkingHigh`) would not match the border as the level changes.
- The brief's phrase "when the thinking level changes" matches the mechanism: the border color is
  recomputed from `session.thinkingLevel` at render time (S8), and `thinking_level_select` is the
  documented notification for it (S4).
- No other differences: the level set, event payload, and clamping behavior all match what the
  rulings assume.

## Assumptions

- The installed pi 1.5.0 docs and `.d.ts` declarations are authoritative for the host pi-jefferson
  runs against, as the brief permits; no newer published docs were consulted.
- `getThinkingBorderColor` is treated as public API because `Theme` and the method ship in the
  package's exported type declarations, even though prose docs do not mention it.

## Gaps

1. **`getThinkingBorderColor` is undocumented in prose docs.** It exists only in shipped type
   declarations and source. If pi's maintainers do not consider it stable API, the fallback is
   mapping levels to the documented `thinking*` tokens with `theme.fg()`/`theme.style()`.
2. **String modifiers (`|capitalize`) are neither documented nor implemented in pi-jefferson**;
   they belong to the parallel modifiers change. This change should reference the syntax, not
   specify or test it.
3. **Context7 could not be used** — pi is not indexed there; findings rely on the installed
   package's docs, schemas, and declarations instead.
4. The visual reference (`S15`) shows the border color Joel sees at level `high`; the specific
   theme producing that color is Joel's own theme and is outside documentation scope (design
   judgment belongs to Michael).
