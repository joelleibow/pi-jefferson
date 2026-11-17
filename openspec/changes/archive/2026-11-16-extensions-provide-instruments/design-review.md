# Design Review

Four stages over `design.md`, in two runs. Run `08e961e8` failed at round 5's structural lens on a
timeout and resumed as `44ff4261` at round 5, reusing that round's critic report and rerunning the
structural lens (`s3-r5-structural-retry.md`). Stage 0 landed before Stage 1: Joel's ruling on the two
channel names (`owner-rulings.md`, 2026-11-15, "The two channel names") replaced the design's one open
item, and Bambadjan folded `jefferson:registration` and `jefferson:update` through decision 18 and every
artifact that referred to the channels. The record's stage log and settled list are in
`design-review-result.json`.

## Stage 1: Initial Zoom Out

`s1-zoom-out.md` returned `needs_fixes` with one major finding and two minor ones. `s1-catalyst.md`
raised none.

- **ZO-S1-1 (major, propose_fix): the notice identity's home.** The design put `NOTICE_INSTRUMENT` in
  `data/notice.ts` on the false premise that the notice declaration lives there; that file owns pi's
  host-notice rules and values, while the declaration and `NOTICE_SECONDS` are in
  `components/instruments/notice.ts`. Michael found the defect wider than the reviewer stated: taken
  literally, an instrument file would import a value from `data/`, and the design never said where
  `NOTICE_SECONDS` or the fallback came from once `configuration.ts` stopped importing them.
- **ZO-S1-2 (minor, declined): the late-binding holder.** The nested `holder` is an extra indirection
  where `Cell.instrument` is already mutable; equivalent behaviour, no decision violated.
- **ZO-S1-3 (minor, declined): two citation slips.** The binding row named a root-level file that does
  not exist, and line 223 attributed `:299-300` to the wrong module. The layout delta already pins the
  binding module's home, so neither slip can pass a later gate.

The lens also confirmed the direction: the event-based registry is the feature the rulings require,
it reuses the existing declaration, binding, format, store and renderer paths, and it adds no parallel
renderer, second declaration vocabulary, service container or compatibility framework.

## Stage 2: Comprehension Test

`s2-comprehension.md`, doc-only over `design.md` alone, returned `needs_fixes`.

**What this proposes (naive paraphrase):**

The design lets extensions register named footer instruments and report their own field values over two event-bus channels, using a published types-only contract. Jefferson registers its built-in instruments through the same registry, validates provider data and settings, and isolates provider rendering failures. Configured instruments that register late replace a blank placeholder without rebuilding the footer, while warnings are delayed and deduplicated per session. The change also adds an author guide, updates packaging and contributor documentation, and ships as a minor release.

**How the existing system works, per design.md:**

Today, footer instruments come only from declarations compiled into Jefferson, and an installed footer copies each cell's width behavior when its tree is built. The event bus is synchronous, anonymous and has no replay, so an extension can emit before Jefferson subscribes. Session-start handlers run sequentially, and the host has no documented startup-completed event; the design identifies resources_discover as a usable but undocumented ordering point.

The six findings the paraphrase exposed, and what each named:

- **COM-1 (major, declined): "the six-line handshake" is never defined.** The provider sequence is
  specified across decisions 3, 12 and 18 and in Risks, so nothing a coder builds depends on the
  phrase. Michael recorded one docs-pass note: "handshake" is the wrong word, because Jefferson sends
  nothing back (D5).
- **COM-2 (major, propose_fix): how several registrations from one extension combine.** The design
  never said whether a partial registration registers its good parts, which fault is reported when
  there are several, or what a repeated name inside one registration does.
- **COM-3 (major, propose_fix): `null` had two answers.** Decision 10's Why called `undefined` and
  `null` both the type's own unknown, while the contract types a resolver as `string | undefined` and
  `bar` — the only member typed with `null` — is excluded from the contract.
- **COM-4 (major, propose_fix): the message table did not match its own rule.** Decision 15 said every
  part carries a `<scope>: ` prefix, and no part does; decision 7 deduped "by scope and kind" and
  defined neither; and unnamed payloads had no scope at all.
- **COM-5 (major, propose_fix): the harness's second session had no reset.** In production one factory
  sees one session, but the harness drives several, and only registrations and values had a documented
  clear.
- **COM-6 (minor, declined): `FOUNDATIONAL_OPTIONS` named but not listed.** The keys are format, style
  and label; the statusline delta names them, so listing them in the design would be a third copy.

