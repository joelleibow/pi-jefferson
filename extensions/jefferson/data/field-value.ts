/**
 * The value a provider's field holds, the three types it takes, and the view a provided resolver
 * reads. Type declarations only, so the field holding reads them without importing the contract
 * and the published contract re-exports the two declarations from here (design 3, 8; G8).
 */

/** A field's value: text, a finite number, or a boolean. `undefined` is unknown, never a value. */
export type FieldValue = string | number | boolean;

/** The three types a field may take. Adding one here also widens a provider's `fields` map. */
export type FieldType = "string" | "number" | "boolean";

/** The readings a provided resolver receives: that provider's declared fields and nothing else. */
export type ReadingsView = Readonly<Record<string, FieldValue | undefined>>;
