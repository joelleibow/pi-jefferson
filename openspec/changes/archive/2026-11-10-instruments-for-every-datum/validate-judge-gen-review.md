**What this change does:** PR #21 ships two changes at once. The first only moves files: the source is laid out as `components/instruments`, `components/row`, `components/visuals` and `data`. It also adds an `if: main` guard to the release job. The second adds three instruments (`branch`, `session`, `status`), the `$path|base`, `|absolute` and `|relative` forms, and the store and feed wiring that supplies the new data.

Reviewed head: `04c3a783ca689ca39a50ecf30969a038343e31c7`. It matches the brief and did not move.

The suite is 357/357 and `tsc --noEmit` is clean. I ran both. The layout matches the layout spec: there is no top-level `visuals/`, the import directions hold, and `data/` imports nothing outside itself. The branch, session-name, home-directory and attachment paths in the feed and store match their delta-spec scenarios, including release, a second attach and an attach after release. One caveat: the status resolver follows its scenarios, but the shared `collapse` breaks it on ANSI input (finding 1).

## Must fix

1. **Coloured statuses render as garbage** (`components/instruments/status.ts:L8-23`, via `format.ts:L45-47` and `L206`)
   - **What this is:** The `status` instrument joins the texts that other extensions pass to `setStatus`. It copies pi's own `sanitizeStatusText`, which replaces newlines, tabs and carriage returns and collapses spaces.
   - **Problem:** Extensions routinely colour their status. pi's `examples/extensions/status-line.ts` is documented as "themed colors", and a coloured status holds ESC (escape) sequences. pi's own footer keeps those sequences. Here, `resolveFormat` passes every variable value through `collapse`. `collapse` turns every control character, including ESC (`\u001B`), into a space, so the escape sequence is left as visible text. I ran the real resolver with the status `"\x1b[32m●\x1b[0m ok"`. It rendered `"Status:  [32m● [0m ok"`. The user sees `[32m` and `[0m` in the footer, plus a double space. The planned width is also wrong, because the visible `[32m` text is counted as columns. The new tests only feed plain text, so nothing catches this.
   - **Fix:** In `sanitize`, strip terminal sequences before the other replacements. Use `stripTerminalSequences` from `@earendil-works/pi-tui`, which `format.ts` already imports from. Or use `text.replace(/\x1b\[[0-9;]*m/g, "")`. Stripping is better than keeping the colour: the cell has its own style, and the repo's AGENTS.md warns that an open SGR (colour) sequence leaks into the pad that follows it. Add one test that feeds `"\x1b[32m●\x1b[0m ok"` and expects `"● ok"`.
   - **If we skip it:** Any user with a themed extension status, such as pi's own example, gets raw `[32m` text in their footer.

## Should fix

None.

## Nice to have

None. I found nothing worth deleting. Each new file is one declaration and a table entry. The form machinery (`variableForms`, the parse step and the resolve step) is used by `path` and covered by tests.

Verdict: fix 1 first, then ship.

Not checked: the live TUI (the PR says this is still open), Windows path behaviour of `$path|relative`, and the `README` raw-image URL, which resolves only after merge to `main`.
