# Design

## Context

An extension cannot put anything in the footer today: the only source of a row's instrument is a
declaration compiled into this package (`research-eleanor.md` §1, §3; `proposal.md` has the
motivation). Registration becomes a bus feature, Jefferson's own instruments take the same path, and
a small published contract carries the types.

The constraints that shape the approach:

- **The bus is an anonymous, synchronous emitter with no replay.** A listener hears an emit only if
  it was subscribed at that moment, and a payload is typed `unknown` (`research-chidi.md` §1;
  `michael-orientation.md` T1, T8). A package-installed Jefferson loads at rank 4, after local
  extensions, so a provider that registers from its factory is often lost.
- **Registrations and reports can arrive before the store exists**, because `session_start` handlers
  run one at a time in extension order and each is awaited (T2).
- **No host event marks "startup has completed".** `resources_discover` fires after every extension's
  `session_start` handler on every path that starts a session, but only when someone handles it
  (T4, corrected by `michael-council-rulings.md` row 20).
- **A late registration must change an installed footer**, and today the tree copies each cell's
  `fills` when it is built (T5).
- **Each extension gets its own copy of every module**, so the contract carries no `Symbol`, class,
  `instanceof` or module-level state (T10).
- **A published `.ts` subpath has costs**: a `tsc` under `nodenext` needs an `exports` entry, plain
  Node refuses to strip types under `node_modules`, and pi does not install peer dependencies
  (`research-chidi.md` §4; T11).
- **`data/` imports nothing outside itself** (T14), and the tarball ships only what `files` names,
  which today is `extensions/`, `README.md` and `LICENSE` (`ci.yml:55-59`).

`council.md` records what the seven lenses found and the twenty-nine rulings Michael settled. Two
mechanisms were left to this document: the seam an installed footer takes for a late registration
(C14), and the seam the configuration reader takes for what has registered (R-11). Joel's types-only
ruling is the contract's shape (`owner-rulings.md`, 2026-11-15, "The contract is types-only").

## Goals / Non-Goals

**Goals:**

- An extension in its own repository registers one or several instruments, declares the fields
  Jefferson keeps, reports values, and sees its instruments render in a user's configured row.
- Jefferson's own eleven instruments register by the same message, through the same registry, so
  there is one path and no static lookup (D2, S4).
- Names are unambiguous and permanent: `<extension>.<instrument>` for a provider,
  `jefferson.default.<name>` for Jefferson's own, a bare name as the document's shorthand (D6, D7).
- A provided instrument that is unregistered renders `blank` and warns after startup, then renders as
  soon as it registers (D7; M3).
- A fault in provider code costs one entry's text and one warning per session, never the footer
  (M1, M8).
- The contract is published as types only, so a provider needs no runtime dependency on this package
  (`owner-rulings.md`, "The contract is types-only"; M23).
- `docs/extension-authors.md` teaches an author to do all of it, and contributor documentation moves
  to a root `CONTRIBUTING.md` (`owner-rulings.md`, "Contributor documentation moves out of the user
  docs").

**Non-Goals:**

- The spinner, any animation clock, and any timed visual for a provider (D8; M14).
- `jefferson.custom.*`, user-composed instruments (D6).
- `shownUntil` for providers, which a later change builds on change 3's timer (`owner-rulings.md`,
  2026-11-16).
- Per-field generic typing for a provider's resolvers (decision 4).
- The taiknr repository (D1), and any change to how Jefferson's own host data arrives
  (`michael-orientation.md` §2).
- A readiness message from Jefferson (D5; M28).
- Node10 module resolution, which ignores `exports` (M24).

## Module & File Placement

Ten new files, and the homes beside them.

| File | Single responsibility | Depends on |
|---|---|---|
| `extensions/jefferson/instrument-contract.ts` (new) | The published contract: the two messages' payload shapes, the declaration with its optional `variableForms`, `bar`, `fills`, `variableFg`, `composed` and `options`, `ComposedFormat<R>`, and the channel names as string-literal types; re-exports `FieldType`, `FieldValue` and `ReadingsView` from `data/field-value.ts`. Type declarations only. | `data/field-value.ts` (types) |
| `extensions/jefferson/registration.ts` (new) | What a name means and what has registered: the reserved prefix `jefferson.`, the full-name rule, and the registry that holds registrations, answers a lookup, and keeps the watch table — `watch(name, apply)`, accepting a name runs that name's watches once and drops them, and `releaseWatches()`. Pure; no bus, no pi. | `instrument-contract.ts` (types), `components/instruments/instrument.ts` (types) |
| `extensions/jefferson/registration-listener.ts` (new) | The bus boundary: subscribes `jefferson:registration` and `jefferson:update`, emits Jefferson's own payload on the registration channel, validates each payload, asks the field holding's check, adapts each declaration and parses its default format, checks each optional member and the composed kind formats, refuses a member or option Jefferson cannot offer, hands it to the registry, requests the one repaint an accepted registration takes, and records every refusal. The only file that calls `on` or `emit` on the bus, and the only one that writes the two channel strings at runtime. | `registration.ts`, `faults.ts`, `data/provider-fields.ts`, `instrument-contract.ts`, `components/instruments/instrument.ts` (types), `components/instruments/instrument-binding.ts` (for the adapter, `describeValue` and the parse) |
| `extensions/jefferson/faults.ts` (new) | The faults this session has reported: dedupes by scope and kind, queues what arrives before delivery opens, and delivers once. | nothing |
| `data/field-value.ts` (new) | The value a provider's field holds (`FieldValue`: `string`, finite `number` or `boolean`), the three types it takes (`FieldType`), and the view a provided resolver reads (`ReadingsView`). Type declarations only, so the holding reads them without importing the contract (T14) and the store, the holding and the published contract read one declaration (M23). | nothing |
| `data/provider-fields.ts` (new) | The fields providers declared and the latest value each reported, with every rule about them: one runtime record of the three types, one check that changes nothing for a type outside the three or a conflict with an earlier accepted registration's type, the report value check, then declare, report, view per extension and clear — `declare` commits and decides nothing. Store data, so it sits with the store and imports nothing outside `data/`. | `data/field-value.ts` |
| `tests/fixtures/sample-provider/provider.mts` (new) | The provider the CI fixture check compiles: it imports the two channel literal types and builds a `Registration<"sample-provider">` with a boolean and a number field, one resolver and no `defaultLabel`, plus a `Report` of `false`, and a second instrument using every optional member. The `.mts` extension keeps it out of `tsconfig`'s `tests/**/*.ts` and out of `node --test`'s patterns, and fixes ESM without a package.json. | `pi-jefferson/instruments` (types) |
| `tests/fixtures/sample-provider/tsconfig.json` (new) | The provider's own flags: target and lib ES2021, module and moduleResolution `nodenext`, `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noEmit`, and `types: []`. | nothing |
| `tests/fixtures/sample-provider/reserved.mts` (new) | A registration under `jefferson.` the packaging check requires to fail its type check with TS2344: `Registration<"jefferson.custom">`. A passing compile is a CI failure. | `pi-jefferson/instruments` (types) |
| `tests/fixtures/sample-provider/tsconfig.reserved.json` (new) | Extends the fixture's tsconfig and includes `reserved.mts`. | nothing |
| `tests/session-harness.ts` (new) | `harness()`, moved out of `tests/jefferson.test.ts` unchanged, so both that file and `tests/registration.test.ts` use one fake `pi`. Its fake `pi` gains `events: createEventBus()`; `harness()` takes `beforeFactory` and `start()` takes `afterSessionStart`; `start()` fires `resources_discover` after `session_start` when a handler exists; and the harness exposes `events` (M27). |
| `tests/shipped-instrument.ts` (new) | The helper M27 requires: it looks a shipped declaration up in `SHIPPED` by its bare name, replacing `instrumentNamed` for the tests. It is not a `*.test.ts`, as `tests/fake-theme.ts` is not, so `node --test` never runs it. | `extensions/jefferson/shipped.ts` |

Modified files:

