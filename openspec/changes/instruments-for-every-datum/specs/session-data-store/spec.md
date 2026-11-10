## MODIFIED Requirements

### Requirement: The store holds the data its instruments display

The store MUST hold exactly the data the extension's instruments display, as distinct datums rather
than composed values. Every requirement in this spec binds only the datums the store holds: a datum
enters when an instrument displays it and leaves when no instrument does. A datum an instrument
needs MUST be added to the store, not to the instrument.

#### Scenario: The datums the shipped instruments display

- **WHEN** the shipped instruments and the store are inspected together
- **THEN** every datum a shipped instrument displays is one the store holds, and the store holds no
  datum that no shipped instrument displays

#### Scenario: A datum an instrument displays

- **WHEN** an instrument displays a datum
- **THEN** the store holds that datum and keeps it current

#### Scenario: A datum no instrument displays

- **WHEN** the host exposes a datum that no shipped instrument displays
- **THEN** the store does not hold it, and takes no subscription for it

#### Scenario: An instrument needs a datum the store does not hold

- **WHEN** a new instrument would display a datum the store does not hold
- **THEN** that datum is added to the store, and the instrument still only reads

## ADDED Requirements

### Requirement: A new datum enters the store and the feed, never an instrument

A datum the host provides and no instrument yet displays MUST enter through the store's reading and the feed's wiring: the feed seeds it, pushes it or supplies the reader the store samples. An instrument MUST NOT read host state, subscribe to a host event or hold the datum itself. Every subscription the feed takes for it MUST be released with the others.

#### Scenario: An instrument added for a new datum

- **WHEN** an instrument is added for a datum the store did not hold
- **THEN** the store holds the datum, the feed supplies it, and the instrument's resolver reads it from the store alone

#### Scenario: A subscription for the new datum

- **WHEN** the feed subscribes to a host event for a new datum and the footer is disposed
- **THEN** that subscription is released with the feed's others and no callback for it runs afterwards
