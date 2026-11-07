# Tasks

Ordered by dependency: the dependency and its vocabulary, then one modifier end to end, then the
pipe cases, then plain text, then the guards, then the string mutations, then the two orders
`design.md` says are forced, then the document path. Each group lands the tests its own work calls
for; there is no final testing group, and no task asserts behaviour a later task builds.

Notes for the writing session:

- The approved design is `design.md` (D1-D10) and the contract is `specs/statusline/spec.md`. Where
  this file says "as D5 says", the design decides; do not decide it again.
- Tests live in `tests/` and run under `node --test` against the source, with no build step. The
  fake theme in `tests/fake-theme.ts` is the boundary double for `theme.style()`; lodash is a real
  dependency and is never faked.
- No task adds a use case, an adapter or an entry point, and no artifact in this change names a
  logging surface in `extensions/jefferson/`, so there is no logging task. The error handling is the
  three rejections in D5, each with its own task (1.2, 5.1, 5.2), plus the document-path check
  (8.1).
- Markdown documentation is not a task: the ADR that retires "the format language MUST NOT apply a
  style" and the README's `|`, `\|` and `\$` text are the docs pass, after the implementation gate.
- A task whose value is catching a mistake carries a mutation check: make the mistake, watch the
  test fail, put it back.
- Tick a box only when its verification ran green. Ask the conductor before deciding anything these
  artifacts leave open.

## 1. The dependency and the modifier vocabulary

- [x] 1.1 Add a new top-level `dependencies` key to `package.json` with `"lodash-es": "^4.18.1"`,
      add `"@types/lodash-es": "^4.17.12"` to `devDependencies`, run `pnpm install`, and commit the
      rewritten `pnpm-lock.yaml` in the same change (D1, D2). Declare no other types package.
      **Verify:** `pnpm install --frozen-lockfile` exits 0 on a clean checkout — it fails until the
      lockfile lands, so it is this task's red. **Boundary:** none; the verification is these
      commands, not a test. Nothing here yet proves the types resolve: no source file imports
      `lodash-es` until 1.2, and that task carries the proof.

