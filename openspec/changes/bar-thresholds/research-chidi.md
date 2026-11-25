# Research: bar-thresholds (Chidi)

Comparison and platform facts only. No design. pi examined: `@earendil-works/pi-coding-agent` **1.4.0** (`node_modules`, version confirmed in its `package.json`), with `@earendil-works/pi-tui` alongside it. zentui: `pi-zentui` **0.34.0** at `~/.pi/agent/npm/node_modules/pi-zentui`.

## 1. Prior art for threshold lists

| | Starship `battery.display` | Grafana thresholds | zentui context colour |
|---|---|---|---|
| Entry shape | `threshold` (i64, default 10), `style` (default `'red bold'`), optional `charging_symbol`, `discharging_symbol`. Array of tables. | Value + colour; Base + steps. | Fixed object `{ warning: 70, error: 90 }`, not a list. |
| Match | **`percentage <= threshold`**. The threshold is an *upper bound* ("The upper bound for the display option"). | "met or exceeded". The page does not say strictly `>=` vs `>` at the boundary. | **`>=`**: `percent >= error` → error, else `percent >= warning` → warning, else normal. |
| Which entry wins | Among matches, the one with the **lowest threshold** (`min_by_key`), i.e. "most minimally greater than the current percentage". Entry order in the file is irrelevant. | The highest threshold that is met. Grafana "automatically sorts thresholds values from highest to lowest". | The highest tier met. |
| Limit on entries | None in the docs or code. | "as many thresholds … as you want". | Fixed at 2 tiers. |
| Missing key in an entry | `serde(default)`: a missing `threshold` becomes **10**, a missing `style` becomes **`red bold`**. Missing symbols fall back to the module-level option. No inheritance from another entry. | n/a | Missing/non-finite `warning`/`error` → the default (70 / 90). |
| Below all entries / base | No match → **the module is not shown**. With no `display` at all, the default is one entry `{threshold = 10, style = 'bold red'}`. | **Base** "represents minus infinity", default green; it is always present. | Below `warning` → "normal". |
| Unknown percent | n/a (no battery → no module). | n/a | `null`/`undefined`/non-finite → `"normal"` (the gauge counts it as 0, the label shows `?`). |
| Validation | Config types only. | UI. | `Math.round`, clamp to 0–100, and **swap** if `error < warning`. |

Sources: Starship docs "Battery Display" (`docs/config/README.md`) and `src/modules/battery.rs` (filter `percentage <= display_style.threshold as f32`, then `.min_by_key(|d| d.threshold)?`), `src/configs/battery.rs` (defaults). Grafana "Configure thresholds". zentui `extensions/zentui/format.ts` (`contextColorTier`, `buildContextGauge`: 10 cells, `Math.round(pct/100*width)`) and `config.ts` (`parseContextThresholds`).

Note: Starship's `<=` runs upward from the percentage (lowest bound at or above it). The ruled rule, highest `activeAt` at or below the percentage, matches Grafana and zentui in direction and `>=` in boundary. Grafana's boundary is documented only as "met or exceeded".

## 2. pi 1.4.0 `ThemeStyle`

Declaration (`dist/modes/interactive/theme/theme.d.ts`, re-exported from the package index as `type ThemeStyle`):

```ts
export interface ThemeStyle extends TextAttributes {
    fg?: ThemeColor | Color;
    bg?: ThemeBg | Color;
}
// pi-tui colors.d.ts
export interface TextAttributes {
    bold?: boolean; dim?: boolean; italic?: boolean;
    underline?: boolean; inverse?: boolean; strikethrough?: boolean;
}
export type Color = IndexedColor | RgbColorValue | OklchColorValue;
// {kind:"indexed",index} | {kind:"rgb",r,g,b} | {kind:"oklch",l,c,h}
```

- Applied by `Theme.style(text: string, options: ThemeStyle): string`.
  - Doc comment: "Tokens are only accepted in their own slot". `fg` takes a foreground token (`ThemeColor`) and `bg` takes a background token (`ThemeBg`). A token in the other slot needs `theme.colors[token]` (`docs/tui.md`: "pass its concrete color").
  - `fg` or `bg` as a **string** → `tokenAnsi`, which does `ansi.get(token)` and **throws `Error("Unknown theme color: <token>")`** if absent.
  - `fg`/`bg` as a **non-string** (object) → `foregroundAnsi(fg, mode)` / `backgroundAnsi(bg, mode)`.
  - `fg === undefined` → no fg code. If the fg token is a "dim token", `dim: true` is forced.
- Attributes are applied in `styleTextWithAnsi` by **truthiness** (`if (options.bold)` …). Output order is fg, bg, then bold, dim, italic, underline, inverse, strikethrough. Closers: `22` for bold/dim, `23`, `24`, `27`, `29`, `39`, `49`.
- **Validation: pi does no runtime validation of a `ThemeStyle`.** It is a TypeScript type only. A string `"yes"` for `bold` would act as true. A non-boolean attribute such as `bold: "no"` is truthy and is applied. A bad token string throws only when applied. Theme JSON is validated by a separate schema (`theme-schema.ts`, typebox) for theme files, not for `ThemeStyle`.
- **Unknown key in a style: silently ignored.** `style()` destructures only `fg`/`bg`, and `styleTextWithAnsi` reads only the six attributes. Nothing throws or warns.
- `docs/tui.md` (around line 152) documents `theme.style()`; the Color-vs-token rule is at line 166.

