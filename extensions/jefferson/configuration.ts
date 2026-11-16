/**
 * The configuration reader: owns the extension's `pi-jefferson.json` surface.
 *
 * It resolves where the two documents live, then reads and parses the one that applies, reads the
 * `rows` list as rows of entries, applies the default row and the cells ceiling, and resolves each
 * cell's instrument at parse time. A document it refuses renders the default row and warns; that is
 * the whole of its error handling.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CONFIG_DIR_NAME,
  getAgentDir,
  type Theme,
  type ThemeStyle,
} from "@earendil-works/pi-coding-agent";

import { blank } from "./components/instruments/blank.ts";
import { NOTICE_SECONDS, notice } from "./components/instruments/notice.ts";
import { instrumentNamed } from "./shipped.ts";
import { parseFormat, validateStyle, type FormatSegment } from "./format.ts";
import { ALIGNMENTS, DISTRIBUTIONS, type Cell, type CellAlign, type Distribution, type Row } from "./components/row/row.ts";
import {
  instrumentBindings,
  type BindInstrument,
  type ConfiguredInstrument,
} from "./components/instruments/instrument-binding.ts";

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
  /** The empty lines the footer renders between each pair of rows. */
  rowGap: number;
  /**
   * The visible time a notice takes, or `undefined` when no row places a `notice` cell. The
   * composition root passes it to the feed, which takes no notice and holds no timer without it.
   */
  noticeSeconds: number | undefined;
  /**
   * Set when a present document was rejected, and also when an accepted document has
   * something to report: instruments the extension does not implement, or a `containers` key.
   */
  warning: string | undefined;
}

export const DEFAULT_CELLS = 10;
export const MAX_CELLS = 10;
const DEFAULT_ROW_GAP = 1;
const MAX_ROW_GAP = 3;

/** A document the extension refused: the default row renders, none of it. */
class RejectedConfiguration extends Error {}

/** What an accepted document still has to say for itself, gathered across all its rows. */
interface Notices {
  containers: boolean;
  unknownInstruments: Set<string>;
}

/** What a document says about its instruments: the binding's inputs, and the reader's own share. */
interface InstrumentConfiguration {
  /** Each declaration's parsed format, style, label and kind formats. */
  configured: ReadonlyMap<string, ConfiguredInstrument>;
  /** Each declaration's declared visible time, by name: the reader's share, never the binding's. */
  declaredSeconds: ReadonlyMap<string, number>;
}

function readInstruments(raw: unknown, theme: Theme, notices: Notices): InstrumentConfiguration {
  const configured = new Map<string, ConfiguredInstrument>();
  const declaredSeconds = new Map<string, number>();
  if (raw === undefined) return { configured, declaredSeconds };
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
    // `seconds` and `formats` are a composed instrument's two options; a plain one cannot carry them.
    const seconds = entry.seconds;
    if (seconds !== undefined
      && (typeof seconds !== "number" || !Number.isInteger(seconds) || seconds < 1 || seconds > 60)) {
      throw new RejectedConfiguration(`seconds must be a whole number from 1 to 60: ${JSON.stringify(seconds)}`);
    }
    let formats: Record<string, FormatSegment[]> | undefined;
    if (entry.formats !== undefined) {
      if (typeof entry.formats !== "object" || entry.formats === null || Array.isArray(entry.formats)) {
        throw new RejectedConfiguration(`instrument ${JSON.stringify(name)} has formats that is not an object`);
      }
      formats = {};
      for (const [kind, format] of Object.entries(entry.formats)) {
        if (declaration.composed === undefined || !Object.hasOwn(declaration.composed.formats, kind)) {
          throw new RejectedConfiguration(`instrument ${JSON.stringify(name)}'s formats names a kind it does not carry: ${JSON.stringify(kind)}`);
        }
        if (typeof format !== "string") {
          throw new RejectedConfiguration(`instrument ${JSON.stringify(name)}'s formats has a kind whose format is not a string: ${JSON.stringify(kind)}`);
        }
        try {
          formats[kind] = parseFormat(declaration, format, true);
        } catch (error) {
          if (error instanceof Error) throw new RejectedConfiguration(error.message);
          throw error;
        }
      }
    }
    let style: ThemeStyle;
    try {
      style = validateStyle(entry.style, theme);
    } catch (error) {
      if (error instanceof Error) throw new RejectedConfiguration(`instrument ${JSON.stringify(declaration.name)} ${error.message}`);
      throw error;
    }
    configured.set(declaration.name, {
      segments, style,
      ...(label === undefined ? {} : { label }),
      ...(formats === undefined ? {} : { formats }),
    });
    // The visible time is the reader's, not the binding's: the binding renders, the reader gates.
    if (seconds !== undefined) declaredSeconds.set(declaration.name, seconds);
  }
  return { configured, declaredSeconds };
}

