/** The format language: literal text, $variables and |modifiers; declarations supply already-formatted values. */
import type { Theme, ThemeColor, ThemeStyle } from "@earendil-works/pi-coding-agent";
import { parseColor, visibleWidth } from "@earendil-works/pi-tui";
import toLower from "lodash-es/toLower.js";
import toUpper from "lodash-es/toUpper.js";
import upperFirst from "lodash-es/upperFirst.js";

import { drawBar } from "./components/visuals/bar.ts";
import type { InstrumentDeclaration } from "./components/instruments/instrument.ts";
import type { Readings } from "./data/session-data-store.ts";

export type FormatSegment =
  | { kind: "literal"; text: string; modifiers: readonly Modifier[]; colour?: ThemeColor }
  | { kind: "variable"; name: string; form?: string; modifiers: readonly Modifier[]; colour?: ThemeColor }
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

export function collapse(text: string): string {
  return text.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
}

/**
 * A parse fault, without the instrument's name: the reader names the instrument as the document
 * wrote the key, as it already does for a style the theme refuses (design 5; RD-01).
 */
function formatError(detail: string): Error {
  return new Error(`format ${detail}`);
}

/**
 * Parse a format against the declaration's variables, or in plain mode against a composed
 * format set's values. A plain format carries no modifier and no form: its text is one colour,
 * styled at the cell. The check answers what a `|name` may be beyond Jefferson's own names.
 */
