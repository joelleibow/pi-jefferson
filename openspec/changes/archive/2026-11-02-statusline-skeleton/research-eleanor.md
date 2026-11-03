# Eleanor research: what exists in this repository today, and where the statusline skeleton lands

Repo: `/Users/joelleibow/Projects/pi-jefferson` at HEAD (`main`, clean of uncommitted source edits).
`pi-jefferson` 0.1.1 — an npm package that is also a pi extension. It is still a name-claim
stub: one shipped source file, one test file, CI, a release workflow, and OpenSpec scaffolding.
No statusline code exists, and the working-parts directory `extensions/jefferson/` does not
exist on disk yet. This change (`statusline-skeleton`) would create it.

## Question and Scope

**Question.** What exists in this repository today, and where would the `statusline-skeleton`
feature land?

**Scope.** (1) The current tree — the extension entry, `package.json`, the test suite,
`tsconfig.json`. (2) The settled layout contract at
`openspec/specs/extension-source-layout/spec.md` and the archived change that produced it.
(3) Where a footer component and a configuration reader would live, and which file may hold a
runtime import of a host package. (4) The CI guard in `.github/workflows/ci.yml` and its
constraint on the shipped tarball. (5) Any existing configuration surface, or confirmation
there is none. (6) How the extension is loaded and verified today, including the discovery
command used by the archived change's tasks. Nothing here judges the design or recommends a
structure; where the feature's code would sit is read from the settled spec, not invented.

## Sources / Files Examined

Read in full unless noted:

| File | Status | What it establishes |
|---|---|---|
| `extensions/jefferson.ts` | read | the whole shipped source: header contract, `VERSION`, one registered command |
| `tests/jefferson.test.ts` | read | the whole committed suite: 2 tests, `node:test` + `assert/strict`, fake `ExtensionAPI` |
| `package.json` | read | `pi.extensions` field, `files`, `peerDependencies`, `scripts`, `packageManager`, `publishConfig` |
| `tsconfig.json` | read | `include: ["extensions/**/*.ts", "tests/**/*.ts"]`, `noEmit`, `allowImportingTsExtensions`, strict set |
| `openspec/specs/extension-source-layout/spec.md` | read (full, 158 lines) | the 8 settled requirements, verbatim roles below |
| `openspec/changes/archive/2026-11-02-code-structure/` — `proposal.md`, `design.md`, `tasks.md`, `council.md`, `research-chidi.md`, `research-eleanor.md`, `specs/extension-source-layout/spec.md`, `.openspec.yaml`, gate verdicts | read (`design.md` lines 1–120 + referenced sections; `tasks.md` full 340 lines) | the change that produced the spec; D1–D6 decisions; the discovery command; the measured host mechanics |
| `.github/workflows/ci.yml` | read | the invariant tarball/load-contract guard |
| `.github/workflows/release.yml` | read (lines 1–80) | release-on-merge, label bumps, OIDC trusted publishing |
| `README.md` | read | tests-never-beside-extensions rule, peer-deps rationale, release contract |
| `openspec/config.yaml` | read | `schema: spec-driven`, no `context`/`rules` — nothing project-specific constrains artifacts |
| `pnpm-workspace.yaml` | read | deliberate build-script denials only, no packages |
| `openspec/changes/statusline-skeleton/.openspec.yaml` | read | this change's grounding state (see Unknowns) |
| `CLAUDE.md`, `AGENTS.md` | **absent** | verified by `ls` at the root — none exists |
| `ARCHITECTURE.md` | **absent** | no architecture doc exists |
| ADR tree (`docs/adr/`, `adr/`, `decisions/`) | **absent** | verified by `find` — no decision records anywhere in the repo |

Commands run live against this tree, all green:

- `node --test` → 2 tests, 2 pass, 0 fail.
- `pnpm typecheck` (`tsc --noEmit`) → exit 0.
- `pnpm pack --dry-run --json` → ships exactly `extensions/jefferson.ts`, `LICENSE`,
  `package.json`, `README.md`.
- The archived change's discovery command (tasks 4.1, verbatim) → `count: 1`,
  `resolvedPath: /Users/joelleibow/Projects/pi-jefferson/extensions/jefferson.ts`,
  `commands: [ 'jefferson' ]`, `notified: ["pi-jefferson 0.0.0-alpha — the statusline is not
  built yet."]`, `errors: []`.

## Findings

### 1. The current tree

