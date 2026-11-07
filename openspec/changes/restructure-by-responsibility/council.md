# Council Synthesis

## Question and Scope

What design should the restructure take, and are `proposal.md` and the delta spec the right basis for it? Three parts: whether Joel's complaint requires splitting responsibilities out of existing files or only moving files; what shape of directories and files makes each responsibility's home recognizable from its path without layers, ports or injection seams; and what must change in the proposal or spec before `design.md` is drafted.

Evidence the advisors were handed: `owner-rulings.md`, `proposal.md`, `specs/extension-source-layout/spec.md`, `research-chidi.md`, `research-eleanor.md`, `michael-orientation.md`, and the "The design gate (PL4)" section of `michael-the-architect.md`. Neither advisor read the repository, and neither requested an addendum.

## Perspectives & Trade-offs

**Agreement (both advisors, and Michael's orientation).**

- **Extraction, not relocation.** Joel's complaint names three tangled things in the entry (startup, config paths, footer setup) and two in `configuration.ts` (document loading, instrument binding). Moving the five existing files into subdirectories leaves every one of them intact. The data store already imports no local file and `Readings` crosses to the visuals as a type only, so data and visuals need preserving rather than separating (`research-eleanor.md` §2 and §3).
- **The load shape holds.** `extensions/jefferson.ts` stays the one entry, `package.json` `pi.extensions` stays unchanged, and every new file lives under `extensions/jefferson/`. Subdirectories are safe at any depth because the manifest is the allowlist (`research-chidi.md` §1).
- **Plain imports, one direction.** No registry, container, port or injection seam; relative imports name the file with `.ts` (ADR 0001; `research-chidi.md` §5).
- **The acyclic check and the export pin ride in the change.** No standing check enforces the no-cycle rule, so the design states the graph and the verification shows it. The pin in `tests/jefferson.test.ts` is rewritten per new file and argued against `statusline`'s no-contribution requirement.
- **The reload order stays.** Release the previous install, then store, subscriptions, configuration, footer, with one release disposing all of it (`research-eleanor.md` §3; `research-chidi.md` §3).

**Where the advisors differ (design choices, not disputes over evidence).**

- *Where `Cell`, `CellAlign` and `Row` live.* `council-argon` moves them to the row renderer, removing the renderer's type import from `configuration.ts` and re-exporting types so the tests stay as they are. `council-kimi` leaves them in the configuration home and notes the design may place them elsewhere if the graph stays acyclic.
- *Where the instrument-binding code lands.* Both move it out of `configuration.ts` into the visuals home. `council-argon` puts it in `format.ts` because `instrument.ts` importing `format.ts` while `format.ts` already imports `InstrumentDeclaration` closes a cycle.
- *Directory names.* `council-argon` proposes `config/`, `footer/`, `data/` and `visuals/` beside a `startup.ts`; `council-kimi` proposes one file per responsibility and a grouping directory only where a responsibility owns several files (visuals).

## Synthesis & Recommendation

Draft the design as an **extraction**: the entry reduced to registering the extension and handing off to a startup unit; config-path resolution moved beside document loading; the `setFooter` component adapter in its own footer-setup unit; instrument binding moved out of `configuration.ts` into the visuals; the store untouched. Each responsibility gets a home named for it, grouped under `extensions/jefferson/` only where a grouping directory earns its stated membership and import rule. The proposal's open question is answered by Joel's own words and Eleanor's map, so it does not go to Joel. The design names the seams it extracts, says in a sentence what would change each new unit, states the import graph, and reconciles the export pin per new file.

## Accepted & Rejected Feedback

**Accepted**

- Extraction over relocation (both advisors; Michael's orientation, §4). It follows from Joel's quoted verbs and Eleanor's file-by-file map.
- Close the proposal's open question with that answer, citing this memo; `council-kimi` is right that sending it to Joel asks him to re-rule what he already said.
- Add startup to the spec scenario "Looking for a responsibility" (`council-argon`). It lists four of the five today.
- Trace the two boyscout fixes through the design and tasks (`council-argon`), so each reaches a task Michael's plan gate can check.
- State the new import graph and run the acyclic check in the change; rewrite the export pin per new file with its argument (both).
- Keep the wiring order and the single release (`council-kimi`).

**Rejected or left to the design**

- `council-argon`'s tightening of "Data and its updates do not depend on visuals or process flow" so visuals may not import configuration, footer or startup. Nothing recorded in a ruling, ADR or research report supports that constraint, and the acyclic requirement already forbids the cycle Argon describes. Whether `Cell` and `Row` move is a design choice the graph must justify.
- `council-argon`'s file and directory names, and `council-kimi`'s. Both are advice; the design names the homes.
- `council-kimi`'s claim that the vocabulary paraphrase in `owner-rulings.md` needed no correction. It was corrected already, per Michael's note, so no action remains.
- `council-kimi`'s note that "243 tests" in the spec is point-in-time. The operative clause is "every test that passed before", and the count is a cited source only.
- Both advisors mark several assumptions "verified" while holding no repository access. Those are inferences from Eleanor's report, treated here as unverified; the design gate and Derek's run settle them.

## Owner Decisions Required

None. The split-or-move question follows from Joel's recorded words, and every other open item is a design choice. A new ruling from Joel that he meant relocation only would reverse this.

## Evidence and run ids

Roster: `council-kimi` and `council-argon`, both requested in fresh context, pass cap 2. Pass 1 only; both reports recommend extraction and no material disputed claim could change that recommendation, so Pass 2 was not run. Run ids: `council-kimi` `8d51269a-d7f0-4eea-ae9b-19bb5a999065`, `council-argon` `d979f54f-32be-42ed-b567-7fa6b608d135`. Confidence: high from both. What would change the decision: Joel ruling relocation only, or evidence the export pin cannot be rewritten per new file without weakening the no-contribution requirement.
