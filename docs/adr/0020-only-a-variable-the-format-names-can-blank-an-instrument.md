# 20. Only a variable the format names can blank an instrument

Date: 2026-11-16
Status: Accepted. Retires the statusline rule that an unknown declared datum blanks the cell whatever the format is, and it overrules council ruling M18.

## Context

An instrument blanked whenever any variable it declares resolved `undefined`, including variables the user's format does not name. `resolveFormat` resolved every declared variable, and this behaviour predates this change.

For example, taiknr declares `$saved` and `$stubs`, the user's format is `"$saved"`, and `stubs` has not been reported yet: the whole instrument showed nothing. A provider's unrelated field silenced an instrument that shows something else.

Joel read that and said: *"That's a bug. Not every variable provided has to be consumed. It doesn't matter if it's in format or not. If the extension provides it the it's the extensions responsibility to provide updates. Whether someone is using it or not should have no bearing on the rendering of instruments that use other provided variables."*

## Decision

- **Only the variables a format names can blank its instrument.** A declared variable the format does not use is not resolved for that render and has no effect. This applies to Jefferson's own instruments and to provided ones alike.
- **A named variable that is unknown blanks the instrument**, label included, `$bar` among them. A format that names no variable is never blanked, so it shows its label and its literal text.
- **`$bar` keeps its two absent values.** It returns `undefined` for an unknown datum, which blanks a `$bar`-only `context` cell with no usage; it returns `null` for a known usage with no estimate, which draws the dim track and keeps `?/<window>`.
- **The composed path renders nothing when there is nothing to compose**, so the 2026-11-11 silencing of an absent notice no longer depends on the format naming `$notice`.

## Alternatives weighed and not taken

- **Keeping the every-variable rule and asking providers to declare only what they show.** It pushes a rendering rule onto the author, and Joel named the behaviour a bug.
- **Blanking `$bar` on `null`.** The living context requirement says a null estimate draws its whole track unfilled in `dim` and keeps `?/<window>`, and the host's own footer does the same.

## Consequences

- A format that names no variable shows its label and its literals, whatever the instrument's other data do.
- A provider may declare a field it reports rarely without silencing an instrument that never shows it.
- The per-instrument requirements that restated unconditional blanking are edited to name the variables their formats name, so the rule lives in one requirement.