```
pi-jefferson/
├── .github/            CODEOWNERS, scripts/next-version.mjs, workflows/{ci,release}.yml
├── .pi/                skills/ (openspec skills) — local-only
├── extensions/         jefferson.ts            ← the ONLY shipped source file
│                       (jefferson/ does NOT exist yet — this change would create it)
├── openspec/           config.yaml
│   ├── specs/          extension-source-layout/spec.md   ← the one settled spec
│   └── changes/        statusline-skeleton/ (.openspec.yaml only)
│       └── archive/    2026-11-02-code-structure/
├── tests/              jefferson.test.ts       ← the only test file
├── package.json        declares the load root: "pi": { "extensions": ["./extensions/jefferson.ts"] }
├── tsconfig.json       README.md  LICENSE  .gitignore  pnpm-lock.yaml  pnpm-workspace.yaml
```

**`extensions/jefferson.ts`** (the entire shipped source, 1606 bytes): a header doc comment
stating the load contract, then a type-only import — `import type { ExtensionAPI } from
"@earendil-works/pi-coding-agent"` — an exported `VERSION = "0.0.0-alpha"`, and a default
export: a factory that registers exactly one command, `jefferson`, whose handler notifies
`pi-jefferson ${VERSION} — the statusline is not built yet.` The header itself states the rule
this change cares about: *this file is the entry and the only module that may contain a
runtime import of a host package (`@earendil-works/*`); modules under `extensions/jefferson/`
import each other by relative path and use `import type` for host types.*

**`package.json`**: `name: pi-jefferson`, `version: 0.1.1`, `type: module`,
`packageManager: pnpm@12.17.0`, `license: MIT`. `"pi": { "extensions":
["./extensions/jefferson.ts"] }` — the manifest field declaring the load root; with a `pi`
field present, the host takes the manifest branch and never scans `extensions/`.
`files: ["extensions", "README.md", "LICENSE"]` — the whole `extensions/` tree ships, so any
new module under `extensions/jefferson/` ships with no `files` edit. `peerDependencies`:
`@earendil-works/pi-coding-agent: "*"` and `@earendil-works/pi-tui: "*"`, both absent from
`dependencies`. `devDependencies`: those two hosts (`^1.4.0`), `typescript ^7.0.2`,
`@types/node ^26.6.6`. `scripts`: `test: "node --test"`, `typecheck: "tsc --noEmit"` — no
build step, no lint. `publishConfig: { access: public, provenance: true }`.

**The test suite** (`tests/jefferson.test.ts`, the whole committed suite): two `node:test`
tests against a fake `ExtensionAPI` — "registers exactly one command" (asserts the command map
is exactly `["jefferson"]`) and "the alpha announces that it is a name claim and nothing more"
(asserts the notify text and `VERSION === "0.0.0-alpha"`). Both pass. Its header states why
tests live in `tests/`: pi loads every direct `.ts` file in `extensions/` as an extension, so a
test beside one would execute on every pi start.

**`tsconfig.json`**: `target/lib ES2023`, `module`/`moduleResolution: nodenext`, `strict`,
`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`,
`allowImportingTsExtensions`, `noEmit`, `skipLibCheck`, `types: ["node"]`.
`include: ["extensions/**/*.ts", "tests/**/*.ts"]` — a new file under `extensions/jefferson/`
is typechecked with no `include` edit.

### 2. The settled layout contract

`openspec/specs/extension-source-layout/spec.md` is the one established spec, produced by the
archived change `2026-11-02-code-structure` (gates `council_owner`, `design`, `tasks` all
approved; its spec delta at `archive/2026-11-02-code-structure/specs/extension-source-layout/spec.md`
is the same text marked `ADDED`). Eight requirements, all MUST:

1. **One host-loaded entry per extension** — exactly one entry per extension,
   default-exporting a factory; helper modules are never discoverable; adding one changes
   nothing.
2. **The load root is singular and stated** — one mechanism identifies the load root; this
   repo's is the `package.json` `pi.extensions` array naming `./extensions/jefferson.ts`.
3. **Tests never occupy a loadable or shipped path** — tests live under `tests/`, never in the
   tarball.
4. **Host packages are imported only at the load boundary** — `@earendil-works/*` are
   `*`-ranged `peerDependencies`, never `dependencies`; **runtime** imports of host packages
   occur **only in the entry** `extensions/jefferson.ts`; `import type` is permitted in any
   module.
5. **Every shipped source file is typechecked and erasable** — must match `tsconfig` `include`
   (`extensions/**/*.ts` already covers `extensions/jefferson/**`); only erasable TypeScript:
   no `enum`, parameter properties, runtime `namespace`, decorators. No build step, ever.
