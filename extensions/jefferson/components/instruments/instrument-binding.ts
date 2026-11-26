/** Binds a configured format and style to an instrument declaration: the instrument that renders. */
import type { Theme, ThemeColor, ThemeStyle } from "@earendil-works/pi-coding-agent";

import { BAR_OPTIONS, FOUNDATIONAL_OPTIONS, type Instrument, type InstrumentDeclaration } from "./instrument.ts";
import { DEFAULT_THRESHOLDS, layerThreshold, stateAt, type Threshold } from "../../thresholds.ts";
import { timed } from "../visuals/timed.ts";
import {
  collapse, foregroundCheck, parseFormat, resolveFormat, resolvePlain, type ForegroundCheck, type FormatSegment,
} from "../../format.ts";
import type { Readings } from "../../data/session-data-store.ts";
import type { FieldValue, ReadingsView } from "../../data/field-value.ts";
import type { Fault } from "../../faults.ts";
import type { ProvidedDeclaration } from "../../instrument-contract.ts";

export type BindInstrument = (declaration: InstrumentDeclaration) => Instrument;

/**
 * The row's instrument, plus the top-level state's `fills` fixed at bind: the geometry a provided
 * instrument keeps when its own render throws, since it needs no reading to answer
 * (`design.md` `### Contracts`). Not exported: `containProvided` is its one reader, and the row
 * never carries it.
 */
interface BoundInstrument extends Instrument {
  readonly topLevelFills: boolean;
}

/** One settings object, the top level's or a threshold's: what the document wrote, and nothing more. */
export type InstrumentSettings = Omit<ConfiguredInstrument, "thresholds">;

/**
 * What the document wrote for one instrument: the top level's settings, and the honoured threshold
 * list. `segments` and `style` are absent when the document wrote neither, so the top level and every
 * threshold share one shape and the binding's defaults complete it (`design.md` `### Contracts`).
 */
export interface ConfiguredInstrument {
  segments?: FormatSegment[];
  style?: ThemeStyle;
  label?: string;
  /** A composed format set's configured text, by key; the declaration's defaults fill the rest. */
  formats?: Record<string, FormatSegment[]>;
  /** The top-level fill after validation, layered on the style for the bar's filled columns. */
  fill?: ThemeStyle;
  /**
   * The reader's honoured list, stored as it is: sorted ascending, at most four, none above 100.
   * Absent means the defaults, and an empty list means no threshold at all (design DEC-2).
   */
  thresholds?: readonly Threshold<InstrumentSettings>[];
}

/**
 * One state of an instrument, bound once when the instrument is bound: what its render reads, with
 * nothing re-derived per frame (design DEC-4). At most five exist per instrument.
 */
interface BoundState {
  readonly segments: FormatSegment[];
  readonly style: ThemeStyle;
  readonly fill: ThemeStyle;
  readonly fills: boolean;
  readonly composed: InstrumentDeclaration["composed"] | undefined;
  /** Every kind text this state renders, parsed: its own where it wrote one, else the default. */
  readonly plain: Readonly<Record<string, FormatSegment[]>>;
}

/** What choosing a state for one sample answered: the reading and its state, or the throw it raised. */
type Outcome =
  | { readonly kind: "reading"; readonly reading: number | null | undefined; readonly state: BoundState }
  | { readonly kind: "thrown"; readonly error: unknown };

/**
 * The one home of decision 15's `<what>`: one word for each thing a value may be. Both a report that
 * carries the wrong type and a provided function that returns one answer it, so the two rows cannot
 * drift.
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

/** The members a provided declaration may carry beyond the contract's first four. */
type OptionalMember = "fills" | "bar" | "variableForms" | "variableFg" | "composed" | "options";

/** What adapting a provided declaration refuses, in decision 15's row order. */
export type ProvidedRefusal =
  | { refused: "member-unusable"; member: OptionalMember }
  | { refused: "option-unimplemented"; option: string }
  | { refused: "option-without-bar"; option: string }
  | { refused: "formats-without-composed" }
  | { refused: "unparseable-default-format"; message: string }
  | { refused: "label-not-string" }
  | { refused: "resolver-not-function"; variable: string }
  | { refused: "unparseable-composed-format"; kind: string };

