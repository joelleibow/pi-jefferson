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
      const label = collapse(entry?.label ?? declaration.defaultLabel ?? "");
      const labelled: FormatSegment[] = label === "" ? segments
        : [{ kind: "literal", text: label, modifiers: [] }, ...segments];
      instrument = {
        render: (readings, width, renderTheme) => resolveFormat(declaration, labelled, style, readings, width, renderTheme),
      };
      bound.set(declaration.name, instrument);
    }
    return instrument;
  };
}