| File | Change |
|---|---|
| `extensions/jefferson/format.ts` | `formatError` drops the declaration's name: a parse error is `format <detail>`, and the reader names the instrument, as it already does for `validateStyle`. It resolves only what the format names, and it passes the render's theme to `variableFg` (design 5, 20; K13). |
| `extensions/jefferson/components/visuals/bar.ts` | Clamps a negative fill, so a provider's bar below zero draws its track unfilled rather than past its start (decision 10; K14). |
| `extensions/jefferson/shipped.ts` | Exports the list Jefferson registers (`SHIPPED`) and the two roles the reader needs, read from the declaration files it already imports: `FALLBACK`, the `blank` declaration, and `NOTICE_GATE`, the notice declaration's registered name with its default seconds. `instrumentNamed` goes, and with it the static lookup (T13; decisions 8, 14). |
| `extensions/jefferson/components/instruments/*.ts` (eleven) | Each declaration's `name` becomes its registered name, `jefferson.default.<name>` (decision 5). In `notice.ts`, `NOTICE_SECONDS` stays where it is, so that file's exports stay `["NOTICE_SECONDS", "notice"]`, and its `name` is the one home of `jefferson.default.notice` (decision 8). `context.ts`'s `bar` returns `undefined` with no usage (decision 20). |
| `extensions/jefferson/components/instruments/instrument.ts` | `InstrumentDeclaration` is `Omit<ContractDeclaration<Readings>, "variableFg" | "options">` plus `variableFg` with the render's theme, `shownUntil`, and a required `options`; `ComposedFormat` comes from the contract, so one declaration shape reaches the contract's checks and change 3 adds its visual mix-in once (design 3; `owner-rulings.md`, 2026-11-16). `bar` may return `undefined` (decision 20). |
| `extensions/jefferson/components/instruments/instrument-binding.ts` | Exports three functions: `adaptProvidedDeclaration`, which the listener calls at acceptance to adapt a contract declaration to an `InstrumentDeclaration` over `Readings` and check each resolver's result; `describeValue`, the one home of the `<what>` vocabulary both fault rows use; and `containProvided`, which wraps a bound `Instrument`'s render and reads `fills` through to it. The read's own `bind` applies the wrapper, so neither bind moment can miss it (decisions 6, 9, 10, 14). The composed path renders nothing when there is nothing to compose (decision 20). |
| `extensions/jefferson/configuration.ts` | Resolves every document name through the registry after normalization, keys the configured map by the resolved name, gates the notice path on the name and default seconds the source carries, passes `registry.watch` as the source's `watch`, returns its unknown names as data in `unknownNames` (each `{ written, normalized, row? }`) and the document path it chose in `path`, and exports `acceptedWarning(path, unknownNames)`, the composer delivery calls, whose two D17 forms are unchanged. It applies `containProvided` inside its own `bind`, and imports neither `blank.ts` nor `notice.ts` (decisions 8, 9, 10, 12, 13). |
| `extensions/jefferson/startup.ts` | The composition root: creates the registry, the ledger and the field holding in the factory; builds Jefferson's payload from `SHIPPED` and hands it to the listener's constructor, which subscribes both channels and emits it; moves the repaint slot out of the `session_start` body into the factory, where `installFooter`'s `receiveRepaint` sets it and the shutdown body clears it; takes the fallback and the notice gate from `shipped.ts` when it builds the reader's source; adds the `resources_discover` handler that opens delivery; threads the report sink; and drops provider state at `session_shutdown`. It passes `pi.events` to the listener's constructor and calls nothing on it (decisions 6, 8, 9, 11, 12, 19). |
| `extensions/jefferson/components/row/row.ts` | A cell holds `{ name, holder: { current: Instrument }, align }`: the resolved full name the notice gate compares, the holder a registration can fill, and its alignment. It carries no `instrument` key (decision 9). |
| `extensions/jefferson/components/row/row-renderer.ts` | Reads `fills` from the holder on every plan rather than copying it when the tree is built, and reads `render` from the holder (decision 9). |
| `package.json` | Gains `exports` with `./instruments` alone; `files` does not change (decision 2). |
| `.github/workflows/ci.yml` | The existing pack step gains its export-target assertion on the packed manifest and the fixture check: copy `tests/fixtures/sample-provider` to `$tmp/provider`, extract the packed tarball into `$tmp/provider/node_modules/pi-jefferson` with `--strip-components=1`, then run `pnpm exec tsc -p "$tmp/provider/tsconfig.json"`, and the reserved fixture's required failure (decisions 2, 14). |
| `tests/jefferson.test.ts` | Imports `harness()` from `tests/session-harness.ts`; the export pin gains the contract file with no runtime exports and drops `instrumentNamed` with its stability block; the contribution scan is rewritten (decision 14). |
| `tests/configuration.test.ts`, `tests/row-renderer.test.ts`, `tests/session-data-feed.test.ts`, `tests/format.test.ts`, `tests/instrument.test.ts` | Cells read `holder.current` and every cell literal takes decision 9's shape; `configuration.test.ts`'s two `Object.keys(cell)` assertions expect `["name", "holder", "align"]`, built in that order, and its `readDocument` and seven direct literals build the source from one real-object helper; `instrument.test.ts`'s inherited-name test moves to the registry's test; `instrument.test.ts`'s name assertions expect `jefferson.default.<name>`; and each of the five files replaces `instrumentNamed` with `tests/shipped-instrument.ts` (M27; decisions 5, 8, 9). |

**Why these homes.** `instrument-contract.ts` sits directly under the load root because that is where
`tsconfig.json` and the tarball already reach; a contract outside `extensions/` fails CI and escapes
the type check (T11). `registration.ts` and `registration-listener.ts` are the sixth responsibility
the spec deltas admit — registration — split where the reasons to change differ: the platform's bus
API against the naming and claim rules. `faults.ts` is one reason to change (who has been told, and
when delivery happens) and is imported by the boundary, the binding and the composition root, so it
can sit in none of them. `data/field-value.ts` and `data/provider-fields.ts` sit in `data/` because
the store reads them and `data/` may import nothing outside itself (T14, M25).

No new grouping directory. The deltas require one that appears to hold the files of a single
responsibility and to import only its own directory, the types of `data/` and host packages; a
`registration/` directory holding `registration.ts` next to `instrument-contract.ts` would have to
import `components/instruments/instrument.ts`, which that rule forbids.

## Decisions

### 1. The contract is one file of type declarations

`extensions/jefferson/instrument-contract.ts` holds type declarations only, with no runtime
statement, and imports only `data/field-value.ts`, which is also types only. It imports no runtime
file of this package and may import pi's published type packages. The two channels,
`jefferson:registration` and `jefferson:update`, are string-literal types, and a provider writes the
literal (decision 18).

*Why.* Joel's types-only ruling, and M23: a runtime statement would force every provider to carry
`pi-jefferson` as a full dependency, because pi suppresses peer installation for the packages it
manages and plain Node refuses to strip types under `node_modules` (`research-chidi.md` §4; T11). A
types-only contract is erased, so a provider's `import type` leaves no runtime import at all.

