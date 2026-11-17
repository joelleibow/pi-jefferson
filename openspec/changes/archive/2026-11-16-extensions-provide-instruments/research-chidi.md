# Research: platform facts for `extensions-provide-instruments`

Researcher: Chidi. Answers are from pi 1.5.2 (global install, bundled `dist/bundle/`) unless marked. No design is recommended.

`PI` = `/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent`.
`PI14` = `/Users/joelleibow/Projects/pi-jefferson/node_modules/@earendil-works/pi-coding-agent` (1.4.0, read only).

Experiments ran against the real global `pi` 1.5.2 (`pi -e a.ts -e b.ts --list-models`, with `PI_CODING_AGENT_DIR` pointed at a temp dir) and against Node 26.8.1 and `tsc` 7.0.2. They ran in a `mktemp -d` directory with its own `npm install`, which is now removed. The repository was not touched.

## 1. `pi.events`

- **API.** `pi.events.on(channel, handler)` returns an unsubscribe function. `pi.events.emit(channel, data)` returns `void`.
  - The docs section is `### pi.events` in `PI/docs/extensions.md:1965-1972`. It says only "Shared event bus for communication between extensions". It documents no unsubscribe, no error behaviour and no lifecycle.
  - The implementation is `PI/dist/core/event-bus.js` (`createEventBus()`, a `node:events` EventEmitter). The per-extension wrapper is `PI/dist/core/extensions/loader.js:427-435`, bundled at `chunk-VEJDBY3O.js:689`.
  - There is also a `clear()` that calls `removeAllListeners()`. No caller was found in `dist/core`.
- **Shared or per-extension.** There is one bus per session runtime, and every extension in that runtime shares it.
  - `DefaultResourceLoader` does `this.eventBus = options.eventBus ?? createEventBus()` (`PI/dist/core/resource-loader.js:262`).
  - It passes that bus to every extension load (`resource-loader.js:527,549,557,898`).
  - Experiment: extension `a`'s listener received an event emitted by `b`.
- **Lifecycle.**
  - **`/reload`:** the same `ResourceLoader` is reloaded (`agent-session.js` reload, ~3095-3132), so the bus object is the same.
    - Old listeners are removed, though. `oldRunner.invalidate()` calls `runtime.invalidate`, which unsubscribes every tracked bus subscription (`loader.js:146-155`, `trackEventBusSubscription` at `:157-166`).
    - Every factory then runs again and re-subscribes, and `session_start` follows with `reason:"reload"`.
    - The old `pi` API object goes stale. After invalidation `assertActive()` throws "This extension ctx is stale…" on `events.emit` and `events.on` (`loader.js:196-200,427-433`). A provider that kept the old `pi` and emits later will throw.
  - **`/new`, `/resume`, `/fork`, `/clone`:** `AgentSessionRuntime` calls `createRuntime(...)` again (`PI/dist/core/agent-session-runtime.js:137,161,207,225,242,295`). That calls `createAgentSessionServices`, which does `new DefaultResourceLoader({...})` (`agent-session-services.js:63-68`). The result is a new bus, a new runtime and fresh factory runs. `docs/extensions.md:512,529` says "reloads and rebinds extensions for the new session". The old runtime is invalidated and the old bus is dropped. Nothing calls `clear()`.
  - A session boundary therefore always means fresh factory runs and a new subscriber set. State held in a provider's factory closure is rebuilt each time.
- **Replay or buffering: none. Confirmed.**
  - `event-bus.js` has no queue, no last value and no replay.
  - Experiment: `a`'s factory emitted before `b`'s factory ran, and `b` never saw it. `b`'s early emit reached `a`'s listener only because `a` had already subscribed.
  - A listener sees an emit only if it was subscribed at that moment.
  - This matches the earlier finding, and it holds in 1.4.0 as well.
- **Handler errors.** Each handler is wrapped in `async safeHandler` with try/catch. Errors, including sync throws and rejected promises, go to `console.error("Event handler error (<channel>):", err)`.
  - Experiment: `emit` did not throw, the emitting factory carried on, and the other listeners still ran.
  - The error is not routed to pi's extension-error channel. It goes to `console.error` only (a TUI may garble it).
  - Handlers are awaited only inside the wrapper, so `emit` never waits for them.
- **Is `emit` synchronous?** Yes, in the sense that `emitter.emit` calls every subscribed `safeHandler` synchronously, in subscription order (Node EventEmitter semantics).
  - Each wrapper is `async`, so the handler body runs synchronously up to its first `await`. Anything after an `await` runs later.
  - `emit` returns `void`, and the caller cannot await completion.
  - Experiment: `a got from-a-early` printed before `FACTORY a end`.
