/**
 * The threshold rules, in one pure source file: the written-order walk that judges every entry and
 * hands each one to the settings path's own per-value check, the drop above 100, the sort, the
 * four-item cap, the state a reading chooses, one threshold layered on the top level, the two
 * defaults, and the over-four sentence. It imports nothing of this package and reads no host data,
 * so both settings paths and the binding call it and none of them restates a rule (design DEC-1,
 * DEC-2, DEC-5, DEC-11; `design.md` `### Contracts`, "The reader's result").
 */

/** The most thresholds that may decide a state; the rest load with one warning (owner-rulings.md). */
const MAX_THRESHOLDS = 4;

/** The highest percentage a threshold may apply at: above it, the threshold applies nowhere. */
const MAX_ACTIVE_AT = 100;

/** One honoured threshold: the percentage it applies at, and the settings it wrote. */
export interface Threshold<S> {
  readonly activeAt: number;
  readonly settings: S;
}

/** What the reader refuses on its own: a value that is not a list, and one entry's two faults. */
export type ThresholdFault =
  | { readonly kind: "settings-thresholds" }
  | { readonly kind: "settings-threshold" | "settings-threshold-active-at"; readonly position: number }
  | { readonly kind: "settings-threshold-duplicate"; readonly position: number; readonly activeAt: number };

/**
 * The list in force when an instrument's settings carry none: a bar turns `warning` from 70 and
 * `error` from 90, each an ordinary threshold layered on the top-level fill (design DEC-2).
 */
export const DEFAULT_THRESHOLDS = Object.freeze([
  { activeAt: 70, settings: { fill: { fg: "warning" } } },
  { activeAt: 90, settings: { fill: { fg: "error" } } },
] as const);

/** One of the three things a written list can answer. */
export type ThresholdsRead<S, R> =
  | { readonly fault: ThresholdFault }
  | { readonly refused: R; readonly position: number }
  | { readonly honoured: readonly Threshold<S>[]; readonly overFour?: string };

/**
 * Read one `thresholds` value: every threshold written is judged, in the order it was written, and
 * the first fault met ends the read. A fault's position is its written position, whether or not an
 * ignored threshold stands before it (design DEC-14). The value is the document's, so it is read as
 * `unknown` and every shape is judged here.
 */
/** A record a layering merges key by key: what `style`, `fill` and `formats` are. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * One threshold's settings layered on the top level's: a record merges one level, and every other
 * value — a parsed format list, a label — replaces whole, so a threshold depends on the top level
 * and on no other threshold (owner-rulings.md, 2026-11-25, "replaces only the keys it names";
 * design DEC-5).
 */
export function layerThreshold<S extends object>(top: S, threshold: S): S {
  const layered: Record<string, unknown> = { ...(top as Record<string, unknown>) };
  for (const [key, value] of Object.entries(threshold)) {
    const before = layered[key];
    layered[key] = isRecord(before) && isRecord(value) ? { ...before, ...value } : value;
  }
  return layered as S;
}

/**
 * The state in force at one reading: the last of the ascending list whose `activeAt` is at or below
 * it, or `undefined` for the top level. A reading the host has not reported, or has no estimate
 * for, counts as 0 here and only here; a negative one sits below every threshold
 * (owner-rulings.md, 2026-11-25, "unknown is always 0").
 */
export function stateAt<E extends { readonly activeAt: number }>(
  honoured: readonly E[], reading: number | null | undefined,
): E | undefined {
  const value = reading ?? 0;
  let chosen: E | undefined;
  for (const threshold of honoured) if (threshold.activeAt <= value) chosen = threshold;
  return chosen;
}

export function readThresholds<S, R>(
  raw: unknown,
  subject: string,
  check: (
    settings: Readonly<Record<string, unknown>>,
    position: number,
  ) => { readonly settings: S } | { readonly refused: R },
): ThresholdsRead<S, R> {
  if (!Array.isArray(raw)) return { fault: { kind: "settings-thresholds" } };
  const honoured: Threshold<S>[] = [];
  for (const [index, entry] of raw.entries()) {
    const position = index + 1;
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return { fault: { kind: "settings-threshold", position } };
    }
    const { activeAt, ...settings } = entry as Record<string, unknown>;
    if (typeof activeAt !== "number" || !Number.isInteger(activeAt) || activeAt < 0) {
      return { fault: { kind: "settings-threshold-active-at", position } };
    }
    // `-0` and `0` are one number: JSON cannot tell them apart, so the list stores the 0 they both
    // are, and the threshold at 0 is the threshold `activeAt: -0` wrote (owner-rulings.md, 2026-11-25).
    const number = activeAt === 0 ? 0 : activeAt;
    const earlier = honoured.find(threshold => threshold.activeAt === number);
    if (earlier !== undefined) {
      return { fault: { kind: "settings-threshold-duplicate", position, activeAt: number } };
    }
    const checked = check(settings, position);
    if ("refused" in checked) return { refused: checked.refused, position };
    honoured.push({ activeAt: number, settings: checked.settings });
  }
  // Only now, with every threshold written checked: a threshold above 100 applies at no percentage,
  // so it drops; the rest sort and the four lowest decide the state (owner-rulings.md, 2026-11-25).
  const applied = honoured
    .filter(threshold => threshold.activeAt <= MAX_ACTIVE_AT)
    .sort((left, right) => left.activeAt - right.activeAt)
    .slice(0, MAX_THRESHOLDS);
  // The warning counts what was written, not what is honoured: five written warn once even when one
  // is above 100 and drops.
  return honoured.length > MAX_THRESHOLDS
    ? { honoured: applied, overFour: `${subject} defines ${honoured.length} thresholds, more than the maximum of ${MAX_THRESHOLDS}; those beyond the ${MAX_THRESHOLDS} lowest are ignored` }
    : { honoured: applied };
}
