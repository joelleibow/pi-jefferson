# matt-p3 (adefade1-f7fa-4446-9742-307db8f8add1)

## Responses

- **D1** accept: What I checked:
- **Michael's gates.** PL7 asks for "a behavioral assertion about the application, not a library". The implementation gate says "no test of a library's behavior". A test that reads pi's constants out of `interactive-mode.js` and `cache-stats.js` asserts pi's code, not Jefferson's.
- **What breaks without it.** The global pi (1.5.2) drifting from the pin (1.4.0) is caught by nothing, whether this test exists or not. My own pass-1 shortcut comment admits that. The test catches one case: a pin bump that retunes a threshold. A pin bump is a deliberate step, and the `shortcut:` comment's "re-check on every pin bump" already names that check.
- **Brittleness.** It fails on pi re-bundling or renaming code even when no threshold changed. It stays green if Jefferson's own gate is deleted.
- **Michael's position.** His orientation already accepts the residual risk: "no test can see it; the design states this as a consequence" (michael-orientation.md T2). Copying a pi rule without a scraping test has precedent in status.ts:12-14.

I accept D1 with one detail. The behavioural tests run on Jefferson's pure notice module and name each copied edge, with an input just inside and just outside it:
- 1,024 against 1,025 missed tokens (noise floor);
- 19,999 against 20,000 tokens, and $0.099 against $0.10 (display gate);
- $0.0099 against $0.01 (cost suffix);
- an idle exactly at 5 minutes, and one just under;
- 9,999, 10,000 and 99,999 tokens in pi's formatTokens;
- a model change and an idle together, where the model change wins;
- an aborted or errored message;
- a compaction or branch-summary reset;
- the thinking count rising against repeating.

Each constant gets one named home with its pi file and line cited (research-chidi.md Addendum 1, IM:3367, 3369, 3349; footer.js:20-30; cache-stats.js:5, 7, 24). Each of these tests fails if Jefferson's gate is deleted, which the dist-file test could not do. [michael-the-architect.md, The tasks gate (PL7) and The implementation gate, Tests; michael-orientation.md T2; research-chidi.md Addendum 1 §1; research-chidi.md §1 Miss detection]

## Recommendation changed

true: I withdraw the pass-1 drift test that reads pi's dist files. Michael's gates refuse tests of a library's behaviour, his orientation already accepts unseen drift as a stated consequence, and the test's one real catch, a pin bump, is the deliberate step the `shortcut:` comment already covers. Everything else in my pass-2 position stands.

## Out of scope

- Not checked: whether a test may read files inside `node_modules` under this repository's test layout. That question no longer matters now that the drift test is withdrawn.
