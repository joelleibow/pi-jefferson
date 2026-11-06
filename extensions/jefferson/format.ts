/** The plain-text format language; declarations supply already-formatted values. */
import type { Theme, ThemeStyle } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";

import type { Instrument, InstrumentDeclaration } from "./instrument.ts";

type Readings = Parameters<Instrument["render"]>[0];

export type FormatSegment =
  | { kind: "literal"; text: string }
  | { kind: "variable"; name: string }
  | { kind: "bar" };

const WARNING_PERCENT = 70;
const ERROR_PERCENT = 90;

function collapse(text: string): string {
  return text.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
}

export function parseFormat(declaration: InstrumentDeclaration, format: string): FormatSegment[] {
  const segments: FormatSegment[] = [];
  let literal = "";
  let hasBar = false;
  const flush = (): void => {
    if (literal !== "") segments.push({ kind: "literal", text: collapse(literal) });
    literal = "";
  };
  for (let index = 0; index < format.length; index++) {
    const character = format[index]!;
    if (character === "\\" && format[index + 1] === "$") {
      literal += "$";
      index++;
    } else if (character === "$") {
      const name = format.slice(index + 1).match(/^[A-Za-z0-9_]+/)?.[0];
      if (name === undefined) {
        throw new Error(`${JSON.stringify(declaration.name)}'s format has a bare $; escape a literal dollar as \\$`);
      }
      const declared = name === "bar" ? declaration.bar !== undefined : Object.hasOwn(declaration.variables, name);
      if (!declared) {
        throw new Error(`${JSON.stringify(declaration.name)}'s format names a variable it does not declare: ${JSON.stringify("$" + name)}`);
      }
      flush();
      if (name === "bar") {
        if (hasBar) throw new Error(`${JSON.stringify(declaration.name)}'s format names a second width-taking variable: "$bar"`);
        hasBar = true;
        segments.push({ kind: "bar" });
      } else {
        segments.push({ kind: "variable", name });
      }
      index += name.length;
    } else {
      literal += character;
    }
  }
  flush();
  return segments;
}

function styledPiece(text: string, style: ThemeStyle, theme: Theme): string {
  if (text === "") return "";
  return Object.keys(style).length === 0 ? text : theme.style(text, style);
}

export function resolveFormat(
  declaration: InstrumentDeclaration,
  segments: FormatSegment[],
  style: ThemeStyle,
  readings: Readings,
  width: number,
  theme: Theme,
): string {
  const values = new Map<string, string>();
  for (const [name, resolve] of Object.entries(declaration.variables)) {
    const value = resolve(readings);
    if (value === undefined) return "";
    values.set(name, collapse(value));
  }
  const pieces = segments.map(segment => segment.kind === "bar" ? "" : segment.kind === "literal" ? segment.text : values.get(segment.name)!);
  let bar = "";
  if (segments.some(segment => segment.kind === "bar")) {
    const nonBar = pieces.reduce((sum, piece) => sum + visibleWidth(piece), 0);
    const barWidth = Math.max(0, width - nonBar);
    const percent = declaration.bar!(readings);
    const filled = percent === null ? 0 : Math.min(barWidth, Math.floor((percent / 100) * barWidth));
    const filledStyle: ThemeStyle = percent !== null && percent > ERROR_PERCENT ? { ...style, fg: "error" }
      : percent !== null && percent > WARNING_PERCENT ? { ...style, fg: "warning" } : style;
    bar = styledPiece("█".repeat(filled), filledStyle, theme)
      + styledPiece("░".repeat(barWidth - filled), { ...style, dim: true }, theme);
  }
  return segments.map((segment, index) => segment.kind === "bar" ? bar : styledPiece(pieces[index]!, style, theme)).join("");
}
