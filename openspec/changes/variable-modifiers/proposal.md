# Proposal

## Why

The thinking instrument shows `$level` only as the host spells it — `off`, `minimal`, `medium`,
`xhigh` — and the format language can neither change a value's text nor style part of a format.
Joel asked for both in one ruling: *"In the thinking instrument, is it possible to do any string
modifications? I'm curious if we can make the $level capitalized"*, and then made it the first
feature to run through the conductor (`owner-rulings.md`, 2026-11-06). The change is a `|name`
modifier after a variable or after literal text, chainable, that either mutates the value's string
or applies one of pi's six text attributes.

## What Changes

- **A modifier is written `|name` after the text it applies to.** Joel: *"we're essentially going to
  create each of these as a `|xxx` modifier that can follow a variable. They should be chainable, as
  well."*, and *"modifiers should able to be applied to normal text, as well. e.g. "🧠 $model
  via|dim $provider|capitalize""* (`owner-rulings.md`, 2026-11-06). Chaining, and the modifier on
  literal text, are both the ruling's.

- **A `|` begins a modifier only when a name follows it directly.** Joel chose the literal reading
  of a bare pipe: *"Literal text"* (`council.md`, "Joel's rulings at the owner-decisions gate"). A
  `|` followed directly by a modifier name begins one; a `|` followed by a space, by the end of the
  format or by any character a name cannot hold stays the character it is, so `$model | $provider`
  keeps rendering as it does today. Where a literal pipe must sit beside a name, `\|` writes it. An
  unknown name after a `|` still rejects the document — the name is a name, and a misspelling is not
  a licence to render it as text.

