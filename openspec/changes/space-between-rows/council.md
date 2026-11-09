# Council Synthesis

Roster: `council-neil` (cost; run `c226920b-7c03-431b-9139-c3836a4f3501`) and `council-matt` (correctness; run `51d091e7-a255-4c03-baee-682ba0cedae3`), both launched with `context: "fresh"`, reading only the change directory's artifacts and the two screenshots. One pass. Pass 2 was not run: the two reports converged on every claim that affects the recommendation.

## Question and Scope

What pi-jefferson does about vertical space between its footer's rows, and about the pi-subagents fleet-status row that sits directly above the footer, which Joel asked to have considered (`owner-rulings.md`, 2026-11-08). Evidence: `proposal.md` and its eight open questions, `specs/statusline/spec.md`, `research-chidi.md` (with Addendum 1), `research-eleanor.md` (with Addenda 1 and 2), `michael-orientation.md`, and the design gate (PL4) section of `michael-the-architect.md`. Out of scope, per Joel's "One change per spec": rendering pi's `setStatus` text, default labels, an instrument per datum, context thresholds, custom instruments. The horizontal gaps (ADRs 0002, 0006, 0007) are untouched.

## Perspectives & Trade-offs

Both advisors independently recommend the same shape:

- **One blank line between rows by default.** Joel's two-row footer gets space with no edit to his document, under *"A user shouldn't have to configure any more than truly necessary."* A one-row footer is unchanged, since pi-tui's `VStack` puts gap lines only between children (`research-chidi.md` §1; measured in `michael-orientation.md` §2).
- **One document-level key as the way back**, a whole number of 0 or more, with `0` restoring today's footer. This is Joel's 0.8.0 pattern, *"the ideal as the default, plus an escape hatch for what a break removes."* No ceiling, and no per-row setting: a per-row value needs `Spacer` children interleaved between rows and rules nobody asked for (`michael-orientation.md` §2, §4).
- **Named `rowGap`**, after CSS's `row-gap`, spelled like the other document keys. A bare `gap` already names three things here: the cells' horizontal gap, the label gap and the stack option (`michael-orientation.md` §2).
- **Mechanism: the `VStack`'s own `gap`**, set once at install from the configured value, with the default in one named constant. No `Spacer`, no padding lines of Jefferson's own, no per-render change. That is *"That lets pi-tui do its thing."*
- **Validated where the configuration is read.** pi-tui silently floors `1.5` to `1` and clamps `-1` to `0` (`michael-orientation.md` §2, measured), so the reader rejects anything that is not a whole number ≥ 0 with a specific message, the way it already rejects a bad `distribution`.
- **No space above row one, and nothing done to the fleet-status row.** A footer cannot learn that a `belowEditor` widget exists (`research-chidi.md` Addendum 1 Q1), so a leading space could not depend on the fleet row. It would sit as a blank line under the editor in every session and cost a fullscreen transcript line. Space between Jefferson's own rows already breaks up the pile-up the screenshot shows. The fleet row's own spacing is pi-subagents'.

Agreed risks:

- In fullscreen each gap line costs the transcript one line, and a squeezed footer keeps its top lines, so on a very short terminal row one and the gap line show and row two is cut (`michael-orientation.md` §2).
- An unknown or misspelt key stays silent (`research-eleanor.md` Addendum 2 §2), so `rowgap: 0` still yields one line, with no warning.
- An invalid `rowGap` rejects the whole document and renders the default row, as every refusal does today (`research-eleanor.md` §2).

Disputed: nothing that affects the recommendation. On where the key may sit, Neil allows it on either top-level envelope and Matt accepts it beside a single top-level row with no effect. These are the same behaviour, since one row has no space between rows.

## Synthesis & Recommendation

Default to one blank line between rows through the footer's `VStack` `gap`, set once at install. Add one optional document-level key, `rowGap`: a whole number of 0 or more, rejected at read time otherwise, accepted on either document shape, with `0` restoring today's footer. Add nothing above row one, and change nothing about the fleet-status row. The six tests that equate line count with row count are rewritten for the new behaviour, not loosened. New tests cover:
- two rows render as `[row, "", row]`, the blank line unframed;
- one row renders one line;
- `rowGap: 0` reproduces today's output;
- `-1`, `1.5` and `"1"` are each refused with a warning.

Unknown row and document keys stay silent. The design records that as a `shortcut:` with its upgrade condition.

## Accepted & Rejected Feedback