export function parseFormat(
  declaration: InstrumentDeclaration, format: string, check: ForegroundCheck, plain = false,
): FormatSegment[] {
  // A format's outer whitespace is not text (ADR 0006); collapse first so a trailing control character becomes a space the trim removes.
  format = collapse(format).trim();
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
    // A backslash yields the character after it, whatever it is, so `\$`, `\|` and `\m` render
    // `$`, `|` and `m`; a trailing backslash has no character after it and stays itself.
    if (character === "\\" && format[index + 1] !== undefined) {
      literal += format[index + 1];
      afterName = false;
      index++;
    } else if (character === "$") {
      const name = format.slice(index + 1).match(/^[A-Za-z0-9_]+/)?.[0];
      if (name === undefined) {
        throw formatError("has a bare $; escape a literal dollar as \\$");
      }
      const declared = plain
        ? declaration.composed !== undefined && Object.hasOwn(declaration.composed.variables, name)
        : name === "bar" ? declaration.bar !== undefined : Object.hasOwn(declaration.variables, name);
      if (!declared) {
        throw formatError(`names a variable it does not declare: ${JSON.stringify("$" + name)}`);
      }
      flush();
      if (name === "bar") {
        if (hasBar) throw formatError('names a second width-taking variable: "$bar"');
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
        if (plain) throw formatError(`puts a modifier in a plain format: ${JSON.stringify("|" + name)}`);
        // A key the provider chose is its own: a variable named for an `Object.prototype` member has
        // no forms, and a form nobody declared is no form.
        const allForms = declaration.variableForms;
        const forms = subject?.kind === "variable" && allForms !== undefined && Object.hasOwn(allForms, subject.name)
          ? allForms[subject.name] : undefined;
        // A form comes first after its variable, once; anywhere else the name is no form, and
        // the modifier table decides whether the document is rejected.
        if (afterName && subject?.kind === "variable" && subject.form === undefined
          && subject.colour === undefined
          && subject.modifiers.length === 0 && forms !== undefined && Object.hasOwn(forms, name)) {
          segments[segments.length - 1] = { ...subject, form: name };
        } else {
          // Jefferson's own names come before the theme, so `|dim` keeps its meaning where the theme
          // also carries a `dim` colour, and a later pipe name joins the reserved set by joining the
          // table (owner-rulings.md, 2026-11-24).
          const modifier = MODIFIERS.get(name);
          const colour = modifier === undefined && check(name) ? name : undefined;
          if (modifier === undefined && colour === undefined) {
            throw formatError(
              `names neither a modifier Jefferson implements nor a foreground colour of the theme: ${JSON.stringify("|" + name)}`,
            );
          }
          if (afterName && subject !== undefined) {
            if (subject.kind === "bar") {
              throw formatError(`puts a modifier on "$bar": ${JSON.stringify("|" + name)}`);
            }
            if (modifier !== undefined) segments[segments.length - 1] = { ...subject, modifiers: [...subject.modifiers, modifier] };
            else if (colour !== undefined) segments[segments.length - 1] = { ...subject, colour };
          } else {
            const text = collapse(literal);
            const run = text.match(/\S+$/)?.[0];
            if (run === undefined) {
              throw formatError(`has a modifier with nothing before it: ${JSON.stringify("|" + name)}`);
            }
            const prefix = text.slice(0, text.length - run.length);
            if (prefix !== "") segments.push({ kind: "literal", text: prefix, modifiers: [] });
            segments.push({
              kind: "literal", text: run, modifiers: modifier === undefined ? [] : [modifier],
              ...(colour === undefined ? {} : { colour }),
            });
            literal = "";
          }
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

/** Whether a name is a foreground colour of the theme it was built from. */
export type ForegroundCheck = (name: string) => name is ThemeColor;

/**
 * The one foreground probe: a name is a colour of this theme when its accessor answers, and not when
 * it throws. pi publishes no list of its names, so the theme itself is asked, at the pin through
 * `getFgAnsi` alone (`theme.js:212-216`, `:234`); every theme pi loads carries the same 49 names,
 * which needs no guard at render (design, "The theme's name set is invariant at the pin").
 */
export function foregroundCheck(theme: Theme): ForegroundCheck {
  return (name: string): name is ThemeColor => {
    try {
      theme.getFgAnsi(name as Parameters<Theme["getFgAnsi"]>[0]);
      return true;
    } catch {
      return false;
    }
  };
}

/**
 * Validate one style-shaped option and answer it as the theme styles it. The option's name is the
 * caller's, so a `fill` fault names `fill` and never "style" (design DEC-14).
 */
export function validateStyle(raw: unknown, theme: Theme, option: "style" | "fill" = "style"): ThemeStyle {
  if (raw === undefined) return {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`has a ${option} that is not an object`);
  }
  const isForeground = foregroundCheck(theme);
  /** The background half of the same question: only a style's `bg` asks it, never a `|name`. */
  const isBackground = (name: string): boolean => {
    try {
      theme.getBgAnsi(name as Parameters<Theme["getBgAnsi"]>[0]);
      return true;
    } catch {
      return false;
    }
  };
  const validated: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!Object.hasOwn(STYLE_KEYS, key)) {
      throw new Error(`has a ${option} key that pi's ThemeStyle does not have: ${JSON.stringify(key)}`);
    }
    if (key === "fg" || key === "bg") {
      // A name of this key's own slot is kept as the name; anything else may still be a concrete
      // colour, which only pi's parser can accept.
      if (typeof value === "string" && (key === "fg" ? isForeground(value) : isBackground(value))) {
        validated[key] = value;
        continue;
      }
      const message = `has a ${option} whose ${key} is neither a ${key === "fg" ? "foreground" : "background"}-slot theme token nor a color pi's parser accepts: ${JSON.stringify(value)}`;
      if (typeof value !== "string" && typeof value !== "number") throw new Error(message);
      try {
        validated[key] = parseColor(value);
      } catch {
        throw new Error(message);
      }
    } else {
      if (typeof value !== "boolean") {
        throw new Error(`has a ${option} attribute that is not a boolean: ${JSON.stringify(key)}`);
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

/** A plain format's text: each literal and value joined, an absent value as nothing. */
export function resolvePlain(
  declaration: InstrumentDeclaration,
  segments: FormatSegment[],
  readings: Readings,
): string {
  const composed = declaration.composed;
  if (composed === undefined) return "";
  return segments.map(segment => {
    if (segment.kind === "bar") return "";
    if (segment.kind === "literal") return segment.text;
    const value = composed.variables[segment.name]?.(readings);
    return value === undefined ? "" : collapse(value);
  }).join("");
}

export function resolveFormat(
  declaration: InstrumentDeclaration,
  segments: FormatSegment[],
  style: ThemeStyle,
  readings: Readings,
  width: number,
  theme: Theme,
  preResolved?: Readonly<Record<string, string>>,
  bar?: { readonly reading: number | null | undefined; readonly fill: ThemeStyle },
): string {
  // Only what the format names is resolved, so only that can blank the instrument: a declared
  // variable the format leaves out has no bearing on this render (owner-rulings.md, 2026-11-16).
  const values = new Map<string, string>();
  const formValues = new Map<string, string>();
  for (const segment of segments) {
    if (segment.kind !== "variable") continue;
    if (segment.form === undefined) {
      if (values.has(segment.name)) continue;
      const value = preResolved !== undefined && Object.hasOwn(preResolved, segment.name)
        ? preResolved[segment.name]
        : declaration.variables[segment.name]?.(readings);
      if (value === undefined) return "";
      values.set(segment.name, collapse(value));
    } else {
      // A form is another reading of the same datum, and unknown when its own resolver says so.
      const key = `${segment.name}|${segment.form}`;
      if (formValues.has(key)) continue;
      const value = declaration.variableForms?.[segment.name]?.[segment.form]?.(readings);
      if (value === undefined) return "";
      formValues.set(key, collapse(value));
    }
  }
  // The text a variable arrived as, before any modifier changed it: the token reads this one.
  const arrived = segments.map(segment => {
    if (segment.kind === "bar") return "";
    return segment.kind === "literal" ? segment.text : segment.form === undefined
      ? values.get(segment.name)!
      : formValues.get(`${segment.name}|${segment.form}`)!;
  });
  const pieces = segments.map((segment, index) => segment.kind === "bar" ? ""
    : segment.modifiers.reduce((piece, modifier) => "mutate" in modifier ? modifier.mutate(piece) : piece, arrived[index]!));
  // `$bar` is a variable the format names, so its unknown blanks the instrument as any other's does.
  // The reading and the fill are the state in force's, handed by the binding: this file asks the
  // declaration for neither (design DEC-6, "The drawing path").
  let drawn = "";
  if (segments.some(segment => segment.kind === "bar")) {
    const percent = bar?.reading;
    if (percent === undefined) return "";
    const nonBar = pieces.reduce((sum, piece) => sum + visibleWidth(piece), 0);
    const barWidth = Math.max(0, width - nonBar);
    drawn = drawBar(barWidth, percent, style, bar!.fill)
      .map(part => styledPiece(part.text, part.style, theme))
      .join("");
  }
  return segments.map((segment, index) => {
    if (segment.kind === "bar") return drawn;
    const merged = mergedStyle(style, segment.modifiers);
    // The format's own colour is the strongest, so the declared token is asked only for a piece the
    // format does not colour: a provider's colour function the user's format covers never runs, and
    // a colour it would have thrown about is never reported (owner-rulings.md, 2026-11-24).
    const colours = declaration.variableFg;
    const declared = segment.kind === "variable" && colours !== undefined && Object.hasOwn(colours, segment.name)
      ? colours[segment.name]!
      : undefined;
    const token = segment.colour === undefined && declared !== undefined ? declared(arrived[index]!, theme) : undefined;
    const foreground = segment.colour ?? token;
    return styledPiece(pieces[index]!, foreground === undefined ? merged : { ...merged, fg: foreground }, theme);
  }).join("");
}
