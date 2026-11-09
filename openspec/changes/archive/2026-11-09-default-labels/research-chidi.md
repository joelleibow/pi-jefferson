# Research Report

## Question and Scope

Three questions from the conductor's brief (`/tmp/dl/brief-chidi.md`), for the `default-labels` change:

1. What does pi's own built-in footer (`@earendil-works/pi-coding-agent` 1.5.0, the version Joel runs) render for model, provider, thinking level, cwd, context usage, token totals and cost? Report the exact text, any label or prefix, and file and line.
2. What are Starship's default symbols and formats for directory, the cloud modules, cmd_duration and the context-like modules, and what are pi-powerline-footer's defaults for model, thinking, path, context, tokens and cost? Each is reported as that tool's own term.
3. Is there a community convention for a statusline field label? A word with a colon, an icon, or a Nerd Font glyph?

Out of scope, per the brief: this repository's code (Eleanor's), recommending label texts, editing anything but this report. `~/.pi/agent/pi-jefferson.json` was read only. Vocabulary: other tools' terms ("module", "segment") appear only as those tools' terms. In pi-jefferson, a row holds cells and a cell holds an instrument.

## Sources / Files Examined

- **S1: pi footer.** `$(npm root -g)/@earendil-works/pi-coding-agent/dist/modes/interactive/components/footer.js` (package.json `version` is `1.5.0`). Line numbers below are from `cat -n` of that file.
- **S2: Starship config docs.** `https://raw.githubusercontent.com/starship/starship/master/docs/config/README.md`, the master branch fetched on the run date. Sections: AWS, Azure, Battery, Command Duration, Directory, Docker Context, Google Cloud, Git Branch, Hostname, Kubernetes, Memory Usage, Nix-shell, Status, Time. The Starship version was not pinned.
- **S3: Starship presets.** `docs/public/presets/toml/plain-text-symbols.toml` and `nerd-font-symbols.toml` on master. Also the presets page, https://starship.rs/presets/.
- **S4: pi-powerline-footer.** `https://github.com/nicobailon/pi-powerline-footer`, shallow clone at commit `eeacaa2`, package.json `0.22.0`. Files: `segments.ts`, `icons.ts`, README.md. Its own term is "segment".
- **S5: Joel's live config.** `~/.pi/agent/pi-jefferson.json`, read only. It sets emoji labels on path (📂), model (🧠), thinking (🤔) and context (🔋). Both `blank` cells and the `format` strings are as shown there.

## Findings

### Q1. pi 1.5.0 built-in footer (S1)

The footer is two lines, plus an optional third line of extension statuses (L251-261). Line 1 is the pwd line. Line 2 is the stats line, with a left side and a right side. **No datum carries a word label.** Prefixes exist only on token counts. All text is wrapped in `theme.fg("dim", …)` (L247-250) except context at over 70%, which is `warning` and `error` coloured (L176-181).

| Datum | Exact text rendered | Label or prefix | File:line |
|---|---|---|---|
| **cwd** | `~/rel/path` when inside `$HOME` (`~` alone for home), else the absolute cwd. Then optionally ` (<git branch>)`, then optionally ` • <session name>`. | None. A bare path. | L31-42 (`formatCwdForFooter`); L138-148 |
| **Input tokens** | `↑12k` | `↑` glued to the number, no space | L151-152 |
| **Output tokens** | `↓3.4k` | `↓` | L153-154 |
| **Cache read** | `R45k` | `R` | L155-156 |
| **Cache write** | `W2.1k` | `W` | L157-158 |
| **Cache hit rate** | `CH87.5%` | `CH`. Shown only when cacheRead or cacheWrite is above 0. | L159-161 |
| **Cost** | `$0.123`, `$` plus 3 decimals. With a subscription it is `$0.123 (sub)`. | `$` | L166-169 |
| **Context usage** | `<pct>%/<window>`, for example `12.3%/200k`. Percent is one decimal. If unknown it is `?/200k`. Then `" (auto)"` when auto-compact is on. | None. No `Context:` word, no icon. | L134-136; L172-175 |
| **Model** | `state.model?.id`, or `no-model`. The id, not a display name. | None. Right-aligned. | L191; L201 |
| **Thinking level** | Only when `model.reasoning`. Appended to the model: `<id> • <level>`, or `<id> • thinking off` when the level is `off`. | Separator ` • `. The words `thinking off` appear only for the off case. No label for the other levels. | L202-206 |
| **Routed model** | Appends ` → <routed id>` and ` • <level>` when a virtual model routes. | `→` | L208-212 |
| **Provider** | `(<provider>) ` prepended to the model side. Shown only when more than one provider is available and there is room. | Parentheses. No word. | L215-221 |
| **Experimental flag** | `• xp` | `•` | L186-188 |

