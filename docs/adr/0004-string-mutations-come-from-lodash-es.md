# 4. String mutations come from `lodash-es`, the package's first runtime dependency

Date: 2026-11-06
Status: Accepted.

## Context

Joel ruled that a format's string mutations come from the community's de facto library rather than
from code written here. Shown the evidence, he then named the library: lodash. Lodash ships two
builds, and in this repository they are not interchangeable.

The measurement, run against the installed versions (`research-chidi.md`, Addendum 3): under pi's
extension loader all three import forms work. Under Node's own ESM loader — which is how `node
--test` runs this suite — `lodash`'s named imports throw `SyntaxError: Named export 'toLower' not
found`, while `tsc --noEmit` accepts that same form. The type checker models the CommonJS module as
an `export =` declaration and cannot see the failure, so a named import from the CommonJS build
passes `pnpm typecheck` and crashes `pnpm test`. `lodash`'s default import and `lodash-es`'s named
imports both work under both loaders.

Neither build ships declarations, and neither has an install script, so no pnpm build approval is
involved.

## Decision

`lodash-es` at `^4.18.1` in `dependencies`, imported per function from `lodash-es/upperFirst.js`,
`lodash-es/toUpper.js` and `lodash-es/toLower.js`, which loads three modules rather than the
library's index. `@types/lodash-es` at `^4.17.12` in `devDependencies`; its own dependency supplies
the other type package, so that one is not declared a second time.

The host packages stay `peerDependencies` with a `*` range. The dependency is installed by pi when
it installs this package and does not enter the published tarball, whose file set is unchanged.

## Consequences

- The package declares a runtime dependency for the first time. Consumers get it through
  `pi install`, not through the tarball, and nothing about the published file set or CI's invariant
  over it changes.
- Every string mutation a format performs is a call into the library. No case change is written
  here, which is what the ruling asked for and what a search of the shipped source can confirm.
- The failure this choice avoids is invisible to the type checker, so the suite is the guard that
  matters: it runs under the loader where the CommonJS named import throws. A future writer who
  switches to `lodash` will see the tests fail rather than the typecheck, and that ordering is the
  point.
- The modifier named `capitalize` is not lodash's `capitalize`, which lowercases the rest of the
  string. The ruling is first letter only, so the entry calls `upperFirst`, and the table says so at
  the line where someone would change it.
- Reversing the choice is one import and three manifest lines plus the lockfile.