*Alternatives weighed.* A types-plus-helper package (Joel's option (b), refused by his ruling). A
single file with the resolver code inside the contract (refused: it would run under the provider's
own module instance, and T10 forbids module-level state).

### 2. `exports` holds `./instruments` alone, and CI reads the packed manifest

```json
"exports": { "./instruments": "./extensions/jefferson/instrument-contract.ts" }
```

`files` is unchanged, because it already ships `extensions/`. The CI step that already packs the
tarball reads the packed `package.json` and fails when the export's target is not in the packed file
list. The check is shown failing once in a temporary copy before the PR opens.

The same step gains the fixture check: it copies `tests/fixtures/sample-provider` to `$tmp/provider`,
extracts the packed tarball into `$tmp/provider/node_modules/pi-jefferson` with
`--strip-components=1`, and runs `pnpm exec tsc -p "$tmp/provider/tsconfig.json"`. As with the
assertion, the coder shows it failing once in a temporary copy before the PR opens.

The same step then compiles `tsconfig.reserved.json` against the extracted tarball. It fails CI if
that compile passes, and it fails CI if the log lacks `error TS2344` with
`a name under jefferson. belongs to Jefferson`. Measured in `mirror-for-bambadjan`: the reserved
fixture under the contract before this change exited 0, and under it exited 1 with that error.

*Why.* A `tsc` under `nodenext` needs the entry (`research-chidi.md` §4b), pi resolves
`pi.extensions` by file path so loading is unaffected, and a target missing from a published tarball
cannot be withdrawn (`ci.yml:33`; M24). The bare string form is the one Chidi measured passing
without a `types` condition.

*Alternatives weighed.* A `types` plus `default` pair (measured passing too; more surface for no
gain). Putting the contract outside `extensions/` and adding it to `files` (refused: it escapes
`tsconfig`'s include, T11). A version field (refused by M9; the channels grow by adding).

### 3. Two messages, and their shapes

`instrument-contract.ts` declares one declaration shape, generic over the readings it resolves from:

```ts
import type { FieldType, FieldValue, ReadingsView } from "./data/field-value.ts";
export type { FieldType, FieldValue, ReadingsView };

type RegistrationChannel = "jefferson:registration";
type UpdateChannel = "jefferson:update";

type FieldDeclaration = Readonly<Record<string, FieldType>>;

type ComposedFormat<R> = {
  segments: Readonly<Record<string, (readings: R) => string | undefined>>;
  defaultKind: string;
};

type ContractDeclaration<R> = {
  name: string;
  variables: Readonly<Record<string, (readings: R) => string | undefined>>;
  defaultFormat: string;
  defaultLabel?: string;
  variableForms?: Readonly<Record<string, readonly string[]>>;
  bar?: (readings: R, width: number) => number | null | undefined;
  fills?: boolean;
  variableFg?: (readings: R, theme: unknown) => string | undefined;
  composed?: ComposedFormat<R>;
  options?: readonly "formats"[];
};

type ProvidedDeclaration = ContractDeclaration<ReadingsView>;

type ReservedExtension = "jefferson" | `jefferson.${string}`;

type ProviderExtension<Extension> = [Extract<Extension, ReservedExtension>] extends [never]
  ? string
  : "a name under jefferson. belongs to Jefferson";

type Registration<Extension extends ProviderExtension<Extension>> = {
  extension: Extension;                  // the providing extension's own name
  fields?: FieldDeclaration;
  instruments: readonly ProvidedDeclaration[];
};

type Report = {                          // posted on jefferson:update
  extension: string;
  field: string;
  value: FieldValue;
};
```

`instrument.ts` then writes `InstrumentDeclaration` as
`Omit<ContractDeclaration<Readings>, "variableFg" | "options">` plus `variableFg` with the render's
theme, `shownUntil` and a required `options`.

*Why.* D5's two messages in Joel's words; M14 fixes the declaration's content, excludes everything
else from the contract, and requires Jefferson's own declaration to be the contract's declaration over
its own readings plus its extra members, so change 3's visual mix-in lands once; M15 makes fields
belong to the extension rather than one instrument; M16 fixes the three types and the latest-value
rule. The member names are this design's; nothing in the rulings names them.

Joel's 2026-11-16 ruling, "Providers get what Jefferson's instruments get", puts the six optional
members into the contract, overruling M14 for them. `variableFg` returns `string` rather than pi's
`ThemeColor`, because importing that type puts pi's type graph into every provider's compile: measured
failing under the fixture's flags, TS2307 without pi and TS1543 inside pi's `.d.ts` with it. `options`
is `readonly "formats"[]`, the one option a provided instrument may take.

R2 (owner-rulings.md, 2026-11-16) makes the extension a type parameter, because TypeScript cannot
exclude a literal from `string` without one. The parameter is required, so a bare `Registration` is
itself an error (TS2314), and the `Extract` inside a tuple catches a union. It is measured on tsc
7.0.2 and 5.4.5 under the fixture's flags. `Registration<string>` is the accepted bypass, and the
runtime refusal backstops it.

*Alternatives weighed.* A per-instrument `fields` member (refused by M15: two instruments of one
provider must read one field). A data-only payload with a formatter vocabulary (refused by
`michael-orientation.md` §4: it would invent a second declaration language, against D12). Two
declaration types, one per audience (refused by M14: change 3 would add its mix-in twice). A default
of `= string` (refused: a provider annotating `Registration` would get no check). A conditional on
the property (refused: the error lands on the value as "not assignable to never"). An exported
`ProviderExtension` (refused: one more permanent public name).

### 4. A provider's resolver reads a record, not per-field generics

A resolver receives `ReadingsView`, a read-only record of the provider's declared fields to values,
and returns text or `undefined`. The guide shows the narrowing a resolver writes
(`typeof readings.saved !== "string"`).

*Why.* Per-field typing needs a call whose generic parameter is inferred from the declaration, and a
call is runtime code, which the types-only contract forbids. The record keeps `false` distinct from
`undefined` (M17) and keeps a provider from reading Jefferson's own data (S2).

*Alternatives weighed.* A generic `declareInstruments<F>()` helper (refused: it is a runtime import).
Typing resolvers as `unknown` (refused: it loses the distinction M17 requires).

### 5. Names: the declaration carries its registered name, and a provider writes only its part

Each shipped declaration's `name` becomes `jefferson.default.<name>`. A provider's declaration
carries the instrument's own name, and Jefferson registers it as `<extension>.<name>`; the extension
and the name may each be any string, dots, capitals and spaces included (owner-rulings.md,
2026-11-16). Everything under `jefferson.` is Jefferson's: its own `jefferson.default.*`, a later
`jefferson.custom.*`, and any other. A composed name starts with `jefferson.` exactly when the
extension is `jefferson` or starts with `jefferson.`, so the listener refuses that registration
(`isProvidedName(`${extension}.`)`) and the contract's `Registration<Extension>` fails the provider's
type check (decision 3). `jeffersonfan.stats` is a provider's name, because it is not under
`jefferson.`.

Every name a document writes is normalized once, at the reader's edge, to the registered name: a bare
name becomes `jefferson.default.<name>`, and any name with a dot is left alone. The spelling the
document wrote is kept for messages only.

*Why.* D6, D7 and M11; M12 requires one normalization point because the configured map, the binding
memo, the notice gate and `declaredSeconds` all key on the name (`configuration.ts:170`,
`instrument-binding.ts:21`, `:299-300`). Putting the registered name in the declaration keeps those
four keying one field instead of gaining a parallel key. Composing the name from the extension plus
the name makes a mismatch inexpressible, so no refusal rule is needed for one. Joel's 2026-11-16
ruling replaces the earlier part grammar and two-part rule.

*Alternatives weighed.* Keeping short names and threading a separate registered name through four
maps (refused: two names for one instrument in every key). Letting a provider write the full name
(refused: it needs a refusal for a name whose first part differs from its claim).

### 6. The registry: identity for Jefferson's own, first claim wins for a provider

`startup.ts` builds the registry in its factory and builds Jefferson's payload from `SHIPPED`, then
hands it to the listener's constructor. The listener subscribes both channels, emits that payload on
`jefferson:registration`, and keeps it for the identity check; `startup.ts` passes `pi.events` to the
listener's constructor and calls nothing on it. The listener accepts a claim under `jefferson.` (an
extension of `jefferson`, or one that starts with `jefferson.`) only when the payload is that exact
object; every other claim is refused. For a
provided name the first claim wins and a later one is refused. On acceptance Jefferson copies the
declaration's plain data (name, resolvers map's keys, format, label, field types) and holds the
resolver functions by reference.

**Jefferson reads its own payload through its full declaration type.** When the payload is the kept
`own` object, the listener calls `registry.accept("jefferson", own.instruments)` with each
declaration's `name` as written (`jefferson.default.<name>`); on that branch it skips the envelope
checks, name composition, `adaptProvidedDeclaration`, `containProvided` and field declaration. Every other payload is read through the provider contract. `own` is typed
`OwnRegistration`: `{ extension: "jefferson"; instruments: readonly InstrumentDeclaration[] }`. The
contract's `Registration` is unchanged (M10).

**The acceptance unit is one registration.** The listener checks a whole registration before any of it
reaches the registry or the holding: the envelope first, then each declaration in the order the
registration lists them, then the fields. The first fault refuses the whole registration and is the
one part reported; no instrument from that registration registers, and none of its fields is declared.
An extension may send several registrations in one session, and each must claim names no earlier one
took. Fields merge across one extension's accepted registrations: a field not yet declared is added; a
field declared again with the type it already has is accepted, and its reported value stays; a field
declared again with another type refuses the later registration, while the earlier declaration and its
instruments keep rendering, because first claim wins as it does for names (M11, M15). A registration
that names one instrument twice is refused. A registration whose `instruments` is an empty array is
accepted: it declares its fields under the merge rule, registers no name, and counts as an accepted
registration for that extension, so it takes the one repaint an accepted registration takes.