- **1.4.0 differences: none.** `PI14/dist/core/event-bus.js` is identical. `PI14/dist/core/extensions/loader.js:114-166,420-432` has the same tracked-unsubscribe code.

## 2. Extension loading

- **Order.** For the extension paths, `loadCurrentExtensionSet` and `reload` call `mergePaths(cliEnabledExtensions, enabledExtensions)` (`PI/dist/core/resource-loader.js:424,801-812`). That puts `-e` extensions first, then the settings-resolved ones.
  - `PackageManager.resolve()` returns the extension entries sorted by `resourcePrecedenceRank` (`PI/dist/core/package-manager.js:63-71, 2276-2290`):
    - 0: project-scope local entries.
    - 1: project-scope auto-discovered entries (`source` is not `local`).
    - 2: user-scope local entries.
    - 3: user-scope auto-discovered entries.
    - 4: anything from an npm or git package (`origin === "package"`).
    - 5: built-in extensions.
  - The sort is stable, so within a rank the order is insertion order. Project `packages` are added before user `packages` (`:738-743`), each in settings order.
  - Within a package, the order follows the `pi.extensions` array order (the `resolveExtensionEntries` code at `loader.js:~690`, plus the package resolver). I did not trace the package resolver line by line.
  - Pi's own docs say only "extension load order" (`docs/extensions.md:414,1580`). No doc enumerates the order, so the ranks above come from source.
  - A package-installed Jefferson (rank 4) therefore loads after any local or auto-discovered extension, and a package-installed provider loads in settings order relative to it.
- **Startup pre-trust pass.** When project trust must be resolved, `reload({resolveProjectTrust})` first loads the extension set once with project settings forced untrusted (`resource-loader.js:362-368,563-585`). Those already-run instances are then reused (`loadFinalExtensionSet`). Only the remaining paths get their factories run after trust.
  - The final extension array follows the merged-path order, but factory execution order can differ. User, global and CLI factories run first, and project-trusted ones run later.
  - Extension factories also run in invocations that never start a session (`docs/extensions.md:253`, "Extension factories may run in invocations that never start a session").
- **Sequential, and each factory finishes first.** `loadExtensionsInternal` does `for (const extPath of paths) { await loadExtension(...) }` (bundled at `chunk-VEJDBY3O.js:689`). `initializeExtension` does `await factory(api)`.
  - `docs/extensions.md:213`: "If the factory returns a Promise, Pi awaits it before continuing startup".
  - Experiment: `FACTORY a start … FACTORY a end`, then `FACTORY b start`.
  - Same in 1.4.0 (loader code unchanged).
- **Separate module instances for the same import: yes.** This corrects the "might share" case. The helper must hold no module-level state.
  - The loader calls `createJiti(import.meta.url, {moduleCache:false, ...})` for each extension, so every extension entry gets its own import graph (`loader.js:481-490`, bundled at `chunk-VEJDBY3O.js:689`).
  - Experiment: two extensions each imported `shared/instruments`, a module with a counter. This was a single physical file, a normal tarball install in `node_modules`. Both printed `:1` (`a:1`, `b:1`), so they got two instances, not one shared counter.
  - `docs/packages.md:92` (1.5.2) says: "Installed packages load with separate module roots. Do not rely on two packages sharing one dependency instance…". The same sentence is at `PI14/docs/packages.md:92`.
  - `docs/packages.md:~114` also says host-provided packages must not be bundled or put in `dependencies`, or "A physical copy can bypass Pi's extension module mapping … and create duplicate classes, registries".
  - `pi.events` is not affected, because it belongs to the host bus rather than to the module. Providers and Jefferson share the bus even though their copies of the helper do not share state.
  - The helper's types are erased. `import type` and `satisfies` leave no runtime import.
  - Host packages are provided through jiti's `virtualModules` in the bundled build, which is how pi shares `@earendil-works/*` and `typebox` across extensions (`chunk-VEJDBY3O.js:689`, `getVirtualModules`). `pi-jefferson` is not one of those, so it gets a copy per importing extension.

## 3. "Startup has completed"

