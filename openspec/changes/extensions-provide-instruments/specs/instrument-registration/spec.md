# Spec Delta

## Purpose

An extension that provides instruments — a provider — registers them with Jefferson through a
published contract, declares the fields Jefferson keeps for it, and reports their values. What a
provider must do is the contract's promise to authors, carried by the contract's types and the
extension-author guide; Jefferson's own tests pin what Jefferson does.

## ADDED Requirements

### Requirement: An extension registers its instruments over the pi event bus

An extension MUST register the instruments it provides by sending one message on
`jefferson:registration`, whose shape the contract at `pi-jefferson/instruments` states. The message MUST name the providing
extension and give each instrument it provides with its declaration. A name an earlier registration
took MUST keep its instrument, and a later claim MUST be refused. Jefferson MUST register its own
instruments by that same message, and MUST send no third message.

#### Scenario: An instrument a row names

- **WHEN** an extension sends the registration message from its `session_start` handler and a row's
  entry names one of its instruments
- **THEN** that entry renders the extension's instrument, and the row's other entries render theirs

#### Scenario: One message, several instruments

- **WHEN** one registration names two instruments
- **THEN** a row can name and render both, because an extension may provide one instrument or several

#### Scenario: A name already taken

- **WHEN** a second registration claims a name an earlier registration took
- **THEN** the earlier instrument keeps rendering, and the later claim is refused

#### Scenario: Jefferson's own instruments

- **WHEN** a document names a shipped instrument
- **THEN** it renders, because the extension registered it by the same message

### Requirement: A registration carries one declaration per instrument

A registration MUST carry the providing extension, the fields that extension declares with their
types, and for each instrument it provides: the instrument's name, the resolvers of the variables its
format may name, its default format and, optionally, its default label. It MUST carry nothing else.
Jefferson MUST copy the plain data when it registers and hold the resolvers by reference, so a later
change by the provider cannot alter what Jefferson checked.

#### Scenario: A format naming a registered variable

- **WHEN** a provider registers an instrument carrying the variable `saved` and a user writes `$saved`
  in that instrument's format
- **THEN** the entry renders the text that variable's resolver returns

#### Scenario: A change made after registering

- **WHEN** a provider mutates its declaration after the registration is accepted
- **THEN** what Jefferson renders, and what it checks, stay as registered

### Requirement: A registration declares the fields Jefferson keeps

Fields belong to the extension, not to one instrument: every instrument a provider registers reads
that provider's fields, and two providers' fields of one name are separate. A field's declaration MUST
name the field and its type, the types MUST be string, finite number and boolean, and one field name
MUST have one type. Jefferson MUST own the store, and a provider MUST report rather than write it.

#### Scenario: A boolean field

- **WHEN** a provider declares the boolean field `working` and a variable whose resolver returns
  `idle` for `false`, and then reports `false`
- **THEN** the entry renders `idle`, and before that report it renders as unknown

#### Scenario: One field with two types

- **WHEN** a later registration from one extension declares a field with a type other than the one an
  earlier registration gave it
- **THEN** the registration is refused, nothing a row renders changes, the fault is reported, and the
  earlier field and instruments keep rendering

#### Scenario: Two providers, one field name

- **WHEN** two providers each declare a field named `saved`
- **THEN** each provider's resolvers read their own field, and neither reads the other's

### Requirement: A provider reports a value for a declared field

After registering, a provider MUST report a value by sending one message on `jefferson:update` that
names the extension, the field and the value; the words are declare and report, never push. Jefferson MUST refuse a report
naming an undeclared field, sent by an extension with no registration, or carrying a value of another
type, NaN and ±Infinity included, and MUST keep the latest value for each field. A report MUST be
visible from the next render.

#### Scenario: A report reaches the row

- **WHEN** a provider reports `saved` as `$4.10` while a row shows that instrument
- **THEN** the entry renders `$4.10` from the next render on, with no other host activity

#### Scenario: Two reports before one render

- **WHEN** a provider reports `saved` and then `omitted` before the next render
- **THEN** that render shows both values

#### Scenario: A report for a field nobody declared

- **WHEN** a provider reports a field its registration did not declare
- **THEN** nothing a row renders changes, and the fault is reported once

### Requirement: A provided instrument's name is namespaced to its extension

A provided name MUST be exactly two parts separated by one dot: the extension's name, then the
instrument's. Jefferson's own instruments MUST be named `jefferson.default.<name>`, and three parts
MUST belong to Jefferson alone, so a later `jefferson.custom.*` needs no migration. The first part
`jefferson` MUST belong to Jefferson alone, compared exactly, so `jeffersonfan.stats` is free.
Jefferson MUST accept a `jefferson` claim only from the registration it emitted itself.

#### Scenario: A provided name in a row

- **WHEN** taiknr provides `savings` and a row's entry names `taiknr.savings`
- **THEN** that entry renders taiknr's instrument

#### Scenario: A name in Jefferson's namespace

