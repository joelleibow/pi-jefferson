# Council Synthesis

## Question and Scope

Which source layout should the npm package `pi-jefferson` adopt, judged only against three
values: ease of change; adaptability and evolvability; easy inference, from a file's path, of
what that file is responsible for?

**Scope.** The source layout of a package that is one file today. Out of scope: the statusline
itself — the module library, format strings, rows, alignment, truncation.

**Evidence inputs.** `research-chidi.md`, `research-eleanor.md`, `proposal.md`, and
`specs/extension-source-layout/spec.md`, all in this change directory.

**Roster.** `council-kimi` (Kimi, thinking max) and `council-argon` (Gemini 4 Argon, thinking
high). Both fresh context, read-only, `read` as their only tool. No fallbacks. Pass cap 2;
**one pass run**.

**Material context given to both advisors.** The owner has waived his own clean-architecture and
dependency-injection standard wherever a preferred Node or pi convention delivers the same
value, so option D was in scope to reject.

## Perspectives & Trade-offs

### Agreements, reached independently

- **Option A is rejected.** Both name the same mechanism: a helper placed flat in `extensions/`
  is loaded as an extension and yields a startup diagnostic on every pi start. Kimi: the trap is
  "certain at the very next change, and merely reschedules this decision at higher cost with more
  code to move."

- **Option D is rejected on evidence rather than habit.** Both cite the research — no
  authoritative source prescribes internal layers at this size, `nodebestpractices` scopes its
  layering advice to medium-sized applications, and no lint exists here to enforce dependency
  direction. Both also observe that D's one genuine boundary, host session data against pure
  code, is already encoded layout-independently in the spec's requirement that runtime
  `@earendil-works/*` imports occur only in the host-loaded entry.

- **Both found the same error in the proposal.** `proposal.md` claims option B "changes nothing
  the host, `tsconfig`, or CI asserts." It is wrong about CI: `ci.yml` pins the exact tarball
  list including `extensions/jefferson.ts`, so B moving that file breaks the assertion.
  Kimi calls the proposal's framing "an active hazard if trusted"; Argon raises it on the same
  evidence. Two advisors reaching one correction independently is the strongest signal either
  produced.

- **Both confirm the host mechanics that make any choice safe or unsafe.** The `extensions/`
  convention is an *auto-discovery root*, scanned for every direct file and every one-level
  `index.ts`. A `package.json` `pi.extensions` manifest loads *only* the declared paths.

### The dispute, which is material because it decides the recommendation

- **Kimi recommends B** — `extensions/jefferson/index.ts` as the entry, siblings the host never
  loads. Its decisive cost against C: C distributes the load contract across three mechanisms
  that must agree — the manifest, `files`, and the CI assertion — of which only the CI assertion
  is machine-checked, and nothing verifies a manifest path resolves to a shipped file.

- **Argon recommends C** — a manifest-declared `src/` tree. Its decisive cost against B:
  `extensions/` remains an active auto-discovery root, so a stray top-level file, or any sibling
  directory containing an `index.ts`, silently becomes another extension. Under C no directory
  is ever auto-scanned.

**Both costs are real and they are different costs.** Neither advisor's claim contradicts the
other's; each is a true accounting of a risk the other weighted lower. **That is why Pass 2 was
not run.** The pass contract permits a cross-exam on a dispute that can plausibly be settled by
advisor evidence, and this one cannot: ranking an explicit-contract cost against an
auto-discovery cost is a weighting of the three values, not a fact either advisor can establish.
The residue is an owner decision below, and this memo records that rather than manufacturing a
convergence.

### One finding neither the proposal nor the spec anticipated

Raised by Argon, unaddressed by Kimi, and independent of which layout wins: **the CI check
asserts a static file list**, which conflicts with the spec's own requirement that adding an
ordinary module require no new CI expectation. Adding `src/layout.ts` or
`extensions/jefferson/layout.ts` changes `npm pack --dry-run`'s output and fails CI. That is a
defect in the existing check, and it belongs in the design.

## Synthesis & Recommendation

The council converged on two of four options and split on the third:

- **A is out** on mechanism.
- **D is out** on evidence.
- **B and C both survive**, each carrying one cost the other does not.

Because the surviving dispute is a weighting rather than a fact, the parent does not choose it.
The recommendation carried into the design is that **whichever the owner selects, three things
are fixed**:

1. The entry's load contract is stated in the repository, not left to a convention a reader must
   already know.
2. `files`, `tsconfig.json`'s `include`, and the CI tarball expectation change in the same change
   — and the CI check moves from a static file list to path invariants, so ordinary module growth
   stops requiring a CI edit.
3. The entry filename names its role. Argon's point that `extension.ts` signals the host-adapter
   boundary where `index.ts` does not, and Kimi's acknowledgement that `index.ts` is "the one file
   whose path under-serves the inference value," agree on this.

## Accepted & Rejected Feedback

**Accepted**

- The shared correction that the CI assertion must change under either B or C. `proposal.md` gets
  corrected in the design.
- Argon's CI-invariant finding, which contradicts the spec's "ordinary module" scenario as the
  check stands today.
- The shared rejection of D on evidence.
- Kimi's observation that `index.ts` does not name a responsibility.

**Rejected, with reasons**

- Kimi's framing that B's costs are "small relative to C's unchecked three-way agreement
  surface" — accepted as a real cost, not accepted as decisive, because Argon's auto-discovery
  cost is equally real and Kimi did not weigh it.
- Argon's framing that C's explicitness is "decisive" — accepted as a real benefit, not accepted
  as decisive, because the manifest path has no machine check, which Kimi established and Argon
  did not address.
