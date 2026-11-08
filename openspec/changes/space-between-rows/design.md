# Design

Citations: **[R]** `owner-rulings.md`; **[J1]**, **[J2]**, **[CR]** Joel's two rulings and the conductor's binding reading at the end of `council.md`; **[Co]** the rest of `council.md`; **[C §n]**, **[C A1]**, **[C A2]** `research-chidi.md` and its addenda; **[E §n]**, **[E A1–A3]** `research-eleanor.md` and its addenda; **[M n]** `michael-orientation.md`. Requirement names are those of `specs/statusline/spec.md`.

## Context

The footer is one `VStack` of one `HStack` per row, built once in `createFooter`, with the `VStack`'s `gap` at `0` [E §1]. Rows sit on adjacent lines and row one sits directly under the editor [E A1; M 2]. Why the change exists is in `proposal.md`; Joel's rulings fix what it does [J1, J2, CR]:

- One blank line above row one and between rows by default.
- One document-level key, `rowGap`, a whole number of 0 or more, sets both. `rowGap: 0` renders exactly today's footer.
- The fleet-status row is not changed, and a `blank` row is not the answer [Co, rejected Q7].

The path a document-level value travels today: `readConfiguration()` returns `{ rows, warning }` (`configuration.ts:53–60, 286`); `startUp` destructures it in the `session_start` handler (`startup.ts:49–57`) and passes `rows` to `installFooter` (`footer-setup.ts:12–20`), whose factory calls `createFooter(rows, sample, theme)` (`:21–23`, `row-renderer.ts:29–33`) [E A3 §1–2]. A validation failure throws `RejectedConfiguration`, caught at `configuration.ts:309–315`, which returns the default row and the warning `pi-jefferson: <path> was rejected (<reason>); rendering the default row` [E A3 §3]. A read or parse error takes a separate path that also returns the default row (`:295–300`) [E A3 §3].

## Goals / Non-Goals

**Goals:**

- The footer renders `rowGap` empty lines above row one and between each pair of rows, `1` by default [J1, J2, CR].
- `rowGap: 0` is byte-identical to today's footer [CR; C A2].
- An invalid `rowGap` is refused where the document is read, with a specific warning, on the refusal path that exists.

**Non-Goals:**

- Any change to the fleet-status row, which is pi-subagents' [R; Co]. A footer cannot learn that a `belowEditor` widget exists [C A1 Q1], which is why the space above row one is unconditional [J2].
- A per-row setting, a ceiling, a `blank` row as the answer [Co, rejected].
- A loud rule for unknown keys [Co, rejected Q6]; see decision 7.
- The horizontal gaps (ADRs 0002, 0006, 0007), which are the `HStack`'s and are untouched [M 1].
- Rendering `setStatus` text [R, "One card"].

## Decisions

### 1. Space between rows is the `VStack`'s own `gap`

`createFooter` builds its `VStack` with `{ gap: rowGap }` instead of `{ gap: 0 }`. `VStack` inserts `gap` empty unstyled lines only between children [C §1; M 2]. Chosen by the council as *"That lets pi-tui do its thing"* [Co; R, 2026-11-03]. Rejected: a `Spacer` between every pair of rows (a second child list to keep in step with the rows), and padding lines of Jefferson's own, which break *"Don't invent what we don't have to"* [R]. The row stays one line, and the gap lines are the stack's, never a row's or a cell's [M 1, M 2]; that is the modified "A row is one line tall".

### 2. Space above row one is a zero-line `Spacer` as the stack's first child

`VStack` adds no gap before its first child [C §1; M 2], so the gap does nothing above row one. The evidence offers three shapes, each run at `rowGap` 0, 1 and 2 on the pinned pi-tui 1.4.0 [C A2]:

- **(a)** `VStack([Spacer(0), row1, …], { gap })`. Renders `gap` lines above row one and `gap` between rows.
- **(b)** `VStack([Spacer(gap), row1, …], { gap })`. Renders `2 × gap` above row one, because the stack's gap also lands between the `Spacer` and row one.
- **(c)** `VStack([Spacer(gap), VStack([row1, …], { gap })], { gap: 0 })`. Same lines as (a), one more stack.

