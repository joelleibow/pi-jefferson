# pi-jefferson

**Pre-alpha. This claims the name and does nothing else yet.** Installing it registers a
single command, `/jefferson`. There is no statusline in this package.

A starship-style statusline for [pi](https://github.com/earendil-works/pi): modules you
turn on and off, a real layout, and per-module formatting.

The name is a nod to the lineage — Jefferson Airplane became Jefferson Starship became
Starship.

## Status

`0.0.0-alpha` exists so the npm name is claimed while the thing is designed in the open.
The design lives in `openspec/` in this repository.

What the first real release will do: render one row from an ordered module list, with a
module interface other extensions can contribute to. Nothing below that works today.

## Install

```bash
pi install npm:pi-jefferson@0.0.0-alpha
```

Then `/jefferson` reports the version. Nothing else happens, by design — a name claim
should not be able to change anyone's session.

## Why another statusline

`pi-powerline-footer` is excellent and is the reason this exists. It renders its row as a
joined string with a fixed set of presets, which means segment spacing is three columns
by construction, a segment cannot carry another segment's value, and the `left` / `right`
/ `secondary` groups are one flat list rather than rows or columns.

This package is for the case where you want a layout — rows, alignment, per-gap spacing,
a stated truncation priority — and per-module formatting, with the pi session's own data
behind each module.

## License

MIT
