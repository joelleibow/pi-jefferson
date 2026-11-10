## Verification Report: instruments-for-every-datum

Reviewed at head `04c3a783ca689ca39a50ecf30969a038343e31c7`. This is PR #21 head, and the working tree is clean. Verified against `proposal.md`, both delta specs, `design.md` and `tasks.md`.

### Summary
| Dimension | Status |
|---|---|
| Completeness | 47/48 tasks; the one open box is 9.3, Joel's live check, as intended. 9 delta requirements and 3 modified ones on `statusline` and `session-data-store` all have implementation evidence. |
| Correctness | 22 of 22 ADDED and MODIFIED requirements covered; no divergence found. |
| Coherence | Design decisions D1 to D8 are followed. One dead field and a few minor notes, listed below. |

### Check scripts run on the head
| Check | Result |
|---|---|
| `suite.sh` | `pnpm typecheck` clean; 357 pass, 0 fail. This matches the expected 357 in task 9.2. |
| `imports.mjs` | PASS, 46 edges. |
| `terminal.sh` | PASS. Nothing spawns a process or reads the terminal. |
| `tarball.sh` | PASS. 25 source files shipped, 25 tracked; no test files shipped. |
| `specs.sh` | `openspec validate --strict` valid. Longest paragraphs are 477 and 467 characters, none over 500. |

I did not run `scope.sh` or `testdiff.sh`. I ran `testdiff.sh` against the merge base, but its output is an assertion list for hand comparison, and I did not compare it with D8's list.

### Completeness
- **Tasks:** 47 of 48 are ticked. The only unticked box is `tasks.md:165`, task 9.3, which is meant to wait for Joel.
- **Spec coverage:** every requirement has implementation evidence:
  - The `branch`, `session` and `status` instruments are in `components/instruments/{branch,session,status}.ts`, with entries in `shipped.ts`.
  - The store fields and setters are in `data/session-data-store.ts`: `branchChanged`, `sessionNamed` and `readStatusesFrom`. The per-sample statuses read and the null-to-unknown mapping are there too.
  - The feed's `attachFooterData`, `session_info_changed` subscription, `readHome` reader and single release are in `data/session-data-feed.ts`.
  - The footer factory calls the attachment in `footer-setup.ts`. `startup.ts` supplies `homedir`; I confirmed it is the only file that names `node:os`.
  - The forms are in `format.ts` and `path.ts`.
  - Every datum-showing instrument declares a `defaultLabel`; `blank` declares none.
- **Documentation (D9):**
  - **README:** it has the three new instrument rows, the path forms table and the gallery image.
  - **ARCHITECTURE.md:** its data feed and store sections cover the footer-data attachment.
  - **ADR:** `docs/adr/0010-a-variable-declares-the-forms-it-accepts.md` exists.
  - **AGENTS.md:** it was updated.

### Correctness
I ran the real `parseFormat` and `resolveFormat` against the shipped `path`, `model` and `status` declarations. Every statusline scenario I probed matched the spec:

| Input | Rendered or result |
|---|---|
| `$path`, `$path\|base` | `pi-jefferson` |
| `$path\|absolute` | the full directory |
| `$path\|relative` | `~/Projects/pi-jefferson` |
| `$path\|relative` with the directory at home | `~` |
| `$path\|relative` outside home (`/opt/work`) | `/opt/work` |
| `$path\|relative`, home `/Users/joelleibow`, directory `/Users/joelleibow2/app` | `/Users/joelleibow2/app` |
| `$path\|relative`, home with a trailing separator | `~/Projects` |
| `$path\|relative` with home unknown | the absolute path |
| `$path\|relative` with the directory unknown | empty |
| `$path\|relative\|bold` | the relative form, bold |
| `$path\|relative\|capitalize` | form applied first, then the modifier |
| `hello\|base`, `$model\|base`, `$path\|bold\|absolute`, `$path\|base\|absolute` | rejected, warning names the instrument and the modifier |
| `status` over `{b:"idle", a:"3 tasks", c:" \n\t "}` | `3 tasks idle` |
| `status` with only whitespace | empty, so no label |

The branch and session-name seeding, push, same-value no-repaint and unknown mapping are in the store setters. A repaint fires only when the held value changes. The cases for `null`, `""`, an undefined name, an empty status map and a throwing home reader are each asserted in the tests.

**Footer-data attachment:** `attachFooterData` guards all three cases the spec names:
- An attach after release returns early.
- A second attach releases the first subscription.
- A branch callback after release is ignored.

`release` unsubscribes the branch and disposes the store.

### Coherence
D1 to D8 are followed. The feed holds the structural footer shape, one release owns every subscription, and `status.ts` imports only `instrument.ts`. The "export pin" rewrite and the 10-instrument counts are in the tests.

### Issues

**CRITICAL:** none.

**WARNING:** none.

**SUGGESTION**
1. **`defaultForm` is declared and never read.**
   - **Location:** `components/instruments/instrument.ts:20`, set at `components/instruments/path.ts:29`; `grep defaultForm extensions` finds no reader.
   - **Evidence:** a bare `$path` renders through `variables.path` (`path.ts:28`), a separate reference to the same `base` function. The spec says one form is "the default a bare variable hands out", and AGENTS.md tells authors to declare `{ defaultForm, byName }`. Nothing ties the two together, so a future form could set `defaultForm` and silently change nothing.
   - **Recommendation:** either have `parseFormat` or `resolveFormat` treat a bare variable as its `defaultForm`, or drop the field and the AGENTS.md wording. A test that `$path` equals `$path|base` exists at `tests/instrument.test.ts:194`, so the behaviour is pinned today.
2. **A feed test depends on the host's home directory.**
   - **Location:** `tests/session-data-feed.test.ts:60-61`.
   - **Evidence:** the test sets `process.env.HOME` and asserts that `homedir()` returns it. That holds on POSIX. On a platform where `os.homedir()` reads `USERPROFILE` it would fail. `.github/workflows/ci.yml` exists; I did not read its runner.
   - **Recommendation:** none needed if CI is POSIX. Otherwise assert on the injected reader only.
3. **The PR is wider than this change.**
   - **Evidence:** the PR title and diff include the source-layout restructure (100 files; the archived `intuitive-source-layout` and the `extension-source-layout` spec edit) as well as this change.
   - **Recommendation:** none for this verification. Treat the layout half as covered by its own archive.

### Final assessment
No critical issues, no warnings, 3 suggestions. Not verified: **task 9.3**, Joel's live check.

I could not observe `footerData` reaching the feed in a real pi session, a real extension's statuses, `/jefferson`, or a `setCwd` switch. The tests fake all of that at the host boundary. Not ready for archive until 9.3 is ticked with Joel's own observation.

Not checked: any live pi TUI behaviour; the CI runner platform; `scope.sh`, and `testdiff.sh` against D8's list by hand; the PR's layout half beyond the checks that run over the whole tree.
