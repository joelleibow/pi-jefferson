# Research: What authoritative sources say about structuring a small TypeScript npm package that is also a pi extension

Researcher: Chidi (documentation-research subagent)
Date: 2026 (sources fetched at current HEAD of each cited document)
Subject repo: pi-jefferson at `/Users/joelleibow/Projects/pi-jefferson` (today: packaging + CI + a stub at `extensions/jefferson.ts` and one test at `tests/jefferson.test.ts`; `"type": "module"`, no build step, host packages in `peerDependencies`)

This report only records what sources say and where they are silent. It does not evaluate or recommend an architecture.

## Sources

- [S1] pi extensions guide (repo, main): https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md
- [S2] pi packages guide (repo, main): https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md
- [S3] pi AGENTS.md (repo, main): https://github.com/earendil-works/pi/blob/main/AGENTS.md
- [S4] pi in-repo example extensions listing: https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions (via GitHub contents API)
- [S5] Node.js, "Modules: TypeScript" (api/typescript): https://nodejs.org/api/typescript.html (verified against raw `doc/api/typescript.md` at nodejs/node main)
- [S6] Node.js, "Modules: Packages" (package entry points): https://nodejs.org/api/packages.html
- [S7] Node.js Learn, "Publishing a TypeScript package": https://nodejs.org/learn/typescript/publishing-a-ts-package
- [S8] Node.js Learn, "Publishing a package": https://nodejs.org/learn/modules/publishing-a-package
- [S9] npm Docs, package.json reference ("exports"): https://docs.npmjs.com/cli/v11/configuring-npm/package-json/
- [S10] TypeScript Handbook, "Namespaces and Modules": https://www.typescriptlang.org/docs/handbook/namespaces-and-modules.html
- [S11] goldbergyoni/nodebestpractices, 1.1 "Structure your solution by components": https://github.com/goldbergyoni/nodebestpractices/blob/master/sections/projectstructre/breakintcomponents.md
- [S12] goldbergyoni/nodebestpractices, 1.2 "Layer your app, keep Express within its boundaries": https://github.com/goldbergyoni/nodebestpractices/blob/master/sections/projectstructre/createlayers.md
- [S13] tsh.io, "JavaScript dependency injection in Node.js – introduction" (2023): https://tsh.io/blog/dependency-injection-in-node-js
- [S14] itijs docs, "When not to use ITI?": https://itijs.org/docs/why/
- [S15] arg.software, "TypeScript Dependency Injection Without the Framework": https://arg.software/blog/typescript-dependency-injection-without-framework/
- [S16] tsup documentation: https://tsup.egoist.dev/ ; tsdown "Package Validation (publint & attw)": https://tsdown.dev/options/lint

## Q1 — Does any authoritative pi documentation prescribe or prefer a code structure for extensions or packages?

**Yes, but only at the level of three packaging layouts; nothing below that.**

The extensions guide has one structural section, "Extension Styles" [S1]:

> **Single file** - simplest, for small extensions
> **Directory with index.ts** - for multi-file extensions:
> `my-extension/index.ts` ("Entry point (exports default function)"), `tools.ts` ("Helper module"), `utils.ts` ("Helper module")
> **Package with dependencies** - for extensions that need npm packages:
> `package.json` ("Declares dependencies and entry points"), `package-lock.json`, `node_modules/`, `src/index.ts` — with `"pi": { "extensions": ["./src/index.ts"] }` in the manifest.

That is the entire structural prescription. The guide contains no occurrences of domain/usecase/infra/layer-style terms in a structural sense (caller's search confirmed against the raw document), and no matches for "Testing" or "mock" — the extensions guide is silent on internal layering and on test strategy.

The packages guide [S2] describes discovery, manifest fields, changelogs and dependency declaration; it contains no internal code-structure guidance. Its only boundary-relevant rules are about dependencies, quoted under Q3.

The project's own AGENTS.md [S3] carries style rules rather than layer rules. Two are repo-wide: "No inline imports (`await import()`, `import("pkg").Type`, dynamic type imports). Top-level imports only." and "Use only erasable TypeScript syntax (Node strip-only mode) in code checked by the root config (`packages/*/src`, `packages/*/test`, `packages/coding-agent/examples`): no parameter properties, `enum`, `namespace`/`module`, `import =`, `export =`, or other constructs needing JS emit." The detailed per-file conventions (one concept per file named after it; first line stating the file's purpose; public entry point first with helpers below in the order used; tagged unions for states; no behaviour-switching boolean parameters) appear under the heading "Chord v2 Code Style" with the scope line: "Binding for `packages/chord/src/next/` and its tests, when writing and when reviewing." — see "Differences" below.

