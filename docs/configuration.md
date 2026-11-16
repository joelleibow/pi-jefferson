# Configuration

Jefferson reads one configuration document: `pi-jefferson.json` in pi's agent directory, or
`.pi/pi-jefferson.json` in a trusted project. The project's document replaces the agent's whole.
Jefferson does not merge the two.

With no document, the footer renders the default row: ten `blank` instruments.

## The document

The document is an object with three keys:

| Key | Value |
| --- | --- |
| `rows` | A list of rows. Absent, or an empty list, renders the default row. |
| `instruments` | An object that configures instruments by name. See [Instruments](instruments.md). |
| `rowGap` | A whole number from 0 to 3: the empty lines between rows. The default is 1. |

A key Jefferson does not know is ignored, without a warning. A misspelt `rowgap`, for example,
renders the default gap.

## Rows

`rows` holds the rows in their render order. One row renders as one line of the footer.

A row is a list of entries. An entry is an object with one required key, `instrument`, and one
optional key, `align`:

```json
{
  "rows": [
    [
      { "instrument": "model" },
      { "instrument": "context", "align": "right" }
    ],
    [
      { "instrument": "path" }
    ]
  ]
}
```

| Entry key | Value |
| --- | --- |
| `instrument` | Required. The name of the instrument the entry renders. A non-empty string. |
| `align` | Optional. `left`, `right` or `center`. The default is `left`. `left` puts the space after the text, `right` puts it before, and `center` splits it. |

An entry carries no other key.

### The instrument's name

Every instrument has a registered name.

- A bare name means `jefferson.default.<name>`. So `"model"` and `"jefferson.default.model"` name
  one instrument, take one configuration, and render the same text.
- An instrument another extension provides is named `<extension>.<instrument>`, with two parts, such
  as `taiknr.savings`. A bare name never reaches one. Write the two parts.
- Each part of a name starts with a lowercase letter, then uses lowercase letters, digits and
  hyphens.

An entry renders `blank` when no instrument answers to its name. See
[Instruments](instruments.md#a-name-no-instrument-answers-to).

Jefferson renders a row's first ten entries and does not render the rest. It checks every entry, so
a fault after the tenth entry still rejects the document. An unknown name after the tenth entry
still warns.

A row with no entries rejects the document.

## How a row fills the width

By default an instrument takes the columns its text needs, so its neighbours sit against it.

An entry that fills takes the columns the row leaves instead. Two things fill: `blank`, and any
entry whose format holds `$bar`. Filling entries share the spare columns, and the earliest takes any
odd one.

When no entry fills, the spare columns go to the last left-aligned entry that has text. If no
left-aligned entry has text, they go to the first entry that has text, else to the first entry, even
when it has no text. An entry with no text, because its data is unknown, takes no columns.

Two neighbours that both have text get one column between them. That column gives way before any
text does when the row is too narrow. No column sits between them beside a filling entry, or where
the spare columns land.

An entry with no spare columns has nothing for `align` to pad, so `align` changes nothing in it.

## The gap between rows

`rowGap` sets the number of empty lines between each pair of rows. No empty line sits above row
one. The value is a whole number from 0 to 3, and the default is 1.

```json
{ "rowGap": 0, "rows": [[{ "instrument": "model" }], [{ "instrument": "path" }]] }
```

`rowGap: 0` renders the rows with no empty line between them.

## The instruments block

`instruments` configures an instrument once, by its name, for every entry that names it. Each value
is an object of that instrument's options:

```json
{
  "rows": [[{ "instrument": "model" }]],
  "instruments": {
    "model": {
      "format": "🧠: $model from $provider",
      "style": { "fg": "accent", "bold": true }
    }
  }
}
```

Every instrument takes `format`, `label` and `style`. The `notice` instrument also takes `seconds`
and `formats`. An option the instrument does not declare rejects the document. The options are in
[Instruments](instruments.md), and the format language is in [Formats](formats.md).

The name in this block is the registered name, so the shorthand above works here too. Write one name
once: a block that configures `"model"` and `"jefferson.default.model"` names one instrument twice,
and that rejects the document. The warning quotes both keys as you wrote them.

A provided instrument keeps the three settings above and no option. A setting it does not take does
not reject the document. It refuses that instrument alone: its entries render `blank`, one warning
names the instrument and the fault, and the rest of the document renders as configured.

An instrument the block does not configure renders its declared defaults.

## What a rejected document renders

Jefferson reads the document as one thing. One fault rejects all of it: the footer renders the
default row, and one warning names the offender.

The warning names the file and places the fault:

- `row 2:` places a fault in a whole row.
- `row 2, instrument 3:` places a fault in one entry: the third entry of the second row.

Both numbers count from 1.

A document Jefferson accepts can still carry a warning, when an entry, or the `instruments` block,
names an instrument that no instrument answers to. Jefferson joins the parts of that warning with
`; `, and it prints them after startup completes. An extension may register the name during startup,
and then the entry renders it.

These faults reject the document:

- The document is not an object.
- `instruments` is not an object, or one instrument's value is not an object.
- A retired top-level key is present. See [Upgrading](#upgrading). The warning shows the form to
  write in place of it:

  ```
  a row at the top level is retired; declare rows as {"rows": [[{"instrument": "model"}]]} and drop any top-level id or distribution
  ```

- `rows` is not a list.
- A row is not a list.
- A row is empty.
- An entry is not an object.
- An entry carries a key that is neither `instrument` nor `align`.
- An entry names no `instrument`.
- `instrument` is not a non-empty string.
- `align` is not `left`, `right` or `center`.
- `rowGap` is not a whole number from 0 to 3.
- A `format` or a `label` is not a string.
- An option the instrument does not declare, a format Jefferson cannot parse, a style it cannot
  use, a `seconds` outside 1 to 60, or a `formats` entry it cannot use.

A setting inside a provided instrument's entry refuses that instrument alone, not the document. The
list above is the rule for Jefferson's own instruments.

A file that is not valid JSON renders the default row, and its warning says the file could not be
read or parsed.

## Upgrading

0.13 makes a row a list of entries. A document needs three changes.

**1. Write a row as a list.** Earlier versions wrote a row as an object that held a list of
instruments. Write the list itself:

```json
{ "rows": [[{ "instrument": "model" }, { "instrument": "path" }]] }
```

A row written as an object rejects the document, and the warning shows the form to write. A row
written as `{}` rendered ten `blank` placeholders. Write it as a list of ten
`{"instrument": "blank"}` entries to keep them.

**2. Declare rows only in `rows`.** Earlier versions accepted one row at the top level of the
document. Now `rows` is the only way, and a document that declares a row at the top level rejects.
The warning shows the form to write:

```json
{ "rows": [[{ "instrument": "model" }]] }
```

**3. Drop the keys that placed a row.** A top-level `id` or `distribution`, or the key that earlier
versions held a row's list in, rejects the document. No key replaces them:

- A row no longer has an identifier. Its position in `rows` places it.
- Equal shares are no longer configurable. Every row sizes its instruments by the width their text
  needs.

`containers` is ignored, without a warning.
