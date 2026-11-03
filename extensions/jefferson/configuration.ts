/**
 * The configuration reader: owns the extension's `pi-jefferson.json` surface.
 *
 * Handed two resolved paths and a trust flag by the entry (D1), this module reads
 * and parses the document, normalizes both envelope shapes to a list of rows (D2),
 * applies the default row and the containers ceiling (D3, D4), synthesizes row ids
 * (D6), and yields the cell-shaped row model (D5). It imports only `node:` builtins;
 * host types would arrive by `import type`.
 */

import { existsSync, readFileSync } from "node:fs";

/** A single cell of a row. Configuration speaks in counts, never in cells (D5). */
export interface Cell {
  text: string;
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
  /** Non-empty only when a present document was rejected (D3). */
  warning: string | undefined;
}

export const DEFAULT_CONTAINERS = 8;
export const MAX_CONTAINERS = 8;

/** The fixed placeholder text every cell carries (design Open Questions: one line of ASCII Lorem). */
export const DEFAULT_CELL_TEXT =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor";

/** A document the extension refused: the default row renders, none of it (D3). */
class RejectedConfiguration extends Error {}

function defaultRow(): Row {
  return rowFromCount("row-0", DEFAULT_CONTAINERS);
}

function rowFromCount(id: string, count: number): Row {
  const cells: Cell[] = [];
  for (let i = 0; i < count; i++) cells.push({ text: DEFAULT_CELL_TEXT });
  return { id, cells };
}

/** Normalize one row object: id synthesized from its index, containers defaulted and clamped. */
function normalizeRow(raw: unknown, index: number): Row {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new RejectedConfiguration(`row ${index} is not an object`);
  }
  const row = raw as Record<string, unknown>;

  let count = DEFAULT_CONTAINERS;
  if ("containers" in row) {
    const declared = row.containers;
    if (typeof declared !== "number" || !Number.isInteger(declared) || declared < 1) {
      throw new RejectedConfiguration(
        `row ${index} has a containers value that is not a positive integer`,
      );
    }
    count = Math.min(declared, MAX_CONTAINERS);
  }

  let id = `row-${index}`;
  if ("id" in row) {
    if (typeof row.id !== "string" || row.id === "") {
      throw new RejectedConfiguration(`row ${index} has an id that is not a non-empty string`);
    }
    id = row.id;
  }

  return rowFromCount(id, count);
}

/** Normalize the document: one top-level row, or a list under `rows`; never both (D2). */
function normalizeDocument(document: unknown): Row[] {
  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    throw new RejectedConfiguration("the configuration document is not an object");
  }
  const doc = document as Record<string, unknown>;

  let rawRows: unknown[];
  if ("rows" in doc) {
    if ("containers" in doc || "id" in doc) {
      throw new RejectedConfiguration(
        "the configuration carries both a top-level row and a rows list",
      );
    }
    if (!Array.isArray(doc.rows)) {
      throw new RejectedConfiguration("the rows value is not a list");
    }
    rawRows = doc.rows;
  } else {
    rawRows = [doc];
  }

  if (rawRows.length === 0) return [];

  const rows = rawRows.map((raw, index) => normalizeRow(raw, index));
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.id)) {
      throw new RejectedConfiguration(`two rows share the id ${JSON.stringify(row.id)}`);
    }
    seen.add(row.id);
  }
  return rows;
}

/**
 * Read the configuration the source points at: the project document replaces the
 * agent document whole, and is read only when the project is trusted (D1). Absent
 * or empty configuration yields the default row with no warning; a present but
 * rejected document yields the default row and a warning (D3).
 */
export function readConfiguration(source: ConfigurationSource): Configuration {
  const path =
    source.projectTrusted && existsSync(source.projectPath) ? source.projectPath : source.agentPath;
  if (!existsSync(path)) return { rows: [defaultRow()], warning: undefined };

  let document: unknown;
  try {
    document = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {
      rows: [defaultRow()],
      warning: `pi-jefferson: ${path} could not be read or parsed; rendering the default row`,
    };
  }

  try {
    const rows = normalizeDocument(document);
    return { rows: rows.length === 0 ? [defaultRow()] : rows, warning: undefined };
  } catch (error) {
    if (error instanceof RejectedConfiguration) {
      return {
        rows: [defaultRow()],
        warning: `pi-jefferson: ${path} was rejected (${error.message}); rendering the default row`,
      };
    }
    throw error;
  }
}
