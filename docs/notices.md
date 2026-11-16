# Notices

`notice` shows the line pi would have drawn in the transcript: a cache miss of at least 20,000
re-billed tokens or ten cents, the usage a compaction or a branch summary billed, or the thinking
blocks Anthropic dropped during provider recovery.

```json
{
  "rows": [[{ "instrument": "notice" }]],
  "instruments": { "notice": { "seconds": 20 } }
}
```

## Seconds

A notice shows for `seconds`, a whole number from 1 to 60, and ten when the document sets none. Then
it disappears.

One notice shows at a time. A newer notice replaces the one showing, and counts its own `seconds`
from its own arrival.

## Showing the notice is the entry's job

Jefferson never reads or writes pi's settings. Placing an entry that names `notice` is the switch.

pi's own `showCacheMissNotices` stays off at its default and draws nothing. Turning it on as well
shows that event twice: once in the footer and once in the transcript.

A cache warm draws no notice. pi draws its own when a warm finishes, and no event tells an extension
that a warm finished.

## The words are yours

Each kind's text is a format, and the values in it are variables:

| Kind | Shows for | Variables | Default text |
| --- | --- | --- | --- |
| `miss` | a cache miss with no model change and no idle | `$tokens`, `$cost` | `Cache miss: $tokens tokens re-billed$cost` |
| `missModelSwitch` | a miss whose turn follows a model change | `$tokens`, `$cost` | `Cache miss after model switch: $tokens tokens re-billed$cost` |
| `missIdle` | a miss after five minutes or more without a request | `$tokens`, `$cost`, `$idle` | `Cache miss after $idle\m idle: $tokens tokens re-billed$cost` |
| `compaction` | a compaction's billed usage | `$tokens`, `$cost` | `Compaction: $tokens tokens billed$cost` |
| `branchSummary` | a branch summary's billed usage | `$tokens`, `$cost` | `Branch summary: $tokens tokens billed$cost` |
| `thinking` | thinking blocks dropped in provider recovery, any count but one | `$blocks` | `Anthropic dropped $blocks thinking blocks (details in session)` |
| `thinkingOne` | exactly one thinking block dropped | `$blocks` | `Anthropic dropped $blocks thinking block (details in session)` |

The defaults read as pi's English, and no translations ship. Write a kind's text in `formats` to
read it in your own words:

```json
{
  "rows": [[{ "instrument": "notice" }]],
  "instruments": {
    "notice": { "formats": { "miss": "Miss de cache: $tokens jetons refacturés$cost" } }
  }
}
```

The values are bare quantities, and the words around them belong to the kind:

- `$tokens` is pi's count: `125k` for 125,300 and `20k` for 20,000.
- `$cost` is pi's whole suffix, the leading space and the parentheses included, and nothing below a
  cent. That is why the default texts hold no parentheses of their own.
- `$idle` is the minutes, `6`. That is why `missIdle` writes `$idle\m` for pi's `6m`.
- `$blocks` is the count. That is why the thinking notice is two kinds: one for a single block, one
  for any other count.

A kind that carries no value for a variable renders nothing there. A thinking notice has no cost,
and a compaction has no block count.

A kind's text is plain: it names that kind's values, and it takes no modifier and no form. Styling
belongs to the entry, so `style` sets colours and attributes over the whole notice. The entry's own
format names `$notice`, the text composed for the kind. See [Formats](formats.md).

## What rejects a notice

These faults reject the whole document, and the default row renders:

- `seconds` is not a whole number from 1 to 60.
- A `formats` entry names a kind that does not exist, or a value that is not a string, or a `$name`
  the kind does not carry.
