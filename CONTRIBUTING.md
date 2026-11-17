# Contributing

Read `AGENTS.md` before you change code. It holds the rules a change has to keep: how the source is laid out, what the format language guarantees, and the two traps this repository has already paid for.

## Development

`main` is the only long-lived branch, and every merge to it is a release.

```bash
pnpm typecheck
pnpm test
```

Tests live in `tests/`, never beside a source file. `node --test` runs the source directly and strips its types, so the source holds erasable TypeScript only: no `enum`, no parameter properties, no runtime `namespace`, no decorators.

`@earendil-works/pi-coding-agent` and `@earendil-works/pi-tui` are `peerDependencies`, not `dependencies`, because pi supplies them at runtime. A physical copy bypasses pi's module mapping and duplicates its classes and registries.

## Releasing

A merge to `main` releases. There is no separate release step. CI reads the pull request's label, computes the version and publishes it.

| Label | The bump |
| --- | --- |
| `release:major` | A major version. |
| `release:minor` | A minor version. |
| `release:patch` | A patch version. |

A pull request with no label ships a patch. A change that adds a surface, such as a new export, a new instrument or a new configuration key, carries `release:minor`. Everything else takes the patch default.

The version's base is the highest `v…` tag reachable from the commit before the one being released. `package.json` is not the base. A re-run computes the same version the first run did.

Only CI publishes. It authenticates through npm trusted publishing over OIDC, holds no token, and attaches provenance. A `pnpm publish` from a workstation fails before it reaches the registry.

[ADR 0018](docs/adr/0018-the-version-comes-from-a-label-and-the-tags.md) records why the version and the publishing work this way.
