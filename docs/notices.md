# Notices

`notice` shows the line pi would have drawn in the transcript: a cache miss of at least 20,000 re-billed tokens or ten cents, the usage a compaction or a branch summary billed, or the thinking blocks Anthropic dropped during provider recovery.

```json
{
  "rows": [[{ "instrument": "notice" }]],
  "instruments": { "notice": { "seconds": 20 } }
}
```

## Seconds

A notice shows for `seconds`, a whole number from 1 to 60, or for ten seconds when the configuration file sets none. Then it disappears.

One notice shows at a time. A newer notice replaces the one showing, and it counts its own `seconds` from its own arrival.

## Placing `notice` turns it on

Jefferson never reads or writes pi's settings. Putting `notice` in a row is the switch.

pi's own `showCacheMissNotices` is off by default and draws nothing. Turn it on as well and each cache miss shows twice: once in the footer and once in the transcript.

A cache warm draws no notice. pi draws its own when a warm finishes, and no event tells an extension that a warm finished.

## The words are yours

Each kind of notice has its own text, and the values in it are variables:

| Kind | Shows for | Variables | Default text |
| --- | --- | --- | --- |
| `miss` | a cache miss with no model change and no idle | `$tokens`, `$cost` | `Cache miss: $tokens tokens re-billed$cost` |
| `missModelSwitch` | a miss whose turn follows a model change | `$tokens`, `$cost` | `Cache miss after model switch: $tokens tokens re-billed$cost` |
| `missIdle` | a miss after five minutes or more without a request | `$tokens`, `$cost`, `$idle` | `Cache miss after $idle\m idle: $tokens tokens re-billed$cost` |
| `compaction` | a compaction's billed usage | `$tokens`, `$cost` | `Compaction: $tokens tokens billed$cost` |
| `branchSummary` | a branch summary's billed usage | `$tokens`, `$cost` | `Branch summary: $tokens tokens billed$cost` |
| `thinking` | thinking blocks dropped in provider recovery, any count but one | `$blocks` | `Anthropic dropped $blocks thinking blocks (details in session)` |
| `thinkingOne` | exactly one thinking block dropped | `$blocks` | `Anthropic dropped $blocks thinking block (details in session)` |

The defaults read as pi's English, and no translations ship. To read a kind in your own words, write its text in `formats`:

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
- `$cost` is pi's whole suffix, with the leading space and the parentheses, and it is empty below a cent. That is why the default texts hold no parentheses of their own.
- `$idle` is the minutes, such as `6`. That is why `missIdle` writes `$idle\m` for pi's `6m`.
- `$blocks` is the count. That is why the thinking notice has two kinds: one for a single block and one for any other count.

A kind that carries no value for a variable renders nothing in its place. A thinking notice has no cost, and a compaction has no block count.

Each kind's text is a composed format, so it takes no modifier and no form ([Formats](formats.md#composed-formats)). The instrument's own format names `$notice`, the text composed for the kind that is showing. `$notice` takes the theme's `warning` colour, which replaces a configured `fg` on it — unless the format names a colour for `$notice`, which is the stronger one ([Formats](formats.md#colours)). A configured `bg` and the boolean attributes still apply.

## What rejects a notice

These faults reject the whole configuration file, and the default row renders:

- `seconds` is not a whole number from 1 to 60.
- `formats` names a kind that does not exist, gives a kind a text that is not a string, or gives it a text Jefferson cannot parse, such as one that names a value other than `$tokens`, `$cost`, `$idle` and `$blocks`.
