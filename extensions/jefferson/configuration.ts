/**
 * The configuration reader: owns the extension's `pi-jefferson.json` surface.
 *
 * It resolves where the two documents live, then reads and parses the one that applies, reads the
 * `rows` list as rows of entries, applies the default row and the cells ceiling, and resolves each
 * cell's instrument at parse time through the source's registry. Every name a document writes is
 * normalized once here (design 5, 8; M12). A document it refuses renders the default row and warns;
 * that is the whole of its error handling.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CONFIG_DIR_NAME,
  getAgentDir,
  type Theme,
  type ThemeStyle,
} from "@earendil-works/pi-coding-agent";

import type { InstrumentDeclaration } from "./components/instruments/instrument.ts";
import type { Fault } from "./faults.ts";
import { isProvidedName, normalizeName } from "./registration.ts";
import { parseFormat, validateStyle, type FormatSegment } from "./format.ts";
import { ALIGNMENTS, DISTRIBUTIONS, type Cell, type CellAlign, type Row } from "./components/row/row.ts";
import {
  instrumentBindings,
  type BindInstrument,
  type ConfiguredInstrument,
} from "./components/instruments/instrument-binding.ts";

/** Whether a configuration value is one of `ALIGNMENTS`. */
function isAlign(value: unknown): value is CellAlign {
  return typeof value === "string" && ALIGNMENTS.some((align) => align === value);
}

/** A tuple's values as a message spells them: `"content" or "equal"`. */
function orList(values: readonly string[]): string {
  const quoted = values.map((value) => `"${value}"`);
  return quoted.slice(0, -1).join(", ") + ` or ${quoted[quoted.length - 1]}`;
}

/** Where a document lives, what it may read, and the registry it resolves names against. */
export interface ConfigurationSource {
  agentPath: string;
  projectPath: string;
  projectTrusted: boolean;
  theme: Theme;
  /** The declaration registered under a full name, or `undefined`. */
  resolve(name: string): InstrumentDeclaration | undefined;
  /** The declaration an entry renders when no registered name answers it: `blank`. */
  fallback: InstrumentDeclaration;
  /** The notice declaration's registered name, and the visible time it takes when unconfigured. */
  noticeGate: { name: string; seconds: number };
  /** Hold `apply` until the name registers, or until the install whose read asked is released. */
  watch(name: string, apply: (declaration: InstrumentDeclaration) => void): void;
  /** Record a fault this read found, which the composition root delivers after startup completes. */
  report(fault: Fault): void;
}

/** One name the document wrote that no instrument answered, and the row that placed it. */
export interface UnknownName {
  /** The spelling the document used, which is the one every message quotes. */
  written: string;
  /** The name it means: a bare name is the `jefferson.default.*` one. */
  normalized: string;
  /** The 1-based row that placed it, absent for a name only the `instruments` block configures. */
  row?: number;
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
  /** The document path this read chose, which is the one its warnings print. */
  path: string;
  /**
   * Every name the document names that no instrument answered, as data: startup drops the ones the
   * registry answers by the time startup completes and composes the rest (design 12).
   */
  unknownNames: readonly UnknownName[];
  /** Set only when a present document could not be read or was rejected. */
  warning: string | undefined;
}

export const DEFAULT_CELLS = 10;
export const MAX_CELLS = 10;
const DEFAULT_ROW_GAP = 1;
const MAX_ROW_GAP = 3;

/**
 * The keys a 0.12.0 document wrote a row with at its top level. Any of them is a row this change
 * retired, so the whole document is refused rather than read into a placeholder.
 */
const RETIRED_KEYS = ["cells", "id", "distribution"] as const;

/** The shape a document writes its rows in: one row of one entry, which both messages show. */
const ROWS_FORM = '{"rows": [[{"instrument": "model"}]]}';

/** A document the extension refused: the default row renders, none of it. */
class RejectedConfiguration extends Error {}

/** What one read gathers as it walks the document: the names nothing answered, and the holders a
 * late registration fills. */
interface Reading {
  unknownNames: UnknownName[];
  /** Each unresolved provided name, and every cell of this read that names it. */
  holders: Map<string, Array<Cell["holder"]>>;
  /** Each provided block value whose instrument has not registered, for the watch to check then. */
  held: Map<string, unknown>;
  /** Each provided name whose settings were refused: its entries render the fallback, not `blank`. */
  refused: Set<string>;
}