**Acceptance checks what binding consumes.** When the listener checks a declaration at acceptance, it
checks each optional member's shape first — a non-function `bar`, a non-boolean `fills`, a
`variableFg` that is not a function, a `variableForms` entry that is not a list, a `composed` without
both halves, and an `options` naming anything but `formats` — then refuses one whose `variables` map
holds a value that is not a function, refuses one whose `defaultLabel` is present and not a string,
and builds the adapted declaration once and parses its `defaultFormat` with `format.ts`'s
`parseFormat`, refusing the registration when that parse throws. The composed kind formats parse last,
so a fault in a kind is reported after the format the declaration defaults to. The adapted
declaration is a Jefferson `InstrumentDeclaration` over `Readings`; each of its variables reads the
provider's view and has its result checked (decision 10). A refusal follows the acceptance unit's
rules: the whole registration, first fault reported. The registry holds the adapted declaration, so
the acceptance parse, the J1(b) check and the bind all read one object.

The two channel strings are written at runtime in one file only: `registration-listener.ts` holds
them as module constants annotated with the contract's `RegistrationChannel` and `UpdateChannel`,
unexported, so a misspelling fails `pnpm typecheck`. The listener's constructor is its one pinned
export, and the tests write the literals as a provider does.

The listener requests exactly one repaint for each accepted registration, after the registry has run
that registration's watches; a refused registration requests none.

*Why.* M10: the bus carries no sender, so identity is the only proof that a `jefferson` claim is
Jefferson's own, and Jefferson registers in its factory before any `session_start`, so first claim
protects the built-ins. M16: copying plain data stops a later mutation from passing the settings
check that a registration had to pass.

*Alternatives weighed.* A flag set around Jefferson's own emit (refused by M10: another extension's
factory may already be subscribed and emit inside that window). A `Symbol`-tagged payload (refused
by T10: two module instances, no shared `Symbol` identity).

### 7. Validation at the bus, and one ledger for every fault

The listener validates the envelope and each declaration before anything reaches the registry or the
holding, and refuses with a warning that names the claimed extension, the instrument or field, and
the fault. Every provider fault — a refused registration, a refused report, a refused setting, a
resolver fault — records into `faults.ts` with a scope and a kind, and each pair fires once per
session; decision 19 has the per-session reset.

A **kind** is one row of decision 15's table: the format sentence and the label sentence are two
kinds, and a templated row is one kind whatever fills its slot. A **scope** is one of three:

- a fixed anonymous scope, for a payload that has no string `extension` — not an object, or no
extension name — so each of those kinds warns once per session, whoever sends it;
- the extension as the payload wrote it, for every other registration fault and for every report
  fault;
- the full registered name `<extension>.<part>`, for a name already registered, no resolvers, no
  default format, an unparseable default format, a default label that is not a string, a resolver that
  is not a function, every settings fault and every resolver fault.

Delivery has two moments. Before startup completes, faults queue; the startup-complete notice follows
the unknown-name notice and carries every fault recorded so far. After that, one notice per microtask
flush carries every fault recorded since the previous flush, so no warning is raised inside a render.

*Why.* T8 (untrusted payloads), M1's observability rule with its measured reason (a `notify` raised
in a render schedules another render, `interactive-mode.js:2276-2285`), M8's fault kinds, and CC4's
once-per-session bound: a cell's text resolves at three widths per frame
(`row-renderer.ts:36-77`), so an undeduped throw would flood the transcript.

*Alternatives weighed.* One warning per occurrence (refused: a throwing resolver would flood).
Console only (refused: a blank entry is indistinguishable from an absent extension). A timer to
deliver (refused: an async `session_start` handler later in the order can outlast it, T4).

### 8. The reader seam: a resolver on the source it already receives

`readConfiguration` keeps receiving its source object, now carrying `resolve(name)`,
`fallback` (the `blank` declaration), the notice gate, `report` (the fault sink) and
`watch(name, apply)`. The gate carries the notice declaration's registered name and its default
seconds. Every document name goes through `normalizeName` then `resolve`. The configured map and the
binding memo key on the resolved name. The gate compares each cell's resolved name with the gate's
name, and when the document declares no seconds for it, it uses the gate's default seconds.
`configuration.ts` imports neither `blank.ts` nor `notice.ts`: `instrumentNamed`, `NOTICE_SECONDS`
and the notice declaration all leave it. `startup.ts` takes the fallback and the gate from
`shipped.ts` when it builds the source, and the fallback object is the one the registry holds. The
source's `watch` is `registry.watch`: the registry holds the watch table, so accepting a name runs
that name's watches without a second table anywhere (decision 19 item 3 has their one release point).

*Why.* R-11 names this seam and lists the configuration call sites it moves. Normalizing at the
reader's edge is M12's one place. Comparing names rather than declaration identity at the gate is
what makes both spellings reach one notice (T7; M19). The name lives once, on the notice's
declaration, and only `shipped.ts` names an instrument's file, as the layout delta's "Who names the
instruments" requires.

*Alternatives weighed.* A closure parameter (`readConfiguration(document, resolve, …)`, refused: the
source object already exists and eight call sites read it). Resolving the fallback through the
registry and handling an impossible `undefined` (refused: a dead branch in the reader).

### 9. Late binding: a holder a registration fills, and `fills` read per plan

A cell holds `{ name, holder: { current: Instrument }, align }`: the resolved full name the notice gate
compares, the holder, and the alignment. It carries no `instrument` key, because the holder is the one
copy of what the cell renders. When the reader meets a row's entry naming a
provided name that has not registered, it builds that cell on `blank`, records the cell's holder, and
calls `watch(name, apply)`; every cell of that read naming the name joins that name's one watch. A
watch belongs to the install whose read registered it, and decision 19 says when it goes. The reader
keeps the written spelling for messages. A provided name that the `instruments` block configures and
no row places takes a watch with no holder, so its settings are checked when it registers.

A watch holds the raw `instruments` value the document gives that name, or none; the read's theme,
from `source.theme`; and the read's own mutable configured Map with its `bind`. When the listener
accepts the name, `apply` runs in this order. (a) It runs the J1(b) check — the same function the
reader runs at `session_start` for a name already registered — on the held raw value, against the
adapted declaration, with the held theme. (b) On a pass, when a value was configured, it sets the
parsed `ConfiguredInstrument` into the read's configured Map under the full name, then calls the
read's `bind`, sets every recorded holder's `current` to the result, and returns; `apply` requests no
repaint and touches no renderer cache; the memo reads the Map the first time a name is bound
(`instrument-binding.ts:20-24`), so the entry has to be in the Map before that bind. (c) On a fault,
it records the J1(b) row once and leaves every holder on `blank`. The `bind` in (b) is the same one
the reader calls, and it applies `containProvided` (decision 10), so a provided instrument is never
bound uncontained.

The tree is not rebuilt: the holder is created when the tree is built and read on every render, and
`fills` is read from the holder on every plan.

*Why.* T5: the common case is Jefferson loading before a provider, so every registration lands after
the footer is installed, and an entry that held `blank` must take the provided instrument's width
behaviour (M21). The holder keeps the renderer's requirement "the footer's tree is built once" true
— the components never change, only what the cell's holder points at — so no renderer requirement
needs a delta. `fills` moves from a value copied at build (`row-renderer.ts:54`, used at `:88`) to a
read of the current instrument, because the copy is what would keep a filled `blank` cell filling. If
a reviewer reads that as a change to the requirement rather than to a detail it does not state, the
delta adds one clause naming the read; the requirement's own text says only that the tree is built
once and that every render lays it out, both of which the holder keeps. The renderer's text cache
stays keyed on the sample (`row-renderer.ts:37-48`), and every render takes a fresh sample
(`row-renderer.ts:119`; `session-data-store.ts:147-168`). So the first render after a holder changes
renders the new instrument. The cache's key does not change, and the renderer gains no invalidate
route (CR-7).

*Alternatives weighed.* Re-seating every cell through the stack's public typed route (allowed by the
requirement, but it addresses cells by position and rebuilds props nothing asked to change). Rebuilding
the footer on each registration (refused: it contradicts "built once" and loses entry options).
Resolving the instrument from the registry on every render (refused: the renderer would learn the
registry, and a name lookup would run three times per frame).

### 10. Containment: the result check at acceptance, and the outer boundary

