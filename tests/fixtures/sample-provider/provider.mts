/**
 * The sample provider the packaging check compiles: a consumer of the published contract under
 * flags this repository does not use. It writes both channel literals as a provider does, declares
 * a boolean and a number field, registers one instrument with one resolver and no default label, and
 * a second that uses every other member the contract offers, and reports `false`.
 */
import type {
  FieldType,
  Registration,
  RegistrationChannel,
  UpdateChannel,
  Report,
} from "pi-jefferson/instruments";

const REGISTRATION_CHANNEL: RegistrationChannel = "jefferson:registration";
const UPDATE_CHANNEL: UpdateChannel = "jefferson:update";

export const channels: Readonly<Record<string, string>> = {
  registration: REGISTRATION_CHANNEL,
  update: UPDATE_CHANNEL,
};

const fields: Readonly<Record<string, FieldType>> = { saved: "number", working: "boolean" };

export const registration: Registration<"sample-provider"> = {
  extension: "sample-provider",
  fields,
  instruments: [
    {
      name: "savings",
      variables: {
        saved: (readings) => {
          // Bracket access, so the sample compiles under `noPropertyAccessFromIndexSignature` too:
          // a readings view is an index signature, and authors copy this file.
          const value = readings["saved"];
          return typeof value === "number" ? `$${value.toFixed(2)}` : undefined;
        },
      },
      defaultFormat: "Savings: $saved",
    },
    {
      name: "progress",
      variables: {
        state: (readings) => {
          const working = readings["working"];
          return working === true ? "busy" : working === false ? "idle" : undefined;
        },
        saved: (readings) => {
          const value = readings["saved"];
          return typeof value === "number" ? `$${value.toFixed(2)}` : undefined;
        },
      },
      variableForms: {
        saved: {
          cents: (readings) => {
            const value = readings["saved"];
            return typeof value === "number" ? `${Math.round(value * 100)}¢` : undefined;
          },
        },
      },
      variableFg: { state: (value) => value === "busy" ? "accent" : undefined },
      bar: (readings) => {
        const value = readings["saved"];
        return typeof value === "number" ? value : null;
      },
      fills: true,
      composed: {
        variable: "state",
        variables: {
          saved: (readings) => {
            const value = readings["saved"];
            return typeof value === "number" ? `$${value.toFixed(2)}` : undefined;
          },
        },
        select: (readings) => {
          const working = readings["working"];
          return working === true ? "busy" : working === false ? "idle" : undefined;
        },
        formats: { busy: "Saving $saved", idle: "Idle" },
      },
      options: ["formats"],
      defaultFormat: "$state $bar",
    },
  ],
};

export const report: Report = { extension: "sample-provider", field: "working", value: false };
