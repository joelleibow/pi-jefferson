# Research Report

## Question and Scope

Repository reconnaissance for `default-labels`, limited to the label declaration/binding/render/layout path, current output of all seven shipped instruments, Joel's live configuration, exact-text tests, baseline checks, README inventory and archived thinking rulings. No design or label-text recommendation is made.

## Sources / Files Examined

- `/tmp/dl/brief-common.md`; current change `owner-rulings.md`.
- `AGENTS.md`, `ARCHITECTURE.md`, `package.json`, `README.md`.
- `extensions/jefferson/visuals/instrument.ts`, `instrument-binding.ts`, `format.ts`, `row-renderer.ts`, `row.ts`, `width-plan.ts`; `extensions/jefferson/configuration.ts`.
- `tests/instrument.test.ts`, `tests/configuration.test.ts`, `tests/format.test.ts`, `tests/row-renderer.test.ts`, `tests/jefferson.test.ts`, `tests/fake-theme.ts`.
- `~/.pi/agent/pi-jefferson.json` (read only).
- `openspec/changes/archive/2026-11-06-default-thinking-instrument/owner-rulings.md`; `openspec/changes/archive/2026-11-07-label-gap/owner-rulings.md`; `docs/adr/0006-a-label-gets-one-gap-and-outer-whitespace-is-not-text.md`; `docs/adr/0007-a-cell-takes-the-width-its-content-needs.md`; relevant statusline living spec.
- `openspec instructions research --change default-labels --json` supplied the report template.

## Findings

### Label path

- `InstrumentDeclaration.defaultLabel` is declared at `extensions/jefferson/visuals/instrument.ts:16-24`. `thinking` alone sets `defaultLabel: "Thinking:"` at line 68; shipped declarations are assembled at lines 83-85. `blank`, `model`, `path`, `context`, `tokens`, and `cost` have no default label.
- Configured label parsing/validation is in `extensions/jefferson/configuration.ts:59-99`: a supplied `label` must be a string, then the entry is included in the configured map. `extensions/jefferson/visuals/instrument-binding.ts:26` selects `entry?.label ?? declaration.defaultLabel ?? ""`; thus an explicit empty string takes precedence over the declaration default. It collapses controls and trims the selected value there. `:27-29` adds a one-space gap only when the trimmed label and parsed format segments are both nonempty; a blank label (`""` included) produces no label and no gap. The literal label plus gap is prepended to format segments.
- `resolveFormat` in `extensions/jefferson/visuals/format.ts:177-193` resolves every declared variable first and immediately returns `""` if any is undefined. Consequently the label is suppressed along with content whenever any datum declared by that instrument is absent; a label does not render over nothing. For known datums, segments render at `:206-213`.
- For `$bar`, `format.ts:197-205` calculates non-bar visible columns from all pieces, then subtracts them from cell width. Because the binding inserted the label and gap as leading format segments, both count against the bar width. `instrument-binding.ts:32` marks cells filling when declaration says fill or format segments contain a bar.
- Layout uses rendered width-zero text as the content basis per `AGENTS.md` and `ARCHITECTURE.md` row-renderer description; `row-renderer.ts` obtains the cell's text and passes widths into `width-plan.ts`. README states content sizing includes label (`README.md:31-36`). ADR 0007 records the content-sized default. A label therefore increases the measured cell's basis (visible columns), can change its allocated cell width and neighbour joint; the ordinary non-filling text itself does not depend on width. A `$bar` cell is a fill cell; label/gap occupy fixed columns and reduce bar's available width as above.
- Format outer whitespace is collapsed/trimmed by `format.ts:39-40`; label outer whitespace/control treatment is in binding above. The gap is embedded in the label segment and styled with it, as documented in `ARCHITECTURE.md` Instrument paragraph and ADR 0006.

### Current no-configuration output probe

Used the shipped test helpers (`fakeTheme`, `readConfiguration`, `createFooter`) with a JSON scratch configuration in a newly created OS temp directory: one named instrument per row, width 80, no instrument configuration. This did not read or alter Joel's file. Representative readings were provider `anthropic`, model `claude-opus-4`, level `high`, cwd `/Users/joelleibow/Projects/pi-jefferson`, context `{tokens:86400, percent:43.2, contextWindow:200000}`, totals `{input:118,output:59,cacheRead:23,cacheWrite:12,cost:0.123}`. Absent datum case set all instrument datum(s) to `undefined`. Probe source: one-line `node --experimental-strip-types --input-type=module -e` script; it JSON-stringified `footer.render(80)[0]` for each config and each reading case. Footer lines include pi-tui's framing ANSI/OSC sequences and width padding.

Exact `JSON.stringify` lines (terminal framing retained):

