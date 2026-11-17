# Spec Delta

## MODIFIED Requirements

### Requirement: Unknown is a distinguished value

A datum the store has no value for MUST read as unknown, distinguishable from an empty string, from
zero and from false. The store MUST NOT substitute an empty string, a zero, a false, or a stale value
for unknown.

#### Scenario: A datum with no value yet

- **WHEN** an instrument reads a datum the store cannot supply
- **THEN** it reads unknown, not an empty string and not zero

#### Scenario: A datum whose value is genuinely empty

- **WHEN** a datum is supplied with an empty value
- **THEN** the read yields that empty value, distinguishable from unknown

#### Scenario: A datum whose value is genuinely false

- **WHEN** a provider reports `false` for a boolean field
- **THEN** the provider's resolver receives false, distinguishable from unknown

## ADDED Requirements

### Requirement: A declared provider field is store data

A field a registration declares MUST be store data: it enters by that provider's report and by nothing
else, it reads unknown until it is reported, a report that changes it MUST request one repaint, a
report of the same value MUST request none, and it MUST NOT survive a session replacement. Source:
`owner-rulings.md` (2026-11-15, Jefferson owns the store); `council.md`.

#### Scenario: A report while the footer is idle

- **WHEN** a provider reports a new value and no other host activity follows
- **THEN** the next render shows it, because the report asked for that render

#### Scenario: A report of the same value

- **WHEN** a provider reports the value it already reported
- **THEN** no repaint is requested

#### Scenario: A field before any report

- **WHEN** a registration declares a field nobody has reported
- **THEN** it reads unknown, not an empty string, not zero and not false

#### Scenario: A session replacement

- **WHEN** the session is replaced and the provider reports again in the new one
- **THEN** only the new value is read, and nothing the previous session reported survives
