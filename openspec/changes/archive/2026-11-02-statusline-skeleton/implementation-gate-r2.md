# Implementation gate round 2 — `statusline-skeleton`

Reviewer: Michael (retained thread, resumed). Gate: implementation, bounded re-review after my
`changes_requested` verdict in `implementation-gate.md`. Verdict: **approve** — the blocking finding
is resolved, nothing else changed, and the suite is honest. I applied the mutation myself and
restored every file byte-identically (shasum verified). Work left uncommitted.

## 1. The blocking finding — resolved, and Derek's ordering claim is correct

My finding was that step 2.5's red did not reproduce: the "compute padding from `text.length`"
mutation left the wide-glyph/ANSI test passing because the input masked it. The fix reorders the
cells to **ANSI first, emoji second** at **width 9**.

I reproduced the red myself. Applying `helpers.visibleWidth(truncated)` → `truncated.length` in
`renderRow` and running `node --test tests/row-renderer.test.ts`:

```text
✖ wide glyphs and ANSI escapes are measured in visible columns, not string length
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  + '\x1B[31mab\x1B[0m😀     '
  - '\x1B[31mab\x1B[0m  😀   '
```

A real assertion diff (7 pass, 1 fail), not a crash or a tautology. The diff is exactly the
distinction: the ANSI cell (`String.length` 12, `visibleWidth` 2) loses its two spaces mid-line, and
the line-level remainder cannot restore the byte-identical string.

**Derek's claim — that width 9 alone would not have discriminated with the original cell order — is
correct, and I verified it empirically.** I built the original-order variant (`[emoji, ANSI]` at
width 9) in a scratch copy of the test, kept the correct expected string, and applied the same
mutation: **8 pass, 0 fail**. The reason: with the under-padded ANSI cell *last*, its missing
padding merges into the trailing remainder, and the final string is byte-identical to correct
output. Only with the ANSI cell *first* does the mis-padding land before the emoji and become
observable. So the reorder is load-bearing, not incidental.

**Red reproducible: yes. Genuine discrimination: yes.** The test now fails only when the injected
`visibleWidth` is replaced by string length, and passes with the real helper; it distinguishes the
helper from `String.length` rather than merely failing.

## 2. Did anything else change?

The fix was bounded to the one test. Comparing the whole tree against my pre-fix snapshot from the
prior gate:

```text
SAME  extensions/jefferson.ts
SAME  extensions/jefferson/configuration.ts
SAME  extensions/jefferson/row-renderer.ts
SAME  tests/jefferson.test.ts
SAME  tests/configuration.test.ts
DIFF  tests/row-renderer.test.ts
```

The only difference is the wide-glyph test's input/expectation; no other test in that file or any
other file was touched (confirmed by diffing `tests/row-renderer.test.ts` against the pre-fix copy —
one hunk, the wide-glyph test only). The implementation modules, the entry, the manifest,
`tsconfig.json`, and `.github/` are untouched (`git status --porcelain -- package.json tsconfig.json
.github pnpm-lock.yaml pnpm-workspace.yaml` is empty). No test was weakened to accommodate the
change.

## 3. Is the suite still honest?

Measured on the restored, uncommitted tree:

- `npm test` → **41 tests, 41 pass, 0 fail**.
- `npm run typecheck` → **exit 0**, no output.
- `openspec validate "statusline-skeleton"` → **"Change 'statusline-skeleton' is valid"**, exit 0.

The strengthened assertion is meaningful, not a tautology: it asserts `visibleWidth(line) === 9` and
the exact string `"\x1b[31mab\x1b[0m" + "  " + "😀" + "   "`, which the correct code produces and
the mutated code does not. `git status --porcelain` is unchanged (entry + tests modified, new files
untracked); all mutated files were restored byte-identically (shasum `OK`).

## Verdict

**approve.** The blocking finding is resolved: the 2.5 red now reproduces with a real assertion
diff, the test genuinely discriminates the injected `visibleWidth` from `String.length`, and Derek's
ordering claim is confirmed (the reorder, not the width alone, is what makes it survive). The fix is
confined to one test, no implementation/manifest/`tsconfig`/`.github` file changed, no other test was
weakened, and the suite remains honest at 41/0 with typecheck and validation clean.
