# Proposal

## Why

A row in `pi-jefferson.json` is an object that carries a `cells` array, and each entry in that array
is another object naming an instrument (`research-eleanor.md`, "Parser and source selection"). That
gives a row three keys of its own — `cells`, `id` and `distribution` — and the two changes after this
one, which register instruments over `pi.events` and add pi's spinner, need none of them. Joel's
ruling of 2026-11-15 settles the replacement: *"couldn't rows be a list of lists of objects and we
dont need the instruments per row? the top level key is safe"* (`owner-rulings.md`). A row becomes a
plain list of entries now, while breaking is still allowed before 1.0.0 (*"we're safe to break things
but we're getting closer toa 1.0.0"*), so the two later changes build on one shape rather than
reshaping it again.

## What Changes

- **BREAKING — a row is a plain list of entries.** `rows` holds the rows; each row is a list such as
  `[{ "instrument": "model" }, { "instrument": "context", "align": "right" }]`; an entry carries
  `instrument` and may carry `align`, and any other key rejects the document and is named in the
  warning. Source: Joel's 2026-11-15 ruling, `michael-orientation.md` D3 and D5.
- **BREAKING — the one-row shortcut is retired.** `rows`, when it is present, is the only way to
  declare rows, and it is optional: a document with no `rows` and no retired key renders the default
  row, as does `rows: []`. Sources: Joel's answer *"a"* to `michael-orientation.md` JOEL-1, the
  2026-11-02 rule it retires (D14), and `council.md` (Michael, ruling 4).
- **BREAKING — a row can no longer declare `id`, `distribution` or `containers`.** All three were
  keys on a row object, and a row is no longer an object. A configuration can no longer ask for
  equal shares; the renderer keeps its support for both distributions, and its tests, for a time
  when something configures one again. Sources: D3, D8, `michael-orientation.md` T6.
- **BREAKING — a retired key is rejected, not ignored.** The retired top-level keys are exactly
  `cells`, `id` and `distribution`, and any of them rejects the document whether or not `rows` is
  present, checked before `rowGap`, `instruments` and the rows themselves, in one message that
  spells the new shape — because that message is the only migration help a user sees. Sources:
  `michael-orientation.md` T3 and T4; `council.md` (Michael, rulings 1 and 2).
- **The `containers` notice goes.** A top-level `containers` becomes an ordinary unknown key,
  ignored silently, because the key has not been read since 2026-11-03 and its advice now points at
  a key the same change rejects. Source: `council.md` (Michael, ruling 3).
- **"Cell" leaves the words a user reads.** It leaves the configuration's keys, the warnings and the
  README, and the code keeps the word. A rejection calls an entry an instrument and places it by its
  row and its position, `row 1, instrument 2:`; an unknown name is placed by its row alone,
  `row 3: "taiknr.savings" is not a known instrument`; and both numbers count from 1. Sources:
  Joel's 2026-11-15 ruling ("Cell" leaves the words users see; *"sure, 1"*), D6, D7, `council.md`
  (Michael, ruling 5).
- **The rules that do not move stay put.** The top-level `instruments` block keeps its name and its
  job, `align` stays on the entry, `rowGap` keeps its range, the ceiling stays ten, an empty row is
  rejected, an unknown instrument name still warns rather than rejecting, and it still warns at
  `session_start`. Sources: D4, D9, `michael-orientation.md` §2.

## Capabilities

### New Capabilities

None. Every behaviour this change alters is stated today by `statusline`.

### Modified Capabilities

- `statusline`: the document's shape, the rules for a row and its entries, where a message places its
  offender, the retirement of `distribution` and of a row `id`, and the retirement of the one-row
  shortcut and of its "cell" wording.
- `extension-source-layout`: one requirement, whose prose cites `statusline`'s requirement by name
  and so has to follow it to its new name. No behaviour changes. Source: `council.md` (Michael,
  ruling 10).

## Impact

- **The parser.** `extensions/jefferson/configuration.ts` holds the document's envelope, the row and
  entry checks, and every message this change rewrites (`research-eleanor.md`, "User-visible messages
  in configuration path"). `isDistribution` loses its only caller and goes
  (`michael-orientation.md` §2).
- **The internal row loses its `id`.** `Row.id` (`components/row/row.ts`) has no reader left once
  every row's identifier is synthesized, so the field goes, along with the duplicate-id check, and
  the `id:` keys come out of the hand-built row literals in `tests/row-renderer.test.ts`,
  `tests/format.test.ts` and `tests/session-data-feed.test.ts`, with no assertion changed.
  Source: `council.md` (Michael, ruling 7).
- **Tests that write a document.** `tests/configuration.test.ts`, `tests/jefferson.test.ts` and
  `tests/instrument.test.ts` write documents in the shape this change retires; 22 of the 26 inline
  documents in `tests/jefferson.test.ts` use the shortcut, and about 22 lines across `tests/` write
  `rows: [{}`, which has no equivalent now that a row lists its entries. Several end-to-end tests get
  equal shares by setting `distribution: "equal"`, which no document can do afterwards. Sources:
  `michael-orientation.md` T3, T6, T9; `research-eleanor.md`, "Tests and message assertions";
  `council.md` (Michael, rulings 8 and 15).
- **What this change must not touch.** `components/row/row-renderer.ts`, `components/row/width-plan.ts`,
  `Row.distribution`, `DISTRIBUTIONS`, and the renderer's tests and their assertions; `shipped.ts`
  and `instrumentNamed`, `data/`, the store, the feed, the `/jefferson` command, both document
  locations and the trust check. Sources: D8, `michael-orientation.md` §2, `council.md` (Michael,
  rulings 7 and 11).
- **Documentation, after approval.** Joel's newest ruling turns the docs pass into a restructure as
  well as a rewrite (`owner-rulings.md`, 2026-11-15, "The README and docs/";
  `research-eleanor-docs.md` §1–2, which lists the README's sections and what `docs/` holds today).
  The README is cut to what a README is for — what it is, status, install, one working document, where
  the documentation is, the two commands, the license — and its 179-line `## Configuration` section
  and `### The notice instrument` move into `docs/configuration.md`, `docs/instruments.md`,
  `docs/formats.md`, `docs/notices.md` and `docs/releasing.md`, written under `what-the-fork`'s rules
  through `my-voice`. The layout leaves the home for the extension-author guide the registration
  change writes. The README's upgrade note tells users who set `"distribution": "equal"` that equal
  shares can no longer be configured, and who wrote a row as `{}` that a row now lists the entries it
  wants. The pass also amends `AGENTS.md`'s "Words" section and `ARCHITECTURE.md`, edits the Purpose
  of `openspec/specs/statusline/spec.md` by hand, which a delta cannot reach and which still says
  "evenly divided cells", and adds ADRs recording the user-facing half of the 2026-11-03 vocabulary
  ruling and why the equal-share branch stays. Sources: D6, T9, T11; `council.md` (Michael, rulings
  10, 12 and 15); `design.md` decisions 11 and 12.
- **Release.** The pull request needs the `release:minor` label, because an unlabelled PR in this
  repository releases as a patch (`michael-orientation.md` T12; `research-chidi.md` §3 on SemVer
  rule 4 before 1.0.0). The conductor applies it when opening the PR; it is not a coder's step and
  not a question for Joel (`council.md`, Michael, ruling 14).

## Decisions this proposal takes, and the questions it leaves open

The council settled these; each ruling is Michael's, in `council.md`:

- **Equal shares leave the spec.** Nothing a user writes selects a distribution, so no scenario can
  name one, and the retained branch's only guarantee is the renderer and width-plan tests D8 keeps.
  The ADR records why the branch stays, and narrows ADR 0007's row option in its Status line
  (ruling 12).
- **The retired set is exactly `cells`, `id` and `distribution`.** Any of them at the top level
  rejects, with or without `rows`; `containers` is not in the set, and its notice is deleted
  (rulings 1, 3).
- **Joel's two approved examples agree.** A rejection places the entry, `row 1, instrument 2`; an
  unknown name in a row is placed by its row alone, once per distinct (row, name); a name that only
  the `instruments` block configures gets a form of its own with no row (ruling 5).
- **`rows` is optional**, and `rows: []` renders the default row with no warning (ruling 4).
- **`Row.id` goes**, which narrows the no-touch list to what D8 protects (ruling 7).
- **The whole migration is one task group that ends green**, because no reader accepts the old shape
  (ruling 8).
- **`containers` in the new shape has no meaning.** A row lists the entries it wants, so a
  placeholder row is `[{"instrument": "blank"}]` and there is no shorthand (ruling 15).
- **The `extension-source-layout` citation is fixed inside this change** with a one-requirement
  `MODIFIED` delta (ruling 10).
- **`/jefferson` stays untouched**, and the rejection toast, which names the file and recurs at every
  session start, is the migration help (ruling 11).

Still open for the design:

- **The exact words of every message** — the retired-key message, the hint for a row written as an
  object, and the form a name gets when only the `instruments` block configures it (rulings 2, 5, 9).
- **The order the placed messages join in**, and the name of the data the parser keeps so that
  change 2 can hold the report back (ruling 6).
- **What each test that sets `distribution: "equal"` becomes**, and the expectation each surviving
  test is rewritten to (ruling 8).
- **Whether the ADR is one or two** — the vocabulary retirement, and the retained branch (ruling 12).
