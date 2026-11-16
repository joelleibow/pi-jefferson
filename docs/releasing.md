# Releasing

Merging to `main` releases. There is no separate release step and nothing to remember to do.

## The bump comes from a label

The pull request carries one label: `release:major`, `release:minor` or `release:patch`. No label
means a patch. It defaults low on purpose, so an unlabelled change never ships a major version by
accident.

## The base comes from the tags

The version's base is the git tags, not `package.json`. Main accepts no direct pushes, so the
workflow cannot commit an updated version back to it, and `package.json` would drift from what
actually shipped. Every release writes a `v…` tag, and those tags are the record.

The base is the highest release tag reachable from the commit *before* the one being released. A
re-run therefore computes the same version it did the first time.

## Publishing

Authentication is npm trusted publishing over OIDC. The workflow holds no token, and the package
accepts publishes from this repository's `release.yml`, so there is nothing to rotate and nothing to
leak. Provenance is attached automatically.

## A workstation cannot publish

`publishConfig.provenance` is `true`, and provenance is signed from a CI OIDC provider. A workstation
has neither that provider nor a trusted-publishing credential, so the identical `pnpm publish` fails
before it reaches the registry. Publishing is CI's job, and that is enforced by the mechanism rather
than by a note in a file.