`instrument-binding.ts` contains a provided instrument's faults in two parts. The first is the result
check, inside the adapter decision 6 places at acceptance: each provided resolver is called with the
provider's view and its result is checked. A throw records the "threw" row. A thenable — an object or
function with a callable `then` — is checked first, gets a no-op rejection handler
(`value.then(undefined, () => {})`), and records the promise row, so a rejecting promise is observed
and pi keeps running. A string or `undefined` passes through. Anything else records the "returned
<what>" row with decision 15's vocabulary. Every fault makes the adapter return `undefined` for a variable the format names, so the entry renders
as an unknown datum renders: nothing, label included, with its holder and `fills` kept, and the next
render calls the resolver again. A function whose variable the format does not name is never called
(decision 20). The second is the outer boundary around the bound
render, for anything else a provided render might throw, which records the "threw" row. Jefferson's
own instruments get neither, so their defects still fail the suite.

Every provided function is guarded by one `call`, and each fault yields its member's absent value:
text and `bar` read unknown, a `select` composes nothing, and a colour falls back to the cell's style.
A colour is checked with the render's theme, and `drawBar` clamps a negative fill, so a bar below zero
draws its track unfilled without a fault.

`instrument-binding.ts` exports two functions. `adaptProvidedDeclaration` is the one the listener
calls at acceptance: the adapter's guard covers the provider's call, and classifying the returned
value runs after the guard. `containProvided` wraps a bound `Instrument`'s render and reads `fills`
through to the instrument; anything that throws while Jefferson inspects or formats a provided value
is its, and it records the "threw" row. The read's `bind` applies `containProvided` to every
declaration whose first name part is not `jefferson`, so both bind moments — the reader at
`session_start` and decision 9's `apply` — get the boundary by construction.

*Why.* M8 and T9. `undefined` from a variable's resolver is the declaration type's own unknown value,
not a fault (M8). M8's `null` is bar's unknown, and the contract carries no bar (M14), so a provided
resolver that returns `null` returns a value outside its declared type, and that is a fault. The
living rule for an unknown datum already renders nothing with no label. Wrapping at binding covers
`collapse` and `theme.fg`, which a resolver's value reaches. This decision corrects M8's wording
narrowly: the ruling's purpose stands — containment covers every callback path, `undefined` is unknown
and not a fault, and a returned thenable's rejection is observed — but observing a rejection is
possible only where each provided resolver's value is returned, not from one catch around the bound
render, which never holds it.

*Alternatives weighed.* A per-callback rule that treats `undefined` as a fault (refused by ZO-1:
`undefined` is the type's own unknown, and such a rule would blank every entry before its first
report); checking each callback's result is what this design does, and only the record it produces is
refused. Wrapping in the renderer (refused: the renderer would need to know which instruments are
provided, and the same knowledge already lives where the declaration is bound).

### 11. Provider fields are store data, held from the factory

`data/provider-fields.ts` holds each extension's declared fields and the latest reported value. A
report of a changed value requests one repaint through the entry point the store already uses; a
report of the same value requests none; an unreported field reads unknown. `startup.ts` creates it in
the factory so a report that arrives before its own `session_start` survives (T2), takes the
factory's repaint slot below, and clears reported values and provider registrations in the
`session_shutdown` handler's body, after `releasePrevious?.()` rather than inside that closure,
keeping Jefferson's own for the factory's life (M22; decision 19 has the order).

The repaint slot lives in the factory: `startup.ts` moves today's `requestRepaint` out of the
`session_start` body, `installFooter`'s `receiveRepaint` sets it, and the `session_shutdown` body
sets it to `undefined` as a step in decision 19 item 1. The feed, `data/provider-fields.ts` and the
listener each receive `() => requestRepaint?.()`, and no other route exists.

`data/provider-fields.ts` owns every field rule: the three types, as one runtime record typed
`Readonly<Record<FieldType, true>>` so that adding a type without adding it to the record fails
typecheck; a check that changes nothing and answers the first field of a candidate declaration whose
type is outside the three or conflicts with the type an earlier accepted registration from that
extension gave it; and the report value check, which reads the declared type and requires a finite
number. `declare` commits only: it adds the fields not yet declared and leaves every existing field's
type and value as they are, so it decides nothing. The listener calls the check during validation and
maps each answer to decision 15's rows; it holds no field rule of its own.

A report takes one of decision 15's two rows by one fact: an extension with no registration accepted
this session and uncleared takes "without a registration", and the listener asks the registry; one
with an accepted registration that declared no such field takes "which it did not declare". A
fieldless registration and an empty `instruments` list both count as accepted.

*Why.* M7, M15 and M16; T2 and T3 fix the lifetime. `data/` is the holding's home because the store
reads it and `data/` may import nothing outside itself (T14, M25).

*Alternatives weighed.* Holding fields inside `session-data-store.ts` (refused: the store's `Readings`
is a closed host interface, and S2's narrow view is not host data). Holding them in the registry
(refused: M25 places them in `data/`, and the registry holds declarations, not values).

### 12. Startup completes at `resources_discover`, with a pin

`readConfiguration` returns its unknown names as data, not as a composed string: `unknownNames`, each
carrying the spelling the document wrote, the name it normalized to, and the row it was written in. `startup.ts` registers a `resources_discover` handler in its factory. That handler is
the point where delivery opens (decision 19 has the operation): it takes the latest read's
`unknownNames`, drops every name the registry answers by then, composes what remains with
`configuration.ts`'s `acceptedWarning(path, unknownNames)` — the composer it already owns, now taking
the filtered list, with D17's row form unchanged; Joel's 2026-11-16 ruling retires the block form, so
`unknownNames` holds only names a row places, each with its row — notifies it, and sends no
unknown-name notice when nothing remains; then it delivers the queued faults. `Configuration` gains `path`, the document
path the read chose, which is the same path its rejection and accepted warnings already print;
`startup.ts` passes `configuration.path` to the composer and never calls `configurationPaths` to
compose a warning. A registration that arrives after it renders from the next render
on, and its name has already been warned as unknown. A rejected document is unchanged: it still warns
at `session_start` (S6).
`startup.ts` carries the pin comment, in `data/notice.ts`'s style: the order comes from pi's
`bindExtensions`, no pi document promises it, and every pin bump re-checks it.

*Why.* T4 as corrected by M20: `session_start` fires before other extensions' handlers have run, so it
cannot be the marker; `resources_discover` is emitted after every `session_start` handler on every
path that starts a session, and Jefferson handling it is what makes it fire. A timer fails because a
later async handler can outlast it.

*Alternatives weighed.* A timer (refused, above). Warning at `session_start` (refused by D7: a
provider registering from its own `session_start` handler would be warned as unknown). A third
message announcing readiness (refused by D5).

### 13. A provided instrument's settings are checked when both are in hand

The J1(b) check runs when the document and the registration are both in hand, whichever came second:
from the reader at `session_start` for a name already registered, and from the listener through
decision 9's `apply` for a name the document already read. Both moments run one check function in
`configuration.ts`, so the outcome depends on the name and never on load order (M6). It checks
everything under the key — the value's shape, format, label, option, variable, modifier and style —
and a fault refuses that instrument alone: its entries
render `blank` and one warning names it and the fault. Jefferson's own instruments keep the
whole-document rejection. A provided instrument's options are the foundational three — format, style
and label — plus `formats` when it declares `formats` in `options` with a `composed` format set.
`seconds` is not offered, because it is the notice gate's and `shownUntil`'s. The check covers
`formats` as one more option, so a kind the registration does not carry refuses that instrument alone
(decision 15).

An `instruments`-block entry whose instrument never registers draws no warning and is never checked,
whatever it holds, for a provided name and a name in Jefferson's namespace alike (owner-rulings.md,
2026-11-16). A provided name's raw value is held for its watch; any other unregistered name is
skipped. Jefferson's own registered instruments keep the whole-document rule, and two spellings of one
name are refused only once that name resolves.

*Why.* Joel's answer to J1 was (b), and M6 keys the rule on the name rather than on when the
registration arrived, because extension load order otherwise decides the user's result. The style
check needs the theme, which exists at `session_start`.

