# Research (Chidi): pi theme colours as format modifiers

Pinned: `@earendil-works/pi-coding-agent` 1.4.0 (`node_modules/@earendil-works/pi-coding-agent`, `dist/` read directly; behaviour also confirmed by running the installed `Theme` class). `@earendil-works/pi-tui` 1.4.0. Paths below are relative to the pi package unless stated.

## 1. What pi exposes about theme tokens

**`THEME_TOKENS` exists but is NOT exported from the public entry.** Package `exports` has only `"."` (→ `dist/index.js`, `dist/index.d.ts`) and `"./rpc-entry"`. No deep import path (`theme-tokens.js`) is reachable under Node's exports map.

`dist/index.js:45`:
```js
export { getLanguageFromPath, getMarkdownTheme, getSelectListTheme, getSettingsListTheme, highlightCode, initTheme, Theme, } from "./modes/interactive/theme/theme.js";
```
`dist/index.d.ts:38`:
```ts
export { getLanguageFromPath, getMarkdownTheme, getSelectListTheme, getSettingsListTheme, highlightCode, initTheme, Theme, type ThemeAppearance, type ThemeBg, type ThemeColor, type ThemeStyle, type ThemeToken, } from "./modes/interactive/theme/theme.ts";
```
- Runtime value exports from the root: `Theme` (class), `initTheme`, etc. `typeof m.THEME_TOKENS` is `undefined` (verified).
- **Type-only** exports: `ThemeColor`, `ThemeBg`, `ThemeToken`, `ThemeStyle`, `ThemeAppearance`. Not runtime lists.
- Also not exported from root: the global `theme` proxy, `getThemeByName`, `getResolvedThemeColors`, `onThemeChange`, `setTheme`.

Where it lives: `dist/modes/interactive/theme/theme-tokens.js` / `.d.ts`:
```ts
export interface ThemeTokenDescriptor { slot: "foreground" | "background"; description: string; fallback?: string; }
export declare const THEME_TOKENS: { readonly accent: { readonly slot: "foreground"; ... }, ... };
export type ThemeToken = keyof typeof THEME_TOKENS;
export type ThemeColor = { [K in ThemeToken]: (typeof THEME_TOKENS)[K]["slot"] extends "foreground" ? K : never; }[ThemeToken];
export type ThemeBg = Exclude<ThemeToken, ThemeColor>;
```
So `ThemeColor` = tokens with slot `foreground`; `ThemeBg` = everything else (slot `background`). Types derive from the slot.

Token set in 1.4.0 (56 tokens, from running the module):
- **foreground (49):** accent, border, borderAccent, borderMuted, success, error, warning, muted, dim, text, thinkingText, scrollbarTrack, scrollbarThumb, searchMatchText, userMessageText, customMessageText, customMessageLabel, toolTitle, toolOutput, mdHeading, mdLink, mdLinkUrl, mdCode, mdCodeBlock, mdCodeBlockBorder, mdQuote, mdQuoteBorder, mdHr, mdListBullet, toolDiffAdded, toolDiffRemoved, toolDiffContext, syntaxComment, syntaxKeyword, syntaxFunction, syntaxVariable, syntaxString, syntaxNumber, syntaxType, syntaxOperator, syntaxPunctuation, thinkingOff, thinkingMinimal, thinkingLow, thinkingMedium, thinkingHigh, thinkingXhigh, thinkingMax, bashMode
- **background (7):** selectedBg, searchMatchBg, userMessageBg, customMessageBg, toolPendingBg, toolSuccessBg, toolErrorBg
- Optional with fallback: scrollbarTrack→muted, scrollbarThumb→text, searchMatchText→text, thinkingMax→thinkingXhigh (fg); searchMatchBg→selectedBg (bg). `defineThemeTokens` throws if a fallback crosses slots.