/** What a document says about its instruments: the binding's inputs, and the reader's own share. */
interface InstrumentConfiguration {
  /** Each declaration's parsed format, style, label and kind formats; a watch adds to it. */
  configured: Map<string, ConfiguredInstrument>;
  /** Each declaration's declared visible time, by name: the reader's share, never the binding's. */
  declaredSeconds: ReadonlyMap<string, number>;
}

/**
 * Everything under a provided name's key — its shape, format, label, option, variable, modifier and
 * style — checked against what its registration declared, or the one part that refuses it. It runs
 * when the document and the registration are both in hand, whichever came second (design 13; J1(b)).
 * A provided instrument takes `FOUNDATIONAL_OPTIONS` and nothing else, so the check and the binding
 * accept the same keys.
 */
function checkProvidedSettings(
  name: string, raw: unknown, declaration: InstrumentDeclaration, theme: Theme,
): ConfiguredInstrument | { kind: string; part: string } {
  const consequence = "; its entries render blank";
  if (raw !== undefined && (typeof raw !== "object" || raw === null || Array.isArray(raw))) {
    return {
      kind: "settings-shape",
      part: `the instruments block gives ${JSON.stringify(name)} a value that is not an object${consequence}`,
    };
  }
  const entry = (raw ?? {}) as Record<string, unknown>;
  const format = entry.format;
  if (format !== undefined && typeof format !== "string") {
    return {
      kind: "settings-format",
      part: `${JSON.stringify(name)} is configured with a format that is not a string${consequence}`,
    };
  }
  const label = entry.label;
  if (label !== undefined && typeof label !== "string") {
    return {
      kind: "settings-label",
      part: `${JSON.stringify(name)} is configured with a label that is not a string${consequence}`,
    };
  }
  for (const key of Object.keys(entry)) {
    if (!declaration.options.includes(key)) {
      return {
        kind: "settings-option",
        part: `${JSON.stringify(name)} is configured with ${JSON.stringify(key)}, which the instrument does not declare${consequence}`,
      };
    }
  }
  let segments: FormatSegment[];
  try {
    segments = parseFormat(declaration, format ?? declaration.defaultFormat);
  } catch (error) {
    // The table separates a format naming a variable the instrument lacks from one the language
    // refuses; the parse error is the only place that difference is visible.
    const variable = error instanceof Error
      ? /names a variable it does not declare: (".*")$/.exec(error.message)?.[1]
      : undefined;
    return variable === undefined
      ? { kind: "settings-parse", part: `${JSON.stringify(name)} is configured with a format Jefferson cannot parse${consequence}` }
      : {
        kind: "settings-variable",
        part: `${JSON.stringify(name)} is configured with a format naming ${variable}, which the instrument does not declare${consequence}`,
      };
  }
  let style: ThemeStyle;
  try {
    style = validateStyle(entry.style, theme);
  } catch {
    return {
      kind: "settings-style",
      part: `${JSON.stringify(name)} is configured with a style Jefferson cannot use${consequence}`,
    };
  }
  return { segments, style, ...(label === undefined ? {} : { label }) };
}

