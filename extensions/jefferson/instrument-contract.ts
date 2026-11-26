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

/**
 * A format set a reading chooses: the variable the chosen text fills, the values its texts may name,
 * the reading that picks a text by its key, and one default text per key.
 */
export type ComposedFormat<R> = {
  variable: string;
  variables: Readonly<Record<string, (readings: R) => string | undefined>>;
  select: (readings: R) => string | undefined;
  formats: Readonly<Record<string, string>>;
};

/** The declaration a provider writes, over the readings its functions receive. */
export type ContractDeclaration<R> = {
  name: string;
  variables: Readonly<Record<string, (readings: R) => string | undefined>>;
  defaultFormat: string;
  defaultLabel?: string;
  /** Named forms of a variable: `$saved|short` renders `variableForms.saved.short`. */
  variableForms?: Readonly<Record<string, Readonly<Record<string, (readings: R) => string | undefined>>>>;
  /** `$bar`'s fill as a percentage: `null` draws the track unfilled, `undefined` is unknown. */
  bar?: (readings: R) => number | null | undefined;
  /** Whether the instrument takes the columns its row leaves. */
  fills?: boolean;
  /** A foreground theme token for a variable, chosen from the text the variable arrived as. */
  variableFg?: Readonly<Record<string, (value: string) => string | undefined>>;
  composed?: ComposedFormat<R>;
  /** The options a user may configure beyond format, style and label. */
  options?: readonly ("formats" | "thresholds" | "fill")[];
};

/** A provided instrument's declaration: the contract's declaration over the provider's view. */
export type ProvidedDeclaration = ContractDeclaration<ReadingsView>;

/** The names that belong to Jefferson: `jefferson` itself, and every name under `jefferson.`. */
type ReservedExtension = "jefferson" | `jefferson.${string}`;

/**
 * What an extension name a provider writes must be: any string that is not Jefferson's. Every
 * instrument name a registration composes starts with `<extension>.`, so it falls under `jefferson.`
 * exactly when the extension is `jefferson` or starts with `jefferson.` (owner-rulings.md, 2026-11-16).
 */
type ProviderExtension<Extension> = [Extract<Extension, ReservedExtension>] extends [never]
  ? string
  : "a name under jefferson. belongs to Jefferson";

/**
 * The registration a provider posts on `jefferson:registration`, typed with the extension name it
 * writes: `Registration<"taiknr">`. A name under `jefferson.` fails the provider's type check.
 */
export type Registration<Extension extends ProviderExtension<Extension>> = {
  /** The providing extension's own name, which prefixes every name it registers. */
  extension: Extension;
  fields?: Readonly<Record<string, FieldType>>;
  instruments: readonly ProvidedDeclaration[];
};

/** The update a provider posts on `jefferson:update`: one field's latest value. */
export type Report = {
  extension: string;
  field: string;
  value: FieldValue;
};