**Consequence for an extension (runtime access):** there is no exported runtime token/slot table. What an extension *can* get at runtime from a `Theme` instance:
- `theme.colors` (public getter, `Readonly<Record<ThemeToken, Color>>`): keys = all 56 tokens, both slots, no slot info (verified: 56 keys on `dark`).
- Slot discrimination is possible by probing: `getFgAnsi(name)` succeeds only for foreground tokens; `getBgAnsi(name)` only for background (verified: `fg("selectedBg")` and `bg("accent")` both throw "Unknown theme color"). The `Theme` instance's `fgAnsi`/`bgAnsi` maps are `private` (TS only; still JS properties, but not API).
- Types are available at compile time only; a hard-coded list typed `ThemeColor[]` would be checked by `tsc` for membership but not for completeness.
- The docs (`docs/themes.md`) do not publish a token list; they point to the JSON schema (https://pi.dev/schemas/theme.schema.json) and describe groups.

## 2. The `Theme` object at render

Delivered to extensions as the `theme` argument of `setWidget`/`setFooter`/`setHeader`/`custom`/`renderCall`/`renderResult`/message renderers, and via `ctx.ui.theme` (`dist/core/extensions/types.d.ts:179`, `readonly theme: Theme`; implemented as `get theme() { return theme; }` at `dist/modes/interactive/interactive-mode.js:2083`, reading the global at access time).

`dist/modes/interactive/theme/theme.d.ts` (public members): `fg(color: ThemeColor, text)`, `bg(color: ThemeBg, text)`, `getFgAnsi(color: ThemeColor)`, `getBgAnsi(color: ThemeBg)`, `bold/italic/underline/inverse/strikethrough(text)`, `style(text, {fg,bg,bold,dim,...})`, `getColorMode()`, `colors`, `appearance`, `name`.

Unknown name (`theme.js` `tokenAnsi`):
```js
tokenAnsi(ansi, token) {
    const value = ansi.get(token);
    if (value === undefined) throw new Error(`Unknown theme color: ${token}`);
    return value;
}
```
All four of `fg`, `bg`, `getFgAnsi`, `getBgAnsi` throw `Unknown theme color: <name>`; a name of the *other* slot throws the same (verified). Not a TypeError, no distinction between "unknown" and "wrong slot".

Token → SGR (`theme.js` constructor `addToken`, `pi-tui/dist/colors.js:215`):
```js
if (value === "") { ...; return isBackground ? "\x1b[49m" : "\x1b[39m"; }   // empty = terminal default
const color = parseColor(value);
return isBackground ? backgroundAnsi(color, mode) : foregroundAnsi(color, mode);
```
```js
function colorAnsi(color, mode, background) {
    if (color.kind === "indexed") return `\x1b[${background ? 48 : 38};5;${color.index}m`;
    const rgb = colorToRgb(color);
    if (mode === "truecolor") return `\x1b[${background ? 48 : 38};2;${r};${g};${b}m`;
    return `\x1b[${background ? 48 : 38};5;${rgbToAnsi256(rgb)}m`;
}
```
- Truecolor `38;2;r;g;b`; otherwise 256-colour `38;5;n`; indexed values `38;5;n`; `""` → `\x1b[39m` (default fg), which is a valid non-empty string (verified `getFgAnsi("text")` on dark is truecolor; empty-string themes emit `\x1b[39m`). Values may be hex, 0–255, `okhsl/oklch(...)` (gamut-mapped), or `vars` refs.
- `getFgAnsi` returns the *opening* sequence only. "Faint" tokens (see 4) include `\x1b[2m` in it.

## 3. Fixed set vs per-theme; theme change at runtime

- **The set is fixed by pi.** `docs/themes.md:81`: "Theme objects are strict: only documented top-level fields and color tokens are accepted… custom keys under `colors` or `export` … are rejected." `theme-schema.js`: `additionalProperties: false` on `colors`. Extra keys rejected; custom colours go in `vars`, which are not tokens.
- **Missing keys:** required tokens must be present per schema; only five are optional and filled by `withThemeTokenFallbacks` (list above). `splitThemeColors` does `THEME_TOKENS[key].slot` (would throw on an unknown key in an un-validated object). Every constructed `Theme` therefore has all 56 tokens in its maps (`Theme` constructor also applies fallbacks), so token *names* never vary per theme; only values do. Invalid theme → startup/`/reload` error; `initTheme`/`setTheme` fall back to the `system` theme.
- **Per-theme variation that does exist:** the `system` theme (generated from terminal colours) passes a `dim` set (19 tokens in my run: muted, dim, thinkingText, toolOutput, borderMuted, …) → those fg tokens render faint; custom/built-in file themes have an empty dim set. Values `""` mean terminal default.
- **Runtime change:** `setTheme`/`setThemeInstance`/file-watcher reload create a **new `Theme` instance** and swap `globalThis[Symbol.for("@earendil-works/pi-coding-agent:theme")]` (`theme.js:507-640`), then call `onThemeChange` → `ui.invalidate()` + `requestRender()` (`interactive-mode.js:791`). `ctx.ui.theme` returns the current global on each access; a `theme` captured in a closure/factory argument may be the old instance (components get `invalidate()`, and pi's docs say to re-read). The token *name list* doesn't change; values, colour mode and the dim set may. Hot reload only for `<agent-dir>/themes/<name>.json` (`docs/themes.md:68`); `onThemeChange` is internal (not exported from root) and is single-callback.

## 4. How pi's `fg` closes

`theme.js` (`Theme.fg` / `bg`):
```js
fg(color, text) {
    const ansi = this.tokenAnsi(this.fgAnsi, color);
    if (this.dimTokens.has(color))
        return `${ansi}\x1b[2m${text}\x1b[22;39m`;
    return `${ansi}${text}\x1b[39m`;
}
bg(color, text) { const ansi = this.tokenAnsi(this.bgAnsi, color); return `${ansi}${text}\x1b[49m`; }
```
- **Foreground-only reset `\x1b[39m`**, never `\x1b[0m`. Does not touch bold, dim (SGR 2), italic, or background. So an enclosing bold/dim/background survives past an inner `fg(...)` span: the outer style continues for text after the colour closes (but with default fg, not the outer's own fg, if the outer set one; the reset is not a restore).
- **Exception: faint tokens** (system theme only, 19 tokens incl. `muted`, `dim`): close is `\x1b[22;39m`. SGR 22 = "normal intensity": cancels **both faint and bold**. So wrapping such a token inside an enclosing bold or dim ends the outer bold/dim at the end of the inner span (verified: system `fg("muted","x")` = `"\x1b[39m\x1b[2mx\x1b[22;39m"`). `getFgAnsi` includes `\x1b[2m` for these, "which `\x1b[22m` closes" (comment in source).
- `styleTextWithAnsi` (pi-tui, used by `theme.style`) closes in reverse: `bold/dim → \x1b[22m`, italic `23`, underline `24`, inverse `27`, bg `49`, fg `39`. Note `bold` and `dim` share close `22`, so nesting bold+dim intrinsically mishandles in one inner reset.
- `theme.bold()` etc. use `chalk` (closes per chalk: bold→`22`, which also kills dim).
- Dark theme: `fg("accent","x")` = `"\x1b[38;2;167;152;215mx\x1b[39m"` (verified).

## 5. Prior art: attribute names vs colour names (kept short)

Only relevant point: `dim` is conventionally a *style attribute* name (SGR 2, terminfo `dim`/`sgr`, chalk `.dim`, Rich `dim`, ncurses `A_DIM`), not a colour. I did not run a web check; this is from the in-repo precedent below and standard SGR knowledge, flagged as unverified against current upstream docs.
- Closest verifiable precedent: pi itself has a theme token *named* `dim` (colour role "Very dimmed text") alongside faint-SGR dimming, and its own system theme resolves "dimmed" tokens via SGR 2.
- zentui (below) resolves the same collision by special-casing `dim`/`dimmed` as the muted-colour fallback rather than the faint attribute, i.e. exactly the opposite of Joel's ruling, so it is a counter-example, not a model.

## 6. zentui (comparison only)

Installed at `~/.pi/agent/npm/node_modules/pi-zentui` (0.34.0; peers `@earendil-works/pi-coding-agent >=1.0.0`). Docs `docs/configuration.md` ("Component color overrides"): settings hold space-separated style specs, e.g. `"cwd": "bold green"`, `"border": "borderMuted"`, `"accent": "fg:202"`; accepts hex, 0–255, `fg:`/`bg:` prefixes, terminal colour names, `bold/italic/underline`, and **pi theme token names**. `extensions/zentui/style.ts`:
- `import type { ThemeColor } from "@earendil-works/pi-coding-agent";` (type only) and a **hand-maintained** `const themeColorTokens = new Set<ThemeColor>([...])` of 46 names (lines ~110–156), i.e. it does **not** read a runtime list from pi and does not read theme files. It lacks `scrollbarTrack`, `scrollbarThumb`, `searchMatchText` (3 of pi's 49 fg tokens), so drifts from pi's set.
- `isSupportedStyleToken` checks modifiers, then terminal colours, then `fg:`/`bg:`, then `themeColorTokens.has(token)`. Tokens are case-normalised for modifiers/colours but the token set check uses the raw (case-sensitive) token.
- `mapThemeColor`: `dim`/`dimmed` → `"muted"` fallback (not faint SGR); then `theme.fg(color, applyThemeModifiers(...))`, wrapped by `safeThemeFg` (`try { theme.fg } catch { return text }`) so unknown names degrade to plain text. Background slot is reachable only via explicit `bg:` prefix, not by token name.

## Differences from the brief's assumptions

- "THEME_TOKENS (or equivalent)… exported from the public entry": **not exported at runtime**; only `ThemeColor`/`ThemeBg`/`ThemeToken` types. The token→slot table is reachable only by deep import (blocked by `exports`) or by probing `getFgAnsi`/`getBgAnsi` / `theme.colors` keys.
- "Pi's fg closes with…": `\x1b[39m` normally, but `\x1b[22;39m` for faint tokens (system theme), which also cancels an enclosing bold.

## Gaps / residual risks

- Did not web-verify terminfo/chalk/Rich/ncurses claims (§5); stated from established SGR knowledge and in-repo evidence.
- `ctx.ui.theme` getter vs. captured `theme` argument staleness after a switch: derived from reading `interactive-mode.js` and `theme.js`; I did not run a live pi session to observe an extension across a theme switch.
- The faint-token set was observed on the `system` theme in a non-TTY run (terminal colours unreported); it comes from `generateSystemThemeColors` and may vary with terminal-reported colours.
- Whether `getFgAnsi` for a faint token, composed with enclosing styles, is what Eleanor's code will use is a repository question for Eleanor, not examined.
