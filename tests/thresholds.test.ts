/**
 * The threshold reader's own rules, exercised directly: the written-order walk with its check seam,
 * the drop above 100, the sort, the four-item cap, the state a reading chooses, layering one
 * threshold on the top level, and the two defaults.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_THRESHOLDS, layerThreshold, readThresholds, stateAt, type Threshold, type ThresholdsRead,
} from "../extensions/jefferson/thresholds.ts";

/** The settings a threshold carries here: whatever the document wrote, handed back as it came. */
type Settings = Readonly<Record<string, unknown>>;

/** The own path's subject, as `configuration.ts` prints it. */
const SUBJECT = 'instrument "context"';

/** The own path's per-value check, accepting every key it is handed. */
function accept(settings: Settings): { settings: Settings } {
  return { settings };
}

/** Read a list as Jefferson's own path reads it. */
function read(raw: unknown): ThresholdsRead<Settings, "refused"> {
  return readThresholds<Settings, "refused">(raw, SUBJECT, settings => accept(settings));
}

/** The honoured branch of an answer, which is the one every case below expects. */
function honoured(answer: ThresholdsRead<Settings, "refused">): {
  readonly honoured: readonly Threshold<Settings>[];
  readonly overFour?: string;
} {
  assert.ok("honoured" in answer, `an honoured list, not ${JSON.stringify(answer)}`);
  return answer;
}

/** The honoured list's active numbers, in the order the reader answered them. */
function numbers(answer: ThresholdsRead<Settings, "refused">): number[] {
  return honoured(answer).honoured.map(threshold => threshold.activeAt);
}

test("A2 a thresholds value that is not a list is a fault of its own", () => {
  for (const raw of [{}, null, 70, "70"]) {
    assert.deepEqual(read(raw), { fault: { kind: "settings-thresholds" } }, JSON.stringify(raw));
  }
});

test("A3 an entry that is not an object answers a fault at its written position", () => {
  for (const raw of [[70], [[{ activeAt: 70 }, null]], [[[]]], [{ activeAt: 70 }, "70"]]) {
    const position = (raw as unknown[]).findIndex(entry => typeof entry !== "object" || entry === null || Array.isArray(entry)) + 1;
    assert.deepEqual(read(raw), { fault: { kind: "settings-threshold", position } }, JSON.stringify(raw));
  }
});

test("A4 an activeAt that is no whole number at or above 0 is a fault at the entry's position", () => {
  for (const activeAt of [undefined, "70", 70.5, -5, 1e400, null]) {
    assert.deepEqual(read([{ activeAt }]), { fault: { kind: "settings-threshold-active-at", position: 1 } }, String(activeAt));
  }
  assert.deepEqual(read([{ label: "hot" }]), { fault: { kind: "settings-threshold-active-at", position: 1 } },
    "a missing activeAt is the same fault");
});

test("A4 a malformed fifth threshold is still checked, and its fault names position five", () => {
  const wellFormed = [10, 20, 30, 40].map(activeAt => ({ activeAt }));
  for (const activeAt of ["70", 70.5]) {
    assert.deepEqual(read([...wellFormed, { activeAt }]),
      { fault: { kind: "settings-threshold-active-at", position: 5 } }, String(activeAt));
  }
});

test("A5 a number JSON writes another way is that number", () => {
  for (const activeAt of [70.0, 7e1]) {
    const answer = read([{ activeAt }]);
    assert.deepEqual(numbers(answer), [70], String(activeAt));
  }
  assert.deepEqual(read([{ activeAt: 70 }, { activeAt: 70.0 }]),
    { fault: { kind: "settings-threshold-duplicate", position: 2, activeAt: 70 } });
});

test("A6 -0 and 0 in one list repeat the threshold at 0", () => {
  const answer = read([{ activeAt: 0 }, { activeAt: -0 }]);
  assert.ok("fault" in answer, "a duplicate, not an honoured list");
  assert.equal(answer.fault.kind, "settings-threshold-duplicate");
  assert.equal((answer.fault as { position: number }).position, 2);
});

test("A7 two thresholds at one number above 100 are a duplicate", () => {
  assert.deepEqual(read([{ activeAt: 110 }, { activeAt: 110 }]),
    { fault: { kind: "settings-threshold-duplicate", position: 2, activeAt: 110 } });
});

