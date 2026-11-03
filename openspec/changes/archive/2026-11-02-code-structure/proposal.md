# Proposal

## Why

The package is one file — `extensions/jefferson.ts` — plus one test, and the next change (the
statusline) will add modules: a module library, format strings, rows, alignment, truncation.
Where those files go is currently undecided, and the repository's own machinery makes the
naive answer wrong: pi loads every direct `.ts` file in `extensions/` as an extension, so a
helper dropped beside `jefferson.ts` becomes a second extension and produces a startup
diagnostic on every pi start. The structure has to be settled before code is written into it,
or the first multi-file change will make the decision by accident.

The values it must deliver, in the owner's words: ease of change; adaptability and
evolvability; easy inference, from its path, of what code living where it does is responsible
for. The owner has waived his own clean-architecture and DI/contract standard wherever a
preferred Node/pi way delivers the same value, so a flat or manifest-based structure is in
scope — and any layered structure has to earn its layers against the alternatives.

## What Changes

- Settle the package's source layout: one stated place for the module the host loads, a place
  for helper modules the host never loads, and a rule for which modules may import
  `@earendil-works/*` at runtime.
- Move the existing source and the test's import only if the selected layout requires it.
  `/jefferson` keeps behaving exactly as it does now.
- Make the layout's claims checkable: the set of host-loaded entries, the host-import
  boundary, the published tarball set, and typecheck coverage of shipped source. Where a
  layout changes `package.json` `files` or the CI tarball assertion, both change deliberately
  in the same change.
- Out of scope: the statusline itself. The module library, format strings, rows, alignment,
  and truncation are a later change and must not appear as a deliverable here.

## Options Considered

Facts every option is measured against, from the research reports:

- The host loads each direct `.ts`/`.js` file in `extensions/`, plus one-level subdirectories
  that resolve to a `package.json` `pi.extensions` entry or an `index.ts`. Nothing recurses
  deeper.
- A `pi.extensions` manifest may name any path the `files` array ships; the `files` array,
  not the manifest, decides what is in the tarball.
- Tests must sit outside both host discovery and the tarball.
- `tsconfig.json` includes only `extensions/**/*.ts` and `tests/**/*.ts`.
- CI asserts the tarball is exactly `LICENSE, README.md, extensions/jefferson.ts,
  package.json`.
- There is no build step and there never will be: the `.ts` files are the artifact, and both
  jiti (in the host) and Node's type stripping (in `npm test`) execute them, so only erasable
  syntax is permitted.

### A. Flat `extensions/` — no folders until one is earned

Keep one file and add no structure; decide again when a second module appears.

*Merits:* the smallest possible change and no new rule to learn; pi's in-repo examples are
dominated by roughly seventy flat single-file extensions; zero risk of a load-contract
mistake; today's one-file package matches pi's documented "single file — simplest" form
exactly.

*Costs:* the flat layout expires at the next change, because a helper file in `extensions/` is
itself loaded as an extension; choosing A schedules this same decision for the statusline
change, when there is more code and the move costs more; and the owner's "inference" value is
deferred rather than delivered.

### B. `extensions/<name>/index.ts` with helper modules beside it

Retain the convention directory; the extension becomes a directory whose `index.ts` is the
entry and whose siblings are modules the host never sees.

*Merits:* it is pi's documented "directory with index.ts — for multi-file extensions" form;
`files`, the CI tarball assertion, and `tsconfig` `include` all stay as they are; no manifest
is introduced; and one rule — "index.ts is the extension; its siblings are internal" — makes
growth safe, a rule the host already implements.

*Costs:* most files under `extensions/` would not be extensions, so the directory name asserts
something false about them; the load contract is an implicit one-level resolution rule rather
than a statement in the repository; paths grow a level (`extensions/jefferson/layout/row.ts`).

> **Superseded, 2026-11-01.** The merit above claiming the CI tarball assertion "stay[s] as they
> are" is false, and the council found it: `ci.yml` pins `extensions/jefferson.ts` by name, so
> moving that file changes what CI asserts. See `design.md`, "Record correction", and
> `council.md`, "Ruling amended". The option as finally adopted is the amended ruling, which is
> B's directory shape with the load declared in `package.json` and no `src/` tree.

### C. Manifest-declared `src/` with a named entry

Add `"pi": { "extensions": ["./src/extension.ts"] }`, move source to `src/`, add `src` to
`files` and to tsconfig `include`, and update the CI assertion to the new exact tarball list.

*Merits:* the load contract becomes explicit and singular — one file is the extension and
everything else in `src/` is plainly not one; it is the ordinary Node/TypeScript layout
(`src/` with a single entry) that the owner named as an acceptable substitute for his own
standard; it scales to many module kinds with no nesting rules; and it is pi's documented
"resources live elsewhere" manifest form.

*Costs:* the manifest, `files`, and the CI assertion become three things that must agree, and
the package has one file today — investment ahead of evidence, though moving one file is the
cheapest this move will ever be; readers and tools that expect the `extensions/` convention
must learn a manifest field; and a wrong manifest path changes what loads with no file-system
convention to contradict it.

### D. Layered modules with explicit contracts (the owner's own default)

Organize by role — a pure core, an adapter that touches the host, modules that depend inward —
with dependencies passed in rather than reached for.

*Merits:* it states dependency direction as a rule rather than a hope, so "what is
responsible for what" is structural; the one boundary this package genuinely has — host
session data versus pure formatting and layout — becomes testable without a host, which the
current fake-`ExtensionAPI` test already gestures at; and it is the owner's established
standard rather than a new idiom.

*Costs:* no authoritative source (pi, Node, npm, TypeScript) prescribes internal layers for a
package this size, and the most-cited Node structure guide scopes its layer advice to
"medium sized apps and above"; DI containers solve a forty-plus-service composition problem
that does not exist here; and layers with no lint configured rot into folders that merely look
architectural. Its one defensible boundary can be adopted inside any layout above without
adopting the whole scheme.

**Recommendation, stated so the council can reject it.** B is the strongest option now: it is
the host's own documented multi-file form, it changes nothing the host, `tsconfig`, or CI
asserts, and it removes the flat layout's growth trap using a rule the host already enforces.
The strongest case against B: it parks most of the code under a directory whose name says "the
host loads this", so the inference this change exists to buy is weakest exactly where the load
contract lives. C is the option that states that contract in the repository, and the one-file
moment is the cheapest it will ever be to adopt it.

## Capabilities

### New Capabilities

- `extension-source-layout`: where extension source lives, what the host may load, what ships,
  and which modules may touch the host — expressed as checkable structural requirements.

### Modified Capabilities

None. `openspec/specs/` holds no capabilities, so nothing existing changes requirement.

## Impact

- `extensions/jefferson.ts` and the import path in `tests/jefferson.test.ts` — moved only if
  the selected layout moves them.
- `package.json` (`files`, and `pi.extensions` only under C), `tsconfig.json` `include`, and
  the CI tarball assertion in `.github/workflows/ci.yml` — touched only as the selected layout
  requires. Each is currently load-bearing and pinned; each edit is deliberate.
- No dependency changes. Host packages stay in `peerDependencies` with a `*` range and must
  never appear in `dependencies`.
- No change to `/jefferson` behavior, the release workflow, or the version contract.
