# Formats

An instrument's `format` is plain text with the instrument's variables placed in it. It is not Markdown. Jefferson replaces each variable with its value, already formatted, and renders the text.

```json
{
  "rows": [[{ "instrument": "model" }]],
  "instruments": {
    "model": { "format": "🧠 $model via|dim $provider|capitalize" }
  }
}
```

[Instruments](instruments.md) lists each instrument's variables. Without a `format`, the instrument renders its default.

Jefferson refuses a format it cannot use. For one of Jefferson's instruments that rejects the whole configuration file. For an instrument from another extension it refuses that instrument alone. [What Jefferson refuses](#what-jefferson-refuses) lists the faults.

## Variables

A variable is `$` and a name, such as `$model`. A name is a run of letters, digits and underscores. A format may name only the variables its instrument has.

When a variable the format names has no value yet, the instrument renders nothing, label included. A variable the format does not name has no effect.

## Special characters

`$` and `|` are the format's two special characters. A backslash makes the character after it plain text: `\$`, `\|` and `\m` render `$`, `|` and `m`. A backslash with nothing after it stays a backslash. So `a\b` renders `ab`, and `$idle\m` renders the minutes with an `m` straight after them.

Jefferson turns each control character in a format into a space, then removes the whitespace at the start and the end. Whitespace inside the format is text.

## Forms

Some variables have named forms. A form gives you a different piece of the same value, and it comes directly after its variable, before any modifier:

| Path form | Renders |
| --- | --- |
| `$path` or `$path\|base` | The directory's own name: `pi-jefferson` |
| `$path\|absolute` | The whole directory: `/Users/joelleibow/Projects/pi-jefferson` |
| `$path\|relative` | The directory under your home directory: `~` for home itself and `~/Projects/pi-jefferson` below it, and the whole directory anywhere outside home |

A form is not a modifier: it picks which text arrives. Jefferson applies the form first and the modifiers after it, so `$path|relative|capitalize` capitalizes the relative text, and `$path|bold` renders the directory's own name in bold.

A form may follow only a variable that has it, once, and before anything else. `$model|base` is refused, because `model` has no forms. So is a form written anywhere else.

## Modifiers

A `|name` after a variable, or after plain text, modifies that text. Modifiers chain, and they apply in the order the format writes them. After plain text, a modifier covers the run of non-whitespace characters directly before it, so each word of a phrase takes its own modifier:

```
🧠 $model via|dim $provider|capitalize
```

Here `via` renders dim, and the provider's value is capitalized.

| String modifier | Effect |
| --- | --- |
| `capitalize` | Upper-cases the first character and leaves the rest alone: `high` becomes `High` |
| `upper` | Upper-cases the whole value: `high` becomes `HIGH` |
| `lower` | Lower-cases the whole value: `HIGH` becomes `high` |

Six more modifiers set pi's text attributes: `bold`, `dim`, `italic`, `underline`, `inverse` and `strikethrough`. A modifier only adds. `$model|bold` renders bold even where the instrument's `style` sets `bold: false`, and nothing in a format switches an attribute off.

## When a pipe is a modifier

A `|` begins a modifier only when a name follows it directly. So `10|20` and `$model|_x` both begin a modifier, and an unknown modifier is refused.

Followed by anything else, the pipe is just a pipe: a space, the end of the format, `$`, another `|`, or other punctuation. So `$model | $provider` renders `claude-opus-4 | anthropic`.

To put a pipe directly before a name, write `\|`.

The escape changed meaning in an earlier release. A format written `\|` used to render `\|`, because a backslash before anything except `$` was a literal backslash. It renders `|` now.

## The bar

`$bar` draws a bar. `context` has it, and so can an instrument from another extension. The bar takes the width the rest of the format leaves, and it shrinks to nothing when none is left. A format that holds `$bar` makes its instrument fill the row; [Configuration](configuration.md#how-a-row-fills-the-width) says how instruments that fill share the spare columns.

A format holds at most one `$bar`, and no modifier follows it. The filled part takes the theme's `warning` colour above 70% and its `error` colour above 90%. When the instrument has data but no percentage, such as `context` without an estimate from the host, the bar draws an unfilled, dim track. When the instrument has no data at all, `$bar` has no value, and the instrument renders nothing.

## Styles

`style` uses pi's `ThemeStyle`. `fg` takes a foreground theme colour token, `bg` takes a background one, and either can take a colour that pi's parser accepts. The six boolean attributes are `bold`, `dim`, `italic`, `underline`, `inverse` and `strikethrough`, and each is also a modifier.

`fg` and `bg` are not modifiers. Colours belong to `style`, and a modifier only adds to what `style` sets.

An instrument can choose the foreground of one of its variables itself, and that colour replaces a configured `fg` on that variable's text only. A configured `bg` and the boolean attributes stay, and the label and the rest of the text keep the instrument's `fg`. `thinking` does this for `$level`: it takes the foreground pi gives the thinking rules on the input box for the current level, the theme's `thinkingOff` through `thinkingMax` token, read when the footer renders. An instrument from another extension can do the same for its own variables.

## Composed formats

An instrument can compose its text from a set of formats, one for each kind of thing it shows. It picks the kind from its own data and hands the composed text to its format through one variable. `notice` does this with `$notice`, and an instrument from another extension can do it too. When there is nothing to compose, the instrument renders nothing, label included.

A kind's format is plain. It names the values that belong to the set, and it takes no modifier and no form. Styling belongs to the instrument: `style` styles the composed variable as it styles any other.

The two sets of variables do not mix. A kind's format names the set's values, such as `$tokens`. The instrument's format names the composed variable, such as `$notice`. Each is refused in the other's place.

The `formats` option rewrites the text of one kind at a time. [Notices](notices.md) lists the kinds of `notice`. An instrument from another extension offers `formats` only when its extension says so.

## What Jefferson refuses

Jefferson refuses a format with:

- a bare `$` (write `\$` for a literal dollar);
- a modifier it does not implement;
- a form on a variable that has none, or in a place where a form cannot go;
- a modifier on `$bar`;
- a second `$bar`;
- a modifier with nothing before it;
- a `$name` the instrument does not have;
- a modifier inside a kind's format.

For one of Jefferson's instruments, the footer then renders the default row, and one warning names the fault ([Configuration](configuration.md#what-a-rejected-configuration-file-renders)). For an instrument from another extension, only that instrument is refused ([Configuration](configuration.md#an-extensions-instrument)).
