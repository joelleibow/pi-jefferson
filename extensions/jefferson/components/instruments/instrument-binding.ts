/** Binds a configured format and style to an instrument declaration: the instrument that renders. */
import type { ThemeStyle } from "@earendil-works/pi-coding-agent";

import { FOUNDATIONAL_OPTIONS, type Instrument, type InstrumentDeclaration } from "./instrument.ts";
import { timed } from "../visuals/timed.ts";
import { collapse, parseFormat, resolveFormat, resolvePlain, type FormatSegment } from "../../format.ts";
import type { Readings } from "../../data/session-data-store.ts";
import type { FieldValue, ReadingsView } from "../../data/field-value.ts";
import type { Fault } from "../../faults.ts";
import type { ProvidedDeclaration } from "../../instrument-contract.ts";

export type BindInstrument = (declaration: InstrumentDeclaration) => Instrument;

export interface ConfiguredInstrument {
  segments: FormatSegment[];
  style: ThemeStyle;
  label?: string;
  /** A composed format set's configured text, by key; the declaration's defaults fill the rest. */
  formats?: Record<string, FormatSegment[]>;
}

/**
 * The one home of decision 15's `<what>`: one word for each thing a value may be. Both a report that
 * carries the wrong type and a resolver that returns one answer it, so the two rows cannot drift.
 */
export function describeValue(value: unknown): string {
  if (value === undefined) return "nothing";
  if (value === null) return "null";
  switch (typeof value) {
    case "string": return "a string";
    case "number": return "a number";
    case "boolean": return "a boolean";
    case "bigint": return "a bigint";
    case "symbol": return "a symbol";
    case "function": return "a function";
    // Arrays are objects here, as the table's row says.
    default: return "an object";
  }
}

/** What adapting a provided declaration refuses, in decision 15's row order. */
export type ProvidedRefusal =
  | { refused: "unparseable-default-format" }
  | { refused: "label-not-string" }
  | { refused: "resolver-not-function"; variable: string };

/**
 * Adapt one provided declaration to a Jefferson declaration over `Readings`, or refuse it. The
 * refusals are checked in decision 15's row order — the default format first, then the label, then
 * the resolvers — so the part the listener reports is the first fault the table names. Each adapted
 * variable calls the provider's resolver with the provider's own view, and nothing else.
 */
export function adaptProvidedDeclaration(
  name: string,
  declaration: ProvidedDeclaration,
  view: () => ReadingsView,
  record?: (fault: Fault) => void,
): InstrumentDeclaration | ProvidedRefusal {
  // The payload crossed a bus as `unknown`, so its members are read as the values they may be.
  const members = declaration as unknown as Record<string, unknown>;
  const quoted = JSON.stringify(name);
  const variables: Record<string, (readings: Readings) => string | undefined> = {};
  for (const [variable, resolver] of Object.entries(members.variables as object)) {
    variables[variable] = () => {
      let value: unknown;
      try {
        // The guard covers the provider's call and nothing else: classifying what it returned runs
        // outside it, so a `then` getter that throws is the outer boundary's to catch (design 10).
        value = (resolver as (readings: ReadingsView) => unknown)(view());
      } catch {
        record?.({ scope: name, kind: "resolver-threw", part: `${quoted} failed to render: its resolver threw` });
        return undefined;
      }
      if ((typeof value === "object" && value !== null || typeof value === "function")
        && typeof (value as { then?: unknown }).then === "function") {
        // The rejection is observed, so a provider's promise cannot take pi down with it.
        (value as { then(onFulfilled: undefined, onRejected: () => void): void }).then(undefined, () => {});
        record?.({ scope: name, kind: "resolver-promise", part: `${quoted} failed to render: its resolver returned a promise` });
        return undefined;
      }
      // `undefined` is the declaration's own unknown value, not a fault (M8).
      if (value === undefined || typeof value === "string") return value;
      record?.({
        scope: name, kind: "resolver-returned",
        part: `${quoted} failed to render: its resolver returned ${describeValue(value)}, where text is declared`,
      });
      return undefined;
    };
  }
  const adapted: InstrumentDeclaration = {
    name,
    variables,
    defaultFormat: members.defaultFormat as string,
    ...(members.defaultLabel === undefined ? {} : { defaultLabel: members.defaultLabel as string }),
    options: FOUNDATIONAL_OPTIONS,
  };
  try {
    parseFormat(adapted, adapted.defaultFormat);
  } catch {
    return { refused: "unparseable-default-format" };
  }
  if (members.defaultLabel !== undefined && typeof members.defaultLabel !== "string") return { refused: "label-not-string" };
  for (const [variable, resolver] of Object.entries(members.variables as object)) {
    if (typeof resolver !== "function") return { refused: "resolver-not-function", variable };
  }
  return adapted;
}