## Stage 3: Critic Review Loop

Five rounds against `feature-spec-standard.md`, with Michael as Resolver: **needs_fixes, clean,
needs_fixes, clean, clean**. It closed on two consecutive clean rounds at 4 and 5, inside the
five-round cap, with no churn stop. The rounds raised 32 findings — 6 propose_fix and 26 declined;
with Stage 1 and Stage 2 that is 41 findings and 11 fixes applied across the whole review. Round 5's
structural lens timed out in the first run and was rerun in the resumed run.

**Round 1** (`s3-r1-critic.md`, `s3-r1-structural.md`) — 13 findings, `needs_fixes`.

- **CR-1 (blocking, propose_fix):** a provider's `defaultFormat` and `defaultLabel` were first consumed
  at bind time, outside both the J1(b) check and the containment boundary. A parse error escaped
  `readConfiguration` (provider first) or reached only `console.error` (Jefferson first).
- **CR-2 (major, propose_fix):** one catch around the whole bound render could not see a returned
  value, so every bad result arrived as `collapse`'s `TypeError` and a rejecting promise killed pi.
- **CR-3 (major, propose_fix):** the unknown-name list was fixed at read time and delivered unchanged,
  so a provider registering from its own `session_start` was warned as unknown while it rendered.
- **CR-4 (major, propose_fix):** the shutdown clear rode a route that runs again at the next
  `session_start`, which would wipe a fault or registration that arrived before it.
- **CR-5 (major, propose_fix):** the sample-provider type check M23 requires had no file, no runner and
  three inconsistent descriptions.
- **CR-6 … CR-11 (minor, declined)** and **ST-R3-1, ST-R3-2 (minor, declined)**: resolver and field
  grammar edges, a redundant `invalidate()`, a stale repaint entry point, a deep-freeze request, the
  rollback wording, the export-pin argument, a living clause the delta drops, and proposal drift.

**Round 2** (`s3-r2-michael.md`) — 8 minor findings, all declined, `clean`: the path the unknown-name
warning must print, an unplaced instrument's skipped J1(b) check, an exact `exports` guard, an
unscoped copy sentence, a payload whose property access throws, a missing `fields`-shape row, a partial
test list, and whether a `statusline` clause is owed for reading `fills` per plan.

**Round 3** (`s3-r3-michael.md`) — 5 findings, `needs_fixes`.

- **CR-R3-1 (major, propose_fix):** in Jefferson-first order a row's configured format, label and style
  were dropped before any check, so the same document rendered the user's settings when the provider
  loaded first and the provider's defaults when it did not. Michael measured that a parsed entry set
  into the read's own map before the late bind is the one that renders.
- **CR-R3-2, CR-R3-3, CR-R3-4 (minor, declined)** and **ST-R3-1 (round 3; minor, declined)**: written
  spelling in rejection messages, how the J1(b) check distinguishes a parse fault, unnamed channel type
  aliases, and a Risks sentence still stating T11's pre-fixture premise. The structural lens reused an
  id, so Michael recorded it as "ST-R3-1 (round 3)" to keep it apart from the settled dropped-clause
  finding.

**Round 4** (`s3-r4-michael.md`) — 2 minor findings, both declined, `clean`: an unreachable
`invalidate()` route with no named repaint route (the route already exists in `startup.ts`), and
whether a registration with no fields is accepted (it follows from `fields?`, M9 and the merge rule).

**Round 5** (`s3-r5-michael.md`, `s3-r5-structural-retry.md`) — 4 minor findings, all declined,
`clean`: five test files missing from the modified-files table, the inline `import { type X }` trap,
resolvers running several times per frame, and whether `faults.ts` needs a stated home in the
extension-source-layout delta.

## Stage 4: Intermediate Zoom Out

`s4-zoom-out.md` passed with **no findings**. Its audit is explicit on the point the stage exists for:
the Stage 2–3 edits closed acceptance, containment, late-configuration and session-lifecycle gaps
without adding a parallel renderer, a second declaration vocabulary, a service layer or a runtime
contract helper. Acceptance reuses `parseFormat` and the existing binding module; late settings update
the read's configured map before its existing memoized bind; deferred unknown-name delivery keeps the
configuration module's composer; lifecycle ownership stays in `startup.ts`; the two fixture files
extend the existing tarball check rather than adding a build system. It also confirmed Stage 1's
notice-placement issue is resolved, with identity on the declaration and `shipped.ts` supplying the
reader's gate.