- **BREAKING, narrowly — `|` becomes a special character where a name follows it.** `|` is an
  ordinary literal character today and a pipe audit found it special nowhere
  (`research-eleanor.md` §1, §3); the living requirement names `$` as the format's only special
  character (`openspec/specs/statusline/spec.md`, "An instrument's format is plain text and
  variables"). After this change a user document that writes `$level|word` renders `|word` as text
  today and will instead apply a modifier or be rejected. No shipped string changes meaning: the
  audit found no `$variable|` in any living spec, ADR, `ARCHITECTURE.md`, `AGENTS.md`, test format
  string, default format or README example (`research-eleanor.md` §3), and the repo holds no
  `pi-jefferson.json`. A user's own document can hold one, which is why the break is marked rather
  than called compatible — and it is now as narrow as the ruling allows, because the common
  `$model | $provider` spelling survives untouched.

- **The format requirement loses two clauses and gains the pipe.** "The format language MUST NOT …
  apply a style" becomes false the moment an attribute is a modifier, and "`$` is the only special
  character" becomes false with the pipe. Both go, and `$` and `|` are named as the two special
  characters. The no-styling guard survives where it always belonged: "The extension MUST NOT add
  style vocabulary of its own" stays in "An instrument's style is pi's ThemeStyle", now covering the
  modifiers as well as the `style` option. `AGENTS.md` says to retire a rule *"in an ADR rather than
  deleting it"*, so an ADR is owed for the retirement (`michael-orientation.md`, item 10); it
  belongs to the docs pass, not to this change.

- **The six ThemeStyle attributes become modifiers, with no new vocabulary.** Joel's ruling names
  them; the living requirement already forbids the extension adding style vocabulary of its own; and
  `ThemeStyle`'s six booleans are `bold`, `dim`, `italic`, `underline`, `inverse`, `strikethrough`
  (`research-chidi.md` §5). So a modifier's spelling for styling is the same six words `style`
  already takes. Joel ruled the scope: *"Add only (Recommended)"* (`council.md`, "Joel's rulings at
  the owner-decisions gate") — a style modifier turns an attribute on and adds to the instrument's
  `style`; there is no way to switch an attribute off, and `fg` and `bg` are not modifiers.

- **String mutations come from lodash.** Joel, told the evidence pointed to lodash: *"lodash is
  the way to go. It's been king for decades"* (`owner-rulings.md`, 2026-11-06), on top of his
  *"please don't come up with our own string mutation methods. There's plenty of libraries out
  there that do that. pick the community defacto"*. Lodash carries every shape the ruling names:
  `_.upperFirst` for the first character only with the rest untouched, `_.toUpper` and `_.toLower`
  for the whole string without re-tokenizing words (`research-chidi.md`, Addendum 2). Its own
  `_.capitalize` is not one of them — it lowercases the remainder. The ruling leaves the package
  (`lodash` or `lodash-es`) to the design (open, below), and one dependency of its own arrives
  with it: neither build ships declarations, so `@types/lodash-es` is needed for `pnpm typecheck`
  and the lockfile moves in the same change, because CI installs with `--frozen-lockfile`
  (`research-chidi.md`, Addendum 3C, 3D).

- **The dependency is the package's first, and only for mutations.** `package.json` has no
  `dependencies` key at all today,
  and the host packages are `peerDependencies` at `*` and must stay there
  (`research-eleanor.md` §8). A declared `dependencies` entry is installed by `pi install` and
  resolves from extension files, per `docs/packages.md`: *"Pi installs package dependencies when it
  installs an npm or git source"* (`research-chidi.md` §7). No vendoring, no change to which
  packages ship, and no `files` or `pi.extensions` move — CI's invariant check is untouched
  (`research-eleanor.md` §8).

- **Three string modifiers, named.** Joel ruled the names: *"capitalize, upper, lower
  (Recommended)"* (`council.md`, "Joel's rulings at the owner-decisions gate"), one per lodash
  function — `capitalize` is `_.upperFirst` (first letter only), `upper` is `_.toUpper` (the whole
  value), `lower` is `_.toLower` (the whole value). The first is the ruling of 2026-11-06 (*"the
  first letter only. all-caps would be the modifier"*), and it is not `_.capitalize`, which
  lowercases the remainder (`research-chidi.md`, Addendum 2, verified empirically).

- **One home for the modifier names.** By the rule that made an instrument declare its names once
  (`An instrument is declared once, and every reader reads that declaration`), the modifier names
  get one table that parsing, validation and rendering all read, and none of the three carries its
  own copy (`michael-orientation.md`, item 4).

- **An unknown modifier rejects the document when it is read**, naming the instrument and the
  modifier, by the convention the format requirement already applies to an unknown `$name` and the
  style requirement applies to an unreadable style (`michael-orientation.md`, items 11-12).
  Reading time, not render time, is the convention every other format check already follows
  (`research-eleanor.md` §1).

- **No modifier on `$bar`.** A `$bar` takes the width the rest of the format leaves and nothing
  else; a modifier written after it rejects the document, which the council agreed on and neither
  advisor contested (`council.md`, "Agreed by both advisors"). It is a rejection rather than an
  ignored suffix because `$bar` is a variable whose value is geometry, not text, and silently
  styling or mutating a bar would make the cell lie about the width it occupies.

- **Modifiers run on text, before anything is measured or styled.** The council's agreed order in
  `resolveFormat`: the undefined rule first, then the control-character collapse, then string
  mutations in the order written, then `$bar`'s width measurement, then one styling call per
  segment (`council.md`, "Agreed by both advisors"; `research-chidi.md` §5; `research-chidi.md` §3
  for `ß` → `SS`). Mutating after styling would run case changes over escape sequences, and
  measuring the bar before mutating would leave it counting columns the value no longer takes.

## Capabilities

### New Capabilities

None. The format language's grammar, its rejection rules and its styling all live in `statusline`
today — "An instrument's format is plain text and variables", "An instrument's style is pi's
ThemeStyle", "An instrument's style is validated when its document is read". A modifier is that
grammar's next production, not a new capability.

### Modified Capabilities

- `statusline`: two requirements amended, four added.
  Amended — `An instrument's format is plain text and variables` (`$` and `|` are the two special
  characters; `|` begins a modifier only when a name follows it directly; a literal pipe is `\|`;
  an undeclared `$name` still rejects; and the clause forbidding the format language to apply a
  style goes because a modifier now applies one); `An instrument's style is pi's ThemeStyle` (the
  no-new-vocabulary rule now reaches a format's modifier, not only the `style` object).
  Added — `A modifier follows a variable or literal text` (the grammar, what a name is, chaining,
  the preceding non-whitespace run a plain-text modifier covers, `$bar` taking none, the one home
  for names, and that a modifier never changes whether a cell renders); `A style modifier only sets
  an attribute on` (add-only, no off switch, no `fg`/`bg` modifiers); `The string modifiers are
  capitalize, upper and lower` (their names and their semantics, no mutation written here, and the
  library declared in `dependencies`; the requirement names no vendor, so lodash stays the
  design's); `An unknown modifier rejects the document when it is read` (rejected, named, before
  anything renders).

- `session-data-store` and `extension-source-layout` are inspected and **not** amended. No datum is
  added and no store behavior changes; the store hands out the same strings it hands out today
  (`research-eleanor.md` §4). A non-host `dependencies` entry is what
  `Host packages are the host's to supply, and imports run one way` leaves room for — it forbids
  host packages in `dependencies`, not dependencies as such — and nothing in the published file set
  moves.

## Impact

- `extensions/jefferson/format.ts`: `parseFormat` is where the grammar is read and where a bad
  format rejects the document today (`research-eleanor.md` §1), so the pipe and an unknown modifier
  are read there. `resolveFormat` substitutes each variable, then calls `styledPiece` per segment,
  and `$bar`'s width is `width − Σ visibleWidth(non-bar pieces)` (`research-eleanor.md` §1, §5). A
  mutation that changes a value's width therefore has to be measured by that sum, not beside it —
  `ß` upcases to `SS`, two columns where there was one (`research-chidi.md` §3). Where the modifier
  table lives is the design's; `ARCHITECTURE.md` names `format.ts` as the format language's home
  (`michael-orientation.md`, item 16).
- `package.json` and `pnpm-lock.yaml`: a first runtime `dependencies` entry, `lodash-es` per the
  design's package decision (`research-eleanor.md` §8; `research-chidi.md`, Addendum 3), and one
  `@types` package in `devDependencies`. The lockfile lands in the same change because CI installs
  with `--frozen-lockfile` (`research-chidi.md`, Addendum 3D). The host packages stay
  `peerDependencies` at `*`, and the dependency does not enter the tarball — `files` is unchanged
  and pi installs it consumer-side (`research-chidi.md` §7, Addendum 3D).
- `tests/format.test.ts` holds the grammar, the exact rejection messages, the style validation and
  the bar math (`research-eleanor.md` §1), so it is where the modifier behavior and its rejections
  are pinned, with `tests/configuration.test.ts` covering the document-level rejection path
  (`research-eleanor.md` §7).
- Docs the change makes false: `README.md`'s configuration paragraph says `format` is plain text
  with `$variables` and "not Markdown", names no pipe and does not document the `\$` escape
  (`research-eleanor.md` §1), and the living requirement quoted above is amended by this delta. The
  owed ADR for retiring "the format language MUST NOT apply a style" belongs to the docs pass.
- Untouched: `$bar`'s requirement, including "with no dependency the package does not already
  declare" — that clause constrains how the bar is drawn and stays true; the new dependency is for
  mutations, not for the bar. No instrument, no datum, no row geometry, no CLI or API surface.

## Where the evidence and the rulings collide

The ruling wins in each case; each collision is named so the council can re-check it. The two
reports do not disagree anywhere this change rests on: Eleanor's open questions about the six
attributes' SGR codes and about the library are the ones Chidi answers (`research-chidi.md`
§5-§7).

1. **"Add no new dependencies" and the mutation ruling cannot both hold.** The orientation read
   records `"Don't invent what we don't have to"` as implying one (`michael-orientation.md`,
   item 6). That is not Joel's quoted wording in the archived rulings, and his 2026-11-06 ruling
   requires a library by name. A runtime dependency is permitted; the "don't invent" rule governs
   *where the mutation comes from* — the community de facto — not whether one is declared.
2. **The word "capitalize" points at the wrong lodash function.** Joel's "first letter only" is
   `_.upperFirst`; lodash's own `_.capitalize` is `upperFirst(toString(string).toLowerCase())` and
   would render `HIGH` as `High` (`research-chidi.md`, Addendum 2, verified empirically). es-toolkit
   and radash copy that lowercasing semantics, so the trap is in the ecosystem and not only in the
   library. A modifier named for the behaviour and a function chosen for it have to be checked as a
   pair; the obvious name and the obvious function are not the same one here.
3. **Styling gains a second source, and the host's primitive does not nest it.** `theme.style()`
   delegates to pi-tui's `styleTextWithAnsi`, which concatenates prefixes and suffixes and re-opens
   nothing, while chalk — which `Theme.bold` and friends use — re-opens after a close
   (`research-chidi.md` §5). Bold and dim share SGR 22, so `style('a' + style('b', {bold:true}) +
   'c', {dim:true})` renders `c` undimmed. Today `styledPiece` applies the instrument's style once
   per segment (`research-eleanor.md` §5), so an instrument styled `dim` whose format carries a
   `|bold` on one variable is exactly that shape. The council's answer is one `theme.style()` call
   per segment, with the modifiers merged into that segment's style before the call
   (`council.md`, "Agreed by both advisors"); that they cannot be two nested calls is the
   measurement's.

## Open questions

One survived the owner-decisions gate, and the design decides it.

**Still open — the package: `lodash` or `lodash-es`.** The ruling says the package is not part of it
(`owner-rulings.md`, 2026-11-06). Chidi measured the difference that decides it: `lodash-es` named
imports work under pi's jiti loader **and** under `node --test`, while `lodash`'s named imports
work under jiti and throw under `node file.ts` — with `tsc` passing that same failing form
(`research-chidi.md`, Addendum 3A-3C). *The design decides, on that evidence; a pick that leaves
lodash would need Joel.*

The other seven are closed, each by a source rather than by this proposal's judgment:

1. **Closed — the modifier names.** Joel ruled `capitalize`, `upper`, `lower`
   (`council.md`, "Joel's rulings at the owner-decisions gate").
2. **Closed — a `|` that no name follows.** Joel ruled it literal text, with `\|` for a literal pipe
   beside a name (`council.md`, same section). This replaced the proposal's earlier framing, which
   had the design choosing between a strict and a lenient reading.
3. **Closed — style modifiers add only.** Joel chose add-only: no off switch, no `fg`/`bg`
   modifiers (`council.md`, same section).
4. **Closed — a modifier on `$bar`.** Rejected, per the council's agreed list (`council.md`,
   "Agreed by both advisors").
5. **Closed — the execution order.** Undefined rule, collapse, mutations, bar width, styling, in
   that order (`council.md`, "Agreed by both advisors").
6. **Closed — what plain-text modifiers cover.** The preceding non-whitespace run, so `via|dim`
   styles `via` (`council.md`, "Agreed by both advisors"). The consequence is named in "What this
   change does not do": a multi-word phrase takes a modifier per word.
7. **Closed — casing.** Joel's own `$provider|capitalize` example settles it: capitalization is a
   modifier, not a reading of how the user spelled the variable (`council.md`, "Settled by a
   ruling").

## What this change does not do

- No Markdown, and no group syntax: `[`, `]`, `(` and `)` stay literal text
  (`michael-orientation.md`, item 7; restated in the living requirement).
- No modifier arguments — nothing in the rulings asks for `|name:value`, and a capitalized value
  needs none. If the design wants them it should say so; this proposal does not.
- No `fg` or `bg` modifiers (ruled out), no per-cell configuration, no second configuration surface:
  a modifier is written in the same `format` string that already exists.
- No grouping syntax, so a modifier on plain text covers the one non-whitespace run in front of it
  and a multi-word phrase needs a modifier on each word (`council.md`, "Agreed by both advisors").
  Starship's `[text](style)` groups stay out, as the 2026-11-05 no-group-syntax ruling requires.
- No change to an instrument's declared variables, to the store, to the row geometry, or to the
  `$bar` math — the mutation lands inside the existing per-segment styling seam, not beside it.
- No new capability, and no new spec home for the format language.
