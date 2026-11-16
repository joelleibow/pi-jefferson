/**
 * The install lifecycle: the `/jefferson` command, and what a session start installs in what order.
 * The data comes from `data/`, the document from `configuration.ts`, the footer from `footer-setup.ts`.
 */
import { homedir } from "node:os";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { configurationPaths, readConfiguration } from "./configuration.ts";
import { createProviderFields } from "./data/provider-fields.ts";
import { feedSessionData } from "./data/session-data-feed.ts";
import { createFaultLedger } from "./faults.ts";
import { installFooter } from "./footer-setup.ts";
import { createRegistry } from "./registration.ts";
import { createRegistrationListener } from "./registration-listener.ts";
import { FALLBACK, NOTICE_GATE, SHIPPED } from "./shipped.ts";

/** One timer, and the cancel that clears it: the scheduler the composition root supplies. */
function schedule(callback: () => void, delayMs: number): () => void {
  const handle = setTimeout(callback, delayMs);
  return () => clearTimeout(handle);
}

export function startUp(pi: ExtensionAPI): void {
  // Registrations outlive a session: the registry is built here, and Jefferson registers its own
  // instruments by the same message a provider posts, before any `session_start` runs (design 6).
  const registry = createRegistry();
  // Created here, not in `session_start`: a report that arrives before Jefferson's own handler
  // must still be held (design 11; T2).
  const fields = createProviderFields();
  const faults = createFaultLedger();
  createRegistrationListener({
    events: pi.events,
    registry,
    faults,
    fields,
    own: { extension: "jefferson", instruments: SHIPPED },
  });

  // The pin: pi's `bindExtensions` emits `resources_discover` after every extension's `session_start`
  // handler, on every path that starts a session, and only when someone handles it, so handling it
  // is what makes it fire. No pi document promises that order (research-chidi.md §1; T4, corrected by
  // M20), and it is the only marker startup has completed (design 12). Re-check it on every pi bump.
  pi.on("resources_discover", (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    // Delivery opens here, and only here: a fault found at any earlier moment waits for this, so a
    // provider that registers from its own `session_start` handler is not warned about first.
    faults.open(message => ctx.ui.notify(message, "warning"));
  });

  // Retained across `session_start` calls: the previous install's release, so a store this
  // install still holds is disposed — and its subscriptions dropped — before its replacement
  // exists.
  let releasePrevious: (() => void) | undefined;

  // Retained for the same reason: how many rows the footer this session installed renders, so
  // `/jefferson` describes the installed footer rather than claiming there is none.
  let footerRows: number | undefined;

  // The host does not dispose the footer on every reload, so the release runs on shutdown too:
  // a pending expiry must not repaint a context the host has invalidated.
  pi.on("session_shutdown", () => {
    releasePrevious?.();
    // Provider state belongs to the session that accepted it; Jefferson's own keeps for the
    // factory's life. This runs after the release and never inside it, so a report that arrived
    // before the next `session_start` survives it (design 19 item 1; M22).
    registry.clearProvided();
    fields.clear();
    // Third, and never inside the release closure: a fault that arrived before the next
    // `session_start` must queue rather than be dropped with the session before it.
    faults.close();
  });

  pi.registerCommand("jefferson", {
    description: "Report the installed statusline footer",
    handler: async (_args, ctx) => {
      // `VERSION` is deliberately not printed: it is `0.0.0-alpha` while `package.json` says
      // `0.1.1`, so it would report a wrong version.
      ctx.ui.notify(
        footerRows === undefined
          ? "pi-jefferson — no statusline footer is installed."
          : `pi-jefferson — the statusline footer is installed, ${footerRows} ${
              footerRows === 1 ? "row" : "rows"
            }.`,
        "info",
      );
    },
  });

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    releasePrevious?.();

    // Read first: the store is built with the visible time the document's notice declaration
    // names, so configuration cannot wait until after the feed exists.
    const { rows, rowGap, warning, noticeSeconds } = readConfiguration({
      ...configurationPaths(ctx.cwd),
      projectTrusted: ctx.isProjectTrusted(),
      theme: ctx.ui.theme,
      resolve: name => registry.instrument(name),
      fallback: FALLBACK,
      noticeGate: NOTICE_GATE,
    });

    // The repaint request reaches the host's `tui` only when the host invokes the factory. The
    // factory's call sets it, so every push after the install reaches the host.
    let requestRepaint: (() => void) | undefined;

    const { store, release, attachFooterData } = feedSessionData(
      pi, ctx, () => requestRepaint?.(), homedir, () => performance.now(), schedule, noticeSeconds,
    );
    releasePrevious = release;

    if (warning !== undefined) ctx.ui.notify(warning, "warning");

    footerRows = rows.length;
    installFooter(ctx.ui, {
      rows,
      rowGap,
      sample: () => store.sample(),
      dispose: release,
      receiveRepaint: (repaint) => {
        requestRepaint = repaint;
      },
      attachFooterData,
    });
  });
}
