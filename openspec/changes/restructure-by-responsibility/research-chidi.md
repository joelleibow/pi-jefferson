# Research — Chidi (documentation, API and platform behavior)

Change: `restructure-by-responsibility`
Owner rulings consulted: `owner-rulings.md` (2026-11-06 restructure-by-responsibility; 2026-11-03 inherited rulings). This report supplies documentation evidence only. It makes no design decisions and no workflow verdicts.

## Question and Scope

Establish, with citations, what pi, Node and npm each require of the on-disk layout of a pi extension package, ahead of restructuring `pi-jefferson`'s source by responsibility (startup, config loading, footer setup, data/updates, visuals). Five questions from the brief:

1. How pi discovers and loads extensions from an installed package (`pi.extensions` manifest vs the `extensions/` convention directory), and exactly which files become entries.
2. Whether pi publishes guidance or examples for structuring a multi-file extension.
3. The documented footer surface: `ctx.ui.setFooter` factory shape, the component contract, relevant `pi.on` events, and what `/reload` does to a custom footer.
4. What the `pi-package` keyword does for the pi.dev gallery, and what npm's `files` field must include so nested source ships.
5. Whether Node's type stripping constrains directory layout (`.ts` extensions on relative imports, directory imports, `node --test` discovery, `node_modules`).

Out of scope per the brief: reading this repository's source (Eleanor's lane), design judgment (Michael), scope decisions (Joel), and any workflow verdict.

## Sources / Files Examined

Local, installed with pi (authoritative for the running pi version):

- **S1** `docs/extensions.md` — pi extension documentation (locations, styles, events, `setFooter`).
- **S2** `docs/packages.md` — pi package documentation (manifest, `pi-package` keyword, changelog, dependencies, resource filters).
- **S3** `examples/extensions/README.md` — index of shipped extension examples.
- **S4** `examples/extensions/custom-footer.ts` — official `setFooter` example.
- **S5** `dist/core/extensions/types.d.ts` — `ExtensionUIContext` type declarations (`setFooter`, `setWidget`, `setStatus`, …).
- **S6** `node_modules/@earendil-works/pi-tui/dist/tui.d.ts` — `Component` interface.
- **S7** `dist/core/footer-data-provider.d.ts` — `ReadonlyFooterDataProvider`.
- **S8** `dist/modes/interactive/interactive-mode.js` — `setExtensionFooter` implementation and `/reload` handler.
- **S9** `examples/extensions/with-deps/` — directory-style extension example with its own `package.json` (`pi.extensions`).
- **S10** `examples/extensions/subagent/` — multi-file directory extension example (`index.ts` entry + subdirectories).

Web / fetched documentation:

- **S11** Node.js `doc/api/typescript.md` and `doc/api/packages.md`, retrieved via Context7 (`/nodejs/node`) — type stripping rules, mandatory extensions, directory import behavior.
- **S12** Node.js test-runner source (`lib/internal/test_runner/utils.js`, `runner.js`), retrieved via Context7 — default `node --test` discovery globs and `node_modules` exclusion.
- **S13** npm `package-json` docs (`https://docs.npmjs.com/cli/v11/configuring-npm/package-json#files`) — `files` field semantics.
- **S14** Empirical checks run on the locally installed Node v26.8.1 (temp directory `/tmp/chidi-nodetest`, since removed): directory import error, extensionless import error, `.ts`-extension import success, `node --test` default discovery of `test/*.test.ts`, enum rejection under type stripping.

