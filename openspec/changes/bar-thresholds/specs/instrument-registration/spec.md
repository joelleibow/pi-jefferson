# Spec Delta

## ADDED Requirements

### Requirement: A faulting bar is unknown, and blanks only a drawn bar

A provided `bar` that throws, returns a promise, or returns a non-finite number or a non-number MUST
be unknown, MUST be reported once per session, and MUST count as 0 when a threshold's state is
chosen. The entry MUST blank, label included, only when the format of the state in force names
`$bar`; otherwise that state MUST render. Source: `owner-rulings.md`, 2026-11-25 ("unknown is always
0"); ADR 0020; `council.md`.

#### Scenario: A bar that faults where no bar is drawn

- **WHEN** a provider that opted in has a `bar` returning `"50"`, its settings carry a threshold whose
  state at 0 gives the format `$saved`, and `saved` is reported
- **THEN** the entry renders `$saved`, and the fault is reported once

#### Scenario: A throwing bar counts as 0

- **WHEN** a provided `bar` throws, the settings carry thresholds at 0 and 50, and the state at 0
  gives a format naming no `$bar`
- **THEN** the state at 0 applies, the entry renders it, and the fault is reported once

### Requirement: A state is chosen inside a provided instrument's boundary

A throw that escapes a provided instrument's adapter while its state is chosen MUST cost only that
entry: the entry MUST render nothing in the top-level settings' geometry, one fault MUST be reported,
and the row, every other row and pi MUST keep rendering. Source: `council.md`, the containment row;
statusline, "A threshold's format decides whether the instrument fills".

#### Scenario: A throw that escapes while the state is chosen

- **WHEN** a provided `bar`'s result has a `then` getter that throws, under thresholds that change the
  format
- **THEN** that entry renders nothing, takes the top-level settings' geometry, one fault is reported,
  and every row renders

## MODIFIED Requirements

### Requirement: Provider code costs one entry and no more

A function a provider supplies that throws, or returns a value outside its declared result type, a
promise included, MUST cost only that entry: a resolver, a form or a `bar` blanks it, label included,
a select composes nothing, a composed value renders nothing in its place, and a colour falls back to
the entry's style. Its geometry, the row and every other row MUST render, and pi MUST keep running.
Jefferson MUST wrap a provided instrument's render, not its own. The next render MUST try again.

#### Scenario: A resolver that throws

- **WHEN** a provider's resolver throws and the host renders the footer
- **THEN** that entry renders nothing, the rest of the row renders as configured, and the footer keeps
  one line per row

#### Scenario: A resolver that returns a promise

- **WHEN** a provider's resolver returns a promise, rejected or not, instead of text
- **THEN** that entry renders nothing, and pi keeps running

#### Scenario: A resolver that returns a number

- **WHEN** a provider's resolver returns a number where its declaration says text
- **THEN** only that entry loses its text, and no row fails

#### Scenario: A resolver that returns nothing

- **WHEN** a provider's resolver returns `undefined`, as a declaration's own type allows
- **THEN** that variable reads as unknown, and no fault is reported

#### Scenario: A bar that returns text

- **WHEN** a provided `bar` returns `"50"` or a non-finite number, and the format in force names
  `$bar`
- **THEN** the entry renders nothing, and the fault is reported once

#### Scenario: A colour the theme does not have

- **WHEN** a provided colour resolver names a token the theme does not have
- **THEN** the variable renders in the entry's style, and the fault is reported once

#### Scenario: A bar below zero

- **WHEN** a provided `bar` returns a negative fraction
- **THEN** the track draws unfilled, and no fault is reported