test("A1 a list reads as honoured states, ascending", () => {
  assert.deepEqual(numbers(read([{ activeAt: 70 }, { activeAt: 30 }])), [30, 70]);
  const one = honoured(read([{ activeAt: 70, label: "hot" }]));
  assert.deepEqual(one.honoured, [{ activeAt: 70, settings: { label: "hot" } }],
    "the reader judges activeAt itself and hands check the rest");
  assert.equal(one.overFour, undefined, "one threshold is no over-four warning");
});

test("A8 a fifth threshold is still checked, and its refusal answers at position five", () => {
  const written = [10, 20, 30, 40, 101].map(activeAt => ({ activeAt }));
  const answer = readThresholds<Settings, "refused">(written, SUBJECT, (settings, position) =>
    position === 5 ? { refused: "refused" } : { settings });
  assert.deepEqual(answer, { refused: "refused", position: 5 });
});

test("A9 every threshold is checked in written order, so the first refusal met ends the read", () => {
  // Both are refused, so the answer names whichever the walk reached first: sorting first would
  // answer `cold`, and the reading's position would name it.
  const written = [{ activeAt: 90, label: "hot" }, { activeAt: 10, label: "cold" }];
  const answer = readThresholds<Settings, string>(written, SUBJECT, settings => ({ refused: String(settings.label) }));
  assert.deepEqual(answer, { refused: "hot", position: 1 }, "the first written, though the other sorts first");
});

test("A10 a duplicate written before a refused threshold is the fault answered", () => {
  const written = [{ activeAt: 70 }, { activeAt: 70 }, { activeAt: 80, label: "late" }];
  const answer = readThresholds<Settings, "late">(written, SUBJECT, settings =>
    settings.label === "late" ? { refused: "late" } : { settings });
  assert.deepEqual(answer, { fault: { kind: "settings-threshold-duplicate", position: 2, activeAt: 70 } });
});

test("A11 a threshold that sorts first keeps its written position", () => {
  const sortedFirst = readThresholds<Settings, "refused">([{ activeAt: 90 }, { activeAt: 10 }], SUBJECT,
    (settings, position) => position === 2 ? { refused: "refused" } : { settings });
  assert.deepEqual(sortedFirst, { refused: "refused", position: 2 });
  const third = readThresholds<Settings, "refused">([{ activeAt: 101 }, { activeAt: 10 }, { activeAt: 20 }], SUBJECT,
    (settings, position) => position === 3 ? { refused: "refused" } : { settings });
  assert.deepEqual(third, { refused: "refused", position: 3 }, "a fault in the third entry names 3");
});

test("A12 five written warn once, name the instrument and honour the four lowest", () => {
  const answer = read([10, 20, 30, 40, 50].map(activeAt => ({ activeAt })));
  assert.deepEqual(numbers(answer), [10, 20, 30, 40], "the fifth never applies");
  assert.equal(honoured(answer).overFour,
    'instrument "context" defines 5 thresholds, more than the maximum of 4; those beyond the 4 lowest are ignored');
});

test("A12 five with one above 100 warn once and honour the four below it", () => {
  const answer = read([10, 20, 30, 40, 101].map(activeAt => ({ activeAt })));
  assert.deepEqual(numbers(answer), [10, 20, 30, 40]);
  assert.equal(honoured(answer).overFour,
    'instrument "context" defines 5 thresholds, more than the maximum of 4; those beyond the 4 lowest are ignored');
});

test("A13 four written warn nothing, and one above 100 drops silently", () => {
  const four = read([10, 20, 30, 40].map(activeAt => ({ activeAt })));
  assert.deepEqual(numbers(four), [10, 20, 30, 40]);
  assert.equal(honoured(four).overFour, undefined);
  const dropped = read([{ activeAt: 50 }, { activeAt: 101 }]);
  assert.deepEqual(numbers(dropped), [50], "a threshold above 100 applies at no percentage");
  assert.equal(honoured(dropped).overFour, undefined, "and it is no warning");
});

