# Spec Delta

## MODIFIED Requirements

### Requirement: The export surface stays free of any way to contribute cell content

No shipped source file MUST export a way for third-party code to supply or replace cell content, and a test MUST pin the exported keys of every shipped source file that holds one. If a change moves exports between files, the pin MUST be rewritten for the new files and argued against `statusline`'s "Cell text is the instrument its entry names". Source: `michael-orientation.md` D-e; `research-eleanor.md` §7.

#### Scenario: A file is separated

- **WHEN** a file is separated and its exports are shared between the new files
- **THEN** the pin lists the exact exports of each new file, and the design states why none supplies cell content

#### Scenario: A new file joins the pin

- **WHEN** a shipped source file is added
- **THEN** the pin covers it, or the design states why it exports nothing a caller could use to supply content
