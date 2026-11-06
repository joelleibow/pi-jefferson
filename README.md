# pi-jefferson

**Pre-1.0.** A statusline footer of configured rows for pi. Install with
`pi install npm:pi-jefferson`.

A starship-style statusline for [pi](https://github.com/earendil-works/pi): instruments you
place in a row's cells, a real layout, and per-instrument formatting.

The name is a nod to the lineage — Jefferson Airplane became Jefferson Starship became
Starship.

## Status

The statusline is a footer of one line per configured row, with evenly divided cells spanning
its full width. The [configuration table](#configuration) lists the available instruments, their
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

`format` is plain text with the instrument's already-formatted `$variables`, not Markdown.
Omit `format` to use its default:

| Instrument | Variables | Default format |
| --- | --- | --- |
| `blank` | None | `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor` |
| `model` | `$provider`, `$model` | `$provider: $model` |
| `thinking` | `$level` | `thinking: $level` |
| `path` | `$path` | `$path` |
| `context` | `$tokens`, `$window`, `$percent`, `$bar` | `$percent/$window` |
| `tokens` | `$input`, `$output`, `$cacheRead`, `$cacheWrite`, `$totalTokens` | `$totalTokens` |
| `cost` | `$cost` | `$cost` |

`$bar` is available on `context`: it takes the width the rest of the format leaves in the cell,
and shrinks to nothing when none is left. Use at most one per format. Its filled portion changes
to the theme's `warning` color above 70% and `error` above 90%; without an estimate from the host,
it draws an unfilled, dim track.

`style` uses pi's `ThemeStyle`: `fg` accepts foreground theme color tokens, `bg` background
tokens, or either slot can use a color pi's parser accepts. The six boolean attributes are
`bold`, `dim`, `italic`, `underline`, `inverse` and `strikethrough`. If the extension cannot read
a document's style or format, it rejects the whole document, renders the default row, and warns
with a message naming the offender.

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

Tests live in `tests/`, never beside an extension. Pi loads every direct `.ts` file in
`extensions/` as an extension, so a test file there would run on every pi start.

`@earendil-works/pi-coding-agent` and `@earendil-works/pi-tui` are `peerDependencies`, not
`dependencies`, because pi supplies them at runtime. A physical copy bypasses pi's module
mapping and duplicates classes and registries; pi reports a warning when it sees a
manifest configured that way.

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
