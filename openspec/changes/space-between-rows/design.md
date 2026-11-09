# Design

Citations: **[R]** `owner-rulings.md`; **[J1]**, **[J2]**, **[CR]**, **[J3]**, **[J4]**, **[J5]** Joel's rulings and the conductor's reading in `council.md` (J3 the ceiling, ruled after the design gate; J4 and J5 rulings 4 and 5, his live observation, which supersede J2 and CR); **[Co]** the rest of `council.md`; **[C §n]**, **[C A1]**, **[C A2]** `research-chidi.md` and its addenda; **[E §n]**, **[E A1–A3]** `research-eleanor.md` and its addenda; **[M n]** `michael-orientation.md`. Requirement names are those of `specs/statusline/spec.md`.

## Context

The footer is one `VStack` of one `HStack` per row, built once in `createFooter`, with the `VStack`'s `gap` at `0` [E §1]. Rows sit on adjacent lines and row one sits directly under the editor [E A1; M 2]. Why the change exists is in `proposal.md`; Joel's rulings fix what it does [J1, J4, J5]:

- One blank line between rows by default, and none above row one [J1, J4, J5].
- One document-level key, `rowGap`, a whole number from 0 to 3, sets the space between rows. `rowGap: 0` renders exactly today's footer. A one-row footer is one line.
- The fleet-status row is not changed, and a `blank` row is not the answer [Co, rejected Q7].

The path a document-level value travels today: `readConfiguration()` returns `{ rows, warning }` (`configuration.ts:53–60, 286`); `startUp` destructures it in the `session_start` handler (`startup.ts:49–57`) and passes `rows` to `installFooter` (`footer-setup.ts:12–20`), whose factory calls `createFooter(rows, sample, theme)` (`:21–23`, `row-renderer.ts:29–33`) [E A3 §1–2]. A validation failure throws `RejectedConfiguration`, caught at `configuration.ts:309–315`, which returns the default row and the warning `pi-jefferson: <path> was rejected (<reason>); rendering the default row` [E A3 §3]. A read or parse error takes a separate path that also returns the default row (`:295–300`) [E A3 §3].

## Goals / Non-Goals

**Goals:**

- The footer renders `rowGap` empty lines between each pair of rows and none above row one, `1` by default [J1, J4, J5].
- `rowGap: 0` is byte-identical to today's footer [CR; C A2].
- An invalid `rowGap` is refused where the document is read, with a specific warning, on the refusal path that exists.

**Non-Goals:**

- Any change to the fleet-status row, which is pi-subagents' [R; Co]. A footer cannot learn that a `belowEditor` widget exists [C A1 Q1], so the footer adds no space above row one [J5].
- A per-row setting, a `blank` row as the answer [Co, rejected].
- A loud rule for unknown keys [Co, rejected Q6]; see decision 7.
- The horizontal gaps (ADRs 0002, 0006, 0007), which are the `HStack`'s and are untouched [M 1].
- Rendering `setStatus` text [R, "One card"].

## Decisions

### 1. Space between rows is the `VStack`'s own `gap`

`createFooter` builds its `VStack` with `{ gap: rowGap }` instead of `{ gap: 0 }`. `VStack` inserts `gap` empty unstyled lines only between children [C §1; M 2]. Chosen by the council as *"That lets pi-tui do its thing"* [Co; R, 2026-11-03]. Rejected: a `Spacer` between every pair of rows (a second child list to keep in step with the rows), and padding lines of Jefferson's own, which break *"Don't invent what we don't have to"* [R]. The row stays one line, and the gap lines are the stack's, never a row's or a cell's [M 1, M 2]; that is the modified "A row is one line tall".

### 2. No space above row one: the `Spacer(0)` was built, then removed

`VStack` adds no gap before its first child [C §1; M 2], so the stack's `gap` alone puts nothing above row one. Joel first ruled a blank line above row one [J2], and the conductor read `rowGap` as governing it [CR]. That shape was built as `VStack([Spacer(0), row1, …], { gap })`, the first of three shapes run at `rowGap` 0, 1 and 2 on pi-tui 1.4.0 [C A2], chosen over `Spacer(gap)` first (doubled space) and a nested stack (a second stack for the same lines). On watching the default live he found it "way too much space" and asked for the spacer above the first line to come out [J4]. On the preview without it, he ruled: *"This is the way. What we have now. … Too spacious is better than too cramped"* [J5]. **The `Spacer(0)` is removed.** No shape for space above row one is built, and `rowGap` sets only the space between rows. The mechanism is decision 1 alone, with no `Spacer`.

