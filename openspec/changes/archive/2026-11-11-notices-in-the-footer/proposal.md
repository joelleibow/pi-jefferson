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

- **A notice instrument.** One shipped instrument shows a notice in a cell: by default pi's text for
  the notice's kind, in pi's colour, on one line, and nothing while no notice is showing. Adding it is
  one file under `components/instruments/` plus one entry in `shipped.ts`, the shape the layout spec
  already requires of every instrument (`research-chidi.md` §1; `michael-orientation.md` T6, T9;
  `owner-rulings.md`, 2026-11-08 default labels).
- **The text is a configurable format.** Joel ruled after the council that each notice's words are a
  format the user can configure, with the values in it declared as variables, so a notice can read in
  the user's own words and Jefferson ships no translations
  (`owner-rulings.md`, 2026-11-10: After the council). The defaults are pi's English text exactly,
  and the values keep pi's formatting. The ruling supersedes the council's fixed-text premise wherever
  the two differ (`council.md`, Joel's Ruling After the Council).
- **The notices that ship.** Cache misses, with pi's model-switch and idle variants; compaction
  usage; branch-summary usage; and dropped thinking blocks (`owner-rulings.md`, 2026-11-10). pi
  colours all four `warning` (`research-chidi.md` §1).
- **One notice at a time.** The store holds one slot and one timer. A newer notice replaces the one
  showing, clears the pending expiry, and takes its whole visible time from its own arrival; when one
  `message_end` carries a dropped-thinking notice and a miss together, the miss is the one that stays
  and the thinking notice is lost (`council.md`; `council-neil-pass2.md` N5; `research-chidi.md` §1).
- **It disappears when its time is over.** No fade ships. A fade costs a cadence of whole-tree
  repaints that each re-sample the host, and the theme gives no background to mix toward, so a
  token-step fade waits for Joel to ask for one at the live check (`council.md`; `research-chidi.md`
  §5; `michael-orientation.md` T8).
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
- **pi's rule is copied whole.** The noise floor, the display gate (20,000 missed tokens or $0.10 of
  cost), the five-minute TTL, the resets at a compaction and a branch summary, the price fallback, the
  cache-warm entry that becomes the previous request and the thinking-drop delta are all reproduced,
  and the values a notice's text carries take pi's `formatTokens` and its ` (~$X.XX)` suffix. Each
  constant gets one named place with
  pi's file and line beside it (`council.md`; `research-chidi.md` Addendum 1;
  `michael-orientation.md` T2). Drift is caught by boundary tests on the pure notice module, a
  `shortcut:` comment naming the pin, and a risk the design states; no test reads pi's files
  (`council-neil-pass3.md`; `council-matt-pass3.md`).
- **A configurable visible time, named `seconds`.** One option on the notice instrument's
  declaration: a whole number of seconds from 1 to 60, default 10, rejected outside those bounds the
  way the document-level `rowGap` is, so a value of 0, 61, 1.5 or `"10"` rejects the whole document
  and renders the default row (`council.md`; `research-eleanor.md` §4; `michael-orientation.md` T6).
- **The root passes that value to the store.** The composition root reads the declared `seconds` and
  gives it to the store beside the clock, so `data/` imports no configuration module and two `notice`
  cells cannot disagree about it (`council.md`; `council-matt-pass2.md` M5; `michael-orientation.md`
  §1 D-a).
- **An expiry on a clock the composition root supplies.** The deadline is known when the notice
  arrives, so one timer set to it expires the notice, and the store requests the repaint. That is a
  scheduled change to state Jefferson already holds; nothing asks the host whether anything changed,
  which is the poll the living specs forbid (`michael-orientation.md` §1, D-a). The pending timer is
  cleared in the existing release, and startup registers the `session_shutdown` handler that runs
  that release, because the host does not dispose the footer on every reload (`michael-orientation.md`
  T5).
- **Nothing runs unless a row places the cell.** With no `notice` cell the extension subscribes to no
  notice event, scans no session entries for one, and holds no timer, so a document that never shows a
  notice pays nothing for it (`council-neil-pass2.md` N3; `michael-orientation.md` T5).