function defaultRow(bind: BindInstrument): Row {
  return { id: "row-0", distribution: DISTRIBUTIONS[0], cells: blankCells(DEFAULT_CELLS, bind) };
}

function blankCells(count: number, bind: BindInstrument): Cell[] {
  return Array.from({ length: count }, () => ({ instrument: bind(blank), align: ALIGNMENTS[0] }));
}

/**
 * One row, from its list of entries. The first MAX_CELLS entries are its cells, in order, and every
 * entry is validated, so a fault or an unknown name past the ceiling still answers. An empty list is
 * rejected: a row of no cells has nothing to render. `index` is 0-based and internal; every message
 * places the row by its 1-based position, which is the number a user counts to.
 */
function normalizeRow(raw: unknown, index: number, notices: Notices, bind: BindInstrument): Row {
  const place = `row ${index + 1}:`;
  if (!Array.isArray(raw)) {
    throw new RejectedConfiguration(`${place} is not a list; a row is a list of entries, as ${ROWS_FORM}`);
  }
  if (raw.length === 0) {
    throw new RejectedConfiguration(`${place} is empty; a row lists the entries it renders`);
  }

  const cells: Cell[] = [];
  for (const [position, entry] of raw.entries()) {
    const at = `row ${index + 1}, instrument ${position + 1}:`;
    // The entry is an object: not an array, not null, not a primitive.
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new RejectedConfiguration(`${at} is not an object; declare {"instrument": "model"}`);
    }
    const unknownKey = Object.keys(entry).find((key) => key !== "instrument" && key !== "align");
    if (unknownKey !== undefined) {
      throw new RejectedConfiguration(`${at} has an unrecognised key ${JSON.stringify(unknownKey)}; an entry carries instrument and align`);
    }
    const fields = Object.entries(entry);
    const instrumentValue = fields.find(([key]) => key === "instrument")?.[1];
    const alignValue = fields.find(([key]) => key === "align")?.[1];
    if (instrumentValue === undefined) {
      throw new RejectedConfiguration(`${at} no "instrument" named`);
    }
    if (typeof instrumentValue !== "string" || instrumentValue === "") {
      throw new RejectedConfiguration(`${at} "instrument" is not a non-empty string`);
    }
    if (alignValue !== undefined && !isAlign(alignValue)) {
      throw new RejectedConfiguration(`${at} align is not ${orList(ALIGNMENTS)}: ${JSON.stringify(alignValue)}`);
    }
    const align: CellAlign = alignValue === undefined ? "left" : alignValue;
    const instrument = instrumentNamed(instrumentValue);
    // One typo does not take down the statusline: the cell renders blank and the warning names it.
    // Collect unknown names before truncating, so a typo past the ceiling still warns though its
    // cell is not rendered.
    if (instrument === undefined) notices.unknownInstruments.add(instrumentValue);
    // The ceiling truncates last: the first MAX_CELLS entries render, and the guard rather than a
    // break keeps every entry past it validated and checked for unknowns.
    if (cells.length < MAX_CELLS) {
      cells.push({ instrument: bind(instrument ?? blank), align });
    }
  }
  return { id: `row-${index}`, distribution: DISTRIBUTIONS[0], cells };
}

/**
 * The keys a 0.12.0 document wrote a row with at its top level. Any of them is a row this change
 * retired, so the whole document is refused rather than read into a placeholder.
 */
const RETIRED_KEYS = ["cells", "id", "distribution"] as const;

/** The shape a document writes its rows in: one row of one entry, which both messages show. */
const ROWS_FORM = '{"rows": [[{"instrument": "model"}]]}';