| Instrument | Representative reading | Absent datum |
|---|---|---|
| blank | `"\u001b[0m\u001b]8;;\u0007Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor  \u001b[0m\u001b]8;;\u0007"` | same |
| model | `"\u001b[0m\u001b]8;;\u0007anthropic: claude-opus-4                                                        \u001b[0m\u001b]8;;\u0007"` | `"\u001b[0m\u001b]8;;\u0007                                                                                \u001b[0m\u001b]8;;\u0007"` |
| thinking | `"\u001b[0m\u001b]8;;\u0007Thinking: \u001b[94mHigh\u001b[39m\u001b[0m                                                                  \u001b[0m\u001b]8;;\u0007"` | `"\u001b[0m\u001b]8;;\u0007                                                                                \u001b[0m\u001b]8;;\u0007"` |
| path | `"\u001b[0m\u001b]8;;\u0007pi-jefferson                                                                    \u001b[0m\u001b]8;;\u0007"` | `"\u001b[0m\u001b]8;;\u0007                                                                                \u001b[0m\u001b]8;;\u0007"` |
| context | `"\u001b[0m\u001b]8;;\u000743.2%/200k                                                                      \u001b[0m\u001b]8;;\u0007"` | `"\u001b[0m\u001b]8;;\u0007                                                                                \u001b[0m\u001b]8;;\u0007"` |
| tokens | `"\u001b[0m\u001b]8;;\u0007212                                                                             \u001b[0m\u001b]8;;\u0007"` | `"\u001b[0m\u001b]8;;\u0007                                                                                \u001b[0m\u001b]8;;\u0007"` |
| cost | `"\u001b[0m\u001b]8;;\u0007$0.123                                                                          \u001b[0m\u001b]8;;\u0007"` | `"\u001b[0m\u001b]8;;\u0007                                                                                \u001b[0m\u001b]8;;\u0007"` |

`blank` is a fill placeholder and does not consult readings. For the other six, if a declared datum is undefined, the rendered content is empty and there is no label or gap. This is directly established by `resolveFormat`'s early return and current label scenarios in tests/spec.

### Joel's live configuration

Read `/Users/joelleibow/.pi/agent/pi-jefferson.json`; not edited. Explicit labels: `path` (`📂`), `model` (`🧠`), `thinking` (`🤔`), `context` (`🔋`). These four replace any defaults. `blank` is configured with format `""` but no label: it has no declared default label today, and would inherit one if introduced. `tokens` and `cost` are not configured and would inherit newly declared defaults. Current rows use path/model/thinking in row one and two blanks/context in row two.

### Exact-text tests affected by labels

The following assertions pin exact unlabelled output; line references are current repository line numbers:

- `tests/instrument.test.ts:67-71` declaration defaults; `:74-78` every default format exact output; `:84-86` blank exact output; `:90-92` model/thinking exact output; `:111-116` model/path/context/tokens/cost exact output; `:120-123` model unknown/empty-value outputs; `:130` thinking unknown output; `:140-141` output for context/tokens custom formats; `:146-149` context/cost text; `:153-160` context outputs including empty unknown; `:167-168` path results; `:174-181` tokens/cost outputs including absent empty string.
- `tests/format.test.ts:311-321` model variable and formatted text; `:327-329`, `:339-343` model format exact strings; `:105` model leading-format text. These are direct `resolveFormat` format-language tests rather than bound default instrument output, so default-label behavior should not be inferred to apply to them unless routed through binding.
- `tests/configuration.test.ts:765` exact default thinking output is labelled already. Exact label/no-label behavior is covered around `:565-?` (configured-label tests; see test titles at line output from test run), notably test names “an unknown datum suppresses the whole cell, label included”, “unknown datum leaves no label and no lone gap”, and “empty format leaves the label alone”.
- `tests/jefferson.test.ts:719-720` composes path/model/thinking expected texts; it uses explicit test formats/configuration and may require checking its fixture before treating it as affected.
- `tests/row-renderer.test.ts:601` uses literal text `path`/`model`, not shipped instruments; not affected solely by default declarations.

Relevant broad exact-output assertion in `tests/instrument.test.ts:74-78` includes blank/model/path/context/tokens/cost and should be revisited for any instruments newly labelled. Existing test helper `render` directly calls `resolveFormat`, so those checks do not bind labels; footer/binding-level expectations must be updated if default labels change actual footer output.

### Baseline checks

- `pnpm typecheck`: passed (`tsc --noEmit`).
- `pnpm test`: passed, 309 tests; 309 pass, 0 fail/cancelled/skipped/todo.

### README and archived rulings

- README instruments/defaults table is `README.md:103-112` (header at 103, rows through 111/112).
- Archived `openspec/changes/archive/2026-11-06-default-thinking-instrument/owner-rulings.md` says why thinking got a label:
  - Default composition, line 23: “To me, this breaks down as a label followed by the $level. In my case I've set label to "🤔". The default label should just be "Thinking: " The text that follows that is always $level|capitalize.” It continues that `$level` should use the same color as the thinking HRs on the input box.
  - Label option, line 27: “The label option should be added for all instruments and behave this way for all instruments. Always in front of format, including its default.” The ruling says no label variable because it would be abused.
  - Earlier objective, line 11, frames the ask as better defining the default thinking instrument's appearance and behavior; scope selection says “Shipped thinking cell” at line 19.

## Assumptions, Differences, and Unknowns

- The scratch rendering captures full host framing, including ANSI/OSC and padding, not just stripped visible text; that is intentional because the brief requested `JSON.stringify` of the line.
- Several `tests/instrument.test.ts` helpers bypass binding and therefore test format output rather than the user-visible label path. The exact footer and configuration tests are the more direct compatibility evidence for a default-label change.
- The request's phrase “every test that asserts exact rendered text” can include a very large number of custom-format unit tests. The report separates shipped default output assertions from lower-level custom-format outputs and identifies fixtures whose custom configuration may avoid the new defaults; confirm by inspecting each test's setup before changing expectations.
- No label texts are ruled for model, tokens, or cost per current owner rulings; this report makes no recommendations.
