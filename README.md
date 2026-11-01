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

Every push to `main` publishes a prerelease — `<version>-pre.<run-number>`, on the
`pre-release` dist-tag, with a matching `v…` git tag and a GitHub Release marked as a
prerelease. An unpinned install never picks one up.

To ship a real version, bump `version` in `package.json` in a pull request, which makes it
the next release base, then run the **Release** workflow manually with `promote` set. That
publishes the base version to `latest`.

Authentication is npm trusted publishing over OIDC. The workflow holds no token and the
package is configured to accept publishes from this repository's `release.yml`, so there
is nothing to rotate and nothing to leak.

## License

MIT
