# Proposal

## Why

A format can style text but cannot colour one piece of it. The six `ThemeStyle` booleans and the three
string mutations are the whole vocabulary of modifiers after `|`, and only a variable's own declared
forms add anything else (`statusline` spec, "A style modifier only sets an attribute on", "The string
modifiers are capitalize, upper and lower"). A user who wants the model in one colour and the thinking
level in another must colour the whole instrument, and pi's own colour names are unreachable from a
format altogether. Joel's ruling of 2026-11-24 gives the shape: every foreground colour a theme defines
becomes a name after `|`, no background colour does, a reserved word keeps its meaning, and a colour
written in the format is the strongest colour there is (`owner-rulings.md`; D1–D4,
`michael-orientation.md` §1).

The names are pi's, not this package's. pi's themes carry 49 foreground tokens out of 56, the two slots
told apart only by which accessor accepts a name, and the package exports no runtime token table
(`research-chidi.md` §1). A name is therefore asked of the live theme one at a time, and no copy of the
host's names may be kept (D13; `statusline` spec, "The host's token list MUST NOT be copied").

## What Changes

- **A foreground colour after the pipe.** `$model|toolDiffRemoved via|dim $provider|capitalize|bashMode`
  colours `$model` and `$provider` and leaves the rest of the text as it is. The colour sets that
  piece's foreground and nothing the extension chooses — a theme that renders the colour faint renders
  it faint — and it stacks with the attributes and the mutations written around it on that piece (S4,
  S5; D3, D6, D13).
- **No background colour, and no name of this package's own.** A background-slot name is refused as any
  unimplemented name is (S3; D1). A colour is spelled as pi spells it, case included (S8), so a name
  written in another case is another name and is refused too.
- **A bad name is a refusal, at read time.** A name no foreground colour of the live theme provides
  rejects the document when it is read: the whole document for one of Jefferson's own instruments, that
  instrument alone for a provided one (S9; D8). The default row renders, or the rest of the document
  does, and the warning names the instrument and the name. In a provider's default format the refusal
  comes at registration and covers the whole registration: its sibling instruments, its fields and its
  later reports (D7, D14; `council.md` ruling 1).
- **The names come from the live theme, asked one name at a time.** A name is a colour when pi's
  foreground accessor accepts it; the extension holds no copy of the set of names a format may write as
  a colour, and reads no theme file (S1; D1, D13; T1).
- **A lookup order after `|`:** the variable's form when it is the first name after that variable, then
  one of Jefferson's own names, then a foreground colour of the theme, then a rejection (S2; D2; ADR 0010).
- **A reserved word keeps its meaning.** `|dim` stays the faint attribute; the theme's `dim` colour stays
  reachable through `style`, and the docs say which one `|dim` is (D2; T8, T9).
- **The colour in the format is the strongest colour:** the colour written in the format, then the
  instrument's built-in colour for that variable, consulted only when the format names no colour, then
  the instrument's `style` (D4; `council.md` ruling 7). Two standing requirements are absolute and give
  way to it: the thinking level's own colour (R5) and the notice's `warning` (R6).
- **What takes no colour.** `$bar` carries no modifier and so takes no colour, a plain kind format still
  rejects every `|name`, and a label has no format, so only the instrument's `style` colours it (S7, S6;
  D15; ADR 0003, ADR 0012).
- **Deliberately not done.** No syntax for a raw colour after the pipe, so `#bf5700` stays `style`'s
  business and the theme is the only source of names (S1; D1); no colour list in the docs (S12); no
  change to the contract (S11); no new dependency; no capability marker by which an author could tell an
  older Jefferson is running (`council.md` ruling 11); and no restyling of anything the user did not
  write a colour on.
- **Provided instruments get the same language** (D7), and a provider's default format that names a
  colour is checked when it registers, with the outcome independent of the order in which extensions
  register (S10; D14; T2–T4; `council.md` rulings 1–4).
- **Nothing that works today changes** (S0; D3). Every format accepted today still parses and renders
  character for character, because a colour only turns a rejected name into an accepted one, and the new
  colour order touches only pieces that carry a format colour, which no accepted format does.
- **What the change retires.** ADR 0003's clause "`fg` and `bg` are not modifiers" and its "one
  direction" consequence that a modifier only adds (R1), the rules in five `statusline` requirements
  (R2–R6), and the name of the style-modifier requirement (R2), while two more take one sentence each
  without a rule being retired (R7, R8). The rest of ADR 0003 stands, "the language adds no styling
  vocabulary of its own" included, because these are pi's names spelled as pi spells them. The retirement is recorded in a new ADR, as `AGENTS.md`'s
  "Where decisions live" requires.
- **Documents.** `docs/formats.md` states the rule and points at pi's theme documentation for the names
  rather than listing them (S12), `docs/notices.md` and `docs/extension-authors.md` carry their part of
  it, and the docs pass corrects every sentence the change makes false (S13).

## Capabilities

### New Capabilities

None. The format language, the vocabulary after `|` and the precedence between a format's colour and an
instrument's own styling are `statusline`'s, and the check a provider's default format gets is
`instrument-registration`'s. The two neighbouring pieces of work on the same language — the spinner and
user-composed instruments — stay where they are, and no capability changes hands (`plan-context.md`).

### Modified Capabilities

