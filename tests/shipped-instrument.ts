/** A shipped declaration by the bare name a document writes, for tests (M27). */
import type { InstrumentDeclaration } from "../extensions/jefferson/components/instruments/instrument.ts";
import { SHIPPED } from "../extensions/jefferson/shipped.ts";

export function shippedInstrument(bare: string): InstrumentDeclaration | undefined {
  return SHIPPED.find(declaration => declaration.name === `jefferson.default.${bare}`);
}
