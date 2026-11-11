# 3. A format carries modifiers, and `|` is a second special character

Date: 2026-11-06
Status: Accepted. Supersedes the `MUST NOT … apply a style` clause and the `$` is the only special
character clause of `An instrument's format is plain text and variables` in the statusline spec. Its
escape sentence is superseded in turn by
[ADR 0014](0014-a-backslash-escapes-the-character-after-it.md): the two special characters stay, and a
backslash now yields any character. No other sentence of this record changes.

## Context

That requirement came from the 2026-11-05 rulings: a format is plain text plus `$variables`, no
Markdown and no group syntax. Under it the language substituted values and did nothing else, and `$`
was the one character that meant something. That was true while styling lived in exactly one place,
an instrument's `style`, and the requirement said so on purpose.

Joel's 2026-11-06 rulings in `variable-modifiers` change what a format is for. Each of the six
`ThemeStyle` attributes becomes a `|xxx` modifier that can follow a variable and that chains, and
modifiers apply to plain text as well as to a variable. The same rulings name the string mutations,
put `capitalize` at the first letter only, and settle that a pipe which no name follows is literal
text. A language that can style a segment cannot keep a sentence saying it must never apply a style,
and a pipe that can begin a modifier cannot stay an ordinary character.

The cost is real and was measured before the decision. A document writing `$variable|word` renders
the pipe as text today and would begin a modifier after this change. An audit of the repository
before the change found no format shaped that way — none in the spec, an ADR, `ARCHITECTURE.md`,
`AGENTS.md`, a test or the README — and no `pi-jefferson.json` anywhere in the tree. One silent
change survives it. `\|` used to render `\|`, because a backslash before anything but `$` was a
literal backslash; it now renders `|`.

## Decision

`$` and `|` are the format language's two special characters, escaped `\$` and `\|`.

A `|name` modifies the text it follows. After a variable's name it modifies the value, and a second
one extends that same chain. Elsewhere it modifies the run of non-whitespace text directly before
it, so a multi-word phrase takes a modifier on each word. A `|` whose next character is not a name
is the character itself, which keeps `$model | $provider` rendering.

What may be named is pi's six `ThemeStyle` attributes — they set that attribute and nothing else —
plus `capitalize`, `upper` and `lower`, which change the value's text. A modifier adds to the
instrument's `style` and can never switch an attribute off, `fg` and `bg` are not modifiers, and
`$bar` takes none. An unknown name, a modifier on `$bar`, and a modifier with nothing to modify each
reject the document when it is read, naming the instrument and the offender.

What survives of the retired rule is its purpose. The format language still never formats a number
and never parses Markdown, `[`, `]`, `(` and `)` remain text, and the language adds no styling
vocabulary of its own: a style modifier is one of `ThemeStyle`'s six names, spelled as `ThemeStyle`
spells it, and resolved against the live theme through the same call that applies the instrument's
style.

## Consequences

- Styling now has two places to name it, the `style` option and a format's modifier, with one
  vocabulary and one direction. A modifier can only add, so `$model|bold` renders bold over an
  instrument whose `style` sets `bold: false`, and the answer to "make this not bold" is the `style`
  option rather than a format.
- A document that writes `$variable|word` changes meaning: the pipe begins a modifier, or the
  document is rejected when the name is unknown. No shipped string does, and the warning names the
  modifier when one is.
- A document that writes `\|` changes meaning without a warning. This is the one change here that
  alters output silently.
- A format with no modifier renders exactly what it rendered before, character for character.
- Reversing this decision means restoring a substitution-only language and rejecting every document
  that carries a modifier.
