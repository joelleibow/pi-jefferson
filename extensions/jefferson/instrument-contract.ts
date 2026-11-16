/**
 * The published contract at `pi-jefferson/instruments`: the two messages a provider posts on pi's
 * bus, the declaration each of its instruments carries, and the channels' names as string
 * literals.
 *
 * Type declarations only, and it imports only `data/field-value.ts`, which is types only (design
 * 1, 3; Joel's types-only ruling). A runtime statement here would force every provider to carry
 * this package as a full dependency, because pi does not install the peer dependencies of the
 * packages it manages and plain Node refuses to strip types under `node_modules`. A provider
 * imports it with `import type` and writes the short handshake itself.
 */
import type { FieldType, FieldValue, ReadingsView } from "./data/field-value.ts";

export type { FieldType, FieldValue, ReadingsView };

/** The channel a provider posts its registration on. */
export type RegistrationChannel = "jefferson:registration";

/** The channel a provider posts one field's new value on. */
export type UpdateChannel = "jefferson:update";

/** The declaration a provider writes, over the readings its resolvers receive. */
export type ContractDeclaration<R> = {
  name: string;
  variables: Readonly<Record<string, (readings: R) => string | undefined>>;
  defaultFormat: string;
  defaultLabel?: string;
};

/** A provided instrument's declaration: the contract's declaration over the provider's view. */
export type ProvidedDeclaration = ContractDeclaration<ReadingsView>;

/** The registration a provider posts on `jefferson:registration`. */
export type Registration = {
  /** The providing extension's own name, which prefixes every name it registers. */
  extension: string;
  fields?: Readonly<Record<string, FieldType>>;
  instruments: readonly ProvidedDeclaration[];
};

/** The update a provider posts on `jefferson:update`: one field's latest value. */
export type Report = {
  extension: string;
  field: string;
  value: FieldValue;
};
