# 1. Imports run one way; host packages are the host's to supply

Date: 2026-11-03
Status: Accepted. Supersedes the `Host packages are imported only at the load boundary` requirement of
`extension-source-layout`.

## Context

That requirement said runtime imports of `@earendil-works/*` may appear only in the module the host
loads as an entry. It was written during the layout change, approved by a review gate, and merged
without anyone measuring what it bought.

It buys nothing Node does not already give. A nested file importing `@earendil-works/pi-tui` resolves
to the same copy the entry gets; the package's own tests resolve it from `node_modules` just as
readily. The failure it was reaching for — two copies of the host in one process, so `instanceof`
checks, the theme proxy and the keybindings registry stop agreeing — comes from a *physical* copy, and
that is a different thing. It is already prevented by the clause that sits beside it: host packages are
`peerDependencies` with a `*` range and absent from `dependencies`.

What the rule did cost was plumbing. `truncateToWidth` and `visibleWidth` were injected into the
renderer as a `WidthHelpers` parameter so that file could avoid writing an `import`, and when the
renderer needed `HStack` the same treatment was proposed for a class.

## Decision

Host packages stay `peerDependencies` with a `*` range, and must not appear in `dependencies`.

Any shipped source file may import a host package at runtime.

Imports inside this package run one way: the entry may import the working parts, a working part must
not import the entry, and no import cycle may exist. That is the boundary with a failure mode — an
entry imported by a part runs the host wiring twice, and a cycle makes initialization order
indistinguishable from a design error.

## Consequences

- `HStack` and `Component` are ordinary imports in `row-renderer.ts`. `WidthHelpers` survives only
  because the tests pass the real helpers in, not because the import boundary demands it.
- The guarantee that matters moved entirely into the `peerDependencies` clause, which CI can check from
  the manifest without reading source.
- A future reader who wants the old rule back should bring a measurement with it.
