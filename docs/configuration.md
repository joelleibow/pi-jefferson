# Configuration

Jefferson reads one configuration file: `pi-jefferson.json` in pi's agent directory, or `.pi/pi-jefferson.json` in a trusted project. When a trusted project has its own file, Jefferson reads that file alone and ignores the agent's. It never merges the two.

With no configuration file, the footer renders the default row: ten `blank` instruments.

## The configuration file

The configuration file is a JSON object with three keys:

| Key | Value |
| --- | --- |
| `rows` | A list of rows. When it is absent or empty, the footer renders the default row. |
| `instruments` | An object that configures instruments by name. See [The instruments block](#the-instruments-block). |
| `rowGap` | A whole number from 0 to 3: the empty lines between rows. The default is 1. |

Jefferson ignores a key it does not know, and it gives no warning. So a misspelt `rowgap` leaves the default gap.

## Rows

`rows` lists the rows in the order they render. Each row is one line of the footer.

A row is a list of instruments. Each instrument in the list is an object with one required key, `instrument`, and one optional key, `align`:

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

| Key | Value |
| --- | --- |
| `instrument` | Required. The instrument's name, a non-empty string. |
| `align` | Optional. `left`, `right` or `center`, and `left` when absent. `left` puts the spare space after the text, `right` puts it before, and `center` splits it. |

Any other key is a fault.

Jefferson renders the first ten instruments in a row and drops the rest. It still checks every one, so a fault after the tenth rejects the configuration file, and an unknown name after the tenth still warns.

An empty row rejects the configuration file.

### Names

Every instrument has a full name.

- A name with no dot is one of Jefferson's own. `"model"` means `jefferson.default.model`, so the two spellings name one instrument, take one configuration and render the same text.
- An instrument from another extension has a name with a dot, such as `taiknr.savings`. Write that full name. It may hold more than one dot.
- Every name that starts with `jefferson.` belongs to Jefferson.

### A name no instrument answers to

A name no instrument answers to does not reject the configuration file. That instrument renders as `blank`, so one typo does not take the footer down.

Jefferson warns about the name once startup completes. It waits because another extension may register the name during startup, and a name registered by then renders with no warning. A name that registers after the warning renders from the next render on, and the warning stays in the transcript.

The warning places the name by its row:

```
pi-jefferson: <path> row 3: "taiknr.savings" is not a known instrument
```

One warning lists every row and name, in row order, joined with `; `. A name written twice in one row is listed once for that row.

## How a row fills the width

By default an instrument takes the columns its text needs, so its neighbours sit against it.

An instrument that fills takes the columns the row leaves instead. `blank` fills, and so does any instrument whose format holds `$bar`. An instrument from another extension may also fill. Instruments that fill share the spare columns, and the earliest takes any odd one.

When no instrument fills, the spare columns go to the last left-aligned instrument that has text. If no left-aligned instrument has text, they go to the first instrument that has text, or else to the first instrument, even when it has no text. An instrument with no text, because its data is unknown, takes no columns.

Two neighbours that both have text get one column between them. That column gives way before any text does when the row is too narrow. There is no such column beside an instrument that fills, or where the spare columns land.

`align` places the spare columns an instrument receives, so it changes nothing in an instrument that receives none.

## The gap between rows

`rowGap` sets the number of empty lines between each pair of rows. No empty line sits above row one. The value is a whole number from 0 to 3, and the default is 1.

```json
{ "rowGap": 0, "rows": [[{ "instrument": "model" }], [{ "instrument": "path" }]] }
```

With `rowGap: 0` the rows render with no empty line between them.

## The instruments block

`instruments` configures an instrument once, by name, wherever a row names it. Each value is an object of that instrument's options, which [Instruments](instruments.md#options) lists:

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

The block follows the same naming rule as a row. Configure an instrument under one spelling only: once that instrument has registered, a block that configures both `"model"` and `"jefferson.default.model"` rejects the configuration file, and the warning quotes both keys as you wrote them.

A key for an instrument that never registers draws no warning, whatever it holds. Jefferson checks it only when that instrument registers.

An instrument the block does not configure renders its defaults.

### An extension's instrument

Jefferson checks the settings of an instrument from another extension once it has both the configuration file and that instrument's registration, whichever arrives second. A fault refuses that instrument alone: it renders as `blank` wherever a row names it, and one warning names it and the fault. The rest of the configuration file renders as configured.

Jefferson reports the first fault it finds, once per session, after startup completes. The warnings are:

| What you wrote | The warning |
| --- | --- |
| A value that is not an object | `pi-jefferson: "taiknr.savings" is configured with a value that is not an object; it renders blank` |
| A format that is not a string | `pi-jefferson: "taiknr.savings" is configured with a format that is not a string; it renders blank` |
| A label that is not a string | `pi-jefferson: "taiknr.savings" is configured with a label that is not a string; it renders blank` |
| An option the instrument does not take | `pi-jefferson: "taiknr.savings" is configured with "width", which the instrument does not declare; it renders blank` |
| A format naming a variable the instrument does not have | `pi-jefferson: "taiknr.savings" is configured with a format naming "$spent", which the instrument does not declare; it renders blank` |
| Any other format Jefferson cannot parse | `pi-jefferson: "taiknr.savings" is configured with a format Jefferson cannot parse; it renders blank` |
| A style Jefferson cannot use | `pi-jefferson: "taiknr.savings" is configured with a style Jefferson cannot use; it renders blank` |
| `formats` that is not an object | `pi-jefferson: "taiknr.savings" is configured with formats that is not an object; it renders blank` |
| A kind the instrument does not have | `pi-jefferson: "taiknr.savings" is configured with a formats kind "sleepy", which the instrument does not carry; it renders blank` |
| A kind whose text is not a string | `pi-jefferson: "taiknr.savings" is configured with a formats kind "busy" whose format is not a string; it renders blank` |
| A kind whose text Jefferson cannot parse | `pi-jefferson: "taiknr.savings" is configured with a formats kind "busy" whose format Jefferson cannot parse; it renders blank` |

When several warnings are due at once, they print as one line, joined with `; `. A configuration file that is rejected for another reason reports none of these.

## What a rejected configuration file renders

Apart from the two cases above, an unknown name and an extension's instrument, Jefferson reads the configuration file as one thing. One fault rejects all of it: the footer renders the default row, and one warning names the fault:

```
pi-jefferson: <path> was rejected (<fault>); rendering the default row
```

The warning places a fault in a row:

- `row 2:` places it in the second row as a whole.
- `row 2, instrument 3:` places it in the third instrument of the second row.

Both numbers count from 1.

These faults reject the configuration file:

- The configuration file is not an object.
- `instruments` is not an object, or it gives one of Jefferson's instruments a value that is not an object.
- A retired top-level key is present. See [Upgrading](#upgrading). The warning shows the form to write instead:

  ```
  a row at the top level is retired; declare rows as {"rows": [[{"instrument": "model"}]]} and drop any top-level id or distribution
  ```

- `rows` is not a list.
- A row is not a list.
- A row is empty.
- An instrument in a row is not an object.
- An instrument in a row has a key other than `instrument` and `align`.
- An instrument in a row has no `instrument` key.
- `instrument` is not a non-empty string.
- `align` is not `left`, `right` or `center`.
- `rowGap` is not a whole number from 0 to 3.
- One of Jefferson's instruments is configured with a `format` or a `label` that is not a string, an option it does not take, a format Jefferson cannot parse, a style Jefferson cannot use, `seconds` outside 1 to 60, or a `formats` kind it cannot use.
- The `instruments` block configures one registered instrument under two spellings.

A file that is not valid JSON renders the default row too, and its warning says the file could not be read or parsed.

## Upgrading

0.13 makes a row a list of instruments. A configuration file written for an earlier version needs three changes.

**1. Write a row as a list.** Earlier versions wrote a row as an object that held a list of instruments. Write the list itself:

```json
{ "rows": [[{ "instrument": "model" }, { "instrument": "path" }]] }
```

A row written as an object rejects the configuration file, and the warning shows the form to write. A row written as `{}` used to render ten `blank` placeholders. To keep them, write a list of ten `{"instrument": "blank"}` objects.

**2. Declare rows only in `rows`.** Earlier versions accepted one row at the top level of the configuration file. Now `rows` is the only place for a row, and a row at the top level rejects the configuration file. The warning shows the form to write:

```json
{ "rows": [[{ "instrument": "model" }]] }
```

**3. Drop the keys that placed a row.** A top-level `id` or `distribution`, or the key that earlier versions held a row's list in, rejects the configuration file. No key replaces them:

- A row no longer has an identifier. Its position in `rows` places it.
- Equal shares are no longer configurable. Every row sizes each instrument by the width its text needs.

Jefferson ignores `containers`, and it gives no warning.
