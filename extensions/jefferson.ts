/**
 * pi-jefferson — a starship-style statusline for pi.
 *
 * `package.json` declares this file to pi:
 *   "pi": { "extensions": ["./extensions/jefferson.ts"] }
 * pi loads `jefferson.ts` — this file — as the extension. Every file in the
 * `extensions/jefferson/` directory beside it is the extension's working parts,
 * imported by relative path; the host never loads them.
 *
 * This file is the entry and the only source file that may contain a runtime import of a
 * host package (`@earendil-works/*`); source files under `extensions/jefferson/` import
 * each other by relative path and use `import type` for host types. Because the
 * working-parts directory shares its stem with this file, an import from here must
 * name a file inside it (`./jefferson/configuration.ts`), not the bare `./jefferson`.
 *
 * The entry registers the `/jefferson` version command and installs the statusline
 * footer: on every `session_start` in TUI mode it reads `pi-jefferson.json` (agent
 * directory, plus the trusted project copy), seeds the session data store from the
 * context, injects the host's width helpers and the footer's repaint request, and
 * replaces the built-in footer with one line per declared row. Reload clears the
 * custom footer, so the install re-runs on every `session_start`.
 */

import { join } from "node:path";

import {
  CONFIG_DIR_NAME,
  type ExtensionAPI,
  getAgentDir,
} from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import { readConfiguration } from "./jefferson/configuration.ts";
import { createFooter } from "./jefferson/row-renderer.ts";
import { createSessionDataStore } from "./jefferson/session-data-store.ts";

export const VERSION = "0.0.0-alpha";

export default function jefferson(pi: ExtensionAPI): void {
  // Retained across `session_start` calls: the previous install's release, so a store the
  // entry still holds is disposed — and its subscriptions dropped — before its replacement
  // exists (D5).
  let releasePrevious: (() => void) | undefined;

  pi.registerCommand("jefferson", {
    description: "Report the pi-jefferson version",
    handler: async (_args, ctx) => {
      ctx.ui.notify(`pi-jefferson ${VERSION} — the statusline is not built yet.`, "info");
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
      },
      requestRender: () => requestRepaint?.(),
    });

    // Both pushes are unwrapped here, so the store never names a host type (D5).
    const releaseModel = pi.on("model_select", (event) =>
      store.modelSelected(event.model.provider, event.model.id),
    );
    const releaseThinking = pi.on("thinking_level_select", (event) =>
      store.thinkingLevelSelected(event.level),
    );

    // The single teardown: both host subscriptions and the store, released together (D8). Two
    // callers reach it — the host's `dispose()` and the next session's `releasePrevious()`.
    let released = false;
    const release = (): void => {
      if (released) return;
      released = true;
      releaseModel();
      releaseThinking();
      store.dispose();
    };
    releasePrevious = release;

    const { rows, warning } = readConfiguration({
      agentPath: join(getAgentDir(), "pi-jefferson.json"),
      projectPath: join(ctx.cwd, CONFIG_DIR_NAME, "pi-jefferson.json"),
      projectTrusted: ctx.isProjectTrusted(),
    });
    if (warning !== undefined) ctx.ui.notify(warning, "warning");

    const footer = createFooter(rows, () => store.sample(), { truncateToWidth, visibleWidth });

    ctx.ui.setFooter((tui) => {
      requestRepaint = () => tui.requestRender();
      return {
        render: (width: number) => footer.render(width),
        invalidate: () => footer.invalidate(),
        dispose: release,
      };
    });
  });
}
