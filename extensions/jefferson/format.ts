/** The plain-text format language; declarations supply already-formatted values. */
import type { Theme, ThemeStyle } from "@earendil-works/pi-coding-agent";
import { parseColor, visibleWidth } from "@earendil-works/pi-tui";

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

const STYLE_KEYS = {
  fg: true, bg: true, bold: true, dim: true, italic: true, underline: true, inverse: true, strikethrough: true,
} satisfies Record<keyof ThemeStyle, true>;

export function validateStyle(raw: unknown, theme: Theme): ThemeStyle {
  if (raw === undefined) return {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("has a style that is not an object");
  }
  const validated: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!Object.hasOwn(STYLE_KEYS, key)) {
      throw new Error(`has a style key that pi's ThemeStyle does not have: ${JSON.stringify(key)}`);
    }
    if (key === "fg" || key === "bg") {
      if (typeof value === "string") {
        try {
          if (key === "fg") theme.getFgAnsi(value as Parameters<Theme["getFgAnsi"]>[0]);
          else theme.getBgAnsi(value as Parameters<Theme["getBgAnsi"]>[0]);
          validated[key] = value;
          continue;
        } catch {
          // A non-token may still be a concrete color; only the parser can accept that.
        }
      }
      const message = `has ${key === "fg" ? "an" : "a"} ${key} that is neither a ${key === "fg" ? "foreground" : "background"}-slot theme token nor a color pi's parser accepts: ${JSON.stringify(value)}`;
      if (typeof value !== "string" && typeof value !== "number") throw new Error(message);
      try {
        validated[key] = parseColor(value);
      } catch {
        throw new Error(message);
      }
    } else {
      if (typeof value !== "boolean") {
        throw new Error(`has a style attribute that is not a boolean: ${JSON.stringify(key)}`);
      }
      validated[key] = value;
    }
  }
  return validated as ThemeStyle;
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