/**
 * The outer boundary around a provided instrument's bound render, for anything the adapter's own
 * guard cannot see. Jefferson's own instruments are never wrapped, so their defects fail the suite
 * (design 10; spec "Provider code costs one entry and no more").
 */
export function containProvided(instrument: Instrument, name: string, record: (fault: Fault) => void): Instrument {
  return {
    get fills() {
      return instrument.fills;
    },
    render(readings, width, theme) {
      try {
        return instrument.render(readings, width, theme);
      } catch {
        record({ scope: name, kind: "resolver-threw", part: `${JSON.stringify(name)} failed to render: its resolver threw` });
        return "";
      }
    },
  };
}

export function instrumentBindings(configured: ReadonlyMap<string, ConfiguredInstrument> = new Map()): BindInstrument {
  const bound = new Map<string, Instrument>();
  return declaration => {
    let instrument = bound.get(declaration.name);
    if (instrument === undefined) {
      const entry = configured.get(declaration.name);
      const segments = entry?.segments ?? parseFormat(declaration, declaration.defaultFormat);
      const style = entry?.style ?? {};
      // The label carries no edge whitespace of its own, and one gap stands between it and its
      // content (ADR 0006): the gap is due from the document, and the label's segment holds it so
      // `$bar` counts its column and the label's style covers it.
      const label = collapse(entry?.label ?? declaration.defaultLabel ?? "").trim();
      const gap = label !== "" && segments.length > 0 ? " " : "";
      const labelled: FormatSegment[] = label === "" ? segments
        : [{ kind: "literal", text: label + gap, modifiers: [] }, ...segments];
      // A composed declaration's kind formats parse once, at the bind: the defaults here and
      // the document's overrides already parsed by the configuration reader.
      const composed = declaration.composed;
      const plain: Readonly<Record<string, FormatSegment[]>> = composed === undefined ? {}
        : Object.fromEntries(Object.entries(composed.formats).map(([key, format]) => [key, parseFormat(declaration, format, true)]));
      instrument = {
        // The parse in hand decides it: a `$bar` segment takes whatever columns its cell leaves.
        fills: declaration.fills === true || segments.some(segment => segment.kind === "bar"),
        render: (readings, width, renderTheme) => {
          let preResolved: Record<string, string> | undefined;
          if (composed !== undefined) {
            const key = composed.select(readings);
            const chosen = key === undefined ? undefined : entry?.formats?.[key] ?? plain[key];
            const composedText = chosen === undefined ? "" : resolvePlain(declaration, chosen, readings);
            // An empty kind text silences the kind (D5, Joel's 2026-11-11 ruling): nothing to compose
            // is the unknown rule's nothing, so the cell drops its label and gap rather than rendering
            // a bare label, which is what an absent value would otherwise do.
            if (composedText !== "") preResolved = { [composed.variable]: composedText };
          }
          const text = resolveFormat(declaration, labelled, style, readings, width, renderTheme, preResolved);
          // A timed declaration's whole text shows or hides: nothing to show renders as nothing,
          // so the cell drops its label and gap as it does for an unknown datum.
          return declaration.shownUntil === undefined
            ? text
            : timed(text, declaration.shownUntil(readings), readings.sampledAt) ?? "";
        },
      };
      bound.set(declaration.name, instrument);
    }
    return instrument;
  };
}
