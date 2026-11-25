/**
 * The bus boundary: subscribes the channels a provider posts on, emits Jefferson's own payload,
 * validates every registration, and hands what passes to the registry and the field holding. The
 * only file that calls `on` or `emit` on the bus, and the only one that writes the two channel
 * strings at runtime (design 6, 7; G3).
 */
import type { EventBus, Theme } from "@earendil-works/pi-coding-agent";

import { adaptProvidedDeclaration, describeValue } from "./components/instruments/instrument-binding.ts";
import { foregroundCheck, type ForegroundCheck } from "./format.ts";
import type { InstrumentDeclaration } from "./components/instruments/instrument.ts";
import type { FieldType, FieldValue } from "./data/field-value.ts";
import type { ProviderFields } from "./data/provider-fields.ts";
import type { Fault, FaultLedger } from "./faults.ts";
import type {
  ComposedFormat, ProvidedDeclaration, Registration, RegistrationChannel, Report, UpdateChannel,
} from "./instrument-contract.ts";
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

/** How one member of a message is copied when the message arrives. */
type MemberCopy = (value: unknown) => unknown;

/** A value kept as posted: a string, a function, anything the contract does not shape. */
const kept: MemberCopy = value => value;

/**
 * A map copied by defining its own enumerable entries. Never by assigning them: assignment sends an
 * own `__proto__` key to the prototype setter, which drops or reparents it, while the vet reads it
 * as an entry (`instrument-binding.ts:169`, `:221`; the design's "The copy, at arrival").
 */
const mapCopied: MemberCopy = value => isPlainObject(value) ? Object.fromEntries(Object.entries(value)) : value;

/** A map of maps, copied two levels by that same definition. */
const mapOfMapsCopied: MemberCopy = value => isPlainObject(value)
  ? Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, mapCopied(inner)]))
  : value;

/** A list copied by its elements. */
const listCopied = (element: MemberCopy): MemberCopy => value => Array.isArray(value) ? value.map(element) : value;

/** A member shaped as another contract shape, copied through that shape's table. */
const nestedCopied = (table: Readonly<Record<string, MemberCopy>>): MemberCopy =>
  value => isPlainObject(value) ? copyThrough(table, value) : value;

/**
 * One message copied through its table. Each member the table names is read exactly once, here at
 * arrival, whether or not the vet would reach it, and by property access as the vet reads it — own or
 * inherited alike, so a registration written as a class's getters and methods registers as it does
 * today. A member the contract does not name is not read, so a provider's own key changes nothing and
 * no function the payload carries is called. A member reading `undefined` is left out of the copy,
 * which the vet cannot tell from absent, so nothing it checks moves.
 */
function copyThrough(
  table: Readonly<Record<string, MemberCopy>>, message: Record<string, unknown>,
): Record<string, unknown> {
  const copy: Record<string, unknown> = {};
  for (const [member, copyMember] of Object.entries(table)) {
    const value = message[member];
    if (value !== undefined) copy[member] = copyMember(value);
  }
  return copy;
}

/**
 * The member tables, one per contract shape. Each is pinned to its shape's keys, so a member the
 * contract gains and a table lacks fails `pnpm typecheck` rather than going uncopied in silence.
 * `Registration<never>` satisfies the provider-extension constraint, and a registration's members do
 * not depend on the extension it names.
 */
const COMPOSED_COPY = {
  variable: kept,
  variables: mapCopied,
  select: kept,
  formats: mapCopied,
} as const satisfies Record<keyof ComposedFormat<unknown>, MemberCopy>;

const DECLARATION_COPY = {
  name: kept,
  variables: mapCopied,
  defaultFormat: kept,
  defaultLabel: kept,
  variableForms: mapOfMapsCopied,
  bar: kept,
  fills: kept,
  variableFg: mapCopied,
  composed: nestedCopied(COMPOSED_COPY),
  options: listCopied(kept),
} as const satisfies Record<keyof ProvidedDeclaration, MemberCopy>;

const REGISTRATION_COPY = {
  extension: kept,
  fields: mapCopied,
  instruments: listCopied(nestedCopied(DECLARATION_COPY)),
} as const satisfies Record<keyof Registration<never>, MemberCopy>;

