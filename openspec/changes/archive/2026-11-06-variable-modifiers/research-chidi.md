# Research — Chidi the Librarian: `variable-modifiers`

**Question:** Prior art for pipe-style value modifiers and styling inside format strings; Node string case behavior; pi's thinking levels and `Theme.style` attribute mechanics — for Joel's change: string mutation of variable values via chainable `|name` modifiers, with pi's six text attributes (bold, dim, italic, underline, inverse, strikethrough) as modifiers.

**Versions examined:**

| Component | Version |
|---|---|
| pi-coding-agent (installed) | 1.5.0 |
| @earendil-works/pi-tui | 1.5.0 |
| @earendil-works/pi-ai | 1.5.0 |
| @earendil-works/pi-agent-core | 1.5.0 |
| chalk (pi-coding-agent dependency) | 6.0.0 |
| Node.js | v26.8.1 |
| Jinja2 (empirical check in a temp venv) | 3.1.6 |
| tmux man page / Starship docs / Oh My Posh docs / Shopify Liquid docs / sprig docs | current web docs, fetched 2026 |

Empirical items were run against the installed sources and interpreters listed above; everything else is quoted from the cited docs. Unverified items are marked **[GAP]**.

---

## 1. Prior art for pipe-style modifiers on a variable

### Jinja2 — `{{ name|filter }}`