function readInstruments(raw: unknown, source: ConfigurationSource, reading: Reading): InstrumentConfiguration {
  const configured = new Map<string, ConfiguredInstrument>();
  const declaredSeconds = new Map<string, number>();
  if (raw === undefined) return { configured, declaredSeconds };
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new RejectedConfiguration("the instruments value is not an object");
  }
  // Two spellings of one instrument are one instrument, so configuring both is a mistake the block
  // cannot settle: the document is refused and the message quotes both keys as written (2.6).
  const written = new Map<string, string>();
  for (const [name, value] of Object.entries(raw)) {
    const normalized = normalizeName(name);
    const earlier = written.get(normalized);
    if (earlier !== undefined) {
      throw new RejectedConfiguration(
        `the instruments block configures ${JSON.stringify(earlier)} and ${JSON.stringify(name)}, which are one instrument`,
      );
    }
    written.set(normalized, name);

    // A provided name answers to its own instrument alone, so a fault under it refuses that
    // instrument and never the document: one extension's mistake cannot take down a user's footer.
    if (isProvidedName(normalized)) {
      const provided = source.resolve(normalized);
      if (provided === undefined) {
        // Not registered yet: the raw value waits for the watch, whatever its type (design 9), and
        // the name is reported at startup unless the registry answers it by then.
        reading.held.set(normalized, value);
        reading.unknownNames.push({ written: name, normalized });
        continue;
      }
      const settings = checkProvidedSettings(normalized, value, provided, source.theme);
      if ("part" in settings) {
        reading.refused.add(normalized);
        source.report({ scope: normalized, kind: settings.kind, part: settings.part });
        continue;
      }
      configured.set(normalized, settings);
      continue;
    }

    // Jefferson's own names, and a three-part name in its namespace, keep the whole-document rule.
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new RejectedConfiguration(`the instruments configuration for ${JSON.stringify(name)} is not an object`);
    }
    const declaration = source.resolve(normalized);
    if (declaration === undefined) {
      // The block's keys are unique and two spellings of one name are refused above, so no dedupe.
      reading.unknownNames.push({ written: name, normalized });
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
      if (error instanceof Error) throw new RejectedConfiguration(`${JSON.stringify(name)}'s ${error.message}`);
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
          if (error instanceof Error) throw new RejectedConfiguration(`${JSON.stringify(name)}'s ${error.message}`);
          throw error;
        }
      }
    }
    let style: ThemeStyle;
    try {
      style = validateStyle(entry.style, source.theme);
    } catch (error) {
      if (error instanceof Error) throw new RejectedConfiguration(`instrument ${JSON.stringify(name)} ${error.message}`);
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

function defaultRow(bind: BindInstrument, fallback: InstrumentDeclaration): Row {
  return { distribution: DISTRIBUTIONS[0], cells: blankCells(DEFAULT_CELLS, bind, fallback) };
}

function blankCells(count: number, bind: BindInstrument, fallback: InstrumentDeclaration): Cell[] {
  return Array.from({ length: count }, () => ({ name: fallback.name, holder: { current: bind(fallback) }, align: ALIGNMENTS[0] }));
}

/**
 * One row, from its list of entries. The first MAX_CELLS entries are its cells, in order, and every
 * entry is validated, so a fault or an unknown name past the ceiling still answers. An empty list is
 * rejected: a row of no cells has nothing to render. `index` is 0-based and internal; every message
 * places the row by its 1-based position, which is the number a user counts to.
 */
function normalizeRow(
  raw: unknown, index: number, reading: Reading, bind: BindInstrument, source: ConfigurationSource,
): Row {
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
    const normalized = normalizeName(instrumentValue);
    // A provided instrument whose settings were refused renders the fallback: the instrument
    // exists, its settings do not, and the one warning already named it (design 13).
    const refused = reading.refused.has(normalized);
    const declaration = refused ? undefined : source.resolve(normalized);
    // One typo does not take down the statusline: the cell renders the fallback and the warning
    // names the spelling the document wrote. Collect unknown names before truncating, so a typo past
    // the ceiling still warns though its cell is not rendered. A name joins once per row it is
    // written in, and the first spelling of it is the one every message prints.
    if (declaration === undefined && !refused
      && !reading.unknownNames.some((unknown) => unknown.row === index + 1 && unknown.normalized === normalized)) {
      reading.unknownNames.push({ written: instrumentValue, normalized, row: index + 1 });
    }
    // The ceiling truncates last: the first MAX_CELLS entries render, and the guard rather than a
    // break keeps every entry past it validated and checked for unknowns.
    if (cells.length < MAX_CELLS) {
      const resolved = declaration ?? source.fallback;
      const holder = { current: bind(resolved) };
      cells.push({ name: resolved.name, holder, align });
      // An entry naming a provided instrument that has not registered joins that name's watch: when
      // it registers, this read's bind fills the holder (design 9).
      if (declaration === undefined && !refused && isProvidedName(normalized)) {
        const recorded = reading.holders.get(normalized);
        if (recorded === undefined) reading.holders.set(normalized, [holder]);
        else recorded.push(holder);
      }
    }
  }
  return { distribution: DISTRIBUTIONS[0], cells };
}

/** A document's rows, the empty lines its footer renders between them, and its notice's time. */
interface NormalizedDocument {
  rows: Row[];
  rowGap: number;
  noticeSeconds: number | undefined;
}

