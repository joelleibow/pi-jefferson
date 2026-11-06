/**
 * The configuration reader: owns the extension's `pi-jefferson.json` surface.
 *
 * Handed two resolved paths and a trust flag by the entry (D1), this source file reads
 * and parses the document, normalizes both envelope shapes to a list of rows (D2),
 * applies the default row and the cells ceiling (D3, D4), synthesizes row ids (D6),
 * and resolves each cell's instrument at parse time (D10). It keeps its `node:`
 * builtins and imports the instrument seam; a host type would arrive by `import type`.
 */

import { existsSync, readFileSync } from "node:fs";

import { blank, instrumentNamed, type Instrument, type InstrumentDeclaration } from "./instrument.ts";
import { parseFormat, resolveFormat } from "./format.ts";

/** The values a cell's `align` may take. The type and every message derive from this tuple. */
const ALIGNMENTS = ["left", "right", "center"] as const;
export type CellAlign = (typeof ALIGNMENTS)[number];

/** Whether a configuration value is one of `ALIGNMENTS`. */
function isAlign(value: unknown): value is CellAlign {
  return typeof value === "string" && ALIGNMENTS.some((align) => align === value);
}

/** A single cell of a row: the instrument whose text it displays, padded against its align (D1). */
export interface Cell {
  instrument: Instrument;
  align: CellAlign;
}

/** A normalized statusline row: one footer line of evenly divided cells. */
export interface Row {
  id: string;
  cells: Cell[];
}

/** The two resolved document paths and the entry's trust decision (D1). */
export interface ConfigurationSource {
  agentPath: string;
  projectPath: string;
  projectTrusted: boolean;
}

export interface Configuration {
  rows: Row[];
  /**
   * Set when a present document was rejected (D3), and also when an accepted document has
   * something to report: instruments the extension does not implement, or a `containers` key (D10).
   */
  warning: string | undefined;
}

export const DEFAULT_CELLS = 10;
export const MAX_CELLS = 10;

/** A document the extension refused: the default row renders, none of it (D3). */
class RejectedConfiguration extends Error {}

/** What an accepted document still has to say for itself, gathered across all its rows. */
interface Notices {
  containers: boolean;
  unknownInstruments: Set<string>;
}

type BindInstrument = (declaration: InstrumentDeclaration) => Instrument;

function defaultBindings(): BindInstrument {
  const bound = new Map<string, Instrument>();
  return declaration => {
    let instrument = bound.get(declaration.name);
    if (instrument === undefined) {
      const segments = parseFormat(declaration, declaration.defaultFormat);
      instrument = {
        render: (readings, width, renderTheme) => resolveFormat(declaration, segments, {}, readings, width, renderTheme),
      };
      bound.set(declaration.name, instrument);
    }
    return instrument;
  };
}

function defaultRow(bind: BindInstrument): Row {
  return { id: "row-0", cells: blankCells(DEFAULT_CELLS, bind) };
}

function blankCells(count: number, bind: BindInstrument): Cell[] {
  return Array.from({ length: count }, () => ({ instrument: bind(blank), align: ALIGNMENTS[0] }));
}

/**
 * The row's cells, from its `cells` entries in order, clamped to the ceiling. Each entry is
 * narrowed before it is resolved, so a name reaches `instrumentNamed` as the `string` it takes.
 * An empty list is rejected: a row of no cells has no `floor(W / N)` geometry (D11).
 */
function cellsFromNames(names: readonly unknown[], index: number, notices: Notices, bind: BindInstrument): Cell[] {
  if (names.length === 0) {
    throw new RejectedConfiguration(`row ${index} has an empty cells list`);
  }
  const cells: Cell[] = [];
  for (const entry of names) {
    // The entry is an object: not an array, not null, not a primitive (D2).
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new RejectedConfiguration(`row ${index} has a cells entry that is not an object; declare {"instrument": "model"}`);
    }
    const unknownKey = Object.keys(entry).find((key) => key !== "instrument" && key !== "align");
    if (unknownKey !== undefined) {
      throw new RejectedConfiguration(`row ${index} has a cell with an unrecognised key ${JSON.stringify(unknownKey)}; a cell carries only instrument and align`);
    }
    const fields = Object.entries(entry);
    const instrumentValue = fields.find(([key]) => key === "instrument")?.[1];
    const alignValue = fields.find(([key]) => key === "align")?.[1];
    if (instrumentValue === undefined) {
      throw new RejectedConfiguration(`row ${index} has a cell with no instrument`);
    }
    if (typeof instrumentValue !== "string" || instrumentValue === "") {
      throw new RejectedConfiguration(`row ${index} has an instrument that is not a non-empty string`);
    }
    if (alignValue !== undefined && !isAlign(alignValue)) {
      const quoted = ALIGNMENTS.map((value) => `"${value}"`);
      const list = quoted.slice(0, -1).join(", ") + ` or ${quoted[quoted.length - 1]}`;
      throw new RejectedConfiguration(`row ${index} has an align that is not ${list}: ${JSON.stringify(alignValue)}`);
    }
    const align: CellAlign = alignValue === undefined ? "left" : alignValue;
    const instrument = instrumentNamed(instrumentValue);
    // One typo does not take down the statusline: the cell renders blank and the warning names it.
    // Collect unknown names before truncating, so a typo past the ceiling still warns though its
    // cell is not rendered.
    if (instrument === undefined) notices.unknownInstruments.add(instrumentValue);
    // The ceiling truncates last: the first MAX_CELLS entries render, the rest are not rendered.
    // The push is guarded rather than breaking, so every entry past the ceiling is still
    // validated and checked for unknowns before the ceiling decides (D2).
    if (cells.length < MAX_CELLS) {
      cells.push({ instrument: bind(instrument ?? blank), align });
    }
  }
  return cells;
}

