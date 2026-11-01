# pi-jefferson

**Pre-alpha. This claims the name and does nothing else yet.** Installing it registers a
single command, `/jefferson`. There is no statusline in this package.

A starship-style statusline for [pi](https://github.com/earendil-works/pi): modules you
turn on and off, a real layout, and per-module formatting.

The name is a nod to the lineage — Jefferson Airplane became Jefferson Starship became
Starship.

## Status

`0.1.0` is the base for the first real release. Until it ships you will get a prerelease
if you install anything at all.

What the first release will do: render one row from an ordered module list, with a module
interface other extensions can contribute to. Nothing below that works today.

## Install

```bash
pi install npm:pi-jefferson
```

Then `/jefferson` reports the version. Nothing else happens, by design — a name claim
should not be able to change anyone's session.

## Why another statusline

`pi-powerline-footer` is excellent and is the reason this exists. It renders its row as a
joined string with a fixed set of presets, which means segment spacing is three columns
by construction, a segment cannot carry another segment's value, and the `left` / `right`
/ `secondary` groups are one flat list rather than rows or columns.

This package is for the case where you want a layout — rows, alignment, per-gap spacing,
a stated truncation priority — and per-module formatting, with the pi session's own data
behind each module.

## Development

Trunk-based: `main` is the only long-lived branch, and every merge to it is a release.

```bash
npm install
npm run typecheck
npm test
```

Tests live in `tests/`, never beside an extension. Pi loads every direct `.ts` file in
`extensions/` as an extension, so a test file there would run on every pi start.

`@earendil-works/pi-coding-agent` and `@earendil-works/pi-tui` are `peerDependencies`, not
`dependencies`, because pi supplies them at runtime. A physical copy bypasses pi's module
mapping and duplicates classes and registries; pi reports a warning when it sees a
manifest configured that way.

### A workstation cannot publish

`publishConfig.provenance` is `true`, and provenance is signed from a CI OIDC provider.
The identical `npm publish` on a laptop fails with `Automatic provenance generation not
supported for provider: null`. Publishing is CI's job, and that is enforced by the
mechanism rather than by a note in a file.

## Releasing

Merging to `main` releases. There is no separate release step and nothing to remember to
do.

**The bump comes from a label on the pull request:** `release:major`, `release:minor`, or
`release:patch`. No label means a patch. It defaults low on purpose — an unlabelled change
should never ship a major version by accident.

**The base comes from the git tags, not from `package.json`.** Main accepts no direct
pushes, so the workflow cannot commit an updated version back to it, and `package.json`
would drift from what actually shipped. Every release writes a `v…` tag, and those tags
are the record. Specifically, the base is the highest release tag reachable from the
commit *before* the one being released, which makes a re-run compute the same version it
did the first time.

Authentication is npm trusted publishing over OIDC. The workflow holds no token and the
package accepts publishes from this repository's `release.yml`, so there is nothing to
rotate and nothing to leak. Provenance is attached automatically.

## License

MIT
