# Red/green spike: `extensions-provide-instruments`

Derek. A throwaway implementation of the design in a worktree, built to prove each check the change
will rely on goes red against `37a1698` and green against a minimal implementation. Nothing here
ships: Implement rebuilds from `tasks.md`.

**How it ran.** `git worktree add -b spike-redgreen <mktemp -d>/wt 37a1698` (the branch
`extensions-provide-instruments` is checked out in the main repository, so the worktree took a new
branch at the same commit). `pnpm install --frozen-lockfile` inside the worktree, its own
`node_modules`, no symlink. The consumer for the packaging check lived in a second directory under the
same `mktemp -d`. Reds were taken by `git checkout 37a1698 -- extensions package.json` with the new
tests left in place, then restored with `git checkout <spike commit> -- extensions package.json`.

New test file: `tests/registration.test.ts` (17 tests, labelled `A1`…`A9`). Fixture:
`tests/fixtures/sample-provider/` (`A10`). Packaging check: a script run by hand (`A11`).

---

## 1. The checks

### A1 — registration on `jefferson:registration`, reports on `jefferson:update`

`tests/registration.test.ts`: *"A1 a registration on jefferson:registration renders in a row that
names it"*, *"A1 a report on jefferson:update reaches the row from the next render"*.

- **Red** (base): `AssertionError: Expected values to be strictly equal: + 'Lorem ipsum dolor sit amet,
  consectetur adipiscing elit, sed do eiusmod tempor' - 'Savings: $4.10'`. The base has no bus
  subscription, so the entry holds `blank` and the report changes nothing.
- **Green**: `Savings: $4.10`, and after a second report `Savings: $9.99`, with `notified` empty.
- **Files**: `extensions/jefferson/registration-listener.ts` (new), `registration.ts` (new),
  `data/provider-fields.ts` (new), `startup.ts`, `configuration.ts`, `shipped.ts`, `row.ts`,
  `row-renderer.ts`, `instrument-binding.ts`, `instrument.ts`, the eleven instrument files,
  `package.json`.

### A2 — refusals and the once-per-session fault ledger

*"A2 a payload that is not a registration warns once, and a repeat adds nothing"*, *"A2 a second claim
on a taken name is refused, and the first keeps rendering"*.

- **Red**: `+ [] - [{ message: 'pi-jefferson: a registration is not an object', type: 'warning' }]`; and
  `+ 'Lorem ipsum …' - 'Savings: $4.10'` for the second claim.
- **Green**: exactly one warning for the kind across two bad payloads; the first claim keeps the name
  and the second is refused with `"taiknr.savings" is already registered, so this registration is
  refused`.
- **Files**: `faults.ts` (new), `registration-listener.ts`, `registration.ts`, `startup.ts`.

### A3 — J1(b): a provided instrument's settings checked when it registers

*"A3 a provided instrument's format naming an undeclared variable refuses only that instrument"*
(provider-first) and *"A3 the same document in Jefferson-first order refuses the same instrument
alone"*.

- **Red**: the base warns the unknown-name form instead —
  `pi-jefferson: <path> row 1: "taiknr.savings" is not a known instrument; the instruments block names
  instruments the extension does not implement: "taiknr.savings"` — where the design's part is
  `"taiknr.savings" is configured with a format naming "$spent", which the instrument does not declare;
  its entries render blank`.
- **Green**: both orders produce the same one warning, the row's other entries render, and the refused
  entry renders `blank`.
