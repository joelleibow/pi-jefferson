# Chidi addendum 1 — color surfaces in pi 1.4.0

Question from `council-kimi`: does the published `@earendil-works/pi-coding-agent@1.4.0` expose
`Theme.getThinkingBorderColor(level)` and the seven `thinking*` foreground tokens? Verified
against the published 1.4.0 tarball (`npm pack @earendil-works/pi-coding-agent@1.4.0`), not
inferred from 1.5.0.

## Verified answers

**1. `Theme.getThinkingBorderColor(level)` — present in 1.4.0.**
`dist/modes/interactive/theme/theme.d.ts:81` declares
`getThinkingBorderColor(level: ThinkingLevel): (str: string) => string`, and
`dist/modes/interactive/theme/theme.js:244` implements it as the level→token switch.
`dist/modes/interactive/interactive-mode.js:1815` (also 2940, 3032) sets the editor border via
`theme.getThinkingBorderColor(this.session.thinkingLevel || "off")` — identical mechanism to 1.5.0.

**2. The seven tokens — all present in 1.4.0.**
`dist/modes/interactive/theme/theme-tokens.d.ts:205–232` declares `thinkingOff`,
`thinkingMinimal`, `thinkingLow`, `thinkingMedium`, `thinkingHigh`, `thinkingXhigh`, and
`thinkingMax` (with `fallback: "thinkingXhigh"`). `schemas/theme.schema.json` lists
`thinkingOff`…`thinkingXhigh` as required and defines `thinkingMax` as optional with the same
fallback description; `dist/modes/interactive/theme/dark.json:64–70` ships all seven values.
`docs/themes.md:128` documents the `thinkingMax` → `thinkingXhigh` fallback in 1.4.0.

**3. Does `peerDependencies: "*"` admit versions lacking either surface?**
No published version on npm lacks them. The registry's earliest published version is `0.81.0`;
its tarball also declares `getThinkingBorderColor` (`dist/modes/interactive/theme/theme.d.ts:29`)
and `thinkingMax`. The cumulative CHANGELOG in 1.4.0 shows `thinkingMax` was added in `0.80.6`
(line 1450: "Custom themes can define `thinkingMax`; existing themes fall back to
`thinkingXhigh`") and the thinking-level border color predates `0.85.0` (line 714). Versions
older than `0.80.6` would lack `thinkingMax`, but none were ever published to npm.

**4. Is a minimum-version note needed?**
Facts only: both surfaces exist in every published release (`0.81.0` through `1.5.0`), so the
`^1.4.0` devDependency pin and the `*` peer range resolve only to versions that carry them.
Whether to state that in package metadata is a design call for Michael/Joel, not this seat.

## Sources

- Published tarball `@earendil-works/pi-coding-agent@1.4.0` (npm registry), files cited above.
- Published tarball `@earendil-works/pi-coding-agent@1.0.0`: `theme.d.ts` also declares
  `getThinkingBorderColor`; `dist/modes/interactive/theme/dark.json:70` ships `thinkingMax`.
- Published tarball `@earendil-works/pi-coding-agent@0.81.0` (earliest on registry): same
  declaration at `theme.d.ts:29`.
- `npm view @earendil-works/pi-coding-agent versions`: published range starts at `0.81.0`.
- 1.4.0 `CHANGELOG.md` lines 714, 1419, 1450 for introduction history.
