# Research: reshape-the-configuration (Chidi)

No design is recommended here. Paths marked `[openspec]` are under `$(npm root -g)/@fission-ai/openspec`, and the CLI is v1.14.3. Paths marked `[pi 1.5.2]` are under `.../node_modules/@earendil-works/pi-coding-agent/`, the global install. Paths marked `[pi 1.4.0]` are under the repository's `node_modules/@earendil-works/pi-coding-agent/`, which reports 1.4.0.

## 1. OpenSpec delta mechanics

Source: the `openspec instructions specs --change reshape-the-configuration --json` output, `[openspec]/schemas/spec-driven/schema.yaml`, and `[openspec]/dist/core/{specs-apply.js,validation/*}`.

**Delta headers.** Deltas live in `specs/<capability>/spec.md` and use four sections: `## ADDED`, `## MODIFIED`, `## REMOVED` and `## RENAMED Requirements`.
- **MODIFIED** "MUST copy the ENTIRE existing requirement block (header + description + all scenarios) ... and edit it". This is the CLI instruction text.
- **REMOVED** "MUST include **Reason** and **Migration**". The same text appears in `schema.yaml:99`, and `schema.yaml:155-156` shows the form `**Reason**: ...` and `**Migration**: ...`.
- **RENAMED** is "Name changes only - use FROM:/TO: format". The parser pairs each `FROM:` with a `TO:`. An unpaired line throws (`specs-apply.js:126-133`).

**Enforcement of Reason and Migration.** The validator does not enforce them. `validator.js:113` says "REMOVED: names only; no scenario/description required", and REMOVED may be written as a bullet list (`validator.js:426`). So Reason and Migration are an instruction to authors, not a check.

`verify-change.js:90` reads a REMOVED block as carrying "only the requirement name and any `**Reason**`/`**Migration**` notes". The verifier then uses the baseline requirement in the main spec as evidence for what must be gone.

**How archive applies the kinds.** The order is fixed: "RENAMED → REMOVED → MODIFIED → ADDED" (`specs-apply.js:305`).
- **RENAMED** fails if the FROM header is not found or the TO header already exists (`:325`, `:328`). The renamed block keeps its position in the spec (`:348-352`).
- **REMOVED** deletes the block by normalized name (`:356-376`). A name that is missing is a warning, "treating it as already removed", except that a case or spacing near-miss is a hard error. Removing from a brand-new spec is ignored with a warning (`:268-270`).
- **MODIFIED** replaces the whole block (`:379-`). It fails if the header is not found (`:385`). It fails if the current spec has scenarios that the modified block lacks (`:394`).
- **ADDED** fails if the name already exists with different content (`:~420`). A name differing only in case or spacing is also rejected.

**Cross-section rules.**
- The same name may not appear in two sections (MODIFIED with REMOVED, MODIFIED with ADDED, ADDED with REMOVED; `specs-apply.js:196-202`).
- RENAMED together with REMOVED on the FROM name is an error (`:216`).
- When a rename exists, MODIFIED must use the NEW header (`:220`).
- A RENAMED TO that collides with ADDED is an error (`:224`).
- MODIFIED and RENAMED require an existing target spec (`:266`).

**Requirement length.**
- The limit is `MAX_REQUIREMENT_TEXT_LENGTH = 500` (`validation/constants.js:9`).
- It measures the requirement description: the body text between `### Requirement:` and the first header (`####` scenarios included as the boundary), with blank lines and fenced code skipped, and `**metadata**:` lines skipped when other text remains. Lines are trimmed and joined with newlines (`parsers/requirement-text.js`, `extractRequirementText`). The scenarios do not count.
- The length is checked with `.length` on the string, so it counts characters.
- Breaching it is a WARNING, not an error. `--strict` fails on it (`schema.yaml:108`).
- It is checked on ADDED requirements in a delta (`validator.js:270`) and on main specs (`validator.js:733`).
- **MODIFIED is not checked** (comment at `validator.js:~264`). `schema.yaml:108` says that under MODIFIED you "keep the existing requirement block whole; never split, trim or rewrite existing text just to meet the length".
- ADDED and MODIFIED with no SHALL/MUST is guidance, not an error, unless strict (`validator.js:112`). Every ADDED and MODIFIED requirement needs at least one scenario (`#### Scenario:`, four hashtags, with a non-empty body).

