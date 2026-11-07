/**
 * pi-jefferson — a starship-style statusline for pi.
 *
 * `package.json` declares this file to pi:
 *   "pi": { "extensions": ["./extensions/jefferson.ts"] }
 * pi loads `jefferson.ts` — this file — as the extension. Every file in the
 * `extensions/jefferson/` directory beside it is the extension's working parts,
 * imported by relative path; the host never loads them.
 *
 * This file is the entry; any shipped file may import a host package (`@earendil-works/*`).
 * Imports run one way only — from the entry to the working parts, never back, and no cycles.
 * Because the working-parts directory shares its stem with this file, an import from here
 * must name a file inside it (`./jefferson/configuration.ts`), not the bare `./jefferson`.
 *
 * The entry registers the `/jefferson` version command and installs the statusline
 * footer: on every `session_start` in TUI mode it reads `pi-jefferson.json` (agent
 * directory, plus the trusted project copy), seeds the session data store from the
 * context, captures the footer's repaint request, and
 * replaces the built-in footer with one line per declared row. Reload clears the
 * custom footer, so the install re-runs on every `session_start`.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { configurationPaths, readConfiguration } from "./jefferson/configuration.ts";
import { createFooter } from "./jefferson/visuals/row-renderer.ts";
import { createSessionDataStore } from "./jefferson/data/session-data-store.ts";

export const VERSION = "0.0.0-alpha";

export default function jefferson(pi: ExtensionAPI): void {
  // Retained across `session_start` calls: the previous install's release, so a store the
  // entry still holds is disposed — and its subscriptions dropped — before its replacement
  // exists (D5).
  let releasePrevious: (() => void) | undefined;

  // Retained for the same reason: how many rows the footer this session installed renders, so
  // `/jefferson` describes the installed footer rather than claiming there is none.
  let footerRows: number | undefined;

  pi.registerCommand("jefferson", {
    description: "Report the installed statusline footer",
    handler: async (_args, ctx) => {
      // `VERSION` is deliberately not printed: it is `0.0.0-alpha` while `package.json` says
      // `0.1.1`, so it would report a wrong version (see `tasks.md`'s deferred debt).
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

    // The repaint request reaches the host's `tui` only when the host invokes the factory, which
    // it does synchronously inside `setFooter`, before any push can arrive (D5).
    let requestRepaint: (() => void) | undefined;

    // Seeded from the context because the host reports no selection when it restores a session.
    const store = createSessionDataStore({
      seed: {
        provider: ctx.model?.provider,
        model: ctx.model?.id,
        thinkingLevel: ctx.thinkingLevel,
        cwd: ctx.cwd,
      },
      requestRender: () => requestRepaint?.(),
      readUsage: () => ({
        contextUsage: ctx.getContextUsage(),
        sessionId: ctx.sessionManager.getSessionId(),
        leafId: ctx.sessionManager.getLeafId(),
      }),
      readEntries: () => ctx.sessionManager.getEntries(),
    });

    // Pushes are unwrapped here, so the store names no host event.
    const releaseModel = pi.on("model_select", (event) =>
      store.modelSelected(event.model.provider, event.model.id),
    );
    const releaseThinking = pi.on("thinking_level_select", (event) =>
      store.thinkingLevelSelected(event.level),
    );
    const releaseTurn = pi.on("turn_end", () => store.turnEnded());

    // The single teardown: all three subscriptions and the store, released together. Two
    // callers reach it — the host's `dispose()` and the next session's `releasePrevious()`.
    let released = false;
    const release = (): void => {
      if (released) return;
      released = true;
      releaseModel();
      releaseThinking();
      releaseTurn();
      store.dispose();
    };
    releasePrevious = release;

    const { rows, warning } = readConfiguration({
      ...configurationPaths(ctx.cwd),
      projectTrusted: ctx.isProjectTrusted(),
      theme: ctx.ui.theme,
    });
    if (warning !== undefined) ctx.ui.notify(warning, "warning");

    footerRows = rows.length;
    ctx.ui.setFooter((tui, theme) => {
      const footer = createFooter(rows, () => store.sample(), theme);
      requestRepaint = () => tui.requestRender();
      return {
        render: (width: number) => footer.render(width),
        invalidate: () => footer.invalidate(),
        dispose: release,
      };
    });
  });
}
