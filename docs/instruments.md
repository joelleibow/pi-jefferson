# Instruments

An instrument draws one piece of the footer from the pi session's data. A row lists the instruments it shows, and [Configuration](configuration.md) says how to write a row.

Jefferson ships these instruments:

| Instrument | Variables | Default label | Default format |
| --- | --- | --- | --- |
| `blank` | None | None | `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor` |
| `model` | `$provider`, `$model` | `Model:` | `$provider/$model` |
| `thinking` | `$level` | `Thinking:` | `$level\|capitalize` |
| `path` | `$path` | `Path:` | `$path` |
| `context` | `$tokens`, `$window`, `$percent`, `$bar` | `Context:` | `$percent/$window` |
| `tokens` | `$input`, `$output`, `$cacheRead`, `$cacheWrite`, `$totalTokens` | `Tokens:` | `$totalTokens` |
| `cost` | `$cost` | `Cost:` | `$cost` |
| `branch` | `$branch` | `Branch:` | `$branch` |
| `session` | `$name` | `Session:` | `$name` |
| `status` | `$status` | `Status:` | `$status` |
| `notice` | `$notice` | `Notice:` | `$notice` |

`blank` is the placeholder. Its text is the fixed lorem ipsum above, and the default row holds ten of them.

Each of these is registered as `jefferson.default.<name>`, and a bare name such as `"model"` means that instrument. [Configuration](configuration.md#names) has the naming rule.

[Formats](formats.md) explains the variables and the format language. `notice` has its own page, [Notices](notices.md).

## Options

Every instrument takes three options, set in the `instruments` block ([Configuration](configuration.md#the-instruments-block)):

| Option | Value |
| --- | --- |
| `format` | The text the instrument renders. See [Formats](formats.md). |
| `label` | Text in front of the format. See [The label](#the-label). |
| `style` | Colours and attributes for the whole text. See [Formats](formats.md#styles). |

`notice` also takes `seconds` and `formats`.

Jefferson refuses a setting it cannot use, such as an option the instrument does not take. For one of Jefferson's instruments, a refused setting rejects the whole configuration file ([Configuration](configuration.md#what-a-rejected-configuration-file-renders)). For an instrument from another extension, it refuses that instrument alone ([Configuration](configuration.md#an-extensions-instrument)).

## The label

`label` is literal text in front of the format, whether you configure the format or keep the default. Every instrument except `blank` has a default label, so `model` reads `Model: anthropic/claude-opus-4`.

```json
{
  "rows": [[{ "instrument": "thinking" }]],
  "instruments": { "thinking": { "label": "🤔" } }
}
```

That renders `🤔 High`.

`$` means nothing in a label, and `$label` is not a variable, so a format that names `$label` is refused. Jefferson turns each control character in a label into a space, then trims the whitespace from both ends. A label that is not a string is refused.

Jefferson puts one space between a label and its format, so you never write it. The space takes the label's style, counts toward the instrument's width, and comes out of what `$bar` has left.

A label that is empty after the trim, `label: ""` included, shows no label and no space. A format that is empty or only whitespace leaves the label alone, with no space after it.

A configured label replaces the default, so `label: ""` removes it.

[Formats](formats.md#variables) says when an instrument renders nothing, label included. With `"format": ""` the instrument shows its label alone.

## Instruments from other extensions

Another extension can add instruments to the footer. Place one by its full name, such as `taiknr.savings`. Configure it in the `instruments` block as you configure Jefferson's own: `format`, `label` and `style`, plus `formats` when its extension offers that option. Its variables, default format and default label come from that extension's documentation.

[Provide instruments from your extension](extension-authors.md) describes what the extension writes.