## 2. pi's guidance for an extension's own configuration file

**Where config may live.**
- `[pi 1.5.2] docs/configuration.md:3,9`: user-level configuration lives in the agent directory (`~/.pi/agent` by default, overridable with `PI_CODING_AGENT_DIR` or the SDK `agentDir`). Project configuration lives in `.pi` under the working directory, and is loaded after project trust.
- `docs/configuration.md` lists the files pi owns (`settings.json`, `mcp.json` and so on). It lists no per-extension file convention.
- `docs/extensions.md:1178-1201` is the only extension-config guidance. It uses a project path `join(ctx.cwd, CONFIG_DIR_NAME, "my-extension.json")`, with `CONFIG_DIR_NAME` imported from the pi package "instead of hardcoding `.pi`", and tells extensions to check `ctx.isProjectTrusted()` "before reading project-local extension configuration that should only be honored for trusted projects".
- `docs/extensions.md:2809` says an extension can register "based on the extension's own settings". It does not say where those live.

**Reporting a configuration error.**
- No convention or config-specific API exists in the docs. The general UI calls are `ctx.ui.notify(msg, "info"|"warning"|"error")` (`docs/extensions.md:2837`) and `ctx.ui.setStatus(key, text|undefined)` (`:2895-2896`).
- `ctx.hasUI` is true in TUI and RPC modes and false in print and JSON modes. It is the documented guard for `notify` and `setStatus` (`:1177`). `ctx.ui` lives on the event context. The docs show `session_start` handlers receiving `ctx` (`:1190`).
- `session_start` carries `reason: "startup"|"reload"|"new"|"resume"|"fork"` (`:393`).
- I searched for "diagnostic" and "warning". Neither refers to extension-config reporting.

**Breaking changes in a package's configuration.**
- Nothing. A grep of `extensions.md` and `packages.md` for "breaking" found 0 hits in both pi versions. `docs/packages.md` covers declaration, `pi config` and manifest rules only.
- The only related text is `docs/extensions.md:2318`, about tool-argument `prepareArguments`: "Do not add deprecated compatibility fields to `parameters`". That is about tool schemas, not config files.

**1.4.0 versus 1.5.2.**
- `[pi 1.4.0] docs/extensions.md` has 0 mentions of `CONFIG_DIR_NAME` or `isProjectTrusted`. The extension-config guidance in the previous section (`:1178-1201`) exists only in 1.5.2.
- `docs/configuration.md` (agent dir, `PI_CODING_AGENT_DIR`) is present in both.
- `ctx.ui.notify` is documented in both (1.4.0 `extensions.md:26`).
- I did not diff every line. A full diff of `extensions.md` is about 3,500 lines.

## 3. Versioning and the package

