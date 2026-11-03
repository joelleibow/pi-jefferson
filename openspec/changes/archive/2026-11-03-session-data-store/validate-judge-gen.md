I have everything I need. Here is the report.

# Validate — Judge Gen

## Verification

### 0. What I could and could not execute

This session has no shell tool (read-only: `read`, `grep`, `find`, `ls`, `watchdog_diff`), so the four commands the brief names were **not run**, and I report that rather than a result. The supervisor must run, and paste the output next to this report:

| Command | Expected | Why I believe it (static substitute) |
| --- | --- | --- |
| `openspec validate session-data-store --strict` | `Change 'session-data-store' is valid` | I read the validator and merge code the CLI actually runs (`@fission-ai/openspec/dist/core/validation/validator.js`, `dist/core/parsers/requirement-blocks.js`, `dist/core/specs-apply.js`) and checked every condition that can produce an ERROR or a WARNING — see §4. Nothing in either delta trips one. |
| `pnpm typecheck` | exit 0 | Every host symbol the code touches exists in the installed 1.4.0 devDependency: `setFooter` factory `(tui, theme, footerData) => Component & {dispose?}` at `@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts:111-113`, `tui.requestRender()` at `@earendil-works/pi-tui/dist/tui.d.ts:238`, `on("model_select"\|"thinking_level_select") => () => void` at `types.d.ts:1222-1223`, `ctx.model: Model<any> \| undefined` at `types.d.ts:224`, `ctx.thinkingLevel?: ThinkingLevel` at `types.d.ts:234`, `ModelSelectEvent.model` / `ThinkingLevelSelectEvent.level` at `types.d.ts:885-895`, `BaseModel.id` / `BaseModel.provider` at `pi-ai/dist/types.d.ts:631,634`. New files under `extensions/**/*.ts` are inside `tsconfig.json`'s `include`. |
| `pnpm test` | 94 pass, 0 fail | I counted the cases myself: `session-data-store.test.ts` 14, `instrument.test.ts` 10, `row-renderer.test.ts` 13, `configuration.test.ts` 29 literal `test(` calls + 5 (`cells` entry loop) + 2 (non-list loop) = 36, `jefferson.test.ts` 16 + 5 (`session_start` reason loop) = 21. Total **94**, which is exactly the tally the PR body claims. Counting tests is not running them. |
| `gh pr checks 6` | — | No `gh`. CI status on #6 is **unverified**. |

`git diff main...HEAD` is likewise unavailable, so "no drift in `package.json`, `tsconfig.json`, `.github/workflows/ci.yml`, `README.md`" is verified only in the weak sense: `watchdog_diff` shows the working tree clean against the branch HEAD except `openspec/changes/session-data-store/.openspec.yaml` (see Finding 5), so the files I read *are* the committed ones; whether they differ from `main` I cannot see. Their content matches `design.md`'s "Current state" description (`devDependencies` `^1.4.0`, `files: ["extensions","README.md","LICENSE"]`, the CI allowlist, `pi.extensions: ["./extensions/jefferson.ts"]`), which is consistent with no drift but does not prove it.

### 1. Completeness

**Tasks: 23 of 24 checked.** 1.1–1.5, 2.1–2.3, 3.1–3.4, 4.1–4.2, 5.1–5.5, 6.1–6.3, 6.5 are `[x]`; 6.4 is `[ ]`.

**Task 6.4 must stay unchecked, and I would reject a checked box.** It asks for observation in a real TUI: the footer rendering `<provider>: <model>` and `thinking: <level>`, `/model` and a thinking-level change repainting with no manual refresh, and a `containers: 3` document warning while rendering eight blank cells — "record the observed lines and the warning text". Nothing in the repo records those observations, no artifact reports them, and the PR body says "**Not yet done:** the terminal demonstration (task 6.4) needs one run in a real TUI." The nearest substitute in the suite (`tests/jefferson.test.ts:300-345`) proves the same behavior against a fake `tui` whose `requestRender` counts calls, which is exactly the part that cannot prove a real terminal repaints. Checking it would be an attestation nobody made, and it is the one item that legitimately blocks `openspec archive`.

