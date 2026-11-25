# Spec Delta

## MODIFIED Requirements

### Requirement: The bar has its own file

Each visual under `components/visuals/` MUST live in its own source file and MUST import no other
source file of this package. A visual MUST be mixed into an instrument by a declaration field naming
the reading it needs, or by the format language placing it. Any component file and `format.ts` MAY
import a visual. The bar's drawing MUST stay in `bar.ts`, and `format.ts` MUST still parse `$bar`.
Source: Joel's bar ruling, extended by his 2026-11-10 ruling on the visual.

#### Scenario: Looking for the bar

- **WHEN** a reader looks for how the bar is drawn or for the percentage it changes colour at
- **THEN** `components/visuals/bar.ts` holds the drawing and no percentage, `format.ts` holds
  neither, and handed a fill style the drawing applies it unchanged at every percentage, so no
  percentage-to-colour choice is the visual's

#### Scenario: The bar renders as before

- **WHEN** a format containing `$bar` is resolved at any width and percentage, and the fill style is
  the one the state in force gives it
- **THEN** the filled columns and the `dim` track are the ones the drawing produced before this
  change, and only the fill's style comes from the settings: its `fg`, its `bg` and its attributes

#### Scenario: A user places the bar

- **WHEN** a format places `$bar` among prose for an instrument that declares a percent
- **THEN** it parses and draws as before, and for an instrument without one the parse error is unchanged

#### Scenario: Looking for the timed visual

- **WHEN** a reader looks for what decides a datum's visibility on the clock
- **THEN** `components/visuals/timed.ts` holds it, and neither the notice instrument nor the store
  decides visibility

#### Scenario: A visual's imports

- **WHEN** the imports of any file under `components/visuals/` are listed
- **THEN** none names another source file of this package, and a `components/` file or `format.ts`
  that imports the visual conforms
