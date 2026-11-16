# pi-jefferson

**Pre-1.0.** A statusline footer of configured rows for pi. Install with
`pi install npm:pi-jefferson`.

A starship-style statusline for [pi](https://github.com/earendil-works/pi): instruments you
place in a row, a real layout, and per-instrument formatting.

The name is a nod to the lineage — Jefferson Airplane became Jefferson Starship became
Starship.

![Jefferson's footer in a cosmic star-dragon theme](https://raw.githubusercontent.com/joelleibow/pi-jefferson/main/docs/images/jefferson-cosmic-star-dragon.png)

## Status

The footer holds one line per configured row, and each row spans the full width. By default an
instrument takes the width its text needs, and its neighbours sit against it. `blank`, and an
instrument whose format holds `$bar`, fill whatever the row leaves. With no configuration you get
one row of placeholder instruments.

## Install

```bash
pi install npm:pi-jefferson
```

Then `/jefferson` reports the footer this session installed and how many rows it renders.

## Configure

Write `pi-jefferson.json` in pi's agent directory, or `.pi/pi-jefferson.json` in a trusted project.
The project's document replaces the agent's whole, and Jefferson does not merge the two.

A document declares its rows in `rows`. A row is a list of entries, and an entry names one
instrument:

```json
{
  "rows": [
    [
      { "instrument": "model" },
      { "instrument": "context", "align": "right" }
    ]
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

Every key and every rule is in
[Configuration](https://github.com/joelleibow/pi-jefferson/blob/main/docs/configuration.md),
including what a rejected document renders.

## Documentation

- [Configuration](https://github.com/joelleibow/pi-jefferson/blob/main/docs/configuration.md):
  the document's keys, rows, entries, alignment, the gap between rows, and rejection.
- [Instruments](https://github.com/joelleibow/pi-jefferson/blob/main/docs/instruments.md): every
  instrument, its variables, its options and its defaults.
- [Formats](https://github.com/joelleibow/pi-jefferson/blob/main/docs/formats.md): how an
  instrument's text is composed: variables, forms, modifiers, styles and the bar.
- [Notices](https://github.com/joelleibow/pi-jefferson/blob/main/docs/notices.md): the notice
  instrument, its kinds, their texts and their seconds.
- [Releasing](https://github.com/joelleibow/pi-jefferson/blob/main/docs/releasing.md): the three
  labels, the patch default, and where a release runs.

## Why another statusline

`pi-powerline-footer` is excellent and is the reason this exists. It renders its row as a joined
string with a fixed set of presets, which means segment spacing is fixed by construction, a segment
cannot carry another segment's value, and its groups are one flat list rather than rows.

This package is for the case where you want a layout (rows, alignment, a per-row gap, a stated
truncation rule) and per-instrument formatting, with the pi session's own data behind each
instrument.

## Development

Trunk-based: `main` is the only long-lived branch, and every merge to it is a release.

```bash
pnpm typecheck
pnpm test
```

Tests live in `tests/`, never beside a source file. `@earendil-works/pi-coding-agent` and
`@earendil-works/pi-tui` are `peerDependencies`, not `dependencies`, because pi supplies them at
runtime: a physical copy bypasses pi's module mapping and duplicates classes and registries.

## License

MIT