- [x] 1.2 Add the table of nine modifiers to `extensions/jefferson/format.ts` and make `parseFormat`
      resolve a name through it. The six style entries derive from
      `StyleAttribute = Exclude<keyof ThemeStyle, "fg" | "bg">`; `capitalize`, `upper` and `lower`
      map to `upperFirst`, `toUpper` and `toLower`, imported by name from `lodash-es` (D1, D3). The
      table carries D4's comment naming the `capitalize`/`upperFirst` collision. A scanned name is
      resolved with `MODIFIERS.get`, the `Modifier` is stored on the segment, and an `undefined`
      result throws the unknown-name message (D3, D5). `MODIFIERS` stays module-private: no test
      imports it and `format.ts`'s exports do not change. **Test first, in
      `tests/format.test.ts`,** with no new export:

      ```ts
      const ATTRIBUTES = {
        bold: true, dim: true, italic: true, underline: true, inverse: true, strikethrough: true,
      } satisfies Record<Exclude<keyof ThemeStyle, "fg" | "bg">, true>;
      ```

      The `satisfies` clause fails `pnpm typecheck` the day `ThemeStyle` gains an attribute, which
      is D3's purpose for this test. For each of its keys, and for `capitalize`, `upper` and
      `lower`, `parseFormat(named("model"), "$model|<key>")` does not throw — parsing only, since
      attaching and applying come in 2.1. And `parseFormat` throws `"model"'s format names a
      modifier it does not implement: "|bd"` for the format `$model|bd` — case 1, so only the
      unknown-name guard can fire, and it renders `claude-opus-4|bd` today, so that assertion
      starts red. **Verify:** every assertion passes; `pnpm typecheck` exits 0 with
      the `lodash-es` import in `format.ts` and `@types/lodash-es` the only declared types package,
      which is where D2's claim that `@types/lodash` arrives transitively is proved; and a search
      of `extensions/jefferson/` finds no modifier name outside `format.ts` (spec, "A name carried
      in two places"; "One vocabulary for styling"). **Boundary:** `|accent` and `|fg` are unknown
      names too (spec, "A color is not a modifier"); a modifier written after an undeclared `$nope`
      reports the variable, not the modifier, because the scan finishes the variable first (D5).

## 2. One modifier, end to end on a variable

- [x] 2.1 A modifier after a variable's name attaches to that variable segment and is applied inside
      the segment's single `theme.style()` call (D5 case 1, D7). Merge the segment's style modifiers
      into the instrument's style, writing only `true`, then make one call.
      **Test first**, reusing 1.2's `ATTRIBUTES`: for each of its keys,
      `rendered("model", "$model|<key>")` equals one `fakeTheme().style` call on `claude-opus-4`
      with `{ [key]: true }`; `$model|bold` renders `claude-opus-4` bold (spec, "A modifier on a
      variable"), with exactly one `\x1b[1m` in the output; and with `style: {"bold": false}` and
      the same format the cell still renders bold (spec, "A modifier over an attribute set off").
      Those three are red until the modifier attaches and merges. The fourth, `$model|dim` over
      `style: {"bold": true}` carrying exactly one `\x1b[22m`, is green until the merge is written
      as a second call, which is what the mutation check catches. **Verify:** all four pass.
      **Mutation check:** apply the modifiers as a second `theme.style()` wrap and watch the
      `\x1b[22m` count fail with two — that is D7's whole claim. **Boundary:** case 1 must not
      reach D5's nothing-to-modify guard; after a variable the literal buffer is empty, and that
      emptiness is not an error.

- [x] 2.2 A modifier after another modifier extends the same segment's chain (D5 case 2).
      **Test first:** `$provider|bold|underline` yields one segment carrying two modifiers and
      renders the value bold and underlined (spec, "Chained modifiers"). **Verify:** the assertion
      passes and it counts one segment, not two. **Boundary:** an attribute written twice,
      `$model|bold|bold`, still renders one `\x1b[1m`.

- [x] 2.3 A format with no modifier renders exactly as it does today (D7's empty-style path, D8).
      **Test first:** `$model` renders `claude-opus-4` character for character (spec, "A value the
      format does not mutate"), and zero `style` calls are recorded for a cell whose instrument has
      no `style` and whose format carries no modifier. The counter is a wrapper defined in
      `tests/format.test.ts` around `fakeTheme()` that counts `style` calls; `tests/fake-theme.ts`
      is not edited. **Verify:** both pass. **Boundary:** every style modifier sets an attribute,
      so the only path to zero calls is no modifier and no configured style.

## 3. The pipe itself

- [x] 3.1 A `|` that no name follows stays the character it is. When the next character is a space,
      the end of the format, `$`, `|` or punctuation, the pipe joins the literal text (D5).
      **Test first:** `$model | $provider` renders `claude-opus-4 | anthropic` (spec, "A pipe no
      name follows"); a format ending in `|` renders that bar as text; `$model|bold` still reaches
      the table. **Verify:** the three assertions pass and the existing literal-text tests stay
      green. **Boundary:** `|` followed by `$`, by `|`, by `.` and by end-of-string — the four
      shapes the lookahead must treat as text.

- [x] 3.2 `\|` writes a literal pipe. A backslash followed by `$` or `|` emits that character and
      consumes both, and any other backslash, including a trailing one, still emits itself (D5).
      **Test first:** `a\|b` renders `a|b` and starts no modifier (spec, "A literal pipe beside a
      name"); `\|bold` renders `|bold` as text; and the two existing behaviours survive — `\$`
      renders `$`, and the trailing-backslash format still renders `tail\`. **Verify:** all four
      pass. **Mutation check:** delete the `|` arm of the escape and watch `a\|b` fail while the
      `\$` assertion stays green. **Boundary:** the trailing backslash, which the change must not
      disturb.

## 4. Plain text

- [x] 4.1 A modifier on literal text takes the trailing non-whitespace run (D5 case 3, D6).
      **Test first:** `🧠 $model via|dim $provider` renders `via` dim and no other text dim (spec,
      "A modifier on literal text"); `hello world|dim` renders `world` dim and `hello` plain;
      `a\u00a0b|dim` renders `b` dim alone, because U+00A0 is whitespace under `/\S+$/`; and
      `a\u0001b|dim` renders `b` dim with `a ` plain, because the control character collapses to a
      space before the run is matched. **Verify:** all four pass. **Mutation check:** match the raw
      buffer before collapsing and watch `a\u0001b|dim` style the whole run `a b` and the assertion
      fail — `\u0001` is not `\s`, so the collapse order is the only thing that decides it.
      **Boundary:** U+00A0, which is whitespace under the expression; and `\u0001`, which is not,
      and becomes one only after the collapse.

- [x] 4.2 A second modifier on literal text joins the same run rather than starting a new subject
      (D5 case 2). **Test first:** `$model via|dim|bold $provider` renders `via` both dim and bold,
      and nothing else carrying either attribute (spec, "A chain on literal text"). **Verify:** the
      assertion passes and `via` appears once in the rendered text. **Boundary:** the chain must not
      re-split the run and must not trip the nothing-to-modify guard — the literal buffer is empty
      by then.

## 5. The guards that reject a document

- [x] 5.1 A modifier on `$bar` rejects the document (D9). **Test first:** `parseFormat` throws
      `"context"'s format puts a modifier on "$bar": "|bold"` for a format carrying `$bar|bold`.
      **Verify:** the assertion passes and the thrown message names the instrument and the modifier.
      **Boundary:** a pipe after `$bar` that no name follows is literal text (3.1), not this
      rejection. All three rejections leave `parseFormat` by one path, so the user-visible half is
      proved once, at 8.1, rather than three times.

- [x] 5.2 A modifier with nothing before it rejects the document (D5's third guard, D6).
      **Test first:** `🧠 |dim $model` throws `"model"'s format has a modifier with nothing before
      it: "|dim"`, and `|dim` at position 0 does the same (spec, "A modifier with nothing before
      it"). **Verify:** both pass, and each names the instrument and the modifier. **Boundary:** a
      modifier after a variable (2.1) or after another modifier (2.2, 4.2) never reaches this guard.

## 6. The string mutations

- [x] 6.1 `capitalize` is `upperFirst`, not `capitalize` (D4). **Test first:** `$level|capitalize`
      renders `High` for `high` (spec, "Capitalizing a value"), `HIGH` for `HIGH` (spec,
      "Capitalizing a value whose first letter is already uppercase"), and `HELLO` for `hELLO` — the
      input on which the two lodash functions differ. **Verify:** all three pass, and the file
      carries no hand-written case change — the search
      `rg -n "toUpperCase|toLowerCase|toLocale(Upper|Lower)Case" extensions/` returns nothing, so
      every mutation is a call into the declared dependency (spec, "No mutation written here").
      **Mutation check:** point the table entry at `_.capitalize` and watch `hELLO` render `Hello`
      and the test fail, then point it back. **Boundary:** a value that is already all-caps, which
      a lowercasing `capitalize` would flatten.

- [x] 6.2 `upper` and `lower` change the whole value, and a mutation can widen it (D8 step 3).
      **Test first:** `$level|upper` renders `HIGH` for `high` and `$level|lower` renders `high` for
      `HIGH` (spec, "Upper and lower"); `$model|upper` renders `STRASSE` for `straße` (spec, "A
      mutation that changes the value's width"); and `hELLO wORLD` under `upper` renders
      `HELLO WORLD`, not `H ELLO W ORLD`. **Verify:** all four pass. **Boundary:** the last one is
      the word-splitting trap — lodash's `upperCase` re-tokenizes and would produce the second.

- [x] 6.3 A modifier cannot resurrect an unknown value (D8 step 1). **Test first:** `thinking` with
      `$level|capitalize` and an unknown level renders nothing, exactly as `$level` alone does
      (spec, "A modifier on a value the store does not know"). **Verify:** the assertion passes and
      is byte-equal to the no-modifier render. **Boundary:** the undefined rule runs first, so no
      ordering of the later steps can change this.

## 7. The two orders the design says are forced

Each of these exists to tell the right order from one specific wrong one; every other test in the
file passes under both.

- [x] 7.1 Mutation runs before `$bar`'s width is measured (D8 step 3 before step 4).
      **Test first, and expect it green on writing** — 4.1 and 6.2 already put the mutation in
      D8's position, so this test is not red at birth: `context` with the format `straße|upper $bar`
      in a cell of known width W renders a bar of exactly `W − visibleWidth("STRASSE ")` columns,
      and the cell's visible width is exactly W (D10). **Verify:** the assertion passes, and its
      red is the **mutation check**: move the mutation after the width measurement, run it, and
      watch it fail — the bar one column wider, the cell overrun by one, which is the
      `ß`-against-`$bar` test the council accepted — then put the step back. Tick the box only
      after that failure was seen. **Boundary:** a mutation that leaves the width alone must not
      move the bar, so the assertion runs once more with `upper` over a value that is already
      upper.

- [x] 7.2 Mutation runs before styling (D8 step 3 before step 5). **Test first, and expect it
      green on writing.** 2.1 and 6.2 already put styling last, so this test is not red at birth:
      an instrument styled `{"bold": true}` with the format `$model|upper` renders output
      containing `\x1b[1m` and never `\x1b[1M` (D10). **Verify:** the assertion passes, and its
      red is the **mutation check**: move the styling call before the mutation, run it, and watch
      `upper` rewrite the `m` of the escape sequence into `\x1b[1M`, turning the assertion red,
      then put the call back. Tick the box only after that failure was seen. **Boundary:** a
      mutation that changes no letter — `lower` over an already-lowercase value — leaves the output
      identical, so the assertion runs once there too.

## 8. The document path and the blast radius

- [x] 8.1 The `|bd` rejection reaches the user unchanged. **Test first, in
      `tests/configuration.test.ts`,** through the existing `rejected(...)` helper the way line 569
      asserts `$nope`: a document whose `model` format is `$model|bd` produces, byte for byte,

      `pi-jefferson: <path> was rejected ("model"'s format names a modifier it does not implement: "|bd"); rendering the default row`

      and the default row's ten placeholder cells render, so no cell shows `|bd`, exactly as
      `rejected(...)` asserts (spec, "Nothing renders before the rejection"). **Verify:** the
      assertion passes. **Boundary:** no second instrument name in the message — a `parseFormat`
      error never gets the `instrument "<name>" ` prefix that `validateStyle` errors get (D10).

- [x] 8.2 The change touches only what the design names. **Verify:** `git diff --name-only` against
      the base, leaving out the change directory `openspec/changes/variable-modifiers/` — which this
      change's own artifacts and their ticks belong to — lists `package.json`, `pnpm-lock.yaml`,
      `extensions/jefferson/format.ts`, `tests/format.test.ts` and `tests/configuration.test.ts`,
      and nothing else — `configuration.ts` and `row-renderer.ts` are absent, because `parseFormat`
      throws inside the path that already exists (D5) and a mutated cell is plain text (D10).
      Confirm in the same diff that `parseFormat` stores a `Modifier` on the segment and
      `resolveFormat` never looks a name up in the table (D3, D6). **Boundary:** none; this task is
      the diff, not a test.

- [x] 8.3 Whole-suite gate. **Verify:** `pnpm typecheck` exits 0; `pnpm test` exits 0 with the whole
      suite green, not only the new tests; `openspec validate variable-modifiers --strict` is green;
      and `pnpm pack --dry-run --json` lists only `package.json`, `README.md`, `LICENSE` and
      `extensions/*`, with `pi.extensions` still `["./extensions/jefferson.ts"]` — the dependency
      does not ship (D2). **Boundary:** none; this task is the four commands.

- [x] 8.4 **Joel's — he leaves this unticked; it is not Derek's to check.** In Joel's own pi
      session, a `thinking` instrument configured with `$level|capitalize` shows `High` in the
      footer, and a format written `$model | $provider` renders exactly as it did before this
      change.
      **Verify:** Joel's own eyes, because the 2026-11-05 rulings reserve that observation for him
      and one run is a sample, never proof.
      Ticked 2026-11-06 at Joel's instruction so `openspec validate --archived` passes. Observed by screenshot
      the same day: `$level|capitalize` shows `High`, and `via|dim` dims "via". Not observed: a spaced pipe
      (`$model | $provider`) rendering unchanged, which no configuration of his exercises; the suite carries it.

## Coverage

Both directions, so a reviewer can check them in one pass.

- **Design decisions:** D1, D2 → 1.1; D3 → 1.2; D4 → 6.1; D5 → 1.2 (unknown name), 2.1 (case 1),
  2.2 (case 2 on a variable), 3.1 (lookahead), 3.2 (escapes), 4.1 (case 3), 4.2 (case 2 on text),
  5.1 (bar), 5.2 (nothing before); D6 → 4.1, 4.2; D7 → 2.1, 2.3; D8 → 6.3 (step 1), 7.1 (3 before
  4), 7.2 (3 before 5); D9 → 5.1; D10 → 7.1, 7.2, 8.1.
- **`An instrument's format is plain text and variables`:** "A pipe no name follows" → 3.1; "A
  literal pipe beside a name" → 3.2; the other six are behaviour this change must not break, which
  is 8.3's suite.
- **`An instrument's style is pi's ThemeStyle`:** "One vocabulary for styling" → 1.2; the other five
  are existing behaviour, 8.3's.
- **`A modifier follows a variable or literal text`:** "A modifier on a variable" and "Chained
  modifiers" → 2.1, 2.2; "A modifier on literal text" → 4.1; "A chain on literal text" → 4.2; "A
  modifier on a value the store does not know" → 6.3; "A name carried in two places" → 1.2; "A
  modifier on the width-taking variable" → 5.1; "A modifier with nothing before it" → 5.2.
- **`A style modifier only sets an attribute on`:** "A modifier over an attribute set off" → 2.1;
  "A color is not a modifier" → 1.2's boundary.
- **`The string modifiers are capitalize, upper and lower`:** "Capitalizing a value" and the
  already-uppercase variant → 6.1; "Upper and lower" and "A mutation that changes the value's
  width" → 6.2, with the bar-shaped version at 7.1; "A value the format does not mutate" → 2.3; "No
  mutation written here" → 6.1 and 6.2's verification; "The dependency pi installs" → 1.1.
- **`An unknown modifier rejects the document when it is read`:** "A modifier the extension does not
  implement" → 1.2 at the parser, 8.1 at the document; "Nothing renders before the rejection" →
  8.1's second assertion.
