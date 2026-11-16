/**
 * The faults this session has reported: deduped by scope and kind, queued until delivery opens,
 * then delivered once per microtask flush. It imports nothing, so the bus boundary holds it and
 * hands it the notify function the host's context carries (design 7, 19).
 */

export interface Fault {
  /**
   * Who the fault is about: the anonymous scope for a payload with no extension name, the
   * extension as the payload wrote it, or the full registered name of the instrument it concerns.
   */
  scope: string;
  /** One fixed string per row of decision 15's table, so a templated row dedupes as one kind. */
  kind: string;
  /** The part, exactly as the table words it. */
  part: string;
}

export interface FaultLedger {
  /** Note a fault: it joins the next delivery, and a second of its scope and kind adds nothing. */
  record(fault: Fault): void;
  /** Begin delivering: the queued faults go out as one notice, then one notice per flush. */
  open(notify: (message: string) => void): void;
  /** Forget what was told and what was queued, and stop delivering: the session is over. */
  close(): void;
}

/** A fault is not a fault in the user's document, so its parts join under their own wrapper. */
const WRAPPER = "pi-jefferson: ";

/** Every part pending at one delivery joins one notice, in arrival order. */
function noticeOf(faults: readonly Fault[]): string {
  return WRAPPER + faults.map(fault => fault.part).join("; ");
}

export function createFaultLedger(): FaultLedger {
  const told = new Set<string>();
  let pending: Fault[] = [];
  let notify: ((message: string) => void) | undefined;
  let scheduled = false;

  const flush = (): void => {
    scheduled = false;
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    notify?.(noticeOf(batch));
  };

  return {
    record(fault) {
      // The bound is what keeps a resolver that throws on every render — three widths a frame, sixty
      // frames a second — from flooding the transcript (design 7; M8).
      const key = `${fault.scope}\u0000${fault.kind}`;
      if (told.has(key)) return;
      told.add(key);
      pending.push(fault);
      // Never synchronously: a `notify` raised inside a render schedules another render.
      if (notify !== undefined && !scheduled) {
        scheduled = true;
        queueMicrotask(flush);
      }
    },
    open(deliver) {
      notify = deliver;
      if (pending.length === 0) return;
      const batch = pending;
      pending = [];
      deliver(noticeOf(batch));
    },
    close() {
      told.clear();
      pending = [];
      notify = undefined;
      scheduled = false;
    },
  };
}
