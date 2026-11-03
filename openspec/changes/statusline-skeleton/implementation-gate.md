# Implementation gate — `statusline-skeleton`

Reviewer: Michael (retained thread, resumed). Gate: implementation. Verdict: **changes_requested** —
one blocking finding: step 2.5's claimed red does not reproduce. The implementation itself is
correct and every other check I re-ran holds. I re-ran the checks and re-applied the mutations
myself; the work is left uncommitted and byte-identical to how I found it (six-file shasum verified
after every mutation).

## What I reviewed

`git status --porcelain` and the full diff; the new `extensions/jefferson/configuration.ts`,
`extensions/jefferson/row-renderer.ts`, the `extensions/jefferson.ts` change, the
`tests/jefferson.test.ts` change, `tests/configuration.test.ts`, `tests/row-renderer.test.ts`; the
completed `tasks.md`; against `design.md` (D1–D10), `specs/statusline/spec.md`, and
`openspec/specs/extension-source-layout/spec.md`.

## 1. Does the diff implement the approved design and nothing else?

Every decision is implemented, and I saw nothing the design does not call for.

| Decision | Where in the diff | Present |
| --- | --- | --- |
| D1 source/trust/precedence | entry resolves `join(getAgentDir(), "pi-jefferson.json")` and `join(ctx.cwd, CONFIG_DIR_NAME, "pi-jefferson.json")`, passes `ctx.isProjectTrusted()`; `configuration.ts` picks project only when trusted+present, else agent | yes |
| D2 envelope + both-rejected | `normalizeDocument`: `rows` key vs `[doc]`; both → `RejectedConfiguration` | yes |
| D3 default row; rejected warns | `readConfiguration` returns `[defaultRow()]` for absent/empty/rejected; rejected returns a `warning`; entry calls `ctx.ui.notify(warning, "warning")` | yes |
| D4 clamp above 8; reject <1/non-integer | `count = Math.min(declared, MAX_CONTAINERS)` after a positive-integer check | yes |
| D5 cell-shaped model, counts-only parser | `Cell`/`Row`/`Cell[]`; parser accepts only an integer count | yes |
| D6 deterministic ids; collisions reject | `row-${index}` synthesis + uniqueness pass | yes |
| D7 `floor(W/N)` per render, remainder right | `renderRow` computes `Math.floor((width - (N-1)*GAP)/N)`, `GAP=0`; `createFooter.render` maps per call | yes |
| D8 helpers injected | entry injects `{ truncateToWidth, visibleWidth }`; `WidthHelpers` parameter | yes |
| D9 TUI-guarded, re-installed | `if (ctx.mode !== "tui") return;` and `pi.on("session_start", …)` | yes |
| D10 truncate + pad per cell | `truncateToWidth` + pad via `visibleWidth`; trailing remainder to full width | yes |

