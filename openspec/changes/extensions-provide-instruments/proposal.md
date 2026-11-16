# Proposal

## Why

An extension cannot put anything in the footer today. The shipped instruments are a fixed table inside
this package, and the only thing a row's entry can render is a declaration compiled here
(`research-eleanor.md` §1, §3). taiknr needs its own instrument — stubs created with the tokens they
hold, the tokens omitted and sent, the context and dollars saved, and whether it is making decision
calls (`owner-rulings.md`, 2026-11-15) — and Joel's rulings give the shape: each extension owns its
instruments in its own repository, and Jefferson publishes only the contract (D1–D3,
`michael-orientation.md` §1). So registration opens to other extensions, and Jefferson's own
instruments register through that same path instead of a second one (D2).

## What Changes

- **A published contract, types only.** `pi-jefferson/instruments` states the shape of the two
  messages — a registration on `jefferson:registration`, an update of a field on `jefferson:update` —
  and a provider imports those types with `import type` and writes the handshake itself (D2, D3, D5;
  O4; `owner-rulings.md`, 2026-11-15, "The two channel names"). Nothing in the contract runs, so a
  provider needs no runtime dependency on this package.
- **A declaration narrower than Jefferson's own.** A registration carries the instrument's name, the
  resolvers of its variables, a default format and an optional default label, and nothing else. No
  options, no timed visual and no composed format reach a provider, because Jefferson has no repaint
  that would make a provider's timed visual hide on time (O4, C8, C10).
- **Registration and reporting over `pi.events`.** An extension registers from its `session_start`
  handler, before any await, declaring the fields Jefferson must keep for it, then reports a value
  when it learns one. Jefferson owns the store, and the words are declare and report, never push (D4,
  D5; S3, C13).
- **Names.** A provided instrument is named `<extension>.<instrument>`, Jefferson's own are
  `jefferson.default.<name>`, and a bare name is shorthand for the default instrument of that name.
  The `jefferson` namespace stays Jefferson's, and the grammar leaves room for a later
  `jefferson.custom.*` (D6, D7, S5).
- **Jefferson's own instruments take the same path.** The static name lookup goes, so the
  configuration reader, the fallback `blank` and the notice gate all resolve what has registered
  rather than a fixed table (T13).
- **Unknown names warn later.** An entry whose instrument has not registered renders `blank` until it
  does, and both unknown-name forms warn only once session startup has completed (D7; S6).
- **A provided instrument's faulty settings refuse only that instrument.** Its entries render `blank`
  and a warning names the instrument and the fault, while the rest of the document renders as
  configured; Jefferson's own instruments keep the whole-document rejection (Joel's answer to J1,
  option b).
- **A rule is retired.** The 2026-11-03 rule that no API lets third-party code supply cell content
  goes, because D1–D3 make registration that API (S8; R1). The requirement in `statusline` is
  modified and the one in `extension-source-layout` is removed and replaced by the rule that
  registration is the only way, which carries the export pin; the test that pinned the old rule is
  rewritten. No configuration document has to change: a bare name still means what it meant (D7).
- **What the contract promises the store and change 3.** A provider's resolver reads only the fields
  that provider declared, provider code costs one entry at most, and a boolean field is declarable and
  reportable so change 3 can build the spinner on this contract (S2; D8; T9). Every provider fault is
  one warning on the path configuration warnings already take, naming the extension, the instrument or
  field and the fault, once per session (O5).
- **Documents.** `docs/extension-authors.md` tells an author how to provide an instrument (D9, D18),
  and the README gains one index line (D18).

## Capabilities

### New Capabilities

- `instrument-registration`: what an extension registers and what Jefferson guarantees it — the
  message the published contract describes, the fields a registration declares, the values a provider
  reports, the name grammar, the narrow readings a provider's resolver sees, the containment of
  provider code, and when a provider may register and must stop.

