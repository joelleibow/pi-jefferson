## Verification Report: 2026-11-06-default-thinking-instrument

Using change: `2026-11-06-default-thinking-instrument`. Implementation head: `99ea84e` on `worktree/calm-forest-5599`
(`91efcee` docs, on top of `v0.5.0` = `e593968`). Working tree was clean when I started.

### Commands run (actual output)

| Command | Result |
| --- | --- |
| `openspec validate "2026-11-06-default-thinking-instrument" --strict` | `Change '2026-11-06-default-thinking-instrument' is valid` |
| `openspec instructions apply --change … --json` | state `all_done`, progress 21/21, remaining 0, `taskTrackingConfigured: true`, no unavailable tracking files |
| `pnpm typecheck` | `tsc --noEmit`, exit 0, no diagnostics |
| `pnpm test` | tests 243, pass 243, fail 0, cancelled 0, skipped 0 |
| `git diff v0.5.0 HEAD --stat -- package.json pnpm-lock.yaml` | empty |
| `git grep -n getThinkingBorderColor extensions/` | no match |
| `git grep -n collapse extensions/` | defined `format.ts:40`; imported only by `configuration.ts:15`, used at `:83`; the other uses are in `format.ts` |

### Summary

| Dimension    | Status |
| --- | --- |
| Completeness | 21/21 tasks; 3 requirements (2 ADDED, 1 MODIFIED), all with implementation found |
| Correctness  | 3/3 reqs covered; 21/21 scenarios have a test or the code path that handles them. Task-level mutation checks were not re-run (see Not checked) |
| Coherence    | Design D1–D8 followed; 1 suggestion, 1 scope note |

### Completeness

- **Task completion:** 21 of 21 complete, 0 remaining.
- **Spec coverage:**
  - ADDED "An instrument's label is placed in front of its format": `FOUNDATIONAL_OPTIONS` gains `"label"` (`instrument.ts:24`). `readInstruments` rejects a non-string label, naming the instrument (`configuration.ts:127-130`). `instrumentBindings` prepends a collapsed leading literal segment (`configuration.ts:83-85`).
  - ADDED "The thinking level takes the color of the input box's thinking rules": `variableFg` on the declaration (`instrument.ts:19`, `:52-63`) and the per-segment token in `resolveFormat` (`format.ts:205-211`).
  - MODIFIED "The thinking instrument": `defaultLabel: "Thinking: "`, `defaultFormat: "$level|capitalize"` (`instrument.ts:60-62`).

### Correctness

Requirement to scenario mapping (code, then test in `tests/configuration.test.ts` unless noted):

| Scenario | Evidence |
| --- | --- |
| Label before configured format / default format | `configuration.ts:83-85`; "a configured label is placed in front of a configured format and a default format" |
| Unknown datum suppresses label | guard in `resolveFormat` runs before any segment is styled; "an unknown datum suppresses the whole cell, label included" |
| Empty format leaves label | "a known datum with an intentionally empty format renders the label alone" |
| `$` in a label; `$label` not a variable | label never reaches `parseFormat`; "a label is literal text, never a variable and never parsed" |
| Control characters | `collapse` at `configuration.ts:83`; "a label's control characters each become one space…" |
| Label takes style / takes width from a bar | leading literal goes through `styledPiece` and the `nonBar` sum; "the label takes the instrument's configured style", "the label's width reduces what the bar has left" |
| Label not a string | `configuration.ts:127-130`; "a label that is not a string rejects the document…" |
| Level changes / every level / theme changes | `THINKING_FG` has seven entries; token resolved in `render` from the passed theme; `tests/instrument.test.ts` "every thinking level renders…", configuration "the level's token resolves against the theme passed to each render" |
| Configured fg / bg and attributes / text outside level | token spread last (`format.ts:210`), `merged` kept otherwise; tests "a configured foreground does not beat…", "…background and boolean attributes survive…", "only the level segment is recolored" |
| Default thinking cell / changes / configured label / restored / unknown | "with a level and nothing configured…", "a configured label replaces the default label", `tests/jefferson.test.ts` "the thinking cell follows the host through the label path", existing "unknown thinking renders nothing" |

All pass in the 243-test run. Implementation matches the requirement text; no divergence found.

### Coherence

- **Design adherence:**
  - D1 followed: `defaultLabel` and `variableFg` have the declared shapes; `label` is a foundational option.
  - D2 followed: the label bypasses `parseFormat`, and `collapse` is exported and called once.
  - D3 followed: `resolveFormat` keeps its six-parameter signature, and the label is a leading literal segment.
  - D4 followed: no separate label style.
  - D5 followed: the token is looked up from the unmutated value (`values.get`), spread last, and `getThinkingBorderColor` is not called.
  - D6 followed: `package.json` and the lockfile are untouched.
  - D7 followed: HEAD descends from `v0.5.0`.
  - D8: every row has a matching test.
- **Code pattern consistency:** the changes follow existing conventions (`.ts` imports, erasable TypeScript, frozen options, errors via `RejectedConfiguration`). `AGENTS.md` and the `ARCHITECTURE.md` description of the instrument are updated consistently with the code.

### Issues by Priority

**CRITICAL:** none.

**WARNING:** none.

**SUGGESTION**

1. **Inherited property names defeat the "level outside the seven" rule.** `THINKING_FG[level]` (`instrument.ts:53-63`) is a plain object. I ran `variableFg.level("toString")` and `("constructor")`, and both return a function, not `undefined`. D5 says an unrecognized level yields `undefined`, so the instrument keeps its own style. A host sending such a level would pass a function as `fg` to `theme.style`. Pi does not do this today, so the risk is low. Recommendation: declare the table with a null prototype, or look up with `Object.hasOwn(THINKING_FG, level) ? THINKING_FG[level] : undefined`. A `ultra`-style test already exists, so one added `toString` case would pin it.
2. **Scope note: docs landed in this change.** `tasks.md` and `design.md` say the README is left to a docs pass, but commit `91efcee` edits `README.md`, `ARCHITECTURE.md` and `AGENTS.md`. The content is accurate and matches the code, including the upgrade note for configured `thinking` formats. This is not a defect, but `tasks.md` 6.1 lists only `extensions/` and `tests/` files as the diff, so its stated file list is now out of date. Either note the docs in `tasks.md` or accept the deviation at archive.

### Final Assessment

No critical issues or warnings. 2 suggestions to consider. Ready for archive (with noted improvements), subject to the `Not checked:` line below.

Not checked: I did not re-run the guard tasks' mutation checks (for example 3.2, 3.3, 5.2, 5.7), so I rely on the green suite and on reading the code that each guard test exercises. I did not run the extension in a live pi session, so the color match against the real input-box rule and a real theme switch rest on the fake theme and pi's documented token route. I did not verify that `v0.5.0` is the published release (npm/tag) beyond HEAD descending from `e593968`.
