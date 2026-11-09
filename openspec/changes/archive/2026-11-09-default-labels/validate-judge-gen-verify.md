## Verification Report: default-labels

Head reviewed: `ac46b24ae095760a98c6f50e574cc31060346aa5` (branch `default-labels`, clean working tree).
Using change: `default-labels` (schema spec-driven; artifacts proposal, specs/statusline, design, tasks all read).

### What I ran
| Command | Output |
|---|---|
| `pnpm typecheck` | `tsc --noEmit`, no diagnostics, exit clean |
| `pnpm test` | `tests 317 / pass 317 / fail 0 / skipped 0` |
| `openspec validate default-labels --strict` | `Change 'default-labels' is valid` |
| `openspec validate --specs --strict` | 3 passed, 0 failed (extension-source-layout, session-data-store, statusline) |
| `git diff --stat main...HEAD -- extensions` | only `extensions/jefferson/visuals/instrument.ts`, 6 insertions, 1 deletion |
| Char count of the 9 requirement paragraphs in the delta (task 7.1 check) | 443, 497, 336, 485, 497, 345, 477, 371, 446, all under 500 |

### Summary
| Dimension | Status |
|---|---|
| Completeness | Groups 1–4 all ticked (every checkbox in 1.1–4.4). 4 unticked as expected: 6.1 (Joel's live observation), 7.1–7.3 (sync/archive). 7.1's measurement already holds (see above). |
| Correctness | 9/9 ADDED and MODIFIED requirements covered (1 ADDED, 5 per-instrument MODIFIED, 3 format/modifier/bar MODIFIED that only add `label: ""` to WHENs). All scenarios backed by code and a passing test. No REMOVED or RENAMED. |
| Coherence | Design followed (D1–D7). No contradictions. |

### Completeness
- Tasks 1.1–1.8, 2.1, 3.1–3.7 and 4.1–4.4 are ticked, and the evidence holds. The 8 new checks sit at `tests/configuration.test.ts:740–805`. The full suite is 317, matching 309 + 8. Production change is exactly the 6+/1− in `instrument.ts`, with no change to binding, format or layout (4.4).
- Unticked and expected: 6.1, 7.1, 7.2, 7.3.
- Docs: README table gained a Default label column (`README.md:103–111`). The "Only `thinking`…" sentence is replaced. The upgrading note covers the configured-format case, `format: ""` and `model`'s format (`README.md:128–138`). I found no stale `$provider: $model` or unlabelled example elsewhere in README, ARCHITECTURE or `docs/adr`. The only remaining `anthropic: claude-opus-4` is the deliberate restore instruction (`README.md:137`).

### Correctness: requirement mapping
- ADDED "A shipped instrument's default label renders as a configured label does": the code is the unchanged `instrument-binding.ts:26` (`entry?.label ?? declaration.defaultLabel`). `blank` has no `defaultLabel` (`instrument.ts` blank block untouched). Scenario tests: `configuration.test.ts:740` (default in front of default format, incl. null estimate `Context: ?/200k`), `:793` (`$path!`), `:799` (`format: ""`), `:768` (unknown datum), `:784` (blank), `:748`/`:760` (replace / `""`). The thinking-template scenario was already covered and its declaration is untouched.
- MODIFIED model: `instrument.ts:50–55` is `defaultFormat: "$provider/$model"` with `defaultLabel: "Model:"`. Row test `configuration.test.ts:805`, plus the flipped jefferson/configuration tests.
- MODIFIED path, context, tokens, cost: `instrument.ts:74–112` carry `Path:`, `Context:`, `Tokens:`, `Cost:`, and the text matches each scenario (`Path: pi-jefferson`, `Context: 43.2%/200k`, `Tokens: 0`, `Cost: $0.123`/`$0.000`).
- MODIFIED format / modifier / bar requirements: I diffed each delta block against the living spec in `openspec/specs/statusline/spec.md`. The only differences are `label: ""` added to the 7 WHENs named in design D7. Nothing else drifted, so the sync won't lose any text.
- The paragraph lengths are under 500. No delta requirement is contradicted by untouched living text: the living `thinking` requirement and the living label scenarios (`spec.md:403–408`, `:1089–1106`) remain true.

### Coherence
- D1 (five fields, no trailing space), D2 (format change), D3 (blank unlabelled), D4 (widths, pinned by the 80-column row test), D5 (tests through bindings; the `render()` helper tests only flipped for the format), D6 (README, no ADR) and D7 (fixtures `label: ""` and the widened rule on the four replacement tests, `jefferson.test.ts` ~:656) all match the diff.
- Code pattern: declarations follow `thinking`'s own `defaultLabel` pattern, with field order unchanged. Nothing deviates.

### Issues
**CRITICAL:** none.

**WARNING:** none.

**SUGGESTION**
1. Cosmetic: `design.md` lists decisions in the order 1,2,3,4,5,7,6. Renumber or reorder at archive time if it matters. No functional effect.
2. `proposal.md` and `design.md` cite `tests/...:line` numbers from Derek's run (e.g. `:60`, `:580`, `:940`). They have shifted after the new checks went in. Harmless, since the tasks say Implement re-finds them. Don't treat the numbers as a lookup on the final branch.

### Final assessment
No critical issues or warnings. 2 suggestions to consider. The only unticked tasks are 6.1 (Joel's live observation) and 7.1–7.3 (sync and archive), which this pass expects to be open. 7.1's measurement already passes. Ready for 6.1, then sync and archive.

Not verified: 6.1, Joel's live observation in pi. I did not run pi or look at a real footer; the code and tests give no evidence on how it looks live.
