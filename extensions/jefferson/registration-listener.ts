/**
 * The bus boundary: subscribes the channels a provider posts on, emits Jefferson's own payload,
 * validates every registration, and hands what passes to the registry and the field holding. The
 * only file that calls `on` or `emit` on the bus, and the only one that writes the two channel
 * strings at runtime (design 6, 7; G3).
 */
import type { EventBus } from "@earendil-works/pi-coding-agent";

import { adaptProvidedDeclaration, describeValue } from "./components/instruments/instrument-binding.ts";
import type { InstrumentDeclaration } from "./components/instruments/instrument.ts";
import type { FieldType, FieldValue } from "./data/field-value.ts";
import type { ProviderFields } from "./data/provider-fields.ts";
import type { Fault, FaultLedger } from "./faults.ts";
import type { ProvidedDeclaration, RegistrationChannel, UpdateChannel } from "./instrument-contract.ts";
import { isProvidedName, type Registry } from "./registration.ts";

// The contract is types-only, so the spelling lives here, against the contract's literal type:
// a misspelling fails `pnpm typecheck` (G3).
const REGISTRATION = "jefferson:registration" satisfies RegistrationChannel;
const UPDATE = "jefferson:update" satisfies UpdateChannel;

/** Jefferson's own payload: the one registration the identity check accepts for `jefferson`. */
type OwnRegistration = { extension: "jefferson"; instruments: readonly InstrumentDeclaration[] };

/**
 * The scope a payload with no extension name reports under. Only the four kinds a payload with no
 * extension name takes report under it, so no provider's fault dedupes against it (decision 7).
 */
const ANONYMOUS = "-";

/** A registration that passed: the extension, the adapted declarations, and the fields it declares. */
interface AcceptedRegistration {
  extension: string;
  declarations: readonly InstrumentDeclaration[];
  fields: Readonly<Record<string, FieldType>>;
}

/** Whether a value is the plain object the contract gives `variables` and `fields`. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The registration a payload carries, or the one part that refuses it. The order is decision 15's:
 * the envelope, then each declaration in the order the registration lists them, then the fields, and
 * the first fault refuses the whole registration (design 6).
 */
function vetRegistration(
  payload: unknown,
  registry: Registry,
  faults: FaultLedger,
  fields: ProviderFields,
): AcceptedRegistration | { refusal: Fault } {
  if (!isPlainObject(payload)) {
    return { refusal: { scope: ANONYMOUS, kind: "registration-not-object", part: "a registration is not an object" } };
  }
  const extension = payload.extension;
  if (typeof extension !== "string") {
    return { refusal: { scope: ANONYMOUS, kind: "registration-no-extension", part: "a registration carries no extension name" } };
  }
  const claimed = JSON.stringify(extension);
  // Every name this registration composes starts with `<extension>.`, so it is Jefferson's exactly
  // when that prefix is: the extension `jefferson`, or one under `jefferson.` (owner-rulings.md,
  // 2026-11-16).
  if (!isProvidedName(`${extension}.`)) {
    return { refusal: {
      scope: extension, kind: "jefferson-claim",
      part: `a registration claims ${claimed}, which belongs to Jefferson`,
    } };
  }
  if (!Array.isArray(payload.instruments)) {
    return { refusal: { scope: extension, kind: "no-instruments", part: `registration from ${claimed} carries no instruments` } };
  }

  const declarations: InstrumentDeclaration[] = [];
  const named = new Set<string>();
  for (const raw of payload.instruments) {
    if (!isPlainObject(raw)) {
      return { refusal: {
        scope: extension, kind: "declaration-not-object",
        part: `registration from ${claimed} carries an instrument that is not a declaration`,
      } };
    }
    const part = raw.name;
    if (typeof part !== "string") {
      return { refusal: {
        scope: extension, kind: "declaration-no-name",
        part: `registration from ${claimed} carries a declaration with no name`,
      } };
    }
    // Jefferson composes the name, so a mismatch between an instrument's name and its claim cannot
    // be written (design 5).
    const name = `${extension}.${part}`;
    const full = JSON.stringify(name);
    if (registry.instrument(name) !== undefined) {
      return { refusal: {
        scope: name, kind: "name-taken",
        part: `${full} is already registered, so this registration is refused`,
      } };
    }
    if (named.has(name)) {
      return { refusal: {
        scope: extension, kind: "name-repeated",
        part: `registration from ${claimed} carries ${JSON.stringify(part)} twice`,
      } };
    }
    named.add(name);
    if (!isPlainObject(raw.variables)) {
      return { refusal: { scope: name, kind: "no-resolvers", part: `${full} carries no resolvers` } };
    }
    if (typeof raw.defaultFormat !== "string") {
      return { refusal: { scope: name, kind: "no-default-format", part: `${full} carries no default format` } };
    }
    const adapted = adaptProvidedDeclaration(
      name,
      raw as unknown as ProvidedDeclaration,
      () => fields.view(extension),
      fault => faults.record(fault),
    );
    if ("refused" in adapted) {
      switch (adapted.refused) {
        case "unparseable-default-format":
          return { refusal: {
            scope: name, kind: "unparseable-default-format",
            part: `${full} carries a default format Jefferson cannot parse`,
          } };
        case "label-not-string":
          return { refusal: {
            scope: name, kind: "label-not-string",
            part: `${full} carries a default label that is not a string`,
          } };
        case "resolver-not-function":
          return { refusal: {
            scope: name, kind: "resolver-not-function",
            part: `${full} carries a resolver ${JSON.stringify(adapted.variable)} that is not a function`,
          } };
      }
    }
    declarations.push(adapted);
  }

  const fault = fields.checkFields(extension, payload.fields);
  if (fault !== undefined) {
    return { refusal: fault.type === "outside"
      ? {
        scope: extension, kind: "field-type-outside",
        part: `registration from ${claimed} declares ${JSON.stringify(fault.field)} as ${JSON.stringify(fault.given)}, which is not string, number or boolean`,
      }
      : {
        scope: extension, kind: "field-type-conflict",
        part: `registration from ${claimed} declares ${JSON.stringify(fault.field)} as both ${fault.declared} and ${String(fault.given)}`,
      } };
  }
  return { extension, declarations, fields: (payload.fields ?? {}) as Readonly<Record<string, FieldType>> };
}