**Spec coverage — `specs/session-data-store/spec.md`, 9 ADDED requirements, all present in code:**

| Requirement | Implementation |
| --- | --- |
| The store holds the data its instruments display | 3 datums, no fourth: `session-data-store.ts:12-19`, `:32-41`; no branch/status subscription: `jefferson.ts:70-77` |
| A read is synchronous and total | `session-data-store.ts:44-48` (object literal, no call into anything that can throw), `:62-64` |
| Unknown is a distinguished value | `Reading = string \| undefined` `:12`; no `""`/`0` substitution anywhere in `:41-64` |
| Freshness never exceeds the host's delivery | seed from `ctx` at every `session_start` `jefferson.ts:60-68`; pushes at `:70-77`; design D3 states the mode per datum |
| Expensive derivations are bounded and invalidated by name | **vacuously satisfied** — nothing is derived (design D3, D13; tasks.md marks it "**vacuous**" and claims no task). Only `sample()`-once-per-render is pinned (`row-renderer.ts:60-66`) |
| Every read in one render observes one state | one `sampleReadings()` per `render(width)`, one object to every cell: `row-renderer.ts:56-70` |
| Store data does not survive a session replacement | fresh store per `session_start`, previous release first: `jefferson.ts:52-68` |
| A pushed change that alters displayed data results in a repaint | `session-data-store.ts:49-61` (compare, assign, one render) + injected `tui.requestRender` `jefferson.ts:100-102` |
| Every subscription is released when the footer is disposed | `jefferson.ts:79-94` (`released` guard, both unsubscribes, `store.dispose()`), wired as the component's `dispose` `:106` |

**Spec coverage — `specs/statusline/spec.md`:**

- **1 REMOVED (`A row's containers count`) — removal confirmed gone.** `containers` appears in `extensions/` only as a presence test and a warning string (`configuration.ts:98`, `:140`, `:163`); it is never read as a count, no `CONTAINERS` constant remains (`DEFAULT_CELLS`/`MAX_CELLS` at `:42-43`), and no length-mismatch concept exists. The baseline behavior the requirement described (8 default / clamp at 8 / reject `0` and non-integers as a *count*) is no longer delivered; the key now produces a warning, which serves the Migration note rather than the removed behavior.
- **1 RENAMED (`Cell content is fixed placeholder text` → `Cell content comes from an instrument`) — behavior preserved.** `blank` is an instrument resolving the constant (`instrument.ts:13-22`), default rows are eight of them (`configuration.ts:54-59`, `:104-108`), and the "no contribution interface" sentence survives as the narrower promise: the exported surface is `VERSION`/`default` (entry), `DEFAULT_CELL_TEXT`, `blank`, `model`, `thinking`, `instrumentNamed` (`instrument.ts`), `createSessionDataStore` (`session-data-store.ts`), `createFooter`/`renderRow` (`row-renderer.ts`), `DEFAULT_CELLS`/`MAX_CELLS`/`readConfiguration` (`configuration.ts`) — asserted at `tests/jefferson.test.ts:224-252`. `Instrument` is an exported *type*, so third-party code can implement the shape, but nothing lets it reach the extension's footer: configuration resolves only names, through a closed table (`instrument.ts:42-49`).
- **2 MODIFIED, 6 ADDED — all implemented:** `Cell { instrument }` (`configuration.ts:16-20`), geometry untouched (`row-renderer.ts:38-51`: `Math.floor((width - (cells-1)*GAP)/N)`, per-cell truncate+pad, row remainder), `cells` as count and placement with the 8 ceiling (`configuration.ts:67-88`, `:104-108`), unknown name → warn + `blank` (`:79-82`, `:160-172`), instrument reads store via `Readings` (`instrument.ts:17-39`, injected at `jefferson.ts:98`), `model`/`thinking` (`instrument.ts:36,39`).

