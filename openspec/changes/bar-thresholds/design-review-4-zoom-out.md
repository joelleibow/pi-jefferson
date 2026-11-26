{
  "mode": "review",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Pass on scope, reuse, and responsibility placement, with one minor altitude cleanup: move test-helper implementation recipes out of design.md. The prior sample-ownership and thresholds-only provider findings are resolved without introducing extra architectural layers.",
  "findings": [
    {
      "id": "ZO4-1",
      "severity": "minor",
      "location": "openspec/changes/bar-thresholds/design.md:115-116, Module & File Placement / Modified, tests/format.test.ts and tests/instrument.test.ts rows",
      "finding": "The test file map drops from design-level responsibilities into helper implementation: it supplies the exact instrumentBindings(...).render(...) expression, per-call construction mechanics, argument preservation instructions, and an inventory of direct call sites.",
      "rationale": "Zoom Out Standard §4 reserves helper internals for tasks or implementation. The architectural decision is simply that bar tests must exercise the real binding so defaults reach the visual through the production path. The exact helper expression and call-site editing checklist add maintenance detail without changing that boundary or contract.",
      "concrete_case": "An implementer updating the rendered helper in tests/format.test.ts is instructed by design.md to use a specific nested constructor expression and preserve individually enumerated call arguments. A harmless helper refactor would make this high-level design stale even though the binding-to-visual contract and test coverage remain unchanged.",
      "recommendation": "Keep the requirements to route bar tests through real binding, preserve existing geometry/blanking expectations, and flip the exact 70/90 assertions. Move the constructor expression, helper lifecycle recipe, direct-call inventory, and measured test counts into tasks.md or implementation notes."
    }
  ],
  "assumptions": [
    {
      "assumption": "The earlier repeated-placement ownership finding is resolved by one sample outcome owned by the shared name-bound instrument, while the row retains only per-cell text memoization.",
      "status": "verified"
    },
    {
      "assumption": "The earlier thresholds-only provider contradiction is resolved: the statusline scenario now explicitly removes default colours when a configured label-only list replaces the defaults.",
      "status": "verified"
    },
    {
      "assumption": "The new pure thresholds.ts has a justified domain-rule responsibility in this repository's existing flat shared-module layout; configuration and binding depend inward on it, and it imports neither.",
      "status": "verified"
    },
    {
      "assumption": "Existing format parsing, style validation, whole-instrument binding, provider containment, and fault-ledger delivery provide the reusable mechanisms needed; no additional framework, dependency, notification subsystem, or persistence layer is proposed.",
      "status": "verified"
    },
    {
      "assumption": "The per-sample slot and bind-time topLevelFills contract address required sample consistency and provider-failure geometry rather than speculative caching or a general state-machine abstraction.",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No files were edited and no tests, typechecking, or OpenSpec validation were executed.",
    "No historical design snapshot or textual diff was available through the read-only tools; review-stage changes were assessed against the recorded Stage 1 and Stage 2 findings and the current artifacts.",
    "External platform claims and reported test pass counts were not independently executed or revalidated.",
    "Deferred documentation work was not treated as a feature blocker, consistent with the settled design brief."
  ]
}