- `statusline`: six requirements are modified, one is retired and replaced, and four are added.
  - "A style modifier only sets an attribute on" is retired and replaced by "A style modifier only adds
    an attribute" (R2). The new requirement keeps every rule about attributes adding on, loses "`fg` and
    `bg` MUST NOT be modifiers", and keeps the old scenario's behaviour, saying what a colour after the
    pipe does instead of refusing it, under a title that no longer denies it. The old name goes because
    its scenario title, "A color is not a modifier", is false once a colour is a modifier.
  - "An instrument's style is pi's ThemeStyle" gains the theme's foreground names in its "One vocabulary
    for styling" scenario (R3).
  - "A modifier follows a variable or literal text" keeps "A name carried in two places" as it stands (R4);
    the live theme's names are proven by behaviour in "A colour's name is the theme's own", not by
    inspecting the source.
  - "The thinking level takes the color of the input box's thinking rules" and "A notice takes the colour
    pi gives its kind" both give way to a colour in the format (R5, R6).
  - "A variable can declare forms" loses "after another modifier or twice MUST reject" and sends a name
    that is no form to the one order, which is already what the code does (R7).
  - "A notice's text is a format with declared variables" gains "a kind's text is plain: a `|name` in it,
    a colour included, rejects the document" (R8).
  - Added, in four requirements, because each states one behaviour:
    - "A style modifier only adds an attribute": the replacement named above, carrying the retired
      requirement's rules and its three scenarios;
    - "A foreground colour of the theme is a modifier": what a colour attaches to, the one order a name
      after `|` is read in, that a reserved word keeps its meaning, and what a rejected name does;
    - "The colour a format names is the strongest colour": the order of the three colours, a label's, and
      two colours on one piece;
    - "A colour's name is the theme's own": the theme as the only source, pi's spelling and case, a
      colour that renders faint, and the theme at render time.
- `instrument-registration`: two requirements are added, and no existing requirement there changes.
  "A provider's default format is checked against the theme", so a colour in a provider's default format
  is a colour the theme has and the outcome does not follow the order extensions register in (S10; D14).
  "A held message is judged as it was posted", because the hold widens the time between a provider
  posting a message and Jefferson judging it; the two timing requirements there stay true once
  registration runs with a theme.

## Impact

- **Source and tests.** The format parser, the style validation and the binding that resolves a
  variable's built-in colour are all in the change, and the design names one home for the foreground
  probe the first and third would otherwise each grow a copy of (T5, T6; O2). The design's file table,
  not this bullet, is the change's one home for the files it touches: it adds `configuration.ts`,
  `registration-listener.ts` and `startup.ts`, the export pin and file coverage in
  `tests/jefferson.test.ts`, the rewritten expectations in `tests/registration.test.ts`, and every call
  site whose signature changes (`council.md` ruling 9). `tests/format.test.ts`
  asserts today that `|accent` is unknown (`:259-264`); rewriting that assertion is legitimate only with
  this delta, because the rule it encodes is the rule being retired (T10). The suite's test theme holds
  ten foreground names and answers by slot, and no test reads pi's files, so pi's real slot table is
  proven by Joel's live check and not by the suite (T11; D11).
- **No contract change.** Formats are strings, so `pi-jefferson/instruments` gains no member and imports
  no pi type (S11; D9). The published contract, `validateStyle` and a provided instrument's `shownUntil`
  stay as they are.
- **Records.** A new ADR in `docs/adr/` records the retirement of ADR 0003's colour clause and why a
  theme's name outranks an instrument's own colour (R1; S13).
- **Documentation this change makes false.** `docs/formats.md:60,64,80-84,96-107`, `docs/notices.md:60`,
  `docs/extension-authors.md:226`, `ARCHITECTURE.md:44,71` and `AGENTS.md:25` (S13). They go to the docs
  pass and never block (D12).
- **Not touched, and not foreclosed.** The spinner's `|spinner` stays composable as
  `$working|spinner|accent`, so a colour stays a foreground on its own piece; the rule that Jefferson's
  name beats a colour covers every name Jefferson gives meaning after `|`, not today's table alone, so a
  later name joins the reserved set without a second rule (`michael-orientation.md` §2; T7). User-composed
  instruments use the same parser and get the language with no extra work (`plan-context.md`). A form a
  provider declares may still shadow a colour on its own variable: forms are read first, and the docs
  state the order (T7).
- **Release.** A minor: the language gains names, and no format that works today changes what it renders.
- **Open questions.** Two are left whole to the design and one in part:
  - O1, how a theme reaches every parse that can meet a colour, a registration's default format
    included, and the hold that keeps a registration's refusal the same in both load orders
    (`council.md` rulings 1–4);
  - O3, how a piece holds a colour: the precedence is settled — the chain's last colour, then the
    built-in colour only when the chain names none, then the `style` — but whether a colour is a
    modifier kind the merge skips or a field on the segment is the design's (`council.md` ruling 7);
  - O4, the wording of the warning, now that it must quote the offending `|name` (`council.md` rulings
    5, 16).

  O2 is answered: the one foreground probe is the host check `validateStyle` and the binding's guard
  make today, and `validateStyle`'s `parseColor` fallback stays inside it (`council.md` ruling 7).
  Nothing a user writes depends on what remains, which is why those are the design's and not this
  change's requirements (`michael-orientation.md` §5, "Open for the council and the design").