/** A JSON object, which is what every member shaped as a map must be. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A map whose every entry is a function. */
function isFunctionMap(value: unknown): boolean {
  return isPlainObject(value) && Object.values(value).every(entry => typeof entry === "function");
}

/**
 * Adapt one provided declaration to a Jefferson declaration over `Readings`, or refuse it. The
 * checks run in the order the guide lists them: the member shapes and option names first, then the
 * default format, the label, the variables, and the composed kinds last.
 *
 * Every function a provider writes runs behind one guard: the call is guarded, a thenable's
 * rejection is observed, and a result outside the member's declared type is a fault recorded once.
 * A fault yields its member's own absent value: for a variable, a form and `bar`, unknown, which
 * blanks the instrument; for a composed value, nothing in its place; for `select`, nothing to
 * compose; for a colour, `undefined`, which is "no colour", so the cell's own style stands
 * (owner-rulings.md, 2026-11-16).
 */
export function adaptProvidedDeclaration(
  name: string,
  declaration: ProvidedDeclaration,
  view: () => ReadingsView,
  record: (fault: Fault) => void,
  check: ForegroundCheck,
): InstrumentDeclaration | ProvidedRefusal {
  // The payload crossed a bus as `unknown`, so its members are read as the values they may be.
  const members = declaration as unknown as Record<string, unknown>;
  const quoted = JSON.stringify(name);

  /** One part, recorded once, and the member's own absent value back. */
  const fault = (member: string, kind: string, detail: string): undefined => {
    record({ scope: name, kind, part: `${quoted} failed to render: its ${member} ${detail}` });
    return undefined;
  };

  /**
   * The provider's call, and only it, inside the guard: classifying what it returned runs outside,
   * so a `then` getter that throws is the outer boundary's to catch (design 10).
   */
  const call = (member: string, run: () => unknown): { value: unknown } | undefined => {
    let value: unknown;
    try {
      value = run();
    } catch {
      return fault(member, "resolver-threw", "threw");
    }
    if ((typeof value === "object" && value !== null || typeof value === "function")
      && typeof (value as { then?: unknown }).then === "function") {
      // The rejection is observed, so a provider's promise cannot take pi down with it.
      (value as { then(onFulfilled: undefined, onRejected: () => void): void }).then(undefined, () => {});
      return fault(member, "resolver-promise", "returned a promise");
    }
    return { value };
  };

  /** A member that must answer text or nothing; `undefined` is unknown, not a fault (M8). */
  const text = (member: string, run: () => unknown): string | undefined => {
    const called = call(member, run);
    if (called === undefined) return undefined;
    if (called.value === undefined || typeof called.value === "string") return called.value;
    return fault(member, "resolver-returned", `returned ${describeValue(called.value)}, where text is declared`);
  };

  // Acceptance checks what binding consumes, before anything reads it: each member's shape, then
  // its option name, then the composed set's own kinds, so a malformed payload is refused with its
  // own row instead of throwing at render (decision 6; owner-rulings.md, 2026-11-16).
  if (members.fills !== undefined && typeof members.fills !== "boolean") {
    return { refused: "member-unusable", member: "fills" };
  }
  if (members.bar !== undefined && typeof members.bar !== "function") {
    return { refused: "member-unusable", member: "bar" };
  }
  if (members.variableForms !== undefined
    && !(isPlainObject(members.variableForms) && Object.values(members.variableForms).every(isFunctionMap))) {
    return { refused: "member-unusable", member: "variableForms" };
  }
  if (members.variableFg !== undefined && !isFunctionMap(members.variableFg)) {
    return { refused: "member-unusable", member: "variableFg" };
  }
  const composedShape = members.composed;
  if (composedShape !== undefined && !(isPlainObject(composedShape)
    && typeof composedShape.variable === "string"
    && isFunctionMap(composedShape.variables)
    && typeof composedShape.select === "function"
    && isPlainObject(composedShape.formats)
    && Object.values(composedShape.formats).every(format => typeof format === "string"))) {
    return { refused: "member-unusable", member: "composed" };
  }
  if (members.options !== undefined
    && !(Array.isArray(members.options) && members.options.every(option => typeof option === "string"))) {
    return { refused: "member-unusable", member: "options" };
  }
  const declaredOptions = (members.options ?? []) as readonly string[];
  for (const option of declaredOptions) {
    // The two bar options reach a declaration that carries `bar` and names them (design DEC-13): a
    // name without a bar offers a setting that could colour nothing, so it is refused as its own
    // kind. `formats` arrives through a composed set, and any other name Jefferson does not
    // implement. The first offending name decides, as written.
    const barOption = (BAR_OPTIONS as readonly string[]).includes(option);
    if (barOption && members.bar === undefined) return { refused: "option-without-bar", option };
    if (!barOption && option !== "formats" && !(FOUNDATIONAL_OPTIONS as readonly string[]).includes(option)) {
      return { refused: "option-unimplemented", option };
    }
  }
  if (declaredOptions.includes("formats") && members.composed === undefined) return { refused: "formats-without-composed" };

  const variables: Record<string, (readings: Readings) => string | undefined> = {};
  for (const [variable, resolver] of Object.entries(members.variables as object)) {
    variables[variable] = () => text("variable", () => (resolver as (readings: ReadingsView) => unknown)(view()));
  }

  const formMembers = members.variableForms as Readonly<Record<string, Readonly<Record<string, unknown>>>> | undefined;
  const variableForms = formMembers === undefined ? undefined : Object.fromEntries(
    Object.entries(formMembers).map(([variable, forms]) => [
      variable,
      Object.fromEntries(Object.entries(forms).map(([form, resolver]) => [
        form,
        () => text("variable", () => (resolver as (readings: ReadingsView) => unknown)(view())),
      ])),
    ]),
  );

  const barMember = members.bar as ((readings: ReadingsView) => unknown) | undefined;
  const bar = barMember === undefined ? undefined : (): number | null | undefined => {
    const called = call("bar", () => barMember(view()));
    if (called === undefined) return undefined;
    const value = called.value;
    if (value === undefined || value === null) return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return fault("bar", "resolver-returned", `returned ${describeValue(value)}, where a finite number or null is declared`);
  };

  const colourMembers = members.variableFg as Readonly<Record<string, (value: string) => unknown>> | undefined;
  const variableFg = colourMembers === undefined ? undefined : Object.fromEntries(
    Object.entries(colourMembers).map(([variable, colour]) => [
      variable,
      (value: string, theme: Theme): ThemeColor | undefined => {
        const called = call("colour", () => colour(value));
        if (called === undefined) return undefined;
        const token = called.value;
        if (token === undefined) return undefined;
        if (typeof token !== "string") {
          return fault("colour", "resolver-returned", `returned ${describeValue(token)}, where a theme colour is declared`);
        }
        // The language's own check, built from the theme this render is handed: the guard answers the
        // names a format does, so pi's `Theme.style` never meets one it would throw on, and the outer
        // boundary never blanks the entry under the wrong part.
        if (!foregroundCheck(theme)(token)) {
          return fault("colour", "resolver-returned", `returned ${JSON.stringify(token)}, where a theme colour is declared`);
        }
        return token;
      },
    ]),
  );

  const composedMember = members.composed as Record<string, unknown> | undefined;
  // Held by reference at acceptance, as every other provided function is (M16).
  const select = composedMember?.select as (readings: ReadingsView) => unknown;
  const composed = composedMember === undefined ? undefined : {
    variable: composedMember.variable as string,
    variables: Object.fromEntries(Object.entries(composedMember.variables as object).map(([key, resolver]) => [
      key,
      () => text("variable", () => (resolver as (readings: ReadingsView) => unknown)(view())),
    ])),
    select: () => text("select", () => select(view())),
    // A copy, so a provider's later change to its own object cannot reach the binding (M16).
    formats: { ...(composedMember.formats as Readonly<Record<string, string>>) },
  };

  const adapted: InstrumentDeclaration = {
    name,
    variables,
    defaultFormat: members.defaultFormat as string,
    ...(members.defaultLabel === undefined ? {} : { defaultLabel: members.defaultLabel as string }),
    ...(variableForms === undefined ? {} : { variableForms }),
    ...(bar === undefined ? {} : { bar }),
    ...(members.fills === undefined ? {} : { fills: members.fills as boolean }),
    ...(variableFg === undefined ? {} : { variableFg }),
    ...(composed === undefined ? {} : { composed }),
    options: Object.freeze([...new Set([...FOUNDATIONAL_OPTIONS, ...((members.options ?? []) as readonly string[])])]),
  };
  try {
    parseFormat(adapted, adapted.defaultFormat, check);
  } catch (error) {
    // The parser's own sentence, carried out so every path a bad name reaches words it alike; by the
    // repository's convention for a caught parse error (configuration.ts:298-301).
    if (!(error instanceof Error)) throw error;
    return { refused: "unparseable-default-format", message: error.message };
  }
  if (members.defaultLabel !== undefined && typeof members.defaultLabel !== "string") return { refused: "label-not-string" };
  for (const [variable, resolver] of Object.entries(members.variables as object)) {
    if (typeof resolver !== "function") return { refused: "resolver-not-function", variable };
  }
  // Last, because a kind's format is parsed against the adapted declaration the checks above accept.
  for (const [kind, format] of Object.entries(adapted.composed?.formats ?? {})) {
    try {
      parseFormat(adapted, format, check, true);
    } catch {
      return { refused: "unparseable-composed-format", kind };
    }
  }
  return adapted;
}

