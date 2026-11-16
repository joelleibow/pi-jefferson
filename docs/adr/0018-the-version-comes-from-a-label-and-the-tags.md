# 18. The version comes from a label and the tags

Date: 2026-11-15
Status: Accepted. Replaces the reasoning that lived in `docs/releasing.md`, which this change
removes.

## Context

Merging to `main` releases. The repository needs an answer to one question at that moment: which
version does this merge publish?

Two candidates were on the table. `package.json` could hold the next version, and a maintainer could
edit it with the change. The git tags could hold it instead.

Joel's 2026-11-15 ruling moved release and development out of the user documentation into a root
`CONTRIBUTING.md`, and put the reasoning about how releases are versioned in an ADR. A step in a
contributor file says what to type. An ADR says why the release works this way.

## Decision

- **The pull request's label picks the bump.** `release:major`, `release:minor` or `release:patch`.
  No label means a patch. It defaults low on purpose, so an unlabelled change never ships a major
  version by accident.
- **The git tags are the base, not `package.json`.** `main` accepts no direct pushes, so the workflow
  cannot commit an updated version back to it, and `package.json` would drift from what actually
  shipped. Every release writes a `v…` tag, and those tags are the record.
- **The base is the highest release tag reachable from the commit before the one being released.** A
  re-run computes the same version the first run did.
- **CI publishes, not a workstation.** Authentication is npm trusted publishing over OIDC. The
  workflow holds no token, and the package accepts publishes from this repository's release
  workflow. Provenance is attached automatically.

## Alternatives weighed and not taken

- **A version field in `package.json` that a maintainer edits.** The workflow cannot commit the
  computed version back to a branch that takes no direct pushes, so the field drifts from the
  published record.
- **A version derived from the commit messages.** The label is one explicit act by the person who
  knows what the change means. A message convention is a rule to remember on every commit, and it
  fails silently when someone forgets.
- **Publishing from a workstation.** `publishConfig.provenance` is `true`, and provenance is signed
  from a CI OIDC provider. A workstation has neither that provider nor a trusted-publishing
  credential, so the same `pnpm publish` fails before it reaches the registry.

## Consequences

- A merge without a label ships a patch. A change that adds a surface carries `release:minor`, and a
  contributor reads that rule in `CONTRIBUTING.md`.
- A failed release can be re-run, and it computes the same version.
- The published version is the tags, so `git tag` answers what shipped and `package.json` answers
  what the tree said.
