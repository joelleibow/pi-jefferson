# 21. A foreground colour of the theme is a modifier

Date: 2026-11-24
Status: Accepted. Supersedes the sentence in [ADR 0003](0003-a-format-carries-modifiers.md) that `fg` and `bg` are not modifiers, and the one direction its consequences claim for every modifier. An attribute modifier still only adds; a colour is the exception, and it is the strongest colour a piece of text can carry. Every other sentence of ADR 0003 stays in force, its claim that the language adds no styling vocabulary of its own included: a colour is pi's name, spelled as pi spells it.

## Context

A format could style text and could not colour one piece of it. The vocabulary after `|` was pi's six `ThemeStyle` attributes, three string mutations (ADR 0003) and a variable's own declared forms (ADR 0010), and pi's colour names were unreachable from a format altogether. A user who wanted the model in one colour and the thinking level in another had to colour the whole instrument through `style`.

The names could not be copied. pi publishes no runtime list of the names its themes carry: a theme answers for one name at a time through its foreground accessor, the two slots are told apart only by which accessor accepts a name, and a background name, a case variant and an inherited object property are all refused alike. A list of the host's names written down here would be a copy to drift at every pi release.

Joel ruled the shape on 2026-11-24: every foreground colour a theme defines becomes a name after `|`, no background colour does, a reserved word keeps its meaning, and a colour written in the format is the strongest colour there is. The rulings are quoted in `openspec/changes/theme-colors-as-modifiers/owner-rulings.md`, and the decision they took is `openspec/changes/theme-colors-as-modifiers/design.md`.

## Decision

- **A foreground colour of the theme is a modifier.** A `|name` may be any name of the theme's foreground slot, spelled as pi spells it. The name is asked of the theme the host hands the extension, and the text is drawn in the colour that theme gives the name when the footer renders. The extension holds no copy of the set of names, reads no theme file, and compensates for nothing: a theme that draws a colour faint draws it faint here.
- **A background colour is not a modifier.** `bg` stays `style`'s business, and a background name after a pipe is refused as any name the language does not implement is.
- **A reserved word keeps its meaning.** Names after `|` are read in one order: a form the variable declares, then one of the extension's own names, then a foreground colour of the theme. `|dim` is the faint attribute on every theme, and a theme's `dim` colour is reached through the instrument's `style`.
- **The colour a format names is the strongest colour a piece carries.** A piece's foreground is the last colour its chain names; else the instrument's own choice for that variable, asked only when the chain names none; else the instrument's `style`. A label has no format, so only `style` colours it.
- **A name the language cannot answer refuses the format when it is read:** the whole document for one of Jefferson's instruments, that instrument alone for a provided one. The warning quotes the offending name and names what the name was measured against.
- **The retirement is narrow.** Attribute modifiers keep ADR 0003's direction: an attribute a format sets is added, never switched off. What is retired is the claim that a modifier can only add, and with it the rule that a colour belongs to `style` alone.

## Alternatives weighed and not taken

- **Writing down pi's names, or reading a theme file.** A list answers faster and would be wrong: the set is the host's, one call to the theme answers for one name at a time, and a copy is a second list to drift at every pin bump. Joel ruled against reading a theme file where pi already offers the access.
- **Asking the theme before the extension's own names.** Cheaper to write, and it lets a theme's colour shadow `|dim`, losing a meaning every format written so far relies on. Joel ruled the other way.
- **A distinct refusal for a background name.** It has the same remedy as a misspelling — write a foreground colour the theme carries — so telling the two apart would probe the background accessor on every refused name to change no user's action.
- **Folding a colour into the merged style.** With a `style` foreground of `accent`, `$level` and `$level|accent` would style identically and have to render differently, so a colour is held on its own segment against the attribute chain rather than merged with it.
- **Resolving a colour's escape sequence when the document is read.** It would draw faster and would freeze the theme the document was read with, so a theme switch mid-session would keep drawing the old colours, against the standing rule that styling is resolved at render. Holding the name instead lets the render's own theme draw it.

## Consequences

- A user colours one piece of a row without colouring the instrument, and pi's names are reachable from a format for the first time.
- Nothing that renders today changes: a colour only turns a refused name into an accepted one, and the new precedence touches only a piece that carries a colour of its own.
- Two standing colours give way to a colour in the format — the thinking instrument's colour for its level and the notice's `warning` — because the format's colour is the strongest.
- An older Jefferson refuses a document that names a colour, and refuses a provider's registration whole when its default format names one. Nothing tells an author which release is running, so an author supporting older releases keeps colours out of default formats.
- A theme that could not answer for a name at render would throw. That is the exposure `style`'s foreground has carried since it shipped; at the pin every theme carries every foreground name, and a pin bump is where that is re-checked.
- Reversing this means retiring a colour from the vocabulary and returning it to `style`, with the record that replaces this one saying why.