6. **The published file set is deliberate** — CI asserts the set by invariant (allowed roots,
   entry presence, no test files, the load root's value), not an enumerated list, so an
   ordinary new module needs no CI edit.
7. **Responsibility is inferable from path** — every module is named for the behavior or data
   it owns; `utils`/`helpers`/`misc`/`common` must not exist.
8. **Growth is a named change** — a module following the established pattern (a new file under
   `extensions/jefferson/`) requires no edit to `package.json`, `tsconfig.json`, or CI. A new
   source root, a second entry, or a new structural rule is a named OpenSpec change.

The archived change's settled shape (its `.openspec.yaml` and `design.md` D1): the manifest
names the **file** `./extensions/jefferson.ts`, `extensions/jefferson/` beside it holds the
working parts, and one convention: an import from the entry must name a file inside the
directory (`./jefferson/rows.ts`), because the directory shares its stem with the entry and
`moduleResolution: nodenext` rejects a bare `./jefferson` (TS2835, measured).

### 3. Where the footer component and the configuration reader would land

Given the contract, the feature's parts have exactly one place each:

- **`extensions/jefferson.ts`** — the entry. It is the **only** file that may hold a runtime
  import of a host package (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`). Any
  host API the footer needs at runtime — whatever surface pi exposes for statuslines/footer
  rendering — is imported here. It imports the working parts by relative path, naming the
  file: `./jefferson/<module>.ts`.
- **`extensions/jefferson/`** (to be created by this change) — the working parts. A footer
  renderer module and a configuration reader module each land here, named for the behavior or
  data they own (e.g. something like `rows`/`statusline` — the exact names are this change's
  to choose, subject to requirement 7). They import each other by relative path, use
  `import type` for host types, contain no runtime host import, and use only erasable
  syntax. The host never enumerates this directory.
- **`tests/`** — new tests for the renderer and the config reader, importing the source by
  relative path (`../extensions/jefferson/<module>.ts`).

`package.json` `files`, `tsconfig.json` `include`, and CI all already cover the directory
(`files: ["extensions", …]` ships it; `extensions/**/*.ts` typechecks it; the guard allows
anything under `extensions/`) — requirement 8 means **none of the three is touched** by an
ordinary module added there.

### 4. The CI guard

`.github/workflows/ci.yml` (PR and push to `main`): checkout → pnpm → Node 26 with pnpm cache
→ `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm test` → the guard step "The
tarball and the load contract are what we expect". The guard packs twice — `pnpm pack
--dry-run --json` for the file list, and a real tarball whose `package/package.json` is
extracted (because pnpm rewrites the manifest it packs) — then asserts **invariants**, not a
list:

- every shipped path is one of `package.json`, `README.md`, `LICENSE`, or under `extensions/`;
- the declared entry `extensions/jefferson.ts` is shipped;
- no `*.test.ts` ships;
- `pi.extensions` is exactly `["./extensions/jefferson.ts"]`.

**What a new module under `extensions/jefferson/` may do:** exist, ship, be typechecked, and
pass CI with zero edits to the manifest, `tsconfig`, or the workflow — this is requirement 8's
ordinary-module case, proven green in the archived change's task 3.4 with a real
`extensions/jefferson/rows.ts` scratch module. **What it may not do:** contain a runtime import
of a host package (only the entry may — requirement 4), use non-erasable TypeScript
(`npm test` executes it under Node type stripping — requirement 5), sit outside `extensions/`
or ship as a test file (the guard fails both). Note the guard allows *anything* under
`extensions/` — a stray test file placed directly in `extensions/` would ship and pass the
tarball guard but would be host-loaded as an extension, which is why tests live in `tests/`
(requirement 3).

### 5. Configuration surface

**None exists.** Verified: no `getSettings`, settings, or config reading anywhere in
`extensions/` or `tests/` (repo-wide grep); no settings file, no `pi-jefferson` config
module, no schema. The only "config" artifacts are `openspec/config.yaml` (OpenSpec workflow
schema, not extension runtime config) and `package.json`'s `pi` field (the extension *load*
declaration, not user configuration). This change's `.openspec.yaml` records the open design
fact: *pi's `getSettings()` exposes no free-form per-extension block, so pi-jefferson would
own its own configuration surface* — where a user declares rows has no established answer in
this repo, and the change's grounding flagged exactly that as awaiting an owner ruling.

### 6. How the extension is loaded and verified today

**Load path** (host mechanics measured in the archived change's design Context, read from the
pinned host `1.4.0`): `package.json`'s `pi` field → `collectPackageResources` takes the
manifest branch and never scans `extensions/` → the plain file entry
`./extensions/jefferson.ts` is resolved with `resolve(root, entry)` and pushed as it stands →
nothing enumerates `extensions/jefferson/` (which is why modules there can never join the
entry set) → jiti transpiles the `.ts` in-process at pi start and calls the default export as
`factory(ExtensionAPI)`. `@earendil-works/*` imports inside the entry resolve through the
host's alias map to the host's own module instances — the reason they are `peerDependencies`.

**Verification today**, all re-run green on this tree:

- `pnpm test` → `node --test` finds `tests/jefferson.test.ts`, 2/2 pass (Node 26 type
  stripping executes the source directly — the erasable-syntax check).
- `pnpm typecheck` → `tsc --noEmit`, exit 0.
- CI → the invariant guard above, green on this tree (`shipping: extensions/jefferson.ts,
  LICENSE, package.json, README.md`).
- **The archived change's discovery command** (tasks 4.1, verbatim, the authoritative
  check): `node --input-type=module` importing `discoverAndLoadExtensions` from
  `@earendil-works/pi-coding-agent`, with an isolated `agentDir` from `mkdtempSync` so the
  result is hermetic, run as `discoverAndLoadExtensions(["."], ".", agentDir)` from the repo
  root. Green is `count: 1`, `resolvedPath` = the **file**
  `<repoRoot>/extensions/jefferson.ts`, `commands: [ 'jefferson' ]`, `errors: []` — all
  reproduced above. Corroboration leg: `pi -ne -e . -p "reply with the single word ok"`
  (exit 0; needs a configured provider; the local `pi` CLI is 1.5.0 while `node_modules`
  pins 1.4.0 — the discovery command remains authoritative).

## The feature path: files this change would touch, in order

1. `openspec/changes/statusline-skeleton/` — `proposal.md`, `design.md`, `specs/<ability>/spec.md`
   delta, `tasks.md`. Only `.openspec.yaml` exists today; this research is the first artifact.
2. `extensions/jefferson/<rows-or-config-module>.ts` (new, creates the directory) — the
   working-parts module owning the declared-rows data / configuration reading: row
   declarations, cell count, Lorem content. No runtime host import; `import type` only.
3. `extensions/jefferson/<render-module>.ts` (new, if split from 2) — the footer renderer:
   divides the row into cells of evenly distributed width from the declared rows.
4. `extensions/jefferson.ts` — the entry: gains the runtime host import (the only file
   permitted one — whatever footer/statusline surface the host exposes), imports the working
   parts via `./jefferson/<module>.ts`, wires them into `ExtensionAPI`.
5. `tests/<new>.test.ts` (new, under `tests/`) — tests for the renderer and the config reader,
   importing source by relative path.
6. *Not touched*: `package.json` (`files`, `pi.extensions`), `tsconfig.json` (`include`),
   `.github/workflows/ci.yml` — requirement 8's ordinary-module case. A new module under
   `extensions/jefferson/` ships, typechecks, and passes the guard with no edit to any of the
   three.

## Assumptions, Differences, and Unknowns

**Assumptions.** Module names in the path above are placeholders read from the spec's naming
rule, not decisions — `design.md` of this change chooses them. The archived change's
measurements (host mechanics, TS2835, guard behavior) are carried forward as settled facts
and were not re-derived here, except where re-run live (tests, typecheck, pack, discovery).

**Unknowns.**

- **Which host API renders a footer/statusline.** Nothing in this repo uses one — `pi-tui` is
  a declared `peerDependency` that nothing imports, not even type-only. The runtime surface
  (a TUI component registration, a statusline hook, or otherwise) was not verified here; it
  belongs to the entry file wherever it lands, and identifying it is external documentation /
  host-source work (Chidi's domain, not assigned here).
- **Where a user declares rows in configuration.** No surface exists (finding 5), and this
  change's own `.openspec.yaml` records grounding as NOT SOUND ENOUGH: two gaps await owner
  rulings — (1) "it works" must become observable requirements (what is rendered, at what
  width), and (2) the config source (pi's `getSettings()` exposes no free-form per-extension
  block, so pi-jefferson owns it). The config reader's input — a file the package reads, a
  settings key, or otherwise — is undecided until those rulings.
- **"Evenly distributed width" semantics** — fraction of terminal columns, fixed cell count,
  measurement basis — is exactly the observability gap the grounding flagged; no requirement
  text exists yet.
- **Lorem content** is presumably an inline constant per the change's objective ("no
  module/contribution interface in scope"), but that is the change's own proposal to make.
- `.pi/tasks/` local directories were not read; GitHub-side settings (branch protection,
  rulesets) live outside the tree and are unverifiable here, as the archived research also
  noted.

## Questions for the invoker

1. Confirm the pending owner rulings in `.openspec.yaml` (observable criteria for the row,
   and the configuration source) are being handled by the parent flow — this research does not
   resolve them, and the change's requirements cannot be written without them.
2. Should research into the host's statusline/footer API surface (which extension point pi
   exposes, and what `pi-tui` provides for a footer row) be delegated to Chidi, or assigned
   back to Eleanor with the host source tree in scope?
3. Is creating `extensions/jefferson/` itself (the directory the spec already describes but
   which does not exist on disk) accepted as part of this change's first implementation task,
   or does the owner want it staged separately?