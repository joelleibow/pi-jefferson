# 10. A variable declares the forms it accepts

Date: 2026-11-10
Status: Accepted. Extends [ADR 0003](0003-a-format-carries-modifiers.md). Its modifier set stays
global and stays in force, and a form is a second selection that belongs to one variable. No sentence
of ADR 0003 changes.

## Context

ADR 0003 made `|name` a modifier and gave the names it may carry one global table: pi's six
`ThemeStyle` attributes, plus `capitalize`, `upper` and `lower`. That table fits styling and string
mutation, because both act on whatever text they follow. It cannot decide which text a variable
hands over.

Joel's ruling of 2026-11-10 gives `$path` three forms — `|base`, `|absolute` and `|relative`, with a
bare `$path` still the basename — asked for as modifiers *"like we do for styling"*. The store holds
the whole working directory and `path`'s resolver returns the basename. By the time a modifier runs,
the string is the basename, and no modifier can get the other two forms out of it.

A global modifier named `base`, `absolute` or `relative` would be valid after any variable, so
`$model|base` would parse and render, which the ruling does not ask for. Three variables — `$base`,
`$absolute`, `$relative` — would rename the datum and give the working directory a second spelling;
renaming and a second spelling were ruled out, and the name `path` stays.

## Decision

An instrument may declare forms for a variable: named resolvers over the same `Readings` the variable
already receives, one of them that variable's default. The declaration hangs off the instrument, in
`variableForms`, so a variable's forms have one home. The format language reads it twice — parsing
refuses a name the declaration does not carry, and rendering resolves the form the format names.

Parsing reads a `|name` directly after a variable as a form when that variable declares it, and
records the form on the variable's segment, apart from the modifier chain. Everywhere else the name is
no form, and the existing modifier table decides. An unknown name, a form after literal text, a form
on a variable that declares none, a form after another modifier, and a second form on one variable
all reject the document. The message is the one the language already uses for a modifier it does not
implement, and it names the instrument and the name.

A form selects a reading and never changes text, which keeps it clear of the rule that a text-changing
modifier is `capitalize`, `upper` or `lower`. It applies before the string and style modifiers after
it, so `$path|relative|capitalize` mutates the relative text, and a variable's declared foreground
token reads the form's value, the way it reads a pre-mutation value today.

## Consequences

- `path` declares `base` as its default and adds `absolute` and `relative`. A bare `$path` and
  `$path|base` render the basename; `$path|absolute` renders the whole directory; `$path|relative`
  follows pi's own rule — `~` for home itself, `~/sub` below it, and the whole directory anywhere
  outside home, which is also what an unknown home gives.
- No document that is valid today becomes invalid. No shipped format and no configuration document
  names a form, and a format without one renders character for character as it did.
- A form has one place to go: directly after its own variable, once, and before any other modifier.
  An instrument that declares no forms is untouched, and a form that lands elsewhere is refused
  rather than rendered as literal text.
- Reversing the decision means removing the declarations and the record. Pushing it further — forms
  after literal text, a form repeated, a form after a style modifier — is what the position rule
  refuses, and each refusal keeps the existing unknown-modifier message rather than inventing a
  second one for a nicer sentence.
