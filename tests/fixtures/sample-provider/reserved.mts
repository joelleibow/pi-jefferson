/**
 * The reserved name the packaging check's second compile expects to fail: the contract's types reject
 * a registration under `jefferson.` before the provider runs, with TS2344 and the constraint's words
 * (owner-rulings.md, 2026-11-16). A passing compile is a CI failure, not a green step.
 */
import type { Registration } from "pi-jefferson/instruments";

export const registration: Registration<"jefferson.custom"> = {
  extension: "jefferson.custom",
  instruments: [{ name: "mine", variables: { mine: () => "mine" }, defaultFormat: "$mine" }],
};
