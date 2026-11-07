# Evidence: the import graph is shown acyclic

This file carries task 11.1's output with the change, for the spec "The import graph is shown
acyclic", scenario "The evidence". The check is the script held in `design.md` D10.3. It is not
committed, by design, and this change adds no standing check.

## Command

```
node /tmp/import-graph.cjs
```

## The real run

Run by the conductor at the branch head `0541708` on 2026-11-06, about 16:55. It prints 19 edges
and none of the words `CYCLE`, `IMPORTS THE ENTRY` or `BAD SPECIFIER`. The output is the contents of
`/tmp/restructure-graph-output.txt`, verbatim:

```
extensions/jefferson/configuration.ts -> extensions/jefferson/visuals/instrument.ts
extensions/jefferson/configuration.ts -> extensions/jefferson/visuals/format.ts
extensions/jefferson/configuration.ts -> extensions/jefferson/visuals/row.ts
extensions/jefferson/configuration.ts -> extensions/jefferson/visuals/instrument-binding.ts
extensions/jefferson/data/session-data-feed.ts -> extensions/jefferson/data/session-data-store.ts
extensions/jefferson/footer-setup.ts -> extensions/jefferson/data/session-data-store.ts
extensions/jefferson/footer-setup.ts -> extensions/jefferson/visuals/row-renderer.ts
extensions/jefferson/footer-setup.ts -> extensions/jefferson/visuals/row.ts
extensions/jefferson/startup.ts -> extensions/jefferson/configuration.ts
extensions/jefferson/startup.ts -> extensions/jefferson/data/session-data-feed.ts
extensions/jefferson/startup.ts -> extensions/jefferson/footer-setup.ts
extensions/jefferson/visuals/format.ts -> extensions/jefferson/visuals/instrument.ts
extensions/jefferson/visuals/instrument-binding.ts -> extensions/jefferson/visuals/instrument.ts
extensions/jefferson/visuals/instrument-binding.ts -> extensions/jefferson/visuals/format.ts
extensions/jefferson/visuals/instrument.ts -> extensions/jefferson/data/session-data-store.ts
extensions/jefferson/visuals/row-renderer.ts -> extensions/jefferson/visuals/row.ts
extensions/jefferson/visuals/row-renderer.ts -> extensions/jefferson/data/session-data-store.ts
extensions/jefferson/visuals/row.ts -> extensions/jefferson/visuals/instrument.ts
extensions/jefferson.ts -> extensions/jefferson/startup.ts
```

## The three planted mistakes

Derek ran these on the final tree during task 11.1 on 2026-11-06 (his report, section 11.1),
reverting each before the next; after each revert `git status --porcelain` printed nothing. Michael
reproduced them at the Validate adjudication. The lines each printed:

- (a) `visuals/row.ts` imports a type from `../configuration.ts`:
  `CYCLE extensions/jefferson/configuration.ts -> extensions/jefferson/visuals/row.ts -> extensions/jefferson/configuration.ts`
- (b) `visuals/row.ts` imports the entry: three `CYCLE` lines through `extensions/jefferson.ts`, and
  `IMPORTS THE ENTRY extensions/jefferson/visuals/row.ts`
- (c) one specifier loses its `.ts`:
  `BAD SPECIFIER extensions/jefferson/visuals/row.ts ./instrument`