/** A document's rows, the empty lines its footer renders between them, and its notice's time. */
interface NormalizedDocument {
  rows: Row[];
  rowGap: number;
  noticeSeconds: number | undefined;
}

/** Normalize the document: one top-level row, or a list under `rows`; never both. */
function normalizeDocument(document: unknown, notices: Notices, theme: Theme): NormalizedDocument {
  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    throw new RejectedConfiguration("the configuration document is not an object");
  }
  const doc = document as Record<string, unknown>;

  // A retired key answers before `rows`, `rowGap` and `instruments`, and one message serves every
  // one of them: it is the only migration help a user gets, so it must fix all of them in one edit.
  if (RETIRED_KEYS.some((key) => key in doc)) {
    throw new RejectedConfiguration(
      `a row at the top level is retired; declare rows as ${ROWS_FORM} and drop any top-level id or distribution`,
    );
  }

  let rawRows: unknown[];
  if ("rows" in doc) {
    if (!Array.isArray(doc.rows)) {
      throw new RejectedConfiguration("the rows value is not a list");
    }
    // A top-level `containers` beside a `rows` list used to be rejected outright; the key is
    // unread either way, so it now takes the same once-per-document warning as a row's own.
    if ("containers" in doc) notices.containers = true;
    rawRows = doc.rows;
  } else {
    // No `rows` means no declared row, so the default row renders; the shortcut that read the
    // document itself as one row is the retired shape the guard above refuses.
    rawRows = [];
  }

  // Read beside either envelope, before any row: a value the reader cannot use refuses the whole
  // document, as a bad `distribution` does. pi-tui would floor `1.5` and clamp `-1` in silence.
  // shortcut: no unknown row or document key is warned on, so a misspelt `rowGap` renders the
  // default space without a word; upgrade by adding an unknown-key rule when a second misspelling
  // hurts, as its own change.
  let rowGap = DEFAULT_ROW_GAP;
  if ("rowGap" in doc) {
    const value = doc.rowGap;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_ROW_GAP) {
      throw new RejectedConfiguration(`rowGap must be a whole number from 0 to ${MAX_ROW_GAP}: ${JSON.stringify(value)}`);
    }
    rowGap = value;
  }

  const { configured, declaredSeconds } = readInstruments(doc.instruments, theme, notices);
  const bind = instrumentBindings(configured);
  const rows = rawRows.length === 0
    ? [defaultRow(bind)]
    : rawRows.map((raw, index) => normalizeRow(raw, index, notices, bind));
  // Placement is read from the rows the root installs, inside the ceiling the cells already obey.
  // The default row goes through it too, so the gate and the value cannot disagree about it.
  const placesNotice = rows.some(row => row.cells.some(cell => cell.instrument === bind(notice)));
  const noticeSeconds = placesNotice ? declaredSeconds.get(notice.name) ?? NOTICE_SECONDS : undefined;
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.id)) {
      throw new RejectedConfiguration(`two rows share the id ${JSON.stringify(row.id)}`);
    }
    seen.add(row.id);
  }
  return { rows, rowGap, noticeSeconds };
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
  if (!existsSync(path)) return { rows: [defaultRow(bind)], rowGap: DEFAULT_ROW_GAP, noticeSeconds: undefined, warning: undefined };

  let document: unknown;
  try {
    document = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {
      rows: [defaultRow(bind)],
      rowGap: DEFAULT_ROW_GAP,
      noticeSeconds: undefined,
      warning: `pi-jefferson: ${path} could not be read or parsed; rendering the default row`,
    };
  }

  try {
    const notices: Notices = { containers: false, unknownInstruments: new Set() };
    const { rows, rowGap, noticeSeconds } = normalizeDocument(document, notices, source.theme);
    return {
      rows,
      rowGap,
      noticeSeconds,
      warning: acceptedWarning(path, notices),
    };
  } catch (error) {
    if (error instanceof RejectedConfiguration) {
      return {
        rows: [defaultRow(bind)],
        rowGap: DEFAULT_ROW_GAP,
        noticeSeconds: undefined,
        warning: `pi-jefferson: ${path} was rejected (${error.message}); rendering the default row`,
      };
    }
    throw error;
  }
}
