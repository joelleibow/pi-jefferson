/** The notice instrument: pi's notice in the footer, its kind's text composed into `$notice`. */
import type { NoticeKind } from "../../data/notice.ts";
import { FOUNDATIONAL_OPTIONS, type InstrumentDeclaration } from "./instrument.ts";

/** The visible time a notice takes when the document declares none. */
export const NOTICE_SECONDS = 10;

/** pi's text for each kind, the values named where pi writes them. */
const FORMATS: Readonly<Record<NoticeKind, string>> = {
  miss: "Cache miss: $tokens tokens re-billed$cost",
  missModelSwitch: "Cache miss after model switch: $tokens tokens re-billed$cost",
  missIdle: "Cache miss after $idle idle: $tokens tokens re-billed$cost",
  compaction: "Compaction: $tokens tokens billed$cost",
  branchSummary: "Branch summary: $tokens tokens billed$cost",
  thinking: "Anthropic dropped $blocks (details in session)",
};

export const notice: InstrumentDeclaration = {
  name: "notice",
  // The cell's format names the composed text, whose absence blanks the cell and its label.
  variables: { notice: () => undefined },
  composed: {
    variable: "notice",
    variables: {
      tokens: readings => readings.notice?.values.tokens,
      cost: readings => readings.notice?.values.cost,
      idle: readings => readings.notice?.values.idle,
      blocks: readings => readings.notice?.values.blocks,
    },
    select: readings => readings.notice?.kind,
    formats: FORMATS,
  },
  // pi colours every kind this change ships `warning`, and styling stays at the cell.
  variableFg: { notice: () => "warning" },
  defaultFormat: "$notice",
  defaultLabel: "Notice:",
  options: Object.freeze([...FOUNDATIONAL_OPTIONS, "seconds", "formats"]),
};
