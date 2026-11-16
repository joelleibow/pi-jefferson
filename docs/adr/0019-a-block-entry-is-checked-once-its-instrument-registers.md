# 19. An instruments-block entry is checked once its instrument registers

Date: 2026-11-16
Status: Accepted. Retires the `reshape-the-configuration` rule that a block entry naming no
instrument warns in a form of its own.

## Context

Registration makes "unknown" provisional. Before this change, the only instruments were Jefferson's
own, so a name in the `instruments` block that no instrument answered to could only be a typo. The
archived `reshape-the-configuration` change recorded that reading in
`openspec/specs/statusline/spec.md`: a block entry naming an unknown instrument warned after startup
in a form of its own, placed by the block rather than by a row, and a non-object value under such a
name rejected the document.

Once an extension can register an instrument later in the session, that reading splits. A name in a
row is a user's claim that the row renders something, and it renders `blank` until the instrument
arrives. A name in the block is only a setting. A provider that loads after the read still owns the
name, and its settings are checked when it registers, so a warning at startup would be false.

Joel asked, during Validate: *"should we not scan settings at all for instruments we don't know and
only check them once we're aware of them? It seems that there's no harm in config for an unknown
instrument sitting there that we're never made aware of."* He was offered two choices: Jefferson stays
silent about an `instruments`-block entry whose instrument never registers, or Jefferson warns once
after startup. He chose the first: *"Silent (Recommended)"*.

## Decision

- **A block entry whose instrument never registers draws no warning and is never checked, whatever
  it holds.** This holds for a provided name and for a name in Jefferson's namespace alike. A number
  under such a key is no longer a document fault.
- **A provided instrument's settings are checked when it registers**, in either load order, because
  the check runs as soon as the document and the registration are both in hand.
- **A row naming an unregistered instrument still warns after startup**, because the row renders
  `blank`. The row is the user's claim, and the blank entry is visible.
- **Jefferson's own registered instruments keep the whole-document rule.** A setting one of them does
  not declare still rejects the document.

## Alternatives weighed and not taken

- **Warn once after startup for a block-only name.** It reports a typo, and it also reports a
  provider that has not loaded yet, which is not a fault. Joel chose silence.
- **Keep the block form and add the row form beside it.** Two warnings for one name, and two
  placements to keep in step, for a fault the user cannot act on.

## Consequences

- A typo in a block key passes silently. The block's names are the user's settings, and a key that
  names nothing has no effect to observe.
- The block-form string and its D17 placement are gone. `unknownNames` holds only names a row places,
  each with its row, and the accepted-warning composer prints one form.
- `{ "nope": 5 }` no longer rejects a document. It draws nothing, and Jefferson checks it only if an
  instrument by that name registers.