- Order at startup (`docs/extensions.md:360-393` flowchart; `PI/dist/core/agent-session.js:2756-2780`): all extension factories finish, then `bindExtensions` emits `session_start` (`reason` is `"startup"`, `"reload"`, `"new"`, `"resume"` or `"fork"`), then `resources_discover`, and only after a user prompt `before_agent_start`.
  - **Factory:** runs before everything else. `docs/extensions.md:213` says an async factory completes before `session_start` and `resources_discover`. Other extensions' factories may not have run yet, so it is not a startup-complete signal.
  - **`session_start`:** fires once, after every factory in this runtime has completed (`bindExtensions`, `agent-session.js:2776`). `reportUnhandledMcpServers()` and `resources_discover` follow it. On the reload path it is emitted again after the new factories, with `reason:"reload"` (`:3128-3131`). On `/new`, `/resume` and `/fork` it is emitted by the new runtime with the matching `reason` (`docs/extensions.md:512,529`).
    - On reload it is emitted only `if (hasBindings)` (a UI context, command context actions, a shutdown handler or an error listener is bound). That guard is at `agent-session.js:3123-3133`, so a reload with no bindings emits no `session_start`. I did not test that case. A headless SDK session could hit it.
    - Handlers run in extension load order (`docs/extensions.md:1580`). Because they run in order, a provider's `session_start` handler may run before or after Jefferson's. Registrations a provider emits from its own `session_start` can arrive before or after Jefferson's own `session_start` handler has run, depending on order.
  - **`resources_discover`:** fires after `session_start`, with `reason` `"startup"` or `"reload"` (`docs/extensions.md:393,448-451`). It is only emitted when some handler for it exists (`hasHandlers`, `agent-session.js:2781-2783`), so it is not a reliable marker.
  - **`before_agent_start`:** fires per prompt (`docs/extensions.md:615-660`), long after startup, and not at all if no prompt is ever sent. It is not a startup marker.
  - **Why `session_start` is the candidate.** It is the first documented point where every factory has completed and every listener is subscribed (`docs/extensions.md:213,393`).
  - **After a late provider registration.** Registration can also arrive later than `session_start`, for instance from a provider's own `session_start` handler or a later event (`docs/extensions.md:1586` shows `pi.registerTool` allowed in `session_start`). A provider could also emit lazily, once its own work begins, long after startup.
- Same in 1.4.0 (`session_start` and `bindExtensions` flow unchanged).

## 4. Publishing a `.ts` subpath with no build step

Experiments used a tarball-installed `shared` package (via `npm pack` and `npm i`, a real directory copy) with `"exports": {"./instruments": {"types": "./instruments.ts", "default": "./instruments.ts"}}`.

- **(a) Loader for pi extensions.**
  - Pi 1.5.2 loads extensions with jiti (`docs/extensions.md:211`: "Extensions are loaded via jiti, so TypeScript works without compilation"; `loader.js:24-31,470-490`). In the bundled build (`isBundledNode`, which is what the global `pi` bin uses: `dist/bundle/cli.js`) the options are `{virtualModules, tryNative:false}`, so jiti does the work and Node type stripping is not used.
  - Experiment: the provider-side `import {bump} from "shared/instruments"` resolved through `exports` and loaded the `.ts` file from `node_modules` fine.
  - The unbundled and source runtimes use `{alias}` or `{virtualModules, tsconfigPaths:true}` (`loader.js:476-486`), still jiti.
  - Same in 1.4.0 (`PI14/dist/core/extensions/loader.js:476,481`).
- **Plain Node refuses `.ts` inside `node_modules`.** Experiment with `node t.mjs` importing `shared/instruments`: `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING: Stripping types is currently unsupported for files under node_modules` (Node 26.8.1).
  - Jefferson's own tests (`node --test`) importing a `.ts` file from an installed copy of `pi-jefferson` would hit this. A plain-Node consumer is unaffected inside the repository, where the file is not under `node_modules`.
  - Pi does not hit it because jiti compiles the file.
- **(b) `tsc --noEmit` with `module/moduleResolution: nodenext`** (TS 7.0.2, strict, `verbatimModuleSyntax`, `skipLibCheck`, `types:[]`):
  - `"types"` and `"default"` both pointing at `./instruments.ts`, with `allowImportingTsExtensions:true`: passed (exit 0).
  - The same without `allowImportingTsExtensions`: passed.
  - `exports` as the bare string `"./instruments": "./instruments.ts"` (no `types` condition): passed.
  - Without any `exports` entry, `shared/instruments` failed with TS2307 "Cannot find module" (`exports` is required under `nodenext`).
  - `tsc` type-checks that `.ts` file under the consumer's compiler options. `skipLibCheck` does not apply to `.ts` source. I did not test a case where the file fails under a stricter consumer flag (for example `exactOptionalPropertyTypes`), so that remains a risk to check.
