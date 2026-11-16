# Provide instruments from your extension

Your extension supplies the data: its fields, the variables they resolve to, and a default format. The user decides where the instrument goes and can change its format in `pi-jefferson.json`. Jefferson draws it.

This needs Jefferson 0.14.0 or later.

## Fields and variables

This page uses two words for two different things.

- **Fields** are the values your extension posts, and Jefferson stores them.
- **Variables** are what a user's format can print, such as `$saved`. Each variable is a function that reads your fields and returns text.

## The contract

The contract is a set of TypeScript types in the `pi-jefferson` package. Install the package as a development dependency:

```bash
pnpm add --save-dev pi-jefferson
```

The types live at `pi-jefferson/instruments`, the only path the package exports. That path holds types only, so an `import type` of it leaves nothing behind when your extension builds, and your extension needs no copy of Jefferson at runtime.

## Two messages

Your extension posts two messages on pi's event bus, `pi.events`:

| Channel | What you post |
| --- | --- |
| `jefferson:registration` | A registration: your instruments and the fields they read. |
| `jefferson:update` | An update: the new value of one field. |

Jefferson replies on neither channel. The contract names the two channels' types `RegistrationChannel` and `UpdateChannel`.

Post your registration from your `session_start` handler, before its first `await`. The bus keeps no history, so a registration posted earlier is lost when your extension loads before Jefferson. A registration that arrives after startup still works, but a user whose row names your instrument sees a "not a known instrument" warning first.

At `session_shutdown`, Jefferson drops your registration and your fields' values. Your next `session_start` handler registers again, and each field has no value until you post one. An update posted between the shutdown and that registration is refused with a warning.

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { Registration, Report } from "pi-jefferson/instruments";

const registration: Registration<"taiknr"> = {
  extension: "taiknr",
  fields: { saved: "number" },
  instruments: [
    {
      name: "savings",
      variables: {
        saved: (readings) => {
          const value = readings["saved"];
          return typeof value === "number" ? `$${value.toFixed(2)}` : undefined;
        },
      },
      defaultFormat: "$saved",
      defaultLabel: "Saved:",
    },
  ],
};

export default function taiknr(pi: ExtensionAPI): void {
  let saved = 0;

  pi.on("session_start", () => {
    pi.events.emit("jefferson:registration", registration);
  });

  pi.on("turn_end", () => {
    saved += 0.25;
    const update: Report = { extension: "taiknr", field: "saved", value: saved };
    pi.events.emit("jefferson:update", update);
  });
}
```

After the first turn, a row that names `taiknr.savings` shows `Saved: $0.25`.

## The registration

A registration has three parts:

- `extension`, your extension's name.
- `fields`, the name and type of each value you post. It is optional.
- `instruments`, the instruments you provide. An empty list is allowed, so a registration can declare fields alone.

Jefferson ignores a key it does not know, in a registration and in an update.

### Names

Each instrument is named `<extension>.<name>`, so taiknr's `savings` is `taiknr.savings`. Either part may be any string. Names that start with `jefferson.` belong to Jefferson: a registration that claims one is refused, and the contract's types reject it at compile time.

`Registration` takes your extension's name as its type parameter, as in `Registration<"taiknr">`. When that name is `jefferson`, or starts with `jefferson.`, `tsc` fails with error TS2344 and the text `a name under jefferson. belongs to Jefferson`.

Users place your instrument by its full name, `taiknr.savings`.

### Fields

Jefferson stores the values of the fields you declare. Your extension posts them, and your instruments' variables read them. Every instrument your extension registers reads all of your extension's fields. No extension reads another extension's fields, or pi's session data.

A field takes one of three types:

| Type | The value |
| --- | --- |
| `"string"` | Text. |
| `"number"` | A finite number. |
| `"boolean"` | `true` or `false`. |

You may post more than one registration. Each must claim instrument names that no earlier registration took. Its fields merge into the ones you already declared:

- A new field is added.
- A field declared again with the same type keeps the value it holds.
- A field declared again with another type refuses the later registration, and the earlier one stays as it was.

### An instrument

Each instrument in `instruments` has four parts:

- `name`, the instrument's own name, without your extension's.
- `variables`, an object of functions, one for each variable. The key is the variable's name, so `saved` is `$saved` in a format. Each function receives your fields and returns text.
- `defaultFormat`, the format the instrument renders until the user configures one. It is written in Jefferson's [format language](formats.md), and it may name only your variables.
- `defaultLabel`, optional: the text in front of the format until the user configures a label. [The label](instruments.md#the-label) says how Jefferson trims it and spaces it.

A variable returns text, or `undefined` when it has no value yet. Returning anything else is a fault.

On each render, Jefferson calls only the variables the format names. When one of them returns `undefined`, the instrument renders nothing, label included. A variable the format does not name is never called, so it cannot blank the instrument.

## Updates

Post an update on `jefferson:update` whenever a field's value changes. An update carries your extension's name, the field, and its new value. The contract names its type `Report`.

Jefferson keeps the latest value of each field. An update that changes the value repaints the footer. An update that repeats the value the field already holds costs nothing.

## More an instrument can do

An instrument can carry anything Jefferson's own instruments use. Each of these members is optional:

| Member | What it adds |
| --- | --- |
| `variableForms` | Named forms of a variable, such as `$saved\|cents`. |
| `bar` | The percentage `$bar` draws. |
| `fills` | Whether the instrument takes the row's spare columns. |
| `variableFg` | A foreground colour for a variable, chosen from its text. |
| `composed` | A set of formats, one per kind, chosen from your fields. |
| `options` | `["formats"]`, which lets the user rewrite each kind's text. |

This instrument uses all six:

```ts
import type { Registration } from "pi-jefferson/instruments";

