# Design

## Context

This design fills in what `proposal.md` and `council.md` left to it: how a notice reaches the footer,
where pi's rule lives, how the notice's text becomes configurable, and how a notice stops showing.
Motivation is in `proposal.md`. The reasoning behind each choice is in the Decisions below.

**What exists today.**

- One store and one feed carry every datum a cell displays. `sample()` scans the session's
  usage-bearing entries only when the host's `(sessionId, leafId)` has moved, and the four mutable
  session values are seeded or pushed from the feed (`research-eleanor.md` §1,
  `data/session-data-store.ts:61-95`).
- The feed subscribes to `model_select`, `thinking_level_select`, `turn_end` and
  `session_info_changed`, and exactly one idempotent `release` removes every subscription and
  disposes the store (`research-eleanor.md` §1, `session-data-feed.ts:34-102`). The component's
  `dispose` is that release (`footer-setup.ts:32`).
- `startup.ts` releases the previous install, builds the feed and store with `feedSessionData(...)`,
  and only then calls `readConfiguration(...)` (`research-eleanor.md` Addendum 1,
  `startup.ts:36-60`).
- An instrument declares its name, variables, defaults and options once; `format` is **one**
  configured string per instrument name, parsed by `parseFormat` against that declaration's declared
  variables, and a `variableForms` entry gives alternate renderings of one variable, not alternate
  formats (`research-eleanor.md` Addendum 2, `configuration.ts:76-123`, `format.ts:48-116`,
  `instrument.ts:18-35`).
- An unknown datum suppresses the label and the format together, so a cell whose datum is unknown
  renders nothing (`statusline` spec, "An unknown datum suppresses the label").
- Bounded-integer options are checked by hand, rejecting the whole document: only `rowGap` does it
  today, with `rowGap must be a whole number from 0 to 3: <value>` (`configuration.ts:253-265`),
  caught at the top level and reported as `pi-jefferson: <path> was rejected (<message>); rendering
  the default row` (`configuration.ts:328-344`).

**What pi gives an extension, pinned at 1.4.0.** The notice code, thresholds and event order are the
same in 1.4.0 and in the 1.5.2 install (`michael-orientation.md`, baseline). pi's rule cannot be
imported: the package's `exports` map is `{".", "./rpc-entry"}` and the barrel exports two cache-warm
types only (`michael-orientation.md` T2). No extension API suppresses pi's own transcript notices
(T1). `message_end` fires before the message is persisted, so an extension's handler sees entries
ending at the previous message — exactly what pi's miss rule reads (T3). `session_compact` carries
`compactionEntry.usage` and `session_tree` carries `summaryEntry?.usage`; a completed cache warm
fires no event (T4). One `message_end` can carry a dropped-thinking notice and a cache miss, thinking
first (T10).

**What binds the shape.**

- Placing the instrument is the switch, Jefferson never reads or writes pi's settings, and cache warm
  is out (`owner-rulings.md`, 2026-11-10).
- Each notice's words are a format the user configures, the values are variables, the defaults read
  as pi's English, and no translations ship (`owner-rulings.md`, "2026-11-10: After the council").
- The timed show-and-hide is a visual in its own right, reusable and composable into any instrument,
  and the notice is its first user (`owner-rulings.md`, "2026-11-10: What the timed part is").