Syntax: filters separated from the variable by `|`, optional arguments in parentheses, chainable left-to-right. Docs (https://jinja.palletsprojects.com/en/stable/templates/):

> "Variables can be modified by **filters**. Filters are separated from the variable by a pipe symbol (`|`) and may have optional arguments in parentheses. Multiple filters can be chained. The output of one filter is applied to the next. For example, `{{ name|striptags|title }}` ... (`title(striptags(name))`)."

Case-changing filters, exact doc text:

- `upper` — "Convert a value to uppercase."
- `lower` — "Convert a value to lowercase."
- `capitalize` — "Capitalize a value. The first character will be uppercase, all others lowercase."
- `title` — "Return a titlecased version of the value. I.e. words will start with uppercase letters, all remaining characters are lowercase."

So Jinja's `capitalize` **lowercases the remainder** — verified empirically (Jinja 3.1.6): `{{ "hELLO wORLD"|capitalize }}` → `'Hello world'`.

Unknown filter: **compile-time error**. Jinja 3.1.6, verified:

```
>>> env.from_string('{{ x|nosuchfilter }}')
TemplateAssertionError: No filter named 'nosuchfilter'.
```

Missing/empty value: default `Undefined` "evaluate[s] to an empty string if printed or iterated over, and ... fail[s] for every other operation" (doc quote). Verified: `{{ x|upper }}` with undefined `x` renders `''`; `{{ ""|capitalize }}` → `''`. (`upper` on `Undefined` yields `''` because the filter stringifies first.) Jinja 3.0+ also has an `is filter` test to probe filter existence.

### Liquid (Shopify) — `{{ product.title | upcase }}`

Syntax: pipe after the value, filters chain left-to-right, arguments after a colon. Docs (https://shopify.dev/docs/api/liquid):

> "To filter the output of a tag, use the pipe character `|`, followed by the filter." Example: `{{ product.title | upcase | remove: 'HEALTH' }}` with `product.title = "Health potion"` → `POTION`.

Case-changing filters:

- `upcase` — "Converts a string to all uppercase characters." (https://shopify.dev/docs/api/liquid/filters/upcase)
- `downcase` — lowercase analog.
- `capitalize` — "Capitalizes the first word in a string and downcases the remaining characters." (https://shopify.dev/docs/api/liquid/filters/capitalize). So Liquid's `capitalize` also **lowercases the remainder**, same as Jinja's.

Unknown filter: the reference Ruby implementation **silently ignores unknown filters** — the whole output of the filtered expression becomes empty with no error. Shopify/liquid issue #422 "Invalid filters are ignored without warning": parsing `{{ e | hippoasdfds }}` and rendering produces `""` with no error raised; maintainer trishume: "Unknown filters are defined in the tests as doing nothing, but I'll look into erroring in strict mode." Shopify has since shipped a stricter parser (https://shopify.dev/docs/storefronts/themes/tools/strict-liquid-migration) and Theme Check's `UnknownFilter` check (severity error) as linting, but runtime lax behavior ignores unknown filters.

Missing/empty value: `nil` is "An undefined value. Tags or outputs that return `nil` don't print anything to the page. They are also treated as `false`." (https://shopify.dev/docs/api/liquid/basics). Empty strings are truthy; `empty` is a separate concept.

### Go `text/template` + sprig (Oh My Posh's engine)

Oh My Posh (https://ohmyposh.dev/docs/configuration/templates): "Under the hood, this uses go's text/template feature extended with sprig ... Oh My Posh has all sprig functions included."

Pipelines (https://pkg.go.dev/text/template):

> "A pipeline may be 'chained' by separating a sequence of commands with pipeline characters '|'. In a chained pipeline, the result of each command is passed as the last argument of the following command."

Note the inversion versus Jinja/Liquid: in Go templates the function name comes **first**, value last (`{{ .Name | upper }}` means `upper(.Name)`), because the piped value becomes the *last argument*. Function results may carry an error value; a non-nil error "terminates [execution] and the error is returned to the caller of Execute."

Unknown function: **parse-time error.** Doc: "Any function used in the template must be added before the template is parsed." Function checking happens during parse (golang/go#38627 requests a `SkipFuncCheck` mode to disable it). The exact error string `function "x" not defined` was not captured from a run (no Go toolchain installed) — **[GAP: exact Go error text unverified, behavior class — parse-time error — is documented]**.

Missing value: by default a missing map key prints `<no value>` (`missingkey=default|invalid`; `missingkey=zero` yields the zero value, `missingkey=error` aborts execution).

Case-changing functions: **none built in** (builtins are and/call/html/index/slice/js/len/not/or/print/printf/println/urlquery plus eq/ne/lt/le/gt/ge). sprig (docs/strings.md, master) provides:

- `upper` — "Converts the entire string to uppercase." `"hello"` → `HELLO`
- `lower` — "Converts the entire string to lowercase."
- `title` — "Converts a string to title case." `"hello world"` → `Hello World`
- `untitle` — removes title casing
- `snakecase` / `camelcase` / `kebabcase` — word-boundary case conversions
- `swapcase` — word-based case swap
- `initials` — first letter of each word

**No `capitalize` in sprig** (checked the full strings.md). Nothing in the Jinja/Liquid "first upper, rest lower" sense exists in the Go/sprig world.

### tmux format modifiers — `#{modifier:name}`

Syntax (tmux(1), FORMATS, https://man7.org/linux/man-pages/man1/tmux.1.html): modifiers are **prefixes** inside the braces, not pipes after the name. Multiple modifiers combine with semicolons: `#{T;=10:status-left}`.

- `=N:` length limit — "Positive numbers count from the start of the string and negative from the end, so '#{=5:pane_title}' will include at most the first five characters ... A suffix or prefix may be given as a second argument - ... '#{=/5/...:pane_title}' will append '...' if the pane title is more than five characters."
- `s/foo/bar/:` — "will substitute 'foo' with 'bar' throughout. The first argument may be an extended regular expression and a final argument may be 'i' to ignore case ... A different delimiter character may also be used, to avoid collisions with literal slashes in the pattern. For example, 's|foo/|bar/|' ..."
- `l:` — "specifies that a string should be interpreted literally and not expanded."
- `pN:` pad to width (positive pads left, negative right); `n:` expands to the value's length; `w:` to its display width.
- `b:` / `d:` basename/dirname; `q:` shell-escape (with `h`, `a`, `s` flag variants); `t:` time conversion (flags `p`, `r`, `d`, `f`); `e:` arithmetic; `a:` ASCII; `c:` colour→hex/SGR; `m:` match (glob/regex/fuzzy); `C:` search pane content; `==`,`!=`,`<`,`>`,`<=`,`>=`,`||`,`&&`,`!`,`!!` comparisons/booleans; `E:`/`T:` double expansion; `S:`,`W:`,`P:`,`L:` loops.

**Case-changing modifiers: none.** The man page documents no upper/lower/capitalize format modifier. Case-changing in tmux formats is only reachable via the regex substitution `s/.../.../` (with no case-conversion escapes documented) — effectively tmux has no case modifier.

Unknown variable name: the man page does not state it; the tmux wiki (https://github.com/tmux/tmux/wiki/Formats) does: **"an unknown or missing variable is replaced with nothing."**

### Starship — no value modifiers at all

Format grammar (https://starship.rs/config/): "A variable contains a `$` symbol followed by the name of the variable." The grammar has texts, variables, text groups `[...](style)`, and conditional groups `(...)`. **There is no filter/pipe/case-modification syntax** — the only value transformations are per-module options (`truncation_length`, `version_format`, `directory.substitutions`), not format-string modifiers. Empty-value handling is structural: "A conditional format string wrapped in `(` and `)` will not render if all variables inside are empty." Unknown variable or style name behavior is not documented — **[GAP]**.

### Summary table (case-changing & edge behavior)

| Tool | Syntax | Case modifiers | `capitalize` lowercases rest? | Unknown modifier | Missing/empty value |
|---|---|---|---|---|---|
| Jinja2 | `{{ v\|capitalize }}`, chain `\|` | upper, lower, capitalize, title | **Yes** | Compile-time `TemplateAssertionError: No filter named 'x'` | Default Undefined prints `''`; filters like upper on it yield `''` |
| Liquid | `{{ v \| upcase }}`, chain `\|` | upcase, downcase, capitalize | **Yes** | Silently ignored (output empty), no error (lax mode) | `nil` prints nothing |
| Go+sprig | `{{ .V \| upper }}` (value is last arg) | upper, lower, title, untitle, snakecase, camelcase, kebabcase, swapcase; **no capitalize** | n/a | Parse-time "function not defined" error | `<no value>` by default |
| tmux | `#{mod:name}` prefix, `;`-chained | none | n/a | Replaced with nothing (wiki) | Same — nothing |
| Starship | `$var` | none | n/a | [GAP] | `(...)` group hides when all vars empty |

---

## 2. Prior art for styling inside a format string

### tmux — `#[...]` state switches

"embedded styles may be specified in format options, such as status-left, by enclosing them in '#[' and ']'." A style is "the single term 'default'" or a space/comma-separated list of `fg=colour`, `bg=colour`, `us=colour`, and attributes: `bright` (or `bold`), `dim`, `underscore`, `blink`, `reverse`, `hidden`, `italics`, `overline`, `strikethrough`, `double-underscore`, `curly-underscore`, `dotted-underscore`, `dashed-underscore`, plus `none` ("Set no attributes (turn off any active attributes).").

Key properties: `#[...]` does **not** wrap a range — it sets terminal state from that point on, like raw SGR. There is no nesting and no scoped close; you turn attributes off explicitly with the `no` prefix ("Any of the attributes may be prefixed with 'no' to unset", e.g. `nodim`) or `none`, or return to the ambient style with `default`. `push-default`/`pop-default`/`set-default` manage what `default` means. This is the "stateful, close-by-reset" model.

### Starship — `[text](style)` scoped groups

Style attaches to a delimited range: "A text group ... first part, enclosed in a `[]`, is a format string ... second part, enclosed in a `()`, is a style string." Example: `'[on](red bold)'`. **Nesting is lexical and scoped**: `'[a [b](red) c](green)'` prints `b` red and `a`, `c` green — the inner group overrides within its range, the outer resumes after; there is no explicit close token because the brackets scope the style. Style strings are space-separated words like `'bold fg:27'`, `'underline bg:#bf5700'`; `''` "explicitly disables all styling".

### Oh My Posh — two mechanisms

1. **Color anchors** (https://ohmyposh.dev/docs/configuration/colors): `<foreground,background>text</>`, closed by the explicit `</>` end tag: "Anything between the color start `<#FF479C>` and end `</>` will be colored accordingly." Foreground-only `<#FF479C>text</>`, background-only `<,#FFFFFF>text</>`, 16 named ANSI colors (`black` … `white`, `default`, plus `darkGray`, `lightRed` …), `transparent`, and inheritance keywords `parentForeground`/`parentBackground`/`foreground`/`background`. Nesting of anchors is not documented — **[GAP]**.
2. **Text-decoration tags** (templates doc): `<b>bold</b>`, `<u>underline</u>`, `<o>overline</o>`, `<i>italic</i>`, `<s>strikethrough</s>`, `<d>dimmed</d>`, `<f>blink</f>`, `<r>reversed</r>` — HTML-like paired tags with explicit per-attribute closes. "This can be used in templates and icons/text inside your config."

### Jinja2 / Liquid / Go templates

No styling concept at all — filters mutate text only. Styling in those ecosystems is layered on separately (e.g., a CLI library wraps the rendered output), which is exactly pi-jefferson's current architecture and the reason the attribute-as-modifier design is novel relative to template engines: the closest analogs are tmux's stateful `#[...]`, Starship's scoped `[text](style)`, and Oh My Posh's paired `<b>…</b>` tags.

---

## 3. ECMAScript / Node string case behavior (Node v26.8.1)

All verified empirically on the installed `v26.8.1` (default locale `en-US`):

- `toUpperCase` / `toLowerCase` are **locale-insensitive** (Unicode default case mapping, per ECMA-262). `'i'.toUpperCase()` → `'I'` regardless of locale.
- `toLocaleUpperCase(locales?)` / `toLocaleLowerCase(locales?)` are **locale-sensitive**: `'i'.toLocaleUpperCase('tr')` → `'İ'`; `'I'.toLocaleLowerCase('tr')` → `'ı'`. Called with **no argument they use the host default locale** — here en-US, where `'i'.toLocaleUpperCase() === 'i'.toUpperCase()`. On a machine whose default ICU locale is Turkish/Azeri, no-arg `toLocaleUpperCase()` would produce `'İ'`. So `toUpperCase` is the deterministic choice; its "default locale" is none (locale-insensitive).
- Unicode special casing expands length: `'ß'.toUpperCase()` → `'SS'`; `'straße'.toUpperCase()` → `'STRASSE'`; `'ﬁ'.toUpperCase()` → `'FI'`; `'İ'.toLowerCase()` → `'i̇'` (i + combining dot above, 2 code units).
- First user-perceived character: `charAt(0)` / code-unit slicing **breaks on astral characters** — `'👨‍👩‍👧‍👦high'.charAt(0)` returns a lone surrogate `'\uD83D'`. `Intl.Segmenter` with `granularity: 'grapheme'` correctly segments the ZWJ emoji family as one grapheme. Verified recipe (works for ZWJ emoji, combining marks, and decomposed accents — `cap('élan')` → `'Élan'` for both composed and decomposed input):

```js
const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const cap = s => {
  const first = seg.segment(s)[Symbol.iterator]().next();
  if (first.done) return s;
  const g = first.value.segment;
  return g.toUpperCase() + s.slice(g.length);
};
cap('high')  // 'High'
cap('👋hi')   // '👋hi' (emoji unchanged, rest intact)
cap('')      // ''
```

Caveat for a "capitalize" modifier: this recipe uppercases the first grapheme and **leaves the rest untouched** (`'hELLO'` → `'HELLO'`). Jinja/Liquid `capitalize` semantics (lowercase the remainder) would need `g.toUpperCase() + s.slice(g.length).toLowerCase()`. Which semantics pi-jefferson adopts is Michael's call; the platform facts are here.

---

## 4. pi's thinking levels (installed pi-coding-agent 1.5.0)

Extension-facing type — `pi-agent-core/dist/types.d.ts:300`:

```ts
export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
```

All lowercase, and **`"max"` exists**. `"xhigh"` also exists. `"off"` is included in the extension-facing type. Sources:

- `ctx.thinkingLevel?: ThinkingLevel` — `dist/core/extensions/types.d.ts:253`; implemented in `dist/core/extensions/runner.js:650-653` as `runner.runtime.getThinkingLevel()`.
- `pi.getThinkingLevel(): ThinkingLevel` — `types.d.ts:1323`.
- `thinking_level_select` event — `types.d.ts:911-915`: `{ type: "thinking_level_select"; level: ThinkingLevel; previousLevel: ThinkingLevel }`, emitted in `dist/core/agent-session.js:2146-2149` only when the effective level actually changes.

Defaults and ordering — `dist/core/defaults.js`:

```js
export const DEFAULT_THINKING_LEVEL = "medium";
export const THINKING_LEVEL_OPTIONS = ["off","minimal","low","medium","high","xhigh","max"];
```

Note a schema discrepancy: `pi-ai/dist/providers/model-schema.d.ts` defines `ThinkingLevelSchema` as only `"minimal" | "low" | "medium" | "high" | "xhigh" | "max"` (**no `"off"`** — `THINKING_LEVELS = ["minimal","low","medium","high","xhigh","max"]`, `MODEL_THINKING_LEVELS = ["off", ...THINKING_LEVELS]`), while pi-agent-core's `ThinkingLevel` (what extensions see) includes `"off"`.

Model with no reasoning support — `pi-ai/dist/models.js`:

```js
export function getSupportedThinkingLevels(model) {
    if (!model.reasoning)
        return ["off"];
    return EXTENDED_THINKING_LEVELS.filter((level) => {
        const mapped = model.thinkingLevelMap?.[level];
        if (mapped === null) return false;
        if (level === "xhigh" || level === "max")
            return mapped !== undefined;   // xhigh/max only when explicitly mapped
        return true;
    });
}
```

and `dist/core/agent-session.js`: `getAvailableThinkingLevels()` returns `getSupportedThinkingLevels(this.model)` (or all seven when no model is selected); `setThinkingLevel` clamps — `_clampThinkingLevel(level)` → `clampThinkingLevel(this.model, level)` (pi-ai), which walks `EXTENDED_THINKING_LEVELS` up then down to the nearest supported level, falling back to `availableLevels[0] ?? "off"`. So on a non-reasoning model the reported level becomes **`"off"`**, and `cycleThinkingLevel()` returns `undefined` (`supportsThinking()` is false). On reasoning models, `xhigh` and `max` are only available when the model's `thinkingLevelMap` explicitly maps them (a `null` mapping disables that level).

**Consequence for the motivating case:** the value a `$level`-style variable receives is always one of the seven lowercase strings; capitalizing `"high"` → `"High"` is a pure presentation mutation, and the full set a modifier must survive is `off, minimal, low, medium, high, xhigh, max`.

---

## 5. pi's `Theme.style(text, ThemeStyle)` and attribute helpers (pi-coding-agent 1.5.0 + pi-tui 1.5.0 + chalk 6.0.0)

Extensions get the theme via `ctx.ui.theme` (`types.d.ts:197-198`) and in footer factories (`setFooter(factory: (tui, theme, footerData) => ...)`).

`ThemeStyle` (`dist/modes/interactive/theme/theme.d.ts:14-16`) extends pi-tui's `TextAttributes`:

```ts
export interface TextAttributes {
    bold?: boolean; dim?: boolean; italic?: boolean;
    underline?: boolean; inverse?: boolean; strikethrough?: boolean;
}
export interface ThemeStyle extends TextAttributes { fg?: ...; bg?: ... }
```

### Escape sequences

`Theme.style` delegates to pi-tui's `styleTextWithAnsi` (`pi-tui/dist/colors.js:237-272`), which concatenates `prefix + text + suffix` — verified empirically:

- `style('x', {bold:true})` → `\x1b[1mx\x1b[22m`
- `style('x', {dim:true})` → `\x1b[2mx\x1b[22m` — **SGR 22 closes both bold and dim**; a single `\x1b[22m` is emitted when either or both are set
- all six at once → opens `\x1b[1m\x1b[2m\x\x1b[3m\x1b[4m\x1b[7m\x1b[9m`, closes **in reverse order** `\x1b[29m\x1b[27m\x1b[24m\x1b[23m\x1b[22m` (italic 3→23, underline 4→24, inverse 7→27, strikethrough 9→29)

The attribute helpers `Theme.bold/italic/underline/inverse/strikethrough` (`theme.js:218-232`) delegate to **chalk** — and there is **no `Theme.dim()` helper**; dim is reachable only through `style(text, {dim:true})` or dim theme tokens. chalk 6.0.0 (installed `ansi-styles`): `bold: [1, 22]`, `dim: [2, 22]` ("21 isn't widely supported and 22 does the same thing"), `italic: [3, 23]`, `underline: [4, 24]`, `inverse: [7, 27]`, `strikethrough: [9, 29]`. **Caveat:** chalk disables styling entirely when its detected color level is 0 (`chalk.level`; level 0 was observed in a non-TTY spawn — in pi's TTY it is normally ≥1).

### Nesting behavior — the two implementations differ, and this matters for chained modifiers

**chalk re-opens.** `chalk/source/index.js:213-221`: if the wrapped string already contains `\x1b`, every occurrence of the outer style's close code is replaced with the close followed by the outer open code ("otherwise only the part of the string until said closing code will be colored"). Verified (level 1):

- `bold(underline(x))` → `\x1b[1m\x1b[4mx\x1b[24m\x1b[22m` — clean nesting
- `bold(dim(x))` → `\x1b[1m\x1b[2mx\x1b[22m\x1b[1m\x1b[22m` — the inner `\x1b[22m` closes **both** dim and the outer bold, and chalk compensates by re-emitting `\x1b[1m` after it
- `bold(bold(x))` → `\x1b[1m\x1b[1mx\x1b[22m\x1b[1m\x1b[22m` — duplicated codes, visually correct

**`styleTextWithAnsi` does not re-open.** It is pure string concatenation; nothing compensates for close codes embedded in `text`. Verified:

- `style(style('x', {bold:true}), {dim:true})` → `\x1b[2m\x1b[1mx\x1b[22m\x1b[22m` — happens to render correctly (both attributes active until the shared `\x1b[22m`)
- `style('a' + style('b', {bold:true}) + 'c', {dim:true})` → `\x1b[2ma\x1b[1mb\x1b[22mc\x1b[22m` — **"c" loses dim**: the inner `\x1b[22m` kills the outer dim mid-string and nothing re-opens it
- `style('a' + style('b', {bold:true}) + 'c', {italic:true})` → `\x1b[3ma\x1b[1mb\x1b[22mc\x1b[23m` — fine, because `\x1b[22m` doesn't affect italic

So: wrapping text that already carries bold/dim sequences in another **bold or dim** style via `Theme.style` truncates the outer attribute at the inner close; non-22 attributes (italic/underline/inverse/strikethrough) nest safely. Two attributes applied one-after-another to the same text via `style()` compose correctly only when the earlier-applied attribute is not bold/dim, or when the whole run is one contiguous segment. Since bold and dim share SGR 22, **chained `|bold`/`|dim` modifiers wrapping already-styled values are the hazard case**; applying each modifier as an outer wrap in sequence is safe only under the same condition.

`Theme.fg`/`bg` (`theme.js:202-211`) close with `\x1b[39m`/`\x1b[49m` (dim tokens: `\x1b[22;39m`) — no re-open either.

### `visibleWidth` and `truncateToWidth` (pi-tui/dist/utils.js)

- `visibleWidth(str)` strips ANSI/OSC/APC sequences before measuring and segments graphemes (`Intl.Segmenter`): `visibleWidth('\x1b[1mhigh\x1b[22m')` → `4`. SGR sequences are width-zero. Tabs normalize to 3 spaces; results are cached.
- `truncateToWidth(text, maxWidth, ellipsis = "...", pad = false)` counts only visible width, keeps ANSI codes that precede surviving text, drops codes after the cut, and — critically — appends `\x1b[0m` resets around the ellipsis (`finalizeTruncatedResult`): `truncateToWidth('\x1b[1mhello world\x1b[22m', 8)` → `\x1b[1mhello\x1b[0m...\x1b[0m`. So truncation does not leak styles into the rest of the line even though the original close codes are discarded. If the text fits, it is returned unchanged (no reset added).

---

## Gaps and unverified items

1. Exact Go `text/template` unknown-function error text (behavior class — parse-time error — is documented; no Go toolchain available to capture the string).
2. Starship's behavior for an unknown variable name or unknown style string in a format — not stated in the docs.
3. Whether Oh My Posh color anchors nest.
4. Liquid's unknown-filter behavior was verified for the reference Ruby implementation via issue #422; Shopify's newer "strictest parser" changes error modes — the boundary between parser modes was not fully mapped.
5. Jinja2 3.1.6 behavior was verified in a scratch venv, not against the specific version pi-jefferson users would have (Jinja is cited as prior art only).
6. All pi-jefferson repo questions (how the current format string is parsed, how cells call `Theme.style`, where modifiers would hook in) are Eleanor's, per the brief.

## Sources

1. Jinja2 template designer docs — https://jinja.palletsprojects.com/en/stable/templates/ (+ empirical run, Jinja 3.1.6)
2. Shopify Liquid reference & filter docs — https://shopify.dev/docs/api/liquid , /filters/capitalize , /filters/upcase , /basics
3. Shopify/liquid issue #422, "Invalid filters are ignored without warning" — https://github.com/Shopify/liquid/issues/422 ; strict parser migration — https://shopify.dev/docs/storefronts/themes/tools/strict-liquid-migration
4. Go text/template docs — https://pkg.go.dev/text/template ; golang/go#38627
5. sprig docs — https://github.com/Masterminds/sprig/blob/master/docs/strings.md (raw, master)
6. Oh My Posh — https://ohmyposh.dev/docs/configuration/templates , /docs/configuration/colors
7. tmux(1) — https://man7.org/linux/man-pages/man1/tmux.1.html ; tmux wiki Formats — https://github.com/tmux/tmux/wiki/Formats
8. Starship configuration docs — https://starship.rs/config/
9. Empirical Node v26.8.1 runs (`toUpperCase`, `Intl.Segmenter`, chalk 6.0.0, pi-tui `styleTextWithAnsi`/`visibleWidth`/`truncateToWidth`)
10. Installed pi sources: `@earendil-works/pi-coding-agent@1.5.0` (`dist/core/extensions/types.d.ts`, `dist/core/extensions/runner.js`, `dist/core/agent-session.js`, `dist/core/defaults.js`, `dist/modes/interactive/theme/theme.{d.ts,js}`), `@earendil-works/pi-agent-core@1.5.0/dist/types.d.ts`, `@earendil-works/pi-ai@1.5.0` (`dist/providers/model-schema.{d.ts,js}`, `dist/models.js`), `@earendil-works/pi-tui@1.5.0` (`dist/colors.{d.ts,js}`, `dist/utils.{d.ts,js}`), `chalk@6.0.0` (`source/index.js`, `source/vendor/ansi-styles/index.js`)

---

# Addendum (Conductor ruling, 2026-11-06): "pick the community defacto" string-mutation library

Ruling quoted from `owner-rulings.md`: *"please don't come up with our own string mutation methods. There's plenty of libraries out there that do that. pick the community defacto"*. All npm data below was pulled live from the npm registry, the npm download-count API, npmjs.com (via search excerpts), and deps.dev on 2026-11-06; function semantics were **verified empirically** by installing the packages (Node v26.8.1, /tmp/vm/casetest).

## 6. The community de facto for string case/shape mutation

### The numbers

| Package | Weekly downloads | Dependents (npmjs.com) | Latest release | License | Deps | Module format | TS types | Unpacked size |
|---|---|---|---|---|---|---|---|---|
| **lodash** | **204,156,128** | **197,470** | 4.18.1, 2026-04-01 | MIT | 0 | CJS only (`lodash-es`: ESM, 70.2M/wk, 17,750 dependents) | via `@types/lodash` | 1.41 MB |
| lodash.capitalize (per-method) | 5,145,620 | — | 4.2.1, **2016-08-13** | MIT | 0 | CJS | via `@types/lodash.capitalize` | ~24 KB on disk |
| **es-toolkit** | **81,475,466** | 1,871 | 1.53.2, **2026-11-06** (day of research) | MIT | 0 | dual CJS+ESM (`exports` map) | **bundled** | 4.36 MB |
| **change-case** | 46,433,646 | 4,748 (deps.dev: 6,062 incl. indirect) | 5.4.4, **2024-04-03** | MIT | 0 | **pure ESM** (`"type":"module"`) | bundled | 36 KB |
| underscore | 43,155,251 | 23,018 | 1.13.8, 2026-02-19 | MIT | 0 | dual UMD/ESM | none bundled | 908 KB |
| radash | 4,169,513 | 538 | 12.1.1, 2025-06-18 | MIT | 0 | dual CJS+ESM | bundled | 306 KB |
| case-anything | 3,084,622 | — | 3.1.7, 2026-09-30 | MIT | 0 | pure ESM | bundled (dist/index.d.ts) | 34 KB |
| voca | 394,843 | 230 | 1.4.1, 2023-05-17 | MIT | 0 | CJS main + ESM `module` | none bundled | 525 KB |

Maintenance notes: lodash resumed releases in 2026 (4.18.1, April 2026) after the long 4.17.21 plateau; es-toolkit is under very active development (release on the day of research); change-case's last release is 2.5 years old; the `lodash.capitalize` per-method package is frozen since 2016.

### Exact function semantics (verified empirically on the versions above)

Test inputs: `'hELLO wORLD'`, `'helloWorld'`, `'ßtraße'`, `'İSTANBUL'`, `'👋hi'`, `'123abc'`, `''`.

- **lodash `_.capitalize` / `lodash.capitalize`** — source is literally `upperFirst(toString(string).toLowerCase())`: **first character upper, remainder lowercased** (the Jinja/Liquid semantics). `'hELLO wORLD'` → `'Hello world'`. Unicode: built on `String.prototype.toLowerCase()` (locale-insensitive): `'ßtraße'` → `'SStraße'` (ß upcases to SS), `'İSTANBUL'` → `'İstanbul'` (İ lowercases to i + combining dot, then i uppercases — a visible artifact). First-grapheme, not first-letter: `'👋hi'` → `'👋hi'` (emoji is the first "character"; the h is untouched but lowercased anyway). Non-letters pass through (`'123abc'` → `'123abc'`); `''` → `''`; non-strings are stringified first (`toString`).
- **lodash `_.toUpper` / `_.toLower`** — whole-string, locale-insensitive Unicode casing: `'ßtraße'` → `'SSTRASSE'`. `_.upperFirst` uppercases only the first character and leaves the remainder **untouched** (`'hELLO wORLD'` → `'HELLO wORLD'`).
- **es-toolkit `capitalize`** — same contract as lodash (`'hELLO wORLD'` → `'Hello world'`), but `'İSTANBUL'` → `'İstanbul'` (differs from lodash's `'İstanbul'`). Also ships `upperFirst`, `lowerCase`, `upperCase`, plus camel/snake/kebab/pascal converters.
- **radash `capitalize`** — `charAt(0).toUpperCase() + slice(1).toLowerCase()`: same lodash semantics including the `'İstanbul'` artifact; `charAt(0)` slices code units.
- **voca `capitalize(str, restToLower=false)`** — the outlier: **defaults to leaving the remainder untouched** (`'hELLO wORLD'` → `'HELLO wORLD'`); opt-in `restToLower=true` gives the lodash semantics.
- **change-case v5 has NO `capitalize`, NO `upperCase`, NO `lowerCase`.** Its exports are word-splitting converters only: `camelCase, capitalCase, constantCase, dotCase, kebabCase, noCase, pascalCase, pascalSnakeCase, pathCase, sentenceCase, snakeCase, trainCase` (+ split helpers). `capitalCase('hELLO wORLD')` → `'H Ello W Orld'` — it re-tokenizes words, so it is the wrong shape for capitalizing one value. (v4's `upperCase`/`lowerCase`/`upperCaseFirst` were removed in v5.) `sentenceCase` exists but also re-tokenizes (`'helloWorld'` → `'Hello world'`).
- **case-anything** — no `capitalize`; has `upperCase`/`lowerCase` (whole-string) and word-based `capitalCase`.
- **underscore** — no string case functions at all.

### What the evidence says is "the community de facto"

**By adoption there is no close call: lodash.** 204M weekly downloads and ~197k dependents — 2.5× the downloads and 100× the dependents of the nearest case-capable rival; `_.capitalize` is the implementation every other library's `capitalize` copies (radash and es-toolkit match it exactly, including the rest-lowercasing). If "the community defacto" means one library, the data points at **lodash** (whole package, or the frozen-but-tiny `lodash.capitalize` per-method package at 5.1M/wk).

Two honest qualifications, because the ruling deserves them:

1. **If the qualifier is "modern, TS-native, ESM-first," the momentum is with es-toolkit** (81M/wk and climbing — it was 10M/wk in April 2026 per Toss's own post; release cadence is days, not years; bundled types; dual module format). This is the only axis on which the call is close: lodash wins installed base by an order of magnitude, es-toolkit wins trajectory.
2. **If the qualifier is "purpose-built for case mutation," the name-brand is change-case** (46M/wk) — but v5 empirically cannot express `$level|capitalize` at all (no `capitalize`/`upperCase`/`lowerCase` exports; `capitalCase` re-tokenizes words). It is the de facto for *identifier* case (camelCase ↔ snake_case), not for first-letter capitalization.

For the specific modifier set Joel named (capitalize/upper/lower on scalar values like `"high"`), lodash's `capitalize`/`toUpper`/`toLower` semantics are the ecosystem-consensus semantics: first-upper-rest-lower, locale-insensitive Unicode, non-letters untouched, empty string safe.

## 7. How pi installs and loads an extension package's runtime `dependencies` (`pi install npm:<pkg>`)

From `docs/packages.md` (installed pi-coding-agent 1.5.0):

> "Put runtime packages imported by extensions in `dependencies`. **Pi installs package dependencies when it installs an npm or git source.**"

Mechanics, from `dist/core/package-manager.js`:

- **Install root.** `getNpmInstallRoot(scope, temporary)` (line 1837): personal packages install into `~/.pi/agent/npm`, project packages (after project trust) into `<project>/.pi/npm`, and `-e` try-out packages into a temp npm dir (`~/.pi/agent/tmp/extensions/...` per docs). `ensureNpmProject` creates a throwaway `package.json` there and pi runs the real package manager: for npm, `install --prefix <installRoot> --legacy-peer-deps --no-audit --no-fund` (line 1608); pnpm uses `--config.auto-install-peers=false --config.strict-peer-dependencies=false`; bun `--omit=peer`. So **runtime `dependencies` are installed normally by npm/pnpm/Bun into the install root's `node_modules`** — the package lands at `<installRoot>/node_modules/<name>` (line 1884: `join(this.agentDir, "npm", "node_modules", source.name)`), its deps beside it.
- **Loading.** Extensions load through **jiti** (`dist/core/extensions/loader.js:481-485`: `jiti.import(extensionPath, { default: true })`). Since the extension file physically lives under `<installRoot>/node_modules/<name>/...`, Node's ordinary upward `node_modules` resolution finds anything in the package's installed dependency tree. **An extension file importing a declared dependency resolves it.** The loader additionally aliases/maps the host-provided packages (`getAliases()` / virtual modules) so `@earendil-works/pi-*` and `typebox` resolve to pi's own copies, not to physical ones.
- **`dependencies` vs `peerDependencies`.** Docs: host-provided packages — `@earendil-works/pi-ai`, `pi-agent-core`, `pi-coding-agent`, `pi-tui`, `typebox` — "Declare ... in `peerDependencies` with a `"*"` range and do not bundle them. **Pi suppresses automatic peer installation** for managed npm packages and git packages" (that is what `--legacy-peer-deps` / `--omit=peer` / `auto-install-peers=false` enforce in source). Listing a host package in `dependencies` is explicitly warned against: "A physical copy can bypass Pi's extension module mapping in compiled ESM and create duplicate classes, registries, and initialization work. Pi reports an extension warning when it detects this manifest configuration." Everything else (e.g. lodash) belongs in `dependencies`.
- **`bundledDependencies`.** The word appears nowhere in `docs/packages.md`; the docs only say not to bundle the host-provided packages. For third-party deps, bundling is neither required nor mentioned — the normal mechanism is `dependencies` installed by pi. One related doc sentence: "Other Pi packages used as dependencies must be included in the published tarball and referenced through their `node_modules` resource paths" (about depending on *other pi packages*, not ordinary npm deps).
- **Isolation caveat (docs):** "Installed packages load with separate module roots. Do not rely on two packages sharing one dependency instance or one package resolving another package's undeclared dependency." Local-path packages are "not installed or modified, so their dependency tree remains the package author's responsibility."

**Consequence for the ruling:** a `dependencies` entry (e.g. lodash or es-toolkit) in pi-jefferson's `package.json` is installed by `pi install npm:...` and resolvable from extension files — no vendoring needed. It must not, however, be one of the five host-provided packages.

## Addendum gaps

- Dependents counts for `lodash.capitalize` and `case-anything` were not obtainable from a reliable public source (npmjs.com blocks direct fetch; npms.io data for newer packages is stale — its es-toolkit snapshot is from 2022). Downloads data is complete and current for all eight.
- Install sizes use registry `unpackedSize` (lodash.capitalize predates that field; ~24 KB measured on disk).
- Whether jiti's resolution of extension imports is exactly Node semantics in all three runtime modes (compiled binary vs bundled Node vs source) was verified from loader code comments, not by installing a test package.

---

# Addendum 2 (Conductor ruling, 2026-11-06): "capitalized should mean the first letter only. all-caps would be the modifier."

Ruling quoted from `owner-rulings.md`. For each candidate library: which exported function(s) change **only the first letter** (and what happens to the rest), which upper-case the **whole string**, which lower-case it — with the exact documented semantics quoted from each library's own docs/JSDoc, cross-checked empirically (installed versions from section 6, Node v26.8.1). Names are reported as the libraries call them; no modifier names are chosen here.

## First-letter-only functions (rest of string untouched) — the ruling's "capitalized" semantics

| Library | Function | Documented semantics (quoted) | Rest of string |
|---|---|---|---|
| lodash 4.18.1 | `_.upperFirst` | "Converts the first character of `string` to upper case." (JSDoc; example `_.upperFirst('FRED') // => 'FRED'`) | **untouched** — `_.upperFirst('hELLO wORLD')` → `'HELLO wORLD'` |
| es-toolkit 1.53.2 | `upperFirst` | "Converts the first character of a string to uppercase." — "Use `upperFirst` when you want to **capitalize only the first letter of a string while keeping the rest of the letters unchanged**." (es-toolkit.dev) | untouched — verified `'hELLO wORLD'` → `'HELLO wORLD'` |
| voca 1.4.1 | `v.capitalize(subject, restToLower=false)` | "Converts the first character of `subject` to upper case. **If `restToLower` is `true`, convert the rest of `subject` to lower case.**" (vocajs.pages.dev) | **untouched by default** — `v.capitalize('hELLO wORLD')` → `'HELLO wORLD'`; opt-in `restToLower=true` → `'Hello world'` |
| change-case 5.4.4 | — none — | (no such export; `sentenceCase` re-tokenizes words) | n/a |
| case-anything 3.1.7 | — none — | (no such export) | n/a |
| radash 12.1.1 | — none — | (its only first-letter function lowercases the rest; see below) | n/a |
| underscore 1.13.8 | — none — | (no string case functions) | n/a |

Note: lodash also has `_.lowerFirst` (first character to lower case, rest untouched). es-toolkit likewise ships `lowerFirst`.

## Functions literally named `capitalize` — most DIFFER from first-letter-only

| Library | `capitalize` | Documented semantics (quoted) | Matches "first letter only"? |
|---|---|---|---|
| lodash 4.18.1 | `_.capitalize` | "Converts the first character of `string` to upper case **and the remaining to lower case**." (JSDoc, unpkg 4.18.1) | **No** — `'hELLO wORLD'` → `'Hello world'` |
| lodash.capitalize 4.2.1 | default export | Same implementation (`upperFirst(toString(string).toLowerCase())`) | **No** |
| es-toolkit 1.53.2 | `capitalize` | "Converts the first character of a string to uppercase **and the remaining characters to lowercase**." — "make only the first letter uppercase and convert the rest to lowercase" (es-toolkit.dev) | **No** — verified identical to lodash on the test matrix |
| radash 12.1.1 | `capitalize` | "Capitalize the first word of the string" (d.ts JSDoc; example `capitalize('va va voom') -> 'Va va voom'`) | **No** — the doc example hides it, but the implementation lowercases the remainder: verified `'hELLO wORLD'` → `'Hello world'` |
| voca 1.4.1 | `v.capitalize` | (quoted above) | **Yes, by default** — the only candidate whose `capitalize` is first-letter-only out of the box |
| change-case / case-anything / underscore | — | no `capitalize` export | n/a |

## Whole-string upper-case functions — the ruling's "all-caps" semantics

| Library | Function | Documented semantics (quoted) | Verified behavior |
|---|---|---|---|
| lodash | `_.toUpper` | "Converts `string`, as a whole, to upper case just like [String#toUpperCase](https://mdn.io/toUpperCase)." | `'hELLO wORLD'` → `'HELLO WORLD'`; `'foo_bar'` → `'FOO_BAR'` (no re-tokenizing) |
| lodash | `_.upperCase` | "Converts `string`, **as space separated words**, to upper case." (`_.upperCase('fooBar') // => 'FOO BAR'`) | word-splitting — `'hELLO wORLD'` → `'H ELLO W ORLD'` |
| es-toolkit | `upperCase` | word-splitting (lodash-compatible); **no whole-string `toUpper` exists in es-toolkit** | `'hELLO wORLD'` → `'H ELLO W ORLD'` |
| voca | `v.upperCase` | "Converts the `subject` to upper case." (`v.upperCase('school') // => 'SCHOOL'`) | whole string — `'helloWorld'` → `'HELLOWORLD'` |
| case-anything | `upperCase` | word-splitting converter | `'helloWorld'` → `'HELLO WORLD'` |
| change-case | — none — (v5 removed it) | — | calling it throws `fn is not a function` |
| radash | — none for strings — | `upperize`: "Convert all keys in an **object** to upper case" (d.ts) — it operates on object keys, not string values | passing a string iterates it as an object |
| underscore | — none — | | |

## Whole-string lower-case functions

| Library | Function | Documented semantics (quoted) | Verified behavior |
|---|---|---|---|
| lodash | `_.toLower` | "Converts `string`, as a whole, to lower case just like String#toLowerCase." | whole string, no re-tokenizing |
| lodash | `_.lowerCase` | word-splitting analog of `upperCase` | `'foo_bar'` → `'foo bar'` |
| es-toolkit | `lowerCase` | word-splitting | `'hELLO wORLD'` → `'h ello w orld'` |
| voca | `v.lowerCase` | "Converts the `subject` to lower case." | whole string — `'helloWorld'` → `'helloworld'` |
| case-anything | `lowerCase` | word-splitting | `'helloWorld'` → `'hello world'` |
| change-case / underscore | — none — | | |
| radash | — none for strings — | `lowerize` lowercases object **keys** | |

## What this means for the ruling (evidence, not a choice)

- Under Joel's semantics, the ecosystem's name for "first letter only" is **`upperFirst`** (lodash, es-toolkit) — except **voca, whose `capitalize` already means exactly that by default**. Every other `capitalize` in the field (lodash, lodash.capitalize, es-toolkit, radash) lowercases the remainder and would violate the ruling if adopted under the name `capitalize`.
- Whole-string all-caps without word re-tokenizing exists as lodash `toUpper` and voca `upperCase`. In lodash, es-toolkit, and case-anything, the function named `upperCase` is a **word-splitting** converter (`'fooBar'` → `'FOO BAR'`), not an all-caps filter — a naming trap if modifier names are lifted from those libraries.
- Per-library coverage of the ruling's trio: **lodash** covers all three (`upperFirst` / `toUpper` / `toLower`); **es-toolkit** covers first-letter (`upperFirst`) but only word-splitting `upperCase`/`lowerCase`; **voca** covers all three (`capitalize` / `upperCase` / `lowerCase`) with whole-string semantics throughout; **radash, change-case, case-anything, underscore** each lack at least one leg.

---

# Addendum 3 (Conductor): installing and importing lodash and lodash-es

Measurement run 2026-11-06 in `/tmp/vm/depcheck` (throwaway ESM package, `"type": "module"`, `lodash@4.18.1` + `lodash-es@4.18.1` installed). The repository was not modified. Report of what happened, not a recommendation.

Test files (extension-shaped `.ts` modules):

```ts
// a-es-named.ts
import { upperFirst, toUpper, toLower } from "lodash-es";
export const out = [upperFirst("hELLO wORLD"), toUpper("high"), toLower("HIGH")];
export default out;
// a-cjs-named.ts — same but from "lodash"
// a-cjs-default.ts — import _ from "lodash"; [_.upperFirst(...), _.toUpper(...), _.toLower(...)]
```

## (A) Through pi's jiti (the way pi loads an extension)

pi's `dist/core/extensions/loader.js` uses `createJiti` from its bundled **jiti 2.7.0** (`jiti-loader.js` re-exports it) with options `{ moduleCache: false, ...resolutionOptions }`; on this installed copy (normal Node runtime, `usesEmbeddedModules === false`, not a TS-source runtime) `resolutionOptions` is `{ alias: getAliases() }`, and the aliases map only `@earendil-works/*`, `@mariozechner/*`, and `typebox` — nothing that affects third-party resolution, so a bare `{ moduleCache: false }` jiti is faithful here. Harness:

```js
const require = createRequire(".../pi-coding-agent/dist/core/extensions/loader.js");
const { createJiti } = require("jiti");
const jiti = createJiti(import.meta.url, { moduleCache: false });
await jiti.import(file, { default: true });   // same call shape as loader.js:485
```

Output — **all three forms work under pi's loader**:

```
JITI OK   ./a-es-named.ts    ["HELLO wORLD","HIGH","high"]
JITI OK   ./a-cjs-named.ts   ["HELLO wORLD","HIGH","high"]
JITI OK   ./a-cjs-default.ts ["HELLO wORLD","HIGH","high"]
```

(`upperFirst("hELLO wORLD")` → `"HELLO wORLD"` — first letter only, rest untouched, per Addendum 2.)

## (B) Under Node's own type stripping (`node file.ts`, Node v26.8.1 — how pi-jefferson's `node --test` runs)

```
--- node a-es-named.ts
NODE OK    ["HELLO wORLD","HIGH","high"]
--- node a-cjs-named.ts
NODE FAIL  SyntaxError: Named export 'toLower' not found. The requested module
           'lodash' is a CommonJS module, which may not support all module.exports
           as named exports.
--- node a-cjs-default.ts
NODE OK    ["HELLO wORLD","HIGH","high"]
```

- `lodash-es` named imports: **work**.
- `lodash` (CJS) named imports: **fail** — Node's cjs-module-lexer cannot statically detect lodash's dynamically assembled `module.exports`.
- `lodash` default import (`import _ from "lodash"`): **works**.

So the same source file behaves differently under pi (jiti: everything works) and under `node --test` (named CJS imports throw). **Caveat measured next: `tsc` does not catch this.**

## (C) `@types` packages and `tsc --noEmit` with the repo's tsconfig

Registry facts (2026-11-06): `@types/lodash@4.17.27` (released 2026-10-21, no deps, `types: index.d.ts`); `@types/lodash-es@4.17.12` (released 2023-11-21, depends on `@types/lodash: "*"`). Both lodash and lodash-es ship **no** bundled types and **no** lifecycle build scripts (registry `scripts: ["test"]` only).

Repo tsconfig (from `/Users/joelleibow/Projects/pi-jefferson/tsconfig.json`, matching Eleanor §8's `typecheck: "tsc --noEmit"`, typescript `^7.0.2`): `"module": "nodenext"`, `"moduleResolution": "nodenext"`, `strict`, `verbatimModuleSyntax`, `noEmit`. Reproduced verbatim in the scratch dir with `typescript@7.0.2` + `@types/node@^26.6.6`.

Without the `@types` packages — all three forms rejected (TS7016):

```
a-cjs-default.ts(1,15): error TS7016: Could not find a declaration file for module 'lodash'. ... implicitly has an 'any' type.
a-cjs-named.ts(1,46):   error TS7016: Could not find a declaration file for module 'lodash'. ...
a-es-named.ts(1,46):    error TS7016: Could not find a declaration file for module 'lodash-es'. ...
```

With `@types/lodash@4.17.27` + `@types/lodash-es@4.17.12` installed — **`tsc --noEmit` exits 0 with no output: all three import forms accepted**, including `import { upperFirst } from "lodash"`. That is a type-level acceptance of a form that **fails at runtime** under Node native ESM (see B): the type checker models CJS named imports via the `export =` declaration, but Node's loader cannot detect them in lodash. Under the repo's own scripts, `pnpm typecheck` would pass a file that `pnpm test` (`node --test`) would crash on — unless the test file itself never imports lodash directly and only exercises code paths loaded through pi's jiti.

## (D) pnpm posture for adding these packages (report facts + pnpm docs)

From Eleanor's §8 (repo facts): `packageManager: pnpm@12.17.0`; `pnpm-workspace.yaml` contains **only** `allowBuilds: {'@google/genai': false, protobufjs: false}` — deliberately denied build scripts of two transitive dev dependencies, with a "Do not delete" comment (pnpm 11+ fails installs with `ERR_PNPM_IGNORED_BUILDS` on undecided build scripts); **no** `onlyBuiltDependencies`, **no** `minimumReleaseAge`, no other supply-chain settings; `pnpm-lock.yaml` committed (lockfileVersion 9.0); CI installs with `pnpm install --frozen-lockfile`; `files: ["extensions","README.md","LICENSE"]` governs the tarball; publishing is CI-only OIDC trusted publishing.

From pnpm docs (pnpm.io/settings/build, /settings/dependency-resolution, /blog/releases/11.0, /errors):

- `allowBuilds` (v10.26+, replacing `onlyBuiltDependencies`/`ignoredBuiltDependencies` in v11) maps package matchers to explicit allow/deny for lifecycle scripts; under default `strictDepBuilds` an undecided build script fails the install. **Impact of adding lodash/lodash-es: none** — neither package has install/preinstall/postinstall scripts (registry metadata above), so no `allowBuilds` entry is needed and `ERR_PNPM_IGNORED_BUILDS` cannot be triggered by them.
- `minimumReleaseAge`: "defines the minimum number of minutes that must pass after a version is published before pnpm will install it. This defaults to `1440` (1 day)" and "applies to all dependencies, including transitive ones" (default since pnpm 10.16/11; the repo does not override it). **Impact: none in practice** — lodash/lodash-es 4.18.1 (2026-04-01), `@types/lodash` 4.17.27 (2026-10-21), `@types/lodash-es` 4.17.12 (2023-11-21) are all months to years old. It would only bite if the change pinned a version published within the last 24 hours.
- `blockExoticSubdeps` defaults to `true` since pnpm 11 — irrelevant here; these are plain registry packages with zero dependencies.
- Lockfile mechanics: adding the first runtime `dependencies` entry rewrites `package.json` and `pnpm-lock.yaml` together; because CI uses `--frozen-lockfile`, the lockfile update must land in the same change or CI fails (this is exactly Eleanor's open question 4). The dependency itself does not ship in the tarball (`files` list) — pi installs it consumer-side per Addendum 1/Q7.

### Addendum 3 gaps

- The jiti harness reproduced pi's options (`moduleCache: false`; aliases verified to cover only pi/typebox packages) but did not invoke pi's actual `loadExtensionModule` end-to-end.
- `@types/lodash-es@4.17.12` predates lodash-es 4.18.x; whether its declarations cover any 4.18.x API changes was not diffed (upperFirst/toUpper/toLower are covered).
- `typescript@7.0.2` behavior (native port) was used as the repo pins it; TS 5.x/6.x diagnostics could differ in wording.
