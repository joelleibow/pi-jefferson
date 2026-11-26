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

import {
  containProvided,
  instrumentBindings,
  type BindInstrument,
  type ConfiguredInstrument,
  type InstrumentSettings,
} from "./components/instruments/instrument-binding.ts";
import type { InstrumentDeclaration } from "./components/instruments/instrument.ts";
import { ALIGNMENTS, DISTRIBUTIONS, type Cell, type CellAlign, type Row } from "./components/row/row.ts";
import type { Fault } from "./faults.ts";
import { foregroundCheck, parseFormat, validateStyle, type ForegroundCheck, type FormatSegment } from "./format.ts";
import { isProvidedName, normalizeName } from "./registration.ts";
import { readThresholds, type Threshold, type ThresholdFault } from "./thresholds.ts";

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
  /** The 1-based row that placed it: only a row's entry is reported, because only it renders blank. */
  row: number;
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
  /** Each provided name whose settings were refused: its entries render the fallback instrument. */
  refused: Set<string>;
  /**
   * The settings faults found while the document normalized. They wait here, because a document a
   * later row or key rejects never installs, and a fault about it would be a warning about something
   * the user never had (the published rule is that only an accepted document's faults are reported).
   */
  faults: Fault[];
}

/** How one settings object's faults are worded: the top level's possessive, or a threshold's place. */
interface FaultSentences {
  /** A predicate the sentence's subject carries, as the top level writes it: `has a format …`. */
  readonly predicate: (text: string) => never;
  /**
   * A sentence about one of the instrument's own keys, which the parser does not own: at the top
   * level it keeps the whole-document rule's `instrument "<name>"'s …` (design.md:317-319).
   */
  readonly possessive: (text: string) => never;
  /** The parser's own sentence whose meaning is forwarded, the top level keeping its possessive. */
  readonly forwarded: (text: string) => never;
}

/**
 * The place one written threshold's fault names: the instrument as the path prints it, the key and
 * the 1-based written position. One function serves both paths and names nothing else (ADR 0015;
 * design DEC-14).
 */
function thresholdPlace(subject: string, position: number): string {
  return `${subject}, thresholds ${position}:`;
}

/** What a fault the reader answers on its own says, on the path that prints `subject`. */
function thresholdFaultSentence(subject: string, fault: ThresholdFault): string {
  switch (fault.kind) {
    case "settings-thresholds": return `${subject} has thresholds that is not a list`;
    case "settings-threshold": return `${thresholdPlace(subject, fault.position)} is not an object`;
    case "settings-threshold-active-at":
      return `${thresholdPlace(subject, fault.position)} has an activeAt that is not a whole number at or above 0`;
    case "settings-threshold-duplicate":
      return `${thresholdPlace(subject, fault.position)} repeats the threshold at ${fault.activeAt}`;
  }
}

/**
 * One settings object's values, parsed — the top level's or one threshold's — so a value inside a
 * threshold is checked exactly as the top level's is (design DEC-1, DEC-14). Only what the document
 * wrote comes back: the binding completes the top level's defaults, and a threshold that left a key
 * out takes the top level's.
 */
function ownValues(
  declaration: InstrumentDeclaration,
  settings: Readonly<Record<string, unknown>>,
  theme: Theme,
  check: ForegroundCheck,
  sentences: FaultSentences,
): InstrumentSettings {
  let segments: FormatSegment[] | undefined;
  const format = settings.format;
  if (format !== undefined) {
    if (typeof format !== "string") sentences.predicate("has a format that is not a string");
    try {
      segments = parseFormat(declaration, format, check);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      sentences.forwarded(error.message);
    }
  }
  let label: string | undefined;
  if (settings.label !== undefined) {
    if (typeof settings.label !== "string") sentences.predicate("has a label that is not a string");
    label = settings.label;
  }
  let style: ThemeStyle | undefined;
  if (settings.style !== undefined) {
    try {
      style = validateStyle(settings.style, theme);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      sentences.predicate(error.message);
    }
  }
  let fill: ThemeStyle | undefined;
  if (settings.fill !== undefined) {
    try {
      fill = validateStyle(settings.fill, theme, "fill");
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      sentences.predicate(error.message);
    }
  }
  let formats: Record<string, FormatSegment[]> | undefined;
  const declaredFormats = settings.formats;
  if (declaredFormats !== undefined) {
    if (typeof declaredFormats !== "object" || declaredFormats === null || Array.isArray(declaredFormats)) {
      sentences.predicate("has formats that is not an object");
    }
    formats = {};
    for (const [kind, text] of Object.entries(declaredFormats)) {
      if (declaration.composed === undefined || !Object.hasOwn(declaration.composed.formats, kind)) {
        sentences.possessive(`formats names a kind it does not carry: ${JSON.stringify(kind)}`);
      }
      if (typeof text !== "string") {
        sentences.possessive(`formats has a kind whose format is not a string: ${JSON.stringify(kind)}`);
      }
      try {
        formats[kind] = parseFormat(declaration, text, check, true);
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        sentences.forwarded(error.message);
      }
    }
  }
  return {
    ...(segments === undefined ? {} : { segments }),
    ...(style === undefined ? {} : { style }),
    ...(label === undefined ? {} : { label }),
    ...(formats === undefined ? {} : { formats }),
    ...(fill === undefined ? {} : { fill }),
  };
}

