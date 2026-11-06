**Question:** Are `styleTextWithAnsi`, `foregroundAnsi`, and `backgroundAnsi` re-exported from the pi-tui root index?

**Answer: Yes — all three are re-exported from the package root at both 1.4.0 and 1.5.0. A test helper can import all three from `@earendil-works/pi-tui` directly.**

Per-symbol, at resolved pi-tui **1.4.0** (`/Users/joelleibow/Projects/pi-jefferson/node_modules/@earendil-works/pi-tui`):

- `styleTextWithAnsi` — exported: yes. `dist/index.d.ts` line 3 (type/value declaration barrel, re-exported from `./colors.ts`); `dist/index.js` line 6 (runtime barrel, re-exported from `./colors.js`).
- `foregroundAnsi` — exported: yes. Same lines: `dist/index.d.ts` line 3, `dist/index.js` line 6.
- `backgroundAnsi` — exported: yes. Same lines: `dist/index.d.ts` line 3, `dist/index.js` line 6.

All three appear in the same single re-export statement on each file's respective line; there is one colors barrel line per index file.

At global pi-tui **1.5.0** (`/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-tui`): identical — all three exported from the root, `dist/index.d.ts` line 3 and `dist/index.js` line 6, byte-for-byte the same export statements as 1.4.0. No difference between versions for these three symbols.

**Fallback route (conditional branch — not triggered):** since all three are exported from the root at 1.4.0, no deep-import route is needed. For completeness, pi's own `theme.js` confirms the root route: `/Users/joelleibow/Projects/pi-jefferson/node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js` line 3 imports them from the package root, verbatim:

```js
import { backgroundAnsi, colorToHex, colorToOklch, foregroundAnsi, getTerminalColorMode, indexedColor, mixColors, parseColor, rgbColor, styleTextWithAnsi, } from "@earendil-works/pi-tui";
```

(used at lines 145, 192, 196, 200). This is a bare package-root import, not a deep file import, so the `exports`-map question does not arise. For the record: neither pi-tui 1.4.0 nor 1.5.0 has an `"exports"` field in `package.json` (grep returned no match in either), so deep imports would resolve at both versions — but none is required here.

Residual risks: none beyond the fact that line numbers refer to the exact installed tarballs inspected; a different patch release could shift them.