*Alternatives weighed.* Rejecting the whole document (Joel's (a), refused: another extension's change
would take down a user's footer mid-session). Holding the document until startup completes (Joel's
(c), refused: it delays every user's footer for a case (b) handles).

### 14. Jefferson's own instruments, the tests, and the export pin

`shipped.ts` exports `SHIPPED`, the eleven declarations; `FALLBACK`, the `blank` declaration the
reader falls back to; and `NOTICE_GATE`, the notice declaration's registered name with its default
seconds. Nothing else. `tests/jefferson.test.ts`'s harness gains a real `createEventBus()` from pi's
public index and fires `resources_discover` after `session_start`; the export pin lists
`instrument-contract.ts` with no runtime exports and records `shipped.ts` as exporting `SHIPPED`,
`NOTICE_GATE` and `FALLBACK`; it records `instrument-binding.ts`'s two exports,
`adaptProvidedDeclaration` and `containProvided`, whose argument is that the package's `exports`
blocks a deep import and T10 gives any importer its own module instance, so neither export supplies
anything to Jefferson's registry; the scan for a third-party contribution path is replaced by a pin on the registration
surface; and the CI pack step's fixture check type-checks a sample provider against the packed
contract (the ci.yml row and decision 2 say how). Four tests pin the registration's acceptance unit: a
registration with one bad declaration registers none of its instruments; a second registration from
one extension adds a field and an instrument; a same-type redeclaration keeps the reported value; and
a different-type redeclaration is refused while the first stays intact. Six more cover what
acceptance and containment promise: a provider-first registration whose default format names an
undeclared variable still installs the footer, refuses that registration and warns once naming it;
the same in Jefferson-first order; a non-string default label; a non-function resolver; and a
resolver that rejects asynchronously, one that returns 42, one that returns `null` and one that
throws, each costing only its own entry, producing exactly its own table row once, and leaving the
process running with no unhandled rejection. Two more cover the unknown-name report in Jefferson-first
order, with the provider registering in its own `session_start`: a row's entry and an `instruments`
block key naming a provided instrument each leave the instrument rendering with no unknown-name
warning naming it, while a provided name that never registers draws no warning from the block, and
warns once at `resources_discover` only if a row names it. Two cover a valid configuration in Jefferson-first order, with the provider
registering in its own `session_start`: a row naming `taiknr.savings` whose block entry sets a format,
a label and a style renders the configured format, label and style once the registration lands,
identical to the provider-first render of the same document; and the same row with a block format
naming an undeclared variable stays `blank`, with exactly one J1(b) warning naming it. A
renderer-level late-binding test passes a sampler that returns a fresh object on every render, as the
store does, and swaps a holder between two renders. The repaint test asserts three counts: an accepted
registration adds one, a changed report adds one, and a same-value report adds none. A provided
resolver that returns an object whose `then` getter throws renders nothing in both orders, leaves the
rest of the row rendering, records the "threw" row once, and keeps the process running. A fields-only
registration followed by a second registration that adds an instrument reading those fields renders
that instrument, and a report after a fieldless registration takes the undeclared-field row. Two more
pin the block's silence: a block entry for an instrument that never registers draws no warning, and
the same document with a row naming the name still warns once by the row. The CI pack step's reserved
fixture check is the test that a registration under `jefferson.` fails a provider's type check.

Decision 20's tests come with it: a variable the format leaves out is never resolved and does not blank
the instrument; a named variable that is unknown blanks it; a format that names no variable keeps its
label; `context` configured with `$bar` alone renders nothing with no usage; and the composed path
renders nothing when there is nothing to compose. The per-instrument tests that stated the old
every-variable rule are rewritten to name the variables their formats name.

*Why.* T15 (use the real bus, never a substituted registry), T13 (no second lookup), R1 and S8 (the
scanned rule is retired, so the pin changes with the delta), M23 (a provider's compiler flags differ
from this repository's), M27 (the harness and the test files are plan obligations).

*Alternatives weighed.* A hand-written emitter in the harness (refused by T15). Keeping
`instrumentNamed` as a test-only export (refused: no production branch that exists for tests).

### 15. The message table

Every new string, word for word. Reused unchanged: the rejection wrapper
`pi-jefferson: <path> was rejected (<part>); rendering the default row`, and the accepted-warning
wrapper `pi-jefferson: <path> <part>[; <part>…]` with `row N: "<name>" is not a known instrument`
(D17's row form; its block form is retired by Joel's 2026-11-16 ruling).

Changed in this change by Joel's 2026-11-16 rulings (no printed string says "entry" or "document"):

| Situation | Part |
|---|---|
| A row that is not a list | `row N: is not a list; a row is a list of instruments, as {"rows": [[{"instrument": "model"}]]}` |
| A row with no instruments | `row N: is empty; a row lists the instruments it renders` |
| An instrument in a row with an unrecognised key | `row N, instrument M: has an unrecognised key "<key>"; an instrument in a row takes only "instrument" and "align"` |
| A document that is not an object | `the configuration file is not an object` |

Fault parts join under their own wrapper, `pi-jefferson: <part>[; <part>…]`, because a fault is not a
fault in the user's document. A part is exactly the table's text, with names quoted as written. The
scope is not printed, because each part already names what it is about. Every part pending at one
delivery joins one notice, in arrival order: `pi-jefferson: <part>; <part>`. Two worked examples:
`pi-jefferson: a registration is not an object`, and `pi-jefferson: taiknr reports "spent", which it
did not declare; "taiknr.savings" failed to render: its resolver threw`.

| Situation | Part |
|---|---|
| The payload is not an object | `a registration is not an object` |
| No extension name | `a registration carries no extension name` |
| The extension is `jefferson` or starts with `jefferson.` | `a registration claims "<extension>", which belongs to Jefferson` — for example `"jefferson"` or `"jefferson.custom"` |
| `instruments` missing or not an array | `registration from "taiknr" carries no instruments` |
| A declaration that is not an object | `registration from "taiknr" carries an instrument that is not a declaration` |
| A declaration with no name | `registration from "taiknr" carries a declaration with no name` |
| A name already registered | `"taiknr.savings" is already registered, so this registration is refused` |
| A registration that names one instrument twice | `registration from "taiknr" carries "savings" twice` |
| No resolvers | `"taiknr.savings" carries no resolvers` |
| No default format | `"taiknr.savings" carries no default format` |
| A default format Jefferson cannot parse | `"taiknr.savings" carries a default format Jefferson cannot parse` |
| A default label that is not a string | `"taiknr.savings" carries a default label that is not a string` |
| A resolver that is not a function | `"taiknr.savings" carries a resolver "saved" that is not a function` |
| A field type outside the three | `registration from "taiknr" declares "saved" as "array", which is not string, number or boolean` |
| A field declared with a type other than the one an earlier registration from the extension gave it | `registration from "taiknr" declares "saved" as both string and number` |
| A report that is not an object | `a report is not an object` |
| A report with no extension name | `a report carries no extension name` |
| A report with no field name | `a report carries no field name` |
| A report for an undeclared field | `taiknr reports "spent", which it did not declare` |
| A report with no registration | `taiknr reports "saved" without a registration` |
| A report of the wrong type | `taiknr reports "saved" as <what>, and it declared <type>`, where `<what>` is `a string`, `a number`, `a boolean`, `a bigint`, `a symbol`, `a function`, `an object` (arrays included), `null`, or `nothing` when the value is missing |
| A report of NaN or an infinity | `taiknr reports "saved" as a number that is not finite` |
| A provided key that is not an object | `"taiknr.savings" is configured with a value that is not an object; it renders blank` |
| A format, or a label, that is not a string | `"taiknr.savings" is configured with a format that is not a string; it renders blank`, and the same sentence with `label` in place of `format` |
| A format naming an undeclared variable | `"taiknr.savings" is configured with a format naming "$spent", which the instrument does not declare; it renders blank` |
| An option a provided instrument does not take | `"taiknr.savings" is configured with "width", which the instrument does not declare; it renders blank` |
| A modifier the format does not allow | `"taiknr.savings" is configured with a format Jefferson cannot parse; it renders blank` |
| A style the theme refuses | `"taiknr.savings" is configured with a style Jefferson cannot use; it renders blank` |
| A provided function that threw | `"<name>" failed to render: its <member> threw` |
| A provided function that returned a non-string | `"<name>" failed to render: its <member> returned <what>, where <declared> is declared`, where `<what>` is `a number`, `a boolean`, `a bigint`, `a symbol`, `a function`, `an object` (arrays included) or `null`; a thenable is checked first and takes the promise row |
| A provided function that returned a promise | `"<name>" failed to render: its <member> returned a promise` |
| A provider types an extension under `jefferson.` | `a name under jefferson. belongs to Jefferson`, shown by `tsc` in TS2344 before the provider runs |
| A member that is not a function | `"<name>" carries a <member> that is not a function`, where `<member>` is `bar` or `variableFg` (K15) |
| `fills` that is not a boolean | `"<name>" carries "fills" that is not a boolean` (K15) |
| A `variableForms`, `composed` or `options` Jefferson cannot use | `"<name>" carries a <member> Jefferson cannot use` (K15) |
| An option Jefferson does not offer a provided instrument | `"<name>" carries an option "<option>", which Jefferson does not offer a provided instrument` (K15) |
| `formats` that is not an object | `"<name>" is configured with "formats" that is not an object; it renders blank` (K16) |
| A `formats` kind that is not a string | `"<name>" is configured with a "formats" kind "<kind>" that is not a string; it renders blank` (K16) |
| A `formats` kind the instrument does not carry | `"<name>" is configured with a "formats" kind "<kind>", which the instrument does not carry; it renders blank` (K16) |
| A kind's format Jefferson cannot parse | `"<name>" is configured with a "formats" kind "<kind>" that Jefferson cannot parse; it renders blank` (K16) |
| Both spellings of one instrument | `the instruments block configures "path" and "jefferson.default.path", which are one instrument` — a document rejection, so it travels in the rejection wrapper |
| The two channel names | `jefferson:registration` and `jefferson:update`, each named for what is posted on it (decision 18) |

The `<what>` vocabulary has one home, `describeValue` in
`components/instruments/instrument-binding.ts`, and both rows use it: it answers one word for each
`typeof` result, `nothing` for `undefined`. `<member>` is `resolver`, `select`, `bar` or `colour`, and
`<declared>` is `text`, `a finite number or null` or `a theme colour`. For a colour the theme lacks,
`<what>` is the quoted token. The three resolver strings above stay byte-identical: a resolver's
`<member>` fills as `resolver`.

*Why.* M3 and M4: the design states every string, the tests assert them, and Joel approves the wording
at his live check. The vocabulary follows the existing parts (`does not declare`, `is configured with`,
`was rejected`), and no string contains "cell", "entry" or "document" (ADR 0015; `owner-rulings.md`,
2026-11-16).

*Alternatives weighed.* One wrapper for document notices and faults (refused: a fault part would carry
a path that has nothing to do with it). Putting the consequence on only the first settings message
(refused: a user reading one of the others would not know the entry went blank).

### 16. Documentation: the guide, the README, `CONTRIBUTING.md`, and two ADRs

The docs pass writes and moves these, all of them under `what-the-fork` through `my-voice`:

- **`docs/extension-authors.md`**, in this order: what an instrument is in a row; install the contract
  as a development dependency and import it with `import type`; declare the fields you keep and their
  three types; register from `session_start` before any await, with the six-line handshake written
  out; declare the instrument (name, resolvers over your own fields, default format, optional label),
  where a resolver returns text or `undefined` and `null` is a fault; report values, `false` included,
  and report the same value to cost nothing; configure a namespaced
  entry in the user's document; what the user sees when a field is unreported, when a resolver
  returns nothing, and when something is refused; stop reporting at `session_shutdown`; and the
  resolution and version notes — nodenext, node16 and bundler work, node10 ignores `exports`, and the
  minimum Jefferson version is the one this change releases.
- **A root `CONTRIBUTING.md`**, taking the README's `## Development` section (the two commands, tests
  living in `tests/`, the peer-dependency rule) and everything in `docs/releasing.md` that tells a
  contributor what to do: the three labels and the patch default, that the base comes from the tags,
  and that a workstation cannot publish.
- **`docs/releasing.md` is removed** once that content has a home.
- **The README keeps its user index** — the intro, status, install, one working configuration, the
  documentation list, why another statusline, the image and the licence — loses `## Development` and
  the Releasing link, and gains one line for the guide (D18).
- **ADR 0017** records that registration replaces the 2026-11-03 rule that no API lets third-party
  code supply content (S8, R1), with a `Status:` line naming what it retires.
- **ADR 0018** records how releases are versioned: the label picks the bump, the tags are the base
  rather than `package.json`, and publishing is CI's because provenance needs a CI OIDC provider.
- `AGENTS.md:30-43`, `ARCHITECTURE.md:16`, `:92-95`, `:164-170` and `docs/instruments.md:73-90` are
  corrected (T16), and `docs/configuration.md` gains the bare-name rule and the namespaced-name form.

*Why.* D9, D18, the contributor-documentation ruling and S9; M29 lists the guide's content; T16 lists
what the change makes false. Documentation never blocks (Joel's standing ruling), so the docs pass
follows the implementation gate.

*Alternatives weighed.* One long guide covering configuration too (refused: `docs/configuration.md`
already owns the document's keys). Keeping development in the README (refused by Joel's ruling that
the README keeps its user index).

### 17. The release is a minor version

The PR carries `release:minor`, applied by the conductor when it opens the PR. From 0.13.0 that
releases 0.14.0, which the guide names as the minimum Jefferson version.

*Why.* S11, and the same reasoning as the previous change's decision 13. The published tarball carries
`README.md` and the contract, so the release must be cut from a commit that already holds both.

*Alternatives weighed.* `release:major` would cut 1.0.0, which nothing asked for. No label would ship
a new package surface as a patch.

### 18. The two channels are `jefferson:registration` and `jefferson:update`

A provider posts its registration on `jefferson:registration` and an update of one field on
`jefferson:update`. Both are string literals in the contract, both sit under the `jefferson`
namespace, and each is named for the thing posted on it. The contract names them
`RegistrationChannel` and `UpdateChannel` (decision 3). Declare and report still name what the
provider does; a channel's name says what the message carries.

*Why.* Joel's ruling in `owner-rulings.md`, 2026-11-15, "The two channel names": offered two verb
pairs and then a pair of nouns, he chose the nouns, following pi's `my:notification` pattern, because
"those are what are being posted, so to speak". M9 makes a channel's name permanent — a rename is a
breaking change — so the strings were his to set rather than the design's.

*Alternatives weighed.* `jefferson:declare` and `jefferson:report`, and `jefferson:register` and
`jefferson:report`: the two verb pairs he was offered, refused because a channel carries a thing, and
a verb pair would name the act in the channel and again in the declaration's own words.

With the two named, no choice in this design was made without a ruling: the member names, the file
names, the registry and reader seams and the late-binding mechanism are inside the design's remit,
and each decision above names the ruling or the measurement it rests on.

### 19. Per-session state is cleared in the shutdown handler, around the install's release

Five pieces of state live for one session, and `startup.ts` already has the two points that bound a
session: the `session_shutdown` handler's body, with the `releasePrevious` closure it calls, and the
`resources_discover` handler.

1. **The `session_shutdown` handler body runs three steps, in this order:** `releasePrevious?.()`,
   whose closure disposes the store and runs `releaseWatches()`; the provider clear, which drops
   registrations and reported values and never watches (decision 11); and `faults.close()`, which
   clears the ledger's once-per-session record and its queue and closes delivery, with the read's
   notices going with the install. The provider clear and `faults.close()` sit in the handler body and never inside the
   release closure, which also runs at the next `session_start`; inside it, they would drop a report
   made before that `session_start` (T2) or a fault queued before it. A fault in the next session,
   including one that arrives before Jefferson's next `session_start`, then queues until the next
   `resources_discover`.
2. **Delivery opens in the `resources_discover` handler, with that handler's own `ctx.ui.notify`.**
   `faults.open(notify)` holds that function until `close()`, so `faults.ts` still imports nothing.
   The handler returns without opening delivery when `ctx.mode` is not `tui`, as `session_start` does
   (`startup.ts:52`).
3. **A watch belongs to the install whose read registered it.** `releaseWatches()` rides the release
   closure, so a later session's registration never applies to a released footer. Running it twice is
   safe, because watches come only from the read that follows the release.
4. **Unknown names belong to the read.** Each `session_start` read produces its own `unknownNames` as
   data, and the `resources_discover` handler drops the names the registry answers by then, composes
   the rest with `configuration.ts`'s `acceptedWarning`, and delivers the latest read's.
5. **Jefferson's own registrations, and the payload it keeps for the identity check, last for the
   factory's life (M22).**

*Why.* One factory sees one session in production: a reload unsubscribes every listener and runs
fresh factories, and `/new`, `/resume` and `/fork` build a new bus (`research-chidi.md` §1;
`loader.js:425-431`). The harness drives several sessions through one factory, so without these points
a test would pass where production cannot — a session-two fault skipping the wait for startup to
complete, or a session-two registration re-rendering a released footer.

*Alternatives weighed.* A registry that clears itself on `session_start` (refused: it would discard a
report that arrived before it, T2). Recreating the ledger per session inside `startup.ts` (refused:
`registration-listener.ts` holds a reference from the factory, and a fresh ledger would need the
listener re-subscribed).

### 20. Only a variable the format names can blank an instrument

`resolveFormat` resolves only the active format's segments: a bare variable through `variables`, a
form through `variableForms`, and `$bar` through `bar`. A named one that is `undefined` renders the
instrument as nothing, label included. A declared variable the format leaves out is never resolved, so
a provider's function for it is never called and cannot fault. A format that names no variable is
never blanked. `bar` returns `undefined` for an unknown datum and `null` for a known usage with no
estimate, so a `$bar`-only `context` cell still renders nothing with no usage, while a null estimate
still draws the dim track. The composed path renders nothing when there is nothing to compose, so the
2026-11-11 silencing no longer depends on the cell's format naming `$notice`.

*Why.* Joel's 2026-11-16 ruling: an instrument is blanked by a variable its format names, not by every
variable it declares. That overrules council ruling M18, which recorded the opposite rule, and it
matches the measured survey of the shipped instruments: each one's format names the variables whose
absence should silence it.

*Alternatives weighed.* Keeping the every-variable rule (refused by Joel: a provider's unrelated field
could blank an instrument that shows something else). Blanking `$bar` on `null` (refused by the living
context requirement: a null estimate draws the dim track and keeps `?/<window>`).

## Risks / Trade-offs

- **A provider registers from its factory and is never heard.** It loads at rank 0–3, Jefferson at
  rank 4, and the bus replays nothing, so the user sees `blank` with no warning naming the
  extension. → The guide's "register in `session_start`, before any await" is the rule, and a test
  drives a factory-time registration and asserts it is not registered.
- **A provider's second session is refused as a second claim.** The same provider registers again
  after a shutdown, and a refusal would blank its entries for the whole session. → M22's rule: the
  shutdown clears provider registrations and reported values, Jefferson's own stay for the factory's
  life, and a test registers in two successive sessions through one factory.
- **A resolver throws on every render and floods the transcript.** Three widths per frame, sixty
  frames. → The ledger's once-per-(scope, kind) rule, with a test that renders a throwing resolver
  many times and asserts exactly one warning.
- **A warning raised inside a render schedules another render, forever.** → Faults queue and deliver
  from a microtask, never synchronously from a render; the dedupe bounds the loop to one extra
  render per fault kind.
- **A late registration leaves the entry painted with the `blank` placeholder for a frame or two.**
  → M3 measured the window: it paints only when a later `session_start` handler yields to a
  macrotask, and the guide's "no await before registering" closes it. No third state is added.
- **A provided instrument is configured with a variable it does not declare.** Under the
  whole-document rule the user's footer would drop to the default row because someone else's package
  changed. → J1(b): only that instrument is refused, its entries render `blank`, and one warning
  names the instrument and the variable.
- **A provider mutates its declaration after registering.** A resolver swapped after the fact would
  skip the settings check the registration passed. → The plain data is copied at acceptance; the
  settings check reads the copy.
- **Another extension claims `jefferson.default.path`.** Without identity it would shadow a shipped
  instrument for the whole session. → The identity check refuses it, warns once, and a test on a real
  bus asserts the built-in still renders.
- **`exports` closes every deep import of the package.** A consumer importing
  `pi-jefferson/extensions/jefferson/format` would break. → `research-chidi.md` §4b records zero
  dependents and no consumer examined; the risk is named, and `./instruments` is the only subpath the
  change publishes.
- **A provider's `tsc` under stricter flags fails on the contract.** `exactOptionalPropertyTypes` and
  a narrower `lib` are untested (T11). → The contract imports one types-only file, and the CI pack
  step's fixture check type-checks a sample provider under flags this repository does not use (the
  ci.yml row); the residual risk is named in the tasks as the one a provider may hit.
- **`resources_discover`'s order is undocumented and could change with a pi bump.** Then every
  unknown name warns before a provider registers, and a user sees a warning for a working instrument.
  → The pin comment in `startup.ts` mirrors `data/notice.ts`'s, and a test fires the handler order
  explicitly.
- **The harness drives several sessions through one factory.** A ledger, a delivery gate, a watch or
  a read's notices that is not cleared would carry one session into the next, and a test would pass
  that production cannot. → Decision 19's points: the `session_shutdown` handler body's three steps —
  `releasePrevious?.()`, whose closure runs `releaseWatches()`, the provider clear, then
  `faults.close()` — and `faults.open(notify)` in the `resources_discover` handler. The test drives
  two sessions through one factory and asserts that a fault already reported in session one warns
  again in session two, that a session-two fault arriving before session two's `resources_discover`
  waits for it, and that a session-two registration leaves session one's footer and watches
  untouched. A provider-first case adds that a session-two registration and a fault it records, both
  arriving before Jefferson's session-two `session_start`, survive it, that the fault is delivered at
  session two's `resources_discover`, and that the entry renders.

## Migration Plan

**In the PR, before merge.** The spec deltas are already in the change directory.

1. Contract first: `instrument-contract.ts`, `data/field-value.ts`, `package.json`'s `exports`, the CI
   assertion, and the CI pack step's fixture check (`tests/fixtures/sample-provider`, per the ci.yml
   row). Types compile and both CI checks pass before anything consumes them.