/** What a document says about its instruments: the binding's inputs, and the reader's own share. */
interface InstrumentConfiguration {
  /** Each declaration's parsed format, style, label and kind formats; a watch adds to it. */
  configured: Map<string, ConfiguredInstrument>;
  /** Each declaration's declared visible time, by name: the reader's share, never the binding's. */
  declaredSeconds: ReadonlyMap<string, number>;
}

/**
 * Everything under a provided name's key — its shape, format, label, option, formats, variable,
 * modifier, style, fill and thresholds — checked against what its registration declared, or the one
 * part that refuses it. It runs when the document and the registration are both in hand, whichever
 * came second (design 13; J1(b)). A provided instrument takes the options its adapted declaration
 * lists: the foundational three, `formats` when it declares a composed set, and `thresholds` or
 * `fill` when it carries `bar` and names that option. The threshold rules are the reader's, which
 * this path hands its own per-value check as `check` (design DEC-1): one set of rules, two origins.
 */
function checkProvidedSettings(
  name: string, raw: unknown, declaration: InstrumentDeclaration, theme: Theme, check: ForegroundCheck,
): { settings: ConfiguredInstrument; warning?: string } | { kind: string; part: string } {
  const consequence = "; it renders blank";
  const quoted = JSON.stringify(name);
  if (raw !== undefined && (typeof raw !== "object" || raw === null || Array.isArray(raw))) {
    return { kind: "settings-shape", part: `${quoted} is configured with a value that is not an object${consequence}` };
  }
  const entry = (raw ?? {}) as Record<string, unknown>;

  /**
   * One settings object's values, parsed, or the fault that refuses it: the same check for the top
   * level and for every threshold, carrying only what the document wrote (design DEC-1). `at` opens
   * the sentence — the name at the top level, the place phrase inside a threshold.
   */
  const values = (
    settings: Readonly<Record<string, unknown>>,
    at: { readonly predicate: string; readonly forwarded: string },
    allowed: readonly string[],
  ): { settings: InstrumentSettings } | { kind: string; part: string } => {
    /** One fault, worded as this path words it: its predicate after the subject. */
    const refuse = (kind: string, text: string) => ({ kind, part: `${at.predicate} ${text}${consequence}` });
    /** The parser's own sentence, forwarded whole: the top level keeps its possessive. */
    const forwarded = (kind: string, text: string) => ({ kind, part: `${at.forwarded} ${text}${consequence}` });
    for (const key of Object.keys(settings)) {
      if (!allowed.includes(key)) {
        return refuse("settings-option", `is configured with ${JSON.stringify(key)}, which the instrument does not declare`);
      }
    }
    let segments: FormatSegment[] | undefined;
    const format = settings.format;
    if (format !== undefined) {
      if (typeof format !== "string") return refuse("settings-format", "is configured with a format that is not a string");
      try {
        segments = parseFormat(declaration, format, check);
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        // The table separates a format naming a variable the instrument lacks from one the language
        // refuses for another reason; the parse error is the only place that difference is visible.
        // Every other fault forwards the parser's own sentence, so the offending name reads alike
        // wherever it is reached (design, "One refusal message, owned by the parser and forwarded by
        // every path").
        const variable = /names a variable it does not declare: (".*")$/.exec(error.message)?.[1];
        return variable === undefined
          ? forwarded("settings-parse", error.message)
          : refuse("settings-variable", `is configured with a format naming ${variable}, which the instrument does not declare`);
      }
    }
    let label: string | undefined;
    if (settings.label !== undefined) {
      if (typeof settings.label !== "string") return refuse("settings-label", "is configured with a label that is not a string");
      label = settings.label;
    }
    let style: ThemeStyle | undefined;
    if (settings.style !== undefined) {
      try {
        style = validateStyle(settings.style, theme);
      } catch {
        return refuse("settings-style", "is configured with a style Jefferson cannot use");
      }
    }
    let fill: ThemeStyle | undefined;
    if (settings.fill !== undefined) {
      try {
        fill = validateStyle(settings.fill, theme, "fill");
      } catch {
        return refuse("settings-fill", "is configured with a fill Jefferson cannot use");
      }
    }
    // The composed set's kinds, checked as the whole-document rule checks Jefferson's own: shape, the
    // kind it names, the text's type, then the parse — each refusing only this instrument (J1(b)).
    let formats: Record<string, FormatSegment[]> | undefined;
    const declaredFormats = settings.formats;
    if (declaredFormats !== undefined) {
      if (typeof declaredFormats !== "object" || declaredFormats === null || Array.isArray(declaredFormats)) {
        return refuse("settings-formats", "is configured with formats that is not an object");
      }
      formats = {};
      const carried = declaration.composed?.formats;
      for (const [kind, text] of Object.entries(declaredFormats)) {
        if (carried === undefined || !Object.hasOwn(carried, kind)) {
          return refuse("settings-formats-kind", `is configured with a formats kind ${JSON.stringify(kind)}, which the instrument does not carry`);
        }
        if (typeof text !== "string") {
          return refuse("settings-formats-string", `is configured with a formats kind ${JSON.stringify(kind)} whose format is not a string`);
        }
        try {
          formats[kind] = parseFormat(declaration, text, check, true);
        } catch {
          return refuse("settings-formats-parse", `is configured with a formats kind ${JSON.stringify(kind)} whose format Jefferson cannot parse`);
        }
      }
    }
    return {
      settings: {
        ...(segments === undefined ? {} : { segments }),
        ...(style === undefined ? {} : { style }),
        ...(label === undefined ? {} : { label }),
        ...(formats === undefined ? {} : { formats }),
        ...(fill === undefined ? {} : { fill }),
      },
    };
  };

  const top = values(entry, { predicate: quoted, forwarded: `${quoted}'s` }, declaration.options);
  if ("part" in top) return top;
  // The reader's own faults take this path's sentences; the place phrase opens each one.
  let thresholds: readonly Threshold<InstrumentSettings>[] | undefined;
  let overFour: string | undefined;
  if (entry.thresholds !== undefined) {
    const allowed = declaration.options.filter(option => option !== "thresholds");
    const read = readThresholds<InstrumentSettings, { kind: string; part: string }>(
      entry.thresholds, quoted,
      (settings, position) => {
        const place = thresholdPlace(quoted, position);
        const parsed = values(settings, { predicate: place, forwarded: place }, allowed);
        return "part" in parsed ? { refused: parsed } : { settings: parsed.settings };
      },
    );
    if ("fault" in read) {
      // The reader's own faults keep the own path's predicate after this path's subject; only a
      // value that is not a list takes this path's `is configured with` form, as `formats` does.
      const sentence = read.fault.kind === "settings-thresholds"
        ? `${quoted} is configured with thresholds that is not a list`
        : thresholdFaultSentence(quoted, read.fault);
      return { kind: read.fault.kind, part: `${sentence}${consequence}` };
    }
    if ("refused" in read) return read.refused;
    thresholds = read.honoured;
    overFour = read.overFour;
  }
  return {
    settings: { ...top.settings, ...(thresholds === undefined ? {} : { thresholds }) },
    ...(overFour === undefined ? {} : { warning: overFour }),
  };
}

