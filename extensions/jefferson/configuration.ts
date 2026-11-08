/**
 * The configuration reader: owns the extension's `pi-jefferson.json` surface.
 *
 * It resolves where the two documents live, then reads and parses the one that applies,
 * normalizes both envelope shapes to a list of rows, applies the default row and the cells
 * ceiling, synthesizes row ids, and resolves each cell's instrument at parse time. A document
 * it refuses renders the default row and warns; that is the whole of its error handling.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CONFIG_DIR_NAME,
  getAgentDir,
  type Theme,
  type ThemeStyle,
} from "@earendil-works/pi-coding-agent";

import { blank, instrumentNamed } from "./visuals/instrument.ts";
import { parseFormat, validateStyle, type FormatSegment } from "./visuals/format.ts";
import { ALIGNMENTS, DISTRIBUTIONS, type Cell, type CellAlign, type Distribution, type Row } from "./visuals/row.ts";
import {
  instrumentBindings,
  type BindInstrument,
  type ConfiguredInstrument,
} from "./visuals/instrument-binding.ts";

/** Whether a configuration value is one of `ALIGNMENTS`. */
function isAlign(value: unknown): value is CellAlign {
  return typeof value === "string" && ALIGNMENTS.some((align) => align === value);
}

/** Whether a configuration value is one of `DISTRIBUTIONS`. */
function isDistribution(value: unknown): value is Distribution {
  return typeof value === "string" && DISTRIBUTIONS.some((distribution) => distribution === value);
}

/** A tuple's values as a message spells them: `"content" or "equal"`. */
function orList(values: readonly string[]): string {
  const quoted = values.map((value) => `"${value}"`);
  return quoted.slice(0, -1).join(", ") + ` or ${quoted[quoted.length - 1]}`;
}

/** The two resolved document paths and the caller's trust decision. */
export interface ConfigurationSource {
  agentPath: string;
  projectPath: string;
  projectTrusted: boolean;
  theme: Theme;
}

export interface Configuration {
  rows: Row[];
  /**
   * Set when a present document was rejected, and also when an accepted document has
   * something to report: instruments the extension does not implement, or a `containers` key.
   */
  warning: string | undefined;
}

export const DEFAULT_CELLS = 10;
export const MAX_CELLS = 10;

/** A document the extension refused: the default row renders, none of it. */
class RejectedConfiguration extends Error {}

/** What an accepted document still has to say for itself, gathered across all its rows. */
interface Notices {
  containers: boolean;
  unknownInstruments: Set<string>;
}

function readInstruments(raw: unknown, theme: Theme, notices: Notices): ReadonlyMap<string, ConfiguredInstrument> {
  const configured = new Map<string, ConfiguredInstrument>();
  if (raw === undefined) return configured;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new RejectedConfiguration("the instruments value is not an object");
  }
  for (const [name, value] of Object.entries(raw)) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new RejectedConfiguration(`the instruments configuration for ${JSON.stringify(name)} is not an object`);
    }
    const declaration = instrumentNamed(name);
    if (declaration === undefined) {
      notices.unknownInstruments.add(name);
      continue;
    }
    const entry = value as Record<string, unknown>;
    for (const key of Object.keys(entry)) {
      if (!declaration.options.includes(key)) {
        throw new RejectedConfiguration(`instrument ${JSON.stringify(name)} carries an option its declaration does not have: ${JSON.stringify(key)}`);
      }
    }
    const format = entry.format;
    if (format !== undefined && typeof format !== "string") {
      throw new RejectedConfiguration(`instrument ${JSON.stringify(name)} has a format that is not a string`);
    }
    let segments: FormatSegment[];
    try {
      segments = parseFormat(declaration, format ?? declaration.defaultFormat);
    } catch (error) {
      if (error instanceof Error) throw new RejectedConfiguration(error.message);
      throw error;
    }
    const label = entry.label;
    if (label !== undefined && typeof label !== "string") {
      throw new RejectedConfiguration(`instrument ${JSON.stringify(name)} has a label that is not a string`);
    }
    let style: ThemeStyle;
    try {
      style = validateStyle(entry.style, theme);
    } catch (error) {
      if (error instanceof Error) throw new RejectedConfiguration(`instrument ${JSON.stringify(declaration.name)} ${error.message}`);
      throw error;
    }
    configured.set(declaration.name, label === undefined ? { segments, style } : { segments, style, label });
  }
  return configured;
}

