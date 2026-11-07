# 5. Source is laid out by responsibility, with data kept apart from visuals

Date: 2026-11-06
Status: Accepted. Narrows [ADR 0001](0001-imports-run-one-way.md)'s statement that the entry may import the working parts: both stay in force.

## Context

Joel's 2026-11-06 ruling named the problem: the source was one flat directory with no separation of
startup, config loading, footer setup, and data and its updates from visuals and process flow. The
flat layout hid two files that each held several responsibilities. The entry held the install
lifecycle, the two config-document paths, the footer's `setFooter` callback and the adaptation of
host events to the session data. The configuration file held config loading, the binding of
instruments to formats, and the row types the renderer draws.

Moving files into directories would have satisfied the words and left those two files as they were.
The council recommended extracting the responsibilities, and Joel's rulings left that open to the
design.

ADR 0001 names `row-renderer.ts` in its Consequences. That file now lives in `extensions/jefferson/visuals/`.
An accepted ADR's body is not edited, so this note is where the record is kept true.

## Decision

Each responsibility has one home whose path names it, and no shipped source file holds two. A
responsibility that owns several files gets a directory. One that owns a single file does not.

- The entry only registers the extension and hands the host's API to startup. Nothing else lives in it.
- Startup, the configuration document and footer setup each have one file at the top of
  `extensions/jefferson/`. Startup holds the install lifecycle and its order. Configuration holds
  where the document lives and what it may contain. Footer setup holds pi's footer factory.
- `extensions/jefferson/data/` holds the session data and the adaptation of the host's session and
  events to it: the seed, the readers and the push subscriptions. A datum added or a payload unwrapped
  differently edits `data/` and not the lifecycle.
- `extensions/jefferson/visuals/` holds what decides what a cell shows and how rows are laid out and
  drawn, including the row types and the binding of a configured format to an instrument.
- `data/` imports no file outside itself. `visuals/` imports only itself and the types of `data/`.
  Neither imports startup, footer setup or configuration.
- Separation uses plain imports. A function crosses a boundary only as a parameter that carries a
  value out, never as a seam for substituting a dependency (ADR 0001).

## Consequences

- A reader finds a responsibility from its path. "What would change this file?" has one answer for
  each.
- Adding an instrument for another datum pi provides touches `data/` and `visuals/` and not the
  lifecycle.
- The directory rules are a convention, checked by reading the imports. The change that made them
  checked them with a throwaway script and left no standing check in CI.
- Rejected: one directory each for configuration and footer setup, which would hold a single file
  apiece; a `src/` root, which revises Joel's layout ruling and would not ship unless the manifest
  and `files` moved with it; and keeping the host-event adaptation in startup, which would give
  startup two reasons to change.
- A future responsibility that outgrows one file gets a directory by the same rule, and its imports
  follow the rule above.
