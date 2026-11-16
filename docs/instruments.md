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

The variables and the format language are in [Formats](formats.md). The `notice` instrument has its
own page: [Notices](notices.md).

## Options

`instruments` configures an instrument once, by name, for every entry that names it. Every
instrument takes three options:

| Option | Value |
| --- | --- |
| `format` | The text the instrument renders. See [Formats](formats.md). |
| `label` | Text placed in front of the format. See below. |
| `style` | Colours and attributes for the whole text. See [Formats](formats.md). |

`notice` also takes `seconds` and `formats`.

An option the instrument does not declare rejects the document, and the warning names it.

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

A name the extension does not implement does not reject the document. Jefferson accepts it, warns,
and renders that entry as `blank`, so one typo does not take the statusline down.

The warning places the entry by its row:

```
row 3: "taiknr.savings" is not a known instrument
```

The warning holds one part for each row and name, in row order.

When the `instruments` block configures a name that no instrument answers to, the warning names it
with no row, because no entry names it:

```
the instruments block names instruments the extension does not implement: "taiknr.savings"
```
