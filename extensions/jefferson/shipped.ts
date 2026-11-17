/**
 * The shipped instruments, and the two roles the reader needs from them: adding an instrument adds
 * its file and its entry in `SHIPPED`, so no static lookup sits beside the registry (design 14; T13).
 */
import { blank } from "./components/instruments/blank.ts";
import { branch } from "./components/instruments/branch.ts";
import { context } from "./components/instruments/context.ts";
import { cost } from "./components/instruments/cost.ts";
import type { InstrumentDeclaration } from "./components/instruments/instrument.ts";
import { model } from "./components/instruments/model.ts";
import { NOTICE_SECONDS, notice } from "./components/instruments/notice.ts";
import { path } from "./components/instruments/path.ts";
import { session } from "./components/instruments/session.ts";
import { status } from "./components/instruments/status.ts";
import { thinking } from "./components/instruments/thinking.ts";
import { tokens } from "./components/instruments/tokens.ts";

/** Every instrument Jefferson registers as its own, in the order its payload carries them. */
export const SHIPPED: readonly InstrumentDeclaration[] =
  [blank, model, thinking, path, context, tokens, cost, branch, session, status, notice];

/** The declaration an entry renders when no registered name answers it. */
export const FALLBACK: InstrumentDeclaration = blank;

/** The notice declaration's registered name, and the visible time it takes when unconfigured. */
export const NOTICE_GATE: { name: string; seconds: number } = { name: notice.name, seconds: NOTICE_SECONDS };
