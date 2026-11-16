{
  "rulings": [
    {
      "dispute": "Owner question 1 (Codebase), together with CC1 (blocking), CC3, C4, S-4, R-05, COM-5 and C17: where and how often a provider-side fault surfaces. CC1 says a refused registration has nothing anyone can observe. CC3 and C4 say \"Jefferson reports the fault itself\" names no channel and no limit, and that a notify raised inside render loops. S-4 says the MUST cannot be observed. R-05 says four new warnings have no outlet and no timing. C17 says faults raised before a ctx exists are lost. Codebase offered three options: (a) once per instrument per session through notify, plus a /jefferson line; (b) console.error only; (c) every time it happens.",
      "ruling": "settled",
      "answer": "Every provider-side fault is a warning on the path configuration warnings take today, `ctx.ui.notify(message, \"warning\")`. The faults are:\n- a refused registration: wrong shape, a `jefferson` claim, a second claim on a taken name, or one field declared with two types;\n- a refused report: an undeclared field, a wrong type, or no registration;\n- a J1(b) settings refusal;\n- a resolver fault.\n\nEach warning names the claimed extension, the instrument or field, and the fault. Each fires once per (name or extension, fault kind) per session.\n\nNo warning is raised inside a render. A fault found during a render is queued and delivered outside it. Faults found before startup completes are held and delivered with the startup-complete batch, after the unknown-name parts, in the order they arrived. After startup they are delivered as they are found.\n\nOption (b), console.error only, is out. So is option (c), every occurrence. The delta replaces \"Jefferson MUST report the fault itself\" with this observable behaviour. A test renders a throwing resolver N times and asserts exactly one warning. The /jefferson half of option (a) is ruled in the next row.",
      "decided_by": "J1(b): \"a warning names the instrument and the fault\". D7: warnings come after startup completes. My measurement of pi's warning path below.",
      "evidence": "- interactive-mode.js:2276-2285 routes notify type \"warning\" to showWarning.\n- At :3760-3764, showWarning adds a persistent `Warning: …` line to chatContainer and calls ui.requestRender().\n- tui.js:658-667 then queues a render through nextTick and setTimeout. So a notify raised from inside a render schedules another render. A fault on every render writes one line per frame, so C4's loop is real.\n- Bus-listener throws reach only console.error, through safeHandler (Chidi §1, event-bus.js), and the TUI paints over them.\n- startup.ts:73 is today's only warning path.\n- The bus listener is subscribed in the factory and has no ctx, so faults before startup must be held (T2)."
    },
    {
      "dispute": "Codebase owner question 2 and C17: should /jefferson list the registered and refused instruments? Codebase says yes, with new strings for Joel. The alternatives offered were no change, or a separate command.",
      "ruling": "settled",
      "answer": "/jefferson does not change in this change, and its pinned strings stay.\n- The once-per-session warning is a persistent transcript line, so its cause stays on screen.\n- Whether an instrument registered is answered by the entry rendering it, and by the unknown-name warning after startup.",
      "decided_by": "D12: \"Don't invent what we don't have to.\" Measured: a warning persists in the transcript; it is not a transient toast.",
      "evidence": "- showWarning adds a ThemedText child to chatContainer (interactive-mode.js:3760-3764).\n- The /jefferson handler is at startup.ts:35-49, and its strings are pinned by a test in tests/jefferson.test.ts."
    },
    {
      "dispute": "Owner question 2 (Critic): if a frame paints while a provided entry waits for its registration at startup, should it show blank's placeholder text, or nothing until startup completes? Critic recommended deciding after measuring O10, and called the bold \"renders blank\" sentence the conductor's restatement.",
      "ruling": "settled",
      "answer": "While an entry waits for its instrument to register, it holds the `blank` instrument, exactly as an unknown name does. There is no third \"pending\" state.\n\nO10, measured from source:\n- pi starts the TUI before it binds extensions.\n- pi paints from a setTimeout queued after a nextTick.\n- So a frame can paint in the pending window only if some session_start handler after Jefferson's yields to a macrotask, such as real I/O or a timer, before the provider registers.\n- Awaited synchronous handlers chain on microtasks, and no paint comes between them.\n\nThe guide tells providers to register first in session_start, before any await. That closes the window for every provider that follows it. If Joel wants a different look after seeing it, that is a new ruling, and none is needed to proceed.",
      "decided_by": "- owner-rulings.md, 2026-11-15: \"An entry whose instrument has not registered renders blank until it does.\"\n- J1(b), which Joel picked: \"render its entries blank, as an unknown name does\".\n- Living statusline :1539-1545.",
      "evidence": "- interactive-mode.js:705-706: \"Start the UI before initializing extensions\", then ui.start().\n- tui.js:658-708: requestRender goes nextTick → scheduleRender → setTimeout.\n- runner.js:813-839 awaits each handler in order.\n- Not measured in a live pi session."
    },
    {
      "dispute": "Owner question 3 (Readiness): who approves the wording of the new user-visible warnings? Readiness offered two options: Michael drafts them in the design and Joel approves at his gate, or Joel sees them only in the shipped result.",
      "ruling": "settled",
      "answer": "The design states every new user-visible string word for word in one message table:\n- a refused registration;\n- a refused report;\n- a J1(b) refusal;\n- a resolver fault;\n- the two-spellings duplicate.\n\nThe tests assert these strings exactly. They reach Joel at the PL2 gate inside the design, as the instruments-block form did last change. D17's approved `row N: \"<name>\" is not a known instrument` is reused unchanged. Nothing needs to go to Joel before then.",
      "decided_by": "Precedent in the archived reshape-the-configuration change. Joel's literal example string bound the design (council-critic.md:21-24). The block form was drafted in the design for his gate (tasks.md:129, :350). Disputes reach Joel at the PL2 gate.",
      "evidence": "I searched every archived owner-rulings.md. No ruling hands string wording to anyone else, and the `row N:` string is Joel's own."
    },
    {
      "dispute": "C1 and COM-1: the MODIFIED statusline scenario \"An option the instrument does not declare\" rejects the whole document for any instrument. The ADDED J1 requirement refuses only a provided instrument, so one input gets two outcomes.",
      "ruling": "settled",
      "answer": "J1(b) governs.\n- Scope the MODIFIED scenario to Jefferson's own instruments, bare or `jefferson.default.*`.\n- The ADDED requirement owns provided instruments.\n- The same scoping applies to every other rejection scenario in the instruments-block requirement that a provided name could reach.",
      "decided_by": "owner-rulings.md, J1(b).",
      "evidence": "I read both texts in specs/statusline/spec.md. The MODIFIED scenario says \"an instrument's entry carries a key its declaration does not have … the document is rejected\", with no scope. The ADDED requirement refuses \"that instrument alone\"."
    },
    {
      "dispute": "C2: the J1(b) check is tied to the moment of registration. When a provider registers before Jefferson reads the document, a naive reader finds the declaration at read time and rejects the whole document, so the result depends on load order. No lens covered a fault under a provided name that does not depend on its declaration, such as a value that is not an object, or `format: 5`.",
      "ruling": "settled",
      "answer": "The rule depends on the name, not the timing. Every name whose first part is not `jefferson` is a provided instrument.\n\nEverything under a provided name's key in the instruments block is checked, shape included:\n- a value that is not an object;\n- a format or label that is not a string;\n- an option the instrument does not take;\n- a variable or form its registration does not carry;\n- an unknown modifier;\n- a style the theme refuses.\n\nThe check runs once both the document and that registration are in hand, whichever comes second. It never runs before Jefferson's own session_start, because the style check needs ctx.ui.theme. A fault refuses only that instrument. A provided name that never registers gets only the unknown-name warning. The delta adds a scenario for a provider that registered before the read.",
      "decided_by": "J1(b), literally: \"When a provided instrument registers, Jefferson checks that instrument's settings … A fault refuses only that instrument … Jefferson's own instruments keep the whole-document rejection.\" The line falls between whose instrument it is, and \"a fault\" means any fault in that instrument's settings.",
      "evidence": "- runner.js:813-839 runs session_start handlers in extension order, so the provider can go first.\n- configuration.ts:110-112 classifies a name at read time.\n- configuration.ts:165 calls validateStyle(entry.style, theme), and the theme comes from ctx at startup.ts:58-62.\n- parseFormat needs the declaration (instrument-binding.ts:24), so a provided format cannot be parsed before its instrument registers."
    },
    {
      "dispute": "C3, COM-3, R-03, S-3 and S-5: nothing requires a report or a late registration to request a repaint. No store requirement admits provider fields, and the replacement rule is restated in instrument-registration.",
      "ruling": "settled",
      "answer": "D4 makes provider fields store data. The session-data-store delta gains one requirement. A field that a registration declares is a store datum:\n- it enters by report and by nothing else;\n- it reads unknown until it is reported;\n- a report that changes its value requests one repaint, and a report of the same value requests none (the living :192 rule);\n- it does not survive a session replacement (:169).\n\ninstrument-registration refers to that requirement and drops its own \"MUST NOT survive a session replacement\" (S-5).\n\nstatusline's \"A name that registers during the session\" gains this: a registration that changes what a placed entry renders requests one repaint. A registration or report that arrives before the footer is installed needs no repaint, because the install reads what is held. Living :232 is unchanged: it is scoped to \"a datum the host provides\" and does not cover reports.",
      "decided_by": "D4: \"Jefferson manages the store.\" Living session-data-store :192 (\"A pushed change that alters displayed data results in a repaint\") and :169.",
      "evidence": "- session-data-store.ts:170-195 compares old and new values with `!==` and calls requestRender only when they differ.\n- tui.js:658-708 paints only when asked.\n- Living :232 opens with \"A datum the host provides\"."
    },
    {
      "dispute": "C5, ZO-1, R-04, COM-4 and CC6 on provider faults:\n- Does a resolver returning `undefined` count as a fault?\n- Which callbacks are contained?\n- What does a faulted entry render?",
      "ruling": "settled",
      "answer": "1. `undefined` from a variable, form, select or shownUntil, and `null` from bar, are the declaration type's own unknown values, not faults. A fault is a throw, or a value outside the callback's declared result type, a Promise included.\n2. Containment is one boundary around the whole bound render of a provided instrument, meaning any name whose first part is not `jefferson`. It covers every callback path and everything their values reach, such as collapse and theme.fg. Jefferson's own instruments render unwrapped, as today, so their defects still fail the suite.\n3. A render that faults renders that entry's text as nothing: the unknown datum's nothing, label included. It keeps its bound geometry and is not swapped to `blank`, which is for unknown names and J1(b) refusals. The next render tries again, and the fault is reported once (row 1).\n4. New, and measured: if a returned promise rejects and nobody observes it, it crashes pi. The boundary must observe the rejection of a returned thenable.\n\nThe delta adds three scenarios:\n- an undefined variable renders as unknown, with no fault;\n- a throw, a non-string value and a rejecting promise each cost only their own entry;\n- pi keeps running throughout.",
      "decided_by": "The declared types in instrument.ts. S1 and T9 from my orientation. My rejection measurement below.",
      "evidence": "- instrument.ts:16, 23-25, 32, 38, 43, 50 declare `undefined` or `null` as valid results.\n- format.ts:218-222 treats undefined as unknown and returns \"\".\n- format.ts:37 collapse calls text.replace, which throws on a number or a promise.\n- I ran a script in a `mktemp -d` copy whose resolver returns Promise.reject and drops it. Node exits with code 1.\n- pi 1.4.0 installs no unhandledRejection handler on the interactive path: rg finds one only in codemode-worker.js.\n- pi's uncaughtException handler calls process.exit(1) (interactive-mode.js:3520-3528, :3572-3573)."
    },
    {
      "dispute": "C6 and R-06: a strict \"a message of another shape MUST be refused\" rule stops the contract from growing. Neither lens decided between ignoring unknown keys and a version marker.",
      "ruling": "settled",
      "answer": "Jefferson reads both messages tolerantly:\n- An unknown key is ignored.\n- A required key that is missing, or of the wrong type, refuses the message and warns (row 1).\n\nThe channels grow only by adding. A breaking change takes a new channel name, so there is no version field now.\n- A newer provider on an older Jefferson keeps everything the older Jefferson understands.\n- On a Jefferson without this feature, nobody hears a provider's message, because emit returns nothing. The guide states the minimum Jefferson version and this symptom.\n\nThe delta replaces \"of another shape\" with \"missing required content, or carrying it with the wrong type\". A provider that types its payload with the contract gets TypeScript's excess-property check on its own object literal, which catches its typos at compile time.",
      "decided_by": "- D1: separate repositories that update independently.\n- D12.\n- ci.yml:33-35: a published mistake is permanent. Refusing unknown keys would forbid adding any key, ever.",
      "evidence": "- event-bus.d.ts declares `emit(channel: string, data: unknown): void`.\n- Chidi §4: pi installs no peers, so nothing pins a provider's version to Jefferson's."
    },
    {
      "dispute": "R-01: the bus carries no sender, so how is Jefferson's own `jefferson.default.*` registration told apart from a forged one? Readiness proposed a seal by ordering, and C12 proposed checking payload identity.",
      "ruling": "settled",
      "answer": "Jefferson's listener accepts a `jefferson` claim only when the payload is the exact object Jefferson emitted, checked by identity. Every other `jefferson` claim is refused and warned.\n\nOrdering, or a flag set around Jefferson's own emit, is not enough. A provider whose factory ran first is already subscribed to the same channel, and the emitter calls it synchronously during Jefferson's emit. So it can emit a forged claim inside that window. A provider that re-emits Jefferson's own object only claims names already taken, which the duplicate rule refuses.\n\nFor a provided name, the first claim wins, and a later claim is refused and warned. Jefferson reads its own payload through its full declaration type, and every other payload through the provider contract.\n\nTests on a real createEventBus check three things:\n- every shipped name is registered after the factory runs and before any session_start, so a shipped declaration refused by mistake fails loudly;\n- a later `jefferson.*` claim is refused, and the built-in still renders;\n- a second claim leaves the first in place.",
      "decided_by": "D6: the `jefferson` namespace is Jefferson's. My measurement of the bus below.",
      "evidence": "- event-bus.js is a bare EventEmitter, and emit calls listeners synchronously in subscription order (Chidi §1).\n- The payload carries no sender (event-bus.d.ts).\n- Package extensions load at rank 4 (package-manager.js:62-70), so other extensions' factories can subscribe first.\n- Unchecked: what two copies of Jefferson loaded together would do."
    },
    {
      "dispute": "C12, S-7 and R-07 on the name grammar:\n- Is the reservation a prefix test or an exact match on the first part?\n- What about case, dots inside a part, and three-part provided names?",
      "ruling": "settled",
      "answer": "A provided name is exactly two parts separated by one dot. Each part is non-empty and contains no dot.\n\nThe reservation compares the first part exactly with `jefferson`:\n- `jeffersonfan.stats` is legal.\n- An extension named `jefferson` can provide nothing, and its refusal says why.\n- Case cannot be used to imitate Jefferson.\n\nI recommend `[a-z][a-z0-9-]*` for each part. The shipped names already fit it, and it makes the case question moot; the exact character class is the design's.\n\nThree-part names belong to Jefferson alone: `jefferson.default.*` now, and `jefferson.custom.*` later. A document that writes `jefferson.path` or `a.b.c` names nothing registered, so the entry renders blank and warns after startup. The scenario's wording becomes \"whose first part is `jefferson`\".",
      "decided_by": "D6: names are `<extension>.<instrument>`, Jefferson's are `jefferson.default.*`, and the grammar leaves room for `jefferson.custom.*`.",
      "evidence": "- The shipped names (shipped.ts:16) are single lowercase words.\n- Today's lookup is an exact match (shipped.ts:19-20; configuration.ts:228)."
    },
    {
      "dispute": "C7 and T7: the binding memo and the configured map are keyed by `declaration.name`, so a provider's `path` and Jefferson's `path` could share a binding. The two spellings of one default instrument must also collapse to one key.",
      "ruling": "settled",
      "answer": "One normalization, at the reader's edge, turns every name a document writes into the full registered name. A bare name becomes `jefferson.default.<name>`.\n\nThese are all keyed by the full name:\n- the configured map;\n- the binding memo;\n- the notice gate's identity check;\n- declaredSeconds.\n\nThe spelling the document used is kept only for messages. A provided declaration is registered under its full name, so `taiknr.path` and `jefferson.default.path` never share a binding.",
      "decided_by": "D6 and D7: separate namespaces, and a bare name means the default instrument. Living statusline \"An instrument is declared once\" (:413-431).",
      "evidence": "- instrument-binding.ts:21, 23 and 60 key by declaration.name.\n- configuration.ts:170, 176 and 299-300 do the same."
    },
    {
      "dispute": "CC5, C16, COM-6 and R-07: what does an instruments block do when it configures both `path` and `jefferson.default.path`?",
      "ruling": "settled",
      "answer": "It rejects the document, and the warning quotes both keys as written. Only Jefferson's own instruments have two spellings, so this is always a fault in one of Jefferson's own instruments. The string goes to Joel at the PL2 gate (row 4).",
      "decided_by": "J1(b), second half: \"Jefferson's own instruments keep the whole-document rejection\". ARCHITECTURE.md:89: \"configures each name once\".",
      "evidence": "configuration.ts:106-176 calls configured.set in Object.entries order. Once both spellings resolve to one name, the later key wins in silence, and the result depends on key order."
    },
    {
      "dispute": "S-1, C8 and C10: what does a registration carry?\n- S-1: no requirement states what a registration contains, yet two deltas depend on it.\n- C8: `shownUntil` would reach providers with no expiry repaint.\n- C10: an option a provider declares can never mean anything.",
      "ruling": "settled",
      "answer": "instrument-registration gains one requirement for what a registration carries: the extension, the fields it declares with their types, and for each instrument:\n- its name;\n- the resolvers of the variables its format may name, which read the provider's fields;\n- its default format;\n- optionally, its default label.\n\nSettled exclusions:\n- No `shownUntil` (C8, option a). The store arms an expiry repaint only for its notice slot, so a provided timed instrument would never hide on time.\n- No `options` (C10). A provided instrument takes format, style and label, declared once by Jefferson. No configured option ever reaches a resolver.\n- No `composed`.\n\n`variableForms`, `bar`, `fills` and `variableFg` also stay out of this change. Nothing the request names needs them. Every member offered is permanent once published, and each joins the type closure that every provider compiles. Adding one later only adds.\n\nJefferson's InstrumentDeclaration becomes the contract's declaration over Jefferson's Readings, plus the members only its own instruments take. A member that change 3 adds to the base then reaches both at once. This narrows my orientation §2 from \"same type\" to \"one base type\", which keeps its purpose. The statusline J1 scenario becomes \"an option a provided instrument does not take\".",
      "decided_by": "- D12.\n- D8: change 3 builds on this contract.\n- ci.yml:33-35: a published mistake is permanent.\n- My measurement that the contract's import closure is type-checked under the provider's flags (row 22).",
      "evidence": "- session-data-store.ts:117-139: armExpiry is called only from showNotice.\n- instrument-binding.ts:10-16: ConfiguredInstrument carries only segments, style, label and formats.\n- render(readings, width, theme) receives no options.\n- seconds is read only by the notice gate (configuration.ts:176, :300)."
    },
    {
      "dispute": "COM-2: which field does a report address when a provider has several instruments, or when two providers each declare `saved`?",
      "ruling": "settled",
      "answer": "Fields belong to the provider, not to one instrument.\n- A report names the extension and the field.\n- Every instrument that provider registered reads the provider's fields.\n- Two providers' fields of the same name are separate fields.\n- One field name has one type per provider. A registration that declares one field with two types is refused.\n- A provider's resolvers receive only that provider's fields (S2).",
      "decided_by": "D5, in Joel's words: \"I'm FOO and my data, BAR, changed\". D4. My orientation's S2.",
      "evidence": "owner-rulings.md, 2026-11-15, \"There are two messages\": the report names the provider and the data, not an instrument."
    },
    {
      "dispute": "C11 and R-08: the field types are open-ended, and nothing says what a bad report does or whether a declaration carries a first value.",
      "ruling": "settled",
      "answer": "Field types are string, finite number and boolean.\n- A declaration carries no first value, and an unreported field reads unknown.\n- The store keeps the latest value per (extension, field), never a queue.\n\nA report is refused, changes nothing and warns once (row 1) when it:\n- names an undeclared field;\n- comes from an extension with no registration;\n- carries a value of the wrong type, NaN and ±Infinity included.\n\nThe plain-data members of a registration are copied when it registers: names, default format, default label and field types. A later mutation by the provider then cannot get past the J1(b) check. Resolvers are kept by reference.\n\nA report that arrives before its own registration is a provider fault, not a race. The bus is synchronous, and one provider's emits arrive in order.",
      "decided_by": "D4 and D8. My measurement that the bus hands payloads over by reference.",
      "evidence": "- event-bus.js calls emitter.emit(channel, data) without cloning.\n- session-data-store.ts:170-195 detects a change with `!==`. A mutated array defeats that check, and NaN would request a repaint on every report."
    },
    {
      "dispute": "CC2 (blocking): D8's boolean has no path from a declaration to rendered text. Reading is `string | undefined`, and the scenario \"renders what its format gives false\" is circular. CC2 offered two options: a boolean renders as the word true/false, or it renders only through change 3's visual.",
      "ruling": "settled",
      "answer": "Jefferson converts no value itself. A field reaches text only through a variable resolver that the registration supplies. That resolver receives the typed value, with `false` distinct from `undefined`, and returns the text, as every shipped resolver does.\n\nThe scenario becomes: a provider declares a boolean `working` and a variable whose resolver returns \"idle\" for false. A report of false renders \"idle\". Before any report, the entry renders as unknown.\n\nThe host's `Reading` stays `string | undefined`. The wider value range belongs only to provider fields, read through the provider's own view (S2). A visual for booleans is change 3's.",
      "decided_by": "- S1 and S2 from my orientation: the payload carries resolvers, and providers get a narrow view.\n- AGENTS.md: \"an English word inside a value is what a user writing their own words would have to work around\". An automatic `true`/`false` word is exactly that.\n- D13: configurable strings.",
      "evidence": "- instrument.ts:32: variables return `string | undefined`.\n- format.ts:217-222 builds a `Map<string, string>` and returns \"\" on undefined.\n- session-data-store.ts:7 defines `Reading = string | undefined`."
    },
    {
      "dispute": "CC4: what does a provided instrument render when only some of its declared fields have been reported?",
      "ruling": "settled",
      "answer": "Provided instruments keep today's unknown rule, which is broader than CC4 states. resolveFormat runs every variable the declaration carries, not only the ones the format names. If any of them returns undefined, the entry renders nothing, label included. So a provided instrument renders only when all of its variables resolve.\n\nThe rule does not change, because the living spec pins it for shipped instruments. The delta adds a scenario that pins it for a provided instrument. The guide says it plainly: for the entry to keep showing, a resolver returns text for an unreported field, or the provider splits the instrument.",
      "decided_by": "Living statusline \"An unknown datum suppresses the label\" (:881) and the model requirement (:107: \"MUST be nothing when either datum is unknown\"). docs/instruments.md:70.",
      "evidence": "format.ts:218-222 loops over Object.entries(declaration.variables) and returns \"\" on the first undefined value."
    },
    {
      "dispute": "ZO-2: the scenario \"One name in two spellings, two rows\" says \"a notice shows once rather than twice\". That would need suppression across entries, which contradicts \"One configuration, two cells holding it\".",
      "ruling": "settled",
      "answer": "Reword the scenario. Both entries render the one instrument, with its one configuration and its one notice gate: one visible time and one expiry. This is what two `notice` entries do today. There is no suppression across entries, and \"shows once\" goes.",
      "decided_by": "Living statusline \"One configuration, two cells holding it\". T7.",
      "evidence": "- instrument-binding.ts:18-23 memoizes one shared instrument per name.\n- configuration.ts:299-300 compares bind(notice) by identity."
    },
    {
      "dispute": "C13: the delta lets a provider register \"from session_start or later\". A registration after the startup-complete marker always gets a false unknown-name warning first.",
      "ruling": "settled",
      "answer": "The requirement says a provider's registration is complete by the end of its awaited session_start handler. A registration after startup completes still renders from the next render on, but its name has already been warned as unknown. The guide adds: register before any await in session_start (row 3).\n\nAdopt resources_discover as the startup-complete marker (O1). It gets a pin comment like the one in data/notice.ts, because no pi document promises this order.",
      "decided_by": "D7: warn after startup completes. My measurement of the marker's order below.",
      "evidence": "- In 1.4.0, agent-session.js:2680-2686 emits session_start to every extension, then emits resources_discover if a handler exists.\n- runner.js:1165-1198 runs resources_discover handlers in extension order.\n- Critic checked the same order in 1.4.0."
    },
    {
      "dispute": "C14 (O2): the renderer copies each cell's `fills` when it builds the tree, so a provided instrument that replaces a pending `blank` keeps blank's geometry.",
      "ruling": "settled",
      "answer": "A late registration changes both the entry's text and its geometry. An entry that held `blank`, which fills, takes the provided instrument's width behaviour from the next render on. The statusline scenario \"A name that registers during the session\" says so. The mechanism is the design's (O2): C14 suggests reading `fills` on every plan. The design names the renderer requirement it modifies, \"The footer's tree is built once\" (:260).",
      "decided_by": "D7 (\"renders blank until it does\", and the instrument after). Living statusline :260-266.",
      "evidence": "- row-renderer.ts:54 copies cell.instrument.fills when the tree is built, and :88 reads that copy.\n- blank fills (blank.ts)."
    },
    {
      "dispute": "R-02 and C15: when are registrations and reports cleared? Clearing at Jefferson's session_start would drop a provider that registered first.",
      "ruling": "settled",
      "answer": "Jefferson holds registrations and reports from its factory on.\n- Provider registrations and reported values are dropped in the session_shutdown handler startup.ts already has. They are never dropped at session_start.\n- Jefferson's own registrations, made from the factory, last for the factory's life.\n- A provider that registers again after a shutdown is accepted.\n\nTests cover three cases: the provider first, Jefferson first, and the harness starting again after a shutdown.",
      "decided_by": "Living session-data-store :169. T2 and T3 from my orientation.",
      "evidence": "- agent-session-runtime.js:102-113 (teardownCurrent) emits session_shutdown before every resume, new, fork and import (:136, :160, :206, :224, :235).\n- agent-session.js:3001 does the same on reload.\n- startup.ts:31-33 is the existing shutdown handler.\n- runner.js:813-839 runs session_start handlers in order."
    },
    {
      "dispute": "C9, zoom-out, R-09 and CC8: should the contract be types-only or carry a runtime helper, and what may it import? CC8 says any `.ts` sibling import fails a provider's tsc (TS5097). C9 says the contract's whole import closure is type-checked under the provider's flags.",
      "ruling": "settled",
      "answer": "The contract is types-only.\n- The file `pi-jefferson/instruments` names, and every file it imports, hold type declarations only, with no runtime statement.\n- It imports none of Jefferson's runtime files. pi's published type packages are allowed.\n- Channel names are string-literal types, and the provider writes the literal.\n- It sits under extensions/jefferson/, and the export pin lists it with no runtime exports.\n- If data/ needs the field-value type, that type lives once, in a types-only file in data/, and the contract imports it. data/ imports nothing outside itself.\n\nI measured both premises. CC8's is refuted: a `.ts` relative import inside the package compiles for a provider without allowImportingTsExtensions. C9's holds: the closure is type-checked under the provider's flags. So the design adds a check that a sample provider type-checks against the packed contract under flags other than Jefferson's.",
      "decided_by": "- D3: a small package Jefferson publishes, at `pi-jefferson/instruments`. A types-only subpath is that package.\n- Chidi §4a.\n- My tsc measurements below.",
      "evidence": "In a `mktemp -d` copy, a fake installed pi-jefferson mapped `./instruments` to a `.ts` file through `exports`, and the contract imported `./fields.ts`:\n- tsc 5.9.3 and 7.0.2 both passed under nodenext with noEmit, nodenext with emit, and bundler, all without allowImportingTsExtensions.\n- An extensionless import failed with TS2835.\n- A closure containing Object.hasOwn under lib ES2021 failed with TS2550 in both versions, reported inside node_modules.\n\nChidi §4a: plain Node refuses a `.ts` file under node_modules (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING). I removed the temporary directory."
    },
    {
      "dispute": "R-10 and CC9:\n- What shape should the `exports` object take?\n- Should `./package.json` be exported?\n- Which manifest should the CI check read?\n- Does `files` need to change?",
      "ruling": "settled",
      "answer": "- `exports` holds `./instruments` only. Nothing consumes a root export or `./package.json`, and pi reads the manifest by file path.\n- `files` does not change, because it already ships `extensions/`.\n- CI's existing packed-tarball step gains one assertion: the target of `exports[\"./instruments\"]` is in the packed file list. It reads the packed manifest, as the step already does.\n- The coder shows the check failing once, in a temporary copy.\n- The guide names nodenext, node16 and bundler resolution as supported. node10 ignores `exports`.",
      "decided_by": "D12. ci.yml:33-39: the packed manifest, not the repository's copy, is what a consumer receives.",
      "evidence": "- package.json has `files: [\"extensions\",\"README.md\",\"LICENSE\"]` and no `exports` or `main`.\n- package-manager.js:1887-1888 reads the manifest with readPiManifest(join(packageRoot, \"package.json\")).\n- Chidi §4b: a bare-string export passes under nodenext."
    },
    {
      "dispute": "S-2: the living extension-source-layout spec has closed lists of homes, and the files this change must add falsify them. The delta leaves those lists unmodified.",
      "ruling": "settled",
      "answer": "The delta modifies two requirements, \"The source tree has the ruled homes\" and \"Each responsibility has a home recognizable from its path\". Together they must admit the files the design places:\n- the contract;\n- the registry and its listener;\n- the holding for provider fields in data/.\n\nThe delta also states the membership and import rule of any new grouping directory.",
      "decided_by": "Living extension-source-layout :103-117, :219-235 and :327-335. The change applies the same standard to R1.",
      "evidence": "- :327-329 says \"with `data/` unchanged\", and says components/instruments/ \"MUST hold instrument.ts, instrument-binding.ts, compact-count.ts and one file per instrument\".\n- :219 lists five responsibilities, and registration is not one of them."
    },
    {
      "dispute": "CC10 against R-09: R-09 says pi loads every direct `.ts` child of extensions/, citing the comment at tests/jefferson.test.ts:19-23. CC10 says pi reads the manifest first and never scans that directory.",
      "ruling": "settled",
      "answer": "CC10 is right. For a package that declares `pi.extensions`, whether installed or loaded from a path, pi reads the manifest and never scans extensions/. The test comment is false, and this change corrects it; it is a source comment, not documentation. The contract's placement rests on the layout spec, not on that comment.",
      "decided_by": "My reading of pi's package loader.",
      "evidence": "- package-manager.js:1887-1893 (collectDefaultResources) and :1934-1938 (collectManifestFiles) both return on the manifest's entries before any directory scan.\n- Joel loads this repository as a path package: ~/.pi/agent/settings.json lists \"../../Projects/pi-jefferson\" under packages."
    },
    {
      "dispute": "CC7 and R-11: the reader's seam changes, the test harness has no `events`, and the startup-complete marker has no automated check.",
      "ruling": "settled",
      "answer": "This is a plan obligation, not a dispute.\n- The design names the seam the configuration reader takes for \"what has registered\": ConfigurationSource, or a closure.\n- The tasks list tests/configuration.test.ts, tests/instrument.test.ts and the tests/jefferson.test.ts harness as files to modify.\n- The first task group gives the fake pi a real createEventBus(), and makes start() fire resources_discover after session_start, so the suite stays green.\n- Tests replace instrumentNamed with a helper under tests/, not a production export.\n- Joel observes once, in a live pi session, that a late unknown name warns after startup. The coder does not tick that box.",
      "decided_by": "T15: use the real bus, from pi's public index. The implementation gate's \"making it pass\" bar: no branch in production code that exists only for tests.",
      "evidence": "- The fake pi at tests/jefferson.test.ts:94-107 has only registerCommand and on.\n- dist/index.d.ts:7 exports createEventBus."
    },
    {
      "dispute": "S-6, S-9, S-8 and S-10 (minor): facts stated twice, the home of the bare-name rule, and provider-side MUSTs that Jefferson's tests cannot check.",
      "ruling": "settled",
      "answer": "One fact, one place.\n- S-6: statusline keeps \"it registers an instrument the document then names\" and drops \"the package offers no other way…\". extension-source-layout owns that sentence, along with its pin.\n- S-9: the contract's host-load scenario says the export adds no `pi.extensions` entry, instead of restating the one-entry rule.\n- S-8: the bare-name shorthand moves to statusline, which owns what a document means. instrument-registration keeps the grammar and the reservation.\n- S-10: provider-side MUSTs become what Jefferson guarantees: it receives a registration sent from session_start in either order, and it sends no readiness message. The provider's duties go to the guide and the contract's types: register in session_start, and stop at session_shutdown, because its stale pi throws.",
      "decided_by": "The proposal's capability split (\"statusline states what a document declares\"). Living extension-source-layout \"One host-loaded entry per extension\" (:14).",
      "evidence": "I read the delta texts against the living requirements."
    },
    {
      "dispute": "COM-7 (minor): the guide does not yet commit to the operational steps that make the two messages usable.",
      "ruling": "settled",
      "answer": "docs/extension-authors.md carries one end-to-end example. It:\n- declares fields, a boolean included;\n- registers in session_start, before any await;\n- reports values, `false` included;\n- configures a namespaced entry;\n- stops reporting at session_shutdown.\n\nThe guide also explains the types-only import, and states the minimum Jefferson version and the unknown rule from the row on partial reporting. This is documentation. It never blocks, and it goes to the docs pass.",
      "decided_by": "D9 and D18. Joel's standing ruling that documentation never blocks a feature.",
      "evidence": "Rows 3, 9, 18, 20 and 22 set the content the guide must carry."
    }
  ]
}