/** A report that passed: the extension, the field and the latest value. */
interface AcceptedReport {
  extension: string;
  field: string;
  value: FieldValue;
}

/**
 * The report a payload carries, or the one part that refuses it. A report is read as tolerantly as a
 * registration: a key this Jefferson does not know changes nothing (design 11). Which of decision
 * 15's two report rows a fault takes turns on one fact: whether the extension has an accepted,
 * uncleared registration this session (G11).
 */
function vetReport(payload: unknown, registry: Registry, fields: ProviderFields): AcceptedReport | { refusal: Fault } {
  if (!isPlainObject(payload)) {
    return { refusal: { scope: ANONYMOUS, kind: "report-not-object", part: "a report is not an object" } };
  }
  const { extension, field } = payload;
  if (typeof extension !== "string") {
    return { refusal: { scope: ANONYMOUS, kind: "report-no-extension", part: "a report carries no extension name" } };
  }
  if (typeof field !== "string") {
    return { refusal: { scope: extension, kind: "report-no-field", part: "a report carries no field name" } };
  }
  const quoted = JSON.stringify(field);
  if (!registry.hasRegistration(extension)) {
    return { refusal: {
      scope: extension, kind: "report-no-registration",
      part: `${extension} reports ${quoted} without a registration`,
    } };
  }
  const fault = fields.checkReport(extension, field, payload.value);
  if (fault === undefined) return { extension, field, value: payload.value as FieldValue };
  switch (fault.type) {
    case "undeclared":
      return { refusal: { scope: extension, kind: "report-undeclared", part: `${extension} reports ${quoted}, which it did not declare` } };
    case "wrong-type":
      return { refusal: {
        scope: extension, kind: "report-wrong-type",
        part: `${extension} reports ${quoted} as ${describeValue(fault.given)}, and it declared ${fault.declared}`,
      } };
    case "not-finite":
      return { refusal: {
        scope: extension, kind: "report-not-finite",
        part: `${extension} reports ${quoted} as a number that is not finite`,
      } };
  }
}

export function createRegistrationListener({ events, registry, faults, fields, repaint, own }: {
  events: EventBus;
  registry: Registry;
  faults: FaultLedger;
  fields: ProviderFields;
  repaint: () => void;
  own: OwnRegistration;
}): void {
  // The bus carries no sender and replays nothing, so the payload object's identity is what proves
  // a `jefferson` claim is Jefferson's own (design 6; M10).
  events.on(REGISTRATION, (payload: unknown) => {
    if (payload === own) {
      registry.accept(own.extension, own.instruments);
      repaint();
      return;
    }
    const accepted = vetRegistration(payload, registry, faults, fields);
    // A refusal changes nothing a row renders, and its one part is reported once per session.
    if ("refusal" in accepted) {
      faults.record(accepted.refusal);
      return;
    }
    registry.accept(accepted.extension, accepted.declarations);
    fields.declare(accepted.extension, accepted.fields);
    // One repaint, after the registry has run that registration's watches, so the entry a watch
    // filled is the one that render shows (design 9). A refused registration takes none.
    repaint();
  });
  events.on(UPDATE, (payload: unknown) => {
    const accepted = vetReport(payload, registry, fields);
    if ("refusal" in accepted) {
      faults.record(accepted.refusal);
      return;
    }
    fields.report(accepted.extension, accepted.field, accepted.value);
  });
  events.emit(REGISTRATION, own);
}
