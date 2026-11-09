# pi-jefferson

**Pre-1.0.** A statusline footer of configured rows for pi. Install with
`pi install npm:pi-jefferson`.

A starship-style statusline for [pi](https://github.com/earendil-works/pi): instruments you
place in a row's cells, a real layout, and per-instrument formatting.

The name is a nod to the lineage — Jefferson Airplane became Jefferson Starship became
Starship.

## Status

The statusline is a footer of one line per configured row, each spanning the full width. By default
a cell takes the width its content needs and its neighbours sit against it. `blank` cells and cells
with a `$bar` fill whatever the row leaves, and a [row option](#configuration) restores evenly
divided cells. The [configuration table](#configuration) lists the available instruments, their
variables and default formats. With no configuration you get the default single row of
placeholder cells.

## Install

```bash
pi install npm:pi-jefferson
```

Then `/jefferson` reports the footer this session installed and how many rows it renders.

## Configuration

Create `pi-jefferson.json` in pi's agent directory, or `.pi/pi-jefferson.json` in a trusted
project. The project document replaces the agent document whole; the two are not merged.

Each cell names its instrument; `instruments` configures each instrument once by name for every
cell that uses it:

```json
{
  "rows": [
    {
      "cells": [
        { "instrument": "model" },
        { "instrument": "context", "align": "right" }
      ]
    }
  ],
  "instruments": {
    "model": {
      "format": "🧠: $model from $provider",
      "style": { "fg": "accent", "bold": true }
    },
    "context": {
      "format": "$bar $percent"
    }
  }
}
```

A row sizes its cells by its `distribution`, either `"content"` or `"equal"`. Without it a row is
`"content"`:

```json
{ "distribution": "equal", "cells": [{ "instrument": "model" }, { "instrument": "path" }] }
```

With `"content"`, a cell takes the columns its text needs, label included, so neighbours sit against
it. Cells that fill (`blank`, and any cell whose format holds `$bar`) share the columns the row leaves,
the earliest taking any odd one. When no cell fills, the last left-aligned cell with text takes them,
else the first cell with text, else the first cell. A cell with no text, because its data is unknown,
takes no columns. Two neighbours that both have text get one column between them, and that column
gives way before any text does when the row is too narrow. No column goes between them when a filling
cell sits there, or when the row's spare columns do. A cell with no spare columns has nothing for
`align` to pad, so `align` changes nothing in it.

With `"equal"`, every cell gets the same share of the width, and the earliest cells take one extra
column each when the width does not divide. A value that is neither rejects the document, like a bad
`align`: the default row renders and the warning names the value. `distribution` belongs on a row; beside
a `rows` list it rejects the document. `rowGap`, below, is the one key that sits beside either shape.

Upgrading: earlier releases divided every row evenly. Set `"distribution": "equal"` on a row to keep
that.

The footer leaves empty lines between rows. `rowGap` sets how many, at the top
level of the document, beside `rows` or beside a single top-level row:

```json
{ "rowGap": 0, "rows": [{ "cells": [{ "instrument": "model" }] }] }
```

It is a whole number from 0 to 3. Without it, one empty line sits between each
pair of rows and none before the first. `0` renders the footer without that space. Any other value,
such as `-1`, `1.5`, `"1"` or `4`, rejects the document: the default row renders and the warning names the value. A misspelt key
such as `rowgap` is ignored, and the default space renders. The empty lines belong to the footer, not
to a row; each row stays one line.

Upgrading: earlier releases drew no empty lines. Set `"rowGap": 0` to keep that.

`format` is plain text with the instrument's already-formatted `$variables`, not Markdown. `$` and
`|` are its two special characters, escaped `\$` and `\|`. Control characters become spaces, then
whitespace at the front and back of a format is removed; whitespace inside it is text. Omit `format`
to use its default:

| Instrument | Variables | Default label | Default format |
| --- | --- | --- | --- |
| `blank` | None | None | `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor` |
| `model` | `$provider`, `$model` | `Model:` | `$provider/$model` |
| `thinking` | `$level` | `Thinking:` | `$level\|capitalize` |
| `path` | `$path` | `Path:` | `$path` |
| `context` | `$tokens`, `$window`, `$percent`, `$bar` | `Context:` | `$percent/$window` |
| `tokens` | `$input`, `$output`, `$cacheRead`, `$cacheWrite`, `$totalTokens` | `Tokens:` | `$totalTokens` |
| `cost` | `$cost` | `Cost:` | `$cost` |

Every instrument also accepts `label`, a string placed in front of its format, whether the format
is configured or the default. It is literal text: `$` means nothing in it, and `$label` is not a
variable (a format that names it rejects the document). Each control character in it becomes one
space, then whitespace at its front and back is removed, and it takes the instrument's `style`. A
`label` that is not a string rejects the document.

```json
"thinking": { "label": "🤔" }
```

That renders `🤔 High`. A label followed by a format always gets one space between them, so you never
write it yourself. The space takes the label's `style`, counts toward the cell's width, and comes out
of what `$bar` has left. A label that is empty after the trim, `label: ""` included, shows no label
and no space. A format that is empty or only whitespace leaves the label alone, with no space after it.

Every instrument except `blank` has a default label, so `model` reads `Model: anthropic/claude-opus-4`
and `thinking` reads `Thinking: High`. A configured `label` replaces the default, and `label: ""`
removes it. When an instrument's data is unknown the cell renders nothing, label included. With known
data and `"format": ""`, the cell is the label alone.

Upgrading: a default label now fronts a format you configured, too, on `model`, `path`, `context`,
`tokens` and `cost` as well as `thinking`. If that format has no `label`, the cell starts with the
label and one space, and `"format": ""` renders the label alone. Set `label: ""` to get the previous
text back. `model` also changed its default format to `$provider/$model`. To
restore `anthropic: claude-opus-4`, set both `label: ""` and `format: "$provider: $model"`. A space you
wrote at the front or back of a label or a format is now removed, and a label's one space comes from
the gap.

A `|name` after a variable, or after the text in front of it, modifies that text. Modifiers chain,
each applying in the order the format writes them. On plain text a modifier covers the run of
non-whitespace characters directly before it, so a multi-word phrase takes a modifier on each word:

```
🧠 $model via|dim $provider|capitalize
```

Here `via` renders dim and the provider's value is capitalized.

| String modifier | Effect |
| --- | --- |
| `capitalize` | Upper-cases the first character and leaves the rest alone: `high` becomes `High` |
| `upper` | Upper-cases the whole value: `high` becomes `HIGH` |
| `lower` | Lower-cases the whole value: `HIGH` becomes `high` |

A `|` begins a modifier only when a name follows it directly. A name is a run of letters, digits
and underscores, so `10|20` and `$model|_x` start a modifier and an unknown one rejects the
document. Followed by anything else (a space, the end of the format, `$`, `|` or other
punctuation) the pipe is the character itself, so `$model | $provider` renders
`claude-opus-4 | anthropic`. Where a literal pipe has to sit beside a name, write `\|`.

That escape changed meaning in this release. A format written `\|` used to render `\|`, because a
backslash before anything but `$` was a literal backslash; it now renders `|`.

`$bar` is available on `context`: it takes the width the rest of the format leaves in the cell,
and shrinks to nothing when none is left. A cell with a `$bar` fills the row's spare columns, sharing
them with any `blank` cell; drop the `$bar` from its format and the cell takes only its text's width.
Use at most one per format, and no modifier after it. Its filled portion changes to the theme's
`warning` color above 70% and `error` above 90%; without an estimate from the host, it draws an
unfilled, dim track.

`style` uses pi's `ThemeStyle`: `fg` accepts foreground theme color tokens, `bg` background
tokens, or either slot can use a color pi's parser accepts. The six boolean attributes are
`bold`, `dim`, `italic`, `underline`, `inverse` and `strikethrough`, and each is also a modifier
inside a format. A modifier only adds: `$model|bold` renders bold even where the instrument's
`style` sets `bold: false`, and nothing in a format switches an attribute off. `fg` and `bg` are
not modifiers; colors belong to `style`.

`thinking`'s `$level` is the one segment `style` does not fully control. It takes the foreground
pi gives the thinking rules on the input box for the current level: the theme's `thinkingOff`
through `thinkingMax` token, read from the theme current at render time. That replaces a configured
`fg` on `$level` only. A configured `bg` and the boolean attributes stay, and the label and any other
text keep the instrument's `fg`.

If the extension cannot read a document's style or format, it rejects the whole document, renders
the default row, and warns with a message naming the offender. The offenders include a modifier it
does not implement, a modifier on `$bar`, and a modifier with nothing before it.

## Why another statusline

`pi-powerline-footer` is excellent and is the reason this exists. It renders its row as a
joined string with a fixed set of presets, which means segment spacing is three columns
by construction, a segment cannot carry another segment's value, and the `left` / `right`
/ `secondary` groups are one flat list rather than rows or columns.

This package is for the case where you want a layout — rows, alignment, per-gap spacing,
a stated truncation priority — and per-instrument formatting, with the pi session's own data
behind each instrument.

## Development

Trunk-based: `main` is the only long-lived branch, and every merge to it is a release.

```bash
pnpm install
pnpm typecheck
pnpm test
```

Tests live in `tests/`, never beside a source file. The `pi.extensions` manifest in `package.json`
names the one entry, `extensions/jefferson.ts`, and pi loads only what the manifest lists, so
the files under `extensions/jefferson/` are never entries. A test file there would still ship in the
package, because `files` includes `extensions`.

`@earendil-works/pi-coding-agent` and `@earendil-works/pi-tui` are `peerDependencies`, not
`dependencies`, because pi supplies them at runtime. A physical copy bypasses pi's module
mapping and duplicates classes and registries; pi reports a warning when it sees a
manifest configured that way.

`lodash-es` is the package's one runtime `dependencies` entry. Its `upperFirst`, `toUpper` and
`toLower` perform every string mutation a modifier makes. pi installs a package's dependencies when
it installs the package, so it arrives with this one rather than shipping in the tarball; why this
build and not the CommonJS one is
[ADR 0004](docs/adr/0004-string-mutations-come-from-lodash-es.md).

### A workstation cannot publish

`publishConfig.provenance` is `true`, and provenance is signed from a CI OIDC provider.
A workstation has neither that provider nor a trusted-publishing credential, so the
identical `pnpm publish` fails before it reaches the registry. Publishing is CI's job,
and that is enforced by the mechanism rather than by a note in a file.

## Releasing

Merging to `main` releases. There is no separate release step and nothing to remember to
do.

**The bump comes from a label on the pull request:** `release:major`, `release:minor`, or
`release:patch`. No label means a patch. It defaults low on purpose — an unlabelled change
should never ship a major version by accident.

**The base comes from the git tags, not from `package.json`.** Main accepts no direct
pushes, so the workflow cannot commit an updated version back to it, and `package.json`
would drift from what actually shipped. Every release writes a `v…` tag, and those tags
are the record. Specifically, the base is the highest release tag reachable from the
commit *before* the one being released, which makes a re-run compute the same version it
did the first time.

Authentication is npm trusted publishing over OIDC. The workflow holds no token and the
package accepts publishes from this repository's `release.yml`, so there is nothing to
rotate and nothing to leak. Provenance is attached automatically.

## License

MIT