Nothing extra is present. (For the record, README still says "There is no statusline in this
package"; the design does not call for a README change, so it is out of scope for this gate.)

## 2. Re-run verification (measured, not accepted)

- `npm test` → **41 tests, 41 pass, 0 fail** (Derek's claim of 41/0 confirmed; includes the two
  original `tests/jefferson.test.ts` tests).
- `npm run typecheck` → **exit 0**, no output.
- `openspec validate "statusline-skeleton"` → **"Change 'statusline-skeleton' is valid"**, exit 0.
- Host discovery (task 4.4 command) → `count: 1`, `resolvedPath: <repo>/extensions/jefferson.ts`,
  `commands: [ 'jefferson' ]`, `errors: []`.
- Tarball guard (task 4.5, run the real `ci.yml` guard block against a real pack) → `shipping:
  LICENSE, README.md, extensions/jefferson.ts, extensions/jefferson/configuration.ts,
  extensions/jefferson/row-renderer.ts, package.json`, exit 0.

## 3. The red cases — spot-checked by applying the mutation myself

I applied each mutation, ran the named test file, and restored from backup (six-file shasum `OK`
after every restore). Reproduced (the named test actually failed):

1.2 ignore top-level shape → *a top-level row object normalizes to one row* fails.
1.3 delete the both-shapes check → *both shapes at once is rejected* fails.
1.4 clamp becomes reject → *containers above the ceiling clamps to 8* fails.
1.5 coerce `"4"` with `Number(...)` → *containers given as a string is rejected* fails.
1.6 module-level counter synthesis → *an unnamed row gets a synthesized deterministic id* fails.
1.7 always read the project file → *an untrusted project document is ignored* fails.
1.8 push a string instead of a `Cell` → *every cell is a Cell object…* fails.
2.2 `Math.floor` → `Math.ceil` → *a width that does not divide evenly…* fails.
2.3 cache `cellWidth` in a module variable → *cell widths are recomputed when the width changes* fails.
2.6 `createFooter` returns `rows.slice(0, 2)` → *the footer renders one line per row…* fails.
2.7 return `cells.map(...)` → *more cells than columns still renders exactly one line* fails.
3.1 remove `on` from the fake → `TypeError: pi.on is not a function` observed.
3.3 remove the TUI guard → *does not install a footer outside TUI mode* fails.
3.3 force `projectTrusted: true` → *an untrusted project's document is ignored end to end* fails.
3.4 remove the `notify` call → *a rejected configuration warns…* fails.

**Not reproduced — blocking:** see the finding below (2.5).

## 4. The settled constraints — all hold

- Only `extensions/jefferson.ts` holds a runtime import of `@earendil-works/*` (entry imports
  `CONFIG_DIR_NAME`/`getAgentDir` and `truncateToWidth`/`visibleWidth`); `rg '@earendil-works'`
  in `extensions/jefferson/` finds nothing. `row-renderer.ts` uses `import type { Row }`;
  `configuration.ts` imports only `node:fs`.
- Width helpers cross the boundary by injection (`WidthHelpers` parameter), confirmed in the entry.
- Cell widths are `floor(W / N)` recomputed inside `render(width)`; no `HStack`/`Stack`/
  `allocateStackSizes` appears anywhere in `extensions/`.
- Footer registration is TUI-guarded and re-installed on every `session_start`.
- Project-local configuration is gated on `ctx.isProjectTrusted()` (entry passes it; reader honors it).

## 5. Untouched as required

`git status --porcelain -- package.json tsconfig.json .github pnpm-lock.yaml pnpm-workspace.yaml`
is empty — the manifest, `tsconfig`, and all of `.github/` are unchanged, confirmed from the diff,
not the report. `tests/jefferson.test.ts` is modified but its two original tests still pass.

## 6. Coding standards

Erasable TypeScript only: no `enum`, no `namespace`, no decorators, no parameter properties
(grepped). No build step and no manifest edit. New tests live under `tests/`, outside the load path;
`extensions/` ships only the entry and the two working-parts modules.

## Blocking finding

**Step 2.5's claimed red is not reproducible.** 2.5 says: "temporarily compute padding from
`text.length` instead of the injected `visibleWidth` … confirm the wide-glyph/ANSI test fails." I
applied exactly that mutation (`helpers.visibleWidth(truncated)` → `truncated.length` in `renderRow`)
and ran `node --test tests/row-renderer.test.ts`: **8 pass, 0 fail** — the wide-glyph/ANSI test does
not fail. The test cannot catch the mutation because its input masks it:

- The row is 2 cells at width **8**, so `cellWidth = 4` and the remainder is **0**. With per-cell
  padding wrong, the ANSI cell (`"\x1b[31mab\x1b[0m"`, `length`/visibleWidth 12) is under-padded,
  but the emoji cell (`"😀"`, length 2 = visibleWidth 2) is unaffected and the line-level remainder
  — still computed with the injected `visibleWidth` — re-adds the missing columns, so the final
  string is byte-identical to the expected one.
- Mutating the *other* `visibleWidth` use (the trailing `width - visibleWidth(line)`) is inert here
  too, because the correct per-cell padding already fills the line and the remainder is 0. Only a
  mutation of *both* uses makes the test fail.

So the wide-glyph/ANSI test does not discriminate `visibleWidth` from `String.length` for the
inputs chosen, and the red is a certificate. This is the one class the gate treats as blocking (a
red claimed but not reproducible). Required change: give the test an input where the distinction
survives — e.g. 2 cells at width **9** (`cellWidth = 4`, remainder 1) so the wrong padding changes
the final string — or assert per-cell output boundaries directly; then re-run the mutation to show
the named test fails.

## Verdict

**changes_requested.** The diff implements D1–D10 and nothing else; all measured checks pass
(41/0, typecheck 0, openspec valid, discovery count 1, guard exit 0); every settled constraint
holds; the manifest/`tsconfig`/`.github` are untouched; erasable syntax and test placement are
correct; and 15 of the 16 mutation reds I applied reproduce. The exception is step 2.5, whose red
does not reproduce, which blocks the gate. The implementation behavior is correct — the finding is
that the 2.5 check cannot fail and therefore cannot certify what it claims.
