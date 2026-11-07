# 6. A label gets one gap from the system, and a label's or format's outer whitespace is not text

Date: 2026-11-07
Status: Accepted.

## Context

A label used to be literal text, and so was every character of a format. A space at the end of a label
was the only thing between the label and its content. Joel's own labels (`🧠 `, `🤔 `, `🔋 `) and
the default `Thinking: ` all carried one. Take the space away and the footer reads `🧠claude-opus-5-5`
and `🤔Max`, with the battery hard against its bar.
A user had to remember the trailing space to get a footer that reads well.

Joel's 2026-11-07 rulings settle the outcome. A label always renders with a gap before its content, and
no option, setting or opt-out exists for it. Whitespace at the front and back of a label and of a
format is removed, because "they really shouldn't be needed if we have sensible defaults". A label set
to `""` is still allowed, and replaces the default with nothing.

Two forces shaped where the gap lives. `$bar` fills whatever width the rest of the cell leaves, so a gap
added after the format renders is a column the bar never counted, and the cell overflows by one. And
the gap must disappear with the label, so it can't be a separate thing the cell adds.

## Decision

A label is a string with no edge whitespace of its own. The system supplies one column between a label
and its content, and no document can ask for more or less.

- Binding collapses a label's control characters, trims it, and decides the gap from the document: a
  non-empty label and a non-empty format. The gap is one trailing space in the label's own segment, so
  it takes the label's style and `$bar` counts it.
- A label that is empty after the trim renders no label and no gap. A format that is empty or only
  whitespace leaves the label alone, with no gap.
- The format language trims a format's outer whitespace when it parses. Whitespace inside a format is
  text and stays.
- Whitespace is whatever JavaScript's `trim` removes, the same set the format language already treats
  as whitespace. No dependency is added; [ADR 0004](0004-string-mutations-come-from-lodash-es.md)
  covers a format's modifiers and not this.
- There is no option, flag or setting for the gap or the trim.

A declared default label follows the same rule: it carries no trailing space, and the gap supplies it.

## Consequences

- A footer reads well with no space written anywhere. A label with a trailing space, as Joel's were,
  renders the same footer as one without.
- A label can no longer sit flush against its content, and a format can no longer lead or trail with a
  space on purpose. This breaks any document that did, with no shim, on Joel's ruling that breaks are
  cheap before 1.0.
- The gap is one column of the cell's width. A cell narrower than the label, the gap and the content
  clips them together, and a label exactly as wide as its cell can lose the gap to the clip.
- A known variable that renders empty leaves a trailing gap. The gap follows the format being non-empty,
  and not what it renders, so that `$bar`'s arithmetic never depends on its own output. The gap shows
  only under a background or underline style.
- A terminal that draws an emoji wide and counts it narrow can overdraw the gap. That is a host limit.
- Reversing this means removing the trim and the gap from binding and restoring a label that is only
  the text its user wrote.