2. `registration.ts`, `registration-listener.ts` and `faults.ts`, with their tests on pi's real
   `createEventBus()`.
3. `startup.ts`: the registry, the own-registration emit, the subscription, the `resources_discover`
   handler and the shutdown clear.
4. The harness: a real bus in the fake `pi`, the `resources_discover` firing, then the reader seam,
   the name normalization and the shipped names. The suite goes green again in this step, before the
   late-binding work.
5. `instrument-binding.ts` and `components/row/` for containment, the provider view, the holder and
   `fills` per plan; then `data/provider-fields.ts` and the repaint wiring; then the J1(b) check and
   `watch`.
6. The export pin and the contribution scan, rewritten against the deltas.
7. `pnpm typecheck` and `pnpm test` green together, then the implementation gate.
8. After the implementation gate and before Validate, the docs pass lands on the PR's branch: the
   guide, `CONTRIBUTING.md`, the README cut, the removal of `docs/releasing.md`, ADRs 0017 and 0018,
   and the five files T16 names.
9. After Validate, the archive merges the deltas into the living specs on the PR's branch.
10. The PR opens with `release:minor`.

**After merge, nothing but the release.** The push to `main` runs typecheck and test, publishes
0.14.0 with the merged commit's README and contract, and tags it. Two hand-offs remain for whoever
watches the release:

- Confirm the published tarball carries `extensions/jefferson/instrument-contract.ts` and that
  `exports` resolves for an installed copy — the one thing a provider cannot test before it ships.
- Publish the guide's promise: the minimum-Jefferson line says 0.14.0, so a failed release makes that
  line briefly false. Nothing else depends on it.

**Rollback.** Revert the change and release a new minor. A provider's registration becomes an unknown
name in a user's document, which warns after startup and renders `blank`; no user document needs an
edit, because a bare name still means what it meant (D7). Nothing is stored on disk, so there is no
data repair. The published `exports` entry disappears, which breaks a provider's build until it drops
the contract — expected, and why the release note names it.

## Open Questions

Two, and neither changes a rule, a file list or a task:

- **Whether the guide keeps its "what the user sees when things go wrong" section as a list or a
  table.** It depends on how long the wording turns out; the docs pass, which reads the prose,
  decides.
- **Whether `docs/instruments.md` should also list a provided instrument's variables in the user's
  document reference.** A provided instrument's variables belong to its provider's documentation, so
  the default is no; if the guide reads thin, one sentence in `docs/instruments.md` points at it.
