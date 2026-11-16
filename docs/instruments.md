# Instruments

An entry names one instrument. The instrument renders the text for that entry, from the pi session's
own data.

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

`blank` is the placeholder instrument. Its text is the fixed lorem ipsum above, and the default row
holds ten of them.

Jefferson registers each of these as `jefferson.default.<name>`: `jefferson.default.model`, and so
on. A bare name in a row means that instrument, so `"model"` and `"jefferson.default.model"` name one
instrument and take one configuration. [Configuration](configuration.md) states the rule in full.

The variables and the format language are in [Formats](formats.md). The `notice` instrument has its
own page: [Notices](notices.md).

## Instruments an extension provides

Another extension can add instruments. Each one is named `<extension>.<instrument>`, such as
`taiknr.savings`, and you configure it exactly as you configure Jefferson's own: `format`, `label`
and `style`, in the `instruments` block.

A provided instrument takes those three settings and no option of its own. A setting it does not take
refuses that instrument alone. Its entries render `blank`, one warning names the instrument and the
fault, and every other entry renders as configured. Jefferson's own instruments keep the stricter
rule: a setting they do not declare rejects the whole document.

The data behind a provided instrument comes from its own extension, not from pi's session. A field
that extension has not reported yet reads as unknown, so the entry renders nothing.

[Writing an extension](extension-authors.md) shows the other side: what an extension writes to
provide one.

## Options

`instruments` configures an instrument once, by name, for every entry that names it. Every
instrument takes three options:

| Option | Value |
| --- | --- |
| `format` | The text the instrument renders. See [Formats](formats.md). |
| `label` | Text placed in front of the format. See below. |
| `style` | Colours and attributes for the whole text. See [Formats](formats.md). |

`notice` also takes `seconds` and `formats`.

An option one of Jefferson's own instruments does not declare rejects the document, and the warning
names it. A provided instrument refuses only itself, as above.

## The label

`label` is literal text placed in front of the format, whether the document configures the format or
uses the default. Every instrument except `blank` has a default label, so `model` reads
`Model: anthropic/claude-opus-4`.

```json
{
  "rows": [[{ "instrument": "thinking" }]],
  "instruments": { "thinking": { "label": "🤔" } }
}
```

That renders `🤔 High`.

A label is literal: `$` means nothing in it, and `$label` is not a variable. A format that names
`$label` rejects the document. Jefferson turns each control character in a label into one space,
then removes the whitespace at its front and back. A label that is not a string rejects the document.

A label followed by a format always gets one space between them, so you never write it. The space
takes the label's style, counts toward the width of the text, and comes out of what `$bar` has left.

A label that is empty after the trim, `label: ""` included, shows no label and no space. A format
that is empty or only whitespace leaves the label alone, with no space after it.

A configured label replaces the default. `label: ""` removes it.

When an instrument's data is unknown, the entry renders nothing, the label included. With known
data and `"format": ""`, the entry is the label alone.

## A name no instrument answers to

A name no instrument answers to does not reject the document. Jefferson accepts it, warns, and
renders that entry as `blank`, so one typo does not take the statusline down.

The warning waits until startup completes, because an extension may register the name during
startup. A name registered by then renders and is never warned about. A name that registers after
the warning renders from the next render on, and the warning stays in the transcript.

The warning places the entry by its row:

```
row 3: "taiknr.savings" is not a known instrument
```

The warning holds one part for each row and name, in row order.

An `instruments`-block entry for a name no instrument answers to draws no warning. Jefferson checks
its settings only when that instrument registers.
