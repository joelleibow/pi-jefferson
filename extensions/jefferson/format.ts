/** The plain-text format language; declarations supply already-formatted values. */
import type { Theme, ThemeStyle } from "@earendil-works/pi-coding-agent";
import { parseColor, visibleWidth } from "@earendil-works/pi-tui";
import { toLower, toUpper, upperFirst } from "lodash-es";

import type { Instrument, InstrumentDeclaration } from "./instrument.ts";

type Readings = Parameters<Instrument["render"]>[0];

export type FormatSegment =
  | { kind: "literal"; text: string; modifiers: readonly Modifier[] }
  | { kind: "variable"; name: string; modifiers: readonly Modifier[] }
  | { kind: "bar" };

type StyleAttribute = Exclude<keyof ThemeStyle, "fg" | "bg">;

type Modifier =
  | { readonly style: StyleAttribute }
  | { readonly mutate: (text: string) => string };

const MODIFIERS: ReadonlyMap<string, Modifier> = new Map<string, Modifier>([
  ["bold", { style: "bold" }],
  ["dim", { style: "dim" }],
  ["italic", { style: "italic" }],
  ["underline", { style: "underline" }],
  ["inverse", { style: "inverse" }],
  ["strikethrough", { style: "strikethrough" }],
  // lodash's `capitalize` lowercases the rest of the string; the ruling is first letter only,
  // which is `upperFirst`. Swapping these two silently breaks owner-rulings.md, 2026-11-06.
  ["capitalize", { mutate: upperFirst }],
  ["upper", { mutate: toUpper }],
  ["lower", { mutate: toLower }],
]);

const WARNING_PERCENT = 70;
const ERROR_PERCENT = 90;

function collapse(text: string): string {
  return text.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
}

function formatError(declaration: InstrumentDeclaration, detail: string): Error {
  return new Error(`${JSON.stringify(declaration.name)}'s format ${detail}`);
}

export function parseFormat(declaration: InstrumentDeclaration, format: string): FormatSegment[] {
  const segments: FormatSegment[] = [];
  let literal = "";
  let hasBar = false;
  let afterName = false;
  const flush = (): void => {
    if (literal !== "") segments.push({ kind: "literal", text: collapse(literal), modifiers: [] });
    literal = "";
  };
  for (let index = 0; index < format.length; index++) {
    const character = format[index]!;
    if (character === "\\" && (format[index + 1] === "$" || format[index + 1] === "|")) {
      literal += format[index + 1];
      afterName = false;
      index++;
    } else if (character === "$") {
      const name = format.slice(index + 1).match(/^[A-Za-z0-9_]+/)?.[0];
      if (name === undefined) {
        throw formatError(declaration, "has a bare $; escape a literal dollar as \\$");
      }
      const declared = name === "bar" ? declaration.bar !== undefined : Object.hasOwn(declaration.variables, name);
      if (!declared) {
        throw formatError(declaration, `names a variable it does not declare: ${JSON.stringify("$" + name)}`);
      }
      flush();
      if (name === "bar") {
        if (hasBar) throw formatError(declaration, 'names a second width-taking variable: "$bar"');
        hasBar = true;
        segments.push({ kind: "bar" });
      } else {
        segments.push({ kind: "variable", name, modifiers: [] });
      }
      index += name.length;
      afterName = true;
    } else if (character === "|") {
      const name = format.slice(index + 1).match(/^[A-Za-z0-9_]+/)?.[0];
      const subject = segments[segments.length - 1];
      if (name === undefined) {
        literal += character;
        afterName = false;
      } else {
        const modifier = MODIFIERS.get(name);
        if (modifier === undefined) {
          throw formatError(declaration, `names a modifier it does not implement: ${JSON.stringify("|" + name)}`);
        }
        if (afterName && subject !== undefined) {
          if (subject.kind === "bar") {
            throw formatError(declaration, `puts a modifier on "$bar": ${JSON.stringify("|" + name)}`);
          }
          segments[segments.length - 1] = { ...subject, modifiers: [...subject.modifiers, modifier] };
        } else {
          const text = collapse(literal);
          const run = text.match(/\S+$/)?.[0];
          if (run === undefined) {
            throw formatError(declaration, `has a modifier with nothing before it: ${JSON.stringify("|" + name)}`);
          }
          const prefix = text.slice(0, text.length - run.length);
          if (prefix !== "") segments.push({ kind: "literal", text: prefix, modifiers: [] });
          segments.push({ kind: "literal", text: run, modifiers: [modifier] });
          literal = "";
        }
        index += name.length;
        afterName = true;
      }
    } else {
      literal += character;
      afterName = false;
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

function mergedStyle(style: ThemeStyle, modifiers: readonly Modifier[]): ThemeStyle {
  return modifiers.reduce(
    (merged, modifier) => "style" in modifier ? { ...merged, [modifier.style]: true } : merged,
    style,
  );
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
  const pieces = segments.map(segment => {
    if (segment.kind === "bar") return "";
    const text = segment.kind === "literal" ? segment.text : values.get(segment.name)!;
    return segment.modifiers.reduce((piece, modifier) => "mutate" in modifier ? modifier.mutate(piece) : piece, text);
  });
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
  return segments.map((segment, index) => segment.kind === "bar" ? bar : styledPiece(pieces[index]!, mergedStyle(style, segment.modifiers), theme)).join("");
}
