# Audit of pi-jefferson (ponytail-audit)

Audited at `3bfd157` (branch `intuitive-source-layout`, same code as `main` at `7580e32`). `pnpm typecheck` is clean and `pnpm test` passes 317 of 317.

**What this repo does:** pi-jefferson is a pi extension that replaces pi's footer with a statusline. You configure rows of cells in a JSON file. Each cell shows one instrument: model, thinking level, folder, context use, tokens or cost. It is published to npm, and every merge to `main` releases a new version.

**Load I assumed:** one person in one terminal. The footer renders on every keypress and every streamed frame, on sessions of up to a few thousand entries. The code is small, with no network, no database and no shared state. The most expensive mistake here is in the release pipeline, because a published npm version is permanent.

## Must fix

1. **Anyone with write access can publish any branch to npm** (`.github/workflows/release.yml:L3-6`)
   - **What this is:** The release workflow tests the code, works out a version, publishes to npm with provenance, then tags and releases. It starts on a push to `main` and also on `workflow_dispatch`, a button in the Actions tab.
   - **Problem:** `workflow_dispatch` lets the person pick any branch. The job never checks that the branch is `main`. Someone with write access can run it on an unreviewed branch and publish that code. This skips the rule that `main` needs a code-owner review. npm trusted publishing trusts the workflow file, not the branch.
   - **Fix:** Add one line to the job: `if: github.ref == 'refs/heads/main'`. Normal merges are not affected.
   - **If we skip it:** An unreviewed build can reach every user. A published version cannot be taken back.

## Should fix

2. **The version script has no test** (`.github/scripts/next-version.mjs`, whole file)
   - **What this is:** It reads git tags, finds the highest release tag before this commit, and bumps major, minor or patch. The release then publishes that number.
   - **Problem:** Nothing checks it. It has several branches: prerelease tags are skipped, the sort is by version number (so 0.10 is above 0.9), there is a fallback to `v0.0.0`, and the bump is chosen by label. A change that breaks any of them would publish a wrong or repeated version. A tag that is not three numbers, such as `v1.2`, gives `NaN` in the version with no error. The script already takes a `ref` argument, so it can be tested.
   - **Fix:** Add one test in `tests/`. Make a temporary git repo with a few tags (`v0.9.0`, `v0.10.0`, `v1.0.0-rc.1`) and assert the output for each bump. In the script, reject a base that does not match `/^\d+\.\d+\.\d+$/`.
   - **If we skip it:** A bad version number is found only when npm refuses it, or after it has shipped.

3. **`VERSION` is a dead export with a wrong value, and a test pins it** (`extensions/jefferson.ts:L22`, `extensions/jefferson/startup.ts:L24-26`, `tests/jefferson.test.ts:L213-215, L317`)
   - **What this is:** The entry file exports `VERSION = "0.0.0-alpha"`. Nothing in the shipped code reads it.
   - **Problem:** `package.json` says `0.1.1` and the real release tags are at `0.10.x`, so the value is wrong. A comment in `startup.ts` explains why it is not printed. The test asserts the wrong value and lists `VERSION` as part of the allowed export surface. This keeps a wrong number alive, and every reader has to learn why it is there.
   - **Fix:** Delete the export, the three-line comment in `startup.ts`, the `VERSION` assertion, and `"VERSION"` in the export-keys test. Total: about 6 lines.
   - **If we skip it:** Someone will one day print `VERSION` and show users a wrong version.

## Nice to have

4. **A folder at the filesystem root shows a label with no value** (`extensions/jefferson/visuals/instrument.ts:L75`)
   - **What this is:** The `path` instrument shows the last part of the working folder with `basename(cwd)`.
   - **Problem:** `basename("/")` is `""`. If pi runs in `/`, the cell shows `Path: ` with nothing after it. The data is known and empty, so the label stays. Unknown data hides the whole cell. The existing test pins `""` for the value, but not what the label does.
   - **Fix:** `basename(r.cwd) || r.cwd`. Update the one `["/", ""]` case in the test to `["/", "/"]`.
   - **If we skip it:** A rare, small visual oddity.

