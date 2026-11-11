# Proposal

## Why

pi draws a notice for a significant cache miss, for a compaction or branch summary's billed usage,
and for Anthropic thinking blocks dropped during provider recovery, one line each into the chat
transcript, behind a setting that defaults to off and offers an extension no hook to reshape or
suppress them (`research-chidi.md` §1, §2; `michael-orientation.md` T1). Joel wants those notices in
the footer instead, shown when they happen and for a time he configures, because the footer is where
Jefferson already shows what the session is doing and a line that scrolls away in the transcript is
read once at most (`owner-rulings.md`, 2026-11-10).

## What Changes

- **A notice instrument.** One shipped instrument shows a notice in a cell: pi's text for the
  notice's kind, in pi's colour, on one line, and nothing while no notice is showing. Adding it is
  one file under `components/instruments/` plus one entry in `shipped.ts`, the shape the layout spec
  already requires of every instrument (`research-chidi.md` §1; `michael-orientation.md` T6, T9;
  `owner-rulings.md`, 2026-11-08 default labels).
- **The notices that ship.** Cache misses, with pi's model-switch and idle variants; compaction
  usage; branch-summary usage; and dropped thinking blocks (`owner-rulings.md`, 2026-11-10). pi
  colours all four `warning` (`research-chidi.md` §1).
- **Where each notice comes from.** `message_end` for a cache miss and for dropped thinking blocks,
  `session_compact` for compaction usage, `session_tree` for branch-summary usage
  (`research-chidi.md` §3; `michael-orientation.md` T3, T4). Every input is pi's data read through an
  event, so nothing reads the terminal and nothing shells out (`owner-rulings.md`, 2026-11-05). The
  datum enters through the store and the feed, as the living store spec's "A new datum enters the
  store and the feed, never an instrument" requires.
- **Cache warm is out, and the README says why.** No extension event carries a completed warm:
  `cache_warming_decision` fires before each refresh, so a warm would surface only when a later
  render's scan found it, with its clock starting late (`research-chidi.md` §3;
  `michael-orientation.md` T4). Joel chose to leave it out (`owner-rulings.md`, 2026-11-10).
- **A configurable visible time.** One option on the notice instrument's declaration, read and
  bounds-checked when the document is read, on the `rowGap` precedent for a bounded number
  (`research-eleanor.md` §4; `michael-orientation.md` T6).
- **An expiry on a clock the composition root supplies.** The deadline is known when the notice
  arrives, so one timer set to it expires the notice, and the store requests the repaint. That is a
  scheduled change to state Jefferson already holds; nothing asks the host whether anything changed,
  which is the poll the living specs forbid (`michael-orientation.md` §1, D-a). The pending timer is
  cleared in the
  existing release, and startup registers the `session_shutdown` handler that runs that release,
  because the host does not dispose the footer on every reload (`michael-orientation.md` T5).
- **The contract with pi's setting.** Placing the instrument is the switch. Jefferson never reads or
  writes pi's settings, so a user who also turns `showCacheMissNotices` on sees both, and the README
  says so (`owner-rulings.md`, 2026-11-10; `research-chidi.md` §2; `michael-orientation.md` T1).
- **No breaking change.** A document that configures nothing renders as it does today. A row holding
  the notice cell re-seats while a notice shows, and again when it expires, which is the width plan's
  consequence, the one ADR 0007 records (`michael-orientation.md` T7).

## What this change deliberately does not do

- It does not suppress pi's transcript notices. No extension API intercepts them, in 1.4.0 or in
  1.5.2 (`research-chidi.md` §2; `michael-orientation.md` T1).
- It does not show a cache-warm notice, and does not warn when pi's own setting is on.
- It does not settle whether a notice fades or disappears, whether notices queue, the default
  duration or its bounds, or how much of pi's rule is copied. The section below carries those as
  questions rather than answers.

## Capabilities

### New Capabilities

None. The notice is a datum in a store that already exists and an instrument in a statusline that
already exists.

### Modified Capabilities

- `session-data-store`: adds the notice datum, the host events that push it, its expiry on a
  supplied clock, and the timer the release clears.
- `statusline`: adds the notice instrument, the text and colour it renders, and the visible-time
  option it declares.

`extension-source-layout` needs no delta. One source file per instrument plus one `shipped.ts` entry
is what its "Each shipped instrument has its own source file" already requires.

## Open Questions

1. **Fade or disappear.** Joel's words name both and leave the choice open (`owner-rulings.md`,
   2026-11-10). A fade costs a cadence of whole-tree repaints and a colour step, and the theme
   exposes no background to mix toward. A disappear costs one timeout and one repaint
   (`research-chidi.md` §5; `michael-orientation.md` T8). For the council and the design.
2. **One notice at a time or a queue.** One `message_end` can carry a dropped-thinking notice and a
   miss together, and a compaction can land right after a miss (`research-chidi.md` §1;
   `michael-orientation.md` T10). For the council and the design.
3. **The default duration, and the bounds the option accepts.** Not ruled. The design proposes them
   and Joel judges them at the live check his ruling asks for.
4. **How much of pi's miss rule is copied, and how drift is caught.** The rule cannot be imported:
   pi's manifest exports only `.` and `./rpc-entry`, and none of the detection, the constants or the
   noise floor is exported (`research-chidi.md` §1; `michael-orientation.md` T2). So Jefferson
   reproduces some of the noise floor, the display gate, the five-minute TTL, the scan's resets and
   the price fallback, and no test can see pi retune it. Which parts it reproduces, and what catches
   a change, is open. For the council and the design.

## Impact

- `extensions/jefferson/components/instruments/` gains one file and `shipped.ts` one entry. `data/`
  holds the notice and takes the subscriptions for it, joining the feed's single release.
  `startup.ts` supplies the clock beside `homedir` and `requestRender`, and registers
  `session_shutdown` (`michael-orientation.md` §1 D-a, T5). `configuration.ts` reads the visible time
  the way it reads `rowGap` (`research-eleanor.md` §4).
- No new dependency. A fade, if it ships, draws from what pi-tui already exports
  (`research-chidi.md` §5).
- Tests live under `tests/`, one for each of the above (`extension-source-layout` spec, "Tests never
  occupy a loadable or shipped path").
- The README gains the contract and the reason cache warm is absent. The design records the timer as
  revising the last change's Non-Goal against timed repaints; that rule never reached a spec, so no
  ADR retires it (`michael-orientation.md` §1).
- pi's global install is 1.5.2 and this repository's devDependency pin is 1.4.0. The notice code,
  the thresholds and the event order are the same in both (`michael-orientation.md`, baseline).
