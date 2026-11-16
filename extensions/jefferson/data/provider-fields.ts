/**
 * The fields providers declared and the latest value each reported, with every rule about them:
 * the three types, one type per field, the first declaration winning, and the report value check.
 * Store data, so it sits in `data/` and imports nothing outside it (design 11; M25).
 */
import type { FieldType, FieldValue, ReadingsView } from "./field-value.ts";

/** The three types, as one runtime record: a fourth member of `FieldType` fails this line. */
const FIELD_TYPES: Readonly<Record<FieldType, true>> = { string: true, number: true, boolean: true };

/** What a candidate registration's fields have wrong, if anything. `given` is as it was declared. */
export type FieldsFault =
  | { type: "outside"; field: string; given: unknown }
  | { type: "conflict"; field: string; declared: FieldType; given: unknown };

/** What a report has wrong, if anything. `given` is the reported value. */
export type ReportFault =
  | { type: "undeclared" }
  | { type: "wrong-type"; declared: FieldType; given: unknown }
  | { type: "not-finite" };

export interface ProviderFields {
  /** The first wrong field of a candidate declaration, checked without changing anything. */
  checkFields(extension: string, fields: unknown): FieldsFault | undefined;
  /** Add the fields not yet declared: an existing field keeps its type and its reported value. */
  declare(extension: string, fields: Readonly<Record<string, FieldType>>): void;
  /** The first thing wrong with a report, checked against the declared type. */
  checkReport(extension: string, field: string, value: unknown): ReportFault | undefined;
  /** Hold the latest value of a declared field, for that provider's resolvers to read. */
  report(extension: string, field: string, value: FieldValue): void;
  /** One provider's declared fields and their latest values, and no other datum. */
  view(extension: string): ReadingsView;
  /** Drop every provider's fields and values: the session that held them is gone. */
  clear(): void;
}

/** One provider's declaration: each field's type, and the latest value reported for it. */
interface Held {
  readonly types: Map<string, FieldType>;
  readonly values: Map<string, FieldValue>;
}

export function createProviderFields(repaint: () => void): ProviderFields {
  const held = new Map<string, Held>();
  const heldBy = (extension: string): Held => {
    const existing = held.get(extension);
    if (existing !== undefined) return existing;
    const created: Held = { types: new Map(), values: new Map() };
    held.set(extension, created);
    return created;
  };
  return {
    checkFields(extension, fields) {
      if (fields === undefined) return undefined;
      if (typeof fields !== "object" || fields === null || Array.isArray(fields)) {
        return { type: "outside", field: "fields", given: fields };
      }
      const declared = held.get(extension);
      for (const [field, given] of Object.entries(fields)) {
        if (typeof given !== "string" || !Object.hasOwn(FIELD_TYPES, given)) {
          return { type: "outside", field, given };
        }
        const earlier = declared?.types.get(field);
        if (earlier !== undefined && earlier !== given) return { type: "conflict", field, declared: earlier, given };
      }
      return undefined;
    },
    declare(extension, fields) {
      const target = heldBy(extension);
      for (const [field, type] of Object.entries(fields)) {
        if (!target.types.has(field)) target.types.set(field, type);
      }
    },
    checkReport(extension, field, value) {
      const type = held.get(extension)?.types.get(field);
      if (type === undefined) return { type: "undeclared" };
      if (type === "number") {
        if (typeof value !== "number") return { type: "wrong-type", declared: type, given: value };
        return Number.isFinite(value) ? undefined : { type: "not-finite" };
      }
      return typeof value === type ? undefined : { type: "wrong-type", declared: type, given: value };
    },
    report(extension, field, value) {
      const target = heldBy(extension);
      // Reporting what is already held costs no render; a change asks for the one that shows it.
      const changed = target.values.get(field) !== value;
      target.values.set(field, value);
      if (changed) repaint();
    },
    view(extension) {
      const target = held.get(extension);
      const view: Record<string, FieldValue | undefined> = {};
      if (target === undefined) return view;
      // Every declared field is in the view, reported or not: unreported reads unknown, which is
      // `undefined` and never an empty string, zero or false.
      for (const field of target.types.keys()) view[field] = target.values.get(field);
      return view;
    },
    clear() {
      held.clear();
    },
  };
}