### 2. Correctness — what I hunted for and what I found

I read the five source files and five test files line by line rather than trusting the summary.

- **A read that can throw.** None. `sample()` is a literal or a copy of three strings; the disposed branch is a field test, not a call. `render` only calls `sample()` and pure helpers. `readConfiguration`'s `readFileSync`/`JSON.parse` are inside try/catch, and the non-`RejectedConfiguration` rethrow is unreachable in practice (`:210-214`).
- **A callback that survives disposal.** None. `dispose()` assigns `requestRender = undefined` (`session-data-store.ts:63`) — it drops the closure rather than setting a flag — so the `() => requestRepaint?.()` arrow, and through it the host `tui`, is released; `sample()` and both push methods gate on the same absence (`:46`, `:50`, `:57`).
- **A warning that cannot fire.** All three can and do: `containers` (`configuration.ts:98`/`:140` → `:162-164`), unknown instrument (`:80` → `:165-171`), rejection (`:210-213`). Each has a test asserting the message content, not just truthiness (`tests/configuration.test.ts:129-147`, `:155-178`, `:180-190`).
- **A test that asserts nothing.** I found none. The weakest lines are `assert.equal(typeof line, "string")` (`tests/row-renderer.test.ts:47`, `:111`) but each is followed by a width/string assertion with teeth.
- **An assertion that would pass under mutation.** I walked the mutation each load-bearing test is supposed to kill: per-row sampling → `samples === 3 ≠ 1` (`:123-137`); a fresh `Readings` per cell → identity assertion fails (`:139-159`); reading `containers` again → 3 cells, not 8 (`configuration.test.ts:129-137`); warning per row → `containers` appears twice (`:139-147`); no change-detection → repaint count 2/1 instead of 0 (`session-data-store.test.ts:82-101`); a non-idempotent `release` → `[2,2]` instead of `[1,1]` (`tests/jefferson.test.ts:383-420`); reseeding removed → the five `session_start` reason tests fail; `visibleWidth`→`String.length` → the byte-exact ANSI/emoji assertion at `row-renderer.test.ts:75-90` fails.
- **One behavior the tests do not pin, correctly.** `instrumentNamed` uses `Object.hasOwn` (`instrument.ts:49`), so `"toString"`/`"__proto__"`/`"constructor"` resolve to `undefined` rather than Truthy prototype members. That is the right call and no test covers it; a name like `cells: ["__proto__"]` warns and renders `blank`. Not a defect — noted because it is the one place the lookup could silently mis-resolve and nothing would say so.
- **`renderRow` with zero cells** yields `Math.floor(x/0)` = `-Infinity` but no iterations, so the line is `width` spaces rather than a throw; unreachable anyway because an empty `cells` array is rejected (`configuration.ts:68-70`). Graceful, not a finding.
- **Fake-host fidelity.** `tests/jefferson.test.ts:60-63` types the handler as `(event: unknown, ctx: unknown) => unknown` and casts the fake as `(pi: unknown) => void`, so `pnpm typecheck` cannot catch a fake that drifts from `ExtensionContext`. See Finding 6.

### 3. Coherence — design vs code