- Kimi's "no owner decisions required." The dispute is not an engineering judgment the evidence
  resolves; it is a weighting, and the weighting is the owner's.

## Owner Decisions Required

**One decision: B or C.** Both are sound; they buy different insurance.

- **B — `extensions/jefferson/index.ts` as the entry, siblings the host never loads.** Keeps pi's
  documented directory form, leaves `files` and `tsconfig.json` untouched, introduces no manifest.
  Its cost: `extensions/` stays an auto-discovery root, so a stray file there becomes an
  extension, caught only by the host's loud per-start diagnostic.
- **C — a manifest-declared `src/` with one named entry.** Makes the load contract explicit and
  singular, and no directory is ever auto-scanned. Its cost: three mechanisms must agree —
  manifest, `files`, CI — with only the CI one machine-checked.

Everything else in this change follows from that answer and is already specified.

### Ruling — 2026-11-01

**The owner chose B:** `extensions/jefferson/index.ts` as the entry, with sibling modules the host
never loads. His stated reasons were pi's own documented multi-file form, `files` and
`tsconfig.json` left untouched, and sibling safety coming free from the host's one-level rule.

Two consequences are recorded with the ruling, because the synthesis above was written to serve
either answer and part of it does not apply under B:

- **The synthesis' item 2 overstates what changes.** It said `files`, `tsconfig.json`'s `include`,
  and the CI expectation all change. Under B only the **CI expectation** changes: `files` already
  ships the whole `extensions/` subtree, and `include` already covers `extensions/**/*.ts`. Kimi
  said precisely this; the synthesis did not carry it forward.
- **Argon's CI-invariant finding now blocks ordinary growth rather than being a general
  observation.** With the assertion pinned to a static file list, adding
  `extensions/jefferson/rows.ts` changes the tarball and fails CI — which contradicts the spec's
  own requirement that an ordinary module require no new CI expectation. This is a defect in the
  existing check and the design must resolve it.

A third consequence carries over unchanged: the entry filename. Under B the host resolves the
subdirectory through `index.ts`, a name that does not state a responsibility — Kimi's noted
weakness and the one place B under-serves the inference value. The design must say how B lives
with that, whether by a stated convention, by the subdirectory carrying its own manifest with a
role-named entry, or by accepting it explicitly.

### Ruling amended — 2026-11-01, by the owner

After ruling, the owner rejected the premise that the load contract should stay implicit, and
rejected pricing in what a future host might do. In his words: *"I like the explicitness of
declaring 'Hey Pi, here's the extension directory you expect.' and 'Hey agents or humans,
jefferson is the extension's working parts.'"* — together with *"this is only ever going to be
one package. There's no reason we should ever ship multiple extensions in one package. It breaks
the single responsibility rule."*

**The agreed shape is B's directory with the load explicitly declared.**

```
pi-jefferson/
├── extensions/jefferson/
│   ├── index.ts        <- declared to pi, and the only file it loads
│   └── <modules>.ts    <- the extension's working parts; never enumerated
├── tests/
└── package.json        "pi": { "extensions": ["./extensions/jefferson"] }
```

Verified in the installed host, the whole way down: a manifest entry naming a directory resolves
through `collectFilesFromPaths` → `collectResourceFiles` → `collectAutoExtensionEntries` →
`resolveExtensionEntries`, which returns that directory's `index.ts`. **And a package carrying a
`pi` field takes the manifest branch entirely, so `extensions/` is never scanned** — which removes
the stray-file cost that was plain B's only real disadvantage.

Declare the subdirectory, not `./extensions`: the parent re-enters `collectAutoExtensionEntries`
on `extensions/` itself, falls through to scanning its contents, and reintroduces the trap.

**Two constraints carried into the design.**

1. **One package, one extension.** Multiple extensions in one package break single responsibility,
   so the manifest names exactly one directory and the design must not create room for a second.
2. **The CI check moves off a static file list**, or adding an ordinary module under
   `extensions/jefferson/` keeps failing it — contradicting the spec's own ordinary-module
   requirement. `files` and `tsconfig.json` need no change.

The council's B-versus-C dispute closes here rather than being settled by argument: this takes B's
shape and C's explicitness, and costs less than C because neither `files` nor `tsconfig.json` moves.

## Evidence and Run Ids

| Advisor | Run id | Context | Confidence |
|---|---|---|---|
| `council-kimi` | `d36830d7-07d7-4ecb-b038-67bb4fb03058` | fresh | high |
| `council-argon` | `6a10ac2a-8790-4c09-9a2e-6c2fc30f6f2a` | fresh | high |

Passes run: 1 of 2. No fallbacks. Both returned schema-valid reports under the pass-1 contract.

## Confidence, and what would change the decision

Both advisors returned **high** confidence, and they agree on every factual mechanic — discovery
depth, `index.ts` resolution, manifest resolution with no containment check, the CI-pinned
tarball, `noEmit`. The split is entirely about which cost to carry.

What would change the decision:

- **Evidence that the host recurses into extension subdirectories**, or a roadmap intent to. That
  destroys B's sibling-safety invariant and settles it for C. *(Kimi)*
- **A second extension, non-code resources, or any requirement to be importable through Node
  resolution** via `main`/`exports`. That earns C's manifest outright. *(Kimi)*
- **Confirmation that third-party pi tooling hardcodes `extensions/` when inspecting npm
  packages.** That strengthens B, since a manifest entry would be invisible to such tooling.
  *(Argon, recorded as unverified)*
- **Adopting lint or boundary-enforcement tooling.** That could revive D, whose one real boundary
  the spec already encodes.
