# neil-p3 (9096582d-1f91-4ab6-a401-a7dbb4bcf8f4)

## Responses

- **D1** reject: 1. **Fails PL4, PL7, and the implementation gate:** `michael-the-architect.md` requires every test to be "a behavioral assertion about the application, not a library" (PL7), forbids any "test without a behavioral assertion, no test of a library's behavior" (Implementation gate), and forbids coupling to concrete internals (`package.json` `exports` hides `cache-stats.js`, `interactive-mode.js`, and `footer.js`). Deleting the Jefferson branches that *apply* those gates leaves a `node_modules` text check green (failing PL4's deletion bar).
2. **Contradicts T2 precedent:** `michael-orientation.md` T2 cites `status.ts:12-14` and explicitly concludes: "pi changes a threshold, Jefferson's notice fires differently, and no test can see it; the design states this as a consequence."
3. **Concrete false-fail and false-pass costs:** Scraping three compiled `dist/*.js` files breaks `pnpm test` when pi splits 5,500-line `interactive-mode.js`, renames locals in `formatTokens`, or changes JS literal emit (`300000` vs `5 * 60 * 1000`), yet passes green if pi keeps `1024`/`20000` while altering `scan` resets, `cacheWrite1h` math, or `thinking_dropped` structure. Because users run global pi (`1.5.2` vs repo pin `1.4.0`), drift is checked only on manual devDependency bumps, where a `shortcut:` comment naming exact upstream symbols carries the check without brittle `dist` scraping. [michael-orientation.md baseline, T2; research-chidi.md §1, Addendum 1 §1; /Users/joelleibow/.pi/agent/agents/michael-the-architect.md (The design gate PL4; The tasks gate PL7; The implementation gate)]

## Recommendation changed

false: D1 presents no new evidence beyond restating the pin-bump goal; keeping behavioral boundary tests on Jefferson's pure notice module plus a `shortcut:` provenance comment and stated design consequence (`michael-orientation.md` T2) stands.

## Out of scope

