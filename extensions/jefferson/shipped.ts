/** The shipped instruments, and lookup by name: adding an instrument adds its file and its entry here. */
import { blank } from "./components/instruments/blank.ts";
import { branch } from "./components/instruments/branch.ts";
import { context } from "./components/instruments/context.ts";
import { cost } from "./components/instruments/cost.ts";
import type { InstrumentDeclaration } from "./components/instruments/instrument.ts";
import { model } from "./components/instruments/model.ts";
import { notice } from "./components/instruments/notice.ts";
import { path } from "./components/instruments/path.ts";
import { session } from "./components/instruments/session.ts";
import { status } from "./components/instruments/status.ts";
import { thinking } from "./components/instruments/thinking.ts";
import { tokens } from "./components/instruments/tokens.ts";

const SHIPPED: Readonly<Record<string, InstrumentDeclaration>> = Object.fromEntries(
  [blank, model, thinking, path, context, tokens, cost, branch, session, status, notice].map(declaration => [declaration.name, declaration]),
);

export function instrumentNamed(name: string): InstrumentDeclaration | undefined {
  return Object.hasOwn(SHIPPED, name) ? SHIPPED[name] : undefined;
}
