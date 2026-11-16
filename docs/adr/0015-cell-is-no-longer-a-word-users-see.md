# 15. "Cell" is no longer a word users see

Date: 2026-11-15
Status: Accepted; its user vocabulary is corrected by Joel's 2026-11-16 ruling: users read row and instrument, never entry. It retires the user-facing half of the 2026-11-03 vocabulary ruling, and the code keeps the word.

## Context

The 2026-11-03 ruling named the model for the code and the repository: *"a row holds cells, and a cell holds an instrument."* That was a rule about how this repository talks to itself.

The configuration surface then reached users, and it carried the same word into a key and into the messages. A user had to type the name of the concept the ruling had just said was overloaded. Joel put it as a question in the 2026-11-15 session: *"is now the time to remove `cell` from the nomenclature? it was a decision that we don't really need. its needed internally but I'm not certain the overloaded term should leak to users"*.

## Decision

- A user reads **row** and **instrument**. A row is a list of instruments, and each one renders its own text. No configuration key, warning, README section or `docs/` page says "cell" or "entry".
- The code keeps the word: `Cell`, `CellAlign`, `cellView`, `MAX_CELLS`, `DEFAULT_CELLS`, `DEFAULT_CELL_TEXT`, and the renderer's and the width plan's own prose.
- A warning places an instrument in a row by its row and its position, `row 1, instrument 2:`, or by its row alone, `row 3:`.

## Alternatives weighed and not taken

- **Rename the code's types too.** The registration change will move code in the files the rename would touch, and no user reads a type name. The rename would cost a wide diff and buy nothing a user sees.
- **Keep the word in warnings but drop it from the keys.** A user would still read it at the moment something goes wrong, which is the moment they have least patience for a term the ruling called overloaded.

## Consequences

- The 2026-11-03 ruling now binds the code alone. `AGENTS.md` states the qualifier, so a new contributor knows which audience each word is for.
- A reader who arrives from an older release meets the new words in the upgrade note at the end of [configuration.md](../configuration.md).