The user-visible result: row one sits directly under the editor, as today [E A1; M 2]; one blank line separates rows by default; a one-row footer is one line. Rejected: any space above row one, now Joel's ruling and not only the council's recommendation [Co; J5].

### 3. The default lives in one named constant, `DEFAULT_ROW_GAP = 1`

Declared in `configuration.ts` beside `DEFAULT_CELLS` and `MAX_CELLS` (`:62–63`) [E §2], with the ceiling `MAX_ROW_GAP = 3` (decision 4). Unlike those two, neither is exported: nothing outside the reader uses them, and exporting would force an edit to the exported-surface guard (`tests/jefferson.test.ts:313`), which pins the export list [Derek red/green; conductor ruling], because the configuration reader is where every default (the default row, the default `distribution`) is already decided [E §2]. `createFooter` has no default of its own; the value always arrives from the configuration (decision 5). Nothing else states `1`. One answer to "what changes the default": that constant. The spec's requirement "The footer has space between its rows and none above the first" is the one normative place that states the default; the `rowGap` requirement says only that absent leaves it.

### 4. `rowGap` is read and validated in `normalizeDocument`

`normalizeDocument(document, notices, theme)` (`configuration.ts:218`) already narrows the top-level envelope and checks keys beside `rows` (`:222–226`) [E A3 §4]; `rowGap` is read there from `doc`, beside either envelope, after the envelope is known and before rows are normalized, following the `distribution` precedent (`normalizeRow`, `:185–190`) [E A3 §4]. It is not one of the keys that conflict with `rows` (`cells`, `id`, `distribution`) [E A3 §4]. Check: `"rowGap" in doc` and `Number.isInteger(value) && value >= 0 && value <= MAX_ROW_GAP`, where `MAX_ROW_GAP = 3` is the one named ceiling constant, beside `DEFAULT_ROW_GAP`. Absent gives `DEFAULT_ROW_GAP`. Anything else (`-1`, `1.5`, `"1"`, `null`, `4`, `1e21`) throws `RejectedConfiguration` with the reason

```
rowGap must be a whole number from 0 to 3: ${JSON.stringify(value)}
```

so the warning reads `pi-jefferson: <path> was rejected (rowGap must be a whole number from 0 to 3: 1.5); rendering the default row`, in the form every refusal already has [E A3 §3]. The reader is the guard because pi-tui floors `1.5` to `1` and clamps `-1` to `0` without a word [M 2; Co]. The ceiling is Joel's ruling after the design gate [J3]: a value above 3 takes the same path and warning shape as any other invalid value. Without it, `1e7` renders 20 million lines and `1e21` never returns [Michael PL4, finding 1]. The guard reads the document's own value, not a number computed before it, and has no other site. **Precedence:** the `rowGap` check runs before `instruments` is read, so a document with both a bad instrument format and a bad `rowGap` warns about `rowGap` only. This is the order the red/green run used, and the assertion at `configuration.test.ts:938` pins it (task 2.2) [Derek red/green, second run].

### 5. The value reaches the footer once, at install

`Configuration` gains `rowGap: number`. `startUp` passes it with `rows` to `installFooter`, which passes it to `createFooter` as one more argument (`startup.ts:57–63`, `footer-setup.ts:21–23`) [E A3 §2]. The signature is `createFooter(rows, sample, theme, rowGap)`: `rowGap` last, no default [Derek red/green]. `createFooter` builds the tree once with it, as it builds the tree once today [C §1; M 2]. It is never changed per render: `VStack`'s `gap` is `protected readonly`, fixed at construction [C §1].

### 6. A refusal carries the default `rowGap`

The refusal return (`configuration.ts:310–314`), the read-or-parse-error return (`:295–300`) and the absent-file return (`:290`, no document) render the default row with every default [E A3 §3; Michael PL7, finding 2], so all three carry `DEFAULT_ROW_GAP`. A document refused for another reason therefore still gets the default space, and a refused `rowGap` does not mean no space. This is a decision, not a research finding; Michael judges it at PL4.

### 7. Unknown keys stay silent: a `shortcut:`

`rowgap` or `row_gap` is ignored without a warning, because every unknown row and document key is today [E A2 §2; M 2], and a general rule interacts with the legacy `containers` key [Co, rejected Q6]. This is a `shortcut:` recorded in the comment beside the `rowGap` read: *the reader warns on no unknown row or document key, so a misspelt `rowGap` renders the default space without a word; upgrade by adding an unknown-key rule when a second misspelling hurts, as its own change.* The spec states it in "rowGap sets the space between rows" (scenario "A misspelt key").