The stats parts are joined by single spaces (L189). The model side is right-aligned with a minimum of 2 spaces of padding (L199, L223-243).

Two points follow for pi-jefferson. First, the host's own vocabulary for the numeric instruments is symbolic and terse (`↑ ↓ R W CH $`), and it is a prefix with no gap. Second, for path, model, thinking level and context percent the host uses no label at all, only a separator bullet or parentheses.

### Q2a. Starship defaults (S2, S3). Starship's term is "module", with `symbol` and `format` options.

Starship has **no model, token, cost or context-window-usage module**. Its closest "model-like" modules are the cloud and context ones below. Defaults are copied from the docs tables:

| Starship module | Default `format` | Default `symbol` | Text label or icon? |
|---|---|---|---|
| `directory` | `'[$path]($style)[$read_only]($read_only_style) '` | **No `symbol` option.** The only symbols are `read_only = '🔒'` and `home_symbol = '~'`. | **Nothing.** Bare path. |
| `aws` | `'on [$symbol($profile )(\($region\) )(\[$duration\] )]($style)'` | `'☁️  '` | Icon, plus the leading word `on` in the format. |
| `gcloud` | `'on [$symbol$account(@$domain)(\($region\))]($style) '` | `'☁️  '` | Icon, plus `on`. |
| `azure` | `'on [$symbol($subscription)]($style) '` | `'󰠅 '` (Nerd Font glyph) | Glyph, plus `on`. |
| `kubernetes` (disabled by default) | `'[$symbol$context( \($namespace\))]($style) in '` | `'☸ '` | Icon, plus trailing `in`. |
| `docker_context` | `'via [$symbol$context]($style) '` | `'🐳 '` | Icon, plus `via`. |
| `nix_shell` | `'via [$symbol$state( \($name\))]($style) '` | `'❄️  '` | Icon, plus `via`. |
| `memory_usage` (disabled by default) | `'via $symbol[$ram( \| $swap)]($style) '` | `'🐏 '` | Icon, plus `via`. |
| `battery` | `'[$symbol$percentage]($style) '` | `full_symbol '󰁹 '`, `charging_symbol '󰂄 '`, `discharging_symbol '󰂃 '` | Nerd Font glyph only. |
| `cmd_duration` | `'took [$duration]($style) '` | **No `symbol` option.** | The word `took`, a preposition and not a field name. |
| `time` | `'at [$time]($style) '` | None | The word `at`. |
| `git_branch` | `'on [$symbol$branch(:$remote_branch)]($style) '` | `' '` (Nerd Font branch glyph) | Glyph, plus `on`. |
| `hostname` | `'[$ssh_symbol$hostname]($style) in '` | None, except `ssh_symbol` | Trailing `in`. |
| `status` (disabled by default) | `'[$symbol$status]($style) '` | `'❌'` | Icon only. |

Starship's own pattern is therefore two-part. It uses a **symbol** (emoji or Nerd Font glyph) and a **connecting preposition** (`on`, `via`, `in`, `at`, `took`). It does **not** use a "Field:" label. Where a module has nothing to say as a symbol, it ships nothing (`directory`).

Presets (S3) show that the symbol is the label and is swappable by font capability:
- `nerd-font-symbols` sets `aws.symbol = " "`, `docker_context.symbol = " "`, `memory_usage.symbol = "󰍛 "`, and `directory.read_only = " 󰌾"`.
- `plain-text-symbols` replaces the symbols with **words, with no colon and one trailing space**: `aws.symbol = "aws "`, `gcloud = "gcp "`, `docker_context = "docker "`, `memory_usage = "memory "`, `nix_shell = "nix "`, `battery.full_symbol = "full "`. It leaves `directory` unchanged except for `read_only = " ro"`.

### Q2b. pi-powerline-footer 0.22.0 defaults (S4). Its term is "segment", and its label is an "icon".

Its `withIcon(icon, text)` is `icon ? \`${icon} ${text}\` : text` (`segments.ts` L21-23): one space between icon and text. Icons come from `getIcons()`, which picks `NERD_ICONS` or `ASCII_ICONS` via `hasNerdFonts()` (`icons.ts` L166-187). `hasNerdFonts()` honours `POWERLINE_NERD_FONTS=1|0`, `GHOSTTY_RESOURCES_DIR`, and a TERM_PROGRAM/TERM allowlist (iterm, wezterm, kitty, ghostty, alacritty, kaku). README L30 calls this "Nerd Font auto-detection … with ASCII fallbacks".

