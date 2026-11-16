/**
 * What a name means, and what has registered: the grammar, the reserved namespace, the full-name
 * rule, and the registry that holds registrations, answers a lookup, and keeps the watch table.
 * Pure — no bus, no pi (design 6, 8; G9).
 */
import type { InstrumentDeclaration } from "./components/instruments/instrument.ts";

/** The one name part grammar: lowercase, non-empty, and no dot. */
const NAME_PART = /^[a-z][a-z0-9-]*$/;

/** The first part of every name Jefferson's own instruments carry. */
const OWN_NAMESPACE = "jefferson";

/** A written name as the registered name it means: a bare name is the `jefferson.default.*` one. */
export function normalizeName(written: string): string {
  return written.includes(".") ? written : `${OWN_NAMESPACE}.default.${written}`;
}

/** Whether a full name belongs to a provider: its first part is not exactly `jefferson`. */
export function isProvidedName(name: string): boolean {
  return name.split(".")[0] !== OWN_NAMESPACE;
}

/** Whether a text is one name part: the extension's, or an instrument's. */
export function isNamePart(text: string): boolean {
  return NAME_PART.test(text);
}

export interface Registry {
  /** The declaration registered under a full name, or `undefined`. Own keys only. */
  instrument(name: string): InstrumentDeclaration | undefined;
  /**
   * Commit a registration the listener validated: each declaration under its full name, the
   * extension marked as registered, and each accepted name's watches run once and dropped. It never
   * refuses — the listener decides — so a duplicate name replaces nothing the listener let through.
   */
  accept(extension: string, declarations: readonly InstrumentDeclaration[]): void;
  /** Whether this session has an accepted, uncleared registration from the extension. */
  hasRegistration(extension: string): boolean;
  /** Hold `apply` until the name registers, or until the install that asked is released. */
  watch(name: string, apply: (declaration: InstrumentDeclaration) => void): void;
  /** Drop every watch: the install whose read made them is gone. */
  releaseWatches(): void;
  /** Drop every provider's registration and mark, and never a watch (design 19 item 1). */
  clearProvided(): void;
}

export function createRegistry(): Registry {
  const declarations = new Map<string, InstrumentDeclaration>();
  const registered = new Set<string>();
  const watches = new Map<string, Array<(declaration: InstrumentDeclaration) => void>>();
  return {
    instrument(name) {
      return declarations.get(name);
    },
    accept(extension, accepted) {
      registered.add(extension);
      for (const declaration of accepted) {
        declarations.set(declaration.name, declaration);
        const applying = watches.get(declaration.name);
        if (applying === undefined) continue;
        watches.delete(declaration.name);
        for (const apply of applying) apply(declaration);
      }
    },
    hasRegistration(extension) {
      return registered.has(extension);
    },
    watch(name, apply) {
      const held = watches.get(name);
      if (held === undefined) watches.set(name, [apply]);
      else held.push(apply);
    },
    releaseWatches() {
      watches.clear();
    },
    clearProvided() {
      for (const name of [...declarations.keys()]) {
        if (isProvidedName(name)) declarations.delete(name);
      }
      for (const extension of [...registered]) {
        if (extension !== OWN_NAMESPACE) registered.delete(extension);
      }
    },
  };
}