Pi's own in-repo example extensions corroborate the flat-file idiom [S4]: `packages/coding-agent/examples/extensions/` contains ~70 single flat `.ts` files (`status-line.ts`, `custom-footer.ts`, `snake.ts`, ...). Directory-form examples exist (`with-deps/`, `subagent/`, `plan-mode/`, `custom-provider-anthropic/`, ...) and the guide's own example table describes `with-deps/` as "Extension with npm dependencies — Package structure with `package.json`". Notably `with-deps/` is a flat `index.ts` plus `package.json`/`package-lock.json` — it does not use a `src/` folder.

## Q2 — What do current TypeScript and Node community sources present as the accepted structure for a small library package, and what do they explicitly argue against?

What the official Node/TS sources cover is **entry points and published artifact form, not internal architecture**:

- Node's packages doc defines structure only at the package boundary [S6]: "The `exports` provides a modern alternative to `main` allowing multiple entry points to be defined, conditional entry resolution support between environments, and preventing any other entry points besides those defined in `exports`. This encapsulation allows module authors to clearly define the public interface for their package." npm's package.json reference repeats this verbatim [S9]. Node's Learn publishing guide adds: "`exports` can be advisable over `main` because it prevents external access to internal code" [S8].
- Node's Learn guide for TypeScript packages [S7] establishes that published content is JavaScript ("Fields like `main` operate on *published* content, so when TypeScript source-code is transpiled to JavaScript, JavaScript is the published content and `main` would point to a JavaScript file"), while source-side scripts reference sources (its example test script is `node --test './src/**/*.test.ts'` — the conventional `src/` layout with colocated-by-glob tests). It recommends setting `erasableSyntaxOnly` in TS 5.8+ so code "can just run in node".
- Node's own TypeScript doc argues explicitly **against publishing TypeScript sources** [S5]: "To discourage package authors from publishing packages written in TypeScript, Node.js refuses to handle TypeScript files inside folders under a `node_modules` path... publishing packages with TypeScript sources is highly discouraged." (A pi extension package is an exception in practice because pi itself loads the sources, but Node's stated position is on record.)
- The TypeScript handbook argues against namespaces as an organization mechanism [S10]: "for Node.js applications, modules are the default and we recommended modules over namespaces in modern code."
- Community library-packaging conventions (tooling docs, not standards) converge on a flat `src/` with a single entry (`tsup src/index.ts --format cjs,esm --dts` [S16]) and machine-checked packaging (publint + Are The Types Wrong) [S16]. These sources prescribe nothing about internal layers. Note: tsup's README now directs users to tsdown, which presents itself as its successor [S16].
- The most-cited Node structure guide, nodebestpractices, argues explicitly against folder-by-technical-role for applications [S11]: it labels grouping into `controllers/`, `services/`, `models/` "Bad: Group your files by technical role" and recommends self-contained business components instead — but its own scoping sentence is "For medium sized apps and above", addressed to applications, not small libraries.

## Q3 — Documented guidance on dependency direction, module boundaries, or dependency injection for a package of this size

**From pi's own docs** — the only dependency-boundary rules that apply directly to pi-jefferson [S2]:

> "Put runtime packages imported by extensions in `dependencies`."
> "Declare the host-provided packages listed above in `peerDependencies` with a `"*"` range and do not bundle them."
> "Do not list host-provided packages in `dependencies`. A physical copy can bypass Pi's extension module mapping in compiled ESM and create duplicate classes, registries, and initialization work."
> "Installed packages load with separate module roots. Do not rely on two packages sharing one dependency instance or one package resolving another package's undeclared dependency."

The extensions guide adds that pi maps the host packages' imports "to its own copies, so extensions share Pi's classes and registries" [S1].

**From Node's official docs** — the module-boundary mechanism is the `exports` encapsulation quoted in Q2 [S6][S8][S9]: the documented way to define "the public interface" and "prevent external access to internal code". No Node doc prescribes internal dependency direction.

**On dependency injection specifically**: neither the Node.js docs, the Node.js Learn guides, nor the TypeScript handbook contain DI guidance (verified by reading the typescript/packages/learn documents; the topic does not appear). The documented ecosystem idiom comes from community sources:

- tsh.io [S13]: "dependency injection in Node.js is a pattern where, instead of creating or requiring dependencies directly inside a module, we pass them as parameters or reference."
- itijs docs [S14], citing Mark Seeman: "Manual DI is also often called 'Pure DI' or 'Poor Man's DI.' We don't need frameworks! It is possible to implement and maintain a dependency injection manually even for a relatively large project!"
- arg.software [S15]: DI "isn't a decorator... It's a habit, the habit of writing functions and classes that accept what they need instead of reaching out to get it", and containers address scale, not size-zero projects: "The problem surfaces at scale. When you have 40+ services, manually composing the object graph at startup becomes error-prone and tedious. That's what a container solves."

**On layering**: nodebestpractices 1.2 [S12] presents entry-points / domain / data-access layering where the domain "accepts protocol-agnostic payload, plain JavaScript object and returns one as well" — and explicitly argues *against* heavier architecture for typical cases: "Clean architecture is architecture with high level of abstractions that can achieve even greater separation but the price tag is unproportionally higher due to the increased complexity." Both nodebestpractices sections are scoped to applications ("medium sized apps and above"), not small libraries.

## Q4 — From Node's own documentation, what type stripping permits and forbids

Node's "Modules: TypeScript" doc [S5] (Stability: 2 — Stable; type stripping stable since v25.2.0 / v24.12.0):

Permits:

> "By default Node.js will execute TypeScript files that contain only erasable TypeScript syntax. Node.js will replace TypeScript syntax with whitespace, and no type checking is performed."

Recommended tsconfig for compatibility: `"erasableSyntaxOnly": true`, `"verbatimModuleSyntax": true`, `"module": "nodenext"`, `"rewriteRelativeImportExtensions": true` (TS 5.8+ recommended). Type-only `namespace`s (no runtime code) work. `import type` and inline `type` specifiers work; relative imports require explicit file extensions (`import './file.ts'`); `.mts`/`.cts` supported.

Forbids / errors (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`):

> "Since Node.js is only removing inline types, any TypeScript features that involve *replacing* TypeScript syntax with new JavaScript syntax will error. The most prominent features that require transformation are: `Enum` declarations; `namespace` with runtime code; parameter properties; import aliases."

Additionally:

- Decorators "are not transformed and will result in a parser error."
- Importing types without the `type` keyword "will result in a runtime error" (treated as a value import).
- `.tsx` files are unsupported; TS syntax unsupported in the REPL, `--check`, and `inspect`.
- tsconfig.json is ignored: "features that depend on settings within `tsconfig.json`, such as paths or converting newer JavaScript syntax to older standards, are intentionally unsupported."
- Type stripping is refused for files under `node_modules` (to discourage publishing TS sources).

## Differences from the caller's reading of the anchors

1. **AGENTS.md scope**: The caller summarized the per-file conventions (one concept per file, first-line purpose comment, public entry point first, tagged unions, no behaviour-switching booleans) as the project's development rules generally. At current HEAD those specific conventions sit under "## Chord v2 Code Style" and are explicitly "Binding for `packages/chord/src/next/` and its tests". The repo-wide Code Quality section does contain the "top-level imports only" rule and the erasable-TypeScript rule (scoped to `packages/*/src`, `packages/*/test`, `packages/coding-agent/examples`), but the file-organization conventions are scoped to chord v2. [S3]
2. Everything else in the caller's summary was confirmed as stated: three layouts only [S1], no structural vocabulary in the extensions guide [S1], and pi's own in-repo extensions predominantly single flat files [S4]. One nuance on the last point: directory-form examples do exist, but for manifest/dependency reasons, and the canonical `with-deps/` example is a flat `index.ts` without `src/`. [S4]

## Gaps and silences

- No authoritative source (pi, Node.js, npm, TypeScript) prescribes an internal source layout for a small library package beyond entry-point configuration; equally, none was found that explicitly *declines* to prescribe one — the topic is simply absent. Statements here are based on reading the cited documents in full, not on a proof of absence across the whole web.
- No official Node/TypeScript/npm documentation addresses dependency injection or dependency direction at all; the idioms recorded in Q3 come from community sources (blogs, a DI library's docs), which are evidence of accepted practice, not of standardization.
- nodebestpractices' anti-layering-by-role and 3-layer guidance is explicitly scoped to applications ("medium sized apps and above"); its applicability to a package of pi-jefferson's size is not addressed by that source itself.
- `pi.dev/docs/latest/extensions` was not re-fetched independently; the repo `docs/extensions.md` at main was verified instead, which the published guide mirrors per the caller's anchors.
- Whether pi's own extension loader handles `.ts` inside an installed package's `node_modules` location (Node refuses to strip types there) is pi behavior, not documented in the cited pi packaging docs; packages.md instead instructs authors to ship extension entry points as package files resolved through the manifest. Not investigated further; noted as an operational unknown.