/** Normalize one row object: id synthesized from its index, cells named or defaulted. */
function normalizeRow(raw: unknown, index: number, notices: Notices, bind: BindInstrument): Row {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new RejectedConfiguration(`row ${index} is not an object`);
  }
  const row = raw as Record<string, unknown>;

  // The key is not read, so it cannot corrupt the render; the warning is the honest signal.
  if ("containers" in row) notices.containers = true;

  let cells: Cell[];
  if ("cells" in row) {
    if (!Array.isArray(row.cells)) {
      throw new RejectedConfiguration(`row ${index} has a cells value that is not a list`);
    }
    cells = cellsFromNames(row.cells, index, notices, bind);
  } else {
    cells = blankCells(DEFAULT_CELLS, bind);
  }

  let id = `row-${index}`;
  if ("id" in row) {
    if (typeof row.id !== "string" || row.id === "") {
      throw new RejectedConfiguration(`row ${index} has an id that is not a non-empty string`);
    }
    id = row.id;
  }

  return { id, cells };
}

/** Normalize the document: one top-level row, or a list under `rows`; never both (D2). */
function normalizeDocument(document: unknown, notices: Notices, bind: BindInstrument): Row[] {
  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    throw new RejectedConfiguration("the configuration document is not an object");
  }
  const doc = document as Record<string, unknown>;

  let rawRows: unknown[];
  if ("rows" in doc) {
    if ("cells" in doc || "id" in doc) {
      throw new RejectedConfiguration(
        "the configuration carries both a top-level row and a rows list",
      );
    }
    if (!Array.isArray(doc.rows)) {
      throw new RejectedConfiguration("the rows value is not a list");
    }
    // A top-level `containers` beside a `rows` list used to be rejected outright; the key is
    // unread either way, so it now takes the same once-per-document warning as a row's own.
    if ("containers" in doc) notices.containers = true;
    rawRows = doc.rows;
  } else {
    rawRows = [doc];
  }

  if (rawRows.length === 0) return [];

  const rows = rawRows.map((raw, index) => normalizeRow(raw, index, notices, bind));
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.id)) {
      throw new RejectedConfiguration(`two rows share the id ${JSON.stringify(row.id)}`);
    }
    seen.add(row.id);
  }
  return rows;
}

/** What an accepted document has to say for itself, or `undefined` when it has nothing to say. */
function acceptedWarning(path: string, notices: Notices): string | undefined {
  const parts: string[] = [];
  if (notices.containers) {
    parts.push("carries the containers key, which is no longer read; declare cells instead");
  }
  if (notices.unknownInstruments.size > 0) {
    parts.push(
      `names instruments the extension does not implement: ${[...notices.unknownInstruments].join(
        ", ",
      )}; those cells render blank`,
    );
  }
  return parts.length === 0 ? undefined : `pi-jefferson: ${path} ${parts.join("; ")}`;
}

/**
 * Read the configuration the source points at: the project document replaces the
 * agent document whole, and is read only when the project is trusted (D1). Absent
 * or empty configuration yields the default row with no warning; a present but
 * rejected document yields the default row and a warning (D3).
 */
export function readConfiguration(source: ConfigurationSource): Configuration {
  const bind = defaultBindings();
  const path =
    source.projectTrusted && existsSync(source.projectPath) ? source.projectPath : source.agentPath;
  if (!existsSync(path)) return { rows: [defaultRow(bind)], warning: undefined };

  let document: unknown;
  try {
    document = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {
      rows: [defaultRow(bind)],
      warning: `pi-jefferson: ${path} could not be read or parsed; rendering the default row`,
    };
  }

  try {
    const notices: Notices = { containers: false, unknownInstruments: new Set() };
    const rows = normalizeDocument(document, notices, bind);
    return {
      rows: rows.length === 0 ? [defaultRow(bind)] : rows,
      warning: acceptedWarning(path, notices),
    };
  } catch (error) {
    if (error instanceof RejectedConfiguration) {
      return {
        rows: [defaultRow(bind)],
        warning: `pi-jefferson: ${path} was rejected (${error.message}); rendering the default row`,
      };
    }
    throw error;
  }
}