The three living capabilities own other subjects. `statusline` states what a document declares and
what the footer renders, `session-data-store` states the datums Jefferson's own instruments read and
how current they are, and `extension-source-layout` states what ships and where it lives. None of them
owns a contract an outside extension calls, so registration gets a capability of its own. That
capability is also the only home this change has for behavior a user never writes: a provider's
declaration and reports are author-facing, and no living requirement states them.

### Modified Capabilities

- `statusline`: a cell's instrument may come from an extension's registration ("Cell text is the
  instrument its entry names", "An entry names the instrument its cell renders"), the unknown-name
  warning moves to the point where startup completes, the bare name of a default instrument becomes a
  document rule ("A bare name means the default instrument of that name"), a provided instrument takes
  no option of its own, and one requirement says what a provided instrument's faulty settings do.
- `session-data-store`: unknown is distinguished from `false` as well as from an empty string and
  zero, so a reported boolean reads as reported (D8), and a declared provider field becomes store
  data, with its own repaint (O3).
- `extension-source-layout`: the export-surface prohibition is retired and replaced by one that offers
  registration, the shipped instruments register instead of being resolved by a static lookup, and
  three requirements cover the published contract: the `exports` entry, its tarball and CI check, and
  its types-only closure. Two home requirements change to admit the contract and registration.

## Impact

- **Package and shipping.** `package.json` gains `exports` with `./instruments` alone. `files` does
  not change, because it already ships the tree, and the contract sits where `tsconfig.json` and the
  tarball already reach (T11, R-10). CI gains one assertion on the packed manifest: the export's
  target is in the packed file list, because a target missing from a published tarball cannot be
  withdrawn (T11). A test type-checks a sample provider against the packed contract under flags other
  than this repository's (C9).
- **Source.** The configuration reader, the shipped set, startup (what it subscribes to, and the point
  where warnings fire), the store for provider fields, the notice gate, and whatever holds
  registrations and reported values before the store exists (T2, T3, T5, T7, T13, T14). The test
  harness's fake `pi` needs a real event bus before any end-to-end test in it can run, and the comment
  claiming pi loads every direct `.ts` child of `extensions/` is false and is corrected (R-11, CC10).
- **Retired rule and its test.** One requirement in `statusline` is modified and one in
  `extension-source-layout` is removed and replaced, the export pin and the scan of export keys at
  `tests/jefferson.test.ts:418-490` are rewritten, and an ADR in `docs/adr/` records the retirement,
  as `AGENTS.md`'s "Where decisions live" requires (S8; R1).
- **Contributor documentation, in the docs pass.** A root `CONTRIBUTING.md` takes release and
  development out of the user docs, the README keeps its user index, `docs/releasing.md` is removed
  once its content has a home, and its reasoning about how releases are versioned becomes an ADR
  (`owner-rulings.md`, 2026-11-15, "Contributor documentation moves out of the user docs").
- **Documentation this change makes false.** `AGENTS.md:30-43`, `ARCHITECTURE.md:16`, `:92-95`,
  `:164-170`, `docs/instruments.md:73-90` (T16). These go to the docs pass and never block.
- **Not touched.** taiknr's repository (D1); the spinner and any animation clock (D8);
  `jefferson.custom.*`; the host-data feed's seeds, pushes and sampled readers, because D2 rules on how
  instruments register and not on how Jefferson's own data arrives (`michael-orientation.md` §2); the
  one host-loaded entry; host packages as peers and `lodash-es` imported one function at a time; the
  equal-distribution code and its tests (D15); the document's shape and Joel's approved strings (D14,
  D17); `/jefferson` and its pinned strings, which stay as they are (O5, second ruling).
- **Release.** `release:minor` (S11).
- **Settled questions.** The council settled all ten of Michael's open questions, and Joel ruled on
  the one that needed him; `council.md` records each ruling and each finding. The two that most shape
  this proposal are O4, the contract is types only, and O3, registrations and reported values are held
  from Jefferson's factory and dropped at a session shutdown, never at `session_start`. No question is
  left open before the design.
