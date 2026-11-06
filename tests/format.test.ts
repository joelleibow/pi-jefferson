import assert from "node:assert/strict";
import { test } from "node:test";

import type { Theme, ThemeStyle } from "@earendil-works/pi-coding-agent";
import { parseColor, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";

import { parseFormat, resolveFormat, validateStyle } from "../extensions/jefferson/format.ts";
import { instrumentNamed, type InstrumentDeclaration } from "../extensions/jefferson/instrument.ts";
import { createFooter } from "../extensions/jefferson/row-renderer.ts";
import type { Readings } from "../extensions/jefferson/session-data-store.ts";
import { fakeTheme } from "./fake-theme.ts";

const seed: Readings = {
  provider: "anthropic", model: "claude-opus-4", thinkingLevel: "high",
  cwd: "/Users/joelleibow/Projects/pi-jefferson",
  contextUsage: { tokens: 86400, percent: 43.2, contextWindow: 200000 },
  totals: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
};

function named(name: string): InstrumentDeclaration {
  const declaration = instrumentNamed(name);
  assert.ok(declaration);
  return declaration;
}

function rendered(name: string, format: string, options: {
  readings?: Readings; width?: number; style?: ThemeStyle; theme?: Theme;
} = {}): string {
  const declaration = named(name);
  return resolveFormat(declaration, parseFormat(declaration, format), options.style ?? {}, options.readings ?? seed, options.width ?? 80, options.theme ?? fakeTheme());
}

test("an escaped dollar is literal text, not a variable", () => {
  assert.equal(rendered("model", "\\$"), "$");
  assert.equal(rendered("model", "\\$bar"), "$bar");
});

test("brackets and parentheses are literal text rather than groups", () => {
  assert.equal(rendered("model", "[a](b)"), "[a](b)");
});

test("Markdown characters in formats and values remain literal", () => {
  assert.equal(rendered("model", "**bold**"), "**bold**");
  assert.equal(rendered("model", "$model", { readings: { ...seed, model: "**bold**" } }), "**bold**");
});

test("an unknown variable rejects naming the instrument and variable", () => {
  assert.throws(() => parseFormat(named("model"), "$nope"), { message: '"model"\'s format names a variable it does not declare: "$nope"' });
});

test("bar is rejected when the declaration has no width-taking variable", () => {
  assert.throws(() => parseFormat(named("model"), "$bar"), { message: '"model"\'s format names a variable it does not declare: "$bar"' });
  assert.throws(() => parseFormat(named("blank"), "$anything"), { message: '"blank"\'s format names a variable it does not declare: "$anything"' });
});

test("a second bar rejects naming the second width-taking variable", () => {
  assert.throws(() => parseFormat(named("context"), "$bar $bar"), { message: '"context"\'s format names a second width-taking variable: "$bar"' });
});

test("a bare dollar rejects with the literal-dollar escape in the message", () => {
  for (const format of ["$", "cost: $!"]) {
    assert.throws(() => parseFormat(named("model"), format), { message: '"model"\'s format has a bare $; escape a literal dollar as \\$' });
  }
});

test("variable names consume the maximal alphanumeric and underscore run", () => {
  for (const name of ["modelName", "_x", "1model"]) {
    assert.throws(() => parseFormat(named("model"), `$${name}`), { message: `"model"'s format names a variable it does not declare: "$${name}"` });
  }
});

test("an empty format has no segments and renders empty text", () => {
  assert.deepEqual(parseFormat(named("model"), ""), []);
  assert.equal(rendered("model", ""), "");
});

test("a trailing backslash is literal", () => {
  assert.equal(rendered("model", "tail\\"), "tail\\");
});

const cellStyle: ThemeStyle = { fg: "accent", bg: "selectedBg", bold: true };

function pressure(percent: number | null): Readings {
  return { ...seed, contextUsage: { tokens: percent === null ? null : 86400, percent, contextWindow: 200000 } };
}

test("bar takes the fourteen columns left by six columns of prose", () => {
  const theme = fakeTheme();
  assert.equal(rendered("context", "$percent $bar", { width: 20, theme }),
    "43.2% " + "█".repeat(6) + theme.style("░".repeat(8), { dim: true }));
  assert.equal(visibleWidth(rendered("context", "😀$bar", { width: 6 })), 6);
});

test("a bar with no room contributes no track or escapes and leaves prose for the cell to clip", () => {
  const theme = fakeTheme();
  assert.equal(rendered("context", "fixed$bar", { width: 5, style: cellStyle, theme }), theme.style("fixed", cellStyle));
  assert.equal(rendered("context", "fixed$bar", { width: 2 }), "fixed");
  assert.equal(rendered("context", "$bar", { width: 0, style: cellStyle }), "");
});

test("bar placement styles each prose segment so trailing prose keeps its configured style", () => {
  const theme = fakeTheme();
  const expected = theme.style("[", cellStyle)
    + theme.style("█".repeat(5), cellStyle)
    + theme.style("░".repeat(7), { ...cellStyle, dim: true })
    + theme.style("] ", cellStyle)
    + theme.style("43.2%", cellStyle);
  assert.equal(rendered("context", "[$bar] $percent", { width: 20, style: cellStyle, theme }), expected);
});

test("bar thresholds replace only foreground above seventy and ninety", () => {
  const theme = fakeTheme();
  for (const [percent, fg, filled] of [[70, "accent", 7], [70.1, "warning", 7], [90, "warning", 9], [90.1, "error", 9]] as const) {
    const expected = theme.style("█".repeat(filled), { ...cellStyle, fg })
      + theme.style("░".repeat(10 - filled), { ...cellStyle, dim: true });
    assert.equal(rendered("context", "$bar", { width: 10, readings: pressure(percent), style: cellStyle, theme }), expected, String(percent));
  }
});

test("a null estimate draws an entirely dim track beside the unknown estimate", () => {
  const theme = fakeTheme();
  const text = rendered("context", "$percent/$window $bar", { width: 20, readings: pressure(null), style: cellStyle, theme });
  assert.equal(stripTerminalSequences(text), "?/200k " + "░".repeat(13));
  assert.ok(text.endsWith(theme.style("░".repeat(13), { ...cellStyle, dim: true })));
});

test("bar-only formats fill their cell with clamped and floored pressure", () => {
  const theme = fakeTheme();
  assert.equal(rendered("context", "$bar", { width: 10, readings: pressure(0), theme }), theme.style("░".repeat(10), { dim: true }));
  for (const percent of [100, 150]) {
    assert.equal(rendered("context", "$bar", { width: 10, readings: pressure(percent), theme }), theme.style("█".repeat(10), { fg: "error" }));
  }
  assert.equal(rendered("context", "$bar", { width: 10, readings: pressure(25), theme }), "██" + theme.style("░".repeat(8), { dim: true }));
});

test("control characters collapse per character in literals and substituted values", () => {
  const controls = "\r\n\t\u007f\u009b";
  assert.deepEqual(parseFormat(named("model"), `L${controls}R`), [{ kind: "literal", text: "L     R", modifiers: [] }]);
  assert.equal(rendered("model", `$model`, { readings: { ...seed, model: `L${controls}R` } }), "L     R");
  assert.equal(rendered("model", "$model", { readings: { ...seed, model: controls } }), "     ");
});

test("formats and data carrying controls keep three clipped footer rows at one line each", () => {
  const declaration = named("model");
  const segments = parseFormat(declaration, "L\n$model");
  let readings = { ...seed, model: "a\r\t\x1bb" };
  const instrument = { render: (r: Readings, width: number, theme: Theme) => resolveFormat(declaration, segments, {}, r, width, theme) };
  const footer = createFooter([0, 1, 2].map(index => ({ id: `row-${index}`, cells: [{ instrument, align: "left" }] })), () => readings, fakeTheme());
  const lines = footer.render(6);
  assert.equal(lines.length, 3);
  for (const line of lines) {
    assert.equal(stripTerminalSequences(line), "L a...");
    assert.equal(visibleWidth(line), 6);
    assert.equal(line.includes("\n"), false);
  }
  readings = { ...seed, model: "\r\n\t\u007f\u009b" };
  for (const line of footer.render(3)) {
    assert.equal(stripTerminalSequences(line), "...");
    assert.equal(visibleWidth(line), 3);
  }
});

test("collapse runs before styling so data ESC becomes a space and the cell's SGR survives", () => {
  const theme = fakeTheme();
  const style: ThemeStyle = { fg: "accent" };
  const text = rendered("model", "$model", { readings: { ...seed, model: "m\x1b[31mx" }, style, theme });
  assert.equal(text, theme.style("m [31mx", style));
  assert.ok(text.includes(theme.getFgAnsi("accent")));
  assert.equal(text.includes("\x1b[31m"), false);
  assert.equal(text.includes(theme.getFgAnsi("accent").replace("\x1b", " ")), false);
});

test("inherited object properties are unknown format variables", () => {
  for (const name of ["toString", "constructor", "hasOwnProperty", "valueOf"]) {
    assert.throws(() => parseFormat(named("model"), `$${name}`), { message: `"model"'s format names a variable it does not declare: "$${name}"` });
  }
});

test("a variables record with no prototype uses the same own-property rule", () => {
  const declaration: InstrumentDeclaration = {
    name: "fixture", defaultFormat: "$value", options: [],
    variables: Object.assign(Object.create(null), { value: () => "known" }),
  };
  assert.equal(resolveFormat(declaration, parseFormat(declaration, "$value"), {}, seed, 80, fakeTheme()), "known");
  assert.throws(() => parseFormat(declaration, "$constructor"), { message: '"fixture"\'s format names a variable it does not declare: "$constructor"' });
});

test("style validation keeps slot tokens as strings and parses concrete colors once", () => {
  const theme = fakeTheme();
  assert.deepEqual(validateStyle(undefined, theme), {});
  assert.deepEqual(validateStyle({}, theme), {});
  assert.deepEqual(validateStyle({ fg: "accent", bg: "selectedBg" }, theme), { fg: "accent", bg: "selectedBg" });
  for (const value of ["#bf5700", 42, "oklch(70% 0.1 150)", "okhsl(150 80% 60%)"]) {
    assert.deepEqual(validateStyle({ fg: value, bg: value }, theme), { fg: parseColor(value), bg: parseColor(value) });
  }
});

test("style validation rejects wrong slots and invalid values at its own boundary", () => {
  const theme = fakeTheme();
  for (const [key, value] of [["fg", "selectedBg"], ["bg", "accent"], ["fg", "nope"], ["fg", {}], ["fg", true], ["fg", null], ["fg", 256], ["bg", 1.5]] as const) {
    assert.throws(() => validateStyle({ [key]: value }, theme), (error: unknown) => error instanceof Error && error.message.includes(JSON.stringify(value)));
  }
});

for (const [key, message] of [
  ["fg", 'has an fg that is neither a foreground-slot theme token nor a color pi\'s parser accepts: ["#bf5700"]'],
  ["bg", 'has a bg that is neither a background-slot theme token nor a color pi\'s parser accepts: ["#bf5700"]'],
] as const) {
  test(`style validation rejects an array-valued ${key} with its exact fragment`, () => {
    assert.throws(() => validateStyle({ [key]: ["#bf5700"] }, fakeTheme()), { message });
  });
}

const ATTRIBUTES = {
  bold: true, dim: true, italic: true, underline: true, inverse: true, strikethrough: true,
} satisfies Record<Exclude<keyof ThemeStyle, "fg" | "bg">, true>;

test("every shipped modifier name parses", () => {
  for (const name of [...Object.keys(ATTRIBUTES), "capitalize", "upper", "lower"]) {
    assert.doesNotThrow(() => parseFormat(named("model"), `$model|${name}`), name);
  }
});

test("an unknown modifier rejects naming the instrument and the modifier", () => {
  for (const name of ["bd", "accent", "fg"]) {
    assert.throws(() => parseFormat(named("model"), `$model|${name}`),
      { message: `"model"'s format names a modifier it does not implement: "|${name}"` });
  }
});

test("a modifier after an undeclared variable reports the variable, not the modifier", () => {
  assert.throws(() => parseFormat(named("model"), "$nope|bold"),
    { message: '"model"\'s format names a variable it does not declare: "$nope"' });
});

function occurrences(text: string, sequence: string): number {
  return text.split(sequence).length - 1;
}

test("each style modifier styles the value through one theme.style call", () => {
  for (const key of Object.keys(ATTRIBUTES)) {
    const theme = fakeTheme();
    assert.equal(rendered("model", `$model|${key}`, { theme }), theme.style("claude-opus-4", { [key]: true }), key);
  }
});

test("a modifier sets an attribute its instrument's style sets off", () => {
  const theme = fakeTheme();
  assert.equal(rendered("model", "$model|bold", { style: { bold: false }, theme }),
    theme.style("claude-opus-4", { bold: true }));
});

test("a modifier merges into the instrument's style rather than wrapping it", () => {
  const theme = fakeTheme();
  assert.equal(occurrences(rendered("model", "$model|bold", { theme }), "\x1b[1m"), 1);
  assert.equal(occurrences(rendered("model", "$model|dim", { style: { bold: true }, theme }), "\x1b[22m"), 1);
});

test("a chain extends the same segment rather than starting a new one", () => {
  const theme = fakeTheme();
  const segments = parseFormat(named("model"), "$provider|bold|underline");
  assert.equal(segments.length, 1);
  assert.equal(segments.flatMap(segment => segment.kind === "bar" ? [] : segment.modifiers).length, 2);
  assert.equal(rendered("model", "$provider|bold|underline", { theme }),
    theme.style("anthropic", { bold: true, underline: true }));
  assert.equal(occurrences(rendered("model", "$model|bold|bold", { theme }), "\x1b[1m"), 1);
});

function countingTheme(): { theme: Theme; styleCalls: () => number } {
  const base = fakeTheme();
  let calls = 0;
  return {
    theme: { ...base, style: (text: string, options: ThemeStyle) => { calls++; return base.style(text, options); } } as Theme,
    styleCalls: () => calls,
  };
}

test("no modifier and no configured style makes no style call", () => {
  const { theme, styleCalls } = countingTheme();
  assert.equal(rendered("model", "$model", { theme }), "claude-opus-4");
  assert.equal(styleCalls(), 0);
});

test("a value the format does not mutate renders character for character", () => {
  assert.equal(rendered("model", "$model", { readings: { ...seed, model: "hELLO wORLD" } }), "hELLO wORLD");
});

test("a pipe no name follows is literal text", () => {
  assert.equal(rendered("model", "$model | $provider"), "claude-opus-4 | anthropic");
  assert.equal(rendered("model", "$model|"), "claude-opus-4|");
  const theme = fakeTheme();
  assert.equal(rendered("model", "$model|bold", { theme }), theme.style("claude-opus-4", { bold: true }));
});

test("a pipe followed by a dollar, a pipe or punctuation stays literal", () => {
  assert.equal(rendered("model", "$model|$provider"), "claude-opus-4|anthropic");
  assert.equal(rendered("model", "$model||$provider"), "claude-opus-4||anthropic");
  assert.equal(rendered("model", "$model|."), "claude-opus-4|.");
});

test("an escaped pipe is a literal pipe and starts no modifier", () => {
  assert.equal(rendered("model", "a\\|b"), "a|b");
  assert.equal(rendered("model", "\\|bold"), "|bold");
});