- **WHEN** an extension claims a name whose first part is `jefferson`
- **THEN** Jefferson refuses that registration and reports it, and Jefferson's own instruments render
  as before

#### Scenario: A name that only looks like Jefferson's

- **WHEN** an extension named `jeffersonfan` registers `jeffersonfan.stats`
- **THEN** the instrument registers, because the comparison is on the whole first part

#### Scenario: A later set of names

- **WHEN** a later version registers `jefferson.custom.mine`
- **THEN** the name is free, because no provider could take it

### Requirement: A provider's resolver reads only its own declared fields

A resolver a provider supplies MUST receive only that provider's declared fields, each as its declared
type with `false` distinct from unknown, and MUST return the text. It MUST NOT read Jefferson's own
data, and Jefferson's own resolvers MUST read what they read today. Widening what a provider's
resolver sees MUST be additive.

#### Scenario: What a provider's resolver receives

- **WHEN** a provider's resolver runs during a render
- **THEN** the readings it receives hold that provider's declared fields and no other datum

#### Scenario: A field the provider did not declare

- **WHEN** a provider's resolver asks for a datum its registration did not declare
- **THEN** it reads unknown, and the entry renders as it does for any unknown datum

#### Scenario: A field nobody has reported

- **WHEN** a variable of a provided instrument resolves to nothing because no value was reported
- **THEN** the entry renders nothing, label included, and no fault is reported

### Requirement: Provider code costs one entry and no more

A resolver that throws, or returns a value outside its declared result type, a promise included, MUST
cost only that entry its text: the entry renders nothing, label included, keeps its geometry, and the
row, its other entries and every other row MUST render. Pi MUST keep running. Jefferson MUST wrap one
boundary around the whole render of a provided instrument and MUST render its own instruments
unwrapped, so their defects still fail the suite. The next render MUST try again.

#### Scenario: A resolver that throws

- **WHEN** a provider's resolver throws and the host renders the footer
- **THEN** that entry renders nothing, the rest of the row renders as configured, and the footer keeps
  one line per row

#### Scenario: A resolver that returns a promise

- **WHEN** a provider's resolver returns a promise, rejected or not, instead of text
- **THEN** that entry renders nothing, and pi keeps running

#### Scenario: A resolver that returns a number

- **WHEN** a provider's resolver returns a number where its declaration says text
- **THEN** only that entry loses its text, and no row fails

#### Scenario: A resolver that returns nothing

- **WHEN** a provider's resolver returns `undefined`, as a declaration's own type allows
- **THEN** that variable reads as unknown, and no fault is reported

### Requirement: A provider's fault is reported once per session

Every provider fault MUST be a warning on the path configuration warnings take, naming the claimed
extension, the instrument or field, and the fault: a refused registration, a refused report, a refused
setting, and a resolver fault. Each MUST fire once per name or extension and fault kind per session.
None MUST be raised inside a render: one found there is queued and delivered after it, and one found
before startup completes joins the batch that follows the unknown-name warnings.

#### Scenario: A resolver that always throws

- **WHEN** a resolver throws on every render of a session
- **THEN** exactly one warning names that instrument and the fault

#### Scenario: A fault found before startup completes

- **WHEN** a provider's registration is refused before startup completes
- **THEN** its warning comes after the unknown-name warnings, in the order the fault arrived

### Requirement: A registration is heard in its session

Jefferson MUST hold a registration and a report from the moment its own factory runs, so one that
arrives before its `session_start` is heard, and MUST keep its own registrations for the factory's
life. It MUST accept a provider's registration again after a session shuts down, rather than refuse it
as a second claim. A registration sent from a provider's `session_start` handler MUST be in hand
before Jefferson warns about unknown names.

#### Scenario: A provider whose handler runs first

- **WHEN** a provider's `session_start` handler runs before Jefferson's
- **THEN** Jefferson registers it in that session, and no warning calls its name unknown

#### Scenario: A registration from a factory

- **WHEN** a provider registers from its extension factory, before any session starts
- **THEN** the registration is heard only if Jefferson's own factory ran first, so the guide directs
  providers to their `session_start` handler

#### Scenario: Registering again after a shutdown

- **WHEN** a provider registers in the session after a shutdown
- **THEN** the registration is accepted, not refused as a second claim

### Requirement: Jefferson reads both messages tolerantly

Jefferson MUST read a key it knows and ignore one it does not, so the channels grow by adding and no
version field is needed. A message missing required content, or carrying it with the wrong type, MUST
be refused and MUST change nothing a row renders. A breaking change takes a new channel name, and a
provider built against a newer contract keeps everything an older Jefferson understands.

#### Scenario: A key this Jefferson does not know

- **WHEN** a registration carries a key this Jefferson does not read
- **THEN** the instruments register, and the key changes nothing

#### Scenario: A message missing what it must carry

- **WHEN** a registration omits an instrument's name
- **THEN** the message is refused, nothing a row renders changes, and the fault is reported
