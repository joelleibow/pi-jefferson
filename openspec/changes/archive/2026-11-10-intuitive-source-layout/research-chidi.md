# Research Report

## Question and Scope

Four questions about conventions outside this repository, for the `intuitive-source-layout` change. No layout for pi-jefferson is proposed here, and no repository code was read.

1. What does pi itself say about an extension package's layout?
2. How do pi-powerline-footer, pi-subagents, pi-lens and `@heyhuynhgiabuu/pi-pretty` organize their source?
3. How does Starship, the project pi-jefferson is modeled on, organize its modules?
4. Is there a widely cited TypeScript convention for a small codebase (feature or type folders, index barrels)?

## Sources / Files Examined

- **pi docs, 1.5.2.** `$(npm root -g)/@earendil-works/pi-coding-agent/`: `package.json` (version 1.5.2), `docs/extensions.md`, `docs/packages.md`, `examples/extensions/README.md`, and the file trees of `examples/extensions/{subagent,plan-mode,doom-overlay,with-deps,gondolin,dynamic-resources,custom-provider-gitlab-duo}`.
- **Tarballs from `npm pack`:** pi-powerline-footer 0.22.0, pi-subagents 0.87.0 (compiled `src/`), `@heyhuynhgiabuu/pi-pretty` 0.10.0 (has `src/` and `dist/`).
- **Repositories cloned shallow:**
  - apmantza/pi-lens (the 4.4.11 tarball has only `dist/`, so I read the repo's `AGENTS.md` "Key source layout" and its directory listing).
  - starship/starship at `94dfccf`: `src/` tree, `src/modules/mod.rs`, `src/module.rs`, `CONTRIBUTING.md`.
  - For pi-subagents, the packaged `docs/extension-api.md` "Runtime files" table.
- **Web:**
  - ts.dev/style, "Organize By Feature".
  - Google's TypeScript guide, google.github.io/styleguide/tsguide.html.
  - Microsoft Cloudpack, microsoft.github.io/cloudpack/repo-guidance/no-inner-index.
  - Atlassian engineering blog, "How We Achieved 75% Faster Builds by Removing Barrel Files" (2025-06-26).
  - TypeScript's own blog, "TypeScript's Migration to Modules" (2023-03-09).

## Findings

### 1. pi's own guidance (1.5.2)

pi sets very little about a package's internal layout. It fixes how entries are discovered, not what goes in the source directories.

- **Entry points.**
  - `docs/extensions.md:127-136` lists the auto-discovery locations: `~/.pi/agent/extensions/*/index.ts` or `index.js`, and `*/package.json` with a `pi.extensions` field.
  - Line 136: "Discovery goes one level deep. Larger packages declare their entry points in a `package.json` manifest."
- **Multi-file extensions.**
  - `docs/extensions.md:267-275` shows `my-extension/index.ts` (comment: "Entry point (exports default function)") beside `tools.ts` and `utils.ts`, both labelled "Helper module".
  - Lines 279-300 show the manifest form: `package.json` with `"pi": {"extensions": ["./src/index.ts"]}` and the entry at `src/index.ts`.
  - The only subdirectory named is `src/`, and it appears only in the manifest form.
- **Packages.**
  - `docs/packages.md:48-57` names the conventional resource directories: `extensions/`, `skills/`, `prompts/`, `themes/`. These are resource-type directories and say nothing about source files.
  - Lines 61-73: "Use an explicit manifest when resources live elsewhere", with `"extensions": ["./src/extension.ts"]`. So the entry's path and file name are free.
  - Lines 120-130 show settings filters with globs such as `extensions/*.ts`.
- **Naming.** I found no file-naming rule in `extensions.md` or `packages.md`, apart from `index.ts` or `index.js` being the entry name for the directory form.
- **Dependencies.** `docs/packages.md:114` says not to list host-provided packages in `dependencies`. This concerns dependencies, not layout.
- **Examples** (`examples/extensions/README.md`, and the file trees):
  - Single-file extensions are flat `*.ts` files.
  - Directory examples use `index.ts` as the entry. `subagent/`, `plan-mode/`, `doom-overlay/` and `dynamic-resources/` have no nested source subdirectories.
  - Helper files sit beside `index.ts`: `subagent/agents.ts`; `plan-mode/utils.ts`; `doom-overlay/{doom-engine,doom-keys,doom-component,wad-finder}.ts`.
  - `doom-overlay/` has a `doom/` subdirectory, but it holds the C source and build output, not TypeScript.
  - `with-deps/`, `gondolin/` and `custom-provider-gitlab-duo/` carry a `package.json` beside a root `index.ts`.
  - Non-code assets use `agents/` and `prompts/` (in `subagent/`).
  - The examples name files by role or subject (`utils.ts`, `agents.ts`) and, in `doom-overlay`, by subject prefix (`doom-*.ts`). They do not use `src/`.

### 2. Comparable pi extensions

| Package | Top-level source dirs | Grouping term | One file per segment/renderer? |
|---|---|---|---|
| pi-powerline-footer 0.22.0 | Almost flat. Root has `index.ts` (3723 lines) plus ~25 `*.ts` files. Subdirectories: `bash-mode/` (completion, editor, history, shell-session, transcript, types) and `queue/` (store, types). Manifest entry `./index.ts`. | "segments": `segments.ts` (622 lines) defines each as a `const xSegment: StatusLineSegment` and gathers them in `export const SEGMENTS: Record<BuiltinStatusLineSegmentId, StatusLineSegment>`. `presets.ts`, `separators.ts`, `types.ts`, `icons.ts` and `colors.ts` sit beside it. | **No.** All built-in segments, including `session`, `git` and `model`, are in one file. Feature clusters get a directory (`bash-mode/`, `queue/`). |
| pi-subagents 0.87.0 (npm tarball is compiled output with the same layout; the docs say a git checkout runs `index.ts` directly) | `src/` with 16 subdirectories: `agents`, `api`, `extension`, `inspectors`, `integrations`, `intercom`, `missions`, `policy`, `profiles`, `runs` (`background`, `foreground`, `shared`), `shared`, `slash`, `tui`, `watchdog`, `workflows`. Tests in `test/unit` and `test/integration`. The `extension/` directory (not an `index` at the root) holds the pi entry. | Grouped by **feature and lifecycle** (`runs/foreground`, `runs/background`, `slash`, `watchdog`). Its docs table is called "Runtime files" and lists each file by path and purpose. Rendering lives in `tui/` (`render.ts`, `render-helpers.ts`, `fleet-*.ts`, `subagent-messages.ts`). | **No** per-renderer files. Files are per concern (e.g. `fleet-layout`, `fleet-status`, `fleet-transcript`, `fleet-viewport`). The shared pool is big: `shared/` has about 49 source files and `runs/shared/` more. |
| pi-lens (repo, 4.4.11) | Repo root: `index.ts` ("pi host adapter and lifecycle wiring"), `clients/` (317 entries, mostly flat files, with subdirectories `cache`, `config-core`, `deps`, `dispatch`, `installer`, `lsp`, `mcp`, `metrics`, `project-diagnostics`, `redact`, `review-graph`, `turn-end`), `tools/` (17 files), `mcp/`, `tests/`, `config/`, `rules/`, `skills/`, `docs/`. Manifest entry `./dist/index.js`. | Its `AGENTS.md` section "Key source layout" labels `tools/` "model-facing pi tool handlers" and `clients/` the seam layer ("engine seam", "client seam"). Its glossary names *seam*, *lane*, *delivery surface*. Formatters and renderers are flat files in `clients/` (`formatters.ts`, `cascade-format.ts`, `tool-render.ts`, `turn-summary-render.ts`). | **Yes for tools:** `tools/` has one file per tool (`ast-grep-search.ts`, `lsp-navigation.ts`, `symbol-search.ts`, …), with `tools/shared.ts` and `tools/render-compact.ts` beside them. **No for renderers/formatters**, which are not split per item. |
| `@heyhuynhgiabuu/pi-pretty` 0.10.0 | `src/` with one subdirectory, `tools/` (`bash`, `find`, `grep`, `labels`, `ls`, `metrics`, `read`). Root holds `index.ts` (584 lines) and flat files `render.ts`, `config.ts`, `types.ts`, `helpers.ts`, `claude-style.ts`, `user-rail.ts`, `working-indicator.ts`, `prompt-editor.ts`, `tui-text.ts`, and others. Manifest entry `./src/index.ts`; `dist/` is the compiled output. | Terms: "tools" for per-tool overrides, `render.ts` for shared rendering, `helpers.ts` and `types.ts` for shared code. No segment concept. | **Yes for tools:** one file per overridden pi tool under `tools/`. Rendering is shared (`render.ts`, `claude-style.ts`) rather than per tool. |

Points to take from the table, as observations:

- Three of the four have a root or `src/` entry (`index.ts`) and then either stay flat or add subdirectories by feature or by concern.
- One-file-per-item appears only where each item is a registered pi tool (pi-lens `tools/`, pi-pretty `tools/`). The one package that has statusline segments (powerline-footer) keeps all of them in one file.
- None of the four uses a directory for "type" groups such as `types/` or `utils/`. Their shared helpers are flat files (`types.ts`, `helpers.ts`, `shared/`).

### 3. Starship

Starship's own terms are **module** and **segment** (`CONTRIBUTING.md:11-13`): a module is "a component in the prompt", and a segment is a "smaller subcomponent that compose[s] a module". These are Starship's words; this change's vocabulary rejects "module", so cite them only as Starship's terms.

- **`src/modules/`**: one file per module, 113 files (`aws.rs`, `git_branch.rs`, `claude_model.rs`, …). Each exposes `pub fn module<'a>(context: &'a Context) -> Option<Module<'a>>`.
- **`src/modules/mod.rs`**: declares each module (`mod claude_model;`, line 11) and dispatches by name (`"claude_model" => claude_model::module(context)`, line 143). It also holds a description table (line 284). The file starts with the comment "While adding out new module add out module to src/module.rs ALL_MODULES const array also."
- **`src/configs/`**: one config file per module, also 113 files with the same names (`configs/claude_model.rs`), plus `configs/mod.rs`. Config and module code are split into parallel directories, not co-located. A module imports its config as `crate::configs::claude_model::ClaudeModelConfig`.
- **`src/module.rs`**: the `Module` type, and `ALL_MODULES`, a registry array (line 9; a test at line 260 checks it is sorted).
- **`src/segment.rs`**: the `Segment` type. Segments are not files; they are values built inside each module's function.
- **`src/formatter/`**: `mod.rs`, `model.rs`, `parser.rs`, `spec.pest`, `string_formatter.rs`, `version.rs`. This is the format-string language, a directory of its own, separate from modules.
- **Other `src/` pieces:** `context/` (git and jj repo state), `utils/`, `init/`, `print.rs`, `configure.rs`, `config.rs`, `main.rs`, `lib.rs`.

Adding a module touches four places: `modules/<name>.rs`, `configs/<name>.rs`, `ALL_MODULES`, and the match in `modules/mod.rs`. The registry and match arm are explicit, not discovered.

### 4. TypeScript conventions for a small codebase

- **The TypeScript project itself gives no layout guidance.** The Handbook "Modules" page and the Performance wiki cover compilation, not folder structure. I found no official TypeScript recommendation on feature versus type folders.
- **Feature versus type folders.**
  - The ts.dev style guide says: "Organize packages by feature, not by type. For example, an online shop should have packages named `products`, `checkout`, `backend`, not `views`, `models`, `controllers`."
  - I checked the same guide on google.github.io/styleguide/tsguide.html: the text for this section was not present (no match for "by feature" or "barrel"). So the rule comes from ts.dev, which is derived from Google's guide but not identical to it.
  - Many blog posts repeat "feature over type" for large applications (React and Node apps).
  - The advice is aimed at large applications with several teams, not at a small single-package extension. Where it appears for small projects, it is a flat `src/` with a `types.ts` and `utils.ts`.
  - **There is no consensus for small codebases.** Both layouts are common.
- **Index barrels.**
  - Microsoft Cloudpack: `src/index.ts` as a package entry point is fine. Importing a same-package sibling through an index ("bad: `import { func2 } from './index'`") is not, because of module ordering, cycles and loading unneeded dependencies. It also says more than one entry file may mean the package is too big.
  - Atlassian reports a 75% faster build after removing barrel files, in a large codebase.
  - The TypeScript team (2023) kept a barrel only to preserve a public API during its migration to modules. A 2022 TypeScript change (PR #47516) stopped auto-importing from barrels likely to make an import cycle.
  - A barrel at the package boundary and nowhere else is the most repeated advice. **Beyond that, opinions differ**; some guides still recommend a barrel per feature folder.
  - The Google guide, as fetched, has no barrel rule; it only requires named exports (not default).

## Assumptions, Differences, and Unknowns

- **Version.** pi docs were read at the installed 1.5.2, which is the version the brief named. Package versions are the latest on npm at the time of reading (powerline-footer 0.22.0, subagents 0.87.0, lens 4.4.11, pretty 0.10.0).
- **Compiled sources.** pi-subagents' tarball holds compiled `.js`/`.d.ts`; I took its layout from those and from its docs table (it says the compiled tree matches the source tree). I did not clone its repository. pi-lens's tarball has no `src/`, so I used its git repo (default branch, shallow).
- **No Context7.** This is not a library API question, so I used the package contents, the repos and the web directly.
- **Counts** are of files at the shallow-clone or tarball level, and include `.d.ts` pairs only where noted; they are indicative, not exact.
- **Unresolved.** I found nothing in pi's docs on file-naming conventions for helper files, and nothing on how many files is too many in a flat directory. Neither pi nor the TypeScript project says whether a small extension should group by feature or by type.
- **Starship's "module" and "segment" meanings** differ from this project's vocabulary (a row holds cells, and a cell holds an instrument). I did not map one onto the other.