**SemVer** (https://semver.org, fetched):
- Rule 4: "Major version zero (0.y.z) is for initial development. Anything MAY change at any time. The public API SHOULD NOT be considered stable."
- Rule 8: major MUST increment on backward-incompatible changes "(X.y.z | X > 0)".
- Rule 5: "Version 1.0.0 defines the public API."
- FAQ: "The simplest thing to do is start your initial development release at 0.1.0 and then increment the minor version for each subsequent release."
- FAQ: "If you're worrying a lot about backward compatibility, you should probably already be 1.0.0."
- So before 1.0.0 a breaking change does not require a major bump.
- Deprecation guidance exists but is framed for post-1.0: "at least one minor release that contains the deprecation" before removal in a major release (FAQ, "How should I handle deprecating functionality?").

**npm registry** (`npm view pi-jefferson --json`, and `https://registry.npmjs.org/-/v1/search?text=pi-jefferson`):
- Versions: 0.0.0-alpha, 0.0.0-stage, 0.1.0, 0.1.1-pre.3, 0.1.1, 0.1.2, 0.1.3, 0.1.4, 0.2.0, 0.3.0, 0.4.0, 0.5.0, 0.6.0, 0.6.1, 0.6.2, 0.7.0, 0.8.0, 0.9.0, 0.10.0, 0.10.1, 0.10.2, 0.11.0, 0.12.0.
- dist-tags: `latest` is `0.12.0` and `pre-release` is `0.1.1-pre.3`.
- The package was created 2026-11-01 and last modified 2026-11-11T21:31:46Z.
- The search endpoint reports `dependents: 0`. Weekly downloads are 2555 and monthly 3903. Per-version last-week downloads are about 175-205 for 0.10.x-0.12.0 (`api.npmjs.org/versions/pi-jefferson/last-week`), and the earlier versions each have a handful.
- Publishing runs from GitHub Actions with a trusted publisher (OIDC).
- The repository's `package.json` says `"version": "0.1.1"`, while npm says `0.12.0` is latest. The checked-in version evidently lags the published one, because release tooling presumably sets it. I did not investigate why.
- `package.json` has `pi.extensions: ["./extensions/jefferson.ts"]`, `files: [extensions, README.md, LICENSE]`, devDependencies on pi `^1.4.0` and pi-tui `^1.4.0`, and peerDependencies `*`.
- The README (line 33) documents the config location: `pi-jefferson.json` in pi's agent directory, or `.pi/pi-jefferson.json` in a trusted project. The project document replaces the agent document whole.

## 4. Prior art: row layout shapes (no recommendation)

- **Starship** (https://starship.rs/config/): the layout is one `format` string, not a list. Rows come from the `$line_break` module inside that string. Example: `format = '$all$directory$character'`, with `$all` extending the default. The row break is a token in a flat string.
- **Oh My Posh** (https://ohmyposh.dev/docs/configuration/block): a top-level `blocks` array. Each block is an object with `type` (`prompt`|`rprompt`), `alignment` (`left`|`right`), `newline` (boolean, starts the block on a new line), `filler`, `overflow` and `segments` (array). So it is a list of block objects with alignment on the block, each holding a segments array. A new line is a flag, not a nesting level.
- **tmux-powerline** (https://raw.githubusercontent.com/erikw/tmux-powerline/main/themes/default.sh): two shell arrays, `TMUX_POWERLINE_LEFT_STATUS_SEGMENTS` and `TMUX_POWERLINE_RIGHT_STATUS_SEGMENTS`. Each element is a space-separated string, `"name bg fg [separator ...]"`. Placement is by which array, one flat list per side, and there are no rows.
- None of the three uses a list of lists of `{name, align}` objects. I did not look for tools that do.

## Differences from the brief's assumptions

- The brief says "the length limit on a requirement". It is a warning, not an error, and applies only to ADDED requirements in deltas and to main specs. MODIFIED is exempt in the validator.
- The brief implies REMOVED must carry a reason and migration. The CLI instruction says MUST, but the validator checks names only.
- pi has no convention for extension config errors. It has only the generic `notify`, `setStatus` and `hasUI` mechanisms.
- pi's config-file guidance (`CONFIG_DIR_NAME`, `isProjectTrusted`) is new in 1.5.2 and absent from the pinned 1.4.0 docs.
- `package.json` shows 0.1.1 while npm `latest` is 0.12.0.

## Gaps

- I did not diff pi 1.4.0 against 1.5.2 beyond the greps above.
- I did not check that `CONFIG_DIR_NAME` and `isProjectTrusted()` exist in the 1.4.0 runtime or its exports (only that its docs are silent). Jefferson's own use of either is Eleanor's question.
- OpenSpec's own online docs were not consulted. The evidence is the installed CLI 1.14.3's source and schema text.
- I did not fetch the starship `format` examples beyond the one snippet found. The tmux-powerline URL I first tried returned 404, and the `themes/default.sh` path worked.
- "Dependents: 0" comes from the npm search API. It counts only npm packages that depend on the package, and not users who install it as a pi package.