## 3. Surfacing a non-fatal warning from an extension at load

- Extension factory: `export default function (pi: ExtensionAPI)`, sync or async (`docs/extensions.md` line 15, 56). The factory receives **no `ctx` and no `ui`**. Docs: "Do not start processes, sockets, watchers, or timers in the factory because some invocations load extensions without starting a session." So the factory cannot call `ui.notify`.
- User-facing warning API:
  ```ts
  // ExtensionUIContext (dist/core/extensions/types.d.ts:80)
  notify(message: string, type?: "info" | "warning" | "error"): void;
  ```
  Reached as `ctx.ui.notify(...)` on `ExtensionContext` (`ui`, `mode: "tui"|"rpc"|"json"|"print"`, `hasUI: boolean`, `cwd`, …). The first context an extension gets is in a handler, for example:
  ```ts
  pi.on("session_start", (event: SessionStartEvent, ctx: ExtensionContext) => { … });
  // SessionStartEvent { type:"session_start"; reason:"startup"|"reload"|"new"|"resume"|"fork"; previousSessionFile?: string }
  ```
  `session_start` fires "when a session is started, loaded, or reloaded".
- Behaviour per mode:
  - Interactive: `notify` → `showExtensionNotify`, where `"warning"` → `showWarning`, `"error"` → `showError`, anything else → `showStatus`.
  - RPC: emits a `notify` message with `notifyType`.
  - Print/json (`hasUI` false): `noOpUIContext.notify` is `() => {}`, so the warning is **silently dropped**. `ctx.hasUI` is the documented check (`hasUI`: "true in TUI and RPC modes").
  - `ctx.hasUI` for the print/json case is derived from `runner.hasUI()` (`uiContext !== noOpUIContext`).
- Not suitable for a warning: a thrown error. Pi catches handler/load errors and reports them as `ExtensionError { extensionPath; event; error: string; stack? }` via `runner.onError`/`emitError`; "Pi reports handler errors and continues where possible", but that is an error path, not a warning level.
- `ctx.ui.setStatus(key, text | undefined)` also exists but is a footer status, not a warning.
- Gap: I found no documented API for a load-time warning that works from the factory (before a session exists). The only warning-level channel found is `ctx.ui.notify(message, "warning")` inside an event handler such as `session_start`.

## 4. Integer-only JSON field

- pi reads its own settings with plain `JSON.parse(stripBom(content))` (`dist/core/settings-manager.js`). JSON has one number type; JS gets an IEEE-754 double. Verified in Node:
  - `JSON.parse("70")`, `"70.0"`, `"7e1"`, `"7.0e1"`, `"1E+2"` → all arrive as the integer-valued numbers 70, 70, 70, 70, 100. `Number.isInteger` → `true`. The text form is **not recoverable** after parsing.
  - `"70.5"` → 70.5, `Number.isInteger` false.
  - `"70.00000000000000001"` → 70 (precision lost; `isInteger` true).
  - `"-0"` → `-0`; `Number.isInteger(-0)` is true and `Object.is(x, -0)` is true. Range checks `0 <= x` pass for `-0`.
  - `"1e400"` → `Infinity` (`isInteger` false). Non-numbers (`"70"` string, `true`, `null`) have `typeof !== "number"`.
  - `NaN` cannot occur from valid JSON.
  - Very large integer-valued doubles such as `1e21` pass `Number.isInteger`; `Number.isSafeInteger` also bounds beyond 2^53. A 0–100 range check removes both cases.
- Precise check available: `typeof v === "number" && Number.isInteger(v)` (then range check). `Number.isInteger` rejects `NaN`, `±Infinity`, fractions; it accepts `70.0`/`7e1`.
- pi's own published `schemas/settings.schema.json` uses JSON Schema `"type": "integer"` (and `"minimum"` 7 times). JSON Schema validators likewise treat `70.0` as an integer (it is mathematically integral), consistent with `Number.isInteger`.
- Zentui precedent (not a rule): numeric config is parsed leniently (`typeof === "number" && Number.isFinite`, then `Math.round` and clamp), the opposite of reject-on-malformed. Cited only as contrast to Joel's ruling.

## Gaps and caveats

- Grafana's page does not state the exact boundary operator beyond "met or exceeded".
- No documented load-time (factory) warning channel; see section 3.
- Whether pi's ecosystem has a common convention for rejecting a whole settings document was not found in pi docs. I did not examine how this repository reads its settings (that is Eleanor's question).
- Starship's `<=`/`min_by_key` semantics were read from the master branch source, not a pinned release.