Change directory (the exception Eleanor's lane grants):

- **S15** `openspec/changes/restructure-by-responsibility/owner-rulings.md` — binding scope.

## Findings

### 1. How pi discovers and loads extensions

Two mechanisms, both documented:

**Convention directory (no manifest).** In `~/.pi/agent/extensions/` (global) or `.pi/extensions/` (project-local), pi auto-discovers (S1, "Extension Locations"):

| Layout | Becomes an entry? |
|---|---|
| `extensions/*.ts` or `*.js` (top level) | Yes — each matching file is one extension entry. |
| `extensions/<name>/index.ts` or `index.js` | Yes — the subdirectory is one entry via its index file. |
| `extensions/<name>/package.json` with a `pi.extensions` field | Yes — the subdirectory is one entry via its manifest. |
| Files nested deeper than one level | **Not discovered.** "Discovery goes one level deep. Larger packages declare their entry points in a `package.json` manifest." (S1) |

Non-`.ts`/`.js` files (`.md`, `.json`, assets) are not extension entries under the convention. For *packages* installed with `pi install`, the equivalent convention directory is `extensions/` at the package root: "Without a `pi` manifest, Pi discovers TypeScript and JavaScript extensions, skill directories, Markdown prompts, and JSON themes from those directories." (S2, "Create a package")

**Explicit manifest.** A `package.json` `pi` key declares entries explicitly (S2):

```json
{
  "pi": {
    "extensions": ["./src/extension.ts"],
    "skills": ["./resources/skills"],
    "prompts": ["./resources/prompts/*.md"],
    "themes": ["./resources/themes/*.json"]
  }
}
```

"Paths are relative to the package root. Arrays accept glob patterns and exclusions. List dot-prefixed or symlinked resource roots directly when traversal through a glob would not discover them." (S2). Each declared path/glob match becomes an entry; arbitrary files beneath a declared path do **not** automatically become entries — the manifest is the allowlist. The shipped `with-deps` example (S9) uses exactly this: `"pi": { "extensions": ["./index.ts"] }`.

Settings (`settings.json`) can add more extension paths and packages (S1), and the object form in settings can *narrow* a package's declared resources with globs and `!`/`-` exclusions, but "Filters narrow the package manifest. They do not expose resources that the package itself did not declare." (S2).

Loading mechanics: "Extensions are loaded via jiti, so TypeScript works without compilation." (S1). Pi maps imports of `@earendil-works/pi-coding-agent`, `pi-agent-core`, `pi-ai`, `pi-tui` and `typebox` to its own copies; npm dependencies placed in `node_modules` next to the extension resolve automatically (S1). For distributed packages, runtime deps must be in `dependencies` — `devDependencies` are not installed — and host-provided packages must be `peerDependencies` with `"*"`, never `dependencies` (S2).

### 2. Guidance and examples for structuring a multi-file extension

Yes — S1 has an explicit **Extension Styles** section documenting three shapes:

1. **Single file** — `my-extension.ts`.
2. **Directory with `index.ts`** — the documented multi-file shape: `my-extension/index.ts` (entry, exports the default factory) plus sibling helper modules (`tools.ts`, `utils.ts` in the doc's illustration).
3. **Package with dependencies** — `package.json` declaring dependencies and `"pi": { "extensions": ["./src/index.ts"] }`, plus `node_modules` after install.

The shipped examples (S3, S9, S10) include several directory-style extensions: `subagent/` (`index.ts` entry importing sibling modules, with `agents/` and `prompts/` resource subdirectories), `plan-mode/`, `doom-overlay/`, `gondolin/`, `dynamic-resources/`, `with-deps/`, `custom-provider-anthropic/`, `custom-provider-gitlab-duo/`.

No pi document recommends any *internal* directory convention beyond "index entry plus helper modules" — there is no prescribed `src/`, no layer naming, no required file names besides the entry point. That judgment is therefore left to the project (Michael/Joel), unconstrained by pi.

### 3. The documented footer surface

**`ctx.ui.setFooter`.** Signature from S5:

```ts
setFooter(factory: ((tui: TUI, theme: Theme, footerData: ReadonlyFooterDataProvider) => Component & {
    dispose?(): void;
}) | undefined): void;
```

Passing `undefined` restores the built-in footer (S1, S5). `footerData` is a `ReadonlyFooterDataProvider` (S7): `getGitBranch(): string | null`, `getExtensionStatuses(): ReadonlyMap<string, string>` (texts from `ctx.ui.setStatus`), `getAvailableProviderCount(): number`, and `onBranchChange(callback): () => void`. "Context usage is on ctx.getContextUsage(), token stats on ctx.sessionManager.getEntries(), model info on ctx.model." (S5).

**Component contract** (S6, pi-tui `Component`):

- `render(width: number): string[]` — required; returns lines for the given viewport width.
- `invalidate(): void` — required; "Invalidate any cached rendering state. Called when theme changes or when component needs to re-render from scratch."
- `dispose?(): void` — optional (added by the `setFooter` intersection).
- Optional extras: `handleInput`, `handleMouse`, `wantsKeyRelease`, `capturesViewportInput`.

The official example (S4) returns `{ dispose: unsub, invalidate() {}, render(width) { ... } }` and subscribes to `footerData.onBranchChange(() => tui.requestRender())`.

**Relevant `pi.on` events** (S1): `session_start` (fires on startup *and* reload; `event.reason` distinguishes `"startup" | "reload" | "new" | "resume" | "fork"`) is the place to (re-)establish UI state — the docs' own `status-line.ts` example pairs `setStatus` with session events (S1, examples table). `model_select` — "Use this to update UI elements (status bars, footers) or perform model-specific initialization" (S1). `thinking_level_select` — "Use this to update extension UI" (S1). `session_shutdown` — "Fired before a started session runtime is torn down. Use this to clean up resources opened from `session_start`" (S1).

**`/reload` and the footer.** The documented lifecycle (S1, mermaid): `/reload` → `session_shutdown` (reason `"reload"`) → "load replacement extension runtime" → `session_start` (reason `"reload"`). Extensions, keybindings, skills, prompts, themes and context files are all reloaded (S8: "Reloading keybindings, extensions, skills, prompts, themes, and context files..."). Only extensions in auto-discovered locations (convention directories or installed packages) are reloaded; `pi -e` paths are "only for quick tests" (S1). Host behavior: when a new footer factory is set, pi disposes the previous custom footer's `dispose()` if present, clears the footer container, calls the factory, and requests a render; `undefined` restores the built-in footer (S8, `setExtensionFooter`). **Consequence for the change:** because `/reload` replaces the whole extension runtime, a custom footer must be re-registered from the fresh runtime — i.e., from `session_start` (which fires with reason `"reload"`), not only once at module evaluation. The host guarantees the dispose-then-recreate cycle; the extension guarantees re-registration. The change must preserve both sides of that lifecycle.

### 4. `pi-package` keyword and npm `files`

**Keyword.** "The `pi-package` keyword makes an npm package eligible for discovery in the [Pi package gallery](https://pi.dev/packages). Optional `pi.image` and `pi.video` fields add gallery previews." (S2). The docs name no other eligibility requirement; the keyword is stated to be sufficient for eligibility. (This matches the owner ruling that adding the missing keyword is boyscouted into this change — S15.)

**`files` field** (S13, npm docs): `files` is an allowlist — "including a file, directory, or glob pattern (`*`, `**/*`, and such) will make it so that file is included in the tarball when it's packed." **Naming a directory includes everything in it**, so a nested source directory (e.g. `src/`, `extensions/<name>/`) ships if the directory (or a glob covering it) is listed. Always included regardless: `package.json`, `README`, `LICENSE`/`LICENCE`, the `main` file, `bin` files. Always excluded and *cannot* be re-included: `node_modules`, lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`), `.git`, `.npmrc`. Omitting `files` defaults to `["*"]` (everything). A root `.npmignore` does not override `files`; subdirectory `.npmignore` files do apply within `files`-listed directories.

### 5. Node type-stripping constraints on layout

From Node's documentation via Context7 (S11) and verified empirically on Node v26.8.1 (S14):

- **Relative imports need the explicit `.ts` extension.** "file extensions are mandatory in `import` statements and `import()` expressions: `import './file.ts'`, not `import './file'`"; same for `require()`. TypeScript's `allowImportingTsExtensions` makes `tsc` accept those specifiers. Verified: `import './sub/index'` → `ERR_MODULE_NOT_FOUND`; `import './sub/index.ts'` → works (S14).
- **Bare directory imports do not resolve to an index file.** "The resolution of `import`/`import()` does not support folders as modules, directory indexes (e.g. `'./startup/index.js'`) must be fully specified." Verified: `import './sub'` → `ERR_UNSUPPORTED_DIR_IMPORT` (S14).
- **Erasable syntax only.** Enums, `namespace` with runtime code, parameter properties and import aliases error with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`; decorators are a parser error. Verified: an `enum` file fails to run (S14). Node "does not read `tsconfig.json` files and does not support features that depend on settings within `tsconfig.json`, such as paths" (S11).
- **Module system:** `.ts` follows `.js` rules — `"type": "module"` in the nearest `package.json` makes it ESM; `.tsx` is unsupported (S11).
- **`node --test` discovery:** default glob is `**/{test,test/**/*,test-*,*[._-]test}.{js,mjs,cjs[,ts,mts,cts]}`, searched recursively from cwd, with `node_modules` explicitly excluded by the glob (S12). TypeScript extensions are included when type stripping is active; on Node v26.8.1 type stripping is active by default and a `test/foo.test.ts` file is discovered and run by plain `node --test` with no flags (S14). Note: the Context7-retrieved source snippet gates the `.ts` extensions on `--strip-types`; on current Node (type stripping unflagged since v23.6) the flag path no longer applies — the empirical check is the current evidence.
- **`node_modules`:** excluded from test discovery (S12) and never published by npm (S13); nothing under it can be relied upon in layout.

**Interaction with pi's loader:** pi itself loads extension entries with jiti, "so TypeScript works without compilation" (S1). The Node type-stripping constraints above therefore bind whatever the project runs *directly under Node* (tests via `node --test`, any direct `node file.ts` execution), while pi's own loading of the installed package goes through jiti. The safe posture — and the one consistent with both loaders — is the Node rules: explicit `.ts` extensions on every relative import, no bare directory imports, erasable syntax only. (Whether jiti tolerates looser specifiers was not verified; see Unknowns.)

## Assumptions, Differences and Unknowns

### Assumptions

- I did not open this repository's `package.json` (Eleanor's lane). Which of the documented mechanisms the package currently uses (convention `extensions/` vs `pi.extensions` manifest), its `files` field, `type` field, and engines are for Eleanor's structural report to state; this report supplies the platform rules those fields must satisfy.
- "pi docs and type declarations installed locally are authoritative" per the brief; the running pi is the `@earendil-works/pi-coding-agent` install under Node v26.8.1's global node_modules.
- The brief's premise that the package "executes source under Node's type stripping, no build step" was taken as given scope; it holds for `node --test` and direct `node` execution (verified empirically), while pi's runtime loading is jiti-based (S1).

### Differences from the brief's framing

- The manifest field is the `pi` key in `package.json` (`"pi": { "extensions": [...] }`, i.e. `pi.extensions`), matching the brief's "`pi.extensions` array"; the convention mechanism applies only at one directory depth (S1, S2) — a nested source tree is safe under a manifest but only the top level of a convention `extensions/` directory is scanned.
- The brief's Q5 frames Node type stripping as "the runtime this package executes source under." Pi's extension loading is actually jiti (S1); type stripping governs direct Node execution such as the test runner. Both matter; the stricter (Node) rules keep the source valid under either loader.
- The npm docs state root `.npmignore` does *not* override `files` (S13) — if both existed, `files` wins at the root.

### Unknowns / failed verifications

- Whether the pi.dev gallery imposes eligibility requirements beyond the `pi-package` keyword. S2 states the keyword alone confers eligibility; the gallery site itself was not inspected.
- Whether jiti accepts extensionless relative imports or directory imports inside an extension (it likely does, being CJS-style resolution); not documented in S1–S2 and not tested. Moot if the source follows the Node rules, which jiti also accepts.
- Whether the pi docs' statement "Discovery goes one level deep" treats `extensions/<name>/index.ts` inside an *installed npm package* identically to the user-level directory — the docs present the same layouts for both (S1) but the installed-package path was not executed end-to-end.
- The exact Node version(s) end users run was not checked (repo `engines` field unread, Eleanor's lane). Type stripping is default-on since Node v23.6; earlier LTS lines need `--experimental-strip-types`, which changes the `node --test` discovery behavior noted above.