function defaultRow(bind: BindInstrument): Row {
  return { id: "row-0", distribution: DISTRIBUTIONS[0], cells: blankCells(DEFAULT_CELLS, bind) };
}

function blankCells(count: number, bind: BindInstrument): Cell[] {
  return Array.from({ length: count }, () => ({ instrument: bind(blank), align: ALIGNMENTS[0] }));
}

/**
 * The row's cells, from its `cells` entries in order, clamped to the ceiling. Each entry is
 * narrowed before it is resolved, so a name reaches `instrumentNamed` as the `string` it takes.
 * An empty list is rejected: a row of no cells has no `floor(W / N)` geometry.
 */
function cellsFromNames(names: readonly unknown[], index: number, notices: Notices, bind: BindInstrument): Cell[] {
  if (names.length === 0) {
    throw new RejectedConfiguration(`row ${index} has an empty cells list`);
  }
  const cells: Cell[] = [];
  for (const entry of names) {
    // The entry is an object: not an array, not null, not a primitive.
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
      throw new RejectedConfiguration(`row ${index} has an align that is not ${orList(ALIGNMENTS)}: ${JSON.stringify(alignValue)}`);
    }
    const align: CellAlign = alignValue === undefined ? "left" : alignValue;
    const instrument = instrumentNamed(instrumentValue);
    // One typo does not take down the statusline: the cell renders blank and the warning names it.
    // Collect unknown names before truncating, so a typo past the ceiling still warns though its
    // cell is not rendered.
    if (instrument === undefined) notices.unknownInstruments.add(instrumentValue);
    // The ceiling truncates last: the first MAX_CELLS entries render, the rest are not rendered.
    // The push is guarded rather than breaking, so every entry past the ceiling is still
    // validated and checked for unknowns before the ceiling decides.
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

  // Read before its siblings: a row malformed in more than one place reports the distribution.
  let distribution: Distribution = DISTRIBUTIONS[0];
  if ("distribution" in row) {
    if (!isDistribution(row.distribution)) {
      throw new RejectedConfiguration(`row ${index} has a distribution that is not ${orList(DISTRIBUTIONS)}: ${JSON.stringify(row.distribution)}`);
    }
    distribution = row.distribution;
  }

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

  return { id, distribution, cells };
}

/** Normalize the document: one top-level row, or a list under `rows`; never both. */
function normalizeDocument(document: unknown, notices: Notices, theme: Theme): Row[] {
  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    throw new RejectedConfiguration("the configuration document is not an object");
  }
  const doc = document as Record<string, unknown>;

  let rawRows: unknown[];
  if ("rows" in doc) {
    if ("cells" in doc || "id" in doc || "distribution" in doc) {
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

  const bind = instrumentBindings(readInstruments(doc.instruments, theme, notices));
  if (rawRows.length === 0) return [defaultRow(bind)];

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

/** The two documents the extension reads: the agent's own, and a trusted project's copy. */
export function configurationPaths(cwd: string): { agentPath: string; projectPath: string } {
  return {
    agentPath: join(getAgentDir(), "pi-jefferson.json"),
    projectPath: join(cwd, CONFIG_DIR_NAME, "pi-jefferson.json"),
  };
}

/**
 * Read the configuration the source points at: the project document replaces the
 * agent document whole, and is read only when the project is trusted. Absent or empty
 * configuration yields the default row with no warning; a present but rejected document
 * yields the default row and a warning.
 */
export function readConfiguration(source: ConfigurationSource): Configuration {
  const bind = instrumentBindings();
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
    const rows = normalizeDocument(document, notices, source.theme);
    return {
      rows,
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