D1–D14 are followed, and where the code differs from the *snippet* in `design.md` it is only the elided configuration read (D5's comment says so).

- **D2** surface matches exactly (`session-data-store.ts:21-39`), including `modelSelected(provider, model)` unwrapping host fields in the entry rather than the store.
- **D3/D4** one sample per `render`, passed to every row and cell (`row-renderer.ts:56-70`); `invalidate()` a no-op (`:68`).
- **D5** the entry owns both `pi.on` calls and the retained `releasePrevious` at factory scope (`jefferson.ts:43`, `:55`, `:79-94`); the `released` guard is inside `release`, so the footer's `dispose()` and the next `session_start` release agree. `theme`/`footerData` stay unused. `session_shutdown` is subscribed by nobody, as D5 states.
- **D6/D8** all five `session_start` reasons take the identical path; no context is held by the store.
- **D7** compare-then-assign, one repaint on any change, none on an identical re-report (`session-data-store.ts:49-61`).
- **D9** `labelled` applied twice; `DEFAULT_CELL_TEXT` moved to `instrument.ts:13` and `configuration.ts` no longer owns it.
- **D10/D11** parse-time resolution, aggregated unknown-name warning with the stated wording; `cells` is count+placement; `containers` warned once per document, not read; empty array and non-string entry rejected.
- **D12** only the per-cell string source changed in the loop.
- **D13** every named test exists in the named file.
- **D14** the pin is untouched; every 1.4.0 location it cites exists (one citation is off by three lines: `design.md`'s table says `pi-ai types.d.ts:631` for *both* `Model.provider` and `Model.id`; `id` is at `:631` and `provider` at `:634`. Cosmetic.)
- **The one real divergence is a policy the design itself still lists as open** — see Finding 1.

### 4. The living specs — will `openspec archive` apply these deltas?

I traced the actual merge code rather than reasoning from the format alone.

- **Order of application** is `RENAMED → REMOVED → MODIFIED → ADDED` (`specs-apply.js`, the "Apply operations in order" block), and the validator documents the same intent ("Archive applies RENAMED before MODIFIED, so a MODIFIED naming the new header is compared against the renamed block's scenarios"). The RENAMED `FROM` exactly matches the living header `### Requirement: Cell content is fixed placeholder text` (`openspec/specs/statusline/spec.md`), the `TO` name does not already exist there, and the `FROM:/TO:` pair is two adjacent bullets that `parseRenamedPairs` accepts (its regex tolerates the bullet and the backticks). So the MODIFIED block lands on a header that exists by then.
- **Scenario-loss check passes.** The baseline requirement carries scenarios `Rendering a row` and `Contributing cell content`; the MODIFIED block carries both, plus one new one. `diffScenarioNames` finds nothing missing, so neither `validate` nor `archive` refuses.
- **The REMOVED entry resolves to a real baseline** (`### Requirement: A row's containers count` exists verbatim in the living spec), so no "already removed" warning and no typo abort. Its `**Reason**`/`**Migration**` body is explicitly not reported as unapplied content ("REMOVED/RENAMED bodies … are not reported", `requirement-blocks.js:199-203`).
- **No cross-section conflict:** MODIFIED references the NEW name (the check that fails deltas referencing the FROM side is not tripped); RENAMED and REMOVED name different requirements.
- **New capability path:** `openspec/specs/session-data-store/` does not exist, and the delta has only ADDED requirements, so `archive` creates the spec from the skeleton plus the carried `## Purpose` (124 characters — well over the 50-character `PURPOSE_TOO_BRIEF` floor).
- **`--strict` turns WARNINGs into failures**, so I checked every warning source: no orphaned requirement, no text before the first requirement in an ADDED/MODIFIED section, no duplicate names, no missing `MUST`. The two near-misses are added-requirement body lengths against the 500-character `REQUIREMENT_TOO_LONG` warning: "The store holds the data its instruments display" is 475 characters and "An instrument resolves a cell's text by reading the store" is 490, both counted as the reader counts them (wrapped lines trimmed and joined with `\n`). They pass with 10 characters to spare — thin, worth knowing before anyone edits that paragraph.

### 5. The repo's rules

| Rule | Verdict |
| --- | --- |
| No runtime host import outside `extensions/jefferson.ts` | **Holds.** `session-data-store.ts` has no import at all; `instrument.ts` has exactly one `import type`; `configuration.ts` imports `node:fs` + `./instrument.ts`; `row-renderer.ts` two `import type`s. Host packages stay `peerDependencies` with `*`. |
| Erasable TypeScript only | **Holds.** No `enum`, parameter properties, `namespace`, or decorators in any new file; `RejectedConfiguration extends Error` is a plain JS class; `type` import modifiers only. |
| Tests under `tests/` only | **Holds.** Two new test files, three extended; nothing added under `extensions/`. |
| No test in the packed tarball | **Holds.** `files: ["extensions","README.md","LICENSE"]`; no `*.test.ts` anywhere under `extensions/`; CI asserts it by invariant and its allowlist is unchanged. |
| No drift in `package.json` / `tsconfig.json` / `ci.yml` / `README.md` | **Content consistent, diff unverified** (no `git`). The two new files are covered by `include: ["extensions/**/*.ts", …]` and by the CI allowlist with no edit, exactly as design claims. |
| Exported surface offers no way for third-party code to supply cell content | **Holds** — see §1, plus `tests/jefferson.test.ts:224-252` re-asserting key sets and that `instrumentNamed` is a lookup with no mutable table. |

## Pull request review

**CI status (`gh pr checks 6`): unverified** — no `gh` in this session. Nothing else in the PR review can override a red CI; the supervisor must check it.

**Commit message: unverified.** I cannot read the branch's commits, and `/tmp/commit-msg.txt` is a different, older commit (the npm→pnpm switch), not this one.

**PR body.** I read `/tmp/pr-body.md`; its provenance is unverified (nothing ties the file to #6), so treat this as "a body claiming to describe this PR". Assessed against the code:

- Accurate: the store's three datums, `undefined` as unknown, one sample per `render`, idempotent retained release, the seam, the two instruments' output, the BREAKING paragraph (`containers` unread, warning names the key and says declare `cells`), the untouched-file list, the deferral of the wider surface. I checked each against source and found no overclaim.
- Under-claimed, and correctly so: "94/94 tests pass" matches my own count of 94 cases; "`pnpm typecheck` clean" and "`openspec validate --strict` valid" are plausible from §0/§4 but are claims, not outputs.
- **Unverifiable claims:** "The four reds the plan depends on were re-derived by mutation" (dropping `releasePrevious` → `[0,0]`, dropping the `released` guard → `[2,2]`, `visibleWidth`→`String.length`, adding a `registerInstrument` export). No artifact in the repo records those runs; the two repaint/identity counters are only visible in the tests they were run against. I traced why each *would* fail, which is not the same as having run them.
- Honest: "**Not yet done:** the terminal demonstration (task 6.4)".

**`release:minor` on a 0.x package: fits.** `next-version.mjs` maps `minor` to `0.(minor+1).0` and `major` to `1.0.0`; `release.yml` reads the label from the PR and defaults to `patch`. A breaking change under 1.0 is conventionally a minor bump, and `release:major` would publish `1.0.0` — a claim the package's own framing ("pre-alpha", "the first real release") does not make. `council.md` and `owner-rulings.md` state `containers` shipped in `0.1.4`, so the label yields `0.2.0`. That is the right call; the only trap is that a label-less merge would ship this removal as `0.1.5`.

**Working tree.** Clean against the branch head except the gate flip in `.openspec.yaml` (Finding 5). No stray or backup files.

**Merge verdict: OK with notes.** The code itself is ready — complete against both deltas, coherent with the design, no correctness defect I could find, and both merge-risky delta operations will apply. Findings 1 and 2 want a decision and a one-line code/artifact change; 3 and 4 are documentation; 5 is a commit. 6.4 blocks `openspec archive`, not the merge.

## Findings

**1. major — The empty-`cells` rejection ships as an owner-unruled policy, is absent from both specs, and the artifacts contradict each other about whether it is approved.**
Files/symbols: `extensions/jefferson/configuration.ts` `cellsFromNames` (the `names.length === 0` throw at `:68-70`); `openspec/changes/session-data-store/design.md` D11 and "Open Questions" (first bullet, "Does the owner confirm the empty-`cells` policy?"); `openspec/changes/session-data-store/tasks.md` 3.2 ("this task executes it as approved"); `openspec/changes/session-data-store/proposal.md` "Open questions for design: what a `cells` array renders as when it is empty"; `openspec/changes/session-data-store/specs/statusline/spec.md` (states no empty-array behavior); `owner-rulings.md` (rules no error policy).
Evidence: the code rejects the document (default row + warning naming "empty cells"), the test asserts it (`tests/configuration.test.ts:180-190`), `design.md` still lists it as an open question, `tasks.md` declares it approved, and the proposal says the owner has not ruled. The same gap covers the sibling policy: `design.md`'s second proposal question ("whether a document that still carries a `containers` key is rejected, ignored, or warned about") was answered by D11 as *warn* and shipped, with no owner ruling recorded either.
Required change: get the owner's confirmation once, then (a) state it as a scenario in the statusline delta (smallest: add `#### Scenario: cells empty` — "WHEN a declared row carries an empty `cells` list THEN the configuration is rejected, the default row renders, and the warning names the reason" — under `A row's cells are its count and its placement`), (b) delete the corresponding bullet from `design.md`'s Open Questions, and (c) make `tasks.md` 3.2 cite the ruling instead of asserting approval. If the owner reverses it, the code change is `names.length === 0` → return `blankCells(DEFAULT_CELLS)` and one test edit. Do not archive with shipped behavior no spec states.

**2. minor — A malformed `cells` entry past the 8-cell ceiling rejects the whole document, although the spec says a longer array is truncated rather than rejected.**
Files/symbols: `extensions/jefferson/configuration.ts` `cellsFromNames` — the `typeof name !== "string"` throw at `:74-77` sits before the `if (cells.length === MAX_CELLS) break;` at `:83-84`; asserted by `tests/configuration.test.ts:104-112`; text at `specs/statusline/spec.md` requirement `A row's cells are its count and its placement` ("the ceiling MUST be 8: a `cells` array longer than 8 MUST be truncated to 8 rather than rejected").
Evidence: `{ cells: ["blank" ×8, 42] }` renders 8 cells if the ceiling were applied first, but the document is rejected and the default row renders instead. `design.md` D11 says a non-string entry is rejected "the same way" without saying whether an entry that will never render still counts. The code's own comment (`:74-75`) shows the choice was deliberate, so this is a spec-and-design wording gap rather than a slip.
Required change: pick one and record it. Either move the narrowing inside the render prefix (validate only the first `MAX_CELLS` entries, keeping the unknown-name collection where it is) and rewrite `tests/configuration.test.ts:104` accordingly, or add one sentence to D11 and to the requirement stating that every entry of a longer `cells` array is still validated, so the truncation clause applies to length only. I would take the second: one sentence, no behavior change.

**3. minor — The `/jefferson` command's text is now false.**
Files/symbols: `extensions/jefferson.ts` `jefferson()` → `pi.registerCommand("jefferson", …)`, the notify string at `:48` ("the statusline is not built yet"); asserted verbatim by `tests/jefferson.test.ts:144-152`.
Evidence: after this change the footer renders live instrument text in every TUI session; the command, which is the only user-facing surface the package documents, reports that no statusline exists. `README.md`'s Install section tells users to run exactly this command.
Required change: change the string to describe the installed footer (for example `pi-jefferson ${VERSION} — statusline installed: N rows`) and update the one assertion in the same edit; if the text is deliberately frozen until the real release, say so in `tasks.md` and in the code comment so the next reviewer is not re-litigating it.

**4. minor — `README.md` contradicts the shipped behavior and the settled spec, and it ships in the tarball.**
Files/symbols: `README.md:3-4` ("Pre-alpha. This claims the name and does nothing else yet. … There is no statusline in this package."), `README.md:25-27` ("What the first release will do: render one row from an ordered module list, with a module interface other extensions can contribute to."); `design.md` "Migration Plan" closing paragraph ("No … README.md change is needed: … the README documents no configuration keys").
Evidence: the extension installs a configured multi-row footer with `model`/`thinking` cells; the promised "module interface other extensions can contribute to" is precisely what the statusline spec forbids ("no API exists by which third-party code can supply or replace cell content"), and the "module" noun is one `owner-rulings.md` rules out for this concept. The design's justification is narrowly true (the README documents no keys) but leaves the package's status statements wrong in the file `package.json` ships.
Required change: either update the three passages in this PR (a four-line edit) or record in `design.md` that the README's status text is corrected in a named follow-up change; add a line to `tasks.md` so the debt is visible. The contradiction with the no-contribution promise should not survive archive regardless of which you pick.

**5. minor — The `implement: approved` gate is only in the working tree, not in the PR's commits.**
Files/symbols: `openspec/changes/session-data-store/.openspec.yaml` → `x-marbleization.gates.implement`.
Evidence: `watchdog_diff` shows this file as the only working-tree change: `implement: pending` → `approved` (plus a `runs.michael` id change). Committed branch content therefore still tells a reader the implementation gate is pending, while the PR body says the gates are recorded there.
Required change: commit that file in PR #6 (and mention it in the body), or state that the harness owns the gate file and hold it out of the PR deliberately — but do not merge with the PR body pointing at a file that contradicts it.

**6. minor — The fake host in `tests/jefferson.test.ts` is `unknown`-typed, so `pnpm typecheck` cannot catch a fake that drifts from the host.**
Files/symbols: `tests/jefferson.test.ts` — `type Handler = (event: unknown, ctx: unknown) => unknown` (`:30`), `(jefferson as unknown as (pi: unknown) => void)(fakePi)` (`:103`), and the `ctx`/`tui` object literals built in `start()` (`:118-137`).
Evidence: this diff extends the fake with `ctx.model`, `ctx.thinkingLevel`, `pi.on` returning an unsubscribe, and a `setFooter` factory whose `tui.requestRender` is counted — every one of which the real host types constrain (`types.d.ts:111-113`, `:224`, `:234`, `:1222-1223`), and none of which the compiler checks here. A host signature change (an extra factory parameter, a renamed field) would pass `pnpm typecheck` and fail only in a real session, which is the failure class this change's terminal demonstration is supposed to catch.
Required change: `satisfies`-check the fake against the host types where it is cheap — for example `const fakePi = { … } satisfies Pick<ExtensionAPI, "registerCommand" | "on">` and `const ctx = { … } satisfies Pick<ExtensionContext, "mode" | "cwd" | "model" | "thinkingLevel" | "ui">` — and drop the `as unknown as` cast at `:103`. If that fights the narrower `CommandDef`/`FakeFooter` shapes, an inline `satisfies` on the `setFooter` factory parameter alone still buys the check that matters here.

**Not findings, recorded so they are not re-opened:** the vacuous "Expensive derivations" requirement (no derived value exists to bound; `design.md` D3/D13 and `tasks.md` both state it and claim no test, so post-archive the living spec will carry a conditional requirement no test exercises — correct, and the alternative would be inventing a derived datum); `blank`/`model` reading `Readings` rather than a store handle (design D2's stated surface, and the delta's "by reading the store" is satisfied by a per-render store read); `renderRow` with an empty cell list (unreachable, degrades to blank space); `design.md`'s off-by-three `pi-ai types.d.ts:631` citation for `Model.provider` (line 634).

---

Skipped: `openspec validate --strict`, `pnpm typecheck`, `pnpm test`, `gh pr checks 6`, and the `main...HEAD` diff — no shell or `gh` in this session, so those results rest on static reading (validator/merge source, type declarations, a hand count of 94 test cases), not on runs. Risk to know: if `--strict` emits anything I did not model, or if any of the 94 tests fail at runtime, both my Completeness and Correctness verdicts are wrong; the supervisor should run those five commands before merging.