## Michael's Resolutions

Eleven propose_fix resolutions were applied to `design.md` (and, where the finding named it, to the
relevant spec delta, `proposal.md` or `council.md`); thirty were declined with a reason recorded. Each
resolution below cites the file that carries its rationale and evidence.

| Finding | Resolution and what it changed | Michael file |
|---|---|---|
| ZO-S1-1 | **Applied.** Deleted the `data/notice.ts` row and the `NOTICE_INSTRUMENT` constant; `shipped.ts` exports `SHIPPED` plus `FALLBACK` and `NOTICE_GATE`; decision 8's source carries the fallback and the gate (name and default seconds), and `configuration.ts` imports neither `blank.ts` nor `notice.ts`; the pin records three exports; the Why states that the name lives once, on the declaration. | `s1-michael.md` |
| COM-2 | **Applied.** Decision 6 gained "The acceptance unit is one registration" (whole-registration check, first fault refuses all, several registrations per session, field merge with same-type kept and different-type refused, a repeated name refused); decision 15 gained the repeated-name row and reworded the duplicate-type situation; the spec scenario was reworded; four tests were added. | `s2-michael.md` |
| COM-3 | **Applied.** Decision 10's Why now separates `undefined` (the type's own unknown) from `null` (bar's, and bar is not in the contract); the non-string row became a template with the `<what>` vocabulary; the guide line states that `null` is a fault; `council.md`'s containment sentence was corrected. | `s2-michael.md` |
| COM-4 | **Applied.** Decision 15 now says a part is exactly the table's text and the scope is not printed, that every part pending at one delivery joins one notice in arrival order, and gives two worked examples; three report rows were added and the wrong-type row became a template; decision 7 defines a kind (one table row), a scope (three cases) and the two delivery moments. | `s2-michael.md` |
| COM-5 | **Applied.** New decision 19 names the operation for each piece of per-session state, the two binding points, the watch's owner, the read's unknown names, and the factory-lifetime rule; decisions 7, 9 and 12 refer to it; the harness Risks bullet now names the points and asserts the three two-session outcomes. | `s2-michael.md` |
| CR-1 | **Applied.** Decision 6 gained "Acceptance checks what binding consumes" (a non-function resolver, a non-string label, and the default-format parse, all refused as one registration); `instrument-binding.ts` owns the adapter `adaptProvidedDeclaration`, the listener depends on `format.ts` and the binding, the pin records the export with its argument, three message rows were added, and four tests. | `s3-r1-michael.md` |
| CR-2 | **Applied.** Decision 10 became two parts — the result check inside the adapter (thenable first with a no-op rejection handler, string or `undefined` passing, anything else by `<what>`) and the outer boundary around the bound render — with M8's wording corrected narrowly and four containment tests. | `s3-r1-michael.md` |
| CR-3 | **Applied.** The read returns `unknownNames` as data; the `resources_discover` handler drops the names the registry answers, composes the rest with `configuration.ts`'s `acceptedWarning`, and stays silent when nothing remains; the configuration row names the field and the composer; two Jefferson-first tests were added. | `s3-r1-michael.md` |
| CR-4 | **Applied.** Decision 19's shutdown now runs three steps in order — the release closure (which runs `releaseWatches()`), the provider clear, then `faults.close()` — with the last two in the handler body and never inside the closure; item 3 states why running it twice is safe; the two-session test gained the provider-first session-two case. | `s3-r1-michael.md` |
| CR-5 | **Applied.** The placement table gained `tests/fixtures/sample-provider/provider.mts` and its `tsconfig.json` and the count moved to eight; the pack step's fixture check was pinned in decision 2 and the ci.yml row; decision 14, Risks and Migration step 1 now point at it without restating flags. | `s3-r1-michael.md` |
| CR-R3-1 | **Applied.** Decision 9's late binding became the watch-and-`apply` mechanism (one watch per name with the raw value, the read's theme and its mutable map plus `bind`; check, then set the parsed entry into the map before the bind, then update every holder and repaint once; a fault records once and leaves the holders on `blank`); decision 13 points at `apply` and states both moments run one check function; two Jefferson-first tests were added. | `s3-r3-michael.md` |

Every other finding was declined with its reason in the same files: 2 in Stage 1, 2 in Stage 2, 8 in
round 1, 8 in round 2, 4 in round 3, 2 in round 4 and 4 in round 5.

## Settled Findings