| Segment (id) | Default rendering | Nerd Font icon | ASCII fallback | File:line |
|---|---|---|---|---|
| `model` | `<icon> <model name>`. A leading `Claude ` is stripped. Thinking appended as ` · [high]` or, in the Nerd set, ` · <glyph> high`. | `\uEC19` (nf-md-chip) | `""`, so no icon and a bare name | segments.ts L47-75; icons.ts L57, L82 |
| `thinking` | **`think:<level>`**, a word label with a colon. Levels `off`, `min`, `low`, `med`, `high`, `xhigh`. | None | `think:` is hard-coded and is the same in both sets | segments.ts L204-241, L217-218 |
| `path` | `<icon> <basename>` by default (mode `basename`) | `\uF115` (folder_open) | **`dir`**, so `dir myproject` | segments.ts L96-132; icons.ts L58, L83 |
| `context_pct` | `<icon> 12k/200k (6.2%) <auto icon>`, or with `format:"percent"` a bare `83%` with no icon | `\uF1C0` (database) | `◫` | segments.ts L342-376; icons.ts L65, L90 |
| `token_in` / `token_out` | `<icon> <n>` | `\uF090` / `\uF08B` (sign_in/out) | **`in:` / `out:`** | segments.ts L276-298; icons.ts L74-75, L99-100 |
| `token_total` | `<icon> <n>` | `\uE26B` | `⊛` | segments.ts L300-311; icons.ts L64, L89 |
| `cost` | `$0.123`-style, via `formatUsdCost`. Subscription: `(sub)`. **No icon is applied in the segment** (it calls `color(ctx,"cost",reportedCost)` with no `withIcon`), although the icon set defines `cost` (`\uF155` / `$`). | n/a | n/a | segments.ts L313-340 |

Note the mix in the ASCII set: words with colon (`in:`, `out:`), bare words (`dir`, `cache`, `host`, `id`), symbols (`⊛`, `◫`, `$`), and `think:` as a hard-coded word label with colon.

### Q3. Community convention for a field label

- **Not universal. No de facto word-plus-colon convention exists among these tools.** pi's footer: no label on any field, only symbolic prefixes on numerics (`↑ ↓ R W CH $`). Starship: a symbol (emoji or Nerd Font glyph) plus a preposition (`on`, `via`, `in`), and nothing for `directory`. pi-powerline-footer: an icon (a Nerd Font glyph, with an ASCII fallback) separated by one space, and a hard-coded `think:` for the thinking segment.
- **When a label is present, it is an icon or glyph.** In both Starship and pi-powerline-footer the default is an icon that the user's font may or may not render, with a plain-text alternative: `plain-text-symbols` in Starship, `ASCII_ICONS` in pi-powerline-footer.
- **The plain-text alternatives disagree with each other.** Starship's uses a bare word plus a trailing space (`aws `, `docker `, `memory `, no colon). pi-powerline-footer's uses `dir`, `in:`, `out:`, `think:`, `⊛`, `◫`, `$`, so a colon in some and not others.
- **The only word-with-colon examples found** are `think:` and `in:`/`out:` in pi-powerline-footer, and `Thinking:` in pi-jefferson itself (as the brief states). Starship ships none.
- **Nerd Font glyphs are a default only where the tool detects or presumes support.** Starship ships Nerd Font glyphs for a few modules (`azure`, `battery`, `git_branch`) in its main defaults and emoji for most others, and offers the full Nerd Font set as an opt-in preset. pi-powerline-footer gates them behind detection.
- **Cell-level, in Joel's live config (S5):** he uses emoji only, with no words (📂 🧠 🤔 🔋). This is a user choice and is not evidence of a community default.

## Assumptions, Differences, and Unknowns

- **Differences from the brief's examples.** The brief gives "`aws` shows `☁️`". That is correct, but the default `format` also adds the word `on`, and the symbol carries two trailing spaces. The brief's token prefixes (`↑`, `↓`, `R`, `W`, `$`) are confirmed, and the footer also emits `CH` for cache hit rate and `(sub)` after cost.
- **Starship has no module for model, tokens, cost or context window.** For those pi-jefferson instruments, the only Starship analogues are the loosely related `memory_usage`, `battery`, `status`, `cmd_duration` and cloud modules. The answer for Starship is "no direct equivalent", not "no label".
- **pi's footer shows the model id, not a display name** (L191), and thinking is a suffix on the model, not a separate field. The footer is therefore not a labelled-field vocabulary at all. Its vocabulary is symbolic prefixes on the numbers only.
- **pi-powerline-footer's `cost` segment applies no icon even though the icon set defines one** (segments.ts L313-340 against icons.ts L66). I did not check whether any preset adds it elsewhere.
- **Not verified:** the Starship version the master docs correspond to. The pi footer is 1.5.0, as installed. I did not check the other pi-powerline-footer presets (`presets.ts`) for per-preset icon or label differences. I did not survey other statuslines (tmux, oh-my-posh, lualine, Claude Code statusline); the brief named only the three above. I did not inspect pi-jefferson's code (Eleanor's).
- No label texts are recommended, per the brief.
