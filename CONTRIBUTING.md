# Contributing

Merging to `main` releases. There is no separate release step and nothing to remember to do.

`AGENTS.md` holds the rules a change has to keep: how the source is laid out, what the format
language guarantees, and the two traps this repository has already paid for. Read it before you
change code.

## Development

`main` is the only long-lived branch. Every merge to it is a release.

```bash
pnpm typecheck
pnpm test
```

Tests live in `tests/`, never beside a source file. `node --test` runs the source directly with type
stripping, so a change writes erasable TypeScript only: no `enum`, no parameter properties, no
runtime `namespace`, no decorators.

`@earendil-works/pi-coding-agent` and `@earendil-works/pi-tui` are `peerDependencies`, not
`dependencies`, because pi supplies them at runtime. A physical copy bypasses pi's module mapping and
duplicates classes and registries.

## Releasing

The pull request carries one label. CI reads it, cuts the version and publishes.

### The bump comes from a label

The pull request carries one of three labels:

| Label | The bump |
| --- | --- |
| `release:major` | A major version. |
| `release:minor` | A minor version. |
| `release:patch` | A patch version. |

No label means a patch. The default is low on purpose, so an unlabelled change never ships a major
version by accident.

A change that adds a surface, such as a new export, a new instrument or a new configuration key,
carries `release:minor`. Everything else ships as the patch default.

### The base comes from the tags

The version's base is the git tags, not `package.json`. `main` accepts no direct pushes, so the
workflow cannot commit an updated version back to it, and `package.json` would drift from what
actually shipped. Every release writes a `v…` tag, and those tags are the record.

The base is the highest release tag reachable from the commit before the one being released. A re-run
computes the same version the first run did.

[ADR 0018](docs/adr/0018-the-version-comes-from-a-label-and-the-tags.md) records why the version is
computed this way.

### Publishing

CI publishes, not a workstation. Authentication is npm trusted publishing over OIDC. The workflow
holds no token, and the package accepts publishes from this repository's release workflow, so there is
nothing to rotate and nothing to leak. Provenance is attached automatically.

`publishConfig.provenance` is `true`, and provenance is signed from a CI OIDC provider. A workstation
has neither that provider nor a trusted-publishing credential, so the same `pnpm publish` fails before
it reaches the registry.