The settled record accumulates **125 entries across the seven finding rounds**, because each round
re-appends the ones already closed; deduplicated, they are **30 distinct declined findings** plus one
lens note. None is open, and each carries a "do not re-open unless …" condition so a later gate can
tell a regression from a re-argument. Grouped by what they close:

- **Late binding and the renderer.** ZO-S1-2 (the holder is an accepted indirection over the already
  mutable `Cell.instrument`), ZO-S1-3 (two citation slips), CR-7 (decision 9's `invalidate()` step is
  redundant because the text cache is keyed by sample identity), CR-R4-1 (the late-binding repaint
  rides `startup.ts`'s existing entry point; `footer-setup.ts` does not change), ST-R2-2 (no
  `statusline` clause is owed for reading `fills` per plan; decision 9's conditional sentence is dead
  text).
- **Fault bookkeeping and delivery.** CR-8 (in production the holding's repaint entry point never
  outlives its session), CR-R2-1 (the read does not return the path its warning must print; the
  implementation gate holds the path to the read's own choice), CR-R2-5 (a payload whose property
  access throws reaches only `console.error`, and nothing is half-registered), CR-R2-6 (a `fields`
  value of the wrong shape has no table row, though its refusal is already specified), CR-R3-3 (how
  the J1(b) check tells one parse fault from another is local to one function, and the exact-string
  tests catch a misroute).
- **Provider code edges.** CR-6 (an unnameable resolver key, a `bar` key, a prototype-named field and a
  resolver writing into its own view cost only that provider's entries), CR-R2-2 (a name only the
  instruments block configures is unwatched, and it renders nothing anyway), CR-R2-4 (decision 6's
  copy sentence is scoped by decisions 8 and 10 and by the adapter's view), CR-R3-2 (the six existing
  tests that pin the written spelling hold the rename to that outcome).
- **Identity and safety.** CR-9 (deep-freezing Jefferson's own payload is declined: identity guards
  forged and accidental claims, and a same-process mutator is outside the trust boundary).
- **Packaging and CI.** CR-11 (every new export carries the same argument, and the pin covers each new
  file), CR-R2-3 (nothing compares `exports` exactly, but the delta's requirement binds this change and
  a second subpath would be its own reviewed change).
- **Naming.** CR-R3-4 (the two channel type aliases are unnamed; the strings are fixed by ruling, so
  the alias is only a label).
- **Requirements and prose.** ST-R3-1 (the delta drops "and what would change it" from a living
  requirement; no ruling removes the clause, so it is a one-phrase edit and not an owner question),
  ST-R3-2 (the proposal's layout summary drifted), ST-R4-1 (a registration with no fields is accepted,
  which follows from `fields?`, M9 and the merge rule; only the spec's wording is uncalibrated),
  ST-R3-1 (round 3; the compiler-flags Risks sentence still states T11's pre-fixture premise).
- **Inventory.** ST-R2-1 (decision 14's test list is partial; the spec scenarios, decision 15's
  every-row assertion and the Risks tests carry the rest), CR-R5-1 (five test files are missing from
  the modified-files table; typecheck fails until they are done, and Stage 5 holds `tasks.md` to it).
- **Layout.** ST-R5-1 (`faults.ts` directly under the load root falsifies no delta requirement: the
  ruled-homes list is a floor, its name states its responsibility, and every fault it holds is a
  provider's).
- **Docs-only, under Joel's standing ruling that documentation never blocks.** COM-1 ("handshake" is
  the wrong word), COM-6 (`FOUNDATIONAL_OPTIONS` is not listed), CR-10 (the rollback sentence fails
  only for documents that adopted `jefferson.default.*`), CR-R5-2 (the inline `import { type X }`
  emits a runtime import; the guide warns about it), CR-R5-3 (author guidance to keep resolvers cheap
  and pure).
- **Lens note.** `s1-catalyst.md` raised no findings in its round.

## Owner Decisions Required

**None.** No round escalated an item: every `owner_decisions` array in `s1-michael.md`,
`s2-michael.md` and `s3-r1-michael.md` through `s3-r5-michael.md` is empty, and the two owner
questions the lenses raised (Readiness's warning wording and the structural lens's dropped-clause
challenge) were settled inside the review — the first by M4's message table, the second because no
ruling removes the clause it asked about. The one item that did need Joel, the two channel names, was
already his and withdrew at Stage 0 (`owner-rulings.md`, 2026-11-15, "The two channel names"), so
`tasks.md` may begin.