const REPORT_COPY = {
  extension: kept,
  field: kept,
  value: kept,
} as const satisfies Record<keyof Report, MemberCopy>;

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
  check: ForegroundCheck,
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
      return { refusal: { scope: name, kind: "no-resolvers", part: `${full} carries no variables` } };
    }
    if (typeof raw.defaultFormat !== "string") {
      return { refusal: { scope: name, kind: "no-default-format", part: `${full} carries no default format` } };
    }
    const adapted = adaptProvidedDeclaration(
      name,
      raw as unknown as ProvidedDeclaration,
      () => fields.view(extension),
      fault => faults.record(fault),
      check,
    );
    if ("refused" in adapted) {
      switch (adapted.refused) {
        case "member-unusable":
          return { refusal: {
            scope: name, kind: "member-unusable",
            part: `${full} carries ${adapted.member} Jefferson cannot use`,
          } };
        case "option-unimplemented":
          return { refusal: {
            scope: name, kind: "option-unimplemented",
            part: `${full} declares the option ${JSON.stringify(adapted.option)}, which Jefferson does not implement`,
          } };
        case "formats-without-composed":
          return { refusal: {
            scope: name, kind: "formats-without-composed",
            part: `${full} declares "formats" without a composed format set`,
          } };
        case "unparseable-composed-format":
          return { refusal: {
            scope: name, kind: "unparseable-composed-format",
            part: `${full} carries a composed format ${JSON.stringify(adapted.kind)} Jefferson cannot parse`,
          } };
        case "unparseable-default-format":
          return { refusal: {
            scope: name, kind: "unparseable-default-format",
            part: `${full}'s default ${adapted.message}`,
          } };
        case "label-not-string":
          return { refusal: {
            scope: name, kind: "label-not-string",
            part: `${full} carries a default label that is not a string`,
          } };
        case "resolver-not-function":
          return { refusal: {
            scope: name, kind: "resolver-not-function",
            part: `${full} carries a variable ${JSON.stringify(adapted.variable)} that is not a function`,
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

/** The handle a session holds: how the one theme that can measure a colour reaches the listener. */
export interface RegistrationListener {
  /** Hand the listener the theme the host gave this session; the first call is what goes live. */
  receiveTheme(theme: Theme): void;
}

export function createRegistrationListener({ events, registry, faults, fields, repaint, own }: {
  events: EventBus;
  registry: Registry;
  faults: FaultLedger;
  fields: ProviderFields;
  repaint: () => void;
  own: OwnRegistration;
}): RegistrationListener {
  // A provider's message can arrive before any session exists, and a colour's name can only be
  // measured against a theme. So a message is copied at arrival and waits, in arrival order, until
  // the first `receiveTheme` hands over the one theme: the whole hold the spec promises, widened to
  // the colour check without a second vet (design, "A provider's registration waits for the first
  // theme and is vetted once, whole").
  const held: Array<{ channel: RegistrationChannel | UpdateChannel; run: (check: ForegroundCheck) => void }> = [];
  let check: ForegroundCheck | undefined;

  /** Vetted now when the listener is live, and queued otherwise, with the channel it came on. */
  const accept = (channel: RegistrationChannel | UpdateChannel, run: (check: ForegroundCheck) => void): void => {
    if (check === undefined) {
      held.push({ channel, run });
      return;
    }
    run(check);
  };

  const applyRegistration = (payload: unknown, check: ForegroundCheck): void => {
    const accepted = vetRegistration(payload, registry, faults, fields, check);
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
  };

  const applyReport = (payload: unknown): void => {
    const accepted = vetReport(payload, registry, fields);
    if ("refusal" in accepted) {
      faults.record(accepted.refusal);
      return;
    }
    fields.report(accepted.extension, accepted.field, accepted.value);
  };

  // The bus carries no sender and replays nothing, so the payload object's identity is what proves
  // a `jefferson` claim is Jefferson's own (design 6; M10). Its own payload is accepted by identity
  // and never held: the names a document may write must answer before the read.
  events.on(REGISTRATION, (payload: unknown) => {
    if (payload === own) {
      registry.accept(own.extension, own.instruments);
      repaint();
      return;
    }
    // Copied at arrival, so what the vet reads is what the provider posted, whatever it does to its
    // own object afterwards (the spec's "A held message is judged as it was posted"). The copy is
    // made before the message takes its place in the queue, so a message posted by a getter during
    // this copy is queued — or vetted — ahead of it, which is the order acceptance has always taken.
    const copy = isPlainObject(payload) ? copyThrough(REGISTRATION_COPY, payload) : payload;
    accept(REGISTRATION, checked => applyRegistration(copy, checked));
  });
  events.on(UPDATE, (payload: unknown) => {
    const copy = isPlainObject(payload) ? copyThrough(REPORT_COPY, payload) : payload;
    accept(UPDATE, () => applyReport(copy));
  });
  events.emit(REGISTRATION, own);

  return {
    receiveTheme(theme) {
      // The first call goes live and then drains what arrived while the listener was holding, in
      // arrival order, through the one vet-and-apply path. Going live first is what makes a message
      // posted during the drain — a `toJSON` that emits — vetted at once, as it is when it arrives.
      // A later call replaces the theme the check asks and drains nothing.
      const next = foregroundCheck(theme);
      const first = check === undefined;
      check = next;
      if (!first) return;
      for (const { channel, run } of held.splice(0)) {
        // Each drained message is contained on its own: a throw ends that message and is logged as
        // pi's bus logs a live one, nothing is accepted or warned for it, and the drain goes on. Left
        // uncontained, one provider's payload would take down this session's `session_start`.
        try {
          run(next);
        } catch (error) {
          console.error(`Event handler error (${channel}):`, error);
        }
      }
    },
  };
}