All three render today's footer at `gap` 0 [C A2]. **Chosen: (a).** One `gap` value governs both places, which is the conductor's binding reading that `rowGap` sets both and there is no second setting [CR]. (b) is rejected for its doubled space. (c) is rejected as a second stack for the same lines. (a) rests on a zero-line visible child still contributing gap [C §1 "nuance"; C A2: `v-stack.js:13–22`, `stack.js:55–57`]; a `Spacer(0)` adds nothing at gap 0 [C A2: `v-stack.js:9–10, 13–22`, `spacer.js:15–21`]. A short comment at the `Spacer(0)` says why it is there. Rejected: Jefferson prepending empty lines to the footer's output (padding of its own, as in decision 1).

The footer is mounted in pi as a plain `Container`, not a layout node [C A2], so the nested layout path is not used, and `Spacer(0)` changes no allocation [C A2].

### 3. The default lives in one named constant, `DEFAULT_ROW_GAP = 1`

Declared in `configuration.ts` beside `DEFAULT_CELLS` and `MAX_CELLS` (`:62–63`) [E §2], because the configuration reader is where every default (the default row, the default `distribution`) is already decided [E §2]. `createFooter` has no default of its own; the value always arrives from the configuration (decision 5). Nothing else states `1`. One answer to "what changes the default": that constant.

### 4. `rowGap` is read and validated in `normalizeDocument`

`normalizeDocument(document, notices, theme)` (`configuration.ts:218`) already narrows the top-level envelope and checks keys beside `rows` (`:222–226`) [E A3 §4]; `rowGap` is read there from `doc`, beside either envelope, after the envelope is known and before rows are normalized, following the `distribution` precedent (`normalizeRow`, `:185–190`) [E A3 §4]. It is not one of the keys that conflict with `rows` (`cells`, `id`, `distribution`) [E A3 §4]. Check: `"rowGap" in doc` and `Number.isInteger(value) && value >= 0`. Absent gives `DEFAULT_ROW_GAP`. Anything else (`-1`, `1.5`, `"1"`, `null`) throws `RejectedConfiguration` with the reason

```
rowGap must be a whole number of 0 or more: ${JSON.stringify(value)}
```

so the warning reads `pi-jefferson: <path> was rejected (rowGap must be a whole number of 0 or more: 1.5); rendering the default row`, in the form every refusal already has [E A3 §3]. The reader is the guard because pi-tui floors `1.5` to `1` and clamps `-1` to `0` without a word [M 2; Co]. The guard reads the document's own value, not a number computed before it, and has no other site.

### 5. The value reaches the footer once, at install

`Configuration` gains `rowGap: number`. `startUp` passes it with `rows` to `installFooter`, which passes it to `createFooter` as one more argument (`startup.ts:57–63`, `footer-setup.ts:21–23`) [E A3 §2]. `createFooter` builds the tree once with it, as it builds the tree once today [C §1; M 2]. It is never changed per render: `VStack`'s `gap` is `protected readonly`, fixed at construction [C §1].

### 6. A refusal carries the default `rowGap`

The refusal return (`configuration.ts:310–314`) and the read-or-parse-error return (`:295–300`) render the default row with every default [E A3 §3], so both carry `DEFAULT_ROW_GAP`. A document refused for another reason therefore still gets the default space, and a refused `rowGap` does not mean no space. This is a decision, not a research finding; Michael judges it at PL4.

### 7. Unknown keys stay silent: a `shortcut:`

`rowgap` or `row_gap` is ignored without a warning, because every unknown row and document key is today [E A2 §2; M 2], and a general rule interacts with the legacy `containers` key [Co, rejected Q6]. This is a `shortcut:` recorded in the comment beside the `rowGap` read: *the reader warns on no unknown row or document key, so a misspelt `rowGap` renders the default space without a word; upgrade by adding an unknown-key rule when a second misspelling hurts, as its own change.* The spec states it in "rowGap sets the space above row one and between rows" (scenario "A misspelt key").