- **The contract with pi's setting.** Placing the instrument is the switch. Jefferson never reads or
  writes pi's settings, so a user who also turns `showCacheMissNotices` on sees both, and the README
  says so (`owner-rulings.md`, 2026-11-10; `research-chidi.md` §2; `michael-orientation.md` T1).
- **No breaking change.** A document that configures nothing renders as it does today. A row holding
  the notice cell re-seats while a notice shows, and again when it expires; ADR 0007 records that
  consequence (`michael-orientation.md` T7).

## What this change deliberately does not do

- It does not suppress pi's transcript notices. No extension API intercepts them, in 1.4.0 or in
  1.5.2 (`research-chidi.md` §2; `michael-orientation.md` T1).
- It does not show a cache-warm notice, and does not warn when pi's own setting is on.
- It does not fade and it does not queue notices: the notice disappears, and a newer one replaces
  the one showing. It does not settle the default duration or its bounds; the design proposes 10
  seconds and 1..60, and Joel judges them at the live check his ruling asks for (`council.md`, Owner
  Decisions Required).

## Capabilities

### New Capabilities

None. The notice is a datum in a store that already exists and an instrument in a statusline that
already exists.

### Modified Capabilities

- `session-data-store`: adds the notice datum, the host events that push it, one-notice-at-a-time
  replacement, the visible time the root passes, its expiry on a supplied clock, the timer the release
  clears, and the gate on placing the cell.
- `statusline`: adds the notice instrument, the configurable format its text comes from with the
  variables that format carries, its default text and colour, and the `seconds` option its declaration
  carries.
- `extension-source-layout`: widens "Who names the instruments" so its parenthetical names the
  `notice` declaration `configuration.ts` imports to gate on, beside `blank`'s file for the fallback.
  Nothing else in that spec moves, and one source file per instrument plus one `shipped.ts` entry is
  what "Each shipped instrument has its own source file" already requires, so the change adds no new
  requirement there.

## Open Questions

The council settled the ending, one notice at a time, how much of pi's rule is copied, what catches
its drift, and the option's key and bounds; `council.md` carries that reasoning and its citations.
Three things are left for the design:

1. **How the root gets the value in place.** Configuration is read after the feed and the store are
   built today, so passing the visible time at the root means reading configuration first. The design
   must show that `readConfiguration` reads nothing the feed or the store creates, or ask Eleanor
   (`council-matt-pass2.md` M5; `research-eleanor.md` Addendum 1; `council.md`, Accepted & Rejected
   Feedback 10).
2. **The default and the bounds are the design's assumption.** 10 seconds and 1..60 are not ruled:
   the design states them, and Joel judges them at the live check his ruling asks for (`council.md`,
   Owner Decisions Required).
3. **The shape of the configurable text.** Joel's ruling settles that the words are a format with
   variables and that its defaults are pi's text; it leaves to the design whether that is one format
   per kind or another arrangement, what the variables are called, and how the miss variants are
   expressed (`owner-rulings.md`, 2026-11-10: After the council; `council.md`, Joel's Ruling After the
   Council).

## Impact

- `extensions/jefferson/components/instruments/` gains one file and `shipped.ts` one entry. `data/`
  holds the notice and takes the subscriptions for it, joining the feed's single release.
  `startup.ts` supplies the clock beside `homedir` and `requestRender`, registers `session_shutdown`,
  and gives the store the visible time the declaration names (`michael-orientation.md` §1 D-a, T5;
  `council.md`). `configuration.ts` reads the `seconds` option the way it reads `rowGap`
  (`research-eleanor.md` §4; `council.md`).
- No new dependency, and nothing drawn from pi-tui, because no fade ships (`council.md`).
- Tests live under `tests/`, one for each of the above (`extension-source-layout` spec, "Tests never
  occupy a loadable or shipped path").
- The README gains the contract and the reason cache warm is absent. The design records the timer as
  revising the last change's Non-Goal against timed repaints; that rule never reached a spec, so no
  ADR retires it (`michael-orientation.md` §1).
- pi's global install is 1.5.2 and this repository's devDependency pin is 1.4.0. The notice code,
  the thresholds and the event order are the same in both (`michael-orientation.md`, baseline).