- **Accepted:** the default of one line, a document-level `rowGap` with `0` as the way back, the `VStack` `gap` mechanism, read-time validation, the rewritten tests, no space above row one, and no change to the fleet row. Both advisors gave the same reasons.
- **Rejected, Q7, a `blank` row as the answer**, by both advisors. It works only because Joel overrides `blank`'s format to `""` (`research-eleanor.md` Addendum 2 §1), and it costs a row id and a row in `/jefferson`'s count. It is a configured row, not a default.
- **Rejected, Q6, a loud unknown-key rule**, by both advisors. Every row and document key is silent today, and a general rule interacts with the legacy `containers` key. It is outside the card.
- **Rejected:** a ceiling and a per-row setting, which fail the deletion test and leave the card (`michael-orientation.md` §4).
- **Set aside:** Matt's risk that an invalid `rowGap` costs the whole layout. That is the existing refusal path every key shares, so changing it is not this card.

## Owner Decisions Required

Tested against `owner-rulings.md`. The inherited rulings on defaults and the escape hatch settle the default's existence and its way back. They do not settle the name of a new user-facing key, or the conclusion on the row Joel himself raised. Those two go to Joel.

1. **The key and its default.** One blank line between rows by default, with a document-level `rowGap` (a whole number ≥ 0; `0` restores today's footer). Recommended: `rowGap`, after CSS's `row-gap`. The alternatives are `gap`, which already means three things here, and `spaceBetweenRows`.
2. **The row above the footer.** Recommended: no space above row one and no change to the fleet-status row. A footer cannot tell whether that row is present, so any leading space would show as a blank line under the editor in every session. The alternative is a leading blank line, always on.

### Joel's rulings

Recorded at PL2 on 2026-11-08. Joel answered both owner decisions as asked, each with the question put to him:

1. Asked *"The council recommends one blank line between rows by default, with a document-level key to change it (a whole number ≥ 0; 0 gives today's footer back). What should the key be called?"*, he chose **"rowGap (Recommended)"**. **One blank line between rows by default; a document-level `rowGap`, a whole number ≥ 0, with `0` giving today's footer back.**
2. Asked *"The fleet-status row (and any other below-editor row) sits flush on top of our footer. A footer can't tell whether that row is present. What should this change do above row one?"*, he chose **"Always a blank line above row one"** over the council's recommendation of nothing above row one. **The footer always renders space above its first row, whether or not anything sits above it. The cost he accepted is the blank line under the editor in every session and its fullscreen transcript line.**

**The conductor's reading, binding on design:** ruling 1 promised that `rowGap: 0` gives today's footer back. Ruling 2 adds space above row one. Both hold only if `rowGap` sets the space above row one as well as the space between rows. So `rowGap` governs both, the default is one line in each place, and `rowGap: 0` renders exactly today's footer. There is one key and no second setting. This supersedes the recommendation above wherever it says "no space above row one".

3. After the design gate, asked *"Michael approved the design, but a huge rowGap can hang pi: he measured 1e7 producing 20 million lines, and 1e21 never returns. The council had ruled out a ceiling as scope creep. Bound rowGap, or accept the risk?"* (offered as "Refuse anything above a small ceiling, e.g. 3 or 5"), he chose **"Bound it (Recommended)"**. **`rowGap` is bounded, and a value above the ceiling is refused on the same path as any other invalid value.** The conductor set the ceiling at **3** within the range he was shown: three blank lines in each place is already more space than any footer needs, and the number is one constant if it ever has to move.

4. At his live observation (task 7.1), 2026-11-08, of the default on the branch (screenshot `pi-clipboard-4f3aced8…png`: one blank line under the editor, one between his rows): *"this is the default. It's way too much space"*. **The default as built is rejected; less space is required.** Asked which of the two lines to remove, he asked instead: *"Can the row gap be accomplished by just adding top and bottom padding to the VStack that the HStack cells sit within?"* Having confirmed that a stack's gap falls only between its children and that the `Spacer(0)` is what puts it above row one, he ruled: *"Can we take out that spacer that's above our first line? This might be acceptable without that."* **The `Spacer(0)` comes out, reversing ruling 2: no space above row one, and `rowGap` sets only the space between rows.** He reserved the verdict ("might be acceptable"), so he sees it live before the artifacts are amended.

5. On the preview without the spacer, 2026-11-08 (screenshot `pi-clipboard-6750d6ca…png`: row one directly under the editor, one blank line between his rows): *"Better. It's still an awful lot of space between rows. Maybe nothing I can really do about it though, huh?"* Open: one line between rows by default, or none.