/**
 * The outer boundary around a provided instrument's bound render, for anything the adapter's own
 * guard cannot see. Jefferson's own instruments are never wrapped, so their defects fail the suite
 * (design 10; spec "Provider code costs one entry and no more").
 */
export function containProvided(instrument: BoundInstrument, name: string, record: (fault: Fault) => void): Instrument {
  return {
    fills(readings) {
      // While `fills` runs, the only provider code reached is the `bar` that chooses the state, and
      // the row plans before it renders, so this catch records the sentence the ledger keeps.
      try {
        return instrument.fills(readings);
      } catch {
        record({ scope: name, kind: "resolver-threw", part: `${JSON.stringify(name)} failed to render: its bar threw` });
        return instrument.topLevelFills;
      }
    },
    render(readings, width, theme) {
      try {
        return instrument.render(readings, width, theme);
      } catch {
        record({ scope: name, kind: "resolver-threw", part: `${JSON.stringify(name)} failed to render: its variable threw` });
        return "";
      }
    },
  };
}

export function instrumentBindings(
  check: ForegroundCheck, configured: ReadonlyMap<string, ConfiguredInstrument> = new Map(),
): (declaration: InstrumentDeclaration) => BoundInstrument {
  const bound = new Map<string, BoundInstrument>();
  return declaration => {
    let instrument = bound.get(declaration.name);
    if (instrument === undefined) {
      const entry = configured.get(declaration.name);
      const { thresholds, ...written } = entry ?? {};
      const top: InstrumentSettings = written;

      /** Bind one state's settings as a whole instrument is bound: its own everything (DEC-4). */
      const bindState = (settings: InstrumentSettings): BoundState => {
        const segments = settings.segments ?? parseFormat(declaration, declaration.defaultFormat, check);
        // The label carries no edge whitespace of its own, and one gap stands between it and its
        // content (ADR 0006): the gap is due from the document, and the label's segment holds it so
        // `$bar` counts its column and the label's style covers it.
        const label = collapse(settings.label ?? declaration.defaultLabel ?? "").trim();
        const gap = label !== "" && segments.length > 0 ? " " : "";
        const labelled: FormatSegment[] = label === "" ? segments
          : [{ kind: "literal", text: label + gap, modifiers: [] }, ...segments];
        // Composed only when the format names the composed variable: a variable the format leaves
        // out is never resolved, so its set's functions never run and cannot fault (decision 20).
        const composed = segments.some(segment => segment.kind === "variable" && segment.form === undefined
          && segment.name === declaration.composed?.variable) ? declaration.composed : undefined;
        // A composed declaration's kind formats parse once, at the bind: the state's own where it
        // wrote one, and the declaration's default for every kind it left out.
        const plain: Record<string, FormatSegment[]> = composed === undefined ? {}
          : Object.fromEntries(Object.entries(composed.formats).map(([key, format]) => [
            key,
            settings.formats !== undefined && Object.hasOwn(settings.formats, key)
              ? settings.formats[key]!
              : parseFormat(declaration, format, check, true),
          ]));
        return {
          segments: labelled,
          style: settings.style ?? {},
          fill: settings.fill ?? {},
          // The parse in hand decides it: a `$bar` segment takes whatever columns its cell leaves.
          fills: declaration.fills === true || segments.some(segment => segment.kind === "bar"),
          composed,
          plain,
        };
      };

      const topState = bindState(top);
      // Each honoured threshold is layered on the top level and on no other threshold, then bound.
      const honoured = (thresholds ?? DEFAULT_THRESHOLDS).map(threshold => ({
        activeAt: threshold.activeAt,
        bound: bindState(layerThreshold<InstrumentSettings>(top, threshold.settings)),
      }));
      // Whether the reading can change what renders, decided once here: the top-level format names
      // `$bar`, or an honoured threshold sets an option other than `fill` (design DEC-8). Neither
      // record says who wrote the list, so the defaults follow the same rule.
      const readsBar = topState.segments.some(segment => segment.kind === "bar")
        || (thresholds ?? DEFAULT_THRESHOLDS).some(threshold =>
          Object.keys(threshold.settings).some(key => key !== "fill"));

      // One slot per bound instrument per sample: the reading and the state it chose, or the throw
      // choosing one raised. A call with the same sample answers from it, a new sample replaces it,
      // and it is never cleared (design DEC-6).
      let slot: { readonly readings: Readings; readonly outcome: Outcome } | undefined;
      const atSample = (readings: Readings): Outcome => {
        if (slot !== undefined && slot.readings === readings) return slot.outcome;
        let outcome: Outcome;
        if (!readsBar) {
          outcome = { kind: "reading", reading: undefined, state: topState };
        } else {
          try {
            const reading = declaration.bar!(readings);
            outcome = { kind: "reading", reading, state: stateAt(honoured, reading)?.bound ?? topState };
          } catch (error) {
            outcome = { kind: "thrown", error };
          }
        }
        slot = { readings, outcome };
        return outcome;
      };

      instrument = {
        topLevelFills: topState.fills,
        fills: readings => {
          const outcome = atSample(readings);
          if (outcome.kind === "thrown") throw outcome.error;
          return outcome.state.fills;
        },
        render: (readings, width, renderTheme) => {
          const outcome = atSample(readings);
          if (outcome.kind === "thrown") throw outcome.error;
          const state = outcome.state;
          let preResolved: Record<string, string> | undefined;
          if (state.composed !== undefined) {
            const key = state.composed.select(readings);
            // A key the provider chose is looked up as its own, never through `Object.prototype`: an
            // unknown key composes nothing, and inherited names are not entries at all.
            const chosen = key === undefined ? undefined
              : Object.hasOwn(state.plain, key) ? state.plain[key] : undefined;
            const composedText = chosen === undefined ? "" : resolvePlain(declaration, chosen, readings);
            // A composed set with nothing to compose leaves its place empty, and only a format that
            // names the composed variable is blanked by it: variables are never coupled, so a
            // neighbour's silence cannot take another variable's text with it (owner-rulings.md,
            // 2026-11-16, "Variables are never coupled").
            if (composedText !== "") preResolved = { [state.composed.variable]: composedText };
          }
          // A state whose format names `$bar` is handed the slot's raw reading and its own fill; no
          // other reader of the bar remains (design DEC-6, DEC-8).
          const drawsBar = state.segments.some(segment => segment.kind === "bar");
          const text = resolveFormat(
            declaration, state.segments, state.style, readings, width, renderTheme, preResolved,
            drawsBar ? { reading: outcome.reading, fill: state.fill } : undefined,
          );
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