- **Repository check.** Jefferson's `package.json` has `"type":"module"` and `"files": ["extensions","README.md","LICENSE"]`, with no `exports` field. `tsconfig.json` is `nodenext`, `noEmit`, `allowImportingTsExtensions`. If the subpath lives outside `extensions/`, `files` has to include it, or the tarball will not carry it. Adding an `exports` field also closes off any other deep import of the package (everything not listed in `exports`), which matters to a consumer that currently imports a deep path. I did not examine consumers.
- **Peer dependency for a provider.**
  - `docs/packages.md:~100-114` (same text in 1.4.0): host-provided packages (`pi-ai`, `pi-agent-core`, `pi-coding-agent`, `pi-tui`, `typebox`) go in `peerDependencies` with a `"*"` range. They must not go in `dependencies`. "Pi suppresses automatic peer installation for managed npm packages". "Other Pi packages used as dependencies must be included in the published tarball and referenced through their `node_modules` resource paths."
  - So the docs give no rule for a peer between two non-host pi packages. `pi-jefferson` is not on the host list, and the docs do not mention `peerDependenciesMeta` or `optional`.
  - **Consequence.** Because pi suppresses automatic peer installation for managed npm and git packages, a `peerDependencies` entry on `pi-jefferson` is not installed by pi. A provider using only `import type` (erased) never needs the package at runtime, but a runtime import of `registerInstruments` needs it to be present in the provider's own resolution (as a `dependency`, or installed beside it). Per the docs, the "separate module roots" rule applies: the provider gets its own copy of the helper, and it cannot see Jefferson's copy.
  - Type-checking needs the package installed in the provider's dev environment either way.
  - I did not test `peerDependenciesMeta.optional` behaviour in pi's installer.

## 5. Prior art

- Pi ships `examples/extensions/event-bus.ts` (`PI/examples/extensions/`; a command emits `my:notification` and a listener consumes it). It shows emit and listen only. It has no contract, no types and no helper.
- No pi documentation describes one extension publishing a contract for others over `pi.events`.
- Third-party examples (web search, not independently verified beyond the page text seen in search results):
  - `nicobailon/pi-subagents` documents an in-process event-bus RPC: `docs/extension-api.md` lists `subagents:rpc:v1:ready`, `…:request` and `…:reply:<requestId>` channels with versioned payloads (https://github.com/nicobailon/pi-subagents/blob/main/docs/extension-api.md).
  - `gotgenes/pi-packages`, plan 0029 for `pi-permission-system`, re-introduces a typed `permission-request` channel. It says `pi.events` "is the only cross-extension communication channel Pi provides" (https://github.com/gotgenes/pi-packages/blob/main/packages/pi-permission-system/docs/plans/archive/0029-permission-event-channel.md).
  - `badlogic/pi-mono` issue #4207 proposes a typed service registry beyond the event bus. It is a proposal, not shipped, and I did not check its status (https://github.com/badlogic/pi-mono/issues/4207).
- Pattern seen in `pi-subagents`: a `ready` event lets late listeners learn the provider is up. That is a convention, not a platform feature. The platform does no replay.

## Differences from the supplied assumptions

- Confirmed: no replay or buffering in the bus. The bus is a plain emitter.
- Corrected: `session_start` reload emission is conditional on UI or command bindings being present (`agent-session.js:3123`).
- Corrected: the same package imported by two extensions yields two module instances even from one physical file, so the "holds no state" working assumption is confirmed, not merely likely.
- Corrected: the bus object survives `/reload` but not `/new`, `/resume` or `/fork`. Listeners do not survive either; they are removed at invalidation.
- Added: factory execution order and final extension order can differ because of the startup pre-trust pass.
- Added: `emit` during a factory works, but a provider that emits from a stale captured `pi` after reload throws.
- 1.4.0 differs from 1.5.2 on none of the items above.

## Gaps and unverified points

- I did not exercise `/reload`, `/new`, `/resume` or `/fork` live in a TUI. Lifecycle claims for them come from source and docs, not from running them.
- I did not test a reload with no UI bindings (headless), so the missing `session_start` there is from source only.
- I did not test `peerDependenciesMeta.optional`, or pi's installer behaviour for a peer on a non-host package.
- I did not test `tsc` failures from stricter consumer flags against a `.ts` file under `node_modules`.
- I did not trace the order of `pi.extensions` entries inside a package beyond reading the manifest resolver.
- Third-party prior art is from search snippets, not read in full.