### 8. The tests

The six assertions that equate the footer's line count with its row count go red and are rewritten for the new behavior, not loosened [M 1; Co]: `tests/row-renderer.test.ts:273, 379, 383, 734` and `tests/jefferson.test.ts:261, 272` [M 1]. The gap line is a bare `""`, not the host's per-child frame, so a test must not reuse the framing helper for it [M 2]. New tests, each stated as the exact list of lines so removing the behavior turns it red:

- Two rows render `["", row, "", row]`; one row renders `["", row]`; three rows render six lines.
- `rowGap: 2` renders two empty lines above row one and between rows.
- `rowGap: 0` renders exactly the lines the footer rendered before this change, for one and two rows. Compared against the literal lines, not against a second derivation.
- `-1`, `1.5`, `"1"` and `null` are each refused with the warning of decision 4, and the default row renders with one empty line above it.
- `rowGap` sits beside `rows` and beside a single top-level row, and is accepted in both.
- A misspelt `rowgap` is ignored with no warning and the default space renders.
- A document refused for another reason, and an unreadable file, render the default `rowGap`.
- The value is threaded: a `rowGap` read from a document reaches the footer `startUp` installs.

Tasks, the checks' red-to-green runs [R] and their verification belong to `tasks.md`.

### 9. What the docs pass touches

The README's description of footer rows and its configuration section (a `rowGap` entry beside `distribution`) [E §6]; `ARCHITECTURE.md`'s opening sentence "one footer line per configured row" and the row renderer section's "`gap: 0`" [M 1; E §3]. **One ADR is warranted:** the choice between the stack's `gap` with a leading `Spacer(0)`, a `Spacer` per row, Jefferson's own padding lines and a `blank` row is a structural choice with rejected alternatives, and a reader who meets a zero-line `Spacer` would otherwise "fix" it [C A2]. ADRs 0002, 0006 and 0007 are accepted and untouched; their "no gap" is horizontal [M 1].

## Risks / Trade-offs

- **[Fullscreen cost, accepted by Joel [J2]]** Every footer line costs the transcript one line: one line above row one and one per gap by default, `rowGap` lines per place beyond [M 2]. Mitigation: `rowGap: 0`.
- **[A short terminal cuts rows before blank lines]** A footer in fullscreen is truncated from the bottom, so leading blank lines are kept longest and row content goes before them: at `rowGap` 1 and a very short terminal the footer can show only blank lines [C A2; M 2]. Not run in a live pi [C A2]. Mitigation: `rowGap: 0`; no automatic shrink of the gap, which would be per-render change [C §1].
- **[A blank line under the editor in every session [J2]]** Accepted by Joel; it appears with no widget above.
- **[A zero-line child's gap is pi-tui behavior, not a documented contract]** Decision 2 rests on it, run on 1.4.0, with 1.5.0's stack files identical [C A2; M 2]. Mitigation: the tests of decision 8 pin the exact lines at `rowGap` 1 and 2, so a pi-tui change turns them red.
- **[A misspelt key is silent]** Decision 7.
- **[A bad `rowGap` costs the whole layout]** The existing refusal path every key shares, so changing it is not this card [Co, set aside].
- **[No ceiling]** A very large `rowGap` is accepted, as the council chose [Co]. The user asked for it.

## Migration Plan

A breaking change to every existing footer's height, accepted before 1.0 [R]. Joel's own two-row document becomes four lines with no edit [M 2]. The way back is `"rowGap": 0` in the document. Joel's `~/.pi/agent/pi-jefferson.json` is not edited by a task; his observation in his own pi session precedes the archive [R].

## Open Questions

None that change the specs, the approach or the tasks. Not run in a live pi: the leading blank line under the editor and the fullscreen truncation [C A1 Q3, C A2]; Joel's own observation covers them [R].
