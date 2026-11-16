/**
 * The bus boundary: subscribes the channels a provider posts on, emits Jefferson's own payload, and
 * refuses what it cannot read. The only file that calls `on` or `emit` on the bus, and the only one
 * that writes the two channel strings at runtime (design 6, 7; G3).
 */
import type { EventBus } from "@earendil-works/pi-coding-agent";

import type { InstrumentDeclaration } from "./components/instruments/instrument.ts";
import type { RegistrationChannel } from "./instrument-contract.ts";
import type { Registry } from "./registration.ts";

// The contract is types-only, so the spelling lives here, against the contract's literal type:
// a misspelling fails `pnpm typecheck` (G3).
const REGISTRATION = "jefferson:registration" satisfies RegistrationChannel;

/** Jefferson's own payload: the one registration the identity check accepts for `jefferson`. */
type OwnRegistration = { extension: "jefferson"; instruments: readonly InstrumentDeclaration[] };

export function createRegistrationListener({ events, registry, own }: {
  events: EventBus;
  registry: Registry;
  own: OwnRegistration;
}): void {
  // The bus carries no sender and replays nothing, so the payload object's identity is what proves
  // a `jefferson` claim is Jefferson's own (design 6; M10).
  events.on(REGISTRATION, (payload: unknown) => {
    if (payload === own) registry.accept(own.extension, own.instruments);
  });
  events.emit(REGISTRATION, own);
}
