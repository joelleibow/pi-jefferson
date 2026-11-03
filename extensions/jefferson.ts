/**
 * pi-jefferson — a starship-style statusline for pi.
 *
 * `package.json` declares this file to pi:
 *   "pi": { "extensions": ["./extensions/jefferson.ts"] }
 * pi loads `jefferson.ts` — this file — as the extension. Every file in the
 * `extensions/jefferson/` directory beside it is the extension's working parts,
 * imported by relative path; the host never loads them.
 *
 * This file is the entry and the only module that may contain a runtime import of a
 * host package (`@earendil-works/*`); modules under `extensions/jefferson/` import
 * each other by relative path and use `import type` for host types. Because the
 * working-parts directory shares its stem with this file, an import from here must
 * name a file inside it (`./jefferson/configuration.ts`), not the bare `./jefferson`.
 *
 * The entry registers the `/jefferson` version command and installs the statusline
 * footer: on every `session_start` in TUI mode it reads `pi-jefferson.json` (agent
 * directory, plus the trusted project copy), injects the host's width helpers into
 * the renderer, and replaces the built-in footer with one line per declared row.
 * Reload clears the custom footer, so the install re-runs on every `session_start`.
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

export const VERSION = "0.0.0-alpha";

export default function jefferson(pi: ExtensionAPI): void {
  pi.registerCommand("jefferson", {
    description: "Report the pi-jefferson version",
    handler: async (_args, ctx) => {
      ctx.ui.notify(`pi-jefferson ${VERSION} — the statusline is not built yet.`, "info");
    },
  });

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    const { rows, warning } = readConfiguration({
      agentPath: join(getAgentDir(), "pi-jefferson.json"),
      projectPath: join(ctx.cwd, CONFIG_DIR_NAME, "pi-jefferson.json"),
      projectTrusted: ctx.isProjectTrusted(),
    });
    if (warning !== undefined) ctx.ui.notify(warning, "warning");

    ctx.ui.setFooter(() => createFooter(rows, { truncateToWidth, visibleWidth }));
  });
}