function readInstruments(
  raw: unknown, source: ConfigurationSource, reading: Reading, check: ForegroundCheck,
): InstrumentConfiguration {
  const configured = new Map<string, ConfiguredInstrument>();
  const declaredSeconds = new Map<string, number>();
  if (raw === undefined) return { configured, declaredSeconds };
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new RejectedConfiguration("the instruments value is not an object");
  }
  // Each key as written, by the name it means: two registered spellings of one instrument are
  // refused, and two spellings of an unregistered one are two inert entries.
  const written = new Map<string, string>();
  for (const [name, value] of Object.entries(raw)) {
    const normalized = normalizeName(name);
    const earlier = written.get(normalized);
    written.set(normalized, name);
    const declaration = source.resolve(normalized);
    // An entry whose instrument has not registered draws no warning, whatever it holds: its settings
    // are checked only when that instrument registers (owner-rulings.md, 2026-11-16).
    if (declaration === undefined) {
      // Only a provided name can still register, so only its raw value waits for the watch (design 9).
      if (isProvidedName(normalized)) reading.held.set(normalized, value);
      continue;
    }
    // Two spellings of one registered instrument are a mistake the block cannot settle: the document
    // is refused and the message quotes both keys as written (2.6).
    if (earlier !== undefined) {
      throw new RejectedConfiguration(
        `the instruments block configures ${JSON.stringify(earlier)} and ${JSON.stringify(name)}, which are one instrument`,
      );
    }

    // A provided name answers to its own instrument alone, so a fault under it refuses that
    // instrument and never the document: one extension's mistake cannot take down a user's footer.
    if (isProvidedName(normalized)) {
      const settings = checkProvidedSettings(normalized, value, declaration, source.theme, check);
      if ("part" in settings) {
        reading.refused.add(normalized);
        reading.faults.push({ scope: normalized, kind: settings.kind, part: settings.part });
        continue;
      }
      configured.set(normalized, settings.settings);
      // The count's sentence moves only for settings this name accepted (design DEC-11).
      if (settings.warning !== undefined) {
        reading.faults.push({ scope: normalized, kind: "thresholds-over-four", part: settings.warning });
      }
      continue;
    }

    // Jefferson's own instruments keep the whole-document rule.
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new RejectedConfiguration(`the instruments configuration for ${JSON.stringify(name)} is not an object`);
    }
    const entry = value as Record<string, unknown>;
    const subject = `instrument ${JSON.stringify(name)}`;
    for (const key of Object.keys(entry)) {
      if (!declaration.options.includes(key)) {
        throw new RejectedConfiguration(`${subject} carries an option its declaration does not have: ${JSON.stringify(key)}`);
      }
    }
    const settings = ownValues(declaration, entry, source.theme, check, {
      predicate: text => { throw new RejectedConfiguration(`${subject} ${text}`); },
      possessive: text => { throw new RejectedConfiguration(`${subject}'s ${text}`); },
      forwarded: text => { throw new RejectedConfiguration(`${JSON.stringify(name)}'s ${text}`); },
    });
    // `seconds` is the reader's share, never the binding's, and it is judged only at the top level.
    const seconds = entry.seconds;
    if (seconds !== undefined
      && (typeof seconds !== "number" || !Number.isInteger(seconds) || seconds < 1 || seconds > 60)) {
      throw new RejectedConfiguration(`seconds must be a whole number from 1 to 60: ${JSON.stringify(seconds)}`);
    }
    // The one reader, called whenever the key is present: `null` reaches it and answers its own
    // fault, and this path's own per-value check is what it runs on every threshold written.
    let thresholds: readonly Threshold<InstrumentSettings>[] | undefined;
    let overFour: string | undefined;
    if (entry.thresholds !== undefined) {
      const read = readThresholds<InstrumentSettings, string>(entry.thresholds, subject, (values, position) => {
        const place = thresholdPlace(subject, position);
        for (const key of Object.keys(values)) {
          // A threshold's keys are the declaration's options minus `thresholds`: no second list.
          if (key === "thresholds" || !declaration.options.includes(key)) {
            throw new RejectedConfiguration(`${place} carries an option its declaration does not have: ${JSON.stringify(key)}`);
          }
        }
        return {
          settings: ownValues(declaration, values, source.theme, check, {
            predicate: text => { throw new RejectedConfiguration(`${place} ${text}`); },
            possessive: text => { throw new RejectedConfiguration(`${place} ${text}`); },
            forwarded: text => { throw new RejectedConfiguration(`${place} ${text}`); },
          }),
        };
      });
      if ("fault" in read) throw new RejectedConfiguration(thresholdFaultSentence(subject, read.fault));
      if ("refused" in read) throw new RejectedConfiguration(read.refused);
      thresholds = read.honoured;
      overFour = read.overFour;
    }
    configured.set(declaration.name, { ...settings, ...(thresholds === undefined ? {} : { thresholds }) });
    // The reader composed the count's sentence, and it moves only for an instrument whose settings
    // were accepted, which is why it waits here rather than travelling with the reader.
    if (overFour !== undefined) {
      reading.faults.push({ scope: declaration.name, kind: "thresholds-over-four", part: overFour });
    }
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
    throw new RejectedConfiguration(`${place} is not a list; a row is a list of instruments, as ${ROWS_FORM}`);
  }
  if (raw.length === 0) {
    throw new RejectedConfiguration(`${place} is empty; a row lists the instruments it renders`);
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
      throw new RejectedConfiguration(
        `${at} has an unrecognised key ${JSON.stringify(unknownKey)}; an instrument in a row takes only "instrument" and "align"`,
      );
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
function normalizeDocument(
  document: unknown, reading: Reading, source: ConfigurationSource, check: ForegroundCheck,
): NormalizedDocument {
  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    throw new RejectedConfiguration("the configuration file is not an object");
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

  const { configured, declaredSeconds } = readInstruments(doc.instruments, source, reading, check);
  const binding = instrumentBindings(check, configured);
  // Every provided instrument is bound through the outer boundary, at the reader's bind and the
  // watch's alike, so neither moment can miss it; Jefferson's own stay unwrapped (design 10).
  const bind: BindInstrument = declaration => isProvidedName(declaration.name)
    ? containProvided(binding(declaration), declaration.name, fault => source.report(fault))
    : binding(declaration);
  const rows = rawRows.length === 0
    ? [defaultRow(bind, source.fallback)]
    : rawRows.map((raw, index) => normalizeRow(raw, index, reading, bind, source));
  // Placement is read from the rows the root installs, inside the ceiling the cells already obey.
  // The default row goes through it too, so the gate and the value cannot disagree about it.
  const placesNotice = rows.some(row => row.cells.some(cell => cell.name === source.noticeGate.name));
  const noticeSeconds = placesNotice
    ? declaredSeconds.get(source.noticeGate.name) ?? source.noticeGate.seconds
    : undefined;
  // Only now, with the whole document normalized: a rejected read registers no watch and reports no
  // fault, so a settings fault found above is delivered only for a document that installs.
  for (const fault of reading.faults) source.report(fault);

  // A name only the `instruments` block configures takes a watch with no holder, so its settings are
  // checked when it registers: the check runs for every name the document names, not only the ones a
  // row places (the statusline delta's MUST; M6).
  for (const name of new Set([...reading.holders.keys(), ...reading.held.keys()])) {
    const holders = reading.holders.get(name) ?? [];
    const raw = reading.held.get(name);
    source.watch(name, (declaration) => {
      // (a) The same check the reader runs for a name already registered, on the value the document
      // held for it — so the outcome depends on the name and never on the load order.
      const settings = checkProvidedSettings(name, raw, declaration, source.theme, check);
      if ("part" in settings) {
        // (c) The fault refuses that instrument alone: every holder stays on the fallback.
        source.report({ scope: name, kind: settings.kind, part: settings.part });
        return;
      }
      // (b) The entry goes into the read's Map before the bind reads it, then every holder follows.
      configured.set(name, settings.settings);
      const bound = bind(declaration);
      for (const holder of holders) holder.current = bound;
      // A provider that registers after the read warns through the ledger, after its settings land.
      if (settings.warning !== undefined) source.report({ scope: name, kind: "thresholds-over-four", part: settings.warning });
    });
  }
  return { rows, rowGap, noticeSeconds };
}

/**
 * What an accepted document has to say for itself, or `undefined` when it has nothing to say. The
 * delivery point hands it the names the registry still does not answer (design 12).
 */
export function acceptedWarning(path: string, unknownNames: readonly UnknownName[]): string | undefined {
  const parts = unknownNames.map((unknown) => `row ${unknown.row}: ${JSON.stringify(unknown.written)} is not a known instrument`);
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
  // One check per read, built from the theme the read is handed: every parse below asks it, so the
  // language reads no host state and the theme is asked once per boundary, not once per name.
  const check = foregroundCheck(source.theme);
  const bind = instrumentBindings(check);
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
    const reading: Reading = {
      unknownNames: [], holders: new Map(), held: new Map(), refused: new Set(), faults: [],
    };
    const { rows, rowGap, noticeSeconds } = normalizeDocument(document, reading, source, check);
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
