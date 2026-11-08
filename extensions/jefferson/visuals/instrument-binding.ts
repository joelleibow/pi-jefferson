/** Binds a configured format and style to an instrument declaration: the instrument that renders. */
import type { ThemeStyle } from "@earendil-works/pi-coding-agent";

import type { Instrument, InstrumentDeclaration } from "./instrument.ts";
import { collapse, parseFormat, resolveFormat, type FormatSegment } from "./format.ts";

export type BindInstrument = (declaration: InstrumentDeclaration) => Instrument;

export interface ConfiguredInstrument {
  segments: FormatSegment[];
  style: ThemeStyle;
  label?: string;
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
      instrument = {
        // The parse in hand decides it: a `$bar` segment takes whatever columns its cell leaves.
        fills: declaration.fills === true || segments.some(segment => segment.kind === "bar"),
        render: (readings, width, renderTheme) => resolveFormat(declaration, labelled, style, readings, width, renderTheme),
      };
      bound.set(declaration.name, instrument);
    }
    return instrument;
  };
}
