# pi-jefferson

A starship-style statusline for [pi](https://github.com/earendil-works/pi). You place instruments in rows, Jefferson lays the rows out across the footer, and each instrument takes its own format.

The name is a nod to the lineage: Jefferson Airplane became Jefferson Starship became Starship.

![Jefferson's footer in a cosmic star-dragon theme](https://raw.githubusercontent.com/joelleibow/pi-jefferson/main/docs/images/jefferson-cosmic-star-dragon.png)

## Status

Pre-1.0. A configuration file written for an earlier version can be rejected, and [Upgrading](https://github.com/joelleibow/pi-jefferson/blob/main/docs/configuration.md#upgrading) says what to change.

## Install

```bash
pi install npm:pi-jefferson
```

Then run `/jefferson`. It reports whether the footer is installed and how many rows it renders.

## Configure

Write a `pi-jefferson.json` to choose your instruments. This one puts the model on the left and the context window on the right:

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

[Configuration](https://github.com/joelleibow/pi-jefferson/blob/main/docs/configuration.md) says where the file goes, and lists every key and every rule.

## Documentation

- [Configuration](https://github.com/joelleibow/pi-jefferson/blob/main/docs/configuration.md): where the file lives, rows, names, alignment, the gap between rows, and what Jefferson rejects.
- [Instruments](https://github.com/joelleibow/pi-jefferson/blob/main/docs/instruments.md): every instrument, with its variables, options and defaults.
- [Formats](https://github.com/joelleibow/pi-jefferson/blob/main/docs/formats.md): how an instrument's text is written, with variables, forms, modifiers, styles and the bar.
- [Notices](https://github.com/joelleibow/pi-jefferson/blob/main/docs/notices.md): the `notice` instrument, its kinds, their words and how long they show.
- [Provide instruments from your extension](https://github.com/joelleibow/pi-jefferson/blob/main/docs/extension-authors.md): put your own extension's instruments in the footer.

## Why another statusline

`pi-powerline-footer` is excellent, and it is the reason this package exists. It renders its row as one joined string from a fixed set of presets. So its segment spacing is fixed, a segment cannot carry another segment's value, and its groups are one flat list rather than rows.

This package is for when you want a layout and per-instrument formatting, with the pi session's own data behind each instrument. The layout means rows, alignment, a gap between rows and a stated truncation rule.

## Contributing

[CONTRIBUTING.md](https://github.com/joelleibow/pi-jefferson/blob/main/CONTRIBUTING.md) has the development and release steps.

## License

MIT