- No English sits inside a value: `$blocks` is the count and `$idle` the minutes, and `\` escapes any
  character in a format (`owner-rulings.md`, "2026-11-10: After the docs pass").
- A process API is injected at the composition root beside `homedir`; `data/` names none
  (`michael-orientation.md` §1, D-a). A datum enters through the store and the feed, and every
  subscription joins the feed's single release (D-b, living `session-data-store` spec).
- `data/` MUST import no source file outside itself; an instrument's file MUST NOT import
  `format.ts`, `shipped.ts`, `components/row/` or another instrument's file; `components/instruments/`
  holds `instrument.ts`, `instrument-binding.ts`, `compact-count.ts` and one file per instrument
  (`extension-source-layout` spec, "Imports between the homes run one way" and "The source tree has
  the ruled homes").
- An instrument MUST NOT subscribe, poll, read the terminal or derive data the store can hold; a read
  is synchronous; freshness never exceeds the host's delivery; the store requests its own repaint
  (`statusline` spec :348-353; `session-data-store` spec :35-37, :72-75, :192-198).

## Goals / Non-Goals

**Goals:**

- A `notice` cell shows the notice pi would have drawn, in pi's colour and pi's words.
- The notice's text is a format per kind, with the values as variables, defaulting to pi's text
  exactly.
- The notice disappears when its visible time is over, one notice at a time, newest replacing: a
  reusable visual hides it, and the store requests the repaint on the root's clock and scheduler.
- A document with no `notice` cell behaves exactly as it does today: nothing subscribed, nothing
  scanned for a notice, no timer.
- pi's rule is copied whole, so the spec's "the turns pi's transcript notice would flag and for no
  others" holds, with each constant in one named place beside pi's file and line.

**Non-Goals:**

- No fade and no cadence. The statusline spec's "MAY" clause is gone, and a token-step fade is a
  later change if Joel asks at the live check (`council.md`, feedback 1).
- No queue: a newer notice replaces the showing one (`council.md`, feedback 2).
- No cache-warm notice (`owner-rulings.md`, 2026-11-10), and no warning when pi's own setting is on.
- No suppression of pi's transcript notices, and no reading or writing pi's settings (T1).
- No localization and no translated defaults (`owner-rulings.md`, 2026-11-10: After the council).
- No modifier and no form inside a notice's own text; styling belongs to the cell (D5).
- No time in the format language: a duration is not a variable, and no format names one (D10).
- No translation of a numeral's rendering: `$tokens` keeps `k`/`M` and `$cost` its suffix (D11).
- No change to `compactCount`, to the `cost` instrument's formatter, or to any existing datum.
- No new dependency, nothing drawn from pi-tui, and no new top-level source directory.
- No ADR retires the previous change's Non-Goal against timed repaints: that rule never reached a
  spec (`michael-orientation.md` §1). This design is where it is revised, and D2 says so.

## Decisions

The shape, before the reasons for it: pi's rule in one file under `data/`, one notice datum in the
store, one timer on a clock the root supplies, and the notice's text as a format per kind that the
instrument's declaration composes. Each decision below defends one piece of that.

### D1 — The notice is a datum in `data/`, and pi's rule is one pure file beside it

**The datum.** `Readings` gains `notice?: Timed<Notice>`, where

```
Notice = { kind: NoticeKind; values: Partial<Record<NoticeValue, string>> }
Timed<T> = T & { readonly shownUntil: number }
```

`Timed<T>` is declared in `session-data-store.ts` beside `Readings`, so the next timed datum reuses
it. The store stamps `shownUntil` once, on arrival (D2), and D10's visual compares it against the
render's instant.

`values` holds each value **already formatted**, so a resolver hands its value on unchanged — the
duty `AGENTS.md` puts on every resolver and the shape `$percent` already has with `43.2%`
(`statusline` spec, "The context instrument"). A value the notice's kind does not carry is absent
from `values`, and a value that is genuinely empty is the empty string: the cost suffix under a cent
is the one that is `""`. A kind's format renders an absent value as nothing, never as a blank cell;
D5 keeps those four values off `declaration.variables` for exactly that reason. Only the notice itself
has an unknown state: `notice` is `undefined` before anything arrives and after the session is
replaced, and that is the unknown that suppresses the cell and its label. A passed `shownUntil` is the
visual's unknown, not the store's (D10). The living store spec's
"as distinct datums rather than composed values" is satisfied as the delta requirement defines the
datum: the notice, its kind and the values its format's variables show
(`specs/session-data-store/spec.md`, "The store holds the notice a notice instrument shows").

`NoticeKind` has seven members — `miss`, `missModelSwitch`, `missIdle`, `compaction`,
`branchSummary`, `thinking`, `thinkingOne` — and `NoticeValue` has four: `tokens`, `cost`, `idle`,
`blocks`. Both are declared in the
new file and nowhere else. Why the three miss variants are kinds rather than one kind with a variant
field is D5.

**One pure source file: `extensions/jefferson/data/notice.ts`.** It holds pi's rule and nothing about
the footer: the miss scan step, the display gate, the thinking-drop delta, the variant choice, the
value formatting, and the notices a compaction or a branch summary yields. Each constant is named
once, beside pi 1.4.0's file and line:

| Constant | Value | pi 1.4.0 |
|---|---|---|
| `CACHE_TTL_MS` | `5 * 60 * 1_000` | `dist/core/cache-stats.js:5` |
| `NOISE_FLOOR_TOKENS` | `1_024` | `cache-stats.js:7`, applied `:24` |
| `DISPLAY_GATE_TOKENS` | `20_000` | `dist/modes/interactive/interactive-mode.js:3367` |
| `DISPLAY_GATE_COST` | `0.1` | `interactive-mode.js:3367` |
| `COST_SUFFIX_MIN` | `0.01` | `interactive-mode.js:3369`, `:3311` |

The functions beside them, and the pi line each reproduces: `missedTokens = min(prev.promptTokens,
promptTokens) − cacheRead` (`cache-stats.js:23`); `missedCost = missedTokens × max(0, paidPerToken −
readPerToken)`, with `readPerToken` falling back to the model's price divided by one million when the
turn read no cache (`:30-34`); `idleMs` measured start to start (`:38`); a model change compared by
`provider/model` (`:39`); the guard that yields no miss on a first turn, after a reset, on zero prompt
tokens, or on a turn with no cache activity in a session that never reported any (`:20`); the resets at
a `compaction` and a `branch_summary` entry (`:59-65`); a `cache_warm` usage entry becoming the
previous request though no warm notice shows (`:66-76`); assistant messages only (`:77`); the skip of
a message whose `stopReason` is `aborted` or `error` (`interactive-mode.js:2859-2866`); the token sum
`input + output + cacheRead + cacheWrite` for a compaction and a branch summary (`:3306-3315`); the
kind choice between `thinkingOne` and `thinking` at the count of one (`:3349`); pi's `formatTokens`
(`dist/modes/interactive/components/footer.js:20-30`); and pi's cost suffix, ` (~$X.XX)` to two
decimals, present only at `COST_SUFFIX_MIN` or above (`interactive-mode.js:3369`).

A `shortcut:` comment above those constants carries the pin, in the words the council accepted:
`shortcut: copies pi 1.4.0's rule; drift in the user's global pi between pin bumps is invisible,
re-check on every pin bump` (`council-matt-pass1.md` recommendation 4, `council-neil-pass2.md` N4).

**Where the file sits, and why it cannot sit elsewhere.** The store and the feed call this rule, and
`data/` MUST import no source file outside itself (`extension-source-layout` spec). Put the rule in
`components/instruments/notice.ts` and the store cannot reach it, so the datum's derivation moves into
the visual home. Put it inside `data/session-data-store.ts` and one file holds two responsibilities:
the store's slot and expiry, and pi's rule. The rule's boundaries would then be testable only through
the store, and the layout spec asks a module to be named for what it owns. A new top-level module is a
named structural change to the ruled tree for no gain. So the rule is a new file in an existing home,
which is neither a new root nor a new kind of module: "Growth is a named change" does not fire, and
this change names it anyway.

**Flow.** The feed takes three subscriptions, and only while a notice cell is placed (D3):

- `message_end` — the miss step scans the entries the handler reads, as pi's does, and the feed hands
  the store the message with the `cacheRead` price fallback from
  `ctx.modelRegistry.find(provider, model)?.cost.cacheRead / 1_000_000`, which is the same `Model`
  object pi's own runtime returns (`research-chidi.md` Addendum 1 §2). The store computes the
  thinking-drop candidate and the miss with the pure rule, in pi's order, and takes one notice. The two
  steps read different host sources, as pi's do: the miss scan reads `getEntries()`
  (`interactive-mode.js:3362`) and the thinking step compares against the branch's last assistant
  message from `getBranch()` (`:3338-3346`). So the feed supplies
  `readBranch: () => ctx.sessionManager.getBranch()` beside `readEntries`, both on the read-only
  manager (`session-manager.d.ts:178`), and the store passes the branch to the thinking step and the
  entries to the miss step.
- `session_compact` — the compaction entry's `usage` becomes a `compaction` notice; no usage, no
  notice.
- `session_tree` — `summaryEntry?.usage` becomes a `branchSummary` notice; no usage, no notice.

**An arrival requests a repaint.** `showNotice` ends by requesting one, as every push does, because
the living store spec has the store ask for its own repaint and forbids leaning on the host's. D2's
instant repaint is a second, separate request.

No notice comes from a read the store schedules (the delta requirement). The three subscriptions join
the feed's single `release` (D-b).

### D2 — The clock and the scheduler are injected at the composition root, and one timer requests the repaint

`feedSessionData` and the store take two more injected readers, beside `homedir`, `requestRender` and
the branch reader D1 adds: `now: () => number`, and
`schedule: (callback: () => void, delayMs: number) => () => void`, which
returns the cancel. `startup.ts` supplies `performance.now` and a closure over
`setTimeout`/`clearTimeout`: a wall clock steps under a sleep or an NTP correction and a monotonic one
cannot, and both read at the same cost. `data/` names neither global, which is D-a's seam word for word
(`michael-orientation.md` §1, D-a).

Two readers, because they do two jobs. The **clock stamps**: on a push of a timed datum the store
writes `shownUntil = now() + holdMs`, converting the document's seconds to milliseconds in that one
place, and it never clears the datum. A fake clock still drives every boundary (D8).

The **scheduler requests the repaint**: one `schedule` per notice, for `shownUntil - now()`, whose
callback only requests the repaint. An early fire re-arms for the time left and requests nothing, so
a timer cannot extend or shorten a notice and a repeated fire decides nothing new. A recording
`schedule` tests both branches.

The schedule handle is kept with the slot and cancelled in two places: when a newer notice replaces
the showing one (D7), and in the feed's `release`. A notice never expires in the store, so nothing
else clears it.

`startup.ts` registers a `session_shutdown` handler that runs that same release, because
`ctx.reload()` emits `session_shutdown` and calls `oldRunner.invalidate()` without ever clearing the
footer (T5). Without it, a pending callback would request a repaint into a context the host has
invalidated, and the render's `sample()` would reach `getContextUsage()` on a dead runner and throw.

Registering the release one more place closes a pre-existing exposure; it adds no noun.

Alternatives considered. The store calling `setTimeout` itself loses to D-a: `data/` would name a
process API, and no test could drive time. An interval that ticks and compares loses twice: it
repaints on a cadence for an invisible datum, and it polls by another name. A lazy drop at sample time
with no timer loses because nothing would request the repaint at the deadline. A quiet footer would
then keep an expired notice until the host rendered for its own reasons, which the store spec forbids
the store from relying on (`session-data-store` spec :192-198).

**What this revises.** The previous change's Non-Goal
forbade "a repaint the extension requests on a timer" (`archive/2026-11-10-instruments-for-every-datum/
design.md:27`), and the council-accepted feedback in the first store change leaned the same way
(`archive/2026-11-03-session-data-store/council.md:20, :68`). Neither is Joel's. The living specs
forbid **polling** — asking the host again whether something changed — by the instrument (`statusline`
spec :348-353) and by the store for statuses (`session-data-store` spec :299-301). A timer that hides a notice
Jefferson already holds asks the host nothing: the instant is known when the notice arrives.
So the timer revises a non-goal and a council preference, and Joel's 2026-11-10 ruling is the evidence
that justifies it. One repaint per notice follows from it; that repaint's `sample()` reads context
usage and statuses as it reads them in any render, and claims no freshness beyond "as of this render".

### D3 — The gate follows the rows the root installs

`readConfiguration` returns, beside the rows, `noticeSeconds: number | undefined` — the declared
`seconds`, or the declared default, and `undefined` when no row it is about to return places a
`notice` cell. `startup.ts` passes it to `feedSessionData`, and an `undefined` means: subscribe to no
notice event, scan no session entries for a notice, hold no timer, and report no notice. The
store holds no visible time at all then, so nothing it does can depend on one.

Placement is read from the rows, never from the document. `cellsFromNames` already resolves each
cell's name to a declaration and binds it (`configuration.ts:139-176`), so the reader compares each
resolved declaration with the `notice` declaration it imports, the way it already imports `blank`'s
file for the fallback, and counts only cells inside the ten-cell ceiling it already applies.

The name, the default and the bounds come from that one declaration: `NOTICE_SECONDS`, beside the
declaration in `components/instruments/notice.ts`, is what the reader passes when the document names
none (D6), and the reader keeps no copy of either.

The layout spec's "Who names the instruments" holds, because the set of files that import an
instrument's file is unchanged, and this change's `extension-source-layout` delta widens the
parenthetical that says why.

A rejected document is the same case. It installs the default row, the default row places no `notice`
cell, so the reader returns `undefined` and the gate is off. The gate and the value both come from the
rows the root installs, so they cannot disagree. The delta spec states that case under the gating
requirement, which is where it is observable, and no longer promises a visible time to a notice that
cannot arrive.

Alternatives: no gate, which the council refused because a default document would then scan session
entries on every `message_end` and fire a timer-driven repaint for an invisible datum
(`council-neil-pass2.md` N3, `proposal.md` "No breaking change"); the store reading the rows, which
makes `data/` read configuration and breaks both D-a and the layout spec's import rule; and always
subscribing while dropping in the handler, which does exactly the work N3 forbids. For the detection
itself, carrying a name on `Cell` would add a field to a type that holds a bound instrument, to answer
a question the resolved declarations in hand already answer.

### D4 — `readConfiguration` moves before the feed, and Eleanor's Addendum 2 says that is safe

`startup.ts` reads configuration first and builds the feed and store with the values it produced,
because the store must be given its visible time and its gate at construction (D2, D3).
`readConfiguration` takes a `ConfigurationSource` and normalizes using the document, the notices and
`source.theme`; it does not touch the feed or the store. Everything it reads is taken from `ctx`
independently: the configuration paths from `ctx.cwd`, trust from `ctx.isProjectTrusted()`, and the
theme from `ctx.ui.theme` (`research-eleanor.addendum-2.md`, "Configuration order and inputs",
`startup.ts:36-55`, `configuration.ts:41-49, 290-343`). The reorder therefore changes no input and no
output, which is what `council.md` left the design to establish (Accepted & Rejected Feedback 10).

It lands as its own step, with the suite green before and after, separate from any notice behaviour
(`council-matt-pass2.md` M5).

Alternatives: a setter on the store after the feed is built, which gives one fact two entry points and
lets the store exist for a while without its gate; and `data/` reading configuration, which D-a and
the layout spec both refuse.

### D5 — A notice's text is seven formats keyed by kind, declared once on the instrument

**Why one format cannot serve.** pi's four notices differ in words that lie outside every value. A
miss re-bills; a compaction and a branch summary bill; a miss's label may carry "after model switch"
or "after 7m idle" (`research-chidi.md` Addendum 1 §1; `council-matt-pass2.md` M4). No single format
renders all of them.

**Why a variant is a kind.** A variant field would hold the variant's English inside a value's
rendering, and those are the words Joel's ruling exists to let a user replace. The same rule settles
grammatical number: pi writes `thinking block` for one and `thinking blocks` otherwise, so one is its
own kind, `thinkingOne`, and no value carries a noun.

**The seven default formats**, which render pi's text exactly (`research-chidi.md` Addendum 1 §1):

| Kind | When | Default format |
|---|---|---|
| `miss` | a miss with neither a model change nor an idle | `Cache miss: $tokens tokens re-billed$cost` |
| `missModelSwitch` | a miss whose variant is a model change | `Cache miss after model switch: $tokens tokens re-billed$cost` |
| `missIdle` | a miss whose variant is an idle of at least the TTL | `Cache miss after $idle\m idle: $tokens tokens re-billed$cost` |
| `compaction` | a compaction entry carrying usage | `Compaction: $tokens tokens billed$cost` |
| `branchSummary` | a branch-summary entry carrying usage | `Branch summary: $tokens tokens billed$cost` |
| `thinking` | dropped thinking blocks, any count but one | `Anthropic dropped $blocks thinking blocks (details in session)` |
| `thinkingOne` | exactly one dropped thinking block | `Anthropic dropped $blocks thinking block (details in session)` |

**The variables are two vocabularies, split on purpose.** The cell's format names one variable,
`$notice`; a kind's format names the four values. `$notice` is the only entry of
`declaration.variables`, and the four values are `composed.variables` (change 1 below).

| Variable | Belongs to | Renders | pi's formatting |
|---|---|---|---|
| `$notice` | the cell's format | the whole notice, composed from the kind's format | — |
| `$tokens` | a kind's format | the token count | `formatTokens`: `20k` at 20,000, `125k` at 125,300 (`footer.js:20-30`) |
| `$cost` | a kind's format | pi's cost suffix, ` (~$0.38)`, and `""` below a cent | `interactive-mode.js:3369`, `:3311` |
| `$idle` | a kind's format | the idle in whole minutes, `6` | `${round(idleMs / 60_000)}`, bare (`interactive-mode.js:3375`) |
| `$blocks` | a kind's format | the dropped blocks, `2` or `1` | the count, bare (`interactive-mode.js:3349`) |

The split is load-bearing. `resolveFormat` walks `declaration.variables` and renders the
cell as nothing the moment any declared variable resolves `undefined` (`format.ts:190-195`), which the
living spec requires: an unknown datum suppresses the format and the label with it (`statusline` spec,
"An unknown datum suppresses the label"). Declare the four values there and nearly every notice blanks
its own cell, because no kind carries all four: a compaction has no `$blocks`, a thinking notice no
`$cost`, a miss no `$blocks` either. Outside that set an absent value joins a kind's text as `""`, and
only `$notice`'s own absence blanks the cell (D1). The other half of the split: a cell's format naming
`$tokens` is rejected as an undeclared variable, which is the right answer: the values belong to a
kind's format, not to the cell's.

The delta spec's "the values in it MUST be variables the declaration carries" still holds. `composed`
is a field of the declaration, the reader validates a kind's format against the set it names, and the
defaults live in the instrument's own file; what this change splits is which of the declaration's two
variable sets a given format may name.

`$idle` and `$blocks` are the bare quantities, because the ruling names them as values and English
does not belong inside one (`owner-rulings.md`, "After the docs pass"). The unit and the noun move
into the default texts: `$idle\m` for pi's `6m`, and the `thinking`/`thinkingOne` pair for its noun.
`\m` is D11's escape. `$cost` keeps pi's leading gap and parentheses, so the formats hold none and a
miss under a cent renders without a suffix.

**An empty kind text silences the kind.** A configured text that resolves empty, and whitespace alone
trims to that, renders nothing at all, label and gap with it: Joel's 2026-11-11 ruling at Validate, and
the reading a user writing `formats.miss: ""` intends. The binding treats an empty composed text as
nothing to compose, so the cell takes the unknown rule's nothing.

**What has to change, and why each piece is the smallest that carries the requirement.** Eleanor's
Addendum 2 describes a mechanism with one configured format per instrument name. Per-kind formats do
not fit that mechanism as it stands. Five changes, each in one place:

1. **`instrument.ts`** — the declaration may carry a composed format set:

   ```
   composed?: {
     variable: string;                                                     // "notice"
     variables: Record<string, (readings: Readings) => string | undefined>; // a kind's values
     select: (readings: Readings) => string | undefined;                    // the notice kind
     formats: Record<string, string>;                                      // one default per kind
   }
   shownUntil?: (readings: Readings) => number | undefined;               // a timed datum's instant
   ```

   `shownUntil` is a sibling field, not part of `composed`: a whole datum shows or hides, where `$bar`
   places a piece of the prose. Any instrument declaring it is timed, and the notice declares
   `readings => readings.notice?.shownUntil` and nothing else about time (D10).

   (I called the field `composed` and not `formats` because the declaration owns the selection, the
   values and the defaults; a bare `formats` would suggest a list of formats for the cell.) The
   declaration's own `variables` keeps one entry, `notice`, whose resolver yields nothing: the name has
   to be declared for the cell's `$notice` to parse, and its `undefined` is what blanks the cell when no
   notice shows. `select` keeps the contract free of any notice vocabulary: the declaration says which
   reading names the format, and the binding asks nothing about the store's shape. `formats` is typed in
   `components/instruments/notice.ts` as `Record<NoticeKind, string>` over the type `data/` defines, so
   the compiler holds the two ends together and the kind names have one home.

2. **`configuration.ts`** — one new option shape. `instruments.notice.formats` is an object; each key
   must be a kind the declaration's `formats` carries, and each value a string parsed by the same
   `parseFormat` call `format` gets. Three failures each reject the document, and each makes the
   warning name the offender, as the option reader already does: an unknown key, a value that is not a
   string, and an undeclared `$name` ("An option the instrument does not declare").

3. **`format.ts`** — a plain parse, a plain resolve, and one parameter. `parseFormat` accepts a plain
   mode that keeps the same grammar and validates a kind's format against `composed.variables`, and
   additionally rejects a modifier, a form and `composed.variable` naming itself, naming the instrument
   and the name (`statusline` spec, "An unknown modifier rejects the document when it is read").
   `resolvePlain` walks the same parsed segments and joins each one's literal text and value without
   styling, an absent value joining as `""` rather than blanking the text. `resolveFormat` gains one
   optional parameter: values already resolved, which take precedence over the declaration's resolvers
   for the names they hold. That parameter is the seam the composed text arrives through, and no other
   caller passes it. The alternative seam is a second declaration the binding builds around the first,
   with a `notice` resolver swapped in; that gives one render two variable sets, and the parse validated
   the other one.

   The plain mode is what keeps the notice one colour. A modifier inside the words produces its own SGR
   inside the text `$notice` hands the cell's format, and an inner reset would drop the `warning`
   foreground for the rest of the notice, which the delta spec forbids ("A notice takes the colour pi
   gives its kind"). Styling therefore stays at the cell: the declaration colours `$notice` `warning`
   through `variableFg`, the way `thinking` colours `$level` per level, and a user's `style` still sets
   background and attributes.

4. **`instrument-binding.ts`** — when a declaration carries `composed`, the binding selects the kind's
   format, resolves it plain against `composed.variables` with the same readings, and passes the text to
   the cell's format as the pre-resolved value of `composed.variable` (change 3's parameter). With no
   notice to compose, `select` returns `undefined`, the binding passes nothing, the declaration's own
   `notice` resolver yields nothing, and the cell renders nothing, label included, through the unknown
   rule the other instruments already use. Two resolutions per render, no theme in the first, no host
   read in either.

   After the cell's format resolves, a declaration carrying `shownUntil` passes the text through the
   visual's `timed` call with that instant and `readings.sampledAt` (D10). Nothing to show becomes
   `""`, so the cell renders the unknown rule's nothing.

5. **`components/visuals/timed.ts`** — the new visual, one pure function of the text and the two
   instants, importing no file of the package (D10).

**Alternatives considered.** Six sibling option keys instead of one `formats` object: the same
machinery, more namespace, and the kind vocabulary would live in an option list instead of in the
declaration's `formats`, where the compiler can tie it to `data/`'s type. The store composing the text
from formats passed at the root: `data/` may import no source file outside itself, so it would either
re-implement the format grammar, which gives the grammar two homes, or import `format.ts`, which the
layout spec refuses. Six instruments, one per kind: a cell holds one instrument and the store holds one
notice, so the user would place six cells and the row would re-seat against the widest of them. A
`variableForms` entry per kind: forms select alternate renderings of one variable and cannot carry
configured text (`research-eleanor.md` Addendum 2).

### D6 — `seconds`: a whole number from 1 to 60, default 10, rejected the way `rowGap` is

The declaration carries `seconds` in its `options` beside `format`, `style` and `label`, and
`NOTICE_SECONDS`, its default, in the same file, where the reader that needs it already looks (D3). `readInstruments` accepts a value only when it is a number, an integer, and within 1
to 60 inclusive; otherwise it throws the rejection the whole document dies of, in `rowGap`'s exact
shape: `seconds must be a whole number from 1 to 60: <JSON value>`. So `0`, `61`, `1.5`, `"10"` and
`null` each reject the document, the default row renders, and the warning names the option and the
value (`configuration.ts:253-265, 328-344`). An absent key leaves 10.

The option stays on the instrument, not on the visual: the visual has no configuration surface, and
the duration is how long this instrument's datum shows. The root hands it to the store for that datum
(D10).

The bounds have reasons, not taste. `1` refuses a value that would place an instrument which never
shows anything, and omitting the cell from `rows` is the off switch. `60` catches a value typed in
milliseconds, and keeps one timer's delay far inside a Node timer's range. Nothing in the evidence
measures the default: the three events coincide with fresh transcript output or a full chat rebuild
that holds the user's eye, which argues for longer than a glance (`council-neil-pass2.md` N1,
`council-matt-pass2.md` M1). So ten seconds is this design's assumption, Joel judges it at the live
check his ruling asks for, and changing it costs one constant.

Alternatives: a document-level option, which would let a document set a visible time for an instrument
no row places and would break "an instrument's configuration lives in the extension's own document"
(`statusline` spec); milliseconds with 1,000..60,000, which invites the unit error the key exists to
prevent; and allowing `0` as "never", which would make placing the cell mean nothing.

### D7 — One slot, newest replaces, and the miss wins a same-message collision

The store holds one notice and one schedule handle. A notice arriving replaces the showing one, writes
its own `shownUntil`, and cancels the handle, so a notice arriving eight seconds into a ten-second one
still shows for its full ten. Nothing is dropped: the newer datum's instant is what changes. In one `message_end` that carries both, the
thinking-drop candidate is computed first and the miss second, in pi's own draw order, and resolved in
memory before anything is scheduled; the miss is what stays, the thinking notice is lost, one timer is
set and one repaint follows (`research-chidi.md` §1, `interactive-mode.js:3010-3011` at 1.5.2,
`2859-2866` at 1.4.0; `council-neil-pass1.md` recommendation 2, `council-matt-pass1.md`
recommendation 2b).

Alternatives: a queue, which is mechanism with its own timing rules — what happens to a notice that
waits longer than a turn (`michael-orientation.md` T10); letting the earlier notice finish, which hides
the newer and usually more significant event; and two slots, which would need a second cell to show
them and contradict one instrument per datum.

### D8 — The tests: Jefferson's own module at each boundary, and no test reads pi's files

Boundary inputs, from the council's last pass (`council-matt-pass3.md`, D1), all on the pure rule in
`data/notice.ts`. Each is named for the edge it straddles, and fails if the branch it guards is
deleted:

- 1,024 against 1,025 missed tokens — the noise floor.
- 19,999 against 20,000 tokens, and $0.099 against $0.10 — the display gate.
- $0.0099 against $0.01 — the cost suffix's presence.
- an idle exactly at five minutes, and one just under — the TTL and the `missIdle` variant.
- 9,999, 10,000 and 99,999 tokens through `formatTokens` — pi's rounding edge, and the range where
  `compactCount` would answer `20.0k` instead of `20k`.
- a model change and an idle together, where the model change wins.
- an aborted and an errored message, which yield no notice.
- a compaction and a branch summary between two turns, which reset the previous request.
- a cache-warm usage entry as the previous request, which measures the turn but shows no notice.
- a thinking count rising against one repeating.
- an assistant message on a sibling branch carrying a higher dropped count than the current branch's:
  the entries read would take it as the previous message and the branch read would not, so the notice
  shows or stays silent depending on which source the thinking step uses (`interactive-mode.js:3338-3346`,
  `session-manager.d.ts:178`).

`20k` is the pure rule's measurement and not a default text's: `tests/notice.test.ts` reads it off
`formatTokens` and off the display gate above, which is where pi's rounding edge sits, while the seven
default texts' cases carry `125k`. A default text that rendered `20k` would be asserting a case its own
tests do not have (`redgreen-derek.md`, "Where the run contradicts the design" 2).

The rest of the suite, one behaviour each. The notice datum and its unknown state; replacement and the
full visible time; one repaint at the instant, on the injected clock; the handle cancelled on `release`
and by the `session_shutdown` release.

No subscription and no timer when no cell is placed; placement detected from the rows, including the
rejected document that installs the default row; the three subscriptions and their release; the
`seconds` bounds and its rejection message; `formats` defaults and its rejections.

A value the kind does not carry rendering as nothing rather than blanking the cell; the seven default
texts and their `warning` foreground; the label suppressed while nothing shows; the same text at width 0
as at 200; and the notice cell's text sitting at its alignment. That last one lives in
`tests/row-renderer.test.ts`, because alignment is the row's arithmetic rather than the instrument's,
and its centre case is the discriminator: it fails when the row's centre branch is deleted, and the
left and right cases stay green under the same plant (`redgreen-derek.md` §2.29).

**The timed boundary moves out of the store.** The store no longer hides anything, so its sample-time
drop test goes. `tests/timed.test.ts` straddles the visual's edge instead: one millisecond before the
instant shows, the instant itself hides, and a missing instant on either side hides. Flipping the
comparison reds it.

`tests/session-data-store.test.ts` keeps the one-repaint case and asserts the sample still carries the
notice with its `shownUntil`; the early fire still re-arms. A binding test reds when the `timed` call
is removed: a timed instrument renders nothing, label included, past its instant.

The bare values add theirs: `$blocks` bare at one and two with the kind chosen by count, `$idle` bare
and `6m` through the default, `$idle\m` and `a\b` through the parser, and an unknown `formats` key
still rejected. `sampledAt` joins the sample's keys.

**The spec's two row scenarios ride the row's arithmetic, and one of them needed a test.** "A cell
narrower than the notice" is clip arithmetic the row already measures twice: "an instrument resolving
text wider than its cell is clipped and stays one line" (`tests/row-renderer.test.ts:86`) and "text
wider than its cell renders identically under any alignment" (`:149`). The notice is a non-fill
instrument whose text does not depend on the width (the width-0 guard above), so its clip is that same
arithmetic and it needs no test of its own.

"A notice beside a fill cell" was carried by nothing. The re-seat test shrinks a non-empty text with no
fill cell beside it, and the fill test and the empty-cell test are both static. The scenario's whole
content is the empty → text → empty transition beside a `fills: true` cell, which is the ADR 0007
consequence this design records, so `tests/row-renderer.test.ts` carries it: a fill stub and the bound
`notice` instrument, rendered at 80 with the notice absent, then showing, then absent, the fill cell's
width asserted at 80, then 80 minus the notice's, then 80. Michael's tasks-gate ruling settles this
(`michael-pl7-r1.json`, finding 3), in place of the gap `redgreen-derek.md`'s "Where the run contradicts
the design" 3 and "Not verified" left to the gate.

The `shortcut:` comment sits above the copied constants (D1). No test reads pi's files, and the reason
is the council's: such a test asserts pi's behaviour rather than Jefferson's, fails when pi re-bundles,
stays green when Jefferson's own gate is deleted, and catches only a deliberate pin bump, which the
comment already names (`council-neil-pass3.md` D1; `council-matt-pass3.md` D1).

### D9 — The docs pass

After the implementation gate, the docs pass writes:

- **README** — the `notice` instrument, `seconds`, and `formats`, the contract with pi's
  `showCacheMissNotices` (placing the cell is the switch; a user who also turns pi's setting on sees
  both lines), and why cache warm is absent (`owner-rulings.md`, 2026-11-10). The values are bare now,
  so the sentence saying `$idle` and `$blocks` carry pi's unit and noun goes, and `thinkingOne` joins
  the kinds table.
- **`ARCHITECTURE.md`** — the notice datum and the events it arrives on, the two injected readers and
  what each does, the composed-format contract, the timed visual and the widened import rule, and the
  gate.
- **`AGENTS.md`** — adding a notice kind (one member of the kind type, one default format, and one
  subscription only if a new event carries it), the `shortcut:` pin and the re-check on every pin bump,
  and the two traps: a kind's format is plain (no modifier, no form, styling at the cell), and the
  declaration's two variable sets are not interchangeable. A third: a visual imports nothing of the
  package, and a timed instrument declares `shownUntil` rather than keeping time.
- **`docs/adr/`** — four decisions earn one, and the numbering continues from the existing ADRs:
  - the store keeps time on a clock and a scheduler the root supplies, and what "as of the render"
    means for a datum the extension ages;
  - an instrument's text may be composed from a format a reading chooses, and the contract that carries
    it;
  - a visual is a pure part under `components/visuals/`, mixed in by a declaration or a format, never
    holding time or a host handle. It narrows ADR 0011: the clock still decides, now in the visual, and
    the store stamps the instant and asks for the repaint. An accepted body is not edited;
  - the generalized escape extends ADR 0003, and the docs pass repeats ADR 0003's audit over the tree.

No gate follows the docs pass, by Joel's rulings that documentation gets no review loop and never
blocks a feature.

### D10 — The timed show-and-hide is a visual, and the store only remembers and repaints

Time has two halves, and Joel's ruling separates them. **Showing or hiding** is a visual: a pure
function of the datum's text, the instant it shows until, and the render's instant.

**Knowing when something arrived and asking for a repaint when the display will change** is data: the
store holds the clock and the scheduler the root injects (D2), and the store spec already says the
store requests its own repaints. So the visual decides, the store remembers and repaints, and no
instrument subscribes, polls or keeps time.

**The file.** `extensions/jefferson/components/visuals/timed.ts`, beside `bar.ts`, importing no file
of this package — the rule `bar.ts` already obeys. One export:

```
/** The text while the render's instant is before the datum's shown-until instant; unknown after it, or when either instant is missing. */
export function timed(text: string, shownUntil: number | undefined, now: number | undefined): string | undefined
```

`undefined` is the hidden answer, not `""`, so a hidden datum is unknown to the cell and drops its
label and gap (the statusline spec's "An unknown datum suppresses the label"). The visual has no
configuration of its own, as the bar has none. The duration is the datum's, not the visual's.

**How an instrument composes it.** A declaration field, because the whole datum shows or hides where
`$bar` places a piece of the prose: `shownUntil?: (readings: Readings) => number | undefined`. The
binding applies it after the format resolves: `timed(text, declaration.shownUntil(readings),
readings.sampledAt) ?? ""`. The notice declares `readings => readings.notice?.shownUntil` and nothing
else about time.

A format variable cannot do it: a variable renders a piece of a format, and a hidden datum is not a
piece. `$notice` is the whole text, and the label must go with it. The ruling puts the time in a
visual rather than in the words, so no format names a duration.

**The store stamps and repaints; the visual decides.** On a push of a timed datum the store writes
`shownUntil` once — the one home of the instant — and arms one repaint there, re-arming on an early
fire; the callback only requests the repaint (D2). Every sample carries `sampledAt`, read once per
render and `undefined` after dispose, so two timed cells in one render agree.

The store never hides. It holds the datum and its `shownUntil` until a newer one replaces it or the
session is replaced. Nothing in `components/` reads a clock, and `imports.mjs`'s `CLOCK` rule stays as
it is.

**The import rule moves one notch.** `components/visuals/` files import nothing of this package, and
any `components/` file or `format.ts` may import them; today only `format.ts` reaches `bar.ts`. That is
the layout spec's "Imports between the homes run one way" and an ADR 0009 addendum, and it is what
"composable into an instrument" means in the tree.

**Alternatives.** A format variable, refused above. An instrument asking the clock: it would subscribe
or poll, which the statusline spec forbids, and two notice cells could disagree. A store-side drop: it
hides the datum in the state, so the visual has nothing to decide. A second option key for the
duration: the visual has no surface, and the instrument already owns `seconds` (D6).

### D11 — A backslash escapes the character after it

**What changes.** `\` followed by any character yields that character, in every format. Today only
`\$` and `\|` escape, and `\x` is a literal backslash then `x`. One condition leaves `parseFormat`,
and the guard that needs a character after the backslash stays. The plain parse keeps the same grammar,
so a kind's format gets the escape for free.

**Why it is needed.** A name runs over `[A-Za-z0-9_]+`, so `$idlem` is one undeclared name, and pi's
text has no space before its `m`. With `$idle` bare (D5), the `missIdle` default is
`Cache miss after $idle\m idle`, which renders pi's `Cache miss after 6m idle`.

**The precedent and the cost.** ADR 0003 paid this exact cost for `\|`: a document carrying a
backslash before a letter changes meaning, silently. Its audit found no such format in the repository,
and breaks are cheap before 1.0. The implementation repeats that audit over the tree — the specs, the
ADRs, the README, `AGENTS.md`, and any `pi-jefferson.json` it can see — and records the result.

**What stays a value.** `$tokens` keeps its `k`/`M` and `$cost` its ` (~$X.XX)` suffix. The line: a
word a translator would write differently belongs in the text, and a numeral's own rendering stays in
the value. `m` names minutes, where `k` is a magnitude and `$` a currency sign, and the suffix's
presence below a cent is a rule no format can express.

**Alternatives.** Leaving `6m` inside the value: Joel rejected it, and it is a second answer to the
same question. A form on `$idle` (`$idle|unit`): a form selects a rendering of a variable and cannot
put a literal between a variable and its neighbour, and the grammar would still refuse `$idlem`.

### Consequences

- A row holding a `notice` cell re-seats when a notice arrives and again when its instant passes: a
  fill cell in that row gives up the notice's columns and takes them back (ADR 0007;
  `michael-orientation.md` T7).
- The extension now requests a repaint on a timer, once per notice. It asks the host for nothing, but
  it is the first timed repaint in this footer, and D2 records the revision that makes.
- `startup.ts` reads configuration before it builds the feed, which is a reordering of its two first
  steps and no change to what either produces (D4).
- `InstrumentDeclaration` grows two optional fields: `composed` with four members, and `shownUntil`.
  `format.ts` grows a plain parse, a plain resolve and one optional parameter on `resolveFormat`. Every
  reader of the declaration still reads one per instrument, and the parameter is passed only by the
  binding.
- `Readings` gains `sampledAt`, and a timed datum carries `shownUntil`, so the sample is the instant
  every timed cell in one render compares against (D10).
- `components/visuals/` gains a second file, and the import rule widens: any component or `format.ts`
  may import a visual, where only `format.ts` reached `bar.ts` before (D10).
- The store holds a notice past its instant until a newer one arrives or the session is replaced: the
  hiding is the visual's, and the store's state says what it holds (D10).
- `$idle` and `$blocks` are bare numbers, so a kind's text carries its unit and its noun (D5).
- A backslash escapes any character now: a document carrying `\x` renders `x`, where it rendered `\x`
  (D11).
- A cell's format may name `$notice` and nothing else; the four values belong to a kind's format (D5).
- `readConfiguration`'s result grows one field that only `startup.ts` reads.
- The feed takes one more host read, `getBranch()`, beside `getEntries()`, because pi's thinking-drop
  count comes from the branch and its miss scan from the entries (D1).
- A kind's format rejects a modifier. A user who writes `$tokens|bold` into a notice's own text gets
  a rejected document, and the warning names the modifier it refused.

## Risks / Trade-offs

**[Drift] pi retunes a threshold or a formatter and Jefferson's notice fires differently, silently.**
No test can see it: the constants are copies, the rules cannot be imported, and a test that read pi's
`dist` files would assert pi's behaviour, break on a re-bundle, and stay green if Jefferson's gate were
deleted. → Mitigation: each constant and rule carries pi 1.4.0's file and line; the file opens with a
`shortcut:` comment naming the pin and the invisible window between pin bumps; the boundary tests hold
Jefferson's side of every edge, so a deletion fails loudly; and the pin is re-checked on every bump. The
residual risk is accepted, as Michael's orientation already accepted it for `status.ts:12-14`
(`michael-orientation.md` T2).

**[The first clock in the footer] a timed repaint re-samples the host.** Each render's `sample()` reads
context usage and statuses as any render does, and claims no freshness beyond "as of this render"
(`session-data-store` spec :72-75, :299-301). → Mitigation: one repaint per notice, no cadence, nothing
polled, and no notice held while unplaced (D3). The store never hides, so visibility is decided in one
place (D10). A fade would multiply it, which is why it is not here.

**[Reload] `ctx.reload()` leaves the old footer installed until the next `session_start`.** A pending
callback would then repaint a footer whose store holds a dead context, and the render would throw
(`michael-orientation.md` T5). → Mitigation: the release cancels the handle, and `startup.ts` runs that
release on `session_shutdown` (D2). The scenario is tested.

**[Layout] a notice arriving shifts a row's other cells.** → Mitigation: none needed; it is the
consequence ADR 0007 records for any cell whose content changes width, and the row returns to its old
shape when the visual stops showing the notice.

**[A narrow cell] the longest notice is about 68 columns with its label.** → Mitigation: none; the row
keeps one line and clips, which is the one-line rule every cell already obeys.

**[Seven formats to translate] a user writing their own words edits up to seven strings.** →
Mitigation: each is independent and defaulted, and a user who wants English changes nothing. D5 records
why fewer formats cannot hold the ruling.

**[Two resolutions per render] each `notice` cell composes its text twice over: the kind's format, then
the cell's.** → Mitigation: both are string joins over values the store already holds, with no host
read and no theme in the first; two `notice` cells in one render produce the same text.

## Migration Plan

- **Nothing to migrate.** No datum is persisted, no session file changes shape, and every new key is
  optional: a document that configures nothing renders exactly as it does today.
- **Landing order.** The `readConfiguration` reorder first, with the suite green before and after and
  no notice behaviour in that step (D4); then the datum and the rule; then the instrument and its
  formats; then the docs pass.
- **Rollback.** Reverting the release removes the instrument, the datum and the timer; nothing persisted
  changes. A document that still names `notice` after a rollback warns that the extension does not
  implement the instrument and renders that cell as `blank`, which is the existing rule for an unknown
  name, so a user's document degrades without a crash.
- **The pin stays at 1.4.0.** The notice code, thresholds and event order are the same in 1.4.0 and in
  Joel's global 1.5.2, so his live check measures this change and not a version gap
  (`michael-orientation.md`, baseline).
- **Acceptance is Joel's live check** (`owner-rulings.md`, 2026-11-10: "Let's /skill:conductor-janet
  that thing up"). It is where the 10-second default and the 1..60 bounds are judged.

## Open Questions

1. **The default visible time and its bounds are this design's assumption** (10 seconds, 1..60), not a
   ruled value. Joel judges them at the live check; each costs one constant
   (`council.md`, Owner Decisions Required; `council-matt-pass2.md` M1).
2. **Whether a fade follows.** The council deferred a token-step fade to the same live check
   (`council.md`; `michael-orientation.md` T8, §3.1). Nothing forecloses it: the visual is where it
   would go (D10).