5. **A runtime dependency for three one-line string functions** (`extensions/jefferson/visuals/format.ts:L4-6`, `package.json`)
   - **What this is:** `lodash-es` supplies `upperFirst`, `toUpper` and `toLower` for the `|capitalize`, `|upper` and `|lower` modifiers.
   - **Problem:** The platform has all three: `s.toUpperCase()`, `s.toLowerCase()` and `s.replace(/^./u, c => c.toUpperCase())`. The last form keeps characters outside the basic plane whole, as lodash does. ADR 0004 records this as Joel's ruling, with the measured trap that the CommonJS `lodash` fails under Node's loader. So this is a decision, not a mistake. Reversing it is cheap and removes a package that installs for every user.
   - **Fix:** Only if the ruling is revisited: replace the three imports, drop `lodash-es` and `@types/lodash-es`, and retire ADR 0004.
   - **If we skip it:** One extra install and three extra module loads per user. No harm.

6. **GitHub Actions are pinned by tag in the workflow that can publish** (`.github/workflows/release.yml:L23-34`, `ci.yml`)
   - **What this is:** `actions/checkout@v7`, `pnpm/action-setup@v4` and `actions/setup-node@v7` are referenced by moving tag.
   - **Problem:** The release job holds `id-token: write`, the permission that lets it publish. If a moved or hijacked tag ran code there, it could publish as this package.
   - **Fix:** Pin the three actions in `release.yml` to commit SHAs with the tag in a comment. Dependabot can keep them current.
   - **If we skip it:** The risk is low, but the cost if it happens is high.

7. **The `Readings` type is rebuilt in a second place** (`extensions/jefferson/visuals/format.ts:L10`)
   - **What this is:** `type Readings = Parameters<Instrument["render"]>[0]`.
   - **Problem:** `Readings` is already exported from `data/session-data-store.ts`, and `row-renderer.ts` imports it from there. The import direction rules allow `visuals/` to import `data/` types.
   - **Fix:** `import type { Readings } from "../data/session-data-store.ts";` in place of that line.
   - **If we skip it:** Nothing breaks. It is one fewer indirection.

Two smaller items were left out. The `.gitignore` comment says "See README" about the `.pi/` rule, but the README does not mention it. `cellsFromNames` (`configuration.ts:L153-155`) reads `instrument` and `align` with `Object.entries(...).find`, where the rest of the file casts to `Record<string, unknown>`.

## Checked and fine

- **Config reading:** A bad document never throws out of `session_start`. Unknown keys, wrong types, duplicate row ids, a too-large `rowGap` and an empty `cells` list all fall back to the default row with a warning. A project config is read only when the project is trusted.
- **Terminal output:** Control characters, including the escape character, are turned into spaces in formats, labels and host values. Cell text cannot inject terminal escape sequences.
- **Subscriptions:** `release` runs once, however many times it is called. It drops all three subscriptions and clears the store's readers. pi calls the footer factory once per `setFooter`, so the shared `dispose` cannot kill a live footer.
- **Render cost:** The session scan runs only when `(sessionId, leafId)` changes, so a render is cheap. A repaint is requested only when something changed.
- **Width math:** Width uses `visibleWidth` and `truncateToWidth`, and padding is computed from the clipped text, so wide glyphs are safe. The width plan is a pure function with its own tests.
- **Count display:** `compactCount` shows `999999` as `1000k` and `99999` as `100.0k`. The tests pin both deliberately, so I treated them as decisions.
- **Release logic:** The tag-based base and re-run safety (`--merged HEAD~1`, an "already published" check, and tag creation guarded by an existence check) hold up on reading.

Verdict: Healthy code. Fix the release workflow first (1), then test the version script (2).
Lean: -8 lines, -1 dependency possible (plus its `@types` dev package), counting 3, 5 and 7.
Not checked: I did not read `openspec/changes/` (as the brief said) or the long `openspec/specs/*` spec files against the code. I did not run the release or CI workflows, or `pnpm pack`. I only skimmed the 317 tests, reading those I needed. The PNG in `docs/` and the full ADR text beyond 0004 were not read. I did not check whether npm's trusted-publisher settings are limited to a branch or an environment. If they are, finding 1 is weaker.
