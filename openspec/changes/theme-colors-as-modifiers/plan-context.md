# Plan context

There is no larger plan document or Linear ticket for this change. Joel raised it in a 2026-11-24 Explore session. The sources below are neighbouring work on the same format language, listed so research neither repeats nor forecloses them.

## The brain's pi-jefferson board

Source: `🤖 Knowledge/projects/pi-jefferson.md` (brain vault).

- Doing, not yet an OpenSpec change: "Show pi's spinner while a provider reports work". From its note (`🤖 Knowledge/projects/pi-jefferson-notes/show-pis-spinner-while-a-provider-reports-work.md`): *"A provider's boolean field, named in the format as $working|spinner, drives it"*. Joel's ruling there: *"data can include bools like working = true"*. That change adds `spinner` as a new name after `|` in a format.
- Todo: "Let users compose custom instruments from variables and visualizations". Joel, 2026-11-07: *"the ability to create custom instruments from all variables and visualizations like $bar would be an added benefit"*. His example format: `$model via|dim $provider 🤔 $thinking|capitalize`.

## Earlier changes on the format language

- 0.5.0 "Variable modifiers" (2026-11-06): string mutation and styling on format variables and text.
- `openspec/changes/archive/` 2026-11-10 (instruments for every datum): variable forms such as `$path|base|absolute|relative` (ADR 0010).
- `openspec/changes/archive/2026-11-16-extensions-provide-instruments/owner-rulings.md`: other extensions provide instruments with their own formats, forms and `variableFg`. Joel: *"Anything a Jefferson instrument can do should be open to extension authors to do, as well."*
- `openspec/changes/archive/2026-11-11-notices-in-the-footer/`: a notice kind's format is plain and takes no modifier (AGENTS.md, "Adding a notice kind"; ADR 0012).