test("A13 the boundaries at 0 and 100 apply and warn nothing", () => {
  const answer = read([{ activeAt: 0 }, { activeAt: 50 }, { activeAt: 100 }]);
  assert.deepEqual(numbers(answer), [0, 50, 100]);
  assert.equal(honoured(answer).overFour, undefined);
});

test("A14 three below 100 decide where two above it drop", () => {
  const answer = read([10, 20, 30, 101, 102].map(activeAt => ({ activeAt })));
  assert.deepEqual(numbers(answer), [10, 20, 30]);
  assert.equal(honoured(answer).overFour,
    'instrument "context" defines 5 thresholds, more than the maximum of 4; those beyond the 4 lowest are ignored');
});

test("A15 the state is the highest activeAt at or below the reading, its own number included", () => {
  const thresholds = [{ activeAt: 30 }, { activeAt: 60 }];
  assert.equal(stateAt(thresholds, 80), thresholds[1]);
  assert.equal(stateAt(thresholds, 60), thresholds[1], "a threshold applies at its own percentage");
  assert.equal(stateAt(thresholds, 59.9), thresholds[0]);
  assert.equal(stateAt(thresholds, 29.9), undefined, "below every threshold the top level stands");
});

test("A16 0 and 100 apply at their own numbers", () => {
  const thresholds = [{ activeAt: 0 }, { activeAt: 100 }];
  assert.equal(stateAt(thresholds, 0), thresholds[0]);
  assert.equal(stateAt(thresholds, 100), thresholds[1]);
  assert.equal(stateAt(thresholds, -0.1), undefined, "a negative reading is below every threshold");
});

test("A17 an unknown reading counts as 0, and the top level stays in force otherwise", () => {
  for (const reading of [undefined, null]) {
    assert.equal(stateAt([{ activeAt: 0 }], reading)?.activeAt, 0, String(reading));
    assert.equal(stateAt([{ activeAt: 70 }], reading), undefined, String(reading));
  }
});

test("A18 a negative reading sits below every threshold", () => {
  assert.equal(stateAt([{ activeAt: 0 }, { activeAt: 50 }], -1), undefined);
});

test("A5 a stored -0 is chosen at a reading of 0 and not at -1", () => {
  const { honoured: list } = honoured(read([{ activeAt: -0 }]));
  const only = list[0]!;
  assert.equal(stateAt(list, 0), only, "the threshold at -0 applies at 0");
  assert.equal(stateAt(list, -1), undefined);
});

test("A20 the defaults are 70 warning and 90 error", () => {
  assert.deepEqual(DEFAULT_THRESHOLDS, [
    { activeAt: 70, settings: { fill: { fg: "warning" } } },
    { activeAt: 90, settings: { fill: { fg: "error" } } },
  ]);
  assert.equal(Object.isFrozen(DEFAULT_THRESHOLDS), true, "no caller can edit the defaults");
});

/** The settings a layering case uses: one record, one list, one kind map and one label. */
interface Layered {
  readonly style?: { readonly fg?: string; readonly bold?: boolean };
  readonly formats?: Readonly<Record<string, readonly string[]>>;
  readonly segments?: readonly string[];
  readonly label?: string;
}

test("A19 a record merges one level, a list and a label replace whole, and a kind left out stays", () => {
  const top: Layered = {
    style: { fg: "accent", bold: true },
    formats: { busy: ["A"], idle: ["B"] },
    segments: ["top"],
    label: "Context:",
  };
  const threshold: Layered = {
    style: { fg: "warning" },
    formats: { busy: ["C"] },
    segments: ["threshold"],
    label: "",
  };
  assert.deepEqual(layerThreshold(top, threshold), {
    style: { fg: "warning", bold: true },
    formats: { busy: ["C"], idle: ["B"] },
    segments: ["threshold"],
    label: "",
  });
});

test("A19 a threshold that names no key answers the top level unchanged", () => {
  const top: Layered = { style: { bold: true }, label: "Context:", segments: ["top"] };
  assert.deepEqual(layerThreshold(top, {}), top);
  assert.deepEqual(layerThreshold({}, { label: "hot" }), { label: "hot" }, "the top level may be empty");
  assert.equal(Object.isFrozen(layerThreshold(top, {})), false, "the layered object is the caller's own");
});
