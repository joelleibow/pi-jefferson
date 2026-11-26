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

Six more modifiers set pi's text attributes: `bold`, `dim`, `italic`, `underline`, `inverse` and `strikethrough`. An attribute modifier only adds: `$model|bold` renders bold even where the instrument's `style` sets `bold: false`, and nothing in a format switches an attribute off. A colour is the other kind of modifier, and it sets the foreground of the text it attaches to ([Colours](#colours)).

### Colours

A `|name` may also be a foreground colour of the theme you are running. `$model via|muted $provider|toolDiffRemoved` renders the model in `toolDiffRemoved` and the word `via` in `muted`.

The names belong to pi, not to Jefferson. A colour is a name of the theme's foreground slot, spelled as pi spells it, so `|Accent` is not `|accent`. Jefferson keeps no list of the names: it asks the theme you are running, so a name is whatever that theme carries, and pi's own documentation is where it names them. A colour renders as its theme draws it, and Jefferson adds nothing. So a colour a theme draws faint looks faint here too: `|muted` does on pi's system theme.

Only a foreground colour is a modifier. A background colour, such as `selectedBg`, is refused, and so is a name the theme does not have.

A name after the pipe is read in one order. Directly after a variable, the first name may be one of that variable's forms ([Forms](#forms)). After that come the modifiers Jefferson implements, and then the theme's foreground colours. So `|dim` is the faint attribute, never the theme's `dim` colour, which is reached through the instrument's `style`. And `$path|relative|accent` renders the relative path in `accent`, because the form comes first.

A colour stacks with the rest of its chain: `$provider|accent|bold` and `$provider|bold|accent` both render the value in `accent` and bold. When one text carries two colours, the later one wins.

A colour is the strongest colour there is. It beats both the instrument's `style` foreground and the colour an instrument chooses for that variable itself ([Styles](#styles)). A label has no format, so only `style` colours it. `$bar` takes no modifier, so it takes no colour, and a kind's text in `formats` is plain, so a colour in one is refused.

A colour needs Jefferson 0.15.0 or later. An earlier release refuses the format that names one, as it refuses any name it does not implement.

## When a pipe is a modifier

A `|` begins a modifier only when a name follows it directly. So `10|20` and `$model|_x` both begin a modifier, and a name that is neither a modifier Jefferson implements nor a foreground colour of the theme is refused.

Followed by anything else, the pipe is just a pipe: a space, the end of the format, `$`, another `|`, or other punctuation. So `$model | $provider` renders `claude-opus-4 | anthropic`.

To put a pipe directly before a name, write `\|`.

The escape changed meaning in an earlier release. A format written `\|` used to render `\|`, because a backslash before anything except `$` was a literal backslash. It renders `|` now.

## The bar

`$bar` draws a bar. `context` has it, and so can an instrument from another extension. The bar takes the width the rest of the format leaves, and it shrinks to nothing when none is left. An instrument whose format holds `$bar` fills the row, and the bar can come and go with the percentage: a threshold whose own format adds or drops it starts or ends that fill there ([Configuration](configuration.md#how-a-row-fills-the-width) says how instruments that fill share the spare columns).

A format holds at most one `$bar`, and no modifier follows it. The filled part takes the colour your settings give the fill: the theme's `warning` from 70% and its `error` from 90% unless you write a `thresholds` list of your own, and whatever colour you name for the percentages you choose ([Thresholds and the fill](configuration.md#thresholds-and-the-fill)). The bar's track is the instrument's `style` plus `dim`, and nothing you set for a fill reaches it. When the instrument has data but no percentage, such as `context` without an estimate from the host, the bar draws an unfilled, dim track. When the instrument has no data at all, `$bar` has no value, and an instrument whose format names it renders nothing, label included.

## Styles

`style` uses pi's `ThemeStyle`. `fg` takes a foreground theme colour token, `bg` takes a background one, and either can take a colour that pi's parser accepts. The six boolean attributes are `bold`, `dim`, `italic`, `underline`, `inverse` and `strikethrough`, and each is also a modifier.

`bg` is not a modifier: a background colour belongs to `style`. A foreground colour may be one ([Colours](#colours)), and it replaces the `fg` of the text it attaches to while everything else `style` sets stays. An attribute modifier only adds to what `style` sets.

An instrument can choose the foreground of one of its variables itself, and that colour replaces a configured `fg` on that variable's text only. A configured `bg` and the boolean attributes stay, and the label and the rest of the text keep the instrument's `fg`. A colour the format names for that variable beats the instrument's own choice, and then the instrument is not asked for one ([Colours](#colours)). `thinking` does this for `$level`: it takes the foreground pi gives the thinking rules on the input box for the current level, the theme's `thinkingOff` through `thinkingMax` token, read when the footer renders. An instrument from another extension can do the same for its own variables.

## Composed formats

An instrument can compose its text from a set of formats, one for each kind of thing it shows. It picks the kind from its own data and hands the composed text to its format through one variable. `notice` does this with `$notice`, and an instrument from another extension can do it too. When there is nothing to compose, `$notice` has no value, so a format that names it renders nothing, label included, and a format that leaves it out renders as usual. An instrument from another extension works the same way, unless its extension gives the variable a value of its own.

A kind's format is plain. It names the values that belong to the set, and it takes no modifier and no form — a colour included. Styling belongs to the instrument: `style` styles the composed variable as it styles any other, and the instrument's own format colours it like any other text.

The two sets of variables do not mix. A kind's format names the set's values, such as `$tokens`. The instrument's format names the composed variable, such as `$notice`. Each is refused in the other's place.

The `formats` option rewrites the text of one kind at a time. [Notices](notices.md) lists the kinds of `notice`. An instrument from another extension offers `formats` only when its extension says so.

## What Jefferson refuses

Jefferson refuses a format with:

- a bare `$` (write `\$` for a literal dollar);
- a name after the pipe that is neither a modifier Jefferson implements nor a foreground colour of the theme;
- a form on a variable that has none, or in a place where a form cannot go;
- a modifier on `$bar`;
- a second `$bar`;
- a modifier with nothing before it;
- a `$name` the instrument does not have;
- a modifier inside a kind's format.

For one of Jefferson's instruments, the footer then renders the default row, and one warning names the fault ([Configuration](configuration.md#what-a-rejected-configuration-file-renders)). For an instrument from another extension, only that instrument is refused ([Configuration](configuration.md#an-extensions-instrument)).
