# 12. An instrument's text may be composed from a format a reading chooses

Date: 2026-11-10
Status: Accepted. Extends the declaration contract of
[ADR 0010](0010-a-variable-declares-the-forms-it-accepts.md) and the format language of
[ADR 0003](0003-a-format-carries-modifiers.md). Both stay in force: a form still selects a rendering
of one variable, and a composed set selects a whole format.

## Context

Joel ruled on 2026-11-10 that each notice's words are a format the user configures, that the values
in it are variables, that the defaults read as pi's English, and that Jefferson ships no translations.
He asked for it because a non-English speaker should be able to write the notice in their own words
without waiting for a translation: *"rather than provide localization I'd like the strings to be
configurable. we should provide variables for the values and allow string formatting for this
purpose."*

The format language could not carry that. It held one configured format per instrument name, and
`variableForms` gives alternate renderings of one variable, not alternate formats. A notice, though,
is several texts. pi draws six of them, and their words lie outside every value: a miss says "after
model switch" or "after 6m idle", a compaction and a branch summary each say what was billed, a
thinking notice names Anthropic and points at the session. No single format renders all six.

A variant recorded inside a value would put the variant's English in the wrong place. That English is
exactly what the ruling exists to let a user replace. The words have to belong to the text, and the
text has to be chosen.

## Decision

A declaration may carry a composed format set. It names four things and nothing else:

- the reading that selects which format to use, yielding nothing when there is nothing to compose;
- one default format per key that reading can yield;
- the values those formats may name, each already formatted;
- the variable the chosen text arrives at the cell's format through.

The declaration owns the selection, the values and the defaults, which is why the field is `composed`
rather than `formats`: a bare `formats` would read as a list of formats for the cell.

A document overrides one key at a time, in the instrument's own options. An unknown key, a value that
is not a string, and a variable the composed set does not carry each reject the whole document, naming
the instrument and the offender.

**A composed format is plain.** It is parsed by the same grammar and validated against the composed
values, and it carries no modifier and no form. Styling stays at the cell, which colours the composed
variable. A modifier inside the text would emit its own escape sequences, and its reset would drop the
cell's foreground for the rest of the notice.

**The two variable sets are not interchangeable.** The declaration's own variables carry the composed
variable, whose resolver yields nothing, so a notice with nothing to show blanks the cell and its
label through the rule every instrument already obeys. The composed values stay out of that set on
purpose: the format language blanks a cell when any declared variable resolves nothing, so declaring
four values that one kind carries would blank nearly every notice instead. A plain format joins an
absent value as nothing, and only the composed variable's own absence blanks the cell. A cell's format
that names a composed value, or a composed format that names the composed variable, is refused.

**The binding composes, once per render.** It resolves the selected format against the same readings
and hands the text to the cell's format as an already-resolved value, through the one optional
argument the resolve step takes. Nothing else passes it, and there is no theme in the first
resolution.

**The store composes nothing.** `data/` imports no source file outside itself, so composing there
would either give the format grammar a second home or break the import rule.

## Consequences

- A declaration grows one optional field, and the format language grows a plain parse, a plain
  resolve and one optional argument. Every instrument without a composed set parses and renders
  exactly as it did.
- A user writing their own notice edits up to six strings. Each is independent and defaulted, and a
  user content with English changes nothing.
- A value keeps pi's formatting, so a translated notice still carries pi's English for a unit and a
  noun: `6m` and `2 thinking blocks`. Separating them is a later form on those two values, and no
  datum changes.
- A kind's format has one home, in the declaration, so an unknown key is refused at read time rather
  than silently ignored.
- Reversing this means removing the field, the plain parse and the optional argument. A document that
  configured a composed set would then be rejected as an unknown option, which is the existing answer
  to an option an instrument does not declare.
