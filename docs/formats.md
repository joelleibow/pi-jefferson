# Formats

An instrument's `format` is plain text, with the instrument's variables placed in it. It is not
Markdown. Jefferson substitutes each variable with its already-formatted value, then renders the
text.

```json
{
  "rows": [[{ "instrument": "model" }]],
  "instruments": {
    "model": { "format": "🧠 $model via|dim $provider|capitalize" }
  }
}
```

The variables each instrument declares are in [Instruments](instruments.md). Omit `format` and the
instrument renders its default.

## Special characters

`$` and `|` are the format's two special characters, and `\` makes the character after it that
character. `\$`, `\|` and `\m` render `$`, `|` and `m`, and a backslash with nothing after it stays
itself. So `a\b` renders `ab`, and `$idle\m` renders the minutes with an `m` straight after them.

Jefferson turns each control character in a format into a space. It then removes the whitespace at
the front and the back of the format. Whitespace inside the format is text.

## Forms

Some variables accept named forms, and a form gives you a different piece of the same value. A form
comes directly after its variable, before any modifier:

| Path form | Renders |
| --- | --- |
| `$path` or `$path\|base` | The directory's own name: `pi-jefferson` |
| `$path\|absolute` | The whole directory: `/Users/joelleibow/Projects/pi-jefferson` |
| `$path\|relative` | The directory under your home directory: `~` for home itself and `~/Projects/pi-jefferson` below it, and the whole directory anywhere outside home |

A form is not a modifier: it picks which text arrives. A form applies before the modifiers after it,
so `$path|relative|capitalize` capitalizes the relative text, and `$path|bold` renders the
directory's own name bold.

A form may follow only the variable that declares it, once, and before anything else. `$model|base`
rejects the document, because `model` declares no form. So does a form written anywhere else.

## Modifiers

A `|name` after a variable, or after the text in front of it, modifies that text. Modifiers chain,
and each applies in the order the format writes them. On plain text a modifier covers the run of
non-whitespace characters directly before it, so a multi-word phrase takes a modifier on each word:

```
🧠 $model via|dim $provider|capitalize
```

Here `via` renders dim, and the provider's value is capitalized.

| String modifier | Effect |
| --- | --- |
| `capitalize` | Upper-cases the first character and leaves the rest alone: `high` becomes `High` |
| `upper` | Upper-cases the whole value: `high` becomes `HIGH` |
| `lower` | Lower-cases the whole value: `HIGH` becomes `high` |

Six more modifiers set pi's text attributes: `bold`, `dim`, `italic`, `underline`, `inverse` and
`strikethrough`. A modifier only adds: `$model|bold` renders bold even where the instrument's `style`
sets `bold: false`, and nothing in a format switches an attribute off.

## When a pipe is a modifier

A `|` begins a modifier only when a name follows it directly. A name is a run of letters, digits and
underscores, so `10|20` and `$model|_x` start a modifier, and an unknown modifier rejects the
document.

Followed by anything else the pipe is the character itself: a space, the end of the format, `$`, `|`
or other punctuation. So `$model | $provider` renders `claude-opus-4 | anthropic`.

Where a literal pipe has to sit beside a name, write `\|`.

The escape changed meaning in an earlier release: a format written `\|` used to render `\|`, because
a backslash before anything except `$` was a literal backslash, and it renders `|` now.

## The bar

`context` declares `$bar`. It takes the width the rest of the format leaves, and it shrinks to
nothing when none is left.

An entry whose format holds `$bar` fills the row's spare columns, sharing them with any `blank`
entry. Drop the `$bar` from the format and the entry takes only its text's width.

Use at most one `$bar` in a format, and no modifier after it. The filled portion changes to the
theme's `warning` colour above 70% and its `error` colour above 90%. Without an estimate from the
host, the bar draws an unfilled, dim track.

## Styles

`style` uses pi's `ThemeStyle`. `fg` accepts foreground theme colour tokens, `bg` background tokens,
and either slot can use a colour pi's parser accepts. The six boolean attributes are `bold`, `dim`,
`italic`, `underline`, `inverse` and `strikethrough`, and each is also a modifier inside a format.

`fg` and `bg` are not modifiers: colours belong to `style`. A modifier only adds to what `style`
sets.

`thinking`'s `$level` is the one value `style` does not fully control. It takes the foreground pi
gives the thinking rules on the input box for the current level: the theme's `thinkingOff` through
`thinkingMax` token, read from the theme at render time. That replaces a configured `fg` on `$level`
only. A configured `bg` and the boolean attributes stay, and the label and any other text keep the
instrument's `fg`.

## Composed formats

One instrument composes its text from a set of formats and hands the result to the entry through one
variable: `notice` does this with `$notice`. A composed format is plain. It names the values that
belong to it, and it takes no modifier and no form. Styling belongs to the entry, so `style` still
sets colours and attributes over the whole notice.

The two variable sets are not interchangeable. A composed format names its own values, such as
`$tokens`, and the entry's format names `$notice`. `$tokens` is no variable of an entry, and a
`|name` inside a composed format rejects the document.

[Notices](notices.md) lists the kinds and their texts.

## What rejects a format

Jefferson rejects the whole document, renders the default row, and warns with a message naming the
offender when it cannot use a format. The faults are:

- a bare `$` (write `\$` for a literal dollar);
- a modifier it does not implement;
- a form on an instrument that declares none, or in a position that has none;
- a modifier on `$bar`;
- a second `$bar`;
- a modifier with nothing before it;
- a `$name` the instrument does not declare;
- a modifier inside a composed format.
