/**
 * The bus boundary: subscribes the channels a provider posts on, emits Jefferson's own payload,
 * validates every registration, and hands what passes to the registry and the field holding. The
 * only file that calls `on` or `emit` on the bus, and the only one that writes the two channel
 * strings at runtime (design 6, 7; G3).
 */
import type { EventBus } from "@earendil-works/pi-coding-agent";

import { adaptProvidedDeclaration } from "./components/instruments/instrument-binding.ts";
import type { InstrumentDeclaration } from "./components/instruments/instrument.ts";
import type { FieldType, FieldValue } from "./data/field-value.ts";
import type { ProviderFields } from "./data/provider-fields.ts";
import type { ProvidedDeclaration, RegistrationChannel, UpdateChannel } from "./instrument-contract.ts";
import { isNamePart, type Registry } from "./registration.ts";

// The contract is types-only, so the spelling lives here, against the contract's literal type:
// a misspelling fails `pnpm typecheck` (G3).
const REGISTRATION = "jefferson:registration" satisfies RegistrationChannel;
const UPDATE = "jefferson:update" satisfies UpdateChannel;

/** Jefferson's own payload: the one registration the identity check accepts for `jefferson`. */
type OwnRegistration = { extension: "jefferson"; instruments: readonly InstrumentDeclaration[] };

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
  fields: ProviderFields,
): AcceptedRegistration | { refusal: string } {
  if (!isPlainObject(payload)) return { refusal: "a registration is not an object" };
  const extension = payload.extension;
  if (typeof extension !== "string") return { refusal: "a registration carries no extension name" };
  const claimed = JSON.stringify(extension);
  if (!isNamePart(extension)) return { refusal: `a registration names the extension ${claimed}, which is not a lowercase name` };
  if (extension === "jefferson") return { refusal: 'a registration claims "jefferson", which belongs to Jefferson' };
  if (!Array.isArray(payload.instruments)) return { refusal: `registration from ${claimed} carries no instruments` };

  const declarations: InstrumentDeclaration[] = [];
  const named = new Set<string>();
  for (const raw of payload.instruments) {
    if (!isPlainObject(raw)) return { refusal: `registration from ${claimed} carries an instrument that is not a declaration` };
    const part = raw.name;
    if (typeof part !== "string") return { refusal: `registration from ${claimed} carries a declaration with no name` };
    if (!isNamePart(part)) {
      return { refusal: `registration from ${claimed} carries ${JSON.stringify(part)}, which is not a single lowercase name` };
    }
    // Jefferson composes the name, so a mismatch between an instrument's name and its claim cannot
    // be written (design 5).
    const name = `${extension}.${part}`;
    const full = JSON.stringify(name);
    if (registry.instrument(name) !== undefined) return { refusal: `${full} is already registered, so this registration is refused` };
    if (named.has(name)) return { refusal: `registration from ${claimed} carries ${JSON.stringify(part)} twice` };
    named.add(name);
    if (!isPlainObject(raw.variables)) return { refusal: `${full} carries no resolvers` };
    if (typeof raw.defaultFormat !== "string") return { refusal: `${full} carries no default format` };
    const adapted = adaptProvidedDeclaration(name, raw as unknown as ProvidedDeclaration, () => fields.view(extension));
    if ("refused" in adapted) {
      switch (adapted.refused) {
        case "unparseable-default-format":
          return { refusal: `${full} carries a default format Jefferson cannot parse` };
        case "label-not-string":
          return { refusal: `${full} carries a default label that is not a string` };
        case "resolver-not-function":
          return { refusal: `${full} carries a resolver ${JSON.stringify(adapted.variable)} that is not a function` };
      }
    }
    declarations.push(adapted);
  }

  const fault = fields.checkFields(extension, payload.fields);
  if (fault !== undefined) {
    return {
      refusal: fault.type === "outside"
        ? `registration from ${claimed} declares ${JSON.stringify(fault.field)} as ${JSON.stringify(fault.given)}, which is not string, number or boolean`
        : `registration from ${claimed} declares ${JSON.stringify(fault.field)} as both ${fault.declared} and ${String(fault.given)}`,
    };
  }
  return { extension, declarations, fields: (payload.fields ?? {}) as Readonly<Record<string, FieldType>> };
}

export function createRegistrationListener({ events, registry, fields, own }: {
  events: EventBus;
  registry: Registry;
  fields: ProviderFields;
  own: OwnRegistration;
}): void {
  // The bus carries no sender and replays nothing, so the payload object's identity is what proves
  // a `jefferson` claim is Jefferson's own (design 6; M10).
  events.on(REGISTRATION, (payload: unknown) => {
    if (payload === own) {
      registry.accept(own.extension, own.instruments);
      return;
    }
    const accepted = vetRegistration(payload, registry, fields);
    // A refusal changes nothing a row renders.
    if ("refusal" in accepted) return;
    registry.accept(accepted.extension, accepted.declarations);
    fields.declare(accepted.extension, accepted.fields);
  });
  events.on(UPDATE, (payload: unknown) => {
    // A report is read tolerantly, like a registration: a key this Jefferson does not know changes
    // nothing, and a report it cannot read changes nothing a row renders (design 11).
    if (!isPlainObject(payload)) return;
    const { extension, field } = payload;
    if (typeof extension !== "string") return;
    if (typeof field !== "string") return;
    // Which of decision 15's two report rows a fault takes turns on one fact: whether the extension
    // has an accepted, uncleared registration this session (G11).
    if (!registry.hasRegistration(extension)) return;
    if (fields.checkReport(extension, field, payload.value) !== undefined) return;
    fields.report(extension, field, payload.value as FieldValue);
  });
  events.emit(REGISTRATION, own);
}