### 8. The tests

Seven assertions equate the footer's line count with its row count and go red; they are rewritten for the new behavior, not loosened [M 1; Co; Derek red/green]. The run found the seventh, `tests/format.test.ts:170`, which design 8 did not name; `tasks.md` lists the sites from Derek's table. Beyond them, 28 end-to-end reads in `tests/jefferson.test.ts` take their row at `lines(w)[0]`. With no leading line, row one is still line 0, so a read of row one needs no new index and only a read of a later row moves; each keeps its subject, rewritten and not loosened. The 20 `createFooter` call sites whose assertions concern horizontal geometry (18 in `tests/row-renderer.test.ts`, `footerFor` in `tests/configuration.test.ts`, one in `tests/instrument.test.ts`) pass `rowGap` 0 explicitly, so line 0 stays the row line there. The gap line is a bare `""`, not the host's per-child frame, so a test must not reuse the framing helper for it [M 2]. The `rowGap: 0` check cannot go red on today's code, because today's footer is gap 0: it is a regression guard, and its bite is any code that adds a line when the gap is 0. New tests, each stated as the exact list of lines so removing the behavior turns it red:

- Two rows render `[row, "", row]`; one row renders `[row]`; three rows render five lines, `[row, "", row, "", row]`.
- `rowGap: 2` renders `[row, "", "", row]`, two empty lines between the rows and none above row one.
- `rowGap: 0` renders exactly the lines the footer rendered before this change, for one and two rows. Compared against the literal lines, not against a second derivation.
- `-1`, `1.5`, `"1"`, `null`, `4` and `1e21` are each refused with the warning of decision 4, and the default row renders as one line; `3` is accepted and renders three empty lines between the rows.
- `rowGap` sits beside `rows` and beside a single top-level row, and is accepted in both.
- A misspelt `rowgap` is ignored with no warning and the default space between rows renders.
- A document refused for another reason, and an unreadable file, render the default `rowGap`.
- The value is threaded: a `rowGap` read from a document reaches the footer `startUp` installs.

Tasks, the checks' red-to-green runs [R] and their verification belong to `tasks.md`.

### 9. What the docs pass touches

The README's description of footer rows and its configuration section (a `rowGap` entry beside `distribution`) [E §6], and `README.md:77`, which says `distribution` rejects a document beside `rows` and must name `rowGap` as the one key allowed beside either envelope [Derek red/green]; `ARCHITECTURE.md`'s opening sentence "one footer line per configured row" and the row renderer section's "`gap: 0`" [M 1; E §3]. **One ADR is warranted:** the choice to leave space between rows to the stack's own `gap` alone, over a `Spacer` per row, Jefferson's own padding lines and a `blank` row, is a structural choice with rejected alternatives. The ADR also records why no space sits above row one: the `Spacer(0)` was built and removed on Joel's live observation [J4, J5], and a reader who wonders why the footer sits flush on the editor should find the ruling there. ADRs 0002, 0006 and 0007 are accepted and untouched; their "no gap" is horizontal [M 1].

## Risks / Trade-offs

- **[Fullscreen cost, accepted by Joel [J5]]** Every footer line costs the transcript one line: one per gap by default, `rowGap` per gap beyond [M 2]. Nothing is added above row one. Mitigation: `rowGap: 0`.
- **[A misspelt key is silent]** Decision 7.
- **[A bad `rowGap` costs the whole layout]** The existing refusal path every key shares, so changing it is not this card [Co, set aside].
- **[Large `rowGap` can hang pi]** Unbounded, `rowGap` 1e5 renders in 1 ms, 1e6 in 16 ms, 1e7 in 141 ms producing 20,000,002 lines, 1e9 would take about 14 s and allocate 2e9 strings, and `1e21` passes `Number.isInteger` and never returns [Michael PL4, finding 1]. Mitigation: Joel bounded it at `MAX_ROW_GAP = 3` [J3]; a larger value is refused like any invalid value. Raising the ceiling is one constant.

## Migration Plan

A breaking change to every existing footer's height, accepted before 1.0 [R]. Joel's own two-row document becomes three lines with no edit [M 2, J5]. The way back is `"rowGap": 0` in the document. Joel's `~/.pi/agent/pi-jefferson.json` is not edited by a task; his observation in his own pi session precedes the archive [R].

## Open Questions

None that change the specs, the approach or the tasks. Joel watched the default live and ruled the shape [J4, J5]; nothing else is open.