const dollars = (value: number): string => `$${value.toFixed(2)}`;

export const registration: Registration<"taiknr"> = {
  extension: "taiknr",
  fields: { saved: "number", budget: "number", working: "boolean" },
  instruments: [
    {
      name: "budget",
      variables: {
        saved: (readings) => {
          const value = readings["saved"];
          return typeof value === "number" ? dollars(value) : undefined;
        },
        state: () => undefined,
      },
      variableForms: {
        saved: {
          cents: (readings) => {
            const value = readings["saved"];
            return typeof value === "number" ? `${Math.round(value * 100)}¢` : undefined;
          },
        },
      },
      bar: (readings) => {
        const value = readings["budget"];
        return typeof value === "number" ? value : null;
      },
      fills: true,
      variableFg: {
        state: (value) => (value.startsWith("Saving") ? "accent" : undefined),
      },
      composed: {
        variable: "state",
        variables: {
          saved: (readings) => {
            const value = readings["saved"];
            return typeof value === "number" ? dollars(value) : undefined;
          },
        },
        select: (readings) => {
          const working = readings["working"];
          return working === true ? "busy" : working === false ? "idle" : undefined;
        },
        formats: { busy: "Saving $saved", idle: "Idle" },
      },
      options: ["formats"],
      defaultFormat: "$state $bar",
      defaultLabel: "taiknr:",
    },
  ],
};
```

### `variableForms`

A form is another rendering of a variable's value. `variableForms` maps a variable's name to its forms, and each form is a function that receives your fields and returns text or `undefined`, as a variable does. The variable itself must be in `variables`.

Above, `saved` has the form `cents`. A user who writes `$saved|cents` sees `412¢`, and a bare `$saved` still renders `$4.12`. A form comes directly after its variable, before any modifier ([Formats](formats.md#forms)). When the form returns `undefined`, the instrument renders nothing.

### `bar`

`bar` lets a format name `$bar`. It is a function that receives your fields and returns a percentage. `$bar` always means the bar, whatever your variables are called.

- A number fills that share of the bar. Below 0 the bar is empty, and above 100 it is full.
- `null` draws the bar's track unfilled.
- `undefined` means no value, so an instrument whose format names `$bar` renders nothing.

The user places `$bar` anywhere in the format, and it takes the width the rest of the format leaves. Its colours and its limits are in [Formats](formats.md#the-bar). A format that holds `$bar` makes the instrument fill the row.

### `fills`

`fills: true` makes the instrument take the row's spare columns, as `blank` does, whatever its format. Without it, the instrument fills only when its format holds `$bar`. [Configuration](configuration.md#how-a-row-fills-the-width) says how instruments that fill share the columns.

### `variableFg`

`variableFg` maps a variable's name to a function that chooses the variable's foreground colour. The function receives the variable's text, before any modifier changed it, and returns the name of a theme colour token, or `undefined` for no colour of its own.

The token replaces the `fg` of the user's `style` on that variable's text only. The user's `bg` and attributes still apply, and the rest of the text keeps the user's `fg`. Above, `$state` turns `accent` while taiknr is saving. A token the theme does not have is a fault, and the variable keeps the user's style.

### `composed`

`composed` gives the instrument one text for each kind of thing it shows, and your fields choose which one shows. It has four parts:

- `variable`, the variable the chosen text fills. The format names it like any other variable, so it must be in `variables` too. Above it is `state`, and Jefferson fills `$state` with the chosen text instead of calling the function in `variables`.
- `variables`, the values a kind's text may name, as functions in the same shape as `variables`.
- `select`, a function that receives your fields and returns the key of the kind to show, or `undefined` for none.
- `formats`, the default text for each key.

A kind's text is plain: it takes no modifier and no form ([Formats](formats.md#composed-formats)). A value it names that returns `undefined` renders as nothing in its place. When `select` returns `undefined`, or the chosen text comes out empty, the instrument renders nothing, label included.

Above, while `working` is `true` the instrument reads `taiknr: Saving $4.12` and a bar. While it is `false` it reads `taiknr: Idle` and a bar. Before `working` has a value it shows nothing.

### `options`

`options: ["formats"]` lets the user rewrite the text of each kind in the `instruments` block. It requires `composed`.

```json
{
  "rows": [[{ "instrument": "taiknr.budget" }]],
  "instruments": {
    "taiknr.budget": { "formats": { "busy": "Économie de $saved" } }
  }
}
```

A kind the user leaves out keeps your default text. Without `options`, a user's `formats` refuses the instrument. `formats` is the only option Jefferson offers beyond `format`, `label` and `style`, which every instrument takes.

## What the user writes

The user places your instrument in a row and configures it in the `instruments` block, as for any instrument:

```json
{
  "rows": [[{ "instrument": "taiknr.savings", "align": "right" }]],
  "instruments": {
    "taiknr.savings": { "format": "Saved $saved", "label": "🏦" }
  }
}
```

A setting your instrument cannot take refuses that instrument alone, and the rest of the user's footer renders as configured. [Configuration](configuration.md#an-extensions-instrument) lists those warnings.

## A fault costs one instrument

Jefferson contains a fault in your functions to the instrument that has it:

- A function that throws costs the instrument its text.
- A function that returns a promise costs the instrument its text. Jefferson observes the promise's rejection, so pi keeps running.
- A function that returns a value of the wrong kind costs the instrument its text.
- A `variableFg` function that faults costs only its colour, and the instrument still renders.

The rest of the row renders, and so does every other row. The next render calls your function again.

## A refused registration

Jefferson checks a whole registration before it accepts any of it. The first fault refuses the registration: none of its instruments registers, and none of its fields is declared. [Warnings](#warnings) lists every fault, in the order Jefferson checks for them.

## Warnings

Jefferson prints warnings in pi's transcript, and none before startup completes. Warnings found together print as one line, joined with `; `, after the "not a known instrument" warning when there is one. Jefferson prints each warning once per session, so a function that throws on every render warns once.

Warnings about your registration and your updates carry no file path, because the fault is not in the user's configuration file. In these warnings, "resolver" means a function under `variables`, `variableForms` or `composed.variables`.

| What went wrong | The warning |
| --- | --- |
| The registration is not an object | `pi-jefferson: a registration is not an object` |
| It has no extension name | `pi-jefferson: a registration carries no extension name` |
| The extension is `jefferson` or starts with `jefferson.` | `pi-jefferson: a registration claims "jefferson.custom", which belongs to Jefferson` |
| `instruments` is missing or not a list | `pi-jefferson: registration from "taiknr" carries no instruments` |
| An instrument is not an object | `pi-jefferson: registration from "taiknr" carries an instrument that is not a declaration` |
| An instrument has no name | `pi-jefferson: registration from "taiknr" carries a declaration with no name` |
| The name is already registered | `pi-jefferson: "taiknr.savings" is already registered, so this registration is refused` |
| The registration lists a name twice | `pi-jefferson: registration from "taiknr" carries "savings" twice` |
| No `variables` object | `pi-jefferson: "taiknr.savings" carries no resolvers` |
| No `defaultFormat` | `pi-jefferson: "taiknr.savings" carries no default format` |
| An optional member of the wrong shape | `pi-jefferson: "taiknr.savings" carries fills Jefferson cannot use`, with `bar`, `variableForms`, `variableFg`, `composed` or `options` in place of `fills` |
| An option Jefferson does not offer | `pi-jefferson: "taiknr.savings" declares the option "seconds", which Jefferson does not implement` |
| `formats` without `composed` | `pi-jefferson: "taiknr.savings" declares "formats" without a composed format set` |
| A default format Jefferson cannot parse | `pi-jefferson: "taiknr.savings" carries a default format Jefferson cannot parse` |
| A `defaultLabel` that is not a string | `pi-jefferson: "taiknr.savings" carries a default label that is not a string` |
| A variable that is not a function | `pi-jefferson: "taiknr.savings" carries a resolver "saved" that is not a function` |
| A composed text Jefferson cannot parse | `pi-jefferson: "taiknr.savings" carries a composed format "busy" Jefferson cannot parse` |
| A field type outside the three | `pi-jefferson: registration from "taiknr" declares "saved" as "array", which is not string, number or boolean` |
| A field declared again with another type | `pi-jefferson: registration from "taiknr" declares "saved" as both string and number` |
| An update that is not an object | `pi-jefferson: a report is not an object` |
| An update with no extension name | `pi-jefferson: a report carries no extension name` |
| An update with no field name | `pi-jefferson: a report carries no field name` |
| An update before any registration | `pi-jefferson: taiknr reports "saved" without a registration` |
| An update for a field you did not declare | `pi-jefferson: taiknr reports "spent", which it did not declare` |
| An update of the wrong type | `pi-jefferson: taiknr reports "saved" as a string, and it declared number` |
| An update of NaN or an infinity | `pi-jefferson: taiknr reports "saved" as a number that is not finite` |
| A function that threw | `pi-jefferson: "taiknr.savings" failed to render: its resolver threw` |
| A function that returned a promise | `pi-jefferson: "taiknr.savings" failed to render: its resolver returned a promise` |
| A function that returned the wrong kind of value | `pi-jefferson: "taiknr.savings" failed to render: its resolver returned a number, where text is declared` |

The last three name the function that faulted: `resolver`, `select`, `bar`, or `colour` for a `variableFg` function. The wrong-value warning names what was declared: `text` for a resolver or `select`, `a finite number or null` for `bar`, and `a theme colour` for a colour. A colour token the theme does not have is quoted: `its colour returned "nope", where a theme colour is declared`.

The wrong-type and wrong-value warnings name a value with one of these: `a string`, `a number`, `a boolean`, `a bigint`, `a symbol`, `a function`, `an object` (arrays included), `null`, or `nothing` when an update has no value.

## Module resolution

- `nodenext`, `node16` and `bundler` module resolution all find `pi-jefferson/instruments`.
- `node10` resolution ignores the package's `exports`, so it finds nothing.

## The sample provider

[`tests/fixtures/sample-provider/`](https://github.com/joelleibow/pi-jefferson/tree/main/tests/fixtures/sample-provider) holds a sample provider. It compiles against the packed contract on every pull request and push. The npm package does not ship it.