/** Normalize the document: a retired top-level key refuses it; otherwise its rows come from `rows`, or the default row when it declares none. */
function normalizeDocument(document: unknown, reading: Reading, source: ConfigurationSource): NormalizedDocument {
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
    rawRows = doc.rows;
  } else {
    // No `rows` means no declared row, so the default row renders; the shortcut that read the
    // document itself as one row is the retired shape the guard above refuses.
    rawRows = [];
  }

  // Read before any row: a value the reader cannot use refuses the whole document. pi-tui would
  // floor `1.5` and clamp `-1` in silence.
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

  const { configured, declaredSeconds } = readInstruments(doc.instruments, source, reading);
  const bind = instrumentBindings(configured);
  const rows = rawRows.length === 0
    ? [defaultRow(bind, source.fallback)]
    : rawRows.map((raw, index) => normalizeRow(raw, index, reading, bind, source));
  // Placement is read from the rows the root installs, inside the ceiling the cells already obey.
  // The default row goes through it too, so the gate and the value cannot disagree about it.
  const placesNotice = rows.some(row => row.cells.some(cell => cell.name === source.noticeGate.name));
  const noticeSeconds = placesNotice
    ? declaredSeconds.get(source.noticeGate.name) ?? source.noticeGate.seconds
    : undefined;
  // Only now, with the whole document normalized: a rejected read registers no watch.
  for (const [name, holders] of reading.holders) {
    const raw = reading.held.get(name);
    source.watch(name, (declaration) => {
      // (a) The same check the reader runs for a name already registered, on the value the document
      // held for it — so the outcome depends on the name and never on the load order.
      const settings = checkProvidedSettings(name, raw, declaration, source.theme);
      if ("part" in settings) {
        // (c) The fault refuses that instrument alone: every holder stays on the fallback.
        source.report({ scope: name, kind: settings.kind, part: settings.part });
        return;
      }
      // (b) The entry goes into the read's Map before the bind reads it, then every holder follows.
      configured.set(name, settings);
      const bound = bind(declaration);
      for (const holder of holders) holder.current = bound;
    });
  }
  return { rows, rowGap, noticeSeconds };
}

/**
 * What an accepted document has to say for itself, or `undefined` when it has nothing to say. The
 * delivery point hands it the names the registry still does not answer (design 12).
 */
export function acceptedWarning(path: string, unknownNames: readonly UnknownName[]): string | undefined {
  const parts: string[] = [];
  // The rows' parts first, then the block's one part: a row's part changes what renders.
  for (const unknown of unknownNames) {
    if (unknown.row === undefined) continue;
    parts.push(`row ${unknown.row}: ${JSON.stringify(unknown.written)} is not a known instrument`);
  }
  const block = unknownNames.filter((unknown) => unknown.row === undefined);
  if (block.length > 0) {
    parts.push(
      `the instruments block names instruments the extension does not implement: ${block
        .map((unknown) => JSON.stringify(unknown.written))
        .join(", ")}`,
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
  if (!existsSync(path)) {
    return {
      rows: [defaultRow(bind, source.fallback)],
      rowGap: DEFAULT_ROW_GAP,
      noticeSeconds: undefined,
      path,
      unknownNames: [],
      warning: undefined,
    };
  }

  let document: unknown;
  try {
    document = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {
      rows: [defaultRow(bind, source.fallback)],
      rowGap: DEFAULT_ROW_GAP,
      noticeSeconds: undefined,
      path,
      unknownNames: [],
      warning: `pi-jefferson: ${path} could not be read or parsed; rendering the default row`,
    };
  }

  try {
    const reading: Reading = { unknownNames: [], holders: new Map(), held: new Map(), refused: new Set() };
    const { rows, rowGap, noticeSeconds } = normalizeDocument(document, reading, source);
    return { rows, rowGap, noticeSeconds, path, unknownNames: reading.unknownNames, warning: undefined };
  } catch (error) {
    if (error instanceof RejectedConfiguration) {
      return {
        rows: [defaultRow(bind, source.fallback)],
        rowGap: DEFAULT_ROW_GAP,
        noticeSeconds: undefined,
        path,
        unknownNames: [],
        warning: `pi-jefferson: ${path} was rejected (${error.message}); rendering the default row`,
      };
    }
    throw error;
  }
}
