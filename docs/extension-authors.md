# Write an extension that provides instruments

An extension in its own repository can put instruments in a user's footer. Jefferson renders them.
Your extension owns the data and the text; Jefferson owns the document and the row.

This page shows the whole job. It needs Jefferson 0.14.0 or later.

## What an instrument is

A row holds entries. An entry names one instrument. The instrument renders the text for that entry.

Jefferson ships eleven instruments. Your extension can add more. A user then names yours in a row,
beside Jefferson's own.

## Get the contract

The contract is types only. Install the package as a development dependency:

```bash
pnpm add --save-dev pi-jefferson
```

Import the types with `import type`. That import erases at build time, so your extension carries no
runtime dependency on Jefferson:

```ts
import type {
  FieldType, Registration, RegistrationChannel, Report, UpdateChannel,
} from "pi-jefferson/instruments";
```

The package exports one path, `pi-jefferson/instruments`. A deep import of any other path does not
resolve.

## The two channels

Jefferson publishes two channels on pi's event bus:

| Channel | What you post on it |
| --- | --- |
| `jefferson:registration` | Your instruments, and the fields you keep. |
| `jefferson:update` | The new value of one field. |

Jefferson answers neither one. Nothing comes back on a third channel, and nothing comes back with a
return value. You post a registration and later post updates.

Write each channel name once, in a constant typed by the contract. TypeScript then rejects a
misspelling:

```ts
const REGISTRATION: RegistrationChannel = "jefferson:registration";
const UPDATE: UpdateChannel = "jefferson:update";
```

## The order you write

Three steps, in this order:

1. Register from your `session_start` handler, before any `await`.
2. Report a value each time one of your fields changes.
3. Stop reporting when the session shuts down.

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function taiknr(pi: ExtensionAPI): void {
  pi.on("session_start", () => {
    // Step 1. No `await` before this line. `registration` is the object the
    // next sections build.
    pi.events.emit(REGISTRATION, registration);
  });

  pi.on("session_shutdown", () => {
    // Step 3. Cancel any timer that reports.
  });
}
```

Jefferson subscribes in its own factory, and the bus keeps no history. A registration you post from
your factory reaches nobody when your extension loads before Jefferson. Register from
`session_start`, and register before the first `await` in that handler. Jefferson warns about an
unknown name only after startup completes, and a registration that arrives in your `session_start`
handler arrives before that warning.

## Declare the fields you keep

Jefferson keeps the data. You declare the fields you need, with three types:

```ts
const fields: Readonly<Record<string, FieldType>> = { saved: "number", working: "boolean" };
```

| Type | The value |
| --- | --- |
| `"string"` | Text. |
| `"number"` | A finite number. |
| `"boolean"` | `true` or `false`. |

Fields belong to your extension, not to one instrument. Every instrument you register reads the
fields you declared. A field you never report reads as unknown.

A registration carries no first value. You declare the field, then report the value.

## Declare the instrument

```ts
const registration: Registration = {
  extension: "taiknr",
  fields,
  instruments: [
    {
      name: "savings",
      variables: {
        saved: (readings) => {
          const value = readings.saved;
          return typeof value === "number" ? `$${value.toFixed(2)}` : undefined;
        },
      },
      defaultFormat: "Savings: $saved",
    },
  ],
};
```

The registration holds four things:

- `extension`, your extension's own name.
- `fields`, the fields above. It is optional, and a registration may declare fields alone.
- `instruments`, the instruments you provide. An empty list is allowed.
- each instrument's `name`, `variables`, `defaultFormat` and optional `defaultLabel`.

Write the instrument's own name, one word. Jefferson builds the full name for the user:
`taiknr.savings`.

Your registration carries no options and no features that Jefferson's own instruments have. An
instrument of yours takes a format, a style and a label, and nothing else.

## Report a value

```ts
// In your extension, where `pi` is in scope.
const report: Report = { extension: "taiknr", field: "working", value: false };
pi.events.emit(UPDATE, report);
```

Use the words declare and report. A report names your extension, one field, and the value.

`false` is a value. A reported `false` reads as `false`, which is not the same as a field nobody has
reported. So an instrument can show whether something is happening, and a field nobody reports stays
unknown.

A report of the value the field already holds costs no repaint. Jefferson compares the two values and
repaints only on a change.

Jefferson keeps the latest value. A changed value reaches the footer at the next render.

Stop reporting at `session_shutdown`. Your event context goes stale after the session ends, and the
next report throws.

## What a resolver returns

A resolver returns text, or `undefined`.

- Text renders.
- `undefined` means unknown. The entry renders nothing, label included.
- `null` is a fault. Return `undefined` instead.

A resolver reads only the fields your extension declared. Jefferson hands it a view of those fields
and no other datum.

An instrument of yours renders only when every variable resolves. If one resolver returns
`undefined`, the entry renders nothing, and the rest of the row still renders.

## What your user writes

The user names your instrument in a row, and configures it in the `instruments` block:

```json
{
  "rows": [[{ "instrument": "taiknr.savings", "align": "right" }]],
  "instruments": {
    "taiknr.savings": { "format": "Saved: $saved", "label": "🏦" }
  }
}
```

A name with no dot means one of Jefferson's own instruments. A bare name never reaches yours, so
`"savings"` alone names nothing that your extension registered.

The block configures a format, a style and a label for your instrument. An option your instrument
does not take, such as `width`, refuses that instrument alone: its entries render blank, and one
warning names your instrument and the option. Every other entry renders as configured.

## A fault costs one entry

Your code cannot take the footer down. Jefferson contains a fault from a provided instrument to the
entry that holds it:

- A resolver that throws costs that entry its text.
- A resolver that returns a promise costs that entry its text. Jefferson observes the rejection, so pi
  keeps running.
- A resolver that returns anything other than text or `undefined` costs that entry its text.

The rest of the row renders. Every other row renders. The next render calls your resolver again.

Jefferson reports each fault once per session, so a resolver that throws on every render warns once.

## Refusals

Jefferson checks a registration before it accepts any part of it. The first fault refuses the whole
registration, and nothing from it registers:

- A registration that is not an object, or that carries no extension name.
- An extension name that is not lowercase, or that claims `jefferson`.
- An instrument name that is already registered, that is not one lowercase word, or that appears
  twice in one registration.
- A declaration with no `variables`, no `defaultFormat`, or a default format Jefferson cannot parse.
- A `defaultLabel` that is not a string, or a resolver that is not a function.
- A field type that is not one of the three.

A second registration from your extension merges its fields into the first. A field declared again
with the same type keeps its reported value. A field declared again with another type refuses the
second registration, and the first stays as it was.

## The warnings you see

Every warning is one line in pi's transcript. Jefferson prints the parts in the order it finds them,
and it prints each one once per session.

A warning that concerns your registration carries no document path, because the fault is not in the
user's document:

| What went wrong | The text |
| --- | --- |
| The payload is not an object | `pi-jefferson: a registration is not an object` |
| No extension name | `pi-jefferson: a registration carries no extension name` |
| An extension name outside the grammar | `pi-jefferson: a registration names the extension "Taiknr", which is not a lowercase name` |
| The extension claims `jefferson` | `pi-jefferson: a registration claims "jefferson", which belongs to Jefferson` |
| `instruments` missing or not an array | `pi-jefferson: registration from "taiknr" carries no instruments` |
| A declaration that is not an object | `pi-jefferson: registration from "taiknr" carries an instrument that is not a declaration` |
| A declaration with no name | `pi-jefferson: registration from "taiknr" carries a declaration with no name` |
| A name with a dot or an uppercase letter | `pi-jefferson: registration from "taiknr" carries "savings.total", which is not a single lowercase name` |
| A name already registered | `pi-jefferson: "taiknr.savings" is already registered, so this registration is refused` |
| One instrument named twice | `pi-jefferson: registration from "taiknr" carries "savings" twice` |
| No resolvers | `pi-jefferson: "taiknr.savings" carries no resolvers` |
| No default format | `pi-jefferson: "taiknr.savings" carries no default format` |
| A default format Jefferson cannot parse | `pi-jefferson: "taiknr.savings" carries a default format Jefferson cannot parse` |
| A default label that is not a string | `pi-jefferson: "taiknr.savings" carries a default label that is not a string` |
| A resolver that is not a function | `pi-jefferson: "taiknr.savings" carries a resolver "saved" that is not a function` |
| A field type outside the three | `pi-jefferson: registration from "taiknr" declares "saved" as "array", which is not string, number or boolean` |
| A field declared with another type | `pi-jefferson: registration from "taiknr" declares "saved" as both string and number` |
| A report that is not an object | `pi-jefferson: a report is not an object` |
| A report with no extension name | `pi-jefferson: a report carries no extension name` |
| A report with no field name | `pi-jefferson: a report carries no field name` |
| A report for an undeclared field | `pi-jefferson: taiknr reports "spent", which it did not declare` |
| A report with no registration | `pi-jefferson: taiknr reports "saved" without a registration` |
| A report of the wrong type | `pi-jefferson: taiknr reports "saved" as a string, and it declared a number` |
| A report of NaN or an infinity | `pi-jefferson: taiknr reports "saved" as a number that is not finite` |
| A resolver that threw | `pi-jefferson: "taiknr.savings" failed to render: its resolver threw` |
| A resolver that returned a non-string | `pi-jefferson: "taiknr.savings" failed to render: its resolver returned a number, where text is declared` |
| A resolver that returned a promise | `pi-jefferson: "taiknr.savings" failed to render: its resolver returned a promise` |

The wrong-type rows name the value with one word: `a string`, `a number`, `a boolean`, `a bigint`,
`a symbol`, `a function`, `an object`, `null`, or `nothing` when the value is missing. The resolver
row uses the same words apart from `a string` and `nothing`, because a string is text and
`undefined` is not a fault.

A warning that concerns the user's configuration carries the document's path and the instrument. Jefferson
refuses that instrument alone, so the user keeps the rest of the footer:

| What the user wrote | The text |
| --- | --- |
| A value that is not an object | `pi-jefferson: <path> the instruments block gives "taiknr.savings" a value that is not an object; its entries render blank` |
| A format that is not a string | `pi-jefferson: <path> "taiknr.savings" is configured with a format that is not a string; its entries render blank` |
| A format naming a variable you do not declare | `pi-jefferson: <path> "taiknr.savings" is configured with a format naming "$spent", which the instrument does not declare; its entries render blank` |
| An option your instrument does not take | `pi-jefferson: <path> "taiknr.savings" is configured with "width", which the instrument does not declare; its entries render blank` |
| A format Jefferson cannot parse | `pi-jefferson: <path> "taiknr.savings" is configured with a format Jefferson cannot parse; its entries render blank` |
| A style the theme refuses | `pi-jefferson: <path> "taiknr.savings" is configured with a style Jefferson cannot use; its entries render blank` |

The same sentence appears with `label` in place of `format` when the label is not a string.

Jefferson warns about a name that never registered in a form of its own:

```
pi-jefferson: <path> row 1: "taiknr.savings" is not a known instrument
```

That warning comes after startup completes. A name that registers later still renders, and the
warning stands.

## Versions and resolution

Jefferson 0.14.0 is the first version that publishes the contract.

- `nodenext`, `node16` and `bundler` module resolution all find `pi-jefferson/instruments`.
- `node10` resolution ignores the package's `exports`, so it finds nothing. Do not use it.
- The contract is types only. Your build imports nothing at runtime, so your extension needs no copy
  of the package when it runs.

## A whole extension

The sample under `tests/fixtures/sample-provider/` compiles against the published contract on every
release. Read it for a file you can copy.
