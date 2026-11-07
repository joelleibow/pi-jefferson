# Owner Rulings

Joel's rulings for this change, quoted and dated. Binding, and newer than any other artifact in this change directory.

## 2026-11-06 — What the change is

- **The objective.** Of four things bothering him about his footer, he named the second: *"I have to use spaces in my label config because it renders right up against the instrument content and looks bad."* **The change is the gap between an instrument's label and its content: a label written with no trailing space renders with a gap before the content.**
- **It is the label-gap card and only that card.** The queue is one change per spec (cell grouping, instruments for every datum pi provides, and thresholds on the context instrument are separate changes). He started it with *"Do you want to /skill:conductor-janet the label spacing issue?"*, asked of the conductor, who said yes.
- **Riders on this change's pull request.** Asked whether three finished commits should ship alone as a patch release or ride in a later pull request, he ruled: *"label gap PR"*. Those commits (the archived owner-task ticks and the openspec `config.yaml` context block and schema default) are not part of this change's scope; they sit on this branch ahead of the change and ship in its pull request. He also said of the context block: *"let's add that context block, as well"* and *"Definitely make that config change and commit that so you're not always having to pass that extra arg."*

## 2026-11-07 — The gap is required, and costs the user nothing to configure

- **A gap is required, with no configuration.** Shown his footer with the space removed from his labels (`🧠claude-opus-5-5`, `🤔Max`, `🔋` hard against its bar), after Michael's consult offered "change nothing" and a flush-label opt-out as options, he ruled: *"A user shouldn't have to configure any more than truly necessary. No gap is not acceptable because look at the results that when I remove the space."* And: *"There should at least be a miniscual quantity of gap so that they don't look way too tight against one another."* **A label always renders with a gap before its content; no option, setting or opt-out is added for it; and a label can no longer sit flush against its content.** This settles Open Decision (b) of the proposal. It does not state what happens to a label that already ends in whitespace (Open Decision (a)), which stays open.

- **Trim the label and the format.** Following the ruling above, he added: *"We should be trimming labels and text. Remove spaces blased at the front or back of labels and format. They really shouldn't be needed if we have sensible defaults."* **Whitespace at the front or back of a label, and at the front or back of a format, is removed; it carries no meaning. The gap is the one separator, so a label that already ends in a space (his own `🧠 `, `🤔 `, `🔋 `, and the default `Thinking: `) renders with one gap, not two.** This settles Open Decision (a) of the proposal and widens the change's scope from the label alone to the label and the format's outer whitespace; both belong to this one change. It is a breaking change for any document that relied on leading or trailing space in a format, which is cheap before 1.0 with no shim (inherited ruling).

- **An explicit empty label is still acceptable.** While the design was being drafted he added: *"A user explicitly setting a label to "" is acceptable and replaces the default with nothing."* **A label configured as the empty string replaces the instrument's default label with no label at all, and no gap is rendered.**
- **Default labels for the shipped instruments are not this change.** Asked whether this spec was the place to set a default label on every shipped instrument (his examples: "Thinking:" on thinking, "Context:" on context, "Path:" on path), the conductor ruled it out of scope: it changes what every default cell shows and needs its own rulings, so it is its own card on the pi-jefferson board, after this one.

## Earlier rulings this change inherits (as quoted in the brain's pi-jefferson page)

- Breaks are cheap before 1.0: 0.2.0 and 0.3.0 each broke the shape of `cells` with no shim, on his ruling that pre-release is the time for it (*"that's okay since we're in pre release"*).
- 2026-11-03: *"Don't invent what we don't have to."*
- 2026-11-05: *"Don't discourage folks from experimenting but also don't break the concepts the package aims to provide as features."* A row is one line whatever a format contains; that guarantee belongs to the cell.
- 2026-11-06: his `~/.pi/agent/pi-jefferson.json` is his preferred setup and is never edited by a task; a check that needs a configuration uses a scratch agent directory.
