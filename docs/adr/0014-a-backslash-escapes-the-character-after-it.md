# 14. A backslash escapes the character after it, whatever it is

Date: 2026-11-10
Status: Accepted. Extends [ADR 0003](0003-a-format-carries-modifiers.md) and supersedes its escape
sentence. The modifier vocabulary, the pipe rule and every other sentence of ADR 0003 stay in force.

## Context

Joel's 2026-11-10 ruling after the docs pass put English out of the values: `$blocks` became the bare
count, with the thinking notice split by grammatical number, and `$idle` became the bare minutes.
Keeping pi's default text exact then needs a letter straight after a variable, so the `missIdle`
default reads `Cache miss after $idle\m idle`.

The grammar could not write it. A variable name runs over letters, digits and underscores, so `$idlem`
is one undeclared name, and pi's text has no space before its `m`. A backslash that escapes only `$`
and `|`, which is ADR 0003's rule, cannot put an `m` after a variable.

Asked to choose between generalizing the escape and leaving `6m` inside the value, Joel chose
**"Generalize the escape"**.

## Decision

In every format, a backslash yields the character after it, whatever it is. `\$`, `\|` and `\m` render
`$`, `|` and `m`. A backslash with nothing after it has no character to yield and stays itself. The
plain parse keeps the same grammar, so a kind's format gets the rule for free.

`$` and `|` remain the format language's two special characters. They are the characters that need
escaping for their own sakes; they are no longer the escape's limit.

**The cost, and the audit.** A document carrying a literal backslash before a letter changes meaning
silently, which is the cost ADR 0003 paid for `\|`. Its audit was repeated over the tree — 890 lines
matched, in five classes, none of them a format — and Joel's own `pi-jefferson.json` was read and not
edited: it carries no backslash. Breaks are cheap before 1.0.

**What stays a value.** A numeral's own rendering stays in the value: `$tokens` keeps its `k` and `M`,
and `$cost` keeps its suffix, a presence rule no format can express. The line is the one the ruling
drew: a word a translator would write differently belongs in the text.

## Consequences

- `$idle\m` renders the minutes with an `m` after them, and a user writing their own words can put any
  character after any variable.
- A document carrying `\x` renders `x` where it rendered `\x`, with no warning. No format the
  repository carried did, so no shipped output changes.
- A trailing backslash keeps its old meaning, which is the rule's one edge that does not move.
- Reversing this returns the language to a two-character escape. The `missIdle` default would then need
  a space before its unit, or the unit back inside the value.