- **Files**: `configuration.ts` (`checkProvidedSettings`, the `refused` set, the watch's `apply`),
  `registration.ts`, `startup.ts`.

### A4 — late binding of an entry that renders blank until it registers

*"A4 an entry that renders blank takes the provided instrument, and its width behaviour, when it
registers"*.

- **Red**: `+ '  Lorem ipsum dolor sit amet, …' - '                     …        Savings: $4.10'`.
- **Green**: before the registration the cell holds the fallback and fills; after it, the provided
  instrument does not fill, so a right-aligned cell pushes its text to the row's edge, and the line is
  still 80 columns.
- **Files**: `row.ts` (`InstrumentHolder`, `Cell.name`), `row-renderer.ts` (`fills` read per plan, the
  text cache keyed on the instrument), `configuration.ts` (the watch and its holders).

### A5 — the startup-complete warning batch

*"A5 an unknown name warns only once startup has completed"*, *"A5 a fault found before startup
completes joins the batch after the unknown-name part"*.

- **Red**: `+ [{ message: 'pi-jefferson: <path> row 1: "taiknr.savings" is not a known instrument' }] -
  []` (the base warns at `session_start`), and `1 !== 0` for the queued fault.
- **Green**: nothing at `session_start`; at `resources_discover` the unknown-name part first, then the
  fault, in arrival order.
- **Files**: `startup.ts` (the `resources_discover` handler, the pin comment), `configuration.ts`
  (`unknownNames` as data, `acceptedWarning`), `faults.ts` (`open`).

### A6 — resolver containment

*"A6 a resolver that throws costs only its own entry, and warns once"*, *"…returns a number…"*,
*"…returns undefined renders nothing and reports no fault"*, *"…returns a rejected promise…"*.

- **Red**: the base's only warning is the unknown-name one, and the entry renders the placeholder
  (`+ 'Lorem ipsum …' - ''` for the `undefined` case).
- **Green**: a throw, a number and a rejected promise each cost only their own entry, each produces
  exactly its own table row once across five frames, the rest of the row renders, and the process
  survives the rejection. `undefined` renders nothing with no fault.
- **Files**: `instrument-binding.ts` (`adaptProvidedDeclaration`, `containProvided`), `faults.ts`,
  `configuration.ts`.

### A7 — repaint on every registration and every report

*"A7 a registration and a changed report each request one repaint, and an unchanged report none"*.

- **Red**: `0 !== 1` — the base never asks for a repaint.
- **Green**: registration `+1`, changed report `+1`, same-value report `+0`.
- **Files**: `registration-listener.ts` (one `repaint()` per accepted registration),
  `data/provider-fields.ts` (`report` compares with `!==`), `startup.ts` (the repaint entry point).

### A8 — the `jefferson.default.*` names and the bare-name shorthand

*"A8 a bare name and jefferson.default.* name one instrument, with one configuration"*,
*"A8 a bare name does not reach a provided instrument"*.

- **Red**: `+ 'Lorem ipsum …' - 'at pi-jefferson'` — the base has no `jefferson.default.path`, so the
  full spelling is unknown.
- **Green**: both spellings render the one configuration, with no warning.
- **Pin, not a red**: *"a bare name does not reach a provided instrument"* is already true at the base
  (a bare `savings` is unknown there too), so it pins the rule rather than proving new behaviour.
- **Files**: `registration.ts` (`normalizeName`, `isProvidedName`), `configuration.ts`, the eleven
  instrument files, `shipped.ts`.

### A9 — the boolean field

*"A9 a boolean field reads false as reported, and unknown before the report"*.

- **Red**: `+ 'Lorem ipsum …' - ''` before the report.
- **Green**: nothing before the report; `Working: idle` after `false` is reported.
- **Files**: `data/field-value.ts` (new), `data/provider-fields.ts`, `instrument-binding.ts`,
  `registration-listener.ts`.

### A10 — the types-only contract, type-checked from a consumer under `nodenext`

`tests/fixtures/sample-provider/provider.mts` + `tsconfig.json` (target/lib ES2021, module and
moduleResolution `nodenext`, `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
`noEmit`, `types: []`). The consumer: `pnpm pack`, extract into
`$tmp/provider/node_modules/pi-jefferson --strip-components=1`, copy the fixture, run
`pnpm exec tsc -p "$tmp/provider/tsconfig.json"`.

- **Red**: with the base manifest (no `exports`), `provider.mts(14,8): error TS2307: Cannot find module
  'pi-jefferson/instruments' or its corresponding type declarations.` exit 1.
- **Green**: exit 0, no output.
- **Files**: `extensions/jefferson/instrument-contract.ts` (new), `data/field-value.ts` (new),
  `package.json`, `tests/fixtures/sample-provider/*` (new).

### A11 — the packaging check for `package.json` exports

A script that reads the packed manifest and the packed file list, as the CI step will.

- **Red, no export**: `FAIL: the packed manifest declares no ./instruments export` (exit 1) — the base
  manifest has no `exports` field.
- **Red, a target the tarball lacks**: with `exports["./instruments"]` pointed at
  `./tests/fixtures/sample-provider/provider.mts`, `FAIL: the export's target
  ./tests/fixtures/sample-provider/provider.mts is not in the packed file list` (exit 1).
- **Green**: `OK: ./extensions/jefferson/instrument-contract.ts is in the packed file list`.
- **Files**: `package.json`.

### A12 — every existing suite

- **Base**: `pnpm test` → `tests 423, pass 423, fail 0`; `pnpm typecheck` → clean.
- **With the change**: `pnpm test` → `tests 440, pass 440, fail 0`; `pnpm typecheck` → clean.
- The 17 new tests are the only additions; the 423 existing ones pass after the edits the design's
  decisions force (listed under Design gaps 4 and 5).

---

## 2. Totals

| | base `37a1698` | spike |
|---|---|---|
| `pnpm test` | 423 tests, 423 pass, 0 fail | 440 tests, 440 pass, 0 fail |
| `pnpm typecheck` | clean | clean |
| new tests | — | 17 (`tests/registration.test.ts`) |
| diff | — | 34 files, +1761 / −330 |

---

## 3. Design gaps

Every one is a place the design is silent, wrong, or forces a decision. None was decided here beyond
what a spike needs to run.

1. **The reader has no route to the renderer's `invalidate()` or to a repaint.** Decision 9 has the
   watch's `apply` "drop the renderer's cached text through its existing `invalidate()` route, and
   request one repaint", but decision 8's `ConfigurationSource` lists only `resolve`, `fallback`, the
   notice gate, `report` and `watch` (`design.md`, decisions 8 and 9). The spike keyed the renderer's
   text cache on the instrument the cell holds (`row-renderer.ts:42-52`) so a filled holder drops the
   cache by itself, and let the listener's one `repaint()` per accepted registration be the repaint.
   The design should name the seam or say the cache is keyed on the instrument.
2. **`acceptedWarning(path, …)` needs the document path at `resources_discover`, and `Configuration`
   does not carry it.** Decision 12 returns `unknownNames` as data and has `startup.ts` compose with
   `acceptedWarning`; the path is chosen inside `readConfiguration` (`configuration.ts:500-501`), so
   the spike added `Configuration.path`. Without it the composition root would have to repeat the
   reader's project-vs-agent choice — two homes for one fact.
3. **The two channel strings have no single runtime home.** The contract is types-only (decision 1), so
   the literals must be written again where the bus is subscribed; the spike writes them in
   `registration-listener.ts:18-21` annotated with the contract's literal types, which catches a typo
   only if the annotation is kept. The design does not say where the runtime spelling lives.
4. **`Cell`'s new shape ripples into two test files the design's modified-files table does not list.**
   `design.md`'s "Modified files" names only `tests/jefferson.test.ts`, but `Cell` gaining `name` and
   `holder` (`row.ts:21-26`) forces edits in `tests/row-renderer.test.ts` (every cell literal) and
   `tests/configuration.test.ts` (`cell.instrument` reads, and the `Object.keys(cell)` assertion at
   `:457`). M27 names `tests/configuration.test.ts`; it does not name `tests/row-renderer.test.ts`.
5. **Retiring `instrumentNamed` ripples into five test files, not one.** `tests/instrument.test.ts`,
   `tests/format.test.ts`, `tests/row-renderer.test.ts` and `tests/session-data-feed.test.ts` all
   resolve declarations through it today (`research-eleanor.md` §1 lists them). The design's table
   names only `tests/jefferson.test.ts`; M27 names `tests/instrument.test.ts` as well.
6. **`instrument-binding.ts` gains two exports, not one.** Decision 14 records
   `adaptProvidedDeclaration`; the outer boundary around the bound render (decision 10) needs its own
   entry point, which the spike wrote as `containProvided` (`instrument-binding.ts:89-101`). The export
   pin has to list both, and the design should say so.
7. **The design's "one object" claim for the adapted declaration does not hold for a name that
   registers late.** Decision 6 says "the acceptance parse, the J1(b) check and the bind all read one
   object"; for a name the document read before the registration, the J1(b) check runs in `apply` and
   re-reads the declaration from the registry (`configuration.ts:450-462`). It is the same object, but
   the design's sentence reads as if the check always runs at acceptance.
8. **`data/provider-fields.ts`'s `declare` and the listener both decide a field's type conflict.**
   Decision 6 puts the "declared again with another type refuses the later registration" rule in the
   acceptance unit, and decision 11 puts the holding in `data/`. The spike validates in the listener
   (`registration-listener.ts:160-176`) and again in `declare` (`provider-fields.ts:32-41`), because
   `declare` cannot be trusted to be called only after validation. One home is needed.
9. **A watch's release point is stated twice and differently.** Decision 19 item 3 says
   `releaseWatches()` rides the release closure; decision 6's `clearProvided` also drops provider
   state. The spike put `releaseWatches()` on the registry and called it from the install's release
   (`startup.ts:129-133`), and `clearProvided` clears watchers too (`registration.ts:85-95`). The design
   should say which one owns it.
10. **The design does not say what a registration with an empty `instruments` list does.** The table
    has "carries no instruments" for a missing list; the spike treats `[]` the same way
    (`registration-listener.ts:86-89`). A provider that registers only fields is therefore refused,
    which may or may not be intended.
11. **The design does not say whether a report may arrive for an extension whose only accepted
    registration declared no fields.** The spike answers "without a registration" only when no
    registration was accepted at all (`registration.ts:74-76`), so a fieldless registration makes a
    report read "which it did not declare". Worth a sentence.
12. **`resources_discover` fires on every path that starts a session, so `faults.open` runs again in
    session two.** Decision 19 has `close()` clear the ledger at shutdown, which the spike does; but
    the design does not say whether a second `open` in one factory's life is expected. The spike's
    `open` simply replaces the notify function (`faults.ts:41-44`).

---

## 4. Docs for Bambadjan

The change makes these false or incomplete; the spike did not edit any Markdown.

- `AGENTS.md:30-43` — "Adding an instrument" says one file under `components/instruments/` plus one
  entry in `shipped.ts` so `instrumentNamed` resolves it. `instrumentNamed` is gone; the entry is now
  one member of `SHIPPED`, and the declaration's `name` is `jefferson.default.<name>`.
- `AGENTS.md:20-27` — the commands block is still right, but the "no build step" note should say the
  package now publishes a `.ts` subpath through `exports`.
- `ARCHITECTURE.md:16` — names `shipped.ts` as the shipped list and lookup; it is now the shipped list,
  the fallback and the notice gate, with no lookup.
- `ARCHITECTURE.md:92-95` — describes configuration resolving instrument names against the shipped
  table; it now resolves through the registry, normalizes every name, and returns unknown names as
  data.
- `ARCHITECTURE.md:164-170` — the import-direction paragraph should admit `registration.ts`,
  `registration-listener.ts`, `faults.ts`, `instrument-contract.ts` and `data/provider-fields.ts`.
- `docs/instruments.md:73-90` — the unknown-name section says the warning comes with the document's
  read; it now comes after startup completes, and a provided name may register later.
- `docs/configuration.md` — needs the bare-name rule and the namespaced-name form (design decision 16
  already lists this).
- `README.md` — the documentation index needs the extension-author guide line (design decision 16).
- `tests/jefferson.test.ts:19-23` — the comment claiming pi loads every direct `.ts` child of
  `extensions/` is false (M26). The spike corrected it in the worktree; the real change must too.

---

## Not verified

- No live pi session: the `resources_discover` order, the paint window before a late registration, and
  the transcript behaviour of a warning are all from the research reports, not from running pi.
- The CI step itself was not edited; A11's script is a stand-in for the assertion the design puts in
  `.github/workflows/ci.yml`, and A10's consumer was assembled by hand rather than by the workflow.
- `pnpm pack` ran in the worktree, so the tarball's `files` list is the repository's, not a published
  release's.
- The spike's implementation covers every row of decision 15's table, but its tests exercise only the
  rows the checks name; the rest are unproven. It does not touch the docs pass.
