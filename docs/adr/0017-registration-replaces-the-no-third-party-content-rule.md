# 17. Registration replaces the rule that no API lets third-party code supply content

Date: 2026-11-15
Status: Accepted. Retires the 2026-11-03 rule that the exported surface offers no way for
third-party code to supply or replace the text a row shows.

## Context

The 2026-11-03 ruling named the model for this repository and said the extension exposes no API by
which third-party code supplies the text a row shows. That kept every instrument inside this
package.

That second rule held while the shipped table was the only source of an instrument. It also closed
the extension to any other package. taiknr needs its own instruments: stubs created with the tokens
they hold, tokens omitted and sent, context and dollars saved, and whether it makes decision calls.

Joel's 2026-11-15 rulings make registration the way in. Each extension owns its instruments in its
own repository. Jefferson publishes a small contract, and its own instruments register through the
same path. The owner ruling that states it is
`openspec/changes/archive/2026-11-03-session-data-store/owner-rulings.md:70-74`, quoted in
`owner-rulings.md` for this change.

## Decision

- **Registration is the only way third-party code supplies content.** An extension posts a
  registration on pi's event bus, and Jefferson renders the instruments it names.
- **Jefferson's own instruments take that path too.** `shipped.ts` holds the list Jefferson
  registers. The static name lookup is gone, and the reader, the fallback and the notice gate all
  resolve what has registered.
- **The exported surface offers registration and nothing else that supplies content.** The
  requirement that stated the old prohibition is removed and replaced by one that offers
  registration, keeps the export pin, and requires a new export to be argued against it. A new
  export carries the argument that the package's `exports` admits one path, so no deep import
  resolves, and that each importer gets its own module instance.
- **The contract is types only.** The provider imports it with `import type` and posts the payload
  itself. Nothing of this package runs inside an extension.

## Alternatives weighed and not taken

- **Keep the prohibition and add instruments to this repository.** Joel's ruling gives each extension
  its own instruments in its own repository, so the package would grow one extension's private data.
- **Ship a runtime helper beside the types.** A runtime import forces every provider to carry this
  package as a full dependency, because pi does not install the peer dependencies of the packages it
  manages and plain Node refuses to strip types under `node_modules`.
- **Ship a data-only payload with a formatter vocabulary.** It would invent a second declaration
  language for the same job the declaration already does.

## Consequences

- Any extension can put text in a user's footer. Jefferson validates every registration, contains a
  fault in a provider's resolver to one entry, and refuses one instrument's bad settings without
  rejecting the document.
- The export pin changed from scanning for a contribution path to pinning every shipped file's
  exported keys, so a new export is a visible decision again.
- A published contract cannot be withdrawn. A breaking change takes a new channel name, and the old
  one keeps working.
