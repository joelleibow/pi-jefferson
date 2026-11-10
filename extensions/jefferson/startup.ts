/**
 * The install lifecycle: the `/jefferson` command, and what a session start installs in what order.
 * The data comes from `data/`, the document from `configuration.ts`, the footer from `footer-setup.ts`.
 */
import { homedir } from "node:os";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { configurationPaths, readConfiguration } from "./configuration.ts";
import { feedSessionData } from "./data/session-data-feed.ts";
import { installFooter } from "./footer-setup.ts";

export function startUp(pi: ExtensionAPI): void {
  // Retained across `session_start` calls: the previous install's release, so a store this
  // install still holds is disposed — and its subscriptions dropped — before its replacement
  // exists.
  let releasePrevious: (() => void) | undefined;

  // Retained for the same reason: how many rows the footer this session installed renders, so
  // `/jefferson` describes the installed footer rather than claiming there is none.
  let footerRows: number | undefined;

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

    // The repaint request reaches the host's `tui` only when the host invokes the factory. The
    // factory's call sets it, so every push after the install reaches the host.
    let requestRepaint: (() => void) | undefined;

    const { store, release, attachFooterData } = feedSessionData(pi, ctx, () => requestRepaint?.(), homedir);
    releasePrevious = release;

    const { rows, rowGap, warning } = readConfiguration({
      ...configurationPaths(ctx.cwd),
      projectTrusted: ctx.isProjectTrusted(),
      theme: ctx.ui.theme,
    });
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
